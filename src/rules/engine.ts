import defaultRules from './defaults.json'
import type { RuleAction, SiteRule } from './types'

const rules: SiteRule[] = defaultRules as SiteRule[]

export function getRulesForHostname(hostname: string): RuleAction[] {
  const normalized = hostname.replace(/^www\./, '').toLowerCase()

  const match = rules.find(
    (rule) => rule.enabled && normalized.endsWith(rule.domain.toLowerCase()),
  )

  return match?.rules ?? []
}

export function hasRule(hostname: string, action: RuleAction): boolean {
  return getRulesForHostname(hostname).includes(action)
}

export function shouldApplyRule(hostname: string, action: RuleAction): boolean {
  const rules = getRulesForHostname(hostname)
  if (rules.length > 0) return rules.includes(action)
  // Until Phase 5: core repair actions enabled globally when no site rule exists
  if (action === 'blockPopup') return true
  if (action === 'removeOverlay') return true
  if (action === 'flagFakeDownloads') return true
  if (action === 'restoreScroll') return true
  return false
}
