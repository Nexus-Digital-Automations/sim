/**
 * Registry API - Blocks Management
 *
 * Handles dynamic block registration, allowing developers to create custom
 * workflow blocks with defined input/output ports and execution logic.
 *
 * Features:
 * - Block registration with port-based data flow definitions
 * - JSON Schema validation for block configurations
 * - Execution URL system for custom block logic
 * - Usage tracking and error monitoring
 * - Rate limiting and security controls
 */

import crypto from 'crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { registryBlocks, registryRateLimits } from '@/db/schema'

// Validation schemas for block registration
const PortSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'any']),
  required: z.boolean().default(false),
  description: z.string().max(200).optional(),
  schema: z.record(z.any()).optional(), // JSON Schema for port data validation
})

const BlockManifestSchema = z.object({
  inputPorts: z.array(PortSchema).max(20),
  outputPorts: z.array(PortSchema).max(20),
  configSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
})

const CreateBlockSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Name must be lowercase alphanumeric with underscores'),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional(),
  manifest: BlockManifestSchema,
  executionUrl: z.string().url(),
  validationUrl: z.string().url().optional(),
  executionTimeout: z.number().min(1000).max(600000).optional(), // 1s to 10min
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional(),
})

const UpdateBlockSchema = CreateBlockSchema.partial()

const ListQuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(['active', 'inactive', 'error', 'pending_approval']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * Rate limiting helper for block registrations
 */
async function checkBlockRateLimit(userId: string): Promise<boolean> {
  const rateLimitRecord = await db
    .select()
    .from(registryRateLimits)
    .where(eq(registryRateLimits.userId, userId))
    .limit(1)

  const now = new Date()
  const windowStart = rateLimitRecord[0]?.windowStart || now
  const windowAge = now.getTime() - windowStart.getTime()
  const windowMinutes = windowAge / (1000 * 60)

  // Reset window if older than 60 minutes
  if (windowMinutes >= 60) {
    await db
      .insert(registryRateLimits)
      .values({
        userId,
        toolRegistrations: 0,
        blockRegistrations: 0,
        webhookCalls: 0,
        windowStart: now,
        lastRequestAt: now,
        isRateLimited: false,
      })
      .onConflictDoUpdate({
        target: registryRateLimits.userId,
        set: {
          blockRegistrations: 0,
          webhookCalls: 0,
          windowStart: now,
          lastRequestAt: now,
          isRateLimited: false,
        },
      })
    return true
  }

  const currentRegistrations = rateLimitRecord[0]?.blockRegistrations || 0
  const limit = 10 // 10 block registrations per hour (lower than tools due to complexity)

  if (currentRegistrations >= limit) {
    await db
      .update(registryRateLimits)
      .set({
        isRateLimited: true,
        rateLimitResetAt: new Date(windowStart.getTime() + 60 * 60 * 1000),
      })
      .where(eq(registryRateLimits.userId, userId))
    return false
  }

  return true
}

/**
 * Generate unique block ID
 */
function generateBlockId(): string {
  return `block_${crypto.randomBytes(8).toString('hex')}`
}

/**
 * Validate execution URL accessibility
 */
async function validateExecutionUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch (error) {
    console.error(`Execution URL validation failed for ${url}:`, error)
    return false
  }
}

/**
 * Validate block manifest for logical consistency
 */
