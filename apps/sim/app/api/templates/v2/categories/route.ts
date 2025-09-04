/**
 * Template Categories API v2 - Hierarchical category management
 * 
 * Provides comprehensive category management with:
 * - Hierarchical organization with unlimited nesting
 * - Visual customization (colors, icons)
 * - SEO optimization (slugs, meta tags)
 * - Analytics tracking (template counts, usage stats)
 * - Efficient materialized path queries
 * 
 * @version 2.0.0
 * @author Sim Template Library Team
 * @created 2025-09-04
 */

import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templateCategories, templates, user } from '@/db/schema'

const logger = createLogger('TemplateCategoriesAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const CategoryQuerySchema = z.object({
  // Hierarchy navigation
  parentId: z.string().optional(), // Get children of specific parent
  includeChildren: z.coerce.boolean().optional().default(false), // Include child categories
  maxDepth: z.coerce.number().min(0).max(10).optional().default(5), // Limit hierarchy depth
  rootOnly: z.coerce.boolean().optional().default(false), // Get only root categories

  // Filtering
  search: z.string().optional(), // Search category names and descriptions
  isActive: z.coerce.boolean().optional().default(true), // Only active categories
  isFeatured: z.coerce.boolean().optional(), // Featured categories only
  hasTemplates: z.coerce.boolean().optional(), // Categories with templates only

  // Sorting
  sortBy: z.enum(['name', 'templateCount', 'createdAt', 'sortOrder']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),

  // Response options
  includeStats: z.coerce.boolean().optional().default(false), // Include usage statistics
  includeMetadata: z.coerce.boolean().optional().default(false), // Include SEO metadata
})

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(), // Lucide icon name
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().default('#6366F1'),
  
  parentId: z.string().optional(), // Parent category ID
  sortOrder: z.number().int().min(0).optional().default(0),
  
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  
  // SEO fields
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(200).optional(),
  contentDescription: z.string().max(2000).optional(),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Generate materialized path for category hierarchy
 */
function generatePath(parentPath: string | null, slug: string): string {
  if (!parentPath) return `/${slug}`
  return `${parentPath}/${slug}`
}

/**
 * Generate URL-friendly slug from category name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

/**
 * Build category tree structure from flat results
 */
