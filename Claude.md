# FlungDo

FlungDo: cleane Desktop-Todo-App für Windows mit moderner, an macOS orientierter Optik.
Persönliches Lernprojekt: Fokus auf saubere Architektur und nachvollziehbaren Code.

## Tech-Stack
- Electron (Desktop-Hülle, Build mit electron-builder zur .exe)
- React + Vite + TypeScript
- Tailwind CSS, shadcn/ui, Lucide Icons, Framer Motion
- Speicherung (seit V2.0): SQLite-Datenbank %APPDATA%/FlungDo/flungdo.db über das eingebaute
  `node:sqlite`, reines SQL ohne ORM. Bis V1.3: JSON-Datei todo-data.json im selben Ordner
  (wird beim ersten Start übernommen, bis V1: %APPDATA%/todo)
- Kein Backend/Server, kein Sync, keine KI

## Architektur (strikt einhalten)
Drei getrennte Schichten:
1. UI (src/renderer): nur Darstellung, kennt keine Dateien
2. Logik (src/core): reine Funktionen für Aufgaben/Deadlines/Kategorien
   (anlegen, ändern, sortieren, gruppieren, überfällig prüfen), keine UI- oder Datei-Importe
3. Speicherung (src/main/storage): hinter dem Interface `Storage`
   (load/save/flush/backup/close); `SqliteStorage` (Standard), `JsonStorage` (Übernahme aus 1.x,
   Vergleichsmessungen). `createStorage` wählt beim Start. Jede Implementierung muss den
   Storage-Vertrag erfüllen (`__tests__/storageContract.ts`)

- Kommunikation Renderer ↔ Main nur über preload + contextBridge (IPC), nodeIntegration aus
- Spätere KI-Anbindung kommt als austauschbare Funktion parseInput(text) dazu, noch nicht bauen
- Details: docs/architecture.md, Entscheidungen: docs/decisions.md

## Datenmodell
```ts
Priority = 1 | 2 | 3 | 4 | 5            // 1 = niedrigste, 5 = höchste, Standard 3
Category = { id, name, farbe }          // farbe: red | orange | yellow | green | blue | purple | gray
Subtask  = { id, titel, erledigt }
Todo     = { id, titel, erledigt, erstelltAm, prioritaet, unteraufgaben: Subtask[],
             categoryId, datum?: IsoDate, deadlineId?: string }
Deadline = { id, titel, datum /* "YYYY-MM-DD" */, erledigt, prioritaet }
Exam     = { id, titel, datum }       // Prüfung: wird nicht abgehakt, ist nach ihrem Tag vorbei
AppData  = { version: 4, categories: Category[], todos: Todo[], deadlines: Deadline[], exams: Exam[] }
```

Versionen des Datenformats (Migration in src/main/storage/migrations.ts, vorher automatische
Sicherung `todo-data.backup-v<alt>-<zeit>.json`, die letzten 5 bleiben):
- 1 (V1): ohne Kategorien → Startkategorien anlegen, alle Todos nach „Persönlich“
- 2 (V1.1): mit Kategorien
- 3 (V1.2): Todos mit optionalem Datum (ältere bleiben „ohne Datum“)
- 4 (V1.3): Prüfungen (ältere Dateien starten mit leerer Prüfungsliste)

Datenbankschema (src/main/storage/sqlite/migrations/, Version in PRAGMA user_version):
- 1 (V2.0): Tabellen categories, todos, subtasks, deadlines, exams (STRICT, mit position für
  die Reihenfolge), Fremdschlüssel, Index auf datum. Prüfungen nie strenger als migrate()

Datum & Zeit (V1.2):
- „Effektives Datum“ eines Todos = eigenes Datum, sonst Datum der verknüpften Deadline
- Neues Todo bekommt den angezeigten Tag, anderes Datum am Eingabefeld wählbar
- Woche = Montag bis Sonntag, Kalenderwoche nach ISO 8601, Sa/So farblich abgesetzt
- Überfällige offene Todos: in der heutigen Tagesansicht (bzw. vor der angezeigten Woche)
  unter „Überfällig“
- Tag/Woche links wird gemerkt (localStorage), Kalender startet in der Wochenansicht

