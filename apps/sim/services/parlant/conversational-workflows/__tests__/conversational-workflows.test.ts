/**
 * Conversational Workflows Test Suite
 * ===================================
 *
 * Comprehensive tests for the conversational workflow system
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
// Test imports
import { type ConversationalWorkflowService, createConversationalWorkflowService } from '../core'
import {
  CommandProcessingError,
  ConversationalWorkflowError,
  SessionManagementError,
  WorkflowMappingError,
} from '../errors'
import { WorkflowJourneyMapper } from '../mapper'
import { NaturalLanguageProcessor } from '../nlp'
import { RealtimeStateManager } from '../state-manager'
import type {
  ConversationalWorkflowState,
  CreateConversationalWorkflowRequest,
  ProcessNaturalLanguageCommandRequest,
} from '../types'

// Mock external dependencies
jest.mock('@/lib/logs/console/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('../client', () => ({
  getParlantClient: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Test data
const mockWorkflowId = 'workflow_test_123'
const mockWorkspaceId = 'workspace_test_123'
const mockUserId = 'user_test_123'
const mockSessionId = 'session_test_123'

const mockConversationalConfig = {
  personalityProfile: 'helpful-assistant',
  communicationStyle: 'friendly' as const,
  verbosityLevel: 'normal' as const,
  showProgress: true,
  explainSteps: true,
  askForConfirmation: false,
  provideSuggestions: true,
  gracefulDegradation: true,
  fallbackToVisual: true,
}

const mockExecutionConfig = {
  mode: 'step-by-step' as const,
  pausePoints: [],
  autoApproval: false,
  timeoutMs: 30000,
  retryPolicy: {
    maxAttempts: 3,
    backoffStrategy: 'exponential' as const,
    backoffMs: 1000,
    retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE'],
  },
}

const mockInitialState: ConversationalWorkflowState = {
  workflowId: mockWorkflowId,
  journeyId: 'journey_test_123',
  sessionId: mockSessionId,
  currentNodeId: null,
  currentStateId: 'initial',
  executionStatus: 'not-started',
  completedNodes: [],
  failedNodes: [],
  skippedNodes: [],
  totalNodes: 5,
  workflowContext: {},
  journeyContext: {},
  userInputs: {},
  startedAt: new Date(),
  lastUpdatedAt: new Date(),
  awaitingUserInput: true,
  availableActions: [],
  errorCount: 0,
}

describe('Conversational Workflows System', () => {
  let workflowService: ConversationalWorkflowService
  let mapper: WorkflowJourneyMapper
  let nlpProcessor: NaturalLanguageProcessor
  let stateManager: RealtimeStateManager

  beforeAll(() => {
    // Initialize services
    workflowService = createConversationalWorkflowService()
    mapper = new WorkflowJourneyMapper()
    nlpProcessor = new NaturalLanguageProcessor()
    stateManager = new RealtimeStateManager()
  })

  beforeEach(() => {
    // Clear any existing sessions
    jest.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up any test sessions
    try {
      await workflowService.cleanup()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  afterAll(async () => {
    // Shutdown services
    await stateManager.shutdown()
  })

  describe('ConversationalWorkflowService', () => {
    describe('createConversationalWorkflow', () => {
      it('should create a new conversational workflow session successfully', async () => {
        const request: CreateConversationalWorkflowRequest = {
          workflowId: mockWorkflowId,
          workspaceId: mockWorkspaceId,
          userId: mockUserId,
          conversationalConfig: mockConversationalConfig,
          executionConfig: mockExecutionConfig,
        }

        const result = await workflowService.createConversationalWorkflow(request)

        expect(result).toHaveProperty('sessionId')
        expect(result).toHaveProperty('journeyId')
        expect(result).toHaveProperty('initialState')
        expect(result).toHaveProperty('welcomeMessage')
        expect(result).toHaveProperty('availableCommands')

        expect(result.initialState.workflowId).toBe(mockWorkflowId)
        expect(result.initialState.executionStatus).toBe('not-started')
        expect(result.availableCommands).toContain('start workflow')
      })

      it('should handle missing workflowId', async () => {
        const request = {
          workspaceId: mockWorkspaceId,
          userId: mockUserId,
          conversationalConfig: mockConversationalConfig,
          executionConfig: mockExecutionConfig,
        } as CreateConversationalWorkflowRequest

        await expect(workflowService.createConversationalWorkflow(request)).rejects.toThrow(
          ConversationalWorkflowError
        )
      })

      it('should apply default configurations when not provided', async () => {
        const request: CreateConversationalWorkflowRequest = {
          workflowId: mockWorkflowId,
          workspaceId: mockWorkspaceId,
          userId: mockUserId,
        }

        const result = await workflowService.createConversationalWorkflow(request)

        expect(result.initialState).toHaveProperty('workflowContext')
        expect(result.initialState.executionStatus).toBe('not-started')
      })
    })

    describe('processNaturalLanguageCommand', () => {
      let sessionId: string

      beforeEach(async () => {
        // Create a test session
        const request: CreateConversationalWorkflowRequest = {
          workflowId: mockWorkflowId,
          workspaceId: mockWorkspaceId,
          userId: mockUserId,
          conversationalConfig: mockConversationalConfig,
          executionConfig: mockExecutionConfig,
        }

        const result = await workflowService.createConversationalWorkflow(request)
        sessionId = result.sessionId
      })

      it('should process start workflow command', async () => {
        const commandRequest: ProcessNaturalLanguageCommandRequest = {
          sessionId,
          workflowId: mockWorkflowId,
          naturalLanguageInput: 'start the workflow',
          userId: mockUserId,
          workspaceId: mockWorkspaceId,
        }

        const result = await workflowService.processNaturalLanguageCommand(commandRequest)

        expect(result.commandProcessed).toBe(true)
        expect(result.workflowAction).toBe('start-workflow')
        expect(result.agentResponse).toContain('started')
        expect(result.updatedState.executionStatus).toBe('running')
      })

      it('should process get status command', async () => {
        const commandRequest: ProcessNaturalLanguageCommandRequest = {
          sessionId,
          workflowId: mockWorkflowId,
          naturalLanguageInput: 'what is the status?',
          userId: mockUserId,
          workspaceId: mockWorkspaceId,
        }

        const result = await workflowService.processNaturalLanguageCommand(commandRequest)

        expect(result.commandProcessed).toBe(true)
        expect(result.workflowAction).toBe('get-status')
        expect(result.agentResponse).toContain('not-started')
      })

      it('should handle unknown commands gracefully', async () => {
        const commandRequest: ProcessNaturalLanguageCommandRequest = {
          sessionId,
          workflowId: mockWorkflowId,
          naturalLanguageInput: 'xyz random unknown command',
          userId: mockUserId,
          workspaceId: mockWorkspaceId,
        }

        const result = await workflowService.processNaturalLanguageCommand(commandRequest)

        expect(result.commandProcessed).toBe(true)
        expect(result.workflowAction).toBe('get-status') // Fallback command
      })

      it('should handle non-existent session', async () => {
        const commandRequest: ProcessNaturalLanguageCommandRequest = {
          sessionId: 'non_existent_session',
          workflowId: mockWorkflowId,
          naturalLanguageInput: 'start workflow',
          userId: mockUserId,
          workspaceId: mockWorkspaceId,
        }

        await expect(workflowService.processNaturalLanguageCommand(commandRequest)).rejects.toThrow(
          ConversationalWorkflowError
        )
      })
    })

    describe('getWorkflowState', () => {
      it('should return session state for existing session', async () => {
        // Create test session
        const request: CreateConversationalWorkflowRequest = {
          workflowId: mockWorkflowId,
          workspaceId: mockWorkspaceId,
          userId: mockUserId,
        }

        const createResult = await workflowService.createConversationalWorkflow(request)
        const sessionId = createResult.sessionId

        const state = await workflowService.getWorkflowState(sessionId)

        expect(state).not.toBeNull()
        expect(state!.sessionId).toBe(sessionId)
        expect(state!.workflowId).toBe(mockWorkflowId)
      })

      it('should return null for non-existent session', async () => {
        const state = await workflowService.getWorkflowState('non_existent_session')
        expect(state).toBeNull()
      })
    })
  })

  describe('WorkflowJourneyMapper', () => {
    describe('createWorkflowToJourneyMapping', () => {
      it('should create a valid workflow-to-journey mapping', async () => {
        // Mock successful workflow loading and Parlant API calls
        const mockParlantClient = require('../client').getParlantClient()
        mockParlantClient.post.mockResolvedValue({
          journey_id: 'journey_test_456',
        })

        const result = await mapper.createWorkflowToJourneyMapping(
          mockWorkflowId,
          mockWorkspaceId,
          mockUserId,
          {
            conversationalConfig: mockConversationalConfig,
            executionConfig: mockExecutionConfig,
          }
        )

        expect(result).toHaveProperty('workflowId', mockWorkflowId)
        expect(result).toHaveProperty('journeyId')
        expect(result).toHaveProperty('nodeStateMappings')
        expect(result).toHaveProperty('edgeTransitionMappings')
        expect(result).toHaveProperty('contextVariableMappings')
        expect(result.isActive).toBe(true)
        expect(result.nodeStateMappings.length).toBeGreaterThan(0)
      })

      it('should handle workflow not found error', async () => {
        await expect(
          mapper.createWorkflowToJourneyMapping(
            'non_existent_workflow',
            mockWorkspaceId,
            mockUserId
          )
        ).rejects.toThrow(WorkflowMappingError)
      })
    })
  })

  describe('NaturalLanguageProcessor', () => {
    describe('processInput', () => {
      it('should correctly identify start workflow intent', async () => {
        const result = await nlpProcessor.processInput('start the workflow', mockInitialState)

        expect(result.detectedIntent).toBe('start_workflow')
        expect(result.intentConfidence).toBeGreaterThan(0.5)
        expect(result.mappedCommand).toBe('start-workflow')
      })

      it('should correctly identify status request intent', async () => {
        const result = await nlpProcessor.processInput(
          'what is the current status?',
          mockInitialState
        )

        expect(result.detectedIntent).toBe('get_status')
        expect(result.mappedCommand).toBe('get-status')
      })

      it('should extract entities from input', async () => {
        const result = await nlpProcessor.processInput(
          'change parameter name to "test value"',
          mockInitialState
        )

        expect(result.extractedEntities.length).toBeGreaterThan(0)
        const parameterEntity = result.extractedEntities.find(
          (e) => e.entityType === 'parameter_name'
        )
        const valueEntity = result.extractedEntities.find((e) => e.entityType === 'value')

        expect(parameterEntity).toBeDefined()
        expect(valueEntity).toBeDefined()
      })

      it('should handle contextual adjustments based on workflow state', async () => {
        const runningState = {
          ...mockInitialState,
          executionStatus: 'running' as const,
        }

        const result = await nlpProcessor.processInput('pause', runningState)

        expect(result.detectedIntent).toBe('pause_workflow')
        expect(result.intentConfidence).toBeGreaterThan(0.8) // Should have high confidence when running
      })

      it('should maintain conversation history', async () => {
        await nlpProcessor.processInput('start workflow', mockInitialState)
        const result = await nlpProcessor.processInput('what is the status?', mockInitialState)

        expect(result.conversationHistory.length).toBeGreaterThan(0)
        expect(result.conversationHistory[0].speaker).toBe('user')
        expect(result.conversationHistory[0].content).toBe('start workflow')
      })
    })

    describe('conversation management', () => {
      it('should clear conversation history', () => {
        nlpProcessor.clearHistory(mockSessionId)
        const history = nlpProcessor.getHistory(mockSessionId)
        expect(history.length).toBe(0)
      })

      it('should add command patterns dynamically', () => {
        nlpProcessor.addCommandPattern('start-workflow', /^begin the process/i)
        const stats = nlpProcessor.getProcessingStats()
        expect(stats.totalPatterns).toBeGreaterThan(0)
      })
    })
  })

  describe('RealtimeStateManager', () => {
    describe('session management', () => {
      it('should register and manage sessions', async () => {
        await stateManager.registerSession(mockSessionId, mockInitialState)

        const state = await stateManager.getSessionState(mockSessionId)
        expect(state).not.toBeNull()
        expect(state!.sessionId).toBe(mockSessionId)

        const stats = stateManager.getSessionStatistics()
        expect(stats.activeSessions).toBeGreaterThan(0)
      })

      it('should update session state and broadcast changes', async () => {
        await stateManager.registerSession(mockSessionId, mockInitialState)

        const updates = {
          executionStatus: 'running' as const,
          currentNodeId: 'node_1',
        }

        const updatedState = await stateManager.updateSession(mockSessionId, updates)

        expect(updatedState.executionStatus).toBe('running')
        expect(updatedState.currentNodeId).toBe('node_1')
        expect(updatedState.lastUpdatedAt).toBeInstanceOf(Date)
      })

      it('should handle subscription to session updates', async () => {
        await stateManager.registerSession(mockSessionId, mockInitialState)

        let updateReceived = false
        const unsubscribe = stateManager.subscribeToSession(mockSessionId, (update) => {
          updateReceived = true
          expect(update.sessionId).toBe(mockSessionId)
        })

        await stateManager.updateSession(mockSessionId, { executionStatus: 'running' })

        expect(updateReceived).toBe(true)
        unsubscribe()
      })

      it('should unregister sessions and clean up resources', async () => {
        await stateManager.registerSession(mockSessionId, mockInitialState)
        await stateManager.unregisterSession(mockSessionId)

        const state = await stateManager.getSessionState(mockSessionId)
        expect(state).toBeNull()
      })
    })

    describe('update history', () => {
      it('should maintain update history for sessions', async () => {
        await stateManager.registerSession(mockSessionId, mockInitialState)
        await stateManager.updateSession(mockSessionId, { executionStatus: 'running' })

        const history = stateManager.getUpdateHistory(mockSessionId)
        expect(history.length).toBeGreaterThan(0)
        expect(history[0].updateType).toBe('execution-started')
      })
    })

    describe('error handling', () => {
      it('should handle session not found errors', async () => {
        await expect(
          stateManager.updateSession('non_existent_session', { executionStatus: 'running' })
        ).rejects.toThrow()
      })

      it('should validate state consistency', async () => {
        const invalidState = {
          ...mockInitialState,
          completedNodes: ['node1', 'node2', 'node3', 'node4', 'node5', 'node6'], // More than totalNodes
        }

        await expect(stateManager.registerSession(mockSessionId, invalidState)).rejects.toThrow()
      })
    })
  })

  describe('Error Handling', () => {
    describe('ConversationalWorkflowError', () => {
      it('should create error with proper structure', () => {
        const error = new ConversationalWorkflowError(
          'Test error',
          'TEST_ERROR',
          { testContext: 'value' },
          true
        )

        expect(error.name).toBe('ConversationalWorkflowError')
        expect(error.message).toBe('Test error')
        expect(error.errorCode).toBe('TEST_ERROR')
        expect(error.retryable).toBe(true)
        expect(error.context).toEqual({ testContext: 'value' })
        expect(error.timestamp).toBeInstanceOf(Date)
      })

      it('should serialize to JSON properly', () => {
        const error = new ConversationalWorkflowError('Test error', 'TEST_ERROR')
        const json = error.toJSON()

        expect(json).toHaveProperty('name', 'ConversationalWorkflowError')
        expect(json).toHaveProperty('message', 'Test error')
        expect(json).toHaveProperty('errorCode', 'TEST_ERROR')
        expect(json).toHaveProperty('timestamp')
      })
    })

    describe('WorkflowMappingError', () => {
      it('should inherit from ConversationalWorkflowError', () => {
        const error = new WorkflowMappingError('Mapping failed', 'MAPPING_FAILED')
        expect(error).toBeInstanceOf(ConversationalWorkflowError)
        expect(error.name).toBe('WorkflowMappingError')
      })
    })

    describe('CommandProcessingError', () => {
      it('should include user-friendly message', () => {
        const error = new CommandProcessingError(
          'Internal processing error',
          'PROCESSING_FAILED',
          {},
          true,
          'Sorry, I had trouble understanding that command.'
        )

        expect(error.userFriendlyMessage).toBe('Sorry, I had trouble understanding that command.')
        const json = error.toJSON()
        expect(json).toHaveProperty('userFriendlyMessage')
      })
    })

    describe('SessionManagementError', () => {
      it('should include session ID', () => {
        const error = new SessionManagementError(
          'Session not found',
          'SESSION_NOT_FOUND',
          mockSessionId
        )

        expect(error.sessionId).toBe(mockSessionId)
        const json = error.toJSON()
        expect(json).toHaveProperty('sessionId', mockSessionId)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete workflow execution flow', async () => {
      // Create session
      const createRequest: CreateConversationalWorkflowRequest = {
        workflowId: mockWorkflowId,
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
        conversationalConfig: mockConversationalConfig,
        executionConfig: mockExecutionConfig,
      }

      const createResult = await workflowService.createConversationalWorkflow(createRequest)
      const sessionId = createResult.sessionId

      // Start workflow
      const commandRequest: ProcessNaturalLanguageCommandRequest = {
        sessionId,
        workflowId: mockWorkflowId,
        naturalLanguageInput: 'start the workflow',
        userId: mockUserId,
        workspaceId: mockWorkspaceId,
      }

      let result = await workflowService.processNaturalLanguageCommand(commandRequest)
      expect(result.updatedState.executionStatus).toBe('running')

      // Check status
      commandRequest.naturalLanguageInput = 'what is the current status?'
      result = await workflowService.processNaturalLanguageCommand(commandRequest)
      expect(result.workflowAction).toBe('get-status')

      // Pause workflow
      commandRequest.naturalLanguageInput = 'pause the workflow'
      result = await workflowService.processNaturalLanguageCommand(commandRequest)
      expect(result.updatedState.executionStatus).toBe('paused')

      // Resume workflow
      commandRequest.naturalLanguageInput = 'resume the workflow'
      result = await workflowService.processNaturalLanguageCommand(commandRequest)
      expect(result.updatedState.executionStatus).toBe('running')
    })

    it('should handle error recovery and retry scenarios', async () => {
      // Create session
      const createRequest: CreateConversationalWorkflowRequest = {
        workflowId: mockWorkflowId,
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
      }

      const createResult = await workflowService.createConversationalWorkflow(createRequest)
      const sessionId = createResult.sessionId

      // Simulate error condition
      const commandRequest: ProcessNaturalLanguageCommandRequest = {
        sessionId,
        workflowId: mockWorkflowId,
        naturalLanguageInput: 'retry the current step',
        userId: mockUserId,
        workspaceId: mockWorkspaceId,
      }

      const result = await workflowService.processNaturalLanguageCommand(commandRequest)
      expect(result.workflowAction).toBe('retry-step')
    })

    it('should handle concurrent session operations', async () => {
      const sessionPromises = []

      // Create multiple sessions concurrently
      for (let i = 0; i < 3; i++) {
        const createRequest: CreateConversationalWorkflowRequest = {
          workflowId: `${mockWorkflowId}_${i}`,
          workspaceId: mockWorkspaceId,
          userId: mockUserId,
        }

        sessionPromises.push(workflowService.createConversationalWorkflow(createRequest))
      }

      const results = await Promise.all(sessionPromises)

      // Verify all sessions were created successfully
      expect(results.length).toBe(3)
      results.forEach((result, index) => {
        expect(result.sessionId).toBeDefined()
        expect(result.initialState.workflowId).toBe(`${mockWorkflowId}_${index}`)
      })

      // Clean up sessions
      for (const result of results) {
        const state = await workflowService.getWorkflowState(result.sessionId)
        expect(state).not.toBeNull()
      }
    })
  })

  describe('Performance Tests', () => {
    it('should handle large numbers of NLP processing requests', async () => {
      const iterations = 100
      const startTime = Date.now()

      const promises = []
      for (let i = 0; i < iterations; i++) {
        promises.push(nlpProcessor.processInput(`test input ${i}`, mockInitialState))
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(results.length).toBe(iterations)
      expect(totalTime).toBeLessThan(10000) // Should complete within 10 seconds

      // Check that all requests were processed
      results.forEach((result) => {
        expect(result).toHaveProperty('detectedIntent')
        expect(result).toHaveProperty('mappedCommand')
      })
    })

    it('should handle rapid state updates efficiently', async () => {
      await stateManager.registerSession(mockSessionId, mockInitialState)

      const updatePromises = []
      const startTime = Date.now()

      // Perform rapid state updates
      for (let i = 0; i < 50; i++) {
        updatePromises.push(
          stateManager.updateSession(mockSessionId, {
            workflowContext: { iterationCount: i },
          })
        )
      }

      const results = await Promise.all(updatePromises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(results.length).toBe(50)
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

      // Verify final state
      const finalState = await stateManager.getSessionState(mockSessionId)
      expect(finalState!.workflowContext.iterationCount).toBe(49)
    })
  })
})
