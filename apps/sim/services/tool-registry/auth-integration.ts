/**
 * Authentication and Workspace Integration for Tool Registry
 *
 * Integrates with Sim's existing authentication system and workspace management
 * to provide secure, multi-tenant tool access and configuration.
 */

import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/packages/db'
import {
  permissions,
  toolConfigurations,
  toolRegistry,
  user,
  workspace,
} from '@/packages/db/schema'
import type { EnrichedTool, ToolSearchQuery } from './types'

const logger = createLogger('ToolRegistryAuth')

/**
 * Authentication and authorization service for the tool registry
 */
export class ToolRegistryAuthService {
  /**
   * Check if user has permission to access a tool
   */
  async hasToolAccess(
    toolId: string,
    userId: string,
    workspaceId?: string,
    requiredPermission: 'read' | 'write' | 'admin' = 'read'
  ): Promise<boolean> {
    try {
      // Get tool information
      const [tool] = await db
        .select({
          isPublic: toolRegistry.isPublic,
          requiresAuth: toolRegistry.requiresAuth,
          requiredPermissions: toolRegistry.requiredPermissions,
          scope: toolRegistry.scope,
        })
        .from(toolRegistry)
        .where(eq(toolRegistry.id, toolId))
        .limit(1)

      if (!tool) {
        return false
      }

      // Public tools with no auth requirement are always accessible
      if (tool.isPublic && !tool.requiresAuth) {
        return true
      }

      // Check user authentication
      if (tool.requiresAuth) {
        const isAuthenticated = await this.isUserAuthenticated(userId)
        if (!isAuthenticated) {
          return false
        }
      }

      // Check workspace permissions if workspace-scoped
      if (workspaceId && tool.scope === 'workspace') {
        const hasWorkspaceAccess = await this.hasWorkspaceAccess(
          userId,
          workspaceId,
          requiredPermission
        )
        if (!hasWorkspaceAccess) {
          return false
        }
      }

      // Check specific tool permissions
      const requiredPerms = JSON.parse(tool.requiredPermissions as string) as string[]
      if (requiredPerms.length > 0) {
        const hasRequiredPerms = await this.hasRequiredPermissions(
          userId,
          requiredPerms,
          workspaceId
        )
        if (!hasRequiredPerms) {
          return false
        }
      }

      return true
    } catch (error) {
      logger.error('Failed to check tool access', { toolId, userId, workspaceId, error })
      return false
    }
  }

  /**
   * Filter tools based on user permissions and workspace access
   */
  async filterToolsByAccess(
    tools: EnrichedTool[],
    userId: string,
    workspaceId?: string
  ): Promise<EnrichedTool[]> {
    try {
      const accessibleTools: EnrichedTool[] = []

      for (const tool of tools) {
        const hasAccess = await this.hasToolAccess(tool.id, userId, workspaceId)
        if (hasAccess) {
          accessibleTools.push(tool)
        }
      }

      return accessibleTools
    } catch (error) {
      logger.error('Failed to filter tools by access', { userId, workspaceId, error })
      // Return empty array on error to be safe
      return []
    }
  }

  /**
   * Apply authentication-based filters to a tool search query
   */
  applyAuthFilters(query: ToolSearchQuery, userId: string, workspaceId?: string): ToolSearchQuery {
    // If user is not authenticated, only show public tools that don't require auth
    const authFilters: Partial<ToolSearchQuery> = {
      ...query,
      isPublic: true, // Ensure only public tools are shown by default
    }

    // If workspace is specified, we can include workspace-scoped tools
    if (workspaceId) {
      authFilters.workspaceId = workspaceId
    }

    // If user is authenticated, they can see more tools
    // This would be enhanced based on user permissions
    authFilters.userId = userId

    return authFilters as ToolSearchQuery
  }

