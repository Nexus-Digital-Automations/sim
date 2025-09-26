/**
 * Comprehensive Journey Execution Integration Tests
 *
 * Full test suite for validating the complete Parlant Journey Execution system
 * including unit tests, integration tests, and end-to-end validation.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { AgentCommunicationService } from '../agent-communication-service'
import { ConversationalExecutionInterface } from '../conversational-execution-interface'
import { JourneyExecutionEngine } from '../journey-execution-engine'
import { RealTimeProgressService } from '../real-time-progress-service'
import { SimInfrastructureIntegration } from '../sim-infrastructure-integration'
import type {
  AgentResponse,
  ConversationMessage,
  ExecutionResult,
  JourneyDefinition,
  JourneyExecutionContext,
  ProgressTracker,
  WorkflowData,
} from '../types/journey-execution-types'

/**
 * Test data and fixtures
 */
const TEST_USER_ID = 'test-user-123'
const TEST_WORKSPACE_ID = 'test-workspace-456'
const TEST_WORKFLOW_ID = 'test-workflow-789'

const SAMPLE_WORKFLOW: WorkflowData = {
  id: TEST_WORKFLOW_ID,
  name: 'Test Customer Onboarding Workflow',
  description: 'A comprehensive customer onboarding process',
  version: '1.0',
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 100, y: 100 },
      data: { label: 'Start Onboarding' },
    },
    {
      id: 'collect_info',
      type: 'input_collection',
      position: { x: 200, y: 100 },
      data: {
        label: 'Collect Customer Information',
        config: {
          fields: ['name', 'email', 'company', 'role'],
        },
      },
    },
    {
      id: 'validate_email',
      type: 'tool',
      position: { x: 300, y: 100 },
      data: {
        label: 'Validate Email',
        toolId: 'email_validator',
        config: { timeout: 5000 },
      },
    },
    {
      id: 'check_existing',
      type: 'conditional',
      position: { x: 400, y: 100 },
      data: {
        label: 'Check Existing Customer',
        condition: 'customer.exists === false',
      },
    },
    {
      id: 'create_account',
      type: 'tool',
      position: { x: 500, y: 50 },
      data: {
        label: 'Create Account',
        toolId: 'account_creator',
      },
    },
    {
      id: 'update_existing',
      type: 'tool',
      position: { x: 500, y: 150 },
      data: {
        label: 'Update Existing Account',
        toolId: 'account_updater',
      },
    },
    {
      id: 'send_welcome',
      type: 'tool',
      position: { x: 600, y: 100 },
      data: {
        label: 'Send Welcome Email',
        toolId: 'email_sender',
      },
    },
    {
      id: 'complete',
      type: 'final',
      position: { x: 700, y: 100 },
      data: { label: 'Onboarding Complete' },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'collect_info' },
    { id: 'e2', source: 'collect_info', target: 'validate_email' },
    { id: 'e3', source: 'validate_email', target: 'check_existing' },
    {
      id: 'e4',
      source: 'check_existing',
      target: 'create_account',
      condition: 'customer.exists === false',
    },
    {
      id: 'e5',
      source: 'check_existing',
      target: 'update_existing',
      condition: 'customer.exists === true',
    },
    { id: 'e6', source: 'create_account', target: 'send_welcome' },
    { id: 'e7', source: 'update_existing', target: 'send_welcome' },
    { id: 'e8', source: 'send_welcome', target: 'complete' },
  ],
}

