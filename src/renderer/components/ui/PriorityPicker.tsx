import { DropdownMenu } from 'radix-ui'
import { Check } from 'lucide-react'
import { PRIORITIES, type Priority } from '@shared/types'
import { PRIORITY_META } from '@renderer/lib/priority'

interface PriorityPickerProps {
  value: Priority
  onChange: (value: Priority) => void
  /** Ausgegraut darstellen, z. B. bei erledigten Einträgen */
  muted?: boolean
}

// Anzeige als kleine "Signalbalken" (1–5 gefüllt), Klick öffnet ein Menü im macOS-Stil.
export function PriorityPicker({ value, onChange, muted }: PriorityPickerProps) {
  const meta = PRIORITY_META[value]

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Priorität: ${meta.label}`}
        title={`Priorität: ${meta.label}`}
        className="flex h-6 shrink-0 items-center rounded-md px-1.5 outline-none hover:bg-active focus-visible:bg-active data-[state=open]:bg-active"
      >
        <PriorityBars value={value} muted={muted} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-40 rounded-lg border border-separator bg-surface p-1 shadow-card"
        >
          <DropdownMenu.Label className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-fg-muted">
            Priorität
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={String(value)}
            onValueChange={(v) => onChange(Number(v) as Priority)}
          >
            {[...PRIORITIES].reverse().map((p) => (
              <DropdownMenu.RadioItem
                key={p}
                value={String(p)}
                className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-accent data-highlighted:text-white"
              >
                <PriorityBars value={p} />
                <span className="flex-1">{PRIORITY_META[p].label}</span>
                <DropdownMenu.ItemIndicator>
                  <Check className="size-3.5" strokeWidth={2.5} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function PriorityBars({ value, muted }: { value: Priority; muted?: boolean }) {
  const color = muted ? 'var(--fg-subtle)' : PRIORITY_META[value].color
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {PRIORITIES.map((p) => (
        <span
          key={p}
          className="w-[3px] rounded-full"
          style={{
            height: `${4 + p * 1.6}px`,
            backgroundColor: p <= value ? color : 'var(--separator)'
          }}
        />
      ))}
    </span>
  )
}
