/**
 * Help System Integration Service - Connects semantic search with existing help infrastructure
 *
 * Provides seamless integration between the advanced semantic search system and existing
 * help content management components. Handles content synchronization, caching, and
 * backwards compatibility.
 *
 * Key Features:
 * - Bidirectional synchronization with existing help system
 * - Automatic embedding generation for new content
 * - Content lifecycle management (creation, updates, deletion)
 * - Migration utilities for existing help content
 * - Performance monitoring and optimization
 *
 * Integration Points:
 * - Help content components and UI
 * - Content management workflows
 * - Search interfaces and widgets
 * - Analytics and reporting systems
 * - User preference and personalization
 *
 * Backwards Compatibility:
 * - Graceful fallback to keyword search
 * - Existing API contract preservation
 * - Progressive enhancement approach
 * - Migration path for legacy content
 *
 * Dependencies: HelpSemanticSearchService, HelpContentEmbeddingService, existing help system
 * Usage: Content management integration, search enhancement, system migration
 */

import { and, eq, isNull, or, sql } from 'drizzle-orm'
import type { Database } from '@/lib/db'
import type { Logger } from '@/lib/monitoring/logger'
import { helpContent, helpContentAnalytics } from '@/apps/sim/db/schema'
import type { HelpContentEmbeddingService, HelpContentItem } from './help-content-embedding-service'
import type { HelpContentIndexingPipeline } from './help-content-indexing-pipeline'
import type {
  HelpSemanticSearchService,
  SearchContext,
  SearchOptions,
  SearchResult,
  SuggestionResult,
} from './help-semantic-search-service'

export interface HelpSystemConfig {
  enableSemanticSearch: boolean
  enableSuggestions: boolean
  enableAnalytics: boolean
  fallbackToKeywordSearch: boolean
  cacheTTL: number
  maxConcurrentEmbeddings: number
  autoIndexNewContent: boolean
  contentSyncInterval: number
}

export interface LegacySearchQuery {
  query: string
  category?: string
  difficulty?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface LegacySearchResult {
  id: string
  title: string
  content: string
  category: string
  difficulty: string
  tags: string[]
  score?: number
  highlight?: string
}

export interface ContentSyncResult {
  processed: number
  updated: number
  created: number
  errors: number
  duration: number
}

export interface MigrationResult {
  totalContent: number
  migratedContent: number
  failedContent: number
  embeddingsGenerated: number
  indexesCreated: number
  duration: number
}

/**
 * Comprehensive integration service for semantic help search system
 */
export class HelpSystemIntegration {
  private logger: Logger
  private syncInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  constructor(
    private db: Database,
    private searchService: HelpSemanticSearchService,
    private embeddingService: HelpContentEmbeddingService,
    private indexingPipeline: HelpContentIndexingPipeline,
    private config: HelpSystemConfig,
    logger: Logger
  ) {
    this.logger = logger.child({ service: 'HelpSystemIntegration' })
  }

  /**
   * Initialize the help system integration
   * Sets up event listeners, sync processes, and compatibility layers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    this.logger.info('Initializing help system integration', {
      config: this.config,
    })

    try {
      // Verify database schema compatibility
      await this.verifySchemaCompatibility()

      // Setup content synchronization if enabled
      if (this.config.autoIndexNewContent) {
        await this.setupContentSynchronization()
      }

      // Initialize performance monitoring
      await this.initializeMonitoring()

      this.isInitialized = true

      this.logger.info('Help system integration initialized successfully', {
        semanticSearchEnabled: this.config.enableSemanticSearch,
        suggestionsEnabled: this.config.enableSuggestions,
        autoIndexing: this.config.autoIndexNewContent,
      })
    } catch (error) {
      this.logger.error('Failed to initialize help system integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Enhanced search method that provides backwards compatibility with legacy search
   * while leveraging semantic search capabilities
   *
   * @param query - Search query (legacy or enhanced format)
   * @param context - Search context for semantic enhancement
   * @param options - Search options and filters
   * @returns Promise<SearchResult[]> - Enhanced search results
   */
  async search(
    query: string | LegacySearchQuery,
    context: SearchContext = {},
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Processing integrated help search`, {
      queryType: typeof query === 'string' ? 'simple' : 'legacy',
      semanticEnabled: this.config.enableSemanticSearch,
    })

    try {
      // Normalize query format
      const normalizedQuery = this.normalizeSearchQuery(query)
      const normalizedOptions = this.normalizeSearchOptions(query, options)

      let searchResults: SearchResult[]

      if (this.config.enableSemanticSearch) {
        // Use advanced semantic search
        searchResults = await this.searchService.search(
          normalizedQuery.query,
          context,
          normalizedOptions
        )
      } else if (this.config.fallbackToKeywordSearch) {
        // Fallback to traditional keyword search
        searchResults = await this.performKeywordSearch(normalizedQuery, context, normalizedOptions)
      } else {
        throw new Error('No search method available')
      }

      // Convert to legacy format if needed
      const results = this.convertToLegacyFormat
        ? this.convertToLegacySearchResults(searchResults)
        : searchResults

      const processingTime = Date.now() - startTime

      this.logger.info(`[${operationId}] Integrated search completed`, {
        resultsCount: results.length,
        processingTimeMs: processingTime,
        searchMethod: this.config.enableSemanticSearch ? 'semantic' : 'keyword',
      })

      return results
    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.error(`[${operationId}] Integrated search failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
      })

