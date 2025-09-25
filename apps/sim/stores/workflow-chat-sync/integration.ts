/**
 * Integration Utilities for Workflow Chat Synchronization
 *
 * These utilities help integrate the synchronization system
 * with existing chat components and workflows.
 */

import { useCallback, useEffect } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { useExecutionStore } from '@/stores/execution/store'
import { useChatStore } from '@/stores/panel/chat/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'
import { useWorkflowChatSyncStore } from './store'
import type { StateChangeEvent } from './types'

const logger = createLogger('WorkflowChatSyncIntegration')

/**
 * Hook to enhance existing chat interface with synchronization capabilities
 */
export function useChatSyncIntegration(
  options: { enableOnMount?: boolean; autoResolveConflicts?: boolean; notifyOnSync?: boolean } = {}
) {
  const { enableOnMount = true, autoResolveConflicts = false, notifyOnSync = true } = options

  const syncStore = useWorkflowChatSyncStore()
  const chatStore = useChatStore()
  const workflowRegistry = useWorkflowRegistry()

  // Initialize sync on mount
  useEffect(() => {
    if (enableOnMount && !syncStore.isEnabled) {
      logger.info('Auto-enabling workflow-chat synchronization')
      syncStore.enableSync()
    }
  }, [enableOnMount, syncStore])

  // Auto-resolve conflicts if enabled
  useEffect(() => {
    if (autoResolveConflicts && syncStore.conflicts.length > 0) {
      logger.info('Auto-resolving sync conflicts')
      syncStore.conflicts.forEach((conflict) => {
        const resolution = conflict.suggestedResolution || 'visual'
        syncStore.resolveConflict(conflict.id, resolution)
      })
    }
  }, [autoResolveConflicts, syncStore])

  // Notification system
  const notifyUser = useCallback(
    (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
      if (notifyOnSync && workflowRegistry.activeWorkflowId) {
        const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
        chatStore.addMessage({
          content: `${icon} ${message}`,
          workflowId: workflowRegistry.activeWorkflowId,
          type: 'workflow',
        })
      }
    },
    [notifyOnSync, workflowRegistry.activeWorkflowId, chatStore]
  )

  // Enhanced command processing
  const processEnhancedCommand = useCallback(
    (message: string) => {
      const command = syncStore.parseChatCommand(message)

      if (command) {
        logger.info('Processing enhanced chat command:', command)

        try {
          // Add command acknowledgment
          if (notifyOnSync && workflowRegistry.activeWorkflowId) {
            chatStore.addMessage({
              content: `🔄 Processing: ${command.description}`,
              workflowId: workflowRegistry.activeWorkflowId,
              type: 'workflow',
            })
          }

          // Execute command
          syncStore.executeWorkflowCommand(command)

          return true
        } catch (error) {
          logger.error('Failed to execute enhanced command:', error)
          notifyUser(
            `Failed to ${command.description}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'error'
          )
          return false
        }
      }

      return false
    },
    [syncStore, notifyUser, chatStore, workflowRegistry.activeWorkflowId, notifyOnSync]
  )

  // State change notifications
  useEffect(() => {
    if (!syncStore.isEnabled || !notifyOnSync) return

    const handleStateChange = (event: StateChangeEvent) => {
      switch (event.type) {
        case 'workflow_modified':
          notifyUser('Workflow structure has been updated')
          break
        case 'execution_state_changed':
          if (event.data.isExecuting) {
            notifyUser('Workflow execution started', 'info')
          } else {
            notifyUser('Workflow execution completed', 'info')
          }
          break
        case 'block_added':
          notifyUser(`Block added: ${event.data.name || event.data.type}`)
          break
        case 'block_removed':
          notifyUser(`Block removed: ${event.data.name || event.data.type}`)
          break
        case 'connection_added':
          notifyUser(`Connection created: ${event.data.description}`)
          break
        case 'connection_removed':
          notifyUser(`Connection removed: ${event.data.description}`)
          break
      }
    }

    // This would be part of the event system in a full implementation
    // For now, we'll use the existing state representations
  }, [syncStore.isEnabled, notifyOnSync, notifyUser])

  return {
    // Sync state
    isEnabled: syncStore.isEnabled,
    syncState: syncStore.syncState,
    conflicts: syncStore.conflicts,

    // Actions
    enableSync: syncStore.enableSync,
    disableSync: syncStore.disableSync,
    processCommand: processEnhancedCommand,

    // Utilities
    notifyUser,

    // State representation
    workflowState: syncStore.workflowStateRepresentation,
  }
}

/**
 * Hook to add workflow state awareness to existing components
 */
export function useWorkflowStateAwareness() {
  const syncStore = useWorkflowChatSyncStore()
  const workflowStore = useWorkflowStore()
  const executionStore = useExecutionStore()
  const workflowRegistry = useWorkflowRegistry()

  // Get current workflow state summary
  const getWorkflowSummary = useCallback(() => {
    if (!workflowRegistry.activeWorkflowId) {
      return 'No active workflow'
    }

    const blockCount = Object.keys(workflowStore.blocks).length
    const edgeCount = workflowStore.edges.length
    const isExecuting = executionStore.isExecuting
    const activeBlocks = Array.from(executionStore.activeBlockIds)

    return {
      workflowId: workflowRegistry.activeWorkflowId,
      blockCount,
      edgeCount,
      isExecuting,
      activeBlockCount: activeBlocks.length,
      status: isExecuting ? 'running' : 'idle',
    }
  }, [workflowRegistry.activeWorkflowId, workflowStore, executionStore])

  // Get block by name or ID
  const findBlock = useCallback(
    (identifier: string) => {
      return Object.values(workflowStore.blocks).find(
        (block) =>
          block.name.toLowerCase().includes(identifier.toLowerCase()) ||
          block.id === identifier ||
          block.type.toLowerCase().includes(identifier.toLowerCase())
      )
    },
    [workflowStore.blocks]
  )

  // Get connection summary
  const getConnections = useCallback(() => {
    return workflowStore.edges.map((edge) => {
      const sourceBlock = workflowStore.blocks[edge.source]
      const targetBlock = workflowStore.blocks[edge.target]
      return {
        id: edge.id,
        source: sourceBlock?.name || edge.source,
        target: targetBlock?.name || edge.target,
        description: `${sourceBlock?.name || edge.source} → ${targetBlock?.name || edge.target}`,
      }
    })
  }, [workflowStore.blocks, workflowStore.edges])

  return {
    summary: getWorkflowSummary(),
    findBlock,
    connections: getConnections(),
    isEnabled: syncStore.isEnabled,
    representation: syncStore.workflowStateRepresentation,
  }
}

/**
 * Utility to create workflow state snapshots for debugging
 */
export function createWorkflowSnapshot() {
  const workflowStore = useWorkflowStore.getState()
  const executionStore = useExecutionStore.getState()
  const syncStore = useWorkflowChatSyncStore.getState()
  const workflowRegistry = useWorkflowRegistry.getState()

  return {
    timestamp: Date.now(),
    workflowId: workflowRegistry.activeWorkflowId,
    sync: {
      enabled: syncStore.isEnabled,
      state: syncStore.syncState,
      conflicts: syncStore.conflicts.length,
      lastSync: syncStore.lastSyncTimestamp,
    },
    workflow: {
      blockCount: Object.keys(workflowStore.blocks).length,
      edgeCount: workflowStore.edges.length,
      blocks: Object.entries(workflowStore.blocks).map(([id, block]) => ({
        id,
        type: block.type,
        name: block.name,
        enabled: block.enabled,
        position: block.position,
      })),
    },
    execution: {
      isExecuting: executionStore.isExecuting,
      isDebugging: executionStore.isDebugging,
      activeBlocks: Array.from(executionStore.activeBlockIds),
      pendingBlocks: executionStore.pendingBlocks,
    },
  }
}

/**
 * Enhanced message handler that processes both regular messages and commands
 */
export function createEnhancedMessageHandler() {
  const syncStore = useWorkflowChatSyncStore.getState()
  const chatStore = useChatStore.getState()
  const workflowRegistry = useWorkflowRegistry.getState()

  return async (message: string, workflowId?: string) => {
    const targetWorkflowId = workflowId || workflowRegistry.activeWorkflowId

    if (!targetWorkflowId) {
      logger.warn('No target workflow for message')
      return false
    }

    // Add user message
    chatStore.addMessage({
      content: message,
      workflowId: targetWorkflowId,
      type: 'user',
    })

    // Check if it's a command
    if (syncStore.isEnabled) {
      const command = syncStore.parseChatCommand(message)

      if (command) {
        try {
          syncStore.executeWorkflowCommand(command)
          return true
        } catch (error) {
          logger.error('Failed to execute command:', error)
          chatStore.addMessage({
            content: `❌ Failed to ${command.description}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            workflowId: targetWorkflowId,
            type: 'workflow',
          })
          return false
        }
      }
    }

    // If not a command, handle as regular workflow input
    // This would integrate with existing workflow execution logic
    return false
  }
}

