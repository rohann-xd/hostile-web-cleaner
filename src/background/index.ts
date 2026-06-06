import { isDevBuild, shouldCaptureLogs } from '@/core/dev/env'
import {
  MessageType,
  onMessage,
  type ExtensionMessage,
  type ExtensionResponse,
} from '@/core/messaging'
import {
  blockDomainForSession,
  clearSessionBlockedDomains,
  getSessionBlockedDomains,
} from '@/core/storage/session-blocklist'
import { getSettings, setSettings } from '@/core/storage/settings'
import { incrementSessionOverlayCount } from '@/core/storage/overlay-stats'
import { pushDebugEntry } from './debug-store'
import {
  clearDebugEntries,
  getDebugEntries,
  getLogsExportText,
  initTabWatch,
  refreshDebugEnabled,
  registerExpectedTabOpen,
  startTabWatchListeners,
} from './tab-watch'
import { startPopupGuard } from './popup-guard'

const LOG_PREFIX = '[HostileWebCleaner:Background]'

void initTabWatch()
void getSessionBlockedDomains()
startTabWatchListeners()
startPopupGuard()

chrome.runtime.onInstalled.addListener((details) => {
  console.debug(LOG_PREFIX, 'Extension installed', details.reason)
})

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) {
    return
  }

  void (async () => {
    const settings = await getSettings()
    if (!shouldCaptureLogs(settings.debug)) return
    pushDebugEntry({
      level: 'debug',
      scope: 'Navigation',
      event: 'committed',
      data: {
        tabId: details.tabId,
        transitionType: details.transitionType,
        transitionQualifiers: details.transitionQualifiers,
      },
      tabId: details.tabId,
      url: details.url,
    })
  })()
})

onMessage(async (message: ExtensionMessage, sender): Promise<ExtensionResponse> => {
  switch (message.type) {
    case MessageType.GET_SETTINGS:
      return { settings: await getSettings() }

    case MessageType.SET_ENABLED:
      await setSettings({ enabled: message.payload.enabled })
      return { success: true }

    case MessageType.SET_DEBUG:
      await setSettings({ debug: message.payload.debug })
      await refreshDebugEnabled()
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

    case MessageType.DEBUG_LOG: {
      const settings = await getSettings()
      if (!shouldCaptureLogs(settings.debug)) return { success: true }

      pushDebugEntry({
        level: message.payload.level ?? 'debug',
        scope: message.payload.scope,
        event: message.payload.event,
        data: message.payload.data,
        tabId: sender.tab?.id,
        url: message.payload.url ?? sender.tab?.url ?? undefined,
      })
      return { success: true }
    }

    case MessageType.DEBUG_EXPECT_TAB: {
      registerExpectedTabOpen(sender.tab?.id, message.payload.url, message.payload.method)
      return { success: true }
    }

    case MessageType.GET_DEBUG_LOGS:
      return {
        logs: getDebugEntries(),
        exportText: getLogsExportText(),
      }

    case MessageType.CLEAR_DEBUG_LOGS:
      clearDebugEntries()
      return { success: true }

    case MessageType.GET_SESSION_BLOCKS:
      return { domains: [...(await getSessionBlockedDomains())] }

    case MessageType.CLEAR_SESSION_BLOCKS:
      await clearSessionBlockedDomains()
      return { success: true }

    case MessageType.BLOCK_DOMAIN_SESSION: {
      const domain = await blockDomainForSession(message.payload.url, { force: true })
      const domains = [...(await getSessionBlockedDomains())]
      return { domain, domains }
    }

    case MessageType.POPUP_ALLOWED: {
      const settings = await getSettings()
      if (shouldCaptureLogs(settings.debug)) {
        pushDebugEntry({
          level: 'info',
          scope: 'Background',
          event: 'popup_allowed',
          data: {
            tabId: sender.tab?.id,
            frameId: sender.frameId,
            url: message.payload.url,
          },
          tabId: sender.tab?.id,
          url: message.payload.url,
        })
      }
      return { success: true }
    }

    case MessageType.POPUP_BLOCKED: {
      const settings = await getSettings()
      if (shouldCaptureLogs(settings.debug)) {
        pushDebugEntry({
          level: 'info',
          scope: 'Background',
          event: 'popup_blocked',
          data: {
            tabId: sender.tab?.id,
            frameId: sender.frameId,
            url: message.payload.url,
            reason: message.payload.reason,
          },
          tabId: sender.tab?.id,
          url: message.payload.url,
        })
      }
      return { success: true }
    }

    case MessageType.OPEN_TAB: {
      const url = message.payload.url?.trim()
      if (!url) {
        console.warn(LOG_PREFIX, 'OPEN_TAB: missing URL')
        return { success: false }
      }

      registerExpectedTabOpen(sender.tab?.id, url, 'open_tab')

      const tabOptions: chrome.tabs.CreateProperties = {
        url,
        active: true,
      }

      if (typeof sender.tab?.id === 'number') {
        tabOptions.openerTabId = sender.tab.id
      }

      try {
        const tab = await chrome.tabs.create(tabOptions)
        if (shouldCaptureLogs((await getSettings()).debug)) {
          pushDebugEntry({
            level: 'info',
            scope: 'Background',
            event: 'opened_approved_tab',
            data: { url, tabId: tab.id, openerTabId: sender.tab?.id },
            tabId: tab.id,
            url,
          })
        }
        return { success: true }
      } catch (err) {
        console.error(LOG_PREFIX, 'Failed to create tab', url, err)
        pushDebugEntry({
          level: 'error',
          scope: 'Background',
          event: 'open_tab_failed',
          data: { url, error: String(err) },
          tabId: sender.tab?.id,
        })
        return { success: false }
      }
    }

    case MessageType.OVERLAY_REMOVED: {
      const total = await incrementSessionOverlayCount(message.payload.count)
      const settings = await getSettings()
      if (shouldCaptureLogs(settings.debug)) {
        pushDebugEntry({
          level: 'info',
          scope: 'Background',
          event: 'overlay_removed',
          data: {
            tabId: sender.tab?.id,
            count: message.payload.count,
            sessionTotal: total,
            url: message.payload.url,
          },
          tabId: sender.tab?.id,
          url: message.payload.url,
        })
      }
      return { success: true }
    }

    default:
      return { success: true }
  }
})

console.debug(LOG_PREFIX, 'Service worker started', isDevBuild() ? '(dev logging on)' : '')
