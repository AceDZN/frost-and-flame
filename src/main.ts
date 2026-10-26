import '@fontsource/rubik/400.css';
import '@fontsource/rubik/700.css';
import './ui/style.css';
import * as THREE from 'three';
import { Game, NO_INPUT, type Input } from './game/game';
import { LEVELS } from './game/levels';
import { createWorld } from './render/world';
import { LevelView, stretch } from './render/levelView';
import { Explorer } from './render/explorer';
import { Models, modelUrl } from './render/models';
import { Hud, fmtMJ } from './ui/hud';
import { InputState } from './input';
import { Sfx } from './audio';
import { MATERIALS } from './sim/materials';

const STEP = 1 / 60;
const SAVE_KEY = 'frost-flame-progress-v1';
const LOG_KEY = 'frost-flame-learning-v1';

interface Save {
  stars: Record<string, number>;
  muted: boolean;
  reduced: boolean;
}

function loadSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { stars: s.stars ?? {}, muted: !!s.muted, reduced: !!s.reduced };
  } catch {
    return { stars: {}, muted: false, reduced: false };
  }
}
function writeSave(s: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const hudRoot = document.getElementById('hud')!;
const world = createWorld(canvas);
const models = new Models();
const input = new InputState(canvas);
const sfx = new Sfx();
const save = loadSave();
sfx.muted = save.muted;
const explorer = new Explorer();
world.scene.add(explorer.group);

let game: Game | null = null;
let view: LevelView | null = null;
let levelIndex = 0;
let retries = 0;
let mode: 'title' | 'play' | 'won' | 'paused' = 'title';
let acc = 0;
let lastT = performance.now();
let clock = 0;
let shake = 0;
let manualTime = false;
const camPos = new THREE.Vector3(0, 6, 12);
const camLook = new THREE.Vector3();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3();
const ray = new THREE.Raycaster();
let fps = 0;
let fpsAcc = 0;
let fpsN = 0;

const hud = new Hud(hudRoot, input, {
  pause: () => togglePause(),
  restart: () => restart(),
  toggleSound: () => {
    save.muted = !save.muted;
    sfx.setMuted(save.muted);
    writeSave(save);
    return save.muted;
  },
});
hud.setMutedIcon(save.muted);
hud.setTouch(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
window.addEventListener('touchstart', () => hud.setTouch(true), { once: true, passive: true });
document.documentElement.classList.toggle('reduced', save.reduced);

const screen = document.createElement('div');
screen.className = 'screen';
hudRoot.appendChild(screen);

input.onAny = () => sfx.unlock();
input.onPause = () => togglePause();
input.onRestart = () => {
  if (mode === 'play') restart();
};

// ------------------------------------------------------------------ screens

function levelButtons() {
  return LEVELS.map((l, i) => {
    const unlocked = i === 0 || save.stars[LEVELS[i - 1].id] !== undefined || location.search.includes('all');
    const st = save.stars[l.id];
    return `<button class="lvl ${st ? 'done' : ''}" data-l="${i}" ${unlocked ? '' : 'disabled'}>${l.index}. ${l.nameHe}<small>${l.conceptHe}</small><small class="ltr">${st ? '★'.repeat(st) + '☆'.repeat(3 - st) : unlocked ? '' : '🔒'}</small></button>`;
  }).join('');
}

function bindLevelButtons() {
  screen.querySelectorAll<HTMLButtonElement>('[data-l]').forEach((b) =>
    b.addEventListener('click', () => {
      sfx.unlock();
      sfx.click();
      startLevel(Number(b.dataset.l));
    }),
  );
}

function showTitle() {
  mode = 'title';
  hud.show(false);
  screen.hidden = false;
  const next = LEVELS.findIndex((l) => save.stars[l.id] === undefined);
  screen.innerHTML = `<div class="card brass-frame">
    <h1>כפור ולהבה</h1>
    <p style="font-size:20px">המיסו, הקפיאו, הרתיחו והחזירו אדים למים — וחצו את אי המצפה הקפוא.</p>
    <p><span style="color:#ff8a2a">🔥 כפפת חום</span> מוציאה אנרגיה מהסוללה. <span style="color:#5cc8ff">❄️ כפפת קור</span> שואבת חום מדברים ומטעינה אותה. כל כפפה מעבירה עד <span class="ltr">100 MJ</span> בשנייה.</p>
    <button class="big-btn" id="go">${next > 0 ? 'המשיכו' : 'שחקו'}</button>
    <div class="levels">${levelButtons()}</div>
    <div class="toggles">
      <label><input type="checkbox" id="snd" ${save.muted ? '' : 'checked'}> צלילים</label>
      <label><input type="checkbox" id="rm" ${save.reduced ? 'checked' : ''}> פחות תנועה</label>
    </div>
  </div>`;
  screen.querySelector('#go')!.addEventListener('click', () => {
    sfx.unlock();
    sfx.click();
    startLevel(next < 0 ? 0 : next);
  });
  bindLevelButtons();
  screen.querySelector<HTMLInputElement>('#snd')!.addEventListener('change', (e) => {
    save.muted = !(e.target as HTMLInputElement).checked;
    sfx.setMuted(save.muted);
    hud.setMutedIcon(save.muted);
    writeSave(save);
  });
  screen.querySelector<HTMLInputElement>('#rm')!.addEventListener('change', (e) => {
    save.reduced = (e.target as HTMLInputElement).checked;
    document.documentElement.classList.toggle('reduced', save.reduced);
    writeSave(save);
  });
  // a living backdrop: level 1 idles behind the title
  if (!game) loadLevel(0);
}

function togglePause() {
  if (mode === 'play') {
    mode = 'paused';
    if (game) game.paused = true;
    input.clear();
    sfx.suspend(true);
    screen.hidden = false;
    screen.innerHTML = `<div class="card brass-frame"><h2>הפסקה</h2>
      <button class="big-btn" id="resume">המשיכו</button>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="big-btn secondary" id="again">התחלה מחדש</button>
        <button class="big-btn secondary" id="menu">שלבים</button>
      </div></div>`;
    screen.querySelector('#resume')!.addEventListener('click', () => togglePause());
    screen.querySelector('#again')!.addEventListener('click', () => {
      togglePause();
      restart();
    });
    screen.querySelector('#menu')!.addEventListener('click', () => {
      sfx.suspend(false);
      showTitle();
    });
  } else if (mode === 'paused') {
    mode = 'play';
    if (game) game.paused = false;
    screen.hidden = true;
    sfx.suspend(false);
  }
}

function showWin() {
  if (!game) return;
  mode = 'won';
  const g = game;
  const stars = g.stars();
  save.stars[g.def.id] = Math.max(save.stars[g.def.id] ?? 0, stars);
  writeSave(save);
  persistLog();
  const last = levelIndex === LEVELS.length - 1;
  const starHtml = [0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
  setTimeout(() => {
    if (mode !== 'won') return;
    screen.hidden = false;
    screen.innerHTML = `<div class="card brass-frame">
      <h2>${last ? 'הגעתם אל הטלסקופ!' : 'הגעתם למגדלור!'}</h2>
      <div class="stars">${starHtml}</div>
      <div class="star-notes">★ סיום · ${g.splashes === 0 ? '★' : '☆'} בלי ליפול למים · ${g.battery.energy >= g.def.efficientAt ? '★' : '☆'} חיסכון: נשארו <span class="ltr">${fmtMJ(g.battery.energy)}</span></div>
      ${takeawayHtml(g.def.takeawayHe)}
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${last ? '<button class="big-btn" id="menu">לכל השלבים</button>' : '<button class="big-btn" id="next">לשלב הבא</button>'}
        <button class="big-btn secondary" id="again">שוב</button>
      </div></div>`;
    screen.querySelector('#next')?.addEventListener('click', () => startLevel(levelIndex + 1));
    screen.querySelector('#menu')?.addEventListener('click', () => showTitle());
    screen.querySelector('#again')!.addEventListener('click', () => restart());
  }, 1400);
}

/** First sentence up front, the rest behind a "why?" toggle, so the win card stays short. */
function takeawayHtml(t: string) {
  const i = t.search(/[.!?](\s|$)/);
  if (i < 0 || i > t.length - 4) return `<p>${t}</p>`;
  return `<p><b>${t.slice(0, i + 1)}</b></p><details class="why"><summary>למה?</summary><p>${t.slice(i + 1).trim()}</p></details>`;
}

function persistLog() {
  if (!game) return;
  try {
    const prev = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    const all = prev.concat(game.learn).slice(-2000);
    localStorage.setItem(LOG_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ levels

function loadLevel(i: number) {
  if (view) {
    world.levelRoot.remove(view.root);
    view.dispose();
  }
  levelIndex = i;
  game = new Game(LEVELS[i], retries);
  view = new LevelView(world, game, models);
  view.setViewport?.(canvas.clientHeight);
  world.levelRoot.add(view.root);
  hud.setLevel(game);
  const p = game.player.pos;
  explorer.group.position.set(p.x, p.y, p.z);
  camPos.set(p.x, p.y + 4.4, p.z + 7.5);
  camLook.set(p.x, p.y + 1.2, p.z - 2);
}

function startLevel(i: number) {
  if (game && game.def.index - 1 !== i) retries = 0;
  if (game && !game.won) persistLog();
  loadLevel(i);
  mode = 'play';
  screen.hidden = true;
  hud.show(true);
  input.clear();
}

function restart() {
  if (!game) return;
  persistLog();
  retries++;
  startLevel(levelIndex);
}

// ------------------------------------------------------------------ events → feedback

function anchorVec(id: string): THREE.Vector3 | null {
  return view ? view.anchorOf(id, new THREE.Vector3()) : null;
}

function entityForBody(bodyId: string) {
  return game?.def.entities.find((e) => game!.bodyOf(e) === bodyId) ?? null;
}

function handleEvents() {
  if (!game || !view) return;
  const evs = game.events.splice(0);
  for (const ev of evs) {
    switch (ev.type) {
      case 'phase': {
        const ent = entityForBody(ev.id);
        if (!ent || ent.kind === 'rod') break;
        const at = anchorVec(ent.id);
        const k = `${ev.from}>${ev.to}`;
        if (!ev.done) {
          if (k === 'solid>liquid' || k === 'solid>gas') sfx.crack();
          if (k === 'liquid>gas') sfx.whoosh();
          if (k === 'liquid>solid') sfx.frost();
          break;
        }
        if (k === 'solid>liquid') {
          sfx.splash();
          if (at) view.splash(at);
          shake = 0.35;
          if (ent.kind === 'ice') hud.toast('הקרח נמס — אותה מסה, עכשיו מים שזורמים הלאה', 'heat');
        } else if (k === 'liquid>solid') {
          sfx.frost();
          if (at) view.burst(at, 0xbfefff, 60);
          hud.toast('קפא! החום שיצא מהמים נכנס לסוללה ⚡', 'cold', 3000);
        } else if (k === 'liquid>gas') {
          sfx.whoosh();
          hud.toast('רתח! הגז השקוף ממלא את הבלון', 'heat');
        } else if (k === 'gas>liquid' && game.glove === 'cold') {
          hud.toast('האדים התעבו בחזרה למים', 'cold');
        } else if (k === 'solid>gas') {
          sfx.whoosh();
          hud.toast('מעבר ישיר ממוצק לגז (המראה): הקרח היבש הפך לגז שקוף — בלי שלולית', 'heat', 3400);
        }
        break;
      }
      case 'splash': {
        sfx.splash();
        view.splash(new THREE.Vector3(ev.at.x, ev.at.y, ev.at.z));
        hud.flashBrr();
        hud.toast('בררררר! המים קרים — נסו להקפיא אותם קודם', 'cold', 2600);
        shake = 0.5;
        break;
      }
      case 'respawn':
        break;
      case 'glass':
        sfx.glass();
        if (view) view.burst(new THREE.Vector3(ev.at.x, ev.at.y, ev.at.z), game.glove === 'cold' ? 0x9be4ff : 0xffa040, 20, 0.18);
        hud.toast('הכפפה צריכה קו ישיר — זכוכית, קירות ודלתות חוסמים אותה', '', 2400);
        break;
      case 'battery':
        if (ev.state === 'empty') {
          sfx.empty();
          hud.toast('הסוללה ריקה — שאבו חום (❄️) ממשהו חם יותר מהאוויר', 'heat', 3200);
        } else {
          sfx.full();
          hud.toast('הסוללה מלאה', 'cold');
        }
        break;
      case 'gate':
        sfx.clank();
        hud.toast('השער נפתח!', '');
        shake = 0.25;
        break;
      case 'plunger':
        if (ev.result === 'squish') {
          sfx.squish();
          hud.toast('פששש… הגז נדחס — והשער כמעט לא זז', '', 2600);
        } else if (ev.result === 'push') {
          sfx.thunk();
          hud.toast('המים כמעט לא נדחסים — הדחיפה עברה עד השער!', 'cold', 2600);
        } else {
          sfx.thunk();
          hud.toast('נעול — הצינור מלא קרח', 'cold', 2400);
        }
        break;
      case 'jump':
        sfx.jump();
        break;
      case 'land':
        sfx.land();
        break;
      case 'win':
        sfx.win();
        if (view) view.burst(tmp.set(game.player.pos.x, game.player.pos.y + 1.5, game.player.pos.z), 0xffd060, 90, 0.3);
        showWin();
        break;
      case 'hint':
        break;
      case 'coldFloor': {
        const ent = game.def.entities.find((x) => x.id === ev.id);
        hud.toast(`${ent?.labelHe ?? ''}: כבר קר כמו האוויר — הכפפה שואבת חום רק מדברים חמים מהאוויר`, 'cold', 3200);
        break;
      }
      case 'noTarget':
        hud.toast('אין כאן מה לחמם או לקרר — פנו אל חפץ קרוב (הוא יקבל טבעת זוהרת)', '', 2600);
        break;
      case 'aim':
        hud.toast(ev.absorb < 0.2 ? 'השלג הלבן מחזיר כמעט את כל אור השמש — הוא כמעט לא מתחמם' : 'האבן הכהה בולעת את אור השמש ומתחממת', '', 3200);
        break;
      case 'batteryLow':
        hud.toast('נשאר רבע סוללה — האם זה החפץ הנכון לחמם?', 'heat', 2800);
        break;
      case 'bench':
        hud.toast('שני הספסלים באותה טמפרטורה! ברזל רק מוליך חום מהיד מהר יותר — ולכן מרגיש קר יותר', '', 3800);
        break;
    }
  }
}

// ------------------------------------------------------------------ frame

function readInput(): Input {
  if (mode !== 'play' || !game) return NO_INPUT;
  const c = input.read();
  // camera looks toward −z (rotated by the level's yaw)
  const yaw = game.def.cameraYaw ?? 0;
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = Math.sin(yaw);
  return { mx: c.x * rx + c.y * fx, mz: c.x * rz + c.y * fz, jump: c.jump, heat: c.heat, cold: c.cold, lens: c.lens };
}

function project(id: string): { x: number; y: number } | null {
  const v = id === 'exit' ? anchorVec('exit') : anchorVec(id);
  if (!v) return null;
  v.project(world.camera);
  if (v.z > 1) return null;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const x = (v.x * 0.5 + 0.5) * w;
  const y = (-v.y * 0.5 + 0.5) * h;
  return { x: Math.min(w - 40, Math.max(40, x)), y: Math.min(h - 40, Math.max(90, y)) };
}

function updateCamera(dt: number) {
  if (!game) return;
  const p = game.player.pos;
  const yaw = game.def.cameraYaw ?? 0;
  const back = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const dist = aspect < 0.8 ? 8.2 : 7.2;
  const desired = tmp.set(p.x, p.y + (aspect < 0.8 ? 5.4 : 4.3), p.z).addScaledVector(back, dist);
  const look = tmp2.set(p.x, p.y + 1.3, p.z).addScaledVector(back, -3.2);
  // lean toward the current target so the action stays framed
  if (game.target) {
    const a = anchorVec(game.target);
    if (a) look.lerp(a, game.glove ? 0.35 : 0.15);
  }
  // rise over walls rather than hide the explorer behind them; if that isn't enough, come closer
  if (view && view.occluders.length) {
    const eye = new THREE.Vector3(p.x, p.y + 1.1, p.z);
    for (let i = 0; i < 5; i++) {
      const dir = tmp3.copy(desired).sub(eye);
      const len = dir.length();
      ray.set(eye, dir.normalize());
      ray.far = len + 0.4;
      const hit = ray.intersectObjects(view.occluders, true)[0];
      if (!hit) break;
      if (i < 3) {
        desired.y += 1.1;
        desired.addScaledVector(back, -0.55);
      } else {
        desired.copy(eye).addScaledVector(dir, Math.max(1.4, hit.distance - 0.5));
        break;
      }
    }
  }
  const k = 1 - Math.exp(-dt * 5);
  camPos.lerp(desired, k);
  camLook.lerp(look, k);
  world.camera.position.copy(camPos);
  if (shake > 0 && !save.reduced) {
    world.camera.position.x += (Math.random() - 0.5) * shake * 0.25;
    world.camera.position.y += (Math.random() - 0.5) * shake * 0.25;
    shake = Math.max(0, shake - dt * 1.6);
  }
  world.camera.lookAt(camLook);
  if (camOverride) {
    world.camera.position.copy(camOverride.p);
    world.camera.lookAt(camOverride.l);
  }
  world.updateShadow(tmp.set(p.x, p.y, p.z));
}

function syncExplorer(dt: number) {
  if (!game) return;
  const p = game.player;
  explorer.group.position.set(p.pos.x, p.pos.y, p.pos.z);
  // yaw: 0 faces −z
  const want = -p.yaw;
  let cur = explorer.group.rotation.y;
  let d = want - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  cur += d * Math.min(1, dt * 14);
  explorer.group.rotation.y = cur;
  explorer.group.visible = p.splashT <= 0.6;
  explorer.update(
    dt,
    {
      speed: Math.hypot(p.vel.x, p.vel.z),
      onGround: p.onGround,
      vy: p.vel.y,
      aiming: game.glove,
      gliding: p.gliding,
      won: game.won,
      splashing: p.splashT > 0,
    },
    save.reduced,
  );
}

// a glowing ring marks what the gloves will act on
const ringTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.strokeStyle = '#fff';
  x.lineWidth = 7;
  x.shadowColor = '#fff';
  x.shadowBlur = 10;
  x.beginPath();
  x.arc(64, 64, 50, 0, Math.PI * 2);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const targetRing = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
targetRing.renderOrder = 9;
world.scene.add(targetRing);

// a soft continuous beam under the spark stream
const beamMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.11, 1, 10, 1, true), beamMat);
beam.visible = false;
world.scene.add(beam);

function gloveFx() {
  beam.visible = false;
  targetRing.visible = false;
  if (game && game.target && mode === 'play') {
    const a = anchorVec(game.target);
    if (a) {
      targetRing.visible = true;
      targetRing.position.copy(a).add(new THREE.Vector3(0, -0.25, 0));
      const k = 0.9 + Math.sin(clock * 6) * 0.08;
      targetRing.scale.setScalar(k * (game.glove ? 1.25 : 1));
      (targetRing.material as THREE.SpriteMaterial).color.setHex(game.glove === 'heat' ? 0xff8a2a : game.glove === 'cold' ? 0x5cc8ff : 0xffe6a0);
      (targetRing.material as THREE.SpriteMaterial).opacity = game.gloveBlocked ? 0.35 : 0.9;
    }
  }
  if (!game || !view || !game.glove || !game.target) {
    sfx.glove(null, 0, false);
    return;
  }
  const hand = explorer.handWorld(game.glove, new THREE.Vector3());
  const blocked = game.gloveBlocked;
  const target = blocked ? new THREE.Vector3(blocked.x, blocked.y, blocked.z) : anchorVec(game.target);
  if (!target) return;
  const strength = Math.min(1, Math.abs(game.gloveFlow) / 100_000);
  const active = Math.abs(game.gloveFlow) > 1 || !!blocked;
  sfx.glove(game.glove, strength, !!blocked || !active);
  if (!active) return;
  beam.visible = true;
  beamMat.color.setHex(game.glove === 'heat' ? 0xff8a2a : 0x5cc8ff);
  beamMat.opacity = 0.25 + strength * 0.35 + Math.sin(clock * 30) * 0.05;
  stretch(beam, hand, target);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
    if (game.glove === 'heat') {
      view.sparks.spawn({ pos: hand, to: target.clone().add(jitter), life: 0.35 + Math.random() * 0.15, size: 0.22 + Math.random() * 0.12, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060 });
    } else {
      // heat leaves the object and flows INTO the cold glove
      view.sparks.spawn({ pos: target.clone().add(jitter), to: hand, life: 0.45 + Math.random() * 0.15, size: 0.2 + Math.random() * 0.1, color: Math.random() < 0.5 ? 0x5cc8ff : 0xdff6ff });
    }
  }
  if (blocked && Math.random() < 0.5) view.burst(target, game.glove === 'heat' ? 0xffa040 : 0x9be4ff, 3, 0.15);
}

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  fpsAcc += dt;
  fpsN++;
  if (fpsAcc > 1) {
    fps = Math.round(fpsN / fpsAcc);
    fpsAcc = 0;
    fpsN = 0;
  }
  if (!manualTime) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 6) {
      stepGame();
      acc -= STEP;
      n++;
    }
    if (n === 6) acc = 0;
  }
  render(dt);
}

