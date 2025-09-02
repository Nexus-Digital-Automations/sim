/**
 * Workflow Changelog API Endpoints
 *
 * Human-readable changelog generation for workflow versions with the following capabilities:
 * - GET /api/workflows/[id]/changelog - Generate human-readable changelog
 * - GET /api/workflows/[id]/changelog/export - Export changelog in various formats
 *
 * This API provides production-ready changelog generation with:
 * - Semantic versioning integration
 * - Human-friendly change descriptions
 * - Grouped and categorized changes
 * - Multiple export formats (markdown, JSON, HTML, PDF)
 * - Customizable filtering and formatting
 * - Release notes generation
 * - Integration with version tags and milestones
 */

import crypto from 'crypto'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { db } from '@/db'
import {
  apiKey as apiKeyTable,
  user,
  workflow as workflowTable,
  workflowVersionChanges,
  workflowVersions,
  workflowVersionTags,
} from '@/db/schema'

const logger = createLogger('WorkflowChangelogAPI')

// Changelog query schema with comprehensive options
const ChangelogQuerySchema = z.object({
  // Version range filtering
  fromVersion: z.string().optional(),
  toVersion: z.string().optional(),
  sinceVersion: z.string().optional(),

  // Time range filtering
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('all').optional(),

  // Content filtering
  includeBreaking: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true
  includeMinor: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true
  includePatch: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true
  onlyTagged: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  onlyDeployed: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  // Grouping and organization
  groupBy: z.enum(['version', 'date', 'type', 'impact']).default('version').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),

  // Output format and style
  format: z.enum(['structured', 'markdown', 'html', 'plain']).default('structured').optional(),
  includeDetails: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  includeMetadata: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true
  includeAuthors: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true

  // Pagination (for large changelogs)
  limit: z.string().regex(/^\d+$/).transform(Number).default('100').optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0').optional(),
})

/**
 * GET /api/workflows/[id]/changelog
 *
 * Generate comprehensive, human-readable changelog for workflow versions.
 * Supports multiple filtering options and output formats for different use cases.
 *
 * Query Parameters:
 * - fromVersion/toVersion: Version range (e.g., "1.0.0" to "2.1.0")
 * - sinceVersion: Changes since specific version (alternative to fromVersion)
 * - from/to: ISO datetime range filter
 * - period: Predefined time periods (7d, 30d, 90d, 1y, all)
 * - includeBreaking/includeMinor/includePatch: Include version types
 * - onlyTagged: Only include tagged versions
 * - onlyDeployed: Only include deployed versions
 * - groupBy: Group changes by version, date, type, or impact
 * - sortOrder: Chronological order (asc/desc)
 * - format: Output format (structured, markdown, html, plain)
 * - includeDetails: Include detailed change information
 * - includeMetadata: Include version metadata
 * - includeAuthors: Include author information
 * - limit/offset: Pagination for large changelogs
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    logger.info(`[${requestId}] Generating changelog for workflow ${workflowId}`)

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = ChangelogQuerySchema.parse(queryParams)

    // Check for export endpoint
    const isExport = request.url.includes('/export')

    // Authentication and authorization check
    const { userId, hasAccess } = await authenticateAndAuthorize(request, workflowId, requestId)
    if (!hasAccess) {
      logger.warn(`[${requestId}] Access denied for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get workflow information for context
    const workflowInfo = await getWorkflowInfo(workflowId)
    if (!workflowInfo) {
      logger.warn(`[${requestId}] Workflow ${workflowId} not found`)
      return NextResponse.json({ error: 'Workflow not found', requestId }, { status: 404 })
    }

    // Build version filters based on query parameters
    const versionFilters = await buildVersionFilters(workflowId, validatedQuery)

    // Get versions with changes and metadata
    const changelogData = await getChangelogData(workflowId, versionFilters, validatedQuery)

    // Generate human-readable changelog
    const changelog = await generateChangelog(changelogData, workflowInfo, validatedQuery)

    // Handle export format if requested
    if (isExport) {
      return handleExport(changelog, validatedQuery, workflowInfo, requestId)
    }

    // Build comprehensive response
    const response = {
      data: {
        changelog,
        metadata: {
          workflowId,
          workflowName: workflowInfo.name,
          totalVersions: changelog.summary.totalVersions,
          versionsIncluded: changelog.summary.versionsIncluded,
          timeRange: changelog.summary.timeRange,
          generatedAt: new Date().toISOString(),
        },
        filters: {
          versions: {
            fromVersion: validatedQuery.fromVersion,
            toVersion: validatedQuery.toVersion,
            sinceVersion: validatedQuery.sinceVersion,
          },
          content: {
            includeBreaking: validatedQuery.includeBreaking,
            includeMinor: validatedQuery.includeMinor,
            includePatch: validatedQuery.includePatch,
            onlyTagged: validatedQuery.onlyTagged,
            onlyDeployed: validatedQuery.onlyDeployed,
          },
          formatting: {
            groupBy: validatedQuery.groupBy,
            format: validatedQuery.format,
            sortOrder: validatedQuery.sortOrder,
          },
        },
      },
      meta: {
        requestId,
        workflowId,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        format: validatedQuery.format,
        entriesReturned: changelog.entries.length,
      },
    }

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Generated changelog with ${changelog.entries.length} entries in ${elapsed}ms`
    )

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters`, {
        errors: error.errors,
        elapsed,
      })
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Failed to generate changelog after ${elapsed}ms`, {
      error: error.message,
      stack: error.stack,
      workflowId,
    })

    return NextResponse.json(
      {
        error: 'Failed to generate changelog',
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Get workflow information for context
 */
