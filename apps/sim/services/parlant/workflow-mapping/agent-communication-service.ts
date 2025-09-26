/**
 * Agent Communication Service
 *
 * Handles communication between Parlant agents and the journey execution engine,
 * providing seamless integration for conversational workflow interactions.
 */

import type {
  AgentCommunicationProtocol,
  AgentResponse,
  CompletionUpdate,
  ConversationalInterface,
  ConversationMessage,
  ErrorUpdate,
  ExecutionError,
  ExecutionResult,
  ExecutionSummary,
  JourneySession,
  JourneyStartParams,
  ProgressTracker,
  ProgressUpdate,
  RealTimeUpdateHandler,
  RecommendedAction,
  SessionStatus,
} from '../types/journey-execution-types'
import type { JourneyExecutionEngine } from './journey-execution-engine'

/**
 * Agent session management for tracking active journey executions
 */
interface AgentSession {
  sessionId: string
  journeyId: string
  agentId: string
  userId: string
  workspaceId: string
  status: SessionStatus
  startTime: Date
  lastActivity: Date
  executionContext: any
  conversationHistory: ConversationMessage[]
  preferences?: any
}

/**
 * Agent message queue for handling asynchronous communications
 */
interface AgentMessage {
  id: string
  sessionId: string
  type: 'user_input' | 'agent_response' | 'system_update' | 'error_notification'
  content: string
  metadata?: Record<string, any>
  timestamp: Date
  processed: boolean
}

/**
 * Service for managing agent-to-workflow communication
 */
export class AgentCommunicationService implements AgentCommunicationProtocol {
  private executionEngine: JourneyExecutionEngine
  private activeSessions = new Map<string, AgentSession>()
  private messageQueue = new Map<string, AgentMessage[]>()
  private updateHandlers = new Map<string, RealTimeUpdateHandler>()
  private conversationInterfaces = new Map<string, ConversationalInterface>()

  constructor(executionEngine: JourneyExecutionEngine) {
    this.executionEngine = executionEngine
    this.initializeMessageProcessing()
  }

