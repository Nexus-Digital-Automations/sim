/**
 * Mock Parlant Provider for Chat Testing Framework
 * ================================================
 *
 * Comprehensive mock implementation of the Parlant provider that simulates
 * all aspects of the real provider for testing purposes.
 */

import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type {
  AgentPerformanceMetrics,
  ChatMessage,
  ChatSession,
  ParlantAgent,
} from '../../../types/parlant'

// Mock Provider Context Type
interface MockParlantContextType {
  // Agents
  agents: ParlantAgent[]
  currentAgent: ParlantAgent | null
  selectAgent: (agentId: string) => Promise<void>
  createAgent: (config: Partial<ParlantAgent>) => Promise<ParlantAgent>

  // Sessions
  currentSession: ChatSession | null
  createSession: (agentId: string) => Promise<ChatSession>
  endSession: () => Promise<void>

  // Messages
  messages: ChatMessage[]
  sendMessage: (content: string, type?: 'text' | 'image' | 'file') => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  editMessage: (messageId: string, newContent: string) => Promise<void>

  // Connection
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  reconnect: () => Promise<void>

  // Loading states
  loading: boolean
  agentLoading: boolean
  messageLoading: boolean

  // Error handling
  error: string | null
  clearError: () => void

  // Testing utilities
  simulateNetworkError: () => void
  simulateAgentResponse: (message: string, delay?: number) => void
  simulateTyping: (agentId: string, isTyping: boolean) => void
  getPerformanceMetrics: () => AgentPerformanceMetrics
}

// Create Context
const MockParlantContext = createContext<MockParlantContextType | null>(null)

// Hook to use context
export const useMockParlant = () => {
  const context = useContext(MockParlantContext)
  if (!context) {
    throw new Error('useMockParlant must be used within a MockParlantProvider')
  }
  return context
}

// Provider Props
interface MockParlantProviderProps {
  children: React.ReactNode
  agents?: ParlantAgent[]
  session?: ChatSession | null
  loading?: boolean
  initialMessages?: ChatMessage[]
  simulateRealTime?: boolean
  networkDelay?: number
  errorRate?: number // 0-1, percentage of operations that should fail
}

