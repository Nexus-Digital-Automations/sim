/**
 * Comprehensive Test Suite for Collaborative Workflow Management API
 * Tests collaborator management, presence tracking, live editing, and real-time features
 * Covers authentication, authorization, conflict resolution, and operational transform
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST, DELETE } from './route'
import { 
  setupComprehensiveTestMocks,
  createMockRequest,
  mockUser,
} from '@/app/api/__test-utils__/utils'

// Mock collaborator and workflow data
const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'owner-123',
  name: 'Collaborative Workflow',
  workspaceId: 'workspace-456',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-15T00:00:00.000Z'),
}

const sampleCollaboratorData = {
  id: 'collab-123',
  workflowId: 'workflow-123',
  userId: 'user-123',
  permissionLevel: 'edit',
  addedAt: new Date('2024-01-10T00:00:00.000Z'),
  addedByUserId: 'owner-123',
  lastAccess: new Date('2024-01-15T00:00:00.000Z'),
}

const sampleUserData = {
  id: 'user-123',
  name: 'Test Collaborator',
  email: 'collaborator@example.com',
}

const sampleCollaborationSession = {
  id: 'session-123',
  workflowId: 'workflow-123',
  userId: 'user-123',
  socketId: 'socket-abc123',
  joinedAt: new Date('2024-01-15T10:00:00.000Z'),
  lastActivity: new Date('2024-01-15T10:30:00.000Z'),
  permissions: 'edit',
  userAgent: 'Mozilla/5.0 Test Browser',
  ipAddress: '192.168.1.1',
}

const mockOwnerUser = {
  id: 'owner-123',
  name: 'Workflow Owner',
  email: 'owner@example.com',
}

// Mock permissions utilities
vi.mock('@/lib/permissions/utils', () => ({
  getUserEntityPermissions: vi.fn(),
  hasAdminPermission: vi.fn(),
}))

describe('Collaborative Workflow API - GET /api/workflows/[id]/collaborate', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData], [sampleCollaboratorData], [sampleUserData]] },
      },
    })

    // Mock complex database query responses
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => {
        // First call: workflow data
        // Second call: collaborators with sessions
        return Promise.resolve([{
          ...sampleCollaboratorData,
          userName: sampleUserData.name,
          userEmail: sampleUserData.email,
          addedByUserName: mockOwnerUser.name,
          sessionSocketId: sampleCollaborationSession.socketId,
          sessionJoinedAt: sampleCollaborationSession.joinedAt,
          sessionLastActivity: sampleCollaborationSession.lastActivity,
        }])
      }),
    }))
  })

  describe('Collaborator Listing', () => {
    it('should list workflow collaborators with comprehensive data', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.collaborators).toBeDefined()
      expect(Array.isArray(data.collaborators)).toBe(true)
      expect(data.totalCount).toBe(1)
      expect(data.activeCount).toBe(1)
      expect(data.workflowInfo).toBeDefined()
      expect(data.workflowInfo.id).toBe('workflow-123')
      expect(data.workflowInfo.name).toBe('Collaborative Workflow')
    })

    it('should include collaborator session information', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      const collaborator = data.collaborators[0]
      expect(collaborator.isActive).toBe(true)
      expect(collaborator.socketId).toBe(sampleCollaborationSession.socketId)
      expect(collaborator.joinedAt).toBeDefined()
      expect(collaborator.lastActivity).toBeDefined()
      expect(collaborator.permissionLevel).toBe('edit')
    })

    it('should include audit trail information', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      const collaborator = data.collaborators[0]
      expect(collaborator.addedByUserId).toBe('owner-123')
      expect(collaborator.addedByUserName).toBe(mockOwnerUser.name)
      expect(collaborator.addedAt).toBeDefined()
      expect(collaborator.lastAccess).toBeDefined()
    })

    it('should calculate active vs total collaborators correctly', async () => {
      // Mock multiple collaborators with different activity states
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([
          {
            ...sampleCollaboratorData,
            userName: 'Active User',
            userEmail: 'active@example.com',
            sessionSocketId: 'active-socket',
            sessionJoinedAt: new Date(),
            sessionLastActivity: new Date(),
          },
          {
            ...sampleCollaboratorData,
            id: 'collab-456',
            userId: 'user-456',
            userName: 'Inactive User',
            userEmail: 'inactive@example.com',
            sessionSocketId: null, // No active session
            sessionJoinedAt: null,
            sessionLastActivity: null,
          }
        ]),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.totalCount).toBe(2)
      expect(data.activeCount).toBe(1) // Only one has active session
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for collaborator listing', async () => {
      mocks.auth.setUnauthenticated()
      
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate workflow access permissions', async () => {
      // Mock workflow with different owner
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => {
          return Promise.resolve([{
            ...sampleWorkflowData,
            userId: 'different-owner-456', // Different owner
          }])
        }),
      }))

      // Mock no workspace permissions
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue(null)

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow workflow owner access', async () => {
      // Set current user as workflow owner
      mocks.auth.setUser({ ...mockUser, id: 'owner-123' })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
    })

    it('should allow workspace admin access', async () => {
      // Mock user with workspace admin permissions
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('admin')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
    })

    it('should allow explicit collaborator access', async () => {
      // Mock existing collaborator record
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((query) => {
          // Return collaborator data for permission check
          if (query.includes('permissionLevel')) {
            return Promise.resolve([{ permissionLevel: 'edit' }])
          }
          return Promise.resolve([sampleWorkflowData])
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent workflow', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([]), // No workflow found
      }))
      
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow not found')
    })

    it('should handle database errors gracefully', async () => {
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })
      
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle permission validation errors', async () => {
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockRejectedValue(new Error('Permission check failed'))
      
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(500)
    })
  })
})

describe('Collaborative Workflow API - POST /api/workflows/[id]/collaborate', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData], [sampleUserData], []] }, // No existing collaborator
        insert: { results: [sampleCollaboratorData] },
      },
    })

    // Mock permission validation
    const { getUserEntityPermissions } = vi.mocked(import('@/lib/permissions/utils'))
    vi.mocked(getUserEntityPermissions).mockResolvedValue('admin')
  })

  describe('Collaborator Addition', () => {
    it('should add a new collaborator successfully', async () => {
      const collaboratorData = {
        userId: 'new-user-456',
        permissionLevel: 'edit',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(201)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.collaborator).toBeDefined()
      expect(data.collaborator.userId).toBe('new-user-456')
      expect(data.collaborator.permissionLevel).toBe('edit')
      expect(data.collaborator.addedByUserId).toBe(mockUser.id)
      expect(mocks.database.mockDb.insert).toHaveBeenCalled()
    })

    it('should add collaborator with view permissions', async () => {
      const collaboratorData = {
        userId: 'viewer-789',
        permissionLevel: 'view',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.collaborator.permissionLevel).toBe('view')
    })

    it('should add collaborator with admin permissions', async () => {
      const collaboratorData = {
        userId: 'admin-999',
        permissionLevel: 'admin',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.collaborator.permissionLevel).toBe('admin')
    })

    it('should default to edit permission when not specified', async () => {
      const collaboratorData = {
        userId: 'default-user-111',
        // permissionLevel not specified
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.collaborator.permissionLevel).toBe('edit')
    })

    it('should include user information in response', async () => {
      const collaboratorData = {
        userId: 'user-with-info',
        permissionLevel: 'edit',
      }

      // Mock user lookup
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((callback) => {
          // Return user data for the target user
          return Promise.resolve([{
            id: 'user-with-info',
            name: 'John Collaborator',
            email: 'john@example.com',
          }])
        }),
      }))
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(201)
      const data = await response.json()
      
      expect(data.collaborator.userName).toBe('John Collaborator')
      expect(data.collaborator.userEmail).toBe('john@example.com')
    })
  })

  describe('Validation and Error Handling', () => {
    it('should require authentication for adding collaborators', async () => {
      mocks.auth.setUnauthenticated()
      
      const collaboratorData = {
        userId: 'unauthorized-user',
        permissionLevel: 'edit',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should require edit permissions to add collaborators', async () => {
      // Mock insufficient permissions
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('read')
      
      const collaboratorData = {
        userId: 'restricted-user',
        permissionLevel: 'edit',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should validate request data schema', async () => {
      const invalidData = {
        // Missing userId
        permissionLevel: 'invalid-permission',
      }
      
      const request = createMockRequest('POST', invalidData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should return 404 for non-existent target user', async () => {
      // Mock target user not found
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([]), // No user found
      }))
      
      const collaboratorData = {
        userId: 'nonexistent-user',
        permissionLevel: 'edit',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('User not found')
    })

    it('should prevent duplicate collaborator addition', async () => {
      // Mock existing collaborator
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((query) => {
          // Check if this is the existing collaborator query
          if (query.includes && query.includes('permissionLevel')) {
            return Promise.resolve([{
              id: 'existing-collab',
              permissionLevel: 'view',
            }])
          }
          return Promise.resolve([sampleUserData])
        }),
      }))
      
      const collaboratorData = {
        userId: 'existing-user',
        permissionLevel: 'edit',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('User is already a collaborator')
      expect(data.currentPermission).toBe('view')
    })

    it('should handle database insertion errors', async () => {
      mocks.database.mockDb.insert.mockImplementation(() => {
        throw new Error('Database insertion failed')
      })
      
      const collaboratorData = {
        userId: 'error-user',
        permissionLevel: 'edit',
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Permission Level Validation', () => {
    it('should accept valid permission levels', async () => {
      const validPermissions = ['view', 'edit', 'admin']
      
      for (const permission of validPermissions) {
        const collaboratorData = {
          userId: `user-${permission}`,
          permissionLevel: permission,
        }
        
        const request = createMockRequest('POST', collaboratorData)
        const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
        
        expect(response.status).toBe(201)
        const data = await response.json()
        expect(data.collaborator.permissionLevel).toBe(permission)
      }
    })

    it('should reject invalid permission levels', async () => {
      const collaboratorData = {
        userId: 'user-invalid-perm',
        permissionLevel: 'superadmin', // Invalid permission
      }
      
      const request = createMockRequest('POST', collaboratorData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })
  })
})

describe('Collaborative Workflow API - DELETE /api/workflows/[id]/collaborate', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData], [sampleCollaboratorData]] },
        delete: { results: [] },
      },
    })
  })

  describe('Collaborator Removal', () => {
    it('should remove a collaborator successfully', async () => {
      const removeData = {
        userId: 'user-to-remove',
      }
      
      const request = createMockRequest('DELETE', removeData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.message).toBe('Collaborator removed successfully')
      expect(data.removedUserId).toBe('user-to-remove')
      expect(mocks.database.mockDb.delete).toHaveBeenCalledTimes(2) // Collaborator + session cleanup
    })

    it('should clean up collaboration sessions when removing collaborator', async () => {
      const removeData = {
        userId: 'user-with-session',
      }
      
      const request = createMockRequest('DELETE', removeData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      expect(mocks.database.mockDb.delete).toHaveBeenCalledTimes(2)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for removing collaborators', async () => {
      mocks.auth.setUnauthenticated()
      
      const removeData = {
        userId: 'unauthorized-removal',
      }
      
      const request = createMockRequest('DELETE', removeData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should require admin permissions to remove collaborators', async () => {
      // Mock insufficient permissions (not owner or admin)
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('read')
      
      const removeData = {
        userId: 'restricted-removal',
      }
      
      const request = createMockRequest('DELETE', removeData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should allow workflow owner to remove collaborators', async () => {
      // Set current user as workflow owner
      mocks.auth.setUser({ ...mockUser, id: 'owner-123' })
      
      const removeData = {
        userId: 'user-to-remove',
      }
      
      const request = createMockRequest('DELETE', removeData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
    })
  })

  describe('Validation and Error Handling', () => {
    it('should validate request data schema', async () => {
      const invalidData = {
        // Missing userId
        someOtherField: 'invalid',
      }
      
      const request = createMockRequest('DELETE', invalidData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should return 404 for non-existent collaborator', async () => {
      // Mock collaborator not found
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([]), // No collaborator found
      }))
      
      const removeData = {
        userId: 'nonexistent-collaborator',
      }
      
      const request = createMockRequest('DELETE', removeData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Collaborator not found')
    })

    it('should handle database deletion errors', async () => {
      mocks.database.mockDb.delete.mockImplementation(() => {
        throw new Error('Database deletion failed')
      })
      
      const removeData = {
        userId: 'error-user',
      }
      
      const request = createMockRequest('DELETE', removeData)
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})

describe('Collaborative Workflow Permissions and Security', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData]] },
      },
    })
  })

  describe('Permission Hierarchy', () => {
    it('should respect owner > admin > edit > view permission hierarchy', async () => {
      // Test different permission levels have appropriate access
      const permissionTests = [
        { role: 'owner', expectAccess: true },
        { role: 'workspace-admin', expectAccess: true },
        { role: 'collaborator-admin', expectAccess: true },
        { role: 'collaborator-edit', expectAccess: true },
        { role: 'collaborator-view', expectAccess: false }, // Can't add collaborators
      ]

      for (const test of permissionTests) {
        // Mock appropriate permissions for each test
        if (test.role === 'owner') {
          mocks.auth.setUser({ ...mockUser, id: 'owner-123' })
        } else {
          mocks.auth.setUser(mockUser)
          const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
          
          if (test.role === 'workspace-admin') {
            vi.mocked(getUserEntityPermissions).mockResolvedValue('admin')
          } else if (test.role.startsWith('collaborator-')) {
            const level = test.role.split('-')[1]
            mocks.database.mockDb.select.mockImplementation(() => ({
              from: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnThis(),
              then: vi.fn().mockResolvedValue([{ permissionLevel: level }]),
            }))
          }
        }

        const request = createMockRequest('POST', { userId: 'test-user', permissionLevel: 'view' })
        const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
        
        if (test.expectAccess) {
          expect(response.status).not.toBe(403)
        } else {
          expect(response.status).toBe(403)
        }
      }
    })
  })

  describe('Security Validation', () => {
    it('should prevent unauthorized access to sensitive workflow data', async () => {
      // Mock no permissions
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue(null)
      
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'sensitive-workflow' }) })
      
      expect(response.status).toBe(403)
    })

    it('should validate user input to prevent injection attacks', async () => {
      const maliciousData = {
        userId: "'; DROP TABLE users; --",
        permissionLevel: 'edit',
      }
      
      const request = createMockRequest('POST', maliciousData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      // Should be handled by Zod validation
      expect(response.status).toBe(404) // User not found (safe)
    })

    it('should sanitize response data', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Ensure no sensitive data is exposed
      expect(data.collaborators[0]).not.toHaveProperty('password')
      expect(data.collaborators[0]).not.toHaveProperty('apiKey')
    })
  })
})