// ตรวจว่าตัวเลขในหัวข้อ 7-9 ตรงกับไฟล์ Excel ต้นทาง
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const P = JSON.parse(fs.readFileSync('data/payload.json','utf8'));
let fail = 0;
const eq = (n,a,b,t=0.01)=>{const ok=Math.abs(a-b)<=t; if(!ok)fail++; console.log(`${ok?'✅':'❌'} ${n}: ${a} vs ${b}`);};
(async()=>{
  const br=await chromium.launch(); const p=await br.newPage({viewport:{width:1440,height:1000}});
  await p.goto('file://'+path.resolve('Procurement_Report_JanJul_2026_v3.html'),{waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  const d=await p.evaluate(()=>{
    const ch=id=>Chart.getChart(document.getElementById(id));
    const txt=s=>[...document.querySelectorAll(s)].map(e=>e.textContent.trim());
    return {
      otdPct: ch('chOTD').data.datasets[0].data,
      otdTarget: ch('chOTD').data.datasets[1].data[0],
      otdPo: ch('chOTDvol').data.datasets[0].data,
      pareto: ch('chPareto').data.datasets[0].data,
      origin: ch('chOrigin').data.datasets.map(ds=>ds.data[0]),
      kpiVals: txt('.kpi .val'),
    };
  });
  console.log('=== OTD ตรงกับไฟล์ KPI-PURCHASING ข้อ1 ===');
  P.otd.pct.forEach((v,i)=>eq(`  OTD เดือนที่ ${i+1}`, d.otdPct[i], v, 0.001));
  eq('  เป้าหมาย', d.otdTarget, P.otd.target);
  P.otd.po.forEach((v,i)=>eq(`  PO item เดือนที่ ${i+1}`, d.otdPo[i], v));
  console.log('\n=== Pareto / Origin ===');
  eq('  Pareto จุดที่ 1 (Top1 %)', d.pareto[0], P.conc['1'], 0.05);
  eq('  Pareto จุดที่ 5 (Top5 %)', d.pareto[4], P.conc['5'], 0.05);
  eq('  Pareto จุดที่ 10 (Top10 %)', d.pareto[9], P.conc['10'], 0.05);
  eq('  Origin รวม = 100%', d.origin[0]+d.origin[1], 100, 0.02);
  console.log('\nKPI cards:', d.kpiVals.join(' | '));
  await br.close();
  console.log(fail?`\n❌ ไม่ผ่าน ${fail}`:'\n✅ ผ่านทั้งหมด — ตัวเลขหัวข้อ 7–9 ตรงกับไฟล์ Excel');
  process.exit(fail?1:0);
})();
