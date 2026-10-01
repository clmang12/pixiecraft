/* PixieCraft — creatures of the Cursed Cove (ocean biome).
   ☠ Cursed Pirates: skeletal buccaneers in tricorn hats. They walk right along the sea floor,
     slash with cutlasses and (on dry land) fire flintlocks. Under the moon their curse makes
     them twice as hard to hurt — light orbs still burn them.
   🦈 Sharks: patrol the deep, charge swimmers, and circle with their fin cutting the surface.
   🪼 Jellyfish: drifting, glowing stingers that slow you down.
   🎣 Anglerfish: lurk in the dark depths behind a glowing lure, then lunge. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B;
  const box = MV.mobBox, pivot = MV.mobPivot, Mob = MV.Mob, TYPES = MV.MOB_TYPES;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rnd = () => Math.random() - 0.5;
  const SEA = MV.SEA;
  const glowSprite = (color, s, opacity = 0.7) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity }));
    sp.scale.set(s, s, 1); return sp;
  };

  // ---------------------------------------------------------------- models
  function buildPirate() {
    const root = new THREE.Group(), P = {};
    const captain = Math.random() < 0.2;
    const BONE = 0xe8e2cc, PANTS = 0x3a2a1e, BOOT = 0x2a1a10, HAT = 0x1a1a1a, GOLD = 0xffcc40, EYE = 0x7dff6a;
    const VEST = captain ? 0x8b1a1a : [0x2b4a7a, 0x6a2a2a, 0x3a5a3a][(Math.random() * 3) | 0];
    for (const s of [-1, 1]) {
      const leg = pivot(root, s * 0.1, 0.55, 0);
      box(leg, 0.08, 0.5, 0.08, BONE, 0, -0.27, 0);
      box(leg, 0.16, 0.28, 0.16, PANTS, 0, -0.1, 0);
      box(leg, 0.16, 0.14, 0.22, BOOT, 0, -0.48, 0.03);
      P[s < 0 ? 'legL' : 'legR'] = leg;
    }
    box(root, 0.3, 0.1, 0.18, BONE, 0, 0.58, 0);
    box(root, 0.07, 0.42, 0.07, BONE, 0, 0.82, -0.05);
    for (const y of [0.72, 0.82, 0.92]) box(root, 0.3, 0.035, 0.18, BONE, 0, y, 0);
    for (const s of [-1, 1]) box(root, 0.08, 0.44, 0.22, VEST, s * 0.15, 0.82, 0);
    box(root, 0.34, 0.06, 0.22, BOOT, 0, 0.63, 0);
    box(root, 0.07, 0.07, 0.03, GOLD, 0, 0.63, 0.12);
    if (captain) {
      box(root, 0.38, 0.62, 0.04, VEST, 0, 0.72, -0.12);
      box(root, 0.36, 0.06, 0.24, GOLD, 0, 1.04, 0);
    }
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = pivot(root, s * 0.22, 1.0, 0);
      box(arm, 0.07, 0.48, 0.07, BONE, 0, -0.23, 0);
      box(arm, 0.12, 0.12, 0.12, VEST, 0, -0.02, 0);
      arms.push(arm);
    }
    // Cutlass in the right hand, flintlock (maybe) in the left
    const right = arms[1], left = arms[0];
    box(right, 0.12, 0.04, 0.12, GOLD, 0, -0.48, 0.04);
    const blade = box(right, 0.035, 0.1, 0.62, 0xc8ccd4, 0, -0.5, 0.36);
    box(right, 0.02, 0.06, 0.5, 0xffffff, 0.02, -0.47, 0.34);
    const gunner = captain || Math.random() < 0.4;
    if (gunner) {
      box(left, 0.05, 0.1, 0.1, 0x3a2a1e, 0, -0.5, 0.04);
      box(left, 0.04, 0.05, 0.3, 0x555555, 0, -0.46, 0.22);
    }
    const head = pivot(root, 0, 1.2, 0);
    box(head, 0.3, 0.28, 0.3, BONE, 0, 0, 0);
    for (const s of [-1, 1]) {
      box(head, 0.09, 0.08, 0.02, 0x111111, s * 0.07, 0.03, 0.151);
      box(head, 0.04, 0.04, 0.02, EYE, s * 0.07, 0.03, 0.161, true);
    }
    box(head, 0.04, 0.05, 0.02, 0x111111, 0, -0.05, 0.151);
    const jaw = box(head, 0.24, 0.07, 0.26, BONE, 0, -0.17, 0.01);
    for (let i = -2; i <= 2; i++) box(head, 0.03, 0.03, 0.02, 0x333333, i * 0.045, -0.12, 0.151);
    box(head, 0.46, 0.05, 0.46, HAT, 0, 0.18, 0).rotation.y = Math.PI / 4;
    box(head, 0.47, 0.02, 0.47, GOLD, 0, 0.2, 0).rotation.y = Math.PI / 4;
    box(head, 0.3, 0.16, 0.3, HAT, 0, 0.27, 0);
    if (captain) box(head, 0.04, 0.34, 0.1, 0xffffff, 0.12, 0.42, -0.05).rotation.z = -0.4;
    const glow = glowSprite(0x7dff6a, 1.6, 0); glow.position.y = 0.9; root.add(glow);
    Object.assign(P, { arms, head, jaw, blade, gunner, captain, glow });
    return { root, P };
  }

  function buildShark() {
    const root = new THREE.Group(), P = {};
    const G = 0x6f7f8f, W = 0xe6ecf0;
    const body = pivot(root, 0, 0.35, 0);
    box(body, 0.6, 0.55, 1.6, G, 0, 0, 0);
    box(body, 0.5, 0.12, 1.4, W, 0, -0.25, 0.05);
    box(body, 0.46, 0.4, 0.42, G, 0, -0.02, 0.98);
    box(body, 0.36, 0.08, 0.04, 0x2a0a0a, 0, -0.14, 1.2);
    for (let i = -2; i <= 2; i++) box(body, 0.03, 0.05, 0.02, 0xffffff, i * 0.07, -0.11, 1.215);
    for (const s of [-1, 1]) {
      box(body, 0.03, 0.07, 0.07, 0x111111, s * 0.235, 0.06, 1.02);
      box(body, 0.5, 0.05, 0.3, G, s * 0.45, -0.15, 0.3).rotation.z = s * -0.3;
    }
    box(body, 0.08, 0.6, 0.42, G, 0, 0.5, 0.05).rotation.x = -0.35;
    const tail = pivot(body, 0, 0, -0.8);
    box(tail, 0.3, 0.34, 0.5, G, 0, 0, -0.25);
    box(tail, 0.06, 0.85, 0.3, G, 0, 0.12, -0.55);
    Object.assign(P, { body, tail });
    return { root, P };
  }

  function buildJelly() {
    const root = new THREE.Group(), P = {};
    const hue = [0xff7ad9, 0xb48cff, 0x7fe8ff][(Math.random() * 3) | 0];
    const mat = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.55, depthWrite: false });
    const bell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.55), mat);
    bell.position.y = 0.75; root.add(bell);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), mat);
    cap.position.y = 0.97; root.add(cap);
    const tentacles = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, t = pivot(root, Math.cos(a) * 0.18, 0.6, Math.sin(a) * 0.18);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), mat); m.position.y = -0.3; t.add(m);
      tentacles.push(t);
    }
    const glow = glowSprite(hue, 1.6, 0.6); glow.position.y = 0.75; root.add(glow);
    Object.assign(P, { bell, tentacles, glow });
    return { root, P };
  }

  function buildAngler() {
    const root = new THREE.Group(), P = {};
    const D = 0x2a2438, D2 = 0x1a1428;
    const body = pivot(root, 0, 0.4, 0);
    box(body, 0.7, 0.6, 0.72, D, 0, 0, 0);
    const jaw = pivot(body, 0, -0.12, 0.3);
    box(jaw, 0.72, 0.18, 0.36, D2, 0, -0.06, 0.12);
    for (let i = -3; i <= 3; i++) {
      box(jaw, 0.04, 0.12, 0.04, 0xf0f0e0, i * 0.1, 0.06, 0.28);
      box(body, 0.04, 0.1, 0.04, 0xf0f0e0, i * 0.1, -0.05, 0.37);
    }
    for (const s of [-1, 1]) box(body, 0.06, 0.06, 0.02, 0xd8f0ff, s * 0.22, 0.14, 0.365, true);
    box(body, 0.04, 0.5, 0.04, D2, 0, 0.5, 0.2).rotation.x = 0.5;
    box(body, 0.04, 0.04, 0.3, D2, 0, 0.72, 0.42);
    const lure = box(body, 0.12, 0.12, 0.12, 0xffe27a, 0, 0.66, 0.58, true);
    const glow = glowSprite(0xffe27a, 1.8, 0.8); glow.position.set(0, 0.66, 0.58); body.add(glow);
    const tail = pivot(body, 0, 0, -0.36);
    box(tail, 0.06, 0.5, 0.4, D, 0, 0, -0.2);
    Object.assign(P, { body, jaw, lure, glow, tail });
    return { root, P };
  }

  // ---------------------------------------------------------------- types
  const WATER_COLORS = [[0.5, 0.8, 1], [0.8, 0.95, 1], [0.3, 0.6, 1]];
  Object.assign(TYPES, {
    pirate: {
      build: buildPirate, w: 0.28, h: 1.55, hp: 14, friendly: false, sinks: true, name: 'Cursed Pirate',
      deathColors: [[0.5, 1, 0.5], [1, 0.85, 0.3], [0.9, 0.9, 0.8]],
      onDeath: (m, by) => {
        if (!by || m.game.mode !== 'survival') return;
        m.game.inv.add(B.GOLD_ORE, m.P.captain ? 3 : 1);
        if (Math.random() < (m.P.captain ? 0.6 : 0.1)) m.game.inv.add(B.GOLD, 1);
        m.game.ui.refreshHotbar();
      },
    },
    shark: { build: buildShark, w: 0.4, h: 0.75, hp: 18, friendly: false, flying: true, swims: true, name: 'Shark', deathColors: WATER_COLORS },
    jelly: { build: buildJelly, w: 0.3, h: 1.0, hp: 6, friendly: false, flying: true, swims: true, name: 'Jellyfish', deathColors: [[1, 0.5, 0.9], [0.7, 0.6, 1], [1, 1, 1]] },
    angler: { build: buildAngler, w: 0.38, h: 0.85, hp: 14, friendly: false, flying: true, swims: true, name: 'Anglerfish', deathColors: [[1, 0.9, 0.4], [0.4, 0.3, 0.6]] },
  });
  // Big sea creatures sometimes drop a crystal
  TYPES.shark.onDeath = TYPES.angler.onDeath = (m, by) => { if (by && m.game.mode === 'survival' && Math.random() < 0.5) { m.game.inv.add(B.CRYSTAL, 1); m.game.ui.refreshHotbar(); } };

  // ---------------------------------------------------------------- swimming
  // Swimmers can move through water and through underwater plants (kelp, seagrass)
  const isWater = (w, x, y, z) => { const id = w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); return id === B.WATER || (MV.BLOCKS[id].cross && y <= SEA + 1); };

  // Steer toward a target while never leaving the water
  Mob.prototype.swimTo = function (dt, tx, ty, tz, speed, turn) {
    const w = this.game.world, c = this.h / 2;
    const want = V(tx - this.pos.x, ty - (this.pos.y + c), tz - this.pos.z);
    if (want.lengthSq() > 1e-4) want.setLength(speed); else want.set(0, 0, 0);
    this.vel.lerp(want, Math.min(1, dt * turn));
    const nx = this.pos.x + this.vel.x * dt, ny = this.pos.y + this.vel.y * dt, nz = this.pos.z + this.vel.z * dt;
    // Sea creatures never leave the Cursed Cove (no wandering up rivers into forest lakes)
    if (this.T.biome && !this.T.biome(w.terrain(Math.floor(nx), Math.floor(nz)))) { this.vel.multiplyScalar(-0.3); this.blocked = true; }
    else if (isWater(w, nx, ny + c, nz)) { this.pos.set(nx, ny, nz); this.blocked = false; }
    else if (isWater(w, nx, this.pos.y + c, nz)) { this.pos.x = nx; this.pos.z = nz; this.vel.y = 0; this.blocked = false; }
    else { this.vel.multiplyScalar(-0.3); this.blocked = true; }
    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (hv > 0.2) {
      let d = Math.atan2(this.vel.x, this.vel.z) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 6);
    }
    this.root.rotation.x = -Math.atan2(this.vel.y, Math.max(hv, 0.5)) * 0.6;
    // Beached (water was mined away)? flop and fade
    if (!isWater(w, this.pos.x, this.pos.y + c, this.pos.z)) { this.pos.y -= dt * 3; this.hp -= dt * 4; if (this.hp <= 0) this.die(false); }
  };

  Mob.prototype.wanderSwim = function (dt, speed) {
    this.ai -= dt;
    if (this.ai <= 0 || this.blocked || !this.goal) {
      this.ai = 3 + Math.random() * 4;
      if (!this.home) this.home = this.pos.clone();
      this.goal = V(this.home.x + rnd() * 20, Math.min(SEA - 0.5, this.pos.y + rnd() * 4), this.home.z + rnd() * 20);
    }
    this.swimTo(dt, this.goal.x, this.goal.y, this.goal.z, speed, 2);
  };

  const playerCenter = pl => V(pl.pos.x, pl.pos.y + 0.9, pl.pos.z);
  const playerInSea = pl => pl.inWater || pl.headInWater;

  Mob.prototype.shark = function (dt) {
    const g = this.game, pl = g.player, P = this.P, c = playerCenter(pl);
    const me = V(this.pos.x, this.pos.y + this.h / 2, this.pos.z), d = me.distanceTo(c);
    this.retreat = Math.max(0, (this.retreat || 0) - dt);
    if (playerInSea(pl) && d < 22 && !g.safeZone && pl.health > 0 && !this.retreat) {
      this.swimTo(dt, c.x, c.y, c.z, 7.5, 3);                           // charge!
      if (d < 1.9 && this.cd <= 0) { this.cd = 1.3; this.retreat = 1.2; pl.damage(4, this.pos); g.sfx.chomp(); g.particles.burst(c.x, c.y, c.z, 14, 3, 0.5, [[1, 0.3, 0.3], [0.8, 0.9, 1]]); }
    } else if (Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z) < 24 && !this.retreat) {
      // Circle near the surface — only the fin shows
      this.orbit = (this.orbit || Math.random() * 6) + dt * 0.5;
      this.swimTo(dt, pl.pos.x + Math.cos(this.orbit) * 7, SEA + 0.9 - this.h / 2, pl.pos.z + Math.sin(this.orbit) * 7, 4, 1.5);
    } else this.wanderSwim(dt, 3);
    P.tail.rotation.y = Math.sin(this.t * 8) * 0.5;
    if (this.pos.y + this.h > SEA + 0.6 && Math.random() < dt * 8) g.particles.glow.spawn(this.pos.x, SEA + 0.95, this.pos.z, rnd(), 0.5, rnd(), 0.8, 0.9, 1, 0.5, 2, 1);
  };

  Mob.prototype.jelly = function (dt) {
    const g = this.game, pl = g.player, P = this.P;
    this.pulse = (this.pulse || Math.random() * 6) + dt;
    const up = Math.max(0, Math.sin(this.pulse * 2)) * 1.4 - 0.35;
    this.ai -= dt;
    if (this.ai <= 0 || this.blocked) { this.ai = 4 + Math.random() * 4; this.drift = V(rnd() * 0.8, 0, rnd() * 0.8); }
    this.swimTo(dt, this.pos.x + (this.drift ? this.drift.x : 0), this.pos.y + this.h / 2 + up, this.pos.z + (this.drift ? this.drift.z : 0), 0.9, 3);
    this.root.rotation.x = 0;
    P.bell.scale.set(1 + Math.sin(this.pulse * 2) * 0.15, 1 - Math.sin(this.pulse * 2) * 0.15, 1 + Math.sin(this.pulse * 2) * 0.15);
    P.tentacles.forEach((t, i) => { t.rotation.x = Math.sin(this.t * 2 + i) * 0.4; t.rotation.z = Math.cos(this.t * 1.7 + i) * 0.4; });
    P.glow.material.opacity = (g.sky.isNight ? 0.9 : 0.5) * (0.7 + Math.sin(this.pulse * 2) * 0.3);
    const c = playerCenter(pl), me = V(this.pos.x, this.pos.y + 0.6, this.pos.z);
    if (me.distanceTo(c) < 1.2 && this.cd <= 0) {
      this.cd = 1.5; pl.damage(2, this.pos);
      if (g.mode === 'survival') { if (!pl.slowT) g.ui.toast('⚡ Stung by a jellyfish!', 'warn'); pl.slowT = 2; }
    }
  };

  Mob.prototype.angler = function (dt) {
    const g = this.game, pl = g.player, P = this.P, c = playerCenter(pl);
    const me = V(this.pos.x, this.pos.y + this.h / 2, this.pos.z), d = me.distanceTo(c);
    this.lunge = Math.max(0, (this.lunge || 0) - dt); this.rest = Math.max(0, (this.rest || 0) - dt);
    if (this.lunge > 0) {
      this.swimTo(dt, c.x, c.y, c.z, 10, 6);
      P.jaw.rotation.x = 0.7;
      if (d < 1.4 && this.cd <= 0) { this.cd = 1.5; this.lunge = 0; this.rest = 2.5; pl.damage(5, this.pos); g.sfx.chomp(); }
      if (this.lunge <= 0) this.rest = 2;
    } else if (playerInSea(pl) && d < 8 && !this.rest && !g.safeZone && pl.health > 0) {
      this.lunge = 0.9; g.sfx.chomp();
    } else {
      // Lurk: hover, turn toward the player, dangle the lure
      if (d < 16) { this.swimTo(dt, me.x, me.y, me.z, 0.3, 2); this.yaw = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z); }
      else this.wanderSwim(dt, 1.2);
      P.jaw.rotation.x = Math.abs(Math.sin(this.t * 1.5)) * 0.25;
    }
    P.lure.position.y = 0.66 + Math.sin(this.t * 3) * 0.05;
    P.glow.position.y = P.lure.position.y;
    P.glow.material.opacity = 0.6 + Math.sin(this.t * 4) * 0.3;
    P.tail.rotation.y = Math.sin(this.t * 6) * 0.4;
  };

  // ---------------------------------------------------------------- pirates
  Mob.prototype.pirate = function (dt, dx, dz, dist) {
    const g = this.game, pl = g.player, P = this.P;
    const night = g.sky.isNight;
    this.armorNow = night ? 0.5 : 1; // cursed by moonlight
    P.glow.material.opacity = night ? 0.45 + Math.sin(this.t * 3) * 0.15 : 0;
    const repel = this.orbRepel(dt * 2);   // light burns through the curse
    if (this.hp <= 0) return this.die(true);
    const underwater = g.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 1.2), Math.floor(this.pos.z)) === B.WATER;
    const hunting = dist < 26 && !g.safeZone && pl.health > 0;
    let speed = 0;
    this.swing = Math.max(0, (this.swing || 0) - dt);
    if (repel) { this.yaw = Math.atan2(this.pos.x - repel.x, this.pos.z - repel.z); speed = 3; }
    else if (hunting) {
      this.yaw = Math.atan2(dx, dz);
      speed = underwater ? 1.9 : 2.9;
      // Gunners stop to take aim (powder's too wet underwater!)
      if (P.gunner && !underwater && dist > 5 && dist < 17) {
        speed = 0.5;
        if (this.aim > 0) {
          this.aim -= dt; P.arms[0].rotation.x = -1.5;
          if (this.aim <= 0) {
            const hand = V(this.pos.x + Math.sin(this.yaw) * 0.5, this.pos.y + 1.05, this.pos.z + Math.cos(this.yaw) * 0.5);
            g.mobs.shots.aim('bullet', hand, playerCenter(pl), 30);
            g.sfx.gunshot();
            for (let i = 0; i < 6; i++) g.particles.smoke(hand.x, hand.y - 0.5, hand.z);
            this.cd = 3 + Math.random() * 1.5;
          }
        } else if (this.cd <= 0) this.aim = 0.6;
      }
      if (dist < 2 && !this.swing && this.cd <= 0.5) this.swing = 0.35;
    } else {
      this.ai -= dt;
      if (this.ai <= 0) { this.ai = 3 + Math.random() * 3; this.walk = Math.random() < 0.4 ? 0 : 1.4; this.yaw = Math.random() * Math.PI * 2; }
      speed = this.walk;
    }
    this.steer(speed);
    const sw = speed > 0.6 ? Math.sin(this.t * (underwater ? 5 : 9)) : 0;
    P.legL.rotation.x = sw * 0.6; P.legR.rotation.x = -sw * 0.6;
    if (!(this.aim > 0)) P.arms[0].rotation.x = -sw * 0.5;
    P.arms[1].rotation.x = this.swing > 0 ? -2.2 + (0.35 - this.swing) * 8 : sw * 0.5 - 0.4;
    P.jaw.position.y = -0.17 - Math.abs(Math.sin(this.t * 7)) * 0.04;
    if (underwater && Math.random() < dt * 3) g.particles.glow.spawn(this.pos.x, this.pos.y + 1.4, this.pos.z, 0, 1.2, 0, 0.7, 0.9, 1, 1, -0.5, 0);
    if (dist < 12 && Math.random() < dt * 0.15) g.sfx.groan();
    this.contactAttack(dist, P.captain ? 5 : 4);
  };

  // ---------------------------------------------------------------- spawning
  // Find the sea floor (or island ground) under a column
  function seaSpot(w, x, z) {
    x = Math.floor(x); z = Math.floor(z);
    if (!w.getChunk(Math.floor(x / MV.CS), Math.floor(z / MV.CS))) return null;
    for (let y = MV.CH - 1; y > 1; y--) {
      const id = w.getBlock(x, y, z);
      if (!id || id === B.WATER || MV.BLOCKS[id].cross) continue;
      if (!MV.BLOCKS[id].solid || id === B.LEAVES) return null;
      return { x: x + 0.5, y: y + 1, z: z + 0.5, depth: Math.max(0, SEA - y) };
    }
    return null;
  }

  MV.SPAWNERS.push((mgr, g) => {
    const p = g.player.pos, w = g.world, t = w.terrain(Math.floor(p.x), Math.floor(p.z));
    if (t.ocean < 0.5) return;
    const ring = (min, max) => { const a = Math.random() * Math.PI * 2, d = min + Math.random() * (max - min); return seaSpot(w, p.x + Math.cos(a) * d, p.z + Math.sin(a) * d); };
    // Cursed pirates: roam the sea floor and islands, and guard shipwrecks
    if (mgr.count('pirate') < (g.sky.isNight ? 8 : 5) && Math.random() < 0.5) {
      const wreck = w.nearestWreck(p.x, p.z, 50);
      const s = wreck && Math.random() < 0.6 ? seaSpot(w, wreck.x + rnd() * 10, wreck.z + rnd() * 10) : ring(16, 34);
      if (s && Math.hypot(s.x - p.x, s.z - p.z) > 10) mgr.spawn('pirate', s.x, s.y, s.z);
    }
    // Sea creatures in open water
    if (Math.random() < 0.6) {
      const s = ring(12, 32);
      if (!s || s.depth < 3) return;
      const type = mgr.count('shark') < 3 && Math.random() < 0.4 ? 'shark'
        : mgr.count('angler') < 2 && s.depth >= 7 && Math.random() < 0.35 ? 'angler'
        : mgr.count('jelly') < 6 ? 'jelly' : null;
      if (!type) return;
      const h = TYPES[type].h;
      const y = s.y + 0.2 + Math.random() * Math.max(0, s.depth - h - 1.2);
      mgr.spawn(type, s.x, y, s.z);
    }
  });

  // ================================================================ 🐙 THE KRAKEN (boss)
  // A colossal squid that surfaces beside you. Tentacles burst from the water and slam down,
  // it spits blinding ink, and its whirlpool drags swimmers toward its beak.
  function buildKraken() {
    const root = new THREE.Group(), P = {};
    const C = 0x8a2440, C2 = 0x5e1630, SPOT = 0xc85a78, EYE = 0xffe14a;
    const body = pivot(root, 0, 0, 0);
    box(body, 2.0, 2.2, 2.0, C2, 0, 1.1, 0);
    box(body, 2.4, 1.2, 2.4, C, 0, 2.9, 0);
    box(body, 2.1, 1.0, 2.1, C, 0, 4.0, 0);
    box(body, 1.5, 0.8, 1.5, C, 0, 4.9, 0);
    box(body, 0.9, 0.6, 0.9, C2, 0, 5.6, 0);
    for (const s of [-1, 1]) {
      box(body, 0.3, 0.9, 1.1, C2, s * 1.15, 4.8, -0.2);
      box(body, 0.75, 0.62, 0.06, EYE, s * 0.66, 2.95, 1.21, true);
      box(body, 0.16, 0.52, 0.04, 0x111111, s * 0.66, 2.95, 1.25);
      box(body, 0.9, 0.16, 0.12, C2, s * 0.66, 3.36, 1.24).rotation.z = s * 0.3;
    }
    box(body, 0.5, 0.4, 0.3, 0x2a1a10, 0, 2.1, 1.1);
    [[0.6, 4.2, 1.06], [-0.5, 3.8, 1.06], [1.06, 4.0, 0.3], [-1.06, 4.3, -0.4], [0.2, 5.0, 0.76], [-0.3, 4.6, -1.06]].forEach(([x, y, z]) => box(body, 0.26, 0.26, 0.04 + Math.abs(x) * 0.02, SPOT, x, y, z));
    const arms = [];
    for (let i = 0; i < 8; i++) {
      const a = pivot(body, 0, 1.0, 0); a.rotation.y = (i / 8) * Math.PI * 2;
      box(a, 0.36, 0.36, 1.6, C, 0, 0, 1.6);
      box(a, 0.22, 0.22, 0.9, SPOT, 0, 0, 2.8);
      arms.push(a);
    }
    const glow = glowSprite(0xff4070, 9, 0.35); glow.position.y = 3; root.add(glow);
    Object.assign(P, { body, arms, glow });
    return { root, P };
  }

  function makeTentacle(g, x, z) {
    const grp = new THREE.Group(), segs = [];
    let parent = grp;
    for (let i = 0; i < 6; i++) {
      const pv = pivot(parent, 0, i === 0 ? 0 : 1.0, 0), w = 0.72 - i * 0.09;
      box(pv, w, 1.0, w, i % 2 ? 0x8a2440 : 0x741c38, 0, 0.5, 0);
      box(pv, w * 0.5, 0.22, 0.06, 0xe8a0b8, 0, 0.5, w / 2 + 0.02);
      segs.push(pv); parent = pv;
    }
    grp.position.set(x, SEA - 6.5, z);
    g.scene.add(grp);
    return { grp, segs, x, z, t: 0, hit: false, yaw: 0 };
  }

  function updateTentacle(g, T, dt) {
    const pl = g.player; T.t += dt;
    const t = T.t, top = SEA - 0.8, low = SEA - 6.5;
    if (t < 1) {            // telegraph: bubbling water
      for (let i = 0; i < 2; i++) g.particles.glow.spawn(T.x + rnd() * 1.6, SEA + 0.9, T.z + rnd() * 1.6, rnd(), 1.5, rnd(), 0.8, 0.95, 1, 0.5, 0, 1);
    } else if (t < 1.7) T.grp.position.y = low + ((t - 1) / 0.7) * (top - low);
    else if (t < 2.7) {     // sway and take aim
      T.yaw = Math.atan2(pl.pos.x - T.x, pl.pos.z - T.z);
      T.grp.rotation.y = T.yaw;
      T.segs.forEach((s, i) => (s.rotation.x = Math.sin(t * 4 + i) * 0.14 - 0.06));
    } else if (t < 3.0) { const k = (t - 2.7) / 0.3; T.segs.forEach(s => (s.rotation.x = k * 0.3)); }
    else if (!T.hit) {      // SLAM
      T.hit = true;
      const dx = Math.sin(T.yaw), dz = Math.cos(T.yaw), reach = 5.4;
      const px = pl.pos.x - T.x, pz = pl.pos.z - T.z;
      const along = Math.max(0, Math.min(reach, px * dx + pz * dz));
      const off = Math.hypot(px - dx * along, pz - dz * along);
      for (let a = 0.5; a < reach; a += 0.6) g.particles.burst(T.x + dx * a, SEA + 1, T.z + dz * a, 8, 4, 0.6, WATER_COLORS);
      g.sfx.boom(); g.sfx.splash(); g.shake = Math.max(g.shake || 0, 0.5);
      if (off < 1.7 && pl.pos.y > SEA - 3 && pl.pos.y < SEA + 5) {
        pl.damage(6, V(T.x, pl.pos.y, T.z));
        pl.vel.x += dx * 6; pl.vel.z += dz * 6; pl.vel.y = 6;
      }
    } else if (t > 3.9) T.grp.position.y -= dt * 7;
    // Divers aren't safe either: brushing against a raised tentacle underwater crushes you
    if (t > 1.2 && t < 3.9 && pl.pos.y < SEA - 1 && Math.hypot(pl.pos.x - T.x, pl.pos.z - T.z) < 1.4) pl.damage(4, V(T.x, pl.pos.y, T.z));
    if (t > 4.8) { g.scene.remove(T.grp); return false; }
    return true;
  }

  MV.FX.tentacle = (g, a) => { const T = makeTentacle(g, a[0], a[1]); g.bosses.hazards.push({ update: dt => updateTentacle(g, T, dt), remove: () => g.scene.remove(T.grp) }); };

  function krakenSpot(g) {
    const p = g.player.pos, w = g.world;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * 7;
      const s = seaSpot(w, p.x + Math.cos(a) * d, p.z + Math.sin(a) * d);
      if (s && s.depth >= 5) return s;
    }
    return null;
  }

  TYPES.kraken = {
    build: buildKraken, w: 1.2, h: 5.6, hp: 280, friendly: false, boss: true, heavy: true, flying: true, swims: true,
    name: 'The Kraken', deathColors: [[1, 0.3, 0.5], [0.5, 0.8, 1], [1, 1, 1]],
    spawnBoss: g => { const s = krakenSpot(g); return s ? g.mobs.spawn('kraken', s.x, SEA - 7, s.z) : null; },
    onRemove: m => { for (const T of m.tent || []) m.game.scene.remove(T.grp); m.tent = []; },
  };

  Mob.prototype.kraken = function (dt) {
    const g = this.game, pl = g.player, P = this.P, w = g.world;
    const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    const enraged = this.hp < this.maxHp / 2;
    if (enraged && !this.enraged) {
      this.enraged = true; g.ui.toast('🐙 The Kraken thrashes in fury — the blood in the water draws sharks!', 'warn'); g.sfx.roar(); g.shake = 1.2;
      for (let i = 0; i < 2; i++) { const s = krakenSpot(g); if (s) g.mobs.spawn('shark', s.x, SEA - 3, s.z); }
    }
    this.tent = this.tent || [];
    this.tentT = (this.tentT ?? 2.5) - dt; this.inkT = (this.inkT ?? 4) - dt; this.pullT = (this.pullT ?? 8) - dt;

    // Hold station ~9 blocks from the player, head above the waves, always glaring at them
    const l = d || 1;
    this.swimTo(dt, pl.pos.x - (dx / l) * 9, SEA + 0.8, pl.pos.z - (dz / l) * 9, enraged ? 4.5 : 3.2, 1.5);
    this.root.rotation.x = 0;
    this.yaw = Math.atan2(dx, dz);
    P.body.position.y = Math.sin(this.t * 1.5) * 0.25;
    P.arms.forEach((a, i) => { a.rotation.x = 0.5 + Math.sin(this.t * 2 + i) * 0.3; });
    P.glow.material.opacity = enraged ? 0.55 + Math.sin(this.t * 6) * 0.15 : 0.3;

    // Tentacle slams
    if (this.tentT <= 0 && d < 40) {
      this.tentT = enraged ? 3.2 : 5;
      const n = enraged ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const spread = i === 0 ? 3 : 9;
        for (let tries = 0; tries < 6; tries++) {
          const x = pl.pos.x + pl.vel.x * 0.8 + rnd() * spread, z = pl.pos.z + pl.vel.z * 0.8 + rnd() * spread;
          const s = seaSpot(w, x, z);
          if (s && s.depth >= 2 && Math.hypot(x - pl.pos.x, z - pl.pos.z) > 1.5) { MV.fx('tentacle', [s.x, s.z]); break; }
        }
      }
    }

    // Blinding ink
    if (this.inkT <= 0 && d < 36) {
      this.inkT = enraged ? 3 : 5;
      const from = V(this.pos.x + Math.sin(this.yaw) * 1.3, this.pos.y + 2.6, this.pos.z + Math.cos(this.yaw) * 1.3), n = enraged ? 3 : 1;
      for (let i = 0; i < n; i++) g.mobs.shots.lob('ink', from, V(pl.pos.x + pl.vel.x * 0.5 + (i - (n - 1) / 2) * 3, pl.pos.y + 0.8, pl.pos.z + pl.vel.z * 0.5), 13);
      g.sfx.splash();
    }

    // Whirlpool: drags swimmers toward the beak
    if (this.pullT <= 0 && playerInSea(pl) && d < 26) { this.pullT = enraged ? 9 : 13; this.pull = 3.5; g.ui.toast('🌀 The Kraken\'s whirlpool drags you in — swim away!', 'warn'); }
    if (this.pull > 0) {
      this.pull -= dt;
      if (playerInSea(pl)) { pl.vel.x -= (dx / l) * 16 * dt; pl.vel.z -= (dz / l) * 16 * dt; }
      for (let i = 0; i < 4; i++) {
        const a = this.t * 3 + i * 1.57, r = 2 + ((this.t * 2 + i) % 6);
        g.particles.glow.spawn(this.pos.x + Math.cos(a) * r, SEA + 0.95, this.pos.z + Math.sin(a) * r, -Math.sin(a) * 3, 0, Math.cos(a) * 3, 0.7, 0.9, 1, 0.5, 0, 0);
      }
    }

    // Beak bite at point-blank range
    if (d < 2.6 && Math.abs(pl.pos.y - (this.pos.y + 2)) < 3.5 && this.cd <= 0) { this.cd = 1.5; pl.damage(6, this.pos); g.sfx.chomp(); }
  };

  MV.BOSS_INFO.kraken = {
    minion: 'pirate', need: 10, warn: '🐙 The sea boils and churns… THE KRAKEN rises from the deep!',
    reward: [[B.CRYSTAL, 12], [B.GOLD, 12], [B.TREASURE, 2], [MV.ITEM.PEARL, 1]],
    where: g => !!krakenSpot(g), whereMsg: '🌊 The Kraken needs deep water — stand at the edge of the open sea.',
  };
  MV.BOSS_RELICS[MV.ITEM.PEARL] = 'kraken';

  // Random encounter while swimming the open ocean
  MV.SPAWNERS.push((mgr, g) => {
    const pl = g.player;
    if (mgr.timers.kraken > 0 || !playerInSea(pl) || Math.random() > 0.02) return;
    if (g.world.terrain(Math.floor(pl.pos.x), Math.floor(pl.pos.z)).ocean < 0.7) return;
    if (g.bosses.count('kraken') < MV.MAX_PER_BOSS && krakenSpot(g)) { mgr.timers.kraken = 240; g.bosses.queue('kraken'); }
  });
})();
