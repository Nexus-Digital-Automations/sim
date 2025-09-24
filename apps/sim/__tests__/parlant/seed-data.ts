/**
 * Parlant Database Test Seed Data
 *
 * Comprehensive data seeding utilities for creating realistic test scenarios
 * across all Parlant database tables and relationships.
 */

import { db } from '@sim/db'
import {
  apiKey,
  chat,
  customTools,
  knowledgeBase,
  mcpServers,
  // Parlant tables
  parlantAgent,
  parlantAgentApiKey,
  parlantAgentKnowledgeBase,
  parlantAgentTool,
  parlantAgentWorkflow,
  parlantCannedResponse,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyGuideline,
  parlantJourneyState,
  parlantJourneyTransition,
  parlantSession,
  parlantSessionWorkflow,
  parlantTerm,
  parlantTool,
  parlantToolIntegration,
  parlantVariable,
  // Core Sim tables
  user,
  workflow,
  workspace,
} from '@sim/db/schema'

export interface SeedDataContext {
  userId: string
  workspaceId: string
  workflowId: string
  knowledgeBaseId: string
  apiKeyId: string
  customToolId: string
  mcpServerId: string
  agentIds: string[]
  sessionIds: string[]
  journeyIds: string[]
  toolIds: string[]
}

export class ParlantTestDataSeeder {
  private ctx: Partial<SeedDataContext> = {}

