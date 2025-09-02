/**
 * Workflow Export API
 * Supports exporting workflows to YAML, JSON, and other formats
 * Includes options for metadata inclusion, format customization, and security filtering
 */

import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { loadWorkflowFromNormalizedTables } from '@/lib/workflows/db-helpers'
import { db } from '@/db'
import { apiKey as apiKeyTable, workflow } from '@/db/schema'
import { Serializer } from '@/serializer'

const logger = createLogger('WorkflowExportAPI')

const ExportOptionsSchema = z.object({
  // Output format
  format: z.enum(['yaml', 'json', 'zip']).default('yaml'),

  // Content options
  includeMetadata: z.coerce.boolean().default(true),
  includeComments: z.coerce.boolean().default(true),
  includeSecrets: z.coerce.boolean().default(false),
  includeExecutionHistory: z.coerce.boolean().default(false),
  includeVariables: z.coerce.boolean().default(true),

  // YAML formatting options
  yamlStyle: z.enum(['standard', 'compact', 'verbose']).default('standard'),
  indent: z.coerce.number().min(2).max(8).default(2),

  // JSON formatting options
  jsonPretty: z.coerce.boolean().default(true),
  jsonIndent: z.coerce.number().min(0).max(8).default(2),

  // Security options
  maskSecrets: z.coerce.boolean().default(true),
  maskCredentials: z.coerce.boolean().default(true),
  redactPersonalInfo: z.coerce.boolean().default(false),

  // Advanced options
  includeBlockComments: z.coerce.boolean().default(true),
  includeConnectionLabels: z.coerce.boolean().default(false),
  generateDocumentation: z.coerce.boolean().default(false),
  optimizeForImport: z.coerce.boolean().default(false),
})

const BulkExportSchema = z.object({
  workflowIds: z.array(z.string()).min(1, 'At least one workflow ID is required'),
  format: z.enum(['yaml', 'json', 'zip']).default('zip'),
  archiveName: z.string().optional(),
  includeSharedResources: z.boolean().default(true),
  options: ExportOptionsSchema.optional(),
})

