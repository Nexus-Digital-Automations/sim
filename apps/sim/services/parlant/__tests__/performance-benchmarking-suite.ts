/**
 * Performance Benchmarking Suite for Universal Tool Adapter System
 * ===============================================================
 *
 * Advanced performance testing and monitoring system for validating
 * tool adapter performance under realistic production loads and scenarios.
 *
 * Features:
 * - Multi-dimensional performance testing (latency, throughput, concurrency)
 * - Memory usage and resource consumption monitoring
 * - Performance regression detection
 * - Realistic load simulation
 * - Performance analytics and reporting
 */

import { PerformanceObserver, performance } from 'perf_hooks'
import type { ParlantTool, ToolExecutionContext } from '../tools/adapter-framework'
import { globalAdapterRegistry } from '../tools/adapter-registry'
import { COMPREHENSIVE_TEST_CONFIG, IMPLEMENTED_ADAPTERS } from './comprehensive-tool-adapter-tests'

// =====================================================
// PERFORMANCE TEST CONFIGURATION
// =====================================================

const PERFORMANCE_CONFIG = {
  // Load test scenarios
  LOAD_SCENARIOS: {
    LIGHT: { concurrency: 5, iterations: 50, duration: 30000 }, // 30 seconds
    MODERATE: { concurrency: 10, iterations: 100, duration: 60000 }, // 1 minute
    HEAVY: { concurrency: 20, iterations: 200, duration: 120000 }, // 2 minutes
    BURST: { concurrency: 50, iterations: 100, duration: 30000 }, // High burst
  },

  // Performance thresholds
  THRESHOLDS: {
    MAX_LATENCY_MS: 10000, // 10 seconds max per operation
    MAX_P95_LATENCY_MS: 5000, // 95th percentile under 5 seconds
    MIN_SUCCESS_RATE: 0.95, // 95% success rate minimum
    MAX_MEMORY_USAGE_MB: 512, // 512MB max memory usage
    MIN_THROUGHPUT_OPS_SEC: 1.0, // At least 1 operation per second
  },

  // Monitoring intervals
  MONITORING: {
    MEMORY_CHECK_INTERVAL_MS: 1000, // Check memory every second
    GC_MONITORING: true, // Monitor garbage collection
    CPU_PROFILING: false, // Disable CPU profiling by default (heavy)
  },
}

// =====================================================
// PERFORMANCE METRICS COLLECTION
// =====================================================

interface PerformanceMetrics {
  operationName: string
  adapterId: string
  startTime: number
  endTime: number
  duration: number
  success: boolean
  error?: string
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  cpuTime?: number
}

interface PerformanceSummary {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  successRate: number
  averageLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  minLatency: number
  maxLatency: number
  throughputOpsPerSec: number
  memoryStats: {
    avgHeapUsed: number
    maxHeapUsed: number
    avgHeapTotal: number
    maxHeapTotal: number
    peakRSS: number
  }
  errors: Map<string, number>
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private memorySnapshots: Array<{ timestamp: number; memory: NodeJS.MemoryUsage }> = []
  private gcObserver?: PerformanceObserver
  private memoryMonitorInterval?: NodeJS.Timer

  constructor() {
    this.setupPerformanceObservers()
  }

