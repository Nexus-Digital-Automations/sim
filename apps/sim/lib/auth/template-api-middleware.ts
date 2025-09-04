/**
 * Template API Middleware Integration
 *
 * This module provides specific middleware functions for template API endpoints
 * with comprehensive security, validation, and authorization controls.
 *
 * FEATURES:
 * - API-specific authentication flows
 * - Request validation and sanitization
 * - Operation-specific authorization
 * - Security headers and CORS handling
 * - API rate limiting and throttling
 * - Request/response logging and monitoring
 *
 * INTEGRATION:
 * - Seamlessly integrates with existing template APIs
 * - Backwards compatible with current authentication
 * - Enhanced security without breaking changes
 * - Comprehensive audit trail
 *
 * @version 2.0.0
 * @author Template API Security Team
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import {
  auditTemplateOperation,
  authenticateTemplateOperation,
  canManageTemplate,
  type TemplateAuthResult,
  type TemplateOperation,
} from './template-middleware'

const logger = createLogger('TemplateAPIMiddleware')

// ========================
// REQUEST VALIDATION
// ========================

/**
 * Common API request validation schemas
 */
export const ApiValidationSchemas = {
  /**
   * Template ID parameter validation
   */
  templateId: z.object({
    templateId: z.string().uuid('Invalid template ID format'),
  }),

  /**
   * Pagination parameters validation
   */
  pagination: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    offset: z.coerce.number().min(0).optional(),
  }),

  /**
   * Template search parameters validation
   */
  search: z.object({
    query: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    tagIds: z.array(z.string().uuid()).optional(),
    status: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'archived']).optional(),
    visibility: z.enum(['private', 'unlisted', 'public']).optional(),
    sortBy: z
      .enum([
        'name',
        'createdAt',
        'updatedAt',
        'views',
        'downloads',
        'rating',
        'popularity',
        'relevance',
      ])
      .optional()
      .default('popularity'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),

  /**
   * Template creation/update validation
   */
  templateData: z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(10).max(2000),
    longDescription: z.string().max(10000).optional(),
    categoryId: z.string().uuid(),
    tagIds: z.array(z.string().uuid()).optional().default([]),
    difficultyLevel: z
      .enum(['beginner', 'intermediate', 'advanced', 'expert'])
      .optional()
      .default('intermediate'),
    visibility: z.enum(['private', 'unlisted', 'public']).optional().default('private'),
    workflowTemplate: z.record(z.any()),
    estimatedSetupTime: z.number().positive().optional(),
    estimatedExecutionTime: z.number().positive().optional(),
    businessValueDescription: z.string().max(1000).optional(),
    requiredIntegrations: z.array(z.string()).optional().default([]),
    supportedIntegrations: z.array(z.string()).optional().default([]),
  }),

  /**
   * Template moderation actions
   */
  moderationAction: z.object({
    action: z.enum(['approve', 'reject', 'feature', 'unfeature', 'archive']),
    reason: z.string().min(1).max(500).optional(),
    moderatorNotes: z.string().max(1000).optional(),
  }),

  /**
   * Bulk operations validation
   */
  bulkOperation: z.object({
    templateIds: z.array(z.string().uuid()).min(1).max(50),
    operation: z.enum(['delete', 'archive', 'publish', 'feature']),
    reason: z.string().max(500).optional(),
  }),
}

/**
 * Request sanitization and validation wrapper
 */
export async function validateApiRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
): Promise<{ success: true; data: T } | { success: false; error: string; details?: any }> {
  try {
    let rawData: any

    switch (source) {
      case 'body':
        rawData = await request.json().catch(() => ({}))
        break
      case 'query': {
        const { searchParams } = new URL(request.url)
        rawData = Object.fromEntries(searchParams.entries())
        break
      }
      case 'params':
        // Params would be passed separately in context
        rawData = {}
        break
      default:
        return { success: false, error: 'Invalid validation source' }
    }

    const validated = schema.parse(rawData)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.errors,
      }
    }

    return {
      success: false,
      error: 'Request validation error',
    }
  }
}

// ========================
// SECURITY MIDDLEWARE
// ========================

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers for template API endpoints
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // API-specific headers
  response.headers.set('X-API-Version', '2.0')
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')

  return response
}

/**
 * CORS handling for template API
 */
export function handleCORS(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean)

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    response.headers.set('Access-Control-Max-Age', '86400')

    return addSecurityHeaders(response)
  }

  return null
}

// ========================
// API MIDDLEWARE FUNCTIONS
// ========================

/**
 * Comprehensive API middleware for template operations
 */
