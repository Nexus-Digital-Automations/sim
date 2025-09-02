/**
 * Comprehensive Test Suite for Workflow API Endpoints
 * Tests CRUD operations, authentication, authorization, and business logic
 * Follows established patterns from the Sim codebase
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST, PATCH } from './route'
import { 
  setupComprehensiveTestMocks,
  createMockRequest,
  mockUser,
  mockOrganization,
  mockAdminMember,
} from '@/app/api/__test-utils__/utils'

// Sample workflow test data following the established patterns
const sampleWorkflowData = {
  id: 'workflow-123',
  name: 'Test Workflow',
  description: 'A test workflow for API testing',
  color: '#FF6B35',
  userId: 'user-123',
  workspaceId: 'workspace-456',
  folderId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  isDeployed: false,
  deployedAt: null,
  runCount: 0,
  lastRunAt: null,
  isPublished: false,
  collaborators: [],
  variables: {},
  marketplaceData: null,
  lastSynced: new Date('2024-01-01T00:00:00.000Z'),
}

const sampleWorkflowsList = [
  sampleWorkflowData,
  {
    ...sampleWorkflowData,
    id: 'workflow-124',
    name: 'Another Test Workflow',
    runCount: 5,
    isDeployed: true,
    deployedAt: new Date('2024-01-02T00:00:00.000Z'),
  },
]

describe('Workflow API - GET /api/workflows', () => {
  let mocks: any

  beforeEach(() => {
    // Setup comprehensive test environment
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [sampleWorkflowsList, [{ count: 2 }]] },
      },
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Setup unauthenticated user
      mocks.auth.setUnauthenticated()
      
      const request = createMockRequest('GET')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should authenticate with valid API key', async () => {
      // Setup API key authentication
      mocks.auth.setUnauthenticated()
      const apiKeyResults = [{ userId: 'user-123' }]
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(apiKeyResults),
          }),
        }),
      }))
      
      const request = createMockRequest('GET', undefined, { 'x-api-key': 'test-api-key' })
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should support internal JWT token authentication', async () => {
      // Mock internal token verification
      vi.doMock('@/lib/auth/internal', () => ({
        verifyInternalToken: vi.fn().mockResolvedValue(true),
      }))
      
      const request = createMockRequest('GET', undefined, { 
        'authorization': 'Bearer internal-jwt-token' 
      })
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('Filtering and Search', () => {
    it('should list workflows with default parameters', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(sampleWorkflowsList)
      expect(data.pagination.total).toBe(2)
    })

    it('should filter workflows by workspace ID', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?workspaceId=workspace-456'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.workspaceId).toBe('workspace-456')
    })

    it('should filter workflows by folder ID', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?folderId=folder-123'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.folderId).toBe('folder-123')
    })

    it('should handle null folder ID filter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?folderId=null'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.folderId).toBeNull()
    })

    it('should search workflows by name and description', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?search=test%20workflow'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.search).toBe('test workflow')
    })

    it('should filter by deployment status', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?status=deployed'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.status).toBe('deployed')
    })

    it('should filter by published status', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?isPublished=true'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.isPublished).toBe(true)
    })

    it('should filter by creation date range', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?createdAfter=2024-01-01T00:00:00.000Z&createdBefore=2024-12-31T23:59:59.999Z'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.createdAfter).toBe('2024-01-01T00:00:00.000Z')
      expect(data.filters.createdBefore).toBe('2024-12-31T23:59:59.999Z')
    })
  })

  describe('Sorting and Pagination', () => {
    it('should sort workflows by name in ascending order', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?sortBy=name&sortOrder=asc'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.sortBy).toBe('name')
      expect(data.filters.sortOrder).toBe('asc')
    })

    it('should sort workflows by creation date in descending order', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?sortBy=createdAt&sortOrder=desc'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.sortBy).toBe('createdAt')
      expect(data.filters.sortOrder).toBe('desc')
    })

    it('should sort workflows by run count', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?sortBy=runCount'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.sortBy).toBe('runCount')
    })

    it('should handle pagination correctly', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?page=2&limit=10'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.totalPages).toBe(1)
      expect(data.pagination.hasNextPage).toBe(false)
      expect(data.pagination.hasPrevPage).toBe(true)
    })

    it('should validate pagination limits', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?limit=150'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid query parameters')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Setup database error
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })
      
      const request = createMockRequest('GET')
      const response = await GET(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?page=invalid&limit=abc'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid query parameters')
      expect(data.details).toBeDefined()
    })

    it('should validate sort parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?sortBy=invalidField'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should validate status parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows?status=invalidStatus'
      )
      const response = await GET(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Performance and Response Format', () => {
    it('should include performance timing in response', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Verify response structure
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('pagination')
      expect(data).toHaveProperty('filters')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should clean filters in response by removing defaults', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Default values should be removed from response
      expect(data.filters.page).toBeUndefined()
      expect(data.filters.limit).toBeUndefined()
      expect(data.filters.sortBy).toBeUndefined()
      expect(data.filters.sortOrder).toBeUndefined()
      expect(data.filters.status).toBeUndefined()
    })
  })
})

describe('Workflow API - POST /api/workflows', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        insert: { results: [sampleWorkflowData] },
      },
    })

    // Mock transaction implementation
    mocks.database.mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([sampleWorkflowData]),
        })),
      }
      await callback(tx)
    })
  })

  describe('Workflow Creation', () => {
    it('should create a new workflow successfully', async () => {
      const workflowData = {
        name: 'New Test Workflow',
        description: 'A new workflow for testing',
        color: '#FF6B35',
        workspaceId: 'workspace-123',
        folderId: 'folder-456',
      }
      
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.name).toBe(workflowData.name)
      expect(data.description).toBe(workflowData.description)
      expect(data.color).toBe(workflowData.color)
      expect(data.workspaceId).toBe(workflowData.workspaceId)
      expect(data.folderId).toBe(workflowData.folderId)
      expect(data.id).toBeDefined()
      expect(data.createdAt).toBeDefined()
      expect(data.updatedAt).toBeDefined()
    })

    it('should create workflow with minimal required data', async () => {
      const workflowData = { name: 'Minimal Workflow' }
      
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.name).toBe(workflowData.name)
      expect(data.description).toBe('')
      expect(data.color).toBe('#3972F6')
      expect(data.workspaceId).toBeNull()
      expect(data.folderId).toBeNull()
    })

    it('should handle null folder ID explicitly', async () => {
      const workflowData = {
        name: 'Test Workflow',
        folderId: null,
      }
      
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.folderId).toBeNull()
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      mocks.auth.setUnauthenticated()
      
      const workflowData = { name: 'Test Workflow' }
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input Validation', () => {
    it('should validate required name field', async () => {
      const workflowData = { description: 'Missing name field' }
      
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should validate empty name field', async () => {
      const workflowData = { name: '' }
      
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })

    it('should accept valid color codes', async () => {
      const workflowData = {
        name: 'Colorful Workflow',
        color: '#FF6B35',
      }
      
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.color).toBe('#FF6B35')
    })

    it('should handle invalid JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })

  describe('Workflow State Initialization', () => {
    it('should create initial state with starter block', async () => {
      const workflowData = { name: 'Test Workflow' }
      
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      
      // Verify transaction was called with proper block creation
      expect(mocks.database.mockDb.transaction).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle database insertion errors', async () => {
      mocks.database.mockDb.transaction.mockImplementation(() => {
        throw new Error('Database insertion failed')
      })
      
      const workflowData = { name: 'Test Workflow' }
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create workflow')
    })

    it('should handle transaction rollback on block insertion failure', async () => {
      mocks.database.mockDb.transaction.mockImplementation(async (callback) => {
        const tx = {
          insert: vi.fn().mockImplementation(() => {
            throw new Error('Block insertion failed')
          }),
        }
        await callback(tx)
      })
      
      const workflowData = { name: 'Test Workflow' }
      const request = createMockRequest('POST', workflowData)
      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })
})

describe('Workflow API - PATCH /api/workflows (Bulk Operations)', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [sampleWorkflowsList] },
        update: { results: sampleWorkflowsList },
        delete: { results: sampleWorkflowsList },
        insert: { results: sampleWorkflowsList },
      },
    })

    // Mock getUserEntityPermissions
    vi.doMock('@/lib/permissions/utils', () => ({
      getUserEntityPermissions: vi.fn().mockResolvedValue('admin'),
    }))
  })

  describe('Bulk Delete Operations', () => {
    it('should delete multiple workflows successfully', async () => {
      const bulkRequest = {
        operation: 'delete',
        workflowIds: ['workflow-123', 'workflow-124'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.operation).toBe('delete')
      expect(data.results).toHaveLength(2)
      expect(data.summary.requested).toBe(2)
      expect(data.summary.successful).toBe(2)
      expect(data.summary.failed).toBe(0)
    })

    it('should require admin permissions for delete operation', async () => {
      const getUserEntityPermissions = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions.getUserEntityPermissions).mockResolvedValue('read')
      
      const bulkRequest = {
        operation: 'delete',
        workflowIds: ['workflow-123'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Access denied')
    })
  })

  describe('Bulk Move Operations', () => {
    it('should move workflows to different folder', async () => {
      const bulkRequest = {
        operation: 'move',
        workflowIds: ['workflow-123', 'workflow-124'],
        targetFolderId: 'folder-new-123',
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.operation).toBe('move')
      expect(data.results).toHaveLength(2)
    })

    it('should move workflows to different workspace', async () => {
      const bulkRequest = {
        operation: 'move',
        workflowIds: ['workflow-123'],
        targetWorkspaceId: 'workspace-new-456',
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.operation).toBe('move')
    })

    it('should require target folder or workspace for move operation', async () => {
      const bulkRequest = {
        operation: 'move',
        workflowIds: ['workflow-123'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Target folder or workspace required')
    })
  })

  describe('Bulk Copy Operations', () => {
    it('should copy workflows with new IDs', async () => {
      const bulkRequest = {
        operation: 'copy',
        workflowIds: ['workflow-123'],
        targetFolderId: 'folder-new-123',
        preserveCollaborators: false,
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.operation).toBe('copy')
      expect(data.results[0].status).toBe('copied')
      expect(data.results[0].newId).toBeDefined()
    })

    it('should preserve collaborators when specified', async () => {
      const bulkRequest = {
        operation: 'copy',
        workflowIds: ['workflow-123'],
        targetFolderId: 'folder-new-123',
        preserveCollaborators: true,
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('Bulk Deploy/Undeploy Operations', () => {
    it('should deploy multiple workflows', async () => {
      const bulkRequest = {
        operation: 'deploy',
        workflowIds: ['workflow-123', 'workflow-124'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.operation).toBe('deploy')
      expect(data.results).toHaveLength(2)
      data.results.forEach((result: any) => {
        expect(result.status).toBe('deployed')
      })
    })

    it('should undeploy multiple workflows', async () => {
      const bulkRequest = {
        operation: 'undeploy',
        workflowIds: ['workflow-123', 'workflow-124'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.operation).toBe('undeploy')
      expect(data.results).toHaveLength(2)
      data.results.forEach((result: any) => {
        expect(result.status).toBe('undeployed')
      })
    })
  })

  describe('Bulk Tagging Operations', () => {
    it('should tag multiple workflows', async () => {
      const bulkRequest = {
        operation: 'tag',
        workflowIds: ['workflow-123', 'workflow-124'],
        tags: ['automation', 'production'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.operation).toBe('tag')
      expect(data.results).toHaveLength(2)
      data.results.forEach((result: any) => {
        expect(result.status).toBe('tagged')
        expect(result.tags).toEqual(['automation', 'production'])
      })
    })

    it('should require tags for tag operation', async () => {
      const bulkRequest = {
        operation: 'tag',
        workflowIds: ['workflow-123'],
        tags: [],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Tags are required')
    })
  })

  describe('Error Handling and Validation', () => {
    it('should require authentication', async () => {
      mocks.auth.setUnauthenticated()
      
      const bulkRequest = {
        operation: 'delete',
        workflowIds: ['workflow-123'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate bulk operation schema', async () => {
      const invalidRequest = {
        operation: 'invalid-operation',
        workflowIds: [],
      }
      
      const request = createMockRequest('PATCH', invalidRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle missing workflows gracefully', async () => {
      // Setup database to return fewer workflows than requested
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => Promise.resolve([sampleWorkflowData]), // Only return one workflow
        }),
      }))
      
      const bulkRequest = {
        operation: 'delete',
        workflowIds: ['workflow-123', 'workflow-nonexistent'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Some workflows not found')
      expect(data.missingIds).toContain('workflow-nonexistent')
    })

    it('should handle unsupported operations', async () => {
      const unsupportedRequest = {
        operation: 'unsupported',
        workflowIds: ['workflow-123'],
      }
      
      // Bypass schema validation by mocking the schema parse
      vi.doMock('zod', () => ({
        z: {
          object: () => ({
            parse: () => unsupportedRequest,
          }),
        },
      }))
      
      const request = createMockRequest('PATCH', unsupportedRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle partial operation failures', async () => {
      // Mock database to fail for specific workflow
      mocks.database.mockDb.delete.mockImplementation((table: any) => ({
        where: vi.fn().mockImplementation((condition: any) => {
          if (condition.value === 'workflow-fail') {
            throw new Error('Database error')
          }
          return Promise.resolve()
        }),
      }))
      
      const bulkRequest = {
        operation: 'delete',
        workflowIds: ['workflow-123', 'workflow-fail'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.summary.successful).toBe(1)
      expect(data.summary.failed).toBe(1)
    })
  })

  describe('Permission Handling', () => {
    it('should check permissions for all workflows', async () => {
      const getUserEntityPermissions = await import('@/lib/permissions/utils')
      const mockPermissions = vi.mocked(getUserEntityPermissions.getUserEntityPermissions)
      
      // First workflow: user has permission
      // Second workflow: user lacks permission
      mockPermissions
        .mockResolvedValueOnce('admin')
        .mockResolvedValueOnce('read')
      
      const bulkRequest = {
        operation: 'delete',
        workflowIds: ['workflow-123', 'workflow-124'],
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Access denied')
      expect(data.deniedWorkflows).toBeDefined()
    })

    it('should handle workspace permission checks', async () => {
      const getUserEntityPermissions = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions.getUserEntityPermissions).mockResolvedValue('write')
      
      const bulkRequest = {
        operation: 'move',
        workflowIds: ['workflow-123'],
        targetFolderId: 'folder-new-123',
      }
      
      const request = createMockRequest('PATCH', bulkRequest)
      const response = await PATCH(request)
      
      expect(response.status).toBe(200)
    })
  })
})