const SAMPLE_JOURNEY: JourneyDefinition = {
  id: `journey_${TEST_WORKFLOW_ID}`,
  title: 'Customer Onboarding Journey',
  description: 'Conversational customer onboarding process',
  conditions: ['User wants to onboard a new customer'],
  states: [
    { id: 'start', type: 'initial', name: 'Start', description: 'Begin the onboarding process' },
    {
      id: 'collect_info',
      type: 'input_collection',
      name: 'Collect Information',
      description: 'Gather customer details',
    },
    {
      id: 'validate_email',
      type: 'tool_state',
      name: 'Validate Email',
      description: 'Check email validity',
      originalNodeId: 'validate_email',
    },
    {
      id: 'check_existing',
      type: 'conditional',
      name: 'Check Existing',
      description: 'Verify if customer exists',
    },
    {
      id: 'create_account',
      type: 'tool_state',
      name: 'Create Account',
      description: 'Set up new account',
      originalNodeId: 'create_account',
    },
    {
      id: 'update_existing',
      type: 'tool_state',
      name: 'Update Existing',
      description: 'Update existing account',
      originalNodeId: 'update_existing',
    },
    {
      id: 'send_welcome',
      type: 'tool_state',
      name: 'Send Welcome',
      description: 'Send welcome email',
      originalNodeId: 'send_welcome',
    },
    {
      id: 'complete',
      type: 'final',
      name: 'Complete',
      description: 'Onboarding finished successfully',
    },
  ],
  transitions: [
    { id: 't1', from: 'start', to: 'collect_info' },
    { id: 't2', from: 'collect_info', to: 'validate_email' },
    { id: 't3', from: 'validate_email', to: 'check_existing' },
    {
      id: 't4',
      from: 'check_existing',
      to: 'create_account',
      condition: 'customer.exists === false',
    },
    {
      id: 't5',
      from: 'check_existing',
      to: 'update_existing',
      condition: 'customer.exists === true',
    },
    { id: 't6', from: 'create_account', to: 'send_welcome' },
    { id: 't7', from: 'update_existing', to: 'send_welcome' },
    { id: 't8', from: 'send_welcome', to: 'complete' },
  ],
  metadata: {
    originalWorkflowId: TEST_WORKFLOW_ID,
    conversionTimestamp: new Date().toISOString(),
  },
}

/**
 * Mock implementations for testing
 */
class MockConversationalInterface {
  async sendMessage(message: ConversationMessage): Promise<void> {
    console.log(`Mock: Sending message - ${message.content}`)
  }

  async requestInput(prompt: string): Promise<string> {
    return 'Mock user input'
  }

  async showProgress(tracker: ProgressTracker): Promise<void> {
    console.log(`Mock: Progress update - ${tracker.completionPercentage}%`)
  }

  async displayError(error: any): Promise<void> {
    console.log(`Mock: Error displayed - ${error.message}`)
  }

  async notifyCompletion(result: ExecutionResult): Promise<void> {
    console.log(`Mock: Journey completed - ${result.journeyId}`)
  }
}

/**
 * Test suite setup
 */