function stepGame() {
  if (!game) return;
  const inp = readInput();
  if (mode === 'play' || mode === 'won' || mode === 'title') game.step(STEP, inp);
  handleEvents();
}

function render(dt: number) {
  clock += dt;
  if (game && view) {
    syncExplorer(dt);
    view.update(dt, clock);
    gloveFx();
    updateCamera(dt);
    const lensOn = mode === 'play' && input.read().lens;
    hud.update(game, dt, project, lensOn);
  }
  world.renderer.render(world.scene, world.camera);
}

// ------------------------------------------------------------------ boot

function onResize() {
  world.resize();
  view?.setViewport?.(canvas.clientHeight);
}
window.addEventListener('resize', onResize);
new ResizeObserver(onResize).observe(canvas.parentElement!);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play') togglePause();
});
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  if (mode === 'play') togglePause();
});
canvas.addEventListener('webglcontextrestored', () => location.reload());

// test & automation hooks
declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    __frost: unknown;
  }
}
window.render_game_to_text = () => {
  if (!game) return JSON.stringify({ mode });
  const g = game;
  return JSON.stringify({
    mode,
    level: { id: g.def.id, index: g.def.index, name: g.def.nameHe, objective: g.def.objectiveHe },
    coords: 'y up; the level runs toward −z; units are metres',
    player: { pos: round3(g.player.pos), onGround: g.player.onGround, standingOn: g.player.groundId, splashing: g.player.splashT > 0 },
    batteryMJ: +(g.battery.energy / 1000).toFixed(2),
    batteryCapacityMJ: g.battery.capacity / 1000,
    glove: g.glove,
    target: g.target,
    gloveBlockedByGlass: !!g.gloveBlocked,
    objects: g.describe().map((o) => ({ ...o, materialHe: MATERIALS[o.material as keyof typeof MATERIALS].nameHe })),
    gates: Object.fromEntries(g.gateOpen),
    hint: g.visibleHint ? { target: g.visibleHint.target, glyph: g.visibleHint.glyph, text: g.visibleHint.textHe } : null,
    won: g.won,
    stars: g.stars(),
    splashes: g.splashes,
    time: +g.t.toFixed(2),
    fps,
  });
};
window.advanceTime = (ms: number) => {
  manualTime = true;
  const n = Math.max(1, Math.round(ms / (STEP * 1000)));
  for (let i = 0; i < n; i++) stepGame();
  render(n * STEP);
};
// debug: a free camera and a mesh audit (used by scripts/audit.mjs; harmless in play)
let camOverride: { p: THREE.Vector3; l: THREE.Vector3 } | null = null;
function audit() {
  if (!game || !view) return [];
  const boxes = game.colliders.map((c) => c.box);
  const out: { kind: string; geo: string; min: number[]; max: number[]; note: string }[] = [];
  const bb = new THREE.Box3();
  view.root.updateMatrixWorld(true);
  // every visible solid mesh's box, so "floating" can ignore things resting on other things
  const meshBoxes: THREE.Box3[] = [];
  view.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.visible) meshBoxes.push(new THREE.Box3().setFromObject(m));
  });
  view.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible) return;
    let vis = true;
    for (let q: THREE.Object3D | null = m; q; q = q.parent) if (!q.visible) vis = false;
    if (!vis) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    if (mat.blending === THREE.AdditiveBlending || (mat.transparent && mat.opacity < 0.3)) return;
    bb.setFromObject(m);
    const sz = bb.getSize(new THREE.Vector3());
    if (Math.max(sz.x, sz.y, sz.z) < 0.15) return;
    const geo = m.geometry?.type ?? '?';
    // does it sit in space a player could walk through without a collider covering it?
    for (const g of boxes) {
      const top = g.maxY;
      const ox = Math.min(bb.max.x, g.maxX) - Math.max(bb.min.x, g.minX);
      const oz = Math.min(bb.max.z, g.maxZ) - Math.max(bb.min.z, g.minZ);
      const oy = Math.min(bb.max.y, top + 1.4) - Math.max(bb.min.y, top + 0.05);
      if (ox > 0.2 && oz > 0.2 && oy > 0.2) {
        // covered by a collider?
        const covered = boxes.some((c) => {
          const cx = Math.min(bb.max.x, c.maxX) - Math.max(bb.min.x, c.minX);
          const cz = Math.min(bb.max.z, c.maxZ) - Math.max(bb.min.z, c.minZ);
          const cy = Math.min(bb.max.y, c.maxY) - Math.max(bb.min.y, c.minY);
          return cx > 0 && cz > 0 && cy > 0 && (cx * cz) / (Math.max(0.01, sz.x) * Math.max(0.01, sz.z)) > 0.5;
        });
        if (!covered) out.push({ kind: 'walk-through', geo, min: bb.min.toArray().map((v) => +v.toFixed(2)), max: bb.max.toArray().map((v) => +v.toFixed(2)), note: '' });
        break;
      }
    }
    // floating: nothing (collider or another mesh's ground) directly under its bottom
    const under = boxes.filter((c) => bb.max.x > c.minX && bb.min.x < c.maxX && bb.max.z > c.minZ && bb.min.z < c.maxZ && c.maxY <= bb.min.y + 0.05);
    const ground = under.length ? Math.max(...under.map((c) => c.maxY)) : -Infinity;
    const gap = bb.min.y - ground;
    const resting = meshBoxes.some(
      (o) => o !== undefined && !o.equals(bb) && o.max.y >= bb.min.y - 0.08 && o.min.y < bb.min.y + 0.01 && o.max.x > bb.min.x && o.min.x < bb.max.x && o.max.z > bb.min.z && o.min.z < bb.max.z,
    );
    if (!resting && gap > 0.15 && gap < 50 && sz.y < 6) out.push({ kind: 'floating', geo, min: bb.min.toArray().map((v) => +v.toFixed(2)), max: bb.max.toArray().map((v) => +v.toFixed(2)), note: `gap ${gap.toFixed(2)}` });
  });
  return out;
}
window.__frost = {
  start: (i: number) => startLevel(i),
  get game() {
    return game;
  },
  explorer,
  audit,
  cam: (px: number, py: number, pz: number, lx: number, ly: number, lz: number) => {
    camOverride = { p: new THREE.Vector3(px, py, pz), l: new THREE.Vector3(lx, ly, lz) };
  },
  camOff: () => (camOverride = null),
};

function round3(v: { x: number; y: number; z: number }) {
  return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2) };
}

onResize();
showTitle();
requestAnimationFrame(frame);

// assets load in the background; the game is playable with procedural stand-ins meanwhile
void models.preload().then(() => {
  if (game && view && mode !== 'play') loadLevel(levelIndex);
});
void explorer.loadModel(modelUrl('explorer')).then(async (ok) => {
  if (ok) for (const clip of ['run', 'jump', 'aim', 'celebrate']) await explorer.addClips(modelUrl(`explorer-${clip}`));
});

if (new URLSearchParams(location.search).has('level')) {
  const n = Number(new URLSearchParams(location.search).get('level')) - 1;
  if (n >= 0 && n < LEVELS.length) startLevel(n);
}
