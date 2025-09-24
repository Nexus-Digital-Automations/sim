/**
 * Workflow Chat Synchronization Types
 *
 * This file defines the types used for bidirectional synchronization
 * between the visual workflow interface and the chat interface.
 */

export type SyncState = 'idle' | 'syncing' | 'conflict' | 'error'

export interface WorkflowStateRepresentation {
  workflowId: string
  summary: string
  blockSummaries: BlockSummary[]
  connectionSummaries: ConnectionSummary[]
  executionState: 'idle' | 'running' | 'paused' | 'error'
  timestamp?: number
}

export interface BlockSummary {
  id: string
  type: string
  name: string
  isActive: boolean
  isEnabled: boolean
  position: { x: number; y: number }
  description?: string
  configurationSummary?: string
}

export interface ConnectionSummary {
  id: string
  description: string
  sourceBlock: string
  targetBlock: string
  isActive?: boolean
}

export type ChatCommandType =
  | 'add_block'
  | 'delete_block'
  | 'connect_blocks'
  | 'disconnect_blocks'
  | 'modify_block'
  | 'move_block'
  | 'enable_block'
  | 'disable_block'
  | 'execute_workflow'
  | 'pause_workflow'
  | 'stop_workflow'
  | 'get_status'
  | 'describe_workflow'
  | 'explain_block'

export interface ChatCommand {
  type: ChatCommandType
  description: string
  parameters: Record<string, any>
  confidence?: number
  timestamp?: number
}

export interface ChatCommandHistory extends ChatCommand {
  messageId: string
  timestamp: number
  result?: 'success' | 'error'
  error?: string
}

export type StateChangeEventType =
  | 'workflow_modified'
  | 'block_added'
  | 'block_removed'
  | 'block_modified'
  | 'connection_added'
  | 'connection_removed'
  | 'execution_state_changed'
  | 'block_execution_started'
  | 'block_execution_completed'
  | 'block_execution_error'

export interface StateChangeEvent {
  type: StateChangeEventType
  timestamp: number
  source: 'visual' | 'chat' | 'execution' | 'system'
  data: any
  workflowId?: string
  blockId?: string
}

export interface PendingChange {
  id: string
  type: StateChangeEventType
  source: 'visual' | 'chat'
  timestamp: number
  data: any
  applied?: boolean
}

export type ConflictType =
  | 'concurrent_block_modification'
  | 'concurrent_connection_change'
  | 'execution_state_conflict'
  | 'structural_conflict'

export interface SyncConflict {
  id: string
  type: ConflictType
  timestamp: number
  chatChange: PendingChange
  visualChange: PendingChange
  description: string
  autoResolvable: boolean
  suggestedResolution?: 'chat' | 'visual' | 'merge'
}

export interface WorkflowChatSyncStore {
  // State
  isEnabled: boolean
  syncState: SyncState
  lastSyncTimestamp: number | null
  pendingChanges: PendingChange[]
  conflicts: SyncConflict[]
  workflowStateRepresentation: WorkflowStateRepresentation | null
  chatCommandHistory: ChatCommandHistory[]

  // Core Actions
  enableSync: () => void
  disableSync: () => void
  setSyncState: (state: SyncState) => void
  initializeSync: () => void

  // Subscription Management
  subscribeToWorkflowChanges: () => void
  subscribeToChatChanges: () => void

  // Event Handling
  handleWorkflowStateChange: (event: StateChangeEvent) => void
  handleChatCommand: (command: ChatCommand, messageId: string) => void

  // Chat Command Processing
  parseChatCommand: (message: string) => ChatCommand | null
  executeWorkflowCommand: (command: ChatCommand) => void

  // Specific Command Implementations
  addBlockViaCommand: (parameters: any) => void
  deleteBlockViaCommand: (blockIdentifier: string) => void
  connectBlocksViaCommand: (sourceIdentifier: string, targetIdentifier: string) => void
  modifyBlockViaCommand: (blockIdentifier: string, property: string, value: string) => void
  provideWorkflowStatus: () => void

  // State Representation
  generateWorkflowStateRepresentation: () => WorkflowStateRepresentation
  generateStateChangeMessage: (event: StateChangeEvent) => string | null

