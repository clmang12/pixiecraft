/* PixieCraft — procedural background music (pure WebAudio, no audio files).
   A look-ahead step sequencer plays four generated themes that crossfade with the world:
     day    — "Kingdom Waltz": music-box melody over a 3/4 waltz in C major
     night  — "Starlit Lullaby": soft pads and celesta arpeggios in A minor
     desert — "Sunsand Caravan": hand drums and a snake-charmer line in E Phrygian dominant
     boss   — "Crown of Thorns": driving drums, saw bass and brass stabs in D harmonic minor */
(function () {
  'use strict';
  const MV = window.MV;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function makeScale(root, ints) {
    return d => root + Math.floor(d / 7) * 12 + ints[((d % 7) + 7) % 7];
  }

  // Seeded melody: chord tones on strong beats, stepwise motion between, with a repeated A section.
  function genMelody(seed, bars, prog, patterns, lo, hi) {
    const rng = MV.mulberry32(seed);
    let cur = Math.floor((lo + hi) / 2);
    const out = [];
    for (let b = 0; b < bars; b++) {
      if (b >= 8 && b < 12) { out.push(out[b - 8]); continue; }
      const pat = patterns[(rng() * patterns.length) | 0], ch = prog[b % prog.length], notes = [];
      pat.forEach((s, k) => {
        if (k === 0) {
          let best = cur, bd = 99;
          for (let o = -14; o <= 14; o += 7) for (const t of [0, 2, 4]) {
            const d = ch + t + o;
            if (d < lo || d > hi) continue;
            const dist = Math.abs(d - cur) + rng() * 0.5;
            if (dist < bd) { bd = dist; best = d; }
          }
          cur = best;
        } else {
          cur += (rng() < 0.5 ? -1 : 1) * (rng() < 0.75 ? 1 : 2);
          cur = Math.max(lo, Math.min(hi, cur));
        }
        notes.push({ s, d: cur });
      });
      out.push(notes);
    }
    return out;
  }

  class Music {
    constructor(sfx) {
      this.sfx = sfx; this.enabled = true; this.volume = 0.5;
      this.started = false; this.want = 'day'; this.switchAt = 0;
    }

    start() {
      const c = this.sfx.ctx;
      if (!c || this.started) return;
      this.started = true; this.ctx = c;
      this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
      // Generated hall reverb for that magical sparkle
      const len = c.sampleRate * 2.6, imp = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = imp.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      const rev = c.createConvolver(); rev.buffer = imp;
      const wet = c.createGain(); wet.gain.value = 0.32;
      this.bus = c.createGain();
      this.bus.connect(this.master); this.bus.connect(rev); rev.connect(wet); wet.connect(this.master);
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      this.tracks = { day: dayTrack(), night: nightTrack(), desert: desertTrack(), boss: bossTrack(), canyon: canyonTrack(), sea: seaTrack() };
      this.cur = this.tracks[this.want];
      this.step = 0; this.next = c.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 25);
      this.fade(this.enabled ? this.volume : 0, 2.5);
    }

    fade(v, time) {
      const g = this.master.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + time);
    }

    setTrack(name) {
      if (!this.started || name === this.want) return;
      this.want = name;
      this.fade(0, name === 'boss' ? 0.4 : 1.4);
      this.switchAt = this.ctx.currentTime + (name === 'boss' ? 0.4 : 1.4);
    }

    toggle() { this.enabled = !this.enabled; if (this.started) this.fade(this.enabled ? this.volume : 0, 0.5); return this.enabled; }
    setVolume(v) { this.volume = v; if (this.started && this.enabled) this.fade(v, 0.2); }

    schedule() {
      const c = this.ctx;
      if (this.switchAt && c.currentTime >= this.switchAt) {
        this.switchAt = 0; this.cur = this.tracks[this.want]; this.step = 0; this.next = c.currentTime + 0.05;
        this.fade(this.enabled ? this.volume : 0, this.want === 'boss' ? 0.3 : 1.5);
      }
      if (this.next < c.currentTime - 1) this.next = c.currentTime + 0.05; // tab was asleep
      while (this.next < c.currentTime + 0.15) {
        if (!this.switchAt) this.cur.play(this, this.step, this.next);
        this.next += this.cur.stepDur; this.step++;
      }
    }

    // ------------------------------------------------------------ instruments
    voice(type, f, t, dur, vol, a = 0.01, r = 0.3, cutoff = 0, detune = 0) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + a);
      g.gain.setValueAtTime(vol, t + Math.max(a, dur));
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + r);
      let n = o;
      if (cutoff) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; o.connect(fl); n = fl; }
      n.connect(g); g.connect(this.bus);
      o.start(t); o.stop(t + dur + r + 0.05);
    }
    noise(t, dur, vol, type, freq) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
    musicBox(m, t, v = 0.12) { this.voice('sine', hz(m), t, 0.02, v, 0.004, 1.3); this.voice('sine', hz(m) * 4, t, 0.01, v * 0.2, 0.003, 0.35); }
    bell(m, t, v = 0.08) { this.voice('sine', hz(m), t, 0.02, v, 0.004, 2.4); this.voice('sine', hz(m) * 2.76, t, 0.01, v * 0.3, 0.003, 0.9); }
    pluck(m, t, v = 0.06) { this.voice('triangle', hz(m), t, 0.04, v, 0.004, 0.45); }
    bass(m, t, dur, v = 0.14) { this.voice('triangle', hz(m), t, dur, v, 0.01, 0.15); }
    pad(m, t, dur, v = 0.025) { for (const dt of [-7, 7]) this.voice('sawtooth', hz(m), t, dur, v, 0.7, 1.2, 1100, dt); }
    sawBass(m, t, dur, v = 0.09) { this.voice('sawtooth', hz(m), t, dur, v, 0.004, 0.06, 700); }
    slide(m, t, dur, v = 0.05) {
      // Twangy slide guitar: bend up into the note
      const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(m - 1), t); o.frequency.linearRampToValueAtTime(hz(m), t + 0.07);
      f.type = 'lowpass'; f.frequency.value = 1600;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
      o.connect(f); f.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.3);
    }
    brass(m, t, dur, v = 0.05) { this.voice('square', hz(m), t, dur, v, 0.02, 0.12, 1900); this.voice('sawtooth', hz(m), t, dur, v * 0.6, 0.03, 0.12, 1400, 6); }
    kick(t, v = 0.5) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.25);
    }
    snare(t, v = 0.18) { this.noise(t, 0.16, v, 'highpass', 1500); this.voice('triangle', 190, t, 0.02, v * 0.5, 0.002, 0.08); }
    hat(t, v = 0.05) { this.noise(t, 0.04, v, 'highpass', 7000); }
    drum(t, f, v = 0.25) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.18);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.3);
    }
  }

  // ---------------------------------------------------------------- themes
  function dayTrack() {
    const sc = makeScale(60, [0, 2, 4, 5, 7, 9, 11]);
    const prog = [0, 5, 3, 4, 0, 2, 3, 4, 5, 3, 0, 4, 0, 5, 1, 4];
    const mel = genMelody(7, 16, prog, [[0, 2, 4], [0, 3, 4], [0, 2, 3, 4], [0, 4], [0, 1, 2, 4]], 7, 16);
    return {
      stepDur: 0.27, // 8th notes, 3/4 waltz
      play(m, step, t) {
        const bar = Math.floor(step / 6) % 16, s = step % 6, ch = prog[bar];
        if (s === 0) m.bass(sc(ch - 14), t, 0.5);
        if (s === 2 || s === 4) for (const k of [0, 2, 4]) m.pluck(sc(ch + k - 7), t, 0.035);
        for (const n of mel[bar]) if (n.s === s) m.musicBox(sc(n.d), t, 0.11);
        if (bar % 4 === 3 && s === 5) for (let i = 0; i < 4; i++) m.bell(sc(ch + 14 + i * 2), t + i * 0.06, 0.03);
      },
    };
  }

  function nightTrack() {
    const sc = makeScale(57, [0, 2, 3, 5, 7, 8, 10]);
    const prog = [0, 5, 2, 6, 0, 3, 5, 4];
    const mel = genMelody(21, 16, prog, [[0, 5], [0, 3, 6], [0], [0, 2, 4, 6]], 7, 14);
    return {
      stepDur: 0.42, // 8th notes, slow 4/4
      play(m, step, t) {
        const bar = Math.floor(step / 8) % 16, s = step % 8, ch = prog[bar % 8];
        if (s === 0) { m.pad(sc(ch), t, 8 * 0.42, 0.022); m.pad(sc(ch + 2), t, 8 * 0.42, 0.018); m.pad(sc(ch + 4), t, 8 * 0.42, 0.018); m.bass(sc(ch - 7), t, 1.4, 0.1); }
        if (s === 4) m.bass(sc(ch - 3), t, 1, 0.07);
        if (s % 2 === 1) m.musicBox(sc(ch + 14 + [0, 2, 4, 2][(s >> 1) % 4]), t, 0.04);
        for (const n of mel[bar]) if (n.s === s) m.bell(sc(n.d), t, 0.07);
      },
    };
  }

  function desertTrack() {
    const sc = makeScale(52, [0, 1, 4, 5, 7, 8, 10]);
    const prog = [0, 0, 1, 0, 0, 0, 6, 0];
    const mel = genMelody(33, 16, prog, [[0, 2, 3, 4, 6, 10, 12], [0, 4, 6, 8, 12], [0, 1, 2, 3, 8], [0, 8, 10, 11, 12, 14]], 7, 15);
    return {
      stepDur: 0.15, // 16th notes
      play(m, step, t) {
        const bar = Math.floor(step / 16) % 16, s = step % 16, ch = prog[bar % 8];
        if (s === 0 && bar % 2 === 0) { m.pad(sc(0), t, 32 * 0.15, 0.016); m.pad(sc(4), t, 32 * 0.15, 0.012); }
        if (s === 0 || s === 10) m.bass(sc(ch - 7), t, 0.3, 0.12);
        if (s === 0 || s === 6 || s === 10) m.drum(t, 110, 0.3);
        if (s === 4 || s === 12 || s === 14) m.drum(t, 330, 0.12);
        if (s % 2 === 1) m.hat(t, 0.02);
        for (const n of mel[bar]) if (n.s === s) {
          m.pluck(sc(n.d), t, 0.06);
          if (s % 4 === 0 && bar % 2) m.pluck(sc(n.d + 1), t - 0.05, 0.02); // grace note
        }
      },
    };
  }

  function bossTrack() {
    const sc = makeScale(50, [0, 2, 3, 5, 7, 8, 11]);
    const prog = [0, 0, 5, 4, 0, 3, 5, 4];
    const riff = genMelody(99, 16, prog, [[0, 3, 6, 10, 12], [0, 2, 4, 8, 11, 14], [0, 6, 8, 10, 12, 14]], 7, 14);
    return {
      stepDur: 0.1, // 16th notes at 150 BPM
      play(m, step, t) {
        const bar = Math.floor(step / 16) % 16, s = step % 16, ch = prog[bar % 8];
        if (s % 2 === 0) m.sawBass(sc(ch - 14 + (s % 8 === 6 ? 7 : 0)), t, 0.08);
        if (s === 0 || s === 8 || (s === 6 && bar % 2)) m.kick(t);
        if (s === 4 || s === 12) m.snare(t);
        if (s % 2 === 0) m.hat(t, s % 4 ? 0.03 : 0.05);
        if (s === 0 && bar % 2 === 0) for (const k of [0, 2, 4]) m.pad(sc(ch + k), t, 32 * 0.1, 0.012);
        for (const n of riff[bar]) if (n.s === s) m.brass(sc(n.d), t, 0.09, 0.045);
        if (bar % 4 === 3 && s >= 8) m.pluck(sc(ch + 7 + (s - 8)), t, 0.04); // rising run
      },
    };
  }

  // "Route 66 Ramble": boom-chick country road-trip groove in G major for Tailfin Canyon
  function canyonTrack() {
    const sc = makeScale(55, [0, 2, 4, 5, 7, 9, 11]);
    const prog = [0, 0, 3, 3, 0, 4, 3, 0];
    const mel = genMelody(66, 16, prog, [[0, 2, 3, 6], [0, 3, 4], [0, 1, 2, 4, 6], [0, 4, 6]], 7, 14);
    return {
      stepDur: 0.25, // 8th notes, 120 BPM
      play(m, step, t) {
        const bar = Math.floor(step / 8) % 16, s = step % 8, ch = prog[bar % 8];
        if (s === 0) m.bass(sc(ch - 14), t, 0.35, 0.15);
        if (s === 4) m.bass(sc(ch - 10), t, 0.35, 0.13);
        if (s === 2 || s === 6) { for (let k = 0; k < 3; k++) m.pluck(sc(ch + k * 2), t + k * 0.018, 0.04); m.snare(t, 0.06); }
        if (s === 0 || s === 4) m.kick(t, 0.3);
        if (s % 2 === 1) m.hat(t, 0.02);
        for (const n of mel[bar]) if (n.s === s) m.slide(sc(n.d), t, 0.2, 0.045);
      },
    };
  }

  // "Cursed Cove Shanty": a rollicking 6/8 pirate jig in D dorian — fiddle, squeezebox and stomping drum
  function seaTrack() {
    const sc = makeScale(62, [0, 2, 3, 5, 7, 9, 10]);
    const prog = [0, 0, 6, 6, 0, 0, 4, 0];
    const mel = genMelody(1717, 16, prog, [[0, 1, 2, 3, 4, 5], [0, 2, 3, 5], [0, 3, 4, 5], [0, 1, 2, 3], [0, 3]], 7, 14);
    return {
      stepDur: 0.19, // 8th notes in 6/8
      play(m, step, t) {
        const bar = Math.floor(step / 6) % 16, s = step % 6, ch = prog[bar % 8];
        if (s === 0) { m.bass(sc(ch - 14), t, 0.3, 0.15); m.drum(t, 95, 0.3); }
        if (s === 3) { m.bass(sc(ch - 10), t, 0.3, 0.12); m.drum(t, 110, 0.2); }
        if (s === 1 || s === 2 || s === 4 || s === 5) for (const k of [0, 2, 4]) m.voice('square', 440 * Math.pow(2, (sc(ch + k) - 69) / 12), t, 0.08, 0.012, 0.01, 0.06, 1400);
        for (const n of mel[bar]) if (n.s === s) m.voice('sawtooth', 440 * Math.pow(2, (sc(n.d) - 69) / 12), t, 0.14, 0.04, 0.012, 0.1, 2400, 4);
        if (s === 5 && bar % 4 === 3) m.hat(t, 0.05);
      },
    };
  }

  MV.Music = Music;
})();
