/**
 * Performance Benchmark Tests for Advanced Automation
 *
 * Performance tests to ensure the advanced automation handlers
 * meet enterprise-grade performance requirements.
 *
 * @author Claude Code Assistant
 * @created 2025-09-03
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdvancedConditionBlockHandler } from '@/executor/handlers/advanced-condition'
import { SwitchBlockHandler } from '@/executor/handlers/switch'
import { ApprovalGateBlockHandler } from '@/executor/handlers/approval-gate'
import { AdvancedScheduleBlockHandler } from '@/executor/handlers/advanced-schedule'
import type { SerializedBlock } from '@/serializer/types'
import type { ExecutionContext } from '@/executor/types'

// Mock dependencies for performance testing
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('@/blocks/blocks/advanced-condition', () => ({
  COMPARISON_OPERATORS: {
    '==': (left: any, right: any) => left === right,
    '>': (left: any, right: any) => left > right,
  },
  evaluateJSExpression: vi.fn(() => ({ success: true, result: true, duration: 1 })),
  evaluateMultipleConditions: vi.fn(() => ({
    success: true,
    finalResult: true,
    conditionResults: [],
    trueConditions: 1,
    falseConditions: 0,
    evaluationTime: 1,
  })),
}))

vi.mock('@/blocks/blocks/switch', () => ({
  evaluateExpression: vi.fn(() => ({ success: true, result: 'test' })),
  processSwitch: vi.fn(() => ({
    matchedCase: { caseId: 'test', caseLabel: 'Test', isDefaultCase: false },
    totalCases: 1,
  })),
}))

vi.mock('@/blocks/blocks/approval-gate', () => ({
  generateApprovalId: vi.fn(() => 'test-id'),
  validateApprovers: vi.fn(() => ({ isValid: true })),
  calculateApprovalRequirements: vi.fn(() => ({
    totalApprovers: 1,
    requiredApprovals: 1,
    allowPartialApproval: true,
    approvalThreshold: 1,
  })),
  generateApprovalNotification: vi.fn(() => ({ subject: 'Test', message: 'Test', priority: 'normal', metadata: {} })),
}))

vi.mock('@/blocks/blocks/advanced-schedule', () => ({
  simpleToCron: vi.fn(() => '0 * * * *'),
  validateCronExpression: vi.fn(() => ({ isValid: true, humanReadable: 'Test' })),
  generateSchedulePreview: vi.fn(() => ['2025-09-04T00:00:00.000Z']),
}))

describe('Performance Benchmark Tests', () => {
  let mockContext: ExecutionContext

  beforeEach(() => {
    mockContext = {
      workflowId: 'test-workflow',
      executionId: 'test-execution',
      blockStates: new Map(),
      activeExecutionPath: new Set(),
      workflowVariables: {},
      environmentVariables: {},
    } as ExecutionContext
  })

  describe('Advanced Condition Handler Performance', () => {
    it('should execute condition evaluation within performance targets', async () => {
      const handler = new AdvancedConditionBlockHandler()
      const block: SerializedBlock = {
        id: 'test-condition',
        type: 'advanced-condition',
        metadata: { id: 'advanced-condition', name: 'Test Condition' },
      } as SerializedBlock

      const inputs = {
        logicalOperator: 'AND',
        evaluationMode: 'expression',
        jsExpression: 'true',
        errorHandling: 'fail',
        caseSensitive: true,
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(100) // Should execute within 100ms
    })

    it('should handle high-volume condition evaluations efficiently', async () => {
      const handler = new AdvancedConditionBlockHandler()
      const block: SerializedBlock = {
        id: 'test-condition',
        type: 'advanced-condition',
        metadata: { id: 'advanced-condition', name: 'Test Condition' },
      } as SerializedBlock

      const inputs = {
        logicalOperator: 'AND',
        evaluationMode: 'simple',
        simpleConditions: Array(100).fill({
          leftExpression: 'true',
          operator: '==',
          rightExpression: 'true',
        }),
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(500) // Should handle 100 conditions within 500ms
    })
  })

  describe('Switch Handler Performance', () => {
    it('should execute switch evaluation within performance targets', async () => {
      const handler = new SwitchBlockHandler()
      const block: SerializedBlock = {
        id: 'test-switch',
        type: 'switch',
        metadata: { id: 'switch', name: 'Test Switch' },
      } as SerializedBlock

      const inputs = {
        expression: '"test"',
        cases: [
          { caseValue: 'test', caseLabel: 'Test Case' },
        ],
        defaultCase: true,
        strictComparison: true,
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(50) // Should execute within 50ms
    })

    it('should handle multiple cases efficiently', async () => {
      const handler = new SwitchBlockHandler()
      const block: SerializedBlock = {
        id: 'test-switch',
        type: 'switch',
        metadata: { id: 'switch', name: 'Test Switch' },
      } as SerializedBlock

      const inputs = {
        expression: '"case50"',
        cases: Array(100).fill(null).map((_, i) => ({
          caseValue: `case${i}`,
          caseLabel: `Case ${i}`,
        })),
        defaultCase: true,
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(200) // Should handle 100 cases within 200ms
    })
  })

  describe('Approval Gate Handler Performance', () => {
    it('should execute approval creation within performance targets', async () => {
      const handler = new ApprovalGateBlockHandler()
      const block: SerializedBlock = {
        id: 'test-approval',
        type: 'approval-gate',
        metadata: { id: 'approval-gate', name: 'Test Approval' },
      } as SerializedBlock

      const inputs = {
        approvalTitle: 'Test Approval',
        approvalMessage: 'Test message',
        approvers: ['user1@test.com'],
        approvalType: 'any',
        timeoutMinutes: 60,
        notificationMethod: ['email'],
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(200) // Should create approval within 200ms
    })

    it('should handle multiple approvers efficiently', async () => {
      const handler = new ApprovalGateBlockHandler()
      const block: SerializedBlock = {
        id: 'test-approval',
        type: 'approval-gate',
        metadata: { id: 'approval-gate', name: 'Test Approval' },
      } as SerializedBlock

      const inputs = {
        approvalTitle: 'Test Approval',
        approvalMessage: 'Test message',
        approvers: Array(50).fill(null).map((_, i) => `user${i}@test.com`),
        approvalType: 'majority',
        timeoutMinutes: 60,
        notificationMethod: ['email'],
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Should handle 50 approvers within 1s
    })
  })

  describe('Advanced Schedule Handler Performance', () => {
    it('should execute schedule configuration within performance targets', async () => {
      const handler = new AdvancedScheduleBlockHandler()
      const block: SerializedBlock = {
        id: 'test-schedule',
        type: 'advanced-schedule',
        metadata: { id: 'advanced-schedule', name: 'Test Schedule' },
      } as SerializedBlock

      const inputs = {
        schedulingMode: 'simple',
        simpleInterval: 'hours',
        simpleValue: '1',
        timezone: 'UTC',
        enabled: true,
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(100) // Should configure schedule within 100ms
    })

    it('should handle complex cron expressions efficiently', async () => {
      const handler = new AdvancedScheduleBlockHandler()
      const block: SerializedBlock = {
        id: 'test-schedule',
        type: 'advanced-schedule',
        metadata: { id: 'advanced-schedule', name: 'Test Schedule' },
      } as SerializedBlock

      const inputs = {
        schedulingMode: 'cron',
        cronExpression: '0 0,6,12,18 * * *',
        timezone: 'America/New_York',
        enabled: true,
        enableMonitoring: true,
      }

      const startTime = performance.now()
      const result = await handler.execute(block, inputs, mockContext)
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(150) // Should handle complex cron within 150ms
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not create memory leaks during repeated executions', async () => {
      const handler = new AdvancedConditionBlockHandler()
      const block: SerializedBlock = {
        id: 'memory-test',
        type: 'advanced-condition',
        metadata: { id: 'advanced-condition', name: 'Memory Test' },
      } as SerializedBlock

      const inputs = {
        logicalOperator: 'AND',
        evaluationMode: 'expression',
        jsExpression: 'Math.random() > 0.5',
      }

      // Track initial memory usage (simplified for test)
      const initialMemory = process.memoryUsage().heapUsed

      // Execute multiple times
      for (let i = 0; i < 1000; i++) {
        await handler.execute(block, inputs, mockContext)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB for 1000 executions)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('Concurrent Execution Performance', () => {
    it('should handle concurrent executions without performance degradation', async () => {
      const handler = new SwitchBlockHandler()
      const block: SerializedBlock = {
        id: 'concurrent-test',
        type: 'switch',
        metadata: { id: 'switch', name: 'Concurrent Test' },
      } as SerializedBlock

      const inputs = {
        expression: 'Math.floor(Math.random() * 10)',
        cases: Array(10).fill(null).map((_, i) => ({
          caseValue: i,
          caseLabel: `Case ${i}`,
        })),
        defaultCase: true,
      }

      const startTime = performance.now()
      
      // Execute 100 concurrent operations
      const promises = Array(100).fill(null).map(() =>
        handler.execute(block, inputs, { ...mockContext, executionId: Math.random().toString() })
      )

      const results = await Promise.all(promises)
      const duration = performance.now() - startTime

      expect(results.every(r => r.success)).toBe(true)
      expect(duration).toBeLessThan(5000) // All 100 concurrent executions within 5s
      expect(results.length).toBe(100)
    })
  })
})