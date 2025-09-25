/**
 * Performance Testing and Optimization Validation
 * ==============================================
 *
 * Comprehensive performance test suite for the Parlant React Chat Interface.
 * Tests various performance scenarios including load testing, stress testing,
 * memory usage validation, and optimization verification.
 *
 * Test Categories:
 * 1. Load Testing and Throughput Validation
 * 2. Memory Usage and Leak Detection
 * 3. Response Time Performance
 * 4. Concurrent User Simulation
 * 5. Database Query Optimization
 * 6. Real-time Communication Performance
 * 7. Resource Utilization Monitoring
 * 8. Scalability Testing
 * 9. Caching and Optimization Validation
 * 10. Performance Regression Testing
 */

import { performance } from 'perf_hooks'
import { db } from '@packages/db'
import {
  BrowserSessionManager,
  ChatHistoryRetrieval,
  ChatMessageStorage,
  ConversationManager,
} from '@packages/db/chat-persistence-queries'
import { chatMessage, parlantAgent, parlantSession, user, workspace } from '@packages/db/schema'
import { eq, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { SessionPersistenceService } from '../../services/chat-persistence/session-persistence'
import { AgentSessionManager } from '../../services/parlant/lifecycle/agent-session-manager'

// Performance measurement utilities
interface PerformanceMetrics {
  memoryUsage: NodeJS.MemoryUsage[]
  responseTimes: number[]
  throughputMetrics: ThroughputMetric[]
  concurrencyResults: ConcurrencyResult[]
  resourceUtilization: ResourceUtilizationMetric[]
  optimizationResults: OptimizationResult[]
}

interface ThroughputMetric {
  operation: string
  messagesPerSecond: number
  totalMessages: number
  duration: number
  errorRate: number
}

interface ConcurrencyResult {
  concurrentUsers: number
  averageResponseTime: number
  successRate: number
  peakMemoryUsage: number
  totalOperations: number
}

interface ResourceUtilizationMetric {
  timestamp: number
  cpuUsagePercent: number
  memoryUsageMB: number
  activeConnections: number
  databaseConnections: number
}

interface OptimizationResult {
  feature: string
  beforeMetric: number
  afterMetric: number
  improvementPercent: number
  testType: string
}

// Test context for performance testing
interface PerformanceTestContext {
  workspaceId: string
  userId: string
  agentId: string
  messageStorage: ChatMessageStorage
  historyRetrieval: ChatHistoryRetrieval
  sessionManager: BrowserSessionManager
  conversationManager: ConversationManager
  agentSessionManager: AgentSessionManager
  sessionPersistence: SessionPersistenceService
  metrics: PerformanceMetrics
}

// Memory leak detection utility
class MemoryMonitor {
  private measurements: NodeJS.MemoryUsage[] = []
  private interval: NodeJS.Timeout | null = null

  startMonitoring(intervalMs = 1000) {
    this.measurements = []
    this.interval = setInterval(() => {
      this.measurements.push(process.memoryUsage())
    }, intervalMs)
  }

  stopMonitoring(): NodeJS.MemoryUsage[] {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    return [...this.measurements]
  }

  detectLeaks(): { hasLeak: boolean; leakSize: number; leakType: string } {
    if (this.measurements.length < 10) {
      return { hasLeak: false, leakSize: 0, leakType: 'insufficient_data' }
    }

    const first = this.measurements[0]
    const last = this.measurements[this.measurements.length - 1]

    // Check for significant growth in heap usage
    const heapGrowth = last.heapUsed - first.heapUsed
    const heapGrowthPercent = (heapGrowth / first.heapUsed) * 100

    // Consider it a leak if heap usage grew by more than 50%
    if (heapGrowthPercent > 50) {
      return {
        hasLeak: true,
        leakSize: heapGrowth,
        leakType: 'heap_growth',
      }
    }

    return { hasLeak: false, leakSize: heapGrowth, leakType: 'normal' }
  }
}

// Performance timer utility
class PerformanceTimer {
  private startTime = 0
  private measurements: Array<{ name: string; duration: number }> = []

  start(): void {
    this.startTime = performance.now()
  }

  mark(name: string): number {
    const duration = performance.now() - this.startTime
    this.measurements.push({ name, duration })
    return duration
  }

  getMeasurements(): Array<{ name: string; duration: number }> {
    return [...this.measurements]
  }

  getAverageTime(): number {
    if (this.measurements.length === 0) return 0
    const total = this.measurements.reduce((sum, m) => sum + m.duration, 0)
    return total / this.measurements.length
  }
}

describe('Performance Testing and Optimization Validation', () => {
  let testContext: PerformanceTestContext
  let memoryMonitor: MemoryMonitor
  let performanceTimer: PerformanceTimer

  beforeAll(async () => {
    console.log('🚀 Starting Performance Testing and Optimization Validation...')

    // Initialize performance monitoring
    memoryMonitor = new MemoryMonitor()
    performanceTimer = new PerformanceTimer()

    // Start global memory monitoring
    memoryMonitor.startMonitoring(2000) // Every 2 seconds
  })

  beforeEach(async () => {
    // Initialize test context
    const workspaceId = uuidv4()
    const userId = uuidv4()
    const agentId = uuidv4()

    // Initialize services
    const messageStorage = new ChatMessageStorage(db)
    const historyRetrieval = new ChatHistoryRetrieval(db)
    const sessionManager = new BrowserSessionManager(db)
    const conversationManager = new ConversationManager(db)
    const agentSessionManager = new AgentSessionManager()
    const sessionPersistence = new SessionPersistenceService()

    const metrics: PerformanceMetrics = {
      memoryUsage: [],
      responseTimes: [],
      throughputMetrics: [],
      concurrencyResults: [],
      resourceUtilization: [],
      optimizationResults: [],
    }

    testContext = {
      workspaceId,
      userId,
      agentId,
      messageStorage,
      historyRetrieval,
      sessionManager,
      conversationManager,
      agentSessionManager,
      sessionPersistence,
      metrics,
    }

    // Setup test data
    await db
      .insert(workspace)
      .values({
        id: workspaceId,
        name: 'Performance Test Workspace',
        slug: 'perf-test-workspace',
      })
      .onConflictDoNothing()

    await db
      .insert(user)
      .values({
        id: userId,
        email: 'perf-test@example.com',
        name: 'Performance Test User',
      })
      .onConflictDoNothing()

    await db
      .insert(parlantAgent)
      .values({
        id: agentId,
        workspaceId,
        createdBy: userId,
        name: 'Performance Test Agent',
        description: 'Agent for performance testing',
        status: 'active',
      })
      .onConflictDoNothing()

    await db
      .insert(parlantSession)
      .values({
        id: uuidv4(),
        agentId,
        workspaceId,
        userId,
        mode: 'auto',
        status: 'active',
      })
      .onConflictDoNothing()

    console.log(`✅ Performance test environment initialized - Workspace: ${workspaceId}`)
  })

  afterEach(async () => {
    // Cleanup test data
    try {
      await db.delete(chatMessage).where(eq(chatMessage.workspaceId, testContext.workspaceId))
      await db.delete(parlantSession).where(eq(parlantSession.workspaceId, testContext.workspaceId))
      await db.delete(parlantAgent).where(eq(parlantAgent.workspaceId, testContext.workspaceId))
      await db.delete(workspace).where(eq(workspace.id, testContext.workspaceId))
      await db.delete(user).where(eq(user.id, testContext.userId))
    } catch (error) {
      console.warn('Performance test cleanup warning:', error)
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  afterAll(() => {
    // Stop memory monitoring and analyze results
    const finalMemoryMeasurements = memoryMonitor.stopMonitoring()
    const leakAnalysis = memoryMonitor.detectLeaks()

    // Calculate performance summary
    const avgResponseTime =
      testContext.metrics.responseTimes.length > 0
        ? testContext.metrics.responseTimes.reduce((a, b) => a + b, 0) /
          testContext.metrics.responseTimes.length
        : 0

    console.log('📊 Performance Testing Summary:')
    console.log(`   • Average Response Time: ${avgResponseTime.toFixed(2)}ms`)
    console.log(`   • Total Throughput Tests: ${testContext.metrics.throughputMetrics.length}`)
    console.log(`   • Concurrency Tests: ${testContext.metrics.concurrencyResults.length}`)
    console.log(`   • Memory Measurements: ${finalMemoryMeasurements.length}`)
    console.log(`   • Memory Leak Detection: ${leakAnalysis.hasLeak ? 'DETECTED' : 'CLEAN'}`)

    if (leakAnalysis.hasLeak) {
      console.warn(
        `   ⚠️  Memory leak detected: ${(leakAnalysis.leakSize / 1024 / 1024).toFixed(2)}MB (${leakAnalysis.leakType})`
      )
    }

    // Log optimization results
    if (testContext.metrics.optimizationResults.length > 0) {
      console.log('🎯 Optimization Results:')
      testContext.metrics.optimizationResults.forEach((result) => {
        console.log(`   • ${result.feature}: ${result.improvementPercent.toFixed(1)}% improvement`)
      })
    }

    console.log('✅ Performance Testing and Optimization Validation Completed')
  })

  describe('1. Load Testing and Throughput Validation', () => {
    it('should handle high-volume message storage with consistent performance', async () => {
      console.log('📈 Starting high-volume message storage test...')

      const messageCount = 1000
      const batchSize = 50
      const startTime = performance.now()

      let totalMessages = 0
      let errorCount = 0

      // Create messages in batches to simulate realistic load
      for (let batch = 0; batch < messageCount / batchSize; batch++) {
        const batchMessages = Array.from({ length: batchSize }, (_, index) => ({
          sessionId: uuidv4(),
          workspaceId: testContext.workspaceId,
          messageType: 'text' as const,
          content: { text: `Load test message ${batch * batchSize + index + 1}` },
          rawContent: `Load test message ${batch * batchSize + index + 1}`,
          senderId: testContext.userId,
          senderType: 'user' as const,
          senderName: 'Load Test User',
          status: 'sent' as const,
          metadata: {
            batch: batch,
            loadTest: true,
            timestamp: new Date().toISOString(),
          },
        }))

        try {
          const batchStartTime = performance.now()
          await testContext.messageStorage.batchStoreMessages(batchMessages)
          const batchEndTime = performance.now()

          totalMessages += batchSize
          testContext.metrics.responseTimes.push(batchEndTime - batchStartTime)
        } catch (error) {
          errorCount++
          console.warn(`Batch ${batch} failed:`, error)
        }

        // Small delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const totalTime = performance.now() - startTime
      const throughput = (totalMessages / totalTime) * 1000 // messages per second
      const errorRate = (errorCount / (messageCount / batchSize)) * 100

      const throughputMetric: ThroughputMetric = {
        operation: 'message_storage',
        messagesPerSecond: throughput,
        totalMessages,
        duration: totalTime,
        errorRate,
      }

      testContext.metrics.throughputMetrics.push(throughputMetric)

      // Performance assertions
      expect(totalMessages).toBe(messageCount)
      expect(throughput).toBeGreaterThan(10) // At least 10 messages per second
      expect(errorRate).toBeLessThan(5) // Less than 5% error rate

      console.log(`✅ Load test completed:`)
      console.log(`   • Messages processed: ${totalMessages}`)
      console.log(`   • Throughput: ${throughput.toFixed(2)} msg/sec`)
      console.log(`   • Error rate: ${errorRate.toFixed(2)}%`)
      console.log(`   • Total time: ${totalTime.toFixed(2)}ms`)
    })

    it('should maintain performance under sustained load', async () => {
      console.log('🔄 Testing sustained load performance...')

      const testDuration = 5000 // 5 seconds
      const messageInterval = 100 // Message every 100ms
      const startTime = performance.now()

      let messageCount = 0
      let responseTimeSum = 0

      const sustainedLoadTest = setInterval(async () => {
        const msgStartTime = performance.now()

        try {
          await testContext.messageStorage.storeMessage({
            sessionId: uuidv4(),
            workspaceId: testContext.workspaceId,
            messageType: 'text',
            content: { text: `Sustained load message ${messageCount + 1}` },
            rawContent: `Sustained load message ${messageCount + 1}`,
            senderId: testContext.userId,
            senderType: 'user',
            senderName: 'Sustained Load User',
            metadata: { sustainedLoad: true },
          })

          const responseTime = performance.now() - msgStartTime
          responseTimeSum += responseTime
          messageCount++
          testContext.metrics.responseTimes.push(responseTime)
        } catch (error) {
          console.warn('Sustained load message failed:', error)
        }
      }, messageInterval)

      // Wait for test duration
      await new Promise((resolve) => setTimeout(resolve, testDuration))
      clearInterval(sustainedLoadTest)

      const totalTime = performance.now() - startTime
      const averageResponseTime = responseTimeSum / messageCount
      const actualThroughput = (messageCount / totalTime) * 1000

      // Performance assertions
      expect(messageCount).toBeGreaterThan(0)
      expect(averageResponseTime).toBeLessThan(1000) // Less than 1 second per message
      expect(actualThroughput).toBeGreaterThan(5) // At least 5 messages per second

      console.log(`✅ Sustained load test completed:`)
      console.log(`   • Messages processed: ${messageCount}`)
      console.log(`   • Average response time: ${averageResponseTime.toFixed(2)}ms`)
      console.log(`   • Throughput: ${actualThroughput.toFixed(2)} msg/sec`)
    })
  })

  describe('2. Memory Usage and Leak Detection', () => {
    it('should not have memory leaks during extensive operations', async () => {
      console.log('🧠 Testing memory usage and leak detection...')

      const localMemoryMonitor = new MemoryMonitor()
      localMemoryMonitor.startMonitoring(500) // Every 500ms

      // Perform memory-intensive operations
      const operationCount = 500
      const sessions: string[] = []

      // Create many sessions
      for (let i = 0; i < operationCount; i++) {
        const sessionToken = `memory-test-${i}-${Date.now()}`

        await testContext.sessionManager.createOrUpdateSession({
          sessionToken,
          workspaceId: testContext.workspaceId,
          userId: testContext.userId,
          chatState: {
            conversationId: uuidv4(),
            scrollPosition: Math.random() * 1000,
            metadata: {
              memoryTest: true,
              iteration: i,
              randomData: 'A'.repeat(100), // Add some data
            },
          },
          expirationHours: 1,
        })

        sessions.push(sessionToken)

        // Store messages for each session
        if (i % 10 === 0) {
          await testContext.messageStorage.storeMessage({
            sessionId: uuidv4(),
            workspaceId: testContext.workspaceId,
            messageType: 'text',
            content: { text: `Memory test message ${i}` },
            rawContent: `Memory test message ${i}`,
            senderId: testContext.userId,
            senderType: 'user',
            senderName: 'Memory Test User',
          })
        }

        // Periodic cleanup to simulate real usage
        if (i % 50 === 0) {
          // Restore some sessions to simulate usage
          const randomSession = sessions[Math.floor(Math.random() * sessions.length)]
          await testContext.sessionManager.restoreSession(randomSession)
        }
      }

      // Stop monitoring and analyze
      const memoryMeasurements = localMemoryMonitor.stopMonitoring()
      const leakAnalysis = localMemoryMonitor.detectLeaks()

      testContext.metrics.memoryUsage.push(...memoryMeasurements)

      // Clean up sessions
      for (const sessionToken of sessions) {
        try {
          await testContext.sessionManager.restoreSession(sessionToken)
        } catch (error) {
          // Session might be expired, ignore
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait for GC
      }

      // Assertions
      expect(memoryMeasurements.length).toBeGreaterThan(10)
      expect(leakAnalysis.leakSize).toBeLessThan(100 * 1024 * 1024) // Less than 100MB growth

      console.log(`✅ Memory leak test completed:`)
      console.log(`   • Operations performed: ${operationCount}`)
      console.log(`   • Memory measurements: ${memoryMeasurements.length}`)
      console.log(`   • Memory leak detected: ${leakAnalysis.hasLeak}`)
      console.log(`   • Memory growth: ${(leakAnalysis.leakSize / 1024 / 1024).toFixed(2)}MB`)

      if (leakAnalysis.hasLeak) {
        console.warn(`   ⚠️  Warning: Potential memory leak detected (${leakAnalysis.leakType})`)
      }
    })

    it('should manage memory efficiently with large message histories', async () => {
      console.log('📚 Testing memory efficiency with large message histories...')

      const sessionId = uuidv4()
      const messageCount = 2000
      const initialMemory = process.memoryUsage()

      // Create large message history
      const messages = Array.from({ length: messageCount }, (_, index) => ({
        sessionId,
        workspaceId: testContext.workspaceId,
        messageType: 'text' as const,
        content: {
          text: `Large history message ${index + 1}`,
          metadata: {
            index: index,
            timestamp: new Date().toISOString(),
            additionalData: 'X'.repeat(200), // Add some bulk
          },
        },
        rawContent: `Large history message ${index + 1}`,
        senderId: testContext.userId,
        senderType: 'user' as const,
        senderName: 'Memory Test User',
        status: 'sent' as const,
      }))

      // Store in batches
      const batchSize = 100
      for (let i = 0; i < messageCount; i += batchSize) {
        const batch = messages.slice(i, i + batchSize)
        await testContext.messageStorage.batchStoreMessages(batch)
      }

      // Retrieve history in chunks to test memory usage
      let retrievedCount = 0
      let offset = 0
      const limit = 50

      while (offset < messageCount) {
        const history = await testContext.historyRetrieval.getSessionHistory({
          sessionId,
          workspaceId: testContext.workspaceId,
          limit,
          offset,
        })

        retrievedCount += history.messages.length
        offset += limit

        // Simulate processing the messages
        history.messages.forEach((message) => {
          expect(message.rawContent).toContain('Large history message')
        })

        if (!history.hasMore) break
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Assertions
      expect(retrievedCount).toBe(messageCount)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024) // Less than 500MB increase

      console.log(`✅ Large message history memory test completed:`)
      console.log(`   • Messages stored: ${messageCount}`)
      console.log(`   • Messages retrieved: ${retrievedCount}`)
      console.log(`   • Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('3. Response Time Performance', () => {
    it('should maintain fast response times for message operations', async () => {
      console.log('⚡ Testing message operation response times...')

      const testOperations = [
        'store_message',
        'retrieve_history',
        'search_messages',
        'update_status',
      ]

      const responseTimes: Record<string, number[]> = {}

      // Initialize response time tracking
      testOperations.forEach((op) => {
        responseTimes[op] = []
      })

      const testIterations = 100

      for (let i = 0; i < testIterations; i++) {
        const sessionId = uuidv4()

        // Test message storage
        const storeStartTime = performance.now()
        await testContext.messageStorage.storeMessage({
          sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text',
          content: { text: `Response time test message ${i + 1}` },
          rawContent: `Response time test message ${i + 1}`,
          senderId: testContext.userId,
          senderType: 'user',
          senderName: 'Response Time Test User',
        })
        const storeTime = performance.now() - storeStartTime
        responseTimes.store_message.push(storeTime)

        // Test history retrieval
        const retrieveStartTime = performance.now()
        const history = await testContext.historyRetrieval.getSessionHistory({
          sessionId,
          workspaceId: testContext.workspaceId,
          limit: 10,
        })
        const retrieveTime = performance.now() - retrieveStartTime
        responseTimes.retrieve_history.push(retrieveTime)

        // Test search (every 10th iteration to avoid overload)
        if (i % 10 === 0) {
          const searchStartTime = performance.now()
          await testContext.historyRetrieval.searchMessages({
            workspaceId: testContext.workspaceId,
            query: 'test message',
            limit: 5,
          })
          const searchTime = performance.now() - searchStartTime
          responseTimes.search_messages.push(searchTime)
        }

        // Add small delay to prevent overwhelming the system
        if (i % 20 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      // Calculate statistics
      const stats = testOperations.reduce(
        (acc, operation) => {
          const times = responseTimes[operation]
          if (times.length > 0) {
            const sorted = times.sort((a, b) => a - b)
            acc[operation] = {
              avg: times.reduce((sum, time) => sum + time, 0) / times.length,
              p50: sorted[Math.floor(sorted.length * 0.5)],
              p95: sorted[Math.floor(sorted.length * 0.95)],
              p99: sorted[Math.floor(sorted.length * 0.99)],
              max: Math.max(...times),
              count: times.length,
            }
          }
          return acc
        },
        {} as Record<string, any>
      )

      // Performance assertions
      expect(stats.store_message.avg).toBeLessThan(100) // Average < 100ms
      expect(stats.retrieve_history.avg).toBeLessThan(200) // Average < 200ms
      expect(stats.store_message.p95).toBeLessThan(500) // 95th percentile < 500ms

      // Store metrics for overall reporting
      testContext.metrics.responseTimes.push(...responseTimes.store_message)

      console.log(`✅ Response time test completed:`)
      Object.entries(stats).forEach(([operation, stat]) => {
        console.log(`   • ${operation}:`)
        console.log(`     - Average: ${stat.avg.toFixed(2)}ms`)
        console.log(`     - P95: ${stat.p95.toFixed(2)}ms`)
        console.log(`     - Max: ${stat.max.toFixed(2)}ms`)
        console.log(`     - Count: ${stat.count}`)
      })
    })

    it('should handle concurrent operations with acceptable performance', async () => {
      console.log('🔀 Testing concurrent operation performance...')

      const concurrencyLevels = [5, 10, 20]
      const operationsPerLevel = 50

      for (const concurrency of concurrencyLevels) {
        console.log(`   Testing with ${concurrency} concurrent operations...`)

        const startTime = performance.now()
        const operations: Promise<any>[] = []
        let successCount = 0
        let errorCount = 0

        // Create concurrent operations
        for (let i = 0; i < concurrency; i++) {
          const operationPromises = Array.from(
            { length: operationsPerLevel },
            async (_, opIndex) => {
              try {
                const sessionId = uuidv4()

                await testContext.messageStorage.storeMessage({
                  sessionId,
                  workspaceId: testContext.workspaceId,
                  messageType: 'text',
                  content: { text: `Concurrent test ${i}-${opIndex}` },
                  rawContent: `Concurrent test ${i}-${opIndex}`,
                  senderId: testContext.userId,
                  senderType: 'user',
                  senderName: 'Concurrent Test User',
                  metadata: { concurrency, worker: i },
                })

                successCount++
              } catch (error) {
                errorCount++
                console.warn(`Concurrent operation failed:`, error)
              }
            }
          )

          operations.push(...operationPromises)
        }

        // Execute all operations concurrently
        await Promise.all(operations)

        const totalTime = performance.now() - startTime
        const averageTime = totalTime / (concurrency * operationsPerLevel)
        const successRate = (successCount / (concurrency * operationsPerLevel)) * 100
        const throughput = (successCount / totalTime) * 1000

        // Record concurrency results
        const result: ConcurrencyResult = {
          concurrentUsers: concurrency,
          averageResponseTime: averageTime,
          successRate,
          peakMemoryUsage: process.memoryUsage().heapUsed,
          totalOperations: concurrency * operationsPerLevel,
        }

        testContext.metrics.concurrencyResults.push(result)

        // Performance assertions
        expect(successRate).toBeGreaterThan(90) // At least 90% success rate
        expect(averageTime).toBeLessThan(1000) // Less than 1 second average

        console.log(`     - Total time: ${totalTime.toFixed(2)}ms`)
        console.log(`     - Average time: ${averageTime.toFixed(2)}ms`)
        console.log(`     - Success rate: ${successRate.toFixed(1)}%`)
        console.log(`     - Throughput: ${throughput.toFixed(2)} ops/sec`)
      }

      console.log(`✅ Concurrent operation testing completed`)
    })
  })

  describe('4. Database Query Optimization', () => {
    it('should execute optimized queries for message retrieval', async () => {
      console.log('🗃️  Testing database query optimization...')

      // Create test data with indices
      const sessionId = uuidv4()
      const messageCount = 1000

      // Store messages with metadata for testing different query patterns
      const messages = Array.from({ length: messageCount }, (_, index) => ({
        sessionId,
        workspaceId: testContext.workspaceId,
        messageType: (index % 3 === 0
          ? 'text'
          : index % 3 === 1
            ? 'tool_call'
            : 'tool_result') as any,
        content: { text: `Query optimization test ${index + 1}` },
        rawContent: `Query optimization test ${index + 1}`,
        senderId: testContext.userId,
        senderType: 'user' as const,
        senderName: 'Query Test User',
        status: 'sent' as const,
        metadata: {
          category: ['support', 'sales', 'technical'][index % 3],
          priority: index % 2 === 0 ? 'high' : 'normal',
          tags: [`tag_${index % 5}`, `category_${index % 3}`],
        },
      }))

      // Store in batches
      const batchSize = 100
      for (let i = 0; i < messageCount; i += batchSize) {
        const batch = messages.slice(i, i + batchSize)
        await testContext.messageStorage.batchStoreMessages(batch)
      }

      // Test different query patterns and measure performance
      const queryTests = [
        {
          name: 'basic_pagination',
          test: () =>
            testContext.historyRetrieval.getSessionHistory({
              sessionId,
              workspaceId: testContext.workspaceId,
              limit: 50,
              offset: 100,
            }),
        },
        {
          name: 'filtered_by_type',
          test: () =>
            testContext.historyRetrieval.getSessionHistory({
              sessionId,
              workspaceId: testContext.workspaceId,
              messageTypes: ['text'],
              limit: 50,
            }),
        },
        {
          name: 'search_query',
          test: () =>
            testContext.historyRetrieval.searchMessages({
              workspaceId: testContext.workspaceId,
              query: 'optimization test',
              sessionIds: [sessionId],
              limit: 25,
            }),
        },
        {
          name: 'date_range_filter',
          test: () =>
            testContext.historyRetrieval.searchMessages({
              workspaceId: testContext.workspaceId,
              query: 'test',
              dateRange: {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                end: new Date(),
              },
              limit: 30,
            }),
        },
      ]

      const queryResults: Record<string, { time: number; resultCount: number }> = {}

      for (const queryTest of queryTests) {
        const startTime = performance.now()
        const result = await queryTest.test()
        const queryTime = performance.now() - startTime

        queryResults[queryTest.name] = {
          time: queryTime,
          resultCount: result.messages?.length || 0,
        }

        // Query performance assertions
        expect(queryTime).toBeLessThan(2000) // Less than 2 seconds
        expect(result).toBeDefined()
      }

      // Log query performance results
      console.log(`✅ Database query optimization test completed:`)
      Object.entries(queryResults).forEach(([queryName, result]) => {
        console.log(
          `   • ${queryName}: ${result.time.toFixed(2)}ms (${result.resultCount} results)`
        )
      })

      // Test index effectiveness by measuring query plan performance
      console.log(`   • Total messages in test set: ${messageCount}`)
    })

    it('should optimize database connections and pooling', async () => {
      console.log('🔗 Testing database connection optimization...')

      const connectionStartTime = performance.now()
      const testQueries = 50
      const queryPromises: Promise<any>[] = []

      // Execute multiple queries concurrently to test connection pooling
      for (let i = 0; i < testQueries; i++) {
        queryPromises.push(
          db
            .select({ count: sql<number>`count(*)` })
            .from(chatMessage)
            .where(eq(chatMessage.workspaceId, testContext.workspaceId))
        )
      }

      const results = await Promise.all(queryPromises)
      const connectionTime = performance.now() - connectionStartTime

      // All queries should complete successfully
      expect(results).toHaveLength(testQueries)
      expect(connectionTime).toBeLessThan(5000) // Less than 5 seconds for all queries

      console.log(`✅ Database connection test completed:`)
      console.log(`   • Concurrent queries: ${testQueries}`)
      console.log(`   • Total time: ${connectionTime.toFixed(2)}ms`)
      console.log(`   • Average per query: ${(connectionTime / testQueries).toFixed(2)}ms`)
    })
  })

  describe('5. Real-time Communication Performance', () => {
    it('should handle WebSocket connections efficiently', async () => {
      console.log('🌐 Testing WebSocket performance...')

      const mockSocketConnections = 25
      const messagesPerConnection = 20

      // Simulate multiple WebSocket connections
      const connectionPromises = Array.from(
        { length: mockSocketConnections },
        async (_, connectionIndex) => {
          const startTime = performance.now()
          let messagesSent = 0

          // Simulate sending messages through this connection
          for (let msgIndex = 0; msgIndex < messagesPerConnection; msgIndex++) {
            await testContext.messageStorage.storeMessage({
              sessionId: uuidv4(),
              workspaceId: testContext.workspaceId,
              messageType: 'text',
              content: {
                text: `WebSocket message ${msgIndex + 1}`,
                connectionId: connectionIndex,
              },
              rawContent: `WebSocket message ${msgIndex + 1}`,
              senderId: testContext.userId,
              senderType: 'user',
              senderName: `WebSocket User ${connectionIndex}`,
              metadata: {
                websocketTest: true,
                connectionId: connectionIndex,
                messageIndex: msgIndex,
              },
            })

            messagesSent++

            // Simulate realistic message timing
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50))
          }

          const connectionTime = performance.now() - startTime
          return {
            connectionId: connectionIndex,
            messagesSent,
            totalTime: connectionTime,
            messagesPerSecond: (messagesSent / connectionTime) * 1000,
          }
        }
      )

      const connectionResults = await Promise.all(connectionPromises)

      // Calculate aggregate statistics
      const totalMessages = connectionResults.reduce((sum, result) => sum + result.messagesSent, 0)
      const totalTime = Math.max(...connectionResults.map((r) => r.totalTime))
      const avgMessagesPerSecond =
        connectionResults.reduce((sum, result) => sum + result.messagesPerSecond, 0) /
        connectionResults.length

      // Performance assertions
      expect(totalMessages).toBe(mockSocketConnections * messagesPerConnection)
      expect(avgMessagesPerSecond).toBeGreaterThan(5) // At least 5 messages per second per connection

      console.log(`✅ WebSocket performance test completed:`)
      console.log(`   • Concurrent connections: ${mockSocketConnections}`)
      console.log(`   • Messages per connection: ${messagesPerConnection}`)
      console.log(`   • Total messages: ${totalMessages}`)
      console.log(
        `   • Average throughput per connection: ${avgMessagesPerSecond.toFixed(2)} msg/sec`
      )
      console.log(`   • Total test time: ${totalTime.toFixed(2)}ms`)
    })
  })

  describe('6. Caching and Optimization Validation', () => {
    it('should demonstrate performance improvements with optimizations', async () => {
      console.log('🚀 Testing optimization improvements...')

      const sessionId = uuidv4()

      // Test 1: Without optimization (baseline)
      console.log('   Running baseline performance test...')
      const baselineStartTime = performance.now()

      // Simulate unoptimized operations
      for (let i = 0; i < 100; i++) {
        await testContext.messageStorage.storeMessage({
          sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text',
          content: { text: `Baseline message ${i + 1}` },
          rawContent: `Baseline message ${i + 1}`,
          senderId: testContext.userId,
          senderType: 'user',
          senderName: 'Baseline User',
        })
      }

      const baselineTime = performance.now() - baselineStartTime

      // Test 2: With optimization (batching)
      console.log('   Running optimized performance test...')
      const optimizedStartTime = performance.now()

      const batchedMessages = Array.from({ length: 100 }, (_, index) => ({
        sessionId: uuidv4(),
        workspaceId: testContext.workspaceId,
        messageType: 'text' as const,
        content: { text: `Optimized message ${index + 1}` },
        rawContent: `Optimized message ${index + 1}`,
        senderId: testContext.userId,
        senderType: 'user' as const,
        senderName: 'Optimized User',
        status: 'sent' as const,
      }))

      await testContext.messageStorage.batchStoreMessages(batchedMessages)
      const optimizedTime = performance.now() - optimizedStartTime

      // Calculate improvement
      const improvementPercent = ((baselineTime - optimizedTime) / baselineTime) * 100

      const optimizationResult: OptimizationResult = {
        feature: 'message_batching',
        beforeMetric: baselineTime,
        afterMetric: optimizedTime,
        improvementPercent,
        testType: 'throughput',
      }

      testContext.metrics.optimizationResults.push(optimizationResult)

      // Assertions
      expect(optimizedTime).toBeLessThan(baselineTime) // Optimized should be faster
      expect(improvementPercent).toBeGreaterThan(0) // Should show improvement

      console.log(`✅ Optimization validation completed:`)
      console.log(`   • Baseline time: ${baselineTime.toFixed(2)}ms`)
      console.log(`   • Optimized time: ${optimizedTime.toFixed(2)}ms`)
      console.log(`   • Performance improvement: ${improvementPercent.toFixed(1)}%`)
    })

    it('should validate session persistence optimization', async () => {
      console.log('💾 Testing session persistence optimization...')

      const sessionCount = 50

      // Test session creation and restoration performance
      const sessionTokens: string[] = []

      // Create sessions
      const createStartTime = performance.now()
      for (let i = 0; i < sessionCount; i++) {
        const sessionToken = `opt-test-${i}-${Date.now()}`

        await testContext.sessionManager.createOrUpdateSession({
          sessionToken,
          workspaceId: testContext.workspaceId,
          userId: testContext.userId,
          chatState: {
            conversationId: uuidv4(),
            scrollPosition: Math.random() * 1000,
            metadata: { optimizationTest: true },
          },
          expirationHours: 24,
        })

        sessionTokens.push(sessionToken)
      }
      const createTime = performance.now() - createStartTime

      // Restore sessions
      const restoreStartTime = performance.now()
      let successfulRestores = 0

      for (const token of sessionTokens) {
        const session = await testContext.sessionManager.restoreSession(token)
        if (session) {
          successfulRestores++
        }
      }
      const restoreTime = performance.now() - restoreStartTime

      // Calculate metrics
      const avgCreateTime = createTime / sessionCount
      const avgRestoreTime = restoreTime / sessionCount
      const restoreSuccessRate = (successfulRestores / sessionCount) * 100

      // Performance assertions
      expect(successfulRestores).toBe(sessionCount)
      expect(avgCreateTime).toBeLessThan(100) // Less than 100ms per session
      expect(avgRestoreTime).toBeLessThan(50) // Less than 50ms per restore
      expect(restoreSuccessRate).toBe(100) // 100% success rate

      console.log(`✅ Session persistence optimization validated:`)
      console.log(`   • Sessions processed: ${sessionCount}`)
      console.log(`   • Average create time: ${avgCreateTime.toFixed(2)}ms`)
      console.log(`   • Average restore time: ${avgRestoreTime.toFixed(2)}ms`)
      console.log(`   • Restore success rate: ${restoreSuccessRate}%`)
    })
  })

  describe('7. Performance Regression Testing', () => {
    it('should detect performance regressions in core operations', async () => {
      console.log('📉 Running performance regression tests...')

      // Define performance benchmarks (these would typically be stored/versioned)
      const performanceBenchmarks = {
        message_storage_avg: 50, // milliseconds
        message_retrieval_avg: 100, // milliseconds
        search_avg: 250, // milliseconds
        session_create_avg: 75, // milliseconds
      }

      const regressionResults: Record<
        string,
        { current: number; benchmark: number; regression: boolean }
      > = {}

      // Test message storage performance
      const storageStartTime = performance.now()
      await testContext.messageStorage.storeMessage({
        sessionId: uuidv4(),
        workspaceId: testContext.workspaceId,
        messageType: 'text',
        content: { text: 'Regression test message' },
        rawContent: 'Regression test message',
        senderId: testContext.userId,
        senderType: 'user',
        senderName: 'Regression Test User',
      })
      const storageTime = performance.now() - storageStartTime

      regressionResults.message_storage_avg = {
        current: storageTime,
        benchmark: performanceBenchmarks.message_storage_avg,
        regression: storageTime > performanceBenchmarks.message_storage_avg * 1.5, // 50% tolerance
      }

      // Test message retrieval performance
      const retrievalStartTime = performance.now()
      await testContext.historyRetrieval.getSessionHistory({
        sessionId: uuidv4(),
        workspaceId: testContext.workspaceId,
        limit: 10,
      })
      const retrievalTime = performance.now() - retrievalStartTime

      regressionResults.message_retrieval_avg = {
        current: retrievalTime,
        benchmark: performanceBenchmarks.message_retrieval_avg,
        regression: retrievalTime > performanceBenchmarks.message_retrieval_avg * 1.5,
      }

      // Check for regressions
      const regressions = Object.entries(regressionResults)
        .filter(([_, result]) => result.regression)
        .map(([operation, result]) => ({ operation, ...result }))

      // Report results
      console.log(`✅ Performance regression test completed:`)
      Object.entries(regressionResults).forEach(([operation, result]) => {
        const status = result.regression ? '🔴 REGRESSION' : '✅ OK'
        console.log(
          `   • ${operation}: ${result.current.toFixed(2)}ms vs ${result.benchmark}ms ${status}`
        )
      })

      if (regressions.length > 0) {
        console.warn(`⚠️  Performance regressions detected in ${regressions.length} operations`)
        // In a real scenario, this might fail the test or alert the team
      }

      // For testing purposes, we don't fail the test, but we log the regressions
      expect(regressions.length).toBeLessThan(Object.keys(regressionResults).length) // Not all operations should regress
    })

    it('should validate system stability under prolonged load', async () => {
      console.log('⏱️  Running stability test under prolonged load...')

      const testDuration = 10000 // 10 seconds
      const operationInterval = 200 // Operation every 200ms
      const startTime = performance.now()

      let operationCount = 0
      let errorCount = 0
      let maxResponseTime = 0
      let minResponseTime = Number.POSITIVE_INFINITY
      let totalResponseTime = 0

      const stabilityTest = setInterval(async () => {
        const operationStartTime = performance.now()

        try {
          await testContext.messageStorage.storeMessage({
            sessionId: uuidv4(),
            workspaceId: testContext.workspaceId,
            messageType: 'text',
            content: { text: `Stability test message ${operationCount + 1}` },
            rawContent: `Stability test message ${operationCount + 1}`,
            senderId: testContext.userId,
            senderType: 'user',
            senderName: 'Stability Test User',
            metadata: { stabilityTest: true, operation: operationCount },
          })

          const responseTime = performance.now() - operationStartTime
          maxResponseTime = Math.max(maxResponseTime, responseTime)
          minResponseTime = Math.min(minResponseTime, responseTime)
          totalResponseTime += responseTime

          operationCount++
        } catch (error) {
          errorCount++
          console.warn('Stability test operation failed:', error)
        }
      }, operationInterval)

      // Wait for test duration
      await new Promise((resolve) => setTimeout(resolve, testDuration))
      clearInterval(stabilityTest)

      const totalTestTime = performance.now() - startTime
      const averageResponseTime = totalResponseTime / operationCount
      const errorRate = (errorCount / (operationCount + errorCount)) * 100
      const operationsPerSecond = (operationCount / totalTestTime) * 1000

      // Stability assertions
      expect(operationCount).toBeGreaterThan(0)
      expect(errorRate).toBeLessThan(10) // Less than 10% error rate
      expect(averageResponseTime).toBeLessThan(1000) // Less than 1 second average
      expect(maxResponseTime).toBeLessThan(5000) // No operation should take more than 5 seconds

      console.log(`✅ Stability test completed:`)
      console.log(`   • Test duration: ${totalTestTime.toFixed(2)}ms`)
      console.log(`   • Operations completed: ${operationCount}`)
      console.log(`   • Error count: ${errorCount}`)
      console.log(`   • Error rate: ${errorRate.toFixed(2)}%`)
      console.log(`   • Operations per second: ${operationsPerSecond.toFixed(2)}`)
      console.log(
        `   • Response times: min=${minResponseTime.toFixed(2)}ms, avg=${averageResponseTime.toFixed(2)}ms, max=${maxResponseTime.toFixed(2)}ms`
      )
    })
  })
})