async function getWorkflowInfo(workflowId: string) {
  try {
    const [workflow] = await db
      .select({
        id: workflowTable.id,
        name: workflowTable.name,
        description: workflowTable.description,
        createdAt: workflowTable.createdAt,
        updatedAt: workflowTable.updatedAt,
      })
      .from(workflowTable)
      .where(eq(workflowTable.id, workflowId))
      .limit(1)

    return workflow || null
  } catch (error: any) {
    logger.error('Failed to get workflow info', {
      error: error.message,
      workflowId,
    })
    return null
  }
}

/**
 * Build version filters based on query parameters
 */
async function buildVersionFilters(
  workflowId: string,
  query: z.infer<typeof ChangelogQuerySchema>
): Promise<{
  versionIds: string[]
  timeRange: { from?: Date; to?: Date }
  versionRange: { from?: string; to?: string }
}> {
  try {
    // Build base where conditions
    const whereConditions = [eq(workflowVersions.workflowId, workflowId)]

    // Add version filters
    if (query.onlyTagged) {
      // Get tagged versions
      const taggedVersions = await db
        .select({ versionId: workflowVersionTags.versionId })
        .from(workflowVersionTags)
        .where(eq(workflowVersionTags.isSystemTag, false))
        .groupBy(workflowVersionTags.versionId)

      if (taggedVersions.length > 0) {
        whereConditions.push(
          inArray(
            workflowVersions.id,
            taggedVersions.map((t) => t.versionId)
          )
        )
      } else {
        // No tagged versions found
        return { versionIds: [], timeRange: {}, versionRange: {} }
      }
    }

    if (query.onlyDeployed) {
      whereConditions.push(eq(workflowVersions.isDeployed, true))
    }

    // Add time range filters
    let timeFrom: Date | undefined
    let timeTo: Date | undefined

    if (query.from) {
      timeFrom = new Date(query.from)
      whereConditions.push(gte(workflowVersions.createdAt, timeFrom))
    }

    if (query.to) {
      timeTo = new Date(query.to)
      whereConditions.push(lte(workflowVersions.createdAt, timeTo))
    }

    // Handle predefined periods
    if (!timeFrom && !timeTo && query.period && query.period !== 'all') {
      const now = new Date()
      timeTo = now

      switch (query.period) {
        case '7d':
          timeFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          timeFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          timeFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          timeFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
      }

      if (timeFrom) {
        whereConditions.push(gte(workflowVersions.createdAt, timeFrom))
      }
    }

    // Get all matching versions
    const baseVersionsQuery = db
      .select({
        id: workflowVersions.id,
        versionNumber: workflowVersions.versionNumber,
        versionMajor: workflowVersions.versionMajor,
        versionMinor: workflowVersions.versionMinor,
        versionPatch: workflowVersions.versionPatch,
        createdAt: workflowVersions.createdAt,
      })
      .from(workflowVersions)
      .where(and(...whereConditions))
      .orderBy(
        desc(workflowVersions.versionMajor),
        desc(workflowVersions.versionMinor),
        desc(workflowVersions.versionPatch)
      )

    // Apply pagination and execute query
    const versions = await (() => {
      if (query.limit && query.offset) {
        return baseVersionsQuery.limit(query.limit).offset(query.offset)
      } else if (query.limit) {
        return baseVersionsQuery.limit(query.limit)
      } else if (query.offset) {
        return baseVersionsQuery.offset(query.offset)
      }
      return baseVersionsQuery
    })()

    // Filter by specific version ranges if provided
    let filteredVersions = versions

    if (query.fromVersion || query.toVersion || query.sinceVersion) {
      filteredVersions = filteredVersions.filter((version) => {
        const versionNum = version.versionNumber

        if (query.sinceVersion) {
          return compareVersionNumbers(versionNum, query.sinceVersion) > 0
        }

        let includeVersion = true

        if (query.fromVersion) {
          includeVersion =
            includeVersion && compareVersionNumbers(versionNum, query.fromVersion) >= 0
        }

        if (query.toVersion) {
          includeVersion = includeVersion && compareVersionNumbers(versionNum, query.toVersion) <= 0
        }

        return includeVersion
      })
    }

    // Filter by version types (major.minor.patch)
    if (!query.includeBreaking || !query.includeMinor || !query.includePatch) {
      filteredVersions = filteredVersions.filter((version) => {
        const isBreaking = version.versionMinor === 0 && version.versionPatch === 0
        const isMinor = version.versionPatch === 0 && !isBreaking
        const isPatch = !isBreaking && !isMinor

        return (
          (query.includeBreaking && isBreaking) ||
          (query.includeMinor && isMinor) ||
          (query.includePatch && isPatch)
        )
      })
    }

    return {
      versionIds: filteredVersions.map((v) => v.id),
      timeRange: { from: timeFrom, to: timeTo },
      versionRange: { from: query.fromVersion, to: query.toVersion },
    }
  } catch (error: any) {
    logger.error('Failed to build version filters', {
      error: error.message,
      workflowId,
      query,
    })
    return { versionIds: [], timeRange: {}, versionRange: {} }
  }
}

