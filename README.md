# Notarquiz

Lern-App für Notarassessoren. Fragen aus dem „Handbuch mit Notarwissen“ (Notarius), Spaced Repetition (Leitner), Tagesziel, Blitzrunde, Fallstudien, geräteübergreifender Fortschritt über Firestore (Sync-Code).

- `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.json` – die App (PWA, kein Build nötig)
- `data/fragen.json` – zusammengeführter Fragenkatalog (erzeugt von `tools/build.py` aus `data/fragen/*.json`)
- `data/manifest.json` – Kapitel-/Seitenstruktur des Handbuchs
- `tools/FRAGEN_SCHEMA.md` – Schema für neue Fragen
- `tools/shot.py` – Durchlauf-Test mit Screenshots (Playwright)

## Firestore-Regel

```
match /notarquiz/{doc} {
  allow read, write: if doc.size() >= 24;
}
```
