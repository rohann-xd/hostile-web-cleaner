import { isDevBuild } from '@/core/dev/env'
import { hwcDebug } from '@/core/debug/logger'
import { isEnabled } from '@/core/storage/settings'
import { getRulesForHostname, shouldApplyRule } from '@/rules/engine'
import { setPopupProtectionEnabled } from '@/content/popup-bridge'
import { initDebugClickAudit } from './debug/click-audit'
import { initFormSubmitInterceptor } from './interceptors/form-submits'
import { initLinkClickInterceptor } from './interceptors/link-clicks'
import { isDebugEnabled } from '@/core/logging'
import { getSessionBlockedDomains } from '@/core/storage/session-blocklist'
import { startDomObserver } from './observers/dom-observer'
import {
  initRepair,
  isDownloadScanEnabled,
  isRepairEnabled,
  refreshRepairOnPage,
  runRepair,
} from './repair'
import { initUntrackedTabHandler } from './untracked-tab'
import { initPopupPrompt } from './ui/popup-prompt'
import { initDevGlobalApi } from './dev/global-api'

const LOG_PREFIX = '[HostileWebCleaner]'

initPopupPrompt()
initUntrackedTabHandler()
if (isDevBuild()) {
  initDevGlobalApi()
}
void getSessionBlockedDomains()

function startRepairObserver(extendForDownloads: boolean): void {
  startDomObserver(() => runRepair(), { extendForDownloads })
}

async function bootstrap(): Promise<void> {
  const enabled = await isEnabled()
  const hostname = window.location.hostname
  const rules = getRulesForHostname(hostname)
  const blockPopup = enabled && shouldApplyRule(hostname, 'blockPopup')
  const removeOverlay = enabled && shouldApplyRule(hostname, 'removeOverlay')
  const restoreScroll = enabled && shouldApplyRule(hostname, 'restoreScroll')
  const flagFakeDownloads = enabled && shouldApplyRule(hostname, 'flagFakeDownloads')

  setPopupProtectionEnabled(blockPopup)

  if (!enabled) {
    console.debug(LOG_PREFIX, 'Extension disabled — skipping activation')
    return
  }

  console.debug(LOG_PREFIX, 'Content script active', {
    hostname,
    rules,
    blockPopup,
    removeOverlay,
    restoreScroll,
    flagFakeDownloads,
  })

  if (blockPopup) {
    initLinkClickInterceptor()
    initFormSubmitInterceptor()
  }

  if (await isDebugEnabled()) {
    initDebugClickAudit()
  }

  if (removeOverlay || restoreScroll || flagFakeDownloads) {
    if (window === window.top) {
      initRepair({ removeOverlay, restoreScroll, flagFakeDownloads })
      startRepairObserver(flagFakeDownloads)
    }
  }

  void hwcDebug('Bootstrap', 'content_script_active', {
    blockPopup,
    removeOverlay,
    restoreScroll,
    flagFakeDownloads,
    devBuild: isDevBuild(),
    frame: window === window.top ? 'top' : 'subframe',
  })
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes.settings) return
  void bootstrap()
})

window.addEventListener('pageshow', () => {
  if (window !== window.top) return
  if (!isRepairEnabled()) return
  refreshRepairOnPage()
  startRepairObserver(isDownloadScanEnabled())
})

void bootstrap()
