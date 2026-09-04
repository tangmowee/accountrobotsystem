/* ============================================================
   RSC People — การตั้งค่ากลาง (ใช้ร่วมทั้งหน้า HR admin และหน้ามือถือ)
   วางค่า Firebase จาก Console → Project settings → Web app ที่นี่ "ที่เดียว"
   ปล่อย apiKey ว่าง = โหมด LOCAL (เก็บในเบราว์เซอร์ ใช้ทดลอง)
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBOt4Hwcpp4aoUdNZ7q7qdBWBp6tGvzx8o",
  authDomain: "rsc-connect.firebaseapp.com",
  projectId: "rsc-connect",
  storageBucket: "rsc-connect.firebasestorage.app",
  messagingSenderId: "590117381818",
  appId: "1:590117381818:web:065295136ea06c29a44483"
};

/* โดเมนต่อท้ายชื่อผู้ใช้อัตโนมัติ — พนักงานล็อกอินด้วยชื่อเล่น/รหัส ไม่ต้องพิมพ์อีเมล
   (สร้างบัญชีใน Firebase Console เป็น ชื่อผู้ใช้@rsc.local) */
window.LOGIN_DOMAIN = 'rsc.local';

/* รัศมี (เมตร) ที่อนุญาตให้เช็คอินห่างจากพิกัดไซต์งานใน Planner */
window.GEOFENCE_RADIUS_M = 300;          // รัศมีไซต์งานลูกค้า (เมตร)

/* ============================================================
   จุดเช็คอินของบริษัท (หน้าออฟฟิศ ROBOT SYSTEM)
   ------------------------------------------------------------
   งานออฟฟิศต้องเช็คอินในรัศมีนี้เท่านั้น — กันเช็คอินจากหลังโรงงาน/นอกรั้ว
   ตั้งค่าจริงได้ที่หน้า HR → วันนี้ → "จุดเช็คอินของบริษัท"
   (ยืนที่หน้าออฟฟิศแล้วกดปุ่มดึงพิกัด ค่าจะถูกบันทึกทับค่าเริ่มต้นนี้)
   ============================================================ */
window.OFFICE_GEO = {
  lat: 13.581601,        // ค่าเริ่มต้น — จากพิกัดที่เคยเช็คอินจริง ยังไม่ยืนยัน
  lng: 100.683128,
  radius: 120,           // เมตร
  confirmed: false       // true เมื่อ HR กดยืนยันพิกัดที่หน้าออฟฟิศแล้ว
};

/* ===== นโยบายเวลาทำงาน RSC ===== */
window.WORK_START     = '08:30';        // เวลาเข้างาน (เกินนี้ = มาสาย)
window.WORK_END       = '17:30';        // เวลาเลิกงาน
window.WORK_DAYS      = [1,2,3,4,5];    // วันทำงาน (0=อา,1=จ,...,6=ส) → จันทร์–ศุกร์
window.STD_HOURS      = 8;              // ชั่วโมงงานมาตรฐาน/วัน (หักพักเที่ยง 1 ชม. จาก 9 ชม.)
window.LATE_GRACE_MIN = 0;              // ผ่อนผันสาย (นาที) เกินจากนี้ถึงนับว่าสาย

/* โควตาวันลาต่อปี (วัน) ต่อพนักงานหนึ่งคน — ปรับได้ */
window.LEAVE_QUOTA = { vacation: 6, personal: 3, sick: 30 };

/* ===== บันทึกเวลางานตามจ๊อป (เก็บต้นทุนแรงงานจริง DL) ===== */
/* ช่วงพักเที่ยง — ใช้หักออกเมื่อคำนวณชั่วโมงจากเวลาเริ่ม–สิ้นสุด */
window.LUNCH_START = '12:00';
window.LUNCH_END   = '13:00';
/* เวลามาตรฐานของแต่ละช่วง (เช้า/บ่าย/เต็มวัน) — auto เติมให้ตอนเลือก แก้ได้ */
window.SLOTS = {
  full:      { label:'เต็มวัน', start:'08:30', end:'17:30' },  // 8 ชม. (หักพักเที่ยง)
  morning:   { label:'เช้า',    start:'08:30', end:'12:00' },  // 3.5 ชม.
  afternoon: { label:'บ่าย',    start:'13:00', end:'17:30' }   // 4.5 ชม.
};
/* บังคับให้พนักงานบันทึกเวลาตาม JR ก่อนเช็คเอาท์ (true = บังคับทุกคน, false = ไม่บังคับ)
   งานสำนักงาน/ส่วนกลางเลือก JR OFFICE ได้ */
window.REQUIRE_JR = true;

