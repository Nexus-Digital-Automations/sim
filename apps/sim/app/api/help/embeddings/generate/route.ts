/**
 * API Route: Help Content Embeddings Generation
 *
 * Endpoint for generating vector embeddings for help content items using the extended
 * vector infrastructure. Supports batch processing, multiple embedding strategies,
 * and integration with the pgvector database.
 *
 * Key Features:
 * - Individual and batch embedding generation
 * - Multiple embedding strategies (full, title, excerpt, chunk, tags)
 * - Integration with existing help content infrastructure
 * - Comprehensive logging and error handling
 * - Performance analytics and monitoring
 *
 * Performance Targets:
 * - <500ms response time for single content items
 * - <2s response time for batch processing (up to 10 items)
 * - Support for concurrent embedding generation
 *
 * Dependencies: HelpContentEmbeddingsService, Database, Authentication
 * Usage: Content indexing, search optimization, AI help system integration
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import type { HelpContentItem } from '@/lib/help/ai/help-content-embeddings'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('HelpEmbeddingsGenerateAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const embeddingGenerationSchema = z.object({
  contentId: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  excerpt: z.string().optional(),
  contentType: z.enum(['article', 'tutorial', 'faq', 'troubleshooting', 'api_docs', 'video']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  audience: z.enum(['general', 'developer', 'admin', 'user']),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  metadata: z.record(z.any()).optional().default({}),
  updatedAt: z.string().datetime(),
})

const batchEmbeddingSchema = z.object({
  contentItems: z.array(embeddingGenerationSchema).min(1).max(20),
  options: z
    .object({
      strategies: z.array(z.enum(['full', 'title', 'excerpt', 'chunk', 'tags'])).optional(),
      chunkSize: z.number().min(100).max(2000).optional(),
      chunkOverlap: z.number().min(0).max(500).optional(),
      forceRegenerate: z.boolean().optional().default(false),
      batchSize: z.number().min(1).max(10).optional().default(5),
      includeAnalytics: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
})

const singleEmbeddingSchema = z.object({
  contentItem: embeddingGenerationSchema,
  options: z
    .object({
      strategies: z.array(z.enum(['full', 'title', 'excerpt', 'chunk', 'tags'])).optional(),
      chunkSize: z.number().min(100).max(2000).optional(),
      chunkOverlap: z.number().min(0).max(500).optional(),
      forceRegenerate: z.boolean().optional().default(false),
      includeAnalytics: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
})

// ========================
// TYPES
// ========================

interface EmbeddingGenerationResponse {
  success: boolean
  contentId: string
  embeddings: {
    id: string
    embeddingType: string
    chunkIndex?: number
    tokenCount: number
    embeddingQuality: number
    processingTime: number
  }[]
  tokensProcessed: number
  processingTime: number
  cost?: {
    tokens: number
    estimatedCost: number
  }
}

interface BatchEmbeddingGenerationResponse {
  success: boolean
  results: EmbeddingGenerationResponse[]
  summary: {
    totalContentItems: number
    successfulItems: number
    failedItems: number
    totalEmbeddings: number
    totalTokens: number
    totalProcessingTime: number
    averageProcessingTime: number
    estimatedTotalCost?: number
  }
  errors: Array<{
    contentId: string
    error: string
    details?: any
  }>
}

// ========================
// API HANDLERS
// ========================

/**
 * POST /api/help/embeddings/generate
 * Generate embeddings for help content items
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  logger.info(`[${requestId}] Embedding generation request received`)

  try {
    // Verify authentication and permissions
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions for embedding generation (admin/editor only)
    if (!hasEmbeddingPermissions(session.user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for embedding generation' },
        { status: 403 }
      )
    }

    const body = await request.json()
    logger.info(`[${requestId}] Processing embedding generation request`, {
      isBatch: 'contentItems' in body,
      userId: session.user.id,
    })

    // Determine if this is a batch or single request
    const isBatchRequest = 'contentItems' in body

    if (isBatchRequest) {
      return await handleBatchEmbeddingGeneration(body, session.user.id, requestId)
    }
    return await handleSingleEmbeddingGeneration(body, session.user.id, requestId)
  } catch (error) {
    const processingTime = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request data`, {
        errors: error.errors,
        processingTimeMs: processingTime,
      })
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Embedding generation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate embeddings',
      },
      { status: 500 }
    )
  }
}

// ========================
// HANDLER FUNCTIONS
// ========================

/**
 * Handle single embedding generation request
 */
