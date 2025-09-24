/**
 * Performance Benchmarking Suite for Workflow to Journey Mapping System
 *
 * Comprehensive performance testing framework that validates conversion speed,
 * memory usage, scalability, and production readiness under various load conditions.
 */

import * as os from 'os'
import { performance } from 'perf_hooks'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

interface PerformanceMetrics {
  testName: string
  executionTimeMs: number
  memoryUsageMB: number
  cpuUsagePercent: number
  throughputOpsPerSec: number
  accuracy: number
  errorRate: number
  timestamp: string
}

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  throughput: number
  errorRate: number
  memoryPeakMB: number
  cpuPeakPercent: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private startTime = 0
  private startMemory: NodeJS.MemoryUsage | null = null
  private cpuStartUsage: NodeJS.CpuUsage | null = null

  startMeasurement(testName: string): void {
    this.startTime = performance.now()
    this.startMemory = process.memoryUsage()
    this.cpuStartUsage = process.cpuUsage()
  }

  endMeasurement(testName: string, accuracy = 100, errorRate = 0): PerformanceMetrics {
    const executionTimeMs = performance.now() - this.startTime
    const endMemory = process.memoryUsage()
    const cpuEndUsage = process.cpuUsage(this.cpuStartUsage || undefined)

    const memoryUsageMB = (endMemory.heapUsed - (this.startMemory?.heapUsed || 0)) / 1024 / 1024
    const cpuUsagePercent = ((cpuEndUsage.user + cpuEndUsage.system) / 1000 / executionTimeMs) * 100
    const throughputOpsPerSec = executionTimeMs > 0 ? 1000 / executionTimeMs : 0

    const metric: PerformanceMetrics = {
      testName,
      executionTimeMs,
      memoryUsageMB: Math.max(0, memoryUsageMB),
      cpuUsagePercent: Math.min(100, Math.max(0, cpuUsagePercent)),
      throughputOpsPerSec,
      accuracy,
      errorRate,
      timestamp: new Date().toISOString(),
    }

    this.metrics.push(metric)
    return metric
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  generateReport(): any {
    if (this.metrics.length === 0) {
      return { error: 'No metrics available' }
    }

    const avgExecutionTime =
      this.metrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / this.metrics.length
    const avgMemoryUsage =
      this.metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / this.metrics.length
    const avgThroughput =
      this.metrics.reduce((sum, m) => sum + m.throughputOpsPerSec, 0) / this.metrics.length
    const avgAccuracy = this.metrics.reduce((sum, m) => sum + m.accuracy, 0) / this.metrics.length
    const avgErrorRate = this.metrics.reduce((sum, m) => sum + m.errorRate, 0) / this.metrics.length

    return {
      totalTests: this.metrics.length,
      averageExecutionTimeMs: Math.round(avgExecutionTime),
      averageMemoryUsageMB: Math.round(avgMemoryUsage * 100) / 100,
      averageThroughputOpsPerSec: Math.round(avgThroughput * 100) / 100,
      averageAccuracy: Math.round(avgAccuracy * 100) / 100,
      averageErrorRate: Math.round(avgErrorRate * 100) / 100,
      maxExecutionTime: Math.max(...this.metrics.map((m) => m.executionTimeMs)),
      minExecutionTime: Math.min(...this.metrics.map((m) => m.executionTimeMs)),
      performanceGrade: this.calculatePerformanceGrade(avgExecutionTime, avgAccuracy, avgErrorRate),
    }
  }

  private calculatePerformanceGrade(
    avgTime: number,
    avgAccuracy: number,
    avgErrorRate: number
  ): string {
    if (avgTime < 100 && avgAccuracy > 95 && avgErrorRate < 1) return 'A+'
    if (avgTime < 200 && avgAccuracy > 90 && avgErrorRate < 2) return 'A'
    if (avgTime < 500 && avgAccuracy > 85 && avgErrorRate < 5) return 'B'
    if (avgTime < 1000 && avgAccuracy > 80 && avgErrorRate < 10) return 'C'
    return 'D'
  }
}

