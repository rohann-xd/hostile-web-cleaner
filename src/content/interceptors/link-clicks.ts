import { captureStack, debugLog } from '@/core/logging'
import { shouldBypassLinkIntercept } from '@/content/open-tab'
import {
  HWC_SOURCE_ISOLATED,
  isPopupProtectionEnabled,
  requestUserApproval,
} from '@/content/popup-bridge'
import { notifyPopupBlocked } from '@/content/notify-popup-blocked'

function resolveLinkUrl(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
    return null
  }
  try {
    return new URL(href, window.location.href).href
  } catch {
    return null
  }
}

function opensNewTab(anchor: HTMLAnchorElement, event: MouseEvent): boolean {
  const target = (anchor.getAttribute('target') ?? '').toLowerCase()
  if (target === '_blank' || target === '_new') return true
  if (event.ctrlKey || event.metaKey || event.shiftKey) return true
  return false
}

async function handleLinkNavigation(
  anchor: HTMLAnchorElement,
  event: MouseEvent,
): Promise<void> {
  if (shouldBypassLinkIntercept()) {
    void debugLog('LinkClick', 'skipped_bypass_flag', { href: anchor.href })
    return
  }

  const url = resolveLinkUrl(anchor)
  const newTab = opensNewTab(anchor, event)

  if (!isPopupProtectionEnabled()) {
    if (newTab && url) {
      void debugLog('LinkClick', 'passthrough_protection_off', { url })
    }
    return
  }

  if (!url) return

  if (!newTab) return

  event.preventDefault()
  event.stopImmediatePropagation()

  void debugLog('LinkClick', 'intercepted_new_tab', {
    url,
    target: anchor.getAttribute('target'),
    button: event.button,
    stack: captureStack(),
  })

  const result = await requestUserApproval(url, {
    target: '_blank',
    source: HWC_SOURCE_ISOLATED,
  })

  if (result === 'session_blocked') {
    return
  }

  if (result === 'denied') {
    void debugLog('LinkClick', 'blocked_declined_or_timeout', { url })
    notifyPopupBlocked(url, 'user_declined')
    return
  }

  if (result === 'allowed') {
    void debugLog('LinkClick', 'allowed_user_confirmed', { url })
  }
  // Tab is opened by the toast Open button via chrome.tabs.create
}

function onClick(event: MouseEvent): void {
  if (event.button !== 0) return

  const anchor = (event.target as Element | null)?.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) return

  void handleLinkNavigation(anchor, event)
}

function onAuxClick(event: MouseEvent): void {
  if (event.button !== 1) return

  const anchor = (event.target as Element | null)?.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) return

  void handleLinkNavigation(anchor, event)
}

let initialized = false

export function initLinkClickInterceptor(): void {
  if (initialized) return
  initialized = true
  document.addEventListener('click', onClick, true)
  document.addEventListener('auxclick', onAuxClick, true)
}
