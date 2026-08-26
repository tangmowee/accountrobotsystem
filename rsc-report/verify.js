const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = 'file://' + path.resolve(process.argv[2] || 'Procurement_Report_JanJul_2026_v3.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  // ห้ามมีการโหลดจากภายนอก
  const external = [];
  page.on('request', r => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) external.push(r.url()); });

  await page.goto(file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const charts = Object.values(Chart.instances);
    return {
      chartCount: charts.length,
      chartIds: charts.map(c => c.canvas.id),
      emptyCanvases: charts.filter(c => c.width === 0 || c.height === 0).map(c => c.canvas.id),
      canvasesInDom: [...document.querySelectorAll('canvas')].map(c => c.id),
    };
  });
  console.log('OVERVIEW charts:', info.chartCount, info.chartIds.join(', '));
  console.log('canvases in DOM:', info.canvasesInDom.join(', '));
  if (info.emptyCanvases.length) console.log('!! zero-size canvases:', info.emptyCanvases.join(', '));
  const missing = info.canvasesInDom.filter(id => id && !info.chartIds.includes(id));
  if (missing.length) console.log('!! canvas without chart:', missing.join(', '));

  await page.screenshot({ path: 'shot-overview.png', fullPage: true });

  // เปิดทุกแท็บรายเดือน
  const tabs = await page.$$('#mainTabs .tab');
  for (let i = 1; i < tabs.length; i++) {
    const name = await tabs[i].getAttribute('data-page');
    await tabs[i].click();
    await page.waitForTimeout(500);
    const n = await page.evaluate(() => Object.values(Chart.instances).length);
    console.log(`tab ${name}: total chart instances = ${n}`);
  }

  // กลับหน้าภาพรวม + ทดสอบ drill-down + โหมดสว่าง
  await tabs[0].click();
  await page.waitForTimeout(300);
  await page.evaluate(() => drillGroup(0));
  await page.waitForTimeout(300);
  const modalOpen = await page.evaluate(() => document.getElementById('infoModal').classList.contains('open'));
  console.log('drill modal opens:', modalOpen);
  await page.evaluate(() => closeInfo());

  await page.evaluate(() => openCashModal('Jul'));
  await page.waitForTimeout(300);
  console.log('cash modal opens:', await page.evaluate(() => document.getElementById('cashModal').classList.contains('open')));
  await page.evaluate(() => closeCashModal());

  await page.evaluate(() => toggleTheme());
  await page.waitForTimeout(600);
  console.log('light mode:', await page.evaluate(() => document.documentElement.classList.contains('light')));
  await page.screenshot({ path: 'shot-light.png', fullPage: false });
  await page.evaluate(() => toggleTheme());
  await page.waitForTimeout(400);

  await page.pdf({ path: 'preview-print.pdf', format: 'A3', printBackground: true }).catch(e => console.log('pdf skip', e.message));

  console.log('external requests:', external.length ? external.join(', ') : 'NONE ✅');
  console.log('js errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'NONE ✅');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
