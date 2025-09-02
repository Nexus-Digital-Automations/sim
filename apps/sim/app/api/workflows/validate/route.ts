/**
 * Comprehensive Workflow Validation API
 * Validates workflow definitions without saving them to the database
 * Supports YAML and JSON input formats with detailed error reporting
 */

import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getBlock } from '@/blocks'
import { db } from '@/db'
import { apiKey as apiKeyTable } from '@/db/schema'
import { getTool } from '@/tools/utils'

const logger = createLogger('WorkflowValidationAPI')

const ValidateWorkflowSchema = z.object({
  // Input format
  format: z.enum(['yaml', 'json']).default('json'),

  // Workflow definition
  workflow: z.union([
    z.string(), // YAML string
    z.object({
      // JSON workflow object
      version: z.string().optional(),
      blocks: z.array(z.any()).optional(),
      connections: z.array(z.any()).optional(),
      loops: z.record(z.any()).optional(),
      parallels: z.record(z.any()).optional(),
    }),
  ]),

  // Validation options
  validateRequired: z.boolean().default(true),
  validateConnections: z.boolean().default(true),
  validateBlockConfig: z.boolean().default(true),
  validateToolConfig: z.boolean().default(true),

  // Context for validation
  workspaceId: z.string().optional(),
  variables: z.record(z.any()).optional().default({}),
})

interface ValidationError {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  location?: {
    blockId?: string
    blockName?: string
    field?: string
    line?: number
    column?: number
  }
  context?: Record<string, any>
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
  summary: {
    totalBlocks: number
    totalConnections: number
    totalLoops: number
    totalParallels: number
    missingRequiredFields: number
    invalidConnections: number
    deprecatedFeatures: number
  }
  performance: {
    validationTimeMs: number
    parseTimeMs: number
  }
}

