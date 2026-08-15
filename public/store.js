/* ============================================================
   RSC Connect — ชั้นเก็บข้อมูลแบบ "แยกรายเดือน" (sharded store)
   ------------------------------------------------------------
   ปัญหาเดิม: เก็บทุกเรคคอร์ดไว้ในเอกสารเดียว (rsc/rsc_timelog)
              Firestore จำกัด 1 MB/เอกสาร → ~3 เดือนก็เต็ม และช้าลงเรื่อย ๆ
   วิธีใหม่:  แยกเป็นเดือน  rsc/rsc_timelog_2026-08, _2026-09, ...
              • แต่ละเดือนเล็ก ไม่มีวันชนเพดาน
              • แอปโหลดเฉพาะเดือนที่ใช้ → เร็วขึ้น
              • ข้อมูลเก่ายังดึงได้ (เลือกเดือนในรายงาน)

   ใช้กับคอลเลกชันที่โตเรื่อย ๆ เท่านั้น: rsc_checkin_log, rsc_timelog
   คอลเลกชันอื่น (พนักงาน/รถ/แผนงาน) ขนาดคงที่ → เก็บแบบเดิม

   หมายเหตุการย้ายข้อมูล: ระบบอ่าน "เอกสารเดิม (legacy)" รวมกับรายเดือนเสมอ
   จึงใช้งานต่อได้ทันทีแม้ยังไม่ได้ย้าย · กดย้ายได้ที่หน้า HR
   ============================================================ */
