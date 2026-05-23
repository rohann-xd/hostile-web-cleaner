export type RuleAction =
  | 'blockPopup'
  | 'removeOverlay'
  | 'skipCountdown'
  | 'restoreScroll'

export interface SiteRule {
  domain: string
  rules: RuleAction[]
  enabled: boolean
}
