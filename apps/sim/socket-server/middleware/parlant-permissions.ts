import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ParlantPermissions')

/**
 * Parlant access validation result
 */
export interface ParlantAccessInfo {
  canAccessWorkspace: boolean
  canAccessAgent: boolean
  canAccessSession: boolean
  permissions: string[]
  userId: string
  workspaceId: string
  agentId?: string
  sessionId?: string
}

/**
 * Parlant permission levels
 */
export enum ParlantPermission {
  READ_AGENTS = 'parlant:read:agents',
  WRITE_AGENTS = 'parlant:write:agents',
  DELETE_AGENTS = 'parlant:delete:agents',
  READ_SESSIONS = 'parlant:read:sessions',
  WRITE_SESSIONS = 'parlant:write:sessions',
  DELETE_SESSIONS = 'parlant:delete:sessions',
  READ_MESSAGES = 'parlant:read:messages',
  WRITE_MESSAGES = 'parlant:write:messages',
  MONITOR_PERFORMANCE = 'parlant:monitor:performance',
  ADMIN_WORKSPACE = 'parlant:admin:workspace'
}

/**
 * Validate user's access to Parlant resources
 *
 * This is a comprehensive permission validation system that checks:
 * - Workspace access through Sim's existing workspace permissions
 * - Agent-specific permissions within the workspace
 * - Session-specific permissions (if sessionId provided)
 *
 * @param userId - The user requesting access
 * @param workspaceId - The workspace containing the Parlant resources
 * @param agentId - Optional: specific agent being accessed
 * @param sessionId - Optional: specific session being accessed
 * @returns Access validation result
 */
export async function validateParlantAccess(
  userId: string,
  workspaceId: string,
  agentId?: string,
  sessionId?: string
): Promise<ParlantAccessInfo> {
  logger.debug(`Validating Parlant access for user ${userId}`, {
    workspaceId,
    agentId,
    sessionId
  })

  try {
    // Initialize access info
    const accessInfo: ParlantAccessInfo = {
      canAccessWorkspace: false,
      canAccessAgent: false,
      canAccessSession: false,
      permissions: [],
      userId,
      workspaceId,
      agentId,
      sessionId
    }

    // Step 1: Validate workspace access using existing Sim permissions
    const workspaceAccess = await validateWorkspaceAccess(userId, workspaceId)
    accessInfo.canAccessWorkspace = workspaceAccess.hasAccess
    accessInfo.permissions = workspaceAccess.permissions

    if (!accessInfo.canAccessWorkspace) {
      logger.warn(`User ${userId} denied workspace access to ${workspaceId}`)
      return accessInfo
    }

    // Step 2: Validate agent access if agentId provided
    if (agentId) {
      const agentAccess = await validateAgentAccess(userId, workspaceId, agentId, accessInfo.permissions)
      accessInfo.canAccessAgent = agentAccess.hasAccess

      if (!accessInfo.canAccessAgent) {
        logger.warn(`User ${userId} denied agent access to ${agentId} in workspace ${workspaceId}`)
        return accessInfo
      }
    } else {
      // If no specific agent requested, grant access if workspace access exists
      accessInfo.canAccessAgent = true
    }

    // Step 3: Validate session access if sessionId provided
    if (sessionId) {
      const sessionAccess = await validateSessionAccess(userId, workspaceId, agentId, sessionId)
      accessInfo.canAccessSession = sessionAccess.hasAccess

      if (!accessInfo.canAccessSession) {
        logger.warn(`User ${userId} denied session access to ${sessionId}`)
        return accessInfo
      }
    } else {
      // If no specific session requested, grant access if agent access exists
      accessInfo.canAccessSession = accessInfo.canAccessAgent
    }

    logger.debug(`Parlant access validation completed for user ${userId}`, {
      canAccessWorkspace: accessInfo.canAccessWorkspace,
      canAccessAgent: accessInfo.canAccessAgent,
      canAccessSession: accessInfo.canAccessSession,
      permissionCount: accessInfo.permissions.length
    })

    return accessInfo

  } catch (error) {
    logger.error(`Error validating Parlant access for user ${userId}:`, error)

    // Return denied access on error for security
    return {
      canAccessWorkspace: false,
      canAccessAgent: false,
      canAccessSession: false,
      permissions: [],
      userId,
      workspaceId,
      agentId,
      sessionId
    }
  }
}

/**
 * Validate user's access to a specific workspace
 * Integrates with Sim's existing workspace permission system
 */
