/* PixieCraft — creatures of the snowy Crystal Peaks.
   ⛄ Snowmen (enemy): top-hatted snowmen that keep their distance and lob chilling snowballs.
   🦍 The Yeti (boss): the strongest boss in the kingdom — armored fur, crushing punches that
      launch you, giant ice-boulder throws, earth-shaking leaps and a bone-chilling roar. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, I = MV.ITEM;
  const box = MV.mobBox, pivot = MV.mobPivot, Mob = MV.Mob, TYPES = MV.MOB_TYPES;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rnd = () => Math.random() - 0.5;
  const SNOW_COLORS = [[1, 1, 1], [0.8, 0.92, 1], [0.6, 0.85, 1]];

  // ---------------------------------------------------------------- models
  function buildSnowman() {
    const root = new THREE.Group(), P = {};
    const W = 0xf6f9ff, COAL = 0x1a1a1a, STICK = 0x6b4a2e;
    const scarf = [0xd62828, 0x2b59c3, 0x2e9d4a, 0xff7ad9][(Math.random() * 4) | 0];
    const body = pivot(root, 0, 0, 0);
    box(body, 0.7, 0.6, 0.7, W, 0, 0.3, 0);
    box(body, 0.52, 0.46, 0.52, W, 0, 0.83, 0);
    box(body, 0.06, 0.06, 0.03, COAL, 0, 0.95, 0.265);
    box(body, 0.06, 0.06, 0.03, COAL, 0, 0.8, 0.265);
    box(body, 0.06, 0.06, 0.03, COAL, 0, 0.45, 0.355);
    box(body, 0.56, 0.08, 0.56, scarf, 0, 1.08, 0);
    box(body, 0.1, 0.3, 0.04, scarf, 0.15, 0.92, 0.28);
    const head = pivot(body, 0, 1.3, 0);
    box(head, 0.4, 0.38, 0.4, W, 0, 0, 0);
    box(head, 0.07, 0.07, 0.02, COAL, -0.09, 0.05, 0.205);
    box(head, 0.07, 0.07, 0.02, COAL, 0.09, 0.05, 0.205);
    box(head, 0.07, 0.07, 0.24, 0xff8c28, 0, -0.02, 0.3);
    for (let i = -1; i <= 1; i++) box(head, 0.04, 0.04, 0.02, COAL, i * 0.07, -0.11 + Math.abs(i) * 0.02, 0.205);
    box(head, 0.46, 0.04, 0.46, COAL, 0, 0.2, 0);
    box(head, 0.3, 0.26, 0.3, COAL, 0, 0.34, 0);
    box(head, 0.31, 0.05, 0.31, scarf, 0, 0.24, 0);
    for (const s of [-1, 1]) {
      const arm = pivot(body, s * 0.26, 0.95, 0);
      box(arm, 0.5, 0.04, 0.04, STICK, s * 0.25, 0.05, 0);
      box(arm, 0.04, 0.14, 0.04, STICK, s * 0.46, 0.13, 0);
      P[s < 0 ? 'armL' : 'armR'] = arm;
    }
    P.body = body; P.head = head;
    return { root, P };
  }

  function buildYeti() {
    const root = new THREE.Group(), P = {};
    const F = 0xf2f6ff, F2 = 0xd4e2f4, FACE = 0x7fa8d8, EYE = 0x7ff6ff, HORN = 0x9aa6b8;
    for (const s of [-1, 1]) {
      const leg = pivot(root, s * 0.17, 0.45, 0);
      box(leg, 0.26, 0.45, 0.28, F, 0, -0.22, 0);
      box(leg, 0.3, 0.1, 0.36, FACE, 0, -0.42, 0.05);
      P[s < 0 ? 'legL' : 'legR'] = leg;
      const arm = pivot(root, s * 0.42, 1.04, 0);
      box(arm, 0.26, 0.64, 0.28, F, 0, -0.3, 0);
      box(arm, 0.28, 0.08, 0.3, F2, 0, -0.1, 0);
      box(arm, 0.32, 0.26, 0.32, FACE, 0, -0.68, 0);
      P[s < 0 ? 'armL' : 'armR'] = arm;
      box(root, 0.2, 0.14, 0.3, F2, s * 0.3, 1.1, 0);
    }
    box(root, 0.64, 0.64, 0.42, F, 0, 0.78, 0);
    box(root, 0.42, 0.4, 0.05, F2, 0, 0.74, 0.215);
    const head = pivot(root, 0, 1.24, 0.04);
    box(head, 0.48, 0.44, 0.44, F, 0, 0.04, 0);
    box(head, 0.5, 0.08, 0.46, F2, 0, 0.26, 0);
    box(head, 0.36, 0.28, 0.04, FACE, 0, -0.03, 0.22);
    box(head, 0.36, 0.05, 0.05, F2, 0, 0.11, 0.23);
    box(head, 0.09, 0.05, 0.02, EYE, -0.09, 0.05, 0.245, true);
    box(head, 0.09, 0.05, 0.02, EYE, 0.09, 0.05, 0.245, true);
    const jaw = box(head, 0.22, 0.07, 0.02, 0x1a2a44, 0, -0.1, 0.245);
    box(head, 0.04, 0.06, 0.02, 0xffffff, -0.06, -0.08, 0.25);
    box(head, 0.04, 0.06, 0.02, 0xffffff, 0.06, -0.08, 0.25);
    for (const s of [-1, 1]) box(head, 0.07, 0.22, 0.07, HORN, s * 0.22, 0.32, -0.02).rotation.z = s * -0.45;
    P.head = head; P.jaw = jaw;
    // Frosty aura
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color: 0x9fe8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35 }));
    aura.scale.set(2.2, 2.2, 1); aura.position.y = 0.9; root.add(aura);
    return { root, P };
  }

  // ---------------------------------------------------------------- types
  Object.assign(TYPES, {
    snowman: {
      build: buildSnowman, w: 0.35, h: 1.75, hp: 10, friendly: false, name: 'Snowman', deathColors: SNOW_COLORS,
      onDeath: (m, by) => { if (by && m.game.mode === 'survival') { m.game.inv.add(B.SNOW, 2); m.game.ui.refreshHotbar(); } },
    },
    yeti: {
      build: buildYeti, w: 0.33, h: 1.55, scale: 2.8, hp: 320, armor: 0.7, friendly: false, boss: true, heavy: true,
      name: 'The Yeti', riseColor: '#f4f8ff', deathColors: SNOW_COLORS,
    },
  });

  // ---------------------------------------------------------------- snowman
  Mob.prototype.snowman = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P, pl = g.player;
    const repel = this.orbRepel(dt);
    if (this.hp <= 0) return this.die(true);
    const hunting = dist < 26 && !g.safeZone && pl.health > 0;
    let speed = 0, strafe = false;
    if (repel) { this.yaw = Math.atan2(this.pos.x - repel.x, this.pos.z - repel.z); speed = 2.4; }
    else if (hunting) {
      // Keep a sniping distance: close in, back off, or circle
      this.yaw = Math.atan2(dx, dz);
      if (dist > 14) speed = 2.2; else if (dist < 6) speed = -1.8; else strafe = true;
      this.sdirT = (this.sdirT || 0) - dt;
      if (this.sdirT <= 0) { this.sdirT = 1.5 + Math.random() * 2; this.sdir = Math.random() < 0.5 ? 1 : -1; }
    } else {
      this.ai -= dt;
      if (this.ai <= 0) { this.ai = 3 + Math.random() * 3; this.walk = Math.random() < 0.5 ? 0 : 1.2; this.yaw = Math.random() * Math.PI * 2; }
      speed = this.walk;
    }
    this.steer(speed);
    if (strafe && this.stun <= 0) { this.vel.x = Math.cos(this.yaw) * 1.4 * this.sdir; this.vel.z = -Math.sin(this.yaw) * 1.4 * this.sdir; }
    const moving = speed !== 0 || strafe;
    P.body.position.y = moving ? Math.abs(Math.sin(this.t * 9)) * 0.07 : 0;
    P.head.rotation.z = Math.sin(this.t * 2) * 0.1;
    // Snowball throw with a wind-up (sometimes a rapid triple)
    if (this.throwT > 0) {
      this.throwT -= dt;
      P.armR.rotation.z = -1.6 * (1 - this.throwT / 0.4);
      if (this.throwT <= 0) {
        P.armR.rotation.z = 0;
        const from = V(this.pos.x, this.pos.y + 1.2 * this.scale, this.pos.z);
        g.mobs.shots.lob('snow', from, V(pl.pos.x + pl.vel.x * 0.35, pl.pos.y + 0.8, pl.pos.z + pl.vel.z * 0.35), 12);
        if (this.burst > 0) { this.burst--; this.throwT = 0.25; }
      }
    } else if (hunting && !repel && dist < 18 && dist > 2 && this.cd <= 0) {
      this.throwT = 0.4; this.cd = 1.8 + Math.random() * 1.2;
      this.burst = Math.random() < 0.2 ? 2 : 0;
    }
    this.contactAttack(dist, 2);
  };

  // ---------------------------------------------------------------- yeti
  Mob.prototype.yeti = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P, pl = g.player;
    const enraged = this.hp < this.maxHp / 2;
    if (enraged && !this.enraged) { this.enraged = true; g.ui.toast('🦍 The Yeti goes BERSERK — a blizzard howls!', 'warn'); g.sfx.roar(); g.shake = 1.2; }
    this.punchCd = (this.punchCd ?? 1) - dt; this.throwT = (this.throwT ?? 3) - dt; this.leapT = (this.leapT ?? 6) - dt;
    this.roarT = (this.roarT ?? 8) - dt; this.sumT = (this.sumT ?? 6) - dt;
    this.yaw = Math.atan2(dx, dz);
    P.jaw.scale.y = 1 + Math.abs(Math.sin(this.t * 4)) * 0.8;

    if (this.leaping) {
      this.airT += dt;
      P.armL.rotation.x = P.armR.rotation.x = -3;
      if (this.onGround && this.airT > 0.3) {
        this.leaping = false;
        P.armL.rotation.x = P.armR.rotation.x = 0;
        MV.bossShockwave(g, this.pos.x, this.pos.y, this.pos.z, enraged ? 7.5 : 6.5, 7, SNOW_COLORS);
        g.particles.burst(this.pos.x, this.pos.y + 0.5, this.pos.z, 60, 8, 1, SNOW_COLORS);
      }
    } else if (this.roaring > 0) {
      this.roaring -= dt; this.vel.x = this.vel.z = 0;
      P.armL.rotation.z = -1.2; P.armR.rotation.z = 1.2; P.head.rotation.x = -0.4;
      if (this.roaring <= 0) { P.armL.rotation.z = P.armR.rotation.z = 0; P.head.rotation.x = 0; }
    } else if (this.punch > 0) {
      // Haymaker: wind up, then a crushing blow that launches the player
      this.punch -= dt; this.vel.x = this.vel.z = 0;
      P.armR.rotation.x = -2.8; P.armL.rotation.x = 0.4;
      if (this.punch <= 0) {
        P.armR.rotation.x = -1.3; P.armL.rotation.x = 0;
        g.sfx.boom(); g.shake = Math.max(g.shake || 0, 0.6);
        if (dist < 4.2 && Math.abs(pl.pos.y - this.pos.y) < 4) {
          pl.damage(enraged ? 10 : 8, this.pos);
          const l = dist || 1; pl.vel.x = (dx / l) * 16; pl.vel.z = (dz / l) * 16; pl.vel.y = 9;
          g.particles.burst(pl.pos.x, pl.pos.y + 1, pl.pos.z, 30, 5, 0.6, SNOW_COLORS);
        }
        this.punchCd = enraged ? 1.1 : 1.7;
      }
    } else if (this.throwWind > 0) {
      this.throwWind -= dt; this.vel.x = this.vel.z = 0;
      P.armL.rotation.x = P.armR.rotation.x = -3.1;
      if (this.throwWind <= 0) {
        P.armL.rotation.x = P.armR.rotation.x = -0.5;
        const from = V(this.pos.x, this.pos.y + this.h + 0.5, this.pos.z);
        const n = enraged ? 3 : 1;
        for (let i = 0; i < n; i++) g.mobs.shots.lob('boulder', from, V(pl.pos.x + pl.vel.x * 0.6 + (i - (n - 1) / 2) * 3, pl.pos.y + 0.5, pl.pos.z + pl.vel.z * 0.6), 13);
        this.throwT = enraged ? 3.5 : 5;
      }
    } else {
      this.steer(enraged ? 3.8 : 2.9);
      const sw = Math.sin(this.t * 5);
      P.legL.rotation.x = sw * 0.5; P.legR.rotation.x = -sw * 0.5;
      P.armL.rotation.x = -sw * 0.6; P.armR.rotation.x = sw * 0.6;
      if (Math.abs(sw) > 0.97 && Math.random() < 0.3) g.shake = Math.max(g.shake || 0, 0.15);
      if (dist < 4.5 && this.punchCd <= 0) { this.punch = 0.5; }
      else if (this.roarT <= 0 && dist < 14) {
        this.roarT = enraged ? 9 : 14; this.roaring = 1.1;
        g.sfx.roar(); g.sfx.roar(); g.shake = 1;
        for (let i = 0; i < 80; i++) {
          const a = (i / 80) * Math.PI * 2;
          g.particles.glow.spawn(this.pos.x, this.pos.y + 3, this.pos.z, Math.cos(a) * 14, rnd() * 2, Math.sin(a) * 14, 0.7, 0.9, 1, 1, 0, 1);
        }
        if (g.mode === 'survival') { pl.damage(2, this.pos); pl.slowT = 3; }
        g.ui.toast("🥶 The Yeti's roar chills you to the bone!", 'warn');
      } else if (this.leapT <= 0 && dist > 7 && dist < 24 && this.onGround) {
        this.leapT = enraged ? 5 : 8; this.leaping = true; this.airT = 0;
        const T = 1.1;
        this.vel.set(dx / T, 15, dz / T);
        g.sfx.roar();
      } else if (this.throwT <= 0 && dist > 6 && dist < 30) this.throwWind = 0.8;
    }
    if (enraged) {
      if (this.sumT <= 0) { this.sumT = 12; MV.bossSummonAround(g, 'snowman', this.pos, 2, 6); g.ui.toast('⛄ Snowmen rise from the drifts!', 'warn'); }
      for (let i = 0; i < 6; i++) // blizzard around the player
        g.particles.glow.spawn(pl.pos.x + rnd() * 24, pl.pos.y + 6 + Math.random() * 6, pl.pos.z + rnd() * 24, 5 + Math.random() * 3, -4, 1, 0.85, 0.92, 1, 2, 0, 0);
    }
    if (Math.random() < dt * 10) g.particles.glow.spawn(this.pos.x + rnd() * 2, this.pos.y + Math.random() * this.h, this.pos.z + rnd() * 2, rnd(), 0.5, rnd(), 0.7, 0.9, 1, 1, 0, 0);
    this.contactAttack(dist, 3);
  };

  // ---------------------------------------------------------------- spawning
  MV.SPAWNERS.push((mgr, g) => {
    const p = g.player.pos, t = g.world.terrain(Math.floor(p.x), Math.floor(p.z));
    if (t.peaks < 0.5) return;
    // Snowmen patrol the peaks day and night (more at night)
    if (mgr.count('snowman') < (g.sky.isNight ? 6 : 4) && Math.random() < 0.5) {
      const s = mgr.findSpot(p.x, p.z, 16, 32);
      if (s) {
        const id = g.world.getBlock(Math.floor(s.x), Math.floor(s.y) - 1, Math.floor(s.z));
        if (id === B.SNOW || id === B.STONE) mgr.spawn('snowman', s.x, s.y, s.z);
      }
    }
    // The Yeti stalks the high snowfields
    const high = p.y >= 40 || g.world.getBlock(Math.floor(p.x), Math.floor(p.y) - 1, Math.floor(p.z)) === B.SNOW;
    if (high && !(mgr.timers.yeti > 0) && g.bosses.count('yeti') < MV.MAX_PER_BOSS && Math.random() < 0.03) {
      mgr.timers.yeti = 180;
      g.bosses.queue('yeti');
    }
  });
})();