/* รหัสงานส่วนกลาง (เวลาที่ลงตรงนี้ = งานส่วนกลาง ไม่ผูกโปรเจกต์ — เพิ่ม/แก้รายการได้) */
window.OFFICE_JRS = ['JR OFFICE', 'JR Marketing'];
window.OFFICE_JR  = window.OFFICE_JRS[0]; // ค่าเริ่มต้น (เผื่อโค้ดเก่าอ้างถึง)

/* ===== เชื่อม RSC Planner (อ่านงานจริงมาโชว์ในช่อง "งานวันนี้") =====
   วางลิงก์ Web app (…/exec) ที่ได้จากการ Deploy สคริปต์ RSC-Planner-AppsScript.gs
   ปล่อยว่าง = ปิดการเชื่อม (ใช้เฉพาะแผนงานที่กรอกในแอดมิน)
   จับคู่คนด้วย "ชื่อจริง" (fullName) ระหว่าง RSC Connect กับ RSC Planner */
window.PLANNER_URL = 'https://script.google.com/macros/s/AKfycbyP64LrWowUoTi1QXSmb5vpmFRl9bFkfUbLAM14wT3DCmapxQUPn6j_TlkVh3TLWvj2/exec';

/* ===== เงินเดือน/ค่าแรง (เห็นเฉพาะ HR) — สำหรับสรุปชั่วโมง+เงินส่ง Business Plus ===== */
/* ตัวหารหาค่าจ้างต่อชั่วโมง: เงินเดือน ÷ (30 วัน × 8 ชม.) = ÷240 (ปรับได้ตามระเบียบบริษัท) */
window.PAY_DIVISOR = 240;
/* อัตรา OT (พนักงานรายเดือน):
   วันทำงาน OT ×1.5 · วันหยุดสุดสัปดาห์(เสาร์/อาทิตย์) เวลาปกติ ≤8 ชม. ×1, เกิน ×3 · วันหยุดนักขัตฤกษ์ ×3 ทั้งหมด */
window.OT_MULT = { normal: 1.5, holidayNormal: 1, holiday: 3 };

/* วันหยุดนักขัตฤกษ์ (รูปแบบ YYYY-MM-DD, ค.ศ.) — ทำงานวันนี้ = OT ×3 และไม่นับเป็นขาดงาน
   ประกาศ HR01/2568 · วันหยุดประเพณี ประจำปี 2569 (พ.ศ.) = ค.ศ. 2026 */
window.HOLIDAYS = [
  '2026-01-01', // วันขึ้นปีใหม่
  '2026-01-02', // วันหยุดปีใหม่
  '2026-03-03', // วันมาฆบูชา
  '2026-04-13', // วันสงกรานต์
  '2026-04-14', // วันสงกรานต์
  '2026-04-15', // วันสงกรานต์
  '2026-05-01', // วันแรงงานแห่งชาติ
  '2026-06-03', // วันเฉลิมพระชนมพรรษาพระราชินี
  '2026-07-28', // วันเฉลิมพระชนมพรรษาพระเจ้าอยู่หัว
  '2026-08-12', // วันแม่แห่งชาติ
  '2026-10-23', // วันปิยมหาราช
  '2026-12-07', // ชดเชยวันพ่อแห่งชาติ
  '2026-12-30', // วันสิ้นปี
  '2026-12-31'  // วันสิ้นปี
];

/* ===== ใบรายงานบริการ (Service Report) =====
   อีเมลที่ต้องได้รับใบรายงานทุกใบ (นอกเหนือจากอีเมลลูกค้าที่ช่างกรอกหน้างาน) */
window.SALES_ADMIN_EMAIL = 'salesadmin@robotsystem.co.th';

/* ส่งใบรายงานอัตโนมัติ (แนบ PDF) — ได้จากการ Deploy RSC-Mailer-AppsScript.gs
   ปล่อยว่าง = ปิดการส่งอัตโนมัติ (ระบบจะเปิดโปรแกรมอีเมลให้กดส่งเองแทน) */
window.MAILER_URL    = 'https://script.google.com/macros/s/AKfycbx5heuDhkDnyX3JF0Fa4YuFg1Od-fcLNZwHr_grm38hFvC2yGnMWPp3nWHNolPGzqRBHw/exec';
window.MAILER_SECRET = 'rsc-connect-2569';   // ต้องตรงกับ SECRET ในสคริปต์

/* ===== ข้อมูลบริษัท (ใช้บนหัวกระดาษใบรายงานบริการ) =====
   แก้ที่นี่ที่เดียว — มีผลกับใบที่พิมพ์ ไฟล์ PDF และอีเมลที่ส่งลูกค้า
   logo: วางเป็น data URI ("data:image/png;base64,....") หรือ URL รูปโลโก้จริง
         ปล่อยว่าง = ใช้โลโก้สำรองที่ระบบวาดให้ */
