/* MagicaVoxel Kingdom — chunked world: biome terrain generation, structures,
   face-culled + ambient-occluded chunk meshing, voxel raycasting. */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, BLOCKS = MV.BLOCKS;
  const CS = 16, CH = 80, SEA = 20, CS2 = CS * CS, REG = 128;
  MV.CS = CS; MV.CH = CH; MV.SEA = SEA;

  const smooth = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  MV.smooth = smooth;

  // Face corners: [x, y, z, u, v]. Winding is CCW from outside.
  const FACES = [
    { n: [-1, 0, 0], shade: 0.8, c: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
    { n: [1, 0, 0], shade: 0.8, c: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
    { n: [0, -1, 0], shade: 0.55, c: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
    { n: [0, 1, 0], shade: 1.0, c: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
    { n: [0, 0, -1], shade: 0.7, c: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
    { n: [0, 0, 1], shade: 0.7, c: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] },
  ];
  // Pre-compute the three neighbours that darken each corner (side, side, diagonal).
  for (const f of FACES) {
    const axes = [0, 1, 2].filter(a => f.n[a] === 0);
    f.ao = f.c.map(c => {
      const s1 = f.n.slice(), s2 = f.n.slice(), cr = f.n.slice();
      const du = c[axes[0]] * 2 - 1, dv = c[axes[1]] * 2 - 1;
      s1[axes[0]] += du; s2[axes[1]] += dv; cr[axes[0]] += du; cr[axes[1]] += dv;
      return [s1, s2, cr];
    });
  }
  const AO = [0.45, 0.64, 0.82, 1];

  class Chunk {
    constructor(cx, cz) {
      this.cx = cx; this.cz = cz;
      this.data = new Uint8Array(CS * CS * CH);
      this.meshes = null;
      this.dirty = true;
    }
  }

  const key = (cx, cz) => cx * 65536 + cz;

  class World {
    constructor(seed, scene, atlasTex) {
      this.seed = seed | 0;
      this.n1 = new MV.Simplex(seed);
      this.n2 = new MV.Simplex(seed + 101);
      this.n3 = new MV.Simplex(seed + 202);
      this.scene = scene;
      this.chunks = new Map();
      this.pending = new Set();
      this.wellCache = new Map();
      this.edits = new Map(); this.editsByChunk = new Map();
      this.flowQ = []; this.flowT = 0; this.flowBudget = 600; this.flowing = false;
      this.userWells = [];
      this.frame = 0;
      this.matOpaque = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
      this.matTrans = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
      this.matGlow = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
      this.setRenderDist(6);
      this.spawn = this.findSpawn();
      this.castle = this.findCastle ? this.findCastle() : null;
    }

    setRenderDist(r) {
      this.renderDist = r;
      const R = r + 2;
      this.offsets = [];
      for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= R + 0.5) this.offsets.push([dx, dz, d]);
      }
      this.offsets.sort((a, b) => a[2] - b[2]);
    }

    setLight(color) { this.matOpaque.color.copy(color); this.matTrans.color.copy(color); }

    // ------------------------------------------------------------ terrain
    terrain(x, z) {
      const n = this.n1;
      const b = n.noise2(x * 0.0022, z * 0.0022) * 0.85 + n.noise2(x * 0.011 + 50, z * 0.011 - 20) * 0.15;
      const dunes = smooth(-0.18, -0.42, b), peaks = smooth(0.18, 0.45, b);
      const forest = 1 - dunes - peaks;
      const base = 25 + n.fbm2(x * 0.008, z * 0.008, 4) * 7;
      const forestH = base + n.noise2(x * 0.04, z * 0.04) * 1.5;
      const duneH = 23 + (1 - Math.abs(n.noise2(x * 0.018, z * 0.03))) * 6 + n.noise2(x * 0.05, z * 0.05);
      let ridge = 0, amp = 1, f = 0.01, norm = 0;
      for (let i = 0; i < 3; i++) { const r = 1 - Math.abs(this.n2.noise2(x * f, z * f)); ridge += r * r * amp; norm += amp; amp *= 0.5; f *= 2; }
      const peakH = base + 6 + (ridge / norm) * 34;
      // Tailfin Canyon: flat red desert, terraced mesas, and a winding Route cut through it all
      const cn = this.n3.noise2(x * 0.0017 + 500, z * 0.0017 - 400) * 0.85 + this.n3.noise2(x * 0.009, z * 0.009) * 0.15;
      const canyon = smooth(0.3, 0.48, cn), keep = 1 - canyon;
      const rn = this.n2.noise2(x * 0.005 + 900, z * 0.005 + 900);
      const road = canyon > 0.5 && Math.abs(rn) < 0.028;
      const m = this.n3.noise2(x * 0.018 + 77, z * 0.018 + 33) + 0.3 * this.n3.noise2(x * 0.05, z * 0.05);
      const mesaH = road ? 0 : m > 0.35 ? 11 + (m > 0.55 ? 7 : 0) + (m > 0.75 ? 5 : 0) : 0;
      const canyonH = 24 + (road ? 0 : n.noise2(x * 0.03, z * 0.03) * 0.8) + mesaH;
      const landH = (forestH * forest + duneH * dunes + peakH * peaks) * keep + canyonH * canyon;
      // Cursed Cove: open sea with a sandy floor ~11 blocks deep, dotted with small palm islands
      const on = this.n1.noise2(x * 0.0016 - 700, z * 0.0016 + 800) * 0.85 + this.n2.noise2(x * 0.01 + 11, z * 0.01 - 7) * 0.15;
      const ocean = smooth(0.3, 0.5, on), land = 1 - ocean;
      const isl = this.n3.noise2(x * 0.02 + 400, z * 0.02 + 400);
      const oceanH = 9 + n.noise2(x * 0.03, z * 0.03) * 2.5 + (isl > 0.45 ? Math.min((isl - 0.45) * 40, 16) : 0);
      const h = Math.floor(Math.min(landH * land + oceanH * ocean, CH - 12));
      const meadow = forest * smooth(0.2, 0.45, this.n2.noise2(x * 0.006 + 300, z * 0.006 + 300)) * keep * land;
      return {
        h, dunes: dunes * keep * land, peaks: peaks * keep * land, forest: forest * keep * land, meadow, canyon: canyon * land,
        road: road && ocean < 0.5, ocean,
        roadLine: road && ocean < 0.5 && Math.abs(rn) < 0.0045 && ((x + z) & 7) < 4, mesa: canyon > 0.5 && ocean < 0.5 && mesaH > 0,
      };
    }

    biomeName(x, z) {
      const t = this.terrain(Math.floor(x), Math.floor(z));
      if (t.ocean > 0.5) return '🏴‍☠️ Cursed Cove';
      if (t.canyon > 0.5) return '🏁 Tailfin Canyon';
      if (t.peaks > 0.5) return '❄ Crystal Peaks';
      if (t.dunes > 0.5) return '☀ Sunsand Dunes';
      if (t.meadow > 0.5) return '✿ Pixie Meadow';
      return '🌲 Enchanted Forest';
    }

    findSpawn() {
      for (let r = 0; r < 800; r += 4) {
        const steps = r === 0 ? 1 : Math.ceil((2 * Math.PI * r) / 8);
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2, x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
          const t = this.terrain(x, z);
          if (t.h > SEA + 2 && t.peaks < 0.2 && t.dunes < 0.3 && t.canyon < 0.2 && t.ocean < 0.2) return { x, z, y: t.h };
        }
      }
      return { x: 0, z: 0, y: this.terrain(0, 0).h };
    }

    // ------------------------------------------------------------ wishing wells
    wellForRegion(rx, rz) {
      const k = key(rx, rz);
      if (this.wellCache.has(k)) return this.wellCache.get(k);
      let w = null;
      const spawnRegion = Math.floor(this.spawn.x / REG) === rx && Math.floor(this.spawn.z / REG) === rz;
      if (!spawnRegion && MV.hash2(rx * 7 + 3, rz * 13 + 5, this.seed) < 0.45) {
        const x = rx * REG + 16 + Math.floor(MV.hash2(rx, rz, this.seed + 1) * (REG - 32));
        const z = rz * REG + 16 + Math.floor(MV.hash2(rz, rx, this.seed + 2) * (REG - 32));
        const t = this.terrain(x, z);
        if (t.h > SEA + 1 && t.peaks < 0.5 && t.canyon < 0.4 && t.ocean < 0.3) w = { x, z, y: t.h };
      }
      this.wellCache.set(k, w);
      return w;
    }

    wellsInRange(x0, z0, x1, z1) {
      const out = [];
      for (let rx = Math.floor(x0 / REG); rx <= Math.floor(x1 / REG); rx++)
        for (let rz = Math.floor(z0 / REG); rz <= Math.floor(z1 / REG); rz++) {
          const w = this.wellForRegion(rx, rz);
          if (w && w.x >= x0 && w.x <= x1 && w.z >= z0 && w.z <= z1) out.push(w);
        }
      const s = this.spawn;
      if (s.x >= x0 && s.x <= x1 && s.z >= z0 && s.z <= z1) out.push(s);
      return out;
    }

    nearestWell(x, z) {
      const list = this.wellsInRange(x - 140, z - 140, x + 140, z + 140).concat(this.userWells);
      if (this.castle) list.push(this.castle);   // the castle keep is a sanctuary too
      let best = null, bd = Infinity;
      for (const w of list) { const d = Math.hypot(w.x + 0.5 - x, w.z + 0.5 - z); if (d < bd) { bd = d; best = w; } }
      return best ? { well: best, dist: bd } : null;
    }

    // ------------------------------------------------------------ generation
    generate(c) {
      const d = c.data, ox = c.cx * CS, oz = c.cz * CS, seed = this.seed;
      for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
        const wx = ox + x, wz = oz + z;
        const t = this.terrain(wx, wz), h = t.h;
        let top = B.GRASS, fill = B.DIRT, depth = 3;
        const canyon = t.canyon > 0.5;
        if (t.ocean > 0.5) { top = B.SAND; fill = B.SAND; depth = 3; }
        else if (canyon) { top = t.road ? (t.roadLine ? B.ROAD_LINE : B.ASPHALT) : t.mesa ? B.RED_ROCK : B.RED_SAND; fill = t.road ? B.RED_ROCK : top; depth = 2; }
        else if (t.dunes > 0.5) { top = B.SAND; fill = B.SAND; depth = 4; }
        else if (t.peaks > 0.5) {
          const snowLine = 44 + ((MV.hash2(wx, wz, seed + 9) * 3) | 0);
          if (h >= snowLine) { top = B.SNOW; fill = B.STONE; }
          else if (h >= 34) { top = B.STONE; fill = B.STONE; }
        }
        if (h <= SEA + 1 && top !== B.STONE && !canyon) { top = B.SAND; fill = B.SAND; }
        const caves = h > SEA + 3;
        const col = x + z * CS;
        for (let y = 0; y <= h; y++) {
          let id;
          if (y === 0 || (y < 3 && MV.hash3(wx, y, wz, seed) < 0.5)) id = B.RUNESTONE;
          else if (y === h) id = top;
          else if (y > h - depth) id = fill;
          else if (t.dunes > 0.5 && y > h - 9) id = B.SANDSTONE;
          else if (canyon && y > 12) id = B.RED_ROCK;
          else {
            const r = MV.hash3(wx, y, wz, seed + 5);
            id = y < 30 && r < 0.012 ? B.GOLD_ORE : t.peaks > 0.3 && r > 0.994 ? B.CRYSTAL : B.STONE;
          }
          if (caves && y > 3 && y < h - 3 && this.n3.noise3(wx * 0.06, y * 0.09, wz * 0.06) > 0.58) id = B.AIR;
          d[col + y * CS2] = id;
        }
        for (let y = h + 1; y <= SEA; y++) d[col + y * CS2] = B.WATER;
      }
      this.decorate(c);
      const ed = this.editsByChunk.get(key(c.cx, c.cz));   // edits made before this chunk was loaded
      if (ed) for (const [i, id] of ed) d[i] = id;
    }

    decorate(c) {
      const d = c.data, ox = c.cx * CS, oz = c.cz * CS, seed = this.seed;
      const set = (x, y, z, id, force) => {
        const lx = x - ox, lz = z - oz;
        if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 1 || y >= CH) return;
        const i = lx + lz * CS + y * CS2;
        if (force || d[i] === B.AIR) d[i] = id;
      };
      for (let wx = ox - 3; wx < ox + CS + 3; wx++) for (let wz = oz - 3; wz < oz + CS + 3; wz++) {
        const r = MV.hash2(wx, wz, seed + 77);
        if (r > 0.14) continue;
        const inside = wx >= ox && wx < ox + CS && wz >= oz && wz < oz + CS;
        const t = this.terrain(wx, wz), h = t.h;
        const r2 = MV.hash2(wz, wx, seed + 31);
        if (t.ocean > 0.5) {
          if (h < SEA - 1) {
            // Seafloor: kelp forests and glowing coral
            if (!inside) continue;
            if (r < 0.05) { const kh = 1 + ((r2 * Math.min(6, SEA - h - 2)) | 0); for (let i = 1; i <= kh; i++) set(wx, h + i, wz, B.SEAGRASS, true); }
            else if (r < 0.075) { const cid = r2 < 0.5 ? B.CORAL_PINK : B.CORAL_BLUE; set(wx, h + 1, wz, cid, true); if (r2 > 0.3) set(wx, h + 2, wz, cid, true); if (r2 > 0.7) set(wx + 1, h + 1, wz, cid, true); }
          } else if (h > SEA + 1 && r < 0.02) this.palm(set, wx, h, wz, r2);
          continue;
        }
        if (h <= SEA + 1) continue;
        if (t.canyon > 0.5) {
          if (t.road) continue;
          if (t.mesa) { if (inside && r < 0.012) set(wx, h + 1, wz, B.CACTUS); continue; }
          if (r < 0.006) this.cactus(set, wx, h, wz, r2);
          else if (r < 0.0085) this.tailfin(set, wx, h, wz, r2);
          else if (r < 0.011) for (let i = 1; i <= 1 + ((r2 * 3) | 0); i++) set(wx, h + i, wz, B.TIRE, true);
          else if (inside && r < 0.03 && (this.isRoad(wx + 3, wz) || this.isRoad(wx - 3, wz) || this.isRoad(wx, wz + 3) || this.isRoad(wx, wz - 3)))
            set(wx, h + 1, wz, B.TRAFFIC_CONE);
          continue;
        }
        if (t.peaks > 0.5) {
          if (r < 0.01) {
            const hg = 2 + ((r2 * 5) | 0);
            for (let i = 0; i < hg; i++) set(wx, h + 1 + i, wz, B.CRYSTAL, true);
            if (r2 > 0.5) { set(wx + 1, h + 1, wz, B.CRYSTAL); set(wx, h + 1, wz - 1, B.CRYSTAL); }
          } else if (inside && h < 44 && r < 0.03) set(wx, h + 1, wz, r2 < 0.5 ? B.BLUEBELL : B.GLOWCAP);
        } else if (t.dunes > 0.5) {
          if (r < 0.0035) this.palm(set, wx, h, wz, r2);
          else if (r < 0.006) { set(wx, h + 1, wz, B.SANDSTONE, true); set(wx, h + 2, wz, B.SANDSTONE, true); set(wx, h + 3, wz, B.LANTERN, true); }
        } else {
          const meadow = t.meadow > 0.5, tc = meadow ? 0.005 : 0.028;
          if (r < tc) this.tree(set, wx, h, wz, r2, meadow || r2 < 0.3);
          else if (meadow && r < tc + 0.004) { set(wx, h + 1, wz, B.LOG, true); set(wx, h + 2, wz, B.LANTERN, true); }
          else if (inside) {
            if (r < tc + (meadow ? 0.13 : 0.05)) set(wx, h + 1, wz, r2 < 0.55 ? B.ROSE : B.BLUEBELL);
            else if (!meadow && r < 0.1) set(wx, h + 1, wz, B.GLOWCAP);
          }
        }
      }
      for (const w of this.wellsInRange(ox - 4, oz - 4, ox + CS + 4, oz + CS + 4)) this.buildWell(set, w, true);
      for (const s of this.roadsideInRange(ox - 8, oz - 8, ox + CS + 8, oz + CS + 8)) this.buildRoadside(set, s);
      for (const s of this.wrecksInRange(ox - 9, oz - 9, ox + CS + 9, oz + CS + 9)) this.buildWreck(set, s);
      if (this.castle) this.buildCastle(set, c);
    }

    // ------------------------------------------------------------ sunken pirate shipwrecks
    wreckForRegion(rx, rz) {
      const k = key(rx, rz) + 0.25;
      if (this.wellCache.has(k)) return this.wellCache.get(k);
      let s = null;
      const R = 90;
      if (MV.hash2(rx * 3 + 8, rz * 11 + 2, this.seed + 6) < 0.75) {
        const x = rx * R + 14 + Math.floor(MV.hash2(rx, rz, this.seed + 7) * (R - 28));
        const z = rz * R + 14 + Math.floor(MV.hash2(rz, rx, this.seed + 8) * (R - 28));
        const t = this.terrain(x, z);
        if (t.ocean > 0.8 && t.h < SEA - 5) s = { x, z, y: t.h, alongX: MV.hash2(x, z, this.seed + 9) < 0.5 };
      }
      this.wellCache.set(k, s);
      return s;
    }

    wrecksInRange(x0, z0, x1, z1) {
      const out = [], R = 90;
      for (let rx = Math.floor(x0 / R); rx <= Math.floor(x1 / R); rx++)
        for (let rz = Math.floor(z0 / R); rz <= Math.floor(z1 / R); rz++) {
          const s = this.wreckForRegion(rx, rz);
          if (s && s.x >= x0 && s.x <= x1 && s.z >= z0 && s.z <= z1) out.push(s);
        }
      return out;
    }

    nearestWreck(x, z, range) {
      let best = null, bd = range;
      for (const s of this.wrecksInRange(x - range, z - range, x + range, z + range)) {
        const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; }
      }
      return best;
    }

    buildWreck(set, s) {
      const { x, z, y: h, alongX } = s;
      const P = (a, y, b, id) => (alongX ? set(x + a, y, z + b, id, true) : set(x + b, y, z + a, id, true));
      for (let a = -7; a <= 7; a++) {
        const w = Math.max(1, Math.round(3 * Math.sqrt(Math.max(0, 1 - (a / 7.6) ** 2))));
        const lift = a > 3 ? 1 : 0; // the stern sits higher, like it settled at an angle
        for (let b = -w; b <= w; b++) P(a, h + 1 + lift, b, B.SHIP_PLANK);
        for (let y = 2; y <= 3 + lift; y++) { P(a, h + y, -w, B.SHIP_PLANK); P(a, h + y, w, B.SHIP_PLANK); }
        if (Math.abs(a) === 7) for (let b = -w; b <= w; b++) for (let y = 2; y <= 3 + lift; y++) P(a, h + y, b, B.SHIP_PLANK);
        // Broken deck with holes
        if (a > -4) for (let b = -w + 1; b <= w - 1; b++) if (MV.hash3(x + a, h, z + b, this.seed) > 0.35) P(a, h + 4 + lift, b, B.SHIP_PLANK);
      }
      for (let y = 2; y <= 12; y++) P(-1, h + y, 0, B.LOG);           // main mast
      for (let y = 6; y <= 10; y++) for (let b = -2; b <= 2; b++) if (MV.hash3(x + b, y, z, this.seed + 1) > 0.2) P(-2, h + y, b, B.SAIL);
      for (let y = 2; y <= 7; y++) P(5, h + y, 0, B.LOG);             // snapped rear mast
      P(2, h + 2, 0, B.TREASURE);                                      // the loot!
      P(-4, h + 2, 1, B.TREASURE);
      P(3, h + 2, -1, B.LANTERN);
    }

    isRoad(x, z) { return Math.abs(this.n2.noise2(x * 0.005 + 900, z * 0.005 + 900)) < 0.028; }

    cactus(set, x, h, z, r) {
      const th = 3 + ((r * 3) | 0);
      for (let i = 1; i <= th; i++) set(x, h + i, z, B.CACTUS, true);
      if (r > 0.3) { set(x + 1, h + 2, z, B.CACTUS); set(x + 2, h + 2, z, B.CACTUS); set(x + 2, h + 3, z, B.CACTUS); }
      if (r > 0.6) { set(x - 1, h + 3, z, B.CACTUS); set(x - 2, h + 3, z, B.CACTUS); set(x - 2, h + 4, z, B.CACTUS); }
    }

    // Red-rock buttes shaped like classic car tailfins, with a glowing tail-light tip
    tailfin(set, x, h, z, r) {
      const ht = 8 + ((r * 6) | 0), dir = r > 0.5 ? 1 : -1;
      for (let i = 0; i < ht; i++) {
        const lean = i > ht - 5 ? (i - (ht - 5)) * dir : 0;
        for (let w = 0; w < (i < 3 ? 3 : 2); w++) set(x + lean, h + 1 + i, z + w, B.RED_ROCK, true);
      }
      set(x + 4 * dir, h + ht, z, B.NEON, true);
    }

    // Cone motels and gas stations along Route 66-style roads
    roadsideForRegion(rx, rz) {
      const k = key(rx, rz) + 0.5;
      if (this.wellCache.has(k)) return this.wellCache.get(k);
      let s = null;
      const R = 80;
      if (MV.hash2(rx * 5 + 1, rz * 9 + 7, this.seed + 3) < 0.7) {
        const x = rx * R + 12 + Math.floor(MV.hash2(rx, rz, this.seed + 4) * (R - 24));
        const z = rz * R + 12 + Math.floor(MV.hash2(rz, rx, this.seed + 5) * (R - 24));
        const t = this.terrain(x, z);
        if (t.canyon > 0.75 && !t.mesa && !t.road) s = { x, z, y: t.h, kind: MV.hash2(x, z, this.seed) < 0.5 ? 'motel' : 'gas' };
      }
      this.wellCache.set(k, s);
      return s;
    }

    roadsideInRange(x0, z0, x1, z1) {
      const out = [], R = 80;
      for (let rx = Math.floor(x0 / R); rx <= Math.floor(x1 / R); rx++)
        for (let rz = Math.floor(z0 / R); rz <= Math.floor(z1 / R); rz++) {
          const s = this.roadsideForRegion(rx, rz);
          if (s && s.x >= x0 && s.x <= x1 && s.z >= z0 && s.z <= z1) out.push(s);
        }
      return out;
    }

    buildRoadside(set, s) {
      const { x, z, y: h } = s;
      for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) {
        const th = this.terrain(x + dx, z + dz).h;
        for (let y = th + 1; y < h; y++) set(x + dx, y, z + dz, B.RED_ROCK, true);
        set(x + dx, h, z + dz, Math.abs(dz) >= 4 || s.kind === 'gas' ? B.ASPHALT : B.RED_SAND, true);
        for (let y = h + 1; y <= h + 12; y++) set(x + dx, y, z + dz, B.AIR, true);
      }
      if (s.kind === 'motel') {
        // A big hollow traffic-cone motel room with a door, windows and a neon sign
        for (let y = 0; y <= 8; y++) {
          const r = 3.6 - y * 0.42;
          for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
            const d = Math.hypot(dx, dz);
            if (d <= r && d > r - 1.25) set(x + dx, h + 1 + y, z + dz, B.CONE_BLOCK, true);
          }
        }
        set(x, h + 10, z, B.NEON, true);
        for (let y = 1; y <= 2; y++) for (let dz = 1; dz <= 4; dz++) set(x, h + y, z + dz, B.AIR, true);
        set(x + 3, h + 2, z, B.GLASS, true); set(x - 3, h + 2, z, B.GLASS, true);
        set(x, h + 3, z, B.LANTERN, true);
        for (let y = 1; y <= 4; y++) set(x + 6, h + y, z + 5, B.CHROME, true);
        for (let dx = 4; dx <= 7; dx++) set(x + dx, h + 5, z + 5, B.NEON, true);
        set(x - 5, h + 1, z + 5, B.TRAFFIC_CONE, true); set(x - 3, h + 1, z + 6, B.TRAFFIC_CONE, true);
      } else {
        // Gas station: chrome pillars, neon-trimmed canopy, glowing pumps, tire stack
        for (const sx of [-4, 4]) for (const sz of [-3, 3]) for (let y = 1; y <= 3; y++) set(x + sx, h + y, z + sz, B.CHROME, true);
        for (let dx = -5; dx <= 5; dx++) for (let dz = -4; dz <= 4; dz++)
          set(x + dx, h + 4, z + dz, Math.abs(dx) === 5 || Math.abs(dz) === 4 ? B.NEON : B.CHROME, true);
        for (const sx of [-2, 2]) { set(x + sx, h + 1, z, B.CHROME, true); set(x + sx, h + 2, z, B.NEON, true); }
        for (let y = 1; y <= 3; y++) set(x + 6, h + y, z - 5, B.TIRE, true);
        for (let y = 1; y <= 2; y++) set(x + 7, h + y, z - 5, B.TIRE, true);
        for (const sx of [-6, 6]) set(x + sx, h + 1, z + 6, B.TRAFFIC_CONE, true);
        set(x, h + 3, z, B.LANTERN, true);
      }
    }

    tree(set, x, h, z, r, blossom) {
      const th = 4 + ((r * 3) | 0), leaf = blossom ? B.BLOSSOM : B.LEAVES, top = h + th;
      const radii = [2.3, 2.8, 2.8, 2.0, 1.2];
      for (let dy = -2; dy <= 2; dy++) {
        const rad = radii[dy + 2];
        for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
          const d2 = dx * dx + dz * dz;
          if (d2 > rad * rad) continue;
          if (d2 > (rad - 0.9) * (rad - 0.9) && MV.hash3(x + dx, top + dy, z + dz, this.seed) < 0.4) continue;
          set(x + dx, top + dy, z + dz, leaf);
        }
      }
      for (let i = 1; i <= th; i++) set(x, h + i, z, B.LOG, true);
    }

    palm(set, x, h, z, r) {
      const th = 5 + ((r * 2) | 0), top = h + th;
      for (let i = 1; i <= th; i++) set(x, h + i, z, B.LOG, true);
      set(x, top + 1, z, B.LEAVES);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        for (let i = 1; i <= 3; i++) set(x + dx * i, top - (i === 3 ? 1 : 0), z + dz * i, B.LEAVES);
      for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]])
        for (let i = 1; i <= 2; i++) set(x + dx * i, top - (i === 2 ? 1 : 0), z + dz * i, B.LEAVES);
    }

    // A Wishing Well: stone ring of water, log posts, royal roof and a lantern.
    buildWell(set, w, pad) {
      const { x, z, y: h } = w;
      if (pad) {
        for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
          const th = this.terrain(x + dx, z + dz).h;
          for (let y = th + 1; y < h; y++) set(x + dx, y, z + dz, B.DIRT, true);
          set(x + dx, h, z + dz, B.GRASS, true);
          for (let y = h + 1; y <= h + 9; y++) set(x + dx, y, z + dz, B.AIR, true);
        }
      }
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        const m = Math.max(Math.abs(dx), Math.abs(dz));
        if (m === 2) {
          for (let y = h - 2; y <= h + 1; y++) set(x + dx, y, z + dz, B.WELLSTONE, true);
        } else {
          set(x + dx, h - 3, z + dz, B.WELLSTONE, true);
          for (let y = h - 2; y <= h; y++) set(x + dx, y, z + dz, B.WATER, true);
          for (let y = h + 1; y <= h + 3; y++) set(x + dx, y, z + dz, B.AIR, true);
          set(x + dx, h + 5, z + dz, B.ROOF, true);
        }
        set(x + dx, h + 4, z + dz, B.ROOF, true);
      }
      for (const sx of [-2, 2]) for (const sz of [-2, 2]) { set(x + sx, h + 2, z + sz, B.LOG, true); set(x + sx, h + 3, z + sz, B.LOG, true); }
      for (const [dx, dz] of [[0, 2], [0, -2], [2, 0], [-2, 0], [1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]])
        for (let y = h + 2; y <= h + 3; y++) set(x + dx, y, z + dz, B.AIR, true);
      set(x, h + 6, z, B.GOLD, true);
      set(x, h + 3, z, B.LANTERN, true);
      if (pad) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) === 3 && (dx + dz) % 2 === 0) set(x + dx, h + 1, z + dz, (dx + 7) % 4 < 2 ? B.ROSE : B.BLUEBELL, true);
      }
    }

    buildWellAt(x, h, z) {
      const set = (bx, by, bz, id, force) => { if (force || this.getBlock(bx, by, bz) === B.AIR) this.setBlock(bx, by, bz, id); };
      const w = { x, z, y: h };
      this.buildWell(set, w, false);
      this.userWells.push(w);
      return w;
    }

    // ------------------------------------------------------------ access
    getChunk(cx, cz) { return this.chunks.get(key(cx, cz)); }

    getBlock(x, y, z) {
      if (y < 0) return B.RUNESTONE;
      if (y >= CH) return 0;
      const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
      const c = this.chunks.get(key(cx, cz));
      if (!c) return 0;
      return c.data[(x - cx * CS) + (z - cz * CS) * CS + y * CS2];
    }

    isSolid(x, y, z) {
      if (y < 0) return true;
      if (y >= CH) return false;
      const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
      const c = this.chunks.get(key(cx, cz));
      if (!c) return true; // unloaded ground is treated as solid so nothing falls out of the world
      return BLOCKS[c.data[(x - cx * CS) + (z - cz * CS) * CS + y * CS2]].solid;
    }

    setBlock(x, y, z, id) {
      if (y < 0 || y >= CH) return false;
      const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
      this.edits.set(x + ',' + y + ',' + z, id);
      const ck = key(cx, cz);
      if (!this.editsByChunk.has(ck)) this.editsByChunk.set(ck, new Map());
      this.editsByChunk.get(ck).set((x - cx * CS) + (z - cz * CS) * CS + y * CS2, id);
      const c = this.getChunk(cx, cz);
      if (!c) return false;
      const lx = x - cx * CS, lz = z - cz * CS;
      c.data[lx + lz * CS + y * CS2] = id;
      const mark = (dx, dz) => { const n = this.getChunk(cx + dx, cz + dz); if (n) { n.dirty = true; this.pending.add(n); } };
      mark(0, 0);
      const ex = lx === 0 ? -1 : lx === CS - 1 ? 1 : 0, ez = lz === 0 ? -1 : lz === CS - 1 ? 1 : 0;
      if (ex) mark(ex, 0);
      if (ez) mark(0, ez);
      if (ex && ez) mark(ex, ez);
      if (!this.flowing) this.checkSpill(x, y, z, id);
      return true;
    }

    // ------------------------------------------------------------ flowing water
    // Water is a simple full-block fluid: it pours into any gap opened beside or beneath it,
    // falls as far as it can, and spreads up to FLOW_REACH blocks sideways wherever it lands.
    checkSpill(x, y, z, id) {
      const W = B.WATER;
      if (id === B.AIR) {
        if (this.fedByWater(x, y, z)) this.flowQ.push([x, y, z, 0]);
      } else if (id === W) this.spreadFrom(x, y, z, 0);   // a water block was placed by hand
    }

    // Water beside or above this cell? Underwater plants (kelp, seagrass) count as water.
    isWet(x, y, z) { const id = this.getBlock(x, y, z); return id === B.WATER || (y <= SEA && BLOCKS[id].cross); }
    fedByWater(x, y, z) {
      return this.isWet(x, y + 1, z) || this.isWet(x + 1, y, z) || this.isWet(x - 1, y, z) || this.isWet(x, y, z + 1) || this.isWet(x, y, z - 1);
    }

    spreadFrom(x, y, z, d) {
      if (y > 0 && this.getBlock(x, y - 1, z) === B.AIR) { this.flowQ.push([x, y - 1, z, 0]); return; }   // falling
      if (d >= 4) return;                                                                                     // FLOW_REACH
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        if (this.getBlock(x + dx, y, z + dz) === B.AIR && this.getChunk(Math.floor((x + dx) / CS), Math.floor((z + dz) / CS))) this.flowQ.push([x + dx, y, z + dz, d + 1]);
    }

    updateFlow(dt) {
      if (!this.flowQ.length) { this.flowBudget = 600; return; }
      if ((this.flowT -= dt) > 0) return;
      this.flowT = 0.12;                       // one step of flow every ~1/8 s, so you can watch it pour
      const batch = this.flowQ, W = B.WATER;
      this.flowQ = [];
      this.flowing = true;
      for (const [x, y, z, d] of batch) {
        if (this.flowBudget <= 0) break;       // a single spill can't flood the whole underground
        if (y < 1 || this.getBlock(x, y, z) !== B.AIR) continue;
        if (!this.fedByWater(x, y, z) || !this.setBlock(x, y, z, W)) continue;
        this.flowBudget--;
        this.spreadFrom(x, y, z, d);
      }
      this.flowing = false;
    }

    surfaceY(x, z) {
      if (!this.getChunk(Math.floor(x / CS), Math.floor(z / CS))) return null;
      for (let y = CH - 1; y > 0; y--) {
        const id = this.getBlock(x, y, z);
        if (id && !BLOCKS[id].cross) return { y: y + 1, id };
      }
      return null;
    }

    // Amanatides & Woo voxel traversal.
    raycast(o, d, max, accept) {
      let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
      const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
      const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
      let tx = d.x !== 0 ? (d.x > 0 ? x + 1 - o.x : o.x - x) * tdx : Infinity;
      let ty = d.y !== 0 ? (d.y > 0 ? y + 1 - o.y : o.y - y) * tdy : Infinity;
      let tz = d.z !== 0 ? (d.z > 0 ? z + 1 - o.z : o.z - z) * tdz : Infinity;
      let nx = 0, ny = 0, nz = 0, t = 0;
      for (let i = 0; i < 400; i++) {
        const id = this.getBlock(x, y, z);
        if (id && accept(id)) return { x, y, z, id, nx, ny, nz, dist: t };
        if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
        else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
        else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
        if (t > max) break;
      }
      return null;
    }

    // ------------------------------------------------------------ streaming
    neighborsReady(cx, cz) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (!this.getChunk(cx + dx, cz + dz)) return false;
      return true;
    }

    step(pcx, pcz, budgetMs) {
      const t0 = performance.now(), R = this.renderDist;
      for (const o of this.offsets) {
        if (performance.now() - t0 > budgetMs) return false;
        const cx = pcx + o[0], cz = pcz + o[1];
        let c = this.getChunk(cx, cz);
        if (!c) { c = new Chunk(cx, cz); this.chunks.set(key(cx, cz), c); this.generate(c); continue; }
        if (o[2] <= R && c.dirty && this.neighborsReady(cx, cz)) this.buildMesh(c);
      }
      return true;
    }

    update(px, pz) {
      const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
      this.step(pcx, pcz, 6);
      if (++this.frame % 60 === 0) {
        const lim = this.renderDist + 1.5;
        for (const c of this.chunks.values())
          if (c.meshes && Math.hypot(c.cx - pcx, c.cz - pcz) > lim) { this.disposeMeshes(c); c.dirty = true; }
      }
    }

    // Rebuild edited chunks immediately so block changes feel instant.
    flush() {
      for (const c of this.pending) if (c.meshes && c.dirty) this.buildMesh(c);
      this.pending.clear();
    }

    preload(px, pz, radius, onProgress) {
      const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
      const need = this.offsets.filter(o => o[2] <= radius);
      return new Promise(resolve => {
        const tick = () => {
          this.step(pcx, pcz, 40);
          let done = 0;
          for (const o of need) { const c = this.getChunk(pcx + o[0], pcz + o[1]); if (c && !c.dirty) done++; }
          onProgress(done / need.length);
          if (done >= need.length) resolve(); else setTimeout(tick, 0);
        };
        tick();
      });
    }

    get chunkCount() { let n = 0; for (const c of this.chunks.values()) if (c.meshes) n++; return n; }

    disposeMeshes(c) {
      if (!c.meshes) return;
      for (const m of c.meshes) if (m) { this.scene.remove(m); m.geometry.dispose(); }
      c.meshes = null;
    }

    // ------------------------------------------------------------ meshing
    buildMesh(c) {
      const nb = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) nb.push(this.getChunk(c.cx + dx, c.cz + dz));
      const data = c.data;
      const get = (x, y, z) => {
        if (y < 0) return B.RUNESTONE;
        if (y >= CH) return 0;
        if (x >= 0 && x < CS && z >= 0 && z < CS) return data[x + z * CS + y * CS2];
        const dx = x < 0 ? -1 : x >= CS ? 1 : 0, dz = z < 0 ? -1 : z >= CS ? 1 : 0;
        const n = nb[dx + 1 + (dz + 1) * 3];
        return n ? n.data[x - dx * CS + (z - dz * CS) * CS + y * CS2] : 0;
      };
      const mk = () => ({ p: [], u: [], c: [], i: [], n: 0 });
      const bk = [mk(), mk(), mk()];
      const ao = [0, 0, 0, 0];

      for (let y = 0; y < CH; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
        const id = data[x + z * CS + y * CS2];
        if (!id) continue;
        const def = BLOCKS[id];
        const b = bk[def.glow ? 2 : def.transparent ? 1 : 0];
        if (def.cross) { addCross(b, x, y, z, def.side); continue; }
        const flat = def.glow || def.transparent;
        for (let fi = 0; fi < 6; fi++) {
          const f = FACES[fi];
          const nid = get(x + f.n[0], y + f.n[1], z + f.n[2]);
          if (nid === id || BLOCKS[nid].opaque) continue;
          if (id === B.WATER && BLOCKS[nid].cross) continue; // plants underwater are 'water-logged'
          const uv = MV.tileUV(fi === 3 ? def.top : fi === 2 ? def.bottom : def.side);
          for (let k = 0; k < 4; k++) {
            if (flat) { ao[k] = 3; continue; }
            const o = f.ao[k];
            const s1 = BLOCKS[get(x + o[0][0], y + o[0][1], z + o[0][2])].opaque ? 1 : 0;
            const s2 = BLOCKS[get(x + o[1][0], y + o[1][1], z + o[1][2])].opaque ? 1 : 0;
            const cr = BLOCKS[get(x + o[2][0], y + o[2][1], z + o[2][2])].opaque ? 1 : 0;
            ao[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
          }
          const waterTop = id === B.WATER && get(x, y + 1, z) !== B.WATER;
          for (let k = 0; k < 4; k++) {
            const cc = f.c[k];
            b.p.push(x + cc[0], y + (cc[1] && waterTop ? 0.88 : cc[1]), z + cc[2]);
            b.u.push(uv[0] + cc[3] * (uv[2] - uv[0]), uv[1] + cc[4] * (uv[3] - uv[1]));
            const l = f.shade * AO[ao[k]];
            b.c.push(l, l, l);
          }
          const n = b.n;
          if (ao[0] + ao[3] > ao[1] + ao[2]) b.i.push(n, n + 1, n + 3, n, n + 3, n + 2);
          else b.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3);
          b.n += 4;
        }
      }

      this.disposeMeshes(c);
      const mats = [this.matOpaque, this.matTrans, this.matGlow];
      c.meshes = bk.map((b, i) => {
        if (!b.n) return null;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
        g.setIndex(b.i);
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mats[i]);
        m.position.set(c.cx * CS, 0, c.cz * CS);
        m.matrixAutoUpdate = false;
        m.updateMatrix();
        if (i === 1) m.renderOrder = 1;
        this.scene.add(m);
        return m;
      });
      c.dirty = false;
    }
  }

  function addCross(b, x, y, z, tile) {
    const uv = MV.tileUV(tile);
    const quads = [[0.15, 0.15, 0.85, 0.85], [0.15, 0.85, 0.85, 0.15]];
    for (const [ax, az, bx, bz] of quads) {
      const n = b.n;
      b.p.push(x + ax, y, z + az, x + bx, y, z + bz, x + ax, y + 1, z + az, x + bx, y + 1, z + bz);
      b.u.push(uv[0], uv[1], uv[2], uv[1], uv[0], uv[3], uv[2], uv[3]);
      for (let k = 0; k < 4; k++) b.c.push(0.95, 0.95, 0.95);
      b.i.push(n, n + 1, n + 2, n + 2, n + 1, n + 3, n, n + 2, n + 1, n + 2, n + 3, n + 1);
      b.n += 4;
    }
  }

  MV.World = World;
})();
