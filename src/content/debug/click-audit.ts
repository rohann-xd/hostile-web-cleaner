import { debugLog } from '@/core/logging'

/** Logs suspicious clicks that may open tabs outside link/window.open paths. */
export function initDebugClickAudit(): void {
  document.addEventListener(
    'click',
    (event) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Element)) return

      if (target.closest('a[href]')) return

      const onclickEl = target.closest('[onclick]')
      if (onclickEl) {
        void debugLog('ClickAudit', 'click_with_onclick', {
          tag: onclickEl.tagName,
          id: onclickEl.id || undefined,
          className: onclickEl.className?.toString?.().slice(0, 80),
          onclick: onclickEl.getAttribute('onclick')?.slice(0, 160),
        })
      }

      const roleButton = target.closest('button, [role="button"]')
      if (roleButton && !onclickEl) {
        void debugLog('ClickAudit', 'click_button_like', {
          tag: roleButton.tagName,
          id: roleButton.id || undefined,
          type: roleButton.getAttribute('type') ?? undefined,
        })
      }
    },
    true,
  )

  document.addEventListener(
    'auxclick',
    (event) => {
      if (event.button !== 1) return
      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')
      void debugLog('ClickAudit', 'middle_click', {
        isLink: Boolean(anchor),
        tag: target.tagName,
        href: anchor instanceof HTMLAnchorElement ? anchor.href : undefined,
      })
    },
    true,
  )
}