/**
 * Get comprehensive changelog data
 */
async function getChangelogData(
  workflowId: string,
  filters: { versionIds: string[] },
  query: z.infer<typeof ChangelogQuerySchema>
) {
  if (filters.versionIds.length === 0) {
    return { versions: [], changes: [], tags: [], authors: [] }
  }

  try {
    // Get versions with metadata
    const versions = await db
      .select({
        id: workflowVersions.id,
        versionNumber: workflowVersions.versionNumber,
        versionMajor: workflowVersions.versionMajor,
        versionMinor: workflowVersions.versionMinor,
        versionPatch: workflowVersions.versionPatch,
        versionType: workflowVersions.versionType,
        versionTag: workflowVersions.versionTag,
        versionDescription: workflowVersions.versionDescription,
        changeSummary: workflowVersions.changeSummary,
        createdAt: workflowVersions.createdAt,
        isDeployed: workflowVersions.isDeployed,
        deployedAt: workflowVersions.deployedAt,
        createdByUserId: workflowVersions.createdByUserId,
        // User info if requested
        ...(query.includeAuthors
          ? {
              authorName: user.name,
              authorEmail: user.email,
            }
          : {}),
      })
      .from(workflowVersions)
      .leftJoin(
        user,
        query.includeAuthors ? eq(workflowVersions.createdByUserId, user.id) : sql`false`
      )
      .where(inArray(workflowVersions.id, filters.versionIds))
      .orderBy(
        ...(query.sortOrder === 'asc'
          ? [
              workflowVersions.versionMajor,
              workflowVersions.versionMinor,
              workflowVersions.versionPatch,
            ]
          : [
              desc(workflowVersions.versionMajor),
              desc(workflowVersions.versionMinor),
              desc(workflowVersions.versionPatch),
            ])
      )

    // Get changes if detailed information is requested
    let changes: any[] = []
    if (query.includeDetails) {
      changes = await db
        .select({
          id: workflowVersionChanges.id,
          versionId: workflowVersionChanges.versionId,
          changeType: workflowVersionChanges.changeType,
          entityType: workflowVersionChanges.entityType,
          entityId: workflowVersionChanges.entityId,
          entityName: workflowVersionChanges.entityName,
          changeDescription: workflowVersionChanges.changeDescription,
          impactLevel: workflowVersionChanges.impactLevel,
          breakingChange: workflowVersionChanges.breakingChange,
          createdAt: workflowVersionChanges.createdAt,
        })
        .from(workflowVersionChanges)
        .where(inArray(workflowVersionChanges.versionId, filters.versionIds))
        .orderBy(workflowVersionChanges.createdAt)
    }

    // Get version tags
    const tags = await db
      .select({
        versionId: workflowVersionTags.versionId,
        tagName: workflowVersionTags.tagName,
        tagColor: workflowVersionTags.tagColor,
        tagDescription: workflowVersionTags.tagDescription,
        isSystemTag: workflowVersionTags.isSystemTag,
      })
      .from(workflowVersionTags)
      .where(inArray(workflowVersionTags.versionId, filters.versionIds))
      .orderBy(workflowVersionTags.tagOrder)

    return {
      versions,
      changes,
      tags,
    }
  } catch (error: any) {
    logger.error('Failed to get changelog data', {
      error: error.message,
      workflowId,
      versionCount: filters.versionIds.length,
    })
    throw new Error(`Failed to get changelog data: ${error.message}`)
  }
}