/**
 * POST /api/workflows/validate - Validate workflow definition
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const parseStartTime = Date.now()

  try {
    // Authentication - support session, API key, and internal token
    let userId: string | null = null

    // Check for internal JWT token for server-side calls
    const authHeader = req.headers.get('authorization')
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
        logger.warn(`[${requestId}] Unauthorized workflow validation attempt`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    // Parse and validate request body
    const body = await req.json()
    const {
      format,
      workflow: workflowInput,
      validateRequired,
      validateConnections,
      validateBlockConfig,
      validateToolConfig,
      workspaceId,
      variables,
    } = ValidateWorkflowSchema.parse(body)

    logger.info(`[${requestId}] Validating ${format} workflow`, {
      format,
      userId: isInternalCall ? 'internal' : userId,
      workspaceId,
      options: { validateRequired, validateConnections, validateBlockConfig, validateToolConfig },
    })

    const parseEndTime = Date.now()
    const parseTimeMs = parseEndTime - parseStartTime

    // Initialize validation result
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      summary: {
        totalBlocks: 0,
        totalConnections: 0,
        totalLoops: 0,
        totalParallels: 0,
        missingRequiredFields: 0,
        invalidConnections: 0,
        deprecatedFeatures: 0,
      },
      performance: {
        validationTimeMs: 0,
        parseTimeMs,
      },
    }

    let parsedWorkflow: any = null

    try {
      // Parse the workflow based on format
      if (format === 'yaml') {
        // For YAML, we would need to integrate with the sim-agent service
        // For now, we'll add a placeholder that could be implemented
        result.errors.push({
          type: 'error',
          code: 'YAML_PARSING_NOT_IMPLEMENTED',
          message:
            'YAML parsing is not yet implemented in this endpoint. Use the /api/yaml/parse endpoint instead.',
        })
        result.isValid = false
      } else {
        // JSON format
        if (typeof workflowInput === 'string') {
          try {
            parsedWorkflow = JSON.parse(workflowInput)
          } catch (parseError) {
            result.errors.push({
              type: 'error',
              code: 'JSON_PARSE_ERROR',
              message: `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            })
            result.isValid = false
          }
        } else {
          parsedWorkflow = workflowInput
        }
      }

      if (parsedWorkflow && result.isValid) {
        // Validate workflow structure
        await validateWorkflowStructure(parsedWorkflow, result, requestId)

        // Validate blocks if requested
        if (validateBlockConfig) {
          await validateBlocks(parsedWorkflow.blocks || [], result, requestId)
        }

        // Validate connections if requested
        if (validateConnections && parsedWorkflow.connections) {
          validateConnections_(parsedWorkflow.connections, parsedWorkflow.blocks || [], result)
        }

        // Validate loops and parallels
        if (parsedWorkflow.loops) {
          validateSubflows(parsedWorkflow.loops, 'loop', result)
        }

        if (parsedWorkflow.parallels) {
          validateSubflows(parsedWorkflow.parallels, 'parallel', result)
        }

        // Validate required fields if requested
        if (validateRequired && parsedWorkflow.blocks) {
          await validateRequiredFields(parsedWorkflow.blocks, result, requestId)
        }

        // Validate tool configurations if requested
        if (validateToolConfig && parsedWorkflow.blocks) {
          await validateToolConfigurations(parsedWorkflow.blocks, result, requestId)
        }

        // Update summary
        result.summary.totalBlocks = (parsedWorkflow.blocks || []).length
        result.summary.totalConnections = (parsedWorkflow.connections || []).length
        result.summary.totalLoops = Object.keys(parsedWorkflow.loops || {}).length
        result.summary.totalParallels = Object.keys(parsedWorkflow.parallels || {}).length
        result.summary.missingRequiredFields = result.errors.filter((e) =>
          e.code.includes('REQUIRED')
        ).length
        result.summary.invalidConnections = result.errors.filter((e) =>
          e.code.includes('CONNECTION')
        ).length
        result.summary.deprecatedFeatures = result.warnings.filter((w) =>
          w.code.includes('DEPRECATED')
        ).length

        // Determine if workflow is valid
        result.isValid = result.errors.length === 0
      }
    } catch (validationError: any) {
      logger.error(`[${requestId}] Validation error:`, validationError)
      result.errors.push({
        type: 'error',
        code: 'VALIDATION_FAILED',
        message: `Validation failed: ${validationError.message || 'Unknown error'}`,
      })
      result.isValid = false
    }

    const elapsed = Date.now() - startTime
    result.performance.validationTimeMs = elapsed - parseTimeMs

    logger.info(`[${requestId}] Workflow validation completed in ${elapsed}ms`, {
      isValid: result.isValid,
      errorsCount: result.errors.length,
      warningsCount: result.warnings.length,
      totalBlocks: result.summary.totalBlocks,
    })

    return NextResponse.json(
      {
        requestId,
        result,
      },
      { status: 200 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid validation request after ${elapsed}ms`, {
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error during workflow validation after ${elapsed}ms`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Validate the basic structure of the workflow
 */
async function validateWorkflowStructure(
  workflow: any,
  result: ValidationResult,
  requestId: string
): Promise<void> {
  logger.debug(`[${requestId}] Validating workflow structure`)

  // Check for required top-level properties
  if (!workflow.version && !workflow.blocks) {
    result.warnings.push({
      type: 'warning',
      code: 'MISSING_VERSION',
      message: 'Workflow version is not specified. Consider adding version information.',
    })
  }

  if (!workflow.blocks || !Array.isArray(workflow.blocks)) {
    result.errors.push({
      type: 'error',
      code: 'MISSING_BLOCKS',
      message: 'Workflow must contain a blocks array.',
    })
    return
  }

  if (workflow.blocks.length === 0) {
    result.warnings.push({
      type: 'warning',
      code: 'EMPTY_WORKFLOW',
      message: 'Workflow contains no blocks.',
    })
  }

  // Check for starter block
  const starterBlocks = workflow.blocks.filter(
    (block: any) => block.metadata?.id === 'starter' || block.config?.tool === 'starter'
  )

  if (starterBlocks.length === 0) {
    result.warnings.push({
      type: 'warning',
      code: 'NO_STARTER_BLOCK',
      message: 'Workflow does not contain a starter block. This may prevent proper execution.',
    })
  } else if (starterBlocks.length > 1) {
    result.errors.push({
      type: 'error',
      code: 'MULTIPLE_STARTER_BLOCKS',
      message: 'Workflow contains multiple starter blocks. Only one starter block is allowed.',
    })
  }
}