Kategorien:
- Startkategorien „Studium“ (blau) und „Persönlich“ (orange)
- Namen nicht leer und eindeutig, es gibt immer mindestens eine Kategorie
- Löschen fragt nach: Todos verschieben oder mitlöschen
- Tagesansicht zeigt nur Kategorien mit Todos an diesem Tag (auch wenn alle erledigt sind);
  ohne offene Todos standardmäßig eingeklappt, erledigte Todos ausgegraut am Ende der Kategorie
- Ein-/Ausklappen und zuletzt gewählte Kategorie: localStorage (Ansicht, keine Nutzerdaten)

Verknüpfung Todo → Deadline:
- Optional: Todo ohne Deadline (z. B. „Gym“) und Deadline ohne Todo sind erlaubt
- 1:1, nur in eine Richtung: Todo abhaken → verknüpfte Deadline zeigt ✓
  (Status wird aus dem Todo abgeleitet, nicht doppelt gespeichert)
- Deadline ohne Todo wird direkt in der Deadline abgehakt
- Erledigte Deadlines bleiben sichtbar (mit ✓), damit der Überblick erhalten bleibt;
  liegen sie mehr als 7 Tage zurück, werden sie ausgeblendet („N ältere erledigte anzeigen“)
- Deadline-Widget einzeilig und nur so hoch wie sein Inhalt

Unteraufgaben: nur eine Ebene, Todo wird nicht automatisch erledigt (Anzeige „2/5“).
Priorität: am Todo sichtbar.

## V1 (abgeschlossen)
- Hauptansicht ruhig und aufgeräumt: links/oben Todo-Widget, daneben Deadline-Widget
- Todo: hinzufügen, abhaken, bearbeiten, löschen
- Deadline: Titel + Datum, nach Fälligkeit sortiert, Überfälliges farblich markiert
- Daten bleiben nach Neustart erhalten
- Hell/Dunkel automatisch nach Systemeinstellung
- Weiche Animationen beim Abhaken/Löschen
- Unteraufgaben + Priorität (5 Stufen)
- Kalender kam in V1.2 dazu; weiterhin nicht umgesetzt: KI-Eingabe, Listen/Projekte,
  Wiederholungen, Erinnerungen, Sync

## V1.1 (Tag v1.1)
- Umbenennung in FlungDo (Logo in der Titelleiste, Daten-Ordner %APPDATA%/FlungDo)
- Kategorien für Todos: Auswahl per Chips beim Erstellen, gruppierte Liste,
  verwalten über „…“-Menü und Seitenleiste
- Hamburger-Menü links öffnet eine Seitenleiste (30 % Breite); Inhalt vorerst
  Kategorienverwaltung, Platzhalter für Einstellungen

## V1.2 (Tag v1.2)
- Todo-Widget: Umschalter Tag | Woche, Navigation ‹ Heute ›
- Tagesansicht: Deadlines des Tages, Überfällig, Todos nach Kategorien, Ohne Datum
- Wochenansicht: Mo–So untereinander, Todos mit Kategorie-Farbpunkt, „+“ pro Tag,
  Klick auf einen Tag öffnet seine Tagesansicht
- Kalender-Widget unter den Deadlines (Woche/Monat): · offene Todos, ! Deadline;
  Klick auf einen Tag öffnet links die Tagesansicht
- Kategorie-Chips mit Abstand zur Eingabezeile, schmale Scrollbalken

## V1.2.1 (Tag v1.2.1)
- Bugfix: Erledigte Todos lassen sich durch erneutes Klicken auf das Häkchen
  wieder zurücknehmen (lokaler Häkchen-Zustand wurde nicht zurückgesetzt)

## V1.3 (Tag v1.3)
- Robustheit: nur eine Instanz gleichzeitig, Löschen mit „Rückgängig“ (5 s),
  sichtbarer Hinweis bei Speicherfehlern
- Tagesansicht: Fortschrittsbalken (erledigt/gesamt der Todos des Tages, ohne Überfälliges),
  Kategorien ohne Todos am Tag ausgeblendet
- Deadlines einzeilig und kompakt, ältere erledigte ausgeblendet
- Prüfungen: Widget rechts zwischen Deadlines und Kalender, Titel + Datum mit Countdown
  (≤ 7 Tage orange, heute rot, nächste lila hinterlegt), vergangene ausgeblendet;
  in Tages-/Wochenansicht mit Hut-Symbol, im Kalender als lila Ring
