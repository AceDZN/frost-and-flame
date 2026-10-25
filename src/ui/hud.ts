import type { Game } from '../game/game';
import type { Glyph } from '../game/types';
import { MATERIALS, PHASE_HE, type Phase } from '../sim/materials';
import { Lens } from './lens';
import type { InputState } from '../input';

const ICON = {
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/></svg>',
  lens: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/></svg>',
};

const CHANGE_HE: Record<string, string> = {
  'solid>liquid': 'התכה',
  'liquid>gas': 'רתיחה',
  'gas>liquid': 'עיבוי',
  'liquid>solid': 'קיפאון',
  'solid>gas': 'המראה',
  'gas>solid': 'ריבוץ',
};

const PHASE_ICON: Record<Phase, string> = { solid: '🧊', liquid: '💧', gas: '♨️' };

export function fmtMJ(kJ: number) {
  const mj = kJ / 1000;
  return mj >= 100 ? `${Math.round(mj)} MJ` : `${mj.toFixed(1)} MJ`;
}

function fmtT(T: number) {
  const r = Math.abs(T) < 0.05 ? 0 : T;
  return `${r.toFixed(Math.abs(r) < 10 && r % 1 !== 0 ? 1 : 0).replace('-', '−')} °C`;
}

export interface HudCallbacks {
  pause: () => void;
  restart: () => void;
  toggleSound: () => boolean;
}

export class Hud {
  readonly el: HTMLElement;
  private plaque: HTMLElement;
  private objective: HTMLElement;
  private battery: HTMLElement;
  private batFill: HTMLElement;
  private batValue: HTMLElement;
  private batDelta: HTMLElement;
  private gauge: HTMLElement;
  private gThermo: HTMLElement;
  private gReadout: HTMLElement;
  private gPhase: HTMLElement;
  private gRing: HTMLElement;
  private hint: HTMLElement;
  private toasts: HTMLElement;
  private lensWrap: HTMLElement;
  private lensTags: Record<string, HTMLElement> = {};
  private vignette: HTMLElement;
  private lens = new Lens();
  private soundBtn: HTMLButtonElement;
  private lensBtn: HTMLButtonElement;
  private lastBattery = 0;
  private deltaAcc = 0;
  private deltaT = 0;
  private hintKey = '';
  private lastH = new Map<string, number>();
  private dir = new Map<string, 'up' | 'down'>();
  readonly playLayer: HTMLElement;
  isTouch = false;

  constructor(root: HTMLElement, private input: InputState, cb: HudCallbacks) {
    this.el = root;
    this.playLayer = document.createElement('div');
    this.playLayer.className = 'play-layer';
    root.appendChild(this.playLayer);
    const P = this.playLayer;
    P.innerHTML = `
      <div class="lens-vignette" hidden></div>
      <div class="top-left">
        <button class="round-btn" data-a="pause" aria-label="השהיה">${ICON.pause}</button>
        <button class="round-btn" data-a="sound" aria-label="צליל">${ICON.sound}</button>
        <button class="round-btn" data-a="restart" aria-label="התחלה מחדש">${ICON.restart}</button>
        <button class="round-btn" data-a="lens" aria-label="עדשת חלקיקים">${ICON.lens}</button>
      </div>
      <div class="top-right">
        <div class="plaque"></div>
        <div class="objective brass-frame"><span class="txt"></span><span class="icon">🗼</span></div>
      </div>
      <div class="gauge" hidden>
        <div class="thermo"></div>
        <div class="readout brass-frame ltr"></div>
        <div class="phase brass-frame"></div>
        <div class="ring"></div>
      </div>
      <div class="hint" hidden></div>
      <div class="toast-wrap"></div>
      <div class="lens" hidden>
        <div class="tag brass-frame t-top"></div>
        <div class="tag brass-frame t-right"></div>
        <div class="tag brass-frame t-left"></div>
        <div class="tag brass-frame t-bottom"></div>
      </div>
      <div class="battery brass-frame">
        <div class="label brass-frame">סוללת חום</div>
        <div class="bar"><div class="fill"></div><div class="value"></div></div>
        <div class="delta"></div>
      </div>
      <div class="keys-legend brass-frame">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> הליכה · <kbd>רווח</kbd> קפיצה</div>
        <div class="h"><kbd>E</kbd> / לחצן ימני — כפפת חום 🔥</div>
        <div class="c"><kbd>Q</kbd> / לחצן שמאלי — כפפת קור ❄️</div>
        <div><kbd>F</kbd> עדשת חלקיקים · <kbd>R</kbd> מחדש</div>
      </div>
      <div class="touch">
        <div class="stick"><div class="nub"></div></div>
        <div class="actions">
          <button class="act lens-btn" data-t="lens" aria-label="עדשה">🔍</button>
          <button class="act cold" data-t="cold" aria-label="קור">❄️</button>
          <button class="act heat" data-t="heat" aria-label="חום">🔥</button>
          <button class="act jump" data-t="jump" aria-label="קפיצה">⤒</button>
        </div>
      </div>`;
    const q = <T extends HTMLElement>(s: string) => P.querySelector(s) as T;
    this.plaque = q('.plaque');
    this.objective = q('.objective .txt');
    this.battery = q('.battery');
    this.batFill = q('.battery .fill');
    this.batValue = q('.battery .value');
    this.batDelta = q('.battery .delta');
    this.gauge = q('.gauge');
    this.gThermo = q('.gauge .thermo');
    this.gReadout = q('.gauge .readout');
    this.gPhase = q('.gauge .phase');
    this.gRing = q('.gauge .ring');
    this.hint = q('.hint');
    this.toasts = q('.toast-wrap');
    this.lensWrap = q('.lens');
    this.vignette = q('.lens-vignette');
    this.lensWrap.prepend(this.lens.canvas);
    for (const k of ['top', 'right', 'left', 'bottom']) this.lensTags[k] = q(`.lens .t-${k}`);
    this.soundBtn = q('[data-a="sound"]');
    this.lensBtn = q('[data-a="lens"]');
    q('[data-a="pause"]').addEventListener('click', cb.pause);
    q('[data-a="restart"]').addEventListener('click', cb.restart);
    this.soundBtn.addEventListener('click', () => {
      const muted = cb.toggleSound();
      this.soundBtn.innerHTML = muted ? ICON.mute : ICON.sound;
    });
    this.lensBtn.addEventListener('click', () => {
      input.lensToggle = !input.lensToggle;
    });
    this.setupTouch();
  }

