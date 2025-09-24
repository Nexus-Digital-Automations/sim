/**
 * Parlant Agent Management API - Integration Tests
 *
 * Comprehensive integration tests for all agent lifecycle management endpoints.
 * These tests validate the complete API behavior including authentication,
 * validation, database operations, and response formatting.
 */

import { db } from '@sim/db'
import { parlantAgent, parlantSession, user, workspace } from '@sim/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DELETE, GET as GetAgent, PUT } from '@/app/api/v1/agents/[id]/route'
import { POST as CreateSession, GET as GetSessions } from '@/app/api/v1/agents/[id]/sessions/route'
import { GET as GetStatus } from '@/app/api/v1/agents/[id]/status/route'
import { GET, POST } from '@/app/api/v1/agents/route'

// Mock authentication for tests
jest.mock('@/app/api/v1/auth', () => ({
  authenticateV1Request: jest.fn().mockResolvedValue({
    authenticated: true,
    userId: 'test-user-id',
    workspaceId: 'test-workspace-id',
    keyType: 'personal' as const,
  }),
}))

// Mock rate limiting for tests
jest.mock('@/app/api/v1/middleware', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remaining: 100,
    resetAt: new Date(),
    limit: 1000,
    userId: 'test-user-id',
  }),
  createRateLimitResponse: jest.fn(),
}))

