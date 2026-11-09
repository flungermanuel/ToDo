# Performance

Gemessen am 09.11.2026 auf Windows 11, Intel Core Ultra 7 155H, 16 GB RAM, Electron 45.1.0.
Alle Werte sind Mediane, gerundet. Zwischen zwei Läufen schwanken sie um etwa ±20 %; bei
kleinen Werten (unter 50 ms) ist das Rauschen größer als der Unterschied zwischen JSON und SQLite.

## Wie gemessen wird

```bash
npm run build
node scripts/seed.mjs perf-data          # 1.000, 5.000, 10.000 Todos
node scripts/measure.mjs perf-data 5     # echte App, 5 Starts pro Messung
npm run bench                            # nur die Speicherung, ohne App
```

**Testdaten** (`scripts/seed.mjs`): 8 Kategorien, Todos verteilt über ±6 Monate um heute,
jedes dritte mit 3 Unteraufgaben, jedes siebte ohne Datum, jedes zehnte mit verknüpfter
Deadline, vergangene größtenteils erledigt. Bei 10.000 Todos sind das rund 950 überfällige,
1.000 Deadlines und 3,6 MB JSON. Das ist bewusst mehr, als eine persönliche Liste je erreicht.

**App-Messung** (`scripts/measure.mjs`): Startet die gebaute App mit `FLUNGDO_DATA_DIR` in
einem frischen Ordner und steuert sie über das Chrome DevTools Protocol (ohne zusätzliche
Library). `FLUNGDO_STORAGE=json` schaltet für den Vergleich auf JSON um, `FLUNGDO_PERF=1`
lässt Main Zeitmarken ausgeben.

| Spalte | Bedeutung |
|---|---|
| 1. Start | Erster Start im frischen Ordner. Bei SQLite inkl. Übernahme der JSON-Datei |
| Start | Programmstart bis das erste Todo zu sehen ist (weitere Starts) |
| Laden (Main) | `storage.load()` im Main-Prozess |
| Speichern (Main) | Prüfen mit `migrate()` + `storage.save()` nach dem Abhaken eines Todos |
| Abhaken blockiert UI | Summe der „long tasks“ (> 50 ms) im Renderer nach einem Klick aufs Häkchen |
| Tag / Woche | Umschalten der Todo-Ansicht, bis neu gezeichnet ist |
| Monat / Kal.-Woche | Umschalten des Kalender-Widgets |

## Vorher (Stand nach Umstellung auf SQLite)

| Todos | Speicher | 1. Start | Start | Laden | Speichern | Abhaken blockiert UI | Tag | Woche | Monat | Kal.-Woche |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.000 | JSON | 722 ms | 1.126 ms | 8 ms | 13 ms | 125 ms | 167 ms | 175 ms | 23 ms | 24 ms |
| 1.000 | SQLite | 1.254 ms | 894 ms | 10 ms | 23 ms | 101 ms | 200 ms | 188 ms | 23 ms | 27 ms |
| 5.000 | JSON | 1.989 ms | 2.791 ms | 25 ms | 23 ms | 1.424 ms | 1.640 ms | 1.634 ms | 68 ms | 69 ms |
| 5.000 | SQLite | 3.019 ms | 2.552 ms | 23 ms | 70 ms | 1.297 ms | 1.410 ms | 1.630 ms | 68 ms | 64 ms |
| 10.000 | JSON | 6.396 ms | 6.611 ms | 36 ms | 42 ms | 4.771 ms | 4.689 ms | 5.434 ms | 114 ms | 105 ms |
| 10.000 | SQLite | 6.362 ms | 5.106 ms | 73 ms | 156 ms | 4.920 ms | 7.476 ms | 7.139 ms | 111 ms | 90 ms |

**Befund**

1. **Der Renderer ist der Engpass, nicht die Speicherung.** Ab 5.000 Todos dauern Start,
   Umschalten und Abhaken Sekunden, und zwar mit JSON genauso wie mit SQLite. Ursache: Die
   Gruppe „Überfällig“ (bei 10.000 Todos rund 950 Einträge) und das Deadline-Widget (1.000
   Einträge) rendern jede Zeile als animierte Komponente. Bei jeder Änderung werden alle neu
   berechnet und vermessen.
2. **SQLite speichert langsamer als JSON.** Jedes Speichern löschte alle Zeilen und fügte sie
   neu ein. Im Benchmark (unten) waren das bei 10.000 Todos im Mittel 219 ms pro Speichern,
   mit Ausreißern bis 580 ms, und das blockiert jedes Mal den Main-Prozess.

