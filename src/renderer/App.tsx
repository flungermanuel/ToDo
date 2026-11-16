import { useCallback, useEffect, useState } from 'react'
import { loadData, useAppStore } from './state/appStore'
import { captureActions } from './state/captureStore'
import { CaptureOverlay } from './components/capture/CaptureOverlay'
import { TitleBar } from './components/TitleBar'
import { TodoWidget } from './components/todos/TodoWidget'
import { CalendarWidget } from './components/calendar/CalendarWidget'
import { DeadlineWidget } from './components/deadlines/DeadlineWidget'
import { ExamWidget } from './components/exams/ExamWidget'
import { Sidebar } from './components/sidebar/Sidebar'
import { ToastHost } from './components/ui/ToastHost'

export function App() {
  const { data, status } = useAppStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useEffect(() => {
    void loadData()
  }, [])

  // Strg+K öffnet die Schnellleiste für die KI-Eingabe – überall in der App
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        captureActions.open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TitleBar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      {status === 'error' ? (
        <p className="m-auto text-fg-muted">
          Die Daten konnten nicht geladen werden. Bitte starte die App neu.
        </p>
      ) : (
        // Während des Ladens (Sekundenbruchteile) bleibt die Fläche leer statt zu flackern
        status === 'ready' && (
          <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 px-4 pb-4">
            <TodoWidget data={data} />
            {/* Rechte Spalte: Deadlines, Prüfungen (beide so hoch wie nötig, scrollen),
                darunter der Kalender */}
            <div className="flex min-h-0 flex-col gap-4">
              <DeadlineWidget data={data} />
              <ExamWidget data={data} />
              <CalendarWidget data={data} />
            </div>
            <Sidebar open={sidebarOpen} onClose={closeSidebar} data={data} />
            <CaptureOverlay data={data} />
          </main>
        )
      )}
      <ToastHost />
    </div>
  )
}
