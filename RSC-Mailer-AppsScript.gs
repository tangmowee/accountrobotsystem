/************************************************************************
 * RSC Connect — ตัวส่งอีเมลใบรายงานบริการอัตโนมัติ
 * ----------------------------------------------------------------------
 * ทำอะไร: รับใบรายงานจากเว็บ → แปลงเป็น PDF → ส่งอีเมลถึง
 *          salesadmin@robotsystem.co.th + อีเมลลูกค้า  (แนบ PDF + เนื้อหาในเมล)
 *
 * ⚠️ สร้างเป็น "โปรเจกต์ใหม่" แยกต่างหาก (อย่าไปวางทับ Planner หรือ Feed เดิม)
 *
 * วิธีติดตั้ง (ครั้งเดียว ~3 นาที)
 *   1) เปิด script.google.com → New project → ตั้งชื่อ เช่น RSC-Connect-Mailer
 *   2) ลบโค้ดตัวอย่าง วางโค้ดนี้ทั้งหมด → 💾 Save
 *   3) เปลี่ยน SECRET ด้านล่างเป็นข้อความลับของคุณเอง (กันคนอื่นยิงใช้ส่งเมล)
 *   4) Deploy → New deployment → ประเภท Web app
 *        - Execute as: Me            (เมลจะส่งจากบัญชีนี้)
 *        - Who has access: Anyone
 *      กด Deploy → Authorize (อนุญาตให้ส่งเมล) → คัดลอกลิงก์ /exec
 *   5) เอาลิงก์ + SECRET ไปใส่ใน public/firebase-config.js
 *        window.MAILER_URL    = 'ลิงก์ /exec'
 *        window.MAILER_SECRET = 'ข้อความลับเดียวกับข้อ 3'
 *
 * ทดสอบ: เปิดลิงก์ /exec ในเบราว์เซอร์ ควรเห็น {"ok":true,"service":"RSC mailer"}
 *
 * โควตาส่งเมล: บัญชี Google Workspace ปกติ ~1,500 ฉบับ/วัน (เหลือเฟือ)
 ************************************************************************/

// 🔐 เปลี่ยนเป็นข้อความลับของคุณเอง แล้วใส่ค่าเดียวกันใน firebase-config.js
var SECRET = 'rsc-connect-2569';

// อีเมลที่ต้องได้รับใบรายงานทุกใบ (สำเนาถาวร) — แก้ได้
var ALWAYS_TO = 'salesadmin@robotsystem.co.th';

// ชื่อผู้ส่งที่แสดงในอีเมล
var SENDER_NAME = 'RSC Connect — Service Report';

function doGet() {
  return json_({ ok: true, service: 'RSC mailer' });
}

function doPost(e) {
  try {
    var p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (p.secret !== SECRET) return json_({ ok: false, error: 'unauthorized' });
    if (!p.html) return json_({ ok: false, error: 'missing html' });

    // ผู้รับ: salesadmin เสมอ + อีเมลลูกค้า (ถ้ามี) + ที่ระบุเพิ่ม
    var to = [];
    if (ALWAYS_TO) to.push(ALWAYS_TO);
    if (p.customerEmail) to.push(p.customerEmail);
    (p.extraTo || []).forEach(function (x) { if (x) to.push(x); });
    to = to.filter(function (v, i, a) { return v && a.indexOf(v) === i; });   // ตัดซ้ำ
    if (!to.length) return json_({ ok: false, error: 'no recipient' });

    // แปลง HTML ของใบรายงาน → PDF แนบไปด้วย
    var name = (p.reportNo || 'service-report') + '.pdf';
    var pdf = Utilities.newBlob(p.html, 'text/html', 'r.html').getAs('application/pdf').setName(name);

    MailApp.sendEmail({
      to: to.join(','),
      subject: p.subject || ('ใบรายงานบริการ ' + (p.reportNo || '')),
      htmlBody: p.html,          // เนื้อหาในเมล (เปิดอ่านได้ทันทีไม่ต้องโหลดไฟล์)
      body: p.text || '',        // สำรองสำหรับเมลที่ไม่รองรับ HTML
      attachments: [pdf],
      name: SENDER_NAME,
      replyTo: p.replyTo || undefined
    });

    return json_({ ok: true, sentTo: to, reportNo: p.reportNo || '' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
