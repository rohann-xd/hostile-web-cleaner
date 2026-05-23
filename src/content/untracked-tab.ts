import { debugLog } from '@/core/logging'
import { MessageType } from '@/core/messaging'
import { openApprovedTab } from '@/content/open-tab'
import {
  HWC_SOURCE_ISOLATED,
  isPopupProtectionEnabled,
  requestUserApproval,
} from '@/content/popup-bridge'
import { notifyPopupBlocked } from '@/content/notify-popup-blocked'

export function initUntrackedTabHandler(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== MessageType.UNTRACKED_TAB_PROMPT) return

    void (async () => {
      const url = message.payload.url?.trim()
      if (!url) {
        sendResponse({ success: false })
        return
      }

      if (!isPopupProtectionEnabled()) {
        sendResponse({ success: false })
        return
      }

      void debugLog('PopupGuard', 'untracked_prompt_shown', { url }, { level: 'info' })

      const result = await requestUserApproval(url, {
        target: '_blank',
        source: HWC_SOURCE_ISOLATED,
      })

      if (result === 'allowed') {
        void debugLog('PopupGuard', 'untracked_allowed', { url })
        await openApprovedTab(url)
      } else if (result === 'denied') {
        void debugLog('PopupGuard', 'untracked_declined', { url })
        notifyPopupBlocked(url, 'untracked_bypass')
      } else {
        void debugLog('PopupGuard', 'untracked_session_blocked', { url })
      }

      sendResponse({ success: true })
    })()

    return true
  })
}
