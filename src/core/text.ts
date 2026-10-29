/** Bereinigt einen Titel. Gibt null zurück, wenn nichts übrig bleibt. */
export function cleanTitle(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.length > 0 ? trimmed : null
}
