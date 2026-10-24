# Stand 24.10.2026

- Live: https://rntystr.github.io/notarquiz/ – 2.462 Fragen, 19 Kapitel, alle Handbuchseiten abgedeckt.
- Gesetzestext-Overlay: 1.118 Normtexte aus Notarius, gegen frische Notarius-Antworten gelesen (Sichtvergleich, kein Diff). Nicht in Notarius: EGBGB, MaBV, DONot u. a. (Fallback-Link zu dejure.org). 23 weitere zitierte Normen sind in Notarius, aber nicht geholt.
- Normangaben ohne Beleg auf der Handbuchseite entfernt (`tools/normen_pruefen.py --fix`).
- Tagesziel Standard 10 Fragen.

## Offen
1. Eigenen Sync-Code unter Profil setzen (Test-Code `probe-sync-2026` liegt in Firestore).
2. Handbuch-Hinweise (`tools/HANDBUCH_HINWEISE.md`) an die Redaktion.
3. Optional: restliche 23 Normen holen (`tools/normen_extract.py` → `NORM_AGENT_PROMPT.md`).
