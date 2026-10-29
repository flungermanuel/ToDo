import { PRIORITIES, type Priority } from '@shared/types'
import { PRIORITY_META } from '@renderer/lib/priority'
import {
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuTrigger
} from './Menu'

interface PriorityPickerProps {
  value: Priority
  onChange: (value: Priority) => void
  /** Ausgegraut darstellen, z. B. bei erledigten Einträgen */
  muted?: boolean
}

// Anzeige als kleine "Signalbalken" (1–5 gefüllt), Klick öffnet ein Menü.
export function PriorityPicker({ value, onChange, muted }: PriorityPickerProps) {
  const meta = PRIORITY_META[value]

  return (
    <MenuRoot>
      <MenuTrigger
        aria-label={`Priorität: ${meta.label}`}
        title={`Priorität: ${meta.label}`}
        className="flex h-6 shrink-0 items-center rounded-md px-1.5 outline-none hover:bg-active focus-visible:bg-active data-[state=open]:bg-active"
      >
        <PriorityBars value={value} muted={muted} />
      </MenuTrigger>

      <MenuContent>
        <MenuLabel>Priorität</MenuLabel>
        <MenuRadioGroup
          value={String(value)}
          onValueChange={(v) => onChange(Number(v) as Priority)}
        >
          {[...PRIORITIES].reverse().map((p) => (
            <MenuRadioItem key={p} value={String(p)}>
              <PriorityBars value={p} />
              <span>{PRIORITY_META[p].label}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </MenuRoot>
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