- Windows-Installer mit App-Icon (`npm run dist`)

## V2.0 (Datenbank und Fundament, Auftrag: docs/task-v2.md)
- Speicherung in SQLite; beim ersten Start wird todo-data.json gesichert, übernommen, gegengeprüft
  und zu todo-data.migrated.json umbenannt. Schlägt das fehl, läuft die App mit JSON weiter
- SqliteStorage schreibt nur geänderte Zeilen (Interface bleibt load/save des ganzen Stands)
- Datensicherheit: atomares Schreiben mit fsync, Sicherungen vor Migration/Import/Übernahme,
  Export/Import unter Einstellungen in der Seitenleiste, Hinweise aus Main über `app:notices`
- Lange Gruppen (Überfällig, Ohne Datum) zeigen zuerst 50 Todos, Deadline-Widget ein Fenster
  um heute (je 50 davor/danach) – Ergebnis der Messungen in docs/performance.md
- CI (GitHub Actions) bei jedem Push, Release-Workflow bei Tag v* baut den Installer
- Doku: README.md, docs/architecture.md, docs/decisions.md, docs/performance.md, docs/packaging.md

## Design
- Systemschrift (-apple-system, "Segoe UI"), viel Weißraum, 12 px Eckenradius, dezente Schatten
- Eigene schlanke Titelleiste, keine Standard-Windows-Optik
- Farben als CSS-Variablen, Dark Mode über prefers-color-scheme
- Kalender (seit V1.2): minimal, · für Todos und ! für Deadlines, lila Ring für Prüfungen (V1.3)
- Prüfungen in Lila (`--exam`), Deadlines orange/rot

## Arbeitsregeln
- Erst Plan vorschlagen, dann umsetzen
- Kleine Schritte: jede in sich abgeschlossene Änderung (Feature-Teilschritt, Bugfix, Refactoring,
  Doku, Konfiguration) bekommt sofort einen eigenen Git-Commit, nichts sammeln
- Ein Commit = eine nachvollziehbare Änderung: Titel sagt, was sich ändert, der Text bei Bedarf,
  warum; keine Sammel-Commits und keine künstlichen Commits ohne echte Änderung
- Vor jedem Commit müssen Typecheck und Tests durchlaufen, wenn Code geändert wurde
- Jeden Commit direkt nach origin/main pushen
- Entscheidungen kurz begründen, ich will den Code verstehen
- Keine zusätzlichen Libraries ohne Rückfrage
  (freigegeben: electron-vite, electron-builder, Vitest, ESLint + Prettier)

## Befehle
- `npm run dev` – App im Entwicklungsmodus starten (Hot Reload)
- `npm run build` – Produktions-Build nach `out/`
- `npm run typecheck` – TypeScript prüfen
- `npm run lint` / `npm run format` – ESLint / Prettier
- `npm test` – Unit-Tests (Vitest)
- `npm run dist` – Windows-Installer nach `dist/FlungDo-Setup-<version>.exe` (electron-builder,
  Konfiguration in `electron-builder.yml`)
- `node scripts/make-icon.mjs` – App-Icon (`build/icon.ico`, `build/icon.png`) neu erzeugen
- `npm run bench` – Speicherung messen (load/save, JSON vs. SQLite)
- `node scripts/seed.mjs <ordner>` – Testdaten mit 1.000/5.000/10.000 Todos erzeugen
- `node scripts/measure.mjs <ordner>` – echte App messen (vorher `npm run build`), Ergebnisse
  nach docs/performance.md

Umgebungsvariablen (nur Entwicklung/Messung):
- `FLUNGDO_DATA_DIR=<ordner>` – anderer Daten-Ordner, echte Daten bleiben unberührt
  (Electron ignoriert unter Windows `APPDATA`)
- `FLUNGDO_STORAGE=json` – JSON statt SQLite (Vergleichsmessungen)
- `FLUNGDO_PERF=1` – Main schreibt Zeitmarken `[perf] …`

Vor `npm run dist` die Version in package.json erhöhen – sonst wird der Installer der
Vorversion in dist/ überschrieben.