/**
 * Nexus Copilot Tool: Knowledge Base Search
 * Performs hybrid search across knowledge bases with vector similarity and full-text capabilities
 * Integrates with Sim's RAG system and pgvector extension
 */

import { tool } from 'ai'
import { z } from 'zod'
import type {
  ClientToolDefinition,
  ToolExecutionContext,
  ToolRunResult,
} from '@/lib/copilot/tools/client/types'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('NexusKnowledgeSearchTool')

/**
 * Parameters schema for knowledge base search operations
 */
const searchKnowledgeSchema = z.object({
  query: z.string().min(1).describe('Search query text for vector and full-text search'),
  workspaceId: z.string().describe('Workspace ID to search within for access control'),
  knowledgeBaseIds: z
    .array(z.string())
    .optional()
    .describe(
      'Specific knowledge base IDs to search (optional - searches all accessible if not provided)'
    ),
  searchType: z
    .enum(['vector', 'fulltext', 'hybrid'])
    .default('hybrid')
    .describe('Type of search to perform - hybrid recommended for best results'),
  topK: z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
  minSimilarity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum similarity threshold for vector search (0.0 to 1.0)'),
  tagFilters: z
    .record(z.string())
    .optional()
    .describe('Tag-based filters for refined search results'),
})

type SearchKnowledgeArgs = z.infer<typeof searchKnowledgeSchema>

/**
 * Executes knowledge base search with hybrid approach
 * Combines vector similarity search with full-text search for optimal results
 */
async function executeKnowledgeSearch(
  ctx: ToolExecutionContext,
  args: SearchKnowledgeArgs
): Promise<ToolRunResult> {
  const operationId = `knowledge-search-${Date.now()}-${ctx.toolCallId.slice(-8)}`

  try {
    ctx.log('info', `[${operationId}] Initiating knowledge base search`, {
      query: args.query.substring(0, 100), // Log truncated query for privacy
      workspaceId: args.workspaceId,
      searchType: args.searchType,
      topK: args.topK,
      knowledgeBaseCount: args.knowledgeBaseIds?.length || 'all accessible',
      hasTagFilters: !!args.tagFilters && Object.keys(args.tagFilters).length > 0,
    })

    // Prepare search request payload
    const searchPayload = {
      query: args.query,
      workspaceId: args.workspaceId,
      knowledgeBaseIds: args.knowledgeBaseIds || [], // Empty array means search all accessible
      topK: Math.max(1, Math.min(50, args.topK)),
      ...(args.tagFilters &&
        Object.keys(args.tagFilters).length > 0 && {
          filters: args.tagFilters,
        }),
    }

    ctx.log('debug', `[${operationId}] Search payload prepared`, {
      hasQuery: searchPayload.query.length > 0,
      kbCount: searchPayload.knowledgeBaseIds.length,
      hasFilters: !!searchPayload.filters,
    })

    // Execute search via existing knowledge search API
    const response = await fetch('/api/knowledge/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchPayload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`

      ctx.log('error', `[${operationId}] Knowledge search API error`, {
        status: response.status,
        error: errorMessage,
        details: errorData.details,
      })

      return {
        status: response.status,
        message: `Knowledge search failed: ${errorMessage}`,
        data: {
          error: errorMessage,
          operationId,
          searchType: args.searchType,
        },
      }
    }

    const result = await response.json()
    const searchData = result.data || result

    // Process and enhance search results
    const enhancedResults = (searchData.results || []).map((result: any) => ({
      id: result.documentId || result.id,
      content: result.content,
      metadata: result.metadata || {},
      documentName: result.documentName,
      chunkIndex: result.chunkIndex,
      similarity: result.similarity || 0,
      relevanceScore: result.similarity || 0,
      searchType: args.searchType,
      knowledgeBaseId: result.knowledgeBaseId,
    }))

    ctx.log('info', `[${operationId}] Knowledge search completed successfully`, {
      resultsCount: enhancedResults.length,
      searchType: args.searchType,
      totalResults: searchData.totalResults || enhancedResults.length,
      avgSimilarity:
        enhancedResults.length > 0
          ? enhancedResults.reduce((sum, r) => sum + r.similarity, 0) / enhancedResults.length
          : 0,
    })

    return {
      status: 200,
      message: `Found ${enhancedResults.length} relevant results in knowledge base`,
      data: {
        status: 'success',
        results: enhancedResults,
        query: args.query,
        searchType: args.searchType,
        totalResults: searchData.totalResults || enhancedResults.length,
        knowledgeBaseIds: searchData.knowledgeBaseIds || args.knowledgeBaseIds || [],
        operationId,
        cost: searchData.cost, // Pass through cost information if available
        metadata: {
          operationId,
          timestamp: new Date().toISOString(),
          searchStrategy: args.searchType,
          minSimilarityThreshold: args.minSimilarity,
        },
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    ctx.log('error', `[${operationId}] Knowledge search execution failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      query: args.query.substring(0, 50),
      searchType: args.searchType,
    })

    return {
      status: 500,
      message: `Knowledge search failed: ${errorMessage}`,
      data: {
        error: errorMessage,
        operationId,
        searchType: args.searchType,
      },
    }
  }
}

/**
 * Nexus Copilot Knowledge Search Tool Definition
 * Provides comprehensive search capabilities across knowledge bases
 */
export const searchKnowledgeTool: ClientToolDefinition<SearchKnowledgeArgs> = {
  name: 'search-knowledge',
  metadata: {
    displayNames: {
      pending: { text: 'Preparing knowledge search...', icon: require('lucide-react').Search },
      executing: { text: 'Searching knowledge base...', icon: require('lucide-react').Search },
      success: { text: 'Knowledge search completed', icon: require('lucide-react').CheckCircle },
      error: { text: 'Knowledge search failed', icon: require('lucide-react').XCircle },
    },
  },
  hasInterrupt: false,
  execute: executeKnowledgeSearch,
}

/**
 * AI Tool Definition for Vercel AI SDK integration
 * Provides structured tool interface for AI model interactions
 */
export const searchKnowledgeAITool = tool({
  description:
    'Search across knowledge bases using hybrid vector similarity and full-text search. Supports advanced filtering and relevance scoring.',
  parameters: searchKnowledgeSchema,
  execute: async (args) => {
    const mockContext: ToolExecutionContext = {
      toolCallId: `ai-tool-${Date.now()}`,
      toolName: 'search-knowledge',
      log: (level, message, extra) => {
        try {
          logger[level](message, { ...extra, source: 'ai-tool' })
        } catch (e) {
          // Silently handle logging errors
        }
      },
    }

    const result = await executeKnowledgeSearch(mockContext, args)

    if (result.status === 200) {
      return result.data
    }
    throw new Error(result.message || 'Knowledge search failed')
  },
})
