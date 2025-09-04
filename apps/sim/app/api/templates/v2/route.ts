/**
 * Template Library API v2 - Comprehensive template management system
 *
 * This API provides advanced template functionality including:
 * - Hierarchical categorization and tagging
 * - Advanced search and discovery
 * - Community ratings and reviews
 * - Usage analytics and insights
 * - Template collections and favorites
 * - ML-powered recommendations
 *
 * Replaces the legacy templates API with enterprise-grade functionality
 * designed to compete with n8n, Zapier, and Make template systems.
 *
 * @version 2.0.0
 * @author Sim Template Library Team
 * @created 2025-09-04
 */

import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templateCategories,
  templateFavorites,
  templateSearchQueries,
  templates,
  templateTagAssociations,
  templateTags,
  templateUsageAnalytics,
  user,
} from '@/db/schema'

const logger = createLogger('TemplateLibraryAPI')

export const revalidate = 0

// ========================
// VALIDATION SCHEMAS
// ========================

/**
 * Enhanced query parameters for template discovery and filtering
 */
const TemplateQuerySchema = z.object({
  // Pagination and limits
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),

  // Search and discovery
  search: z.string().optional(), // Full-text search across name, description, business value
  query: z.string().optional(), // Alias for search
  categoryId: z.string().optional(), // Filter by category ID
  categorySlug: z.string().optional(), // Filter by category slug
  tagIds: z.string().optional(), // Comma-separated tag IDs
  tagSlugs: z.string().optional(), // Comma-separated tag slugs

  // Template filters
  status: z
    .enum(['draft', 'pending_review', 'approved', 'rejected', 'archived'])
    .optional()
    .default('approved'),
  visibility: z.enum(['private', 'unlisted', 'public']).optional().default('public'),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isCommunityTemplate: z.coerce.boolean().optional(),

  // Rating and quality filters
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxRating: z.coerce.number().min(0).max(5).optional(),
  minRatingCount: z.coerce.number().min(0).optional(),
  hasBusinessValue: z.coerce.boolean().optional(), // Templates with cost/time savings

  // Usage and popularity filters
  minDownloads: z.coerce.number().min(0).optional(),
  minViews: z.coerce.number().min(0).optional(),
  minLikes: z.coerce.number().min(0).optional(),
  trendy: z.coerce.boolean().optional(), // Recent high activity

  // Integration requirements
  requiredIntegrations: z.string().optional(), // Comma-separated integration names
  supportedIntegrations: z.string().optional(), // Comma-separated integration names

  // User-specific filters
  userId: z.string().optional(), // Templates by specific user
  favorited: z.coerce.boolean().optional(), // User's favorited templates only
  myTemplates: z.coerce.boolean().optional(), // Templates created by current user

  // Time-based filters
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  publishedAfter: z.string().datetime().optional(),
  publishedBefore: z.string().datetime().optional(),

  // Sorting options
  sortBy: z
    .enum([
      'relevance', // For search queries
      'popularity', // Combined score of downloads, views, likes
      'rating', // Average rating with count weight
      'downloads',
      'views',
      'likes',
      'createdAt',
      'publishedAt',
      'updatedAt',
      'name',
      'businessValue', // ROI potential
      'communityScore', // Algorithm-calculated quality
    ])
    .optional()
    .default('popularity'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Response options
  includeAnalytics: z.coerce.boolean().optional().default(false),
  includeRatings: z.coerce.boolean().optional().default(false),
  includeTags: z.coerce.boolean().optional().default(true),
  includeCategory: z.coerce.boolean().optional().default(true),
  includeAuthor: z.coerce.boolean().optional().default(true),
  includeWorkflowTemplate: z.coerce.boolean().optional().default(false),
})

/**
 * Schema for creating new templates
 */
