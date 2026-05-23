import { GESTURE_WINDOW_MS } from '@/core/constants'

export { GESTURE_WINDOW_MS }

let lastGestureAt = 0

function onUserGesture(): void {
  lastGestureAt = Date.now()
}

export function trackUserGestures(): void {
  window.addEventListener('pointerdown', onUserGesture, true)
  window.addEventListener('click', onUserGesture, true)
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        onUserGesture()
      }
    },
    true,
  )
}

export function isUserGestureActive(): boolean {
  return Date.now() - lastGestureAt < GESTURE_WINDOW_MS
}
