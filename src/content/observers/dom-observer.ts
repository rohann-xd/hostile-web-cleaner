const LOG_PREFIX = '[HostileWebCleaner:Observer]'

export function startDomObserver(): void {
  if (typeof MutationObserver === 'undefined') {
    return
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.length > 0) {
      console.debug(LOG_PREFIX, 'DOM mutations detected', mutations.length)
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  console.debug(LOG_PREFIX, 'MutationObserver started')
}
