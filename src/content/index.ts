import { isEnabled } from '@/core/storage/settings'
import { getRulesForHostname } from '@/rules/engine'
import { startDomObserver } from './observers/dom-observer'
import { initPatches } from './patches'
import { initRepair } from './repair'

const LOG_PREFIX = '[HostileWebCleaner]'

async function bootstrap(): Promise<void> {
  const enabled = await isEnabled()

  if (!enabled) {
    console.debug(LOG_PREFIX, 'Extension disabled — skipping activation')
    return
  }

  const hostname = window.location.hostname
  const rules = getRulesForHostname(hostname)

  console.debug(LOG_PREFIX, 'Content script active', { hostname, rules })

  startDomObserver()
  initPatches()
  initRepair()
}

void bootstrap()
