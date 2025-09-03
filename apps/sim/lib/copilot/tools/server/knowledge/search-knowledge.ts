/**
 * Nexus Copilot Server Tool: Knowledge Base Search
 * Server-side implementation for knowledge base search operations
 * Integrates directly with database and embedding services
 */

import { tool } from 'ai'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { estimateTokenCount } from '@/lib/tokenization/estimators'
import { db } from '@/db'
import { document, embedding, knowledgeBase } from '@/db/schema'
import { calculateCost } from '@/providers/utils'

const logger = createLogger('NexusKnowledgeSearchServer')

/**
 * Enhanced search parameters with server-side optimizations
 */
const serverSearchKnowledgeSchema = z.object({
  query: z.string().min(1).describe('Search query text'),
  workspaceId: z.string().describe('Workspace ID for access control'),
  knowledgeBaseIds: z
    .array(z.string())
    .optional()
    .describe('Specific knowledge base IDs to search'),
  searchType: z
    .enum(['vector', 'fulltext', 'hybrid'])
    .default('hybrid')
    .describe('Search strategy'),
  limit: z.number().min(1).max(50).default(10).describe('Maximum results to return'),
  minSimilarity: z.number().min(0).max(1).default(0.7).describe('Minimum similarity threshold'),
  includeMetadata: z.boolean().default(true).describe('Include document metadata in results'),
  enabledOnly: z.boolean().default(true).describe('Only search enabled documents and chunks'),
})

/**
 * Generates vector embedding for search query using OpenAI
 */
async function generateSearchEmbedding(query: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small',
        dimensions: 1536,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data[0].embedding as number[]
  } catch (error) {
    logger.error('Failed to generate search embedding', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: query.substring(0, 50),
    })
    throw error
  }
}

/**
 * Performs hybrid vector and full-text search
 */
async function performHybridSearch(params: {
  query: string
  queryVector: number[]
  knowledgeBaseIds: string[]
  limit: number
  minSimilarity: number
  enabledOnly: boolean
}) {
  const { query, queryVector, knowledgeBaseIds, limit, minSimilarity, enabledOnly } = params

  try {
    // Convert vector to PostgreSQL array format
    const vectorString = `[${queryVector.join(',')}]`

    // Build the search query with both vector similarity and full-text search
    const searchQuery = db
      .select({
        id: embedding.id,
        content: embedding.content,
        documentId: embedding.documentId,
        documentName: document.filename,
        knowledgeBaseId: embedding.knowledgeBaseId,
        chunkIndex: embedding.chunkIndex,
        similarity:
          sql<number>`1 - (${embedding.embedding} <=> ${sql.raw(`'${vectorString}'::vector`)})`.as(
            'similarity'
          ),
        textRank:
          sql<number>`ts_rank_cd(${embedding.contentTsv}, plainto_tsquery('english', ${query}))`.as(
            'text_rank'
          ),
        // Tag fields for metadata
        tag1: embedding.tag1,
        tag2: embedding.tag2,
        tag3: embedding.tag3,
        tag4: embedding.tag4,
        tag5: embedding.tag5,
        tag6: embedding.tag6,
        tag7: embedding.tag7,
        // Timestamps
        createdAt: embedding.createdAt,
        updatedAt: embedding.updatedAt,
      })
      .from(embedding)
      .innerJoin(document, eq(document.id, embedding.documentId))
      .innerJoin(knowledgeBase, eq(knowledgeBase.id, embedding.knowledgeBaseId))
      .where(
        and(
          sql`${knowledgeBase.id} = ANY(${knowledgeBaseIds})`,
          enabledOnly ? eq(embedding.enabled, true) : sql`true`,
          enabledOnly ? eq(document.enabled, true) : sql`true`,
          knowledgeBase.deletedAt === null ? sql`${knowledgeBase.deletedAt} IS NULL` : sql`true`,
          document.deletedAt === null ? sql`${document.deletedAt} IS NULL` : sql`true`,
          // Combined vector similarity and text search conditions
          sql`(
            (1 - (${embedding.embedding} <=> ${sql.raw(`'${vectorString}'::vector`)})) >= ${minSimilarity}
            OR 
            ${embedding.contentTsv} @@ plainto_tsquery('english', ${query})
          )`
        )
      )
      .orderBy(
        desc(sql`
          -- Hybrid scoring: combine vector similarity and text rank
          (1 - (${embedding.embedding} <=> ${sql.raw(`'${vectorString}'::vector`)})) * 0.7 +
          COALESCE(ts_rank_cd(${embedding.contentTsv}, plainto_tsquery('english', ${query})), 0) * 0.3
        `)
      )
      .limit(limit)

    const results = await searchQuery

    return results.map((result) => ({
      id: result.id,
      content: result.content.substring(0, 1000), // Truncate for response size
      documentId: result.documentId,
      documentName: result.documentName,
      knowledgeBaseId: result.knowledgeBaseId,
      chunkIndex: result.chunkIndex,
      similarity: result.similarity,
      textRank: result.textRank,
      relevanceScore: result.similarity * 0.7 + (result.textRank || 0) * 0.3,
      metadata: {
        tag1: result.tag1,
        tag2: result.tag2,
        tag3: result.tag3,
        tag4: result.tag4,
        tag5: result.tag5,
        tag6: result.tag6,
        tag7: result.tag7,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
      searchType: 'hybrid' as const,
    }))
  } catch (error) {
    logger.error('Hybrid search query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      knowledgeBaseIds,
      queryLength: query.length,
    })
    throw error
  }
}

