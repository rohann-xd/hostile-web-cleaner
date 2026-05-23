import type { ExtensionMessage, ExtensionResponse } from './types'

export * from './types'

export function sendMessage<T extends ExtensionResponse>(
  message: ExtensionMessage,
): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>
}

export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
  ) => ExtensionResponse | Promise<ExtensionResponse>,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as ExtensionMessage, sender)

    if (result instanceof Promise) {
      result.then(sendResponse)
      return true
    }

    sendResponse(result)
    return true
  })
}
