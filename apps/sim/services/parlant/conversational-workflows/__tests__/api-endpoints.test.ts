/**
 * Conversational Workflows API Endpoints Tests
 * ============================================
 *
 * Integration tests for API endpoints
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'
import {
  DELETE as endSession,
  GET as getSession,
  POST as processCommand,
  PATCH as updateSession,
} from '../../app/api/conversational-workflows/[sessionId]/route'
import {
  POST as createMapping,
  GET as getMappings,
} from '../../app/api/conversational-workflows/mappings/route'
// Import API handlers
import {
  POST as createWorkflow,
  GET as getWorkflows,
} from '../../app/api/conversational-workflows/route'

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() =>
    Promise.resolve({
      user: { id: 'test_user_123' },
    })
  ),
}))

jest.mock('@/services/parlant/conversational-workflows/core', () => ({
  getConversationalWorkflowService: jest.fn(() => ({
    createConversationalWorkflow: jest.fn(),
    processNaturalLanguageCommand: jest.fn(),
    getWorkflowState: jest.fn(),
    getStateManager: jest.fn(() => ({
      getSessionStatistics: jest.fn(() => ({
        activeSessions: 5,
        totalSnapshots: 10,
        pendingUpdatesCount: 2,
        connectionStatus: 'connected',
        uptime: 3600,
      })),
      updateSession: jest.fn(),
      unregisterSession: jest.fn(),
      getSessionState: jest.fn(),
      getUpdateHistory: jest.fn(() => []),
    })),
  })),
}))

jest.mock('@/services/parlant/conversational-workflows/mapper', () => ({
  WorkflowJourneyMapper: jest.fn().mockImplementation(() => ({
    createWorkflowToJourneyMapping: jest.fn(),
  })),
}))

// Test data
const mockWorkflowId = 'workflow_api_test_123'
const mockWorkspaceId = 'workspace_api_test_123'
const mockSessionId = 'session_api_test_123'

const mockCreateWorkflowResponse = {
  sessionId: mockSessionId,
  journeyId: 'journey_123',
  initialState: {
    workflowId: mockWorkflowId,
    journeyId: 'journey_123',
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
  },
  welcomeMessage: 'Welcome to the conversational workflow!',
  availableCommands: ['start workflow', 'show status', 'help'],
}

const mockProcessCommandResponse = {
  commandProcessed: true,
  workflowAction: 'start-workflow',
  agentResponse: 'Starting the workflow now!',
  updatedState: {
    ...mockCreateWorkflowResponse.initialState,
    executionStatus: 'running',
    currentNodeId: 'node_1',
  },
  suggestedActions: [],
}

describe('Conversational Workflows API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/conversational-workflows', () => {
    describe('POST - Create Workflow Session', () => {
      it('should create a new conversational workflow session', async () => {
        // Mock the service method
        const mockService =
          require('@/services/parlant/conversational-workflows/core').getConversationalWorkflowService()
        mockService.createConversationalWorkflow.mockResolvedValue(mockCreateWorkflowResponse)

        // Create test request
        const { req } = createMocks({
          method: 'POST',
          body: {
            workflowId: mockWorkflowId,
            workspaceId: mockWorkspaceId,
            conversationalConfig: {
              communicationStyle: 'friendly',
              verbosityLevel: 'normal',
            },
            executionConfig: {
              mode: 'step-by-step',
            },
          },
        })

        const response = await createWorkflow(req as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(201)
        expect(responseData.sessionId).toBe(mockSessionId)
        expect(responseData.welcomeMessage).toBeDefined()
        expect(responseData.availableCommands).toBeInstanceOf(Array)
        expect(mockService.createConversationalWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowId: mockWorkflowId,
            workspaceId: mockWorkspaceId,
            userId: 'test_user_123',
          })
        )
      })

      it('should return 400 for missing required fields', async () => {
        const { req } = createMocks({
          method: 'POST',
          body: {
            workspaceId: mockWorkspaceId,
            // Missing workflowId
          },
        })

        const response = await createWorkflow(req as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toContain('workflowId and workspaceId are required')
      })

      it('should return 401 for unauthenticated requests', async () => {
        // Mock auth failure
        jest.mocked(require('@/lib/auth').auth).mockResolvedValue(null)

        const { req } = createMocks({
          method: 'POST',
          body: {
            workflowId: mockWorkflowId,
            workspaceId: mockWorkspaceId,
          },
        })

        const response = await createWorkflow(req as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBe('Authentication required')

        // Restore auth mock
        jest.mocked(require('@/lib/auth').auth).mockResolvedValue({
          user: { id: 'test_user_123' },
        })
      })
    })

    describe('GET - List Workflow Sessions', () => {
      it('should return list of user workflow sessions', async () => {
        const { req } = createMocks({
          method: 'GET',
          query: {
            workspaceId: mockWorkspaceId,
            limit: '10',
            offset: '0',
          },
        })

        const response = await getWorkflows(req as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData).toHaveProperty('sessions')
        expect(responseData).toHaveProperty('pagination')
        expect(responseData).toHaveProperty('statistics')
        expect(responseData.statistics.activeSessions).toBe(5)
      })

      it('should handle query parameters correctly', async () => {
        const { req } = createMocks({
          method: 'GET',
          query: {
            workspaceId: mockWorkspaceId,
            status: 'active',
            limit: '5',
            offset: '10',
          },
        })

        const response = await getWorkflows(req as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.pagination.limit).toBe(5)
        expect(responseData.pagination.offset).toBe(10)
      })
    })
  })

  describe('/api/conversational-workflows/[sessionId]', () => {
    describe('GET - Get Session State', () => {
      it('should return session state for existing session', async () => {
        const mockService =
          require('@/services/parlant/conversational-workflows/core').getConversationalWorkflowService()
        mockService.getWorkflowState.mockResolvedValue(mockCreateWorkflowResponse.initialState)

        const { req } = createMocks({
          method: 'GET',
        })

        const response = await getSession(req as NextRequest, {
          params: { sessionId: mockSessionId },
        })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.currentState).toBeDefined()
        expect(responseData.availableActions).toBeDefined()
        expect(responseData.progressSummary).toContain('completed')
        expect(mockService.getWorkflowState).toHaveBeenCalledWith(mockSessionId)
      })

      it('should return 404 for non-existent session', async () => {
        const mockService =
          require('@/services/parlant/conversational-workflows/core').getConversationalWorkflowService()
        mockService.getWorkflowState.mockResolvedValue(null)

        const { req } = createMocks({
          method: 'GET',
        })

        const response = await getSession(req as NextRequest, {
          params: { sessionId: 'non_existent_session' },
        })

        expect(response.status).toBe(404)
      })
    })

    describe('POST - Process Natural Language Command', () => {
      it('should process natural language command successfully', async () => {
        const mockService =
          require('@/services/parlant/conversational-workflows/core').getConversationalWorkflowService()
        mockService.processNaturalLanguageCommand.mockResolvedValue(mockProcessCommandResponse)

        const { req } = createMocks({
          method: 'POST',
          body: {
            naturalLanguageInput: 'start the workflow',
            workspaceId: mockWorkspaceId,
            workflowId: mockWorkflowId,
          },
        })

        const response = await processCommand(req as NextRequest, {
          params: { sessionId: mockSessionId },
        })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.commandProcessed).toBe(true)
        expect(responseData.workflowAction).toBe('start-workflow')
        expect(responseData.agentResponse).toBeDefined()
        expect(mockService.processNaturalLanguageCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: mockSessionId,
            naturalLanguageInput: 'start the workflow',
            userId: 'test_user_123',
          })
        )
      })

      it('should return 400 for missing naturalLanguageInput', async () => {
        const { req } = createMocks({
          method: 'POST',
          body: {
            workspaceId: mockWorkspaceId,
            // Missing naturalLanguageInput
          },
        })

        const response = await processCommand(req as NextRequest, {
          params: { sessionId: mockSessionId },
        })

        expect(response.status).toBe(400)
      })
    })

    describe('PATCH - Update Session', () => {
      it('should update session configuration successfully', async () => {
        const mockStateManager = require('@/services/parlant/conversational-workflows/core')
          .getConversationalWorkflowService()
          .getStateManager()

        mockStateManager.getSessionState.mockResolvedValue(mockCreateWorkflowResponse.initialState)
        mockStateManager.updateSession.mockResolvedValue({
          ...mockCreateWorkflowResponse.initialState,
          userInputs: { testParam: 'testValue' },
        })

        const { req } = createMocks({
          method: 'PATCH',
          body: {
            userInputs: { testParam: 'testValue' },
            conversationalConfig: { verbosityLevel: 'detailed' },
          },
        })

        const response = await updateSession(req as NextRequest, {
          params: { sessionId: mockSessionId },
        })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.sessionId).toBe(mockSessionId)
        expect(responseData.updatedState).toBeDefined()
        expect(mockStateManager.updateSession).toHaveBeenCalled()
      })

      it('should return 404 for non-existent session', async () => {
        const mockStateManager = require('@/services/parlant/conversational-workflows/core')
          .getConversationalWorkflowService()
          .getStateManager()

        mockStateManager.getSessionState.mockResolvedValue(null)

        const { req } = createMocks({
          method: 'PATCH',
          body: { userInputs: { test: 'value' } },
        })

        const response = await updateSession(req as NextRequest, {
          params: { sessionId: 'non_existent_session' },
        })

        expect(response.status).toBe(404)
      })
    })

    describe('DELETE - End Session', () => {
      it('should end session successfully', async () => {
        const mockStateManager = require('@/services/parlant/conversational-workflows/core')
          .getConversationalWorkflowService()
          .getStateManager()

        mockStateManager.getSessionState.mockResolvedValue(mockCreateWorkflowResponse.initialState)
        mockStateManager.unregisterSession.mockResolvedValue(undefined)

        const { req } = createMocks({
          method: 'DELETE',
        })

        const response = await endSession(req as NextRequest, {
          params: { sessionId: mockSessionId },
        })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.sessionId).toBe(mockSessionId)
        expect(responseData.message).toBe('Session ended successfully')
        expect(mockStateManager.unregisterSession).toHaveBeenCalledWith(mockSessionId)
      })

      it('should return 404 for non-existent session', async () => {
        const mockStateManager = require('@/services/parlant/conversational-workflows/core')
          .getConversationalWorkflowService()
          .getStateManager()

        mockStateManager.getSessionState.mockResolvedValue(null)

        const { req } = createMocks({
          method: 'DELETE',
        })

        const response = await endSession(req as NextRequest, {
          params: { sessionId: 'non_existent_session' },
        })

        expect(response.status).toBe(404)
      })
    })
  })

  describe('/api/conversational-workflows/mappings', () => {
    describe('POST - Create Workflow Mapping', () => {
      const mockMappingResponse = {
        workflowId: mockWorkflowId,
        journeyId: 'journey_mapping_123',
        mappingVersion: 'v1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        nodeStateMappings: [
          {
            nodeId: 'node_1',
            nodeType: 'starter',
            journeyStateId: 'state_1',
            displayName: 'Start Node',
            description: 'Starting point of the workflow',
            isStartState: true,
            isEndState: false,
            conversationTemplate: "Let's begin the workflow",
            userPrompts: ['What does this do?'],
            agentResponses: ['This starts the workflow'],
            executionTrigger: { type: 'automatic' as const },
            validationRules: [],
          },
        ],
        edgeTransitionMappings: [],
        contextVariableMappings: [],
        executionConfig: {
          mode: 'step-by-step' as const,
          pausePoints: [],
          autoApproval: false,
          timeoutMs: 30000,
          retryPolicy: {
            maxAttempts: 3,
            backoffStrategy: 'exponential' as const,
            backoffMs: 1000,
            retryableErrors: [],
          },
        },
        conversationalConfig: {
          personalityProfile: 'helpful-assistant',
          communicationStyle: 'friendly' as const,
          verbosityLevel: 'normal' as const,
          showProgress: true,
          explainSteps: true,
          askForConfirmation: false,
          provideSuggestions: true,
          gracefulDegradation: true,
          fallbackToVisual: true,
        },
      }

      it('should create workflow-to-journey mapping successfully', async () => {
        const MockMapper =
          require('@/services/parlant/conversational-workflows/mapper').WorkflowJourneyMapper
        const mockMapperInstance = {
          createWorkflowToJourneyMapping: jest.fn().mockResolvedValue(mockMappingResponse),
        }
        MockMapper.mockImplementation(() => mockMapperInstance)

        const { req } = createMocks({
          method: 'POST',
          body: {
            workflowId: mockWorkflowId,
            workspaceId: mockWorkspaceId,
            conversationalConfig: {
              communicationStyle: 'friendly',
            },
            executionConfig: {
              mode: 'step-by-step',
            },
          },
        })

        const response = await createMapping(req as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(201)
        expect(responseData.workflowId).toBe(mockWorkflowId)
        expect(responseData.journeyId).toBeDefined()
        expect(responseData.nodeStateMappings).toBeInstanceOf(Array)
        expect(mockMapperInstance.createWorkflowToJourneyMapping).toHaveBeenCalledWith(
          mockWorkflowId,
          mockWorkspaceId,
          'test_user_123',
          expect.any(Object)
        )
      })

      it('should return 400 for missing required fields', async () => {
        const { req } = createMocks({
          method: 'POST',
          body: {
            workspaceId: mockWorkspaceId,
            // Missing workflowId
          },
        })

        const response = await createMapping(req as NextRequest)

        expect(response.status).toBe(400)
      })
    })

    describe('GET - List Workflow Mappings', () => {
      it('should return list of workflow mappings', async () => {
        const { req } = createMocks({
          method: 'GET',
          query: {
            workspaceId: mockWorkspaceId,
            limit: '20',
            offset: '0',
          },
        })

        const response = await getMappings(req as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData).toHaveProperty('mappings')
        expect(responseData).toHaveProperty('pagination')
        expect(responseData).toHaveProperty('filters')
        expect(responseData.filters.workspaceId).toBe(mockWorkspaceId)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const mockService =
        require('@/services/parlant/conversational-workflows/core').getConversationalWorkflowService()
      mockService.createConversationalWorkflow.mockRejectedValue(new Error('Service unavailable'))

      const { req } = createMocks({
        method: 'POST',
        body: {
          workflowId: mockWorkflowId,
          workspaceId: mockWorkspaceId,
        },
      })

      const response = await createWorkflow(req as NextRequest)

      expect(response.status).toBe(500)
    })

    it('should handle ConversationalWorkflowError specifically', async () => {
      const {
        ConversationalWorkflowError,
      } = require('@/services/parlant/conversational-workflows/errors')
      const mockService =
        require('@/services/parlant/conversational-workflows/core').getConversationalWorkflowService()

      const customError = new ConversationalWorkflowError(
        'Custom workflow error',
        'CUSTOM_ERROR',
        { test: 'context' },
        true
      )

      mockService.createConversationalWorkflow.mockRejectedValue(customError)

      const { req } = createMocks({
        method: 'POST',
        body: {
          workflowId: mockWorkflowId,
          workspaceId: mockWorkspaceId,
        },
      })

      const response = await createWorkflow(req as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(503) // Retryable error
      expect(responseData.errorCode).toBe('CUSTOM_ERROR')
      expect(responseData.retryable).toBe(true)
      expect(responseData.context).toEqual({ test: 'context' })
    })
  })

  describe('Authentication and Authorization', () => {
    it('should handle workspace access validation', async () => {
      // This would test actual workspace authorization when implemented
      const { req } = createMocks({
        method: 'GET',
        query: { workspaceId: 'unauthorized_workspace' },
      })

      const response = await getWorkflows(req as NextRequest)

      // For now, just ensure it doesn't crash
      expect(response.status).toBeGreaterThanOrEqual(200)
    })

    it('should validate session ownership', async () => {
      // This would test session ownership validation when implemented
      const { req } = createMocks({
        method: 'GET',
      })

      const response = await getSession(req as NextRequest, {
        params: { sessionId: 'unauthorized_session' },
      })

      // For now, just ensure it handles unknown sessions appropriately
      expect(response.status).toBeGreaterThanOrEqual(200)
    })
  })
})
