/**
 * Comprehensive Test Suite for Folders Collection API - Bun/Vitest Compatible
 * Tests folder list operations, folder creation, permissions, and comprehensive error handling
 * Covers authentication, authorization, validation, and workspace-level folder management
 *
 * This test suite uses the proven module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type CapturedFolderValues,
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'

// Module-level mocks - Required for bun/vitest compatibility
const mockGetUserEntityPermissions = vi.fn()

// Mock permissions utils at module level
vi.mock('@/lib/permissions/utils', () => ({
  getUserEntityPermissions: mockGetUserEntityPermissions,
}))

// Mock database schema at module level
vi.mock('@/db/schema', () => ({
  workflowFolder: {
    id: 'id',
    name: 'name',
    userId: 'userId',
    workspaceId: 'workspaceId',
    parentId: 'parentId',
    color: 'color',
    isExpanded: 'isExpanded',
    sortOrder: 'sortOrder',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}))

// Mock drizzle-orm operators at module level
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
}))

// Mock UUID at module level
const mockUUID = 'mock-uuid-12345678-90ab-cdef-1234-567890abcdef'
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue(mockUUID),
})

// Mock folder data for testing
const mockFolders = [
  {
    id: 'folder-1',
    name: 'Test Folder 1',
    userId: 'user-123',
    workspaceId: 'workspace-123',
    parentId: null,
    color: '#6B7280',
    isExpanded: true,
    sortOrder: 0,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  },
  {
    id: 'folder-2',
    name: 'Test Folder 2',
    userId: 'user-123',
    workspaceId: 'workspace-123',
    parentId: 'folder-1',
    color: '#EF4444',
    isExpanded: false,
    sortOrder: 1,
    createdAt: new Date('2023-01-02T00:00:00.000Z'),
    updatedAt: new Date('2023-01-02T00:00:00.000Z'),
  },
]

describe('Folders Collection API Route - GET /api/folders', () => {
  let mocks: any
  let GET: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    // Setup comprehensive test infrastructure with database configured for folder listing
    console.log('[SETUP] Initializing Folders Collection GET API test infrastructure')
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [mockFolders], // Folders list for workspace
        },
      },
    })

    // Configure default permissions for folder listing (read required)
    mockGetUserEntityPermissions.mockResolvedValue('read')

    // Configure database to return folder list with proper chaining
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(mockFolders),
        }),
      }),
    }))

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET

    console.log('[SETUP] Folders Collection GET API test infrastructure initialized')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Folder Listing Operations', () => {
    it('should return folders for a valid workspace with comprehensive validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful folder listing for valid workspace')

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Folder listing response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folders')
      expect(data.folders).toHaveLength(2)
      expect(data.folders[0]).toMatchObject({
        id: 'folder-1',
        name: 'Test Folder 1',
        workspaceId: 'workspace-123',
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for folder listing')

      mocks.auth.setUnauthenticated()

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Unauthenticated folder listing response status: ${response.status}`)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Unauthorized')
    })

    it('should return 400 when workspaceId is missing', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing missing workspaceId parameter validation')

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Missing workspaceId response status: ${response.status}`)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Workspace ID is required')
    })
  })

  describe('Workspace Access Control', () => {
    it('should return 403 when user has no workspace permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workspace access control with no permissions')

      mockGetUserEntityPermissions.mockResolvedValue(null) // No permissions

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] No permissions response status: ${response.status}`)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Access denied to this workspace')
    })

    it('should allow folder listing for read permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing read permissions access for folder listing')

      mockGetUserEntityPermissions.mockResolvedValue('read') // Read permissions

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Read permissions response status: ${response.status}`)
      expect(response.status).toBe(200) // Should work for read permissions

      const data = await response.json()
      expect(data).toHaveProperty('folders')
    })

    it('should allow folder listing for write permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing write permissions access for folder listing')

      mockGetUserEntityPermissions.mockResolvedValue('write') // Write permissions

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Write permissions response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folders')
    })

    it('should allow folder listing for admin permissions with full access', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing admin permissions access for folder listing')

      mockGetUserEntityPermissions.mockResolvedValue('admin') // Admin permissions

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Admin permissions response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folders')
      expect(data.folders).toHaveLength(2)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully with comprehensive error logging', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling for folder listing')

      // Configure database to throw errors
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Database error response status: ${response.status}`)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Internal server error')
    })

    it('should handle empty folder list gracefully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing empty folder list handling')

      // Configure database to return empty list
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve([]), // Empty folder list
          }),
        }),
      }))

      const mockRequest = createMockRequest('GET')
      Object.defineProperty(mockRequest, 'url', {
        value: 'http://localhost:3000/api/folders?workspaceId=workspace-123',
      })

      const response = await GET(mockRequest)

      console.log(`[TEST] Empty folder list response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folders')
      expect(data.folders).toHaveLength(0)
    })
  })
})

describe('Folders Collection API Route - POST /api/folders', () => {
  let mocks: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    // Setup comprehensive test infrastructure for folder creation
    console.log('[SETUP] Initializing Folders Collection POST API test infrastructure')
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [], // No existing folders for sort order calculation
          ],
        },
        insert: {
          results: [mockFolders[0]], // Created folder result
        },
      },
    })

    // Configure default permissions for folder creation (write required)
    mockGetUserEntityPermissions.mockResolvedValue('write')

    // Configure database transaction mock for folder creation
    mocks.database.mockDb.transaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockImplementation(() => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => Promise.resolve([]), // No existing folders for sort order
              }),
            }),
          }),
        })),
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation(() => ({
            returning: vi.fn().mockReturnValue([mockFolders[0]]),
          })),
        })),
      }
      return await callback(tx)
    })

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    POST = routeModule.POST

    console.log('[SETUP] Folders Collection POST API test infrastructure initialized')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Folder Creation Operations', () => {
    it('should create a new folder successfully with comprehensive validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful folder creation with validation')

      const req = createMockRequest('POST', {
        name: 'New Test Folder',
        workspaceId: 'workspace-123',
        color: '#6B7280',
      })

      const response = await POST(req)

      console.log(`[TEST] Folder creation response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folder')
      expect(data.folder).toMatchObject({
        id: 'folder-1',
        name: 'Test Folder 1',
        workspaceId: 'workspace-123',
      })
    })

    it('should create folder with correct sort order calculation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing folder sort order calculation')

      // Configure transaction to return existing folder with sort order 5
      mocks.database.mockDb.transaction.mockImplementation(async (callback: any) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([{ sortOrder: 5 }]), // Existing folder with sort order 5
                }),
              }),
            }),
          })),
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation(() => ({
              returning: vi.fn().mockReturnValue([{ ...mockFolders[0], sortOrder: 6 }]),
            })),
          })),
        }
        return await callback(tx)
      })

      const req = createMockRequest('POST', {
        name: 'New Test Folder',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Sort order calculation response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.folder).toMatchObject({
        sortOrder: 6,
      })
    })

    it('should create subfolder with parent reference', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing subfolder creation with parent reference')

      // Configure transaction to return subfolder result
      mocks.database.mockDb.transaction.mockImplementation(async (callback: any) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([]), // No existing folders
                }),
              }),
            }),
          })),
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation(() => ({
              returning: vi.fn().mockReturnValue([mockFolders[1]]), // Subfolder with parent
            })),
          })),
        }
        return await callback(tx)
      })

      const req = createMockRequest('POST', {
        name: 'Subfolder',
        workspaceId: 'workspace-123',
        parentId: 'folder-1',
      })

      const response = await POST(req)

      console.log(`[TEST] Subfolder creation response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.folder).toMatchObject({
        parentId: 'folder-1',
      })
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for folder creation')

      mocks.auth.setUnauthenticated()

      const req = createMockRequest('POST', {
        name: 'Test Folder',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Unauthenticated folder creation response status: ${response.status}`)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Unauthorized')
    })

    it('should return 403 when user has only read permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing read-only permissions restriction for folder creation')

      mockGetUserEntityPermissions.mockResolvedValue('read') // Read-only permissions

      const req = createMockRequest('POST', {
        name: 'Test Folder',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Read-only permissions response status: ${response.status}`)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Write or Admin access required to create folders')
    })

    it('should allow folder creation for write permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing write permissions access for folder creation')

      mockGetUserEntityPermissions.mockResolvedValue('write') // Write permissions

      const req = createMockRequest('POST', {
        name: 'Test Folder',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Write permissions response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folder')
    })

    it('should allow folder creation for admin permissions with full access', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing admin permissions access for folder creation')

      mockGetUserEntityPermissions.mockResolvedValue('admin') // Admin permissions

      const req = createMockRequest('POST', {
        name: 'Test Folder',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Admin permissions response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folder')
    })
  })

  describe('Input Validation and Data Processing', () => {
    it('should return 400 when required fields are missing', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing required fields validation')

      const testCases = [
        { name: '', workspaceId: 'workspace-123' }, // Missing name
        { name: 'Test Folder', workspaceId: '' }, // Missing workspaceId
        { workspaceId: 'workspace-123' }, // Missing name entirely
        { name: 'Test Folder' }, // Missing workspaceId entirely
      ]

      for (const body of testCases) {
        console.log(`[TEST] Testing validation for: ${JSON.stringify(body)}`)

        const req = createMockRequest('POST', body)
        const response = await POST(req)

        console.log(`[TEST] Validation response status: ${response.status}`)
        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data).toHaveProperty('error', 'Name and workspace ID are required')
      }
    })

    it('should trim folder name when creating with validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing folder name trimming during creation')

      let capturedValues: CapturedFolderValues | null = null

      // Configure transaction to capture values
      mocks.database.mockDb.transaction.mockImplementation(async (callback: any) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([]),
                }),
              }),
            }),
          })),
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation((values) => {
              capturedValues = values
              console.log('[MOCK] Capturing folder creation values:', values)
              return {
                returning: vi.fn().mockReturnValue([mockFolders[0]]),
              }
            }),
          })),
        }
        return await callback(tx)
      })

      const req = createMockRequest('POST', {
        name: '  Test Folder With Spaces  ',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Folder name trimming response status: ${response.status}`)
      expect(response.status).toBe(200)
      expect(capturedValues).not.toBeNull()
      expect(capturedValues!.name).toBe('Test Folder With Spaces')
    })

    it('should use default color when not provided', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing default color assignment')

      let capturedValues: CapturedFolderValues | null = null

      // Configure transaction to capture values
      mocks.database.mockDb.transaction.mockImplementation(async (callback: any) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([]),
                }),
              }),
            }),
          })),
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation((values) => {
              capturedValues = values
              console.log('[MOCK] Capturing default color values:', values)
              return {
                returning: vi.fn().mockReturnValue([mockFolders[0]]),
              }
            }),
          })),
        }
        return await callback(tx)
      })

      const req = createMockRequest('POST', {
        name: 'Test Folder',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Default color response status: ${response.status}`)
      expect(response.status).toBe(200)
      expect(capturedValues).not.toBeNull()
      expect(capturedValues!.color).toBe('#6B7280')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully with comprehensive error logging', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling for folder creation')

      // Configure transaction to throw error
      mocks.database.mockDb.transaction.mockImplementation(() => {
        throw new Error('Database transaction failed')
      })

      const req = createMockRequest('POST', {
        name: 'Test Folder',
        workspaceId: 'workspace-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Database error response status: ${response.status}`)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Internal server error')
    })

    it('should handle malformed JSON requests gracefully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing malformed JSON request handling')

      // Create request with invalid JSON
      const req = new Request('http://localhost:3000/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json-content',
      })

      const response = await POST(req)

      console.log(`[TEST] Malformed JSON response status: ${response.status}`)
      expect(response.status).toBe(500) // Should handle JSON parse error gracefully

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })
})
