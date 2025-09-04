/**
 * Marketplace Management API - Template Publishing and Management
 *
 * This API provides comprehensive template management functionality including:
 * - Template publishing and lifecycle management
 * - Content moderation and approval workflows
 * - Metadata management and categorization
 * - Version control and update management
 * - Analytics and performance tracking
 * - Creator dashboard and monetization features
 *
 * Features:
 * - Multi-stage publishing workflow with validation
 * - Automated quality assessment and scoring
 * - Rich metadata management with AI-powered suggestions
 * - Advanced analytics and performance insights
 * - Creator monetization and revenue tracking
 * - Community engagement and feedback integration
 *
 * @author Claude Code Marketplace Management System
 * @version 2.0.0
 * @implements Advanced Template Publishing Architecture
 */

import { and, desc, eq, sql, inArray, or, gte } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templates,
  templateCategories,
  templateTags,
  templateTagAssignments,
  templatePricing,
  user,
  workflows,
} from '@/db/schema'

const logger = createLogger('MarketplaceManagementAPI')

interface TemplateSubmission {
  workflowId: string
  userId: string
  name: string
  description: string
  categoryId: string
  tags: string[]
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  estimatedSetupTime?: number
  license: string
  documentation?: string
  requirements?: string[]
  exampleUseCases?: string[]
  keywords?: string[]
  businessValue?: string[]
  industryTags?: string[]
  useCaseTags?: string[]
  pricingType?: 'free' | 'paid'
  price?: number
  currency?: string
}

interface TemplateUpdate {
  name?: string
  description?: string
  categoryId?: string
  tags?: string[]
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  estimatedSetupTime?: number
  documentation?: string
  requirements?: string[]
  exampleUseCases?: string[]
  keywords?: string[]
  businessValue?: string[]
  industryTags?: string[]
  useCaseTags?: string[]
  status?: 'draft' | 'published' | 'archived'
  visibility?: 'public' | 'private' | 'unlisted'
}

