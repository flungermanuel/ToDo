# FlungDo v3.0: KI-Eingabe

Ziel: Ein Eingabefeld, in das ich Freitext auf Deutsch tippe. Daraus entstehen Vorschau-Karten für Todos, Deadlines und Prüfungen, die ich bestätige. Die KI läuft lokal über Ollama. Nichts wird ohne meine Bestätigung gespeichert.

Beispiel: "Freitag Abgabe Statistik, Mama anrufen, Prüfung Analysis am 12. Februar"
ergibt drei Karten: Deadline (Abgabe Statistik, nächster Freitag), Todo (Mama anrufen, Kategorie Persönlich), Prüfung (Analysis, 12. Februar).

## Vorgehen
1. Erst Plan vorlegen (Plan-Modus), noch keinen Code schreiben. Pro Schritt Ziel, betroffene Dateien, Risiken.
2. Schichten aus der CLAUDE.md strikt einhalten:
   - `src/core/capture`: Schema, Validierung, Datumsauflösung (reine Funktionen, keine Imports aus UI, Main oder Netzwerk)
   - `src/main/ai`: Provider-Schnittstelle, Ollama-Provider, Fake-Provider
   - `src/renderer`: nur Darstellung der Eingabe und der Vorschau
   - Kommunikation nur über preload und IPC. Der Renderer kennt keine URLs, Modelle oder Keys.
3. Pro Schritt ein Commit, nach origin/main pushen, am Ende Tag `v3.0`.
4. Entscheidungen kurz begründen, neue Libraries nur nach Rückfrage (Vorschlag für Schema-Validierung: Zod, bitte begründen).
5. CI muss ohne Ollama grün laufen (Tests nutzen den Fake-Provider und gemocktes HTTP).

## Hardware-Rahmen (wichtig für alle Entscheidungen)
Entwickelt und getestet wird auf einem Laptop mit 16 GB RAM und integrierter Intel-Grafik, voraussichtlich Betrieb auf der CPU. Daraus folgt:
- Standardmodell ist ein kleines Modell (3B bis 4B Parameter, 4-Bit). Welches genau, entscheidet die Evaluation (Schritt 7).
- Kurze Prompts, kurze Ausgaben, großzügiger Timeout (60 s), sichtbarer Ladezustand, `keep_alive` hoch setzen (z. B. 30 Minuten), damit das Modell nicht nach jeder Eingabe neu geladen wird.
- Das Modell soll so wenig wie möglich rechnen müssen: Datumsberechnung und Validierung macht der Code.

## Schritt 1: Schema und Validierung (src/core/capture)
Ergebnis einer Analyse ist eine Liste von Einträgen. Ein Eingabetext kann mehrere Einträge ergeben.

Felder pro Eintrag:
- `typ`: "todo" | "deadline" | "pruefung"
- `titel`: kurzer, bereinigter Titel (ohne Datumsangabe und Füllwörter)
- `datumText`: die Datumsangabe so, wie sie im Eingabetext steht (z. B. "übernächsten Freitag"), oder leer. Das Modell berechnet kein Datum.
- `kategorie`: Name einer vorhandenen Kategorie oder leer
- `prioritaet`: 1 bis 5, nur wenn der Text es nahelegt ("dringend", "wichtig"), sonst weglassen (Standard bleibt 3)

Regeln:
- Deadline und Prüfung brauchen ein Datum. Fehlt oder scheitert es, bleibt die Karte erhalten, ist als "Datum fehlt" markiert und kann erst nach Eingabe eines Datums übernommen werden.
- Todo darf ohne Datum bleiben (Bereich "Ohne Datum").
- Unbekannte oder leere Kategorie wird auf die aktuell gewählte Kategorie, sonst die erste, gesetzt. Abgleich ohne Beachtung von Groß- und Kleinschreibung.
- Leere oder überlange Titel (über 120 Zeichen) werden abgelehnt bzw. gekürzt, mit Hinweis.
- Unbrauchbare Einträge werden verworfen, ohne die anderen zu verlieren.
- Alles, was vom Modell kommt, gilt als unvertraut: Es wird nur gegen das Schema geprüft und nie ausgeführt. Der Eingabetext wird dem Modell als Daten übergeben, nicht als Anweisung.

## Schritt 2: Datumsauflösung (src/core/capture)
Reine Funktion `resolveDate(datumText, heute)` für deutsche Ausdrücke. Wochenstart Montag, lokale Daten ohne Zeitzonen-Umrechnung.

