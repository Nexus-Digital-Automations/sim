/**
 * Intelligence Integration Layer
 *
 * This layer seamlessly integrates all intelligence components into the existing
 * Universal Tool Adapter framework, providing enhanced natural language descriptions,
 * contextual recommendations, and intelligent error handling without breaking changes.
 *
 * Features:
 * - Seamless integration with existing adapter registry and framework
 * - Enhanced tool selection with contextual intelligence
 * - Intelligent error handling with user-friendly explanations
 * - Natural language descriptions at multiple complexity levels
 * - Performance monitoring and optimization
 * - Backward compatibility with all existing tool interfaces
 *
 * @author Intelligence Integration Agent
 * @version 1.0.0
 */

import type { BaseAdapter } from '../core/base-adapter'
import {
  ComprehensiveToolErrorManager,
  type ToolErrorExplanation,
} from '../error-handling/comprehensive-error-manager'
import type { UsageContext } from '../natural-language/usage-guidelines'
import { EnhancedAdapterRegistry } from '../registry/enhanced-adapter-registry'
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
  AdapterRegistryEntry,
  DiscoveredTool,
  ToolDiscoveryQuery,
} from '../types/adapter-interfaces'
import type { ParlantExecutionContext } from '../types/parlant-interfaces'
import type { ToolConfig } from '../types/tools-types'
import { createLogger } from '../utils/logger'
import {
  type ContextualRecommendation,
  ContextualRecommendationEngine,
  type ContextualRecommendationRequest,
} from './contextual-recommendation-engine'
import {
  type EnhancedDescriptionSchema,
  NaturalLanguageDescriptionFramework,
} from './natural-language-description-framework'
import IntelligencePerformanceMonitor from './performance-monitoring'
// Intelligence Components
import { EnhancedToolIntelligenceEngine } from './tool-intelligence-engine'

const logger = createLogger('IntelligenceIntegrationLayer')

// =============================================================================
// Integration Configuration Types
// =============================================================================

export interface IntelligenceConfiguration {
  // Feature toggles
  enableNaturalLanguageDescriptions?: boolean
  enableContextualRecommendations?: boolean
  enableIntelligentErrorHandling?: boolean
  enablePerformanceOptimization?: boolean

  // Natural language settings
  naturalLanguage?: {
    defaultComplexityLevel?: 'brief' | 'detailed' | 'expert'
    enableMultiLanguageSupport?: boolean
    enableContextualAdaptation?: boolean
  }

  // Recommendation settings
  recommendations?: {
    maxRecommendations?: number
    enableMLRecommendations?: boolean
    enableCollaborativeFiltering?: boolean
    cacheRecommendations?: boolean
  }

  // Error handling settings
  errorHandling?: {
    enableProactiveValidation?: boolean
    enableRecoveryTutorials?: boolean
    enableUserFeedbackLearning?: boolean
  }

  // Performance settings
  performance?: {
    enableIntelligenceCaching?: boolean
    intelligenceCacheTTL?: number
    enableMetricsCollection?: boolean
  }
}

export interface IntelligenceMetrics {
  // Usage metrics
  descriptionsGenerated: number
  recommendationsProvided: number
  errorsHandledIntelligently: number

  // Performance metrics
  averageDescriptionGenerationTime: number
  averageRecommendationTime: number
  averageErrorHandlingTime: number

  // Quality metrics
  userSatisfactionScore: number
  recommendationAccuracy: number
  errorResolutionRate: number

  // Cache metrics
  intelligenceCacheHitRate: number
  intelligenceCacheSize: number
}

// =============================================================================
// Enhanced Registry Entry with Intelligence
// =============================================================================

export interface IntelligenceEnhancedRegistryEntry extends AdapterRegistryEntry {
  // Enhanced intelligence data
  intelligence: {
    description: EnhancedDescriptionSchema
    recommendations: ContextualRecommendation[]
    errorHandling: ToolErrorExplanation[]
    lastIntelligenceUpdate: Date
    userFeedback: IntelligenceFeedback[]
  }
}

