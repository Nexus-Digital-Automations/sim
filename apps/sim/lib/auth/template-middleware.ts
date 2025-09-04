/**
 * Template Authentication & Authorization Middleware
 * 
 * This middleware provides comprehensive role-based access control for template management
 * operations, including creation, review, approval, and administration capabilities.
 * 
 * ROLE HIERARCHY:
 * - admin: Full access to all template operations and moderation
 * - moderator: Can review, approve, and moderate community templates
 * - reviewer: Can review templates and provide feedback
 * - creator: Can create and manage own templates
 * - user: Basic read access to approved public templates
 * 
 * FEATURES:
 * - Role-based permissions with inheritance
 * - Resource-specific authorization (own templates vs others)
 * - Template status-based access control
 * - Rate limiting by role level
 * - Audit logging for security compliance
 * - Integration with existing auth system
 * 
 * @version 2.0.0
 * @author Template Management Team
 */

import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { AuthHelpers, getUserRole, type EnhancedUser } from '@/lib/auth/types'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templates, user } from '@/db/schema'

const logger = createLogger('TemplateAuthMiddleware')

// ========================
// TYPE DEFINITIONS
// ========================

/**
 * Template operation types for fine-grained permission control
 */
export type TemplateOperation =
  | 'read' // View template details
  | 'list' // List/search templates
  | 'create' // Create new templates
  | 'update' // Edit existing templates
  | 'delete' // Remove templates
  | 'approve' // Approve for publication
  | 'reject' // Reject template submission
  | 'moderate' // Moderate community content
  | 'feature' // Mark templates as featured
  | 'analytics' // Access usage analytics
  | 'admin' // Full administrative access

/**
 * Template status affecting access permissions
 */
export type TemplateStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'

/**
 * Template visibility levels
 */
export type TemplateVisibility = 'private' | 'unlisted' | 'public'

/**
 * Enhanced role system for template management
 */
export type TemplateRole = 'admin' | 'moderator' | 'reviewer' | 'creator' | 'user'

/**
 * Permission context for template operations
 */
export interface TemplatePermissionContext {
  templateId?: string
  templateStatus?: TemplateStatus
  templateVisibility?: TemplateVisibility
  templateOwnerId?: string
  operation: TemplateOperation
  userId?: string
  userRole: TemplateRole
  isOwner?: boolean
  organizationId?: string
}

/**
 * Authentication result for middleware
 */
export interface TemplateAuthResult {
  success: boolean
  user?: EnhancedUser & { templateRole: TemplateRole }
  error?: string
  statusCode?: number
  permissions: TemplateOperation[]
  context: TemplatePermissionContext
}

// ========================
// PERMISSION SYSTEM
// ========================

/**
 * Role-based permission matrix for template operations
 * 
 * Each role inherits permissions from lower roles in the hierarchy:
 * admin > moderator > reviewer > creator > user
 */
const ROLE_PERMISSIONS: Record<TemplateRole, TemplateOperation[]> = {
  // Full administrative access
  admin: [
    'read', 'list', 'create', 'update', 'delete', 
    'approve', 'reject', 'moderate', 'feature', 
    'analytics', 'admin'
  ],
  
  // Community moderation and template approval
  moderator: [
    'read', 'list', 'create', 'update', 'delete',
    'approve', 'reject', 'moderate', 'analytics'
  ],
  
  // Template review and feedback
  reviewer: [
    'read', 'list', 'create', 'update', 'analytics'
  ],
  
  // Template creation and management
  creator: [
    'read', 'list', 'create', 'update'
  ],
  
  // Basic read access
  user: [
    'read', 'list'
  ]
}

/**
 * Map database user roles to template roles with additional logic
 */
export function mapToTemplateRole(dbRole: string): TemplateRole {
  switch (dbRole.toLowerCase()) {
    case 'admin':
      return 'admin'
    case 'moderator':
      return 'moderator'
    case 'reviewer':
      return 'reviewer'
    case 'creator':
      return 'creator'
    case 'user':
    default:
      return 'user'
  }
}

