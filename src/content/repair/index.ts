import { hwcDebug } from '@/core/debug/logger'
import { MessageType, sendMessage } from '@/core/messaging'
import { analyzeDownloadButtons } from './download-button-analyzer'
import { applyDownloadHighlights } from './download-button-highlighter'
import { removeBlockingOverlays } from './overlay-remover'
import { restoreScrollAndPointer } from './scroll-restore'

const LOG_PREFIX = '[HostileWebCleaner:Repair]'

export interface RepairOptions {
  removeOverlay: boolean
  restoreScroll: boolean
  flagFakeDownloads: boolean
}

let repairOptions: RepairOptions = {
  removeOverlay: false,
  restoreScroll: false,
  flagFakeDownloads: false,
}
let sessionOverlayCount = 0
let sessionFakeDownloadCount = 0

/** Fullscreen overlay repair targets the main page, not nested iframes (ads, mail panes). */
export function shouldRunRepairInFrame(): boolean {
  return window === window.top
}

function whenBodyReady(callback: () => void): void {
  if (document.body) {
    callback()
    return
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true })
    return
  }

  const observer = new MutationObserver(() => {
    if (document.body) {
      observer.disconnect()
      callback()
    }
  })
  observer.observe(document.documentElement, { childList: true })
}

function notifyOverlayRemoved(count: number): void {
  if (count <= 0) return

  sessionOverlayCount += count
  void sendMessage({
    type: MessageType.OVERLAY_REMOVED,
    payload: { count, url: window.location.href },
  }).catch(() => {})
}

function notifyFakeDownloadsFlagged(count: number): void {
  if (count <= 0) return

  sessionFakeDownloadCount += count
  void sendMessage({
    type: MessageType.FAKE_DOWNLOAD_FLAGGED,
    payload: { count, url: window.location.href },
  }).catch(() => {})
}

export function runRepair(): number {
  if (!shouldRunRepairInFrame()) return 0
  if (!repairOptions.removeOverlay && !repairOptions.restoreScroll && !repairOptions.flagFakeDownloads) {
    return 0
  }
  if (!document.body) return 0

  let removedCount = 0
  let suppressedCount = 0

  if (repairOptions.removeOverlay) {
    removedCount = removeBlockingOverlays()
    if (removedCount > 0) {
      notifyOverlayRemoved(removedCount)
    }
  }

  if (repairOptions.restoreScroll && removedCount > 0) {
    restoreScrollAndPointer()
  }

  if (repairOptions.flagFakeDownloads) {
    const analysis = analyzeDownloadButtons()
    suppressedCount = applyDownloadHighlights(analysis)
    if (suppressedCount > 0) {
      notifyFakeDownloadsFlagged(suppressedCount)
    }

    void hwcDebug('repair', 'download_scan_complete', {
      trustedCount: analysis.trusted.length,
      fakeCount: analysis.fake.length,
      suppressedCount,
      sessionFakeDownloadCount,
    })
  }

  void hwcDebug('repair', 'run_complete', {
    removedCount,
    suppressedCount,
    sessionOverlayCount,
    sessionFakeDownloadCount,
    removeOverlay: repairOptions.removeOverlay,
    restoreScroll: repairOptions.restoreScroll,
    flagFakeDownloads: repairOptions.flagFakeDownloads,
  })

  return removedCount + suppressedCount
}

export function initRepair(options: RepairOptions): void {
  repairOptions = options

  if (!shouldRunRepairInFrame()) {
    return
  }

  if (!options.removeOverlay && !options.restoreScroll && !options.flagFakeDownloads) {
    console.debug(LOG_PREFIX, 'Repair disabled for this page')
    return
  }

  console.debug(LOG_PREFIX, 'Repair modules active', options)

  whenBodyReady(() => {
    runRepair()
  })
}

export function getSessionOverlayCount(): number {
  return sessionOverlayCount
}

export function getSessionFakeDownloadCount(): number {
  return sessionFakeDownloadCount
}

export function isRepairEnabled(): boolean {
  if (!shouldRunRepairInFrame()) return false
  return (
    repairOptions.removeOverlay ||
    repairOptions.restoreScroll ||
    repairOptions.flagFakeDownloads
  )
}

export function isDownloadScanEnabled(): boolean {
  return repairOptions.flagFakeDownloads
}

export function refreshRepairOnPage(): void {
  if (!isRepairEnabled()) return
  whenBodyReady(() => {
    runRepair()
  })
}
