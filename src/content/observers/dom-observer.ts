import { runRepair } from '@/content/repair'
import {
  DOWNLOAD_PATH_HINT,
  hasDownloadIdentityHint,
  labelLooksLikeDownload,
} from '@/content/repair/download-candidate-hints'
const LOG_PREFIX = '[HostileWebCleaner:Observer]'
const DEBOUNCE_MS = 500
const DEFAULT_OBSERVER_TIMEOUT_MS = 30_000
const DOWNLOAD_SCAN_OBSERVER_TIMEOUT_MS = 120_000

export interface DomObserverOptions {
  extendForDownloads?: boolean
}

let observer: MutationObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let stopTimer: ReturnType<typeof setTimeout> | null = null

function coversLargeViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  if (viewportWidth <= 0 || viewportHeight <= 0) return false

  return rect.width / viewportWidth >= 0.8 && rect.height / viewportHeight >= 0.8
}

function isSuspiciousOverlayNode(node: Node): boolean {
  if (!(node instanceof Element)) return false

  const position = window.getComputedStyle(node).position
  if (position !== 'fixed' && position !== 'sticky' && position !== 'absolute') {
    return false
  }

  return coversLargeViewport(node)
}

function getElementLabel(element: Element): string {
  const text = (element.textContent ?? '').trim()
  if (text) return text
  if (element instanceof HTMLInputElement) return element.value.trim()
  return element.getAttribute('aria-label')?.trim() ?? ''
}

function checkDownloadCandidateElement(element: Element): boolean {
  if (element.matches('a[download]')) return true

  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute('href') ?? ''
    if (/\.(zip|exe|msi|apk|dmg|rar|7z)(\?|#|$)/i.test(href)) return true
    try {
      const url = new URL(href, window.location.href)
      if (DOWNLOAD_PATH_HINT.test(url.pathname)) return true
    } catch {
      // invalid href — skip
    }
  }

  if (hasDownloadIdentityHint(element)) return true

  const label = getElementLabel(element)
  if (labelLooksLikeDownload(label)) {
    if (
      element.matches('a[href], button, [role="button"], input[type="button"], input[type="submit"]')
    ) {
      return true
    }
  }

  return false
}

function isDownloadCandidateNode(node: Node): boolean {
  if (!(node instanceof Element)) return false

  if (checkDownloadCandidateElement(node)) return true
  for (const child of node.querySelectorAll('a[href], button, [role="button"]')) {
    if (checkDownloadCandidateElement(child)) return true
  }
  return false
}

function mutationBatchHasDownloadCandidate(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (isDownloadCandidateNode(node)) return true
    }
  }
  return false
}

function mutationBatchHasSuspiciousOverlay(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element) {
        if (isSuspiciousOverlayNode(node)) return true
        for (const child of node.querySelectorAll('*')) {
          if (isSuspiciousOverlayNode(child)) return true
        }
      }
    }
  }
  return false
}

function scheduleRepair(onRepair: () => void): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    onRepair()
  }, DEBOUNCE_MS)
}

export function stopDomObserver(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (stopTimer !== null) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  observer?.disconnect()
  observer = null
}

export function startDomObserver(
  onMutationBatch?: () => void,
  options?: DomObserverOptions,
): void {
  if (typeof MutationObserver === 'undefined') {
    return
  }

  stopDomObserver()

  const onRepair = onMutationBatch ?? (() => runRepair())
  const timeoutMs = options?.extendForDownloads
    ? DOWNLOAD_SCAN_OBSERVER_TIMEOUT_MS
    : DEFAULT_OBSERVER_TIMEOUT_MS

  observer = new MutationObserver((mutations) => {
    if (mutations.length === 0) return

    const hasOverlay = mutationBatchHasSuspiciousOverlay(mutations)
    const hasDownload = mutationBatchHasDownloadCandidate(mutations)

    if (!hasOverlay && !hasDownload) {
      console.debug(LOG_PREFIX, 'DOM mutations detected (no repair candidates)', mutations.length)
      return
    }

    console.debug(LOG_PREFIX, 'Repair candidate mutation detected', {
      mutations: mutations.length,
      overlay: hasOverlay,
      download: hasDownload,
    })
    scheduleRepair(onRepair)
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  stopTimer = setTimeout(() => {
    console.debug(LOG_PREFIX, 'Stopping observer after timeout')
    stopDomObserver()
  }, timeoutMs)

  console.debug(LOG_PREFIX, 'MutationObserver started', { timeoutMs })
}
