/* ============================================================
 * RSC Connect — สร้างบัญชีล็อกอินพนักงานทีเดียว (Firebase Auth)
 * อ่านรายชื่อจาก rsc-employees-import.json → สร้างบัญชี รหัส@rsc.local
 * ------------------------------------------------------------
 * วิธีใช้ (ทำในเครื่องคอมที่มี Node.js):
 *   1) โหลด service account key จาก Firebase Console:
 *        ⚙️ Project settings → Service accounts → Generate new private key
 *        → ได้ไฟล์ .json → เปลี่ยนชื่อเป็น  serviceAccountKey.json
 *          วางไว้โฟลเดอร์เดียวกับสคริปต์นี้
 *   2) ติดตั้งไลบรารี:   npm install firebase-admin
 *   3) รัน:              node create-users.js
 *
 * ปลอดภัย: รันซ้ำได้ — บัญชีที่มีอยู่แล้วจะข้าม ไม่พัง
 * ============================================================ */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ----- ตั้งค่า -----
const LOGIN_DOMAIN   = 'rsc.local';     // ต้องตรงกับ window.LOGIN_DOMAIN ในแอป
const DEFAULT_PASSWORD = 'Rsc@2569';    // รหัสผ่านเริ่มต้น (พนักงานเปลี่ยนทีหลังได้) — แก้ได้
const EMP_FILE = path.join(__dirname, 'rsc-employees-import.json');
const KEY_FILE = path.join(__dirname, 'serviceAccountKey.json');

// ----- เริ่มต้น -----
if (!fs.existsSync(KEY_FILE)) {
  console.error('❌ ไม่พบ serviceAccountKey.json — โหลดจาก Firebase Console → Service accounts มาวางก่อน');
  process.exit(1);
}
if (!fs.existsSync(EMP_FILE)) {
  console.error('❌ ไม่พบ rsc-employees-import.json — วางไฟล์รายชื่อพนักงานไว้โฟลเดอร์เดียวกัน');
  process.exit(1);
}

admin.initializeApp({ credential: admin.cert(require(KEY_FILE)) });
const auth = admin.auth();

const data = JSON.parse(fs.readFileSync(EMP_FILE, 'utf8'));
const emps = Array.isArray(data) ? data : (data.employees || []);

(async () => {
  let created = 0, skipped = 0, failed = 0;
  const rows = [];
  for (const e of emps) {
    const uid  = String(e.email || e.id || '').trim();   // รหัสพนักงาน เช่น 550642
    if (!uid) { continue; }
    const email = uid.includes('@') ? uid : `${uid}@${LOGIN_DOMAIN}`;
    try {
      await auth.createUser({
        email,
        emailVerified: true,
        password: DEFAULT_PASSWORD,
        displayName: e.name || uid,
        disabled: false
      });
      created++;
      rows.push([uid, e.name || '', DEFAULT_PASSWORD, 'สร้างใหม่']);
      console.log(`✅ สร้าง ${email}  (${e.name || ''})`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        skipped++;
        rows.push([uid, e.name || '', '(มีอยู่แล้ว)', 'ข้าม']);
        console.log(`↷  ข้าม ${email} (มีอยู่แล้ว)`);
      } else {
        failed++;
        rows.push([uid, e.name || '', '-', 'ผิดพลาด: ' + (err.code || err.message)]);
        console.error(`❌ ${email} — ${err.code || err.message}`);
      }
    }
  }

  // เขียนไฟล์สรุปบัญชี+รหัสผ่าน (ให้ HR แจกพนักงาน)
  const csv = '﻿' + 'รหัสพนักงาน,ชื่อ,รหัสผ่าน,สถานะ\n' +
    rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  fs.writeFileSync(path.join(__dirname, 'accounts-created.csv'), csv);

  console.log(`\n===== เสร็จสิ้น =====`);
  console.log(`สร้างใหม่ ${created} · ข้าม(มีแล้ว) ${skipped} · ผิดพลาด ${failed}`);
  console.log(`รหัสผ่านเริ่มต้นทุกคน: ${DEFAULT_PASSWORD}`);
  console.log(`บันทึกรายการบัญชีไว้ที่ accounts-created.csv`);
  process.exit(0);
})();