/**
 * Performs vector-only similarity search
 */
async function performVectorSearch(params: {
  queryVector: number[]
  knowledgeBaseIds: string[]
  limit: number
  minSimilarity: number
  enabledOnly: boolean
}) {
  const { queryVector, knowledgeBaseIds, limit, minSimilarity, enabledOnly } = params

  try {
    const vectorString = `[${queryVector.join(',')}]`

    const searchQuery = db
      .select({
        id: embedding.id,
        content: embedding.content,
        documentId: embedding.documentId,
        documentName: document.filename,
        knowledgeBaseId: embedding.knowledgeBaseId,
        chunkIndex: embedding.chunkIndex,
        similarity:
          sql<number>`1 - (${embedding.embedding} <=> ${sql.raw(`'${vectorString}'::vector`)})`.as(
            'similarity'
          ),
        tag1: embedding.tag1,
        tag2: embedding.tag2,
        tag3: embedding.tag3,
        tag4: embedding.tag4,
        tag5: embedding.tag5,
        tag6: embedding.tag6,
        tag7: embedding.tag7,
        createdAt: embedding.createdAt,
        updatedAt: embedding.updatedAt,
      })
      .from(embedding)
      .innerJoin(document, eq(document.id, embedding.documentId))
      .innerJoin(knowledgeBase, eq(knowledgeBase.id, embedding.knowledgeBaseId))
      .where(
        and(
          sql`${knowledgeBase.id} = ANY(${knowledgeBaseIds})`,
          enabledOnly ? eq(embedding.enabled, true) : sql`true`,
          enabledOnly ? eq(document.enabled, true) : sql`true`,
          sql`${knowledgeBase.deletedAt} IS NULL`,
          sql`${document.deletedAt} IS NULL`,
          sql`(1 - (${embedding.embedding} <=> ${sql.raw(`'${vectorString}'::vector`)})) >= ${minSimilarity}`
        )
      )
      .orderBy(desc(sql`1 - (${embedding.embedding} <=> ${sql.raw(`'${vectorString}'::vector`)})`))
      .limit(limit)

    const results = await searchQuery

    return results.map((result) => ({
      id: result.id,
      content: result.content.substring(0, 1000),
      documentId: result.documentId,
      documentName: result.documentName,
      knowledgeBaseId: result.knowledgeBaseId,
      chunkIndex: result.chunkIndex,
      similarity: result.similarity,
      relevanceScore: result.similarity,
      metadata: {
        tag1: result.tag1,
        tag2: result.tag2,
        tag3: result.tag3,
        tag4: result.tag4,
        tag5: result.tag5,
        tag6: result.tag6,
        tag7: result.tag7,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
      searchType: 'vector' as const,
    }))
  } catch (error) {
    logger.error('Vector search query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      knowledgeBaseIds,
    })
    throw error
  }
}

/**
 * Performs full-text search only
 */