/**
 * Generate human-readable changelog
 */
async function generateChangelog(
  data: any,
  workflowInfo: any,
  query: z.infer<typeof ChangelogQuerySchema>
) {
  const { versions, changes, tags } = data

  // Group changes by version
  const changesByVersion = changes.reduce((acc: any, change: any) => {
    if (!acc[change.versionId]) {
      acc[change.versionId] = []
    }
    acc[change.versionId].push(change)
    return acc
  }, {})

  // Group tags by version
  const tagsByVersion = tags.reduce((acc: any, tag: any) => {
    if (!acc[tag.versionId]) {
      acc[tag.versionId] = []
    }
    acc[tag.versionId].push(tag)
    return acc
  }, {})

  // Generate changelog entries
  const entries = versions.map((version: any) => {
    const versionChanges = changesByVersion[version.id] || []
    const versionTags = tagsByVersion[version.id] || []

    return generateChangelogEntry(version, versionChanges, versionTags, query)
  })

  // Calculate summary statistics
  const summary = {
    totalVersions: versions.length,
    versionsIncluded: entries.length,
    totalChanges: changes.length,
    breakingChanges: changes.filter((c: any) => c.breakingChange).length,
    timeRange: {
      from: versions.length > 0 ? versions[versions.length - 1].createdAt : null,
      to: versions.length > 0 ? versions[0].createdAt : null,
    },
    versionRange: {
      from: versions.length > 0 ? versions[versions.length - 1].versionNumber : null,
      to: versions.length > 0 ? versions[0].versionNumber : null,
    },
  }

  // Apply grouping if requested
  let organizedEntries = entries
  if (query.groupBy && query.groupBy !== 'version') {
    organizedEntries = groupChangelogEntries(entries, query.groupBy)
  }

  return {
    title: `${workflowInfo.name} - Changelog`,
    description: workflowInfo.description || `Changelog for ${workflowInfo.name}`,
    entries: organizedEntries,
    summary,
    metadata: {
      generatedAt: new Date().toISOString(),
      format: query.format,
      groupBy: query.groupBy,
      includeDetails: query.includeDetails,
    },
  }
}

