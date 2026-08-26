#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เพิ่มหัวข้อ 7-9 (On-time Delivery / Pending PO / Top Supplier) เข้ารายงาน v2 -> v3"""
import json, sys, re

SRC, OUT = 'Procurement_Report_JanJul_2026_v2.html', 'Procurement_Report_JanJul_2026_v3.html'
h = open(SRC, encoding='utf-8').read()
P = json.load(open('data/payload.json'))
applied = []

def rep(old, new, label, count=1):
    global h
    n = h.count(old)
    if n != count:
        sys.exit(f'PATCH2 FAIL [{label}]: expected {count}, found {n}')
    h = h.replace(old, new, count)
    applied.append(label)

M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
MTH = dict(zip(M, ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.']))
nf = lambda v: f'{v:,.0f}'
BK = ['ตรงกำหนด (Ontime)', 'ล่าช้า 1–3 วัน', 'ล่าช้า 4–7 วัน', 'ล่าช้า 8–14 วัน', 'ล่าช้ามากกว่า 14 วัน']

otd, cs = P['otd'], P['csKpi']
pend = P['pending']
conc = {int(k): v for k, v in P['conc'].items()}   # JSON คืน key เป็น string
T26 = 57299097.82                 # ยอดตามรายงาน (ฐานเดียวกับหัวข้อ 1-6)
TOI = P['supTotal']               # ผลรวมรายการ PO รายบรรทัด (ฐานของหัวข้อ 9)
GAP = TOI - T26
WUXI = next(x for x in P['topSup'] if 'Wuxi' in x['s'])
PEND_TOT = pend['Jun']['missValue'] + pend['Jul']['missValue']
OTHER_PEND = PEND_TOT - WUXI['v']    # ค้างส่งที่ไม่ใช่โครงการแบ่งงวด

# ================================================================ SECTION 7-9
def bucket_rows(m):
    b = P['buckets'][m]
    out = []
    for k in BK:
        c, v = b['rows'][k]
        if not c:
            continue
        cls = 'pos' if k.startswith('ตรง') else 'neg'
        out.append(f'<tr><td>{k}</td><td class="{cls}">{c}</td><td>{c/b["items"]*100:.1f}%</td>'
                   f'<td>{nf(v)}</td><td>{v/b["value"]*100:.1f}%</td></tr>')
    out.append(f'<tr class="total"><td>รวม</td><td>{b["items"]}</td><td>100%</td>'
               f'<td>{nf(b["value"])}</td><td>100%</td></tr>')
    return ''.join(out)

late_rows = ''.join(
    f'<tr><td>{i}</td><td style="text-align:left;">{x["s"]}</td><td>{x["m"]}</td><td>{x["n"]}</td>'
    f'<td class="neg">{x["avg"]}</td><td class="neg">{x["worst"]}</td><td>{nf(x["v"])}</td></tr>'
    for i, x in enumerate(P['lateSup'], 1))

sup_rows = ''.join(
    f'<tr><td>{i}</td><td style="text-align:left;">{x["s"]}</td>'
    f'<td style="text-align:left;font-size:11.5px;color:var(--text-dim);">{x["g"]}</td>'
    f'<td>{"🌏 " + x["o"] if x["o"]=="ต่างประเทศ" else x["o"]}</td>'
    f'<td>{x["n"]}</td><td style="font-size:11px;">{x["m"]}</td>'
    f'<td>{nf(x["v"])}</td><td>{x["v"]/TOI*100:.1f}%</td><td>{P["pareto"][i-1]}%</td></tr>'
    for i, x in enumerate(P['topSup'], 1))

def pend_rows(m):
    return ''.join(
        f'<tr><td>{x["po"]}</td><td style="text-align:left;">{x["s"]}</td>'
        f'<td style="text-align:left;font-size:11.5px;color:var(--text-dim);">{x["g"]}</td>'
        f'<td>{nf(x["v"])}</td></tr>' for x in pend[m]['top'])

otd_kpi_cls = 'green' if otd['totPct'] >= otd['target'] else ''
sections = f'''
<!-- SECTION 7 : ON-TIME DELIVERY -->
<div class="sec">
  <div class="sec-title"><div class="num">7</div><h2>On-time Delivery <span class="en">(ความตรงต่อเวลาในการส่งมอบของผู้ขาย)</span></h2></div>

  <div class="kpis" style="margin-bottom:16px;">
    <div class="kpi {otd_kpi_cls}"><div class="lbl">OTD สะสม Jan–Jul 2026</div><div class="val">{otd['totPct']:.2f}%</div>
      <div class="chg pos">▲ ผ่านเป้า {otd['target']:.0f}% ทุกเดือน</div></div>
    <div class="kpi"><div class="lbl">PO Item ที่รับของแล้ว</div><div class="val">{nf(otd['totPo'])}</div>
      <div class="chg dim">ตรงกำหนด {nf(otd['totOn'])} รายการ · ล่าช้า {nf(otd['totPo']-otd['totOn'])} รายการ</div></div>
    <div class="kpi"><div class="lbl">เดือนที่ดีที่สุด / แย่ที่สุด</div><div class="val">{max(otd['pct']):.1f}% / {min(otd['pct']):.1f}%</div>
      <div class="chg dim">{MTH[M[otd['pct'].index(max(otd['pct']))]]} ดีที่สุด · {MTH[M[otd['pct'].index(min(otd['pct']))]]} ต่ำสุด</div></div>
    <div class="kpi"><div class="lbl">Lead Time เฉลี่ย (PO → รับของ)</div><div class="val">{P['buckets']['Jul']['leadAvg']:.1f} วัน</div>
      <div class="chg dim">ก.ค. · ค่ากลาง {P['buckets']['Jul']['leadMed']:.0f} วัน | มิ.ย. เฉลี่ย {P['buckets']['Jun']['leadAvg']:.1f} วัน</div></div>
  </div>

  <div class="grid2">
    <div class="card">
      <h3>% Delivery on time รายเดือน <small>(เทียบเป้าหมาย {otd['target']:.0f}%)</small></h3>
      <div class="chart-box"><canvas id="chOTD"></canvas></div>
      <div class="note">ที่มา: KPI-PURCHASING ข้อ 1 (แบบประเมินวัดผลวัตถุประสงค์ – เป้าหมายคุณภาพ) — ผ่านเป้าทุกเดือน จุดต่ำสุดคือ ก.พ. {min(otd['pct']):.1f}% ซึ่งเป็นเดือนที่มี PO มากที่สุด ({nf(max(otd['po']))} รายการ)</div>
    </div>
    <div class="card">
      <h3>จำนวน PO Item เทียบ % ตรงเวลา <small>(ปริมาณงานกับคุณภาพการส่งมอบ)</small></h3>
      <div class="chart-box"><canvas id="chOTDvol"></canvas></div>
      <div class="note">เดือนที่ปริมาณ PO สูง (ก.พ. {nf(otd['po'][1])} · มี.ค. {nf(otd['po'][2])}) มี % ตรงเวลาต่ำที่สุด — เป็นความสัมพันธ์ที่ควรอธิบายในที่ประชุม</div>
    </div>
  </div>

  <div class="grid2-even" style="margin-top:16px;">
    <div class="card">
      <h3>แยกระดับความล่าช้า — มิ.ย. 2026 <small>(รูปแบบเดียวกับรายงาน TN)</small></h3>
      <table><thead><tr><th>ระดับ</th><th>จำนวน</th><th>%</th><th>มูลค่า (฿)</th><th>% มูลค่า</th></tr></thead>
      <tbody>{bucket_rows('Jun')}</tbody></table>
    </div>
    <div class="card">
      <h3>แยกระดับความล่าช้า — ก.ค. 2026</h3>
      <table><thead><tr><th>ระดับ</th><th>จำนวน</th><th>%</th><th>มูลค่า (฿)</th><th>% มูลค่า</th></tr></thead>
      <tbody>{bucket_rows('Jul')}</tbody></table>
      <div class="note">ก.ค. แม้ % ตรงเวลาสูงถึง {otd['pct'][6]:.1f}% แต่ <b>มูลค่าที่ล่าช้าคิดเป็น {(P['buckets']['Jul']['value']-P['buckets']['Jul']['rows'][BK[0]][1])/P['buckets']['Jul']['value']*100:.1f}% ของมูลค่ารับเข้า</b> เพราะรายการที่ช้าเป็นของมูลค่าสูง — นับจำนวนอย่างเดียวจะมองไม่เห็น</div>
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <h3>ผู้ขายที่ส่งล่าช้า <small>(มิ.ย.–ก.ค. 2026 · เรียงตามมูลค่าที่ล่าช้า)</small></h3>
    <table>
      <thead><tr><th>#</th><th style="text-align:left;">ผู้ขาย</th><th>เดือน</th><th>จำนวนรายการ</th><th>เฉลี่ย (วัน)</th><th>ช้าสุด (วัน)</th><th>มูลค่าที่ล่าช้า (฿)</th></tr></thead>
      <tbody>{late_rows}</tbody>
    </table>
    <div class="note">
      <b>ยาสกาว่า อิเล็คทริก</b> เป็นรายที่กระทบมากที่สุด — {P['lateSup'][0]['n']} รายการ มูลค่า ฿{nf(P['lateSup'][0]['v'])} เฉลี่ยช้า {abs(P['lateSup'][0]['avg']):.1f} วัน และช้าสุดถึง {abs(P['lateSup'][0]['worst'])} วัน<br>
      <span class="todo">⚠ ยังไม่มีในข้อมูล:</span> <b>สาเหตุของความล่าช้าแต่ละรายการ</b> (ผลิตล่าช้า / เรือดีเลย์ / ปัญหาคุณภาพ / รอ Confirm สเปค) และ <b>ผลกระทบต่อแผนงาน</b> —
      รายงาน TN แยกสาเหตุเป็นหมวดและระบุผลกระทบต่อแผนผลิตทุกรายการ ควรเพิ่มคอลัมน์นี้ในไฟล์ Data Delivery
    </div>
  </div>
</div>

<!-- SECTION 8 : PENDING PO -->
<div class="sec">
  <div class="sec-title"><div class="num">8</div><h2>Pending PO / งานค้างส่ง <span class="en">(PO ที่ออกแล้วแต่ยังไม่พบรายการรับของ — แยกงานแบ่งงวดออกจากงานค้างจริง)</span></h2></div>

  <div class="kpis" style="margin-bottom:16px;">
    <div class="kpi"><div class="lbl">ยังไม่รับของ มิ.ย.–ก.ค. (รวม)</div><div class="val">฿{PEND_TOT/1e6:.2f}M</div>
      <div class="chg dim">{pend['Jun']['missCount']+pend['Jul']['missCount']} ใบ PO จากทั้งหมด {pend['Jun']['poCount']+pend['Jul']['poCount']} ใบ</div></div>
    <div class="kpi green"><div class="lbl">โครงการแบ่งงวด (ตามแผน)</div><div class="val">฿{WUXI['v']/1e6:.2f}M</div>
      <div class="chg pos">✔ Wuxi Yashitle · จ่ายตามงวด Back-to-Back</div></div>
    <div class="kpi" style="border-left-color:var(--yellow);"><div class="lbl">ค้างส่งที่ต้องติดตาม</div><div class="val">฿{OTHER_PEND/1e6:.2f}M</div>
      <div class="chg dim">{pend['Jun']['missCount']+pend['Jul']['missCount']-2} ใบ PO (ไม่รวมโครงการแบ่งงวด)</div></div>
    <div class="kpi"><div class="lbl">% ยังไม่รับของ (ไม่รวมโครงการ)</div><div class="val">{OTHER_PEND/(pend['Jun']['poValue']+pend['Jul']['poValue']-WUXI['v'])*100:.1f}%</div>
      <div class="chg dim">฿{nf(OTHER_PEND)} จาก ฿{nf(pend['Jun']['poValue']+pend['Jul']['poValue']-WUXI['v'])}</div></div>
  </div>

  <div class="dnote" style="border-left-color:var(--green);">
    <h4 style="color:var(--green-soft);">✔ โครงการ ฿{WUXI['v']/1e6:.2f}M — โครงสร้างการจ่ายเงินบริหารความเสี่ยงไว้แล้ว</h4>
    <ul>
      <li><b>เป็นงานแบ่งจ่ายหลายงวด ไม่ใช่จ่ายก้อนเดียวใน 15 วัน</b> — ปัจจุบัน<b>จ่ายเพียงเงินมัดจำ</b>
          ส่วนที่เหลือทยอยจ่ายตามงวดงาน</li>
      <li><b>เงื่อนไขเป็นแบบ Back-to-Back</b> — บริษัทจ่ายผู้ขายก็ต่อเมื่อ<b>ได้รับเงินจากลูกค้าแล้ว</b>
          จึงไม่เกิดภาระกระแสเงินสดจากโครงการนี้</li>
      <li>เครดิต 15 วันในระบบ <b>นับจากวันที่ Invoice</b> และ Invoice จะออกตามงวด —
          ไม่ใช่ทั้ง ฿{WUXI['v']/1e6:.1f}M ครบกำหนดพร้อมกัน</li>
      <li>ดังนั้นการที่ยังไม่ปรากฏรายการรับของในเดือน มิ.ย.–ก.ค. <b>เป็นไปตามแผนของงานแบ่งงวด ไม่ใช่ผู้ขายส่งล่าช้า</b>
          — รายการนี้จึงไม่ถูกนับรวมในสถิติ On-time Delivery ข้อ 7</li>
    </ul>
    <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);color:var(--text-dim);">
      <b style="color:var(--orange);">สิ่งที่ยังต้องระวัง (คนละเรื่องกับกระแสเงินสด):</b><br>
      1. <b>ยอดซื้อ ฿{nf(WUXI['v'])} ถูกบันทึกเต็มจำนวนในเดือน มิ.ย.</b> ทั้งที่จ่ายจริงแค่มัดจำและของยังไม่เข้า —
         เป็นเหตุผลที่ยอดรวมโต +180.8% และเป็นเหตุผลที่ต้องดูตัวเลข "ตัดโครงการออก" คู่กันเสมอ<br>
      2. <b>ความเสี่ยงย้ายไปอยู่ฝั่งลูกค้า</b> — ถ้าลูกค้าจ่ายช้า เราจะจ่ายผู้ขายช้าตาม อาจกระทบกำหนดส่งมอบและความสัมพันธ์กับผู้ขาย
         ควรมีตารางเทียบ <b>งวดรับเงินลูกค้า vs งวดจ่ายผู้ขาย</b> ประกอบ<br>
      3. <b>ข้อมูลในระบบระบุเครดิตเป็น "15 วัน" ซึ่งไม่สะท้อนเงื่อนไขจริง</b> (แบ่งงวด + Back-to-Back)
         ทำให้การคำนวณเครดิตเฉลี่ยถ่วงน้ำหนักในข้อ 2 ต่ำกว่าความเป็นจริง — ดูหมายเหตุในข้อ 2<br>
      <span class="todo">⚠ ตัวเลขที่ยังต้องเติม:</span> จำนวนเงินมัดจำที่จ่ายไปแล้ว · จำนวนงวด · กำหนดแต่ละงวด
    </div>
    <div style="margin-top:10px;color:var(--text-dim);font-size:12.5px;">
      หมายเหตุวิธีคำนวณ: เทียบเลขที่ PO ที่ออกเดือน มิ.ย.–ก.ค. กับรายการรับของเดือน มิ.ย.–ก.ค.
      ยังไม่มีข้อมูลรับของเดือน ส.ค. จึงอาจมีบางรายการรับเข้าแล้วในเดือน ส.ค. — ควรยืนยันกับคลัง
    </div>
  </div>

  <div class="grid2-even">
    <div class="card">
      <h3>PO ค้างส่ง — ออกเดือน มิ.ย. 2026 <small>(สูงสุด 10 อันดับ)</small></h3>
      <table><thead><tr><th>PO No.</th><th style="text-align:left;">ผู้ขาย</th><th style="text-align:left;">กลุ่มสินค้า</th><th>มูลค่า (฿)</th></tr></thead>
      <tbody>{pend_rows('Jun')}</tbody></table>
    </div>
    <div class="card">
      <h3>PO ค้างส่ง — ออกเดือน ก.ค. 2026 <small>(สูงสุด 10 อันดับ)</small></h3>
      <table><thead><tr><th>PO No.</th><th style="text-align:left;">ผู้ขาย</th><th style="text-align:left;">กลุ่มสินค้า</th><th>มูลค่า (฿)</th></tr></thead>
      <tbody>{pend_rows('Jul')}</tbody></table>
    </div>
  </div>
</div>

<!-- SECTION 9 : TOP SUPPLIER -->
<div class="sec">
  <div class="sec-title"><div class="num">9</div><h2>Top Supplier &amp; การกระจุกตัว <span class="en">(Supplier Concentration — ฐาน PO ที่ออก Jan–Jul 2026)</span></h2></div>

  <div class="kpis" style="margin-bottom:16px;">
    <div class="kpi" style="border-left-color:var(--red);"><div class="lbl">ผู้ขายรายใหญ่สุด</div><div class="val">{conc[1]}%</div>
      <div class="chg neg">Wuxi Yashitle ฿{WUXI['v']/1e6:.1f}M จาก PO 2 ใบ เดือนเดียว</div></div>
    <div class="kpi"><div class="lbl">Top 5 รวมกัน</div><div class="val">{conc[5]}%</div>
      <div class="chg dim">Top 3 = {conc[3]}% · Top 10 = {conc[10]}% · Top 20 = {conc[20]}%</div></div>
    <div class="kpi"><div class="lbl">จำนวนผู้ขายทั้งหมด</div><div class="val">{P['supCount']} ราย</div>
      <div class="chg dim">แต่ {conc[10]}% ของยอดซื้อมาจาก 10 รายแรก</div></div>
    <div class="kpi"><div class="lbl">สัดส่วนต่างประเทศ (ประมาณการ)</div><div class="val">{P['origin']['ต่างประเทศ']/TOI*100:.1f}%</div>
      <div class="chg dim">฿{P['origin']['ต่างประเทศ']/1e6:.2f}M · ในประเทศ ฿{P['origin']['ในประเทศ']/1e6:.2f}M <span class="todo">⚠ ต้องยืนยัน</span></div></div>
  </div>

  <div class="grid2">
    <div class="card">
      <h3>Pareto — การกระจุกตัวของผู้ขาย <small>(30 รายแรก)</small></h3>
      <div class="chart-box"><canvas id="chPareto"></canvas></div>
      <div class="note">ผู้ขายเพียง 5 รายจาก {P['supCount']} ราย คิดเป็น {conc[5]}% ของยอดซื้อ — เป็นความเสี่ยงด้าน Supply ที่ผู้บริหาร TN คุ้นกับการเห็น (รายงาน AP ของ TN แสดง Top Vendor 20 อันดับทั้งในและต่างประเทศ)</div>
    </div>
    <div class="card">
      <h3>สัดส่วนในประเทศ / ต่างประเทศ <small>(ประมาณการจากชื่อผู้ขาย)</small></h3>
      <div class="chart-box" style="height:200px;"><canvas id="chOrigin"></canvas></div>
      <div class="note"><span class="todo">⚠ ตัวเลขประมาณการ:</span> จำแนกจากชื่อผู้ขาย (ชื่อไทย/มีคำว่า Thailand = ในประเทศ) เพราะไฟล์ต้นทางไม่มีคอลัมน์ประเทศ —
        ควรเพิ่มคอลัมน์ <b>ประเทศ</b> และ <b>สกุลเงิน</b> ในไฟล์ต้นทาง เพื่อทำรายงานความเสี่ยงค่าเงินแบบที่ TN ทำ</div>
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <h3>Top 20 Supplier <small>(Jan–Jul 2026 · ฐาน PO ที่ออก · รูปแบบเดียวกับ Top Vendor Report ของ TN)</small></h3>
    <table>
      <thead><tr><th>#</th><th style="text-align:left;">ผู้ขาย</th><th style="text-align:left;">กลุ่มสินค้าหลัก</th><th>แหล่ง</th><th>รายการ</th><th>เดือนที่ซื้อ</th><th>มูลค่า (฿)</th><th>% Share</th><th>สะสม</th></tr></thead>
      <tbody>{sup_rows}</tbody>
    </table>
    <div class="note">
      <span class="todo">⚠ ยังขาดเทียบกับรายงาน TN:</span> คอลัมน์ <b>Payment Terms</b> และ <b>ยอดปี 2025 เทียบปีต่อปี</b> ซึ่ง Top Vendor Report ของ TN มีครบ —
      ต้องขอข้อมูลเครดิตเทอมรายผู้ขายและยอดซื้อปี 2025 แยกรายผู้ขายเพิ่ม
    </div>
  </div>
</div>
'''
rep('<!-- SECTION 6 : EXECUTIVE SUMMARY -->', sections + '\n<!-- SECTION 6 : EXECUTIVE SUMMARY -->',
    'add-sections-7-8-9')

# ย้าย Executive Summary ให้เป็นข้อ 10 (อยู่ท้ายสุดตามเดิม)
rep('<div class="sec-title"><div class="num">6</div><h2>Executive Summary',
    '<div class="sec-title"><div class="num">10</div><h2>Executive Summary', 'renumber-exec')

# ================================================================ กราฟใหม่
charts = f'''

/* ===================== หัวข้อ 7–9: OTD / Pareto / Origin ===================== */
const OTD = {json.dumps(otd)};
const PARETO = {json.dumps(P['pareto'])};
const SUPTOP = {json.dumps([x['s'] for x in P['topSup']], ensure_ascii=False)};

/* 7a) % OTD รายเดือน + เส้นเป้าหมาย */
new Chart(chOTD,{{data:{{labels:M5,datasets:[
  {{type:'bar',label:'% Delivery on time',data:OTD.pct,backgroundColor:OTD.pct.map(v=>v>=OTD.target?'#4CAF50':'#E05A5A'),borderRadius:4,order:2}},
  {{type:'line',label:'เป้าหมาย '+OTD.target+'%',data:M5.map(()=>OTD.target),borderColor:'#F2C14E',borderDash:[6,4],pointRadius:0,borderWidth:2,order:1}}
]}},options:{{responsive:true,maintainAspectRatio:false,
  plugins:{{legend:{{position:'top'}},tooltip:{{callbacks:{{label:c=>c.datasetIndex===0
    ? ` ตรงเวลา ${{c.parsed.y.toFixed(2)}}%  (${{OTD.ontime[c.dataIndex]}}/${{OTD.po[c.dataIndex]}} รายการ)`
    : ` เป้าหมาย ${{OTD.target}}%`}}}}}},
  scales:{{x:{{grid:{{display:false}}}},y:{{min:80,max:100,grid:{{color:'#2E2E2E'}},ticks:{{callback:v=>v+'%'}}}}}}}}}});

/* 7b) ปริมาณ PO เทียบ % ตรงเวลา (สองแกน) */
new Chart(chOTDvol,{{data:{{labels:M5,datasets:[
  {{type:'bar',label:'PO Item (รายการ)',data:OTD.po,backgroundColor:'#4F8EF7',borderRadius:4,yAxisID:'y'}},
  {{type:'line',label:'% ตรงเวลา',data:OTD.pct,borderColor:'#FF7A2F',backgroundColor:'rgba(255,122,47,.12)',tension:.3,pointRadius:4,yAxisID:'y1'}}
]}},options:{{responsive:true,maintainAspectRatio:false,
  plugins:{{legend:{{position:'top'}}}},
  scales:{{x:{{grid:{{display:false}}}},
    y:{{position:'left',grid:{{color:'#2E2E2E'}},title:{{display:true,text:'จำนวน PO Item'}}}},
    y1:{{position:'right',min:85,max:100,grid:{{display:false}},ticks:{{callback:v=>v+'%'}}}}}}}}}});

/* 9a) Pareto การกระจุกตัวของผู้ขาย */
new Chart(chPareto,{{data:{{labels:PARETO.map((_,i)=>'#'+(i+1)),datasets:[
  {{type:'line',label:'% สะสม',data:PARETO,borderColor:'#FF7A2F',backgroundColor:'rgba(255,122,47,.14)',fill:true,tension:.25,pointRadius:3}},
  {{type:'line',label:'เส้น 80%',data:PARETO.map(()=>80),borderColor:'#F2C14E',borderDash:[6,4],pointRadius:0,borderWidth:2}}
]}},options:{{responsive:true,maintainAspectRatio:false,
  plugins:{{legend:{{position:'top'}},tooltip:{{callbacks:{{title:c=>'ผู้ขายอันดับ 1–'+(c[0].dataIndex+1),
    label:c=>c.datasetIndex===0 ? ` รวม ${{c.parsed.y.toFixed(1)}}% ของยอดซื้อ` + (SUPTOP[c.dataIndex]?` · อันดับนี้: ${{SUPTOP[c.dataIndex]}}`:'') : ''}}}}}},
  scales:{{x:{{grid:{{display:false}}}},y:{{max:100,grid:{{color:'#2E2E2E'}},ticks:{{callback:v=>v+'%'}}}}}}}}}});

/* 9b) ในประเทศ / ต่างประเทศ */
new Chart(chOrigin,{{type:'bar',data:{{labels:['Jan–Jul 2026'],datasets:[
  {{label:'ในประเทศ',data:[{P['origin']['ในประเทศ']/TOI*100:.2f}],backgroundColor:'#4CAF50',stack:'o',borderRadius:2}},
  {{label:'ต่างประเทศ',data:[{P['origin']['ต่างประเทศ']/TOI*100:.2f}],backgroundColor:'#4F8EF7',stack:'o',borderRadius:2}}
]}},options:{{indexAxis:'y',responsive:true,maintainAspectRatio:false,
  plugins:{{legend:{{position:'bottom'}},tooltip:{{callbacks:{{label:c=>` ${{c.dataset.label}}: ${{c.parsed.x.toFixed(1)}}%`}}}}}},
  scales:{{x:{{stacked:true,max:100,grid:{{color:'#2E2E2E'}},ticks:{{callback:v=>v+'%'}}}},y:{{stacked:true,grid:{{display:false}}}}}}}}}});
'''
rep("/* ===================== โหมดสว่าง / พิมพ์ ===================== */",
    charts + "\n/* ===================== โหมดสว่าง / พิมพ์ ===================== */",
    'add-charts-7-9')

# ================================================================ อัปเดตสรุป / หมายเหตุ
rep('''    <li><b>ประเด็นที่ต้องตัดสินใจ:</b> ยอดซื้อกระจุกตัวที่กลุ่ม Standard Parts 77.9% ของยอดทั้งหมด
        และ Coverage การเจรจายังต่ำในเดือนที่มียอดซื้อสูง (มิ.ย. เพียง 3.9%)</li>''',
    f'''    <li><b>โครงการ ฿{nf(WUXI['v'])} (Wuxi Yashitle, จีน) ยังไม่รับของและจ่ายเพียงเงินมัดจำ</b> —
        เป็นงาน<b>แบ่งจ่ายหลายงวดแบบ Back-to-Back</b> (จ่ายผู้ขายเมื่อได้รับเงินจากลูกค้าแล้ว) จึง<span class="pos">ไม่มีภาระกระแสเงินสด</span>
        แต่ยอดซื้อถูกบันทึกเต็มจำนวนในเดือน มิ.ย. ซึ่งเป็นที่มาของการโต +180.8%</li>
    <li><b>On-time Delivery {otd['totPct']:.2f}%</b> ผ่านเป้า {otd['target']:.0f}% ทุกเดือน ({nf(otd['totOn'])}/{nf(otd['totPo'])} รายการ)
        แต่เดือน ก.ค. มูลค่าที่ล่าช้าคิดเป็น {(P['buckets']['Jul']['value']-P['buckets']['Jul']['rows'][BK[0]][1])/P['buckets']['Jul']['value']*100:.1f}% ของมูลค่ารับเข้า เพราะของที่ช้าเป็นรายการมูลค่าสูง</li>
    <li><b>ผู้ขายรายเดียวคิดเป็น {conc[1]}% ของยอดซื้อ · Top 5 = {conc[5]}%</b> จากผู้ขายทั้งหมด {P['supCount']} ราย — ความเสี่ยงด้าน Supply ที่ต้องมีแผนรองรับ</li>''',
    'tldr-update')

rep('''    <li><b>ยังไม่มีในรายงานฉบับนี้</b> (รอข้อมูลจาก server): On-time Delivery %, Pending PO / งานค้างส่ง,
        Top Supplier &amp; สัดส่วนการพึ่งพา, แนวโน้มราคาวัตถุดิบ และเงินมัดจำคงค้าง</li>''',
    f'''    <li><b style="color:var(--green-soft);">เพิ่มใหม่ในฉบับนี้ (v3):</b> On-time Delivery (ข้อ 7) · Pending PO (ข้อ 8) · Top Supplier &amp; การกระจุกตัว (ข้อ 9)
        จากไฟล์ KPI-PURCHASING และ Data Delivery เดือน มิ.ย.–ก.ค.</li>
    <li><b>ฐานข้อมูลของหัวข้อ 7–8 ต่างจากหัวข้อ 1–6</b> — หัวข้อ 1–6 ใช้ยอด <u>PO ที่ออก</u> ส่วนหัวข้อ 7–8 ใช้ <u>รายการรับของจริง</u>
        (มิ.ย. ฿{nf(P['buckets']['Jun']['value'])} · ก.ค. ฿{nf(P['buckets']['Jul']['value'])}) ตัวเลขจึงไม่เท่ากันโดยธรรมชาติ ส่วนต่างคือของที่ยังไม่ส่ง</li>
    <li><b>ผลต่างรอกระทบยอด ฿{nf(GAP)}</b> ({GAP/T26*100:.2f}%) ระหว่างยอดซื้อรวม ฿{nf(T26)} (หัวข้อ 1–6)
        กับผลรวมรายการ PO รายบรรทัด ฿{nf(TOI)} ที่ใช้ในหัวข้อ 9 — % Share ของผู้ขายคำนวณบนฐาน ฿{nf(TOI)}</li>
    <li><b>ยังไม่มีในรายงานฉบับนี้:</b> สาเหตุความล่าช้ารายรายการ · Payment Terms รายผู้ขาย · ยอดซื้อรายผู้ขายปี 2025 (เทียบ YoY) ·
        แนวโน้มราคาวัตถุดิบ + อัตราแลกเปลี่ยน · เงินมัดจำคงค้าง</li>''',
    'datanote-update')

# ================================================================ Target vs Actual: ใช้นิยาม KPI ทางการ
kpi_rows = ''.join(
    f'<tr><td>{MTH[m]} ({m})</td><td>{nf(cs["cur"][i])}</td><td>{nf(cs["new"][i])}</td>'
    f'<td class="pos">{nf(cs["save"][i])}</td><td class="pos">{cs["pct"][i]:.2f}%</td>'
    f'<td><span class="chip ok">ผ่าน</span></td></tr>' for i, m in enumerate(M))
kpi_card = f'''
  <div class="card" style="margin-top:16px;">
    <h3>KPI ทางการของฝ่ายจัดซื้อ <small>— Cost Saving (Repeat Product) เป้าหมาย {cs['target']:.0f}% ต่อเดือน</small></h3>
    <table>
      <thead><tr><th>เดือน</th><th>Current Price Amount</th><th>New Price Amount</th><th>Cost Saving</th><th>% Saving</th><th>ผลประเมิน</th></tr></thead>
      <tbody>{kpi_rows}
      <tr class="total"><td>รวม Jan–Jul</td><td>{nf(cs['totCur'])}</td><td>{nf(cs['totCur']-cs['totSave'])}</td>
        <td>{nf(cs['totSave'])}</td><td>{cs['totPct']:.2f}%</td><td><span class="chip ok">ผ่าน</span></td></tr>
      </tbody>
    </table>
    <div class="note">
      ที่มา: KPI-PURCHASING ข้อ 2 — <b>นี่คือ KPI ที่บริษัทใช้วัดผลจริง ผ่านเป้าทุกเดือน (รวม {cs['totPct']:.2f}%)</b><br>
      ตารางถัดไปเป็นมุมมองที่กว้างกว่า (รวม Price Negotiation ด้วย) ซึ่งไม่ใช่ KPI ทางการ แต่สะท้อนภาพรวมได้ครบกว่า —
      ควรนำเสนอ KPI ทางการก่อน แล้วค่อยเสริมด้วยมุมมองกว้าง เพื่อไม่ให้สับสนว่าเดือน มิ.ย. "ไม่ผ่าน"
    </div>
  </div>'''
rep('  <div class="card" style="margin-top:16px;">\n    <h3>Target vs Actual รายเดือน',
    kpi_card + '\n  <div class="card" style="margin-top:16px;">\n    <h3>Target vs Actual รายเดือน (มุมมองกว้าง)',
    'official-kpi-card')

rep('<b>ผ่านเป้า 5% ทุกเดือน ยกเว้นเดือน มิ.ย. (4.56%)</b> ซึ่งเป็นเดือนที่มียอดซื้อสูงสุด —',
    '<b>ตารางนี้ไม่ใช่ KPI ทางการ</b> — เป็นมุมมองที่รวม Price Negotiation เข้ามาด้วย ทำให้เดือน มิ.ย. อยู่ที่ 4.56% —',
    'target-note-clarify')

# ================================================================ Footer / title
rep('· ปรับปรุง ส.ค. 2026 (v2)', '· ปรับปรุง ส.ค. 2026 (v3)', 'footer-v3')
rep('<span>Source: Purchasing Monthly Report / KPI-Purchasing 2026 (Jan–Jul) | Purchasing Department</span>',
    '<span>Source: KPI-PURCHASING 2026 (ข้อ 1–2) · Data Delivery Jun–Jul 2026 · Cost Saving Jun–Jul 2026 | Purchasing Department</span>',
    'footer-source-v3')

open(OUT, 'w', encoding='utf-8').write(h)
print(f'OK -> {OUT} ({len(h):,} bytes) | patches: {len(applied)}')
for a in applied:
    print('  -', a)
print(f"\nOTD รวม {otd['totPct']:.2f}% | Pending ฿{PEND_TOT:,.0f} | Top1 {conc[1]}% | Suppliers {P['supCount']}")
