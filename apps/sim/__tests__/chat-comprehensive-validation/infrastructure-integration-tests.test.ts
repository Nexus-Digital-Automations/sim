/**
 * Comprehensive Infrastructure Integration Tests for Parlant Chat System
 * =====================================================================
 *
 * Tests the complete integration between:
 * - Sim's existing infrastructure (database, authentication, workflows)
 * - Parlant server integration layer
 * - Chat interface and API routes
 * - Real-time messaging via Socket.io
 * - Tool adapter system integration
 * - Workspace isolation and security
 */

import { createServer } from 'http'
import { db } from '@sim/db'
import { Server } from 'socket.io'
import Client from 'socket.io-client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AgentService } from '@/app/sim/services/parlant/agent-service'
import { getParlantClient } from '@/app/sim/services/parlant/client'
import { SessionService } from '@/app/sim/services/parlant/session-service'
import { UniversalToolAdapter } from '@/app/sim/services/parlant/tool-adapter'
import { WorkflowExecutor } from '@/apps/sim/executor'
import type { AuthContext, ChatMessage, IntegrationTestResult } from '@/types'

interface TestEnvironment {
  httpServer: any
  socketServer: Server
  parlantClient: any
  agentService: AgentService
  sessionService: SessionService
  toolAdapter: UniversalToolAdapter
  workflowExecutor: WorkflowExecutor
  testWorkspaceId: string
  testUserId: string
  port: number
}

