# Entscheidungen

Kurze Notizen zu den wichtigsten Entscheidungen in FlungDo: was entschieden wurde und warum.

## Warum Electron?

FlungDo soll eine richtige Desktop-App für Windows sein: eigenes Fenster, eigene Titelleiste,
Daten lokal auf dem Rechner, Installer. Electron erlaubt das mit Web-Technik (React, Tailwind),
die ich ohnehin lernen wollte, und bringt Node für Dateizugriff und SQLite gleich mit. Der
Preis ist die Größe (rund 120 MB Installer) und der Speicherverbrauch. Für eine persönliche
App ist das vertretbar; Tauri wäre schlanker, hätte aber Rust für den nativen Teil bedeutet.

## Warum drei Schichten (UI, Logik, Speicherung)?

Die Logik in `src/core` besteht aus reinen Funktionen: Sie bekommen Daten und geben neue
zurück, ohne UI, Dateien oder Zufall (IDs und Uhrzeit kommen über einen Kontext von außen).
Dadurch lässt sie sich ohne Electron vollständig testen. Die UI kennt keine Dateien, und die
Speicherung kennt keine Regeln. Genau deshalb konnte in v2.0 JSON durch SQLite ersetzt werden,
ohne `src/core` anzufassen.

## Warum SQLite statt JSON?

Die JSON-Datei hat bis 1.3 gut funktioniert, wird aber bei jeder Änderung komplett neu
geschrieben, und Beziehungen (Todo → Kategorie, Todo → Deadline) prüft niemand außer dem
eigenen Code. SQLite bietet Transaktionen (alles oder nichts), Fremdschlüssel und Prüfungen
direkt in der Datenbank und skaliert bei vielen Einträgen besser. Die Messungen in
`docs/performance.md` zeigen allerdings ehrlich: Bei unserer Datenmenge ist JSON beim Laden
sogar etwas schneller. Der Gewinn liegt vor allem in Datensicherheit und Struktur, nicht in
der Geschwindigkeit.

## Warum `node:sqlite` statt `better-sqlite3`?

`node:sqlite` ist in Node und damit in Electron 45 (Node 24) eingebaut. Es braucht keine
zusätzliche Abhängigkeit, keinen nativen Build pro Electron-Version und keine Sonderregeln
im Installer (`asarUnpack`). `better-sqlite3` ist ausgereifter und etwas schneller, wäre
aber genau beim Verpacken und in der CI die größte Fehlerquelle gewesen. Nachteil: Node
führt `node:sqlite` noch als experimentell, und die API ist schlichter (Transaktionen sind
eine eigene Hilfsfunktion mit zehn Zeilen).

## Warum reines SQL statt ORM?

Das Schema hat fünf Tabellen und ändert sich selten. Ein ORM hätte eine weitere Library,
eine eigene Abfragesprache und Magie zwischen Code und Datenbank gebracht. Die Repository-
Dateien in `src/main/storage/sqlite/repositories` sind kleine Funktionen mit lesbarem SQL:
Man sieht direkt, welche Abfrage läuft, und kann sie in jedem SQLite-Werkzeug ausprobieren.

## Variante A: Ganzer Datenstand statt einzelner Befehle

Die Speicherung hat weiter nur `load()` und `save(AppData)`, statt feiner Methoden wie
`addTodo` oder `toggleTodo` (Variante B). Die Logik arbeitet mit reinen Funktionen über den
ganzen Datenstand; Variante B hätte `src/core` und die UI umgebaut. Die Messung zeigte dann
ein echtes Problem: Alles neu zu schreiben dauerte bei 10.000 Todos über 200 ms pro Speichern.
Statt auf B umzusteigen, vergleicht `SqliteStorage` jetzt intern mit dem zuletzt gespeicherten
Stand und schreibt nur geänderte Zeilen. Das Interface bleibt einfach, und Speichern dauert
rund 25 ms.

## Warum die Prüfungen im Schema nicht strenger sind als `migrate()`

Jede Bedingung in der Datenbank (CHECK, Fremdschlüssel, UNIQUE) entspricht einer Regel, die
`migrate()` beim Laden ohnehin durchsetzt, aber keine strengere. Sonst gäbe es Daten, die die
App für gültig hält, die sich aber nicht speichern lassen. Deshalb sind zum Beispiel
Kategorienamen in der Datenbank nicht `UNIQUE`: Die Regel „eindeutige Namen“ prüft die Logik
beim Anlegen, alte Datenstände könnten sie aber verletzen.

## Warum die Übernahme der JSON-Daten über eine temporäre Datenbank läuft

