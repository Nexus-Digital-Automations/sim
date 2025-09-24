/**
 * API Routes for Tool Registry System
 *
 * Provides REST API endpoints for tool discovery, configuration management,
 * and analytics with proper authentication and authorization.
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { ToolRegistryAuthService } from '../auth-integration'
import {
  ToolAnalyticsService,
  ToolConfigurationService,
  ToolDiscoveryService,
  ToolHealthService,
  ToolRecommendationService,
  ToolRegistryService,
} from '../index'

const logger = createLogger('ToolRegistryAPI')

// Request validation schemas
const SearchQuerySchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().optional(),
  toolType: z.enum(['builtin', 'custom', 'integration', 'plugin']).optional(),
  scope: z.enum(['global', 'workspace', 'user']).optional(),
  status: z.enum(['active', 'inactive', 'deprecated', 'maintenance']).optional(),
  tags: z.array(z.string()).optional(),
  requiresAuth: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['name', 'usage', 'rating', 'recent', 'relevance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const ConfigurationSchema = z.object({
  toolId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  configuration: z.record(z.any()),
  environmentVariables: z.record(z.string()).default({}),
  credentials: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
})

const ConfigurationUpdateSchema = ConfigurationSchema.partial().omit({ toolId: true })

const RecommendationContextSchema = z.object({
  currentTask: z.string().optional(),
  recentTools: z.array(z.string()).optional(),
  workflowContext: z.any().optional(),
  limit: z.number().min(1).max(50).default(10),
})

/**
 * Create tool registry API routes
 */
