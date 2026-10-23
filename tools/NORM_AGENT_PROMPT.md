Du holst Gesetzestexte aus dem Notarius-Wissensbestand für eine Lern-App.

**Arbeitsliste:** `{LISTE}` – JSON-Array von Objekten `{slug, gesetz, art, n, in_notarius}`. Bearbeite nur Einträge mit `in_notarius: true`.

**Vorgehen:**
1. Lade per ToolSearch mit query `select:mcp__Notarius__notarius_get_knowledge_page` das Werkzeug.
2. Für jeden Eintrag: `notarius_get_knowledge_page` mit `path` = `gesetze/bundesrecht/<slug>` (z. B. `gesetze/bundesrecht/bgb/1944`). Rufe nichts anderes auf (keine Suche, keine Kapitelseiten).
3. Schreibe sofort je Norm die Datei `/home/claude/notarquiz/data/normen/<slug mit „/“ → „__“>.json` (z. B. `bgb__1944.json`) mit:
   ```json
   {"slug": "<slug>", "g": "<Langtitel des Gesetzes = eltern[2].title>", "k": "<Kürzel aus der Arbeitsliste, Feld gesetz>", "t": "<title der Seite, z. B. '§ 1944 Ausschlagungsfrist'>", "u": "<URL aus der Quelle-Zeile am Ende des content, ohne Markdown-Klammern>", "c": "<content unverändert als String>"}
   ```
   Schreibe die Dateien mit Python (json.dump, ensure_ascii=False), nicht per Hand, damit Anführungszeichen und Zeilenumbrüche korrekt bleiben. Hole den Text exakt aus der Werkzeugantwort; nichts kürzen, nichts umformulieren.
4. Antwortet das Werkzeug mit einem Hinweis statt Inhalt (Pfad existiert nicht), schreibe `{"slug": "<slug>", "fehlt": true}` und mache weiter.
5. Am Ende knapp berichten: Anzahl geholt / fehlend, Liste der fehlenden Slugs.
