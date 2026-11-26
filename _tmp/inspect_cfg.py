import json, re, sys

for f in ['assets/a.cfg.js', 'assets/b.cfg.js']:
    s = open(f, encoding='utf-8').read()
    print(f, 'len', len(s), 'has_tsf', '"tsf"' in s)
    m = re.search(r'\{"k":"t9"[^}]*\}', s)
    print('  t9:', m.group(0) if m else None)
