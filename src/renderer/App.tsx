import { useEffect } from 'react'
import { loadData, useAppStore } from './state/appStore'
import { TitleBar } from './components/TitleBar'
import { TodoWidget } from './components/todos/TodoWidget'
import { DeadlineWidget } from './components/deadlines/DeadlineWidget'

export function App() {
  const { data, status } = useAppStore()

  useEffect(() => {
    void loadData()
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
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
          </main>
        )
      )}
    </div>
  )
}
