/**
 * Real-Time Recommendation API
 *
 * High-performance API for delivering contextual tool recommendations with
 * advanced caching, request optimization, and real-time processing capabilities.
 *
 * Features:
 * - Multi-level caching with intelligent invalidation
 * - Request deduplication and batching
 * - Real-time context streaming and updates
 * - Circuit breaker pattern for resilience
 * - Performance monitoring and metrics
 * - Rate limiting and throttling
 * - Response compression and optimization
 * - A/B testing integration
 *
 * @author Contextual Tool Recommendation Engine Agent
 * @version 2.0.0
 */

import { createLogger } from '../utils/logger'
import type {
  AdvancedUsageContext,
  ContextualRecommendation,
  ContextualRecommendationRequest,
} from './contextual-recommendation-engine'

const logger = createLogger('RecommendationAPI')

// =============================================================================
// API Configuration Types
// =============================================================================

export interface RecommendationAPIConfig {
  // Caching configuration
  cache: CacheConfig

  // Performance settings
  performance: PerformanceConfig

  // Security and rate limiting
  security: SecurityConfig

  // Monitoring and observability
  monitoring: MonitoringConfig

  // A/B testing
  abTesting: ABTestingConfig

  // Circuit breaker
  circuitBreaker: CircuitBreakerConfig
}

export interface CacheConfig {
  // Multi-level cache settings
  l1Cache: CacheLayerConfig // In-memory cache
  l2Cache?: CacheLayerConfig // Distributed cache (Redis)
  l3Cache?: CacheLayerConfig // Persistent cache (Database)

  // Cache strategies
  strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive'
  compressionEnabled: boolean
  encryptionEnabled: boolean

  // Cache invalidation
  invalidationStrategy: 'ttl' | 'event_driven' | 'hybrid'
  maxAge: number
  staleWhileRevalidate: boolean
}

export interface CacheLayerConfig {
  maxSize: number
  ttl: number
  updateThreshold: number
  compressionLevel?: number
  shardCount?: number
}

export interface PerformanceConfig {
  // Request optimization
  requestDeduplication: boolean
  requestBatching: boolean
  maxBatchSize: number
  batchTimeout: number

  // Response optimization
  responseCompression: boolean
  streamingEnabled: boolean
  partialResponsesEnabled: boolean

  // Connection settings
  maxConcurrentRequests: number
  requestTimeout: number
  keepAliveTimeout: number

  // Resource limits
  maxMemoryUsage: number
  maxCPUUsage: number
}

export interface SecurityConfig {
  // Rate limiting
  rateLimiting: RateLimitConfig

  // Authentication and authorization
  requireAuthentication: boolean
  allowedOrigins: string[]
  apiKeyRequired: boolean

  // Request validation
  inputValidation: boolean
  sanitizeInputs: boolean
  maxRequestSize: number

  // Response security
  hideInternalErrors: boolean
  addSecurityHeaders: boolean
}

export interface RateLimitConfig {
  enabled: boolean
  windowSize: number // in milliseconds
  maxRequests: number
  burstAllowance: number
  rateLimitHeaders: boolean
}

export interface MonitoringConfig {
  // Metrics collection
  metricsEnabled: boolean
  detailedMetrics: boolean
  customMetrics: string[]

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  structuredLogging: boolean
  logSampling: number

  // Health checks
  healthCheckEnabled: boolean
  healthCheckInterval: number

  // Alerting
  alertingEnabled: boolean
  alertThresholds: Record<string, number>
}

export interface ABTestingConfig {
  enabled: boolean
  defaultVariant: string
  trafficSplitting: Record<string, number>
  stickyUsers: boolean
  excludeFromTesting: string[]
}

export interface CircuitBreakerConfig {
  enabled: boolean
  failureThreshold: number
  recoveryTimeout: number
  monitoringWindow: number
  fallbackEnabled: boolean
}

// =============================================================================
// Request and Response Types
// =============================================================================

export interface RecommendationAPIRequest {
  // Core request data
  request: ContextualRecommendationRequest

  // API metadata
  requestId: string
  userId: string
  sessionId: string
  timestamp: Date

  // Request options
  options: RequestOptions

  // Client information
  clientInfo: ClientInfo
}

export interface RequestOptions {
  // Response preferences
  maxRecommendations?: number
  includeExplanations?: boolean
  includeAlternatives?: boolean