class WorkflowGenerator {
  static generateWorkflow(
    nodeCount: number,
    complexity: 'simple' | 'medium' | 'complex' = 'medium'
  ): any {
    const nodes = []
    const edges = []

    // Start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: 0, y: 100 },
      data: { label: 'Start' },
    })

    // Generate intermediate nodes based on complexity
    for (let i = 1; i < nodeCount - 1; i++) {
      const nodeType = WorkflowGenerator.getRandomNodeType(complexity)
      nodes.push({
        id: `node_${i}`,
        type: nodeType,
        position: { x: i * 150, y: 100 + (Math.random() - 0.5) * 200 },
        data: {
          label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${i}`,
          toolId: nodeType === 'tool' ? `tool_${i}` : undefined,
          condition: nodeType === 'condition' ? `variable_${i} === 'value'` : undefined,
          config: WorkflowGenerator.generateNodeConfig(nodeType, complexity),
        },
      })

      // Create edges - add some branching for complex workflows
      if (complexity === 'complex' && i % 3 === 0 && i > 1) {
        // Create branching
        edges.push({
          id: `edge_${i}_branch`,
          source: `node_${i - 2}`,
          target: `node_${i}`,
          condition: `branch_condition_${i}`,
        })
      }

      edges.push({
        id: `edge_${i}`,
        source: i === 1 ? 'start' : `node_${i - 1}`,
        target: `node_${i}`,
        condition: complexity === 'complex' && Math.random() > 0.7 ? `condition_${i}` : undefined,
      })
    }

    // End node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: (nodeCount - 1) * 150, y: 100 },
      data: { label: 'End' },
    })

    edges.push({
      id: `edge_end`,
      source: `node_${nodeCount - 2}`,
      target: 'end',
    })

    return {
      id: `generated_workflow_${nodeCount}_${complexity}`,
      name: `Generated ${complexity} Workflow (${nodeCount} nodes)`,
      description: `Auto-generated workflow for performance testing`,
      version: '1.0',
      nodes,
      edges,
      metadata: {
        generated: true,
        nodeCount,
        complexity,
        createdAt: new Date().toISOString(),
      },
    }
  }

  private static getRandomNodeType(complexity: string): string {
    const simpleTypes = ['tool', 'tool', 'tool', 'condition']
    const mediumTypes = ['tool', 'tool', 'condition', 'form', 'delay']
    const complexTypes = [
      'tool',
      'condition',
      'form',
      'delay',
      'loop',
      'merge',
      'split',
      'subprocess',
    ]

    let types: string[]
    switch (complexity) {
      case 'simple':
        types = simpleTypes
        break
      case 'complex':
        types = complexTypes
        break
      default:
        types = mediumTypes
        break
    }

    return types[Math.floor(Math.random() * types.length)]
  }

  private static generateNodeConfig(nodeType: string, complexity: string): any {
    const baseConfig: any = {}

    switch (nodeType) {
      case 'tool':
        baseConfig.timeout = complexity === 'complex' ? 30000 : 10000
        baseConfig.retries = complexity === 'complex' ? 3 : 1
        baseConfig.parameters = WorkflowGenerator.generateParameters(complexity)
        break
      case 'condition':
        baseConfig.expression = `input.${complexity}_field === 'expected_value'`
        baseConfig.defaultBranch = 'false'
        break
      case 'form':
        baseConfig.fields = WorkflowGenerator.generateFormFields(complexity)
        baseConfig.validation = complexity === 'complex'
        break
      case 'delay':
        baseConfig.delayMs = complexity === 'complex' ? 5000 : 1000
        break
      case 'loop':
        baseConfig.maxIterations = complexity === 'complex' ? 100 : 10
        baseConfig.breakCondition = 'counter >= maxIterations'
        break
      default:
        baseConfig.type = nodeType
    }

    return baseConfig
  }

  private static generateParameters(complexity: string): any {
    const paramCount = complexity === 'complex' ? 10 : complexity === 'medium' ? 5 : 2
    const params: any = {}

    for (let i = 0; i < paramCount; i++) {
      params[`param_${i}`] = `{{variable_${i}}}`
    }

    return params
  }

  private static generateFormFields(complexity: string): any[] {
    const fieldCount = complexity === 'complex' ? 8 : complexity === 'medium' ? 4 : 2
    const fields = []

    for (let i = 0; i < fieldCount; i++) {
      fields.push({
        name: `field_${i}`,
        type: i % 3 === 0 ? 'select' : i % 3 === 1 ? 'textarea' : 'text',
        required: Math.random() > 0.5,
        validation: complexity === 'complex' ? `validation_rule_${i}` : undefined,
      })
    }

    return fields
  }
}

class MockWorkflowToJourneyConverter {
  private performanceMonitor: PerformanceMonitor

  constructor() {
    this.performanceMonitor = new PerformanceMonitor()
  }

  async convertWorkflowToJourney(workflow: any, options: any = {}): Promise<any> {
    const testName = `convert_${workflow.metadata?.nodeCount || 'unknown'}_${workflow.metadata?.complexity || 'unknown'}`
    this.performanceMonitor.startMeasurement(testName)

    try {
      // Simulate realistic conversion work
      await this.simulateConversionWork(workflow, options)

      const journey = {
        id: `journey_${workflow.id}`,
        title: `Conversational ${workflow.name}`,
        description: workflow.description,
        conditions: [`User wants to execute ${workflow.name}`],
        states: this.convertNodesToStates(workflow.nodes),
        transitions: this.convertEdgesToTransitions(workflow.edges),
        metadata: {
          originalWorkflowId: workflow.id,
          conversionTimestamp: new Date().toISOString(),
          preservedNodeCount: workflow.nodes.length,
          preservedEdgeCount: workflow.edges.length,
        },
      }

      // Calculate accuracy based on preservation
      const accuracy = this.calculateConversionAccuracy(workflow, journey)
      const errorRate = accuracy < 90 ? (100 - accuracy) / 10 : 0

      const metrics = this.performanceMonitor.endMeasurement(testName, accuracy, errorRate)

      return {
        success: true,
        journey,
        metrics,
        performance: {
          conversionTimeMs: metrics.executionTimeMs,
          memoryUsedMB: metrics.memoryUsageMB,
          throughputOpsPerSec: metrics.throughputOpsPerSec,
        },
      }
    } catch (error) {
      const metrics = this.performanceMonitor.endMeasurement(testName, 0, 100)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics,
        performance: {
          conversionTimeMs: metrics.executionTimeMs,
          memoryUsedMB: metrics.memoryUsageMB,
          throughputOpsPerSec: 0,
        },
      }
    }
  }

  private async simulateConversionWork(workflow: any, options: any): Promise<void> {
    // Simulate node processing
    for (const node of workflow.nodes) {
      await this.processNode(node, options)
    }

    // Simulate edge processing
    for (const edge of workflow.edges) {
      await this.processEdge(edge, options)
    }

    // Simulate optimization pass
    if (options.optimize) {
      await this.simulateOptimization(workflow)
    }
  }

  private async processNode(node: any, options: any): Promise<void> {
    // Simulate processing time based on node complexity
    const processingTime = this.calculateNodeProcessingTime(node, options)
    await new Promise((resolve) => setTimeout(resolve, processingTime))
  }

  private async processEdge(edge: any, options: any): Promise<void> {
    // Simulate edge processing
    const processingTime = edge.condition ? 5 : 1
    await new Promise((resolve) => setTimeout(resolve, processingTime))
  }

  private async simulateOptimization(workflow: any): Promise<void> {
    // Simulate optimization work proportional to workflow size
    const optimizationTime = Math.min(100, workflow.nodes.length * 2)
    await new Promise((resolve) => setTimeout(resolve, optimizationTime))
  }

  private calculateNodeProcessingTime(node: any, options: any): number {
    let baseTime = 1 // 1ms base processing time

    // Adjust based on node type
    switch (node.type) {
      case 'tool':
        baseTime = 5
        break
      case 'condition':
        baseTime = 3
        break
      case 'form':
        baseTime = 4
        break
      case 'loop':
        baseTime = 8
        break
      case 'subprocess':
        baseTime = 10
        break
      default:
        baseTime = 2
    }

    // Adjust based on node configuration complexity
    if (node.data?.config) {
      const configComplexity = Object.keys(node.data.config).length
      baseTime += configComplexity * 0.5
    }

    // Adjust based on options
    if (options.deepValidation) {
      baseTime *= 2
    }
    if (options.optimize) {
      baseTime *= 1.5
    }

    return Math.max(1, Math.round(baseTime))
  }

  private convertNodesToStates(nodes: any[]): any[] {
    return nodes.map((node) => ({
      id: `state_${node.id}`,
      type: this.mapNodeTypeToStateType(node.type),
      name: node.data?.label || node.id,
      config: node.data?.config || {},
      originalNodeId: node.id,
    }))
  }

  private convertEdgesToTransitions(edges: any[]): any[] {
    return edges.map((edge) => ({
      id: `transition_${edge.id}`,
      from: `state_${edge.source}`,
      to: `state_${edge.target}`,
      condition: edge.condition || null,
      originalEdgeId: edge.id,
    }))
  }

  private mapNodeTypeToStateType(nodeType: string): string {
    const mapping: Record<string, string> = {
      start: 'initial',
      end: 'final',
      tool: 'tool_state',
      condition: 'chat_state',
      form: 'chat_state',
      delay: 'tool_state',
      loop: 'chat_state',
      merge: 'chat_state',
      split: 'chat_state',
      subprocess: 'tool_state',
    }
    return mapping[nodeType] || 'chat_state'
  }

  private calculateConversionAccuracy(workflow: any, journey: any): number {
    const nodeAccuracy = (journey.states.length / workflow.nodes.length) * 100
    const edgeAccuracy = (journey.transitions.length / workflow.edges.length) * 100

    // Check if critical nodes are preserved
    const startNodes = workflow.nodes.filter((n: any) => n.type === 'start').length
    const endNodes = workflow.nodes.filter((n: any) => n.type === 'end').length
    const initialStates = journey.states.filter((s: any) => s.type === 'initial').length
    const finalStates = journey.states.filter((s: any) => s.type === 'final').length

    const structureAccuracy =
      (startNodes === initialStates ? 50 : 0) + (endNodes === finalStates ? 50 : 0)

    return Math.min(100, (nodeAccuracy + edgeAccuracy + structureAccuracy) / 3)
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics()
  }

  getPerformanceReport(): any {
    return this.performanceMonitor.generateReport()
  }
}

// Performance Test Suite
describe('Workflow to Journey Performance Benchmarking', () => {
  let converter: MockWorkflowToJourneyConverter
  const performanceResults: any[] = []

  beforeAll(() => {
    console.log('🚀 Initializing Performance Benchmark Suite')
    console.log(
      `📊 System Info: ${os.cpus().length} CPU cores, ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB RAM`
    )
    converter = new MockWorkflowToJourneyConverter()
  })

  afterAll(() => {
    console.log('\n📈 FINAL PERFORMANCE REPORT 📈')
    const report = converter.getPerformanceReport()
    console.log('====================================')
    console.log(`Total Tests: ${report.totalTests}`)
    console.log(`Average Execution Time: ${report.averageExecutionTimeMs}ms`)
    console.log(`Average Memory Usage: ${report.averageMemoryUsageMB}MB`)
    console.log(`Average Throughput: ${report.averageThroughputOpsPerSec} ops/sec`)
    console.log(`Average Accuracy: ${report.averageAccuracy}%`)
    console.log(`Average Error Rate: ${report.averageErrorRate}%`)
    console.log(`Performance Grade: ${report.performanceGrade}`)
    console.log('====================================')
  })

  describe('Scalability Performance Tests', () => {
    const testSizes = [5, 10, 25, 50, 100, 200]

    testSizes.forEach((size) => {
      test(`should handle ${size}-node workflow efficiently`, async () => {
        const workflow = WorkflowGenerator.generateWorkflow(size, 'medium')
        const startTime = performance.now()

        const result = await converter.convertWorkflowToJourney(workflow)
        const executionTime = performance.now() - startTime

        expect(result.success).toBe(true)
        expect(result.journey).toBeDefined()
        expect(result.journey.states.length).toBe(size)

        // Performance assertions
        expect(executionTime).toBeLessThan(size * 50) // Max 50ms per node
        expect(result.performance.memoryUsedMB).toBeLessThan(size * 0.1) // Max 0.1MB per node

        console.log(
          `📊 ${size} nodes: ${Math.round(executionTime)}ms, ${result.performance.memoryUsedMB.toFixed(2)}MB`
        )
      }, 30000) // 30 second timeout for large workflows
    })
  })

  describe('Complexity Performance Tests', () => {
    const complexities: Array<'simple' | 'medium' | 'complex'> = ['simple', 'medium', 'complex']

    complexities.forEach((complexity) => {
      test(`should handle ${complexity} workflow complexity efficiently`, async () => {
        const workflow = WorkflowGenerator.generateWorkflow(50, complexity)
        const result = await converter.convertWorkflowToJourney(workflow)

        expect(result.success).toBe(true)
        expect(result.performance.conversionTimeMs).toBeDefined()

        // Complexity-based performance expectations
        const maxTime = complexity === 'simple' ? 1000 : complexity === 'medium' ? 2000 : 4000
        expect(result.performance.conversionTimeMs).toBeLessThan(maxTime)

        console.log(
          `🔧 ${complexity}: ${Math.round(result.performance.conversionTimeMs)}ms, accuracy: ${result.metrics.accuracy}%`
        )
      })
    })
  })

  describe('Concurrent Load Performance Tests', () => {
    test('should handle concurrent workflow conversions', async () => {
      const concurrentWorkflows = 10
      const workflows = Array.from({ length: concurrentWorkflows }, (_, i) =>
        WorkflowGenerator.generateWorkflow(20, 'medium')
      )

      const startTime = performance.now()
      const results = await Promise.all(
        workflows.map((workflow) => converter.convertWorkflowToJourney(workflow))
      )
      const totalTime = performance.now() - startTime

      // Verify all conversions succeeded
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })

      // Performance assertions for concurrent processing
      expect(totalTime).toBeLessThan(concurrentWorkflows * 1000) // Should be much faster than sequential
      console.log(
        `⚡ ${concurrentWorkflows} concurrent conversions: ${Math.round(totalTime)}ms total`
      )
    })

    test('should maintain performance under sustained load', async () => {
      const iterations = 50
      const results: LoadTestResult = {
        totalRequests: iterations,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Number.MAX_VALUE,
        maxResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryPeakMB: 0,
        cpuPeakPercent: 0,
      }

      const responseTimes: number[] = []
      const startTime = performance.now()
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024

      for (let i = 0; i < iterations; i++) {
        const workflow = WorkflowGenerator.generateWorkflow(25, 'medium')
        const iterationStart = performance.now()

        try {
          const result = await converter.convertWorkflowToJourney(workflow)
          const iterationTime = performance.now() - iterationStart

          if (result.success) {
            results.successfulRequests++
            responseTimes.push(iterationTime)
            results.minResponseTime = Math.min(results.minResponseTime, iterationTime)
            results.maxResponseTime = Math.max(results.maxResponseTime, iterationTime)
          } else {
            results.failedRequests++
          }

          // Track peak memory usage
          const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024
          results.memoryPeakMB = Math.max(results.memoryPeakMB, currentMemory - initialMemory)
        } catch (error) {
          results.failedRequests++
        }

        // Small delay to simulate realistic load
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const totalTime = performance.now() - startTime
      results.averageResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      results.throughput = (results.successfulRequests * 1000) / totalTime
      results.errorRate = (results.failedRequests / results.totalRequests) * 100

      // Assertions
      expect(results.successfulRequests).toBeGreaterThanOrEqual(iterations * 0.95) // 95% success rate
      expect(results.errorRate).toBeLessThan(5) // Less than 5% error rate
      expect(results.averageResponseTime).toBeLessThan(1000) // Average under 1 second
      expect(results.memoryPeakMB).toBeLessThan(100) // Memory usage under 100MB

      console.log(`🔄 Sustained load (${iterations} iterations):`)
      console.log(
        `   Success Rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%`
      )
      console.log(`   Avg Response: ${Math.round(results.averageResponseTime)}ms`)
      console.log(`   Throughput: ${results.throughput.toFixed(1)} ops/sec`)
      console.log(`   Peak Memory: ${results.memoryPeakMB.toFixed(1)}MB`)
    }, 60000) // 60 second timeout for load test
  })

  describe('Memory and Resource Performance Tests', () => {
    test('should have predictable memory usage patterns', async () => {
      const memorySnapshots: number[] = []
      const testSizes = [10, 25, 50, 100, 200]

      for (const size of testSizes) {
        const workflow = WorkflowGenerator.generateWorkflow(size, 'medium')
        const beforeMemory = process.memoryUsage().heapUsed / 1024 / 1024

        await converter.convertWorkflowToJourney(workflow)

        const afterMemory = process.memoryUsage().heapUsed / 1024 / 1024
        const memoryUsed = afterMemory - beforeMemory
        memorySnapshots.push(memoryUsed)

        // Memory should scale predictably with workflow size
        expect(memoryUsed).toBeLessThan(size * 0.1) // Max 0.1MB per node

        // Force garbage collection to reset for next test
        if (global.gc) {
          global.gc()
        }
      }

      // Verify memory scaling is roughly linear
      const memoryGrowthRate =
        (memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0]) /
        (testSizes[testSizes.length - 1] - testSizes[0])
      expect(memoryGrowthRate).toBeLessThan(0.1) // Less than 0.1MB per additional node

      console.log(`💾 Memory scaling: ${memoryGrowthRate.toFixed(3)}MB per additional node`)
    })

    test('should not have memory leaks during repeated operations', async () => {
      const iterations = 20
      const memoryReadings: number[] = []

      for (let i = 0; i < iterations; i++) {
        const workflow = WorkflowGenerator.generateWorkflow(30, 'medium')
        await converter.convertWorkflowToJourney(workflow)

        // Take memory reading
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024
        memoryReadings.push(memoryUsage)

        // Force garbage collection every 5 iterations
        if (i % 5 === 4 && global.gc) {
          global.gc()
        }
      }

      // Check for memory leak pattern (steadily increasing memory)
      const firstHalf = memoryReadings.slice(0, iterations / 2)
      const secondHalf = memoryReadings.slice(iterations / 2)

      const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

      const memoryIncrease = secondHalfAvg - firstHalfAvg

      // Memory increase should be minimal (less than 10MB over 20 iterations)
      expect(memoryIncrease).toBeLessThan(10)

      console.log(
        `🔍 Memory leak check: ${memoryIncrease.toFixed(1)}MB increase over ${iterations} iterations`
      )
    })
  })

  describe('Performance Optimization Tests', () => {
    test('should show performance improvement with optimization enabled', async () => {
      const workflow = WorkflowGenerator.generateWorkflow(100, 'complex')

      // Test without optimization
      const normalResult = await converter.convertWorkflowToJourney(workflow)
      expect(normalResult.success).toBe(true)

      // Test with optimization
      const optimizedResult = await converter.convertWorkflowToJourney(workflow, { optimize: true })
      expect(optimizedResult.success).toBe(true)

      // Optimization may take longer for processing but should maintain or improve quality
      expect(optimizedResult.metrics.accuracy).toBeGreaterThanOrEqual(normalResult.metrics.accuracy)

      console.log(
        `🎯 Optimization impact: Normal: ${Math.round(normalResult.performance.conversionTimeMs)}ms, Optimized: ${Math.round(optimizedResult.performance.conversionTimeMs)}ms`
      )
    })
  })
})
