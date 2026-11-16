# Evaluation der KI-Eingabe

Welches lokale Modell soll Freitext in Todos, Deadlines und Prüfungen umwandeln? Gemessen mit
`npm run eval -- --provider ollama --model <name>` (Skript: `scripts/eval.mjs`, Fälle:
`eval/cases.json`). Die Evaluation läuft nur manuell, nie in der CI.

## Aufbau

- **40 deutsche Beispielsätze** mit von Hand gerechneten Erwartungen, „heute“ ist fest der
  Montag, 16.11.2026. Die Sätze sind andere als die drei Beispiele im Prompt.
- Bereiche: einfache Todos (6), Deadlines (6), Prüfungen (5), mehrere Einträge in einem
  Satz (6), Datumsvarianten (7), Priorität (3), Kategorien (3), Störfälle (4: Umgangssprache,
  Tippfehler, fehlendes Datum, Text ohne Aufgabe).
- Jeder Satz läuft durch dasselbe `parseInput` wie in der App, also mit Prüfung und
  `resolveDate`. Gemessen wird das Ende der Kette, nicht das rohe Modell.
- **Alles richtig** heißt: jeder erwartete Eintrag gefunden, Typ, Datum (und wo erwartet
  Kategorie und Priorität) stimmen, und es gibt keinen Eintrag zu viel.
- Titel werden tolerant verglichen (Hälfte der Wörter muss vorkommen), damit „Übungsblatt 5
  abgeben“ und „Abgabe Übungsblatt 5“ als gleich gelten.
- Die Dauer ist die Zeit pro Eingabe ohne das erste Laden des Modells (separat angegeben).

Gerät: Laptop mit 16 GB RAM und integrierter Intel-Grafik, Betrieb auf der CPU,
Ollama 0.40.16, Temperatur 0, `keep_alive` 30 Minuten.

## Ergebnis

| | gemma3:4b | llama3.2:3b |
|---|---|---|
| Größe auf der Platte | 3,4 GB | 2,0 GB |
| **Alles richtig** | **37 von 40** | 31 von 40 |
| Typ (Todo/Deadline/Prüfung) | 96 % | 87 % |
| Titel | 98 % | 100 % |
| Datum | 96 % | 94 % |
| Kategorie | 100 % | 100 % |
| Priorität | 100 % | 100 % |
| Text ohne Aufgabe bleibt leer | 1 von 1 | 1 von 1 |
| Fehler (keine Antwort) | 0 | 0 |
| Dauer pro Eingabe, Mittel | 14,1 s | **5,2 s** |
| Dauer pro Eingabe, längste | 17,7 s | **12,9 s** |
| Erstes Laden des Modells | 16,3 s | 18,7 s |

Komplett richtige Fälle nach Bereich:

| Bereich | gemma3:4b | llama3.2:3b |
|---|---|---|
| einfaches Todo | 6/6 | 6/6 |
| Deadline | 6/6 | 6/6 |
| Prüfung | 5/5 | 5/5 |
| mehrere Einträge | 6/6 | 4/6 |
| Datum | 6/7 | 2/7 |
| Priorität | 2/3 | 2/3 |
| Kategorie | 3/3 | 3/3 |
| Störfall | 3/4 | 3/4 |

## Wo die Modelle scheitern

**gemma3:4b** (3 Fälle):
- „Auto zum TÜV bringen in einem Monat“: Datum richtig (16.12.), aber als Deadline statt
  Todo. Vertretbar, in der Vorschau per Typ-Schalter änderbar.
- „Irgendwann mal den Keller aufräumen“: nichts geliefert. Das Modell hat „irgendwann mal“
  als Absichtserklärung statt als Aufgabe gelesen. Die einzige echte Lücke: Ein Todo geht
  verloren, wenn man nicht nachsieht. In der App erscheint dann „Keine Aufgabe erkannt“ mit
  dem Knopf „Trotzdem als Todo anlegen“, der Text bleibt erhalten.
- „muss unbedingt noch bis fr die hausarbeit abgeben“: Typ stimmt, aber „fr“ ist keine
  Datumsangabe, die `resolveDate` kennt. Die Karte zeigt „Datum fehlt“. Gewollt: lieber
  nachfragen als raten.

**llama3.2:3b** (9 Fälle): Es macht deutlich mehr Fehler bei Mehrfacheinträgen und Daten.
- Es legt **doppelte oder erfundene Einträge** an („Geschenk besorgen“ als Deadline *und*
  als Todo, „Weihnachtsgeschenke kaufen“ zusätzlich zum eingepackten Geschenk, ein Eintrag
  „vereinbaren“). Das ist der unangenehmste Fehlertyp, weil die Karten stimmen sehen können.
- Es hält Todos mit Datum oft für Deadlines (Typ 87 % statt 96 %).
- Es verliert Datumsangaben („Wohnung putzen“ bei „bis Sonntag“, „Auto zum TÜV bringen in
  einem Monat“) und legt die Stipendium-Frist (Datum und Priorität stimmen) als Todo statt
  als Deadline an.

## Entscheidung: gemma3:4b ist das Standardmodell

Die Genauigkeit entscheidet. Mit `gemma3:4b` sind 37 von 40 Sätzen komplett richtig, mit
`llama3.2:3b` 31 von 40, und die Fehler von Llama sind die, die am meisten Arbeit machen:
überzählige Karten, falsche Typen, verlorene Daten. Die Vorschau fängt Fehler zwar ab, aber
eine Eingabe, die man erst bereinigen muss, ist langsamer als gleich ein Todo zu tippen.

Dagegen steht die Dauer: 14 s statt 5 s auf der CPU. Das ist spürbar, aber für eine Eingabe,
die ohnehin mit „Analysiere …“, Abbrechen mit Esc und anschließender Bestätigung abläuft,
vertretbar. Das erste Laden (rund 16 s) fällt nur einmal an, danach hält `keep_alive` das
Modell 30 Minuten im Speicher.

`llama3.2:3b` bleibt als schnellere Alternative in den Einstellungen wählbar, für alle, die
Tempo vor Genauigkeit stellen.

## Grenzen dieser Messung

- **40 Sätze, ein Lauf pro Modell.** Bei Temperatur 0 ist die Ausgabe fast deterministisch,
  aber ein Unterschied von ein bis zwei Fällen ist kein belastbarer Beweis. Der Abstand
  zwischen den Modellen (6 Fälle) ist groß genug, um die Richtung zu zeigen.
- **Die Sätze habe ich geschrieben**, nicht echte Eingaben aus dem Alltag. Gerade Umgangs-
  sprache und Tippfehler sind mit je einem Fall dünn belegt.
- Der **Prompt wurde nicht gegen diese Fälle optimiert**, die drei Beispiele darin kommen
  in den 40 Sätzen nicht vor. Ein besserer Prompt (zum Beispiel Hinweise zu „irgendwann
  mal“ oder zu Wochentags-Abkürzungen) könnte beide Modelle verbessern.
- Zeiten gelten für diesen Laptop. Auf schnellerer Hardware oder mit GPU wäre `gemma3:4b`
  deutlich schneller.
- Weitere Modelle (zum Beispiel `qwen2.5:3b`) wurden nicht gemessen. Wer eines testen will:
  `ollama pull <name>` und `npm run eval -- --provider ollama --model <name>`.
- Das Claude-Modell aus dem optionalen Schritt 8 der Aufgabe ist nicht umgesetzt und nicht
  gemessen.
