const SESSION_FAKE_DOWNLOAD_COUNT_KEY = 'fakeDownloadFlaggedCount'

export async function incrementSessionFakeDownloadCount(count: number): Promise<number> {
  const result = await chrome.storage.session.get(SESSION_FAKE_DOWNLOAD_COUNT_KEY)
  const current =
    typeof result[SESSION_FAKE_DOWNLOAD_COUNT_KEY] === 'number'
      ? result[SESSION_FAKE_DOWNLOAD_COUNT_KEY]
      : 0
  const next = current + count
  await chrome.storage.session.set({ [SESSION_FAKE_DOWNLOAD_COUNT_KEY]: next })
  return next
}

export async function getSessionFakeDownloadCount(): Promise<number> {
  const result = await chrome.storage.session.get(SESSION_FAKE_DOWNLOAD_COUNT_KEY)
  return typeof result[SESSION_FAKE_DOWNLOAD_COUNT_KEY] === 'number'
    ? result[SESSION_FAKE_DOWNLOAD_COUNT_KEY]
    : 0
}
