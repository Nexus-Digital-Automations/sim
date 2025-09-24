/**
 * @vitest-environment node
 *
 * Concurrent Access and Transaction Tests
 *
 * Comprehensive testing suite for database concurrency, transaction handling,
 * and race condition prevention in Parlant database operations.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@sim/db'
import { sql } from 'drizzle-orm'
import {
  parlantAgents,
  parlantSessions,
  parlantEvents,
  parlantVariables,
  parlantJourneyStates,
  type ParlantAgent,
  type ParlantSession,
  type ParlantEvent,
  type ParlantVariable
} from '@sim/db'

// Test utilities for concurrent operations
class ConcurrentTestHelper {
  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async runConcurrentOperations<T>(
    operations: Array<() => Promise<T>>,
    maxConcurrency: number = 10
  ): Promise<T[]> {
    const results: T[] = []
    const chunks = []

    for (let i = 0; i < operations.length; i += maxConcurrency) {
      chunks.push(operations.slice(i, i + maxConcurrency))
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map(op => op()))
      results.push(...chunkResults)
    }

    return results
  }

  static async raceOperations<T>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> {
    return await Promise.allSettled(operations.map(op => op()))
      .then(results =>
        results.map((result, index) => {
          if (result.status === 'rejected') {
            throw new Error(`Operation ${index} failed: ${result.reason}`)
          }
          return result.value
        })
      )
  }
}

describe('Concurrent Access and Transaction Tests', () => {
  const testWorkspaceId = 'test-workspace-concurrent'
  let testAgents: ParlantAgent[] = []
  let testSessions: ParlantSession[] = []

  beforeEach(async () => {
    // Clean up test data
    await db.delete(parlantEvents).where(sql`workspace_id = ${testWorkspaceId}`)
    await db.delete(parlantVariables).where(sql`agent_id IN (
      SELECT id FROM parlant_agents WHERE workspace_id = ${testWorkspaceId}
    )`)
    await db.delete(parlantJourneyStates).where(sql`journey_id IN (
      SELECT id FROM parlant_journeys WHERE workspace_id = ${testWorkspaceId}
    )`)
    await db.delete(parlantSessions).where(sql`workspace_id = ${testWorkspaceId}`)
    await db.delete(parlantAgents).where(sql`workspace_id = ${testWorkspaceId}`)
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(parlantEvents).where(sql`workspace_id = ${testWorkspaceId}`)
    await db.delete(parlantVariables).where(sql`agent_id IN (
      SELECT id FROM parlant_agents WHERE workspace_id = ${testWorkspaceId}
    )`)
    await db.delete(parlantJourneyStates).where(sql`journey_id IN (
      SELECT id FROM parlant_journeys WHERE workspace_id = ${testWorkspaceId}
    )`)
    await db.delete(parlantSessions).where(sql`workspace_id = ${testWorkspaceId}`)
    await db.delete(parlantAgents).where(sql`workspace_id = ${testWorkspaceId}`)
  })

  describe('Concurrent Agent Creation', () => {
    it('should handle multiple concurrent agent creations without conflicts', async () => {
      const agentCount = 20
      const operations = Array.from({ length: agentCount }, (_, index) => {
        return async () => {
          const agent = await db.insert(parlantAgents).values({
            workspaceId: testWorkspaceId,
            name: `Test Agent ${index}`,
            displayName: `Test Agent ${index}`,
            description: `Concurrent test agent ${index}`,
            systemPrompt: 'You are a test agent',
            agentType: 'customer_support',
            enabled: true,
            isPublic: false,
            model: 'gpt-4',
            maxTokens: 1000,
            temperature: 0.7,
            topP: 0.9
          }).returning()

          return agent[0]
        }
      })

      const results = await ConcurrentTestHelper.runConcurrentOperations(operations, 5)

      expect(results).toHaveLength(agentCount)
      expect(new Set(results.map(a => a.id))).toHaveProperty('size', agentCount)

      // Verify all agents were created
      const dbAgents = await db.select().from(parlantAgents)
        .where(sql`workspace_id = ${testWorkspaceId}`)
      expect(dbAgents).toHaveLength(agentCount)
    })

    it('should handle agent name uniqueness constraints properly', async () => {
      const duplicateNameOperations = Array.from({ length: 10 }, () => {
        return async () => {
          try {
            const agent = await db.insert(parlantAgents).values({
              workspaceId: testWorkspaceId,
              name: 'Duplicate Name Agent',
              displayName: 'Duplicate Display Name',
              description: 'Testing uniqueness constraints',
              systemPrompt: 'You are a test agent',
              agentType: 'customer_support',
              enabled: true,
              isPublic: false,
              model: 'gpt-4',
              maxTokens: 1000,
              temperature: 0.7,
              topP: 0.9
            }).returning()
            return { success: true, agent: agent[0] }
          } catch (error) {
            return { success: false, error: error.message }
          }
        }
      })

      const results = await Promise.all(duplicateNameOperations.map(op => op()))

      // Only one should succeed due to uniqueness constraints
      const successes = results.filter(r => r.success)
      const failures = results.filter(r => !r.success)

      expect(successes).toHaveLength(1)
      expect(failures.length).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Session Management', () => {
    beforeEach(async () => {
      // Create test agents
      const agentInserts = Array.from({ length: 3 }, (_, index) =>
        db.insert(parlantAgents).values({
          workspaceId: testWorkspaceId,
          name: `Session Test Agent ${index}`,
          displayName: `Session Test Agent ${index}`,
          description: `Agent for session testing ${index}`,
          systemPrompt: 'You are a test agent',
          agentType: 'customer_support',
          enabled: true,
          isPublic: false,
          model: 'gpt-4',
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9
        }).returning()
      )

      const agents = await Promise.all(agentInserts)
      testAgents = agents.map(result => result[0])
    })

    it('should handle concurrent session creation and updates', async () => {
      const sessionOperations = testAgents.flatMap(agent =>
        Array.from({ length: 5 }, (_, index) => {
          return async () => {
            // Create session
            const session = await db.insert(parlantSessions).values({
              workspaceId: testWorkspaceId,
              agentId: agent.id,
              sessionType: 'customer_chat',
              status: 'active',
              metadata: { test: `session-${agent.id}-${index}` }
            }).returning()

            // Immediately update session
            const updated = await db.update(parlantSessions)
              .set({
                status: 'completed',
                metadata: { test: `updated-${agent.id}-${index}`, completed: true }
              })
              .where(sql`id = ${session[0].id}`)
              .returning()

            return updated[0]
          }
        })
      )

      const results = await ConcurrentTestHelper.runConcurrentOperations(sessionOperations, 8)

      expect(results).toHaveLength(15) // 3 agents × 5 sessions each
      expect(results.every(s => s.status === 'completed')).toBe(true)
    })

    it('should handle concurrent session variable modifications', async () => {
      // Create a session for variable testing
      const session = await db.insert(parlantSessions).values({
        workspaceId: testWorkspaceId,
        agentId: testAgents[0].id,
        sessionType: 'customer_chat',
        status: 'active',
        metadata: {}
      }).returning()

      const sessionId = session[0].id

      // Concurrent variable operations
      const variableOperations = Array.from({ length: 20 }, (_, index) => {
        return async () => {
          const variable = await db.insert(parlantVariables).values({
            agentId: testAgents[0].id,
            sessionId: sessionId,
            key: `concurrent_var_${index}`,
            scope: 'session',
            value: `initial_value_${index}`,
            valueType: 'string',
            isPrivate: false
          }).returning()

          // Update the variable immediately
          const updated = await db.update(parlantVariables)
            .set({
              value: `updated_value_${index}`,
              description: `Updated in concurrent test ${index}`
            })
            .where(sql`id = ${variable[0].id}`)
            .returning()

          return updated[0]
        }
      })

      const results = await ConcurrentTestHelper.runConcurrentOperations(variableOperations, 10)

      expect(results).toHaveLength(20)
      expect(results.every(v => v.value.startsWith('updated_value_'))).toBe(true)
    })
  })

  describe('Transaction Isolation and Consistency', () => {
    it('should maintain transaction consistency during concurrent operations', async () => {
      // Create agent for transaction testing
      const agent = await db.insert(parlantAgents).values({
        workspaceId: testWorkspaceId,
        name: 'Transaction Test Agent',
        displayName: 'Transaction Test Agent',
        description: 'Agent for transaction testing',
        systemPrompt: 'You are a test agent',
        agentType: 'customer_support',
        enabled: true,
        isPublic: false,
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9
      }).returning()

      const agentId = agent[0].id

      // Concurrent transaction operations
      const transactionOperations = Array.from({ length: 10 }, (_, index) => {
        return async () => {
          return await db.transaction(async (tx) => {
            // Create session within transaction
            const session = await tx.insert(parlantSessions).values({
              workspaceId: testWorkspaceId,
              agentId: agentId,
              sessionType: 'customer_chat',
              status: 'active',
              metadata: { transactionIndex: index }
            }).returning()

            const sessionId = session[0].id

            // Create events within same transaction
            const events = await Promise.all([
              tx.insert(parlantEvents).values({
                workspaceId: testWorkspaceId,
                sessionId: sessionId,
                agentId: agentId,
                eventType: 'customer_message',
                content: { message: `Transaction test message ${index}` },
                metadata: { step: 1 }
              }).returning(),
              tx.insert(parlantEvents).values({
                workspaceId: testWorkspaceId,
                sessionId: sessionId,
                agentId: agentId,
                eventType: 'agent_message',
                content: { message: `Response to test message ${index}` },
                metadata: { step: 2 }
              }).returning()
            ])

            return {
              session: session[0],
              events: events.flat()
            }
          })
        }
      })

      const results = await ConcurrentTestHelper.runConcurrentOperations(transactionOperations, 5)

      // Verify all transactions completed successfully
      expect(results).toHaveLength(10)
      expect(results.every(r => r.session && r.events.length === 2)).toBe(true)

      // Verify data consistency in database
      const allSessions = await db.select().from(parlantSessions)
        .where(sql`agent_id = ${agentId}`)
      const allEvents = await db.select().from(parlantEvents)
        .where(sql`agent_id = ${agentId}`)

      expect(allSessions).toHaveLength(10)
      expect(allEvents).toHaveLength(20) // 2 events per session
    })

    it('should handle transaction rollbacks properly during failures', async () => {
      const agent = await db.insert(parlantAgents).values({
        workspaceId: testWorkspaceId,
        name: 'Rollback Test Agent',
        displayName: 'Rollback Test Agent',
        description: 'Agent for rollback testing',
        systemPrompt: 'You are a test agent',
        agentType: 'customer_support',
        enabled: true,
        isPublic: false,
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9
      }).returning()

      const agentId = agent[0].id

      // Mix of successful and failing transactions
      const mixedOperations = Array.from({ length: 10 }, (_, index) => {
        return async () => {
          try {
            return await db.transaction(async (tx) => {
              const session = await tx.insert(parlantSessions).values({
                workspaceId: testWorkspaceId,
                agentId: agentId,
                sessionType: 'customer_chat',
                status: 'active',
                metadata: { rollbackTest: index }
              }).returning()

              // Intentionally fail every 3rd transaction
              if (index % 3 === 0) {
                throw new Error('Intentional transaction failure')
              }

              const event = await tx.insert(parlantEvents).values({
                workspaceId: testWorkspaceId,
                sessionId: session[0].id,
                agentId: agentId,
                eventType: 'customer_message',
                content: { message: `Success message ${index}` },
                metadata: {}
              }).returning()

              return { success: true, session: session[0], event: event[0] }
            })
          } catch (error) {
            return { success: false, error: error.message }
          }
        }
      })

      const results = await Promise.all(mixedOperations.map(op => op()))

      const successes = results.filter(r => r.success)
      const failures = results.filter(r => !r.success)

      // Verify rollback behavior
      expect(successes.length).toBe(7) // Should succeed for non-multiples of 3
      expect(failures.length).toBe(3) // Should fail for multiples of 3

      // Verify only successful transactions are in database
      const dbSessions = await db.select().from(parlantSessions)
        .where(sql`agent_id = ${agentId}`)
      const dbEvents = await db.select().from(parlantEvents)
        .where(sql`agent_id = ${agentId}`)

      expect(dbSessions).toHaveLength(7)
      expect(dbEvents).toHaveLength(7)
    })
  })

  describe('Race Condition Prevention', () => {
    it('should prevent race conditions in agent status updates', async () => {
      const agent = await db.insert(parlantAgents).values({
        workspaceId: testWorkspaceId,
        name: 'Race Condition Test Agent',
        displayName: 'Race Condition Test Agent',
        description: 'Agent for race condition testing',
        systemPrompt: 'You are a test agent',
        agentType: 'customer_support',
        enabled: true,
        isPublic: false,
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9
      }).returning()

      const agentId = agent[0].id

      // Concurrent status updates
      const statusUpdates = Array.from({ length: 50 }, (_, index) => {
        return async () => {
          const newStatus = index % 2 === 0 ? true : false

          const updated = await db.update(parlantAgents)
            .set({
              enabled: newStatus,
              updatedAt: new Date()
            })
            .where(sql`id = ${agentId}`)
            .returning()

          return updated[0]
        }
      })

      const results = await ConcurrentTestHelper.raceOperations(statusUpdates)

      // All operations should succeed
      expect(results).toHaveLength(50)

      // Final state should be consistent
      const finalAgent = await db.select().from(parlantAgents)
        .where(sql`id = ${agentId}`)
        .limit(1)

      expect(finalAgent).toHaveLength(1)
      expect(typeof finalAgent[0].enabled).toBe('boolean')
    })

    it('should handle concurrent session state transitions safely', async () => {
      const session = await db.insert(parlantSessions).values({
        workspaceId: testWorkspaceId,
        agentId: testAgents[0]?.id || 'test-agent-id',
        sessionType: 'customer_chat',
        status: 'active',
        metadata: {}
      }).returning()

      const sessionId = session[0].id
      const statusTransitions = ['active', 'paused', 'completed', 'expired', 'error']

      // Rapid state transitions
      const transitionOperations = Array.from({ length: 25 }, (_, index) => {
        return async () => {
          const newStatus = statusTransitions[index % statusTransitions.length] as any

          try {
            const updated = await db.update(parlantSessions)
              .set({
                status: newStatus,
                updatedAt: new Date()
              })
              .where(sql`id = ${sessionId}`)
              .returning()

            return { success: true, session: updated[0] }
          } catch (error) {
            return { success: false, error: error.message }
          }
        }
      })

      const results = await Promise.all(transitionOperations.map(op => op()))

      // Most operations should succeed (some may fail due to race conditions)
      const successes = results.filter(r => r.success)
      expect(successes.length).toBeGreaterThan(20)

      // Final state should be one of the valid statuses
      const finalSession = await db.select().from(parlantSessions)
        .where(sql`id = ${sessionId}`)
        .limit(1)

      expect(finalSession).toHaveLength(1)
      expect(statusTransitions).toContain(finalSession[0].status)
    })
  })

  describe('Deadlock Prevention and Recovery', () => {
    it('should handle potential deadlock scenarios gracefully', async () => {
      // Create two agents for cross-referencing operations
      const agents = await Promise.all([
        db.insert(parlantAgents).values({
          workspaceId: testWorkspaceId,
          name: 'Deadlock Test Agent 1',
          displayName: 'Deadlock Test Agent 1',
          description: 'First agent for deadlock testing',
          systemPrompt: 'You are test agent 1',
          agentType: 'customer_support',
          enabled: true,
          isPublic: false,
          model: 'gpt-4',
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9
        }).returning(),
        db.insert(parlantAgents).values({
          workspaceId: testWorkspaceId,
          name: 'Deadlock Test Agent 2',
          displayName: 'Deadlock Test Agent 2',
          description: 'Second agent for deadlock testing',
          systemPrompt: 'You are test agent 2',
          agentType: 'customer_support',
          enabled: true,
          isPublic: false,
          model: 'gpt-4',
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9
        }).returning()
      ])

      const [agent1, agent2] = [agents[0][0], agents[1][0]]

      // Potential deadlock scenario: concurrent cross-updates
      const deadlockOperations = Array.from({ length: 20 }, (_, index) => {
        return async () => {
          try {
            return await db.transaction(async (tx) => {
              if (index % 2 === 0) {
                // Update agent1 first, then agent2
                await tx.update(parlantAgents)
                  .set({ description: `Updated by operation ${index} (1->2)` })
                  .where(sql`id = ${agent1.id}`)

                await ConcurrentTestHelper.delay(Math.random() * 10) // Small random delay

                await tx.update(parlantAgents)
                  .set({ description: `Updated by operation ${index} (1->2)` })
                  .where(sql`id = ${agent2.id}`)
              } else {
                // Update agent2 first, then agent1
                await tx.update(parlantAgents)
                  .set({ description: `Updated by operation ${index} (2->1)` })
                  .where(sql`id = ${agent2.id}`)

                await ConcurrentTestHelper.delay(Math.random() * 10) // Small random delay

                await tx.update(parlantAgents)
                  .set({ description: `Updated by operation ${index} (2->1)` })
                  .where(sql`id = ${agent1.id}`)
              }

              return { success: true, operation: index }
            })
          } catch (error) {
            return { success: false, error: error.message, operation: index }
          }
        }
      })

      const results = await Promise.all(deadlockOperations.map(op => op()))

      // Most operations should eventually succeed
      const successes = results.filter(r => r.success)
      const failures = results.filter(r => !r.success)

      expect(successes.length).toBeGreaterThan(15) // Allow for some deadlock handling

      // Verify final state is consistent
      const finalAgents = await db.select().from(parlantAgents)
        .where(sql`id IN (${agent1.id}, ${agent2.id})`)

      expect(finalAgents).toHaveLength(2)
      expect(finalAgents.every(a => a.description.includes('Updated by operation'))).toBe(true)
    })
  })

  describe('Performance Under Concurrency', () => {
    it('should maintain reasonable performance under high concurrency', async () => {
      const startTime = Date.now()
      const operationCount = 100

      const performanceOperations = Array.from({ length: operationCount }, (_, index) => {
        return async () => {
          // Mixed operations to simulate realistic load
          if (index % 3 === 0) {
            // Agent creation
            return await db.insert(parlantAgents).values({
              workspaceId: testWorkspaceId,
              name: `Performance Test Agent ${index}`,
              displayName: `Performance Test Agent ${index}`,
              description: `Performance testing agent ${index}`,
              systemPrompt: 'You are a performance test agent',
              agentType: 'customer_support',
              enabled: true,
              isPublic: false,
              model: 'gpt-4',
              maxTokens: 1000,
              temperature: 0.7,
              topP: 0.9
            }).returning()
          } else if (index % 3 === 1) {
            // Session creation (requires existing agent)
            const agents = await db.select({ id: parlantAgents.id })
              .from(parlantAgents)
              .where(sql`workspace_id = ${testWorkspaceId}`)
              .limit(1)

            if (agents.length > 0) {
              return await db.insert(parlantSessions).values({
                workspaceId: testWorkspaceId,
                agentId: agents[0].id,
                sessionType: 'customer_chat',
                status: 'active',
                metadata: { performanceTest: index }
              }).returning()
            }
            return []
          } else {
            // Read operations
            return await db.select()
              .from(parlantAgents)
              .where(sql`workspace_id = ${testWorkspaceId}`)
              .limit(5)
          }
        }
      })

      const results = await ConcurrentTestHelper.runConcurrentOperations(performanceOperations, 20)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Performance assertions
      expect(results).toHaveLength(operationCount)
      expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds

      // Average time per operation should be reasonable
      const avgTimePerOp = totalTime / operationCount
      expect(avgTimePerOp).toBeLessThan(200) // Less than 200ms average per operation

      // Verify data integrity after high concurrency
      const finalAgents = await db.select().from(parlantAgents)
        .where(sql`workspace_id = ${testWorkspaceId}`)
      const finalSessions = await db.select().from(parlantSessions)
        .where(sql`workspace_id = ${testWorkspaceId}`)

      expect(finalAgents.length).toBeGreaterThan(0)
      expect(finalSessions.length).toBeGreaterThan(0)
    })
  })
})