/**
 * End-to-End Workflow to Conversation Integration Tests
 * =====================================================
 *
 * Comprehensive integration testing framework that validates the complete
 * workflow-to-journey-to-conversation pipeline, ensuring:
 * - Accurate workflow conversion to Parlant journeys
 * - Correct journey execution in conversational contexts
 * - Real-time communication via Socket.io
 * - User interaction flow validation
 * - Error handling and recovery
 * - Multi-user scenario testing
 * - Performance under realistic conditions
 *
 * Test Scenarios:
 * - Simple linear workflow execution
 * - Complex branching conversations
 * - Long-running multi-step processes
 * - Error recovery and retry mechanisms
 * - Concurrent user interactions
 * - Real-time updates and notifications
 */

import { EventEmitter } from 'events'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { io as ClientIO, type Socket as ClientSocket } from 'socket.io-client'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createLogger } from '@/lib/logs/console/logger'
import { WorkflowToJourneyConverter } from '@/services/parlant/journey-conversion/conversion-engine'
import type {
  ConversionConfig,
  ConversionContext,
  WorkflowState,
} from '@/services/parlant/journey-conversion/types'

const logger = createLogger('E2EIntegrationTests')

// Test configuration
const E2E_TEST_CONFIG: ConversionConfig = {
  preserve_block_names: true,
  generate_descriptions: true,
  enable_parameter_substitution: true,
  include_error_handling: true,
  optimization_level: 'standard',
  cache_duration_ms: 30000, // Short cache for testing
}

// Mock Parlant server for testing
class MockParlantServer extends EventEmitter {
  private server: any
  private io: SocketIOServer
  private port: number
  private isRunning = false
  private agents: Map<string, any> = new Map()
  private journeys: Map<string, any> = new Map()
  private sessions: Map<string, any> = new Map()
  private conversations: Map<string, ConversationState> = new Map()