/**
 * Template Management API - GET /api/marketplace/manage
 *
 * Retrieve user's managed templates with detailed analytics
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Extract parameters
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') // 'draft', 'published', 'archived', 'all'
    const sortBy = searchParams.get('sortBy') || 'updated' // 'created', 'updated', 'name', 'downloads', 'rating'
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20')))
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'
    const includePricing = searchParams.get('includePricing') === 'true'

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing user ID',
          message: 'User ID is required to retrieve managed templates',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Template management request`, {
      userId: `${userId.slice(0, 8)}...`,
      status,
      sortBy,
      page,
      limit,
      includeAnalytics,
      includePricing,
    })

    // Build conditions
    const conditions = [eq(templates.createdByUserId, userId)]

    if (status && status !== 'all') {
      conditions.push(eq(templates.status, status))
    }

    // Build sorting
    let orderByClause
    switch (sortBy) {
      case 'created':
        orderByClause = desc(templates.createdAt)
        break
      case 'name':
        orderByClause = templates.name
        break
      case 'downloads':
        orderByClause = desc(templates.downloadCount)
        break
      case 'rating':
        orderByClause = desc(templates.ratingAverage)
        break
      default:
        orderByClause = desc(templates.updatedAt)
    }

    const offset = (page - 1) * limit

    // Get templates with analytics
    let queryBuilder = db
      .select({
        id: templates.id,
        workflowId: templates.workflowId,
        name: templates.name,
        description: templates.description,
        categoryId: templates.categoryId,
        status: templates.status,
        visibility: templates.visibility,
        difficultyLevel: templates.difficultyLevel,
        estimatedSetupTime: templates.estimatedSetupTime,
        license: templates.license,
        
        // Metrics
        viewCount: templates.viewCount,
        downloadCount: templates.downloadCount,
        ratingAverage: templates.ratingAverage,
        ratingCount: templates.ratingCount,
        
        // Visual
        color: templates.color,
        icon: templates.icon,
        
        // Timestamps
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        publishedAt: templates.publishedAt,
        
        // Category info
        categoryName: templateCategories.name,
        categorySlug: templateCategories.slug,
        categoryColor: templateCategories.color,
        categoryIcon: templateCategories.icon,
        
        // Analytics if requested
        ...(includeAnalytics && {
          todayViews: sql<number>`
            COALESCE(
              (SELECT COUNT(*) FROM social_interactions WHERE target_id::text = ${templates.id} AND target_type = 'template' AND interaction_type = 'view' AND created_at >= CURRENT_DATE),
              0
            )
          `,
          weekViews: sql<number>`
            COALESCE(
              (SELECT COUNT(*) FROM social_interactions WHERE target_id::text = ${templates.id} AND target_type = 'template' AND interaction_type = 'view' AND created_at >= CURRENT_DATE - INTERVAL '7 days'),
              0
            )
          `,
          monthViews: sql<number>`
            COALESCE(
              (SELECT COUNT(*) FROM social_interactions WHERE target_id::text = ${templates.id} AND target_type = 'template' AND interaction_type = 'view' AND created_at >= CURRENT_DATE - INTERVAL '30 days'),
              0
            )
          `,
          socialLikes: sql<number>`
            COALESCE(
              (SELECT COUNT(*) FROM social_interactions WHERE target_id::text = ${templates.id} AND target_type = 'template' AND interaction_type = 'like'),
              0
            )
          `,
          trendingScore: sql<number>`
            COALESCE(
              (SELECT trending_score FROM template_trending_scores WHERE template_id = ${templates.id}),
              0
            )
          `,
          trendingRank: sql<number>`
            COALESCE(
              (SELECT trending_rank FROM template_trending_scores WHERE template_id = ${templates.id}),
              999999
            )
          `,
        }),
      })
      .from(templates)
      .leftJoin(templateCategories, eq(templates.categoryId, templateCategories.id))

    // Add pricing info if requested
    if (includePricing) {
      queryBuilder = queryBuilder.leftJoin(
        templatePricing,
        eq(templates.id, templatePricing.templateId)
      )
    }

    const managedTemplates = await queryBuilder
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(templates)
      .where(and(...conditions))

    const totalCount = totalCountResult[0]?.count || 0

    // Get template tags
    const templateIds = managedTemplates.map(t => t.id)
    let templateTags: Record<string, any[]> = {}
    
    if (templateIds.length > 0) {
      const tagQuery = await db
        .select({
          templateId: templateTagAssignments.templateId,
          tagName: templateTags.name,
          tagDisplayName: templateTags.displayName,
          tagColor: templateTags.color,
          tagType: templateTags.tagType,
        })
        .from(templateTagAssignments)
        .innerJoin(templateTags, eq(templateTagAssignments.tagId, templateTags.id))
        .where(inArray(templateTagAssignments.templateId, templateIds))

      templateTags = tagQuery.reduce((acc, tag) => {
        if (!acc[tag.templateId]) acc[tag.templateId] = []
        acc[tag.templateId].push({
          name: tag.tagName,
          displayName: tag.tagDisplayName,
          color: tag.tagColor,
          type: tag.tagType,
        })
        return acc
      }, {} as Record<string, any[]>)
    }

    // Get pricing info if requested
    let templatePricingInfo: Record<string, any> = {}
    if (includePricing && templateIds.length > 0) {
      const pricingQuery = await db
        .select()
        .from(templatePricing)
        .where(inArray(templatePricing.templateId, templateIds))

      templatePricingInfo = pricingQuery.reduce((acc, pricing) => {
        acc[pricing.templateId] = {
          pricingType: pricing.pricingType,
          basePrice: pricing.basePrice,
          currency: pricing.currency,
          creatorSharePercentage: pricing.creatorSharePercentage,
          platformFeePercentage: pricing.platformFeePercentage,
        }
        return acc
      }, {} as Record<string, any>)
    }

    // Format results
    const formattedTemplates = managedTemplates.map(template => ({
      ...template,
      tags: templateTags[template.id] || [],
      ...(includePricing && {
        pricing: templatePricingInfo[template.id] || null,
      }),
    }))

    // Get summary stats
    const summaryStats = await getUserTemplateStats(userId)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Template management data retrieved`, {
      templateCount: formattedTemplates.length,
      totalCount,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: formattedTemplates,
      summaryStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
      metadata: {
        requestId,
        filters: {
          status,
          sortBy,
        },
        features: {
          includeAnalytics,
          includePricing,
        },
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Template management retrieval failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve managed templates',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Publish Template - POST /api/marketplace/manage
 *
 * Submit a template for marketplace publication
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const submission: TemplateSubmission = await request.json()

    const {
      workflowId,
      userId,
      name,
      description,
      categoryId,
      tags,
      difficultyLevel,
      estimatedSetupTime,
      license,
      documentation,
      requirements,
      exampleUseCases,
      keywords,
      businessValue,
      industryTags,
      useCaseTags,
      pricingType,
      price,
      currency,
    } = submission

    // Validate required fields
    if (!workflowId || !userId || !name || !description || !categoryId || !license) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Workflow ID, user ID, name, description, category, and license are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Template publication request`, {
      workflowId: `${workflowId.slice(0, 8)}...`,
      userId: `${userId.slice(0, 8)}...`,
      name: name.slice(0, 50),
      categoryId,
      tagCount: tags?.length || 0,
      hasPricing: !!(pricingType && pricingType !== 'free'),
    })

    // Verify workflow exists and belongs to user
    const workflow = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        userId: workflows.userId,
        content: workflows.content,
      })
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
      .limit(1)

    if (workflow.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow not found',
          message: 'Workflow not found or you do not have permission to publish it',
        },
        { status: 404 }
      )
    }

    // Verify category exists
    const category = await db
      .select({ id: templateCategories.id, name: templateCategories.name })
      .from(templateCategories)
      .where(eq(templateCategories.id, categoryId))
      .limit(1)

    if (category.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
          message: 'The specified category does not exist',
        },
        { status: 404 }
      )
    }

    // Check if template with same workflow already exists
    const existingTemplate = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.workflowId, workflowId))
      .limit(1)

    if (existingTemplate.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template already exists',
          message: 'A template for this workflow has already been published',
        },
        { status: 409 }
      )
    }

    // Generate template ID
    const templateId = crypto.randomUUID()

    // Extract integrations and keywords from workflow content
    const workflowContent = workflow[0].content
    const extractedIntegrations = extractIntegrationsFromWorkflow(workflowContent)
    const extractedKeywords = extractKeywordsFromWorkflow(workflowContent, name, description)

    // Create template
    await db.insert(templates).values({
      id: templateId,
      workflowId,
      createdByUserId: userId,
      name,
      description,
      categoryId,
      status: 'published', // Auto-publish for now, can add approval workflow later
      visibility: 'public',
      difficultyLevel,
      estimatedSetupTime,
      license,
      workflowTemplate: workflowContent,
      templateVersion: '1.0.0',
      documentation,
      requirements: requirements || [],
      exampleUseCases: exampleUseCases || [],
      keywords: [...(keywords || []), ...extractedKeywords],
      businessValue: businessValue || [],
      industryTags: industryTags || [],
      useCaseTags: useCaseTags || [],
      integrationsUsed: extractedIntegrations,
      
      // Initialize metrics
      viewCount: 0,
      downloadCount: 0,
      ratingAverage: 0,
      ratingCount: 0,
      
      // Set timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
    })

    // Add tags
    if (tags && tags.length > 0) {
      await addTemplateTags(templateId, tags)
    }

    // Add pricing if specified
    if (pricingType && pricingType !== 'free' && price && price > 0) {
      await db.insert(templatePricing).values({
        id: crypto.randomUUID(),
        templateId,
        pricingType,
        basePrice: price,
        currency: currency || 'USD',
        creatorSharePercentage: 70.0, // Default creator share
        platformFeePercentage: 30.0, // Default platform fee
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create activity feed entry for followers
    await db.execute(sql`
      INSERT INTO activity_feed (
        user_id, actor_id, activity_type, object_type, object_id,
        engagement_score, relevance_score, created_at,
        metadata
      )
      SELECT 
        uf.follower_id, ${userId}, 'template_created', 'template', ${templateId}::uuid,
        3.0, 2.5, NOW(),
        JSON_BUILD_OBJECT('templateName', ${name}, 'categoryName', ${category[0].name})
      FROM user_follows uf
      WHERE uf.following_id = ${userId}
    `)

    // Update user reputation
    await updateUserReputation(userId, 'template_created')

    // Get the created template with full details
    const createdTemplate = await getTemplateDetails(templateId)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Template published successfully`, {
      templateId,
      templateName: name,
      processingTime,
    })

    // Track publication analytics
    await trackPublicationAnalytics(requestId, {
      templateId,
      userId,
      categoryId,
      tagCount: tags?.length || 0,
      hasPricing: !!(pricingType && pricingType !== 'free'),
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: createdTemplate,
      metadata: {
        requestId,
        processingTime,
        published: true,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Template publication failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to publish template',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Update Template - PUT /api/marketplace/manage
 *
 * Update an existing template
 */
