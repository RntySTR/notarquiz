# Stand 23.10.2026, 22:40

- Live: https://rntystr.github.io/notarquiz/ – 2.145 Fragen, 19 Kapitel (9 davon teilweise).
- Gesetzestext-Overlay: 249 Normtexte aus Notarius; neue Normen noch nicht nachgeholt (`tools/normen_extract.py` → `NORM_AGENT_PROMPT.md`).
- Normangaben ohne Beleg auf der Handbuchseite entfernt (`tools/normen_pruefen.py --fix`).

## Offene Pakete (Fortsetzung: AGENT_PROMPT.md, nur fehlende Seiten bearbeiten)
| Paket | Seiten erledigt |
|---|---|
| vorkaufs-ankaufs-und-wiederkaufsrechte__1 | 15/21 |
| vormerkung-und-verfugungsbeschrankungen__1 | 12/23 |
| wohnungseigentum-und-erbbaurecht__1 | 12/18 |
| wohnungseigentum-und-erbbaurecht__2 | 9/18 |
| wohnungseigentum-und-erbbaurecht__3 | 12/18 |
| wohnungseigentum-und-erbbaurecht__4 | 9/18 |
| wohnungseigentum-und-erbbaurecht__5 | 8/17 |
| zwangsvollstreckung-und-vollstreckbare-urkunde__1 | 6/17 |
| zwangsvollstreckung-und-vollstreckbare-urkunde__2 | 4/16 |

## Danach
1. Normtexte für neu zitierte Normen holen; Texte für MaBV/EGBGB/DONot (nicht in Notarius) klären.
2. `normen_pruefen.py --fix`, `build.py`, `shot.py`, Push.
3. Handbuch-Hinweise (`tools/HANDBUCH_HINWEISE.md`) an Redaktion.
