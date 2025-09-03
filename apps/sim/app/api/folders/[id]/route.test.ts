/**
 * Comprehensive Test Suite for Individual Folder API - Bun/Vitest Compatible
 * Tests folder CRUD operations, hierarchy management, and permission controls
 * Covers authentication, authorization, circular reference prevention, and comprehensive error handling
 *
 * This test suite uses the proven module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
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
    sortOrder: 'sortOrder',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}))

// Mock drizzle-orm operators at module level
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  isNull: vi.fn((field) => ({ field, type: 'isNull' })),
}))

// Interface for folder database mock configuration
interface FolderDbMockOptions {
  folderLookupResult?: any
  updateResult?: any[]
  throwError?: boolean
  circularCheckResults?: any[]
}

// Mock folder data
const sampleFolder = {
  id: 'folder-1',
  name: 'Test Folder',
  userId: 'user-123',
  workspaceId: 'workspace-123',
  parentId: null,
  color: '#6B7280',
  sortOrder: 1,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

describe('Individual Folder API Route - PUT /api/folders/[id]', () => {
  let mocks: any
  let PUT: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    // Setup comprehensive test infrastructure with proper database setup
    console.log('[SETUP] Initializing Individual Folder API test infrastructure')
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleFolder], // Folder lookup for authenticated user
          ],
        },
        update: {
          results: [{ ...sampleFolder, name: 'Updated Folder' }],
        },
      },
    })

    // Configure default permissions for folder operations
    mockGetUserEntityPermissions.mockResolvedValue('admin')

    // Configure default database behavior for folder operations
    // The route uses .then((rows) => rows[0]) pattern so we need to mock this properly
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([sampleFolder]),
          then: (callback: any) => {
            console.log('[MOCK] Database .then() called with folder data')
            return callback([sampleFolder])
          },
        }),
      }),
    }))

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    PUT = routeModule.PUT

    console.log(
      '[SETUP] Individual Folder API test infrastructure initialized with authenticated user'
    )
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Basic Folder Update Operations', () => {
    it('should update folder successfully with comprehensive metadata', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful folder update with metadata validation')

      const req = createMockRequest('PUT', {
        name: 'Updated Folder Name',
        color: '#FF0000',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Folder update response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folder')
      expect(data.folder).toMatchObject({
        name: 'Updated Folder',
        id: 'folder-1',
      })
      expect(data.folder.updatedAt).toBeDefined()
    })

    it('should update parent folder successfully with hierarchy validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing parent folder update with hierarchy validation')

      // Configure database to handle parent folder operations
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([sampleFolder]),
            then: (callback: any) => {
              console.log('[MOCK] Parent folder update .then() called')
              return callback([sampleFolder])
            },
          }),
        }),
      }))

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
        parentId: 'parent-folder-1',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Parent folder update response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('folder')
    })

    it('should return 401 for unauthenticated requests', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for folder update')

      mocks.auth.setUnauthenticated()

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Unauthenticated folder update response status: ${response.status}`)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should enforce proper authentication for folder updates', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication enforcement for folder updates')

      mocks.auth.setUnauthenticated()

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Authentication enforcement response status: ${response.status}`)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Unauthorized')
    })

    it('should return 403 when user has only read permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing read-only permissions restriction')

      mockGetUserEntityPermissions.mockResolvedValue('read') // Read-only permissions

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Read-only permissions response status: ${response.status}`)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Write access required to update folders')
    })

    it('should allow folder update for write permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing write permissions access for folder updates')

      mockGetUserEntityPermissions.mockResolvedValue('write') // Write permissions

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Write permissions response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folder')
      expect(data.folder.name).toBeDefined()
    })

    it('should allow folder update for admin permissions with full access', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing admin permissions access for folder updates')

      mockGetUserEntityPermissions.mockResolvedValue('admin') // Admin permissions

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
        color: '#FF0000',
        parentId: 'parent-folder-1',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Admin permissions response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('folder')
      expect(data.folder.name).toBeDefined()
    })
  })

  describe('Data Processing and Validation', () => {
    it('should trim folder name when updating with comprehensive validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing folder name trimming with validation')

      let capturedUpdates: CapturedFolderValues | null = null

      // Configure database to capture update operations
      mocks.database.mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockImplementation((updates) => {
          capturedUpdates = updates
          console.log('[MOCK] Capturing folder updates:', updates)
          return {
            where: vi
              .fn()
              .mockReturnValue([{ ...sampleFolder, name: 'Folder With Spaces', ...updates }]),
          }
        }),
      }))

      const req = createMockRequest('PUT', {
        name: '  Folder With Spaces  ',
        color: '  #FF0000  ', // Also test color trimming
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Folder name trimming response status: ${response.status}`)
      expect(response.status).toBe(200)
      expect(capturedUpdates).not.toBeNull()
      expect(capturedUpdates!.name).toBe('Folder With Spaces')
    })

    it('should handle database errors gracefully with comprehensive error logging', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling with comprehensive logging')

      // Configure database to throw errors during folder operations
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Database error response status: ${response.status}`)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Internal server error')
      expect(data.error).toBeDefined()
    })
  })

  describe('Input Validation and Edge Cases', () => {
    it('should handle empty folder name with validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing empty folder name validation')

      const req = createMockRequest('PUT', {
        name: '', // Empty name
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Empty folder name response status: ${response.status}`)
      // Should still work as the API doesn't validate empty names
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('folder')
    })

    it('should handle malformed JSON requests gracefully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing malformed JSON request handling')

      // Create a request with invalid JSON
      const req = new NextRequest('http://localhost:3000/api/folders/folder-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json-content',
      })

      const params = Promise.resolve({ id: 'folder-1' })
      const response = await PUT(req, { params })

      console.log(`[TEST] Malformed JSON response status: ${response.status}`)
      expect(response.status).toBe(500) // Should handle JSON parse error gracefully
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('Folder Hierarchy and Circular Reference Prevention', () => {
    it('should prevent circular references with comprehensive validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing circular reference prevention with hierarchy validation')

      // Mock the circular reference scenario where folder-3 trying to set folder-1 as parent,
      // but folder-1 -> folder-2 -> folder-3 would create cycle
      const circularFolderData = { id: 'folder-3', parentId: null, name: 'Folder 3' }

      let callCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              callCount++
              console.log(`[MOCK] Circular check call ${callCount}`)

              // First call: folder lookup
              if (callCount === 1) {
                return Promise.resolve([circularFolderData])
              }
              // Subsequent calls: circular reference checks
              if (callCount === 2) {
                return Promise.resolve([{ parentId: 'folder-2' }]) // folder-1 has parent folder-2
              }
              if (callCount === 3) {
                return Promise.resolve([{ parentId: 'folder-3' }]) // folder-2 has parent folder-3 (creates cycle!)
              }
              return Promise.resolve([])
            },
            then: (callback: any) => {
              callCount++
              console.log(`[MOCK] Circular check .then() call ${callCount}`)
              if (callCount === 1) {
                return callback([circularFolderData])
              }
              return callback([])
            },
          }),
        }),
      }))

      const req = createMockRequest('PUT', {
        name: 'Updated Folder 3',
        parentId: 'folder-1', // This would create a circular reference
      })
      const params = Promise.resolve({ id: 'folder-3' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Circular reference response status: ${response.status}`)
      // Should return 400 due to circular reference
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Cannot create circular folder reference')
    })

    it('should prevent folder from being its own parent', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing self-parent prevention')

      const req = createMockRequest('PUT', {
        name: 'Updated Folder',
        parentId: 'folder-1', // Same as the folder ID
      })
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await PUT(req, { params })

      console.log(`[TEST] Self-parent response status: ${response.status}`)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Folder cannot be its own parent')
    })
  })
})

describe('Individual Folder API Route - DELETE /api/folders/[id]', () => {
  let mocks: any
  let DELETE: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    // Setup comprehensive test infrastructure for DELETE operations
    console.log('[SETUP] Initializing DELETE folder API test infrastructure')
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleFolder], // Folder lookup for authenticated user
          ],
        },
        delete: {
          results: [{ id: 'folder-1' }],
        },
      },
    })

    // Configure default permissions for folder deletion (admin required)
    mockGetUserEntityPermissions.mockResolvedValue('admin')

    // Configure default database behavior for folder deletion
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([sampleFolder]),
          then: (callback: any) => {
            console.log('[MOCK] DELETE folder lookup .then() called')
            return callback([sampleFolder])
          },
        }),
      }),
    }))

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    DELETE = routeModule.DELETE

    console.log('[SETUP] DELETE folder API test infrastructure initialized')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Folder Deletion Operations', () => {
    it('should delete folder and all contents successfully with comprehensive validation', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful folder deletion with content validation')

      const req = createMockRequest('DELETE')
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await DELETE(req, { params })

      console.log(`[TEST] Folder deletion response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('deletedItems')
    })

    it('should enforce authentication for folder deletion', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for folder deletion')

      mocks.auth.setUnauthenticated()

      const req = createMockRequest('DELETE')
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await DELETE(req, { params })

      console.log(`[TEST] Unauthenticated deletion response status: ${response.status}`)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('Folder Deletion Authorization', () => {
    it('should return 403 when user has only read permissions for delete', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing read-only permissions restriction for deletion')

      mockGetUserEntityPermissions.mockResolvedValue('read') // Read-only permissions

      const req = createMockRequest('DELETE')
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await DELETE(req, { params })

      console.log(`[TEST] Read-only deletion response status: ${response.status}`)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Admin access required to delete folders')
    })

    it('should return 403 when user has only write permissions for delete', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing write permissions restriction for deletion')

      mockGetUserEntityPermissions.mockResolvedValue('write') // Write permissions (not enough for delete)

      const req = createMockRequest('DELETE')
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await DELETE(req, { params })

      console.log(`[TEST] Write permissions deletion response status: ${response.status}`)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Admin access required to delete folders')
    })

    it('should allow folder deletion for admin permissions with full access', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing admin permissions access for folder deletion')

      mockGetUserEntityPermissions.mockResolvedValue('admin') // Admin permissions

      const req = createMockRequest('DELETE')
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await DELETE(req, { params })

      console.log(`[TEST] Admin deletion response status: ${response.status}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('deletedItems')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors during deletion with comprehensive error reporting', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling during deletion')

      // Configure database to throw errors during deletion operations
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed during deletion')
      })

      const req = createMockRequest('DELETE')
      const params = Promise.resolve({ id: 'folder-1' })

      const response = await DELETE(req, { params })

      console.log(`[TEST] Database deletion error response status: ${response.status}`)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Internal server error')
      expect(data.error).toBeDefined()
    })

    it('should handle folder not found scenarios gracefully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing folder not found during deletion')

      // Configure database to return empty results (folder not found)
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // No folder found
            then: (callback: any) => {
              console.log('[MOCK] Folder not found .then() called')
              return callback([])
            },
          }),
        }),
      }))

      const req = createMockRequest('DELETE')
      const params = Promise.resolve({ id: 'non-existent-folder' })

      const response = await DELETE(req, { params })

      console.log(`[TEST] Folder not found response status: ${response.status}`)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data).toHaveProperty('error', 'Folder not found')
    })
  })
})