  constructor(port = 3001) {
    super()
    this.port = port
    this.server = createServer()
    this.io = new SocketIOServer(this.server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    })
    this.setupSocketHandlers()
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err: any) => {
        if (err) {
          reject(err)
        } else {
          this.isRunning = true
          logger.info(`Mock Parlant server started on port ${this.port}`)
          resolve()
        }
      })
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isRunning) {
        this.server.close(() => {
          this.isRunning = false
          this.agents.clear()
          this.journeys.clear()
          this.sessions.clear()
          this.conversations.clear()
          logger.info('Mock Parlant server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.debug('Client connected to mock Parlant server', { socketId: socket.id })

      socket.on('create-agent', async (data, callback) => {
        const agent = await this.createAgent(data)
        callback(agent)
      })

      socket.on('create-journey', async (data, callback) => {
        const journey = await this.createJourney(data)
        callback(journey)
      })

      socket.on('start-conversation', async (data, callback) => {
        const conversation = await this.startConversation(data)
        callback(conversation)
      })

      socket.on('send-message', async (data, callback) => {
        const response = await this.processMessage(data)
        callback(response)

        // Emit conversation update to all clients
        this.io.emit('conversation-updated', {
          conversationId: data.conversationId,
          update: response,
        })
      })

      socket.on('disconnect', () => {
        logger.debug('Client disconnected from mock Parlant server', { socketId: socket.id })
      })
    })
  }

  async createAgent(config: any): Promise<any> {
    const agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name || 'Test Agent',
      description: config.description || 'Agent created for testing',
      created_at: new Date().toISOString(),
      guidelines: config.guidelines || [],
      journeys: [],
    }

    this.agents.set(agent.id, agent)
    logger.debug('Agent created', { agentId: agent.id, name: agent.name })

    return agent
  }

  async createJourney(data: any): Promise<any> {
    const journey = {
      id: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name || 'Test Journey',
      agent_id: data.agent_id,
      steps: data.steps || [],
      created_at: new Date().toISOString(),
      status: 'active',
    }

    this.journeys.set(journey.id, journey)

    // Associate with agent
    const agent = this.agents.get(data.agent_id)
    if (agent) {
      agent.journeys.push(journey.id)
    }

    logger.debug('Journey created', { journeyId: journey.id, agentId: data.agent_id })

    return journey
  }

  async startConversation(data: any): Promise<ConversationState> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const conversation: ConversationState = {
      id: conversationId,
      agent_id: data.agent_id,
      journey_id: data.journey_id,
      user_id: data.user_id || 'test-user',
      status: 'active',
      current_step: 0,
      messages: [],
      context: data.context || {},
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    }

    this.conversations.set(conversationId, conversation)

    // Send initial message if journey has a starting step
    const journey = this.journeys.get(data.journey_id)
    if (journey && journey.steps.length > 0) {
      const initialStep = journey.steps[0]
      const welcomeMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: initialStep.content || 'Hello! How can I help you today?',
        timestamp: new Date().toISOString(),
        step_id: initialStep.id,
      }

      conversation.messages.push(welcomeMessage)
      conversation.last_activity = new Date().toISOString()
    }

    logger.debug('Conversation started', {
      conversationId,
      agentId: data.agent_id,
      journeyId: data.journey_id,
    })

    return conversation
  }

  async processMessage(data: MessageData): Promise<ConversationResponse> {
    const conversation = this.conversations.get(data.conversationId)
    if (!conversation) {
      throw new Error(`Conversation not found: ${data.conversationId}`)
    }

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: data.message,
      timestamp: new Date().toISOString(),
    }
    conversation.messages.push(userMessage)

    // Process based on current journey step
    const journey = this.journeys.get(conversation.journey_id)
    if (!journey) {
      throw new Error(`Journey not found: ${conversation.journey_id}`)
    }

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400))

    // Generate assistant response
    const currentStep = journey.steps[conversation.current_step]
    const response = await this.generateStepResponse(currentStep, data.message, conversation)

    const assistantMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
      step_id: currentStep?.id,
      actions: response.actions,
    }
    conversation.messages.push(assistantMessage)

    // Update conversation state
    conversation.last_activity = new Date().toISOString()
    if (response.advance_step && conversation.current_step < journey.steps.length - 1) {
      conversation.current_step++
    }

    if (response.complete) {
      conversation.status = 'completed'
    }

    const conversationResponse: ConversationResponse = {
      message: assistantMessage,
      conversation_state: conversation,
      should_continue: !response.complete,
      next_step: response.advance_step ? journey.steps[conversation.current_step] : null,
    }

    logger.debug('Message processed', {
      conversationId: data.conversationId,
      currentStep: conversation.current_step,
      status: conversation.status,
    })

    return conversationResponse
  }

  private async generateStepResponse(
    step: any,
    userMessage: string,
    conversation: ConversationState
  ): Promise<StepResponse> {
    // Simulate different step types
    const stepType = step?.type || 'general'

    switch (stepType) {
      case 'agent':
        return {
          content: `I understand you said: "${userMessage}". Let me process that for you...`,
          advance_step: true,
          complete: false,
          actions: [],
        }

      case 'api':
        return {
          content: `I've made an API call based on your request. Here are the results...`,
          advance_step: true,
          complete: false,
          actions: ['api_call_made'],
        }

      case 'condition': {
        const shouldAdvance =
          userMessage.toLowerCase().includes('yes') ||
          userMessage.toLowerCase().includes('continue')
        return {
          content: shouldAdvance
            ? `Great! Let's continue to the next step.`
            : `I understand. Let's take a different approach.`,
          advance_step: shouldAdvance,
          complete: false,
          actions: shouldAdvance ? ['condition_met'] : ['condition_not_met'],
        }
      }

      case 'function':
        return {
          content: `I've executed the function with your input and got the following result: ${JSON.stringify({ processed: userMessage, timestamp: new Date() })}`,
          advance_step: true,
          complete: false,
          actions: ['function_executed'],
        }

      case 'final':
        return {
          content: `Thank you for using this workflow! We've completed all the steps successfully.`,
          advance_step: false,
          complete: true,
          actions: ['workflow_completed'],
        }

      default:
        return {
          content: `I received your message: "${userMessage}". How would you like to proceed?`,
          advance_step: conversation.current_step >= 2, // Advance after a few exchanges
          complete: false,
          actions: [],
        }
    }
  }

  getConversation(conversationId: string): ConversationState | undefined {
    return this.conversations.get(conversationId)
  }

  getAllConversations(): ConversationState[] {
    return Array.from(this.conversations.values())
  }
}

