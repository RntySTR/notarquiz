"""Teilt das Manifest in Arbeitspakete (max. N Seiten) für die Fragengenerierung: data/chunks/<kapitel>__<n>.json"""
import json, os, sys
N = int(sys.argv[1]) if len(sys.argv) > 1 else 18
man = json.load(open('data/manifest.json', encoding='utf-8'))
os.makedirs('data/chunks', exist_ok=True)
gesamt = 0
for k in man['kapitel']:
    if sum(len(a['seiten']) for a in k['abschnitte']) != k['seiten_erwartet']: print('unvollständig:', k['slug']); continue
    seiten = []
    for a in k['abschnitte']:
        for s in a['seiten']:
            seiten.append({'path': s['path'], 'titel': s['titel'], 'abschnitt': a['titel']})
    teile = max(1, round(len(seiten) / N))
    groesse = -(-len(seiten) // teile)
    for i in range(teile):
        teil = seiten[i * groesse:(i + 1) * groesse]
        if not teil: continue
        name = f"{k['slug']}__{i + 1}"
        json.dump({'kapitel': k['slug'], 'kapitel_titel': k['titel'], 'teil': i + 1, 'teile': teile, 'datei': f'data/fragen/{name}.json', 'seiten': teil}, open(f'data/chunks/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        gesamt += 1
        print(f'{name:55s} {len(teil):3d} Seiten')
print(gesamt, 'Pakete')
