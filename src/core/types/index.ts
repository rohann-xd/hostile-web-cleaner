export type ProtectionModule =
  | 'blockPopup'
  | 'removeOverlay'
  | 'skipCountdown'
  | 'restoreScroll'

export interface ExtensionSettings {
  enabled: boolean
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
}
