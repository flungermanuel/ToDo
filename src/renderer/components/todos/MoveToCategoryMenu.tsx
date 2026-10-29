import { FolderInput } from 'lucide-react'
import type { Category, Todo } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import {
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuTrigger
} from '@renderer/components/ui/Menu'

interface MoveToCategoryMenuProps {
  todo: Todo
  categories: Category[]
}

// Menü am Todo: in eine andere Kategorie verschieben.
export function MoveToCategoryMenu({ todo, categories }: MoveToCategoryMenuProps) {
  return (
    <MenuRoot>
      <MenuTrigger
        aria-label="In Kategorie verschieben"
        title="In Kategorie verschieben"
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-fg-subtle opacity-0 outline-none transition-colors group-hover:opacity-100 hover:bg-active hover:text-fg focus-visible:opacity-100 data-[state=open]:bg-active data-[state=open]:opacity-100 [&>svg]:size-3.5"
      >
        <FolderInput />
      </MenuTrigger>

      <MenuContent>
        <MenuLabel>Verschieben nach</MenuLabel>
        <MenuRadioGroup
          value={todo.categoryId}
          onValueChange={(categoryId) => todoActions.move(todo.id, categoryId)}
        >
          {categories.map((c) => (
            <MenuRadioItem key={c.id} value={c.id}>
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR_META[c.farbe].css }}
                aria-hidden
              />
              <span className="truncate">{c.name}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </MenuRoot>
  )
}
