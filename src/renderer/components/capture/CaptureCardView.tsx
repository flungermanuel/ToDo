import { CalendarDays, X } from 'lucide-react'
import { cardIssue, type CaptureCard } from '@core/index'
import type { CaptureType } from '@shared/capture'
import type { Category } from '@shared/types'
import { captureActions } from '@renderer/state/captureStore'
import { dayLabel, useToday } from '@renderer/lib/dates'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import { cn } from '@renderer/lib/utils'
import { DatePill } from '@renderer/components/ui/DatePill'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuTrigger
} from '@renderer/components/ui/Menu'
import { PriorityPicker } from '@renderer/components/ui/PriorityPicker'
import { Segmented } from '@renderer/components/ui/Segmented'

const TYPES = [
  { value: 'todo', label: 'Todo' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'pruefung', label: 'Prüfung' }
] as const satisfies readonly { value: CaptureType; label: string }[]

interface CaptureCardViewProps {
  card: CaptureCard
  categories: Category[]
  /** Enter im Titelfeld: alles übernehmen (wenn möglich) */
  onSubmit: () => void
}

// Eine Vorschau-Karte: Typ, Titel, Datum, Kategorie, Priorität. Alles lässt sich ändern,
// bevor etwas gespeichert wird. Fehlende Pflichtfelder sind markiert.
export function CaptureCardView({ card, categories, onSubmit }: CaptureCardViewProps) {
  const today = useToday()
  const issue = cardIssue(card)
  const isExam = card.typ === 'pruefung'
  const isDeadline = card.typ === 'deadline'
  // Kategorie gilt für Todos (und für das Todo, das zu einer Deadline mit angelegt wird)
  const showCategory = card.typ === 'todo' || (isDeadline && card.mitTodo)
  const category = categories.find((c) => c.id === card.categoryId)
  const update = (patch: Partial<CaptureCard>) => captureActions.updateCard(card.key, patch)

  return (
    <div
      className={cn(
        'rounded-lg border bg-bg/60 p-3',
        issue ? 'border-danger/50' : 'border-separator'
      )}
    >
      <div className="flex items-center gap-2">
        <Segmented
          label="Typ"
          size="sm"
          options={TYPES}
          value={card.typ}
          onChange={(typ) => update({ typ })}
        />
        <span className="flex-1" />
        <IconButton label="Eintrag entfernen" onClick={() => captureActions.removeCard(card.key)}>
          <X />
        </IconButton>
      </div>

      <input
        value={card.titel}
        onChange={(e) => update({ titel: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit()
          }
        }}
        aria-label="Titel"
        placeholder="Titel"
        className="mt-2 w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-fg-subtle"
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <DatePill
          value={card.datum ?? undefined}
          onChange={(datum) => update({ datum })}
          onClear={card.typ === 'todo' ? () => update({ datum: null }) : undefined}
          label="Datum"
          className={cn(
            'bg-active',
            card.datum === null && issue === 'datum' && 'bg-danger/10 text-danger hover:text-danger'
          )}
        >
          <CalendarDays className="size-3.5" />
          <span className="tabular-nums">
            {card.datum
              ? dayLabel(card.datum, today)
              : issue === 'datum'
                ? 'Datum fehlt'
                : 'Ohne Datum'}
          </span>
        </DatePill>

        {showCategory && category && (
          <MenuRoot>
            <MenuTrigger
              aria-label={`Kategorie: ${category.name}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-active px-1.5 py-0.5 text-xs text-fg-muted outline-none hover:text-fg"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR_META[category.farbe].css }}
              />
              {category.name}
            </MenuTrigger>
            <MenuContent align="start">
              <MenuRadioGroup
                value={card.categoryId}
                onValueChange={(categoryId) => update({ categoryId })}
              >
                {categories.map((c) => (
                  <MenuRadioItem key={c.id} value={c.id}>
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLOR_META[c.farbe].css }}
                    />
                    {c.name}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuContent>
          </MenuRoot>
        )}

        {!isExam && (
          <PriorityPicker
            value={card.prioritaet}
            onChange={(prioritaet) => update({ prioritaet })}
          />
        )}

        {isDeadline && (
          <label className="ml-auto flex cursor-default items-center gap-1.5 text-xs text-fg-muted select-none">
            <input
              type="checkbox"
              checked={card.mitTodo}
              onChange={(e) => update({ mitTodo: e.target.checked })}
              className="size-3.5 accent-(--accent)"
            />
            Todo dazu anlegen
          </label>
        )}
      </div>

      {issue === 'titel' && <p className="mt-2 text-xs text-danger">Der Titel fehlt.</p>}
    </div>
  )
}