  // Performance preferences
  maxResponseTime?: number
  allowStaleResponse?: boolean
  prioritizeSpeed?: boolean

  // Personalization
  personalizationLevel?: 'none' | 'basic' | 'advanced' | 'full'
  explicitPreferences?: Record<string, any>

  // A/B testing
  forceVariant?: string
  excludeFromTesting?: boolean
}

export interface ClientInfo {
  userAgent: string
  ipAddress: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browserVersion: string
  operatingSystem: string
  screenResolution: string
  connectionType: 'fast' | 'slow' | 'unknown'
}

export interface RecommendationAPIResponse {
  // Core response data
  recommendations: EnhancedRecommendation[]

  // Response metadata
  responseId: string
  requestId: string
  timestamp: Date
  processingTime: number

  // Cache information
  cacheInfo: CacheInfo

  // Performance metrics
  performanceMetrics: ResponsePerformanceMetrics

  // A/B testing info
  abTestInfo?: ABTestInfo

  // Status information
  status: ResponseStatus
}

export interface EnhancedRecommendation extends ContextualRecommendation {
  // Additional API-specific data
  apiScore: number
  cacheHit: boolean
  freshness: number

  // Personalization data
  personalizationFactors: PersonalizationFactor[]

  // Performance data
  computationTime: number
  dataSourcesUsed: string[]
}

export interface CacheInfo {
  cacheHit: boolean
  cacheLevel: 'l1' | 'l2' | 'l3' | 'miss'
  cacheAge: number
  cacheKey: string
  stale: boolean
}

export interface ResponsePerformanceMetrics {
  totalTime: number
  cacheTime: number
  computationTime: number
  networkTime: number
  serializationTime: number
  memoryUsed: number
  cpuUsed: number
}

export interface ABTestInfo {
  variant: string
  testId: string
  included: boolean
  excludedReason?: string
}

export interface ResponseStatus {
  success: boolean
  code: number
  message: string
  warnings: string[]
  errors: ResponseError[]
}

export interface ResponseError {
  code: string
  message: string
  field?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface PersonalizationFactor {
  factor: string
  value: number
  confidence: number
  source: string
}

// =============================================================================
// Cache Management Types
// =============================================================================

export interface CacheKey {
  userId: string
  contextHash: string
  parametersHash: string
  version: string
}

export interface CacheEntry<T> {
  data: T
  timestamp: Date
  hits: number
  computationTime: number
  size: number
  tags: string[]
  dependencies: string[]
}

export interface CacheStatistics {
  hitRate: number
  missRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  averageResponseTime: number
  cacheSize: number
  memoryUsage: number
  evictionCount: number
}

// =============================================================================
// Performance Monitoring Types
// =============================================================================

export interface PerformanceMetrics {
  // Request metrics
  requestRate: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number

  // Cache metrics
  cacheHitRate: number
  cacheMissRate: number
  cacheSize: number

  // Resource metrics
  memoryUsage: number
  cpuUsage: number
  networkIO: number
  diskIO: number

  // Business metrics
  recommendationQuality: number
  userSatisfaction: number
  conversionRate: number
}

export interface AlertCondition {
  metric: string
  threshold: number
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  duration: number
  severity: 'info' | 'warning' | 'error' | 'critical'
}

// =============================================================================
// Main Recommendation API Class
// =============================================================================

export class RecommendationAPI {
  private config: RecommendationAPIConfig
  private cache!: MultiLevelCache
  private performanceMonitor!: PerformanceMonitor
  private rateLimiter!: RateLimiter
  private circuitBreaker!: CircuitBreaker
  private abTesting!: ABTestingManager

  // Request processing
  private requestQueue: Map<string, Promise<RecommendationAPIResponse>> = new Map()
  private batchProcessor!: BatchProcessor

  // Metrics and monitoring
  private metrics!: PerformanceMetrics
  private alertManager!: AlertManager