  private setupPerformanceObservers(): void {
    if (PERFORMANCE_CONFIG.MONITORING.GC_MONITORING) {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.Name === 'gc') {
            console.log(`🗑️  GC: ${entry.Name} took ${entry.duration.toFixed(2)}ms`)
          }
        })
      })
      this.gcObserver.observe({ entryTypes: ['gc'] })
    }
  }

  startMonitoring(): void {
    if (PERFORMANCE_CONFIG.MONITORING.MEMORY_CHECK_INTERVAL_MS > 0) {
      this.memoryMonitorInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage()
        this.memorySnapshots.push({
          timestamp: Date.now(),
          memory: memoryUsage,
        })

        // Keep only last 1000 snapshots to prevent memory leak
        if (this.memorySnapshots.length > 1000) {
          this.memorySnapshots.shift()
        }
      }, PERFORMANCE_CONFIG.MONITORING.MEMORY_CHECK_INTERVAL_MS)
    }
  }

  stopMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval)
    }
    if (this.gcObserver) {
      this.gcObserver.disconnect()
    }
  }

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric)
  }

  calculateSummary(adapterId?: string): PerformanceSummary {
    const relevantMetrics = adapterId
      ? this.metrics.filter((m) => m.adapterId === adapterId)
      : this.metrics

    if (relevantMetrics.length === 0) {
      return this.getEmptySummary()
    }

    const successful = relevantMetrics.filter((m) => m.success)
    const durations = relevantMetrics.map((m) => m.duration).sort((a, b) => a - b)

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0)
    const startTime = Math.min(...relevantMetrics.map((m) => m.startTime))
    const endTime = Math.max(...relevantMetrics.map((m) => m.endTime))
    const testDuration = (endTime - startTime) / 1000 // seconds

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5)
    const p95Index = Math.floor(durations.length * 0.95)
    const p99Index = Math.floor(durations.length * 0.99)

    // Calculate memory statistics
    const memoryStats = this.calculateMemoryStats(relevantMetrics)

    // Count errors
    const errors = new Map<string, number>()
    relevantMetrics
      .filter((m) => !m.success && m.error)
      .forEach((m) => {
        const error = m.error!
        errors.set(error, (errors.get(error) || 0) + 1)
      })

    return {
      totalOperations: relevantMetrics.length,
      successfulOperations: successful.length,
      failedOperations: relevantMetrics.length - successful.length,
      successRate: successful.length / relevantMetrics.length,
      averageLatency: totalDuration / relevantMetrics.length,
      p50Latency: durations[p50Index] || 0,
      p95Latency: durations[p95Index] || 0,
      p99Latency: durations[p99Index] || 0,
      minLatency: Math.min(...durations),
      maxLatency: Math.max(...durations),
      throughputOpsPerSec: testDuration > 0 ? relevantMetrics.length / testDuration : 0,
      memoryStats,
      errors,
    }
  }

  private calculateMemoryStats(metrics: PerformanceMetrics[]): PerformanceSummary['memoryStats'] {
    if (metrics.length === 0) {
      return {
        avgHeapUsed: 0,
        maxHeapUsed: 0,
        avgHeapTotal: 0,
        maxHeapTotal: 0,
        peakRSS: 0,
      }
    }

    const heapUsedValues = metrics.map((m) => m.memoryUsage.heapUsed)
    const heapTotalValues = metrics.map((m) => m.memoryUsage.heapTotal)
    const rssValues = metrics.map((m) => m.memoryUsage.rss)

    return {
      avgHeapUsed: heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length,
      maxHeapUsed: Math.max(...heapUsedValues),
      avgHeapTotal: heapTotalValues.reduce((a, b) => a + b, 0) / heapTotalValues.length,
      maxHeapTotal: Math.max(...heapTotalValues),
      peakRSS: Math.max(...rssValues),
    }
  }

  private getEmptySummary(): PerformanceSummary {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      minLatency: 0,
      maxLatency: 0,
      throughputOpsPerSec: 0,
      memoryStats: {
        avgHeapUsed: 0,
        maxHeapUsed: 0,
        avgHeapTotal: 0,
        maxHeapTotal: 0,
        peakRSS: 0,
      },
      errors: new Map(),
    }
  }

  getDetailedMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  getMemorySnapshots(): Array<{ timestamp: number; memory: NodeJS.MemoryUsage }> {
    return [...this.memorySnapshots]
  }

  reset(): void {
    this.metrics = []
    this.memorySnapshots = []
  }
}

// =====================================================
// PERFORMANCE BENCHMARKING SUITE
// =====================================================

