/* PixieCraft — peaceful animals. Each lives in its own biome and never harms anyone.
   Right-click (or tap 🧱) an animal to pet it: hearts, a happy sound and a little magic.
     🌲 Enchanted Forest: bunnies, deer, butterflies (by day) and fireflies (at night)
     ✿ Pixie Meadow:      cloud lambs, bunnies, butterflies / fireflies
     ☀ Sunsand Dunes:     camels          ❄ Crystal Peaks: penguins
     🏴‍☠️ Cursed Cove:       dolphins that leap from the waves, and sea turtles */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, Mob = MV.Mob, TYPES = MV.MOB_TYPES;
  const box = (...a) => MV.mobBox(...a), pivot = (...a) => MV.mobPivot(...a);
  const rnd = () => Math.random() - 0.5;
  const pickV = (m, list) => list[((m && m.variant) || 0) % list.length];
  const SEA = MV.SEA;

  // Four legs on pivots at the given half-width / half-length / hip height
  function legs(root, hw, hl, hip, len, thick, color) {
    const out = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const l = pivot(root, sx * hw, hip, sz * hl);
      box(l, thick, len, thick, color, 0, -len / 2, 0);
      out.push(l);
    }
    return out;
  }

  // ---------------------------------------------------------------- models
  function buildBunny(m) {
    const root = new THREE.Group(), P = {};
    const fur = pickV(m, [0xf4f0ea, 0xb08a64, 0x8a8a92, 0xe6c9a0]);
    const body = pivot(root, 0, 0, 0);
    box(body, 0.3, 0.26, 0.42, fur, 0, 0.24, -0.02);
    box(body, 0.12, 0.12, 0.08, 0xffffff, 0, 0.3, -0.26);                 // cotton tail
    const head = pivot(body, 0, 0.42, 0.2);
    box(head, 0.24, 0.22, 0.22, fur, 0, 0, 0);
    for (const s of [-1, 1]) {
      box(head, 0.06, 0.28, 0.05, fur, s * 0.07, 0.24, -0.04);
      box(head, 0.03, 0.2, 0.02, 0xffb3c8, s * 0.07, 0.24, -0.01);
      box(head, 0.04, 0.05, 0.02, 0x222222, s * 0.08, 0.03, 0.115);
    }
    box(head, 0.05, 0.04, 0.02, 0xff7a9a, 0, -0.04, 0.12);
    P.legs = legs(body, 0.1, 0.13, 0.12, 0.12, 0.08, fur);
    Object.assign(P, { body, head });
    return { root, P };
  }

  function buildDeer(m) {
    const root = new THREE.Group(), P = {}, C = 0x9a6a3e, buck = ((m && m.variant) || 0) % 3 === 0;
    const body = pivot(root, 0, 0, 0);
    box(body, 0.42, 0.42, 0.9, C, 0, 0.82, 0);
    box(body, 0.32, 0.1, 0.7, 0xf4e8d4, 0, 0.62, 0);
    for (const [x, z] of [[0.1, 0.2], [-0.12, -0.05], [0.08, -0.25], [-0.06, 0.3]]) box(body, 0.06, 0.02, 0.06, 0xf8f0e0, x, 1.035, z);
    box(body, 0.12, 0.14, 0.06, 0xffffff, 0, 0.92, -0.47);
    const neck = pivot(body, 0, 0.98, 0.38);
    box(neck, 0.18, 0.4, 0.18, C, 0, 0.16, 0.06);
    const head = pivot(neck, 0, 0.4, 0.12);
    box(head, 0.22, 0.22, 0.32, C, 0, 0, 0.06);
    box(head, 0.12, 0.1, 0.06, 0x2a1a10, 0, -0.04, 0.24);
    for (const s of [-1, 1]) {
      box(head, 0.04, 0.05, 0.02, 0x111111, s * 0.1, 0.04, 0.12);
      box(head, 0.06, 0.14, 0.04, C, s * 0.13, 0.16, -0.04).rotation.z = s * -0.5;
      if (buck) { box(head, 0.04, 0.24, 0.04, 0xd8c8a8, s * 0.08, 0.26, 0); box(head, 0.14, 0.04, 0.04, 0xd8c8a8, s * 0.13, 0.32, 0); }
    }
    P.legs = legs(body, 0.15, 0.32, 0.62, 0.62, 0.1, 0x8a5a32);
    Object.assign(P, { body, head: neck });
    return { root, P };
  }

  function buildLamb(m) {
    const root = new THREE.Group(), P = {};
    const wool = pickV(m, [0xfbfbff, 0xffd6ec, 0xd9ccff, 0xc8f4e0, 0xfff1b8]);
    const body = pivot(root, 0, 0, 0);
    box(body, 0.6, 0.48, 0.76, wool, 0, 0.6, 0);
    for (const [x, y, z] of [[0.18, 0.86, 0.2], [-0.16, 0.86, -0.18], [0, 0.88, 0], [0.2, 0.7, -0.3], [-0.22, 0.72, 0.28]]) box(body, 0.2, 0.14, 0.2, wool, x, y, z);
    const head = pivot(body, 0, 0.7, 0.42);
    box(head, 0.28, 0.26, 0.26, 0x3a2a2a, 0, 0, 0.06);
    box(head, 0.3, 0.12, 0.24, wool, 0, 0.14, 0.02);
    for (const s of [-1, 1]) { box(head, 0.12, 0.05, 0.08, 0x3a2a2a, s * 0.19, 0.02, 0.02); box(head, 0.04, 0.04, 0.02, 0xffffff, s * 0.07, 0.03, 0.195); }
    P.legs = legs(body, 0.18, 0.24, 0.38, 0.38, 0.1, 0x3a2a2a);
    Object.assign(P, { body, head });
    return { root, P };
  }

  function buildCamel() {
    const root = new THREE.Group(), P = {}, C = 0xd2a868;
    const body = pivot(root, 0, 0, 0);
    box(body, 0.5, 0.5, 1.1, C, 0, 1.15, 0);
    box(body, 0.36, 0.34, 0.36, C, 0, 1.52, -0.18);                        // hump
    box(body, 0.3, 0.2, 0.3, C, 0, 1.75, -0.18);
    box(body, 0.42, 0.06, 0.5, 0xc0392b, 0, 1.42, 0.16);                    // saddle blanket
    box(body, 0.44, 0.03, 0.52, 0xffcc40, 0, 1.4, 0.16);
    const neck = pivot(body, 0, 1.25, 0.5);
    box(neck, 0.2, 0.62, 0.2, C, 0, 0.26, 0.12).rotation.x = 0.35;
    const head = pivot(neck, 0, 0.6, 0.3);
    box(head, 0.22, 0.2, 0.4, C, 0, 0, 0.1);
    for (const s of [-1, 1]) { box(head, 0.04, 0.04, 0.02, 0x111111, s * 0.1, 0.05, 0.12); box(head, 0.05, 0.08, 0.04, C, s * 0.09, 0.14, -0.06); }
    box(head, 0.14, 0.04, 0.02, 0x5a3a22, 0, -0.06, 0.305);
    P.legs = legs(body, 0.17, 0.4, 0.92, 0.92, 0.12, 0xb88c50);
    Object.assign(P, { body, head: neck });
    return { root, P };
  }

  function buildPenguin() {
    const root = new THREE.Group(), P = {};
    const body = pivot(root, 0, 0, 0);
    box(body, 0.36, 0.5, 0.3, 0x1e2230, 0, 0.36, 0);
    box(body, 0.26, 0.4, 0.04, 0xf8f8ff, 0, 0.34, 0.15);
    const head = pivot(body, 0, 0.7, 0);
    box(head, 0.28, 0.24, 0.26, 0x1e2230, 0, 0, 0);
    box(head, 0.2, 0.12, 0.02, 0xf8f8ff, 0, -0.01, 0.13);
    for (const s of [-1, 1]) box(head, 0.04, 0.04, 0.02, 0x111111, s * 0.06, 0.04, 0.14);
    box(head, 0.08, 0.05, 0.12, 0xff9a1f, 0, -0.02, 0.18);
    P.flippers = [-1, 1].map(s => { const f = pivot(body, s * 0.19, 0.52, 0); box(f, 0.05, 0.3, 0.16, 0x1e2230, 0, -0.14, 0); return f; });
    for (const s of [-1, 1]) box(root, 0.12, 0.04, 0.16, 0xff9a1f, s * 0.08, 0.02, 0.06);
    Object.assign(P, { body, head });
    return { root, P };
  }

  function buildDolphin() {
    const root = new THREE.Group(), P = {}, C = 0x6f8fb0;
    const body = pivot(root, 0, 0.3, 0);
    box(body, 0.42, 0.4, 1.3, C, 0, 0, 0);
    box(body, 0.32, 0.12, 1.1, 0xe6eef4, 0, -0.17, 0.05);
    box(body, 0.3, 0.26, 0.3, C, 0, -0.02, 0.78);
    box(body, 0.14, 0.1, 0.3, 0xa8bcd0, 0, -0.06, 1.0);                     // beak
    for (const s of [-1, 1]) { box(body, 0.03, 0.05, 0.05, 0x111111, s * 0.16, 0.04, 0.82); box(body, 0.32, 0.04, 0.2, C, s * 0.3, -0.12, 0.28).rotation.z = s * -0.4; }
    box(body, 0.06, 0.3, 0.26, C, 0, 0.3, 0.02).rotation.x = -0.4;
    const tail = pivot(body, 0, 0, -0.65);
    box(tail, 0.24, 0.2, 0.36, C, 0, 0, -0.16);
    box(tail, 0.6, 0.05, 0.22, C, 0, 0, -0.38);
    Object.assign(P, { body, tail });
    return { root, P };
  }

  function buildTurtle() {
    const root = new THREE.Group(), P = {};
    const body = pivot(root, 0, 0.2, 0);
    box(body, 0.7, 0.22, 0.8, 0x3d7a4a, 0, 0.06, 0);
    box(body, 0.5, 0.14, 0.6, 0x5a9a5e, 0, 0.22, 0);
    for (const [x, z] of [[0, 0], [0.16, 0.18], [-0.16, 0.18], [0.16, -0.18], [-0.16, -0.18]]) box(body, 0.14, 0.02, 0.14, 0x7ab87a, x, 0.3, z);
    box(body, 0.6, 0.06, 0.7, 0xe8d8a0, 0, -0.07, 0);
    const head = pivot(body, 0, 0.04, 0.46);
    box(head, 0.2, 0.16, 0.24, 0x8ab070, 0, 0, 0.08);
    for (const s of [-1, 1]) box(head, 0.03, 0.04, 0.02, 0x111111, s * 0.08, 0.04, 0.17);
    P.flippers = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const f = pivot(body, sx * 0.36, 0, sz * 0.26);
      box(f, 0.34, 0.05, sz > 0 ? 0.2 : 0.14, 0x8ab070, sx * 0.14, 0, 0);
      P.flippers.push(f);
    }
    Object.assign(P, { body, head });
    return { root, P };
  }

  function buildButterfly(m) {
    const root = new THREE.Group(), P = {};
    const night = ((m && m.variant) || 0) >= 100;   // variant 100+ = firefly (synced to other players)
    const col = night ? 0xfff38a : pickV(m, [0xff7ad9, 0x8fe7ff, 0xffc93c, 0xb48cff, 0xff8c28]);
    box(root, 0.03, 0.03, 0.12, 0x2a1a10, 0, 0.1, 0);
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: night ? 0.35 : 0.9, side: THREE.DoubleSide, depthWrite: false });
    for (const s of [-1, 1]) {
      const w = pivot(root, 0, 0.1, 0);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.14), mat);
      plane.rotation.x = -Math.PI / 2; plane.position.x = s * 0.08; w.add(plane);
      P[s < 0 ? 'wingL' : 'wingR'] = w;
    }
    if (night) {   // fireflies glow
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color: 0xfff38a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      glow.scale.set(0.7, 0.7, 1); glow.position.y = 0.1; root.add(glow); P.glow = glow;
    }
    return { root, P };
  }

  // ---------------------------------------------------------------- types & biomes
  const inForest = t => t.forest > 0.5, inMeadow = t => t.meadow > 0.5;
  const ANIMALS = {
    bunny: { build: buildBunny, w: 0.2, h: 0.55, walk: 2.6, run: 6, hop: true, biome: inForest, name: 'Bunny', pet: '🐰 The bunny wiggles its nose happily' },
    deer: { build: buildDeer, w: 0.3, h: 1.5, walk: 1.6, run: 6.5, biome: t => t.forest > 0.5 && t.meadow < 0.5, name: 'Deer', pet: '🦌 The deer nuzzles your hand' },
    lamb: { build: buildLamb, w: 0.32, h: 1.0, walk: 1.2, run: 4, biome: inMeadow, name: 'Cloud Lamb', pet: '🐑 The cloud lamb says "baa!"' },
    camel: { build: buildCamel, w: 0.35, h: 2.0, walk: 1.3, run: 3.5, biome: t => t.dunes > 0.5, name: 'Camel', pet: '🐫 The camel blinks its long eyelashes at you' },
    penguin: { build: buildPenguin, w: 0.2, h: 0.85, walk: 1.0, run: 2.8, waddle: true, biome: t => t.peaks > 0.5, name: 'Penguin', pet: '🐧 The penguin flaps its flippers excitedly' },
    dolphin: { build: buildDolphin, w: 0.35, h: 0.6, swim: true, biome: t => t.ocean > 0.5, name: 'Dolphin', pet: '🐬 The dolphin clicks and chirps with joy' },
    turtle: { build: buildTurtle, w: 0.35, h: 0.45, swim: true, biome: t => t.ocean > 0.5, name: 'Sea Turtle', pet: '🐢 The sea turtle blinks slowly at you' },
    butterfly: { build: buildButterfly, w: 0.12, h: 0.2, fly: true, biome: t => t.forest > 0.5, name: 'Butterfly', pet: '🦋 It lands on your finger for a moment' },
  };
  for (const [type, A] of Object.entries(ANIMALS)) {
    TYPES[type] = { build: A.build, w: A.w, h: A.h, hp: 10, friendly: true, animal: true, flying: !!(A.swim || A.fly), biome: A.biome, name: A.name, ghostTick: m => animate(m, 0.016, 0.5) };
  }
  MV.ANIMALS = ANIMALS;

  // ---------------------------------------------------------------- behaviour
  function animate(m, dt, speed) {
    const P = m.P, sw = Math.sin(m.t * 9) * 0.6 * Math.min(1, speed);
    if (P.legs) P.legs.forEach((l, i) => (l.rotation.x = (i === 0 || i === 3) ? sw : -sw));
    if (P.flippers) P.flippers.forEach((f, i) => (f.rotation.z = Math.sin(m.t * (m.type === 'turtle' ? 3 : 8) + i) * 0.4));
    if (P.wingL) { const f = Math.sin(m.t * 30) * 0.9; P.wingL.rotation.z = f; P.wingR.rotation.z = -f; }
    if (P.tail) P.tail.rotation.x = Math.sin(m.t * 6) * 0.3;
    if (m.type === 'penguin') m.root.rotation.z = Math.sin(m.t * 8) * 0.12 * Math.min(1, speed);
    if (P.glow) P.glow.material.opacity = 0.5 + Math.sin(m.t * 4 + m.phase) * 0.45;
  }

  function walker(dt, dx, dz) {
    const A = ANIMALS[this.type];
    let speed;
    if (this.flee > 0) { this.flee -= dt; this.yaw = Math.atan2(-dx, -dz); speed = A.run; this.graze = false; }
    else {
      this.ai -= dt;
      if (this.ai <= 0) {
        this.ai = 2 + Math.random() * 4;
        this.graze = Math.random() < 0.45;
        this.walk = this.graze ? 0 : A.walk * (0.7 + Math.random() * 0.5);
        if (!this.graze) this.yaw += rnd() * 2.2;
      }
      speed = this.walk;
    }
    this.steer(speed);
    if (A.hop && speed > 0 && this.onGround) this.vel.y = 4.2;   // bunnies bound along
    animate(this, dt, speed / 2);
    if (this.P.head) this.P.head.rotation.x += ((this.graze ? 0.7 : 0) - this.P.head.rotation.x) * Math.min(1, dt * 5);
  }
  for (const t of ['bunny', 'deer', 'lamb', 'camel', 'penguin']) Mob.prototype[t] = walker;

  Mob.prototype.dolphin = function (dt) {
    const g = this.game;
    if (this.leap) {   // a leap out of the waves
      this.vel.y -= 16 * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.root.rotation.x = -Math.atan2(this.vel.y, Math.hypot(this.vel.x, this.vel.z));
      if (this.pos.y < SEA - 0.4 && this.vel.y < 0) {
        this.leap = false; this.vel.multiplyScalar(0.5);
        g.particles.burst(this.pos.x, SEA + 0.9, this.pos.z, 20, 3, 0.6, [[0.6, 0.85, 1], [1, 1, 1]]);
      }
    } else {
      this.wanderSwim(dt, this.flee > 0 ? 6 : 3.5);
      if (this.flee > 0) this.flee -= dt;
      if (this.pos.y > SEA - 2.5 && Math.random() < dt * 0.3) {
        this.leap = true;
        const hv = Math.max(4, Math.hypot(this.vel.x, this.vel.z));
        this.vel.set(Math.sin(this.yaw) * hv, 8, Math.cos(this.yaw) * hv);
        g.particles.burst(this.pos.x, SEA + 0.9, this.pos.z, 16, 3, 0.6, [[0.6, 0.85, 1], [1, 1, 1]]);
      }
      if (this.goal) this.goal.y = Math.max(this.goal.y, SEA - 2.5);   // dolphins like to stay near the surface
    }
    animate(this, dt, 1);
  };

  Mob.prototype.turtle = function (dt) {
    this.wanderSwim(dt, this.flee > 0 ? 2.5 : 1.2);
    if (this.flee > 0) this.flee -= dt;
    animate(this, dt, 1);
  };

  Mob.prototype.butterfly = function (dt) {
    const g = this.game, night = g.sky.isNight;
    if (night !== (this.variant >= 100)) { this.dead = true; return; }   // butterflies by day, fireflies by night
    if (!this.home) this.home = this.pos.clone();
    this.ai -= dt;
    if (this.ai <= 0 || !this.goal) {
      this.ai = 1 + Math.random() * 2;
      this.goal = new THREE.Vector3(this.home.x + rnd() * 10, this.home.y + 0.5 + Math.random() * 2.5, this.home.z + rnd() * 10);
    }
    const d = this.goal.clone().sub(this.pos);
    if (d.length() > 0.1) d.setLength(Math.min(d.length(), 1.6));
    this.vel.lerp(d, Math.min(1, dt * 2));
    this.pos.addScaledVector(this.vel, dt);
    this.pos.y += Math.sin(this.t * 7 + this.phase) * dt * 0.6;
    if (Math.hypot(this.vel.x, this.vel.z) > 0.1) this.yaw = Math.atan2(this.vel.x, this.vel.z);
    animate(this, dt, 1);
  };

  // ---------------------------------------------------------------- petting
  MV.petAnimal = function (g, mob) {
    const A = ANIMALS[mob.type];
    g.particles.hearts(mob.pos.x, mob.pos.y + mob.h + 0.2, mob.pos.z);
    g.particles.hearts(mob.pos.x, mob.pos.y + mob.h + 0.4, mob.pos.z);
    g.sfx.chirp();
    if (mob.flee) mob.flee = 0;
    const now = performance.now();
    if (!mob.petAt || now - mob.petAt > 20000) {   // a little magic, once every 20 s per animal
      mob.petAt = now;
      g.player.magic = Math.min(g.player.maxMagic, g.player.magic + 5);
      g.ui.toast(`${A.pet} (+5 magic)`);
    }
  };

  // ---------------------------------------------------------------- spawning
  function waterSpot(w, x, z) {
    x = Math.floor(x); z = Math.floor(z);
    if (!w.getChunk(Math.floor(x / MV.CS), Math.floor(z / MV.CS))) return null;
    let y = SEA;
    while (y > 1 && (w.getBlock(x, y, z) === B.WATER || MV.BLOCKS[w.getBlock(x, y, z)].cross)) y--;
    return SEA - y >= 4 ? { x: x + 0.5, z: z + 0.5, floor: y + 1 } : null;
  }

  MV.SPAWNERS.push((mgr, g) => {
    if (Math.random() > 0.5) return;
    const p = g.player.pos, t = g.world.terrain(Math.floor(p.x), Math.floor(p.z)), night = g.sky.isNight;
    const wants = [];
    if (t.forest > 0.5) { wants.push(['bunny', 4]); wants.push(['butterfly', night ? 6 : 5]); if (t.meadow < 0.5) wants.push(['deer', 3]); else wants.push(['lamb', 4]); }
    if (t.dunes > 0.5) wants.push(['camel', 3]);
    if (t.peaks > 0.5) wants.push(['penguin', 5]);
    if (t.ocean > 0.5) { wants.push(['dolphin', 3]); wants.push(['turtle', 2]); }
    const open = wants.filter(([type, cap]) => mgr.count(type) < cap);
    if (!open.length) return;
    const [type] = open[(Math.random() * open.length) | 0];
    const variant = (Math.random() * 12) | 0;
    if (ANIMALS[type].swim) {
      const a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 20, s = waterSpot(g.world, p.x + Math.cos(a) * d, p.z + Math.sin(a) * d);
      if (s) mgr.spawn(type, s.x, s.floor + 0.5 + Math.random() * (SEA - s.floor - 2), s.z, { variant });
      return;
    }
    const s = mgr.findSpot(p.x, p.z, 14, 34);
    if (!s) return;
    if (type === 'butterfly') { mgr.spawn(type, s.x, s.y + 1, s.z, { variant: night ? 100 + variant : variant }); return; }
    // herd animals come in little groups
    const n = type === 'bunny' ? 1 : 1 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n && mgr.count(type) < 6; i++) mgr.spawn(type, s.x + rnd() * 3, s.y, s.z + rnd() * 3, { variant: variant + i });
  });
})();
