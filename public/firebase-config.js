/* ============================================================
   RSC People — การตั้งค่ากลาง (ใช้ร่วมทั้งหน้า HR admin และหน้ามือถือ)
   วางค่า Firebase จาก Console → Project settings → Web app ที่นี่ "ที่เดียว"
   ปล่อย apiKey ว่าง = โหมด LOCAL (เก็บในเบราว์เซอร์ ใช้ทดลอง)
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/* โดเมนต่อท้ายชื่อผู้ใช้อัตโนมัติ — พนักงานล็อกอินด้วยชื่อเล่น/รหัส ไม่ต้องพิมพ์อีเมล
   (สร้างบัญชีใน Firebase Console เป็น ชื่อผู้ใช้@rsc.local) */
window.LOGIN_DOMAIN = 'rsc.local';

/* รัศมี (เมตร) ที่อนุญาตให้เช็คอินห่างจากพิกัดไซต์งานใน Planner */
window.GEOFENCE_RADIUS_M = 300;

/* ===== นโยบายเวลาทำงาน RSC ===== */
window.WORK_START     = '08:30';        // เวลาเข้างาน (เกินนี้ = มาสาย)
window.WORK_END       = '17:30';        // เวลาเลิกงาน
window.WORK_DAYS      = [1,2,3,4,5];    // วันทำงาน (0=อา,1=จ,...,6=ส) → จันทร์–ศุกร์
window.STD_HOURS      = 8;              // ชั่วโมงงานมาตรฐาน/วัน (หักพักเที่ยง 1 ชม. จาก 9 ชม.)
window.LATE_GRACE_MIN = 0;              // ผ่อนผันสาย (นาที) เกินจากนี้ถึงนับว่าสาย

/* โควตาวันลาต่อปี (วัน) ต่อพนักงานหนึ่งคน — ปรับได้ */
window.LEAVE_QUOTA = { vacation: 6, personal: 3, sick: 30 };
