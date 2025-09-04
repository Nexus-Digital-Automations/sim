/**
 * Marketplace Tags API - Template Tag Management
 *
 * This API provides tag management functionality including:
 * - Popular tag retrieval with usage statistics and trending
 * - Tag creation and management with auto-suggestion
 * - Tag analytics and trending calculations
 * - Performance-optimized queries with caching support
 *
 * @author Claude Code Template Marketplace System
 * @version 1.0.0
 */

import { and, desc, eq, gte, ilike, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templates, templateTagAssignments, templateTags } from '@/db/schema'

const logger = createLogger('MarketplaceTagsAPI')

/**
 * Get Tags - GET /api/community/marketplace/tags
 *
 * Retrieve template tags with usage statistics and trending information
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Extract parameters
    const query = searchParams.get('query')
    const minUsage = Number.parseInt(searchParams.get('minUsage') || '1')
    const trending = searchParams.get('trending') === 'true'
    const featured = searchParams.get('featured') === 'true'
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50')))
    const includeStats = searchParams.get('includeStats') !== 'false'

    logger.info(`[${requestId}] Tags request`, {
      query: query?.slice(0, 50),
      minUsage,
      trending,
      featured,
      limit,
    })

    // Build query conditions
    const conditions = []

    // Only active tags
    conditions.push(eq(templateTags.isActive, true))

    // Minimum usage filter
    if (minUsage > 1) {
      conditions.push(gte(templateTags.usageCount, minUsage))
    }

    // Featured tags filter
    if (featured) {
      conditions.push(eq(templateTags.isFeatured, true))
    }

    // Text search
    if (query?.trim()) {
      const searchTerm = `%${query.trim()}%`
      conditions.push(ilike(templateTags.displayName, searchTerm))
    }

    // Build base query
    let queryBuilder = db
      .select({
        id: templateTags.id,
        name: templateTags.name,
        displayName: templateTags.displayName,
        slug: templateTags.slug,
        description: templateTags.description,
        color: templateTags.color,
        usageCount: templateTags.usageCount,
        weeklyGrowth: templateTags.weeklyGrowth,
        trendScore: templateTags.trendScore,
        isActive: templateTags.isActive,
        isFeatured: templateTags.isFeatured,
        isSystem: templateTags.isSystem,
        createdAt: templateTags.createdAt,
        updatedAt: templateTags.updatedAt,
        // Additional statistics if requested
        ...(includeStats && {
          activeTemplateCount: sql<number>`(
            SELECT COUNT(DISTINCT t.id)
            FROM ${templates} t
            INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
            WHERE tta.tag_id = ${templateTags.id}
            AND t.status = 'published'
          )`,
          avgTemplateRating: sql<number>`(
            SELECT COALESCE(AVG(t.avg_rating), 0)
            FROM ${templates} t
            INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
            WHERE tta.tag_id = ${templateTags.id}
            AND t.status = 'published'
            AND t.rating_count > 0
          )`,
          totalDownloads: sql<number>`(
            SELECT COALESCE(SUM(t.download_count), 0)
            FROM ${templates} t
            INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
            WHERE tta.tag_id = ${templateTags.id}
            AND t.status = 'published'
          )`,
        }),
      })
      .from(templateTags)
      .where(and(...conditions))

    // Apply sorting
    if (trending) {
      queryBuilder = queryBuilder.orderBy(
        desc(templateTags.trendScore),
        desc(templateTags.weeklyGrowth),
        desc(templateTags.usageCount)
      )
    } else {
      queryBuilder = queryBuilder.orderBy(desc(templateTags.usageCount), templateTags.displayName)
    }

    // Apply limit
    const tags = await queryBuilder.limit(limit)

    // Calculate additional trending metrics if requested
    let enrichedTags = tags
    if (trending && includeStats) {
      enrichedTags = await enrichTagsWithTrendingData(tags)
    }

    // Get total count for pagination
    const totalCountQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateTags)
      .where(and(...conditions))

    const totalCount = totalCountQuery[0]?.count || 0

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Tags retrieved`, {
      tagCount: enrichedTags.length,
      totalCount,
      trending,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: enrichedTags,
      metadata: {
        requestId,
        processingTime,
        query: query?.slice(0, 50),
        trending,
        featured,
        total: totalCount,
        returned: enrichedTags.length,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Tags retrieval failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve tags',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Create Tag - POST /api/community/marketplace/tags
 *
 * Create a new template tag
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const body = await request.json()

    // Validate required fields
    const { name, displayName, description, color, category } = body

    if (!name || !displayName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Name and display name are required',
          requestId,
        },
        { status: 400 }
      )
    }

    // Normalize name (lowercase, no spaces, alphanumeric + hyphens only)
    const normalizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
    const slug = normalizedName

    logger.info(`[${requestId}] Tag creation request`, {
      name: normalizedName,
      displayName,
      category,
    })

    // Check if tag already exists
    const existingTag = await db
      .select({ id: templateTags.id })
      .from(templateTags)
      .where(eq(templateTags.name, normalizedName))
      .limit(1)

    if (existingTag.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Tag already exists',
          requestId,
        },
        { status: 400 }
      )
    }

    // Create tag
    const tagId = crypto.randomUUID()
    const now = new Date()

    const [newTag] = await db
      .insert(templateTags)
      .values({
        id: tagId,
        name: normalizedName,
        displayName,
        slug,
        description: description || null,
        color: color || '#3B82F6',
        usageCount: 0,
        weeklyGrowth: 0,
        trendScore: 0,
        isActive: true,
        isFeatured: false,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Tag created`, {
      tagId,
      name: normalizedName,
      displayName,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: newTag,
      metadata: {
        requestId,
        processingTime,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Tag creation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tag',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Enrich tags with additional trending data
 */
