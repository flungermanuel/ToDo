import { useState } from 'react'
import { MoreHorizontal, Palette, Pencil, Trash2 } from 'lucide-react'
import { CATEGORY_COLORS, type Category, type CategoryColor } from '@shared/types'
import { categoryActions } from '@renderer/state/actions'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import { cn } from '@renderer/lib/utils'
import {
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger
} from '@renderer/components/ui/Menu'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'

interface CategoryMenuProps {
  category: Category
  categories: Category[]
  todoCount: number
  /** Umbenennen startet beim Aufrufer (Überschrift wird zum Eingabefeld) */
  onRename: () => void
  /** Knopf immer zeigen statt nur beim Hovern */
  alwaysVisible?: boolean
}

// "…"-Menü einer Kategorie: Umbenennen, Farbe, Löschen.
export function CategoryMenu({
  category,
  categories,
  todoCount,
  onRename,
  alwaysVisible
}: CategoryMenuProps) {
  const [deleting, setDeleting] = useState(false)
  const canDelete = categories.length > 1

  return (
    <>
      <MenuRoot>
        <MenuTrigger
          aria-label={`Kategorie „${category.name}“ bearbeiten`}
          title="Kategorie bearbeiten"
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md text-fg-subtle outline-none transition-colors',
            'hover:bg-active hover:text-fg focus-visible:opacity-100 data-[state=open]:bg-active data-[state=open]:opacity-100 [&>svg]:size-3.5',
            !alwaysVisible && 'opacity-0 group-hover/cat:opacity-100'
          )}
        >
          <MoreHorizontal />
        </MenuTrigger>

        <MenuContent>
          <MenuItem onSelect={onRename}>
            <Pencil className="size-3.5" />
            Umbenennen
          </MenuItem>

          <MenuSub>
            <MenuSubTrigger>
              <Palette className="size-3.5" />
              Farbe
            </MenuSubTrigger>
            <MenuSubContent>
              <MenuRadioGroup
                value={category.farbe}
                onValueChange={(farbe) =>
                  categoryActions.setColor(category.id, farbe as CategoryColor)
                }
              >
                {CATEGORY_COLORS.map((farbe) => (
                  <MenuRadioItem key={farbe} value={farbe}>
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLOR_META[farbe].css }}
                      aria-hidden
                    />
                    {CATEGORY_COLOR_META[farbe].label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuSubContent>
          </MenuSub>

          <MenuSeparator />
          <MenuItem
            disabled={!canDelete}
            onSelect={() => setDeleting(true)}
            className="text-danger data-highlighted:bg-danger"
            title={canDelete ? undefined : 'Die letzte Kategorie kann nicht gelöscht werden'}
          >
            <Trash2 className="size-3.5" />
            {canDelete ? 'Löschen …' : 'Löschen (letzte Kategorie)'}
          </MenuItem>
        </MenuContent>
      </MenuRoot>

      {/* Außerhalb des Menüs, damit es beim Schließen des Menüs offen bleibt */}
      {deleting && (
        <DeleteCategoryDialog
          open={deleting}
          onOpenChange={setDeleting}
          category={category}
          categories={categories}
          todoCount={todoCount}
        />
      )}
    </>
  )
}
