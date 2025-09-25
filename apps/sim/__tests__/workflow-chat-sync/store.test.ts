/**
 * Workflow Chat Synchronization Store Tests
 *
 * Comprehensive test suite for the workflow-chat synchronization system.
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExecutionStore } from '@/stores/execution/store'
import { useChatStore } from '@/stores/panel/chat/store'
import { useWorkflowChatSyncStore } from '@/stores/workflow-chat-sync/store'
import type { ChatCommand, StateChangeEvent } from '@/stores/workflow-chat-sync/types'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

// Mock the logger
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `mock-uuid-${Math.random().toString(36).substring(2)}`,
  },
})

describe('WorkflowChatSyncStore', () => {
  beforeEach(() => {
    // Reset all stores
    useWorkflowChatSyncStore.setState({
      isEnabled: false,
      syncState: 'idle',
      lastSyncTimestamp: null,
      pendingChanges: [],
      conflicts: [],
      workflowStateRepresentation: null,
      chatCommandHistory: [],
    })

    useWorkflowRegistry.setState({
      activeWorkflowId: 'test-workflow-id',
      workflows: {
        'test-workflow-id': {
          id: 'test-workflow-id',
          name: 'Test Workflow',
          description: 'Test workflow description',
          color: '#000000',
          lastModified: new Date(),
          createdAt: new Date(),
        },
      },
    })

    useWorkflowStore.setState({
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
    })

    useChatStore.setState({
      messages: [],
      selectedWorkflowOutputs: {},
      conversationIds: {},
    })

    useExecutionStore.setState({
      isExecuting: false,
      isDebugging: false,
      activeBlockIds: new Set(),
      pendingBlocks: [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Store Operations', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.syncState).toBe('idle')
      expect(result.current.lastSyncTimestamp).toBeNull()
      expect(result.current.pendingChanges).toEqual([])
      expect(result.current.conflicts).toEqual([])
      expect(result.current.workflowStateRepresentation).toBeNull()
      expect(result.current.chatCommandHistory).toEqual([])
    })

    it('should enable and disable sync', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      act(() => {
        result.current.enableSync()
      })

      expect(result.current.isEnabled).toBe(true)

      act(() => {
        result.current.disableSync()
      })

      expect(result.current.isEnabled).toBe(false)
    })

    it('should set sync state', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      act(() => {
        result.current.setSyncState('syncing')
      })

      expect(result.current.syncState).toBe('syncing')

      act(() => {
        result.current.setSyncState('error')
      })

      expect(result.current.syncState).toBe('error')
    })
  })

  describe('Command Parsing', () => {
    it('should parse add block commands', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const testCases = [
        'add llm block',
        'create a database block',
        'Add HTTP block',
        'CREATE webhook',
      ]

      testCases.forEach((message) => {
        const command = result.current.parseChatCommand(message)
        expect(command).not.toBeNull()
        expect(command?.type).toBe('add_block')
      })
    })

    it('should parse delete block commands', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const testCases = [
        'delete start block',
        'remove the llm block',
        'Delete HTTP',
        'REMOVE webhook block',
      ]

      testCases.forEach((message) => {
        const command = result.current.parseChatCommand(message)
        expect(command).not.toBeNull()
        expect(command?.type).toBe('delete_block')
      })
    })

    it('should parse connect blocks commands', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const testCases = [
        'connect start to llm',
        'connect the start block to llm block',
        'Connect HTTP to database',
      ]

      testCases.forEach((message) => {
        const command = result.current.parseChatCommand(message)
        expect(command).not.toBeNull()
        expect(command?.type).toBe('connect_blocks')
      })
    })

    it('should parse execution commands', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const testCases = ['run workflow', 'execute the workflow', 'start execution', 'RUN']

      testCases.forEach((message) => {
        const command = result.current.parseChatCommand(message)
        expect(command).not.toBeNull()
        expect(command?.type).toBe('execute_workflow')
      })
    })

    it('should parse status commands', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const testCases = ['status', 'workflow status', 'what is the state', 'info']

      testCases.forEach((message) => {
        const command = result.current.parseChatCommand(message)
        expect(command).not.toBeNull()
        expect(command?.type).toBe('get_status')
      })
    })

    it('should return null for non-command messages', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const testCases = ['hello world', 'this is just a regular message', 'how are you?', '123456']

      testCases.forEach((message) => {
        const command = result.current.parseChatCommand(message)
        expect(command).toBeNull()
      })
    })
  })

  describe('Workflow State Representation', () => {
    it('should generate empty state representation when no workflow', () => {
      useWorkflowRegistry.setState({ activeWorkflowId: null })
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const representation = result.current.generateWorkflowStateRepresentation()

      expect(representation.workflowId).toBe('')
      expect(representation.summary).toBe('No active workflow')
      expect(representation.blockSummaries).toEqual([])
      expect(representation.connectionSummaries).toEqual([])
    })

    it('should generate state representation with blocks and connections', () => {
      // Set up workflow with blocks and edges
      useWorkflowStore.setState({
        blocks: {
          'block-1': {
            id: 'block-1',
            type: 'starter',
            name: 'Start',
            position: { x: 100, y: 100 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            horizontalHandles: true,
            isWide: false,
            advancedMode: false,
            triggerMode: false,
            height: 0,
          },
          'block-2': {
            id: 'block-2',
            type: 'llm',
            name: 'LLM',
            position: { x: 300, y: 100 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            horizontalHandles: true,
            isWide: false,
            advancedMode: false,
            triggerMode: false,
            height: 0,
          },
        },
        edges: [
          {
            id: 'edge-1',
            source: 'block-1',
            target: 'block-2',
            sourceHandle: 'response',
            targetHandle: 'input',
            type: 'default',
          },
        ],
      })

      useExecutionStore.setState({
        activeBlockIds: new Set(['block-1']),
      })

      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const representation = result.current.generateWorkflowStateRepresentation()

      expect(representation.workflowId).toBe('test-workflow-id')
      expect(representation.summary).toBe('Workflow with 2 blocks and 1 connections')
      expect(representation.blockSummaries).toHaveLength(2)
      expect(representation.connectionSummaries).toHaveLength(1)

      // Check block summaries
      const startBlock = representation.blockSummaries.find((b) => b.id === 'block-1')
      expect(startBlock).toBeDefined()
      expect(startBlock?.isActive).toBe(true)
      expect(startBlock?.name).toBe('Start')

      const llmBlock = representation.blockSummaries.find((b) => b.id === 'block-2')
      expect(llmBlock).toBeDefined()
      expect(llmBlock?.isActive).toBe(false)
      expect(llmBlock?.name).toBe('LLM')

      // Check connection summary
      expect(representation.connectionSummaries[0].description).toBe('Start → LLM')
    })
  })

  describe('Command Execution', () => {
    beforeEach(() => {
      // Enable sync for command execution tests
      const { result } = renderHook(() => useWorkflowChatSyncStore())
      act(() => {
        result.current.enableSync()
      })
    })

    it('should execute add block command', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const command: ChatCommand = {
        type: 'add_block',
        description: 'add llm block',
        parameters: {
          blockType: 'llm',
          position: { x: 200, y: 200 },
        },
      }

      act(() => {
        result.current.executeWorkflowCommand(command)
      })

      const workflowStore = useWorkflowStore.getState()
      const blockIds = Object.keys(workflowStore.blocks)
      expect(blockIds).toHaveLength(1)

      const addedBlock = Object.values(workflowStore.blocks)[0]
      expect(addedBlock.type).toBe('llm')
      expect(addedBlock.name).toBe('Llm')
      expect(addedBlock.position).toEqual({ x: 200, y: 200 })
    })

    it('should execute status command', () => {
      // Set up some workflow state
      useWorkflowStore.setState({
        blocks: {
          'block-1': {
            id: 'block-1',
            type: 'starter',
            name: 'Start',
            position: { x: 100, y: 100 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            horizontalHandles: true,
            isWide: false,
            advancedMode: false,
            triggerMode: false,
            height: 0,
          },
        },
        edges: [],
      })

      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const command: ChatCommand = {
        type: 'get_status',
        description: 'get workflow status',
        parameters: {},
      }

      act(() => {
        result.current.executeWorkflowCommand(command)
      })

      // Check that a status message was added to chat
      const chatStore = useChatStore.getState()
      const messages = chatStore.messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('Workflow Status')
      expect(messages[0].content).toContain('Blocks: 1')
    })

    it('should handle command execution errors gracefully', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      const command: ChatCommand = {
        type: 'delete_block',
        description: 'delete nonexistent block',
        parameters: {
          blockIdentifier: 'nonexistent-block',
        },
      }

      expect(() => {
        act(() => {
          result.current.executeWorkflowCommand(command)
        })
      }).toThrow('Block not found: nonexistent-block')
    })
  })

  describe('State Change Handling', () => {
    it('should handle workflow state changes', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      act(() => {
        result.current.enableSync()
      })

      const stateChangeEvent: StateChangeEvent = {
        type: 'workflow_modified',
        timestamp: Date.now(),
        source: 'visual',
        data: {
          blocks: {},
          edges: [],
          loops: {},
          parallels: {},
        },
      }

      act(() => {
        result.current.handleWorkflowStateChange(stateChangeEvent)
      })

      expect(result.current.syncState).toBe('idle')
      expect(result.current.lastSyncTimestamp).toBeTruthy()

      // Check that a state change message was added
      const chatStore = useChatStore.getState()
      const messages = chatStore.messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('🔄 Workflow structure updated')
    })

    it('should handle execution state changes', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      act(() => {
        result.current.enableSync()
      })

      const stateChangeEvent: StateChangeEvent = {
        type: 'execution_state_changed',
        timestamp: Date.now(),
        source: 'execution',
        data: {
          isExecuting: true,
          activeBlocks: ['block-1'],
        },
      }

      act(() => {
        result.current.handleWorkflowStateChange(stateChangeEvent)
      })

      // Check that execution message was added
      const chatStore = useChatStore.getState()
      const messages = chatStore.messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('▶️ Workflow execution started')
    })
  })

  describe('Integration', () => {
    it('should maintain command history', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      act(() => {
        result.current.enableSync()
      })

      const command: ChatCommand = {
        type: 'add_block',
        description: 'add llm block',
        parameters: { blockType: 'llm', position: { x: 0, y: 0 } },
      }

      act(() => {
        result.current.handleChatCommand(command, 'message-id-1')
      })

      expect(result.current.chatCommandHistory).toHaveLength(1)
      expect(result.current.chatCommandHistory[0].messageId).toBe('message-id-1')
      expect(result.current.chatCommandHistory[0].type).toBe('add_block')
    })

    it('should handle full sync initialization', () => {
      // Set up some initial workflow state
      useWorkflowStore.setState({
        blocks: {
          'block-1': {
            id: 'block-1',
            type: 'starter',
            name: 'Start',
            position: { x: 100, y: 100 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            horizontalHandles: true,
            isWide: false,
            advancedMode: false,
            triggerMode: false,
            height: 0,
          },
        },
      })

      const { result } = renderHook(() => useWorkflowChatSyncStore())

      act(() => {
        result.current.enableSync()
      })

      act(() => {
        result.current.performFullSync()
      })

      expect(result.current.workflowStateRepresentation).toBeTruthy()
      expect(result.current.workflowStateRepresentation?.blockSummaries).toHaveLength(1)
      expect(result.current.lastSyncTimestamp).toBeTruthy()

      // Check that sync message was added
      const chatStore = useChatStore.getState()
      const messages = chatStore.messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toContain('Synchronized with workflow')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle sync when disabled', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      // Sync is disabled by default
      const stateChangeEvent: StateChangeEvent = {
        type: 'workflow_modified',
        timestamp: Date.now(),
        source: 'visual',
        data: {},
      }

      act(() => {
        result.current.handleWorkflowStateChange(stateChangeEvent)
      })

      // Should not process when disabled
      expect(result.current.lastSyncTimestamp).toBeNull()
    })

    it('should handle commands without active workflow', () => {
      useWorkflowRegistry.setState({ activeWorkflowId: null })

      const { result } = renderHook(() => useWorkflowChatSyncStore())

      act(() => {
        result.current.enableSync()
      })

      const command: ChatCommand = {
        type: 'add_block',
        description: 'add llm block',
        parameters: { blockType: 'llm', position: { x: 0, y: 0 } },
      }

      expect(() => {
        act(() => {
          result.current.executeWorkflowCommand(command)
        })
      }).toThrow('No active workflow')
    })

    it('should clear pending changes', () => {
      const { result } = renderHook(() => useWorkflowChatSyncStore())

      // Add some pending changes first
      act(() => {
        result.current.addPendingChange({
          id: 'change-1',
          type: 'workflow_modified',
          source: 'visual',
          timestamp: Date.now(),
          data: {},
        })
      })

      expect(result.current.pendingChanges).toHaveLength(1)

      act(() => {
        result.current.clearPendingChanges()
      })

      expect(result.current.pendingChanges).toHaveLength(0)
    })
  })
})
