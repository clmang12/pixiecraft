/* MagicaVoxel Kingdom — block registry, procedural texture atlas and UI icons.
   Every texture is painted pixel-by-pixel at startup: no image files needed. */
(function () {
  'use strict';
  const MV = (window.MV = window.MV || {});

  const B = (MV.B = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, SANDSTONE: 5, CRYSTAL: 6, SNOW: 7, LOG: 8,
    LEAVES: 9, BLOSSOM: 10, BRICK: 11, GLASS: 12, GOLD: 13, LANTERN: 14, ROSE: 15, BLUEBELL: 16,
    GLOWCAP: 17, WATER: 18, WELLSTONE: 19, ROOF: 20, GOLD_ORE: 21, CLOUD: 22, RUNESTONE: 23, PLANKS: 24,
    RED_ROCK: 25, RED_SAND: 26, ASPHALT: 27, ROAD_LINE: 28, CACTUS: 29, NEON: 30, TIRE: 31, CONE_BLOCK: 32,
    TRAFFIC_CONE: 33, CHROME: 34,
    CORAL_PINK: 35, CORAL_BLUE: 36, SEAGRASS: 37, SHIP_PLANK: 38, TREASURE: 39, SAIL: 40,
  });
  const ITEM = (MV.ITEM = { WAND: 100, DUST: 101, WELL: 102, SCARAB: 103, BUCKET: 104, DARKSTAR: 105, ACORN: 106, FROSTHORN: 107, PEARL: 108 });

  const T = {
    GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, SAND: 4, SS_SIDE: 5, SS_TOP: 6, CRYSTAL: 7, SNOW: 8,
    LOG_SIDE: 9, LOG_TOP: 10, LEAVES: 11, BLOSSOM: 12, BRICK: 13, GLASS: 14, GOLD: 15, LANTERN: 16, ROSE: 17,
    BLUEBELL: 18, GLOWCAP: 19, WATER: 20, WELLSTONE: 21, ROOF: 22, GOLD_ORE: 23, CLOUD: 24, RUNESTONE: 25, PLANKS: 26,
    RR_TOP: 27, RR_SIDE: 28, RED_SAND: 29, ASPHALT: 30, ROADLINE: 31, CACTUS_SIDE: 32, CACTUS_TOP: 33, NEON: 34,
    TIRE_SIDE: 35, TIRE_TOP: 36, CONEB_SIDE: 37, CONEB_TOP: 38, TRAFFIC_CONE: 39, CHROME: 40,
    CORAL_PINK: 41, CORAL_BLUE: 42, SEAGRASS: 43, SHIP_PLANK: 44, CHEST_SIDE: 45, CHEST_TOP: 46, SAIL: 47,
  };
  const TS = 16, COLS = 16, ROWS = 4;

  // ---------------------------------------------------------------- registry
  const BLOCKS = (MV.BLOCKS = []);
  function def(id, name, tiles, color, o) {
    BLOCKS[id] = Object.assign({
      id, name,
      top: tiles[0], side: tiles.length > 1 ? tiles[1] : tiles[0], bottom: tiles.length > 2 ? tiles[2] : tiles[0],
      solid: true, opaque: true, transparent: false, glow: false, cross: false, hardness: 0.8, color,
    }, o || {});
  }
  BLOCKS[0] = { id: 0, name: 'Air', solid: false, opaque: false, transparent: false, glow: false, cross: false, hardness: 0, color: '#000' };
  const PLANT = { solid: false, opaque: false, cross: true, hardness: 0.05 };
  const LEAF = { opaque: false, hardness: 0.25 };

  def(B.GRASS, 'Pixie-Dust Grass', [T.GRASS_TOP, T.GRASS_SIDE, T.DIRT], '#5fd35f', { hardness: 0.55 });
  def(B.DIRT, 'Enchanted Soil', [T.DIRT], '#8a5a3c', { hardness: 0.5 });
  def(B.STONE, 'Magic Stone', [T.STONE], '#9a8fb8', { hardness: 1.3 });
  def(B.SAND, 'Sunsand', [T.SAND], '#f2d58c', { hardness: 0.45 });
  def(B.SANDSTONE, 'Dune Sandstone', [T.SS_TOP, T.SS_SIDE, T.SS_TOP], '#e2c283', { hardness: 1.0 });
  def(B.CRYSTAL, 'Glimmer Crystal', [T.CRYSTAL], '#8ff0ff', { glow: true, hardness: 1.0 });
  def(B.SNOW, 'Starlit Snow', [T.SNOW], '#f4f8ff', { hardness: 0.4 });
  def(B.LOG, 'Enchanted Log', [T.LOG_TOP, T.LOG_SIDE, T.LOG_TOP], '#7a4e34', { hardness: 0.9 });
  def(B.LEAVES, 'Whisperleaf', [T.LEAVES], '#3fae74', LEAF);
  def(B.BLOSSOM, 'Fairy Blossom', [T.BLOSSOM], '#ff9ccd', LEAF);
  def(B.BRICK, 'Castle Brick', [T.BRICK], '#f7e8ef', { hardness: 1.3 });
  def(B.GLASS, 'Palace Glass', [T.GLASS], '#cfefff', { opaque: false, transparent: true, hardness: 0.3 });
  def(B.GOLD, 'Royal Gold', [T.GOLD], '#ffcc40', { hardness: 1.5 });
  def(B.LANTERN, 'Pixie Lantern', [T.LANTERN], '#ffe89a', { glow: true, hardness: 0.4 });
  def(B.ROSE, 'Enchanted Rose', [T.ROSE], '#ff4f86', PLANT);
  def(B.BLUEBELL, 'Moon Bluebell', [T.BLUEBELL], '#8aa0ff', PLANT);
  def(B.GLOWCAP, 'Glowcap Mushroom', [T.GLOWCAP], '#b86bff', Object.assign({ glow: true }, PLANT));
  def(B.WATER, 'Wishing Water', [T.WATER], '#3b86e8', { solid: false, opaque: false, transparent: true, hardness: Infinity });
  def(B.WELLSTONE, 'Well Stone', [T.WELLSTONE], '#8d8fa6', { hardness: 1.2 });
  def(B.ROOF, 'Royal Roof Tile', [T.ROOF], '#4a6fe0', { hardness: 1.0 });
  def(B.GOLD_ORE, 'Gold Ore', [T.GOLD_ORE], '#ffd24a', { hardness: 1.6 });
  def(B.CLOUD, 'Cloud Puff', [T.CLOUD], '#ffffff', { hardness: 0.3 });
  def(B.RUNESTONE, 'Deep Runestone', [T.RUNESTONE], '#3a2a5a', { hardness: Infinity });
  def(B.PLANKS, 'Starwood Planks', [T.PLANKS], '#c9955f', { hardness: 0.7 });
  // Tailfin Canyon (road-trip / Cars-style biome)
  def(B.RED_ROCK, 'Canyon Red Rock', [T.RR_TOP, T.RR_SIDE], '#c8603a', { hardness: 1.2 });
  def(B.RED_SAND, 'Red Desert Sand', [T.RED_SAND], '#e2804e', { hardness: 0.45 });
  def(B.ASPHALT, 'Route Asphalt', [T.ASPHALT], '#3a3a40', { hardness: 1.0 });
  def(B.ROAD_LINE, 'Road Stripe', [T.ROADLINE, T.ASPHALT, T.ASPHALT], '#ffd428', { hardness: 1.0 });
  def(B.CACTUS, 'Saguaro Cactus', [T.CACTUS_TOP, T.CACTUS_SIDE], '#46964a', { hardness: 0.4 });
  def(B.NEON, 'Neon Sign', [T.NEON], '#ff50c8', { glow: true, hardness: 0.4 });
  def(B.TIRE, 'Tire Stack', [T.TIRE_TOP, T.TIRE_SIDE], '#222226', { hardness: 0.6 });
  def(B.CONE_BLOCK, 'Cone Motel Block', [T.CONEB_TOP, T.CONEB_SIDE], '#ff8c28', { hardness: 0.8 });
  def(B.TRAFFIC_CONE, 'Traffic Cone', [T.TRAFFIC_CONE], '#ff8220', PLANT);
  def(B.CHROME, 'Polished Chrome', [T.CHROME], '#d0d4dc', { hardness: 1.4 });
  // Cursed Cove (pirate sea)
  def(B.CORAL_PINK, 'Glow Coral', [T.CORAL_PINK], '#ff6ea8', { glow: true, hardness: 0.5 });
  def(B.CORAL_BLUE, 'Tide Coral', [T.CORAL_BLUE], '#50b4ff', { glow: true, hardness: 0.5 });
  def(B.SEAGRASS, 'Sea Kelp', [T.SEAGRASS], '#3fae5a', PLANT);
  def(B.SHIP_PLANK, 'Shipwreck Planks', [T.SHIP_PLANK], '#60463a', { hardness: 0.7 });
  def(B.TREASURE, 'Treasure Chest', [T.CHEST_TOP, T.CHEST_SIDE], '#ffcc40', { glow: true, hardness: 0.8 });
  def(B.SAIL, 'Black Sail', [T.SAIL], '#1e1e22', { opaque: false, hardness: 0.2 });
  for (let i = 1; i < 256; i++) if (!BLOCKS[i]) BLOCKS[i] = BLOCKS[0];
  BLOCKS[B.TREASURE].loot = [[B.GOLD, 3], [B.CRYSTAL, 2], [ITEM.DUST, 2], [B.GOLD_ORE, 4]];

  MV.ITEMS = {
    [ITEM.WAND]: { name: 'Magic Wand', desc: 'LMB: star bolt · RMB: instant long-range break' },
    [ITEM.DUST]: { name: 'Pixie Dust', desc: 'RMB: +40 magic and enables pixie glide' },
    [ITEM.WELL]: { name: 'Wishing Well', desc: 'RMB on ground: build a well & set your spawn' },
    [ITEM.SCARAB]: { name: 'Cursed Scarab', desc: 'RMB: awaken the Sand Pharaoh (boss)' },
    [ITEM.BUCKET]: { name: 'Enchanted Bucket', desc: 'RMB: summon the Mop King (boss)' },
    [ITEM.DARKSTAR]: { name: 'Dark Crystal', desc: 'RMB: call down the Shadow Dragon (boss)' },
    [ITEM.ACORN]: { name: 'Cursed Acorn', desc: 'RMB: awaken a Tree Monster (boss)' },
    [ITEM.PEARL]: { name: 'Abyssal Pearl', desc: 'RMB near deep water: summon the Kraken (boss)' },
    [ITEM.FROSTHORN]: { name: 'Frost Horn', desc: 'RMB: blow it to challenge the Yeti (boss)' },
  };
  MV.isBlock = id => id > 0 && id < 100;
  MV.itemName = id => (id >= 100 ? MV.ITEMS[id].name : BLOCKS[id].name);
  MV.PALETTE = [
    ITEM.WAND, ITEM.DUST, ITEM.WELL, ITEM.SCARAB, ITEM.BUCKET, ITEM.DARKSTAR, ITEM.ACORN, ITEM.FROSTHORN, ITEM.PEARL,
    B.GRASS, B.DIRT, B.STONE, B.SAND, B.SANDSTONE, B.SNOW, B.CLOUD,
    B.BRICK, B.PLANKS, B.LOG, B.ROOF, B.WELLSTONE, B.GLASS, B.GOLD, B.GOLD_ORE,
    B.CRYSTAL, B.LANTERN, B.LEAVES, B.BLOSSOM, B.ROSE, B.BLUEBELL, B.GLOWCAP, B.WATER, B.RUNESTONE,
    B.RED_ROCK, B.RED_SAND, B.ASPHALT, B.ROAD_LINE, B.CACTUS, B.NEON, B.TIRE, B.CONE_BLOCK, B.TRAFFIC_CONE, B.CHROME,
    B.CORAL_PINK, B.CORAL_BLUE, B.SEAGRASS, B.SHIP_PLANK, B.TREASURE, B.SAIL,
  ];

  // ---------------------------------------------------------------- texture painters
  const SPARK = [[255, 247, 168], [255, 255, 255], [255, 179, 240], [179, 247, 255]];
  const each = fn => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) fn(x, y); };
  const ri = (r, n) => (r() * n) | 0;

  function dirt(s, r) {
    each((x, y) => { const v = (r() - 0.5) * 30; s(x, y, 128 + v, 84 + v * 0.8, 58 + v * 0.6); });
    for (let k = 0; k < 10; k++) s(ri(r, 16), ri(r, 16), 96, 62, 44);
  }
  function stone(s, r) {
    each((x, y) => { const v = (r() - 0.5) * 24; s(x, y, 140 + v, 131 + v, 164 + v); });
    for (let k = 0; k < 2; k++) {
      let x = ri(r, 16), y = ri(r, 16);
      for (let i = 0; i < 9; i++) { s(x, y, 176, 122, 230); x = (x + ri(r, 3) - 1 + 16) % 16; y = (y + (r() < 0.6 ? 1 : 0)) % 16; }
    }
    for (let k = 0; k < 3; k++) s(ri(r, 16), ri(r, 16), 236, 226, 255);
  }

  const P = [];
  P[T.GRASS_TOP] = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 30, g = (r() - 0.5) * 40; s(x, y, 80 + v, 196 + g, 96 + v); });
    for (let k = 0; k < 7; k++) s(ri(r, 16), ri(r, 16), ...SPARK[ri(r, 4)]);
  };
  P[T.DIRT] = dirt;
  P[T.GRASS_SIDE] = (s, r) => {
    dirt(s, r);
    for (let x = 0; x < TS; x++) {
      const d = 2 + (r() < 0.5 ? 1 : 0) + (r() < 0.25 ? 1 : 0);
      for (let y = 0; y < d; y++) { const v = (r() - 0.5) * 30; s(x, y, 80 + v, 190 + v, 96 + v); }
    }
    s(ri(r, 16), ri(r, 2), 255, 247, 168);
    s(ri(r, 16), ri(r, 2), 255, 179, 240);
  };
  P[T.STONE] = stone;
  P[T.SAND] = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 18; s(x, y, 240 + v, 212 + v, 142 + v); });
    for (let k = 0; k < 12; k++) s(ri(r, 16), ri(r, 16), 214, 184, 116);
    s(ri(r, 16), ri(r, 16), 255, 250, 220);
  };
  P[T.SS_SIDE] = (s, r) => each((x, y) => {
    const band = y < 3 ? 0 : y < 4 ? 1 : y < 10 ? 2 : y < 11 ? 1 : 2;
    const b = band === 0 ? [238, 210, 146] : band === 1 ? [196, 162, 98] : [226, 194, 128];
    const v = (r() - 0.5) * 12; s(x, y, b[0] + v, b[1] + v, b[2] + v);
  });
  P[T.SS_TOP] = (s, r) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    const v = (r() - 0.5) * 10;
    if (edge) s(x, y, 212 + v, 180 + v, 116 + v); else s(x, y, 236 + v, 208 + v, 142 + v);
  });
  P[T.CRYSTAL] = (s, r) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) return s(x, y, 80, 170, 230);
    const f = ((x * 2 + y) >> 2) % 2 ? 1 : 0.84;
    if ((x + y) % 7 === 0 || (x - y + 16) % 11 === 0) return s(x, y, 236, 255, 255);
    const v = (r() - 0.5) * 16;
    s(x, y, 120 * f + v, 226 * f + v, 255 * f);
  });
  P[T.SNOW] = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 10; s(x, y, 243 + v, 247 + v, 255); });
    for (let k = 0; k < 6; k++) s(ri(r, 16), ri(r, 16), 196, 226, 255);
  };
  P[T.LOG_SIDE] = (s, r) => {
    each((x, y) => { const st = x % 5 === 0 ? -26 : 0; const v = (r() - 0.5) * 16; s(x, y, 112 + st + v, 74 + st + v, 52 + st + v); });
    for (let k = 0; k < 4; k++) s(ri(r, 16), ri(r, 16), 96, 214, 160);
  };
  P[T.LOG_TOP] = (s, r) => each((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5), v = (r() - 0.5) * 12;
    if (d > 7) s(x, y, 108 + v, 70 + v, 50 + v);
    else if ((d | 0) % 2) s(x, y, 198 + v, 152 + v, 102 + v);
    else s(x, y, 172 + v, 126 + v, 82 + v);
  });
  P[T.LEAVES] = (s, r) => each((x, y) => {
    if (r() < 0.2) return;
    if (r() < 0.035) return s(x, y, 210, 255, 232);
    const v = (r() - 0.5) * 50; s(x, y, 56 + v, 170 + v, 112 + v * 0.6);
  });
  P[T.BLOSSOM] = (s, r) => each((x, y) => {
    if (r() < 0.2) return;
    if (r() < 0.06) return s(x, y, 255, 250, 255);
    const v = (r() - 0.5) * 44; s(x, y, 255, 150 + v, 205 + v * 0.5);
  });
  P[T.BRICK] = (s, r) => each((x, y) => {
    const row = y >> 2, off = (row % 2) * 4;
    const mortar = y % 4 === 3 || (x + off) % 8 === 7;
    const v = (r() - 0.5) * 10;
    if (mortar) s(x, y, 206 + v, 194 + v, 214 + v);
    else { const sh = y % 4 === 0 ? 8 : 0; s(x, y, 247 + v + sh, 232 + v + sh, 240 + v + sh); }
  });
  P[T.GLASS] = (s) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) s(x, y, 225, 242, 255, 255);
    else if ((x - y === 3 || x - y === 4) && x > 4 && x < 13) s(x, y, 255, 255, 255, 170);
    else s(x, y, 200, 232, 255, 38);
  });
  P[T.GOLD] = (s, r) => each((x, y) => {
    const v = (r() - 0.5) * 20;
    if (x === 0 || y === 0) s(x, y, 255, 242, 160);
    else if (x === 15 || y === 15) s(x, y, 196, 140, 30);
    else if ((x + y === 6 || x + y === 7) && x < 8) s(x, y, 255, 252, 214);
    else s(x, y, 255, 204 + v, 64 + v);
  });
  P[T.LANTERN] = (s) => each((x, y) => {
    const frame = x < 2 || x > 13 || y < 2 || y > 13 || x === 7 || x === 8 || y === 7 || y === 8;
    if (frame) return s(x, y, 92, 58, 120);
    const d = Math.hypot(x - 7.5, y - 7.5) / 8;
    s(x, y, 255, 248 - d * 70, 196 - d * 130);
  });
  P[T.ROSE] = (s, r) => {
    for (let y = 7; y < 16; y++) s(7, y, 60, 150, 70);
    [[6, 11], [5, 10], [8, 12], [9, 11], [10, 10]].forEach(([x, y]) => s(x, y, 70, 176, 80));
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = dx * dx + dy * dy; if (d > 9) continue;
      if (d <= 2) s(7 + dx, 4 + dy, 160, 16, 60);
      else { const v = (r() - 0.5) * 30; s(7 + dx, 4 + dy, 236 + v, 52 + v, 104 + v); }
    }
    s(5, 2, 255, 150, 190); s(9, 3, 255, 150, 190);
  };
  P[T.BLUEBELL] = (s) => {
    for (let y = 4; y < 16; y++) s(8 - (y < 8 ? 1 : 0), y, 70, 160, 90);
    [[5, 5], [10, 7], [6, 10]].forEach(([bx, by]) => {
      s(bx, by - 1, 150, 170, 255);
      for (let x = bx - 1; x <= bx + 1; x++) { s(x, by, 120, 140, 255); s(x, by + 1, 120, 140, 255); }
      for (let x = bx - 2; x <= bx + 2; x++) s(x, by + 2, 176, 196, 255);
    });
  };
  P[T.GLOWCAP] = (s) => {
    for (let y = 9; y < 16; y++) for (let x = 6; x <= 9; x++) s(x, y, 236, 232, 214);
    for (let y = 3; y <= 8; y++) {
      const [a, b] = y === 3 ? [5, 10] : y === 4 ? [3, 12] : [2, 13];
      for (let x = a; x <= b; x++) s(x, y, 170 - (y - 3) * 8, 90, 255);
    }
    [[5, 5], [9, 4], [11, 6], [7, 7], [4, 7]].forEach(([x, y]) => s(x, y, 190, 255, 250));
  };
  P[T.WATER] = (s, r) => each((x, y) => {
    const wave = (y * 3 + (x >> 2) * 5) % 8 === 0;
    const v = (r() - 0.5) * 14;
    if (wave) s(x, y, 120, 190, 255); else s(x, y, 52 + v, 124 + v, 230 + v);
  });
  P[T.WELLSTONE] = (s, r) => {
    const pts = []; for (let i = 0; i < 7; i++) pts.push([r() * 16, r() * 16, (r() - 0.5) * 40]);
    each((x, y) => {
      let d1 = 1e9, d2 = 1e9, tone = 0;
      for (const p of pts) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
        const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy);
        if (d < d1) { d2 = d1; d1 = d; tone = p[2]; } else if (d < d2) d2 = d;
      }
      const v = (r() - 0.5) * 10;
      if (d2 - d1 < 1.1) s(x, y, 72, 72, 92);
      else s(x, y, 130 + tone + v, 132 + tone + v, 152 + tone + v);
    });
  };
  P[T.ROOF] = (s, r) => each((x, y) => {
    const row = y >> 2, yy = y % 4, xx = (x + (row % 2) * 4) % 8;
    const edge = yy === 3 || (yy >= 2 && (xx === 0 || xx === 7));
    const v = (r() - 0.5) * 10;
    if (edge) s(x, y, 40, 58, 150);
    else s(x, y, 70 + (3 - yy) * 14 + v, 110 + (3 - yy) * 14 + v, 222 + v);
  });
  P[T.GOLD_ORE] = (s, r) => {
    stone(s, r);
    for (let k = 0; k < 5; k++) {
      const cx = 2 + ri(r, 12), cy = 2 + ri(r, 12);
      s(cx, cy, 255, 214, 70); s(cx + 1, cy, 236, 176, 40); s(cx, cy + 1, 255, 238, 140);
    }
  };
  P[T.CLOUD] = (s, r) => each((x, y) => { const v = (r() - 0.5) * 6, b = y > 12 ? -14 : 0; s(x, y, 250 + v + b, 250 + v + b, 255 + b); });
  P[T.RUNESTONE] = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 18; s(x, y, 44 + v, 34 + v, 64 + v); });
    for (let k = 0; k < 3; k++) {
      const x0 = 2 + ri(r, 11), y0 = 2 + ri(r, 11), horiz = r() < 0.5, len = 3 + ri(r, 3);
      for (let i = 0; i < len; i++) s(horiz ? x0 + i : x0, horiz ? y0 : y0 + i, 176, 104, 255);
    }
  };
  P[T.PLANKS] = (s, r) => each((x, y) => {
    const board = y >> 2;
    const seam = y % 4 === 3 || x === (board * 5 + 3) % 16;
    const v = (r() - 0.5) * 14, d = (board % 2) * 12;
    if (seam) s(x, y, 150, 104, 64); else s(x, y, 206 - d + v, 156 - d + v, 100 - d + v);
  });

  // Tailfin Canyon textures
  const asphalt = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 16; s(x, y, 58 + v, 58 + v, 64 + v); });
    for (let k = 0; k < 10; k++) s(ri(r, 16), ri(r, 16), 100, 100, 108);
  };
  P[T.RR_SIDE] = (s, r) => {
    const bands = [[200, 88, 54], [220, 118, 70], [176, 68, 44], [234, 156, 100], [196, 92, 58], [184, 76, 48]];
    const off = []; for (let x = 0; x < TS; x++) off.push(r() < 0.25 ? 1 : 0);
    each((x, y) => { const b = bands[(((y + off[x]) / 3) | 0) % bands.length], v = (r() - 0.5) * 16; s(x, y, b[0] + v, b[1] + v, b[2] + v); });
  };
  P[T.RR_TOP] = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 22; s(x, y, 206 + v, 100 + v, 62 + v); });
    for (let k = 0; k < 8; k++) s(ri(r, 16), ri(r, 16), 232, 146, 96);
  };
  P[T.RED_SAND] = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 20; s(x, y, 228 + v, 130 + v, 80 + v); });
    for (let k = 0; k < 12; k++) s(ri(r, 16), ri(r, 16), 196, 100, 60);
  };
  P[T.ASPHALT] = asphalt;
  P[T.ROADLINE] = (s, r) => {
    asphalt(s, r);
    for (let y = 2; y < 14; y++) for (let x = 5; x < 11; x++) { const v = (r() - 0.5) * 20; s(x, y, 255, 212 + v, 40 + v); }
  };
  P[T.CACTUS_SIDE] = (s, r) => each((x, y) => {
    const v = (r() - 0.5) * 16;
    if (x % 4 === 2 && y % 4 === 1) return s(x, y, 244, 240, 200);
    if (x % 4 === 0) s(x, y, 44 + v, 112 + v, 50 + v); else s(x, y, 72 + v, 154 + v, 72 + v);
  });
  P[T.CACTUS_TOP] = (s, r) => each((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5), v = (r() - 0.5) * 14;
    if ((x + y) % 5 === 0 && d > 3) return s(x, y, 244, 240, 200);
    if (d > 6) s(x, y, 50 + v, 120 + v, 54 + v); else s(x, y, 96 + v, 176 + v, 92 + v);
  });
  P[T.NEON] = (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 8; s(x, y, 30 + v, 16 + v, 52 + v); });
    for (let i = 2; i < 14; i++) { s(i, 2, 255, 90, 210); s(i, 13, 255, 90, 210); s(2, i, 255, 90, 210); s(13, i, 255, 90, 210); }
    for (let x = 4; x < 12; x++) { const y = 7 + ((x >> 1) % 2 ? -2 : 2) * (x % 2 ? 0.5 : 1); s(x, Math.round(y), 90, 245, 255); s(x, Math.round(y) + 1, 60, 170, 200); }
    s(1, 1, 255, 255, 255); s(14, 14, 255, 255, 255);
  };
  P[T.TIRE_SIDE] = (s, r) => each((x, y) => {
    const v = (r() - 0.5) * 10;
    if (x % 5 === 0) s(x, y, 16, 16, 18); else if (y % 4 === 0) s(x, y, 56 + v, 56 + v, 62 + v); else s(x, y, 32 + v, 32 + v, 36 + v);
  });
  P[T.TIRE_TOP] = (s, r) => each((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5), v = (r() - 0.5) * 10;
    if (d < 2.6) s(x, y, 176 + v, 176 + v, 186 + v);
    else if (d < 4.3) s(x, y, 14, 14, 16);
    else if (Math.round(Math.atan2(y - 7.5, x - 7.5) * 4) % 2) s(x, y, 52 + v, 52 + v, 58 + v);
    else s(x, y, 30 + v, 30 + v, 34 + v);
  });
  P[T.CONEB_SIDE] = (s, r) => each((x, y) => {
    const v = (r() - 0.5) * 12, white = (y >= 5 && y <= 7) || y === 12;
    if (white) s(x, y, 250 + v, 248 + v, 240 + v); else s(x, y, 255, 140 + v, 44 + v);
  });
  P[T.CONEB_TOP] = (s, r) => each((x, y) => { const v = (r() - 0.5) * 14; s(x, y, 255, 146 + v, 50 + v); });
  P[T.TRAFFIC_CONE] = (s) => {
    for (let x = 2; x < 14; x++) { s(x, 14, 40, 40, 44); s(x, 15, 30, 30, 34); }
    for (let y = 2; y < 14; y++) {
      const w = 0.8 + (y - 2) * 0.42, white = y === 6 || y === 7 || y === 10 || y === 11;
      for (let x = 0; x < 16; x++) if (Math.abs(x + 0.5 - 8) <= w) { if (white) s(x, y, 255, 255, 255); else s(x, y, 255, 128 - (x > 8 ? 20 : 0), 30); }
    }
  };
  P[T.CHROME] = (s, r) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    let v = 214 - (x + y) * 2.2 + (r() - 0.5) * 6;
    if (x - y === 4 || x - y === 5) v = 252;
    if (edge) v = 150;
    s(x, y, v, v + 2, v + 10);
  });

  // Cursed Cove textures
  const coral = (base, hi) => (s, r) => {
    each((x, y) => { const v = (r() - 0.5) * 30; s(x, y, base[0] + v, base[1] + v * 0.6, base[2] + v * 0.6); });
    for (let k = 0; k < 9; k++) {
      const cx = ri(r, 16), cy = ri(r, 16);
      s(cx, cy, ...hi); s((cx + 1) % 16, cy, ...hi); s(cx, (cy + 1) % 16, hi[0] * 0.8, hi[1] * 0.8, hi[2] * 0.8);
    }
  };
  P[T.CORAL_PINK] = coral([236, 92, 150], [255, 200, 230]);
  P[T.CORAL_BLUE] = coral([60, 150, 230], [180, 240, 255]);
  P[T.SEAGRASS] = (s, r) => {
    for (let k = 0; k < 5; k++) {
      let x = 2 + k * 3 + ri(r, 2);
      for (let y = 15; y >= 1 + ri(r, 5); y--) {
        const v = (r() - 0.5) * 30; s(x, y, 50 + v, 160 + v, 80 + v);
        if (y % 4 === 0) x += r() < 0.5 ? -1 : 1;
      }
    }
  };
  P[T.SHIP_PLANK] = (s, r) => each((x, y) => {
    const board = y >> 2, seam = y % 4 === 3 || x === (board * 7 + 2) % 16;
    const v = (r() - 0.5) * 14, d = (board % 2) * 10;
    if (seam) s(x, y, 50, 36, 28);
    else if (r() < 0.06) s(x, y, 70 + v, 110 + v, 70 + v);   // algae
    else s(x, y, 104 - d + v, 76 - d + v, 56 - d + v);
  });
  P[T.CHEST_SIDE] = (s, r) => each((x, y) => {
    const v = (r() - 0.5) * 14;
    if (x === 0 || x === 15 || y === 6 || y === 7) return s(x, y, 255, 204 + v, 64);
    if (x >= 6 && x <= 9 && y >= 5 && y <= 9) return (x === 7 || x === 8) && y === 8 ? s(x, y, 20, 14, 10) : s(x, y, 255, 220, 90);
    s(x, y, 132 + v, 84 + v, 44 + v);
  });
  P[T.CHEST_TOP] = (s, r) => each((x, y) => {
    const v = (r() - 0.5) * 14;
    if (x === 0 || x === 15 || y === 0 || y === 15 || x === 7 || x === 8) s(x, y, 255, 204 + v, 64);
    else s(x, y, 140 + v, 90 + v, 48 + v);
  });
  P[T.SAIL] = (s, r) => {
    each((x, y) => { if (r() < 0.06) return; const v = (r() - 0.5) * 12; s(x, y, 30 + v, 30 + v, 34 + v); });
    // tiny skull & crossbones
    [[6, 4], [7, 4], [8, 4], [9, 4], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [5, 6], [7, 6], [8, 6], [10, 6], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [6, 8], [9, 8],
     [4, 10], [11, 10], [5, 11], [10, 11], [6, 12], [9, 12], [7, 13], [8, 13], [6, 14], [9, 14], [5, 15], [10, 15]].forEach(([x, y]) => s(x, y, 236, 232, 220));
  };

  function makeAtlas() {
    const cv = document.createElement('canvas');
    cv.width = TS * COLS; cv.height = TS * ROWS;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(cv.width, cv.height);
    const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
    for (let t = 0; t < P.length; t++) {
      if (!P[t]) continue;
      const ox = (t % COLS) * TS, oy = ((t / COLS) | 0) * TS;
      const set = (x, y, r, g, b, a = 255) => {
        if (x < 0 || y < 0 || x >= TS || y >= TS) return;
        const i = ((oy + y) * cv.width + ox + x) * 4;
        img.data[i] = clamp(r); img.data[i + 1] = clamp(g); img.data[i + 2] = clamp(b); img.data[i + 3] = clamp(a);
      };
      P[t](set, MV.mulberry32(1000 + t * 7919));
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
  MV.atlasCanvas = makeAtlas();

  MV.tileUV = function (t) {
    const c = t % COLS, r = (t / COLS) | 0, e = 0.0004;
    return [c / COLS + e, 1 - (r + 1) / ROWS + e, (c + 1) / COLS - e, 1 - r / ROWS - e];
  };
  MV.makeAtlasTexture = function () {
    const tex = new THREE.CanvasTexture(MV.atlasCanvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  };

  // ---------------------------------------------------------------- icons
  function drawTile(ctx, t, a, b, c, d, e, f, dark) {
    const sx = (t % COLS) * TS, sy = ((t / COLS) | 0) * TS;
    ctx.setTransform(a, b, c, d, e, f);
    ctx.drawImage(MV.atlasCanvas, sx, sy, TS, TS, 0, 0, TS, TS);
    if (dark) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(20,0,40,${dark})`;
      ctx.fillRect(0, 0, TS, TS);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function star(ctx, x, y, R, r, n = 5) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? r : R;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  MV.drawStar = star;

  function drawItem(ctx, id, S) {
    ctx.save();
    if (id === ITEM.WAND) {
      ctx.translate(S / 2, S / 2); ctx.rotate(Math.PI / 4);
      const g = ctx.createLinearGradient(-S * 0.05, 0, S * 0.05, 0);
      g.addColorStop(0, '#5a2d82'); g.addColorStop(0.5, '#a66be0'); g.addColorStop(1, '#3d1c5e');
      ctx.fillStyle = g; ctx.fillRect(-S * 0.045, -S * 0.12, S * 0.09, S * 0.52);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(-S * 0.06, -S * 0.1, S * 0.12, S * 0.05); ctx.fillRect(-S * 0.06, S * 0.28, S * 0.12, S * 0.05);
      ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = S * 0.15;
      star(ctx, 0, -S * 0.25, S * 0.2, S * 0.085); ctx.fillStyle = '#ffe45c'; ctx.fill();
      ctx.lineWidth = S * 0.025; ctx.strokeStyle = '#fff8d0'; ctx.stroke();
      ctx.shadowBlur = 0; ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#fff'; [[0.3, -0.3], [0.15, -0.38], [-0.02, -0.4]].forEach(([x, y]) => ctx.fillRect(x * S, y * S, S * 0.04, S * 0.04));
    } else if (id === ITEM.DUST) {
      const x = S * 0.28, y = S * 0.3, w = S * 0.44, h = S * 0.6;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#ffc6f2'); g.addColorStop(1, '#9b6bff');
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = g; ctx.fillRect(x + S * 0.03, y + h * 0.35, w - S * 0.06, h * 0.62);
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x + w * 0.2, y - S * 0.12, w * 0.6, S * 0.13);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = S * 0.03; ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 9; i++) { const px = x + ((i * 37) % 10) / 10 * w, py = y + h * 0.35 + ((i * 53) % 10) / 10 * h * 0.6; ctx.fillRect(px, py, S * 0.035, S * 0.035); }
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 6; star(ctx, S * 0.8, S * 0.2, S * 0.1, S * 0.04, 4); ctx.fill();
    } else if (id === ITEM.WELL) {
      ctx.fillStyle = '#8d8fa6'; ctx.fillRect(S * 0.14, S * 0.6, S * 0.72, S * 0.3);
      ctx.fillStyle = '#6d6f88'; for (let i = 0; i < 4; i++) ctx.fillRect(S * (0.14 + i * 0.18), S * 0.74, S * 0.02, S * 0.16);
      ctx.fillStyle = '#4ea2ff'; ctx.fillRect(S * 0.2, S * 0.6, S * 0.6, S * 0.07);
      ctx.fillStyle = '#7a4e34'; ctx.fillRect(S * 0.16, S * 0.3, S * 0.07, S * 0.32); ctx.fillRect(S * 0.77, S * 0.3, S * 0.07, S * 0.32);
      ctx.fillStyle = '#4a6fe0'; ctx.beginPath(); ctx.moveTo(S * 0.06, S * 0.34); ctx.lineTo(S * 0.5, S * 0.06); ctx.lineTo(S * 0.94, S * 0.34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 8; star(ctx, S * 0.5, S * 0.47, S * 0.09, S * 0.04); ctx.fill();
    } else if (id === ITEM.SCARAB) {
      ctx.translate(S / 2, S / 2);
      ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = S * 0.04;
      for (const s of [-1, 1]) for (const y of [-0.12, 0.04, 0.2]) { ctx.beginPath(); ctx.moveTo(s * S * 0.12, y * S); ctx.lineTo(s * S * 0.34, (y + 0.06) * S); ctx.stroke(); }
      ctx.shadowColor = '#ff5040'; ctx.shadowBlur = S * 0.15;
      ctx.fillStyle = '#e8b730'; ctx.beginPath(); ctx.ellipse(0, S * 0.06, S * 0.2, S * 0.27, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#c99520'; ctx.beginPath(); ctx.ellipse(0, -S * 0.26, S * 0.12, S * 0.09, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2b59c3'; ctx.lineWidth = S * 0.035; ctx.beginPath(); ctx.moveTo(0, -S * 0.16); ctx.lineTo(0, S * 0.32); ctx.stroke();
      ctx.fillStyle = '#ff4040'; ctx.fillRect(-S * 0.08, -S * 0.3, S * 0.05, S * 0.04); ctx.fillRect(S * 0.03, -S * 0.3, S * 0.05, S * 0.04);
    } else if (id === ITEM.BUCKET) {
      ctx.strokeStyle = '#444'; ctx.lineWidth = S * 0.04; ctx.beginPath(); ctx.arc(S / 2, S * 0.36, S * 0.24, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#8d8fa6'; ctx.beginPath(); ctx.moveTo(S * 0.24, S * 0.36); ctx.lineTo(S * 0.76, S * 0.36); ctx.lineTo(S * 0.68, S * 0.9); ctx.lineTo(S * 0.32, S * 0.9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6d6f88'; ctx.fillRect(S * 0.26, S * 0.52, S * 0.48, S * 0.05); ctx.fillRect(S * 0.3, S * 0.74, S * 0.4, S * 0.05);
      ctx.fillStyle = '#4ea2ff'; ctx.shadowColor = '#9ff3ff'; ctx.shadowBlur = S * 0.15; ctx.fillRect(S * 0.25, S * 0.33, S * 0.5, S * 0.07);
      ctx.fillStyle = '#fff'; [[0.35, 0.22], [0.6, 0.16], [0.7, 0.26]].forEach(([x, y]) => ctx.fillRect(x * S, y * S, S * 0.04, S * 0.04));
    } else if (id === ITEM.PEARL) {
      ctx.translate(S / 2, S / 2);
      ctx.shadowColor = '#b060ff'; ctx.shadowBlur = S * 0.25;
      const g = ctx.createRadialGradient(-S * 0.1, -S * 0.12, S * 0.02, 0, 0, S * 0.32);
      g.addColorStop(0, '#e8d0ff'); g.addColorStop(0.35, '#5a2a8a'); g.addColorStop(1, '#12061e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, S * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ff7ad9'; ctx.lineWidth = S * 0.03;
      ctx.beginPath(); ctx.arc(S * 0.02, S * 0.04, S * 0.14, 0.5, 4.2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(-S * 0.14, -S * 0.16, S * 0.05, S * 0.05);
    } else if (id === ITEM.FROSTHORN) {
      ctx.translate(S / 2, S / 2); ctx.rotate(-0.5);
      ctx.shadowColor = '#7ff6ff'; ctx.shadowBlur = S * 0.2;
      ctx.fillStyle = '#e8f2ff'; ctx.beginPath();
      ctx.moveTo(-S * 0.36, S * 0.08); ctx.quadraticCurveTo(-S * 0.1, -S * 0.3, S * 0.34, -S * 0.2);
      ctx.lineTo(S * 0.3, -S * 0.02); ctx.quadraticCurveTo(-S * 0.02, -S * 0.08, -S * 0.3, S * 0.2); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#5b8fd8';
      for (const x of [-0.18, 0, 0.18]) ctx.fillRect(x * S, -S * 0.2 + Math.abs(x) * S * 0.2, S * 0.05, S * 0.2);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(S * 0.27, -S * 0.22, S * 0.08, S * 0.22);
      ctx.fillStyle = '#fff'; [[-0.3, -0.25], [0.1, 0.2], [0.35, 0.15]].forEach(([x, y]) => ctx.fillRect(x * S, y * S, S * 0.04, S * 0.04));
    } else if (id === ITEM.ACORN) {
      ctx.translate(S / 2, S / 2);
      ctx.shadowColor = '#ff3030'; ctx.shadowBlur = S * 0.2;
      ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.ellipse(0, S * 0.08, S * 0.2, S * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#4a2e14'; ctx.beginPath(); ctx.ellipse(0, -S * 0.14, S * 0.25, S * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2410'; ctx.fillRect(-S * 0.03, -S * 0.34, S * 0.06, S * 0.12);
      ctx.fillStyle = '#5fd35f'; ctx.fillRect(S * 0.03, -S * 0.34, S * 0.14, S * 0.06);
      ctx.fillStyle = '#ff3030'; ctx.fillRect(-S * 0.1, S * 0.02, S * 0.06, S * 0.05); ctx.fillRect(S * 0.04, S * 0.02, S * 0.06, S * 0.05);
      ctx.fillStyle = '#1a0a04'; ctx.fillRect(-S * 0.08, S * 0.16, S * 0.16, S * 0.04);
    } else if (id === ITEM.DARKSTAR) {
      ctx.translate(S / 2, S / 2);
      ctx.shadowColor = '#ff3df2'; ctx.shadowBlur = S * 0.25;
      const g = ctx.createLinearGradient(0, -S * 0.4, 0, S * 0.4);
      g.addColorStop(0, '#d9a8ff'); g.addColorStop(0.5, '#6a1fb0'); g.addColorStop(1, '#1a0f2e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -S * 0.42); ctx.lineTo(S * 0.22, -S * 0.05); ctx.lineTo(0, S * 0.42); ctx.lineTo(-S * 0.22, -S * 0.05); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,200,255,0.8)'; ctx.lineWidth = S * 0.02; ctx.stroke();
      ctx.fillStyle = '#ff3df2'; ctx.fillRect(-S * 0.04, -S * 0.08, S * 0.08, S * 0.08);
    }
    ctx.restore();
  }

  MV.makeIcon = function (id, S = 64) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    if (id >= 100) { drawItem(ctx, id, S); return cv; }
    const d = BLOCKS[id];
    if (d.cross) {
      ctx.imageSmoothingEnabled = false;
      const t = d.side;
      ctx.drawImage(MV.atlasCanvas, (t % COLS) * TS, ((t / COLS) | 0) * TS, TS, TS, S * 0.1, S * 0.1, S * 0.8, S * 0.8);
      return cv;
    }
    ctx.imageSmoothingEnabled = false;
    const w = S * 0.44, hh = S * 0.23, H = S * 0.46, y0 = S * 0.05, cx = S / 2;
    const Tp = [cx, y0], R = [cx + w, y0 + hh], Bt = [cx, y0 + 2 * hh], L = [cx - w, y0 + hh];
    drawTile(ctx, d.top, (R[0] - Tp[0]) / 16, (R[1] - Tp[1]) / 16, (L[0] - Tp[0]) / 16, (L[1] - Tp[1]) / 16, Tp[0], Tp[1], 0);
    drawTile(ctx, d.side, (Bt[0] - L[0]) / 16, (Bt[1] - L[1]) / 16, 0, H / 16, L[0], L[1], 0.22);
    drawTile(ctx, d.side, (R[0] - Bt[0]) / 16, (R[1] - Bt[1]) / 16, 0, H / 16, Bt[0], Bt[1], 0.4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return cv;
  };

  const iconCache = {};
  MV.iconURL = id => iconCache[id] || (iconCache[id] = MV.makeIcon(id, 64).toDataURL());

  // Soft round glow sprite, shared by particles, spells, pixies and the sky.
  let glowTex = null;
  MV.glowTexture = function () {
    if (glowTex) return glowTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(cv);
    return glowTex;
  };
})();
