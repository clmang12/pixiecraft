/* PixieCraft — magic wand spells: star bolts and floating light orbs */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, BLOCKS = MV.BLOCKS;
  const BOLT_COLORS = [0xffb3f0, 0xffe27a, 0x9ff3ff, 0xc9a8ff];

  class Spells {
    constructor(game) { this.game = game; this.bolts = []; this.orbs = []; }

    sprite(color, scale) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      s.scale.set(scale, scale, 1);
      this.game.scene.add(s);
      return s;
    }

    castBolt(origin, dir) {
      const color = BOLT_COLORS[(Math.random() * BOLT_COLORS.length) | 0];
      const s = this.sprite(color, 1.0);
      s.position.copy(origin).addScaledVector(dir, 0.9);
      this.bolts.push({ sprite: s, vel: dir.clone().multiplyScalar(34), life: 1.4, color: new THREE.Color(color) });
      this.game.sfx.spell();
    }

    castOrb(pos) {
      const outer = this.sprite(0xffe7a8, 4), inner = this.sprite(0xffffff, 1.1);
      outer.position.copy(pos); inner.position.copy(pos);
      this.orbs.push({ sprite: outer, inner, base: pos.clone(), life: 60, t: 0 });
      if (this.orbs.length > 8) this.removeOrb(0);
      this.game.particles.burst(pos.x, pos.y, pos.z, 40, 4, 1.2);
      this.game.sfx.chime();
    }

    removeOrb(i) {
      const o = this.orbs[i];
      this.game.scene.remove(o.sprite); this.game.scene.remove(o.inner);
      this.orbs.splice(i, 1);
    }

    explode(pos, color) {
      const g = this.game;
      g.particles.burst(pos.x, pos.y, pos.z, 36, 6, 0.9);
      g.particles.burst(pos.x, pos.y, pos.z, 12, 2, 0.6, [[color.r, color.g, color.b]]);
      g.sfx.pop();
    }

    update(dt) {
      const g = this.game, w = g.world;
      for (let i = this.bolts.length - 1; i >= 0; i--) {
        const b = this.bolts[i], p = b.sprite.position;
        let hit = false;
        for (let s = 0; s < 4 && !hit; s++) {
          p.addScaledVector(b.vel, dt / 4);
          const id = w.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
          if (id && BLOCKS[id].solid) hit = true;
          for (const m of g.mobs.list) {
            if (m.dead) continue;
            const cy = m.pos.y + m.h / 2;
            if (Math.abs(p.x - m.pos.x) < m.w + 0.35 && Math.abs(p.z - m.pos.z) < m.w + 0.35 && Math.abs(p.y - cy) < m.h / 2 + 0.35) {
              m.hurt(6, p.clone().addScaledVector(b.vel, -0.05)); hit = true; break;
            }
          }
        }
        b.life -= dt;
        b.sprite.material.rotation += dt * 8;
        for (let k = 0; k < 3; k++)
          g.particles.glow.spawn(p.x + (Math.random() - 0.5) * 0.2, p.y + (Math.random() - 0.5) * 0.2, p.z + (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, b.color.r, b.color.g, b.color.b, 0.45, 0.5, 1);
        if (hit || b.life <= 0) {
          this.explode(p, b.color);
          g.scene.remove(b.sprite);
          this.bolts.splice(i, 1);
        }
      }
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        o.t += dt; o.life -= dt;
        o.sprite.position.set(o.base.x, o.base.y + Math.sin(o.t * 1.5) * 0.25, o.base.z);
        o.inner.position.copy(o.sprite.position);
        const fade = Math.min(1, o.life / 3);
        o.sprite.material.opacity = (0.75 + Math.sin(o.t * 3) * 0.15) * fade;
        o.inner.material.opacity = fade;
        if (Math.random() < dt * 20) {
          const c = MV.SPARKLE_COLORS[(Math.random() * 5) | 0], p = o.sprite.position;
          g.particles.glow.spawn(p.x + (Math.random() - 0.5) * 1.4, p.y + (Math.random() - 0.5) * 1.4, p.z + (Math.random() - 0.5) * 1.4, 0, 0.4, 0, c[0], c[1], c[2], 1.2, 0, 0);
        }
        if (o.life <= 0) this.removeOrb(i);
      }
    }
  }

  MV.Spells = Spells;
})();
