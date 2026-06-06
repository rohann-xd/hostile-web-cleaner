import { hwcDebug } from '@/core/debug/logger'
import { isAllowlisted } from './overlay-allowlist'

const MAX_CANDIDATES = 50
const SCORE_THRESHOLD = 60
const VIEWPORT_COVERAGE_THRESHOLD = 0.8

const ANTI_ADBLOCK_PATTERNS = [
  /disable\s+(your\s+)?ad\s*block/i,
  /ad\s*blocker\s+detected/i,
  /allow\s+ads/i,
  /whitelist\s+(this\s+)?site/i,
  /virus\s+detected/i,
  /your\s+(computer|device)\s+(is|may\s+be)\s+(infected|at\s+risk)/i,
  /security\s+(alert|warning)/i,
  /subscribe\s+to\s+(continue|read)/i,
  /enable\s+notifications/i,
]


function getZIndex(element: Element): number {
  const zIndex = parseInt(window.getComputedStyle(element).zIndex, 10)
  return Number.isNaN(zIndex) ? 0 : zIndex
}

function coversViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  if (viewportWidth <= 0 || viewportHeight <= 0) return false

  const widthCoverage = rect.width / viewportWidth
  const heightCoverage = rect.height / viewportHeight

  return widthCoverage >= VIEWPORT_COVERAGE_THRESHOLD && heightCoverage >= VIEWPORT_COVERAGE_THRESHOLD
}

function hasAntiAdblockText(element: Element): boolean {
  const text = element.textContent ?? ''
  return ANTI_ADBLOCK_PATTERNS.some((pattern) => pattern.test(text))
}

function isBodyScrollLocked(): boolean {
  const bodyStyle = window.getComputedStyle(document.body)
  const htmlStyle = window.getComputedStyle(document.documentElement)
  return (
    bodyStyle.overflow === 'hidden' ||
    bodyStyle.overflowY === 'hidden' ||
    htmlStyle.overflow === 'hidden' ||
    htmlStyle.overflowY === 'hidden'
  )
}

function getPosition(element: Element): string {
  return window.getComputedStyle(element).position
}

function scoreCandidate(element: Element): number {
  let score = 0
  const position = getPosition(element)

  if (position === 'fixed' || position === 'absolute') {
    score += 30
  }

  if (getZIndex(element) > 9999) {
    score += 20
  }

  if (hasAntiAdblockText(element)) {
    score += 25
  }

  if (isBodyScrollLocked()) {
    score += 15
  }

  if (isAllowlisted(element)) {
    score -= 50
  }

  return score
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

function collectCandidates(): Element[] {
  const candidates: Element[] = []

  for (const element of document.querySelectorAll('*')) {
    if (element.id === 'hwc-popup-prompt-root') continue

    const position = getPosition(element)
    if (position !== 'fixed' && position !== 'absolute' && position !== 'sticky') {
      continue
    }
    if (!coversViewport(element)) continue
    candidates.push(element)
  }

  candidates.sort((a, b) => getZIndex(b) - getZIndex(a))
  return candidates.slice(0, MAX_CANDIDATES)
}

export function removeBlockingOverlays(): number {
  if (!document.body) return 0

  const candidates = collectCandidates()
  let removedCount = 0

  for (const element of candidates) {
    if (!element.isConnected) continue

    const score = scoreCandidate(element)
    if (score < SCORE_THRESHOLD) continue

    const hint = getSelectorHint(element)
    element.remove()
    removedCount += 1

    void hwcDebug('repair', 'overlay_removed', { score, selector: hint })
  }

  return removedCount
}
