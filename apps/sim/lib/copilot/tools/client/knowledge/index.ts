/**
 * Nexus Copilot Knowledge Tools
 * Comprehensive knowledge base management and search capabilities
 *
 * Features:
 * - Hybrid vector and full-text search
 * - Knowledge base creation and management
 * - Document processing and chunking
 * - Tag-based categorization and filtering
 * - Cost tracking and analytics
 */

// Re-export types for external usage
export type {
  ClientToolDefinition,
  ToolExecutionContext,
  ToolRunResult,
} from '@/lib/copilot/tools/client/types'
export {
  manageKnowledgeAITool,
  manageKnowledgeTool,
} from './manage-knowledge'
export {
  searchKnowledgeAITool,
  searchKnowledgeTool,
} from './search-knowledge'
