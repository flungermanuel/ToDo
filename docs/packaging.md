# Verpacken und Installer (FlungDo 2.0)

`npm run dist` baut mit electron-builder einen NSIS-Installer nach
`dist/FlungDo-Setup-<version>.exe` (Konfiguration: `electron-builder.yml`).

## SQLite im Installer

FlungDo nutzt `node:sqlite`, das in Electron (Node 24) **eingebaut** ist. Deshalb musste an
der Installer-Konfiguration nichts geändert werden:

- kein nativer Code, kein `@electron/rebuild`, kein `asarUnpack`
- `node_modules` bleibt komplett draußen (`'!node_modules'`), weil Vite alles bündelt
  und `node:sqlite` zur Laufzeit von Electron selbst kommt
- Vite lässt `node:sqlite` automatisch aus dem Bundle heraus, weil es ein eingebautes
  Node-Modul ist (`out/main/index.js` enthält nur `require("node:sqlite")`)

Mit `better-sqlite3` wäre genau hier die meiste Arbeit angefallen (siehe `docs/decisions.md`).

## Ergebnisse

Geprüft am 09.11.2026 auf Windows 11 mit Electron 45.1.0 (Node 24.22.1, SQLite 3.53.4).

| Prüfung | Wie | Ergebnis |
|---|---|---|
| Installer wird gebaut | `npm run dist` | ✅ ohne Warnungen außer „nicht signiert“ |
| SQLite läuft in der gepackten App | `dist/win-unpacked/FlungDo.exe` mit `FLUNGDO_DATA_DIR` auf einen Test-Ordner | ✅ |
| Übernahme einer 1.x-Datei | Test-Ordner mit `todo-data.json` (Version 4) | ✅ `flungdo.db` angelegt, Sicherung `todo-data.backup-vor-sqlite-….json`, JSON → `todo-data.migrated.json` |
| Daten anlegen/ändern, beenden, neu starten | Todo abhaken, App schließen, neu starten | ✅ Zustand erhalten, nach dem Beenden keine `-wal`/`-shm`-Dateien mehr |
| Frischer Windows-Benutzer: installieren, Daten anlegen, neu starten | manuell, siehe Checkliste | ⏳ offen |
| Über 1.3 drüberinstallieren, Daten bleiben | manuell, siehe Checkliste | ⏳ offen |
| Deinstallieren, Daten bleiben in `%APPDATA%\FlungDo` | manuell, siehe Checkliste | ⏳ offen |

## Checkliste für den manuellen Test

Am besten in einem **neuen Windows-Benutzerkonto**: Dort gibt es keine Entwicklungsumgebung
und keine vorhandenen Daten.

1. `FlungDo-Setup-1.3.0.exe` installieren, FlungDo starten, ein paar Todos (mit Unteraufgabe),
   eine Deadline (mit einem Todo verknüpft) und eine Prüfung anlegen. App schließen.
2. `FlungDo-Setup-2.0.0.exe` drüberinstallieren und starten.
   - Alle Daten von Schritt 1 sind da.
   - In `%APPDATA%\FlungDo` liegen `flungdo.db`, `todo-data.migrated.json` und
     `todo-data.backup-vor-sqlite-….json`.
3. Etwas ändern, App schließen, neu starten: Änderung ist da.
4. Seitenleiste → Einstellungen → „Daten exportieren …“, dann „Daten importieren …“ mit
   dieser Datei: Nachfrage erscheint, nach „Ersetzen“ sind die Daten unverändert da und es
   gibt eine `flungdo.backup-import-….db`.
5. Über „Apps & Features“ deinstallieren: `%APPDATA%\FlungDo` bleibt bestehen.
6. 2.0 erneut installieren: Die Daten sind sofort wieder da.

## Stolpersteine

- **Version vor `npm run dist` erhöhen.** Der Dateiname enthält die Version aus
  `package.json`. Beim ersten Testbuild stand dort noch 1.3.0, und das alte
  1.3.0-Installer-Artefakt wurde überschrieben. Ein alter Installer lässt sich jederzeit aus
  seinem Tag neu bauen: `git worktree add ../flungdo-v1.3 v1.3`, dort `npm ci` und `npm run dist`.
- **Test-Daten umlenken mit `FLUNGDO_DATA_DIR`.** Electron ignoriert unter Windows die
  Umgebungsvariable `APPDATA`. Ohne `FLUNGDO_DATA_DIR` würde ein Testlauf die echten Daten benutzen.
- **Kein Downgrade.** Nach der Übernahme heißt die JSON-Datei `todo-data.migrated.json`.
  Eine wieder installierte 1.3 findet keine `todo-data.json` und startet leer. Die Daten
  sind dann nicht weg (in `flungdo.db` und der umbenannten JSON), aber 1.3 sieht sie nicht.
- **Unsignierter Installer.** Windows SmartScreen warnt beim ersten Start („Unbekannter
  Herausgeber“), über „Weitere Informationen → Trotzdem ausführen“ geht es weiter.
- **ExperimentalWarning.** `node:sqlite` gilt in Node 24 noch als experimentell. In den
  Tests (Vitest unter Node) erscheint deshalb eine Warnung. In Electron wird sie nicht ausgegeben.
