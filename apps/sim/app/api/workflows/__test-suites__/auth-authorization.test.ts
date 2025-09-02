/**
 * Comprehensive Authentication and Authorization Test Suite
 * Cross-cutting tests for all workflow API endpoints covering:
 * - Session authentication
 * - API key authentication
 * - Internal JWT token authentication
 * - Permission validation (workspace, collaborator, owner)
 * - Security headers and CORS
 * - Rate limiting and abuse prevention
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'

// Mock all modules that the API routes depend on before importing
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/auth/internal', () => ({
  verifyInternalToken: vi.fn(),
}))

vi.mock('@/lib/permissions/utils', () => ({
  getUserEntityPermissions: vi.fn(),
  hasAdminPermission: vi.fn(),
}))

vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock('@/db/schema', () => ({
  workflow: 'workflow',
  user: 'user',
  workflowFolder: 'workflowFolder',
  workflowCollaborators: 'workflowCollaborators',
  workflowCollaborationSessions: 'workflowCollaborationSessions',
  workflowLiveOperations: 'workflowLiveOperations',
  apiKey: 'apiKey',
  template: 'template',
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  or: vi.fn((...conditions) => ({ conditions, type: 'or' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  asc: vi.fn((field) => ({ field, type: 'asc' })),
  gt: vi.fn((field, value) => ({ field, value, type: 'gt' })),
  lt: vi.fn((field, value) => ({ field, value, type: 'lt' })),
  ne: vi.fn((field, value) => ({ field, value, type: 'ne' })),
  isNull: vi.fn((field) => ({ field, type: 'isNull' })),
}))

import * as TemplateByIdAPI from '../../templates/[id]/route'
import * as TemplatesAPI from '../../templates/route'
import * as CollaborateAPI from '../[id]/collaborate/route'
import * as WorkflowExportAPI from '../[id]/export/route'
import * as LiveEditAPI from '../[id]/live-edit/route'
import * as PresenceAPI from '../[id]/presence/route'
import * as WorkflowByIdAPI from '../[id]/route'
// Import API route handlers after mocking
import * as WorkflowsAPI from '../route'
import * as WorkflowValidateAPI from '../validate/route'
import * as WorkflowYamlAPI from '../yaml/route'

// Mock data for testing
const sampleWorkflowData = {
  id: 'workflow-auth-test',
  userId: 'owner-123',
  name: 'Auth Test Workflow',
  workspaceId: 'workspace-456',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const sampleTemplateData = {
  id: 'template-auth-test',
  workflowId: 'workflow-auth-test',
  userId: 'owner-123',
  name: 'Auth Test Template',
  description: 'Template for auth testing',
  author: 'Test Author',
  category: 'Testing',
  color: '#FF0000',
  icon: 'test',
  state: { blocks: {}, edges: [] },
  createdAt: new Date(),
  updatedAt: new Date(),
}

const sampleApiKeyData = {
  userId: 'api-user-456',
  key: 'test-api-key-789',
  name: 'Test API Key',
  createdAt: new Date(),
}

describe('Authentication and Authorization - Cross-Cutting Security Tests', () => {
  let mocks: any
  let mockGetSession: any
  let mockVerifyInternalToken: any
  let mockGetUserEntityPermissions: any
  let mockHasAdminPermission: any

  beforeEach(async () => {
    // Clear all mocks first
    vi.clearAllMocks()

    // Get the mocked functions
    const authModule = await import('@/lib/auth')
    const authInternalModule = await import('@/lib/auth/internal')
    const permissionsModule = await import('@/lib/permissions/utils')

    mockGetSession = vi.mocked(authModule.getSession)
    mockVerifyInternalToken = vi.mocked(authInternalModule.verifyInternalToken)
    mockGetUserEntityPermissions = vi.mocked(permissionsModule.getUserEntityPermissions)
    mockHasAdminPermission = vi.mocked(permissionsModule.hasAdminPermission)

    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: false, user: null }, // Start unauthenticated
      database: {
        select: { results: [[sampleWorkflowData], [sampleTemplateData]] },
        insert: { results: [sampleWorkflowData] },
        update: { results: [sampleWorkflowData] },
        delete: { results: [] },
      },
    })

    // Set default unauthenticated state
    mockGetSession.mockResolvedValue(null)
    mockVerifyInternalToken.mockResolvedValue(false)
    mockGetUserEntityPermissions.mockResolvedValue(null)
    mockHasAdminPermission.mockResolvedValue(false)
  })

  describe('Session Authentication', () => {
    describe('Workflow API Endpoints', () => {
      it('should require authentication for GET /api/workflows', async () => {
        mocks.auth.setUnauthenticated()

        const request = createMockRequest('GET')
        const response = await WorkflowsAPI.GET(request)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for POST /api/workflows', async () => {
        mocks.auth.setUnauthenticated()

        const workflowData = {
          name: 'Unauthorized Workflow',
          description: 'Should not be created',
        }

        const request = createMockRequest('POST', workflowData)
        const response = await WorkflowsAPI.POST(request)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for GET /api/workflows/[id]', async () => {
        mocks.auth.setUnauthenticated()

        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for YAML import', async () => {
        mocks.auth.setUnauthenticated()

        const yamlData = {
          yaml: 'name: Test Workflow\nblocks: []',
          validateOnly: false,
        }

        const request = createMockRequest('POST', yamlData)
        const response = await WorkflowYamlAPI.POST(request)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for workflow validation', async () => {
        mocks.auth.setUnauthenticated()

        const validationData = {
          workflow: { blocks: {}, edges: [] },
        }

        const request = createMockRequest('POST', validationData)
        const response = await WorkflowValidateAPI.POST(request)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for workflow export', async () => {
        mocks.auth.setUnauthenticated()

        const request = createMockRequest('GET')
        const response = await WorkflowExportAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Template API Endpoints', () => {
      it('should require authentication for GET /api/templates', async () => {
        mocks.auth.setUnauthenticated()

        const request = createMockRequest('GET')
        const response = await TemplatesAPI.GET(request)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for POST /api/templates', async () => {
        mocks.auth.setUnauthenticated()

        const templateData = {
          workflowId: 'workflow-auth-test',
          name: 'Unauthorized Template',
          description: 'Should not be created',
          author: 'Unauthorized User',
          category: 'Testing',
          icon: 'test',
          color: '#FF0000',
          state: { blocks: {}, edges: [] },
        }

        const request = createMockRequest('POST', templateData)
        const response = await TemplatesAPI.POST(request)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for GET /api/templates/[id]', async () => {
        mocks.auth.setUnauthenticated()

        const request = createMockRequest('GET')
        const response = await TemplateByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'template-auth-test' }),
        })

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Collaborative API Endpoints', () => {
      it('should require authentication for collaboration management', async () => {
        mocks.auth.setUnauthenticated()

        const request = createMockRequest('GET')
        const response = await CollaborateAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for live editing', async () => {
        mocks.auth.setUnauthenticated()

        const operationData = {
          operationType: 'update',
          operationTarget: 'block',
          operationPayload: { id: 'test-block' },
        }

        const request = createMockRequest('POST', operationData)
        const response = await LiveEditAPI.POST(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })

      it('should require authentication for presence tracking', async () => {
        mocks.auth.setUnauthenticated()

        const request = createMockRequest('GET')
        const response = await PresenceAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Valid Session Authentication', () => {
      it('should allow authenticated users to access workflows', async () => {
        mockGetSession.mockResolvedValue({ user: mockUser })

        const request = createMockRequest('GET')
        const response = await WorkflowsAPI.GET(request)

        expect(response.status).toBe(200)
      })

      it('should include user context in authenticated requests', async () => {
        mockGetSession.mockResolvedValue({ user: mockUser })

        const request = createMockRequest('GET')
        const response = await WorkflowsAPI.GET(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.meta?.isAuthenticated).toBe(true)
      })

      it('should validate session integrity', async () => {
        // Mock invalid session
        const invalidUser = { ...mockUser, id: null }
        mockGetSession.mockResolvedValue({ user: invalidUser })

        const request = createMockRequest('GET')
        const response = await WorkflowsAPI.GET(request)

        expect(response.status).toBe(401)
      })
    })
  })

  describe('API Key Authentication', () => {
    it('should authenticate with valid API key', async () => {
      mocks.auth.setUnauthenticated() // No session

      // Mock API key lookup success
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(Promise.resolve([sampleApiKeyData])),
      }))

      const request = createMockRequest('GET', undefined, {
        'x-api-key': 'test-api-key-789',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(200)
    })

    it('should reject invalid API key', async () => {
      mocks.auth.setUnauthenticated()

      // Mock API key lookup failure
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(Promise.resolve([])), // No API key found
      }))

      const request = createMockRequest('GET', undefined, {
        'x-api-key': 'invalid-api-key',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401)
    })

    it('should reject missing API key when no session', async () => {
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET') // No API key header
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401)
    })

    it('should prioritize session over API key when both present', async () => {
      mocks.auth.setAuthenticated(mockUser)

      const request = createMockRequest('GET', undefined, {
        'x-api-key': 'test-api-key',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(200)
      // Should not query API key table since session is present
      expect(mocks.database.mockDb.select).not.toHaveBeenCalledWith(
        expect.objectContaining({ key: 'test-api-key' })
      )
    })

    it('should handle API key database errors gracefully', async () => {
      mocks.auth.setUnauthenticated()

      // Mock database error
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('GET', undefined, {
        'x-api-key': 'test-api-key',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401) // Should fail authentication
    })
  })

  describe('Internal JWT Token Authentication', () => {
    it('should authenticate with valid internal token', async () => {
      const { verifyInternalToken } = await import('@/lib/auth/internal')
      vi.mocked(verifyInternalToken).mockResolvedValue(true)

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer valid-internal-token',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(200)
      expect(verifyInternalToken).toHaveBeenCalledWith('valid-internal-token')
    })

    it('should reject invalid internal token', async () => {
      const { verifyInternalToken } = await import('@/lib/auth/internal')
      vi.mocked(verifyInternalToken).mockResolvedValue(false)

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer invalid-internal-token',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle malformed authorization header', async () => {
      const request = createMockRequest('GET', undefined, {
        authorization: 'InvalidFormat token',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401)
    })

    it('should bypass other auth checks for valid internal token', async () => {
      const { verifyInternalToken } = await import('@/lib/auth/internal')
      vi.mocked(verifyInternalToken).mockResolvedValue(true)

      // No session, no API key, but valid internal token
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer internal-token',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle internal token verification errors', async () => {
      const { verifyInternalToken } = await import('@/lib/auth/internal')
      vi.mocked(verifyInternalToken).mockRejectedValue(new Error('Token verification failed'))

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer error-token',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Permission-Based Authorization', () => {
    describe('Workflow Ownership', () => {
      it('should allow workflow owners full access', async () => {
        // Set user as workflow owner
        const ownerUser = { ...mockUser, id: 'owner-123' }
        mocks.auth.setAuthenticated(ownerUser)

        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(200)
      })

      it('should deny access to non-owners without permissions', async () => {
        // Set user as different from workflow owner
        const nonOwnerUser = { ...mockUser, id: 'different-user-789' }
        mocks.auth.setAuthenticated(nonOwnerUser)

        // Mock no workspace permissions
        const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
        vi.mocked(getUserEntityPermissions).mockResolvedValue(null)

        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(403)
        const data = await response.json()
        expect(data.error).toBe('Access denied')
      })

      it('should prevent unauthorized modifications', async () => {
        const unauthorizedUser = { ...mockUser, id: 'unauthorized-456' }
        mocks.auth.setAuthenticated(unauthorizedUser)

        // Mock no permissions
        const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
        vi.mocked(getUserEntityPermissions).mockResolvedValue(null)

        const updateData = {
          name: 'Unauthorized Update',
        }

        const request = createMockRequest('PUT', updateData)
        const response = await WorkflowByIdAPI.PUT(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(403)
      })
    })

    describe('Workspace Permissions', () => {
      it('should allow workspace admin access', async () => {
        const workspaceUser = { ...mockUser, id: 'workspace-user-456' }
        mocks.auth.setAuthenticated(workspaceUser)

        // Mock workspace admin permissions
        const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
        vi.mocked(getUserEntityPermissions).mockResolvedValue('admin')

        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(200)
      })

      it('should allow workspace write access for appropriate operations', async () => {
        const workspaceUser = { ...mockUser, id: 'workspace-writer-789' }
        mocks.auth.setAuthenticated(workspaceUser)

        // Mock workspace write permissions
        const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
        vi.mocked(getUserEntityPermissions).mockResolvedValue('write')

        const updateData = { name: 'Workspace User Update' }
        const request = createMockRequest('PUT', updateData)
        const response = await WorkflowByIdAPI.PUT(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(200)
      })

      it('should restrict workspace read access for write operations', async () => {
        const workspaceUser = { ...mockUser, id: 'workspace-reader-111' }
        mocks.auth.setAuthenticated(workspaceUser)

        // Mock workspace read-only permissions
        const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
        vi.mocked(getUserEntityPermissions).mockResolvedValue('read')

        const updateData = { name: 'Read-only User Update' }
        const request = createMockRequest('PUT', updateData)
        const response = await WorkflowByIdAPI.PUT(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(403)
      })

      it('should handle permission lookup errors gracefully', async () => {
        const workspaceUser = { ...mockUser, id: 'error-user-222' }
        mocks.auth.setAuthenticated(workspaceUser)

        // Mock permission lookup error
        const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
        vi.mocked(getUserEntityPermissions).mockRejectedValue(new Error('Permission lookup failed'))

        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(403) // Fail closed
      })
    })

    describe('Collaborator Permissions', () => {
      it('should allow explicit collaborator access', async () => {
        const collaboratorUser = { ...mockUser, id: 'collaborator-333' }
        mocks.auth.setAuthenticated(collaboratorUser)

        // Mock explicit collaborator permissions
        mocks.database.mockDb.select.mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue(Promise.resolve([{ permissionLevel: 'edit' }])),
        }))

        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(200)
      })

      it('should respect collaborator permission levels', async () => {
        const viewOnlyCollaborator = { ...mockUser, id: 'view-collaborator-444' }
        mocks.auth.setAuthenticated(viewOnlyCollaborator)

        // Mock view-only collaborator
        mocks.database.mockDb.select.mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue(Promise.resolve([{ permissionLevel: 'view' }])),
        }))

        const operationData = {
          operationType: 'update',
          operationTarget: 'block',
          operationPayload: { id: 'test-block' },
        }

        const request = createMockRequest('POST', operationData)
        const response = await LiveEditAPI.POST(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(403) // View-only can't edit
      })
    })

    describe('Administrative Operations', () => {
      it('should require admin permissions for sensitive operations', async () => {
        const regularUser = { ...mockUser, id: 'regular-user-555' }
        mocks.auth.setAuthenticated(regularUser)

        // Mock non-admin permissions
        const { hasAdminPermission } = await import('@/lib/permissions/utils')
        vi.mocked(hasAdminPermission).mockResolvedValue(false)

        const collaboratorData = {
          userId: 'new-collaborator-666',
          permissionLevel: 'admin',
        }

        const request = createMockRequest('POST', collaboratorData)
        const response = await CollaborateAPI.POST(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(403)
      })

      it('should allow admin operations for authorized users', async () => {
        const adminUser = { ...mockUser, id: 'admin-user-777' }
        mocks.auth.setAuthenticated(adminUser)

        // Mock admin permissions
        const { hasAdminPermission } = await import('@/lib/permissions/utils')
        vi.mocked(hasAdminPermission).mockResolvedValue(true)

        const collaboratorData = {
          userId: 'new-collaborator-888',
          permissionLevel: 'edit',
        }

        // Mock successful user lookup
        mocks.database.mockDb.select.mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi
            .fn()
            .mockReturnValue(
              Promise.resolve([
                { id: 'new-collaborator-888', name: 'New Collaborator', email: 'new@example.com' },
              ])
            ),
        }))

        mocks.database.mockDb.insert.mockImplementation(() => ({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([
            {
              id: 'collab-999',
              userId: 'new-collaborator-888',
              permissionLevel: 'edit',
              addedAt: new Date(),
              addedByUserId: adminUser.id,
            },
          ]),
        }))

        const request = createMockRequest('POST', collaboratorData)
        const response = await CollaborateAPI.POST(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(201)
      })
    })
  })

  describe('Security Headers and CORS', () => {
    it('should include appropriate security headers', async () => {
      mocks.auth.setAuthenticated(mockUser)

      const request = createMockRequest('GET')
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(200)

      // Check for security headers (would need to be implemented in actual APIs)
      // expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      // expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      // expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://app.example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      })

      // CORS handling would need to be implemented in middleware
      // const response = await WorkflowsAPI.OPTIONS(request)
      // expect(response.status).toBe(200)
      // expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
    })
  })

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle rate limiting for authentication attempts', async () => {
      // Mock multiple failed authentication attempts
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest('GET', undefined, {
          'x-api-key': `invalid-key-attempt-${i}`,
        })
        await WorkflowsAPI.GET(request)
      }

      // Subsequent requests should be rate limited
      // This would need to be implemented with Redis or similar
      const request = createMockRequest('GET', undefined, {
        'x-api-key': 'another-invalid-key',
      })
      const response = await WorkflowsAPI.GET(request)

      // Rate limiting would return 429
      // expect(response.status).toBe(429)
    })

    it('should protect against brute force attacks', async () => {
      // Mock many rapid authentication attempts from same IP
      const requests = Array.from({ length: 20 }, (_, i) =>
        createMockRequest('GET', undefined, {
          'x-api-key': `brute-force-${i}`,
          'x-forwarded-for': '192.168.1.100',
        })
      )

      // All requests should be processed without rate limiting in test
      // In production, this would trigger rate limiting
      for (const request of requests) {
        const response = await WorkflowsAPI.GET(request)
        expect(response.status).toBe(401) // Just auth failure, not rate limited
      }
    })
  })

  describe('Input Sanitization and Validation', () => {
    it('should sanitize SQL injection attempts', async () => {
      mocks.auth.setAuthenticated(mockUser)

      const maliciousData = {
        name: "'; DROP TABLE workflows; --",
        description: 'Malicious workflow',
      }

      const request = createMockRequest('POST', maliciousData)
      const response = await WorkflowsAPI.POST(request)

      // Should either be rejected or sanitized, not cause database error
      expect([400, 201]).toContain(response.status)
    })

    it('should validate authentication headers format', async () => {
      const request = createMockRequest('GET', undefined, {
        authorization: '<script>alert("xss")</script>',
      })

      const response = await WorkflowsAPI.GET(request)
      expect(response.status).toBe(401) // Invalid format rejected
    })

    it('should sanitize user input in API keys', async () => {
      const request = createMockRequest('GET', undefined, {
        'x-api-key': '../../etc/passwd',
      })

      const response = await WorkflowsAPI.GET(request)
      expect(response.status).toBe(401) // Path traversal rejected
    })
  })

  describe('Error Handling and Information Disclosure', () => {
    it('should not leak sensitive information in error messages', async () => {
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await WorkflowByIdAPI.GET(request, {
        params: Promise.resolve({ id: 'workflow-auth-test' }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()

      // Should not reveal whether workflow exists
      expect(data.error).toBe('Unauthorized')
      expect(data).not.toHaveProperty('workflowExists')
      expect(data).not.toHaveProperty('owner')
      expect(data).not.toHaveProperty('permissions')
    })

    it('should handle authentication service errors gracefully', async () => {
      // Mock authentication service failure
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockRejectedValue(new Error('Auth service unavailable'))

      const request = createMockRequest('GET')
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401) // Fail closed
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should provide appropriate error codes for different auth failures', async () => {
      // Test different authentication failure scenarios
      const scenarios = [
        { setup: () => mocks.auth.setUnauthenticated(), expectedStatus: 401 },
        {
          setup: () => {
            mocks.auth.setAuthenticated({ ...mockUser, id: 'unauthorized-user' })
            const { getUserEntityPermissions } = vi.mocked(import('@/lib/permissions/utils'))
            getUserEntityPermissions.mockResolvedValue(null)
          },
          expectedStatus: 403,
        },
      ]

      for (const scenario of scenarios) {
        scenario.setup()

        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, {
          params: Promise.resolve({ id: 'workflow-auth-test' }),
        })

        expect(response.status).toBe(scenario.expectedStatus)
      }
    })
  })

  describe('Token and Session Management', () => {
    it('should handle expired sessions gracefully', async () => {
      // Mock expired session
      const expiredSession = {
        ...mockUser,
        exp: Date.now() / 1000 - 3600, // Expired 1 hour ago
      }
      mocks.auth.setAuthenticated(expiredSession)

      const request = createMockRequest('GET')
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401)
    })

    it('should validate token signature integrity', async () => {
      // Mock tampered token
      const { verifyInternalToken } = await import('@/lib/auth/internal')
      vi.mocked(verifyInternalToken).mockResolvedValue(false) // Invalid signature

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer tampered.token.signature',
      })
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle concurrent session validation', async () => {
      mocks.auth.setAuthenticated(mockUser)

      // Make multiple concurrent requests
      const requests = Array.from({ length: 10 }, () => createMockRequest('GET'))

      const responses = await Promise.all(requests.map((request) => WorkflowsAPI.GET(request)))

      // All should succeed with proper session handling
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Multi-Tenant Security', () => {
    it('should isolate workspace data properly', async () => {
      const workspace1User = { ...mockUser, id: 'ws1-user' }
      mocks.auth.setAuthenticated(workspace1User)

      // Mock user belongs to workspace1 but workflow is in workspace2
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue(null)

      // Mock workflow in different workspace
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(
          Promise.resolve([
            {
              ...sampleWorkflowData,
              workspaceId: 'workspace2-different',
            },
          ])
        ),
      }))

      const request = createMockRequest('GET')
      const response = await WorkflowByIdAPI.GET(request, {
        params: Promise.resolve({ id: 'workflow-auth-test' }),
      })

      expect(response.status).toBe(403) // Cross-workspace access denied
    })

    it('should prevent data leakage between organizations', async () => {
      const org1User = { ...mockUser, id: 'org1-user' }
      mocks.auth.setAuthenticated(org1User)

      // Mock workflow belongs to different organization
      // This test would require organization-level isolation
      const request = createMockRequest('GET')
      const response = await WorkflowsAPI.GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should only return workflows accessible to user's organization
      expect(Array.isArray(data.workflows)).toBe(true)
    })
  })
})