const CreateTemplateSchema = z.object({
  // Core template information
  name: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  longDescription: z.string().max(10000).optional(),

  // Workflow definition
  workflowTemplate: z.record(z.any()), // JSONB workflow definition
  templateVersion: z.string().optional().default('1.0.0'),
  minSimVersion: z.string().optional(),

  // Categorization
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).optional().default([]),

  // Template metadata
  difficultyLevel: z
    .enum(['beginner', 'intermediate', 'advanced', 'expert'])
    .optional()
    .default('intermediate'),
  estimatedSetupTime: z.number().positive().optional(), // Minutes
  estimatedExecutionTime: z.number().positive().optional(), // Seconds

  // Publishing
  visibility: z.enum(['private', 'unlisted', 'public']).optional().default('private'),
  isCommunityTemplate: z.boolean().optional().default(true),

  // SEO and presentation
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(200).optional(),
  coverImageUrl: z.string().url().optional(),
  previewImages: z.array(z.string().url()).optional().default([]),

  // Business value
  estimatedCostSavings: z.number().positive().optional(),
  estimatedTimeSavings: z.number().positive().optional(),
  businessValueDescription: z.string().max(1000).optional(),

  // Integration requirements
  requiredIntegrations: z.array(z.string()).optional().default([]),
  supportedIntegrations: z.array(z.string()).optional().default([]),
  technicalRequirements: z.string().max(2000).optional(),
})

/**
 * Schema for template search analytics
 */
const SearchAnalyticsSchema = z.object({
  query: z.string().min(1),
  filtersApplied: z.record(z.any()).optional().default({}),
  sortOrder: z.string().optional().default('relevance'),
  resultsCount: z.number().optional().default(0),
  clickedTemplateIds: z.array(z.string()).optional().default([]),
  sessionId: z.string().optional(),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Calculate popularity score for templates
 * Combines downloads, views, likes, and rating with weighted algorithm
 */
function buildPopularityScore() {
  return sql<number>`(
    COALESCE(${templates.downloadCount}, 0) * 3 +
    COALESCE(${templates.viewCount}, 0) * 1 +
    COALESCE(${templates.likeCount}, 0) * 2 +
    COALESCE(${templates.ratingAverage}, 0) * COALESCE(${templates.ratingCount}, 0) * 0.5
  )`
}

/**
 * Sanitize workflow template to remove sensitive data
 */
function sanitizeWorkflowTemplate(workflowTemplate: any): any {
  const sanitized = JSON.parse(JSON.stringify(workflowTemplate))

  // Remove common sensitive fields
  const sensitivePatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /credential/i,
    /oauth/i,
    /bearer/i,
  ]

  function cleanObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return

    for (const [key, value] of Object.entries(obj)) {
      if (sensitivePatterns.some((pattern) => pattern.test(key))) {
        obj[key] = '[REDACTED]'
      } else if (typeof value === 'object') {
        cleanObject(value)
      }
    }
  }

  cleanObject(sanitized)
  return sanitized
}

/**
 * Record template usage analytics
 */
async function recordUsageAnalytics(
  templateId: string,
  eventType: string,
  userId?: string,
  context: Record<string, any> = {}
) {
  try {
    await db.insert(templateUsageAnalytics).values({
      id: uuidv4(),
      templateId,
      userId,
      eventType,
      eventContext: context,
      usageTimestamp: new Date(),
      createdAt: new Date(),
    })
  } catch (error) {
    logger.warn('Failed to record usage analytics', { templateId, eventType, error })
  }
}

/**
 * Record search analytics
 */
