"""Prüft, ob jede in `normen` genannte Vorschrift auf der zugehörigen Handbuchseite vorkommt
(Paragraf/Artikel-Nummer und Gesetzeskürzel im Rohtext). Nicht belegte Normen werden entfernt.
Aufruf: python3 tools/normen_pruefen.py [--fix] [datei-muster]"""
import json, glob, os, re, sys

fix = '--fix' in sys.argv
muster = [a for a in sys.argv[1:] if not a.startswith('--')] or ['data/fragen/*.json']
ALIAS = {'WEG': ['WEG', 'WoEigG'], 'WoEigG': ['WEG', 'WoEigG'], 'ErbbauRG': ['ErbbauRG', 'ErbbauVO'], 'BauGB': ['BauGB'], 'GVO': ['GVO', 'GrdstVV']}

def rohtext(q):
    teile = q['quelle'].split('/')
    kap, slug = teile[1], teile[-1]
    for kand in (slug, slug.replace('ae', 'a').replace('oe', 'o').replace('ue', 'u')):
        p = f'data/raw/{kap}/{kand}.md'
        if os.path.exists(p): return open(p, encoding='utf-8').read()
    # Fallback: Datei mit gleichem Titel suchen
    for p in glob.glob(f'data/raw/{kap}/*.md'):
        if open(p, encoding='utf-8').readline().strip('# \n') == q.get('seite'): return open(p, encoding='utf-8').read()
    return None

def belegt(norm, text):
    m = re.search(r'([A-ZÄÖÜ][A-Za-zÄÖÜäöüß]*[A-Za-z])\s*$', norm.strip())
    nums = re.findall(r'(?:§§?|Art\.?)\s*(\d+[a-z]?)', norm)
    if not m or not nums: return True  # nicht prüfbar (z. B. KV-Nummern, Richtlinien) -> behalten
    gesetze = ALIAS.get(m.group(1), [m.group(1)])
    if not any(g in text for g in gesetze): return False
    return all(re.search(r'(?:§§?|Art\.?)\s*(?:[\d\w]+,\s*)*' + re.escape(n) + r'\b', text) for n in nums[:1])

ges = ent = ohne = 0
for f in sorted(set(sum((glob.glob(m) for m in muster), []))):
    d = json.load(open(f, encoding='utf-8')); geaendert = False
    for q in d:
        text = rohtext(q)
        if text is None: ohne += 1; continue
        alt = q.get('normen') or []
        neu = [n for n in alt if belegt(n, text)]
        ges += len(alt)
        if neu != alt:
            ent += len(alt) - len(neu)
            print(f"{q['id']}: entfernt {[n for n in alt if n not in neu]}")
            q['normen'] = neu; geaendert = True
    if fix and geaendert: json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{ges} Normangaben geprüft, {ent} ohne Beleg auf der Seite{" entfernt" if fix else ""}, {ohne} Fragen ohne Rohtext')
