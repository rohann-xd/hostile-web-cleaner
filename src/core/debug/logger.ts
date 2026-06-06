import { getSettings } from '@/core/storage/settings'
import { shouldCaptureLogs } from '@/core/dev/env'
import { MessageType, sendMessage } from '@/core/messaging'
import type { DebugLevel, DebugLogPayload } from './types'

export function captureStack(maxLines = 6): string | undefined {
  const stack = new Error().stack
  if (!stack) return undefined
  return stack
    .split('\n')
    .slice(2, 2 + maxLines)
    .map((line) => line.trim())
    .join('\n')
}

export async function isDebugEnabled(): Promise<boolean> {
  const settings = await getSettings()
  return shouldCaptureLogs(settings.debug)
}

/**
 * Structured debug log: console + persisted ring buffer in background (when debug on).
 */
export async function hwcDebug(
  scope: string,
  event: string,
  data?: Record<string, unknown>,
  options?: { level?: DebugLevel; url?: string },
): Promise<void> {
  const settings = await getSettings()
  if (!shouldCaptureLogs(settings.debug)) return

  const level = options?.level ?? 'debug'
  const pageUrl =
    options?.url ?? (typeof window !== 'undefined' ? window.location.href : undefined)

  console.debug(`[HWC:${scope}]`, event, data ?? '', pageUrl ? `@ ${pageUrl}` : '')

  try {
    const payload: DebugLogPayload = {
      level,
      scope,
      event,
      data,
      url: pageUrl,
    }
    await sendMessage({ type: MessageType.DEBUG_LOG, payload })
  } catch {
    // Service worker may be asleep; console line above is still available
  }
}
