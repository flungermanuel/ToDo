import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Category } from '@shared/types'
import { categoryActions } from '@renderer/state/actions'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import { cn } from '@renderer/lib/utils'
import { Dialog, DialogButton } from '@renderer/components/ui/Dialog'

interface DeleteCategoryDialogProps {
  category: Category
  categories: Category[]
  todoCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Fragt beim Löschen einer Kategorie, was mit ihren Todos passieren soll:
// in eine andere Kategorie verschieben (Standard) oder mitlöschen.
export function DeleteCategoryDialog({
  category,
  categories,
  todoCount,
  open,
  onOpenChange
}: DeleteCategoryDialogProps) {
  const others = categories.filter((c) => c.id !== category.id)
  const [art, setArt] = useState<'verschieben' | 'todosLoeschen'>('verschieben')
  const [zielId, setZielId] = useState(others[0]?.id ?? '')
  const ziel = others.some((c) => c.id === zielId) ? zielId : (others[0]?.id ?? '')

  function confirm() {
    if (todoCount === 0 || art === 'todosLoeschen') {
      categoryActions.remove(category.id, { art: 'todosLoeschen' })
    } else {
      categoryActions.remove(category.id, { art: 'verschieben', zielId: ziel })
    }
    onOpenChange(false)
  }

  const todos = todoCount === 1 ? '1 Todo' : `${todoCount} Todos`

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`„${category.name}“ löschen?`}
      description={
        todoCount === 0
          ? 'Die Kategorie ist leer.'
          : `In dieser Kategorie ${todoCount === 1 ? 'ist' : 'sind'} ${todos}. Was soll damit passieren?`
      }
      footer={
        <>
          <DialogButton onClick={() => onOpenChange(false)}>Abbrechen</DialogButton>
          <DialogButton
            variant={art === 'todosLoeschen' || todoCount === 0 ? 'danger' : 'primary'}
            onClick={confirm}
          >
            {todoCount === 0 || art === 'todosLoeschen' ? 'Löschen' : 'Verschieben und löschen'}
          </DialogButton>
        </>
      }
    >
      {todoCount > 0 && (
        <div className="flex flex-col gap-3" role="radiogroup">
          <Option
            checked={art === 'verschieben'}
            onSelect={() => setArt('verschieben')}
            label="In andere Kategorie verschieben"
          >
            <div className="mt-2 flex flex-wrap gap-1.5">
              {others.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setArt('verschieben')
                    setZielId(c.id)
                  }}
                  style={{ '--chip': CATEGORY_COLOR_META[c.farbe].css } as CSSProperties}
                  className={cn(
                    'flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors',
                    art === 'verschieben' && c.id === ziel
                      ? 'border-(--chip) bg-[color-mix(in_srgb,var(--chip)_14%,transparent)] font-medium'
                      : 'border-separator text-fg-muted hover:bg-hover'
                  )}
                >
                  <span className="size-2 rounded-full bg-(--chip)" aria-hidden />
                  {c.name}
                </button>
              ))}
            </div>
          </Option>
          <Option
            checked={art === 'todosLoeschen'}
            onSelect={() => setArt('todosLoeschen')}
            label={`${todos} ebenfalls löschen`}
            danger
          />
        </div>
      )}
    </Dialog>
  )
}

interface OptionProps {
  checked: boolean
  onSelect: () => void
  label: string
  danger?: boolean
  children?: ReactNode
}

function Option({ checked, onSelect, label, danger, children }: OptionProps) {
  return (
    <div>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onSelect}
        className="flex items-center gap-2.5 text-left"
      >
        <span
          className={cn(
            'flex size-4 items-center justify-center rounded-full border-[1.5px]',
            checked ? (danger ? 'border-danger' : 'border-accent') : 'border-fg-subtle'
          )}
        >
          {checked && (
            <span className={cn('size-2 rounded-full', danger ? 'bg-danger' : 'bg-accent')} />
          )}
        </span>
        <span className={cn(danger && checked && 'text-danger')}>{label}</span>
      </button>
      {children && <div className="pl-[26px]">{children}</div>}
    </div>
  )
}