export class PerformanceBenchmarkingSuite {
  private monitor = new PerformanceMonitor()
  private registry = globalAdapterRegistry

  async runComprehensiveBenchmarks(): Promise<{
    success: boolean
    overallSummary: PerformanceSummary
    scenarioResults: Map<string, PerformanceSummary>
    adapterResults: Map<string, PerformanceSummary>
    regressionDetected: boolean
    performanceThresholdsMet: boolean
    recommendations: string[]
  }> {
    console.log('🚀 Starting comprehensive performance benchmarks...')

    this.monitor.startMonitoring()
    this.monitor.reset()

    try {
      const scenarioResults = new Map<string, PerformanceSummary>()

      // Run all load scenarios
      for (const [scenarioName, config] of Object.entries(PERFORMANCE_CONFIG.LOAD_SCENARIOS)) {
        console.log(`📊 Running ${scenarioName} load scenario...`)
        console.log(
          `   Concurrency: ${config.concurrency}, Iterations: ${config.iterations}, Duration: ${config.duration}ms`
        )

        const scenarioStartTime = Date.now()
        await this.runLoadScenario(scenarioName, config)
        const scenarioEndTime = Date.now()

        console.log(
          `   ✅ ${scenarioName} completed in ${((scenarioEndTime - scenarioStartTime) / 1000).toFixed(2)}s`
        )

        const summary = this.monitor.calculateSummary()
        scenarioResults.set(scenarioName, summary)

        // Reset metrics between scenarios
        this.monitor.reset()

        // Brief pause between scenarios
        await this.sleep(2000)
      }

      // Calculate adapter-specific results
      const adapterResults = new Map<string, PerformanceSummary>()
      for (const adapterId of IMPLEMENTED_ADAPTERS) {
        const adapterSummary = this.monitor.calculateSummary(adapterId)
        adapterResults.set(adapterId, adapterSummary)
      }

      // Calculate overall summary
      const overallSummary = this.monitor.calculateSummary()

      // Performance analysis
      const performanceThresholdsMet = this.checkPerformanceThresholds(overallSummary)
      const regressionDetected = false // Would need baseline data to detect regressions
      const recommendations = this.generateRecommendations(
        overallSummary,
        scenarioResults,
        adapterResults
      )

      const success =
        performanceThresholdsMet &&
        overallSummary.successRate >= PERFORMANCE_CONFIG.THRESHOLDS.MIN_SUCCESS_RATE

      console.log(`🎯 Performance benchmarks complete: ${success ? 'PASS' : 'FAIL'}`)

      return {
        success,
        overallSummary,
        scenarioResults,
        adapterResults,
        regressionDetected,
        performanceThresholdsMet,
        recommendations,
      }
    } finally {
      this.monitor.stopMonitoring()
    }
  }

  private async runLoadScenario(
    scenarioName: string,
    config: {
      concurrency: number
      iterations: number
      duration: number
    }
  ): Promise<void> {
    const promises: Promise<void>[] = []
    const startTime = Date.now()

    // Create worker promises for concurrent execution
    for (let worker = 0; worker < config.concurrency; worker++) {
      promises.push(this.runWorker(worker, config, startTime))
    }

    // Wait for all workers or timeout
    await Promise.race([
      Promise.all(promises),
      this.sleep(config.duration + 10000), // Add 10s buffer
    ])
  }

  private async runWorker(
    workerId: number,
    config: { concurrency: number; iterations: number; duration: number },
    startTime: number
  ): Promise<void> {
    const iterationsPerWorker = Math.ceil(config.iterations / config.concurrency)

    for (let i = 0; i < iterationsPerWorker; i++) {
      // Check if we've exceeded the duration
      if (Date.now() - startTime > config.duration) {
        break
      }

      // Select adapter round-robin style
      const adapterId = IMPLEMENTED_ADAPTERS[i % IMPLEMENTED_ADAPTERS.length]

      try {
        await this.executeSingleOperation(adapterId, `worker-${workerId}-iter-${i}`)
      } catch (error) {
        console.error(`Worker ${workerId} iteration ${i} failed:`, error)
      }

      // Small delay to prevent overwhelming the system
      if (i < iterationsPerWorker - 1) {
        await this.sleep(Math.random() * 100) // 0-100ms random delay
      }
    }
  }

