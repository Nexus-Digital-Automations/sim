/**
 * @vitest-environment node
 *
 * Parlant Database Performance Tests
 *
 * Performance and scalability tests for Parlant database operations,
 * including bulk operations, complex queries, and concurrent access patterns.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@sim/db'
import { sql } from 'drizzle-orm'
import {
  parlantAgent,
  parlantSession,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantVariable,
  parlantTool,
  parlantTerm,
  parlantCannedResponse,
  parlantAgentTool,
  parlantJourneyGuideline,
  parlantAgentKnowledgeBase,
  parlantToolIntegration,
  workspace,
  user,
  knowledgeBase,
  embedding,
} from '@sim/db/schema'
import { eq, count, desc, and, gte, lte, inArray } from 'drizzle-orm'

interface PerformanceMetrics {
  operation: string
  duration: number
  recordCount: number
  throughputPerSecond: number
  memoryUsage?: NodeJS.MemoryUsage
}

interface TestContext {
  workspaceId: string
  userId: string
  knowledgeBaseId: string
  metrics: PerformanceMetrics[]
}

describe('Parlant Database Performance Tests', () => {
  let ctx: TestContext

  // Performance test configuration
  const BULK_INSERT_SIZE = 1000
  const LARGE_DATASET_SIZE = 5000
  const CONCURRENT_OPERATIONS = 10
  const PERFORMANCE_THRESHOLD_MS = 5000 // 5 seconds max for most operations

  beforeEach(async () => {
    const userResult = await db
      .insert(user)
      .values({
        id: `perfuser-${Date.now()}`,
        name: 'Performance Test User',
        email: `perf-${Date.now()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: user.id })

    const workspaceResult = await db
      .insert(workspace)
      .values({
        id: `perfworkspace-${Date.now()}`,
        name: 'Performance Test Workspace',
        ownerId: userResult[0].id,
      })
      .returning({ id: workspace.id })

    const kbResult = await db
      .insert(knowledgeBase)
      .values({
        id: `perfkb-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Performance Test KB',
      })
      .returning({ id: knowledgeBase.id })

    ctx = {
      workspaceId: workspaceResult[0].id,
      userId: userResult[0].id,
      knowledgeBaseId: kbResult[0].id,
      metrics: [],
    }
  })

  afterEach(async () => {
    // Performance-oriented cleanup - use cascading deletes efficiently
    try {
      await db.delete(workspace).where(eq(workspace.id, ctx.workspaceId))
      await db.delete(user).where(eq(user.id, ctx.userId))
    } catch (error) {
      console.warn('Performance test cleanup error:', error)
    }

    // Log performance metrics
    console.log('\n=== Performance Test Results ===')
    ctx.metrics.forEach(metric => {
      console.log(`${metric.operation}: ${metric.duration}ms (${metric.recordCount} records, ${metric.throughputPerSecond.toFixed(2)} ops/sec)`)
    })
  })

  const measurePerformance = async <T>(
    operation: string,
    recordCount: number,
    fn: () => Promise<T>
  ): Promise<T> => {
    const startMemory = process.memoryUsage()
    const startTime = performance.now()

    const result = await fn()

    const endTime = performance.now()
    const endMemory = process.memoryUsage()
    const duration = endTime - startTime

    ctx.metrics.push({
      operation,
      duration,
      recordCount,
      throughputPerSecond: recordCount / (duration / 1000),
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
      },
    })

    return result
  }

  describe('Bulk Insert Performance', () => {
    it('should handle bulk agent creation efficiently', async () => {
      const agents = Array.from({ length: BULK_INSERT_SIZE }, (_, i) => ({
        workspaceId: ctx.workspaceId,
        createdBy: ctx.userId,
        name: `Performance Agent ${i + 1}`,
        description: `Agent for performance testing batch ${i + 1}`,
        status: 'active' as const,
        compositionMode: 'fluid' as const,
        modelProvider: 'openai',
        modelName: 'gpt-4',
        temperature: 70,
        maxTokens: 2000,
      }))

      const result = await measurePerformance(
        'Bulk Agent Insert',
        BULK_INSERT_SIZE,
        () => db.insert(parlantAgent).values(agents).returning()
      )

      expect(result).toHaveLength(BULK_INSERT_SIZE)
      expect(ctx.metrics[0].duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
      expect(ctx.metrics[0].throughputPerSecond).toBeGreaterThan(100) // At least 100 agents/sec
    })

    it('should handle bulk session and event creation', async () => {
      // First create an agent for the sessions
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Session Performance Agent',
        })
        .returning()

      // Create bulk sessions
      const sessions = Array.from({ length: BULK_INSERT_SIZE }, (_, i) => ({
        agentId: agent[0].id,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        customerId: `perf-customer-${i}`,
        title: `Performance Session ${i + 1}`,
        sessionType: 'conversation',
        status: 'active' as const,
      }))

      const sessionResults = await measurePerformance(
        'Bulk Session Insert',
        BULK_INSERT_SIZE,
        () => db.insert(parlantSession).values(sessions).returning()
      )

      expect(sessionResults).toHaveLength(BULK_INSERT_SIZE)

      // Create bulk events across sessions
      const events: any[] = []
      sessionResults.slice(0, 100).forEach((session, sessionIndex) => {
        for (let eventIndex = 0; eventIndex < 10; eventIndex++) {
          events.push({
            sessionId: session.id,
            offset: eventIndex + 1,
            eventType: eventIndex % 2 === 0 ? 'customer_message' : 'agent_message',
            content: {
              message: `Performance test message ${eventIndex + 1} for session ${sessionIndex + 1}`,
              timestamp: Date.now(),
            },
          })
        }
      })

      const eventResults = await measurePerformance(
        'Bulk Event Insert',
        events.length,
        () => db.insert(parlantEvent).values(events).returning()
      )

      expect(eventResults).toHaveLength(1000) // 100 sessions * 10 events each
      expect(ctx.metrics.find(m => m.operation === 'Bulk Event Insert')?.throughputPerSecond).toBeGreaterThan(200)
    })

    it('should handle bulk tool and integration creation', async () => {
      // Create bulk tools
      const tools = Array.from({ length: BULK_INSERT_SIZE }, (_, i) => ({
        workspaceId: ctx.workspaceId,
        name: `performance_tool_${i}`,
        displayName: `Performance Tool ${i + 1}`,
        description: `Tool ${i + 1} for performance testing`,
        toolType: 'custom',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string', description: `Input for tool ${i + 1}` }
          }
        },
        returnSchema: {
          type: 'object',
          properties: {
            output: { type: 'string' }
          }
        },
        rateLimitPerMinute: 60,
        rateLimitPerHour: 1000,
        enabled: true,
      }))

      const toolResults = await measurePerformance(
        'Bulk Tool Insert',
        BULK_INSERT_SIZE,
        () => db.insert(parlantTool).values(tools).returning()
      )

      expect(toolResults).toHaveLength(BULK_INSERT_SIZE)

      // Create agent for tool associations
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Tool Performance Agent',
        })
        .returning()

      // Create bulk agent-tool relationships
      const agentTools = toolResults.slice(0, 500).map((tool, i) => ({
        agentId: agent[0].id,
        toolId: tool.id,
        configuration: { priority: i % 3 === 0 ? 'high' : 'medium' },
        enabled: true,
        priority: 100 - (i % 100), // Vary priorities
      }))

      const agentToolResults = await measurePerformance(
        'Bulk Agent-Tool Association',
        agentTools.length,
        () => db.insert(parlantAgentTool).values(agentTools).returning()
      )

      expect(agentToolResults).toHaveLength(500)
    })
  })

  describe('Complex Query Performance', () => {
    it('should efficiently execute complex analytical queries', async () => {
      // Setup test data
      const agents = await db
        .insert(parlantAgent)
        .values(
          Array.from({ length: 50 }, (_, i) => ({
            workspaceId: ctx.workspaceId,
            createdBy: ctx.userId,
            name: `Analytics Agent ${i + 1}`,
            status: i % 4 === 0 ? 'inactive' : 'active' as any,
            totalSessions: Math.floor(Math.random() * 100) + 1,
            totalMessages: Math.floor(Math.random() * 1000) + 100,
            totalTokensUsed: Math.floor(Math.random() * 50000) + 1000,
            totalCost: Math.floor(Math.random() * 1000) + 100,
          }))
        )
        .returning()

      const sessions = await db
        .insert(parlantSession)
        .values(
          agents.flatMap((agent, agentIndex) =>
            Array.from({ length: 20 }, (_, sessionIndex) => ({
              agentId: agent.id,
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              customerId: `customer-${agentIndex}-${sessionIndex}`,
              status: sessionIndex % 3 === 0 ? 'completed' : 'active' as any,
              messageCount: Math.floor(Math.random() * 50) + 1,
              tokensUsed: Math.floor(Math.random() * 500) + 50,
              cost: Math.floor(Math.random() * 100) + 10,
              satisfactionScore: sessionIndex % 5 === 0 ? null : Math.floor(Math.random() * 5) + 1,
              sessionType: ['conversation', 'support', 'onboarding'][sessionIndex % 3],
              lastActivityAt: new Date(Date.now() - Math.random() * 86400000 * 30), // Within last 30 days
            }))
          )
        )
        .returning()

      // Complex analytical query 1: Agent performance dashboard
      const dashboardQuery = await measurePerformance(
        'Agent Performance Dashboard Query',
        1,
        () => db
          .select({
            agentId: parlantAgent.id,
            agentName: parlantAgent.name,
            agentStatus: parlantAgent.status,
            totalSessions: count(parlantSession.id),
            activeSessions: sql<number>`COUNT(CASE WHEN ${parlantSession.status} = 'active' THEN 1 END)`,
            completedSessions: sql<number>`COUNT(CASE WHEN ${parlantSession.status} = 'completed' THEN 1 END)`,
            avgSatisfaction: sql<number>`ROUND(AVG(CASE WHEN ${parlantSession.satisfactionScore} IS NOT NULL THEN ${parlantSession.satisfactionScore} END), 2)`,
            totalTokensUsed: sql<number>`SUM(${parlantSession.tokensUsed})`,
            totalCost: sql<number>`SUM(${parlantSession.cost})`,
            avgSessionLength: sql<number>`ROUND(AVG(${parlantSession.messageCount}), 2)`,
            lastActivity: sql<Date>`MAX(${parlantSession.lastActivityAt})`,
            recentActivityCount: sql<number>`COUNT(CASE WHEN ${parlantSession.lastActivityAt} > CURRENT_DATE - INTERVAL '7 days' THEN 1 END)`,
          })
          .from(parlantAgent)
          .leftJoin(parlantSession, eq(parlantSession.agentId, parlantAgent.id))
          .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
          .groupBy(parlantAgent.id, parlantAgent.name, parlantAgent.status)
          .having(sql`COUNT(${parlantSession.id}) > 0`)
          .orderBy(desc(sql`SUM(${parlantSession.cost})`))
      )

      expect(dashboardQuery).toHaveLength(50)
      expect(ctx.metrics.find(m => m.operation === 'Agent Performance Dashboard Query')?.duration).toBeLessThan(1000)

      // Complex analytical query 2: Session trends over time
      const trendsQuery = await measurePerformance(
        'Session Trends Analysis',
        1,
        () => db
          .select({
            date: sql<string>`DATE(${parlantSession.lastActivityAt})`,
            sessionType: parlantSession.sessionType,
            sessionCount: count(parlantSession.id),
            avgSatisfaction: sql<number>`ROUND(AVG(CASE WHEN ${parlantSession.satisfactionScore} IS NOT NULL THEN ${parlantSession.satisfactionScore} END), 2)`,
            totalCost: sql<number>`SUM(${parlantSession.cost})`,
            avgTokensPerSession: sql<number>`ROUND(AVG(${parlantSession.tokensUsed}), 2)`,
            uniqueCustomers: sql<number>`COUNT(DISTINCT ${parlantSession.customerId})`,
          })
          .from(parlantSession)
          .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
          .where(
            and(
              eq(parlantAgent.workspaceId, ctx.workspaceId),
              gte(parlantSession.lastActivityAt, sql`CURRENT_DATE - INTERVAL '30 days'`)
            )
          )
          .groupBy(
            sql`DATE(${parlantSession.lastActivityAt})`,
            parlantSession.sessionType
          )
          .orderBy(
            desc(sql`DATE(${parlantSession.lastActivityAt})`),
            parlantSession.sessionType
          )
      )

      expect(trendsQuery.length).toBeGreaterThan(0)

      // Complex analytical query 3: Customer journey analysis
      const journeyQuery = await measurePerformance(
        'Customer Journey Analysis',
        1,
        () => db
          .select({
            customerId: parlantSession.customerId,
            totalSessions: count(parlantSession.id),
            firstSession: sql<Date>`MIN(${parlantSession.startedAt})`,
            lastSession: sql<Date>`MAX(${parlantSession.lastActivityAt})`,
            totalSpent: sql<number>`SUM(${parlantSession.cost})`,
            avgSatisfaction: sql<number>`ROUND(AVG(CASE WHEN ${parlantSession.satisfactionScore} IS NOT NULL THEN ${parlantSession.satisfactionScore} END), 2)`,
            sessionTypes: sql<string>`STRING_AGG(DISTINCT ${parlantSession.sessionType}, ', ')`,
            agentInteractions: sql<number>`COUNT(DISTINCT ${parlantSession.agentId})`,
            customerLifetimeDays: sql<number>`EXTRACT(DAY FROM MAX(${parlantSession.lastActivityAt}) - MIN(${parlantSession.startedAt}))`,
          })
          .from(parlantSession)
          .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
          .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
          .groupBy(parlantSession.customerId)
          .having(sql`COUNT(${parlantSession.id}) > 1`)
          .orderBy(desc(sql`SUM(${parlantSession.cost})`))
          .limit(100)
      )

      expect(journeyQuery.length).toBeGreaterThan(0)
      expect(ctx.metrics.find(m => m.operation === 'Customer Journey Analysis')?.duration).toBeLessThan(2000)
    })

    it('should efficiently handle pagination and filtering', async () => {
      // Create large dataset for pagination testing
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Pagination Test Agent',
        })
        .returning()

      const sessions = await db
        .insert(parlantSession)
        .values(
          Array.from({ length: LARGE_DATASET_SIZE }, (_, i) => ({
            agentId: agent[0].id,
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            customerId: `paginate-customer-${i}`,
            title: `Paginated Session ${i + 1}`,
            status: i % 3 === 0 ? 'completed' : 'active' as any,
            messageCount: Math.floor(Math.random() * 100) + 1,
            satisfactionScore: i % 7 === 0 ? null : Math.floor(Math.random() * 5) + 1,
            sessionType: ['conversation', 'support', 'onboarding'][i % 3],
            lastActivityAt: new Date(Date.now() - Math.random() * 86400000 * 60), // Within last 60 days
          }))
        )
        .returning()

      // Test pagination performance
      const pageSize = 50
      const totalPages = Math.ceil(LARGE_DATASET_SIZE / pageSize)
      let allPaginatedResults: any[] = []

      const paginationResult = await measurePerformance(
        'Paginated Query (10 pages)',
        pageSize * 10,
        async () => {
          for (let page = 0; page < 10; page++) {
            const pageResult = await db
              .select({
                id: parlantSession.id,
                title: parlantSession.title,
                status: parlantSession.status,
                messageCount: parlantSession.messageCount,
                lastActivityAt: parlantSession.lastActivityAt,
                agentName: parlantAgent.name,
              })
              .from(parlantSession)
              .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
              .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
              .orderBy(desc(parlantSession.lastActivityAt))
              .limit(pageSize)
              .offset(page * pageSize)

            allPaginatedResults.push(...pageResult)
          }
          return allPaginatedResults
        }
      )

      expect(paginationResult).toHaveLength(pageSize * 10)

      // Test filtered queries with indexes
      const filteredQuery = await measurePerformance(
        'Filtered Query Performance',
        1,
        () => db
          .select({
            id: parlantSession.id,
            title: parlantSession.title,
            status: parlantSession.status,
            satisfactionScore: parlantSession.satisfactionScore,
            sessionType: parlantSession.sessionType,
          })
          .from(parlantSession)
          .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
          .where(
            and(
              eq(parlantAgent.workspaceId, ctx.workspaceId),
              eq(parlantSession.status, 'active'),
              eq(parlantSession.sessionType, 'support'),
              gte(parlantSession.lastActivityAt, sql`CURRENT_DATE - INTERVAL '7 days'`)
            )
          )
          .orderBy(desc(parlantSession.lastActivityAt))
      )

      expect(ctx.metrics.find(m => m.operation === 'Filtered Query Performance')?.duration).toBeLessThan(500)

      // Test search-like queries
      const searchQuery = await measurePerformance(
        'Text Search Performance',
        1,
        () => db
          .select()
          .from(parlantSession)
          .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
          .where(
            and(
              eq(parlantAgent.workspaceId, ctx.workspaceId),
              sql`${parlantSession.title} ILIKE ${'%Session%'}`
            )
          )
          .limit(100)
      )

      expect(searchQuery.length).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent session creation efficiently', async () => {
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Concurrent Test Agent',
        })
        .returning()

      const concurrentOperations = Array.from({ length: CONCURRENT_OPERATIONS }, (_, i) =>
        measurePerformance(
          `Concurrent Session Creation ${i + 1}`,
          100,
          () => db
            .insert(parlantSession)
            .values(
              Array.from({ length: 100 }, (_, j) => ({
                agentId: agent[0].id,
                workspaceId: ctx.workspaceId,
                userId: ctx.userId,
                customerId: `concurrent-customer-${i}-${j}`,
                title: `Concurrent Session ${i + 1}-${j + 1}`,
              }))
            )
            .returning()
        )
      )

      const results = await Promise.all(concurrentOperations)

      expect(results.every(result => result.length === 100)).toBe(true)

      // Verify total count
      const totalSessions = await db
        .select({ count: count() })
        .from(parlantSession)
        .where(eq(parlantSession.agentId, agent[0].id))

      expect(totalSessions[0].count).toBe(CONCURRENT_OPERATIONS * 100)

      // Check that concurrent operations completed within reasonable time
      const concurrentMetrics = ctx.metrics.filter(m => m.operation.startsWith('Concurrent Session Creation'))
      const maxConcurrentTime = Math.max(...concurrentMetrics.map(m => m.duration))
      expect(maxConcurrentTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
    })

    it('should handle concurrent event insertion with proper ordering', async () => {
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Event Concurrency Agent',
        })
        .returning()

      const session = await db
        .insert(parlantSession)
        .values({
          agentId: agent[0].id,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          customerId: 'concurrent-event-customer',
        })
        .returning()

      // Simulate concurrent event creation from different processes
      const concurrentEventBatches = Array.from({ length: 5 }, (_, batchIndex) =>
        measurePerformance(
          `Concurrent Event Batch ${batchIndex + 1}`,
          100,
          () => {
            const events = Array.from({ length: 100 }, (_, eventIndex) => ({
              sessionId: session[0].id,
              offset: batchIndex * 100 + eventIndex + 1,
              eventType: eventIndex % 2 === 0 ? 'customer_message' : 'agent_message' as any,
              content: {
                message: `Concurrent event ${batchIndex + 1}-${eventIndex + 1}`,
                batchId: batchIndex,
                timestamp: Date.now(),
              },
            }))

            return db.insert(parlantEvent).values(events).returning()
          }
        )
      )

      const eventResults = await Promise.all(concurrentEventBatches)

      // Verify all events were inserted
      const totalEvents = await db
        .select({ count: count() })
        .from(parlantEvent)
        .where(eq(parlantEvent.sessionId, session[0].id))

      expect(totalEvents[0].count).toBe(500)

      // Verify events are properly ordered
      const orderedEvents = await db
        .select({ offset: parlantEvent.offset })
        .from(parlantEvent)
        .where(eq(parlantEvent.sessionId, session[0].id))
        .orderBy(parlantEvent.offset)

      // Check that offsets are sequential
      orderedEvents.forEach((event, index) => {
        expect(event.offset).toBe(index + 1)
      })
    })

    it('should efficiently handle concurrent complex queries', async () => {
      // Setup data for concurrent query testing
      const agents = await db
        .insert(parlantAgent)
        .values(
          Array.from({ length: 20 }, (_, i) => ({
            workspaceId: ctx.workspaceId,
            createdBy: ctx.userId,
            name: `Concurrent Query Agent ${i + 1}`,
            totalSessions: Math.floor(Math.random() * 50) + 10,
            totalMessages: Math.floor(Math.random() * 500) + 100,
          }))
        )
        .returning()

      const sessions = await db
        .insert(parlantSession)
        .values(
          agents.flatMap(agent =>
            Array.from({ length: 25 }, (_, i) => ({
              agentId: agent.id,
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              customerId: `concurrent-query-customer-${agent.id}-${i}`,
              status: i % 3 === 0 ? 'completed' : 'active' as any,
              messageCount: Math.floor(Math.random() * 30) + 5,
              cost: Math.floor(Math.random() * 50) + 10,
            }))
          )
        )
        .returning()

      // Execute multiple complex queries concurrently
      const concurrentQueries = [
        measurePerformance('Concurrent Agent Stats Query', 1, () =>
          db
            .select({
              agentId: parlantAgent.id,
              agentName: parlantAgent.name,
              sessionCount: count(parlantSession.id),
              totalCost: sql<number>`SUM(${parlantSession.cost})`,
            })
            .from(parlantAgent)
            .leftJoin(parlantSession, eq(parlantSession.agentId, parlantAgent.id))
            .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
            .groupBy(parlantAgent.id, parlantAgent.name)
            .orderBy(desc(sql`SUM(${parlantSession.cost})`))
        ),

        measurePerformance('Concurrent Session Summary Query', 1, () =>
          db
            .select({
              status: parlantSession.status,
              count: count(parlantSession.id),
              avgMessages: sql<number>`ROUND(AVG(${parlantSession.messageCount}), 2)`,
              totalCost: sql<number>`SUM(${parlantSession.cost})`,
            })
            .from(parlantSession)
            .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
            .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
            .groupBy(parlantSession.status)
        ),

        measurePerformance('Concurrent Top Customers Query', 1, () =>
          db
            .select({
              customerId: parlantSession.customerId,
              sessionCount: count(parlantSession.id),
              totalSpent: sql<number>`SUM(${parlantSession.cost})`,
              lastActivity: sql<Date>`MAX(${parlantSession.lastActivityAt})`,
            })
            .from(parlantSession)
            .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
            .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
            .groupBy(parlantSession.customerId)
            .orderBy(desc(sql`SUM(${parlantSession.cost})`))
            .limit(50)
        ),
      ]

      const queryResults = await Promise.all(concurrentQueries)

      // Verify all queries completed successfully
      expect(queryResults[0].length).toBeGreaterThan(0) // Agent stats
      expect(queryResults[1].length).toBeGreaterThan(0) // Session summary
      expect(queryResults[2].length).toBeGreaterThan(0) // Top customers

      // Verify concurrent query performance
      const queryMetrics = ctx.metrics.filter(m => m.operation.startsWith('Concurrent'))
      const maxQueryTime = Math.max(...queryMetrics.map(m => m.duration))
      expect(maxQueryTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage()

      // Perform memory-intensive operations
      await measurePerformance('Memory Test - Large Dataset Creation', LARGE_DATASET_SIZE * 2, async () => {
        const agent = await db
          .insert(parlantAgent)
          .values({
            workspaceId: ctx.workspaceId,
            createdBy: ctx.userId,
            name: 'Memory Test Agent',
          })
          .returning()

        // Create large number of sessions
        const sessions = await db
          .insert(parlantSession)
          .values(
            Array.from({ length: LARGE_DATASET_SIZE }, (_, i) => ({
              agentId: agent[0].id,
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              customerId: `memory-customer-${i}`,
              title: `Memory Test Session ${i + 1}`,
              metadata: {
                largeData: Array(100).fill(`Data chunk ${i}`), // Add some bulk to test memory
                index: i,
                timestamp: Date.now(),
              },
            }))
          )
          .returning()

        // Create events for some sessions
        const events = sessions.slice(0, 1000).flatMap((session, sessionIndex) =>
          Array.from({ length: 10 }, (_, eventIndex) => ({
            sessionId: session.id,
            offset: eventIndex + 1,
            eventType: eventIndex % 2 === 0 ? 'customer_message' : 'agent_message' as any,
            content: {
              message: `Memory test message ${eventIndex + 1} for session ${sessionIndex + 1}`,
              metadata: {
                sessionIndex,
                eventIndex,
                largePayload: Array(50).fill(`Event data ${sessionIndex}-${eventIndex}`),
              },
            },
          }))
        )

        await db.insert(parlantEvent).values(events)

        return { sessions: sessions.length, events: events.length }
      })

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseKB = memoryIncrease / 1024

      // Memory usage should be reasonable (less than 500MB increase)
      expect(memoryIncreaseKB).toBeLessThan(500 * 1024)

      console.log(`Memory usage increased by ${(memoryIncreaseKB / 1024).toFixed(2)}MB`)
    })

    it('should handle streaming/pagination efficiently for large datasets', async () => {
      // Setup large dataset
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Streaming Test Agent',
        })
        .returning()

      await db
        .insert(parlantSession)
        .values(
          Array.from({ length: LARGE_DATASET_SIZE }, (_, i) => ({
            agentId: agent[0].id,
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            customerId: `streaming-customer-${i}`,
            messageCount: Math.floor(Math.random() * 50) + 1,
            cost: Math.floor(Math.random() * 100) + 10,
            lastActivityAt: new Date(Date.now() - Math.random() * 86400000 * 30),
          }))
        )

      // Test efficient streaming/chunked processing
      const chunkSize = 1000
      let processedCount = 0
      let totalCost = 0

      const streamingResult = await measurePerformance(
        'Streaming Large Dataset Processing',
        LARGE_DATASET_SIZE,
        async () => {
          let offset = 0
          let hasMore = true

          while (hasMore) {
            const chunk = await db
              .select({
                id: parlantSession.id,
                cost: parlantSession.cost,
                lastActivityAt: parlantSession.lastActivityAt,
              })
              .from(parlantSession)
              .where(eq(parlantSession.agentId, agent[0].id))
              .orderBy(desc(parlantSession.lastActivityAt))
              .limit(chunkSize)
              .offset(offset)

            if (chunk.length === 0) {
              hasMore = false
              break
            }

            // Simulate processing each chunk
            chunk.forEach(session => {
              totalCost += session.cost || 0
              processedCount++
            })

            offset += chunkSize
            hasMore = chunk.length === chunkSize
          }

          return { processedCount, totalCost }
        }
      )

      expect(streamingResult.processedCount).toBe(LARGE_DATASET_SIZE)
      expect(streamingResult.totalCost).toBeGreaterThan(0)

      // Streaming should be faster than loading all at once
      const streamingMetric = ctx.metrics.find(m => m.operation === 'Streaming Large Dataset Processing')
      expect(streamingMetric?.duration).toBeLessThan(3000)
    })
  })
})