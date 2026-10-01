/* PixieCraft — HUD, hotbar, bars, toasts, inventory / crafting / creative palette screens */
(function () {
  'use strict';
  const MV = window.MV;
  const $ = id => document.getElementById(id);

  class UI {
    constructor(game) {
      this.g = game;
      this.held = null;
      this.fps = 60;
      this.lastName = null; this.nameT = 0;
      this.hotbar = $('hotbar');
      this.slotEls = [];
      for (let i = 0; i < 9; i++) {
        const el = document.createElement('div');
        el.className = 'slot';
        el.innerHTML = `<img alt=""><span class="count"></span><span class="key">${i + 1}</span>`;
        this.hotbar.appendChild(el);
        this.slotEls.push(el);
      }
      document.addEventListener('mousemove', e => {
        const h = $('heldItem');
        h.style.left = e.clientX + 'px'; h.style.top = e.clientY + 'px';
      });
    }

    show(id, on) { $(id).classList.toggle('hidden', !on); }

    setLoading(p, text) {
      $('loadFill').style.width = Math.round(p * 100) + '%';
      if (text) $('loadText').textContent = text;
    }

    refreshHotbar() {
      const inv = this.g.inv, creative = this.g.mode === 'creative';
      this.slotEls.forEach((el, i) => {
        const s = inv.slots[i];
        const img = el.querySelector('img');
        if (s) { img.src = MV.iconURL(s.id); img.style.visibility = 'visible'; } else img.style.visibility = 'hidden';
        el.querySelector('.count').textContent = s && !creative && s.count > 1 ? s.count : '';
        el.classList.toggle('selected', i === inv.selected);
      });
      const cur = inv.current, name = cur ? MV.itemName(cur.id) : '';
      if (name !== this.lastName) {
        this.lastName = name;
        const el = $('itemName');
        el.textContent = name;
        el.classList.remove('fade'); void el.offsetWidth; el.classList.add('fade');
      }
    }

    update(dt) {
      const g = this.g, p = g.player;
      this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05;
      $('healthFill').style.width = (p.health / p.maxHealth) * 100 + '%';
      $('magicFill').style.width = (p.magic / p.maxMagic) * 100 + '%';
      const creative = g.mode === 'creative';
      $('healthText').textContent = creative ? '∞' : Math.ceil(p.health) + '/' + p.maxHealth;
      $('magicText').textContent = creative ? '∞' : Math.floor(p.magic);
      $('clock').textContent = g.sky.clockString();
      if (!this.biomeT || (this.biomeT -= dt) <= 0) { this.biomeT = 0.5; $('biome').textContent = g.world.biomeName(p.pos.x, p.pos.z); $('castleHint').textContent = MV.castleHint(g.world, p.pos); }
      $('modeTag').textContent = creative ? '🏰 CREATIVE' : '⚔ SURVIVAL';
      $('modeTag').className = creative ? 'creative' : 'survival';
      const st = [];
      if (p.flying) st.push('<span>🕊 Flying</span>');
      if (p.glideMode) st.push(`<span class="${p.gliding ? 'on' : ''}">✦ Pixie Glide</span>`);
      if (g.safeZone) st.push('<span class="safe">⛲ Wishing Well sanctuary</span>');
      if (p.air < p.maxAir) st.push(`<span class="${p.air < 4 ? 'night' : 'on'}">🫧 Air ${'●'.repeat(Math.ceil(p.air / 2))}${'○'.repeat(Math.floor((p.maxAir - p.air) / 2))}</span>`);
      if (p.slowT > 0) st.push('<span class="night">🐌 Slowed</span>');
      if (g.sky.isNight) st.push('<span class="night">☾ Shadows roam</span>');
      const foes = g.mobs.hostileCount();
      if (foes) st.push(`<span class="night">⚔ ${foes} foe${foes > 1 ? 's' : ''} nearby</span>`);
      $('statusIcons').innerHTML = st.join('');
      $('vignette').className = p.blindT > 0 ? 'ink' : p.headInWater ? 'water' : '';
      if (g.debug) {
        $('debug').textContent = `${this.fps.toFixed(0)} fps · xyz ${p.pos.x.toFixed(1)} ${p.pos.y.toFixed(1)} ${p.pos.z.toFixed(1)} · chunks ${g.world.chunkCount} · mobs ${g.mobs.list.length}`;
      } else $('debug').textContent = '';
    }

    toast(msg, cls) {
      const el = document.createElement('div');
      el.className = 'toast ' + (cls || '');
      el.textContent = msg;
      $('toasts').appendChild(el);
      setTimeout(() => el.classList.add('out'), 2200);
      setTimeout(() => el.remove(), 2800);
      while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    }

    hurtFlash() {
      const el = $('hurt');
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    }

    setBreak(p) {
      const r = $('breakRing');
      r.style.opacity = p > 0 ? 1 : 0;
      r.style.background = `conic-gradient(#ffe27a ${p * 360}deg, rgba(255,255,255,0.15) 0deg)`;
    }

    // ------------------------------------------------------------ inventory screen
    slotEl(s, onClick, selected) {
      const el = document.createElement('div');
      el.className = 'slot' + (selected ? ' selected' : '');
      if (s) {
        el.innerHTML = `<img src="${MV.iconURL(s.id)}" alt=""><span class="count">${this.g.mode === 'survival' && s.count > 1 ? s.count : ''}</span>`;
        el.title = MV.itemName(s.id) + (s.id >= 100 ? ' — ' + MV.ITEMS[s.id].desc : '');
      }
      el.addEventListener('mousedown', e => { e.preventDefault(); onClick(); this.g.sfx.click(); });
      return el;
    }

    openInventory() { this.renderInventory(); this.show('inventory', true); }

    closeInventory() {
      if (this.held) { this.g.inv.add(this.held.id, this.held.count); this.held = null; this.renderHeld(); }
      this.show('inventory', false);
      this.refreshHotbar();
    }

    renderHeld() {
      const h = $('heldItem');
      h.innerHTML = this.held ? `<img src="${MV.iconURL(this.held.id)}"><span>${this.held.count > 1 ? this.held.count : ''}</span>` : '';
    }

    swapSlot(i) {
      const inv = this.g.inv, s = inv.slots[i], h = this.held;
      if (h && s && h.id === s.id) { const k = Math.min(64 - s.count, h.count); s.count += k; h.count -= k; if (!h.count) this.held = null; }
      else { inv.slots[i] = h; this.held = s; }
      this.renderHeld(); this.renderInventory();
    }

    renderInventory() {
      const g = this.g, inv = g.inv, creative = g.mode === 'creative';
      const grid = $('invGrid'), hot = $('invHotbar'), rec = $('recipes');
      grid.innerHTML = ''; hot.innerHTML = ''; rec.innerHTML = '';
      $('invTitle').textContent = creative ? '✨ Royal Treasury (click to put in hotbar)' : '🎒 Satchel';
      if (creative) {
        for (const id of MV.PALETTE) grid.appendChild(this.slotEl({ id, count: 1 }, () => { inv.slots[inv.selected] = { id, count: 1 }; this.renderInventory(); }));
      } else {
        for (let i = 9; i < 27; i++) grid.appendChild(this.slotEl(inv.slots[i], () => this.swapSlot(i)));
      }
      for (let i = 0; i < 9; i++) {
        hot.appendChild(this.slotEl(inv.slots[i], () => {
          if (creative) { inv.selected = i; this.renderInventory(); } else this.swapSlot(i);
        }, creative && i === inv.selected));
      }
      for (const r of MV.RECIPES) {
        const ok = creative || inv.canCraft(r);
        const row = document.createElement('div');
        row.className = 'recipe' + (ok ? '' : ' locked');
        const needs = r.need.map(([id, n]) => {
          const have = inv.count(id);
          return `<span class="need ${creative || have >= n ? '' : 'missing'}" title="${MV.itemName(id)}"><img src="${MV.iconURL(id)}">×${n}</span>`;
        }).join('');
        row.innerHTML = `<img class="out" src="${MV.iconURL(r.out)}"><div class="rtext"><b>${MV.itemName(r.out)} ×${r.n}</b><div class="needs">${needs}</div></div><button ${ok ? '' : 'disabled'}>Craft</button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (!creative && !inv.canCraft(r)) return;
          if (!creative) r.need.forEach(([id, n]) => inv.remove(id, n));
          if (creative) inv.slots[inv.selected] = { id: r.out, count: 1 };
          else { const left = inv.add(r.out, r.n); if (left) this.toast('Satchel full!', 'warn'); }
          g.sfx.chime();
          this.toast(`✨ Crafted ${MV.itemName(r.out)}`);
          this.renderInventory();
        });
        rec.appendChild(row);
      }
      this.refreshHotbar();
    }
  }

  MV.UI = UI;
})();
