/**
 * Workflow to Journey Performance and Reliability Testing Framework
 * ================================================================
 *
 * Comprehensive performance testing suite for the workflow-to-journey conversion
 * system, focusing on:
 * - Conversion performance benchmarks
 * - Memory usage and resource monitoring
 * - Load testing for high-volume conversions
 * - Reliability testing for long-running processes
 * - Scalability validation
 * - Cache effectiveness testing
 * - Concurrent conversion handling
 *
 * Performance Targets:
 * - Simple workflows: < 500ms conversion time
 * - Complex workflows: < 2s conversion time
 * - Memory usage: < 100MB per conversion
 * - Cache hit ratio: > 80% for repeated conversions
 * - Concurrent handling: 10+ parallel conversions
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createLogger } from '@/lib/logs/console/logger'
import { WorkflowToJourneyConverter } from '@/services/parlant/journey-conversion/conversion-engine'
import type {
  ConversionConfig,
  ConversionContext,
  JourneyConversionResult,
  WorkflowState,
} from '@/services/parlant/journey-conversion/types'

const logger = createLogger('PerformanceTests')

// Performance test configuration
const PERFORMANCE_TEST_CONFIG: ConversionConfig = {
  preserve_block_names: true,
  generate_descriptions: true,
  enable_parameter_substitution: true,
  include_error_handling: true,
  optimization_level: 'advanced',
  cache_duration_ms: 300000, // 5 minutes for performance tests
}

// Performance thresholds and targets
const PERFORMANCE_TARGETS = {
  SIMPLE_WORKFLOW_MAX_TIME: 500, // ms
  COMPLEX_WORKFLOW_MAX_TIME: 2000, // ms
  LARGE_WORKFLOW_MAX_TIME: 5000, // ms
  MAX_MEMORY_PER_CONVERSION: 100 * 1024 * 1024, // 100MB
  MIN_CACHE_HIT_RATIO: 0.8,
  MIN_CONCURRENT_CONVERSIONS: 10,
  MAX_CPU_USAGE_PERCENT: 80,
}

// Test data generation for performance tests
class PerformanceTestDataGenerator {
  static createSimpleWorkflow(): WorkflowState {
    return {
      id: 'perf-simple',
      Name: 'Simple Performance Test Workflow',
      description: 'Basic workflow for performance baseline',
      blocks: [
        {
          id: 'start',
          type: 'starter',
          position: { x: 100, y: 100 },
          data: { label: 'Start' },
          width: 150,
          height: 100,
        },
        {
          id: 'agent',
          type: 'agent',
          position: { x: 300, y: 100 },
          data: {
            label: 'Process',
            model: 'gpt-4',
            prompt: 'Process: {{input}}',
          },
          width: 200,
          height: 150,
        },
        {
          id: 'api',
          type: 'api',
          position: { x: 550, y: 100 },
          data: {
            label: 'Output',
            method: 'post',
            url: '{{endpoint}}',
          },
          width: 200,
          height: 150,
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'agent', type: 'default' },
        { id: 'e2', source: 'agent', target: 'api', type: 'default' },
      ],
    }
  }

  static createComplexWorkflow(): WorkflowState {
    const blocks = [
      {
        id: 'start',
        type: 'starter',
        position: { x: 50, y: 200 },
        data: { label: 'Start Complex Process' },
        width: 150,
        height: 100,
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 200 },
        data: {
          label: 'Priority Check',
          condition: '{{priority}} === "high"',
        },
        width: 200,
        height: 120,
      },
      {
        id: 'parallel-1',
        type: 'parallel',
        position: { x: 500, y: 100 },
        data: {
          label: 'High Priority Processing',
          blocks: ['agent-urgent', 'notification'],
          wait_for_all: true,
        },
        width: 250,
        height: 150,
      },
      {
        id: 'agent-normal',
        type: 'agent',
        position: { x: 500, y: 300 },
        data: {
          label: 'Normal Processing',
          model: 'gpt-4',
          prompt: 'Normal process: {{input}}',
        },
        width: 200,
        height: 150,
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 800, y: 200 },
        data: {
          label: 'Result Router',
          routes: [
            { condition: '{{urgent_complete}}', target: 'urgent-output' },
            { condition: '{{normal_complete}}', target: 'normal-output' },
          ],
        },
        width: 200,
        height: 150,
      },
    ]

    // Add nested conditions and loops for complexity
    for (let i = 0; i < 5; i++) {
      blocks.push({
        id: `nested-condition-${i}`,
        type: 'condition',
        position: { x: 1050 + i * 200, y: 150 + i * 50 },
        data: {
          label: `Nested Check ${i}`,
          condition: `{{check_${i}}} === true`,
        },
        width: 180,
        height: 120,
      })
    }

    const edges = [
      { id: 'e1', source: 'start', target: 'condition-1', type: 'default' },
      {
        id: 'e2',
        source: 'condition-1',
        target: 'parallel-1',
        type: 'conditional',
        data: { condition: 'true' },
      },
      {
        id: 'e3',
        source: 'condition-1',
        target: 'agent-normal',
        type: 'conditional',
        data: { condition: 'false' },
      },
      { id: 'e4', source: 'parallel-1', target: 'router-1', type: 'default' },
      { id: 'e5', source: 'agent-normal', target: 'router-1', type: 'default' },
    ]

    // Add edges for nested conditions
    for (let i = 0; i < 4; i++) {
      edges.push({
        id: `nested-edge-${i}`,
        source: `nested-condition-${i}`,
        target: `nested-condition-${i + 1}`,
        type: 'conditional',
        data: { condition: 'true' },
      })
    }

    return {
      id: 'perf-complex',
      Name: 'Complex Performance Test Workflow',
      description: 'Complex workflow with nested conditions, parallels, and routing',
      blocks,
      edges,
    }
  }

  static createLargeWorkflow(blockCount = 50): WorkflowState {
    const blocks = []
    const edges = []

    // Create starter
    blocks.push({
      id: 'start',
      type: 'starter',
      position: { x: 50, y: 250 },
      data: { label: 'Large Workflow Start' },
      width: 150,
      height: 100,
    })

    // Generate many blocks of various types
    const blockTypes = ['agent', 'api', 'function', 'condition', 'evaluator']
    let x = 250
    let y = 100

    for (let i = 1; i <= blockCount; i++) {
      const blockType = blockTypes[i % blockTypes.length]

      blocks.push({
        id: `block-${i}`,
        type: blockType,
        position: { x, y },
        data: PerformanceTestDataGenerator.generateBlockDataForType(blockType, i),
        width: 200,
        height: 150,
      })

      // Connect to previous block
      const sourceId = i === 1 ? 'start' : `block-${i - 1}`
      edges.push({
        id: `edge-${i}`,
        source: sourceId,
        target: `block-${i}`,
        type: 'default',
      })

      // Layout management
      x += 250
      if (x > 2000) {
        x = 250
        y += 200
      }
    }

    return {
      id: `perf-large-${blockCount}`,
      Name: `Large Performance Test Workflow (${blockCount} blocks)`,
      description: `Large workflow with ${blockCount} blocks for scalability testing`,
      blocks,
      edges,
    }
  }

  private static generateBlockDataForType(blockType: string, index: number): any {
    const dataMap: Record<string, any> = {
      agent: {
        label: `Agent ${index}`,
        model: 'gpt-4',
        prompt: `Process step ${index}: {{input_${index}}}`,
      },
      api: {
        label: `API ${index}`,
        method: 'post',
        url: `{{api_endpoint_${index}}}`,
        headers: { 'X-Step': index.toString() },
      },
      function: {
        label: `Function ${index}`,
        code: `return { step: ${index}, result: input.value * ${index} };`,
      },
      condition: {
        label: `Condition ${index}`,
        condition: `{{value_${index}}} > ${index}`,
      },
      evaluator: {
        label: `Evaluator ${index}`,
        expression: `{{input_${index}}} * ${index} + 100`,
      },
    }

    return dataMap[blockType] || { label: `Block ${index}` }
  }

  static generateParametersForWorkflow(workflow: WorkflowState): Record<string, any> {
    const parameters: Record<string, any> = {}

    // Extract parameter references from workflow
    const workflowJson = JSON.stringify(workflow)
    const paramMatches = workflowJson.match(/{{([^}]+)}}/g) || []

    for (const match of paramMatches) {
      const paramName = match.replace(/[{}]/g, '').trim()

      // Generate appropriate test values based on parameter Name
      if (paramName.includes('endpoint') || paramName.includes('url')) {
        parameters[paramName] = 'https://api.test.example.com'
      } else if (paramName.includes('priority')) {
        parameters[paramName] = Math.random() > 0.5 ? 'high' : 'normal'
      } else if (paramName.includes('check_')) {
        parameters[paramName] = Math.random() > 0.3
      } else if (paramName.includes('value_')) {
        parameters[paramName] = Math.floor(Math.random() * 100)
      } else if (paramName.includes('input_')) {
        parameters[paramName] = `test-input-${paramName}`
      } else {
        parameters[paramName] = `test-${paramName}-${Math.random().toString(36).substr(2, 8)}`
      }
    }

    return parameters
  }
}

// Performance monitoring utilities
class PerformanceMonitor {
  private metrics: Map<string, any[]> = new Map()
  private memorySnapshots: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = []

  startMonitoring(testName: string): string {
    const monitorId = `${testName}-${Date.now()}`
    this.metrics.set(monitorId, [])

    // Take initial memory snapshot
    this.memorySnapshots.push({
      timestamp: Date.now(),
      usage: process.memoryUsage(),
    })

    return monitorId
  }

  recordMetric(monitorId: string, metric: any): void {
    const metrics = this.metrics.get(monitorId) || []
    metrics.push({
      timestamp: Date.now(),
      ...metric,
    })
    this.metrics.set(monitorId, metrics)
  }

  stopMonitoring(monitorId: string): PerformanceReport {
    const metrics = this.metrics.get(monitorId) || []
    this.metrics.delete(monitorId)

    // Take final memory snapshot
    const finalMemory = process.memoryUsage()
    this.memorySnapshots.push({
      timestamp: Date.now(),
      usage: finalMemory,
    })

    return this.generateReport(metrics)
  }

  private generateReport(metrics: any[]): PerformanceReport {
    if (metrics.length === 0) {
      return {
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        operations: 0,
        throughput: 0,
        memoryUsage: process.memoryUsage(),
        errors: 0,
      }
    }

    const times = metrics.map((m) => m.duration || 0)
    const errors = metrics.filter((m) => m.error).length

    return {
      totalTime: times.reduce((sum, time) => sum + time, 0),
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      operations: metrics.length,
      throughput: metrics.length / (Math.max(...times) / 1000), // ops per second
      memoryUsage: process.memoryUsage(),
      errors,
    }
  }

  getMemoryTrend(): number {
    if (this.memorySnapshots.length < 2) return 0

    const first = this.memorySnapshots[0].usage.heapUsed
    const last = this.memorySnapshots[this.memorySnapshots.length - 1].usage.heapUsed

    return last - first // Positive means memory increase
  }
}

interface PerformanceReport {
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  operations: number
  throughput: number
  memoryUsage: NodeJS.MemoryUsage
  errors: number
}

// Load testing utilities
class LoadTestManager extends EventEmitter {
  async runConcurrentConversions(
    converter: WorkflowToJourneyConverter,
    contexts: ConversionContext[],
    maxConcurrent = 10
  ): Promise<ConcurrentTestResult> {
    const results: JourneyConversionResult[] = []
    const errors: Error[] = []
    const startTime = Date.now()

    // Create semaphore for concurrent execution limit
    const semaphore = new Array(maxConcurrent).fill(null).map((_, i) => Promise.resolve(i))
    let semaphoreIndex = 0

    const conversionPromises = contexts.map(async (context, index) => {
      // Wait for available semaphore slot
      const slotIndex = semaphoreIndex % maxConcurrent
      await semaphore[slotIndex]

      try {
        const conversionStart = performance.now()
        const result = await converter.convertWorkflowToJourney(context)
        const conversionEnd = performance.now()

        this.emit('conversion-complete', {
          index,
          duration: conversionEnd - conversionStart,
          success: true,
        })

        results.push(result)

        // Release semaphore slot
        semaphore[slotIndex] = Promise.resolve(slotIndex)
      } catch (error) {
        errors.push(error as Error)

        this.emit('conversion-error', {
          index,
          error: error instanceof Error ? error.message : String(error),
        })

        // Release semaphore slot
        semaphore[slotIndex] = Promise.resolve(slotIndex)
      }

      semaphoreIndex++
    })

    await Promise.allSettled(conversionPromises)

    const totalTime = Date.now() - startTime

    return {
      totalConversions: contexts.length,
      successfulConversions: results.length,
      failedConversions: errors.length,
      totalTime,
      averageTime: totalTime / contexts.length,
      throughput: contexts.length / (totalTime / 1000),
      errors: errors.map((e) => e.message),
      results,
    }
  }

  async runProgressiveLoadTest(
    converter: WorkflowToJourneyConverter,
    baseContext: ConversionContext,
    startLoad = 1,
    maxLoad = 20,
    stepSize = 2
  ): Promise<ProgressiveLoadResult> {
    const loadResults: Array<{ load: number; result: ConcurrentTestResult }> = []

    for (let currentLoad = startLoad; currentLoad <= maxLoad; currentLoad += stepSize) {
      logger.info(`Running load test with ${currentLoad} concurrent conversions`)

      // Create contexts for current load level
      const contexts = Array(currentLoad)
        .fill(null)
        .map((_, i) => ({
          ...baseContext,
          workflow_id: `${baseContext.workflow_id}-load-${i}`,
          parameters: {
            ...baseContext.parameters,
            load_test_id: `load-${currentLoad}-${i}`,
          },
        }))

      const result = await this.runConcurrentConversions(converter, contexts, currentLoad)
      loadResults.push({ load: currentLoad, result })

      // Check if we're hitting performance degradation
      const avgTime = result.averageTime
      const errorRate = result.failedConversions / result.totalConversions

      if (avgTime > PERFORMANCE_TARGETS.COMPLEX_WORKFLOW_MAX_TIME * 2 || errorRate > 0.1) {
        logger.warn(`Performance degradation detected at load level ${currentLoad}`)
        break
      }

      // Brief pause between load tests
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return {
      loadTests: loadResults,
      maxSustainableLoad: this.findMaxSustainableLoad(loadResults),
      performanceDegradationPoint: this.findPerformanceDegradationPoint(loadResults),
    }
  }

  private findMaxSustainableLoad(
    results: Array<{ load: number; result: ConcurrentTestResult }>
  ): number {
    for (const { load, result } of results.reverse()) {
      const errorRate = result.failedConversions / result.totalConversions
      const avgTime = result.averageTime

      if (errorRate <= 0.05 && avgTime <= PERFORMANCE_TARGETS.COMPLEX_WORKFLOW_MAX_TIME * 1.5) {
        return load
      }
    }

    return results.length > 0 ? results[0].load : 0
  }

  private findPerformanceDegradationPoint(
    results: Array<{ load: number; result: ConcurrentTestResult }>
  ): number | null {
    if (results.length < 2) return null

    const baseline = results[0].result.averageTime

    for (let i = 1; i < results.length; i++) {
      const current = results[i].result.averageTime
      if (current > baseline * 2) {
        return results[i].load
      }
    }

    return null
  }
}

interface ConcurrentTestResult {
  totalConversions: number
  successfulConversions: number
  failedConversions: number
  totalTime: number
  averageTime: number
  throughput: number
  errors: string[]
  results: JourneyConversionResult[]
}

interface ProgressiveLoadResult {
  loadTests: Array<{ load: number; result: ConcurrentTestResult }>
  maxSustainableLoad: number
  performanceDegradationPoint: number | null
}

// Main test suites
describe('Workflow to Journey Performance Tests', () => {
  let converter: WorkflowToJourneyConverter
  let performanceMonitor: PerformanceMonitor
  let loadTestManager: LoadTestManager

  beforeAll(async () => {
    logger.info('Initializing performance test suite')
    converter = new WorkflowToJourneyConverter(PERFORMANCE_TEST_CONFIG)
    performanceMonitor = new PerformanceMonitor()
    loadTestManager = new LoadTestManager()

    // Warm up the converter
    const warmupWorkflow = PerformanceTestDataGenerator.createSimpleWorkflow()
    const warmupContext: ConversionContext = {
      workflow_id: 'warmup',
      workspace_id: 'test',
      user_id: 'test',
      parameters: {},
      config: PERFORMANCE_TEST_CONFIG,
    }

    jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(warmupWorkflow)
    await converter.convertWorkflowToJourney(warmupContext)

    logger.info('Performance test suite initialized and warmed up')
  })

  afterAll(async () => {
    logger.info('Cleanup performance test suite')
  })

  describe('Conversion Performance Benchmarks', () => {
    test('simple workflow conversion should meet performance targets', async () => {
      const workflow = PerformanceTestDataGenerator.createSimpleWorkflow()
      const parameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const monitorId = performanceMonitor.startMonitoring('simple-conversion')
      const startTime = performance.now()

      const result = await converter.convertWorkflowToJourney(context)

      const endTime = performance.now()
      const conversionTime = endTime - startTime

      performanceMonitor.recordMetric(monitorId, {
        duration: conversionTime,
        blocks: workflow.blocks.length,
        steps: result.steps.length,
      })

      const report = performanceMonitor.stopMonitoring(monitorId)

      // Performance assertions
      expect(conversionTime).toBeLessThan(PERFORMANCE_TARGETS.SIMPLE_WORKFLOW_MAX_TIME)
      expect(result.metadata.conversion_duration_ms).toBeLessThan(
        PERFORMANCE_TARGETS.SIMPLE_WORKFLOW_MAX_TIME
      )
      expect(report.memoryUsage.heapUsed).toBeLessThan(
        PERFORMANCE_TARGETS.MAX_MEMORY_PER_CONVERSION
      )

      logger.info(`Simple workflow conversion completed in ${conversionTime.toFixed(2)}ms`)
    })

    test('complex workflow conversion should meet performance targets', async () => {
      const workflow = PerformanceTestDataGenerator.createComplexWorkflow()
      const parameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const monitorId = performanceMonitor.startMonitoring('complex-conversion')
      const startTime = performance.now()

      const result = await converter.convertWorkflowToJourney(context)

      const endTime = performance.now()
      const conversionTime = endTime - startTime

      performanceMonitor.recordMetric(monitorId, {
        duration: conversionTime,
        blocks: workflow.blocks.length,
        steps: result.steps.length,
        warnings: result.warnings.length,
      })

      const report = performanceMonitor.stopMonitoring(monitorId)

      // Performance assertions
      expect(conversionTime).toBeLessThan(PERFORMANCE_TARGETS.COMPLEX_WORKFLOW_MAX_TIME)
      expect(result.metadata.conversion_duration_ms).toBeLessThan(
        PERFORMANCE_TARGETS.COMPLEX_WORKFLOW_MAX_TIME
      )
      expect(report.memoryUsage.heapUsed).toBeLessThan(
        PERFORMANCE_TARGETS.MAX_MEMORY_PER_CONVERSION
      )

      logger.info(`Complex workflow conversion completed in ${conversionTime.toFixed(2)}ms`)
    })

    test('large workflow conversion should scale appropriately', async () => {
      const workflow = PerformanceTestDataGenerator.createLargeWorkflow(100)
      const parameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const monitorId = performanceMonitor.startMonitoring('large-conversion')
      const startTime = performance.now()

      const result = await converter.convertWorkflowToJourney(context)

      const endTime = performance.now()
      const conversionTime = endTime - startTime

      performanceMonitor.recordMetric(monitorId, {
        duration: conversionTime,
        blocks: workflow.blocks.length,
        steps: result.steps.length,
        warnings: result.warnings.length,
      })

      const report = performanceMonitor.stopMonitoring(monitorId)

      // Scaled performance assertions
      expect(conversionTime).toBeLessThan(PERFORMANCE_TARGETS.LARGE_WORKFLOW_MAX_TIME)
      expect(result.metadata.conversion_duration_ms).toBeLessThan(
        PERFORMANCE_TARGETS.LARGE_WORKFLOW_MAX_TIME
      )

      // Performance should scale roughly linearly with block count
      const timePerBlock = conversionTime / workflow.blocks.length
      expect(timePerBlock).toBeLessThan(50) // 50ms per block max

      logger.info(
        `Large workflow (${workflow.blocks.length} blocks) conversion completed in ${conversionTime.toFixed(2)}ms`
      )
    })
  })

  describe('Memory Usage and Resource Monitoring', () => {
    test('should not leak memory during repeated conversions', async () => {
      const workflow = PerformanceTestDataGenerator.createSimpleWorkflow()
      const baseParameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const initialMemory = process.memoryUsage().heapUsed
      const monitorId = performanceMonitor.startMonitoring('memory-leak-test')

      // Perform many conversions
      for (let i = 0; i < 20; i++) {
        const context: ConversionContext = {
          workflow_id: `${workflow.id}-${i}`,
          workspace_id: 'test-workspace',
          user_id: 'test-user',
          parameters: { ...baseParameters, iteration: i },
          config: PERFORMANCE_TEST_CONFIG,
        }

        const result = await converter.convertWorkflowToJourney(context)
        expect(result).toBeDefined()

        // Force garbage collection periodically if available
        if (global.gc && i % 5 === 0) {
          global.gc()
        }
      }

      const report = performanceMonitor.stopMonitoring(monitorId)
      const memoryGrowth = performanceMonitor.getMemoryTrend()

      // Memory growth should be reasonable (less than 50MB total)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)

      logger.info(
        `Memory growth after 20 conversions: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`
      )
    })

    test('should handle garbage collection efficiently', async () => {
      const workflow = PerformanceTestDataGenerator.createComplexWorkflow()
      const parameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      // Measure memory before and after with forced GC
      if (global.gc) {
        global.gc()
      }
      const memoryBefore = process.memoryUsage()

      await converter.convertWorkflowToJourney(context)

      if (global.gc) {
        global.gc()
      }
      const memoryAfter = process.memoryUsage()

      const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed

      // Memory delta should be reasonable for a single conversion
      expect(memoryDelta).toBeLessThan(10 * 1024 * 1024) // 10MB max

      logger.info(`Memory delta for single conversion: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Concurrent Conversion Testing', () => {
    test('should handle concurrent conversions efficiently', async () => {
      const workflow = PerformanceTestDataGenerator.createSimpleWorkflow()
      const baseParameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      // Create contexts for concurrent conversions
      const concurrentCount = 10
      const contexts: ConversionContext[] = Array(concurrentCount)
        .fill(null)
        .map((_, i) => ({
          workflow_id: `${workflow.id}-concurrent-${i}`,
          workspace_id: 'test-workspace',
          user_id: 'test-user',
          parameters: { ...baseParameters, concurrent_id: i },
          config: PERFORMANCE_TEST_CONFIG,
        }))

      const startTime = Date.now()
      const result = await loadTestManager.runConcurrentConversions(
        converter,
        contexts,
        concurrentCount
      )
      const totalTime = Date.now() - startTime

      // Assertions for concurrent performance
      expect(result.successfulConversions).toBe(concurrentCount)
      expect(result.failedConversions).toBe(0)
      expect(result.averageTime).toBeLessThan(PERFORMANCE_TARGETS.SIMPLE_WORKFLOW_MAX_TIME * 2) // Allow 2x for concurrency
      expect(result.throughput).toBeGreaterThan(5) // At least 5 conversions per second

      logger.info(
        `Concurrent test: ${result.successfulConversions}/${result.totalConversions} successful in ${totalTime}ms`
      )
    })

    test('should scale with progressive load increases', async () => {
      const workflow = PerformanceTestDataGenerator.createSimpleWorkflow()
      const baseParameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const baseContext: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters: baseParameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      const result = await loadTestManager.runProgressiveLoadTest(converter, baseContext, 1, 15, 2)

      // Assertions for progressive load
      expect(result.maxSustainableLoad).toBeGreaterThanOrEqual(
        PERFORMANCE_TARGETS.MIN_CONCURRENT_CONVERSIONS
      )
      expect(result.loadTests.length).toBeGreaterThan(3) // Should complete multiple load levels

      // Performance should degrade gracefully, not catastrophically
      if (result.performanceDegradationPoint) {
        expect(result.performanceDegradationPoint).toBeGreaterThan(5)
      }

      logger.info(`Progressive load test: max sustainable load = ${result.maxSustainableLoad}`)
    })
  })

  describe('Cache Effectiveness Testing', () => {
    test('should achieve high cache hit ratio for repeated conversions', async () => {
      const workflow = PerformanceTestDataGenerator.createSimpleWorkflow()
      const parameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      // First conversion (cache miss)
      const firstStart = performance.now()
      const firstResult = await converter.convertWorkflowToJourney(context)
      const firstTime = performance.now() - firstStart

      // Second conversion (should be cache hit)
      const secondStart = performance.now()
      const secondResult = await converter.convertWorkflowToJourney(context)
      const secondTime = performance.now() - secondStart

      // Cache hit should be significantly faster
      expect(secondTime).toBeLessThan(firstTime * 0.5) // At least 50% faster

      // Results should be equivalent
      expect(secondResult.journey.Name).toBe(firstResult.journey.Name)
      expect(secondResult.steps.length).toBe(firstResult.steps.length)

      logger.info(
        `Cache effectiveness: first=${firstTime.toFixed(2)}ms, second=${secondTime.toFixed(2)}ms (${((1 - secondTime / firstTime) * 100).toFixed(1)}% faster)`
      )
    })

    test('should invalidate cache appropriately when workflow changes', async () => {
      const originalWorkflow = PerformanceTestDataGenerator.createSimpleWorkflow()
      const modifiedWorkflow = {
        ...originalWorkflow,
        blocks: [
          ...originalWorkflow.blocks,
          {
            id: 'new-block',
            type: 'function',
            position: { x: 800, y: 100 },
            data: { label: 'New Block', code: 'return "modified";' },
            width: 200,
            height: 150,
          },
        ],
      }

      const parameters =
        PerformanceTestDataGenerator.generateParametersForWorkflow(originalWorkflow)

      const context: ConversionContext = {
        workflow_id: 'cache-invalidation-test',
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      // First conversion with original workflow
      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(originalWorkflow)
      const originalResult = await converter.convertWorkflowToJourney(context)

      // Second conversion with modified workflow (same ID)
      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(modifiedWorkflow)
      const modifiedResult = await converter.convertWorkflowToJourney(context)

      // Results should be different (cache was invalidated)
      expect(modifiedResult.steps.length).toBeGreaterThan(originalResult.steps.length)
      expect(modifiedResult.metadata.blocks_converted).toBeGreaterThan(
        originalResult.metadata.blocks_converted
      )

      logger.info(
        `Cache invalidation test: original=${originalResult.steps.length} steps, modified=${modifiedResult.steps.length} steps`
      )
    })
  })

  describe('Reliability and Error Handling', () => {
    test('should maintain performance under error conditions', async () => {
      const workflow = PerformanceTestDataGenerator.createComplexWorkflow()
      const parameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      // Create contexts with some that will cause errors
      const contexts: ConversionContext[] = []
      for (let i = 0; i < 10; i++) {
        contexts.push({
          workflow_id: `${workflow.id}-reliability-${i}`,
          workspace_id: 'test-workspace',
          user_id: 'test-user',
          parameters: i % 3 === 0 ? { ...parameters, invalid_param: undefined } : parameters, // Cause errors every 3rd conversion
          config: PERFORMANCE_TEST_CONFIG,
        })
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockImplementation(async (id: string) => {
        if (id.includes('reliability-3') || id.includes('reliability-6')) {
          throw new Error('Simulated workflow retrieval error')
        }
        return workflow
      })

      const result = await loadTestManager.runConcurrentConversions(converter, contexts, 5)

      // Should handle errors gracefully without affecting overall performance
      expect(result.successfulConversions).toBeGreaterThan(5)
      expect(result.failedConversions).toBeGreaterThan(0)
      expect(result.averageTime).toBeLessThan(PERFORMANCE_TARGETS.COMPLEX_WORKFLOW_MAX_TIME * 3) // Allow more time with errors

      logger.info(
        `Reliability test: ${result.successfulConversions}/${result.totalConversions} successful with ${result.failedConversions} errors`
      )
    })

    test('should recover from temporary failures', async () => {
      const workflow = PerformanceTestDataGenerator.createSimpleWorkflow()
      const parameters = PerformanceTestDataGenerator.generateParametersForWorkflow(workflow)

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: PERFORMANCE_TEST_CONFIG,
      }

      let callCount = 0
      jest.spyOn(converter as any, 'getWorkflowState').mockImplementation(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Temporary failure')
        }
        return workflow
      })

      // Should eventually succeed after retries
      const result = await converter.convertWorkflowToJourney(context)
      expect(result).toBeDefined()
      expect(callCount).toBeGreaterThan(2)

      logger.info('Temporary failure recovery test passed')
    })
  })
})

// Test utilities are available within this file only
// If needed by other tests, move to a separate utility file outside __tests__
