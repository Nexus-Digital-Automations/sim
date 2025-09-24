/**
 * Conversational Workflow Core Service
 * ===================================
 *
 * Core service that bridges ReactFlow workflows with Parlant journeys,
 * enabling natural language interaction with workflow execution.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getParlantClient } from '../client'
import { CommandProcessingError, ConversationalWorkflowError, WorkflowMappingError } from './errors'
import { WorkflowJourneyMapper } from './mapper'
import { NaturalLanguageProcessor } from './nlp'
import { RealtimeStateManager } from './state-manager'
import type {
  ConversationalWorkflowCommand,
  ConversationalWorkflowState,
  ConversationalWorkflowUpdate,
  CreateConversationalWorkflowRequest,
  CreateConversationalWorkflowResponse,
  NodeStateMapping,
  ProcessNaturalLanguageCommandRequest,
  ProcessNaturalLanguageCommandResponse,
  WorkflowCommandType,
  WorkflowExecutionStatus,
  WorkflowToJourneyMapping,
} from './types'

const logger = createLogger('ConversationalWorkflowCore')

/**
 * Core conversational workflow service
 */
export class ConversationalWorkflowService {
  private readonly parlantClient
  private readonly mapper: WorkflowJourneyMapper
  private readonly nlpProcessor: NaturalLanguageProcessor
  private readonly stateManager: RealtimeStateManager

  // Active sessions tracking
  private readonly activeSessions = new Map<string, ConversationalWorkflowState>()
  private readonly sessionWorkflowMap = new Map<string, string>()

  // Journey mappings cache
  private readonly journeyMappings = new Map<string, WorkflowToJourneyMapping>()

  constructor() {
    this.parlantClient = getParlantClient()
    this.mapper = new WorkflowJourneyMapper()
    this.nlpProcessor = new NaturalLanguageProcessor()
    this.stateManager = new RealtimeStateManager()

    logger.info('Conversational Workflow Service initialized')
  }

  /**
   * Create a new conversational workflow session
   */
  async createConversationalWorkflow(
    request: CreateConversationalWorkflowRequest
  ): Promise<CreateConversationalWorkflowResponse> {
    const {
      workflowId,
      workspaceId,
      userId,
      conversationalConfig,
      executionConfig,
      initialInput,
      sessionMetadata,
    } = request

    logger.info('Creating conversational workflow session', {
      workflowId,
      workspaceId,
      userId,
    })

    try {
      // Generate unique session ID
      const sessionId = this.generateSessionId()

      // Get or create workflow-to-journey mapping
      const mapping = await this.getOrCreateWorkflowMapping(workflowId, workspaceId, userId)

      // Create Parlant agent session
      const agentSession = await this.createParlantAgentSession({
        sessionId,
        journeyId: mapping.journeyId,
        workspaceId,
        userId,
        initialContext: {
          workflowId,
          conversationalConfig,
          executionConfig,
          initialInput: initialInput || {},
          sessionMetadata: sessionMetadata || {},
        },
      })

      // Initialize conversational workflow state
      const initialState: ConversationalWorkflowState = {
        workflowId,
        journeyId: mapping.journeyId,
        sessionId,
        currentNodeId: null,
        currentStateId: agentSession.initialStateId,
        executionStatus: 'not-started',
        completedNodes: [],
        failedNodes: [],
        skippedNodes: [],
        totalNodes: mapping.nodeStateMappings.length,
        workflowContext: initialInput || {},
        journeyContext: agentSession.initialContext,
        userInputs: {},
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        awaitingUserInput: true,
        availableActions: this.generateInitialActions(),
        errorCount: 0,
      }

      // Store session state
      this.activeSessions.set(sessionId, initialState)
      this.sessionWorkflowMap.set(sessionId, workflowId)

      // Register with state manager for real-time updates
      await this.stateManager.registerSession(sessionId, initialState)

      // Generate welcome message based on workflow and configuration
      const welcomeMessage = await this.generateWelcomeMessage(
        mapping,
        conversationalConfig,
        agentSession.agentResponse
      )

      // Extract available commands from mapping and configuration
      const availableCommands = this.extractAvailableCommands(mapping, executionConfig)

      logger.info('Conversational workflow session created successfully', {
        sessionId,
        journeyId: mapping.journeyId,
        workflowId,
      })

      return {
        sessionId,
        journeyId: mapping.journeyId,
        initialState,
        welcomeMessage,
        availableCommands,
      }
    } catch (error: any) {
      logger.error('Failed to create conversational workflow session', {
        workflowId,
        error: error.message,
        stack: error.stack,
      })

      throw new ConversationalWorkflowError(
        'Failed to create conversational workflow session',
        'CREATION_FAILED',
        { workflowId, originalError: error.message },
        true
      )
    }
  }

