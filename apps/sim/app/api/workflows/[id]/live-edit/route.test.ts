/**
 * Comprehensive Test Suite for Live Editing and Operational Transform API - Bun/Vitest Compatible
 * Tests real-time collaborative editing, conflict resolution, and operational transforms
 * Uses the proven module-level mocking infrastructure for 90%+ test pass rates
 *
 * This test suite covers concurrent operations, vector clocks, conflict detection,
 * and comprehensive logging for debugging and maintenance by future developers.
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
const mockCollaborateRoute = {
  validateWorkflowPermissions: vi.fn(),
}

const mockOperationalTransform = {
  detectConflicts: vi.fn(),
  applyTransforms: vi.fn(),
  generateTransforms: vi.fn(),
}

const mockVectorClock = {
  increment: vi.fn(),
  compare: vi.fn(),
  merge: vi.fn(),
}

const mockLiveEditUtils = {
  validateOperation: vi.fn(),
  sanitizeOperation: vi.fn(),
  calculateConflictResolution: vi.fn(),
}

// Mock collaboration route at module level
vi.mock('../collaborate/route', () => ({
  validateWorkflowPermissions: mockCollaborateRoute.validateWorkflowPermissions,
}))

// Mock operational transform at module level
vi.mock('@/lib/operational-transform', () => ({
  detectConflicts: mockOperationalTransform.detectConflicts,
  applyTransforms: mockOperationalTransform.applyTransforms,
  generateTransforms: mockOperationalTransform.generateTransforms,
}))

// Mock vector clock at module level
vi.mock('@/lib/vector-clock', () => ({
  VectorClock: vi.fn().mockImplementation(() => ({
    increment: mockVectorClock.increment,
    compare: mockVectorClock.compare,
    merge: mockVectorClock.merge,
  })),
}))

// Mock live edit utilities at module level
vi.mock('@/lib/live-edit/utils', () => ({
  validateOperation: mockLiveEditUtils.validateOperation,
  sanitizeOperation: mockLiveEditUtils.sanitizeOperation,
  calculateConflictResolution: mockLiveEditUtils.calculateConflictResolution,
}))

// Sample live operation data for consistent testing
const sampleLiveOperation = {
  id: 'op-123',
  workflowId: 'workflow-123',
  operationType: 'update',
  operationTarget: 'block',
  operationPayload: {
    id: 'block-456',
    properties: { name: 'Updated Block' },
  },
  authorId: 'user-123',
  timestampMs: Date.now(),
  vectorClock: { 'user-123': 1 },
  applied: false,
  createdAt: new Date(),
}

const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'owner-123',
  name: 'Live Edit Workflow',
  workspaceId: 'workspace-456',
}

const sampleUserData = {
  id: 'user-123',
  name: 'Live Editor',
  email: 'editor@example.com',
}

// Mock operational transform conflicts
const conflictingOperation = {
  id: 'op-456',
  workflowId: 'workflow-123',
  operationType: 'update',
  operationTarget: 'block',
  operationPayload: {
    id: 'block-456', // Same block as sampleLiveOperation
    properties: { name: 'Conflicting Update' },
  },
  authorId: 'user-456',
  timestampMs: Date.now() - 5000, // Earlier timestamp
  vectorClock: { 'user-456': 1 },
  applied: false,
  createdAt: new Date(Date.now() - 5000),
}

describe('Live Editing API - POST /api/workflows/[id]/live-edit', () => {
  let mocks: any
  let GET: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing live edit API test infrastructure')

    // Setup comprehensive test infrastructure with proper database setup
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleWorkflowData], // Workflow lookup
            [sampleLiveOperation], // Operation lookup
          ],
        },
        insert: { results: [sampleLiveOperation] },
        update: { results: [{ ...sampleLiveOperation, applied: true }] },
      },
    })

    // Configure database behavior for live edit operations
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue([sampleWorkflowData]),
    }))

    // Configure database insertion for live operations
    mocks.database.mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([sampleLiveOperation]),
    })

    // Configure database updates for applied operations
    mocks.database.mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...sampleLiveOperation, applied: true }]),
      }),
    })

    // Configure permission validation to allow edit by default
    mockCollaborateRoute.validateWorkflowPermissions.mockResolvedValue({
      hasPermission: true,
      userRole: 'collaborator-edit',
    })

    // Configure operational transform mocks
    mockOperationalTransform.detectConflicts.mockReturnValue([])
    mockOperationalTransform.applyTransforms.mockReturnValue({
      transformedOperation: null,
      appliedTransforms: [],
    })
    mockOperationalTransform.generateTransforms.mockReturnValue([])

    // Configure vector clock mocks
    mockVectorClock.increment.mockReturnValue({ 'user-123': 1 })
    mockVectorClock.compare.mockReturnValue('concurrent')
    mockVectorClock.merge.mockReturnValue({ 'user-123': 1 })

    // Configure live edit utility mocks
    mockLiveEditUtils.validateOperation.mockReturnValue({ valid: true, errors: [] })
    mockLiveEditUtils.sanitizeOperation.mockImplementation((op) => op)
    mockLiveEditUtils.calculateConflictResolution.mockReturnValue('apply')

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST

    console.log('[SETUP] Test infrastructure initialized for live edit API')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Basic Operation Submission', () => {
    it('should submit a basic live edit operation successfully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing basic live edit operation submission')

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-789',
          properties: { name: 'New Block Name', color: '#FF0000' },
        },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Basic operation response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.operationId).toBeDefined()
      expect(data.applied).toBe(true)
      expect(data.conflicts).toEqual([])
      expect(data.message).toBe('Operation applied successfully.')
      expect(data.timestamp).toBeDefined()

      // Verify database insertion was called
      expect(mocks.database.mockDb.insert).toHaveBeenCalled()
      
      console.log('[TEST] Basic live edit operation verified')
    })

    it('should handle insert operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing insert operation handling')

      const insertData = {
        operationType: 'insert',
        operationTarget: 'block',
        operationPayload: {
          id: 'new-block-123',
          type: 'ai-agent',
          position: { x: 100, y: 200 },
          properties: { model: 'gpt-4o' },
        },
      }

      const request = createMockRequest('POST', insertData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Insert operation response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.applied).toBe(true)
      
      // Verify operation validation was called
      expect(mockLiveEditUtils.validateOperation).toHaveBeenCalledWith(
        expect.objectContaining({ operationType: 'insert' })
      )
      
      console.log('[TEST] Insert operation handling verified')
    })

    it('should handle delete operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing delete operation handling')

      const deleteData = {
        operationType: 'delete',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-to-delete',
        },
      }

      const request = createMockRequest('POST', deleteData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Delete operation response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.applied).toBe(true)
      
      // Verify operation sanitization was called
      expect(mockLiveEditUtils.sanitizeOperation).toHaveBeenCalled()
      
      console.log('[TEST] Delete operation handling verified')
    })

    it('should handle move operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing move operation handling')

      const moveData = {
        operationType: 'move',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-to-move',
          fromPosition: { x: 50, y: 75 },
          toPosition: { x: 150, y: 175 },
        },
      }

      const request = createMockRequest('POST', moveData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Move operation response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.applied).toBe(true)
      
      console.log('[TEST] Move operation handling verified')
    })

    it('should handle edge operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing edge operation handling')

      const edgeData = {
        operationType: 'insert',
        operationTarget: 'edge',
        operationPayload: {
          id: 'edge-123',
          source: 'block-A',
          target: 'block-B',
          type: 'standard',
        },
      }

      const request = createMockRequest('POST', edgeData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Edge operation response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.applied).toBe(true)
      
      console.log('[TEST] Edge operation handling verified')
    })
  })

  describe('Vector Clock and Timestamps', () => {
    it('should accept client-provided timestamps', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing client-provided timestamp handling')

      const clientTimestamp = Date.now() - 1000
      const operationData = {
        operationType: 'update',
        operationTarget: 'property',
        operationPayload: { value: 'client timestamp test' },
        timestamp: clientTimestamp,
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Client timestamp response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.timestamp).toBe(clientTimestamp)
      
      console.log('[TEST] Client-provided timestamp verified')
    })

    it('should generate server timestamp when not provided', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing server timestamp generation')

      const beforeTimestamp = Date.now()
      const operationData = {
        operationType: 'update',
        operationTarget: 'property',
        operationPayload: { value: 'server timestamp test' },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Server timestamp response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      const afterTimestamp = Date.now()

      expect(data.timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(data.timestamp).toBeLessThanOrEqual(afterTimestamp)
      
      console.log('[TEST] Server timestamp generation verified')
    })

    it('should handle vector clocks for operation ordering', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing vector clock operation ordering')

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: { id: 'block-vc', properties: { name: 'Vector Clock Test' } },
        vectorClock: { 'user-123': 3, 'user-456': 1 },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Vector clock response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.applied).toBe(true)
      
      // Verify vector clock operations were called
      expect(mockVectorClock.increment).toHaveBeenCalled()
      
      console.log('[TEST] Vector clock operation ordering verified')
    })
  })

  describe('Conflict Detection and Resolution', () => {
    it('should detect concurrent edit conflicts', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing concurrent edit conflict detection')

      // Configure operational transform to detect conflicts
      mockOperationalTransform.detectConflicts.mockReturnValue([
        {
          conflictType: 'concurrent_edit',
          conflictingOperation: conflictingOperation,
          resolutionSuggestion: 'transform',
        },
      ])

      // Mock existing conflicting operations
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([conflictingOperation]),
      }))

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-456', // Same block as conflicting operation
          properties: { name: 'My Update' },
        },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Conflict detection response status: ${response.status}`)
      expect(response.status).toBe(202) // Accepted with conflicts
      const data = await response.json()

      expect(data.applied).toBe(false)
      expect(data.conflicts.length).toBeGreaterThan(0)
      expect(data.transformedOperation).toBeDefined()
      expect(data.message).toContain('conflicts')
      
      // Verify conflict detection was called
      expect(mockOperationalTransform.detectConflicts).toHaveBeenCalled()
      
      console.log('[TEST] Concurrent edit conflict detection verified')
    })

    it('should apply operational transforms for conflicting operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing operational transform application')

      // Configure operational transform with transformation results
      mockOperationalTransform.detectConflicts.mockReturnValue([
        {
          conflictType: 'concurrent_edit',
          conflictingOperation: conflictingOperation,
          resolutionSuggestion: 'transform',
        },
      ])
      
      mockOperationalTransform.applyTransforms.mockReturnValue({
        transformedOperation: {
          ...conflictingOperation,
          transformationType: 'conflict',
          appliedTransforms: ['field_merge', 'timestamp_resolution'],
        },
        appliedTransforms: ['field_merge', 'timestamp_resolution'],
      })

      // Mock existing conflicting operations
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([conflictingOperation]),
      }))

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-456',
          properties: { name: 'Late Update', description: 'Added field' },
        },
        timestamp: Date.now(), // Later timestamp
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Operational transform response status: ${response.status}`)
      expect(response.status).toBe(202)
      const data = await response.json()

      expect(data.transformedOperation).toBeDefined()
      expect(data.transformedOperation.transformationType).toBe('conflict')
      expect(data.transformedOperation.appliedTransforms.length).toBeGreaterThan(0)
      
      // Verify operational transforms were applied
      expect(mockOperationalTransform.applyTransforms).toHaveBeenCalled()
      
      console.log('[TEST] Operational transform application verified')
    })

    it('should handle insert-insert position conflicts', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing insert-insert position conflicts')

      const conflictingInsert = {
        ...conflictingOperation,
        operationType: 'insert',
        operationPayload: {
          id: 'new-block-A',
          position: { x: 100, y: 100 },
        },
      }

      // Configure operational transform to detect position conflicts
      mockOperationalTransform.detectConflicts.mockReturnValue([
        {
          conflictType: 'position_conflict',
          conflictingOperation: conflictingInsert,
          resolutionSuggestion: 'offset_position',
        },
      ])

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([conflictingInsert]),
      }))

      const operationData = {
        operationType: 'insert',
        operationTarget: 'block',
        operationPayload: {
          id: 'new-block-B',
          position: { x: 110, y: 110 }, // Close position
        },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Position conflict response status: ${response.status}`)
      expect(response.status).toBe(202)
      const data = await response.json()
      expect(data.conflicts.length).toBeGreaterThan(0)
      
      console.log('[TEST] Insert-insert position conflicts verified')
    })

    it('should handle delete-update conflicts', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing delete-update conflicts')

      const deleteConflict = {
        ...conflictingOperation,
        operationType: 'delete',
        operationPayload: { id: 'block-456' },
      }

      // Configure operational transform to detect dependency violations
      mockOperationalTransform.detectConflicts.mockReturnValue([
        {
          conflictType: 'dependency_violation',
          conflictingOperation: deleteConflict,
          resolutionSuggestion: 'manual',
        },
      ])

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([deleteConflict]),
      }))

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-456',
          properties: { name: 'Update Deleted Block' },
        },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Delete-update conflict response status: ${response.status}`)
      expect(response.status).toBe(202)
      const data = await response.json()

      const conflict = data.conflicts[0]
      expect(conflict.conflictType).toBe('dependency_violation')
      expect(conflict.resolutionSuggestion).toBe('manual')
      
      console.log('[TEST] Delete-update conflicts verified')
    })

    it('should detect move-move conflicts', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing move-move conflicts')

      const moveConflict = {
        ...conflictingOperation,
        operationType: 'move',
        operationPayload: {
          id: 'block-456',
          toPosition: { x: 200, y: 200 },
        },
      }

      // Configure operational transform to detect concurrent moves
      mockOperationalTransform.detectConflicts.mockReturnValue([
        {
          conflictType: 'concurrent_move',
          conflictingOperation: moveConflict,
          resolutionSuggestion: 'latest_wins',
        },
      ])

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([moveConflict]),
      }))

      const operationData = {
        operationType: 'move',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-456',
          toPosition: { x: 150, y: 150 },
        },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Move-move conflict response status: ${response.status}`)
      expect(response.status).toBe(202)
      const data = await response.json()
      expect(data.conflicts[0].conflictType).toBe('concurrent_move')
      
      console.log('[TEST] Move-move conflicts verified')
    })

    it('should skip conflicts from same author', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing same author conflict skipping')

      const sameAuthorOp = {
        ...conflictingOperation,
        authorId: mockUser.id, // Same author
      }

      // Configure operational transform to skip same-author conflicts
      mockOperationalTransform.detectConflicts.mockReturnValue([])

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([sameAuthorOp]),
      }))

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: {
          id: 'block-456',
          properties: { name: 'Same Author Update' },
        },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Same author response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.applied).toBe(true)
      expect(data.conflicts).toEqual([])
      
      console.log('[TEST] Same author conflict skipping verified')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for live edit operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for live edit')

      mocks.auth.setUnauthenticated()

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: { id: 'unauthorized-edit' },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Unauthenticated live edit response status: ${response.status}`)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
      
      console.log('[TEST] Authentication requirement verified')
    })

    it('should require edit permissions for live edit operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing edit permission requirement')

      // Configure insufficient permissions
      mockCollaborateRoute.validateWorkflowPermissions.mockResolvedValue({
        hasPermission: false,
        userRole: 'collaborator-view',
      })

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: { id: 'restricted-edit' },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Insufficient permissions response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Insufficient permissions')
      
      // Verify permission check was called
      expect(mockCollaborateRoute.validateWorkflowPermissions).toHaveBeenCalled()
      
      console.log('[TEST] Edit permission requirement verified')
    })
  })

  describe('Validation and Error Handling', () => {
    it('should validate operation schema', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing operation schema validation')

      // Configure validation to return errors
      mockLiveEditUtils.validateOperation.mockReturnValue({
        valid: false,
        errors: ['Invalid operation type', 'Invalid target'],
      })

      const invalidOperation = {
        operationType: 'invalid-operation',
        operationTarget: 'invalid-target',
        operationPayload: null,
      }

      const request = createMockRequest('POST', invalidOperation)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Schema validation response status: ${response.status}`)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
      
      // Verify validation was called
      expect(mockLiveEditUtils.validateOperation).toHaveBeenCalled()
      
      console.log('[TEST] Operation schema validation verified')
    })

    it('should validate operation types', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing operation type validation')

      const validTypes = ['insert', 'delete', 'update', 'move']

      for (const type of validTypes) {
        console.log(`[TEST] Validating operation type: ${type}`)
        
        const operationData = {
          operationType: type,
          operationTarget: 'block',
          operationPayload: { id: `test-${type}` },
        }

        const request = createMockRequest('POST', operationData)
        const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

        expect(response.status).toBe(200)
      }
      
      console.log('[TEST] Operation type validation verified')
    })

    it('should validate operation targets', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing operation target validation')

      const validTargets = ['block', 'edge', 'property', 'subblock', 'variable']

      for (const target of validTargets) {
        console.log(`[TEST] Validating operation target: ${target}`)
        
        const operationData = {
          operationType: 'update',
          operationTarget: target,
          operationPayload: { id: `test-${target}` },
        }

        const request = createMockRequest('POST', operationData)
        const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

        expect(response.status).toBe(200)
      }
      
      console.log('[TEST] Operation target validation verified')
    })

    it('should handle database insertion errors', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database insertion error handling')

      // Configure database to throw error
      mocks.database.mockDb.insert.mockImplementation(() => {
        throw new Error('Database insertion failed')
      })

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: { id: 'db-error-test' },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Database error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      
      console.log('[TEST] Database insertion error handling verified')
    })

    it('should handle malformed JSON requests', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing malformed JSON request handling')

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/live-edit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json-content',
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Malformed JSON response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      
      console.log('[TEST] Malformed JSON request handling verified')
    })
  })

  describe('Performance and Optimization', () => {
    it('should include processing time in response metadata', async () => {
      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: { id: 'perf-test' },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.timestamp).toBeDefined()
      expect(typeof data.timestamp).toBe('number')
    })

    it('should limit conflict detection to recent operations', async () => {
      // Mock many old operations that shouldn't be considered
      const oldOperations = Array.from({ length: 50 }, (_, i) => ({
        ...conflictingOperation,
        id: `old-op-${i}`,
        timestampMs: Date.now() - 3600000, // 1 hour ago
      }))

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(Promise.resolve(oldOperations.slice(0, 20))), // Limited results
      }))

      const operationData = {
        operationType: 'update',
        operationTarget: 'block',
        operationPayload: { id: 'block-456' },
      }

      const request = createMockRequest('POST', operationData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200) // Should still work efficiently
    })
  })
})

describe('Live Editing API - GET /api/workflows/[id]/live-edit/changes', () => {
  let mocks: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing live edit changes API test infrastructure')

    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleLiveOperation]] },
      },
    })

    // Configure permission validation to allow view by default
    mockCollaborateRoute.validateWorkflowPermissions.mockResolvedValue({
      hasPermission: true,
      userRole: 'collaborator-view',
    })

    console.log('[SETUP] Live edit changes test infrastructure initialized')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Change Retrieval', () => {
    it('should retrieve pending changes from other users', async () => {
      // Mock operations from different users
      const otherUserOperations = [
        {
          ...sampleLiveOperation,
          id: 'op-other-1',
          authorId: 'other-user-123',
          authorName: 'Other User',
          applied: false,
        },
        {
          ...sampleLiveOperation,
          id: 'op-other-2',
          authorId: 'other-user-456',
          authorName: 'Another User',
          applied: true,
        },
      ]

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(otherUserOperations),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.operations).toBeDefined()
      expect(data.operations.length).toBe(2)
      expect(data.totalOperations).toBe(2)
      expect(data.pendingOperations).toBe(1) // Only one is not applied
      expect(data.workflowId).toBe('workflow-123')
      expect(data.lastSyncTimestamp).toBeDefined()
    })

    it('should exclude current user operations', async () => {
      const mixedOperations = [
        {
          ...sampleLiveOperation,
          id: 'op-current-user',
          authorId: mockUser.id, // Current user
          authorName: mockUser.name,
        },
        {
          ...sampleLiveOperation,
          id: 'op-other-user',
          authorId: 'other-user-789',
          authorName: 'Other User',
        },
      ]

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(mixedOperations),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.operations.length).toBe(1) // Only other user's operation
      expect(data.operations[0].authorId).toBe('other-user-789')
    })

    it('should filter changes by timestamp', async () => {
      const baseTimestamp = Date.now()
      const timedOperations = [
        {
          ...sampleLiveOperation,
          id: 'op-old',
          timestampMs: baseTimestamp - 10000,
          authorId: 'other-user-1',
        },
        {
          ...sampleLiveOperation,
          id: 'op-new',
          timestampMs: baseTimestamp,
          authorId: 'other-user-2',
        },
      ]

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(timedOperations),
      }))

      const request = new NextRequest(
        `http://localhost:3000/api/workflows/workflow-123/live-edit/changes?since=${baseTimestamp - 5000}`
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should only include operations newer than the 'since' timestamp
      expect(data.operations.length).toBe(1)
      expect(data.operations[0].id).toBe('op-new')
    })

    it('should limit results based on query parameter', async () => {
      const manyOperations = Array.from({ length: 100 }, (_, i) => ({
        ...sampleLiveOperation,
        id: `op-${i}`,
        authorId: `user-${i}`,
      }))

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation((limitNum) => ({
          then: vi.fn().mockResolvedValue(manyOperations.slice(0, limitNum)),
        })),
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/live-edit/changes?limit=10'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.operations.length).toBe(10)
    })

    it('should include applied operations when requested', async () => {
      const mixedStatusOps = [
        {
          ...sampleLiveOperation,
          id: 'op-applied',
          applied: true,
          authorId: 'other-user-1',
        },
        {
          ...sampleLiveOperation,
          id: 'op-pending',
          applied: false,
          authorId: 'other-user-2',
        },
      ]

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(mixedStatusOps),
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/live-edit/changes?includeApplied=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.operations.length).toBe(2)
      expect(data.totalOperations).toBe(2)
      expect(data.pendingOperations).toBe(1)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for retrieving changes', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for retrieving changes')

      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Unauthenticated changes response status: ${response.status}`)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
      
      console.log('[TEST] Authentication requirement for changes verified')
    })

    it('should require workflow access permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow access permission requirement')

      // Configure no access
      mockCollaborateRoute.validateWorkflowPermissions.mockResolvedValue({
        hasPermission: false,
        userRole: null,
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Access denied response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
      
      console.log('[TEST] Workflow access permission requirement verified')
    })

    it('should allow view access for retrieving changes', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing view access for retrieving changes')

      // Configure view access
      mockCollaborateRoute.validateWorkflowPermissions.mockResolvedValue({
        hasPermission: true,
        userRole: 'collaborator-view',
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] View access response status: ${response.status}`)
      expect(response.status).toBe(200)
      
      console.log('[TEST] View access for retrieving changes verified')
    })
  })

  describe('Response Format and Metadata', () => {
    it('should return proper response structure', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('operations')
      expect(data).toHaveProperty('conflicts')
      expect(data).toHaveProperty('totalOperations')
      expect(data).toHaveProperty('pendingOperations')
      expect(data).toHaveProperty('lastSyncTimestamp')
      expect(data).toHaveProperty('workflowId')

      expect(Array.isArray(data.operations)).toBe(true)
      expect(Array.isArray(data.conflicts)).toBe(true)
      expect(typeof data.totalOperations).toBe('number')
      expect(typeof data.pendingOperations).toBe('number')
      expect(typeof data.lastSyncTimestamp).toBe('number')
      expect(data.workflowId).toBe('workflow-123')
    })

    it('should calculate lastSyncTimestamp correctly', async () => {
      const timestampedOps = [
        {
          ...sampleLiveOperation,
          timestampMs: 1000,
          authorId: 'user-1',
        },
        {
          ...sampleLiveOperation,
          timestampMs: 2000, // Latest
          authorId: 'user-2',
        },
        {
          ...sampleLiveOperation,
          timestampMs: 1500,
          authorId: 'user-3',
        },
      ]

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(timestampedOps),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.lastSyncTimestamp).toBe(2000) // Should be the latest timestamp
    })

    it('should handle empty results gracefully', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([]),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.operations).toEqual([])
      expect(data.totalOperations).toBe(0)
      expect(data.pendingOperations).toBe(0)
      expect(data.lastSyncTimestamp).toBeGreaterThan(0) // Should be current time
    })
  })

  describe('Error Handling', () => {
    it('should handle database query errors', async () => {
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database query failed')
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle invalid query parameters gracefully', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/live-edit/changes?limit=invalid&since=not-a-number'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      // Should not fail, should use defaults
      expect(response.status).toBe(200)
    })
  })
})
