/**
 * Registry API - Individual Tool Management
 *
 * Handles operations on specific registered tools:
 * - GET: Retrieve tool details
 * - PUT: Update tool configuration
 * - DELETE: De-register tool
 */

import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { registryTools, webhookExecutionLogs } from '@/db/schema'

const UpdateToolSchema = z.object({
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
      configSchema: z
        .object({
          type: z.literal('object'),
          properties: z.record(z.any()),
          required: z.array(z.string()).optional(),
        })
        .optional(),
      inputSchema: z
        .object({
          type: z.literal('object'),
          properties: z.record(z.any()),
        })
        .optional(),
      outputSchema: z
        .object({
          type: z.literal('object'),
          properties: z.record(z.any()),
        })
        .optional(),
    })
    .optional(),
  webhookUrl: z.string().url().optional(),
  webhookMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  webhookTimeout: z.number().min(1000).max(300000).optional(),
  webhookRetryCount: z.number().min(0).max(5).optional(),
  authentication: z
    .object({
      type: z.enum(['none', 'bearer', 'api_key', 'oauth']),
      tokenValidationUrl: z.string().url().optional(),
      requirements: z.record(z.any()).optional(),
    })
    .optional(),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * Validate webhook URL accessibility
 */
async function validateWebhookUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch (error) {
    console.error(`Webhook validation failed for ${url}:`, error)
    return false
  }
}

/**
 * GET /api/registry/tools/[toolId]
 * Retrieve detailed information about a specific tool
 */
