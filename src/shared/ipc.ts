// Vertrag zwischen Renderer und Main: Kanalnamen und die Form von window.api.
// Liegt in shared, damit main, preload und renderer dieselbe Quelle nutzen.
import type { AppData } from './types'

export const IpcChannels = {
  dataLoad: 'data:load',
  dataSave: 'data:save',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close'
} as const

export interface DataApi {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
}

export interface WindowApi {
  minimize(): void
  toggleMaximize(): void
  close(): void
}

export interface Api {
  data: DataApi
  window: WindowApi
}
