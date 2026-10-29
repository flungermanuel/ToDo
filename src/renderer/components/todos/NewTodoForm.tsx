import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { Category, IsoDate } from '@shared/types'
import { categoryActions, todoActions } from '@renderer/state/actions'
import { useLastCategory } from '@renderer/state/useLastCategory'
import { dayLabel, useToday } from '@renderer/lib/dates'
import { AddRow } from '@renderer/components/ui/AddRow'
import { DatePill } from '@renderer/components/ui/DatePill'
import { CategoryChips } from './CategoryChips'

interface NewTodoFormProps {
  categories: Category[]
  /** Datum, das ein neues Todo bekommt – der gerade angezeigte Tag */
  defaultDate: IsoDate
  /** Wird nach dem Anlegen aufgerufen, z. B. um die Kategorie aufzuklappen */
  onAdded?: (categoryId: string) => void
}

// "Neues Todo" mit Datum (Standard: angezeigter Tag) und Kategorie-Chips.
export function NewTodoForm({ categories, defaultDate, onAdded }: NewTodoFormProps) {
  const today = useToday()
  const [categoryId, setCategoryId] = useLastCategory(categories)
  // Nur gesetzt, wenn man bewusst ein anderes Datum gewählt hat; gilt für das nächste Todo
  const [chosenDate, setChosenDate] = useState<IsoDate | null>(null)
  const datum = chosenDate ?? defaultDate

  function add(titel: string) {
    todoActions.add({ titel, categoryId, datum })
    setChosenDate(null)
    onAdded?.(categoryId)
  }

  return (
    <>
      <AddRow placeholder="Neues Todo" onAdd={add} autoFocus>
        <DatePill
          value={datum}
          onChange={setChosenDate}
          label="Datum für neues Todo"
          className={chosenDate ? 'text-accent hover:text-accent' : undefined}
        >
          <CalendarDays className="size-3.5" />
          <span className="tabular-nums">{dayLabel(datum, today)}</span>
        </DatePill>
      </AddRow>
      <CategoryChips
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        onCreate={(name) => categoryActions.add(name)}
      />
    </>
  )
}
