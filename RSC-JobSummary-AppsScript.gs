/************************************************************
 * RSC · Job Summary — สร้างแท็บ "Summary" ให้ไฟล์จ๊อป (JR-xx-xx-xxx) อัตโนมัติ
 * ------------------------------------------------------------
 * ทุกไฟล์จ๊อปในโฟลเดอร์ JOBS_FOLDER_ID ที่ยังไม่มีแท็บ Summary
 * → สร้าง "PROJECT BUDGET SUMMARY" แบบเดียวกับ JR-26-04-042 ให้เอง
 *   (วางต่อจากแท็บ Budget · เป็นสูตรอ้าง Budget / Cost — ตัวเลขอัปเดตสดตามชีต)
 *
 * ตำแหน่งเซลล์ไม่ fix: สคริปต์ "หาจากป้ายชื่อ" ในแท็บ Budget / Cost
 *   Budget : Project name / Project number / Customer Name / End User
 *            Estimate Budget by Sales → DM / DL / OH / TOTAL BUDGET · Sales Price
 *   Cost   : หัวคอลัมน์ "Actual cost (PR)" / "Actual cost (PO)" → ค่าแถวถัดไป
 * ถ้าหาป้ายไหนไม่เจอ เซลล์นั้นจะว่าง และ log ไว้ (ดูที่ Executions)
 *
 * วิธีติดตั้ง (ครั้งเดียว):
 *   1) script.google.com → New project → ตั้งชื่อ "RSC Job Summary"
 *   2) วางโค้ดนี้ทั้งหมดแทน Code.gs → Save
 *   3) เลือกฟังก์ชัน installTrigger → Run → Authorize
 *      (ตั้งให้รัน addSummaryToNewJobs ทุก 1 ชั่วโมง)
 *   4) (ไม่บังคับ) Run addSummaryToNewJobs ทันทีหนึ่งครั้ง
 *
 * ใช้เองทีละไฟล์ได้:  addSummaryToJob('<ID หรือ URL ของชีต>')
 * สร้างใหม่ทับของเดิม: rebuildSummary('<ID หรือ URL ของชีต>')
 * ไล่ทำทุกไฟล์เก่าที่ยังไม่มี: backfillAll()  (รันซ้ำได้จนขึ้นว่าครบ)
 ************************************************************/

// ===== ตั้งค่า =====
var JOBS_FOLDER_ID = '1-gvA05lhZQc10WqCQzFgCP7M594JuQSh'; // โฟลเดอร์ไฟล์จ๊อป
var SUMMARY_TAB    = 'Summary';
var NEW_JOB_DAYS   = 30;   // trigger รายชั่วโมงเช็กเฉพาะไฟล์ที่สร้าง/แก้ใน N วันล่าสุด
var TIME_BUDGET_MS = 5 * 60 * 1000; // Apps Script ตัดที่ 6 นาที — หยุดก่อน

/* ---------- entry points ---------- */

function installTrigger(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'addSummaryToNewJobs') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('addSummaryToNewJobs').timeBased().everyHours(1).create();
  Logger.log('ตั้ง trigger addSummaryToNewJobs ทุก 1 ชั่วโมงแล้ว');
}

function addSummaryToNewJobs(){
  var since = new Date(Date.now() - NEW_JOB_DAYS * 864e5);
  scanFolder_(function(f){ return f.getDateCreated() >= since || f.getLastUpdated() >= since; }, false);
}

function backfillAll(){
  var done = scanFolder_(function(){ return true; }, true);
  Logger.log(done ? 'ครบทุกไฟล์แล้ว' : 'ยังไม่ครบ (หมดเวลา) — กด Run backfillAll อีกครั้ง');
}

function addSummaryToJob(idOrUrl){
  var ss = openSS_(idOrUrl);
  if (ss.getSheetByName(SUMMARY_TAB)) { Logger.log(ss.getName() + ': มี Summary อยู่แล้ว'); return; }
  buildSummary_(ss);
}

function rebuildSummary(idOrUrl){
  var ss = openSS_(idOrUrl);
  var old = ss.getSheetByName(SUMMARY_TAB);
  if (old) ss.deleteSheet(old);
  buildSummary_(ss);
}

/* ---------- folder scan ---------- */

