import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@sim/db'
import { and, eq } from 'drizzle-orm'
import { member } from '@sim/db/schema'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ChatMiddleware')

/**
 * Chat-specific middleware for authentication and authorization
 * Handles workspace access control and agent permissions
 */
export async function chatMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  // Only apply to chat routes
  if (!pathname.startsWith('/chat/')) {
    return null
  }

  logger.info('Processing chat middleware', { pathname })

  // Extract workspace ID from URL if present
  const workspaceMatch = pathname.match(/^\/chat\/workspace\/([^\/]+)/)
  const workspaceId = workspaceMatch?.[1]

  try {
    // Check authentication
    const session = await getSession()

    if (!session?.user) {
      logger.warn('Unauthenticated access to chat route', { pathname })
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // If this is a workspace-specific route, verify access
    if (workspaceId) {
      const membership = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, workspaceId)
          )
        )
        .limit(1)

      if (membership.length === 0) {
        logger.warn('Unauthorized workspace access', {
          userId: session.user.id,
          workspaceId,
          pathname
        })
        return NextResponse.redirect(new URL('/workspace', request.url))
      }

      // Add workspace context to headers for downstream components
      const response = NextResponse.next()
      response.headers.set('x-workspace-id', workspaceId)
      response.headers.set('x-user-id', session.user.id)
      response.headers.set('x-user-role', membership[0].role)

      logger.info('Chat middleware authorization successful', {
        userId: session.user.id,
        workspaceId,
        userRole: membership[0].role,
        pathname
      })

      return response
    }

    // For non-workspace routes, just add user context
    const response = NextResponse.next()
    response.headers.set('x-user-id', session.user.id)

    logger.info('Chat middleware authentication successful', {
      userId: session.user.id,
      pathname
    })

    return response

  } catch (error) {
    logger.error('Chat middleware error', { error, pathname })

    // On error, redirect to login for security
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'authentication-failed')
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

/**
 * Enhanced workspace access validation utility
 * Can be used in API routes and components
 */
export async function validateWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<{ hasAccess: boolean; role?: string; membership?: any }> {
  try {
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, workspaceId)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return { hasAccess: false }
    }

    return {
      hasAccess: true,
      role: membership[0].role,
      membership: membership[0]
    }
  } catch (error) {
    logger.error('Workspace access validation error', { error, userId, workspaceId })
    return { hasAccess: false }
  }
}

/**
 * Rate limiting for chat operations
 * Prevents abuse and ensures fair usage
 */
export class ChatRateLimiter {
  private static instances = new Map<string, { count: number; reset: number }>()

  static canProceed(userId: string, limit: number = 50, windowMs: number = 60000): boolean {
    const now = Date.now()
    const key = userId
    const instance = this.instances.get(key)

    if (!instance || now > instance.reset) {
      this.instances.set(key, { count: 1, reset: now + windowMs })
      return true
    }

    if (instance.count >= limit) {
      return false
    }

    instance.count++
    return true
  }

  static getRemainingRequests(userId: string, limit: number = 50): number {
    const instance = this.instances.get(userId)
    if (!instance || Date.now() > instance.reset) {
      return limit
    }
    return Math.max(0, limit - instance.count)
  }
}