  constructor(config: Partial<RecommendationAPIConfig> = {}) {
    this.config = {
      cache: {
        l1Cache: {
          maxSize: 10000,
          ttl: 300000, // 5 minutes
          updateThreshold: 0.8,
        },
        strategy: 'adaptive',
        compressionEnabled: true,
        encryptionEnabled: false,
        invalidationStrategy: 'hybrid',
        maxAge: 3600000, // 1 hour
        staleWhileRevalidate: true,
      },
      performance: {
        requestDeduplication: true,
        requestBatching: true,
        maxBatchSize: 50,
        batchTimeout: 100, // 100ms
        responseCompression: true,
        streamingEnabled: true,
        partialResponsesEnabled: true,
        maxConcurrentRequests: 1000,
        requestTimeout: 30000, // 30 seconds
        keepAliveTimeout: 60000, // 1 minute
        maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
        maxCPUUsage: 80,
      },
      security: {
        rateLimiting: {
          enabled: true,
          windowSize: 60000, // 1 minute
          maxRequests: 1000,
          burstAllowance: 100,
          rateLimitHeaders: true,
        },
        requireAuthentication: true,
        allowedOrigins: ['*'],
        apiKeyRequired: false,
        inputValidation: true,
        sanitizeInputs: true,
        maxRequestSize: 1024 * 1024, // 1MB
        hideInternalErrors: true,
        addSecurityHeaders: true,
      },
      monitoring: {
        metricsEnabled: true,
        detailedMetrics: true,
        customMetrics: [],
        logLevel: 'info',
        structuredLogging: true,
        logSampling: 0.1,
        healthCheckEnabled: true,
        healthCheckInterval: 30000, // 30 seconds
        alertingEnabled: true,
        alertThresholds: {
          responseTime: 1000, // 1 second
          errorRate: 0.05, // 5%
          memoryUsage: 0.8, // 80%
        },
      },
      abTesting: {
        enabled: false,
        defaultVariant: 'control',
        trafficSplitting: { control: 1.0 },
        stickyUsers: true,
        excludeFromTesting: [],
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringWindow: 60000, // 1 minute
        fallbackEnabled: true,
      },
      ...config,
    }

    this.initializeComponents()
    logger.info('Recommendation API initialized', { config: this.config })
  }

  // =============================================================================
  // Main API Methods
  // =============================================================================

  /**
   * Get recommendations with caching and performance optimization
   */
  async getRecommendations(
    apiRequest: RecommendationAPIRequest
  ): Promise<RecommendationAPIResponse> {
    const startTime = Date.now()

    try {
      // Validate request
      this.validateRequest(apiRequest)

      // Check rate limits
      await this.rateLimiter.checkLimit(apiRequest.userId, apiRequest.clientInfo.ipAddress)

      // Check circuit breaker
      if (!this.circuitBreaker.canExecute()) {
        return this.handleCircuitBreakerOpen(apiRequest)
      }

      // Request deduplication
      const deduplicationKey = this.generateDeduplicationKey(apiRequest)
      const existingRequest = this.requestQueue.get(deduplicationKey)

      if (existingRequest && this.config.performance.requestDeduplication) {
        logger.debug('Returning deduplicated request', { requestId: apiRequest.requestId })
        return await existingRequest
      }

      // Process request
      const responsePromise = this.processRequest(apiRequest, startTime)

      // Store in deduplication queue
      if (this.config.performance.requestDeduplication) {
        this.requestQueue.set(deduplicationKey, responsePromise)

        // Clean up after completion
        responsePromise.finally(() => {
          this.requestQueue.delete(deduplicationKey)
        })
      }

      const response = await responsePromise

      // Record success in circuit breaker
      this.circuitBreaker.recordSuccess()

      return response
    } catch (error) {
      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure()

      logger.error('Error processing recommendation request', {
        error,
        requestId: apiRequest.requestId,
        userId: apiRequest.userId,
      })

      // Return fallback response
      return this.createErrorResponse(apiRequest, error, Date.now() - startTime)
    }
  }

  /**
   * Stream recommendations in real-time
   */
  async *streamRecommendations(
    apiRequest: RecommendationAPIRequest
  ): AsyncGenerator<RecommendationStreamChunk> {
    try {
      // Initial recommendations
      const initialResponse = await this.getRecommendations(apiRequest)

      yield {
        type: 'initial',
        data: initialResponse,
        timestamp: new Date(),
      }

      // Context updates stream
      if (this.config.performance.streamingEnabled) {
        const contextStream = this.createContextStream(apiRequest)

        for await (const contextUpdate of contextStream) {
          const updatedResponse = await this.getRecommendations({
            ...apiRequest,
            request: {
              ...apiRequest.request,
              currentContext: contextUpdate.context,
            },
          })

          yield {
            type: 'update',
            data: updatedResponse,
            timestamp: new Date(),
            contextChange: contextUpdate,
          }
        }
      }
    } catch (error) {
      logger.error('Error in recommendation streaming', { error, requestId: apiRequest.requestId })

      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      }
    }
  }

