import {
  hasDownloadIdentityHint,
  labelLooksLikeDownload,
  pathHasDownloadHint,
} from './download-candidate-hints'
import { isAllowlisted } from './overlay-allowlist'

const MAX_CANDIDATES = 30
const SCORE_THRESHOLD = 60

const FILE_EXT = /\.(zip|exe|msi|apk|dmg|rar|7z|tar\.gz|deb|rpm)(\?|#|$)/i
const ALL_CAPS_DOWNLOAD = /^(DOWNLOAD NOW|CLICK HERE|FREE DOWNLOAD)$/

const AD_CONTAINER_SELECTORS = [
  '[class*="ad-"]',
  '[class*="ads-"]',
  '[class*="advert"]',
  '[class*="sponsor"]',
  '[id*="ad-"]',
  '[id*="ads-"]',
  '[id*="sponsor"]',
]

export interface DownloadAnalysis {
  trusted: Element[]
  fake: Element[]
}

function getLabelText(element: Element): string {
  const text = (element.textContent ?? '').trim()
  if (text) return text
  if (element instanceof HTMLInputElement) return element.value.trim()
  return element.getAttribute('aria-label')?.trim() ?? ''
}

function resolveUrl(raw: string | null | undefined): URL | null {
  if (!raw || raw.startsWith('javascript:') || raw === '#') return null
  try {
    return new URL(raw, window.location.href)
  } catch {
    return null
  }
}

function extractUrlsFromOnclick(onclick: string | null): string[] {
  if (!onclick) return []
  const urls: string[] = []
  const patterns = [
    /window\.open\s*\(\s*['"]([^'"]+)['"]/i,
    /location\.(?:href|assign|replace)\s*=\s*['"]([^'"]+)['"]/i,
    /['"](https?:\/\/[^'"]+)['"]/gi,
  ]
  for (const pattern of patterns) {
    const matches = onclick.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) urls.push(match[1])
    }
  }
  return urls
}

function resolveDestination(element: Element): URL | null {
  if (element instanceof HTMLAnchorElement) {
    return resolveUrl(element.getAttribute('href'))
  }

  if (element instanceof HTMLButtonElement || element.getAttribute('role') === 'button') {
    const form = element.closest('form')
    if (form) {
      const action = resolveUrl(form.getAttribute('action'))
      if (action) return action
    }
    const onclickUrls = extractUrlsFromOnclick(element.getAttribute('onclick'))
    for (const raw of onclickUrls) {
      const url = resolveUrl(raw)
      if (url) return url
    }
  }

  if (element instanceof HTMLInputElement) {
    const form = element.closest('form')
    if (form) return resolveUrl(form.getAttribute('action'))
  }

  return null
}

function isDownloadCandidate(element: Element): boolean {
  if (element.hasAttribute('data-hwc-download')) return false
  if (element.closest('#hwc-popup-prompt-root')) return false

  const label = getLabelText(element)
  const destination = resolveDestination(element)

  if (element instanceof HTMLAnchorElement && element.hasAttribute('download')) {
    return true
  }

  if (destination && FILE_EXT.test(destination.pathname + destination.search)) {
    return true
  }

  if (destination && pathHasDownloadHint(destination.pathname)) {
    return true
  }

  if (hasDownloadIdentityHint(element)) {
    return true
  }

  if (labelLooksLikeDownload(label)) {
    return true
  }

  return false
}

function isInsideAdContainer(element: Element): boolean {
  for (const selector of AD_CONTAINER_SELECTORS) {
    try {
      if (element.closest(selector)) return true
    } catch {
      // invalid selector — skip
    }
  }
  return element.closest('iframe') !== null
}

function isBannerSized(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (vw <= 0 || vh <= 0) return false
  return rect.width / vw > 0.6 && rect.height / vh > 0.15
}

