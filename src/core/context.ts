// Alles, was eine Funktion "von außen" braucht und sonst unrein machen würde:
// neue IDs und die aktuelle Zeit. In Tests wird ein fester Kontext übergeben.
export interface CoreContext {
  newId(): string
  now(): Date
}

export const defaultContext: CoreContext = {
  newId: () => crypto.randomUUID(),
  now: () => new Date()
}
