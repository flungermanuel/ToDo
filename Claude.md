# FlungDo

FlungDo: cleane Desktop-Todo-App für Windows mit moderner, an macOS orientierter Optik.
Persönliches Lernprojekt: Fokus auf saubere Architektur und nachvollziehbaren Code.

## Tech-Stack
- Electron (Desktop-Hülle, Build mit electron-builder zur .exe)
- React + Vite + TypeScript
- Tailwind CSS, shadcn/ui, Lucide Icons, Framer Motion
- Speicherung: JSON-Datei in %APPDATA%/FlungDo/todo-data.json (bis V1: %APPDATA%/todo, wird beim Start übernommen)
- Kein Backend, keine Datenbank, keine KI in V1

## Architektur (strikt einhalten)
Drei getrennte Schichten:
1. UI (src/renderer): nur Darstellung, kennt keine Dateien
2. Logik (src/core): reine Funktionen für Aufgaben/Deadlines
   (anlegen, ändern, sortieren, überfällig prüfen), keine UI- oder Datei-Importe
3. Speicherung (src/main/storage): liest und schreibt JSON,
   hinter einem Interface (load/save), damit später SQLite möglich ist

- Kommunikation Renderer ↔ Main nur über preload + contextBridge (IPC), nodeIntegration aus
- Spätere KI-Anbindung kommt als austauschbare Funktion parseInput(text) dazu, in V1 nicht bauen

## Datenmodell
```ts
Priority = 1 | 2 | 3 | 4 | 5            // 1 = niedrigste, 5 = höchste, Standard 3
Subtask  = { id, titel, erledigt }
Todo     = { id, titel, erledigt, erstelltAm, prioritaet, unteraufgaben: Subtask[], deadlineId?: string }
Deadline = { id, titel, datum /* "YYYY-MM-DD" */, erledigt, prioritaet }
AppData  = { version: 1, todos: Todo[], deadlines: Deadline[] }
```

Verknüpfung Todo → Deadline:
- Optional: Todo ohne Deadline (z. B. „Gym“) und Deadline ohne Todo sind erlaubt
- 1:1, nur in eine Richtung: Todo abhaken → verknüpfte Deadline zeigt ✓
  (Status wird aus dem Todo abgeleitet, nicht doppelt gespeichert)
- Deadline ohne Todo wird direkt in der Deadline abgehakt
- Erledigte Deadlines bleiben sichtbar (mit ✓), damit der Überblick erhalten bleibt

Unteraufgaben: nur eine Ebene, Todo wird nicht automatisch erledigt (Anzeige „2/5“).
Priorität: am Todo sichtbar.

## V1-Umfang
- Hauptansicht ruhig und aufgeräumt: links/oben Todo-Widget, daneben Deadline-Widget
- Todo: hinzufügen, abhaken, bearbeiten, löschen
- Deadline: Titel + Datum, nach Fälligkeit sortiert, Überfälliges farblich markiert
- Daten bleiben nach Neustart erhalten
- Hell/Dunkel automatisch nach Systemeinstellung
- Weiche Animationen beim Abhaken/Löschen
- Unteraufgaben + Priorität (5 Stufen)
- Nicht in V1: Kalender, KI-Eingabe, Listen/Projekte, Wiederholungen, Erinnerungen, Sync

## Design
- Systemschrift (-apple-system, "Segoe UI"), viel Weißraum, 12 px Eckenradius, dezente Schatten
- Eigene schlanke Titelleiste, keine Standard-Windows-Optik
- Farben als CSS-Variablen, Dark Mode über prefers-color-scheme
- Nach V1: Kalender wo man mit punkten minimalistisch sieht was heute zu tun ist und farbig markiert ist ob es eine deadline gibt

## Arbeitsregeln
- Erst Plan vorschlagen, dann umsetzen
- Kleine Schritte, pro Feature ein Git-Commit mit klarer Nachricht
- Entscheidungen kurz begründen, ich will den Code verstehen
- Keine zusätzlichen Libraries ohne Rückfrage
  (freigegeben: electron-vite, Vitest, ESLint + Prettier)
- Nach jedem Schritt committen und nach origin/main pushen

## Befehle
- `npm run dev` – App im Entwicklungsmodus starten (Hot Reload)
- `npm run build` – Produktions-Build nach `out/`
- `npm run typecheck` – TypeScript prüfen
- `npm run lint` / `npm run format` – ESLint / Prettier
- `npm test` – Unit-Tests (Vitest)
- .exe erzeugen: folgt in einem späteren Schritt