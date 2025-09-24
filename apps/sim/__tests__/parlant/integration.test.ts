/**
 * @vitest-environment node
 *
 * Parlant Database Integration Tests
 *
 * Comprehensive integration tests for Parlant database operations,
 * including complex multi-table operations, transaction handling,
 * and business logic validation.
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
  parlantAgentWorkflow,
  parlantAgentApiKey,
  parlantSessionWorkflow,
  workspace,
  user,
  knowledgeBase,
  workflow,
  apiKey,
  customTools,
  mcpServers,
} from '@sim/db/schema'
import { eq, and, count, desc, asc } from 'drizzle-orm'

interface TestContext {
  workspaceId: string
  userId: string
  knowledgeBaseId: string
  workflowId: string
  apiKeyId: string
  customToolId: string
  mcpServerId: string
  agentId: string
  sessionId: string
  journeyId: string
  toolId: string
}

describe('Parlant Database Integration Tests', () => {
  let ctx: TestContext

  beforeEach(async () => {
    // Create comprehensive test context with all necessary entities
    const userResult = await db
      .insert(user)
      .values({
        id: `user-${Date.now()}`,
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: user.id })

    const workspaceResult = await db
      .insert(workspace)
      .values({
        id: `workspace-${Date.now()}`,
        name: 'Test Workspace',
        ownerId: userResult[0].id,
      })
      .returning({ id: workspace.id })

    const kbResult = await db
      .insert(knowledgeBase)
      .values({
        id: `kb-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Test Knowledge Base',
        description: 'Test KB for integration tests',
      })
      .returning({ id: knowledgeBase.id })

    const workflowResult = await db
      .insert(workflow)
      .values({
        id: `workflow-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Test Workflow',
        description: 'Test workflow for Parlant integration',
        color: '#FF0000',
        lastSynced: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: workflow.id })

    const apiKeyResult = await db
      .insert(apiKey)
      .values({
        id: `apikey-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Test API Key',
        key: `sk-test-${Date.now()}`,
        type: 'workspace',
        createdBy: userResult[0].id,
      })
      .returning({ id: apiKey.id })

    const customToolResult = await db
      .insert(customTools)
      .values({
        id: `tool-${Date.now()}`,
        userId: userResult[0].id,
        title: 'Test Custom Tool',
        schema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        },
        code: 'function execute(input) { return { result: input }; }',
      })
      .returning({ id: customTools.id })

    const mcpServerResult = await db
      .insert(mcpServers)
      .values({
        id: `mcp-${Date.now()}`,
        workspaceId: workspaceResult[0].id,
        createdBy: userResult[0].id,
        name: 'Test MCP Server',
        description: 'Test MCP server for Parlant integration',
        transport: 'http',
        url: 'http://localhost:3000',
      })
      .returning({ id: mcpServers.id })

    ctx = {
      workspaceId: workspaceResult[0].id,
      userId: userResult[0].id,
      knowledgeBaseId: kbResult[0].id,
      workflowId: workflowResult[0].id,
      apiKeyId: apiKeyResult[0].id,
      customToolId: customToolResult[0].id,
      mcpServerId: mcpServerResult[0].id,
      agentId: '',
      sessionId: '',
      journeyId: '',
      toolId: '',
    }
  })

  afterEach(async () => {
    // Comprehensive cleanup in correct dependency order
    try {
      await db.delete(parlantSessionWorkflow).where(sql`true`)
      await db.delete(parlantAgentApiKey).where(sql`true`)
      await db.delete(parlantAgentWorkflow).where(sql`true`)
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
      await db.delete(mcpServers).where(sql`true`)
      await db.delete(customTools).where(sql`true`)
      await db.delete(apiKey).where(sql`true`)
      await db.delete(workflow).where(sql`true`)
      await db.delete(knowledgeBase).where(sql`true`)
      await db.delete(workspace).where(sql`true`)
      await db.delete(user).where(sql`true`)
    } catch (error) {
      console.warn('Integration test cleanup error:', error)
    }
  })

  describe('Complete Agent Lifecycle', () => {
    it('should create a complete agent with all associated entities', async () => {
      // Create agent with full configuration
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Complete Integration Agent',
          description: 'A comprehensive test agent',
          status: 'active',
          compositionMode: 'fluid',
          systemPrompt: 'You are a helpful assistant for integration testing.',
          modelProvider: 'openai',
          modelName: 'gpt-4',
          temperature: 70,
          maxTokens: 2000,
          responseTimeoutMs: 30000,
          allowInterruption: true,
          allowProactiveMessages: false,
          conversationStyle: 'professional',
          dataRetentionDays: 30,
          allowDataExport: true,
          piiHandlingMode: 'standard',
          integrationMetadata: { version: '1.0' },
          customConfig: { testMode: true },
        })
        .returning()

      ctx.agentId = agent[0].id

      // Create tools for the agent
      const tool = await db
        .insert(parlantTool)
        .values({
          workspaceId: ctx.workspaceId,
          name: 'integration_tool',
          displayName: 'Integration Test Tool',
          description: 'A tool for testing integration capabilities',
          toolType: 'custom',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The query to process' }
            },
            required: ['query']
          },
          returnSchema: {
            type: 'object',
            properties: {
              response: { type: 'string' }
            }
          },
          usageGuidelines: 'Use this tool when the user needs help with queries',
          executionTimeout: 15000,
          rateLimitPerMinute: 30,
          requiresAuth: false,
        })
        .returning()

      ctx.toolId = tool[0].id

      // Connect tool to agent
      await db.insert(parlantAgentTool).values({
        agentId: ctx.agentId,
        toolId: ctx.toolId,
        configuration: { priority: 'high', context: 'general' },
        enabled: true,
        priority: 1,
      })

      // Create tool integration with custom tool
      await db.insert(parlantToolIntegration).values({
        parlantToolId: ctx.toolId,
        integrationType: 'custom_tool',
        targetId: ctx.customToolId,
        configuration: { timeout: 30000 },
        enabled: true,
        parameterMapping: { query: 'input' },
        responseMapping: { result: 'response' },
        healthStatus: 'healthy',
      })

      // Connect agent to knowledge base
      await db.insert(parlantAgentKnowledgeBase).values({
        agentId: ctx.agentId,
        knowledgeBaseId: ctx.knowledgeBaseId,
        enabled: true,
        searchThreshold: 80,
        maxResults: 5,
        priority: 100,
      })

      // Connect agent to workflow
      await db.insert(parlantAgentWorkflow).values({
        agentId: ctx.agentId,
        workflowId: ctx.workflowId,
        workspaceId: ctx.workspaceId,
        integrationType: 'trigger',
        enabled: true,
        triggerConditions: ['user.intent === "workflow"'],
        inputMapping: { sessionId: '{{session.id}}', userId: '{{session.userId}}' },
      })

      // Connect agent to API key
      await db.insert(parlantAgentApiKey).values({
        agentId: ctx.agentId,
        apiKeyId: ctx.apiKeyId,
        workspaceId: ctx.workspaceId,
        purpose: 'tools',
        enabled: true,
        priority: 1,
      })

      // Create guidelines for the agent
      const guideline = await db
        .insert(parlantGuideline)
        .values({
          agentId: ctx.agentId,
          condition: 'user.message.contains("help")',
          action: 'Provide helpful and detailed assistance',
          priority: 100,
          enabled: true,
          toolIds: [ctx.toolId],
        })
        .returning()

      // Create glossary terms
      await db.insert(parlantTerm).values({
        agentId: ctx.agentId,
        name: 'Integration Testing',
        description: 'The practice of testing software components together',
        synonyms: ['Integration Test', 'System Integration Test'],
        category: 'testing',
        examples: ['Running tests across multiple database tables'],
        importance: 90,
      })

      // Create canned responses
      await db.insert(parlantCannedResponse).values({
        agentId: ctx.agentId,
        template: 'I understand you need help with {{topic}}. Let me assist you.',
        category: 'general_help',
        tags: ['help', 'assistance'],
        conditions: ['user.needs_help === true'],
        priority: 100,
        enabled: true,
      })

      // Create a journey for the agent
      const journey = await db
        .insert(parlantJourney)
        .values({
          agentId: ctx.agentId,
          title: 'Help Journey',
          description: 'A journey to help users with their queries',
          conditions: ['user.message.contains("help")'],
          enabled: true,
          allowSkipping: true,
          allowRevisiting: true,
        })
        .returning()

      ctx.journeyId = journey[0].id

      // Create journey states
      const initialState = await db
        .insert(parlantJourneyState)
        .values({
          journeyId: ctx.journeyId,
          name: 'Initial Help',
          stateType: 'chat',
          chatPrompt: 'How can I help you today?',
          isInitial: true,
          allowSkip: false,
        })
        .returning()

      const toolState = await db
        .insert(parlantJourneyState)
        .values({
          journeyId: ctx.journeyId,
          name: 'Use Tool',
          stateType: 'tool',
          toolId: ctx.toolId,
          toolConfig: { timeout: 10000 },
          allowSkip: true,
        })
        .returning()

      const finalState = await db
        .insert(parlantJourneyState)
        .values({
          journeyId: ctx.journeyId,
          name: 'Complete',
          stateType: 'final',
          isFinal: true,
        })
        .returning()

      // Create journey transitions
      await db.insert(parlantJourneyTransition).values([
        {
          journeyId: ctx.journeyId,
          fromStateId: initialState[0].id,
          toStateId: toolState[0].id,
          condition: 'user.needs_tool_assistance === true',
          priority: 100,
        },
        {
          journeyId: ctx.journeyId,
          fromStateId: toolState[0].id,
          toStateId: finalState[0].id,
          condition: 'tool.execution.completed === true',
          priority: 100,
        },
        {
          journeyId: ctx.journeyId,
          fromStateId: initialState[0].id,
          toStateId: finalState[0].id,
          condition: 'user.satisfied === true',
          priority: 50,
        },
      ])

      // Connect journey to guidelines
      await db.insert(parlantJourneyGuideline).values({
        journeyId: ctx.journeyId,
        guidelineId: guideline[0].id,
        enabled: true,
        priorityOverride: 150,
        journeySpecificCondition: 'journey.state === "active"',
      })

      // Verify the complete setup
      const agentDetails = await db
        .select({
          agentName: parlantAgent.name,
          toolCount: count(parlantAgentTool.id),
        })
        .from(parlantAgent)
        .leftJoin(parlantAgentTool, eq(parlantAgentTool.agentId, parlantAgent.id))
        .where(eq(parlantAgent.id, ctx.agentId))
        .groupBy(parlantAgent.name)

      expect(agentDetails[0].agentName).toBe('Complete Integration Agent')
      expect(agentDetails[0].toolCount).toBe(1)

      // Verify integration connections
      const integrations = await db
        .select({ count: count() })
        .from(parlantAgentKnowledgeBase)
        .where(eq(parlantAgentKnowledgeBase.agentId, ctx.agentId))

      expect(integrations[0].count).toBe(1)

      const workflowConnections = await db
        .select({ count: count() })
        .from(parlantAgentWorkflow)
        .where(eq(parlantAgentWorkflow.agentId, ctx.agentId))

      expect(workflowConnections[0].count).toBe(1)
    })

    it('should handle a complete conversation session with journey execution', async () => {
      // Setup agent and journey from previous test data
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Session Test Agent',
        })
        .returning()

      ctx.agentId = agent[0].id

      const journey = await db
        .insert(parlantJourney)
        .values({
          agentId: ctx.agentId,
          title: 'Conversation Journey',
          conditions: ['always'],
          enabled: true,
        })
        .returning()

      ctx.journeyId = journey[0].id

      const state = await db
        .insert(parlantJourneyState)
        .values({
          journeyId: ctx.journeyId,
          name: 'Chat State',
          stateType: 'chat',
          chatPrompt: 'Hello! How can I help?',
          isInitial: true,
        })
        .returning()

      // Create conversation session
      const session = await db
        .insert(parlantSession)
        .values({
          agentId: ctx.agentId,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          customerId: 'integration-customer-001',
          mode: 'auto',
          status: 'active',
          title: 'Integration Test Session',
          currentJourneyId: ctx.journeyId,
          currentStateId: state[0].id,
          variables: { userType: 'tester', sessionMode: 'integration' },
          metadata: { testRun: true },
          sessionType: 'conversation',
          tags: ['test', 'integration'],
          userAgent: 'Integration Test Browser',
          locale: 'en',
          timezone: 'UTC',
        })
        .returning()

      ctx.sessionId = session[0].id

      // Simulate conversation with multiple events
      const events = [
        {
          sessionId: ctx.sessionId,
          offset: 1,
          eventType: 'customer_message' as const,
          content: { message: 'Hello, I need help with testing', timestamp: Date.now() },
          metadata: { messageId: 'msg-1', clientId: 'test-client' },
        },
        {
          sessionId: ctx.sessionId,
          offset: 2,
          eventType: 'agent_message' as const,
          content: { message: 'Hello! I\'d be happy to help you with testing. What specific area do you need assistance with?', timestamp: Date.now() },
          metadata: { messageId: 'msg-2', generatedBy: 'gpt-4' },
        },
        {
          sessionId: ctx.sessionId,
          offset: 3,
          eventType: 'customer_message' as const,
          content: { message: 'I need to understand integration testing', timestamp: Date.now() },
          metadata: { messageId: 'msg-3' },
        },
        {
          sessionId: ctx.sessionId,
          offset: 4,
          eventType: 'status_update' as const,
          content: { status: 'processing_query', details: 'Analyzing user request for integration testing information' },
        },
        {
          sessionId: ctx.sessionId,
          offset: 5,
          eventType: 'agent_message' as const,
          content: { message: 'Integration testing involves testing multiple components together to ensure they work correctly as a system.', timestamp: Date.now() },
          metadata: { messageId: 'msg-4', includedKnowledge: true },
        },
      ]

      await db.insert(parlantEvent).values(events)

      // Create session variables
      await db.insert(parlantVariable).values([
        {
          agentId: ctx.agentId,
          sessionId: ctx.sessionId,
          key: 'user_expertise_level',
          scope: 'session',
          value: 'beginner',
          valueType: 'string',
          description: 'User\'s self-reported expertise level',
        },
        {
          agentId: ctx.agentId,
          sessionId: ctx.sessionId,
          key: 'topics_discussed',
          scope: 'session',
          value: ['integration_testing'],
          valueType: 'array',
          description: 'Topics covered in this session',
        },
        {
          agentId: ctx.agentId,
          key: 'total_sessions_count',
          scope: 'global',
          value: 1,
          valueType: 'number',
          description: 'Total number of sessions across all customers',
        },
      ])

      // Simulate workflow trigger from session
      await db.insert(parlantSessionWorkflow).values({
        sessionId: ctx.sessionId,
        workflowId: ctx.workflowId,
        executionId: `exec-${Date.now()}`,
        triggerReason: 'User requested workflow execution',
        inputData: {
          sessionId: ctx.sessionId,
          userMessage: 'I need to understand integration testing',
          userType: 'tester'
        },
        outputData: {
          processedData: 'Integration testing explanation generated',
          confidence: 0.95
        },
        status: 'completed',
        completedAt: new Date(),
      })

      // Update session statistics
      await db
        .update(parlantSession)
        .set({
          eventCount: 5,
          messageCount: 3,
          tokensUsed: 150,
          cost: 25, // 25 cents
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(parlantSession.id, ctx.sessionId))

      // Verify conversation integrity
      const sessionSummary = await db
        .select({
          sessionId: parlantSession.id,
          agentName: parlantAgent.name,
          eventCount: parlantSession.eventCount,
          messageCount: parlantSession.messageCount,
          actualEventCount: count(parlantEvent.id),
          journeyTitle: parlantJourney.title,
          variableCount: count(parlantVariable.id),
        })
        .from(parlantSession)
        .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
        .leftJoin(parlantJourney, eq(parlantSession.currentJourneyId, parlantJourney.id))
        .leftJoin(parlantEvent, eq(parlantEvent.sessionId, parlantSession.id))
        .leftJoin(parlantVariable, eq(parlantVariable.sessionId, parlantSession.id))
        .where(eq(parlantSession.id, ctx.sessionId))
        .groupBy(
          parlantSession.id,
          parlantAgent.name,
          parlantSession.eventCount,
          parlantSession.messageCount,
          parlantJourney.title
        )

      expect(sessionSummary[0].eventCount).toBe(5)
      expect(sessionSummary[0].messageCount).toBe(3)
      expect(sessionSummary[0].actualEventCount).toBe(5)
      expect(sessionSummary[0].journeyTitle).toBe('Conversation Journey')
      expect(sessionSummary[0].variableCount).toBe(2) // 2 session-scoped variables

      // Verify workflow execution
      const workflowExecution = await db
        .select()
        .from(parlantSessionWorkflow)
        .where(eq(parlantSessionWorkflow.sessionId, ctx.sessionId))

      expect(workflowExecution[0].status).toBe('completed')
      expect(workflowExecution[0].inputData).toEqual({
        sessionId: ctx.sessionId,
        userMessage: 'I need to understand integration testing',
        userType: 'tester'
      })
    })
  })

  describe('Complex Query Operations', () => {
    it('should handle complex analytical queries across multiple tables', async () => {
      // Create test data for analytics
      const agents = await db
        .insert(parlantAgent)
        .values([
          {
            workspaceId: ctx.workspaceId,
            createdBy: ctx.userId,
            name: 'Analytics Agent 1',
            status: 'active',
            totalSessions: 10,
            totalMessages: 100,
            totalTokensUsed: 5000,
            totalCost: 500, // $5.00
          },
          {
            workspaceId: ctx.workspaceId,
            createdBy: ctx.userId,
            name: 'Analytics Agent 2',
            status: 'active',
            totalSessions: 5,
            totalMessages: 50,
            totalTokensUsed: 2500,
            totalCost: 250, // $2.50
          },
        ])
        .returning()

      const sessions = await db
        .insert(parlantSession)
        .values([
          {
            agentId: agents[0].id,
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            status: 'completed',
            messageCount: 10,
            tokensUsed: 500,
            cost: 50,
            satisfactionScore: 5,
            sessionType: 'support',
            lastActivityAt: new Date(Date.now() - 86400000), // Yesterday
          },
          {
            agentId: agents[0].id,
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            status: 'completed',
            messageCount: 8,
            tokensUsed: 400,
            cost: 40,
            satisfactionScore: 4,
            sessionType: 'conversation',
            lastActivityAt: new Date(),
          },
          {
            agentId: agents[1].id,
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            status: 'active',
            messageCount: 5,
            tokensUsed: 250,
            cost: 25,
            sessionType: 'onboarding',
            lastActivityAt: new Date(),
          },
        ])
        .returning()

      // Complex analytical query: Agent performance metrics
      const agentMetrics = await db
        .select({
          agentId: parlantAgent.id,
          agentName: parlantAgent.name,
          totalSessions: parlantAgent.totalSessions,
          completedSessions: count(
            sql`CASE WHEN ${parlantSession.status} = 'completed' THEN 1 END`
          ),
          avgSatisfaction: sql<number>`ROUND(AVG(CASE WHEN ${parlantSession.satisfactionScore} IS NOT NULL THEN ${parlantSession.satisfactionScore} END), 2)`,
          totalTokensUsed: sql<number>`SUM(${parlantSession.tokensUsed})`,
          totalCost: sql<number>`SUM(${parlantSession.cost})`,
          avgMessagesPerSession: sql<number>`ROUND(AVG(${parlantSession.messageCount}), 2)`,
          lastActivity: sql<Date>`MAX(${parlantSession.lastActivityAt})`,
        })
        .from(parlantAgent)
        .leftJoin(parlantSession, eq(parlantSession.agentId, parlantAgent.id))
        .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
        .groupBy(parlantAgent.id, parlantAgent.name, parlantAgent.totalSessions)
        .orderBy(desc(sql`SUM(${parlantSession.cost})`))

      expect(agentMetrics).toHaveLength(2)
      expect(agentMetrics[0].agentName).toBe('Analytics Agent 1')
      expect(agentMetrics[0].completedSessions).toBe(2)
      expect(agentMetrics[0].avgSatisfaction).toBe(4.5) // Average of 5 and 4
      expect(agentMetrics[0].totalTokensUsed).toBe(900)
      expect(agentMetrics[0].totalCost).toBe(90)

      expect(agentMetrics[1].agentName).toBe('Analytics Agent 2')
      expect(agentMetrics[1].completedSessions).toBe(0) // Only has active session
      expect(agentMetrics[1].totalTokensUsed).toBe(250)

      // Session type breakdown query
      const sessionTypeBreakdown = await db
        .select({
          sessionType: parlantSession.sessionType,
          sessionCount: count(parlantSession.id),
          avgSatisfaction: sql<number>`ROUND(AVG(CASE WHEN ${parlantSession.satisfactionScore} IS NOT NULL THEN ${parlantSession.satisfactionScore} END), 2)`,
          totalCost: sql<number>`SUM(${parlantSession.cost})`,
        })
        .from(parlantSession)
        .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
        .where(eq(parlantAgent.workspaceId, ctx.workspaceId))
        .groupBy(parlantSession.sessionType)
        .orderBy(desc(count(parlantSession.id)))

      const typeMap = new Map(sessionTypeBreakdown.map(t => [t.sessionType, t]))

      expect(typeMap.get('support')?.sessionCount).toBe(1)
      expect(typeMap.get('support')?.avgSatisfaction).toBe(5)
      expect(typeMap.get('conversation')?.sessionCount).toBe(1)
      expect(typeMap.get('conversation')?.avgSatisfaction).toBe(4)
      expect(typeMap.get('onboarding')?.sessionCount).toBe(1)
      expect(typeMap.get('onboarding')?.avgSatisfaction).toBeNull()
    })

    it('should handle complex journey path analysis', async () => {
      // Create agent and journey structure
      const agent = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Journey Analytics Agent',
        })
        .returning()

      const journey = await db
        .insert(parlantJourney)
        .values({
          agentId: agent[0].id,
          title: 'Complex Customer Journey',
          conditions: ['user.type === "customer"'],
          totalSessions: 10,
          completionRate: 80,
        })
        .returning()

      // Create multiple states
      const states = await db
        .insert(parlantJourneyState)
        .values([
          {
            journeyId: journey[0].id,
            name: 'Welcome',
            stateType: 'chat',
            isInitial: true,
          },
          {
            journeyId: journey[0].id,
            name: 'Gather Info',
            stateType: 'chat',
          },
          {
            journeyId: journey[0].id,
            name: 'Process Request',
            stateType: 'tool',
          },
          {
            journeyId: journey[0].id,
            name: 'Complete',
            stateType: 'final',
            isFinal: true,
          },
        ])
        .returning()

      // Create transitions with usage statistics
      const transitions = await db
        .insert(parlantJourneyTransition)
        .values([
          {
            journeyId: journey[0].id,
            fromStateId: states[0].id, // Welcome -> Gather Info
            toStateId: states[1].id,
            condition: 'user.ready === true',
            priority: 100,
            useCount: 15,
            lastUsedAt: new Date(),
          },
          {
            journeyId: journey[0].id,
            fromStateId: states[1].id, // Gather Info -> Process Request
            toStateId: states[2].id,
            condition: 'info.complete === true',
            priority: 100,
            useCount: 12,
            lastUsedAt: new Date(),
          },
          {
            journeyId: journey[0].id,
            fromStateId: states[2].id, // Process Request -> Complete
            toStateId: states[3].id,
            condition: 'processing.success === true',
            priority: 100,
            useCount: 8,
            lastUsedAt: new Date(),
          },
          {
            journeyId: journey[0].id,
            fromStateId: states[1].id, // Gather Info -> Complete (skip)
            toStateId: states[3].id,
            condition: 'user.skip === true',
            priority: 50,
            useCount: 3,
            lastUsedAt: new Date(),
          },
        ])
        .returning()

      // Analyze journey flow patterns
      const journeyAnalysis = await db
        .select({
          journeyTitle: parlantJourney.title,
          fromStateName: sql<string>`from_state.name`,
          toStateName: sql<string>`to_state.name`,
          transitionCount: parlantJourneyTransition.useCount,
          transitionSuccess: sql<number>`ROUND((${parlantJourneyTransition.useCount}::float / ${parlantJourney.totalSessions}) * 100, 2)`,
          priority: parlantJourneyTransition.priority,
        })
        .from(parlantJourneyTransition)
        .innerJoin(parlantJourney, eq(parlantJourneyTransition.journeyId, parlantJourney.id))
        .innerJoin(
          parlantJourneyState,
          eq(parlantJourneyTransition.fromStateId, parlantJourneyState.id)
        )
        .innerJoin(
          sql`${parlantJourneyState} AS to_state`,
          sql`${parlantJourneyTransition.toStateId} = to_state.id`
        )
        .where(eq(parlantJourney.id, journey[0].id))
        .orderBy(desc(parlantJourneyTransition.useCount))

      // Verify transition analysis
      expect(journeyAnalysis[0].fromStateName).toBe('Welcome')
      expect(journeyAnalysis[0].toStateName).toBe('Gather Info')
      expect(journeyAnalysis[0].transitionCount).toBe(15)
      expect(journeyAnalysis[0].transitionSuccess).toBe(150) // 15/10 * 100 = 150%

      // Find bottlenecks (states where users drop off)
      const bottleneckAnalysis = await db
        .select({
          stateName: parlantJourneyState.name,
          stateType: parlantJourneyState.stateType,
          incomingTransitions: sql<number>`COUNT(incoming.id)`,
          outgoingTransitions: sql<number>`COUNT(outgoing.id)`,
          totalIncoming: sql<number>`COALESCE(SUM(incoming.use_count), 0)`,
          totalOutgoing: sql<number>`COALESCE(SUM(outgoing.use_count), 0)`,
          dropoffRate: sql<number>`ROUND(
            (COALESCE(SUM(incoming.use_count), 0) - COALESCE(SUM(outgoing.use_count), 0))::float /
            NULLIF(COALESCE(SUM(incoming.use_count), 0), 0) * 100, 2
          )`,
        })
        .from(parlantJourneyState)
        .leftJoin(
          sql`${parlantJourneyTransition} AS incoming`,
          sql`incoming.to_state_id = ${parlantJourneyState.id}`
        )
        .leftJoin(
          sql`${parlantJourneyTransition} AS outgoing`,
          sql`outgoing.from_state_id = ${parlantJourneyState.id}`
        )
        .where(eq(parlantJourneyState.journeyId, journey[0].id))
        .groupBy(
          parlantJourneyState.id,
          parlantJourneyState.name,
          parlantJourneyState.stateType
        )
        .orderBy(desc(sql`COALESCE(SUM(incoming.use_count), 0) - COALESCE(SUM(outgoing.use_count), 0)`))

      const stateMap = new Map(bottleneckAnalysis.map(s => [s.stateName, s]))

      // Process Request state should have highest drop-off (12 in, 8 out = 33% drop-off)
      expect(stateMap.get('Process Request')?.totalIncoming).toBe(12)
      expect(stateMap.get('Process Request')?.totalOutgoing).toBe(8)
      expect(stateMap.get('Process Request')?.dropoffRate).toBe(33.33)
    })
  })

  describe('Transaction Handling and Data Consistency', () => {
    it('should maintain consistency during complex multi-table operations', async () => {
      await db.transaction(async (tx) => {
        // Create agent
        const agent = await tx
          .insert(parlantAgent)
          .values({
            workspaceId: ctx.workspaceId,
            createdBy: ctx.userId,
            name: 'Transaction Test Agent',
            status: 'active',
          })
          .returning()

        // Create multiple related entities in single transaction
        const tool = await tx
          .insert(parlantTool)
          .values({
            workspaceId: ctx.workspaceId,
            name: 'transaction_tool',
            displayName: 'Transaction Test Tool',
            description: 'Tool for testing transactions',
            toolType: 'custom',
            parameters: { type: 'object', properties: {} },
          })
          .returning()

        const session = await tx
          .insert(parlantSession)
          .values({
            agentId: agent[0].id,
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            status: 'active',
            title: 'Transaction Test Session',
          })
          .returning()

        // Create agent-tool relationship
        await tx.insert(parlantAgentTool).values({
          agentId: agent[0].id,
          toolId: tool[0].id,
          enabled: true,
        })

        // Create session events
        const events = Array.from({ length: 5 }, (_, i) => ({
          sessionId: session[0].id,
          offset: i + 1,
          eventType: 'customer_message' as const,
          content: { message: `Transaction test message ${i + 1}` },
        }))

        await tx.insert(parlantEvent).values(events)

        // Update agent statistics
        await tx
          .update(parlantAgent)
          .set({
            totalSessions: 1,
            totalMessages: 5,
            lastActiveAt: new Date(),
          })
          .where(eq(parlantAgent.id, agent[0].id))

        // Store IDs for verification outside transaction
        ctx.agentId = agent[0].id
        ctx.sessionId = session[0].id
        ctx.toolId = tool[0].id
      })

      // Verify all operations completed successfully
      const verificationResults = await Promise.all([
        db.select().from(parlantAgent).where(eq(parlantAgent.id, ctx.agentId)),
        db.select().from(parlantSession).where(eq(parlantSession.id, ctx.sessionId)),
        db.select().from(parlantTool).where(eq(parlantTool.id, ctx.toolId)),
        db
          .select({ count: count() })
          .from(parlantEvent)
          .where(eq(parlantEvent.sessionId, ctx.sessionId)),
        db
          .select({ count: count() })
          .from(parlantAgentTool)
          .where(eq(parlantAgentTool.agentId, ctx.agentId)),
      ])

      expect(verificationResults[0]).toHaveLength(1) // Agent exists
      expect(verificationResults[0][0].totalSessions).toBe(1)
      expect(verificationResults[1]).toHaveLength(1) // Session exists
      expect(verificationResults[2]).toHaveLength(1) // Tool exists
      expect(verificationResults[3][0].count).toBe(5) // All events created
      expect(verificationResults[4][0].count).toBe(1) // Agent-tool relationship exists
    })

    it('should properly handle transaction rollback on errors', async () => {
      let agentId: string = ''

      // Transaction that should fail and rollback
      await expect(
        db.transaction(async (tx) => {
          const agent = await tx
            .insert(parlantAgent)
            .values({
              workspaceId: ctx.workspaceId,
              createdBy: ctx.userId,
              name: 'Rollback Test Agent',
            })
            .returning()

          agentId = agent[0].id

          const session = await tx
            .insert(parlantSession)
            .values({
              agentId: agent[0].id,
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
            })
            .returning()

          // This should fail due to duplicate offset in same session
          await tx.insert(parlantEvent).values([
            {
              sessionId: session[0].id,
              offset: 1,
              eventType: 'customer_message',
              content: { message: 'First message' },
            },
            {
              sessionId: session[0].id,
              offset: 1, // Duplicate offset - should cause constraint violation
              eventType: 'agent_message',
              content: { message: 'Second message' },
            },
          ])
        })
      ).rejects.toThrow()

      // Verify rollback - agent should not exist
      const agentCheck = await db
        .select()
        .from(parlantAgent)
        .where(eq(parlantAgent.id, agentId))

      expect(agentCheck).toHaveLength(0)

      // Verify no orphaned sessions
      const sessionCheck = await db
        .select({ count: count() })
        .from(parlantSession)
        .where(eq(parlantSession.workspaceId, ctx.workspaceId))

      expect(sessionCheck[0].count).toBe(0)
    })
  })

  describe('Workspace Isolation and Multi-tenancy', () => {
    it('should properly isolate data between different workspaces', async () => {
      // Create second workspace and user
      const user2 = await db
        .insert(user)
        .values({
          id: `user2-${Date.now()}`,
          name: 'Test User 2',
          email: `test2-${Date.now()}@example.com`,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      const workspace2 = await db
        .insert(workspace)
        .values({
          id: `workspace2-${Date.now()}`,
          name: 'Test Workspace 2',
          ownerId: user2[0].id,
        })
        .returning()

      // Create agents in both workspaces
      const agent1 = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Workspace 1 Agent',
        })
        .returning()

      const agent2 = await db
        .insert(parlantAgent)
        .values({
          workspaceId: workspace2[0].id,
          createdBy: user2[0].id,
          name: 'Workspace 2 Agent',
        })
        .returning()

      // Create sessions in both workspaces
      await db.insert(parlantSession).values([
        {
          agentId: agent1[0].id,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          title: 'Session in Workspace 1',
        },
        {
          agentId: agent2[0].id,
          workspaceId: workspace2[0].id,
          userId: user2[0].id,
          title: 'Session in Workspace 2',
        },
      ])

      // Verify workspace isolation
      const workspace1Data = await db
        .select({
          agentName: parlantAgent.name,
          sessionTitle: parlantSession.title,
        })
        .from(parlantAgent)
        .innerJoin(parlantSession, eq(parlantSession.agentId, parlantAgent.id))
        .where(eq(parlantAgent.workspaceId, ctx.workspaceId))

      const workspace2Data = await db
        .select({
          agentName: parlantAgent.name,
          sessionTitle: parlantSession.title,
        })
        .from(parlantAgent)
        .innerJoin(parlantSession, eq(parlantSession.agentId, parlantAgent.id))
        .where(eq(parlantAgent.workspaceId, workspace2[0].id))

      expect(workspace1Data).toHaveLength(1)
      expect(workspace1Data[0].agentName).toBe('Workspace 1 Agent')
      expect(workspace1Data[0].sessionTitle).toBe('Session in Workspace 1')

      expect(workspace2Data).toHaveLength(1)
      expect(workspace2Data[0].agentName).toBe('Workspace 2 Agent')
      expect(workspace2Data[0].sessionTitle).toBe('Session in Workspace 2')

      // Verify cross-workspace queries return no data
      const crossWorkspaceQuery = await db
        .select()
        .from(parlantSession)
        .where(
          and(
            eq(parlantSession.agentId, agent1[0].id),
            eq(parlantSession.workspaceId, workspace2[0].id)
          )
        )

      expect(crossWorkspaceQuery).toHaveLength(0)

      // Cleanup additional test data
      await db.delete(parlantSession).where(eq(parlantSession.workspaceId, workspace2[0].id))
      await db.delete(parlantAgent).where(eq(parlantAgent.workspaceId, workspace2[0].id))
      await db.delete(workspace).where(eq(workspace.id, workspace2[0].id))
      await db.delete(user).where(eq(user.id, user2[0].id))
    })
  })
})