function buildCategoryTree(categories: any[], parentId: string | null = null): any[] {
  return categories
    .filter(cat => cat.parentId === parentId)
    .map(category => ({
      ...category,
      children: buildCategoryTree(categories, category.id),
    }))
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/categories - Get hierarchical template categories
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const params = CategoryQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.info(`[${requestId}] Fetching template categories with params:`, params)

    // Build query conditions
    const conditions = []

    if (params.isActive !== undefined) {
      conditions.push(eq(templateCategories.isActive, params.isActive))
    }

    if (params.isFeatured !== undefined) {
      conditions.push(eq(templateCategories.isFeatured, params.isFeatured))
    }

    if (params.parentId) {
      conditions.push(eq(templateCategories.parentId, params.parentId))
    }

    if (params.rootOnly) {
      conditions.push(isNull(templateCategories.parentId))
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`
      conditions.push(
        or(
          ilike(templateCategories.name, searchTerm),
          ilike(templateCategories.description, searchTerm)
        )
      )
    }

    if (params.hasTemplates) {
      conditions.push(sql`${templateCategories.templateCount} > 0`)
    }

    if (params.maxDepth !== undefined) {
      conditions.push(sql`${templateCategories.depth} <= ${params.maxDepth}`)
    }

    // Build sorting
    const getSortField = () => {
      switch (params.sortBy) {
        case 'name':
          return templateCategories.name
        case 'templateCount':
          return templateCategories.templateCount
        case 'createdAt':
          return templateCategories.createdAt
        case 'sortOrder':
        default:
          return templateCategories.sortOrder
      }
    }

    const sortField = getSortField()
    const orderBy = params.sortOrder === 'desc' ? desc(sortField) : sql`${sortField} ASC`

    // Execute main query
    const query = db
      .select({
        id: templateCategories.id,
        name: templateCategories.name,
        slug: templateCategories.slug,
        description: templateCategories.description,
        icon: templateCategories.icon,
        color: templateCategories.color,
        parentId: templateCategories.parentId,
        path: templateCategories.path,
        depth: templateCategories.depth,
        sortOrder: templateCategories.sortOrder,
        templateCount: templateCategories.templateCount,
        isActive: templateCategories.isActive,
        isFeatured: templateCategories.isFeatured,
        createdAt: templateCategories.createdAt,
        updatedAt: templateCategories.updatedAt,
        
        // Conditional fields
        ...(params.includeMetadata ? {
          metaTitle: templateCategories.metaTitle,
          metaDescription: templateCategories.metaDescription,
          contentDescription: templateCategories.contentDescription,
        } : {}),
      })
      .from(templateCategories)

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined
    const results = await query
      .where(whereCondition)
      .orderBy(orderBy)

    // Add statistics if requested
    if (params.includeStats && results.length > 0) {
      const categoryIds = results.map(c => c.id)
      
      // Get template statistics for each category
      const templateStats = await db
        .select({
          categoryId: templates.categoryId,
          totalTemplates: sql<number>`count(*)`,
          avgRating: sql<number>`avg(${templates.ratingAverage})`,
          totalViews: sql<number>`sum(${templates.viewCount})`,
          totalDownloads: sql<number>`sum(${templates.downloadCount})`,
          featuredTemplates: sql<number>`count(*) filter (where ${templates.isFeatured} = true)`,
        })
        .from(templates)
        .where(
          and(
            inArray(templates.categoryId, categoryIds),
            eq(templates.status, 'approved'),
            eq(templates.visibility, 'public')
          )
        )
        .groupBy(templates.categoryId)

      // Map stats to categories
      const statsByCategory = templateStats.reduce((acc, stat) => {
        acc[stat.categoryId] = {
          totalTemplates: stat.totalTemplates,
          averageRating: Math.round((stat.avgRating || 0) * 10) / 10,
          totalViews: stat.totalViews || 0,
          totalDownloads: stat.totalDownloads || 0,
          featuredTemplates: stat.featuredTemplates || 0,
        }
        return acc
      }, {} as Record<string, any>)

      // Add stats to results
      results.forEach((category: any) => {
        category.stats = statsByCategory[category.id] || {
          totalTemplates: 0,
          averageRating: 0,
          totalViews: 0,
          totalDownloads: 0,
          featuredTemplates: 0,
        }
      })
    }

    // Build tree structure if including children
    const responseData = params.includeChildren 
      ? buildCategoryTree(results)
      : results

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Fetched ${results.length} categories in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        requestId,
        processingTime: elapsed,
        totalCategories: results.length,
        treeStructure: params.includeChildren,
        statsIncluded: params.includeStats,
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

    logger.error(`[${requestId}] Categories fetch error after ${elapsed}ms:`, error)
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
 * POST /api/templates/v2/categories - Create new template category
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

    const body = await request.json()
    const data = CreateCategorySchema.parse(body)

    logger.info(`[${requestId}] Creating category:`, { name: data.name, parentId: data.parentId })

    // Generate slug and check for uniqueness
    const slug = generateSlug(data.name)
    const slugExists = await db
      .select({ id: templateCategories.id })
      .from(templateCategories)
      .where(eq(templateCategories.slug, slug))
      .limit(1)

    if (slugExists.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Category with similar name already exists',
          suggestion: `${data.name} ${Math.floor(Math.random() * 100)}`
        },
        { status: 409 }
      )
    }

    // Validate parent category if provided
    let parentCategory = null
    if (data.parentId) {
      const parentResult = await db
        .select({
          id: templateCategories.id,
          path: templateCategories.path,
          depth: templateCategories.depth,
        })
        .from(templateCategories)
        .where(eq(templateCategories.id, data.parentId))
        .limit(1)

      if (parentResult.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Parent category not found' },
          { status: 400 }
        )
      }

      parentCategory = parentResult[0]

      // Check maximum depth
      if (parentCategory.depth >= 4) { // Allow max 5 levels (0-4)
        return NextResponse.json(
          { success: false, error: 'Maximum category depth exceeded' },
          { status: 400 }
        )
      }
    }

    // Generate path and calculate depth
    const path = generatePath(parentCategory?.path || null, slug)
    const depth = parentCategory ? parentCategory.depth + 1 : 0

    // Create category
    const categoryId = uuidv4()
    const now = new Date()

    const newCategory = await db.insert(templateCategories).values({
      id: categoryId,
      name: data.name,
      slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      parentId: data.parentId,
      path,
      depth,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      contentDescription: data.contentDescription,
      createdByUserId: session.user.id,
      createdAt: now,
      updatedAt: now,
    }).returning()

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Category created: ${categoryId} in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        id: categoryId,
        name: data.name,
        slug,
        path,
        depth,
        parentId: data.parentId,
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    }, { status: 201 })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid category data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Category creation error after ${elapsed}ms:`, error)
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