describe('Parlant Agent Management API', () => {
  let testWorkspaceId: string
  let testUserId: string
  let testAgentId: string

  beforeAll(async () => {
    // Set up test data
    testWorkspaceId = 'test-workspace-id'
    testUserId = 'test-user-id'

    // Create test workspace if it doesn't exist
    try {
      await db
        .insert(workspace)
        .values({
          id: testWorkspaceId,
          name: 'Test Workspace',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
    } catch (error) {
      // Workspace might already exist
    }

    // Create test user if it doesn't exist
    try {
      await db
        .insert(user)
        .values({
          id: testUserId,
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
    } catch (error) {
      // User might already exist
    }
  })

  afterAll(async () => {
    // Clean up test data
    await db.delete(parlantSession).where(eq(parlantSession.workspaceId, testWorkspaceId))
    await db.delete(parlantAgent).where(eq(parlantAgent.workspaceId, testWorkspaceId))
  })

  beforeEach(async () => {
    // Clean up any existing test agents
    await db.delete(parlantSession).where(eq(parlantSession.workspaceId, testWorkspaceId))
    await db.delete(parlantAgent).where(eq(parlantAgent.workspaceId, testWorkspaceId))
  })

  afterEach(async () => {
    // Clean up after each test
    await db.delete(parlantSession).where(eq(parlantSession.workspaceId, testWorkspaceId))
    await db.delete(parlantAgent).where(eq(parlantAgent.workspaceId, testWorkspaceId))
  })

  describe('POST /api/v1/agents', () => {
    it('should create a new agent with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify({
          name: 'Test Agent',
          description: 'A test agent for integration testing',
          workspaceId: testWorkspaceId,
          modelName: 'gpt-4',
          temperature: 70,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        name: 'Test Agent',
        description: 'A test agent for integration testing',
        workspaceId: testWorkspaceId,
        createdBy: testUserId,
        status: 'active',
        modelName: 'gpt-4',
        temperature: 70,
        totalSessions: 0,
        totalMessages: 0,
      })
      expect(data.id).toBeDefined()
      expect(data.createdAt).toBeDefined()
      expect(data.updatedAt).toBeDefined()

      testAgentId = data.id
    })

    it('should reject invalid agent data', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify({
          name: '', // Invalid empty name
          workspaceId: 'invalid-uuid', // Invalid UUID
          temperature: 150, // Invalid temperature
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
      expect(data.details.validationErrors).toBeDefined()
    })

    it('should reject request without authentication', async () => {
      // Mock authentication failure
      const { authenticateV1Request } = require('@/app/api/v1/auth')
      authenticateV1Request.mockResolvedValueOnce({
        authenticated: false,
        error: 'Invalid API key',
      })

      const request = new NextRequest('http://localhost:3000/api/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Agent',
          workspaceId: testWorkspaceId,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('AUTHENTICATION_FAILED')
    })
  })

  describe('GET /api/v1/agents', () => {
    beforeEach(async () => {
      // Create test agents
      await db.insert(parlantAgent).values([
        {
          id: 'agent-1',
          workspaceId: testWorkspaceId,
          createdBy: testUserId,
          name: 'Agent One',
          description: 'First test agent',
          status: 'active',
          modelProvider: 'openai',
          modelName: 'gpt-4',
          temperature: 70,
          maxTokens: 2000,
          totalSessions: 5,
          totalMessages: 50,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'agent-2',
          workspaceId: testWorkspaceId,
          createdBy: testUserId,
          name: 'Agent Two',
          description: 'Second test agent',
          status: 'inactive',
          modelProvider: 'openai',
          modelName: 'gpt-3.5-turbo',
          temperature: 50,
          maxTokens: 1000,
          totalSessions: 2,
          totalMessages: 20,
          createdAt: new Date('2024-01-01T11:00:00Z'),
          updatedAt: new Date('2024-01-01T11:00:00Z'),
        },
      ])
    })

    it('should list all agents', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toHaveLength(2)
      expect(data.pagination).toMatchObject({
        total: 2,
        offset: 0,
        limit: 20,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should filter agents by workspace', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/agents?workspaceId=${testWorkspaceId}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents.every((agent: any) => agent.workspaceId === testWorkspaceId)).toBe(true)
    })

    it('should filter agents by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents?status=active', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toHaveLength(1)
      expect(data.agents[0].status).toBe('active')
    })

    it('should apply pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents?limit=1&offset=0', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toHaveLength(1)
      expect(data.pagination).toMatchObject({
        total: 2,
        offset: 0,
        limit: 1,
        hasNext: true,
        hasPrev: false,
      })
    })

    it('should search agents by name', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents?search=One', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toHaveLength(1)
      expect(data.agents[0].name).toBe('Agent One')
    })
  })

  describe('GET /api/v1/agents/:id', () => {
    beforeEach(async () => {
      // Create a test agent
      await db.insert(parlantAgent).values({
        id: 'test-agent-id',
        workspaceId: testWorkspaceId,
        createdBy: testUserId,
        name: 'Test Agent',
        description: 'A test agent',
        status: 'active',
        modelProvider: 'openai',
        modelName: 'gpt-4',
        temperature: 70,
        maxTokens: 2000,
        totalSessions: 0,
        totalMessages: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })

    it('should retrieve agent details', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/test-agent-id', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GetAgent(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        id: 'test-agent-id',
        name: 'Test Agent',
        description: 'A test agent',
        workspaceId: testWorkspaceId,
        status: 'active',
      })
    })

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/non-existent-id', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GetAgent(request, { params: { id: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('AGENT_NOT_FOUND')
    })
  })

  describe('PUT /api/v1/agents/:id', () => {
    beforeEach(async () => {
      // Create a test agent
      await db.insert(parlantAgent).values({
        id: 'test-agent-id',
        workspaceId: testWorkspaceId,
        createdBy: testUserId,
        name: 'Test Agent',
        description: 'A test agent',
        status: 'active',
        modelProvider: 'openai',
        modelName: 'gpt-4',
        temperature: 70,
        maxTokens: 2000,
        totalSessions: 0,
        totalMessages: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })

    it('should update agent configuration', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/test-agent-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify({
          name: 'Updated Agent Name',
          temperature: 85,
          status: 'inactive',
        }),
      })

      const response = await PUT(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        id: 'test-agent-id',
        name: 'Updated Agent Name',
        temperature: 85,
        status: 'inactive',
      })
    })

    it('should handle partial updates', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/test-agent-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify({
          temperature: 90,
        }),
      })

      const response = await PUT(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.temperature).toBe(90)
      expect(data.name).toBe('Test Agent') // Should remain unchanged
    })

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/non-existent-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      })

      const response = await PUT(request, { params: { id: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('AGENT_NOT_FOUND')
    })
  })

  describe('DELETE /api/v1/agents/:id', () => {
    beforeEach(async () => {
      // Create a test agent
      await db.insert(parlantAgent).values({
        id: 'test-agent-id',
        workspaceId: testWorkspaceId,
        createdBy: testUserId,
        name: 'Test Agent',
        description: 'A test agent',
        status: 'active',
        modelProvider: 'openai',
        modelName: 'gpt-4',
        temperature: 70,
        maxTokens: 2000,
        totalSessions: 0,
        totalMessages: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })

    it('should soft delete an agent', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/test-agent-id', {
        method: 'DELETE',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await DELETE(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('test-agent-id')

      // Verify the agent is soft deleted
      const [agent] = await db
        .select()
        .from(parlantAgent)
        .where(eq(parlantAgent.id, 'test-agent-id'))
      expect(agent.status).toBe('archived')
      expect(agent.deletedAt).toBeDefined()
    })

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/non-existent-id', {
        method: 'DELETE',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await DELETE(request, { params: { id: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('AGENT_NOT_FOUND')
    })
  })

  describe('POST /api/v1/agents/:id/sessions', () => {
    beforeEach(async () => {
      // Create a test agent
      await db.insert(parlantAgent).values({
        id: 'test-agent-id',
        workspaceId: testWorkspaceId,
        createdBy: testUserId,
        name: 'Test Agent',
        description: 'A test agent',
        status: 'active',
        modelProvider: 'openai',
        modelName: 'gpt-4',
        temperature: 70,
        maxTokens: 2000,
        totalSessions: 0,
        totalMessages: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })

    it('should create a new session', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/test-agent-id/sessions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
          body: JSON.stringify({
            mode: 'auto',
            title: 'Test Session',
            customerId: 'customer-123',
            metadata: {
              channel: 'web',
              priority: 'high',
            },
            variables: {
              customerName: 'John Doe',
            },
          }),
        }
      )

      const response = await CreateSession(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        agentId: 'test-agent-id',
        workspaceId: testWorkspaceId,
        userId: testUserId,
        customerId: 'customer-123',
        mode: 'auto',
        status: 'active',
        title: 'Test Session',
        metadata: {
          channel: 'web',
          priority: 'high',
        },
        variables: {
          customerName: 'John Doe',
        },
        eventCount: 0,
        messageCount: 0,
      })
      expect(data.id).toBeDefined()
      expect(data.startedAt).toBeDefined()
    })

    it('should create session with minimal data', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/test-agent-id/sessions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
          body: JSON.stringify({}),
        }
      )

      const response = await CreateSession(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.agentId).toBe('test-agent-id')
      expect(data.mode).toBe('auto') // Default value
    })

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/non-existent-id/sessions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
          body: JSON.stringify({}),
        }
      )

      const response = await CreateSession(request, { params: { id: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('AGENT_NOT_FOUND')
    })
  })

  describe('GET /api/v1/agents/:id/sessions', () => {
    beforeEach(async () => {
      // Create a test agent
      await db.insert(parlantAgent).values({
        id: 'test-agent-id',
        workspaceId: testWorkspaceId,
        createdBy: testUserId,
        name: 'Test Agent',
        description: 'A test agent',
        status: 'active',
        modelProvider: 'openai',
        modelName: 'gpt-4',
        temperature: 70,
        maxTokens: 2000,
        totalSessions: 0,
        totalMessages: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create test sessions
      await db.insert(parlantSession).values([
        {
          id: 'session-1',
          agentId: 'test-agent-id',
          workspaceId: testWorkspaceId,
          userId: testUserId,
          mode: 'auto',
          status: 'active',
          title: 'Active Session',
          metadata: {},
          variables: {},
          eventCount: 0,
          messageCount: 5,
          startedAt: new Date('2024-01-01T10:00:00Z'),
          lastActivityAt: new Date('2024-01-01T10:30:00Z'),
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:30:00Z'),
        },
        {
          id: 'session-2',
          agentId: 'test-agent-id',
          workspaceId: testWorkspaceId,
          userId: testUserId,
          mode: 'manual',
          status: 'completed',
          title: 'Completed Session',
          metadata: {},
          variables: {},
          eventCount: 0,
          messageCount: 10,
          startedAt: new Date('2024-01-01T09:00:00Z'),
          lastActivityAt: new Date('2024-01-01T09:45:00Z'),
          endedAt: new Date('2024-01-01T09:45:00Z'),
          createdAt: new Date('2024-01-01T09:00:00Z'),
          updatedAt: new Date('2024-01-01T09:45:00Z'),
        },
      ])
    })

    it('should list agent sessions', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/test-agent-id/sessions',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        }
      )

      const response = await GetSessions(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessions).toHaveLength(2)
      expect(data.pagination).toMatchObject({
        total: 2,
        offset: 0,
        limit: 20,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should filter sessions by status', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/test-agent-id/sessions?status=active',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        }
      )

      const response = await GetSessions(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessions).toHaveLength(1)
      expect(data.sessions[0].status).toBe('active')
    })

    it('should apply pagination to sessions', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/test-agent-id/sessions?limit=1',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        }
      )

      const response = await GetSessions(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessions).toHaveLength(1)
      expect(data.pagination.hasNext).toBe(true)
    })

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/non-existent-id/sessions',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        }
      )

      const response = await GetSessions(request, { params: { id: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('AGENT_NOT_FOUND')
    })
  })

  describe('GET /api/v1/agents/:id/status', () => {
    beforeEach(async () => {
      // Create a test agent
      await db.insert(parlantAgent).values({
        id: 'test-agent-id',
        workspaceId: testWorkspaceId,
        createdBy: testUserId,
        name: 'Test Agent',
        description: 'A test agent',
        status: 'active',
        modelProvider: 'openai',
        modelName: 'gpt-4',
        temperature: 70,
        maxTokens: 2000,
        totalSessions: 5,
        totalMessages: 50,
        lastActiveAt: new Date('2024-01-01T10:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create active sessions for metrics
      await db.insert(parlantSession).values([
        {
          id: 'active-session-1',
          agentId: 'test-agent-id',
          workspaceId: testWorkspaceId,
          userId: testUserId,
          mode: 'auto',
          status: 'active',
          metadata: {},
          variables: {},
          eventCount: 0,
          messageCount: 0,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'active-session-2',
          agentId: 'test-agent-id',
          workspaceId: testWorkspaceId,
          userId: testUserId,
          mode: 'auto',
          status: 'active',
          metadata: {},
          variables: {},
          eventCount: 0,
          messageCount: 0,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
    })

    it('should return agent status and metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/agents/test-agent-id/status', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GetStatus(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        id: 'test-agent-id',
        name: 'Test Agent',
        status: 'active',
        workspaceId: testWorkspaceId,
        isHealthy: true,
        metrics: {
          totalSessions: 5,
          totalMessages: 50,
          activeSessions: 2,
          averageResponseTime: expect.any(Number),
          successRate: expect.any(Number),
          errorCount: 0,
          lastActiveAt: '2024-01-01T10:00:00.000Z',
        },
        configuration: {
          modelProvider: 'openai',
          modelName: 'gpt-4',
          temperature: 70,
          maxTokens: 2000,
          compositionMode: 'fluid',
        },
      })
      expect(data.lastHealthCheck).toBeDefined()
    })

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/agents/non-existent-id/status',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        }
      )

      const response = await GetStatus(request, { params: { id: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('AGENT_NOT_FOUND')
    })

    it('should return 503 for unhealthy agent', async () => {
      // Update agent to inactive status
      await db
        .update(parlantAgent)
        .set({ status: 'inactive' })
        .where(eq(parlantAgent.id, 'test-agent-id'))

      const request = new NextRequest('http://localhost:3000/api/v1/agents/test-agent-id/status', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      })

      const response = await GetStatus(request, { params: { id: 'test-agent-id' } })
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.isHealthy).toBe(false)
      expect(data.status).toBe('inactive')
    })
  })
})