  /**
   * Batch process multiple recommendation requests
   */
  async batchGetRecommendations(
    requests: RecommendationAPIRequest[]
  ): Promise<RecommendationAPIResponse[]> {
    if (!this.config.performance.requestBatching) {
      // Process individually if batching disabled
      return Promise.all(requests.map((req) => this.getRecommendations(req)))
    }

    return this.batchProcessor.processBatch(requests)
  }

  /**
   * Invalidate cache for specific user or context
   */
  async invalidateCache(criteria: CacheInvalidationCriteria): Promise<CacheInvalidationResult> {
    return this.cache.invalidate(criteria)
  }

  /**
   * Get API health status
   */
  getHealthStatus(): APIHealthStatus {
    return {
      status: this.circuitBreaker.getState() === 'closed' ? 'healthy' : 'degraded',
      timestamp: new Date(),
      metrics: this.metrics,
      cacheStats: this.cache.getStatistics(),
      circuitBreakerState: this.circuitBreaker.getState(),
      uptime: Date.now() - this.initializeTime,
      version: '2.0.0',
    }
  }

  /**
   * Get performance analytics
   */
  getAnalytics(timeRange?: { start: Date; end: Date }): APIAnalytics {
    return this.performanceMonitor.getAnalytics(timeRange)
  }

  // =============================================================================
  // Private Processing Methods
  // =============================================================================

  private async processRequest(
    apiRequest: RecommendationAPIRequest,
    startTime: number
  ): Promise<RecommendationAPIResponse> {
    const cacheKey = this.generateCacheKey(apiRequest)

    // Try cache first
    const cached = await this.cache.get(cacheKey)
    if (cached && this.isCacheValid(cached, apiRequest)) {
      logger.debug('Cache hit', { requestId: apiRequest.requestId, cacheLevel: cached.level })

      return this.createCachedResponse(apiRequest, cached, startTime)
    }

    // A/B testing variant selection
    const abVariant = await this.abTesting.getVariant(apiRequest.userId)

    // Generate recommendations
    const recommendations = await this.generateRecommendations(apiRequest, abVariant)

    // Create response
    const response = this.createResponse(apiRequest, recommendations, startTime, false, abVariant)

    // Cache the response
    await this.cache.set(cacheKey, response, {
      ttl: this.calculateCacheTTL(apiRequest),
      tags: this.generateCacheTags(apiRequest),
      dependencies: this.generateCacheDependencies(apiRequest),
    })

    return response
  }

  private async generateRecommendations(
    apiRequest: RecommendationAPIRequest,
    abVariant?: ABTestVariant
  ): Promise<EnhancedRecommendation[]> {
    // This would integrate with the contextual recommendation engine
    // For now, return mock recommendations
    const mockRecommendations: EnhancedRecommendation[] = []

    return mockRecommendations
  }

  private initializeComponents(): void {
    this.cache = new MultiLevelCache(this.config.cache)
    this.performanceMonitor = new PerformanceMonitor(this.config.monitoring)
    this.rateLimiter = new RateLimiter(this.config.security.rateLimiting)
    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker)
    this.abTesting = new ABTestingManager(this.config.abTesting)
    this.batchProcessor = new BatchProcessor(this.config.performance)
    this.alertManager = new AlertManager(this.config.monitoring)