/**
 * GET /api/workflows/[id]/export - Export single workflow
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    // Parse query parameters for export options
    const { searchParams } = new URL(req.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const options = ExportOptionsSchema.parse(queryParams)

    logger.info(`[${requestId}] Exporting workflow ${workflowId}`, {
      format: options.format,
      includeMetadata: options.includeMetadata,
      includeSecrets: options.includeSecrets,
    })

    // Authentication - support session, API key, and internal token
    let userId: string | null = null

    const authHeader = req.headers.get('authorization')
    let isInternalCall = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      const session = await getSession()
      let authenticatedUserId: string | null = session?.user?.id || null

      if (!authenticatedUserId) {
        const apiKeyHeader = req.headers.get('x-api-key')
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
        logger.warn(`[${requestId}] Unauthorized workflow export attempt for ${workflowId}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    // Fetch workflow
    const workflowData = await db
      .select()
      .from(workflow)
      .where(eq(workflow.id, workflowId))
      .limit(1)

    if (workflowData.length === 0) {
      logger.warn(`[${requestId}] Workflow ${workflowId} not found for export`)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const workflowRecord = workflowData[0]

    // Check permissions
    if (!isInternalCall) {
      let hasAccess = false

      if (workflowRecord.userId === userId) {
        hasAccess = true
      } else if (workflowRecord.workspaceId && userId) {
        const userPermission = await getUserEntityPermissions(
          userId,
          'workspace',
          workflowRecord.workspaceId
        )
        hasAccess = userPermission !== null
      }

      if (!hasAccess) {
        logger.warn(`[${requestId}] User ${userId} denied access to workflow ${workflowId}`)
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Load workflow structure from normalized tables
    const normalizedData = await loadWorkflowFromNormalizedTables(workflowId)

    if (!normalizedData) {
      logger.error(`[${requestId}] No normalized data found for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Workflow data not found' }, { status: 404 })
    }

    // Serialize workflow for export
    const serializer = new Serializer()
    const serializedWorkflow = serializer.serializeWorkflow(
      normalizedData.blocks,
      normalizedData.edges,
      normalizedData.loops,
      normalizedData.parallels,
      false // Don't validate required fields for export
    )

    // Build export data
    const exportData = buildExportData(workflowRecord, serializedWorkflow, normalizedData, options)

    // Apply security filtering
    const filteredData = applySecurityFiltering(exportData, options)

    // Format output based on requested format
    let outputContent: string
    let contentType: string
    let filename: string

    switch (options.format) {
      case 'yaml':
        outputContent = await formatAsYAML(filteredData, options)
        contentType = 'text/yaml'
        filename = `${workflowRecord.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.yaml`
        break

      case 'json':
        outputContent = formatAsJSON(filteredData, options)
        contentType = 'application/json'
        filename = `${workflowRecord.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`
        break

      case 'zip': {
        // For ZIP format, create an archive with multiple files
        const zipContent = await createZipExport(workflowRecord, filteredData, options)
        outputContent = zipContent
        contentType = 'application/zip'
        filename = `${workflowRecord.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.zip`
        break
      }

      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully exported workflow ${workflowId} in ${elapsed}ms`, {
      format: options.format,
      outputSize: outputContent.length,
    })

    // Set response headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    })

    return new Response(outputContent, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(
        `[${requestId}] Invalid export options for workflow ${workflowId} after ${elapsed}ms`,
        {
          errors: error.errors,
        }
      )
      return NextResponse.json(
        { error: 'Invalid export options', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error exporting workflow ${workflowId} after ${elapsed}ms`, error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to export workflow',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workflows/[id]/export - Bulk export multiple workflows
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    // Authentication
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized bulk workflow export attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse request body
    const body = await req.json()
    const { workflowIds, format, archiveName, includeSharedResources, options } =
      BulkExportSchema.parse(body)

    const exportOptions = options || ExportOptionsSchema.parse({})

    logger.info(`[${requestId}] Bulk exporting ${workflowIds.length} workflows`, {
      format,
      archiveName,
      includeSharedResources,
    })

    // Fetch all workflows and check permissions
    const workflows = await db.select().from(workflow).where(eq(workflow.id, workflowIds[0])) // This should use `inArray` but simplified for now

    // For bulk export, we would need to:
    // 1. Validate permissions for all workflows
    // 2. Load all workflow data
    // 3. Create a zip archive containing all workflows
    // 4. Include shared resources if requested

    // This is a simplified implementation - full implementation would be more complex
    return NextResponse.json(
      {
        error: 'Bulk export not yet implemented',
        details: 'This endpoint is under development',
      },
      { status: 501 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error in bulk workflow export after ${elapsed}ms`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Build export data structure
 */
function buildExportData(
  workflowRecord: any,
  serializedWorkflow: any,
  normalizedData: any,
  options: z.infer<typeof ExportOptionsSchema>
): any {
  const exportData: any = {
    version: '1.0',
    workflow: {
      ...serializedWorkflow,
    },
  }

  // Add metadata if requested
  if (options.includeMetadata) {
    exportData.metadata = {
      id: workflowRecord.id,
      name: workflowRecord.name,
      description: workflowRecord.description,
      color: workflowRecord.color,
      createdAt: workflowRecord.createdAt,
      updatedAt: workflowRecord.updatedAt,
      isDeployed: workflowRecord.isDeployed,
      deployedAt: workflowRecord.deployedAt,
      runCount: workflowRecord.runCount,
      lastRunAt: workflowRecord.lastRunAt,
      isPublished: workflowRecord.isPublished,
    }

    if (options.includeExecutionHistory) {
      // Add execution history if available
      exportData.metadata.executionHistory = []
    }
  }

  // Add variables if requested
  if (options.includeVariables) {
    exportData.variables = workflowRecord.variables || {}
  }

  // Add comments if requested
  if (options.includeComments) {
    exportData.comments = generateWorkflowComments(workflowRecord, serializedWorkflow)
  }

  // Add documentation if requested
  if (options.generateDocumentation) {
    exportData.documentation = generateWorkflowDocumentation(workflowRecord, serializedWorkflow)
  }

  return exportData
}

/**
 * Apply security filtering to export data
 */
