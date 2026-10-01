/* PixieCraft — extra enemies and enemy projectiles.
   Sand Beasts: bandaged mummies of the Sunsand Dunes, day and night; their touch slows you.
   Marching Mops: enchanted mops that march in columns lobbing buckets of water,
   and split in two when struck down (up to twice). */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B;
  const box = MV.mobBox, pivot = MV.mobPivot, Mob = MV.Mob, TYPES = MV.MOB_TYPES;
  const rnd = () => Math.random() - 0.5;

  // ---------------------------------------------------------------- projectiles
  const SHOT_KINDS = {
    water: { color: 0x5ab8ff, size: 0.9, grav: 16, dmg: 2, drain: 8, knock: 6, life: 3, parts: [[0.4, 0.75, 1], [0.8, 0.95, 1]] },
    sand: { color: 0xf0cf80, size: 1.3, grav: 16, dmg: 4, slow: 1.5, knock: 5, life: 3, parts: [[1, 0.85, 0.5], [0.9, 0.7, 0.35]] },
    leaf: { color: 0x7dff6a, size: 1.0, grav: 0, dmg: 3, knock: 4, life: 4, homing: 0.5, parts: [[0.4, 1, 0.4], [0.8, 1, 0.5], [1, 0.6, 0.85]] },
    snow: { color: 0xffffff, size: 0.8, grav: 16, dmg: 2, slow: 1.2, knock: 4, life: 3, parts: [[1, 1, 1], [0.8, 0.92, 1]] },
    boulder: { color: 0xbfe8ff, size: 2.8, grav: 14, dmg: 7, slow: 1.5, knock: 9, life: 4, parts: [[0.8, 0.95, 1], [1, 1, 1], [0.6, 0.8, 1]] },
    bullet: { color: 0xfff0b0, size: 0.4, grav: 0, dmg: 3, knock: 3, life: 1.2, parts: [[0.55, 0.55, 0.6], [1, 0.9, 0.6]] },
    ink: { color: 0x7a3ad0, size: 1.5, grav: 14, dmg: 3, blind: 3.5, knock: 4, life: 4, parts: [[0.25, 0.1, 0.4], [0.5, 0.2, 0.8]] },
    fire: { color: 0xd040ff, size: 2.0, grav: 0, dmg: 5, knock: 7, life: 5, homing: 1.1, parts: [[0.85, 0.3, 1], [1, 0.4, 0.8], [0.5, 0.2, 1]] },
  };

  class Shots {
    constructor(game) { this.game = game; this.list = []; }

    fire(kind, from, vel, remote) {
      const net = MV.net;
      if (net && net.active) {
        if (net.isHost) net.broadcast({ t: 'shot', k: kind, f: from.toArray(), v: vel.toArray() });
        else if (!remote) return;
      }
      const K = SHOT_KINDS[kind];
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color: K.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      s.scale.set(K.size, K.size, 1);
      s.position.copy(from);
      this.game.scene.add(s);
      this.list.push({ K, kind, sprite: s, vel: vel.clone(), life: K.life });
    }

    // Ballistic lob that lands on the target after `speed`-determined flight time
    lob(kind, from, target, speed = 11) {
      const K = SHOT_KINDS[kind];
      const d = target.clone().sub(from), flat = Math.hypot(d.x, d.z);
      const T = Math.max(0.35, flat / speed);
      this.fire(kind, from, new THREE.Vector3(d.x / T, (d.y + 0.5 * K.grav * T * T) / T, d.z / T));
    }

    aim(kind, from, target, speed) {
      this.fire(kind, from, target.clone().sub(from).normalize().multiplyScalar(speed));
    }

    burst(p, K, n = 24) {
      const g = this.game;
      g.particles.burst(p.x, p.y, p.z, n, 4, 0.7, K.parts);
      for (let i = 0; i < 8; i++) {
        const c = K.parts[0];
        g.particles.solid.spawn(p.x + rnd(), p.y + rnd(), p.z + rnd(), rnd() * 5, Math.random() * 4, rnd() * 5, c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0.6, 14, 1);
      }
    }

    update(dt) {
      const g = this.game, w = g.world, pl = g.player;
      const pc = new THREE.Vector3(pl.pos.x, pl.pos.y + 0.9, pl.pos.z);
      for (let i = this.list.length - 1; i >= 0; i--) {
        const s = this.list[i], K = s.K, p = s.sprite.position;
        if (K.homing) {
          const want = pc.clone().sub(p).normalize().multiplyScalar(s.vel.length());
          s.vel.lerp(want, Math.min(1, K.homing * dt));
        }
        s.vel.y -= K.grav * dt;
        p.addScaledVector(s.vel, dt);
        s.life -= dt;
        s.sprite.material.rotation += dt * 6;
        const c = K.parts[(Math.random() * K.parts.length) | 0];
        g.particles.glow.spawn(p.x + rnd() * 0.3, p.y + rnd() * 0.3, p.z + rnd() * 0.3, rnd(), rnd(), rnd(), c[0], c[1], c[2], 0.5, 0, 1);
        let hit = false;
        if (p.distanceTo(pc) < K.size * 0.45 + 0.6) {
          hit = true;
          pl.damage(K.dmg, p);
          if (g.mode === 'survival') {
            if (K.drain) pl.magic = Math.max(0, pl.magic - K.drain);
            if (K.slow && s.kind === 'snow' && !pl.slowT) g.ui.toast('🥶 Brr! Chilled — slowed', 'warn');
            if (K.slow) pl.slowT = Math.max(pl.slowT || 0, K.slow);
            if (K.blind) { if (!pl.blindT) g.ui.toast('🐙 Inked! You can barely see!', 'warn'); pl.blindT = K.blind; }
          }
          if (g.mode === 'creative') { const l = Math.hypot(s.vel.x, s.vel.z) || 1; pl.vel.x += (s.vel.x / l) * K.knock * 0.4; pl.vel.z += (s.vel.z / l) * K.knock * 0.4; }
        } else {
          const id = w.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
          if (id && MV.BLOCKS[id].solid) hit = true;
        }
        if (hit || s.life <= 0) {
          this.burst(p, K);
          if (s.kind === 'water') g.sfx.splash(); else g.sfx.pop();
          g.scene.remove(s.sprite);
          this.list.splice(i, 1);
        }
      }
    }

    clear() { for (const s of this.list) this.game.scene.remove(s.sprite); this.list.length = 0; }
  }
  MV.Shots = Shots;

  // ---------------------------------------------------------------- models
  function buildMummy(gold) {
    const root = new THREE.Group(), P = {};
    const W = 0xe9dfc4, S = 0xbfae88;
    for (const s of [-1, 1]) {
      const leg = pivot(root, s * 0.13, 0.55, 0);
      box(leg, 0.18, 0.55, 0.2, W, 0, -0.27, 0);
      box(leg, 0.2, 0.05, 0.22, S, 0, -0.15, 0);
      box(leg, 0.2, 0.05, 0.22, S, 0, -0.4, 0);
      P[s < 0 ? 'legL' : 'legR'] = leg;
      const arm = pivot(root, s * 0.31, 1.08, 0);
      box(arm, 0.14, 0.5, 0.16, W, 0, -0.22, 0);
      box(arm, 0.16, 0.05, 0.18, S, 0, -0.1, 0);
      box(arm, 0.16, 0.05, 0.18, S, 0, -0.35, 0);
      P[s < 0 ? 'armL' : 'armR'] = arm;
    }
    box(root, 0.46, 0.6, 0.28, W, 0, 0.85, 0);
    for (const y of [0.62, 0.76, 0.92, 1.06]) box(root, 0.48, 0.05, 0.3, S, 0, y, 0).rotation.z = (y * 7) % 0.3 - 0.15;
    box(root, 0.06, 0.34, 0.02, S, 0.12, 0.45, -0.15);
    box(root, 0.06, 0.26, 0.02, S, -0.1, 0.48, 0.15);
    const head = pivot(root, 0, 1.36, 0);
    box(head, 0.4, 0.4, 0.4, W, 0, 0, 0);
    box(head, 0.42, 0.05, 0.42, S, 0, 0.12, 0);
    box(head, 0.42, 0.05, 0.42, S, 0, -0.12, 0);
    box(head, 0.3, 0.08, 0.02, 0x1a1208, 0, 0.03, 0.205);
    box(head, 0.07, 0.05, 0.02, gold ? 0xff4040 : 0x9dff5a, -0.08, 0.03, 0.215, true);
    box(head, 0.07, 0.05, 0.02, gold ? 0xff4040 : 0x9dff5a, 0.08, 0.03, 0.215, true);
    P.head = head;
    if (gold) {
      // Pharaoh's striped headdress, collar and scarab belt
      const G = 0xffcc40, BL = 0x2b59c3;
      box(head, 0.46, 0.2, 0.36, G, 0, 0.14, -0.05);
      for (const y of [0.08, 0.2]) box(head, 0.47, 0.04, 0.37, BL, 0, y, -0.05);
      for (const sx of [-1, 1]) {
        box(head, 0.1, 0.45, 0.22, G, sx * 0.25, -0.12, 0.02);
        box(head, 0.11, 0.04, 0.23, BL, sx * 0.25, -0.05, 0.02);
        box(head, 0.11, 0.04, 0.23, BL, sx * 0.25, -0.2, 0.02);
      }
      box(head, 0.08, 0.1, 0.06, G, 0, 0.26, 0.19);
      box(root, 0.52, 0.12, 0.34, G, 0, 1.12, 0);
      box(root, 0.5, 0.08, 0.32, BL, 0, 0.62, 0);
      box(root, 0.1, 0.1, 0.04, 0x40d0ff, 0, 0.62, 0.17, true);
    }
    return { root, P };
  }

  function buildMop(king) {
    const root = new THREE.Group(), P = {};
    const WOOD = 0x8a5a3c, CLOTH = 0xd8d2c0, IRON = 0x8d8fa6, WATER = 0x4ea2ff;
    const body = pivot(root, 0, 0, 0);
    box(body, 0.1, 1.4, 0.1, WOOD, 0, 1.0, 0);
    box(body, 0.3, 0.12, 0.3, 0x6d6f88, 0, 0.34, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const m = box(body, 0.07, 0.36, 0.07, CLOTH, Math.cos(a) * 0.15, 0.14, Math.sin(a) * 0.15);
      m.rotation.z = Math.cos(a) * 0.3; m.rotation.x = -Math.sin(a) * 0.3;
    }
    for (const s of [-1, 1]) {
      const arm = pivot(body, s * 0.05, 1.2, 0);
      box(arm, 0.42, 0.05, 0.05, WOOD, s * 0.21, 0, 0);
      const bucket = pivot(arm, s * 0.42, -0.02, 0);
      box(bucket, 0.02, 0.14, 0.02, 0x444444, 0, -0.07, 0);
      box(bucket, 0.26, 0.26, 0.26, IRON, 0, -0.27, 0);
      box(bucket, 0.28, 0.04, 0.28, 0x6d6f88, 0, -0.16, 0);
      box(bucket, 0.22, 0.02, 0.22, WATER, 0, -0.14, 0, true);
      P[s < 0 ? 'armL' : 'armR'] = arm;
      P[s < 0 ? 'bucketL' : 'bucketR'] = bucket;
    }
    if (king) {
      const G = 0xffcc40;
      box(body, 0.34, 0.1, 0.34, G, 0, 1.75, 0);
      for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) box(body, 0.07, 0.14, 0.07, G, x, 1.86, z);
      box(body, 0.07, 0.07, 0.02, 0xff3d6e, 0, 1.76, 0.18, true);
      box(body, 0.16, 0.5, 0.16, 0x5a2d82, 0, 0.75, 0);
    }
    P.body = body;
    return { root, P };
  }

  // ---------------------------------------------------------------- types
  function dropLoot(m, list) {
    const g = m.game;
    if (g.mode !== 'survival') return;
    for (const [id, n, chance] of list) if (Math.random() < (chance == null ? 1 : chance)) g.inv.add(id, n);
    g.ui.refreshHotbar();
  }

  Object.assign(TYPES, {
    mummy: {
      build: () => buildMummy(false), w: 0.3, h: 1.65, hp: 16, friendly: false, name: 'Sand Beast',
      deathColors: [[1, 0.85, 0.5], [0.9, 0.95, 0.6], [1, 1, 0.8]],
      onDeath: (m, by) => by && dropLoot(m, [[B.SAND, 2], [B.GOLD_ORE, 1, 0.25]]),
    },
    mop: {
      build: () => buildMop(false), w: 0.3, h: 1.75, hp: 12, friendly: false, name: 'Marching Mop',
      deathColors: [[0.4, 0.75, 1], [0.9, 0.9, 1], [0.6, 0.5, 0.3]],
      onDeath: (m, by) => {
        if (by) dropLoot(m, [[B.PLANKS, 1], [MV.ITEM.DUST, 1, 0.2]]);
        // Chop a mop and you get two more!
        const gen = m.gen || 0;
        if (gen < 2) {
          m.game.ui.toast(gen === 0 ? '🪣 The mop splits in two!' : '🪣 …and splits again!', 'warn');
          for (const s of [-1, 1]) {
            const c = m.game.mobs.spawn('mop', m.pos.x + s * 0.6, m.pos.y + 0.3, m.pos.z, { gen: gen + 1, scale: m.scale * 0.78, hp: Math.round(12 * Math.pow(0.6, gen + 1)) });
            if (c) { c.vel.set(s * 3, 5, 0); c.cd = 1 + Math.random(); }
          }
        }
      },
    },
  });

  // ---------------------------------------------------------------- behaviours
  // Shared hostile helpers
  Mob.prototype.orbRepel = function (dt) {
    for (const o of this.game.spells.orbs)
      if (o.sprite.position.distanceTo(this.pos) < 7) { this.hp -= 3 * dt; return o.sprite.position; }
    return null;
  };
  Mob.prototype.contactAttack = function (dist, dmg, extra) {
    const pl = this.game.player, dy = pl.pos.y - this.pos.y;
    if (dist < this.w + 0.9 && Math.abs(dy) < this.h && this.cd <= 0 && (this.T.boss || !this.game.safeZone)) {
      this.cd = 1.2; pl.damage(dmg, this.pos); if (extra) extra(pl); return true;
    }
    return false;
  };

  Mob.prototype.mummy = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P;
    const repel = this.orbRepel(dt);
    if (this.hp <= 0) return this.die(true);
    let speed = 0;
    if (repel) { this.yaw = Math.atan2(this.pos.x - repel.x, this.pos.z - repel.z); speed = 2.8; }
    else if (dist < 24 && !g.safeZone && g.player.health > 0) { this.yaw = Math.atan2(dx, dz); speed = g.sky.isNight ? 2.8 : 2.2; }
    else {
      this.ai -= dt;
      if (this.ai <= 0) { this.ai = 3 + Math.random() * 3; this.walk = Math.random() < 0.5 ? 0 : 1.2; this.yaw = Math.random() * Math.PI * 2; }
      speed = this.walk;
    }
    this.steer(speed);
    // Stiff shamble: arms reaching forward, body swaying, short dragging steps
    const sw = speed > 0 ? Math.sin(this.t * 5) : 0;
    P.legL.rotation.x = sw * 0.35; P.legR.rotation.x = -sw * 0.35;
    P.armL.rotation.x = -1.45 + Math.sin(this.t * 3) * 0.08; P.armR.rotation.x = -1.45 + Math.cos(this.t * 3.3) * 0.08;
    this.root.rotation.z = sw * 0.08;
    P.head.rotation.z = Math.sin(this.t * 1.7) * 0.15;
    if (speed > 0 && Math.random() < dt * 4) g.particles.solid.spawn(this.pos.x + rnd() * 0.5, this.pos.y + 0.1, this.pos.z + rnd() * 0.5, rnd(), 0.8, rnd(), 0.93, 0.83, 0.55, 0.6, 3, 1);
    if (dist < 14 && Math.random() < dt * 0.25) g.sfx.groan();
    this.contactAttack(dist, 3, pl => { if (g.mode === 'survival') { if (!pl.slowT) g.ui.toast('🏜 Cursed by sand — slowed!', 'warn'); pl.slowT = 2; } });
  };

  Mob.prototype.mop = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P, pl = g.player;
    const repel = this.orbRepel(dt);
    if (this.hp <= 0) return this.die(true);
    let speed = 0;
    const hunting = dist < 30 && !g.safeZone && pl.health > 0;
    if (repel) { this.yaw = Math.atan2(this.pos.x - repel.x, this.pos.z - repel.z); speed = 3; }
    else if (hunting) { this.yaw = Math.atan2(dx, dz); speed = dist > 7 ? 2.7 : dist > 2 ? 1.2 : 0.4; }
    else {
      this.ai -= dt;
      if (this.ai <= 0) { this.ai = 3 + Math.random() * 3; this.walk = 1.6; this.yaw += rnd() * 1.5; }
      speed = this.walk;
    }
    this.steer(speed);
    // Relentless marching rhythm
    this.march = (this.march || 0) + dt * (speed > 0.5 ? 9 : 3);
    P.body.position.y = Math.abs(Math.sin(this.march)) * 0.16;
    P.body.rotation.z = Math.sin(this.march) * 0.06;
    P.bucketL.rotation.z = Math.sin(this.march * 0.5) * 0.35;
    P.bucketR.rotation.z = -Math.sin(this.march * 0.5) * 0.35;
    // Bucket toss with a wind-up
    if (this.throwT > 0) {
      this.throwT -= dt;
      P.armR.rotation.z = 1.4 * (1 - this.throwT / 0.5);
      if (this.throwT <= 0) {
        P.armR.rotation.z = 0;
        const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.3 * this.scale, this.pos.z);
        g.mobs.shots.lob('water', from, new THREE.Vector3(pl.pos.x + pl.vel.x * 0.4, pl.pos.y + 0.8, pl.pos.z + pl.vel.z * 0.4), 11);
      }
    } else if (hunting && !repel && dist < 13 && dist > 2.5 && this.cd <= 0) {
      this.throwT = 0.5; this.cd = 2.4 + Math.random() * 1.5;
    }
    this.contactAttack(dist, 2);
  };

  // ---------------------------------------------------------------- spawning
  MV.SPAWNERS.push((mgr, g) => {
    const p = g.player.pos, t = g.world.terrain(Math.floor(p.x), Math.floor(p.z));
    const farFromWell = s => { const w = g.world.nearestWell(s.x, s.z); return !w || w.dist > 18; };
    // Sand Beasts haunt the dunes day and night (more at night)
    if (t.dunes > 0.45 && mgr.count('mummy') < (g.sky.isNight ? 5 : 3) && Math.random() < 0.6) {
      const s = mgr.findSpot(p.x, p.z, 18, 34);
      if (s && farFromWell(s)) {
        const id = g.world.getBlock(Math.floor(s.x), Math.floor(s.y) - 1, Math.floor(s.z));
        if (id === B.SAND || id === B.SANDSTONE) mgr.spawn('mummy', s.x, s.y, s.z);
      }
    }
    // Marching Mops arrive in columns of three
    if (t.forest > 0.5 && mgr.count('mop') < 5 && !(mgr.timers.mop > 0) && Math.random() < (g.sky.isNight ? 0.2 : 0.08)) {
      const s = mgr.findSpot(p.x, p.z, 22, 34);
      if (s && farFromWell(s)) {
        let any = false;
        const ang = Math.atan2(p.x - s.x, p.z - s.z);
        for (let i = 0; i < 3; i++) {
          const m = mgr.spawn('mop', s.x - Math.sin(ang) * i * 1.4, s.y + 0.5, s.z - Math.cos(ang) * i * 1.4);
          if (m) { m.yaw = ang; m.cd = 2 + i; any = true; }
        }
        if (any) { mgr.timers.mop = 40; g.ui.toast('🪣 You hear marching… the Mops are coming!', 'warn'); }
      }
    }
  });

  MV.buildMummy = buildMummy;
  MV.buildMop = buildMop;
})();
