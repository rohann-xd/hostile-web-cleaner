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