async function performFullTextSearch(params: {
  query: string
  knowledgeBaseIds: string[]
  limit: number
  enabledOnly: boolean
}) {
  const { query, knowledgeBaseIds, limit, enabledOnly } = params

  try {
    const searchQuery = db
      .select({
        id: embedding.id,
        content: embedding.content,
        documentId: embedding.documentId,
        documentName: document.filename,
        knowledgeBaseId: embedding.knowledgeBaseId,
        chunkIndex: embedding.chunkIndex,
        textRank:
          sql<number>`ts_rank_cd(${embedding.contentTsv}, plainto_tsquery('english', ${query}))`.as(
            'text_rank'
          ),
        tag1: embedding.tag1,
        tag2: embedding.tag2,
        tag3: embedding.tag3,
        tag4: embedding.tag4,
        tag5: embedding.tag5,
        tag6: embedding.tag6,
        tag7: embedding.tag7,
        createdAt: embedding.createdAt,
        updatedAt: embedding.updatedAt,
      })
      .from(embedding)
      .innerJoin(document, eq(document.id, embedding.documentId))
      .innerJoin(knowledgeBase, eq(knowledgeBase.id, embedding.knowledgeBaseId))
      .where(
        and(
          sql`${knowledgeBase.id} = ANY(${knowledgeBaseIds})`,
          enabledOnly ? eq(embedding.enabled, true) : sql`true`,
          enabledOnly ? eq(document.enabled, true) : sql`true`,
          sql`${knowledgeBase.deletedAt} IS NULL`,
          sql`${document.deletedAt} IS NULL`,
          sql`${embedding.contentTsv} @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(desc(sql`ts_rank_cd(${embedding.contentTsv}, plainto_tsquery('english', ${query}))`))
      .limit(limit)

    const results = await searchQuery

    return results.map((result) => ({
      id: result.id,
      content: result.content.substring(0, 1000),
      documentId: result.documentId,
      documentName: result.documentName,
      knowledgeBaseId: result.knowledgeBaseId,
      chunkIndex: result.chunkIndex,
      textRank: result.textRank,
      relevanceScore: result.textRank || 0,
      metadata: {
        tag1: result.tag1,
        tag2: result.tag2,
        tag3: result.tag3,
        tag4: result.tag4,
        tag5: result.tag5,
        tag6: result.tag6,
        tag7: result.tag7,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
      searchType: 'fulltext' as const,
    }))
  } catch (error) {
    logger.error('Full-text search query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      knowledgeBaseIds,
      queryLength: query.length,
    })
    throw error
  }
}

/**
 * Server-side Knowledge Base Search Tool
 */
export const searchKnowledgeServerTool = tool({
  description:
    'Perform advanced knowledge base search with vector similarity, full-text search, or hybrid approach. Direct database access for optimal performance.',
  parameters: serverSearchKnowledgeSchema,
  execute: async (args) => {
    const operationId = `server-knowledge-search-${Date.now()}`

    try {
      const session = await getSession()
      if (!session?.user) {
        throw new Error('Authentication required for knowledge base search')
      }

      logger.info(`[${operationId}] Server knowledge search initiated`, {
        userId: session.user.id,
        workspaceId: args.workspaceId,
        searchType: args.searchType,
        limit: args.limit,
        query: args.query.substring(0, 100),
      })

      // Verify access to knowledge bases
      const accessibleKbIds = args.knowledgeBaseIds || []

      if (accessibleKbIds.length === 0) {
        // If no specific KBs provided, get all accessible ones for the user/workspace
        const userKbs = await db
          .select({ id: knowledgeBase.id })
          .from(knowledgeBase)
          .where(
            and(
              eq(knowledgeBase.userId, session.user.id),
              args.workspaceId ? eq(knowledgeBase.workspaceId, args.workspaceId) : sql`true`,
              sql`${knowledgeBase.deletedAt} IS NULL`
            )
          )

        accessibleKbIds.push(...userKbs.map((kb) => kb.id))
      }

      if (accessibleKbIds.length === 0) {
        return {
          status: 'success',
          results: [],
          query: args.query,
          searchType: args.searchType,
          totalResults: 0,
          message: 'No accessible knowledge bases found',
          operationId,
        }
      }

      let searchResults: any[] = []
      let cost: any = null

      // Generate embedding for vector-based searches
      let queryVector: number[] | null = null
      if (args.searchType === 'vector' || args.searchType === 'hybrid') {
        queryVector = await generateSearchEmbedding(args.query)

        // Calculate embedding cost
        try {
          const tokenCount = estimateTokenCount(args.query, 'openai')
          cost = calculateCost('text-embedding-3-small', tokenCount.count, 0, false)
        } catch (error) {
          logger.warn(`[${operationId}] Failed to calculate embedding cost`, { error })
        }
      }

      // Execute search based on type
      switch (args.searchType) {
        case 'hybrid':
          if (queryVector) {
            searchResults = await performHybridSearch({
              query: args.query,
              queryVector,
              knowledgeBaseIds: accessibleKbIds,
              limit: args.limit,
              minSimilarity: args.minSimilarity,
              enabledOnly: args.enabledOnly,
            })
          }
          break

        case 'vector':
          if (queryVector) {
            searchResults = await performVectorSearch({
              queryVector,
              knowledgeBaseIds: accessibleKbIds,
              limit: args.limit,
              minSimilarity: args.minSimilarity,
              enabledOnly: args.enabledOnly,
            })
          }
          break

        case 'fulltext':
          searchResults = await performFullTextSearch({
            query: args.query,
            knowledgeBaseIds: accessibleKbIds,
            limit: args.limit,
            enabledOnly: args.enabledOnly,
          })
          break
      }

      logger.info(`[${operationId}] Server knowledge search completed`, {
        userId: session.user.id,
        resultsCount: searchResults.length,
        searchType: args.searchType,
        avgRelevance:
          searchResults.length > 0
            ? searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length
            : 0,
      })

      return {
        status: 'success',
        results: searchResults,
        query: args.query,
        searchType: args.searchType,
        totalResults: searchResults.length,
        knowledgeBaseIds: accessibleKbIds,
        cost,
        metadata: {
          operationId,
          timestamp: new Date().toISOString(),
          userId: session.user.id,
          workspaceId: args.workspaceId,
          searchStrategy: args.searchType,
          minSimilarityThreshold: args.minSimilarity,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(`[${operationId}] Server knowledge search failed`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        searchType: args.searchType,
        query: args.query.substring(0, 50),
      })

      throw new Error(`Knowledge search failed: ${errorMessage}`)
    }
  },
})
