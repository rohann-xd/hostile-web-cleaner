import { runRepair } from '@/content/repair'

const LOG_PREFIX = '[HostileWebCleaner:Observer]'
const DEBOUNCE_MS = 500
const OBSERVER_TIMEOUT_MS = 30_000

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

export function startDomObserver(onMutationBatch?: () => void): void {
  if (typeof MutationObserver === 'undefined') {
    return
  }

  stopDomObserver()

  const onRepair = onMutationBatch ?? (() => runRepair())

  observer = new MutationObserver((mutations) => {
    if (mutations.length === 0) return

    if (!mutationBatchHasSuspiciousOverlay(mutations)) {
      console.debug(LOG_PREFIX, 'DOM mutations detected (no overlay candidates)', mutations.length)
      return
    }

    console.debug(LOG_PREFIX, 'Suspicious overlay mutation detected', mutations.length)
    scheduleRepair(onRepair)
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  stopTimer = setTimeout(() => {
    console.debug(LOG_PREFIX, 'Stopping observer after timeout')
    stopDomObserver()
  }, OBSERVER_TIMEOUT_MS)

  console.debug(LOG_PREFIX, 'MutationObserver started')
}
