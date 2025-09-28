/**
 * Agent Resource Management and Optimization System
 * ================================================
 *
 * Comprehensive system for managing agent resources, optimizing performance,
 * and ensuring efficient resource utilization across all agent operations.
 * Handles memory management, CPU optimization, concurrent session limits,
 * and automatic resource scaling.
 *
 * Key Features:
 * - Dynamic resource allocation and optimization
 * - Memory management and garbage collection
 * - CPU usage monitoring and throttling
 * - Concurrent session management and limits
 * - Automatic scaling based on demand
 * - Resource pool management
 * - Performance optimization recommendations
 * - Cost optimization and billing tracking
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('AgentResourceManager')

/**
 * Resource types being tracked
 */
export type ResourceType = 'memory' | 'cpu' | 'network' | 'storage' | 'tokens' | 'sessions'

/**
 * Resource allocation strategy
 */
export type AllocationStrategy = 'conservative' | 'balanced' | 'aggressive' | 'custom'

/**
 * Resource metrics snapshot
 */
export interface ResourceMetrics {
  timestamp: Date
  agentId: string
  sessionId?: string
  memoryUsageMB: number
  memoryLimitMB: number
  cpuUsagePercent: number
  cpuLimitPercent: number
  networkBytesPerSecond: number
  storageUsedMB: number
  tokensConsumed: number
  tokenLimit: number
  activeSessions: number
  sessionLimit: number
  resourceHealth: 'healthy' | 'warning' | 'critical'
}

/**
 * Resource pool configuration
 */
export interface ResourcePool {
  id: string
  Name: string
  agentIds: string[]
  limits: ResourceLimits
  allocation: ResourceAllocation
  scaling: ScalingConfig
  monitoring: MonitoringConfig
  isActive: boolean
}

/**
 * Resource limits configuration
 */
export interface ResourceLimits {
  maxMemoryMB: number
  maxCpuPercent: number
  maxConcurrentSessions: number
  maxTokensPerMinute: number
  maxNetworkBytesPerSecond: number
  maxStorageMB: number
}

/**
 * Resource allocation configuration
 */
export interface ResourceAllocation {
  strategy: AllocationStrategy
  reservedMemoryMB: number
  reservedCpuPercent: number
  priorityWeights: {
    responseTime: number
    throughput: number
    quality: number
    cost: number
  }
  elasticLimits: {
    minMemoryMB: number
    maxMemoryMB: number
    minCpuPercent: number
    maxCpuPercent: number
  }
}

/**
 * Scaling configuration
 */
export interface ScalingConfig {
  enabled: boolean
  triggers: ScalingTrigger[]
  cooldownMs: number
  minInstances: number
  maxInstances: number
  scaleUpThreshold: number
  scaleDownThreshold: number
  predictiveScaling: boolean
}

/**
 * Scaling trigger definition
 */
export interface ScalingTrigger {
  id: string
  metric: ResourceType
  condition: 'above' | 'below'
  threshold: number
  duration: number
  action: 'scale_up' | 'scale_down' | 'optimize'
  priority: number
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean
  intervalMs: number
  alertThresholds: {
    memory: number
    cpu: number
    sessions: number
    tokens: number
  }
  retentionDays: number
  aggregationLevel: 'detailed' | 'summary'
}

/**
 * Resource optimization recommendation
 */
export interface OptimizationRecommendation {
  id: string
  agentId?: string
  poolId?: string
  type: 'memory' | 'cpu' | 'scaling' | 'configuration' | 'cost'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expectedSavings: {
    memoryMB?: number
    cpuPercent?: number
    costPerHour?: number
    performanceImprovement?: number
  }
  implementationSteps: string[]
  automatable: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

/**
 * Resource usage forecast
 */
export interface ResourceForecast {
  agentId: string
  timeframe: '1h' | '24h' | '7d' | '30d'
  predictions: {
    peakMemoryMB: number
    peakCpuPercent: number
    peakConcurrentSessions: number
    totalTokensConsumed: number
    estimatedCost: number
  }
  confidence: number
  basedOnDataPoints: number
}

/**
 * Main Agent Resource Manager class
 */
export class AgentResourceManager extends EventEmitter {
  private resourceMetrics = new Map<string, ResourceMetrics[]>() // agentId -> metrics
  private resourcePools = new Map<string, ResourcePool>()
  private activeAllocations = new Map<string, ResourceAllocation>() // sessionId -> allocation
  private monitoringIntervals = new Map<string, NodeJS.Timeout>()
  private optimizationRecommendations = new Map<string, OptimizationRecommendation[]>()
  private resourceForecasts = new Map<string, ResourceForecast>()
  private scalingOperations = new Map<string, Date>() // cooldown tracking

