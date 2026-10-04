/* PixieCraft — the Wardrobe: pick an outfit style and colours, with a live 3D preview.
   Open it from the title screen, the pause menu, the O key or the 👗 touch button.
   Your outfit is remembered on this device and shown to other players online. */
(function () {
  'use strict';
  const MV = window.MV;
  const $ = id => document.getElementById(id);

  class Wardrobe {
    constructor(game) {
      this.g = game;
      this.outfit = MV.loadOutfit();
      this.open_ = false;
      const el = document.createElement('div');
      el.id = 'wardrobe'; el.className = 'screen'; el.hidden = true;
      el.innerHTML = `
        <div class="panel wd-panel">
          <h2>👗 Wardrobe</h2>
          <div class="wd-body">
            <canvas id="wdPreview" width="220" height="280" aria-label="Preview of your character"></canvas>
            <div class="wd-controls">
              <div class="wd-label">Outfit</div>
              <div class="wd-styles" id="wdStyles"></div>
              <div class="wd-label">Outfit colour</div><div class="wd-swatches" id="wdColor"></div>
              <div class="wd-label">Skin tone</div><div class="wd-swatches" id="wdSkin"></div>
              <div class="wd-label">Hair</div><div class="wd-swatches" id="wdHair"></div>
            </div>
          </div>
          <button id="wdDone" class="big-btn">Done</button>
        </div>`;
      document.body.appendChild(el);
      this.el = el;
      this.build();
      $('wdDone').addEventListener('click', () => this.close());
      for (const id of ['wardrobeBtn', 'wardrobeBtn2']) { const b = $(id); if (b) b.addEventListener('click', () => this.open()); }
      document.addEventListener('keydown', e => {
        if (this.open_ && (e.code === 'Escape' || e.code === 'KeyO')) { e.preventDefault(); e.stopPropagation(); this.close(); }
      }, true);
    }

    build() {
      const styles = $('wdStyles');
      for (const s of MV.OUTFIT_STYLES) {
        const b = document.createElement('button');
        b.className = 'wd-style'; b.dataset.style = s.id;
        b.innerHTML = `<span>${s.icon}</span>${s.name}`;
        b.addEventListener('click', () => this.set({ style: s.id }));
        styles.appendChild(b);
      }
      const swatches = (id, list, key) => {
        for (const c of list) {
          const b = document.createElement('button');
          b.className = 'wd-swatch'; b.style.background = c; b.dataset.v = c; b.setAttribute('aria-label', c);
          b.addEventListener('click', () => this.set({ [key]: c }));
          $(id).appendChild(b);
        }
      };
      swatches('wdColor', MV.OUTFIT_COLORS, 'color');
      swatches('wdSkin', MV.SKIN_TONES, 'skin');
      swatches('wdHair', MV.HAIR_COLORS, 'hair');
      this.refresh();
    }

    refresh() {
      const o = this.outfit;
      this.el.querySelectorAll('.wd-style').forEach(b => b.classList.toggle('on', b.dataset.style === o.style));
      for (const [id, key] of [['wdColor', 'color'], ['wdSkin', 'skin'], ['wdHair', 'hair']])
        $(id).querySelectorAll('.wd-swatch').forEach(b => b.classList.toggle('on', b.dataset.v === o[key]));
    }

    set(patch) {
      this.outfit = Object.assign({}, this.outfit, patch);
      MV.saveOutfit(this.outfit);
      this.refresh();
      this.rebuildPreview();
      this.g.onOutfitChange(this.outfit);
      this.g.sfx.click();
    }

    // ------------------------------------------------------------ live preview
    initPreview() {
      if (this.renderer) return;
      const canvas = $('wdPreview');
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.scene = new THREE.Scene();
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(1, 2, 2); this.scene.add(sun);
      this.cam = new THREE.PerspectiveCamera(35, 220 / 280, 0.1, 50);
      this.cam.position.set(0, 1.25, 4.6); this.cam.lookAt(0, 1.05, 0);
      this.rot = 0.4;
      // Drag to spin the preview
      let dragX = null;
      const down = x => (dragX = x), move = x => { if (dragX != null) { this.rot += (x - dragX) * 0.02; dragX = x; this.spinPause = 2; } }, up = () => (dragX = null);
      canvas.addEventListener('mousedown', e => down(e.clientX)); window.addEventListener('mousemove', e => move(e.clientX)); window.addEventListener('mouseup', up);
      canvas.addEventListener('touchstart', e => down(e.touches[0].clientX), { passive: true });
      canvas.addEventListener('touchmove', e => move(e.touches[0].clientX), { passive: true });
      canvas.addEventListener('touchend', up);
    }

    rebuildPreview() {
      if (!this.scene) return;
      if (this.model) this.scene.remove(this.model.root);
      this.model = MV.buildAvatar(this.outfit);
      this.scene.add(this.model.root);
    }

    tick() {
      if (!this.open_) return;
      requestAnimationFrame(() => this.tick());
      const now = performance.now(), dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
      if ((this.spinPause = Math.max(0, (this.spinPause || 0) - dt)) === 0) this.rot += dt * 0.6;
      this.model.root.rotation.y = this.rot;
      MV.animateAvatar(this.model, dt, 0.35, 0);
      this.renderer.render(this.scene, this.cam);
    }

    open() {
      const g = this.g;
      this.prevState = g.state;
      if (g.state === 'playing') { g.state = 'wardrobe'; if (document.pointerLockElement) document.exitPointerLock(); if (g.touchUI) g.touchUI.release(); }
      this.el.hidden = false; this.open_ = true;
      this.initPreview(); this.rebuildPreview(); this.refresh();
      this.last = 0; this.tick();
    }

    close() {
      const g = this.g;
      this.el.hidden = true; this.open_ = false;
      if (this.prevState === 'playing') { g.state = 'paused'; g.lock(); }
    }
  }

  MV.Wardrobe = Wardrobe;
})();
