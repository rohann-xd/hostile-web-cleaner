import { getBlockingKey, isBlockablePopupTarget } from '@/core/domains/normalize'

const STORAGE_KEY = 'sessionBlockedDomains'

/** In-memory cache (per JS context) so blocks apply before storage write completes. */
let localBlocked: Set<string> | null = null

function isValidBlockedDomain(domain: string): boolean {
  if (!domain || domain.length < 3) return false
  if (!domain.includes('.')) return false
  return /^[a-z0-9.-]+$/.test(domain)
}

async function loadFromStorage(): Promise<Set<string>> {
  try {
    const result = await chrome.storage.session.get(STORAGE_KEY)
    const list = result[STORAGE_KEY] as string[] | undefined
    if (!Array.isArray(list)) return new Set()

    const valid = list
      .map((d) => (typeof d === 'string' ? d.toLowerCase().trim() : ''))
      .filter(isValidBlockedDomain)

    return new Set(valid)
  } catch {
    return new Set()
  }
}

async function ensureLocalCache(): Promise<Set<string>> {
  if (!localBlocked) {
    localBlocked = await loadFromStorage()
  }
  return localBlocked
}

async function persistLocalCache(): Promise<void> {
  if (!localBlocked) return
  try {
    await chrome.storage.session.set({ [STORAGE_KEY]: [...localBlocked] })
  } catch {
    // ignore
  }
}

export async function getSessionBlockedDomains(): Promise<Set<string>> {
  return new Set(await ensureLocalCache())
}

/**
 * Add domain to session blocklist.
 * @param force — when true (user clicked Block domain), skip same-site guard.
 */
export async function blockDomainForSession(
  hostnameOrUrl: string,
  options?: { sourcePageUrl?: string; force?: boolean },
): Promise<string | null> {
  const domain = getBlockingKey(hostnameOrUrl)
  if (!domain) return null

  if (
    !options?.force &&
    options?.sourcePageUrl &&
    !isBlockablePopupTarget(hostnameOrUrl, options.sourcePageUrl)
  ) {
    return null
  }

  const blocked = await ensureLocalCache()
  blocked.add(domain)
  await persistLocalCache()
  return domain
}

export async function isDomainBlockedForSession(hostnameOrUrl: string): Promise<boolean> {
  const domain = getBlockingKey(hostnameOrUrl)
  if (!domain) return false

  const blocked = await ensureLocalCache()
  return blocked.has(domain)
}

/** Apply domains from background (keeps content cache in sync). */
export function mergeSessionBlockedDomains(domains: string[]): void {
  if (!localBlocked) {
    localBlocked = new Set()
  }
  for (const d of domains) {
    const key = d.toLowerCase().trim()
    if (isValidBlockedDomain(key)) {
      localBlocked.add(key)
    }
  }
}

export async function clearSessionBlockedDomains(): Promise<void> {
  localBlocked = new Set()
  try {
    await chrome.storage.session.remove(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export async function getSessionBlockedDomainCount(): Promise<number> {
  return (await ensureLocalCache()).size
}