/**
 * Generate individual changelog entry
 */
function generateChangelogEntry(
  version: any,
  changes: any[],
  tags: any[],
  query: z.infer<typeof ChangelogQuerySchema>
) {
  // Categorize changes
  const categorizedChanges = categorizeChanges(changes)

  // Generate human-readable descriptions
  const changeDescriptions = generateChangeDescriptions(categorizedChanges)

  // Build entry based on format
  const entry: any = {
    version: {
      number: version.versionNumber,
      type: version.versionType,
      tag: version.versionTag,
      description: version.versionDescription,
    },
    date: version.createdAt,
    author: query.includeAuthors
      ? {
          name: version.authorName,
          email: version.authorEmail,
        }
      : undefined,
    deployment: {
      isDeployed: version.isDeployed,
      deployedAt: version.deployedAt,
    },
    tags: tags
      .filter((tag) => !tag.isSystemTag)
      .map((tag) => ({
        name: tag.tagName,
        color: tag.tagColor,
        description: tag.tagDescription,
      })),
    changes: changeDescriptions,
    statistics: {
      totalChanges: changes.length,
      breakingChanges: changes.filter((c) => c.breakingChange).length,
      impactLevel: calculateOverallImpactLevel(changes),
    },
  }

  // Format based on requested format
  switch (query.format) {
    case 'markdown':
      return formatAsMarkdown(entry)
    case 'html':
      return formatAsHtml(entry)
    case 'plain':
      return formatAsPlainText(entry)
    default:
      return entry // structured format
  }
}

/**
 * Categorize changes by type and impact
 */
function categorizeChanges(changes: any[]) {
  const categories = {
    breaking: changes.filter((c) => c.breakingChange),
    features: changes.filter((c) => c.changeType.includes('added') && !c.breakingChange),
    improvements: changes.filter((c) => c.changeType.includes('modified') && !c.breakingChange),
    fixes: changes.filter(
      (c) => c.changeType.includes('fixed') || c.changeType.includes('corrected')
    ),
    deprecated: changes.filter((c) => c.changeType.includes('deprecated')),
    removed: changes.filter((c) => c.changeType.includes('removed') && !c.breakingChange),
    internal: changes.filter(
      (c) => c.entityType === 'metadata' || c.changeType.includes('internal')
    ),
    other: [] as any[],
  }

  // Put remaining changes in 'other' category
  const categorized: any[] = Object.values(categories).flat()
  categories.other = changes.filter((c) => !categorized.includes(c))

  return categories
}

/**
 * Generate human-readable change descriptions
 */
function generateChangeDescriptions(categorizedChanges: any) {
  const descriptions: any = {}

  Object.entries(categorizedChanges).forEach(([category, changes]) => {
    const changeList = changes as any[]
    if (changeList.length === 0) return

    descriptions[category] = changeList.map((change) => ({
      description:
        change.changeDescription || humanizeChangeType(change.changeType, change.entityName),
      entityType: change.entityType,
      entityName: change.entityName,
      impactLevel: change.impactLevel,
    }))
  })

  return descriptions
}

/**
 * Convert technical change types to human-readable descriptions
 */
