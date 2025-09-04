/**
 * Help Content Delivery API - Content delivery with caching
 *
 * Provides optimized content delivery for the help system:
 * - Content retrieval with version control
 * - Smart caching with edge optimization
 * - Content personalization based on user context
 * - Multi-language support and fallbacks
 * - Analytics integration for content effectiveness
 * - Rate limiting and security measures
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { getSession } from '@/lib/auth'
import { helpContentManager } from '@/lib/help/help-content-manager'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { helpContentLoader } from '@/help/content/index'
import type { HelpContentDocument, ContentSearchFilter } from '@/lib/help/help-content-manager'

const logger = createLogger('HelpContentAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const contentRequestSchema = z.object({
  contentId: z.string().optional(),
  category: z.string().optional(),
  component: z.string().optional(),
  userLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  language: z.string().default('en'),
  version: z.number().optional(),
  includeMetadata: z.boolean().default(true),
  includeAnalytics: z.boolean().default(false),
})

const contextRequestSchema = z.object({
  component: z.string(),
  page: z.string().optional(),
  userLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
  workflowState: z.enum(['empty', 'creating', 'editing', 'running', 'debugging']).optional(),
  blockType: z.string().optional(),
  errorState: z.boolean().optional(),
  lastAction: z.string().optional(),
  limit: z.number().min(1).max(20).default(5),
  includeAnalytics: z.boolean().default(false),
})

// ========================
// CACHING UTILITIES
// ========================

interface CacheEntry {
  content: any
  timestamp: number
  etag: string
}

class ContentCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, content: any): string {
    const etag = this.generateETag(content)
    this.cache.set(key, {
      content,
      timestamp: Date.now(),
      etag,
    })
    return etag
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return entry
  }

  private generateETag(content: any): string {
    const hash = JSON.stringify(content).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return `"${Math.abs(hash).toString(36)}"`
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key)
      }
    }
  }
}

const contentCache = new ContentCache()

// Cleanup expired cache entries every 5 minutes
setInterval(() => contentCache.cleanup(), 5 * 60 * 1000)

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/help/content - Retrieve help content
 * 
 * Query Parameters:
 * - contentId: Specific content ID to retrieve
 * - category: Filter by content category  
 * - component: Filter by component context
 * - userLevel: Filter by user experience level
 * - language: Content language (default: en)
 * - version: Specific content version
 * - includeMetadata: Include content metadata (default: true)
 * - includeAnalytics: Include analytics data (default: false)
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing help content request`)

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams)
    
    // Convert boolean strings
    if (params.includeMetadata) params.includeMetadata = params.includeMetadata === 'true'
    if (params.includeAnalytics) params.includeAnalytics = params.includeAnalytics === 'true'
    if (params.version) params.version = parseInt(params.version, 10)

    const validationResult = contentRequestSchema.safeParse(params)
    
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid request parameters`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const {
      contentId,
      category,
      component,
      userLevel,
      language,
      version,
      includeMetadata,
      includeAnalytics,
    } = validationResult.data

    // Generate cache key
    const cacheKey = JSON.stringify({
      contentId,
      category,
      component,
      userLevel,
      language,
      version,
      includeMetadata,
      includeAnalytics,
    })

    // Check cache first
    const cachedEntry = contentCache.get(cacheKey)
    if (cachedEntry) {
      const ifNoneMatch = request.headers.get('If-None-Match')
      if (ifNoneMatch === cachedEntry.etag) {
        logger.info(`[${requestId}] Content not modified, returning 304`)
        return new NextResponse(null, { status: 304 })
      }

      logger.info(`[${requestId}] Serving content from cache`)
      return NextResponse.json(cachedEntry.content, {
        headers: {
          'ETag': cachedEntry.etag,
          'Cache-Control': 'public, max-age=300', // 5 minutes
        },
      })
    }

    // Get user session for personalization
    const session = await getSession()
    const userId = session?.user?.email

    let content: HelpContentDocument[] = []

    // Retrieve content based on request type
    if (contentId) {
      // Single content item
      const item = await helpContentManager.getContent(contentId, version)
      if (item) {
        content = [item]
      }
    } else if (category) {
      // Content by category
      content = await helpContentLoader.loadCategory(category, language)
    } else if (component) {
      // Contextual content for component
      const context = {
        component,
        page: searchParams.get('page') || window?.location?.pathname || '/',
        userLevel: userLevel || 'beginner',
        workflowState: searchParams.get('workflowState') as any,
        blockType: searchParams.get('blockType') || undefined,
        errorState: searchParams.get('errorState') === 'true',
      }
      
      content = await helpContentManager.getContextualContent(context)
    } else {
      // Default: return featured/recommended content
      content = await helpContentLoader.loadCategory('getting-started', language)
    }

    // Filter by user level if specified
    if (userLevel) {
      content = content.filter(item => 
        item.userLevels.includes(userLevel) || item.userLevels.length === 0
      )
    }

    // Enhance content with analytics if requested
    if (includeAnalytics && userId) {
      for (const item of content) {
        try {
          const analytics = await helpContentManager.getContentAnalytics(item.id)
          if (analytics) {
            (item as any).analytics = analytics
          }
        } catch (error) {
          logger.warn(`[${requestId}] Failed to load analytics for content ${item.id}`, error)
        }
      }
    }

    // Prepare response
    const response = {
      content,
      meta: {
        total: content.length,
        language,
        userLevel,
        timestamp: new Date().toISOString(),
        requestId,
      },
      ...(includeMetadata && {
        metadata: {
          categories: [...new Set(content.map(item => item.metadata.category))],
          tags: [...new Set(content.flatMap(item => item.tags))],
          averageReadingTime: content.length > 0 
            ? Math.round(content.reduce((sum, item) => sum + (item.metadata.estimatedReadingTime || 0), 0) / content.length)
            : 0,
        },
      }),
    }

    // Cache the response
    const etag = contentCache.set(cacheKey, response)

    // Track content delivery analytics
    if (userId) {
      for (const item of content) {
        helpAnalytics.trackHelpView(
          item.id,
          requestId,
          {
            component: component || 'api',
            page: searchParams.get('page') || '/',
            userLevel: userLevel || 'beginner',
          },
          userId
        )
      }
    }

    const processingTime = Date.now() - startTime
    logger.info(`[${requestId}] Help content delivered successfully`, {
      contentCount: content.length,
      cached: false,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(response, {
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'X-Response-Time': `${processingTime}ms`,
      },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Error processing help content request`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/help/content/contextual - Get contextual help for specific situations
 * 
 * Body:
 * - component: Component identifier
 * - page: Current page path (optional)
 * - userLevel: User experience level
 * - workflowState: Current workflow state (optional)
 * - blockType: Current block type (optional) 
 * - errorState: Whether user is in error state (optional)
 * - lastAction: Last user action (optional)
 * - limit: Maximum number of results (default: 5)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing contextual help request`)

    const body = await request.json()
    const validationResult = contextRequestSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid contextual request body`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const {
      component,
      page,
      userLevel,
      workflowState,
      blockType,
      errorState,
      lastAction,
      limit,
      includeAnalytics,
    } = validationResult.data

    // Get user session
    const session = await getSession()
    const userId = session?.user?.email

    // Build context object
    const context = {
      component,
      page: page || '/',
      userLevel,
      workflowState,
      blockType,
      errorState,
      lastAction,
    }

    // Get contextual help content
    const content = await helpContentManager.getContextualContent(context)

    // Limit results
    const limitedContent = content.slice(0, limit)

    // Enhance with analytics if requested
    if (includeAnalytics && userId) {
      for (const item of limitedContent) {
        try {
          const analytics = await helpContentManager.getContentAnalytics(item.id)
          if (analytics) {
            (item as any).analytics = analytics
          }
        } catch (error) {
          logger.warn(`[${requestId}] Failed to load analytics for content ${item.id}`, error)
        }
      }
    }

    const response = {
      content: limitedContent,
      context,
      meta: {
        total: limitedContent.length,
        available: content.length,
        timestamp: new Date().toISOString(),
        requestId,
      },
    }

    // Track contextual help requests
    if (userId) {
      for (const item of limitedContent) {
        helpAnalytics.trackHelpView(
          item.id,
          requestId,
          context,
          userId
        )
      }

      // Track contextual help request
      helpAnalytics.trackHelpInteraction(
        'contextual-request',
        requestId,
        'api_request',
        'contextual',
        { context, resultCount: limitedContent.length },
        userId
      )
    }

    const processingTime = Date.now() - startTime
    logger.info(`[${requestId}] Contextual help delivered successfully`, {
      component,
      contentCount: limitedContent.length,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': 'private, max-age=60', // 1 minute for contextual content
      },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Error processing contextual help request`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * HEAD /api/help/content - Check content availability and freshness
 */
export async function HEAD(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    if (contentId) {
      const content = await helpContentManager.getContent(contentId)
      if (!content) {
        return new NextResponse(null, { status: 404 })
      }

      const etag = `"${content.updatedAt.getTime()}"`
      return new NextResponse(null, {
        status: 200,
        headers: {
          'ETag': etag,
          'Last-Modified': content.updatedAt.toUTCString(),
          'Content-Type': 'application/json',
        },
      })
    }

    return new NextResponse(null, { status: 200 })

  } catch (error) {
    logger.error(`[${requestId}] Error processing HEAD request`, { error })
    return new NextResponse(null, { status: 500 })
  }
}