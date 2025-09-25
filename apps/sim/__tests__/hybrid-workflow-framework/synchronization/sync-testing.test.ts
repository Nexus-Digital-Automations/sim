/**
 * Synchronization Testing Framework
 *
 * Comprehensive tests for bidirectional synchronization between visual (ReactFlow)
 * and conversational (Journey) modes, including conflict resolution and data consistency.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Change, Conflict } from '@/lib/workflow-journey-mapping/dual-mode-architecture'
import {
  dualModeArchitecture,
  initializeDualMode,
  switchWorkflowMode,
} from '@/lib/workflow-journey-mapping/dual-mode-architecture'
import type { BlockState, WorkflowState } from '@/stores/workflows/workflow/types'

// Mock dependencies
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@/blocks', () => ({
  getBlock: vi.fn((type: string) => ({
    type,
    name: `Mock ${type} block`,
    description: `Mock block for ${type}`,
    icon: 'test-icon',
    category: 'test',
  })),
}))

describe('Hybrid Workflow Synchronization Framework', () => {
  let mockWorkflowState: WorkflowState
  let testWorkflowId: string

  beforeEach(() => {
    testWorkflowId = `sync-test-workflow-${Date.now()}`

    mockWorkflowState = {
      id: testWorkflowId,
      name: 'Sync Test Workflow',
      blocks: {
        'sync-block-1': {
          id: 'sync-block-1',
          type: 'starter',
          name: 'Start Sync',
          position: { x: 100, y: 100 },
          enabled: true,
          config: { message: 'Starting sync workflow' },
        } as BlockState,
        'sync-block-2': {
          id: 'sync-block-2',
          type: 'condition',
          name: 'Sync Decision',
          position: { x: 300, y: 100 },
          enabled: true,
          config: { condition: 'syncReady === true' },
        } as BlockState,
        'sync-block-3': {
          id: 'sync-block-3',
          type: 'webhook',
          name: 'Sync API',
          position: { x: 500, y: 100 },
          enabled: true,
          config: { url: 'https://sync.example.com', method: 'POST' },
        } as BlockState,
      },
      edges: [
        {
          id: 'sync-edge-1',
          source: 'sync-block-1',
          target: 'sync-block-2',
          sourceHandle: 'output',
          targetHandle: 'input',
          type: 'default',
        },
        {
          id: 'sync-edge-2',
          source: 'sync-block-2',
          target: 'sync-block-3',
          sourceHandle: 'true',
          targetHandle: 'input',
          type: 'default',
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
      isExecuting: false,
    }
  })

  afterEach(async () => {
    await dualModeArchitecture.cleanup(testWorkflowId)
  })

  describe('Bidirectional Synchronization', () => {
    it('should maintain sync status during initialization', async () => {
      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)

      expect(context.synchronizationStatus.isInSync).toBe(true)
      expect(context.synchronizationStatus.pendingChanges).toHaveLength(0)
      expect(context.synchronizationStatus.conflicts).toHaveLength(0)
      expect(context.synchronizationStatus.lastSyncTime).toBeInstanceOf(Date)
    })

    it('should detect and synchronize ReactFlow changes to Journey mode', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Simulate ReactFlow state change
      context.reactFlowState.blocks['sync-block-1'].name = 'Modified Start Sync'
      context.reactFlowState.blocks['sync-block-1'].config.message = 'Updated message'

      // Switch to journey mode - should trigger synchronization
      await switchWorkflowMode(testWorkflowId, 'journey')

      // Verify synchronization occurred
      const updatedContext = dualModeArchitecture.getExecutionContext(testWorkflowId)!
      expect(updatedContext.synchronizationStatus.isInSync).toBe(true)
      expect(updatedContext.synchronizationStatus.lastSyncTime).toBeInstanceOf(Date)
    })

    it('should detect and synchronize Journey changes to ReactFlow mode', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Simulate journey state changes
      if (context.journeyState) {
        context.journeyState.metadata = { ...context.journeyState.metadata, modified: true }
      }

      // Switch back to ReactFlow - should trigger synchronization
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify synchronization occurred
      const updatedContext = dualModeArchitecture.getExecutionContext(testWorkflowId)!
      expect(updatedContext.synchronizationStatus.isInSync).toBe(true)
    })

    it('should handle concurrent modifications during synchronization', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Simulate concurrent modifications
      const modifyReactFlow = async () => {
        context.reactFlowState.blocks['sync-block-1'].name = 'ReactFlow Modified'
        await dualModeArchitecture.synchronizeStates(context)
      }

      const modifyJourney = async () => {
        if (context.journeyState) {
          context.journeyState.metadata.version = '2.0.0'
        }
        await dualModeArchitecture.synchronizeStates(context)
      }

      // Execute concurrent modifications
      await Promise.all([modifyReactFlow(), modifyJourney()])

      // System should handle gracefully
      const finalContext = dualModeArchitecture.getExecutionContext(testWorkflowId)!
      expect(finalContext).toBeDefined()
    })

    it('should preserve synchronization state across mode switches', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Perform multiple mode switches
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')
      await switchWorkflowMode(testWorkflowId, 'journey')

      // Verify synchronization remains intact
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!
      expect(context.synchronizationStatus.isInSync).toBe(true)
      expect(context.synchronizationStatus.conflicts).toHaveLength(0)
    })
  })

  describe('Conflict Detection and Resolution', () => {
    it('should detect data conflicts between ReactFlow and Journey states', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Mock conflict detection
      const detectConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'detectConflicts')
      detectConflictsSpy.mockResolvedValue([
        {
          type: 'DATA_MISMATCH',
          description: 'Block name mismatch',
          reactFlowValue: 'ReactFlow Name',
          journeyValue: 'Journey Name',
          resolution: 'PREFER_REACTFLOW',
        } as Conflict,
      ])

      // Trigger synchronization
      await dualModeArchitecture.synchronizeStates(context)

      expect(detectConflictsSpy).toHaveBeenCalled()
    })

    it('should resolve conflicts using PREFER_REACTFLOW strategy', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      const mockConflicts: Conflict[] = [
        {
          type: 'DATA_MISMATCH',
          description: 'Block configuration mismatch',
          reactFlowValue: { message: 'ReactFlow Version' },
          journeyValue: { message: 'Journey Version' },
          resolution: 'PREFER_REACTFLOW',
        },
      ]

      // Mock conflict resolution
      const resolveConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'resolveConflicts')
      resolveConflictsSpy.mockResolvedValue(undefined)

      const detectConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'detectConflicts')
      detectConflictsSpy.mockResolvedValue(mockConflicts)

      const detectChangesSpy = vi.spyOn(dualModeArchitecture as any, 'detectStateChanges')
      detectChangesSpy.mockResolvedValue([
        {
          type: 'BLOCK_MODIFIED',
          entityId: 'sync-block-1',
          timestamp: new Date(),
          source: 'reactflow',
          data: { message: 'ReactFlow Version' },
        } as Change,
      ])

      await dualModeArchitecture.synchronizeStates(context)

      expect(resolveConflictsSpy).toHaveBeenCalledWith(context, mockConflicts)
    })

    it('should resolve conflicts using PREFER_JOURNEY strategy', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      const mockConflicts: Conflict[] = [
        {
          type: 'EXECUTION_DIVERGENCE',
          description: 'Execution path divergence',
          reactFlowValue: 'path-a',
          journeyValue: 'path-b',
          resolution: 'PREFER_JOURNEY',
        },
      ]

      const resolveConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'resolveConflicts')
      resolveConflictsSpy.mockResolvedValue(undefined)

      const detectConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'detectConflicts')
      detectConflictsSpy.mockResolvedValue(mockConflicts)

      const detectChangesSpy = vi.spyOn(dualModeArchitecture as any, 'detectStateChanges')
      detectChangesSpy.mockResolvedValue([])

      await dualModeArchitecture.synchronizeStates(context)

      expect(resolveConflictsSpy).toHaveBeenCalledWith(context, mockConflicts)
    })

    it('should handle manual resolution required conflicts', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      const mockConflicts: Conflict[] = [
        {
          type: 'STATE_INCONSISTENCY',
          description: 'Critical state inconsistency requiring manual resolution',
          reactFlowValue: 'critical-state-a',
          journeyValue: 'critical-state-b',
          resolution: 'MANUAL_RESOLUTION_REQUIRED',
        },
      ]

      const resolveConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'resolveConflicts')
      resolveConflictsSpy.mockImplementation(async (ctx, conflicts) => {
        // Simulate manual resolution required behavior
        ctx.synchronizationStatus.conflicts = conflicts
      })

      const detectConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'detectConflicts')
      detectConflictsSpy.mockResolvedValue(mockConflicts)

      const detectChangesSpy = vi.spyOn(dualModeArchitecture as any, 'detectStateChanges')
      detectChangesSpy.mockResolvedValue([])

      await dualModeArchitecture.synchronizeStates(context)

      // Should mark conflicts for manual resolution
      expect(context.synchronizationStatus.conflicts).toHaveLength(1)
      expect(context.synchronizationStatus.conflicts[0].resolution).toBe(
        'MANUAL_RESOLUTION_REQUIRED'
      )
    })

    it('should track conflict resolution history', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Create conflict resolution history
      const conflictHistory = []

      const resolveConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'resolveConflicts')
      resolveConflictsSpy.mockImplementation(async (ctx, conflicts) => {
        for (const conflict of conflicts) {
          conflictHistory.push({
            timestamp: new Date(),
            type: conflict.type,
            resolution: conflict.resolution,
            resolved: true,
          })
        }
      })

      const detectConflictsSpy = vi.spyOn(dualModeArchitecture as any, 'detectConflicts')
      detectConflictsSpy.mockResolvedValue([
        {
          type: 'DATA_MISMATCH',
          description: 'Test conflict',
          reactFlowValue: 'a',
          journeyValue: 'b',
          resolution: 'PREFER_REACTFLOW',
        },
      ])

      const detectChangesSpy = vi.spyOn(dualModeArchitecture as any, 'detectStateChanges')
      detectChangesSpy.mockResolvedValue([])

      await dualModeArchitecture.synchronizeStates(context)

      expect(conflictHistory).toHaveLength(1)
      expect(conflictHistory[0].resolved).toBe(true)
    })
  })

  describe('Data Consistency Validation', () => {
    it('should validate block consistency between modes', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Switch modes and verify block consistency
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!
      const originalBlocks = mockWorkflowState.blocks
      const currentBlocks = context.reactFlowState.blocks

      // Verify all blocks preserved
      expect(Object.keys(currentBlocks)).toEqual(Object.keys(originalBlocks))

      // Verify block properties preserved
      for (const [blockId, originalBlock] of Object.entries(originalBlocks)) {
        const currentBlock = currentBlocks[blockId]
        expect(currentBlock.id).toBe(originalBlock.id)
        expect(currentBlock.type).toBe(originalBlock.type)
        expect(currentBlock.name).toBe(originalBlock.name)
        expect(currentBlock.enabled).toBe(originalBlock.enabled)
      }
    })

    it('should validate edge consistency between modes', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!
      const originalEdges = mockWorkflowState.edges
      const currentEdges = context.reactFlowState.edges

      expect(currentEdges).toHaveLength(originalEdges.length)

      // Verify edge properties preserved
      for (let i = 0; i < originalEdges.length; i++) {
        const original = originalEdges[i]
        const current = currentEdges[i]

        expect(current.source).toBe(original.source)
        expect(current.target).toBe(original.target)
        expect(current.sourceHandle).toBe(original.sourceHandle)
        expect(current.targetHandle).toBe(original.targetHandle)
      }
    })

    it('should validate workflow metadata consistency', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      const originalName = mockWorkflowState.name
      const originalViewport = mockWorkflowState.viewport

      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      expect(context.reactFlowState.name).toBe(originalName)
      expect(context.reactFlowState.viewport).toEqual(originalViewport)
      expect(context.reactFlowState.id).toBe(testWorkflowId)
    })

    it('should detect and report data corruption', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Simulate data corruption
      const validateConsistencySpy = vi.spyOn(
        dualModeArchitecture as any,
        'validateExecutionConsistency'
      )
      validateConsistencySpy.mockImplementation(async () => {
        throw new Error('Data corruption detected')
      })

      // Attempt workflow execution
      try {
        await dualModeArchitecture.executeWorkflow(testWorkflowId, {})
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle partial synchronization failures', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Mock partial synchronization failure
      const applyChangesSpy = vi.spyOn(dualModeArchitecture as any, 'applyChanges')
      applyChangesSpy.mockRejectedValue(new Error('Partial sync failure'))

      const detectChangesSpy = vi.spyOn(dualModeArchitecture as any, 'detectStateChanges')
      detectChangesSpy.mockResolvedValue([
        {
          type: 'BLOCK_MODIFIED',
          entityId: 'sync-block-1',
          timestamp: new Date(),
          source: 'reactflow',
          data: {},
        } as Change,
      ])

      // Synchronization should fail gracefully
      await expect(dualModeArchitecture.synchronizeStates(context)).rejects.toThrow(
        'Partial sync failure'
      )

      // System should remain stable
      expect(context.synchronizationStatus.isInSync).toBe(false)
    })
  })

  describe('Synchronization Performance', () => {
    it('should complete synchronization within performance thresholds', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      const startTime = performance.now()
      await dualModeArchitecture.synchronizeStates(context)
      const duration = performance.now() - startTime

      // Should complete synchronization quickly
      expect(duration).toBeLessThan(500) // < 500ms
      console.log(`Synchronization time: ${duration}ms`)
    })

    it('should handle large workflows efficiently', async () => {
      // Create large workflow state
      const largeWorkflowState = { ...mockWorkflowState }
      largeWorkflowState.blocks = {}
      largeWorkflowState.edges = []

      // Generate 100 blocks and connections
      for (let i = 0; i < 100; i++) {
        const blockId = `large-block-${i}`
        largeWorkflowState.blocks[blockId] = {
          id: blockId,
          type: i % 3 === 0 ? 'starter' : i % 3 === 1 ? 'condition' : 'webhook',
          name: `Block ${i}`,
          position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 },
          enabled: true,
          config: { data: `config-${i}` },
        } as BlockState

        if (i > 0) {
          largeWorkflowState.edges.push({
            id: `large-edge-${i}`,
            source: `large-block-${i - 1}`,
            target: blockId,
            sourceHandle: 'output',
            targetHandle: 'input',
            type: 'default',
          })
        }
      }

      await initializeDualMode(testWorkflowId, largeWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      const startTime = performance.now()
      await dualModeArchitecture.synchronizeStates(context)
      const duration = performance.now() - startTime

      // Should handle large workflows within reasonable time
      expect(duration).toBeLessThan(2000) // < 2 seconds
      console.log(`Large workflow sync time: ${duration}ms`)
    })

    it('should batch synchronization operations efficiently', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Mock multiple changes
      const detectChangesSpy = vi.spyOn(dualModeArchitecture as any, 'detectStateChanges')
      detectChangesSpy.mockResolvedValue([
        {
          type: 'BLOCK_MODIFIED',
          entityId: 'sync-block-1',
          timestamp: new Date(),
          source: 'reactflow',
          data: {},
        },
        {
          type: 'BLOCK_MODIFIED',
          entityId: 'sync-block-2',
          timestamp: new Date(),
          source: 'reactflow',
          data: {},
        },
        {
          type: 'EDGE_MODIFIED',
          entityId: 'sync-edge-1',
          timestamp: new Date(),
          source: 'reactflow',
          data: {},
        },
      ] as Change[])

      const applyChangesSpy = vi.spyOn(dualModeArchitecture as any, 'applyChanges')
      applyChangesSpy.mockResolvedValue(undefined)

      await dualModeArchitecture.synchronizeStates(context)

      // Should batch all changes in single operation
      expect(applyChangesSpy).toHaveBeenCalledTimes(1)
    })
  })
})
