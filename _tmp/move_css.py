import io

BLOCK = """
/* 2026-11-26: B 页「各报表填报时间与责任单位」右侧并排「各报表对接人」，两卡等高 */
.pg-sched-row{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:14px;align-items:stretch;margin-bottom:14px}
.pg-sched-row > .card{display:flex;flex-direction:column;min-height:0;margin:0}
.pg-sched-row > .card > .card-body{flex:1 1 auto;min-height:0;overflow:auto}
.cnt-tbl th,.cnt-tbl td{padding:5px 4px}
.cnt-tbl .cnt-nm{white-space:nowrap;font-weight:600}
.cnt-tbl .cnt-jl{font-weight:600;color:#0F2C5C;background:#F8FAFE}
/* 右侧两卡（地市州月报 / 产值周报）纵向铺满，与左侧工程月报等高 */
.pg-col-r{display:flex;flex-direction:column;gap:12px;min-height:0}
.pg-col-r > .card{display:flex;flex-direction:column;min-height:0;margin:0}
.pg-col-r > .card > .card-body{flex:1 1 auto;min-height:0;overflow:auto}
@media (max-width:1180px){.pg-sched-row{grid-template-columns:1fr}}
"""

a = io.open('assets/a.css', encoding='utf-8').read()
assert BLOCK in a
io.open('assets/a.css', 'w', encoding='utf-8').write(a.replace(BLOCK, ''))

b = io.open('assets/b.css', encoding='utf-8').read()
b = b + BLOCK
io.open('assets/b.css', 'w', encoding='utf-8').write(b)
print('moved B css to b.css', len(b))
