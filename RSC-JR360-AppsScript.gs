/************************************************************
 * RSC · JR 360 — Data endpoint for the dashboard
 * วางโค้ดนี้ในโปรเจกต์ Apps Script ของ RSC (หรือสร้างใหม่)
 * แล้ว Deploy → New deployment → Web app
 *   - Execute as: Me
 *   - Who has access: Anyone with the link  (ข้อมูลจะไม่ public เพราะหน้า Dashboard มีล็อกอินอีกชั้น)
 * คัดลอก Web app URL ที่ได้ ไปใส่ใน RSC-JR360.html (ตัวแปร DATA_URL)
 *
 * ทดสอบ: เปิด URL ตรงๆ ต้องได้ JSON ของงานทั้งหมด
 ************************************************************/

// ===== ตั้งค่า: ไอดีสเปรดชีต + ชื่อแท็บ =====
var COST_ID  = '1f3FpT59tshcS76jsi53_ZpLi8ZZls-9fZV_JdFkF6oU'; // Project cost summary
var MGMT_ID  = '1ucx9LP2pKfou0j5XL48Ra7T3SdbM-Sqck2InbnlbzdY'; // Management sheet
var COST_TAB = '';   // เว้นว่าง = แท็บแรก (หรือใส่ชื่อแท็บ เช่น 'Summary')
var MGMT_TAB = '';   // เว้นว่าง = แท็บแรก

function doGet(e){
  var out = buildData();
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function num(v){
  if (v === null || v === undefined) return 0;
  var s = String(v).replace(/[^0-9.\-]/g,'');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function normJR(s){
  var m = String(s||'').match(/(JR-?\d{2}-?\d{2}-?\d{2,3})/);
  return m ? m[1].replace(/\s/g,'') : String(s||'').trim();
}
function jrYear(jr){
  var m = String(jr||'').match(/JR-?(\d{2})/);
  return m ? (2500 + parseInt(m[1],10) + 43) : 0; // พ.ศ.
}
function sheetValues(id, tab){
  var ss = SpreadsheetApp.openById(id);
  var sh = tab ? ss.getSheetByName(tab) : ss.getSheets()[0];
  return sh.getDataRange().getValues();
}

function buildData(){
  // ---- Management: JR -> sale (หา cell ที่เป็นชื่อเซลส์) ----
  var saleByJR = {};
  try {
    var mv = sheetValues(MGMT_ID, MGMT_TAB);
    for (var r=0; r<mv.length; r++){
      var row = mv[r], jrIdx = -1;
      for (var c=0; c<row.length; c++){ if (/^JR-?\d/.test(String(row[c]))) { jrIdx=c; break; } }
      if (jrIdx < 0) continue;
      var jr = normJR(row[jrIdx]);
      if (saleByJR[jr]) continue;
      // ชื่อเซลส์: cell ที่ขึ้นต้น "คุณ" หรืออยู่คอลัมน์ SALE
      for (var c2=jrIdx+1; c2<row.length; c2++){
        var t = String(row[c2]||'').trim();
        if (/^คุณ/.test(t)) { saleByJR[jr] = t.replace(/^คุณ\s*/,''); break; }
      }
    }
  } catch(err){}

  // ---- Cost summary: หา header row + คอลัมน์ ----
  var cv = sheetValues(COST_ID, COST_TAB);
  var jobCol=-1, salesCol=-1, hdr=-1;
  for (var r=0; r<Math.min(cv.length,8); r++){
    for (var c=0; c<cv[r].length; c++){
      var h = String(cv[r][c]||'').trim().toUpperCase();
      if (h === 'JOB NO.' || h === 'JOB NO') { jobCol=c; hdr=r; }
      if (h.indexOf('SALES PRICE') === 0) salesCol=c;
    }
    if (jobCol>=0 && salesCol>=0) break;
  }
  if (jobCol<0) jobCol=0;
  if (salesCol<0) salesCol=jobCol+6;

  var res = [];
  for (var r2=hdr+1; r2<cv.length; r2++){
    var row = cv[r2];
    if (!/^\s*JR-?\d/.test(String(row[jobCol]))) continue;
    var sales = num(row[salesCol]);
    var actual= num(row[salesCol+3]);
    var dlB   = num(row[salesCol+9]);
    var dlA   = num(row[salesCol+11]);
    if (sales<=0 && actual<=0) continue;
    var jr = normJR(row[jobCol]);
    var st = String(row[jobCol+4]||'').trim();
    res.push({
      jr: jr, year: jrYear(jr),
      customer: String(row[jobCol+1]||'').trim(),
      project: String(row[jobCol+3]||'').trim().slice(0,64),
      status: /[A-Za-z]/.test(st) ? st : '',
      sales: sales, actual: actual,
      margin: sales>0 ? Math.round((sales-actual)/sales*1000)/10 : 0,
      dlB: dlB, dlA: dlA,
      dlVar: dlB>0 ? Math.round((dlA-dlB)/dlB*1000)/10 : 0,
      sale: saleByJR[jr] || ''
    });
  }
  res.sort(function(a,b){ return b.sales - a.sales; });
  return { updated: new Date().toISOString(), count: res.length, jobs: res };
}
