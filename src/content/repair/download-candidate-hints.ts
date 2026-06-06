export const DOWNLOAD_PATH_HINT = /\/download\/|\/releases\/|\/files\/|\/dl\//i

export const DOWNLOAD_LABEL =
  /download|get\s+file|free\s+download|install\s+now|click\s+here/i

export function hasDownloadIdentityHint(element: Element): boolean {
  const id = element.id ?? ''
  const className = String(element.className ?? '')
  return /download/i.test(id) || /download/i.test(className)
}

export function labelLooksLikeDownload(label: string): boolean {
  return DOWNLOAD_LABEL.test(label.trim())
}

export function pathHasDownloadHint(pathname: string): boolean {
  return DOWNLOAD_PATH_HINT.test(pathname)
}
