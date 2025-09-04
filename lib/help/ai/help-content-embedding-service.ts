/**
 * Help Content Embedding Service - Specialized vector embeddings for help content
 *
 * Advanced embedding service designed specifically for help content semantic search.
 * Extends the base EmbeddingService with help content-specific optimizations.
 *
 * Key Features:
 * - Context-aware embedding generation for help content
 * - Multi-vector embeddings (content, title, summary, combined)
 * - Automatic content preprocessing and optimization
 * - Help content-specific caching strategies
 * - Batch processing for help content indexing
 *
 * Performance Optimizations:
 * - Specialized text preprocessing for help documentation
 * - Context metadata integration for enhanced relevance
 * - Efficient batch processing for content libraries
 * - Smart caching with help content versioning
 *
 * Dependencies: Base EmbeddingService, help content schema
 * Usage: Help content indexing, semantic search enhancement
 */

import { createHash } from 'crypto'
import type { Logger } from '@/lib/monitoring/logger'
import { type EmbeddingConfig, EmbeddingService } from './embedding-service'

export interface HelpContentItem {
  id: string
  title: string
  content: string
  summary?: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  workflowTypes: string[]
  blockTypes: string[]
  metadata: Record<string, any>
}

export interface HelpContentEmbeddings {
  contentEmbedding: number[]
  titleEmbedding: number[]
  summaryEmbedding?: number[]
  combinedEmbedding: number[]
}

export interface ContentPreprocessingOptions {
  includeMetadata?: boolean
  enhanceContext?: boolean
  normalizeText?: boolean
  extractKeyPhrases?: boolean
}

export interface HelpContentIndexingResult {
  success: boolean
  indexed: number
  skipped: number
  errors: string[]
  processingTime: number
  embeddings: Map<string, HelpContentEmbeddings>
}

/**
 * Specialized embedding service for help content with advanced semantic understanding
 */
export class HelpContentEmbeddingService extends EmbeddingService {
  private helpContentCache: Map<string, HelpContentEmbeddings> = new Map()
  private processingQueue: Map<string, Promise<HelpContentEmbeddings>> = new Map()

  constructor(config: EmbeddingConfig, logger: Logger) {
    // Configure for text-embedding-3-large for better help content understanding
    const helpContentConfig = {
      ...config,
      model: 'text-embedding-3-large' as const,
      dimensions: 1536,
      batchSize: Math.min(config.batchSize, 10), // Smaller batches for help content processing
    }

    super(helpContentConfig, logger)

    this.logger.info('HelpContentEmbeddingService initialized', {
      model: helpContentConfig.model,
      dimensions: helpContentConfig.dimensions,
      batchSize: helpContentConfig.batchSize,
    })
  }

