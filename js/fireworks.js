/* PixieCraft — the nightly 9 PM fireworks spectacular over the kingdom.
   Rockets launch in a ring around the player and burst as peonies, rings, hearts, stars,
   golden willows, palms and crackling crossettes, building to a massive finale. */
(function () {
  'use strict';
  const MV = window.MV;
  const SHOW_TIME = 0.625;   // sky.time for 21:00 (sky.time 0 = 06:00)
  const DURATION = 42;       // seconds of real time
  const PALETTES = [
    [[1, 0.35, 0.75], [1, 0.8, 0.95]], [[1, 0.85, 0.3], [1, 1, 0.8]], [[0.35, 0.85, 1], [0.8, 0.95, 1]],
    [[0.7, 0.4, 1], [1, 0.6, 1]], [[1, 0.3, 0.3], [1, 0.85, 0.4]], [[0.4, 1, 0.5], [0.9, 1, 0.6]], [[1, 1, 1], [0.8, 0.9, 1]],
  ];
  const STYLES = ['peony', 'peony', 'ring', 'heart', 'star', 'willow', 'palm', 'crossette'];
  const rnd = () => Math.random() - 0.5;

  class Fireworks {
    constructor(game) {
      this.game = game;
      this.rockets = []; this.events = [];
      this.showT = 0; this.launchT = 0;
      this.lastTime = game.sky.time;
      // Large, fog-free additive sparks so bursts read from far away
      this.fx = new (MV.ParticleSystem)(game.scene, 20000, 1.5, true, MV.glowTexture());
      this.fx.points.material.fog = false;
    }

    get active() { return this.showT > 0; }

    start() {
      this.showT = DURATION; this.launchT = 0.5;
      this.game.ui.toast('🎆 It\'s 9 o\'clock — fireworks over the Kingdom!', 'boss');
      this.game.sfx.chime();
    }

    launch() {
      const g = this.game, C = g.world.castle;
      // Near the castle, the show bursts above its spires
      const p = C && Math.hypot(C.x - g.player.pos.x, C.z - g.player.pos.z) < 150 ? new THREE.Vector3(C.x, C.y, C.z) : g.player.pos;
      const a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 35;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const s = g.world.surfaceY(Math.floor(x), Math.floor(z));
      const y = s ? s.y : p.y;
      this.rockets.push({
        pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(rnd() * 3, 30 + Math.random() * 9, rnd() * 3),
        fuse: 1.5 + Math.random() * 0.5, pal: PALETTES[(Math.random() * PALETTES.length) | 0],
        style: STYLES[(Math.random() * STYLES.length) | 0],
      });
      g.sfx.whistle();
    }

    spark(p, v, c, life, grav = 3, drag = 1.3) {
      this.fx.spawn(p.x, p.y, p.z, v.x, v.y, v.z, c[0], c[1], c[2], life, grav, drag);
    }

    explode(r) {
      const g = this.game, p = r.pos, pal = r.pal, cam = g.camera;
      const col = i => pal[i % pal.length];
      const S = 17 + Math.random() * 7;
      // Screen-facing basis for shaped bursts (hearts, stars)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), up = new THREE.Vector3(0, 1, 0);
      const planar = (x, y, k) => right.clone().multiplyScalar(x * k).addScaledVector(up, y * k);
      const V = new THREE.Vector3();
      switch (r.style) {
        case 'ring': {
          const n = new THREE.Vector3(rnd(), rnd() + 0.5, rnd()).normalize();
          const a = new THREE.Vector3(1, 0, 0).cross(n).normalize(), b = n.clone().cross(a);
          for (let i = 0; i < 160; i++) { const t = (i / 160) * Math.PI * 2; this.spark(p, a.clone().multiplyScalar(Math.cos(t) * S).addScaledVector(b, Math.sin(t) * S), col(i), 1.8); }
          for (let i = 0; i < 30; i++) this.spark(p, V.set(rnd(), rnd(), rnd()).multiplyScalar(6), [1, 1, 1], 1);
          break;
        }
        case 'heart':
          for (let i = 0; i < 200; i++) {
            const t = (i / 200) * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            this.spark(p, planar(x, y, S / 17), [1, 0.3 + Math.random() * 0.3, 0.6], 2.0, 1.5);
          }
          break;
        case 'star':
          for (let i = 0; i < 200; i++) {
            const t = (i / 200) * 10, seg = Math.floor(t), f = t - seg;
            const r0 = seg % 2 ? 0.42 : 1, r1 = seg % 2 ? 1 : 0.42;
            const a0 = (seg / 10) * Math.PI * 2 - Math.PI / 2, a1 = ((seg + 1) / 10) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a0) * r0 * (1 - f) + Math.cos(a1) * r1 * f, y = -(Math.sin(a0) * r0 * (1 - f) + Math.sin(a1) * r1 * f);
            this.spark(p, planar(x, y, S), [1, 0.9, 0.4], 2.0, 1.5);
          }
          break;
        case 'willow':
          for (let i = 0; i < 240; i++) { const d = V.set(rnd(), rnd() + 0.2, rnd()).normalize().multiplyScalar(S * (0.6 + Math.random() * 0.4)); this.spark(p, d, [1, 0.75 + Math.random() * 0.2, 0.3], 3.6, 7, 1.8); }
          break;
        case 'palm':
          for (let arm = 0; arm < 9; arm++) {
            const d = new THREE.Vector3(rnd(), Math.random() * 0.6 + 0.1, rnd()).normalize();
            for (let i = 0; i < 22; i++) this.spark(p, d.clone().multiplyScalar(S * (0.5 + i / 30)), col(arm), 2.4, 6, 1.2);
          }
          break;
        case 'crossette':
          for (let i = 0; i < 130; i++) {
            const d = V.set(rnd(), rnd(), rnd()).normalize().multiplyScalar(S * 0.8);
            this.spark(p, d, col(i), 1.2);
            if (i % 9 === 0) {
              const at = p.clone().addScaledVector(d, 0.8);
              this.events.push({ t: 0.8, fn: () => { for (let k = 0; k < 24; k++) this.spark(at, V.set(rnd(), rnd(), rnd()).normalize().multiplyScalar(5), [1, 1, 0.9], 0.6, 2); g.sfx.crackle(); } });
            }
          }
          break;
        default: // peony: big full sphere with a contrasting core
          for (let i = 0; i < 280; i++) {
            const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
            this.spark(p, V.set(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)).multiplyScalar(S * (0.85 + Math.random() * 0.15)), col(i), 2.2);
          }
          for (let i = 0; i < 40; i++) this.spark(p, V.set(rnd(), rnd(), rnd()).normalize().multiplyScalar(5), col(i + 1), 1.4);
      }
      const dist = p.distanceTo(g.player.pos);
      setTimeout(() => g.sfx.firework(), Math.min(600, dist * 6));
      g.sky.flash = Math.min(1, (g.sky.flash || 0) + 0.3);
    }

    update(dt) {
      const g = this.game, t = g.sky.time;
      // Trigger when the clock passes 21:00
      if (this.lastTime < SHOW_TIME && t >= SHOW_TIME && !this.active) this.start();
      this.lastTime = t;

      if (this.active) {
        this.showT -= dt; this.launchT -= dt;
        const finale = this.showT < 8;
        if (this.launchT <= 0) {
          const n = finale ? 4 + ((Math.random() * 4) | 0) : 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0);
          for (let i = 0; i < n; i++) this.launch();
          this.launchT = finale ? 0.25 : Math.max(0.45, 1.3 - (DURATION - this.showT) * 0.02);
        }
        if (this.showT <= 0) { this.showT = 0; g.ui.toast('✨ What a show! Goodnight, Kingdom.'); }
      }

      for (let i = this.rockets.length - 1; i >= 0; i--) {
        const r = this.rockets[i];
        r.vel.y -= 9 * dt; r.pos.addScaledVector(r.vel, dt); r.fuse -= dt;
        for (let k = 0; k < 2; k++) this.fx.spawn(r.pos.x + rnd() * 0.2, r.pos.y, r.pos.z + rnd() * 0.2, rnd(), -2, rnd(), 1, 0.75, 0.35, 0.5, 0, 1);
        if (r.fuse <= 0) { this.explode(r); this.rockets.splice(i, 1); }
      }
      for (let i = this.events.length - 1; i >= 0; i--) if ((this.events[i].t -= dt) <= 0) { this.events[i].fn(); this.events.splice(i, 1); }
      this.fx.update(dt);
    }
  }

  MV.Fireworks = Fireworks;
})();
