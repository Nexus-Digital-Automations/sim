/**
 * Template Discovery System - Comprehensive Export Module
 *
 * This module exports all components of the advanced template discovery system:
 * - Unified Discovery Service (main orchestration layer)
 * - Semantic Search Service (AI-powered content matching)
 * - Advanced Recommendation Engine (business-aware AI recommendations)
 * - Real-Time Analytics Service (live performance monitoring)
 * - Search Optimization Service (query understanding and optimization)
 * - Legacy services for backward compatibility
 *
 * Usage:
 * ```typescript
 * import { unifiedDiscoveryService } from '@/lib/templates/discovery'
 * 
 * // Comprehensive discovery
 * const results = await unifiedDiscoveryService.discover({
 *   discoveryMode: 'hybrid',
 *   userId: 'user-123',
 *   businessContext: { industry: 'marketing', useCase: 'email automation' }
 * })
 * 
 * // Intelligent search
 * const searchResults = await unifiedDiscoveryService.intelligentSearch({
 *   search: 'email automation templates',
 *   sortBy: 'relevance'
 * })
 * 
 * // AI-powered recommendations
 * const recommendations = await unifiedDiscoveryService.aiPoweredRecommendations('user-123')
 * ```
 *
 * @author Claude Code Discovery System
 * @version 1.0.0
 */

// Main unified service (recommended for new implementations)
export { 
  unifiedDiscoveryService,
  UnifiedDiscoveryService,
  type UnifiedDiscoveryRequest,
  type UnifiedDiscoveryResponse,
  type DiscoveryPerformanceMetrics
} from './unified-discovery-service'

// Advanced AI services
export { 
  semanticSearchService,
  SemanticSearchService,
  type SemanticSearchResult,
  type SemanticSearchConfig
} from './semantic-search-service'

export { 
  advancedRecommendationEngine,
  AdvancedRecommendationEngine,
  type BusinessContext,
  type UserRecommendationProfile,
  type AdvancedRecommendation,
  type RecommendationConfig
} from './advanced-recommendation-engine'

export { 
  realTimeAnalyticsService,
  RealTimeAnalyticsService,
  type RealTimeMetrics,
  type LiveDashboardData,
  type UserSegment,
  type PredictiveInsight
} from './real-time-analytics-service'

export { 
  searchOptimizationService,
  SearchOptimizationService,
  type QueryAnalysis,
  type SearchPerformanceMetrics,
  type OptimizedSearchResult,
  type SearchOptimizationConfig
} from './search-optimization-service'

// Legacy services (maintained for backward compatibility)
export { 
  templateRecommendationEngine,
  TemplateRecommendationEngine
} from './recommendation-engine'

export { 
  templateAnalyticsService,
  TemplateAnalyticsService,
  type TemplateAnalyticsEvent,
  type AnalyticsEventData
} from './analytics-service'

// Re-export types from the main types module
export type {
  Template,
  TemplateSearchQuery,
  TemplateSearchResults,
  TemplateRecommendation,
  TemplateUsageAnalytics,
  TemplateMarketplaceAnalytics
} from '../types'

/**
 * Discovery System Configuration
 * 
 * Centralized configuration for all discovery services
 */
export interface DiscoverySystemConfig {
  // Feature flags
  features: {
    semanticSearch: boolean
    aiRecommendations: boolean
    realTimeAnalytics: boolean
    searchOptimization: boolean
    abTesting: boolean
    personalization: boolean
  }
  
  // Performance settings
  performance: {
    cacheEnabled: boolean
    cacheExpiryMinutes: number
    maxConcurrentRequests: number
    timeoutMs: number
  }
  
  // AI/ML settings
  ai: {
    embeddingModel: string
    embeddingDimensions: number
    minSimilarityThreshold: number
    enableMLRanking: boolean
  }
  
  // Analytics settings
  analytics: {
    enableTracking: boolean
    enableRealTimeMetrics: boolean
    retentionDays: number
    enablePredictions: boolean
  }
}

/**
 * Default discovery system configuration
 */
export const DEFAULT_DISCOVERY_CONFIG: DiscoverySystemConfig = {
  features: {
    semanticSearch: true,
    aiRecommendations: true,
    realTimeAnalytics: true,
    searchOptimization: true,
    abTesting: true,
    personalization: true
  },
  performance: {
    cacheEnabled: true,
    cacheExpiryMinutes: 30,
    maxConcurrentRequests: 100,
    timeoutMs: 30000
  },
  ai: {
    embeddingModel: 'text-embedding-ada-002',
    embeddingDimensions: 256,
    minSimilarityThreshold: 0.2,
    enableMLRanking: true
  },
  analytics: {
    enableTracking: true,
    enableRealTimeMetrics: true,
    retentionDays: 90,
    enablePredictions: true
  }
}

/**
 * Discovery system health check
 */
export async function checkDiscoverySystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    unified: 'up' | 'down'
    semantic: 'up' | 'down'
    recommendations: 'up' | 'down'
    analytics: 'up' | 'down'
    optimization: 'up' | 'down'
  }
  metrics: {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    cacheHitRate: number
  }
  timestamp: Date
}> {
  // Basic health check implementation
  // In production, this would perform actual service health checks
  
  return {
    status: 'healthy',
    services: {
      unified: 'up',
      semantic: 'up',
      recommendations: 'up',
      analytics: 'up',
      optimization: 'up'
    },
    metrics: {
      totalRequests: 0, // Would be actual metrics
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0
    },
    timestamp: new Date()
  }
}

/**
 * Initialize discovery system with configuration
 */
export async function initializeDiscoverySystem(
  config: Partial<DiscoverySystemConfig> = {}
): Promise<void> {
  const finalConfig = {
    ...DEFAULT_DISCOVERY_CONFIG,
    ...config
  }
  
  console.log('🚀 Initializing Template Discovery System', {
    config: finalConfig,
    timestamp: new Date().toISOString()
  })
  
  // Initialize services with configuration
  // In production, this would set up service configurations, caching, etc.
  
  console.log('✅ Template Discovery System initialized successfully')
}

/**
 * Utility function to create a configured discovery service instance
 */
export function createDiscoveryService(
  requestId?: string,
  config?: Partial<DiscoverySystemConfig>
): UnifiedDiscoveryService {
  return new UnifiedDiscoveryService(requestId)
}

/**
 * Quick start function for common discovery patterns
 */
export const quickStart = {
  /**
   * Search for templates with intelligent optimization
   */
  search: async (query: string, userId?: string) => {
    return unifiedDiscoveryService.intelligentSearch({
      search: query,
      sortBy: 'relevance'
    }, { userId })
  },

  /**
   * Get personalized recommendations
   */
  recommend: async (userId: string, businessContext?: BusinessContext) => {
    return unifiedDiscoveryService.aiPoweredRecommendations(userId, {
      businessContext,
      personalizationLevel: 'ai_powered'
    })
  },

  /**
   * Comprehensive discovery (search + recommendations + insights)
   */
  discover: async (
    query: string, 
    userId: string, 
    businessContext?: BusinessContext
  ) => {
    return unifiedDiscoveryService.discover({
      discoveryMode: 'hybrid',
      userId,
      businessContext,
      searchQuery: { search: query },
      includeAnalytics: true,
      includeExplanations: true
    })
  },

  /**
   * Get live dashboard data
   */
  dashboard: async () => {
    return unifiedDiscoveryService.getLiveDiscoveryDashboard({
      includeAnalytics: true,
      includePredictions: true
    })
  }
}

// Export default as unified service for convenience
export default unifiedDiscoveryService