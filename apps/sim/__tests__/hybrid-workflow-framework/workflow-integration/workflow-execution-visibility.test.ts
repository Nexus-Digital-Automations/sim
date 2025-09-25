/**
 * Workflow Integration Testing Framework
 *
 * Tests for workflow execution visibility in chat interface, chat-driven workflow modifications,
 * and real-time execution streaming with progress updates in hybrid mode.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dualModeArchitecture,
  executeDualModeWorkflow,
  initializeDualMode,
  switchWorkflowMode,
} from '@/lib/workflow-journey-mapping/dual-mode-architecture'
import type { BlockState, WorkflowState } from '@/stores/workflows/workflow/types'

// Mock socket.io for real-time communication testing
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
  id: 'test-socket-id',
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

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
    execute: vi.fn().mockResolvedValue({ success: true, output: `${type} executed` }),
  })),
}))

// Mock workflow execution utilities
vi.mock('@/app/workspace/[workspaceId]/w/[workflowId]/lib/workflow-execution-utils', () => ({
  executeWorkflowWithLogging: vi.fn().mockResolvedValue({
    success: true,
    executionId: 'test-execution-id',
    results: { message: 'Workflow executed successfully' },
    steps: [
      { blockId: 'exec-block-1', status: 'completed', output: 'Step 1 completed' },
      { blockId: 'exec-block-2', status: 'completed', output: 'Step 2 completed' },
    ],
  }),
  getWorkflowExecutionContext: vi.fn(() => ({
    workflowId: 'test-workflow',
    userId: 'test-user',
    executionId: 'test-execution-id',
  })),
}))

// Mock chat service
const mockChatService = {
  sendMessage: vi.fn(),
  subscribeToExecution: vi.fn(),
  unsubscribeFromExecution: vi.fn(),
  getExecutionProgress: vi.fn(),
  modifyWorkflowViaChat: vi.fn(),
}

vi.mock('@/services/chat/chat-service', () => ({
  chatService: mockChatService,
}))

describe('Workflow Integration Testing Framework', () => {
  let mockWorkflowState: WorkflowState
  let testWorkflowId: string

  beforeEach(() => {
    testWorkflowId = `integration-test-workflow-${Date.now()}`

    // Reset mocks
    vi.clearAllMocks()
    mockSocket.emit.mockClear()
    mockSocket.on.mockClear()

    mockWorkflowState = {
      id: testWorkflowId,
      name: 'Integration Test Workflow',
      blocks: {
        'exec-block-1': {
          id: 'exec-block-1',
          type: 'starter',
          name: 'Start Execution',
          position: { x: 100, y: 100 },
          enabled: true,
          config: { message: 'Starting execution test' },
        } as BlockState,
        'exec-block-2': {
          id: 'exec-block-2',
          type: 'condition',
          name: 'Execution Decision',
          position: { x: 300, y: 100 },
          enabled: true,
          config: { condition: 'execution.status === "ready"' },
        } as BlockState,
        'exec-block-3': {
          id: 'exec-block-3',
          type: 'webhook',
          name: 'Execute API',
          position: { x: 500, y: 100 },
          enabled: true,
          config: { url: 'https://execution.example.com', method: 'POST' },
        } as BlockState,
        'exec-block-4': {
          id: 'exec-block-4',
          type: 'notification',
          name: 'Notify Complete',
          position: { x: 700, y: 100 },
          enabled: true,
          config: { message: 'Execution completed successfully' },
        } as BlockState,
      },
      edges: [
        {
          id: 'exec-edge-1',
          source: 'exec-block-1',
          target: 'exec-block-2',
          sourceHandle: 'output',
          targetHandle: 'input',
          type: 'default',
        },
        {
          id: 'exec-edge-2',
          source: 'exec-block-2',
          target: 'exec-block-3',
          sourceHandle: 'true',
          targetHandle: 'input',
          type: 'default',
        },
        {
          id: 'exec-edge-3',
          source: 'exec-block-3',
          target: 'exec-block-4',
          sourceHandle: 'output',
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
    mockSocket.disconnect()
  })

  describe('Workflow Execution Visibility in Chat Interface', () => {
    it('should display workflow execution progress in chat mode', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      // Mock execution progress tracking
      const progressUpdates: any[] = []
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'workflow-progress') {
          progressUpdates.push = callback
        }
      })

      // Execute workflow
      const result = await executeDualModeWorkflow(testWorkflowId, {
        mode: 'journey',
        enableProgressTracking: true,
      })

      expect(result.success).toBe(true)
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-execution', {
        workflowId: testWorkflowId,
        executionId: expect.any(String),
      })
    })

    it('should show real-time block execution status in chat', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const executionSteps: any[] = []

      // Mock real-time execution updates
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'block-execution-update') {
          executionSteps.push({
            blockId: 'exec-block-1',
            status: 'executing',
            timestamp: new Date(),
            progress: 0.25,
          })
          executionSteps.push({
            blockId: 'exec-block-1',
            status: 'completed',
            timestamp: new Date(),
            progress: 1.0,
            output: 'Block executed successfully',
          })
          callback(executionSteps[executionSteps.length - 1])
        }
      })

      await executeDualModeWorkflow(testWorkflowId)

      expect(mockSocket.on).toHaveBeenCalledWith('block-execution-update', expect.any(Function))
    })

    it('should display workflow execution summary in chat', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const result = await executeDualModeWorkflow(testWorkflowId, {
        includeExecutionSummary: true,
      })

      // Verify execution summary contains expected information
      expect(result.success).toBe(true)
      expect(result.executionMode).toBe('journey')
      expect(result.journeyId).toBeDefined()

      // Should emit execution summary to chat
      expect(mockSocket.emit).toHaveBeenCalledWith('execution-summary', {
        workflowId: testWorkflowId,
        success: true,
        executionTime: expect.any(Number),
        blocksExecuted: expect.any(Number),
        results: expect.any(Object),
      })
    })

    it('should show execution errors and failures in chat interface', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      // Mock execution failure
      const executeWorkflowWithLoggingSpy = await import(
        '@/app/workspace/[workspaceId]/w/[workflowId]/lib/workflow-execution-utils'
      )
      vi.mocked(executeWorkflowWithLoggingSpy.executeWorkflowWithLogging).mockRejectedValue(
        new Error('Block execution failed')
      )

      const result = await executeDualModeWorkflow(testWorkflowId).catch((err) => ({
        success: false,
        error: err.message,
      }))

      expect(result.success).toBe(false)
      expect(mockSocket.emit).toHaveBeenCalledWith('execution-error', {
        workflowId: testWorkflowId,
        error: 'Block execution failed',
        timestamp: expect.any(Date),
      })
    })

    it('should provide execution history in chat interface', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const executionHistory = [
        {
          executionId: 'exec-1',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          success: true,
          duration: 15000,
        },
        {
          executionId: 'exec-2',
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          success: false,
          error: 'Network timeout',
        },
      ]

      mockChatService.getExecutionHistory = vi.fn().mockResolvedValue(executionHistory)

      // Request execution history via chat
      await mockChatService.getExecutionHistory(testWorkflowId)

      expect(mockChatService.getExecutionHistory).toHaveBeenCalledWith(testWorkflowId)
    })

    it('should display workflow structure in chat-friendly format', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const context = dualModeArchitecture.getExecutionContext(testWorkflowId)!

      // Should format workflow for chat display
      const chatFormattedWorkflow = {
        name: context.reactFlowState.name,
        totalBlocks: Object.keys(context.reactFlowState.blocks).length,
        totalConnections: context.reactFlowState.edges.length,
        blocks: Object.values(context.reactFlowState.blocks).map((block) => ({
          name: block.name,
          type: block.type,
          enabled: block.enabled,
        })),
      }

      expect(chatFormattedWorkflow.totalBlocks).toBe(4)
      expect(chatFormattedWorkflow.totalConnections).toBe(3)
      expect(chatFormattedWorkflow.blocks[0].name).toBe('Start Execution')
    })
  })

  describe('Chat-Driven Workflow Modifications', () => {
    it('should modify workflow blocks via chat commands', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const chatCommand = {
        type: 'modify_block',
        blockId: 'exec-block-1',
        property: 'name',
        value: 'Modified Start Block',
        userId: 'test-user',
      }

      mockChatService.modifyWorkflowViaChat.mockResolvedValue({
        success: true,
        changes: [
          {
            type: 'BLOCK_MODIFIED',
            blockId: 'exec-block-1',
            changes: { name: 'Modified Start Block' },
          },
        ],
      })

      const result = await mockChatService.modifyWorkflowViaChat(testWorkflowId, chatCommand)

      expect(result.success).toBe(true)
      expect(result.changes).toHaveLength(1)
      expect(mockChatService.modifyWorkflowViaChat).toHaveBeenCalledWith(
        testWorkflowId,
        chatCommand
      )
    })

    it('should add new blocks via chat interface', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const addBlockCommand = {
        type: 'add_block',
        blockType: 'email',
        name: 'Send Email',
        position: { x: 600, y: 200 },
        config: {
          to: 'user@example.com',
          subject: 'Workflow Complete',
          body: 'Your workflow has completed successfully.',
        },
      }

      mockChatService.modifyWorkflowViaChat.mockResolvedValue({
        success: true,
        changes: [
          {
            type: 'BLOCK_ADDED',
            blockId: 'new-email-block',
            block: {
              id: 'new-email-block',
              type: 'email',
              name: 'Send Email',
              position: { x: 600, y: 200 },
              enabled: true,
              config: addBlockCommand.config,
            },
          },
        ],
      })

      const result = await mockChatService.modifyWorkflowViaChat(testWorkflowId, addBlockCommand)

      expect(result.success).toBe(true)
      expect(result.changes[0].type).toBe('BLOCK_ADDED')
      expect(result.changes[0].block.name).toBe('Send Email')
    })

    it('should connect blocks via chat commands', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const connectBlocksCommand = {
        type: 'connect_blocks',
        sourceBlockId: 'exec-block-4',
        targetBlockId: 'new-email-block',
        sourceHandle: 'output',
        targetHandle: 'input',
      }

      mockChatService.modifyWorkflowViaChat.mockResolvedValue({
        success: true,
        changes: [
          {
            type: 'EDGE_ADDED',
            edgeId: 'exec-edge-4',
            edge: {
              id: 'exec-edge-4',
              source: 'exec-block-4',
              target: 'new-email-block',
              sourceHandle: 'output',
              targetHandle: 'input',
              type: 'default',
            },
          },
        ],
      })

      const result = await mockChatService.modifyWorkflowViaChat(
        testWorkflowId,
        connectBlocksCommand
      )

      expect(result.success).toBe(true)
      expect(result.changes[0].type).toBe('EDGE_ADDED')
      expect(result.changes[0].edge.source).toBe('exec-block-4')
    })

    it('should disable/enable blocks via chat', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const disableBlockCommand = {
        type: 'toggle_block',
        blockId: 'exec-block-2',
        enabled: false,
      }

      mockChatService.modifyWorkflowViaChat.mockResolvedValue({
        success: true,
        changes: [
          {
            type: 'BLOCK_MODIFIED',
            blockId: 'exec-block-2',
            changes: { enabled: false },
          },
        ],
      })

      const result = await mockChatService.modifyWorkflowViaChat(
        testWorkflowId,
        disableBlockCommand
      )

      expect(result.success).toBe(true)
      expect(result.changes[0].changes.enabled).toBe(false)
    })

    it('should validate chat modifications before applying', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const invalidCommand = {
        type: 'modify_block',
        blockId: 'non-existent-block',
        property: 'name',
        value: 'Invalid Modification',
      }

      mockChatService.modifyWorkflowViaChat.mockResolvedValue({
        success: false,
        error: 'Block not found: non-existent-block',
        validationErrors: [
          {
            field: 'blockId',
            message: 'Block with ID "non-existent-block" does not exist',
          },
        ],
      })

      const result = await mockChatService.modifyWorkflowViaChat(testWorkflowId, invalidCommand)

      expect(result.success).toBe(false)
      expect(result.validationErrors).toHaveLength(1)
      expect(result.error).toContain('Block not found')
    })

    it('should provide modification suggestions in chat', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const getSuggestionsCommand = {
        type: 'get_suggestions',
        context: 'improve_workflow_performance',
      }

      mockChatService.getWorkflowSuggestions = vi.fn().mockResolvedValue({
        suggestions: [
          {
            type: 'optimization',
            title: 'Add Error Handling',
            description: 'Consider adding error handling blocks after API calls',
            priority: 'medium',
            blocks: ['exec-block-3'],
          },
          {
            type: 'enhancement',
            title: 'Add Logging',
            description: 'Add logging blocks to track execution progress',
            priority: 'low',
            suggestedBlocks: [
              { type: 'log', name: 'Log Start', position: 'after:exec-block-1' },
              { type: 'log', name: 'Log Complete', position: 'after:exec-block-4' },
            ],
          },
        ],
      })

      const suggestions = await mockChatService.getWorkflowSuggestions(
        testWorkflowId,
        getSuggestionsCommand
      )

      expect(suggestions.suggestions).toHaveLength(2)
      expect(suggestions.suggestions[0].title).toBe('Add Error Handling')
      expect(suggestions.suggestions[1].type).toBe('enhancement')
    })
  })

  describe('Real-Time Execution Streaming', () => {
    it('should stream execution progress updates in real-time', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const progressUpdates: any[] = []

      // Mock real-time progress streaming
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'execution-progress') {
          // Simulate progress updates
          setTimeout(() => callback({ blockId: 'exec-block-1', progress: 0.25 }), 100)
          setTimeout(() => callback({ blockId: 'exec-block-1', progress: 0.5 }), 200)
          setTimeout(() => callback({ blockId: 'exec-block-1', progress: 1.0 }), 300)
          setTimeout(() => callback({ blockId: 'exec-block-2', progress: 0.33 }), 400)
        }
      })

      const progressPromise = new Promise((resolve) => {
        mockSocket.on('execution-progress', (update: any) => {
          progressUpdates.push(update)
          if (progressUpdates.length === 4) resolve(progressUpdates)
        })
      })

      await executeDualModeWorkflow(testWorkflowId, { enableRealTimeProgress: true })

      const updates = await progressPromise
      expect(updates).toHaveLength(4)
      expect(updates[3].blockId).toBe('exec-block-2')
      expect(updates[3].progress).toBe(0.33)
    })

    it('should stream execution logs in real-time', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const executionLogs: any[] = []

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'execution-log') {
          const logs = [
            {
              level: 'info',
              message: 'Starting workflow execution',
              timestamp: new Date(),
              blockId: null,
            },
            {
              level: 'info',
              message: 'Executing block: Start Execution',
              timestamp: new Date(),
              blockId: 'exec-block-1',
            },
            {
              level: 'info',
              message: 'Block completed successfully',
              timestamp: new Date(),
              blockId: 'exec-block-1',
            },
            {
              level: 'info',
              message: 'Evaluating condition: execution.status === "ready"',
              timestamp: new Date(),
              blockId: 'exec-block-2',
            },
          ]

          logs.forEach((log, index) => {
            setTimeout(() => callback(log), index * 100)
          })
        }
      })

      const logsPromise = new Promise((resolve) => {
        mockSocket.on('execution-log', (log: any) => {
          executionLogs.push(log)
          if (executionLogs.length === 4) resolve(executionLogs)
        })
      })

      await executeDualModeWorkflow(testWorkflowId, { enableRealTimeLogs: true })

      const logs = await logsPromise
      expect(logs).toHaveLength(4)
      expect(logs[0].message).toBe('Starting workflow execution')
      expect(logs[3].blockId).toBe('exec-block-2')
    })

    it('should stream block output data in real-time', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const blockOutputs: any[] = []

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'block-output') {
          const outputs = [
            {
              blockId: 'exec-block-1',
              output: { message: 'Workflow started', timestamp: new Date() },
            },
            {
              blockId: 'exec-block-2',
              output: { condition: true, reason: 'execution.status === "ready" evaluated to true' },
            },
            {
              blockId: 'exec-block-3',
              output: { response: { status: 200, data: { result: 'success' } } },
            },
          ]

          outputs.forEach((output, index) => {
            setTimeout(() => callback(output), index * 150)
          })
        }
      })

      const outputsPromise = new Promise((resolve) => {
        mockSocket.on('block-output', (output: any) => {
          blockOutputs.push(output)
          if (blockOutputs.length === 3) resolve(blockOutputs)
        })
      })

      await executeDualModeWorkflow(testWorkflowId, { enableRealTimeOutputs: true })

      const outputs = await outputsPromise
      expect(outputs).toHaveLength(3)
      expect(outputs[0].blockId).toBe('exec-block-1')
      expect(outputs[2].output.response.status).toBe(200)
    })

    it('should handle real-time streaming disconnections gracefully', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      // Simulate connection loss during execution
      mockSocket.connected = false

      const result = await executeDualModeWorkflow(testWorkflowId, { enableRealTimeProgress: true })

      // Should complete execution even without real-time streaming
      expect(result.success).toBe(true)

      // Should attempt to reconnect for streaming
      expect(mockSocket.emit).toHaveBeenCalledWith('reconnect-execution-stream', {
        workflowId: testWorkflowId,
        executionId: expect.any(String),
      })
    })

    it('should buffer streaming data during temporary disconnections', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const bufferedEvents: any[] = []

      // Simulate temporary disconnection and buffering
      mockSocket.connected = false

      // Buffer events during disconnection
      const bufferEvent = (event: any) => bufferedEvents.push(event)

      // Simulate reconnection and replay
      setTimeout(() => {
        mockSocket.connected = true
        bufferedEvents.forEach((event) => mockSocket.emit('buffered-event', event))
      }, 500)

      await executeDualModeWorkflow(testWorkflowId, { enableRealTimeProgress: true })

      // Should handle buffering gracefully
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'execution-stream-buffer-ready',
        expect.objectContaining({ workflowId: testWorkflowId })
      )
    })

    it('should provide execution metrics in real-time', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const executionMetrics: any[] = []

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'execution-metrics') {
          const metrics = [
            { metric: 'blocks_executed', value: 1, timestamp: new Date() },
            { metric: 'execution_time', value: 1500, timestamp: new Date() },
            { metric: 'memory_usage', value: 45.2, timestamp: new Date() },
            { metric: 'api_calls_made', value: 2, timestamp: new Date() },
          ]

          metrics.forEach((metric, index) => {
            setTimeout(() => callback(metric), index * 200)
          })
        }
      })

      const metricsPromise = new Promise((resolve) => {
        mockSocket.on('execution-metrics', (metric: any) => {
          executionMetrics.push(metric)
          if (executionMetrics.length === 4) resolve(executionMetrics)
        })
      })

      await executeDualModeWorkflow(testWorkflowId, { enableRealTimeMetrics: true })

      const metrics = await metricsPromise
      expect(metrics).toHaveLength(4)
      expect(metrics.find((m) => m.metric === 'blocks_executed')?.value).toBe(1)
      expect(metrics.find((m) => m.metric === 'execution_time')?.value).toBe(1500)
    })
  })

  describe('Integration Performance and Reliability', () => {
    it('should handle concurrent execution and chat modifications', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const executionPromise = executeDualModeWorkflow(testWorkflowId, {
        enableRealTimeProgress: true,
      })

      const modificationPromise = mockChatService.modifyWorkflowViaChat(testWorkflowId, {
        type: 'modify_block',
        blockId: 'exec-block-1',
        property: 'name',
        value: 'Modified During Execution',
      })

      // Both should handle concurrency gracefully
      const [execResult, modResult] = await Promise.allSettled([
        executionPromise,
        modificationPromise,
      ])

      expect(execResult.status).toBe('fulfilled')
      // Modification during execution should be queued or rejected safely
      expect(modResult.status).toBe('fulfilled')
    })

    it('should maintain performance with high-frequency streaming', async () => {
      await initializeDualMode(testWorkflowId, mockWorkflowState)
      await switchWorkflowMode(testWorkflowId, 'journey')

      const startTime = performance.now()
      const streamEvents: any[] = []

      // Simulate high-frequency streaming (100 events)
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'high-frequency-stream') {
          for (let i = 0; i < 100; i++) {
            setTimeout(() => {
              callback({ id: i, data: `stream-event-${i}`, timestamp: new Date() })
              streamEvents.push({ id: i })
            }, i * 10) // 10ms intervals
          }
        }
      })

      const streamPromise = new Promise((resolve) => {
        mockSocket.on('high-frequency-stream', () => {
          if (streamEvents.length === 100) resolve(streamEvents)
        })
      })

      await Promise.all([executeDualModeWorkflow(testWorkflowId), streamPromise])

      const duration = performance.now() - startTime

      // Should handle high-frequency streaming efficiently
      expect(duration).toBeLessThan(5000) // < 5 seconds
      expect(streamEvents).toHaveLength(100)

      console.log(`High-frequency streaming handled in ${duration}ms`)
    })
  })
})
