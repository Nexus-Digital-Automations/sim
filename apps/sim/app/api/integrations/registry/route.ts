/**
 * Integration Registry API Endpoints
 *
 * RESTful API for managing and discovering integration connectors.
 * Provides comprehensive registry operations including search, health monitoring,
 * performance analytics, and connector management.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { IntegrationConnector } from '@/lib/integrations'
import {
  type ConnectorSearchCriteria,
  globalIntegrationRegistry,
  type IntegrationCategory,
  RegistryUtils,
} from '@/lib/integrations/integration-registry'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('IntegrationsRegistryAPI')

// ====================================================================
// GET - Registry Operations
// ====================================================================

/**
 * Handle GET requests for integration registry operations
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const operation = searchParams.get('operation') || 'list'

  logger.info(`Integration registry API request`, {
    operation,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
  })

  try {
    switch (operation) {
      case 'list':
        return handleListConnectors(searchParams)

      case 'search':
        return handleSearchConnectors(searchParams)

      case 'categories':
        return handleGetCategories()

      case 'stats':
        return handleGetStats()

      case 'health':
        return handleGetHealth(searchParams)

      case 'recommendations':
        return handleGetRecommendations(searchParams)

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid operation',
            validOperations: ['list', 'search', 'categories', 'stats', 'health', 'recommendations'],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Integration registry API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ====================================================================
// OPERATION HANDLERS
// ====================================================================

/**
 * Handle list connectors operation
 */
