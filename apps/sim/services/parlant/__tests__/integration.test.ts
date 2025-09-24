/**
 * Integration tests for Parlant service layer
 *
 * These tests verify the integration between Sim and the Parlant server,
 * covering service functionality, error handling, and data flow.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { ParlantClient, getParlantClient } from '../client'
import { AgentService } from '../agent-service'
import { SessionService } from '../session-service'
import type {
  Agent,
  Session,
  AgentCreateRequest,
  SessionCreateRequest,
  AuthContext
} from '../types'

describe('Parlant Integration Tests', () => {
  let client: ParlantClient
  let agentService: AgentService
  let sessionService: SessionService
  let authContext: AuthContext
  let testAgent: Agent
  let testSession: Session

  beforeAll(async () => {
    // Initialize services with test configuration
    client = getParlantClient({
      baseUrl: process.env.PARLANT_TEST_URL || 'http://localhost:8801',
      timeout: 10000,
      retries: 1,
      authToken: process.env.PARLANT_TEST_TOKEN
    })

    agentService = new AgentService(client)
    sessionService = new SessionService(client)

    // Set up auth context for tests
    authContext = {
      user_id: 'test-user-123',
      workspace_id: 'test-workspace-456',
      key_type: 'workspace',
      permissions: ['read', 'write']
    }

    // Wait for server to be ready
    const isHealthy = await client.testConnection()
    if (!isHealthy) {
      throw new Error('Parlant test server is not available')
    }
  })

  afterAll(async () => {
    // Clean up test data
    try {
      if (testSession) {
        await sessionService.deleteSession(testSession.id, authContext)
      }
      if (testAgent) {
        await agentService.deleteAgent(testAgent.id, authContext)
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    await client.close()
  })

  beforeEach(async () => {
    // Reset test state
    testAgent = undefined as any
    testSession = undefined as any
  })

  describe('Health and Connectivity', () => {
    it('should connect to Parlant server', async () => {
      const isConnected = await client.testConnection()
      expect(isConnected).toBe(true)
    })

    it('should return health status', async () => {
      const health = await client.healthCheck(false)
      expect(health).toBeDefined()
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/)
      expect(health.checks).toBeDefined()
      expect(health.checks.server).toBeDefined()
      expect(health.checks.database).toBeDefined()
    })
  })

  describe('Agent Management', () => {
    it('should create an agent', async () => {
      const createRequest: AgentCreateRequest = {
        name: 'Test Agent',
        description: 'Integration test agent',
        workspace_id: authContext.workspace_id!,
        guidelines: [
          {
            condition: 'user asks for help',
            action: 'provide helpful response',
            priority: 1
          }
        ],
        config: {
          temperature: 0.7,
          model: 'gpt-3.5-turbo',
          max_turns: 10
        }
      }

      const response = await agentService.createAgent(createRequest, authContext)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.name).toBe(createRequest.name)
      expect(response.data.workspace_id).toBe(authContext.workspace_id)
      expect(response.data.id).toBeDefined()

      testAgent = response.data
    })

    it('should get agent by ID', async () => {
      // First create an agent
      if (!testAgent) {
        const createRequest: AgentCreateRequest = {
          name: 'Get Test Agent',
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await agentService.createAgent(createRequest, authContext)
        testAgent = createResponse.data
      }

      const response = await agentService.getAgent(testAgent.id, authContext)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBe(testAgent.id)
      expect(response.data.name).toBe(testAgent.name)
    })

    it('should list agents for workspace', async () => {
      // Ensure we have at least one agent
      if (!testAgent) {
        const createRequest: AgentCreateRequest = {
          name: 'List Test Agent',
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await agentService.createAgent(createRequest, authContext)
        testAgent = createResponse.data
      }

      const response = await agentService.listAgents(
        {
          workspace_id: authContext.workspace_id,
          limit: 10,
          offset: 0
        },
        authContext
      )

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.pagination).toBeDefined()

      // Should include our test agent
      const foundAgent = response.data.find(a => a.id === testAgent.id)
      expect(foundAgent).toBeDefined()
    })

    it('should update an agent', async () => {
      // First create an agent
      if (!testAgent) {
        const createRequest: AgentCreateRequest = {
          name: 'Update Test Agent',
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await agentService.createAgent(createRequest, authContext)
        testAgent = createResponse.data
      }

      const updates = {
        name: 'Updated Test Agent',
        description: 'Updated description',
        config: {
          temperature: 0.9
        }
      }

      const response = await agentService.updateAgent(testAgent.id, updates, authContext)

      expect(response.success).toBe(true)
      expect(response.data.name).toBe(updates.name)
      expect(response.data.description).toBe(updates.description)
    })

    it('should search agents', async () => {
      // Ensure we have an agent to search for
      if (!testAgent) {
        const createRequest: AgentCreateRequest = {
          name: 'Searchable Test Agent',
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await agentService.createAgent(createRequest, authContext)
        testAgent = createResponse.data
      }

      const response = await agentService.searchAgents(
        'Searchable',
        authContext.workspace_id!,
        authContext,
        { limit: 5 }
      )

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)

      // Should find our test agent
      const foundAgent = response.data.find(a => a.name.includes('Searchable'))
      expect(foundAgent).toBeDefined()
    })
  })

  describe('Session Management', () => {
    beforeEach(async () => {
      // Create a test agent if needed
      if (!testAgent) {
        const createRequest: AgentCreateRequest = {
          name: 'Session Test Agent',
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await agentService.createAgent(createRequest, authContext)
        testAgent = createResponse.data
      }
    })

    it('should create a session', async () => {
      const createRequest: SessionCreateRequest = {
        agent_id: testAgent.id,
        workspace_id: authContext.workspace_id!,
        customer_id: 'test-customer-789',
        metadata: {
          source: 'integration-test',
          channel: 'web'
        }
      }

      const response = await sessionService.createSession(createRequest, authContext)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.agent_id).toBe(testAgent.id)
      expect(response.data.workspace_id).toBe(authContext.workspace_id)
      expect(response.data.user_id).toBe(authContext.user_id)
      expect(response.data.status).toBe('active')

      testSession = response.data
    })

    it('should get session by ID', async () => {
      // Create session if needed
      if (!testSession) {
        const createRequest: SessionCreateRequest = {
          agent_id: testAgent.id,
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await sessionService.createSession(createRequest, authContext)
        testSession = createResponse.data
      }

      const response = await sessionService.getSession(testSession.id, authContext)

      expect(response.success).toBe(true)
      expect(response.data.id).toBe(testSession.id)
      expect(response.data.agent_id).toBe(testAgent.id)
    })

    it('should list sessions', async () => {
      // Ensure we have a session
      if (!testSession) {
        const createRequest: SessionCreateRequest = {
          agent_id: testAgent.id,
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await sessionService.createSession(createRequest, authContext)
        testSession = createResponse.data
      }

      const response = await sessionService.listSessions(
        {
          workspace_id: authContext.workspace_id,
          agent_id: testAgent.id,
          limit: 10
        },
        authContext
      )

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)

      // Should include our test session
      const foundSession = response.data.find(s => s.id === testSession.id)
      expect(foundSession).toBeDefined()
    })

    it('should send message and add events', async () => {
      // Create session if needed
      if (!testSession) {
        const createRequest: SessionCreateRequest = {
          agent_id: testAgent.id,
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await sessionService.createSession(createRequest, authContext)
        testSession = createResponse.data
      }

      // Send a message
      const messageResponse = await sessionService.sendMessage(
        testSession.id,
        'Hello, this is a test message!',
        { source: 'integration-test' },
        authContext
      )

      expect(messageResponse.success).toBe(true)
      expect(messageResponse.data.type).toBe('customer_message')
      expect(messageResponse.data.content).toBe('Hello, this is a test message!')
      expect(messageResponse.data.session_id).toBe(testSession.id)

      // Get events to verify message was added
      const eventsResponse = await sessionService.getEvents(
        testSession.id,
        { limit: 10 },
        authContext
      )

      expect(eventsResponse.success).toBe(true)
      expect(Array.isArray(eventsResponse.data)).toBe(true)
      expect(eventsResponse.data.length).toBeGreaterThan(0)

      // Should find our message
      const messageEvent = eventsResponse.data.find(
        e => e.type === 'customer_message' && e.content === 'Hello, this is a test message!'
      )
      expect(messageEvent).toBeDefined()
    })

    it('should end a session', async () => {
      // Create session if needed
      if (!testSession) {
        const createRequest: SessionCreateRequest = {
          agent_id: testAgent.id,
          workspace_id: authContext.workspace_id!
        }
        const createResponse = await sessionService.createSession(createRequest, authContext)
        testSession = createResponse.data
      }

      const response = await sessionService.endSession(testSession.id, authContext)

      expect(response.success).toBe(true)
      expect(response.data.status).toBe('ended')
      expect(response.data.id).toBe(testSession.id)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid agent ID', async () => {
      await expect(
        agentService.getAgent('invalid-agent-id', authContext)
      ).rejects.toThrow()
    })

    it('should handle invalid session ID', async () => {
      await expect(
        sessionService.getSession('invalid-session-id', authContext)
      ).rejects.toThrow()
    })

    it('should handle unauthorized access', async () => {
      const unauthorizedAuth: AuthContext = {
        user_id: 'unauthorized-user',
        workspace_id: 'unauthorized-workspace',
        key_type: 'personal'
      }

      await expect(
        agentService.listAgents({ workspace_id: 'unauthorized-workspace' }, unauthorizedAuth)
      ).rejects.toThrow()
    })

    it('should handle network timeouts', async () => {
      const timeoutClient = new ParlantClient({
        baseUrl: 'http://localhost:9999', // Non-existent server
        timeout: 1000,
        retries: 1
      })

      const timeoutService = new AgentService(timeoutClient)

      await expect(
        timeoutService.listAgents({ workspace_id: 'test' }, authContext)
      ).rejects.toThrow()

      await timeoutClient.close()
    })
  })

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = []

      // Create multiple agents concurrently
      for (let i = 0; i < 5; i++) {
        const createRequest: AgentCreateRequest = {
          name: `Concurrent Agent ${i}`,
          workspace_id: authContext.workspace_id!
        }
        promises.push(agentService.createAgent(createRequest, authContext))
      }

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach(response => {
        expect(response.success).toBe(true)
        expect(response.data.id).toBeDefined()
      })

      // Clean up created agents
      const cleanupPromises = responses.map(response =>
        agentService.deleteAgent(response.data.id, authContext)
      )
      await Promise.allSettled(cleanupPromises)
    })

    it('should complete operations within reasonable time', async () => {
      const startTime = Date.now()

      // Create agent
      const createRequest: AgentCreateRequest = {
        name: 'Performance Test Agent',
        workspace_id: authContext.workspace_id!
      }
      const agentResponse = await agentService.createAgent(createRequest, authContext)

      // Create session
      const sessionRequest: SessionCreateRequest = {
        agent_id: agentResponse.data.id,
        workspace_id: authContext.workspace_id!
      }
      const sessionResponse = await sessionService.createSession(sessionRequest, authContext)

      // Send message
      await sessionService.sendMessage(
        sessionResponse.data.id,
        'Performance test message',
        undefined,
        authContext
      )

      const totalTime = Date.now() - startTime

      expect(totalTime).toBeLessThan(10000) // Should complete in under 10 seconds

      // Cleanup
      await sessionService.deleteSession(sessionResponse.data.id, authContext)
      await agentService.deleteAgent(agentResponse.data.id, authContext)
    })
  })
})