// คืน true ถ้าไล่ครบ, false ถ้าหยุดเพราะหมดเวลา
function scanFolder_(want, rememberChecked){
  var t0 = Date.now();
  var props = PropertiesService.getScriptProperties();
  var checked = rememberChecked ? JSON.parse(props.getProperty('checked') || '{}') : {};
  var files = DriveApp.getFolderById(JOBS_FOLDER_ID).getFilesByType(MimeType.GOOGLE_SHEETS);
  var finished = true;
  while (files.hasNext()){
    if (Date.now() - t0 > TIME_BUDGET_MS) { finished = false; break; }
    var f = files.next();
    if (!/^JR-?\d{2}-?\d{2}-?\d{2,3}/i.test(f.getName())) continue;
    if (checked[f.getId()] || !want(f)) continue;
    try {
      var ss = SpreadsheetApp.openById(f.getId());
      if (!ss.getSheetByName(SUMMARY_TAB)) buildSummary_(ss);
      checked[f.getId()] = 1;
    } catch (err) {
      Logger.log(f.getName() + ': ' + err);
    }
  }
  if (rememberChecked) props.setProperty('checked', finished ? '{}' : JSON.stringify(checked));
  return finished;
}

/* ---------- build ---------- */

function buildSummary_(ss){
  var budget = ss.getSheetByName('Budget');
  var cost   = ss.getSheetByName('Cost');
  if (!budget) throw new Error('ไม่พบแท็บ Budget');
  var src = locate_(budget, cost);

  var idx = budget.getIndex(); // วางต่อจาก Budget
  var sh = ss.insertSheet(SUMMARY_TAB, idx);
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 26).setColumnWidth(2, 250).setColumnWidth(3, 330);

  var ref = function(key){ return src[key] ? '=' + src[key] : ''; };
  var rows = [
    ['PROJECT BUDGET SUMMARY', ''],                       // 1
    ['PROJECT INFO', ''],                                 // 2
    ['Project name',   ref('name')],                      // 3
    ['Project number', ref('number') || ss.getName()],     // 4 (ไม่เจอป้าย → ใช้ชื่อไฟล์)
    ['Customer name',  ref('customer')],                  // 5
    ['End user',       ref('endUser')],                   // 6
    ['SALES & MARGIN', ''],                               // 7
    ['Sale price',     ref('sales')],                     // 8
    ['GP %',           '=IFERROR((C8-C14)/C8,"")'],       // 9
    ['BUDGET', ''],                                       // 10
    ['Budget (DL)',    ref('dl')],                        // 11
    ['Budget (OH)',    ref('oh')],                        // 12
    ['Budget (DM)',    ref('dm')],                        // 13
    ['Total Budget (DL+OH+DM)', ref('total')],            // 14
    ['ACTUAL ', ''],                                      // 15
    ['Actual PR (ราคาขอซื้อ)', src.pr ? '=IFERROR(' + src.pr + ',0)' : ''], // 16
    ['Actual cost (PO)(DM)',   src.po ? '=IFERROR(' + src.po + ',0)' : ''], // 17
    ['Cost Saving (PR - PO)',  '=IFERROR(C16-C17,0)'],     // 18
    ['Diff (Budget DM - Actual)', '=C13-C17'],            // 19
    ['=CONCATENATE("Update : ",TEXT(TODAY(),"d mmmm yyyy"))', ''] // 20
  ];
  sh.getRange(1, 2, rows.length, 2).setValues(rows);

  // ---- รูปแบบ (ตามต้นแบบ JR-26-04-042) ----
  var GREY = '#efefef', PEACH = '#fff3ea', ORANGE = '#ff6500';
  var all = sh.getRange('B1:C20');
  all.setFontFamily('Verdana').setFontSize(10).setVerticalAlignment('bottom');
  all.setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

  sh.getRange('B1:C1').merge().setBackground(ORANGE).setFontColor('#ffffff')
    .setFontWeight('bold').setFontSize(13).setFontFamily('Arial');
  ['B2:C2', 'B7:C7', 'B10:C10', 'B14:C14', 'B15:C15'].forEach(function(a){
    sh.getRange(a).setBackground(GREY).setFontWeight('bold');
  });
  sh.getRange('B16:C19').setBackground(PEACH);
  sh.getRange('C8:C19').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange('C8').setNumberFormat('#,##0.00');
  sh.getRange('C9').setNumberFormat('0.00%').setFontSize(12);
  sh.getRange('C11:C19').setNumberFormat('#,##0.00');
  sh.getRange('C14').setFontSize(11);
  sh.getRange('C18').setFontColor('#1e7f3c');
  sh.getRange('B20:C20').merge().setHorizontalAlignment('right');

  // เส้นหนา: กรอบนอก + เส้นแบ่งกลุ่ม
  var MED = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  sh.getRange('B1:C19').setBorder(true, true, true, true, null, null, '#000000', MED);
  sh.getRange('B1:C1').setBorder(true, true, true, true, null, null, '#000000', MED);
  sh.getRange('B9:C9').setBorder(null, null, true, null, null, null, '#000000', MED);
  sh.getRange('B10:C10').setBorder(true, null, null, null, null, null, '#000000', MED);
  sh.getRange('B14:C14').setBorder(null, null, true, null, null, null, '#000000', MED);
  sh.getRange('B15:C15').setBorder(true, null, null, null, null, null, '#000000', MED);

  var missing = ['name','customer','endUser','sales','dm','dl','oh','total','pr','po']
    .filter(function(k){ return !src[k]; });
  Logger.log(ss.getName() + ': สร้าง Summary แล้ว' +
             (missing.length ? ' (หาไม่เจอ: ' + missing.join(', ') + ')' : ''));
  return sh;
}