/**
 * Validate individual blocks in the workflow
 */
async function validateBlocks(
  blocks: any[],
  result: ValidationResult,
  requestId: string
): Promise<void> {
  logger.debug(`[${requestId}] Validating ${blocks.length} blocks`)

  const blockIds = new Set<string>()

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Check for required block properties
    if (!block.id) {
      result.errors.push({
        type: 'error',
        code: 'MISSING_BLOCK_ID',
        message: `Block at index ${i} is missing required 'id' property.`,
        location: { line: i + 1 },
      })
      continue
    }

    // Check for duplicate block IDs
    if (blockIds.has(block.id)) {
      result.errors.push({
        type: 'error',
        code: 'DUPLICATE_BLOCK_ID',
        message: `Duplicate block ID found: ${block.id}`,
        location: { blockId: block.id, blockName: block.metadata?.name },
      })
    }
    blockIds.add(block.id)

    // Validate block metadata
    if (!block.metadata) {
      result.warnings.push({
        type: 'warning',
        code: 'MISSING_BLOCK_METADATA',
        message: `Block ${block.id} is missing metadata.`,
        location: { blockId: block.id },
      })
    } else {
      // Check if block type is supported
      const blockType = block.metadata.id
      if (blockType) {
        try {
          const blockConfig = getBlock(blockType)
          if (!blockConfig) {
            result.errors.push({
              type: 'error',
              code: 'UNSUPPORTED_BLOCK_TYPE',
              message: `Unsupported block type: ${blockType}`,
              location: { blockId: block.id, blockName: block.metadata.name },
            })
          }
        } catch (error) {
          result.errors.push({
            type: 'error',
            code: 'BLOCK_CONFIG_ERROR',
            message: `Error loading block configuration for type: ${blockType}`,
            location: { blockId: block.id, blockName: block.metadata.name },
          })
        }
      }
    }

    // Validate block position
    if (
      !block.position ||
      typeof block.position.x !== 'number' ||
      typeof block.position.y !== 'number'
    ) {
      result.warnings.push({
        type: 'warning',
        code: 'INVALID_BLOCK_POSITION',
        message: `Block ${block.id} has invalid or missing position information.`,
        location: { blockId: block.id, blockName: block.metadata?.name },
      })
    }
  }
}

/**
 * Validate connections between blocks
 */
function validateConnections_(connections: any[], blocks: any[], result: ValidationResult): void {
  const blockIds = new Set(blocks.map((b) => b.id))

  for (const connection of connections) {
    if (!connection.source || !connection.target) {
      result.errors.push({
        type: 'error',
        code: 'INVALID_CONNECTION',
        message: 'Connection must have both source and target.',
        context: { connection },
      })
      continue
    }

    // Check if source and target blocks exist
    if (!blockIds.has(connection.source)) {
      result.errors.push({
        type: 'error',
        code: 'CONNECTION_SOURCE_NOT_FOUND',
        message: `Connection source block not found: ${connection.source}`,
        context: { connection },
      })
    }

    if (!blockIds.has(connection.target)) {
      result.errors.push({
        type: 'error',
        code: 'CONNECTION_TARGET_NOT_FOUND',
        message: `Connection target block not found: ${connection.target}`,
        context: { connection },
      })
    }

    // Check for self-connections
    if (connection.source === connection.target) {
      result.warnings.push({
        type: 'warning',
        code: 'SELF_CONNECTION',
        message: `Block ${connection.source} connects to itself. This may cause unexpected behavior.`,
        location: { blockId: connection.source },
      })
    }
  }
}

