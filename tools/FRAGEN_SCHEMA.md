# Fragen-Schema Notarquiz

Jede Datei `data/fragen/<kapitel-slug>__<teil>.json` ist ein JSON-Array von Fragen-Objekten.

## Gemeinsame Felder (alle Typen)

| Feld | Typ | Inhalt |
|---|---|---|
| `id` | string | `<kapitelkürzel>-<laufnummer>` – Kürzel = die ersten 4 Buchstaben des Kapitel-Slugs + Teilnummer, z. B. `baut1-007`. Muss innerhalb der Datei eindeutig sein. |
| `kapitel` | string | Kapitel-Slug exakt wie im Manifest (z. B. `grundstuckskaufvertrag`) |
| `abschnitt` | string | Abschnittstitel aus dem Manifest |
| `seite` | string | Seitentitel aus dem Manifest |
| `quelle` | string | `path` der Seite aus dem Manifest |
| `typ` | `"mc"` \| `"rf"` \| `"zuordnung"` \| `"fall"` | Fragentyp |
| `schwierigkeit` | 1 \| 2 \| 3 | 1 = Grundwissen (Definition, Norm, Grundregel), 2 = Anwendung (Voraussetzungen, Rechtsfolgen, Abgrenzung), 3 = Vertiefung (Streitstand, Ausnahme, Gestaltungsfalle, Rechtsprechung) |
| `normen` | string[] | 1–4 einschlägige Normen, Kurzform wie im Text („§ 3 Abs. 1 Nr. 2 MaBV“) |
| `erklaerung` | string | 2–5 Sätze, erklärt warum die richtige Antwort richtig ist und warum die naheliegendste falsche falsch ist. Mit Norm. Keine Floskeln. |

## Typ `mc` (Multiple Choice, genau eine richtige Antwort)

```json
{"typ":"mc","frage":"…","optionen":["A","B","C","D"],"antwort":2}
```
- Genau 4 Optionen, `antwort` = Index (0–3) der richtigen. Richtige Position zufällig verteilen (nicht immer 0).
- Distraktoren müssen plausibel sein (echte Nachbarnormen, häufige Fehlvorstellungen, nahe Fristen/Zahlen), keine offensichtlichen Scherzantworten.
- Optionen ähnlich lang; keine „alle/keine der genannten“.

## Typ `rf` (Richtig/Falsch)

```json
{"typ":"rf","frage":"Aussage als Behauptung.","antwort":false}
```
- `antwort` boolean. Etwa hälftig richtig/falsch. Falsche Aussagen müssen einen konkreten, lernrelevanten Fehler enthalten (falsche Norm, vertauschte Rechtsfolge, falsche Frist), nicht bloße Verneinung.

## Typ `zuordnung` (Paare)

```json
{"typ":"zuordnung","frage":"Ordne die Voraussetzungen nach § 3 Abs. 1 MaBV ihrer Nummer zu.","paare":[["links","rechts"],["links","rechts"],["links","rechts"],["links","rechts"]]}
```
- 3–5 Paare. Linke Seite: Begriff/Norm, rechte Seite: Aussage/Rechtsfolge. Rechte Seiten müssen eindeutig unterscheidbar sein.

## Typ `fall` (mehrstufiger Fall)

```json
{"typ":"fall","sachverhalt":"3–6 Sätze konkreter Sachverhalt mit Namen (A, B, Bauträger B-GmbH …).","schritte":[
  {"frage":"…","optionen":["…","…","…","…"],"antwort":1,"erklaerung":"…"},
  {"frage":"…","optionen":["…","…","…","…"],"antwort":0,"erklaerung":"…"}
]}
```
- 2–4 Schritte, aufeinander aufbauend (Zulässigkeit → Voraussetzung → Rechtsfolge → Gestaltung). Jeder Schritt wie `mc`. Feld `frage` auf Fallebene = kurzer Falltitel. `erklaerung` auf Fallebene = Gesamtlösung in 2–3 Sätzen.

## Qualitätsregeln

1. Nur Inhalte aus der jeweiligen Handbuchseite verwenden; nichts aus eigenem Wissen ergänzen, was der Seite widerspricht. Normen und Zahlen exakt aus dem Text.
2. Pro Seite im Schnitt 3 Fragen (2–5 je nach Dichte): mind. 1× `mc`; `rf` und `zuordnung` einstreuen; `fall` nur bei Seiten mit anwendungsnahem Stoff (ca. jede 4. Seite).
3. Schwierigkeitsverteilung je Datei ungefähr 30 % / 45 % / 25 %.
4. Fragen prüfbar und eindeutig: ein Notarassessor mit dem Text vor sich muss die Antwort zweifelsfrei bestimmen können. Keine Fragen nach Fundstellen, Autoren, Auflagen oder Rechtsstandsdatum.
5. Keine Fragen, deren Antwort im Fragetext steht. Keine Doppelungen innerhalb der Datei.
6. Sprache: präzise juristische Fachsprache, Sie-Form vermeiden, keine Einleitungsfloskeln.
7. Praxishinweise der Seite sind guter Stoff für Schwierigkeit 2–3 (Gestaltungsfragen: „Welche Regelung sollte der Notar aufnehmen …“).