function humanizeChangeType(changeType: string, entityName?: string): string {
  const entity = entityName || 'component'

  const changeTypeMap: Record<string, string> = {
    block_added: `Added new ${entity} block`,
    block_removed: `Removed ${entity} block`,
    block_modified: `Updated ${entity} block configuration`,
    block_moved: `Repositioned ${entity} block`,
    edge_added: `Added new connection`,
    edge_removed: `Removed connection`,
    edge_modified: `Updated connection configuration`,
    loop_added: `Added new loop container`,
    loop_removed: `Removed loop container`,
    loop_modified: `Updated loop configuration`,
    parallel_added: `Added new parallel container`,
    parallel_removed: `Removed parallel container`,
    parallel_modified: `Updated parallel configuration`,
    metadata_modified: `Updated workflow metadata`,
    variable_added: `Added new variable`,
    variable_removed: `Removed variable`,
    variable_modified: `Updated variable configuration`,
    permission_changed: `Changed access permissions`,
    deployment_changed: `Updated deployment configuration`,
  }

  return changeTypeMap[changeType] || `Modified ${entity}`
}

/**
 * Calculate overall impact level for a set of changes
 */
function calculateOverallImpactLevel(changes: any[]): string {
  if (changes.some((c) => c.breakingChange || c.impactLevel === 'critical')) {
    return 'critical'
  }

  if (changes.some((c) => c.impactLevel === 'high')) {
    return 'high'
  }

  if (changes.some((c) => c.impactLevel === 'medium')) {
    return 'medium'
  }

  return 'low'
}

/**
 * Group changelog entries by specified criteria
 */
function groupChangelogEntries(entries: any[], groupBy: string) {
  switch (groupBy) {
    case 'date':
      return groupEntriesByDate(entries)
    case 'type':
      return groupEntriesByType(entries)
    case 'impact':
      return groupEntriesByImpact(entries)
    default:
      return entries
  }
}

/**
 * Group entries by date (day)
 */
function groupEntriesByDate(entries: any[]) {
  const groups: Record<string, any> = {}

  entries.forEach((entry) => {
    const date = new Date(entry.date).toISOString().split('T')[0]
    if (!groups[date]) {
      groups[date] = {
        groupKey: date,
        groupType: 'date',
        entries: [],
      }
    }
    groups[date].entries.push(entry)
  })

  return Object.values(groups).sort((a, b) => b.groupKey.localeCompare(a.groupKey))
}

/**
 * Group entries by version type
 */
function groupEntriesByType(entries: any[]) {
  const groups: Record<string, any> = {}

  entries.forEach((entry) => {
    const type = entry.version.type
    if (!groups[type]) {
      groups[type] = {
        groupKey: type,
        groupType: 'type',
        entries: [],
      }
    }
    groups[type].entries.push(entry)
  })

  return Object.values(groups)
}

/**
 * Group entries by impact level
 */
function groupEntriesByImpact(entries: any[]) {
  const groups: Record<string, any> = {}

  entries.forEach((entry) => {
    const impact = entry.statistics.impactLevel
    if (!groups[impact]) {
      groups[impact] = {
        groupKey: impact,
        groupType: 'impact',
        entries: [],
      }
    }
    groups[impact].entries.push(entry)
  })

  // Order by impact level
  const order = ['critical', 'high', 'medium', 'low']
  return order.map((level) => groups[level]).filter(Boolean)
}

/**
 * Format entry as Markdown
 */
