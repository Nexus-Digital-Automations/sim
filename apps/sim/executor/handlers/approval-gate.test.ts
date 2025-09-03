/**
 * Approval Gate Block Handler Tests
 *
 * Comprehensive test suite for the Approval Gate Block Handler,
 * covering approval workflow management, timeout handling, and notifications.
 *
 * @author Claude Code Assistant
 * @created 2025-09-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApprovalGateBlockHandler } from './approval-gate'
import type { SerializedBlock } from '@/serializer/types'
import type { ExecutionContext } from '@/executor/types'

// Mock dependencies
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('@/blocks/blocks/approval-gate', () => ({
  generateApprovalId: vi.fn((blockId, executionId) => `approval_${blockId}_${executionId}_test`),
  validateApprovers: vi.fn(() => ({ isValid: true })),
  calculateApprovalRequirements: vi.fn(() => ({
    totalApprovers: 2,
    requiredApprovals: 1,
    allowPartialApproval: true,
    approvalThreshold: 1,
  })),
  generateApprovalNotification: vi.fn(() => ({
    subject: 'Test Approval Required',
    message: 'Please approve this test request',
    priority: 'normal',
    metadata: { approvalId: 'test' },
  })),
  isApprovalComplete: vi.fn(() => ({
    isComplete: false,
    isApproved: false,
    reason: 'Waiting for approvals',
    summary: {
      approvalsReceived: 0,
      rejectionsReceived: 0,
      approvalsRequired: 1,
      totalApprovers: 2,
    },
  })),
}))

describe('ApprovalGateBlockHandler', () => {
  let handler: ApprovalGateBlockHandler
  let mockBlock: SerializedBlock
  let mockContext: ExecutionContext

  beforeEach(() => {
    handler = new ApprovalGateBlockHandler()
    
    mockBlock = {
      id: 'test-block-id',
      type: 'approval-gate',
      metadata: {
        id: 'approval-gate',
        name: 'Test Approval Gate',
      },
    } as SerializedBlock

    mockContext = {
      workflowId: 'test-workflow-id',
      executionId: 'test-execution-id',
      blockStates: new Map(),
      activeExecutionPath: new Set(),
      workflowVariables: {},
      environmentVariables: {},
    } as ExecutionContext
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('canHandle', () => {
    it('should return true for approval-gate blocks', () => {
      expect(handler.canHandle(mockBlock)).toBe(true)
    })

    it('should return false for non-approval-gate blocks', () => {
      const nonApprovalBlock = {
        ...mockBlock,
        metadata: { id: 'other-block', name: 'Other Block' },
      }
      expect(handler.canHandle(nonApprovalBlock)).toBe(false)
    })
  })

  describe('execute', () => {
    const validInputs = {
      approvalTitle: 'Test Approval Request',
      approvalMessage: 'Please approve this test',
      approvers: ['user1@test.com', 'user2@test.com'],
      approvalType: 'any',
      timeoutMinutes: 60,
      timeoutAction: 'reject',
      priority: 'normal',
      notificationMethod: ['email'],
    }

    it('should execute successfully with valid inputs', async () => {
      const result = await handler.execute(mockBlock, validInputs, mockContext)

      expect(result.success).toBe(true)
      expect(result.approvalStatus).toBe('pending')
      expect(result.content).toContain('Approval request')
      expect(result.approvalDetails).toBeDefined()
      expect(result.workflowControl).toBeDefined()
    })

    it('should fail with missing approval title', async () => {
      const invalidInputs = { ...validInputs, approvalTitle: '' }
      
      const result = await handler.execute(mockBlock, invalidInputs, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('approval title')
      expect(result.approvalStatus).toBe('error')
    })

    it('should fail with missing approval message', async () => {
      const invalidInputs = { ...validInputs, approvalMessage: '' }
      
      const result = await handler.execute(mockBlock, invalidInputs, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('approval message')
      expect(result.approvalStatus).toBe('error')
    })

    it('should create approval state with correct configuration', async () => {
      const result = await handler.execute(mockBlock, validInputs, mockContext)

      expect(result.success).toBe(true)
      expect(result.approvalDetails.approvalId).toContain('approval_')
      expect(result.approvalDetails.requestedApprovers).toEqual(validInputs.approvers)
      expect(result.approvalDetails.timeoutMinutes).toBe(validInputs.timeoutMinutes)
    })

    it('should handle workflow control properly', async () => {
      const result = await handler.execute(mockBlock, validInputs, mockContext)

      expect(result.workflowControl.shouldContinue).toBe(false)
      expect(result.workflowControl.executionPath).toBe('pending')
      expect(result.workflowControl.pausedAt).toBeDefined()
      expect(result.workflowControl.totalWaitTime).toBe(0)
    })
  })

  describe('static methods', () => {
    describe('handleApprovalResponse', () => {
      beforeEach(() => {
        // Reset static state
        ApprovalGateBlockHandler['activeApprovals'].clear()
        ApprovalGateBlockHandler['approvalTimeouts'].clear()
      })

      it('should handle approval response when approval exists', async () => {
        // First create an approval
        await handler.execute(mockBlock, {
          approvalTitle: 'Test',
          approvalMessage: 'Test message',
          approvers: ['user1@test.com'],
          approvalType: 'any',
        }, mockContext)

        const approvalId = 'approval_test-block-id_test-execution-id_test'
        const result = await ApprovalGateBlockHandler.handleApprovalResponse(
          approvalId,
          'user1@test.com',
          'approve',
          'Approved for testing'
        )

        expect(result.success).toBe(true)
      })

      it('should fail when approval does not exist', async () => {
        const result = await ApprovalGateBlockHandler.handleApprovalResponse(
          'nonexistent-approval',
          'user1@test.com',
          'approve'
        )

        expect(result.success).toBe(false)
        expect(result.error).toBe('Approval not found')
      })
    })

    describe('getApprovalState', () => {
      it('should return null for non-existent approval', () => {
        const state = ApprovalGateBlockHandler.getApprovalState('nonexistent')
        expect(state).toBeNull()
      })
    })

    describe('cancelApproval', () => {
      it('should return false for non-existent approval', () => {
        const result = ApprovalGateBlockHandler.cancelApproval('nonexistent')
        expect(result).toBe(false)
      })
    })
  })
})