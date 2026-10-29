import { useCallback, useEffect, useState } from 'react'
import { loadData, useAppStore } from './state/appStore'
import { TitleBar } from './components/TitleBar'
import { TodoWidget } from './components/todos/TodoWidget'
import { DeadlineWidget } from './components/deadlines/DeadlineWidget'
import { Sidebar } from './components/sidebar/Sidebar'

export function App() {
  const { data, status } = useAppStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useEffect(() => {
    void loadData()
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
            <DeadlineWidget data={data} />
            <Sidebar open={sidebarOpen} onClose={closeSidebar} data={data} />
          </main>
        )
      )}
    </div>
  )
}
