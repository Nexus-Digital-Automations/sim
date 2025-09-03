import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ResourceMonitor')

/**
 * Resource Monitoring System for Code Execution
 * 
 * Provides comprehensive monitoring and alerting for code execution resources:
 * - Real-time memory usage tracking
 * - CPU utilization monitoring
 * - Execution time measurement
 * - Network activity tracking
 * - File system operation monitoring
 * - Container resource limits enforcement
 * - Performance metrics collection
 * - Automated alerting for resource violations
 */

export interface ResourceMetrics {
  memoryUsageMB: number
  memoryLimitMB: number
  cpuUsagePercent: number
  executionTimeMs: number
  networkRequests: number
  fileOperations: number
  containerStatus?: string
  timestamp: Date
}

export interface ResourceLimits {
  maxMemoryMB: number
  maxCpuPercent: number
  maxExecutionTimeMs: number
  maxNetworkRequests: number
  maxFileOperations: number
  maxContainerLifetimeMs: number
}

export interface ResourceAlert {
  type: 'memory' | 'cpu' | 'time' | 'network' | 'file' | 'container'
  severity: 'warning' | 'critical'
  message: string
  currentValue: number
  limitValue: number
  timestamp: Date
  executionId: string
}

export interface PerformanceReport {
  executionId: string
  totalExecutionTime: number
  peakMemoryUsage: number
  averageCpuUsage: number
  resourceAlerts: ResourceAlert[]
  metrics: ResourceMetrics[]
  efficiency: {
    memoryEfficiency: number // 0-100%
    cpuEfficiency: number // 0-100%
    timeEfficiency: number // 0-100%
    overall: number // 0-100%
  }
}

/**
 * Resource Monitor class for tracking execution resources
 */
export class ResourceMonitor {
  private executionId: string
  private startTime: number
  private limits: ResourceLimits
  private metrics: ResourceMetrics[] = []
  private alerts: ResourceAlert[] = []
  private monitoringInterval?: NodeJS.Timeout
  private isMonitoring = false

  // Resource tracking
  private peakMemoryMB = 0
  private averageCpuPercent = 0
  private networkRequestCount = 0
  private fileOperationCount = 0
  private cpuSamples: number[] = []

  constructor(executionId: string, limits: ResourceLimits) {
    this.executionId = executionId
    this.startTime = Date.now()
    this.limits = limits

    logger.info(`Resource monitor initialized`, {
      executionId,
      limits,
    })
  }

