import { debugLog } from '@/core/logging'
import { MessageType, sendMessage } from '@/core/messaging'

/** Skip link-click interceptor for our own programmatic opens */
let bypassLinkIntercept = false

export function shouldBypassLinkIntercept(): boolean {
  return bypassLinkIntercept
}

function openViaAnchorClick(url: string): void {
  bypassLinkIntercept = true

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.style.display = 'none'
  document.documentElement.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    bypassLinkIntercept = false
  }, 300)
}

export async function openApprovedTab(url: string): Promise<void> {
  const trimmed = url?.trim()
  if (!trimmed) {
    console.warn('[HostileWebCleaner] openApprovedTab: empty URL')
    return
  }

  try {
    void debugLog('OpenTab', 'via_background', { url: trimmed })
    await sendMessage({
      type: MessageType.OPEN_TAB,
      payload: { url: trimmed },
    })

    void sendMessage({
      type: MessageType.POPUP_ALLOWED,
      payload: { url: trimmed },
    }).catch(() => {})

    return
  } catch (err) {
    console.error('[HostileWebCleaner] Background open failed, trying fallback', err)
    void debugLog('OpenTab', 'background_failed_using_anchor', {
      url: trimmed,
      error: String(err),
    }, { level: 'warn' })
  }

  void sendMessage({
    type: MessageType.DEBUG_EXPECT_TAB,
    payload: { url: trimmed, method: 'anchor_fallback' },
  }).catch(() => {})

  openViaAnchorClick(trimmed)

  void sendMessage({
    type: MessageType.POPUP_ALLOWED,
    payload: { url: trimmed },
  }).catch(() => {})
}
