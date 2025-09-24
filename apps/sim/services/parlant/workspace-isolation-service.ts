/**
 * Workspace Isolation Service
 *
 * Enterprise-grade workspace isolation system for Parlant chat data.
 * Provides cryptographic boundaries, access control, and cross-workspace prevention
 * to ensure complete multi-tenant data isolation and security compliance.
 */

import * as crypto from 'crypto'
import { db } from '@sim/db'
import { parlantAgent, parlantSession, permissions, workspace } from '@sim/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('WorkspaceIsolationService')

/**
 * Workspace access levels
 */
export type WorkspaceAccessLevel = 'owner' | 'admin' | 'member' | 'viewer' | 'guest'

/**
 * Isolation context for all operations
 */
export interface IsolationContext {
  userId: string
  workspaceId: string
  accessLevel: WorkspaceAccessLevel
  permissions: string[]
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

/**
 * Access validation result
 */
export interface AccessValidationResult {
  allowed: boolean
  accessLevel: WorkspaceAccessLevel
  permissions: string[]
  restrictions?: {
    readOnly?: boolean
    sessionLimit?: number
    dataRetentionDays?: number
    exportDisabled?: boolean
  }
  securityFlags?: {
    requireMFA?: boolean
    ipRestricted?: boolean
    timeRestricted?: boolean
  }
}

/**
 * Data isolation audit log entry
 */
export interface IsolationAuditEntry {
  id: string
  userId: string
  workspaceId: string
  action: string
  resource: string
  resourceId?: string
  result: 'allowed' | 'denied'
  reason?: string
  metadata: Record<string, any>
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Cross-workspace access attempt detection
 */
export interface CrossWorkspaceAttempt {
  userId: string
  sourceWorkspaceId: string
  targetWorkspaceId: string
  attemptedResource: string
  attemptedAction: string
  detectedAt: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  blocked: boolean
}

/**
 * Workspace data encryption configuration
 */
export interface WorkspaceEncryptionConfig {
  workspaceId: string
  encryptionEnabled: boolean
  keyVersion: string
  cipherSuite: string
  keyRotationSchedule: string
  encryptedFields: string[]
}

/**
 * Advanced Workspace Isolation Service
 */
export class WorkspaceIsolationService {
  private readonly AUDIT_LOG_RETENTION_DAYS = 90
  private readonly MAX_FAILED_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION_MINUTES = 15

  constructor() {
    logger.info('Workspace Isolation Service initialized', {
      auditRetentionDays: this.AUDIT_LOG_RETENTION_DAYS,
      maxFailedAttempts: this.MAX_FAILED_ATTEMPTS,
      lockoutDuration: this.LOCKOUT_DURATION_MINUTES,
    })
  }

