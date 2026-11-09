# Architektur

FlungDo ist eine Electron-App mit drei klar getrennten Schichten. Jede Schicht kennt nur die
darunterliegende, nie umgekehrt.

```
┌──────────────────────────────── Renderer-Prozess (Chromium, kein Node) ─┐
│  src/renderer   UI: React-Komponenten, Zustand (appStore), Ansicht      │
│        │  ruft reine Funktionen auf                                     │
│        ▼                                                                │
│  src/core       Logik: Todos, Deadlines, Kategorien, Kalender           │
│                 reine Funktionen  (AppData, Eingabe) → neue AppData     │
│        │                                                                │
│        │  window.api.data.save(AppData)   (nur über preload)            │
└────────┼────────────────────────────────────────────────────────────────┘
         │  IPC (contextBridge, Kanäle in src/shared/ipc.ts)
┌────────┼──────────────────────────────── Main-Prozess (Node) ──────────┐
│        ▼                                                               │
│  src/main/ipc.ts      prüft eingehende Daten mit migrate(),            │
│                       öffnet Dialoge (Export/Import)                   │
│        │                                                               │
│        ▼                                                               │
│  src/main/storage     Speicherung hinter dem Interface Storage         │
│        ├─ SqliteStorage  → %APPDATA%/FlungDo/flungdo.db   (Standard)   │
│        └─ JsonStorage    → todo-data.json  (Übernahme, Export/Import)  │
└────────────────────────────────────────────────────────────────────────┘
```

## Schichten

**UI (`src/renderer`)**
React-Komponenten zeigen den Datenstand an und lösen Aktionen aus. `state/actions.ts` ruft
für jede Aktion genau eine Funktion aus `core` auf, `state/appStore.ts` hält den aktuellen
Stand und speichert Änderungen gebündelt nach 200 ms. Die UI kennt keine Dateien, kein SQL
und kein Node. `nodeIntegration` ist aus, `contextIsolation` und `sandbox` sind an.

**Logik (`src/core`)**
Reine Funktionen: Sie bekommen `AppData` und geben neue `AppData` zurück, ohne Seiteneffekte.
IDs und Uhrzeit kommen über einen `CoreContext` von außen, damit Tests vorhersagbar sind.
ESLint verbietet in `core` Importe von React, Electron und Node.

**Speicherung (`src/main/storage`)**
Alles hinter einem kleinen Interface:

```ts
interface Storage {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  flush(): Promise<void>      // laufende Schreibvorgänge abwarten
  backup(tag: string): Promise<string | null>
  close(): Promise<void>
}
```

`createStorage` entscheidet beim Start, welche Implementierung genutzt wird (siehe unten).
Dieselbe Testsuite (`storageContract.ts`) prüft jede Implementierung.

## Datenfluss beim Ändern

1. Klick auf ein Häkchen → `todoActions.toggle(id)` (Renderer)
2. `core.toggleTodo(data, id)` liefert einen neuen Datenstand, React zeigt ihn sofort an
3. 200 ms später: `window.api.data.save(data)` → IPC-Kanal `data:save`
4. Main prüft die Daten mit `migrate()` (die Datenbank soll nie Ungültiges enthalten)
5. `SqliteStorage.save()` vergleicht mit dem zuletzt gespeicherten Stand und schreibt nur
   geänderte Zeilen, in einer Transaktion

## Datenmodell

```ts
Category = { id, name, farbe }                     // farbe: red | orange | … | gray
Subtask  = { id, titel, erledigt }
Todo     = { id, titel, erledigt, erstelltAm, prioritaet (1–5), unteraufgaben: Subtask[],
             categoryId, datum?, deadlineId? }
Deadline = { id, titel, datum, erledigt, prioritaet }
Exam     = { id, titel, datum }
AppData  = { version: 4, categories, todos, deadlines, exams }
```

In der Datenbank (`src/main/storage/sqlite/migrations/001_initial.ts`):

| Tabelle | Besonderheiten |
|---|---|
| `categories` | `farbe` per CHECK auf die sieben Farben beschränkt |
| `todos` | `category_id` → `categories`, `deadline_id` → `deadlines` (UNIQUE = 1:1, ON DELETE SET NULL), Index auf `datum` |
| `subtasks` | `todo_id` → `todos` (ON DELETE CASCADE) |
| `deadlines`, `exams` | Index auf `datum` |

Alle Tabellen sind `STRICT` und haben eine Spalte `position`, weil die Reihenfolge der Listen
Teil der Daten ist. Datumsangaben sind Text im Format `YYYY-MM-DD`, ohne Uhrzeit und damit
ohne Zeitzonenprobleme.

## Migrationen

Es gibt zwei Arten von Migrationen, die sich nicht in die Quere kommen:

**Datenformat (`migrations.ts`, `AppData.version`)**
`migrate()` macht aus jedem bekannten Format (Version 1 bis 4) gültige `AppData` und verwirft
kaputte Einträge. Genutzt beim Laden von JSON, beim Import und als Prüfung vor jedem Speichern.
Vor einer Migration wird die Datei gesichert (`todo-data.backup-v<alt>-<zeit>.json`).

**Datenbankschema (`sqlite/migrations/`, `PRAGMA user_version`)**
Nummerierte Migrationen, die beim Öffnen der Datenbank automatisch laufen, jede in einer
eigenen Transaktion. Eine Datenbank einer neueren App-Version wird nicht geöffnet.

## Start und Übernahme aus 1.x

```
App-Start
  └─ createStorage(%APPDATA%/FlungDo)
       ├─ flungdo.db fehlt, todo-data.json da?  → adoptJsonIntoDatabase
       │     sichern → migrieren → flungdo.db.tmp schreiben → zurücklesen & vergleichen
       │     ├─ ok:     tmp → flungdo.db, JSON → todo-data.migrated.json
       │     └─ Fehler: nichts ändern, JsonStorage + Hinweis in der UI
       ├─ flungdo.db öffnen         → SqliteStorage
       └─ Öffnen scheitert          → UnavailableStorage (kein Laden, kein Speichern)
                                       + Hinweis, damit nichts überschrieben wird
```

Hinweise aus dem Main-Prozess (Übernahme fehlgeschlagen, Datei unlesbar …) sammelt
`main/notices.ts`. Der Renderer holt sie nach dem Laden über `app:notices` ab.

## Datensicherheit

- **Atomares Schreiben** (JSON, Export): Temp-Datei, `fsync`, Umbenennen mit Wiederholung,
  falls Windows die Datei kurz sperrt
- **Transaktionen** (SQLite): jedes Speichern ganz oder gar nicht, `synchronous = FULL`
- **Sicherungen**: vor jeder Formatmigration, vor dem Import und vor der Übernahme in die
  Datenbank, jeweils die letzten 5
- **Export/Import**: unter Einstellungen in der Seitenleiste, Import mit Nachfrage
- **Nur eine Instanz**: Ein zweiter Start holt das vorhandene Fenster nach vorne
