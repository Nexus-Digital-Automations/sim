/**
 * Template Tags Management API v2 - Dynamic tagging system
 *
 * Features:
 * - Hierarchical tag categorization (skill, integration, industry, use_case)
 * - Dynamic tag creation and management
 * - Tag usage analytics and trending
 * - Tag suggestion engine based on usage patterns
 * - Community-driven tag curation
 * - SEO optimization with tag-based content organization
 *
 * @version 2.0.0
 * @author Sim Template Library Team
 * @created 2025-09-04
 */

import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templates, templateTagAssociations, templateTags, user } from '@/db/schema'

const logger = createLogger('TemplateTagsAPI')

export const revalidate = 0

// ========================
// VALIDATION SCHEMAS
// ========================

const TagQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),

  // Filtering
  search: z.string().optional(), // Search tag names and descriptions
  tagType: z.enum(['skill', 'integration', 'industry', 'use_case', 'general']).optional(),
  isActive: z.coerce.boolean().optional().default(true),
  isFeatured: z.coerce.boolean().optional(),
  isSystemTag: z.coerce.boolean().optional(),
  minUsageCount: z.coerce.number().min(0).optional(),

  // Sorting
  sortBy: z
    .enum(['name', 'usageCount', 'trendScore', 'created', 'alphabetical'])
    .optional()
    .default('usageCount'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Response options
  includeUsageStats: z.coerce.boolean().optional().default(false),
  includeTemplateCount: z.coerce.boolean().optional().default(true),
  includeTrendData: z.coerce.boolean().optional().default(false),
})

const CreateTagSchema = z.object({
  // Core tag information
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional()
    .default('#6B7280'),

  // Tag categorization
  tagType: z.enum(['skill', 'integration', 'industry', 'use_case', 'general']).default('general'),
  displayName: z.string().max(100).optional(), // Alternative display name

  // Tag management
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
})

const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  tagType: z.enum(['skill', 'integration', 'industry', 'use_case', 'general']).optional(),
  displayName: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

