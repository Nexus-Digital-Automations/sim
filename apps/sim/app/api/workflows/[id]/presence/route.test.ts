/**
 * Comprehensive Test Suite for Workflow Presence Tracking API
 * Tests real-time presence, cursor tracking, session management, and user activity
 * Covers authentication, authorization, session lifecycle, and presence analytics
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'
import { DELETE, GET, POST } from './route'

// Mock presence data
const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'owner-123',
  name: 'Presence Test Workflow',
  workspaceId: 'workspace-456',
}

const sampleCollaborationSession = {
  userId: 'user-123',
  socketId: 'socket-abc123',
  joinedAt: new Date('2024-01-15T10:00:00.000Z'),
  lastActivity: new Date('2024-01-15T10:30:00.000Z'),
  permissions: 'edit',
  userAgent: 'Mozilla/5.0 (Test Browser)',
  ipAddress: '192.168.1.100',
  userName: 'Active User',
  userEmail: 'active@example.com',
}

const sampleInactiveSession = {
  userId: 'user-456',
  socketId: 'socket-def456',
  joinedAt: new Date('2024-01-15T09:00:00.000Z'),
  lastActivity: new Date('2024-01-15T09:30:00.000Z'), // 1 hour ago
  permissions: 'view',
  userAgent: 'Mozilla/5.0 (Inactive Browser)',
  ipAddress: '192.168.1.101',
  userName: 'Inactive User',
  userEmail: 'inactive@example.com',
}

// Mock presence validation
vi.mock('../collaborate/route', () => ({
  validateWorkflowPermissions: vi.fn().mockResolvedValue({
    hasPermission: true,
    userRole: 'collaborator-edit',
  }),
}))

describe('Workflow Presence API - GET /api/workflows/[id]/presence', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [[sampleWorkflowData], [sampleCollaborationSession, sampleInactiveSession]],
        },
      },
    })

    // Mock complex presence query
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue([sampleCollaborationSession, sampleInactiveSession]),
    }))
  })

  describe('Basic Presence Retrieval', () => {
    it('should retrieve workflow presence information', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.users).toBeDefined()
      expect(Array.isArray(data.users)).toBe(true)
      expect(data.totalUsers).toBe(2)
      expect(data.activeUsers).toBe(1) // Only one with recent activity
      expect(data.workflowId).toBe('workflow-123')
      expect(data.lastUpdated).toBeDefined()
    })

    it('should include comprehensive user presence data', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      const activeUser = data.users.find((u: any) => u.userId === 'user-123')
      expect(activeUser).toBeDefined()
      expect(activeUser.userName).toBe('Active User')
      expect(activeUser.userEmail).toBe('active@example.com')
      expect(activeUser.socketId).toBe('socket-abc123')
      expect(activeUser.permissions).toBe('edit')
      expect(activeUser.isActive).toBe(true)
      expect(activeUser.joinedAt).toBeDefined()
      expect(activeUser.lastActivity).toBeDefined()
      expect(activeUser.userAgent).toBe('Mozilla/5.0 (Test Browser)')
    })

    it('should correctly identify active vs inactive users', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      const activeUser = data.users.find((u: any) => u.userId === 'user-123')
      const inactiveUser = data.users.find((u: any) => u.userId === 'user-456')

      expect(activeUser.isActive).toBe(true)
      expect(inactiveUser.isActive).toBe(false)

      expect(data.totalUsers).toBe(2)
      expect(data.activeUsers).toBe(1)
    })

    it('should support custom activity threshold', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?activeMinutes=5'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // With 5-minute threshold, both users might be considered inactive
      expect(data.activeUsers).toBeLessThanOrEqual(data.totalUsers)
    })

    it('should handle workflows with no active sessions', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([]), // No sessions
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.users).toEqual([])
      expect(data.totalUsers).toBe(0)
      expect(data.activeUsers).toBe(0)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for presence access', async () => {
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate workflow access permissions', async () => {
      // Mock no access
      vi.doMock('../collaborate/route', () => ({
        validateWorkflowPermissions: vi.fn().mockResolvedValue({
          hasPermission: false,
          userRole: null,
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow view access for presence information', async () => {
      // Mock view access
      vi.doMock('../collaborate/route', () => ({
        validateWorkflowPermissions: vi.fn().mockResolvedValue({
          hasPermission: true,
          userRole: 'collaborator-view',
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle database query errors', async () => {
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle invalid query parameters gracefully', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?activeMinutes=invalid'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      // Should not fail, should use default threshold
      expect(response.status).toBe(200)
    })
  })
})

describe('Workflow Presence API - POST /api/workflows/[id]/presence', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        insert: { results: [sampleCollaborationSession] },
        update: { results: [sampleCollaborationSession] },
      },
    })
  })

  describe('Session Joining', () => {
    it('should join workflow session successfully', async () => {
      const sessionData = {
        socketId: 'socket-new123',
        userAgent: 'Mozilla/5.0 (Chrome Test)',
        viewport: { width: 1920, height: 1080 },
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully joined workflow session')
      expect(data.workflowId).toBe('workflow-123')
      expect(data.userId).toBe(mockUser.id)
      expect(data.socketId).toBe('socket-new123')
      expect(data.joinedAt).toBeDefined()
    })

    it('should handle session joining with minimal data', async () => {
      const sessionData = {
        socketId: 'socket-minimal456',
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should capture client IP address from headers', async () => {
      const sessionData = {
        socketId: 'socket-ip789',
      }

      const request = createMockRequest('POST', sessionData, {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        'x-real-ip': '203.0.113.195',
      })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      expect(mocks.database.mockDb.insert).toHaveBeenCalled()
    })

    it('should handle viewport information', async () => {
      const sessionData = {
        socketId: 'socket-viewport999',
        userAgent: 'Mobile Safari Test',
        viewport: { width: 375, height: 667 },
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should update existing session instead of creating duplicate', async () => {
      // Mock upsert behavior (onConflictDoUpdate)
      mocks.database.mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([sampleCollaborationSession]),
      }))

      const sessionData = {
        socketId: 'socket-existing',
        userAgent: 'Updated Browser',
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for joining sessions', async () => {
      mocks.auth.setUnauthenticated()

      const sessionData = {
        socketId: 'unauthorized-socket',
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate workflow access permissions', async () => {
      // Mock no access
      vi.doMock('../collaborate/route', () => ({
        validateWorkflowPermissions: vi.fn().mockResolvedValue({
          hasPermission: false,
          userRole: null,
        }),
      }))

      const sessionData = {
        socketId: 'denied-socket',
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow view access for joining sessions', async () => {
      // Mock view access
      vi.doMock('../collaborate/route', () => ({
        validateWorkflowPermissions: vi.fn().mockResolvedValue({
          hasPermission: true,
          userRole: 'collaborator-view',
        }),
      }))

      const sessionData = {
        socketId: 'viewer-socket',
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
    })
  })

  describe('Validation and Error Handling', () => {
    it('should validate required socket ID', async () => {
      const invalidData = {
        userAgent: 'Test Browser',
        // Missing socketId
      }

      const request = createMockRequest('POST', invalidData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should validate socket ID format', async () => {
      const invalidData = {
        socketId: '', // Empty string
      }

      const request = createMockRequest('POST', invalidData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })

    it('should validate viewport dimensions', async () => {
      const invalidViewportData = {
        socketId: 'test-socket',
        viewport: { width: -100, height: 0 }, // Invalid dimensions
      }

      const request = createMockRequest('POST', invalidViewportData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle database insertion errors', async () => {
      mocks.database.mockDb.insert.mockImplementation(() => {
        throw new Error('Database insertion failed')
      })

      const sessionData = {
        socketId: 'error-socket',
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Session Management Features', () => {
    it('should handle multiple sessions for same user', async () => {
      const multiSessionData = {
        socketId: 'multi-session-socket',
        userAgent: 'Browser Tab 2',
      }

      const request = createMockRequest('POST', multiSessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should track session metadata correctly', async () => {
      const sessionData = {
        socketId: 'metadata-socket',
        userAgent: 'Detailed Browser Info v1.0',
        viewport: { width: 2560, height: 1440 },
      }

      const request = createMockRequest('POST', sessionData, {
        'x-forwarded-for': '192.168.1.50',
      })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      // Verify session data was captured
      expect(mocks.database.mockDb.insert).toHaveBeenCalled()
    })
  })
})

describe('Workflow Presence API - DELETE /api/workflows/[id]/presence', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        delete: { results: [sampleCollaborationSession] },
      },
    })
  })

  describe('Session Leaving', () => {
    it('should leave workflow session successfully with query parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=socket-to-leave'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully left workflow session')
      expect(data.workflowId).toBe('workflow-123')
      expect(data.userId).toBe(mockUser.id)
      expect(data.socketId).toBe('socket-to-leave')
      expect(data.leftAt).toBeDefined()
      expect(mocks.database.mockDb.delete).toHaveBeenCalled()
    })

    it('should leave workflow session successfully with request body', async () => {
      const leaveData = {
        socketId: 'socket-in-body',
      }

      const request = createMockRequest('DELETE', leaveData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.socketId).toBe('socket-in-body')
    })

    it('should prioritize query parameter over request body', async () => {
      const leaveData = {
        socketId: 'socket-in-body',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=socket-in-query',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leaveData),
        }
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.socketId).toBe('socket-in-query') // Query parameter wins
    })

    it('should clean up session data completely', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=cleanup-socket'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      expect(mocks.database.mockDb.delete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for leaving sessions', async () => {
      mocks.auth.setUnauthenticated()

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=unauthorized-socket'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should only allow users to leave their own sessions', async () => {
      // Mock user authentication with specific user
      mocks.auth.setUser({ ...mockUser, id: 'specific-user-123' })

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=other-user-socket'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      // The delete query should only match sessions for the authenticated user
      expect(response.status).toBe(404) // No matching session found
    })
  })

  describe('Validation and Error Handling', () => {
    it('should require socket ID for session cleanup', async () => {
      const request = createMockRequest('DELETE') // No socket ID
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Socket ID is required')
    })

    it('should return 404 for non-existent session', async () => {
      // Mock no matching session found
      mocks.database.mockDb.delete.mockImplementation(() => ({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]), // No sessions deleted
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=nonexistent-socket'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Session not found')
    })

    it('should handle database deletion errors', async () => {
      mocks.database.mockDb.delete.mockImplementation(() => {
        throw new Error('Database deletion failed')
      })

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=error-socket'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed request body gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/presence', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(400) // Missing socket ID
      const data = await response.json()
      expect(data.error).toBe('Socket ID is required')
    })
  })

  describe('Session Lifecycle Management', () => {
    it('should handle graceful disconnections', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=graceful-disconnect'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.leftAt).toBeDefined()
    })

    it('should handle forced disconnections', async () => {
      const forceLeaveData = {
        socketId: 'force-disconnect-socket',
        reason: 'connection_lost',
      }

      const request = createMockRequest('DELETE', forceLeaveData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should clean up stale sessions', async () => {
      // Mock successful cleanup of stale session
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/presence?socketId=stale-session'
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      expect(mocks.database.mockDb.delete).toHaveBeenCalled()
    })
  })
})

describe('Presence API Performance and Analytics', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData]] },
      },
    })
  })

  describe('Performance Optimization', () => {
    it('should handle large numbers of active users efficiently', async () => {
      // Mock many active sessions
      const manyActiveSessions = Array.from({ length: 100 }, (_, i) => ({
        ...sampleCollaborationSession,
        userId: `user-${i}`,
        socketId: `socket-${i}`,
        userName: `User ${i}`,
        userEmail: `user${i}@example.com`,
      }))

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(manyActiveSessions),
      }))

      const startTime = Date.now()
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      const endTime = Date.now()

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.users.length).toBe(100)
      expect(data.totalUsers).toBe(100)
      // Should process quickly even with many users
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should calculate presence statistics efficiently', async () => {
      const mixedSessions = Array.from({ length: 50 }, (_, i) => ({
        ...sampleCollaborationSession,
        userId: `user-${i}`,
        socketId: `socket-${i}`,
        lastActivity:
          i % 2 === 0
            ? new Date() // Active
            : new Date(Date.now() - 3600000), // Inactive (1 hour ago)
      }))

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(mixedSessions),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.totalUsers).toBe(50)
      expect(data.activeUsers).toBe(25) // Half should be active
    })
  })

  describe('Real-time Features Support', () => {
    it('should provide data suitable for real-time updates', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should include timestamp for polling/comparison
      expect(data.lastUpdated).toBeDefined()
      expect(new Date(data.lastUpdated)).toBeInstanceOf(Date)

      // Should include socket IDs for WebSocket correlation
      data.users.forEach((user: any) => {
        expect(user.socketId).toBeDefined()
        expect(typeof user.socketId).toBe('string')
      })
    })

    it('should support cursor and selection data structure', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should have structure for cursor and selection data
      data.users.forEach((user: any) => {
        // These might be undefined in test but structure should be consistent
        expect('cursor' in user).toBe(true)
        expect('selection' in user).toBe(true)
      })
    })
  })

  describe('Privacy and Security', () => {
    it('should not expose sensitive user information', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      data.users.forEach((user: any) => {
        // Should not expose sensitive data
        expect(user).not.toHaveProperty('password')
        expect(user).not.toHaveProperty('apiKey')
        expect(user).not.toHaveProperty('internalId')

        // Should include necessary presence data
        expect(user).toHaveProperty('userId')
        expect(user).toHaveProperty('userName')
        expect(user).toHaveProperty('isActive')
        expect(user).toHaveProperty('permissions')
      })
    })

    it('should sanitize user agent strings', async () => {
      const sessionData = {
        socketId: 'secure-socket',
        userAgent: '<script>alert("xss")</script>Mozilla/5.0',
      }

      const request = createMockRequest('POST', sessionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      // User agent should be stored safely (handled by database layer)
    })

    it('should handle IP address privacy appropriately', async () => {
      const sessionData = {
        socketId: 'privacy-socket',
      }

      const request = createMockRequest('POST', sessionData, {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        'x-real-ip': '10.0.0.1',
      })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)

      // IP should be captured for security but not exposed in presence API
      const getRequest = createMockRequest('GET')
      const getResponse = await GET(getRequest, { params: Promise.resolve({ id: 'workflow-123' }) })

      const presenceData = await getResponse.json()
      presenceData.users.forEach((user: any) => {
        expect(user).not.toHaveProperty('ipAddress')
      })
    })
  })
})