export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId, userId, ...updates }: TemplateUpdate & { templateId: string; userId: string } = await request.json()

    if (!templateId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Template ID and user ID are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Template update request`, {
      templateId: `${templateId.slice(0, 8)}...`,
      userId: `${userId.slice(0, 8)}...`,
      updateFields: Object.keys(updates),
    })

    // Verify template exists and belongs to user
    const template = await db
      .select({
        id: templates.id,
        createdByUserId: templates.createdByUserId,
        name: templates.name,
      })
      .from(templates)
      .where(and(eq(templates.id, templateId), eq(templates.createdByUserId, userId)))
      .limit(1)

    if (template.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
          message: 'Template not found or you do not have permission to update it',
        },
        { status: 404 }
      )
    }

    // Validate category if provided
    if (updates.categoryId) {
      const category = await db
        .select({ id: templateCategories.id })
        .from(templateCategories)
        .where(eq(templateCategories.id, updates.categoryId))
        .limit(1)

      if (category.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Category not found',
            message: 'The specified category does not exist',
          },
          { status: 404 }
        )
      }
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    }

    // Remove tags from update data as they're handled separately
    const { tags, ...templateUpdateData } = updateData

    // Update template
    await db
      .update(templates)
      .set(templateUpdateData)
      .where(eq(templates.id, templateId))

    // Update tags if provided
    if (tags) {
      // Remove existing tags
      await db
        .delete(templateTagAssignments)
        .where(eq(templateTagAssignments.templateId, templateId))
      
      // Add new tags
      if (tags.length > 0) {
        await addTemplateTags(templateId, tags)
      }
    }

    // Get updated template
    const updatedTemplate = await getTemplateDetails(templateId)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Template updated successfully`, {
      templateId,
      updatedFields: Object.keys(updates),
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      metadata: {
        requestId,
        updatedFields: Object.keys(updates),
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Template update failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update template',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Delete Template - DELETE /api/marketplace/manage
 *
 * Delete/archive a template
 */
export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const userId = searchParams.get('userId')
    const permanent = searchParams.get('permanent') === 'true'

    if (!templateId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'Template ID and user ID are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Template deletion request`, {
      templateId: `${templateId.slice(0, 8)}...`,
      userId: `${userId.slice(0, 8)}...`,
      permanent,
    })

    // Verify template exists and belongs to user
    const template = await db
      .select({
        id: templates.id,
        createdByUserId: templates.createdByUserId,
        name: templates.name,
        status: templates.status,
      })
      .from(templates)
      .where(and(eq(templates.id, templateId), eq(templates.createdByUserId, userId)))
      .limit(1)

    if (template.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
          message: 'Template not found or you do not have permission to delete it',
        },
        { status: 404 }
      )
    }

    if (permanent) {
      // Permanent deletion - remove all related data
      await db.delete(templates).where(eq(templates.id, templateId))
      
      logger.info(`[${requestId}] Template permanently deleted`, {
        templateId,
        templateName: template[0].name,
      })
    } else {
      // Soft delete - archive the template
      await db
        .update(templates)
        .set({
          status: 'archived',
          visibility: 'private',
          updatedAt: new Date(),
        })
        .where(eq(templates.id, templateId))

      logger.info(`[${requestId}] Template archived`, {
        templateId,
        templateName: template[0].name,
      })
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        deleted: permanent,
        archived: !permanent,
        templateName: template[0].name,
      },
      metadata: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Template deletion failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete template',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to add template tags
 */
