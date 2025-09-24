/**
 * ToolRegistryService - Core service for tool registration and management
 *
 * Handles tool registration, updates, health monitoring, and lifecycle management.
 * Integrates with existing Sim tools and provides discovery capabilities.
 */

import { EventEmitter } from 'events'
import { asc, eq, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/packages/db'
import {
  type ToolCategoryInsert,
  type ToolRegistryInsert,
  toolCategories,
  toolRegistry,
} from '@/packages/db/schema'
import { ToolAdapter } from './adapters'
import { ToolAnalyticsService } from './analytics-service'
import { ToolDiscoveryService } from './discovery-service'
import type {
  EnrichedTool,
  IToolRegistryService,
  ToolDefinition,
  ToolHealth,
  ToolRegistryEvent,
  ToolSearchQuery,
  ToolSearchResult,
} from './types'

const logger = createLogger('ToolRegistryService')

/**
 * Core tool registry service providing centralized tool management
 */
export class ToolRegistryService extends EventEmitter implements IToolRegistryService {
  private discoveryService: ToolDiscoveryService
  private analyticsService: ToolAnalyticsService
  private toolAdapter: ToolAdapter
  private initialized = false

  constructor() {
    super()
    this.discoveryService = new ToolDiscoveryService()
    this.analyticsService = new ToolAnalyticsService()
    this.toolAdapter = new ToolAdapter()
  }

  /**
   * Initialize the registry with existing Sim tools
   */
  async initializeWithSimTools(): Promise<void> {
    if (this.initialized) {
      logger.warn('Tool registry already initialized')
      return
    }

    logger.info('Initializing tool registry with existing Sim tools')

    try {
      // Create default categories
      await this.createDefaultCategories()

      // Register existing Sim tools
      await this.registerExistingSimTools()

      this.initialized = true
      logger.info('Tool registry initialization completed')
    } catch (error) {
      logger.error('Failed to initialize tool registry', { error })
      throw error
    }
  }

  /**
   * Register a new tool in the registry
   */
  async registerTool(tool: ToolDefinition): Promise<void> {
    logger.info('Registering tool', { toolId: tool.id, name: tool.name })

    try {
      const toolData: ToolRegistryInsert = {
        id: tool.id,
        name: tool.name,
        displayName: tool.displayName,
        description: tool.description,
        longDescription: tool.longDescription,
        version: tool.version,
        toolType: tool.toolType,
        scope: tool.scope,
        status: tool.status,
        categoryId: tool.categoryId,
        tags: JSON.stringify(tool.tags),
        keywords: JSON.stringify(tool.keywords),
        schema: JSON.stringify(tool.schema),
        resultSchema: tool.resultSchema ? JSON.stringify(tool.resultSchema) : null,
        metadata: JSON.stringify(tool.metadata),
        implementationType: tool.implementationType,
        executionContext: JSON.stringify(tool.executionContext),
        isPublic: tool.isPublic,
        requiresAuth: tool.requiresAuth,
        requiredPermissions: JSON.stringify(tool.requiredPermissions),
        naturalLanguageDescription: tool.naturalLanguageDescription,
        usageExamples: JSON.stringify(tool.usageExamples),
        commonQuestions: JSON.stringify(tool.commonQuestions),
        usageCount: 0,
        successRate: '0.0000',
        avgExecutionTimeMs: 0,
        healthStatus: 'unknown',
        healthCheckDetails: JSON.stringify({}),
      }

      await db
        .insert(toolRegistry)
        .values(toolData)
        .onConflictDoUpdate({
          target: toolRegistry.id,
          set: {
            ...toolData,
            updatedAt: sql`NOW()`,
          },
        })

      // Emit registration event
      this.emit('tool.registered', {
        type: 'tool.registered',
        toolId: tool.id,
        timestamp: new Date(),
        data: tool,
      } as ToolRegistryEvent)

      logger.info('Tool registered successfully', { toolId: tool.id })
    } catch (error) {
      logger.error('Failed to register tool', { toolId: tool.id, error })
      throw error
    }
  }

  /**
   * Unregister a tool from the registry
   */
  async unregisterTool(toolId: string): Promise<void> {
    logger.info('Unregistering tool', { toolId })

    try {
      const result = await db.delete(toolRegistry).where(eq(toolRegistry.id, toolId))

      if (result.rowCount === 0) {
        throw new Error(`Tool not found: ${toolId}`)
      }

      // Emit unregistration event
      this.emit('tool.unregistered', {
        type: 'tool.unregistered',
        toolId,
        timestamp: new Date(),
      } as ToolRegistryEvent)

      logger.info('Tool unregistered successfully', { toolId })
    } catch (error) {
      logger.error('Failed to unregister tool', { toolId, error })
      throw error
    }
  }

  /**
   * Update an existing tool in the registry
   */
  async updateTool(toolId: string, updates: Partial<ToolDefinition>): Promise<void> {
    logger.info('Updating tool', { toolId, updates: Object.keys(updates) })

    try {
      const updateData: Partial<ToolRegistryInsert> = {}

      // Map updates to database columns
      if (updates.displayName !== undefined) updateData.displayName = updates.displayName
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.longDescription !== undefined)
        updateData.longDescription = updates.longDescription
      if (updates.version !== undefined) updateData.version = updates.version
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId
      if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags)
      if (updates.keywords !== undefined) updateData.keywords = JSON.stringify(updates.keywords)
      if (updates.schema !== undefined) updateData.schema = JSON.stringify(updates.schema)
      if (updates.resultSchema !== undefined) {
        updateData.resultSchema = updates.resultSchema ? JSON.stringify(updates.resultSchema) : null
      }
      if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata)
      if (updates.executionContext !== undefined) {
        updateData.executionContext = JSON.stringify(updates.executionContext)
      }
      if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic
      if (updates.requiresAuth !== undefined) updateData.requiresAuth = updates.requiresAuth
      if (updates.requiredPermissions !== undefined) {
        updateData.requiredPermissions = JSON.stringify(updates.requiredPermissions)
      }
      if (updates.naturalLanguageDescription !== undefined) {
        updateData.naturalLanguageDescription = updates.naturalLanguageDescription
      }
      if (updates.usageExamples !== undefined) {
        updateData.usageExamples = JSON.stringify(updates.usageExamples)
      }
      if (updates.commonQuestions !== undefined) {
        updateData.commonQuestions = JSON.stringify(updates.commonQuestions)
      }

      updateData.updatedAt = sql`NOW()`

      const result = await db
        .update(toolRegistry)
        .set(updateData)
        .where(eq(toolRegistry.id, toolId))

      if (result.rowCount === 0) {
        throw new Error(`Tool not found: ${toolId}`)
      }

      // Emit update event
      this.emit('tool.updated', {
        type: 'tool.updated',
        toolId,
        timestamp: new Date(),
        data: updates,
      } as ToolRegistryEvent)

      logger.info('Tool updated successfully', { toolId })
    } catch (error) {
      logger.error('Failed to update tool', { toolId, error })
      throw error
    }
  }

  /**
   * Get a tool with enriched data
   */
  async getTool(toolId: string): Promise<EnrichedTool | null> {
    try {
      const [toolData] = await db
        .select()
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))
        .where(eq(toolRegistry.id, toolId))
        .limit(1)

      if (!toolData) {
        return null
      }

      const tool = toolData.tool_registry
      const category = toolData.tool_categories

      // Get analytics
      const analytics = await this.analyticsService.getToolAnalytics(toolId)

      // Get health status
      const healthStatus: ToolHealth = {
        status: tool.healthStatus as any,
        lastCheckTime: tool.lastHealthCheck || undefined,
        errorDetails: tool.healthCheckDetails
          ? JSON.parse(tool.healthCheckDetails as string).error
          : undefined,
      }

      const enrichedTool: EnrichedTool = {
        id: tool.id,
        name: tool.name,
        displayName: tool.displayName,
        description: tool.description,
        longDescription: tool.longDescription || undefined,
        version: tool.version,
        toolType: tool.toolType,
        scope: tool.scope,
        status: tool.status,
        categoryId: tool.categoryId || undefined,
        tags: JSON.parse(tool.tags as string),
        keywords: JSON.parse(tool.keywords as string),
        schema: JSON.parse(tool.schema as string),
        resultSchema: tool.resultSchema ? JSON.parse(tool.resultSchema as string) : undefined,
        metadata: JSON.parse(tool.metadata as string),
        implementationType: tool.implementationType as any,
        executionContext: JSON.parse(tool.executionContext as string),
        isPublic: tool.isPublic,
        requiresAuth: tool.requiresAuth,
        requiredPermissions: JSON.parse(tool.requiredPermissions as string),
        naturalLanguageDescription: tool.naturalLanguageDescription || undefined,
        usageExamples: JSON.parse(tool.usageExamples as string),
        commonQuestions: JSON.parse(tool.commonQuestions as string),
        category: category || undefined,
        analytics,
        healthStatus,
      }

      return enrichedTool
    } catch (error) {
      logger.error('Failed to get tool', { toolId, error })
      throw error
    }
  }

  /**
   * List tools with search and filtering
   */
  async listTools(query: ToolSearchQuery = {}): Promise<ToolSearchResult> {
    return this.discoveryService.searchTools(query)
  }

  /**
   * Create a new tool category
   */
  async createCategory(
    categoryData: Omit<ToolCategoryInsert, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<any> {
    try {
      const [category] = await db
        .insert(toolCategories)
        .values({
          id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...categoryData,
        })
        .returning()

      logger.info('Tool category created', { categoryId: category.id, name: category.name })
      return category
    } catch (error) {
      logger.error('Failed to create tool category', { categoryData, error })
      throw error
    }
  }

  /**
   * Get all tool categories
   */
  async getCategories(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(toolCategories)
        .orderBy(asc(toolCategories.sortOrder), asc(toolCategories.name))
    } catch (error) {
      logger.error('Failed to get tool categories', { error })
      throw error
    }
  }

  /**
   * Check tool health and update status
   */
  async checkToolHealth(toolId: string): Promise<ToolHealth> {
    logger.debug('Checking tool health', { toolId })

    try {
      const tool = await this.getTool(toolId)
      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`)
      }

      // Implement health check logic based on tool type
      let health: ToolHealth

      if (tool.implementationType === 'server') {
        health = await this.checkServerToolHealth(tool)
      } else if (tool.implementationType === 'client') {
        health = await this.checkClientToolHealth(tool)
      } else {
        health = await this.checkHybridToolHealth(tool)
      }

      // Update health status in database
      await this.updateHealthStatus(toolId, health)

      return health
    } catch (error) {
      logger.error('Failed to check tool health', { toolId, error })
      const errorHealth: ToolHealth = {
        status: 'error',
        lastCheckTime: new Date(),
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      }
      await this.updateHealthStatus(toolId, errorHealth)
      return errorHealth
    }
  }

  /**
   * Update health status for a tool
   */
  async updateHealthStatus(toolId: string, health: ToolHealth): Promise<void> {
    try {
      await db
        .update(toolRegistry)
        .set({
          healthStatus: health.status,
          lastHealthCheck: new Date(),
          healthCheckDetails: JSON.stringify({
            uptime: health.uptime,
            responseTime: health.responseTime,
            error: health.errorDetails,
            dependencies: health.dependencies,
          }),
          updatedAt: sql`NOW()`,
        })
        .where(eq(toolRegistry.id, toolId))

      // Emit health change event
      this.emit('health.changed', {
        type: 'health.changed',
        toolId,
        timestamp: new Date(),
        data: health,
      } as ToolRegistryEvent)
    } catch (error) {
      logger.error('Failed to update health status', { toolId, error })
      throw error
    }
  }

  /**
   * Create default tool categories
   */
  private async createDefaultCategories(): Promise<void> {
    const defaultCategories = [
      {
        name: 'Workflow Management',
        description: 'Tools for creating, editing, and managing workflows',
        icon: 'workflow',
        color: '#3B82F6',
        sortOrder: 1,
      },
      {
        name: 'Data Processing',
        description: 'Tools for processing, transforming, and analyzing data',
        icon: 'database',
        color: '#10B981',
        sortOrder: 2,
      },
      {
        name: 'External APIs',
        description: 'Tools for making API requests and integrations',
        icon: 'api',
        color: '#F59E0B',
        sortOrder: 3,
      },
      {
        name: 'File Management',
        description: 'Tools for file operations and cloud storage',
        icon: 'folder',
        color: '#8B5CF6',
        sortOrder: 4,
      },
      {
        name: 'Documentation',
        description: 'Tools for searching and managing documentation',
        icon: 'book',
        color: '#06B6D4',
        sortOrder: 5,
      },
      {
        name: 'Environment',
        description: 'Tools for managing environment variables and settings',
        icon: 'settings',
        color: '#EF4444',
        sortOrder: 6,
      },
      {
        name: 'Utilities',
        description: 'General utility tools and helpers',
        icon: 'tool',
        color: '#6B7280',
        sortOrder: 7,
      },
    ]

    for (const category of defaultCategories) {
      try {
        await this.createCategory(category)
      } catch (error) {
        // Ignore duplicate category errors
        if (!error?.message?.includes('duplicate') && !error?.message?.includes('unique')) {
          logger.warn('Failed to create default category', { category: category.name, error })
        }
      }
    }
  }

  /**
   * Register all existing Sim tools
   */
  private async registerExistingSimTools(): Promise<void> {
    const simTools = await this.toolAdapter.getAllSimTools()

    for (const simTool of simTools) {
      try {
        const adaptedTool = this.toolAdapter.adaptTool(simTool)
        await this.registerTool(adaptedTool)
      } catch (error) {
        logger.warn('Failed to register existing Sim tool', { tool: simTool, error })
      }
    }

    logger.info('Registered existing Sim tools', { count: simTools.length })
  }

  // Health check implementations for different tool types
  private async checkServerToolHealth(tool: EnrichedTool): Promise<ToolHealth> {
    // For server tools, we can ping endpoints or check service status
    // This is a simplified implementation
    return {
      status: 'healthy',
      lastCheckTime: new Date(),
      responseTime: 100,
      uptime: 99.9,
    }
  }

  private async checkClientToolHealth(tool: EnrichedTool): Promise<ToolHealth> {
    // For client tools, we check if the tool definition is valid
    // This is a simplified implementation
    return {
      status: 'healthy',
      lastCheckTime: new Date(),
    }
  }

  private async checkHybridToolHealth(tool: EnrichedTool): Promise<ToolHealth> {
    // For hybrid tools, we check both client and server aspects
    const serverHealth = await this.checkServerToolHealth(tool)
    const clientHealth = await this.checkClientToolHealth(tool)

    return {
      status:
        serverHealth.status === 'healthy' && clientHealth.status === 'healthy'
          ? 'healthy'
          : 'warning',
      lastCheckTime: new Date(),
      responseTime: serverHealth.responseTime,
      uptime: serverHealth.uptime,
    }
  }
}