  private async executeSingleOperation(adapterId: string, operationId: string): Promise<void> {
    const operationStart = performance.now()
    const memoryBefore = process.memoryUsage()

    try {
      const adapter = this.registry.getAdapter(adapterId)
      if (!adapter) {
        throw new Error(`Adapter ${adapterId} not found`)
      }

      const parlantTool = adapter.getParlantTool()
      const testParams = this.generateTestParameters(adapterId, parlantTool)
      const context = this.createTestContext(operationId)

      // Execute through registry for proper metrics and caching
      const result = await this.registry.executeTool(adapterId, testParams, context, {
        useCache: false, // Disable caching for performance testing
        timeout: PERFORMANCE_CONFIG.THRESHOLDS.MAX_LATENCY_MS,
      })

      const operationEnd = performance.now()
      const memoryAfter = process.memoryUsage()

      this.monitor.recordMetric({
        operationName: operationId,
        adapterId,
        startTime: operationStart,
        endTime: operationEnd,
        duration: operationEnd - operationStart,
        success: result.success,
        error: result.error,
        memoryUsage: {
          heapUsed: memoryAfter.heapUsed,
          heapTotal: memoryAfter.heapTotal,
          external: memoryAfter.external,
          rss: memoryAfter.rss,
        },
      })
    } catch (error) {
      const operationEnd = performance.now()
      const memoryAfter = process.memoryUsage()

      this.monitor.recordMetric({
        operationName: operationId,
        adapterId,
        startTime: operationStart,
        endTime: operationEnd,
        duration: operationEnd - operationStart,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        memoryUsage: {
          heapUsed: memoryAfter.heapUsed,
          heapTotal: memoryAfter.heapTotal,
          external: memoryAfter.external,
          rss: memoryAfter.rss,
        },
      })
    }
  }

  private generateTestParameters(adapterId: string, parlantTool: ParlantTool): Record<string, any> {
    const params: Record<string, any> = {}

    for (const param of parlantTool.parameters) {
      if (param.required) {
        if (param.examples && param.examples.length > 0) {
          params[param.Name] = param.examples[0]
        } else if (param.default !== undefined) {
          params[param.Name] = param.default
        } else {
          params[param.Name] = this.generateValueForType(param.type, param.Name)
        }
      }
    }

    // Override with safe test values for performance testing
    switch (adapterId) {
      case 'openai_embeddings':
        params.text = 'performance test text for embeddings'
        params.api_key = COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.OPENAI_API_KEY
        params.model = 'text-embedding-3-small'
        break
      case 'slack':
        params.bot_token = COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.SLACK_BOT_TOKEN
        params.action = 'send_message'
        params.channel = '#perf-test'
        params.message = 'Performance test message'
        break
      case 'github':
        params.token = COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.GITHUB_TOKEN
        break
      case 'postgresql':
        params.connection_string = COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.POSTGRESQL_URL
        break
      case 'google_sheets':
        params.api_key = COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.GOOGLE_SHEETS_KEY
        break
    }

    return params
  }

  private generateValueForType(type: string, paramName: string): any {
    switch (type) {
      case 'string':
        return `perf-test-${paramName}-${Date.now()}`
      case 'number':
        return Math.floor(Math.random() * 1000)
      case 'boolean':
        return Math.random() > 0.5
      case 'array':
        return [`perf-test-item-${Date.now()}`]
      case 'object':
        return { perfTest: true, timestamp: Date.now() }
      default:
        return `perf-test-value-${Date.now()}`
    }
  }

