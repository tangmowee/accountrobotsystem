/************************************************************************
 * RSC Planner → JSON feed สำหรับ RSC Connect (อ่านอย่างเดียว — ไม่แก้ข้อมูล)
 * ----------------------------------------------------------------------
 * ใช้ทำอะไร: พ่น "งาน (jobs)" + "รายชื่อคน (people)" ออกมาเป็น JSON
 *            ให้หน้าเช็คอิน RSC Connect ดึงไปโชว์ในช่อง "งานวันนี้"
 *            จับคู่พนักงานด้วย "ชื่อจริง" (fullName)
 *
 * วิธีติดตั้ง (ทำครั้งเดียว):
 *   1) เปิดชีต RSC Planner → เมนู ส่วนขยาย (Extensions) → Apps Script
 *   2) สร้างไฟล์ใหม่ วางโค้ดนี้ทั้งหมด (อย่าลบโค้ดเดิมของ Planner)
 *   3) ถ้าสคริปต์ "ไม่ได้" ผูกกับชีตนี้ ให้ใส่ SHEET_ID ด้านล่าง
 *   4) Deploy → New deployment → ประเภท "Web app"
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      กด Deploy → คัดลอกลิงก์ที่ลงท้าย /exec
 *   5) เอาลิงก์ไปวางใน public/firebase-config.js → window.PLANNER_URL
 *
 * ทดสอบ: เปิดลิงก์ /exec ในเบราว์เซอร์ ควรเห็น JSON {ok:true, people:[...], jobs:[...]}
 ************************************************************************/

// ถ้าสคริปต์นี้ไม่ได้ผูกกับชีต Planner ให้ใส่ ID ของชีตตรงนี้ (ปล่อยว่าง = ใช้ชีตที่ผูกอยู่)
var SHEET_ID = '1tGH3_g3dVR7TZ5iKplWgSAgEu0qBSpbYty4kp_PSNYg';

function doGet(e) {
  try {
    var data = readPlanner_();
    var out = { ok: true, generatedAt: new Date().toISOString(),
                people: data.people, jobs: data.jobs };
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* อ่านค่า people / jobs จากชีต (เก็บเป็นแถว key | json) */
function readPlanner_() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
  var want = { people: null, jobs: null };
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length && (!want.people || !want.jobs); s++) {
    var values = sheets[s].getDataRange().getValues();
    for (var r = 0; r < values.length; r++) {
      var key = String(values[r][0] || '').trim();
      if ((key === 'people' || key === 'jobs') && !want[key]) {
        var raw = values[r][1];
        try { want[key] = JSON.parse(raw); } catch (e2) {}
      }
    }
  }
  // เก็บเฉพาะฟิลด์ที่จำเป็น (ตัด signature/photo ที่ใหญ่มากออก)
  var people = (want.people || []).map(function (p) {
    return { id: p.id, name: p.name || '', fullName: p.fullName || '', dept: p.dept || '' };
  });
  var jobs = (want.jobs || []).map(function (j) {
    return {
      id: j.id, ref: j.ref || '', name: j.name || '', site: j.site || '',
      type: j.type || '', start: j.start || '', end: j.end || '',
      slot: j.slot || '', timeStart: j.timeStart || '', timeEnd: j.timeEnd || '',
      progress: j.progress || 0, people: j.people || [], mapLink: j.mapLink || ''
    };
  });
  return { people: people, jobs: jobs };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