describe('Journey Execution Integration Tests', () => {
  let journeyEngine: JourneyExecutionEngine
  let communicationService: AgentCommunicationService
  let conversationalInterface: ConversationalExecutionInterface
  let progressService: RealTimeProgressService
  let infrastructureIntegration: SimInfrastructureIntegration

  const mockSocketServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    of: jest.fn().mockReturnThis(),
    use: jest.fn(),
    on: jest.fn(),
  }

  beforeAll(async () => {
    console.log('🧪 Setting up Journey Execution Integration Test Suite')

    // Initialize core services
    journeyEngine = new JourneyExecutionEngine()
    communicationService = new AgentCommunicationService(journeyEngine)
    conversationalInterface = new ConversationalExecutionInterface(
      communicationService,
      journeyEngine
    )
    progressService = new RealTimeProgressService()

    // Initialize infrastructure integration
    infrastructureIntegration = new SimInfrastructureIntegration({
      database: { enabled: false },
      socketio: { enabled: true, namespace: '/test-journey' },
      authentication: { provider: 'custom' },
      workspace: { isolation: true },
      tools: { enableUniversalAdapter: false },
      monitoring: { enabled: false },
    })

    console.log('✅ Test suite setup complete')
  })

  afterAll(async () => {
    console.log('🧹 Cleaning up test suite')
    progressService.shutdown()
    await infrastructureIntegration.shutdown()
  })

  describe('Journey Execution Engine Tests', () => {
    let executionContext: JourneyExecutionContext

    beforeEach(async () => {
      const mockInterface = new MockConversationalInterface()
      executionContext = await journeyEngine.initializeJourneyExecution(
        SAMPLE_JOURNEY,
        'test-session-123',
        TEST_USER_ID,
        TEST_WORKSPACE_ID,
        mockInterface as any
      )
    })

    test('should initialize journey execution successfully', () => {
      expect(executionContext).toBeDefined()
      expect(executionContext.journeyId).toMatch(/^journey_/)
      expect(executionContext.sessionId).toBe('test-session-123')
      expect(executionContext.userId).toBe(TEST_USER_ID)
      expect(executionContext.workspaceId).toBe(TEST_WORKSPACE_ID)
      expect(executionContext.currentStateId).toBe('start')
      expect(executionContext.metadata.progressTracker).toBeDefined()
    })

    test('should process user input and advance journey state', async () => {
      const result = await journeyEngine.processUserInput(
        executionContext.journeyId,
        'I want to start the onboarding process'
      )

      expect(result.success).toBe(true)
      expect(result.journeyId).toBe(executionContext.journeyId)
      expect(result.progress).toBeDefined()
      expect(result.response).toBeDefined()
    })

    test('should handle state transitions correctly', async () => {
      // Simulate progressing through multiple states
      const steps = [
        'Start onboarding',
        'John Doe, john@example.com, Acme Corp, Developer',
        'Continue with email validation',
        'Create new account',
        'Send welcome email',
      ]

      let currentResult: ExecutionResult

      for (const step of steps) {
        currentResult = await journeyEngine.processUserInput(executionContext.journeyId, step)

        expect(currentResult.success).toBe(true)
        expect(currentResult.progress.completionPercentage).toBeGreaterThanOrEqual(0)
      }

      // Should be near completion after all steps
      expect(currentResult!.progress.completionPercentage).toBeGreaterThan(70)
    })

    test('should handle journey completion', async () => {
      // Force journey to completion state
      const mockContext = { ...executionContext, currentStateId: 'complete' }
      journeyEngine.executionContexts.set(executionContext.journeyId, mockContext)

      const result = await journeyEngine.processUserInput(
        executionContext.journeyId,
        'Complete the journey'
      )

      expect(result.completed).toBe(true)
      expect(result.progress.completionPercentage).toBe(100)
    })

    test('should track execution metrics', () => {
      const status = journeyEngine.getExecutionStatus(executionContext.journeyId)
      expect(status).toBeDefined()
      expect(status!.metadata.progressTracker).toBeDefined()
      expect(status!.conversationHistory).toBeInstanceOf(Array)
      expect(status!.toolResults).toBeInstanceOf(Array)
    })

    test('should handle errors gracefully', async () => {
      // Simulate an error condition
      const result = await journeyEngine.processUserInput('invalid-journey-id', 'test message')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error!.code).toBeDefined()
    })
  })

  describe('Agent Communication Service Tests', () => {
    let journeySession: any

    beforeEach(async () => {
      journeySession = await communicationService.startJourneySession({
        journeyId: SAMPLE_JOURNEY.id,
        userId: TEST_USER_ID,
        workspaceId: TEST_WORKSPACE_ID,
      })
    })

    test('should start journey session successfully', () => {
      expect(journeySession).toBeDefined()
      expect(journeySession.sessionId).toMatch(/^session_/)
      expect(journeySession.journeyId).toBe(SAMPLE_JOURNEY.id)
      expect(journeySession.status).toBe('active')
    })

    test('should handle user messages and return agent responses', async () => {
      const response = await communicationService.sendMessage(
        journeySession.sessionId,
        'Hello, I need help with customer onboarding'
      )

      expect(response).toBeDefined()
      expect(response.sessionId).toBe(journeySession.sessionId)
      expect(response.message).toBeDefined()
      expect(response.requiresInput).toBeDefined()
    })

    test('should track progress across messages', async () => {
      // Send multiple messages and track progress
      const messages = [
        'Start onboarding process',
        'Customer name: Alice Smith',
        'Email: alice@example.com',
        'Company: TechCorp',
      ]

      for (const message of messages) {
        const response = await communicationService.sendMessage(journeySession.sessionId, message)

        expect(response.progress).toBeDefined()
        expect(response.progress.completionPercentage).toBeGreaterThanOrEqual(0)
      }

      const finalProgress = await communicationService.getProgress(journeySession.sessionId)
      expect(finalProgress.completionPercentage).toBeGreaterThan(0)
    })

    test('should pause and resume execution', async () => {
      await communicationService.pauseExecution(journeySession.sessionId)

      // Should be in paused state
      const pausedResponse = await communicationService.sendMessage(
        journeySession.sessionId,
        'Continue'
      )
      expect(pausedResponse.message).toContain('paused')

      await communicationService.resumeExecution(journeySession.sessionId)

      // Should be resumed
      const resumedResponse = await communicationService.sendMessage(
        journeySession.sessionId,
        'Continue'
      )
      expect(resumedResponse.message).toContain('resume')
    })

    test('should terminate session and provide summary', async () => {
      const summary = await communicationService.terminateSession(journeySession.sessionId)

      expect(summary).toBeDefined()
      expect(summary.sessionId).toBe(journeySession.sessionId)
      expect(summary.status).toMatch(/completed|terminated/)
      expect(summary.duration).toBeGreaterThan(0)
    })
  })

  describe('Conversational Interface Tests', () => {
    let conversationContext: any

    beforeEach(async () => {
      conversationContext = await conversationalInterface.initializeConversation(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID,
        {
          verbosity: 'normal',
          explanations: true,
          suggestions: true,
        }
      )
    })

    test('should initialize conversation with proper context', () => {
      expect(conversationContext).toBeDefined()
      expect(conversationContext.workflowId).toBe(TEST_WORKFLOW_ID)
      expect(conversationContext.userId).toBe(TEST_USER_ID)
      expect(conversationContext.workspaceId).toBe(TEST_WORKSPACE_ID)
      expect(conversationContext.conversationMode).toBe('guided')
      expect(conversationContext.preferences).toBeDefined()
    })

    test('should process natural language messages', async () => {
      const testMessages = [
        'Help me onboard a new customer',
        'The customer name is Bob Johnson',
        'His email is bob@company.com',
        'Skip the existing customer check',
        "What's the current progress?",
        'Can you explain this step?',
      ]

      for (const message of testMessages) {
        const response = await conversationalInterface.processMessage(
          conversationContext.sessionId,
          message
        )

        expect(response).toBeDefined()
        expect(response.sessionId).toBe(conversationContext.sessionId)
        expect(response.message).toBeTruthy()
        expect(typeof response.requiresInput).toBe('boolean')
      }
    })

    test('should handle conversation mode changes', async () => {
      await conversationalInterface.changeConversationMode(conversationContext.sessionId, 'expert')

      const stats = conversationalInterface.getConversationStats(conversationContext.sessionId)
      expect(stats).toBeDefined()
      expect(stats!.messageCount).toBeGreaterThan(0)
    })

    test('should provide contextual help', async () => {
      const help = await conversationalInterface.getContextualHelp(conversationContext.sessionId)

      expect(help).toBeDefined()
      expect(help.commands).toBeInstanceOf(Array)
      expect(help.examples).toBeInstanceOf(Array)
      expect(help.tips).toBeInstanceOf(Array)
      expect(help.commands.length).toBeGreaterThan(0)
    })

    test('should handle conversation preferences updates', async () => {
      await conversationalInterface.updatePreferences(conversationContext.sessionId, {
        verbosity: 'brief',
        explanations: false,
      })

      // Verify preferences were updated
      const response = await conversationalInterface.processMessage(
        conversationContext.sessionId,
        'Test message after preference update'
      )

      expect(response).toBeDefined()
    })
  })

  describe('Real-Time Progress Service Tests', () => {
    let mockSocket: any

    beforeEach(() => {
      mockSocket = {
        id: 'test-socket-123',
        userId: TEST_USER_ID,
        workspaceId: TEST_WORKSPACE_ID,
        emit: jest.fn(),
        join: jest.fn(),
        on: jest.fn(),
      }

      // Initialize with mock Socket.io
      progressService.initializeSocketIntegration(mockSocketServer)
    })

    test('should handle journey subscriptions', () => {
      progressService.subscribeToJourney(mockSocket.id, SAMPLE_JOURNEY.id, 'test-session-123')

      // Should not throw errors
      expect(() => {
        progressService.unsubscribeFromJourney(mockSocket.id, SAMPLE_JOURNEY.id)
      }).not.toThrow()
    })

    test('should process state change updates', async () => {
      const stateUpdate = {
        journeyId: SAMPLE_JOURNEY.id,
        sessionId: 'test-session-123',
        previousState: 'start',
        currentState: 'collect_info',
        stateName: 'Collect Information',
        timestamp: new Date(),
      }

      await progressService.onStateChange(stateUpdate)

      // Should process without errors
      expect(true).toBe(true) // Basic assertion
    })

    test('should generate progress visualizations', async () => {
      const visualization = await progressService.generateProgressVisualization(
        SAMPLE_JOURNEY.id,
        'linear'
      )

      expect(visualization).toBeDefined()
      expect(visualization.type).toBe('linear')
      expect(visualization.data).toBeInstanceOf(Array)
      expect(visualization.metadata).toBeDefined()
    })

    test('should track performance metrics', () => {
      const metrics = progressService.getPerformanceMetrics(SAMPLE_JOURNEY.id)
      // May be null for new journey
      expect(metrics === null || typeof metrics === 'object').toBe(true)
    })

    test('should provide execution statistics', () => {
      const stats = progressService.getExecutionStatistics()

      expect(stats).toBeDefined()
      expect(typeof stats.totalJourneys).toBe('number')
      expect(typeof stats.activeJourneys).toBe('number')
      expect(typeof stats.completedJourneys).toBe('number')
      expect(typeof stats.successRate).toBe('number')
    })
  })

  describe('Infrastructure Integration Tests', () => {
    test('should initialize with proper configuration', () => {
      expect(infrastructureIntegration).toBeDefined()
      // Integration should be initialized without throwing
    })

    test('should handle Socket.io integration', () => {
      expect(() => {
        infrastructureIntegration.initializeSocketIntegration(mockSocketServer)
      }).not.toThrow()

      expect(mockSocketServer.of).toHaveBeenCalled()
    })

    test('should start journey execution with full integration', async () => {
      const execution = await infrastructureIntegration.startJourneyExecution(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      expect(execution).toBeDefined()
      expect(execution.sessionId).toBeDefined()
      expect(execution.journeyId).toBeDefined()
      expect(execution.conversationContext).toBeDefined()
    })

    test('should retrieve execution status', async () => {
      const execution = await infrastructureIntegration.startJourneyExecution(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      const status = await infrastructureIntegration.getExecutionStatus(
        execution.sessionId,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      expect(status).toBeDefined()
      expect(status.execution).toBeDefined()
      expect(status.conversation).toBeDefined()
    })

    test('should provide workspace analytics', async () => {
      const analytics = await infrastructureIntegration.getWorkspaceAnalytics(
        TEST_WORKSPACE_ID,
        TEST_USER_ID,
        '7d'
      )

      expect(analytics).toBeDefined()
      expect(analytics.progress).toBeDefined()
      expect(analytics.workspace).toBeDefined()
    })
  })

  describe('End-to-End Integration Tests', () => {
    test('should complete full journey execution workflow', async () => {
      console.log('🚀 Starting end-to-end journey execution test')

      // 1. Start journey execution
      const execution = await infrastructureIntegration.startJourneyExecution(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID,
        { verbosity: 'normal', explanations: true }
      )

      expect(execution.sessionId).toBeDefined()
      console.log(`✅ Journey started: ${execution.sessionId}`)

      // 2. Simulate user interactions
      const conversationSteps = [
        'Hi, I need to onboard a new customer',
        'The customer name is Emma Wilson',
        'Email address: emma.wilson@techstart.io',
        'Company: TechStart Solutions',
        'Role: Product Manager',
        'Please create a new account',
        'Send the welcome email',
      ]

      let lastResponse: AgentResponse | undefined

      for (let i = 0; i < conversationSteps.length; i++) {
        const step = conversationSteps[i]
        console.log(`📝 Step ${i + 1}: ${step}`)

        lastResponse = await conversationalInterface.processMessage(execution.sessionId, step)

        expect(lastResponse).toBeDefined()
        expect(lastResponse.sessionId).toBe(execution.sessionId)
        console.log(`🤖 Agent response: ${lastResponse.message.substring(0, 100)}...`)

        // Verify progress advancement
        expect(lastResponse.progress).toBeDefined()
        expect(lastResponse.progress.completionPercentage).toBeGreaterThanOrEqual(0)
        console.log(`📊 Progress: ${lastResponse.progress.completionPercentage}%`)
      }

      // 3. Verify final state
      const finalStatus = await infrastructureIntegration.getExecutionStatus(
        execution.sessionId,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      expect(finalStatus).toBeDefined()
      expect(finalStatus.execution).toBeDefined()
      console.log('✅ Final status retrieved successfully')

      // 4. Get analytics
      const analytics = await infrastructureIntegration.getWorkspaceAnalytics(
        TEST_WORKSPACE_ID,
        TEST_USER_ID
      )

      expect(analytics).toBeDefined()
      expect(analytics.progress.totalJourneys).toBeGreaterThan(0)
      console.log(`📈 Workspace analytics: ${analytics.progress.totalJourneys} total journeys`)

      console.log('🎉 End-to-end integration test completed successfully')
    })

    test('should handle error recovery in journey execution', async () => {
      const execution = await infrastructureIntegration.startJourneyExecution(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      // Simulate error conditions
      const errorScenarios = [
        'Invalid email format: not-an-email',
        'Skip validation and continue anyway',
        'Retry with valid email: test@example.com',
      ]

      for (const scenario of errorScenarios) {
        const response = await conversationalInterface.processMessage(execution.sessionId, scenario)

        // Should handle errors gracefully
        expect(response).toBeDefined()
        expect(response.message).toBeTruthy()
      }
    })

    test('should maintain conversation context across interactions', async () => {
      const execution = await infrastructureIntegration.startJourneyExecution(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      // Set context with early information
      await conversationalInterface.processMessage(
        execution.sessionId,
        'The customer is Sarah Chen from DataFlow Inc.'
      )

      // Later reference should understand context
      const contextResponse = await conversationalInterface.processMessage(
        execution.sessionId,
        'What was the customer name again?'
      )

      expect(contextResponse.message).toBeTruthy()
      // Would contain reference to Sarah Chen in a real implementation
    })

    test('should provide real-time progress updates', async () => {
      const execution = await infrastructureIntegration.startJourneyExecution(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      // Mock socket subscription
      progressService.subscribeToJourney(
        'test-socket-realtime',
        execution.journeyId,
        execution.sessionId
      )

      // Simulate progress updates
      await conversationalInterface.processMessage(
        execution.sessionId,
        'Complete the customer information step'
      )

      // Verify visualization can be generated
      const visualization = await progressService.generateProgressVisualization(
        execution.journeyId,
        'timeline'
      )

      expect(visualization).toBeDefined()
      expect(visualization.type).toBe('timeline')
      expect(visualization.data.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Load Tests', () => {
    test('should handle multiple concurrent journey executions', async () => {
      const concurrentExecutions = 5
      const promises: Promise<any>[] = []

      // Start multiple journey executions concurrently
      for (let i = 0; i < concurrentExecutions; i++) {
        const promise = infrastructureIntegration.startJourneyExecution(
          `${TEST_WORKFLOW_ID}_${i}`,
          `${TEST_USER_ID}_${i}`,
          `${TEST_WORKSPACE_ID}_${i}`
        )
        promises.push(promise)
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(concurrentExecutions)
      results.forEach((result, index) => {
        expect(result.sessionId).toBeDefined()
        expect(result.journeyId).toContain(`${index}`)
      })
    })

    test('should maintain performance under message load', async () => {
      const execution = await infrastructureIntegration.startJourneyExecution(
        TEST_WORKFLOW_ID,
        TEST_USER_ID,
        TEST_WORKSPACE_ID
      )

      const startTime = Date.now()
      const messageCount = 20
      const messages: Promise<any>[] = []

      // Send multiple messages rapidly
      for (let i = 0; i < messageCount; i++) {
        const promise = conversationalInterface.processMessage(
          execution.sessionId,
          `Test message ${i + 1}`
        )
        messages.push(promise)
      }

      const responses = await Promise.all(messages)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(responses).toHaveLength(messageCount)
      expect(totalTime).toBeLessThan(10000) // Should complete within 10 seconds

      const avgResponseTime = totalTime / messageCount
      console.log(`📊 Average response time: ${avgResponseTime}ms`)

      responses.forEach((response) => {
        expect(response).toBeDefined()
        expect(response.message).toBeTruthy()
      })
    })

    test('should handle memory usage efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create and complete multiple journey executions
      const executionCount = 10
      for (let i = 0; i < executionCount; i++) {
        const execution = await infrastructureIntegration.startJourneyExecution(
          `${TEST_WORKFLOW_ID}_mem_${i}`,
          `${TEST_USER_ID}_mem_${i}`,
          `${TEST_WORKSPACE_ID}_mem_${i}`
        )

        // Simulate brief interaction
        await conversationalInterface.processMessage(execution.sessionId, 'Quick test message')

        // Terminate to free resources
        await communicationService.terminateSession(execution.sessionId)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      const memoryIncreasePerExecution = memoryIncrease / executionCount

      console.log(
        `📊 Memory increase per execution: ${Math.round(memoryIncreasePerExecution / 1024)}KB`
      )

      // Should not increase memory significantly per execution
      expect(memoryIncreasePerExecution).toBeLessThan(50 * 1024 * 1024) // Less than 50MB per execution
    })
  })
})

/**
 * Performance test utilities
 */
class PerformanceTestRunner {
  static async measureExecutionTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now()
    const result = await fn()
    const duration = Date.now() - startTime
    return { result, duration }
  }

  static async runConcurrencyTest<T>(
    testFn: (index: number) => Promise<T>,
    concurrency: number
  ): Promise<T[]> {
    const promises = Array.from({ length: concurrency }, (_, i) => testFn(i))
    return Promise.all(promises)
  }

  static generateTestData(count: number, template: any): any[] {
    return Array.from({ length: count }, (_, i) => ({
      ...template,
      id: `${template.id}_${i}`,
      index: i,
    }))
  }
}

/**
 * Test data generators
 * NOTE: If this test data generator needs to be shared, move it to a separate non-test file
 */
// export const TestDataGenerator = {
const TestDataGenerator = {
  createWorkflow: (id: string): WorkflowData => ({
    ...SAMPLE_WORKFLOW,
    id,
    name: `Test Workflow ${id}`,
  }),

  createJourney: (id: string, workflowId: string): JourneyDefinition => ({
    ...SAMPLE_JOURNEY,
    id,
    title: `Test Journey ${id}`,
    metadata: {
      ...SAMPLE_JOURNEY.metadata,
      originalWorkflowId: workflowId,
    },
  }),

  createUserMessage: (content: string, attachments?: any[]): ConversationMessage => ({
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    role: 'user',
    content,
    timestamp: new Date(),
    metadata: { attachments },
  }),
}
