/* PixieCraft — 🌳 The Tree Monster (boss).
   Hides in the Enchanted Forest disguised as an ordinary tree — it's built from the very same
   block textures and lighting as the world's trees. Get too close (or poke it) and it rips free:
   glowing eyes, snapping maw, branch-arm slams, erupting root spikes and razor-leaf volleys. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B;
  const box = MV.mobBox, pivot = MV.mobPivot, Mob = MV.Mob, TYPES = MV.MOB_TYPES;
  const rnd = () => Math.random() - 0.5;

  // Block-textured cubes shaded exactly like chunk meshes, so the disguise is perfect.
  const geoCache = {};
  const SHADE = [0.8, 0.8, 1, 0.55, 0.7, 0.7]; // +x -x +y -y +z -z
  function cubeGeo(id) {
    if (geoCache[id]) return geoCache[id];
    const def = MV.BLOCKS[id], g = new THREE.BoxGeometry(1, 1, 1), uv = g.attributes.uv;
    const col = new Float32Array(24 * 3);
    for (let f = 0; f < 6; f++) {
      const t = MV.tileUV(f === 2 ? def.top : f === 3 ? def.bottom : def.side);
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, t[0] + uv.getX(i) * (t[2] - t[0]), t[1] + uv.getY(i) * (t[3] - t[1]));
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = SHADE[f];
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return (geoCache[id] = g);
  }
  let mat = null;
  const treeMat = () => mat || (mat = new THREE.MeshBasicMaterial({ map: window.game.atlasTex, vertexColors: true, alphaTest: 0.5 }));
  function cube(parent, id, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(cubeGeo(id), treeMat());
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  }

  function buildTreant() {
    const root = new THREE.Group(), P = {};
    const th = 5, leaf = Math.random() < 0.3 ? B.BLOSSOM : B.LEAVES;
    const trunk = pivot(root, 0, 0, 0);
    for (let i = 0; i < th; i++) cube(trunk, B.LOG, 0, i + 0.5, 0);
    // Canopy: same layer radii as World.tree()
    const radii = [2.3, 2.8, 2.8, 2.0, 1.2];
    for (let dy = -2; dy <= 2; dy++) {
      const rad = radii[dy + 2], y = th - 1 + dy;
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
        const d2 = dx * dx + dz * dz;
        if (d2 > rad * rad || (dx === 0 && dz === 0 && y < th)) continue;
        if (d2 > (rad - 0.9) * (rad - 0.9) && Math.random() < 0.4) continue;
        cube(trunk, leaf, dx, y + 0.5, dz);
      }
    }
    // Hidden monster features, revealed on awakening
    const face = new THREE.Group(); face.visible = false; trunk.add(face);
    box(face, 0.24, 0.12, 0.04, 0xff2a1a, -0.22, 1.6, 0.52, true);
    box(face, 0.24, 0.12, 0.04, 0xff2a1a, 0.22, 1.6, 0.52, true);
    box(face, 0.3, 0.06, 0.05, 0x2a1608, -0.22, 1.75, 0.53).rotation.z = -0.35;
    box(face, 0.3, 0.06, 0.05, 0x2a1608, 0.22, 1.75, 0.53).rotation.z = 0.35;
    const mouth = box(face, 0.62, 0.3, 0.04, 0x120804, 0, 0.95, 0.52);
    for (let i = 0; i < 4; i++) box(face, 0.07, 0.1, 0.03, 0xe8dcc0, -0.21 + i * 0.14, 1.06, 0.545);
    const arms = [];
    for (const s of [-1, 1]) {
      const a = pivot(trunk, s * 0.55, 2.0, 0); a.visible = false;
      cube(a, B.LOG, 0, -0.9, 0, 0.35, 1.8, 0.35);
      cube(a, B.LOG, s * 0.3, -1.85, 0.15, 0.25, 0.6, 0.25).rotation.z = s * 0.6;
      cube(a, leaf, 0, -1.9, 0, 0.8, 0.8, 0.8);
      arms.push(a);
    }
    const roots = [];
    for (let i = 0; i < 4; i++) {
      const r = pivot(root, 0, 0.2, 0); r.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4; r.visible = false;
      cube(r, B.LOG, 0, 0, 0.7, 0.3, 0.3, 1.0);
      roots.push(r);
    }
    Object.assign(P, { trunk, face, mouth, arms, roots });
    return { root, P };
  }

  TYPES.treant = {
    build: buildTreant, w: 0.5, h: 7, hp: 200, friendly: false, boss: true, heavy: true,
    name: 'The Tree Monster', riseColor: '#6b4a2e', deathColors: [[0.4, 0.85, 0.35], [0.6, 0.4, 0.2], [1, 0.6, 0.85]],
  };

  // Telegraphed root eruption under a target spot
  function rootSpike(g, x, z) {
    const s = g.world.surfaceY(Math.floor(x), Math.floor(z));
    if (!s) return { update: () => false };
    const y = s.y;
    let t = 0, grp = null;
    return {
      update(dt) {
        t += dt;
        if (t < 1.0) {
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2, c = Math.random() < 0.5 ? [0.55, 0.35, 0.15] : [0.3, 0.9, 0.3];
            g.particles.glow.spawn(x + Math.cos(a) * 1.4, y + 0.1, z + Math.sin(a) * 1.4, 0, 1.2, 0, c[0], c[1], c[2], 0.5, 0, 0);
          }
          return true;
        }
        if (!grp) {
          grp = new THREE.Group();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2, r = i ? 0.7 : 0;
            const m = cube(grp, B.LOG, Math.cos(a) * r, 1.2, Math.sin(a) * r, 0.3, 2.4 + Math.random(), 0.3);
            m.rotation.set(rnd() * 0.5, 0, rnd() * 0.5);
          }
          grp.position.set(x, y - 2.6, z);
          g.scene.add(grp);
          g.particles.blockBreak(Math.floor(x), y - 1, Math.floor(z), '#6b4a2e');
          g.sfx.brk(); g.shake = Math.max(g.shake || 0, 0.25);
          const pl = g.player;
          if (Math.hypot(pl.pos.x - x, pl.pos.z - z) < 1.8 && Math.abs(pl.pos.y - y) < 2.5) { pl.damage(5, new THREE.Vector3(x, y, z)); pl.vel.y = 11; }
        }
        if (t < 1.25) grp.position.y = y - 2.6 + ((t - 1.0) / 0.25) * 2.6;
        else if (t > 2.4) grp.position.y -= dt * 4;
        if (t > 3) { g.scene.remove(grp); return false; }
        return true;
      },
      remove() { if (grp) g.scene.remove(grp); },
    };
  }

  MV.FX.root = (g, a) => g.bosses.hazards.push(rootSpike(g, a[0], a[1]));
  TYPES.treant.ghostTick = m => { treeMat().color.copy(m.game.sky.light); if (!m.dormant && !m.revealed) m.reveal(); };

  Mob.prototype.reveal = function () {
    this.revealed = true;
    this.P.face.visible = true;
    this.P.arms.forEach(a => (a.visible = true));
    this.P.roots.forEach(r => (r.visible = true));
  };

  Mob.prototype.awaken = function () {
    const g = this.game;
    this.dormant = false;
    this.reveal();
    this.vel.y = 7;
    this.yaw = Math.atan2(g.player.pos.x - this.pos.x, g.player.pos.z - this.pos.z);
    for (let i = 0; i < 25; i++) g.particles.blockBreak(Math.floor(this.pos.x) + rnd() * 3, this.pos.y - 1, Math.floor(this.pos.z) + rnd() * 3, '#6b4a2e');
    g.ui.toast("🌳 That's no tree — the TREE MONSTER awakens!", 'boss');
    g.sfx.creak(); g.sfx.roar(); g.shake = 1.2;
  };

  Mob.prototype.treant = function (dt, dx, dz, dist) {
    const g = this.game, P = this.P, pl = g.player;
    treeMat().color.copy(g.sky.light);
    if (this.dormant) {
      this.yaw = 0; this.vel.x = this.vel.z = 0;
      if (dist < 4.5 && Math.abs(pl.pos.y - this.pos.y) < 6) this.awaken();
      else if (dist < 14 && Math.random() < dt * 0.1) {
        g.sfx.creak(); // an eerie hint...
        for (let i = 0; i < 6; i++) g.particles.glow.spawn(this.pos.x + rnd() * 4, this.pos.y + 4 + Math.random() * 2, this.pos.z + rnd() * 4, rnd(), -0.5, rnd(), 0.3, 0.8, 0.3, 1.5, 0.5, 0);
      }
      return;
    }
    if (!this.revealed) this.reveal();
    const enraged = this.hp < this.maxHp / 2;
    if (enraged && !this.enraged) { this.enraged = true; g.ui.toast('🌳 The Tree Monster splits its bark in rage — roots everywhere!', 'warn'); g.sfx.roar(); }
    this.rootT = (this.rootT ?? 3) - dt; this.leafT = (this.leafT ?? 2) - dt; this.slamCd = (this.slamCd ?? 2) - dt;
    let d = Math.atan2(dx, dz) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 3);
    P.mouth.scale.y = 1 + Math.abs(Math.sin(this.t * 6)) * 0.8;
    if (this.slam > 0) {
      this.slam -= dt; this.vel.x = this.vel.z = 0;
      P.arms.forEach(a => (a.rotation.x = -2.7));
      if (this.slam <= 0) {
        P.arms.forEach(a => (a.rotation.x = -0.3));
        const f = this.pos.clone().add(new THREE.Vector3(Math.sin(this.yaw) * 1.8, 0, Math.cos(this.yaw) * 1.8));
        MV.bossShockwave(g, f.x, this.pos.y, f.z, enraged ? 5.5 : 4.5, 5, [[0.55, 0.35, 0.15], [0.35, 0.85, 0.3]]);
        this.slamCd = enraged ? 2 : 3;
      }
    } else {
      this.steer(enraged ? 2.6 : 1.7);
      const sw = Math.sin(this.t * 3);
      P.trunk.rotation.z = sw * 0.05;
      P.arms[0].rotation.x = sw * 0.5; P.arms[1].rotation.x = -sw * 0.5;
      P.roots.forEach((r, i) => (r.rotation.x = Math.sin(this.t * 6 + i) * 0.4));
      if (Math.abs(sw) > 0.98 && Math.random() < 0.3) g.shake = Math.max(g.shake || 0, 0.12);
      if (dist < 5 && this.slamCd <= 0) { this.slam = 0.8; g.sfx.creak(); }
    }
    if (this.rootT <= 0 && dist < 30) {
      this.rootT = enraged ? 3.2 : 5;
      MV.fx('root', [pl.pos.x + pl.vel.x * 0.5, pl.pos.z + pl.vel.z * 0.5]);
      if (enraged) for (let i = 0; i < 2; i++) MV.fx('root', [pl.pos.x + rnd() * 6, pl.pos.z + rnd() * 6]);
    }
    if (this.leafT <= 0 && dist < 28 && dist > 3) {
      this.leafT = enraged ? 2.8 : 4.2;
      const from = new THREE.Vector3(this.pos.x, this.pos.y + 5, this.pos.z);
      for (let i = -2; i <= 2; i++) {
        const px = -Math.cos(this.yaw) * i * 1.6, pz = Math.sin(this.yaw) * i * 1.6;
        g.mobs.shots.aim('leaf', from, new THREE.Vector3(pl.pos.x + px, pl.pos.y + 1, pl.pos.z + pz), 12);
      }
      g.sfx.fire();
    }
    if (Math.random() < dt * 8) g.particles.glow.spawn(this.pos.x + rnd() * 5, this.pos.y + 5 + Math.random() * 2, this.pos.z + rnd() * 5, rnd(), -1, rnd(), 0.4, 0.9, 0.4, 1.2, 0.5, 0);
    this.contactAttack(dist, 4);
  };

  // Disguised Tree Monsters lurk among the Enchanted Forest's trees
  MV.SPAWNERS.push((mgr, g) => {
    if (mgr.timers.treant > 0 || Math.random() > 0.2) return;
    const p = g.player.pos, t = g.world.terrain(Math.floor(p.x), Math.floor(p.z));
    if (t.forest < 0.6 || t.meadow > 0.5 || mgr.count('treant') >= MV.MAX_PER_BOSS) return;
    const s = mgr.findSpot(p.x, p.z, 22, 40);
    if (!s) return;
    const bx = Math.floor(s.x), bz = Math.floor(s.z), w = g.world;
    if (w.getBlock(bx, s.y - 1, bz) !== B.GRASS) return;
    for (let y = s.y; y < s.y + 8; y++) if (w.getBlock(bx, y, bz)) return;
    if (mgr.spawn('treant', bx + 0.5, s.y, bz + 0.5, { dormant: true })) mgr.timers.treant = 45;
  });
})();
