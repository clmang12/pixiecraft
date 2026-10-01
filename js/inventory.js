/* PixieCraft — inventory (9 hotbar + 18 satchel slots) and Magic Workbench recipes */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, I = MV.ITEM;
  const STACK = 64;

  MV.RECIPES = [
    { out: I.WAND, n: 1, need: [[B.LOG, 1], [B.CRYSTAL, 1]] },
    { out: I.DUST, n: 3, need: [[B.GLOWCAP, 2]] },
    { out: I.WELL, n: 1, need: [[B.WELLSTONE, 8], [B.GOLD, 1]] },
    { out: B.PLANKS, n: 4, need: [[B.LOG, 1]] },
    { out: B.BRICK, n: 4, need: [[B.STONE, 2], [B.SAND, 2]] },
    { out: B.WELLSTONE, n: 4, need: [[B.STONE, 4]] },
    { out: B.GLASS, n: 2, need: [[B.SAND, 2]] },
    { out: B.GOLD, n: 1, need: [[B.GOLD_ORE, 2]] },
    { out: B.LANTERN, n: 2, need: [[B.CRYSTAL, 1], [B.GOLD_ORE, 1]] },
    { out: B.ROOF, n: 4, need: [[B.PLANKS, 2], [B.BLUEBELL, 1]] },
    { out: B.CLOUD, n: 2, need: [[B.SNOW, 1], [I.DUST, 1]] },
    { out: B.CRYSTAL, n: 1, need: [[I.DUST, 2], [B.STONE, 1]] },
    { out: I.SCARAB, n: 1, need: [[B.GOLD, 1], [B.SANDSTONE, 4]] },
    { out: I.BUCKET, n: 1, need: [[B.PLANKS, 3], [B.GLASS, 2], [I.DUST, 1]] },
    { out: I.DARKSTAR, n: 1, need: [[B.CRYSTAL, 3], [B.GOLD, 1], [I.DUST, 2]] },
    { out: I.FROSTHORN, n: 1, need: [[B.SNOW, 8], [B.CRYSTAL, 2], [B.GOLD, 1]] },
    { out: I.PEARL, n: 1, need: [[B.CORAL_PINK, 2], [B.CORAL_BLUE, 2], [B.GOLD, 1]] },
    { out: I.ACORN, n: 1, need: [[B.LOG, 4], [B.GLOWCAP, 2], [I.DUST, 1]] },
    { out: B.NEON, n: 2, need: [[B.CRYSTAL, 1], [B.GLASS, 1]] },
    { out: B.CHROME, n: 2, need: [[B.GOLD_ORE, 1], [B.STONE, 2]] },
    { out: B.ASPHALT, n: 4, need: [[B.STONE, 2], [B.RED_SAND, 2]] },
  ];

  class Inventory {
    constructor() { this.slots = new Array(27).fill(null); this.selected = 0; }
    get current() { return this.slots[this.selected]; }

    fill(ids, counts) { this.slots.fill(null); ids.forEach((id, i) => (this.slots[i] = { id, count: counts ? counts[i] : 1 })); }

    add(id, n = 1) {
      for (const s of this.slots) if (s && s.id === id && s.count < STACK) { const k = Math.min(n, STACK - s.count); s.count += k; n -= k; if (!n) return 0; }
      for (let i = 0; i < this.slots.length && n > 0; i++) if (!this.slots[i]) { const k = Math.min(n, STACK); this.slots[i] = { id, count: k }; n -= k; }
      return n;
    }

    count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.count; return n; }

    remove(id, n) {
      for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
        const s = this.slots[i];
        if (s && s.id === id) { const k = Math.min(n, s.count); s.count -= k; n -= k; if (!s.count) this.slots[i] = null; }
      }
    }

    consumeSelected() {
      const s = this.current; if (!s) return;
      if (--s.count <= 0) this.slots[this.selected] = null;
    }

    canCraft(r) { return r.need.every(([id, n]) => this.count(id) >= n); }
  }

  MV.Inventory = Inventory;
})();