// Mock Provider Implementation
export const MockParlantProvider: React.FC<MockParlantProviderProps> = ({
  children,
  agents = [],
  session = null,
  loading = false,
  initialMessages = [],
  simulateRealTime = true,
  networkDelay = 100,
  errorRate = 0,
}) => {
  // State management
  const [currentAgents, setCurrentAgents] = useState<ParlantAgent[]>(agents)
  const [currentAgent, setCurrentAgent] = useState<ParlantAgent | null>(
    agents.length > 0 ? agents[0] : null
  )
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(session)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isConnected, setIsConnected] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connected')
  const [isLoading, setIsLoading] = useState(loading)
  const [agentLoading, setAgentLoading] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Performance metrics tracking
  const [performanceMetrics, setPerformanceMetrics] = useState<AgentPerformanceMetrics>({
    averageResponseTime: 2.5,
    customerSatisfaction: 4.2,
    issueResolutionRate: 0.85,
    handoffRate: 0.12,
    totalMessages: 0,
    totalSessions: 0,
    uptime: 0.999,
    errorRate: 0.001,
  })

  // Simulate network delay
  const simulateDelay = useCallback(
    async (customDelay?: number) => {
      const delay = customDelay ?? networkDelay
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * delay))
      }
    },
    [networkDelay]
  )

  // Simulate potential errors
  const simulateError = useCallback(() => {
    if (errorRate > 0 && Math.random() < errorRate) {
      throw new Error('Simulated network error')
    }
  }, [errorRate])

  // Agent Management
  const selectAgent = useCallback(
    async (agentId: string) => {
      try {
        setAgentLoading(true)
        setError(null)
        simulateError()
        await simulateDelay()

        const agent = currentAgents.find((a) => a.id === agentId)
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`)
        }

        setCurrentAgent(agent)

        // Update performance metrics
        setPerformanceMetrics((prev) => ({
          ...prev,
          totalSessions: prev.totalSessions + 1,
        }))
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setAgentLoading(false)
      }
    },
    [currentAgents, simulateDelay, simulateError]
  )

  const createAgent = useCallback(
    async (config: Partial<ParlantAgent>): Promise<ParlantAgent> => {
      try {
        setAgentLoading(true)
        setError(null)
        simulateError()
        await simulateDelay()

        const newAgent: ParlantAgent = {
          id: `mock-agent-${Date.now()}`,
          name: config.name || 'New Agent',
          description: config.description || 'Mock agent for testing',
          status: 'active',
          capabilities: config.capabilities || ['general-support'],
          guidelines: config.guidelines || {
            personality: 'helpful',
            responseStyle: 'professional',
            escalationRules: [],
            knowledgeDomains: [],
          },
          performanceMetrics: config.performanceMetrics || {
            averageResponseTime: 2.0,
            customerSatisfaction: 4.0,
            issueResolutionRate: 0.8,
            handoffRate: 0.1,
          },
          ...config,
        }

        setCurrentAgents((prev) => [...prev, newAgent])
        return newAgent
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setAgentLoading(false)
      }
    },
    [simulateDelay, simulateError]
  )

  // Session Management
  const createSession = useCallback(
    async (agentId: string): Promise<ChatSession> => {
      try {
        setIsLoading(true)
        setError(null)
        simulateError()
        await simulateDelay()

        const agent = currentAgents.find((a) => a.id === agentId)
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`)
        }

        const newSession: ChatSession = {
          id: `mock-session-${Date.now()}`,
          agentId: agentId,
          userId: 'mock-user-123',
          workspaceId: 'mock-workspace',
          status: 'active',
          startTime: new Date(),
          messages: [],
          context: {
            userIntent: 'general-inquiry',
            previousInteractions: [],
            userProfile: {
              id: 'mock-user-123',
              name: 'Mock User',
              tier: 'premium',
              previousIssues: [],
            },
          },
        }

        setCurrentSession(newSession)
        setMessages([])

        // Send welcome message
        if (simulateRealTime) {
          setTimeout(() => {
            const welcomeMessage: ChatMessage = {
              id: `welcome-${Date.now()}`,
              content: `Hello! I'm ${agent.name}. How can I help you today?`,
              sender: { type: 'agent', id: agent.id, name: agent.name },
              timestamp: new Date(),
              type: 'text',
              sessionId: newSession.id,
            }
            setMessages((prev) => [...prev, welcomeMessage])
          }, 1000)
        }

        return newSession
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [currentAgents, simulateDelay, simulateError, simulateRealTime]
  )

  const endSession = useCallback(async () => {
    try {
      setIsLoading(true)
      simulateError()
      await simulateDelay()

      if (currentSession) {
        setCurrentSession({ ...currentSession, status: 'ended', endTime: new Date() })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [currentSession, simulateDelay, simulateError])

  // Message Management
  const sendMessage = useCallback(
    async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
      try {
        setMessageLoading(true)
        setError(null)
        simulateError()

        if (!currentSession) {
          throw new Error('No active session')
        }

        // Create user message
        const userMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          content: content,
          sender: { type: 'user', id: 'mock-user-123', name: 'Mock User' },
          timestamp: new Date(),
          type: type,
          sessionId: currentSession.id,
        }

        setMessages((prev) => [...prev, userMessage])

        // Update metrics
        setPerformanceMetrics((prev) => ({
          ...prev,
          totalMessages: prev.totalMessages + 1,
        }))

        // Simulate agent response if enabled
        if (simulateRealTime && currentAgent) {
          setTimeout(
            async () => {
              await simulateAgentResponse(
                `Thank you for your message: "${content}". How else can I help?`
              )
            },
            networkDelay + Math.random() * 1000
          )
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setMessageLoading(false)
      }
    },
    [currentSession, currentAgent, simulateRealTime, networkDelay, simulateError]
  )

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        setMessageLoading(true)
        simulateError()
        await simulateDelay()

        setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setMessageLoading(false)
      }
    },
    [simulateDelay, simulateError]
  )

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        setMessageLoading(true)
        simulateError()
        await simulateDelay()

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: newContent, edited: true, editedAt: new Date() }
              : msg
          )
        )
      } catch (err: any) {
        setError(err.message)
      } finally {
        setMessageLoading(false)
      }
    },
    [simulateDelay, simulateError]
  )

  // Connection Management
  const reconnect = useCallback(async () => {
    try {
      setConnectionStatus('connecting')
      setIsConnected(false)
      simulateError()

      await simulateDelay(2000) // Longer delay for reconnection

      setIsConnected(true)
      setConnectionStatus('connected')
      setError(null)
    } catch (err: any) {
      setConnectionStatus('error')
      setError(err.message)
    }
  }, [simulateDelay, simulateError])

  // Testing Utilities
  const simulateNetworkError = useCallback(() => {
    setIsConnected(false)
    setConnectionStatus('error')
    setError('Network connection lost')
  }, [])

  const simulateAgentResponse = useCallback(
    async (message: string, delay = 1000) => {
      if (!currentAgent || !currentSession) return

      // Show typing indicator
      await simulateDelay(delay)

      const agentMessage: ChatMessage = {
        id: `agent-msg-${Date.now()}`,
        content: message,
        sender: { type: 'agent', id: currentAgent.id, name: currentAgent.name },
        timestamp: new Date(),
        type: 'text',
        sessionId: currentSession.id,
      }

      setMessages((prev) => [...prev, agentMessage])

      // Update performance metrics
      setPerformanceMetrics((prev) => ({
        ...prev,
        totalMessages: prev.totalMessages + 1,
        averageResponseTime: (prev.averageResponseTime + delay / 1000) / 2,
      }))
    },
    [currentAgent, currentSession, simulateDelay]
  )

  const simulateTyping = useCallback((agentId: string, isTyping: boolean) => {
    // In a real implementation, this would trigger typing indicators
    console.log(`Agent ${agentId} ${isTyping ? 'started' : 'stopped'} typing`)
  }, [])

  const getPerformanceMetrics = useCallback(() => {
    return {
      ...performanceMetrics,
      uptime: Math.max(0.95, performanceMetrics.uptime - Math.random() * 0.01),
      errorRate: Math.min(0.05, performanceMetrics.errorRate + Math.random() * 0.001),
    }
  }, [performanceMetrics])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Effect to simulate connection status changes
  useEffect(() => {
    if (simulateRealTime) {
      const interval = setInterval(() => {
        // Randomly simulate brief connection issues (5% chance)
        if (Math.random() < 0.05 && isConnected) {
          setConnectionStatus('connecting')
          setIsConnected(false)

          setTimeout(
            () => {
              setConnectionStatus('connected')
              setIsConnected(true)
            },
            2000 + Math.random() * 3000
          )
        }
      }, 30000) // Check every 30 seconds

      return () => clearInterval(interval)
    }
  }, [simulateRealTime, isConnected])

  // Context value
  const contextValue: MockParlantContextType = {
    // Agents
    agents: currentAgents,
    currentAgent,
    selectAgent,
    createAgent,

    // Sessions
    currentSession,
    createSession,
    endSession,

    // Messages
    messages,
    sendMessage,
    deleteMessage,
    editMessage,

    // Connection
    isConnected,
    connectionStatus,
    reconnect,

    // Loading states
    loading: isLoading,
    agentLoading,
    messageLoading,

    // Error handling
    error,
    clearError,

    // Testing utilities
    simulateNetworkError,
    simulateAgentResponse,
    simulateTyping,
    getPerformanceMetrics,
  }

  return <MockParlantContext.Provider value={contextValue}>{children}</MockParlantContext.Provider>
}

