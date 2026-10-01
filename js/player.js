/* PixieCraft — shared AABB physics and the first-person player controller */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B;

  // Moves one axis and clamps against solid voxels. Returns true on collision.
  function moveAxis(world, e, axis, d) {
    if (d === 0) return false;
    const p = e.pos, w = e.w, h = e.h;
    p.setComponent(axis, p.getComponent(axis) + d);
    const x0 = Math.floor(p.x - w), x1 = Math.floor(p.x + w - 1e-7);
    const y0 = Math.floor(p.y), y1 = Math.floor(p.y + h - 1e-7);
    const z0 = Math.floor(p.z - w), z1 = Math.floor(p.z + w - 1e-7);
    let hit = false, limit = d > 0 ? Infinity : -Infinity;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      if (!world.isSolid(x, y, z)) continue;
      hit = true;
      const b = axis === 0 ? x : axis === 1 ? y : z;
      limit = d > 0 ? Math.min(limit, b) : Math.max(limit, b + 1);
    }
    if (hit) {
      const ext = axis === 1 ? (d > 0 ? h : 0) : w;
      p.setComponent(axis, d > 0 ? limit - ext - 1e-4 : limit + ext + 1e-4);
    }
    return hit;
  }

  // Swept, sub-stepped, axis-separated collision for any entity {pos, vel, w, h}.
  MV.moveEntity = function (world, e, dt) {
    const v = e.vel;
    const steps = Math.max(1, Math.ceil((Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt) / 0.35));
    const sdt = dt / steps;
    e.onGround = false; e.hitWall = false;
    for (let i = 0; i < steps; i++) {
      if (moveAxis(world, e, 1, v.y * sdt)) { if (v.y < 0) e.onGround = true; v.y = 0; }
      if (moveAxis(world, e, 0, v.x * sdt)) { v.x = 0; e.hitWall = true; }
      if (moveAxis(world, e, 2, v.z * sdt)) { v.z = 0; e.hitWall = true; }
    }
  };

  class Player {
    constructor(game) {
      this.game = game;
      this.pos = new THREE.Vector3();
      this.vel = new THREE.Vector3();
      this.w = 0.3; this.h = 1.8; this.eye = 1.62;
      this.yaw = 0; this.pitch = 0;
      this.onGround = false; this.flying = false; this.glideMode = false; this.gliding = false;
      this.maxHealth = 20; this.maxMagic = 100;
      this.health = 20; this.magic = 100;
      this.hurtCd = 0; this.sinceHurt = 99; this.jumpT = 0; this.lastSpace = 0;
      this.fallTop = 0; this.inWater = false; this.headInWater = false;
      this.nearFriend = false; this.nearWell = false; this.magicWarn = 0; this.slowT = 0;
      this.maxAir = 12; this.air = 12; this.drownT = 0;
    }

    teleport(x, y, z) { this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.fallTop = y; }

    look(dx, dy) {
      this.yaw -= dx * 0.0022;
      this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch - dy * 0.0022));
    }

    onSpaceDown() {
      const now = performance.now();
      if (this.game.mode === 'creative' && now - this.lastSpace < 280) {
        this.flying = !this.flying; this.vel.y = 0;
        this.game.ui.toast(this.flying ? '🕊 Flight on' : 'Flight off');
        this.lastSpace = 0;
      } else this.lastSpace = now;
    }

    useMagic(n, silent) {
      if (this.game.mode === 'creative') return true;
      if (this.magic >= n) { this.magic -= n; return true; }
      if (!silent && performance.now() - this.magicWarn > 1500) { this.game.ui.toast('✦ Not enough magic', 'warn'); this.magicWarn = performance.now(); }
      return false;
    }

    damage(n, from) {
      const g = this.game;
      if (g.mode === 'creative' || this.hurtCd > 0 || this.health <= 0) return;
      this.health -= n; this.hurtCd = 0.6; this.sinceHurt = 0;
      if (from) {
        const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz) || 1;
        this.vel.x += (dx / l) * 7; this.vel.z += (dz / l) * 7; this.vel.y = 5;
      }
      g.ui.hurtFlash(); g.sfx.hurt();
      if (this.health <= 0) { this.health = 0; g.die(); }
    }

    update(dt) {
      const g = this.game, k = g.keys, w = g.world, creative = g.mode === 'creative';
      const p = this.pos, v = this.vel;
      this.hurtCd = Math.max(0, this.hurtCd - dt); this.sinceHurt += dt; this.slowT = Math.max(0, this.slowT - dt); this.blindT = Math.max(0, (this.blindT || 0) - dt);
      const slow = this.slowT > 0 ? 0.5 : 1;

      let fx = 0, fz = 0;
      if (k.KeyW) fz -= 1; if (k.KeyS) fz += 1; if (k.KeyA) fx -= 1; if (k.KeyD) fx += 1;
      if (g.touchMove) { fx += g.touchMove.x; fz += g.touchMove.y; }   // on-screen joystick (analog)
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      let wx = fx * c + fz * s, wz = -fx * s + fz * c;
      const len = Math.hypot(wx, wz); if (len > 1) { wx /= len; wz /= len; }

      const fl = Math.floor;
      this.inWater = w.getBlock(fl(p.x), fl(p.y + 0.3), fl(p.z)) === B.WATER;
      this.headInWater = w.getBlock(fl(p.x), fl(p.y + this.eye), fl(p.z)) === B.WATER;
      const space = k.Space, shift = k.ShiftLeft || k.ShiftRight;
      this.gliding = false;

      if (this.flying) {
        const a = 1 - Math.exp(-dt * 10), sp = 12;
        v.x += (wx * sp - v.x) * a; v.z += (wz * sp - v.z) * a;
        v.y += (((space ? 1 : 0) - (shift ? 1 : 0)) * 9 - v.y) * a;
      } else {
        const glideActive = this.glideMode && !this.onGround && !this.inWater;
        const speed = (this.inWater ? 3.2 : glideActive ? 8 : shift ? 7 : 4.6) * slow;
        const a = 1 - Math.exp(-dt * (this.onGround ? 18 : glideActive ? 4 : 6));
        v.x += (wx * speed - v.x) * a; v.z += (wz * speed - v.z) * a;
        if (this.inWater) {
          v.y -= 9 * dt; v.y *= Math.max(0, 1 - 3 * dt);
          if (space) v.y = Math.min(v.y + 24 * dt, 4.2);
          if (shift) v.y = Math.max(v.y - 22 * dt, -4.5); // dive
        } else {
          v.y -= 28 * dt;
          if (space && this.onGround) { v.y = 8.8; this.jumpT = 0.25; }
          this.jumpT -= dt;
          if (glideActive) {
            if (space && this.jumpT <= 0 && this.useMagic(14 * dt, true)) { v.y = Math.min(v.y + 42 * dt, 7); this.gliding = true; }
            else if (v.y < -2.5 && this.useMagic(1.5 * dt, true)) { v.y = -2.5; this.gliding = true; }
          }
          if (v.y < -50) v.y = -50;
        }
      }

      const wasGround = this.onGround;
      MV.moveEntity(w, this, dt);
      if (this.flying && this.onGround) this.flying = false;

      // Fall damage (survival only)
      if (this.onGround || this.inWater || this.flying || this.gliding) {
        if (this.onGround && !wasGround && !creative && !this.inWater) {
          const fall = this.fallTop - p.y;
          if (fall > 3.4) this.damage(Math.floor(fall - 2.8));
        }
        this.fallTop = p.y;
      } else this.fallTop = Math.max(this.fallTop, p.y);

      if (this.gliding && Math.random() < 0.7) {
        g.particles.glow.spawn(p.x + (Math.random() - 0.5) * 0.6, p.y + 0.2, p.z + (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5), -1, (Math.random() - 0.5), 1, 0.7 + Math.random() * 0.3, 1, 0.9, -0.5, 1);
      }

      // Breath: hold it underwater, then start drowning (survival only)
      if (this.headInWater && !creative) {
        this.air = Math.max(0, this.air - dt);
        if (Math.random() < dt * 3) g.particles.glow.spawn(p.x, p.y + this.eye, p.z, 0, 1.5, 0, 0.7, 0.9, 1, 0.8, -1, 0);
        if (this.air <= 0 && (this.drownT -= dt) <= 0) { this.drownT = 1; this.hurtCd = 0; this.damage(2); if (this.health > 0 && !this.drownWarned) { this.drownWarned = true; g.ui.toast('🫧 You\'re drowning — swim up!', 'warn'); } }
      } else { this.air = Math.min(this.maxAir, this.air + dt * 5); this.drownT = 0; this.drownWarned = false; }

      // Regeneration
      if (!creative) {
        const regen = 2.5 + (this.nearFriend ? 5 : 0) + (this.nearWell ? 12 : 0);
        this.magic = Math.min(this.maxMagic, this.magic + regen * dt);
        if (this.sinceHurt > 4) this.health = Math.min(this.maxHealth, this.health + (this.nearWell ? 1.5 : 0.35) * dt);
      } else { this.magic = this.maxMagic; this.health = this.maxHealth; }

      if (p.y < -20) { g.ui.toast('The void spat you back out ✨'); g.respawn(); }

      const cam = g.camera;
      cam.position.set(p.x, p.y + this.eye, p.z);
      cam.rotation.set(this.pitch, this.yaw, 0);
    }
  }

  MV.Player = Player;
})();
