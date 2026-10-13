/* PixieCraft — the Pixie Village.
   Every world has one small fairy village near spawn: mushroom-cap cottages around a fountain
   plaza, lantern-lit paths and three market stalls. Fairies live there. Three of them keep shops
   (right-click / 🧱 on a shopkeeper) selling potions, charms and building supplies for the gold
   ore, crystals and materials you gather. The village is a sanctuary: no monsters come near. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, I = MV.ITEM, World = MV.World;
  const box = (...a) => MV.mobBox(...a), pivot = (...a) => MV.mobPivot(...a);
  const $ = id => document.getElementById(id);
  const R = 21;   // half-width of the levelled village green

  // ---------------------------------------------------------------- the shops
  const SHOPS = [
    { name: 'Rosalind', title: 'Potion Parlour', color: 0xff7ad9, canopy: B.BLOSSOM,
      greet: 'Feeling poorly, dear? A sip of fairy tonic fixes nearly everything.',
      offers: [
        [I.POTION_HEAL, 1, [[B.GOLD_ORE, 2]]], [I.POTION_MAGIC, 1, [[B.GOLD_ORE, 2]]],
        [I.ELIXIR_SPEED, 1, [[B.GOLD_ORE, 3]]], [I.BUBBLE, 1, [[B.GOLD_ORE, 3]]],
        [I.POTION_HEAL, 3, [[B.CRYSTAL, 1]]],
      ] },
    { name: 'Thistle', title: 'Charms & Trinkets', color: 0x9b6bff, canopy: B.ROOF,
      greet: 'Charms for brave adventurers, and for the not-so-brave too.',
      offers: [
        [I.WARD, 1, [[B.CRYSTAL, 2]]], [I.DUST, 3, [[B.GOLD_ORE, 2]]], [I.WAND, 1, [[B.GOLD_ORE, 3]]],
        [I.WELL, 1, [[B.GOLD, 1], [B.CRYSTAL, 1]]], [B.LANTERN, 4, [[B.GOLD_ORE, 1]]], [B.CRYSTAL, 1, [[B.GOLD_ORE, 4]]],
      ] },
    { name: 'Bramble', title: "Builder's Barrow", color: 0x2e9d4a, canopy: B.CONE_BLOCK,
      greet: "Planning a castle? I've bricks by the bushel. I'll take your spare logs and stone too.",
      offers: [
        [B.BRICK, 16, [[B.GOLD_ORE, 1]]], [B.GLASS, 16, [[B.GOLD_ORE, 1]]], [B.ROOF, 16, [[B.GOLD_ORE, 1]]],
        [B.PIXIE_CAP, 8, [[B.GOLD_ORE, 1]]], [B.GOLD_ORE, 1, [[B.LOG, 8]]], [B.GOLD_ORE, 1, [[B.STONE, 24]]],
      ] },
  ];
  MV.SHOPS = SHOPS;

  // ---------------------------------------------------------------- layout
  let PLAN = null;
  function buildPlan() {
    const m = new Map(), stations = [];
    const put = (x, y, z, id) => m.set(x + ',' + y + ',' + z, [x, y, z, id]);
    const disc = (cx, cz, r, fn) => {
      const k = Math.ceil(r);
      for (let dx = -k; dx <= k; dx++) for (let dz = -k; dz <= k; dz++) { const d = Math.hypot(dx, dz); if (d <= r + 0.3) fn(cx + dx, cz + dz, d); }
    };
    const P = B.WELLSTONE;
    // Plaza and the north-south lane
    disc(0, 0, 6, (x, z) => put(x, 0, z, P));
    for (let z = -18; z <= 18; z++) for (let x = -1; x <= 1; x++) if (Math.abs(z) > 5) put(x, 0, z, P);
    // Fountain with a glowing crystal spire
    disc(0, 0, 2.6, (x, z, d) => { put(x, 1, z, d > 1.6 ? P : B.WATER); });
    put(0, 1, 0, P); put(0, 2, 0, P); put(0, 3, 0, B.CRYSTAL);

    // Mushroom cottages, doors facing the plaza
    const cottage = (cx, cz, capId) => {
      for (let y = 1; y <= 4; y++) disc(cx, cz, 2.3, (x, z, d) => put(x, y, z, d > 1.3 ? B.PIXIE_STEM : B.AIR));
      disc(cx, cz, 1.3, (x, z) => put(x, 0, z, B.PLANKS));
      const sx = Math.sign(-cx), sz = Math.sign(-cz), horiz = Math.abs(cx) > Math.abs(cz);
      const dx = horiz ? sx * 2 : 0, dz = horiz ? 0 : sz * 2;
      put(cx + dx, 1, cz + dz, B.AIR); put(cx + dx, 2, cz + dz, B.AIR);                                   // doorway
      put(cx - dx, 3, cz - dz, B.GLASS); put(cx + (horiz ? 0 : 2), 3, cz + (horiz ? 2 : 0), B.GLASS);     // round windows
      put(cx, 3, cz, B.LANTERN);
      [[5, 4.4], [6, 3.8], [7, 2.8], [8, 1.5]].forEach(([y, r]) => disc(cx, cz, r, (x, z) => put(x, y, z, capId)));
      put(cx + Math.round(dx * 1.5), 1, cz + Math.round(dz * 1.5), B.AIR);
    };
    cottage(11, -11, B.PIXIE_CAP); cottage(-11, -11, B.PIXIE_CAP_TEAL);
    cottage(-11, 11, B.PIXIE_CAP); cottage(11, 11, B.PIXIE_CAP_TEAL);
    cottage(0, -15, B.PIXIE_CAP);

    // Market stalls facing the plaza; a shopkeeper hovers behind each counter
    const stall = (cx, cz, fx, fz, shop) => {
      const sx = -fz, sz = fx;   // sideways
      for (const a of [-1, 0, 1]) {
        put(cx + fx + sx * a, 1, cz + fz + sz * a, B.PLANKS);                                    // counter
        for (const b of [-1, 0, 1, 2]) put(cx + fx * b + sx * a, 4, cz + fz * b + sz * a, SHOPS[shop].canopy);   // awning
      }
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (let y = 1; y <= 3; y++) put(cx + fx * b + sx * a, y, cz + fz * b + sz * a, B.LOG);
      put(cx - fx + sx, 3, cz - fz + sz, B.LANTERN);
      stations.push({ x: cx, z: cz, face: Math.atan2(fx, fz), shop });
    };
    stall(8, 0, -1, 0, 0);
    stall(-8, 0, 1, 0, 1);
    stall(6, 8, -1, 0, 2);

    // Lantern posts along the lane and flower beds on the green
    for (const z of [-11, 10, 16]) for (const x of [-2, 2]) { put(x, 1, z, B.LOG); put(x, 2, z, B.LANTERN); }
    for (let x = -R + 3; x <= R - 3; x++) for (let z = -R + 3; z <= R - 3; z++) {
      if (m.has(x + ',0,' + z) || m.has(x + ',1,' + z) || Math.hypot(x, z) < 7) continue;
      const h = MV.hash2(x, z, 4242);
      if (h < 0.06) put(x, 1, z, h < 0.025 ? B.ROSE : h < 0.045 ? B.BLUEBELL : B.GLOWCAP);
    }
    return { blocks: [...m.values()], stations };
  }
  const plan = () => PLAN || (PLAN = buildPlan());

  World.prototype.findVillage = function () {
    const s = this.spawn, SEA = MV.SEA, C = this.castle;
    for (let r = 50; r <= 220; r += 10) for (let i = 0; i < 24; i++) {
      const a = Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 12);   // prefer south (the castle prefers north)
      const x = Math.round(s.x + Math.cos(a) * r), z = Math.round(s.z + Math.sin(a) * r);
      if (C && Math.hypot(x - C.x, z - C.z) < 60) continue;
      const t = this.terrain(x, z);
      if (t.forest < 0.85 || t.ocean > 0.05 || t.canyon > 0.05 || t.h < SEA + 4) continue;
      let ok = true;
      for (let k = 0; k < 8 && ok; k++) {
        const b = (k / 8) * Math.PI * 2, t2 = this.terrain(Math.round(x + Math.cos(b) * 17), Math.round(z + Math.sin(b) * 17));
        if (Math.abs(t2.h - t.h) > 4 || t2.h <= SEA || t2.forest < 0.6) ok = false;
      }
      if (ok) return { x, z, y: t.h };
    }
    return null;
  };

  World.prototype.buildVillage = function (set, c) {
    const V = this.village, CS = MV.CS, ox = c.cx * CS, oz = c.cz * CS;
    if (!V || ox > V.x + R || ox + CS < V.x - R || oz > V.z + R || oz + CS < V.z - R) return;
    for (let x = Math.max(ox, V.x - R); x <= Math.min(ox + CS - 1, V.x + R); x++)
      for (let z = Math.max(oz, V.z - R); z <= Math.min(oz + CS - 1, V.z + R); z++) {
        const th = this.terrain(x, z).h;
        for (let y = th + 1; y < V.y; y++) set(x, y, z, B.DIRT, true);
        set(x, V.y, z, B.GRASS, true);
        for (let y = V.y + 1; y < Math.min(MV.CH, V.y + 14); y++) set(x, y, z, B.AIR, true);
      }
    for (const [dx, dy, dz, id] of plan().blocks) set(V.x + dx, V.y + dy, V.z + dz, id, true);
  };

  MV.villageHint = function (world, pos) {
    const V = world.village;
    if (!V) return '';
    const dx = V.x - pos.x, dz = V.z - pos.z, d = Math.hypot(dx, dz);
    if (d < 22) return '🧚 Pixie Village';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return `🧚 Village: ${Math.round(d)} blocks ${dirs[Math.round(Math.atan2(dx, -dz) / (Math.PI / 4) + 8) % 8]}`;
  };

  // ---------------------------------------------------------------- fairy folk
  // variant 0-2 = shopkeepers (SHOPS index), 3+ = villagers who flit about the plaza
  const VILLAGER_COLORS = [0xffc93c, 0x20c0c0, 0xff8c28, 0x8fe7ff];
  function buildFairy(m) {
    const v = (m && m.variant) || 0;
    const dress = v < 3 ? SHOPS[v].color : VILLAGER_COLORS[(v - 3) % VILLAGER_COLORS.length];
    const root = new THREE.Group(), P = {};
    const body = pivot(root, 0, 0.25, 0);
    box(body, 0.34, 0.36, 0.3, dress, 0, 0.18, 0);              // skirt
    box(body, 0.24, 0.26, 0.18, dress, 0, 0.48, 0);             // bodice
    for (const s of [-1, 1]) box(body, 0.07, 0.22, 0.08, 0xffe0bd, s * 0.17, 0.46, 0);
    const head = pivot(body, 0, 0.78, 0);
    box(head, 0.26, 0.26, 0.26, 0xffe0bd, 0, 0, 0);
    box(head, 0.28, 0.1, 0.28, v % 2 ? 0xf3e3a0 : 0x5a3a22, 0, 0.12, -0.01);
    box(head, 0.05, 0.06, 0.02, 0x222222, -0.06, 0.0, 0.135); box(head, 0.05, 0.06, 0.02, 0x222222, 0.06, 0.0, 0.135);
    box(head, 0.08, 0.02, 0.02, 0xff7a9a, 0, -0.07, 0.135);
    box(head, 0.06, 0.06, 0.06, 0xffe27a, 0, 0.22, 0, true);    // little glowing bun / sparkle
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xd8f6ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), wingMat);
      w.position.set(s * 0.2, 0.55, -0.14); w.rotation.y = s * 0.6; body.add(w);
      P[s < 0 ? 'wingL' : 'wingR'] = w;
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color: dress, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }));
    halo.scale.set(1.6, 1.6, 1); halo.position.y = 0.6; root.add(halo);
    if (v < 3) {   // name tag over shopkeepers
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'rgba(20,10,50,0.7)'; ctx.fillRect(0, 6, 256, 52);
      ctx.font = 'bold 24px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd76a'; ctx.fillText(SHOPS[v].title, 128, 32);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
      tag.scale.set(1.7, 0.42, 1); tag.position.y = 1.55; root.add(tag);
    }
    Object.assign(P, { body, head });
    return { root, P };
  }

  const flap = m => { const f = Math.sin(m.t * 22) * 0.5; m.P.wingL.rotation.y = -0.6 - f; m.P.wingR.rotation.y = 0.6 + f; };
  MV.MOB_TYPES.fairy = { build: buildFairy, w: 0.25, h: 1.1, hp: 10, friendly: true, flying: true, name: 'Pixie Fairy', ghostTick: flap };

  MV.Mob.prototype.fairy = function (dt, dx, dz, dist) {
    const g = this.game;
    this.flee = 0;   // fairies don't spook
    let tx, ty, tz;
    if (this.station) {   // shopkeeper: hover behind the counter, turn to greet visitors
      tx = this.station.x; tz = this.station.z; ty = this.station.y + Math.sin(this.t * 2) * 0.12;
      const want = dist < 8 ? Math.atan2(dx, dz) : this.face;
      let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 4);
      if (dist < 5 && Math.random() < dt * 0.6) g.particles.hearts(this.pos.x, this.pos.y + 1.3, this.pos.z);
    } else {              // villager: loop lazily around the plaza
      const a = this.t * 0.35 + this.phase, r = 6 + Math.sin(this.t * 0.2 + this.phase) * 3;
      tx = this.home.x + Math.cos(a) * r; tz = this.home.z + Math.sin(a) * r; ty = this.home.y + 2.5 + Math.sin(this.t * 1.3 + this.phase);
      this.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    }
    this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 3);
    this.pos.y += (ty - this.pos.y) * Math.min(1, dt * 3);
    this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 3);
    flap(this);
    if (Math.random() < dt * 6) g.particles.glow.spawn(this.pos.x, this.pos.y + 0.5, this.pos.z, (Math.random() - 0.5) * 0.4, -0.5, (Math.random() - 0.5) * 0.4, 1, 0.9, 0.6, 1, 0.3, 1);
  };

  // ---------------------------------------------------------------- village life + shop screen
  class Village {
    constructor(game) {
      this.g = game; this.folk = []; this.checkT = 0; this.gifted = false;
      const el = document.createElement('div');
      el.id = 'shop'; el.className = 'screen'; el.hidden = true;
      el.innerHTML = `<div class="panel shop-panel">
          <h2 id="shopTitle"></h2>
          <p id="shopGreet" class="shop-greet"></p>
          <div id="shopOffers" class="shop-offers"></div>
          <p class="shop-note" id="shopNote"></p>
          <button id="shopClose" class="big-btn">Thank you!</button>
        </div>`;
      document.body.appendChild(el);
      this.el = el;
      $('shopClose').addEventListener('click', () => this.closeShop());
      document.addEventListener('keydown', e => {
        if (!this.el.hidden && (e.code === 'Escape' || e.code === 'KeyE')) { e.preventDefault(); this.closeShop(); }
      }, true);
    }

    // Keep the village's fairies around while anyone is nearby (solo or host)
    update(dt) {
      const g = this.g, V = g.world && g.world.village;
      if (!V || (g.net.active && !g.net.isHost) || (this.checkT -= dt) > 0) return;
      this.checkT = 2;
      const near = g.net.isHost ? g.net.nearestDist({ x: V.x, z: V.z }) : Math.hypot(g.player.pos.x - V.x, g.player.pos.z - V.z);
      if (near > 75) return;
      const home = new THREE.Vector3(V.x + 0.5, V.y + 1, V.z + 0.5);
      plan().stations.forEach((st, i) => {
        if (this.folk[i] && !this.folk[i].dead) return;
        const station = new THREE.Vector3(V.x + st.x + 0.5, V.y + 1.7, V.z + st.z + 0.5);   // hovering just above the counter
        this.folk[i] = g.mobs.spawn('fairy', station.x, station.y, station.z, { variant: st.shop, station, face: st.face, home });
      });
      for (let i = 3; i < 7; i++) {
        if (this.folk[i] && !this.folk[i].dead) continue;
        this.folk[i] = g.mobs.spawn('fairy', home.x, home.y + 3, home.z, { variant: i, home, phase: i * 1.6 });
      }
    }

    openShop(mob) {
      const g = this.g, v = mob.variant || 0;
      if (v > 2) { g.ui.toast(['✨ "Lovely day for flying!"', '✨ "Have you seen the castle\'s fireworks?"', '✨ "The shops are just round the fountain."', '✨ "Stay safe out there — come back any time!"'][v % 4]); return; }
      this.shop = SHOPS[v];
      this.prevState = g.state;
      if (g.state === 'playing') { g.state = 'shop'; if (document.pointerLockElement) document.exitPointerLock(); if (g.touchUI) g.touchUI.release(); }
      if (!this.gifted && g.mode === 'survival') {
        this.gifted = true; g.inv.add(I.POTION_HEAL, 2); g.ui.refreshHotbar();
        g.ui.toast('🎁 The fairies welcome you with 2 Healing Potions!', 'boss');
      }
      this.render();
      this.el.hidden = false;
      g.sfx.chime();
    }

    closeShop() {
      const g = this.g;
      this.el.hidden = true;
      if (this.prevState === 'playing') { g.state = 'paused'; g.lock(); }
    }

    render() {
      const g = this.g, inv = g.inv, free = g.mode === 'creative', s = this.shop;
      $('shopTitle').textContent = `${s.name}'s ${s.title}`;
      $('shopGreet').textContent = `“${s.greet}”`;
      $('shopNote').textContent = free ? 'Creative mode: everything is free.' : 'Prices are paid from your satchel and hotbar.';
      const list = $('shopOffers');
      list.innerHTML = '';
      for (const [id, n, price] of s.offers) {
        const ok = free || price.every(([pid, pn]) => inv.count(pid) >= pn);
        const row = document.createElement('div');
        row.className = 'shop-row' + (ok ? '' : ' locked');
        const desc = id >= 100 ? MV.ITEMS[id].desc.replace(/^RMB: /, '') : 'Building block';
        const cost = price.map(([pid, pn]) => `<span class="need ${free || inv.count(pid) >= pn ? '' : 'missing'}" title="${MV.itemName(pid)}"><img src="${MV.iconURL(pid)}" alt="">×${pn}</span>`).join('');
        row.innerHTML = `<img class="out" src="${MV.iconURL(id)}" alt=""><div class="rtext"><b>${MV.itemName(id)} ×${n}</b><div class="sdesc">${desc}</div></div><div class="needs">${cost}</div><button ${ok ? '' : 'disabled'}>Buy</button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (!free && !price.every(([pid, pn]) => inv.count(pid) >= pn)) return;
          if (!free) price.forEach(([pid, pn]) => inv.remove(pid, pn));
          const left = inv.add(id, n);
          if (left) g.ui.toast('Your satchel is full!', 'warn');
          g.ui.refreshHotbar(); g.sfx.chime();
          g.ui.toast(`✨ ${s.name}: "Thank you! Here's your ${MV.itemName(id)}."`);
          this.render();
        });
        list.appendChild(row);
      }
    }
  }

  MV.Village = Village;
  MV.villagePlan = plan;
})();
