/**
 * Similar Content API - Find semantically similar help content
 *
 * GET /api/help/semantic-search/similar/[id] - Find content similar to specified help content
 *
 * Features:
 * - Vector similarity search using embeddings
 * - Content filtering by category, difficulty, and visibility
 * - Performance optimization with caching
 * - Analytics tracking for recommendation improvement
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { HelpContentEmbeddingService } from '@/lib/help/ai/help-content-embedding-service'
import type { SearchOptions } from '@/lib/help/ai/help-semantic-search-service'
import { HelpSemanticSearchService } from '@/lib/help/ai/help-semantic-search-service'
import { Logger } from '@/lib/monitoring/logger'
import { ratelimit } from '@/lib/ratelimit'

const logger = new Logger({ service: 'SimilarContentAPI' })

const embeddingService = new HelpContentEmbeddingService(
  {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-large',
    dimensions: 1536,
    cacheEnabled: true,
    cacheTTL: 3600000,
    batchSize: 10,
    maxRetries: 3,
    rateLimitPerMinute: 100,
  },
  logger
)

const searchService = new HelpSemanticSearchService(db, embeddingService, logger)

const SimilarContentRequestSchema = z.object({
  maxResults: z.number().int().min(1).max(20).optional().default(5),
  minScore: z.number().min(0).max(1).optional().default(0.7),
  categories: z.array(z.string()).optional(),
  difficulties: z.array(z.enum(['beginner', 'intermediate', 'advanced'])).optional(),
  tags: z.array(z.string()).optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/help/semantic-search/similar/[id]
 * Find help content similar to the specified content item
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const operationId = generateOperationId()
  const startTime = Date.now()
  const contentId = params.id

  try {
    // Authentication
    const authResult = await auth()
    if (!authResult?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = await ratelimit.limit(authResult.user.id)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retryAfter: rateLimitResult.reset },
        { status: 429 }
      )
    }

    // Validate content ID
    if (!contentId || typeof contentId !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid content ID' }, { status: 400 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    let requestOptions
    try {
      requestOptions = SimilarContentRequestSchema.parse({
        maxResults: url.searchParams.get('maxResults')
          ? Number.parseInt(url.searchParams.get('maxResults')!)
          : undefined,
        minScore: url.searchParams.get('minScore')
          ? Number.parseFloat(url.searchParams.get('minScore')!)
          : undefined,
        categories: url.searchParams.get('categories')?.split(',').filter(Boolean),
        difficulties: url.searchParams.get('difficulties')?.split(',').filter(Boolean),
        tags: url.searchParams.get('tags')?.split(',').filter(Boolean),
      })
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: parseError instanceof z.ZodError ? parseError.errors : undefined,
        },
        { status: 400 }
      )
    }

    logger.info(`[${operationId}] Finding similar content`, {
      contentId,
      userId: authResult.user.id,
      options: requestOptions,
    })

    // Find similar content
    const similarContent = await searchService.findSimilarContent(
      contentId,
      requestOptions as SearchOptions
    )

    const processingTime = Date.now() - startTime

    logger.info(`[${operationId}] Similar content found`, {
      contentId,
      resultsCount: similarContent.length,
      processingTimeMs: processingTime,
      userId: authResult.user.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          referenceContentId: contentId,
          similarContent,
          metadata: {
            totalResults: similarContent.length,
            processingTimeMs: processingTime,
            filters: requestOptions,
          },
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=600', // 10 minute cache for similar content
          'X-Processing-Time': processingTime.toString(),
          'X-Operation-ID': operationId,
        },
      }
    )
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`[${operationId}] Similar content search failed`, {
      contentId,
      error: errorMessage,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Similar content request failed',
        operationId,
      },
      {
        status: 500,
        headers: {
          'X-Processing-Time': processingTime.toString(),
          'X-Operation-ID': operationId,
        },
      }
    )
  }
}

function generateOperationId(): string {
  return `similar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}
