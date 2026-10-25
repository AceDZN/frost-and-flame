// Small WebAudio synth: everything is generated, nothing is fetched.
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private hum: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  muted = false;

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startWind();
    this.startHum();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }

  suspend(s: boolean) {
    if (!this.ctx) return;
    if (s) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  private startWind() {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 0.6;
    const g = c.createGain();
    g.gain.value = 0.07;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.13;
    const lg = c.createGain();
    lg.gain.value = 180;
    lfo.connect(lg).connect(f.frequency);
    src.connect(f).connect(g).connect(this.master!);
    src.start();
    lfo.start();
  }

  private startHum() {
    const c = this.ctx!;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    const osc2 = c.createOscillator();
    osc2.type = 'sine';
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = c.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(this.master!);
    osc.start();
    osc2.start();
    this.hum = { osc, osc2, gain, filter };
  }

  /** Continuous glove hum: mode and strength 0..1. */
  glove(mode: 'heat' | 'cold' | null, strength: number, blocked: boolean) {
    if (!this.hum || !this.ctx) return;
    const t = this.ctx.currentTime;
    const on = mode && !blocked ? 0.06 + strength * 0.07 : 0;
    this.hum.gain.gain.setTargetAtTime(on, t, 0.06);
    const base = mode === 'cold' ? 220 : 110;
    this.hum.osc.frequency.setTargetAtTime(base + strength * (mode === 'cold' ? 160 : 90), t, 0.1);
    this.hum.osc2.frequency.setTargetAtTime((base + strength * 60) * 1.5, t, 0.1);
    this.hum.filter.frequency.setTargetAtTime(mode === 'cold' ? 2400 : 700 + strength * 600, t, 0.1);
  }

  private burst(dur: number, freq: number, type: BiquadFilterType, vol: number, q = 1, sweepTo?: number) {
    if (!this.ctx || !this.noise) return;
    const c = this.ctx;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, slideTo?: number, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  crack() {
    this.burst(0.25, 2500, 'highpass', 0.5, 0.8);
    this.tone(180, 0.2, 'square', 0.08, 60);
  }
  splash() {
    this.burst(0.6, 1200, 'lowpass', 0.6, 0.7, 300);
  }
  whoosh() {
    this.burst(0.9, 300, 'bandpass', 0.35, 0.7, 2400);
  }
  frost() {
    this.burst(0.5, 6000, 'highpass', 0.25, 1);
    [1320, 1760, 2093].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.05, undefined, i * 0.06));
  }
  thunk() {
    this.tone(90, 0.25, 'sine', 0.35, 50);
    this.burst(0.15, 400, 'lowpass', 0.3);
  }
  squish() {
    this.tone(160, 0.35, 'sine', 0.25, 340);
    this.tone(340, 0.3, 'sine', 0.15, 140, 0.32);
  }
  clank() {
    this.tone(220, 0.4, 'square', 0.08);
    this.tone(330, 0.4, 'square', 0.06);
    this.burst(0.2, 3000, 'bandpass', 0.2, 4);
  }
  jump() {
    this.tone(320, 0.15, 'sine', 0.08, 520);
  }
  land() {
    this.burst(0.12, 900, 'lowpass', 0.25);
  }
  glass() {
    this.tone(2200, 0.15, 'sine', 0.12);
    this.tone(2900, 0.2, 'sine', 0.08, undefined, 0.03);
  }
  empty() {
    this.tone(200, 0.25, 'square', 0.1, 120);
    this.tone(150, 0.3, 'square', 0.1, 90, 0.25);
  }
  full() {
    this.tone(880, 0.2, 'triangle', 0.12);
    this.tone(1320, 0.3, 'triangle', 0.1, undefined, 0.12);
  }
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.14, undefined, i * 0.11));
  }
  click() {
    this.tone(660, 0.06, 'sine', 0.08);
  }
}
