/**
 * Hinweise aus Main, die der Nutzer sehen soll – z. B. "Daten waren unlesbar" oder
 * "Übernahme in die Datenbank fehlgeschlagen". Sie entstehen oft schon beim Start,
 * bevor das Fenster da ist; deshalb werden sie gesammelt, und der Renderer holt sie
 * nach dem Laden einmal ab.
 */
export class Notices {
  private messages: string[] = []

  add(message: string): void {
    this.messages.push(message)
  }

  /** Gibt alle Hinweise zurück und leert die Liste – jeder wird nur einmal gezeigt. */
  take(): string[] {
    const taken = this.messages
    this.messages = []
    return taken
  }
}