  /**
   * Get user's accessible workspaces
   */
  async getUserWorkspaces(userId: string): Promise<
    Array<{
      id: string
      Name: string
      role: string
      permissions: string[]
    }>
  > {
    try {
      const workspaces = await db
        .select({
          id: workspace.id,
          Name: workspace.Name,
          permission: permissions.permissionType,
        })
        .from(workspace)
        .innerJoin(
          permissions,
          and(
            eq(permissions.entityId, workspace.id),
            eq(permissions.entityType, 'workspace'),
            eq(permissions.userId, userId)
          )
        )

      // Group permissions by workspace
      const workspaceMap = new Map<
        string,
        {
          id: string
          Name: string
          permissions: string[]
        }
      >()

      for (const ws of workspaces) {
        if (!workspaceMap.has(ws.id)) {
          workspaceMap.set(ws.id, {
            id: ws.id,
            Name: ws.Name,
            permissions: [],
          })
        }
        workspaceMap.get(ws.id)!.permissions.push(ws.permission)
      }

      // Convert to result format
      return Array.from(workspaceMap.values()).map((ws) => ({
        ...ws,
        role: this.determineRole(ws.permissions),
      }))
    } catch (error) {
      logger.error('Failed to get user workspaces', { userId, error })
      return []
    }
  }

  /**
   * Check if user can create tool configurations
   */
  async canCreateConfiguration(
    userId: string,
    toolId: string,
    workspaceId?: string
  ): Promise<boolean> {
    try {
      // Check if user has write access to the tool
      const hasAccess = await this.hasToolAccess(toolId, userId, workspaceId, 'write')
      if (!hasAccess) {
        return false
      }

      // Check workspace-specific permissions if applicable
      if (workspaceId) {
        const hasWorkspaceAccess = await this.hasWorkspaceAccess(userId, workspaceId, 'write')
        if (!hasWorkspaceAccess) {
          return false
        }
      }

      return true
    } catch (error) {
      logger.error('Failed to check configuration creation access', {
        userId,
        toolId,
        workspaceId,
        error,
      })
      return false
    }
  }

  /**
   * Check if user can modify a tool configuration
   */
  async canModifyConfiguration(userId: string, configurationId: string): Promise<boolean> {
    try {
      // Get configuration details
      const [config] = await db
        .select({
          userId: toolConfigurations.userId,
          workspaceId: toolConfigurations.workspaceId,
          createdBy: toolConfigurations.createdBy,
          toolId: toolConfigurations.toolId,
        })
        .from(toolConfigurations)
        .where(eq(toolConfigurations.id, configurationId))
        .limit(1)

      if (!config) {
        return false
      }

      // User can modify their own configurations
      if (config.userId === userId || config.createdBy === userId) {
        return true
      }

      // Check workspace admin permissions for workspace configurations
      if (config.workspaceId) {
        const hasAdminAccess = await this.hasWorkspaceAccess(userId, config.workspaceId, 'admin')
        if (hasAdminAccess) {
          return true
        }
      }

      return false
    } catch (error) {
      logger.error('Failed to check configuration modification access', {
        userId,
        configurationId,
        error,
      })
      return false
    }
  }