Die Übernahme beim ersten Start ist der riskanteste Moment von v2.0. Deshalb wird erst in
`flungdo.db.tmp` geschrieben, zurückgelesen und mit dem Original verglichen (Inhalt und
Anzahl), und erst dann umbenannt. Es gibt also nie eine halb befüllte `flungdo.db`. Geht
etwas schief, bleibt die JSON-Datei unverändert aktiv, und die App zeigt einen Hinweis. Die
JSON-Datei wird nur umbenannt, nie gelöscht.

## Warum lange Listen gekürzt statt virtualisiert werden

Bei 10.000 Todos blockierten rund 950 überfällige Todos die UI beim Umschalten mehrere
Sekunden. Virtualisierung (nur sichtbare Zeilen rendern) hätte eine Library gebraucht und
sich mit den Animationen beim Abhaken gerieben. Die Gruppen zeigen jetzt zuerst 50 Einträge
und den Rest per Klick, wie es die App bei älteren erledigten Deadlines schon tat. Einfacher
zu verstehen und für eine persönliche Todo-Liste ausreichend.

## Warum die KI lokal mit Ollama läuft

Todos, Prüfungen und Deadlines sind persönliche Daten, und FlungDo versprach bisher „kein
Konto, kein Server, keine Cloud“. Bei Ollama verlässt kein Text den Rechner, es gibt keinen
API-Schlüssel und keine laufenden Kosten, und die App bleibt auch offline benutzbar. Der Preis:
kleine Modelle auf der CPU, also einige Sekunden Wartezeit und weniger Genauigkeit als bei einem
großen Cloud-Modell. Deshalb sind Datumsrechnung und Prüfung Sache des Codes, nicht des
Modells, und jede Analyse endet in einer Vorschau, die man bestätigt. Die Anbindung steckt hinter
einer kleinen Schnittstelle (`AiProvider`), ein Cloud-Anbieter ließe sich später ergänzen.

## Warum der Code das Datum berechnet und nicht das Modell

Kleine Sprachmodelle rechnen unzuverlässig: „übernächsten Freitag“ ist für sie Raten, und ein
Fehler fällt nicht auf, weil das Datum plausibel aussieht. Das Modell schreibt deshalb nur ab,
was im Text steht (`datumText`), und `resolveDate` in `src/core/capture` rechnet daraus den
Kalendertag. Diese Funktion ist rein, deterministisch und mit Tests für Monats- und
Jahreswechsel, Schaltjahr, Sommerzeit und Wochenstart abgesichert. Versteht sie einen Ausdruck
nicht, bleibt die Karte als „Datum fehlt“ stehen, statt ein falsches Datum zu bekommen.

## Warum eine Vorschau mit Bestätigung

Ein Modell kann sich irren, und ein falsch angelegter Eintrag fällt oft erst auf, wenn die
Deadline schon vorbei ist. Darum legt die KI-Eingabe nie etwas selbst an: Sie zeigt Karten, die
man ändern, entfernen und bestätigen kann, Pflichtfelder sind markiert. Nach dem Übernehmen
lässt sich der ganze Schwung mit einem Klick rückgängig machen; das löscht genau die angelegten
Einträge und lässt spätere Änderungen stehen. Bei Fehlern öffnet sich eine Karte mit dem
Rohtext als Titel, damit nie etwas verloren geht.

## Warum die KI-Einstellungen in einer eigenen Datei stehen

Das gewählte Modell ist eine Einstellung dieses Rechners, keine Nutzerdaten. Es gehört nicht
in Export, Import und Sicherungen, und es soll auch dann funktionieren, wenn die Datenbank
gerade nicht verfügbar ist. Deshalb steht es in `ai-settings.json` neben der Datenbank, statt
in einer Tabelle, die den `Storage`-Vertrag und das Schema erweitert hätte. Gespeichert wird
nur der Modellname, nie ein Eingabetext oder eine Modellantwort.

## Warum das Schema der KI-Antwort von Hand geprüft wird

Das Schema hat fünf Felder. Eine eigene Prüfung (`validateCaptureOutput`, rund 60 Zeilen)
braucht keine zusätzliche Library, ist leicht zu lesen und lässt sich so bauen, wie die App
es braucht: kaputte Einträge einzeln verwerfen, statt die ganze Antwort abzulehnen. Das
JSON-Schema, das Ollama die Antwortform vorgibt, steht als Konstante daneben. Zod hätte beides
aus einer Quelle erzeugt, dafür aber eine weitere Abhängigkeit gebracht.