/**
 * Batch operation utilities for complex workflow modifications
 */
export class WorkflowBatchOperations {
  private operations: (() => void)[] = []
  private syncStore = useWorkflowChatSyncStore.getState()

  addOperation(operation: () => void) {
    this.operations.push(operation)
    return this
  }

  addBlock(type: string, name: string, position: { x: number; y: number }) {
    return this.addOperation(() => {
      this.syncStore.addBlockViaCommand({ blockType: type, position })
    })
  }

  connectBlocks(source: string, target: string) {
    return this.addOperation(() => {
      this.syncStore.connectBlocksViaCommand(source, target)
    })
  }

  execute() {
    if (this.operations.length === 0) return

    logger.info(`Executing batch of ${this.operations.length} operations`)

    this.syncStore.setSyncState('syncing')

    try {
      this.operations.forEach((operation) => operation())
      this.syncStore.setSyncState('idle')
      logger.info('Batch operations completed successfully')
    } catch (error) {
      this.syncStore.setSyncState('error')
      logger.error('Batch operations failed:', error)
      throw error
    } finally {
      this.operations = []
    }
  }
}

export default {
  useChatSyncIntegration,
  useWorkflowStateAwareness,
  createWorkflowSnapshot,
  createEnhancedMessageHandler,
  WorkflowBatchOperations,
}
