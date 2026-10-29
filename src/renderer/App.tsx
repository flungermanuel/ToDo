import { useEffect } from 'react'
import { loadData, useAppStore } from './state/appStore'
import { TitleBar } from './components/TitleBar'
import { Widget } from './components/Widget'
import { TodoWidget } from './components/todos/TodoWidget'

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
          <main className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-4 px-4 pb-4">
            <TodoWidget todos={data.todos} />
            <Widget title="Deadlines">
              <p className="px-3 py-2 text-fg-muted">Noch keine Deadlines.</p>
            </Widget>
          </main>
        )
      )}
    </div>
  )
}