/* ---------- หาเซลล์จากป้ายชื่อ ---------- */

function locate_(budget, cost){
  var out = {};
  var bv = budget.getDataRange().getDisplayValues();
  var B = "Budget!";
  var norm = function(s){ return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };

  // ข้อมูลโปรเจกต์: ป้ายอยู่ในเซลล์ → ค่าคือเซลล์ถัดไปทางขวา
  var info = [['name', /^project name/], ['number', /^project (number|no)/],
              ['customer', /^customer name/], ['endUser', /^end ?user/]];
  for (var r = 0; r < Math.min(bv.length, 15); r++){
    for (var c = 0; c < bv[r].length - 1; c++){
      var t = norm(bv[r][c]);
      info.forEach(function(p){
        if (!out[p[0]] && p[1].test(t)) out[p[0]] = B + a1_(r, c + 1);
      });
    }
  }

  // ส่วน "Estimate Budget by Sales" → DM/DL/OH/TOTAL BUDGET อยู่คอลัมน์เดียวกัน ค่าอยู่ขวามือ
  var est = findCell_(bv, function(t){ return t === 'estimate budget by sales'; });
  if (est){
    for (var r2 = est.r + 1; r2 < Math.min(bv.length, est.r + 10); r2++){
      var t2 = norm(bv[r2][est.c]);
      var key = { 'dm': 'dm', 'dl': 'dl', 'oh': 'oh', 'total budget': 'total' }[t2];
      if (key && !out[key]) out[key] = B + a1_(r2, est.c + 1);
    }
  }
  var sp = findCell_(bv, function(t){ return t === 'sales price'; });
  if (sp) out.sales = B + a1_(sp.r, sp.c + 1);

  // Cost: หัวคอลัมน์ Actual cost (PR)/(PO) → ยอดรวมอยู่แถวถัดไป
  if (cost){
    var cv = cost.getRange(1, 1, Math.min(cost.getMaxRows(), 20), cost.getMaxColumns()).getDisplayValues();
    var pr = findCell_(cv, function(t){ return t === 'actual cost (pr)'; });
    var po = findCell_(cv, function(t){ return t === 'actual cost (po)'; });
    if (pr) out.pr = 'Cost!' + a1_(pr.r + 1, pr.c);
    if (po) out.po = 'Cost!' + a1_(po.r + 1, po.c);
  }
  return out;

  function findCell_(vals, test){
    for (var i = 0; i < vals.length; i++)
      for (var j = 0; j < vals[i].length; j++)
        if (test(norm(vals[i][j]))) return { r: i, c: j };
    return null;
  }
}

function a1_(r0, c0){ // 0-based → A1
  var s = '', n = c0 + 1;
  while (n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s + (r0 + 1);
}

function openSS_(idOrUrl){
  var s = String(idOrUrl || '').trim();
  return /^https?:/.test(s) ? SpreadsheetApp.openByUrl(s) : SpreadsheetApp.openById(s);
}
