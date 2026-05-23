import { captureStack, debugLog } from '@/core/logging'
import {
  HWC_SOURCE_ISOLATED,
  isPopupProtectionEnabled,
  requestUserApproval,
} from '@/content/popup-bridge'
import { notifyPopupBlocked } from '@/content/notify-popup-blocked'

function resolveFormUrl(form: HTMLFormElement): string | null {
  const action = form.getAttribute('action')?.trim()
  const base = action || window.location.href
  try {
    return new URL(base, window.location.href).href
  } catch {
    return null
  }
}

function opensNewTab(form: HTMLFormElement): boolean {
  const target = (form.getAttribute('target') ?? '').toLowerCase()
  return target === '_blank' || target === '_new'
}

async function handleFormSubmit(form: HTMLFormElement, event: SubmitEvent): Promise<void> {
  if (!isPopupProtectionEnabled()) return
  if (!opensNewTab(form)) return

  const url = resolveFormUrl(form)
  if (!url) return

  event.preventDefault()
  event.stopImmediatePropagation()

  void debugLog('FormSubmit', 'intercepted_target_blank', {
    url,
    method: (form.getAttribute('method') ?? 'get').toLowerCase(),
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
    void debugLog('FormSubmit', 'blocked_declined_or_timeout', { url })
    notifyPopupBlocked(url, 'user_declined')
    return
  }

  if (result === 'allowed') {
    void debugLog('FormSubmit', 'allowed_user_confirmed', { url })
  }
}

function onSubmit(event: SubmitEvent): void {
  const form = event.target
  if (!(form instanceof HTMLFormElement)) return
  void handleFormSubmit(form, event)
}

export function initFormSubmitInterceptor(): void {
  document.addEventListener('submit', onSubmit, true)
}
