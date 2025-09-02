/**
 * Workflow Version Comparison API Endpoints
 * 
 * Advanced version comparison API with comprehensive diff generation:
 * - POST /api/workflows/[id]/versions/[versionId]/compare - Compare two workflow versions
 * 
 * This API provides sophisticated version comparison capabilities including:
 * - Granular change detection for blocks, edges, loops, and parallels
 * - Conflict detection and resolution strategies
 * - Multiple output formats: HTML, unified diff, side-by-side, JSON
 * - Visual diff generation with customizable themes
 * - Breaking change analysis and impact assessment
 * - Performance optimizations for large workflows
 * - Comprehensive logging and error handling
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { 
  WorkflowVersionManager,
  generateHtmlDiff,
  generateUnifiedDiff,
  generateSideBySideDiff,
  type VersionDiff
} from '@/lib/workflows/versioning'
import { db } from '@/db'
import { 
  workflow as workflowTable, 
  apiKey as apiKeyTable,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

const logger = createLogger('WorkflowVersionComparisonAPI')

// Version comparison request schema
const VersionComparisonRequestSchema = z.object({
  targetVersionId: z.string().uuid(),
  options: z.object({
    // Diff options
    includeMetadata: z.boolean().default(true),
    diffFormat: z.enum(['detailed', 'summary', 'minimal']).default('detailed'),
    
    // Output format options
    outputFormat: z.enum(['json', 'html', 'unified', 'side-by-side']).default('json'),
    
    // HTML-specific options
    htmlOptions: z.object({
      includeContext: z.boolean().default(true),
      highlightBreaking: z.boolean().default(true),
      theme: z.enum(['light', 'dark']).default('light'),
    }).optional(),
    
    // Unified diff options
    unifiedOptions: z.object({
      contextLines: z.number().min(0).max(10).default(3),
    }).optional(),
    
    // Side-by-side options
    sideBySideOptions: z.object({
      width: z.number().min(40).max(200).default(80),
      tabSize: z.number().min(1).max(8).default(2),
    }).optional(),
    
    // Performance options
    enableConflictDetection: z.boolean().default(true),
    optimizeForLargeWorkflows: z.boolean().default(false),
  }).default({}),
})

/**
 * POST /api/workflows/[id]/versions/[versionId]/compare
 * 
 * Compare the specified version with another version and generate comprehensive diff.
 * Supports multiple output formats including visual HTML, unified diff, and side-by-side.
 * 
 * Request Body:
 * - targetVersionId: Version ID to compare against (required)
 * - options: Comparison and formatting options
 *   - includeMetadata: Include version metadata in comparison (default: true)
 *   - diffFormat: Level of detail (detailed, summary, minimal, default: detailed)
 *   - outputFormat: Response format (json, html, unified, side-by-side, default: json)
 *   - htmlOptions: HTML-specific formatting options
 *   - unifiedOptions: Unified diff formatting options
 *   - sideBySideOptions: Side-by-side diff formatting options
 *   - enableConflictDetection: Detect and analyze conflicts (default: true)
 *   - optimizeForLargeWorkflows: Enable performance optimizations (default: false)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId, versionId: sourceVersionId } = await params

  try {
    logger.info(`[${requestId}] Comparing workflow versions`, {
      workflowId,
      sourceVersionId,
    })

    // Authentication and authorization check
    const { userId, hasAccess } = await authenticateAndAuthorize(request, workflowId, requestId)
    if (!hasAccess) {
      logger.warn(`[${requestId}] Access denied for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const comparisonRequest = VersionComparisonRequestSchema.parse(body)
    const { targetVersionId, options } = comparisonRequest

    logger.debug(`[${requestId}] Version comparison request`, {
      sourceVersionId,
      targetVersionId,
      outputFormat: options.outputFormat,
      diffFormat: options.diffFormat,
    })

    // Initialize version manager and perform comparison
    const versionManager = new WorkflowVersionManager()
    
    const diff = await versionManager.compareVersions(
      workflowId,
      sourceVersionId,
      targetVersionId,
      {
        sourceVersionId,
        targetVersionId,
        includeMetadata: options.includeMetadata,
        diffFormat: options.diffFormat,
      }
    )

    // Generate output based on requested format
    const formattedOutput = await generateComparisonOutput(
      diff,
      options,
      requestId
    )

    // Build response based on output format
    const response = buildComparisonResponse(
      diff,
      formattedOutput,
      options,
      {
        requestId,
        workflowId,
        sourceVersionId,
        targetVersionId,
        processingTimeMs: Date.now() - startTime,
        userId,
      }
    )

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Version comparison completed in ${elapsed}ms`, {
      outputFormat: options.outputFormat,
      changeCount: diff.changes.length,
      conflictCount: diff.conflicts?.length || 0,
      responseSize: JSON.stringify(response).length,
    })

    // Set appropriate content-type based on output format
    const headers = getResponseHeaders(options.outputFormat)

    return NextResponse.json(response, { status: 200, headers })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid comparison request`, {
        errors: error.errors,
        elapsed,
      })
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.errors,
          requestId 
        }, 
        { status: 400 }
      )
    }

    // Handle specific comparison errors
    if (error.message.includes('not found')) {
      logger.warn(`[${requestId}] Version not found`, { error: error.message })
      return NextResponse.json(
        { 
          error: 'Version not found', 
          requestId,
          details: error.message
        }, 
        { status: 404 }
      )
    }

    if (error.message.includes('same version')) {
      logger.warn(`[${requestId}] Attempt to compare version with itself`)
      return NextResponse.json(
        { 
          error: 'Cannot compare version with itself', 
          requestId,
          suggestion: 'Provide two different version IDs for comparison'
        }, 
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Failed to compare versions after ${elapsed}ms`, {
      error: error.message,
      stack: error.stack,
      workflowId,
      sourceVersionId,
    })

    return NextResponse.json(
      { 
        error: 'Failed to compare versions', 
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    )
  }
}

/**
 * Generate comparison output in the requested format
 */