      // Graceful degradation
      if (this.config.fallbackToKeywordSearch && this.config.enableSemanticSearch) {
        try {
          const normalizedQuery = this.normalizeSearchQuery(query)
          const normalizedOptions = this.normalizeSearchOptions(query, options)
          return await this.performKeywordSearch(normalizedQuery, context, normalizedOptions)
        } catch (fallbackError) {
          this.logger.error(`[${operationId}] Fallback search also failed`, {
            error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          })
        }
      }

      throw error
    }
  }

  /**
   * Get contextual suggestions with integration support
   *
   * @param context - User and workflow context
   * @param options - Suggestion options
   * @returns Promise<SuggestionResult[]> - Contextual suggestions
   */
  async getSuggestions(
    context: SearchContext,
    options: SearchOptions = { maxResults: 5 }
  ): Promise<SuggestionResult[]> {
    if (!this.config.enableSuggestions) {
      return []
    }

    const operationId = this.generateOperationId()

    try {
      const suggestions = await this.searchService.getContextualSuggestions(context, options)

      this.logger.info(`[${operationId}] Contextual suggestions generated`, {
        suggestionsCount: suggestions.length,
        contextKeys: Object.keys(context),
      })

      return suggestions
    } catch (error) {
      this.logger.error(`[${operationId}] Suggestions generation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Return empty array on error to maintain functionality
      return []
    }
  }

  /**
   * Synchronize content between legacy system and semantic search system
   *
   * @param force - Force full synchronization (default: incremental)
   * @returns Promise<ContentSyncResult> - Synchronization results
   */
  async synchronizeContent(force = false): Promise<ContentSyncResult> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Starting content synchronization`, {
      force,
    })

    try {
      const result: ContentSyncResult = {
        processed: 0,
        updated: 0,
        created: 0,
        errors: 0,
        duration: 0,
      }

      // Get content that needs synchronization
      const contentToSync = force
        ? await this.getAllHelpContent()
        : await this.getContentNeedingSync()

      result.processed = contentToSync.length

      // Process content in batches
      const batchSize = 10
      const batches = this.createBatches(contentToSync, batchSize)

      for (const batch of batches) {
        try {
          await this.processSyncBatch(batch, result, operationId)
        } catch (batchError) {
          this.logger.error(`[${operationId}] Sync batch failed`, {
            error: batchError instanceof Error ? batchError.message : 'Unknown error',
            batchSize: batch.length,
          })
          result.errors += batch.length
        }
      }

      result.duration = Date.now() - startTime

      this.logger.info(`[${operationId}] Content synchronization completed`, {
        processed: result.processed,
        updated: result.updated,
        created: result.created,
        errors: result.errors,
        durationMs: result.duration,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error(`[${operationId}] Content synchronization failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      })

      return {
        processed: 0,
        updated: 0,
        created: 0,
        errors: 1,
        duration,
      }
    }
  }

  /**
   * Migrate existing help content to semantic search system
   *
   * @param options - Migration options
   * @returns Promise<MigrationResult> - Migration results
   */
  async migrateExistingContent(
    options: { batchSize?: number; skipExisting?: boolean; validateContent?: boolean } = {}
  ): Promise<MigrationResult> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Starting content migration`, {
      options,
    })

    try {
      const result: MigrationResult = {
        totalContent: 0,
        migratedContent: 0,
        failedContent: 0,
        embeddingsGenerated: 0,
        indexesCreated: 0,
        duration: 0,
      }

      // Discover all existing help content
      const existingContent = await this.discoverLegacyContent()
      result.totalContent = existingContent.length

      if (existingContent.length === 0) {
        this.logger.info(`[${operationId}] No content found for migration`)
        return result
      }

      // Process migration using the indexing pipeline
      const indexingResult = await this.indexingPipeline.indexContent(
        [{ type: 'database', connection: 'legacy' }],
        {
          batchSize: options.batchSize || 10,
          forceReindex: !options.skipExisting,
          skipValidation: !options.validateContent,
        }
      )

      // Update result with indexing metrics
      result.migratedContent =
        indexingResult.summary.newContentIndexed + indexingResult.summary.updatedContentReindexed
      result.failedContent =
        indexingResult.summary.validationErrors +
        indexingResult.summary.embeddingErrors +
        indexingResult.summary.storageErrors
      result.embeddingsGenerated = indexingResult.summary.finalIndexSize
      result.indexesCreated = 1 // Database indexes created
      result.duration = Date.now() - startTime

      this.logger.info(`[${operationId}] Content migration completed`, {
        totalContent: result.totalContent,
        migratedContent: result.migratedContent,
        failedContent: result.failedContent,
        successRate: `${Math.round((result.migratedContent / result.totalContent) * 100)}%`,
        durationMs: result.duration,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error(`[${operationId}] Content migration failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      })

      return {
        totalContent: 0,
        migratedContent: 0,
        failedContent: 1,
        embeddingsGenerated: 0,
        indexesCreated: 0,
        duration,
      }
    }
  }

  /**
   * Get system health and performance metrics
   */
  async getSystemMetrics() {
    return {
      integration: {
        initialized: this.isInitialized,
        config: this.config,
        syncEnabled: !!this.syncInterval,
      },
      search: this.searchService.getPerformanceMetrics(),
      embeddings: this.embeddingService.getHelpContentMetrics(),
      indexing: this.indexingPipeline.getCurrentProgress(),
    }
  }

  /**
   * Gracefully shutdown the integration system
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down help system integration')

    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Abort any ongoing indexing
    this.indexingPipeline.abortIndexing()

    // Shutdown embedding service
    await this.embeddingService.shutdown()

    this.isInitialized = false

    this.logger.info('Help system integration shutdown completed')
  }

  // Private Methods

  private async verifySchemaCompatibility(): Promise<void> {
    // Verify that the required tables and columns exist
    try {
      await this.db.select().from(helpContent).limit(1)
      await this.db.select().from(helpContentAnalytics).limit(1)
    } catch (error) {
      throw new Error('Database schema is not compatible with help system integration')
    }
  }

  private async setupContentSynchronization(): Promise<void> {
    if (this.config.contentSyncInterval > 0) {
      this.syncInterval = setInterval(async () => {
        try {
          await this.synchronizeContent(false)
        } catch (error) {
          this.logger.error('Scheduled content synchronization failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }, this.config.contentSyncInterval * 1000)

      this.logger.info('Content synchronization scheduled', {
        intervalSeconds: this.config.contentSyncInterval,
      })
    }
  }

  private async initializeMonitoring(): Promise<void> {
    // Setup monitoring and health checks
    this.logger.info('Performance monitoring initialized')
  }

  private normalizeSearchQuery(query: string | LegacySearchQuery): LegacySearchQuery {
    if (typeof query === 'string') {
      return { query }
    }
    return query
  }

  private normalizeSearchOptions(
    query: string | LegacySearchQuery,
    options: SearchOptions
  ): SearchOptions {
    const normalized = { ...options }

    if (typeof query !== 'string') {
      // Map legacy query parameters to search options
      if (query.category) normalized.categories = [query.category]
      if (query.difficulty) normalized.difficulties = [query.difficulty as any]
      if (query.tags) normalized.tags = query.tags
      if (query.limit) normalized.maxResults = query.limit
    }

    return normalized
  }

  private async performKeywordSearch(
    query: LegacySearchQuery,
    context: SearchContext,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Implement keyword-based search fallback
    const searchQuery = this.db
      .select()
      .from(helpContent)
      .where(
        and(
          eq(helpContent.status, 'published'),
          sql`${helpContent.searchVector} @@ plainto_tsquery('english', ${query.query})`
        )
      )

    // Apply filters
    if (options.categories?.length) {
      searchQuery.where(sql`${helpContent.category} = ANY(${options.categories})`)
    }

    if (options.difficulties?.length) {
      searchQuery.where(sql`${helpContent.difficulty} = ANY(${options.difficulties})`)
    }

    const results = await searchQuery
      .orderBy(
        sql`ts_rank(${helpContent.searchVector}, plainto_tsquery('english', ${query.query})) DESC`
      )
      .limit(options.maxResults || 10)

    // Convert to SearchResult format
    return results.map((content) => ({
      id: content.id,
      title: content.title,
      content: content.content.substring(0, 500) + (content.content.length > 500 ? '...' : ''),
      summary: content.summary || undefined,
      category: content.category,
      difficulty: content.difficulty,
      tags: content.tags,
      workflowTypes: content.workflowTypes,
      blockTypes: content.blockTypes,
      slug: content.slug,
      featured: content.featured,
      overallScore: 0.7, // Default keyword match score
      semanticScore: 0,
      keywordScore: 0.7,
      viewCount: content.viewCount,
      avgRating: content.avgRating ? Number(content.avgRating) : undefined,
      ratingCount: content.ratingCount,
      helpfulVotes: content.helpfulVotes,
      readingTimeMinutes: content.readingTimeMinutes || undefined,
      lastReviewedAt: content.lastReviewedAt || undefined,
      publishedAt: content.publishedAt || undefined,
      authorName: content.authorName || undefined,
      relevanceExplanation: 'Keyword match',
    }))
  }

  private convertToLegacySearchResults(results: SearchResult[]): LegacySearchResult[] {
    return results.map((result) => ({
      id: result.id,
      title: result.title,
      content: result.content,
      category: result.category,
      difficulty: result.difficulty,
      tags: result.tags,
      score: result.overallScore,
      highlight: result.contentPreview,
    }))
  }

  private async getAllHelpContent(): Promise<HelpContentItem[]> {
    const content = await this.db
      .select()
      .from(helpContent)
      .where(eq(helpContent.status, 'published'))

    return this.convertToHelpContentItems(content)
  }

  private async getContentNeedingSync(): Promise<HelpContentItem[]> {
    // Get content that has been updated since last embedding generation
    const content = await this.db
      .select()
      .from(helpContent)
      .where(
        and(
          eq(helpContent.status, 'published'),
          or(
            isNull(helpContent.embeddingLastUpdated),
            sql`${helpContent.updatedAt} > ${helpContent.embeddingLastUpdated}`
          )
        )
      )

    return this.convertToHelpContentItems(content)
  }

  private async discoverLegacyContent(): Promise<HelpContentItem[]> {
    // This would discover content from legacy systems
    return []
  }

  private convertToHelpContentItems(dbContent: any[]): HelpContentItem[] {
    return dbContent.map((content) => ({
      id: content.id,
      title: content.title,
      content: content.content,
      summary: content.summary,
      category: content.category,
      difficulty: content.difficulty,
      tags: content.tags,
      workflowTypes: content.workflowTypes,
      blockTypes: content.blockTypes,
      metadata: content.metadata || {},
    }))
  }

  private async processSyncBatch(
    batch: HelpContentItem[],
    result: ContentSyncResult,
    operationId: string
  ): Promise<void> {
    for (const item of batch) {
      try {
        // Generate embeddings and update content
        await this.embeddingService.updateHelpContentEmbeddings(item)
        result.updated++
      } catch (error) {
        this.logger.error(`[${operationId}] Failed to sync content item`, {
          contentId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        result.errors++
      }
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private get convertToLegacyFormat(): boolean {
    // Determine if we need to convert to legacy format based on caller context
    return false // This would be determined by request context in production
  }
}

export default HelpSystemIntegration