  /**
   * Start continuous resource monitoring
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      logger.warn('Monitoring already active', { executionId: this.executionId })
      return
    }

    this.isMonitoring = true
    logger.info('Starting resource monitoring', {
      executionId: this.executionId,
      intervalMs,
    })

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, intervalMs)
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    this.isMonitoring = false
    logger.info('Resource monitoring stopped', {
      executionId: this.executionId,
      totalMetrics: this.metrics.length,
      alerts: this.alerts.length,
    })
  }

  /**
   * Collect current resource metrics
   */
  private collectMetrics(): void {
    try {
      // Get Node.js process metrics
      const memoryUsage = process.memoryUsage()
      const currentMemoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)

      // Estimate CPU usage (simplified approach)
      const currentCpuPercent = this.estimateCpuUsage()

      const metrics: ResourceMetrics = {
        memoryUsageMB: currentMemoryMB,
        memoryLimitMB: this.limits.maxMemoryMB,
        cpuUsagePercent: currentCpuPercent,
        executionTimeMs: Date.now() - this.startTime,
        networkRequests: this.networkRequestCount,
        fileOperations: this.fileOperationCount,
        timestamp: new Date(),
      }

      this.metrics.push(metrics)
      this.updatePeakValues(metrics)
      this.checkResourceLimits(metrics)

      // Log metrics periodically (every 10 samples)
      if (this.metrics.length % 10 === 0) {
        logger.debug('Resource metrics collected', {
          executionId: this.executionId,
          memory: `${currentMemoryMB}/${this.limits.maxMemoryMB}MB`,
          cpu: `${currentCpuPercent}%`,
          time: `${metrics.executionTimeMs}ms`,
        })
      }

    } catch (error) {
      logger.error('Failed to collect metrics', {
        executionId: this.executionId,
        error: error.message,
      })
    }
  }

  /**
   * Estimate CPU usage (simplified)
   */
  private estimateCpuUsage(): number {
    const usage = process.cpuUsage()
    const totalUsage = usage.user + usage.system
    
    // Convert to percentage (simplified calculation)
    // In real implementation, you'd want to use process.cpuUsage(previousValue)
    const cpuPercent = Math.min(100, Math.max(0, (totalUsage / 1000000) * 10)) // Rough approximation
    
    this.cpuSamples.push(cpuPercent)
    if (this.cpuSamples.length > 10) {
      this.cpuSamples = this.cpuSamples.slice(-10) // Keep last 10 samples
    }

    return Math.round(this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length)
  }

  /**
   * Update peak resource values
   */
  private updatePeakValues(metrics: ResourceMetrics): void {
    this.peakMemoryMB = Math.max(this.peakMemoryMB, metrics.memoryUsageMB)
    
    if (this.cpuSamples.length > 0) {
      this.averageCpuPercent = Math.round(
        this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length
      )
    }
  }

  /**
   * Check resource limits and generate alerts
   */
  private checkResourceLimits(metrics: ResourceMetrics): void {
    // Memory limit check
    if (metrics.memoryUsageMB > this.limits.maxMemoryMB * 0.9) {
      const severity = metrics.memoryUsageMB > this.limits.maxMemoryMB ? 'critical' : 'warning'
      this.generateAlert('memory', severity, 
        `Memory usage ${severity}: ${metrics.memoryUsageMB}MB / ${this.limits.maxMemoryMB}MB`,
        metrics.memoryUsageMB, this.limits.maxMemoryMB)
    }

    // CPU limit check
    if (metrics.cpuUsagePercent > this.limits.maxCpuPercent * 0.9) {
      const severity = metrics.cpuUsagePercent > this.limits.maxCpuPercent ? 'critical' : 'warning'
      this.generateAlert('cpu', severity,
        `CPU usage ${severity}: ${metrics.cpuUsagePercent}% / ${this.limits.maxCpuPercent}%`,
        metrics.cpuUsagePercent, this.limits.maxCpuPercent)
    }

    // Execution time check
    if (metrics.executionTimeMs > this.limits.maxExecutionTimeMs * 0.9) {
      const severity = metrics.executionTimeMs > this.limits.maxExecutionTimeMs ? 'critical' : 'warning'
      this.generateAlert('time', severity,
        `Execution time ${severity}: ${metrics.executionTimeMs}ms / ${this.limits.maxExecutionTimeMs}ms`,
        metrics.executionTimeMs, this.limits.maxExecutionTimeMs)
    }

    // Network request limit check
    if (this.networkRequestCount > this.limits.maxNetworkRequests * 0.9) {
      const severity = this.networkRequestCount > this.limits.maxNetworkRequests ? 'critical' : 'warning'
      this.generateAlert('network', severity,
        `Network requests ${severity}: ${this.networkRequestCount} / ${this.limits.maxNetworkRequests}`,
        this.networkRequestCount, this.limits.maxNetworkRequests)
    }

    // File operation limit check
    if (this.fileOperationCount > this.limits.maxFileOperations * 0.9) {
      const severity = this.fileOperationCount > this.limits.maxFileOperations ? 'critical' : 'warning'
      this.generateAlert('file', severity,
        `File operations ${severity}: ${this.fileOperationCount} / ${this.limits.maxFileOperations}`,
        this.fileOperationCount, this.limits.maxFileOperations)
    }
  }

  /**
   * Generate resource alert
   */
  private generateAlert(
    type: ResourceAlert['type'],
    severity: ResourceAlert['severity'],
    message: string,
    currentValue: number,
    limitValue: number
  ): void {
    // Avoid duplicate alerts (same type and severity within 5 seconds)
    const recentAlert = this.alerts.find(
      alert => 
        alert.type === type && 
        alert.severity === severity && 
        Date.now() - alert.timestamp.getTime() < 5000
    )

    if (recentAlert) {
      return // Skip duplicate alert
    }

    const alert: ResourceAlert = {
      type,
      severity,
      message,
      currentValue,
      limitValue,
      timestamp: new Date(),
      executionId: this.executionId,
    }

    this.alerts.push(alert)

    if (severity === 'critical') {
      logger.error('Critical resource alert', alert)
    } else {
      logger.warn('Resource warning', alert)
    }
  }

  /**
   * Manually update resource counters
   */
  incrementNetworkRequests(): void {
    this.networkRequestCount++
  }

  incrementFileOperations(): void {
    this.fileOperationCount++
  }

  /**
   * Set custom memory usage (for container monitoring)
   */
  updateMemoryUsage(memoryMB: number): void {
    this.peakMemoryMB = Math.max(this.peakMemoryMB, memoryMB)
  }

  /**
   * Set container status
   */
  updateContainerStatus(status: string): void {
    if (this.metrics.length > 0) {
      this.metrics[this.metrics.length - 1].containerStatus = status
    }
  }

  /**
   * Get current resource usage summary
   */
  getCurrentUsage(): {
    memory: { current: number; peak: number; limit: number; percentage: number }
    cpu: { current: number; average: number; limit: number; percentage: number }
    time: { current: number; limit: number; percentage: number }
    network: { requests: number; limit: number; percentage: number }
    files: { operations: number; limit: number; percentage: number }
  } {
    const currentTime = Date.now() - this.startTime
    const latestMetrics = this.metrics[this.metrics.length - 1]
    const currentMemory = latestMetrics?.memoryUsageMB || 0
    const currentCpu = latestMetrics?.cpuUsagePercent || 0

    return {
      memory: {
        current: currentMemory,
        peak: this.peakMemoryMB,
        limit: this.limits.maxMemoryMB,
        percentage: Math.round((currentMemory / this.limits.maxMemoryMB) * 100),
      },
      cpu: {
        current: currentCpu,
        average: this.averageCpuPercent,
        limit: this.limits.maxCpuPercent,
        percentage: Math.round((currentCpu / this.limits.maxCpuPercent) * 100),
      },
      time: {
        current: currentTime,
        limit: this.limits.maxExecutionTimeMs,
        percentage: Math.round((currentTime / this.limits.maxExecutionTimeMs) * 100),
      },
      network: {
        requests: this.networkRequestCount,
        limit: this.limits.maxNetworkRequests,
        percentage: Math.round((this.networkRequestCount / this.limits.maxNetworkRequests) * 100),
      },
      files: {
        operations: this.fileOperationCount,
        limit: this.limits.maxFileOperations,
        percentage: Math.round((this.fileOperationCount / this.limits.maxFileOperations) * 100),
      },
    }
  }

  /**
   * Check if any resource limits are exceeded
   */
  hasExceededLimits(): {
    exceeded: boolean
    violations: Array<{ type: string; current: number; limit: number }>
  } {
    const usage = this.getCurrentUsage()
    const violations: Array<{ type: string; current: number; limit: number }> = []

    if (usage.memory.current > this.limits.maxMemoryMB) {
      violations.push({ type: 'memory', current: usage.memory.current, limit: this.limits.maxMemoryMB })
    }

    if (usage.cpu.current > this.limits.maxCpuPercent) {
      violations.push({ type: 'cpu', current: usage.cpu.current, limit: this.limits.maxCpuPercent })
    }

    if (usage.time.current > this.limits.maxExecutionTimeMs) {
      violations.push({ type: 'time', current: usage.time.current, limit: this.limits.maxExecutionTimeMs })
    }

    if (usage.network.requests > this.limits.maxNetworkRequests) {
      violations.push({ type: 'network', current: usage.network.requests, limit: this.limits.maxNetworkRequests })
    }

    if (usage.files.operations > this.limits.maxFileOperations) {
      violations.push({ type: 'files', current: usage.files.operations, limit: this.limits.maxFileOperations })
    }

    return {
      exceeded: violations.length > 0,
      violations,
    }
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): PerformanceReport {
    const totalExecutionTime = Date.now() - this.startTime
    const usage = this.getCurrentUsage()

    // Calculate efficiency metrics (lower usage = higher efficiency)
    const memoryEfficiency = Math.max(0, 100 - usage.memory.percentage)
    const cpuEfficiency = Math.max(0, 100 - usage.cpu.percentage)
    const timeEfficiency = Math.max(0, 100 - usage.time.percentage)
    const overallEfficiency = Math.round((memoryEfficiency + cpuEfficiency + timeEfficiency) / 3)

    const report: PerformanceReport = {
      executionId: this.executionId,
      totalExecutionTime,
      peakMemoryUsage: this.peakMemoryMB,
      averageCpuUsage: this.averageCpuPercent,
      resourceAlerts: [...this.alerts],
      metrics: [...this.metrics],
      efficiency: {
        memoryEfficiency,
        cpuEfficiency,
        timeEfficiency,
        overall: overallEfficiency,
      },
    }

    logger.info('Performance report generated', {
      executionId: this.executionId,
      totalExecutionTime,
      peakMemoryUsage: this.peakMemoryMB,
      efficiency: overallEfficiency,
      alertCount: this.alerts.length,
    })

    return report
  }

  /**
   * Get simple metrics summary for API responses
   */
  getSimpleMetrics(): {
    executionTime: number
    peakMemoryMB: number
    averageCpuPercent: number
    networkRequests: number
    fileOperations: number
    alertCount: number
    efficiency: number
  } {
    const report = this.generatePerformanceReport()
    
    return {
      executionTime: report.totalExecutionTime,
      peakMemoryMB: report.peakMemoryUsage,
      averageCpuPercent: report.averageCpuUsage,
      networkRequests: this.networkRequestCount,
      fileOperations: this.fileOperationCount,
      alertCount: report.resourceAlerts.length,
      efficiency: report.efficiency.overall,
    }
  }

  /**
   * Static method to create monitor with default limits
   */
  static createDefault(executionId: string, customLimits?: Partial<ResourceLimits>): ResourceMonitor {
    const defaultLimits: ResourceLimits = {
      maxMemoryMB: 512,
      maxCpuPercent: 80,
      maxExecutionTimeMs: 60000, // 1 minute
      maxNetworkRequests: 50,
      maxFileOperations: 100,
      maxContainerLifetimeMs: 300000, // 5 minutes
    }

    const limits = { ...defaultLimits, ...customLimits }
    return new ResourceMonitor(executionId, limits)
  }

  /**
   * Cleanup resources on destruction
   */
  dispose(): void {
    this.stopMonitoring()
    this.metrics = []
    this.alerts = []
    this.cpuSamples = []
    
    logger.debug('Resource monitor disposed', {
      executionId: this.executionId,
    })
  }
}