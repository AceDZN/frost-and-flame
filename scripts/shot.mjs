// Headless capture helper: drives the game with real keyboard input and deterministic time.
// usage: node scripts/shot.mjs <url> <out-dir> <steps.json | inline JSON> [w] [h]
// steps: [{ "level": 1 }, { "hold": ["KeyW"], "ms": 800 }, { "shot": "name" }, { "text": true }]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [url, outDir, stepsArg, w = '1600', h = '900'] = process.argv.slice(2);
const steps = JSON.parse(fs.existsSync(stepsArg) ? fs.readFileSync(stepsArg, 'utf8') : stepsArg);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const touch = Number(w) < 700;
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__frost, null, { timeout: 240000 });
await page.waitForTimeout(3000);
const adv = (ms) => page.evaluate((m) => window.advanceTime(m), ms);
for (const s of steps) {
  if (s.level) {
    await page.evaluate((i) => window.__frost.start(i - 1), s.level);
    await adv(100);
  }
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.click) await page.click(s.click);
  if (s.hold) {
    for (const k of s.hold) await page.keyboard.down(k);
    const n = Math.round((s.ms ?? 500) / 100);
    for (let i = 0; i < n; i++) await adv(100);
    if (!s.keep) for (const k of s.hold) await page.keyboard.up(k);
  }
  if (s.release) for (const k of s.release) await page.keyboard.up(k);
  if (s.advance) {
    const n = Math.round(s.advance / 100);
    for (let i = 0; i < n; i++) await adv(100);
  }
  if (s.eval) console.log(JSON.stringify(await page.evaluate(s.eval)));
  if (s.text) console.log(await page.evaluate(() => window.render_game_to_text()));
  if (s.shot) await page.screenshot({ path: path.join(outDir, `${s.shot}.png`) });
}
const errs = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
console.log('console errors:', errs.length ? errs.join('\n') : 'none');
await browser.close();
