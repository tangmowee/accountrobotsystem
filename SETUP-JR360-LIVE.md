# 📋 คู่มือทำ JR 360 ให้ดึง DL สด (LIVE) — ทำต่อพรุ่งนี้

> เป้าหมาย: ตั้งค่าครั้งเดียว หลังจากนั้น **บัญชีลงต้นทุน DL ในชีต → หน้า JR 360 อัปเดตเอง**
> เวลาที่ใช้: ~5–10 นาที · ทำในเบราว์เซอร์ที่ล็อกอิน **บัญชี Google ของบริษัท**

---

## ✅ เช็กลิสต์ (ทำตามลำดับ)
- [ ] 1. เปิด script.google.com สร้างโปรเจกต์ใหม่
- [ ] 2. เอาโค้ดจากไฟล์ `RSC-JR360-AppsScript.gs` ไปวาง
- [ ] 3. Save
- [ ] 4. Deploy เป็น Web app (Execute as Me / Anyone with link)
- [ ] 5. Authorize (ยืนยันสิทธิ์)
- [ ] 6. คัดลอก Web app URL
- [ ] 7. เปิด URL ทดสอบ → ต้องเห็น JSON
- [ ] 8. ส่ง URL มาให้ Claude → เสียบใส่หน้า JR360 → เสร็จ ✅

---

## จุดสำคัญก่อนเริ่ม ⚠️
- **อย่าทับ Code.gs เดิม** (สคริปต์จัดชีต Summary) — เราสร้าง **โปรเจกต์ใหม่แยก**
- ทำในบัญชี Google ที่**มีสิทธิ์เข้าถึงชีต Project cost summary**

---

## ขั้นที่ 1 — สร้างโปรเจกต์ Apps Script ใหม่
1. เปิดเว็บ **https://script.google.com**
2. มุมซ้ายบน กด **+ New project** (โปรเจกต์ใหม่)
3. จะเจอไฟล์ชื่อ `Code.gs` มีโค้ดตัวอย่าง `function myFunction() {}`
4. (ไม่บังคับ) เปลี่ยนชื่อโปรเจกต์มุมซ้ายบนเป็น **"RSC JR360 API"** เพื่อจำง่าย

## ขั้นที่ 2 — วางโค้ด
1. **ลบโค้ดตัวอย่างทั้งหมด**ในไฟล์ `Code.gs` (Ctrl+A แล้ว Delete)
2. เปิดไฟล์ **`RSC-JR360-AppsScript.gs`** จาก GitHub ของโปรเจกต์นี้
   (branch `claude/online-checkin-checkout-system-tixvv3`) → กดปุ่ม **Copy raw file**
3. วางลงในไฟล์ `Code.gs`
4. > โค้ดตั้งค่า `COST_ID` เป็นไฟล์ "Project cost summary" ให้แล้ว — ไม่ต้องแก้อะไร

## ขั้นที่ 3 — Save
- กดไอคอน 💾 (หรือ Ctrl+S)

## ขั้นที่ 4 — Deploy เป็น Web app
1. มุมขวาบน กด **Deploy** (ปุ่มสีน้ำเงิน) → **New deployment**
2. ข้างคำว่า "Select type" กดรูป **เฟือง ⚙️** → เลือก **Web app**
3. กรอก:
   - **Description:** `RSC JR360` (อะไรก็ได้)
   - **Execute as:** **Me (อีเมลคุณ)**  ← สำคัญ
   - **Who has access:** **Anyone with the link**  ← สำคัญ
4. กด **Deploy**

## ขั้นที่ 5 — Authorize (ยืนยันสิทธิ์ — ทำครั้งแรกครั้งเดียว)
> Google จะถามสิทธิ์ให้สคริปต์อ่านชีต — ปลอดภัย เพราะรันในบัญชีคุณเอง
1. กด **Authorize access**
2. เลือก **บัญชี Google** ของคุณ
3. ถ้าขึ้นหน้า **"Google hasn't verified this app"** → กด **Advanced** (ล่างซ้าย) → กด **Go to RSC JR360 API (unsafe)**
   *(ปกติดี เพราะเป็นสคริปต์ที่คุณสร้างเอง)*
4. กด **Allow** (อนุญาต)

## ขั้นที่ 6 — คัดลอก URL
- หลัง Deploy สำเร็จ จะมีช่อง **Web app URL** หน้าตาแบบนี้:
  ```
  https://script.google.com/macros/s/AKfycb.................../exec
  ```
- กด **Copy** เก็บไว้

## ขั้นที่ 7 — ทดสอบ URL
- เปิด URL นั้นในแท็บใหม่
- ✅ **ถูกต้อง:** เห็นข้อความ JSON เริ่มด้วย
  ```
  {"updated":"2026-...","count":80,"jobs":[{"jr":"JR-23-...","dlB":...,"dlA":...}]}
  ```
- ❌ **ถ้าเห็น error หรือ jobs ว่าง** → คัดลอกข้อความที่เห็นมาส่งให้ Claude ปรับให้

## ขั้นที่ 8 — ส่งให้ Claude
- ส่ง **Web app URL** มาในแชท เช่น "URL คือ https://script.google.com/.../exec"
- Claude จะเสียบใส่หน้า JR360 (`DATA_URL`) แล้ว push
- เปิดหน้า JR 360 → แถบมุมขวาบนจะเปลี่ยนจาก **SNAPSHOT** เป็น **LIVE** 🎉

---

## หลังตั้งเสร็จ — ใช้งานยังไง
- บัญชีลง DL ในชีต → เปิด/รีเฟรชหน้า JR 360 → ตัวเลขอัปเดตตามชีตทันที
- **ไม่ต้องมาแก้โค้ด/บอก Claude อีก** (ต่างจากตอนนี้ที่ต้องบอกให้ดึงมาอัปเดต)

## ถ้าแก้โค้ด/ย้ายคอลัมน์ในชีตภายหลัง
- แก้โค้ดในโปรเจกต์ Apps Script → **Deploy → Manage deployments → (ดินสอ ✏️) Edit → Version: New version → Deploy**
- **URL เดิมใช้ได้ต่อ** ไม่ต้องเปลี่ยน ไม่ต้องส่งใหม่

---

## ปัญหาที่อาจเจอ + วิธีแก้
| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| เปิด URL แล้ว jobs ว่าง `[]` | หา header ไม่เจอ — ส่งภาพหัวตารางในชีตมาให้ Claude ปรับ offset |
| ขึ้น "You do not have permission" | ตอน Deploy ตั้ง **Who has access = Anyone with the link** หรือยัง |
| ขึ้น error สีแดงตอน Run/Deploy | คัดลอกข้อความ error มาส่ง Claude |
| ไม่เห็นปุ่ม Authorize | ปกติ — บาง Google account ผ่านเลย ไปขั้นถัดไปได้ |

---

## ข้อมูลอ้างอิง (สำหรับ Claude)
- ไฟล์โค้ด: `RSC-JR360-AppsScript.gs`
- ชีต DL: Project cost summary (COST_ID = `1f3FpT59tshcS76jsi53_ZpLi8ZZls-9fZV_JdFkF6oU`)
- คอลัมน์: หา `JOB NO.` + `SALES PRICE` → ลูกค้า(+1) โปรเจกต์(+3) สถานะ(+4) ยอดขาย(+6) ต้นทุนจริง(+9) DL งบ(+15) DL จริง(+17)
- ตัวแปรที่ต้องเสียบ: `CONFIG.DATA_URL` ในไฟล์ `public/RSC-JR360.html`