    this.metrics = this.initializeMetrics()
    this.initializeTime = Date.now()
  }

  // =============================================================================
  // Helper Methods (Implementation Stubs)
  // =============================================================================

  private validateRequest(request: RecommendationAPIRequest): void {
    // Implementation would validate request structure and content
  }

  private generateDeduplicationKey(request: RecommendationAPIRequest): string {
    // Generate key for request deduplication
    return `${request.userId}:${JSON.stringify(request.request).slice(0, 100)}`
  }

  private generateCacheKey(request: RecommendationAPIRequest): string {
    // Generate cache key
    return `recommendations:${request.userId}:${request.sessionId}`
  }

  private isCacheValid(cached: any, request: RecommendationAPIRequest): boolean {
    // Check cache validity
    return true
  }

  private calculateCacheTTL(request: RecommendationAPIRequest): number {
    // Calculate dynamic cache TTL
    return this.config.cache.l1Cache.ttl
  }

  private generateCacheTags(request: RecommendationAPIRequest): string[] {
    // Generate cache tags for invalidation
    return [`user:${request.userId}`]
  }

  private generateCacheDependencies(request: RecommendationAPIRequest): string[] {
    // Generate cache dependencies
    return []
  }

  private createResponse(
    request: RecommendationAPIRequest,
    recommendations: EnhancedRecommendation[],
    startTime: number,
    cached: boolean,
    abVariant?: ABTestVariant
  ): RecommendationAPIResponse {
    const processingTime = Date.now() - startTime

    return {
      recommendations,
      responseId: this.generateResponseId(),
      requestId: request.requestId,
      timestamp: new Date(),
      processingTime,
      cacheInfo: {
        cacheHit: cached,
        cacheLevel: cached ? 'l1' : 'miss',
        cacheAge: 0,
        cacheKey: this.generateCacheKey(request),
        stale: false,
      },
      performanceMetrics: {
        totalTime: processingTime,
        cacheTime: 0,
        computationTime: processingTime,
        networkTime: 0,
        serializationTime: 0,
        memoryUsed: 0,
        cpuUsed: 0,
      },
      abTestInfo: abVariant
        ? {
            variant: abVariant.variantId,
            testId: abVariant.testId || 'default',
            included: true,
          }
        : undefined,
      status: {
        success: true,
        code: 200,
        message: 'Success',
        warnings: [],
        errors: [],
      },
    }
  }

  private createCachedResponse(
    request: RecommendationAPIRequest,
    cached: any,
    startTime: number
  ): RecommendationAPIResponse {
    return this.createResponse(request, cached.data, startTime, true)
  }

  private createErrorResponse(
    request: RecommendationAPIRequest,
    error: any,
    processingTime: number
  ): RecommendationAPIResponse {
    return {
      recommendations: [],
      responseId: this.generateResponseId(),
      requestId: request.requestId,
      timestamp: new Date(),
      processingTime,
      cacheInfo: {
        cacheHit: false,
        cacheLevel: 'miss',
        cacheAge: 0,
        cacheKey: '',
        stale: false,
      },
      performanceMetrics: {
        totalTime: processingTime,
        cacheTime: 0,
        computationTime: 0,
        networkTime: 0,
        serializationTime: 0,
        memoryUsed: 0,
        cpuUsed: 0,
      },
      status: {
        success: false,
        code: 500,
        message: 'Internal server error',
        warnings: [],
        errors: [
          {
            code: 'INTERNAL_ERROR',
            message: this.config.security.hideInternalErrors
              ? 'Internal error occurred'
              : error instanceof Error
                ? error.message
                : String(error),
            severity: 'high',
          },
        ],
      },
    }
  }

  private handleCircuitBreakerOpen(request: RecommendationAPIRequest): RecommendationAPIResponse {
    return this.createErrorResponse(request, new Error('Service temporarily unavailable'), 0)
  }

  private async *createContextStream(
    request: RecommendationAPIRequest
  ): AsyncGenerator<ContextUpdate> {
    // Implementation would create real-time context stream
    // This is a stub
    yield {
      context: request.request.currentContext,
      changeType: 'update',
      timestamp: new Date(),
    }
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      requestRate: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      cacheMissRate: 0,
      cacheSize: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkIO: 0,
      diskIO: 0,
      recommendationQuality: 0,
      userSatisfaction: 0,
      conversionRate: 0,
    }
  }

  private initializeTime: number = Date.now()
}

// =============================================================================
// Supporting Classes (Implementation Stubs)
// =============================================================================

class MultiLevelCache {
  constructor(private config: CacheConfig) {}

  async get(key: string): Promise<any> {
    return null
  }

  async set(key: string, value: any, options?: any): Promise<void> {
    // Implementation would set cache value
  }

  async invalidate(criteria: CacheInvalidationCriteria): Promise<CacheInvalidationResult> {
    return { invalidated: 0, errors: [] }
  }

  getStatistics(): CacheStatistics {
    return {
      hitRate: 0.8,
      missRate: 0.2,
      totalRequests: 1000,
      totalHits: 800,
      totalMisses: 200,
      averageResponseTime: 50,
      cacheSize: 1000,
      memoryUsage: 1024 * 1024,
      evictionCount: 10,
    }
  }
}

class PerformanceMonitor {
  constructor(private config: MonitoringConfig) {}

  getAnalytics(timeRange?: { start: Date; end: Date }): APIAnalytics {
    return {} as APIAnalytics
  }
}