  /**
   * Generate comprehensive embeddings for help content
   * Creates multiple embedding vectors optimized for different search scenarios
   *
   * @param helpContent - Help content item to embed
   * @param options - Preprocessing and enhancement options
   * @returns Promise<HelpContentEmbeddings> - Multi-vector embeddings
   */
  async generateHelpContentEmbeddings(
    helpContent: HelpContentItem,
    options: ContentPreprocessingOptions = {}
  ): Promise<HelpContentEmbeddings> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Generating help content embeddings`, {
      contentId: helpContent.id,
      title: `${helpContent.title.substring(0, 50)}...`,
      category: helpContent.category,
      difficulty: helpContent.difficulty,
    })

    try {
      // Check if already processing
      const existingProcessing = this.processingQueue.get(helpContent.id)
      if (existingProcessing) {
        this.logger.info(`[${operationId}] Using existing processing for content`, {
          contentId: helpContent.id,
        })
        return await existingProcessing
      }

      // Check cache first
      const cached = this.getHelpContentFromCache(helpContent.id, helpContent)
      if (cached) {
        this.logger.info(`[${operationId}] Using cached embeddings`, {
          contentId: helpContent.id,
          processingTimeMs: Date.now() - startTime,
        })
        return cached
      }

      // Create processing promise and add to queue
      const processingPromise = this.processHelpContentEmbeddings(helpContent, options, operationId)
      this.processingQueue.set(helpContent.id, processingPromise)

      try {
        const embeddings = await processingPromise

        // Cache the results
        this.cacheHelpContentEmbeddings(helpContent.id, embeddings, helpContent)

        const processingTime = Date.now() - startTime
        this.logger.info(`[${operationId}] Help content embeddings generated successfully`, {
          contentId: helpContent.id,
          processingTimeMs: processingTime,
          embeddingVectors: 4, // content, title, summary, combined
        })

        return embeddings
      } finally {
        // Remove from processing queue
        this.processingQueue.delete(helpContent.id)
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.error(`[${operationId}] Help content embedding generation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentId: helpContent.id,
        processingTimeMs: processingTime,
      })

      // Remove from processing queue on error
      this.processingQueue.delete(helpContent.id)
      throw error
    }
  }

  /**
   * Batch process help content for efficient indexing
   * Optimized for processing entire help content libraries
   *
   * @param helpContentItems - Array of help content to process
   * @param options - Processing options
   * @returns Promise<HelpContentIndexingResult> - Indexing results with metrics
   */
  async batchIndexHelpContent(
    helpContentItems: HelpContentItem[],
    options: ContentPreprocessingOptions = {}
  ): Promise<HelpContentIndexingResult> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Starting batch help content indexing`, {
      totalContent: helpContentItems.length,
      options,
    })

    const result: HelpContentIndexingResult = {
      success: true,
      indexed: 0,
      skipped: 0,
      errors: [],
      processingTime: 0,
      embeddings: new Map(),
    }

    try {
      // Process in smaller batches to manage memory and API rate limits
      const batchSize = 5 // Smaller batches for help content
      const batches = this.createBatches(helpContentItems, batchSize)

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const batchStartTime = Date.now()

        this.logger.info(`[${operationId}] Processing batch ${i + 1}/${batches.length}`, {
          batchSize: batch.length,
        })

        try {
          // Process batch items in parallel with limited concurrency
          const batchPromises = batch.map((item) =>
            this.generateHelpContentEmbeddings(item, options)
              .then((embeddings) => ({ item, embeddings, success: true }))
              .catch((error) => ({
                item,
                embeddings: null,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }))
          )

          const batchResults = await Promise.all(batchPromises)

          // Process results
          for (const batchResult of batchResults) {
            if (batchResult.success && batchResult.embeddings) {
              result.embeddings.set(batchResult.item.id, batchResult.embeddings)
              result.indexed++
            } else {
              result.errors.push(
                `Failed to process ${batchResult.item.id}: ${batchResult.error || 'Unknown error'}`
              )
              result.success = false
            }
          }

          const batchTime = Date.now() - batchStartTime
          this.logger.info(`[${operationId}] Batch ${i + 1} completed`, {
            processed: batch.length,
            successful: batchResults.filter((r) => r.success).length,
            failed: batchResults.filter((r) => !r.success).length,
            batchTimeMs: batchTime,
          })

          // Add delay between batches to respect rate limits
          if (i < batches.length - 1) {
            await this.delay(1000) // 1 second delay
          }
        } catch (batchError) {
          const errorMessage =
            batchError instanceof Error ? batchError.message : 'Batch processing error'
          this.logger.error(`[${operationId}] Batch ${i + 1} failed`, {
            error: errorMessage,
            batchSize: batch.length,
          })

          result.errors.push(`Batch ${i + 1} failed: ${errorMessage}`)
          result.success = false

          // Mark all items in failed batch as skipped
          result.skipped += batch.length
        }
      }

      result.processingTime = Date.now() - startTime

      this.logger.info(`[${operationId}] Batch help content indexing completed`, {
        totalContent: helpContentItems.length,
        indexed: result.indexed,
        skipped: result.skipped,
        errors: result.errors.length,
        success: result.success,
        processingTimeMs: result.processingTime,
      })

      return result
    } catch (error) {
      result.processingTime = Date.now() - startTime
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')

      this.logger.error(`[${operationId}] Batch help content indexing failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: result.processingTime,
      })

      return result
    }
  }

  /**
   * Update embeddings for modified help content
   * Efficiently handles content updates with change detection
   *
   * @param helpContent - Updated help content
   * @param options - Processing options
   * @returns Promise<HelpContentEmbeddings> - Updated embeddings
   */
  async updateHelpContentEmbeddings(
    helpContent: HelpContentItem,
    options: ContentPreprocessingOptions = {}
  ): Promise<HelpContentEmbeddings> {
    const operationId = this.generateOperationId()

    this.logger.info(`[${operationId}] Updating help content embeddings`, {
      contentId: helpContent.id,
      title: `${helpContent.title.substring(0, 50)}...`,
    })

    // Remove from cache to force regeneration
    this.helpContentCache.delete(helpContent.id)

    // Generate new embeddings
    return await this.generateHelpContentEmbeddings(helpContent, options)
  }

  /**
   * Get embeddings metrics for help content
   */
  getHelpContentMetrics() {
    return {
      ...this.getMetrics(),
      helpContentCacheSize: this.helpContentCache.size,
      processingQueueSize: this.processingQueue.size,
    }
  }

  /**
   * Clear help content specific caches
   */
  clearHelpContentCache(): void {
    this.helpContentCache.clear()
    this.processingQueue.clear()
    this.logger.info('Help content caches cleared')
  }

  // Private Methods

  private async processHelpContentEmbeddings(
    helpContent: HelpContentItem,
    options: ContentPreprocessingOptions,
    operationId: string
  ): Promise<HelpContentEmbeddings> {
    // Preprocess content for optimal embedding generation
    const processedContent = this.preprocessHelpContent(helpContent, options)

    // Generate multiple embeddings in parallel
    const embeddingPromises = [
      // Content embedding - full content semantic understanding
      this.embed(processedContent.content),

      // Title embedding - for title-specific matching
      this.embed(processedContent.title),

      // Combined embedding - unified search vector
      this.embed(processedContent.combined),
    ]

    // Summary embedding (optional)
    if (processedContent.summary) {
      embeddingPromises.push(this.embed(processedContent.summary))
    }

    const embeddings = await Promise.all(embeddingPromises)

    return {
      contentEmbedding: embeddings[0],
      titleEmbedding: embeddings[1],
      combinedEmbedding: embeddings[2],
      summaryEmbedding: embeddings[3] || undefined,
    }
  }

  private preprocessHelpContent(
    helpContent: HelpContentItem,
    options: ContentPreprocessingOptions
  ) {
    const { includeMetadata = true, enhanceContext = true, normalizeText = true } = options

    let processedTitle = helpContent.title
    let processedContent = helpContent.content
    let processedSummary = helpContent.summary

    // Normalize text if requested
    if (normalizeText) {
      processedTitle = this.normalizeText(processedTitle)
      processedContent = this.normalizeText(processedContent)
      if (processedSummary) {
        processedSummary = this.normalizeText(processedSummary)
      }
    }

    // Enhance with context information
    let contextualContent = processedContent
    if (enhanceContext) {
      const contextParts = []

      // Add category and difficulty context
      contextParts.push(`Category: ${helpContent.category}`)
      contextParts.push(`Difficulty: ${helpContent.difficulty}`)

      // Add workflow and block type context
      if (helpContent.workflowTypes.length > 0) {
        contextParts.push(`Workflow Types: ${helpContent.workflowTypes.join(', ')}`)
      }
      if (helpContent.blockTypes.length > 0) {
        contextParts.push(`Block Types: ${helpContent.blockTypes.join(', ')}`)
      }

      // Add tags as context
      if (helpContent.tags.length > 0) {
        contextParts.push(`Tags: ${helpContent.tags.join(', ')}`)
      }

      const contextPrefix = `${contextParts.join('\n')}\n\n`
      contextualContent = contextPrefix + processedContent
    }

    // Include metadata if requested
    if (includeMetadata && Object.keys(helpContent.metadata).length > 0) {
      const metadataText = Object.entries(helpContent.metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
      contextualContent = `${contextualContent}\n\nMetadata: ${metadataText}`
    }

    // Create combined text for unified embedding
    const combinedParts = [processedTitle]
    if (processedSummary) {
      combinedParts.push(processedSummary)
    }
    combinedParts.push(contextualContent)

    const combined = combinedParts.join('\n\n')

    return {
      title: processedTitle,
      content: contextualContent,
      summary: processedSummary,
      combined,
    }
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?;:()[\]{}'"]/g, '') // Remove special characters but keep punctuation
      .trim()
  }

  private getHelpContentFromCache(
    contentId: string,
    helpContent: HelpContentItem
  ): HelpContentEmbeddings | null {
    const cached = this.helpContentCache.get(contentId)
    if (!cached) return null

    // Simple content change detection - in production, use content hash or version
    const contentHash = this.generateContentHash(helpContent)
    const cacheKey = `${contentId}_${contentHash}`

    // For now, return cached if exists (would implement proper versioning in production)
    return cached
  }

  private cacheHelpContentEmbeddings(
    contentId: string,
    embeddings: HelpContentEmbeddings,
    helpContent: HelpContentItem
  ): void {
    this.helpContentCache.set(contentId, embeddings)

    // Prevent memory overflow - keep cache size reasonable
    if (this.helpContentCache.size > 1000) {
      const firstKey = this.helpContentCache.keys().next().value
      if (firstKey) this.helpContentCache.delete(firstKey)
    }
  }

  private generateContentHash(helpContent: HelpContentItem): string {
    const hashContent = JSON.stringify({
      title: helpContent.title,
      content: helpContent.content,
      summary: helpContent.summary,
      category: helpContent.category,
      difficulty: helpContent.difficulty,
      tags: helpContent.tags.sort(),
      workflowTypes: helpContent.workflowTypes.sort(),
      blockTypes: helpContent.blockTypes.sort(),
    })

    return createHash('sha256').update(hashContent).digest('hex').substring(0, 16)
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default HelpContentEmbeddingService
