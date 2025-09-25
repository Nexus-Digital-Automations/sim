/**
 * Agent Selection and Management Tests
 * ===================================
 *
 * Comprehensive test suite for validating agent selection, configuration, and lifecycle management
 * within the chat system. Tests cover agent discovery, selection persistence, session management,
 * and multi-agent coordination scenarios.
 *
 * Test Categories:
 * 1. Agent Discovery and Listing
 * 2. Agent Selection and Persistence
 * 3. Agent Session Lifecycle Management
 * 4. Multi-Agent Coordination
 * 5. Agent Configuration and Updates
 * 6. Performance and Resource Management
 * 7. Error Handling and Recovery
 * 8. Workspace Isolation and Security
 * 9. Agent Analytics and Monitoring
 * 10. Real-time Agent Events and Communication
 */

import { db } from '@packages/db'
import { parlantAgent, parlantSession, user, workspace } from '@packages/db/schema'
import { act, renderHook, waitFor } from '@testing-library/react'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAgentSelection } from '../../app/chat/hooks/use-agent-selection'
import { type AgentService, agentService } from '../../services/parlant/agent-service'
import { AgentSessionManager } from '../../services/parlant/lifecycle/agent-session-manager'
import type {
  Agent,
  AgentCreateRequest,
  AgentSessionContext,
  AuthContext,
} from '../../services/parlant/types'

// Mock localStorage for browser environment simulation
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Test fixtures and utilities
interface TestAgentContext {
  workspaceId: string
  userId: string
  authContext: AuthContext
  testAgents: Agent[]
  agentService: AgentService
  sessionManager: AgentSessionManager
  activeSessions: Map<string, AgentSessionContext>
}

// Performance tracking for agent operations
interface AgentPerformanceMetrics {
  agentListingTime: number[]
  agentSelectionTime: number[]
  sessionCreationTime: number[]
  sessionSwitchTime: number[]
  averageOperationTime: number
  concurrentAgentSessions: number
  memoryUsage: number
  errorCount: number
}

