import { debugLog } from '@/core/logging'
import { isEnabled } from '@/core/storage/settings'
import { shouldApplyRule } from '@/rules/engine'
import { setPopupProtectionEnabled } from '@/content/popup-bridge'

export async function bootstrapProtectionSettings(): Promise<void> {
  const hostname = window.location.hostname
  const extensionOn = await isEnabled()
  const ruleAllows = shouldApplyRule(hostname, 'blockPopup')
  const enabled = extensionOn && ruleAllows
  setPopupProtectionEnabled(enabled)

  void debugLog('Protection', 'bootstrap', {
    hostname,
    extensionOn,
    ruleAllows,
    blockPopup: enabled,
    frame: window === window.top ? 'top' : 'iframe',
  })
}

/** Keep MAIN-world window.open in sync when user toggles the extension popup. */
export function initProtectionSettingsSync(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.settings) return
    void bootstrapProtectionSettings()
  })
}