/**
 * Check if user has permission for specific operation
 */
export function hasPermission(
  userRole: TemplateRole,
  operation: TemplateOperation,
  context?: Partial<TemplatePermissionContext>
): boolean {
  const basePermissions = ROLE_PERMISSIONS[userRole] || []
  
  // Check base role permissions
  if (!basePermissions.includes(operation)) {
    return false
  }
  
  // Additional context-specific checks
  if (context) {
    // Own resource permissions - users can modify their own templates
    if (context.isOwner && ['update', 'delete'].includes(operation)) {
      return true
    }
    
    // Status-based restrictions
    if (context.templateStatus) {
      // Only moderators+ can approve/reject
      if (['approve', 'reject'].includes(operation)) {
        return ['admin', 'moderator'].includes(userRole)
      }
      
      // Draft templates can only be seen by owner and moderators+
      if (context.templateStatus === 'draft' && operation === 'read') {
        return context.isOwner || ['admin', 'moderator', 'reviewer'].includes(userRole)
      }
      
      // Rejected templates restricted to owner and moderators
      if (context.templateStatus === 'rejected' && operation === 'read') {
        return context.isOwner || ['admin', 'moderator'].includes(userRole)
      }
    }
    
    // Visibility-based restrictions
    if (context.templateVisibility === 'private' && operation === 'read') {
      return context.isOwner || ['admin', 'moderator'].includes(userRole)
    }
  }
  
  return true
}

/**
 * Get all permissions for a user role with context
 */
export function getUserPermissions(
  userRole: TemplateRole,
  context?: Partial<TemplatePermissionContext>
): TemplateOperation[] {
  const basePermissions = ROLE_PERMISSIONS[userRole] || []
  
  if (!context) {
    return basePermissions
  }
  
  return basePermissions.filter(permission => 
    hasPermission(userRole, permission, context)
  )
}

// ========================
// RATE LIMITING
// ========================

/**
 * Rate limits by role (requests per hour)
 */
const ROLE_RATE_LIMITS: Record<TemplateRole, number> = {
  admin: 10000,      // No practical limit for admins
  moderator: 5000,   // High limit for moderators
  reviewer: 2000,    // Moderate limit for reviewers
  creator: 1000,     // Standard limit for creators
  user: 500          // Conservative limit for users
}

/**
 * Rate limiting storage (in production, use Redis)
 */
const rateLimitStorage = new Map<string, { count: number; resetTime: number }>()

/**
 * Check and update rate limit for user
 */
function checkRateLimit(userId: string, userRole: TemplateRole): boolean {
  const limit = ROLE_RATE_LIMITS[userRole]
  const now = Date.now()
  const hourInMs = 60 * 60 * 1000
  const resetTime = now + hourInMs
  
  const current = rateLimitStorage.get(userId)
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStorage.set(userId, { count: 1, resetTime })
    return true
  }
  
  if (current.count >= limit) {
    return false
  }
  
  // Increment count
  rateLimitStorage.set(userId, { count: current.count + 1, resetTime: current.resetTime })
  return true
}

// ========================
// MIDDLEWARE FUNCTIONS
// ========================

/**
 * Authenticate and authorize template operations
 */
