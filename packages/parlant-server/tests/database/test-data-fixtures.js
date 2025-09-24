/**
 * Comprehensive Test Data Fixtures and Cleanup Utilities
 *
 * This module provides robust test data creation, management, and cleanup
 * utilities for database testing. It supports both Sim and Parlant schemas,
 * ensuring proper data relationships, workspace isolation, and cleanup.
 *
 * Key Features:
 * - Hierarchical test data creation (users → workspaces → agents → sessions)
 * - Realistic data generation with proper relationships
 * - Workspace-scoped data isolation
 * - Comprehensive cleanup with dependency management
 * - Performance-optimized batch operations
 * - Data consistency validation
 * - Configurable data volumes for different test scenarios
 * - Transaction-safe operations with rollback support
 */

const { Pool } = require('pg')
const crypto = require('crypto')
const fs = require('fs').promises
const path = require('path')

/**
 * Test Data Fixtures Manager
 *
 * Provides comprehensive test data creation, management, and cleanup
 * for database testing across Sim and Parlant schemas.
 */
class TestDataFixtures {
  constructor(options = {}) {
    this.config = {
      database_url:
        process.env.TEST_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/simstudio_test',
      data_retention_hours: options.data_retention_hours || 1,
      batch_size: options.batch_size || 100,
      max_connections: options.max_connections || 15,
      cleanup_timeout_ms: options.cleanup_timeout_ms || 30000,
      enable_transaction_safety: options.enable_transaction_safety !== false,
      ...options,
    }

    this.dbPool = null
    this.createdData = new Map() // Track created data for cleanup
    this.dataRelationships = new Map() // Track data dependencies
  }

  /**
   * Initialize test data fixtures manager
   */
  async initialize() {
    console.log('🏗️  Initializing Test Data Fixtures Manager...')

    try {
      this.dbPool = new Pool({
        connectionString: this.config.database_url,
        max: this.config.max_connections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      })

      // Test database connectivity
      const client = await this.dbPool.connect()
      const result = await client.query('SELECT current_database(), version()')
      client.release()

      console.log('✅ Test data fixtures manager initialized')
      console.log(`   Database: ${result.rows[0].current_database}`)

      // Create fixture tracking tables
      await this.createFixtureTrackingTables()

      return true
    } catch (error) {
      console.error('❌ Test data fixtures initialization failed:', error)
      throw error
    }
  }

  /**
   * Create fixture tracking tables
   */
  async createFixtureTrackingTables() {
    const client = await this.dbPool.connect()
    try {
      // Table to track created test data
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_data_registry (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fixture_name TEXT NOT NULL,
          data_type TEXT NOT NULL,
          record_id TEXT NOT NULL,
          parent_record_id TEXT,
          workspace_id TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '${this.config.data_retention_hours} hours',
          cleanup_order INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}'
        )
      `)

      // Table to track data relationships for proper cleanup order
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_data_relationships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          parent_table TEXT NOT NULL,
          parent_id TEXT NOT NULL,
          child_table TEXT NOT NULL,
          child_id TEXT NOT NULL,
          relationship_type TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      // Indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS test_data_registry_fixture_name_idx
        ON test_data_registry(fixture_name)
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS test_data_registry_expires_at_idx
        ON test_data_registry(expires_at)
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS test_data_relationships_parent_idx
        ON test_data_relationships(parent_table, parent_id)
      `)

