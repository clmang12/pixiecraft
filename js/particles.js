/* PixieCraft — pooled GPU point particles (additive magic glow + solid debris) */
(function () {
  'use strict';
  const MV = window.MV;

  class ParticleSystem {
    constructor(scene, max, size, additive, map) {
      this.max = max; this.count = 0; this.additive = additive;
      this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
      this.vel = new Float32Array(max * 3); this.base = new Float32Array(max * 3);
      this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
      this.grav = new Float32Array(max); this.drag = new Float32Array(max);
      const g = new THREE.BufferGeometry();
      this.pa = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
      this.ca = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', this.pa); g.setAttribute('color', this.ca);
      g.setDrawRange(0, 0);
      const mat = new THREE.PointsMaterial({
        size, map: map || null, vertexColors: true, transparent: additive, depthWrite: !additive,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.points = new THREE.Points(g, mat);
      this.points.frustumCulled = false;
      this.points.renderOrder = 2;
      scene.add(this.points);
    }

    spawn(x, y, z, vx, vy, vz, r, g, b, life, grav = 0, drag = 0) {
      if (this.count >= this.max) return;
      const i = this.count++, i3 = i * 3;
      this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
      this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
      this.base[i3] = r; this.base[i3 + 1] = g; this.base[i3 + 2] = b;
      this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b;
      this.life[i] = this.maxLife[i] = life; this.grav[i] = grav; this.drag[i] = drag;
    }

    copy(from, to) {
      const f = from * 3, t = to * 3;
      for (let k = 0; k < 3; k++) {
        this.pos[t + k] = this.pos[f + k]; this.vel[t + k] = this.vel[f + k];
        this.base[t + k] = this.base[f + k]; this.col[t + k] = this.col[f + k];
      }
      this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from];
      this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from];
    }

    update(dt) {
      let i = 0;
      while (i < this.count) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.copy(--this.count, i); continue; }
        const i3 = i * 3, dr = Math.max(0, 1 - this.drag[i] * dt);
        this.vel[i3] *= dr; this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt; this.vel[i3 + 2] *= dr;
        this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
        let f = 1;
        if (this.additive) { f = this.life[i] / this.maxLife[i]; f *= 0.75 + 0.25 * Math.sin(this.life[i] * 40 + i); }
        this.col[i3] = this.base[i3] * f; this.col[i3 + 1] = this.base[i3 + 1] * f; this.col[i3 + 2] = this.base[i3 + 2] * f;
        i++;
      }
      this.pa.needsUpdate = true; this.ca.needsUpdate = true;
      this.points.geometry.setDrawRange(0, this.count);
    }
  }

  const PALETTE = [[1, 0.55, 0.9], [1, 0.9, 0.4], [0.5, 0.95, 1], [0.8, 0.6, 1], [1, 1, 1]];
  const rnd = () => Math.random() - 0.5;

  class Particles {
    constructor(scene) {
      this.glow = new ParticleSystem(scene, 5000, 0.28, true, MV.glowTexture());
      this.solid = new ParticleSystem(scene, 2500, 0.13, false, null);
    }
    update(dt) { this.glow.update(dt); this.solid.update(dt); }

    burst(x, y, z, n, speed, life, colors) {
      for (let i = 0; i < n; i++) {
        const c = (colors || PALETTE)[(Math.random() * (colors || PALETTE).length) | 0];
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1), s = speed * (0.4 + Math.random() * 0.6);
        this.glow.spawn(x, y, z, Math.sin(v) * Math.cos(u) * s, Math.cos(v) * s, Math.sin(v) * Math.sin(u) * s,
          c[0], c[1], c[2], life * (0.6 + Math.random() * 0.6), 1.5, 2);
      }
    }

    blockBreak(x, y, z, hex) {
      const c = new THREE.Color(hex);
      for (let i = 0; i < 16; i++) {
        const k = 0.75 + Math.random() * 0.35;
        this.solid.spawn(x + 0.5 + rnd() * 0.8, y + 0.5 + rnd() * 0.8, z + 0.5 + rnd() * 0.8,
          rnd() * 4, Math.random() * 4 + 1, rnd() * 4, c.r * k, c.g * k, c.b * k, 0.5 + Math.random() * 0.4, 16, 1);
      }
      for (let i = 0; i < 5; i++) this.glow.spawn(x + 0.5 + rnd(), y + 0.5 + rnd(), z + 0.5 + rnd(), rnd(), 1, rnd(), 1, 0.9, 1, 0.8, 0, 1);
    }

    hearts(x, y, z) {
      for (let i = 0; i < 3; i++) this.glow.spawn(x + rnd() * 0.6, y, z + rnd() * 0.6, rnd() * 0.4, 1.2, rnd() * 0.4, 1, 0.35, 0.6, 1.2, 0, 1);
    }

    smoke(x, y, z, n = 1) {
      for (let i = 0; i < n; i++) {
        const k = Math.random() * 0.15;
        this.solid.spawn(x + rnd() * 0.8, y + Math.random() * 1.0, z + rnd() * 0.8, rnd() * 0.5, 0.8 + Math.random(), rnd() * 0.5, 0.12 + k, 0.04 + k * 0.5, 0.22 + k, 0.8, -0.5, 1);
      }
    }

    beam(from, to) {
      const d = to.clone().sub(from), len = d.length();
      for (let t = 0; t < len; t += 0.35) {
        const c = PALETTE[(Math.random() * PALETTE.length) | 0];
        const p = from.clone().addScaledVector(d, t / len);
        this.glow.spawn(p.x + rnd() * 0.15, p.y + rnd() * 0.15, p.z + rnd() * 0.15, rnd() * 0.3, rnd() * 0.3, rnd() * 0.3, c[0], c[1], c[2], 0.5, 0, 0);
      }
    }
  }

  MV.Particles = Particles;
  MV.ParticleSystem = ParticleSystem;
  MV.SPARKLE_COLORS = PALETTE;
})();
