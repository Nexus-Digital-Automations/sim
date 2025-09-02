/**
 * Comprehensive Test Suite for Workflow Versions API - Bun/Vitest Compatible
 * Tests versioning functionality, history management, and comprehensive version operations
 * Covers authentication, authorization, filtering, sorting, and version creation
 *
 * This test suite uses the new module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'

// Module-level mocks - Required for bun/vitest compatibility
const mockVersionManager = {
  getVersions: vi.fn(),
  createVersion: vi.fn(),
}

// Mock WorkflowVersionManager at module level
vi.mock('@/lib/workflows/versioning', () => ({
  WorkflowVersionManager: vi.fn().mockImplementation(() => mockVersionManager),
  CreateVersionSchema: {
    parse: vi.fn().mockImplementation((data) => data),
  },
}))

// Mock workflow database helpers at module level
vi.mock('@/lib/workflows/db-helpers', () => ({
  loadWorkflowFromNormalizedTables: vi.fn(),
}))

// Mock permissions utils at module level
vi.mock('@/lib/permissions/utils', () => ({
  getUserEntityPermissions: vi.fn(),
}))

// Mock internal auth at module level
vi.mock('@/lib/auth/internal', () => ({
  verifyInternalToken: vi.fn(),
}))

// Mock workflow data
const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'user-123',
  name: 'Versioned Workflow',
  workspaceId: 'workspace-456',
}

const sampleWorkflowState = {
  blocks: [
    {
      id: 'block-1',
      type: 'starter',
      position: { x: 100, y: 100 },
      config: { params: {} },
    },
    {
      id: 'block-2',
      type: 'agent',
      position: { x: 400, y: 100 },
      config: { params: { model: 'gpt-4o' } },
    },
  ],
  edges: [{ id: 'edge-1', source: 'block-1', target: 'block-2' }],
  loops: {},
  parallels: {},
}

// Mock version data
const sampleVersions = [
  {
    id: 'version-1',
    workflowId: 'workflow-123',
    versionNumber: '1.2.3',
    versionType: 'manual',
    description: 'Major feature release',
    branchName: 'main',
    stateSize: 2048,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    createdBy: 'user-123',
    isCurrent: true,
    isDeployed: true,
    changeSummary: {
      'blocks.added': 1,
      'blocks.modified': 2,
      'edges.added': 1,
    },
    workflowState: sampleWorkflowState,
    serializationTimeMs: 45,
    creationDurationMs: 120,
  },
  {
    id: 'version-2',
    workflowId: 'workflow-123',
    versionNumber: '1.2.2',
    versionType: 'auto',
    description: 'Automatic version',
    branchName: 'main',
    stateSize: 1856,
    createdAt: new Date('2024-01-14T15:30:00.000Z'),
    createdBy: 'user-123',
    isCurrent: false,
    isDeployed: false,
    changeSummary: {
      'blocks.modified': 1,
    },
    workflowState: {
      ...sampleWorkflowState,
      blocks: [sampleWorkflowState.blocks[0]], // Fewer blocks
    },
    serializationTimeMs: 32,
    creationDurationMs: 98,
  },
  {
    id: 'version-3',
    workflowId: 'workflow-123',
    versionNumber: '1.2.1',
    versionType: 'checkpoint',
    description: 'Pre-deployment checkpoint',
    branchName: 'main',
    stateSize: 1792,
    createdAt: new Date('2024-01-13T09:45:00.000Z'),
    createdBy: 'user-123',
    isCurrent: false,
    isDeployed: false,
    changeSummary: {
      'blocks.added': 1,
    },
    workflowState: sampleWorkflowState,
    serializationTimeMs: 28,
    creationDurationMs: 85,
  },
]

describe('Workflow Versions API - GET /api/workflows/[id]/versions', () => {
  let mocks: any
  let GET: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    // Setup comprehensive test infrastructure with proper database setup
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleWorkflowData], // Workflow lookup for authenticated user
          ],
        },
      },
    })

    // Configure default database behavior for the standard workflow lookup
    // This ensures consistent behavior across all tests where authentication should succeed
    // The route uses .then((rows) => rows[0]) pattern so we need to mock this properly
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([sampleWorkflowData]),
          then: (callback: any) => {
            console.log('[MOCK] GET Database .then() called with workflow data')
            return callback([sampleWorkflowData])
          },
        }),
      }),
    }))

    // Configure version manager mock behavior
    mockVersionManager.getVersions.mockResolvedValue({
      versions: sampleVersions,
      total: sampleVersions.length,
    })

    // Configure permissions to allow read by default for workspace workflows
    const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
    vi.mocked(getUserEntityPermissions).mockResolvedValue('read')

    // Configure workflow state loader to return sample state by default
    const { loadWorkflowFromNormalizedTables } = await import('@/lib/workflows/db-helpers')
    vi.mocked(loadWorkflowFromNormalizedTables).mockResolvedValue(sampleWorkflowState)

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST

    console.log('[SETUP] Test infrastructure initialized with authenticated user')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for version listing', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for version listing')

      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should authenticate with API key', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing API key authentication')

      mocks.auth.setUnauthenticated()

      // Configure database to return API key results then workflow data
      // Need to handle both the API key lookup and workflow lookup
      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: (table: any) => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              const tableName = String(table)

              // First call: API key lookup returns user
              if (tableName.includes('apiKey') || tableName.includes('api_key')) {
                console.log('[TEST] API key lookup - returning user')
                return Promise.resolve([{ userId: 'user-123' }])
              }

              // Second call: workflow lookup returns workflow
              console.log('[TEST] Workflow lookup - returning workflow')
              return Promise.resolve([sampleWorkflowData])
            },
            then: (callback: any) => {
              selectCallCount++
              const isApiKeyCall = selectCallCount === 1

              if (isApiKeyCall) {
                console.log('[TEST] API key .then() - returning user')
                return callback([{ userId: 'user-123' }])
              }
              console.log('[TEST] Workflow .then() - returning workflow')
              return callback([sampleWorkflowData])
            },
          }),
        }),
      }))

      const request = createMockRequest('GET', undefined, { 'x-api-key': 'test-api-key' })
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] API key auth response status: ${response.status}`)
      expect(response.status).toBe(200)
    })

    it('should support internal JWT token authentication', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing internal JWT token authentication')

      // Configure internal token verification to succeed
      const { verifyInternalToken } = await import('@/lib/auth/internal')
      vi.mocked(verifyInternalToken).mockResolvedValue(true)

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] JWT auth response status: ${response.status}`)
      expect(response.status).toBe(200)
    })

    it('should check workflow access permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow access permissions')

      const differentUserWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
        workspaceId: null,
      }

      // Configure database to return different user's workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([differentUserWorkflow]),
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Access denied response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow workspace members to access versions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workspace member access')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
        workspaceId: 'workspace-123',
      }

      // Configure database to return workspace workflow with .then() support
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] Workspace workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to allow read access for workspace
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('read')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Workspace access response status: ${response.status}`)
      expect(response.status).toBe(200)
    })
  })

  describe('Basic Version Listing', () => {
    it('should list workflow versions with default parameters', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.data.versions).toHaveLength(3)
      expect(data.data.versions[0].versionNumber).toBe('1.2.3')
      expect(data.data.versions[0].isCurrent).toBe(true)
      expect(data.data.pagination.total).toBe(3)
      expect(data.data.pagination.limit).toBe(50)
      expect(data.data.pagination.currentPage).toBe(1)
      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.workflowId).toBe('workflow-123')
      expect(data.meta.processingTimeMs).toBeDefined()
    })

    it('should return empty list for workflow with no versions', async () => {
      mockVersionManager.getVersions.mockResolvedValue({
        versions: [],
        total: 0,
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.versions).toHaveLength(0)
      expect(data.data.pagination.total).toBe(0)
    })
  })

  describe('Filtering Options', () => {
    it('should filter versions by type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?type=manual'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.filters.type).toBe('manual')

      expect(mockVersionManager.getVersions).toHaveBeenCalledWith(
        'workflow-123',
        expect.objectContaining({
          versionType: 'manual',
        })
      )
    })

    it('should filter versions by branch', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?branch=development'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.filters.branch).toBe('development')

      expect(mockVersionManager.getVersions).toHaveBeenCalledWith(
        'workflow-123',
        expect.objectContaining({
          branchName: 'development',
        })
      )
    })

    it('should filter versions by deployment status', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?deployed=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.filters.deployed).toBe(true)
    })

    it('should filter to show only current version', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?current=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.filters.current).toBe(true)
      // Should only return current version
      expect(data.data.versions.every((v: any) => v.isCurrent)).toBe(true)
    })

    it('should filter versions by tag', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?tag=stable'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.filters.tag).toBe('stable')
    })
  })

  describe('Sorting Options', () => {
    it('should sort versions by creation date', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?sort=created&order=asc'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.sorting.sort).toBe('created')
      expect(data.data.sorting.order).toBe('asc')
    })

    it('should sort versions by size', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?sort=size&order=desc'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.sorting.sort).toBe('size')
      expect(data.data.sorting.order).toBe('desc')
    })

    it('should use default version sorting', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?sort=version'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.sorting.sort).toBe('version')
    })
  })

  describe('Pagination', () => {
    it('should handle pagination with limit and offset', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?limit=2&offset=1'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.pagination.limit).toBe(2)
      expect(data.data.pagination.currentPage).toBe(2) // offset 1 with limit 2 = page 2
      expect(data.data.pagination.hasPreviousPage).toBe(true)

      expect(mockVersionManager.getVersions).toHaveBeenCalledWith(
        'workflow-123',
        expect.objectContaining({
          limit: 2,
          offset: 1,
        })
      )
    })

    it('should handle pagination with page number', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?page=3&limit=5'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.pagination.currentPage).toBe(3)
      expect(data.data.pagination.limit).toBe(5)

      expect(mockVersionManager.getVersions).toHaveBeenCalledWith(
        'workflow-123',
        expect.objectContaining({
          limit: 5,
          offset: 10, // (page 3 - 1) * limit 5 = 10
        })
      )
    })

    it('should enforce maximum limit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?limit=200'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.pagination.limit).toBe(100) // Maximum enforced

      expect(mockVersionManager.getVersions).toHaveBeenCalledWith(
        'workflow-123',
        expect.objectContaining({
          limit: 100,
        })
      )
    })

    it('should calculate pagination metadata correctly', async () => {
      mockVersionManager.getVersions.mockResolvedValue({
        versions: sampleVersions,
        total: 25,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?limit=10&page=2'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.pagination.total).toBe(25)
      expect(data.data.pagination.totalPages).toBe(3)
      expect(data.data.pagination.currentPage).toBe(2)
      expect(data.data.pagination.hasNextPage).toBe(true)
      expect(data.data.pagination.hasPreviousPage).toBe(true)
    })
  })

  describe('Data Inclusion Options', () => {
    it('should include workflow state when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?includeState=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // State should be included
      expect(data.data.versions[0].workflowState).toBeDefined()
      expect(data.data.versions[0].workflowState.blocks).toBeDefined()
    })

    it('should exclude workflow state by default', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?includeState=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // State should be excluded
      expect(data.data.versions[0].workflowState).toBeUndefined()
    })

    it('should include changes when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?includeChanges=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Changes should be included (placeholder implementation)
      expect(data.data.versions[0].changes).toBeDefined()
    })

    it('should include tags when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?includeTags=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Tags should be included (placeholder implementation)
      expect(data.data.versions[0].tags).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/versions?limit=abc&page=xyz&sort=invalid'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid query parameters')
      expect(data.details).toBeDefined()
      expect(data.requestId).toBeDefined()
    })

    it('should handle version manager errors gracefully', async () => {
      mockVersionManager.getVersions.mockRejectedValue(new Error('Version manager failed'))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to list workflow versions')
      expect(data.requestId).toBeDefined()
    })

    it('should handle authentication errors', async () => {
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })
  })

  describe('Response Format', () => {
    it('should include comprehensive metadata in response', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Check response structure
      expect(data.data).toBeDefined()
      expect(data.data.versions).toBeDefined()
      expect(data.data.pagination).toBeDefined()
      expect(data.data.filters).toBeDefined()
      expect(data.data.sorting).toBeDefined()
      expect(data.meta).toBeDefined()
      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.workflowId).toBe('workflow-123')
      expect(data.meta.timestamp).toBeDefined()
      expect(data.meta.processingTimeMs).toBeDefined()
    })
  })
})

describe('Workflow Versions API - POST /api/workflows/[id]/versions', () => {
  let mocks: any
  let GET: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    // Setup comprehensive test infrastructure with proper database setup
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleWorkflowData], // Workflow lookup for authenticated user
          ],
        },
      },
    })

    // Configure default database behavior for the standard workflow lookup
    // This ensures consistent behavior across all tests where authentication should succeed
    // The route uses .then((rows) => rows[0]) pattern so we need to mock this properly
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([sampleWorkflowData]),
          then: (callback: any) => {
            console.log('[MOCK] POST Database .then() called with workflow data')
            return callback([sampleWorkflowData])
          },
        }),
      }),
    }))

    // Configure permissions to allow write by default for POST operations
    const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
    vi.mocked(getUserEntityPermissions).mockResolvedValue('write')

    // Configure database helper to return sample workflow state
    const { loadWorkflowFromNormalizedTables } = await import('@/lib/workflows/db-helpers')
    vi.mocked(loadWorkflowFromNormalizedTables).mockResolvedValue(sampleWorkflowState)

    // Configure version manager to return created version
    mockVersionManager.createVersion.mockResolvedValue(sampleVersions[0])

    // Configure CreateVersionSchema to parse normally by default
    const { CreateVersionSchema } = await import('@/lib/workflows/versioning')
    vi.mocked(CreateVersionSchema.parse).mockImplementation((data) => data)

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST

    console.log(
      '[SETUP] POST test infrastructure initialized with authenticated user and write permissions'
    )
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Version Creation', () => {
    it('should create a new workflow version successfully', async () => {
      const versionData = {
        versionType: 'manual',
        description: 'New feature release',
        incrementType: 'minor',
        versionTag: 'stable',
        branchName: 'main',
      }

      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(201)
      const data = await response.json()

      expect(data.data.version).toBeDefined()
      expect(data.data.version.versionNumber).toBe('1.2.3')
      expect(data.data.version.versionType).toBe('manual')
      expect(data.data.summary).toBeDefined()
      expect(data.data.summary.versionNumber).toBe('1.2.3')
      expect(data.data.summary.stateSize).toBe(2048)
      expect(data.data.summary.changeCount).toBe(3)
      expect(data.data.workflow.totalVersions).toBeDefined()
      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.workflowId).toBe('workflow-123')
      expect(data.meta.createdBy).toBe('user-123')
      expect(data.meta.processingTimeMs).toBeDefined()

      expect(mockVersionManager.createVersion).toHaveBeenCalledWith(
        'workflow-123',
        sampleWorkflowState,
        versionData,
        'user-123',
        expect.any(String), // userAgent
        expect.any(String) // ipAddress
      )
    })

    it('should create version with minimal required data', async () => {
      // Configure version manager to return auto type version for this test
      const autoVersion = { ...sampleVersions[0], versionType: 'auto' }
      mockVersionManager.createVersion.mockResolvedValueOnce(autoVersion)

      const versionData = {
        versionType: 'auto',
      }

      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.data.version.versionType).toBe('auto')
    })

    it('should extract request context for auditing', async () => {
      const versionData = { versionType: 'manual' }

      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TestBrowser/1.0',
          'X-Forwarded-For': '192.168.1.100, 10.0.0.1',
          'X-Real-IP': '192.168.1.100',
        },
        body: JSON.stringify(versionData),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(201)

      expect(mockVersionManager.createVersion).toHaveBeenCalledWith(
        'workflow-123',
        sampleWorkflowState,
        versionData,
        'user-123',
        'TestBrowser/1.0',
        '192.168.1.100' // First IP from X-Forwarded-For
      )
    })

    it('should create different version types', async () => {
      const versionTypes = ['auto', 'manual', 'checkpoint', 'branch']

      for (const versionType of versionTypes) {
        // Configure version manager to return the correct type for each iteration
        const typedVersion = { ...sampleVersions[0], versionType }
        mockVersionManager.createVersion.mockResolvedValueOnce(typedVersion)

        const versionData = { versionType }

        const request = createMockRequest('POST', versionData)
        const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

        expect(response.status).toBe(201)
        const data = await response.json()
        expect(data.data.version.versionType).toBe(versionType)
      }
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for version creation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for version creation')

      mocks.auth.setUnauthenticated()

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Unauthenticated POST response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should require write permissions for version creation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing write permissions requirement')

      const readOnlyWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
        workspaceId: 'workspace-123',
      }

      // Configure database to return read-only workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([readOnlyWorkflow]),
          }),
        }),
      }))

      // Configure permissions to return read-only access
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('read')

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Read-only access POST response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow users with write permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing write permissions access')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
        workspaceId: 'workspace-123',
      }

      // Configure database to return workspace workflow with .then() support
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] POST Workspace workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to return write access
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('write')

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Write access POST response status: ${response.status}`)
      expect(response.status).toBe(201)
    })

    it('should allow workflow owners to create versions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow owner version creation')

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Owner version creation response status: ${response.status}`)
      expect(response.status).toBe(201)
    })
  })

  describe('Workflow State Validation', () => {
    it('should return 404 when workflow state not found', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow state not found scenario')

      // Configure workflow state loader to return null
      const { loadWorkflowFromNormalizedTables } = await import('@/lib/workflows/db-helpers')
      vi.mocked(loadWorkflowFromNormalizedTables).mockResolvedValue(null)

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] State not found response status: ${response.status}`)
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow state not found')
      expect(data.requestId).toBeDefined()
    })

    it('should handle workflow state loading errors', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow state loading errors')

      // Configure workflow state loader to throw error
      const { loadWorkflowFromNormalizedTables } = await import('@/lib/workflows/db-helpers')
      vi.mocked(loadWorkflowFromNormalizedTables).mockRejectedValue(
        new Error('State loading failed')
      )

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] State loading error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create workflow version')
      expect(data.requestId).toBeDefined()
    })
  })

  describe('Input Validation', () => {
    it('should validate version creation data', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing version creation data validation')

      // Configure CreateVersionSchema to throw validation error for this specific test
      const { CreateVersionSchema } = await import('@/lib/workflows/versioning')

      // Create a proper ZodError-like object
      const zodError = new Error('Validation failed')
      zodError.name = 'ZodError'
      ;(zodError as any).errors = [{ path: ['versionType'], message: 'Invalid version type' }]

      // Use mockImplementationOnce to only affect this test
      vi.mocked(CreateVersionSchema.parse).mockImplementationOnce(() => {
        throw zodError
      })

      const invalidData = { versionType: 'invalid-type' }
      const request = createMockRequest('POST', invalidData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Validation error response status: ${response.status}`)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
      expect(data.requestId).toBeDefined()

      // Reset the mock to normal behavior for other tests
      vi.mocked(CreateVersionSchema.parse).mockImplementation((data) => data)
    })

    it('should handle malformed JSON requests', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing malformed JSON request handling')

      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Malformed JSON response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create workflow version')
      expect(data.requestId).toBeDefined()
    })
  })

  describe('Version Creation Business Logic', () => {
    it('should handle "no changes detected" scenario', async () => {
      mockVersionManager.createVersion.mockRejectedValue(new Error('No changes detected'))

      const versionData = { versionType: 'auto' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('No changes detected')
      expect(data.message).toBe('Cannot create version with no changes from current state')
      expect(data.requestId).toBeDefined()
    })

    it('should handle version creation with comprehensive metadata', async () => {
      const versionWithMetadata = {
        ...sampleVersions[0],
        description: 'Comprehensive version',
        versionTag: 'release-candidate',
        branchName: 'release/v2.0',
      }

      mockVersionManager.createVersion.mockResolvedValue(versionWithMetadata)

      const versionData = {
        versionType: 'manual',
        description: 'Comprehensive version',
        versionTag: 'release-candidate',
        branchName: 'release/v2.0',
        incrementType: 'major',
      }

      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.data.version.description).toBe('Comprehensive version')
      expect(data.data.version.versionTag).toBe('release-candidate')
      expect(data.data.version.branchName).toBe('release/v2.0')
    })

    it('should include performance metrics in response', async () => {
      const performantVersion = {
        ...sampleVersions[0],
        serializationTimeMs: 125,
        creationDurationMs: 340,
        stateSize: 4096,
      }

      mockVersionManager.createVersion.mockResolvedValue(performantVersion)

      const versionData = { versionType: 'checkpoint' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.data.summary.creationTime).toBe(340)
      expect(data.data.summary.serializationTime).toBe(125)
      expect(data.data.summary.stateSize).toBe(4096)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle version manager creation errors', async () => {
      mockVersionManager.createVersion.mockRejectedValue(new Error('Version creation failed'))

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create workflow version')
      expect(data.requestId).toBeDefined()
    })

    it('should handle total version count retrieval errors gracefully', async () => {
      // Mock getTotalVersionCount to fail but not break the response
      mockVersionManager.getVersions.mockRejectedValue(new Error('Count query failed'))

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.data.workflow.totalVersions).toBe(0) // Fallback value
    })

    it('should include error details in development mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockVersionManager.createVersion.mockRejectedValue(new Error('Detailed error message'))

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.details).toBe('Detailed error message')

      process.env.NODE_ENV = originalNodeEnv
    })

    it('should hide error details in production mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      mockVersionManager.createVersion.mockRejectedValue(new Error('Sensitive error details'))

      const versionData = { versionType: 'manual' }
      const request = createMockRequest('POST', versionData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.details).toBeUndefined()

      process.env.NODE_ENV = originalNodeEnv
    })
  })

  describe('Request Context and Auditing', () => {
    it('should capture IP address from various headers', async () => {
      const testCases = [
        {
          headers: { 'X-Forwarded-For': '203.0.113.1, 198.51.100.1' },
          expectedIp: '203.0.113.1',
        },
        {
          headers: { 'X-Real-IP': '203.0.113.2' },
          expectedIp: '203.0.113.2',
        },
        {
          headers: {},
          expectedIp: undefined,
        },
      ]

      for (const testCase of testCases) {
        const versionData = { versionType: 'manual' }

        const request = new NextRequest(
          'http://localhost:3000/api/workflows/workflow-123/versions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...testCase.headers,
            },
            body: JSON.stringify(versionData),
          }
        )

        const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

        expect(response.status).toBe(201)
        expect(mockVersionManager.createVersion).toHaveBeenCalledWith(
          'workflow-123',
          sampleWorkflowState,
          versionData,
          'user-123',
          expect.any(String),
          testCase.expectedIp
        )
      }
    })
  })
})