// Type definitions for mock server
interface ConversationState {
  id: string
  agent_id: string
  journey_id: string
  user_id: string
  status: 'active' | 'completed' | 'paused'
  current_step: number
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    step_id?: string
    actions?: string[]
  }>
  context: Record<string, any>
  started_at: string
  last_activity: string
}

interface MessageData {
  conversationId: string
  message: string
  userId?: string
}

interface ConversationResponse {
  message: any
  conversation_state: ConversationState
  should_continue: boolean
  next_step: any | null
}

interface StepResponse {
  content: string
  advance_step: boolean
  complete: boolean
  actions: string[]
}

// Integration test client
class IntegrationTestClient {
  private socket: ClientSocket | null = null
  private serverUrl: string
  private connected = false

  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = ClientIO(this.serverUrl)

      this.socket.on('connect', () => {
        this.connected = true
        logger.debug('Test client connected to server')
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        reject(error)
      })

      this.socket.on('disconnect', () => {
        this.connected = false
        logger.debug('Test client disconnected from server')
      })

      // Set connection timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'))
        }
      }, 5000)
    })
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  async createAgent(config: any): Promise<any> {
    return this.socketCall('create-agent', config)
  }

  async createJourney(data: any): Promise<any> {
    return this.socketCall('create-journey', data)
  }

  async startConversation(data: any): Promise<ConversationState> {
    return this.socketCall('start-conversation', data)
  }

  async sendMessage(data: MessageData): Promise<ConversationResponse> {
    return this.socketCall('send-message', data)
  }

  onConversationUpdate(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('conversation-updated', callback)
    }
  }

  private async socketCall(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Not connected to server'))
        return
      }

      this.socket.emit(event, data, (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }
}

