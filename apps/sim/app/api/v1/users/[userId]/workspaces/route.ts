import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@sim/db'
import * as schema from '@sim/db/schema'
import { eq, and } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('UserWorkspacesAPI')

/**
 * Get user's workspaces with permissions
 * Used by Parlant server for authentication bridge
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate the request is authenticated (internal service call)
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // For internal service calls, we trust the JWT from Parlant server
    // In production, you might want additional validation

    logger.info(`Fetching workspaces for user: ${userId}`)

    // Get user's workspaces through permissions system
    const userPermissions = await db
      .select({
        workspaceId: schema.permissions.entityId,
        permissionType: schema.permissions.permissionType,
        workspace: {
          id: schema.workspace.id,
          name: schema.workspace.name,
          ownerId: schema.workspace.ownerId,
          createdAt: schema.workspace.createdAt,
          updatedAt: schema.workspace.updatedAt,
        }
      })
      .from(schema.permissions)
      .leftJoin(
        schema.workspace,
        eq(schema.permissions.entityId, schema.workspace.id)
      )
      .where(
        and(
          eq(schema.permissions.userId, userId),
          eq(schema.permissions.entityType, 'workspace')
        )
      )

    // Transform permissions data into workspace objects
    const workspaceMap = new Map()

    for (const permission of userPermissions) {
      if (!permission.workspace) continue

      const workspaceId = permission.workspaceId

      if (!workspaceMap.has(workspaceId)) {
        workspaceMap.set(workspaceId, {
          id: permission.workspace.id,
          name: permission.workspace.name,
          owner_id: permission.workspace.ownerId,
          created_at: permission.workspace.createdAt?.toISOString(),
          updated_at: permission.workspace.updatedAt?.toISOString(),
          permissions: [],
          role: permission.workspace.ownerId === userId ? 'owner' : 'member'
        })
      }

      // Add permission to workspace
      const workspace = workspaceMap.get(workspaceId)
      workspace.permissions.push(permission.permissionType)
    }

    const workspaces = Array.from(workspaceMap.values())

    logger.info(`Found ${workspaces.length} workspaces for user ${userId}`)

    return NextResponse.json({
      user_id: userId,
      workspaces
    })

  } catch (error) {
    logger.error('Error fetching user workspaces:', {
      error: error instanceof Error ? error.message : error,
      userId: params.userId
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}