/* ============================================================
   RSC Connect — โลโก้บริษัท (ใช้ร่วมทุกหน้า แก้ที่ไฟล์นี้ที่เดียว)
   ------------------------------------------------------------
   • ถ้าใส่ไฟล์โลโก้จริงไว้ที่ COMPANY.logo (data URI หรือ URL) จะใช้ไฟล์นั้น
   • ถ้าไม่ใส่ ระบบวาดโลโก้เป็นเวกเตอร์ให้ — คมทุกขนาด ไม่ต้องโหลดไฟล์
   ============================================================ */
window.RSCBrand = (function () {
  var ORANGE = '#E8801E';

  /* สัญลักษณ์อย่างเดียว (ไอคอนแอป / หน้าล็อกอิน) */
  function mark(size, onDark) {
    var s = size || 34;
    return '<svg viewBox="0 0 620 900" width="' + Math.round(s * 620 / 900) + '" height="' + s +
        '" xmlns="http://www.w3.org/2000/svg" fill="none" role="img" aria-label="Robot System" style="display:block">' +
      '<g stroke="' + ORANGE + '">' +
        '<circle cx="290" cy="172" r="97" stroke-width="42"/>' +
        '<path d="M428 180 L528 204" stroke-width="34"/>' +
        '<path d="M233 288 L171 420" stroke-width="34"/>' +
        '<circle cx="115" cy="533" r="78" stroke-width="46"/>' +
        '<path d="M161 640 L225 716" stroke-width="34"/>' +
        '<circle cx="268" cy="793" r="48" stroke-width="24"/>' +
      '</g></svg>';
  }

  /* เวิร์ดมาร์กเต็ม "ROBOTSYSTEM" — วาดตามโลโก้จริงของบริษัท
     ล็อกความกว้างตัวอักษรด้วย textLength วงแหวนส้มจึงตรงตำแหน่งตัว O เสมอทุกเครื่อง */
  function wordmark(height, onDark) {
    var h = height || 30;
    var ink = onDark ? '#FFFFFF' : '#1D1B19';
    return '<svg viewBox="0 0 2000 880" height="' + h + '" width="' + Math.round(h * 2000 / 880) +
        '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robot System" style="display:block">' +
      '<g fill="none" stroke="' + ORANGE + '">' +
        '<circle cx="527" cy="172" r="97" stroke-width="42"/>' +
        '<path d="M665 180 L765 204" stroke-width="34"/>' +
        '<path d="M470 288 L408 420" stroke-width="34"/>' +
        '<path d="M398 640 L462 716" stroke-width="34"/>' +
        '<circle cx="505" cy="793" r="48" stroke-width="24"/>' +
      '</g>' +
      '<g font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="235" fill="' + ink + '">' +
        '<text x="105" y="610" font-weight="700" textLength="157" lengthAdjust="spacingAndGlyphs">R</text>' +
        '<text x="442" y="610" font-weight="700" textLength="508" lengthAdjust="spacingAndGlyphs">BOT</text>' +
        '<text x="990" y="610" font-weight="400" textLength="905" lengthAdjust="spacingAndGlyphs">SYSTEM</text>' +
      '</g>' +
      '<circle cx="352" cy="533" r="78" fill="none" stroke="' + ORANGE + '" stroke-width="46"/>' +
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