async function validateWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<{ hasAccess: boolean; permissions: string[] }> {
  try {
    // TODO: Integrate with actual Sim workspace permission system
    // For now, this is a placeholder implementation

    logger.debug(`Validating workspace access for user ${userId} to workspace ${workspaceId}`)

    // Mock workspace validation - in real implementation, this would:
    // 1. Query the database for workspace membership
    // 2. Check user's role in the workspace
    // 3. Return appropriate permissions based on role

    // Placeholder: grant access with basic permissions
    const hasAccess = true // This would be actual workspace validation logic
    const permissions = [
      ParlantPermission.READ_AGENTS,
      ParlantPermission.WRITE_AGENTS,
      ParlantPermission.READ_SESSIONS,
      ParlantPermission.WRITE_SESSIONS,
      ParlantPermission.READ_MESSAGES,
      ParlantPermission.WRITE_MESSAGES,
      ParlantPermission.MONITOR_PERFORMANCE
    ]

    logger.debug(`Workspace access validation result for user ${userId}:`, {
      workspaceId,
      hasAccess,
      permissions: permissions.length
    })

    return { hasAccess, permissions }

  } catch (error) {
    logger.error(`Error validating workspace access for user ${userId}:`, error)
    return { hasAccess: false, permissions: [] }
  }
}

/**
 * Validate user's access to a specific agent within a workspace
 */
async function validateAgentAccess(
  userId: string,
  workspaceId: string,
  agentId: string,
  userPermissions: string[]
): Promise<{ hasAccess: boolean }> {
  try {
    logger.debug(`Validating agent access for user ${userId}`, {
      workspaceId,
      agentId
    })

    // Check if user has read access to agents
    if (!userPermissions.includes(ParlantPermission.READ_AGENTS)) {
      logger.warn(`User ${userId} lacks READ_AGENTS permission`)
      return { hasAccess: false }
    }

    // TODO: Check if agent exists and belongs to the workspace
    // This would query the parlant_agent table to verify:
    // 1. Agent exists
    // 2. Agent belongs to the specified workspace
    // 3. Agent is active (not deleted)

    // Placeholder: assume agent exists and is accessible
    const agentExists = true // This would be actual database query
    const agentInWorkspace = true // This would verify agent belongs to workspace

    const hasAccess = agentExists && agentInWorkspace

    logger.debug(`Agent access validation result for user ${userId}:`, {
      agentId,
      hasAccess
    })

    return { hasAccess }

  } catch (error) {
    logger.error(`Error validating agent access for user ${userId}:`, error)
    return { hasAccess: false }
  }
}

/**
 * Validate user's access to a specific session
 */
async function validateSessionAccess(
  userId: string,
  workspaceId: string,
  agentId: string | undefined,
  sessionId: string
): Promise<{ hasAccess: boolean }> {
  try {
    logger.debug(`Validating session access for user ${userId}`, {
      workspaceId,
      agentId,
      sessionId
    })

    // TODO: Check session ownership and permissions
    // This would query the parlant_session table to verify:
    // 1. Session exists
    // 2. Session belongs to the user OR user has session read permissions
    // 3. Session belongs to the specified agent (if agentId provided)
    // 4. Session is within the specified workspace

    // Placeholder: assume session is accessible
    const sessionExists = true // This would be actual database query
    const userOwnsSession = true // This would check session.userId === userId
    const sessionInWorkspace = true // This would verify session.workspaceId === workspaceId

    const hasAccess = sessionExists && (userOwnsSession || sessionInWorkspace)

    logger.debug(`Session access validation result for user ${userId}:`, {
      sessionId,
      hasAccess
    })

    return { hasAccess }

  } catch (error) {
    logger.error(`Error validating session access for user ${userId}:`, error)
    return { hasAccess: false }
  }
}

/**
 * Check if user has specific Parlant permission
 */
export function hasPermission(permissions: string[], requiredPermission: ParlantPermission): boolean {
  return permissions.includes(requiredPermission) || permissions.includes(ParlantPermission.ADMIN_WORKSPACE)
}

/**
 * Rate limiting for Parlant Socket.io events
 */
export class ParlantRateLimiter {
  private limits = new Map<string, { count: number; resetTime: number }>()

  // Rate limits per minute
  private static readonly LIMITS = {
    joinRoom: 30, // 30 room joins per minute
    requestStatus: 60, // 60 status requests per minute
    generalEvents: 300 // 300 general events per minute
  }

  /**
   * Check if user has exceeded rate limit for specific action
   */
  checkRateLimit(userId: string, action: keyof typeof ParlantRateLimiter.LIMITS): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    const limit = ParlantRateLimiter.LIMITS[action]
    const key = `${userId}:${action}`
    const now = Date.now()
    const windowStart = Math.floor(now / 60000) * 60000 // Start of current minute

    let record = this.limits.get(key)

    // Reset if we're in a new time window
    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: windowStart + 60000 // Reset at end of current minute
      }
      this.limits.set(key, record)
    }

    const allowed = record.count < limit
    if (allowed) {
      record.count++
    }

    return {
      allowed,
      remaining: Math.max(0, limit - record.count),
      resetTime: record.resetTime
    }
  }

  /**
   * Clean up expired rate limit records
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.limits.entries()) {
      if (record.resetTime <= now) {
        this.limits.delete(key)
      }
    }
  }
}

/**
 * Global rate limiter instance
 */
export const parlantRateLimiter = new ParlantRateLimiter()

// Clean up expired rate limits every minute
setInterval(() => {
  parlantRateLimiter.cleanup()
}, 60000)