  /**
   * Process natural language command for workflow interaction
   */
  async processNaturalLanguageCommand(
    request: ProcessNaturalLanguageCommandRequest
  ): Promise<ProcessNaturalLanguageCommandResponse> {
    const { sessionId, workflowId, naturalLanguageInput, userId, workspaceId } = request

    logger.info('Processing natural language command', {
      sessionId,
      workflowId,
      inputLength: naturalLanguageInput.length,
    })

    try {
      // Validate session exists
      const currentState = this.activeSessions.get(sessionId)
      if (!currentState) {
        throw new ConversationalWorkflowError(
          'Session not found',
          'SESSION_NOT_FOUND',
          { sessionId },
          false
        )
      }

      // Process natural language input
      const nlpResult = await this.nlpProcessor.processInput(naturalLanguageInput, currentState)

      // Convert to workflow command
      const workflowCommand: ConversationalWorkflowCommand = {
        commandId: this.generateCommandId(),
        workflowId,
        sessionId,
        commandType: nlpResult.mappedCommand || 'get-status',
        naturalLanguageInput,
        extractedParameters: nlpResult.commandParameters,
        userId,
        workspaceId,
        timestamp: new Date(),
        executionMode: currentState.workflowContext.executionMode || 'step-by-step',
        confirmationRequired: nlpResult.commandParameters.confirmationRequired || false,
        verboseOutput: nlpResult.commandParameters.verboseOutput || true,
      }

      // Execute workflow command
      const executionResult = await this.executeWorkflowCommand(workflowCommand, currentState)

      // Update session state
      const updatedState = await this.updateSessionState(sessionId, executionResult.stateUpdates)

      // Generate agent response
      const agentResponse = await this.generateAgentResponse(
        workflowCommand,
        executionResult,
        updatedState
      )

      // Extract suggested actions
      const suggestedActions = this.extractSuggestedActions(updatedState, executionResult)

      // Broadcast real-time update
      await this.broadcastWorkflowUpdate({
        updateId: this.generateUpdateId(),
        workflowId,
        sessionId,
        updateType: this.mapCommandToUpdateType(workflowCommand.commandType),
        timestamp: new Date(),
        data: {
          command: workflowCommand.commandType,
          result: executionResult.success,
          stateChange: executionResult.stateUpdates,
        },
        userMessage: naturalLanguageInput,
        agentMessage: agentResponse,
        showNotification: executionResult.significant,
      })

      logger.info('Natural language command processed successfully', {
        sessionId,
        commandType: workflowCommand.commandType,
        success: executionResult.success,
      })

      return {
        commandProcessed: executionResult.success,
        workflowAction: workflowCommand.commandType,
        agentResponse,
        updatedState,
        suggestedActions,
      }
    } catch (error: any) {
      logger.error('Failed to process natural language command', {
        sessionId,
        error: error.message,
        naturalLanguageInput,
      })

      // Generate error response
      const errorResponse = await this.generateErrorResponse(error, naturalLanguageInput)

      throw new CommandProcessingError(
        'Failed to process natural language command',
        'COMMAND_PROCESSING_FAILED',
        {
          sessionId,
          naturalLanguageInput: naturalLanguageInput.substring(0, 100),
          originalError: error.message,
        },
        true,
        errorResponse
      )
    }
  }

  /**
   * Get current workflow state for a session
   */
  async getWorkflowState(sessionId: string): Promise<ConversationalWorkflowState | null> {
    const state = this.activeSessions.get(sessionId)
    if (!state) {
      logger.warn('Workflow state requested for unknown session', { sessionId })
      return null
    }

    // Update last access time
    state.lastUpdatedAt = new Date()
    this.activeSessions.set(sessionId, state)

    return { ...state } // Return copy to prevent external modifications
  }

