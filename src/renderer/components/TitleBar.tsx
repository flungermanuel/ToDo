import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Menu, Minus, Plus, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface TitleBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

// Schlanke Titelleiste im macOS-Stil: Ampel-Knöpfe und Menü links, Logo mittig.
// Die ganze Leiste ist Zieh-Fläche, nur die Knöpfe nicht.
export function TitleBar({ sidebarOpen, onToggleSidebar }: TitleBarProps) {
  const focused = useWindowFocus()

  return (
    <header className="app-drag relative flex h-11 shrink-0 items-center px-4">
      <div className="app-no-drag group flex items-center gap-2">
        <TrafficLight
          label="Schließen"
          color="#ff5f57"
          focused={focused}
          onClick={() => window.api.window.close()}
        >
          <X strokeWidth={3} />
        </TrafficLight>
        <TrafficLight
          label="Minimieren"
          color="#febc2e"
          focused={focused}
          onClick={() => window.api.window.minimize()}
        >
          <Minus strokeWidth={3} />
        </TrafficLight>
        <TrafficLight
          label="Maximieren"
          color="#28c840"
          focused={focused}
          onClick={() => window.api.window.toggleMaximize()}
        >
          <Plus strokeWidth={3} />
        </TrafficLight>
      </div>

      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Seitenleiste schließen' : 'Seitenleiste öffnen'}
        aria-expanded={sidebarOpen}
        title={sidebarOpen ? 'Seitenleiste schließen' : 'Seitenleiste öffnen'}
        className={cn(
          'app-no-drag ml-4 flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-active hover:text-fg',
          sidebarOpen && 'bg-active text-fg'
        )}
      >
        <Menu className="size-4" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <AppLogo />
      </div>
    </header>
  )
}

// App-Name als kleines "Logo": Kapsel mit feinem Rand, im Stil der Karten.
function AppLogo() {
  return (
    <h1 className="flex items-center gap-1.5 rounded-full border border-separator bg-surface py-0.5 pr-3 pl-1 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <span className="flex size-[18px] items-center justify-center rounded-full bg-accent text-white">
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      <span className="text-[13px] font-semibold tracking-tight">
        Flung<span className="text-accent">Do</span>
      </span>
    </h1>
  )
}

interface TrafficLightProps {
  label: string
  color: string
  focused: boolean
  onClick: () => void
  children: ReactNode
}

function TrafficLight({ label, color, focused, onClick, children }: TrafficLightProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ '--light': color } as CSSProperties}
      className={cn(
        'flex size-3 items-center justify-center rounded-full',
        'shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.12)]',
        // Wie bei macOS: inaktives Fenster → graue Knöpfe, außer beim Hovern
        focused ? 'bg-(--light)' : 'bg-fg-subtle/50 group-hover:bg-(--light)'
      )}
    >
      {/* Symbole erscheinen erst, wenn man über die Knopfgruppe fährt */}
      <span className="text-black/60 opacity-0 transition-opacity group-hover:opacity-100 [&>svg]:size-2">
        {children}
      </span>
    </button>
  )
}

function useWindowFocus(): boolean {
  const [focused, setFocused] = useState(() => document.hasFocus())

  useEffect(() => {
    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return focused
}
