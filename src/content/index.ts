import { isEnabled } from '@/core/storage/settings'
import { getRulesForHostname, shouldApplyRule } from '@/rules/engine'
import { setPopupProtectionEnabled } from '@/content/popup-bridge'
import { initDebugClickAudit } from './debug/click-audit'
import { initFormSubmitInterceptor } from './interceptors/form-submits'
import { initLinkClickInterceptor } from './interceptors/link-clicks'
import { isDebugEnabled } from '@/core/logging'
import { getSessionBlockedDomains } from '@/core/storage/session-blocklist'
import { startDomObserver } from './observers/dom-observer'
import { initRepair } from './repair'
import { initUntrackedTabHandler } from './untracked-tab'
import { initPopupPrompt } from './ui/popup-prompt'

const LOG_PREFIX = '[HostileWebCleaner]'

initPopupPrompt()
initUntrackedTabHandler()
void getSessionBlockedDomains()

async function bootstrap(): Promise<void> {
  const enabled = await isEnabled()
  const hostname = window.location.hostname
  const rules = getRulesForHostname(hostname)
  const blockPopup = enabled && shouldApplyRule(hostname, 'blockPopup')

  setPopupProtectionEnabled(blockPopup)

  if (!enabled) {
    console.debug(LOG_PREFIX, 'Extension disabled — skipping activation')
    return
  }

  console.debug(LOG_PREFIX, 'Content script active', { hostname, rules, blockPopup })

  if (blockPopup) {
    initLinkClickInterceptor()
    initFormSubmitInterceptor()
  }

  if (await isDebugEnabled()) {
    initDebugClickAudit()
  }

  startDomObserver()
  initRepair()
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes.settings) return
  void bootstrap()
})

void bootstrap()
