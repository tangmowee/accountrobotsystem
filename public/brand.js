/* ============================================================
   RSC Connect — โลโก้บริษัท (ใช้ร่วมทุกหน้า แก้ที่ไฟล์นี้ที่เดียว)
   ------------------------------------------------------------
   • ถ้าใส่ไฟล์โลโก้จริงไว้ที่ COMPANY.logo (data URI หรือ URL) จะใช้ไฟล์นั้น
   • ถ้าไม่ใส่ ระบบวาดโลโก้เป็นเวกเตอร์ให้ — คมทุกขนาด ไม่ต้องโหลดไฟล์
   ============================================================ */
window.RSCBrand = (function () {
  var ORANGE = '#E87B1E';

  /* เครื่องหมายจุดเชื่อม (ใช้เป็นไอคอนสี่เหลี่ยม เช่น หน้าล็อกอิน/ไอคอนแอป) */
  function mark(size, onDark) {
    var s = size || 34;
    return '<svg viewBox="0 0 120 120" width="' + s + '" height="' + s + '" fill="none" aria-label="Robot System">' +
      '<g stroke="' + ORANGE + '" stroke-linecap="round">' +
        '<circle cx="42" cy="26" r="15" stroke-width="7"/>' +
        '<path d="M62 32 L78 37" stroke-width="7"/>' +
        '<path d="M36 41 L28 57" stroke-width="6.5"/>' +
        '<path d="M30 79 L38 94" stroke-width="6"/>' +
        '<circle cx="44" cy="103" r="9" stroke-width="5"/>' +
        '<circle cx="24" cy="68" r="13" stroke-width="7"/>' +
      '</g></svg>';
  }

  /* เวิร์ดมาร์กเต็ม "ROBOTSYSTEM" — ล็อกความกว้างตัวอักษรด้วย textLength
     วงแหวนส้มจึงตรงตำแหน่งตัว O เสมอ แม้ปลายทางมีฟอนต์ต่างกัน */
  function wordmark(height, onDark) {
    var h = height || 30;
    var ink = onDark ? '#FFFFFF' : '#1A1A18';
    return '<svg viewBox="0 0 1000 435" height="' + h + '" width="' + Math.round(h * 1000 / 435) +
        '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robot System" style="display:block">' +
      '<g fill="none" stroke="' + ORANGE + '" stroke-linecap="round">' +
        '<circle cx="250" cy="78" r="62" stroke-width="27"/>' +
        '<path d="M332 92 L392 110" stroke-width="25"/>' +
        '<path d="M215 140 L182 200" stroke-width="24"/>' +
        '<path d="M192 296 L228 356" stroke-width="21"/>' +
        '<circle cx="252" cy="396" r="33" stroke-width="17"/>' +
      '</g>' +
      '<g font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="152" fill="' + ink + '">' +
        '<text x="6" y="300" font-weight="700" textLength="104" lengthAdjust="spacingAndGlyphs">R</text>' +
        '<text x="222" y="300" font-weight="700" textLength="300" lengthAdjust="spacingAndGlyphs">BOT</text>' +
        '<text x="536" y="300" font-weight="300" textLength="452" lengthAdjust="spacingAndGlyphs">SYSTEM</text>' +
      '</g>' +
      '<circle cx="164" cy="246" r="46" fill="none" stroke="' + ORANGE + '" stroke-width="25"/>' +
    '</svg>';
  }

  function customLogo() { return (window.COMPANY || {}).logo || ''; }

  /* โลโก้สำหรับหัวเว็บ — ใช้ไฟล์จริงถ้ามี */
  function header(height, onDark) {
    var h = height || 30, url = customLogo();
    if (url) return '<img src="' + url + '" alt="Robot System" style="height:' + h + 'px;width:auto;max-width:190px;object-fit:contain;display:block">';
    return wordmark(h, onDark);
  }
  /* ไอคอนสี่เหลี่ยม (ล็อกอิน ฯลฯ) */
  function badge(size) {
    var url = customLogo();
    if (url) return '<img src="' + url + '" alt="Robot System" style="height:' + (size || 34) + 'px;width:auto;object-fit:contain">';
    return mark(size);
  }

  /* วางโลโก้ลงทุกจุดที่มี data-brand ในหน้า */
  function mount() {
    document.querySelectorAll('[data-brand]').forEach(function (el) {
      var kind = el.getAttribute('data-brand');
      var h = +el.getAttribute('data-brand-size') || (kind === 'badge' ? 34 : 30);
      var dark = el.getAttribute('data-brand-dark') === '1';
      el.innerHTML = (kind === 'badge') ? badge(h) : header(h, dark);
    });
  }

  return { header: header, badge: badge, wordmark: wordmark, mark: mark, mount: mount };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.RSCBrand.mount);
else window.RSCBrand.mount();
