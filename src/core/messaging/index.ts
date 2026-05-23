import type { ExtensionMessage, ExtensionResponse } from './types'

export * from './types'

export function sendMessage<T extends ExtensionResponse>(
  message: ExtensionMessage,
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const err = chrome.runtime.lastError
        if (err) {
          reject(new Error(err.message))
          return
        }
        resolve(response as T)
      })
    } catch (error) {
      reject(error)
    }
  })
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
      result
        .then(sendResponse)
        .catch((err) => {
          console.error('[HostileWebCleaner] Message handler error', err)
          sendResponse({ success: false })
        })
      return true
    }

    sendResponse(result)
    return true
  })
}
