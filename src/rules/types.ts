export type RuleAction =
  | 'blockPopup'
  | 'removeOverlay'
  | 'flagFakeDownloads'
  | 'skipCountdown'
  | 'restoreScroll'

export interface SiteRule {
  domain: string
  rules: RuleAction[]
  enabled: boolean
}
