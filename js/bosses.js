/* PixieCraft — bosses.
   ☀ The Sand Pharaoh  — giant mummy king: ground slams, sand boulders, summons Sand Beasts.
   🪣 The Mop King     — crowned colossal mop: bucket barrages, belly-flop tidal stomps, mop armies.
   ☾ The Shadow Dragon — circles overhead: homing nightfire, dive bombs, shadow reinforcements.
   Bosses rise after enough of their minions fall, or can be summoned with crafted relics. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, I = MV.ITEM;
  const box = MV.mobBox, pivot = MV.mobPivot, Mob = MV.Mob, TYPES = MV.MOB_TYPES;
  const rnd = () => Math.random() - 0.5;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------------------------------------------------------------- dragon model
  function buildDragon() {
    const root = new THREE.Group(), P = {};
    const D = 0x241438, D2 = 0x1a0f2e, H = 0x5a2d8a, EYE = 0xff3df2;
    box(root, 1.2, 1.0, 2.4, D, 0, 0.9, 0);
    box(root, 0.9, 0.22, 2.0, H, 0, 0.36, 0);
    for (const z of [-0.8, -0.2, 0.4, 1.0]) box(root, 0.16, 0.34, 0.2, 0xb04ae8, 0, 1.5, z, true);
    [[0, 1.35, 1.45, 0.62], [0, 1.75, 1.95, 0.55], [0, 2.1, 2.4, 0.5]].forEach(([x, y, z, s]) => box(root, s, s, s, D, x, y, z));
    const head = pivot(root, 0, 2.25, 2.95);
    box(head, 0.8, 0.6, 0.9, D2, 0, 0, 0);
    box(head, 0.6, 0.22, 0.7, D, 0, -0.34, 0.2);
    box(head, 0.18, 0.1, 0.04, EYE, -0.24, 0.12, 0.46, true);
    box(head, 0.18, 0.1, 0.04, EYE, 0.24, 0.12, 0.46, true);
    for (const s of [-1, 1]) {
      const horn = box(head, 0.12, 0.55, 0.12, H, s * 0.26, 0.45, -0.3); horn.rotation.x = -0.6;
      const wing = pivot(root, s * 0.6, 1.25, 0.2);
      box(wing, 3.0, 0.08, 1.7, 0x3a1f5c, s * 1.5, 0, 0);
      box(wing, 1.4, 0.06, 1.2, 0x8a2be2, s * 3.6, 0, -0.35, true);
      box(wing, 3.0, 0.12, 0.12, 0xd060ff, s * 1.5, 0.05, 0.8, true);
      P[s < 0 ? 'wingL' : 'wingR'] = wing;
      for (const z of [-0.7, 0.7]) box(root, 0.22, 0.5, 0.22, D2, s * 0.4, 0.2, z);
    }
    const tail = pivot(root, 0, 0.85, -1.2);
    [[0, 0, -0.4, 0.6], [0, -0.1, -1.0, 0.45], [0, -0.2, -1.55, 0.32], [0, -0.3, -2.0, 0.22]].forEach(([x, y, z, s]) => box(tail, s, s, s + 0.2, D, x, y, z));
    box(tail, 0.3, 0.3, 0.1, EYE, 0, -0.3, -2.2, true);
    P.head = head; P.tail = tail;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color: 0x8a2be2, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }));
    glow.scale.set(7, 7, 1); glow.position.y = 1.1; root.add(glow);
    return { root, P };
  }

  // ---------------------------------------------------------------- boss types
  Object.assign(TYPES, {
    pharaoh: {
      build: () => MV.buildMummy(true), w: 0.3, h: 1.65, scale: 2.7, hp: 180, friendly: false, boss: true, heavy: true,
      name: 'The Sand Pharaoh', riseColor: '#e2c283', deathColors: [[1, 0.85, 0.3], [0.3, 0.6, 1], [1, 1, 0.8]],
    },
    mopking: {
      build: () => MV.buildMop(true), w: 0.3, h: 1.8, scale: 2.5, hp: 150, friendly: false, boss: true, heavy: true,
      name: 'The Mop King', riseColor: '#4ea2ff', deathColors: [[0.4, 0.75, 1], [1, 0.85, 0.3], [0.9, 0.9, 1]],
      onDeath: m => {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const c = m.game.mobs.spawn('mop', m.pos.x + Math.cos(a) * 2, m.pos.y + 1, m.pos.z + Math.sin(a) * 2, { gen: 1, scale: 0.78, hp: 7 });
          if (c) c.vel.set(Math.cos(a) * 4, 6, Math.sin(a) * 4);
        }
      },
    },
    dragon: {
      build: buildDragon, w: 1.3, h: 2.2, hp: 240, friendly: false, boss: true, heavy: true, flying: true,
      name: 'The Shadow Dragon', deathColors: [[0.8, 0.3, 1], [1, 0.4, 0.8], [1, 1, 1]],
    },
  });

  // Telegraphed ground-pound: ring of particles, hurts the player if grounded nearby
  // Runs on every player's game (see MV.fx) so each one checks its own local player
  function shockwave(g, x, y, z, r, dmg, colors) { MV.fx('shock', [x, y, z, r, dmg, colors]); }
  MV.FX.shock = (g, a) => shockLocal(g, ...a);
  function shockLocal(g, x, y, z, r, dmg, colors) {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, c = colors[i % colors.length];
      g.particles.glow.spawn(x + Math.cos(a), y + 0.3, z + Math.sin(a), Math.cos(a) * r * 2.2, 1, Math.sin(a) * r * 2.2, c[0], c[1], c[2], 0.5, 0, 1);
      g.particles.solid.spawn(x + Math.cos(a) * r * 0.5, y + 0.2, z + Math.sin(a) * r * 0.5, Math.cos(a) * 3, 3 + Math.random() * 3, Math.sin(a) * 3, c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0.7, 14, 1);
    }
    g.sfx.boom();
    g.shake = Math.max(g.shake || 0, 0.5);
    const pl = g.player, d = Math.hypot(pl.pos.x - x, pl.pos.z - z);
    if (d < r && Math.abs(pl.pos.y - y) < 2.5 && (pl.onGround || pl.pos.y - y < 1)) {
      pl.damage(dmg, V(x, y, z));
      const l = d || 1; pl.vel.x += ((pl.pos.x - x) / l) * 6; pl.vel.z += ((pl.pos.z - z) / l) * 6; pl.vel.y = 7;
    }
  }

  MV.bossShockwave = shockwave;
  MV.bossSummonAround = (...a) => summonAround(...a);

  function summonAround(g, type, center, n, radius) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, x = Math.floor(center.x + Math.cos(a) * radius), z = Math.floor(center.z + Math.sin(a) * radius);
      const s = g.world.surfaceY(x, z);
      if (!s || s.id === B.WATER) continue;
      const m = g.mobs.spawn(type, x + 0.5, s.y - 1.6, z + 0.5, { rise: 1.1, riseSpeed: 1.5 });
      if (m) m.cd = 1;
    }
  }

  Mob.prototype.pharaoh = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P, pl = g.player;
    const enraged = this.hp < this.maxHp / 2;
    if (this.enraged !== enraged && enraged) { this.enraged = true; g.ui.toast('☀ The Pharaoh is ENRAGED — a sandstorm rises!', 'warn'); g.sfx.roar(); }
    this.slamCd = (this.slamCd ?? 2) - dt; this.throwT = (this.throwT ?? 3) - dt; this.sumT = (this.sumT ?? 7) - dt;
    this.yaw = Math.atan2(dx, dz);
    if (this.slam > 0) {
      // Wind-up: arms raised, rooted in place
      this.slam -= dt;
      this.vel.x = this.vel.z = 0;
      P.armL.rotation.x = P.armR.rotation.x = -3.0;
      if (this.slam <= 0) {
        P.armL.rotation.x = P.armR.rotation.x = -0.5;
        const f = this.pos.clone().add(V(Math.sin(this.yaw) * 1.5, 0, Math.cos(this.yaw) * 1.5));
        shockwave(g, f.x, this.pos.y, f.z, enraged ? 6 : 4.8, 6, [[1, 0.85, 0.5], [0.95, 0.7, 0.3]]);
        this.slamCd = enraged ? 1.8 : 2.8;
      }
    } else {
      this.steer(enraged ? 2.9 : 2.0);
      const sw = Math.sin(this.t * 4);
      P.legL.rotation.x = sw * 0.35; P.legR.rotation.x = -sw * 0.35;
      P.armL.rotation.x = -1.45 + Math.sin(this.t * 2) * 0.1; P.armR.rotation.x = -1.45 - Math.sin(this.t * 2) * 0.1;
      if (dist < 5.5 && this.slamCd <= 0) { this.slam = 0.9; g.sfx.roar(); }
    }
    if (this.throwT <= 0 && dist > 4 && dist < 30) {
      this.throwT = enraged ? 3 : 4.5;
      const from = V(this.pos.x, this.pos.y + this.h * 0.8, this.pos.z);
      for (let i = -1; i <= 1; i++) {
        const t = V(pl.pos.x + i * 2.2 + pl.vel.x * 0.5, pl.pos.y + 0.5, pl.pos.z + pl.vel.z * 0.5 + i * rnd() * 2);
        g.mobs.shots.lob('sand', from, t, 12);
      }
    }
    if (this.sumT <= 0) { this.sumT = enraged ? 9 : 13; summonAround(g, 'mummy', this.pos, enraged ? 3 : 2, 5); g.ui.toast('☀ The Pharaoh calls his Sand Beasts!', 'warn'); }
    if (enraged) for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 6;
      g.particles.solid.spawn(this.pos.x + Math.cos(a) * r, this.pos.y + Math.random() * 5, this.pos.z + Math.sin(a) * r, -Math.sin(a) * 6, 0.5, Math.cos(a) * 6, 0.93, 0.8, 0.5, 0.8, 0, 0.5);
    }
    this.contactAttack(dist, 5);
  };

  Mob.prototype.mopking = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P, pl = g.player;
    const enraged = this.hp < this.maxHp / 2;
    if (enraged && !this.enraged) { this.enraged = true; g.ui.toast('🪣 The Mop King is FURIOUS — the floods begin!', 'warn'); g.sfx.roar(); }
    this.barT = (this.barT ?? 2.5) - dt; this.stompT = (this.stompT ?? 7) - dt; this.sumT = (this.sumT ?? 9) - dt;
    this.yaw = Math.atan2(dx, dz);
    if (this.stomping) {
      if (this.onGround && this.vel.y <= 0 && this.airT > 0.3) {
        this.stomping = false;
        shockwave(g, this.pos.x, this.pos.y, this.pos.z, enraged ? 7 : 5.5, 5, [[0.4, 0.75, 1], [0.8, 0.95, 1]]);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.mobs.shots.fire('water', V(this.pos.x, this.pos.y + 1, this.pos.z), V(Math.cos(a) * 7, 7, Math.sin(a) * 7));
        }
      }
      this.airT += dt;
    } else {
      this.steer(enraged ? 3.2 : 2.3);
      if (this.stompT <= 0 && this.onGround) {
        this.stompT = enraged ? 6 : 9; this.stomping = true; this.airT = 0;
        this.vel.y = 14; this.vel.x = dx * 0.35; this.vel.z = dz * 0.35;
      }
    }
    this.march = (this.march || 0) + dt * 8;
    P.body.position.y = Math.abs(Math.sin(this.march)) * 0.12;
    P.bucketL.rotation.z = Math.sin(this.march * 0.5) * 0.4;
    P.bucketR.rotation.z = -Math.sin(this.march * 0.5) * 0.4;
    if (this.barT <= 0 && dist < 26) {
      this.barT = enraged ? 2.2 : 3.4;
      const from = V(this.pos.x, this.pos.y + this.h * 0.7, this.pos.z), n = enraged ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 1.8;
        const px = -Math.cos(this.yaw) * off, pz = Math.sin(this.yaw) * off;
        g.mobs.shots.lob('water', from, V(pl.pos.x + px, pl.pos.y + 0.5, pl.pos.z + pz), 12);
      }
      g.sfx.splash();
    }
    if (this.sumT <= 0) {
      this.sumT = enraged ? 10 : 14;
      summonAround(g, 'mop', this.pos, enraged ? 4 : 3, 4);
      g.ui.toast('🪣 More mops march from the King\'s buckets!', 'warn');
    }
    this.contactAttack(dist, 4);
  };

  Mob.prototype.dragon = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P, pl = g.player;
    const enraged = this.hp < this.maxHp / 2;
    if (enraged && !this.enraged) { this.enraged = true; g.ui.toast('☾ The Shadow Dragon unleashes its fury!', 'warn'); g.sfx.roar(); }
    this.fireT = (this.fireT ?? 3) - dt; this.diveT = (this.diveT ?? 10) - dt; this.sumT = (this.sumT ?? 12) - dt;
    this.state = this.state || 'circle';
    this.orbit = (this.orbit || 0) + dt * (enraged ? 0.5 : 0.35);
    let target, maxSpeed = 11;
    if (this.state === 'dive') {
      target = this.diveTarget; maxSpeed = enraged ? 22 : 18;
      this.diveTime -= dt;
      if (this.pos.distanceTo(target) < 1.5 || this.diveTime <= 0) { this.state = 'climb'; this.climbT = 1.6; }
      const pc = V(pl.pos.x, pl.pos.y + 0.9, pl.pos.z);
      if (this.pos.clone().add(V(0, 1, 0)).distanceTo(pc) < 2.8 && this.cd <= 0) { this.cd = 1.5; pl.damage(7, this.pos); }
    } else {
      if (this.state === 'climb' && (this.climbT -= dt) <= 0) this.state = 'circle';
      const r = 15, hgt = this.state === 'climb' ? 14 : 9 + Math.sin(this.t) * 2;
      target = V(pl.pos.x + Math.cos(this.orbit) * r, pl.pos.y + hgt, pl.pos.z + Math.sin(this.orbit) * r);
      const s = g.world.surfaceY(Math.floor(target.x), Math.floor(target.z));
      if (s) target.y = Math.max(target.y, s.y + 5);
      if (this.diveT <= 0 && this.state === 'circle') {
        this.state = 'dive'; this.diveTime = 2.2; this.diveT = enraged ? 7 : 11;
        this.diveTarget = V(pl.pos.x, pl.pos.y + 0.8, pl.pos.z);
        g.sfx.roar(); g.ui.toast('☾ The Dragon dives — dodge!', 'warn');
      }
    }
    const want = target.clone().sub(this.pos);
    if (want.length() > maxSpeed) want.setLength(maxSpeed);
    this.vel.lerp(want, Math.min(1, dt * (this.state === 'dive' ? 4 : 1.5)));
    this.pos.addScaledVector(this.vel, dt);
    // Don't clip into terrain
    while (g.world.isSolid(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.5), Math.floor(this.pos.z)) && this.pos.y < MV.CH) this.pos.y += 0.5;
    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (this.state !== 'dive' && dist < 30 && this.fireT < 0.6) this.yaw = Math.atan2(dx, dz);
    else if (hv > 0.5) this.yaw = Math.atan2(this.vel.x, this.vel.z);
    this.root.rotation.x = -Math.atan2(this.vel.y, Math.max(hv, 1)) * 0.5;
    const flap = Math.sin(this.t * (this.state === 'dive' ? 2 : 4));
    P.wingL.rotation.z = flap * 0.5; P.wingR.rotation.z = -flap * 0.5;
    P.tail.rotation.y = Math.sin(this.t * 2) * 0.4;
    P.head.rotation.x = this.fireT < 0.4 ? -0.3 : 0;
    if (this.fireT <= 0 && this.state !== 'dive' && dist < 40) {
      this.fireT = enraged ? 1.5 : 2.4;
      const hp = P.head.getWorldPosition(V(0, 0, 0));
      const n = enraged ? 3 : 1;
      for (let i = 0; i < n; i++) g.mobs.shots.aim('fire', hp, V(pl.pos.x + (i - (n - 1) / 2) * 3, pl.pos.y + 1, pl.pos.z), 13);
      g.sfx.fire();
    }
    if (enraged && this.sumT <= 0) { this.sumT = 15; summonAround(g, 'shadow', pl.pos, 2, 8); g.ui.toast('☾ Shadows answer the Dragon\'s call!', 'warn'); }
    if (Math.random() < dt * 12) g.particles.smoke(this.pos.x, this.pos.y + 0.5, this.pos.z);
  };

  // ---------------------------------------------------------------- boss director
  const BOSSES = {
    pharaoh: { minion: 'mummy', need: 8, warn: '☀ The dunes tremble… the Sand Pharaoh awakens!', reward: [[B.GOLD, 8], [B.CRYSTAL, 4], [I.SCARAB, 1]] },
    mopking: { minion: 'mop', need: 15, warn: '🪣 A thunderous march… the Mop King approaches!', reward: [[I.DUST, 8], [B.GLASS, 16], [B.PLANKS, 32]] },
    dragon: { minion: 'shadow', need: 10, warn: '☾ The stars go dark… the Shadow Dragon descends!', reward: [[B.CRYSTAL, 12], [B.GOLD, 12], [B.LANTERN, 8]], night: true },
    yeti: { minion: 'snowman', need: 10, warn: '🦍 A thunderous roar echoes off the peaks… THE YETI is coming!', reward: [[B.CRYSTAL, 16], [B.GOLD, 10], [B.SNOW, 32], [I.FROSTHORN, 1]] },
    treant: { warn: '🌳 The forest groans… a Tree Monster tears free of the earth!', reward: [[B.LOG, 32], [I.DUST, 6], [B.CRYSTAL, 6], [I.ACORN, 1]] },
  };
  const RELICS = { [I.SCARAB]: 'pharaoh', [I.BUCKET]: 'mopking', [I.DARKSTAR]: 'dragon', [I.ACORN]: 'treant', [I.FROSTHORN]: 'yeti' };
  MV.BOSS_INFO = BOSSES;
  MV.BOSS_RELICS = RELICS;

  class Bosses {
    constructor(game) {
      this.game = game; this.pending = [];
      this.kills = { mummy: 0, mop: 0, shadow: 0, snowman: 0 };
      this.defeated = {};
      this.bars = document.getElementById('bossBars');
      this.fireworks = [];
      this.hazards = [];
    }

    relicFor(itemId) { return RELICS[itemId]; }

    // Awake bosses currently fighting (dormant tree monsters are hiding, not fighting)
    get active() { return this.game.mobs.list.filter(m => m.T.boss && !m.dead && !m.dormant); }
    get fighting() { return this.active.length > 0 || this.pending.length > 0; }

    count(kind) { return this.game.mobs.count(kind) + this.pending.filter(p => p.kind === kind).length; }

    onKill(type) {
      this.kills[type] = (this.kills[type] || 0) + 1;
      for (const k in BOSSES) {
        const b = BOSSES[k];
        if (b.minion !== type) continue;
        if (b.night && !this.game.sky.isNight) continue;
        if (b.where && !b.where(this.game)) continue; // e.g. the Kraken needs deep water nearby
        if (this.kills[type] >= b.need) { this.kills[type] = 0; if (this.count(k) < MV.MAX_PER_BOSS) this.queue(k); }
        else if (this.kills[type] === b.need - 2) this.game.ui.toast(`Something stirs… (${b.need - this.kills[type]} more)`, 'warn');
      }
    }

    queue(kind, by) {
      this.pending.push({ kind, t: 3.5, by });
      this.game.ui.toast(BOSSES[kind].warn, 'boss'); this.game.sfx.roar(); this.game.shake = 1;
      if (MV.net && MV.net.isHost) MV.net.broadcast({ t: 'toast', msg: BOSSES[kind].warn, cls: 'boss' });
    }

    summon(kind) {
      const info = BOSSES[kind];
      if (info.where && !info.where(this.game)) { this.game.ui.toast(info.whereMsg, 'warn'); return false; }
      if (MV.net && MV.net.active && !MV.net.isHost) { MV.net.sendHost({ t: 'summon', kind }); return true; } // guests ask the host
      if (this.count(kind) >= MV.MAX_PER_BOSS) { this.game.ui.toast(`There are already ${MV.MAX_PER_BOSS} of those — defeat one first!`, 'warn'); return false; }
      this.queue(kind);
      return true;
    }

    spawnBoss(kind) {
      const g = this.game, p = g.player.pos, T = TYPES[kind];
      if (T.spawnBoss) return T.spawnBoss(g);
      // In front of the player if possible, but always inside the boss's home biome
      let x = Math.floor(p.x), z = Math.floor(p.z);
      for (let i = 0; i < 12; i++) {
        const a = g.player.yaw + (Math.random() - 0.5) * (1.2 + i * 0.5), d = i < 8 ? 13 : 6;
        const tx = Math.floor(p.x - Math.sin(a) * d), tz = Math.floor(p.z - Math.cos(a) * d);
        if (!T.biome || T.biome(g.world.terrain(tx, tz))) { x = tx; z = tz; break; }
      }
      if (T.flying) return g.mobs.spawn(kind, x + 0.5, p.y + 25, z + 0.5);
      const s = g.world.surfaceY(x, z) || { y: Math.floor(p.y) };
      const h = T.h * (T.scale || 1);
      return g.mobs.spawn(kind, x + 0.5, s.y - h, z + 0.5, { rise: 2.5, riseSpeed: h / 2.5 });
    }

    renderBars() {
      const act = this.active;
      const key = act.map(m => m.id).join(',');
      if (key !== this.barKey) {
        this.barKey = key;
        this.bars.innerHTML = act.slice(0, 4).map(() => '<div class="bossBar"><div class="bossName"></div><div class="boss-track"><div class="bossFill"></div></div></div>').join('')
          + (act.length > 4 ? `<div class="bossMore">+${act.length - 4} more bosses</div>` : '');
      }
      const rows = this.bars.querySelectorAll('.bossBar');
      act.slice(0, 4).forEach((m, i) => {
        const r = rows[i];
        r.querySelector('.bossName').textContent = m.T.name + (m.enraged ? ' — ENRAGED' : '');
        r.querySelector('.bossFill').style.width = Math.max(0, (m.hp / m.maxHp) * 100) + '%';
        r.classList.toggle('enraged', !!m.enraged);
      });
    }

    update(dt) {
      const g = this.game;
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const p = this.pending[i];
        if ((p.t -= dt) <= 0) {
          this.pending.splice(i, 1);
          // Online: the boss appears beside whoever summoned it
          if (MV.net && MV.net.isHost && p.by) MV.net.runAs(MV.net.playerById(p.by), () => this.spawnBoss(p.kind)); else this.spawnBoss(p.kind);
        }
      }
      this.renderBars();
      for (let i = this.hazards.length - 1; i >= 0; i--) if (!this.hazards[i].update(dt)) this.hazards.splice(i, 1);
      for (let i = this.fireworks.length - 1; i >= 0; i--) {
        const f = this.fireworks[i];
        if ((f.t -= dt) <= 0) {
          const c = MV.SPARKLE_COLORS[(Math.random() * 5) | 0];
          g.particles.burst(f.x + rnd() * 10, f.y + 6 + Math.random() * 8, f.z + rnd() * 10, 60, 7, 1.4, [c, [1, 1, 1]]);
          g.sfx.pop();
          f.t = 0.25; if (--f.n <= 0) this.fireworks.splice(i, 1);
        }
      }
    }

    victory(m) {
      const g = this.game, pl = g.player, info = BOSSES[m.type];
      if (MV.net && MV.net.isHost && !m.fromNet) MV.net.broadcast({ t: 'victory', type: m.type, p: m.pos.toArray() }); // everyone shares the win
      this.fireworks.push({ x: m.pos.x, y: m.pos.y, z: m.pos.z, t: 0, n: 14 });
      let msg = `🏆 ${m.T.name} defeated!`;
      if (!this.defeated[m.type]) {
        this.defeated[m.type] = true;
        pl.maxHealth += 4; pl.maxMagic += 20;
        msg += ' +2 hearts, +20 max magic!';
      }
      pl.health = pl.maxHealth; pl.magic = pl.maxMagic;
      if (g.mode === 'survival') { for (const [id, n] of info.reward) g.inv.add(id, n); g.ui.refreshHotbar(); msg += ' Treasure added to your satchel.'; }
      g.ui.toast(msg, 'boss');
      g.sfx.fanfare();
    }

    reset() {
      for (const m of this.game.mobs.list) if (m.T.boss && !m.dormant) m.dead = true;
      this.pending.length = 0;
      for (const h of this.hazards) h.remove && h.remove();
      this.hazards.length = 0;
    }
  }

  MV.Bosses = Bosses;
})();
