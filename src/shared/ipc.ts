// Vertrag zwischen Renderer und Main: Kanalnamen und die Form von window.api.
// Liegt in shared, damit main, preload und renderer dieselbe Quelle nutzen.

export const IpcChannels = {
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close'
} as const

export interface WindowApi {
  minimize(): void
  toggleMaximize(): void
  close(): void
}

export interface Api {
  window: WindowApi
}
