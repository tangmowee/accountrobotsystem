#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch Procurement Executive Report (RSC) — รอบที่ 1
แก้ข้อมูลไม่ตรงกัน + ปรับรูปแบบให้เข้ากับมาตรฐานรายงานของ TN
ที่มาข้อมูลทั้งหมด: ตัวแปร MD / credit / credit25 ในไฟล์ต้นฉบับ (ไม่มีการสร้างตัวเลขใหม่)
"""
import re, json, sys, io

SRC = 'procurement_report.html'
OUT = 'Procurement_Report_JanJul_2026_v2.html'
CHARTJS = 'chart.umd.min.js'

h = open(SRC, encoding='utf-8').read()
orig_len = len(h)
applied = []

def rep(old, new, label, count=1):
    """แทนที่แบบตรงตัว และยืนยันว่าทำได้จริง"""
    global h
    n = h.count(old)
    if n != count:
        sys.exit(f'PATCH FAIL [{label}]: expected {count} occurrence(s), found {n}')
    h = h.replace(old, new, count)
    applied.append(label)

# ---------------------------------------------------------------- ข้อมูลอ้างอิง
script = re.findall(r'<script[^>]*>(.*?)</script>', h, re.S)[1]
MD = json.loads([l for l in script.split('\n') if l.startswith('const MD =')][0]
                [len('const MD = '):].rstrip(';'))
M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
MTH = {'Jan': 'ม.ค.', 'Feb': 'ก.พ.', 'Mar': 'มี.ค.', 'Apr': 'เม.ย.',
       'May': 'พ.ค.', 'Jun': 'มิ.ย.', 'Jul': 'ก.ค.'}

credit = {
    '0d': [218155.69, 287551.81, 737472.87, 47067.5, 76015.56, 800460.55, 928958.92],
    '7d': [10312, 3168, 9805, 665, 7059, 955, 5305],
    '15d': [59700, 15960, 49705, 30915, 118645, 30514327.8, 133480],
    '30d': [2806018.33, 6881311.45, 457164.9, 592123.46, 2131393.46, 2119333.95, 2453889.5],
    '45d': [7360, 22800, 0, 0, 0, 0, 34170],
    '60d': [1797948.01, 2031730.72, 353015.03, 312647.65, 593238.75, 185214.89, 464053.01]}
credit25 = {
    '0d': [185745.34, 1012927.23, 1027401.71, 20563, 933.27, 9879.8, 123005.77],
    '7d': [625473.7, 13025, 24574.5, 3093, 20183, 12208.3, 5910],
    '15d': [62650, 56132, 164500, 6288, 18670, 82525, 0],
    '30d': [3360674.82, 1342792.74, 3022668.97, 2355679.49, 499384.36, 386810.37, 694120.56],
    '45d': [83194, 6482, 1100, 490, 6000, 34600, 2350],
    '60d': [521062.26, 3122960.15, 451309.53, 161920.2, 305795.81, 401479.92, 181266.6]}
DAYS = {'0d': 0, '7d': 7, '15d': 15, '30d': 30, '45d': 45, '60d': 60}

T25, T26 = sum(MD['t25']), sum(MD['t26'])
C25T = sum(sum(v) for v in credit25.values())
RESID25 = C25T - T25                       # ผลต่างรอกระทบยอด 2025

def wavg(c, drop=None):
    tot = w = 0.0
    for k, a in c.items():
        for i, v in enumerate(a):
            if drop is not None and i == drop:
                continue
            tot += v; w += v * DAYS[k]
    return w / tot

WA25, WA26 = wavg(credit25), wavg(credit)
WA26X, WA25X = wavg(credit, drop=5), wavg(credit25, drop=5)

def wavg_m(c, i):
    tot = sum(a[i] for a in c.values())
    return sum(a[i] * DAYS[k] for k, a in c.items()) / tot

WAM26 = [round(wavg_m(credit, i), 1) for i in range(7)]
WAM25 = [round(wavg_m(credit25, i), 1) for i in range(7)]

# ลักษณะการซื้อ (ตามแนวทาง TN: ซื้อเข้างาน / เป็นค่าใช้จ่าย / สินทรัพย์)
DIRECT = ['Robot', 'Standard Parts (Mech & Elec)', 'Materials (SUS/SS400/ALU)',
          'Camera, Vision System', 'Outsourced (Made to Order)', 'Plating Process & Zinc',
          'Engineering Fee & Service', 'Transportation Service', 'Trading / Resale (FG)']
EXPENSE = ['Factory Supplies', 'Office Supplies', 'Repairing & Service']
ASSET = ['Asset']

def agg(gs, key):
    return [sum(MD[key][g][i] for g in gs) for i in range(7)]

# Saving: ค่าที่ถูกต้องมาจากผลรวมรายเดือน (negoDetail) ไม่ใช่ตัวเลขค้างในตารางภาพรวม
nd = MD['negoDetail']
SCOPE = {k: sum(nd[k][i][0] for i in range(7)) for k in ['cs', 'std', 'out', 'eng', 'sup']}
SAVE = {k: sum(nd[k][i][1] for i in range(7)) for k in ['cs', 'std', 'out', 'eng', 'sup']}
NEGO_SCOPE = sum(SCOPE[k] for k in ['std', 'out', 'eng', 'sup'])
NEGO_SAVE = sum(SAVE[k] for k in ['std', 'out', 'eng', 'sup'])
TOT_SCOPE = NEGO_SCOPE + SCOPE['cs']
TOT_SAVE = NEGO_SAVE + SAVE['cs']

NORM = (T26 - MD['t26'][5]) / 6                 # ค่าเฉลี่ยเดือนปกติ (ไม่รวม PO ใหญ่ มิ.ย.)
FY_FCST = T26 + 5 * NORM                        # คาดการณ์ทั้งปี = YTD + 5 เดือนที่เหลือ

nf = lambda v: f'{v:,.0f}'
pc = lambda a, b: ('+' if a >= b else '') + f'{(a/b-1)*100:.1f}%'

# ================================================================ 1) CHART.JS INLINE
lib = open(CHARTJS, encoding='utf-8').read()
lib = re.sub(r'\n//# sourceMappingURL=.*$', '', lib)
rep('<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1"></script>',
    '<!-- Chart.js v4.5.1 (MIT) ฝังในไฟล์ — เปิดได้แม้ไม่มีอินเทอร์เน็ต -->\n'
    '<script>' + lib + '</script>',
    'inline-chartjs')

# ================================================================ 2) CSS: light/print
rep('@media print{body{padding:10px;} .card,.kpi{break-inside:avoid;}}',
    r'''/* ---------- โหมดสว่าง / โหมดพิมพ์ ---------- */
html.light body{background:#FFFFFF;color:#16181D;}
html.light{--bg:#FFFFFF;--bg-card:#FFFFFF;--bg-card2:#F4F6F8;--text:#16181D;
  --text-dim:#5B626C;--line:#D7DBE0;--green-soft:#1F7A33;--red:#C0392B;}
html.light .card,html.light .kpi,html.light .msum{box-shadow:0 1px 3px rgba(16,24,40,.07);}
html.light th{background:#F0F2F5;color:#9A3E00;}
html.light td{border-bottom:1px solid #E4E7EB;}
html.light tr:hover td{background:#FBF3EC;}
html.light tr.total td{background:#FDF0E4;color:#9A3E00;}
html.light tr.subhead td{background:#EEF0F3;color:#5B626C;}
html.light [style*="20262e"]{background:#EDF0F3 !important;color:#16181D !important;}
html.light .imodal,html.light .modal{box-shadow:0 18px 60px rgba(16,24,40,.25);}
html.light .dnote{background:#F7F9FB;}

.themebar{display:flex;gap:8px;align-items:center;}
.tbtn{background:var(--bg-card2);border:1px solid var(--line);color:var(--text);
  border-radius:8px;padding:7px 13px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;}
.tbtn:hover{border-color:var(--orange);color:var(--orange);}

/* ---------- องค์ประกอบใหม่ ---------- */
.dnote{background:var(--bg-card2);border:1px solid var(--line);border-left:5px solid var(--blue);
  border-radius:var(--radius);padding:16px 20px;margin-bottom:26px;font-size:13px;line-height:1.7;}
.dnote h4{font-size:13.5px;color:var(--blue);margin-bottom:8px;font-weight:700;}
.dnote ul{margin-left:18px;} .dnote li{margin:4px 0;color:var(--text);}
.dnote b{color:var(--orange);}
.tldr{background:linear-gradient(150deg,var(--bg-card) 0%,var(--bg-card2) 100%);
  border:1px solid var(--line);border-left:5px solid var(--orange);border-radius:var(--radius);
  padding:18px 22px;margin-bottom:26px;}
.tldr h4{font-size:14px;color:var(--orange);margin-bottom:10px;font-weight:700;}
.tldr ul{margin-left:18px;} .tldr li{margin:6px 0;font-size:13.5px;line-height:1.6;}
td.rmk,th.rmk{text-align:left;font-size:11.8px;color:var(--text-dim);max-width:330px;white-space:normal;}
.todo{color:var(--yellow);font-weight:600;}
.chip{display:inline-block;border-radius:5px;font-size:10.5px;padding:1px 7px;font-weight:700;}
.chip.ok{background:#1E5F2A;color:#CFF3D6;} .chip.no{background:#7A2320;color:#FBD9D6;}
html.light .chip.ok{background:#D6F0DC;color:#14532D;} html.light .chip.no{background:#FBE0DE;color:#7F1D1D;}

@media print{
  body{padding:8px;} .card,.kpi,.dnote,.tldr{break-inside:avoid;}
  .tabs,.themebar,.badge,.btn-cash{display:none !important;}
  /* พิมพ์เฉพาะแท็บที่เปิดอยู่ — ถ้าต้องการทั้งเล่มให้กดพิมพ์ทีละแท็บ */
  .chart-box{height:250px;} .chart-box.tall{height:290px;}
}''',
    'css-light-print')

# ================================================================ 3) HEADER
rep('''    <b>Purchasing Department</b><br>
    Report Period: Jan – Jul 2026''',
    f'''    <b>Purchasing Department</b><br>
    Report Period: Jan – Jul 2026<br>
    <span style="font-size:12px;">ฐานตัวเลข: <b style="color:var(--orange);">PO ที่ออก (PO Issued)</b> · ข้อมูล ณ 31 ก.ค. 2026</span>
    <div class="themebar" style="justify-content:flex-end;margin-top:10px;">
      <button class="tbtn" onclick="toggleTheme()" id="themeBtn">☀ โหมดสว่าง</button>
      <button class="tbtn" onclick="printReport()">🖨 พิมพ์ / บันทึก PDF</button>
    </div>''',
    'header-basis-theme')

# ================================================================ 4) TL;DR + DATA NOTES
tldr = f'''
<!-- สรุปผู้บริหาร 30 วินาที -->
<div class="tldr">
  <h4>⚡ สรุปผู้บริหาร 30 วินาที</h4>
  <ul>
    <li><b>ยอดซื้อ Jan–Jul 2026 = ฿{T26/1e6:.2f}M (+180.8%)</b> — แต่ ฿{MD['g26']['Standard Parts (Mech & Elec)'][5]/1e6:.2f}M มาจากโครงการ Standard Parts เดือน มิ.ย. รายการเดียว
        หากตัดโครงการนี้ออก ยอดปกติเฉลี่ย <b>฿{NORM/1e6:.2f}M/เดือน</b> ใกล้เคียงปี 2025 (฿{T25/7/1e6:.2f}M/เดือน)</li>
    <li><b>เครดิตเฉลี่ยถ่วงน้ำหนักลดจาก {WA25:.1f} วัน → {WA26:.1f} วัน</b> (เสียเปรียบกระแสเงินสด {WA25-WA26:.1f} วัน)
        เพราะโครงการ มิ.ย. ฿{sum(credit['15d'][5:6])/1e6:.2f}M อยู่ใต้เครดิต 15 วัน — <b>ตัดโครงการออกแล้วอยู่ที่ {WA26X:.1f} วัน ดีกว่าปี 2025 ({WA25X:.1f} วัน)</b></li>
    <li><b>Saving รวม ฿{nf(TOT_SAVE)}</b> = {TOT_SAVE/TOT_SCOPE*100:.2f}% ของมูลค่าที่เข้ากระบวนการเจรจา (฿{TOT_SCOPE/1e6:.2f}M)
        แต่คิดเป็นเพียง <b>{TOT_SAVE/T26*100:.2f}% ของยอดซื้อรวม</b> เพราะ Coverage การเจรจาอยู่ที่ {TOT_SCOPE/T26*100:.1f}% ของยอดซื้อ</li>
    <li><b>ประเด็นที่ต้องตัดสินใจ:</b> ยอดซื้อกระจุกตัวที่กลุ่ม Standard Parts {MD['g26']['Standard Parts (Mech & Elec)'][6-6]*0+sum(MD['g26']['Standard Parts (Mech & Elec)'])/T26*100:.1f}% ของยอดทั้งหมด
        และ Coverage การเจรจายังต่ำในเดือนที่มียอดซื้อสูง (มิ.ย. เพียง 3.9%)</li>
  </ul>
</div>

<!-- หมายเหตุฐานข้อมูล -->
<div class="dnote">
  <h4>📌 หมายเหตุฐานข้อมูล (อ่านก่อนเปรียบเทียบกับรายงานฝ่ายอื่น)</h4>
  <ul>
    <li><b>ฐานตัวเลข = มูลค่า PO ที่ออก (PO Issued)</b> ไม่ใช่ยอดรับเข้า (GR) และไม่ใช่ยอดตั้งเจ้าหนี้ (AP)
        จึงเทียบตรงกับรายงาน AP / บัญชีไม่ได้ — ผลต่างคือ PO ที่ยังส่งของไม่ครบ</li>
    <li><b>ยอดปี 2025 ใช้ชุดเดียวกันทั้งฉบับแล้ว</b> คือ ฿{nf(T25)} (Jan–Jul) — ฉบับก่อนหน้ามี 3 ชุดไม่ตรงกัน (฿19,477,441 / ฿20,404,830 / ฿20,494,094) ซึ่งได้แก้แล้ว</li>
    <li><b>ยังกระทบยอดไม่ลงตัว ฿{nf(RESID25)}</b> ({RESID25/T25*100:.2f}%) ระหว่างยอดซื้อรวมปี 2025 กับผลรวมแยกตาม Credit Term (เกิดในเดือน ม.ค. 2025) —
        แสดงเป็นบรรทัด "รอกระทบยอด" ในตารางข้อ 2 ไม่ได้ซ่อนไว้</li>
    <li><b>ยังไม่มีในรายงานฉบับนี้</b> (รอข้อมูลจาก server): On-time Delivery %, Pending PO / งานค้างส่ง,
        Top Supplier &amp; สัดส่วนการพึ่งพา, แนวโน้มราคาวัตถุดิบ และเงินมัดจำคงค้าง</li>
  </ul>
</div>
'''
rep('''<!-- SECTION 1 : PURCHASE ORDER 2025 vs 2026 -->''',
    tldr + '\n<!-- SECTION 1 : PURCHASE ORDER 2025 vs 2026 -->',
    'tldr-datanotes')

# ================================================================ 5) JS: ย้าย MD / credit25 ขึ้นก่อนใช้งาน
mmd = re.search(r'^const MD = \{.*\};$', h, re.M)
md_line = mmd.group(0)
h = h.replace(md_line + '\n', '', 1)
applied.append('move-MD-decl(remove)')

mc25 = re.search(r'^const credit25 = \{\n(?:.*\n)*?\};$', h, re.M)
c25_block = mc25.group(0)
h = h.replace(c25_block + '\n', '', 1)
applied.append('move-credit25-decl(remove)')

rep("const M5 = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];",
    "const M5 = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];\n\n"
    "/* ── ย้ายมาประกาศไว้ต้นสคริปต์ เพื่อให้กราฟภาพรวมคำนวณจากชุดข้อมูลเดียวกับตาราง ── */\n"
    + md_line + "\n" + c25_block,
    'move-MD-credit25-decl')

# ================================================================ 6) JS: ยอดรายเดือน 2025 ให้ตรงตาราง
old_v25 = 'const v2025 = [4825800,5554319,4691555,2548034,851030,1006703,1016653,961634,493272,4716754,4895629,1078081];'
new_v25 = ('/* Jan–Jul ดึงจาก MD.t25 (ชุดเดียวกับทุกตาราง) | Aug–Dec 2025 = ยอดจริงทั้งปีจากชุดข้อมูลเดิม */\n'
           'const v2025 = [...MD.t25, 961634,493272,4716754,4895629,1078081];')
rep(old_v25, new_v25, 'fix-v2025')
rep('const v2026 = [4899494,9242522,1607163,983419,2926352,33620292,4019856,null,null,null,null,null];',
    'const v2026 = [...MD.t26, null,null,null,null,null];',
    'fix-v2026')

# ================================================================ 7) JS: กราฟ Product Group ให้ตรงตาราง
old_g = """const groups = ['Standard Parts','Robot','Outsourced (MTO)','Trading/Resale','Engineering&Service','Camera/Vision','Asset','Materials','Factory Supplies','Office Supplies','Transportation','Plating&Zinc','Repairing'];
const g2025 = [4445606, 3810000, 3013650, 3597546, 1929722, 1327890, 249806, 237612, 312174, 179238, 108250, 44652, 221295];
const g2026 = [42462635, 1595000, 5408356, 1199428, 657885, 782189, 182148, 280596, 237698, 114132, 148500, 131425, 113250];
const groupOrderMap = ['Standard Parts (Mech & Elec)','Robot','Outsourced (Made to Order)','Trading / Resale (FG)','Engineering Fee & Service','Camera, Vision System','Asset','Materials (SUS/SS400/ALU)','Factory Supplies','Office Supplies','Transportation Service','Plating Process & Zinc','Repairing & Service'];"""
new_g = """/* แก้ไข: เดิมกราฟนี้ใช้ตัวเลขคนละชุดกับตาราง (Jan–Jun / ยอดเก่า) ทำให้กราฟกับตารางไม่ตรงกัน
   ปัจจุบันคำนวณจาก MD โดยตรง จึงตรงกับตารางเสมอ */
