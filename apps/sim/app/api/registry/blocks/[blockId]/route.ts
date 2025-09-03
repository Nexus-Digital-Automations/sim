/**
 * Registry API - Individual Block Management
 *
 * Handles operations on specific registered blocks:
 * - GET: Retrieve block details
 * - PUT: Update block configuration
 * - DELETE: De-register block
 */

import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { registryBlocks, webhookExecutionLogs } from '@/db/schema'

const PortSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'any']),
  required: z.boolean().default(false),
  description: z.string().max(200).optional(),
  schema: z.record(z.any()).optional(),
})

const UpdateBlockSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  manifest: z
    .object({
      inputPorts: z.array(PortSchema).max(20).optional(),
      outputPorts: z.array(PortSchema).max(20).optional(),
      configSchema: z
        .object({
          type: z.literal('object'),
          properties: z.record(z.any()),
          required: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
  executionUrl: z.string().url().optional(),
  validationUrl: z.string().url().optional(),
  executionTimeout: z.number().min(1000).max(600000).optional(),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional(),
})

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
function validateBlockManifest(
  inputPorts: any[],
  outputPorts: any[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for duplicate port names within input ports
  const inputPortNames = inputPorts.map((port) => port.name)
  const duplicateInputs = inputPortNames.filter(
    (name, index) => inputPortNames.indexOf(name) !== index
  )
  if (duplicateInputs.length > 0) {
    errors.push(`Duplicate input port names: ${duplicateInputs.join(', ')}`)
  }

  // Check for duplicate port names within output ports
  const outputPortNames = outputPorts.map((port) => port.name)
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
  if (inputPorts.length === 0 && outputPorts.length === 0) {
    errors.push('Block must have at least one input or output port')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * GET /api/registry/blocks/[blockId]
 * Retrieve detailed information about a specific block
 */
export async function GET(request: NextRequest, { params }: { params: { blockId: string } }) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { blockId } = params

    // Fetch block details
    const block = await db
      .select({
        id: registryBlocks.id,
        name: registryBlocks.name,
        displayName: registryBlocks.displayName,
        description: registryBlocks.description,
        icon: registryBlocks.icon,
        category: registryBlocks.category,
        version: registryBlocks.version,
        status: registryBlocks.status,
        manifest: registryBlocks.manifest,
        inputPorts: registryBlocks.inputPorts,
        outputPorts: registryBlocks.outputPorts,
        configSchema: registryBlocks.configSchema,
        executionUrl: registryBlocks.executionUrl,
        validationUrl: registryBlocks.validationUrl,
        executionTimeout: registryBlocks.executionTimeout,
        usageCount: registryBlocks.usageCount,
        lastUsedAt: registryBlocks.lastUsedAt,
        errorCount: registryBlocks.errorCount,
        lastErrorAt: registryBlocks.lastErrorAt,
        lastErrorMessage: registryBlocks.lastErrorMessage,
        tags: registryBlocks.tags,
        metadata: registryBlocks.metadata,
        createdAt: registryBlocks.createdAt,
        updatedAt: registryBlocks.updatedAt,
      })
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, blockId), eq(registryBlocks.userId, session.user.id)))
      .limit(1)

    if (block.length === 0) {
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

    return NextResponse.json({ block: block[0] })
  } catch (error) {
    console.error('Error retrieving registry block:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve block',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/registry/blocks/[blockId]
 * Update an existing block's configuration
 */
export async function PUT(request: NextRequest, { params }: { params: { blockId: string } }) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { blockId } = params

    // Verify block exists and belongs to user
    const existingBlock = await db
      .select({
        id: registryBlocks.id,
        inputPorts: registryBlocks.inputPorts,
        outputPorts: registryBlocks.outputPorts,
      })
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, blockId), eq(registryBlocks.userId, session.user.id)))
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

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateBlockSchema.parse(body)

    // Validate execution URL if being updated
    if (updateData.executionUrl) {
      const isExecutionUrlValid = await validateExecutionUrl(updateData.executionUrl)
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

    // Validate validation URL if being updated
    if (updateData.validationUrl) {
      const isValidationUrlValid = await validateExecutionUrl(updateData.validationUrl)
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

    // Prepare update data
    const updateFields: Partial<typeof registryBlocks.$inferInsert> = {}

    if (updateData.displayName !== undefined) updateFields.displayName = updateData.displayName
    if (updateData.description !== undefined) updateFields.description = updateData.description
    if (updateData.icon !== undefined) updateFields.icon = updateData.icon
    if (updateData.category !== undefined) updateFields.category = updateData.category
    if (updateData.version !== undefined) updateFields.version = updateData.version
    if (updateData.status !== undefined) updateFields.status = updateData.status
    if (updateData.executionUrl !== undefined) updateFields.executionUrl = updateData.executionUrl
    if (updateData.validationUrl !== undefined)
      updateFields.validationUrl = updateData.validationUrl
    if (updateData.executionTimeout !== undefined)
      updateFields.executionTimeout = updateData.executionTimeout
    if (updateData.tags !== undefined) updateFields.tags = updateData.tags
    if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata

    // Handle manifest updates
    if (updateData.manifest) {
      const currentBlock = existingBlock[0]
      const inputPorts = updateData.manifest.inputPorts || (currentBlock.inputPorts as any[])
      const outputPorts = updateData.manifest.outputPorts || (currentBlock.outputPorts as any[])

      // Validate updated manifest
      const manifestValidation = validateBlockManifest(inputPorts, outputPorts)
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

      updateFields.manifest = {
        inputPorts,
        outputPorts,
        configSchema: updateData.manifest.configSchema || {},
      }

      if (updateData.manifest.inputPorts) {
        updateFields.inputPorts = updateData.manifest.inputPorts
      }
      if (updateData.manifest.outputPorts) {
        updateFields.outputPorts = updateData.manifest.outputPorts
      }
      if (updateData.manifest.configSchema) {
        updateFields.configSchema = updateData.manifest.configSchema
      }
    }

    // Always update the timestamp
    updateFields.updatedAt = new Date()

    // Perform the update
    const [updatedBlock] = await db
      .update(registryBlocks)
      .set(updateFields)
      .where(and(eq(registryBlocks.id, blockId), eq(registryBlocks.userId, session.user.id)))
      .returning({
        id: registryBlocks.id,
        name: registryBlocks.name,
        displayName: registryBlocks.displayName,
        status: registryBlocks.status,
        version: registryBlocks.version,
        updatedAt: registryBlocks.updatedAt,
      })

    if (!updatedBlock) {
      return NextResponse.json(
        {
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update block',
          },
        },
        { status: 500 }
      )
    }

    console.log(`Block updated: ${updatedBlock.name} (${blockId}) by user ${session.user.id}`)

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
            message: 'Invalid update data',
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
 * DELETE /api/registry/blocks/[blockId]
 * De-register a block (soft delete by setting status to 'inactive')
 */
export async function DELETE(request: NextRequest, { params }: { params: { blockId: string } }) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { blockId } = params

    // Check if block exists and belongs to user
    const existingBlock = await db
      .select({
        id: registryBlocks.id,
        name: registryBlocks.name,
        usageCount: registryBlocks.usageCount,
      })
      .from(registryBlocks)
      .where(and(eq(registryBlocks.id, blockId), eq(registryBlocks.userId, session.user.id)))
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

    // Check for recent webhook execution logs to prevent deletion of actively used blocks
    const recentLogs = await db
      .select({ id: webhookExecutionLogs.id })
      .from(webhookExecutionLogs)
      .where(
        and(
          eq(webhookExecutionLogs.registryItemId, blockId),
          eq(webhookExecutionLogs.registryType, 'block')
        )
      )
      .limit(1)

    // Perform soft delete by setting status to inactive
    const [deletedBlock] = await db
      .update(registryBlocks)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(and(eq(registryBlocks.id, blockId), eq(registryBlocks.userId, session.user.id)))
      .returning({
        id: registryBlocks.id,
        name: registryBlocks.name,
        status: registryBlocks.status,
      })

    if (!deletedBlock) {
      return NextResponse.json(
        {
          error: {
            code: 'DELETION_FAILED',
            message: 'Failed to delete block',
          },
        },
        { status: 500 }
      )
    }

    console.log(`Block deactivated: ${deletedBlock.name} (${blockId}) by user ${session.user.id}`)

    return NextResponse.json({
      id: deletedBlock.id,
      name: deletedBlock.name,
      status: deletedBlock.status,
      deletedAt: new Date(),
      message:
        recentLogs.length > 0
          ? 'Block deactivated successfully. Execution logs preserved for audit trail.'
          : 'Block deactivated successfully.',
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