  private createTestContext(operationId: string): ToolExecutionContext {
    return {
      userId: 'perf-test-user',
      workspaceId: 'perf-test-workspace',
      agentId: 'perf-test-agent',
      sessionId: `perf-test-session-${operationId}`,
      metadata: {
        performanceTest: true,
        operationId,
        timestamp: new Date().toISOString(),
      },
    }
  }

  private checkPerformanceThresholds(summary: PerformanceSummary): boolean {
    const thresholds = PERFORMANCE_CONFIG.THRESHOLDS

    const checks = {
      avgLatencyOk: summary.averageLatency <= thresholds.MAX_LATENCY_MS,
      p95LatencyOk: summary.p95Latency <= thresholds.MAX_P95_LATENCY_MS,
      successRateOk: summary.successRate >= thresholds.MIN_SUCCESS_RATE,
      throughputOk: summary.throughputOpsPerSec >= thresholds.MIN_THROUGHPUT_OPS_SEC,
      memoryOk: summary.memoryStats.maxHeapUsed <= thresholds.MAX_MEMORY_USAGE_MB * 1024 * 1024,
    }

    const allThresholdsMet = Object.values(checks).every(Boolean)

    console.log(`📊 Performance Threshold Check:`)
    console.log(
      `   Average Latency: ${summary.averageLatency.toFixed(2)}ms ${checks.avgLatencyOk ? '✅' : '❌'}`
    )
    console.log(
      `   P95 Latency: ${summary.p95Latency.toFixed(2)}ms ${checks.p95LatencyOk ? '✅' : '❌'}`
    )
    console.log(
      `   Success Rate: ${(summary.successRate * 100).toFixed(2)}% ${checks.successRateOk ? '✅' : '❌'}`
    )
    console.log(
      `   Throughput: ${summary.throughputOpsPerSec.toFixed(2)} ops/sec ${checks.throughputOk ? '✅' : '❌'}`
    )
    console.log(
      `   Memory Usage: ${(summary.memoryStats.maxHeapUsed / 1024 / 1024).toFixed(2)}MB ${checks.memoryOk ? '✅' : '❌'}`
    )

    return allThresholdsMet
  }