      console.log('✅ Fixture tracking tables created')
    } finally {
      client.release()
    }
  }

  /**
   * Create complete test workspace with all related data
   */
  async createCompleteTestWorkspace(options = {}) {
    const testId = Date.now()
    const fixtureName = options.fixtureName || `complete_workspace_${testId}`

    console.log(`🏢 Creating complete test workspace: ${fixtureName}`)

    const client = await this.dbPool.connect()
    let transaction = null

    try {
      if (this.config.enable_transaction_safety) {
        await client.query('BEGIN')
        transaction = client
      }

      const workspace = {
        userId: options.userId || `test_user_${testId}`,
        workspaceId: options.workspaceId || `test_workspace_${testId}`,
        userEmail: options.userEmail || `testuser_${testId}@fixtures.test`,
        workspaceName: options.workspaceName || `Test Workspace ${testId}`,
      }

      // Create user
      await client.query(
        `
        INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, true, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `,
        [workspace.userId, `Test User ${testId}`, workspace.userEmail]
      )

      await this.registerTestData(fixtureName, 'user', workspace.userId, null, null, 1)

      // Create workspace
      await client.query(
        `
        INSERT INTO workspace (id, name, "ownerId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
      `,
        [workspace.workspaceId, workspace.workspaceName, workspace.userId]
      )

      await this.registerTestData(
        fixtureName,
        'workspace',
        workspace.workspaceId,
        workspace.userId,
        workspace.workspaceId,
        2
      )

      // Create workspace environment
      await client.query(
        `
        INSERT INTO workspace_environment (id, "workspaceId", variables, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, '{"test": "true", "environment": "fixtures"}', NOW(), NOW())
        ON CONFLICT ("workspaceId") DO UPDATE SET variables = EXCLUDED.variables
      `,
        [workspace.workspaceId]
      )

      // Create permissions
      const permissionId = crypto.randomUUID()
      await client.query(
        `
        INSERT INTO permissions (id, "userId", "workspaceId", permission, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'admin', NOW(), NOW())
      `,
        [permissionId, workspace.userId, workspace.workspaceId]
      )

      await this.registerTestData(
        fixtureName,
        'permissions',
        permissionId,
        workspace.userId,
        workspace.workspaceId,
        3
      )

      // Create API keys if specified
      if (options.includeApiKeys !== false) {
        const apiKeyData = await this.createApiKeysForWorkspace(client, workspace, fixtureName, 4)
        workspace.apiKeys = apiKeyData
      }

      // Create workflows if specified
      if (options.includeWorkflows !== false) {
        const workflowData = await this.createWorkflowsForWorkspace(
          client,
          workspace,
          fixtureName,
          5
        )
        workspace.workflows = workflowData
      }

      // Create knowledge bases if specified
      if (options.includeKnowledgeBases !== false) {
        const kbData = await this.createKnowledgeBasesForWorkspace(
          client,
          workspace,
          fixtureName,
          6
        )
        workspace.knowledgeBases = kbData
      }

      // Create Parlant data if tables exist
      if (options.includeParlantData !== false) {
        const parlantData = await this.createParlantDataForWorkspace(
          client,
          workspace,
          fixtureName,
          10
        )
        workspace.parlantData = parlantData
      }

      if (transaction) {
        await client.query('COMMIT')
      }

      // Store workspace data for later cleanup
      this.createdData.set(fixtureName, workspace)

      console.log(`✅ Complete test workspace created: ${fixtureName}`)
      console.log(`   User: ${workspace.userId}`)
      console.log(`   Workspace: ${workspace.workspaceId}`)
      console.log(`   Email: ${workspace.userEmail}`)

      return workspace
    } catch (error) {
      if (transaction) {
        await client.query('ROLLBACK')
      }
      console.error(`❌ Failed to create complete test workspace: ${error.message}`)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Create API keys for workspace
   */
  async createApiKeysForWorkspace(client, workspace, fixtureName, cleanupOrder) {
    const apiKeys = []

    try {
      const keyCount = 2 // Create 2 API keys per workspace

      for (let i = 1; i <= keyCount; i++) {
        const apiKeyId = crypto.randomUUID()
        const keyValue = `test_key_${Date.now()}_${i}_${crypto.randomBytes(16).toString('hex')}`

        await client.query(
          `
          INSERT INTO "apiKey" (id, "userId", name, key, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `,
          [apiKeyId, workspace.userId, `Test API Key ${i}`, keyValue]
        )

        await this.registerTestData(
          fixtureName,
          'apiKey',
          apiKeyId,
          workspace.userId,
          workspace.workspaceId,
          cleanupOrder
        )

        apiKeys.push({
          id: apiKeyId,
          name: `Test API Key ${i}`,
          key: keyValue,
        })
      }

      return apiKeys
    } catch (error) {
      console.warn(`⚠️  Failed to create API keys: ${error.message}`)
      return []
    }
  }

  /**
   * Create workflows for workspace
   */
  async createWorkflowsForWorkspace(client, workspace, fixtureName, cleanupOrder) {
    const workflows = []

    try {
      const workflowCount = 3 // Create 3 workflows per workspace

      for (let i = 1; i <= workflowCount; i++) {
        const workflowId = `test_workflow_${Date.now()}_${i}`

        await client.query(
          `
          INSERT INTO workflow (id, "userId", "workspaceId", name, description, "lastSynced", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
        `,
          [
            workflowId,
            workspace.userId,
            workspace.workspaceId,
            `Test Workflow ${i}`,
            `Test workflow ${i} for fixtures`,
          ]
        )

        await this.registerTestData(
          fixtureName,
          'workflow',
          workflowId,
          workspace.userId,
          workspace.workspaceId,
          cleanupOrder
        )

        // Create workflow blocks
        const blockData = await this.createWorkflowBlocks(
          client,
          workflowId,
          fixtureName,
          cleanupOrder + 1
        )

        // Create workflow folder
        const folderId = crypto.randomUUID()
        await client.query(
          `
          INSERT INTO workflow_folder (id, name, "userId", "workspaceId", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `,
          [folderId, `Test Folder ${i}`, workspace.userId, workspace.workspaceId]
        )

        await this.registerTestData(
          fixtureName,
          'workflow_folder',
          folderId,
          workspace.userId,
          workspace.workspaceId,
          cleanupOrder
        )

        workflows.push({
          id: workflowId,
          name: `Test Workflow ${i}`,
          folderId,
          blocks: blockData,
        })
      }

      return workflows
    } catch (error) {
      console.warn(`⚠️  Failed to create workflows: ${error.message}`)
      return []
    }
  }

  /**
   * Create workflow blocks
   */
  async createWorkflowBlocks(client, workflowId, fixtureName, cleanupOrder) {
    const blocks = []

    try {
      const blockTypes = ['starter', 'agent', 'api', 'function']

      for (let i = 0; i < blockTypes.length; i++) {
        const blockId = crypto.randomUUID()
        const blockType = blockTypes[i]

        await client.query(
          `
          INSERT INTO workflow_blocks (
            id, "workflowId", type, name, "positionX", "positionY",
            enabled, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        `,
          [blockId, workflowId, blockType, `Test ${blockType} Block`, i * 100, 0]
        )

        await this.registerTestData(
          fixtureName,
          'workflow_blocks',
          blockId,
          workflowId,
          null,
          cleanupOrder
        )

        blocks.push({
          id: blockId,
          type: blockType,
          name: `Test ${blockType} Block`,
        })
      }

      return blocks
    } catch (error) {
      console.warn(`⚠️  Failed to create workflow blocks: ${error.message}`)
      return []
    }
  }

  /**
   * Create knowledge bases for workspace
   */
  async createKnowledgeBasesForWorkspace(client, workspace, fixtureName, cleanupOrder) {
    const knowledgeBases = []

    try {
      const kbCount = 2 // Create 2 knowledge bases per workspace

      for (let i = 1; i <= kbCount; i++) {
        const kbId = crypto.randomUUID()

        await client.query(
          `
          INSERT INTO "knowledgeBase" (id, "userId", "workspaceId", name, description, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `,
          [
            kbId,
            workspace.userId,
            workspace.workspaceId,
            `Test Knowledge Base ${i}`,
            `Test KB ${i} for fixtures`,
          ]
        )

        await this.registerTestData(
          fixtureName,
          'knowledgeBase',
          kbId,
          workspace.userId,
          workspace.workspaceId,
          cleanupOrder
        )

        // Create documents for knowledge base
        const documentData = await this.createDocumentsForKB(
          client,
          kbId,
          workspace,
          fixtureName,
          cleanupOrder + 1
        )

        knowledgeBases.push({
          id: kbId,
          name: `Test Knowledge Base ${i}`,
          documents: documentData,
        })
      }

      return knowledgeBases
    } catch (error) {
      console.warn(`⚠️  Failed to create knowledge bases: ${error.message}`)
      return []
    }
  }

  /**
   * Create documents for knowledge base
   */
  async createDocumentsForKB(client, kbId, workspace, fixtureName, cleanupOrder) {
    const documents = []

    try {
      const docCount = 3 // Create 3 documents per KB

      for (let i = 1; i <= docCount; i++) {
        const docId = crypto.randomUUID()

        await client.query(
          `
          INSERT INTO document (
            id, "knowledgeBaseId", "userId", "workspaceId", name, content,
            "mimeType", size, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `,
          [
            docId,
            kbId,
            workspace.userId,
            workspace.workspaceId,
            `Test Document ${i}`,
            `This is test document ${i} content for fixtures testing.`,
            'text/plain',
            `This is test document ${i} content for fixtures testing.`.length,
          ]
        )

        await this.registerTestData(
          fixtureName,
          'document',
          docId,
          kbId,
          workspace.workspaceId,
          cleanupOrder
        )

        // Create embeddings for document
        const embeddingData = await this.createEmbeddingsForDocument(
          client,
          docId,
          fixtureName,
          cleanupOrder + 1
        )

        documents.push({
          id: docId,
          name: `Test Document ${i}`,
          embeddings: embeddingData,
        })
      }

      return documents
    } catch (error) {
      console.warn(`⚠️  Failed to create documents: ${error.message}`)
      return []
    }
  }

  /**
   * Create embeddings for document
   */
  async createEmbeddingsForDocument(client, documentId, fixtureName, cleanupOrder) {
    const embeddings = []

    try {
      const embeddingCount = 2 // Create 2 embeddings per document

      for (let i = 1; i <= embeddingCount; i++) {
        const embeddingId = crypto.randomUUID()

        // Create a dummy embedding vector (768 dimensions with random values)
        const embeddingVector = Array.from({ length: 768 }, () => Math.random() * 2 - 1)

        await client.query(
          `
          INSERT INTO embedding (
            id, "documentId", content, embedding, "chunkIndex", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `,
          [
            embeddingId,
            documentId,
            `Document chunk ${i} content for embedding`,
            JSON.stringify(embeddingVector),
            i - 1,
          ]
        )

        await this.registerTestData(
          fixtureName,
          'embedding',
          embeddingId,
          documentId,
          null,
          cleanupOrder
        )

        embeddings.push({
          id: embeddingId,
          chunkIndex: i - 1,
        })
      }

      return embeddings
    } catch (error) {
      console.warn(`⚠️  Failed to create embeddings: ${error.message}`)
      return []
    }
  }

  /**
   * Create Parlant data for workspace
   */
  async createParlantDataForWorkspace(client, workspace, fixtureName, cleanupOrder) {
    const parlantData = {
      agents: [],
      sessions: [],
      events: [],
      tools: [],
      journeys: [],
      guidelines: [],
    }

    try {
      // Check if Parlant tables exist
      const tablesExist = await this.checkParlantTablesExist(client)

      if (tablesExist.parlant_agent) {
        parlantData.agents = await this.createParlantAgents(
          client,
          workspace,
          fixtureName,
          cleanupOrder
        )
      }

      if (tablesExist.parlant_tool) {
        parlantData.tools = await this.createParlantTools(
          client,
          workspace,
          fixtureName,
          cleanupOrder + 1
        )
      }

      if (tablesExist.parlant_session && parlantData.agents.length > 0) {
        parlantData.sessions = await this.createParlantSessions(
          client,
          workspace,
          parlantData.agents,
          fixtureName,
          cleanupOrder + 2
        )
      }

      if (tablesExist.parlant_event && parlantData.sessions.length > 0) {
        parlantData.events = await this.createParlantEvents(
          client,
          parlantData.sessions,
          fixtureName,
          cleanupOrder + 3
        )
      }

      if (tablesExist.parlant_guideline && parlantData.agents.length > 0) {
        parlantData.guidelines = await this.createParlantGuidelines(
          client,
          parlantData.agents,
          fixtureName,
          cleanupOrder + 4
        )
      }

      if (tablesExist.parlant_journey && parlantData.agents.length > 0) {
        parlantData.journeys = await this.createParlantJourneys(
          client,
          parlantData.agents,
          fixtureName,
          cleanupOrder + 5
        )
      }

      return parlantData
    } catch (error) {
      console.warn(`⚠️  Failed to create Parlant data: ${error.message}`)
      return parlantData
    }
  }

  /**
   * Check if Parlant tables exist
   */
  async checkParlantTablesExist(client) {
    const tablesToCheck = [
      'parlant_agent',
      'parlant_session',
      'parlant_event',
      'parlant_tool',
      'parlant_guideline',
      'parlant_journey',
    ]

    const existence = {}

    for (const tableName of tablesToCheck) {
      const result = await client.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        )
      `,
        [tableName]
      )
      existence[tableName] = result.rows[0].exists
    }

    return existence
  }

  /**
   * Create Parlant agents
   */
  async createParlantAgents(client, workspace, fixtureName, cleanupOrder) {
    const agents = []

    try {
      const agentCount = 3 // Create 3 agents per workspace

      for (let i = 1; i <= agentCount; i++) {
        const agentId = crypto.randomUUID()

        await client.query(
          `
          INSERT INTO parlant_agent (
            id, workspace_id, created_by, name, description, status,
            composition_mode, model_provider, model_name, temperature, max_tokens,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        `,
          [
            agentId,
            workspace.workspaceId,
            workspace.userId,
            `Test Agent ${i}`,
            `Test agent ${i} for fixtures`,
            'active',
            'fluid',
            'openai',
            'gpt-4',
            70,
            2000,
          ]
        )

        await this.registerTestData(
          fixtureName,
          'parlant_agent',
          agentId,
          workspace.userId,
          workspace.workspaceId,
          cleanupOrder
        )

        agents.push({
          id: agentId,
          name: `Test Agent ${i}`,
        })
      }

      return agents
    } catch (error) {
      console.warn(`⚠️  Failed to create Parlant agents: ${error.message}`)
      return []
    }
  }

  /**
   * Create Parlant tools
   */
  async createParlantTools(client, workspace, fixtureName, cleanupOrder) {
    const tools = []

    try {
      const toolCount = 4 // Create 4 tools per workspace
      const toolTypes = ['custom', 'api', 'function', 'integration']

      for (let i = 1; i <= toolCount; i++) {
        const toolId = crypto.randomUUID()
        const toolType = toolTypes[i - 1] || 'custom'

        await client.query(
          `
          INSERT INTO parlant_tool (
            id, workspace_id, name, display_name, description, tool_type,
            parameters, enabled, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
        `,
          [
            toolId,
            workspace.workspaceId,
            `test_tool_${i}`,
            `Test Tool ${i}`,
            `Test tool ${i} for fixtures`,
            toolType,
            JSON.stringify({ param1: 'value1', param2: 'value2' }),
          ]
        )

        await this.registerTestData(
          fixtureName,
          'parlant_tool',
          toolId,
          workspace.workspaceId,
          workspace.workspaceId,
          cleanupOrder
        )

        tools.push({
          id: toolId,
          name: `test_tool_${i}`,
          type: toolType,
        })
      }

      return tools
    } catch (error) {
      console.warn(`⚠️  Failed to create Parlant tools: ${error.message}`)
      return []
    }
  }

  /**
   * Create Parlant sessions
   */
  async createParlantSessions(client, workspace, agents, fixtureName, cleanupOrder) {
    const sessions = []

    try {
      // Create 2 sessions per agent
      for (const agent of agents) {
        for (let i = 1; i <= 2; i++) {
          const sessionId = crypto.randomUUID()

          await client.query(
            `
            INSERT INTO parlant_session (
              id, agent_id, workspace_id, user_id, status, mode,
              title, metadata, variables, started_at, last_activity_at,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW(), NOW())
          `,
            [
              sessionId,
              agent.id,
              workspace.workspaceId,
              workspace.userId,
              'active',
              'auto',
              `Test Session ${i} for ${agent.name}`,
              JSON.stringify({ test: true, session: i }),
              JSON.stringify({ var1: 'value1', var2: 'value2' }),
            ]
          )

          await this.registerTestData(
            fixtureName,
            'parlant_session',
            sessionId,
            agent.id,
            workspace.workspaceId,
            cleanupOrder
          )

          sessions.push({
            id: sessionId,
            agentId: agent.id,
            title: `Test Session ${i} for ${agent.name}`,
          })
        }
      }

      return sessions
    } catch (error) {
      console.warn(`⚠️  Failed to create Parlant sessions: ${error.message}`)
      return []
    }
  }

  /**
   * Create Parlant events
   */
  async createParlantEvents(client, sessions, fixtureName, cleanupOrder) {
    const events = []

    try {
      // Create 5 events per session
      for (const session of sessions) {
        const eventTypes = [
          'customer_message',
          'agent_message',
          'tool_call',
          'system_message',
          'error',
        ]

        for (let i = 0; i < eventTypes.length; i++) {
          const eventId = crypto.randomUUID()
          const eventType = eventTypes[i]

          await client.query(
            `
            INSERT INTO parlant_event (
              id, session_id, offset, event_type, content, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `,
            [
              eventId,
              session.id,
              i,
              eventType,
              JSON.stringify({ type: eventType, content: `Test ${eventType} content`, index: i }),
              JSON.stringify({ test: true, eventIndex: i }),
            ]
          )

          await this.registerTestData(
            fixtureName,
            'parlant_event',
            eventId,
            session.id,
            null,
            cleanupOrder
          )

          events.push({
            id: eventId,
            sessionId: session.id,
            type: eventType,
            offset: i,
          })
        }
      }

      return events
    } catch (error) {
      console.warn(`⚠️  Failed to create Parlant events: ${error.message}`)
      return []
    }
  }

  /**
   * Create Parlant guidelines
   */
  async createParlantGuidelines(client, agents, fixtureName, cleanupOrder) {
    const guidelines = []

    try {
      // Create 3 guidelines per agent
      for (const agent of agents) {
        for (let i = 1; i <= 3; i++) {
          const guidelineId = crypto.randomUUID()

          await client.query(
            `
            INSERT INTO parlant_guideline (
              id, agent_id, condition, action, priority, enabled, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
          `,
            [guidelineId, agent.id, `Test condition ${i}`, `Test action ${i}`, i]
          )

          await this.registerTestData(
            fixtureName,
            'parlant_guideline',
            guidelineId,
            agent.id,
            null,
            cleanupOrder
          )

          guidelines.push({
            id: guidelineId,
            agentId: agent.id,
            condition: `Test condition ${i}`,
            priority: i,
          })
        }
      }

      return guidelines
    } catch (error) {
      console.warn(`⚠️  Failed to create Parlant guidelines: ${error.message}`)
      return []
    }
  }

  /**
   * Create Parlant journeys
   */
  async createParlantJourneys(client, agents, fixtureName, cleanupOrder) {
    const journeys = []

    try {
      // Create 2 journeys per agent
      for (const agent of agents) {
        for (let i = 1; i <= 2; i++) {
          const journeyId = crypto.randomUUID()

          await client.query(
            `
            INSERT INTO parlant_journey (
              id, agent_id, title, description, conditions, enabled, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
          `,
            [
              journeyId,
              agent.id,
              `Test Journey ${i}`,
              `Test journey ${i} for agent ${agent.name}`,
              JSON.stringify([`condition_${i}`, `condition_${i}_alt`]),
            ]
          )

          await this.registerTestData(
            fixtureName,
            'parlant_journey',
            journeyId,
            agent.id,
            null,
            cleanupOrder
          )

          journeys.push({
            id: journeyId,
            agentId: agent.id,
            title: `Test Journey ${i}`,
          })
        }
      }

      return journeys
    } catch (error) {
      console.warn(`⚠️  Failed to create Parlant journeys: ${error.message}`)
      return []
    }
  }

  /**
   * Register test data in tracking system
   */
  async registerTestData(
    fixtureName,
    dataType,
    recordId,
    parentRecordId,
    workspaceId,
    cleanupOrder
  ) {
    const client = await this.dbPool.connect()
    try {
      await client.query(
        `
        INSERT INTO test_data_registry (
          fixture_name, data_type, record_id, parent_record_id, workspace_id, cleanup_order
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [fixtureName, dataType, recordId, parentRecordId, workspaceId, cleanupOrder]
      )

      // Track relationship if parent exists
      if (parentRecordId) {
        await client.query(
          `
          INSERT INTO test_data_relationships (parent_table, parent_id, child_table, child_id, relationship_type)
          VALUES ($1, $2, $3, $4, 'dependency')
        `,
          ['unknown', parentRecordId, dataType, recordId]
        )
      }
    } finally {
      client.release()
    }
  }

  /**
   * Create bulk test data for performance testing
   */
  async createBulkTestData(options = {}) {
    const {
      userCount = 10,
      workspacesPerUser = 2,
      agentsPerWorkspace = 5,
      sessionsPerAgent = 3,
      eventsPerSession = 10,
      fixtureName = `bulk_test_${Date.now()}`,
    } = options

    console.log(`📊 Creating bulk test data: ${fixtureName}`)
    console.log(
      `   Users: ${userCount}, Workspaces: ${userCount * workspacesPerUser}, Agents: ${userCount * workspacesPerUser * agentsPerWorkspace}`
    )

    const bulkData = {
      users: [],
      workspaces: [],
      totalRecords: 0,
    }

    const client = await this.dbPool.connect()

    try {
      await client.query('BEGIN')

      // Create users in batches
      for (let batch = 0; batch < Math.ceil(userCount / this.config.batch_size); batch++) {
        const batchStart = batch * this.config.batch_size
        const batchEnd = Math.min(batchStart + this.config.batch_size, userCount)

        const userBatch = []
        for (let i = batchStart; i < batchEnd; i++) {
          const userId = `bulk_user_${Date.now()}_${i}`
          const userEmail = `bulk_user_${Date.now()}_${i}@fixtures.test`

          await client.query(
            `
            INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, true, NOW(), NOW())
          `,
            [userId, `Bulk User ${i}`, userEmail]
          )

          await this.registerTestData(fixtureName, 'user', userId, null, null, 1)

          // Create workspaces for this user
          const userWorkspaces = []
          for (let j = 0; j < workspacesPerUser; j++) {
            const workspace = await this.createCompleteTestWorkspace({
              fixtureName: `${fixtureName}_user_${i}_ws_${j}`,
              userId,
              userEmail,
              workspaceId: `bulk_workspace_${Date.now()}_${i}_${j}`,
              workspaceName: `Bulk Workspace ${i}-${j}`,
              includeApiKeys: true,
              includeWorkflows: true,
              includeKnowledgeBases: false, // Skip KBs for bulk to reduce data size
              includeParlantData: true,
            })

            userWorkspaces.push(workspace)
          }

          userBatch.push({
            id: userId,
            email: userEmail,
            workspaces: userWorkspaces,
          })
        }

        bulkData.users.push(...userBatch)
        console.log(
          `✅ Created user batch ${batch + 1}/${Math.ceil(userCount / this.config.batch_size)}`
        )
      }

      await client.query('COMMIT')

      bulkData.totalRecords = await this.countTestDataRecords(fixtureName)

      console.log(`✅ Bulk test data created: ${fixtureName}`)
      console.log(`   Total records: ${bulkData.totalRecords}`)

      return bulkData
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(`❌ Failed to create bulk test data: ${error.message}`)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Count test data records for a fixture
   */
  async countTestDataRecords(fixtureName) {
    const client = await this.dbPool.connect()
    try {
      const result = await client.query(
        `
        SELECT COUNT(*) as count FROM test_data_registry WHERE fixture_name = $1
      `,
        [fixtureName]
      )
      return Number.parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  }

  /**
   * Clean up test data by fixture name
   */
  async cleanupTestData(fixtureName) {
    console.log(`🧹 Cleaning up test data: ${fixtureName}`)

    const client = await this.dbPool.connect()

    try {
      // Get all test data records for this fixture, ordered by cleanup order (descending)
      const testDataRecords = await client.query(
        `
        SELECT data_type, record_id, cleanup_order
        FROM test_data_registry
        WHERE fixture_name = $1
        ORDER BY cleanup_order DESC, created_at DESC
      `,
        [fixtureName]
      )

      let cleanedCount = 0

      for (const record of testDataRecords.rows) {
        try {
          await this.deleteRecord(client, record.data_type, record.record_id)
          cleanedCount++
        } catch (error) {
          console.warn(
            `⚠️  Failed to delete ${record.data_type} ${record.record_id}: ${error.message}`
          )
        }
      }

      // Remove from tracking tables
      await client.query('DELETE FROM test_data_registry WHERE fixture_name = $1', [fixtureName])

      // Remove from memory cache
      this.createdData.delete(fixtureName)

      console.log(`✅ Cleaned up test data: ${fixtureName} (${cleanedCount} records)`)

      return {
        success: true,
        recordsDeleted: cleanedCount,
        fixtureName,
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup test data ${fixtureName}: ${error.message}`)
      return {
        success: false,
        error: error.message,
        fixtureName,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Delete individual record by type and ID
   */
  async deleteRecord(client, dataType, recordId) {
    const deleteQueries = {
      parlant_event: 'DELETE FROM parlant_event WHERE id = $1',
      parlant_session: 'DELETE FROM parlant_session WHERE id = $1',
      parlant_journey: 'DELETE FROM parlant_journey WHERE id = $1',
      parlant_guideline: 'DELETE FROM parlant_guideline WHERE id = $1',
      parlant_tool: 'DELETE FROM parlant_tool WHERE id = $1',
      parlant_agent: 'DELETE FROM parlant_agent WHERE id = $1',
      embedding: 'DELETE FROM embedding WHERE id = $1',
      document: 'DELETE FROM document WHERE id = $1',
      knowledgeBase: 'DELETE FROM "knowledgeBase" WHERE id = $1',
      workflow_blocks: 'DELETE FROM workflow_blocks WHERE id = $1',
      workflow_folder: 'DELETE FROM workflow_folder WHERE id = $1',
      workflow: 'DELETE FROM workflow WHERE id = $1',
      apiKey: 'DELETE FROM "apiKey" WHERE id = $1',
      permissions: 'DELETE FROM permissions WHERE id = $1',
      workspace_environment: 'DELETE FROM workspace_environment WHERE "workspaceId" = $1',
      workspace: 'DELETE FROM workspace WHERE id = $1',
      user: 'DELETE FROM "user" WHERE id = $1',
    }

    const query = deleteQueries[dataType]
    if (query) {
      await client.query(query, [recordId])
    } else {
      console.warn(`⚠️  Unknown data type for cleanup: ${dataType}`)
    }
  }

  /**
   * Clean up expired test data
   */
  async cleanupExpiredTestData() {
    console.log('🧹 Cleaning up expired test data...')

    const client = await this.dbPool.connect()

    try {
      // Get expired fixtures
      const expiredFixtures = await client.query(`
        SELECT DISTINCT fixture_name
        FROM test_data_registry
        WHERE expires_at < NOW()
      `)

      let totalCleaned = 0

      for (const fixture of expiredFixtures.rows) {
        const result = await this.cleanupTestData(fixture.fixture_name)
        if (result.success) {
          totalCleaned += result.recordsDeleted
        }
      }

      console.log(`✅ Expired test data cleanup completed: ${totalCleaned} records cleaned`)

      return {
        success: true,
        fixturesProcessed: expiredFixtures.rows.length,
        recordsCleaned: totalCleaned,
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup expired test data: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Get test data statistics
   */
  async getTestDataStatistics() {
    const client = await this.dbPool.connect()

    try {
      const stats = await client.query(`
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT fixture_name) as active_fixtures,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_records,
          data_type,
          COUNT(*) as type_count
        FROM test_data_registry
        GROUP BY data_type
        ORDER BY type_count DESC
      `)

      const summary = await client.query(`
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT fixture_name) as active_fixtures,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_records
        FROM test_data_registry
      `)

      return {
        summary: summary.rows[0],
        byType: stats.rows,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Generate test data report
   */
  async generateTestDataReport() {
    const stats = await this.getTestDataStatistics()

    const reportData = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      statistics: stats,
      fixtures_in_memory: Array.from(this.createdData.keys()),
      data_relationships: this.dataRelationships.size,
    }

    const reportPath = path.join(__dirname, `test_data_report_${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2))

    console.log(`📋 Test data report generated: ${reportPath}`)

    return reportData
  }

  /**
   * Cleanup fixtures manager resources
   */
  async cleanup() {
    // Cleanup all active fixtures
    for (const fixtureName of this.createdData.keys()) {
      await this.cleanupTestData(fixtureName)
    }

    // Cleanup expired data
    await this.cleanupExpiredTestData()

    if (this.dbPool) {
      await this.dbPool.end()
      console.log('🧹 Test data fixtures manager database connections closed')
    }
  }
}

module.exports = TestDataFixtures
