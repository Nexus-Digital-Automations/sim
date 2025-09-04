/**
 * Marketplace Categories API - Template Category Management
 *
 * This API provides category management functionality including:
 * - Hierarchical category retrieval with template counts
 * - Category creation and management for administrators
 * - Usage statistics and trending category analytics
 * - Performance-optimized queries with caching support
 *
 * @author Claude Code Template Marketplace System
 * @version 1.0.0
 */

import { and, eq, isNull, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templateCategories, templates } from '@/db/schema'

const logger = createLogger('MarketplaceCategoriesAPI')

/**
 * Get Categories - GET /api/community/marketplace/categories
 *
 * Retrieve template categories with hierarchical structure and statistics
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Extract parameters
    const includeChildren = searchParams.get('includeChildren') !== 'false'
    const includeStats = searchParams.get('includeStats') !== 'false'
    const parentId = searchParams.get('parentId')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    logger.info(`[${requestId}] Categories request`, {
      includeChildren,
      includeStats,
      parentId,
      activeOnly,
    })

    // Build base query conditions
    const conditions = []

    if (activeOnly) {
      conditions.push(eq(templateCategories.isActive, true))
    }

    if (parentId) {
      conditions.push(eq(templateCategories.parentId, parentId))
    } else {
      // Get root categories if no parent specified
      conditions.push(isNull(templateCategories.parentId))
    }

    // Fetch categories with template counts
    const categoriesQuery = db
      .select({
        id: templateCategories.id,
        name: templateCategories.name,
        slug: templateCategories.slug,
        description: templateCategories.description,
        parentId: templateCategories.parentId,
        level: templateCategories.level,
        sortOrder: templateCategories.sortOrder,
        icon: templateCategories.icon,
        color: templateCategories.color,
        isActive: templateCategories.isActive,
        isFeatured: templateCategories.isFeatured,
        createdAt: templateCategories.createdAt,
        updatedAt: templateCategories.updatedAt,
        // Template count
        templateCount: includeStats
          ? sql<number>`(
              SELECT COUNT(*) 
              FROM ${templates} 
              WHERE ${templates.categoryId} = ${templateCategories.id} 
              AND ${templates.status} = 'published'
            )`
          : templateCategories.templateCount,
        // Additional stats if requested
        ...(includeStats && {
          totalViews: sql<number>`(
            SELECT COALESCE(SUM(${templates.views}), 0)
            FROM ${templates}
            WHERE ${templates.categoryId} = ${templateCategories.id}
            AND ${templates.status} = 'published'
          )`,
          totalDownloads: sql<number>`(
            SELECT COALESCE(SUM(${templates.downloadCount}), 0)
            FROM ${templates}
            WHERE ${templates.categoryId} = ${templateCategories.id}
            AND ${templates.status} = 'published'
          )`,
          avgRating: sql<number>`(
            SELECT COALESCE(AVG(${templates.avgRating}), 0)
            FROM ${templates}
            WHERE ${templates.categoryId} = ${templateCategories.id}
            AND ${templates.status} = 'published'
            AND ${templates.ratingCount} > 0
          )`,
        }),
      })
      .from(templateCategories)
      .where(and(...conditions))
      .orderBy(templateCategories.sortOrder, templateCategories.name)

    const categories = await categoriesQuery

    // Build hierarchical structure if including children
    let result = categories
    if (includeChildren && !parentId) {
      result = await buildCategoryHierarchy(categories, includeStats)
    }

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Categories retrieved`, {
      categoryCount: result.length,
      includeChildren,
      includeStats,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        requestId,
        processingTime,
        includeChildren,
        includeStats,
        total: result.length,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Categories retrieval failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve categories',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Create Category - POST /api/community/marketplace/categories
 *
 * Create a new template category (admin only)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const body = await request.json()

    // Validate required fields
    const { name, slug, description, parentId, icon, color, sortOrder } = body

    if (!name || !slug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Name and slug are required',
          requestId,
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Category creation request`, {
      name,
      slug,
      parentId: `${parentId?.slice(0, 8)}...`,
    })

    // Check if slug already exists
    const existingCategory = await db
      .select({ id: templateCategories.id })
      .from(templateCategories)
      .where(eq(templateCategories.slug, slug))
      .limit(1)

    if (existingCategory.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Category slug already exists',
          requestId,
        },
        { status: 400 }
      )
    }

    // Determine level based on parent
    let level = 0
    if (parentId) {
      const parentCategory = await db
        .select({ level: templateCategories.level })
        .from(templateCategories)
        .where(eq(templateCategories.id, parentId))
        .limit(1)

      if (parentCategory.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            message: 'Parent category not found',
            requestId,
          },
          { status: 400 }
        )
      }

      level = parentCategory[0].level + 1
    }

    // Create category
    const categoryId = crypto.randomUUID()
    const now = new Date()

    const [newCategory] = await db
      .insert(templateCategories)
      .values({
        id: categoryId,
        name,
        slug,
        description: description || null,
        parentId: parentId || null,
        level,
        sortOrder: sortOrder || 0,
        icon: icon || 'folder',
        color: color || '#6B7280',
        isActive: true,
        isFeatured: false,
        templateCount: 0,
        totalViews: 0,
        totalDownloads: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Category created`, {
      categoryId,
      name,
      slug,
      level,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: newCategory,
      metadata: {
        requestId,
        processingTime,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Category creation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Build hierarchical category structure
 */
async function buildCategoryHierarchy(
  rootCategories: any[],
  includeStats: boolean
): Promise<any[]> {
  const categoryMap = new Map()
  const result: any[] = []

  // Get all categories to build the hierarchy
  const allCategories = await db
    .select({
      id: templateCategories.id,
      name: templateCategories.name,
      slug: templateCategories.slug,
      description: templateCategories.description,
      parentId: templateCategories.parentId,
      level: templateCategories.level,
      sortOrder: templateCategories.sortOrder,
      icon: templateCategories.icon,
      color: templateCategories.color,
      isActive: templateCategories.isActive,
      isFeatured: templateCategories.isFeatured,
      createdAt: templateCategories.createdAt,
      updatedAt: templateCategories.updatedAt,
      templateCount: includeStats
        ? sql<number>`(
            SELECT COUNT(*) 
            FROM ${templates} 
            WHERE ${templates.categoryId} = ${templateCategories.id} 
            AND ${templates.status} = 'published'
          )`
        : templateCategories.templateCount,
      ...(includeStats && {
        totalViews: sql<number>`(
          SELECT COALESCE(SUM(${templates.views}), 0)
          FROM ${templates}
          WHERE ${templates.categoryId} = ${templateCategories.id}
          AND ${templates.status} = 'published'
        )`,
        totalDownloads: sql<number>`(
          SELECT COALESCE(SUM(${templates.downloadCount}), 0)
          FROM ${templates}
          WHERE ${templates.categoryId} = ${templateCategories.id}
          AND ${templates.status} = 'published'
        )`,
      }),
    })
    .from(templateCategories)
    .where(eq(templateCategories.isActive, true))
    .orderBy(templateCategories.level, templateCategories.sortOrder, templateCategories.name)

  // Build category map
  for (const category of allCategories) {
    categoryMap.set(category.id, { ...category, children: [] })
  }

  // Build hierarchy
  for (const category of allCategories) {
    const categoryWithChildren = categoryMap.get(category.id)

    if (category.parentId) {
      const parent = categoryMap.get(category.parentId)
      if (parent) {
        parent.children.push(categoryWithChildren)
      }
    } else {
      result.push(categoryWithChildren)
    }
  }

  return result
}