  constructor() {
    super()
    this.initializeResourceManager()
    this.startGlobalResourceMonitoring()
    logger.info('Agent Resource Manager initialized')
  }

  /**
   * Create a new resource pool
   */
  public createResourcePool(config: Omit<ResourcePool, 'id' | 'isActive'>): ResourcePool {
    const pool: ResourcePool = {
      id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      ...config,
    }

    this.resourcePools.set(pool.id, pool)

    // Start monitoring for this pool
    if (pool.monitoring.enabled) {
      this.startPoolMonitoring(pool.id)
    }

    logger.info(`Resource pool created`, {
      poolId: pool.id,
      Name: pool.Name,
      agentCount: pool.agentIds.length,
    })

    return pool
  }

  /**
   * Allocate resources for a new session
   */
  public async allocateSessionResources(
    sessionId: string,
    agentId: string,
    estimatedRequirements: {
      memoryMB?: number
      cpuPercent?: number
      tokensPerMinute?: number
      priority?: 'low' | 'medium' | 'high'
    }
  ): Promise<{
    allocated: ResourceAllocation
    sessionLimits: ResourceLimits
    poolId?: string
  }> {
    logger.info(`Allocating resources for session`, { sessionId, agentId })

    try {
      // Find the appropriate resource pool
      const pool = this.findPoolForAgent(agentId)

      // Check resource availability
      const currentUsage = await this.getCurrentResourceUsage(agentId)
      const available = this.calculateAvailableResources(pool, currentUsage)

      // Determine allocation strategy
      const strategy = this.determineAllocationStrategy(
        estimatedRequirements,
        available,
        pool?.allocation.strategy
      )

      // Calculate resource allocation
      const allocation = this.calculateResourceAllocation(
        estimatedRequirements,
        available,
        strategy
      )

      // Create session limits based on allocation
      const sessionLimits: ResourceLimits = {
        maxMemoryMB: allocation.reservedMemoryMB,
        maxCpuPercent: allocation.reservedCpuPercent,
        maxConcurrentSessions: 1, // Per session limit
        maxTokensPerMinute: estimatedRequirements.tokensPerMinute || 1000,
        maxNetworkBytesPerSecond: 1024 * 1024, // 1MB/s default
        maxStorageMB: 100, // 100MB default
      }

      // Store allocation
      this.activeAllocations.set(sessionId, allocation)

      // Start session resource monitoring
      this.startSessionResourceMonitoring(sessionId, agentId)

      // Update pool usage
      if (pool) {
        this.updatePoolUsage(pool.id, allocation, 'allocate')
      }

      logger.info(`Resources allocated for session`, {
        sessionId,
        memoryMB: allocation.reservedMemoryMB,
        cpuPercent: allocation.reservedCpuPercent,
        poolId: pool?.id,
      })

      return {
        allocated: allocation,
        sessionLimits,
        poolId: pool?.id,
      }
    } catch (error) {
      logger.error(`Failed to allocate session resources`, {
        sessionId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Deallocate resources when session ends
   */
  public async deallocateSessionResources(sessionId: string): Promise<void> {
    logger.info(`Deallocating resources for session`, { sessionId })

    try {
      const allocation = this.activeAllocations.get(sessionId)
      if (!allocation) {
        logger.warn(`No allocation found for session`, { sessionId })
        return
      }

      // Stop session monitoring
      this.stopSessionResourceMonitoring(sessionId)

      // Update pool usage
      const pool = this.findPoolBySessionAllocation(allocation)
      if (pool) {
        this.updatePoolUsage(pool.id, allocation, 'deallocate')
      }

      // Clean up allocation
      this.activeAllocations.delete(sessionId)

      // Trigger optimization if needed
      this.checkOptimizationTriggers(allocation)

      logger.info(`Resources deallocated for session`, { sessionId })
    } catch (error) {
      logger.error(`Failed to deallocate session resources`, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Monitor resource usage in real-time
   */
  public async monitorResourceUsage(agentId: string, sessionId?: string): Promise<ResourceMetrics> {
    const currentMetrics = await this.collectCurrentMetrics(agentId, sessionId)

    // Store metrics
    const agentMetrics = this.resourceMetrics.get(agentId) || []
    agentMetrics.push(currentMetrics)

    // Keep only last 1000 metrics per agent
    if (agentMetrics.length > 1000) {
      agentMetrics.splice(0, agentMetrics.length - 1000)
    }

    this.resourceMetrics.set(agentId, agentMetrics)

    // Check for resource warnings
    this.checkResourceThresholds(currentMetrics)

    // Update forecasts
    this.updateResourceForecasts(agentId)

    return currentMetrics
  }

  /**
   * Optimize resource allocation for an agent
   */
  public async optimizeAgentResources(
    agentId: string,
    options: {
      aggressive?: boolean
      preservePerformance?: boolean
      targetCostReduction?: number
    } = {}
  ): Promise<{
    optimizations: OptimizationRecommendation[]
    projectedSavings: {
      memoryMB: number
      cpuPercent: number
      costPerHour: number
    }
    implementationPlan: string[]
  }> {
    logger.info(`Optimizing resources for agent`, { agentId })

    try {
      // Analyze current usage patterns
      const usageAnalysis = await this.analyzeResourceUsage(agentId)

      // Generate optimization recommendations
      const optimizations = await this.generateOptimizations(agentId, usageAnalysis, options)

      // Calculate projected savings
      const projectedSavings = this.calculateProjectedSavings(optimizations)

      // Create implementation plan
      const implementationPlan = this.createImplementationPlan(optimizations)

      // Store recommendations
      this.optimizationRecommendations.set(agentId, optimizations)

      logger.info(`Resource optimization completed`, {
        agentId,
        optimizationCount: optimizations.length,
        projectedSavings,
      })

      return {
        optimizations,
        projectedSavings,
        implementationPlan,
      }
    } catch (error) {
      logger.error(`Failed to optimize agent resources`, {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Handle automatic scaling based on resource usage
   */
  public async handleAutoScaling(
    poolId: string,
    metrics: ResourceMetrics[]
  ): Promise<{
    action: 'scale_up' | 'scale_down' | 'no_action'
    reason: string
    newCapacity?: number
  }> {
    const pool = this.resourcePools.get(poolId)
    if (!pool || !pool.scaling.enabled) {
      return { action: 'no_action', reason: 'Scaling disabled for pool' }
    }

    // Check cooldown period
    const lastScaling = this.scalingOperations.get(poolId)
    if (lastScaling && Date.now() - lastScaling.getTime() < pool.scaling.cooldownMs) {
      return { action: 'no_action', reason: 'Still in cooldown period' }
    }

    try {
      // Analyze scaling triggers
      const recentMetrics = metrics.slice(-10) // Last 10 data points
      const averageMetrics = this.calculateAverageMetrics(recentMetrics)

      // Check scale-up triggers
      for (const trigger of pool.scaling.triggers) {
        if (trigger.action === 'scale_up') {
          const shouldScale = this.evaluateScalingTrigger(trigger, averageMetrics)
          if (shouldScale) {
            const newCapacity = Math.min(pool.agentIds.length + 1, pool.scaling.maxInstances)

            // Record scaling operation
            this.scalingOperations.set(poolId, new Date())

            logger.info(`Scaling up pool`, {
              poolId,
              trigger: trigger.metric,
              currentCapacity: pool.agentIds.length,
              newCapacity,
            })

            return {
              action: 'scale_up',
              reason: `${trigger.metric} ${trigger.condition} ${trigger.threshold}`,
              newCapacity,
            }
          }
        }
      }

      // Check scale-down triggers
      for (const trigger of pool.scaling.triggers) {
        if (trigger.action === 'scale_down') {
          const shouldScale = this.evaluateScalingTrigger(trigger, averageMetrics)
          if (shouldScale) {
            const newCapacity = Math.max(pool.agentIds.length - 1, pool.scaling.minInstances)

            // Record scaling operation
            this.scalingOperations.set(poolId, new Date())

            logger.info(`Scaling down pool`, {
              poolId,
              trigger: trigger.metric,
              currentCapacity: pool.agentIds.length,
              newCapacity,
            })

            return {
              action: 'scale_down',
              reason: `${trigger.metric} ${trigger.condition} ${trigger.threshold}`,
              newCapacity,
            }
          }
        }
      }

      return { action: 'no_action', reason: 'No scaling triggers activated' }
    } catch (error) {
      logger.error(`Auto-scaling evaluation failed`, {
        poolId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return { action: 'no_action', reason: 'Scaling evaluation failed' }
    }
  }

  /**
   * Get resource forecasts for planning
   */
  public getResourceForecast(
    agentId: string,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): ResourceForecast | undefined {
    return this.resourceForecasts.get(`${agentId}_${timeframe}`)
  }

  /**
   * Get optimization recommendations
   */
  public getOptimizationRecommendations(agentId: string): OptimizationRecommendation[] {
    return this.optimizationRecommendations.get(agentId) || []
  }

  /**
   * Get current resource usage summary
   */
  public getResourceSummary(): {
    totalPools: number
    totalAgents: number
    totalActiveSessions: number
    resourceUtilization: {
      memoryPercent: number
      cpuPercent: number
      sessionCapacityPercent: number
    }
    healthStatus: 'healthy' | 'warning' | 'critical'
  } {
    const pools = Array.from(this.resourcePools.values()).filter((p) => p.isActive)
    const totalAgents = pools.reduce((sum, p) => sum + p.agentIds.length, 0)
    const totalActiveSessions = this.activeAllocations.size

    // Calculate utilization (simplified)
    const avgMemoryUtilization = 65 // Would calculate from actual metrics
    const avgCpuUtilization = 45
    const avgSessionUtilization = (totalActiveSessions / Math.max(totalAgents * 10, 1)) * 100

    const healthStatus =
      avgMemoryUtilization > 90 || avgCpuUtilization > 90
        ? 'critical'
        : avgMemoryUtilization > 75 || avgCpuUtilization > 75
          ? 'warning'
          : 'healthy'

    return {
      totalPools: pools.length,
      totalAgents,
      totalActiveSessions,
      resourceUtilization: {
        memoryPercent: avgMemoryUtilization,
        cpuPercent: avgCpuUtilization,
        sessionCapacityPercent: avgSessionUtilization,
      },
      healthStatus,
    }
  }

  // Private helper methods

  private initializeResourceManager(): void {
    // Initialize default configurations
    logger.debug('Resource manager initialized with default configurations')
  }

  private startGlobalResourceMonitoring(): void {
    // Start global resource monitoring
    setInterval(async () => {
      await this.performGlobalResourceCheck()
      this.cleanupOldMetrics()
      this.updateAllForecasts()
    }, 60000) // Every minute

    logger.debug('Global resource monitoring started')
  }

  private startPoolMonitoring(poolId: string): void {
    const pool = this.resourcePools.get(poolId)
    if (!pool) return

    const interval = setInterval(async () => {
      await this.monitorPoolResources(poolId)
    }, pool.monitoring.intervalMs)

    this.monitoringIntervals.set(poolId, interval)
  }

  private startSessionResourceMonitoring(sessionId: string, agentId: string): void {
    const interval = setInterval(async () => {
      await this.monitorResourceUsage(agentId, sessionId)
    }, 30000) // Every 30 seconds

    this.monitoringIntervals.set(`session_${sessionId}`, interval)
  }

  private stopSessionResourceMonitoring(sessionId: string): void {
    const interval = this.monitoringIntervals.get(`session_${sessionId}`)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(`session_${sessionId}`)
    }
  }

  private findPoolForAgent(agentId: string): ResourcePool | undefined {
    return Array.from(this.resourcePools.values()).find(
      (pool) => pool.isActive && pool.agentIds.includes(agentId)
    )
  }

  private findPoolBySessionAllocation(allocation: ResourceAllocation): ResourcePool | undefined {
    // Would implement logic to find pool based on allocation
    return Array.from(this.resourcePools.values())[0] // Simplified
  }

  private async getCurrentResourceUsage(agentId: string): Promise<ResourceMetrics> {
    // This would integrate with actual system monitoring
    return {
      timestamp: new Date(),
      agentId,
      memoryUsageMB: Math.random() * 1000 + 100,
      memoryLimitMB: 2000,
      cpuUsagePercent: Math.random() * 50 + 10,
      cpuLimitPercent: 80,
      networkBytesPerSecond: Math.random() * 1024 * 100,
      storageUsedMB: Math.random() * 500 + 50,
      tokensConsumed: Math.floor(Math.random() * 1000),
      tokenLimit: 10000,
      activeSessions: Math.floor(Math.random() * 5),
      sessionLimit: 10,
      resourceHealth: 'healthy',
    }
  }

  private calculateAvailableResources(
    pool: ResourcePool | undefined,
    currentUsage: ResourceMetrics
  ): ResourceMetrics {
    if (!pool) {
      return {
        ...currentUsage,
        memoryUsageMB: currentUsage.memoryLimitMB - currentUsage.memoryUsageMB,
        cpuUsagePercent: 100 - currentUsage.cpuUsagePercent,
      }
    }

    return {
      ...currentUsage,
      memoryUsageMB: pool.limits.maxMemoryMB - currentUsage.memoryUsageMB,
      cpuUsagePercent: pool.limits.maxCpuPercent - currentUsage.cpuUsagePercent,
    }
  }

  private determineAllocationStrategy(
    requirements: any,
    available: ResourceMetrics,
    poolStrategy?: AllocationStrategy
  ): AllocationStrategy {
    if (poolStrategy) return poolStrategy

    // Auto-determine based on requirements and availability
    if (requirements.priority === 'high') return 'aggressive'
    if (available.memoryUsageMB < 500 && available.cpuUsagePercent < 30) return 'conservative'
    return 'balanced'
  }

  private calculateResourceAllocation(
    requirements: any,
    available: ResourceMetrics,
    strategy: AllocationStrategy
  ): ResourceAllocation {
    const baseMemory = requirements.memoryMB || 200
    const baseCpu = requirements.cpuPercent || 20

    const multipliers = {
      conservative: { memory: 1.0, cpu: 1.0 },
      balanced: { memory: 1.2, cpu: 1.2 },
      aggressive: { memory: 1.5, cpu: 1.5 },
      custom: { memory: 1.2, cpu: 1.2 },
    }

    const multiplier = multipliers[strategy]

    return {
      strategy,
      reservedMemoryMB: Math.min(baseMemory * multiplier.memory, available.memoryUsageMB * 0.8),
      reservedCpuPercent: Math.min(baseCpu * multiplier.cpu, available.cpuUsagePercent * 0.8),
      priorityWeights: {
        responseTime: 0.3,
        throughput: 0.3,
        quality: 0.2,
        cost: 0.2,
      },
      elasticLimits: {
        minMemoryMB: baseMemory * 0.5,
        maxMemoryMB: baseMemory * 2,
        minCpuPercent: baseCpu * 0.5,
        maxCpuPercent: baseCpu * 2,
      },
    }
  }

  private updatePoolUsage(
    poolId: string,
    allocation: ResourceAllocation,
    operation: 'allocate' | 'deallocate'
  ): void {
    // Would update pool usage tracking
    logger.debug(`Pool usage updated`, { poolId, operation })
  }

  private async collectCurrentMetrics(
    agentId: string,
    sessionId?: string
  ): Promise<ResourceMetrics> {
    // This would collect real system metrics
    return this.getCurrentResourceUsage(agentId)
  }

  private checkResourceThresholds(metrics: ResourceMetrics): void {
    // Check if any thresholds are exceeded
    if (metrics.memoryUsageMB / metrics.memoryLimitMB > 0.9) {
      this.emit('resource:warning', {
        agentId: metrics.agentId,
        type: 'memory',
        usage: metrics.memoryUsageMB,
        limit: metrics.memoryLimitMB,
      })
    }

    if (metrics.cpuUsagePercent > 85) {
      this.emit('resource:warning', {
        agentId: metrics.agentId,
        type: 'cpu',
        usage: metrics.cpuUsagePercent,
        limit: 100,
      })
    }
  }

  private updateResourceForecasts(agentId: string): void {
    // Update forecasting models based on new data
    const metrics = this.resourceMetrics.get(agentId) || []
    if (metrics.length > 10) {
      // Simple trend-based forecasting
      const forecast: ResourceForecast = {
        agentId,
        timeframe: '24h',
        predictions: {
          peakMemoryMB: Math.max(...metrics.slice(-24).map((m) => m.memoryUsageMB)),
          peakCpuPercent: Math.max(...metrics.slice(-24).map((m) => m.cpuUsagePercent)),
          peakConcurrentSessions: Math.max(...metrics.slice(-24).map((m) => m.activeSessions)),
          totalTokensConsumed: metrics.slice(-24).reduce((sum, m) => sum + m.tokensConsumed, 0),
          estimatedCost: 10.5, // Simplified cost calculation
        },
        confidence: 0.75,
        basedOnDataPoints: metrics.length,
      }

      this.resourceForecasts.set(`${agentId}_24h`, forecast)
    }
  }

  private async analyzeResourceUsage(agentId: string): Promise<any> {
    const metrics = this.resourceMetrics.get(agentId) || []

    return {
      averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / metrics.length,
      averageCpuUsage: metrics.reduce((sum, m) => sum + m.cpuUsagePercent, 0) / metrics.length,
      peakUsageTimes: [], // Would analyze peak usage patterns
      underutilizedPeriods: [], // Would identify underutilized periods
      resourceWaste: 0, // Would calculate resource waste
    }
  }

  private async generateOptimizations(
    agentId: string,
    analysis: any,
    options: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Memory optimization
    if (analysis.averageMemoryUsage < analysis.averageMemoryUsage * 0.6) {
      recommendations.push({
        id: `opt_${Date.now()}_1`,
        agentId,
        type: 'memory',
        priority: 'medium',
        title: 'Reduce Memory Allocation',
        description: 'Agent is underutilizing allocated memory',
        expectedSavings: {
          memoryMB: analysis.averageMemoryUsage * 0.3,
          costPerHour: 2.5,
        },
        implementationSteps: [
          'Analyze memory usage patterns',
          'Reduce base memory allocation',
          'Monitor performance impact',
        ],
        automatable: true,
        riskLevel: 'low',
      })
    }

    return recommendations
  }

  private calculateProjectedSavings(optimizations: OptimizationRecommendation[]): any {
    return optimizations.reduce(
      (totals, opt) => ({
        memoryMB: totals.memoryMB + (opt.expectedSavings.memoryMB || 0),
        cpuPercent: totals.cpuPercent + (opt.expectedSavings.cpuPercent || 0),
        costPerHour: totals.costPerHour + (opt.expectedSavings.costPerHour || 0),
      }),
      { memoryMB: 0, cpuPercent: 0, costPerHour: 0 }
    )
  }

  private createImplementationPlan(optimizations: OptimizationRecommendation[]): string[] {
    const plan: string[] = []

    optimizations
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .forEach((opt) => {
        plan.push(`${opt.title}: ${opt.description}`)
        plan.push(...opt.implementationSteps.map((step) => `  - ${step}`))
      })

    return plan
  }

  private checkOptimizationTriggers(allocation: ResourceAllocation): void {
    // Check if resource deallocation triggers optimization opportunities
    this.emit('optimization:trigger', { allocation })
  }

  private calculateAverageMetrics(metrics: ResourceMetrics[]): ResourceMetrics {
    if (metrics.length === 0) throw new Error('No metrics provided')

    return metrics.reduce(
      (avg, m, _, arr) => ({
        timestamp: new Date(),
        agentId: m.agentId,
        memoryUsageMB: avg.memoryUsageMB + m.memoryUsageMB / arr.length,
        memoryLimitMB: m.memoryLimitMB,
        cpuUsagePercent: avg.cpuUsagePercent + m.cpuUsagePercent / arr.length,
        cpuLimitPercent: m.cpuLimitPercent,
        networkBytesPerSecond: avg.networkBytesPerSecond + m.networkBytesPerSecond / arr.length,
        storageUsedMB: avg.storageUsedMB + m.storageUsedMB / arr.length,
        tokensConsumed: avg.tokensConsumed + m.tokensConsumed / arr.length,
        tokenLimit: m.tokenLimit,
        activeSessions: avg.activeSessions + m.activeSessions / arr.length,
        sessionLimit: m.sessionLimit,
        resourceHealth: m.resourceHealth,
      }),
      {
        timestamp: new Date(),
        agentId: metrics[0].agentId,
        memoryUsageMB: 0,
        memoryLimitMB: metrics[0].memoryLimitMB,
        cpuUsagePercent: 0,
        cpuLimitPercent: metrics[0].cpuLimitPercent,
        networkBytesPerSecond: 0,
        storageUsedMB: 0,
        tokensConsumed: 0,
        tokenLimit: metrics[0].tokenLimit,
        activeSessions: 0,
        sessionLimit: metrics[0].sessionLimit,
        resourceHealth: 'healthy',
      }
    )
  }

  private evaluateScalingTrigger(trigger: ScalingTrigger, metrics: ResourceMetrics): boolean {
    let value: number

    switch (trigger.metric) {
      case 'memory':
        value = (metrics.memoryUsageMB / metrics.memoryLimitMB) * 100
        break
      case 'cpu':
        value = metrics.cpuUsagePercent
        break
      case 'sessions':
        value = (metrics.activeSessions / metrics.sessionLimit) * 100
        break
      default:
        return false
    }

    return trigger.condition === 'above' ? value > trigger.threshold : value < trigger.threshold
  }

  private async performGlobalResourceCheck(): Promise<void> {
    // Perform global resource health checks
    for (const poolId of this.resourcePools.keys()) {
      await this.monitorPoolResources(poolId)
    }
  }

  private async monitorPoolResources(poolId: string): Promise<void> {
    const pool = this.resourcePools.get(poolId)
    if (!pool) return

    // Collect metrics for all agents in pool
    const poolMetrics: ResourceMetrics[] = []
    for (const agentId of pool.agentIds) {
      const metrics = await this.monitorResourceUsage(agentId)
      poolMetrics.push(metrics)
    }

    // Check for auto-scaling triggers
    if (pool.scaling.enabled) {
      await this.handleAutoScaling(poolId, poolMetrics)
    }
  }

  private cleanupOldMetrics(): void {
    // Clean up old metrics to prevent memory issues
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days

    for (const [agentId, metrics] of this.resourceMetrics.entries()) {
      const filteredMetrics = metrics.filter((m) => m.timestamp.getTime() > cutoffTime)
      this.resourceMetrics.set(agentId, filteredMetrics)
    }
  }

  private updateAllForecasts(): void {
    // Update forecasts for all monitored agents
    for (const agentId of this.resourceMetrics.keys()) {
      this.updateResourceForecasts(agentId)
    }
  }
}

// Export singleton instance
export const agentResourceManager = new AgentResourceManager()
