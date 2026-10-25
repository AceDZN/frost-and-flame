// Measures real-time FPS per level (rAF loop, no manual time) at a given viewport.
import { chromium } from 'playwright';
const [url, w = '1600', h = '900'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) } });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
await p.waitForFunction(() => window.__frost, null, { timeout: 240000 });
await p.waitForTimeout(3000);
for (let i = 0; i < 6; i++) {
  await p.evaluate((n) => window.__frost.start(n), i);
  await p.keyboard.down('KeyE');
  await p.waitForTimeout(4500);
  await p.keyboard.up('KeyE');
  const st = JSON.parse(await p.evaluate(() => window.render_game_to_text()));
  console.log(`level ${i + 1}: ${st.fps} fps`);
}
await b.close();
