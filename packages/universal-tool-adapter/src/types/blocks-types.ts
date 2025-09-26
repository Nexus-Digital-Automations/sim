/**
 * Block Types
 *
 * Minimal subset of block types needed for the universal tool adapter.
 * This is a copy of the essential types from apps/sim/blocks/types.ts
 * to keep the universal-tool-adapter package self-contained.
 */

export type SubBlockLayout = 'full' | 'half'

export type SubBlockType =
  | 'short-input' // Single line input
  | 'long-input' // Multi-line input
  | 'dropdown' // Select menu
  | 'combobox' // Searchable dropdown with text input
  | 'slider' // Range input
  | 'table' // Grid layout
  | 'code' // Code editor
  | 'switch' // Toggle button
  | 'tool-input' // Tool configuration
  | 'checkbox-list' // Multiple selection
  | 'condition-input' // Conditional logic
  | 'eval-input' // Evaluation input
  | 'time-input' // Time input
  | 'oauth-input' // OAuth credential selector
  | 'webhook-config' // Webhook configuration
  | 'trigger-config' // Trigger configuration
  | 'schedule-config' // Schedule status and information
  | 'file-selector' // File selector for Google Drive, etc.
  | 'project-selector' // Project selector for Jira, Discord, etc.
  | 'channel-selector' // Channel selector for Slack, Discord, etc.
  | 'folder-selector' // Folder selector for Gmail, etc.
  | 'knowledge-base-selector' // Knowledge base selector
  | 'knowledge-tag-filters' // Multiple tag filters for knowledge bases
  | 'document-selector' // Document selector for knowledge bases
  | 'document-tag-entry' // Document tag entry for creating documents

export type GenerationType =
  | 'javascript-function-body'
  | 'typescript-function-body'
  | 'json-schema'
  | 'json-object'
  | 'system-prompt'
  | 'custom-tool-schema'
  | 'sql-query'
  | 'postgrest'
  | 'mongodb-filter'
  | 'mongodb-pipeline'
  | 'mongodb-sort'
  | 'mongodb-documents'
  | 'mongodb-update'

export interface SubBlockConfig {
  id: string
  title?: string
  type: SubBlockType
  layout?: SubBlockLayout
  mode?: 'basic' | 'advanced' | 'both' // Default is 'both' if not specified
  canonicalParamId?: string
  required?: boolean
  defaultValue?: string | number | boolean | Record<string, unknown> | Array<unknown>
  options?:
    | { label: string; id: string; icon?: React.ComponentType<{ className?: string }> }[]
    | (() => { label: string; id: string; icon?: React.ComponentType<{ className?: string }> }[])
  min?: number
  max?: number
  columns?: string[]
  placeholder?: string
  password?: boolean
  connectionDroppable?: boolean
  hidden?: boolean
  description?: string
  value?: (params: Record<string, any>) => string
  condition?:
    | {
        field: string
        value: string | number | boolean | Array<string | number | boolean>
        not?: boolean
        and?: {
          field: string
          value: string | number | boolean | Array<string | number | boolean> | undefined
          not?: boolean
        }
      }
    | (() => {
        field: string
        value: string | number | boolean | Array<string | number | boolean>
        not?: boolean
        and?: {
          field: string
          value: string | number | boolean | Array<string | number | boolean> | undefined
          not?: boolean
        }
      })
  // Props specific to 'code' sub-block type
  language?: 'javascript' | 'json'
  generationType?: GenerationType
  // OAuth specific properties
  provider?: string
  serviceId?: string
  requiredScopes?: string[]
  // File selector specific properties
  mimeType?: string
  // File upload specific properties
  acceptedTypes?: string
  multiple?: boolean
  maxSize?: number
  // Slider-specific properties
  step?: number
  integer?: boolean
  // Long input specific properties
  rows?: number
  // Multi-select functionality
  multiSelect?: boolean
  // Wand configuration for AI assistance
  wandConfig?: {
    enabled: boolean
    prompt: string // Custom prompt template for this subblock
    generationType?: GenerationType // Optional custom generation type
    placeholder?: string // Custom placeholder for the prompt input
    maintainHistory?: boolean // Whether to maintain conversation history
  }
  // Trigger-specific configuration
  availableTriggers?: string[] // List of trigger IDs available for this subblock
  triggerProvider?: string // Which provider's triggers to show
  // Declarative dependency hints for cross-field clearing or invalidation
  // Example: dependsOn: ['credential'] means this field should be cleared when credential changes
  dependsOn?: string[]
}

export type BlockCategory =
  | 'data'
  | 'ai'
  | 'logic'
  | 'integration'
  | 'communication'
  | 'storage'
  | 'analysis'
  | 'workflow'
  | 'custom'

export interface BlockConfig {
  id: string
  title: string
  description?: string
  category?: BlockCategory
  icon?: string
  subBlocks?: SubBlockConfig[]
  version?: string
  author?: string
  tags?: string[]
  // Additional properties that might be referenced in test framework
  type?: string // Block type identifier (fallback to id if not provided)
  name?: string // Human-readable name (fallback to title if not provided)
  // Tools configuration for block access and permissions
  tools?: {
    access: string[] // Array of tool identifiers this block can access
  }
}
