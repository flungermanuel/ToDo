import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { isNameTaken, type CategoryGroup, type DeadlineView } from '@core/index'
import type { Category } from '@shared/types'
import { categoryActions } from '@renderer/state/actions'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import { cn } from '@renderer/lib/utils'
import { CategoryMenu } from '@renderer/components/categories/CategoryMenu'
import { TodoItem } from './TodoItem'

interface CategorySectionProps {
  group: CategoryGroup
  collapsed: boolean
  onToggle: () => void
  deadlines: DeadlineView[]
  todoTitles: Map<string, string>
  categories: Category[]
}

// Ein Kategorie-Block: Überschrift (klickbar zum Ein-/Ausklappen) und die Todos.
// Erledigte stehen ausgegraut am Ende.
export function CategorySection({
  group,
  collapsed,
  onToggle,
  deadlines,
  todoTitles,
  categories
}: CategorySectionProps) {
  const [renaming, setRenaming] = useState(false)
  const { category, offen, erledigt } = group
  const color = CATEGORY_COLOR_META[category.farbe].css
  const leer = offen.length === 0 && erledigt.length === 0

  return (
    <section className="mt-1 first:mt-0">
      <div className="group/cat flex items-center gap-1 rounded-lg pr-2 hover:bg-hover">
        {renaming ? (
          <RenameInput
            category={category}
            categories={categories}
            onDone={() => setRenaming(false)}
          />
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 text-left"
          >
            <ChevronRight
              className={cn(
                'size-3.5 shrink-0 text-fg-subtle transition-transform',
                !collapsed && 'rotate-90'
              )}
            />
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="truncate text-[13px] font-semibold">{category.name}</span>
            <span className="text-xs text-fg-subtle tabular-nums">
              {offen.length > 0 ? offen.length : erledigt.length > 0 ? '✓' : ''}
            </span>
          </button>
        )}
        <CategoryMenu
          category={category}
          categories={categories}
          todoCount={offen.length + erledigt.length}
          onRename={() => setRenaming(true)}
        />
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {leer && <p className="py-1.5 pl-[42px] text-xs text-fg-subtle">Keine Todos</p>}
            <ul>
              <AnimatePresence initial={false}>
                {[...offen, ...erledigt].map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    deadlines={deadlines}
                    todoTitles={todoTitles}
                    categories={categories}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

interface RenameInputProps {
  category: Category
  categories: Category[]
  onDone: () => void
}

// Die Überschrift wird zum Eingabefeld. Enter/Klick daneben speichert, Escape bricht ab.
// Ein schon vergebener Name wird rot markiert und nicht übernommen.
function RenameInput({ category, categories, onDone }: RenameInputProps) {
  const [name, setName] = useState(category.name)
  const taken = isNameTaken({ categories }, name, category.id)

  function commit() {
    if (name.trim() && !taken) categoryActions.rename(category.id, name)
    onDone()
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-[33px]">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: CATEGORY_COLOR_META[category.farbe].css }}
        aria-hidden
      />
      <input
        autoFocus
        value={name}
        aria-label="Kategorie umbenennen"
        aria-invalid={taken}
        title={taken ? 'Diesen Namen gibt es schon' : undefined}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onDone()
        }}
        className={cn(
          'min-w-0 flex-1 rounded-md border bg-surface px-1.5 py-0.5 text-[13px] font-semibold outline-none',
          taken ? 'border-danger' : 'border-accent'
        )}
      />
    </div>
  )
}
