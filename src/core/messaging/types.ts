import type { ExtensionSettings } from '@/core/types'

export enum MessageType {
  GET_SETTINGS = 'GET_SETTINGS',
  SET_ENABLED = 'SET_ENABLED',
  GET_TAB_STATUS = 'GET_TAB_STATUS',
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

export type ExtensionMessage =
  | { type: MessageType.GET_SETTINGS }
  | { type: MessageType.SET_ENABLED; payload: SetEnabledPayload }
  | { type: MessageType.GET_TAB_STATUS }

export type ExtensionResponse =
  | GetSettingsResponse
  | TabStatusResponse
  | { success: true }