Zu unterstützen:
- heute, morgen, übermorgen
- Wochentage: "Freitag" (nächster Freitag nach heute), "diesen Freitag" (Freitag der laufenden Woche), "nächsten Freitag", "übernächsten Freitag"
- relativ: "in 3 Tagen", "in 2 Wochen", "in einem Monat", "nächste Woche Mittwoch"
- absolut: "12. Februar", "12.2.", "12.02.2027" (ohne Jahr: nächstes Vorkommen in der Zukunft)
- Ausdrücke mit Uhrzeit: Uhrzeit wird ignoriert und bleibt im Titel (Uhrzeiten gibt es in V3 noch nicht)
- nicht erkannt: Ergebnis "unbekannt" (führt zur Karte mit "Datum fehlt")

Die genauen Regeln (z. B. was "Freitag" bedeutet, wenn heute Freitag ist) im Plan festhalten und durch Tests absichern: Monatsgrenzen, Jahreswechsel, Schaltjahr, Sommerzeit-Umstellung, Wochenstart.

## Schritt 3: parseInput und Provider-Schnittstelle mit Fake-Provider
- `parseInput(text, kontext)` liefert eine validierte Eintragsliste oder einen klaren Fehler.
- Kontext: heutiges Datum samt Wochentag, Namen der Kategorien, aktuell gewählte Kategorie.
- Provider-Interface in `src/main/ai`, erste Implementierung `FakeProvider` mit festen Antworten für Tests und Entwicklung ohne Modell.
- Der komplette Ablauf (Eingabe, Analyse, Vorschau, Übernehmen) funktioniert mit dem Fake-Provider, bevor Ollama angeschlossen wird.

## Schritt 4: Ollama-Provider (src/main/ai)
- Lokale Adresse `http://127.0.0.1:11434`, Aufruf über `/api/chat`, Antwort im erzwungenen JSON-Format nach dem Schema (Ollama kann `format` mit JSON-Schema), Temperatur 0.
- Prompt kurz und deutsch: Aufgabe, Schema, heutiges Datum samt Wochentag, Kategorienliste und wenige Beispiele. Prompt als Datei im Projekt, nicht im Code vergraben.
- Bei ungültiger Antwort genau ein Wiederholungsversuch, danach Fehler.
- Fehlerfälle mit verständlichen Meldungen: Ollama nicht erreichbar, Modell nicht installiert (Hinweis auf den Befehl zum Herunterladen), Timeout, ungültige Antwort.
- Fehlerfall bedeutet nie Datenverlust: Es öffnet sich das normale Formular mit dem Rohtext als Titel.
- Abbrechen der laufenden Anfrage muss möglich sein.
- Verfügbare Modelle über Ollama abfragen (für die Auswahl in den Einstellungen).

## Schritt 5: Eingabe und Vorschau (UI)
Zwei Zugänge zur selben Funktion:
- Fest im Todo-Widget ein Eingabefeld (Platzhalter z. B. "Schreib einfach los …")
- Schnellleiste mit `Strg+K` (zentriertes Overlay, Esc schließt)

Ablauf:
- Enter startet die Analyse, sichtbarer Ladezustand ("Analysiere …"), Abbrechen mit Esc.
- Vorschau als Karten: Typ-Chip, Titel (editierbar), Datum (mit Datumswahl), Kategorie, Priorität. Jede Karte kann einzeln entfernt werden.
- Karten mit fehlenden Pflichtfeldern sind markiert, "Übernehmen" ist erst möglich, wenn alles gesetzt ist.
- Enter bzw. Button "Übernehmen" legt alle Einträge über die bestehenden Core-Funktionen an. Esc verwirft.
- Danach Hinweis "3 Einträge angelegt" mit "Rückgängig" (gleiches Prinzip wie beim Löschen).
- Eine Deadline-Karte hat einen Schalter "Todo dazu anlegen" (Standard aus), der ein verknüpftes Todo erzeugt.
- Auch bei Ablehnung oder Fehler bleibt der Eingabetext erhalten, bis ich ihn selbst lösche.
- Design wie der Rest der App: ruhig, minimal, Hell- und Dunkelmodus, weiche Animationen.

## Schritt 6: Einstellungen
- Bereich "KI-Eingabe" in der Seitenleiste unter Einstellungen: Provider (vorerst Ollama), Modell aus der Liste wählen, Statusanzeige "Ollama erreichbar / nicht erreichbar" mit kurzer Einrichtungsanleitung.
- Klarer Hinweis, dass bei Ollama keine Daten den Rechner verlassen.
- Ablage der Einstellungen im Plan entscheiden (z. B. eigene Tabelle `settings` in der Datenbank) und begründen.
- Eingaben und Modellantworten werden nicht gespeichert und nicht geloggt.

