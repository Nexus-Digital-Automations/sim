import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { useExecutionStore } from '@/stores/execution/store'
import { useChatStore } from '@/stores/panel/chat/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { useSubBlockStore } from '@/stores/workflows/subblock/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'
import type {
  ChatCommand,
  StateChangeEvent,
  SyncConflict,
  WorkflowChatSyncStore,
  WorkflowStateRepresentation,
} from './types'

const logger = createLogger('WorkflowChatSync')

/**
 * Workflow Chat Synchronization Store
 *
 * This store manages bidirectional synchronization between the visual workflow interface
 * and the chat interface, ensuring that both views always represent the same underlying state.
 *
 * Key Features:
 * - Real-time state synchronization between visual and chat interfaces
 * - Natural language representation of workflow state
 * - Chat-driven workflow modifications
 * - Conflict resolution for simultaneous changes
 * - State change event broadcasting
 */
export const useWorkflowChatSyncStore = create<WorkflowChatSyncStore>()(
  devtools(
    (set, get) => ({
      // State
      isEnabled: true,
      syncState: 'idle', // 'idle' | 'syncing' | 'conflict' | 'error'
      lastSyncTimestamp: null,
      pendingChanges: [],
      conflicts: [],
      workflowStateRepresentation: null,
      chatCommandHistory: [],

      // Actions
      enableSync: () => {
        logger.info('Enabling workflow-chat synchronization')
        set({ isEnabled: true })
        get().initializeSync()
      },

      disableSync: () => {
        logger.info('Disabling workflow-chat synchronization')
        set({
          isEnabled: false,
          syncState: 'idle',
          pendingChanges: [],
          conflicts: [],
        })
      },

      setSyncState: (state) => {
        logger.debug(`Sync state changed to: ${state}`)
        set({ syncState: state })
      },

      initializeSync: () => {
        const state = get()
        if (!state.isEnabled) return

        logger.info('Initializing workflow-chat synchronization system')

        // Subscribe to workflow state changes
        state.subscribeToWorkflowChanges()

        // Subscribe to chat state changes
        state.subscribeToChatChanges()

        // Perform initial synchronization
        state.performFullSync()

        set({
          syncState: 'idle',
          lastSyncTimestamp: Date.now(),
          conflicts: [],
          pendingChanges: [],
        })

        logger.info('Workflow-chat synchronization initialized successfully')
      },

      subscribeToWorkflowChanges: () => {
        const workflowStore = useWorkflowStore.getState()
        const executionStore = useExecutionStore.getState()

        // Subscribe to workflow store changes
        useWorkflowStore.subscribe((state, prevState) => {
          const syncStore = get()
          if (!syncStore.isEnabled || syncStore.syncState === 'syncing') return

          const hasBlocksChanged = JSON.stringify(state.blocks) !== JSON.stringify(prevState.blocks)
          const hasEdgesChanged = JSON.stringify(state.edges) !== JSON.stringify(prevState.edges)

          if (hasBlocksChanged || hasEdgesChanged) {
            logger.debug('Workflow state changed, propagating to chat')
            syncStore.handleWorkflowStateChange({
              type: 'workflow_modified',
              timestamp: Date.now(),
              source: 'visual',
              data: {
                blocks: state.blocks,
                edges: state.edges,
                loops: state.loops,
                parallels: state.parallels,
              },
            })
          }
        })

        // Subscribe to execution state changes
        useExecutionStore.subscribe((state, prevState) => {
          const syncStore = get()
          if (!syncStore.isEnabled) return

          const hasActiveBlocksChanged =
            Array.from(state.activeBlockIds).sort().join(',') !==
            Array.from(prevState.activeBlockIds).sort().join(',')

          const hasExecutionStateChanged = state.isExecuting !== prevState.isExecuting

          if (hasActiveBlocksChanged || hasExecutionStateChanged) {
            logger.debug('Execution state changed, updating chat representation')
            syncStore.handleWorkflowStateChange({
              type: 'execution_state_changed',
              timestamp: Date.now(),
              source: 'execution',
              data: {
                activeBlocks: Array.from(state.activeBlockIds),
                isExecuting: state.isExecuting,
                isDebugging: state.isDebugging,
                pendingBlocks: state.pendingBlocks,
              },
            })
          }
        })
      },

      subscribeToChatChanges: () => {
        // Subscribe to chat store changes
        useChatStore.subscribe((state, prevState) => {
          const syncStore = get()
          if (!syncStore.isEnabled || syncStore.syncState === 'syncing') return

          // Detect new user messages that might be chat commands
          const newMessages = state.messages.filter(
            (msg) =>
              !prevState.messages.some((prevMsg) => prevMsg.id === msg.id) && msg.type === 'user'
          )

          newMessages.forEach((message) => {
            const command = syncStore.parseChatCommand(String(message.content))
            if (command) {
              logger.debug('Chat command detected:', command)
              syncStore.handleChatCommand(command, message.id)
            }
          })
        })
      },

      handleWorkflowStateChange: (event: StateChangeEvent) => {
        const state = get()
        if (!state.isEnabled) return

        logger.debug('Handling workflow state change:', event)

        set({ syncState: 'syncing' })

        // Generate natural language representation of the change
        const representation = state.generateWorkflowStateRepresentation()

        // Add a chat message describing the change
        const chatMessage = state.generateStateChangeMessage(event)
        if (chatMessage) {
          useChatStore.getState().addMessage({
            content: chatMessage,
            workflowId: useWorkflowRegistry.getState().activeWorkflowId || '',
            type: 'workflow',
          })
        }

        set({
          workflowStateRepresentation: representation,
          lastSyncTimestamp: Date.now(),
          syncState: 'idle',
        })
      },

      handleChatCommand: (command: ChatCommand, messageId: string) => {
        const state = get()
        if (!state.isEnabled) return

        logger.info('Processing chat command:', command)

        set({
          syncState: 'syncing',
          chatCommandHistory: [
            ...state.chatCommandHistory,
            { ...command, messageId, timestamp: Date.now() },
          ],
        })

        try {
          state.executeWorkflowCommand(command)

          // Add confirmation message
          useChatStore.getState().addMessage({
            content: `✓ ${command.description}`,
            workflowId: useWorkflowRegistry.getState().activeWorkflowId || '',
            type: 'workflow',
          })
        } catch (error) {
          logger.error('Failed to execute chat command:', error)

          // Add error message
          useChatStore.getState().addMessage({
            content: `✗ Failed to ${command.description}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            workflowId: useWorkflowRegistry.getState().activeWorkflowId || '',
            type: 'workflow',
          })
        }

        set({ syncState: 'idle' })
      },

      parseChatCommand: (message: string): ChatCommand | null => {
        const trimmedMessage = message.trim().toLowerCase()

        // Add a new block
        if (trimmedMessage.startsWith('add ') || trimmedMessage.startsWith('create ')) {
          const blockTypeMatch = trimmedMessage.match(
            /(?:add|create)\s+(?:a\s+)?(\w+)(?:\s+block)?/i
          )
          if (blockTypeMatch) {
            return {
              type: 'add_block',
              description: `add ${blockTypeMatch[1]} block`,
              parameters: {
                blockType: blockTypeMatch[1],
                position: { x: 200, y: 200 }, // Default position
              },
            }
          }
        }

        // Delete a block
        if (trimmedMessage.startsWith('delete ') || trimmedMessage.startsWith('remove ')) {
          const blockNameMatch = trimmedMessage.match(
            /(?:delete|remove)\s+(?:the\s+)?(.+?)(?:\s+block)?$/i
          )
          if (blockNameMatch) {
            return {
              type: 'delete_block',
              description: `delete ${blockNameMatch[1]} block`,
              parameters: {
                blockIdentifier: blockNameMatch[1].trim(),
              },
            }
          }
        }

        // Connect blocks
        if (trimmedMessage.includes('connect') && trimmedMessage.includes('to')) {
          const connectionMatch = trimmedMessage.match(/connect\s+(.+?)\s+to\s+(.+)/i)
          if (connectionMatch) {
            return {
              type: 'connect_blocks',
              description: `connect ${connectionMatch[1]} to ${connectionMatch[2]}`,
              parameters: {
                sourceBlock: connectionMatch[1].trim(),
                targetBlock: connectionMatch[2].trim(),
              },
            }
          }
        }

        // Modify block properties
        if (trimmedMessage.startsWith('set ') || trimmedMessage.startsWith('update ')) {
          const propertyMatch = trimmedMessage.match(
            /(?:set|update)\s+(.+?)\s+(?:of|in)\s+(.+?)\s+to\s+(.+)/i
          )
          if (propertyMatch) {
            return {
              type: 'modify_block',
              description: `set ${propertyMatch[1]} of ${propertyMatch[2]} to ${propertyMatch[3]}`,
              parameters: {
                blockIdentifier: propertyMatch[2].trim(),
                property: propertyMatch[1].trim(),
                value: propertyMatch[3].trim(),
              },
            }
          }
        }

        // Execute workflow
        if (
          trimmedMessage.includes('run') ||
          trimmedMessage.includes('execute') ||
          trimmedMessage.includes('start')
        ) {
          return {
            type: 'execute_workflow',
            description: 'execute workflow',
            parameters: {},
          }
        }

        // Get workflow status
        if (
          trimmedMessage.includes('status') ||
          trimmedMessage.includes('state') ||
          trimmedMessage.includes('info')
        ) {
          return {
            type: 'get_status',
            description: 'get workflow status',
            parameters: {},
          }
        }

        return null
      },

      executeWorkflowCommand: (command: ChatCommand) => {
        const workflowStore = useWorkflowStore.getState()
        const activeWorkflowId = useWorkflowRegistry.getState().activeWorkflowId

        if (!activeWorkflowId) {
          throw new Error('No active workflow')
        }

        switch (command.type) {
          case 'add_block':
            get().addBlockViaCommand(command.parameters)
            break

          case 'delete_block':
            get().deleteBlockViaCommand(command.parameters.blockIdentifier)
            break

          case 'connect_blocks':
            get().connectBlocksViaCommand(
              command.parameters.sourceBlock,
              command.parameters.targetBlock
            )
            break

          case 'modify_block':
            get().modifyBlockViaCommand(
              command.parameters.blockIdentifier,
              command.parameters.property,
              command.parameters.value
            )
            break

          case 'execute_workflow':
            // Trigger workflow execution
            useExecutionStore.getState().setIsExecuting(true)
            break

          case 'get_status':
            get().provideWorkflowStatus()
            break

          default:
            throw new Error(`Unknown command type: ${command.type}`)
        }
      },

      addBlockViaCommand: (parameters: any) => {
        const workflowStore = useWorkflowStore.getState()
        const blockId = crypto.randomUUID()

        // Create a basic block structure based on type
        const newBlock = {
          id: blockId,
          type: parameters.blockType,
          name: parameters.blockType.charAt(0).toUpperCase() + parameters.blockType.slice(1),
          position: parameters.position,
          subBlocks: {},
          outputs: {
            response: {
              type: { input: 'any' },
            },
          },
          enabled: true,
          horizontalHandles: true,
          isWide: false,
          advancedMode: false,
          triggerMode: false,
          height: 0,
        }

        workflowStore.addBlock(newBlock)
        logger.info(`Added ${parameters.blockType} block via chat command`)
      },

      deleteBlockViaCommand: (blockIdentifier: string) => {
        const workflowStore = useWorkflowStore.getState()

        // Find block by name or ID
        const block = Object.values(workflowStore.blocks).find(
          (block) =>
            block.name.toLowerCase() === blockIdentifier.toLowerCase() ||
            block.id === blockIdentifier ||
            block.type.toLowerCase() === blockIdentifier.toLowerCase()
        )

        if (!block) {
          throw new Error(`Block not found: ${blockIdentifier}`)
        }

        workflowStore.removeBlock(block.id)
        logger.info(`Deleted block ${block.name} via chat command`)
      },

      connectBlocksViaCommand: (sourceIdentifier: string, targetIdentifier: string) => {
        const workflowStore = useWorkflowStore.getState()

        // Find source and target blocks
        const sourceBlock = Object.values(workflowStore.blocks).find(
          (block) =>
            block.name.toLowerCase().includes(sourceIdentifier.toLowerCase()) ||
            block.id === sourceIdentifier ||
            block.type.toLowerCase().includes(sourceIdentifier.toLowerCase())
        )

        const targetBlock = Object.values(workflowStore.blocks).find(
          (block) =>
            block.name.toLowerCase().includes(targetIdentifier.toLowerCase()) ||
            block.id === targetIdentifier ||
            block.type.toLowerCase().includes(targetIdentifier.toLowerCase())
        )

        if (!sourceBlock) {
          throw new Error(`Source block not found: ${sourceIdentifier}`)
        }

        if (!targetBlock) {
          throw new Error(`Target block not found: ${targetIdentifier}`)
        }

        // Create edge
        const newEdge = {
          id: crypto.randomUUID(),
          source: sourceBlock.id,
          target: targetBlock.id,
          sourceHandle: 'response',
          targetHandle: 'input',
          type: 'default',
        }

        workflowStore.addEdge(newEdge)
        logger.info(`Connected ${sourceBlock.name} to ${targetBlock.name} via chat command`)
      },

      modifyBlockViaCommand: (blockIdentifier: string, property: string, value: string) => {
        const workflowStore = useWorkflowStore.getState()

        // Find block
        const block = Object.values(workflowStore.blocks).find(
          (block) =>
            block.name.toLowerCase().includes(blockIdentifier.toLowerCase()) ||
            block.id === blockIdentifier ||
            block.type.toLowerCase().includes(blockIdentifier.toLowerCase())
        )

        if (!block) {
          throw new Error(`Block not found: ${blockIdentifier}`)
        }

        // Update block property
        if (property.toLowerCase() === 'name') {
          workflowStore.updateBlock(block.id, { name: value })
        } else {
          // Try to update subblock value
          const subBlock = Object.values(block.subBlocks).find(
            (sb) => (sb as any).id?.toLowerCase() === property.toLowerCase()
          )

          if (subBlock) {
            useSubBlockStore.getState().setSubBlockValue(block.id, (subBlock as any).id, value)
          } else {
            throw new Error(`Property not found: ${property}`)
          }
        }

        logger.info(`Modified ${property} of ${block.name} to ${value} via chat command`)
      },

      provideWorkflowStatus: () => {
        const workflowStore = useWorkflowStore.getState()
        const executionStore = useExecutionStore.getState()
        const activeWorkflowId = useWorkflowRegistry.getState().activeWorkflowId

        const blockCount = Object.keys(workflowStore.blocks).length
        const edgeCount = workflowStore.edges.length
        const isExecuting = executionStore.isExecuting
        const activeBlocks = Array.from(executionStore.activeBlockIds)

        let statusMessage = `**Workflow Status:**\n`
        statusMessage += `• Blocks: ${blockCount}\n`
        statusMessage += `• Connections: ${edgeCount}\n`
        statusMessage += `• Status: ${isExecuting ? 'Running' : 'Idle'}\n`

        if (activeBlocks.length > 0) {
          const activeBlockNames = activeBlocks.map((id) => workflowStore.blocks[id]?.name || id)
          statusMessage += `• Active blocks: ${activeBlockNames.join(', ')}\n`
        }

        useChatStore.getState().addMessage({
          content: statusMessage,
          workflowId: activeWorkflowId || '',
          type: 'workflow',
        })
      },

      generateWorkflowStateRepresentation: (): WorkflowStateRepresentation => {
        const workflowStore = useWorkflowStore.getState()
        const executionStore = useExecutionStore.getState()
        const activeWorkflowId = useWorkflowRegistry.getState().activeWorkflowId

        if (!activeWorkflowId) {
          return {
            workflowId: '',
            summary: 'No active workflow',
            blockSummaries: [],
            connectionSummaries: [],
            executionState: 'idle',
          }
        }

        const blocks = workflowStore.blocks
        const edges = workflowStore.edges
        const activeBlocks = Array.from(executionStore.activeBlockIds)

        return {
          workflowId: activeWorkflowId,
          summary: `Workflow with ${Object.keys(blocks).length} blocks and ${edges.length} connections`,
          blockSummaries: Object.values(blocks).map((block) => ({
            id: block.id,
            type: block.type,
            name: block.name,
            isActive: activeBlocks.includes(block.id),
            isEnabled: block.enabled,
            position: block.position,
          })),
          connectionSummaries: edges.map((edge) => {
            const sourceBlock = blocks[edge.source]
            const targetBlock = blocks[edge.target]
            return {
              id: edge.id,
              description: `${sourceBlock?.name || edge.source} → ${targetBlock?.name || edge.target}`,
              sourceBlock: sourceBlock?.name || edge.source,
              targetBlock: targetBlock?.name || edge.target,
            }
          }),
          executionState: executionStore.isExecuting ? 'running' : 'idle',
        }
      },

      generateStateChangeMessage: (event: StateChangeEvent): string | null => {
        switch (event.type) {
          case 'workflow_modified':
            return '🔄 Workflow structure updated'

          case 'execution_state_changed':
            if (event.data.isExecuting) {
              return '▶️ Workflow execution started'
            }
            return '⏸️ Workflow execution completed'

          default:
            return null
        }
      },

      performFullSync: () => {
        const state = get()
        if (!state.isEnabled) return

        logger.info('Performing full synchronization between workflow and chat')

        // Generate current workflow state representation
        const representation = state.generateWorkflowStateRepresentation()

        // Add initial sync message to chat
        if (representation.workflowId) {
          useChatStore.getState().addMessage({
            content: `🔗 **Synchronized with workflow:** ${representation.summary}`,
            workflowId: representation.workflowId,
            type: 'workflow',
          })
        }

        set({
          workflowStateRepresentation: representation,
          lastSyncTimestamp: Date.now(),
        })

        logger.info('Full synchronization completed')
      },

      detectConflicts: () => {
        // Detect conflicts between pending changes
        const state = get()
        const conflicts: SyncConflict[] = []

        // This is a simplified conflict detection - in a real implementation,
        // you would check for overlapping changes to the same blocks/properties

        return conflicts
      },

      resolveConflict: (conflictId: string, resolution: 'chat' | 'visual' | 'merge') => {
        const state = get()
        const conflict = state.conflicts.find((c) => c.id === conflictId)

        if (!conflict) {
          logger.warn(`Conflict not found: ${conflictId}`)
          return
        }

        logger.info(`Resolving conflict ${conflictId} with strategy: ${resolution}`)

        // Remove resolved conflict
        set({
          conflicts: state.conflicts.filter((c) => c.id !== conflictId),
        })

        // Apply resolution based on strategy
        switch (resolution) {
          case 'chat':
            // Apply chat-driven changes
            break
          case 'visual':
            // Apply visual-driven changes
            break
          case 'merge':
            // Attempt to merge both changes
            break
        }
      },

      addPendingChange: (change) => {
        set((state) => ({
          pendingChanges: [...state.pendingChanges, change],
        }))
      },

      clearPendingChanges: () => {
        set({ pendingChanges: [] })
      },
    }),
    { name: 'workflow-chat-sync' }
  )
)

/**
 * Hook to initialize workflow-chat synchronization
 * Call this in your main application component
 */
export const useInitializeWorkflowChatSync = () => {
  const store = useWorkflowChatSyncStore()

  // Initialize synchronization when the hook is first used
  if (store.isEnabled && store.syncState === 'idle' && !store.lastSyncTimestamp) {
    store.initializeSync()
  }

  return {
    isEnabled: store.isEnabled,
    syncState: store.syncState,
    enableSync: store.enableSync,
    disableSync: store.disableSync,
    conflicts: store.conflicts,
    resolveConflict: store.resolveConflict,
  }
}