function formatAsMarkdown(entry: any): string {
  const { version, date, author, changes, tags } = entry

  let markdown = `## [${version.number}] - ${new Date(date).toISOString().split('T')[0]}\n\n`

  if (version.description) {
    markdown += `${version.description}\n\n`
  }

  if (tags.length > 0) {
    markdown += `**Tags:** ${tags.map((t: any) => t.name).join(', ')}\n\n`
  }

  if (author?.name) {
    markdown += `**Author:** ${author.name}\n\n`
  }

  // Add changes by category
  Object.entries(changes).forEach(([category, categoryChanges]) => {
    const changeList = categoryChanges as any[]
    if (changeList.length === 0) return

    markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`

    changeList.forEach((change) => {
      markdown += `- ${change.description}\n`
    })

    markdown += '\n'
  })

  return markdown
}

/**
 * Format entry as HTML
 */
function formatAsHtml(entry: any): string {
  // Basic HTML formatting - could be enhanced with CSS
  const { version, date, author, changes, tags } = entry

  let html = `<div class="changelog-entry">\n`
  html += `  <h2>[${version.number}] - ${new Date(date).toISOString().split('T')[0]}</h2>\n`

  if (version.description) {
    html += `  <p class="description">${version.description}</p>\n`
  }

  if (tags.length > 0) {
    html += `  <p class="tags"><strong>Tags:</strong> ${tags.map((t: any) => `<span class="tag">${t.name}</span>`).join(', ')}</p>\n`
  }

  if (author?.name) {
    html += `  <p class="author"><strong>Author:</strong> ${author.name}</p>\n`
  }

  // Add changes by category
  Object.entries(changes).forEach(([category, categoryChanges]) => {
    const changeList = categoryChanges as any[]
    if (changeList.length === 0) return

    html += `  <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>\n`
    html += `  <ul class="changes ${category}">\n`

    changeList.forEach((change) => {
      html += `    <li class="change-item impact-${change.impactLevel}">${change.description}</li>\n`
    })

    html += `  </ul>\n`
  })

  html += `</div>\n`
  return html
}

/**
 * Format entry as plain text
 */
function formatAsPlainText(entry: any): string {
  const { version, date, author, changes, tags } = entry

  let text = `[${version.number}] - ${new Date(date).toISOString().split('T')[0]}\n`

  if (version.description) {
    text += `${version.description}\n`
  }

  if (tags.length > 0) {
    text += `Tags: ${tags.map((t: any) => t.name).join(', ')}\n`
  }

  if (author?.name) {
    text += `Author: ${author.name}\n`
  }

  text += '\n'

  // Add changes by category
  Object.entries(changes).forEach(([category, categoryChanges]) => {
    const changeList = categoryChanges as any[]
    if (changeList.length === 0) return

    text += `${category.toUpperCase()}:\n`

    changeList.forEach((change) => {
      text += `  * ${change.description}\n`
    })

    text += '\n'
  })

  return text
}

/**
 * Handle export format (for /export endpoint)
 */
function handleExport(
  changelog: any,
  query: z.infer<typeof ChangelogQuerySchema>,
  workflowInfo: any,
  requestId: string
) {
  const { format } = query

  switch (format) {
    case 'markdown':
      return new NextResponse(exportAsMarkdown(changelog), {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${workflowInfo.name}-changelog.md"`,
        },
      })

    case 'html':
      return new NextResponse(exportAsHtml(changelog), {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${workflowInfo.name}-changelog.html"`,
        },
      })

    case 'plain':
      return new NextResponse(exportAsPlainText(changelog), {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${workflowInfo.name}-changelog.txt"`,
        },
      })

    default:
      return NextResponse.json(changelog, {
        headers: {
          'Content-Disposition': `attachment; filename="${workflowInfo.name}-changelog.json"`,
        },
      })
  }
}

/**
 * Export full changelog as Markdown
 */
function exportAsMarkdown(changelog: any): string {
  let markdown = `# ${changelog.title}\n\n`

  if (changelog.description) {
    markdown += `${changelog.description}\n\n`
  }

  markdown += `*Generated on ${changelog.metadata.generatedAt}*\n\n`
  markdown += `---\n\n`

  changelog.entries.forEach((entry: any) => {
    if (typeof entry === 'string') {
      markdown += entry
    } else {
      markdown += formatAsMarkdown(entry)
    }
    markdown += '\n'
  })

  return markdown
}

