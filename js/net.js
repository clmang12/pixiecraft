/* PixieCraft — online multiplayer (peer-to-peer, no game server needed).
   One player HOSTS and gets a room code; friends JOIN with that code. Connections are WebRTC
   data channels brokered by the free PeerJS cloud service.

   What is shared:
   - Terrain: everyone generates the same world from the host's seed; only block edits are sent.
   - Players: position/look at ~15 Hz, drawn as name-tagged voxel avatars. Plus text chat (Enter).
   - Creatures, bosses and time of day: simulated by the host only. Guests receive snapshots
     ~10 Hz and display "ghost" creatures; a guest's hits are sent to the host.
   - Attacks: melee damage is decided by the host and sent to the victim. Projectiles and boss
     hazards are announced by the host and simulated by every player against themselves. */
(function () {
  'use strict';
  const MV = window.MV;
  const $ = id => document.getElementById(id);
  const PREFIX = 'pixiecraft-v1-';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const LIB = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  const V = a => new THREE.Vector3(a[0], a[1], a[2]);
  const r2 = n => Math.round(n * 100) / 100;

  // Stands in for a remote player while the host runs creature AI against them.
  class Proxy {
    constructor(net, id, name) {
      this.net = net; this.id = id; this.name = name; this.isProxy = true; this.ready = false;
      this.pos = new THREE.Vector3(0, -999, 0); this.vel = new THREE.Vector3();
      this.health = 20; this.maxHealth = 20; this.magic = 100; this.maxMagic = 100;
      this.yaw = 0; this.inWater = false; this.headInWater = false; this.onGround = true;
      this.mode = 'creative'; this.safe = false; this.w = 0.3; this.h = 1.8; this.eye = 1.62;
      this.fx = { slowT: 0, blindT: 0 };
    }
    damage(n, from) { this.net.sendTo(this.id, { t: 'hurt', n, f: from ? [from.x, from.y, from.z] : null }); }
    effect(k, v) { if (v > 0) { this.fx[k] = performance.now() + v * 1000; this.net.sendTo(this.id, { t: 'eff', k, v }); } }
    get slowT() { return Math.max(0, (this.fx.slowT - performance.now()) / 1000); }
    set slowT(v) { this.effect('slowT', v); }
    get blindT() { return Math.max(0, (this.fx.blindT - performance.now()) / 1000); }
    set blindT(v) { this.effect('blindT', v); }
  }

  class Net {
    constructor(game) {
      this.game = game;
      this.active = false; this.isHost = false; this.peer = null; this.hostConn = null;
      this.conns = new Map();      // host: peerId -> connection
      this.players = new Map();    // peerId -> { name, proxy, avatar, tPos, tYaw }
      this.ghosts = new Map();     // guest: host mob id -> ghost Mob
      this.name = 'Player'; this.code = ''; this.myId = '';
      this.sendT = 0; this.snapT = 0; this.timeT = 0; this.applying = false;
      this.bindUI();
      setInterval(() => this.watchdog(), 2000);
    }

    // Closing a tab doesn't reliably fire a "connection closed" event, so check link health ourselves.
    watchdog() {
      if (!this.active) return;
      const bad = c => {
        const st = c && c.peerConnection ? c.peerConnection.iceConnectionState : '';
        return !c || !c.open || st === 'disconnected' || st === 'failed' || st === 'closed';
      };
      if (!this.isHost) {
        if (!this.hostConn) return;
        this.badCount = bad(this.hostConn) ? (this.badCount || 0) + 1 : 0;
        if (this.badCount >= 3) { this.badCount = 0; this.hostLeft(this.hostConn); }   // ~6 s of silence
      } else {
        for (const [id, c] of [...this.conns]) { c.badCount = bad(c) ? (c.badCount || 0) + 1 : 0; if (c.badCount >= 3) this.dropPlayer(id); }
      }
    }

    // ------------------------------------------------------------ connection
    loadLib() {
      if (window.Peer) return Promise.resolve();
      const tryLoad = i => new Promise((res, rej) => {
        if (i >= LIB.length) return rej(new Error('Could not load the networking library — check your internet connection.'));
        const s = document.createElement('script'); s.src = LIB[i];
        s.onload = () => res(); s.onerror = () => tryLoad(i + 1).then(res, rej);
        document.head.appendChild(s);
      });
      return tryLoad(0);
    }

    // Claim the room's address on the matchmaking service and start accepting players.
    // `retry` keeps trying while the previous host's claim on the code expires (host migration).
    openRoom(code, retry) {
      return new Promise((resolve, reject) => {
        let tries = 0;
        const attempt = () => {
          const peer = new Peer(PREFIX + code);
          let opened = false;
          peer.on('open', id => { opened = true; this.peer = peer; this.myId = id; resolve(); });
          peer.on('connection', c => {
            c.on('data', m => this.onData(c.peer, m, c));
            c.on('close', () => this.dropPlayer(c.peer));
            c.on('error', () => this.dropPlayer(c.peer));
          });
          peer.on('error', e => {
            if (opened) return;
            peer.destroy();
            if (retry && e.type === 'unavailable-id' && ++tries < 25) setTimeout(attempt, 2500);
            else reject(new Error(e.type === 'unavailable-id' ? 'That room code is already in use — try again.' : 'Could not create the room (' + e.type + ').'));
          });
        };
        attempt();
      });
    }

    async host(name, code) {
      await this.loadLib();
      this.name = name;
      this.code = code || Array.from({ length: 5 }, () => ALPHABET[(Math.random() * ALPHABET.length) | 0]).join('');
      await this.openRoom(this.code, false);
      this.active = true; this.isHost = true;
      return this.code;
    }

    async join(code, name) {
      await this.loadLib();
      this.name = name; this.code = code.toUpperCase().trim();
      return new Promise((resolve, reject) => {
        const peer = this.peer = new Peer();
        const fail = msg => { if (!this.active) reject(new Error(msg)); };
        peer.on('open', id => {
          this.myId = id;
          const c = this.hostConn = peer.connect(PREFIX + this.code, { reliable: true });
          c.on('open', () => c.send({ t: 'hello', name, outfit: this.game.outfit }));
          c.on('data', m => {
            if (m.t === 'welcome') { this.active = true; this.isHost = false; resolve(m); }
            else this.onData(c.peer, m, c);
          });
          c.on('close', () => this.hostLeft(c));
          setTimeout(() => fail('Timed out — check the room code, and that the host still has the game open.'), 12000);
        });
        peer.on('error', e => fail(e.type === 'peer-unavailable' ? 'No game found with that room code.' : 'Connection failed (' + e.type + ').'));
      });
    }

    // ------------------------------------------------------------ host migration
    // The host vanished. The room lives on: the remaining player with the lowest id takes over
    // the room code, and everyone else reconnects to them. The old host can simply join again.
    hostLeft(conn) {
      if (!this.active || this.isHost || (conn && conn !== this.hostConn)) return;
      const roomId = PREFIX + this.code;
      this.removePlayer(roomId);
      this.hostConn = null;
      const succ = [this.myId, ...this.players.keys()].sort()[0];
      if (succ === this.myId) return this.becomeHost();
      const sp = this.players.get(succ), name = sp ? sp.name : 'A friend';
      this.removePlayer(succ);
      this.addPlayer(roomId, name).proxy.ready = true;   // the new host will answer at the room's address
      this.game.ui.toast(`The host left — ${name} is taking over the room…`, 'warn');
      this.reconnect(0);
    }

    reconnect(n) {
      if (!this.active || this.isHost) return;
      const c = this.peer.connect(PREFIX + this.code, { reliable: true });
      let open = false;
      c.on('open', () => { open = true; this.hostConn = c; c.send({ t: 'hello', name: this.name, re: true, outfit: this.game.outfit }); });
      c.on('data', m => this.onData(c.peer, m, c));
      c.on('close', () => { if (open) this.hostLeft(c); });
      setTimeout(() => {
        if (open || !this.active || this.isHost) return;
        try { c.close(); } catch (e) { /* never opened */ }
        if (n < 14) this.reconnect(n + 1); else this.goSolo('Could not reach the new host — you can keep playing on your own.');
      }, 2500);
    }

    async becomeHost() {
      const g = this.game;
      this.isHost = true; this.hostConn = null; this.conns = new Map(); this.seed = g.world.seed;
      for (const m of this.ghosts.values()) m.ghost = false;   // these creatures are mine to simulate now
      this.ghosts.clear();
      for (const p of this.players.values()) p.proxy.ready = false;   // until each friend reconnects
      g.ui.toast('👑 The host left — you are now hosting this room.', 'boss');
      const old = this.peer;
      try { old.destroy(); } catch (e) { /* already gone */ }
      try {
        await this.openRoom(this.code, true);
        this.refreshInfo();
        // Friends who never make it back are removed after a while
        setTimeout(() => { for (const [id, p] of [...this.players]) if (!p.proxy.ready) this.removePlayer(id); }, 45000);
      } catch (e) { this.goSolo('Could not take over the room — you can keep playing on your own.'); }
    }

    goSolo(msg) {
      this.active = false; this.isHost = false;
      this.game.ui.toast(msg, 'warn');
      for (const id of [...this.players.keys()]) this.removePlayer(id);
      for (const m of this.ghosts.values()) m.dead = true;   // real creatures will spawn again locally
      this.ghosts.clear();
      this.refreshInfo();
    }

    // The host's device remembers the room (seed, time and every block change) so it can be reopened
    saveRoom() {
      const g = this.game;
      if (!this.isHost || !this.active || !g.world) return;
      try {
        const edits = Array.from(g.world.edits);
        if (edits.length > 60000) return;
        localStorage.setItem('pixiecraft-room', JSON.stringify({ code: this.code, seed: this.seed, name: this.name, time: g.sky.time, day: g.sky.day, edits }));
      } catch (e) { /* storage unavailable or full: reopening just won't be offered */ }
    }
    savedRoom() { try { return JSON.parse(localStorage.getItem('pixiecraft-room')); } catch (e) { return null; } }

    // ------------------------------------------------------------ sending
    broadcast(msg, except) { for (const [id, c] of this.conns) if (id !== except && c.open && this.players.get(id)?.proxy.ready) c.send(msg); }
    sendTo(id, msg) { const c = this.conns.get(id); if (c && c.open) c.send(msg); }
    sendHost(msg) { if (this.hostConn && this.hostConn.open) this.hostConn.send(msg); }
    send(msg) { if (this.isHost) this.broadcast(msg); else this.sendHost(msg); }
    sendHit(mob, dmg, from) { this.sendHost({ t: 'hit', id: mob.netId, d: dmg, f: from ? [from.x, from.y, from.z] : null }); }

    // ------------------------------------------------------------ world hooks
    // Called once the local world exists (after startGame).
    attachWorld() {
      const w = this.game.world, orig = w.setBlock.bind(w);
      w.setBlock = (x, y, z, id) => {
        const ok = orig(x, y, z, id);
        // (water flow isn't sent: every player's game works it out identically from the same edit)
        if (this.active && !this.applying && !w.flowing) this.send({ t: 'b', e: [x, y, z, id] });
        return ok;
      };
      if (!this.isHost) this.sendHost({ t: 'ready' });
      this.refreshInfo();
      this.game.ui.toast(this.isHost ? `🌐 Room ${this.code} is open — share the code with friends!` : `🌐 Joined room ${this.code}`);
    }

    applyEdit(e) {
      this.applying = true;
      this.game.world.setBlock(e[0], e[1], e[2], e[3]);
      this.applying = false;
    }

    // ------------------------------------------------------------ players
    addPlayer(id, name, outfit) {
      if (this.players.has(id)) return this.players.get(id);
      const p = { name, outfit, proxy: new Proxy(this, id, name), avatar: this.makeAvatar(id, name, outfit), tPos: new THREE.Vector3(0, -999, 0), tYaw: 0, moved: 0 };
      this.players.set(id, p);
      this.refreshInfo();
      return p;
    }
    removePlayer(id) {
      const p = this.players.get(id);
      if (!p) return;
      this.game.scene.remove(p.avatar.root);
      this.players.delete(id);
      this.refreshInfo();
    }
    dropPlayer(id) {
      const p = this.players.get(id);
      if (!p) return;
      this.chatLine(`✦ ${p.name} left the kingdom`);
      this.removePlayer(id); this.conns.delete(id);
      this.broadcast({ t: 'leave', id });
    }

    sendOutfit(o) { if (this.active) this.send({ t: 'outfit', id: this.myId, o }); }

    makeAvatar(id, name, outfit) {
      const { root, P } = MV.buildAvatar(outfit || MV.defaultOutfitFor(id));
      // Name tag
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'rgba(20,10,50,0.65)'; ctx.fillRect(0, 8, 256, 48);
      ctx.font = 'bold 30px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd76a'; ctx.fillText(name.slice(0, 14), 128, 33);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
      tag.scale.set(1.8, 0.45, 1); tag.position.y = 2.5; root.add(tag);
      root.position.set(0, -999, 0);
      this.game.scene.add(root);
      return { root, P, t: 0 };
    }

    // Host helpers: who should a creature hunt?
    everyone() { const out = [this.game.player]; for (const p of this.players.values()) if (p.proxy.ready) out.push(p.proxy); return out; }
    nearestPlayer(pos) {
      let best = this.game.player, bd = Infinity;
      for (const pl of this.everyone()) {
        const d = Math.hypot(pl.pos.x - pos.x, pl.pos.z - pos.z) + (pl.health > 0 ? 0 : 1000);
        if (d < bd) { bd = d; best = pl; }
      }
      return best;
    }
    nearestDist(pos) { let bd = Infinity; for (const pl of this.everyone()) bd = Math.min(bd, Math.hypot(pl.pos.x - pos.x, pl.pos.z - pos.z)); return bd; }
    randomPlayer() { const all = this.everyone(); return all[(Math.random() * all.length) | 0]; }
    playerById(id) { const p = this.players.get(id); return p ? p.proxy : this.game.player; }

    // Run host-side game logic "as" another player: creature AI reads game.player, so swap it.
    runAs(pl, fn) {
      const g = this.game;
      if (!pl || !pl.isProxy) return fn();
      const sv = { player: g.player, mode: g.mode, safe: g.safeZone };
      g.player = pl; g.mode = pl.mode; g.safeZone = pl.safe;
      g.ui.toast = (msg, cls) => this.sendTo(pl.id, { t: 'toast', msg, cls });
      try { return fn(); } finally {
        g.player = sv.player; g.mode = sv.mode; g.safeZone = sv.safe;
        delete g.ui.toast;
        if (pl.vel.lengthSq() > 0.01) this.sendTo(pl.id, { t: 'imp', v: pl.vel.toArray() });   // knockback
        pl.vel.set(0, 0, 0);
      }
    }

    // ------------------------------------------------------------ messages
    onData(from, m, conn) {
      const g = this.game;
      if (m.t === 'hello' && this.isHost) {
        if (this.players.size >= 7) { conn.send({ t: 'toast', msg: 'That room is full.' }); return conn.close(); }
        this.conns.set(from, conn);
        const np = this.addPlayer(from, String(m.name || 'Player').slice(0, 14), m.outfit);
        if (m.re) {   // a friend reconnecting after the previous host left: they already have the world
          np.proxy.ready = true;
          conn.send({ t: 'rejoined', players: [{ id: this.myId, name: this.name, outfit: this.game.outfit }, ...[...this.players].filter(([id, p]) => id !== from && p.proxy.ready).map(([id, p]) => ({ id, name: p.name, outfit: p.outfit }))] });
          this.broadcast({ t: 'join', id: from, name: np.name, outfit: np.outfit }, from);
          this.refreshInfo();
          return;
        }
        conn.send({ t: 'welcome', seed: this.seed, id: from });
        return;
      }
      if (!g.world || !g.mobs) return;   // still loading
      const P = this.players.get(from);
      switch (m.t) {
        // ---- host receives
        case 'ready': {
          if (!this.isHost || !P) break;
          conn.send({ t: 'edits', list: Array.from(g.world.edits), time: g.sky.time, day: g.sky.day,
            players: [{ id: this.myId, name: this.name, outfit: this.game.outfit }, ...[...this.players].filter(([id, p]) => id !== from && p.proxy.ready).map(([id, p]) => ({ id, name: p.name, outfit: p.outfit }))] });
          P.proxy.ready = true;
          this.broadcast({ t: 'join', id: from, name: P.name, outfit: P.outfit }, from);
          this.chatLine(`✦ ${P.name} joined the kingdom`);
          this.broadcast({ t: 'chat', msg: `✦ ${P.name} joined the kingdom` }, from);
          break;
        }
        case 'hit': {
          if (!this.isHost) break;
          const mob = g.mobs.list.find(x => x.id === m.id);
          if (mob && !mob.dead) mob.hurt(m.d, m.f ? V(m.f) : null);
          break;
        }
        case 'summon':
          if (this.isHost && MV.BOSS_INFO[m.kind] && g.bosses.count(m.kind) < MV.MAX_PER_BOSS) g.bosses.queue(m.kind, from);
          break;
        // ---- both directions
        case 'p': {
          const id = this.isHost ? from : m.id, pl = this.players.get(id);
          if (!pl) break;
          pl.tPos.set(m.x, m.y, m.z); pl.tYaw = m.yaw;
          const px = pl.proxy;
          px.pos.set(m.x, m.y, m.z); px.yaw = m.yaw; px.health = m.hp; px.mode = m.mode; px.safe = m.safe; px.inWater = m.w; px.headInWater = m.hw; px.onGround = m.g;
          if (this.isHost) { m.id = from; this.broadcast(m, from); }
          break;
        }
        case 'b':
          this.applyEdit(m.e);
          if (this.isHost) this.broadcast(m, from);
          break;
        case 'chat':
          this.chatLine(m.msg);
          if (this.isHost) this.broadcast(m, from);
          break;
        // ---- guests receive
        case 'edits':
          for (const [k, id] of m.list) { const [x, y, z] = k.split(',').map(Number); this.applyEdit([x, y, z, id]); }
          for (const p of m.players) this.addPlayer(p.id, p.name, p.outfit).proxy.ready = true;
          g.sky.time = m.time; g.sky.day = m.day;
          break;
        case 'join': this.addPlayer(m.id, m.name, m.outfit).proxy.ready = true; break;
        case 'outfit': {
          const id = this.isHost ? from : m.id, pl = this.players.get(id);
          if (!pl) break;
          pl.outfit = m.o;
          const old = pl.avatar.root;
          pl.avatar = this.makeAvatar(id, pl.name, m.o);
          pl.avatar.root.position.copy(old.position); pl.avatar.root.rotation.copy(old.rotation);
          g.scene.remove(old);
          if (this.isHost) { m.id = from; this.broadcast(m, from); }
          break;
        }
        case 'rejoined':
          for (const p of m.players) this.addPlayer(p.id, p.name, p.outfit).proxy.ready = true;
          g.ui.toast('🌐 Reconnected — the room carries on!');
          this.refreshInfo();
          break;
        case 'leave': this.removePlayer(m.id); break;
        case 'time': if (Math.abs(g.sky.time - m.time) > 0.003) g.sky.time = m.time; g.sky.day = m.day; break;
        case 'mobs': this.syncGhosts(m.l); break;
        case 'shot': g.mobs.shots.fire(m.k, V(m.f), V(m.v), true); break;
        case 'fx': if (MV.FX[m.k]) MV.FX[m.k](g, m.a); break;
        case 'die': {
          const gh = this.ghosts.get(m.id);
          if (gh) { g.particles.burst(gh.pos.x, gh.pos.y + 0.6 * gh.scale, gh.pos.z, 50 * gh.scale, 5, 1, gh.T.deathColors); gh.dead = true; this.ghosts.delete(m.id); }
          break;
        }
        case 'hurt': g.player.damage(m.n, m.f ? V(m.f) : null); break;
        case 'eff': if (g.mode === 'survival') g.player[m.k] = Math.max(g.player[m.k] || 0, m.v); break;
        case 'imp': g.player.vel.add(V(m.v)); break;
        case 'toast': g.ui.toast(m.msg, m.cls); break;
        case 'victory': g.bosses.victory({ type: m.type, T: MV.MOB_TYPES[m.type], pos: V(m.p), fromNet: true }); break;
      }
    }

    // Guest: make the local creature list match the host's snapshot
    syncGhosts(list) {
      const g = this.game, seen = new Set();
      for (const s of list) {
        const [id, type, x, y, z, yaw, hp, maxHp, flags, scale] = s;
        seen.add(id);
        let m = this.ghosts.get(id);
        if (!m) {
          if (!MV.MOB_TYPES[type]) continue;
          m = new MV.Mob(g, type, x, y, z, { scale, ghost: true });
          m.netId = id; m.netPos = new THREE.Vector3(x, y, z); m.yaw = m.netYaw = yaw;
          g.mobs.list.push(m); this.ghosts.set(id, m);
        }
        m.netPos.set(x, y, z); m.netYaw = yaw; m.hp = hp; m.maxHp = maxHp;
        m.enraged = !!(flags & 1); m.dormant = !!(flags & 2);
      }
      for (const [id, m] of this.ghosts) if (!seen.has(id)) { m.dead = true; this.ghosts.delete(id); }
    }

    // ------------------------------------------------------------ per-frame
    update(dt) {
      const g = this.game;
      if (!this.active || !g.world || !g.player) return;
      // Smooth other players' avatars
      for (const p of this.players.values()) {
        const a = p.avatar, r = a.root, before = r.position.clone();
        if (r.position.y < -500) r.position.copy(p.tPos); else r.position.lerp(p.tPos, Math.min(1, dt * 12));
        let d = p.tYaw + Math.PI - r.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        r.rotation.y += d * Math.min(1, dt * 12);
        const sp = Math.min(1, before.distanceTo(r.position) / Math.max(dt, 1e-3) / 3);
        MV.animateAvatar(a, dt, sp);
      }
      // My own state, ~15 times a second
      if ((this.sendT -= dt) <= 0) {
        this.sendT = 0.066;
        const p = g.player;
        const msg = { t: 'p', id: this.myId, x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), yaw: r2(p.yaw), hp: Math.ceil(p.health), mode: g.mode, safe: g.safeZone, w: p.inWater, hw: p.headInWater, g: p.onGround };
        this.send(msg);
      }
      if (!this.isHost) return;
      if ((this.saveT = (this.saveT || 0) - dt) <= 0) { this.saveT = 15; this.saveRoom(); }
      // Host: creature snapshots ~10 Hz, clock every 2 s
      if ((this.snapT -= dt) <= 0) {
        this.snapT = 0.1;
        const l = [];
        for (const m of g.mobs.list) if (!m.dead) l.push([m.id, m.type, r2(m.pos.x), r2(m.pos.y), r2(m.pos.z), r2(m.yaw), Math.ceil(m.hp), m.maxHp, (m.enraged ? 1 : 0) | (m.dormant ? 2 : 0), m.scale]);
        this.broadcast({ t: 'mobs', l });
      }
      if ((this.timeT -= dt) <= 0) { this.timeT = 2; this.broadcast({ t: 'time', time: g.sky.time, day: g.sky.day }); }
    }

    // ------------------------------------------------------------ chat & UI
    chatLine(text) {
      const log = $('chatLog'), el = document.createElement('div');
      el.textContent = text; log.appendChild(el);
      while (log.children.length > 7) log.firstChild.remove();
      setTimeout(() => el.classList.add('old'), 12000);
    }

    openChat() {
      const g = this.game, inp = $('chatInput');
      g.state = 'chat'; g.keys = {};
      if (document.pointerLockElement) document.exitPointerLock();
      inp.classList.remove('hidden'); inp.value = ''; inp.focus();
    }

    closeChat(sendIt) {
      const g = this.game, inp = $('chatInput'), text = inp.value.trim().slice(0, 120);
      inp.classList.add('hidden'); inp.blur();
      if (sendIt && text) { const msg = `${this.name}: ${text}`; this.chatLine(msg); this.send({ t: 'chat', msg }); }
      g.state = 'paused'; g.lock();
      if (g.state !== 'playing' && !document.pointerLockElement && g.noLock) g.playUnlocked();
    }

    refreshInfo() {
      const el = $('netInfo');
      if (!this.active) { el.textContent = ''; $('pauseRoom').textContent = ''; return; }
      const n = this.players.size + 1;
      el.textContent = `🌐 Room ${this.code} · ${n} player${n > 1 ? 's' : ''}${this.isHost ? ' · 👑 host' : ''}`;
      $('pauseRoom').textContent = `🌐 Online room code: ${this.code} (${this.isHost ? 'you are hosting — keep this tab open and visible' : 'guest'}) · Enter = chat`;
    }

    bindUI() {
      const g = this.game, status = msg => { $('netStatus').textContent = msg; };
      const mode = () => document.querySelector('.mode-btn.active').dataset.mode;
      const myName = () => ($('nameInput').value.trim() || 'Player' + ((Math.random() * 90 + 10) | 0)).slice(0, 14);
      const busy = on => { for (const id of ['hostBtn', 'joinBtn', 'playBtn', 'reopenBtn']) $(id).disabled = on; };

      $('hostBtn').addEventListener('click', async () => {
        busy(true); status('Opening a room…');
        try {
          const seedStr = $('seedInput').value.trim();
          this.seed = seedStr ? MV.hashString(seedStr) : (Math.random() * 1e9) | 0;
          await this.host(myName());
          status(`Room ${this.code} created — loading the world…`);
          await g.startGame(seedStr, mode(), { seed: this.seed });
          this.attachWorld();
        } catch (e) { status('⚠ ' + e.message); busy(false); }
      });

      $('joinBtn').addEventListener('click', async () => {
        const code = $('codeInput').value.trim();
        if (code.length < 4) return status('Type the 5-letter room code from the host.');
        busy(true); status('Connecting…');
        try {
          const w = await this.join(code, myName());
          status('Connected — loading the world…');
          await g.startGame('', mode(), { seed: w.seed });
          this.attachWorld();
        } catch (e) { status('⚠ ' + e.message); busy(false); if (this.peer) { this.peer.destroy(); this.peer = null; } }
      });

      // Reopen the last room hosted on this device: join it if friends kept it alive, else re-create it
      const saved = this.savedRoom(), reopen = $('reopenBtn');
      if (saved && saved.code) {
        reopen.hidden = false; reopen.textContent = `↩ Reopen room ${saved.code}`;
        if (saved.name && !$('nameInput').value) $('nameInput').value = saved.name;
        reopen.addEventListener('click', async () => {
          busy(true); status(`Looking for room ${saved.code}…`);
          try {
            let w = null;
            try { w = await this.join(saved.code, myName()); } catch (e) { if (this.peer) { this.peer.destroy(); this.peer = null; } }
            if (w) {
              status('Your friends kept the room open — joining…');
              await g.startGame('', mode(), { seed: w.seed });
              this.attachWorld();
            } else {
              status(`Reopening room ${saved.code}…`);
              this.seed = saved.seed;
              await this.host(myName(), saved.code);
              await g.startGame('', mode(), { seed: saved.seed });
              this.attachWorld();
              for (const [k, id] of saved.edits || []) { const [x, y, z] = k.split(',').map(Number); this.applyEdit([x, y, z, id]); }
              g.sky.time = saved.time || g.sky.time; g.sky.day = saved.day || 1;
            }
          } catch (e) { status('⚠ ' + e.message); busy(false); }
        });
      }
      window.addEventListener('pagehide', () => this.saveRoom());

      $('chatInput').addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.code === 'Enter' || e.key === 'Enter') this.closeChat(true);
        else if (e.code === 'Escape') this.closeChat(false);
      });
    }
  }

  MV.Net = Net;
})();
