import { hwcDebug } from '@/core/debug/logger'
import type { DownloadAnalysis } from './download-button-analyzer'

const STYLES_ID = 'hwc-download-styles'
const SUPPRESS_ATTR = 'data-hwc-suppress-bound'

const STYLES = `
  [data-hwc-download="trusted"] {
    outline: 2px solid #22c55e !important;
    outline-offset: 2px;
    position: relative;
  }
  [data-hwc-download="fake"] {
    outline: 2px dashed #ef4444 !important;
    outline-offset: 2px;
    opacity: 0.55 !important;
    pointer-events: none !important;
    position: relative;
  }
  [data-hwc-download]::after {
    display: block;
    font: 11px/1.3 system-ui, sans-serif;
    margin-top: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    width: fit-content;
    max-width: 100%;
  }
  [data-hwc-download="trusted"]::after {
    content: "Likely download";
    background: #dcfce7;
    color: #166534;
  }
  [data-hwc-download="fake"]::after {
    content: "Not a download";
    background: #fee2e2;
    color: #991b1b;
  }
`

const suppressHandlers = new WeakMap<Element, (event: Event) => void>()

function ensureStyles(): void {
  if (document.getElementById(STYLES_ID)) return
  const style = document.createElement('style')
  style.id = STYLES_ID
  style.textContent = STYLES
  document.documentElement.appendChild(style)
}

function getSelectorHint(element: Element): string {
  if (element.id) return `#${element.id}`
  const className = element.className
  if (typeof className === 'string' && className.trim()) {
    const firstClass = className.trim().split(/\s+/)[0]
    return `${element.tagName.toLowerCase()}.${firstClass}`
  }
  return element.tagName.toLowerCase()
}

function clearMark(element: Element): void {
  const handler = suppressHandlers.get(element)
  if (handler) {
    element.removeEventListener('click', handler, true)
    suppressHandlers.delete(element)
  }
  element.removeAttribute('data-hwc-download')
  element.removeAttribute('aria-disabled')
  element.removeAttribute(SUPPRESS_ATTR)
}

function markTrusted(element: Element): void {
  if (element.getAttribute('data-hwc-download') === 'trusted') return
  clearMark(element)
  element.setAttribute('data-hwc-download', 'trusted')
}

function markFake(element: Element, url: string | null): void {
  if (element.getAttribute('data-hwc-download') === 'fake') return
  clearMark(element)
  element.setAttribute('data-hwc-download', 'fake')
  element.setAttribute('aria-disabled', 'true')

  if (!element.hasAttribute(SUPPRESS_ATTR)) {
    const handler = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    element.addEventListener('click', handler, true)
    suppressHandlers.set(element, handler)
    element.setAttribute(SUPPRESS_ATTR, '1')
  }

  void hwcDebug('repair', 'fake_download_suppressed', {
    url: url ?? undefined,
    selector: getSelectorHint(element),
  })
}

function resolveUrlForLog(element: Element): string | null {
  if (element instanceof HTMLAnchorElement) {
    try {
      return new URL(element.href, window.location.href).href
    } catch {
      return element.getAttribute('href')
    }
  }
  return null
}

export function applyDownloadHighlights(analysis: DownloadAnalysis): number {
  ensureStyles()

  let suppressedCount = 0

  for (const element of analysis.trusted) {
    if (!element.isConnected) continue
    markTrusted(element)
  }

  for (const element of analysis.fake) {
    if (!element.isConnected) continue
    const wasFake = element.getAttribute('data-hwc-download') === 'fake'
    markFake(element, resolveUrlForLog(element))
    if (!wasFake) suppressedCount += 1
  }

  return suppressedCount
}
