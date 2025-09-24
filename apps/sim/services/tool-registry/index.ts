/**
 * Tool Registry Service - Centralized tool management and discovery system
 *
 * Provides comprehensive tool registration, discovery, configuration management,
 * and analytics for the Universal Tool Adapter System.
 */

import { ToolAnalyticsService } from './analytics-service'
import { ToolConfigurationService } from './configuration-service'
import { ToolDiscoveryService } from './discovery-service'
import { ToolHealthService } from './health-service'
import { ToolRecommendationService } from './recommendation-service'
import { ToolRegistryService } from './registry-service'

// Export all service classes
export {
  ToolRegistryService,
  ToolDiscoveryService,
  ToolConfigurationService,
  ToolAnalyticsService,
  ToolRecommendationService,
  ToolHealthService,
}

// Export types
export * from './types'

// Main registry instance - singleton pattern for global access
let registryInstance: ToolRegistryService | null = null

/**
 * Get or create the singleton tool registry instance
 */
export function getToolRegistry(): ToolRegistryService {
  if (!registryInstance) {
    registryInstance = new ToolRegistryService()
  }
  return registryInstance
}

/**
 * Initialize the tool registry with existing Sim tools
 */
export async function initializeToolRegistry() {
  const registry = getToolRegistry()
  await registry.initializeWithSimTools()
  return registry
}

// Re-export for convenience
export const toolRegistry = getToolRegistry()
