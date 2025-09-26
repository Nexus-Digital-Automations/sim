/**
 * Type definitions for Local Parlant Copilot Store
 *
 * This module defines all TypeScript interfaces and types used throughout
 * the local copilot system, providing strong typing for agent management,
 * conversations, messages, tool calls, and streaming functionality.
 */

import type { Agent } from '@/services/parlant/types'

/**
 * Local copilot message interface
 */
export interface LocalCopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  agentId?: string
  agentName?: string
  toolCalls?: LocalCopilotToolCall[]
  fileAttachments?: MessageFileAttachment[]
  contexts?: MessageContext[]
  contentBlocks?: ContentBlock[]
  isStreaming?: boolean
  streamingComplete?: boolean
}

/**
 * Tool call interface for local copilot
 */
export interface LocalCopilotToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  state: 'pending' | 'executing' | 'success' | 'error'
  result?: any
  error?: string
  timestamp: string
  duration?: number
  agentId?: string
}

/**
 * Conversation interface for local copilot
 */
export interface LocalCopilotConversation {
  id: string
  title?: string | null
  agentId: string
  agentName: string
  workspaceId: string
  userId: string
  messages: LocalCopilotMessage[]
  createdAt: string
  updatedAt: string
  lastActiveAt: string
  messageCount: number
  isArchived: boolean
  metadata?: Record<string, any>
}

/**
 * Agent selection interface
 */
export interface AgentSelection {
  agent: Agent
  capabilities: string[]
  isAvailable: boolean
  lastUsed?: string
  conversationCount: number
}

/**
 * File attachment interface
 */
export interface MessageFileAttachment {
  id: string
  key: string
  filename: string
  media_type: string
  size: number
  url?: string
}

/**
 * Message context interface
 */
export interface MessageContext {
  kind: 'workflow' | 'execution' | 'block' | 'knowledge' | 'past_chat'
  label: string
  workflowId?: string
  executionId?: string
  blockId?: string
  chatId?: string
  data?: any
}

/**
 * Content block interface
 */
export interface ContentBlock {
  type: 'text' | 'tool_call' | 'file' | 'contexts'
  content?: string
  toolCall?: LocalCopilotToolCall
  file?: MessageFileAttachment
  contexts?: MessageContext[]
  timestamp: number
}

/**
 * Streaming state interface
 */
export interface StreamingState {
  isStreaming: boolean
  currentMessageId: string | null
  buffer: string
  toolCallsBuffer: LocalCopilotToolCall[]
  abortController: AbortController | null
  error: string | null
}

/**
 * Local copilot preferences
 */
export interface LocalCopilotPreferences {
  defaultAgentId?: string
  autoSelectAgent: boolean
  enableFileAttachments: boolean
  enableToolCallStreaming: boolean
  maxConversationLength: number
  enableNotifications: boolean
  theme: 'light' | 'dark' | 'system'
}

/**
 * Local copilot store state interface
 */
export interface LocalCopilotState {
  // Agent Management
  selectedAgent: Agent | null
  availableAgents: Agent[]
  agentSelections: AgentSelection[]
  isLoadingAgents: boolean
  agentError: string | null

  // Conversation Management
  conversations: LocalCopilotConversation[]
  activeConversation: LocalCopilotConversation | null
  conversationsLoadedForWorkspace: string | null
  isLoadingConversations: boolean
  conversationError: string | null

  // Message Management
  messages: LocalCopilotMessage[]
  messagesLoadedForConversation: string | null
  isLoadingMessages: boolean
  messageError: string | null

  // Streaming State
  streaming: StreamingState

  // Tool Management
  availableTools: string[]
  executingToolCalls: Map<string, LocalCopilotToolCall>
  completedToolCalls: Map<string, LocalCopilotToolCall>

  // UI State
  mode: 'local' | 'external'
  inputValue: string
  showAgentSelector: boolean
  isInitialized: boolean

  // Current Context
  workspaceId: string | null
  userId: string | null

  // Preferences
  preferences: LocalCopilotPreferences

  // Error Handling
  lastError: string | null
  errorContext: Record<string, any> | null
}

