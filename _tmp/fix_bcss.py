import io, re

p = 'assets/b.css'
s = io.open(p, encoding='utf-8').read()
start = s.find('\n"\n      + "@page')
assert start > 0, 'marker not found'
end = s.find('\n      + "\n', start)
assert end > 0
s2 = s[:start] + '\n' + s[end + len('\n      + "'):]
io.open(p, 'w', encoding='utf-8').write(s2)
print('removed broken js remnant', len(s) - len(s2))
print(repr(s2[s2.find('.pg-sched-row') - 60: s2.find('.pg-sched-row') + 120]))
