import { hwcDebug } from '@/core/debug/logger'
import { MessageType, sendMessage } from '@/core/messaging'
import { removeBlockingOverlays } from './overlay-remover'
import { restoreScrollAndPointer } from './scroll-restore'

const LOG_PREFIX = '[HostileWebCleaner:Repair]'

export interface RepairOptions {
  removeOverlay: boolean
  restoreScroll: boolean
}

let repairOptions: RepairOptions = { removeOverlay: false, restoreScroll: false }
let sessionOverlayCount = 0

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

export function runRepair(): number {
  if (!shouldRunRepairInFrame()) return 0
  if (!repairOptions.removeOverlay && !repairOptions.restoreScroll) return 0
  if (!document.body) return 0

  let removedCount = 0

  if (repairOptions.removeOverlay) {
    removedCount = removeBlockingOverlays()
    if (removedCount > 0) {
      notifyOverlayRemoved(removedCount)
    }
  }

  if (repairOptions.restoreScroll && removedCount > 0) {
    restoreScrollAndPointer()
  }

  void hwcDebug('repair', 'run_complete', {
    removedCount,
    sessionOverlayCount,
    removeOverlay: repairOptions.removeOverlay,
    restoreScroll: repairOptions.restoreScroll,
  })

  return removedCount
}

export function initRepair(options: RepairOptions): void {
  repairOptions = options

  if (!shouldRunRepairInFrame()) {
    return
  }

  if (!options.removeOverlay && !options.restoreScroll) {
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
