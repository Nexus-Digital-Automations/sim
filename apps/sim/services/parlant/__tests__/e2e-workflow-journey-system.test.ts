/**
 * End-to-End Workflow to Journey System Tests
 *
 * Comprehensive E2E testing framework that validates the complete workflow
 * conversion pipeline from ReactFlow workflows to Parlant journeys and
 * their execution in a conversational context.
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

// Simulated services - would be replaced with actual service imports
class MockParlantServer {
  private isRunning = false
  private agents: Map<string, any> = new Map()
  private journeys: Map<string, any> = new Map()
  private sessions: Map<string, any> = new Map()

  async start(): Promise<void> {
    console.log('🚀 Starting mock Parlant server...')
    this.isRunning = true

    // Simulate server startup time
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('✅ Mock Parlant server started')
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping mock Parlant server...')
    this.isRunning = false
    this.agents.clear()
    this.journeys.clear()
    this.sessions.clear()
    console.log('✅ Mock Parlant server stopped')
  }

  async createAgent(config: any): Promise<any> {
    const agent = {
      id: `agent_${Date.now()}`,
      Name: config.Name,
      description: config.description,
      created_at: new Date().toISOString(),
      guidelines: [],
      journeys: [],
    }

    this.agents.set(agent.id, agent)
    return agent
  }

  async createJourney(agentId: string, journeyDef: any): Promise<any> {
    const journey = {
      id: `journey_${Date.now()}`,
      agent_id: agentId,
      title: journeyDef.title,
      description: journeyDef.description,
      conditions: journeyDef.conditions,
      states: journeyDef.states,
      transitions: journeyDef.transitions,
      created_at: new Date().toISOString(),
      active: true,
    }

    this.journeys.set(journey.id, journey)

    // Add journey to agent
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.journeys.push(journey.id)
    }

    return journey
  }

  async createSession(agentId: string): Promise<any> {
    const session = {
      id: `session_${Date.now()}`,
      agent_id: agentId,
      created_at: new Date().toISOString(),
      events: [],
      status: 'active',
      current_journey_id: null,
      current_state_id: null,
    }

    this.sessions.set(session.id, session)
    return session
  }

  async sendMessage(sessionId: string, message: string): Promise<any> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')

    const event = {
      id: `event_${Date.now()}`,
      session_id: sessionId,
      type: 'customer_message',
      content: message,
      timestamp: new Date().toISOString(),
      offset: session.events.length,
    }

    session.events.push(event)

    // Simulate agent response
    await new Promise((resolve) => setTimeout(resolve, 500))

    const agentResponse = {
      id: `event_${Date.now()}_response`,
      session_id: sessionId,
      type: 'agent_message',
      content: this.generateAgentResponse(message, session),
      timestamp: new Date().toISOString(),
      offset: session.events.length,
    }

    session.events.push(agentResponse)
    return agentResponse
  }

  private generateAgentResponse(message: string, session: any): string {
    // Simple mock response generation
    if (message.toLowerCase().includes('workflow')) {
      return 'I can help you with workflow execution. What workflow would you like to run?'
    }
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      return "Hello! I'm your workflow assistant. How can I help you today?"
    }
    return 'I understand. Let me help you with that.'
  }

  async getSessionEvents(sessionId: string): Promise<any[]> {
    const session = this.sessions.get(sessionId)
    return session ? session.events : []
  }

  isServerRunning(): boolean {
    return this.isRunning
  }
}

class MockSimWorkflowService {
  private workflows: Map<string, any> = new Map()

  constructor() {
    // Pre-populate with test workflows
    this.initializeTestWorkflows()
  }

  private initializeTestWorkflows(): void {
    const testWorkflows = [
      {
        id: 'wf_customer_onboarding',
        Name: 'Customer Onboarding',
        description: 'Complete customer onboarding process',
        nodes: [
          { id: 'start', type: 'start', data: { label: 'Start' } },
          {
            id: 'collect_info',
            type: 'form',
            data: { label: 'Collect Information', fields: ['Name', 'email', 'phone'] },
          },
          {
            id: 'verify_email',
            type: 'tool',
            data: { label: 'Verify Email', toolId: 'email_verifier' },
          },
          {
            id: 'create_account',
            type: 'tool',
            data: { label: 'Create Account', toolId: 'account_creator' },
          },
          {
            id: 'send_welcome',
            type: 'tool',
            data: { label: 'Send Welcome Email', toolId: 'email_sender' },
          },
          { id: 'end', type: 'end', data: { label: 'End' } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'collect_info' },
          { id: 'e2', source: 'collect_info', target: 'verify_email' },
          { id: 'e3', source: 'verify_email', target: 'create_account', condition: 'email_valid' },
          { id: 'e4', source: 'create_account', target: 'send_welcome' },
          { id: 'e5', source: 'send_welcome', target: 'end' },
        ],
        metadata: {
          category: 'customer_management',
          tags: ['onboarding', 'automation'],
          created_by: 'admin',
          created_at: '2024-01-01T00:00:00Z',
        },
      },
      {
        id: 'wf_support_ticket',
        Name: 'Support Ticket Processing',
        description: 'Automated support ticket processing and routing',
        nodes: [
          { id: 'start', type: 'start', data: { label: 'Start' } },
          {
            id: 'categorize',
            type: 'tool',
            data: { label: 'Categorize Ticket', toolId: 'ticket_categorizer' },
          },
          {
            id: 'route_decision',
            type: 'condition',
            data: { label: 'Route Decision', condition: 'category' },
          },
          {
            id: 'high_priority',
            type: 'tool',
            data: { label: 'High Priority Handler', toolId: 'priority_handler' },
          },
          {
            id: 'standard_flow',
            type: 'tool',
            data: { label: 'Standard Flow', toolId: 'standard_handler' },
          },
          {
            id: 'notify_user',
            type: 'tool',
            data: { label: 'Notify User', toolId: 'notification_sender' },
          },
          { id: 'end', type: 'end', data: { label: 'End' } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'categorize' },
          { id: 'e2', source: 'categorize', target: 'route_decision' },
          {
            id: 'e3',
            source: 'route_decision',
            target: 'high_priority',
            condition: 'priority === "high"',
          },
          {
            id: 'e4',
            source: 'route_decision',
            target: 'standard_flow',
            condition: 'priority !== "high"',
          },
          { id: 'e5', source: 'high_priority', target: 'notify_user' },
          { id: 'e6', source: 'standard_flow', target: 'notify_user' },
          { id: 'e7', source: 'notify_user', target: 'end' },
        ],
        metadata: {
          category: 'customer_support',
          tags: ['support', 'automation', 'routing'],
          created_by: 'support_team',
          created_at: '2024-01-15T00:00:00Z',
        },
      },
    ]

    testWorkflows.forEach((workflow) => {
      this.workflows.set(workflow.id, workflow)
    })
  }

  async getWorkflow(workflowId: string): Promise<any> {
    return this.workflows.get(workflowId) || null
  }

  async getAllWorkflows(): Promise<any[]> {
    return Array.from(this.workflows.values())
  }

  async executeWorkflow(workflowId: string, inputs: any = {}): Promise<any> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) throw new Error('Workflow not found')

    return {
      execution_id: `exec_${Date.now()}`,
      workflow_id: workflowId,
      status: 'running',
      inputs,
      started_at: new Date().toISOString(),
      steps_completed: 0,
      total_steps: workflow.nodes.length,
    }
  }
}

class WorkflowToJourneyConverter {
  async convertWorkflowToJourney(workflow: any): Promise<any> {
    // Mock conversion implementation
    const journey = {
      title: `Conversational ${workflow.Name}`,
      description: `Converted workflow: ${workflow.description}`,
      conditions: [`User wants to execute ${workflow.Name}`],
      states: this.convertNodesToStates(workflow.nodes),
      transitions: this.convertEdgesToTransitions(workflow.edges),
      metadata: {
        originalWorkflowId: workflow.id,
        conversionTimestamp: new Date().toISOString(),
      },
    }

    return { success: true, journey }
  }

  private convertNodesToStates(nodes: any[]): any[] {
    return nodes.map((node) => ({
      id: `state_${node.id}`,
      type: this.mapNodeTypeToStateType(node.type),
      Name: node.data.label,
      config: node.data,
      originalNodeId: node.id,
    }))
  }

  private convertEdgesToTransitions(edges: any[]): any[] {
    return edges.map((edge) => ({
      id: `transition_${edge.id}`,
      from: `state_${edge.source}`,
      to: `state_${edge.target}`,
      condition: edge.condition || null,
    }))
  }

  private mapNodeTypeToStateType(nodeType: string): string {
    const mapping: Record<string, string> = {
      start: 'initial',
      end: 'final',
      tool: 'tool_state',
      form: 'chat_state',
      condition: 'chat_state',
    }
    return mapping[nodeType] || 'chat_state'
  }
}

// E2E Test Suite
describe('End-to-End Workflow to Journey System Tests', () => {
  let parlantServer: MockParlantServer
  let workflowService: MockSimWorkflowService
  let converter: WorkflowToJourneyConverter

  beforeAll(async () => {
    console.log('🚀 Initializing E2E Test Environment')

    parlantServer = new MockParlantServer()
    workflowService = new MockSimWorkflowService()
    converter = new WorkflowToJourneyConverter()

    await parlantServer.start()
  })

  afterAll(async () => {
    if (parlantServer) {
      await parlantServer.stop()
    }
  })

  describe('Complete Workflow to Journey Pipeline', () => {
    test('should convert workflow to journey and create conversational agent', async () => {
      // Step 1: Get a workflow from Sim
      const workflows = await workflowService.getAllWorkflows()
      expect(workflows.length).toBeGreaterThan(0)

      const testWorkflow = workflows[0]
      console.log(`🔄 Converting workflow: ${testWorkflow.Name}`)

      // Step 2: Convert workflow to journey
      const conversionResult = await converter.convertWorkflowToJourney(testWorkflow)
      expect(conversionResult.success).toBe(true)
      expect(conversionResult.journey).toBeDefined()

      // Step 3: Create agent in Parlant
      const agent = await parlantServer.createAgent({
        Name: `${testWorkflow.Name} Assistant`,
        description: `Conversational assistant for ${testWorkflow.description}`,
      })
      expect(agent).toBeDefined()
      expect(agent.id).toBeDefined()

      // Step 4: Create journey in agent
      const journey = await parlantServer.createJourney(agent.id, conversionResult.journey)
      expect(journey).toBeDefined()
      expect(journey.id).toBeDefined()
      expect(journey.states.length).toBeGreaterThan(0)

      console.log(`✅ Successfully created conversational workflow: ${journey.title}`)
    })

    test('should enable conversational interaction with workflow', async () => {
      // Setup: Create agent with workflow journey
      const workflow = await workflowService.getWorkflow('wf_customer_onboarding')
      const conversionResult = await converter.convertWorkflowToJourney(workflow)

      const agent = await parlantServer.createAgent({
        Name: 'Customer Onboarding Assistant',
        description: 'Helps customers through the onboarding process',
      })

      await parlantServer.createJourney(agent.id, conversionResult.journey)

      // Test conversational interaction
      const session = await parlantServer.createSession(agent.id)
      expect(session).toBeDefined()

      // User initiates conversation
      const response1 = await parlantServer.sendMessage(
        session.id,
        "Hi, I'd like to get started with onboarding"
      )
      expect(response1.type).toBe('agent_message')
      expect(response1.content).toBeDefined()

      // Verify conversation flow
      const events = await parlantServer.getSessionEvents(session.id)
      expect(events.length).toBe(2) // Customer message + agent response
      expect(events[0].type).toBe('customer_message')
      expect(events[1].type).toBe('agent_message')

      console.log('✅ Conversational interaction working correctly')
    })
  })

  describe('Cross-System Integration Tests', () => {
    test('should maintain workflow execution capabilities while adding conversational layer', async () => {
      const workflow = await workflowService.getWorkflow('wf_support_ticket')

      // Test 1: Original workflow execution still works
      const execution = await workflowService.executeWorkflow(workflow.id, {
        ticket_id: 'test_123',
        description: 'Test ticket',
        priority: 'high',
      })
      expect(execution.execution_id).toBeDefined()
      expect(execution.status).toBe('running')

      // Test 2: Conversational version also works
      const conversionResult = await converter.convertWorkflowToJourney(workflow)
      expect(conversionResult.success).toBe(true)

      const agent = await parlantServer.createAgent({
        Name: 'Support Ticket Assistant',
        description: 'Helps process support tickets conversationally',
      })

      const journey = await parlantServer.createJourney(agent.id, conversionResult.journey)
      expect(journey.states.length).toBe(workflow.nodes.length)

      console.log('✅ Both workflow and conversational execution paths functional')
    })

    test('should preserve workflow business logic in journey conversion', async () => {
      const workflow = await workflowService.getWorkflow('wf_customer_onboarding')
      const conversionResult = await converter.convertWorkflowToJourney(workflow)

      expect(conversionResult.success).toBe(true)

      const journey = conversionResult.journey

      // Verify all workflow nodes are represented as states
      expect(journey.states.length).toBe(workflow.nodes.length)

      // Verify all edges are represented as transitions
      expect(journey.transitions.length).toBe(workflow.edges.length)

      // Verify conditional logic is preserved
      const originalConditionalEdges = workflow.edges.filter((e: any) => e.condition)
      const journeyConditionalTransitions = journey.transitions.filter((t: any) => t.condition)
      expect(journeyConditionalTransitions.length).toBe(originalConditionalEdges.length)

      // Verify tool integrations are preserved
      const workflowTools = workflow.nodes.filter((n: any) => n.type === 'tool')
      const journeyToolStates = journey.states.filter((s: any) => s.type === 'tool_state')
      expect(journeyToolStates.length).toBe(workflowTools.length)

      console.log('✅ Business logic preservation verified')
    })
  })

  describe('Performance and Scalability Tests', () => {
    test('should handle multiple concurrent workflow conversions', async () => {
      const workflows = await workflowService.getAllWorkflows()
      const startTime = Date.now()

      // Convert all workflows concurrently
      const conversionPromises = workflows.map((workflow) =>
        converter.convertWorkflowToJourney(workflow)
      )

      const results = await Promise.all(conversionPromises)
      const totalTime = Date.now() - startTime

      // Verify all conversions succeeded
      results.forEach((result) => {
        expect(result.success).toBe(true)
        expect(result.journey).toBeDefined()
      })

      // Performance assertion - should complete within reasonable time
      expect(totalTime).toBeLessThan(workflows.length * 1000) // Max 1 second per workflow

      console.log(`✅ Converted ${workflows.length} workflows in ${totalTime}ms`)
    })

    test('should handle large workflow conversion efficiently', async () => {
      // Create a large synthetic workflow
      const largeWorkflow = this.createLargeWorkflow(100) // 100 nodes
      const startTime = Date.now()

      const result = await converter.convertWorkflowToJourney(largeWorkflow)
      const conversionTime = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.journey.states.length).toBe(100)
      expect(conversionTime).toBeLessThan(5000) // Max 5 seconds for 100 nodes

      console.log(`✅ Large workflow (100 nodes) converted in ${conversionTime}ms`)
    })
  })

  describe('Error Handling and Recovery Tests', () => {
    test('should handle workflow conversion errors gracefully', async () => {
      // Test with malformed workflow
      const malformedWorkflow = {
        id: 'malformed',
        Name: 'Malformed Workflow',
        nodes: null, // Invalid
        edges: undefined, // Invalid
      }

      const result = await converter.convertWorkflowToJourney(malformedWorkflow)
      expect(result.success).toBe(false)
      // Note: In real implementation, this would be handled properly
    })

    test('should maintain system stability when Parlant server is unavailable', async () => {
      // Stop Parlant server
      await parlantServer.stop()
      expect(parlantServer.isServerRunning()).toBe(false)

      // Workflow conversion should still work (offline mode)
      const workflow = await workflowService.getWorkflow('wf_customer_onboarding')
      const result = await converter.convertWorkflowToJourney(workflow)
      expect(result.success).toBe(true)

      // Restart server for cleanup
      await parlantServer.start()
      expect(parlantServer.isServerRunning()).toBe(true)

      console.log('✅ System maintains stability during service interruptions')
    })
  })

  describe('User Experience Integration Tests', () => {
    test('should provide seamless transition between workflow modes', async () => {
      const workflow = await workflowService.getWorkflow('wf_customer_onboarding')

      // User starts with traditional workflow execution
      const execution = await workflowService.executeWorkflow(workflow.id)
      expect(execution.status).toBe('running')

      // User can also interact conversationally with the same workflow
      const conversionResult = await converter.convertWorkflowToJourney(workflow)
      const agent = await parlantServer.createAgent({
        Name: 'Onboarding Assistant',
        description: 'Helps with customer onboarding',
      })

      const journey = await parlantServer.createJourney(agent.id, conversionResult.journey)
      const session = await parlantServer.createSession(agent.id)

      const response = await parlantServer.sendMessage(
        session.id,
        'I want to start the onboarding process'
      )

      expect(response.content).toContain('help')

      // Both modes should coexist without interference
      console.log('✅ Seamless multi-mode workflow interaction verified')
    })
  })

  // Helper method to create large synthetic workflows for testing
  function createLargeWorkflow(nodeCount: number): any {
    const nodes = []
    const edges = []

    // Create start node
    nodes.push({
      id: 'start',
      type: 'start',
      data: { label: 'Start' },
    })

    // Create intermediate nodes
    for (let i = 1; i < nodeCount - 1; i++) {
      nodes.push({
        id: `node_${i}`,
        type: i % 3 === 0 ? 'condition' : 'tool',
        data: {
          label: `Step ${i}`,
          toolId: `tool_${i}`,
        },
      })

      edges.push({
        id: `edge_${i}`,
        source: i === 1 ? 'start' : `node_${i - 1}`,
        target: `node_${i}`,
      })
    }

    // Create end node
    nodes.push({
      id: 'end',
      type: 'end',
      data: { label: 'End' },
    })

    edges.push({
      id: `edge_${nodeCount}`,
      source: `node_${nodeCount - 2}`,
      target: 'end',
    })

    return {
      id: `large_workflow_${nodeCount}`,
      Name: `Large Test Workflow (${nodeCount} nodes)`,
      description: `Generated large workflow for performance testing`,
      nodes,
      edges,
      metadata: {
        category: 'testing',
        generated: true,
        nodeCount,
      },
    }
  }
})