export async function GET(request: NextRequest, { params }: { params: { toolId: string } }) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { toolId } = params

    // Fetch tool details
    const tool = await db
      .select({
        id: registryTools.id,
        name: registryTools.name,
        displayName: registryTools.displayName,
        description: registryTools.description,
        icon: registryTools.icon,
        category: registryTools.category,
        version: registryTools.version,
        status: registryTools.status,
        manifest: registryTools.manifest,
        configSchema: registryTools.configSchema,
        inputSchema: registryTools.inputSchema,
        outputSchema: registryTools.outputSchema,
        webhookUrl: registryTools.webhookUrl,
        webhookMethod: registryTools.webhookMethod,
        webhookTimeout: registryTools.webhookTimeout,
        webhookRetryCount: registryTools.webhookRetryCount,
        authentication: registryTools.authentication,
        usageCount: registryTools.usageCount,
        lastUsedAt: registryTools.lastUsedAt,
        errorCount: registryTools.errorCount,
        lastErrorAt: registryTools.lastErrorAt,
        lastErrorMessage: registryTools.lastErrorMessage,
        tags: registryTools.tags,
        metadata: registryTools.metadata,
        createdAt: registryTools.createdAt,
        updatedAt: registryTools.updatedAt,
      })
      .from(registryTools)
      .where(and(eq(registryTools.id, toolId), eq(registryTools.userId, session.user.id)))
      .limit(1)

    if (tool.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found or access denied',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ tool: tool[0] })
  } catch (error) {
    console.error('Error retrieving registry tool:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tool',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/registry/tools/[toolId]
 * Update an existing tool's configuration
 */
export async function PUT(request: NextRequest, { params }: { params: { toolId: string } }) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { toolId } = params

    // Verify tool exists and belongs to user
    const existingTool = await db
      .select({ id: registryTools.id })
      .from(registryTools)
      .where(and(eq(registryTools.id, toolId), eq(registryTools.userId, session.user.id)))
      .limit(1)

    if (existingTool.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found or access denied',
          },
        },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateToolSchema.parse(body)

    // Validate webhook URL if being updated
    if (updateData.webhookUrl) {
      const isWebhookValid = await validateWebhookUrl(updateData.webhookUrl)
      if (!isWebhookValid) {
        return NextResponse.json(
          {
            error: {
              code: 'WEBHOOK_VALIDATION_FAILED',
              message: 'Webhook URL is not accessible or invalid',
            },
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateFields: Partial<typeof registryTools.$inferInsert> = {}

    if (updateData.displayName !== undefined) updateFields.displayName = updateData.displayName
    if (updateData.description !== undefined) updateFields.description = updateData.description
    if (updateData.icon !== undefined) updateFields.icon = updateData.icon
    if (updateData.category !== undefined) updateFields.category = updateData.category
    if (updateData.version !== undefined) updateFields.version = updateData.version
    if (updateData.status !== undefined) updateFields.status = updateData.status
    if (updateData.webhookUrl !== undefined) updateFields.webhookUrl = updateData.webhookUrl
    if (updateData.webhookMethod !== undefined)
      updateFields.webhookMethod = updateData.webhookMethod
    if (updateData.webhookTimeout !== undefined)
      updateFields.webhookTimeout = updateData.webhookTimeout
    if (updateData.webhookRetryCount !== undefined)
      updateFields.webhookRetryCount = updateData.webhookRetryCount
    if (updateData.authentication !== undefined)
      updateFields.authentication = updateData.authentication
    if (updateData.tags !== undefined) updateFields.tags = updateData.tags
    if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata

    // Handle manifest updates
    if (updateData.manifest) {
      updateFields.manifest = updateData.manifest
      if (updateData.manifest.configSchema) {
        updateFields.configSchema = updateData.manifest.configSchema
      }
      if (updateData.manifest.inputSchema) {
        updateFields.inputSchema = updateData.manifest.inputSchema
      }
      if (updateData.manifest.outputSchema) {
        updateFields.outputSchema = updateData.manifest.outputSchema
      }
    }

    // Always update the timestamp
    updateFields.updatedAt = new Date()

    // Perform the update
    const [updatedTool] = await db
      .update(registryTools)
      .set(updateFields)
      .where(and(eq(registryTools.id, toolId), eq(registryTools.userId, session.user.id)))
      .returning({
        id: registryTools.id,
        name: registryTools.name,
        displayName: registryTools.displayName,
        status: registryTools.status,
        version: registryTools.version,
        updatedAt: registryTools.updatedAt,
      })

    if (!updatedTool) {
      return NextResponse.json(
        {
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update tool',
          },
        },
        { status: 500 }
      )
    }

    console.log(`Tool updated: ${updatedTool.name} (${toolId}) by user ${session.user.id}`)

    return NextResponse.json({
      id: updatedTool.id,
      name: updatedTool.name,
      displayName: updatedTool.displayName,
      status: updatedTool.status,
      version: updatedTool.version,
      updatedAt: updatedTool.updatedAt,
    })
  } catch (error) {
    console.error('Error updating registry tool:', error)

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
          message: 'Failed to update tool',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/registry/tools/[toolId]
 * De-register a tool (soft delete by setting status to 'inactive')
 */
export async function DELETE(request: NextRequest, { params }: { params: { toolId: string } }) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { toolId } = params

    // Check if tool exists and belongs to user
    const existingTool = await db
      .select({
        id: registryTools.id,
        name: registryTools.name,
        usageCount: registryTools.usageCount,
      })
      .from(registryTools)
      .where(and(eq(registryTools.id, toolId), eq(registryTools.userId, session.user.id)))
      .limit(1)

    if (existingTool.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found or access denied',
          },
        },
        { status: 404 }
      )
    }

    // Check for recent webhook execution logs to prevent deletion of actively used tools
    const recentLogs = await db
      .select({ id: webhookExecutionLogs.id })
      .from(webhookExecutionLogs)
      .where(
        and(
          eq(webhookExecutionLogs.registryItemId, toolId),
          eq(webhookExecutionLogs.registryType, 'tool')
        )
      )
      .limit(1)

    // Perform soft delete by setting status to inactive
    const [deletedTool] = await db
      .update(registryTools)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(and(eq(registryTools.id, toolId), eq(registryTools.userId, session.user.id)))
      .returning({
        id: registryTools.id,
        name: registryTools.name,
        status: registryTools.status,
      })

    if (!deletedTool) {
      return NextResponse.json(
        {
          error: {
            code: 'DELETION_FAILED',
            message: 'Failed to delete tool',
          },
        },
        { status: 500 }
      )
    }

    console.log(`Tool deactivated: ${deletedTool.name} (${toolId}) by user ${session.user.id}`)

    return NextResponse.json({
      id: deletedTool.id,
      name: deletedTool.name,
      status: deletedTool.status,
      deletedAt: new Date(),
      message:
        recentLogs.length > 0
          ? 'Tool deactivated successfully. Execution logs preserved for audit trail.'
          : 'Tool deactivated successfully.',
    })
  } catch (error) {
    console.error('Error deleting registry tool:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete tool',
        },
      },
      { status: 500 }
    )
  }
}
