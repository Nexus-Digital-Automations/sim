/**
 * Registry API - Tools Management
 *
 * Handles dynamic tool registration, allowing developers to extend the platform
 * with custom tools via webhook integration.
 *
 * Features:
 * - Tool registration with manifest-based configuration
 * - JSON Schema validation for tool definitions
 * - Webhook execution system for custom tool logic
 * - Usage tracking and error monitoring
 * - Rate limiting and security controls
 */

import crypto from 'crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { registryRateLimits, registryTools } from '@/db/schema'

// Validation schemas for tool registration
const ToolManifestSchema = z.object({
  configSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
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

const AuthenticationSchema = z.object({
  type: z.enum(['none', 'bearer', 'api_key', 'oauth']),
  tokenValidationUrl: z.string().url().optional(),
  requirements: z.record(z.any()).optional(),
})

const CreateToolSchema = z.object({
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
  manifest: ToolManifestSchema,
  webhookUrl: z.string().url(),
  webhookMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
  webhookTimeout: z.number().min(1000).max(300000).optional(), // 1s to 5min
  webhookRetryCount: z.number().min(0).max(5).optional(),
  authentication: AuthenticationSchema.optional(),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional(),
})

const UpdateToolSchema = CreateToolSchema.partial()

const ListQuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(['active', 'inactive', 'error', 'pending_approval']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * Rate limiting helper
 */
async function checkRateLimit(userId: string): Promise<boolean> {
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
          toolRegistrations: 0,
          blockRegistrations: 0,
          webhookCalls: 0,
          windowStart: now,
          lastRequestAt: now,
          isRateLimited: false,
        },
      })
    return true
  }

  const currentRegistrations = rateLimitRecord[0]?.toolRegistrations || 0
  const limit = 20 // 20 tool registrations per hour

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
 * Generate unique tool ID
 */
function generateToolId(): string {
  return `tool_${crypto.randomBytes(8).toString('hex')}`
}

/**
 * Validate webhook URL accessibility
 */
async function validateWebhookUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })
    return response.ok
  } catch (error) {
    console.error(`Webhook validation failed for ${url}:`, error)
    return false
  }
}

/**
 * GET /api/registry/tools
 * List all registered tools for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
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
    const conditions = [eq(registryTools.userId, session.user.id)]

    if (category) {
      conditions.push(eq(registryTools.category, category))
    }

    if (status) {
      conditions.push(eq(registryTools.status, status))
    }

    if (search) {
      conditions.push(
        sql`(${registryTools.displayName} ILIKE ${`%${search}%`} OR ${registryTools.description} ILIKE ${`%${search}%`})`
      )
    }

    // Calculate pagination
    const offset = (page - 1) * limit

    // Fetch tools with pagination
    const [tools, [{ count }]] = await Promise.all([
      db
        .select({
          id: registryTools.id,
          name: registryTools.name,
          displayName: registryTools.displayName,
          description: registryTools.description,
          icon: registryTools.icon,
          category: registryTools.category,
          version: registryTools.version,
          status: registryTools.status,
          usageCount: registryTools.usageCount,
          lastUsedAt: registryTools.lastUsedAt,
          errorCount: registryTools.errorCount,
          lastErrorAt: registryTools.lastErrorAt,
          tags: registryTools.tags,
          createdAt: registryTools.createdAt,
          updatedAt: registryTools.updatedAt,
        })
        .from(registryTools)
        .where(and(...conditions))
        .orderBy(desc(registryTools.usageCount), desc(registryTools.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(registryTools)
        .where(and(...conditions)),
    ])

    const totalPages = Math.ceil(count / limit)

    return NextResponse.json({
      tools,
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
    console.error('Error listing registry tools:', error)

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
          message: 'Failed to list registry tools',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/registry/tools
 * Register a new custom tool
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Rate limiting check
    const rateLimitPassed = await checkRateLimit(session.user.id)
    if (!rateLimitPassed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Tool registration rate limit exceeded. Try again later.',
          },
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const toolData = CreateToolSchema.parse(body)

    // Check for duplicate tool names
    const existingTool = await db
      .select({ id: registryTools.id })
      .from(registryTools)
      .where(and(eq(registryTools.userId, session.user.id), eq(registryTools.name, toolData.name)))
      .limit(1)

    if (existingTool.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_NAME',
            message: `Tool with name '${toolData.name}' already exists`,
          },
        },
        { status: 409 }
      )
    }

    // Validate webhook URL accessibility
    const isWebhookValid = await validateWebhookUrl(toolData.webhookUrl)
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

    // Generate unique tool ID
    const toolId = generateToolId()

    // Create tool record
    const [newTool] = await db
      .insert(registryTools)
      .values({
        id: toolId,
        userId: session.user.id,
        name: toolData.name,
        displayName: toolData.displayName,
        description: toolData.description,
        icon: toolData.icon || 'tool-icon',
        category: toolData.category || 'custom',
        version: toolData.version || '1.0.0',
        status: 'active',
        manifest: toolData.manifest,
        configSchema: toolData.manifest.configSchema,
        inputSchema: toolData.manifest.inputSchema || {},
        outputSchema: toolData.manifest.outputSchema || {},
        webhookUrl: toolData.webhookUrl,
        webhookMethod: toolData.webhookMethod || 'POST',
        webhookTimeout: toolData.webhookTimeout || 30000,
        webhookRetryCount: toolData.webhookRetryCount || 3,
        authentication: toolData.authentication || {},
        tags: toolData.tags || [],
        metadata: toolData.metadata || {},
      })
      .returning({
        id: registryTools.id,
        name: registryTools.name,
        displayName: registryTools.displayName,
        status: registryTools.status,
        createdAt: registryTools.createdAt,
      })

    // Update rate limit counter
    await db
      .update(registryRateLimits)
      .set({
        toolRegistrations: sql`${registryRateLimits.toolRegistrations} + 1`,
        lastRequestAt: new Date(),
      })
      .where(eq(registryRateLimits.userId, session.user.id))

    console.log(`Tool registered: ${toolData.name} (${toolId}) by user ${session.user.id}`)

    return NextResponse.json(
      {
        id: newTool.id,
        name: newTool.name,
        displayName: newTool.displayName,
        status: newTool.status,
        createdAt: newTool.createdAt,
        webhookUrl: toolData.webhookUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating registry tool:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tool data',
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
          message: 'Failed to register tool',
        },
      },
      { status: 500 }
    )
  }
}
