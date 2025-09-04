import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  apiKey as apiKeyTable,
  templateStars,
  legacyTemplates as templates,
  workflow,
} from '@/db/schema'

const logger = createLogger('TemplatesAPI')

export const revalidate = 0

// Function to sanitize sensitive data from workflow state
function sanitizeWorkflowState(state: any): any {
  const sanitizedState = JSON.parse(JSON.stringify(state)) // Deep clone

  if (sanitizedState.blocks) {
    Object.values(sanitizedState.blocks).forEach((block: any) => {
      if (block.subBlocks) {
        Object.entries(block.subBlocks).forEach(([key, subBlock]: [string, any]) => {
          // Clear OAuth credentials and API keys using regex patterns
          if (
            /credential|oauth|api[_-]?key|token|secret|auth|password|bearer/i.test(key) ||
            /credential|oauth|api[_-]?key|token|secret|auth|password|bearer/i.test(
              subBlock.type || ''
            ) ||
            /credential|oauth|api[_-]?key|token|secret|auth|password|bearer/i.test(
              subBlock.value || ''
            )
          ) {
            subBlock.value = ''
          }
        })
      }

      // Also clear from data field if present
      if (block.data) {
        Object.entries(block.data).forEach(([key, value]: [string, any]) => {
          if (/credential|oauth|api[_-]?key|token|secret|auth|password|bearer/i.test(key)) {
            block.data[key] = ''
          }
        })
      }
    })
  }

  return sanitizedState
}

// Enhanced schema for creating templates with comprehensive metadata
const CreateTemplateSchema = z.object({
  // Required fields
  workflowId: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters'),
  author: z
    .string()
    .min(1, 'Author is required')
    .max(100, 'Author must be less than 100 characters'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters'),

  // Visual and branding
  icon: z.string().min(1, 'Icon is required').max(50, 'Icon name must be less than 50 characters'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color (e.g., #3972F6)'),

  // Template state
  state: z.object({
    blocks: z.record(z.any()),
    edges: z.array(z.any()),
    loops: z.record(z.any()).optional(),
    parallels: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  }),

  // Optional enhanced metadata
  tags: z.array(z.string()).optional().default([]), // Template tags for improved discoverability
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  estimatedTime: z.string().optional(), // e.g., "5 minutes", "1 hour"
  requirements: z.array(z.string()).optional().default([]), // Prerequisites or requirements
  useCases: z.array(z.string()).optional().default([]), // Common use cases
  version: z.string().optional().default('1.0.0'), // Template version

  // Visibility and sharing
  isPublic: z.boolean().optional().default(true), // Whether template is publicly visible
  allowComments: z.boolean().optional().default(true), // Whether to allow reviews/comments

  // Creation options
  sanitizeCredentials: z.boolean().optional().default(true), // Whether to sanitize credentials (default: true)
  preserveMetadata: z.boolean().optional().default(false), // Whether to preserve workflow metadata
})

// Enhanced schema for comprehensive query parameters
const QueryParamsSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),

  // Basic filters
  category: z.string().optional(),
  search: z.string().optional(), // Search in name, description, and author
  workflowId: z.string().optional(),

  // Advanced filters
  userId: z.string().optional(), // Filter by template author
  minStars: z.coerce.number().min(0).optional(), // Minimum star rating
  maxStars: z.coerce.number().min(0).optional(), // Maximum star rating
  minViews: z.coerce.number().min(0).optional(), // Minimum view count
  isStarred: z.coerce.boolean().optional(), // Show only starred templates
  tags: z.string().optional(), // Comma-separated tags (stored in template metadata)

  // Date filters
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),

  // Sorting options
  sortBy: z
    .enum([
      'name',
      'createdAt',
      'updatedAt',
      'views',
      'stars',
      'author',
      'category',
      'relevance', // For search queries
    ])
    .optional()
    .default('views'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Response options
  includeStats: z.coerce.boolean().optional().default(false), // Include usage statistics
  includeState: z.coerce.boolean().optional().default(false), // Include workflow state
  includeSensitive: z.coerce.boolean().optional().default(false), // Include sensitive data (admin only)
})