/**
 * Action types for store actions
 */
export type LocalCopilotActions = {
  // Agent Actions
  loadAgents: (workspaceId: string) => Promise<void>
  selectAgent: (agent: Agent) => Promise<void>
  clearAgentSelection: () => void
  refreshAgents: () => Promise<void>

  // Conversation Actions
  loadConversations: (workspaceId: string) => Promise<void>
  createConversation: (
    agentId: string,
    initialMessage?: string
  ) => Promise<LocalCopilotConversation | null>
  selectConversation: (conversation: LocalCopilotConversation) => void
  archiveConversation: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  clearActiveConversation: () => void

  // Message Actions
  sendMessage: (message: string, options?: SendMessageOptions) => Promise<void>
  abortMessage: () => void
  loadMessages: (conversationId: string) => Promise<void>
  addMessage: (message: LocalCopilotMessage) => void
  updateMessage: (messageId: string, updates: Partial<LocalCopilotMessage>) => void

  // Tool Actions
  initializeToolIntegration: () => Promise<void>
  getToolRecommendations: (userMessage?: string, limit?: number) => Promise<any[]>
  searchTools: (query: string, options?: { limit?: number }) => any[]
  validateToolArguments: (
    toolId: string,
    args: Record<string, any>
  ) => { valid: boolean; errors: string[]; warnings: string[] }
  getAgentToolStats: () => {
    totalTools: number
    toolsByCategory: Record<string, number>
    toolsByDifficulty: Record<string, number>
    recentlyUsed: string[]
  }
  executeToolCall: (toolCall: LocalCopilotToolCall, contexts?: MessageContext[]) => Promise<any>
  updateToolCallState: (
    toolCallId: string,
    state: LocalCopilotToolCall['state'],
    result?: any,
    error?: string
  ) => void

  // UI Actions
  setMode: (mode: 'local' | 'external') => void
  setInputValue: (value: string) => void
  toggleAgentSelector: () => void
  setShowAgentSelector: (show: boolean) => void

  // Context Actions
  setWorkspaceId: (workspaceId: string) => void
  setUserId: (userId: string) => void
  addContext: (context: MessageContext) => void
  clearContext: () => void

  // Preference Actions
  updatePreferences: (preferences: Partial<LocalCopilotPreferences>) => void
  resetPreferences: () => void

  // Utility Actions
  initialize: (workspaceId: string, userId: string) => Promise<void>
  reset: () => void
  clearErrors: () => void
  setError: (error: string, context?: Record<string, any>) => void
}

/**
 * Send message options interface
 */
export interface SendMessageOptions {
  fileAttachments?: MessageFileAttachment[]
  contexts?: MessageContext[]
  conversationId?: string
  createNewConversation?: boolean
  stream?: boolean
  agentId?: string
}

/**
 * Local copilot store type combining state and actions
 */
export type LocalCopilotStore = LocalCopilotState & LocalCopilotActions

/**
 * Event types for local copilot events
 */
export type LocalCopilotEventType =
  | 'agent_selected'
  | 'conversation_created'
  | 'message_sent'
  | 'message_received'
  | 'tool_call_started'
  | 'tool_call_completed'
  | 'streaming_started'
  | 'streaming_completed'
  | 'error_occurred'

/**
 * Event interface for local copilot events
 */
export interface LocalCopilotEvent {
  type: LocalCopilotEventType
  payload: any
  timestamp: string
  conversationId?: string
  agentId?: string
}

/**
 * Default preferences for local copilot
 */
export const DEFAULT_LOCAL_COPILOT_PREFERENCES: LocalCopilotPreferences = {
  autoSelectAgent: false,
  enableFileAttachments: true,
  enableToolCallStreaming: true,
  maxConversationLength: 100,
  enableNotifications: true,
  theme: 'system',
}

/**
 * Default streaming state
 */
export const DEFAULT_STREAMING_STATE: StreamingState = {
  isStreaming: false,
  currentMessageId: null,
  buffer: '',
  toolCallsBuffer: [],
  abortController: null,
  error: null,
}