  /**
   * Start a new journey session with agent communication
   */
  async startJourneySession(params: JourneyStartParams): Promise<JourneySession> {
    try {
      console.log(`Starting journey session for journey ${params.journeyId}`)

      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Get journey definition (would integrate with journey storage)
      const journeyDefinition = await this.getJourneyDefinition(params.journeyId)
      if (!journeyDefinition) {
        throw new Error(`Journey definition not found: ${params.journeyId}`)
      }

      // Create conversational interface for this session
      const conversationInterface = new AgentConversationInterface(sessionId, this)
      this.conversationInterfaces.set(sessionId, conversationInterface)

      // Initialize journey execution
      const executionContext = await this.executionEngine.initializeJourneyExecution(
        journeyDefinition,
        sessionId,
        params.userId,
        params.workspaceId,
        conversationInterface
      )

      // Create agent session record
      const agentSession: AgentSession = {
        sessionId,
        journeyId: params.journeyId,
        agentId: `agent_${params.userId}`,
        userId: params.userId,
        workspaceId: params.workspaceId,
        status: 'initializing',
        startTime: new Date(),
        lastActivity: new Date(),
        executionContext,
        conversationHistory: [],
        preferences: params.preferences,
      }

      // Store session
      this.activeSessions.set(sessionId, agentSession)
      this.messageQueue.set(sessionId, [])

      // Update session status to active
      agentSession.status = 'active'

      // Send initial agent message
      await this.sendAgentMessage(
        sessionId,
        `Hello! I'm ready to help you execute the "${journeyDefinition.title}" workflow. Let's begin!`,
        {
          requiresInput: false,
          actions: [
            {
              id: 'start',
              label: 'Start',
              description: 'Begin workflow execution',
              type: 'continue',
            },
          ],
        }
      )

      console.log(`Journey session ${sessionId} started successfully`)

      return {
        sessionId,
        journeyId: params.journeyId,
        status: 'active',
        startTime: agentSession.startTime,
        estimatedDuration: this.estimateExecutionDuration(journeyDefinition),
      }
    } catch (error) {
      console.error('Failed to start journey session:', error)
      throw new Error(
        `Failed to start journey session: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send a message from the user to the agent
   */
  async sendMessage(sessionId: string, message: string): Promise<AgentResponse> {
    try {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      // Update last activity
      session.lastActivity = new Date()

      // Log user message
      const userMessage: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
      }

      session.conversationHistory.push(userMessage)

      // Process message through journey execution engine
      const executionResult = await this.executionEngine.processUserInput(
        session.executionContext.journeyId,
        message
      )

      // Update session status based on execution result
      if (executionResult.completed) {
        session.status = 'completed'
      } else if (executionResult.userInputRequired) {
        session.status = 'waiting_input'
      } else if (!executionResult.success) {
        session.status = 'error'
      } else {
        session.status = 'active'
      }

      // Send real-time update
      await this.sendProgressUpdate(sessionId, executionResult.progress)

      // Prepare agent response
      const agentResponse: AgentResponse = {
        sessionId,
        message: executionResult.response || 'Processing...',
        requiresInput: executionResult.userInputRequired || false,
        progress: executionResult.progress,
        actions: this.generateRecommendedActions(executionResult),
      }

      // Log agent response
      const agentMessage: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        role: 'agent',
        content: agentResponse.message,
        timestamp: new Date(),
        metadata: {
          progressUpdate: true,
        },
      }

      session.conversationHistory.push(agentMessage)

      // Handle completion
      if (executionResult.completed) {
        await this.handleSessionCompletion(session, executionResult)
      }

      // Handle errors
      if (!executionResult.success && executionResult.error) {
        await this.handleSessionError(session, executionResult.error)
      }

      return agentResponse
    } catch (error) {
      console.error(`Failed to send message to session ${sessionId}:`, error)

      return {
        sessionId,
        message: 'I encountered an error processing your request. Please try again.',
        requiresInput: false,
        actions: [
          {
            id: 'retry',
            label: 'Retry',
            description: 'Try the last action again',
            type: 'continue',
          },
          {
            id: 'restart',
            label: 'Restart',
            description: 'Start the workflow from the beginning',
            type: 'restart',
          },
        ],
      }
    }
  }

  /**
   * Get current progress for a session
   */
  async getProgress(sessionId: string): Promise<ProgressTracker> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const executionStatus = this.executionEngine.getExecutionStatus(
      session.executionContext.journeyId
    )
    if (!executionStatus) {
      throw new Error(`Execution context not found for session: ${sessionId}`)
    }

    return executionStatus.metadata.progressTracker
  }

  /**
   * Pause journey execution
   */
  async pauseExecution(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    session.status = 'paused'
    session.lastActivity = new Date()

    await this.sendAgentMessage(
      sessionId,
      '⏸️ Execution paused. You can resume anytime by sending a message.',
      {
        requiresInput: false,
        actions: [
          {
            id: 'resume',
            label: 'Resume',
            description: 'Continue execution from where we left off',
            type: 'continue',
          },
        ],
      }
    )

    console.log(`Journey execution paused for session ${sessionId}`)
  }

  /**
   * Resume journey execution
   */
  async resumeExecution(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    if (session.status !== 'paused') {
      throw new Error(`Session is not paused: ${sessionId}`)
    }

    session.status = 'active'
    session.lastActivity = new Date()

    await this.sendAgentMessage(
      sessionId,
      "▶️ Execution resumed. Let's continue where we left off!",
      { requiresInput: false }
    )

    console.log(`Journey execution resumed for session ${sessionId}`)
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<ExecutionSummary> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const endTime = new Date()
    const duration = endTime.getTime() - session.startTime.getTime()

    // Clean up journey execution
    await this.executionEngine.cleanupJourneyExecution(session.executionContext.journeyId)

    // Create execution summary
    const summary: ExecutionSummary = {
      journeyId: session.journeyId,
      sessionId: session.sessionId,
      status: session.status === 'completed' ? 'completed' : 'terminated',
      startTime: session.startTime,
      endTime,
      duration,
      statesExecuted: this.countExecutedStates(session),
      toolExecutions: this.countToolExecutions(session),
      userInteractions: this.countUserInteractions(session),
      results: this.extractResults(session),
    }

    // Clean up session data
    this.activeSessions.delete(sessionId)
    this.messageQueue.delete(sessionId)
    this.conversationInterfaces.delete(sessionId)

    // Send completion update
    await this.sendCompletionUpdate(sessionId, summary)

    console.log(`Session ${sessionId} terminated`)
    return summary
  }

  /**
   * Register a real-time update handler
   */
  registerUpdateHandler(sessionId: string, handler: RealTimeUpdateHandler): void {
    this.updateHandlers.set(sessionId, handler)
  }

  /**
   * Unregister update handler
   */
  unregisterUpdateHandler(sessionId: string): void {
    this.updateHandlers.delete(sessionId)
  }

  /**
   * Send an agent message
   */
  private async sendAgentMessage(
    sessionId: string,
    content: string,
    metadata: {
      requiresInput?: boolean
      actions?: RecommendedAction[]
      inputSchema?: any
    } = {}
  ): Promise<void> {
    const conversationInterface = this.conversationInterfaces.get(sessionId)
    if (!conversationInterface) {
      console.warn(`No conversation interface found for session ${sessionId}`)
      return
    }

    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      role: 'agent',
      content,
      timestamp: new Date(),
      metadata,
    }

    await conversationInterface.sendMessage(message)
  }

  /**
   * Handle session completion
   */
  private async handleSessionCompletion(
    session: AgentSession,
    result: ExecutionResult
  ): Promise<void> {
    session.status = 'completed'

    await this.sendAgentMessage(
      session.sessionId,
      `🎉 Workflow "${session.journeyId}" completed successfully!\n\nExecution Summary:\n- Total time: ${this.formatDuration(Date.now() - session.startTime.getTime())}\n- Progress: ${result.progress.completionPercentage}%\n- States executed: ${result.progress.completedStates}`,
      {
        requiresInput: false,
        actions: [
          {
            id: 'view_results',
            label: 'View Results',
            description: 'See detailed execution results',
            type: 'continue',
          },
          {
            id: 'start_new',
            label: 'Start New Workflow',
            description: 'Begin another workflow execution',
            type: 'continue',
          },
        ],
      }
    )

    // Send completion update
    const completionUpdate: CompletionUpdate = {
      journeyId: session.journeyId,
      sessionId: session.sessionId,
      summary: await this.generateExecutionSummary(session),
      timestamp: new Date(),
    }

    await this.sendCompletionUpdate(session.sessionId, completionUpdate.summary)
  }

  /**
   * Handle session error
   */
  private async handleSessionError(session: AgentSession, error: ExecutionError): Promise<void> {
    session.status = 'error'

    const errorMessage = error.recoverable
      ? `⚠️ I encountered an issue: ${error.message}\n\nDon't worry, I can help you recover from this.`
      : `❌ I encountered a critical error: ${error.message}\n\nUnfortunately, this error prevents us from continuing.`

    const actions: RecommendedAction[] = error.recoverable
      ? [
          {
            id: 'retry',
            label: 'Retry',
            description: 'Try the last action again',
            type: 'continue',
          },
          {
            id: 'skip',
            label: 'Skip',
            description: 'Skip this step and continue',
            type: 'skip',
          },
          {
            id: 'restart',
            label: 'Restart',
            description: 'Start over from the beginning',
            type: 'restart',
          },
        ]
      : [
          {
            id: 'restart',
            label: 'Restart',
            description: 'Start a new execution',
            type: 'restart',
          },
          {
            id: 'cancel',
            label: 'Cancel',
            description: 'End this session',
            type: 'cancel',
          },
        ]

    await this.sendAgentMessage(session.sessionId, errorMessage, { requiresInput: false, actions })

    // Send error update
    const errorUpdate: ErrorUpdate = {
      journeyId: session.journeyId,
      sessionId: session.sessionId,
      error,
      recoveryActions: actions,
      timestamp: new Date(),
    }

    const updateHandler = this.updateHandlers.get(session.sessionId)
    if (updateHandler) {
      await updateHandler.onError(errorUpdate)
    }
  }

  /**
   * Send progress update
   */
  private async sendProgressUpdate(sessionId: string, progress: ProgressTracker): Promise<void> {
    const updateHandler = this.updateHandlers.get(sessionId)
    if (updateHandler) {
      const progressUpdate: ProgressUpdate = {
        journeyId: '',
        sessionId,
        progress,
        timestamp: new Date(),
      }
      await updateHandler.onProgressUpdate(progressUpdate)
    }
  }

  /**
   * Send completion update
   */
  private async sendCompletionUpdate(sessionId: string, summary: ExecutionSummary): Promise<void> {
    const updateHandler = this.updateHandlers.get(sessionId)
    if (updateHandler) {
      const completionUpdate: CompletionUpdate = {
        journeyId: summary.journeyId,
        sessionId,
        summary,
        timestamp: new Date(),
      }
      await updateHandler.onCompletion(completionUpdate)
    }
  }

  /**
   * Generate recommended actions based on execution result
   */
  private generateRecommendedActions(result: ExecutionResult): RecommendedAction[] {
    const actions: RecommendedAction[] = []

    if (result.userInputRequired) {
      actions.push({
        id: 'continue',
        label: 'Continue',
        description: 'Provide the requested input to continue',
        type: 'continue',
      })
    } else if (!result.completed) {
      actions.push({
        id: 'next',
        label: 'Next Step',
        description: 'Continue to the next step',
        type: 'continue',
      })
    }

    actions.push({
      id: 'pause',
      label: 'Pause',
      description: 'Pause execution temporarily',
      type: 'modify',
    })

    return actions
  }

  /**
   * Initialize message processing
   */
  private initializeMessageProcessing(): void {
    // Set up periodic cleanup of inactive sessions
    setInterval(
      () => {
        this.cleanupInactiveSessions()
      },
      5 * 60 * 1000
    ) // Every 5 minutes
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now()
    const inactivityThreshold = 30 * 60 * 1000 // 30 minutes

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity.getTime() > inactivityThreshold) {
        console.log(`Cleaning up inactive session: ${sessionId}`)
        this.terminateSession(sessionId).catch(console.error)
      }
    }
  }

