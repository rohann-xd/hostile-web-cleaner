import type { DebugLogPayload, DebugExpectTabPayload } from '@/core/debug/types'
import type { ExtensionSettings } from '@/core/types'

export enum MessageType {
  GET_SETTINGS = 'GET_SETTINGS',
  SET_ENABLED = 'SET_ENABLED',
  SET_DEBUG = 'SET_DEBUG',
  GET_TAB_STATUS = 'GET_TAB_STATUS',
  POPUP_ALLOWED = 'POPUP_ALLOWED',
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  OPEN_TAB = 'OPEN_TAB',
  DEBUG_LOG = 'DEBUG_LOG',
  DEBUG_EXPECT_TAB = 'DEBUG_EXPECT_TAB',
  GET_DEBUG_LOGS = 'GET_DEBUG_LOGS',
  CLEAR_DEBUG_LOGS = 'CLEAR_DEBUG_LOGS',
  CLEAR_SESSION_BLOCKS = 'CLEAR_SESSION_BLOCKS',
  GET_SESSION_BLOCKS = 'GET_SESSION_BLOCKS',
  BLOCK_DOMAIN_SESSION = 'BLOCK_DOMAIN_SESSION',
  UNTRACKED_TAB_PROMPT = 'UNTRACKED_TAB_PROMPT',
  OVERLAY_REMOVED = 'OVERLAY_REMOVED',
  FAKE_DOWNLOAD_FLAGGED = 'FAKE_DOWNLOAD_FLAGGED',
}

export interface GetSettingsResponse {
  settings: ExtensionSettings
}

export interface SetEnabledPayload {
  enabled: boolean
}

export interface TabStatusResponse {
  active: boolean
  hostname: string | null
}

export interface PopupAllowedPayload {
  url: string
}

export interface PopupBlockedPayload {
  url: string
  reason: string
}

export interface OpenTabPayload {
  url: string
}

export interface UntrackedTabPromptPayload {
  url: string
}

export interface OverlayRemovedPayload {
  count: number
  url: string
}

export interface FakeDownloadFlaggedPayload {
  count: number
  url: string
}

export interface SetDebugPayload {
  debug: boolean
}

export interface DebugLogsResponse {
  logs: import('@/core/debug/types').DebugLogEntry[]
  exportText: string
}

export interface SessionBlocksResponse {
  domains: string[]
}

export interface BlockDomainSessionPayload {
  url: string
}

export interface BlockDomainSessionResponse {
  domain: string | null
  domains: string[]
}

export type ExtensionMessage =
  | { type: MessageType.GET_SETTINGS }
  | { type: MessageType.SET_ENABLED; payload: SetEnabledPayload }
  | { type: MessageType.SET_DEBUG; payload: SetDebugPayload }
  | { type: MessageType.GET_TAB_STATUS }
  | { type: MessageType.POPUP_ALLOWED; payload: PopupAllowedPayload }
  | { type: MessageType.POPUP_BLOCKED; payload: PopupBlockedPayload }
  | { type: MessageType.OPEN_TAB; payload: OpenTabPayload }
  | { type: MessageType.DEBUG_LOG; payload: DebugLogPayload }
  | { type: MessageType.DEBUG_EXPECT_TAB; payload: DebugExpectTabPayload }
  | { type: MessageType.GET_DEBUG_LOGS }
  | { type: MessageType.CLEAR_DEBUG_LOGS }
  | { type: MessageType.CLEAR_SESSION_BLOCKS }
  | { type: MessageType.GET_SESSION_BLOCKS }
  | { type: MessageType.BLOCK_DOMAIN_SESSION; payload: BlockDomainSessionPayload }
  | { type: MessageType.UNTRACKED_TAB_PROMPT; payload: UntrackedTabPromptPayload }
  | { type: MessageType.OVERLAY_REMOVED; payload: OverlayRemovedPayload }
  | { type: MessageType.FAKE_DOWNLOAD_FLAGGED; payload: FakeDownloadFlaggedPayload }

export type ExtensionResponse =
  | GetSettingsResponse
  | TabStatusResponse
  | DebugLogsResponse
  | SessionBlocksResponse
  | BlockDomainSessionResponse
  | { success: true }
  | { success: false }