export function createToolRegistryRoutes() {
  const app = new Hono()

  // Services
  const registryService = new ToolRegistryService()
  const discoveryService = new ToolDiscoveryService()
  const configurationService = new ToolConfigurationService()
  const analyticsService = new ToolAnalyticsService()
  const recommendationService = new ToolRecommendationService()
  const healthService = new ToolHealthService()
  const authService = new ToolRegistryAuthService()

  // Middleware for authentication
  app.use('*', async (c, next) => {
    try {
      const authHeader = c.req.header('authorization')
      const token = authHeader?.replace('Bearer ', '')

      const session = await authService.validateSession(token)
      if (!session) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      c.set('user', session.user)
      c.set('workspace', session.workspace)
      await next()
    } catch (error) {
      logger.error('Authentication middleware error', { error })
      return c.json({ error: 'Authentication failed' }, 401)
    }
  })

  // Tool Discovery Routes

  /**
   * Search tools with filtering and pagination
   */
  app.get('/tools/search', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')

      const query = SearchQuerySchema.parse({
        ...c.req.query(),
        tags: c.req.query('tags')?.split(',').filter(Boolean),
        limit: Number.parseInt(c.req.query('limit') || '20'),
        offset: Number.parseInt(c.req.query('offset') || '0'),
      })

      // Apply authentication filters
      const authFilteredQuery = authService.applyAuthFilters(query, user.id, workspace?.id)

      // Perform search
      const results = await discoveryService.searchTools(authFilteredQuery)

      // Filter results by user access
      const filteredTools = await authService.filterToolsByAccess(
        results.tools,
        user.id,
        workspace?.id
      )

      return c.json({
        ...results,
        tools: filteredTools,
        total: filteredTools.length,
      })
    } catch (error) {
      logger.error('Tool search failed', { error })
      return c.json({ error: 'Search failed' }, 500)
    }
  })

  /**
   * Get tool details by ID
   */
  app.get('/tools/:toolId', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')
      const toolId = c.req.param('toolId')

      // Check access
      const hasAccess = await authService.hasToolAccess(toolId, user.id, workspace?.id)

      if (!hasAccess) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const tool = await registryService.getTool(toolId)
      if (!tool) {
        return c.json({ error: 'Tool not found' }, 404)
      }

      return c.json(tool)
    } catch (error) {
      logger.error('Get tool failed', { error })
      return c.json({ error: 'Failed to get tool' }, 500)
    }
  })

  /**
   * Get popular tools
   */
  app.get('/tools/popular', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')
      const limit = Number.parseInt(c.req.query('limit') || '10')

      const popularTools = await discoveryService.getPopularTools(workspace?.id, limit)

      // Filter by access
      const accessibleTools = await authService.filterToolsByAccess(
        popularTools,
        user.id,
        workspace?.id
      )

      return c.json({ tools: accessibleTools })
    } catch (error) {
      logger.error('Get popular tools failed', { error })
      return c.json({ error: 'Failed to get popular tools' }, 500)
    }
  })

  /**
   * Get tool recommendations
   */
  app.post('/tools/recommendations', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')

      const requestData = await c.req.json()
      const context = RecommendationContextSchema.parse(requestData)

      // Get user preferences
      const userPreferences = await recommendationService.getUserPreferences(user.id)

      const recommendationContext = {
        userId: user.id,
        workspaceId: workspace?.id,
        sessionId: c.req.header('x-session-id'),
        ...context,
        userPreferences,
      }

      const recommendations = await recommendationService.getPersonalizedRecommendations(
        recommendationContext,
        context.limit
      )

      return c.json({ recommendations })
    } catch (error) {
      logger.error('Get recommendations failed', { error })
      return c.json({ error: 'Failed to get recommendations' }, 500)
    }
  })

  /**
   * Get tools by category
   */
  app.get('/tools/category/:categoryId', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')
      const categoryId = c.req.param('categoryId')

      const tools = await discoveryService.getToolsByCategory(categoryId)

      // Filter by access
      const accessibleTools = await authService.filterToolsByAccess(tools, user.id, workspace?.id)

      return c.json({ tools: accessibleTools })
    } catch (error) {
      logger.error('Get tools by category failed', { error })
      return c.json({ error: 'Failed to get tools by category' }, 500)
    }
  })

  // Tool Configuration Routes

  /**
   * Create tool configuration
   */
  app.post('/configurations', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')

      const requestData = await c.req.json()
      const configData = ConfigurationSchema.parse(requestData)

      // Check permissions
      const canCreate = await authService.canCreateConfiguration(
        user.id,
        configData.toolId,
        workspace?.id
      )

      if (!canCreate) {
        return c.json({ error: 'Permission denied' }, 403)
      }

      // Create configuration
      const config = await configurationService.createConfiguration({
        ...configData,
        workspaceId: workspace?.id,
        userId: user.id,
      })

      return c.json(config, 201)
    } catch (error) {
      logger.error('Create configuration failed', { error })
      return c.json({ error: 'Failed to create configuration' }, 500)
    }
  })

  /**
   * Get configurations for a tool
   */
  app.get('/tools/:toolId/configurations', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')
      const toolId = c.req.param('toolId')

      const configurations = await configurationService.listConfigurations(
        toolId,
        workspace?.id,
        user.id
      )

      return c.json({ configurations })
    } catch (error) {
      logger.error('Get configurations failed', { error })
      return c.json({ error: 'Failed to get configurations' }, 500)
    }
  })

  /**
   * Update configuration
   */
  app.put('/configurations/:configId', async (c) => {
    try {
      const user = c.get('user')
      const configId = c.req.param('configId')

      const requestData = await c.req.json()
      const updateData = ConfigurationUpdateSchema.parse(requestData)

      // Check permissions
      const canModify = await authService.canModifyConfiguration(user.id, configId)
      if (!canModify) {
        return c.json({ error: 'Permission denied' }, 403)
      }

      const updatedConfig = await configurationService.updateConfiguration(configId, updateData)

      return c.json(updatedConfig)
    } catch (error) {
      logger.error('Update configuration failed', { error })
      return c.json({ error: 'Failed to update configuration' }, 500)
    }
  })

  /**
   * Delete configuration
   */
  app.delete('/configurations/:configId', async (c) => {
    try {
      const user = c.get('user')
      const configId = c.req.param('configId')

      // Check permissions
      const canModify = await authService.canModifyConfiguration(user.id, configId)
      if (!canModify) {
        return c.json({ error: 'Permission denied' }, 403)
      }

      await configurationService.deleteConfiguration(configId)
      return c.json({ success: true })
    } catch (error) {
      logger.error('Delete configuration failed', { error })
      return c.json({ error: 'Failed to delete configuration' }, 500)
    }
  })

  // Analytics Routes

  /**
   * Get tool analytics
   */
  app.get('/tools/:toolId/analytics', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')
      const toolId = c.req.param('toolId')

      // Check access
      const hasAccess = await authService.hasToolAccess(toolId, user.id, workspace?.id)

      if (!hasAccess) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const analytics = await analyticsService.getToolAnalytics(toolId)
      return c.json({ analytics })
    } catch (error) {
      logger.error('Get tool analytics failed', { error })
      return c.json({ error: 'Failed to get analytics' }, 500)
    }
  })

  /**
   * Get workspace analytics
   */
  app.get('/workspace/analytics', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')

      if (!workspace) {
        return c.json({ error: 'Workspace required' }, 400)
      }

      // Check workspace access
      const hasAccess = await authService.hasWorkspaceAccess(user.id, workspace.id, 'read')

      if (!hasAccess) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const analytics = await analyticsService.getWorkspaceAnalytics(workspace.id)
      return c.json({ analytics })
    } catch (error) {
      logger.error('Get workspace analytics failed', { error })
      return c.json({ error: 'Failed to get workspace analytics' }, 500)
    }
  })

  // Health Routes

  /**
   * Get health overview
   */
  app.get('/health/overview', async (c) => {
    try {
      const overview = await healthService.getHealthOverview()
      return c.json({ health: overview })
    } catch (error) {
      logger.error('Get health overview failed', { error })
      return c.json({ error: 'Failed to get health overview' }, 500)
    }
  })

  /**
   * Get tool health
   */
  app.get('/tools/:toolId/health', async (c) => {
    try {
      const user = c.get('user')
      const workspace = c.get('workspace')
      const toolId = c.req.param('toolId')

      // Check access
      const hasAccess = await authService.hasToolAccess(toolId, user.id, workspace?.id)

      if (!hasAccess) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const health = await healthService.getToolHealth(toolId)
      return c.json({ health })
    } catch (error) {
      logger.error('Get tool health failed', { error })
      return c.json({ error: 'Failed to get tool health' }, 500)
    }
  })

  // Categories Routes

  /**
   * Get all categories
   */
  app.get('/categories', async (c) => {
    try {
      const categories = await registryService.getCategories()
      return c.json({ categories })
    } catch (error) {
      logger.error('Get categories failed', { error })
      return c.json({ error: 'Failed to get categories' }, 500)
    }
  })

  return app
}

export { createToolRegistryRoutes }