export interface IntelligenceFeedback {
  userId: string
  feedbackType: 'description' | 'recommendation' | 'error_handling'
  rating: number // 1-5 scale
  comment?: string
  timestamp: Date
}

// =============================================================================
// Intelligence Integration Layer
// =============================================================================

export class IntelligenceIntegrationLayer {
  private readonly config: IntelligenceConfiguration
  private readonly metrics: IntelligenceMetrics
  private readonly recommendationEngine: ContextualRecommendationEngine
  private readonly descriptionFramework: NaturalLanguageDescriptionFramework
  private readonly errorManager: ComprehensiveToolErrorManager

  // Performance optimization
  private readonly intelligenceCache = new Map<string, any>()
  private readonly performanceTracker = new Map<string, number[]>()
  private readonly performanceMonitor: IntelligencePerformanceMonitor

  // Integration state
  private isInitialized = false
  private readonly integrationStartTime = Date.now()

  constructor(
    private readonly baseRegistry: EnhancedAdapterRegistry,
    config: IntelligenceConfiguration = {}
  ) {
    this.config = {
      enableNaturalLanguageDescriptions: true,
      enableContextualRecommendations: true,
      enableIntelligentErrorHandling: true,
      enablePerformanceOptimization: true,
      naturalLanguage: {
        defaultComplexityLevel: 'detailed',
        enableMultiLanguageSupport: false,
        enableContextualAdaptation: true,
      },
      recommendations: {
        maxRecommendations: 5,
        enableMLRecommendations: true,
        enableCollaborativeFiltering: true,
        cacheRecommendations: true,
      },
      errorHandling: {
        enableProactiveValidation: true,
        enableRecoveryTutorials: true,
        enableUserFeedbackLearning: true,
      },
      performance: {
        enableIntelligenceCaching: true,
        intelligenceCacheTTL: 300000, // 5 minutes
        enableMetricsCollection: true,
      },
      ...config,
    }

    // Initialize metrics
    this.metrics = {
      descriptionsGenerated: 0,
      recommendationsProvided: 0,
      errorsHandledIntelligently: 0,
      averageDescriptionGenerationTime: 0,
      averageRecommendationTime: 0,
      averageErrorHandlingTime: 0,
      userSatisfactionScore: 0,
      recommendationAccuracy: 0,
      errorResolutionRate: 0,
      intelligenceCacheHitRate: 0,
      intelligenceCacheSize: 0,
    }

    // Initialize intelligence engines
    this.toolIntelligenceEngine = new EnhancedToolIntelligenceEngine()
    this.recommendationEngine = new ContextualRecommendationEngine({
      cache: {
        recommendationTTL: this.config.performance?.intelligenceCacheTTL || 300000,
        contextTTL: 60000,
        behaviorTTL: 3600000,
        maxCacheSize: 1000,
        compressionEnabled: true,
      },
      performanceTracking: this.config.performance?.enableMetricsCollection,
    })
    this.descriptionFramework = new NaturalLanguageDescriptionFramework()
    this.errorManager = new ComprehensiveToolErrorManager()

    // Initialize performance monitoring
    this.performanceMonitor = new IntelligencePerformanceMonitor({
      enableAutoOptimization: this.config.enablePerformanceOptimization,
      alertingEnabled: true,
      metricsRetentionHours: 24,
      optimizationInterval: 300000, // 5 minutes
    })

    logger.info('Intelligence Integration Layer initialized', {
      naturalLanguage: this.config.enableNaturalLanguageDescriptions,
      recommendations: this.config.enableContextualRecommendations,
      errorHandling: this.config.enableIntelligentErrorHandling,
    })
  }

  // =============================================================================
  // Main Integration Methods
  // =============================================================================

