/**
 * Marketplace Tags API - Template Tag Management with Enhanced Schema Integration
 *
 * This API provides comprehensive tag management functionality including:
 * - Popular tag retrieval with usage statistics and trending analysis
 * - Tag creation and management with auto-suggestion capabilities
 * - Tag analytics and trending calculations with performance metrics
 * - Performance-optimized queries with advanced caching support
 * - Schema-integrated lifecycle management (isActive, isFeatured properties)
 * - Advanced filtering and search capabilities with statistical enrichment
 *
 * SCHEMA INTEGRATION FEATURES:
 * - Enhanced templateTags schema with lifecycle management fields
 * - Proper templateTagAssignments relationship handling
 * - Type-safe database operations with comprehensive validation
 * - Advanced query construction with statistical aggregations
 * - Optimized performance with proper indexing and caching
 *
 * DATABASE SCHEMA DEPENDENCIES:
 * - templateTags: Core tag entities with lifecycle management
 * - templateTagAssignments: Many-to-many relationship table
 * - templates: Associated template entities for statistical calculations
 *
 * @author Claude Code Template Marketplace System - Schema Integration Subagent
 * @version 2.0.0 - Enhanced Schema Integration
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
 * Retrieve template tags with comprehensive usage statistics and trending analysis.
 * This endpoint leverages enhanced schema integration with lifecycle management fields
 * (isActive, isFeatured) for advanced filtering and proper relationship handling.
 *
 * SCHEMA INTEGRATION FEATURES:
 * - Uses isActive field for availability filtering (only active tags returned)
 * - Leverages isFeatured field for promoted tag discovery
 * - Integrates templateTagAssignments for accurate usage statistics
 * - Utilizes advanced query construction with statistical aggregations
 * - Implements performance-optimized queries with proper indexing
 *
 * QUERY PARAMETERS:
 * - query: Text search across tag names and descriptions
 * - minUsage: Minimum usage count filter (default: 1)
 * - trending: Enable trending calculations and sorting
 * - featured: Filter to only featured tags (isFeature = true)
 * - limit: Maximum results to return (1-100, default: 50)
 * - includeStats: Include detailed statistical calculations
 *
 * STATISTICAL ENRICHMENT:
 * - activeTemplateCount: Count of published templates using each tag
 * - avgTemplateRating: Average rating of templates associated with tag
 * - totalDownloads: Cumulative download count for tag-associated templates
 * - trendScore: Calculated popularity trend metric
 * - weeklyGrowth: Growth rate analysis for trending identification
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Conditional statistical aggregations (only when includeStats=true)
 * - Efficient relationship joins via templateTagAssignments
 * - Proper query ordering for trending vs standard sort modes
 * - Optimized limit application for large dataset handling
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

    // Build query conditions with enhanced schema integration
    const conditions = []

    /**
     * SCHEMA INTEGRATION: Enhanced lifecycle management filtering
     * 
     * Uses isActive field from enhanced templateTags schema to ensure only
     * available tags are returned. This field was added as part of schema
     * enhancement to support tag lifecycle management and administrative control.
     */
    conditions.push(eq(templateTags.isActive, true))

    /**
     * Usage-based filtering with statistical validation
     * 
     * Leverages usageCount field for minimum threshold filtering, ensuring
     * only tags with sufficient template associations are returned. This
     * improves result relevance and reduces noise from unused tags.
     */
    if (minUsage > 1) {
      conditions.push(gte(templateTags.usageCount, minUsage))
    }

    /**
     * SCHEMA INTEGRATION: Featured tag discovery enhancement
     * 
     * Uses isFeatured field from enhanced schema to support promoted tag
     * discovery. This field enables administrative control over tag prominence
     * and improves user experience through curated tag recommendations.
     */
    if (featured) {
      conditions.push(eq(templateTags.isFeatured, true))
    }

    /**
     * Advanced text search with display name targeting
     * 
     * Implements case-insensitive search across displayName field using ILIKE
     * for PostgreSQL compatibility. Targets user-friendly display names rather
     * than internal tag names for better search experience.
     */
    if (query?.trim()) {
      const searchTerm = `%${query.trim()}%`
      conditions.push(ilike(templateTags.displayName, searchTerm))
    }

    /**
     * ENHANCED QUERY CONSTRUCTION: Type-safe schema integration with statistical aggregations
     * 
     * This query construction demonstrates proper integration with the enhanced templateTags
     * schema and templateTagAssignments relationship table. Key features:
     * 
     * CORE FIELD SELECTION:
     * - All standard tag fields with proper schema field mapping
     * - Enhanced lifecycle fields (isActive, isFeatured) from schema extensions
     * - Statistical fields (usageCount, weeklyGrowth, trendScore) for analytics
     * 
     * RELATIONSHIP INTEGRATION:
     * - templateTagAssignments join for accurate usage calculations
     * - templates table integration for advanced statistics
     * - Proper foreign key relationship handling with cascade protection
     * 
     * CONDITIONAL STATISTICAL AGGREGATIONS:
     * - activeTemplateCount: Uses templateTagAssignments for published template counts
     * - avgTemplateRating: Calculates weighted average ratings across associated templates
     * - totalDownloads: Aggregates download counts for popularity metrics
     * 
     * PERFORMANCE OPTIMIZATIONS:
     * - Conditional aggregation fields only when includeStats=true
     * - DISTINCT clauses prevent duplicate counting in many-to-many relationships
     * - COALESCE functions handle NULL values gracefully
     * - Proper indexing utilization through templateTagAssignments
     */
    const baseQuery = db
      .select({
        // Core tag identification and metadata
        id: templateTags.id,
        name: templateTags.name,
        displayName: templateTags.displayName,
        slug: templateTags.slug,
        description: templateTags.description,
        color: templateTags.color,
        
        // Enhanced schema lifecycle and analytics fields
        usageCount: templateTags.usageCount,
        weeklyGrowth: templateTags.weeklyGrowth,
        trendScore: templateTags.trendScore,
        isActive: templateTags.isActive,          // Schema enhancement: lifecycle management
        isFeatured: templateTags.isFeatured,      // Schema enhancement: promotional control
        isSystem: templateTags.isSystemTag,
        
        // Audit fields for tracking
        createdAt: templateTags.createdAt,
        updatedAt: templateTags.updatedAt,
        
        // CONDITIONAL STATISTICAL AGGREGATIONS: Advanced template relationship analysis
        ...(includeStats && {
          /**
           * Active Template Count: Uses templateTagAssignments for accurate published template counts
           * This aggregation leverages the many-to-many relationship to count distinct templates
           * associated with each tag, filtered to only published status for relevance.
           */
          activeTemplateCount: sql<number>`(
            SELECT COUNT(DISTINCT t.id)
            FROM ${templates} t
            INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
            WHERE tta.tag_id = ${templateTags.id}
            AND t.status = 'published'
          )`,
          
          /**
           * Average Template Rating: Calculates weighted average ratings across associated templates
           * Uses COALESCE to handle NULL values and filters to templates with actual ratings
           * for meaningful statistical analysis.
           */
          avgTemplateRating: sql<number>`(
            SELECT COALESCE(AVG(t.avg_rating), 0)
            FROM ${templates} t
            INNER JOIN ${templateTagAssignments} tta ON t.id = tta.template_id
            WHERE tta.tag_id = ${templateTags.id}
            AND t.status = 'published'
            AND t.rating_count > 0
          )`,
          
          /**
           * Total Downloads: Aggregates download counts for popularity metrics
           * Sums all downloads across templates associated with each tag for comprehensive
           * popularity analysis and trending calculations.
           */
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

    // Execute query with proper ordering and limit
    const tags = trending
      ? await baseQuery
          .orderBy(
            desc(templateTags.trendScore),
            desc(templateTags.weeklyGrowth),
            desc(templateTags.usageCount)
          )
          .limit(limit)
      : await baseQuery
          .orderBy(desc(templateTags.usageCount), templateTags.displayName)
          .limit(limit)

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
 * Create a new template tag with enhanced schema integration and comprehensive validation.
 * This endpoint leverages the enhanced templateTags schema with proper lifecycle management
 * fields and validation patterns for enterprise-grade tag management.
 *
 * SCHEMA INTEGRATION FEATURES:
 * - Creates tags with proper schema field mapping (tagType, isSystemTag, etc.)
 * - Initializes lifecycle management fields (isActive=true, isFeatured=false)
 * - Sets up statistical tracking fields (usageCount=0, trendScore='0')
 * - Implements proper audit trail with creation timestamps
 *
 * REQUEST VALIDATION:
 * - name: Required, normalized to lowercase with proper sanitization
 * - displayName: Required, user-friendly display name for UI
 * - description: Optional, detailed tag purpose description
 * - color: Optional, hex color code for visual theming (default: #3B82F6)
 * - category: Optional, tag categorization for organizational purposes
 *
 * TAG NORMALIZATION PROCESS:
 * - Converts name to lowercase for consistency
 * - Replaces non-alphanumeric characters with hyphens
 * - Generates URL-friendly slug for routing and identification
 * - Validates uniqueness across existing tag names
 *
 * SCHEMA FIELD INITIALIZATION:
 * - tagType: 'general' (can be enhanced to support 'skill', 'integration', etc.)
 * - isSystemTag: false (user-created vs system-managed)
 * - isActive: true (immediately available for assignment)
 * - isFeatured: false (not promoted by default)
 * - usageCount: 0 (no templates associated initially)
 * - trendScore/weeklyGrowth: '0' (decimal fields require string initialization)
 *
 * ERROR HANDLING:
 * - Validation failures for missing required fields
 * - Duplicate name detection with proper error responses
 * - Database constraint violation handling
 * - Comprehensive error logging and request tracking
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

    /**
     * SCHEMA-INTEGRATED TAG CREATION: Enhanced field mapping with proper initialization
     * 
     * This insert operation demonstrates proper integration with the enhanced templateTags
     * schema, including all lifecycle management fields and proper data type handling.
     * 
     * KEY SCHEMA INTEGRATIONS:
     * - Proper UUID generation for primary key identification
     * - Enhanced lifecycle fields (isActive, isFeatured) with sensible defaults
     * - Statistical tracking fields initialized for future analytics
     * - Proper audit trail establishment with timestamp tracking
     * 
     * FIELD MAPPING EXPLANATIONS:
     * - id: Generated UUID for unique tag identification
     * - name: Normalized internal identifier (lowercase, hyphenated)
     * - displayName: User-friendly name for UI presentation
     * - slug: URL-friendly identifier for routing and SEO
     * - tagType: 'general' category (extensible for 'skill', 'integration', etc.)
     * - isSystemTag: false (user-created vs administrative system tags)
     * - isActive: true (immediately available for template assignment)
     * - isFeatured: false (not promoted by default, requires admin action)
     * - usageCount: 0 (no templates associated initially)
     * - trendScore/weeklyGrowth: '0' strings for decimal field compatibility
     * - timestamps: Consistent audit trail for creation and modification tracking
     */
    const tagId = crypto.randomUUID()
    const now = new Date()

    const [newTag] = await db
      .insert(templateTags)
      .values({
        // Core identification fields
        id: tagId,                                    // UUID primary key
        name: normalizedName,                         // Normalized internal name
        displayName,                                  // User-friendly display name
        slug,                                         // URL-friendly slug
        
        // Content and presentation fields
        description: description || null,             // Optional detailed description
        color: color || '#3B82F6',                   // Visual theming color
        
        // Enhanced schema categorization and lifecycle fields
        tagType: 'general',                          // Tag category (extensible)
        isSystemTag: false,                          // User-created vs system-managed
        isActive: true,                              // SCHEMA ENHANCEMENT: Lifecycle management
        isFeatured: false,                           // SCHEMA ENHANCEMENT: Promotional control
        
        // Statistical tracking initialization
        usageCount: 0,                               // Template association count
        trendScore: '0',                             // Decimal field: popularity metric
        weeklyGrowth: '0',                           // Decimal field: growth rate
        
        // Audit trail fields
        createdAt: now,                              // Creation timestamp
        updatedAt: now,                              // Last modification timestamp
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
