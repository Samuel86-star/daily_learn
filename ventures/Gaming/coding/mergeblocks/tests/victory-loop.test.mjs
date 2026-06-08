import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let passed = 0, failed = 0;
function assert(cond, msg) { cond ? (passed++, console.log('  \x1b[32m✓\x1b[0m', msg)) : (failed++, console.error('  \x1b[31m✗\x1b[0m', msg)); }

async function run() {
  console.log('\n🧪 任务胜利 + 经济闭环测试\n');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  // Test 1: Tutorial dismiss works
  console.log('--- 1. 教程关闭 ---');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.click('canvas', { position: { x: 200, y: 400 } });
  await page.waitForTimeout(400);
  const t1 = await page.evaluate(() => !window.__tutorial.isActive);
  assert(t1, '教程点击后关闭');

  // Test 2: Right side clicks trigger merges
  console.log('--- 2. 右侧列可点击 ---');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.click('canvas', { position: { x: 200, y: 400 } });
  await page.waitForTimeout(400);
  let merged = 0;
  for (let i = 0; i < 8; i++) {
    const before = await page.evaluate(() => window.__game.score);
    await page.click('canvas', { position: { x: 390, y: 260 + i * 60 } });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => window.__game.score);
    if (after > before) merged++;
  }
  assert(merged > 0, `右侧列点击触发 ${merged} 次合并`);

  // Test 3: Quest completion adds coins
  console.log('--- 3. 任务完成 → 金币 ---');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.click('canvas', { position: { x: 200, y: 400 } });
  await page.waitForTimeout(400);
  let questDone = false;
  for (let i = 0; i < 20 && !questDone; i++) {
    await page.click('canvas', { position: { x: 80 + (i % 6) * 50, y: 260 + Math.floor(i / 6) * 60 } });
    await page.waitForTimeout(350);
    const s = await page.evaluate(() => {
      const qs = window.__game.quest.getActiveWithStatus();
      return { done: qs.filter(q => q.completed).length, coins: window.__game.economy.coins };
    });
    if (s.done > 0 && s.coins > 0) questDone = true;
  }
  const coins = await page.evaluate(() => window.__game.economy.coins);
  assert(questDone, `任务完成获得金币: ${coins}`);

  // Test 4: All 3 quests done → victory
  console.log('--- 4. 全任务完成 → 胜利 ---');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.click('canvas', { position: { x: 200, y: 400 } });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const g = window.__game;
    g.quest.getActiveWithStatus().forEach(q => { g.quest.completedIds.add(q.id); });
    g._updateQuests();
  });
  await page.waitForTimeout(500);
  const v = await page.evaluate(() => ({ go: window.__game.gameOver, vi: window.__game._victory }));
  assert(v.go, 'gameOver = true');
  assert(v.vi, '_victory = true');

  await browser.close();
  console.log(`\n📊 ${passed}/${passed + failed} 通过\n`);
  process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
