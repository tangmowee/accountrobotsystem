/* ============================================================
   RSC Check-in — Firebase config (ใช้ร่วมกันทั้งหน้าเว็บและมือถือ)
   วางค่าจาก Firebase Console → Project settings → Web app ที่นี่ "ที่เดียว"
   ถ้าปล่อย apiKey ว่าง = โหมด LOCAL (เก็บในเบราว์เซอร์ ใช้ทดลอง)
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/* รัศมี (เมตร) ที่อนุญาตให้เช็คอินห่างจากพิกัดไซต์งานใน Planner */
window.GEOFENCE_RADIUS_M = 300;