  /**
   * Helper methods
   */
  private async getJourneyDefinition(journeyId: string): Promise<any> {
    // Mock implementation - would integrate with journey storage
    return {
      id: journeyId,
      title: 'Sample Journey',
      description: 'A sample journey for testing',
      conditions: ['User wants to execute this workflow'],
      states: [
        { id: 'start', type: 'initial', name: 'Start' },
        { id: 'end', type: 'final', name: 'Complete' },
      ],
      transitions: [{ id: 't1', from: 'start', to: 'end' }],
    }
  }

  private estimateExecutionDuration(journey: any): number {
    // Mock estimation - would use historical data
    return journey.states.length * 30000 // 30 seconds per state
  }

  private countExecutedStates(session: AgentSession): number {
    return session.executionContext?.metadata?.progressTracker?.completedStates || 0
  }

  private countToolExecutions(session: AgentSession): number {
    return session.executionContext?.toolResults?.length || 0
  }

  private countUserInteractions(session: AgentSession): number {
    return session.conversationHistory.filter((msg) => msg.role === 'user').length
  }

  private extractResults(session: AgentSession): any {
    return {
      outputs: session.executionContext?.executionState || {},
      artifacts: [],
      metrics: {
        totalExecutionTime: Date.now() - session.startTime.getTime(),
        averageStateTime: 0,
        toolExecutionTime: 0,
        userWaitTime: 0,
        errorCount: 0,
        retryCount: 0,
      },
    }
  }

