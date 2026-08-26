// ตรวจสอบว่าตัวเลขในกราฟ = ตัวเลขในตาราง ทุกจุดที่เคยไม่ตรงกัน
const { chromium } = require('playwright');
const path = require('path');

const R = (v) => Math.round(v);
let fail = 0;
function eq(name, a, b, tol = 1) {
  const ok = Math.abs(a - b) <= tol;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${R(a).toLocaleString()} vs ${R(b).toLocaleString()}`);
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('file://' + path.resolve('Procurement_Report_JanJul_2026_v3.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);

  const d = await p.evaluate(() => {
    const sum = a => a.filter(v => v != null).reduce((s, v) => s + v, 0);
    const ch = id => Chart.getChart(document.getElementById(id));
    // อ่านยอดรวมจากตาราง Product Group (แถว Total's)
    const tblTotal = [...document.querySelectorAll('tr.total')]
      .map(tr => [...tr.children].map(td => td.textContent.trim()))
      .find(r => r[0].startsWith("Total's"));
    const num = s => parseFloat(String(s).replace(/[^0-9.-]/g, '')) || 0;
    return {
      monthly25: sum(ch('chMonthly').data.datasets[0].data.slice(0, 7)),
      monthly26: sum(ch('chMonthly').data.datasets[1].data.slice(0, 7)),
      cum25: Math.max(...ch('chCum').data.datasets[0].data),
      cum26: Math.max(...ch('chCum').data.datasets[1].data),
      group25: sum(ch('chGroup').data.datasets[0].data),
      group26: sum(ch('chGroup').data.datasets[1].data),
      creditYoY25: sum(ch('chCreditYoY').data.datasets[0].data),
      creditYoY26: sum(ch('chCreditYoY').data.datasets[1].data),
      donut26: sum(ch('chCreditDonut').data.datasets[0].data),
      credit100: ch('chCredit100').data.datasets.map(ds => ds.data),
      saving: sum(ch('chSaving').data.datasets.flatMap(ds => ds.data)),
      nature: ch('chNature').data.datasets.map(ds => ds.data),
      tblTotal25: num(tblTotal[1]), tblTotal26: num(tblTotal[2]),
      MD_t25: MD.t25.reduce((s, v) => s + v, 0),
      MD_t26: MD.t26.reduce((s, v) => s + v, 0),
      credit25sum: Object.values(credit25).reduce((s, a) => s + a.reduce((x, v) => x + v, 0), 0),
    };
  });

  console.log('=== กราฟ vs ตาราง (ยอดรวม Jan–Jul) ===');
  eq('ตาราง Product Group 2025      = MD.t25', d.tblTotal25, d.MD_t25, 1);
  eq('ตาราง Product Group 2026      = MD.t26', d.tblTotal26, d.MD_t26, 1);
  eq('กราฟรายเดือน 2025             = ตาราง', d.monthly25, d.tblTotal25, 1);
  eq('กราฟรายเดือน 2026             = ตาราง', d.monthly26, d.tblTotal26, 1);
  eq('กราฟสะสม 2025                 = ตาราง', d.cum25, d.tblTotal25, 1);
  eq('กราฟสะสม 2026                 = ตาราง', d.cum26, d.tblTotal26, 1);
  eq('กราฟ Product Group 2025       = ตาราง', d.group25, d.tblTotal25, 1);
  eq('กราฟ Product Group 2026       = ตาราง', d.group26, d.tblTotal26, 1);
  eq('กราฟ Credit YoY 2026          = ตาราง', d.creditYoY26, d.tblTotal26, 1);
  eq('โดนัท Credit 2026             = ตาราง', d.donut26, d.tblTotal26, 1);
  eq('กราฟ Credit YoY 2025          = credit25 รายเดือน', d.creditYoY25, d.credit25sum, 1);

  console.log('\n=== กราฟสัดส่วน 100% รวมได้ 100% ทุกเดือน ===');
  for (let i = 0; i < 7; i++) {
    const s = d.credit100.reduce((x, ds) => x + ds[i], 0);
    eq(`  Credit 100% เดือนที่ ${i + 1}`, s, 100, 0.01);
  }
  for (let y = 0; y < 2; y++) {
    const s = d.nature.reduce((x, ds) => x + ds[y], 0);
    eq(`  ลักษณะการซื้อ 100% ปีที่ ${y + 1}`, s, 100, 0.01);
  }

  console.log('\n=== ผลต่างที่ทราบและเปิดเผยไว้ในรายงาน ===');
  console.log(`   credit25 (${R(d.credit25sum).toLocaleString()}) - ยอดซื้อ 2025 (${R(d.MD_t25).toLocaleString()}) = ${R(d.credit25sum - d.MD_t25).toLocaleString()} บาท  → แสดงไว้ในหมายเหตุข้อ 2`);

  await b.close();
  console.log(fail ? `\n❌ ไม่ผ่าน ${fail} รายการ` : '\n✅ ผ่านทั้งหมด — กราฟกับตารางตรงกันทุกจุด');
  process.exit(fail ? 1 : 0);
})();
