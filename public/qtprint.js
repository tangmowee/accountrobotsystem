/* ============================================================
   RSC Connect — ใบเสนอราคา: สร้างเอกสาร A4 สำหรับดู / พิมพ์ / บันทึก PDF
   วางตามแบบฟอร์มบริษัท FM-SM-01 Rev.00 15/08/2566
   (หัวกระดาษ + หัวตารางซ้ำทุกหน้า · เลขฟอร์มอยู่ท้ายทุกหน้า)
   ============================================================ */
window.QTPrint = (function () {

  function esc(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
    });
  }
  /* วันที่บนใบเสนอราคาใช้ ค.ศ. แบบ dd/mm/yyyy — ตรงกับใบที่ออกจริง */
  function dmy(ds) {
    if (!ds) return '';
    var p = String(ds).split('-');
    if (p.length !== 3) return ds;
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function num(n) {
    n = +n || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function CO() { return window.COMPANY || {}; }
  function FORM() { return window.QT_FORM_CODE || 'FM-SM-01'; }

  /* แตกหมายเหตุของบรรทัดเป็นบูลเล็ตย่อย (ขึ้นบรรทัดใหม่ = 1 บูลเล็ต) */
  function bullets(remark) {
    var lines = String(remark || '').split(/\r?\n/).map(function (x) {
      return x.replace(/^[-•\s]+/, '').trim();
    }).filter(Boolean);
    if (!lines.length) return '';
    return '<ul class="sub">' + lines.map(function (x) {
      return '<li>' + esc(x) + '</li>';
    }).join('') + '</ul>';
  }

  /* ยอดของบรรทัด — ถ้ามีรายการย่อย ให้รวมจากย่อยขึ้นมา */
  function lineAmount(it) {
    var subs = it.subs || [];
    if (subs.length) {
      return subs.reduce(function (s, x) { return s + (+x.qty || 0) * (+x.price || 0); }, 0);
    }
    return (+it.qty || 0) * (+it.price || 0);
  }
  function lineUnitPrice(it) {
    var q = +it.qty || 0;
    if ((it.subs || []).length) return q ? lineAmount(it) / q : lineAmount(it);
    return +it.price || 0;
  }

  /* ยอดรวมทั้งใบ — ใช้ทั้งตอนพิมพ์และตอนโชว์ในหน้าจอ (คิดที่เดียว ไม่ให้เพี้ยน) */
  function totals(q) {
    q = q || {};
    var items = (q.items || []).filter(function (x) { return x && x.rowType !== 'group'; });
    var sub = items.reduce(function (s, it) { return s + lineAmount(it); }, 0);
    var cost = items.reduce(function (s, it) {
      var subs = it.subs || [];
      if (subs.length) return s + subs.reduce(function (a, x) { return a + (+x.qty || 0) * (+x.cost || 0); }, 0);
      return s + (+it.qty || 0) * (+it.cost || 0);
    }, 0);
    var disc = +q.discount || 0;
    var net = Math.max(0, sub - disc);
    var vatRate = (window.QT_TERMS || {}).vatRate == null ? 7 : (window.QT_TERMS || {}).vatRate;
    var vat = q.hasVat === false ? 0 : net * vatRate / 100;
    return {
      cost: cost, sub: sub, discount: disc, net: net,
      vatRate: vatRate, vat: vat, grand: net + vat,
      gp: net - cost, gpPct: net ? (net - cost) / net * 100 : 0
    };
  }

  /* หัวกระดาษบริษัท — เวลาพิมพ์ถูกตรึงไว้ในขอบบน จึงซ้ำทุกหน้าเหมือนใบจริง */
  function letterhead() {
    var c = CO();
    var contact = ['Tel. ' + (c.phone || ''), c.fax ? ('Fax. ' + c.fax) : '', c.taxId ? ('Tax ID: ' + c.taxId) : '']
      .filter(Boolean).map(esc).join('  ');
    return '<div class="lh">' +
      '<div class="lh-logo">' + logoSvg(c) + '</div>' +
      '<div class="lh-txt">' +
        '<b>' + esc(c.nameEn || '') + '</b>' +
        '<span>' + esc(c.addressEn || c.address || '') + '</span>' +
        '<span>' + contact + '</span>' +
      '</div></div>';
  }
  function logoSvg(c) {
    if (c.logo) return '<img src="' + c.logo + '" alt="logo">';
    return '<svg viewBox="0 0 2000 880" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robot System">' +
      '<g fill="none" stroke="#E8801E">' +
        '<circle cx="527" cy="172" r="97" stroke-width="42"/>' +
        '<path d="M665 180 L765 204" stroke-width="34"/>' +
        '<path d="M470 288 L408 420" stroke-width="34"/>' +
        '<path d="M398 640 L462 716" stroke-width="34"/>' +
        '<circle cx="505" cy="793" r="48" stroke-width="24"/>' +
      '</g>' +
      '<g font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="235" fill="#1D1B19">' +
        '<text x="105" y="610" font-weight="700" textLength="157" lengthAdjust="spacingAndGlyphs">R</text>' +
        '<text x="442" y="610" font-weight="700" textLength="508" lengthAdjust="spacingAndGlyphs">BOT</text>' +
        '<text x="990" y="610" font-weight="400" textLength="905" lengthAdjust="spacingAndGlyphs">SYSTEM</text>' +
      '</g>' +
      '<circle cx="352" cy="533" r="78" fill="none" stroke="#E8801E" stroke-width="46"/></svg>';
  }

  /* แถวรายการในตาราง — รองรับหัวข้อกลุ่ม, รายการย่อย และโหมด "ราคารวมก้อนเดียว" */
  function itemRows(q) {
    var showEach = String(q.priceMode || '1') === '1';
    var out = [], n = 0;
    (q.items || []).forEach(function (it) {
      if (!it || it.hidePdf) return;
      if (it.rowType === 'group') {
        if (!it.name) return;
        out.push('<tr class="grp"><td colspan="6">' + esc(it.name) + '</td></tr>');
        return;
      }
      if (!it.name) return;
      n++;
      var desc = '<b>' + esc(it.name) + '</b>' + (it.partno ? '<div class="pn">Part No. ' + esc(it.partno) + '</div>' : '') + bullets(it.remark);
      (it.subs || []).forEach(function (s) {
        if (!s || !s.name) return;
        desc += '<div class="subline">- ' + esc(s.name) + (s.qty ? ' x' + esc(s.qty) : '') + '</div>';
      });
      out.push('<tr>' +
        '<td class="c">' + n + '</td>' +
        '<td>' + desc + '</td>' +
        '<td class="c">' + esc(it.qty || '') + '</td>' +
        '<td class="c">' + esc(it.unit || '') + '</td>' +
        '<td class="r">' + (showEach ? num(lineUnitPrice(it)) : '') + '</td>' +
        '<td class="r">' + (showEach ? num(lineAmount(it)) : '') + '</td>' +
      '</tr>');
    });
    if (!showEach) {
      /* เสนอเป็นราคาเหมารวม — แสดงรายการไว้ให้ลูกค้าเห็น แต่คิดเงินเป็นก้อนเดียว */
      var t = totals(q), pq = +q.projectQty || 1;
      out.push('<tr class="lump">' +
        '<td class="c"></td><td><b>' + esc(q.project || 'Project') + '</b></td>' +
        '<td class="c">' + esc(q.projectQty || 1) + '</td>' +
        '<td class="c">' + esc(q.projectUnit || 'LOT') + '</td>' +
        '<td class="r">' + num(pq ? t.sub / pq : t.sub) + '</td>' +
        '<td class="r">' + num(t.sub) + '</td></tr>');
    }
    if (!out.length) out.push('<tr><td colspan="6" class="c dim">— ยังไม่มีรายการ —</td></tr>');
    return out.join('');
  }

  function condRow(label, value) {
    if (!value) return '';
    return '<div class="cd"><span>' + esc(label) + '</span><b>: ' + esc(value) + '</b></div>';
  }

  /* งวดชำระเงิน → ข้อความบรรทัดเดียวแบบใบจริง: 1) 40% … (Credit 15 days), 2) 50% … */
  function payText(q) {
    var rows = (q.payTerms || []).filter(function (p) { return p && (p.pct || p.desc); });
    if (!rows.length) return q.cond && q.cond.payment ? q.cond.payment : '';
    return rows.map(function (p, i) {
      return (i + 1) + ') ' + (p.pct ? p.pct + '% ' : '') + (p.desc || '') +
             (p.credit ? ' (Credit ' + p.credit + ' days)' : '');
    }).join(', ');
  }

  /* สร้าง HTML ของใบเสนอราคา (A4 พร้อมพิมพ์) */
  function html(q) {
    q = q || {};
    var c = CO(), t = totals(q), cust = q.cust || {}, sig = q.sig || {}, cond = q.cond || {};
    var cur = q.currency || 'THB';
    var attn = [cust.contact ? 'Attn: ' + cust.contact : '', cust.phone ? 'Tel: ' + cust.phone : '',
                cust.mobile ? 'Mobile: ' + cust.mobile : '', cust.email ? 'E-mail: ' + cust.email : '']
                .filter(Boolean).map(esc).join('  ');

    return '<!doctype html><html lang="th"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>' + esc(q.no || 'Quotation') + ' · ' + esc(cust.name || '') + '</title><style>' +
'@page{size:A4;margin:12mm 10mm 12mm}' +
':root{--ink:#111418;--ink2:#454c57;--dim:#8a919c;--rule:#c9ced6;--hair:#e6e9ee;--brand:#D9600A;--tint:#f4f6f9}' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{background:#e9ebef;color:var(--ink);font-family:"Noto Sans Thai","Sarabun",system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;' +
'font-size:11.5px;line-height:1.45;padding:20px 10px 60px;-webkit-font-smoothing:antialiased}' +

'.bar{max-width:820px;margin:0 auto 14px;display:flex;gap:10px;justify-content:flex-end}' +
'.bar button{font-family:inherit;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;' +
'border:1px solid var(--rule);background:#fff;color:var(--ink);cursor:pointer}' +
'.bar button.p{background:var(--brand);border-color:var(--brand);color:#fff}' +

'.sheet{max-width:820px;margin:0 auto;background:#fff;padding:26px 28px 34px;' +
'box-shadow:0 1px 2px rgba(0,0,0,.06),0 18px 44px -24px rgba(0,0,0,.45)}' +

/* หัวกระดาษ */
'table.page{width:100%;border-collapse:collapse}' +
'table.page>thead>tr>th,table.page>tfoot>tr>td,table.page>tbody>tr>td{border:none;padding:0;text-align:left;font-weight:400;background:none}' +
'.lh{display:flex;gap:12px;align-items:center;padding-bottom:7px;border-bottom:1.5px solid var(--ink);margin-bottom:8px;background:#fff}' +
'.lh-logo svg,.lh-logo img{height:30px;width:auto;max-width:170px;display:block}' +
'.lh-txt{display:flex;flex-direction:column;line-height:1.3}' +
'.lh-txt b{font-size:13px;letter-spacing:.4px}' +
'.lh-txt span{font-size:9.5px;color:var(--ink2)}' +

/* หัวเรื่อง เลขที่ใบ วันที่ */
'.title{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:2px 0 8px}' +
'.title h1{font-size:17px;letter-spacing:1.5px;font-weight:700}' +
'.title .th{font-size:11px;color:var(--ink2);font-weight:400;letter-spacing:0}' +
'.meta{text-align:right;font-size:11px;line-height:1.6}' +
'.meta b{font-size:14px;color:var(--brand);letter-spacing:.5px}' +

/* กล่องลูกค้า */
'.to{border:1px solid var(--rule);padding:7px 9px;margin-bottom:8px}' +
'.to .k{font-size:9.5px;color:var(--dim);letter-spacing:.4px}' +
'.to .nm{font-weight:700;font-size:12.5px}' +
'.to .ad{color:var(--ink2)}' +
'.to .at{margin-top:2px;font-size:10.5px}' +

/* ตารางรายการ */
'table.doc{width:100%;border-collapse:collapse;table-layout:fixed}' +
'table.doc thead th{background:var(--tint);border:1px solid var(--rule);padding:5px 6px;font-size:10px;' +
'font-weight:700;text-align:center}' +
'table.doc td{border:1px solid var(--rule);padding:5px 6px;vertical-align:top}' +
'table.doc td.c{text-align:center}table.doc td.r{text-align:right;font-variant-numeric:tabular-nums}' +
'table.doc tr.proj td{background:#fdf3ea;font-weight:700;letter-spacing:.3px}' +
'table.doc tr.grp td{background:var(--tint);font-weight:700}' +
'table.doc tr.lump td{background:#fdf3ea;font-weight:700}' +
'.pn{font-size:10px;color:var(--ink2)}' +
'ul.sub{margin:2px 0 0 14px;padding:0}' +
'ul.sub li{font-size:10.5px;color:var(--ink2);line-height:1.4}' +
'.subline{font-size:10.5px;color:var(--ink2);margin-left:8px}' +
'.dim{color:var(--dim)}' +

/* ท้ายตาราง: หมายเหตุ + ยอดรวม */
'.tail{display:flex;gap:12px;margin-top:8px;align-items:flex-start}' +
'.remark{flex:1;border:1px solid var(--rule);padding:6px 8px;min-height:70px}' +
'.remark .k{font-size:9.5px;color:var(--dim);letter-spacing:.4px;margin-bottom:2px}' +
'.remark li{margin-left:14px;font-size:10.5px;color:var(--ink2)}' +
'.sum{width:270px;flex:0 0 auto}' +
'.sum div{display:flex;justify-content:space-between;gap:10px;padding:3.5px 8px;border:1px solid var(--rule);border-top:none;font-variant-numeric:tabular-nums}' +
'.sum div:first-child{border-top:1px solid var(--rule)}' +
'.sum div.g{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:700;font-size:12.5px}' +
'.sum span{color:var(--ink2)}.sum div.g span{color:#fff}' +
'.sum b{font-weight:600}' +

/* ผู้ขาย + เงื่อนไข */
'.sp{margin-top:8px;font-size:10.5px}' +
'.conds{margin-top:8px;border:1px solid var(--rule);padding:7px 9px}' +
'.cd{display:flex;gap:6px;font-size:10.5px;line-height:1.55}' +
'.cd span{flex:0 0 110px;color:var(--ink2)}' +
'.cd b{font-weight:500}' +

/* ลายเซ็น */
'.sign{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px;text-align:center;page-break-inside:avoid}' +
'.sign .hd{font-size:10.5px;color:var(--ink2);margin-bottom:2px}' +
'.sign .co{font-size:10px;font-weight:700;letter-spacing:.3px;min-height:14px}' +
'.sign .pad{height:44px;border-bottom:1px solid var(--ink);margin:2px 6px 4px}' +
'.sign .nm{font-weight:600;min-height:15px}' +
'.sign .ro{font-size:10px;color:var(--ink2)}' +
'.sign .blank{font-size:10.5px;text-align:left;margin-top:6px;color:var(--ink2);line-height:2}' +

/* เลขฟอร์มท้ายทุกหน้า */
'.formcode{padding-top:8px;text-align:center;font-size:9px;color:var(--dim);letter-spacing:.4px}' +

'@media print{body{background:#fff;padding:0;font-size:10.5px}.bar{display:none}' +
'.sheet{box-shadow:none;max-width:none;padding:0}' +
'table.page>thead{display:table-header-group}table.page>tfoot{display:table-footer-group}' +
'table.doc thead{display:table-header-group}tr{page-break-inside:avoid}}' +
'</style></head><body>' +

'<div class="bar">' +
  '<button onclick="window.print()" class="p">พิมพ์ / บันทึก PDF</button>' +
  '<button onclick="window.close()">ปิด</button>' +
'</div>' +

'<div class="sheet">' +

  '<table class="page"><thead><tr><th>' + letterhead() + '</th></tr></thead>' +
  '<tfoot><tr><td><div class="formcode">' + esc(FORM()) + '</div></td></tr></tfoot>' +
  '<tbody><tr><td>' +

  '<div class="title">' +
    '<div><h1>QUOTATION</h1><div class="th">ใบเสนอราคา</div></div>' +
    '<div class="meta"><b>' + esc(q.no || '') + '</b><br>' +
      'Date ' + esc(dmy(q.date)) + '<br>Valid Until ' + esc(dmy(q.valid)) + '</div>' +
  '</div>' +
  '<div class="to">' +
    '<div class="k">เรียน / To</div>' +
    '<div class="nm">' + esc(cust.name || '') + '</div>' +
    (cust.addr ? '<div class="ad">' + esc(cust.addr) + '</div>' : '') +
    (attn ? '<div class="at">' + attn + '</div>' : '') +
  '</div>' +

  '<table class="doc"><thead><tr>' +
      '<th style="width:32px">No.</th><th>Description</th>' +
      '<th style="width:46px">Qty</th><th style="width:50px">Unit</th>' +
      '<th style="width:92px">Unit Price (' + esc(cur) + ')</th>' +
      '<th style="width:100px">Amount (' + esc(cur) + ')</th>' +
  '</tr></thead><tbody>' +
    (q.project ? '<tr class="proj"><td colspan="6">PROJECT : ' + esc(q.project) + '</td></tr>' : '') +
    itemRows(q) +
  '</tbody></table>' +

  '<div class="tail">' +
    '<div class="remark"><div class="k">Remark</div>' +
      (q.footerNote ? '<ul>' + String(q.footerNote).split(/\r?\n/).filter(Boolean)
        .map(function (x) { return '<li>' + esc(x.replace(/^[-•\s]+/, '')) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="sp">Sales Person : <b>' + esc(q.sales || '') + '</b>' +
        (q.salesEmail ? '<br>E-mail : ' + esc(q.salesEmail) : '') + '</div>' +
    '</div>' +
    '<div class="sum">' +
      '<div><span>Total</span><b>' + num(t.sub) + '</b></div>' +
      (t.discount ? '<div><span>Discount</span><b>' + num(t.discount) + '</b></div>' +
                    '<div><span>Total after discount</span><b>' + num(t.net) + '</b></div>' : '') +
      (t.vat ? '<div><span>Vat ' + t.vatRate + '%</span><b>' + num(t.vat) + '</b></div>' : '') +
      '<div class="g"><span>Grand Total (' + esc(cur) + ')</span><b>' + num(t.grand) + '</b></div>' +
    '</div>' +
  '</div>' +

  '<div class="conds">' +
    condRow('Noted', cond.noted) +
    condRow('End User', cond.enduser) +
    condRow('Term of Delivery', cond.delivery) +
    condRow('Late Payment', cond.latepay) +
    condRow('Term of Payment', payText(q)) +
  '</div>' +

  '<div class="sign">' +
    '<div><div class="hd">Accepted &amp; Confirmed by</div><div class="co">&nbsp;</div>' +
      '<div class="pad"></div><div class="nm">&nbsp;</div><div class="ro">(Customer)</div>' +
      '<div class="blank">Name : ____________________<br>Date&nbsp; : ____________________</div></div>' +
    '<div><div class="hd">&nbsp;</div><div class="co">' + esc(c.nameEn || '') + '</div>' +
      '<div class="pad"></div><div class="nm">' + esc(sig.engineerName || '') + '</div>' +
      '<div class="ro">(' + esc(sig.engineerTitle || 'Sale Engineer') + ')</div></div>' +
    '<div><div class="hd">&nbsp;</div><div class="co">' + esc(c.nameEn || '') + '</div>' +
      '<div class="pad"></div><div class="nm">' + esc(sig.managerName || '') + '</div>' +
      '<div class="ro">(' + esc(sig.managerTitle || 'Manager Sale Department') + ')</div></div>' +
  '</div>' +

  '</td></tr></tbody></table>' +
'</div>' +
'</body></html>';
  }

  /* เปิดใบเสนอราคาในแท็บใหม่ (พิมพ์ / บันทึก PDF ได้) */
  function open_(q) {
    var w = window.open('', '_blank');
    if (!w) { alert('เบราว์เซอร์บล็อกป๊อปอัป — อนุญาตป๊อปอัปแล้วลองใหม่'); return null; }
    w.document.write(html(q)); w.document.close();
    return w;
  }

  /* ดาวน์โหลดเป็นไฟล์ .html (เปิดแล้วสั่งพิมพ์เป็น PDF ได้) */
  function download(q) {
    var blob = new Blob([html(q)], { type: 'text/html;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (q.no || 'quotation') + '.html';
    a.click();
  }

  return { html: html, open: open_, download: download, totals: totals, lineAmount: lineAmount, num: num };
})();
