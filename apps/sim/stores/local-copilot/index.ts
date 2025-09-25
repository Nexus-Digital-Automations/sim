/**
 * Local Copilot Store Module
 *
 * Exports the local Parlant copilot store, types, and utilities
 * for use throughout the application.
 */

export type { LocalCopilotStoreType } from './store'
// Main store export
export { default as useLocalCopilotStore } from './store'
// Type exports
export type {
  AgentSelection,
  ContentBlock,
  LocalCopilotActions,
  LocalCopilotConversation,
  LocalCopilotEvent,
  LocalCopilotEventType,
  LocalCopilotMessage,
  LocalCopilotPreferences,
  LocalCopilotState,
  LocalCopilotStore,
  LocalCopilotToolCall,
  MessageContext,
  MessageFileAttachment,
  SendMessageOptions,
  StreamingState,
} from './types'
// Constant exports
export {
  DEFAULT_LOCAL_COPILOT_PREFERENCES,
  DEFAULT_STREAMING_STATE,
} from './types'

// Utility functions for working with the store
export const createLocalCopilotMessage = (
  role: 'user' | 'assistant' | 'system',
  content: string,
  options: {
    agentId?: string
    agentName?: string
    toolCalls?: LocalCopilotToolCall[]
    fileAttachments?: MessageFileAttachment[]
    contexts?: MessageContext[]
  } = {}
): LocalCopilotMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: new Date().toISOString(),
  ...options,
})

export const createLocalCopilotToolCall = (
  name: string,
  args: Record<string, any>,
  options: {
    id?: string
    agentId?: string
    state?: LocalCopilotToolCall['state']
  } = {}
): LocalCopilotToolCall => ({
  id: options.id || crypto.randomUUID(),
  name,
  arguments: args,
  state: options.state || 'pending',
  timestamp: new Date().toISOString(),
  agentId: options.agentId,
})

// Store selectors for common use cases
export const selectLocalCopilotAgent = (state: LocalCopilotState) => state.selectedAgent
export const selectLocalCopilotConversation = (state: LocalCopilotState) => state.activeConversation
export const selectLocalCopilotMessages = (state: LocalCopilotState) => state.messages
export const selectLocalCopilotStreaming = (state: LocalCopilotState) => state.streaming
export const selectLocalCopilotMode = (state: LocalCopilotState) => state.mode
export const selectLocalCopilotError = (state: LocalCopilotState) => state.lastError

// Helper functions
export const isLocalCopilotInitialized = (state: LocalCopilotState): boolean =>
  state.isInitialized && !!state.workspaceId && !!state.userId

export const hasLocalCopilotError = (state: LocalCopilotState): boolean =>
  !!(state.lastError || state.agentError || state.conversationError || state.messageError)

export const isLocalCopilotBusy = (state: LocalCopilotState): boolean =>
  state.isLoadingAgents ||
  state.isLoadingConversations ||
  state.isLoadingMessages ||
  state.streaming.isStreaming

export const getActiveLocalCopilotToolCalls = (state: LocalCopilotState): LocalCopilotToolCall[] =>
  Array.from(state.executingToolCalls.values())

export const getCompletedLocalCopilotToolCalls = (
  state: LocalCopilotState
): LocalCopilotToolCall[] => Array.from(state.completedToolCalls.values())

// Re-export types from Parlant services for convenience
export type { Agent } from '@/services/parlant/types'