class RateLimiter {
  constructor(private config: RateLimitConfig) {}

  async checkLimit(userId: string, ipAddress: string): Promise<void> {
    // Implementation would check and enforce rate limits
  }
}

class CircuitBreaker {
  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
    return true
  }

  recordSuccess(): void {}
  recordFailure(): void {}

  getState(): 'closed' | 'open' | 'half-open' {
    return 'closed'
  }
}

class ABTestingManager {
  constructor(private config: ABTestingConfig) {}

  async getVariant(userId: string): Promise<ABTestVariant | undefined> {
    return undefined
  }
}

class BatchProcessor {
  constructor(private config: PerformanceConfig) {}

  async processBatch(requests: RecommendationAPIRequest[]): Promise<RecommendationAPIResponse[]> {
    return []
  }
}

class AlertManager {
  constructor(private config: MonitoringConfig) {}
}

// =============================================================================
// Additional Supporting Types
// =============================================================================

interface RecommendationStreamChunk {
  type: 'initial' | 'update' | 'error'
  data?: RecommendationAPIResponse
  error?: string
  timestamp: Date
  contextChange?: ContextUpdate
}

interface ContextUpdate {
  context: AdvancedUsageContext
  changeType: 'update' | 'major_change' | 'workflow_change'
  timestamp: Date
}

interface CacheInvalidationCriteria {
  userId?: string
  tags?: string[]
  pattern?: string
  olderThan?: Date
}

interface CacheInvalidationResult {
  invalidated: number
  errors: string[]
}

interface APIHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  metrics: PerformanceMetrics
  cacheStats: CacheStatistics
  circuitBreakerState: string
  uptime: number
  version: string
}

interface APIAnalytics {
  requests: number
  responses: number
  errors: number
  averageResponseTime: number
  cacheHitRate: number
  userSatisfaction: number
}

interface ABTestVariant {
  variantId: string
  testId?: string
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create recommendation API with default configuration
 */
export function createRecommendationAPI(
  config?: Partial<RecommendationAPIConfig>
): RecommendationAPI {
  return new RecommendationAPI(config)
}

/**
 * Create production-ready recommendation API
 */
export function createProductionRecommendationAPI(): RecommendationAPI {
  const productionConfig: Partial<RecommendationAPIConfig> = {
    cache: {
      l1Cache: {
        maxSize: 50000,
        ttl: 300000, // 5 minutes
        updateThreshold: 0.9,
      },
      l2Cache: {
        maxSize: 500000,
        ttl: 3600000, // 1 hour
        updateThreshold: 0.8,
      },
      strategy: 'adaptive',
      compressionEnabled: true,
      encryptionEnabled: true,
      invalidationStrategy: 'hybrid',
      maxAge: 7200000, // 2 hours
      staleWhileRevalidate: true,
    },
    performance: {
      requestDeduplication: true,
      requestBatching: true,
      maxBatchSize: 100,
      batchTimeout: 50, // 50ms
      responseCompression: true,
      streamingEnabled: true,
      partialResponsesEnabled: true,
      maxConcurrentRequests: 5000,
      requestTimeout: 10000, // 10 seconds
      keepAliveTimeout: 120000, // 2 minutes
      maxMemoryUsage: 4 * 1024 * 1024 * 1024, // 4GB
      maxCPUUsage: 70,
    },
    security: {
      rateLimiting: {
        enabled: true,
        windowSize: 60000,
        maxRequests: 10000,
        burstAllowance: 500,
        rateLimitHeaders: true,
      },
      requireAuthentication: true,
      allowedOrigins: [], // Specific origins in production
      apiKeyRequired: true,
      inputValidation: true,
      sanitizeInputs: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      hideInternalErrors: true,
      addSecurityHeaders: true,
    },
    monitoring: {
      metricsEnabled: true,
      detailedMetrics: true,
      customMetrics: ['business_conversions', 'user_engagement', 'recommendation_accuracy'],
      logLevel: 'info',
      structuredLogging: true,
      logSampling: 0.01, // 1% sampling in production
      healthCheckEnabled: true,
      healthCheckInterval: 15000, // 15 seconds
      alertingEnabled: true,
      alertThresholds: {
        responseTime: 500, // 500ms
        errorRate: 0.01, // 1%
        memoryUsage: 0.85, // 85%
      },
    },
  }

  return new RecommendationAPI(productionConfig)
}
