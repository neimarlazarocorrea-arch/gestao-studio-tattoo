import pathlib
p=pathlib.Path('public/agenda.html')
text=p.read_text(encoding='utf-8')
lines=text.splitlines()
start=None
end=None
for i,l in enumerate(lines):
    if '<title>Agenda - Tattoo Studio Pro</title>' in l:
        start=i
    if '</head>' in l and start is not None and i>start:
        end=i
        break
if start is not None and end is not None:
    newlines = lines[:start+1]
    newlines.append('  <link rel="stylesheet" href="/css/agenda.css" />')
    newlines.extend(lines[end:])
    p.write_text("\n".join(newlines), encoding='utf-8')
    print('head cleaned')
else:
    print('start/end not found', start, end)