async function enrichTagsWithTrendingData(tags: any[]): Promise<any[]> {
  const tagIds = tags.map((tag) => tag.id)

  if (tagIds.length === 0) {
    return tags
  }

  // Get trending metrics for the past 30 days
  const trendingMetrics = await db
    .select({
      tagId: templateTagAssignments.tagId,
      recentUsage: sql<number>`COUNT(DISTINCT t.id)`,
      recentDownloads: sql<number>`COALESCE(SUM(t.download_count), 0)`,
      avgRating: sql<number>`COALESCE(AVG(t.avg_rating), 0)`,
    })
    .from(templateTagAssignments)
    .innerJoin(templates, eq(templateTagAssignments.templateId, templates.id))
    .where(
      and(
        sql`${templateTagAssignments.tagId} = ANY(${tagIds})`,
        eq(templates.status, 'published'),
        sql`${templates.createdAt} >= NOW() - INTERVAL '30 days'`
      )
    )
    .groupBy(templateTagAssignments.tagId)

  // Create metrics map
  const metricsMap = new Map()
  for (const metric of trendingMetrics) {
    metricsMap.set(metric.tagId, {
      recentUsage: metric.recentUsage,
      recentDownloads: metric.recentDownloads,
      avgRating: Number(metric.avgRating.toFixed(2)),
      velocityScore: calculateVelocityScore(metric),
    })
  }

  // Enrich tags with trending data
  return tags.map((tag) => ({
    ...tag,
    trending: metricsMap.get(tag.id) || {
      recentUsage: 0,
      recentDownloads: 0,
      avgRating: 0,
      velocityScore: 0,
    },
  }))
}

/**
 * Calculate velocity score for trending
 */
function calculateVelocityScore(metric: any): number {
  // Simple velocity calculation: recent usage * download factor + rating bonus
  const baseScore = metric.recentUsage * 10
  const downloadBonus = Math.min(metric.recentDownloads * 0.1, 50)
  const ratingBonus = metric.avgRating >= 4 ? 20 : metric.avgRating >= 3 ? 10 : 0

  return Math.round(baseScore + downloadBonus + ratingBonus)
}

/**
 * Update tag usage statistics (called by background jobs)
 */
export async function updateTagStatistics() {
  const startTime = Date.now()
  const requestId = 'tag-stats-update'

  try {
    logger.info(`[${requestId}] Starting tag statistics update`)

    // Update usage counts for all tags
    await db.execute(sql`
      UPDATE ${templateTags} 
      SET 
        usage_count = (
          SELECT COUNT(DISTINCT t.id)
          FROM ${templates} t
          INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
          WHERE tta.tag_id = ${templateTags.id}
          AND t.status = 'published'
        ),
        weekly_growth = (
          SELECT COUNT(DISTINCT t.id)
          FROM ${templates} t
          INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
          WHERE tta.tag_id = ${templateTags.id}
          AND t.status = 'published'
          AND t.created_at >= NOW() - INTERVAL '7 days'
        ) - (
          SELECT COUNT(DISTINCT t.id)
          FROM ${templates} t
          INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
          WHERE tta.tag_id = ${templateTags.id}
          AND t.status = 'published'
          AND t.created_at >= NOW() - INTERVAL '14 days'
          AND t.created_at < NOW() - INTERVAL '7 days'
        ),
        updated_at = NOW()
    `)

    // Calculate trend scores
    await db.execute(sql`
      UPDATE ${templateTags}
      SET 
        trend_score = GREATEST(0, 
          (usage_count * 0.4) + 
          (weekly_growth * 2.0) +
          (CASE WHEN weekly_growth > 0 THEN 10 ELSE 0 END)
        )
      WHERE is_active = true
    `)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Tag statistics updated`, {
      processingTime,
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Tag statistics update failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })
  }
}
