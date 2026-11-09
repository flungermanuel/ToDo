# FlungDo v2.0: Datenbank und professionelles Fundament

Fokus dieser Version: Die Speicherschicht wird von JSON auf SQLite umgestellt, ohne dass sich UI oder Core ändern.
Zusätzlich: Datensicherheit, Tests, Messung und automatische Prüfungen. Die App soll danach als Portfolio-Projekt vorzeigbar sein.

## Vorgehen
1. Erst Plan vorlegen (Plan-Modus), noch keinen Code schreiben. Der Plan nennt pro Schritt Ziel, betroffene Dateien und Risiken.
2. Schichten aus der CLAUDE.md strikt einhalten. `src/renderer` und `src/core` dürfen sich durch V2 nicht verändern (Ausnahme: Export/Import-Buttons und Fehlermeldungen in der UI).
3. Pro Schritt ein Commit, nach origin/main pushen, am Ende Tag `v2.0`.
4. Entscheidungen kurz begründen. Ich will jede davon später erklären können.
5. Neue Libraries nur nach Rückfrage, mit Begründung und Alternative.

## Schritt 1: Datensicherheit (vor allem anderen)
- Schreiben der JSON-Datei atomar machen: erst in eine Temp-Datei im selben Ordner, dann umbenennen.
- Automatische Sicherung vor jeder Migration (`todo-data.backup-v<alteVersion>.json`), maximal die letzten 5 behalten.
- Export-Button: gesamte Daten als JSON-Datei speichern (Dateidialog).
- Import-Button: JSON laden, Version prüfen, bei Bedarf migrieren, vor dem Überschreiben bestätigen lassen und vorher automatisch sichern.
- Beide Buttons im Bereich Einstellungen der Seitenleiste.

## Schritt 2: Storage-Interface schärfen
- Aktuellen Stand des Interfaces (load/save) prüfen und im Plan beschreiben.
- Gemeinsame Vertragstests (Contract-Tests): dieselbe Testsuite läuft gegen jede Implementierung (`JsonStorage` jetzt, `SqliteStorage` danach). Sie prüft: leerer Start, speichern und laden ergibt dieselben Daten, Beziehungen bleiben erhalten (Kategorie, Unteraufgaben, Todo ↔ Deadline), Sonderzeichen und Emojis, große Datenmengen.
- Im Plan zwei Varianten gegenüberstellen und eine empfehlen:
  - A) Interface bleibt `load()/save(AppData)`, SQLite speichert alles in einer Transaktion
  - B) Feingranulare Methoden (z. B. `addTodo`, `toggleTodo`) statt ganzer Snapshots
  - Hinweis: A ist einfacher und genügt vermutlich. B ist sauberer bei vielen Daten. Die Messung in Schritt 6 soll die Entscheidung stützen.

## Schritt 3: SQLite-Implementierung
- Im Plan klären, welche Bibliothek zu unserer Electron-Version passt: `node:sqlite` (eingebaut) oder `better-sqlite3` (nativer Code, muss für Electron gebaut und im Installer richtig entpackt werden). Mit Vor- und Nachteilen, dann Rückfrage an mich.
- Reines SQL in kleinen, gut lesbaren Funktionen (Repository-Stil), kein ORM.
- Schema mit Tabellen für Kategorien, Todos, Unteraufgaben, Deadlines und Prüfungen, mit Fremdschlüsseln und sinnvollen Indizes (z. B. auf Datum).
- Schema-Version über `PRAGMA user_version`, Migrationen als nummerierte Dateien, die beim Start automatisch laufen (analog zu `migrations.ts`).
- Alle Schreibzugriffe in Transaktionen. Datenbankdatei: `%APPDATA%/FlungDo/flungdo.db`.
- Die bestehende Regel bleibt: Der Renderer kennt keine Dateien oder SQL, alles läuft über IPC.

