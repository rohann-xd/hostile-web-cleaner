import { MessageType, sendMessage } from '@/core/messaging'

export function notifyPopupBlocked(url: string, reason: string): void {
  void sendMessage({
    type: MessageType.POPUP_BLOCKED,
    payload: { url, reason },
  }).catch(() => {})
}