describe('Parlant-Sim Infrastructure Integration Tests', () => {
  let testEnv: TestEnvironment
  let testResults: IntegrationTestResult[] = []

  beforeAll(async () => {
    // Setup comprehensive test environment
    testEnv = await setupTestEnvironment()

    // Verify all services are running
    await verifyServiceHealth()

    console.log('🚀 Integration test environment ready')
  })

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv)

    // Generate integration test report
    await generateIntegrationReport(testResults)

    console.log('✅ Integration tests completed')
  })

  beforeEach(() => {
    testResults = []
  })

  async function setupTestEnvironment(): Promise<TestEnvironment> {
    const port = 3010 + Math.floor(Math.random() * 1000)

    // Setup HTTP and Socket.io servers
    const httpServer = createServer()
    const socketServer = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    })

    // Initialize Parlant client
    const parlantClient = getParlantClient({
      baseUrl: process.env.PARLANT_TEST_URL || 'http://localhost:8801',
      timeout: 15000,
      retries: 2,
    })

    // Setup services
    const agentService = new AgentService(parlantClient)
    const sessionService = new SessionService(parlantClient)
    const toolAdapter = new UniversalToolAdapter()
    const workflowExecutor = new WorkflowExecutor()

    // Create test workspace and user
    const testWorkspaceId = `test-workspace-${Date.now()}`
    const testUserId = `test-user-${Date.now()}`

    await db.insert('workspaces').values({
      id: testWorkspaceId,
      name: 'Integration Test Workspace',
      ownerId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert('users').values({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      name: 'Integration Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return new Promise((resolve) => {
      httpServer.listen(port, () => {
        resolve({
          httpServer,
          socketServer,
          parlantClient,
          agentService,
          sessionService,
          toolAdapter,
          workflowExecutor,
          testWorkspaceId,
          testUserId,
          port,
        })
      })
    })
  }

  async function verifyServiceHealth(): Promise<void> {
    // Verify Parlant server connection
    const parlantHealth = await testEnv.parlantClient.healthCheck()
    expect(parlantHealth.status).toBe('healthy')

    // Verify database connection
    const dbResult = await db.select().from('workspaces').limit(1)
    expect(Array.isArray(dbResult)).toBe(true)

    // Verify Socket.io server
    expect(testEnv.socketServer).toBeDefined()

    console.log('✅ All services healthy')
  }

  async function cleanupTestEnvironment(env: TestEnvironment): Promise<void> {
    // Close connections
    await env.parlantClient.close()
    env.socketServer.close()
    env.httpServer.close()

    // Cleanup test data
    await db.delete('workspaces').where(eq('id', env.testWorkspaceId))
    await db.delete('users').where(eq('id', env.testUserId))
  }

  async function generateIntegrationReport(results: IntegrationTestResult[]): Promise<void> {
    const report = {
      testSuite: 'Parlant-Sim Infrastructure Integration',
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results: results,
      performance: {
        averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        maxResponseTime: Math.max(...results.map((r) => r.duration)),
        minResponseTime: Math.min(...results.map((r) => r.duration)),
      },
    }

    console.log('📊 Integration Test Report:', JSON.stringify(report, null, 2))
  }

  function recordTestResult(
    testName: string,
    success: boolean,
    duration: number,
    metadata?: any
  ): void {
    testResults.push({
      testName,
      success,
      duration,
      timestamp: new Date(),
      metadata,
    })
  }

  describe('Database and Authentication Integration', () => {
    it('should integrate with Sim user authentication system', async () => {
      const startTime = Date.now()

      // Create authenticated context
      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
        permissions: ['read', 'write', 'admin'],
      }

      // Test agent creation with authentication
      const agent = await testEnv.agentService.createAgent(
        {
          name: 'Auth Integration Test Agent',
          description: 'Testing authentication integration',
          workspace_id: testEnv.testWorkspaceId,
          guidelines: [
            {
              condition: 'user requests help',
              action: 'provide assistance',
              priority: 1,
            },
          ],
        },
        authContext
      )

      expect(agent.success).toBe(true)
      expect(agent.data.workspace_id).toBe(testEnv.testWorkspaceId)

      // Verify database record was created
      const dbRecord = await db
        .select()
        .from('parlant_agents')
        .where(eq('id', agent.data.id))
        .limit(1)

      expect(dbRecord).toHaveLength(1)
      expect(dbRecord[0].workspace_id).toBe(testEnv.testWorkspaceId)

      const duration = Date.now() - startTime
      recordTestResult('Database Authentication Integration', true, duration, {
        agentId: agent.data.id,
        workspaceId: testEnv.testWorkspaceId,
      })
    })

    it('should enforce workspace isolation in database queries', async () => {
      const startTime = Date.now()

      // Create agents in different workspaces
      const workspace1Context: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      const workspace2Context: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: `${testEnv.testWorkspaceId}-2`,
        key_type: 'workspace',
      }

      // Create agent in workspace 1
      const agent1 = await testEnv.agentService.createAgent(
        {
          name: 'Workspace 1 Agent',
          workspace_id: workspace1Context.workspace_id!,
        },
        workspace1Context
      )

      // Try to access from workspace 2
      try {
        await testEnv.agentService.getAgent(agent1.data.id, workspace2Context)
        expect.fail('Should not access agent from different workspace')
      } catch (error) {
        expect(error.message).toContain('not found') // Workspace isolation working
      }

      const duration = Date.now() - startTime
      recordTestResult('Workspace Isolation Database', true, duration)
    })

    it('should integrate with Sim permission system', async () => {
      const startTime = Date.now()

      // Test with read-only permissions
      const readOnlyContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'personal',
        permissions: ['read'],
      }

      // Should be able to list agents
      const listResult = await testEnv.agentService.listAgents(
        {
          workspace_id: testEnv.testWorkspaceId,
        },
        readOnlyContext
      )

      expect(listResult.success).toBe(true)

      // Should not be able to create agents
      try {
        await testEnv.agentService.createAgent(
          {
            name: 'Should Fail Agent',
            workspace_id: testEnv.testWorkspaceId,
          },
          readOnlyContext
        )
        expect.fail('Should not allow create with read-only permissions')
      } catch (error) {
        expect(error.message).toContain('permission') // Permission system working
      }

      const duration = Date.now() - startTime
      recordTestResult('Permission System Integration', true, duration)
    })
  })

  describe('Workflow and Tool Adapter Integration', () => {
    it('should integrate Parlant agents with Sim workflow execution', async () => {
      const startTime = Date.now()

      // Create a test workflow
      const workflowId = `test-workflow-${Date.now()}`
      const workflow = {
        id: workflowId,
        name: 'Chat Integration Test Workflow',
        blocks: {
          'start-1': {
            type: 'starter',
            position: { x: 100, y: 100 },
            config: {},
          },
          'agent-1': {
            type: 'agent',
            position: { x: 300, y: 100 },
            config: {
              prompt: 'You are a helpful assistant integrated with Sim workflows',
              model: 'gpt-3.5-turbo',
            },
          },
        },
        edges: [{ source: 'start-1', target: 'agent-1' }],
      }

      // Save workflow to database
      await db.insert('workflows').values({
        id: workflowId,
        name: workflow.name,
        workspaceId: testEnv.testWorkspaceId,
        userId: testEnv.testUserId,
        state: JSON.stringify(workflow),
        isDeployed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Execute workflow through chat interface
      const chatInput = 'Hello, this is a test message through workflow integration'
      const executionResult = await testEnv.workflowExecutor.executeForChat(workflowId, chatInput, {
        conversationId: `conv-${Date.now()}`,
      })

      expect(executionResult).toBeDefined()
      expect(executionResult.success).toBe(true)

      const duration = Date.now() - startTime
      recordTestResult('Workflow Integration', true, duration, {
        workflowId,
        executionTime: duration,
      })
    })

    it('should integrate tool adapters with Parlant agents', async () => {
      const startTime = Date.now()

      // Initialize tool adapter with Sim tools
      await testEnv.toolAdapter.initializeWithSimTools()

      // Get available tools
      const availableTools = await testEnv.toolAdapter.getAvailableTools()
      expect(availableTools.length).toBeGreaterThan(0)

      // Create agent with tool access
      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      const agent = await testEnv.agentService.createAgent(
        {
          name: 'Tool Integration Test Agent',
          description: 'Agent with tool adapter integration',
          workspace_id: testEnv.testWorkspaceId,
          tools: availableTools.slice(0, 5), // Use first 5 tools
        },
        authContext
      )

      expect(agent.success).toBe(true)
      expect(agent.data.tools).toBeDefined()
      expect(agent.data.tools.length).toBeGreaterThan(0)

      // Test tool execution through agent
      const session = await testEnv.sessionService.createSession(
        {
          agent_id: agent.data.id,
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      const toolMessage = await testEnv.sessionService.sendMessage(
        session.data.id,
        'Please use a tool to help me with this request',
        { expectToolUse: true },
        authContext
      )

      expect(toolMessage.success).toBe(true)

      const duration = Date.now() - startTime
      recordTestResult('Tool Adapter Integration', true, duration, {
        agentId: agent.data.id,
        toolsAvailable: availableTools.length,
      })
    })

    it('should handle tool execution errors gracefully', async () => {
      const startTime = Date.now()

      // Create mock failing tool
      const failingTool = {
        name: 'failing_test_tool',
        description: 'A tool that always fails for testing',
        execute: async () => {
          throw new Error('Simulated tool failure')
        },
      }

      await testEnv.toolAdapter.registerTool(failingTool)

      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      const agent = await testEnv.agentService.createAgent(
        {
          name: 'Error Handling Test Agent',
          workspace_id: testEnv.testWorkspaceId,
          tools: [failingTool],
        },
        authContext
      )

      const session = await testEnv.sessionService.createSession(
        {
          agent_id: agent.data.id,
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      // Agent should handle tool failure gracefully
      const response = await testEnv.sessionService.sendMessage(
        session.data.id,
        'Please use the failing tool',
        undefined,
        authContext
      )

      expect(response.success).toBe(true) // Message sent successfully
      expect(response.data.content).toContain('error') // Should mention tool error

      const duration = Date.now() - startTime
      recordTestResult('Tool Error Handling', true, duration)
    })
  })

  describe('Real-time Socket.io Integration', () => {
    it('should integrate chat messages with Socket.io broadcasting', async () => {
      const startTime = Date.now()

      // Setup Socket.io client
      const client = Client(`http://localhost:${testEnv.port}`, {
        auth: {
          token: 'test-token',
          userId: testEnv.testUserId,
          workspaceId: testEnv.testWorkspaceId,
        },
      })

      await new Promise<void>((resolve) => {
        client.on('connect', resolve)
      })

      // Create agent and session
      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      const agent = await testEnv.agentService.createAgent(
        {
          name: 'Socket Integration Test Agent',
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      const session = await testEnv.sessionService.createSession(
        {
          agent_id: agent.data.id,
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      // Listen for real-time message updates
      let receivedMessage: ChatMessage | null = null
      client.on('chat:message', (message: ChatMessage) => {
        receivedMessage = message
      })

      // Send message through session API
      await testEnv.sessionService.sendMessage(
        session.data.id,
        'Test Socket.io integration message',
        undefined,
        authContext
      )

      // Wait for Socket.io broadcast
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(receivedMessage).not.toBeNull()
      expect(receivedMessage!.content).toContain('Test Socket.io integration')

      client.disconnect()

      const duration = Date.now() - startTime
      recordTestResult('Socket.io Integration', true, duration)
    })

    it('should handle Socket.io authentication with Sim auth system', async () => {
      const startTime = Date.now()

      // Setup authentication middleware
      testEnv.socketServer.use((socket, next) => {
        const token = socket.handshake.auth.token
        const userId = socket.handshake.auth.userId
        const workspaceId = socket.handshake.auth.workspaceId

        if (token === 'valid-token' && userId === testEnv.testUserId) {
          socket.data.userId = userId
          socket.data.workspaceId = workspaceId
          next()
        } else {
          next(new Error('Socket authentication failed'))
        }
      })

      // Test valid authentication
      const validClient = Client(`http://localhost:${testEnv.port}`, {
        auth: {
          token: 'valid-token',
          userId: testEnv.testUserId,
          workspaceId: testEnv.testWorkspaceId,
        },
      })

      const connectPromise = new Promise<void>((resolve, reject) => {
        validClient.on('connect', resolve)
        validClient.on('connect_error', reject)
      })

      await connectPromise
      expect(validClient.connected).toBe(true)

      validClient.disconnect()

      // Test invalid authentication
      const invalidClient = Client(`http://localhost:${testEnv.port}`, {
        auth: {
          token: 'invalid-token',
          userId: 'invalid-user',
          workspaceId: 'invalid-workspace',
        },
      })

      const errorPromise = new Promise<Error>((resolve) => {
        invalidClient.on('connect_error', resolve)
      })

      const error = await errorPromise
      expect(error.message).toBe('Socket authentication failed')
      expect(invalidClient.connected).toBe(false)

      const duration = Date.now() - startTime
      recordTestResult('Socket.io Authentication', true, duration)
    })

    it('should enforce workspace isolation in Socket.io rooms', async () => {
      const startTime = Date.now()

      // Create clients for different workspaces
      const workspace1Client = Client(`http://localhost:${testEnv.port}`, {
        auth: {
          token: 'valid-token',
          userId: testEnv.testUserId,
          workspaceId: testEnv.testWorkspaceId,
        },
      })

      const workspace2Client = Client(`http://localhost:${testEnv.port}`, {
        auth: {
          token: 'valid-token',
          userId: testEnv.testUserId,
          workspaceId: `${testEnv.testWorkspaceId}-2`,
        },
      })

      await Promise.all([
        new Promise<void>((resolve) => workspace1Client.on('connect', resolve)),
        new Promise<void>((resolve) => workspace2Client.on('connect', resolve)),
      ])

      // Setup message listeners
      let workspace1Received = false
      let workspace2Received = false

      workspace1Client.on('chat:message', () => {
        workspace1Received = true
      })
      workspace2Client.on('chat:message', () => {
        workspace2Received = true
      })

      // Send message to workspace 1
      workspace1Client.emit('chat:send', {
        content: 'Workspace isolation test',
        workspaceId: testEnv.testWorkspaceId,
      })

      // Wait for message propagation
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Only workspace 1 should receive the message
      expect(workspace1Received).toBe(true)
      expect(workspace2Received).toBe(false)

      workspace1Client.disconnect()
      workspace2Client.disconnect()

      const duration = Date.now() - startTime
      recordTestResult('Socket.io Workspace Isolation', true, duration)
    })
  })

  describe('API Route Integration', () => {
    it('should integrate chat API routes with full infrastructure stack', async () => {
      const startTime = Date.now()

      // Create chat configuration
      const chatConfig = {
        subdomain: 'integration-test-chat',
        title: 'Integration Test Chat',
        description: 'Testing full stack integration',
        workflowId: `workflow-${Date.now()}`,
        isActive: true,
        authType: 'public',
        customizations: {
          welcomeMessage: 'Welcome to integration testing!',
        },
      }

      // Save chat configuration
      await db.insert('chat').values({
        ...chatConfig,
        id: `chat-${Date.now()}`,
        userId: testEnv.testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Test GET endpoint
      const getResponse = await request(testEnv.httpServer)
        .get(`/api/chat/${chatConfig.subdomain}`)
        .expect(200)

      expect(getResponse.body.title).toBe(chatConfig.title)
      expect(getResponse.body.customizations.welcomeMessage).toBe(
        chatConfig.customizations.welcomeMessage
      )

      // Test POST endpoint with message
      const postResponse = await request(testEnv.httpServer)
        .post(`/api/chat/${chatConfig.subdomain}`)
        .send({
          input: 'Hello, testing full integration!',
          conversationId: `conv-${Date.now()}`,
        })
        .expect(200)

      expect(postResponse.headers['content-type']).toContain('text/event-stream')

      const duration = Date.now() - startTime
      recordTestResult('API Route Integration', true, duration, {
        chatSubdomain: chatConfig.subdomain,
      })
    })

    it('should handle streaming responses through infrastructure', async () => {
      const startTime = Date.now()

      // Create workflow with agent block
      const workflowId = `streaming-workflow-${Date.now()}`
      const workflow = {
        id: workflowId,
        blocks: {
          'agent-1': {
            type: 'agent',
            config: {
              prompt: 'Respond with a longer message to test streaming',
              model: 'gpt-3.5-turbo',
            },
          },
        },
      }

      await db.insert('workflows').values({
        id: workflowId,
        workspaceId: testEnv.testWorkspaceId,
        userId: testEnv.testUserId,
        state: JSON.stringify(workflow),
        isDeployed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create chat linked to workflow
      const chatId = `streaming-chat-${Date.now()}`
      await db.insert('chat').values({
        id: chatId,
        subdomain: `streaming-test-${Date.now()}`,
        title: 'Streaming Test Chat',
        workflowId: workflowId,
        userId: testEnv.testUserId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Test streaming response
      const response = await request(testEnv.httpServer)
        .post(`/api/chat/streaming-test-${Date.now()}`)
        .send({
          input: 'Please give me a detailed response to test streaming',
          conversationId: `streaming-conv-${Date.now()}`,
        })

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('text/event-stream')

      // Parse streaming response
      const chunks = response.text.split('\n\n')
      expect(chunks.length).toBeGreaterThan(1) // Should have multiple chunks

      const duration = Date.now() - startTime
      recordTestResult('Streaming Response Integration', true, duration, {
        chunkCount: chunks.length,
        responseSize: response.text.length,
      })
    })
  })

  describe('Performance and Load Integration', () => {
    it('should handle concurrent chat sessions', async () => {
      const startTime = Date.now()
      const concurrentSessions = 20

      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      // Create agent for load testing
      const agent = await testEnv.agentService.createAgent(
        {
          name: 'Load Test Agent',
          description: 'Agent for concurrent session testing',
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: concurrentSessions }, async (_, i) => {
        const session = await testEnv.sessionService.createSession(
          {
            agent_id: agent.data.id,
            workspace_id: testEnv.testWorkspaceId,
            customer_id: `load-test-customer-${i}`,
          },
          authContext
        )

        // Send message in each session
        await testEnv.sessionService.sendMessage(
          session.data.id,
          `Concurrent load test message ${i}`,
          undefined,
          authContext
        )

        return session.data
      })

      const sessions = await Promise.all(sessionPromises)

      expect(sessions).toHaveLength(concurrentSessions)
      sessions.forEach((session, i) => {
        expect(session.customer_id).toBe(`load-test-customer-${i}`)
        expect(session.status).toBe('active')
      })

      const duration = Date.now() - startTime
      const avgSessionTime = duration / concurrentSessions

      recordTestResult('Concurrent Sessions Load Test', true, duration, {
        concurrentSessions,
        averageSessionTime: avgSessionTime,
        totalDuration: duration,
      })

      // Performance assertions
      expect(avgSessionTime).toBeLessThan(1000) // Average under 1 second per session
      expect(duration).toBeLessThan(10000) // Total under 10 seconds
    })

    it('should maintain performance under message load', async () => {
      const startTime = Date.now()
      const messageCount = 100

      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      // Create agent and session
      const agent = await testEnv.agentService.createAgent(
        {
          name: 'Message Load Test Agent',
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      const session = await testEnv.sessionService.createSession(
        {
          agent_id: agent.data.id,
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      // Send many messages rapidly
      const messagePromises = Array.from({ length: messageCount }, (_, i) =>
        testEnv.sessionService.sendMessage(
          session.data.id,
          `Load test message ${i}`,
          { sequence: i },
          authContext
        )
      )

      const messageResults = await Promise.all(messagePromises)

      expect(messageResults).toHaveLength(messageCount)
      messageResults.forEach((result, i) => {
        expect(result.success).toBe(true)
        expect(result.data.content).toBe(`Load test message ${i}`)
      })

      const duration = Date.now() - startTime
      const messagesPerSecond = messageCount / (duration / 1000)

      recordTestResult('Message Load Test', true, duration, {
        messageCount,
        messagesPerSecond,
        averageMessageTime: duration / messageCount,
      })

      // Performance assertions
      expect(messagesPerSecond).toBeGreaterThan(10) // At least 10 messages/second
      expect(duration / messageCount).toBeLessThan(100) // Under 100ms per message
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from Parlant server connection issues', async () => {
      const startTime = Date.now()

      // Simulate connection failure by using invalid URL
      const faultyClient = getParlantClient({
        baseUrl: 'http://localhost:9999', // Non-existent server
        timeout: 1000,
        retries: 2,
      })

      const faultyService = new AgentService(faultyClient)

      // Should fail initially
      try {
        await faultyService.listAgents(
          {
            workspace_id: testEnv.testWorkspaceId,
          },
          {
            user_id: testEnv.testUserId,
            workspace_id: testEnv.testWorkspaceId,
            key_type: 'workspace',
          }
        )
        expect.fail('Should have failed with connection error')
      } catch (error) {
        expect(error.message).toContain('connection') // Connection error
      }

      // Test recovery with valid client
      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      const recoveryResult = await testEnv.agentService.listAgents(
        {
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      expect(recoveryResult.success).toBe(true)

      const duration = Date.now() - startTime
      recordTestResult('Connection Recovery', true, duration)
    })

    it('should handle database transaction rollbacks', async () => {
      const startTime = Date.now()

      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      // Test transaction rollback on agent creation failure
      try {
        await testEnv.agentService.createAgent(
          {
            name: 'Transaction Test Agent',
            workspace_id: 'invalid-workspace-id', // Should cause constraint violation
          },
          authContext
        )
        expect.fail('Should have failed with constraint violation')
      } catch (error) {
        // Error should be handled gracefully
        expect(error.message).toBeDefined()
      }

      // Verify no partial data was created
      const agents = await testEnv.agentService.listAgents(
        {
          workspace_id: testEnv.testWorkspaceId,
        },
        authContext
      )

      // Should not find the failed agent
      const failedAgent = agents.data.find((a) => a.name === 'Transaction Test Agent')
      expect(failedAgent).toBeUndefined()

      const duration = Date.now() - startTime
      recordTestResult('Transaction Rollback', true, duration)
    })

    it('should handle Socket.io connection drops gracefully', async () => {
      const startTime = Date.now()

      const client = Client(`http://localhost:${testEnv.port}`, {
        auth: {
          token: 'valid-token',
          userId: testEnv.testUserId,
          workspaceId: testEnv.testWorkspaceId,
        },
        reconnection: true,
        reconnectionDelay: 100,
      })

      await new Promise<void>((resolve) => {
        client.on('connect', resolve)
      })

      expect(client.connected).toBe(true)

      // Simulate connection drop
      client.disconnect()
      expect(client.connected).toBe(false)

      // Wait for reconnection
      await new Promise<void>((resolve) => {
        client.on('connect', resolve)
      })

      expect(client.connected).toBe(true)

      client.disconnect()

      const duration = Date.now() - startTime
      recordTestResult('Socket.io Reconnection', true, duration)
    })
  })

  describe('Security Integration', () => {
    it('should validate all security boundaries', async () => {
      const startTime = Date.now()

      // Test workspace isolation
      const unauthorizedContext: AuthContext = {
        user_id: 'unauthorized-user',
        workspace_id: 'unauthorized-workspace',
        key_type: 'personal',
      }

      try {
        await testEnv.agentService.listAgents(
          {
            workspace_id: testEnv.testWorkspaceId,
          },
          unauthorizedContext
        )
        expect.fail('Should reject unauthorized access')
      } catch (error) {
        expect(error.message).toContain('unauthorized') // Security working
      }

      // Test input sanitization
      const validContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      const maliciousInput = '<script>alert("xss")</script>'

      const agent = await testEnv.agentService.createAgent(
        {
          name: maliciousInput, // Should be sanitized
          description: 'Testing input sanitization',
          workspace_id: testEnv.testWorkspaceId,
        },
        validContext
      )

      expect(agent.data.name).not.toContain('<script>') // XSS prevented
      expect(agent.data.name).not.toContain('alert') // Script removed

      const duration = Date.now() - startTime
      recordTestResult('Security Validation', true, duration)
    })

    it('should enforce API rate limits', async () => {
      const startTime = Date.now()

      const authContext: AuthContext = {
        user_id: testEnv.testUserId,
        workspace_id: testEnv.testWorkspaceId,
        key_type: 'workspace',
      }

      // Make rapid API calls to trigger rate limiting
      const rapidCalls = Array.from({ length: 100 }, () =>
        testEnv.agentService
          .listAgents(
            {
              workspace_id: testEnv.testWorkspaceId,
            },
            authContext
          )
          .catch((error) => error)
      )

      const results = await Promise.all(rapidCalls)

      // Some calls should be rate limited
      const rateLimitedCalls = results.filter(
        (r) => r instanceof Error && r.message.includes('rate limit')
      )

      expect(rateLimitedCalls.length).toBeGreaterThan(0)

      const duration = Date.now() - startTime
      recordTestResult('Rate Limiting', true, duration, {
        totalCalls: rapidCalls.length,
        rateLimitedCalls: rateLimitedCalls.length,
      })
    })
  })

  describe('Integration Health Monitoring', () => {
    it('should monitor integration health across all components', async () => {
      const startTime = Date.now()

      const healthCheck = {
        parlant: false,
        database: false,
        socketio: false,
        toolAdapter: false,
        workflows: false,
      }

      // Check Parlant health
      try {
        const parlantHealth = await testEnv.parlantClient.healthCheck()
        healthCheck.parlant = parlantHealth.status === 'healthy'
      } catch (error) {
        healthCheck.parlant = false
      }

      // Check database health
      try {
        await db.select().from('workspaces').limit(1)
        healthCheck.database = true
      } catch (error) {
        healthCheck.database = false
      }

      // Check Socket.io health
      try {
        const client = Client(`http://localhost:${testEnv.port}`, { timeout: 1000 })
        await new Promise<void>((resolve, reject) => {
          client.on('connect', () => {
            healthCheck.socketio = true
            client.disconnect()
            resolve()
          })
          client.on('connect_error', reject)
          setTimeout(reject, 1000)
        })
      } catch (error) {
        healthCheck.socketio = false
      }

      // Check tool adapter health
      try {
        const tools = await testEnv.toolAdapter.getAvailableTools()
        healthCheck.toolAdapter = tools.length > 0
      } catch (error) {
        healthCheck.toolAdapter = false
      }

      // Check workflow executor health
      try {
        const testResult = await testEnv.workflowExecutor.healthCheck()
        healthCheck.workflows = testResult.healthy
      } catch (error) {
        healthCheck.workflows = false
      }

      const allHealthy = Object.values(healthCheck).every((h) => h === true)
      expect(allHealthy).toBe(true)

      const duration = Date.now() - startTime
      recordTestResult('Integration Health Check', allHealthy, duration, healthCheck)
    })
  })
})
