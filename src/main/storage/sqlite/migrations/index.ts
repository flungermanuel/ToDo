import { sql as initial } from './001_initial'

// Alle Schema-Migrationen, nummeriert und in Reihenfolge. Eine neue Version des
// Schemas = eine neue Datei NNN_name.ts und ein Eintrag hier. Bestehende Einträge
// werden nie geändert – Datenbanken da draußen haben sie schon ausgeführt.
//
// Die Dateien sind TypeScript (SQL als Text) statt .sql, damit Vite nichts
// Besonderes einbinden muss und alles im Build landet.

export interface SchemaMigration {
  version: number
  name: string
  sql: string
}

export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
  { version: 1, name: 'initial', sql: initial }
]
