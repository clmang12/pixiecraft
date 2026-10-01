/* PixieCraft — tiny procedural WebAudio sound effects (no audio files) */
(function () {
  'use strict';
  const MV = window.MV;

  class Sfx {
    constructor() { this.ctx = null; this.muted = false; }
    init() {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    }
    tone(freq, dur, type = 'sine', vol = 0.06, slide = 0, delay = 0) {
      const c = this.ctx; if (!c || this.muted) return;
      const t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    noise(dur, vol = 0.08, freq = 900) {
      const c = this.ctx; if (!c || this.muted) return;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
      s.buffer = buf; s.connect(f).connect(g).connect(c.destination); s.start();
    }
    chime() { [880, 1320, 1760, 2640].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.04, 0, i * 0.06)); }
    spell() { this.tone(520, 0.25, 'triangle', 0.05, 700); this.tone(1040, 0.2, 'sine', 0.03, 900); }
    pop() { this.tone(900, 0.12, 'sine', 0.04, -500); this.noise(0.08, 0.04, 3000); }
    brk() { this.noise(0.12, 0.1, 1200); }
    place() { this.tone(240, 0.07, 'square', 0.025, -60); this.noise(0.05, 0.05, 600); }
    hurt() { this.tone(200, 0.22, 'sawtooth', 0.05, -90); }
    click() { this.tone(1200, 0.05, 'sine', 0.03); }
    groan() { this.tone(110, 0.9, 'sawtooth', 0.02, -40); this.tone(116, 0.9, 'triangle', 0.03, -45); }
    splash() { this.noise(0.35, 0.09, 2200); this.tone(600, 0.15, 'sine', 0.02, -400); }
    boom() { this.tone(90, 0.6, 'sine', 0.2, -60); this.noise(0.5, 0.2, 400); }
    roar() { this.tone(160, 1.0, 'sawtooth', 0.06, -90); this.tone(120, 1.0, 'square', 0.03, -60); this.noise(0.8, 0.08, 700); }
    fire() { this.noise(0.4, 0.08, 1500); this.tone(300, 0.3, 'sawtooth', 0.03, -200); }
    creak() { this.tone(70, 1.2, 'sawtooth', 0.03, 30); this.tone(95, 0.9, 'square', 0.015, -25); }
    honk(v) { const f = v === 'tow' ? 330 : v === 'racer' ? 520 : 440; this.tone(f, 0.12, 'square', 0.035); this.tone(f * 1.26, 0.18, 'square', 0.03, 0, 0.15); }
    whistle() { this.tone(900, 1.1, 'sine', 0.012, 1500); }
    firework() { this.tone(70, 0.8, 'sine', 0.16, -30); this.noise(0.9, 0.14, 900); }
    crackle() { for (let i = 0; i < 6; i++) setTimeout(() => this.noise(0.04, 0.06, 5000), i * 45 + Math.random() * 30); }
    gunshot() { this.noise(0.18, 0.2, 2500); this.tone(140, 0.15, 'square', 0.05, -80); }
    chomp() { this.tone(220, 0.08, 'square', 0.05, -120); this.noise(0.06, 0.08, 1800); }
    bubble() { this.tone(500 + Math.random() * 300, 0.08, 'sine', 0.03, 400); }
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.9 : 0.18, 'square', 0.035, 0, i * 0.14)); }
  }

  MV.Sfx = Sfx;
})();
