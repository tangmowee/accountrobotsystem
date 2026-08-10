/************************************************************
 * RSC · JR 360 — Data endpoint (Google Apps Script)
 * ------------------------------------------------------------
 * อ่านชีต "Project cost summary" แล้วส่งออกเป็น JSON ให้หน้า JR 360
 * ดึง DL (Direct Labor) งบ/จริง รายโปรเจกต์ + ยอดขาย เพื่อเทียบสด
 *
 * วิธี Deploy:
 *   1) เปิด Google Sheet (ที่มีชีตต้นทุน) → เมนู Extensions → Apps Script
 *   2) วางโค้ดนี้ทั้งหมด (แทนของเดิม) แล้ว Save
 *   3) Deploy → New deployment → เลือกชนิด "Web app"
 *        - Execute as:      Me
 *        - Who has access:  Anyone with the link
 *   4) คัดลอก "Web app URL" ที่ได้ ส่งให้ผู้ดูแล เพื่อใส่ในหน้า JR360 (DATA_URL)
 *
 * ทดสอบ: เปิด Web app URL ตรงๆ ต้องได้ JSON { updated, count, jobs:[...] }
 *
 * หมายเหตุ: ข้อมูลไม่ public เพราะหน้า Dashboard มีล็อกอิน + จำกัดสิทธิ์อีกชั้น
 ************************************************************/

// ===== ตั้งค่า: ไอดีสเปรดชีต =====
var COST_ID  = '1f3FpT59tshcS76jsi53_ZpLi8ZZls-9fZV_JdFkF6oU'; // Project cost summary
var COST_TAB = '';   // เว้นว่าง = แท็บแรก (หรือใส่ชื่อแท็บ เช่น 'Summary')

function doGet(e){
  var out;
  try { out = buildData(); }
  catch (err) { out = { error: String(err), updated: nowIso(), count: 0, jobs: [] }; }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function nowIso(){ return new Date().toISOString(); }

function num(v){
  if (v === null || v === undefined) return 0;
  var s = String(v).replace(/[^0-9.\-]/g,'');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function normJR(s){
  var m = String(s||'').match(/JR-?\d{2}-?\d{2}-?\d{2,3}/);
  return m ? m[0].replace(/\s/g,'').toUpperCase() : '';
}
function jrYear(jr){
  var m = String(jr||'').match(/JR-?(\d{2})/);
  return m ? (2500 + parseInt(m[1],10) + 43) : 0; // พ.ศ.  (เช่น 25 → 2568)
}
function sheetValues(id, tab){
  var ss = SpreadsheetApp.openById(id);
  var sh = tab ? ss.getSheetByName(tab) : ss.getSheets()[0];
  return sh.getDataRange().getValues();
}

function buildData(){
  var cv = sheetValues(COST_ID, COST_TAB);

  // ---- หา header row ของตารางต้นทุน: ต้องมี 'JOB NO.' และ 'SALES PRICE' ----
  var jobCol = -1, salesCol = -1, hdr = -1;
  for (var r = 0; r < Math.min(cv.length, 20); r++){
    var jc = -1, sc = -1;
    for (var c = 0; c < cv[r].length; c++){
      var h = String(cv[r][c]||'').trim().toUpperCase();
      if (h === 'JOB NO.' || h === 'JOB NO') jc = c;
      if (h.indexOf('SALES PRICE') === 0 || h === 'SALES PRICE') sc = c;
    }
    if (jc >= 0 && sc >= 0){ jobCol = jc; salesCol = sc; hdr = r; break; }
  }
  if (jobCol < 0){ jobCol = 1; salesCol = 7; hdr = 0; } // fallback

  // ระยะห่างคอลัมน์ (อิงจากโครงสร้างชีตจริง — JR ที่ jobCol):
  //   customer=+1 · project=+3 · status=+4 · sales=+6 · actual(DM,DL,OH)=+9 · DL งบ=+15 · DL จริง=+17
  var OFF = { cust:1, proj:3, stat:4, sales:6, actual:9, dlB:15, dlA:17 };

  var byJR = {};  // เก็บ record ที่ยอดขายสูงสุดต่อ JR (แถวหลักของงาน)
  for (var r2 = hdr + 1; r2 < cv.length; r2++){
    var row = cv[r2];
    var jr = normJR(row[jobCol]);
    if (!jr) continue;
    var sales  = num(row[jobCol + OFF.sales]);
    var actual = num(row[jobCol + OFF.actual]);
    var dlB    = num(row[jobCol + OFF.dlB]);
    var dlA    = num(row[jobCol + OFF.dlA]);
    if (sales <= 0 && actual <= 0 && dlB <= 0 && dlA <= 0) continue;
    var rec = {
      jr: jr, year: jrYear(jr),
      customer: String(row[jobCol + OFF.cust] || '').trim(),
      project:  String(row[jobCol + OFF.proj] || '').trim().slice(0, 64),
      status:   String(row[jobCol + OFF.stat] || '').trim(),
      sales: sales, actual: actual, dlB: dlB, dlA: dlA
    };
    if (!/[A-Za-z]/.test(rec.status)) rec.status = '';
    // dedupe: เก็บแถวที่ sales มากสุด (แถวสรุปหลัก) — รวม DL จากแถวที่มีค่า
    if (byJR[jr]){
      var ex = byJR[jr];
      if (sales > ex.sales) { rec.dlB = rec.dlB || ex.dlB; rec.dlA = rec.dlA || ex.dlA; byJR[jr] = rec; }
      else { ex.dlB = ex.dlB || dlB; ex.dlA = ex.dlA || dlA; }
    } else {
      byJR[jr] = rec;
    }
  }

  var res = [];
  for (var k in byJR){
    var p = byJR[k];
    p.margin = p.sales > 0 ? Math.round((p.sales - p.actual) / p.sales * 1000) / 10 : 0;
    p.dlVar  = p.dlB   > 0 ? Math.round((p.dlA   - p.dlB)   / p.dlB   * 1000) / 10 : 0;
    p.sale   = '';
    res.push(p);
  }
  res.sort(function(a,b){ return b.sales - a.sales; });
  return { updated: nowIso(), count: res.length, jobs: res };
}