  // Synchronization
  performFullSync: () => void

  // Conflict Resolution
  detectConflicts: () => SyncConflict[]
  resolveConflict: (conflictId: string, resolution: 'chat' | 'visual' | 'merge') => void

  // Change Management
  addPendingChange: (change: PendingChange) => void
  clearPendingChanges: () => void
}

// Natural Language Processing Types
export interface NLPPattern {
  pattern: RegExp
  commandType: ChatCommandType
  parameterExtractor: (match: RegExpMatchArray) => Record<string, any>
  description: string
}

// Enhanced Chat Command Suggestions
export interface CommandSuggestion {
  command: string
  description: string
  example: string
  category: 'structure' | 'execution' | 'configuration' | 'information'
}

// Block Type Mappings for Natural Language
export interface BlockTypeMapping {
  aliases: string[]
  type: string
  description: string
  defaultSubBlocks?: Record<string, any>
}

// Real-time State Broadcasting
export interface StateUpdate {
  timestamp: number
  workflowId: string
  updateType: StateChangeEventType
  payload: any
  source: 'visual' | 'chat'
}

// Workflow Modification Context
export interface ModificationContext {
  initiator: 'user' | 'system'
  source: 'visual' | 'chat'
  timestamp: number
  reason?: string
  batchId?: string // For grouping related changes
}

// Advanced Conflict Resolution
export interface ConflictResolutionStrategy {
  type: ConflictType
  autoResolve: boolean
  resolver: (conflict: SyncConflict) => 'chat' | 'visual' | 'merge' | 'manual'
  priority: number
}

// State Validation
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

// Sync Performance Metrics
export interface SyncMetrics {
  totalSyncs: number
  avgSyncTime: number
  conflictCount: number
  successRate: number
  lastSyncDuration: number
}

// Export all command types for easy reference
export const CHAT_COMMANDS: Record<ChatCommandType, CommandSuggestion> = {
  add_block: {
    command: 'add [block_type]',
    description: 'Add a new block to the workflow',
    example: 'add llm block',
    category: 'structure'
  },
  delete_block: {
    command: 'delete [block_name]',
    description: 'Remove a block from the workflow',
    example: 'delete start block',
    category: 'structure'
  },
  connect_blocks: {
    command: 'connect [source] to [target]',
    description: 'Create a connection between two blocks',
    example: 'connect start to llm',
    category: 'structure'
  },
  disconnect_blocks: {
    command: 'disconnect [source] from [target]',
    description: 'Remove a connection between blocks',
    example: 'disconnect start from llm',
    category: 'structure'
  },
  modify_block: {
    command: 'set [property] of [block] to [value]',
    description: 'Modify a block property',
    example: 'set name of llm block to OpenAI',
    category: 'configuration'
  },
  move_block: {
    command: 'move [block] to [position]',
    description: 'Change block position',
    example: 'move llm block to top right',
    category: 'structure'
  },
  enable_block: {
    command: 'enable [block]',
    description: 'Enable a disabled block',
    example: 'enable llm block',
    category: 'configuration'
  },
  disable_block: {
    command: 'disable [block]',
    description: 'Disable a block',
    example: 'disable debug block',
    category: 'configuration'
  },
  execute_workflow: {
    command: 'run workflow / start workflow',
    description: 'Execute the current workflow',
    example: 'run workflow',
    category: 'execution'
  },
  pause_workflow: {
    command: 'pause workflow',
    description: 'Pause workflow execution',
    example: 'pause workflow',
    category: 'execution'
  },
  stop_workflow: {
    command: 'stop workflow',
    description: 'Stop workflow execution',
    example: 'stop workflow',
    category: 'execution'
  },
  get_status: {
    command: 'status / workflow status',
    description: 'Get current workflow status',
    example: 'what is the workflow status?',
    category: 'information'
  },
  describe_workflow: {
    command: 'describe workflow',
    description: 'Get a description of the workflow structure',
    example: 'describe this workflow',
    category: 'information'
  },
  explain_block: {
    command: 'explain [block]',
    description: 'Get information about a specific block',
    example: 'explain llm block',
    category: 'information'
  }
}