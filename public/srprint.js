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

  function field(k, v, mono) {
    return '<div class="f"><div class="k">' + esc(k) + '</div><div class="v' + (mono ? ' mono' : '') +
           (v ? '' : ' empty') + '">' + (v ? esc(v) : '—') + '</div></div>';
  }

  /* สร้าง HTML ของใบรายงาน (หน้าเดียว พร้อมพิมพ์ A4) */
  function html(r) {
    r = r || {};
    var parts = (r.parts || []).filter(function (p) { return p && p.name; });
    var photos = r.photos || [];
    var hrs = hoursOf(r);

    var partRows = parts.length
      ? parts.map(function (p, i) {
          return '<tr><td class="mono">' + (i + 1) + '</td><td>' + esc(p.name) +
                 '</td><td class="num mono">' + esc(p.qty || '') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="3" class="empty-row">— ไม่มีการใช้อะไหล่ —</td></tr>';

    return '<!doctype html><html lang="th"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>' + esc(r.reportNo || 'Service Report') + ' · ' + esc(r.customer || '') + '</title><style>' +
':root{--ink:#15181E;--ink2:#4A5261;--ink3:#79808F;--rule:#D9DDE4;--soft:#ECEFF3;--field:#F7F8FA;--brand:#EA6A0B;--ok:#04795B;--okbg:#E4F4EF}' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{background:#EDEFF3;color:var(--ink);font-family:"Noto Sans Thai","Sarabun",system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;font-size:15px;line-height:1.55;padding:24px 14px 60px;-webkit-font-smoothing:antialiased}' +
'.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}' +
'.bar{max-width:820px;margin:0 auto 14px;display:flex;gap:10px;justify-content:flex-end}' +
'.bar button{font-family:inherit;font-size:15px;font-weight:600;padding:11px 20px;border-radius:9px;border:1px solid var(--rule);background:#fff;color:var(--ink);cursor:pointer}' +
'.bar button.p{background:var(--brand);border-color:var(--brand);color:#fff}' +
'.sheet{max-width:820px;margin:0 auto;background:#fff;border-radius:4px;box-shadow:0 1px 2px rgba(20,24,32,.05),0 12px 34px -18px rgba(20,24,32,.35);padding:36px 38px 32px}' +
'.head{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;padding-bottom:15px;border-bottom:2px solid var(--ink)}' +
'.org{display:flex;gap:12px;align-items:flex-start}' +
'.mark{width:32px;height:32px;flex:0 0 32px;background:var(--brand);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}' +
'.org h1{font-size:18px;font-weight:700;letter-spacing:.4px;line-height:1.2}' +
'.org .sub{font-size:12px;color:var(--ink2);margin-top:2px}' +
'.docid{text-align:right}.docid .kind{font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink3)}' +
'.docid .no{font-size:21px;font-weight:700;color:var(--brand);line-height:1.15}.docid .jr{font-size:13px;color:var(--ink2)}' +
'h2{font-size:16px;font-weight:700;margin:16px 0 3px}.dsub{font-size:13px;color:var(--ink2);margin-bottom:18px}' +
'section{margin-top:20px}' +
'.lbl{font-size:10.5px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink3);padding-bottom:6px;border-bottom:1px solid var(--rule);margin-bottom:11px}' +
'.grid{display:grid;gap:10px}.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}' +
'@media(max-width:620px){.g4,.g3{grid-template-columns:1fr 1fr}}' +
'.f{background:var(--field);border:1px solid var(--soft);border-radius:5px;padding:8px 11px}' +
'.f .k{font-size:10.5px;color:var(--ink3)}.f .v{font-size:15px;font-weight:600;margin-top:1px;word-break:break-word}' +
'.f .v.empty{color:var(--ink3);font-weight:400}.f.wide{grid-column:1/-1}.f.free .v{font-weight:400;line-height:1.6}' +
'table{width:100%;border-collapse:collapse;font-size:14px}' +
'th{font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--ink3);text-align:left;font-weight:700;padding:7px 10px;border-bottom:1px solid var(--rule)}' +
'td{padding:9px 10px;border-bottom:1px solid var(--soft)}td.num,th.num{text-align:right}' +
'.empty-row{color:var(--ink3);font-style:italic;text-align:center}' +
'.chips{display:flex;flex-wrap:wrap;gap:8px}' +
'.chip{font-size:13px;font-weight:600;padding:5px 12px;border-radius:20px;border:1px solid var(--rule);color:var(--ink2)}' +
'.chip.on{background:var(--okbg);border-color:transparent;color:var(--ok)}' +
'.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}' +
'@media(max-width:620px){.photos{grid-template-columns:repeat(2,1fr)}}' +
'.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border:1px solid var(--rule);border-radius:5px}' +
'.sign{display:grid;grid-template-columns:1.15fr 1fr;gap:24px;margin-top:24px;padding-top:18px;border-top:1px solid var(--rule)}' +
'@media(max-width:620px){.sign{grid-template-columns:1fr}}' +
'.sigpad{height:92px;border-bottom:1px solid var(--ink);display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px}' +
'.sigpad img{max-height:88px;max-width:100%}' +
'.sigmeta{font-size:12.5px;color:var(--ink2);margin-top:7px;display:flex;justify-content:space-between;gap:10px}.sigmeta b{color:var(--ink)}' +
'.foot{margin-top:24px;padding-top:12px;border-top:1px solid var(--soft);display:flex;justify-content:space-between;gap:12px;font-size:11.5px;color:var(--ink3)}' +
'@media print{@page{size:A4;margin:12mm}body{background:#fff;padding:0}.bar{display:none}.sheet{box-shadow:none;max-width:none;padding:0;border-radius:0}section{break-inside:avoid}}' +
'</style></head><body>' +

'<div class="bar">' +
  '<button onclick="window.print()" class="p">🖨️ พิมพ์ / บันทึก PDF</button>' +
'</div>' +

'<div class="sheet">' +
  '<div class="head"><div class="org"><div class="mark"></div><div>' +
    '<h1>ROBOT SYSTEM CO., LTD.</h1>' +
    '<div class="sub">บริษัท โรบอท ซิสเต็ม จำกัด · service@robotsystem.co.th</div>' +
  '</div></div>' +
  '<div class="docid"><div class="kind">Service Report</div>' +
    '<div class="no mono">' + esc(r.reportNo || '') + '</div>' +
    '<div class="jr mono">' + esc(r.jobRef || '') + '</div></div></div>' +

  '<h2>ใบรายงานบริการ</h2><div class="dsub">' + esc(r.jobTitle || r.customer || '') + '</div>' +

  '<section><div class="lbl">ลูกค้าและการเข้าปฏิบัติงาน</div><div class="grid g4">' +
    field('ลูกค้า', r.customer) +
    field('ผู้ติดต่อหน้างาน', r.contact) +
    field('เบอร์ติดต่อ', r.contactPhone, true) +
    field('อีเมล', r.custEmail) +
    field('วันที่', thDate(r.date), true) +
    field('เวลาเริ่ม–สิ้นสุด', (r.timeFrom && r.timeTo) ? (r.timeFrom + ' – ' + r.timeTo) : '', true) +
    field('หักพัก', (+r.breakHrs || 0).toFixed(1) + ' ชม.', true) +
    field('รวมเวลาปฏิบัติงาน', hrs ? (hrs + ' ชม.') : '', true) +
  '</div></section>' +

  '<section><div class="lbl">ข้อมูลเครื่อง</div><div class="grid g3">' +
    field('รุ่นเครื่อง', r.machineModel) + field('Serial', r.serial, true) + field('Controller', r.controller) +
  '</div></section>' +

  '<section><div class="lbl">ปัญหาและการแก้ไข</div><div class="grid">' +
    '<div class="f free wide"><div class="k">ปัญหาที่พบ</div><div class="v' + (r.problem ? '' : ' empty') + '">' + (r.problem ? esc(r.problem) : '—') + '</div></div>' +
    '<div class="f free wide"><div class="k">การแก้ไข / งานที่ทำ</div><div class="v' + (r.performed ? '' : ' empty') + '">' + (r.performed ? esc(r.performed) : '—') + '</div></div>' +
  '</div></section>' +

  '<section><div class="lbl">อะไหล่ที่ใช้</div><table>' +
    '<thead><tr><th style="width:44px">#</th><th>รายการ</th><th class="num" style="width:90px">จำนวน</th></tr></thead>' +
    '<tbody>' + partRows + '</tbody></table></section>' +

  '<section><div class="lbl">เงื่อนไขและสถานะงาน</div>' +
    '<div class="grid g3" style="margin-bottom:11px">' +
      field('การรับประกัน', LBL.warranty[r.warranty] || '') +
      field('ค่าบริการ', LBL.pay[r.servicePay] || '') +
      field('ค่าอะไหล่', LBL.pay[r.partPay] || '') +
    '</div><div class="chips">' +
      '<span class="chip' + (r.workStatus === 'completed' ? ' on' : '') + '">' +
        (r.workStatus === 'completed' ? '✓ ' : '⏳ ') + esc(LBL.status[r.workStatus] || '—') + '</span>' +
      (r.reason ? '<span class="chip">' + esc(r.reason) + '</span>' : '') +
      '<span class="chip">ผู้ปฏิบัติงาน: ' + esc(r.personDisplay || r.personName || '') + '</span>' +
    '</div></section>' +

  (photos.length ? ('<section><div class="lbl">รูปถ่ายหน้างาน</div><div class="photos">' +
      photos.map(function (p) { return '<img src="' + p + '" alt="รูปหน้างาน">'; }).join('') +
    '</div></section>') : '') +

  '<div class="sign"><div>' +
    '<div class="sigpad">' + (r.signature ? '<img src="' + r.signature + '" alt="ลายเซ็นลูกค้า">' : '') + '</div>' +
    '<div class="sigmeta"><span>ลายเซ็นลูกค้า / ผู้รับบริการ</span><b>' + esc(r.contact || '') + '</b></div>' +
    '<div class="sigmeta"><span>วันที่</span><b class="mono">' + thDate(r.date) + '</b></div>' +
  '</div><div>' +
    '<div class="sigpad"></div>' +
    '<div class="sigmeta"><span>ผู้ปฏิบัติงาน (RSC)</span><b>' + esc(r.personDisplay || '') + '</b></div>' +
    '<div class="sigmeta"><span>รหัสพนักงาน</span><b class="mono">' + esc(r.personName || '') + '</b></div>' +
  '</div></div>' +

  '<div class="foot"><span>RSC Connect · ออกโดยระบบ</span><span class="mono">' + esc(r.reportNo || '') + '</span></div>' +
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

  return { html: html, open: open_, download: download, mailtoLink: mailtoLink, thDate: thDate, hoursOf: hoursOf };
})();
