// Keyboard, mouse and touch → one control state. Movement is camera-relative
// (x = right, y = forward); main.ts turns it into a world direction.

export interface Controls {
  x: number;
  y: number;
  jump: boolean;
  heat: boolean;
  cold: boolean;
  lens: boolean;
}

export class InputState {
  private keys = new Set<string>();
  private mouseHeat = false;
  private mouseCold = false;
  touch = { x: 0, y: 0, jump: false, heat: false, cold: false, lens: false };
  lensToggle = false;
  onAny: (() => void) | null = null;
  onPause: (() => void) | null = null;
  onRestart: (() => void) | null = null;
  enabled = true;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.onAny?.();
      const k = e.code;
      if (k === 'Escape' || k === 'KeyP') {
        this.onPause?.();
        return;
      }
      if (k === 'KeyR' && this.enabled) {
        this.onRestart?.();
        return;
      }
      if (k === 'Tab') {
        e.preventDefault();
        this.lensToggle = !this.lensToggle;
        return;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('mousedown', (e) => {
      this.onAny?.();
      if (e.button === 0) this.mouseCold = true;
      if (e.button === 2) this.mouseHeat = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseCold = false;
      if (e.button === 2) this.mouseHeat = false;
    });
  }

  clear() {
    this.keys.clear();
    this.mouseHeat = this.mouseCold = false;
    this.touch = { x: 0, y: 0, jump: false, heat: false, cold: false, lens: false };
  }

  read(): Controls {
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (Math.abs(this.touch.x) + Math.abs(this.touch.y) > 0.05) {
      x = this.touch.x;
      y = this.touch.y;
    }
    return {
      x,
      y,
      jump: k.has('Space') || this.touch.jump,
      heat: k.has('KeyE') || this.mouseHeat || this.touch.heat,
      cold: k.has('KeyQ') || this.mouseCold || this.touch.cold,
      lens: k.has('KeyF') || this.touch.lens || this.lensToggle,
    };
  }
}