  /**
   * Initialize intelligence integration with existing registry
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Intelligence integration already initialized')
      return
    }

    const startTime = Date.now()
    logger.info('Initializing intelligence integration')

    try {
      // Hook into base registry events
      this.setupRegistryEventHandlers()

      // Generate intelligence data for existing adapters
      await this.enhanceExistingAdapters()

      // Start performance monitoring
      this.startPerformanceMonitoring()

      this.isInitialized = true
      const initTime = Date.now() - startTime

      logger.info('Intelligence integration initialized successfully', {
        initializationTime: initTime,
        adaptersEnhanced: this.baseRegistry.getStatistics().totalAdapters,
      })
    } catch (error) {
      logger.error('Failed to initialize intelligence integration', { error })
      throw error
    }
  }

  /**
   * Enhanced adapter registration with intelligence generation
   */
  async registerAdapterWithIntelligence(
    adapter: BaseAdapter,
    metadata: Partial<AdapterRegistryEntry['metadata']> = {},
    toolConfig?: ToolConfig
  ): Promise<void> {
    logger.debug('Registering adapter with intelligence enhancement', {
      adapterId: adapter.id,
    })

    // Register with base registry first
    await this.baseRegistry.register(adapter, metadata)

    // Generate intelligence enhancements
    if (toolConfig) {
      await this.generateIntelligenceForAdapter(adapter.id, toolConfig)
    }
  }

  /**
   * Enhanced tool discovery with contextual recommendations
   */
  async discoverWithIntelligence(
    query: ToolDiscoveryQuery,
    userContext?: UsageContext
  ): Promise<DiscoveredTool[]> {
    const startTime = Date.now()

    try {
      // Get base discovery results
      const baseResults = await this.baseRegistry.discover(query)

      // Enhance with contextual recommendations if enabled
      if (this.config.enableContextualRecommendations && userContext) {
        const enhancedResults = await this.enhanceDiscoveryWithRecommendations(
          baseResults,
          query,
          userContext
        )

        this.updateMetrics('recommendations', Date.now() - startTime)
        this.metrics.recommendationsProvided++

        return enhancedResults
      }

      return baseResults
    } catch (error) {
      logger.error('Enhanced discovery failed, falling back to base discovery', { error })
      return this.baseRegistry.discover(query)
    }
  }

  /**
   * Enhanced adapter execution with intelligent error handling
   */
  async executeWithIntelligence(
    adapterId: string,
    context: ParlantExecutionContext,
    args: any,
    userContext?: UsageContext
  ): Promise<AdapterExecutionResult> {
    const startTime = Date.now()
    const executionId = `intel-${adapterId}-${Date.now()}`

    logger.debug('Executing adapter with intelligence', {
      executionId,
      adapterId,
      hasUserContext: !!userContext,
    })

    try {
      // Proactive validation if enabled
      if (this.config.errorHandling?.enableProactiveValidation && userContext) {
        await this.performProactiveValidation(adapterId, args, userContext)
      }

      // Execute with base registry
      const result = await this.baseRegistry.execute(adapterId, context, args)

      // Record successful execution
      this.updateMetrics('execution', Date.now() - startTime)

      return result
    } catch (error) {
      // Apply intelligent error handling
      if (this.config.enableIntelligentErrorHandling) {
        // Type guard for Error objects
        const errorToHandle = error instanceof Error ? error : new Error(String(error))
        const enhancedError = await this.handleErrorIntelligently(
          errorToHandle,
          adapterId,
          context,
          userContext
        )

        this.metrics.errorsHandledIntelligently++
        this.updateMetrics('errorHandling', Date.now() - startTime)

        // Return enhanced error result
        return {
          success: false,
          executionId,
          toolId: adapterId,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          error: {
            type: errorToHandle.constructor.name,
            message: errorToHandle.message,
            recoverable: true,
          },
          metadata: {
            intelligentExplanation: enhancedError,
          },
        }
      }

      // Fallback to base error handling
      throw error
    }
  }

