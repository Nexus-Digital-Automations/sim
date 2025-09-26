/**
 * Local Parlant Copilot Store
 *
 * Zustand store for managing local copilot state, agent interactions,
 * conversations, messages, and tool calls using Parlant agents.
 * Provides similar functionality to the external copilot but with
 * local Parlant agent processing.
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import {
  executeAgentTool,
  getAgentToolDescriptions,
  getContextualToolRecommendations,
  localCopilotToolIntegration,
} from '@/services/local-copilot/tool-integration'
import type { Agent } from '@/services/parlant/types'
import {
  type AgentSelection,
  DEFAULT_LOCAL_COPILOT_PREFERENCES,
  DEFAULT_STREAMING_STATE,
  type LocalCopilotConversation,
  type LocalCopilotMessage,
  type LocalCopilotState,
  type LocalCopilotStore,
  type LocalCopilotToolCall,
  type MessageContext,
  type SendMessageOptions,
} from './types'

const logger = createLogger('LocalCopilotStore')

/**
 * Initial state for local copilot store
 */
const initialState: LocalCopilotState = {
  // Agent Management
  selectedAgent: null,
  availableAgents: [],
  agentSelections: [],
  isLoadingAgents: false,
  agentError: null,

  // Conversation Management
  conversations: [],
  activeConversation: null,
  conversationsLoadedForWorkspace: null,
  isLoadingConversations: false,
  conversationError: null,

  // Message Management
  messages: [],
  messagesLoadedForConversation: null,
  isLoadingMessages: false,
  messageError: null,

  // Streaming State
  streaming: { ...DEFAULT_STREAMING_STATE },

  // Tool Management
  availableTools: [],
  executingToolCalls: new Map(),
  completedToolCalls: new Map(),

  // UI State
  mode: 'local',
  inputValue: '',
  showAgentSelector: false,
  isInitialized: false,

  // Current Context
  workspaceId: null,
  userId: null,

  // Preferences
  preferences: { ...DEFAULT_LOCAL_COPILOT_PREFERENCES },

  // Error Handling
  lastError: null,
  errorContext: null,
}

/**
 * Local Copilot Store Implementation
 */
