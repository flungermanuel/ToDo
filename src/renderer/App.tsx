import { TitleBar } from './components/TitleBar'
import { Widget } from './components/Widget'

export function App() {
  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <main className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-4 px-4 pb-4">
        <Widget title="Todos">
          <p className="px-3 py-2 text-fg-muted">Noch keine Todos.</p>
        </Widget>
        <Widget title="Deadlines">
          <p className="px-3 py-2 text-fg-muted">Noch keine Deadlines.</p>
        </Widget>
      </main>
    </div>
  )
}