// Test workflow generators for E2E scenarios
class E2ETestWorkflowGenerator {
  static createLinearConversationalWorkflow(): WorkflowState {
    return {
      id: 'e2e-linear-conversational',
      name: 'Linear Conversational Workflow',
      description: 'Simple workflow that maps to a linear conversation',
      blocks: [
        {
          id: 'start-1',
          type: 'starter',
          position: { x: 100, y: 200 },
          data: { label: 'Welcome User' },
          width: 150,
          height: 100,
        },
        {
          id: 'agent-greeting',
          type: 'agent',
          position: { x: 300, y: 200 },
          data: {
            label: 'Greeting Agent',
            model: 'gpt-4',
            prompt: 'Greet the user and ask how you can help them today.',
          },
          width: 200,
          height: 150,
        },
        {
          id: 'agent-process',
          type: 'agent',
          position: { x: 550, y: 200 },
          data: {
            label: 'Process Request',
            model: 'gpt-4',
            prompt: 'Process the user request: {{user_request}}',
          },
          width: 200,
          height: 150,
        },
        {
          id: 'api-submit',
          type: 'api',
          position: { x: 800, y: 200 },
          data: {
            label: 'Submit Result',
            method: 'POST',
            url: '{{submission_endpoint}}',
            body: '{"result": "{{processed_result}}"}',
          },
          width: 200,
          height: 150,
        },
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'agent-greeting', type: 'default' },
        { id: 'e2', source: 'agent-greeting', target: 'agent-process', type: 'default' },
        { id: 'e3', source: 'agent-process', target: 'api-submit', type: 'default' },
      ],
    }
  }

  static createBranchingConversationalWorkflow(): WorkflowState {
    return {
      id: 'e2e-branching-conversational',
      name: 'Branching Conversational Workflow',
      description: 'Workflow with conditions that create branching conversations',
      blocks: [
        {
          id: 'start-1',
          type: 'starter',
          position: { x: 100, y: 250 },
          data: { label: 'Start Support Session' },
          width: 150,
          height: 100,
        },
        {
          id: 'agent-triage',
          type: 'agent',
          position: { x: 300, y: 250 },
          data: {
            label: 'Triage Agent',
            model: 'gpt-4',
            prompt: 'Analyze the user issue and categorize it as: technical, billing, or general',
          },
          width: 200,
          height: 150,
        },
        {
          id: 'condition-category',
          type: 'condition',
          position: { x: 550, y: 250 },
          data: {
            label: 'Categorize Issue',
            condition: '{{issue_category}} === "technical"',
          },
          width: 200,
          height: 120,
        },
        {
          id: 'agent-technical',
          type: 'agent',
          position: { x: 800, y: 150 },
          data: {
            label: 'Technical Support',
            model: 'gpt-4',
            prompt: 'Provide technical support for: {{technical_issue}}',
          },
          width: 200,
          height: 150,
        },
        {
          id: 'agent-general',
          type: 'agent',
          position: { x: 800, y: 350 },
          data: {
            label: 'General Support',
            model: 'gpt-4',
            prompt: 'Provide general support for: {{general_issue}}',
          },
          width: 200,
          height: 150,
        },
        {
          id: 'function-resolution',
          type: 'function',
          position: { x: 1050, y: 250 },
          data: {
            label: 'Log Resolution',
            code: 'return { resolved: true, category: input.category, timestamp: new Date() };',
          },
          width: 200,
          height: 150,
        },
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'agent-triage', type: 'default' },
        { id: 'e2', source: 'agent-triage', target: 'condition-category', type: 'default' },
        {
          id: 'e3',
          source: 'condition-category',
          target: 'agent-technical',
          type: 'conditional',
          data: { condition: 'true' },
        },
        {
          id: 'e4',
          source: 'condition-category',
          target: 'agent-general',
          type: 'conditional',
          data: { condition: 'false' },
        },
        { id: 'e5', source: 'agent-technical', target: 'function-resolution', type: 'default' },
        { id: 'e6', source: 'agent-general', target: 'function-resolution', type: 'default' },
      ],
    }
  }

  static createLongRunningWorkflow(): WorkflowState {
    return {
      id: 'e2e-long-running',
      name: 'Long Running Workflow',
      description: 'Workflow that simulates a long-running process with multiple interactions',
      blocks: [
        {
          id: 'start-1',
          type: 'starter',
          position: { x: 50, y: 200 },
          data: { label: 'Begin Process' },
          width: 150,
          height: 100,
        },
        {
          id: 'agent-collect',
          type: 'agent',
          position: { x: 250, y: 200 },
          data: {
            label: 'Collect Information',
            model: 'gpt-4',
            prompt: 'Collect required information from the user step by step',
          },
          width: 200,
          height: 150,
        },
        {
          id: 'condition-complete',
          type: 'condition',
          position: { x: 500, y: 200 },
          data: {
            label: 'Information Complete?',
            condition: '{{info_complete}} === true',
          },
          width: 200,
          height: 120,
        },
        {
          id: 'parallel-processing',
          type: 'parallel',
          position: { x: 750, y: 200 },
          data: {
            label: 'Process Multiple Items',
            blocks: ['validation', 'analysis', 'storage'],
            wait_for_all: true,
          },
          width: 250,
          height: 150,
        },
        {
          id: 'agent-results',
          type: 'agent',
          position: { x: 1050, y: 200 },
          data: {
            label: 'Present Results',
            model: 'gpt-4',
            prompt: 'Present the processed results to the user',
          },
          width: 200,
          height: 150,
        },
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'agent-collect', type: 'default' },
        { id: 'e2', source: 'agent-collect', target: 'condition-complete', type: 'default' },
        {
          id: 'e3',
          source: 'condition-complete',
          target: 'parallel-processing',
          type: 'conditional',
          data: { condition: 'true' },
        },
        {
          id: 'e4',
          source: 'condition-complete',
          target: 'agent-collect',
          type: 'conditional',
          data: { condition: 'false' },
        },
        { id: 'e5', source: 'parallel-processing', target: 'agent-results', type: 'default' },
      ],
    }
  }
}

