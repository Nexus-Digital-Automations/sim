/**
 * Mode Switching Testing Framework
 *
 * Tests for seamless switching between visual (ReactFlow) and conversational (Journey) modes
 * with comprehensive state preservation validation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dualModeArchitecture,
  getWorkflowExecutionMode,
  initializeDualMode,
  isDualModeSupported,
  switchWorkflowMode,
} from '@/lib/workflow-journey-mapping/dual-mode-architecture'
import type { BlockState, WorkflowState } from '@/stores/workflows/workflow/types'

// Mock logger to prevent console spam during tests
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock block registry
vi.mock('@/blocks', () => ({
  getBlock: vi.fn((type: string) => ({
    type,
    Name: `Mock ${type} block`,
    description: `Mock block for ${type}`,
    icon: 'test-icon',
    category: 'test',
  })),
}))

describe('Hybrid Mode Switching Framework', () => {
  let mockWorkflowState: WorkflowState
  let testWorkflowId: string

  beforeEach(() => {
    testWorkflowId = `test-workflow-${Date.now()}`

    // Create comprehensive mock workflow state
    mockWorkflowState = {
      id: testWorkflowId,
      Name: 'Test Hybrid Workflow',
      blocks: {
        'block-1': {
          id: 'block-1',
          type: 'starter',
          Name: 'Start Block',
          position: { x: 100, y: 100 },
          enabled: true,
          config: { message: 'Starting workflow' },
        } as BlockState,
        'block-2': {
          id: 'block-2',
          type: 'condition',
          Name: 'Decision Block',
          position: { x: 300, y: 100 },
          enabled: true,
          config: { condition: 'user.age > 18' },
        } as BlockState,
        'block-3': {
          id: 'block-3',
          type: 'webhook',
          Name: 'API Call',
          position: { x: 500, y: 100 },
          enabled: true,
          config: { url: 'https://api.example.com', method: 'post' },
        } as BlockState,
      },
      edges: [
        {
          id: 'edge-1',
          source: 'block-1',
          target: 'block-2',
          sourceHandle: 'output',
          targetHandle: 'input',
          type: 'default',
        },
        {
          id: 'edge-2',
          source: 'block-2',
          target: 'block-3',
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
    // Cleanup dual-mode context
    await dualModeArchitecture.cleanup(testWorkflowId)
  })

  describe('Mode Switching Core Functionality', () => {
    it('should initialize dual-mode context successfully', async () => {
      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)

      expect(context.workflowId).toBe(testWorkflowId)
      expect(context.executionMode.mode).toBe('reactflow') // Default mode
      expect(context.synchronizationStatus.isInSync).toBe(true)
      expect(context.reactFlowState).toEqual(mockWorkflowState)
    })

    it('should support dual-mode for compatible workflows', async () => {
      const isSupported = await isDualModeSupported(mockWorkflowState)
      expect(isSupported).toBe(true)
    })

    it('should switch from ReactFlow to Journey mode', async () => {
      // Initialize dual-mode
      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)
      expect(context.executionMode.mode).toBe('reactflow')

      // Switch to journey mode
      await switchWorkflowMode(testWorkflowId, 'journey')

      // Verify mode switch
      const updatedMode = getWorkflowExecutionMode(testWorkflowId)
      expect(updatedMode?.mode).toBe('journey')
    })

    it('should switch from Journey to ReactFlow mode', async () => {
      // Initialize dual-mode
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Switch to journey mode first
      await switchWorkflowMode(testWorkflowId, 'journey')
      expect(getWorkflowExecutionMode(testWorkflowId)?.mode).toBe('journey')

      // Switch back to ReactFlow mode
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify mode switch
      const finalMode = getWorkflowExecutionMode(testWorkflowId)
      expect(finalMode?.mode).toBe('reactflow')
    })

    it('should preserve execution context during mode switches', async () => {
      // Initialize with specific state
      const initialContext = await initializeDualMode(testWorkflowId, mockWorkflowState)
      const initialBlockCount = Object.keys(initialContext.reactFlowState.blocks).length

      // Switch modes multiple times
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify context preservation
      const finalContext = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(finalContext).toBeDefined()
      expect(Object.keys(finalContext!.reactFlowState.blocks)).toHaveLength(initialBlockCount)
      expect(finalContext!.workflowId).toBe(testWorkflowId)
    })

    it('should handle rapid mode switching without corruption', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Perform rapid mode switches
      const switches = []
      for (let i = 0; i < 10; i++) {
        const mode = i % 2 === 0 ? 'journey' : 'reactflow'
        switches.push(switchWorkflowMode(testWorkflowId, mode))
      }

      // Wait for all switches to complete
      await Promise.all(switches)

      // Verify final state integrity
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(context).toBeDefined()
      expect(context!.synchronizationStatus.isInSync).toBe(true)
    })

    it('should reject invalid mode switches', async () => {
      // Try to switch mode without initialization
      await expect(switchWorkflowMode('non-existent-workflow', 'journey')).rejects.toThrow(
        'No dual-mode context found'
      )
    })

    it('should handle mode switch failures gracefully', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Mock synchronization failure
      const originalSync = dualModeArchitecture.synchronizeStates
      vi.spyOn(dualModeArchitecture, 'synchronizeStates').mockRejectedValue(
        new Error('Sync failed')
      )

      // Attempt mode switch - should fail gracefully
      await expect(switchWorkflowMode(testWorkflowId, 'journey')).rejects.toThrow()

      // Restore original method
      dualModeArchitecture.synchronizeStates = originalSync
    })
  })

  describe('State Preservation Validation', () => {
    it('should preserve workflow metadata during mode switch', async () => {
      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)
      const originalName = context.reactFlowState.Name
      const originalBlockIds = Object.keys(context.reactFlowState.blocks)

      // Switch modes
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify metadata preservation
      const finalContext = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(finalContext!.reactFlowState.Name).toBe(originalName)
      expect(Object.keys(finalContext!.reactFlowState.blocks)).toEqual(originalBlockIds)
    })

    it('should preserve block configurations during mode switches', async () => {
      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)
      const originalConfigs = Object.fromEntries(
        Object.entries(context.reactFlowState.blocks).map(([id, block]) => [
          id,
          { ...block.config },
        ])
      )

      // Switch modes
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify configuration preservation
      const finalContext = dualModeArchitecture.getExecutionContext(testWorkflowId)
      for (const [blockId, block] of Object.entries(finalContext!.reactFlowState.blocks)) {
        expect(block.config).toEqual(originalConfigs[blockId])
      }
    })

    it('should preserve edge connections during mode switches', async () => {
      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)
      const originalEdges = context.reactFlowState.edges.map((edge) => ({ ...edge }))

      // Switch modes
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify edge preservation
      const finalContext = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(finalContext!.reactFlowState.edges).toHaveLength(originalEdges.length)

      for (let i = 0; i < originalEdges.length; i++) {
        const original = originalEdges[i]
        const final = finalContext!.reactFlowState.edges[i]

        expect(final.source).toBe(original.source)
        expect(final.target).toBe(original.target)
        expect(final.sourceHandle).toBe(original.sourceHandle)
        expect(final.targetHandle).toBe(original.targetHandle)
      }
    })

    it('should preserve workflow viewport during mode switches', async () => {
      const customViewport = { x: 250, y: 150, zoom: 1.5 }
      mockWorkflowState.viewport = customViewport

      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Switch modes
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify viewport preservation
      const finalContext = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(finalContext!.reactFlowState.viewport).toEqual(customViewport)
    })

    it('should maintain block enabled/disabled states', async () => {
      // Set some blocks to disabled
      mockWorkflowState.blocks['block-2'].enabled = false
      mockWorkflowState.blocks['block-3'].enabled = false

      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Switch modes
      await switchWorkflowMode(testWorkflowId, 'journey')
      await switchWorkflowMode(testWorkflowId, 'reactflow')

      // Verify enabled states preserved
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(context!.reactFlowState.blocks['block-1'].enabled).toBe(true)
      expect(context!.reactFlowState.blocks['block-2'].enabled).toBe(false)
      expect(context!.reactFlowState.blocks['block-3'].enabled).toBe(false)
    })
  })

  describe('Performance and Memory Management', () => {
    it('should cleanup resources properly', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Verify context exists
      expect(dualModeArchitecture.getExecutionContext(testWorkflowId)).toBeDefined()

      // Cleanup
      await dualModeArchitecture.cleanup(testWorkflowId)

      // Verify cleanup
      expect(dualModeArchitecture.getExecutionContext(testWorkflowId)).toBeUndefined()
    })

    it('should handle multiple concurrent mode switches', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Create multiple concurrent switch operations
      const switches = [
        switchWorkflowMode(testWorkflowId, 'journey'),
        switchWorkflowMode(testWorkflowId, 'reactflow'),
        switchWorkflowMode(testWorkflowId, 'journey'),
      ]

      // Should handle gracefully without corruption
      await Promise.allSettled(switches)

      // Verify system remains stable
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(context).toBeDefined()
      expect(context!.workflowId).toBe(testWorkflowId)
    })

    it('should measure mode switch performance', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Measure switch to journey mode
      const journeyStart = performance.now()
      await switchWorkflowMode(testWorkflowId, 'journey')
      const journeyTime = performance.now() - journeyStart

      // Measure switch back to ReactFlow mode
      const reactflowStart = performance.now()
      await switchWorkflowMode(testWorkflowId, 'reactflow')
      const reactflowTime = performance.now() - reactflowStart

      // Performance assertions (reasonable thresholds)
      expect(journeyTime).toBeLessThan(1000) // < 1 second
      expect(reactflowTime).toBeLessThan(1000) // < 1 second

      console.log(`Journey switch time: ${journeyTime}ms`)
      console.log(`ReactFlow switch time: ${reactflowTime}ms`)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should recover from journey mode initialization failures', async () => {
      // Mock journey state initialization failure
      const originalInitJourney = dualModeArchitecture.initializeJourneyState
      vi.spyOn(dualModeArchitecture as any, 'initializeJourneyState').mockRejectedValue(
        new Error('Journey init failed')
      )

      // Should still initialize successfully in ReactFlow-only mode
      const context = await initializeDualMode(testWorkflowId, mockWorkflowState)
      expect(context.executionMode.mode).toBe('reactflow')
      expect(context.journeyState).toBeUndefined()

      // Restore original method
      ;(dualModeArchitecture as any).initializeJourneyState = originalInitJourney
    })

    it('should handle synchronization errors gracefully', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)

      // Mock synchronization failure
      vi.spyOn(dualModeArchitecture, 'synchronizeStates').mockRejectedValue(new Error('Sync error'))

      // Mode switch should fail but not corrupt system
      await expect(switchWorkflowMode(testWorkflowId, 'journey')).rejects.toThrow()

      // System should remain stable
      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)
      expect(context).toBeDefined()
      expect(context!.executionMode.mode).toBe('reactflow') // Should remain in original mode
    })

    it('should validate workflow compatibility before mode initialization', async () => {
      // Create incompatible workflow state
      const incompatibleWorkflow = {
        ...mockWorkflowState,
        blocks: {}, // Empty blocks should be incompatible
      }

      // Should handle gracefully
      const isSupported = await isDualModeSupported(incompatibleWorkflow)
      expect(isSupported).toBe(false)
    })
  })
})
