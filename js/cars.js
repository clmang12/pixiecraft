/* PixieCraft — Tailfin Canyon's friendly residents: cartoon cars with eyes in their windshields.
   Variants: a red racer with lightning decals, a rusty buck-toothed tow truck, and a sky-blue coupe.
   They cruise the canyon, honk hello and do happy donuts around the player. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B;
  const box = MV.mobBox, pivot = MV.mobPivot, Mob = MV.Mob, TYPES = MV.MOB_TYPES;

  const VARIANTS = ['racer', 'tow', 'coupe'];

  function buildCar() {
    const variant = VARIANTS[(Math.random() * VARIANTS.length) | 0];
    const root = new THREE.Group(), P = { variant, wheels: [] };
    const color = variant === 'racer' ? 0xd62828 : variant === 'tow' ? 0x9a5a34 : 0x5b9dff;
    const body = pivot(root, 0, 0, 0);
    box(body, 0.92, 0.34, 1.8, color, 0, 0.46, 0);
    box(body, 0.8, 0.3, 0.82, color, 0, 0.78, -0.12);
    // Windshield eyes
    box(body, 0.74, 0.26, 0.04, 0xffffff, 0, 0.8, 0.3);
    for (const s of [-1, 1]) {
      box(body, 0.2, 0.2, 0.02, variant === 'tow' ? 0x6b4a2e : 0x3a78d8, s * 0.17, 0.79, 0.325);
      box(body, 0.09, 0.12, 0.02, 0x111111, s * 0.15, 0.79, 0.335);
      box(body, 0.04, 0.04, 0.02, 0xffffff, s * 0.12, 0.83, 0.345, true);
    }
    // Smiling grille, chrome bumper, headlights
    box(body, 0.46, 0.06, 0.04, 0x1a1a1a, 0, 0.42, 0.9);
    box(body, 0.1, 0.06, 0.04, 0x1a1a1a, -0.24, 0.46, 0.9);
    box(body, 0.1, 0.06, 0.04, 0x1a1a1a, 0.24, 0.46, 0.9);
    box(body, 0.96, 0.08, 0.06, 0xd0d4dc, 0, 0.3, 0.9);
    box(body, 0.96, 0.08, 0.06, 0xd0d4dc, 0, 0.3, -0.9);
    for (const s of [-1, 1]) if (variant !== 'tow' || s < 0) box(body, 0.16, 0.12, 0.04, 0xfff3a0, s * 0.33, 0.52, 0.91, true);
    for (const s of [-1, 1]) box(body, 0.14, 0.1, 0.04, 0xff3040, s * 0.33, 0.52, -0.91, true);
    if (variant === 'racer') {
      for (const s of [-1, 1]) {
        [[0.3, 0.52, 0.18], [0.1, 0.46, 0.16], [-0.1, 0.5, 0.18], [-0.3, 0.44, 0.16]].forEach(([z, y, w]) => box(body, 0.02, 0.07, w, 0xffd23f, s * 0.47, y, z));
      }
      box(body, 0.2, 0.2, 0.02, 0xffffff, 0, 0.94, -0.12).rotation.x = -Math.PI / 2;
      box(body, 0.96, 0.05, 0.22, color, 0, 0.84, -0.82);
      for (const s of [-1, 1]) box(body, 0.05, 0.2, 0.05, 0x222222, s * 0.35, 0.72, -0.82);
    } else if (variant === 'tow') {
      box(body, 0.06, 0.1, 0.03, 0xffffff, -0.06, 0.34, 0.93);
      box(body, 0.06, 0.1, 0.03, 0xffffff, 0.06, 0.34, 0.93);
      box(body, 0.1, 0.55, 0.1, 0x555555, 0, 0.95, -0.72);
      box(body, 0.1, 0.1, 0.4, 0x555555, 0, 1.2, -0.88);
      box(body, 0.06, 0.2, 0.06, 0x999999, 0, 1.08, -1.06);
      box(body, 0.24, 0.08, 0.3, 0x5b8a7a, 0.3, 0.64, 0.4);
      box(body, 0.2, 0.1, 0.2, 0xff9a1f, 0, 0.96, -0.12, true);
    } else {
      box(body, 0.94, 0.04, 1.82, 0xd0d4dc, 0, 0.6, 0);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = pivot(root, sx * 0.47, 0.22, sz * 0.56);
      box(w, 0.14, 0.44, 0.44, 0x1a1a1a, 0, 0, 0);
      box(w, 0.16, 0.18, 0.18, 0xc0c0c8, 0, 0, 0);
      P.wheels.push(w);
    }
    P.body = body;
    return { root, P };
  }

  TYPES.car = { build: buildCar, w: 0.46, h: 1.0, hp: 10, friendly: true, name: 'Canyon Car' };

  Mob.prototype.car = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P;
    const top = P.variant === 'racer' ? 9 : P.variant === 'tow' ? 5 : 6.5;
    this.ai -= dt; this.honkT = (this.honkT || 2) - dt;
    let want = this.cruise ?? top * 0.7;
    if (this.flee > 0) {
      this.flee -= dt; this.yaw += (Math.atan2(-dx, -dz) - this.yaw) * Math.min(1, dt * 3); want = top;
    } else if (dist < 9) {
      // Happy donuts around the player
      const ang = Math.atan2(dx, dz) + Math.PI / 2;
      let d = ang - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 2.5); want = top * 0.6;
      if (this.honkT <= 0) { this.honkT = 3 + Math.random() * 4; g.sfx.honk(P.variant); g.particles.hearts(this.pos.x, this.pos.y + 1.3, this.pos.z); }
    } else {
      if (this.ai <= 0) { this.ai = 1.5 + Math.random() * 3; this.turn = (Math.random() - 0.5) * 1.4; this.cruise = Math.random() < 0.15 ? 0 : top * (0.5 + Math.random() * 0.5); }
      this.yaw += (this.turn || 0) * dt;
      // Stay in the canyon
      const t = g.world.terrain(Math.floor(this.pos.x + Math.sin(this.yaw) * 4), Math.floor(this.pos.z + Math.cos(this.yaw) * 4));
      if (t.canyon < 0.5 || t.h <= MV.SEA) this.yaw += Math.PI * dt * 2;
    }
    if (this.hitWall) { this.yaw += (Math.random() < 0.5 ? 1 : -1) * 1.2; this.speed = -2; }
    this.speed = (this.speed || 0) + (want - (this.speed || 0)) * Math.min(1, dt * 2);
    if (this.stun <= 0) { this.vel.x = Math.sin(this.yaw) * this.speed; this.vel.z = Math.cos(this.yaw) * this.speed; }
    if (this.hitWall && this.onGround) this.vel.y = 7;
    for (const w of P.wheels) w.rotation.x += (this.speed * dt) / 0.22;
    P.body.rotation.x = this.onGround ? Math.sin(this.t * 20) * 0.01 : -0.1;
    if (Math.abs(this.speed) > 3 && this.onGround && Math.random() < dt * 20)
      g.particles.solid.spawn(this.pos.x - Math.sin(this.yaw) * 0.9, this.pos.y + 0.1, this.pos.z - Math.cos(this.yaw) * 0.9, (Math.random() - 0.5), 0.8, (Math.random() - 0.5), 0.88, 0.55, 0.35, 0.6, 2, 1);
  };

  MV.SPAWNERS.push((mgr, g) => {
    const p = g.player.pos;
    if (mgr.count('car') >= 6 || g.world.terrain(Math.floor(p.x), Math.floor(p.z)).canyon < 0.5 || Math.random() > 0.5) return;
    const s = mgr.findSpot(p.x, p.z, 14, 34);
    if (!s) return;
    const id = g.world.getBlock(Math.floor(s.x), Math.floor(s.y) - 1, Math.floor(s.z));
    if (id === B.ASPHALT || id === B.ROAD_LINE || id === B.RED_SAND) mgr.spawn('car', s.x, s.y, s.z);
  });
})();
