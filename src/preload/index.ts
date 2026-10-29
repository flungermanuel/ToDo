import { contextBridge } from 'electron'

// Einzige Brücke zwischen Renderer und Main.
// Wird in den nächsten Schritten um load/save und Fenster-Buttons erweitert.
const api = {}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