  private async generateExecutionSummary(session: AgentSession): Promise<ExecutionSummary> {
    const endTime = new Date()
    const duration = endTime.getTime() - session.startTime.getTime()

    return {
      journeyId: session.journeyId,
      sessionId: session.sessionId,
      status: session.status === 'completed' ? 'completed' : 'terminated',
      startTime: session.startTime,
      endTime,
      duration,
      statesExecuted: this.countExecutedStates(session),
      toolExecutions: this.countToolExecutions(session),
      userInteractions: this.countUserInteractions(session),
      results: this.extractResults(session),
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }
}

/**
 * Conversational interface implementation for agent communication
 */
class AgentConversationInterface implements ConversationalInterface {
  private sessionId: string

  constructor(sessionId: string, communicationService: AgentCommunicationService) {
    this.sessionId = sessionId
    this.communicationService = communicationService
  }

  async sendMessage(message: ConversationMessage): Promise<void> {
    // Messages are handled by the communication service
    console.log(`Agent message for ${this.sessionId}:`, message.content)
  }

  async requestInput(prompt: string, schema?: any): Promise<string> {
    // This would integrate with the real-time messaging system
    // For now, return a mock response
    return `Mock user response to: ${prompt}`
  }

  async showProgress(tracker: ProgressTracker): Promise<void> {
    console.log(`Progress update for ${this.sessionId}:`, tracker)
  }

  async displayError(error: ExecutionError): Promise<void> {
    console.log(`Error for ${this.sessionId}:`, error)
  }

  async notifyCompletion(result: ExecutionResult): Promise<void> {
    console.log(`Completion for ${this.sessionId}:`, result)
  }
}