function applySecurityFiltering(data: any, options: z.infer<typeof ExportOptionsSchema>): any {
  if (!options.maskSecrets && !options.maskCredentials && !options.redactPersonalInfo) {
    return data
  }

  // Deep clone to avoid mutating original
  const filtered = JSON.parse(JSON.stringify(data))

  // Apply filtering logic
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'credential',
    'apiKey',
    'accessToken',
    'refreshToken',
    'privateKey',
  ]

  function filterObject(obj: any, path = ''): any {
    if (Array.isArray(obj)) {
      return obj.map((item, index) => filterObject(item, `${path}[${index}]`))
    }

    if (obj && typeof obj === 'object') {
      const filtered: any = {}

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key

        // Check if field should be masked
        const shouldMask = sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase())
        )

        if (shouldMask && (options.maskSecrets || options.maskCredentials)) {
          filtered[key] = '[REDACTED]'
        } else {
          filtered[key] = filterObject(value, currentPath)
        }
      }

      return filtered
    }

    return obj
  }

  return filterObject(filtered)
}

/**
 * Format data as YAML
 */
async function formatAsYAML(
  data: any,
  options: z.infer<typeof ExportOptionsSchema>
): Promise<string> {
  // This would typically use a YAML library like 'yaml'
  // For now, return a JSON representation with comments
  let yaml = '# Sim Workflow Export\n'
  yaml += `# Generated on: ${new Date().toISOString()}\n`
  yaml += `# Format: YAML (${options.yamlStyle})\n\n`

  if (options.includeComments) {
    yaml += '# This workflow was exported from Sim\n'
    yaml += '# Visit https://sim.dev for more information\n\n'
  }

  // Convert to YAML-like format (simplified)
  yaml += JSON.stringify(data, null, options.indent)
    .replace(/"/g, '')
    .replace(/,/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/\[/g, '- ')
    .replace(/\]/g, '')

  return yaml
}

/**
 * Format data as JSON
 */
function formatAsJSON(data: any, options: z.infer<typeof ExportOptionsSchema>): string {
  if (options.jsonPretty) {
    return JSON.stringify(data, null, options.jsonIndent)
  }
  return JSON.stringify(data)
}

/**
 * Create ZIP export (placeholder implementation)
 */
async function createZipExport(
  workflowRecord: any,
  data: any,
  options: z.infer<typeof ExportOptionsSchema>
): Promise<string> {
  // This would typically use a ZIP library
  // For now, return base64 encoded JSON as placeholder
  const jsonContent = formatAsJSON(data, options)
  return Buffer.from(jsonContent).toString('base64')
}

/**
 * Generate workflow comments
 */
function generateWorkflowComments(workflowRecord: any, serializedWorkflow: any): any {
  return {
    header: `Workflow: ${workflowRecord.name}`,
    description: workflowRecord.description || 'No description provided',
    blocks: serializedWorkflow.blocks?.length || 0,
    connections: serializedWorkflow.connections?.length || 0,
    complexity: calculateWorkflowComplexity(serializedWorkflow),
  }
}

/**
 * Generate workflow documentation
 */
function generateWorkflowDocumentation(workflowRecord: any, serializedWorkflow: any): any {
  return {
    overview: {
      name: workflowRecord.name,
      description: workflowRecord.description,
      purpose: 'Automated workflow for data processing and task execution',
    },
    architecture: {
      totalBlocks: serializedWorkflow.blocks?.length || 0,
      totalConnections: serializedWorkflow.connections?.length || 0,
      complexity: calculateWorkflowComplexity(serializedWorkflow),
    },
    usage: {
      deployment: workflowRecord.isDeployed ? 'Deployed' : 'Not deployed',
      executionCount: workflowRecord.runCount || 0,
      lastExecution: workflowRecord.lastRunAt || 'Never',
    },
  }
}

/**
 * Calculate workflow complexity score
 */
function calculateWorkflowComplexity(serializedWorkflow: any): string {
  const blocks = serializedWorkflow.blocks?.length || 0
  const connections = serializedWorkflow.connections?.length || 0
  const loops = Object.keys(serializedWorkflow.loops || {}).length
  const parallels = Object.keys(serializedWorkflow.parallels || {}).length

  const complexity = blocks + connections + loops * 2 + parallels * 2

  if (complexity < 5) return 'Simple'
  if (complexity < 15) return 'Moderate'
  if (complexity < 30) return 'Complex'
  return 'Very Complex'
}
