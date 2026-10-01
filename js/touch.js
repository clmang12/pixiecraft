/* PixieCraft — touch controls for phones and tablets.
   Left thumb: a floating joystick (appears where you touch the left side of the screen).
   Right thumb: drag anywhere else to look around.
   Buttons: ⛏ break/attack/cast (hold), 🧱 place/use (hold), ⤒ jump (hold to swim/fly up,
   double-tap to toggle flight in Creative), ⤓ descend/dive, plus pause, satchel, light orb,
   pixie glide and chat. Tap a hotbar slot to select it. */
(function () {
  'use strict';
  const MV = window.MV;
  const $ = id => document.getElementById(id);
  // Touch mode when the primary pointer is a finger (phones, tablets), or forced with #touch
  MV.isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || location.hash === '#touch';

  class TouchControls {
    constructor(game) {
      this.g = game; this.joy = null; this.lookT = null;
      game.touchMove = { x: 0, y: 0 };
      document.body.classList.add('touch');
      const ui = this.ui = document.createElement('div');
      ui.id = 'touchUI';
      ui.innerHTML = `
        <div id="joyBase" hidden><div id="joyKnob"></div></div>
        <div class="tbar">
          <button data-act="pause" aria-label="Pause">⏸</button>
          <button data-act="inv" aria-label="Satchel">🎒</button>
          <button data-act="orb" aria-label="Light orb">✨</button>
          <button data-act="glide" aria-label="Pixie glide">🪽</button>
          <button data-act="chat" id="tChat" aria-label="Chat" hidden>💬</button>
        </div>
        <div class="tpad">
          <button data-hold="jump" aria-label="Jump">⤒</button>
          <button data-hold="break" class="big" aria-label="Break or attack">⛏</button>
          <button data-hold="down" aria-label="Go down">⤓</button>
          <button data-hold="use" class="big" aria-label="Place or use">🧱</button>
        </div>`;
      $('hud').appendChild(ui);
      this.base = $('joyBase'); this.knob = $('joyKnob');
      this.bind();
      setInterval(() => { $('tChat').hidden = !game.net.active; }, 1000);
      $('resumeBtn').textContent = 'Tap to begin';
    }

    bind() {
      const g = this.g, ui = this.ui, opt = { passive: false };
      const playing = () => g.state === 'playing';

      // --- joystick + look, tracked per finger
      ui.addEventListener('touchstart', e => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        if (!playing()) return;
        for (const t of e.changedTouches) {
          if (t.clientX < window.innerWidth * 0.4 && !this.joy) {
            this.joy = { id: t.identifier, x: t.clientX, y: t.clientY };
            this.base.hidden = false;
            this.base.style.left = t.clientX + 'px'; this.base.style.top = t.clientY + 'px';
            this.knob.style.transform = 'translate(-50%, -50%)';
          } else if (!this.lookT) this.lookT = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }, opt);
      ui.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
          if (this.joy && t.identifier === this.joy.id) {
            let dx = t.clientX - this.joy.x, dy = t.clientY - this.joy.y;
            const l = Math.hypot(dx, dy), R = 52;
            if (l > R) { dx *= R / l; dy *= R / l; }
            g.touchMove.x = dx / R; g.touchMove.y = dy / R;
            this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
          } else if (this.lookT && t.identifier === this.lookT.id) {
            if (playing()) g.player.look((t.clientX - this.lookT.x) * 2.6, (t.clientY - this.lookT.y) * 2.6);
            this.lookT.x = t.clientX; this.lookT.y = t.clientY;
          }
        }
      }, opt);
      const end = e => {
        for (const t of e.changedTouches) {
          if (this.joy && t.identifier === this.joy.id) { this.joy = null; this.base.hidden = true; g.touchMove.x = g.touchMove.y = 0; }
          if (this.lookT && t.identifier === this.lookT.id) this.lookT = null;
        }
      };
      ui.addEventListener('touchend', end); ui.addEventListener('touchcancel', end);

      // --- hold buttons
      const hold = {
        break: on => { g.mouse.left = on; if (on) g.mouse.lp = true; },
        use: on => { g.mouse.right = on; if (on) g.mouse.rp = true; },
        jump: on => { g.keys.Space = on; if (on && g.player) g.player.onSpaceDown(); },
        down: on => { g.keys.ShiftLeft = on; },
      };
      ui.querySelectorAll('[data-hold]').forEach(b => {
        const fn = hold[b.dataset.hold];
        const set = on => e => { e.preventDefault(); e.stopPropagation(); b.classList.toggle('held', on); if (on && !playing()) return; fn(on); };
        b.addEventListener('touchstart', set(true), opt);
        b.addEventListener('touchend', set(false), opt);
        b.addEventListener('touchcancel', set(false), opt);
      });

      // --- tap buttons
      const act = {
        pause: () => this.pause(),
        inv: () => { g.state = 'inventory'; g.ui.openInventory(); this.release(); },
        orb: () => g.castLightOrb(),
        glide: () => { const p = g.player; p.glideMode = !p.glideMode; g.ui.toast(p.glideMode ? '✦ Pixie Glide on — hold ⤒ in the air to soar' : 'Pixie Glide off'); },
        chat: () => { this.release(); g.net.openChat(); },
      };
      ui.querySelectorAll('[data-act]').forEach(b => b.addEventListener('touchstart', e => {
        e.preventDefault(); e.stopPropagation();
        if (playing()) act[b.dataset.act]();
      }, opt));

      // --- hotbar: tap a slot to select it
      g.ui.slotEls.forEach((el, i) => el.addEventListener('touchstart', e => {
        e.preventDefault();
        if (g.inv) { g.inv.selected = i; g.ui.refreshHotbar(); }
      }, opt));
    }

    release() {
      const g = this.g;
      g.keys = {}; g.mouse.left = g.mouse.right = false; g.touchMove.x = g.touchMove.y = 0;
      this.joy = null; this.lookT = null; this.base.hidden = true;
      this.ui.querySelectorAll('.held').forEach(b => b.classList.remove('held'));
    }

    pause() {
      const g = this.g;
      g.state = 'paused';
      $('pauseTitle').textContent = 'Paused'; $('resumeBtn').textContent = 'Resume';
      g.ui.show('pause', true);
      this.release();
    }
  }

  MV.TouchControls = TouchControls;
})();