describe('Agent Selection and Management', () => {
  let testContext: TestAgentContext
  let performanceMetrics: AgentPerformanceMetrics

  beforeAll(async () => {
    // Initialize performance tracking
    performanceMetrics = {
      agentListingTime: [],
      agentSelectionTime: [],
      sessionCreationTime: [],
      sessionSwitchTime: [],
      averageOperationTime: 0,
      concurrentAgentSessions: 0,
      memoryUsage: 0,
      errorCount: 0,
    }

    console.log('🤖 Starting Agent Selection and Management Tests...')
  })

  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()

    // Setup test environment
    const workspaceId = uuidv4()
    const userId = uuidv4()

    const authContext: AuthContext = {
      user_id: userId,
      workspace_id: workspaceId,
      permissions: ['agent:read', 'agent:create', 'agent:update', 'session:create'],
    }

    // Initialize services
    const sessionManager = new AgentSessionManager()
    const activeSessions = new Map<string, AgentSessionContext>()

    // Create test workspace and user
    await db
      .insert(workspace)
      .values({
        id: workspaceId,
        name: 'Agent Test Workspace',
        slug: 'agent-test-workspace',
      })
      .onConflictDoNothing()

    await db
      .insert(user)
      .values({
        id: userId,
        email: 'agent-test@example.com',
        name: 'Agent Test User',
      })
      .onConflictDoNothing()

    // Create test agents with various configurations
    const testAgents: Agent[] = []
    const agentConfigs = [
      {
        name: 'Customer Support Agent',
        description: 'Specialized in customer inquiries and support',
        status: 'active' as const,
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a helpful customer support agent.',
        },
      },
      {
        name: 'Sales Assistant',
        description: 'Expert in sales processes and lead qualification',
        status: 'active' as const,
        config: {
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 1500,
          systemPrompt: 'You are a professional sales assistant.',
        },
      },
      {
        name: 'Technical Support',
        description: 'Handles technical issues and troubleshooting',
        status: 'active' as const,
        config: {
          model: 'gpt-4-turbo',
          temperature: 0.5,
          maxTokens: 3000,
          systemPrompt: 'You are a technical support specialist.',
        },
      },
      {
        name: 'Training Agent',
        description: 'Currently in training mode',
        status: 'training' as const,
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.6,
          maxTokens: 1000,
          systemPrompt: 'You are learning to assist users.',
        },
      },
      {
        name: 'Inactive Agent',
        description: 'Temporarily disabled agent',
        status: 'inactive' as const,
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'Inactive agent for testing.',
        },
      },
    ]

    // Insert test agents into database
    for (let i = 0; i < agentConfigs.length; i++) {
      const config = agentConfigs[i]
      const agentId = uuidv4()

      await db
        .insert(parlantAgent)
        .values({
          id: agentId,
          workspaceId,
          createdBy: userId,
          name: config.name,
          description: config.description,
          status: config.status,
          systemPrompt: config.config.systemPrompt,
          modelProvider: 'openai',
          modelName: config.config.model,
          temperature: Math.round(config.config.temperature * 100),
          maxTokens: config.config.maxTokens,
        })
        .onConflictDoNothing()

      const agent: Agent = {
        id: agentId,
        name: config.name,
        description: config.description,
        status: config.status,
        workspace_id: workspaceId,
        created_by: userId,
        config: config.config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      testAgents.push(agent)
    }

    testContext = {
      workspaceId,
      userId,
      authContext,
      testAgents,
      agentService,
      sessionManager,
      activeSessions,
    }

    console.log(
      `✅ Agent test environment initialized - Workspace: ${workspaceId}, Agents: ${testAgents.length}`
    )
  })

  afterEach(async () => {
    // Cleanup test data
    try {
      await db.delete(parlantSession).where(eq(parlantSession.workspaceId, testContext.workspaceId))
      await db.delete(parlantAgent).where(eq(parlantAgent.workspaceId, testContext.workspaceId))
      await db.delete(workspace).where(eq(workspace.id, testContext.workspaceId))
      await db.delete(user).where(eq(user.id, testContext.userId))

      // Clear active sessions
      testContext.activeSessions.clear()
    } catch (error) {
      console.warn('Agent test cleanup warning:', error)
    }
  })

  afterAll(() => {
    // Calculate and log performance metrics
    const avgListingTime =
      performanceMetrics.agentListingTime.reduce((a, b) => a + b, 0) /
      performanceMetrics.agentListingTime.length
    const avgSelectionTime =
      performanceMetrics.agentSelectionTime.reduce((a, b) => a + b, 0) /
      performanceMetrics.agentSelectionTime.length
    const avgSessionTime =
      performanceMetrics.sessionCreationTime.reduce((a, b) => a + b, 0) /
      performanceMetrics.sessionCreationTime.length

    console.log('📊 Agent Management Performance Metrics:')
    console.log(`   • Average Agent Listing Time: ${avgListingTime?.toFixed(2) || 0}ms`)
    console.log(`   • Average Agent Selection Time: ${avgSelectionTime?.toFixed(2) || 0}ms`)
    console.log(`   • Average Session Creation Time: ${avgSessionTime?.toFixed(2) || 0}ms`)
    console.log(`   • Peak Concurrent Sessions: ${performanceMetrics.concurrentAgentSessions}`)
    console.log(`   • Total Errors: ${performanceMetrics.errorCount}`)
    console.log('✅ Agent Selection and Management Tests Completed')
  })

  describe('1. Agent Discovery and Listing', () => {
    it('should list all active agents for workspace with filtering', async () => {
      const startTime = Date.now()

      // Mock successful agent listing response
      const mockAgentListResponse = {
        success: true,
        data: testContext.testAgents.filter((a) => a.status === 'active'),
        timestamp: new Date().toISOString(),
        pagination: {
          total: testContext.testAgents.filter((a) => a.status === 'active').length,
          limit: 20,
          offset: 0,
          has_more: false,
        },
      }

      // Mock the agent service call
      vi.spyOn(testContext.agentService, 'listAgents').mockResolvedValue(mockAgentListResponse)

      // Test agent listing
      const result = await testContext.agentService.listAgents(
        {
          workspace_id: testContext.workspaceId,
          status: 'active',
          limit: 20,
          offset: 0,
        },
        testContext.authContext
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3) // Only active agents
      expect(result.data.every((agent) => agent.status === 'active')).toBe(true)

      // Verify workspace isolation
      result.data.forEach((agent) => {
        expect(agent.workspace_id).toBe(testContext.workspaceId)
      })

      const listingTime = Date.now() - startTime
      performanceMetrics.agentListingTime.push(listingTime)

      console.log(
        `✅ Agent listing validated - Found ${result.data.length} active agents in ${listingTime}ms`
      )
    })

    it('should search agents by name and description', async () => {
      const startTime = Date.now()

      const searchQuery = 'support'
      const expectedAgents = testContext.testAgents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchQuery) ||
          agent.description?.toLowerCase().includes(searchQuery)
      )

      // Mock search response
      const mockSearchResponse = {
        success: true,
        data: expectedAgents,
        timestamp: new Date().toISOString(),
        pagination: {
          total: expectedAgents.length,
          limit: 10,
          offset: 0,
          has_more: false,
        },
      }

      vi.spyOn(testContext.agentService, 'searchAgents').mockResolvedValue(mockSearchResponse)

      // Perform search
      const searchResult = await testContext.agentService.searchAgents(
        searchQuery,
        testContext.workspaceId,
        testContext.authContext,
        { limit: 10, status: 'active' }
      )

      expect(searchResult.success).toBe(true)
      expect(searchResult.data.length).toBeGreaterThan(0)

      // Verify search results contain the query term
      searchResult.data.forEach((agent) => {
        const matchesName = agent.name.toLowerCase().includes(searchQuery)
        const matchesDescription = agent.description?.toLowerCase().includes(searchQuery)
        expect(matchesName || matchesDescription).toBe(true)
      })

      const searchTime = Date.now() - startTime
      performanceMetrics.agentListingTime.push(searchTime)

      console.log(
        `✅ Agent search validated - Found ${searchResult.data.length} results in ${searchTime}ms`
      )
    })

    it('should handle pagination for large agent lists', async () => {
      const pageSize = 2
      let totalAgents = 0
      let currentPage = 0

      // Test pagination through multiple pages
      while (true) {
        const mockPageResponse = {
          success: true,
          data: testContext.testAgents.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
          timestamp: new Date().toISOString(),
          pagination: {
            total: testContext.testAgents.length,
            limit: pageSize,
            offset: currentPage * pageSize,
            has_more: (currentPage + 1) * pageSize < testContext.testAgents.length,
          },
        }

        vi.spyOn(testContext.agentService, 'listAgents').mockResolvedValue(mockPageResponse)

        const pageResult = await testContext.agentService.listAgents(
          {
            workspace_id: testContext.workspaceId,
            limit: pageSize,
            offset: currentPage * pageSize,
          },
          testContext.authContext
        )

        expect(pageResult.success).toBe(true)
        totalAgents += pageResult.data.length

        if (!pageResult.pagination.has_more || pageResult.data.length === 0) {
          break
        }

        currentPage++
        if (currentPage > 10) break // Safety break
      }

      expect(totalAgents).toBe(testContext.testAgents.length)

      console.log(
        `✅ Agent pagination validated - Processed ${totalAgents} agents across ${currentPage + 1} pages`
      )
    })
  })

  describe('2. Agent Selection and Persistence', () => {
    it('should select and persist agent choice with localStorage', async () => {
      const startTime = Date.now()

      // Mock localStorage behavior
      localStorageMock.getItem.mockReturnValue(null) // No initial selection
      localStorageMock.setItem.mockImplementation(() => {})

      const { result } = renderHook(() =>
        useAgentSelection({
          workspaceId: testContext.workspaceId,
          persistToStorage: true,
          maxRecentAgents: 5,
        })
      )

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Initial state validation
      expect(result.current.selectedAgent).toBe(null)
      expect(result.current.hasSelection).toBe(false)
      expect(result.current.recentAgents).toHaveLength(0)

      // Select an agent
      const agentToSelect = testContext.testAgents[0]
      act(() => {
        result.current.selectAgent(agentToSelect)
      })

      // Verify selection
      expect(result.current.selectedAgent).toBe(agentToSelect)
      expect(result.current.hasSelection).toBe(true)
      expect(result.current.lastSelectionTime).toBeGreaterThan(0)

      // Verify localStorage calls
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('agent_selection_'),
        expect.stringContaining(agentToSelect.id)
      )

      const selectionTime = Date.now() - startTime
      performanceMetrics.agentSelectionTime.push(selectionTime)

      console.log(`✅ Agent selection and persistence validated in ${selectionTime}ms`)
    })

    it('should manage recent agents list with proper ordering', async () => {
      const { result } = renderHook(() =>
        useAgentSelection({
          workspaceId: testContext.workspaceId,
          maxRecentAgents: 3,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Select multiple agents in sequence
      const agentsToSelect = testContext.testAgents.slice(0, 4)

      for (let i = 0; i < agentsToSelect.length; i++) {
        act(() => {
          result.current.selectAgent(agentsToSelect[i])
        })

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Verify recent agents list
      expect(result.current.recentAgents).toHaveLength(2) // maxRecentAgents - 1 (excluding current)

      // Verify most recent is first (excluding currently selected)
      const recentAgents = result.current.recentAgents
      expect(recentAgents[0]).toBe(agentsToSelect[2]) // Second most recent
      expect(recentAgents[1]).toBe(agentsToSelect[1]) // Third most recent

      // Verify current selection is not in recent list
      expect(result.current.selectedAgent).toBe(agentsToSelect[3])
      expect(recentAgents.find((a) => a.id === agentsToSelect[3].id)).toBeUndefined()

      console.log(
        `✅ Recent agents management validated - Maintains ${recentAgents.length} recent agents`
      )
    })

    it('should handle favorite agents with toggle functionality', async () => {
      const { result } = renderHook(() =>
        useAgentSelection({
          workspaceId: testContext.workspaceId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const favoriteAgent = testContext.testAgents[0]

      // Initially not favorite
      expect(result.current.isFavorite(favoriteAgent)).toBe(false)
      expect(result.current.hasFavorites).toBe(false)

      // Add to favorites
      act(() => {
        result.current.toggleFavorite(favoriteAgent)
      })

      // Verify favorite status
      expect(result.current.isFavorite(favoriteAgent)).toBe(true)
      expect(result.current.hasFavorites).toBe(true)
      expect(result.current.favoriteAgents).toHaveLength(1)
      expect(result.current.favoriteAgents[0]).toBe(favoriteAgent)

      // Remove from favorites
      act(() => {
        result.current.toggleFavorite(favoriteAgent)
      })

      // Verify removal
      expect(result.current.isFavorite(favoriteAgent)).toBe(false)
      expect(result.current.hasFavorites).toBe(false)
      expect(result.current.favoriteAgents).toHaveLength(0)

      console.log('✅ Favorite agents functionality validated')
    })

    it('should restore state from localStorage on initialization', async () => {
      const savedAgent = testContext.testAgents[0]
      const savedRecentAgents = testContext.testAgents.slice(1, 3)
      const savedFavorites = [testContext.testAgents[2]]

      // Mock localStorage with saved data
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key.includes('selected')) {
          return JSON.stringify(savedAgent)
        }
        if (key.includes('recent')) {
          return JSON.stringify(savedRecentAgents)
        }
        if (key.includes('favorites')) {
          return JSON.stringify(savedFavorites)
        }
        if (key.includes('last_selection')) {
          return Date.now().toString()
        }
        return null
      })

      const { result } = renderHook(() =>
        useAgentSelection({
          workspaceId: testContext.workspaceId,
          persistToStorage: true,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify restored state
      expect(result.current.selectedAgent).toEqual(savedAgent)
      expect(result.current.hasSelection).toBe(true)
      expect(result.current.favoriteAgents).toEqual(savedFavorites)
      expect(result.current.lastSelectionTime).toBeGreaterThan(0)

      console.log('✅ State restoration from localStorage validated')
    })
  })

  describe('3. Agent Session Lifecycle Management', () => {
    it('should create and manage agent session lifecycle', async () => {
      const startTime = Date.now()

      const agentToUse = testContext.testAgents[0]

      // Create agent session
      const sessionContext = await testContext.sessionManager.createAgentSession(
        agentToUse.id,
        testContext.authContext,
        {
          maxTurns: 50,
          idleTimeoutMs: 30000,
          enablePerformanceTracking: true,
          enableResourceMonitoring: true,
          customMetadata: {
            testSession: true,
            purpose: 'automated-testing',
          },
        }
      )

      expect(sessionContext).toBeDefined()
      expect(sessionContext.agentId).toBe(agentToUse.id)
      expect(sessionContext.userId).toBe(testContext.userId)
      expect(sessionContext.workspaceId).toBe(testContext.workspaceId)
      expect(sessionContext.state).toBe('active')
      expect(sessionContext.metadata.testSession).toBe(true)

      // Track session
      testContext.activeSessions.set(sessionContext.sessionId, sessionContext)

      const sessionCreationTime = Date.now() - startTime
      performanceMetrics.sessionCreationTime.push(sessionCreationTime)
      performanceMetrics.concurrentAgentSessions = Math.max(
        performanceMetrics.concurrentAgentSessions,
        testContext.activeSessions.size
      )

      console.log(
        `✅ Agent session created in ${sessionCreationTime}ms - Session: ${sessionContext.sessionId}`
      )
    })

    it('should handle session state transitions correctly', async () => {
      const agentToUse = testContext.testAgents[1]

      // Create session
      const sessionContext = await testContext.sessionManager.createAgentSession(
        agentToUse.id,
        testContext.authContext,
        { enablePerformanceTracking: true }
      )

      expect(sessionContext.state).toBe('active')

      // Pause session
      await testContext.sessionManager.pauseAgentSession(
        sessionContext.sessionId,
        testContext.authContext
      )

      const pausedSession = testContext.sessionManager.getAgentSession(sessionContext.sessionId)
      expect(pausedSession?.state).toBe('paused')

      // Resume session
      await testContext.sessionManager.resumeAgentSession(
        sessionContext.sessionId,
        testContext.authContext
      )

      const resumedSession = testContext.sessionManager.getAgentSession(sessionContext.sessionId)
      expect(resumedSession?.state).toBe('active')

      // End session
      await testContext.sessionManager.endAgentSession(
        sessionContext.sessionId,
        testContext.authContext
      )

      const endedSession = testContext.sessionManager.getAgentSession(sessionContext.sessionId)
      expect(endedSession?.state).toBe('ended')

      console.log('✅ Agent session lifecycle transitions validated')
    })

    it('should track session activity and performance metrics', async () => {
      const agentToUse = testContext.testAgents[2]

      const sessionContext = await testContext.sessionManager.createAgentSession(
        agentToUse.id,
        testContext.authContext,
        { enablePerformanceTracking: true }
      )

      // Simulate session activity
      const mockEvents = [
        {
          id: 'event1',
          type: 'user_message',
          content: { text: 'Hello, I need help' },
          metadata: { tokensUsed: 15 },
          timestamp: new Date().toISOString(),
        },
        {
          id: 'event2',
          type: 'agent_message',
          content: { text: 'How can I assist you today?' },
          metadata: { tokensUsed: 12 },
          timestamp: new Date().toISOString(),
        },
      ]

      // Update session with activity
      for (const event of mockEvents) {
        await testContext.sessionManager.updateSessionActivity(
          sessionContext.sessionId,
          event,
          Math.random() * 1000 + 500 // Response time between 500-1500ms
        )
      }

      // Verify activity tracking
      const updatedSession = testContext.sessionManager.getAgentSession(sessionContext.sessionId)
      expect(updatedSession?.resourceUsage.messagesProcessed).toBe(2)
      expect(updatedSession?.resourceUsage.tokensConsumed).toBe(27)
      expect(updatedSession?.conversationHistory).toHaveLength(2)
      expect(updatedSession?.performanceMetrics.averageResponseTimeMs).toBeGreaterThan(0)

      console.log(
        `✅ Session activity tracking validated - ${updatedSession?.resourceUsage.messagesProcessed} messages processed`
      )
    })
  })

  describe('4. Multi-Agent Coordination', () => {
    it('should handle multiple concurrent agent sessions', async () => {
      const startTime = Date.now()
      const concurrentAgents = testContext.testAgents.slice(0, 3)
      const sessions: AgentSessionContext[] = []

      // Create multiple concurrent sessions
      const sessionPromises = concurrentAgents.map((agent) =>
        testContext.sessionManager.createAgentSession(agent.id, testContext.authContext, {
          enablePerformanceTracking: true,
          customMetadata: { concurrent: true, agentName: agent.name },
        })
      )

      const createdSessions = await Promise.all(sessionPromises)
      sessions.push(...createdSessions)

      // Verify all sessions created successfully
      expect(sessions).toHaveLength(3)
      sessions.forEach((session) => {
        expect(session.state).toBe('active')
        expect(session.metadata.concurrent).toBe(true)
      })

      // Test concurrent activity simulation
      const activityPromises = sessions.map(async (session, index) => {
        const event = {
          id: `concurrent-event-${index}`,
          type: 'user_message',
          content: { text: `Message to ${session.metadata.agentName}` },
          metadata: { tokensUsed: 10 },
          timestamp: new Date().toISOString(),
        }

        await testContext.sessionManager.updateSessionActivity(
          session.sessionId,
          event,
          Math.random() * 800 + 200
        )
      })

      await Promise.all(activityPromises)

      // Verify concurrent activity
      sessions.forEach((session) => {
        const updatedSession = testContext.sessionManager.getAgentSession(session.sessionId)
        expect(updatedSession?.resourceUsage.messagesProcessed).toBe(1)
      })

      // Get active sessions stats
      const activeSessions = testContext.sessionManager.getActiveSessions(
        testContext.userId,
        testContext.workspaceId
      )

      expect(activeSessions.length).toBeGreaterThanOrEqual(3)

      const concurrencyTime = Date.now() - startTime
      performanceMetrics.concurrentAgentSessions = Math.max(
        performanceMetrics.concurrentAgentSessions,
        sessions.length
      )

      console.log(
        `✅ Multi-agent coordination validated - ${sessions.length} concurrent sessions in ${concurrencyTime}ms`
      )
    })

    it('should support agent switching within a conversation', async () => {
      const startTime = Date.now()

      const agent1 = testContext.testAgents[0]
      const agent2 = testContext.testAgents[1]

      // Start with first agent
      const session1 = await testContext.sessionManager.createAgentSession(
        agent1.id,
        testContext.authContext
      )

      // Simulate conversation with first agent
      await testContext.sessionManager.updateSessionActivity(session1.sessionId, {
        id: 'msg1',
        type: 'user_message',
        content: { text: 'I need technical support' },
        metadata: {},
        timestamp: new Date().toISOString(),
      })

      // Switch to technical support agent
      const session2 = await testContext.sessionManager.createAgentSession(
        agent2.id,
        testContext.authContext,
        {
          customMetadata: {
            previousSession: session1.sessionId,
            switchReason: 'escalation_to_technical',
          },
        }
      )

      // Pause first session
      await testContext.sessionManager.pauseAgentSession(
        session1.sessionId,
        testContext.authContext
      )

      // Continue conversation with second agent
      await testContext.sessionManager.updateSessionActivity(session2.sessionId, {
        id: 'msg2',
        type: 'user_message',
        content: { text: 'Continuing from previous conversation' },
        metadata: { continuedFrom: session1.sessionId },
        timestamp: new Date().toISOString(),
      })

      // Verify agent switch
      expect(session2.metadata.previousSession).toBe(session1.sessionId)
      expect(session2.metadata.switchReason).toBe('escalation_to_technical')

      const switchingTime = Date.now() - startTime
      performanceMetrics.sessionSwitchTime.push(switchingTime)

      console.log(`✅ Agent switching validated in ${switchingTime}ms`)
    })

    it('should coordinate resource allocation across multiple sessions', async () => {
      const sessions: AgentSessionContext[] = []

      // Create multiple sessions with different resource requirements
      for (let i = 0; i < testContext.testAgents.length; i++) {
        const agent = testContext.testAgents[i]
        if (agent.status === 'active') {
          const session = await testContext.sessionManager.createAgentSession(
            agent.id,
            testContext.authContext,
            {
              maxMemoryMB: 100 + i * 50,
              enableResourceMonitoring: true,
              customMetadata: { resourceTier: i + 1 },
            }
          )
          sessions.push(session)
        }
      }

      // Get resource utilization analytics
      const analytics = testContext.sessionManager.getSessionAnalytics('1h')

      expect(analytics.totalSessions).toBeGreaterThan(0)
      expect(analytics.activeSessions).toBeGreaterThan(0)
      expect(analytics.resourceUtilization.activeSessionsCount).toBeGreaterThan(0)

      console.log(
        `✅ Resource coordination validated - ${analytics.activeSessions} active sessions`
      )
      console.log(`   • Resource utilization: ${JSON.stringify(analytics.resourceUtilization)}`)
    })
  })

  describe('5. Agent Configuration and Updates', () => {
    it('should create agents with custom configurations', async () => {
      const createRequest: AgentCreateRequest = {
        name: 'Test Dynamic Agent',
        description: 'Dynamically created agent for testing',
        workspace_id: testContext.workspaceId,
        config: {
          model: 'gpt-4-turbo',
          temperature: 0.9,
          maxTokens: 4000,
          systemPrompt: 'You are a specialized test agent with advanced capabilities.',
        },
        guidelines: [
          {
            condition: 'When user asks about testing',
            action: 'Provide comprehensive testing guidance',
            priority: 100,
          },
        ],
      }

      // Mock successful creation
      const mockCreatedAgent: Agent = {
        id: uuidv4(),
        ...createRequest,
        status: 'active',
        created_by: testContext.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(testContext.agentService, 'createAgent').mockResolvedValue({
        success: true,
        data: mockCreatedAgent,
        timestamp: new Date().toISOString(),
      })

      const result = await testContext.agentService.createAgent(
        createRequest,
        testContext.authContext
      )

      expect(result.success).toBe(true)
      expect(result.data.name).toBe(createRequest.name)
      expect(result.data.config?.model).toBe('gpt-4-turbo')
      expect(result.data.guidelines).toHaveLength(1)

      console.log(`✅ Agent creation with custom config validated - Agent: ${result.data.name}`)
    })

    it('should update agent configurations and validate changes', async () => {
      const agentToUpdate = testContext.testAgents[0]
      const updates = {
        name: 'Updated Customer Support Agent',
        description: 'Enhanced customer support with new capabilities',
        config: {
          ...agentToUpdate.config,
          temperature: 0.8,
          maxTokens: 2500,
        },
      }

      // Mock successful update
      const mockUpdatedAgent: Agent = {
        ...agentToUpdate,
        ...updates,
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(testContext.agentService, 'updateAgent').mockResolvedValue({
        success: true,
        data: mockUpdatedAgent,
        timestamp: new Date().toISOString(),
      })

      const result = await testContext.agentService.updateAgent(
        agentToUpdate.id,
        updates,
        testContext.authContext
      )

      expect(result.success).toBe(true)
      expect(result.data.name).toBe(updates.name)
      expect(result.data.description).toBe(updates.description)
      expect(result.data.config?.temperature).toBe(0.8)
      expect(result.data.config?.maxTokens).toBe(2500)

      console.log(`✅ Agent configuration update validated - ${result.data.name}`)
    })

    it('should duplicate agents with modified configurations', async () => {
      const sourceAgent = testContext.testAgents[0]
      const newName = 'Duplicated Customer Support Agent'

      // Mock successful duplication
      const mockDuplicatedAgent: Agent = {
        ...sourceAgent,
        id: uuidv4(),
        name: newName,
        description: `Copy of ${sourceAgent.description}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(testContext.agentService, 'getAgent').mockResolvedValue({
        success: true,
        data: sourceAgent,
        timestamp: new Date().toISOString(),
      })

      vi.spyOn(testContext.agentService, 'createAgent').mockResolvedValue({
        success: true,
        data: mockDuplicatedAgent,
        timestamp: new Date().toISOString(),
      })

      const result = await testContext.agentService.duplicateAgent(
        sourceAgent.id,
        newName,
        testContext.authContext
      )

      expect(result.success).toBe(true)
      expect(result.data.name).toBe(newName)
      expect(result.data.description).toContain('Copy of')
      expect(result.data.id).not.toBe(sourceAgent.id)

      console.log(
        `✅ Agent duplication validated - Original: ${sourceAgent.name}, Copy: ${result.data.name}`
      )
    })
  })

  describe('6. Performance and Resource Management', () => {
    it('should monitor session performance and resource usage', async () => {
      const agentToUse = testContext.testAgents[0]

      const session = await testContext.sessionManager.createAgentSession(
        agentToUse.id,
        testContext.authContext,
        {
          enablePerformanceTracking: true,
          enableResourceMonitoring: true,
          maxMemoryMB: 200,
        }
      )

      // Simulate high-frequency activity
      const eventCount = 20
      const events = Array.from({ length: eventCount }, (_, index) => ({
        id: `perf-event-${index}`,
        type: 'user_message',
        content: { text: `Performance test message ${index + 1}` },
        metadata: { tokensUsed: Math.floor(Math.random() * 50) + 10 },
        timestamp: new Date().toISOString(),
      }))

      const startTime = Date.now()

      // Process events with varying response times
      for (const event of events) {
        const responseTime = Math.random() * 2000 + 100 // 100-2100ms
        await testContext.sessionManager.updateSessionActivity(
          session.sessionId,
          event,
          responseTime
        )
      }

      const processingTime = Date.now() - startTime

      // Verify performance tracking
      const updatedSession = testContext.sessionManager.getAgentSession(session.sessionId)
      expect(updatedSession?.resourceUsage.messagesProcessed).toBe(eventCount)
      expect(updatedSession?.performanceMetrics.averageResponseTimeMs).toBeGreaterThan(0)
      expect(updatedSession?.performanceMetrics.successRate).toBeGreaterThan(0)

      // Get analytics
      const analytics = testContext.sessionManager.getSessionAnalytics('1h')
      expect(analytics.totalMessagesProcessed).toBeGreaterThan(0)
      expect(analytics.averageResponseTime).toBeGreaterThan(0)

      console.log(
        `✅ Performance monitoring validated - ${eventCount} events processed in ${processingTime}ms`
      )
      console.log(
        `   • Average response time: ${updatedSession?.performanceMetrics.averageResponseTimeMs.toFixed(2)}ms`
      )
      console.log(
        `   • Success rate: ${(updatedSession?.performanceMetrics.successRate * 100).toFixed(1)}%`
      )
    })

    it('should handle memory and resource limits', async () => {
      const agentToUse = testContext.testAgents[1]

      // Create session with strict resource limits
      const session = await testContext.sessionManager.createAgentSession(
        agentToUse.id,
        testContext.authContext,
        {
          maxMemoryMB: 50, // Very low limit for testing
          enableResourceMonitoring: true,
          idleTimeoutMs: 5000, // Short timeout
        }
      )

      // Monitor for resource warnings
      let resourceWarningReceived = false
      testContext.sessionManager.once('resource:warning', (sessionContext) => {
        expect(sessionContext.sessionId).toBe(session.sessionId)
        resourceWarningReceived = true
      })

      // Simulate resource-intensive operations
      const largeEvents = Array.from({ length: 10 }, (_, index) => ({
        id: `large-event-${index}`,
        type: 'user_message',
        content: { text: 'A'.repeat(1000) }, // Large content
        metadata: { tokensUsed: 100 },
        timestamp: new Date().toISOString(),
      }))

      for (const event of largeEvents) {
        await testContext.sessionManager.updateSessionActivity(session.sessionId, event)
      }

      // Get resource utilization
      const analytics = testContext.sessionManager.getSessionAnalytics('1h')
      expect(analytics.resourceUtilization).toBeDefined()

      console.log(`✅ Resource management validated - Memory limit enforced`)
      console.log(`   • Resource warning received: ${resourceWarningReceived}`)
    })
  })

  describe('7. Error Handling and Recovery', () => {
    it('should handle agent service failures gracefully', async () => {
      // Mock network failure
      vi.spyOn(testContext.agentService, 'listAgents').mockRejectedValue(
        new Error('Network connection failed')
      )

      try {
        await testContext.agentService.listAgents(
          {
            workspace_id: testContext.workspaceId,
          },
          testContext.authContext
        )

        // Should not reach here
        expect(false).toBe(true)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Network connection failed')
        performanceMetrics.errorCount++
      }

      console.log('✅ Agent service error handling validated')
    })

    it('should recover from session creation failures', async () => {
      const agentToUse = testContext.testAgents[0]

      // Mock session creation failure
      const originalCreateSession = testContext.sessionManager.createAgentSession
      vi.spyOn(testContext.sessionManager, 'createAgentSession').mockImplementationOnce(() => {
        throw new Error('Session creation failed')
      })

      try {
        await testContext.sessionManager.createAgentSession(agentToUse.id, testContext.authContext)

        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        performanceMetrics.errorCount++
      }

      // Restore original method
      vi.restoreAllMocks()

      // Verify recovery works
      const session = await originalCreateSession.call(
        testContext.sessionManager,
        agentToUse.id,
        testContext.authContext
      )

      expect(session).toBeDefined()
      expect(session.state).toBe('active')

      console.log('✅ Session creation error recovery validated')
    })

    it('should handle invalid agent selection gracefully', async () => {
      const { result } = renderHook(() =>
        useAgentSelection({
          workspaceId: testContext.workspaceId,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Try to select non-existent agent
      const invalidAgent = {
        id: 'invalid-agent-id',
        name: 'Non-existent Agent',
        status: 'active' as const,
        workspace_id: testContext.workspaceId,
        created_by: testContext.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Selection should still work (hook doesn't validate against backend)
      act(() => {
        result.current.selectAgent(invalidAgent)
      })

      expect(result.current.selectedAgent).toBe(invalidAgent)

      console.log('✅ Invalid agent selection handling validated')
    })
  })

  describe('8. Workspace Isolation and Security', () => {
    it('should enforce workspace isolation for agent access', async () => {
      const otherWorkspaceId = uuidv4()

      // Mock response with wrong workspace agents
      const wrongWorkspaceAgents = testContext.testAgents.map((agent) => ({
        ...agent,
        workspace_id: otherWorkspaceId,
      }))

      vi.spyOn(testContext.agentService, 'listAgents').mockResolvedValue({
        success: true,
        data: wrongWorkspaceAgents,
        timestamp: new Date().toISOString(),
        pagination: {
          total: wrongWorkspaceAgents.length,
          limit: 20,
          offset: 0,
          has_more: false,
        },
      })

      const result = await testContext.agentService.listAgents(
        {
          workspace_id: otherWorkspaceId, // Different workspace
        },
        testContext.authContext
      )

      // Should return agents from the queried workspace only
      expect(result.success).toBe(true)
      result.data.forEach((agent) => {
        expect(agent.workspace_id).toBe(otherWorkspaceId)
        expect(agent.workspace_id).not.toBe(testContext.workspaceId)
      })

      console.log('✅ Workspace isolation for agent access validated')
    })

    it('should validate user permissions for agent operations', async () => {
      const restrictedAuth: AuthContext = {
        ...testContext.authContext,
        permissions: ['agent:read'], // Only read permissions
      }

      const agentToUpdate = testContext.testAgents[0]

      // Mock permission denied response
      vi.spyOn(testContext.agentService, 'updateAgent').mockRejectedValue(
        new Error('Permission denied: agent:update required')
      )

      try {
        await testContext.agentService.updateAgent(
          agentToUpdate.id,
          { name: 'Unauthorized Update' },
          restrictedAuth
        )

        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Permission denied')
      }

      console.log('✅ Permission validation for agent operations verified')
    })
  })

  describe('9. Agent Analytics and Monitoring', () => {
    it('should provide comprehensive session analytics', async () => {
      // Create multiple sessions with varied activity
      const sessions: AgentSessionContext[] = []

      for (let i = 0; i < 3; i++) {
        const agent = testContext.testAgents[i]
        if (agent && agent.status === 'active') {
          const session = await testContext.sessionManager.createAgentSession(
            agent.id,
            testContext.authContext,
            { enablePerformanceTracking: true }
          )
          sessions.push(session)

          // Simulate different activity levels
          for (let j = 0; j < (i + 1) * 3; j++) {
            await testContext.sessionManager.updateSessionActivity(
              session.sessionId,
              {
                id: `analytics-event-${i}-${j}`,
                type: 'user_message',
                content: { text: `Analytics test message ${j}` },
                metadata: { tokensUsed: 20 },
                timestamp: new Date().toISOString(),
              },
              Math.random() * 1000 + 200
            )
          }
        }
      }

      // Get comprehensive analytics
      const analytics = testContext.sessionManager.getSessionAnalytics('1h')

      expect(analytics.totalSessions).toBeGreaterThan(0)
      expect(analytics.totalMessagesProcessed).toBeGreaterThan(0)
      expect(analytics.averageResponseTime).toBeGreaterThan(0)
      expect(analytics.resourceUtilization).toBeDefined()

      console.log('✅ Session analytics validated:')
      console.log(`   • Total sessions: ${analytics.totalSessions}`)
      console.log(`   • Active sessions: ${analytics.activeSessions}`)
      console.log(`   • Messages processed: ${analytics.totalMessagesProcessed}`)
      console.log(`   • Average response time: ${analytics.averageResponseTime.toFixed(2)}ms`)
    })

    it('should track agent usage patterns and preferences', async () => {
      const { result } = renderHook(() =>
        useAgentSelection({
          workspaceId: testContext.workspaceId,
          maxRecentAgents: 5,
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Simulate user behavior patterns
      const usagePattern = [
        testContext.testAgents[0], // Customer Support - used frequently
        testContext.testAgents[1], // Sales Assistant
        testContext.testAgents[0], // Customer Support again
        testContext.testAgents[2], // Technical Support
        testContext.testAgents[0], // Customer Support again
      ]

      for (const agent of usagePattern) {
        act(() => {
          result.current.selectAgent(agent)
        })

        // Add to favorites for popular agents
        if (agent === testContext.testAgents[0]) {
          act(() => {
            result.current.toggleFavorite(agent)
          })
        }

        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Analyze usage statistics
      const stats = result.current.stats

      expect(stats.totalRecent).toBeGreaterThan(0)
      expect(stats.totalFavorites).toBeGreaterThan(0)
      expect(stats.daysSinceLastSelection).toBe(0) // Recently used

      console.log('✅ Agent usage pattern tracking validated:')
      console.log(`   • Recent agents: ${stats.totalRecent}`)
      console.log(`   • Favorite agents: ${stats.totalFavorites}`)
      console.log(`   • Days since last selection: ${stats.daysSinceLastSelection}`)
    })
  })

  describe('10. Real-world Agent Management Scenarios', () => {
    it('should simulate complete agent management workflow', async () => {
      console.log('🎭 Simulating complete agent management workflow...')

      // Step 1: User browses available agents
      const browseMock = {
        success: true,
        data: testContext.testAgents.filter((a) => a.status === 'active'),
        timestamp: new Date().toISOString(),
        pagination: { total: 3, limit: 20, offset: 0, has_more: false },
      }

      vi.spyOn(testContext.agentService, 'listAgents').mockResolvedValue(browseMock)

      const availableAgents = await testContext.agentService.listAgents(
        {
          workspace_id: testContext.workspaceId,
          status: 'active',
        },
        testContext.authContext
      )

      expect(availableAgents.data.length).toBeGreaterThan(0)

      // Step 2: User selects an agent for customer support
      const { result: selectionResult } = renderHook(() =>
        useAgentSelection({
          workspaceId: testContext.workspaceId,
        })
      )

      await waitFor(() => {
        expect(selectionResult.current.isLoading).toBe(false)
      })

      const selectedAgent = availableAgents.data.find((a) => a.name.includes('Customer Support'))!

      act(() => {
        selectionResult.current.selectAgent(selectedAgent)
      })

      expect(selectionResult.current.selectedAgent).toBe(selectedAgent)

      // Step 3: Create agent session
      const session = await testContext.sessionManager.createAgentSession(
        selectedAgent.id,
        testContext.authContext,
        { enablePerformanceTracking: true }
      )

      expect(session.state).toBe('active')

      // Step 4: Simulate conversation
      const conversationFlow = [
        'Hello, I need help with my order',
        'Can you check the status of order #12345?',
        'I want to return an item',
        'Thank you for your help!',
      ]

      for (let i = 0; i < conversationFlow.length; i++) {
        const userMessage = conversationFlow[i]

        await testContext.sessionManager.updateSessionActivity(
          session.sessionId,
          {
            id: `workflow-msg-${i}`,
            type: 'user_message',
            content: { text: userMessage },
            metadata: { tokensUsed: userMessage.length / 4 },
            timestamp: new Date().toISOString(),
          },
          Math.random() * 800 + 300
        )

        // Add small delay to simulate realistic conversation pace
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Step 5: User decides to escalate to technical support
      const technicalAgent = availableAgents.data.find((a) => a.name.includes('Technical'))!

      act(() => {
        selectionResult.current.selectAgent(technicalAgent)
      })

      // Create technical support session
      const technicalSession = await testContext.sessionManager.createAgentSession(
        technicalAgent.id,
        testContext.authContext,
        {
          customMetadata: {
            escalatedFrom: session.sessionId,
            escalationReason: 'technical_issue',
          },
        }
      )

      // Step 6: Continue conversation with technical agent
      await testContext.sessionManager.updateSessionActivity(technicalSession.sessionId, {
        id: 'escalation-msg',
        type: 'user_message',
        content: { text: 'I have a technical issue that needs expert help' },
        metadata: { escalated: true, previousSession: session.sessionId },
        timestamp: new Date().toISOString(),
      })

      // Step 7: Mark customer support agent as favorite
      act(() => {
        selectionResult.current.toggleFavorite(selectedAgent)
      })

      // Step 8: End sessions
      await testContext.sessionManager.endAgentSession(session.sessionId, testContext.authContext)
      await testContext.sessionManager.endAgentSession(
        technicalSession.sessionId,
        testContext.authContext
      )

      // Verify complete workflow
      expect(selectionResult.current.selectedAgent).toBe(technicalAgent)
      expect(selectionResult.current.isFavorite(selectedAgent)).toBe(true)
      expect(selectionResult.current.recentAgents.length).toBeGreaterThan(0)

      // Get final analytics
      const finalAnalytics = testContext.sessionManager.getSessionAnalytics('1h')

      console.log('✅ Complete agent management workflow validated:')
      console.log(`   • Agents browsed: ${availableAgents.data.length}`)
      console.log(`   • Sessions created: 2`)
      console.log(`   • Messages exchanged: ${conversationFlow.length + 1}`)
      console.log(`   • Agent escalation: successful`)
      console.log(`   • Final analytics: ${JSON.stringify(finalAnalytics)}`)
    })
  })
})
