const SCROLL_LOCK_PROPS = [
  'overflow',
  'overflowY',
  'overflowX',
  'position',
  'height',
  'width',
  'pointerEvents',
  'touchAction',
] as const

const SCROLL_LOCK_VALUES: Record<(typeof SCROLL_LOCK_PROPS)[number], Set<string>> = {
  overflow: new Set(['hidden', 'clip']),
  overflowY: new Set(['hidden', 'clip']),
  overflowX: new Set(['hidden', 'clip']),
  position: new Set(['fixed']),
  height: new Set(['100%', '100vh']),
  width: new Set(['100%', '100vw']),
  pointerEvents: new Set(['none']),
  touchAction: new Set(['none']),
}

function camelToKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function hasInlineScrollLock(element: HTMLElement): boolean {
  for (const prop of SCROLL_LOCK_PROPS) {
    const inlineValue = element.style[prop as keyof CSSStyleDeclaration] as string
    if (!inlineValue) continue
    const normalized = inlineValue.trim().toLowerCase()
    if (SCROLL_LOCK_VALUES[prop].has(normalized)) return true
  }
  return false
}

function resetInlineScrollLock(element: HTMLElement): void {
  for (const prop of SCROLL_LOCK_PROPS) {
    const kebab = camelToKebab(prop)
    if (element.style.getPropertyValue(kebab)) {
      element.style.removeProperty(kebab)
    }
  }
}

function getWrapperCandidates(): HTMLElement[] {
  const candidates: HTMLElement[] = []
  const firstChild = document.body?.firstElementChild
  if (firstChild instanceof HTMLElement) {
    candidates.push(firstChild)
  }

  for (const element of document.querySelectorAll('[class*="wrapper"], [class*="modal-open"]')) {
    if (element instanceof HTMLElement) {
      candidates.push(element)
    }
  }

  return candidates
}

export function restoreScrollAndPointer(): void {
  if (!document.body) return

  resetInlineScrollLock(document.body)
  resetInlineScrollLock(document.documentElement)

  for (const element of getWrapperCandidates()) {
    if (hasInlineScrollLock(element)) {
      resetInlineScrollLock(element)
    }
  }
}