## Optimierungen

| Was | Datei | Warum so |
|---|---|---|
| Lange Gruppen („Überfällig“, „Ohne Datum“) zeigen zuerst 50 Todos, Rest per „N weitere anzeigen“ | `TodoGroup.tsx` | Gleiches Muster wie „N ältere erledigte anzeigen“ bei den Deadlines. Virtualisierung hätte eine Library gebraucht und sich mit den Animationen gerieben. |
| Deadline-Widget zeigt ein Fenster um heute: letzte 50 davor, nächste 50 ab heute | `DeadlineWidget.tsx` | Die Liste ist chronologisch: einfach die ersten 50 zu zeigen, hätte genau die kommenden Deadlines versteckt. |
| SQLite schreibt nur geänderte Zeilen (Upsert/Delete), Interface bleibt `save(AppData)` | `SqliteStorage.ts`, `sqlite/diff.ts` | Der Mittelweg zwischen Variante A und B (siehe `docs/decisions.md`). |

## Nachher

| Todos | Speicher | 1. Start | Start | Laden | Speichern | Abhaken blockiert UI | Tag | Woche | Monat | Kal.-Woche |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.000 | JSON | 961 ms | 969 ms | 10 ms | 20 ms | 132 ms | 205 ms | 231 ms | 28 ms | 34 ms |
| 1.000 | SQLite | 1.137 ms | 948 ms | 11 ms | 15 ms | 125 ms | 196 ms | 229 ms | 35 ms | 33 ms |
| 5.000 | JSON | 1.245 ms | 1.204 ms | 25 ms | 43 ms | 321 ms | 376 ms | 590 ms | 39 ms | 47 ms |
| 5.000 | SQLite | 1.441 ms | 1.237 ms | 46 ms | 30 ms | 333 ms | 389 ms | 655 ms | 38 ms | 46 ms |
| 10.000 | JSON | 1.808 ms | 1.722 ms | 39 ms | 84 ms | 863 ms | 640 ms | 1.368 ms | 43 ms | 37 ms |
| 10.000 | SQLite | 2.171 ms | 1.763 ms | 85 ms | 67 ms | 823 ms | 707 ms | 1.534 ms | 43 ms | 38 ms |

**Vorher → nachher bei 10.000 Todos (SQLite)**

| | Vorher | Nachher | |
|---|---:|---:|---:|
| Start bis sichtbar | 5.106 ms | 1.763 ms | −65 % |
| Abhaken blockiert UI | 4.920 ms | 823 ms | −83 % |
| Tagesansicht | 7.476 ms | 707 ms | −91 % |
| Wochenansicht | 7.139 ms | 1.534 ms | −79 % |
| Speichern (Main) | 156 ms | 67 ms | −57 % |

Bei 1.000 Todos ändert sich nichts Messbares; dort war auch vorher nichts langsam.

## Speicherung allein (`npm run bench`)

`load()` und `save()` eines kompletten Datenstands, ohne App, IPC und Prüfung. Mittelwerte:

| Todos | Laden JSON | Laden SQLite | Speichern JSON | Speichern SQLite vorher | Speichern SQLite nachher |
|---:|---:|---:|---:|---:|---:|
| 1.000 | 3 ms | 5 ms | 6–14 ms | 25 ms | 4 ms |
| 5.000 | 14–21 ms | 25–32 ms | 15–30 ms | 216 ms | 12 ms |
| 10.000 | 26–33 ms | 49–50 ms | 32–49 ms | 219 ms | 25 ms |

(Bereiche bei JSON = Spanne aus zwei Läufen.)

## Was bleibt

- **Laden:** JSON ist beim Laden etwas schneller als SQLite (10.000 Todos: rund 30 statt
  50 ms), weil SQLite die Zeilen erst wieder zu Objekten zusammensetzen muss. Bei unter
  100 ms ist das nicht spürbar; deshalb keine Optimierung.
- **Wochenansicht bei 10.000 Todos (1,5 s):** Die Woche zeigt dann wirklich rund 190 Todos.
  Eine Begrenzung pro Tag würde die Wochenansicht verfälschen. Wenn das je relevant wird,
  wären die nächsten Schritte: `TodoItem` mit `React.memo` und vorberechneten Nachschlage-
  tabellen statt `find()` pro Zeile, oder Virtualisierung.
- **1. Start mit SQLite** ist rund 200–400 ms langsamer als mit JSON. Das ist die einmalige
  Übernahme mit Gegenprobe, beim Update von 1.x genau einmal.