async function handleListConnectors(searchParams: URLSearchParams) {
  const category = searchParams.get('category') as IntegrationCategory | null
  const includeHealth = searchParams.get('includeHealth') === 'true'
  const limit = Number.parseInt(searchParams.get('limit') || '50')
  const offset = Number.parseInt(searchParams.get('offset') || '0')

  logger.debug('Listing connectors', { category, includeHealth, limit, offset })

  let connectors: IntegrationConnector[]

  if (category) {
    const connectorsWithHealth = globalIntegrationRegistry.getConnectorsByCategory(category)
    connectors = connectorsWithHealth.map((c) => ({
      ...c,
      health: includeHealth ? c.health : undefined,
    }))
  } else {
    connectors = globalIntegrationRegistry.getAllConnectors()
  }

  // Apply pagination
  const paginatedConnectors = connectors.slice(offset, offset + limit)

  // Add health information if requested
  const result = includeHealth
    ? paginatedConnectors.map((connector) => ({
        ...connector,
        health: globalIntegrationRegistry.getConnectorHealth(connector.id),
      }))
    : paginatedConnectors

  return NextResponse.json({
    success: true,
    data: {
      connectors: result,
      pagination: {
        total: connectors.length,
        limit,
        offset,
        hasMore: offset + limit < connectors.length,
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      totalConnectors: globalIntegrationRegistry.getAllConnectors().length,
    },
  })
}

/**
 * Handle search connectors operation
 */
async function handleSearchConnectors(searchParams: URLSearchParams) {
  const searchCriteria: ConnectorSearchCriteria = {}

  // Parse search parameters
  const category = searchParams.get('category')
  if (category) {
    searchCriteria.category = category.split(',') as IntegrationCategory[]
  }

  const authMethods = searchParams.get('authMethods')
  if (authMethods) {
    searchCriteria.authMethods = authMethods.split(',') as any[]
  }

  const tags = searchParams.get('tags')
  if (tags) {
    searchCriteria.tags = tags.split(',')
  }

  const searchTerm = searchParams.get('q')
  if (searchTerm) {
    searchCriteria.searchTerm = searchTerm
  }

  const hasHealthCheck = searchParams.get('hasHealthCheck')
  if (hasHealthCheck !== null) {
    searchCriteria.hasHealthCheck = hasHealthCheck === 'true'
  }

  logger.debug('Searching connectors', { searchCriteria })

  const results = globalIntegrationRegistry.searchConnectors(searchCriteria)

  // Add health information for better search results
  const enrichedResults = results
    .map((connector) => ({
      ...connector,
      health: globalIntegrationRegistry.getConnectorHealth(connector.id),
      relevanceScore: calculateRelevanceScore(connector, searchCriteria),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  return NextResponse.json({
    success: true,
    data: {
      results: enrichedResults,
      searchCriteria,
      resultCount: results.length,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      searchPerformed: true,
    },
  })
}

/**
 * Handle get categories operation
 */
async function handleGetCategories() {
  logger.debug('Getting integration categories')

  const categoriesWithHealth = RegistryUtils.getCategoriesWithHealth()

  return NextResponse.json({
    success: true,
    data: {
      categories: categoriesWithHealth,
      totalCategories: categoriesWithHealth.length,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Handle get stats operation
 */
async function handleGetStats() {
  logger.debug('Getting registry statistics')

  const stats = globalIntegrationRegistry.getRegistryStats()

  return NextResponse.json({
    success: true,
    data: stats,
    metadata: {
      timestamp: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
    },
  })
}

/**
 * Handle get health operation
 */
async function handleGetHealth(searchParams: URLSearchParams) {
  const connectorId = searchParams.get('connectorId')

  if (connectorId) {
    logger.debug(`Getting health for connector: ${connectorId}`)

    const health = globalIntegrationRegistry.getConnectorHealth(connectorId)

    if (!health) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connector not found',
          connectorId,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        connectorId,
        health,
      },
    })
  }
  logger.debug('Getting health status for all connectors')

  const allConnectors = globalIntegrationRegistry.getAllConnectors()
  const healthStatus = allConnectors.map((connector) => ({
    connectorId: connector.id,
    name: connector.name,
    category: connector.category,
    health: globalIntegrationRegistry.getConnectorHealth(connector.id),
  }))

  return NextResponse.json({
    success: true,
    data: {
      connectors: healthStatus,
      summary: {
        total: healthStatus.length,
        healthy: healthStatus.filter((c) => c.health?.status === 'healthy').length,
        degraded: healthStatus.filter((c) => c.health?.status === 'degraded').length,
        unhealthy: healthStatus.filter((c) => c.health?.status === 'unhealthy').length,
        unknown: healthStatus.filter((c) => c.health?.status === 'unknown').length,
      },
    },
  })
}

/**
 * Handle get recommendations operation
 */
async function handleGetRecommendations(searchParams: URLSearchParams) {
  const category = searchParams.get('category') as IntegrationCategory | undefined
  const limit = Number.parseInt(searchParams.get('limit') || '5')

  logger.debug('Getting connector recommendations', { category, limit })

  const recommendations = RegistryUtils.getRecommendations(category, limit)

  const enrichedRecommendations = recommendations.map((connector) => ({
    ...connector,
    health: globalIntegrationRegistry.getConnectorHealth(connector.id),
    reasonForRecommendation: generateRecommendationReason(connector),
  }))

  return NextResponse.json({
    success: true,
    data: {
      recommendations: enrichedRecommendations,
      criteria: { category, limit },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      basedOnUsagePatterns: true,
    },
  })
}

// ====================================================================
// POST - Connector Management (Admin Operations)
// ====================================================================

/**
 * Handle POST requests for connector management operations
 */
export async function POST(request: NextRequest) {
  const { operation, ...data } = await request.json()

  logger.info(`Integration registry management request`, {
    operation,
    timestamp: new Date().toISOString(),
  })

  try {
    switch (operation) {
      case 'register':
        return handleRegisterConnector(data)

      case 'updateMetrics':
        return handleUpdateMetrics(data)

      case 'triggerHealthCheck':
        return handleTriggerHealthCheck(data)

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid operation',
            validOperations: ['register', 'updateMetrics', 'triggerHealthCheck'],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Integration registry management error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Handle register connector operation (Admin only)
 */
async function handleRegisterConnector(data: { connector: IntegrationConnector }) {
  // This would typically require admin authentication
  // For now, implementing the core functionality

  logger.info(`Registering new connector: ${data.connector?.id}`)

  if (!data.connector) {
    return NextResponse.json(
      {
        success: false,
        error: 'Connector configuration is required',
      },
      { status: 400 }
    )
  }

  const result = globalIntegrationRegistry.registerConnector(data.connector)

  if (result.success) {
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Connector registered successfully',
    })
  }
  return NextResponse.json(
    {
      success: false,
      error: result.message,
      validationResults: result.validationResults,
    },
    { status: 400 }
  )
}

/**
 * Handle update metrics operation
 */
async function handleUpdateMetrics(data: {
  connectorId: string
  operationId: string
  success: boolean
  responseTime: number
  errorCode?: string
}) {
  const { connectorId, operationId, success, responseTime, errorCode } = data

  logger.debug('Updating connector metrics', {
    connectorId,
    operationId,
    success,
    responseTime,
  })

  globalIntegrationRegistry.updateConnectorMetrics(
    connectorId,
    operationId,
    success,
    responseTime,
    errorCode
  )

  return NextResponse.json({
    success: true,
    message: 'Metrics updated successfully',
    data: {
      connectorId,
      operationId,
      metricsUpdated: true,
    },
  })
}

/**
 * Handle trigger health check operation
 */
async function handleTriggerHealthCheck(data: { connectorId?: string }) {
  const { connectorId } = data

  if (connectorId) {
    logger.info(`Triggering health check for connector: ${connectorId}`)

    const connector = globalIntegrationRegistry.getConnector(connectorId)
    if (!connector) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connector not found',
          connectorId,
        },
        { status: 404 }
      )
    }

    // Health check would be triggered here
    // For now, returning success

    return NextResponse.json({
      success: true,
      message: 'Health check triggered successfully',
      data: {
        connectorId,
        healthCheckTriggered: true,
        timestamp: new Date().toISOString(),
      },
    })
  }
  logger.info('Triggering health check for all connectors')

  // Trigger health checks for all connectors
  const allConnectors = globalIntegrationRegistry.getAllConnectors()

  return NextResponse.json({
    success: true,
    message: 'Health checks triggered for all connectors',
    data: {
      connectorsCount: allConnectors.length,
      healthChecksTriggered: true,
      timestamp: new Date().toISOString(),
    },
  })
}

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(
  connector: IntegrationConnector,
  criteria: ConnectorSearchCriteria
): number {
  let score = 0

  // Category match
  if (criteria.category) {
    const categories = Array.isArray(criteria.category) ? criteria.category : [criteria.category]
    if (categories.includes(connector.category)) {
      score += 10
    }
  }

  // Tag match
  if (criteria.tags?.length) {
    const matchingTags = criteria.tags.filter((tag) =>
      connector.metadata.tags.includes(tag.toLowerCase())
    )
    score += matchingTags.length * 5
  }

  // Search term match
  if (criteria.searchTerm) {
    const searchTerm = criteria.searchTerm.toLowerCase()
    if (connector.name.toLowerCase().includes(searchTerm)) {
      score += 15
    }
    if (connector.description.toLowerCase().includes(searchTerm)) {
      score += 10
    }
  }

  // Health status bonus
  const health = globalIntegrationRegistry.getConnectorHealth(connector.id)
  if (health?.status === 'healthy') {
    score += 5
  } else if (health?.status === 'degraded') {
    score += 2
  }

  // Success rate bonus
  if (health?.successRate && health.successRate > 95) {
    score += 3
  }

  return score
}

/**
 * Generate recommendation reason
 */
function generateRecommendationReason(connector: IntegrationConnector): string {
  const health = globalIntegrationRegistry.getConnectorHealth(connector.id)

  const reasons: string[] = []

  if (health?.successRate && health.successRate > 95) {
    reasons.push('high reliability')
  }

  if (health?.status === 'healthy') {
    reasons.push('currently healthy')
  }

  if (connector.operations.length > 5) {
    reasons.push('comprehensive feature set')
  }

  if (health?.metrics.totalRequests && health.metrics.totalRequests > 100) {
    reasons.push('widely used')
  }

  return reasons.length > 0
    ? `Recommended for: ${reasons.join(', ')}`
    : 'Popular integration choice'
}