## Schritt 4: Übernahme der JSON-Daten
- Beim ersten Start mit vorhandener `todo-data.json` und noch ohne Datenbank: automatisch sichern, in die Datenbank übernehmen und prüfen, dass Anzahl und Inhalt von Kategorien, Todos, Unteraufgaben, Deadlines und Prüfungen übereinstimmen.
- Danach wird die JSON-Datei zu `todo-data.migrated.json` umbenannt und nicht gelöscht.
- Schlägt etwas fehl: nichts verändern, klare Fehlermeldung in der UI, die alte Datei bleibt aktiv.
- Tests mit alten Datenständen (Version 1 bis 4) als Fixtures.

## Schritt 5: Verpacken und Installer testen
- `npm run dist` muss einen Installer erzeugen, in dem SQLite funktioniert (nativer Code korrekt eingebunden, falls nötig).
- Prüfen auf einem Rechner ohne Entwicklungsumgebung (oder frischem Windows-Benutzer): installieren, Daten anlegen, App schließen und neu starten, über eine ältere Version drüberinstallieren (Daten bleiben erhalten), deinstallieren.
- Ergebnisse und Stolpersteine kurz in `docs/packaging.md` festhalten.

## Schritt 6: Performance messen
- Skript `scripts/seed.mjs`, das eine Testdatenbank mit 1.000, 5.000 und 10.000 Todos erzeugt (mit Kategorien, Unteraufgaben, Deadlines).
- Messen: Startzeit bis zur sichtbaren Oberfläche, Speicherzeit einer Änderung, Laden der Tages-, Wochen- und Kalenderansicht. Jeweils für JSON und SQLite.
- Ergebnisse als Tabelle in `docs/performance.md`. Nur dort optimieren, wo es messbar langsam ist (z. B. Re-Renders, Listen-Virtualisierung), und das Vorher/Nachher dokumentieren.

## Schritt 7: Automatische Prüfungen (CI)
- GitHub Actions Workflow: bei jedem Push und Pull Request laufen `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` und `npm run build`.
- Optional: Workflow, der bei einem Tag `v*` den Windows-Installer baut und an ein GitHub Release hängt.
- Status-Badge im README.

## Schritt 8: Dokumentation fürs Portfolio
- `README.md`: Kurzbeschreibung, Screenshot, Funktionen, Tech-Stack, Installation und Entwicklung (`npm run dev`, `npm run dist`), bekannte Einschränkungen (z. B. unsignierter Installer, nur Windows).
- `docs/architecture.md`: Schichtenmodell (UI, Core, Storage) mit einer Skizze, Datenfluss über IPC, Datenmodell, Migrationen.
- `docs/decisions.md`: kurze Entscheidungsnotizen (je 3 bis 5 Sätze), z. B. "Warum SQLite statt JSON?", "Warum Electron?", "Warum reines SQL statt ORM?".
- CLAUDE.md auf den tatsächlichen Stand bringen: Zeilen zu Speicherung und "keine Datenbank" aktualisieren, Befehle ergänzen, V1 als abgeschlossen markieren und den Widerspruch "Nicht in V1: Kalender" entfernen.

## Nicht in v2.0
Handy- oder Cloud-Sync, KI-Eingabe, Wiederholungen, Erinnerungen, globaler Hotkey, neue Funktionen in der UI.

## Fertig, wenn
- [ ] Datenverlust ist praktisch ausgeschlossen: atomares Schreiben, automatische Backups, Export und Import funktionieren
- [ ] Contract-Tests laufen für JSON und SQLite grün
- [ ] Altdaten (Version 1 bis 4) werden korrekt in die Datenbank übernommen, Zählung stimmt
- [ ] Die App verhält sich in der UI exakt wie vorher, `src/renderer` und `src/core` sind unverändert
- [ ] Der installierte Installer läuft auf einem sauberen Rechner, Update über eine ältere Version erhält die Daten
- [ ] `docs/performance.md` enthält gemessene Werte für 1.000, 5.000 und 10.000 Todos
- [ ] CI läuft bei jedem Push grün
- [ ] README, Architekturübersicht und Entscheidungsnotizen sind vorhanden, CLAUDE.md ist aktuell
- [ ] Tag `v2.0` gesetzt