"""Screenshots + Durchlauf-Test der App im Mobil-Viewport. Aufruf: python3 tools/shot.py [out_dir]"""
import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/86badd10-9d20-5c3c-a2bf-2d5bb95d4685/scratchpad/shots'
os.makedirs(out, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd='/home/claude/notarquiz', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
fehler = []
gesehen = set()

def schritt(pg):
    """Beantwortet die aktuell sichtbare Frage bzw. klickt weiter. Liefert False, wenn nichts zu tun."""
    if pg.query_selector('#sicher'): pg.click('#sicher'); return True
    if pg.query_selector('#weiter'): pg.click('#weiter'); return True
    if pg.query_selector('.zo.l:not([disabled])'):
        if 'zuordnung' not in gesehen: pg.screenshot(path=f'{out}/05-zuordnung.png', full_page=True); gesehen.add('zuordnung')
        for li in range(5):
            l = pg.query_selector(f'.zo[data-l="{li}"]:not([disabled])')
            if not l: continue
            l.click(); pg.click(f'.zo[data-r="{li}"]'); time.sleep(0.1)
        return True
    if pg.query_selector('.sachverhalt') and 'fall' not in gesehen:
        pg.screenshot(path=f'{out}/06-fall.png', full_page=True); gesehen.add('fall')
    if pg.query_selector('.option:not([disabled])'):
        pg.click('.option:not([disabled]) >> nth=0')
        if 'aufl' not in gesehen: time.sleep(0.4); pg.screenshot(path=f'{out}/04-aufloesung.png', full_page=True); gesehen.add('aufl')
        return True
    return False

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, locale='de-DE')
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: fehler.append(str(e)))
        pg.on('console', lambda m: fehler.append('console.' + m.type + ': ' + m.text) if m.type == 'error' and 'TUNNEL' not in m.text else None)
        pg.goto('http://127.0.0.1:8765/')
        pg.wait_for_selector('.einstieg', timeout=10000)
        pg.screenshot(path=f'{out}/01-einstieg.png')
        pg.click('#los'); pg.wait_for_selector('.siegel-wrap')
        pg.screenshot(path=f'{out}/02-home.png', full_page=True)
        pg.click('[data-modus="tagesziel"]'); pg.wait_for_selector('.urkunde')
        pg.screenshot(path=f'{out}/03-frage.png', full_page=True)
        for i in range(80):
            if pg.query_selector('.ergebnis'): break
            if not schritt(pg): time.sleep(0.3)
            time.sleep(0.25)
        if not pg.query_selector('.ergebnis'): print('HAENGT BEI:', pg.inner_text('#app')[:300]); pg.screenshot(path=f'{out}/99-haengt.png', full_page=True)
        pg.wait_for_selector('.ergebnis', timeout=5000)
        pg.screenshot(path=f'{out}/07-ergebnis.png', full_page=True)
        if pg.query_selector('.ernennung'): pg.screenshot(path=f'{out}/07b-ernennung.png'); pg.click('#urkZu')
        pg.click('#home'); pg.wait_for_selector('.siegel-wrap'); pg.screenshot(path=f'{out}/08-home2.png', full_page=True)
        # Blitzrunde kurz anspielen
        pg.click('[data-modus="blitz"]'); pg.wait_for_selector('.urkunde')
        for i in range(6):
            if pg.query_selector('.option:not([disabled])'): pg.click('.option:not([disabled]) >> nth=0')
            time.sleep(0.6)
        pg.screenshot(path=f'{out}/12-blitz.png', full_page=True)
        if not pg.query_selector('.ergebnis'): pg.click('#abbr')
        pg.wait_for_selector('.ergebnis'); pg.click('#home'); pg.wait_for_selector('.siegel-wrap')
        pg.click('[data-tab="gebiete"]'); time.sleep(0.3); pg.screenshot(path=f'{out}/09-gebiete.png', full_page=True)
        pg.click('.gebiet >> nth=0'); time.sleep(0.3); pg.screenshot(path=f'{out}/09b-wahl.png', full_page=True)
        pg.click('[data-tab="statistik"]'); time.sleep(0.3); pg.screenshot(path=f'{out}/10-statistik.png', full_page=True)
        pg.click('[data-tab="profil"]'); time.sleep(0.3); pg.screenshot(path=f'{out}/11-profil.png', full_page=True)
        # Dunkelmodus
        pg.select_option('#theme', 'dark'); pg.click('[data-tab="home"]'); time.sleep(0.3); pg.screenshot(path=f'{out}/13-dunkel.png', full_page=True)
        # iPad-Breite
        pg.set_viewport_size({'width': 820, 'height': 1180}); time.sleep(0.3); pg.screenshot(path=f'{out}/14-ipad.png', full_page=True)
        b.close()
finally:
    srv.terminate()
print('Fehler:', *fehler, sep='\n  ') if fehler else print('keine JS-Fehler')
