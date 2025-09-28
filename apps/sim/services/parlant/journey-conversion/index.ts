/**
 * Journey Conversion System - Main Export
 * =======================================
 *
 * Complete dynamic journey creation system for converting Sim workflows
 * into Parlant journeys with real-time conversion and intelligent caching.
 */

export { cacheService } from './cache-service'
// Core services
export { WorkflowToJourneyConverter } from './conversion-engine'
export { ConversionService, conversionService } from './conversion-service'
export { progressService } from './progress-service'
export { TemplateService, templateService } from './template-service'
// Type definitions
export type {
  AnalyticsService,
  // Block mapping types
  BlockJourneyMapping,
  CacheStats,
  ConversionAnalytics,
  // Caching types
  ConversionCacheEntry,
  ConversionConfig,
  ConversionContext,
  ConversionError,
  ConversionEvent,
  // Utility types
  ConversionEventType,
  ConversionMetadata,
  // Progress tracking types
  ConversionProgress,
  ConversionService as IConversionService,
  ConversionSubscription,
  ConversionWarning,
  EdgeJourneyMapping,
  JourneyConversionResult,
  // Journey creation types
  JourneyCreateFromTemplateRequest,
  JourneyCreateFromWorkflowRequest,
  ParameterValidation,
  // Template management types
  TemplateCreateRequest,
  TemplateListQuery,
  TemplateParameter,
  // Service interfaces
  TemplateService as ITemplateService,
  TemplateUpdateRequest,
  ToolCall,
  // Core conversion types
  WorkflowTemplate,
} from './types'

/**
 * Quick-start utilities for common operations
 */
export const journeyConversion = {
  /**
   * Convert a workflow directly to a journey
   */
  async convertWorkflow(request: {
    workflowId: string
    agentId: string
    workspaceId: string
    userId: string
    journeyName?: string
    journeyDescription?: string
    parameters?: Record<string, any>
    config?: Partial<ConversionConfig>
  }) {
    return conversionService.convertWorkflowDirectlyToJourney({
      workflow_id: request.workflowId,
      agent_id: request.agentId,
      workspace_id: request.workspaceId,
      journey_name: request.journeyName,
      journey_description: request.journeyDescription,
      parameters: request.parameters,
      config: request.config,
    })
  },

  /**
   * Convert a template to a journey with parameters
   */
  async convertTemplate(request: {
    templateId: string
    agentId: string
    workspaceId: string
    parameters: Record<string, any>
    journeyName?: string
    journeyDescription?: string
    config?: Partial<ConversionConfig>
  }) {
    return conversionService.convertTemplateToJourney({
      template_id: request.templateId,
      agent_id: request.agentId,
      workspace_id: request.workspaceId,
      parameters: request.parameters,
      journey_name: request.journeyName,
      journey_description: request.journeyDescription,
      config: request.config,
    })
  },

  /**
   * Create a workflow template
   */
  async createTemplate(request: {
    Name: string
    workflowId: string
    workspaceId: string
    description?: string
    parameters: Array<{
      Name: string
      type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json'
      description: string
      defaultValue?: any
      required?: boolean
      validation?: ParameterValidation
    }>
    tags?: string[]
  }) {
    return templateService.createTemplate({
      Name: request.Name,
      workflow_id: request.workflowId,
      workspace_id: request.workspaceId,
      description: request.description,
      parameters: request.parameters.map((param, index) => ({
        Name: param.Name,
        type: param.type,
        description: param.description,
        default_value: param.defaultValue,
        required: param.required || false,
        validation: param.validation,
        display_order: index,
      })),
      tags: request.tags,
    })
  },

  /**
   * Get conversion progress with real-time updates
   */
  async getProgress(conversionId: string) {
    return conversionService.getConversionProgress(conversionId)
  },

  /**
   * Subscribe to conversion progress updates
   */
  subscribeToProgress(
    conversionId: string,
    workspaceId: string,
    userId: string,
    callback: (progress: ConversionProgress) => void
  ) {
    return conversionService.subscribeToConversion({
      conversion_id: conversionId,
      workspace_id: workspaceId,
      user_id: userId,
      callback,
    })
  },

  /**
   * Get cache statistics
   */
  async getCacheStats(workspaceId: string) {
    return conversionService.getCacheStats(workspaceId)
  },

  /**
   * Clear conversion cache
   */
  async clearCache(workspaceId: string, templateId?: string) {
    return conversionService.clearCache(workspaceId, templateId)
  },
}

/**
 * Default export with all services and utilities
 */
export default {
  // Services
  templateService,
  conversionService,
  cacheService,
  progressService,

  // Utilities
  journeyConversion,

  // Version info
  version: {
    major: 1,
    minor: 0,
    patch: 0,
    build: 'dynamic-journey-creation',
    toString: () => '1.0.0-dynamic-journey-creation',
  },
}

/**
 * Feature capabilities exported for integration
 */
export const capabilities = {
  // Template system features
  templates: {
    create: true,
    update: true,
    delete: true,
    list: true,
    parameterValidation: true,
    versionControl: false, // Future feature
    sharing: false, // Future feature
  },

  // Conversion features
  conversion: {
    directWorkflow: true,
    templateBased: true,
    realTimeProgress: true,
    parameterSubstitution: true,
    optimization: ['basic', 'standard', 'advanced'],
    errorHandling: true,
    blockPreservation: true,
  },

  // Caching features
  caching: {
    memoryCache: true,
    persistentCache: true,
    intelligentInvalidation: true,
    statistics: true,
    cleanup: true,
    customDuration: true,
  },

  // Journey features
  journeys: {
    dynamicCreation: true,
    stepOptimization: true,
    conditionalLogic: true,
    parallelExecution: false, // Future feature
    loopHandling: false, // Future feature
    customization: true,
  },

  // API features
  api: {
    restEndpoints: true,
    webhooks: false, // Future feature
    graphql: false, // Future feature
    authentication: true,
    rateLimit: false, // Future feature
    versioning: true,
  },

  // Analytics features
  analytics: {
    conversionMetrics: true,
    performanceTracking: true,
    usageStatistics: true,
    errorTracking: true,
    cacheAnalytics: true,
    customReports: false, // Future feature
  },
}
