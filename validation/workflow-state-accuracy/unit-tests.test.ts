/**
 * Unit Tests for Workflow State Synchronization Logic
 *
 * Tests the core synchronization mechanisms between workflow and chat interfaces
 * to validate the "Chat interface reflects workflow state accurately" acceptance criteria.
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useExecutionStore } from '@/stores/execution/store'
import { useChatStore } from '@/stores/panel/chat/store'
import { useWorkflowChatSyncStore } from '@/stores/workflow-chat-sync/store'
import type {
  ChatCommand,
  StateChangeEvent,
  WorkflowStateRepresentation,
} from '@/stores/workflow-chat-sync/types'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

// Mock dependencies
vi.mock('@/stores/workflows/workflow/store')
vi.mock('@/stores/panel/chat/store')
vi.mock('@/stores/execution/store')
vi.mock('@/stores/workflows/registry/store')
vi.mock('@/lib/logs/console/logger')

describe('Workflow Chat Sync Store', () => {
  let syncStore: any
  let workflowStore: any
  let chatStore: any
  let executionStore: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup mock stores
    workflowStore = {
      blocks: {},
      edges: [],
      addBlock: vi.fn(),
      removeBlock: vi.fn(),
      addEdge: vi.fn(),
      updateBlock: vi.fn(),
      subscribe: vi.fn(),
    }

    chatStore = {
      messages: [],
      addMessage: vi.fn(),
      getWorkflowMessages: vi.fn(() => []),
      subscribe: vi.fn(),
    }

    executionStore = {
      isExecuting: false,
      activeBlockIds: new Set(),
      isDebugging: false,
      pendingBlocks: [],
      setIsExecuting: vi.fn(),
      subscribe: vi.fn(),
    }

    // Mock store getState methods
    vi.mocked(useWorkflowStore.getState).mockReturnValue(workflowStore)
    vi.mocked(useChatStore.getState).mockReturnValue(chatStore)
    vi.mocked(useExecutionStore.getState).mockReturnValue(executionStore)

    // Get fresh store instance
    const { result } = renderHook(() => useWorkflowChatSyncStore())
    syncStore = result.current
  })

  describe('State Synchronization', () => {
    test('should enable sync and initialize correctly', () => {
      // Initially sync should be enabled
      expect(syncStore.isEnabled).toBe(true)

      // Disable and re-enable
      act(() => {
        syncStore.disableSync()
      })

      expect(syncStore.isEnabled).toBe(false)
      expect(syncStore.syncState).toBe('idle')

      act(() => {
        syncStore.enableSync()
      })

      expect(syncStore.isEnabled).toBe(true)
    })

    test('should generate accurate workflow state representation', () => {
      // Setup test workflow
      const testBlocks = {
        block1: {
          id: 'block1',
          type: 'llm',
          name: 'LLM Block',
          position: { x: 100, y: 100 },
          enabled: true,
        },
        block2: {
          id: 'block2',
          type: 'api',
          name: 'API Block',
          position: { x: 300, y: 100 },
          enabled: false,
        },
      }

      const testEdges = [
        {
          id: 'edge1',
          source: 'block1',
          target: 'block2',
          sourceHandle: 'response',
          targetHandle: 'input',
        },
      ]

      workflowStore.blocks = testBlocks
      workflowStore.edges = testEdges
      executionStore.activeBlockIds = new Set(['block1'])
      executionStore.isExecuting = true

      // Mock active workflow ID
      vi.mocked(
        require('@/stores/workflows/registry/store').useWorkflowRegistry.getState
      ).mockReturnValue({ activeWorkflowId: 'test-workflow' })

      const representation = syncStore.generateWorkflowStateRepresentation()

      expect(representation).toEqual({
        workflowId: 'test-workflow',
        summary: 'Workflow with 2 blocks and 1 connections',
        blockSummaries: [
          {
            id: 'block1',
            type: 'llm',
            name: 'LLM Block',
            isActive: true,
            isEnabled: true,
            position: { x: 100, y: 100 },
          },
          {
            id: 'block2',
            type: 'api',
            name: 'API Block',
            isActive: false,
            isEnabled: false,
            position: { x: 300, y: 100 },
          },
        ],
        connectionSummaries: [
          {
            id: 'edge1',
            description: 'LLM Block → API Block',
            sourceBlock: 'LLM Block',
            targetBlock: 'API Block',
          },
        ],
        executionState: 'running',
      })
    })

    test('should handle workflow state changes correctly', () => {
      const stateChangeEvent: StateChangeEvent = {
        type: 'workflow_modified',
        timestamp: Date.now(),
        source: 'visual',
        data: {
          blocks: {
            'new-block': { id: 'new-block', type: 'llm', name: 'New Block' },
          },
          edges: [],
        },
      }

      // Mock the generateWorkflowStateRepresentation method
      const mockRepresentation: WorkflowStateRepresentation = {
        workflowId: 'test-workflow',
        summary: 'Updated workflow',
        blockSummaries: [],
        connectionSummaries: [],
        executionState: 'idle',
      }

      syncStore.generateWorkflowStateRepresentation = vi.fn().mockReturnValue(mockRepresentation)
      syncStore.generateStateChangeMessage = vi
        .fn()
        .mockReturnValue('🔄 Workflow structure updated')

      act(() => {
        syncStore.handleWorkflowStateChange(stateChangeEvent)
      })

      expect(syncStore.generateWorkflowStateRepresentation).toHaveBeenCalled()
      expect(chatStore.addMessage).toHaveBeenCalledWith({
        content: '🔄 Workflow structure updated',
        workflowId: expect.any(String),
        type: 'workflow',
      })
    })

    test('should handle execution state changes correctly', () => {
      const executionStartEvent: StateChangeEvent = {
        type: 'execution_state_changed',
        timestamp: Date.now(),
        source: 'execution',
        data: {
          isExecuting: true,
          activeBlocks: ['block1'],
          isDebugging: false,
          pendingBlocks: [],
        },
      }

      const message = syncStore.generateStateChangeMessage(executionStartEvent)
      expect(message).toBe('▶️ Workflow execution started')

      const executionEndEvent: StateChangeEvent = {
        type: 'execution_state_changed',
        timestamp: Date.now(),
        source: 'execution',
        data: {
          isExecuting: false,
          activeBlocks: [],
          isDebugging: false,
          pendingBlocks: [],
        },
      }

      const endMessage = syncStore.generateStateChangeMessage(executionEndEvent)
      expect(endMessage).toBe('⏸️ Workflow execution completed')
    })
  })

  describe('Chat Command Parsing', () => {
    test('should parse add block commands correctly', () => {
      const testCases = [
        {
          input: 'add llm block',
          expected: { type: 'add_block', blockType: 'llm' },
        },
        {
          input: 'create api block',
          expected: { type: 'add_block', blockType: 'api' },
        },
        {
          input: 'add a condition',
          expected: { type: 'add_block', blockType: 'condition' },
        },
        {
          input: 'create transformer',
          expected: { type: 'add_block', blockType: 'transformer' },
        },
      ]

      testCases.forEach(({ input, expected }) => {
        const command = syncStore.parseChatCommand(input)
        expect(command).toMatchObject({
          type: expected.type,
          description: expect.stringContaining(expected.blockType),
          parameters: expect.objectContaining({
            blockType: expected.blockType,
            position: { x: 200, y: 200 },
          }),
        })
      })
    })

    test('should parse delete block commands correctly', () => {
      const testCases = [
        { input: 'delete llm block', expected: 'llm' },
        { input: 'remove api block', expected: 'api' },
        { input: 'delete the transformer', expected: 'transformer' },
      ]

      testCases.forEach(({ input, expected }) => {
        const command = syncStore.parseChatCommand(input)
        expect(command).toMatchObject({
          type: 'delete_block',
          parameters: {
            blockIdentifier: expected,
          },
        })
      })
    })

    test('should parse connection commands correctly', () => {
      const testCases = [
        {
          input: 'connect llm to api',
          expected: { source: 'llm', target: 'api' },
        },
        {
          input: 'connect the transformer to the condition block',
          expected: {
            source: 'the transformer',
            target: 'the condition block',
          },
        },
      ]

      testCases.forEach(({ input, expected }) => {
        const command = syncStore.parseChatCommand(input)
        expect(command).toMatchObject({
          type: 'connect_blocks',
          parameters: {
            sourceBlock: expected.source,
            targetBlock: expected.target,
          },
        })
      })
    })

    test('should parse execution commands correctly', () => {
      const executionCommands = [
        'run workflow',
        'execute the workflow',
        'start execution',
        'run this',
      ]

      executionCommands.forEach((input) => {
        const command = syncStore.parseChatCommand(input)
        expect(command).toMatchObject({
          type: 'execute_workflow',
          description: 'execute workflow',
          parameters: {},
        })
      })
    })

    test('should parse status commands correctly', () => {
      const statusCommands = [
        'get status',
        'show workflow state',
        'what is the current info',
        'workflow status',
      ]

      statusCommands.forEach((input) => {
        const command = syncStore.parseChatCommand(input)
        expect(command).toMatchObject({
          type: 'get_status',
          description: 'get workflow status',
          parameters: {},
        })
      })
    })

    test('should return null for non-commands', () => {
      const nonCommands = ['hello world', 'how are you', 'what can you do', 'this is not a command']

      nonCommands.forEach((input) => {
        const command = syncStore.parseChatCommand(input)
        expect(command).toBeNull()
      })
    })
  })

  describe('Command Execution', () => {
    test('should execute add block command correctly', () => {
      const command: ChatCommand = {
        type: 'add_block',
        description: 'add llm block',
        parameters: {
          blockType: 'llm',
          position: { x: 200, y: 200 },
        },
      }

      // Mock workflow store methods
      workflowStore.addBlock = vi.fn()

      act(() => {
        syncStore.executeWorkflowCommand(command)
      })

      expect(workflowStore.addBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'llm',
          name: 'Llm',
          position: { x: 200, y: 200 },
          enabled: true,
        })
      )
    })

    test('should execute delete block command correctly', () => {
      // Setup existing block
      workflowStore.blocks = {
        'test-block': {
          id: 'test-block',
          type: 'llm',
          name: 'Test LLM',
          enabled: true,
        },
      }

      const command: ChatCommand = {
        type: 'delete_block',
        description: 'delete test block',
        parameters: {
          blockIdentifier: 'Test LLM',
        },
      }

      workflowStore.removeBlock = vi.fn()

      act(() => {
        syncStore.executeWorkflowCommand(command)
      })

      expect(workflowStore.removeBlock).toHaveBeenCalledWith('test-block')
    })

    test('should execute connect blocks command correctly', () => {
      // Setup existing blocks
      workflowStore.blocks = {
        block1: { id: 'block1', name: 'Source Block', type: 'llm' },
        block2: { id: 'block2', name: 'Target Block', type: 'api' },
      }

      const command: ChatCommand = {
        type: 'connect_blocks',
        description: 'connect source to target',
        parameters: {
          sourceBlock: 'Source Block',
          targetBlock: 'Target Block',
        },
      }

      workflowStore.addEdge = vi.fn()

      act(() => {
        syncStore.executeWorkflowCommand(command)
      })

      expect(workflowStore.addEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'block1',
          target: 'block2',
          sourceHandle: 'response',
          targetHandle: 'input',
        })
      )
    })

    test('should execute workflow execution command correctly', () => {
      const command: ChatCommand = {
        type: 'execute_workflow',
        description: 'execute workflow',
        parameters: {},
      }

      act(() => {
        syncStore.executeWorkflowCommand(command)
      })

      expect(executionStore.setIsExecuting).toHaveBeenCalledWith(true)
    })

    test('should provide workflow status correctly', () => {
      // Setup workflow state
      workflowStore.blocks = {
        b1: { id: 'b1', name: 'Block 1' },
        b2: { id: 'b2', name: 'Block 2' },
      }
      workflowStore.edges = [{ id: 'e1' }]
      executionStore.isExecuting = true
      executionStore.activeBlockIds = new Set(['b1'])

      vi.mocked(
        require('@/stores/workflows/registry/store').useWorkflowRegistry.getState
      ).mockReturnValue({ activeWorkflowId: 'test-workflow' })

      act(() => {
        syncStore.provideWorkflowStatus()
      })

      expect(chatStore.addMessage).toHaveBeenCalledWith({
        content: expect.stringContaining('**Workflow Status:**'),
        workflowId: 'test-workflow',
        type: 'workflow',
      })

      const statusMessage = chatStore.addMessage.mock.calls[0][0].content
      expect(statusMessage).toContain('Blocks: 2')
      expect(statusMessage).toContain('Connections: 1')
      expect(statusMessage).toContain('Status: Running')
      expect(statusMessage).toContain('Active blocks: Block 1')
    })
  })

  describe('Error Handling', () => {
    test('should handle command execution errors gracefully', () => {
      const command: ChatCommand = {
        type: 'delete_block',
        description: 'delete non-existent block',
        parameters: {
          blockIdentifier: 'NonExistentBlock',
        },
      }

      // This should throw an error because block doesn't exist
      act(() => {
        syncStore.executeWorkflowCommand(command)
      })

      expect(chatStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('✗ Failed to delete non-existent block'),
          type: 'workflow',
        })
      )
    })

    test('should handle unknown command types', () => {
      const unknownCommand: ChatCommand = {
        type: 'unknown_command' as any,
        description: 'unknown command',
        parameters: {},
      }

      act(() => {
        syncStore.executeWorkflowCommand(unknownCommand)
      })

      expect(chatStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Unknown command type'),
          type: 'workflow',
        })
      )
    })
  })

  describe('Real-time Synchronization', () => {
    test('should maintain sync state consistency', () => {
      expect(syncStore.syncState).toBe('idle')

      const stateChangeEvent: StateChangeEvent = {
        type: 'workflow_modified',
        timestamp: Date.now(),
        source: 'visual',
        data: {},
      }

      // Mock required methods
      syncStore.generateWorkflowStateRepresentation = vi.fn().mockReturnValue({
        workflowId: 'test',
        summary: 'test',
        blockSummaries: [],
        connectionSummaries: [],
        executionState: 'idle',
      })
      syncStore.generateStateChangeMessage = vi.fn().mockReturnValue('Test message')

      act(() => {
        syncStore.handleWorkflowStateChange(stateChangeEvent)
      })

      expect(syncStore.syncState).toBe('idle')
      expect(syncStore.lastSyncTimestamp).toBeGreaterThan(0)
    })

    test('should skip synchronization when disabled', () => {
      act(() => {
        syncStore.disableSync()
      })

      const stateChangeEvent: StateChangeEvent = {
        type: 'workflow_modified',
        timestamp: Date.now(),
        source: 'visual',
        data: {},
      }

      const addMessageSpy = vi.spyOn(chatStore, 'addMessage')

      act(() => {
        syncStore.handleWorkflowStateChange(stateChangeEvent)
      })

      expect(addMessageSpy).not.toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    test('should handle rapid state changes efficiently', () => {
      const changes = Array.from({ length: 100 }, (_, i) => ({
        type: 'workflow_modified',
        timestamp: Date.now() + i,
        source: 'visual',
        data: { changeId: i },
      }))

      // Mock required methods
      syncStore.generateWorkflowStateRepresentation = vi.fn().mockReturnValue({
        workflowId: 'test',
        summary: 'test',
        blockSummaries: [],
        connectionSummaries: [],
        executionState: 'idle',
      })
      syncStore.generateStateChangeMessage = vi.fn().mockReturnValue('Test message')

      const startTime = Date.now()

      act(() => {
        changes.forEach((change) => {
          syncStore.handleWorkflowStateChange(change as StateChangeEvent)
        })
      })

      const duration = Date.now() - startTime

      // Should handle 100 changes in under 1000ms
      expect(duration).toBeLessThan(1000)
      expect(syncStore.generateWorkflowStateRepresentation).toHaveBeenCalledTimes(100)
    })
  })
})

describe('Integration with React Components', () => {
  test('should integrate with WorkflowStateDisplay component', () => {
    // This would test the actual React component integration
    // For now, we'll test the store integration hooks

    const { result } = renderHook(() => useWorkflowChatSyncStore())
    const store = result.current

    expect(store.isEnabled).toBeDefined()
    expect(store.syncState).toBeDefined()
    expect(store.workflowStateRepresentation).toBeDefined()
    expect(store.conflicts).toBeDefined()
  })

  test('should provide correct initialization hook behavior', () => {
    const { result } = renderHook(() =>
      require('@/stores/workflow-chat-sync/store').useInitializeWorkflowChatSync()
    )
    const hook = result.current

    expect(hook.isEnabled).toBeDefined()
    expect(hook.syncState).toBeDefined()
    expect(hook.enableSync).toBeDefined()
    expect(hook.disableSync).toBeDefined()
    expect(hook.conflicts).toBeDefined()
    expect(hook.resolveConflict).toBeDefined()
  })
})
