const SESSION_OVERLAY_COUNT_KEY = 'overlayRemovedCount'

export async function incrementSessionOverlayCount(count: number): Promise<number> {
  const result = await chrome.storage.session.get(SESSION_OVERLAY_COUNT_KEY)
  const current = typeof result[SESSION_OVERLAY_COUNT_KEY] === 'number'
    ? result[SESSION_OVERLAY_COUNT_KEY]
    : 0
  const next = current + count
  await chrome.storage.session.set({ [SESSION_OVERLAY_COUNT_KEY]: next })
  return next
}

export async function getSessionOverlayCount(): Promise<number> {
  const result = await chrome.storage.session.get(SESSION_OVERLAY_COUNT_KEY)
  return typeof result[SESSION_OVERLAY_COUNT_KEY] === 'number'
    ? result[SESSION_OVERLAY_COUNT_KEY]
    : 0
}