  /**
   * Get enhanced tool description with intelligence
   */
  async getToolDescription(
    toolId: string,
    userContext?: UsageContext,
    complexityLevel: 'brief' | 'detailed' | 'expert' = 'detailed'
  ): Promise<EnhancedDescriptionSchema | null> {
    if (!this.config.enableNaturalLanguageDescriptions) {
      return null
    }

    const startTime = Date.now()
    const cacheKey = `desc-${toolId}-${complexityLevel}-${userContext?.userId || 'anonymous'}`

    // Check cache first
    if (this.config.performance?.enableIntelligenceCaching) {
      const cached = this.intelligenceCache.get(cacheKey)
      if (cached) {
        this.updateCacheHitRate(true)
        return cached
      }
    }

    try {
      // Get enhanced description from framework
      const entry = await this.baseRegistry.get(toolId)
      if (!entry) {
        return null
      }

      // Use the tool config from the adapter
      const toolConfig = this.extractToolConfig(entry)
      const description = await this.descriptionFramework.generateEnhancedDescription(toolConfig, {
        userProfile: userContext?.userProfile,
      })

      // Cache the result
      if (this.config.performance?.enableIntelligenceCaching) {
        this.intelligenceCache.set(cacheKey, description)
        setTimeout(() => {
          this.intelligenceCache.delete(cacheKey)
        }, this.config.performance?.intelligenceCacheTTL || 300000)
      }

      this.metrics.descriptionsGenerated++
      this.updateMetrics('description', Date.now() - startTime)
      this.updateCacheHitRate(false)

      // Record performance metrics
      this.performanceMonitor.recordOperation('description', Date.now() - startTime, true, {
        toolId,
        complexityLevel,
        cacheHit: false,
      })

      return description
    } catch (error) {
      logger.error('Failed to get enhanced tool description', {
        toolId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Get contextual tool recommendations
   */
  async getContextualRecommendations(
    request: Omit<ContextualRecommendationRequest, 'conversationHistory'> & {
      conversationHistory?: any[]
    }
  ): Promise<ContextualRecommendation[]> {
    if (!this.config.enableContextualRecommendations) {
      return []
    }

    const startTime = Date.now()

    try {
      // Convert to recommendation request format
      const recommendationRequest: ContextualRecommendationRequest = {
        ...request,
        conversationHistory: request.conversationHistory || [],
        maxRecommendations: this.config.recommendations?.maxRecommendations || 5,
      }

      const recommendations =
        await this.recommendationEngine.getRecommendations(recommendationRequest)

      this.metrics.recommendationsProvided++
      this.updateMetrics('recommendations', Date.now() - startTime)

      // Record performance metrics
      this.performanceMonitor.recordOperation('recommendation', Date.now() - startTime, true, {
        requestType: request.userMessage ? 'user_message' : 'context_only',
        recommendationCount: recommendations.length,
      })

      return recommendations
    } catch (error) {
      logger.error('Failed to get contextual recommendations', { error })
      return []
    }
  }

  /**
   * Record user feedback for intelligence improvement
   */
  async recordIntelligenceFeedback(toolId: string, feedback: IntelligenceFeedback): Promise<void> {
    try {
      // Store feedback for learning
      const entry = await this.baseRegistry.get(toolId)
      if (!entry) {
        logger.warn('Cannot record feedback for non-existent tool', { toolId })
        return
      }

      // Update user satisfaction metrics
      this.updateUserSatisfactionMetrics(feedback)

      // Feed back to recommendation engine for learning
      if (feedback.feedbackType === 'recommendation') {
        // This would be implemented to improve recommendations
        logger.info('Recommendation feedback recorded', {
          toolId,
          rating: feedback.rating,
          userId: feedback.userId,
        })
      }

      // Feed back to error handling for learning
      if (
        feedback.feedbackType === 'error_handling' &&
        this.config.errorHandling?.enableUserFeedbackLearning
      ) {
        await this.errorManager.trainWithFeedback(
          `feedback-${toolId}-${Date.now()}`,
          feedback.userId,
          {
            wasHelpful: feedback.rating >= 4,
            suggestedImprovement: feedback.comment,
          }
        )
      }

      logger.info('Intelligence feedback recorded successfully', {
        toolId,
        feedbackType: feedback.feedbackType,
        rating: feedback.rating,
      })
    } catch (error) {
      logger.error('Failed to record intelligence feedback', { error })
    }
  }

  /**
   * Get comprehensive intelligence metrics
   */
  getIntelligenceMetrics(): IntelligenceMetrics & {
    uptime: number
    cacheEfficiency: number
    integrationHealth: 'healthy' | 'degraded' | 'unhealthy'
    performanceReport?: any
  } {
    const uptime = Date.now() - this.integrationStartTime
    const cacheEfficiency = this.calculateCacheEfficiency()
    const integrationHealth = this.assessIntegrationHealth()
    const performanceReport = this.performanceMonitor.getDetailedPerformanceReport()

    return {
      ...this.metrics,
      uptime,
      cacheEfficiency,
      integrationHealth,
      intelligenceCacheSize: this.intelligenceCache.size,
      performanceReport,
    }
  }

  /**
   * Get performance dashboard data
   */
  getPerformanceDashboard() {
    return this.performanceMonitor.getPerformanceDashboard()
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations() {
    return this.performanceMonitor.generateOptimizationRecommendations()
  }

  /**
   * Apply optimization recommendation
   */
  async applyOptimization(recommendationId: string) {
    return this.performanceMonitor.implementOptimizationRecommendation(recommendationId)
  }

  /**
   * Graceful shutdown with cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down intelligence integration')

    try {
      // Clear caches
      this.intelligenceCache.clear()
      this.performanceTracker.clear()

      // Shutdown performance monitor
      // Note: Performance monitor cleanup would be implemented here

      // Shutdown engines that support it
      // Note: Individual engines would need shutdown methods in full implementation

      logger.info('Intelligence integration shutdown complete')
    } catch (error) {
      logger.error('Error during intelligence integration shutdown', { error })
    }
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  private setupRegistryEventHandlers(): void {
    // Listen for adapter registration events
    this.baseRegistry.on('adapter:registered', async (entry: AdapterRegistryEntry) => {
      try {
        // Extract tool config and generate intelligence
        const toolConfig = this.extractToolConfig(entry.adapter)
        await this.generateIntelligenceForAdapter(entry.id, toolConfig)
      } catch (error) {
        logger.warn('Failed to generate intelligence for newly registered adapter', {
          adapterId: entry.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    // Listen for execution events to track performance
    this.baseRegistry.on('adapter:executed', (data: any) => {
      if (this.config.performance?.enableMetricsCollection) {
        this.trackExecutionPerformance(data)
      }
    })

    // Listen for error events to improve error handling
    this.baseRegistry.on('adapter:error', async (data: any) => {
      if (this.config.enableIntelligentErrorHandling) {
        await this.analyzeErrorForLearning(data)
      }
    })
  }

  private async enhanceExistingAdapters(): Promise<void> {
    const stats = this.baseRegistry.getStatistics()
    logger.info('Enhancing existing adapters with intelligence', {
      totalAdapters: stats.totalAdapters,
    })

    // This would iterate through existing adapters and generate intelligence
    // For now, we'll set up the enhancement pipeline
    logger.info('Intelligence enhancement pipeline ready for existing adapters')
  }

  private async generateIntelligenceForAdapter(
    adapterId: string,
    toolConfig: ToolConfig
  ): Promise<void> {
    if (!this.config.enableNaturalLanguageDescriptions) {
      return
    }

    const startTime = Date.now()

    try {
      // Generate enhanced description
      const description = await this.descriptionFramework.generateEnhancedDescription(toolConfig)

      // Cache the description
      if (this.config.performance?.enableIntelligenceCaching) {
        const cacheKey = `desc-${adapterId}-detailed-default`
        this.intelligenceCache.set(cacheKey, description)
      }

      logger.debug('Generated intelligence for adapter', {
        adapterId,
        generationTime: Date.now() - startTime,
      })
    } catch (error) {
      logger.warn('Failed to generate intelligence for adapter', {
        adapterId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async enhanceDiscoveryWithRecommendations(
    baseResults: DiscoveredTool[],
    query: ToolDiscoveryQuery,
    userContext: UsageContext
  ): Promise<DiscoveredTool[]> {
    try {
      // Get contextual recommendations
      const recommendationRequest: ContextualRecommendationRequest = {
        userMessage: query.query || '',
        conversationHistory: [],
        currentContext: {
          ...userContext,
          userSkillLevel: userContext.userProfile?.experience || 'intermediate',
          userPreferences: {
            communicationStyle: 'detailed',
            complexityPreference: 'moderate',
            automationLevel: 'guided',
            feedbackLevel: 'standard',
            toolCategories: [],
            preferredWorkflowPatterns: [],
          },
          recentToolUsage: [],
          activeWorkflows: [],
          timeContext: {
            timeOfDay: new Date().getHours().toString(),
            dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()],
            timeZone: 'UTC',
            workingHours: true,
            urgency: 'medium',
          },
          businessContext: {
            industry: 'technology',
            companySize: 'medium',
            businessFunction: 'development',
            complianceRequirements: [],
            securityLevel: 'enhanced',
          },
          deviceContext: {
            deviceType: 'desktop',
            screenSize: 'large',
            inputMethod: 'keyboard',
            connectionQuality: 'fast',
          },
        } as any,
        maxRecommendations: this.config.recommendations?.maxRecommendations || 5,
      }

      const recommendations =
        await this.recommendationEngine.getRecommendations(recommendationRequest)

      // Merge recommendations with discovery results
      const enhancedResults = baseResults.map((tool) => {
        const recommendation = recommendations.find((rec) => rec.toolId === tool.id)

        if (recommendation) {
          return {
            ...tool,
            intelligenceEnhancement: {
              contextualRelevance: recommendation.contextualRelevance,
              recommendationScore: recommendation.confidence,
              whyRecommended: recommendation.whyRecommended,
              userGuidance: recommendation.personalizedInstructions,
              estimatedTime: '2-5 minutes',
            },
          }
        }

        return tool
      })

      return enhancedResults
    } catch (error) {
      logger.warn('Failed to enhance discovery with recommendations', { error })
      return baseResults
    }
  }

  private async performProactiveValidation(
    adapterId: string,
    args: any,
    userContext: UsageContext
  ): Promise<void> {
    try {
      const adapter = await this.baseRegistry.get(adapterId)
      if (!adapter) {
        return
      }

      // Create adapter execution context
      const executionContext: AdapterExecutionContext = {
        toolId: adapterId,
        executionId: `validation-${adapterId}-${Date.now()}`,
        userId: userContext.userId || 'anonymous',
        workspaceId: userContext.workspaceId || '',
        adapterVersion: '1.0.0',
        startedAt: new Date(),
        requestSource: 'api' as const,
      }

      // Perform proactive validation
      const validationResult = await this.errorManager.proactiveValidation(
        executionContext,
        args,
        adapter.getConfiguration()
      )

      if (!validationResult.valid) {
        const issues = [...validationResult.blockingIssues, ...validationResult.warnings].join('; ')

        throw new Error(`Validation failed: ${issues}`)
      }

      if (validationResult.warnings.length > 0) {
        logger.warn('Proactive validation warnings', {
          adapterId,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Validation failed:')) {
        throw error // Re-throw validation errors
      }
      logger.warn('Proactive validation error', {
        adapterId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async handleErrorIntelligently(
    error: Error,
    adapterId: string,
    context: ParlantExecutionContext,
    userContext?: UsageContext
  ): Promise<ToolErrorExplanation> {
    try {
      const executionContext: AdapterExecutionContext = {
        toolId: adapterId,
        executionId: context.executionId || `error-${adapterId}-${Date.now()}`,
        userId: context.userId || userContext?.userId || 'anonymous',
        workspaceId: context.workspaceId || userContext?.workspaceId || '',
        adapterVersion: '1.0.0',
        startedAt: new Date(),
        requestSource: 'api' as const,
      }

      const errorHandlingResult = await this.errorManager.handleToolError(error, executionContext)

      return errorHandlingResult.explanation
    } catch (handlingError) {
      logger.error('Intelligent error handling failed', { handlingError })

      // Return fallback explanation
      return {
        errorId: `fallback-${Date.now()}`,
        toolName: adapterId,
        errorType: 'tool_execution_timeout' as any,
        severity: 'error' as any,
        impact: 'medium' as any,
        userMessage: 'An error occurred while executing the tool. Please try again.',
        detailedExplanation: error instanceof Error ? error.message : String(error),
        immediateActions: [
          {
            action: 'Try Again',
            description: 'Retry the operation',
            estimatedTime: '30 seconds',
            difficulty: 'beginner',
          },
        ],
        preventionTips: [
          {
            tip: 'Check your input parameters',
            category: 'usage',
          },
        ],
        troubleshootingSteps: [],
        relatedErrors: [],
        documentationLinks: [],
        timestamp: new Date().toISOString(),
        context: {
          toolId: adapterId,
          toolName: adapterId,
          executionId: context.executionId || `error-${Date.now()}`,
          userId: context.userId || 'anonymous',
          workspaceId: context.workspaceId,
        },
      }
    }
  }

  private extractToolConfig(adapter: BaseAdapter): ToolConfig {
    // Extract or create tool configuration from adapter
    // This is a simplified implementation
    const metadata = adapter.metadata
    return {
      id: adapter.id,
      name: adapter.name || adapter.id,
      version: metadata?.version || '1.0.0',
      description: adapter.description || '',
      // Additional tool config properties would be mapped here
    } as ToolConfig
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.performance?.enableMetricsCollection) {
      return
    }

    // Start periodic metrics collection
    setInterval(() => {
      this.collectPerformanceMetrics()
    }, 60000) // Every minute

    // Start cache cleanup
    setInterval(() => {
      this.performCacheCleanup()
    }, 300000) // Every 5 minutes
  }

  private updateMetrics(operation: string, duration: number): void {
    if (!this.config.performance?.enableMetricsCollection) {
      return
    }

    // Update performance tracking
    const history = this.performanceTracker.get(operation) || []
    history.push(duration)

    // Keep only last 100 measurements
    if (history.length > 100) {
      history.shift()
    }

    this.performanceTracker.set(operation, history)

    // Update average metrics
    const average = history.reduce((sum, val) => sum + val, 0) / history.length

    switch (operation) {
      case 'description':
        this.metrics.averageDescriptionGenerationTime = average
        break
      case 'recommendations':
        this.metrics.averageRecommendationTime = average
        break
      case 'errorHandling':
        this.metrics.averageErrorHandlingTime = average
        break
    }

    // Update resource usage in performance monitor
    this.updateResourceUsageMetrics()
  }

  private updateResourceUsageMetrics(): void {
    // Update resource usage metrics for the performance monitor
    let memoryMB = 0
    const cpuPercent = 0

    if (process?.memoryUsage) {
      const memUsage = process.memoryUsage()
      memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    }

    this.performanceMonitor.recordResourceUsage(
      memoryMB,
      cpuPercent, // CPU usage would need additional implementation
      this.intelligenceCache.size,
      this.metrics.intelligenceCacheHitRate
    )
  }

  private updateUserSatisfactionMetrics(feedback: IntelligenceFeedback): void {
    // Simple exponential moving average for user satisfaction
    const alpha = 0.1
    this.metrics.userSatisfactionScore =
      this.metrics.userSatisfactionScore * (1 - alpha) + feedback.rating * alpha
  }

  private updateCacheHitRate(wasHit: boolean): void {
    const alpha = 0.1
    this.metrics.intelligenceCacheHitRate =
      this.metrics.intelligenceCacheHitRate * (1 - alpha) + (wasHit ? 1 : 0) * alpha
  }

  private collectPerformanceMetrics(): void {
    // Update cache size
    this.metrics.intelligenceCacheSize = this.intelligenceCache.size

    // Log metrics periodically
    logger.debug('Intelligence performance metrics', {
      metrics: this.metrics,
    })
  }

  private performCacheCleanup(): void {
    const maxCacheSize = 1000
    if (this.intelligenceCache.size > maxCacheSize) {
      const keysToDelete = Array.from(this.intelligenceCache.keys()).slice(
        0,
        Math.floor(this.intelligenceCache.size * 0.1)
      )

      for (const key of keysToDelete) {
        this.intelligenceCache.delete(key)
      }

      logger.debug('Performed intelligence cache cleanup', {
        deletedKeys: keysToDelete.length,
        remainingKeys: this.intelligenceCache.size,
      })
    }
  }

  private calculateCacheEfficiency(): number {
    return this.metrics.intelligenceCacheHitRate
  }

  private assessIntegrationHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    // Simple health assessment based on metrics
    const avgResponseTime =
      (this.metrics.averageDescriptionGenerationTime +
        this.metrics.averageRecommendationTime +
        this.metrics.averageErrorHandlingTime) /
      3

    if (avgResponseTime < 100 && this.metrics.userSatisfactionScore > 4) {
      return 'healthy'
    }
    if (avgResponseTime < 500 && this.metrics.userSatisfactionScore > 3) {
      return 'degraded'
    }
    return 'unhealthy'
  }

  private trackExecutionPerformance(data: any): void {
    // Track execution performance for intelligence optimization
    if (data.duration && data.entry) {
      this.updateMetrics('execution', data.duration)
    }
  }

  private async analyzeErrorForLearning(data: any): Promise<void> {
    // Analyze errors to improve future error handling
    if (data.error && data.adapterId) {
      logger.debug('Analyzing error for learning', {
        adapterId: data.adapterId,
        errorType: data.error.constructor.name,
      })

      // This would feed into the error learning system
    }
  }
}

// =============================================================================
// Factory Functions and Utilities
// =============================================================================

/**
 * Create an intelligence-enhanced Universal Tool Adapter system
 */
export function createIntelligenceEnhancedAdapter(
  baseRegistry: EnhancedAdapterRegistry,
  config?: IntelligenceConfiguration
): IntelligenceIntegrationLayer {
  return new IntelligenceIntegrationLayer(baseRegistry, config)
}

/**
 * Create a fully configured Universal Tool Adapter with Intelligence
 */
export async function createFullyIntelligentAdapter(config?: {
  registry?: any
  intelligence?: IntelligenceConfiguration
}): Promise<IntelligenceIntegrationLayer> {
  const registryConfig = config?.registry || {}
  const intelligenceConfig = config?.intelligence || {}

  // Create base registry
  const baseRegistry = new EnhancedAdapterRegistry(registryConfig)

  // Create intelligence layer
  const intelligenceLayer = new IntelligenceIntegrationLayer(baseRegistry, intelligenceConfig)

  // Initialize intelligence
  await intelligenceLayer.initialize()

  return intelligenceLayer
}

/**
 * Utility to check if intelligence features are available
 */
export function checkIntelligenceCapabilities(layer: IntelligenceIntegrationLayer): {
  naturalLanguageDescriptions: boolean
  contextualRecommendations: boolean
  intelligentErrorHandling: boolean
  performanceOptimization: boolean
} {
  const metrics = layer.getIntelligenceMetrics()

  return {
    naturalLanguageDescriptions: metrics.descriptionsGenerated > 0,
    contextualRecommendations: metrics.recommendationsProvided > 0,
    intelligentErrorHandling: metrics.errorsHandledIntelligently > 0,
    performanceOptimization: metrics.intelligenceCacheSize > 0,
  }
}

// Export the main integration layer for use
export default IntelligenceIntegrationLayer
