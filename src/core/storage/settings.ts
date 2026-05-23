import { DEFAULT_SETTINGS, type ExtensionSettings } from '@/core/types'

const SETTINGS_KEY = 'settings'

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY)
  return {
    ...DEFAULT_SETTINGS,
    ...(result[SETTINGS_KEY] as ExtensionSettings | undefined),
  }
}

export async function setSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.sync.set({ [SETTINGS_KEY]: { ...current, ...settings } })
}

export async function isEnabled(): Promise<boolean> {
  const settings = await getSettings()
  return settings.enabled
}
