# Project Cost Control — หน้าเว็บของ projectcostctrl-robotsystem.netlify.app

`index.html` คือซอร์สของหน้า dashboard (ไฟล์เดียวจบ ดึงข้อมูลสดจาก Google Sheet ผ่าน GVIZ)

## Deploy
ลาก **โฟลเดอร์นี้** (หรือเฉพาะ `index.html`) ไปวางที่ Netlify → Deploys → drag & drop
ข้อมูลไม่ได้อยู่ในไฟล์ ทุกอย่างดึงสดจาก Google Sheet ตอนเปิดหน้า จึงต้อง login Google
ในเบราว์เซอร์ที่เปิดหน้านี้

## ฟีเจอร์ที่เพิ่มเข้ามา (ส.ค. 2569)

### 1. แยก "โปรเจกต์" ออกจากงาน Service / Spare part / Engineering fee
- ระบบเดาประเภทของแต่ละ job จากชื่องาน: `PROJECT` / `SERVICE` / `SPARE PART` /
  `ENG FEE` / `PRICE ADD` / `SALES`
- ปุ่มสลับบน nav: **โปรเจกต์ / ทุกงาน** — มีผลกับทุกหน้า (KPI, กราฟ, ตาราง, Alerts,
  Top Performers) ไม่ใช่แค่หน้า One-page
- ปุ่ม **⚙ ประเภทงาน** เปิดตารางให้ตรวจและกำหนดประเภทเองรายงาน
  (บันทึกลง localStorage คีย์ `proj_dash_v1` เหมือน override อื่น ๆ)
- กติกาเสริม (ปิดไว้เป็นค่าเริ่มต้น): งานมูลค่าต่ำกว่า X บาท ที่ไม่มีงบและงวดงาน
  → นับเป็นงานขาย

### 2. โหมดพรีเซนต์ (หน้า One-page)
- ปุ่ม **▶ โหมดพรีเซนต์** — ซ่อน nav/toolbar, ขยายตัวอักษร, ตารางเต็มความกว้างจอ,
  เข้า fullscreen อัตโนมัติ, ออกด้วย `Esc`
- ปุ่ม **🖨 พิมพ์ / PDF** สำหรับ export

### 3. อื่น ๆ
- กราฟ re-render ได้เมื่อสลับโหมด (destroy chart เดิมก่อนสร้างใหม่)
- ถ้าโหลด Chart.js ไม่ได้ (ออฟไลน์) หน้าอื่นยังทำงานปกติ ไม่พังทั้งหน้า
