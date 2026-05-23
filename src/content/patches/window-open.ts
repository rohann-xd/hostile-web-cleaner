import { captureStack, debugLog } from '@/core/logging'
import {
  HWC_SOURCE_MAIN,
  isPopupProtectionEnabled,
  requestUserApproval,
} from '@/content/popup-bridge'
import { notifyPopupBlocked } from '@/content/notify-popup-blocked'
import { isUserGestureActive } from './user-gesture'

const nativeOpen = window.open.bind(window)
let patched = false

function resolveUrl(url?: string | URL): string {
  if (!url) return ''
  try {
    return new URL(String(url), window.location.href).href
  } catch {
    return String(url)
  }
}

function patchedWindowOpen(
  this: Window,
  url?: string | URL,
  target?: string,
  features?: string,
): Window | null {
    const resolvedUrl = resolveUrl(url)
    const gesture = isUserGestureActive()
    const protection = isPopupProtectionEnabled()
    const frame = window === window.top ? 'top' : 'iframe'

    void debugLog('WindowOpen', 'called', {
      url: resolvedUrl,
      target,
      features,
      frame,
      protection,
      gesture,
      stack: captureStack(),
    })

    if (!protection) {
      void debugLog('WindowOpen', 'passthrough_protection_off', { url: resolvedUrl })
      return nativeOpen.call(this, url, target, features)
    }

    if (!gesture) {
      void debugLog('WindowOpen', 'blocked_no_gesture', { url: resolvedUrl }, { level: 'info' })
      notifyPopupBlocked(resolvedUrl, 'no_user_gesture')
      return null
    }

    void (async () => {
      void debugLog('WindowOpen', 'prompt_requested', { url: resolvedUrl, target })

      const result = await requestUserApproval(resolvedUrl, {
        target,
        features,
        source: HWC_SOURCE_MAIN,
      })

      if (result === 'session_blocked') {
        return
      }

      if (result === 'denied') {
        void debugLog('WindowOpen', 'blocked_declined_or_timeout', { url: resolvedUrl })
        notifyPopupBlocked(resolvedUrl, 'user_declined')
        return
      }

      if (result === 'allowed') {
        void debugLog('WindowOpen', 'allowed_user_confirmed', { url: resolvedUrl })
      }
      // Tab is opened by the toast Open button via chrome.tabs.create
    })()

    return null
}

export function patchWindowOpenSync(): void {
  if (patched) return
  patched = true

  try {
    Object.defineProperty(window, 'open', {
      configurable: true,
      enumerable: true,
      writable: false,
      value: patchedWindowOpen,
    })
  } catch {
    window.open = patchedWindowOpen
  }

  try {
    Object.defineProperty(Window.prototype, 'open', {
      configurable: true,
      enumerable: true,
      writable: false,
      value: patchedWindowOpen,
    })
  } catch {
    // Some environments restrict prototype patching
  }
}
