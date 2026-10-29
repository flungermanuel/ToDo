import type { DeadlineView } from '@core/index'
import type { Category, IsoDate } from '@shared/types'

/**
 * Was jede Todo-Zeile außer dem Todo selbst braucht – als ein Objekt gebündelt,
 * damit es nicht durch jede Ebene einzeln durchgereicht werden muss.
 */
export interface ListContext {
  /** Alle Deadlines (für Verknüpfungs-Menü und Anzeige der verknüpften Deadline) */
  deadlines: DeadlineView[]
  todoTitles: Map<string, string>
  categories: Category[]
  /** Gerade angezeigter Tag – dann steht das Datum nicht extra am Todo */
  contextDay?: IsoDate
  /** Farbpunkt der Kategorie am Todo zeigen (wenn nicht nach Kategorie gruppiert wird) */
  showCategory?: boolean
}
