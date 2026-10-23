"""Führt data/fragen/*.json zusammen, validiert nach FRAGEN_SCHEMA.md und schreibt data/fragen.json.
Aufruf: python3 tools/build.py   (aus dem Projektordner)"""
import json, glob, os, sys, re, hashlib
from collections import Counter, defaultdict

MANIFEST = 'data/manifest.json'
QUELLEN = sorted(glob.glob('data/fragen/*.json'))
AUS = 'data/fragen.json'
TYPEN = {'mc', 'rf', 'zuordnung', 'fall'}

man = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {'kapitel': []}
kap_titel = {k['slug']: k['titel'] for k in man['kapitel']}
seiten = {}
for k in man['kapitel']:
    for a in k.get('abschnitte', []):
        for s in a.get('seiten', []):
            seiten[s['path']] = (k['slug'], a['titel'], s['titel'])

fehler, warn = [], []
alle, ids, texte = [], set(), set()

def pruefe_mc(q, wo, pfad):
    opt = q.get('optionen')
    if not isinstance(opt, list) or len(opt) != 4 or not all(isinstance(o, str) and o.strip() for o in opt):
        return fehler.append(f'{wo}: {pfad} mc braucht 4 Optionen')
    if not isinstance(q.get('antwort'), int) or not 0 <= q['antwort'] < 4:
        return fehler.append(f'{wo}: {pfad} antwort muss Index 0–3 sein')
    if len(set(o.strip().lower() for o in opt)) < 4:
        fehler.append(f'{wo}: {pfad} doppelte Optionen')
    if not q.get('frage', '').strip():
        fehler.append(f'{wo}: {pfad} frage fehlt')