const groupOrderMap = ['Standard Parts (Mech & Elec)','Robot','Outsourced (Made to Order)','Trading / Resale (FG)','Engineering Fee & Service','Camera, Vision System','Asset','Materials (SUS/SS400/ALU)','Factory Supplies','Office Supplies','Transportation Service','Plating Process & Zinc','Repairing & Service'];
const groups = ['Standard Parts','Robot','Outsourced (MTO)','Trading/Resale','Engineering&Service','Camera/Vision','Asset','Materials','Factory Supplies','Office Supplies','Transportation','Plating&Zinc','Repairing'];
const sumArr = a => a.reduce((s,v)=>s+v,0);
const g2025 = groupOrderMap.map(g=>sumArr(MD.g25[g]));
const g2026 = groupOrderMap.map(g=>sumArr(MD.g26[g]));"""
rep(old_g, new_g, 'fix-group-chart-data')

# ================================================================ 8) JS: Credit YoY 2025 ให้ตรงชุดรายเดือน
rep('const c25 = [3074884.46,631102.8,224175,10406305.32,131866,5009107.57];',
    '/* แก้ไข: เดิมเป็นยอดชุดเก่า (รวม ฿19,477,441) ไม่ตรงกับ credit25 รายเดือน\n'
    '   ปัจจุบันรวมจาก credit25 โดยตรง */\n'
    'const c25 = Object.values(credit25).map(a=>a.reduce((s,v)=>s+v,0));',
    'fix-c25')

# ================================================================ 9) JS: คลิกกราฟเครดิตได้ครบ 7 เดือน
rep('if(mi<5){if(ds===0){drillMonth(mi);}',
    'if(mi<7){if(ds===0){drillMonth(mi);}',
    'fix-credit-click-range')

# ================================================================ 10) JS: กราฟใหม่ + theme engine
new_charts = f'''

/* ===================== กราฟใหม่: Credit Term แบบสัดส่วน 100% (ตามรูปแบบ TN) ===================== */
const CTERMS = Object.keys(credit);
const pctOf = (arr,tot) => tot ? arr.map(v=>v/tot*100) : arr.map(()=>0);

/* 10a) 100% Stacked รายเดือน 2026 */
new Chart(chCredit100,{{type:'bar',data:{{labels:M5,datasets:
  CTERMS.map(k=>({{label:'Credit '+k,
    data:M5.map((_,i)=>{{const t=CTERMS.reduce((s,kk)=>s+credit[kk][i],0);return t?credit[k][i]/t*100:0;}}),
    backgroundColor:creditColors[k],stack:'p',borderRadius:1}}))
}},options:{{responsive:true,maintainAspectRatio:false,
  onClick:(e,els)=>{{if(els.length){{const term=CTERMS[els[0].datasetIndex],mi=els[0].index;
    if(term==='0d'){{openCashModal(M5[mi]);}}else{{drillCredit(term,mi);}}}}}},
  plugins:{{legend:{{position:'bottom',labels:{{boxWidth:14}}}},
    tooltip:{{callbacks:{{label:c=>` ${{c.dataset.label}}: ${{c.parsed.y.toFixed(1)}}% (${{fmtB(credit[CTERMS[c.datasetIndex]][c.dataIndex])}})`}}}}}},
  scales:{{x:{{stacked:true,grid:{{display:false}}}},
    y:{{stacked:true,max:100,grid:{{color:'#2E2E2E'}},ticks:{{callback:v=>v+'%'}}}}}}}}}});

/* 10b) เครดิตเฉลี่ยถ่วงน้ำหนัก (วัน) รายเดือน */
new Chart(chCreditDays,{{type:'line',data:{{labels:M5,datasets:[
  {{label:'2025 (วัน)',data:{json.dumps(WAM25)},borderColor:'#8A8A8A',backgroundColor:'rgba(138,138,138,.10)',fill:true,tension:.3,pointRadius:4}},
  {{label:'2026 (วัน)',data:{json.dumps(WAM26)},borderColor:'#FF7A2F',backgroundColor:'rgba(255,122,47,.14)',fill:true,tension:.3,pointRadius:4}}
]}},options:{{responsive:true,maintainAspectRatio:false,
  plugins:{{legend:{{position:'top'}},tooltip:{{callbacks:{{label:c=>` ${{c.dataset.label}}: ${{c.parsed.y.toFixed(1)}} วัน`}}}}}},
  scales:{{x:{{grid:{{display:false}}}},y:{{grid:{{color:'#2E2E2E'}},ticks:{{callback:v=>v+' วัน'}}}}}}}}}});

/* 10c) แยกตามลักษณะการซื้อ — 100% stacked (อ่านสัดส่วนได้ทันที แม้ยอดต่างกันมาก) */
const NAT_ABS = {json.dumps([[round(sum(agg(g,'g25')),2) for g in (DIRECT,EXPENSE,ASSET)],[round(sum(agg(g,'g26')),2) for g in (DIRECT,EXPENSE,ASSET)]])};
const NAT_LBL = ['ซื้อเข้างาน/โครงการ (Direct)','ค่าใช้จ่ายดำเนินงาน (Expense)','สินทรัพย์ (Asset)'];
const NAT_COL = ['#FF7A2F','#4F8EF7','#9B7EDE'];
new Chart(chNature,{{type:'bar',data:{{labels:['Jan–Jul 2025','Jan–Jul 2026'],datasets:
  NAT_LBL.map((l,j)=>({{label:l,
    data:[0,1].map(y=>NAT_ABS[y][j]/NAT_ABS[y].reduce((s,v)=>s+v,0)*100),
    backgroundColor:NAT_COL[j],stack:'n',borderRadius:2}}))
}},options:{{indexAxis:'y',responsive:true,maintainAspectRatio:false,
  plugins:{{legend:{{position:'bottom',labels:{{boxWidth:14}}}},
    tooltip:{{callbacks:{{label:c=>` ${{c.dataset.label}}: ${{c.parsed.x.toFixed(1)}}% (${{fmtB(NAT_ABS[c.dataIndex][c.datasetIndex])}})`}}}}}},
  scales:{{x:{{stacked:true,max:100,grid:{{color:'#2E2E2E'}},ticks:{{callback:v=>v+'%'}}}},y:{{stacked:true,grid:{{display:false}}}}}}}}}});

/* ===================== โหมดสว่าง / พิมพ์ ===================== */
function paintCharts(light){{
  const txt   = light ? '#16181D' : '#F2F2F2';
  const grid  = light ? '#E1E5EA' : '#2E2E2E';
  const ring  = light ? '#FFFFFF' : '#1A1A1A';
  Chart.defaults.color = txt;
  Object.values(Chart.instances).forEach(ch=>{{
    const o = ch.options;
    if(o.plugins?.legend?.labels) o.plugins.legend.labels.color = txt;
    Object.values(o.scales||{{}}).forEach(sc=>{{
      if(sc.grid && sc.grid.color!==undefined) sc.grid.color = grid;
      sc.ticks = Object.assign(sc.ticks||{{}}, {{color: sc.ticks?.color==='#FF9D5C' ? (light?'#9A3E00':'#FF9D5C') : txt}});
    }});
    ch.data.datasets.forEach(ds=>{{ if(ds.borderColor==='#1A1A1A'||ds.borderColor==='#FFFFFF') ds.borderColor = ring; }});
    ch.update('none');
  }});
}}
function toggleTheme(){{
  const light = !document.documentElement.classList.contains('light');
  document.documentElement.classList.toggle('light', light);
  document.getElementById('themeBtn').textContent = light ? '🌙 โหมดมืด' : '☀ โหมดสว่าง';
  try{{ localStorage.setItem('rscTheme', light?'light':'dark'); }}catch(e){{}}
  paintCharts(light);
}}
function printReport(){{
  if(!document.documentElement.classList.contains('light')) toggleTheme();
  setTimeout(()=>window.print(), 350);
}}
try{{ if(localStorage.getItem('rscTheme')==='light') toggleTheme(); }}catch(e){{}}
'''
rep("/* ===== Cash (Credit 0d) item list — จัดกลุ่มเดือนตามยอดที่ตรงกับรายงานหลัก ===== */",
    new_charts + "\n/* ===== Cash (Credit 0d) item list — จัดกลุ่มเดือนตามยอดที่ตรงกับรายงานหลัก ===== */",
    'new-charts-theme')

# ทำให้กราฟที่สร้างในแท็บรายเดือนใช้ธีมปัจจุบันด้วย
rep('  builtPages[m]=true;\n}',
    "  builtPages[m]=true;\n  paintCharts(document.documentElement.classList.contains('light'));\n}",
    'monthpage-theme')

# ================================================================ 11) HTML ข้อ 1: หมายเหตุ + ตารางใหม่
rep('<div class="note">ปี 2026 มีข้อมูลถึงเดือน Jul | Jun 2026 สูงสุด ฿33.62M จากงาน Standard Parts (โครงการใหญ่)</div>',
    f'<div class="note">ปี 2026 มีข้อมูลถึงเดือน Jul | Jun 2026 สูงสุด ฿{MD["t26"][5]/1e6:.2f}M จากงาน Standard Parts (โครงการใหญ่) '
    f'| <b style="color:var(--orange);">ยอดปี 2025 แก้ให้ตรงกับตารางแล้ว</b> (Jan–Jul ฿{nf(T25)})</div>',
    'note-monthly')

# ตาราง Product Group + คอลัมน์สาเหตุ
ROWS_ORDER = [('PROJECT / งานขาย', DIRECT), ('SUPPLIES OFFICE / FACTORY / ASSET', EXPENSE + ASSET)]
KNOWN = {
    'Standard Parts (Mech & Elec)': 'โครงการใหญ่เดือน มิ.ย. ฿{jun} (69% ของกลุ่ม) — เป็นตัวขับยอดรวมทั้งปี',
}
def remark(g):
    a26, a25 = MD['g26'][g], MD['g25'][g]
    t26, t25 = sum(a26), sum(a25)
    mi = max(range(7), key=lambda i: a26[i])
    conc = a26[mi] / t26 * 100 if t26 else 0
    if g in KNOWN:
        return KNOWN[g].format(jun=nf(a26[5]))
    base = f'สูงสุด {MTH[M[mi]]} ฿{nf(a26[mi])} ({conc:.0f}% ของกลุ่ม)'
    return base + ' · <span class="todo">⚠ รอทีมระบุสาเหตุ</span>'

trs = []
for head, gs in ROWS_ORDER:
    trs.append(f'<tr class="subhead"><td colspan="6">{head}</td></tr>')
    for g in gs:
        a26, a25 = sum(MD['g26'][g]), sum(MD['g25'][g])
        cls = 'pos' if a26 >= a25 else 'neg'
        trs.append(
            f'<tr><td>{g.replace("&","&amp;")}</td><td>{nf(a25)}</td><td>{nf(a26)}</td>'
            f'<td class="{cls}">{pc(a26,a25)}</td><td>{a26/T26*100:.1f}%</td>'
            f'<td class="rmk">{remark(g)}</td></tr>')
trs.append(f'<tr class="total"><td>Total\'s</td><td>{nf(T25)}</td><td>{nf(T26)}</td>'
           f'<td class="pos">+180.8%</td><td>100%</td>'
           f'<td class="rmk">ตัดโครงการ มิ.ย. ออก เหลือ ฿{nf(T26-MD["t26"][5])} (+{(T26-MD["t26"][5])/T25*100-100:.1f}% vs 2025)</td></tr>')

trs = []
for head, gs in ROWS_ORDER:
    trs.append(f'<tr class="subhead"><td colspan="6">{head}</td></tr>')
    for g in gs:
        a26, a25 = sum(MD['g26'][g]), sum(MD['g25'][g])
        cls = 'pos' if a26 >= a25 else 'neg'
        trs.append(
            f'<tr><td>{g.replace("&","&amp;")}</td><td>{nf(a25)}</td><td>{nf(a26)}</td>'
            f'<td class="{cls}">{pc(a26,a25)}</td><td>{a26/T26*100:.1f}%</td>'
            f'<td class="rmk">{remark(g)}</td></tr>')
trs.append(f'<tr class="total"><td>Total\'s</td><td>{nf(T25)}</td><td>{nf(T26)}</td>'
           f'<td class="pos">+180.8%</td><td>100%</td>'
           f'<td class="rmk">ตัดโครงการ มิ.ย. ออก เหลือ ฿{nf(T26-MD["t26"][5])} '
           f'({pc(T26-MD["t26"][5], T25)} vs 2025)</td></tr>')

d25, d26 = sum(agg(DIRECT, 'g25')), sum(agg(DIRECT, 'g26'))
e25, e26 = sum(agg(EXPENSE, 'g25')), sum(agg(EXPENSE, 'g26'))
a25_, a26_ = sum(agg(ASSET, 'g25')), sum(agg(ASSET, 'g26'))

# จัดวางใหม่: กราฟ 2 ใบเรียงคู่กัน แล้ววางตารางเต็มความกว้าง (คอลัมน์สาเหตุจะอ่านได้)
new_lower = f'''  <div class="grid2-even" style="margin-top:16px;">
    <div class="card">
      <h3>เปรียบเทียบตาม Product Group <small>(Jan–Jul 2025 vs Jan–Jul 2026)</small> <span class="badge">คลิกกลุ่มเพื่อดูรายการ PO</span></h3>
      <div class="chart-box tall"><canvas id="chGroup"></canvas></div>
      <div class="note"><b style="color:var(--orange);">แก้ไขแล้ว:</b> เดิมกราฟนี้ใช้ข้อมูลคนละชุดกับตาราง (รวม ฿19.48M / ฿53.31M) ปัจจุบันคำนวณจากชุดเดียวกับตาราง จึงตรงกันเสมอ</div>
    </div>
    <div class="card">
      <h3>แยกตามลักษณะการซื้อ <small>(Direct / Expense / Asset — ตามแนวทางรายงาน TN)</small></h3>
      <div class="chart-box" style="height:180px;"><canvas id="chNature"></canvas></div>
      <table style="margin-top:12px;">
        <thead><tr><th>ลักษณะการซื้อ</th><th>2025</th><th>%</th><th>2026</th><th>%</th><th>+/-%</th></tr></thead>
        <tbody>
          <tr><td>ซื้อเข้างาน / โครงการ (Direct)</td><td>{nf(d25)}</td><td>{d25/T25*100:.1f}%</td><td>{nf(d26)}</td><td>{d26/T26*100:.1f}%</td><td class="pos">{pc(d26,d25)}</td></tr>
          <tr><td>ค่าใช้จ่ายดำเนินงาน (Expense)</td><td>{nf(e25)}</td><td>{e25/T25*100:.1f}%</td><td>{nf(e26)}</td><td>{e26/T26*100:.1f}%</td><td class="neg">{pc(e26,e25)}</td></tr>
          <tr><td>สินทรัพย์ (Asset)</td><td>{nf(a25_)}</td><td>{a25_/T25*100:.1f}%</td><td>{nf(a26_)}</td><td>{a26_/T26*100:.1f}%</td><td class="neg">{pc(a26_,a25_)}</td></tr>
          <tr class="total"><td>รวม</td><td>{nf(T25)}</td><td>100%</td><td>{nf(T26)}</td><td>100%</td><td class="pos">+180.8%</td></tr>
        </tbody>
      </table>
      <div class="note"><b>ค่าใช้จ่ายดำเนินงานที่ควบคุมได้เอง ลดลง {abs((e26/e25-1)*100):.1f}%</b> (฿{nf(e25)} → ฿{nf(e26)})
        เป็นผลงานที่แยกออกจากยอดซื้อที่ผันตามออเดอร์ขาย — ใช้วัดผลฝ่ายจัดซื้อได้ตรงกว่ายอดรวม</div>
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <h3>ตาราง Order Value / Product Group <small>(Jan–Jul, บาท) — คลิกที่กราฟเพื่อดูไส้ในรายการ PO</small></h3>
    <table>
      <thead><tr><th style="width:22%;">Product Group</th><th>2025</th><th>2026</th><th>+/-%</th><th>%Share 26</th><th class="rmk" style="width:42%;">สาเหตุ / Remark</th></tr></thead>
      <tbody>
{chr(10).join("        " + t for t in trs)}
      </tbody>
    </table>
    <div class="note"><span class="todo">⚠ ช่อง "รอทีมระบุสาเหตุ"</span> = ตัวเลขขยับแต่ยังไม่มีคำอธิบาย —
      ต้องเติมก่อนนำเสนอ เพราะรายงานฝั่ง TN มีคอลัมน์สาเหตุกำกับทุกตาราง และผู้บริหารเคยสั่งไว้ในรายงาน AP ว่า "ตัวเลขเพิ่มขึ้นให้วิเคราะห์สาเหตุมาด้วย"</div>
  </div>
'''

# ตัดบล็อกเดิม (grid2: chGroup + ตาราง) ทั้งก้อน แล้วแทนด้วยเลย์เอาต์ใหม่
anchor = h.index('<h3>เปรียบเทียบตาม Product Group')
blk_start = h.rindex('<div class="grid2" style="margin-top:16px;">', 0, anchor)
blk_start = h.rindex('\n', 0, blk_start) + 1
blk_end = h.index('\n</div>\n\n<!-- SECTION 2 : VALUE vs CREDIT TERM -->', anchor) + 1
h = h[:blk_start] + new_lower + h[blk_end:]
applied.append('section1-relayout')

# ================================================================ 12) HTML ข้อ 2: กราฟ 100% + วันเครดิต
rep('''    <div class="card">
      <h3>สัดส่วน Credit Term <small>(Jan–Jul 2026)</small> <span class="badge">คลิกช่อง Credit 0d เพื่อดูรายการสินค้า</span></h3>
      <div class="chart-box short"><canvas id="chCreditDonut" style="cursor:pointer;"></canvas></div>
    </div>
    <div class="card">
      <h3>เปรียบเทียบยอดซื้อตาม Credit Term <small>(Jan–Jul 2025 vs 2026)</small></h3>
      <div class="chart-box short"><canvas id="chCreditYoY"></canvas></div>
    </div>''',
    f'''    <div class="card">
      <h3>สัดส่วน Credit Term รายเดือน 2026 <small>— แสดงเป็น 100% (รูปแบบที่ผู้บริหาร TN ใช้)</small> <span class="badge">คลิกแถบเพื่อดูไส้ใน</span></h3>
        <div class="chart-box short"><canvas id="chCredit100" style="cursor:pointer;"></canvas></div>
        <div class="note">กราฟสัดส่วนไม่ถูกบิดด้วยขนาด PO — เห็นชัดว่าเดือน มิ.ย. โครงสร้างเครดิตเปลี่ยนไปเป็น 15 วันเกือบทั้งเดือน</div>
      </div>
      <div class="card">
        <h3>เครดิตเฉลี่ยถ่วงน้ำหนัก <small>(Weighted Average Credit Days — 2025 vs 2026)</small></h3>
        <div class="chart-box short"><canvas id="chCreditDays"></canvas></div>
        <div class="note">Jan–Jul: <b>2025 = {WA25:.1f} วัน → 2026 = {WA26:.1f} วัน</b> (สั้นลง {WA25-WA26:.1f} วัน)
          | ตัดโครงการ มิ.ย. ออก: <b>2026 = {WA26X:.1f} วัน</b> เทียบ 2025 = {WA25X:.1f} วัน — <span class="pos">ดีขึ้น {WA26X-WA25X:.1f} วัน</span></div>
      </div>
      <div class="card">
        <h3>สัดส่วน Credit Term <small>(Jan–Jul 2026)</small> <span class="badge">คลิกช่อง Credit 0d เพื่อดูรายการสินค้า</span></h3>
        <div class="chart-box short"><canvas id="chCreditDonut" style="cursor:pointer;"></canvas></div>
      </div>
      <div class="card">
        <h3>เปรียบเทียบยอดซื้อตาม Credit Term <small>(Jan–Jul 2025 vs 2026)</small></h3>
        <div class="chart-box short"><canvas id="chCreditYoY"></canvas></div>
        <div class="note"><b style="color:var(--orange);">แก้ไขแล้ว:</b> ฐานปี 2025 เดิมใช้ ฿19,477,441 (คนละชุดกับตาราง) ปัจจุบันใช้ ฿{nf(C25T)} ตรงกับข้อมูลรายเดือน</div>
      </div>''',
    'credit-100-days')

# แถวสรุปในตาราง Credit Term
rep('''<tr class="total"><td>Purchase Value (Total's)</td><td>4,899,494</td><td>9,242,522</td><td>1,607,163</td><td>983,419</td><td>2,926,352</td><td>33,620,292</td><td>4,019,856</td><td>57,299,098</td><td>100%</td></tr>''',
    f'''<tr class="total"><td>Purchase Value (Total's)</td><td>4,899,494</td><td>9,242,522</td><td>1,607,163</td><td>983,419</td><td>2,926,352</td><td>33,620,292</td><td>4,019,856</td><td>57,299,098</td><td>100%</td></tr>
<tr><td style="color:var(--orange);">เครดิตเฉลี่ยถ่วงน้ำหนัก 2026 (วัน)</td>{''.join(f'<td>{d:.1f}</td>' for d in WAM26)}<td><b>{WA26:.1f}</b></td><td>—</td></tr>
<tr><td style="color:var(--text-dim);">เครดิตเฉลี่ยถ่วงน้ำหนัก 2025 (วัน)</td>{''.join(f'<td style="color:var(--text-dim);">{d:.1f}</td>' for d in WAM25)}<td style="color:var(--text-dim);"><b>{WA25:.1f}</b></td><td>—</td></tr>''',
    'credit-days-rows')

rep('<div class="note">งาน Standard Parts เดือน มิ.ย. (PO ใหญ่ภายใต้ Credit 15d) ทำให้ 15d เป็นสัดส่วนสูงสุด 54.0% ของยอด Jan–Jul | เครดิต 15–60 วันรวม 94.4% | เงินสด (0d) 5.4%</div>',
    f'''<div class="note">
      <b style="color:var(--orange);">อ่านให้ถูก:</b> Credit 15d = 54.0% <u>ไม่ใช่</u>ผลงานด้านกระแสเงินสด เพราะ 15 วัน <b>สั้นกว่า</b> 30/60 วัน —
      โครงการเดือน มิ.ย. ฿{nf(credit['15d'][5])} อยู่ใต้เครดิต 15 วัน จึงดึงเครดิตเฉลี่ยถ่วงน้ำหนักลงจาก {WA25:.1f} วัน (2025) เหลือ {WA26:.1f} วัน<br>
      ตัดโครงการเดือน มิ.ย. ออก เครดิตเฉลี่ยอยู่ที่ <b>{WA26X:.1f} วัน</b> เทียบปี 2025 ที่ {WA25X:.1f} วัน — <span class="pos">ดีขึ้น {WA26X-WA25X:.1f} วัน คือผลงานจริงของฝ่ายจัดซื้อ</span><br>
      <span style="color:var(--text-dim);">หมายเหตุการกระทบยอด: ผลรวม Credit Term ปี 2025 = ฿{nf(C25T)} สูงกว่ายอดซื้อรวม ฿{nf(T25)} อยู่ ฿{nf(RESID25)} ({RESID25/T25*100:.2f}%) เกิดในเดือน ม.ค. 2025 — อยู่ระหว่างกระทบยอดกับต้นทาง</span>
    </div>''',
    'credit-note')

# ================================================================ 13) HTML ข้อ 3: แก้ตัวหาร + Target vs Actual
old_sav_start = h.index('<thead><tr><th>รายการ</th><th>Order Value</th><th>Save (฿)</th><th>% Save</th></tr></thead>')
old_sav_end = h.index('</tbody>', old_sav_start) + len('</tbody>')
sav_rows = f'''<thead><tr><th>รายการ</th><th>Order Value</th><th>Save (฿)</th><th>% Save</th></tr></thead>
<tbody>
<tr class="subhead"><td colspan="4">Cost Saving (Repeat Product)</td></tr>
<tr><td>Standard Parts Elec &amp; Mech</td><td>{nf(SCOPE['cs'])}*</td><td class="pos">{nf(SAVE['cs'])}</td><td>{SAVE['cs']/SCOPE['cs']*100:.2f}%</td></tr>
<tr style="background:#20262e;font-weight:600;"><td>รวม Cost Saving (ทุกกลุ่ม)</td><td>{nf(SCOPE['cs'])}</td><td class="pos">{nf(SAVE['cs'])}</td><td>{SAVE['cs']/SCOPE['cs']*100:.2f}%</td></tr>
<tr class="subhead"><td colspan="4">Price Negotiation</td></tr>
<tr><td>Standard Parts Elec &amp; Mech</td><td>{nf(SCOPE['std'])}</td><td class="pos">{nf(SAVE['std'])}</td><td>{SAVE['std']/SCOPE['std']*100:.2f}%</td></tr>
<tr><td>Outsourced (Made to Order)</td><td>{nf(SCOPE['out'])}</td><td class="pos">{nf(SAVE['out'])}</td><td>{SAVE['out']/SCOPE['out']*100:.2f}%</td></tr>
<tr><td>Engineering Fee &amp; Service</td><td>{nf(SCOPE['eng'])}</td><td class="pos">{nf(SAVE['eng'])}</td><td>{SAVE['eng']/SCOPE['eng']*100:.2f}%</td></tr>
<tr><td>Supplies Office &amp; Factory</td><td>{nf(SCOPE['sup'])}</td><td class="pos">{nf(SAVE['sup'])}</td><td>{SAVE['sup']/SCOPE['sup']*100:.2f}%</td></tr>
<tr style="background:#20262e;font-weight:600;"><td>รวม Price Negotiation (ทุกกลุ่ม)</td><td>{nf(NEGO_SCOPE)}</td><td class="pos">{nf(NEGO_SAVE)}</td><td>{NEGO_SAVE/NEGO_SCOPE*100:.2f}%</td></tr>
<tr class="total"><td>Total Saving (Cost Saving + Price Nego)</td><td>{nf(TOT_SCOPE)}</td><td>{nf(TOT_SAVE)}</td><td>{TOT_SAVE/TOT_SCOPE*100:.2f}%</td></tr>
<tr class="subhead"><td colspan="4">ตัวเลขที่ผู้บริหารมักถามต่อ</td></tr>
<tr><td>Coverage — มูลค่าที่เข้ากระบวนการเจรจา / ยอดซื้อรวม</td><td>{nf(TOT_SCOPE)} / {nf(T26)}</td><td>—</td><td>{TOT_SCOPE/T26*100:.1f}%</td></tr>
<tr><td>Saving เทียบ<b>ยอดซื้อรวมทั้งหมด</b></td><td>{nf(T26)}</td><td class="pos">{nf(TOT_SAVE)}</td><td>{TOT_SAVE/T26*100:.2f}%</td></tr>
</tbody>'''
h = h[:old_sav_start] + sav_rows + h[old_sav_end:]
applied.append('saving-table-fix')

rep('<div class="note">* Current price amount ของสินค้า Repeat | ** % เทียบ Order Value กลุ่ม Price Negotiation ฿7.17M | Target: 5% / Month / Product Group</div>',
    f'''<div class="note">* Current price amount ของสินค้า Repeat<br>
      <b style="color:var(--orange);">แก้ไขแล้ว:</b> Order Value ของ Standard Parts และ Outsourced ในฉบับก่อนเป็นตัวเลขค้าง (฿3,950,152 / ฿1,281,650)
      ไม่ตรงกับผลรวมรายเดือนในแท็บเดือน (฿{nf(SCOPE['std'])} / ฿{nf(SCOPE['out'])}) ทำให้ % Save สูงเกินจริง —
      ปัจจุบันใช้ผลรวมรายเดือนทั้งหมด รวม Price Nego = ฿{nf(NEGO_SCOPE)} (฿{NEGO_SCOPE/1e6:.2f}M) ตรงกับเชิงอรรถเดิม<br>
      <b>% Save รวมที่ถูกต้อง = {TOT_SAVE/TOT_SCOPE*100:.2f}%</b> (เดิมแสดง 14.10%)</div>''',
    'saving-note')

# Target vs Actual card
tgt_rows = []
for i, m in enumerate(M):
    tot = sum(MD['saving'][k][i] for k in MD['saving'])
    scope = sum(nd[k][i][0] for k in ['cs', 'std', 'out', 'eng', 'sup'])
    p = tot / scope * 100 if scope else 0
    cov = scope / MD['t26'][i] * 100
    chip = '<span class="chip ok">ผ่าน</span>' if p >= 5 else '<span class="chip no">ไม่ผ่าน</span>'
    tgt_rows.append(
        f'<tr><td>{MTH[m]} ({m})</td><td>{nf(MD["t26"][i])}</td><td>{nf(scope)}</td><td>{cov:.1f}%</td>'
        f'<td>{nf(tot)}</td><td class="{"pos" if p>=5 else "neg"}">{p:.2f}%</td><td>{chip}</td>'
        f'<td>{tot/MD["t26"][i]*100:.2f}%</td></tr>')
tgt_all = TOT_SAVE / TOT_SCOPE * 100
tgt_chip = '<span class="chip ok">ผ่าน</span>' if tgt_all >= 5 else '<span class="chip no">ไม่ผ่าน</span>'
tgt_rows.append(
    f'<tr class="total"><td>รวม Jan–Jul</td><td>{nf(T26)}</td><td>{nf(TOT_SCOPE)}</td><td>{TOT_SCOPE/T26*100:.1f}%</td>'
    f'<td>{nf(TOT_SAVE)}</td><td>{tgt_all:.2f}%</td>'
    f'<td>{tgt_chip}</td>'
    f'<td>{TOT_SAVE/T26*100:.2f}%</td></tr>')

target_card = f'''
  <div class="card" style="margin-top:16px;">
    <h3>Target vs Actual รายเดือน <small>— เป้าหมาย 5% ต่อเดือน (เทียบมูลค่าที่เข้ากระบวนการเจรจา)</small></h3>
    <table>
      <thead><tr><th>เดือน</th><th>ยอดซื้อรวม</th><th>มูลค่าที่เจรจา (Scope)</th><th>Coverage</th><th>Saving</th><th>% ต่อ Scope</th><th>vs เป้า 5%</th><th>% ต่อยอดซื้อรวม</th></tr></thead>
      <tbody>{''.join(tgt_rows)}</tbody>
    </table>
    <div class="note">
      <b>ผ่านเป้า 5% ทุกเดือน ยกเว้นเดือน มิ.ย. (4.56%)</b> ซึ่งเป็นเดือนที่มียอดซื้อสูงสุด —
      สาเหตุคือ Coverage เดือน มิ.ย. มีเพียง 3.9% ของยอดซื้อ (โครงการใหญ่ไม่ได้ผ่านกระบวนการเจรจาราคาในเดือนนั้น)<br>
      <span class="todo">⚠ ประเด็นที่ผู้บริหารจะถาม:</span> ยอดซื้อ 86.6% ของทั้งปียังไม่ได้เข้ากระบวนการเจรจา — ควรมีแผนเพิ่ม Coverage เป็นเป้าหมายคู่กับ % Saving
    </div>
  </div>'''
rep('''  </div>
</div>

<!-- SECTION 4 : YEAR TO DATE ANALYSIS -->''',
    '  </div>\n' + target_card + '\n</div>\n\n<!-- SECTION 4 : YEAR TO DATE ANALYSIS -->',
    'target-card')

# ================================================================ 14) HTML ข้อ 4: run-rate
rep('<div class="kpi"><div class="lbl">Run-rate ทั้งปี (คาดการณ์)</div><div class="val">฿47.36M</div><div class="chg dim">คำนวณจากค่าเฉลี่ยเดือนปกติ (ไม่รวม PO ใหญ่ มิ.ย.)</div></div>',
    f'<div class="kpi"><div class="lbl">คาดการณ์ทั้งปี 2026</div><div class="val">฿{FY_FCST/1e6:.2f}M</div>'
    f'<div class="chg dim">= YTD ฿{T26/1e6:.2f}M + อีก 5 เดือน × ฿{NORM/1e6:.2f}M<br>'
    f'<span style="color:var(--text-dim);">(ฐานเดือนปกติอย่างเดียว × 12 = ฿{12*NORM/1e6:.2f}M)</span></div></div>',
    'fix-runrate')

rep('<div class="note">มิ.ย. +3,243% เป็นค่าผิดปกติจากฐานต่ำปีก่อน + โครงการใหญ่ปีนี้ | Mar–Apr ติดลบตามรอบส่งมอบโครงการ</div>',
    f'<div class="note">มิ.ย. +{(MD["t26"][5]/MD["t25"][5]-1)*100:,.0f}% เป็นค่าผิดปกติจากฐานต่ำปีก่อน (฿{nf(MD["t25"][5])}) + โครงการใหญ่ปีนี้ '
    f'| Mar–Apr ติดลบตามรอบส่งมอบโครงการ <span class="todo">⚠ รอทีมระบุสาเหตุ</span></div>',
    'fix-yoy-note')

rep('<tr><td>ค่าเฉลี่ยต่อเดือน</td><td>2,914,976</td><td>8,185,585</td><td class="pos">+5,270,609</td><td class="pos">+180.8%</td></tr>',
    f'<tr><td>ค่าเฉลี่ยต่อเดือน</td><td>{nf(T25/7)}</td><td>{nf(T26/7)}</td><td class="pos">+{nf(T26/7-T25/7)}</td><td class="pos">+180.8%</td></tr>\n'
    f'<tr><td>ค่าเฉลี่ยต่อเดือน <b>ตัดโครงการ มิ.ย. ออก</b></td><td>{nf((T25-MD["t25"][5])/6)}</td><td>{nf(NORM)}</td>'
    f'<td class="pos">+{nf(NORM-(T25-MD["t25"][5])/6)}</td><td class="pos">{pc(NORM,(T25-MD["t25"][5])/6)}</td></tr>\n'
    f'<tr><td>เครดิตเฉลี่ยถ่วงน้ำหนัก (วัน)</td><td>{WA25:.1f}</td><td>{WA26:.1f}</td>'
    f'<td class="neg">{WA26-WA25:.1f}</td><td class="neg">{(WA26/WA25-1)*100:.1f}%</td></tr>\n'
    f'<tr><td>เครดิตเฉลี่ยถ่วงน้ำหนัก <b>ตัดโครงการ มิ.ย. ออก</b></td><td>{WA25X:.1f}</td><td>{WA26X:.1f}</td>'
    f'<td class="pos">+{WA26X-WA25X:.1f}</td><td class="pos">+{(WA26X/WA25X-1)*100:.1f}%</td></tr>',
    'ytd-normalised-rows')

rep('<tr><td>Cost Saving (Repeat Product)</td><td>73,695</td><td>42,731</td><td class="neg">-30,964</td><td class="neg">-42.0%</td></tr>',
    f'<tr><td>Cost Saving (Repeat Product)</td><td>73,695</td><td>{nf(SAVE["cs"])}</td><td class="neg">-30,964</td><td class="neg">-42.0%</td></tr>',
    'ytd-cs-row')

rep('<div class="note">หมายเหตุ: ปีนี้ประหยัดรวมได้มากกว่าปีก่อน +75.5% (฿531,060 → ฿931,783) โดยเป็นผลจาก Price Negotiation ที่เพิ่มขึ้น +94.4% | ส่วน Cost Saving จากสินค้าซื้อซ้ำลดลงเพราะจำนวนรายการซื้อซ้ำน้อยกว่า | ยอดซื้อปี 2026 ถูกดันสูงจากโครงการใหญ่เดือน มิ.ย. (Standard Parts)</div>',
    f'''<div class="note">
      ปีนี้ประหยัดรวมได้มากกว่าปีก่อน +75.5% (฿531,060 → ฿{nf(TOT_SAVE)}) จาก Price Negotiation ที่เพิ่มขึ้น +94.4%<br>
      <span class="todo">⚠ ต้องพูดเอง อย่ารอให้ถาม:</span> <b>Cost Saving จากสินค้าซื้อซ้ำลดลง -42.0%</b> (฿73,695 → ฿{nf(SAVE['cs'])})
      — เหตุผลที่ระบุไว้คือจำนวนรายการซื้อซ้ำน้อยกว่าปีก่อน <span class="todo">⚠ รอทีมยืนยันตัวเลขจำนวนรายการเทียบปีต่อปี</span><br>
      ยอดซื้อปี 2026 ถูกดันสูงจากโครงการใหญ่เดือน มิ.ย. — ตัวเลขที่ควรใช้เทียบผลงานคือแถว "ตัดโครงการ มิ.ย. ออก" ด้านบน
    </div>''',
    'ytd-note')

# ================================================================ 15) HTML ข้อ 5: scope ราคาต่อหน่วย
rep('<div class="kpi"><div class="lbl">รายการที่ราคาเพิ่มขึ้น</div><div class="val">0 รายการ</div><div class="chg dim">ไม่มีสินค้าที่ราคา/หน่วยแพงขึ้น</div></div>',
    '<div class="kpi"><div class="lbl">รายการที่ราคาเพิ่มขึ้น</div><div class="val">0 รายการ</div>'
    '<div class="chg dim"><span class="todo">⚠ เฉพาะในขอบเขตที่วัด</span> — ดูหมายเหตุขอบเขตด้านล่าง</div></div>',
    'unit-price-kpi')

rep('<div class="note">ทุกรายการสินค้าซื้อซ้ำในปี 2026 มีราคาต่อหน่วยลดลงจากการเจรจา/เปลี่ยน supplier</div>',
    '<div class="note">ทุกรายการในขอบเขตที่วัดมีราคาต่อหน่วยลดลงจากการเจรจา/เปลี่ยน supplier</div>',
    'unit-price-note1')

rep('<div class="note">"ราคา/หน่วยเดิม" = Current Price list (ราคาอ้างอิงเดิม) | "ราคา/หน่วยใหม่" = ราคาที่เจรจาได้ครั้งนี้ | ข้อมูลจากไฟล์ Cost Saving รายเดือน</div>',
    f'''<div class="note">
      "ราคา/หน่วยเดิม" = Current Price list (ราคาอ้างอิงเดิม) | "ราคา/หน่วยใหม่" = ราคาที่เจรจาได้ครั้งนี้ | ข้อมูลจากไฟล์ Cost Saving รายเดือน<br>
      <b style="color:var(--orange);">ขอบเขตของตัวเลขนี้ (ต้องอธิบายให้ชัดก่อนถูกถาม):</b> นับเฉพาะ <u>สินค้าซื้อซ้ำที่มีการเจรจาราคาสำเร็จ</u> คิดเป็นมูลค่า ฿{nf(SCOPE['cs'])}
      หรือ <b>{SCOPE['cs']/T26*100:.2f}% ของยอดซื้อทั้งหมด</b> — จึงไม่ใช่ภาพราคาของทั้งพอร์ต และไม่ได้แปลว่าไม่มีสินค้าใดราคาขึ้นเลยในปีนี้<br>
      <span class="todo">⚠ สิ่งที่ควรเพิ่มรอบหน้า (ตามรูปแบบ TN):</span> ตารางราคาเฉลี่ย Avg.2025 vs Avg.2026 และ Q1 vs Q2 ของ<u>ทุกรายการที่ซื้อซ้ำ</u>
      โดยแสดง<b>ทั้งรายการที่ราคาขึ้นและลง</b> พร้อมคอลัมน์สาเหตุ (Supplier ปรับราคา / อัตราแลกเปลี่ยน / เปลี่ยนผู้ขาย) และตารางอัตราแลกเปลี่ยนสำหรับของนำเข้า
    </div>''',
    'unit-price-scope')

# ================================================================ 16) HTML ข้อ 6: Executive Summary
old_es_start = h.index('<thead><tr><th style="text-align:left;">ประเด็น</th><th style="text-align:left;">สรุป</th></tr></thead>')
old_es_end = h.index('</tbody>', old_es_start) + len('</tbody>')
std_tot = sum(MD['g26']['Standard Parts (Mech & Elec)'])
es = f'''<thead><tr><th style="text-align:left;">ประเด็น</th><th style="text-align:left;">สรุป</th></tr></thead>
<tbody>
<tr><td style="text-align:left;">ยอดซื้อรวม <span class="badge">+180.8%</span></td>
  <td style="text-align:left;">Jan–Jul 2026 ฿{T26/1e6:.2f}M เทียบปี 2025 ฿{T25/1e6:.2f}M — <b>แต่ ฿{MD['g26']['Standard Parts (Mech & Elec)'][5]/1e6:.2f}M (54% ของยอดทั้งปี) มาจากโครงการ Standard Parts เดือน มิ.ย. รายการเดียว</b><br>
  ตัดโครงการนี้ออก ยอดปกติเฉลี่ย ฿{NORM/1e6:.2f}M/เดือน เทียบปี 2025 ฿{(T25-MD['t25'][5])/6/1e6:.2f}M/เดือน ({pc(NORM,(T25-MD['t25'][5])/6)}) ซึ่งเป็นตัวเลขที่ควรใช้วัดผลงาน<br>
  คาดการณ์ทั้งปี 2026 ฿{FY_FCST/1e6:.2f}M</td></tr>
<tr><td style="text-align:left;">กระแสเงินสด <span class="badge">{WA26:.1f} วัน</span></td>
  <td style="text-align:left;"><b>เครดิตเฉลี่ยถ่วงน้ำหนักสั้นลงจาก {WA25:.1f} วัน เหลือ {WA26:.1f} วัน</b> เพราะโครงการ มิ.ย. ฿{credit['15d'][5]/1e6:.2f}M อยู่ใต้เครดิต 15 วัน<br>
  ตัดโครงการออกแล้วอยู่ที่ <span class="pos">{WA26X:.1f} วัน ดีกว่าปี 2025 ({WA25X:.1f} วัน) {WA26X-WA25X:.1f} วัน</span> — คือผลงานการเจรจาเทอมจริง<br>
  <span class="todo">⚠ ต้องเตรียมตอบ:</span> โครงการเครดิต 15 วันมูลค่า ฿{credit['15d'][5]/1e6:.1f}M กระทบกระแสเงินสดเดือนไหน และตรงกับแผนรับเงินจากลูกค้าหรือไม่</td></tr>
<tr><td style="text-align:left;">Saving <span class="badge gr">฿{nf(TOT_SAVE)}</span></td>
  <td style="text-align:left;">Cost Saving ฿{nf(SAVE['cs'])} ({SAVE['cs']/SCOPE['cs']*100:.2f}%) + Price Negotiation ฿{nf(NEGO_SAVE)} ({NEGO_SAVE/NEGO_SCOPE*100:.2f}%)
  = <b>{TOT_SAVE/TOT_SCOPE*100:.2f}% ของมูลค่าที่เข้ากระบวนการเจรจา</b> แต่เป็นเพียง <b>{TOT_SAVE/T26*100:.2f}% ของยอดซื้อรวม</b><br>
  กลุ่ม Engineering ทำ % Save สูงสุด {SAVE['eng']/SCOPE['eng']*100:.2f}% · Standard Parts ประหยัดมากสุด ฿{nf(SAVE['std'])}<br>
  ผ่านเป้า 5% ทุกเดือน ยกเว้น มิ.ย. (4.56%)</td></tr>
<tr><td style="text-align:left;">จุดต้องตัดสินใจ</td>
  <td style="text-align:left;">
  1. <b>Coverage การเจรจาเพียง {TOT_SCOPE/T26*100:.1f}% ของยอดซื้อ</b> — อีก {100-TOT_SCOPE/T26*100:.1f}% ยังไม่ผ่านกระบวนการ ควรตั้ง Coverage เป็น KPI คู่กับ % Saving<br>
  2. <b>กระจุกตัวที่ Standard Parts {std_tot/T26*100:.1f}%</b> ของยอดซื้อทั้งหมด — ยังไม่มีข้อมูลว่ากระจุกที่ supplier กี่ราย (รออัปเดตรอบหน้า)<br>
  3. <b>Cost Saving สินค้าซื้อซ้ำลดลง -42.0%</b> เทียบปีก่อน ต้องมีคำอธิบายและแผนแก้<br>
  4. ยังไม่มีข้อมูล <b>On-time Delivery</b> และ <b>Pending PO</b> ซึ่งเป็นหัวข้อหลักในรายงานฝั่ง TN</td></tr>
</tbody>'''
h = h[:old_es_start] + es + h[old_es_end:]
applied.append('exec-summary')

# ================================================================ 17) FOOTER
rep('<span>Source: Presentation_report_Jan-May_2026.xlsx | Purchasing Department</span>',
    '<span>Source: Purchasing Monthly Report / KPI-Purchasing 2026 (Jan–Jul) | Purchasing Department</span>',
    'footer-source')
rep('<span>Robot System Co., Ltd. — Confidential | Generated August 2026</span>',
    '<span>Robot System Co., Ltd. — Confidential | ฐาน: PO Issued · ข้อมูล ณ 31 ก.ค. 2026 · ปรับปรุง ส.ค. 2026 (v2)</span>',
    'footer-asof')

rep('<title>Procurement Executive Report | Jan–Jul 2026</title>',
    '<title>Procurement Executive Report | Jan–Jul 2026</title>',
    'noop-title2')

# ================================================================ เขียนไฟล์
open(OUT, 'w', encoding='utf-8').write(h)
print(f'OK  {SRC} ({orig_len:,} bytes) -> {OUT} ({len(h):,} bytes)')
print(f'patches applied: {len(applied)}')
for a in applied:
    print('  -', a)
print()
print('--- ตัวเลขสำคัญที่ใช้ ---')
print(f'2025 Jan-Jul        {T25:>15,.2f}')
print(f'2026 Jan-Jul        {T26:>15,.2f}')
print(f'credit25 total      {C25T:>15,.2f}  (residual {RESID25:,.2f})')
print(f'WA credit days      2025 {WA25:.1f} / 2026 {WA26:.1f} | ex-Jun 2025 {WA25X:.1f} / 2026 {WA26X:.1f}')
print(f'Saving scope        {TOT_SCOPE:>15,.2f}  save {TOT_SAVE:,.2f}  = {TOT_SAVE/TOT_SCOPE*100:.2f}%')
print(f'Coverage            {TOT_SCOPE/T26*100:.1f}%   saving/total spend {TOT_SAVE/T26*100:.2f}%')
print(f'Normal avg/mo       {NORM:>15,.2f}   FY forecast {FY_FCST:,.2f}')
