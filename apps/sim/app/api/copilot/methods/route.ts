import { type NextRequest, NextResponse } from 'next/server'
import {
  authenticateCopilotRequestSessionOnly,
  createInternalServerErrorResponse,
  createRequestTracker,
  createUnauthorizedResponse,
} from '@/lib/copilot/auth'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('CopilotMethodsAPI')

/**
 * GET /api/copilot/methods
 * Returns available copilot methods for the authenticated user
 */
export async function GET(req: NextRequest) {
  const tracker = createRequestTracker()

  try {
    // Authenticate the request using session-only authentication
    const { userId, isAuthenticated } = await authenticateCopilotRequestSessionOnly()
    if (!isAuthenticated || !userId) {
      logger.warn(`[${tracker.requestId}] Unauthorized access attempt to copilot methods`)
      return createUnauthorizedResponse()
    }

    logger.info(`[${tracker.requestId}] Fetching copilot methods`, { userId })

    // Mock copilot methods data - in a real implementation this would come from a database
    // or external service that manages available copilot capabilities
    const methods = [
      {
        id: 'chat',
        name: 'Chat',
        description: 'Interactive chat interface with AI assistant',
        category: 'communication',
        enabled: true,
      },
      {
        id: 'tools',
        name: 'Tools',
        description: 'Execute various tools and utilities',
        category: 'utilities',
        enabled: true,
      },
      {
        id: 'workflows',
        name: 'Workflows',
        description: 'Manage and execute automated workflows',
        category: 'automation',
        enabled: true,
      },
      {
        id: 'analysis',
        name: 'Data Analysis',
        description: 'Perform data analysis and insights',
        category: 'analytics',
        enabled: true,
      },
    ]

    logger.info(`[${tracker.requestId}] Successfully retrieved ${methods.length} methods`, {
      userId,
      methodCount: methods.length,
    })

    return NextResponse.json({
      success: true,
      methods,
    })
  } catch (error) {
    logger.error(`[${tracker.requestId}] Failed to fetch copilot methods:`, error)
    return createInternalServerErrorResponse('Failed to fetch copilot methods')
  }
}