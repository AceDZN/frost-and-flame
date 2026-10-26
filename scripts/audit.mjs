// Lists visible meshes that float or stand in walkable space without a collider, per level,
// and saves overview screenshots from a free camera.  usage: node scripts/audit.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'node:fs';
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 1400, height: 800 } });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
await p.waitForFunction(() => window.__frost, null, { timeout: 240000 });
await p.waitForTimeout(4000);
const views = [
  // [camera offset from spawn, look offset]
  ['high', [9, 14, 8], [0, 0, -8]],
  ['left', [-12, 6, -6], [0, 0, -8]],
  ['right', [12, 6, -6], [0, 0, -8]],
  ['back', [0, 9, -26], [0, 0, -6]],
];
for (let i = 0; i < 6; i++) {
  await p.evaluate((n) => window.__frost.start(n), i);
  await p.evaluate(() => window.advanceTime(300));
  const res = await p.evaluate(() => window.__frost.audit());
  const sp = await p.evaluate(() => window.__frost.game.def.spawn);
  console.log(`\n== level ${i + 1}: ${res.length} issues`);
  for (const r of res) console.log(r.kind, r.geo, JSON.stringify(r.min), JSON.stringify(r.max), r.note);
  for (const [name, c, l] of views) {
    await p.evaluate(([c, l, sp]) => window.__frost.cam(sp.x + c[0], sp.y + c[1], sp.z + c[2], sp.x + l[0], sp.y + l[1], sp.z + l[2]), [c, l, sp]);
    await p.evaluate(() => window.advanceTime(50));
    await p.screenshot({ path: `${out}/L${i + 1}-${name}.png` });
  }
  await p.evaluate(() => window.__frost.camOff());
}
await b.close();
