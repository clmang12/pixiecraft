/* PixieCraft — day/night cycle: gradient sky dome, magical twilight, twinkling stars, sun, moon, clouds */
(function () {
  'use strict';
  const MV = window.MV;
  const C = h => new THREE.Color(h);

  const DAY_TOP = C('#3f9bff'), DAY_HOR = C('#c4ecff');
  const NIGHT_TOP = C('#07042a'), NIGHT_HOR = C('#2b1860');
  const TWI_TOP = C('#5b3bb8'), TWI_HOR = C('#ff8fb4'), TWI_GLOW = C('#ffb45e');
  const LIGHT_DAY = C('#ffffff'), LIGHT_NIGHT = C('#4a4c86'), LIGHT_TWI = C('#ffb3d0');

  function sunTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.18, 'rgba(255,246,190,1)');
    g.addColorStop(0.3, 'rgba(255,220,120,0.55)'); g.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    ctx.translate(64, 64); ctx.fillStyle = 'rgba(255,240,180,0.35)';
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillRect(-2, 20, 4, 36); }
    return new THREE.CanvasTexture(cv);
  }
  function moonTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    g.addColorStop(0, 'rgba(200,190,255,0.5)'); g.addColorStop(1, 'rgba(120,100,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#fbf6ff'; ctx.beginPath(); ctx.arc(64, 64, 24, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(76, 56, 21, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(cv);
  }

  class Sky {
    constructor(scene) {
      this.scene = scene;
      this.time = 0.07; // 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight
      this.dayLength = 600;
      this.day = 1;
      this.light = new THREE.Color(1, 1, 1);
      this.horizon = new THREE.Color();
      this.sunDir = new THREE.Vector3();
      this.group = new THREE.Group();
      scene.add(this.group);

      this.uniforms = {
        top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
        sunDir: { value: this.sunDir }, glow: { value: new THREE.Color() },
      };
      const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
        uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow;
          varying vec3 vPos;
          void main(){
            vec3 d = normalize(vPos); float h = d.y;
            vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.4));
            float s = max(dot(d, sunDir), 0.0);
            col += glow * (pow(s, 5.0) * 0.5 + pow(s, 60.0) * 0.6) * (1.0 - clamp(abs(h) * 1.5, 0.0, 0.7));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }));
      dome.renderOrder = -10;
      this.group.add(dome);

      // Stars in pastel magic colors
      const N = 1600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      const tints = [[1, 1, 1], [1, 0.8, 0.95], [0.75, 0.9, 1], [1, 0.95, 0.7]];
      for (let i = 0; i < N; i++) {
        const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 1.1 - 0.1);
        pos[i * 3] = Math.sin(v) * Math.cos(u) * 450; pos[i * 3 + 1] = Math.cos(v) * 450; pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 450;
        const t = tints[(Math.random() * 4) | 0], b = 0.5 + Math.random() * 0.5;
        col[i * 3] = t[0] * b; col[i * 3 + 1] = t[1] * b; col[i * 3 + 2] = t[2] * b;
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.starMat = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false });
      this.stars = new THREE.Points(sg, this.starMat);
      this.stars.renderOrder = -9;
      this.group.add(this.stars);

      const spr = (tex, s) => {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
        m.scale.set(s, s, 1); m.renderOrder = -8; this.group.add(m); return m;
      };
      this.sun = spr(sunTexture(), 110);
      this.moon = spr(moonTexture(), 80);

      // Soft voxel clouds drifting overhead
      this.cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, fog: false, depthWrite: false });
      this.clouds = [];
      const box = new THREE.BoxGeometry(1, 1, 1);
      for (let i = 0; i < 28; i++) {
        const c = new THREE.Group();
        const parts = 2 + ((Math.random() * 3) | 0);
        for (let j = 0; j < parts; j++) {
          const m = new THREE.Mesh(box, this.cloudMat);
          m.scale.set(12 + Math.random() * 20, 4, 10 + Math.random() * 14);
          m.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 16);
          c.add(m);
        }
        c.position.set((Math.random() - 0.5) * 500, 105 + Math.random() * 15, (Math.random() - 0.5) * 500);
        c.renderOrder = 3;
        this.clouds.push(c); scene.add(c);
      }
    }

    get isNight() { return this.sunDir.y < -0.08; }

    clockString() {
      const hrs = ((this.time + 0.25) % 1) * 24, h = Math.floor(hrs), m = Math.floor((hrs - h) * 60);
      const icon = this.sunDir.y > 0.1 ? '☀' : this.sunDir.y > -0.1 ? '✧' : '☾';
      return `${icon} Day ${this.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    update(dt, camPos, fog, renderer) {
      this.time += dt / this.dayLength;
      if (this.time >= 1) { this.time -= 1; this.day++; }
      const a = this.time * Math.PI * 2;
      this.sunDir.set(Math.cos(a), Math.sin(a), 0.28).normalize();
      const sy = this.sunDir.y;
      const day = MV.smooth(-0.14, 0.22, sy);
      const twi = Math.max(0, 1 - Math.abs(sy) / 0.3);

      const top = NIGHT_TOP.clone().lerp(DAY_TOP, day).lerp(TWI_TOP, twi * 0.55);
      const hor = NIGHT_HOR.clone().lerp(DAY_HOR, day).lerp(TWI_HOR, twi * 0.75);
      this.uniforms.top.value.copy(top);
      this.uniforms.horizon.value.copy(hor);
      this.uniforms.bottom.value.copy(hor).multiplyScalar(0.55);
      this.uniforms.glow.value.copy(TWI_GLOW).multiplyScalar(twi * 0.9 + day * 0.15);
      this.horizon.copy(hor);
      fog.color.copy(hor);
      renderer.setClearColor(hor);

      this.light.copy(LIGHT_NIGHT).lerp(LIGHT_DAY, day).lerp(LIGHT_TWI, twi * 0.25);
      if (this.flash > 0) { this.light.lerp(LIGHT_DAY, this.flash * 0.45); this.flash = Math.max(0, this.flash - Math.max(dt, 1 / 60) * 2.5); }
      this.dayF = day;
      this.starMat.opacity = Math.max(0, 1 - day * 1.4);
      this.stars.rotation.y += dt * 0.004;

      this.group.position.copy(camPos);
      this.sun.position.copy(this.sunDir).multiplyScalar(300);
      this.moon.position.copy(this.sunDir).multiplyScalar(-300);
      this.sun.material.opacity = MV.smooth(-0.15, 0.02, sy);
      this.moon.material.opacity = MV.smooth(0.15, -0.02, sy);

      this.cloudMat.color.copy(this.light).lerp(TWI_HOR, twi * 0.35);
      for (const c of this.clouds) {
        c.position.x += dt * 1.6;
        if (c.position.x - camPos.x > 260) c.position.x -= 520;
        if (c.position.x - camPos.x < -260) c.position.x += 520;
        if (c.position.z - camPos.z > 260) c.position.z -= 520;
        if (c.position.z - camPos.z < -260) c.position.z += 520;
      }
    }
  }

  MV.Sky = Sky;
})();