  private generateRecommendations(
    overallSummary: PerformanceSummary,
    scenarioResults: Map<string, PerformanceSummary>,
    adapterResults: Map<string, PerformanceSummary>
  ): string[] {
    const recommendations: string[] = []

    // Overall performance recommendations
    if (overallSummary.successRate < 0.95) {
      recommendations.push('Improve error handling and retry logic to achieve >95% success rate')
    }

    if (overallSummary.p95Latency > 5000) {
      recommendations.push('Optimize slow operations - P95 latency exceeds 5 seconds')
    }

    if (overallSummary.throughputOpsPerSec < 1.0) {
      recommendations.push('Investigate throughput bottlenecks - system processing <1 op/sec')
    }

    // Memory recommendations
    if (overallSummary.memoryStats.maxHeapUsed > 256 * 1024 * 1024) {
      // 256MB
      recommendations.push('Monitor memory usage - heap exceeded 256MB during testing')
    }

    // Adapter-specific recommendations
    const slowestAdapter = Array.from(adapterResults.entries()).sort(
      (a, b) => b[1].averageLatency - a[1].averageLatency
    )[0]

    if (slowestAdapter && slowestAdapter[1].averageLatency > 2000) {
      recommendations.push(
        `Optimize ${slowestAdapter[0]} adapter - slowest average latency (${slowestAdapter[1].averageLatency.toFixed(2)}ms)`
      )
    }

    // Scenario-specific recommendations
    const worstScenario = Array.from(scenarioResults.entries()).sort(
      (a, b) => a[1].successRate - b[1].successRate
    )[0]

    if (worstScenario && worstScenario[1].successRate < 0.9) {
      recommendations.push(
        `Investigate ${worstScenario[0]} scenario failures - only ${(worstScenario[1].successRate * 100).toFixed(2)}% success rate`
      )
    }

    // Error pattern analysis
    if (overallSummary.errors.size > 0) {
      const topError = Array.from(overallSummary.errors.entries()).sort((a, b) => b[1] - a[1])[0]
      recommendations.push(`Address top error: "${topError[0]}" (${topError[1]} occurrences)`)
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable thresholds - monitor for regressions')
      recommendations.push(
        'Consider implementing performance baselines and automated regression detection'
      )
    }

    recommendations.push('Set up continuous performance monitoring in production')
    recommendations.push('Implement circuit breakers and rate limiting for production resilience')

    return recommendations
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // =====================================================
  // PERFORMANCE REPORTING
  // =====================================================

  generatePerformanceReport(benchmarkResults: any): {
    executive_summary: string
    detailed_metrics: any
    performance_analysis: any
    recommendations: string[]
    charts_data: any
  } {
    const { overallSummary, scenarioResults, adapterResults } = benchmarkResults

    const executive_summary = `
Performance Benchmark Results Summary:
=====================================
• Total Operations: ${overallSummary.totalOperations}
• Success Rate: ${(overallSummary.successRate * 100).toFixed(2)}%
• Average Latency: ${overallSummary.averageLatency.toFixed(2)}ms
• P95 Latency: ${overallSummary.p95Latency.toFixed(2)}ms
• Throughput: ${overallSummary.throughputOpsPerSec.toFixed(2)} ops/sec
• Peak Memory Usage: ${(overallSummary.memoryStats.maxHeapUsed / 1024 / 1024).toFixed(2)}MB

Performance Status: ${benchmarkResults.success ? '✅ PASS' : '❌ NEEDS IMPROVEMENT'}
`.trim()

    const performance_analysis = {
      latency_analysis: {
        average: overallSummary.averageLatency,
        p50: overallSummary.p50Latency,
        p95: overallSummary.p95Latency,
        p99: overallSummary.p99Latency,
        min: overallSummary.minLatency,
        max: overallSummary.maxLatency,
      },
      throughput_analysis: {
        ops_per_second: overallSummary.throughputOpsPerSec,
        total_operations: overallSummary.totalOperations,
        success_rate: overallSummary.successRate,
      },
      memory_analysis: {
        avg_heap_mb: overallSummary.memoryStats.avgHeapUsed / 1024 / 1024,
        max_heap_mb: overallSummary.memoryStats.maxHeapUsed / 1024 / 1024,
        peak_rss_mb: overallSummary.memoryStats.peakRSS / 1024 / 1024,
      },
      error_analysis: {
        total_errors: overallSummary.failedOperations,
        error_rate: 1 - overallSummary.successRate,
        top_errors: Array.from(overallSummary.errors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      },
    }

    const charts_data = {
      latency_distribution: {
        labels: ['P50', 'P95', 'P99', 'Max'],
        values: [
          overallSummary.p50Latency,
          overallSummary.p95Latency,
          overallSummary.p99Latency,
          overallSummary.maxLatency,
        ],
      },
      adapter_performance: Array.from(adapterResults.entries()).map(([Name, summary]) => ({
        adapter: Name,
        avg_latency: summary.averageLatency,
        success_rate: summary.successRate * 100,
        throughput: summary.throughputOpsPerSec,
      })),
      scenario_performance: Array.from(scenarioResults.entries()).map(([Name, summary]) => ({
        scenario: Name,
        avg_latency: summary.averageLatency,
        success_rate: summary.successRate * 100,
        ops_count: summary.totalOperations,
      })),
    }

    return {
      executive_summary,
      detailed_metrics: overallSummary,
      performance_analysis,
      recommendations: benchmarkResults.recommendations,
      charts_data,
    }
  }
}

// Export for use in tests
export { PerformanceMonitor, PERFORMANCE_CONFIG }
export type { PerformanceMetrics, PerformanceSummary }
