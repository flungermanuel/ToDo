// Schema 1 (FlungDo 2.0): eine Tabelle pro Art von Daten.
//
// Regeln:
// - STRICT: SQLite prüft die Spaltentypen (sonst würde es z. B. Text in INTEGER-Spalten akzeptieren).
// - position: In AppData ist die Reihenfolge der Listen Teil der Daten (z. B. die
//   Reihenfolge der Kategorien) – sie muss beim Laden exakt wiederhergestellt werden.
// - Die Prüfungen (CHECK, FOREIGN KEY, UNIQUE) sind genau so streng wie migrate() in
//   migrations.ts, nicht strenger. Sonst gäbe es gültige AppData, die sich nicht speichern ließen.
// - Wahrheitswerte als INTEGER 0/1, Kalendertage als TEXT "YYYY-MM-DD" (wie in AppData).

export const sql = /* sql */ `
CREATE TABLE categories (
  id       TEXT    PRIMARY KEY,
  name     TEXT    NOT NULL,
  farbe    TEXT    NOT NULL
           CHECK (farbe IN ('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray')),
  position INTEGER NOT NULL
) STRICT;

CREATE TABLE deadlines (
  id         TEXT    PRIMARY KEY,
  titel      TEXT    NOT NULL,
  datum      TEXT    NOT NULL CHECK (datum GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  erledigt   INTEGER NOT NULL CHECK (erledigt IN (0, 1)),
  prioritaet INTEGER NOT NULL CHECK (prioritaet BETWEEN 1 AND 5),
  position   INTEGER NOT NULL
) STRICT;

CREATE TABLE todos (
  id          TEXT    PRIMARY KEY,
  titel       TEXT    NOT NULL,
  erledigt    INTEGER NOT NULL CHECK (erledigt IN (0, 1)),
  erstellt_am TEXT    NOT NULL,
  prioritaet  INTEGER NOT NULL CHECK (prioritaet BETWEEN 1 AND 5),
  category_id TEXT    NOT NULL REFERENCES categories (id),
  -- NULL = ohne eigenes Datum
  datum       TEXT    CHECK (datum GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- UNIQUE: Eine Deadline gehört zu höchstens einem Todo (1:1)
  deadline_id TEXT    UNIQUE REFERENCES deadlines (id) ON DELETE SET NULL,
  position    INTEGER NOT NULL
) STRICT;

CREATE TABLE subtasks (
  id       TEXT    PRIMARY KEY,
  -- Unteraufgaben gehören fest zu ihrem Todo und verschwinden mit ihm
  todo_id  TEXT    NOT NULL REFERENCES todos (id) ON DELETE CASCADE,
  titel    TEXT    NOT NULL,
  erledigt INTEGER NOT NULL CHECK (erledigt IN (0, 1)),
  position INTEGER NOT NULL
) STRICT;

CREATE TABLE exams (
  id       TEXT    PRIMARY KEY,
  titel    TEXT    NOT NULL,
  datum    TEXT    NOT NULL CHECK (datum GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  position INTEGER NOT NULL
) STRICT;

-- Tages-, Wochen- und Kalenderansicht fragen nach Datum
CREATE INDEX todos_datum     ON todos (datum);
CREATE INDEX deadlines_datum ON deadlines (datum);
CREATE INDEX exams_datum     ON exams (datum);
-- Fremdschlüssel: SQLite legt dafür keinen Index an, braucht ihn aber beim Prüfen/Löschen
CREATE INDEX todos_category  ON todos (category_id);
CREATE INDEX subtasks_todo   ON subtasks (todo_id);
`
