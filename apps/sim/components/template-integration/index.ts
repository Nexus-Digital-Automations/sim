/**
 * Template Integration Components
 * 
 * Comprehensive template integration system for the Sim workflow editor.
 * Provides seamless browsing, preview, and application of workflow templates.
 * 
 * Components:
 * - TemplateBrowser: Browse and search templates with context-aware suggestions
 * - TemplatePreviewModal: Preview templates with variable configuration and conflict resolution
 * - WorkflowTemplateButton: Control bar button for template access
 * 
 * Services:
 * - TemplateIntegrationService: Core template application logic
 * 
 * Features:
 * - Context-aware template suggestions based on current workflow
 * - One-click template instantiation with smart defaults
 * - Advanced preview with conflict detection and resolution
 * - Variable mapping and customization before application
 * - Seamless integration with existing workflow editor
 * - Undo/redo support for template operations
 * - Real-time collaboration support
 */

// Core components
export { TemplateBrowser } from './template-browser'
export { TemplatePreviewModal } from './template-preview-modal'
export { WorkflowTemplateButton } from './workflow-template-button'

// Types for template integration
export type {
  TemplateApplicationOptions,
  TemplateApplicationResult,
  ConflictAnalysis,
} from '@/lib/templates/workflow-integration'

// Re-export the integration service for advanced use cases
export { TemplateIntegrationService } from '@/lib/templates/workflow-integration'

// Type definitions for component props
export interface TemplateIntegrationContextType {
  workflowId: string
  workflowContext: {
    blockTypes: string[]
    categories: string[]
    integrations: string[]
    complexity: 'simple' | 'moderate' | 'complex'
  }
  userPermissions: {
    canEdit: boolean
    canRead: boolean
  }
}

export interface TemplateVariable {
  key: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  defaultValue?: any
  required: boolean
  placeholder?: string
  options?: string[]
}

export interface WorkflowBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  data?: any
}

export interface TemplateConflict {
  type: 'name_conflict' | 'position_conflict' | 'dependency_conflict' | 'id_conflict'
  description: string
  severity: 'low' | 'medium' | 'high'
  affectedItems: string[]
  suggestedResolution: string
  autoResolvable: boolean
}