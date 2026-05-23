import { trackUserGestures } from '@/content/patches/user-gesture'
import { patchWindowOpenSync } from '@/content/patches/window-open'
import { bootstrapProtectionSettings, initProtectionSettingsSync } from '@/content/patches'

trackUserGestures()
patchWindowOpenSync()
void bootstrapProtectionSettings()
initProtectionSettingsSync()
