/* PixieCraft — the Fairytale Castle.
   One grand castle is generated near the spawn point of every world: a moat and drawbridge,
   crenellated outer walls with corner towers, a gatehouse, and a three-tier keep crowned with
   blue spires and gold finials. Inside the keep: a throne room with a treasure chest.
   It is a sanctuary (like a wishing well) and the nightly fireworks launch around it. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, World = MV.World;
  const R = 23;        // half-width of the flattened castle grounds
  let PLAN = null;

  function buildPlan() {
    const m = new Map();
    const put = (x, y, z, id) => m.set(x + ',' + y + ',' + z, [x, y, z, id]);
    const W = B.BRICK, S = B.STONE, ROOF = B.ROOF, G = B.GOLD, A = B.AIR;
    const disc = (cx, cz, r, fn) => {
      const k = Math.ceil(r);
      for (let dx = -k; dx <= k; dx++) for (let dz = -k; dz <= k; dz++) if (dx * dx + dz * dz <= r * r + 0.3) fn(cx + dx, cz + dz);
    };
    const tower = (cx, cz, r, y0, y1) => { for (let y = y0; y <= y1; y++) disc(cx, cz, r, (x, z) => put(x, y, z, y <= 2 ? S : W)); };
    const cone = (cx, cz, r, y0, hgt) => {
      for (let i = 0; i < hgt; i++) disc(cx, cz, Math.max(0.4, (r + 0.8) * (1 - i / hgt)), (x, z) => put(x, y0 + i, z, ROOF));
      put(cx, y0 + hgt, cz, G); put(cx, y0 + hgt + 1, cz, G);
    };
    const spire = (cx, cz, r, y0, th, ch) => {
      tower(cx, cz, r, y0, y0 + th - 1);
      const k = Math.floor(r);
      for (const [dx, dz] of [[0, k], [0, -k], [k, 0], [-k, 0]]) put(cx + dx, y0 + th - 3, cz + dz, B.GLASS);
      cone(cx, cz, r, y0 + th, ch);
    };
    const box = (x0, x1, y0, y1, z0, z1, id, hollow) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const edge = x === x0 || x === x1 || z === z0 || z === z1 || y === y1;
        if (!hollow || edge) put(x, y, z, id === W && y <= 2 ? S : id); else put(x, y, z, A);
      }
    };
    const crenels = (x0, x1, z0, z1, y) => {
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++)
        if ((x === x0 || x === x1 || z === z0 || z === z1) && (x + z) % 2 === 0) put(x, y, z, W);
    };

    // Moat with a plank drawbridge on the south side, and a stone path to the keep
    for (let x = -21; x <= 21; x++) for (let z = -21; z <= 21; z++) {
      const k = Math.max(Math.abs(x), Math.abs(z));
      if (k >= 19 && k <= 21) { put(x, 0, z, B.WATER); put(x, -1, z, B.WATER); put(x, -2, z, S); }
    }
    for (let z = 18; z <= 22; z++) for (let x = -2; x <= 2; x++) { put(x, 0, z, B.PLANKS); put(x, -1, z, B.LOG); }
    for (let z = 7; z <= 17; z++) for (let x = -1; x <= 1; x++) put(x, 0, z, B.WELLSTONE);

    // Outer curtain wall with battlements
    for (let i = -15; i <= 15; i++) for (const [x, z] of [[i, -15], [i, 15], [-15, i], [15, i]]) {
      for (let y = 1; y <= 6; y++) put(x, y, z, y <= 2 ? S : W);
      if (i % 2 === 0) put(x, 7, z, W);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) spire(sx * 15, sz * 15, 3, 1, 12, 7);   // corner towers
    for (const sx of [-1, 1]) spire(sx * 4, 15, 2, 1, 10, 5);                                     // gatehouse
    for (let x = -1; x <= 1; x++) for (let y = 1; y <= 3; y++) put(x, y, 15, A);                  // gate arch
    put(0, 4, 15, A);
    put(-2, 5, 16, B.LANTERN); put(2, 5, 16, B.LANTERN);

    // The keep — tier 1: throne room
    box(-6, 6, 1, 12, -6, 6, W, true);
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) put(x, 0, z, B.WELLSTONE);
    for (let z = -3; z <= 6; z++) put(0, 0, z, ROOF);                                              // royal blue carpet
    crenels(-6, 6, -6, 6, 13);
    for (let x = -1; x <= 1; x++) for (let y = 1; y <= 3; y++) put(x, y, 6, A);                   // door
    put(0, 4, 6, A);
    for (const o of [-3, 3]) for (const y of [6, 7]) { put(o, y, 6, B.GLASS); put(o, y, -6, B.GLASS); put(6, y, o, B.GLASS); put(-6, y, o, B.GLASS); }
    for (const sx of [-5, 5]) for (const sz of [-5, 5]) put(sx, 5, sz, B.LANTERN);
    put(0, 1, -5, G); put(0, 2, -5, G); put(-1, 1, -5, G); put(1, 1, -5, G);                      // golden throne
    put(3, 1, -4, B.TREASURE); put(-3, 1, -4, B.TREASURE);

    // Tier 2 and the great central tower
    box(-4, 4, 13, 22, -4, 4, W, true);
    crenels(-4, 4, -4, 4, 23);
    for (const y of [17, 18]) { put(0, y, 4, B.GLASS); put(0, y, -4, B.GLASS); put(4, y, 0, B.GLASS); put(-4, y, 0, B.GLASS); }
    put(0, 16, 0, B.LANTERN);
    tower(0, 0, 3, 23, 33);
    for (const [dx, dz] of [[0, 3], [0, -3], [3, 0], [-3, 0]]) { put(dx, 29, dz, B.GLASS); put(dx, 30, dz, B.GLASS); }
    cone(0, 0, 3, 34, 11);
    put(0, 47, 0, G);

    // A crowd of spires at different heights
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      spire(sx * 6, sz * 6, 1.6, 13, sz > 0 ? 8 : 11, 5);
      spire(sx * 4, sz * 4, 1.2, 23, 5, 5);
    }
    spire(-9, 0, 1.6, 1, 21, 7);
    spire(9, 0, 1.6, 1, 16, 6);
    spire(0, -9, 1.6, 1, 18, 7);
    return [...m.values()];
  }

  // Pick level forest ground 60–200 blocks from spawn (deterministic per seed)
  World.prototype.findCastle = function () {
    const s = this.spawn, SEA = MV.SEA;
    for (let r = 64; r <= 220; r += 12) for (let i = 0; i < 24; i++) {
      const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 12);   // prefer north, then fan out
      const x = Math.round(s.x + Math.cos(a) * r), z = Math.round(s.z + Math.sin(a) * r);
      const t = this.terrain(x, z);
      if (t.forest < 0.85 || t.ocean > 0.05 || t.canyon > 0.05 || t.h < SEA + 4) continue;
      let ok = true;
      for (let k = 0; k < 8 && ok; k++) {
        const b = (k / 8) * Math.PI * 2, t2 = this.terrain(Math.round(x + Math.cos(b) * 20), Math.round(z + Math.sin(b) * 20));
        if (Math.abs(t2.h - t.h) > 4 || t2.h <= SEA || t2.forest < 0.6) ok = false;
      }
      if (ok) return { x, z, y: t.h };
    }
    return null;
  };

  World.prototype.buildCastle = function (set, c) {
    const C = this.castle, CS = MV.CS, ox = c.cx * CS, oz = c.cz * CS;
    if (!C || ox > C.x + R || ox + CS < C.x - R || oz > C.z + R || oz + CS < C.z - R) return;
    // Level the grounds
    for (let x = Math.max(ox, C.x - R); x <= Math.min(ox + CS - 1, C.x + R); x++)
      for (let z = Math.max(oz, C.z - R); z <= Math.min(oz + CS - 1, C.z + R); z++) {
        const th = this.terrain(x, z).h;
        for (let y = th + 1; y < C.y; y++) set(x, y, z, B.DIRT, true);
        set(x, C.y, z, B.GRASS, true);
        for (let y = C.y + 1; y < Math.min(MV.CH, C.y + 52); y++) set(x, y, z, B.AIR, true);
      }
    PLAN = PLAN || buildPlan();
    for (const [dx, dy, dz, id] of PLAN) set(C.x + dx, C.y + dy, C.z + dz, id, true);
  };

  // Compass text for the HUD
  MV.castleHint = function (world, pos) {
    const C = world.castle;
    if (!C) return '';
    const dx = C.x - pos.x, dz = C.z - pos.z, d = Math.hypot(dx, dz);
    if (d < 26) return '🏰 The Fairytale Castle';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const dir = dirs[Math.round(Math.atan2(dx, -dz) / (Math.PI / 4) + 8) % 8];
    return `🏰 Castle: ${Math.round(d)} blocks ${dir}`;
  };
})();
