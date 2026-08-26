// ตรวจว่าตารางงวดการชำระเงินในรายงาน = เอกสาร Payment Schedule
const { chromium } = require('playwright'); const path = require('path');
let fail=0; const eq=(n,a,b,t=0.01)=>{const ok=Math.abs(a-b)<=t;if(!ok)fail++;console.log(`${ok?'✅':'❌'} ${n}: ${a.toLocaleString()} vs ${b.toLocaleString()}`);};
// ค่าจากเอกสาร Payment_Schedule_Donaldson_PO69732_733.docx
const DOC = { usd:930109.00, thb:31158651.50, rate:33.50,
  po732:{usd:409965.00, thb:13733827.50}, po733:{usd:520144.00, thb:17424824.00},
  flow:[15579325.75, 2746765.50, 6231730.30, 3484964.80, 3115865.15] };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:1000}});
  await p.goto('file://'+path.resolve('Procurement_Report_JanJul_2026_v3.html'),{waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  const d=await p.evaluate(()=>{
    const c=Chart.getChart(document.getElementById('chPaySched'));
    const num=s=>parseFloat(String(s).replace(/[^0-9.-]/g,''))||0;
    const rows=[...document.querySelectorAll('tr.total')].map(tr=>[...tr.children].map(td=>td.textContent.trim()));
    return { flow:c.data.datasets[0].data, cum:c.data.datasets[1].data,
      totalRow: rows.find(r=>r[1]==='ABA + ECM'),
      p732: rows.find(r=>r[0].includes('PO69-732')), p733: rows.find(r=>r[0].includes('PO69-733')),
      num: null, rawRows: rows.map(r=>r.join('|')) };
  });
  console.log('=== กระแสเงินรายงวด ===');
  DOC.flow.forEach((v,i)=>eq(`  งวดที่ ${i+1}`, d.flow[i], v));
  eq('  สะสมงวดสุดท้าย = ยอดโครงการ', d.cum[d.cum.length-1], DOC.thb);
  const num=s=>parseFloat(String(s).replace(/[^0-9.-]/g,''))||0;
  console.log('\n=== ตารางสรุป ===');
  eq('  รวม USD', num(d.totalRow[3]), DOC.usd);
  eq('  รวม THB', num(d.totalRow[4]), Math.round(DOC.thb), 1);
  eq('  PO69-732 USD', num(d.p732[1]), DOC.po732.usd);
  eq('  PO69-732 THB', num(d.p732[2]), Math.round(DOC.po732.thb), 1);
  eq('  PO69-733 USD', num(d.p733[1]), DOC.po733.usd);
  eq('  PO69-733 THB', num(d.p733[2]), Math.round(DOC.po733.thb), 1);
  await b.close();
  console.log(fail?`\n❌ ไม่ผ่าน ${fail}`:'\n✅ ผ่านทั้งหมด — ตารางงวดตรงกับเอกสาร Payment Schedule');
  process.exit(fail?1:0);
})();