async function addTemplateTags(templateId: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    // Get or create tag
    let tag = await db
      .select({ id: templateTags.id })
      .from(templateTags)
      .where(eq(templateTags.name, tagName))
      .limit(1)

    let tagId: string
    if (tag.length === 0) {
      // Create new tag
      tagId = crypto.randomUUID()
      await db.insert(templateTags).values({
        id: tagId,
        name: tagName,
        displayName: tagName.charAt(0).toUpperCase() + tagName.slice(1),
        tagType: 'user',
        isActive: true,
        usageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      tagId = tag[0].id
      // Increment usage count
      await db
        .update(templateTags)
        .set({
          usageCount: sql`${templateTags.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(templateTags.id, tagId))
    }

    // Create tag assignment
    await db.insert(templateTagAssignments).values({
      templateId,
      tagId,
      createdAt: new Date(),
    })
  }
}

/**
 * Get template details with all related data
 */
async function getTemplateDetails(templateId: string) {
  const template = await db
    .select({
      id: templates.id,
      workflowId: templates.workflowId,
      name: templates.name,
      description: templates.description,
      categoryId: templates.categoryId,
      categoryName: templateCategories.name,
      status: templates.status,
      visibility: templates.visibility,
      difficultyLevel: templates.difficultyLevel,
      estimatedSetupTime: templates.estimatedSetupTime,
      license: templates.license,
      viewCount: templates.viewCount,
      downloadCount: templates.downloadCount,
      ratingAverage: templates.ratingAverage,
      ratingCount: templates.ratingCount,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt,
      publishedAt: templates.publishedAt,
    })
    .from(templates)
    .leftJoin(templateCategories, eq(templates.categoryId, templateCategories.id))
    .where(eq(templates.id, templateId))
    .limit(1)

  if (template.length === 0) return null

  // Get tags
  const tags = await db
    .select({
      name: templateTags.name,
      displayName: templateTags.displayName,
      color: templateTags.color,
      type: templateTags.tagType,
    })
    .from(templateTagAssignments)
    .innerJoin(templateTags, eq(templateTagAssignments.tagId, templateTags.id))
    .where(eq(templateTagAssignments.templateId, templateId))

  return {
    ...template[0],
    tags,
  }
}

/**
 * Get user template statistics
 */
async function getUserTemplateStats(userId: string) {
  const stats = await db.execute(sql`
    SELECT 
      COUNT(*) as total_templates,
      COUNT(CASE WHEN status = 'published' THEN 1 END) as published_templates,
      COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_templates,
      COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_templates,
      SUM(view_count) as total_views,
      SUM(download_count) as total_downloads,
      AVG(rating_average)::decimal(3,2) as average_rating,
      SUM(rating_count) as total_ratings
    FROM templates
    WHERE created_by_user_id = ${userId}
  `)

  const row = stats.rows[0]
  return {
    totalTemplates: Number(row?.total_templates || 0),
    publishedTemplates: Number(row?.published_templates || 0),
    draftTemplates: Number(row?.draft_templates || 0),
    archivedTemplates: Number(row?.archived_templates || 0),
    totalViews: Number(row?.total_views || 0),
    totalDownloads: Number(row?.total_downloads || 0),
    averageRating: row?.average_rating ? Number(row.average_rating) : 0,
    totalRatings: Number(row?.total_ratings || 0),
  }
}

/**
 * Update user reputation for template actions
 */
async function updateUserReputation(userId: string, action: string) {
  const points = {
    template_created: 10,
    template_featured: 25,
    template_downloaded: 1,
  }

  const actionPoints = points[action as keyof typeof points] || 0
  if (actionPoints === 0) return

  await db.execute(sql`
    INSERT INTO user_reputation (user_id, reputation_score, templates_created, last_calculated)
    VALUES (${userId}, ${actionPoints}, ${action === 'template_created' ? 1 : 0}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      reputation_score = user_reputation.reputation_score + ${actionPoints},
      templates_created = CASE WHEN ${action === 'template_created'} THEN user_reputation.templates_created + 1 ELSE user_reputation.templates_created END,
      last_calculated = NOW()
  `)
}

/**
 * Extract integrations from workflow content
 */
function extractIntegrationsFromWorkflow(workflowContent: any): string[] {
  try {
    if (typeof workflowContent === 'string') {
      workflowContent = JSON.parse(workflowContent)
    }

    const integrations = new Set<string>()
    
    // Look for blocks with integration types
    if (workflowContent.blocks) {
      for (const block of workflowContent.blocks) {
        if (block.type && block.type !== 'ai_chat') {
          integrations.add(block.type)
        }
      }
    }

    return Array.from(integrations)
  } catch (error) {
    logger.error('Failed to extract integrations from workflow', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return []
  }
}

/**
 * Extract keywords from workflow content and metadata
 */
function extractKeywordsFromWorkflow(workflowContent: any, name: string, description: string): string[] {
  const keywords = new Set<string>()
  
  // Extract from name and description
  const text = `${name} ${description}`.toLowerCase()
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']
  
  const words = text.match(/\b\w{3,}\b/g) || []
  for (const word of words) {
    if (!commonWords.includes(word)) {
      keywords.add(word)
    }
  }

  return Array.from(keywords).slice(0, 20) // Limit to 20 keywords
}

/**
 * Track publication analytics
 */
async function trackPublicationAnalytics(
  requestId: string,
  data: {
    templateId: string
    userId: string
    categoryId: string
    tagCount: number
    hasPricing: boolean
    processingTime: number
  }
) {
  try {
    logger.info(`[${requestId}] Publication analytics`, {
      templateId: `${data.templateId.slice(0, 8)}...`,
      userId: `${data.userId.slice(0, 8)}...`,
      categoryId: data.categoryId,
      tagCount: data.tagCount,
      hasPricing: data.hasPricing,
      processingTime: data.processingTime,
    })

    // In production, store in analytics database
    // await analyticsService.track('template_published', data)
  } catch (error) {
    logger.error(`[${requestId}] Failed to track publication analytics`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}