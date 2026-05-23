import {
  PROMPT_TIMEOUT_MS,
  hostnameFromUrl,
  onPopupRequest,
  postPopupResponse,
  type PopupRequestDetail,
} from '@/content/popup-bridge'
import { getBlockingKey, isBlockablePopupTarget } from '@/core/domains/normalize'
import { debugLog } from '@/core/logging'
import {
  MessageType,
  sendMessage,
  type BlockDomainSessionResponse,
} from '@/core/messaging'
import {
  isDomainBlockedForSession,
  mergeSessionBlockedDomains,
} from '@/core/storage/session-blocklist'
import { isPopupProtectionEnabled } from '@/content/popup-bridge'
import { openApprovedTab } from '@/content/open-tab'
import { notifyPopupBlocked } from '@/content/notify-popup-blocked'

const ROOT_ID = 'hwc-popup-prompt-root'
const EXTENSION_NAME = 'Hostile Web Cleaner'

const STYLES = `
  :host { all: initial; }
  .hwc-toast-stack {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(420px, calc(100vw - 32px));
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: none;
  }
  .hwc-toast {
    pointer-events: auto;
    background: rgba(22, 22, 28, 0.78);
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
    color: #f5f5f5;
    border-radius: 14px;
    padding: 14px 16px 16px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .hwc-toast-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .hwc-brand-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .hwc-brand-name {
    font-size: 13px;
    font-weight: 600;
    color: #f0f0f0;
    letter-spacing: 0.01em;
    line-height: 1.2;
  }
  .hwc-toast-label {
    font-size: 12px;
    color: #b8b8b8;
    margin: 0 0 6px;
  }
  .hwc-toast-host {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px;
    word-break: break-all;
  }
  .hwc-toast-url {
    font-size: 11px;
    color: #888;
    margin: 0 0 8px;
    word-break: break-all;
    line-height: 1.4;
  }
  .hwc-toast-countdown {
    font-size: 11px;
    color: #666;
    margin: 0 0 12px;
  }
  .hwc-toast-paused .hwc-toast-countdown {
    color: #999;
  }
  .hwc-toast-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }
  .hwc-btn {
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }
  .hwc-btn-block-domain {
    background: transparent;
    color: #c9c9c9;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .hwc-btn-block-domain:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #eee;
  }
  .hwc-btn-block {
    background: #333;
    color: #eee;
  }
  .hwc-btn-block:hover { background: #444; }
  .hwc-btn-open {
    background: #2563eb;
    color: #fff;
  }
  .hwc-btn-open:hover { background: #1d4ed8; }
`

