import { debugLog } from '@/core/logging'

export const HWC_SOURCE_MAIN = 'hwc-main'
export const HWC_SOURCE_ISOLATED = 'hwc-isolated'
export const PROMPT_TIMEOUT_MS = 5_000

export const MSG_POPUP_REQUEST = 'POPUP_REQUEST'
export const MSG_POPUP_RESPONSE = 'POPUP_RESPONSE'

export interface PopupRequestDetail {
  requestId: string
  url: string
  target?: string
  features?: string
}

export interface PopupResponseDetail {
  requestId: string
  allowed: boolean
  /** Set when blocked via session domain list — no toast was shown */
  sessionBlocked?: boolean
}

interface BridgeMessage {
  source: string
  type: string
  detail: PopupRequestDetail | PopupResponseDetail
}

let popupProtectionEnabled = true

export function setPopupProtectionEnabled(enabled: boolean): void {
  popupProtectionEnabled = enabled
}

export function isPopupProtectionEnabled(): boolean {
  return popupProtectionEnabled
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url
  } catch {
    return url || 'unknown site'
  }
}

export function postPopupRequest(
  detail: PopupRequestDetail,
  source = HWC_SOURCE_MAIN,
): void {
  const message: BridgeMessage = { source, type: MSG_POPUP_REQUEST, detail }
  window.postMessage(message, '*')
}

export function postPopupResponse(detail: PopupResponseDetail): void {
  const message: BridgeMessage = {
    source: HWC_SOURCE_ISOLATED,
    type: MSG_POPUP_RESPONSE,
    detail,
  }
  window.postMessage(message, '*')
}

const pendingResponses = new Map<
  string,
  { resolve: (result: PopupApprovalResult) => void; timer: ReturnType<typeof setTimeout> }
>()

let responseListenerInstalled = false

function ensureResponseListener(): void {
  if (responseListenerInstalled) return
  responseListenerInstalled = true

  window.addEventListener('message', (event: MessageEvent<BridgeMessage>) => {
    if (event.source !== window) return
    const data = event.data
    if (!data || data.source !== HWC_SOURCE_ISOLATED || data.type !== MSG_POPUP_RESPONSE) {
      return
    }

    const detail = data.detail as PopupResponseDetail
    const pending = pendingResponses.get(detail.requestId)
    if (!pending) return

    clearTimeout(pending.timer)
    pendingResponses.delete(detail.requestId)

    if (detail.sessionBlocked) {
      pending.resolve('session_blocked')
      return
    }
    pending.resolve(detail.allowed ? 'allowed' : 'denied')
  })
}

export function waitForPopupResponse(requestId: string): Promise<PopupApprovalResult> {
  ensureResponseListener()

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingResponses.delete(requestId)
      resolve('denied')
    }, PROMPT_TIMEOUT_MS)

    pendingResponses.set(requestId, { resolve, timer })
  })
}

export type PopupApprovalResult = 'allowed' | 'denied' | 'session_blocked'

export async function requestUserApproval(
  url: string,
  options?: { target?: string; features?: string; source?: string },
): Promise<PopupApprovalResult> {
  if (!isPopupProtectionEnabled()) {
    return 'denied'
  }

  const requestId = crypto.randomUUID()
  const detail: PopupRequestDetail = {
    requestId,
    url,
    target: options?.target,
    features: options?.features,
  }

  void debugLog('PopupBridge', 'approval_requested', {
    requestId,
    url,
    source: options?.source ?? HWC_SOURCE_MAIN,
    target: options?.target,
  })

  postPopupRequest(detail, options?.source ?? HWC_SOURCE_MAIN)
  const result = await waitForPopupResponse(requestId)

  void debugLog('PopupBridge', 'approval_resolved', { requestId, url, result })
  return result
}

export function onPopupRequest(handler: (detail: PopupRequestDetail) => void): () => void {
  const listener = (event: MessageEvent<BridgeMessage>) => {
    if (event.source !== window) return
    const data = event.data
    if (!data || data.type !== MSG_POPUP_REQUEST) return
    if (data.source !== HWC_SOURCE_MAIN && data.source !== HWC_SOURCE_ISOLATED) return

    handler(data.detail as PopupRequestDetail)
  }

  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
