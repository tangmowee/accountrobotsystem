/* ============================================================
   RSC Connect — ชุดไอคอนเส้น (แทนการใช้อีโมจิ)
   ใช้: RSCIcon.get('clock', 22)  หรือใส่ data-icon="clock" ใน HTML
   สืบสีจากข้อความ (currentColor) จึงเปลี่ยนสีตามที่วางได้เอง
   ============================================================ */
window.RSCIcon = (function () {
  var P = {
    clock:      '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>',
    briefcase:  '<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 12.5h18"/>',
    calendar:   '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    receipt:    '<path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6V3z"/><path d="M9.5 8h5M9.5 12h5"/>',
    sun:        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    grid:       '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    bell:       '<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
    home:       '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/>',
    users:      '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.4c2.1.7 3.5 2.5 3.5 5.1"/>',
    file:       '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3z"/><path d="M13.5 3v5.5H19M8.5 13h7M8.5 17h5"/>',
    moon:       '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    cash:       '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 10v4M18 10v4"/>',
    car:        '<path d="M4.5 16.5V19a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-1.5M15 17.5V19a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-2.5"/><path d="M3.5 16.5h17v-4l-2-5H5.5l-2 5v4z"/><path d="M6.5 13.5h2M15.5 13.5h2"/>',
    pin:        '<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    check:      '<path d="M4.5 12.5 9.5 17.5 19.5 7"/>',
    x:          '<path d="M6 6l12 12M18 6L6 18"/>',
    alert:      '<path d="M12 3.5 21.5 20h-19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    stop:       '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    play:       '<circle cx="12" cy="12" r="9"/><path d="M10.5 8.8 15.5 12l-5 3.2V8.8z"/>',
    send:       '<path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z"/>',
    download:   '<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
    printer:    '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    zap:        '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
    wallet:     '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1"/><rect x="3" y="7.5" width="18" height="12" rx="2.5"/><circle cx="16.5" cy="13.5" r="1.2"/>',
    building:   '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-2.5h4V21"/>',
    factory:    '<path d="M3 21V10l6 4V10l6 4V6h6v15z"/><path d="M8 17h2M14 17h2"/>',
    folder:     '<path d="M3 7.5A2 2 0 0 1 5 5.5h3.6a2 2 0 0 1 1.5.7l1.2 1.3H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    user:       '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    phone:      '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
    chat:       '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-2.9-.4L3 21l1.6-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/>',
    mail:       '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    satellite:  '<circle cx="12" cy="12" r="3"/><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5M12 2a10 10 0 0 1 10 10"/><path d="M9 15 4.5 19.5M6.8 12.5 3 8.7l3.7-3.7 3.8 3.8"/>',
    edit:       '<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20z"/>',
    chevronL:   '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chevronR:   '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    plus:       '<path d="M12 5v14M5 12h14"/>',
    trash:      '<path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/><path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7"/>',
    refresh:    '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3.5V9h-5.5"/>',
    chart:      '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };
  function get(name, size, sw) {
    var p = P[name]; if (!p) return '';
    var s = size || 22;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="' + (sw || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" ' +
      'style="display:block;flex:0 0 auto" aria-hidden="true">' + p + '</svg>';
  }
  function mount(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      var sz = +(el.getAttribute('data-size') || el.getAttribute('data-icon-size')) || 22;
      var sw = +(el.getAttribute('data-sw') || el.getAttribute('data-icon-w')) || 1.7;
      var key = el.getAttribute('data-icon') + '|' + sz + '|' + sw;
      if (el.getAttribute('data-icon-done') === key) return;   // วาดแล้ว — กันลูปกับ MutationObserver
      el.setAttribute('data-icon-done', key);
      el.innerHTML = get(el.getAttribute('data-icon'), sz, sw);
    });
  }
  function autoMount(){
    mount();
    if (window.MutationObserver) {
      var t = null;
      new MutationObserver(function(){ clearTimeout(t); t = setTimeout(function(){ mount(); }, 40); })
        .observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  else autoMount();
  return { get: get, mount: mount, names: Object.keys(P) };
})();
