/**
 * Runs in the page's main world to patch browser APIs before page scripts execute.
 * Stub only — actual patching logic comes in Phase 1+.
 */
const LOG_PREFIX = '[HostileWebCleaner:MainWorld]'

function stubPatch(name: string): void {
  console.debug(LOG_PREFIX, `${name} patch ready (stub)`)
}

stubPatch('window.open')
stubPatch('setTimeout')
stubPatch('location.assign')

console.debug(LOG_PREFIX, 'Main-world script loaded')