for datei in QUELLEN:
    wo = os.path.basename(datei)
    try:
        liste = json.load(open(datei, encoding='utf-8'))
    except Exception as e:
        fehler.append(f'{wo}: kein gültiges JSON ({e})'); continue
    if not isinstance(liste, list):
        fehler.append(f'{wo}: kein Array'); continue
    praefixe = Counter(q['id'].split('-')[0] for q in liste if isinstance(q.get('id'), str) and '-' in q['id'])
    erwartet_pref = praefixe.most_common(1)[0][0] if praefixe and '__' in wo else None
    for i, q in enumerate(liste):
        pfad = f'#{i} ({q.get("id","?")})'
        if erwartet_pref and isinstance(q.get('id'), str) and not q['id'].startswith(erwartet_pref + '-'):
            warn.append(f'{wo}: {pfad} fremdes Präfix, übersprungen'); continue
        ok = True
        for feld in ('id', 'kapitel', 'seite', 'quelle', 'typ', 'schwierigkeit', 'erklaerung'):
            if feld not in q or q[feld] in ('', None):
                fehler.append(f'{wo}: {pfad} Feld {feld} fehlt'); ok = False
        if not ok: continue
        if q['typ'] not in TYPEN: fehler.append(f'{wo}: {pfad} typ {q["typ"]} unbekannt'); continue
        if q['schwierigkeit'] not in (1, 2, 3): fehler.append(f'{wo}: {pfad} schwierigkeit {q["schwierigkeit"]}'); continue
        if q['kapitel'] not in kap_titel and kap_titel: fehler.append(f'{wo}: {pfad} kapitel {q["kapitel"]} nicht im Manifest'); continue
        if seiten and q['quelle'] not in seiten:
            # tolerante Normalisierung: ae/oe/ue-Varianten
            norm = q['quelle'].replace('ae', 'a').replace('oe', 'o').replace('ue', 'u')
            kand = [p for p in seiten if p.replace('ae', 'a').replace('oe', 'o').replace('ue', 'u') == norm]
            if kand: q['quelle'] = kand[0]
            else: warn.append(f'{wo}: {pfad} quelle nicht im Manifest: {q["quelle"]}')
        t = q['typ']
        if t == 'mc': pruefe_mc(q, wo, pfad)
        elif t == 'rf':
            if not isinstance(q.get('antwort'), bool): fehler.append(f'{wo}: {pfad} rf antwort muss true/false sein')
            if not q.get('frage', '').strip(): fehler.append(f'{wo}: {pfad} frage fehlt')
        elif t == 'zuordnung':
            p = q.get('paare')
            if not isinstance(p, list) or not 3 <= len(p) <= 5 or not all(isinstance(x, list) and len(x) == 2 and all(isinstance(y, str) and y.strip() for y in x) for x in p):
                fehler.append(f'{wo}: {pfad} zuordnung braucht 3–5 Paare [links, rechts]')
            elif len(set(x[1].strip().lower() for x in p)) < len(p): fehler.append(f'{wo}: {pfad} rechte Seiten nicht eindeutig')
            if not q.get('frage', '').strip(): fehler.append(f'{wo}: {pfad} frage fehlt')
        elif t == 'fall':
            if not q.get('sachverhalt', '').strip(): fehler.append(f'{wo}: {pfad} sachverhalt fehlt')
            st = q.get('schritte')
            if not isinstance(st, list) or not 2 <= len(st) <= 4: fehler.append(f'{wo}: {pfad} fall braucht 2–4 schritte')
            else:
                for j, s in enumerate(st):
                    pruefe_mc(s, wo, f'{pfad} schritt {j}')
                    if not s.get('erklaerung', '').strip(): fehler.append(f'{wo}: {pfad} schritt {j} erklaerung fehlt')
            if not q.get('frage', '').strip(): q['frage'] = 'Fall'
        if not isinstance(q.get('normen'), list): q['normen'] = []
        if len(q['erklaerung']) < 40: warn.append(f'{wo}: {pfad} erklaerung sehr kurz')
        # Globale ID: Datei-Präfix sichert Eindeutigkeit
        gid = f'{wo[:-5]}:{q["id"]}'
        if gid in ids: fehler.append(f'{wo}: {pfad} id doppelt'); continue
        ids.add(gid); q['id'] = gid
        schl = re.sub(r'\W+', ' ', (q.get('frage', '') + ' ' + q.get('sachverhalt', '')).lower()).strip()
        if schl in texte: warn.append(f'{wo}: {pfad} Fragetext doppelt'); continue
        texte.add(schl)
        if q['quelle'] in seiten:
            k, a, s = seiten[q['quelle']]; q['kapitel'] = k; q['abschnitt'] = a; q['seite'] = s
        POS = re.compile(r'(Option|Antwort|Variante|Alternative)\s*\(?[A-D1-4]\)?\b|\b(erste|zweite|dritte|vierte|letzte)n?\s+(Option|Antwort|Alternative|Variante)', re.I)
        if t == 'mc' and POS.search(q.get('erklaerung', '')): q['fest'] = True
        if t == 'fall':
            for st in q.get('schritte', []):
                if POS.search(st.get('erklaerung', '')) or POS.search(q.get('erklaerung', '')): st['fest'] = True
        alle.append(q)

if fehler:
    print(f'{len(fehler)} Fehler:'); [print('  ' + f) for f in fehler[:80]]
if warn:
    print(f'{len(warn)} Warnungen:'); [print('  ' + w) for w in warn[:40]]

kapitel = [{'slug': k['slug'], 'titel': k['titel'], 'anzahl': sum(1 for q in alle if q['kapitel'] == k['slug'])} for k in man['kapitel']] if man['kapitel'] else \
    [{'slug': s, 'titel': s, 'anzahl': n} for s, n in Counter(q['kapitel'] for q in alle).items()]
kapitel = [k for k in kapitel if k['anzahl'] > 0]
os.makedirs('data', exist_ok=True)
json.dump({'version': 1, 'anzahl': len(alle), 'kapitel': kapitel, 'fragen': alle}, open(AUS, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'\n{len(alle)} Fragen aus {len(QUELLEN)} Dateien → {AUS} ({os.path.getsize(AUS)//1024} KB)')
print('Typen:', dict(Counter(q['typ'] for q in alle)), ' Schwierigkeit:', dict(sorted(Counter(q['schwierigkeit'] for q in alle).items())))
for k in kapitel: print(f'  {k["anzahl"]:5d}  {k["titel"]}')
sys.exit(1 if fehler else 0)