window.COMPANY = {
  nameEn : 'ROBOT SYSTEM CO., LTD.',
  nameTh : 'บริษัท โรบอท ซิสเต็ม จำกัด',
  address: '',                                  // ที่อยู่บริษัท
  phone  : '02-174367-69',                      // เบอร์โทรบริษัท
  email  : 'info@robotsystem.co.th',
  web    : 'www.robotsystem.co.th',
  taxId  : '',                                  // เลขประจำตัวผู้เสียภาษี
  logo   : ''                                   // โลโก้จริง (data URI / URL)
};

/* ============================================================
   ต้นทุนค่าแรงทางตรง (DL) — ใช้เทียบ "งบที่ตั้งไว้" กับ "ที่ทำจริง"
   ตัวเลขมาจากชีต Data ของไฟล์ EST (ต้นทุนจริงเฉลี่ยต่อแผนก)
   perHour ใช้คูณกับชั่วโมงที่พนักงานลงตาม JR
   ============================================================ */
window.COST_SECTIONS = {
  design_mech : { label:'ออกแบบเครื่องกล',        en:'Design Mechanic',        perDay:1289, perHour:162 },
  design_elec : { label:'ออกแบบไฟฟ้า/โปรแกรม',     en:'Design Elec & Program',  perDay:1068, perHour:134 },
  project     : { label:'โปรเจกต์/โปรแกรมโรบอท',   en:'Project/Program',        perDay:985,  perHour:124 },
  production  : { label:'ผลิต/ติดตั้ง/บริการ',      en:'Production/Install',     perDay:523,  perHour:66  },
  tech_elec   : { label:'ช่างไฟฟ้า',               en:'Technical Elec',         perDay:463,  perHour:58  }
};

/* อัตราที่ใช้ "ตั้งงบ/เสนอราคา" (บาท/คน/วัน) — จากคอลัมน์ LC/D ในไฟล์ EST */
window.QUOTE_RATES = [
  { rate:1800, label:'ออกแบบ / โปรแกรม' },
  { rate:1500, label:'โปรแกรมโรบอท' },
  { rate:1200, label:'เอกสาร / คู่มือ' },
  { rate:800,  label:'ช่าง / ผลิต / ติดตั้ง' },
  { rate:200,  label:'เบี้ยเลี้ยง (ไม่ใช่ค่าแรง)' }
];
/* อัตราที่ถือเป็น "เบี้ยเลี้ยง" ไม่ใช่ชั่วโมงแรงงาน — แยกออกตอนเทียบกับเวลาเช็คอิน */
window.ALLOWANCE_RATES = [200];

/* จับคู่ตำแหน่ง/แผนกของพนักงาน → แผนกต้นทุนข้างบน (อัตโนมัติ)
   HR แก้รายคนทับได้ที่หน้าทะเบียนพนักงาน  ·  ไม่เข้าเกณฑ์ = ไม่คิดเป็น DL (นับเป็น OH) */
window.COST_SECTION_RULES = [
  { match:/design engineer|mechatronics manager|mechanical design/i, section:'design_mech' },
  { match:/electrical (engineering manager|engineer)|senior electrical/i, section:'design_elec' },
  { match:/electrical technician/i,                                   section:'tech_elec' },
  { match:/project manager|robot engineer|programmer|simulation engineer|key account manager/i, section:'project' },
  { match:/technician|production supervisor|assembly|installation|after-sales/i, section:'production' }
];

/* ============================================================
   เบี้ยเลี้ยง (Per-diem) — เหมาจ่าย ไม่ต้องแนบใบเสร็จ · เบิกผูกกับเลข JR
   นำไปแมตช์กับบรรทัด "Allowance" ในงบ DL ของ JR เดียวกัน
   ============================================================ */
window.PERDIEM_TYPES = [
  { id:'overnight', label:'ค้างคืน ต่างจังหวัด', rate:200, perNight:true  },
  { id:'daytrip',   label:'ไป-กลับ ต่างจังหวัด', rate:200, perNight:false },
  { id:'oversea',   label:'ต่างประเทศ',          rate:0,   perNight:true  }
];

/* ============================================================
   กันข้อมูลเวลาเพี้ยน + คำขอแก้เวลา
   ============================================================ */
/* ถ้าเช็คอิน–เช็คเอาท์ห่างกันเกินนี้ = ผิดปกติ (น่าจะลืมกดออก)
   ระบบจะเตือนและ "ไม่นับ" ชั่วโมงส่วนเกินเข้ารายงาน จนกว่าจะแก้เวลาให้ถูก */
window.MAX_SHIFT_HOURS = 16;