function validateBlockManifest(manifest: z.infer<typeof BlockManifestSchema>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for duplicate port names within input ports
  const inputPortNames = manifest.inputPorts.map((port) => port.name)
  const duplicateInputs = inputPortNames.filter(
    (name, index) => inputPortNames.indexOf(name) !== index
  )
  if (duplicateInputs.length > 0) {
    errors.push(`Duplicate input port names: ${duplicateInputs.join(', ')}`)
  }

  // Check for duplicate port names within output ports
  const outputPortNames = manifest.outputPorts.map((port) => port.name)
  const duplicateOutputs = outputPortNames.filter(
    (name, index) => outputPortNames.indexOf(name) !== index
  )
  if (duplicateOutputs.length > 0) {
    errors.push(`Duplicate output port names: ${duplicateOutputs.join(', ')}`)
  }

  // Check for port name conflicts between inputs and outputs
  const conflictingNames = inputPortNames.filter((name) => outputPortNames.includes(name))
  if (conflictingNames.length > 0) {
    errors.push(`Port names conflict between inputs and outputs: ${conflictingNames.join(', ')}`)
  }

  // Ensure at least one input or output port exists
  if (manifest.inputPorts.length === 0 && manifest.outputPorts.length === 0) {
    errors.push('Block must have at least one input or output port')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * GET /api/registry/blocks
 * List all registered blocks for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const { category, status, search, page, limit } = ListQuerySchema.parse(query)

    // Build database query with filters
    const conditions = [eq(registryBlocks.userId, session.user.id)]

    if (category) {
      conditions.push(eq(registryBlocks.category, category))
    }

    if (status) {
      conditions.push(eq(registryBlocks.status, status))
    }

    if (search) {
      conditions.push(
        sql`(${registryBlocks.displayName} ILIKE ${`%${search}%`} OR ${registryBlocks.description} ILIKE ${`%${search}%`})`
      )
    }

    // Calculate pagination
    const offset = (page - 1) * limit

    // Fetch blocks with pagination
    const [blocks, [{ count }]] = await Promise.all([
      db
        .select({
          id: registryBlocks.id,
          name: registryBlocks.name,
          displayName: registryBlocks.displayName,
          description: registryBlocks.description,
          icon: registryBlocks.icon,
          category: registryBlocks.category,
          version: registryBlocks.version,
          status: registryBlocks.status,
          usageCount: registryBlocks.usageCount,
          lastUsedAt: registryBlocks.lastUsedAt,
          errorCount: registryBlocks.errorCount,
          lastErrorAt: registryBlocks.lastErrorAt,
          tags: registryBlocks.tags,
          createdAt: registryBlocks.createdAt,
          updatedAt: registryBlocks.updatedAt,
          // Include port summary for overview
          inputPorts: registryBlocks.inputPorts,
          outputPorts: registryBlocks.outputPorts,
        })
        .from(registryBlocks)
        .where(and(...conditions))
        .orderBy(desc(registryBlocks.usageCount), desc(registryBlocks.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(registryBlocks)
        .where(and(...conditions)),
    ])

    const totalPages = Math.ceil(count / limit)

    return NextResponse.json({
      blocks,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Error listing registry blocks:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list registry blocks',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/registry/blocks
 * Register a new custom block
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Rate limiting check
    const rateLimitPassed = await checkBlockRateLimit(session.user.id)
    if (!rateLimitPassed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Block registration rate limit exceeded. Try again later.',
          },
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const blockData = CreateBlockSchema.parse(body)

    // Check for duplicate block names
    const existingBlock = await db
      .select({ id: registryBlocks.id })
      .from(registryBlocks)
      .where(
        and(eq(registryBlocks.userId, session.user.id), eq(registryBlocks.name, blockData.name))
      )
      .limit(1)

    if (existingBlock.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_NAME',
            message: `Block with name '${blockData.name}' already exists`,
          },
        },
        { status: 409 }
      )
    }

    // Validate block manifest
    const manifestValidation = validateBlockManifest(blockData.manifest)
    if (!manifestValidation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_MANIFEST',
            message: 'Block manifest validation failed',
            details: manifestValidation.errors,
          },
        },
        { status: 400 }
      )
    }

    // Validate execution URL accessibility
    const isExecutionUrlValid = await validateExecutionUrl(blockData.executionUrl)
    if (!isExecutionUrlValid) {
      return NextResponse.json(
        {
          error: {
            code: 'EXECUTION_URL_VALIDATION_FAILED',
            message: 'Execution URL is not accessible or invalid',
          },
        },
        { status: 400 }
      )
    }

    // Validate validation URL if provided
    if (blockData.validationUrl) {
      const isValidationUrlValid = await validateExecutionUrl(blockData.validationUrl)
      if (!isValidationUrlValid) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_URL_VALIDATION_FAILED',
              message: 'Validation URL is not accessible or invalid',
            },
          },
          { status: 400 }
        )
      }
    }

    // Generate unique block ID
    const blockId = generateBlockId()

    // Create block record
    const [newBlock] = await db
      .insert(registryBlocks)
      .values({
        id: blockId,
        userId: session.user.id,
        name: blockData.name,
        displayName: blockData.displayName,
        description: blockData.description,
        icon: blockData.icon || 'block-icon',
        category: blockData.category || 'custom',
        version: blockData.version || '1.0.0',
        status: 'active',
        manifest: blockData.manifest,
        inputPorts: blockData.manifest.inputPorts,
        outputPorts: blockData.manifest.outputPorts,
        configSchema: blockData.manifest.configSchema,
        executionUrl: blockData.executionUrl,
        validationUrl: blockData.validationUrl,
        executionTimeout: blockData.executionTimeout || 300000,
        tags: blockData.tags || [],
        metadata: blockData.metadata || {},
      })
      .returning({
        id: registryBlocks.id,
        name: registryBlocks.name,
        displayName: registryBlocks.displayName,
        status: registryBlocks.status,
        createdAt: registryBlocks.createdAt,
      })

    // Update rate limit counter
    await db
      .update(registryRateLimits)
      .set({
        blockRegistrations: sql`${registryRateLimits.blockRegistrations} + 1`,
        lastRequestAt: new Date(),
      })
      .where(eq(registryRateLimits.userId, session.user.id))

    console.log(`Block registered: ${blockData.name} (${blockId}) by user ${session.user.id}`)

    return NextResponse.json(
      {
        id: newBlock.id,
        name: newBlock.name,
        displayName: newBlock.displayName,
        status: newBlock.status,
        createdAt: newBlock.createdAt,
        executionUrl: blockData.executionUrl,
        inputPorts: blockData.manifest.inputPorts.length,
        outputPorts: blockData.manifest.outputPorts.length,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating registry block:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid block data',
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to register block',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/registry/blocks
 * Update an existing custom block
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'Block ID is required for update' } },
        { status: 400 }
      )
    }

    const blockData = UpdateBlockSchema.parse(updateData)

    // Check if block exists and user owns it
    const existingBlock = await db
      .select()
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, id), eq(registryBlocks.userId, session.user.id)))
      .limit(1)

    if (existingBlock.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'BLOCK_NOT_FOUND',
            message: 'Block not found or access denied',
          },
        },
        { status: 404 }
      )
    }

    // If name is being updated, check for duplicates
    if (blockData.name && blockData.name !== existingBlock[0].name) {
      const duplicateBlock = await db
        .select({ id: registryBlocks.id })
        .from(registryBlocks)
        .where(
          and(
            eq(registryBlocks.userId, session.user.id),
            eq(registryBlocks.name, blockData.name),
            sql`${registryBlocks.id} != ${id}`
          )
        )
        .limit(1)

      if (duplicateBlock.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_NAME',
              message: `Block with name '${blockData.name}' already exists`,
            },
          },
          { status: 409 }
        )
      }
    }

    // Validate manifest if provided
    if (blockData.manifest) {
      const manifestValidation = validateBlockManifest(blockData.manifest)
      if (!manifestValidation.valid) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_MANIFEST',
              message: 'Block manifest validation failed',
              details: manifestValidation.errors,
            },
          },
          { status: 400 }
        )
      }
    }

    // Validate execution URL if provided
    if (blockData.executionUrl) {
      const isExecutionUrlValid = await validateExecutionUrl(blockData.executionUrl)
      if (!isExecutionUrlValid) {
        return NextResponse.json(
          {
            error: {
              code: 'EXECUTION_URL_VALIDATION_FAILED',
              message: 'Execution URL is not accessible or invalid',
            },
          },
          { status: 400 }
        )
      }
    }

    // Validate validation URL if provided
    if (blockData.validationUrl) {
      const isValidationUrlValid = await validateExecutionUrl(blockData.validationUrl)
      if (!isValidationUrlValid) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_URL_VALIDATION_FAILED',
              message: 'Validation URL is not accessible or invalid',
            },
          },
          { status: 400 }
        )
      }
    }

    // Prepare update values
    const updateValues: any = {
      updatedAt: new Date(),
    }

    // Only update provided fields
    if (blockData.name !== undefined) updateValues.name = blockData.name
    if (blockData.displayName !== undefined) updateValues.displayName = blockData.displayName
    if (blockData.description !== undefined) updateValues.description = blockData.description
    if (blockData.icon !== undefined) updateValues.icon = blockData.icon
    if (blockData.category !== undefined) updateValues.category = blockData.category
    if (blockData.version !== undefined) updateValues.version = blockData.version
    if (blockData.manifest !== undefined) {
      updateValues.manifest = blockData.manifest
      updateValues.inputPorts = blockData.manifest.inputPorts
      updateValues.outputPorts = blockData.manifest.outputPorts
      updateValues.configSchema = blockData.manifest.configSchema
    }
    if (blockData.executionUrl !== undefined) updateValues.executionUrl = blockData.executionUrl
    if (blockData.validationUrl !== undefined) updateValues.validationUrl = blockData.validationUrl
    if (blockData.executionTimeout !== undefined)
      updateValues.executionTimeout = blockData.executionTimeout
    if (blockData.tags !== undefined) updateValues.tags = blockData.tags
    if (blockData.metadata !== undefined) updateValues.metadata = blockData.metadata

    // Update block record
    const [updatedBlock] = await db
      .update(registryBlocks)
      .set(updateValues)
      .where(eq(registryBlocks.id, id))
      .returning({
        id: registryBlocks.id,
        name: registryBlocks.name,
        displayName: registryBlocks.displayName,
        status: registryBlocks.status,
        version: registryBlocks.version,
        updatedAt: registryBlocks.updatedAt,
      })

    console.log(
      `Block updated: ${blockData.name || existingBlock[0].name} (${id}) by user ${session.user.id}`
    )

    return NextResponse.json({
      id: updatedBlock.id,
      name: updatedBlock.name,
      displayName: updatedBlock.displayName,
      status: updatedBlock.status,
      version: updatedBlock.version,
      updatedAt: updatedBlock.updatedAt,
    })
  } catch (error) {
    console.error('Error updating registry block:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid block update data',
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update block',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/registry/blocks
 * Delete a custom block
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse request body to get block ID
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'Block ID is required for deletion' } },
        { status: 400 }
      )
    }

    // Check if block exists and user owns it
    const existingBlock = await db
      .select({
        id: registryBlocks.id,
        name: registryBlocks.name,
        usageCount: registryBlocks.usageCount,
        status: registryBlocks.status,
      })
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, id), eq(registryBlocks.userId, session.user.id)))
      .limit(1)

    if (existingBlock.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'BLOCK_NOT_FOUND',
            message: 'Block not found or access denied',
          },
        },
        { status: 404 }
      )
    }

    const block = existingBlock[0]

    // Safety check: prevent deletion of blocks that are in use
    if (block.usageCount > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'BLOCK_IN_USE',
            message: `Cannot delete block '${block.name}' as it is currently being used in ${block.usageCount} workflow(s)`,
            details: { usageCount: block.usageCount },
          },
        },
        { status: 400 }
      )
    }

    // Instead of hard delete, mark as inactive for safety
    await db
      .update(registryBlocks)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(registryBlocks.id, id))

    console.log(`Block deactivated: ${block.name} (${id}) by user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: `Block '${block.name}' has been deactivated`,
      blockId: id,
      blockName: block.name,
      action: 'deactivated',
    })
  } catch (error) {
    console.error('Error deleting registry block:', error)

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete block',
        },
      },
      { status: 500 }
    )
  }
}