function scoreTrust(element: Element, destination: URL | null, candidateCount: number): number {
  let score = 0

  if (element instanceof HTMLAnchorElement && element.hasAttribute('download')) {
    score += 40
  }

  if (destination) {
    if (destination.origin === window.location.origin && FILE_EXT.test(destination.pathname)) {
      score += 35
    }
    if (pathHasDownloadHint(destination.pathname)) {
      score += 25
    }
    if (destination.origin === window.location.origin) {
      score += 10
    }
  }

  if (candidateCount >= 3) {
    score += 15
  }

  if (element instanceof HTMLAnchorElement) {
    const target = (element.getAttribute('target') ?? '').toLowerCase()
    if (target !== '_blank' && target !== '_new') {
      score += 10
    }
  }

  if (!isInsideAdContainer(element)) {
    score += 10
  }

  return score
}

function scoreFake(element: Element, destination: URL | null): number {
  let score = 0
  const label = getLabelText(element)

  if (element instanceof HTMLAnchorElement) {
    const target = (element.getAttribute('target') ?? '').toLowerCase()
    const href = element.getAttribute('href') ?? ''
    if ((target === '_blank' || target === '_new') && destination) {
      if (destination.origin !== window.location.origin && !FILE_EXT.test(destination.pathname)) {
        score += 25
      }
    }
    if (!href || href === '#' || href.startsWith('javascript:')) {
      score += 20
    }
  }

  if (destination && destination.origin !== window.location.origin && !FILE_EXT.test(destination.pathname)) {
    score += 20

    const opensNewTab =
      element instanceof HTMLAnchorElement &&
      ['_blank', '_new'].includes((element.getAttribute('target') ?? '').toLowerCase())
    if (
      !opensNewTab &&
      (labelLooksLikeDownload(label) || /^download$/i.test(label.trim()))
    ) {
      score += 45
    }
  }

  if (isBannerSized(element)) {
    score += 25
  }

  if (ALL_CAPS_DOWNLOAD.test(label.trim())) {
    score += 20
  }

  const onclick = element.getAttribute('onclick') ?? ''
  if (/window\.open/i.test(onclick)) {
    score += 20
  }

  if (isInsideAdContainer(element)) {
    score += 25
  }

  return score
}

function collectCandidates(): Element[] {
  const selector = 'a[href], button, [role="button"], input[type="button"], input[type="submit"]'
  const candidates: Element[] = []

  for (const element of document.querySelectorAll(selector)) {
    if (!isDownloadCandidate(element)) continue
    if (isAllowlisted(element)) continue
    candidates.push(element)
    if (candidates.length >= MAX_CANDIDATES) break
  }

  return candidates
}

function classifyCandidates(candidates: Element[]): DownloadAnalysis {
  const trusted: Element[] = []
  const fake: Element[] = []

  if (candidates.length === 0) {
    return { trusted, fake }
  }

  const scored = candidates.map((element) => {
    const destination = resolveDestination(element)
    const trustScore = scoreTrust(element, destination, candidates.length)
    const fakeScore = scoreFake(element, destination)
    return { element, destination, trustScore, fakeScore }
  })

  scored.sort((a, b) => b.trustScore - a.trustScore)

  const hasMultipleCandidates = candidates.length >= 3
  const topTrust = scored[0]?.trustScore ?? 0

  for (const entry of scored) {
    const { element, trustScore, fakeScore, destination } = entry

    if (candidates.length === 1 && trustScore < SCORE_THRESHOLD && fakeScore < SCORE_THRESHOLD) {
      continue
    }

    if (fakeScore >= SCORE_THRESHOLD && trustScore < SCORE_THRESHOLD) {
      fake.push(element)
      continue
    }

    if (trustScore >= SCORE_THRESHOLD && fakeScore < SCORE_THRESHOLD) {
      trusted.push(element)
      continue
    }

    if (hasMultipleCandidates && entry !== scored[0]) {
      if (
        destination &&
        destination.origin !== window.location.origin &&
        !FILE_EXT.test(destination.pathname) &&
        fakeScore >= 40
      ) {
        fake.push(element)
        continue
      }
    }

    if (hasMultipleCandidates && entry === scored[0] && topTrust >= SCORE_THRESHOLD) {
      trusted.push(element)
    }
  }

  return { trusted, fake }
}

export function analyzeDownloadButtons(): DownloadAnalysis {
  if (!document.body) return { trusted: [], fake: [] }
  return classifyCandidates(collectCandidates())
}
