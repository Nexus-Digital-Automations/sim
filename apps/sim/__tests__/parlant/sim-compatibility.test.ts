/**
 * @vitest-environment node
 *
 * Sim Functionality Compatibility Tests
 *
 * Comprehensive validation tests to ensure existing Sim functionality
 * remains fully operational after Parlant database extension integration.
 * Tests core Sim workflows, database operations, and API endpoints.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@sim/db'
import { sql } from 'drizzle-orm'
import {
  // Existing Sim tables
  user,
  session,
  account,
  workspace,
  workspaceInvitation,
  permissions,
  workflow,
  workflowBlocks,
  workflowEdges,
  workflowSubflows,
  workflowExecutionLogs,
  workflowExecutionSnapshots,
  workflowSchedule,
  webhook,
  apiKey,
  knowledgeBase,
  document,
  embedding,
  customTools,
  mcpServers,
  chat,
  copilotChats,
  workflowCheckpoints,
  templates,
  templateStars,
  userStats,
  subscription,
  userRateLimits,
  marketplace,
  memory,
  environment,
  workspaceEnvironment,
  settings,
  // Parlant tables (to ensure they don't interfere)
  parlantAgent,
  parlantSession,
  parlantEvent,
} from '@sim/db/schema'
import { eq, count, and, desc } from 'drizzle-orm'

interface SimTestContext {
  userId: string
  workspaceId: string
  workflowId: string
  apiKeyId: string
  knowledgeBaseId: string
  chatId: string
}

describe('Sim Functionality Compatibility Tests', () => {
  let ctx: SimTestContext

  beforeEach(async () => {
    // Create comprehensive Sim test context
    const userResult = await db
      .insert(user)
      .values({
        id: `simuser-${Date.now()}`,
        name: 'Sim Compatibility User',
        email: `simcompat-${Date.now()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: user.id })

    const workspaceResult = await db
      .insert(workspace)
      .values({
        id: `simworkspace-${Date.now()}`,
        name: 'Sim Compatibility Workspace',
        ownerId: userResult[0].id,
      })
      .returning({ id: workspace.id })

    const workflowResult = await db
      .insert(workflow)
      .values({
        id: `simworkflow-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Sim Compatibility Workflow',
        description: 'Test workflow for compatibility validation',
        color: '#3972F6',
        lastSynced: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deployedState: {
          version: '1.0.0',
          blocks: {},
          edges: [],
        },
        variables: { testVar: 'testValue' },
      })
      .returning({ id: workflow.id })

    const apiKeyResult = await db
      .insert(apiKey)
      .values({
        id: `simkey-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Sim Compatibility API Key',
        key: `sk-sim-${Date.now()}`,
        type: 'workspace',
        createdBy: userResult[0].id,
      })
      .returning({ id: apiKey.id })

    const kbResult = await db
      .insert(knowledgeBase)
      .values({
        id: `simkb-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Sim Compatibility KB',
        description: 'Knowledge base for compatibility testing',
        tokenCount: 1000,
        embeddingModel: 'text-embedding-3-small',
        embeddingDimension: 1536,
      })
      .returning({ id: knowledgeBase.id })

    const chatResult = await db
      .insert(chat)
      .values({
        id: `simchat-${Date.now()}`,
        workflowId: workflowResult[0].id,
        userId: userResult[0].id,
        subdomain: `simtest-${Date.now()}`,
        title: 'Sim Compatibility Chat',
        description: 'Chat interface for compatibility testing',
        authType: 'public',
      })
      .returning({ id: chat.id })

    ctx = {
      userId: userResult[0].id,
      workspaceId: workspaceResult[0].id,
      workflowId: workflowResult[0].id,
      apiKeyId: apiKeyResult[0].id,
      knowledgeBaseId: kbResult[0].id,
      chatId: chatResult[0].id,
    }
  })

  afterEach(async () => {
    // Clean up all test data
    try {
      // Clean Parlant data first (if any was created)
      await db.delete(parlantEvent).where(sql`true`)
      await db.delete(parlantSession).where(sql`true`)
      await db.delete(parlantAgent).where(sql`true`)

      // Clean Sim data in dependency order
      await db.delete(templateStars).where(sql`true`)
      await db.delete(templates).where(sql`true`)
      await db.delete(workflowCheckpoints).where(sql`true`)
      await db.delete(copilotChats).where(sql`true`)
      await db.delete(chat).where(sql`true`)
      await db.delete(mcpServers).where(sql`true`)
      await db.delete(customTools).where(sql`true`)
      await db.delete(embedding).where(sql`true`)
      await db.delete(document).where(sql`true`)
      await db.delete(knowledgeBase).where(sql`true`)
      await db.delete(memory).where(sql`true`)
      await db.delete(webhook).where(sql`true`)
      await db.delete(workflowSchedule).where(sql`true`)
      await db.delete(workflowExecutionLogs).where(sql`true`)
      await db.delete(workflowExecutionSnapshots).where(sql`true`)
      await db.delete(workflowSubflows).where(sql`true`)
      await db.delete(workflowEdges).where(sql`true`)
      await db.delete(workflowBlocks).where(sql`true`)
      await db.delete(workflow).where(sql`true`)
      await db.delete(userRateLimits).where(sql`true`)
      await db.delete(subscription).where(sql`true`)
      await db.delete(userStats).where(sql`true`)
      await db.delete(marketplace).where(sql`true`)
      await db.delete(apiKey).where(sql`true`)
      await db.delete(workspaceEnvironment).where(sql`true`)
      await db.delete(environment).where(sql`true`)
      await db.delete(settings).where(sql`true`)
      await db.delete(permissions).where(sql`true`)
      await db.delete(workspaceInvitation).where(sql`true`)
      await db.delete(workspace).where(sql`true`)
      await db.delete(account).where(sql`true`)
      await db.delete(session).where(sql`true`)
      await db.delete(user).where(sql`true`)
    } catch (error) {
      console.warn('Sim compatibility test cleanup error:', error)
    }
  })

  describe('Core Sim User and Workspace Operations', () => {
    it('should maintain full user management functionality', async () => {
      // Test user creation, update, and relationships
      const newUser = await db
        .insert(user)
        .values({
          id: `newuser-${Date.now()}`,
          name: 'New Test User',
          email: `newuser-${Date.now()}@example.com`,
          emailVerified: false,
          image: 'https://example.com/avatar.png',
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeCustomerId: 'cus_test_123',
        })
        .returning()

      expect(newUser[0].name).toBe('New Test User')
      expect(newUser[0].emailVerified).toBe(false)

      // Test user update
      const updatedUser = await db
        .update(user)
        .set({
          name: 'Updated Test User',
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, newUser[0].id))
        .returning()

      expect(updatedUser[0].name).toBe('Updated Test User')
      expect(updatedUser[0].emailVerified).toBe(true)

      // Test user settings creation
      const userSettings = await db
        .insert(settings)
        .values({
          id: newUser[0].id,
          userId: newUser[0].id,
          theme: 'dark',
          autoConnect: false,
          telemetryEnabled: false,
          emailPreferences: { marketing: false, updates: true },
          billingUsageNotificationsEnabled: true,
        })
        .returning()

      expect(userSettings[0].theme).toBe('dark')
      expect(userSettings[0].autoConnect).toBe(false)

      // Test user stats creation
      const userStatsResult = await db
        .insert(userStats)
        .values({
          id: newUser[0].id,
          userId: newUser[0].id,
          totalManualExecutions: 5,
          totalApiCalls: 10,
          totalTokensUsed: 1500,
          totalCost: '25.50',
          currentUsageLimit: '100.00',
          billingBlocked: false,
        })
        .returning()

      expect(userStatsResult[0].totalManualExecutions).toBe(5)
      expect(userStatsResult[0].totalCost).toBe('25.50')

      // Verify user can be queried with all relationships
      const userWithRelations = await db
        .select({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          theme: settings.theme,
          totalCost: userStats.totalCost,
        })
        .from(user)
        .leftJoin(settings, eq(settings.userId, user.id))
        .leftJoin(userStats, eq(userStats.userId, user.id))
        .where(eq(user.id, newUser[0].id))

      expect(userWithRelations[0].userName).toBe('Updated Test User')
      expect(userWithRelations[0].theme).toBe('dark')
      expect(userWithRelations[0].totalCost).toBe('25.50')

      // Clean up
      await db.delete(userStats).where(eq(userStats.userId, newUser[0].id))
      await db.delete(settings).where(eq(settings.userId, newUser[0].id))
      await db.delete(user).where(eq(user.id, newUser[0].id))
    })

    it('should maintain full workspace management functionality', async () => {
      // Test workspace permissions
      const memberPermission = await db
        .insert(permissions)
        .values({
          id: `perm-${Date.now()}`,
          userId: ctx.userId,
          entityType: 'workspace',
          entityId: ctx.workspaceId,
          permissionType: 'admin',
        })
        .returning()

      expect(memberPermission[0].permissionType).toBe('admin')

      // Test workspace environment variables
      const wsEnv = await db
        .insert(workspaceEnvironment)
        .values({
          id: `wsenv-${Date.now()}`,
          workspaceId: ctx.workspaceId,
          variables: {
            API_URL: 'https://api.example.com',
            DEBUG_MODE: 'true',
            VERSION: '1.0.0',
          },
        })
        .returning()

      expect(wsEnv[0].variables).toEqual({
        API_URL: 'https://api.example.com',
        DEBUG_MODE: 'true',
        VERSION: '1.0.0',
      })

      // Test workspace invitations
      const invitation = await db
        .insert(workspaceInvitation)
        .values({
          id: `inv-${Date.now()}`,
          workspaceId: ctx.workspaceId,
          email: 'invited@example.com',
          inviterId: ctx.userId,
          role: 'member',
          permissions: 'write',
          token: `token-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000), // 24 hours
        })
        .returning()

      expect(invitation[0].email).toBe('invited@example.com')
      expect(invitation[0].role).toBe('member')

      // Test complex workspace query with joins
      const workspaceDetails = await db
        .select({
          workspaceName: workspace.name,
          ownerName: user.name,
          permissionCount: count(permissions.id),
          hasEnvironment: sql<boolean>`CASE WHEN ${workspaceEnvironment.id} IS NOT NULL THEN TRUE ELSE FALSE END`,
          invitationCount: sql<number>`COUNT(DISTINCT ${workspaceInvitation.id})`,
        })
        .from(workspace)
        .innerJoin(user, eq(workspace.ownerId, user.id))
        .leftJoin(permissions, eq(permissions.entityId, workspace.id))
        .leftJoin(workspaceEnvironment, eq(workspaceEnvironment.workspaceId, workspace.id))
        .leftJoin(workspaceInvitation, eq(workspaceInvitation.workspaceId, workspace.id))
        .where(eq(workspace.id, ctx.workspaceId))
        .groupBy(
          workspace.name,
          user.name,
          workspaceEnvironment.id
        )

      expect(workspaceDetails[0].workspaceName).toBe('Sim Compatibility Workspace')
      expect(workspaceDetails[0].permissionCount).toBe(1)
      expect(workspaceDetails[0].hasEnvironment).toBe(true)
      expect(workspaceDetails[0].invitationCount).toBe(1)

      // Clean up
      await db.delete(workspaceInvitation).where(eq(workspaceInvitation.workspaceId, ctx.workspaceId))
      await db.delete(workspaceEnvironment).where(eq(workspaceEnvironment.workspaceId, ctx.workspaceId))
      await db.delete(permissions).where(eq(permissions.id, memberPermission[0].id))
    })

    it('should handle user sessions and authentication properly', async () => {
      // Test session creation
      const userSession = await db
        .insert(session)
        .values({
          id: `session-${Date.now()}`,
          userId: ctx.userId,
          token: `token-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000), // 24 hours
          createdAt: new Date(),
          updatedAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser',
          activeOrganizationId: null,
        })
        .returning()

      expect(userSession[0].userId).toBe(ctx.userId)
      expect(userSession[0].ipAddress).toBe('192.168.1.1')

      // Test account linking
      const userAccount = await db
        .insert(account)
        .values({
          id: `account-${Date.now()}`,
          userId: ctx.userId,
          accountId: 'github_123456',
          providerId: 'github',
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          scope: 'read:user,user:email',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      expect(userAccount[0].providerId).toBe('github')
      expect(userAccount[0].scope).toBe('read:user,user:email')

      // Test session validation query (typical auth pattern)
      const validSession = await db
        .select({
          sessionId: session.id,
          userId: session.userId,
          userName: user.name,
          userEmail: user.email,
          sessionExpires: session.expiresAt,
        })
        .from(session)
        .innerJoin(user, eq(session.userId, user.id))
        .where(
          and(
            eq(session.id, userSession[0].id),
            sql`${session.expiresAt} > NOW()`
          )
        )

      expect(validSession[0].userId).toBe(ctx.userId)
      expect(validSession[0].userName).toBe('Sim Compatibility User')

      // Clean up
      await db.delete(account).where(eq(account.id, userAccount[0].id))
      await db.delete(session).where(eq(session.id, userSession[0].id))
    })
  })

  describe('Workflow Management Functionality', () => {
    it('should maintain full workflow CRUD operations', async () => {
      // Test workflow blocks creation
      const blocks = await db
        .insert(workflowBlocks)
        .values([
          {
            id: 'block-start',
            workflowId: ctx.workflowId,
            type: 'starter',
            name: 'Start Block',
            positionX: '100',
            positionY: '100',
            enabled: true,
            horizontalHandles: true,
            isWide: false,
            height: '150',
            subBlocks: {
              trigger: {
                id: 'trigger',
                type: 'manual',
                value: null,
              },
            },
            outputs: {
              output: { type: 'any' },
            },
            data: { version: '1.0' },
          },
          {
            id: 'block-api',
            workflowId: ctx.workflowId,
            type: 'api',
            name: 'API Block',
            positionX: '300',
            positionY: '100',
            enabled: true,
            horizontalHandles: true,
            isWide: true,
            height: '200',
            subBlocks: {
              url: {
                id: 'url',
                type: 'short-input',
                value: 'https://api.example.com/data',
              },
              method: {
                id: 'method',
                type: 'dropdown',
                value: 'GET',
              },
            },
            outputs: {
              response: { type: 'object' },
              status: { type: 'number' },
            },
            data: { timeout: 30000 },
          },
        ])
        .returning()

      expect(blocks).toHaveLength(2)
      expect(blocks[0].type).toBe('starter')
      expect(blocks[1].type).toBe('api')

      // Test workflow edges creation
      const edges = await db
        .insert(workflowEdges)
        .values([
          {
            id: 'edge-1',
            workflowId: ctx.workflowId,
            sourceBlockId: 'block-start',
            targetBlockId: 'block-api',
            sourceHandle: 'output',
            targetHandle: 'input',
          },
        ])
        .returning()

      expect(edges[0].sourceBlockId).toBe('block-start')
      expect(edges[0].targetBlockId).toBe('block-api')

      // Test workflow subflows (loops/parallels)
      const subflow = await db
        .insert(workflowSubflows)
        .values([
          {
            id: 'loop-1',
            workflowId: ctx.workflowId,
            type: 'loop',
            config: {
              id: 'loop-1',
              iterations: 5,
              loopType: 'for',
              nodes: ['block-api'],
            },
          },
        ])
        .returning()

      expect(subflow[0].type).toBe('loop')

      // Test workflow state retrieval (complex join query)
      const workflowState = await db
        .select({
          workflowId: workflow.id,
          workflowName: workflow.name,
          blockCount: count(workflowBlocks.id),
          edgeCount: sql<number>`COUNT(DISTINCT ${workflowEdges.id})`,
          subflowCount: sql<number>`COUNT(DISTINCT ${workflowSubflows.id})`,
          isDeployed: workflow.isDeployed,
          lastSynced: workflow.lastSynced,
        })
        .from(workflow)
        .leftJoin(workflowBlocks, eq(workflowBlocks.workflowId, workflow.id))
        .leftJoin(workflowEdges, eq(workflowEdges.workflowId, workflow.id))
        .leftJoin(workflowSubflows, eq(workflowSubflows.workflowId, workflow.id))
        .where(eq(workflow.id, ctx.workflowId))
        .groupBy(
          workflow.id,
          workflow.name,
          workflow.isDeployed,
          workflow.lastSynced
        )

      expect(workflowState[0].workflowName).toBe('Sim Compatibility Workflow')
      expect(workflowState[0].blockCount).toBe(2)
      expect(workflowState[0].edgeCount).toBe(1)
      expect(workflowState[0].subflowCount).toBe(1)

      // Test workflow update operations
      const updatedWorkflow = await db
        .update(workflow)
        .set({
          name: 'Updated Compatibility Workflow',
          description: 'Updated description for testing',
          isDeployed: true,
          deployedAt: new Date(),
          runCount: 5,
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflow.id, ctx.workflowId))
        .returning()

      expect(updatedWorkflow[0].name).toBe('Updated Compatibility Workflow')
      expect(updatedWorkflow[0].isDeployed).toBe(true)
      expect(updatedWorkflow[0].runCount).toBe(5)
    })

    it('should handle workflow execution and logging', async () => {
      // Test execution snapshot creation
      const snapshot = await db
        .insert(workflowExecutionSnapshots)
        .values({
          id: `snapshot-${Date.now()}`,
          workflowId: ctx.workflowId,
          stateHash: `hash-${Date.now()}`,
          stateData: {
            blocks: {
              'block-1': { status: 'completed', output: { result: 'test' } },
              'block-2': { status: 'running', output: null },
            },
            variables: { testVar: 'testValue' },
            metadata: { executionId: 'exec-123', startTime: Date.now() },
          },
        })
        .returning()

      expect(snapshot[0].stateData).toHaveProperty('blocks')
      expect(snapshot[0].stateData).toHaveProperty('variables')

      // Test execution log creation
      const executionLog = await db
        .insert(workflowExecutionLogs)
        .values({
          id: `log-${Date.now()}`,
          workflowId: ctx.workflowId,
          executionId: 'exec-123',
          stateSnapshotId: snapshot[0].id,
          level: 'info',
          trigger: 'manual',
          startedAt: new Date(),
          endedAt: new Date(),
          totalDurationMs: 1500,
          executionData: {
            blocks: ['block-1', 'block-2'],
            totalSteps: 2,
            successfulSteps: 2,
            errors: [],
            warnings: [],
          },
          cost: {
            totalCost: 0.05,
            breakdown: {
              llm: 0.03,
              tools: 0.02,
            },
          },
          files: [
            {
              id: 'file-1',
              name: 'output.json',
              size: 1024,
              type: 'application/json',
            },
          ],
        })
        .returning()

      expect(executionLog[0].trigger).toBe('manual')
      expect(executionLog[0].totalDurationMs).toBe(1500)

      // Test execution analytics query
      const executionAnalytics = await db
        .select({
          workflowName: workflow.name,
          totalExecutions: count(workflowExecutionLogs.id),
          avgDuration: sql<number>`ROUND(AVG(${workflowExecutionLogs.totalDurationMs}), 2)`,
          totalCost: sql<number>`SUM(CAST(${workflowExecutionLogs.cost}->>'totalCost' AS DECIMAL))`,
          successRate: sql<number>`ROUND(
            COUNT(CASE WHEN ${workflowExecutionLogs.level} = 'info' THEN 1 END)::float /
            COUNT(${workflowExecutionLogs.id}) * 100, 2
          )`,
          lastExecution: sql<Date>`MAX(${workflowExecutionLogs.startedAt})`,
          triggerBreakdown: sql<string>`STRING_AGG(DISTINCT ${workflowExecutionLogs.trigger}, ', ')`,
        })
        .from(workflow)
        .leftJoin(workflowExecutionLogs, eq(workflowExecutionLogs.workflowId, workflow.id))
        .where(eq(workflow.id, ctx.workflowId))
        .groupBy(workflow.id, workflow.name)

      expect(executionAnalytics[0].totalExecutions).toBe(1)
      expect(executionAnalytics[0].avgDuration).toBe(1500)
      expect(executionAnalytics[0].successRate).toBe(100)
      expect(executionAnalytics[0].triggerBreakdown).toBe('manual')
    })

    it('should handle workflow scheduling and webhooks', async () => {
      // Test workflow schedule creation
      const schedule = await db
        .insert(workflowSchedule)
        .values({
          id: `schedule-${Date.now()}`,
          workflowId: ctx.workflowId,
          cronExpression: '0 9 * * *', // Daily at 9 AM
          nextRunAt: new Date(Date.now() + 86400000), // Tomorrow
          triggerType: 'schedule',
          timezone: 'America/New_York',
          status: 'active',
        })
        .returning()

      expect(schedule[0].cronExpression).toBe('0 9 * * *')
      expect(schedule[0].status).toBe('active')

      // Test webhook creation
      const webhookResult = await db
        .insert(webhook)
        .values({
          id: `webhook-${Date.now()}`,
          workflowId: ctx.workflowId,
          path: `webhook-path-${Date.now()}`,
          provider: 'github',
          providerConfig: {
            events: ['push', 'pull_request'],
            secret: 'webhook-secret-123',
            branches: ['main', 'develop'],
          },
          isActive: true,
        })
        .returning()

      expect(webhookResult[0].provider).toBe('github')
      expect(webhookResult[0].isActive).toBe(true)

      // Test webhook and schedule query
      const workflowTriggers = await db
        .select({
          workflowName: workflow.name,
          hasSchedule: sql<boolean>`CASE WHEN ${workflowSchedule.id} IS NOT NULL THEN TRUE ELSE FALSE END`,
          scheduleExpression: workflowSchedule.cronExpression,
          scheduleStatus: workflowSchedule.status,
          webhookCount: sql<number>`COUNT(DISTINCT ${webhook.id})`,
          activeWebhooks: sql<number>`COUNT(CASE WHEN ${webhook.isActive} = TRUE THEN 1 END)`,
          webhookProviders: sql<string>`STRING_AGG(DISTINCT ${webhook.provider}, ', ')`,
        })
        .from(workflow)
        .leftJoin(workflowSchedule, eq(workflowSchedule.workflowId, workflow.id))
        .leftJoin(webhook, eq(webhook.workflowId, workflow.id))
        .where(eq(workflow.id, ctx.workflowId))
        .groupBy(
          workflow.id,
          workflow.name,
          workflowSchedule.id,
          workflowSchedule.cronExpression,
          workflowSchedule.status
        )

      expect(workflowTriggers[0].hasSchedule).toBe(true)
      expect(workflowTriggers[0].scheduleExpression).toBe('0 9 * * *')
      expect(workflowTriggers[0].webhookCount).toBe(1)
      expect(workflowTriggers[0].webhookProviders).toBe('github')
    })
  })

  describe('Knowledge Base and AI Functionality', () => {
    it('should maintain knowledge base operations', async () => {
      // Test document creation
      const doc = await db
        .insert(document)
        .values({
          id: `doc-${Date.now()}`,
          knowledgeBaseId: ctx.knowledgeBaseId,
          filename: 'test-document.pdf',
          fileUrl: 'https://example.com/docs/test-document.pdf',
          fileSize: 1024000, // 1MB
          mimeType: 'application/pdf',
          chunkCount: 10,
          tokenCount: 2500,
          characterCount: 10000,
          processingStatus: 'completed',
          processingCompletedAt: new Date(),
          enabled: true,
          tag1: 'compatibility',
          tag2: 'testing',
          tag3: 'documentation',
        })
        .returning()

      expect(doc[0].filename).toBe('test-document.pdf')
      expect(doc[0].processingStatus).toBe('completed')

      // Test embeddings creation
      const embeddings = await db
        .insert(embedding)
        .values([
          {
            id: `emb-${Date.now()}-1`,
            knowledgeBaseId: ctx.knowledgeBaseId,
            documentId: doc[0].id,
            chunkIndex: 0,
            chunkHash: 'hash-chunk-0',
            content: 'This is the first chunk of the test document for compatibility testing.',
            contentLength: 75,
            tokenCount: 18,
            embedding: Array(1536).fill(0).map(() => Math.random() - 0.5), // Random embedding
            embeddingModel: 'text-embedding-3-small',
            startOffset: 0,
            endOffset: 75,
            tag1: 'compatibility',
            tag2: 'testing',
            enabled: true,
          },
          {
            id: `emb-${Date.now()}-2`,
            knowledgeBaseId: ctx.knowledgeBaseId,
            documentId: doc[0].id,
            chunkIndex: 1,
            chunkHash: 'hash-chunk-1',
            content: 'This is the second chunk containing more detailed information about the testing process.',
            contentLength: 95,
            tokenCount: 22,
            embedding: Array(1536).fill(0).map(() => Math.random() - 0.5), // Random embedding
            embeddingModel: 'text-embedding-3-small',
            startOffset: 75,
            endOffset: 170,
            tag1: 'compatibility',
            tag2: 'testing',
            enabled: true,
          },
        ])
        .returning()

      expect(embeddings).toHaveLength(2)
      expect(embeddings[0].chunkIndex).toBe(0)
      expect(embeddings[1].chunkIndex).toBe(1)

      // Test knowledge base analytics query
      const kbAnalytics = await db
        .select({
          kbName: knowledgeBase.name,
          totalDocuments: count(document.id),
          totalChunks: sql<number>`SUM(${document.chunkCount})`,
          totalTokens: sql<number>`SUM(${document.tokenCount})`,
          processingStatus: sql<string>`STRING_AGG(DISTINCT ${document.processingStatus}, ', ')`,
          embeddingCount: sql<number>`COUNT(DISTINCT ${embedding.id})`,
          avgChunkLength: sql<number>`ROUND(AVG(${embedding.contentLength}), 2)`,
          enabledChunks: sql<number>`COUNT(CASE WHEN ${embedding.enabled} = TRUE THEN 1 END)`,
          uniqueTags: sql<string>`STRING_AGG(DISTINCT ${document.tag1}, ', ')`,
        })
        .from(knowledgeBase)
        .leftJoin(document, eq(document.knowledgeBaseId, knowledgeBase.id))
        .leftJoin(embedding, eq(embedding.documentId, document.id))
        .where(eq(knowledgeBase.id, ctx.knowledgeBaseId))
        .groupBy(knowledgeBase.id, knowledgeBase.name)

      expect(kbAnalytics[0].kbName).toBe('Sim Compatibility KB')
      expect(kbAnalytics[0].totalDocuments).toBe(1)
      expect(kbAnalytics[0].embeddingCount).toBe(2)
      expect(kbAnalytics[0].enabledChunks).toBe(2)

      // Test vector similarity search simulation (without actual vector operations)
      const searchResults = await db
        .select({
          chunkId: embedding.id,
          content: embedding.content,
          tokenCount: embedding.tokenCount,
          documentName: document.filename,
          tags: sql<string[]>`ARRAY[${embedding.tag1}, ${embedding.tag2}]`,
        })
        .from(embedding)
        .innerJoin(document, eq(embedding.documentId, document.id))
        .where(
          and(
            eq(embedding.knowledgeBaseId, ctx.knowledgeBaseId),
            eq(embedding.enabled, true),
            sql`${embedding.content} ILIKE '%compatibility%'`
          )
        )
        .orderBy(desc(embedding.tokenCount))
        .limit(5)

      expect(searchResults).toHaveLength(2)
      expect(searchResults.every(r => r.content.includes('compatibility'))).toBe(true)
    })

    it('should handle custom tools and MCP servers', async () => {
      // Test custom tools creation
      const customTool = await db
        .insert(customTools)
        .values({
          id: `tool-${Date.now()}`,
          userId: ctx.userId,
          title: 'Compatibility Test Tool',
          schema: {
            type: 'function',
            function: {
              name: 'process_data',
              description: 'Process data for compatibility testing',
              parameters: {
                type: 'object',
                properties: {
                  data: { type: 'string', description: 'Data to process' },
                  format: { type: 'string', enum: ['json', 'csv', 'xml'] },
                },
                required: ['data'],
              },
            },
          },
          code: `
            function process_data(data, format = 'json') {
              console.log('Processing data:', data);
              console.log('Format:', format);

              try {
                const result = {
                  processed: true,
                  input: data,
                  format: format,
                  timestamp: new Date().toISOString(),
                  size: data.length
                };

                return {
                  success: true,
                  result: result
                };
              } catch (error) {
                return {
                  success: false,
                  error: error.message
                };
              }
            }
          `,
        })
        .returning()

      expect(customTool[0].title).toBe('Compatibility Test Tool')

      // Test MCP server creation
      const mcpServer = await db
        .insert(mcpServers)
        .values({
          id: `mcp-${Date.now()}`,
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Compatibility MCP Server',
          description: 'MCP server for compatibility testing',
          transport: 'http',
          url: 'http://localhost:8080/mcp',
          headers: { 'Authorization': 'Bearer test-token' },
          timeout: 30000,
          retries: 3,
          enabled: true,
          toolCount: 5,
          lastToolsRefresh: new Date(),
          connectionStatus: 'connected',
          totalRequests: 100,
          lastUsed: new Date(),
        })
        .returning()

      expect(mcpServer[0].name).toBe('Compatibility MCP Server')
      expect(mcpServer[0].connectionStatus).toBe('connected')

      // Test tools query for workspace
      const workspaceTools = await db
        .select({
          toolType: sql<string>`'custom' as tool_type`,
          toolId: customTools.id,
          toolName: customTools.title,
          isEnabled: sql<boolean>`TRUE as is_enabled`,
          lastUsed: customTools.updatedAt,
          source: sql<string>`'custom' as source`,
        })
        .from(customTools)
        .where(eq(customTools.userId, ctx.userId))
        .union(
          db
            .select({
              toolType: sql<string>`'mcp' as tool_type`,
              toolId: mcpServers.id,
              toolName: mcpServers.name,
              isEnabled: mcpServers.enabled,
              lastUsed: mcpServers.lastUsed,
              source: sql<string>`'mcp' as source`,
            })
            .from(mcpServers)
            .where(eq(mcpServers.workspaceId, ctx.workspaceId))
        )

      expect(workspaceTools.length).toBeGreaterThanOrEqual(2)
      expect(workspaceTools.some(t => t.toolType === 'custom')).toBe(true)
      expect(workspaceTools.some(t => t.toolType === 'mcp')).toBe(true)
    })

    it('should handle copilot and chat functionality', async () => {
      // Test copilot chat creation
      const copilotChat = await db
        .insert(copilotChats)
        .values({
          userId: ctx.userId,
          workflowId: ctx.workflowId,
          title: 'Compatibility Test Chat',
          messages: [
            {
              role: 'user',
              content: 'How do I test compatibility?',
              timestamp: Date.now(),
            },
            {
              role: 'assistant',
              content: 'To test compatibility, you should verify that existing functionality continues to work after changes.',
              timestamp: Date.now() + 1000,
            },
          ],
          model: 'claude-3-7-sonnet-latest',
          conversationId: `conv-${Date.now()}`,
        })
        .returning()

      expect(copilotChat[0].title).toBe('Compatibility Test Chat')
      expect(copilotChat[0].messages).toHaveLength(2)

      // Test workflow checkpoint creation
      const checkpoint = await db
        .insert(workflowCheckpoints)
        .values({
          userId: ctx.userId,
          workflowId: ctx.workflowId,
          chatId: copilotChat[0].id,
          messageId: 'msg-123',
          workflowState: {
            blocks: {
              'block-1': {
                id: 'block-1',
                type: 'starter',
                position: { x: 100, y: 100 },
                data: { trigger: 'manual' },
              },
            },
            edges: [],
            version: '1.0',
            lastModified: Date.now(),
          },
        })
        .returning()

      expect(checkpoint[0].workflowState).toHaveProperty('blocks')

      // Test chat interface functionality
      const chatResult = await db
        .select({
          chatId: chat.id,
          chatTitle: chat.title,
          workflowName: workflow.name,
          userName: user.name,
          isActive: chat.isActive,
          authType: chat.authType,
          customizations: chat.customizations,
        })
        .from(chat)
        .innerJoin(workflow, eq(chat.workflowId, workflow.id))
        .innerJoin(user, eq(chat.userId, user.id))
        .where(eq(chat.id, ctx.chatId))

      expect(chatResult[0].chatTitle).toBe('Sim Compatibility Chat')
      expect(chatResult[0].isActive).toBe(true)
      expect(chatResult[0].authType).toBe('public')

      // Test copilot analytics
      const copilotAnalytics = await db
        .select({
          workflowName: workflow.name,
          totalChats: count(copilotChats.id),
          totalCheckpoints: sql<number>`COUNT(DISTINCT ${workflowCheckpoints.id})`,
          avgMessagesPerChat: sql<number>`ROUND(AVG(JSONB_ARRAY_LENGTH(${copilotChats.messages})), 2)`,
          modelsUsed: sql<string>`STRING_AGG(DISTINCT ${copilotChats.model}, ', ')`,
          lastActivity: sql<Date>`MAX(${copilotChats.updatedAt})`,
        })
        .from(workflow)
        .leftJoin(copilotChats, eq(copilotChats.workflowId, workflow.id))
        .leftJoin(workflowCheckpoints, eq(workflowCheckpoints.workflowId, workflow.id))
        .where(eq(workflow.id, ctx.workflowId))
        .groupBy(workflow.id, workflow.name)

      expect(copilotAnalytics[0].totalChats).toBe(1)
      expect(copilotAnalytics[0].totalCheckpoints).toBe(1)
      expect(copilotAnalytics[0].modelsUsed).toBe('claude-3-7-sonnet-latest')
    })
  })

  describe('Memory and Template Management', () => {
    it('should handle memory storage functionality', async () => {
      // Test memory creation for workflows
      const memories = await db
        .insert(memory)
        .values([
          {
            id: `mem-${Date.now()}-1`,
            workflowId: ctx.workflowId,
            key: 'user_preferences',
            type: 'agent',
            data: {
              theme: 'dark',
              language: 'en',
              notifications: true,
              lastLogin: new Date().toISOString(),
            },
          },
          {
            id: `mem-${Date.now()}-2`,
            workflowId: ctx.workflowId,
            key: 'session_data',
            type: 'raw',
            data: {
              sessionId: 'sess-123',
              startTime: Date.now(),
              actions: ['login', 'navigate', 'search'],
              metrics: {
                duration: 3600,
                interactions: 15,
              },
            },
          },
        ])
        .returning()

      expect(memories).toHaveLength(2)
      expect(memories[0].key).toBe('user_preferences')
      expect(memories[1].key).toBe('session_data')

      // Test memory retrieval and filtering
      const agentMemories = await db
        .select({
          memoryKey: memory.key,
          memoryType: memory.type,
          memoryData: memory.data,
          createdAt: memory.createdAt,
        })
        .from(memory)
        .where(
          and(
            eq(memory.workflowId, ctx.workflowId),
            eq(memory.type, 'agent')
          )
        )

      expect(agentMemories).toHaveLength(1)
      expect(agentMemories[0].memoryKey).toBe('user_preferences')

      // Test memory update
      const updatedMemory = await db
        .update(memory)
        .set({
          data: {
            theme: 'light', // Changed preference
            language: 'en',
            notifications: false, // Changed preference
            lastLogin: new Date().toISOString(),
            updated: true,
          },
          updatedAt: new Date(),
        })
        .where(eq(memory.key, 'user_preferences'))
        .returning()

      expect(updatedMemory[0].data).toHaveProperty('updated', true)
    })

    it('should handle template system functionality', async () => {
      // Test template creation
      const template = await db
        .insert(templates)
        .values({
          id: `template-${Date.now()}`,
          workflowId: ctx.workflowId,
          userId: ctx.userId,
          name: 'Compatibility Test Template',
          description: 'A template for testing compatibility features',
          author: 'Sim Compatibility User',
          views: 0,
          stars: 0,
          color: '#4CAF50',
          icon: 'TestTube',
          category: 'Testing',
          state: {
            blocks: {
              'start-block': {
                id: 'start-block',
                type: 'starter',
                name: 'Start',
                position: { x: 100, y: 100 },
                config: { trigger: 'manual' },
              },
              'test-block': {
                id: 'test-block',
                type: 'function',
                name: 'Run Tests',
                position: { x: 300, y: 100 },
                config: {
                  code: 'function runTests() { return { success: true }; }',
                },
              },
            },
            edges: [
              {
                id: 'edge-1',
                source: 'start-block',
                target: 'test-block',
              },
            ],
            metadata: {
              version: '1.0',
              category: 'testing',
              tags: ['compatibility', 'automation'],
            },
          },
        })
        .returning()

      expect(template[0].name).toBe('Compatibility Test Template')
      expect(template[0].category).toBe('Testing')

      // Test template starring
      const templateStar = await db
        .insert(templateStars)
        .values({
          id: `star-${Date.now()}`,
          userId: ctx.userId,
          templateId: template[0].id,
          starredAt: new Date(),
        })
        .returning()

      expect(templateStar[0].templateId).toBe(template[0].id)

      // Update template star count
      await db
        .update(templates)
        .set({ stars: 1, views: 10 })
        .where(eq(templates.id, template[0].id))

      // Test template analytics query
      const templateAnalytics = await db
        .select({
          templateName: templates.name,
          templateAuthor: templates.author,
          templateCategory: templates.category,
          totalViews: templates.views,
          totalStars: templates.stars,
          starredByUser: sql<boolean>`CASE WHEN ${templateStars.id} IS NOT NULL THEN TRUE ELSE FALSE END`,
          createdAt: templates.createdAt,
          workflowExists: sql<boolean>`CASE WHEN ${workflow.id} IS NOT NULL THEN TRUE ELSE FALSE END`,
        })
        .from(templates)
        .leftJoin(templateStars, eq(templateStars.templateId, templates.id))
        .leftJoin(workflow, eq(templates.workflowId, workflow.id))
        .where(eq(templates.id, template[0].id))

      expect(templateAnalytics[0].templateName).toBe('Compatibility Test Template')
      expect(templateAnalytics[0].totalStars).toBe(1)
      expect(templateAnalytics[0].starredByUser).toBe(true)
      expect(templateAnalytics[0].workflowExists).toBe(true)

      // Test popular templates query
      const popularTemplates = await db
        .select({
          templateId: templates.id,
          templateName: templates.name,
          templateCategory: templates.category,
          stars: templates.stars,
          views: templates.views,
          authorName: user.name,
          starCount: count(templateStars.id),
        })
        .from(templates)
        .innerJoin(user, eq(templates.userId, user.id))
        .leftJoin(templateStars, eq(templateStars.templateId, templates.id))
        .groupBy(
          templates.id,
          templates.name,
          templates.category,
          templates.stars,
          templates.views,
          user.name
        )
        .orderBy(desc(templates.stars), desc(templates.views))
        .limit(10)

      expect(popularTemplates).toHaveLength(1)
      expect(popularTemplates[0].starCount).toBe(1)
    })
  })

  describe('Rate Limiting and Billing Integration', () => {
    it('should handle rate limiting functionality', async () => {
      // Test rate limit creation and tracking
      const rateLimit = await db
        .insert(userRateLimits)
        .values({
          referenceId: ctx.userId,
          syncApiRequests: 45,
          asyncApiRequests: 23,
          apiEndpointRequests: 156,
          windowStart: new Date(),
          lastRequestAt: new Date(),
          isRateLimited: false,
        })
        .returning()

      expect(rateLimit[0].referenceId).toBe(ctx.userId)
      expect(rateLimit[0].isRateLimited).toBe(false)

      // Test rate limit update (simulating API calls)
      const updatedRateLimit = await db
        .update(userRateLimits)
        .set({
          syncApiRequests: 50, // Increment
          asyncApiRequests: 25, // Increment
          apiEndpointRequests: 160, // Increment
          lastRequestAt: new Date(),
          isRateLimited: false, // Still within limits
        })
        .where(eq(userRateLimits.referenceId, ctx.userId))
        .returning()

      expect(updatedRateLimit[0].syncApiRequests).toBe(50)
      expect(updatedRateLimit[0].apiEndpointRequests).toBe(160)

      // Test rate limit exceeded scenario
      const exceededRateLimit = await db
        .update(userRateLimits)
        .set({
          syncApiRequests: 1000, // Exceeded
          isRateLimited: true,
          rateLimitResetAt: new Date(Date.now() + 3600000), // 1 hour from now
        })
        .where(eq(userRateLimits.referenceId, ctx.userId))
        .returning()

      expect(exceededRateLimit[0].isRateLimited).toBe(true)
      expect(exceededRateLimit[0].rateLimitResetAt).toBeDefined()

      // Test billing integration query
      const billingData = await db
        .select({
          userId: user.id,
          userName: user.name,
          totalManualExecutions: userStats.totalManualExecutions,
          totalApiCalls: userStats.totalApiCalls,
          totalCost: userStats.totalCost,
          currentUsageLimit: userStats.currentUsageLimit,
          billingBlocked: userStats.billingBlocked,
          syncApiRequests: userRateLimits.syncApiRequests,
          isRateLimited: userRateLimits.isRateLimited,
          stripeCustomerId: user.stripeCustomerId,
        })
        .from(user)
        .leftJoin(userStats, eq(userStats.userId, user.id))
        .leftJoin(userRateLimits, eq(userRateLimits.referenceId, user.id))
        .where(eq(user.id, ctx.userId))

      expect(billingData[0].isRateLimited).toBe(true)
      expect(billingData[0].syncApiRequests).toBe(1000)
    })

    it('should handle subscription and marketplace functionality', async () => {
      // Test subscription creation
      const sub = await db
        .insert(subscription)
        .values({
          id: `sub-${Date.now()}`,
          plan: 'professional',
          referenceId: ctx.userId,
          stripeCustomerId: 'cus_test_compatibility',
          stripeSubscriptionId: 'sub_test_compatibility',
          status: 'active',
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000), // 30 days
          cancelAtPeriodEnd: false,
          seats: 5,
          metadata: {
            features: ['unlimited_workflows', 'advanced_analytics'],
            upgradedFrom: 'free',
            upgradeDate: new Date().toISOString(),
          },
        })
        .returning()

      expect(sub[0].plan).toBe('professional')
      expect(sub[0].status).toBe('active')
      expect(sub[0].seats).toBe(5)

      // Test marketplace entry
      const marketplaceEntry = await db
        .insert(marketplace)
        .values({
          id: `market-${Date.now()}`,
          workflowId: ctx.workflowId,
          state: {
            blocks: { 'start': { type: 'starter' } },
            edges: [],
            version: '1.0',
          },
          name: 'Compatibility Test Workflow',
          description: 'A workflow for testing compatibility features',
          authorId: ctx.userId,
          authorName: 'Sim Compatibility User',
          views: 0,
          category: 'Testing',
        })
        .returning()

      expect(marketplaceEntry[0].name).toBe('Compatibility Test Workflow')
      expect(marketplaceEntry[0].category).toBe('Testing')

      // Test subscription and marketplace analytics
      const userSubscriptionData = await db
        .select({
          userName: user.name,
          userEmail: user.email,
          subscriptionPlan: subscription.plan,
          subscriptionStatus: subscription.status,
          subscriptionSeats: subscription.seats,
          publishedWorkflows: count(marketplace.id),
          totalMarketplaceViews: sql<number>`COALESCE(SUM(${marketplace.views}), 0)`,
          subscriptionExpires: subscription.periodEnd,
        })
        .from(user)
        .leftJoin(subscription, eq(subscription.referenceId, user.id))
        .leftJoin(marketplace, eq(marketplace.authorId, user.id))
        .where(eq(user.id, ctx.userId))
        .groupBy(
          user.id,
          user.name,
          user.email,
          subscription.plan,
          subscription.status,
          subscription.seats,
          subscription.periodEnd
        )

      expect(userSubscriptionData[0].subscriptionPlan).toBe('professional')
      expect(userSubscriptionData[0].publishedWorkflows).toBe(1)
      expect(userSubscriptionData[0].subscriptionSeats).toBe(5)
    })
  })

  describe('Cross-System Compatibility Validation', () => {
    it('should verify Parlant tables do not interfere with Sim operations', async () => {
      // Create some Parlant data
      const parlantAgentResult = await db
        .insert(parlantAgent)
        .values({
          workspaceId: ctx.workspaceId,
          createdBy: ctx.userId,
          name: 'Test Parlant Agent',
          description: 'Agent to test cross-system compatibility',
        })
        .returning()

      const parlantSessionResult = await db
        .insert(parlantSession)
        .values({
          agentId: parlantAgentResult[0].id,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          customerId: 'compatibility-test-customer',
          title: 'Compatibility Test Session',
        })
        .returning()

      await db.insert(parlantEvent).values([
        {
          sessionId: parlantSessionResult[0].id,
          offset: 1,
          eventType: 'customer_message',
          content: { message: 'Hello from Parlant' },
        },
        {
          sessionId: parlantSessionResult[0].id,
          offset: 2,
          eventType: 'agent_message',
          content: { message: 'Hello from compatibility test' },
        },
      ])

      // Test that Sim queries still work correctly with Parlant data present
      const simWorkspaceQuery = await db
        .select({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          ownerName: user.name,
          workflowCount: count(workflow.id),
          apiKeyCount: sql<number>`COUNT(DISTINCT ${apiKey.id})`,
          kbCount: sql<number>`COUNT(DISTINCT ${knowledgeBase.id})`,
          chatCount: sql<number>`COUNT(DISTINCT ${chat.id})`,
        })
        .from(workspace)
        .innerJoin(user, eq(workspace.ownerId, user.id))
        .leftJoin(workflow, eq(workflow.workspaceId, workspace.id))
        .leftJoin(apiKey, eq(apiKey.workspaceId, workspace.id))
        .leftJoin(knowledgeBase, eq(knowledgeBase.workspaceId, workspace.id))
        .leftJoin(chat, eq(chat.workflowId, workflow.id))
        .where(eq(workspace.id, ctx.workspaceId))
        .groupBy(workspace.id, workspace.name, user.name)

      // Sim queries should return correct data despite Parlant tables existing
      expect(simWorkspaceQuery[0].workspaceName).toBe('Sim Compatibility Workspace')
      expect(simWorkspaceQuery[0].workflowCount).toBe(1)
      expect(simWorkspaceQuery[0].apiKeyCount).toBe(1)
      expect(simWorkspaceQuery[0].kbCount).toBe(1)

      // Test that Sim and Parlant can coexist in the same workspace
      const coexistenceQuery = await db
        .select({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          // Sim entities
          simWorkflows: count(workflow.id),
          simApiKeys: sql<number>`COUNT(DISTINCT ${apiKey.id})`,
          simKnowledgeBases: sql<number>`COUNT(DISTINCT ${knowledgeBase.id})`,
          // Parlant entities
          parlantAgents: sql<number>`COUNT(DISTINCT ${parlantAgent.id})`,
          parlantSessions: sql<number>`COUNT(DISTINCT ${parlantSession.id})`,
          parlantEvents: sql<number>`COUNT(DISTINCT ${parlantEvent.id})`,
        })
        .from(workspace)
        .leftJoin(workflow, eq(workflow.workspaceId, workspace.id))
        .leftJoin(apiKey, eq(apiKey.workspaceId, workspace.id))
        .leftJoin(knowledgeBase, eq(knowledgeBase.workspaceId, workspace.id))
        .leftJoin(parlantAgent, eq(parlantAgent.workspaceId, workspace.id))
        .leftJoin(parlantSession, eq(parlantSession.workspaceId, workspace.id))
        .leftJoin(parlantEvent, eq(parlantEvent.sessionId, parlantSession.id))
        .where(eq(workspace.id, ctx.workspaceId))
        .groupBy(workspace.id, workspace.name)

      expect(coexistenceQuery[0].simWorkflows).toBe(1)
      expect(coexistenceQuery[0].parlantAgents).toBe(1)
      expect(coexistenceQuery[0].parlantSessions).toBe(1)
      expect(coexistenceQuery[0].parlantEvents).toBe(2)

      // Verify that Sim operations continue to work independently
      const newWorkflow = await db
        .insert(workflow)
        .values({
          id: `workflow-after-parlant-${Date.now()}`,
          userId: ctx.userId,
          workspaceId: ctx.workspaceId,
          name: 'Workflow Created After Parlant',
          description: 'This workflow was created after Parlant data',
          color: '#FF5722',
          lastSynced: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      expect(newWorkflow[0].name).toBe('Workflow Created After Parlant')

      // Final verification: Both systems can operate simultaneously
      const finalVerification = await Promise.all([
        // Sim query
        db.select({ count: count() }).from(workflow).where(eq(workflow.workspaceId, ctx.workspaceId)),
        // Parlant query
        db.select({ count: count() }).from(parlantAgent).where(eq(parlantAgent.workspaceId, ctx.workspaceId))
      ])

      expect(finalVerification[0][0].count).toBe(2) // Original + new workflow
      expect(finalVerification[1][0].count).toBe(1) // Parlant agent
    })
  })
})