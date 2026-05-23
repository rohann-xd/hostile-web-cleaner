import { getDomain } from 'tldts'

export function getHostnameFromUrl(hostnameOrUrl: string): string | null {
  const input = hostnameOrUrl.trim()
  if (!input) return null

  try {
    const url = input.includes('://') || input.startsWith('//') ? input : `https://${input}`
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return host || null
  } catch {
    return null
  }
}

/** Registrable domain (eTLD+1), lowercase — e.g. ads.rkv1.com → rkv1.com */
export function getRegistrableDomain(hostnameOrUrl: string): string | null {
  const hostname = getHostnameFromUrl(hostnameOrUrl)
  if (!hostname) return null

  const domain = getDomain(hostname, { allowPrivateDomains: true })
  return domain ? domain.toLowerCase() : null
}

/**
 * Key used for session blocklist — registrable domain when available, else hostname.
 */
export function getBlockingKey(hostnameOrUrl: string): string | null {
  return getRegistrableDomain(hostnameOrUrl) ?? getHostnameFromUrl(hostnameOrUrl)
}

/** True if hostnameOrUrl's registrable domain equals blockedDomain. */
export function domainsMatch(blockedDomain: string, hostnameOrUrl: string): boolean {
  const candidate = getBlockingKey(hostnameOrUrl)
  if (!candidate) return false
  return candidate === blockedDomain.toLowerCase()
}

/**
 * Block domain only applies to third-party popup targets — not the page you're on
 * (avoids blocking all same-site _blank links after window.open('')).
 */
export function isBlockablePopupTarget(
  popupUrl: string,
  sourcePageUrl: string = typeof window !== 'undefined' ? window.location.href : '',
): boolean {
  const targetKey = getBlockingKey(popupUrl)
  if (!targetKey) return false

  const sourceKey = getBlockingKey(sourcePageUrl)
  if (!sourceKey) return true

  return targetKey !== sourceKey
}
