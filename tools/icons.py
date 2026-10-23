"""Erzeugt die App-Icons: Siegel-Motiv (Doppelring, Paragraf) auf Tinte."""
from PIL import Image, ImageDraw, ImageFont
import os
os.makedirs('icons', exist_ok=True)
TINTE = (31, 42, 68); SIEGEL = (163, 31, 52); GOLD = (184, 144, 46); PAPIER = (245, 243, 236)

def icon(size, maskable=False):
    S = 1024
    im = Image.new('RGB', (S, S), TINTE)
    d = ImageDraw.Draw(im)
    pad = 0 if maskable else 0
    cx = cy = S // 2
    r = int(S * (0.34 if maskable else 0.40))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=PAPIER)
    d.ellipse((cx - r + 28, cy - r + 28, cx + r - 28, cy + r - 28), outline=SIEGEL, width=14)
    d.ellipse((cx - r + 62, cy - r + 62, cx + r - 62, cy + r - 62), outline=SIEGEL, width=6)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', int(r * 1.15))
    except Exception:
        f = ImageFont.load_default()
    txt = '§'
    bb = d.textbbox((0, 0), txt, font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.text((cx - w / 2 - bb[0], cy - h / 2 - bb[1] - 8), txt, font=f, fill=SIEGEL)
    return im.resize((size, size), Image.LANCZOS)

icon(192).save('icons/icon-192.png')
icon(180).save('icons/icon-180.png')
icon(512).save('icons/icon-512.png')
icon(512, True).save('icons/icon-512-maskable.png')
print('ok')