window.RSCStore = (function () {
  var db = null, mode = 'local', state = null, onChange = null;
  var SHARD = {};                 // คอลเลกชันที่แยกรายเดือน
  var parts = {};                 // key -> { '2026-08': [...] }
  var legacy = {};                // key -> [...] (เอกสารเดิมก่อนย้าย)
  var subs = {};                  // key -> { month: unsubscribe }
  var loaded = {};                // key -> { month: true }

  /* บันทึกไม่สำเร็จ → แจ้งผู้ใช้ (ไม่ให้พลาดแบบเงียบ ๆ) */
  function fail(e) {
    console.error(e);
    if (typeof window.toast === 'function') window.toast('❌ บันทึกไม่สำเร็จ: ' + (e && (e.message || e)), true);
  }

  function ym(d) { return d.toISOString().slice(0, 10).slice(0, 7); }
  function todayYM() { return ym(new Date()); }

  /* เดือนของเรคคอร์ด — ใช้ date ถ้ามี ไม่งั้นใช้เวลาเช็คอิน */
  function monthOf(r) {
    var d = (r && (r.date || (r.inTs ? new Date(r.inTs).toISOString().slice(0, 10) : ''))) || '';
    return String(d).slice(0, 7) || todayYM();
  }

  /* n เดือนล่าสุด (รวมเดือนปัจจุบัน) */
  function recentMonths(n) {
    var out = [], now = new Date();
    for (var i = 0; i < n; i++) out.push(ym(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    return out;
  }

  /* รวมทุกเดือนที่โหลด + เอกสารเดิม → state[key] (โค้ดหน้าเว็บใช้เหมือนเดิม) */
  function rebuild(key) {
    var out = [], seen = {}, p = parts[key] || {};
    Object.keys(p).forEach(function (m) {
      (p[m] || []).forEach(function (x) { if (x && !seen[x.id]) { seen[x.id] = 1; out.push(x); } });
    });
    (legacy[key] || []).forEach(function (x) { if (x && !seen[x.id]) { seen[x.id] = 1; out.push(x); } });
    state[key] = out;
  }

  /* ---------- โหมด LOCAL (ทดลอง) ---------- */
  function localLoad(key, m) {
    try { return JSON.parse(localStorage.getItem(key + '_' + m)) || []; } catch (e) { return []; }
  }
  function localLoadLegacy(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  }

  /* ---------- เปิดรับข้อมูลของเดือนหนึ่ง ---------- */
  function ensureMonth(key, m) {
    if (!SHARD[key] || !m) return;
    loaded[key] = loaded[key] || {};
    if (loaded[key][m]) return;
    loaded[key][m] = true;
    parts[key] = parts[key] || {};
    if (mode === 'firebase' && db) {
      subs[key] = subs[key] || {};
      subs[key][m] = db.collection('rsc').doc(key + '_' + m).onSnapshot(function (s) {
        parts[key][m] = (s.exists && s.data().items) || [];
        rebuild(key); onChange && onChange(key);
      }, function (e) { console.error(e); });
    } else {
      parts[key][m] = localLoad(key, m);
      rebuild(key); onChange && onChange(key);
    }
  }

  /* ---------- เริ่มต้น ---------- */
  function init(opt) {
    db = opt.db || null; mode = opt.mode || 'local'; state = opt.state; onChange = opt.onChange || null;
    (opt.sharded || []).forEach(function (k) { SHARD[k] = true; parts[k] = {}; legacy[k] = []; });
    var back = opt.monthsBack == null ? 3 : opt.monthsBack;
    Object.keys(SHARD).forEach(function (key) {
      // เอกสารเดิม (ช่วงเปลี่ยนผ่าน — อ่านรวมไว้เสมอ ข้อมูลไม่หาย)
      if (mode === 'firebase' && db) {
        db.collection('rsc').doc(key).onSnapshot(function (s) {
          legacy[key] = (s.exists && s.data().items) || [];
          rebuild(key); onChange && onChange(key);
        }, function (e) { console.error(e); });
      } else {
        legacy[key] = localLoadLegacy(key);
      }
      recentMonths(back).forEach(function (m) { ensureMonth(key, m); });
      rebuild(key);
    });
  }

  /* ---------- บันทึก ---------- */
  /* จัดกลุ่มตามเดือน แล้วเขียนเฉพาะเดือนที่เกี่ยวข้อง
     เดือนที่ยังไม่ได้โหลด (เช่น ลงเวลาย้อนหลังไกล ๆ) จะอ่านมารวมก่อนเขียน — ข้อมูลเดิมไม่หาย */
  function save(key, arr) {
    state[key] = arr.slice();
    if (!SHARD[key]) {                                   // คอลเลกชันปกติ — เหมือนเดิม
      if (mode === 'firebase' && db) db.collection('rsc').doc(key).set({ items: arr, updatedAt: Date.now() }).catch(fail);
      else localStorage.setItem(key, JSON.stringify(arr));
      return;
    }
    var groups = {};
    arr.forEach(function (r) { var m = monthOf(r); (groups[m] = groups[m] || []).push(r); });

    // เดือนที่ต้องเขียน = เดือนที่มีข้อมูลใหม่ + เดือนที่โหลดอยู่ (เผื่อมีการลบจนว่าง)
    var months = {};
    Object.keys(groups).forEach(function (m) { months[m] = 1; });
    Object.keys(loaded[key] || {}).forEach(function (m) { months[m] = 1; });

    var stillLegacy = (legacy[key] || []).filter(function (x) { return !groups[monthOf(x)] || !groups[monthOf(x)].some(function (y) { return y.id === x.id; }); });

    Object.keys(months).forEach(function (m) {
      var items = groups[m] || [];
      var isLoaded = (loaded[key] || {})[m];
      if (mode === 'firebase' && db) {
        var ref = db.collection('rsc').doc(key + '_' + m);
        if (isLoaded) {
          ref.set({ items: items, updatedAt: Date.now() }).catch(fail);
        } else {
          // ยังไม่ได้โหลดเดือนนี้ → อ่านของเดิมมารวมก่อน (กันข้อมูลเดือนเก่าหาย)
          ref.get().then(function (s) {
            var old = (s.exists && s.data().items) || [];
            var byId = {}; items.forEach(function (x) { byId[x.id] = 1; });
            var merged = old.filter(function (x) { return !byId[x.id]; }).concat(items);
            return ref.set({ items: merged, updatedAt: Date.now() });
          }).catch(fail);
        }
      } else {
        if (isLoaded) localStorage.setItem(key + '_' + m, JSON.stringify(items));
        else {
          var old = localLoad(key, m), byId2 = {};
          items.forEach(function (x) { byId2[x.id] = 1; });
          localStorage.setItem(key + '_' + m, JSON.stringify(old.filter(function (x) { return !byId2[x.id]; }).concat(items)));
        }
      }
      parts[key] = parts[key] || {}; if (isLoaded) parts[key][m] = items;
    });

    // เรคคอร์ดที่ยังอยู่ในเอกสารเดิมและถูกลบไปแล้ว → อัปเดตเอกสารเดิมด้วย
    if ((legacy[key] || []).length !== stillLegacy.length) {
      var keepIds = {}; arr.forEach(function (x) { keepIds[x.id] = 1; });
      var newLegacy = (legacy[key] || []).filter(function (x) { return keepIds[x.id]; });
      if (mode === 'firebase' && db) db.collection('rsc').doc(key).set({ items: newLegacy, updatedAt: Date.now() }).catch(fail);
      else localStorage.setItem(key, JSON.stringify(newLegacy));
    }
  }

  /* ---------- ย้ายข้อมูลเดิม → รายเดือน (กดครั้งเดียวจากหน้า HR) ---------- */
  function migrate(key, cb) {
    var src = (legacy[key] || []).slice();
    if (!src.length) { cb && cb(null, { moved: 0, months: 0 }); return; }
    var groups = {};
    src.forEach(function (r) { var m = monthOf(r); (groups[m] = groups[m] || []).push(r); });
    var ms = Object.keys(groups), done = 0, err = null;
    ms.forEach(function (m) {
      var write = function (existing) {
        var byId = {}; groups[m].forEach(function (x) { byId[x.id] = 1; });
        var merged = existing.filter(function (x) { return !byId[x.id]; }).concat(groups[m]);
        if (mode === 'firebase' && db) {
          return db.collection('rsc').doc(key + '_' + m).set({ items: merged, updatedAt: Date.now() });
        }
        localStorage.setItem(key + '_' + m, JSON.stringify(merged));
        return Promise.resolve();
      };
      var get = (mode === 'firebase' && db)
        ? db.collection('rsc').doc(key + '_' + m).get().then(function (s) { return (s.exists && s.data().items) || []; })
        : Promise.resolve(localLoad(key, m));
      get.then(write).catch(function (e) { err = e; }).then(function () {
        if (++done === ms.length) {
          // เคลียร์เอกสารเดิมเมื่อย้ายครบ
          var fin = function () { cb && cb(err, { moved: src.length, months: ms.length }); };
          if (err) { fin(); return; }
          if (mode === 'firebase' && db) db.collection('rsc').doc(key).set({ items: [], migratedTs: Date.now() }).then(fin).catch(function (e) { err = e; fin(); });
          else { localStorage.setItem(key, JSON.stringify([])); fin(); }
        }
      });
    });
  }

  return { init: init, save: save, ensureMonth: ensureMonth, migrate: migrate,
           isSharded: function (k) { return !!SHARD[k]; }, monthOf: monthOf, recentMonths: recentMonths };
})();