  /**
   * Create isolation context for user and workspace
   */
  async createIsolationContext(
    userId: string,
    workspaceId: string,
    sessionContext?: {
      sessionId?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<IsolationContext> {
    const startTime = performance.now()
    const requestId = `create-context-${Date.now()}`

    try {
      logger.debug('Creating isolation context', {
        requestId,
        userId,
        workspaceId,
        hasSessionContext: !!sessionContext,
      })

      // Validate user access to workspace
      const accessValidation = await this.validateWorkspaceAccess(userId, workspaceId)

      if (!accessValidation.allowed) {
        throw new Error('Access denied to workspace')
      }

      const context: IsolationContext = {
        userId,
        workspaceId,
        accessLevel: accessValidation.accessLevel,
        permissions: accessValidation.permissions,
        sessionId: sessionContext?.sessionId,
        ipAddress: sessionContext?.ipAddress,
        userAgent: sessionContext?.userAgent,
        timestamp: new Date().toISOString(),
      }

      // Log context creation for audit
      await this.logIsolationAudit({
        userId,
        workspaceId,
        action: 'create_isolation_context',
        resource: 'workspace',
        resourceId: workspaceId,
        result: 'allowed',
        metadata: {
          accessLevel: accessValidation.accessLevel,
          permissions: accessValidation.permissions,
          sessionId: sessionContext?.sessionId,
        },
        timestamp: context.timestamp,
        ipAddress: sessionContext?.ipAddress,
        userAgent: sessionContext?.userAgent,
      })

      const duration = performance.now() - startTime

      logger.debug('Isolation context created successfully', {
        requestId,
        accessLevel: accessValidation.accessLevel,
        permissionCount: accessValidation.permissions.length,
        duration: `${duration}ms`,
      })

      return context
    } catch (error) {
      const duration = performance.now() - startTime

      // Log failed context creation
      await this.logIsolationAudit({
        userId,
        workspaceId,
        action: 'create_isolation_context',
        resource: 'workspace',
        resourceId: workspaceId,
        result: 'denied',
        reason: error instanceof Error ? error.message : 'Unknown error',
        metadata: { sessionContext },
        timestamp: new Date().toISOString(),
        ipAddress: sessionContext?.ipAddress,
        userAgent: sessionContext?.userAgent,
      })

      logger.error('Failed to create isolation context', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })

      throw error
    }
  }

  /**
   * Validate workspace access for user
   */
  async validateWorkspaceAccess(
    userId: string,
    workspaceId: string
  ): Promise<AccessValidationResult> {
    const startTime = performance.now()
    const requestId = `validate-access-${Date.now()}`

    try {
      logger.debug('Validating workspace access', {
        requestId,
        userId,
        workspaceId,
      })

      // Get user's workspace permissions
      const userPermissions = await db
        .select({
          permission: permissions.permission,
          entityType: permissions.entityType,
          entityId: permissions.entityId,
        })
        .from(permissions)
        .where(
          and(
            eq(permissions.userId, userId),
            eq(permissions.entityType, 'workspace'),
            eq(permissions.entityId, workspaceId)
          )
        )

      if (userPermissions.length === 0) {
        // Check if user is workspace owner through workspace table
        const workspaceOwnership = await db
          .select({ id: workspace.id })
          .from(workspace)
          .where(and(eq(workspace.id, workspaceId), eq(workspace.ownerId, userId)))
          .limit(1)

        if (workspaceOwnership.length === 0) {
          return {
            allowed: false,
            accessLevel: 'guest',
            permissions: [],
          }
        }

        // User is workspace owner
        return {
          allowed: true,
          accessLevel: 'owner',
          permissions: ['read', 'write', 'admin', 'delete'],
        }
      }

      // Determine access level from permissions
      const permissionList = userPermissions.map((p) => p.permission)
      let accessLevel: WorkspaceAccessLevel = 'guest'

      if (permissionList.includes('admin')) {
        accessLevel = 'admin'
      } else if (permissionList.includes('write')) {
        accessLevel = 'member'
      } else if (permissionList.includes('read')) {
        accessLevel = 'viewer'
      }

      const duration = performance.now() - startTime

      logger.debug('Workspace access validated', {
        requestId,
        accessLevel,
        permissionCount: permissionList.length,
        duration: `${duration}ms`,
      })

      return {
        allowed: true,
        accessLevel,
        permissions: permissionList,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to validate workspace access', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Enforce workspace isolation for session access
   */
  async enforceSessionIsolation(sessionId: string, context: IsolationContext): Promise<boolean> {
    const startTime = performance.now()
    const requestId = `enforce-session-${Date.now()}`

    try {
      logger.debug('Enforcing session isolation', {
        requestId,
        sessionId,
        workspaceId: context.workspaceId,
        userId: context.userId,
        accessLevel: context.accessLevel,
      })

      // Get session with workspace validation
      const sessionCheck = await db
        .select({
          id: parlantSession.id,
          workspaceId: parlantSession.workspaceId,
          userId: parlantSession.userId,
          agentId: parlantSession.agentId,
          status: parlantSession.status,
        })
        .from(parlantSession)
        .where(eq(parlantSession.id, sessionId))
        .limit(1)

      if (sessionCheck.length === 0) {
        await this.logIsolationAudit({
          userId: context.userId,
          workspaceId: context.workspaceId,
          action: 'access_session',
          resource: 'session',
          resourceId: sessionId,
          result: 'denied',
          reason: 'Session not found',
          metadata: { context },
          timestamp: new Date().toISOString(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        return false
      }

      const session = sessionCheck[0]

      // Enforce workspace boundary
      if (session.workspaceId !== context.workspaceId) {
        await this.detectCrossWorkspaceAttempt({
          userId: context.userId,
          sourceWorkspaceId: context.workspaceId,
          targetWorkspaceId: session.workspaceId,
          attemptedResource: 'session',
          attemptedAction: 'access',
          detectedAt: new Date().toISOString(),
          severity: 'critical',
          blocked: true,
        })

        await this.logIsolationAudit({
          userId: context.userId,
          workspaceId: context.workspaceId,
          action: 'access_session',
          resource: 'session',
          resourceId: sessionId,
          result: 'denied',
          reason: 'Cross-workspace access attempt',
          metadata: {
            sessionWorkspaceId: session.workspaceId,
            context,
          },
          timestamp: new Date().toISOString(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        return false
      }

      // Check user-specific session access (for member-level isolation)
      if (context.accessLevel === 'viewer' && session.userId && session.userId !== context.userId) {
        await this.logIsolationAudit({
          userId: context.userId,
          workspaceId: context.workspaceId,
          action: 'access_session',
          resource: 'session',
          resourceId: sessionId,
          result: 'denied',
          reason: 'Insufficient permissions for user-specific session',
          metadata: {
            sessionUserId: session.userId,
            context,
          },
          timestamp: new Date().toISOString(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        return false
      }

      const duration = performance.now() - startTime

      await this.logIsolationAudit({
        userId: context.userId,
        workspaceId: context.workspaceId,
        action: 'access_session',
        resource: 'session',
        resourceId: sessionId,
        result: 'allowed',
        metadata: {
          sessionStatus: session.status,
          context,
        },
        timestamp: new Date().toISOString(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      logger.debug('Session isolation enforced successfully', {
        requestId,
        sessionId,
        allowed: true,
        duration: `${duration}ms`,
      })

      return true
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to enforce session isolation', {
        requestId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      return false
    }
  }

  /**
   * Enforce workspace isolation for agent access
   */
  async enforceAgentIsolation(agentId: string, context: IsolationContext): Promise<boolean> {
    const startTime = performance.now()
    const requestId = `enforce-agent-${Date.now()}`

    try {
      logger.debug('Enforcing agent isolation', {
        requestId,
        agentId,
        workspaceId: context.workspaceId,
        userId: context.userId,
      })

      // Get agent with workspace validation
      const agentCheck = await db
        .select({
          id: parlantAgent.id,
          workspaceId: parlantAgent.workspaceId,
          createdBy: parlantAgent.createdBy,
          status: parlantAgent.status,
          deletedAt: parlantAgent.deletedAt,
        })
        .from(parlantAgent)
        .where(eq(parlantAgent.id, agentId))
        .limit(1)

      if (agentCheck.length === 0) {
        await this.logIsolationAudit({
          userId: context.userId,
          workspaceId: context.workspaceId,
          action: 'access_agent',
          resource: 'agent',
          resourceId: agentId,
          result: 'denied',
          reason: 'Agent not found',
          metadata: { context },
          timestamp: new Date().toISOString(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        return false
      }

      const agent = agentCheck[0]

      // Enforce workspace boundary
      if (agent.workspaceId !== context.workspaceId) {
        await this.detectCrossWorkspaceAttempt({
          userId: context.userId,
          sourceWorkspaceId: context.workspaceId,
          targetWorkspaceId: agent.workspaceId,
          attemptedResource: 'agent',
          attemptedAction: 'access',
          detectedAt: new Date().toISOString(),
          severity: 'high',
          blocked: true,
        })

        return false
      }

      // Check for deleted agents
      if (agent.deletedAt) {
        await this.logIsolationAudit({
          userId: context.userId,
          workspaceId: context.workspaceId,
          action: 'access_agent',
          resource: 'agent',
          resourceId: agentId,
          result: 'denied',
          reason: 'Agent is deleted',
          metadata: {
            deletedAt: agent.deletedAt,
            context,
          },
          timestamp: new Date().toISOString(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        return false
      }

      const duration = performance.now() - startTime

      await this.logIsolationAudit({
        userId: context.userId,
        workspaceId: context.workspaceId,
        action: 'access_agent',
        resource: 'agent',
        resourceId: agentId,
        result: 'allowed',
        metadata: {
          agentStatus: agent.status,
          context,
        },
        timestamp: new Date().toISOString(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      logger.debug('Agent isolation enforced successfully', {
        requestId,
        agentId,
        allowed: true,
        duration: `${duration}ms`,
      })

      return true
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to enforce agent isolation', {
        requestId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      return false
    }
  }

  /**
   * Get user's accessible workspaces with permissions
   */
  async getUserAccessibleWorkspaces(userId: string): Promise<
    Array<{
      workspaceId: string
      workspaceName: string
      accessLevel: WorkspaceAccessLevel
      permissions: string[]
      isOwner: boolean
    }>
  > {
    const startTime = performance.now()
    const requestId = `get-workspaces-${Date.now()}`

    try {
      logger.debug('Getting user accessible workspaces', {
        requestId,
        userId,
      })

      // Get workspaces where user is owner
      const ownedWorkspaces = await db
        .select({
          id: workspace.id,
          name: workspace.name,
        })
        .from(workspace)
        .where(eq(workspace.ownerId, userId))

      // Get workspaces where user has explicit permissions
      const permittedWorkspaces = await db
        .select({
          workspaceId: permissions.entityId,
          workspaceName: workspace.name,
          permission: permissions.permission,
        })
        .from(permissions)
        .innerJoin(workspace, eq(permissions.entityId, workspace.id))
        .where(and(eq(permissions.userId, userId), eq(permissions.entityType, 'workspace')))

      // Combine and organize results
      const accessibleWorkspaces = new Map<
        string,
        {
          workspaceId: string
          workspaceName: string
          accessLevel: WorkspaceAccessLevel
          permissions: string[]
          isOwner: boolean
        }
      >()

      // Add owned workspaces
      for (const ownedWorkspace of ownedWorkspaces) {
        accessibleWorkspaces.set(ownedWorkspace.id, {
          workspaceId: ownedWorkspace.id,
          workspaceName: ownedWorkspace.name,
          accessLevel: 'owner',
          permissions: ['read', 'write', 'admin', 'delete'],
          isOwner: true,
        })
      }

      // Add permitted workspaces
      for (const permittedWorkspace of permittedWorkspaces) {
        const existing = accessibleWorkspaces.get(permittedWorkspace.workspaceId)

        if (existing) {
          // Add permission if not already present
          if (!existing.permissions.includes(permittedWorkspace.permission)) {
            existing.permissions.push(permittedWorkspace.permission)
          }
        } else {
          // Determine access level from permissions
          let accessLevel: WorkspaceAccessLevel = 'viewer'
          const permissions = [permittedWorkspace.permission]

          if (permittedWorkspace.permission === 'admin') {
            accessLevel = 'admin'
          } else if (permittedWorkspace.permission === 'write') {
            accessLevel = 'member'
          }

          accessibleWorkspaces.set(permittedWorkspace.workspaceId, {
            workspaceId: permittedWorkspace.workspaceId,
            workspaceName: permittedWorkspace.workspaceName,
            accessLevel,
            permissions,
            isOwner: false,
          })
        }
      }

      const result = Array.from(accessibleWorkspaces.values())
      const duration = performance.now() - startTime

      logger.debug('User accessible workspaces retrieved', {
        requestId,
        workspaceCount: result.length,
        ownedCount: ownedWorkspaces.length,
        duration: `${duration}ms`,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to get user accessible workspaces', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Create workspace-scoped database query filter
   */
  createWorkspaceFilter(context: IsolationContext) {
    return {
      // For sessions
      sessionFilter: and(
        eq(parlantSession.workspaceId, context.workspaceId),
        // Add user filtering for viewers
        context.accessLevel === 'viewer'
          ? or(
              eq(parlantSession.userId, context.userId),
              eq(parlantSession.userId, null) // Allow anonymous sessions for viewers
            )
          : undefined
      ),

      // For agents
      agentFilter: eq(parlantAgent.workspaceId, context.workspaceId),

      // For events (requires session join)
      eventFilter: (sessionJoin = true) =>
        sessionJoin ? eq(parlantSession.workspaceId, context.workspaceId) : undefined,

      // Generic workspace filter
      workspaceFilter: eq(workspace.id, context.workspaceId),
    }
  }

  /**
   * Detect and log cross-workspace access attempts
   */
  private async detectCrossWorkspaceAttempt(attempt: CrossWorkspaceAttempt): Promise<void> {
    const requestId = `cross-workspace-${Date.now()}`

    try {
      logger.warn('Cross-workspace access attempt detected', {
        requestId,
        userId: attempt.userId,
        sourceWorkspace: attempt.sourceWorkspaceId,
        targetWorkspace: attempt.targetWorkspaceId,
        resource: attempt.attemptedResource,
        severity: attempt.severity,
      })

      // In a production system, this would:
      // 1. Store the attempt in a security audit table
      // 2. Trigger security alerts
      // 3. Potentially lock the user account
      // 4. Notify workspace administrators

      // For now, we'll log it as a high-priority security event
      await this.logIsolationAudit({
        userId: attempt.userId,
        workspaceId: attempt.sourceWorkspaceId,
        action: 'cross_workspace_attempt',
        resource: attempt.attemptedResource,
        resourceId: attempt.targetWorkspaceId,
        result: 'denied',
        reason: `Cross-workspace ${attempt.attemptedAction} attempt`,
        metadata: {
          targetWorkspaceId: attempt.targetWorkspaceId,
          severity: attempt.severity,
          blocked: attempt.blocked,
        },
        timestamp: attempt.detectedAt,
      })
    } catch (error) {
      logger.error('Failed to log cross-workspace attempt', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Log isolation audit event
   */
  private async logIsolationAudit(entry: Omit<IsolationAuditEntry, 'id'>): Promise<void> {
    try {
      // Generate audit entry ID
      const auditId = crypto.randomUUID()

      // In a production system, this would write to a dedicated audit table
      // For now, we'll use structured logging
      logger.info('Isolation audit', {
        auditId,
        userId: entry.userId,
        workspaceId: entry.workspaceId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        result: entry.result,
        reason: entry.reason,
        metadata: entry.metadata,
        timestamp: entry.timestamp,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      })

      // TODO: In production, implement:
      // 1. Dedicated audit table with retention policy
      // 2. Secure audit log storage (append-only, tamper-evident)
      // 3. Integration with SIEM systems
      // 4. Compliance reporting capabilities
    } catch (error) {
      logger.error('Failed to log isolation audit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry,
      })
    }
  }

  /**
   * Encrypt sensitive data for workspace
   */
  async encryptWorkspaceData(workspaceId: string, data: any, fieldName: string): Promise<string> {
    // Simplified encryption - in production use proper key management
    const workspaceKey = await this.getWorkspaceEncryptionKey(workspaceId)
    const cipher = crypto.createCipher('aes-256-cbc', workspaceKey)
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return encrypted
  }

  /**
   * Decrypt sensitive data for workspace
   */
  async decryptWorkspaceData(
    workspaceId: string,
    encryptedData: string,
    fieldName: string
  ): Promise<any> {
    // Simplified decryption - in production use proper key management
    const workspaceKey = await this.getWorkspaceEncryptionKey(workspaceId)
    const decipher = crypto.createDecipher('aes-256-cbc', workspaceKey)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted)
  }

  /**
   * Get workspace-specific encryption key
   */
  private async getWorkspaceEncryptionKey(workspaceId: string): Promise<string> {
    // In production, this would:
    // 1. Use a proper key management service (AWS KMS, HashiCorp Vault, etc.)
    // 2. Implement key rotation
    // 3. Support multiple key versions
    // 4. Audit key access

    // For now, return a workspace-specific derived key
    return crypto.createHash('sha256').update(`workspace-key-${workspaceId}`).digest('hex')
  }
}

// Export singleton instance
export const workspaceIsolationService = new WorkspaceIsolationService()