export const useLocalCopilotStore = create<LocalCopilotStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // =============================================================
        // AGENT ACTIONS
        // =============================================================

        loadAgents: async (workspaceId: string) => {
          const state = get()
          if (state.isLoadingAgents) return

          logger.info('Loading agents for workspace', { workspaceId })
          set((draft) => {
            draft.isLoadingAgents = true
            draft.agentError = null
          })

          try {
            const response = await fetch(`/api/local-copilot/agents?workspaceId=${workspaceId}`, {
              method: 'GET',
              credentials: 'include',
            })

            if (!response.ok) {
              throw new Error(`Failed to load agents: ${response.statusText}`)
            }

            const data = await response.json()
            const agents = data.agents || []

            // Create agent selections with metadata
            const agentSelections: AgentSelection[] = agents.map((agent: Agent) => ({
              agent,
              capabilities: agent.tools || [],
              isAvailable: agent.is_active,
              conversationCount: 0, // TODO: Get from API
            }))

            set((draft) => {
              draft.availableAgents = agents
              draft.agentSelections = agentSelections
              draft.isLoadingAgents = false
            })

            logger.info('Successfully loaded agents', { count: agents.length })
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error loading agents'
            logger.error('Failed to load agents', { error: errorMessage })

            set((draft) => {
              draft.agentError = errorMessage
              draft.isLoadingAgents = false
            })
          }
        },

        selectAgent: async (agent: Agent) => {
          logger.info('Selecting agent', { agentId: agent.id, agentName: agent.name })

          try {
            // Get tool descriptions for the agent
            const toolDescriptions = getAgentToolDescriptions(agent)

            set((draft) => {
              draft.selectedAgent = agent
              draft.showAgentSelector = false
              draft.availableTools = toolDescriptions

              // Update preferences if auto-select is enabled
              if (draft.preferences.autoSelectAgent) {
                draft.preferences.defaultAgentId = agent.id
              }
            })

            logger.info('Agent selected with tools', {
              agentId: agent.id,
              toolCount: toolDescriptions.length,
            })
          } catch (error) {
            logger.error('Failed to load agent tools', {
              agentId: agent.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            })

            // Still select the agent even if tool loading fails
            set((draft) => {
              draft.selectedAgent = agent
              draft.showAgentSelector = false
              draft.availableTools = []

              // Update preferences if auto-select is enabled
              if (draft.preferences.autoSelectAgent) {
                draft.preferences.defaultAgentId = agent.id
              }
            })
          }
        },

        clearAgentSelection: () => {
          logger.info('Clearing agent selection')
          set((draft) => {
            draft.selectedAgent = null
            draft.preferences.defaultAgentId = undefined
          })
        },

        refreshAgents: async () => {
          const state = get()
          if (state.workspaceId) {
            await get().loadAgents(state.workspaceId)
          }
        },

        // =============================================================
        // CONVERSATION ACTIONS
        // =============================================================

        loadConversations: async (workspaceId: string) => {
          const state = get()
          if (state.isLoadingConversations) return

          logger.info('Loading conversations for workspace', { workspaceId })
          set((draft) => {
            draft.isLoadingConversations = true
            draft.conversationError = null
          })

          try {
            const response = await fetch(
              `/api/local-copilot/conversations?workspaceId=${workspaceId}`,
              {
                method: 'GET',
                credentials: 'include',
              }
            )

            if (!response.ok) {
              throw new Error(`Failed to load conversations: ${response.statusText}`)
            }

            const data = await response.json()
            const conversations = data.conversations || []

            set((draft) => {
              draft.conversations = conversations
              draft.conversationsLoadedForWorkspace = workspaceId
              draft.isLoadingConversations = false
            })

            logger.info('Successfully loaded conversations', { count: conversations.length })
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error loading conversations'
            logger.error('Failed to load conversations', { error: errorMessage })

            set((draft) => {
              draft.conversationError = errorMessage
              draft.isLoadingConversations = false
            })
          }
        },

        createConversation: async (
          agentId: string,
          initialMessage?: string
        ): Promise<LocalCopilotConversation | null> => {
          const state = get()
          if (!state.workspaceId) {
            logger.error('Cannot create conversation: no workspace ID')
            return null
          }

          logger.info('Creating new conversation', { agentId, hasInitialMessage: !!initialMessage })

          try {
            const response = await fetch('/api/local-copilot/conversations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                agentId,
                workspaceId: state.workspaceId,
                initialMessage,
              }),
            })

            if (!response.ok) {
              throw new Error(`Failed to create conversation: ${response.statusText}`)
            }

            const data = await response.json()
            const conversation = data.conversation

            set((draft) => {
              draft.conversations.unshift(conversation)
              draft.activeConversation = conversation
              draft.messages = conversation.messages || []
              draft.messagesLoadedForConversation = conversation.id
            })

            logger.info('Successfully created conversation', { conversationId: conversation.id })
            return conversation
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error creating conversation'
            logger.error('Failed to create conversation', { error: errorMessage })

            set((draft) => {
              draft.conversationError = errorMessage
            })

            return null
          }
        },

        selectConversation: (conversation: LocalCopilotConversation) => {
          logger.info('Selecting conversation', { conversationId: conversation.id })
          set((draft) => {
            draft.activeConversation = conversation
            draft.messages = conversation.messages || []
            draft.messagesLoadedForConversation = conversation.id

            // Select the conversation's agent if available
            const agent = draft.availableAgents.find((a) => a.id === conversation.agentId)
            if (agent) {
              draft.selectedAgent = agent
            }
          })
        },

        archiveConversation: async (conversationId: string) => {
          logger.info('Archiving conversation', { conversationId })

          try {
            const response = await fetch(`/api/local-copilot/conversations/${conversationId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ isArchived: true }),
            })

            if (!response.ok) {
              throw new Error(`Failed to archive conversation: ${response.statusText}`)
            }

            set((draft) => {
              const conversation = draft.conversations.find((c) => c.id === conversationId)
              if (conversation) {
                conversation.isArchived = true
              }
            })

            logger.info('Successfully archived conversation', { conversationId })
          } catch (error) {
            logger.error('Failed to archive conversation', { conversationId, error })
            throw error
          }
        },

        deleteConversation: async (conversationId: string) => {
          logger.info('Deleting conversation', { conversationId })

          try {
            const response = await fetch(`/api/local-copilot/conversations/${conversationId}`, {
              method: 'DELETE',
              credentials: 'include',
            })

            if (!response.ok) {
              throw new Error(`Failed to delete conversation: ${response.statusText}`)
            }

            set((draft) => {
              draft.conversations = draft.conversations.filter((c) => c.id !== conversationId)
              if (draft.activeConversation?.id === conversationId) {
                draft.activeConversation = null
                draft.messages = []
                draft.messagesLoadedForConversation = null
              }
            })

            logger.info('Successfully deleted conversation', { conversationId })
          } catch (error) {
            logger.error('Failed to delete conversation', { conversationId, error })
            throw error
          }
        },

        clearActiveConversation: () => {
          logger.info('Clearing active conversation')
          set((draft) => {
            draft.activeConversation = null
            draft.messages = []
            draft.messagesLoadedForConversation = null
          })
        },

        // =============================================================
        // MESSAGE ACTIONS
        // =============================================================

        sendMessage: async (message: string, options: SendMessageOptions = {}) => {
          const state = get()

          if (state.streaming.isStreaming) {
            logger.warn('Cannot send message: already streaming')
            return
          }

          if (!state.selectedAgent && !options.agentId) {
            logger.error('Cannot send message: no agent selected')
            set((draft) => {
              draft.lastError = 'Please select an agent before sending a message'
            })
            return
          }

          const agentId = options.agentId || state.selectedAgent?.id
          const conversationId = options.conversationId || state.activeConversation?.id

          logger.info('Sending message to local copilot', {
            messageLength: message.length,
            agentId,
            conversationId,
            hasAttachments: !!options.fileAttachments?.length,
            hasContexts: !!options.contexts?.length,
          })

          // Create user message
          const userMessage: LocalCopilotMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            agentId,
            fileAttachments: options.fileAttachments,
            contexts: options.contexts,
          }

          // Add user message to state
          set((draft) => {
            draft.messages.push(userMessage)
            draft.inputValue = ''
            draft.streaming.isStreaming = true
            draft.streaming.currentMessageId = crypto.randomUUID()
            draft.streaming.buffer = ''
            draft.streaming.toolCallsBuffer = []
            draft.streaming.error = null
            draft.lastError = null
          })

          // Create abort controller for streaming
          const abortController = new AbortController()

          set((draft) => {
            draft.streaming.abortController = abortController
          })

          try {
            const response = await fetch('/api/local-copilot/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              signal: abortController.signal,
              body: JSON.stringify({
                message,
                agentId,
                conversationId,
                stream: options.stream !== false,
                fileAttachments: options.fileAttachments,
                contexts: options.contexts,
                workspaceId: state.workspaceId,
              }),
            })

            if (!response.ok) {
              throw new Error(`Failed to send message: ${response.statusText}`)
            }

            if (!response.body) {
              throw new Error('No response body received')
            }

            // Process streaming response
            await get().processStreamingResponse(response.body)
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              logger.info('Message sending was aborted')
            } else {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error sending message'
              logger.error('Failed to send message', { error: errorMessage })

              set((draft) => {
                draft.streaming.error = errorMessage
                draft.lastError = errorMessage
              })
            }
          } finally {
            set((draft) => {
              draft.streaming.isStreaming = false
              draft.streaming.currentMessageId = null
              draft.streaming.abortController = null
            })
          }
        },

        abortMessage: () => {
          const state = get()
          if (state.streaming.abortController) {
            logger.info('Aborting message streaming')
            state.streaming.abortController.abort()
          }
        },

        loadMessages: async (conversationId: string) => {
          const state = get()
          if (state.isLoadingMessages || state.messagesLoadedForConversation === conversationId)
            return

          logger.info('Loading messages for conversation', { conversationId })
          set((draft) => {
            draft.isLoadingMessages = true
            draft.messageError = null
          })

          try {
            const response = await fetch(
              `/api/local-copilot/conversations/${conversationId}/messages`,
              {
                method: 'GET',
                credentials: 'include',
              }
            )

            if (!response.ok) {
              throw new Error(`Failed to load messages: ${response.statusText}`)
            }

            const data = await response.json()
            const messages = data.messages || []

            set((draft) => {
              draft.messages = messages
              draft.messagesLoadedForConversation = conversationId
              draft.isLoadingMessages = false
            })

            logger.info('Successfully loaded messages', { count: messages.length })
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error loading messages'
            logger.error('Failed to load messages', { error: errorMessage })

            set((draft) => {
              draft.messageError = errorMessage
              draft.isLoadingMessages = false
            })
          }
        },

        addMessage: (message: LocalCopilotMessage) => {
          set((draft) => {
            draft.messages.push(message)
          })
        },

        updateMessage: (messageId: string, updates: Partial<LocalCopilotMessage>) => {
          set((draft) => {
            const messageIndex = draft.messages.findIndex((m) => m.id === messageId)
            if (messageIndex !== -1) {
              Object.assign(draft.messages[messageIndex], updates)
            }
          })
        },

        // =============================================================
        // UTILITY METHODS (defined but not in interface)
        // =============================================================

        processStreamingResponse: async (body: ReadableStream) => {
          const reader = body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk

              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.trim() === '') continue
                if (!line.startsWith('data: ')) continue

                try {
                  const jsonStr = line.slice(6)
                  const event = JSON.parse(jsonStr)

                  await get().handleStreamingEvent(event)
                } catch (e) {
                  logger.warn('Failed to parse SSE event', { line })
                }
              }
            }
          } catch (error) {
            logger.error('Error processing streaming response', { error })
            throw error
          }
        },

        handleStreamingEvent: async (event: any) => {
          const state = get()

          switch (event.type) {
            case 'content':
              if (event.data && state.streaming.currentMessageId) {
                set((draft) => {
                  draft.streaming.buffer += event.data

                  // Update or create assistant message
                  const lastMessage = draft.messages[draft.messages.length - 1]
                  if (lastMessage?.id === draft.streaming.currentMessageId) {
                    lastMessage.content = draft.streaming.buffer
                    lastMessage.isStreaming = true
                  } else {
                    // Create new assistant message
                    const assistantMessage: LocalCopilotMessage = {
                      id: draft.streaming.currentMessageId!,
                      role: 'assistant',
                      content: draft.streaming.buffer,
                      timestamp: new Date().toISOString(),
                      agentId: draft.selectedAgent?.id,
                      agentName: draft.selectedAgent?.name,
                      isStreaming: true,
                      toolCalls: [],
                    }
                    draft.messages.push(assistantMessage)
                  }
                })
              }
              break

            case 'tool_call':
              if (event.data && !event.data.partial) {
                const toolCall: LocalCopilotToolCall = {
                  id: event.data.id || crypto.randomUUID(),
                  name: event.data.name,
                  arguments: event.data.arguments || {},
                  state: 'pending',
                  timestamp: new Date().toISOString(),
                  agentId: state.selectedAgent?.id,
                }

                set((draft) => {
                  draft.streaming.toolCallsBuffer.push(toolCall)
                  draft.executingToolCalls.set(toolCall.id, toolCall)

                  // Add to current message
                  const currentMessage = draft.messages.find(
                    (m) => m.id === draft.streaming.currentMessageId
                  )
                  if (currentMessage) {
                    currentMessage.toolCalls = [...(currentMessage.toolCalls || []), toolCall]
                  }
                })
              }
              break

            case 'tool_result':
              if (event.toolCallId) {
                set((draft) => {
                  const toolCall = draft.executingToolCalls.get(event.toolCallId)
                  if (toolCall) {
                    toolCall.state = 'success'
                    toolCall.result = event.result
                    toolCall.duration = event.duration
                    draft.completedToolCalls.set(event.toolCallId, toolCall)
                    draft.executingToolCalls.delete(event.toolCallId)
                  }
                })
              }
              break

            case 'tool_error':
              if (event.toolCallId) {
                set((draft) => {
                  const toolCall = draft.executingToolCalls.get(event.toolCallId)
                  if (toolCall) {
                    toolCall.state = 'error'
                    toolCall.error = event.error
                    draft.completedToolCalls.set(event.toolCallId, toolCall)
                    draft.executingToolCalls.delete(event.toolCallId)
                  }
                })
              }
              break

            case 'done':
              set((draft) => {
                const currentMessage = draft.messages.find(
                  (m) => m.id === draft.streaming.currentMessageId
                )
                if (currentMessage) {
                  currentMessage.isStreaming = false
                  currentMessage.streamingComplete = true
                }
                draft.streaming.isStreaming = false
              })
              break

            case 'error': {
              const errorMsg = event.data?.message || 'Unknown streaming error'
              logger.error('Streaming error received', { error: errorMsg })
              set((draft) => {
                draft.streaming.error = errorMsg
                draft.lastError = errorMsg
              })
              break
            }
          }
        },

        // =============================================================
        // TOOL ACTIONS
        // =============================================================

        initializeToolIntegration: async () => {
          try {
            logger.info('Initializing tool integration system')
            await localCopilotToolIntegration.initialize()
            logger.info('Tool integration system initialized successfully')
          } catch (error) {
            logger.error('Failed to initialize tool integration system', {
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            throw error
          }
        },

        getToolRecommendations: async (userMessage?: string, limit = 3) => {
          const state = get()
          const agent = state.selectedAgent

          if (!agent) {
            return []
          }

          try {
            const conversationHistory = state.messages.slice(-10).map((msg) => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            }))

            const recommendations = await getContextualToolRecommendations(
              agent,
              conversationHistory,
              userMessage,
              limit
            )

            return recommendations
          } catch (error) {
            logger.error('Failed to get tool recommendations', {
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return []
          }
        },

        searchTools: (query: string, options?: { limit?: number }) => {
          const state = get()
          const agent = state.selectedAgent

          if (!agent || !state.isInitialized) {
            return []
          }

          try {
            return localCopilotToolIntegration.searchTools(agent, query, options)
          } catch (error) {
            logger.error('Failed to search tools', {
              query,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return []
          }
        },

        validateToolArguments: (toolId: string, args: Record<string, any>) => {
          try {
            return localCopilotToolIntegration.validateToolArguments(toolId, args)
          } catch (error) {
            logger.error('Failed to validate tool arguments', {
              toolId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return {
              valid: false,
              errors: ['Validation failed'],
              warnings: [],
            }
          }
        },

        getAgentToolStats: () => {
          const state = get()
          const agent = state.selectedAgent

          if (!agent) {
            return {
              totalTools: 0,
              toolsByCategory: {},
              toolsByDifficulty: {},
              recentlyUsed: [],
            }
          }

          try {
            return localCopilotToolIntegration.getAgentToolStats(agent)
          } catch (error) {
            logger.error('Failed to get agent tool stats', {
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return {
              totalTools: 0,
              toolsByCategory: {},
              toolsByDifficulty: {},
              recentlyUsed: [],
            }
          }
        },

        executeToolCall: async (
          toolCall: LocalCopilotToolCall,
          contexts: MessageContext[] = []
        ) => {
          const state = get()
          const agent = state.selectedAgent

          if (!agent) {
            logger.error('Cannot execute tool call without selected agent')
            return
          }

          logger.info('Executing tool call via tool integration', {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
          })

          set((draft) => {
            draft.executingToolCalls.set(toolCall.id, { ...toolCall, state: 'executing' })
          })

          try {
            // Use the tool integration service for execution
            const { toolCall: executedToolCall, formattedResult } = await executeAgentTool(
              agent,
              toolCall,
              contexts
            )

            set((draft) => {
              draft.completedToolCalls.set(toolCall.id, executedToolCall)
              draft.executingToolCalls.delete(toolCall.id)
            })

            logger.info('Successfully executed tool call via integration', {
              toolCallId: toolCall.id,
              duration: executedToolCall.duration,
            })

            return { toolCall: executedToolCall, formattedResult }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown tool execution error'
            logger.error('Tool execution failed via integration', {
              toolCallId: toolCall.id,
              error: errorMessage,
            })

            set((draft) => {
              const executingToolCall = draft.executingToolCalls.get(toolCall.id)
              if (executingToolCall) {
                executingToolCall.state = 'error'
                executingToolCall.error = errorMessage
                draft.completedToolCalls.set(toolCall.id, executingToolCall)
                draft.executingToolCalls.delete(toolCall.id)
              }
            })
          }
        },

        updateToolCallState: (
          toolCallId: string,
          state: LocalCopilotToolCall['state'],
          result?: any,
          error?: string
        ) => {
          set((draft) => {
            const toolCall =
              draft.executingToolCalls.get(toolCallId) || draft.completedToolCalls.get(toolCallId)
            if (toolCall) {
              toolCall.state = state
              if (result !== undefined) toolCall.result = result
              if (error !== undefined) toolCall.error = error

              if (state === 'success' || state === 'error') {
                draft.completedToolCalls.set(toolCallId, toolCall)
                draft.executingToolCalls.delete(toolCallId)
              }
            }
          })
        },

        // =============================================================
        // UI ACTIONS
        // =============================================================

        setMode: (mode: 'local' | 'external') => {
          logger.info('Setting copilot mode', { mode })
          set((draft) => {
            draft.mode = mode
          })
        },

        setInputValue: (value: string) => {
          set((draft) => {
            draft.inputValue = value
          })
        },

        toggleAgentSelector: () => {
          set((draft) => {
            draft.showAgentSelector = !draft.showAgentSelector
          })
        },

        setShowAgentSelector: (show: boolean) => {
          set((draft) => {
            draft.showAgentSelector = show
          })
        },

        // =============================================================
        // CONTEXT ACTIONS
        // =============================================================

        setWorkspaceId: (workspaceId: string) => {
          set((draft) => {
            draft.workspaceId = workspaceId
          })
        },

        setUserId: (userId: string) => {
          set((draft) => {
            draft.userId = userId
          })
        },

        addContext: (context: MessageContext) => {
          // TODO: Implement context management
          logger.info('Adding context', { context })
        },

        clearContext: () => {
          // TODO: Implement context management
          logger.info('Clearing context')
        },

        // =============================================================
        // PREFERENCE ACTIONS
        // =============================================================

        updatePreferences: (preferences: Partial<LocalCopilotPreferences>) => {
          logger.info('Updating preferences', { preferences })
          set((draft) => {
            Object.assign(draft.preferences, preferences)
          })
        },

        resetPreferences: () => {
          logger.info('Resetting preferences to defaults')
          set((draft) => {
            draft.preferences = { ...DEFAULT_LOCAL_COPILOT_PREFERENCES }
          })
        },

        // =============================================================
        // UTILITY ACTIONS
        // =============================================================

        initialize: async (workspaceId: string, userId: string) => {
          logger.info('Initializing local copilot store', { workspaceId, userId })

          set((draft) => {
            draft.workspaceId = workspaceId
            draft.userId = userId
            draft.isInitialized = false
            draft.lastError = null
          })

          try {
            // Initialize tool integration system first
            await get().initializeToolIntegration()

            // Load agents and conversations in parallel
            await Promise.all([get().loadAgents(workspaceId), get().loadConversations(workspaceId)])

            // Auto-select default agent if configured
            const state = get()
            if (state.preferences.defaultAgentId && state.preferences.autoSelectAgent) {
              const defaultAgent = state.availableAgents.find(
                (a) => a.id === state.preferences.defaultAgentId
              )
              if (defaultAgent) {
                await get().selectAgent(defaultAgent)
              }
            }

            set((draft) => {
              draft.isInitialized = true
            })

            logger.info('Local copilot store initialized successfully')
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown initialization error'
            logger.error('Failed to initialize local copilot store', { error: errorMessage })

            set((draft) => {
              draft.lastError = errorMessage
              draft.isInitialized = false
            })
          }
        },

        reset: () => {
          logger.info('Resetting local copilot store')
          set(() => ({ ...initialState }))
        },

        clearErrors: () => {
          set((draft) => {
            draft.lastError = null
            draft.errorContext = null
            draft.agentError = null
            draft.conversationError = null
            draft.messageError = null
            draft.streaming.error = null
          })
        },

        setError: (error: string, context?: Record<string, any>) => {
          logger.error('Setting store error', { error, context })
          set((draft) => {
            draft.lastError = error
            draft.errorContext = context || null
          })
        },
      })),
      {
        name: 'local-copilot-store',
        version: 1,
      }
    )
  )
)

// Export store type for external use
export type LocalCopilotStoreType = ReturnType<typeof useLocalCopilotStore>

// Subscribe to store changes for debugging in development
if (env.NODE_ENV === 'development') {
  useLocalCopilotStore.subscribe(
    (state) => ({
      selectedAgent: state.selectedAgent?.name,
      activeConversation: state.activeConversation?.id,
      messageCount: state.messages.length,
      isStreaming: state.streaming.isStreaming,
    }),
    (current, previous) => {
      if (current !== previous) {
        logger.debug('Local copilot store state changed', { current, previous })
      }
    }
  )
}

// Export store for external access
export default useLocalCopilotStore