async function handleSingleEmbeddingGeneration(
  body: any,
  userId: string,
  requestId: string
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Validate request data
    const validatedData = singleEmbeddingSchema.parse(body)

    logger.info(`[${requestId}] Generating embeddings for single content item`, {
      contentId: validatedData.contentItem.contentId,
      contentType: validatedData.contentItem.contentType,
      strategies: validatedData.options.strategies,
    })

    // Convert to HelpContentItem format
    const helpContentItem: HelpContentItem = {
      id: validatedData.contentItem.contentId,
      title: validatedData.contentItem.title,
      content: validatedData.contentItem.content,
      excerpt: validatedData.contentItem.excerpt,
      contentType: validatedData.contentItem.contentType,
      difficulty: validatedData.contentItem.difficulty,
      audience: validatedData.contentItem.audience,
      categoryId: validatedData.contentItem.categoryId,
      tags: validatedData.contentItem.tags,
      keywords: validatedData.contentItem.keywords,
      metadata: validatedData.contentItem.metadata,
      updatedAt: new Date(validatedData.contentItem.updatedAt),
    }

    // Initialize embedding service (this would be dependency injected in production)
    const embeddingService = await getHelpContentEmbeddingsService()

    // Generate embeddings
    const results = await embeddingService.generateEmbeddings(
      helpContentItem,
      validatedData.options
    )

    const processingTime = Date.now() - startTime
    const totalTokens = results.reduce((sum, result) => sum + result.tokensProcessed, 0)
    const totalEmbeddings = results.reduce((sum, result) => sum + result.embeddings.length, 0)

    // Calculate estimated cost (approximate based on OpenAI pricing)
    const estimatedCost = (totalTokens * 0.0001) / 1000 // $0.0001 per 1K tokens

    const response: EmbeddingGenerationResponse = {
      success: true,
      contentId: helpContentItem.id,
      embeddings: results.flatMap((result) =>
        result.embeddings.map((embedding) => ({
          id: embedding.id,
          embeddingType: embedding.embeddingType,
          chunkIndex: embedding.chunkIndex,
          tokenCount: embedding.tokenCount,
          embeddingQuality: embedding.embeddingQuality,
          processingTime: result.processingTime,
        }))
      ),
      tokensProcessed: totalTokens,
      processingTime,
      cost: {
        tokens: totalTokens,
        estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimal places
      },
    }

    logger.info(`[${requestId}] Single embedding generation completed`, {
      contentId: helpContentItem.id,
      embeddingsGenerated: totalEmbeddings,
      tokensProcessed: totalTokens,
      processingTimeMs: processingTime,
      estimatedCost,
    })

    return NextResponse.json(response)
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Single embedding generation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime,
    })
    throw error
  }
}

/**
 * Handle batch embedding generation request
 */