  setMutedIcon(m: boolean) {
    this.soundBtn.innerHTML = m ? ICON.mute : ICON.sound;
  }

  private setupTouch() {
    const stick = this.playLayer.querySelector('.stick') as HTMLElement;
    const nub = stick.querySelector('.nub') as HTMLElement;
    let id: number | null = null;
    const move = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }
      nub.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
      this.input.touch.x = dx;
      this.input.touch.y = -dy;
    };
    stick.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      this.input.onAny?.();
      move(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) move(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      nub.style.transform = '';
      this.input.touch.x = this.input.touch.y = 0;
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    this.playLayer.querySelectorAll<HTMLElement>('.act').forEach((b) => {
      const key = b.dataset.t as 'heat' | 'cold' | 'jump' | 'lens';
      const set = (v: boolean) => {
        this.input.touch[key] = v;
        b.classList.toggle('down', v);
      };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.input.onAny?.();
        set(true);
      });
      b.addEventListener('pointerup', () => set(false));
      b.addEventListener('pointercancel', () => set(false));
      b.addEventListener('lostpointercapture', () => set(false));
    });
  }

  setTouch(on: boolean) {
    this.isTouch = on;
    this.el.parentElement!.classList.toggle('is-touch', on);
  }

  setLevel(g: Game) {
    this.plaque.textContent = `שלב ${g.def.index} · ${g.def.nameHe}`;
    this.objective.textContent = g.def.objectiveHe;
    this.lastBattery = g.battery.energy;
    this.deltaAcc = 0;
    this.toasts.innerHTML = '';
    this.hintKey = '';
    this.lastH.clear();
    this.dir.clear();
  }

  show(on: boolean) {
    this.playLayer.style.display = on ? '' : 'none';
  }

  private recent = new Map<string, number>();

  toast(text: string, kind: '' | 'heat' | 'cold' = '', ms = 2400) {
    const now = performance.now();
    if ((this.recent.get(text) ?? -1e9) > now - 4000) return;
    this.recent.set(text, now);
    const t = document.createElement('div');
    t.className = `toast brass-frame ${kind}`;
    t.textContent = text;
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild!.remove();
    setTimeout(() => t.remove(), ms);
  }

  flashBrr() {
    const b = document.createElement('div');
    b.className = 'brr';
    this.el.appendChild(b);
    setTimeout(() => b.remove(), 1200);
  }

  private glyphHtml(gl: Glyph): { cls: string; html: string } {
    const touch = this.isTouch;
    switch (gl) {
      case 'heat':
        return { cls: 'heat', html: touch ? '🔥' : `🔥<span class="k">E</span>` };
      case 'cold':
        return { cls: 'cold', html: touch ? '❄️' : `❄️<span class="k">Q</span>` };
      case 'jump':
        return { cls: '', html: touch ? '⤒' : '<span style="font-size:18px">רווח</span>' };
      case 'glide':
        return { cls: 'heat', html: touch ? '⤒' : '🪁<span class="k">רווח</span>' };
      case 'step':
        return { cls: '', html: '⬇' };
      case 'lens':
        return { cls: 'cold', html: touch ? '🔍' : '🔍<span class="k">F</span>' };
      case 'go':
      default:
        return { cls: '', html: '🗼' };
    }
  }

  /**
   * Per-frame update. `project` maps an anchor id to screen px (or null when off-screen).
   */
  update(g: Game, dt: number, project: (id: string) => { x: number; y: number } | null, lensOn: boolean) {
    // battery
    const e = g.battery.energy;
    const frac = e / g.battery.capacity;
    this.batFill.style.width = `${(frac * 100).toFixed(1)}%`;
    this.batValue.textContent = fmtMJ(e);
    const d = e - this.lastBattery;
    this.lastBattery = e;
    this.battery.classList.toggle('charging', d > 1);
    this.battery.classList.toggle('low', e < 0.05 * g.battery.capacity && g.glove === 'heat');
    if (Math.abs(d) > 1) {
      this.deltaAcc += d;
      this.deltaT = 1.4;
    } else this.deltaT -= dt;
    if (this.deltaT > 0 && Math.abs(this.deltaAcc) > 500) {
      this.batDelta.style.opacity = '1';
      this.batDelta.style.color = this.deltaAcc > 0 ? '#8fe8ff' : '#ffb347';
      this.batDelta.innerHTML = `<span class="ltr">${this.deltaAcc > 0 ? '+' : '−'}${fmtMJ(Math.abs(this.deltaAcc))}</span>`;
    } else {
      this.batDelta.style.opacity = '0';
      if (this.deltaT <= 0) this.deltaAcc = 0;
    }

    // remember which way each body's energy last moved (for plateau labels)
    for (const [id, b] of g.sys.bodies) {
      const prev = this.lastH.get(id);
      if (prev !== undefined && Math.abs(b.H - prev) > 1e-3) this.dir.set(id, b.H > prev ? 'up' : 'down');
      this.lastH.set(id, b.H);
    }
    // target gauge
    const tid = g.target;
    const ent = tid ? g.def.entities.find((x) => x.id === tid) : null;
    const bodyId = ent ? g.bodyOf(ent) : null;
    const pos = tid ? project(tid) : null;
    if (ent && bodyId && pos && !lensOn) {
      const b = g.body(bodyId);
      const st = b.state;
      this.gauge.hidden = false;
      this.gauge.style.left = `${pos.x}px`;
      this.gauge.style.top = `${pos.y}px`;
      this.gauge.style.opacity = g.glove ? '1' : '0.8';
      const T = st.T;
      const level = Math.max(0, Math.min(1, (T + 40) / 200));
      this.gThermo.innerHTML = thermoSvg(level, T);
      this.gReadout.textContent = fmtT(T);
      const dom = (Object.keys(st.frac) as Phase[]).reduce((a, k) => (st.frac[k] > st.frac[a] ? k : a), 'solid' as Phase);
      const mat = MATERIALS[b.mat];
      this.gPhase.innerHTML = `<span>${PHASE_ICON[dom]} ${PHASE_HE[dom]}</span><small>${mat.phaseNameHe[dom] ?? mat.nameHe} · ${Math.round(b.mass)} ק״ג</small>`;
      const ch = g.changeOf(bodyId);
      if (ch) {
        this.gauge.classList.add('changing');
        // while energy is leaving, the same plateau runs the other way (freezing, condensing)
        const down = (g.lastDir.get(bodyId) ?? this.dir.get(bodyId)) === 'down';
        const wall = ch !== st.changing;
        const from = down && !wall ? ch.to : ch.from;
        const to = down && !wall ? ch.from : ch.to;
        const p = down && !wall ? 1 - ch.progress : ch.progress;
        const key = `${from}>${to}`;
        this.gRing.innerHTML = ringSvg(p, down ? '#5cc8ff' : '#ff8a2a') + `<div class="txt"><span>${CHANGE_HE[key] ?? ''}…<b class="ltr">${Math.floor(p * 100)}%</b></span></div>`;
      } else this.gauge.classList.remove('changing');
    } else this.gauge.hidden = true;

    // hint glyph
    const h = g.visibleHint;
    const hp = h ? project(h.target) : null;
    if (h && hp && !lensOn) {
      const key = `${g.hintIndex}:${h.glyph}:${this.isTouch}`;
      if (key !== this.hintKey) {
        this.hintKey = key;
        const gl = this.glyphHtml(h.glyph);
        this.hint.innerHTML = `<div class="key ${gl.cls}" style="position:relative;color:${gl.cls === 'heat' ? '#ff8a2a' : gl.cls === 'cold' ? '#5cc8ff' : '#f5d68c'}"><span class="ring-pulse"></span><div style="display:flex;flex-direction:column;align-items:center">${gl.html}</div></div><div class="text brass-frame">${h.textHe}</div>`;
      }
      this.hint.hidden = false;
      // keep hint and gauge from overlapping: hint goes above the gauge when both target the same thing
      const lift = tid === h.target && !this.gauge.hidden ? 110 : 0;
      this.hint.style.left = `${hp.x}px`;
      this.hint.style.top = `${hp.y - lift}px`;
    } else this.hint.hidden = true;

    // lens
    const lensTarget = ent && bodyId ? { ent, bodyId } : null;
    if (lensOn && lensTarget) {
      const b = g.body(lensTarget.bodyId);
      const st = b.state;
      const phases: Phase[] = st.changing ? [st.changing.from, st.changing.to] : [(Object.keys(st.frac) as Phase[]).reduce((a, k) => (st.frac[k] > st.frac[a] ? k : a), 'solid' as Phase)];
      this.lens.draw({ mat: b.mat, T: st.T, phases }, dt);
      const p = project(lensTarget.ent.id);
      const W = this.el.clientWidth;
      const H = this.el.clientHeight;
      const lx = p ? Math.min(W - 200, Math.max(200, p.x)) : W / 2;
      const ly = p ? Math.min(H - 200, Math.max(200, p.y - 60)) : H / 2;
      this.lensWrap.hidden = false;
      this.lensWrap.style.left = `${lx}px`;
      this.lensWrap.style.top = `${ly}px`;
      this.vignette.hidden = false;
      this.vignette.style.setProperty('--lx', `${lx}px`);
      this.vignette.style.setProperty('--ly', `${ly}px`);
      this.lensTags.top.innerHTML = `<span class="ltr">${fmtT(st.T)}</span>`;
      const mat = MATERIALS[b.mat];
      const name = (ph: Phase) => `${PHASE_HE[ph]}`;
      if (phases.length === 2) {
        this.lensTags.right.hidden = false;
        this.lensTags.left.hidden = false;
        this.lensTags.right.textContent = name(phases[0]);
        this.lensTags.left.textContent = name(phases[1]);
      } else {
        this.lensTags.right.hidden = false;
        this.lensTags.left.hidden = true;
        this.lensTags.right.textContent = `${name(phases[0])} · ${mat.phaseNameHe[phases[0]] ?? mat.nameHe}`;
      }
      this.lensTags.bottom.innerHTML = `🔒 מסה: <span class="ltr">${b.mass.toFixed(b.mass < 10 ? 1 : 0)}</span> ק״ג${mat.formula ? ` · <span class="ltr">${mat.formula}</span>` : ''}`;
    } else {
      this.lensWrap.hidden = true;
      this.vignette.hidden = true;
    }
    this.lensBtn.classList.toggle('on', lensOn);
  }
}

function thermoSvg(level: number, T: number) {
  const h = 52 * level;
  const col = T > 60 ? '#ff4a1a' : T > 0 ? '#ff7a3a' : '#5cc8ff';
  return `<svg viewBox="0 0 30 78" width="30" height="78"><rect x="9" y="3" width="12" height="60" rx="6" fill="#f3ead8" stroke="#d6aa52" stroke-width="3"/><rect x="12.5" y="${58 - h}" width="5" height="${h + 4}" fill="${col}"/><circle cx="15" cy="66" r="9" fill="${col}" stroke="#d6aa52" stroke-width="3"/></svg>`;
}

function ringSvg(p: number, color: string) {
  const r = 32;
  const c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 76 76" width="76" height="76"><circle cx="38" cy="38" r="36" fill="rgba(18,14,24,0.92)" stroke="#d6aa52" stroke-width="3"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="#3a3040" stroke-width="6"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 38 38)" stroke-linecap="round"/></svg>`;
}
