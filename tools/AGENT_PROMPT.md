Du erzeugst Quizfragen für eine Lern-App für Notarassessoren aus dem „Handbuch mit Notarwissen“ (Notarius).

**Dein Arbeitspaket:** `{CHUNK}` (JSON mit `seiten[]`, je Seite `path`, `titel`, `abschnitt`; Zielausgabe in `datei`).

**Vorgehen:**
1. Lies `/home/claude/notarquiz/tools/FRAGEN_SCHEMA.md` vollständig; es ist verbindlich.
2. Lade per ToolSearch mit query `select:mcp__Notarius__notarius_get_knowledge_page` das Werkzeug.
3. Für jede Seite des Pakets, in Reihenfolge:
   a. `notarius_get_knowledge_page` mit `path` aufrufen (falls ein Pfad nicht gefunden wird, Umlaut-Variante probieren: „a“→„ae“, „o“→„oe“, „u“→„ue“ in den Slugs, z. B. `bautraegervertrag`; schlägt beides fehl, Seite überspringen und im Bericht nennen).
   b. Den Inhalt (Feld `content`) als Datei `/home/claude/notarquiz/data/raw/<kapitel>/<letztes-pfadsegment>.md` sichern (Titel als erste Zeile `# Titel`, dann Inhalt).
   c. Aus Anwendungsbereich, Kernaussagen und Praxishinweisen 2–5 Fragen nach Schema bilden (im Schnitt 3; dichte Seiten mehr, dünne weniger). Das Feld `quelle` = `path` aus dem Paket (nicht die normalisierte Rückgabe), `kapitel` = Kapitel-Slug aus dem Paket, `abschnitt`/`seite` aus dem Paket.
   d. Fragen sofort an die Ausgabedatei anhängen (Datei als JSON-Array pflegen; nach jeder Seite mit Python neu schreiben, damit bei Abbruch nichts verloren geht).
4. Am Ende die Ausgabedatei mit `python3 -I -c "import json;d=json.load(open('{DATEI}'));print(len(d))"` auf Gültigkeit prüfen.

**Zu Fragetypen:** mind. 60 % `mc`, ca. 20 % `rf`, ca. 10 % `zuordnung`, ca. 10 % `fall` (nur bei Seiten mit anwendungsnahem Stoff, 2–4 Schritte).

**Kernanforderung:** Die Erklärung muss den Lerneffekt tragen: Sie nennt Norm und Grund, benennt den Fehler der naheliegendsten falschen Option und bleibt beim Inhalt der Seite. Keine Fragen nach Fundstellen, Autoren, Rechtsstand.

**IDs:** `{PRAEFIX}-001`, `{PRAEFIX}-002`, … fortlaufend.

Antworte am Ende knapp: Anzahl Seiten geladen/übersprungen, Anzahl Fragen je Typ, Auffälligkeiten (z. B. Seiten ohne Kernaussagen).