// Export for testing utilities
export { MockParlantContext }

// Default export
export default MockParlantProvider

// Additional mock utilities
export const createMockAgent = (overrides: Partial<ParlantAgent> = {}): ParlantAgent => ({
  id: `mock-agent-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Mock Agent',
  description: 'A mock agent for testing',
  status: 'active',
  capabilities: ['general-support'],
  guidelines: {
    personality: 'helpful',
    responseStyle: 'professional',
    escalationRules: [],
    knowledgeDomains: [],
  },
  performanceMetrics: {
    averageResponseTime: 2.5,
    customerSatisfaction: 4.2,
    issueResolutionRate: 0.85,
    handoffRate: 0.12,
  },
  ...overrides,
})

export const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `mock-msg-${Math.random().toString(36).substr(2, 9)}`,
  content: 'Mock message content',
  sender: { type: 'user', id: 'mock-user', name: 'Mock User' },
  timestamp: new Date(),
  type: 'text',
  sessionId: 'mock-session',
  ...overrides,
})

export const createMockSession = (overrides: Partial<ChatSession> = {}): ChatSession => ({
  id: `mock-session-${Math.random().toString(36).substr(2, 9)}`,
  agentId: 'mock-agent',
  userId: 'mock-user',
  workspaceId: 'mock-workspace',
  status: 'active',
  startTime: new Date(),
  messages: [],
  context: {
    userIntent: 'general-inquiry',
    previousInteractions: [],
    userProfile: {
      id: 'mock-user',
      name: 'Mock User',
      tier: 'premium',
      previousIssues: [],
    },
  },
  ...overrides,
})

// Test scenario generators
export const generateTestScenarios = () => ({
  basicConversation: {
    agents: [createMockAgent({ name: 'Support Agent' })],
    initialMessages: [
      createMockMessage({
        content: 'Hello, how can I help you?',
        sender: { type: 'agent', id: 'support-agent', name: 'Support Agent' },
      }),
    ],
  },
  multiAgentScenario: {
    agents: [
      createMockAgent({ id: 'support', name: 'Support Agent' }),
      createMockAgent({ id: 'sales', name: 'Sales Agent' }),
      createMockAgent({ id: 'technical', name: 'Technical Agent' }),
    ],
  },
  errorScenario: {
    agents: [createMockAgent()],
    errorRate: 0.3, // 30% error rate for testing error handling
  },
  networkIssueScenario: {
    agents: [createMockAgent()],
    simulateRealTime: true,
    networkDelay: 3000, // 3 second delays
  },
})
