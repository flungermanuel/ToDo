# FlungDo – Projektbeschreibung

> Kurzbeschreibung zum Weitergeben: Was ist FlungDo, was kann es, wie ist es gebaut,
> und wo kann man andocken.

## In einem Satz

**FlungDo ist eine ruhige, aufgeräumte Desktop-App für Windows, in der man Todos, Deadlines
und seine Woche an einem Ort plant – mit einer Optik, die sich an macOS orientiert.**

Ein persönliches Lernprojekt von Manuel Flunger mit Fokus auf saubere Architektur und
nachvollziehbaren Code.

---

## Was die App kann

### Todos
- Todos anlegen, abhaken, bearbeiten, löschen (mit weichen Animationen)
- **Priorität** in 5 Stufen (1 = niedrig, 5 = hoch), direkt am Todo sichtbar
- **Unteraufgaben** (eine Ebene), Fortschritt als „2/5“ – das Todo wird nicht automatisch erledigt
- **Kategorien** mit Farbe (z. B. „Studium“ blau, „Persönlich“ orange): Auswahl per Chips,
  Liste nach Kategorien gruppiert, erledigte Todos ausgegraut am Ende
- **Datum** pro Todo: Ein neues Todo bekommt den angezeigten Tag, ein anderes Datum ist wählbar

### Deadlines
- Deadline = Titel + Datum, nach Fälligkeit sortiert
- Überfällige Deadlines farblich markiert, erledigte bleiben mit ✓ sichtbar
- Optional **mit einem Todo verknüpft** (1:1): Wird das Todo abgehakt, zeigt die Deadline ✓
- Todos ohne Deadline („Gym“) und Deadlines ohne Todo sind beide erlaubt

### Planung & Kalender
- **Tagesansicht:** Deadlines des Tages, „Überfällig“, Todos nach Kategorien, „Ohne Datum“
- **Wochenansicht:** Montag bis Sonntag untereinander, Kalenderwoche nach ISO 8601,
  Wochenende farblich abgesetzt, „+“ pro Tag
- **Kalender-Widget** (Woche/Monat): `·` = offene Todos, `!` = Deadline;
  Klick auf einen Tag öffnet dessen Tagesansicht

### Allgemein
- Hell-/Dunkelmodus automatisch nach Systemeinstellung
- Eigene schlanke Titelleiste, keine Standard-Windows-Optik
- Seitenleiste (Hamburger-Menü) für Kategorienverwaltung und Einstellungen
- Läuft komplett lokal: kein Konto, kein Server, keine Cloud

## Geplant / Ausbaustufen

| Stufe | Inhalt |
|---|---|
| Installer | Auslieferung als `.exe` (electron-builder) |
| KI-Eingabe | Freitext wie „Statistik-Abgabe Freitag, wichtig“ wird per `parseInput(text)` in ein Todo/eine Deadline umgewandelt – als austauschbare Funktion |
| Speicherung | Wechsel von JSON auf SQLite möglich, ohne den Rest der App anzufassen |
| Später denkbar | Wiederholungen, Erinnerungen, Uhrzeiten, Drag & Drop zwischen Tagen, Sync |

---

## Technik

| Bereich | Wahl |
|---|---|
| Desktop-Hülle | Electron (Build mit electron-vite, später electron-builder) |
| Oberfläche | React + Vite + TypeScript |
| Styling | Tailwind CSS, shadcn/ui, Lucide Icons, Framer Motion |
| Tests / Qualität | Vitest, ESLint, Prettier |
| Daten | Eine JSON-Datei: `%APPDATA%/FlungDo/todo-data.json` |

### Architektur – drei getrennte Schichten

```
┌──────────────────────────────┐
│ UI  (src/renderer)           │  nur Darstellung, kennt keine Dateien
└──────────────┬───────────────┘
               │ IPC über preload + contextBridge
┌──────────────▼───────────────┐
│ Logik  (src/core)            │  reine Funktionen: anlegen, ändern, sortieren,
│                              │  gruppieren, überfällig prüfen, Kalender
└──────────────┬───────────────┘
┌──────────────▼───────────────┐
│ Speicherung (src/main/storage)│ Interface load/save, aktuell JSON
└──────────────────────────────┘
```

Warum das wichtig ist: Die Logik ist unabhängig von Oberfläche und Datei.
Dadurch lässt sich die Speicherung (JSON → SQLite) oder die Eingabe (Formular → KI)
austauschen, ohne den Rest umzubauen.

### Datenmodell

```ts
Priority = 1 | 2 | 3 | 4 | 5
Category = { id, name, farbe }                // red | orange | yellow | green | blue | purple | gray
Subtask  = { id, titel, erledigt }
Todo     = { id, titel, erledigt, erstelltAm, prioritaet, unteraufgaben: Subtask[],
             categoryId, datum?: "YYYY-MM-DD", deadlineId?: string }
Deadline = { id, titel, datum: "YYYY-MM-DD", erledigt, prioritaet }
AppData  = { version: 3, categories: Category[], todos: Todo[], deadlines: Deadline[] }
```

Die Datei ist versioniert; ältere Versionen werden beim Start automatisch migriert.

---

## Andocken für andere Projekte

- **Daten lesen:** `todo-data.json` ist schlichtes, dokumentiertes JSON (siehe oben) –
  andere Tools können es lesen. Schreiben nur, während FlungDo geschlossen ist.
- **Eingabe von außen:** Die geplante Funktion `parseInput(text)` ist die vorgesehene
  Schnittstelle, um Text (z. B. aus einem KI-Assistenten) in Todos/Deadlines zu verwandeln.
- **Logik wiederverwenden:** `src/core` hat keine UI- oder Datei-Abhängigkeiten und kann
  direkt in anderen TypeScript-Projekten genutzt werden.

## Status

Aktuelle Version: **1.2.1** – Todos, Deadlines, Kategorien, Tages-/Wochenansicht und
Kalender sind fertig. Installer und KI-Eingabe folgen.
