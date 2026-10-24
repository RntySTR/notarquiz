Du prüfst gespeicherte Gesetzestexte gegen den Notarius-Wissensbestand und korrigierst Abweichungen.

**Arbeitsliste:** `{LISTE}` – JSON-Array `{slug, gesetz, art, n, in_notarius}`. Bearbeite alle Einträge, für die `/home/claude/notarquiz/data/normen/<slug mit „/“ → „__“>.json` existiert und kein Feld `fehlt` enthält.

**Hintergrund:** Die Dateien wurden von Hand aus Werkzeugantworten abgetippt; Tippfehler (vertauschte, fehlende oder erfundene Buchstaben, Wörter, Absätze, Zahlen) sind möglich. Der Text muss dem Original exakt entsprechen.

**Vorgehen:**
1. Lade per ToolSearch mit query `select:mcp__Notarius__notarius_get_knowledge_page` das Werkzeug.
2. Je Eintrag: `notarius_get_knowledge_page` mit `path` = `gesetze/bundesrecht/<slug>` aufrufen, die Datei mit Read lesen und das Feld `c` Wort für Wort, Zahl für Zahl und Satzzeichen für Satzzeichen mit `content` der Werkzeugantwort vergleichen. Prüfe auch, dass kein Absatz, Satz oder Halbsatz fehlt oder hinzugefügt ist, und `t` gegen `title`.
3. Bei Abweichung: nur die betroffene Stelle in der Datei korrigieren (Python: Datei laden, `c.replace(falsch, richtig)` mit genau einem Treffer prüfen, mit `json.dump(..., ensure_ascii=False)` zurückschreiben). Den Text aus der Werkzeugantwort übernehmen, nicht aus der Datei. Keine Umformulierung, keine Glättung von Quelltext-Eigenheiten (z. B. zusammengezogene Aufzählungen „a)bei“).
4. Hilfsskripte nur in `<scratchpad>/v<Listennummer>/`.
5. Bericht (knapp): Anzahl geprüft, Anzahl mit Abweichung/korrigiert, je Korrektur Slug und Art des Fehlers.