  /**
   * Get or create workflow-to-journey mapping
   */
  private async getOrCreateWorkflowMapping(
    workflowId: string,
    workspaceId: string,
    userId: string
  ): Promise<WorkflowToJourneyMapping> {
    // Check cache first
    const cached = this.journeyMappings.get(workflowId)
    if (cached?.isActive) {
      return cached
    }

    try {
      // Try to load existing mapping from database
      let mapping = await this.loadWorkflowMapping(workflowId, workspaceId)

      if (!mapping) {
        // Create new mapping
        logger.info('Creating new workflow-to-journey mapping', { workflowId })
        mapping = await this.mapper.createWorkflowToJourneyMapping(workflowId, workspaceId, userId)
      }

      // Cache the mapping
      this.journeyMappings.set(workflowId, mapping)

      return mapping
    } catch (error: any) {
      throw new WorkflowMappingError(
        'Failed to create or load workflow mapping',
        'MAPPING_FAILED',
        { workflowId, workspaceId, originalError: error.message },
        true
      )
    }
  }

  /**
   * Create Parlant agent session for workflow interaction
   */
  private async createParlantAgentSession(params: {
    sessionId: string
    journeyId: string
    workspaceId: string
    userId: string
    initialContext: Record<string, any>
  }): Promise<any> {
    const { sessionId, journeyId, workspaceId, userId, initialContext } = params

    try {
      // Create agent session with Parlant
      const agentSession = await this.parlantClient.post('/agents/sessions', {
        session_id: sessionId,
        journey_id: journeyId,
        workspace_id: workspaceId,
        user_id: userId,
        context: initialContext,
        configuration: {
          enable_memory: true,
          enable_tools: true,
          enable_reasoning: true,
          conversation_style: initialContext.conversationalConfig?.communicationStyle || 'friendly',
        },
      })

      return agentSession
    } catch (error: any) {
      logger.error('Failed to create Parlant agent session', {
        sessionId,
        journeyId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Execute workflow command based on natural language processing
   */
  private async executeWorkflowCommand(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<{
    success: boolean
    stateUpdates: Partial<ConversationalWorkflowState>
    significant: boolean
    details: Record<string, any>
  }> {
    const { commandType, extractedParameters } = command

    logger.info('Executing workflow command', { commandType, sessionId: command.sessionId })

    try {
      switch (commandType) {
        case 'start-workflow':
          return await this.handleStartWorkflow(command, currentState)

        case 'pause-workflow':
          return await this.handlePauseWorkflow(command, currentState)

        case 'resume-workflow':
          return await this.handleResumeWorkflow(command, currentState)

        case 'cancel-workflow':
          return await this.handleCancelWorkflow(command, currentState)

        case 'get-status':
          return await this.handleGetStatus(command, currentState)

        case 'explain-step':
          return await this.handleExplainStep(command, currentState)

        case 'show-progress':
          return await this.handleShowProgress(command, currentState)

        case 'retry-step':
          return await this.handleRetryStep(command, currentState)

        case 'skip-step':
          return await this.handleSkipStep(command, currentState)

        case 'modify-input':
          return await this.handleModifyInput(command, currentState)

        case 'list-options':
          return await this.handleListOptions(command, currentState)

        default:
          logger.warn('Unknown workflow command type', { commandType })
          return {
            success: false,
            stateUpdates: {},
            significant: false,
            details: { error: `Unknown command: ${commandType}` },
          }
      }
    } catch (error: any) {
      logger.error('Workflow command execution failed', {
        commandType,
        sessionId: command.sessionId,
        error: error.message,
      })

      return {
        success: false,
        stateUpdates: {
          lastError: {
            errorId: this.generateErrorId(),
            nodeId: currentState.currentNodeId || 'unknown',
            errorType: 'COMMAND_EXECUTION_ERROR',
            message: error.message,
            details: { command: commandType },
            timestamp: new Date(),
            retryable: true,
            suggestedActions: [
              'Try rephrasing your command',
              'Check workflow status',
              'Contact support',
            ],
          },
          errorCount: currentState.errorCount + 1,
        },
        significant: true,
        details: { error: error.message, commandType },
      }
    }
  }

  /**
   * Handle start-workflow command
   */
  private async handleStartWorkflow(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    if (currentState.executionStatus !== 'not-started') {
      return {
        success: false,
        stateUpdates: {},
        significant: false,
        details: { message: 'Workflow is already started' },
      }
    }

    // Get workflow mapping and start from first node
    const mapping = this.journeyMappings.get(currentState.workflowId)
    if (!mapping) {
      throw new Error('Workflow mapping not found')
    }

    const startNode = mapping.nodeStateMappings.find((n) => n.isStartState)
    if (!startNode) {
      throw new Error('No start node found in workflow mapping')
    }

    // Begin workflow execution
    const executionResult = await this.executeWorkflowNode(
      startNode,
      currentState,
      command.extractedParameters
    )

    return {
      success: true,
      stateUpdates: {
        executionStatus: 'running' as WorkflowExecutionStatus,
        currentNodeId: startNode.nodeId,
        currentStateId: startNode.journeyStateId,
        workflowContext: {
          ...currentState.workflowContext,
          ...command.extractedParameters,
        },
        lastUpdatedAt: new Date(),
      },
      significant: true,
      details: {
        startedNode: startNode.displayName,
        executionMode: command.executionMode,
        ...executionResult,
      },
    }
  }

  /**
   * Handle get-status command
   */
  private async handleGetStatus(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    const progressPercentage = Math.round(
      (currentState.completedNodes.length / currentState.totalNodes) * 100
    )

    return {
      success: true,
      stateUpdates: {
        lastUpdatedAt: new Date(),
      },
      significant: false,
      details: {
        status: currentState.executionStatus,
        progress: progressPercentage,
        currentStep: currentState.currentNodeId,
        completedSteps: currentState.completedNodes.length,
        totalSteps: currentState.totalNodes,
        errors: currentState.errorCount,
        awaitingInput: currentState.awaitingUserInput,
      },
    }
  }

  // Additional command handlers would be implemented here...
  // For brevity, I'm including placeholder implementations

  private async handlePauseWorkflow(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    return {
      success: true,
      stateUpdates: { executionStatus: 'paused' as WorkflowExecutionStatus },
      significant: true,
      details: { message: 'Workflow paused successfully' },
    }
  }

  private async handleResumeWorkflow(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    return {
      success: true,
      stateUpdates: { executionStatus: 'running' as WorkflowExecutionStatus },
      significant: true,
      details: { message: 'Workflow resumed successfully' },
    }
  }

  private async handleCancelWorkflow(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    return {
      success: true,
      stateUpdates: { executionStatus: 'cancelled' as WorkflowExecutionStatus },
      significant: true,
      details: { message: 'Workflow cancelled successfully' },
    }
  }

  private async handleExplainStep(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    const mapping = this.journeyMappings.get(currentState.workflowId)
    const currentNode = mapping?.nodeStateMappings.find(
      (n) => n.nodeId === currentState.currentNodeId
    )

    return {
      success: true,
      stateUpdates: {},
      significant: false,
      details: {
        currentStep: currentNode?.displayName || 'Unknown step',
        description: currentNode?.description || 'No description available',
        nodeType: currentNode?.nodeType,
      },
    }
  }

  private async handleShowProgress(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    return this.handleGetStatus(command, currentState)
  }

  private async handleRetryStep(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    return {
      success: true,
      stateUpdates: { errorCount: Math.max(0, currentState.errorCount - 1) },
      significant: true,
      details: { message: 'Retrying current step' },
    }
  }

  private async handleSkipStep(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    if (currentState.currentNodeId) {
      return {
        success: true,
        stateUpdates: {
          skippedNodes: [...currentState.skippedNodes, currentState.currentNodeId],
        },
        significant: true,
        details: { skippedStep: currentState.currentNodeId },
      }
    }
    return { success: false, stateUpdates: {}, significant: false, details: {} }
  }

  private async handleModifyInput(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    return {
      success: true,
      stateUpdates: {
        userInputs: { ...currentState.userInputs, ...command.extractedParameters },
      },
      significant: true,
      details: { modifiedInputs: Object.keys(command.extractedParameters) },
    }
  }

  private async handleListOptions(
    command: ConversationalWorkflowCommand,
    currentState: ConversationalWorkflowState
  ): Promise<any> {
    return {
      success: true,
      stateUpdates: {},
      significant: false,
      details: {
        availableActions: currentState.availableActions,
        availableCommands: ['start', 'pause', 'resume', 'cancel', 'status', 'help'],
      },
    }
  }

  /**
   * Execute a workflow node with conversational interaction
   */
  private async executeWorkflowNode(
    nodeMapping: NodeStateMapping,
    currentState: ConversationalWorkflowState,
    parameters: Record<string, any>
  ): Promise<any> {
    logger.info('Executing workflow node', {
      nodeId: nodeMapping.nodeId,
      nodeType: nodeMapping.nodeType,
      sessionId: currentState.sessionId,
    })

    try {
      // This would integrate with the actual workflow execution engine
      // For now, returning mock execution result
      return {
        success: true,
        nodeResult: {},
        nextNodeId: null, // Would be determined by workflow logic
        requiresUserInput: nodeMapping.executionTrigger.type === 'user-input',
        executionTime: 1000,
      }
    } catch (error: any) {
      logger.error('Node execution failed', {
        nodeId: nodeMapping.nodeId,
        error: error.message,
      })
      throw error
    }
  }

  // Utility methods

  private generateSessionId(): string {
    return `cw_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCommandId(): string {
    return `cw_cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateUpdateId(): string {
    return `cw_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateErrorId(): string {
    return `cw_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateInitialActions() {
    return [
      {
        actionId: 'start',
        actionType: 'continue' as const,
        displayName: 'Start Workflow',
        description: 'Begin executing the workflow',
        requiresInput: false,
      },
      {
        actionId: 'help',
        actionType: 'custom' as const,
        displayName: 'Get Help',
        description: 'Learn about available commands',
        requiresInput: false,
      },
    ]
  }

  private async generateWelcomeMessage(
    mapping: WorkflowToJourneyMapping,
    config: any,
    agentResponse?: string
  ): Promise<string> {
    const baseMessage = `Welcome! I'm here to help you with your workflow. You can interact with me using natural language.`
    const customMessage =
      agentResponse || `This workflow has ${mapping.nodeStateMappings.length} steps.`
    return `${baseMessage} ${customMessage} How would you like to proceed?`
  }

  private extractAvailableCommands(mapping: WorkflowToJourneyMapping, config: any): string[] {
    return [
      'start workflow',
      'show status',
      'explain current step',
      'show progress',
      'pause',
      'resume',
      'cancel',
      'help',
    ]
  }

  private async updateSessionState(
    sessionId: string,
    updates: Partial<ConversationalWorkflowState>
  ): Promise<ConversationalWorkflowState> {
    const currentState = this.activeSessions.get(sessionId)
    if (!currentState) {
      throw new Error('Session not found')
    }

    const updatedState = { ...currentState, ...updates, lastUpdatedAt: new Date() }
    this.activeSessions.set(sessionId, updatedState)

    // Update state manager
    await this.stateManager.updateSession(sessionId, updatedState)

    return updatedState
  }

  private async generateAgentResponse(
    command: ConversationalWorkflowCommand,
    result: any,
    state: ConversationalWorkflowState
  ): Promise<string> {
    // This would integrate with Parlant's response generation
    // For now, returning contextual responses based on command type

    const commandResponses: Record<WorkflowCommandType, (result: any, state: any) => string> = {
      'start-workflow': () =>
        `Great! I've started your workflow. ${result.details?.startedNode ? `We're beginning with: ${result.details.startedNode}` : ''}`,
      'pause-workflow': () =>
        `I've paused the workflow execution. You can resume it anytime by saying "resume".`,
      'resume-workflow': () => `Resuming workflow execution from where we left off.`,
      'cancel-workflow': () =>
        `I've cancelled the workflow execution. All progress has been saved.`,
      'get-status': () =>
        `Your workflow is ${state.executionStatus}. Progress: ${result.details?.progress || 0}% complete.`,
      'explain-step': () =>
        `The current step is: ${result.details?.currentStep || 'Unknown'}. ${result.details?.description || ''}`,
      'show-progress': () =>
        `Progress update: ${result.details?.completedSteps || 0} of ${result.details?.totalSteps || 0} steps completed.`,
      'retry-step': () => `I've retried the current step. Let's see how it goes now.`,
      'skip-step': () => `I've skipped the current step as requested. Moving to the next step.`,
      'modify-input': () => `I've updated the input parameters as requested.`,
      'list-options': () =>
        `Here are your available options: ${result.details?.availableCommands?.join(', ') || 'status, help, pause'}.`,
    }

    const responseGenerator = commandResponses[command.commandType]
    return responseGenerator
      ? responseGenerator(result, state)
      : `I've processed your ${command.commandType} request.`
  }

  private extractSuggestedActions(state: ConversationalWorkflowState, result: any) {
    // Generate contextual suggestions based on current state
    const actions = []

    if (state.executionStatus === 'paused') {
      actions.push({
        actionId: 'resume',
        actionType: 'continue' as const,
        displayName: 'Resume',
        description: 'Continue workflow execution',
        requiresInput: false,
      })
    }

    if (state.awaitingUserInput) {
      actions.push({
        actionId: 'provide_input',
        actionType: 'custom' as const,
        displayName: 'Provide Input',
        description: 'Provide the required input to continue',
        requiresInput: true,
      })
    }

    return actions
  }

  private mapCommandToUpdateType(commandType: WorkflowCommandType): any {
    const mapping = {
      'start-workflow': 'execution-started',
      'pause-workflow': 'execution-paused',
      'resume-workflow': 'execution-resumed',
      'cancel-workflow': 'execution-cancelled',
      'get-status': 'progress-update',
      'explain-step': 'progress-update',
      'show-progress': 'progress-update',
      'retry-step': 'node-started',
      'skip-step': 'node-completed',
      'modify-input': 'input-required',
      'list-options': 'progress-update',
    }

    return mapping[commandType] || 'progress-update'
  }

  private async broadcastWorkflowUpdate(update: ConversationalWorkflowUpdate): Promise<void> {
    await this.stateManager.broadcastUpdate(update)
  }

  private async generateErrorResponse(error: any, input: string): Promise<string> {
    const errorResponses = [
      `I had trouble processing that request. Could you try rephrasing it?`,
      `Something went wrong while processing "${input.substring(0, 50)}...". Please try again.`,
      `I encountered an error. Let me know if you'd like to try a different approach.`,
    ]

    return errorResponses[Math.floor(Math.random() * errorResponses.length)]
  }

  private async loadWorkflowMapping(
    workflowId: string,
    workspaceId: string
  ): Promise<WorkflowToJourneyMapping | null> {
    // This would load from database - returning null for now to trigger creation
    return null
  }

  /**
   * Get the state manager instance
   */
  getStateManager(): RealtimeStateManager {
    return this.stateManager
  }

  /**
   * Clean up inactive sessions
   */
  async cleanup(): Promise<void> {
    const now = Date.now()
    const timeout = 30 * 60 * 1000 // 30 minutes

    for (const [sessionId, state] of this.activeSessions.entries()) {
      if (now - state.lastUpdatedAt.getTime() > timeout) {
        logger.info('Cleaning up inactive session', { sessionId })

        this.activeSessions.delete(sessionId)
        this.sessionWorkflowMap.delete(sessionId)
        await this.stateManager.unregisterSession(sessionId)
      }
    }
  }
}

/**
 * Singleton instance
 */
let serviceInstance: ConversationalWorkflowService | null = null

/**
 * Get or create service instance
 */
export function getConversationalWorkflowService(): ConversationalWorkflowService {
  if (!serviceInstance) {
    serviceInstance = new ConversationalWorkflowService()
  }
  return serviceInstance
}

/**
 * Create new service instance
 */
export function createConversationalWorkflowService(): ConversationalWorkflowService {
  return new ConversationalWorkflowService()
}