function getOrCreateStack(shadow: ShadowRoot): HTMLElement {
  let stack = shadow.querySelector('.hwc-toast-stack') as HTMLElement | null
  if (!stack) {
    stack = document.createElement('div')
    stack.className = 'hwc-toast-stack'
    shadow.appendChild(stack)
  }
  return stack
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Per-toast dismiss timer; pauses on hover without affecting other toasts. */
function createPausableDismissTimer(
  countdownEl: HTMLElement,
  onExpire: () => void,
): { pause: () => void; resume: () => void; destroy: () => void } {
  let remainingMs = PROMPT_TIMEOUT_MS
  let intervalId: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let paused = false
  let destroyed = false

  const updateLabel = () => {
    const secs = Math.max(0, Math.ceil(remainingMs / 1000))
    countdownEl.textContent = paused
      ? `Closing in ${secs}s… (paused)`
      : `Closing in ${secs}s…`
  }

  const clearTimers = () => {
    if (intervalId !== null) clearInterval(intervalId)
    if (timeoutId !== null) clearTimeout(timeoutId)
    intervalId = null
    timeoutId = null
  }

  const start = () => {
    if (destroyed || paused || remainingMs <= 0) return
    clearTimers()
    updateLabel()
    intervalId = setInterval(() => {
      remainingMs -= 1000
      updateLabel()
      if (remainingMs <= 0) onExpire()
    }, 1000)
    timeoutId = setTimeout(onExpire, remainingMs)
  }

  const pause = () => {
    if (destroyed || paused) return
    paused = true
    clearTimers()
    updateLabel()
  }

  const resume = () => {
    if (destroyed || !paused) return
    paused = false
    updateLabel()
    start()
  }

  const destroy = () => {
    destroyed = true
    clearTimers()
  }

  start()

  return { pause, resume, destroy }
}

function showToast(shadow: ShadowRoot, detail: PopupRequestDetail): void {
  void debugLog('PopupPrompt', 'toast_shown', {
    requestId: detail.requestId,
    url: detail.url,
    target: detail.target,
  })

  const stack = getOrCreateStack(shadow)
  const hostname = hostnameFromUrl(detail.url)
  const blockingKey = getBlockingKey(detail.url)
  const canBlockDomain = Boolean(blockingKey && isBlockablePopupTarget(detail.url))
  const displayUrl = detail.url || '(empty URL)'
  const blockDomainBtn = canBlockDomain
    ? `<button type="button" class="hwc-btn hwc-btn-block-domain" data-action="block-domain" title="Don't ask again for ${escapeHtml(blockingKey!)} this session">Block domain</button>`
    : ''

  const toast = document.createElement('div')
  toast.className = 'hwc-toast'

  let settled = false

  const settle = (allowed: boolean) => {
    if (settled) return
    settled = true
    dismissTimer.destroy()
    postPopupResponse({ requestId: detail.requestId, allowed })
    toast.remove()
  }

  const iconUrl = chrome.runtime.getURL('public/logo.png')

  toast.innerHTML = `
    <header class="hwc-toast-header">
      <img class="hwc-brand-icon" src="${escapeHtml(iconUrl)}" alt="" width="22" height="22" />
      <span class="hwc-brand-name">${escapeHtml(EXTENSION_NAME)}</span>
    </header>
    <p class="hwc-toast-label">This page wants to open a new tab</p>
    <p class="hwc-toast-host">${escapeHtml(hostname)}</p>
    <p class="hwc-toast-url">${escapeHtml(displayUrl)}</p>
    <p class="hwc-toast-countdown">Closing in ${PROMPT_TIMEOUT_MS / 1000}s…</p>
    <div class="hwc-toast-actions">
      ${blockDomainBtn}
      <button type="button" class="hwc-btn hwc-btn-block" data-action="block">Block</button>
      <button type="button" class="hwc-btn hwc-btn-open" data-action="open">Open tab</button>
    </div>
  `

  const countdownEl = toast.querySelector('.hwc-toast-countdown') as HTMLElement
  const dismissTimer = createPausableDismissTimer(countdownEl, () => settle(false))

  toast.addEventListener('mouseenter', () => {
    toast.classList.add('hwc-toast-paused')
    dismissTimer.pause()
  })
  toast.addEventListener('mouseleave', () => {
    toast.classList.remove('hwc-toast-paused')
    dismissTimer.resume()
  })

  toast.querySelector('[data-action="block-domain"]')?.addEventListener('click', () => {
    void (async () => {
      try {
        const res = await sendMessage<BlockDomainSessionResponse>({
          type: MessageType.BLOCK_DOMAIN_SESSION,
          payload: { url: detail.url },
        })
        mergeSessionBlockedDomains(res.domains)

        void debugLog('SessionBlocklist', 'domain_added', {
          url: detail.url,
          domain: res.domain,
          domains: res.domains,
        })

        if (res.domain) {
          notifyPopupBlocked(detail.url, 'session_domain_block')
        }
      } catch (err) {
        void debugLog(
          'SessionBlocklist',
          'domain_add_failed',
          { url: detail.url, error: String(err) },
          { level: 'warn' },
        )
      }
      settle(false)
    })()
  })

  toast.querySelector('[data-action="block"]')?.addEventListener('click', () => settle(false))
  toast.querySelector('[data-action="open"]')?.addEventListener('click', () => {
    void openApprovedTab(detail.url).finally(() => settle(true))
  })

  stack.appendChild(toast)
}

export function initPopupPrompt(): void {
  if (document.getElementById(ROOT_ID)) return

  const host = document.createElement('div')
  host.id = ROOT_ID
  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = STYLES
  shadow.appendChild(style)

  const mount = () => {
    if (!document.documentElement.contains(host)) {
      document.documentElement.appendChild(host)
    }
  }

  if (document.documentElement) {
    mount()
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  }

  onPopupRequest((detail) => {
    void (async () => {
      if (!isPopupProtectionEnabled()) {
        postPopupResponse({ requestId: detail.requestId, allowed: false })
        return
      }

      const url = detail.url?.trim()
      if (!url) {
        postPopupResponse({ requestId: detail.requestId, allowed: false })
        return
      }

      if (await isDomainBlockedForSession(detail.url)) {
        void debugLog('PopupPrompt', 'session_domain_blocked', { url: detail.url }, {
          level: 'info',
        })
        notifyPopupBlocked(detail.url, 'session_domain_block')
        postPopupResponse({
          requestId: detail.requestId,
          allowed: false,
          sessionBlocked: true,
        })
        return
      }
      showToast(shadow, detail)
    })()
  })
}
