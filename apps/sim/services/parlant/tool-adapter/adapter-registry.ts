/**
 * Tool Adapter Registry
 *
 * Manages registration, discovery, and lifecycle of tool adapters
 * Provides centralized access to all available tools for Parlant agents
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  AdapterContext,
  ParlantToolSchema,
  PermissionLevel,
  ToolAdapter,
  ToolCategory,
  ToolRecommendation,
} from './types'

const logger = createLogger('ToolAdapterRegistry')

export class ToolAdapterRegistry {
  private adapters = new Map<string, ToolAdapter>()
  private categories = new Map<ToolCategory, Set<string>>()
  private permissions = new Map<PermissionLevel, Set<string>>()

  /**
   * Register a new tool adapter
   */
  register(adapter: ToolAdapter): void {
    const name = adapter.schema.name

    if (this.adapters.has(name)) {
      logger.warn('Overriding existing tool adapter', { toolName: name })
    }

    this.adapters.set(name, adapter)

    // Update category index
    if (!this.categories.has(adapter.schema.category)) {
      this.categories.set(adapter.schema.category, new Set())
    }
    this.categories.get(adapter.schema.category)!.add(name)

    // Update permission index
    if (!this.permissions.has(adapter.schema.permission_level)) {
      this.permissions.set(adapter.schema.permission_level, new Set())
    }
    this.permissions.get(adapter.schema.permission_level)!.add(name)

    logger.info('Registered tool adapter', {
      toolName: name,
      category: adapter.schema.category,
      permissionLevel: adapter.schema.permission_level,
    })
  }

  /**
   * Unregister a tool adapter
   */
  unregister(name: string): boolean {
    const adapter = this.adapters.get(name)
    if (!adapter) {
      return false
    }

    // Remove from indexes
    this.categories.get(adapter.schema.category)?.delete(name)
    this.permissions.get(adapter.schema.permission_level)?.delete(name)

    // Cleanup if supported
    if (adapter.cleanup) {
      adapter.cleanup().catch((error) => {
        logger.warn('Error during adapter cleanup', { toolName: name, error: error.message })
      })
    }

    this.adapters.delete(name)
    logger.info('Unregistered tool adapter', { toolName: name })
    return true
  }

  /**
   * Get a specific tool adapter
   */
  get(name: string): ToolAdapter | undefined {
    return this.adapters.get(name)
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.adapters.has(name)
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Get all tool schemas for Parlant registration
   */
  getAllSchemas(): ParlantToolSchema[] {
    return Array.from(this.adapters.values()).map((adapter) => adapter.schema)
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): ToolAdapter[] {
    const toolNames = this.categories.get(category) || new Set()
    return Array.from(toolNames)
      .map((name) => this.adapters.get(name))
      .filter((adapter): adapter is ToolAdapter => adapter !== undefined)
  }

  /**
   * Get tools by permission level
   */
  getByPermissionLevel(level: PermissionLevel): ToolAdapter[] {
    const toolNames = this.permissions.get(level) || new Set()
    return Array.from(toolNames)
      .map((name) => this.adapters.get(name))
      .filter((adapter): adapter is ToolAdapter => adapter !== undefined)
  }

  /**
   * Get tools accessible to a user in a specific context
   */
  getAccessibleTools(context: AdapterContext): ToolAdapter[] {
    // For now, return all workspace-level and public tools
    // TODO: Implement proper permission checking based on user roles
    const publicTools = this.getByPermissionLevel('public')
    const workspaceTools = this.getByPermissionLevel('workspace')

    return [...publicTools, ...workspaceTools]
  }

  /**
   * Search tools by description or category
   */
  search(query: string): ToolAdapter[] {
    const lowerQuery = query.toLowerCase()

    return Array.from(this.adapters.values()).filter((adapter) => {
      return (
        adapter.schema.name.toLowerCase().includes(lowerQuery) ||
        adapter.schema.description.toLowerCase().includes(lowerQuery) ||
        adapter.schema.category.toLowerCase().includes(lowerQuery) ||
        adapter.schema.usage_guidelines.toLowerCase().includes(lowerQuery)
      )
    })
  }

  /**
   * Get contextual tool recommendations
   */
  async getRecommendations(
    context: AdapterContext,
    maxResults = 10
  ): Promise<ToolRecommendation[]> {
    const recommendations: ToolRecommendation[] = []

    const accessibleTools = this.getAccessibleTools(context)

    for (const adapter of accessibleTools) {
      if (adapter.getRecommendations) {
        try {
          const toolRecommendations = await adapter.getRecommendations(context)
          recommendations.push(...toolRecommendations)
        } catch (error: any) {
          logger.warn('Error getting recommendations from tool', {
            toolName: adapter.schema.name,
            error: error.message,
          })
        }
      }
    }

    // Sort by confidence and return top results
    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, maxResults)
  }

  /**
   * Get tools for a specific workflow or use case
   */
  getToolsForWorkflow(workflowType: string): ToolAdapter[] {
    const workflowMappings: Record<string, ToolCategory[]> = {
      'data-analysis': ['data-retrieval', 'analysis', 'file-operations'],
      automation: ['automation', 'workflow-management', 'external-integration'],
      communication: ['communication', 'external-integration'],
      'content-creation': ['file-operations', 'analysis', 'external-integration'],
    }

    const categories = workflowMappings[workflowType] || []
    const tools: ToolAdapter[] = []

    for (const category of categories) {
      tools.push(...this.getByCategory(category))
    }

    return tools
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const stats: RegistryStats = {
      totalTools: this.adapters.size,
      categories: {},
      permissions: {},
      averageExecutionTime: 0,
    }

    // Count by category
    for (const [category, toolNames] of this.categories.entries()) {
      stats.categories[category] = toolNames.size
    }

    // Count by permission level
    for (const [permission, toolNames] of this.permissions.entries()) {
      stats.permissions[permission] = toolNames.size
    }

    // Calculate average estimated execution time
    if (this.adapters.size > 0) {
      const totalTime = Array.from(this.adapters.values()).reduce(
        (sum, adapter) => sum + adapter.schema.performance.estimated_duration_ms,
        0
      )
      stats.averageExecutionTime = totalTime / this.adapters.size
    }

    return stats
  }

  /**
   * Cleanup all registered adapters
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up all tool adapters')

    const cleanupPromises = Array.from(this.adapters.values())
      .filter((adapter) => adapter.cleanup)
      .map((adapter) => adapter.cleanup!())

    await Promise.allSettled(cleanupPromises)

    this.adapters.clear()
    this.categories.clear()
    this.permissions.clear()
  }
}

export interface RegistryStats {
  totalTools: number
  categories: Record<ToolCategory, number>
  permissions: Record<PermissionLevel, number>
  averageExecutionTime: number
}

// Global registry instance
export const globalToolAdapterRegistry = new ToolAdapterRegistry()

// Convenience functions
export function registerToolAdapter(adapter: ToolAdapter): void {
  globalToolAdapterRegistry.register(adapter)
}

export function getToolAdapter(name: string): ToolAdapter | undefined {
  return globalToolAdapterRegistry.get(name)
}

export function getAllToolSchemas(): ParlantToolSchema[] {
  return globalToolAdapterRegistry.getAllSchemas()
}

export function getAccessibleTools(context: AdapterContext): ToolAdapter[] {
  return globalToolAdapterRegistry.getAccessibleTools(context)
}

export function searchTools(query: string): ToolAdapter[] {
  return globalToolAdapterRegistry.search(query)
}
