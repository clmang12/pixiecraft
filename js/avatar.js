/* PixieCraft — player characters and outfits.
   One voxel character model shared by your own third-person body, the Wardrobe preview and the
   other players you see online. An outfit is a style (which sets the hat and silhouette) plus
   three colours you pick: outfit colour, skin tone and hair. */
(function () {
  'use strict';
  const MV = window.MV;
  const box = (...a) => MV.mobBox(...a), pivot = (...a) => MV.mobPivot(...a);
  const hex = s => parseInt(String(s).replace('#', ''), 16);
  const shade = (c, k) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return (Math.min(255, r * k) << 16) | (Math.min(255, g * k) << 8) | Math.min(255, b * k); };

  MV.OUTFIT_STYLES = [
    { id: 'pixie', name: 'Pixie', icon: '🧚' },
    { id: 'princess', name: 'Princess', icon: '👑' },
    { id: 'knight', name: 'Knight', icon: '🛡' },
    { id: 'wizard', name: 'Wizard', icon: '🪄' },
    { id: 'pirate', name: 'Pirate', icon: '🏴‍☠️' },
    { id: 'explorer', name: 'Explorer', icon: '🧭' },
    { id: 'royal', name: 'Royal', icon: '🏰' },
  ];
  MV.OUTFIT_COLORS = ['#2e9d4a', '#e63946', '#ff7ad9', '#4d7cff', '#9b6bff', '#ffc93c', '#20c0c0', '#ff8c28', '#f4f4f4', '#2a2a3a'];
  MV.SKIN_TONES = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'];
  MV.HAIR_COLORS = ['#5a3a22', '#1e1410', '#d9a441', '#f3e3a0', '#b5452a', '#e8e8f0', '#ff7ad9', '#4d7cff'];

  const DEFAULT = { style: 'pixie', color: '#2e9d4a', skin: '#ffe0bd', hair: '#5a3a22' };
  MV.defaultOutfitFor = id => {
    const h = MV.hashString(String(id || 'x'));
    return { style: MV.OUTFIT_STYLES[h % MV.OUTFIT_STYLES.length].id, color: MV.OUTFIT_COLORS[h % 8], skin: MV.SKIN_TONES[(h >> 3) % 4], hair: MV.HAIR_COLORS[(h >> 5) % 5] };
  };
  MV.loadOutfit = () => {
    try { return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem('pixiecraft-outfit')) || {}); } catch (e) { return Object.assign({}, DEFAULT); }
  };
  MV.saveOutfit = o => { try { localStorage.setItem('pixiecraft-outfit', JSON.stringify(o)); } catch (e) { /* storage unavailable */ } };

  // Returns { root, P } — P has legL/legR/armL/armR/head pivots for animation.
  MV.buildAvatar = function (outfit) {
    const o = Object.assign({}, DEFAULT, outfit || {});
    const C = hex(o.color), SKIN = hex(o.skin), HAIR = hex(o.hair), DARK = shade(C, 0.55), GOLD = 0xffcc40;
    const root = new THREE.Group(), P = {};
    const robe = o.style === 'wizard' || o.style === 'princess';
    const PANTS = o.style === 'knight' ? 0x9aa0ae : o.style === 'explorer' ? 0x8a6a40 : o.style === 'pirate' ? 0x2a2a3a : DARK;
    const SHIRT = o.style === 'knight' ? 0xb8bfcc : o.style === 'explorer' ? 0xd8c08a : o.style === 'pirate' ? 0xf0ece0 : C;

    for (const s of [-1, 1]) {
      const leg = pivot(root, s * 0.12, 0.72, 0);
      box(leg, 0.2, 0.72, 0.22, PANTS, 0, -0.36, 0);
      box(leg, 0.22, 0.14, 0.26, o.style === 'knight' ? 0x7a808e : 0x3a2a1e, 0, -0.66, 0.02);   // boots
      P[s < 0 ? 'legL' : 'legR'] = leg;
      const arm = pivot(root, s * 0.34, 1.38, 0);
      box(arm, 0.16, 0.66, 0.2, SHIRT, 0, -0.3, 0);
      box(arm, 0.16, 0.14, 0.2, o.style === 'knight' ? 0x7a808e : SKIN, 0, -0.68, 0);
      P[s < 0 ? 'armL' : 'armR'] = arm;
    }
    box(root, 0.5, 0.68, 0.28, SHIRT, 0, 1.06, 0);
    const head = pivot(root, 0, 1.62, 0);
    box(head, 0.42, 0.42, 0.42, SKIN, 0, 0, 0);
    box(head, 0.07, 0.08, 0.02, 0x222222, -0.1, 0.0, 0.215);
    box(head, 0.07, 0.08, 0.02, 0x222222, 0.1, 0.0, 0.215);
    box(head, 0.12, 0.03, 0.02, 0xb04a4a, 0, -0.11, 0.215);
    box(head, 0.44, 0.12, 0.44, HAIR, 0, 0.17, 0);
    box(head, 0.44, 0.3, 0.06, HAIR, 0, 0.02, -0.2);
    P.head = head;

    switch (o.style) {
      case 'pixie': {
        box(head, 0.32, 0.26, 0.32, C, 0, 0.34, 0).rotation.y = Math.PI / 4;
        box(head, 0.18, 0.2, 0.18, C, 0, 0.54, 0).rotation.y = Math.PI / 4;
        box(head, 0.08, 0.14, 0.08, C, 0.04, 0.7, 0.02);
        box(root, 0.52, 0.06, 0.3, GOLD, 0, 0.74, 0);
        const wingMat = new THREE.MeshBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), wingMat);
          w.position.set(s * 0.22, 1.2, -0.2); w.rotation.y = s * 0.6; root.add(w);
          P[s < 0 ? 'wingL' : 'wingR'] = w;
        }
        break;
      }
      case 'princess':
        box(root, 0.66, 0.62, 0.46, C, 0, 0.46, 0);           // full skirt
        box(root, 0.56, 0.2, 0.38, shade(C, 1.2), 0, 0.82, 0);
        box(head, 0.44, 0.5, 0.08, HAIR, 0, -0.05, -0.22);    // long hair
        box(head, 0.36, 0.06, 0.06, GOLD, 0, 0.27, 0.12);     // tiara
        for (const x of [-0.12, 0, 0.12]) box(head, 0.06, x ? 0.08 : 0.13, 0.04, GOLD, x, 0.33, 0.12);
        box(head, 0.05, 0.05, 0.03, 0xff3d6e, 0, 0.36, 0.145, true);
        break;
      case 'knight':
        box(head, 0.48, 0.48, 0.48, 0xb8bfcc, 0, 0.02, 0);    // helmet
        box(head, 0.36, 0.05, 0.02, 0x222233, 0, 0.04, 0.245); // visor slit
        box(head, 0.08, 0.3, 0.26, C, 0, 0.36, -0.04);         // plume
        box(root, 0.36, 0.5, 0.04, C, 0, 1.0, 0.16);           // tabard
        box(root, 0.1, 0.1, 0.02, GOLD, 0, 1.12, 0.185);
        break;
      case 'wizard':
        box(root, 0.6, 0.7, 0.42, C, 0, 0.38, 0);              // long robe
        for (let i = 0; i < 4; i++) box(head, 0.5 - i * 0.12, 0.16, 0.5 - i * 0.12, C, 0, 0.27 + i * 0.15, -i * 0.03);
        box(head, 0.56, 0.04, 0.56, shade(C, 0.8), 0, 0.22, 0);
        box(head, 0.08, 0.08, 0.02, GOLD, 0.1, 0.42, 0.2, true);
        box(head, 0.3, 0.2, 0.08, 0xe8e8f0, 0, -0.22, 0.2);   // beard
        break;
      case 'pirate':
        box(root, 0.52, 0.5, 0.3, C, 0, 1.08, -0.01);          // vest over a white shirt
        box(root, 0.18, 0.5, 0.02, 0xf0ece0, 0, 1.08, 0.15);
        box(root, 0.54, 0.08, 0.32, 0x3a2a1e, 0, 0.76, 0);
        box(head, 0.58, 0.05, 0.58, 0x1a1a1a, 0, 0.24, 0).rotation.y = Math.PI / 4;
        box(head, 0.59, 0.02, 0.59, GOLD, 0, 0.26, 0).rotation.y = Math.PI / 4;
        box(head, 0.36, 0.16, 0.36, 0x1a1a1a, 0, 0.33, 0);
        box(head, 0.12, 0.1, 0.02, 0x111111, 0.1, 0.0, 0.222);  // eye patch
        break;
      case 'explorer':
        box(head, 0.7, 0.04, 0.7, 0xc9a86a, 0, 0.24, 0);       // safari hat
        box(head, 0.42, 0.16, 0.42, 0xc9a86a, 0, 0.32, 0);
        box(head, 0.43, 0.04, 0.43, C, 0, 0.27, 0);
        box(root, 0.4, 0.46, 0.2, C, 0, 1.06, -0.24);          // backpack
        box(root, 0.44, 0.06, 0.24, 0x3a2a1e, 0, 1.2, -0.24);
        break;
      case 'royal':
        box(head, 0.4, 0.1, 0.4, GOLD, 0, 0.27, 0);             // crown
        for (const [x, z] of [[-0.16, 0.16], [0.16, 0.16], [-0.16, -0.16], [0.16, -0.16], [0, 0.16]]) box(head, 0.07, 0.12, 0.07, GOLD, x, 0.37, z);
        box(head, 0.06, 0.06, 0.03, 0xff3d6e, 0, 0.27, 0.215, true);
        box(root, 0.6, 1.2, 0.05, C, 0, 0.82, -0.18);           // cape
        box(root, 0.62, 0.1, 0.32, 0xf4f4f4, 0, 1.38, -0.02);   // ermine collar
        break;
    }
    return { root, P };
  };

  // Shared walk cycle (speed 0..1)
  MV.animateAvatar = function (a, dt, speed, pitch) {
    a.t = (a.t || 0) + dt * (4 + speed * 6);
    const sw = Math.sin(a.t) * 0.7 * speed;
    a.P.legL.rotation.x = sw; a.P.legR.rotation.x = -sw; a.P.armL.rotation.x = -sw; a.P.armR.rotation.x = sw;
    if (pitch != null) a.P.head.rotation.x = Math.max(-0.6, Math.min(0.6, -pitch));
    if (a.P.wingL) { const f = Math.sin(a.t * 3) * 0.25; a.P.wingL.rotation.y = -0.6 - f; a.P.wingR.rotation.y = 0.6 + f; }
  };
})();
