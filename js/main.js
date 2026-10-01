/* PixieCraft — game bootstrap, input, block interaction, held item, main loop */
(function () {
  'use strict';
  const MV = window.MV, B = MV.B, I = MV.ITEM, BLOCKS = MV.BLOCKS;
  const $ = id => document.getElementById(id);

  class Game {
    constructor() {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      this.touch = MV.isTouch;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.touch ? 1.25 : 1.5));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      $('game').appendChild(this.renderer.domElement);
      this.canvas = this.renderer.domElement;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0xc4ecff, 50, 90);
      this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 1200);
      this.camera.rotation.order = 'YXZ';
      this.camera.position.set(0, 40, 0);
      this.scene.add(this.camera);
      this.ambient = new THREE.AmbientLight(0xffffff, 0.65);
      this.sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
      this.sunLight.position.set(0.5, 1, 0.3);
      this.scene.add(this.ambient, this.sunLight);

      this.atlasTex = MV.makeAtlasTexture();
      this.sky = new MV.Sky(this.scene);
      this.particles = new MV.Particles(this.scene);
      this.sfx = new MV.Sfx();
      this.music = new MV.Music(this.sfx);
      this.musicT = 0; this.shake = 0;
      this.ui = new MV.UI(this);
      this.net = MV.net = new MV.Net(this);
      if (this.touch) { this.noLock = true; this.touchUI = new MV.TouchControls(this); }   // phones & tablets
      this.keys = {};
      this.mouse = { left: false, right: false, lp: false, rp: false };
      this.state = 'title';
      this.mode = 'creative';
      this.debug = false;
      this.safeZone = false;
      this.breakProg = 0; this.breakKey = ''; this.repeatT = 0; this.boltCd = 0;
      this.tmpDir = new THREE.Vector3();
      this.zoneT = 0;

      this.bindEvents();
      this.clock = new THREE.Clock();
      this.loop();
    }

    // ------------------------------------------------------------ setup
    async startGame(seedStr, mode, opts) {
      this.sfx.init();
      this.music.start();
      this.updateAudio();
      // rAF stops in hidden pages, so also re-check audio on a timer
      if (!this.audioTimer) this.audioTimer = setInterval(() => this.updateAudio(), 400);
      const seed = opts && opts.seed != null ? opts.seed : seedStr ? MV.hashString(seedStr) : (Math.random() * 1e9) | 0;
      this.seedLabel = seedStr || String(seed);
      $('playBtn').disabled = true;
      this.ui.show('loading', true);
      this.ui.setLoading(0, 'Sprinkling pixie dust on the terrain…');
      await new Promise(r => setTimeout(r, 30));

      this.world = new MV.World(seed, this.scene, this.atlasTex);
      this.player = new MV.Player(this);
      this.mobs = new MV.MobManager(this);
      this.spells = new MV.Spells(this);
      this.bosses = new MV.Bosses(this);
      this.fireworks = new MV.Fireworks(this);
      const s = this.world.spawn;
      this.spawnPoint = { x: s.x + 0.5, y: s.y + 1, z: s.z + 3.5 };
      this.player.teleport(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
      this.player.yaw = 0; // face the wishing well (-z)

      this.invCreative = new MV.Inventory();
      this.invCreative.fill([I.WAND, B.GRASS, B.BRICK, B.ROOF, B.GLASS, B.PLANKS, B.GOLD, B.LANTERN, B.CRYSTAL]);
      this.invSurvival = new MV.Inventory();
      this.invSurvival.fill([I.WAND, I.DUST, B.PLANKS, B.LANTERN], [1, 3, 16, 4]);
      this.setMode(mode, true);

      const msgs = ['Growing enchanted forests…', 'Polishing crystal peaks…', 'Raking the sunsand dunes…', 'Filling wishing wells…'];
      await this.world.preload(this.player.pos.x, this.player.pos.z, 3, p => this.ui.setLoading(p, msgs[Math.min(3, (p * 4) | 0)]));

      this.setupHand();
      if (this.touch) { this.world.setRenderDist(4); $('rdist').value = 4; $('rdistVal').textContent = '4'; }   // lighter on mobile GPUs
      this.highlight = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
      this.highlight.visible = false;
      this.scene.add(this.highlight);

      this.ui.show('title', false);
      this.ui.show('hud', true);
      this.ui.refreshHotbar();
      this.state = 'paused';
      $('pauseTitle').textContent = '✨ Welcome to PixieCraft ✨';
      $('resumeBtn').textContent = this.touch ? 'Tap to begin' : 'Click to begin';
      this.ui.show('pause', true);
    }

    setMode(mode, silent) {
      this.mode = mode;
      this.inv = mode === 'creative' ? this.invCreative : this.invSurvival;
      if (mode === 'survival') this.player.flying = false;
      this.ui.refreshHotbar();
      if (!silent) {
        this.ui.toast(mode === 'creative'
          ? '🏰 Creative — infinite blocks, flight (double-tap Space / F), no damage'
          : '⚔ Survival — gather, craft, and beware the Shadow Beasts at night');
        this.sfx.chime();
      }
    }

    lock() {
      if (this.noLock) return this.playUnlocked();
      let r;
      try { r = this.canvas.requestPointerLock(); } catch (e) { return this.playUnlocked(); }
      if (r && r.catch) r.catch(() => this.playUnlocked());
    }

    // Some embedded browsers (preview panes, iframes) refuse mouse capture. Play anyway:
    // the view follows plain mouse movement and Esc pauses.
    playUnlocked() {
      if (!this.world || this.state === 'title') return;
      if (!this.noLock) this.ui.toast('🖱 Mouse capture unavailable here — move the mouse to look, Esc to pause. Open index.html in a browser for full controls.');
      this.noLock = true;
      this.state = 'playing';
      this.ui.show('pause', false);
    }

    // Music and sound only run while you're actually in the game: paused, dead,
    // hidden tab / closed preview pane or quit all suspend the audio engine.
    updateAudio() {
      const ctx = this.sfx.ctx;
      if (!ctx || ctx.state === 'closed') return;
      const run = !document.hidden && (this.state === 'playing' || this.state === 'inventory');
      if (run && ctx.state === 'suspended') ctx.resume();
      else if (!run && ctx.state === 'running') ctx.suspend();
    }

    quitToTitle() {
      if (this.sfx.ctx) this.sfx.ctx.close();
      location.reload();
    }

    // ------------------------------------------------------------ input
    bindEvents() {
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      }));
      $('playBtn').addEventListener('click', () => {
        const mode = document.querySelector('.mode-btn.active').dataset.mode;
        this.startGame($('seedInput').value.trim(), mode);
      });
      $('resumeBtn').addEventListener('click', () => this.lock());
      $('modeBtn').addEventListener('click', () => this.setMode(this.mode === 'creative' ? 'survival' : 'creative'));
      $('rdist').addEventListener('input', e => { $('rdistVal').textContent = e.target.value; if (this.world) this.world.setRenderDist(+e.target.value); this.updateFog(); });
      $('musicVol').addEventListener('input', e => { this.music.setVolume(e.target.value / 100); $('musicVolVal').textContent = e.target.value + '%'; });
      $('respawnBtn').addEventListener('click', () => { this.respawn(); this.ui.show('death', false); this.lock(); });

      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === this.canvas) {
          this.state = 'playing';
          this.ui.show('pause', false);
        } else if (this.state === 'playing') {
          this.state = 'paused';
          $('pauseTitle').textContent = 'Paused';
          $('resumeBtn').textContent = 'Resume';
          this.ui.show('pause', true);
          this.keys = {}; this.mouse.left = this.mouse.right = false;
        }
      });
      document.addEventListener('visibilitychange', () => this.updateAudio());
      window.addEventListener('pagehide', () => { if (this.sfx.ctx) this.sfx.ctx.suspend(); });
      window.addEventListener('blur', () => { if (this.state === 'playing') { this.state = 'paused'; this.ui.show('pause', true); } this.updateAudio(); });
      $('quitBtn').addEventListener('click', () => this.quitToTitle());
      $('invClose').addEventListener('click', () => { if (this.state !== 'inventory') return; this.ui.closeInventory(); this.state = 'playing'; this.lock(); });
      document.addEventListener('pointerlockerror', () => this.playUnlocked());

      document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT') return;
        if (['Space', 'F3', 'Tab'].includes(e.code)) e.preventDefault();
        if (this.state === 'inventory') {
          if (e.code === 'KeyE' || e.code === 'Escape') { this.ui.closeInventory(); this.state = 'playing'; this.lock(); }
          return;
        }
        if (this.state !== 'playing') return;
        if (e.code === 'Enter' && this.net.active) { e.preventDefault(); this.net.openChat(); return; }
        if (e.code === 'Escape' && this.noLock) {
          this.state = 'paused'; $('pauseTitle').textContent = 'Paused'; $('resumeBtn').textContent = 'Resume';
          this.ui.show('pause', true); this.keys = {}; this.mouse.left = this.mouse.right = false;
          return;
        }
        this.keys[e.code] = true;
        if (e.repeat) return;
        const p = this.player;
        if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 9) { this.inv.selected = n - 1; this.ui.refreshHotbar(); } }
        switch (e.code) {
          case 'Space': p.onSpaceDown(); break;
          case 'KeyE': this.state = 'inventory'; document.exitPointerLock(); this.ui.openInventory(); break;
          case 'KeyF':
            if (this.mode === 'creative') { p.flying = !p.flying; p.vel.y = 0; this.ui.toast(p.flying ? '🕊 Flight on' : 'Flight off'); }
            else this.ui.toast('Flight is a Creative power — use Pixie Glide (G) instead', 'warn');
            break;
          case 'KeyG': p.glideMode = !p.glideMode; this.ui.toast(p.glideMode ? '✦ Pixie Glide on — hold Space in the air to soar' : 'Pixie Glide off'); break;
          case 'KeyM': this.setMode(this.mode === 'creative' ? 'survival' : 'creative'); break;
          case 'KeyR': this.castLightOrb(); break;
          case 'F3': this.debug = !this.debug; break;
          case 'KeyN': this.ui.toast(this.music.toggle() ? '♫ Music on' : '♫ Music off'); break;
        }
      });
      document.addEventListener('keyup', e => { this.keys[e.code] = false; });
      document.addEventListener('mousemove', e => { if (this.state === 'playing' && !this.touch) this.player.look(e.movementX, e.movementY); });
      document.addEventListener('mousedown', e => {
        if (this.state !== 'playing' || this.touch) return;   // touch devices use the on-screen buttons
        if (e.button === 0) { this.mouse.left = true; this.mouse.lp = true; }
        if (e.button === 2) { this.mouse.right = true; this.mouse.rp = true; }
      });
      document.addEventListener('mouseup', e => {
        if (e.button === 0) this.mouse.left = false;
        if (e.button === 2) this.mouse.right = false;
      });
      document.addEventListener('contextmenu', e => e.preventDefault());
      document.addEventListener('wheel', e => {
        if (this.state !== 'playing') return;
        this.inv.selected = (this.inv.selected + (e.deltaY > 0 ? 1 : 8)) % 9;
        this.ui.refreshHotbar();
      }, { passive: true });
    }

    updateFog() {
      const r = (this.world ? this.world.renderDist : 6) * MV.CS;
      this.scene.fog.near = r * 0.55; this.scene.fog.far = r * 0.95;
    }

    // ------------------------------------------------------------ interaction
    eyeDir() { return this.camera.getWorldDirection(this.tmpDir); }

    breakBlock(hit, viaWand) {
      const w = this.world, def = BLOCKS[hit.id];
      if (this.mode === 'survival' && def.hardness === Infinity) return false;
      w.setBlock(hit.x, hit.y, hit.z, B.AIR);
      this.particles.blockBreak(hit.x, hit.y, hit.z, def.color);
      if (this.mode === 'survival') {
        if (def.loot) { for (const [id, n] of def.loot) this.inv.add(id, n); this.ui.toast('💰 Treasure! Gold, crystals and pixie dust!'); this.sfx.fanfare(); }
        else this.inv.add(hit.id, 1);
      }
      const above = w.getBlock(hit.x, hit.y + 1, hit.z);
      if (BLOCKS[above].cross) {
        w.setBlock(hit.x, hit.y + 1, hit.z, B.AIR);
        if (this.mode === 'survival') this.inv.add(above, 1);
      }
      if (viaWand) this.particles.burst(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 20, 3, 0.8);
      this.sfx.brk();
      this.ui.refreshHotbar();
      return true;
    }

    overlapsEntity(bx, by, bz, e) {
      return e.pos.x - e.w < bx + 1 && e.pos.x + e.w > bx && e.pos.y < by + 1 && e.pos.y + e.h > by && e.pos.z - e.w < bz + 1 && e.pos.z + e.w > bz;
    }

    placeBlock(hit, id) {
      const w = this.world;
      const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
      if (y < 0 || y >= MV.CH) return;
      const cur = w.getBlock(x, y, z);
      if (cur !== B.AIR && cur !== B.WATER && !BLOCKS[cur].cross) return;
      if (BLOCKS[id].solid) {
        if (this.overlapsEntity(x, y, z, this.player)) return;
        for (const m of this.mobs.list) if (m.type !== 'pixie' && this.overlapsEntity(x, y, z, m)) return;
      }
      if (BLOCKS[id].cross && !BLOCKS[w.getBlock(x, y - 1, z)].solid) return;
      w.setBlock(x, y, z, id);
      if (this.mode === 'survival') this.inv.consumeSelected();
      this.sfx.place();
      this.swing = 1;
      this.ui.refreshHotbar();
    }

    castLightOrb() {
      if (!this.player.useMagic(15)) return;
      const o = this.camera.position, d = this.eyeDir();
      const hit = this.world.raycast(o, d, 10, id => BLOCKS[id].solid);
      const pos = hit
        ? new THREE.Vector3(hit.x + 0.5 + hit.nx * 1.2, hit.y + 0.5 + hit.ny * 1.2, hit.z + 0.5 + hit.nz * 1.2)
        : o.clone().addScaledVector(d, 7);
      this.spells.castOrb(pos);
      this.swing = 1;
      this.ui.toast('☀ Light orb — shadow beasts fear its glow');
    }

    useItem(slot, hit) {
      const p = this.player, id = slot.id;
      if (id === I.DUST) {
        p.magic = Math.min(p.maxMagic, p.magic + 40);
        p.glideMode = true;
        this.particles.burst(p.pos.x, p.pos.y + 1, p.pos.z, 60, 4, 1.2);
        this.sfx.chime();
        this.ui.toast('✦ Pixie dust! +40 magic · glide enabled (hold Space in the air)');
        if (this.mode === 'survival') this.inv.consumeSelected();
        this.ui.refreshHotbar();
      } else if (id === I.WELL) {
        if (!hit || hit.ny !== 1) { this.ui.toast('Aim at the top of the ground to build a Wishing Well', 'warn'); return; }
        this.world.buildWellAt(hit.x, hit.y, hit.z);
        this.spawnPoint = { x: hit.x + 0.5, y: hit.y + 1, z: hit.z + 3.5 };
        this.particles.burst(hit.x + 0.5, hit.y + 3, hit.z + 0.5, 120, 6, 1.6);
        this.sfx.chime();
        this.ui.toast('⛲ Wishing Well built — your new spawn & a friendly sanctuary');
        if (this.mode === 'survival') this.inv.consumeSelected();
        // Nudge the player out if the structure landed on them
        while (this.player.pos.y < MV.CH && this.collidesPlayer()) this.player.pos.y += 1;
        this.ui.refreshHotbar();
      } else if (this.bosses.relicFor(id)) {
        if (this.bosses.summon(this.bosses.relicFor(id))) {
          if (this.mode === 'survival') this.inv.consumeSelected();
          this.particles.burst(p.pos.x, p.pos.y + 1, p.pos.z, 80, 5, 1.2, [[0.9, 0.3, 1], [1, 0.4, 0.4], [1, 0.9, 0.4]]);
          this.ui.refreshHotbar();
        }
      } else if (id === I.WAND) {
        const far = this.world.raycast(this.camera.position, this.eyeDir(), 24, b => b !== B.WATER);
        if (!far) return;
        if (!p.useMagic(4)) return;
        const handPos = this.camera.localToWorld(new THREE.Vector3(0.35, -0.3, -0.8));
        this.particles.beam(handPos, new THREE.Vector3(far.x + 0.5, far.y + 0.5, far.z + 0.5));
        this.breakBlock(far, true);
        this.swing = 1;
      } else if (MV.isBlock(id) && hit) this.placeBlock(hit, id);
    }

    collidesPlayer() {
      const p = this.player.pos, w = this.player.w;
      for (let x = Math.floor(p.x - w); x <= Math.floor(p.x + w); x++)
        for (let y = Math.floor(p.y); y <= Math.floor(p.y + 1.79); y++)
          for (let z = Math.floor(p.z - w); z <= Math.floor(p.z + w); z++) if (this.world.isSolid(x, y, z)) return true;
      return false;
    }

    updateInteraction(dt) {
      const creative = this.mode === 'creative';
      const o = this.camera.position, d = this.eyeDir().clone();
      const reach = creative ? 8 : 5.5;
      const hit = this.world.raycast(o, d, reach, id => id !== B.WATER);
      const mobHit = this.mobs.raycast(o, d, reach);
      this.highlight.visible = !!hit;
      if (hit) this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);

      const slot = this.inv.current, id = slot ? slot.id : 0;
      const m = this.mouse;
      this.repeatT -= dt; this.boltCd -= dt;

      let breaking = false;
      if (m.left) {
        if (id === I.WAND) {
          if (this.boltCd <= 0 && this.player.useMagic(5)) {
            this.spells.castBolt(this.camera.localToWorld(new THREE.Vector3(0.3, -0.25, -0.6)), d);
            this.boltCd = 0.22; this.swing = 1;
          }
        } else if (mobHit && (!hit || mobHit.dist < hit.dist)) {
          if (m.lp) { mobHit.mob.hurt(3, this.player.pos); this.swing = 1; }
        } else if (hit) {
          if (creative) {
            if (m.lp || this.repeatT <= 0) { this.breakBlock(hit); this.repeatT = 0.22; this.swing = 1; }
          } else {
            breaking = true;
            const k = `${hit.x},${hit.y},${hit.z}`;
            if (k !== this.breakKey) { this.breakKey = k; this.breakProg = 0; }
            const hard = BLOCKS[hit.id].hardness;
            if (hard !== Infinity) {
              this.breakProg += dt / Math.max(0.05, hard);
              if (Math.random() < dt * 8) this.swing = 1;
              if (this.breakProg >= 1) { this.breakBlock(hit); this.breakProg = 0; this.breakKey = ''; }
            }
          }
        }
      }
      if (!breaking) { this.breakProg = 0; this.breakKey = ''; }
      this.ui.setBreak(this.breakProg);

      if (m.rp || (m.right && this.repeatT <= 0)) {
        if (slot) { this.useItem(slot, hit); this.repeatT = 0.22; }
      }
      m.lp = m.rp = false;
    }

    // ------------------------------------------------------------ held item
    setupHand() {
      this.hand = new THREE.Group();
      this.hand.scale.setScalar(0.7);
      this.camera.add(this.hand);
      this.handId = -1; this.swing = 0; this.bobT = 0;
    }

    handMat(opts) {
      return Object.assign(new THREE.MeshLambertMaterial(opts), { depthTest: false });
    }

    rebuildHand(id) {
      while (this.hand.children.length) this.hand.remove(this.hand.children[0]);
      let obj;
      if (id === I.WAND) {
        obj = new THREE.Group();
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.5), this.handMat({ color: 0x7a3fb0 }));
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), this.handMat({ color: 0xffd34d }));
        band.position.z = -0.14;
        const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), Object.assign(new THREE.MeshBasicMaterial({ color: 0xffe45c }), { depthTest: false }));
        tip.position.z = -0.27;
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: MV.glowTexture(), color: 0xfff0a0, blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
        glow.scale.set(0.3, 0.3, 1); glow.position.z = -0.27;
        obj.add(stick, band, tip, glow);
        obj.rotation.set(0.5, 0.1, 0);
        this.wandTip = tip;
      } else if (MV.isBlock(id) && !BLOCKS[id].cross) {
        const g = new THREE.BoxGeometry(0.26, 0.26, 0.26);
        const uv = g.attributes.uv, def = BLOCKS[id];
        for (let f = 0; f < 6; f++) {
          const t = MV.tileUV(f === 2 ? def.top : f === 3 ? def.bottom : def.side);
          for (let k = 0; k < 4; k++) {
            const i = f * 4 + k;
            uv.setXY(i, t[0] + uv.getX(i) * (t[2] - t[0]), t[1] + uv.getY(i) * (t[3] - t[1]));
          }
        }
        const mat = this.handMat({ map: this.atlasTex, transparent: def.transparent, alphaTest: 0.1 });
        obj = new THREE.Mesh(g, mat);
        obj.rotation.set(0.15, 0.75, 0);
      } else if (id) {
        const tex = new THREE.CanvasTexture(MV.makeIcon(id, 64));
        tex.magFilter = THREE.NearestFilter;
        obj = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34),
          Object.assign(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }), { depthTest: false }));
        obj.rotation.set(0, -0.35, 0);
      } else {
        obj = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), this.handMat({ color: 0xffe0bd }));
        obj.rotation.set(0.3, 0.1, 0);
      }
      obj.traverse(o => (o.renderOrder = 999));
      this.hand.add(obj);
      this.handId = id;
    }

    updateHand(dt) {
      const slot = this.inv.current, id = slot ? slot.id : 0;
      if (id !== this.handId) this.rebuildHand(id);
      const v = this.player.vel, sp = this.player.onGround ? Math.hypot(v.x, v.z) : 0;
      this.bobT += dt * sp * 1.8;
      this.swing = Math.max(0, this.swing - dt * 4);
      const sw = Math.sin(this.swing * Math.PI);
      this.hand.position.set(0.4 + Math.cos(this.bobT) * 0.012, -0.34 + Math.abs(Math.sin(this.bobT)) * 0.02 - sw * 0.05, -0.7 - sw * 0.1);
      this.hand.rotation.set(-sw * 0.8, sw * 0.2, 0);
      if (id === I.WAND && Math.random() < dt * 10) {
        const tp = this.wandTip.getWorldPosition(new THREE.Vector3());
        const c = MV.SPARKLE_COLORS[(Math.random() * 5) | 0];
        this.particles.glow.spawn(tp.x, tp.y, tp.z, (Math.random() - 0.5) * 0.3, 0.3, (Math.random() - 0.5) * 0.3, c[0], c[1], c[2], 0.6, 0, 0);
      }
    }

    // ------------------------------------------------------------ life cycle
    die() {
      this.state = 'dead';
      document.exitPointerLock();
      this.ui.show('death', true);
    }

    respawn() {
      const s = this.spawnPoint;
      this.player.teleport(s.x, s.y, s.z);
      this.player.health = this.player.maxHealth;
      this.player.magic = this.player.maxMagic;
      if (!this.net.active) { this.mobs.clearHostile(); this.bosses.reset(); } // online, your friends are still fighting!
      this.sfx.chime();
      this.particles.burst(s.x, s.y + 1, s.z, 80, 4, 1.4);
    }

    onEnemyDefeated(mob) {
      if (mob.T.boss) return this.bosses.victory(mob);
      const p = this.player;
      p.magic = Math.min(p.maxMagic, p.magic + (mob.type === 'shadow' ? 20 : 8));
      if (mob.type === 'shadow') {
        if (this.mode === 'survival') { this.inv.add(B.CRYSTAL, 1); this.ui.refreshHotbar(); }
        this.ui.toast('✨ Shadow Beast vanquished! +20 magic' + (this.mode === 'survival' ? ', +1 crystal' : ''));
      }
      this.bosses.onKill(mob.type);
      this.sfx.chime();
    }

    pickMusic(dt) {
      if ((this.musicT -= dt) > 0) return;
      this.musicT = 1;
      const p = this.player.pos;
      let track = 'day';
      if (this.bosses.fighting) track = 'boss';
      else if (this.sky.isNight) track = 'night';
      else if (this.world.terrain(Math.floor(p.x), Math.floor(p.z)).ocean > 0.5) track = 'sea';
      else {
        const t = this.world.terrain(Math.floor(p.x), Math.floor(p.z));
        if (t.canyon > 0.5) track = 'canyon'; else if (t.dunes > 0.5) track = 'desert';
      }
      this.music.setTrack(track);
    }

    updateZones(dt) {
      this.zoneT -= dt;
      if (this.zoneT > 0) return;
      this.zoneT = 0.5;
      const p = this.player.pos;
      const well = this.world.nearestWell(p.x, p.z);
      this.safeZone = !!(well && well.dist < 10);
      this.player.nearWell = this.safeZone;
      this.player.nearFriend = this.mobs.list.some(m => m.T.friendly && m.pos.distanceTo(p) < 4.5);
    }

    loop() {
      requestAnimationFrame(() => this.loop());
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.updateAudio();
      if (this.world) {
        const playing = this.state === 'playing';
        const online = this.net.active;
        const sim = playing || online;   // a shared online world never pauses
        if (playing) {
          this.player.update(dt);
          this.updateInteraction(dt);
          this.updateHand(dt);
        }
        if (sim) {
          this.mobs.update(dt);
          this.spells.update(dt);
          this.bosses.update(dt);
          this.fireworks.update(dt);
          this.updateZones(dt);
          this.particles.update(dt);
        }
        this.net.update(dt);
        this.world.update(this.player.pos.x, this.player.pos.z);
        if (sim) this.world.updateFlow(dt);
        this.world.flush();
        this.sky.update(sim ? dt * (this.keys.KeyT && playing && (!online || this.net.isHost) ? 40 : 1) : 0, this.camera.position, this.scene.fog, this.renderer);
        this.world.setLight(this.sky.light);
        this.ambient.intensity = 0.25 + this.sky.dayF * 0.45;
        this.sunLight.intensity = 0.15 + this.sky.dayF * 0.5;
        if (this.player.headInWater) { this.scene.fog.color.set(0x1d5a9a); this.scene.fog.near = 1; this.scene.fog.far = 26; }
        else this.updateFog();
        this.pickMusic(dt);
        if (this.shake > 0 && playing) {
          this.shake = Math.max(0, this.shake - dt);
          this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.3;
          this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.3;
        }
        this.ui.update(dt);
      } else {
        // Title screen: slowly cycle the sky behind the menu
        this.camera.rotation.y += dt * 0.05;
        this.camera.rotation.x = 0.25;
        this.sky.update(dt * 8, this.camera.position, this.scene.fog, this.renderer);
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.addEventListener('DOMContentLoaded', () => { window.game = new Game(); });
})();
