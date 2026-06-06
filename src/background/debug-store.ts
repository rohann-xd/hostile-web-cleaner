import type { DebugLevel, DebugLogEntry } from '@/core/debug/types'
import { formatDevReport } from '@/core/dev/report'

const MAX_ENTRIES = 400
const STORAGE_KEY = 'hwcDebugLogs'

const buffer: DebugLogEntry[] = []
let persistTimer: ReturnType<typeof setTimeout> | null = null

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function schedulePersist(): void {
  if (persistTimer !== null) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    void chrome.storage.local.set({ [STORAGE_KEY]: buffer })
  }, 400)
}

export async function loadPersistedLogs(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const stored = result[STORAGE_KEY] as DebugLogEntry[] | undefined
  if (!Array.isArray(stored)) return

  buffer.length = 0
  for (const entry of stored.slice(-MAX_ENTRIES)) {
    buffer.push(entry)
  }
}

export function pushDebugEntry(
  entry: Omit<DebugLogEntry, 'id' | 'ts'> & { ts?: number },
): DebugLogEntry {
  const full: DebugLogEntry = {
    id: newId(),
    ts: entry.ts ?? Date.now(),
    level: entry.level,
    scope: entry.scope,
    event: entry.event,
    data: entry.data,
    tabId: entry.tabId,
    url: entry.url,
  }

  buffer.push(full)
  while (buffer.length > MAX_ENTRIES) {
    buffer.shift()
  }

  schedulePersist()
  console.debug(
    `[HWC:${full.scope}]`,
    full.event,
    full.data ?? '',
    full.url ? `@ ${full.url}` : '',
  )

  return full
}

export function getDebugEntries(): DebugLogEntry[] {
  return [...buffer]
}

export function clearDebugEntries(): void {
  buffer.length = 0
  void chrome.storage.local.remove(STORAGE_KEY)
}

export function formatLogsForExport(entries: DebugLogEntry[]): string {
  return formatDevReport(entries)
}

export function logLevelForUntracked(): DebugLevel {
  return 'warn'
}
