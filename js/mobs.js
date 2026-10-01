/* PixieCraft — voxel mobs: Ear-Hat Wanderers, Pixie Lights, Bouncy Tiger critters (friendly)
   and Shadow Beasts (hostile, spawn at night, burn in daylight, avoid wishing wells). */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B;
  const geoCache = {}, matCache = {};
  const pick = a => a[(Math.random() * a.length) | 0];

  function box(parent, w, h, d, color, x, y, z, glow) {
    const gk = `${w},${h},${d}`;
    const g = geoCache[gk] || (geoCache[gk] = new THREE.BoxGeometry(w, h, d));
    const mk = color + (glow ? 'g' : '');
    const m = matCache[mk] || (matCache[mk] = glow ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  // ---------------------------------------------------------------- models
  function buildWanderer() {
    const root = new THREE.Group(), P = {};
    const shirt = pick([0xe63946, 0x4d7cff, 0xff7ad9, 0x7bd66b, 0xffc93c, 0x9b6bff]);
    const shorts = pick([0xd62839, 0x2b59c3, 0x6a3fb5, 0x222244]);
    for (const s of [-1, 1]) {
      const leg = pivot(root, s * 0.13, 0.5, 0);
      box(leg, 0.18, 0.42, 0.2, 0x1b1b1b, 0, -0.21, 0);
      box(leg, 0.24, 0.13, 0.34, 0xffd23f, 0, -0.44, 0.05);
      P[s < 0 ? 'legL' : 'legR'] = leg;
      const arm = pivot(root, s * 0.31, 0.92, 0);
      box(arm, 0.12, 0.36, 0.14, 0x1b1b1b, 0, -0.16, 0);
      box(arm, 0.17, 0.15, 0.19, 0xffffff, 0, -0.38, 0);
      P[s < 0 ? 'armL' : 'armR'] = arm;
    }
    box(root, 0.46, 0.2, 0.3, shorts, 0, 0.56, 0);
    box(root, 0.46, 0.3, 0.28, shirt, 0, 0.8, 0);
    box(root, 0.07, 0.07, 0.02, 0xfff1a8, -0.1, 0.6, 0.16);
    box(root, 0.07, 0.07, 0.02, 0xfff1a8, 0.1, 0.6, 0.16);
    const head = pivot(root, 0, 1.15, 0);
    box(head, 0.46, 0.4, 0.42, 0x1b1b1b, 0, 0, 0);
    box(head, 0.38, 0.26, 0.04, 0xffe0bd, 0, -0.05, 0.215);
    box(head, 0.06, 0.11, 0.02, 0x111111, -0.08, 0.02, 0.24);
    box(head, 0.06, 0.11, 0.02, 0x111111, 0.08, 0.02, 0.24);
    box(head, 0.08, 0.06, 0.04, 0x111111, 0, -0.08, 0.25);
    box(head, 0.32, 0.32, 0.07, 0x1b1b1b, -0.3, 0.3, -0.02);
    box(head, 0.32, 0.32, 0.07, 0x1b1b1b, 0.3, 0.3, -0.02);
    P.head = head;
    return { root, P };
  }

  function buildTiger() {
    const root = new THREE.Group(), P = {};
    const body = pivot(root, 0, 0, 0);
    const O = 0xff9a1f, K = 0x2a1a10, W = 0xfff2d6;
    box(body, 0.5, 0.46, 0.72, O, 0, 0.55, 0);
    box(body, 0.3, 0.06, 0.5, W, 0, 0.32, 0);
    for (const z of [-0.22, 0, 0.22]) box(body, 0.52, 0.12, 0.07, K, 0, 0.74, z);
    for (const x of [-0.16, 0.16]) for (const z of [-0.24, 0.24]) box(body, 0.14, 0.3, 0.14, O, x, 0.2, z);
    const head = pivot(body, 0, 0.92, 0.36);
    box(head, 0.46, 0.4, 0.4, O, 0, 0, 0);
    box(head, 0.28, 0.16, 0.08, W, 0, -0.09, 0.22);
    box(head, 0.1, 0.07, 0.04, 0xff6fa0, 0, -0.03, 0.26);
    box(head, 0.09, 0.1, 0.03, 0xffffff, -0.1, 0.07, 0.205);
    box(head, 0.09, 0.1, 0.03, 0xffffff, 0.1, 0.07, 0.205);
    box(head, 0.05, 0.06, 0.03, 0x111111, -0.1, 0.06, 0.22);
    box(head, 0.05, 0.06, 0.03, 0x111111, 0.1, 0.06, 0.22);
    box(head, 0.12, 0.14, 0.06, O, -0.16, 0.25, 0);
    box(head, 0.12, 0.14, 0.06, O, 0.16, 0.25, 0);
    box(head, 0.2, 0.05, 0.3, K, 0, 0.2, 0);
    const tail = pivot(body, 0, 0.5, -0.38);
    for (let i = 0; i < 7; i++) {
      const a = i * 1.4;
      box(tail, 0.09, 0.09, 0.09, i === 6 ? K : O, Math.cos(a) * 0.08, i * 0.08, -Math.sin(a) * 0.08 - 0.06);
    }
    P.body = body; P.head = head; P.tail = tail;
    return { root, P };
  }

  function buildPixie() {
    const root = new THREE.Group(), P = {};
    const hue = pick([0xfff3a0, 0xffc6f0, 0xb8f4ff, 0xd9c2ff]);
    box(root, 0.12, 0.12, 0.12, hue, 0, 0.15, 0, true);
    box(root, 0.08, 0.08, 0.08, 0xffffff, 0, 0.26, 0, true);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const wg = new THREE.PlaneGeometry(0.28, 0.2);
    for (const s of [-1, 1]) {
      const w = pivot(root, 0, 0.2, -0.03);
      const m = new THREE.Mesh(wg, wingMat); m.position.x = s * 0.15; w.add(m);
      P[s < 0 ? 'wingL' : 'wingR'] = w;
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color: hue, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.scale.set(1.4, 1.4, 1); halo.position.y = 0.18;
    root.add(halo);
    P.halo = halo; P.color = new THREE.Color(hue);
    return { root, P };
  }

  function buildShadow() {
    const root = new THREE.Group(), P = {};
    const D = 0x1b1030, D2 = 0x2a1846, H = 0x4a2a7a;
    box(root, 0.62, 0.5, 1.0, D, 0, 0.78, 0);
    for (const z of [-0.3, 0, 0.3]) box(root, 0.1, 0.2, 0.12, H, 0, 1.1, z);
    const legs = [];
    for (const x of [-0.2, 0.2]) for (const z of [-0.34, 0.34]) {
      const l = pivot(root, x, 0.55, z); box(l, 0.16, 0.55, 0.16, D2, 0, -0.27, 0); legs.push(l);
    }
    const head = pivot(root, 0, 1.0, 0.58);
    box(head, 0.46, 0.42, 0.42, D2, 0, 0, 0);
    box(head, 0.28, 0.18, 0.22, D, 0, -0.1, 0.28);
    box(head, 0.12, 0.07, 0.03, 0xff3df2, -0.12, 0.07, 0.215, true);
    box(head, 0.12, 0.07, 0.03, 0xff3df2, 0.12, 0.07, 0.215, true);
    box(head, 0.06, 0.24, 0.06, H, -0.16, 0.3, -0.05);
    box(head, 0.06, 0.24, 0.06, H, 0.16, 0.3, -0.05);
    const tail = pivot(root, 0, 0.9, -0.5);
    box(tail, 0.1, 0.1, 0.4, D2, 0, 0, -0.2);
    P.legs = legs; P.head = head; P.tail = tail;
    return { root, P };
  }

  const TYPES = {
    wanderer: { build: buildWanderer, w: 0.3, h: 1.45, hp: 10, friendly: true, name: 'Ear-Hat Wanderer' },
    tiger: { build: buildTiger, w: 0.32, h: 1.1, hp: 10, friendly: true, name: 'Bouncy Tiger' },
    pixie: { build: buildPixie, w: 0.2, h: 0.35, hp: 5, friendly: true, flying: true, name: 'Pixie Light' },
    shadow: { build: buildShadow, w: 0.38, h: 1.25, hp: 14, friendly: false, name: 'Shadow Beast' },
  };

  // ---------------------------------------------------------------- mob
  class Mob {
    constructor(game, type, x, y, z, opts) {
      const T = TYPES[type];
      Object.assign(this, opts || {});
      this.id = ++Mob.nextId;
      this.game = game; this.type = type; this.T = T;
      this.pos = new THREE.Vector3(x, y, z); this.vel = new THREE.Vector3();
      this.scale = this.scale || T.scale || 1;
      this.w = T.w * this.scale; this.h = T.h * this.scale;
      this.hp = this.maxHp = this.hp || T.hp;
      this.rise = this.rise || 0;
      this.yaw = Math.random() * Math.PI * 2; this.walk = 0;
      this.t = Math.random() * 10; this.ai = 0; this.flee = 0; this.wait = 0.5; this.cd = 0; this.flash = 0;
      this.phase = Math.random() * Math.PI * 2;
      this.onGround = false; this.hitWall = false; this.dead = false;
      const m = T.build(); this.root = m.root; this.P = m.P;
      game.scene.add(this.root);
      this.sync();
    }

    sync() {
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.yaw;
      const f = this.flash > 0 ? 1 + Math.sin(this.flash * 40) * 0.12 : 1;
      if (this.type !== 'tiger') this.root.scale.setScalar(f * this.scale);
    }

    hurt(dmg, from) {
      const g = this.game;
      if (this.ghost) {   // multiplayer guest: the host owns this creature, so report the hit
        MV.net.sendHit(this, dmg, from);
        if (!this.T.friendly) g.particles.burst(this.pos.x, this.pos.y + this.h * 0.6, this.pos.z, 12, 3, 0.5, [[0.8, 0.3, 1], [1, 0.3, 0.8]]);
        return;
      }
      if (this.rise > 0 || this.dead) return;
      if (this.dormant) { this.awaken(); return; }
      if (this.T.friendly) {
        this.flee = 3; if (this.onGround) this.vel.y = 6;
        g.particles.hearts(this.pos.x, this.pos.y + this.h, this.pos.z);
        return;
      }
      this.hp -= dmg * (this.armorNow || this.T.armor || 1); this.flash = 0.3;
      if (from && !this.T.heavy) {
        const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz) || 1;
        this.vel.x = (dx / l) * 7; this.vel.z = (dz / l) * 7; if (!this.T.flying) this.vel.y = 5; this.stun = 0.35;
      }
      if (this.T.onHurt) this.T.onHurt(this, dmg);
      g.particles.burst(this.pos.x, this.pos.y + this.h * 0.6, this.pos.z, 12, 3, 0.5, [[0.8, 0.3, 1], [1, 0.3, 0.8]]);
      if (this.hp <= 0) this.die(true);
    }

    die(byPlayer) {
      if (this.dead) return;
      this.dead = true; this.killed = !!byPlayer;
      const g = this.game, p = this.pos;
      if (MV.net && MV.net.isHost) MV.net.broadcast({ t: 'die', id: this.id });
      g.particles.burst(p.x, p.y + 0.6 * this.scale, p.z, 50 * this.scale, 5, 1, this.T.deathColors || [[0.8, 0.4, 1], [1, 0.9, 0.5], [0.5, 0.9, 1]]);
      for (let i = 0; i < 12; i++) g.particles.smoke(p.x, p.y, p.z);
      if (this.T.onDeath) this.T.onDeath(this, byPlayer);
      if (byPlayer) g.onEnemyDefeated(this);
    }

    update(dt) {
      const g = this.game, pl = g.player;
      this.t += dt; this.cd -= dt; this.flash = Math.max(0, this.flash - dt); this.stun = Math.max(0, (this.stun || 0) - dt);
      const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
      if (this.rise > 0) {
        // Emerging from the ground: invulnerable, no physics
        this.rise -= dt; this.pos.y += (this.riseSpeed || 1.5) * dt;
        if (Math.random() < 0.8) g.particles.blockBreak(this.pos.x - 1 + Math.random() * 2, this.pos.y + this.h - 0.5, this.pos.z - 1 + Math.random() * 2, this.T.riseColor || '#e2c283');
        this.yaw = Math.atan2(dx, dz); this.sync(); return;
      }
      this[this.type](dt, dx, dz, dist);
      if (this.T.biome && !this.T.flying && !this.dormant) this.leash(dt);
      if (!this.T.flying) {
        const inWater = g.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.3), Math.floor(this.pos.z)) === B.WATER;
        if (inWater && !this.T.sinks) this.vel.y = Math.min(this.vel.y + 30 * dt, 2.5); else this.vel.y -= (inWater ? 10 : 28) * dt;
        MV.moveEntity(g.world, this, dt);
        // Colossal bosses can't path through forests: when stuck, burrow and resurface beside the player
        if (this.T.boss) {
          this.stuckT = this.hitWall ? (this.stuckT || 0) + dt : Math.max(0, (this.stuckT || 0) - dt);
          if (this.stuckT > 2.5) this.burrow();
        }
      }
      this.sync();
    }

    // Keep a creature inside its home biome: it stops at the border instead of chasing beyond it,
    // walks back if knocked outside, and (regular enemies) fades away if stranded there.
    leash(dt) {
      const w = this.game.world, T = this.T, v = this.vel, fl = Math.floor;
      if ((this.leashT = (this.leashT || 0) - dt) <= 0) {
        this.leashT = 0.15;
        this.inBiome = T.biome(w.terrain(fl(this.pos.x), fl(this.pos.z)));
        if (this.inBiome) {
          (this.lastIn || (this.lastIn = new THREE.Vector3())).copy(this.pos); this.outT = 0;
          const sp = Math.hypot(v.x, v.z);
          this.edge = sp > 0.1 && !T.biome(w.terrain(fl(this.pos.x + (v.x / sp) * 2.5), fl(this.pos.z + (v.z / sp) * 2.5)));
        } else {
          this.edge = false; this.outT = (this.outT || 0) + 0.15;
          if (this.outT > 6 && !T.boss) { this.dead = true; this.game.particles.smoke(this.pos.x, this.pos.y, this.pos.z, 8); }
        }
      }
      if (this.stun > 0 || this.leaping || this.stomping) return;
      if (this.edge) { v.x = 0; v.z = 0; }
      else if (this.inBiome === false && this.lastIn) {
        const dx = this.lastIn.x - this.pos.x, dz = this.lastIn.z - this.pos.z, l = Math.hypot(dx, dz) || 1;
        v.x = (dx / l) * 3; v.z = (dz / l) * 3; this.yaw = Math.atan2(dx, dz);
      }
    }

    // Multiplayer guest: follow the host's snapshots with smoothing and a simple walk cycle
    ghostUpdate(dt) {
      this.t += dt; this.flash = Math.max(0, this.flash - dt);
      const before = this.pos.clone();
      this.pos.lerp(this.netPos, Math.min(1, dt * 12));
      let d = this.netYaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 10);
      const sp = Math.min(1, before.distanceTo(this.pos) / Math.max(dt, 1e-3) / 2), sw = Math.sin(this.t * 9) * 0.6 * sp, P = this.P;
      if (P.legL && P.legR) { P.legL.rotation.x = sw; P.legR.rotation.x = -sw; }
      if (Array.isArray(P.legs)) P.legs.forEach((l, i) => (l.rotation.x = i % 2 ? sw : -sw));
      if (this.T.ghostTick) this.T.ghostTick(this);
      this.sync();
    }

    steer(speed) {
      if (this.stun > 0) return;
      this.vel.x = Math.sin(this.yaw) * speed; this.vel.z = Math.cos(this.yaw) * speed;
      if (this.hitWall && this.onGround && speed > 0) this.vel.y = 8.2;
    }

    wanderer(dt, dx, dz, dist) {
      const P = this.P;
      this.ai -= dt;
      if (this.flee > 0) { this.flee -= dt; this.yaw = Math.atan2(-dx, -dz); this.walk = 4; }
      else if (this.ai <= 0) {
        this.ai = 2 + Math.random() * 4;
        if (Math.random() < 0.35) this.walk = 0; else { this.walk = 1.6; this.yaw = Math.random() * Math.PI * 2; }
        if (dist < 7 && Math.random() < 0.6) { this.yaw = Math.atan2(dx, dz); this.walk = dist > 2.5 ? 1.6 : 0; }
      }
      this.steer(this.walk);
      const sw = this.walk > 0 ? Math.sin(this.t * 10) * 0.7 : 0;
      P.legL.rotation.x = sw; P.legR.rotation.x = -sw; P.armL.rotation.x = -sw; P.armR.rotation.x = sw;
      if (dist < 4) {
        P.armR.rotation.z = 2.6 + Math.sin(this.t * 8) * 0.4; // waving hello
        P.head.rotation.y = Math.atan2(dx, dz) - this.yaw;
        if (Math.random() < dt * 1.5) this.game.particles.hearts(this.pos.x, this.pos.y + 1.7, this.pos.z);
      } else { P.armR.rotation.z = 0; P.head.rotation.y *= 0.9; }
    }

    tiger(dt, dx, dz, dist) {
      const P = this.P;
      if (this.flee > 0) this.flee -= dt;
      if (this.onGround) {
        this.vel.x *= 0.8; this.vel.z *= 0.8;
        this.wait -= dt;
        if (this.wait <= 0) {
          this.wait = 0.4 + Math.random() * 1.2;
          if (this.flee > 0) this.yaw = Math.atan2(-dx, -dz);
          else if (dist < 10 && Math.random() < 0.5) this.yaw = Math.atan2(dx, dz) + (Math.random() - 0.5);
          else this.yaw += (Math.random() - 0.5) * 2;
          this.vel.y = 7.5 + Math.random() * 3;
          this.vel.x = Math.sin(this.yaw) * 3.4; this.vel.z = Math.cos(this.yaw) * 3.4;
          this.game.particles.burst(this.pos.x, this.pos.y + 0.1, this.pos.z, 6, 1.5, 0.4);
        }
      }
      const sy = this.onGround ? (this.wait < 0.25 ? 0.72 + this.wait : 1) : 1.18;
      const cur = this.root.scale.y + (sy - this.root.scale.y) * Math.min(1, dt * 14);
      this.root.scale.set(1 / Math.sqrt(cur), cur, 1 / Math.sqrt(cur));
      P.tail.rotation.x = Math.sin(this.t * 9) * 0.4;
      P.tail.rotation.z = Math.cos(this.t * 7) * 0.3;
    }

    pixie(dt, dx, dz, dist) {
      const g = this.game, pl = g.player, P = this.P;
      let tx, ty, tz;
      if (this.flee > 0) { this.flee -= dt; tx = this.pos.x - dx; ty = this.pos.y + 2; tz = this.pos.z - dz; }
      else if (dist < 24) {
        const a = this.t * 0.7 + this.phase;
        tx = pl.pos.x + Math.cos(a) * 2.6; tz = pl.pos.z + Math.sin(a) * 2.6; ty = pl.pos.y + 2.1 + Math.sin(this.t * 2) * 0.4;
      } else {
        if (!this.home) this.home = this.pos.clone();
        tx = this.home.x + Math.cos(this.t * 0.4 + this.phase) * 4; tz = this.home.z + Math.sin(this.t * 0.4) * 4; ty = this.home.y + Math.sin(this.t);
      }
      const vx = (tx - this.pos.x) * 1.5, vy = (ty - this.pos.y) * 1.5, vz = (tz - this.pos.z) * 1.5;
      const l = Math.hypot(vx, vy, vz), k = l > 7 ? 7 / l : 1;
      this.vel.set(vx * k, vy * k, vz * k);
      this.pos.addScaledVector(this.vel, dt);
      if (Math.hypot(this.vel.x, this.vel.z) > 0.3) this.yaw = Math.atan2(this.vel.x, this.vel.z);
      P.wingL.rotation.y = Math.sin(this.t * 30) * 0.8; P.wingR.rotation.y = -Math.sin(this.t * 30) * 0.8;
      P.halo.material.opacity = 0.65 + Math.sin(this.t * 5) * 0.25;
      if (Math.random() < dt * 14) {
        const c = P.color;
        g.particles.glow.spawn(this.pos.x, this.pos.y + 0.15, this.pos.z, (Math.random() - 0.5) * 0.4, -0.6, (Math.random() - 0.5) * 0.4, c.r, c.g, c.b, 1.1, 0.3, 1);
      }
    }

    shadow(dt, dx, dz, dist) {
      const g = this.game, pl = g.player, P = this.P;
      // Burn in daylight
      if (!g.sky.isNight) { this.hp -= 4 * dt; g.particles.smoke(this.pos.x, this.pos.y, this.pos.z, 2); if (this.hp <= 0) return this.die(false); }
      // Light orbs & wishing wells repel shadows
      let repel = null;
      for (const o of g.spells.orbs) if (o.sprite.position.distanceTo(this.pos) < 7) { repel = o.sprite.position; this.hp -= 3 * dt; }
      const safe = g.safeZone;
      if (this.hp <= 0) return this.die(true);
      let speed = 0;
      if (repel) { this.yaw = Math.atan2(this.pos.x - repel.x, this.pos.z - repel.z); speed = 3.5; }
      else if (dist < 26 && !safe && pl.health > 0) { this.yaw = Math.atan2(dx, dz); speed = 3.3; }
      else {
        this.ai -= dt;
        if (this.ai <= 0) { this.ai = 2 + Math.random() * 3; this.walk = Math.random() < 0.5 ? 0 : 1.5; this.yaw = Math.random() * Math.PI * 2; }
        speed = this.walk;
      }
      this.steer(speed);
      const sw = speed > 0 ? Math.sin(this.t * 12) * 0.6 : 0;
      P.legs.forEach((l, i) => (l.rotation.x = i % 2 ? sw : -sw));
      P.tail.rotation.y = Math.sin(this.t * 6) * 0.5;
      if (Math.random() < dt * 6) g.particles.smoke(this.pos.x, this.pos.y + 0.4, this.pos.z);
      const dy = pl.pos.y - this.pos.y;
      if (dist < 1.25 && Math.abs(dy) < 1.8 && this.cd <= 0 && !safe) { this.cd = 1.2; pl.damage(3, this.pos); }
    }

    burrow() {
      const g = this.game, pl = g.player;
      const spot = g.mobs.findSpot(pl.pos.x, pl.pos.z, 5, 9);
      this.stuckT = 0;
      if (!spot || (this.T.biome && !this.T.biome(g.world.terrain(Math.floor(spot.x), Math.floor(spot.z))))) return;
      for (let i = 0; i < 20; i++) g.particles.blockBreak(this.pos.x - 1 + Math.random() * 2, this.pos.y, this.pos.z - 1 + Math.random() * 2, this.T.riseColor || '#e2c283');
      this.pos.set(spot.x, spot.y - this.h, spot.z);
      this.vel.set(0, 0, 0);
      this.rise = 1.5; this.riseSpeed = this.h / 1.5;
      g.ui.toast(`${this.T.name} burrows toward you!`, 'warn');
      g.shake = Math.max(g.shake || 0, 0.6);
    }

    remove() { if (this.T.onRemove) this.T.onRemove(this); this.game.scene.remove(this.root); }
  }

  // ---------------------------------------------------------------- manager
  class MobManager {
    constructor(game) { this.game = game; this.list = []; this.spawnT = 1; this.shots = new MV.Shots(game); this.timers = {}; }

    count(type) { let n = 0; for (const m of this.list) if (m.type === type && !m.dead) n++; return n; }

    // Returns null when the enemy cap is reached — callers must handle that.
    spawn(type, x, y, z, opts) {
      const T = TYPES[type];
      if (!T.friendly && !T.boss && this.minionCount() >= MV.MAX_ENEMIES) return null;
      // Enemies only ever appear inside their home biome
      if (T.biome && !T.biome(this.game.world.terrain(Math.floor(x), Math.floor(z)))) return null;
      if (T.boss && this.count(type) >= MV.MAX_PER_BOSS) return null;
      const m = new Mob(this.game, type, x, y, z, opts); this.list.push(m); return m;
    }

    minionCount() { let n = 0; for (const m of this.list) if (!m.dead && !m.T.friendly && !m.T.boss) n++; return n; }
    hostileCount() { let n = 0; for (const m of this.list) if (!m.dead && !m.T.friendly && !m.dormant) n++; return n; }

    findSpot(cx, cz, minD, maxD) {
      const w = this.game.world;
      for (let tries = 0; tries < 6; tries++) {
        const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD);
        const x = Math.floor(cx + Math.cos(a) * d), z = Math.floor(cz + Math.sin(a) * d);
        const s = w.surfaceY(x, z);
        if (!s || s.id === B.WATER || s.id === B.LEAVES || s.id === B.BLOSSOM || s.y >= MV.CH - 2) continue;
        return new THREE.Vector3(x + 0.5, s.y, z + 0.5);
      }
      return null;
    }

    trySpawn() {
      const g = this.game, p = g.player.pos;
      const well = g.world.nearestWell(p.x, p.z);
      const friendlyCounts = { wanderer: 4, tiger: 3, pixie: 3 };
      for (const type in friendlyCounts) {
        if (this.count(type) >= friendlyCounts[type]) continue;
        // Wishing wells are friendly spawning zones
        const nearWell = well && well.dist < 70 && Math.random() < 0.55;
        const spot = nearWell ? this.findSpot(well.well.x, well.well.z, 4, 10) : this.findSpot(p.x, p.z, 18, 40);
        if (spot) { if (type === 'pixie') spot.y += 2.5; this.spawn(type, spot.x, spot.y, spot.z); }
        break;
      }
      for (const fn of MV.SPAWNERS) fn(this, g);
      if (g.sky.isNight && this.count('shadow') < 6) {
        const spot = this.findSpot(p.x, p.z, 20, 36);
        if (spot) {
          const wn = g.world.nearestWell(spot.x, spot.z);
          if (!wn || wn.dist > 18) this.spawn('shadow', spot.x, spot.y, spot.z);
        }
      }
    }

    update(dt) {
      const net = MV.net, host = net && net.isHost;
      this.shots.update(dt);
      if (net && net.active && !net.isHost) {
        // Guests don't simulate creatures: the host does, and we just display them
        for (const m of this.list) m.ghostUpdate(dt);
        for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead) { this.list[i].remove(); this.list.splice(i, 1); }
        return;
      }
      this.spawnT -= dt;
      for (const k in this.timers) this.timers[k] -= dt;
      if (this.spawnT <= 0) { this.spawnT = 1.2; if (host) net.runAs(net.randomPlayer(), () => this.trySpawn()); else this.trySpawn(); }
      const p = this.game.player.pos;
      for (const m of this.list) {
        // Online, each creature hunts whichever player is nearest to it
        if (host) net.runAs(net.nearestPlayer(m.pos), () => m.update(dt)); else m.update(dt);
        const far = host ? net.nearestDist(m.pos) : Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
        if (far > (m.T.boss ? 220 : 90) || m.pos.y < -30) m.dead = true;
      }
      for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead) { this.list[i].remove(); this.list.splice(i, 1); }
    }

    raycast(o, d, max) {
      let best = null;
      for (const m of this.list) {
        const min = [m.pos.x - m.w, m.pos.y, m.pos.z - m.w], mx = [m.pos.x + m.w, m.pos.y + m.h, m.pos.z + m.w];
        const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
        let t0 = 0, t1 = max, ok = true;
        for (let a = 0; a < 3; a++) {
          if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < min[a] || oo[a] > mx[a]) { ok = false; break; } continue; }
          let ta = (min[a] - oo[a]) / dd[a], tb = (mx[a] - oo[a]) / dd[a];
          if (ta > tb) { const t = ta; ta = tb; tb = t; }
          t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
          if (t0 > t1) { ok = false; break; }
        }
        if (ok && (!best || t0 < best.dist)) best = { mob: m, dist: t0 };
      }
      return best;
    }

    clearHostile() { for (const m of this.list) if (!m.T.friendly) m.dead = true; this.shots.clear(); }
  }

  Mob.nextId = 0;
  // Shared visual/hazard effects (shockwaves, root spikes, tentacles). In multiplayer the host
  // triggers them and every player's game runs the effect against its own local player.
  MV.FX = {};
  MV.fx = (kind, args) => {
    MV.FX[kind](window.game, args);
    if (MV.net && MV.net.isHost) MV.net.broadcast({ t: 'fx', k: kind, a: args });
  };
  MV.SPAWNERS = [];
  MV.MAX_ENEMIES = 15;   // regular enemies alive at once
  MV.MAX_PER_BOSS = 3;   // bosses of each kind alive at once
  MV.MobManager = MobManager;
  MV.MOB_TYPES = TYPES;
  MV.Mob = Mob;
  MV.mobBox = box;
  MV.mobPivot = pivot;
})();
