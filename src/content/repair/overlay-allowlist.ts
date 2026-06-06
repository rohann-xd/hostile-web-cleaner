const CONSENT_SELECTORS = [
  '#onetrust-consent-sdk',
  '#onetrust-banner-sdk',
  '.cc-window',
  '#CybotCookiebotDialog',
  '#cookieConsent',
  '#cookie-banner',
  '[class*="cookie-consent"]',
  '[class*="cookie-notice"]',
  '[id*="cookie-consent"]',
  '[id*="cookie-notice"]',
]

const VIDEO_EMBED_HOSTS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'twitch.tv',
  'player.',
]

const EXTENSION_UI_SELECTORS = ['#hwc-popup-prompt-root']

function matchesSelector(element: Element, selectors: string[]): boolean {
  return selectors.some((selector) => {
    try {
      return element.matches(selector) || element.closest(selector) !== null
    } catch {
      return false
    }
  })
}

function isVideoEmbedIframe(element: Element): boolean {
  if (element.tagName !== 'IFRAME') return false
  const src = element.getAttribute('src') ?? ''
  if (!src) return false
  try {
    const hostname = new URL(src, window.location.href).hostname.toLowerCase()
    return VIDEO_EMBED_HOSTS.some((host) => hostname.includes(host))
  } catch {
    return false
  }
}

function isLegitimateDialog(element: Element): boolean {
  if (element.getAttribute('role') !== 'dialog') return false

  if (element.getAttribute('aria-modal') === 'true') return true

  const focusable = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  return focusable.length > 0
}

function isSmallBottomBanner(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  if (viewportHeight <= 0) return false

  const coversLessThanHalfViewport = rect.height / viewportHeight < 0.5
  const anchoredToBottom = rect.bottom >= viewportHeight - 20 && rect.top > viewportHeight * 0.3

  return coversLessThanHalfViewport && anchoredToBottom
}

function isVideoContainer(element: Element): boolean {
  if (element.tagName === 'VIDEO') return true
  if (element.querySelector('video')) return true
  if (isVideoEmbedIframe(element)) return true
  if (element.closest('.video-player, [class*="video-player"], [class*="plyr"], [class*="jwplayer"]')) {
    return true
  }
  return false
}

/**
 * Returns true for elements that must never be removed as hostile overlays.
 */
export function isAllowlisted(element: Element): boolean {
  if (matchesSelector(element, EXTENSION_UI_SELECTORS)) return true
  if (isVideoContainer(element)) return true
  if (matchesSelector(element, CONSENT_SELECTORS)) return true
  if (isLegitimateDialog(element)) return true
  if (isSmallBottomBanner(element)) return true
  return false
}