export async function authenticateTemplateOperation(
  request: NextRequest,
  operation: TemplateOperation,
  templateId?: string
): Promise<TemplateAuthResult> {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  
  try {
    logger.info(`[${requestId}] Authenticating template operation`, {
      operation,
      templateId,
      userAgent: request.headers.get('user-agent'),
    })
    
    // Authentication - support session, API key, and internal tokens
    let user: EnhancedUser | null = null
    let isInternalCall = false
    
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }
    
    if (!isInternalCall) {
      const session = await getSession()
      if (session?.user) {
        user = {
          ...session.user,
          role: getUserRole(session.user),
        } as EnhancedUser
      }
    }
    
    // For internal calls, allow all operations
    if (isInternalCall) {
      return {
        success: true,
        permissions: Object.values(ROLE_PERMISSIONS).flat(),
        context: {
          operation,
          userRole: 'admin',
          templateId,
        },
      }
    }
    
    // Require authentication for most operations
    const publicOperations: TemplateOperation[] = ['read', 'list']
    if (!user && !publicOperations.includes(operation)) {
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401,
        permissions: [],
        context: {
          operation,
          userRole: 'user',
          templateId,
        },
      }
    }
    
    const userId = user?.id
    const userRole = mapToTemplateRole(user?.role || 'user')
    const templateRole = userRole
    
    // Rate limiting
    if (userId && !checkRateLimit(userId, userRole)) {
      logger.warn(`[${requestId}] Rate limit exceeded for user`, {
        userId,
        userRole,
        operation,
      })
      
      return {
        success: false,
        error: 'Rate limit exceeded',
        statusCode: 429,
        permissions: [],
        context: {
          operation,
          userRole,
          userId,
          templateId,
        },
      }
    }
    
    // Load template context if templateId provided
    let templateContext: Partial<TemplatePermissionContext> = {}
    if (templateId) {
      const template = await db
        .select({
          id: templates.id,
          status: templates.status,
          visibility: templates.visibility,
          createdByUserId: templates.createdByUserId,
        })
        .from(templates)
        .where(eq(templates.id, templateId))
        .limit(1)
      
      if (template.length === 0) {
        return {
          success: false,
          error: 'Template not found',
          statusCode: 404,
          permissions: [],
          context: {
            operation,
            userRole,
            userId,
            templateId,
          },
        }
      }
      
      const templateData = template[0]
      templateContext = {
        templateStatus: templateData.status as TemplateStatus,
        templateVisibility: templateData.visibility as TemplateVisibility,
        templateOwnerId: templateData.createdByUserId,
        isOwner: userId === templateData.createdByUserId,
      }
    }
    
    // Build full permission context
    const context: TemplatePermissionContext = {
      templateId,
      operation,
      userId,
      userRole,
      ...templateContext,
    }
    
    // Check permissions
    const hasPermissionResult = hasPermission(userRole, operation, context)
    if (!hasPermissionResult) {
      logger.warn(`[${requestId}] Permission denied for template operation`, {
        userId,
        userRole,
        operation,
        templateId,
        context,
      })
      
      return {
        success: false,
        error: 'Insufficient permissions',
        statusCode: 403,
        permissions: getUserPermissions(userRole, context),
        context,
      }
    }
    
    // Get all user permissions
    const permissions = getUserPermissions(userRole, context)
    
    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template operation authenticated successfully in ${elapsed}ms`, {
      userId,
      userRole,
      operation,
      templateId,
      permissionsCount: permissions.length,
    })
    
    return {
      success: true,
      user: user ? { ...user, templateRole } : undefined,
      permissions,
      context,
    }
    
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Template authentication error after ${elapsed}ms:`, error)
    
    return {
      success: false,
      error: 'Authentication system error',
      statusCode: 500,
      permissions: [],
      context: {
        operation,
        userRole: 'user',
        templateId,
      },
    }
  }
}

/**
 * Express-style middleware wrapper for template authentication
 */