// GET /api/templates - Comprehensive template listing with advanced filtering, sorting, and analytics
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  // Parse query parameters outside try block for error handling access
  const { searchParams } = new URL(request.url)
  const queryParams = Object.fromEntries(searchParams.entries())

  try {
    const params = QueryParamsSchema.parse(queryParams)

    logger.info(`[${requestId}] Fetching templates with comprehensive filters:`, params)

    // Authentication - support both session and API key
    let userId: string | null = null
    let isInternalCall = false

    // Check for internal JWT token for server-side calls
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      // Try session auth first (for web UI)
      const session = await getSession()
      let authenticatedUserId: string | null = session?.user?.id || null

      // If no session, check for API key auth
      if (!authenticatedUserId) {
        const apiKeyHeader = request.headers.get('x-api-key')
        if (apiKeyHeader) {
          const [apiKeyRecord] = await db
            .select({ userId: apiKeyTable.userId })
            .from(apiKeyTable)
            .where(eq(apiKeyTable.key, apiKeyHeader))
            .limit(1)

          if (apiKeyRecord) {
            authenticatedUserId = apiKeyRecord.userId
          }
        }
      }

      if (!authenticatedUserId) {
        logger.warn(`[${requestId}] Unauthorized templates access attempt`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    // Build comprehensive query conditions
    const conditions = []

    // Apply category filter
    if (params.category) {
      conditions.push(eq(templates.category, params.category))
    }

    // Apply enhanced search filter (name, description, author)
    if (params.search) {
      const searchTerm = `%${params.search}%`
      conditions.push(
        or(
          ilike(templates.name, searchTerm),
          ilike(templates.description, searchTerm),
          ilike(templates.author, searchTerm)
        )
      )
    }

    // Apply workflow filter (for getting template by workflow)
    if (params.workflowId) {
      conditions.push(eq(templates.workflowId, params.workflowId))
    }

    // Apply user filter (templates by specific author)
    if (params.userId) {
      conditions.push(eq(templates.userId, params.userId))
    }

    // Apply star rating filters
    if (params.minStars !== undefined) {
      conditions.push(sql`${templates.stars} >= ${params.minStars}`)
    }
    if (params.maxStars !== undefined) {
      conditions.push(sql`${templates.stars} <= ${params.maxStars}`)
    }

    // Apply view count filter
    if (params.minViews !== undefined) {
      conditions.push(sql`${templates.views} >= ${params.minViews}`)
    }

    // Apply date range filters
    if (params.createdAfter) {
      conditions.push(sql`${templates.createdAt} >= ${params.createdAfter}`)
    }
    if (params.createdBefore) {
      conditions.push(sql`${templates.createdAt} <= ${params.createdBefore}`)
    }
    if (params.updatedAfter) {
      conditions.push(sql`${templates.updatedAt} >= ${params.updatedAfter}`)
    }
    if (params.updatedBefore) {
      conditions.push(sql`${templates.updatedAt} <= ${params.updatedBefore}`)
    }

    // Apply starred filter (show only user's starred templates)
    if (params.isStarred && userId) {
      // This will be handled in the join condition
    }

    // Combine conditions
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined

    // Build comprehensive sorting
    const getSortField = (sortBy: string) => {
      switch (sortBy) {
        case 'name':
          return templates.name
        case 'createdAt':
          return templates.createdAt
        case 'updatedAt':
          return templates.updatedAt
        case 'views':
          return templates.views
        case 'stars':
          return templates.stars
        case 'author':
          return templates.author
        case 'category':
          return templates.category
        case 'relevance':
          return params.search ? templates.views : templates.createdAt // Fallback for relevance
        default:
          return templates.views
      }
    }

    const sortField = getSortField(params.sortBy)
    const orderBy = params.sortOrder === 'asc' ? asc(sortField) : desc(sortField)

    // Calculate pagination
    const offset = (params.page - 1) * params.limit

    // Build the main query with comprehensive data
    const baseQuery = userId
      ? db
          .select({
            // Core template data
            id: templates.id,
            workflowId: templates.workflowId,
            userId: templates.userId,
            name: templates.name,
            description: templates.description,
            author: templates.author,
            views: templates.views,
            stars: templates.stars,
            color: templates.color,
            icon: templates.icon,
            category: templates.category,
            createdAt: templates.createdAt,
            updatedAt: templates.updatedAt,

            // Conditional fields based on query parameters
            ...(params.includeState ? { state: templates.state } : {}),

            // User-specific data (when authenticated)
            isStarred: sql<boolean>`CASE WHEN ${templateStars.id} IS NOT NULL THEN true ELSE false END`,
          })
          .from(templates)
          .leftJoin(
            templateStars,
            and(eq(templateStars.templateId, templates.id), eq(templateStars.userId, userId))
          )
      : db
          .select({
            // Core template data
            id: templates.id,
            workflowId: templates.workflowId,
            userId: templates.userId,
            name: templates.name,
            description: templates.description,
            author: templates.author,
            views: templates.views,
            stars: templates.stars,
            color: templates.color,
            icon: templates.icon,
            category: templates.category,
            createdAt: templates.createdAt,
            updatedAt: templates.updatedAt,

            // Conditional fields based on query parameters
            ...(params.includeState ? { state: templates.state } : {}),

            // User-specific data (when not authenticated)
            isStarred: sql<boolean>`false`,
          })
          .from(templates)

    // Apply starred filter after join setup
    const starredCondition =
      params.isStarred && userId ? sql`${templateStars.id} IS NOT NULL` : undefined

    const finalWhereCondition = starredCondition
      ? whereCondition
        ? and(whereCondition, starredCondition)
        : starredCondition
      : whereCondition

    // Execute the main query
    const results = await baseQuery
      .where(finalWhereCondition)
      .orderBy(orderBy)
      .limit(params.limit)
      .offset(offset)

    // Get total count for pagination (with the same conditions)
    const countQuery =
      userId && params.isStarred
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(templates)
            .leftJoin(
              templateStars,
              and(eq(templateStars.templateId, templates.id), eq(templateStars.userId, userId))
            )
        : db.select({ count: sql<number>`count(*)` }).from(templates)

    const totalCount = await countQuery.where(finalWhereCondition)
    const total = totalCount[0]?.count || 0

    // Get category statistics if requested
    let categoryStats = null
    if (params.includeStats) {
      const categoryStatsQuery = await db
        .select({
          category: templates.category,
          count: sql<number>`count(*)`,
          avgStars: sql<number>`avg(${templates.stars})`,
          totalViews: sql<number>`sum(${templates.views})`,
        })
        .from(templates)
        .where(whereCondition) // Use the base conditions without starred filter
        .groupBy(templates.category)
        .orderBy(sql`count(*) DESC`)
        .limit(10)

      categoryStats = categoryStatsQuery.map((stat) => ({
        category: stat.category,
        templateCount: stat.count,
        averageStars: Math.round((stat.avgStars || 0) * 10) / 10,
        totalViews: stat.totalViews || 0,
      }))
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / params.limit)
    const hasNextPage = params.page < totalPages
    const hasPrevPage = params.page > 1

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully retrieved ${results.length} templates in ${elapsed}ms`)

    return NextResponse.json({
      data: results,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        offset: (params.page - 1) * params.limit,
      },
      filters: {
        ...params,
        // Clean up default values for response
        page: params.page === 1 ? undefined : params.page,
        limit: params.limit === 20 ? undefined : params.limit,
        sortBy: params.sortBy === 'views' ? undefined : params.sortBy,
        sortOrder: params.sortOrder === 'desc' ? undefined : params.sortOrder,
      },
      ...(categoryStats && { categoryStats }),
      meta: {
        requestId,
        processingTime: elapsed,
        isAuthenticated: !!userId,
        totalCategories: categoryStats?.length || 0,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters after ${elapsed}ms`, {
        errors: error.errors,
        queryParams,
      })
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error fetching templates after ${elapsed}ms`, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create a comprehensive template with enhanced metadata
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  // Parse request body outside try block for error handling access
  let body: any = {}
  try {
    body = await request.json()
  } catch (parseError) {
    logger.warn(`[${requestId}] Failed to parse request body for template creation`)
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  try {
    // Authentication - support both session and API key
    let userId: string | null = null

    // Check for internal JWT token for server-side calls
    const authHeader = request.headers.get('authorization')
    let isInternalCall = false
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      // Try session auth first (for web UI)
      const session = await getSession()
      let authenticatedUserId: string | null = session?.user?.id || null

      // If no session, check for API key auth
      if (!authenticatedUserId) {
        const apiKeyHeader = request.headers.get('x-api-key')
        if (apiKeyHeader) {
          const [apiKeyRecord] = await db
            .select({ userId: apiKeyTable.userId })
            .from(apiKeyTable)
            .where(eq(apiKeyTable.key, apiKeyHeader))
            .limit(1)

          if (apiKeyRecord) {
            authenticatedUserId = apiKeyRecord.userId
          }
        }
      }

      if (!authenticatedUserId) {
        logger.warn(`[${requestId}] Unauthorized template creation attempt`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    const data = CreateTemplateSchema.parse(body)

    logger.info(`[${requestId}] Creating comprehensive template:`, {
      name: data.name,
      category: data.category,
      workflowId: data.workflowId,
      tags: data.tags,
      difficulty: data.difficulty,
      isPublic: data.isPublic,
    })

    // Verify the workflow exists and user has access (for non-internal calls)
    if (!isInternalCall && userId) {
      const workflowAccess = await db
        .select({
          id: workflow.id,
          userId: workflow.userId,
          name: workflow.name,
          workspaceId: workflow.workspaceId,
        })
        .from(workflow)
        .where(eq(workflow.id, data.workflowId))
        .limit(1)

      if (workflowAccess.length === 0) {
        logger.warn(`[${requestId}] Workflow not found: ${data.workflowId}`)
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
      }

      const workflowData = workflowAccess[0]

      // Check if user has access to the workflow
      if (workflowData.userId !== userId) {
        // TODO: Add workspace permission check if needed
        logger.warn(`[${requestId}] User ${userId} denied access to workflow ${data.workflowId}`)
        return NextResponse.json({ error: 'Access denied to workflow' }, { status: 403 })
      }
    }

    // Check for duplicate template name by same user
    if (userId) {
      const duplicateCheck = await db
        .select({ id: templates.id })
        .from(templates)
        .where(and(eq(templates.userId, userId), eq(templates.name, data.name)))
        .limit(1)

      if (duplicateCheck.length > 0) {
        logger.warn(`[${requestId}] Duplicate template name '${data.name}' for user ${userId}`)
        return NextResponse.json(
          {
            error: 'Template name already exists',
            suggestion: `${data.name} (Copy)`,
          },
          { status: 409 }
        )
      }
    }

    // Create the template with comprehensive metadata
    const templateId = uuidv4()
    const now = new Date()

    // Sanitize the workflow state to remove sensitive credentials (unless explicitly disabled)
    const templateState = data.sanitizeCredentials ? sanitizeWorkflowState(data.state) : data.state

    // Build enhanced template metadata
    const templateMetadata = {
      tags: data.tags || [],
      difficulty: data.difficulty || 'intermediate',
      estimatedTime: data.estimatedTime,
      requirements: data.requirements || [],
      useCases: data.useCases || [],
      version: data.version || '1.0.0',
      isPublic: data.isPublic ?? true,
      allowComments: data.allowComments ?? true,
      createdWith: 'api',
      processingTime: 0, // Will be updated after processing
    }

    const newTemplate = {
      id: templateId,
      workflowId: data.workflowId,
      userId: userId || 'system', // Fallback for internal calls
      name: data.name,
      description: data.description || null,
      author: data.author,
      views: 0,
      stars: 0,
      color: data.color,
      icon: data.icon,
      category: data.category,
      state: {
        ...templateState,
        metadata: {
          ...(templateState.metadata || {}),
          template: templateMetadata,
        },
      },
      createdAt: now,
      updatedAt: now,
    }

    // Create template in database
    const [createdTemplate] = await db.insert(templates).values(newTemplate).returning()

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Successfully created comprehensive template: ${templateId} in ${elapsed}ms`
    )

    return NextResponse.json(
      {
        id: templateId,
        name: data.name,
        category: data.category,
        author: data.author,
        metadata: templateMetadata,
        message: 'Template created successfully',
        processingTime: elapsed,
      },
      { status: 201 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid template data after ${elapsed}ms`, {
        errors: error.errors,
        receivedData: Object.keys(body || {}),
      })
      return NextResponse.json(
        {
          error: 'Invalid template data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error creating template after ${elapsed}ms`, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}
