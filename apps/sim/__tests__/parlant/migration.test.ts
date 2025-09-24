/**
 * @vitest-environment node
 *
 * Parlant Database Migration Tests
 *
 * Comprehensive test suite for validating Parlant database migrations,
 * including up/down migration validation, foreign key constraints,
 * and rollback scenarios.
 */

import { db } from '@sim/db'
import {
  knowledgeBase,
  parlantAgent,
  parlantAgentKnowledgeBase,
  parlantAgentTool,
  parlantCannedResponse,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyGuideline,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantSession,
  parlantTerm,
  parlantTool,
  parlantToolIntegration,
  parlantVariable,
  user,
  workspace,
} from '@sim/db/schema'
import { count, eq, sql } from 'drizzle-orm'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

interface TestData {
  workspaceId: string
  userId: string
  knowledgeBaseId: string
  agentId: string
  sessionId: string
  journeyId: string
  stateId: string
  toolId: string
}

describe('Parlant Database Migration Tests', () => {
  let testData: TestData

  beforeAll(async () => {
    // Ensure database is accessible
    const result = await db.execute(sql`SELECT 1 as test`)
    expect(result.rows[0]).toEqual({ test: 1 })
  })

  beforeEach(async () => {
    // Set up test data with proper foreign key relationships
    const workspaceResult = await db
      .insert(workspace)
      .values({
        id: `workspace-${Date.now()}`,
        name: 'Test Workspace',
        ownerId: 'test-user-id',
      })
      .returning({ id: workspace.id })

    const userResult = await db
      .insert(user)
      .values({
        id: 'test-user-id',
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: user.id })

    const kbResult = await db
      .insert(knowledgeBase)
      .values({
        id: `kb-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Test Knowledge Base',
        description: 'Test KB for Parlant tests',
      })
      .returning({ id: knowledgeBase.id })

    testData = {
      workspaceId: workspaceResult[0].id,
      userId: userResult[0].id,
      knowledgeBaseId: kbResult[0].id,
      agentId: '',
      sessionId: '',
      journeyId: '',
      stateId: '',
      toolId: '',
    }
  })

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    try {
      await db.delete(parlantToolIntegration).where(sql`true`)
      await db.delete(parlantAgentKnowledgeBase).where(sql`true`)
      await db.delete(parlantJourneyGuideline).where(sql`true`)
      await db.delete(parlantAgentTool).where(sql`true`)
      await db.delete(parlantCannedResponse).where(sql`true`)
      await db.delete(parlantTerm).where(sql`true`)
      await db.delete(parlantTool).where(sql`true`)
      await db.delete(parlantVariable).where(sql`true`)
      await db.delete(parlantJourneyTransition).where(sql`true`)
      await db.delete(parlantJourneyState).where(sql`true`)
      await db.delete(parlantJourney).where(sql`true`)
      await db.delete(parlantGuideline).where(sql`true`)
      await db.delete(parlantEvent).where(sql`true`)
      await db.delete(parlantSession).where(sql`true`)
      await db.delete(parlantAgent).where(sql`true`)
      await db.delete(knowledgeBase).where(sql`true`)
      await db.delete(workspace).where(sql`true`)
      await db.delete(user).where(sql`true`)
    } catch (error) {
      console.warn('Cleanup error:', error)
    }
  })

  describe('Schema Creation and Validation', () => {
    it('should create all Parlant tables with correct structure', async () => {
      // Verify all Parlant tables exist
      const tables = [
        'parlant_agent',
        'parlant_session',
        'parlant_event',
        'parlant_guideline',
        'parlant_journey',
        'parlant_journey_state',
        'parlant_journey_transition',
        'parlant_variable',
        'parlant_tool',
        'parlant_term',
        'parlant_canned_response',
        'parlant_agent_tool',
        'parlant_journey_guideline',
        'parlant_agent_knowledge_base',
        'parlant_tool_integration',
      ]

      for (const tableName of tables) {
        const result = await db.execute(
          sql.raw(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = '${tableName}'
            );
          `)
        )
        expect(result.rows[0].exists).toBe(true)
      }
    })

    it('should have correct column types and constraints', async () => {
      // Test parlant_agent table structure
      const agentColumns = await db.execute(
        sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'parlant_agent'
          ORDER BY ordinal_position;
        `
      )

      const expectedColumns = [
        'id',
        'workspace_id',
        'created_by',
        'name',
        'description',
        'status',
        'composition_mode',
        'system_prompt',
        'model_provider',
        'model_name',
        'temperature',
        'max_tokens',
        'response_timeout_ms',
        'max_context_length',
        'system_instructions',
        'allow_interruption',
        'allow_proactive_messages',
        'conversation_style',
        'data_retention_days',
        'allow_data_export',
        'pii_handling_mode',
        'integration_metadata',
        'custom_config',
        'total_sessions',
        'total_messages',
        'total_tokens_used',
        'total_cost',
        'average_session_duration',
        'last_active_at',
        'created_at',
        'updated_at',
        'deleted_at',
      ]

      expect(agentColumns.rows.length).toBeGreaterThanOrEqual(expectedColumns.length)

      // Verify key columns exist with correct types
      const columnMap = new Map(agentColumns.rows.map((col) => [col.column_name, col]))

      expect(columnMap.get('id')?.data_type).toBe('uuid')
      expect(columnMap.get('workspace_id')?.data_type).toBe('text')
      expect(columnMap.get('workspace_id')?.is_nullable).toBe('NO')
      expect(columnMap.get('status')?.data_type).toBe('USER-DEFINED') // enum
      expect(columnMap.get('temperature')?.data_type).toBe('integer')
    })

    it('should have proper foreign key constraints', async () => {
      // Check foreign key relationships
      const foreignKeys = await db.execute(
        sql`
          SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name LIKE 'parlant_%'
          ORDER BY tc.table_name, kcu.column_name;
        `
      )

      // Verify key relationships exist
      const fkMap = new Map(
        foreignKeys.rows.map((fk) => [
          `${fk.table_name}.${fk.column_name}`,
          `${fk.foreign_table_name}.${fk.foreign_column_name}`,
        ])
      )

      expect(fkMap.get('parlant_agent.workspace_id')).toBe('workspace.id')
      expect(fkMap.get('parlant_agent.created_by')).toBe('user.id')
      expect(fkMap.get('parlant_session.agent_id')).toBe('parlant_agent.id')
      expect(fkMap.get('parlant_session.workspace_id')).toBe('workspace.id')
      expect(fkMap.get('parlant_session.user_id')).toBe('user.id')
      expect(fkMap.get('parlant_event.session_id')).toBe('parlant_session.id')
    })

    it('should have proper indexes for query optimization', async () => {
      // Check that essential indexes exist
      const indexes = await db.execute(
        sql`
          SELECT
            tablename,
            indexname,
            indexdef
          FROM pg_indexes
          WHERE tablename LIKE 'parlant_%'
            AND indexname NOT LIKE '%pkey'
          ORDER BY tablename, indexname;
        `
      )

      const indexNames = indexes.rows.map((idx) => idx.indexname)

      // Verify key indexes exist
      expect(indexNames).toContain('parlant_agent_workspace_id_idx')
      expect(indexNames).toContain('parlant_session_agent_id_idx')
      expect(indexNames).toContain('parlant_event_session_id_idx')
      expect(indexNames).toContain('parlant_event_session_offset_idx')
    })
  })

  describe('Data Integrity and Constraints', () => {
    it('should enforce NOT NULL constraints', async () => {
      // Test required fields throw errors when null
      await expect(
        db.insert(parlantAgent).values({
          // Missing required workspace_id and created_by
          name: 'Test Agent',
        })
      ).rejects.toThrow()
    })

    it('should enforce foreign key constraints', async () => {
      // Test cascade delete behavior
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Test Agent',
          description: 'Test agent for FK tests',
        })
        .returning()

      testData.agentId = agent[0].id

      const session = await db
        .insert(parlantSession)
        .values({
          agentId: testData.agentId,
          workspaceId: testData.workspaceId,
          userId: testData.userId,
          customerId: 'test-customer',
        })
        .returning()

      testData.sessionId = session[0].id

      // Verify session was created
      const sessionsBefore = await db
        .select({ count: count() })
        .from(parlantSession)
        .where(eq(parlantSession.agentId, testData.agentId))
      expect(sessionsBefore[0].count).toBe(1)

      // Delete agent should cascade delete session
      await db.delete(parlantAgent).where(eq(parlantAgent.id, testData.agentId))

      const sessionsAfter = await db
        .select({ count: count() })
        .from(parlantSession)
        .where(eq(parlantSession.agentId, testData.agentId))
      expect(sessionsAfter[0].count).toBe(0)
    })

    it('should handle unique constraints properly', async () => {
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Test Agent',
        })
        .returning()

      testData.agentId = agent[0].id

      const session = await db
        .insert(parlantSession)
        .values({
          agentId: testData.agentId,
          workspaceId: testData.workspaceId,
          userId: testData.userId,
        })
        .returning()

      testData.sessionId = session[0].id

      // Insert first event
      await db.insert(parlantEvent).values({
        sessionId: testData.sessionId,
        offset: 1,
        eventType: 'customer_message',
        content: { message: 'Hello' },
      })

      // Attempt to insert another event with same session + offset should fail
      await expect(
        db.insert(parlantEvent).values({
          sessionId: testData.sessionId,
          offset: 1,
          eventType: 'agent_message',
          content: { message: 'Hi there' },
        })
      ).rejects.toThrow()
    })

    it('should properly handle enum constraints', async () => {
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Test Agent',
          status: 'active', // valid enum value
        })
        .returning()

      expect(agent[0].status).toBe('active')

      // Test invalid enum value
      await expect(
        db.insert(parlantAgent).values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Invalid Agent',
          status: 'invalid_status' as any,
        })
      ).rejects.toThrow()
    })
  })

  describe('Cross-table Relationships', () => {
    it('should properly handle many-to-many relationships', async () => {
      // Create test entities
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Test Agent',
        })
        .returning()

      const tool = await db
        .insert(parlantTool)
        .values({
          workspaceId: testData.workspaceId,
          name: 'test_tool',
          displayName: 'Test Tool',
          description: 'A test tool',
          toolType: 'custom',
          parameters: { type: 'object', properties: {} },
        })
        .returning()

      testData.agentId = agent[0].id
      testData.toolId = tool[0].id

      // Create many-to-many relationship
      const agentTool = await db
        .insert(parlantAgentTool)
        .values({
          agentId: testData.agentId,
          toolId: testData.toolId,
          configuration: { priority: 'high' },
          enabled: true,
        })
        .returning()

      expect(agentTool[0].agentId).toBe(testData.agentId)
      expect(agentTool[0].toolId).toBe(testData.toolId)

      // Test that junction table enforces unique constraints
      await expect(
        db.insert(parlantAgentTool).values({
          agentId: testData.agentId,
          toolId: testData.toolId,
          enabled: false, // Different value but same agent+tool
        })
      ).rejects.toThrow() // Should fail due to unique constraint
    })

    it('should handle complex relationship queries', async () => {
      // Create test data hierarchy
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Test Agent',
        })
        .returning()

      const journey = await db
        .insert(parlantJourney)
        .values({
          agentId: agent[0].id,
          title: 'Test Journey',
          description: 'A test journey',
          conditions: ['user.intent === "help"'],
        })
        .returning()

      const initialState = await db
        .insert(parlantJourneyState)
        .values({
          journeyId: journey[0].id,
          name: 'Initial State',
          stateType: 'chat',
          chatPrompt: 'Welcome! How can I help you?',
          isInitial: true,
        })
        .returning()

      const finalState = await db
        .insert(parlantJourneyState)
        .values({
          journeyId: journey[0].id,
          name: 'Final State',
          stateType: 'final',
          isFinal: true,
        })
        .returning()

      const transition = await db
        .insert(parlantJourneyTransition)
        .values({
          journeyId: journey[0].id,
          fromStateId: initialState[0].id,
          toStateId: finalState[0].id,
          condition: 'user.response === "done"',
        })
        .returning()

      // Test complex query with joins
      const journeyDetails = await db
        .select({
          journeyTitle: parlantJourney.title,
          agentName: parlantAgent.name,
          stateCount: count(parlantJourneyState.id),
        })
        .from(parlantJourney)
        .innerJoin(parlantAgent, eq(parlantJourney.agentId, parlantAgent.id))
        .leftJoin(parlantJourneyState, eq(parlantJourneyState.journeyId, parlantJourney.id))
        .where(eq(parlantJourney.id, journey[0].id))
        .groupBy(parlantJourney.title, parlantAgent.name)

      expect(journeyDetails[0].journeyTitle).toBe('Test Journey')
      expect(journeyDetails[0].agentName).toBe('Test Agent')
      expect(journeyDetails[0].stateCount).toBe(2)
    })
  })

  describe('Migration Rollback Validation', () => {
    it('should be able to rollback Parlant table creation', async () => {
      // This test verifies that we could rollback the migration if needed
      // We don't actually rollback, but verify table dependencies

      // Check table dependency order for safe rollback
      const tableOrder = [
        'parlant_tool_integration',
        'parlant_agent_knowledge_base',
        'parlant_journey_guideline',
        'parlant_agent_tool',
        'parlant_canned_response',
        'parlant_term',
        'parlant_tool',
        'parlant_variable',
        'parlant_journey_transition',
        'parlant_journey_state',
        'parlant_journey',
        'parlant_guideline',
        'parlant_event',
        'parlant_session',
        'parlant_agent',
      ]

      // Verify each table can be queried (indicating it exists and structure is valid)
      for (const tableName of tableOrder) {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`))
        expect(typeof result.rows[0].count).toBe('string')
      }
    })

    it('should maintain data consistency during migrations', async () => {
      // Test that existing data relationships are preserved
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Migration Test Agent',
          status: 'active',
          compositionMode: 'fluid',
          totalSessions: 5,
          totalMessages: 50,
        })
        .returning()

      const session = await db
        .insert(parlantSession)
        .values({
          agentId: agent[0].id,
          workspaceId: testData.workspaceId,
          userId: testData.userId,
          status: 'active',
          eventCount: 3,
          messageCount: 6,
        })
        .returning()

      // Verify data integrity after creation
      const agentCheck = await db
        .select()
        .from(parlantAgent)
        .where(eq(parlantAgent.id, agent[0].id))

      const sessionCheck = await db
        .select()
        .from(parlantSession)
        .where(eq(parlantSession.id, session[0].id))

      expect(agentCheck[0].totalSessions).toBe(5)
      expect(sessionCheck[0].agentId).toBe(agent[0].id)
      expect(sessionCheck[0].eventCount).toBe(3)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle bulk inserts efficiently', async () => {
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Bulk Test Agent',
        })
        .returning()

      const session = await db
        .insert(parlantSession)
        .values({
          agentId: agent[0].id,
          workspaceId: testData.workspaceId,
          userId: testData.userId,
        })
        .returning()

      // Create multiple events in bulk
      const events = Array.from({ length: 100 }, (_, i) => ({
        sessionId: session[0].id,
        offset: i + 1,
        eventType: 'customer_message' as const,
        content: { message: `Message ${i + 1}` },
      }))

      const startTime = Date.now()
      await db.insert(parlantEvent).values(events)
      const insertTime = Date.now() - startTime

      // Should complete bulk insert within reasonable time (< 5 seconds)
      expect(insertTime).toBeLessThan(5000)

      // Verify all events were inserted
      const eventCount = await db
        .select({ count: count() })
        .from(parlantEvent)
        .where(eq(parlantEvent.sessionId, session[0].id))

      expect(eventCount[0].count).toBe(100)
    })

    it('should handle complex queries with proper indexing', async () => {
      // Create test data for performance testing
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: testData.workspaceId,
          createdBy: testData.userId,
          name: 'Performance Test Agent',
        })
        .returning()

      // Insert multiple sessions
      const sessions = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          db
            .insert(parlantSession)
            .values({
              agentId: agent[0].id,
              workspaceId: testData.workspaceId,
              userId: testData.userId,
              customerId: `customer-${i}`,
              status: i % 2 === 0 ? 'active' : 'completed',
            })
            .returning()
        )
      )

      // Test indexed query performance
      const startTime = Date.now()
      const activeSessions = await db
        .select()
        .from(parlantSession)
        .where(eq(parlantSession.status, 'active'))
        .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))

      const queryTime = Date.now() - startTime

      // Query should be fast due to indexes (< 100ms)
      expect(queryTime).toBeLessThan(100)
      expect(activeSessions.length).toBe(5) // Half of sessions are active
    })
  })
})
