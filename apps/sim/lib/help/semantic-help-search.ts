/**
 * Semantic Help Search Service - Vector-based semantic search for help content
 *
 * Provides advanced semantic search capabilities for help content using:
 * - Vector similarity search with HNSW indexes
 * - Hybrid search (semantic + keyword)
 * - Contextual ranking and filtering
 * - Multi-vector search (content, title, combined)
 * - Performance optimization and caching
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import type {
  ContentSearchFilter,
  ContentSearchResult,
  HelpContentDocument,
} from './help-content-manager'

const logger = createLogger('SemanticHelpSearch')

// ========================
// TYPE DEFINITIONS
// ========================

export interface SemanticSearchOptions {
  useSemanticSearch?: boolean
  useHybridSearch?: boolean
  semanticWeight?: number
  keywordWeight?: number
  vectorType?: 'content' | 'title' | 'summary' | 'combined'
  minSimilarityScore?: number
  includeEmbeddingData?: boolean
}

export interface SemanticSearchResult extends ContentSearchResult {
  semanticScores?: Array<{
    id: string
    semanticScore: number
    keywordScore?: number
    hybridScore?: number
  }>
  queryProcessingTime?: number
  searchMethod?: 'semantic' | 'keyword' | 'hybrid'
}

export interface QueryEmbedding {
  query: string
  embedding: number[]
  model: string
  generatedAt: Date
}

// ========================
// SEMANTIC SEARCH SERVICE
// ========================

/**
 * Semantic Help Search Service
 *
 * Provides vector-based semantic search with hybrid capabilities
 */
export class SemanticHelpSearchService {
  private queryEmbeddingCache = new Map<string, QueryEmbedding>()
  private readonly CACHE_TTL = 15 * 60 * 1000 // 15 minutes
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.7
  private readonly DEFAULT_SEMANTIC_WEIGHT = 0.7
  private readonly DEFAULT_KEYWORD_WEIGHT = 0.3

  constructor() {
    logger.info('Initializing Semantic Help Search Service')
    this.setupCacheCleanup()
  }