const TagAssignmentSchema = z.object({
  templateIds: z.array(z.string().min(1)),
  tagIds: z.array(z.string().min(1)),
  operation: z.enum(['assign', 'unassign']).default('assign'),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Generate URL-friendly slug from tag name
 */
function generateTagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

/**
 * Calculate trend score based on recent usage patterns
 */
async function calculateTrendScore(tagId: string): Promise<number> {
  try {
    // Get usage over different time periods
    const periods = [
      { days: 7, weight: 0.5 },
      { days: 30, weight: 0.3 },
      { days: 90, weight: 0.2 },
    ]

    let trendScore = 0

    for (const period of periods) {
      const usageData = await db
        .select({ count: count(templateTagAssociations.templateId) })
        .from(templateTagAssociations)
        .innerJoin(templates, eq(templateTagAssociations.templateId, templates.id))
        .where(
          and(
            eq(templateTagAssociations.tagId, tagId),
            sql`${templates.createdAt} > NOW() - INTERVAL '${period.days} days'`
          )
        )

      const periodUsage = usageData[0]?.count || 0
      trendScore += periodUsage * period.weight
    }

    return Math.min(Math.round(trendScore * 100) / 100, 100)
  } catch (error) {
    logger.warn('Failed to calculate trend score', { tagId, error })
    return 0
  }
}

/**
 * Update tag usage statistics
 */
async function updateTagUsageStats(tagId: string) {
  try {
    // Get current usage count
    const usageData = await db
      .select({ count: count(templateTagAssociations.templateId) })
      .from(templateTagAssociations)
      .where(eq(templateTagAssociations.tagId, tagId))

    const usageCount = usageData[0]?.count || 0

    // Calculate trend score
    const trendScore = await calculateTrendScore(tagId)

    // Update tag with new statistics
    await db
      .update(templateTags)
      .set({
        usageCount,
        trendScore,
        updatedAt: new Date(),
      })
      .where(eq(templateTags.id, tagId))
  } catch (error) {
    logger.warn('Failed to update tag usage stats', { tagId, error })
  }
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/tags - Get comprehensive tag listing with analytics
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const params = TagQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.info(`[${requestId}] Fetching template tags with params:`, params)

    // Authentication - support both session and internal tokens
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

    if (params.isActive !== undefined) {
      conditions.push(eq(templateTags.isActive, params.isActive))
    }

    if (params.isFeatured !== undefined) {
      conditions.push(eq(templateTags.isFeatured, params.isFeatured))
    }

    if (params.isSystemTag !== undefined) {
      conditions.push(eq(templateTags.isSystemTag, params.isSystemTag))
    }

    if (params.tagType) {
      conditions.push(eq(templateTags.tagType, params.tagType))
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`
      conditions.push(
        or(
          ilike(templateTags.name, searchTerm),
          ilike(templateTags.description, searchTerm),
          ilike(templateTags.displayName, searchTerm)
        )
      )
    }

    if (params.minUsageCount !== undefined) {
      conditions.push(sql`${templateTags.usageCount} >= ${params.minUsageCount}`)
    }

    // Build sorting
    const getSortField = () => {
      switch (params.sortBy) {
        case 'name':
        case 'alphabetical':
          return templateTags.name
        case 'usageCount':
          return templateTags.usageCount
        case 'trendScore':
          return templateTags.trendScore
        case 'created':
          return templateTags.createdAt
        default:
          return templateTags.usageCount
      }
    }

    const sortField = getSortField()
    const orderBy = params.sortOrder === 'asc' ? sql`${sortField} ASC` : desc(sortField)

    // Calculate pagination
    const offset = (params.page - 1) * params.limit

    // Execute main query
    const query = db
      .select({
        id: templateTags.id,
        name: templateTags.name,
        slug: templateTags.slug,
        description: templateTags.description,
        color: templateTags.color,
        tagType: templateTags.tagType,
        displayName: templateTags.displayName,
        isActive: templateTags.isActive,
        isFeatured: templateTags.isFeatured,
        isSystemTag: templateTags.isSystemTag,
        usageCount: templateTags.usageCount,
        trendScore: templateTags.trendScore,
        weeklyGrowth: templateTags.weeklyGrowth,
        createdAt: templateTags.createdAt,
        updatedAt: templateTags.updatedAt,

        // Author info for user-created tags
        ...(params.includeUsageStats
          ? {
              createdByUserId: templateTags.createdByUserId,
              createdByUserName: user.name,
            }
          : {}),
      })
      .from(templateTags)

    // Add joins if needed
    if (params.includeUsageStats) {
      query.leftJoin(user, eq(templateTags.createdByUserId, user.id))
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined
    const results = await query
      .where(whereCondition)
      .orderBy(orderBy)
      .limit(params.limit)
      .offset(offset)

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(templateTags)
      .where(whereCondition)

    const totalCount = await countQuery
    const total = totalCount[0]?.count || 0

    // Add template counts if requested
    if (params.includeTemplateCount && results.length > 0) {
      const tagIds = results.map((tag) => tag.id)
      const templateCounts = await db
        .select({
          tagId: templateTagAssociations.tagId,
          activeTemplateCount: sql<number>`
            count(*) filter (where ${templates.status} = 'approved' and ${templates.visibility} = 'public')
          `,
          totalTemplateCount: sql<number>`count(*)`,
        })
        .from(templateTagAssociations)
        .innerJoin(templates, eq(templateTagAssociations.templateId, templates.id))
        .where(inArray(templateTagAssociations.tagId, tagIds))
        .groupBy(templateTagAssociations.tagId)

      const countsByTag = templateCounts.reduce(
        (acc, count) => {
          acc[count.tagId] = {
            activeTemplates: Number(count.activeTemplateCount),
            totalTemplates: Number(count.totalTemplateCount),
          }
          return acc
        },
        {} as Record<string, any>
      )

      // Add counts to results
      results.forEach((tag: any) => {
        tag.templateCounts = countsByTag[tag.id] || {
          activeTemplates: 0,
          totalTemplates: 0,
        }
      })
    }

    // Add trend data if requested
    if (params.includeTrendData && results.length > 0) {
      const tagIds = results.map((tag) => tag.id)

      // Get recent creation trends for each tag
      const trendData = await db
        .select({
          tagId: templateTagAssociations.tagId,
          recentUsage: sql<number>`
            count(*) filter (where ${templates.createdAt} > NOW() - INTERVAL '30 days')
          `,
          previousUsage: sql<number>`
            count(*) filter (where ${templates.createdAt} > NOW() - INTERVAL '60 days' 
                            and ${templates.createdAt} <= NOW() - INTERVAL '30 days')
          `,
        })
        .from(templateTagAssociations)
        .innerJoin(templates, eq(templateTagAssociations.templateId, templates.id))
        .where(inArray(templateTagAssociations.tagId, tagIds))
        .groupBy(templateTagAssociations.tagId)

      const trendsByTag = trendData.reduce(
        (acc, trend) => {
          const recentUsage = Number(trend.recentUsage)
          const previousUsage = Number(trend.previousUsage)
          const growthRate =
            previousUsage > 0
              ? ((recentUsage - previousUsage) / previousUsage) * 100
              : recentUsage > 0
                ? 100
                : 0

          acc[trend.tagId] = {
            recentUsage,
            previousUsage,
            growthRate: Math.round(growthRate),
            trending: growthRate > 20, // Trending if >20% growth
          }
          return acc
        },
        {} as Record<string, any>
      )

      // Add trend data to results
      results.forEach((tag: any) => {
        tag.trendData = trendsByTag[tag.id] || {
          recentUsage: 0,
          previousUsage: 0,
          growthRate: 0,
          trending: false,
        }
      })
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / params.limit)
    const hasNextPage = params.page < totalPages
    const hasPrevPage = params.page > 1

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Fetched ${results.length} tags in ${elapsed}ms`)

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

    logger.error(`[${requestId}] Tags fetch error after ${elapsed}ms:`, error)
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
 * POST /api/templates/v2/tags - Create new template tag
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const data = CreateTagSchema.parse(body)

    logger.info(`[${requestId}] Creating tag:`, { name: data.name, tagType: data.tagType })

    // Generate slug and check for uniqueness
    const slug = generateTagSlug(data.name)

    const existingTag = await db
      .select({ id: templateTags.id, name: templateTags.name })
      .from(templateTags)
      .where(or(eq(templateTags.slug, slug), eq(templateTags.name, data.name)))
      .limit(1)

    if (existingTag.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tag with this name already exists',
          details: { existingName: existingTag[0].name },
          suggestion: `${data.name}-${Math.floor(Math.random() * 1000)}`,
        },
        { status: 409 }
      )
    }

    // Create tag
    const tagId = uuidv4()
    const now = new Date()

    const newTag = await db
      .insert(templateTags)
      .values({
        id: tagId,
        name: data.name,
        slug,
        description: data.description,
        color: data.color,
        tagType: data.tagType,
        displayName: data.displayName,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        isSystemTag: false, // User-created tags are never system tags
        usageCount: 0,
        trendScore: 0,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Tag created successfully: ${tagId} in ${elapsed}ms`)

    return NextResponse.json(
      {
        success: true,
        data: {
          id: tagId,
          name: data.name,
          slug,
          tagType: data.tagType,
          color: data.color,
          isActive: data.isActive,
          message: 'Tag created successfully',
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
      logger.warn(`[${requestId}] Invalid tag data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tag data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Tag creation error after ${elapsed}ms:`, error)
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