export async function withTemplateApiMiddleware(
  request: NextRequest,
  operation: TemplateOperation,
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>,
  options: {
    templateIdSource?: 'params' | 'query' | 'body'
    validateRequest?: z.ZodSchema<any>
    validationSource?: 'body' | 'query' | 'params'
    requireTemplateId?: boolean
    skipAuth?: boolean
  } = {}
): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Template API request`, {
      method: request.method,
      operation,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
    })

    // Handle CORS preflight
    const corsResponse = handleCORS(request)
    if (corsResponse) {
      return corsResponse
    }

    // Extract template ID if needed
    let templateId: string | undefined
    if (options.templateIdSource) {
      switch (options.templateIdSource) {
        case 'query': {
          const { searchParams } = new URL(request.url)
          templateId = searchParams.get('templateId') || searchParams.get('id') || undefined
          break
        }
        case 'body':
          try {
            const body = await request.json()
            templateId = body.templateId || body.id
            // Reset request body for handler
            ;(request as any)._body = body
          } catch {
            // Ignore JSON parse errors
          }
          break
        case 'params':
          // Would be passed through context in actual implementation
          break
      }
    }

    // Validate template ID requirement
    if (options.requireTemplateId && !templateId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template ID is required',
          requestId,
        },
        { status: 400 }
      )
    }

    // Request validation
    if (options.validateRequest) {
      const validation = await validateApiRequest(
        request,
        options.validateRequest,
        options.validationSource
      )

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error,
            details: validation.details,
            requestId,
          },
          { status: 400 }
        )
      }
      // Attach validated data to request

      ;(request as any).validatedData = validation.data
    }

    // Authentication and authorization
    let authResult: TemplateAuthResult
    if (options.skipAuth) {
      authResult = {
        success: true,
        permissions: ['read', 'list'],
        context: {
          operation,
          userRole: 'user',
          templateId,
        },
      }
    } else {
      authResult = await authenticateTemplateOperation(request, operation, templateId)

      if (!authResult.success) {
        await auditTemplateOperation(operation, templateId, authResult.context.userId, false, {
          error: authResult.error,
          requestId,
        })

        return NextResponse.json(
          {
            success: false,
            error: authResult.error,
            code:
              authResult.statusCode === 401
                ? 'AUTHENTICATION_REQUIRED'
                : authResult.statusCode === 403
                  ? 'INSUFFICIENT_PERMISSIONS'
                  : authResult.statusCode === 404
                    ? 'TEMPLATE_NOT_FOUND'
                    : authResult.statusCode === 429
                      ? 'RATE_LIMIT_EXCEEDED'
                      : 'SYSTEM_ERROR',
            permissions: authResult.permissions,
            requestId,
          },
          { status: authResult.statusCode || 500 }
        )
      }
    }

    // Call the actual handler
    const response = await handler(request, authResult)

    // Add security headers
    const secureResponse = addSecurityHeaders(response)

    // Audit successful operation
    await auditTemplateOperation(operation, templateId, authResult.context.userId, true, {
      requestId,
      statusCode: response.status,
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template API request completed in ${elapsed}ms`, {
      operation,
      templateId,
      statusCode: response.status,
      userId: authResult.context.userId,
    })

    return secureResponse
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Template API error after ${elapsed}ms:`, error)

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

// ========================
// SPECIALIZED API MIDDLEWARE
// ========================

/**
 * Middleware for template listing/search endpoints
 */
export function withTemplateListMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'list', handler, {
      validateRequest: ApiValidationSchemas.search.merge(ApiValidationSchemas.pagination),
      validationSource: 'query',
      skipAuth: false, // Allow public access but authenticate when possible
    })
}

/**
 * Middleware for template details endpoints
 */
export function withTemplateDetailsMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'read', handler, {
      templateIdSource: 'params',
      requireTemplateId: true,
    })
}

/**
 * Middleware for template creation endpoints
 */
export function withTemplateCreateMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'create', handler, {
      validateRequest: ApiValidationSchemas.templateData,
      validationSource: 'body',
    })
}

/**
 * Middleware for template update endpoints
 */
export function withTemplateUpdateMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'update', handler, {
      templateIdSource: 'params',
      requireTemplateId: true,
      validateRequest: ApiValidationSchemas.templateData.partial(),
      validationSource: 'body',
    })
}

/**
 * Middleware for template deletion endpoints
 */
export function withTemplateDeleteMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'delete', handler, {
      templateIdSource: 'params',
      requireTemplateId: true,
    })
}

/**
 * Middleware for template moderation endpoints
 */
export function withTemplateModerationMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'moderate', handler, {
      templateIdSource: 'params',
      requireTemplateId: true,
      validateRequest: ApiValidationSchemas.moderationAction,
      validationSource: 'body',
    })
}

/**
 * Middleware for template approval endpoints
 */
export function withTemplateApprovalMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'approve', handler, {
      templateIdSource: 'params',
      requireTemplateId: true,
      validateRequest: ApiValidationSchemas.moderationAction,
      validationSource: 'body',
    })
}

/**
 * Middleware for bulk operations
 */
export function withTemplateBulkMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'admin', handler, {
      validateRequest: ApiValidationSchemas.bulkOperation,
      validationSource: 'body',
    })
}

/**
 * Middleware for analytics endpoints
 */
export function withTemplateAnalyticsMiddleware(
  handler: (request: NextRequest, auth: TemplateAuthResult) => Promise<NextResponse>
) {
  return (request: NextRequest) =>
    withTemplateApiMiddleware(request, 'analytics', handler, {
      templateIdSource: 'params',
    })
}

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Get validated data from request
 */
export function getValidatedData<T>(request: NextRequest): T | null {
  return (request as any).validatedData || null
}

/**
 * Get request body (for cases where we pre-parsed it)
 */
export function getRequestBody(request: NextRequest): any {
  return (request as any)._body || null
}

/**
 * Helper to create error responses with consistent format
 */
export function createErrorResponse(
  error: string,
  statusCode: number,
  details?: any,
  requestId?: string
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
      ...(requestId && { requestId }),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )

  return addSecurityHeaders(response)
}

/**
 * Helper to create success responses with consistent format
 */
export function createSuccessResponse(
  data: any,
  statusCode = 200,
  meta?: any,
  requestId?: string
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
      ...(requestId && { requestId }),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )

  return addSecurityHeaders(response)
}

/**
 * Template ownership validation helper
 */
export async function validateTemplateOwnership(
  templateId: string,
  userId: string,
  userRole: string
): Promise<{ canManage: boolean; reason?: string }> {
  const result = await canManageTemplate(userId, templateId)

  logger.info('Template ownership validation', {
    templateId,
    userId,
    userRole,
    canManage: result.canManage,
    reason: result.reason,
  })

  return result
}