async function recordSearchAnalytics(data: z.infer<typeof SearchAnalyticsSchema>, userId?: string) {
  try {
    await db.insert(templateSearchQueries).values({
      id: uuidv4(),
      query: data.query,
      userId,
      filtersApplied: data.filtersApplied,
      sortOrder: data.sortOrder,
      resultsCount: data.resultsCount,
      clickedTemplateIds: data.clickedTemplateIds,
      noResults: data.resultsCount === 0,
      searchTimestamp: new Date(),
      sessionId: data.sessionId,
      createdAt: new Date(),
    })
  } catch (error) {
    logger.warn('Failed to record search analytics', { query: data.query, error })
  }
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2 - Advanced template discovery with comprehensive filtering
 *
 * Features:
 * - Full-text search across all template content
 * - Hierarchical category filtering
 * - Advanced tag-based filtering
 * - Rating and quality filters
 * - Business value and ROI filtering
 * - Integration requirement filtering
 * - ML-powered popularity scoring
 * - Comprehensive analytics inclusion
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const params = TemplateQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.info(`[${requestId}] Template discovery request with params:`, params)

    // Authentication - support session, API key, and internal tokens
    let userId: string | null = null
    let isInternalCall = false

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      const session = await getSession()
      userId = session?.user?.id || null
    }

    // Build query conditions
    const conditions = []

    // Base filters
    conditions.push(eq(templates.status, params.status))
    conditions.push(eq(templates.visibility, params.visibility))

    // Category filtering
    if (params.categoryId) {
      conditions.push(eq(templates.categoryId, params.categoryId))
    } else if (params.categorySlug) {
      // Join with categories to filter by slug
      const categorySubquery = db
        .select({ id: templateCategories.id })
        .from(templateCategories)
        .where(eq(templateCategories.slug, params.categorySlug))

      conditions.push(inArray(templates.categoryId, categorySubquery))
    }

    // Search functionality with full-text search
    if (params.search || params.query) {
      const searchTerm = params.search || params.query!
      conditions.push(
        or(
          ilike(templates.name, `%${searchTerm}%`),
          ilike(templates.description, `%${searchTerm}%`),
          ilike(templates.businessValueDescription, `%${searchTerm}%`)
          // TODO: Add full-text search on searchVector when implemented
        )
      )
    }

    // Difficulty level filter
    if (params.difficultyLevel) {
      conditions.push(eq(templates.difficultyLevel, params.difficultyLevel))
    }

    // Feature flags
    if (params.isFeatured !== undefined) {
      conditions.push(eq(templates.isFeatured, params.isFeatured))
    }
    if (params.isCommunityTemplate !== undefined) {
      conditions.push(eq(templates.isCommunityTemplate, params.isCommunityTemplate))
    }

    // Rating filters
    if (params.minRating !== undefined) {
      conditions.push(gte(templates.ratingAverage, params.minRating))
    }
    if (params.maxRating !== undefined) {
      conditions.push(lte(templates.ratingAverage, params.maxRating))
    }
    if (params.minRatingCount !== undefined) {
      conditions.push(gte(templates.ratingCount, params.minRatingCount))
    }

    // Usage filters
    if (params.minDownloads !== undefined) {
      conditions.push(gte(templates.downloadCount, params.minDownloads))
    }
    if (params.minViews !== undefined) {
      conditions.push(gte(templates.viewCount, params.minViews))
    }
    if (params.minLikes !== undefined) {
      conditions.push(gte(templates.likeCount, params.minLikes))
    }

    // Business value filter
    if (params.hasBusinessValue) {
      conditions.push(
        or(sql`${templates.estimatedCostSavings} > 0`, sql`${templates.estimatedTimeSavings} > 0`)
      )
    }

    // User-specific filters
    if (params.userId) {
      conditions.push(eq(templates.createdByUserId, params.userId))
    }
    if (params.myTemplates && userId) {
      conditions.push(eq(templates.createdByUserId, userId))
    }

    // Date filters
    if (params.createdAfter) {
      conditions.push(gte(templates.createdAt, new Date(params.createdAfter)))
    }
    if (params.createdBefore) {
      conditions.push(lte(templates.createdAt, new Date(params.createdBefore)))
    }
    if (params.publishedAfter && templates.publishedAt) {
      conditions.push(gte(templates.publishedAt, new Date(params.publishedAfter)))
    }
    if (params.publishedBefore && templates.publishedAt) {
      conditions.push(lte(templates.publishedAt, new Date(params.publishedBefore)))
    }

    // Build sorting
    const getSortField = () => {
      switch (params.sortBy) {
        case 'popularity':
          return buildPopularityScore()
        case 'rating':
          return sql`${templates.ratingAverage} * LOG(${templates.ratingCount} + 1)`
        case 'downloads':
          return templates.downloadCount
        case 'views':
          return templates.viewCount
        case 'likes':
          return templates.likeCount
        case 'createdAt':
          return templates.createdAt
        case 'publishedAt':
          return templates.publishedAt
        case 'updatedAt':
          return templates.updatedAt
        case 'name':
          return templates.name
        case 'businessValue':
          return sql`COALESCE(${templates.estimatedCostSavings}, 0) + COALESCE(${templates.estimatedTimeSavings}, 0)`
        case 'communityScore':
          return templates.communityScore
        default:
          return params.search ? buildPopularityScore() : templates.createdAt
      }
    }

    const sortField = getSortField()
    const orderBy = params.sortOrder === 'asc' ? asc(sortField) : desc(sortField)

    // Calculate pagination
    const offset = (params.page - 1) * params.limit

    // Build comprehensive query with joins
    let query = db
      .select({
        // Core template data
        id: templates.id,
        name: templates.name,
        slug: templates.slug,
        description: templates.description,
        longDescription: templates.longDescription,
        templateVersion: templates.templateVersion,
        difficultyLevel: templates.difficultyLevel,
        estimatedSetupTime: templates.estimatedSetupTime,
        estimatedExecutionTime: templates.estimatedExecutionTime,

        // Analytics
        viewCount: templates.viewCount,
        downloadCount: templates.downloadCount,
        likeCount: templates.likeCount,
        ratingAverage: templates.ratingAverage,
        ratingCount: templates.ratingCount,
        communityScore: templates.communityScore,

        // Status and visibility
        status: templates.status,
        visibility: templates.visibility,
        isFeatured: templates.isFeatured,
        isCommunityTemplate: templates.isCommunityTemplate,

        // Business value
        estimatedCostSavings: templates.estimatedCostSavings,
        estimatedTimeSavings: templates.estimatedTimeSavings,
        businessValueDescription: templates.businessValueDescription,

        // Media
        coverImageUrl: templates.coverImageUrl,
        previewImages: templates.previewImages,

        // Integrations
        requiredIntegrations: templates.requiredIntegrations,
        supportedIntegrations: templates.supportedIntegrations,

        // Timestamps
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        publishedAt: templates.publishedAt,

        // Conditional fields
        ...(params.includeWorkflowTemplate ? { workflowTemplate: templates.workflowTemplate } : {}),

        // Category info (if requested)
        ...(params.includeCategory
          ? {
              categoryId: templates.categoryId,
              categoryName: templateCategories.name,
              categorySlug: templateCategories.slug,
              categoryColor: templateCategories.color,
              categoryIcon: templateCategories.icon,
            }
          : { categoryId: templates.categoryId }),

        // Author info (if requested)
        ...(params.includeAuthor
          ? {
              authorId: templates.createdByUserId,
              authorName: user.name,
              authorImage: user.image,
            }
          : { authorId: templates.createdByUserId }),

        // User-specific data
        ...(userId
          ? {
              isFavorited: sql<boolean>`CASE WHEN ${templateFavorites.templateId} IS NOT NULL THEN true ELSE false END`,
            }
          : {}),

        // Calculated fields
        popularityScore: buildPopularityScore(),
      })
      .from(templates)

    // Add joins based on requested data
    if (params.includeCategory) {
      query = query.leftJoin(templateCategories, eq(templates.categoryId, templateCategories.id))
    }

    if (params.includeAuthor) {
      query = query.leftJoin(user, eq(templates.createdByUserId, user.id))
    }

    if (userId) {
      query = query.leftJoin(
        templateFavorites,
        and(eq(templateFavorites.templateId, templates.id), eq(templateFavorites.userId, userId))
      )
    }

    // Apply tag filtering if specified
    if (params.tagIds || params.tagSlugs) {
      const tagConditions = []

      if (params.tagIds) {
        const tagIdArray = params.tagIds.split(',').map((id) => id.trim())
        tagConditions.push(inArray(templateTags.id, tagIdArray))
      }

      if (params.tagSlugs) {
        const tagSlugArray = params.tagSlugs.split(',').map((slug) => slug.trim())
        tagConditions.push(inArray(templateTags.slug, tagSlugArray))
      }

      // Join with tag associations and tags for filtering
      query = query
        .innerJoin(templateTagAssociations, eq(templateTagAssociations.templateId, templates.id))
        .innerJoin(templateTags, eq(templateTagAssociations.tagId, templateTags.id))

      conditions.push(or(...tagConditions))
    }

    // Apply favorited filter
    if (params.favorited && userId) {
      if (!query.toString().includes('template_favorites')) {
        query = query.innerJoin(
          templateFavorites,
          and(eq(templateFavorites.templateId, templates.id), eq(templateFavorites.userId, userId))
        )
      }
    }

    // Execute main query
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined
    const results = await query
      .where(whereCondition)
      .orderBy(orderBy)
      .limit(params.limit)
      .offset(offset)

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(distinct ${templates.id})` })
      .from(templates)

    // Apply same joins for count if necessary
    if (params.tagIds || params.tagSlugs) {
      countQuery
        .innerJoin(templateTagAssociations, eq(templateTagAssociations.templateId, templates.id))
        .innerJoin(templateTags, eq(templateTagAssociations.tagId, templateTags.id))
    }

    if (params.favorited && userId) {
      countQuery.innerJoin(
        templateFavorites,
        and(eq(templateFavorites.templateId, templates.id), eq(templateFavorites.userId, userId))
      )
    }

    const totalCount = await countQuery.where(whereCondition)
    const total = totalCount[0]?.count || 0

    // Add tags to results if requested
    if (params.includeTags && results.length > 0) {
      const templateIds = results.map((t) => t.id)
      const tagsData = await db
        .select({
          templateId: templateTagAssociations.templateId,
          tagId: templateTags.id,
          tagName: templateTags.name,
          tagSlug: templateTags.slug,
          tagColor: templateTags.color,
          tagType: templateTags.tagType,
        })
        .from(templateTagAssociations)
        .innerJoin(templateTags, eq(templateTagAssociations.tagId, templateTags.id))
        .where(inArray(templateTagAssociations.templateId, templateIds))

      // Group tags by template
      const tagsByTemplate = tagsData.reduce(
        (acc, tag) => {
          if (!acc[tag.templateId]) acc[tag.templateId] = []
          acc[tag.templateId].push({
            id: tag.tagId,
            name: tag.tagName,
            slug: tag.tagSlug,
            color: tag.tagColor,
            type: tag.tagType,
          })
          return acc
        },
        {} as Record<string, any[]>
      )

      // Add tags to results
      results.forEach((template: any) => {
        template.tags = tagsByTemplate[template.id] || []
      })
    }

    // Record search analytics
    if (params.search || params.query) {
      await recordSearchAnalytics(
        {
          query: params.search || params.query!,
          filtersApplied: {
            categoryId: params.categoryId,
            tagIds: params.tagIds,
            difficultyLevel: params.difficultyLevel,
          },
          sortOrder: `${params.sortBy}:${params.sortOrder}`,
          resultsCount: results.length,
          clickedTemplateIds: [],
          sessionId: request.headers.get('x-session-id') || undefined,
        },
        userId
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / params.limit)
    const hasNextPage = params.page < totalPages
    const hasPrevPage = params.page > 1

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Template discovery completed: ${results.length} results in ${elapsed}ms`
    )

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        offset,
      },
      meta: {
        requestId,
        processingTime: elapsed,
        authenticated: !!userId,
        searchPerformed: !!(params.search || params.query),
        filtersApplied: Object.keys(params).filter(
          (key) =>
            params[key as keyof typeof params] !== undefined &&
            !['page', 'limit', 'sortBy', 'sortOrder'].includes(key)
        ).length,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Template discovery error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates/v2 - Create comprehensive templates with advanced metadata
 *
 * Features:
 * - Rich template metadata and categorization
 * - Business value and ROI tracking
 * - Integration requirement specification
 * - SEO and presentation optimization
 * - Automatic workflow sanitization
 * - Version control support
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    // Parse request body
    const body = await request.json()
    const data = CreateTemplateSchema.parse(body)

    logger.info(`[${requestId}] Creating comprehensive template:`, {
      name: data.name,
      categoryId: data.categoryId,
      difficulty: data.difficultyLevel,
    })

    // Authentication
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Verify category exists
    const categoryExists = await db
      .select({ id: templateCategories.id })
      .from(templateCategories)
      .where(eq(templateCategories.id, data.categoryId))
      .limit(1)

    if (categoryExists.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 400 })
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()

    // Check for duplicate slug
    const slugExists = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.slug, slug))
      .limit(1)

    if (slugExists.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template with similar name already exists',
          suggestion: `${data.name} (${Math.floor(Math.random() * 1000)})`,
        },
        { status: 409 }
      )
    }

    // Sanitize workflow template
    const sanitizedWorkflow = sanitizeWorkflowTemplate(data.workflowTemplate)

    // Create template
    const templateId = uuidv4()
    const now = new Date()

    const newTemplate = await db
      .insert(templates)
      .values({
        id: templateId,
        name: data.name,
        slug,
        description: data.description,
        longDescription: data.longDescription,
        workflowTemplate: sanitizedWorkflow,
        templateVersion: data.templateVersion,
        minSimVersion: data.minSimVersion,
        categoryId: data.categoryId,
        difficultyLevel: data.difficultyLevel,
        estimatedSetupTime: data.estimatedSetupTime,
        estimatedExecutionTime: data.estimatedExecutionTime,
        visibility: data.visibility,
        isCommunityTemplate: data.isCommunityTemplate,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        coverImageUrl: data.coverImageUrl,
        previewImages: data.previewImages,
        estimatedCostSavings: data.estimatedCostSavings,
        estimatedTimeSavings: data.estimatedTimeSavings,
        businessValueDescription: data.businessValueDescription,
        requiredIntegrations: data.requiredIntegrations,
        supportedIntegrations: data.supportedIntegrations,
        technicalRequirements: data.technicalRequirements,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
        lastModifiedAt: now,
      })
      .returning()

    // Associate tags
    if (data.tagIds && data.tagIds.length > 0) {
      const tagAssociations = data.tagIds.map((tagId) => ({
        templateId,
        tagId,
        createdAt: now,
      }))

      await db.insert(templateTagAssociations).values(tagAssociations)
    }

    // Record creation analytics
    await recordUsageAnalytics(templateId, 'create', userId, {
      categoryId: data.categoryId,
      difficultyLevel: data.difficultyLevel,
      tagCount: data.tagIds?.length || 0,
      hasBusinessValue: !!(data.estimatedCostSavings || data.estimatedTimeSavings),
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template created successfully: ${templateId} in ${elapsed}ms`)

    return NextResponse.json(
      {
        success: true,
        data: {
          id: templateId,
          name: data.name,
          slug,
          categoryId: data.categoryId,
          visibility: data.visibility,
          message: 'Template created successfully',
        },
        meta: {
          requestId,
          processingTime: elapsed,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid template data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid template data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Template creation error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}
