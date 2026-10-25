import * as THREE from 'three';

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, r: () => number) => void, seed = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, rand(seed));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function rockTexture(): THREE.CanvasTexture {
  return canvasTex(256, (ctx, r) => {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = 30 + r() * 45;
      ctx.fillStyle = `rgba(${v},${v},${v + 8},${0.25 + r() * 0.35})`;
      const w = 4 + r() * 26;
      ctx.fillRect(r() * 256, r() * 256, w, w * (0.3 + r() * 0.7));
    }
    ctx.strokeStyle = 'rgba(10,10,16,0.55)';
    for (let i = 0; i < 18; i++) {
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      let x = r() * 256;
      let y = r() * 256;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 60;
        y += r() * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 3);
}

export function snowTexture(): THREE.CanvasTexture {
  return canvasTex(256, (ctx, r) => {
    ctx.fillStyle = '#e9f1fb';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      const b = 205 + r() * 50;
      ctx.fillStyle = `rgba(${b - 10},${b},${255},${0.35})`;
      ctx.beginPath();
      ctx.arc(r() * 256, r() * 256, 1 + r() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 5);
}

export function iceCrackTexture(): THREE.CanvasTexture {
  return canvasTex(512, (ctx, r) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 6;
    for (let i = 0; i < 14; i++) {
      ctx.lineWidth = 1 + r() * 2.5;
      ctx.beginPath();
      let x = 256 + (r() - 0.5) * 200;
      let y = 256 + (r() - 0.5) * 200;
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (r() - 0.5) * 120;
        y += (r() - 0.5) * 120;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 9);
}

export function iceTexture(): THREE.CanvasTexture {
  return canvasTex(256, (ctx, r) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#d6f1ff');
    g.addColorStop(1, '#7cc6ee');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + r() * 0.35})`;
      ctx.lineWidth = 1 + r() * 3;
      ctx.beginPath();
      const x = r() * 256;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (r() - 0.5) * 40, 256);
      ctx.stroke();
    }
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.5})`;
      ctx.beginPath();
      ctx.arc(r() * 256, r() * 256, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 11);
}

export function waterNormalTexture(): THREE.CanvasTexture {
  const t = canvasTex(256, (ctx, r) => {
    ctx.fillStyle = 'rgb(128,128,255)';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      const x = r() * 256;
      const y = r() * 256;
      const rad = 6 + r() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${100 + r() * 60},${100 + r() * 60},255,0.5)`);
      g.addColorStop(1, 'rgba(128,128,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, 13);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function glowSprite(color = '#ffffff'): THREE.CanvasTexture {
  const t = canvasTex(64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function puffSprite(): THREE.CanvasTexture {
  const t = canvasTex(128, (ctx, r) => {
    for (let i = 0; i < 14; i++) {
      const x = 40 + r() * 48;
      const y = 40 + r() * 48;
      const rad = 18 + r() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
  }, 17);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** A canvas sprite with a short label (numbers / °C) for in-world scales. */
export function labelTexture(text: string, color = '#f8ecd0', bg = 'rgba(20,14,24,0.85)'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(4, 8, 120, 48, 12);
  ctx.fill();
  ctx.strokeStyle = '#d6aa52';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 30px Rubik, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 33);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