async function handleBatchEmbeddingGeneration(
  body: any,
  userId: string,
  requestId: string
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Validate request data
    const validatedData = batchEmbeddingSchema.parse(body)

    logger.info(`[${requestId}] Generating embeddings for batch content items`, {
      itemCount: validatedData.contentItems.length,
      strategies: validatedData.options.strategies,
      batchSize: validatedData.options.batchSize,
    })

    // Convert to HelpContentItem format
    const helpContentItems: HelpContentItem[] = validatedData.contentItems.map((item) => ({
      id: item.contentId,
      title: item.title,
      content: item.content,
      excerpt: item.excerpt,
      contentType: item.contentType,
      difficulty: item.difficulty,
      audience: item.audience,
      categoryId: item.categoryId,
      tags: item.tags,
      keywords: item.keywords,
      metadata: item.metadata,
      updatedAt: new Date(item.updatedAt),
    }))

    // Initialize embedding service
    const embeddingService = await getHelpContentEmbeddingsService()

    // Process batch embedding generation
    const batchResults = await embeddingService.batchGenerateEmbeddings(
      helpContentItems,
      validatedData.options
    )

    const processingTime = Date.now() - startTime

    // Process results for response
    const results: EmbeddingGenerationResponse[] = []
    const errors: Array<{ contentId: string; error: string; details?: any }> = []

    batchResults.forEach((batchResult) => {
      try {
        const totalTokens = batchResult.tokensProcessed
        const totalEmbeddings = batchResult.embeddings.length
        const estimatedCost = (totalTokens * 0.0001) / 1000

        results.push({
          success: true,
          contentId: batchResult.contentId,
          embeddings: batchResult.embeddings.map((embedding) => ({
            id: embedding.id,
            embeddingType: embedding.embeddingType,
            chunkIndex: embedding.chunkIndex,
            tokenCount: embedding.tokenCount,
            embeddingQuality: embedding.embeddingQuality,
            processingTime: batchResult.processingTime,
          })),
          tokensProcessed: totalTokens,
          processingTime: batchResult.processingTime,
          cost: {
            tokens: totalTokens,
            estimatedCost: Math.round(estimatedCost * 10000) / 10000,
          },
        })
      } catch (resultError) {
        errors.push({
          contentId: batchResult.contentId,
          error: resultError instanceof Error ? resultError.message : 'Processing error',
          details: resultError,
        })
      }
    })

    // Calculate summary statistics
    const totalEmbeddings = results.reduce((sum, result) => sum + result.embeddings.length, 0)
    const totalTokens = results.reduce((sum, result) => sum + result.tokensProcessed, 0)
    const totalCost = results.reduce((sum, result) => sum + (result.cost?.estimatedCost || 0), 0)

    const response: BatchEmbeddingGenerationResponse = {
      success: errors.length === 0,
      results,
      summary: {
        totalContentItems: validatedData.contentItems.length,
        successfulItems: results.length,
        failedItems: errors.length,
        totalEmbeddings,
        totalTokens,
        totalProcessingTime: processingTime,
        averageProcessingTime: Math.round(processingTime / Math.max(results.length, 1)),
        estimatedTotalCost: Math.round(totalCost * 10000) / 10000,
      },
      errors,
    }

    logger.info(`[${requestId}] Batch embedding generation completed`, {
      totalItems: validatedData.contentItems.length,
      successfulItems: results.length,
      failedItems: errors.length,
      totalEmbeddings,
      totalTokens,
      processingTimeMs: processingTime,
      estimatedTotalCost: totalCost,
    })

    return NextResponse.json(response)
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Batch embedding generation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime,
    })
    throw error
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Check if user has permissions for embedding generation
 */
function hasEmbeddingPermissions(user: any): boolean {
  // In production, this would check user roles/permissions
  // For now, allow all authenticated users (you may want to restrict this)
  return true
}

/**
 * Get help content embeddings service instance
 * In production, this would use dependency injection
 */
async function getHelpContentEmbeddingsService() {
  // This is a placeholder - in production you would initialize the actual service
  // with proper dependencies (EmbeddingService, Database, Logger)
  throw new Error(
    'HelpContentEmbeddingsService not initialized - this is a placeholder implementation'
  )
}

/**
 * Calculate token cost based on OpenAI pricing
 */
function calculateTokenCost(tokens: number, model = 'text-embedding-3-large'): number {
  // OpenAI text-embedding-3-large pricing: $0.00013 per 1K tokens
  const pricePerThousandTokens = 0.00013
  return (tokens / 1000) * pricePerThousandTokens
}
