import io, re

p = 'assets/b.cfg.js'
s = io.open(p, encoding='utf-8').read()
old = '{"k":"t9","nm":"HYTJ-9标中铁五局","en":"路基填筑","tag":"TJ-9","da":266,"a":0.42,"ca":162.36,"db":151,"b":0.32,"cb":143.06}'
new = '{"k":"t9","nm":"HYTJ-9标中铁五局","en":"路基填筑","tag":"TJ-9","da":316.5,"a":0.42,"ca":162.36,"db":178.7,"b":0.32,"cb":143.06}'
assert s.count(old) == 1, s.count(old)
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
print('b.cfg.js t9 design updated')
