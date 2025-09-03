/**
 * Nexus Copilot Server-Side Knowledge Tools
 * Direct database access implementations for optimal performance
 *
 * Features:
 * - Direct PostgreSQL vector similarity search
 * - Full-text search with tsvector optimization
 * - Hybrid search combining vector + text relevance
 * - Advanced knowledge base statistics and analytics
 * - High-performance database operations
 * - Comprehensive error handling and logging
 */

// Re-export shared types
export type { ToolExecutionContext } from '@/lib/copilot/tools/client/types'
export { manageKnowledgeServerTool } from './manage-knowledge'
export { searchKnowledgeServerTool } from './search-knowledge'