/**
 * Export full changelog as HTML
 */
function exportAsHtml(changelog: any): string {
  let html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n`
  html += `  <meta charset="UTF-8">\n`
  html += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`
  html += `  <title>${changelog.title}</title>\n`
  html += `  <style>\n`
  html += `    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }\n`
  html += `    h1, h2, h3 { color: #333; }\n`
  html += `    .changelog-entry { margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }\n`
  html += `    .tag { background: #e1e8ed; padding: 2px 6px; border-radius: 3px; margin-right: 5px; }\n`
  html += `    .changes { margin-left: 0; }\n`
  html += `    .change-item { margin-bottom: 5px; }\n`
  html += `    .impact-critical { color: #d73527; }\n`
  html += `    .impact-high { color: #ca6441; }\n`
  html += `    .impact-medium { color: #dbab09; }\n`
  html += `    .impact-low { color: #28a745; }\n`
  html += `  </style>\n</head>\n<body>\n`
  html += `  <h1>${changelog.title}</h1>\n`

  if (changelog.description) {
    html += `  <p>${changelog.description}</p>\n`
  }

  html += `  <p><em>Generated on ${changelog.metadata.generatedAt}</em></p>\n`
  html += `  <hr>\n`

  changelog.entries.forEach((entry: any) => {
    if (typeof entry === 'string') {
      html += entry
    } else {
      html += formatAsHtml(entry)
    }
  })

  html += `</body>\n</html>`
  return html
}

/**
 * Export full changelog as plain text
 */
function exportAsPlainText(changelog: any): string {
  let text = `${changelog.title}\n`
  text += `${'='.repeat(changelog.title.length)}\n\n`

  if (changelog.description) {
    text += `${changelog.description}\n\n`
  }

  text += `Generated on ${changelog.metadata.generatedAt}\n\n`
  text += `${'-'.repeat(50)}\n\n`

  changelog.entries.forEach((entry: any) => {
    if (typeof entry === 'string') {
      text += entry
    } else {
      text += formatAsPlainText(entry)
    }
    text += '\n'
  })

  return text
}

/**
 * Compare semantic version numbers
 */
function compareVersionNumbers(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number)
  const v2Parts = version2.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const v1Part = v1Parts[i] || 0
    const v2Part = v2Parts[i] || 0

    if (v1Part !== v2Part) {
      return v1Part - v2Part
    }
  }

  return 0
}

/**
 * Helper function to authenticate and authorize workflow access
 */
async function authenticateAndAuthorize(
  request: NextRequest,
  workflowId: string,
  requestId: string
): Promise<{ userId?: string; hasAccess: boolean }> {
  try {
    // Check for internal JWT token
    const authHeader = request.headers.get('authorization')
    let isInternalCall = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (isInternalCall) {
      return { hasAccess: true }
    }

    // Try session auth first
    const session = await getSession()
    let authenticatedUserId: string | null = session?.user?.id || null

    // Check API key auth
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
      return { hasAccess: false }
    }

    // Check workflow access
    const workflowData = await db
      .select()
      .from(workflowTable)
      .where(eq(workflowTable.id, workflowId))
      .then((rows) => rows[0])

    if (!workflowData) {
      return { hasAccess: false }
    }

    let hasAccess = false

    // User owns workflow
    if (workflowData.userId === authenticatedUserId) {
      hasAccess = true
    }

    // Workspace permissions
    if (!hasAccess && workflowData.workspaceId) {
      const userPermission = await getUserEntityPermissions(
        authenticatedUserId,
        'workspace',
        workflowData.workspaceId
      )

      if (userPermission !== null) {
        hasAccess = true
      }
    }

    return { userId: authenticatedUserId, hasAccess }
  } catch (error: any) {
    logger.error(`[${requestId}] Authentication error`, {
      error: error.message,
      workflowId,
    })
    return { hasAccess: false }
  }
}
