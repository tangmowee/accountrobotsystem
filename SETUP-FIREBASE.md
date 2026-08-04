# RSC Check-in — การต่อ Firebase (ข้อมูลรวมศูนย์)

ระบบเช็คอิน/เช็คเอาท์ในไฟล์ `index` ทำงานได้ **2 โหมด** อัตโนมัติ:

| โหมด | เงื่อนไข | เก็บข้อมูลที่ไหน | ป้ายมุมขวาบน |
|------|----------|------------------|----------------|
| **LOCAL** | ยังไม่ใส่ Firebase config | localStorage (ในเบราว์เซอร์เครื่องเดียว) | 🟡 `LOCAL` |
| **CLOUD** | ใส่ Firebase config แล้ว | Firestore (รวมศูนย์ + เรียลไทม์ + ล็อกอิน) | 🟢 `CLOUD` |

ตอนนี้ค่าเริ่มต้นคือ **LOCAL** — ใช้ทดลอง/สาธิตได้ทันทีโดยไม่ต้องตั้งค่าอะไร

---

## ต้องย้ายข้อมูลไหม?

**ไม่ต้องครับ** ข้อมูลในโหมด LOCAL ตอนนี้เป็นแค่ข้อมูลตัวอย่าง (demo) ไม่ใช่ของจริง
เมื่อเปิดโหมด CLOUD ระบบจะเริ่มเก็บข้อมูลจริงใหม่บน Firestore เลย
(ถ้าอยากเก็บ demo ไว้ กด **"⬇️ ส่งออก CSV"** ในแท็บเช็คอินก่อนได้)

---

## ขั้นตอนต่อ Firebase (ครั้งเดียว ~10 นาที)

### 1) สร้างโปรเจกต์
1. เข้า https://console.firebase.google.com → **Add project** → ตั้งชื่อ เช่น `rsc-checkin`
2. เมนู **Build → Firestore Database → Create database** → เลือก **Production mode** → ภูมิภาค `asia-southeast1` (สิงคโปร์ ใกล้ไทยสุด)

### 2) เปิดการล็อกอิน
- เมนู **Build → Authentication → Get started → Email/Password → Enable → Save**

### 3) สร้างบัญชีพนักงาน
- แท็บ **Authentication → Users → Add user** → กรอกอีเมล+รหัสผ่านของพนักงานแต่ละคน
  (เช่น `somchai@robotsystem.co.th`)

### 4) เอา config มาใส่ในไฟล์
1. เมนู **Project settings (⚙️) → General → Your apps → Web app (`</>`)** → ตั้งชื่อ → Register
2. คัดลอกค่า `firebaseConfig` ที่ได้ มาวางทับในไฟล์ `index` ตรงบล็อก `FIREBASE_CONFIG`:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "rsc-checkin.firebaseapp.com",
  projectId: "rsc-checkin",
  storageBucket: "rsc-checkin.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

บันทึกไฟล์แล้วเปิดใหม่ → ป้ายมุมขวาบนจะเปลี่ยนเป็น 🟢 `CLOUD` และขึ้นหน้าล็อกอิน

### 5) ตั้ง Security Rules (สำคัญ — กันคนนอกเข้าถึงข้อมูล)
เมนู **Firestore Database → Rules** วางตามนี้แล้ว **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rsc/{doc} {
      allow read, write: if request.auth != null;   // เฉพาะคนที่ล็อกอินแล้ว
    }
  }
}
```

---

## สิ่งที่ได้เพิ่มในโหมด CLOUD
- **ข้อมูลรวมศูนย์** — พนักงานเช็คอินจากมือถือ/คอมเครื่องไหนก็ได้ ข้อมูลไปที่เดียวกัน
- **เรียลไทม์** — ตารางอัปเดตสดข้ามเครื่องทันที (Firestore `onSnapshot`)
- **ล็อกอินพนักงาน** — ต้องล็อกอินก่อนเช็คอิน และชื่อถูกล็อกเป็นบัญชีที่ล็อกอิน (กันเช็คอินแทนกัน)
- **Geofence** — ถ้างานใน Planner มีพิกัดไซต์ ระบบเตือนเมื่อเช็คอินห่างเกิน `GEOFENCE_RADIUS_M` (ค่าเริ่มต้น 300 ม. ปรับได้ในไฟล์)

## หมายเหตุทางเทคนิค
- ใช้ Firestore แบบ 1 เอกสารต่อ 1 คอลเลกชัน (`rsc/rsc_checkin_log`, `rsc/rsc_planner`) เก็บเป็น array
  เพียงพอสำหรับทีมขนาด SME (จำกัด 1 MB/เอกสาร ≈ หลายพันรายการ) หากในอนาคตข้อมูลโตมาก
  ค่อยปรับเป็น 1 เอกสารต่อ 1 รายการได้
- Firebase free tier (Spark plan) เพียงพอสำหรับการใช้งานปกติของบริษัท
