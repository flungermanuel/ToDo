import type { ComponentProps } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

// Dünne Hüllen um Radix-DropdownMenu mit einheitlicher macOS-Optik.
// Radix kümmert sich um Tastatur-Bedienung, Fokus und Positionierung.

export const MenuRoot = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger
export const MenuRadioGroup = DropdownMenu.RadioGroup

export function MenuContent({ className, ...props }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        collisionPadding={8}
        className={cn(
          'z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-44 overflow-y-auto',
          'rounded-lg border border-separator bg-surface p-1 shadow-card',
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenu.Label>) {
  return (
    <DropdownMenu.Label
      className={cn('px-2 pt-1 pb-1.5 text-[11px] font-medium text-fg-muted', className)}
      {...props}
    />
  )
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="mx-1 my-1 h-px bg-separator" />
}

const itemClass =
  'group/item flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none ' +
  'data-highlighted:bg-accent data-highlighted:text-white data-disabled:text-fg-subtle'

export function MenuItem({ className, ...props }: ComponentProps<typeof DropdownMenu.Item>) {
  return <DropdownMenu.Item className={cn(itemClass, className)} {...props} />
}

export function MenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenu.RadioItem>) {
  return (
    <DropdownMenu.RadioItem className={cn(itemClass, className)} {...props}>
      {children}
      <DropdownMenu.ItemIndicator className="ml-auto">
        <Check className="size-3.5" strokeWidth={2.5} />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  )
}

// --- Untermenüs (z. B. Farbe wählen) ---

export const MenuSub = DropdownMenu.Sub

export function MenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenu.SubTrigger>) {
  return (
    <DropdownMenu.SubTrigger
      className={cn(itemClass, 'data-[state=open]:bg-active', className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-3.5 opacity-60" />
    </DropdownMenu.SubTrigger>
  )
}

export function MenuSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenu.SubContent>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          'z-50 min-w-36 rounded-lg border border-separator bg-surface p-1 shadow-card',
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}