export function requireTemplatePermission(operation: TemplateOperation, templateIdParam?: string) {
  return async (request: NextRequest, context?: { params?: { [key: string]: string } }) => {
    // Extract template ID from URL params or query string
    let templateId = templateIdParam
    if (!templateId && context?.params) {
      templateId = context.params.templateId || context.params.id
    }
    if (!templateId) {
      const { searchParams } = new URL(request.url)
      templateId = searchParams.get('templateId') || searchParams.get('id') || undefined
    }
    
    const authResult = await authenticateTemplateOperation(request, operation, templateId)
    
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          code: authResult.statusCode === 401 ? 'AUTHENTICATION_REQUIRED' : 
               authResult.statusCode === 403 ? 'INSUFFICIENT_PERMISSIONS' : 
               authResult.statusCode === 404 ? 'TEMPLATE_NOT_FOUND' :
               authResult.statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'SYSTEM_ERROR',
          permissions: authResult.permissions,
        },
        { status: authResult.statusCode || 500 }
      )
    }
    
    // Add auth result to request context for use in API handlers
    ;(request as any).templateAuth = authResult
    return null // Continue to next handler
  }
}

/**
 * Helper to get auth context from request
 */
export function getTemplateAuthFromRequest(request: NextRequest): TemplateAuthResult | null {
  return (request as any).templateAuth || null
}

// ========================
// SPECIALIZED MIDDLEWARE
// ========================

/**
 * Middleware for template creation operations
 */
export const requireTemplateCreate = () => requireTemplatePermission('create')

/**
 * Middleware for template read operations
 */
export const requireTemplateRead = (templateId?: string) => 
  requireTemplatePermission('read', templateId)

/**
 * Middleware for template update operations
 */
export const requireTemplateUpdate = (templateId?: string) => 
  requireTemplatePermission('update', templateId)

/**
 * Middleware for template delete operations
 */
export const requireTemplateDelete = (templateId?: string) => 
  requireTemplatePermission('delete', templateId)

/**
 * Middleware for template approval operations (moderator+)
 */
export const requireTemplateApproval = (templateId?: string) => 
  requireTemplatePermission('approve', templateId)

/**
 * Middleware for template moderation operations (moderator+)
 */
export const requireTemplateModeration = () => requireTemplatePermission('moderate')

/**
 * Middleware for template analytics access
 */
export const requireTemplateAnalytics = () => requireTemplatePermission('analytics')

/**
 * Middleware for administrative template operations (admin only)
 */
export const requireTemplateAdmin = () => requireTemplatePermission('admin')

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Check if user can manage a specific template
 */
export async function canManageTemplate(
  userId: string,
  templateId: string
): Promise<{ canManage: boolean; reason?: string }> {
  try {
    const template = await db
      .select({
        createdByUserId: templates.createdByUserId,
        status: templates.status,
      })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)
    
    if (template.length === 0) {
      return { canManage: false, reason: 'Template not found' }
    }
    
    const userRecord = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    
    if (userRecord.length === 0) {
      return { canManage: false, reason: 'User not found' }
    }
    
    const userRole = mapToTemplateRole(userRecord[0].role)
    const isOwner = template[0].createdByUserId === userId
    const isModeratorOrAdmin = ['admin', 'moderator'].includes(userRole)
    
    return {
      canManage: isOwner || isModeratorOrAdmin,
      reason: isOwner ? 'Owner' : isModeratorOrAdmin ? 'Privileged role' : 'Insufficient permissions',
    }
  } catch (error) {
    logger.error('Error checking template management permissions:', error)
    return { canManage: false, reason: 'System error' }
  }
}

/**
 * Audit template operation for security compliance
 */
export async function auditTemplateOperation(
  operation: TemplateOperation,
  templateId: string | undefined,
  userId: string | undefined,
  success: boolean,
  metadata: Record<string, any> = {}
) {
  try {
    logger.info('Template operation audit', {
      operation,
      templateId,
      userId,
      success,
      timestamp: new Date().toISOString(),
      metadata,
    })
    
    // In production, send to audit log service or database
    // await auditService.log({
    //   operation,
    //   resourceType: 'template',
    //   resourceId: templateId,
    //   userId,
    //   success,
    //   timestamp: new Date(),
    //   metadata,
    // })
  } catch (error) {
    logger.error('Failed to audit template operation:', error)
  }
}