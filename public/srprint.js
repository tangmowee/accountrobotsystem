/* ============================================================
   RSC Connect — ใบรายงานบริการ: สร้างเอกสารสำหรับดู / พิมพ์ / บันทึก PDF
   ใช้ร่วมกันทั้งแอปพนักงาน (checkin) และหน้า HR (admin)
   ============================================================ */
window.SRPrint = (function () {
  var MO = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
    });
  }
  function thDate(ds) {
    if (!ds) return '—';
    var d = new Date(ds + 'T00:00');
    if (isNaN(d)) return ds;
    return d.getDate() + ' ' + MO[d.getMonth()] + ' ' + (d.getFullYear() + 543);
  }
  function hoursOf(r) {
    var a = (r.timeFrom || '').split(':'), b = (r.timeTo || '').split(':');
    if (a.length < 2 || b.length < 2) return '';
    var m = (+b[0] * 60 + +b[1]) - (+a[0] * 60 + +a[1]) - (+r.breakHrs || 0) * 60;
    return m > 0 ? (m / 60).toFixed(1) : '';
  }
  var LBL = {
    warranty: { yes: 'ในประกัน', no: 'นอกประกัน' },
    pay: { charge: 'คิดเงิน', foc: 'ไม่คิดเงิน (FOC)' },
    status: { completed: 'งานเสร็จสมบูรณ์', followup: 'ต้องตามต่อ' }
  };

  /* โลโก้ Robot System — วาดเป็นเวกเตอร์ (คมทุกขนาด ใช้ได้ทั้งพิมพ์/PDF/อีเมล)
     ใช้ textLength ล็อกความกว้างตัวอักษร วงแหวนส้มจึงตรงตำแหน่งตัว O เสมอ
     แม้เครื่องปลายทางจะมีฟอนต์ต่างกัน */
  var ORANGE = '#E87B1E', DARKINK = '#1A1A18';
  var LOGO_FALLBACK =
    '<svg class="logo" viewBox="0 0 1000 435" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robot System">' +
      '<g fill="none" stroke="' + ORANGE + '" stroke-linecap="round">' +
        '<circle cx="250" cy="78" r="62" stroke-width="27"/>' +
        '<path d="M332 92 L392 110" stroke-width="25"/>' +
        '<path d="M215 140 L182 200" stroke-width="24"/>' +
        '<path d="M192 296 L228 356" stroke-width="21"/>' +
        '<circle cx="252" cy="396" r="33" stroke-width="17"/>' +
      '</g>' +
      '<g font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="152" fill="' + DARKINK + '">' +
        '<text x="6" y="300" font-weight="700" textLength="104" lengthAdjust="spacingAndGlyphs">R</text>' +
        '<text x="222" y="300" font-weight="700" textLength="300" lengthAdjust="spacingAndGlyphs">BOT</text>' +
        '<text x="536" y="300" font-weight="300" textLength="452" lengthAdjust="spacingAndGlyphs">SYSTEM</text>' +
      '</g>' +
      '<circle cx="164" cy="246" r="46" fill="none" stroke="' + ORANGE + '" stroke-width="25"/>' +
    '</svg>';

  function CO() { return window.COMPANY || {}; }
  function logoTag() {
    var c = CO();
    return c.logo ? '<img class="logo" src="' + c.logo + '" alt="' + esc(c.nameEn || 'logo') + '">' : LOGO_FALLBACK;
  }
  /* บรรทัดติดต่อบนหัวกระดาษ — แสดงเฉพาะที่กรอกไว้ */
  function coMeta() {
    var c = CO(), out = [];
    if (c.phone) out.push('โทร ' + c.phone);
    if (c.email) out.push(c.email);
    if (c.web) out.push(c.web);
    return out.map(esc).join(' · ');
  }
  function coSub() {
    var c = CO(), out = [];
    if (c.nameTh) out.push(c.nameTh);
    if (c.address) out.push(c.address);
    if (c.taxId) out.push('เลขประจำตัวผู้เสียภาษี ' + c.taxId);
    return out.map(esc).join(' · ');
  }

  /* ช่องข้อมูลแบบเส้นบาง สองภาษา (ไทย + อังกฤษ) — แน่น อ่านง่าย ดูเป็นทางการ */
  function d(th, en, v, cls) {
    return '<div class="d' + (cls ? ' ' + cls : '') + '">' +
           '<dt>' + esc(th) + (en ? '<em>' + esc(en) + '</em>' : '') + '</dt>' +
           '<dd' + (v ? '' : ' class="empty"') + '>' + (v ? esc(v) : '—') + '</dd></div>';
  }
  function lbl(th, en) {
    return '<div class="lbl"><b>' + esc(th) + '</b><span>' + esc(en) + '</span></div>';
  }

  /* สร้าง HTML ของใบรายงาน (A4 พร้อมพิมพ์) */
  function html(r) {
    r = r || {};
    var parts = (r.parts || []).filter(function (p) { return p && p.name; });
    var photos = r.photos || [];
    var hrs = hoursOf(r);
    var done = r.workStatus === 'completed';

    var partRows = parts.length
      ? parts.map(function (p, i) {
          return '<tr><td class="mono idx">' + (i + 1) + '</td><td>' + esc(p.name) +
                 '</td><td class="num mono">' + esc(p.qty || '') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="3" class="empty-row">ไม่มีการใช้อะไหล่</td></tr>';

    return '<!doctype html><html lang="th"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>' + esc(r.reportNo || 'Service Report') + ' · ' + esc(r.customer || '') + '</title><style>' +
':root{--ink:#0F1317;--ink2:#464E5B;--ink3:#8B93A1;--rule:#DFE3E9;--hair:#EDEFF3;' +
'--brand:#D9600A;--brand-soft:#FCF1E8;--ok:#04704F;--ok-soft:#E6F3EE;--paper:#fff;--ground:#E9EBEF}' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{background:var(--ground);color:var(--ink);font-family:"Noto Sans Thai","Sarabun",system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;' +
'font-size:13.5px;line-height:1.5;padding:22px 12px 56px;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}' +
'.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:.2px}' +

'.bar{max-width:840px;margin:0 auto 16px;display:flex;gap:10px;justify-content:flex-end}' +
'.bar button{font-family:inherit;font-size:14.5px;font-weight:600;padding:11px 22px;border-radius:8px;' +
'border:1px solid var(--rule);background:#fff;color:var(--ink);cursor:pointer}' +
'.bar button.p{background:var(--brand);border-color:var(--brand);color:#fff}' +

'.sheet{max-width:840px;margin:0 auto;background:var(--paper);' +
'box-shadow:0 1px 2px rgba(15,19,23,.06),0 18px 44px -24px rgba(15,19,23,.45);padding:32px 34px 24px}' +

/* letterhead */
'.head{display:flex;justify-content:space-between;align-items:flex-start;gap:30px}' +
'.org{display:flex;gap:14px;align-items:center}' +
'.logo{width:auto;height:34px;max-width:190px;flex:0 0 auto;display:block;object-fit:contain}' +
'.org .name{font-size:16px;font-weight:700;letter-spacing:1.1px;line-height:1.15}' +
'.org .th{font-size:11.5px;color:var(--ink2);margin-top:1px}' +
'.org .meta{font-size:10.5px;color:var(--ink3);margin-top:2px;letter-spacing:.2px}' +
'.docid{text-align:right;flex:0 0 auto}' +
'.docid .kind{font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:var(--ink3);font-weight:600}' +
'.docid .no{font-size:21px;font-weight:700;color:var(--brand);line-height:1.2;margin-top:1px}' +
'.docid .jr{font-size:12.5px;color:var(--ink2);margin-top:1px}' +
'.rule{height:2px;background:var(--ink);margin:10px 0 0}' +
'.rule i{display:block;height:2px;width:88px;background:var(--brand)}' +

'.title{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin:12px 0 14px}' +
'.title h2{font-size:15.5px;font-weight:700;letter-spacing:.2px}' +
'.title h2 em{font-style:normal;font-weight:600;color:var(--ink3);font-size:12px;letter-spacing:1.4px;text-transform:uppercase;margin-left:8px}' +
'.title .sub{font-size:12px;color:var(--ink2);text-align:right;flex:1}' +

/* sections */
'section{margin-top:15px}' +
'.lbl{display:flex;align-items:baseline;gap:8px;margin-bottom:9px}' +
'.lbl b{font-size:11px;font-weight:700;letter-spacing:.6px;color:var(--ink2)}' +
'.lbl span{font-size:9.5px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink3)}' +
'.lbl:after{content:"";flex:1;height:1px;background:var(--rule)}' +

/* hairline data grid — เบา ไม่กินพื้นที่ */
'.dl{display:grid;gap:8px 20px}' +
'.c4{grid-template-columns:repeat(4,1fr)}.c3{grid-template-columns:repeat(3,1fr)}' +
'@media(max-width:640px){.c4,.c3{grid-template-columns:repeat(2,1fr)}}' +
'.d{min-width:0;border-bottom:1px solid var(--hair);padding-bottom:4px}' +
'.d dt{font-size:9.5px;letter-spacing:.5px;color:var(--ink3);font-weight:600;line-height:1.35}' +
'.d dt em{font-style:normal;letter-spacing:1.1px;text-transform:uppercase;opacity:.8;margin-left:5px;font-size:9px}' +
'.d dd{font-size:14px;font-weight:600;margin-top:1px;overflow-wrap:anywhere;line-height:1.4}' +
'.d dd.empty{color:var(--ink3);font-weight:400}' +
'.d.span2{grid-column:span 2}.d.full{grid-column:1/-1}' +
'.d.full dd{font-weight:400;line-height:1.55}' +

/* parts */
'table{width:100%;border-collapse:collapse;font-size:14px}' +
'th{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink3);text-align:left;' +
'font-weight:700;padding:0 10px 6px;border-bottom:1px solid var(--rule)}' +
'td{padding:6px 10px;border-bottom:1px solid var(--hair)}' +
'td.num,th.num{text-align:right}td.idx{color:var(--ink3);width:38px}' +
'tbody tr:last-child td{border-bottom:none}' +
'.empty-row{color:var(--ink3);font-style:italic;text-align:center;padding:10px 0}' +

/* status */
'.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}' +
'.chip{font-size:12px;font-weight:600;padding:4px 11px;border-radius:3px;border:1px solid var(--rule);color:var(--ink2);letter-spacing:.2px}' +
'.chip.on{background:var(--ok-soft);border-color:transparent;color:var(--ok)}' +
'.chip.brand{background:var(--brand-soft);border-color:transparent;color:#A34A05}' +

/* photos */
'.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}' +
'@media(max-width:640px){.photos{grid-template-columns:repeat(2,1fr)}}' +
'.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border:1px solid var(--rule)}' +

/* signatures */
'.sign{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:22px;padding-top:16px;border-top:1px solid var(--rule)}' +
'@media(max-width:640px){.sign{grid-template-columns:1fr;gap:26px}}' +
'.sigpad{height:62px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px;border-bottom:1px solid var(--ink)}' +
'.sigpad img{max-height:58px;max-width:100%}' +
'.sigrole{font-size:9.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink3);font-weight:600;margin-bottom:5px}' +
'.signame{font-size:13.5px;font-weight:600;margin-top:6px}' +
'.sigsub{font-size:11px;color:var(--ink3);margin-top:1px}' +

'.foot{margin-top:20px;padding-top:10px;border-top:1px solid var(--hair);display:flex;justify-content:space-between;' +
'gap:14px;font-size:11px;color:var(--ink3);letter-spacing:.2px}' +

'@media print{@page{size:A4;margin:11mm}body{background:#fff;padding:0}.bar{display:none}' +
'.sheet{box-shadow:none;max-width:none;padding:0}section,.sign{break-inside:avoid}}' +
'</style></head><body>' +

'<div class="bar"><button onclick="window.print()" class="p">🖨️ พิมพ์ / บันทึก PDF</button></div>' +

'<div class="sheet">' +

  '<div class="head">' +
    '<div class="org">' + logoTag() + '<div>' +
      (CO().logo ? '<div class="name">' + esc(CO().nameEn || '') + '</div>' : '') +
      '<div class="th">' + coSub() + '</div>' +
      '<div class="meta">' + coMeta() + '</div>' +
    '</div></div>' +
    '<div class="docid">' +
      '<div class="kind">Service Report</div>' +
      '<div class="no mono">' + esc(r.reportNo || '') + '</div>' +
      '<div class="jr mono">' + esc(r.jobRef || '') + '</div>' +
    '</div>' +
  '</div>' +
  '<div class="rule"><i></i></div>' +

  '<div class="title"><h2>ใบรายงานบริการ<em>Service Report</em></h2>' +
    '<div class="sub">' + esc(r.jobTitle || r.customer || '') + '</div></div>' +

  '<section>' + lbl('ลูกค้าและการเข้าปฏิบัติงาน', 'Customer & Service Visit') + '<div class="dl c4">' +
    d('ลูกค้า', 'Customer', r.customer, 'span2') +
    d('ผู้ติดต่อหน้างาน', 'Contact', r.contact) +
    d('เบอร์ติดต่อ', 'Phone', r.contactPhone) +
    d('อีเมล', 'Email', r.custEmail, 'span2') +
    d('เลขที่งาน', 'Job No.', r.jobRef) +
    d('วันที่', 'Date', thDate(r.date)) +
    d('เวลาเริ่ม – สิ้นสุด', 'Time in – out', (r.timeFrom && r.timeTo) ? (r.timeFrom + ' – ' + r.timeTo) : '') +
    d('หักพัก', 'Break', (+r.breakHrs || 0).toFixed(1) + ' ชม.') +
    d('รวมเวลาปฏิบัติงาน', 'Total hours', hrs ? (hrs + ' ชม.') : '') +
  '</div></section>' +

  '<section>' + lbl('ข้อมูลเครื่อง', 'Equipment') + '<div class="dl c3">' +
    d('รุ่นเครื่อง', 'Model', r.machineModel) + d('หมายเลขเครื่อง', 'Serial', r.serial) +
    d('ชุดควบคุม', 'Controller', r.controller) +
  '</div></section>' +

  '<section>' + lbl('ปัญหาและการแก้ไข', 'Problem & Action Taken') + '<div class="dl">' +
    d('ปัญหาที่พบ', 'Problem found', r.problem, 'full') +
    d('การแก้ไข / งานที่ทำ', 'Action taken', r.performed, 'full') +
  '</div></section>' +

  '<section>' + lbl('อะไหล่ที่ใช้', 'Parts Used') + '<table>' +
    '<thead><tr><th class="idx">#</th><th>รายการ · Description</th><th class="num" style="width:96px">จำนวน · Qty</th></tr></thead>' +
    '<tbody>' + partRows + '</tbody></table></section>' +

  '<section>' + lbl('เงื่อนไขและสถานะงาน', 'Terms & Status') + '<div class="dl c3">' +
    d('การรับประกัน', 'Warranty', LBL.warranty[r.warranty] || '') +
    d('ค่าบริการ', 'Service charge', LBL.pay[r.servicePay] || '') +
    d('ค่าอะไหล่', 'Parts charge', LBL.pay[r.partPay] || '') +
  '</div><div class="chips">' +
    '<span class="chip' + (done ? ' on' : '') + '">' + (done ? '✓ ' : '● ') + esc(LBL.status[r.workStatus] || '—') + '</span>' +
    (r.reason ? '<span class="chip">' + esc(r.reason) + '</span>' : '') +
    '<span class="chip brand">ผู้ปฏิบัติงาน · ' + esc(r.personDisplay || '') + '</span>' +
  '</div></section>' +

  (photos.length ? ('<section>' + lbl('รูปถ่ายหน้างาน', 'Site Photos') + '<div class="photos">' +
      photos.map(function (p) { return '<img src="' + p + '" alt="รูปหน้างาน">'; }).join('') +
    '</div></section>') : '') +

  '<div class="sign">' +
    '<div><div class="sigrole">ลูกค้า / ผู้รับบริการ · Customer</div>' +
      '<div class="sigpad">' + (r.signature ? '<img src="' + r.signature + '" alt="ลายเซ็นลูกค้า">' : '') + '</div>' +
      '<div class="signame">' + (r.contact ? esc(r.contact) : '&nbsp;') + '</div>' +
      '<div class="sigsub">' + esc(r.customer || '') + ' · ' + thDate(r.date) + '</div></div>' +
    '<div><div class="sigrole">ผู้ปฏิบัติงาน · Service Engineer</div>' +
      '<div class="sigpad"></div>' +
      '<div class="signame">' + esc(r.personDisplay || '&nbsp;') + '</div>' +
      '<div class="sigsub">' + esc(CO().nameEn || '') + '</div></div>' +
  '</div>' +

  '<div class="foot"><span>ออกโดยระบบ RSC Connect · Generated by RSC Connect</span>' +
    '<span class="mono">' + esc(r.reportNo || '') + '</span></div>' +
'</div></body></html>';
  }


  /* เปิดใบรายงานในแท็บใหม่ (พิมพ์ / บันทึก PDF ได้) */
  function open_(r) {
    var w = window.open('', '_blank');
    if (!w) { alert('เบราว์เซอร์บล็อกป๊อปอัป — อนุญาตป๊อปอัปแล้วลองใหม่'); return null; }
    w.document.write(html(r)); w.document.close();
    return w;
  }

  /* ดาวน์โหลดเป็นไฟล์ .html (เปิดแล้วสั่งพิมพ์เป็น PDF ได้) */
  function download(r) {
    var blob = new Blob([html(r)], { type: 'text/html;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (r.reportNo || 'service-report') + '.html';
    a.click();
  }

  /* ร่างอีเมลถึง salesadmin + ลูกค้า (เปิดโปรแกรมอีเมลพร้อมเนื้อหา) */
  function mailtoLink(r, salesAdmin) {
    var to = [salesAdmin || '', r.custEmail || ''].filter(Boolean).join(',');
    var subj = 'ใบรายงานบริการ ' + (r.reportNo || '') + ' · ' + (r.customer || '') + (r.jobRef ? (' · ' + r.jobRef) : '');
    var parts = (r.parts || []).filter(function (p) { return p && p.name; })
      .map(function (p) { return '  - ' + p.name + (p.qty ? (' x' + p.qty) : ''); }).join('\n');
    var body = [
      'เรียน ผู้เกี่ยวข้อง',
      '',
      'ใบรายงานบริการ ' + (r.reportNo || ''),
      'ลูกค้า: ' + (r.customer || '') + (r.contact ? (' (' + r.contact + (r.contactPhone ? ' ' + r.contactPhone : '') + ')') : ''),
      'เลขที่งาน: ' + (r.jobRef || '-'),
      'วันที่: ' + thDate(r.date) + '  เวลา ' + (r.timeFrom || '') + '–' + (r.timeTo || '') + '  รวม ' + (hoursOf(r) || '-') + ' ชม.',
      'เครื่อง: ' + [r.machineModel, r.serial, r.controller].filter(Boolean).join(' / '),
      '',
      'ปัญหาที่พบ:',
      r.problem || '-',
      '',
      'การแก้ไข / งานที่ทำ:',
      r.performed || '-',
      '',
      'อะไหล่ที่ใช้:',
      parts || '  - ไม่มี',
      '',
      'สถานะงาน: ' + (LBL.status[r.workStatus] || '-') + (r.reason ? (' (' + r.reason + ')') : ''),
      'การรับประกัน: ' + (LBL.warranty[r.warranty] || '-') +
        '  ค่าบริการ: ' + (LBL.pay[r.servicePay] || '-') +
        '  ค่าอะไหล่: ' + (LBL.pay[r.partPay] || '-'),
      '',
      'ผู้ปฏิบัติงาน: ' + (r.personDisplay || r.personName || ''),
      '',
      '— ส่งจากระบบ RSC Connect (แนบไฟล์ใบรายงานที่ดาวน์โหลดไว้ก่อนส่ง)'
    ].join('\n');
    return 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
  }

  /* ข้อความล้วน (สำรองในเมล) */
  function plain(r) {
    var link = mailtoLink(r, '');
    var q = link.indexOf('&body=');
    return q < 0 ? '' : decodeURIComponent(link.slice(q + 6));
  }

  /* ส่งอีเมลอัตโนมัติผ่าน Apps Script (แนบ PDF) — คืน Promise */
  function sendAuto(r, opts) {
    opts = opts || {};
    var url = opts.url || window.MAILER_URL || '';
    if (!url) return Promise.reject(new Error('ยังไม่ได้ตั้งค่า MAILER_URL'));
    var payload = {
      secret: opts.secret || window.MAILER_SECRET || '',
      reportNo: r.reportNo || '',
      customerEmail: r.custEmail || '',
      subject: 'ใบรายงานบริการ ' + (r.reportNo || '') + ' · ' + (r.customer || '') + (r.jobRef ? (' · ' + r.jobRef) : ''),
      html: html(r),
      text: plain(r)
    };
    // ไม่ตั้ง header เพื่อให้เป็น simple request (เลี่ยง CORS preflight ของ Apps Script)
    return fetch(url, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (res) { return res.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || 'ส่งไม่สำเร็จ');
        return d;
      });
  }

  function autoEnabled() { return !!(window.MAILER_URL || '').trim(); }

  return { html: html, open: open_, download: download, mailtoLink: mailtoLink,
           sendAuto: sendAuto, autoEnabled: autoEnabled, thDate: thDate, hoursOf: hoursOf };
})();
