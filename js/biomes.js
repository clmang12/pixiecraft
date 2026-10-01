/* PixieCraft — home biomes. Every enemy and boss belongs to one biome: it can only spawn there,
   it won't cross the border chasing you, and boss relics only work inside the boss's biome.
   (The Shadow Dragon flies, so it alone roams free.) */
(function () {
  'use strict';
  const MV = window.MV, TYPES = MV.MOB_TYPES, INFO = MV.BOSS_INFO;
  const BIOMES = {
    forest: { test: t => t.forest > 0.5, name: 'the Enchanted Forest or Pixie Meadow' },
    dunes: { test: t => t.dunes > 0.5, name: 'the Sunsand Dunes' },
    peaks: { test: t => t.peaks > 0.5, name: 'the snowy Crystal Peaks' },
    ocean: { test: t => t.ocean > 0.5, name: 'the Cursed Cove' },
  };
  const HOME = {
    shadow: 'forest', mop: 'forest', mopking: 'forest', treant: 'forest',
    mummy: 'dunes', pharaoh: 'dunes',
    snowman: 'peaks', yeti: 'peaks',
    pirate: 'ocean', shark: 'ocean', jelly: 'ocean', angler: 'ocean', kraken: 'ocean',
  };
  for (const type in HOME) {
    const b = BIOMES[HOME[type]];
    TYPES[type].biome = b.test;
    TYPES[type].home = HOME[type];
    const info = INFO[type];
    if (info) {
      // Bosses can only be summoned (by relic or by defeating minions) inside their biome
      const extra = info.where;
      info.where = g => b.test(g.world.terrain(Math.floor(g.player.pos.x), Math.floor(g.player.pos.z))) && (!extra || extra(g));
      info.whereMsg = `${TYPES[type].name} can only be summoned in ${b.name}` + (extra ? ', beside deep water.' : '.');
    }
  }
  MV.BIOMES = BIOMES;
})();