  /**
   * Create foundational Sim entities required for Parlant testing
   */
  async createFoundationalData(): Promise<SeedDataContext> {
    console.log('Creating foundational Sim entities...')

    // Create user
    const userResult = await db
      .insert(user)
      .values({
        id: `seeduser-${Date.now()}`,
        name: 'Parlant Test User',
        email: `parlant-test-${Date.now()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: `cus_seed_${Date.now()}`,
      })
      .returning({ id: user.id })

    // Create workspace
    const workspaceResult = await db
      .insert(workspace)
      .values({
        id: `seedworkspace-${Date.now()}`,
        name: 'Parlant Test Workspace',
        ownerId: userResult[0].id,
      })
      .returning({ id: workspace.id })

    // Create workflow
    const workflowResult = await db
      .insert(workflow)
      .values({
        id: `seedworkflow-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Parlant Integration Workflow',
        description: 'Test workflow for Parlant agent integration',
        color: '#8B5CF6',
        lastSynced: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        variables: {
          apiEndpoint: 'https://api.example.com',
          timeout: 30000,
          retries: 3,
        },
      })
      .returning({ id: workflow.id })

    // Create knowledge base
    const kbResult = await db
      .insert(knowledgeBase)
      .values({
        id: `seedkb-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Parlant Test Knowledge Base',
        description: 'Knowledge base containing test documentation and procedures',
        tokenCount: 25000,
        embeddingModel: 'text-embedding-3-small',
        embeddingDimension: 1536,
        chunkingConfig: {
          maxSize: 1024,
          minSize: 100,
          overlap: 200,
        },
      })
      .returning({ id: knowledgeBase.id })

    // Create API key
    const apiKeyResult = await db
      .insert(apiKey)
      .values({
        id: `seedapikey-${Date.now()}`,
        userId: userResult[0].id,
        workspaceId: workspaceResult[0].id,
        name: 'Parlant Test API Key',
        key: `sk-parlant-test-${Date.now()}`,
        type: 'workspace',
        createdBy: userResult[0].id,
      })
      .returning({ id: apiKey.id })

    // Create custom tool
    const customToolResult = await db
      .insert(customTools)
      .values({
        id: `seedtool-${Date.now()}`,
        userId: userResult[0].id,
        title: 'Parlant Test Custom Tool',
        schema: {
          type: 'function',
          function: {
            name: 'process_customer_query',
            description: 'Process customer queries and generate appropriate responses',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Customer query text' },
                context: { type: 'object', description: 'Additional context information' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
              },
              required: ['query'],
            },
          },
        },
        code: `
          function process_customer_query(query, context = {}, priority = 'medium') {
            const analysis = {
              sentiment: query.includes('!') || query.includes('urgent') ? 'negative' : 'neutral',
              category: query.toLowerCase().includes('billing') ? 'billing' : 'general',
              complexity: query.split(' ').length > 20 ? 'high' : 'low',
              priority: priority
            };

            const response = {
              processed: true,
              analysis: analysis,
              suggestedActions: analysis.category === 'billing' ? ['check_account', 'review_charges'] : ['general_help'],
              confidence: 0.85,
              timestamp: new Date().toISOString()
            };

            return { success: true, result: response };
          }
        `,
      })
      .returning({ id: customTools.id })

    // Create MCP server
    const mcpServerResult = await db
      .insert(mcpServers)
      .values({
        id: `seedmcp-${Date.now()}`,
        workspaceId: workspaceResult[0].id,
        createdBy: userResult[0].id,
        name: 'Parlant Test MCP Server',
        description: 'MCP server providing external tool capabilities for Parlant agents',
        transport: 'http',
        url: 'http://localhost:9000/mcp',
        headers: { 'X-API-Key': 'test-mcp-key' },
        timeout: 30000,
        retries: 3,
        enabled: true,
        connectionStatus: 'connected',
        toolCount: 12,
        lastToolsRefresh: new Date(),
        totalRequests: 0,
      })
      .returning({ id: mcpServers.id })

    this.ctx = {
      userId: userResult[0].id,
      workspaceId: workspaceResult[0].id,
      workflowId: workflowResult[0].id,
      knowledgeBaseId: kbResult[0].id,
      apiKeyId: apiKeyResult[0].id,
      customToolId: customToolResult[0].id,
      mcpServerId: mcpServerResult[0].id,
      agentIds: [],
      sessionIds: [],
      journeyIds: [],
      toolIds: [],
    }

    console.log('✓ Foundational data created')
    return this.ctx as SeedDataContext
  }

  /**
   * Create diverse Parlant agents for different testing scenarios
   */
  async createParlantAgents(): Promise<string[]> {
    if (!this.ctx.workspaceId || !this.ctx.userId) {
      throw new Error('Foundational data must be created first')
    }

    console.log('Creating Parlant agents...')

    const agents = await db
      .insert(parlantAgent)
      .values([
        {
          workspaceId: this.ctx.workspaceId,
          createdBy: this.ctx.userId,
          name: 'Customer Support Agent',
          description: 'Specialized agent for handling customer support inquiries',
          status: 'active',
          compositionMode: 'fluid',
          systemPrompt:
            'You are a helpful customer support agent. Always be polite, professional, and solution-oriented. If you cannot solve an issue, escalate it appropriately.',
          modelProvider: 'openai',
          modelName: 'gpt-4',
          temperature: 70,
          maxTokens: 2000,
          responseTimeoutMs: 30000,
          allowInterruption: true,
          allowProactiveMessages: false,
          conversationStyle: 'professional',
          dataRetentionDays: 90,
          allowDataExport: true,
          piiHandlingMode: 'strict',
          integrationMetadata: {
            supportSystem: 'zendesk',
            ticketingEnabled: true,
          },
          customConfig: {
            escalationThreshold: 3,
            languages: ['en', 'es', 'fr'],
          },
          totalSessions: 0,
          totalMessages: 0,
        },
        {
          workspaceId: this.ctx.workspaceId,
          createdBy: this.ctx.userId,
          name: 'Sales Assistant Agent',
          description: 'Agent focused on sales inquiries and lead qualification',
          status: 'active',
          compositionMode: 'strict',
          systemPrompt:
            'You are a sales assistant. Your goal is to qualify leads, understand customer needs, and guide them towards appropriate solutions. Be friendly but focused on business objectives.',
          modelProvider: 'openai',
          modelName: 'gpt-4',
          temperature: 80,
          maxTokens: 1500,
          responseTimeoutMs: 25000,
          allowInterruption: false,
          allowProactiveMessages: true,
          conversationStyle: 'friendly',
          dataRetentionDays: 180,
          allowDataExport: true,
          piiHandlingMode: 'standard',
          integrationMetadata: {
            crmSystem: 'salesforce',
            leadScoringEnabled: true,
          },
          customConfig: {
            qualificationQuestions: 5,
            followUpEnabled: true,
          },
          totalSessions: 0,
          totalMessages: 0,
        },
        {
          workspaceId: this.ctx.workspaceId,
          createdBy: this.ctx.userId,
          name: 'Technical Expert Agent',
          description: 'Deep technical knowledge agent for complex technical questions',
          status: 'active',
          compositionMode: 'fluid',
          systemPrompt:
            'You are a technical expert with deep knowledge of software development, APIs, and system architecture. Provide detailed, accurate technical guidance.',
          modelProvider: 'openai',
          modelName: 'gpt-4',
          temperature: 40,
          maxTokens: 3000,
          responseTimeoutMs: 45000,
          allowInterruption: true,
          allowProactiveMessages: false,
          conversationStyle: 'technical',
          dataRetentionDays: 365,
          allowDataExport: true,
          piiHandlingMode: 'standard',
          integrationMetadata: {
            documentationSystem: 'confluence',
            codeExamplesEnabled: true,
          },
          customConfig: {
            codeLanguages: ['javascript', 'typescript', 'python', 'go'],
            diagramsEnabled: true,
          },
          totalSessions: 0,
          totalMessages: 0,
        },
        {
          workspaceId: this.ctx.workspaceId,
          createdBy: this.ctx.userId,
          name: 'Onboarding Guide Agent',
          description: 'Agent specialized in user onboarding and training',
          status: 'active',
          compositionMode: 'strict',
          systemPrompt:
            'You are an onboarding specialist. Help new users get started with our platform through step-by-step guidance and interactive tutorials.',
          modelProvider: 'openai',
          modelName: 'gpt-3.5-turbo',
          temperature: 85,
          maxTokens: 1800,
          responseTimeoutMs: 20000,
          allowInterruption: true,
          allowProactiveMessages: true,
          conversationStyle: 'friendly',
          dataRetentionDays: 60,
          allowDataExport: false,
          piiHandlingMode: 'relaxed',
          integrationMetadata: {
            tutorialSystem: 'intercom',
            progressTracking: true,
          },
          customConfig: {
            checkpointInterval: 5,
            encouragementEnabled: true,
          },
          totalSessions: 0,
          totalMessages: 0,
        },
        {
          workspaceId: this.ctx.workspaceId,
          createdBy: this.ctx.userId,
          name: 'Research Assistant Agent',
          description: 'Agent for research tasks and information gathering',
          status: 'inactive',
          compositionMode: 'fluid',
          systemPrompt:
            'You are a research assistant. Help users find relevant information, analyze data, and provide comprehensive research summaries.',
          modelProvider: 'anthropic',
          modelName: 'claude-3-sonnet',
          temperature: 60,
          maxTokens: 4000,
          responseTimeoutMs: 60000,
          allowInterruption: false,
          allowProactiveMessages: false,
          conversationStyle: 'professional',
          dataRetentionDays: 180,
          allowDataExport: true,
          piiHandlingMode: 'standard',
          integrationMetadata: {
            researchDatabases: ['pubmed', 'arxiv', 'google_scholar'],
            citationStyle: 'apa',
          },
          customConfig: {
            maxSources: 10,
            depthLevel: 'detailed',
          },
          totalSessions: 0,
          totalMessages: 0,
        },
      ])
      .returning({ id: parlantAgent.id })

    this.ctx.agentIds = agents.map((a) => a.id)
    console.log(`✓ Created ${agents.length} Parlant agents`)
    return this.ctx.agentIds
  }

  /**
   * Create Parlant tools and integrations
   */
  async createParlantTools(): Promise<string[]> {
    if (!this.ctx.workspaceId || !this.ctx.customToolId || !this.ctx.mcpServerId) {
      throw new Error('Foundational data and agents must be created first')
    }

    console.log('Creating Parlant tools...')

    const tools = await db
      .insert(parlantTool)
      .values([
        {
          workspaceId: this.ctx.workspaceId,
          name: 'ticket_search',
          displayName: 'Ticket Search',
          description: 'Search through support tickets to find relevant information',
          toolType: 'external',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query for tickets' },
              status: {
                type: 'string',
                enum: ['open', 'closed', 'pending'],
                description: 'Filter by ticket status',
              },
              dateRange: { type: 'string', description: 'Date range filter (e.g., "7d", "30d")' },
            },
            required: ['query'],
          },
          returnSchema: {
            type: 'object',
            properties: {
              tickets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    status: { type: 'string' },
                    priority: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              totalCount: { type: 'number' },
            },
          },
          usageGuidelines:
            'Use this tool when customers reference previous tickets or when you need to find similar issues',
          executionTimeout: 10000,
          rateLimitPerMinute: 30,
          rateLimitPerHour: 500,
          requiresAuth: true,
          authType: 'api_key',
          authConfig: { headerName: 'X-API-Key' },
          enabled: true,
        },
        {
          workspaceId: this.ctx.workspaceId,
          name: 'knowledge_search',
          displayName: 'Knowledge Base Search',
          description: 'Search the knowledge base for relevant articles and documentation',
          toolType: 'sim_native',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              categories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by article categories',
              },
              limit: { type: 'number', default: 5, description: 'Maximum number of results' },
            },
            required: ['query'],
          },
          returnSchema: {
            type: 'object',
            properties: {
              articles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    url: { type: 'string' },
                    relevanceScore: { type: 'number' },
                  },
                },
              },
            },
          },
          usageGuidelines:
            'Use this tool to find documentation and help articles relevant to customer questions',
          executionTimeout: 8000,
          rateLimitPerMinute: 60,
          rateLimitPerHour: 1000,
          requiresAuth: false,
          enabled: true,
        },
        {
          workspaceId: this.ctx.workspaceId,
          name: 'send_email',
          displayName: 'Send Email',
          description: 'Send emails to customers or internal team members',
          toolType: 'external',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject' },
              body: { type: 'string', description: 'Email body content' },
              template: { type: 'string', description: 'Email template to use (optional)' },
              priority: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' },
            },
            required: ['to', 'subject', 'body'],
          },
          returnSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string' },
              status: { type: 'string' },
              deliveredAt: { type: 'string' },
            },
          },
          usageGuidelines: 'Use this tool to send follow-up emails, confirmations, or escalations',
          executionTimeout: 15000,
          rateLimitPerMinute: 10,
          rateLimitPerHour: 100,
          requiresAuth: true,
          authType: 'oauth',
          authConfig: { scopes: ['send_email'] },
          enabled: true,
        },
        {
          workspaceId: this.ctx.workspaceId,
          name: 'create_ticket',
          displayName: 'Create Support Ticket',
          description: 'Create new support tickets in the ticketing system',
          toolType: 'external',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Ticket title' },
              description: { type: 'string', description: 'Detailed ticket description' },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                default: 'medium',
              },
              category: { type: 'string', description: 'Ticket category' },
              assignee: {
                type: 'string',
                description: 'Assign ticket to specific user (optional)',
              },
            },
            required: ['title', 'description'],
          },
          returnSchema: {
            type: 'object',
            properties: {
              ticketId: { type: 'string' },
              ticketNumber: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string' },
              url: { type: 'string' },
            },
          },
          usageGuidelines:
            'Use this tool when issues cannot be resolved immediately and need to be tracked',
          executionTimeout: 12000,
          rateLimitPerMinute: 20,
          rateLimitPerHour: 200,
          requiresAuth: true,
          authType: 'api_key',
          enabled: true,
        },
        {
          workspaceId: this.ctx.workspaceId,
          name: 'workflow_trigger',
          displayName: 'Trigger Workflow',
          description: 'Trigger predefined workflows for complex operations',
          toolType: 'sim_native',
          parameters: {
            type: 'object',
            properties: {
              workflowId: { type: 'string', description: 'ID of the workflow to trigger' },
              inputs: { type: 'object', description: 'Input data for the workflow' },
              wait: {
                type: 'boolean',
                default: false,
                description: 'Wait for workflow completion',
              },
            },
            required: ['workflowId'],
          },
          returnSchema: {
            type: 'object',
            properties: {
              executionId: { type: 'string' },
              status: { type: 'string' },
              result: { type: 'object' },
            },
          },
          usageGuidelines:
            'Use this tool to trigger complex multi-step processes defined in workflows',
          executionTimeout: 30000,
          rateLimitPerMinute: 15,
          rateLimitPerHour: 150,
          requiresAuth: false,
          enabled: true,
        },
      ])
      .returning({ id: parlantTool.id })

    this.ctx.toolIds = tools.map((t) => t.id)

    // Create tool integrations
    await db.insert(parlantToolIntegration).values([
      {
        parlantToolId: tools[1].id, // knowledge_search
        integrationType: 'custom_tool',
        targetId: this.ctx.customToolId,
        configuration: { timeout: 8000 },
        enabled: true,
        parameterMapping: { query: 'input' },
        responseMapping: { result: 'articles' },
        healthStatus: 'healthy',
      },
      {
        parlantToolId: tools[0].id, // ticket_search
        integrationType: 'mcp_server',
        targetId: this.ctx.mcpServerId,
        configuration: { endpoint: '/search/tickets' },
        enabled: true,
        parameterMapping: { query: 'searchTerm', status: 'filterStatus' },
        responseMapping: { data: 'tickets' },
        healthStatus: 'healthy',
      },
    ])

    console.log(`✓ Created ${tools.length} Parlant tools and integrations`)
    return this.ctx.toolIds
  }

  /**
   * Create comprehensive journeys for different agent scenarios
   */
  async createJourneys(): Promise<string[]> {
    if (!this.ctx.agentIds || this.ctx.agentIds.length === 0) {
      throw new Error('Agents must be created first')
    }

    console.log('Creating Parlant journeys...')

    const journeys = await db
      .insert(parlantJourney)
      .values([
        {
          agentId: this.ctx.agentIds[0], // Customer Support Agent
          title: 'Customer Issue Resolution Journey',
          description:
            'Guide customers through issue identification, troubleshooting, and resolution',
          conditions: [
            'user.intent === "support"',
            'user.message.contains("problem") || user.message.contains("issue") || user.message.contains("help")',
          ],
          enabled: true,
          allowSkipping: true,
          allowRevisiting: true,
        },
        {
          agentId: this.ctx.agentIds[1], // Sales Assistant Agent
          title: 'Lead Qualification Journey',
          description: 'Systematic lead qualification and nurturing process',
          conditions: [
            'user.intent === "sales"',
            'user.context.source === "landing_page" || user.context.source === "contact_form"',
          ],
          enabled: true,
          allowSkipping: false,
          allowRevisiting: false,
        },
        {
          agentId: this.ctx.agentIds[3], // Onboarding Guide Agent
          title: 'User Onboarding Journey',
          description: 'Step-by-step user onboarding and platform introduction',
          conditions: ['user.isNew === true', 'user.completedOnboarding !== true'],
          enabled: true,
          allowSkipping: true,
          allowRevisiting: true,
        },
      ])
      .returning({ id: parlantJourney.id })

    this.ctx.journeyIds = journeys.map((j) => j.id)

    // Create journey states for each journey
    for (let i = 0; i < journeys.length; i++) {
      const journey = journeys[i]

      if (i === 0) {
        // Customer Support Journey States
        const states = await db
          .insert(parlantJourneyState)
          .values([
            {
              journeyId: journey.id,
              name: 'Issue Identification',
              stateType: 'chat',
              chatPrompt:
                "I understand you're experiencing an issue. Could you please describe what specific problem you're facing?",
              isInitial: true,
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Information Gathering',
              stateType: 'chat',
              chatPrompt:
                'Thank you for that information. To help diagnose the issue, could you provide more details about when this started and what you were trying to do?',
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Knowledge Base Search',
              stateType: 'tool',
              toolId: this.ctx.toolIds?.[1], // knowledge_search tool
              toolConfig: { maxResults: 3, categories: ['troubleshooting', 'faq'] },
              allowSkip: true,
            },
            {
              journeyId: journey.id,
              name: 'Solution Presentation',
              stateType: 'chat',
              chatPrompt:
                "Based on your description, I've found some potential solutions. Let me walk you through them.",
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Resolution Confirmation',
              stateType: 'decision',
              condition: 'user.satisfaction >= 4 || user.issue_resolved === true',
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Escalation',
              stateType: 'tool',
              toolId: this.ctx.toolIds?.[3], // create_ticket tool
              toolConfig: { priority: 'medium', category: 'technical_support' },
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Completion',
              stateType: 'final',
              isFinal: true,
            },
          ])
          .returning({ id: parlantJourneyState.id })

        // Create transitions for support journey
        await db.insert(parlantJourneyTransition).values([
          {
            journeyId: journey.id,
            fromStateId: states[0].id,
            toStateId: states[1].id,
            condition: 'user.provided_description === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[1].id,
            toStateId: states[2].id,
            condition: 'user.needs_research === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[1].id,
            toStateId: states[3].id,
            condition: 'agent.has_immediate_solution === true',
            priority: 80,
          },
          {
            journeyId: journey.id,
            fromStateId: states[2].id,
            toStateId: states[3].id,
            condition: 'tool.search_completed === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[3].id,
            toStateId: states[4].id,
            condition: 'user.tries_solution === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[4].id,
            toStateId: states[6].id,
            condition: 'user.satisfaction >= 4',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[4].id,
            toStateId: states[5].id,
            condition: 'user.satisfaction < 3',
            priority: 90,
          },
          {
            journeyId: journey.id,
            fromStateId: states[5].id,
            toStateId: states[6].id,
            condition: 'tool.ticket_created === true',
            priority: 100,
          },
        ])
      } else if (i === 1) {
        // Sales Journey States
        const states = await db
          .insert(parlantJourneyState)
          .values([
            {
              journeyId: journey.id,
              name: 'Welcome & Qualification',
              stateType: 'chat',
              chatPrompt:
                "Welcome! I'm here to help you find the right solution for your needs. Could you tell me a bit about your business and what you're looking for?",
              isInitial: true,
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Needs Assessment',
              stateType: 'chat',
              chatPrompt:
                "That's helpful information. Let me ask a few questions to better understand your requirements and current challenges.",
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Solution Recommendation',
              stateType: 'chat',
              chatPrompt:
                "Based on what you've shared, I think I have some great options for you. Let me present the solutions that best fit your needs.",
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Objection Handling',
              stateType: 'decision',
              condition: 'user.has_objections === true || user.needs_more_info === true',
              allowSkip: true,
            },
            {
              journeyId: journey.id,
              name: 'Next Steps',
              stateType: 'chat',
              chatPrompt:
                "Excellent! Let's discuss the next steps. I can set you up with a trial or connect you with our team for a detailed demo.",
              allowSkip: false,
            },
            {
              journeyId: journey.id,
              name: 'Follow-up Scheduling',
              stateType: 'tool',
              toolId: this.ctx.toolIds?.[2], // send_email tool
              toolConfig: { template: 'sales_followup', priority: 'high' },
              allowSkip: true,
            },
            {
              journeyId: journey.id,
              name: 'Completion',
              stateType: 'final',
              isFinal: true,
            },
          ])
          .returning({ id: parlantJourneyState.id })

        // Create transitions for sales journey
        await db.insert(parlantJourneyTransition).values([
          {
            journeyId: journey.id,
            fromStateId: states[0].id,
            toStateId: states[1].id,
            condition: 'user.qualified === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[1].id,
            toStateId: states[2].id,
            condition: 'assessment.completed === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[2].id,
            toStateId: states[3].id,
            condition: 'user.has_objections === true',
            priority: 80,
          },
          {
            journeyId: journey.id,
            fromStateId: states[2].id,
            toStateId: states[4].id,
            condition: 'user.interested === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[3].id,
            toStateId: states[2].id,
            condition: 'objections.addressed === true',
            priority: 90,
          },
          {
            journeyId: journey.id,
            fromStateId: states[3].id,
            toStateId: states[6].id,
            condition: 'user.not_interested === true',
            priority: 50,
          },
          {
            journeyId: journey.id,
            fromStateId: states[4].id,
            toStateId: states[5].id,
            condition: 'user.wants_followup === true',
            priority: 90,
          },
          {
            journeyId: journey.id,
            fromStateId: states[4].id,
            toStateId: states[6].id,
            condition: 'user.ready_to_proceed === true',
            priority: 100,
          },
          {
            journeyId: journey.id,
            fromStateId: states[5].id,
            toStateId: states[6].id,
            condition: 'tool.email_sent === true',
            priority: 100,
          },
        ])
      }
    }

    console.log(`✓ Created ${journeys.length} Parlant journeys with states and transitions`)
    return this.ctx.journeyIds
  }

  /**
   * Create agent configurations and relationships
   */
  async createAgentConfigurations(): Promise<void> {
    if (!this.ctx.agentIds || !this.ctx.toolIds || !this.ctx.knowledgeBaseId) {
      throw new Error('Agents and tools must be created first')
    }

    console.log('Creating agent configurations...')

    // Create agent-tool relationships
    const agentToolMappings = [
      // Customer Support Agent tools
      { agentIndex: 0, toolIndices: [0, 1, 3], priority: [1, 2, 3] }, // ticket_search, knowledge_search, create_ticket
      // Sales Assistant Agent tools
      { agentIndex: 1, toolIndices: [2, 4], priority: [1, 2] }, // send_email, workflow_trigger
      // Technical Expert Agent tools
      { agentIndex: 2, toolIndices: [1, 4], priority: [1, 2] }, // knowledge_search, workflow_trigger
      // Onboarding Guide Agent tools
      { agentIndex: 3, toolIndices: [1, 2], priority: [1, 2] }, // knowledge_search, send_email
    ]

    for (const mapping of agentToolMappings) {
      if (
        this.ctx.agentIds[mapping.agentIndex] &&
        mapping.toolIndices.every((i) => this.ctx.toolIds![i])
      ) {
        await db.insert(parlantAgentTool).values(
          mapping.toolIndices.map((toolIndex, i) => ({
            agentId: this.ctx.agentIds![mapping.agentIndex],
            toolId: this.ctx.toolIds![toolIndex],
            configuration: {
              context: 'general',
              autoExecute: i === 0, // First tool is auto-execute
            },
            enabled: true,
            priority: mapping.priority[i],
          }))
        )
      }
    }

    // Create agent-knowledge base relationships
    await db.insert(parlantAgentKnowledgeBase).values(
      this.ctx.agentIds.map((agentId, index) => ({
        agentId,
        knowledgeBaseId: this.ctx.knowledgeBaseId!,
        enabled: true,
        searchThreshold: index === 2 ? 90 : 80, // Technical agent has higher threshold
        maxResults: index === 2 ? 8 : 5, // Technical agent gets more results
        priority: 100,
      }))
    )

    // Create agent-workflow relationships
    if (this.ctx.workflowId) {
      await db.insert(parlantAgentWorkflow).values([
        {
          agentId: this.ctx.agentIds[0], // Customer Support
          workflowId: this.ctx.workflowId,
          workspaceId: this.ctx.workspaceId!,
          integrationType: 'trigger',
          enabled: true,
          triggerConditions: ['user.escalation_needed === true'],
          inputMapping: { sessionId: '{{session.id}}', issueType: '{{analysis.category}}' },
        },
        {
          agentId: this.ctx.agentIds[1], // Sales Assistant
          workflowId: this.ctx.workflowId,
          workspaceId: this.ctx.workspaceId!,
          integrationType: 'monitor',
          enabled: true,
          monitorEvents: ['workflow.completed', 'workflow.failed'],
          outputMapping: { leadStatus: '{{workflow.result.status}}' },
        },
      ])
    }

    // Create agent-API key relationships
    if (this.ctx.apiKeyId) {
      await db.insert(parlantAgentApiKey).values(
        this.ctx.agentIds.map((agentId, index) => ({
          agentId,
          apiKeyId: this.ctx.apiKeyId!,
          workspaceId: this.ctx.workspaceId!,
          purpose: index === 1 ? 'external_service' : 'tools',
          enabled: true,
          priority: 1,
        }))
      )
    }

    // Create guidelines for each agent
    const guidelines = [
      // Customer Support Agent guidelines
      {
        agentIndex: 0,
        guidelines: [
          {
            condition: 'user.sentiment === "angry" || user.message.contains("frustrated")',
            action:
              'Show extra empathy, acknowledge their frustration, and prioritize quick resolution',
            priority: 150,
            toolIds: [this.ctx.toolIds[0], this.ctx.toolIds[3]], // ticket_search, create_ticket
          },
          {
            condition: 'user.issue.category === "billing"',
            action:
              'Handle with care, verify account details, and escalate to billing team if needed',
            priority: 140,
            toolIds: [this.ctx.toolIds[0]], // ticket_search
          },
          {
            condition: 'user.is_premium_customer === true',
            action: 'Provide premium support level with faster response and additional assistance',
            priority: 130,
            toolIds: [],
          },
        ],
      },
      // Sales Assistant Agent guidelines
      {
        agentIndex: 1,
        guidelines: [
          {
            condition: 'user.company_size === "enterprise"',
            action: 'Focus on enterprise features, ROI, and schedule executive demo',
            priority: 150,
            toolIds: [this.ctx.toolIds[2]], // send_email
          },
          {
            condition: 'user.budget_indicated === false',
            action: 'Gently explore budget parameters while focusing on value proposition',
            priority: 120,
            toolIds: [],
          },
          {
            condition: 'user.competitor_mentioned === true',
            action: 'Acknowledge competitor, focus on unique differentiators without disparaging',
            priority: 140,
            toolIds: [],
          },
        ],
      },
    ]

    for (const agentGuidelines of guidelines) {
      if (this.ctx.agentIds[agentGuidelines.agentIndex]) {
        const createdGuidelines = await db
          .insert(parlantGuideline)
          .values(
            agentGuidelines.guidelines.map((g) => ({
              agentId: this.ctx.agentIds![agentGuidelines.agentIndex],
              condition: g.condition,
              action: g.action,
              priority: g.priority,
              enabled: true,
              toolIds: g.toolIds.length > 0 ? g.toolIds : [],
            }))
          )
          .returning({ id: parlantGuideline.id })

        // Connect guidelines to journeys if applicable
        if (this.ctx.journeyIds && this.ctx.journeyIds.length > agentGuidelines.agentIndex) {
          await db.insert(parlantJourneyGuideline).values(
            createdGuidelines.map((guideline) => ({
              journeyId: this.ctx.journeyIds![agentGuidelines.agentIndex],
              guidelineId: guideline.id,
              enabled: true,
              priorityOverride: null,
            }))
          )
        }
      }
    }

    // Create glossary terms for agents
    const terms = [
      { agentIndex: 0, terms: ['Escalation', 'SLA', 'Ticket Priority', 'Resolution Time'] },
      { agentIndex: 1, terms: ['Lead Qualification', 'ROI', 'Demo', 'Enterprise'] },
      { agentIndex: 2, terms: ['API', 'SDK', 'Integration', 'Architecture'] },
      { agentIndex: 3, terms: ['Onboarding', 'Tutorial', 'Checkpoint', 'Progress'] },
    ]

    for (const agentTerms of terms) {
      if (this.ctx.agentIds[agentTerms.agentIndex]) {
        await db.insert(parlantTerm).values(
          agentTerms.terms.map((term, index) => ({
            agentId: this.ctx.agentIds![agentTerms.agentIndex],
            name: term,
            description: `Definition and context for ${term} in the context of ${agentTerms.agentIndex === 0 ? 'customer support' : agentTerms.agentIndex === 1 ? 'sales' : agentTerms.agentIndex === 2 ? 'technical' : 'onboarding'}`,
            synonyms: [],
            category:
              agentTerms.agentIndex === 0
                ? 'support'
                : agentTerms.agentIndex === 1
                  ? 'sales'
                  : agentTerms.agentIndex === 2
                    ? 'technical'
                    : 'training',
            examples: [`Example usage of ${term} in conversation`],
            importance: 100 - index * 10,
          }))
        )
      }
    }

    // Create canned responses
    const cannedResponses = [
      {
        agentIndex: 0,
        responses: [
          {
            template:
              "Thank you for contacting support. I understand you're experiencing {{issue_type}}. Let me help you resolve this quickly.",
            category: 'greeting',
            tags: ['support', 'greeting'],
            conditions: ['session.start === true'],
          },
          {
            template:
              "I've escalated your case ({{ticket_id}}) to our specialized team. You should receive an update within {{sla_time}}.",
            category: 'escalation',
            tags: ['escalation', 'timeline'],
            conditions: ['action.escalate === true'],
          },
        ],
      },
      {
        agentIndex: 1,
        responses: [
          {
            template:
              "Welcome! I'm excited to learn about {{company_name}} and how we can help you achieve {{business_goal}}.",
            category: 'sales_greeting',
            tags: ['sales', 'welcome'],
            conditions: ['session.type === "sales"'],
          },
          {
            template:
              'Based on your needs, I recommend our {{plan_name}} plan. This includes {{key_features}} which aligns perfectly with {{user_requirements}}.',
            category: 'recommendation',
            tags: ['recommendation', 'plans'],
            conditions: ['assessment.completed === true'],
          },
        ],
      },
    ]

    for (const agentResponses of cannedResponses) {
      if (this.ctx.agentIds[agentResponses.agentIndex]) {
        await db.insert(parlantCannedResponse).values(
          agentResponses.responses.map((response) => ({
            agentId: this.ctx.agentIds![agentResponses.agentIndex],
            template: response.template,
            category: response.category,
            tags: response.tags,
            conditions: response.conditions,
            priority: 100,
            enabled: true,
          }))
        )
      }
    }

    console.log('✓ Agent configurations created')
  }

  /**
   * Create realistic conversation sessions
   */
  async createConversationSessions(): Promise<string[]> {
    if (!this.ctx.agentIds || !this.ctx.journeyIds) {
      throw new Error('Agents and journeys must be created first')
    }

    console.log('Creating conversation sessions...')

    const sessions = await db
      .insert(parlantSession)
      .values([
        // Customer Support Sessions
        {
          agentId: this.ctx.agentIds[0],
          workspaceId: this.ctx.workspaceId!,
          userId: this.ctx.userId!,
          customerId: 'customer-support-001',
          mode: 'auto',
          status: 'completed',
          title: 'Login Issue Resolution',
          metadata: { source: 'chat_widget', priority: 'high' },
          currentJourneyId: this.ctx.journeyIds[0],
          variables: { issueType: 'authentication', userTier: 'premium' },
          eventCount: 12,
          messageCount: 6,
          tokensUsed: 450,
          cost: 75,
          satisfactionScore: 5,
          sessionType: 'support',
          tags: ['authentication', 'resolved'],
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          locale: 'en',
          timezone: 'America/New_York',
          startedAt: new Date(Date.now() - 86400000), // 1 day ago
          lastActivityAt: new Date(Date.now() - 86000000), // Completed yesterday
          endedAt: new Date(Date.now() - 86000000),
        },
        {
          agentId: this.ctx.agentIds[0],
          workspaceId: this.ctx.workspaceId!,
          customerId: 'customer-support-002',
          mode: 'auto',
          status: 'active',
          title: 'API Integration Help',
          metadata: { source: 'email', priority: 'medium' },
          currentJourneyId: this.ctx.journeyIds[0],
          variables: { issueType: 'technical', userTier: 'standard' },
          eventCount: 8,
          messageCount: 4,
          tokensUsed: 320,
          cost: 55,
          sessionType: 'support',
          tags: ['api', 'technical'],
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          locale: 'en',
          timezone: 'America/Los_Angeles',
          startedAt: new Date(Date.now() - 3600000), // 1 hour ago
          lastActivityAt: new Date(),
        },
        // Sales Sessions
        {
          agentId: this.ctx.agentIds[1],
          workspaceId: this.ctx.workspaceId!,
          customerId: 'sales-prospect-001',
          mode: 'auto',
          status: 'completed',
          title: 'Enterprise Demo Request',
          metadata: { source: 'landing_page', campaign: 'enterprise-2024' },
          currentJourneyId: this.ctx.journeyIds[1],
          variables: { companySize: 'enterprise', budget: 'high', timeline: 'Q1' },
          eventCount: 15,
          messageCount: 8,
          tokensUsed: 620,
          cost: 95,
          satisfactionScore: 4,
          sessionType: 'sales',
          tags: ['enterprise', 'qualified'],
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          locale: 'en',
          timezone: 'Europe/London',
          startedAt: new Date(Date.now() - 172800000), // 2 days ago
          lastActivityAt: new Date(Date.now() - 172000000),
          endedAt: new Date(Date.now() - 172000000),
        },
        {
          agentId: this.ctx.agentIds[1],
          workspaceId: this.ctx.workspaceId!,
          customerId: 'sales-prospect-002',
          mode: 'manual',
          status: 'active',
          title: 'Pricing Inquiry',
          metadata: { source: 'contact_form', campaign: 'pricing-page' },
          currentJourneyId: this.ctx.journeyIds[1],
          variables: { companySize: 'startup', budget: 'limited', timeline: 'Q2' },
          eventCount: 6,
          messageCount: 3,
          tokensUsed: 180,
          cost: 30,
          sessionType: 'sales',
          tags: ['pricing', 'startup'],
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          locale: 'en',
          timezone: 'America/Chicago',
          startedAt: new Date(Date.now() - 1800000), // 30 minutes ago
          lastActivityAt: new Date(Date.now() - 300000), // 5 minutes ago
        },
        // Onboarding Sessions
        {
          agentId: this.ctx.agentIds[3],
          workspaceId: this.ctx.workspaceId!,
          userId: this.ctx.userId,
          customerId: 'onboarding-user-001',
          mode: 'auto',
          status: 'active',
          title: 'New User Onboarding',
          metadata: { source: 'signup_flow', plan: 'professional' },
          currentJourneyId: this.ctx.journeyIds[2],
          variables: { onboardingStep: 3, completionRate: 0.6 },
          eventCount: 10,
          messageCount: 5,
          tokensUsed: 280,
          cost: 45,
          sessionType: 'onboarding',
          tags: ['onboarding', 'professional'],
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          locale: 'en',
          timezone: 'America/Denver',
          startedAt: new Date(Date.now() - 900000), // 15 minutes ago
          lastActivityAt: new Date(Date.now() - 120000), // 2 minutes ago
        },
      ])
      .returning({ id: parlantSession.id })

    this.ctx.sessionIds = sessions.map((s) => s.id)

    // Create events for each session
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      const eventCount = [12, 8, 15, 6, 10][i] // Match the eventCount from session data

      const events = Array.from({ length: eventCount }, (_, eventIndex) => {
        const isCustomerMessage = eventIndex % 2 === 0
        const messageContent = this.generateRealisticMessage(i, eventIndex, isCustomerMessage)

        return {
          sessionId: session.id,
          offset: eventIndex + 1,
          eventType: isCustomerMessage ? ('customer_message' as const) : ('agent_message' as const),
          content: {
            message: messageContent,
            timestamp: Date.now() - (eventCount - eventIndex) * 60000, // Spread over time
          },
          metadata: {
            messageId: `msg-${session.id}-${eventIndex + 1}`,
            confidence: isCustomerMessage ? undefined : Math.random() * 0.3 + 0.7, // Agent confidence 0.7-1.0
          },
        }
      })

      await db.insert(parlantEvent).values(events)

      // Create session variables based on conversation context
      const sessionVariables = this.generateSessionVariables(i, session.id)
      if (sessionVariables.length > 0) {
        await db.insert(parlantVariable).values(sessionVariables)
      }
    }

    // Create some session workflow executions
    if (this.ctx.workflowId) {
      await db.insert(parlantSessionWorkflow).values([
        {
          sessionId: sessions[0].id, // Support session
          workflowId: this.ctx.workflowId,
          executionId: `exec-support-${Date.now()}`,
          triggerReason: 'Issue escalation required',
          inputData: { sessionId: sessions[0].id, issueType: 'authentication', priority: 'high' },
          outputData: { ticketCreated: true, ticketId: 'TICK-12345', assignedTo: 'tier2-support' },
          status: 'completed',
          startedAt: new Date(Date.now() - 86200000),
          completedAt: new Date(Date.now() - 86000000),
        },
        {
          sessionId: sessions[2].id, // Sales session
          workflowId: this.ctx.workflowId,
          executionId: `exec-sales-${Date.now()}`,
          triggerReason: 'Lead qualification completed',
          inputData: { sessionId: sessions[2].id, leadScore: 85, companySize: 'enterprise' },
          outputData: { qualified: true, nextAction: 'schedule_demo', salesRep: 'enterprise-team' },
          status: 'completed',
          startedAt: new Date(Date.now() - 172200000),
          completedAt: new Date(Date.now() - 172000000),
        },
      ])
    }

    console.log(`✓ Created ${sessions.length} conversation sessions with events and variables`)
    return this.ctx.sessionIds
  }

  private generateRealisticMessage(
    sessionIndex: number,
    eventIndex: number,
    isCustomer: boolean
  ): string {
    const sessionTypes = ['support', 'support', 'sales', 'sales', 'onboarding']
    const sessionType = sessionTypes[sessionIndex]

    if (sessionType === 'support') {
      if (sessionIndex === 0) {
        // Login issue
        const customerMessages = [
          "Hi, I'm having trouble logging into my account. It keeps saying my password is wrong but I'm sure it's correct.",
          "I tried resetting my password but I'm not getting the reset email. This is really frustrating.",
          "Yes, I've checked my spam folder. Nothing there either.",
          'Okay, let me try that... Actually, that worked! I can see the email now.',
          "Perfect, I'm logged in now. Thank you so much for your help!",
          'Everything looks good on my end. Thanks again!',
        ]
        const agentMessages = [
          "Hello! I understand you're having trouble logging in. That can definitely be frustrating. Let me help you get this resolved quickly.",
          "I'm sorry to hear you're not receiving the reset email. Let me check a few things. First, could you confirm the email address associated with your account?",
          'Thank you for checking. Sometimes there can be a delay with email delivery. Let me refresh the reset request from our end. You should receive a new email within the next 2-3 minutes.',
          "Excellent! I'm glad that worked. Please try logging in with your new password and let me know if you encounter any other issues.",
          "Wonderful! I'm so glad we could get that resolved for you quickly. Is there anything else I can help you with today?",
          "You're very welcome! If you have any other questions in the future, please don't hesitate to reach out. Have a great day!",
        ]
        return isCustomer
          ? customerMessages[Math.floor(eventIndex / 2)] || 'Thanks for your help!'
          : agentMessages[Math.floor(eventIndex / 2)] || "You're welcome!"
      }
      const customerMessages = [
        "Hi, I'm trying to integrate with your API but I'm getting authentication errors. Can you help?",
        "I'm using the API key from my dashboard, but I keep getting a 401 unauthorized error.",
        "I'm using it in the Authorization header as 'Bearer [api-key]'. Is that correct?",
        'Ah, I see the issue now. Let me try that format instead.',
      ]
      const agentMessages = [
        "Hello! I'd be happy to help you with your API integration. Authentication errors are usually straightforward to resolve.",
        "I see the issue. For our API, you should use the format 'Bearer sk-your-api-key' in the Authorization header, not just the raw key.",
        "Actually, you don't need the 'Bearer' prefix for our API. Just use 'X-API-Key: your-api-key' as a header instead.",
        'Perfect! That should resolve the authentication issue. Let me know if you run into any other problems with the integration.',
      ]
      return isCustomer
        ? customerMessages[Math.floor(eventIndex / 2)] || 'That worked, thanks!'
        : agentMessages[Math.floor(eventIndex / 2)] || 'Glad I could help!'
    }
    if (sessionType === 'sales') {
      if (sessionIndex === 2) {
        // Enterprise demo
        const customerMessages = [
          "Hello, I'm interested in learning more about your enterprise solution. We're a team of about 200 people.",
          "We're currently using [competitor] but we're not happy with their pricing model and support quality.",
          'Security and compliance are very important to us. Do you support SOC 2 and GDPR compliance?',
          "That sounds great. We'd also need SSO integration and advanced analytics. Do you offer those?",
          'Perfect. What would be the next step to see a demo of these features?',
          "That works for us. I'll send over our team's calendars and we can coordinate.",
        ]
        const agentMessages = [
          "Welcome! I'm excited to learn more about your needs. For a team of 200, our Enterprise plan would be perfect. What's driving your search for a new solution?",
          'I understand those pain points completely. Our enterprise customers often mention those exact issues as reasons for switching to us.',
          "Absolutely! We're SOC 2 Type II certified and fully GDPR compliant. Security is one of our core strengths.",
          'Yes, we offer both! Our SSO supports SAML, OIDC, and Active Directory, and our analytics dashboard provides deep insights into usage patterns and performance metrics.',
          "I'd love to set up a customized demo for your team. We can show you exactly how these features work with your specific use case. Would a 45-minute session work?",
          "Excellent! I'll send you a calendar link and a brief questionnaire to help us tailor the demo to your specific needs. Looking forward to showing you what we can do!",
        ]
        return isCustomer
          ? customerMessages[Math.floor(eventIndex / 2)] || 'Sounds good!'
          : agentMessages[Math.floor(eventIndex / 2)] || 'Great to work with you!'
      }
      const customerMessages = [
        "Hi, I'm a startup founder and I'm trying to understand your pricing. What options do you have for small teams?",
        "We're just 5 people right now but we're planning to grow to about 15-20 by the end of the year.",
        "What's the difference between the Professional and Enterprise plans?",
      ]
      const agentMessages = [
        "Hello! I'd be happy to help you understand our pricing options for growing startups. Congratulations on your venture!",
        "That's exciting growth! For a team of 5 scaling to 20, I'd recommend starting with our Professional plan and we can easily upgrade you as you grow.",
        'Great question! Professional includes all core features plus advanced integrations, while Enterprise adds SSO, advanced analytics, and dedicated support. For most growing startups, Professional is the sweet spot.',
      ]
      return isCustomer
        ? customerMessages[Math.floor(eventIndex / 2)] || 'That makes sense, thanks!'
        : agentMessages[Math.floor(eventIndex / 2)] || 'Happy to help with your decision!'
    }
    const customerMessages = [
      "Hi! I just signed up and I'm not sure where to start. This looks pretty comprehensive.",
      "I'm trying to create my first workflow but I'm not sure how to connect the blocks together.",
      'Okay, I see the connection points now. What about adding conditions?',
      'Got it! This is starting to make sense. What should I do next?',
      "That sounds perfect. I'll try building something simple first.",
    ]
    const agentMessages = [
      "Welcome aboard! I'm here to help you get started. Let's begin with the basics - have you had a chance to explore the dashboard yet?",
      "No worries! Connecting blocks is easy. You'll see small circular connection points on each block. Just drag from an output point to an input point on another block.",
      'Excellent! For conditions, you can add decision blocks that route your workflow based on different criteria. Try adding one between your existing blocks.',
      "You're doing great! Next, I'd recommend testing your workflow with our built-in simulator, then trying a real execution with sample data.",
      "Perfect approach! Starting simple is always best. Feel free to reach out if you get stuck - I'm here to help anytime.",
    ]
    return isCustomer
      ? customerMessages[Math.floor(eventIndex / 2)] || 'Thanks for the guidance!'
      : agentMessages[Math.floor(eventIndex / 2)] || "You're doing great!"
  }

  private generateSessionVariables(sessionIndex: number, sessionId: string): any[] {
    const baseVariables = [
      {
        agentId: this.ctx.agentIds![sessionIndex < 2 ? 0 : sessionIndex < 4 ? 1 : 3],
        sessionId,
        key: 'conversation_started_at',
        scope: 'session',
        value: new Date().toISOString(),
        valueType: 'string',
        description: 'When the conversation began',
      },
      {
        agentId: this.ctx.agentIds![sessionIndex < 2 ? 0 : sessionIndex < 4 ? 1 : 3],
        key: 'user_sentiment',
        scope: 'session',
        value: sessionIndex === 1 ? 'frustrated' : sessionIndex === 3 ? 'curious' : 'neutral',
        valueType: 'string',
        description: 'Current user sentiment analysis',
      },
    ]

    if (sessionIndex < 2) {
      // Support sessions
      return [
        ...baseVariables,
        {
          agentId: this.ctx.agentIds![0],
          sessionId,
          key: 'issue_category',
          scope: 'session',
          value: sessionIndex === 0 ? 'authentication' : 'technical',
          valueType: 'string',
          description: 'Category of the reported issue',
        },
        {
          agentId: this.ctx.agentIds![0],
          sessionId,
          key: 'resolution_attempted',
          scope: 'session',
          value: ['password_reset', 'account_check'],
          valueType: 'array',
          description: 'Resolution steps that have been attempted',
        },
      ]
    }
    if (sessionIndex < 4) {
      // Sales sessions
      return [
        ...baseVariables,
        {
          agentId: this.ctx.agentIds![1],
          sessionId,
          key: 'lead_score',
          scope: 'session',
          value: sessionIndex === 2 ? 85 : 65,
          valueType: 'number',
          description: 'Calculated lead qualification score',
        },
        {
          agentId: this.ctx.agentIds![1],
          sessionId,
          key: 'company_profile',
          scope: 'session',
          value: {
            size: sessionIndex === 2 ? 'enterprise' : 'startup',
            industry: sessionIndex === 2 ? 'technology' : 'fintech',
            budget: sessionIndex === 2 ? 'high' : 'limited',
          },
          valueType: 'object',
          description: 'Company profile information gathered during conversation',
        },
      ]
    }
    return [
      ...baseVariables,
      {
        agentId: this.ctx.agentIds![3],
        sessionId,
        key: 'onboarding_progress',
        scope: 'session',
        value: {
          completed_steps: ['signup', 'profile', 'first_workflow'],
          current_step: 'workflow_testing',
          total_steps: 8,
          completion_rate: 0.625,
        },
        valueType: 'object',
        description: 'User progress through onboarding flow',
      },
    ]
  }

  /**
   * Clean up all created test data
   */
  async cleanup(): Promise<void> {
    if (!this.ctx.workspaceId) {
      console.log('No data to clean up')
      return
    }

    console.log('Cleaning up seeded test data...')

    try {
      // Clean up in reverse dependency order
      await db.delete(parlantSessionWorkflow).where(sql`true`)
      await db.delete(parlantAgentApiKey).where(sql`true`)
      await db.delete(parlantAgentWorkflow).where(sql`true`)
      await db.delete(parlantToolIntegration).where(sql`true`)
      await db.delete(parlantAgentKnowledgeBase).where(sql`true`)
      await db.delete(parlantJourneyGuideline).where(sql`true`)
      await db.delete(parlantAgentTool).where(sql`true`)
      await db.delete(parlantCannedResponse).where(sql`true`)
      await db.delete(parlantTerm).where(sql`true`)
      await db.delete(parlantVariable).where(sql`true`)
      await db.delete(parlantEvent).where(sql`true`)
      await db.delete(parlantSession).where(sql`true`)
      await db.delete(parlantJourneyTransition).where(sql`true`)
      await db.delete(parlantJourneyState).where(sql`true`)
      await db.delete(parlantJourney).where(sql`true`)
      await db.delete(parlantGuideline).where(sql`true`)
      await db.delete(parlantTool).where(sql`true`)
      await db.delete(parlantAgent).where(sql`true`)

      // Clean up Sim entities
      await db.delete(chat).where(sql`true`)
      await db.delete(mcpServers).where(sql`true`)
      await db.delete(customTools).where(sql`true`)
      await db.delete(apiKey).where(sql`true`)
      await db.delete(knowledgeBase).where(sql`true`)
      await db.delete(workflow).where(sql`true`)
      await db.delete(workspace).where(sql`true`)
      await db.delete(user).where(sql`true`)

      console.log('✓ All seeded test data cleaned up successfully')
    } catch (error) {
      console.error('Error during cleanup:', error)
      throw error
    }
  }

  /**
   * Get the current context for external use
   */
  getContext(): SeedDataContext {
    return this.ctx as SeedDataContext
  }

  /**
   * Create a complete test dataset
   */
  async seedAll(): Promise<SeedDataContext> {
    console.log('🌱 Starting comprehensive Parlant test data seeding...')

    await this.createFoundationalData()
    await this.createParlantAgents()
    await this.createParlantTools()
    await this.createJourneys()
    await this.createAgentConfigurations()
    await this.createConversationSessions()

    console.log('🎉 Comprehensive Parlant test data seeding completed!')
    console.log(`Created:
  - ${this.ctx.agentIds?.length || 0} agents
  - ${this.ctx.toolIds?.length || 0} tools
  - ${this.ctx.journeyIds?.length || 0} journeys
  - ${this.ctx.sessionIds?.length || 0} sessions
  - Full integration with workspace: ${this.ctx.workspaceId}`)

    return this.ctx as SeedDataContext
  }
}