  /**
   * Get user context for tool operations
   */
  async getUserContext(userId: string): Promise<{
    id: string
    Name?: string
    email?: string
    workspaces: string[]
    permissions: string[]
  } | null> {
    try {
      // Get user details
      const [userData] = await db
        .select({
          id: user.id,
          Name: user.Name,
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)

      if (!userData) {
        return null
      }

      // Get user workspaces
      const workspaces = await this.getUserWorkspaces(userId)
      const workspaceIds = workspaces.map((ws) => ws.id)

      // Get user permissions (simplified)
      const userPermissions = await db
        .select({ permission: permissions.permissionType })
        .from(permissions)
        .where(eq(permissions.userId, userId))

      const allPermissions = userPermissions.map((p) => p.permission)

      return {
        id: userData.id,
        Name: userData.Name || undefined,
        email: userData.email,
        workspaces: workspaceIds,
        permissions: Array.from(new Set(allPermissions)),
      }
    } catch (error) {
      logger.error('Failed to get user context', { userId, error })
      return null
    }
  }

  /**
   * Validate session and get user information
   */
  async validateSession(sessionToken?: string): Promise<{
    user: { id: string; Name?: string; email?: string }
    workspace?: { id: string; Name: string }
  } | null> {
    try {
      if (!sessionToken) {
        return null
      }

      // Use Sim's auth system to validate session
      const session = await auth.api.getSession({
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      } as any)

      if (!session) {
        return null
      }

      // Get active workspace from session
      let activeWorkspace = null
      if (session.activeOrganizationId) {
        const [ws] = await db
          .select({ id: workspace.id, Name: workspace.Name })
          .from(workspace)
          .where(eq(workspace.id, session.activeOrganizationId))
          .limit(1)

        if (ws) {
          activeWorkspace = ws
        }
      }

      return {
        user: {
          id: session.userId,
          Name: session.user.Name || undefined,
          email: session.user.email,
        },
        workspace: activeWorkspace || undefined,
      }
    } catch (error) {
      logger.error('Failed to validate session', { error })
      return null
    }
  }

  // Private helper methods

  /**
   * Check if user is authenticated
   */
  private async isUserAuthenticated(userId: string): Promise<boolean> {
    try {
      const [userData] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)

      return !!userData
    } catch (error) {
      logger.error('Failed to check user authentication', { userId, error })
      return false
    }
  }

  /**
   * Check if user has access to a workspace
   */
  private async hasWorkspaceAccess(
    userId: string,
    workspaceId: string,
    requiredPermission: 'read' | 'write' | 'admin'
  ): Promise<boolean> {
    try {
      const [permission] = await db
        .select({ permissionType: permissions.permissionType })
        .from(permissions)
        .where(
          and(
            eq(permissions.userId, userId),
            eq(permissions.entityType, 'workspace'),
            eq(permissions.entityId, workspaceId)
          )
        )
        .limit(1)

      if (!permission) {
        return false
      }

      // Check permission hierarchy
      const userPermission = permission.permissionType
      return this.hasPermissionLevel(userPermission, requiredPermission)
    } catch (error) {
      logger.error('Failed to check workspace access', { userId, workspaceId, error })
      return false
    }
  }

  /**
   * Check if user has required permissions
   */
  private async hasRequiredPermissions(
    userId: string,
    requiredPermissions: string[],
    workspaceId?: string
  ): Promise<boolean> {
    try {
      if (requiredPermissions.length === 0) {
        return true
      }

      const conditions = [eq(permissions.userId, userId)]

      if (workspaceId) {
        conditions.push(
          eq(permissions.entityType, 'workspace'),
          eq(permissions.entityId, workspaceId)
        )
      }

      const userPerms = await db
        .select({ permissionType: permissions.permissionType })
        .from(permissions)
        .where(and(...conditions))

      const userPermissions = userPerms.map((p) => p.permissionType)

      // Check if user has any of the required permissions
      return requiredPermissions.some((req) => userPermissions.includes(req))
    } catch (error) {
      logger.error('Failed to check required permissions', { userId, requiredPermissions, error })
      return false
    }
  }

  /**
   * Check permission level hierarchy
   */
  private hasPermissionLevel(userPermission: string, requiredPermission: string): boolean {
    const hierarchy = {
      read: 1,
      write: 2,
      admin: 3,
    }

    const userLevel = hierarchy[userPermission as keyof typeof hierarchy] || 0
    const requiredLevel = hierarchy[requiredPermission as keyof typeof hierarchy] || 0

    return userLevel >= requiredLevel
  }

  /**
   * Determine role from permissions
   */
  private determineRole(permissions: string[]): string {
    if (permissions.includes('admin')) {
      return 'admin'
    }
    if (permissions.includes('write')) {
      return 'member'
    }
    return 'viewer'
  }
}