async function generateComparisonOutput(
  diff: VersionDiff,
  options: z.infer<typeof VersionComparisonRequestSchema>['options'],
  requestId: string
) {
  const outputStartTime = Date.now()
  
  try {
    switch (options.outputFormat) {
      case 'html':
        const htmlOutput = generateHtmlDiff(diff, options.htmlOptions)
        logger.debug(`[${requestId}] Generated HTML diff in ${Date.now() - outputStartTime}ms`, {
          htmlLength: htmlOutput.length,
        })
        return htmlOutput

      case 'unified':
        const unifiedOutput = generateUnifiedDiff(diff, options.unifiedOptions)
        logger.debug(`[${requestId}] Generated unified diff in ${Date.now() - outputStartTime}ms`, {
          unifiedLength: unifiedOutput.length,
        })
        return unifiedOutput

      case 'side-by-side':
        const sideBySideOutput = generateSideBySideDiff(diff, options.sideBySideOptions)
        logger.debug(`[${requestId}] Generated side-by-side diff in ${Date.now() - outputStartTime}ms`)
        return sideBySideOutput

      case 'json':
      default:
        // JSON format returns the raw diff object
        return diff
    }
  } catch (error: any) {
    logger.error(`[${requestId}] Failed to generate ${options.outputFormat} output`, {
      error: error.message,
      outputFormat: options.outputFormat,
    })
    throw new Error(`Failed to generate ${options.outputFormat} output: ${error.message}`)
  }
}

/**
 * Build appropriate response based on output format
 */
function buildComparisonResponse(
  diff: VersionDiff,
  formattedOutput: any,
  options: z.infer<typeof VersionComparisonRequestSchema>['options'],
  metadata: {
    requestId: string;
    workflowId: string;
    sourceVersionId: string;
    targetVersionId: string;
    processingTimeMs: number;
    userId?: string;
  }
) {
  const baseResponse = {
    meta: {
      requestId: metadata.requestId,
      workflowId: metadata.workflowId,
      sourceVersionId: metadata.sourceVersionId,
      targetVersionId: metadata.targetVersionId,
      timestamp: new Date().toISOString(),
      processingTimeMs: metadata.processingTimeMs,
      outputFormat: options.outputFormat,
      userId: metadata.userId,
    },
    summary: {
      totalChanges: diff.changes.length,
      breakingChanges: diff.summary.breakingChanges,
      conflictCount: diff.conflicts?.length || 0,
      impactLevel: diff.summary.impactLevel,
      changesByType: {
        blockChanges: diff.summary.blockChanges,
        edgeChanges: diff.summary.edgeChanges,
        loopChanges: diff.summary.loopChanges || 0,
        parallelChanges: diff.summary.parallelChanges || 0,
      },
    },
  }

  switch (options.outputFormat) {
    case 'html':
      return {
        ...baseResponse,
        data: {
          htmlDiff: formattedOutput,
          contentType: 'text/html',
        },
      }

    case 'unified':
      return {
        ...baseResponse,
        data: {
          unifiedDiff: formattedOutput,
          contentType: 'text/plain',
        },
      }

    case 'side-by-side':
      return {
        ...baseResponse,
        data: {
          sideBySideDiff: formattedOutput,
          contentType: 'text/plain',
        },
      }

    case 'json':
    default:
      return {
        ...baseResponse,
        data: {
          diff: formattedOutput,
          contentType: 'application/json',
        },
      }
  }
}

/**
 * Get response headers based on output format
 */
function getResponseHeaders(outputFormat: string): Record<string, string> {
  const headers: Record<string, string> = {}

  switch (outputFormat) {
    case 'html':
      headers['X-Content-Format'] = 'html'
      break
    case 'unified':
    case 'side-by-side':
      headers['X-Content-Format'] = 'text'
      break
    case 'json':
    default:
      headers['X-Content-Format'] = 'json'
      break
  }

  return headers
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

    // Workspace permissions (read access sufficient for comparison)
    if (!hasAccess && workflowData.workspaceId) {
      const userPermission = await getUserEntityPermissions(
        authenticatedUserId,
        'workspace',
        workflowData.workspaceId
      )
      
      if (userPermission !== null) {
        hasAccess = true // Read access is sufficient for version comparison
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