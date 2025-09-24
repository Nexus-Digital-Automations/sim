/**
 * Workflow Chat Synchronization Components
 *
 * A comprehensive system for bidirectional synchronization between
 * visual workflow interfaces and chat interfaces.
 */

export { WorkflowStateDisplay } from './WorkflowStateDisplay'
export { ChatCommandSuggestions } from './ChatCommandSuggestions'
export { ConflictResolutionDialog } from './ConflictResolutionDialog'
export { SynchronizedChatInterface } from './SynchronizedChatInterface'

// Re-export store and types for convenience
export {
  useWorkflowChatSyncStore,
  useInitializeWorkflowChatSync
} from '@/stores/workflow-chat-sync/store'

export type {
  WorkflowStateRepresentation,
  ChatCommand,
  SyncConflict,
  StateChangeEvent,
  SyncState,
  ChatCommandType
} from '@/stores/workflow-chat-sync/types'

export { CHAT_COMMANDS } from '@/stores/workflow-chat-sync/types'