  /**
   * Perform semantic search on help content
   */
  async searchContent(
    query: string,
    filters: ContentSearchFilter = {},
    page = 1,
    pageSize = 10,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult> {
    const operationId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()

    logger.info(`[${operationId}] Starting semantic search`, {
      query,
      page,
      pageSize,
      options,
    })

    try {
      // Default options
      const searchOptions = {
        useSemanticSearch: true,
        useHybridSearch: false,
        semanticWeight: this.DEFAULT_SEMANTIC_WEIGHT,
        keywordWeight: this.DEFAULT_KEYWORD_WEIGHT,
        vectorType: 'combined' as const,
        minSimilarityScore: this.DEFAULT_SIMILARITY_THRESHOLD,
        includeEmbeddingData: false,
        ...options,
      }

      let searchResult: SemanticSearchResult

      if (searchOptions.useSemanticSearch) {
        if (searchOptions.useHybridSearch) {
          searchResult = await this.performHybridSearch(
            query,
            filters,
            page,
            pageSize,
            searchOptions,
            operationId
          )
        } else {
          searchResult = await this.performSemanticSearch(
            query,
            filters,
            page,
            pageSize,
            searchOptions,
            operationId
          )
        }
      } else {
        searchResult = await this.performKeywordSearch(
          query,
          filters,
          page,
          pageSize,
          searchOptions,
          operationId
        )
      }

      const processingTime = Date.now() - startTime
      searchResult.queryProcessingTime = processingTime

      logger.info(`[${operationId}] Semantic search completed`, {
        query,
        resultsCount: searchResult.documents.length,
        total: searchResult.total,
        searchMethod: searchResult.searchMethod,
        processingTimeMs: processingTime,
      })

      return searchResult
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Semantic search failed`, {
        query,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      })

      // Fallback to keyword search
      return this.performKeywordSearch(query, filters, page, pageSize, options, operationId)
    }
  }

  /**
   * Perform pure semantic search using vector similarity
   */
  private async performSemanticSearch(
    query: string,
    filters: ContentSearchFilter,
    page: number,
    pageSize: number,
    options: SemanticSearchOptions,
    operationId: string
  ): Promise<SemanticSearchResult> {
    logger.info(`[${operationId}] Performing semantic search`, { vectorType: options.vectorType })

    // Generate query embedding (mock for now)
    const queryEmbedding = await this.generateQueryEmbedding(query, operationId)

    // Build the base query
    let vectorColumn = 'combined_embedding'
    switch (options.vectorType) {
      case 'content':
        vectorColumn = 'content_embedding'
        break
      case 'title':
        vectorColumn = 'title_embedding'
        break
      case 'summary':
        vectorColumn = 'summary_embedding'
        break
      default:
        vectorColumn = 'combined_embedding'
        break
    }

    // Calculate similarity scores and apply filters
    const offset = (page - 1) * pageSize
    const whereConditions: string[] = ['status = $1']
    const queryParams: any[] = ['published']
    let paramIndex = 2

    // Apply filters
    if (filters.categories && filters.categories.length > 0) {
      whereConditions.push(`category = ANY($${paramIndex})`)
      queryParams.push(filters.categories)
      paramIndex++
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags && $${paramIndex}`)
      queryParams.push(filters.tags)
      paramIndex++
    }

    if (filters.isPublished !== undefined) {
      whereConditions.push(`status = $${paramIndex}`)
      queryParams.push(filters.isPublished ? 'published' : 'draft')
      paramIndex++
    }

    // Add embedding filter (only search content that has embeddings)
    whereConditions.push(`${vectorColumn} IS NOT NULL`)

    const whereClause = whereConditions.join(' AND ')

    // Execute semantic search query
    const searchQuery = `
      SELECT 
        id,
        title,
        content,
        summary,
        category,
        difficulty,
        tags,
        workflow_types,
        metadata,
        created_at,
        updated_at,
        1 - (${vectorColumn} <=> $${paramIndex}::vector) as similarity_score
      FROM help_content 
      WHERE ${whereClause}
        AND 1 - (${vectorColumn} <=> $${paramIndex}::vector) >= $${paramIndex + 1}
      ORDER BY ${vectorColumn} <=> $${paramIndex}::vector
      LIMIT $${paramIndex + 2} OFFSET $${paramIndex + 3}
    `

    queryParams.push(
      JSON.stringify(queryEmbedding.embedding), // Query vector
      options.minSimilarityScore || this.DEFAULT_SIMILARITY_THRESHOLD, // Similarity threshold
      pageSize, // Limit
      offset // Offset
    )

    const searchResults = await db.execute(sql.raw(searchQuery, queryParams))

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM help_content 
      WHERE ${whereClause}
        AND ${vectorColumn} IS NOT NULL
        AND 1 - (${vectorColumn} <=> $${paramIndex - 3}::vector) >= $${paramIndex - 2}
    `

    const countParams = queryParams.slice(0, paramIndex + 1) // Exclude pagination params
    const totalResults = await db.execute(sql.raw(countQuery, countParams))
    const total = (totalResults.rows[0] as any)?.total || 0

    // Transform results
    const documents = (searchResults.rows as any[]).map((row) => this.transformRowToDocument(row))

    // Generate semantic scores
    const semanticScores = (searchResults.rows as any[]).map((row) => ({
      id: row.id,
      semanticScore: row.similarity_score,
    }))

    return {
      documents,
      total: Number(total),
      page,
      pageSize,
      facets: await this.generateFacets(filters),
      semanticScores,
      searchMethod: 'semantic',
    }
  }

  /**
   * Perform hybrid search combining semantic and keyword search
   */
  private async performHybridSearch(
    query: string,
    filters: ContentSearchFilter,
    page: number,
    pageSize: number,
    options: SemanticSearchOptions,
    operationId: string
  ): Promise<SemanticSearchResult> {
    logger.info(`[${operationId}] Performing hybrid search`)

    // Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(query, operationId)
    const vectorColumn =
      options.vectorType === 'content' ? 'content_embedding' : 'combined_embedding'

    // Build hybrid search query with both semantic and keyword matching
    const offset = (page - 1) * pageSize
    const whereConditions: string[] = ['status = $1']
    const queryParams: any[] = ['published']
    let paramIndex = 2

    // Apply filters (same as semantic search)
    if (filters.categories && filters.categories.length > 0) {
      whereConditions.push(`category = ANY($${paramIndex})`)
      queryParams.push(filters.categories)
      paramIndex++
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags && $${paramIndex}`)
      queryParams.push(filters.tags)
      paramIndex++
    }

    whereConditions.push(`${vectorColumn} IS NOT NULL`)

    const whereClause = whereConditions.join(' AND ')

    // Hybrid search query combining semantic similarity and keyword relevance
    const hybridQuery = `
      SELECT 
        id,
        title,
        content,
        summary,
        category,
        difficulty,
        tags,
        workflow_types,
        metadata,
        created_at,
        updated_at,
        1 - (${vectorColumn} <=> $${paramIndex}::vector) as semantic_score,
        ts_rank(
          setweight(to_tsvector('english', title), 'A') ||
          setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
          setweight(to_tsvector('english', content), 'C'),
          plainto_tsquery('english', $${paramIndex + 1})
        ) as keyword_score,
        (
          ($${paramIndex + 2} * (1 - (${vectorColumn} <=> $${paramIndex}::vector))) +
          ($${paramIndex + 3} * ts_rank(
            setweight(to_tsvector('english', title), 'A') ||
            setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
            setweight(to_tsvector('english', content), 'C'),
            plainto_tsquery('english', $${paramIndex + 1})
          ))
        ) as hybrid_score
      FROM help_content 
      WHERE ${whereClause}
        AND (
          1 - (${vectorColumn} <=> $${paramIndex}::vector) >= $${paramIndex + 4}
          OR
          setweight(to_tsvector('english', title), 'A') ||
          setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
          setweight(to_tsvector('english', content), 'C') @@ plainto_tsquery('english', $${paramIndex + 1})
        )
      ORDER BY hybrid_score DESC
      LIMIT $${paramIndex + 5} OFFSET $${paramIndex + 6}
    `

    queryParams.push(
      JSON.stringify(queryEmbedding.embedding), // Query vector
      query, // Keyword query
      options.semanticWeight || this.DEFAULT_SEMANTIC_WEIGHT, // Semantic weight
      options.keywordWeight || this.DEFAULT_KEYWORD_WEIGHT, // Keyword weight
      options.minSimilarityScore || this.DEFAULT_SIMILARITY_THRESHOLD, // Similarity threshold
      pageSize, // Limit
      offset // Offset
    )

    const searchResults = await db.execute(sql.raw(hybridQuery, queryParams))

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM help_content 
      WHERE ${whereClause}
        AND (
          1 - (${vectorColumn} <=> $${paramIndex}::vector) >= $${paramIndex + 4}
          OR
          setweight(to_tsvector('english', title), 'A') ||
          setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
          setweight(to_tsvector('english', content), 'C') @@ plainto_tsquery('english', $${paramIndex + 1})
        )
    `

    const countParams = queryParams.slice(0, paramIndex + 5) // Exclude pagination params
    const totalResults = await db.execute(sql.raw(countQuery, countParams))
    const total = (totalResults.rows[0] as any)?.total || 0

    // Transform results
    const documents = (searchResults.rows as any[]).map((row) => this.transformRowToDocument(row))

    // Generate hybrid scores
    const semanticScores = (searchResults.rows as any[]).map((row) => ({
      id: row.id,
      semanticScore: row.semantic_score,
      keywordScore: row.keyword_score,
      hybridScore: row.hybrid_score,
    }))

    return {
      documents,
      total: Number(total),
      page,
      pageSize,
      facets: await this.generateFacets(filters),
      semanticScores,
      searchMethod: 'hybrid',
    }
  }

  /**
   * Perform keyword-only search (fallback)
   */
  private async performKeywordSearch(
    query: string,
    filters: ContentSearchFilter,
    page: number,
    pageSize: number,
    options: SemanticSearchOptions,
    operationId: string
  ): Promise<SemanticSearchResult> {
    logger.info(`[${operationId}] Performing keyword search`)

    const offset = (page - 1) * pageSize
    const whereConditions: string[] = ['status = $1']
    const queryParams: any[] = ['published']
    let paramIndex = 2

    // Apply filters
    if (filters.categories && filters.categories.length > 0) {
      whereConditions.push(`category = ANY($${paramIndex})`)
      queryParams.push(filters.categories)
      paramIndex++
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags && $${paramIndex}`)
      queryParams.push(filters.tags)
      paramIndex++
    }

    const whereClause = whereConditions.join(' AND ')

    // Full-text search query
    const keywordQuery = `
      SELECT 
        id,
        title,
        content,
        summary,
        category,
        difficulty,
        tags,
        workflow_types,
        metadata,
        created_at,
        updated_at,
        ts_rank(
          setweight(to_tsvector('english', title), 'A') ||
          setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
          setweight(to_tsvector('english', content), 'C'),
          plainto_tsquery('english', $${paramIndex})
        ) as keyword_score
      FROM help_content 
      WHERE ${whereClause}
        AND (
          setweight(to_tsvector('english', title), 'A') ||
          setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
          setweight(to_tsvector('english', content), 'C') @@ plainto_tsquery('english', $${paramIndex})
        )
      ORDER BY keyword_score DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `

    queryParams.push(query, pageSize, offset)

    const searchResults = await db.execute(sql.raw(keywordQuery, queryParams))

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM help_content 
      WHERE ${whereClause}
        AND (
          setweight(to_tsvector('english', title), 'A') ||
          setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
          setweight(to_tsvector('english', content), 'C') @@ plainto_tsquery('english', $${paramIndex})
        )
    `

    const countParams = queryParams.slice(0, paramIndex + 1)
    const totalResults = await db.execute(sql.raw(countQuery, countParams))
    const total = (totalResults.rows[0] as any)?.total || 0

    // Transform results
    const documents = (searchResults.rows as any[]).map((row) => this.transformRowToDocument(row))

    return {
      documents,
      total: Number(total),
      page,
      pageSize,
      facets: await this.generateFacets(filters),
      searchMethod: 'keyword',
    }
  }

  /**
   * Generate query embedding (mock implementation for now)
   */
  private async generateQueryEmbedding(
    query: string,
    operationId: string
  ): Promise<QueryEmbedding> {
    // Check cache first
    const cached = this.queryEmbeddingCache.get(query)
    if (cached && Date.now() - cached.generatedAt.getTime() < this.CACHE_TTL) {
      logger.info(`[${operationId}] Using cached query embedding`)
      return cached
    }

    logger.info(`[${operationId}] Generating query embedding`)

    // Generate mock embedding (1536 dimensions)
    // In production, this would call OpenAI's embedding API
    const embedding = Array.from({ length: 1536 }, () => Math.random() - 0.5)

    const queryEmbedding: QueryEmbedding = {
      query,
      embedding,
      model: 'text-embedding-3-large',
      generatedAt: new Date(),
    }

    // Cache the embedding
    this.queryEmbeddingCache.set(query, queryEmbedding)

    return queryEmbedding
  }

  /**
   * Transform database row to HelpContentDocument
   */
  private transformRowToDocument(row: any): HelpContentDocument {
    return {
      id: row.id,
      contentId: row.id, // Using id as contentId for now
      version: 1,
      title: row.title,
      content: row.content,
      contentType: 'markdown' as const,
      targetComponents: row.workflow_types || [],
      userLevels: [row.difficulty || 'beginner'] as any,
      tags: row.tags || [],
      metadata: {
        description: row.summary,
        category: row.category,
        priority: 'medium' as const,
        estimatedReadingTime: Math.floor((row.content?.length || 0) / 5), // ~5 chars per second
        supportedLanguages: ['en'],
        accessibilityFeatures: [],
      },
      isPublished: true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: 'system',
    }
  }

  /**
   * Generate search facets
   */
  private async generateFacets(filters: ContentSearchFilter): Promise<any> {
    // TODO: Implement facet generation
    return {
      components: [],
      tags: [],
      categories: [],
      contentTypes: [],
    }
  }

  /**
   * Setup cache cleanup interval
   */
  private setupCacheCleanup(): void {
    setInterval(
      () => {
        const now = Date.now()
        for (const [query, embedding] of this.queryEmbeddingCache.entries()) {
          if (now - embedding.generatedAt.getTime() > this.CACHE_TTL) {
            this.queryEmbeddingCache.delete(query)
          }
        }
      },
      5 * 60 * 1000
    ) // Clean up every 5 minutes
  }
}

// ========================
// SINGLETON INSTANCE
// ========================

export const semanticHelpSearch = new SemanticHelpSearchService()

export default SemanticHelpSearchService
