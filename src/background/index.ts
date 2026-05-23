import {
  MessageType,
  onMessage,
  type ExtensionMessage,
  type ExtensionResponse,
} from '@/core/messaging'
import { getSettings, setSettings } from '@/core/storage/settings'

const LOG_PREFIX = '[HostileWebCleaner:Background]'

chrome.runtime.onInstalled.addListener((details) => {
  console.debug(LOG_PREFIX, 'Extension installed', details.reason)
})

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) {
    return
  }

  console.debug(LOG_PREFIX, 'Navigation committed', {
    tabId: details.tabId,
    url: details.url,
    transitionType: details.transitionType,
  })
})

onMessage(async (message: ExtensionMessage): Promise<ExtensionResponse> => {
  switch (message.type) {
    case MessageType.GET_SETTINGS:
      return { settings: await getSettings() }

    case MessageType.SET_ENABLED:
      await setSettings({ enabled: message.payload.enabled })
      return { success: true }

    case MessageType.GET_TAB_STATUS: {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const hostname = tab?.url ? new URL(tab.url).hostname : null
      const settings = await getSettings()

      return {
        active: settings.enabled && Boolean(hostname),
        hostname,
      }
    }

    default:
      return { success: true }
  }
})

console.debug(LOG_PREFIX, 'Service worker started')