/**
 * Validate subflow configurations (loops and parallels)
 */
function validateSubflows(
  subflows: Record<string, any>,
  type: 'loop' | 'parallel',
  result: ValidationResult
): void {
  for (const [id, subflow] of Object.entries(subflows)) {
    if (!subflow.config) {
      result.errors.push({
        type: 'error',
        code: `MISSING_${type.toUpperCase()}_CONFIG`,
        message: `${type} ${id} is missing required config.`,
        location: { blockId: id },
      })
    }

    // Type-specific validations
    if (type === 'loop') {
      if (!subflow.config?.condition && !subflow.config?.maxIterations) {
        result.warnings.push({
          type: 'warning',
          code: 'LOOP_WITHOUT_EXIT_CONDITION',
          message: `Loop ${id} has no exit condition or maximum iterations. This may cause infinite loops.`,
          location: { blockId: id },
        })
      }
    }

    if (type === 'parallel') {
      if (!subflow.config?.branches || !Array.isArray(subflow.config.branches)) {
        result.errors.push({
          type: 'error',
          code: 'PARALLEL_WITHOUT_BRANCHES',
          message: `Parallel ${id} must have branches configuration.`,
          location: { blockId: id },
        })
      }
    }
  }
}

/**
 * Validate required fields in blocks
 */
async function validateRequiredFields(
  blocks: any[],
  result: ValidationResult,
  requestId: string
): Promise<void> {
  logger.debug(`[${requestId}] Validating required fields`)

  for (const block of blocks) {
    if (!block.metadata?.id) continue

    try {
      const blockConfig = getBlock(block.metadata.id)
      if (!blockConfig?.subBlocks) continue

      // Check each subblock for required fields
      for (const [fieldKey, fieldConfig] of Object.entries(blockConfig.subBlocks)) {
        if (
          fieldConfig.required &&
          (!block.config?.params?.[fieldKey] || block.config.params[fieldKey] === '')
        ) {
          result.errors.push({
            type: 'error',
            code: 'MISSING_REQUIRED_FIELD',
            message: `Required field '${fieldKey}' is missing in block ${block.id}`,
            location: {
              blockId: block.id,
              blockName: block.metadata.name,
              field: fieldKey,
            },
          })
        }
      }
    } catch (error) {
      // Block config error already handled in validateBlocks
    }
  }
}

/**
 * Validate tool configurations in blocks
 */
async function validateToolConfigurations(
  blocks: any[],
  result: ValidationResult,
  requestId: string
): Promise<void> {
  logger.debug(`[${requestId}] Validating tool configurations`)

  for (const block of blocks) {
    const toolId = block.config?.tool
    if (!toolId) continue

    try {
      const toolConfig = getTool(toolId)
      if (!toolConfig) {
        result.errors.push({
          type: 'error',
          code: 'UNSUPPORTED_TOOL',
          message: `Unsupported tool: ${toolId} in block ${block.id}`,
          location: { blockId: block.id, blockName: block.metadata?.name },
        })
        continue
      }

      // Validate tool-specific parameters
      if (toolConfig.params) {
        for (const [paramKey, paramConfig] of Object.entries(toolConfig.params)) {
          const paramValue = block.config?.params?.[paramKey]

          if (paramConfig.required && (!paramValue || paramValue === '')) {
            result.errors.push({
              type: 'error',
              code: 'MISSING_REQUIRED_TOOL_PARAM',
              message: `Required tool parameter '${paramKey}' is missing in block ${block.id}`,
              location: {
                blockId: block.id,
                blockName: block.metadata?.name,
                field: paramKey,
              },
            })
          }
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'error',
        code: 'TOOL_CONFIG_ERROR',
        message: `Error validating tool configuration for ${toolId} in block ${block.id}`,
        location: { blockId: block.id, blockName: block.metadata?.name },
      })
    }
  }
}
