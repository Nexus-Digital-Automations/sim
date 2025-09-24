/**
 * Parlant Authentication Bridge
 *
 * This module provides authentication integration between Sim's Better Auth
 * and the Parlant server, enabling seamless user context sharing.
 */

import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ParlantAuthBridge')

export interface ParlantUserContext {
  user_id: string
  email: string
  name: string
  email_verified: boolean
  image: string | null
  active_organization_id: string | null
  workspaces: Array<{
    id: string
    name: string
    role: string
    permissions: string[]
  }>
  session_id: string
  expires_at: string
}

export interface ParlantRequestHeaders {
  Authorization: string
  'X-User-Context': string
  'X-Workspace-Id'?: string
  'Content-Type': 'application/json'
}

/**
 * Get current user session for Parlant integration
 */
export async function getParlantUserContext(): Promise<ParlantUserContext | null> {
  try {
    const session = await getSession()

    if (!session?.user || !session?.session) {
      logger.debug('No active session found for Parlant context')
      return null
    }

    const { user, session: sessionData } = session

    // Get user's workspaces (simplified for now)
    // In production, this would query the actual permissions system
    const workspaces = [
      {
        id: 'default-workspace',
        name: 'Default Workspace',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
      },
    ]

    const userContext: ParlantUserContext = {
      user_id: user.id,
      email: user.email,
      name: user.name || '',
      email_verified: user.emailVerified || false,
      image: user.image || null,
      active_organization_id: sessionData.activeOrganizationId || null,
      workspaces,
      session_id: sessionData.id,
      expires_at: sessionData.expiresAt.toISOString(),
    }

    logger.debug('Created Parlant user context', {
      userId: user.id,
      email: user.email,
    })

    return userContext
  } catch (error) {
    logger.error('Error creating Parlant user context:', error)
    return null
  }
}

/**
 * Create authentication headers for Parlant API requests
 */
export async function createParlantHeaders(
  workspaceId?: string
): Promise<ParlantRequestHeaders | null> {
  try {
    const userContext = await getParlantUserContext()

    if (!userContext) {
      return null
    }

    // Get session token from cookies
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('better-auth.session_token')?.value

    if (!sessionToken) {
      logger.warn('No session token found in cookies')
      return null
    }

    const headers: ParlantRequestHeaders = {
      Authorization: `Bearer ${sessionToken}`,
      'X-User-Context': Buffer.from(JSON.stringify(userContext)).toString('base64'),
      'Content-Type': 'application/json',
    }

    if (workspaceId) {
      headers['X-Workspace-Id'] = workspaceId
    }

    return headers
  } catch (error) {
    logger.error('Error creating Parlant headers:', error)
    return null
  }
}

/**
 * Validate workspace access for current user
 */
export async function validateWorkspaceAccess(workspaceId: string): Promise<boolean> {
  try {
    const userContext = await getParlantUserContext()

    if (!userContext) {
      return false
    }

    // Check if user has access to the workspace
    const hasAccess = userContext.workspaces.some((workspace) => workspace.id === workspaceId)

    if (!hasAccess) {
      logger.warn('User denied workspace access', {
        userId: userContext.user_id,
        workspaceId,
      })
    }

    return hasAccess
  } catch (error) {
    logger.error('Error validating workspace access:', error)
    return false
  }
}

/**
 * Create a Parlant API client with authentication
 */
export class ParlantApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = env.PARLANT_SERVER_URL || 'http://localhost:8001'
  }

  private async getAuthenticatedHeaders(workspaceId?: string) {
    const headers = await createParlantHeaders(workspaceId)

    if (!headers) {
      throw new Error('Authentication required - no valid session')
    }

    return headers
  }

  async get<T = any>(path: string, workspaceId?: string): Promise<T> {
    const headers = await this.getAuthenticatedHeaders(workspaceId)

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`Parlant API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async post<T = any>(path: string, data: any, workspaceId?: string): Promise<T> {
    const headers = await this.getAuthenticatedHeaders(workspaceId)

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Parlant API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async put<T = any>(path: string, data: any, workspaceId?: string): Promise<T> {
    const headers = await this.getAuthenticatedHeaders(workspaceId)

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Parlant API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async delete<T = any>(path: string, workspaceId?: string): Promise<T> {
    const headers = await this.getAuthenticatedHeaders(workspaceId)

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers,
    })

    if (!response.ok) {
      throw new Error(`Parlant API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }
}

/**
 * Create a Parlant session for the current user in a specific workspace
 */
export async function createParlantSession(
  agentId: string,
  workspaceId: string,
  metadata?: Record<string, any>
): Promise<{ sessionId: string } | null> {
  try {
    const client = new ParlantApiClient()

    const sessionData = {
      agent_id: agentId,
      workspace_id: workspaceId,
      metadata: metadata || {},
    }

    const response = await client.post('/api/v1/sessions', sessionData, workspaceId)

    logger.info('Created Parlant session', {
      sessionId: response.id,
      agentId,
      workspaceId,
    })

    return { sessionId: response.id }
  } catch (error) {
    logger.error('Error creating Parlant session:', error)
    return null
  }
}

/**
 * Check authentication status for Parlant integration
 */
export async function isParlantAuthenticated(): Promise<boolean> {
  const userContext = await getParlantUserContext()
  return userContext !== null
}

/**
 * Helper function to extract user context from Parlant request headers
 */
export function extractUserContextFromHeaders(
  headers: Record<string, string>
): ParlantUserContext | null {
  try {
    const contextHeader = headers['x-user-context']

    if (!contextHeader) {
      return null
    }

    const decodedContext = Buffer.from(contextHeader, 'base64').toString('utf-8')
    return JSON.parse(decodedContext) as ParlantUserContext
  } catch (error) {
    logger.error('Error extracting user context from headers:', error)
    return null
  }
}
