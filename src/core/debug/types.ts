export type DebugLevel = 'debug' | 'info' | 'warn' | 'error'

export interface DebugLogEntry {
  id: string
  ts: number
  level: DebugLevel
  scope: string
  event: string
  data?: Record<string, unknown>
  tabId?: number
  url?: string
}

export interface DebugLogPayload {
  level?: DebugLevel
  scope: string
  event: string
  data?: Record<string, unknown>
  url?: string
}

export interface DebugExpectTabPayload {
  url: string
  method: 'open_tab' | 'anchor_fallback'
}