## Schritt 7: Evaluation
- `eval/cases.json` mit 40 deutschen Beispielsätzen und erwartetem Ergebnis, abgedeckt sind:
  - einfache Todos, Deadlines, Prüfungen
  - mehrere Einträge in einem Satz
  - Datumsvarianten (relativ, Wochentag, absolut)
  - Prioritätshinweise ("dringend", "wichtig")
  - Kategorien-Zuordnung
  - Störfälle: Umgangssprache, Tippfehler, fehlendes Datum, Text ohne Aufgabe (darf nichts ergeben)
- Skript `npm run eval -- --provider ollama --model <name>`: Trefferquote für Typ, Titel (tolerant verglichen), Datum und Kategorie, dazu mittlere und längste Dauer.
- Ergebnis für mindestens zwei Modelle als Tabelle in `docs/evaluation.md`, dazu die Entscheidung, welches Modell Standard wird und warum.
- Die Evaluation läuft nur manuell, nicht in der CI.

## Schritt 8 (optional, nur nach meiner Freigabe): Claude-Provider
Noch nicht entschieden. Wenn freigegeben:
- zweiter Provider hinter derselben Schnittstelle, Modell klein und schnell
- API-Key sicher mit Electrons `safeStorage` speichern, nie im Klartext und nie im Renderer
- deutlicher Hinweis in den Einstellungen, dass Eingaben an eine Cloud gesendet werden, und Verweis auf ein Ausgabenlimit in der Anthropic Console
- Ergebnis in die Evaluationstabelle aufnehmen (lokal gegen Cloud: Genauigkeit, Dauer, Datenschutz)

## Tests
- Core: Schema und Validierung, Datumsauflösung (Randfälle siehe Schritt 2), Kategorien-Abgleich
- Fake-Provider: kompletter Ablauf von Eingabe bis Anlegen und Rückgängig
- Ollama-Provider mit gemocktem HTTP: Erfolg, kaputtes JSON mit Wiederholung, Timeout, nicht erreichbar, Modell fehlt
- Alles läuft ohne Ollama und ohne Netzwerk in der CI

## Dokumentation
- README: neuer Abschnitt "KI-Eingabe" mit Einrichtung von Ollama, Modellempfehlung und kurzem Beispiel (idealerweise GIF oder Screenshot der Vorschau)
- `docs/decisions.md`: Einträge zu "Warum lokal mit Ollama", "Warum berechnet der Code das Datum statt des Modells", "Warum Vorschau mit Bestätigung"
- `docs/evaluation.md`: Ergebnisse aus Schritt 7
- CLAUDE.md aktualisieren: neue Ordner, Befehle (`npm run eval`), Regeln für die KI-Schicht

## Nicht in v3.0
Chatverlauf oder Chatbot-Fenster, Agentenschleife (kommt als V4), Tagesplanung, Unteraufgaben-Vorschläge, Sprachaufnahme, Englisch, Uhrzeiten, Wiederholungen, globaler Hotkey und Tray (Kandidat für v3.1).

## Fertig, wenn
- [ ] Freitext wird zu korrekten Karten für Todo, Deadline und Prüfung, auch mehrere pro Satz
- [ ] Nichts wird ohne Bestätigung gespeichert, Übernehmen ist mit einem Klick rückgängig zu machen
- [ ] Datumsangaben werden vom Code aufgelöst und sind durch Tests abgesichert
- [ ] Bei Fehlern (Ollama aus, Modell fehlt, Timeout, kaputte Antwort) bleibt die App benutzbar und der Text geht nicht verloren
- [ ] Eingabefeld im Widget und Schnellleiste mit `Strg+K` funktionieren
- [ ] Einstellungen zeigen Status und erlauben die Modellwahl
- [ ] Evaluation liegt für mindestens zwei Modelle vor, das Standardmodell ist begründet
- [ ] `src/core` und `src/renderer` kennen keine Netzwerk- oder Modelldetails, CI läuft grün ohne Ollama
- [ ] Der installierte Installer funktioniert mit der KI-Eingabe (Ollama muss separat installiert sein)
- [ ] README, Entscheidungsnotizen und CLAUDE.md sind aktuell, Tag `v3.0` gesetzt
