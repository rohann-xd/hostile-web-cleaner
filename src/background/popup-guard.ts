import { MessageType } from '@/core/messaging'
import { getSettings } from '@/core/storage/settings'
import { shouldCaptureLogs } from '@/core/dev/env'
import { isDomainBlockedForSession } from '@/core/storage/session-blocklist'
import { shouldApplyRule } from '@/rules/engine'
import { pushDebugEntry } from './debug-store'
import { consumeExpectedOpen, refreshDebugEnabled } from './tab-watch'

type NavigationTargetDetails = Parameters<
  Parameters<typeof chrome.webNavigation.onCreatedNavigationTarget.addListener>[0]
>[0]

async function isSourceTabProtected(sourceTabId: number): Promise<boolean> {
  const settings = await getSettings()
  if (!settings.enabled) return false

  try {
    const tab = await chrome.tabs.get(sourceTabId)
    if (!tab.url || tab.url.startsWith('chrome')) return false
    const hostname = new URL(tab.url).hostname
    return shouldApplyRule(hostname, 'blockPopup')
  } catch {
    return false
  }
}

async function promptSourceTab(sourceTabId: number, url: string): Promise<void> {
  try {
    await chrome.tabs.sendMessage(sourceTabId, {
      type: MessageType.UNTRACKED_TAB_PROMPT,
      payload: { url },
    })
  } catch (err) {
    pushDebugEntry({
      level: 'warn',
      scope: 'PopupGuard',
      event: 'prompt_delivery_failed',
      data: { sourceTabId, url, error: String(err) },
      tabId: sourceTabId,
      url,
    })
  }
}

async function handleNavigationTarget(details: NavigationTargetDetails): Promise<void> {
  const { tabId, sourceTabId, sourceFrameId, url } = details
  if (!url || sourceTabId < 0) return

  const matched = consumeExpectedOpen(sourceTabId, url)

  if (shouldCaptureLogs((await getSettings()).debug)) {
    await refreshDebugEnabled()
    pushDebugEntry({
      level: 'info',
      scope: 'TabWatch',
      event: 'navigation_target_created',
      data: {
        tabId,
        sourceTabId,
        sourceFrameId,
        url,
        tracked: Boolean(matched),
      },
      tabId,
      url,
    })
  }

  if (matched) return
  if (!(await isSourceTabProtected(sourceTabId))) return

  if (await isDomainBlockedForSession(url)) {
    try {
      await chrome.tabs.remove(tabId)
    } catch {
      // Tab may already be gone
    }

    if (shouldCaptureLogs((await getSettings()).debug)) {
      pushDebugEntry({
        level: 'info',
        scope: 'PopupGuard',
        event: 'session_domain_blocked',
        data: { tabId, sourceTabId, url },
        tabId: sourceTabId,
        url,
      })
    }
    return
  }

  pushDebugEntry({
    level: 'warn',
    scope: 'PopupGuard',
    event: 'untracked_tab_intercepted',
    data: {
      tabId,
      sourceTabId,
      sourceFrameId,
      url,
      hint: 'Popunder/bypass (e.g. stashed window.open) — tab closed, prompting on source page',
    },
    tabId: sourceTabId,
    url,
  })

  try {
    await chrome.tabs.remove(tabId)
  } catch {
    // Tab may already be gone
  }

  await promptSourceTab(sourceTabId, url)
}

export function startPopupGuard(): void {
  if (!chrome.webNavigation?.onCreatedNavigationTarget) return

  chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
    void handleNavigationTarget(details)
  })
}
