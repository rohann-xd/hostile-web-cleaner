import { getSettings } from '@/core/storage/settings'
import {
  clearDebugEntries,
  formatLogsForExport,
  getDebugEntries,
  loadPersistedLogs,
  pushDebugEntry,
} from './debug-store'

interface PendingTabOpen {
  openerTabId?: number
  url: string
  method: string
  at: number
}

const PENDING_TTL_MS = 8_000
const pendingOpens: PendingTabOpen[] = []

let debugEnabled = false

export async function initTabWatch(): Promise<void> {
  await loadPersistedLogs()
  await refreshDebugEnabled()

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
      void refreshDebugEnabled()
    }
  })
}

export async function refreshDebugEnabled(): Promise<void> {
  debugEnabled = (await getSettings()).debug
}

function prunePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS
  while (pendingOpens.length > 0 && pendingOpens[0].at < cutoff) {
    pendingOpens.shift()
  }
}

function normalizeUrlForMatch(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

function urlsMatch(expected: string, actual: string): boolean {
  if (!expected || !actual) return false
  const a = normalizeUrlForMatch(expected)
  const b = normalizeUrlForMatch(actual)
  return a === b || b.startsWith(a) || a.startsWith(b)
}

export function registerExpectedTabOpen(
  openerTabId: number | undefined,
  url: string,
  method: string,
): void {
  prunePending()
  pendingOpens.push({
    openerTabId,
    url,
    method,
    at: Date.now(),
  })

  if (debugEnabled) {
    pushDebugEntry({
      level: 'debug',
      scope: 'TabWatch',
      event: 'expected_tab_registered',
      data: { openerTabId, url, method },
      tabId: openerTabId,
      url,
    })
  }
}

export function consumeExpectedOpen(
  openerTabId: number | undefined,
  url: string,
): PendingTabOpen | null {
  return consumeExpectedMatch({
    id: 0,
    openerTabId,
    pendingUrl: url,
    url,
  } as chrome.tabs.Tab)
}

function consumeExpectedMatch(tab: chrome.tabs.Tab): PendingTabOpen | null {
  prunePending()
  const tabUrl = tab.pendingUrl ?? tab.url ?? ''
  const now = Date.now()

  const idx = pendingOpens.findIndex((p) => {
    if (now - p.at > PENDING_TTL_MS) return false
    if (p.openerTabId != null && tab.openerTabId != null && p.openerTabId !== tab.openerTabId) {
      return false
    }
    return urlsMatch(p.url, tabUrl)
  })

  if (idx < 0) return null
  const [matched] = pendingOpens.splice(idx, 1)
  return matched
}

async function shouldLog(): Promise<boolean> {
  if (!debugEnabled) {
    await refreshDebugEnabled()
  }
  return debugEnabled
}

function handleTabCreated(tab: chrome.tabs.Tab): void {
  void (async () => {
    const matched = consumeExpectedMatch(tab)
    if (!(await shouldLog())) return

    const tabUrl = tab.pendingUrl ?? tab.url ?? ''

    pushDebugEntry({
      level: matched ? 'debug' : 'warn',
      scope: 'TabWatch',
      event: matched ? 'tab_created_tracked' : 'tab_created_UNTRACKED',
      data: {
        tabId: tab.id,
        url: tabUrl,
        openerTabId: tab.openerTabId,
        matchedMethod: matched?.method ?? null,
        hint: matched
          ? null
          : 'Tab opened without our OPEN_TAB/anchor path — check form submit, native bypass, or script before patch',
      },
      tabId: tab.id,
      url: tabUrl,
    })
  })()
}

export function startTabWatchListeners(): void {
  chrome.tabs.onCreated.addListener(handleTabCreated)
}

export function getLogsExportText(): string {
  return formatLogsForExport(getDebugEntries())
}

export { clearDebugEntries, getDebugEntries }
