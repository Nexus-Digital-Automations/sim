import { and, desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { apiKey as apiKeyTable, templateStars, templates, user } from '@/db/schema'

const logger = createLogger('TemplateStarAPI')

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Enhanced schema for star management with analytics options
const StarOptionsSchema = z.object({
  includeStats: z.coerce.boolean().optional().default(false), // Include star statistics
  includeRecentStars: z.coerce.boolean().optional().default(false), // Include recent users who starred
})

// Schema for batch star operations (future enhancement)
const BatchStarSchema = z.object({
  templateIds: z.array(z.string()).min(1, 'At least one template ID is required'),
  operation: z.enum(['star', 'unstar', 'toggle']),
})

// GET /api/templates/[id]/star - Check star status with comprehensive analytics
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id } = await params
  
  // Parse query parameters outside try block for error handling access
  const { searchParams } = new URL(request.url)
  const queryParams = Object.fromEntries(searchParams.entries())

  try {
    const options = StarOptionsSchema.parse(queryParams)

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
        logger.warn(`[${requestId}] Unauthorized star check attempt for template: ${id}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    logger.info(`[${requestId}] Checking comprehensive star status:`, {
      templateId: id,
      userId,
      includeStats: options.includeStats,
      includeRecentStars: options.includeRecentStars,
    })

    // Check if the user has starred this template (if authenticated)
    let isStarred = false
    let userStarDate = null

    if (userId) {
      const starRecord = await db
        .select({
          id: templateStars.id,
          starredAt: templateStars.starredAt,
        })
        .from(templateStars)
        .where(and(eq(templateStars.templateId, id), eq(templateStars.userId, userId)))
        .limit(1)

      isStarred = starRecord.length > 0
      userStarDate = starRecord[0]?.starredAt || null
    }

    // Get comprehensive star statistics if requested
    let starStats = null
    if (options.includeStats) {
      const statsQuery = await db
        .select({
          totalStars: sql<number>`count(*)`,
          starredThisWeek: sql<number>`count(CASE WHEN ${templateStars.starredAt} >= now() - interval '7 days' THEN 1 END)`,
          starredThisMonth: sql<number>`count(CASE WHEN ${templateStars.starredAt} >= now() - interval '30 days' THEN 1 END)`,
          oldestStar: sql<Date>`min(${templateStars.starredAt})`,
          newestStar: sql<Date>`max(${templateStars.starredAt})`,
        })
        .from(templateStars)
        .where(eq(templateStars.templateId, id))

      starStats = statsQuery[0]
        ? {
            totalStars: statsQuery[0].totalStars || 0,
            starredThisWeek: statsQuery[0].starredThisWeek || 0,
            starredThisMonth: statsQuery[0].starredThisMonth || 0,
            oldestStar: statsQuery[0].oldestStar,
            newestStar: statsQuery[0].newestStar,
            averageStarsPerDay:
              statsQuery[0].totalStars > 0 && statsQuery[0].oldestStar
                ? Math.round(
                    (statsQuery[0].totalStars /
                      Math.max(
                        1,
                        Math.ceil(
                          (Date.now() - new Date(statsQuery[0].oldestStar).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )) *
                      100
                  ) / 100
                : 0,
          }
        : null
    }

    // Get recent users who starred this template if requested
    let recentStars = null
    if (options.includeRecentStars) {
      const recentStarsQuery = await db
        .select({
          userId: user.id,
          userName: user.name,
          userImage: user.image,
          starredAt: templateStars.starredAt,
        })
        .from(templateStars)
        .innerJoin(user, eq(templateStars.userId, user.id))
        .where(eq(templateStars.templateId, id))
        .orderBy(desc(templateStars.starredAt))
        .limit(10)

      recentStars = recentStarsQuery.map((star) => ({
        userId: star.userId,
        name: star.userName,
        image: star.userImage,
        starredAt: star.starredAt,
      }))
    }

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Star status checked: ${isStarred} for template: ${id} in ${elapsed}ms`
    )

    return NextResponse.json({
      data: {
        isStarred,
        userStarDate,
      },
      ...(starStats && { starStats }),
      ...(recentStars && { recentStars }),
      meta: {
        requestId,
        processingTime: elapsed,
        isAuthenticated: !!userId,
        optionsUsed: {
          includeStats: options.includeStats,
          includeRecentStars: options.includeRecentStars,
        },
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(
        `[${requestId}] Invalid star check options for template ${id} after ${elapsed}ms`,
        {
          errors: error.errors,
          queryParams,
        }
      )
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(
      `[${requestId}] Error checking star status for template: ${id} after ${elapsed}ms`,
      error
    )
    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

// POST /api/templates/[id]/star - Add a star with comprehensive tracking
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id } = await params

  try {
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
        logger.warn(`[${requestId}] Unauthorized star attempt for template: ${id}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    } else {
      // For internal calls, we might need userId from request body
      const body = await request.json().catch(() => ({}))
      userId = body.userId || 'system'
    }

    // Final check to ensure userId is set
    if (!userId) {
      logger.warn(`[${requestId}] No user ID available for star operation`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info(`[${requestId}] Adding comprehensive star for template: ${id}, user: ${userId}`)

    // Verify the template exists
    const templateExists = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1)

    if (templateExists.length === 0) {
      logger.warn(`[${requestId}] Template not found: ${id}`)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if user has already starred this template
    const existingStar = await db
      .select({ id: templateStars.id })
      .from(templateStars)
      .where(and(eq(templateStars.templateId, id), eq(templateStars.userId, userId)))
      .limit(1)

    if (existingStar.length > 0) {
      logger.info(`[${requestId}] Template already starred: ${id}`)
      return NextResponse.json({ message: 'Template already starred' }, { status: 200 })
    }

    // Use a comprehensive transaction to ensure consistency
    let newStarCount = 0
    const starResult = await db.transaction(async (tx) => {
      // Add the star record with enhanced metadata
      const starId = uuidv4()
      const now = new Date()

      await tx.insert(templateStars).values({
        id: starId,
        userId: userId!,
        templateId: id,
        starredAt: now,
        createdAt: now,
      })

      // Increment the star count and get the new total
      const [updatedTemplate] = await tx
        .update(templates)
        .set({
          stars: sql`${templates.stars} + 1`,
          updatedAt: now,
        })
        .where(eq(templates.id, id))
        .returning({ stars: templates.stars, name: templates.name })

      newStarCount = updatedTemplate.stars
      return {
        starId,
        templateName: updatedTemplate.name,
        newStarCount,
      }
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully starred template: ${id} in ${elapsed}ms`, {
      templateId: id,
      userId,
      newStarCount,
      starId: starResult.starId,
    })

    return NextResponse.json(
      {
        message: 'Template starred successfully',
        template: {
          id,
          name: starResult.templateName,
          newStarCount,
        },
        star: {
          id: starResult.starId,
          starredAt: new Date(),
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

    // Handle unique constraint violations gracefully
    if (error.code === '23505' || error.message?.includes('duplicate key')) {
      logger.info(`[${requestId}] Duplicate star attempt for template: ${id} after ${elapsed}ms`)
      return NextResponse.json(
        {
          message: 'Template already starred',
          requestId,
        },
        { status: 200 }
      )
    }

    logger.error(`[${requestId}] Error starring template: ${id} after ${elapsed}ms`, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/templates/[id]/star - Remove a star with comprehensive tracking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id } = await params

  try {
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
        logger.warn(`[${requestId}] Unauthorized unstar attempt for template: ${id}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    } else {
      // For internal calls, we might need userId from request body
      const body = await request.json().catch(() => ({}))
      userId = body.userId || 'system'
    }

    logger.info(`[${requestId}] Removing comprehensive star for template: ${id}, user: ${userId}`)

    // Check if the star exists and get metadata
    const existingStar = await db
      .select({
        id: templateStars.id,
        starredAt: templateStars.starredAt,
      })
      .from(templateStars)
      .where(and(eq(templateStars.templateId, id), eq(templateStars.userId, userId!)))
      .limit(1)

    if (existingStar.length === 0) {
      logger.info(`[${requestId}] No star found to remove for template: ${id}`)
      return NextResponse.json(
        {
          message: 'Template not starred',
          requestId,
        },
        { status: 200 }
      )
    }

    const starMetadata = existingStar[0]

    // Use a comprehensive transaction to ensure consistency
    let newStarCount = 0
    const unstarResult = await db.transaction(async (tx) => {
      // Remove the star record
      await tx
        .delete(templateStars)
        .where(and(eq(templateStars.templateId, id), eq(templateStars.userId, userId!)))

      // Decrement the star count (prevent negative values) and get new total
      const [updatedTemplate] = await tx
        .update(templates)
        .set({
          stars: sql`GREATEST(${templates.stars} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, id))
        .returning({ stars: templates.stars, name: templates.name })

      newStarCount = updatedTemplate.stars
      return {
        templateName: updatedTemplate.name,
        newStarCount,
        originalStarDate: starMetadata.starredAt,
      }
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully unstarred template: ${id} in ${elapsed}ms`, {
      templateId: id,
      userId,
      newStarCount,
      originalStarDate: unstarResult.originalStarDate,
    })

    return NextResponse.json(
      {
        message: 'Template unstarred successfully',
        template: {
          id,
          name: unstarResult.templateName,
          newStarCount,
        },
        removedStar: {
          originalStarDate: unstarResult.originalStarDate,
          starDuration: Date.now() - new Date(unstarResult.originalStarDate).getTime(),
        },
        meta: {
          requestId,
          processingTime: elapsed,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error unstarring template: ${id} after ${elapsed}ms`, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}
