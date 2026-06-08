import { chromium } from 'playwright';
import { resolve } from 'path';

const fileUrl = 'file://' + resolve('./dist/index.html');
const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
page.on('console', msg => {
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
});

// 清掉 localStorage 强制首次体验
await page.addInitScript(() => {
  try { localStorage.clear(); } catch(e) {}
});

await page.goto(fileUrl);
await page.waitForTimeout(2000);

// 截首次进入（应该看到引导高亮 + 气泡）
await page.screenshot({ path: '/tmp/mb-tut-1-first.png' });
console.log('  → /tmp/mb-tut-1-first.png');

// 点击关闭引导
await page.mouse.click(215, 100);
await page.waitForTimeout(500);

// 找一组并点击触发合并
const groupInfo = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return null;
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const tile = game.board.get(r, c);
      if (!tile) continue;
      const visited = new Set([`${r},${c}`]);
      const queue = [{r, c}];
      const group = [];
      while (queue.length) {
        const cur = queue.shift();
        group.push(cur);
        for (const [dr, dc] of dirs) {
          const nr = cur.r + dr, nc = cur.c + dc;
          const key = `${nr},${nc}`;
          if (visited.has(key)) continue;
          if (nr < 0 || nr >= 6 || nc < 0 || nc >= 6) continue;
          const n = game.board.get(nr, nc);
          if (n && n.value === tile.value) {
            visited.add(key);
            queue.push({r: nr, c: nc});
          }
        }
      }
      if (group.length >= 3) return { row: r, col: c, size: group.length, value: tile.value };
    }
  }
  return null;
});

function cellCenter(r, c) {
  return { x: 12 + 8 + c * 66 + 29, y: 180 + 8 + r * 66 + 29 };
}

if (groupInfo) {
  console.log(`点击 ${groupInfo.value}×${groupInfo.size}`);
  const p = cellCenter(groupInfo.row, groupInfo.col);
  await page.mouse.click(p.x, p.y);

  // 等动画完成后才会显示"组越大越赚"
  await page.waitForTimeout(1400);
  await page.screenshot({ path: '/tmp/mb-tut-2-after-merge.png' });
  console.log('  → /tmp/mb-tut-2-after-merge.png');
}

await ctx.close();
await browser.close();
console.log('Done');
