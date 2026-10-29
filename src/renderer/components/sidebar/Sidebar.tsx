import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Settings } from 'lucide-react'
import type { AppData } from '@shared/types'
import { categoryActions } from '@renderer/state/actions'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import { AddRow } from '@renderer/components/ui/AddRow'
import { CategoryMenu } from '@renderer/components/categories/CategoryMenu'
import { RenameCategoryInput } from '@renderer/components/categories/RenameCategoryInput'

interface SidebarProps {
  open: boolean
  onClose: () => void
  data: AppData
}

// Seitenleiste, die über das Hamburger-Menü von links hereinfährt.
// Breite: 30 % des Fensters, mindestens 260 px, höchstens 380 px.
// Inhalt vorerst: Kategorien verwalten. Platz für mehr ist unten vorgesehen.
export function Sidebar({ open, onClose, data }: SidebarProps) {
  const panelRef = useRef<HTMLElement>(null)

  // Escape schließt – aber nicht, wenn gerade ein Menü oder Dialog darin offen ist
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Beim Öffnen den Fokus in die Leiste setzen (Tastaturbedienung)
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Abdunklung unterhalb der Titelleiste – Klick daneben schließt */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-x-0 top-11 bottom-0 z-40 bg-black/15 dark:bg-black/35"
            aria-hidden
          />
          <motion.aside
            key="panel"
            ref={panelRef}
            tabIndex={-1}
            aria-label="Seitenleiste"
            initial={{ x: '-105%' }}
            animate={{ x: 0 }}
            exit={{ x: '-105%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="fixed top-11 bottom-3 left-3 z-40 flex w-[clamp(260px,30vw,380px)] flex-col rounded-card border border-separator bg-surface shadow-card outline-none"
          >
            <CategoryList data={data} />

            <footer className="border-t border-separator p-2">
              <button
                type="button"
                disabled
                title="Kommt bald"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-fg-subtle"
              >
                <Settings className="size-4" />
                Einstellungen
                <span className="ml-auto text-[11px]">bald</span>
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function CategoryList({ data }: { data: AppData }) {
  const [renamingId, setRenamingId] = useState<string | null>(null)

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-5 pt-4 pb-2 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
        Kategorien
      </h2>

      <ul className="min-h-0 overflow-y-auto px-2">
        {data.categories.map((category) => {
          const todos = data.todos.filter((t) => t.categoryId === category.id)
          const offen = todos.filter((t) => !t.erledigt).length
          return (
            <li
              key={category.id}
              className="group/cat flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-3 hover:bg-hover"
            >
              {renamingId === category.id ? (
                <RenameCategoryInput
                  category={category}
                  categories={data.categories}
                  onDone={() => setRenamingId(null)}
                />
              ) : (
                <>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR_META[category.farbe].css }}
                    aria-hidden
                  />
                  <span
                    className="min-w-0 flex-1 truncate"
                    onDoubleClick={() => setRenamingId(category.id)}
                  >
                    {category.name}
                  </span>
                  <span className="text-xs text-fg-subtle tabular-nums">
                    {offen > 0 ? offen : ''}
                  </span>
                </>
              )}
              <CategoryMenu
                category={category}
                categories={data.categories}
                todoCount={todos.length}
                onRename={() => setRenamingId(category.id)}
              />
            </li>
          )
        })}
      </ul>

      <div className="px-2 pb-2">
        {/* null = Name leer oder schon vergeben → Feld bleibt stehen und wird markiert */}
        <AddRow placeholder="Neue Kategorie" onAdd={(name) => categoryActions.add(name) !== null} />
      </div>
    </section>
  )
}