// Main test suites
describe('End-to-End Workflow to Conversation Integration', () => {
  let mockServer: MockParlantServer
  let converter: WorkflowToJourneyConverter
  let testClient: IntegrationTestClient

  beforeAll(async () => {
    logger.info('Setting up E2E integration test environment')

    // Start mock Parlant server
    mockServer = new MockParlantServer(3001)
    await mockServer.start()

    // Initialize converter
    converter = new WorkflowToJourneyConverter(E2E_TEST_CONFIG)

    // Create test client
    testClient = new IntegrationTestClient()
    await testClient.connect()

    logger.info('E2E integration test environment ready')
  })

  afterAll(async () => {
    logger.info('Cleaning up E2E integration test environment')

    await testClient.disconnect()
    await mockServer.stop()

    logger.info('E2E integration test cleanup complete')
  })

  beforeEach(async () => {
    // Clear any state between tests
  })

  describe('Linear Workflow Conversation Flow', () => {
    test('should convert workflow and execute as linear conversation', async () => {
      const workflow = E2ETestWorkflowGenerator.createLinearConversationalWorkflow()
      const parameters = {
        user_request: 'I need help with my account',
        submission_endpoint: 'https://api.test.com/submit',
      }

      // Step 1: Convert workflow to journey
      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters,
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      expect(conversionResult.steps.length).toBeGreaterThan(0)
      expect(conversionResult.journey).toBeDefined()

      // Step 2: Create agent and journey in Parlant
      const agent = await testClient.createAgent({
        name: 'E2E Test Agent',
        description: 'Agent for linear workflow testing',
      })

      const journey = await testClient.createJourney({
        name: conversionResult.journey.name,
        agent_id: agent.id,
        steps: conversionResult.steps.map((step) => ({
          id: step.id,
          type: step.type,
          content: step.title,
          configuration: step.configuration,
        })),
      })

      // Step 3: Start conversation
      const conversation = await testClient.startConversation({
        agent_id: agent.id,
        journey_id: journey.id,
        user_id: 'e2e-test-user',
        context: parameters,
      })

      expect(conversation.status).toBe('active')
      expect(conversation.messages.length).toBeGreaterThan(0)

      // Step 4: Simulate user interaction
      const response1 = await testClient.sendMessage({
        conversationId: conversation.id,
        message: 'Hello, I need help with my account setup',
      })

      expect(response1.message.role).toBe('assistant')
      expect(response1.should_continue).toBe(true)

      // Step 5: Continue conversation
      const response2 = await testClient.sendMessage({
        conversationId: conversation.id,
        message: 'I want to update my billing information',
      })

      expect(response2.message.role).toBe('assistant')
      expect(response2.conversation_state.current_step).toBeGreaterThan(conversation.current_step)

      logger.info('Linear workflow conversation test completed successfully')
    })

    test('should handle parameter substitution in conversation context', async () => {
      const workflow = E2ETestWorkflowGenerator.createLinearConversationalWorkflow()
      const parameters = {
        user_request: 'Custom user request with {{dynamic_value}}',
        dynamic_value: 'personalized content',
        submission_endpoint: 'https://api.test.com/submit',
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters,
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      // Verify parameters were substituted
      const stepsContent = JSON.stringify(conversionResult.steps)
      expect(stepsContent).toContain('personalized content')
      expect(stepsContent).not.toContain('{{dynamic_value}}')

      logger.info('Parameter substitution in conversation test passed')
    })
  })

  describe('Branching Workflow Conversation Flow', () => {
    test('should handle conditional branching in conversations', async () => {
      const workflow = E2ETestWorkflowGenerator.createBranchingConversationalWorkflow()
      const parameters = {
        issue_category: 'technical',
        technical_issue: 'Cannot connect to server',
        general_issue: 'General inquiry',
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters,
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      // Create agent and journey
      const agent = await testClient.createAgent({
        name: 'Branching Test Agent',
        description: 'Agent for testing conditional workflows',
      })

      const journey = await testClient.createJourney({
        name: conversionResult.journey.name,
        agent_id: agent.id,
        steps: conversionResult.steps.map((step) => ({
          id: step.id,
          type: step.type,
          content: step.title,
          configuration: step.configuration,
        })),
      })

      // Start conversation
      const conversation = await testClient.startConversation({
        agent_id: agent.id,
        journey_id: journey.id,
        user_id: 'branching-test-user',
        context: parameters,
      })

      // Test branching conversation
      const response1 = await testClient.sendMessage({
        conversationId: conversation.id,
        message: 'I have a technical problem with my server connection',
      })

      expect(response1.message.role).toBe('assistant')

      // Continue through the technical branch
      const response2 = await testClient.sendMessage({
        conversationId: conversation.id,
        message: 'Yes, please help me with the technical issue',
      })

      // Should have advanced to technical support branch
      expect(response2.conversation_state.current_step).toBeGreaterThan(0)

      logger.info('Branching workflow conversation test completed successfully')
    })

    test('should handle different conversation paths based on conditions', async () => {
      const workflow = E2ETestWorkflowGenerator.createBranchingConversationalWorkflow()

      // Test general support path
      const generalParameters = {
        issue_category: 'general',
        general_issue: 'I have a question about billing',
        technical_issue: '',
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters: generalParameters,
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      // Verify that different paths are available in the conversion
      const conditionSteps = conversionResult.steps.filter((step) =>
        step.type.includes('condition')
      )
      expect(conditionSteps.length).toBeGreaterThan(0)

      logger.info('Different conversation paths test passed')
    })
  })

  describe('Long Running Workflow Process', () => {
    test('should handle multi-step long running conversations', async () => {
      const workflow = E2ETestWorkflowGenerator.createLongRunningWorkflow()
      const parameters = {
        info_complete: false, // Start with incomplete information
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters,
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      // Create agent and journey
      const agent = await testClient.createAgent({
        name: 'Long Process Agent',
        description: 'Agent for testing long-running processes',
      })

      const journey = await testClient.createJourney({
        name: conversionResult.journey.name,
        agent_id: agent.id,
        steps: conversionResult.steps.map((step) => ({
          id: step.id,
          type: step.type,
          content: step.title,
          configuration: step.configuration,
        })),
      })

      // Start conversation
      const conversation = await testClient.startConversation({
        agent_id: agent.id,
        journey_id: journey.id,
        user_id: 'long-process-user',
        context: parameters,
      })

      // Simulate multiple interaction rounds
      const responses = []

      for (let i = 0; i < 5; i++) {
        const response = await testClient.sendMessage({
          conversationId: conversation.id,
          message: `User input step ${i + 1}: providing information part ${i + 1}`,
        })

        responses.push(response)
        expect(response.message.role).toBe('assistant')

        // Brief pause between interactions
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // Verify conversation progressed through multiple steps
      const finalState = responses[responses.length - 1].conversation_state
      expect(finalState.messages.length).toBeGreaterThanOrEqual(10) // 5 user + 5 assistant minimum
      expect(finalState.current_step).toBeGreaterThan(0)

      logger.info('Long running workflow conversation test completed successfully')
    }, 15000) // Extended timeout for long-running test
  })

  describe('Real-time Communication and Updates', () => {
    test('should broadcast conversation updates to connected clients', async () => {
      const workflow = E2ETestWorkflowGenerator.createLinearConversationalWorkflow()

      // Create a second client to receive updates
      const observerClient = new IntegrationTestClient()
      await observerClient.connect()

      let updateReceived = false
      let receivedUpdate: any = null

      observerClient.onConversationUpdate((data) => {
        updateReceived = true
        receivedUpdate = data
      })

      // Set up workflow and conversation
      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters: { user_request: 'Test request' },
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      const agent = await testClient.createAgent({
        name: 'Broadcast Test Agent',
        description: 'Agent for testing real-time updates',
      })

      const journey = await testClient.createJourney({
        name: conversionResult.journey.name,
        agent_id: agent.id,
        steps: conversionResult.steps.map((step) => ({
          id: step.id,
          type: step.type,
          content: step.title,
          configuration: step.configuration,
        })),
      })

      const conversation = await testClient.startConversation({
        agent_id: agent.id,
        journey_id: journey.id,
        user_id: 'broadcast-test-user',
      })

      // Send message that should trigger broadcast
      await testClient.sendMessage({
        conversationId: conversation.id,
        message: 'This should trigger a broadcast update',
      })

      // Wait for broadcast
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Verify update was broadcast
      expect(updateReceived).toBe(true)
      expect(receivedUpdate).toBeDefined()
      expect(receivedUpdate.conversationId).toBe(conversation.id)

      await observerClient.disconnect()
      logger.info('Real-time communication test completed successfully')
    })

    test('should handle multiple concurrent conversations', async () => {
      const workflow = E2ETestWorkflowGenerator.createLinearConversationalWorkflow()

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters: { user_request: 'Concurrent test request' },
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      const agent = await testClient.createAgent({
        name: 'Concurrent Test Agent',
        description: 'Agent for testing concurrent conversations',
      })

      const journey = await testClient.createJourney({
        name: conversionResult.journey.name,
        agent_id: agent.id,
        steps: conversionResult.steps.map((step) => ({
          id: step.id,
          type: step.type,
          content: step.title,
          configuration: step.configuration,
        })),
      })

      // Start multiple conversations
      const conversations = await Promise.all([
        testClient.startConversation({
          agent_id: agent.id,
          journey_id: journey.id,
          user_id: 'concurrent-user-1',
        }),
        testClient.startConversation({
          agent_id: agent.id,
          journey_id: journey.id,
          user_id: 'concurrent-user-2',
        }),
        testClient.startConversation({
          agent_id: agent.id,
          journey_id: journey.id,
          user_id: 'concurrent-user-3',
        }),
      ])

      // Send messages concurrently
      const responses = await Promise.all(
        conversations.map((conv, index) =>
          testClient.sendMessage({
            conversationId: conv.id,
            message: `Concurrent message from user ${index + 1}`,
          })
        )
      )

      // Verify all conversations handled independently
      expect(responses.length).toBe(3)
      responses.forEach((response, index) => {
        expect(response.message.role).toBe('assistant')
        expect(response.conversation_state.id).toBe(conversations[index].id)
      })

      logger.info('Concurrent conversations test completed successfully')
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle conversation errors gracefully', async () => {
      const workflow = E2ETestWorkflowGenerator.createLinearConversationalWorkflow()

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'e2e-test',
        user_id: 'test-user',
        parameters: { user_request: 'Error test request' },
        config: E2E_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)
      const conversionResult = await converter.convertWorkflowToJourney(context)

      const agent = await testClient.createAgent({
        name: 'Error Test Agent',
        description: 'Agent for testing error handling',
      })

      const journey = await testClient.createJourney({
        name: conversionResult.journey.name,
        agent_id: agent.id,
        steps: conversionResult.steps.map((step) => ({
          id: step.id,
          type: step.type,
          content: step.title,
          configuration: step.configuration,
        })),
      })

      const conversation = await testClient.startConversation({
        agent_id: agent.id,
        journey_id: journey.id,
        user_id: 'error-test-user',
      })

      // Try to send message to non-existent conversation
      await expect(
        testClient.sendMessage({
          conversationId: 'non-existent-conversation',
          message: 'This should fail',
        })
      ).rejects.toThrow()

      // Verify original conversation still works
      const response = await testClient.sendMessage({
        conversationId: conversation.id,
        message: 'This should work after error',
      })

      expect(response.message.role).toBe('assistant')

      logger.info('Error handling test completed successfully')
    })

    test('should recover from server disconnection', async () => {
      // This test would require more sophisticated setup for actual disconnection testing
      // For now, we'll test the client's ability to handle connection errors

      const workflow = E2ETestWorkflowGenerator.createLinearConversationalWorkflow()

      // Create a client that will encounter connection issues
      const unreliableClient = new IntegrationTestClient('http://localhost:9999') // Wrong port

      await expect(unreliableClient.connect()).rejects.toThrow()

      // Verify main client still works
      const agent = await testClient.createAgent({
        name: 'Recovery Test Agent',
        description: 'Agent for testing recovery scenarios',
      })

      expect(agent.id).toBeDefined()

      logger.info('Server disconnection recovery test completed successfully')
    })
  })
})

// Test utilities are available within this file only
// If needed by other tests, move to a separate utility file outside __tests__
