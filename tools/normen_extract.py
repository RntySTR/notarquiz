"""Sammelt alle zitierten Normen aus data/fragen/*.json, bildet Notarius-Pfade und schreibt
data/normen_todo.json (noch fehlende) sowie data/normen.json (Zusammenführung aus data/normen/*.json).
Aufruf: python3 tools/normen_extract.py"""
import json, glob, os, re
from collections import Counter

SLUG = {'BGB':'bgb','BNotO':'bnoto','BeurkG':'beurkg','GBO':'gbo','GNotKG':'gnotkg','GmbHG':'gmbhg','HGB':'hgb','InsO':'inso','FamFG':'famfg','ZPO':'zpo','ZVG':'zvg','UmwG':'umwg-1995','ErbStG':'erbstg-1974','GrEStG':'grestg-1983','GwG':'gwg-2017','WEG':'woeigg','WoEigG':'woeigg','ErbbauRG':'erbbauv','ErbbauVO':'erbbauv','BauGB':'bbaug','AktG':'aktg','GenG':'geng','PartGG':'partgg','LPartG':'lpartg','NotAktVV':'notaktvv','PStG':'pstg','VwVfG':'vwvfg','BewG':'bewg','GBV':'gbvfg','GrdstVG':'grdstvg','GVO':'grdstvv','VRegV':'vregv','ZTRV':'ztrv','WHG':'whg-2009','RSiedlG':'rsiedlg','BNatSchG':'bnatschg-2009','BGBEG':'egbgb'}
NOTARIUS = set(SLUG.values())

def parse(text):
    out = []
    for t in re.split(r'\s*(?:i\.\s?V\.\s?m\.|iVm|;|\bund\b(?=\s*§)|\bsowie\b)\s*', text, flags=re.I):
        m = re.search(r'([A-ZÄÖÜ][A-Za-zÄÖÜäöüß]*[A-Za-z]*(?:\s\d{4})?)\s*$', t)
        if not m: continue
        kurz = re.sub(r'\s\d{4}$', '', m.group(1)).strip()
        for mm in re.finditer(r'(§§?|Art\.?|Artikel)\s*((?:\d+[a-z]?(?:\s*(?:,|bis|–|-)\s*)?)+)', t):
            for n in re.split(r'\s*(?:,|bis|–|-)\s*', mm.group(2)):
                if re.fullmatch(r'\d+[a-z]?', n):
                    out.append((kurz, 'Art.' if 'Art' in mm.group(1) else '§', n, (SLUG.get(kurz) or kurz.lower()) + '/' + n))
    return out

alle = Counter(); meta = {}
for f in glob.glob('data/fragen/*.json'):
    try: liste = json.load(open(f, encoding='utf-8'))
    except Exception: continue
    for q in liste:
        for n in q.get('normen') or []:
            for kurz, art, num, slug in parse(n):
                alle[slug] += 1; meta[slug] = (kurz, art, num)

# vorhandene Texte zusammenführen
os.makedirs('data/normen', exist_ok=True)
normen = {}
for f in glob.glob('data/normen/*.json'):
    try:
        e = json.load(open(f, encoding='utf-8'))
        if e.get('c'): normen[e['slug']] = {k: e[k] for k in ('g', 'k', 't', 'c', 'u') if k in e}
    except Exception: pass
json.dump(normen, open('data/normen.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

fehlt = [{'slug': s, 'gesetz': meta[s][0], 'art': meta[s][1], 'n': meta[s][2], 'zitate': c, 'in_notarius': s.split('/')[0] in NOTARIUS} for s, c in alle.most_common() if s not in normen]
json.dump(fehlt, open('data/normen_todo.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(alle)} verschiedene Normen zitiert, {len(normen)} Texte vorhanden, {len(fehlt)} fehlen ({sum(1 for x in fehlt if x["in_notarius"])} davon in Notarius verfügbar)')
print('Gesetze ohne Notarius-Quelle:', dict(Counter(x['gesetz'] for x in fehlt if not x['in_notarius']).most_common(25)))
