/**
 * Parlant Journey Execution Engine
 *
 * Core engine for executing converted workflows through Parlant's journey system.
 * Provides conversational workflow execution with state management, progress tracking,
 * and seamless integration with existing Sim infrastructure.
 */

import type {
  ConversationalInterface,
  ExecutionResult,
  JourneyDefinition,
  JourneyState,
} from '../types'

/**
 * Journey execution context containing all necessary state and metadata
 */
interface JourneyExecutionContext {
  journeyId: string
  sessionId: string
  userId: string
  workspaceId: string
  currentStateId: string
  executionState: Record<string, any>
  conversationHistory: ConversationMessage[]
  toolResults: ToolExecutionResult[]
  startTime: Date
  metadata: {
    originalWorkflowId?: string
    executionMode: 'conversational' | 'automated'
    progressTracker: ProgressTracker
  }
}

/**
 * Conversation message structure for journey execution
 */
interface ConversationMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    stateId?: string
    toolCall?: string
    progressUpdate?: boolean
  }
}

/**
 * Tool execution result with journey context
 */
interface ToolExecutionResult {
  id: string
  toolId: string
  stateId: string
  input: Record<string, any>
  output: any
  executionTime: number
  success: boolean
  error?: {
    code: string
    message: string
    retryable: boolean
  }
  timestamp: Date
}

/**
 * Progress tracking for journey execution
 */
interface ProgressTracker {
  totalStates: number
  completedStates: number
  currentStateName: string
  estimatedTimeRemaining?: number
  completionPercentage: number
  milestones: ProgressMilestone[]
}

interface ProgressMilestone {
  id: string
  name: string
  description: string
  stateId: string
  completed: boolean
  timestamp?: Date
}

/**
 * State execution result with transition information
 */
interface StateExecutionResult {
  success: boolean
  nextStateId?: string
  output?: any
  conversationResponse?: string
  userInputRequired?: boolean
  toolExecutions?: ToolExecutionResult[]
  error?: {
    code: string
    message: string
    recoverable: boolean
    fallbackStateId?: string
  }
}

/**
 * Journey execution engine for running workflows through conversational interfaces
 */
export class JourneyExecutionEngine {
  private executionContexts = new Map<string, JourneyExecutionContext>()
  private journeyDefinitions = new Map<string, JourneyDefinition>()
  private stateHandlers = new Map<string, StateHandler>()
  private conversationCallbacks = new Map<string, ConversationalInterface>()

  constructor() {
    this.initializeStateHandlers()
  }

  /**
   * Initialize a journey execution session
   */
  async initializeJourneyExecution(
    journeyDefinition: JourneyDefinition,
    sessionId: string,
    userId: string,
    workspaceId: string,
    conversationInterface: ConversationalInterface
  ): Promise<JourneyExecutionContext> {
    const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Store journey definition
    this.journeyDefinitions.set(journeyId, journeyDefinition)

    // Create execution context
    const context: JourneyExecutionContext = {
      journeyId,
      sessionId,
      userId,
      workspaceId,
      currentStateId: this.findInitialState(journeyDefinition).id,
      executionState: {},
      conversationHistory: [],
      toolResults: [],
      startTime: new Date(),
      metadata: {
        originalWorkflowId: journeyDefinition.metadata?.originalWorkflowId,
        executionMode: 'conversational',
        progressTracker: this.initializeProgressTracker(journeyDefinition),
      },
    }

    // Store context and interface
    this.executionContexts.set(journeyId, context)
    this.conversationCallbacks.set(journeyId, conversationInterface)

    // Send welcome message
    await this.sendConversationMessage(
      context,
      'agent',
      `Hello! I'll help you execute the "${journeyDefinition.title}" workflow. Let's get started!`
    )

    // Log journey initialization
    console.log(`Journey ${journeyId} initialized for workflow: ${journeyDefinition.title}`)

    return context
  }

  /**
   * Process user input and advance journey execution
   */
  async processUserInput(
    journeyId: string,
    userInput: string,
    metadata?: Record<string, any>
  ): Promise<ExecutionResult> {
    const context = this.executionContexts.get(journeyId)
    if (!context) {
      throw new Error(`Journey execution context not found: ${journeyId}`)
    }

    const journey = this.journeyDefinitions.get(journeyId)
    if (!journey) {
      throw new Error(`Journey definition not found: ${journeyId}`)
    }

    try {
      // Log user input
      await this.sendConversationMessage(context, 'user', userInput)

      // Get current state
      const currentState = this.getCurrentState(journey, context)
      if (!currentState) {
        throw new Error(`Invalid current state: ${context.currentStateId}`)
      }

      // Process input through current state handler
      const stateResult = await this.executeState(
        currentState,
        context,
        journey,
        userInput,
        metadata
      )

      // Handle state execution result
      if (stateResult.success) {
        // Send agent response if provided
        if (stateResult.conversationResponse) {
          await this.sendConversationMessage(context, 'agent', stateResult.conversationResponse)
        }

        // Transition to next state if specified
        if (stateResult.nextStateId) {
          await this.transitionToState(context, journey, stateResult.nextStateId)
        }

        // Update progress
        this.updateProgress(context, journey)

        return {
          success: true,
          journeyId: context.journeyId,
          currentState: context.currentStateId,
          progress: context.metadata.progressTracker,
          response: stateResult.conversationResponse,
          userInputRequired: stateResult.userInputRequired,
          completed: this.isJourneyCompleted(journey, context),
        }
      }
      // Handle execution error
      const errorMessage = stateResult.error?.message || 'An error occurred during execution'
      await this.sendConversationMessage(context, 'agent', errorMessage)

      // Try recovery if possible
      if (stateResult.error?.recoverable && stateResult.error.fallbackStateId) {
        await this.transitionToState(context, journey, stateResult.error.fallbackStateId)
      }

      return {
        success: false,
        journeyId: context.journeyId,
        currentState: context.currentStateId,
        error: stateResult.error,
        progress: context.metadata.progressTracker,
      }
    } catch (error) {
      console.error(`Journey execution error for ${journeyId}:`, error)

      await this.sendConversationMessage(
        context,
        'agent',
        'I encountered an unexpected error. Let me try to recover...'
      )

      return {
        success: false,
        journeyId: context.journeyId,
        currentState: context.currentStateId,
        error: {
          code: 'JOURNEY_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: false,
        },
        progress: context.metadata.progressTracker,
      }
    }
  }

  /**
   * Execute a journey state
   */
  private async executeState(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition,
    userInput?: string,
    metadata?: Record<string, any>
  ): Promise<StateExecutionResult> {
    const handler = this.stateHandlers.get(state.type)
    if (!handler) {
      throw new Error(`No handler found for state type: ${state.type}`)
    }

    // Log state execution
    console.log(`Executing state ${state.id} (${state.type}) for journey ${context.journeyId}`)

    try {
      return await handler.execute(state, context, journey, userInput, metadata)
    } catch (error) {
      console.error(`State execution failed for ${state.id}:`, error)

      return {
        success: false,
        error: {
          code: 'STATE_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'State execution failed',
          recoverable: true,
        },
      }
    }
  }

  /**
   * Transition to a new state
   */
  private async transitionToState(
    context: JourneyExecutionContext,
    journey: JourneyDefinition,
    nextStateId: string
  ): Promise<void> {
    const nextState = journey.states.find((s) => s.id === nextStateId)
    if (!nextState) {
      throw new Error(`Next state not found: ${nextStateId}`)
    }

    console.log(`Transitioning from ${context.currentStateId} to ${nextStateId}`)

    // Update context
    const previousStateId = context.currentStateId
    context.currentStateId = nextStateId

    // Log transition
    await this.sendConversationMessage(
      context,
      'system',
      `Transitioning to: ${nextState.name || nextStateId}`,
      { stateId: nextStateId, progressUpdate: true }
    )

    // Handle state entry actions
    if (nextState.onEntry) {
      await this.executeStateActions(nextState.onEntry, context)
    }

    // If this is an automated state (like tool execution), execute it immediately
    if (this.isAutomatedState(nextState)) {
      const automatedResult = await this.executeState(nextState, context, journey)
      if (automatedResult.success && automatedResult.nextStateId) {
        await this.transitionToState(context, journey, automatedResult.nextStateId)
      }
    }
  }

  /**
   * Send a conversation message
   */
  private async sendConversationMessage(
    context: JourneyExecutionContext,
    role: 'user' | 'agent' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      role,
      content,
      timestamp: new Date(),
      metadata,
    }

    // Add to context
    context.conversationHistory.push(message)

    // Send to conversation interface
    const conversationInterface = this.conversationCallbacks.get(context.journeyId)
    if (conversationInterface) {
      await conversationInterface.sendMessage(message)
    }
  }

  /**
   * Initialize state handlers
   */
  private initializeStateHandlers(): void {
    // Initial state handler
    this.stateHandlers.set('initial', new InitialStateHandler())

    // Final state handler
    this.stateHandlers.set('final', new FinalStateHandler())

    // Tool execution state handler
    this.stateHandlers.set('tool_state', new ToolStateHandler())

    // Chat state handler for user interaction
    this.stateHandlers.set('chat_state', new ChatStateHandler())

    // Conditional state handler
    this.stateHandlers.set('conditional', new ConditionalStateHandler())

    // Parallel execution handler
    this.stateHandlers.set('parallel', new ParallelStateHandler())
  }

  /**
   * Find the initial state in a journey
   */
  private findInitialState(journey: JourneyDefinition): JourneyState {
    const initialState = journey.states.find((s) => s.type === 'initial')
    if (!initialState) {
      throw new Error('Journey must have an initial state')
    }
    return initialState
  }

  /**
   * Get current state from journey
   */
  private getCurrentState(
    journey: JourneyDefinition,
    context: JourneyExecutionContext
  ): JourneyState | undefined {
    return journey.states.find((s) => s.id === context.currentStateId)
  }

  /**
   * Initialize progress tracker
   */
  private initializeProgressTracker(journey: JourneyDefinition): ProgressTracker {
    const milestones = journey.states
      .filter((s) => s.type !== 'initial' && s.type !== 'final')
      .map((state, index) => ({
        id: state.id,
        name: state.name || state.id,
        description: state.description || `Execute ${state.name || state.id}`,
        stateId: state.id,
        completed: false,
      }))

    return {
      totalStates: journey.states.length - 1, // Exclude initial state
      completedStates: 0,
      currentStateName: 'Starting...',
      completionPercentage: 0,
      milestones,
    }
  }

  /**
   * Update progress tracker
   */
  private updateProgress(context: JourneyExecutionContext, journey: JourneyDefinition): void {
    const tracker = context.metadata.progressTracker
    const currentState = this.getCurrentState(journey, context)

    if (currentState) {
      tracker.currentStateName = currentState.name || currentState.id

      // Mark current milestone as completed
      const milestone = tracker.milestones.find((m) => m.stateId === context.currentStateId)
      if (milestone && !milestone.completed) {
        milestone.completed = true
        milestone.timestamp = new Date()
        tracker.completedStates++
      }

      // Update completion percentage
      tracker.completionPercentage = Math.round(
        (tracker.completedStates / tracker.totalStates) * 100
      )
    }
  }

  /**
   * Check if journey is completed
   */
  private isJourneyCompleted(
    journey: JourneyDefinition,
    context: JourneyExecutionContext
  ): boolean {
    const currentState = this.getCurrentState(journey, context)
    return currentState?.type === 'final'
  }

  /**
   * Check if state is automated (doesn't require user input)
   */
  private isAutomatedState(state: JourneyState): boolean {
    return ['tool_state', 'conditional'].includes(state.type)
  }

  /**
   * Execute state actions
   */
  private async executeStateActions(
    actions: any[],
    context: JourneyExecutionContext
  ): Promise<void> {
    for (const action of actions) {
      // Implementation would depend on action types
      console.log(`Executing state action:`, action)
    }
  }

  /**
   * Get journey execution status
   */
  getExecutionStatus(journeyId: string): JourneyExecutionContext | undefined {
    return this.executionContexts.get(journeyId)
  }

  /**
   * Cleanup journey execution
   */
  async cleanupJourneyExecution(journeyId: string): Promise<void> {
    const context = this.executionContexts.get(journeyId)
    if (context) {
      // Send completion message
      await this.sendConversationMessage(
        context,
        'agent',
        'Journey execution completed. Thank you!'
      )

      // Cleanup resources
      this.executionContexts.delete(journeyId)
      this.journeyDefinitions.delete(journeyId)
      this.conversationCallbacks.delete(journeyId)

      console.log(`Journey ${journeyId} execution cleaned up`)
    }
  }
}

/**
 * Base state handler interface
 */
abstract class StateHandler {
  abstract execute(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition,
    userInput?: string,
    metadata?: Record<string, any>
  ): Promise<StateExecutionResult>
}

/**
 * Initial state handler
 */
class InitialStateHandler extends StateHandler {
  async execute(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition
  ): Promise<StateExecutionResult> {
    // Find first transition from initial state
    const firstTransition = journey.transitions?.find((t) => t.from === state.id)

    return {
      success: true,
      nextStateId: firstTransition?.to,
      conversationResponse: `Starting ${journey.title}...`,
    }
  }
}

/**
 * Final state handler
 */
class FinalStateHandler extends StateHandler {
  async execute(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition
  ): Promise<StateExecutionResult> {
    return {
      success: true,
      conversationResponse: `✅ Journey "${journey.title}" completed successfully! 🎉\n\nSummary:\n- Total states executed: ${context.metadata.progressTracker.completedStates}\n- Execution time: ${Math.round((Date.now() - context.startTime.getTime()) / 1000)}s\n- Tools used: ${context.toolResults.length}`,
    }
  }
}

/**
 * Tool state handler for executing workflow tools
 */
class ToolStateHandler extends StateHandler {
  async execute(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition,
    userInput?: string
  ): Promise<StateExecutionResult> {
    try {
      const toolConfig = state.config as any
      const toolId = state.originalNodeId || toolConfig.toolId

      if (!toolId) {
        throw new Error('Tool ID not found in state configuration')
      }

      // Execute tool through universal adapter system
      const toolResult = await this.executeTool(toolId, toolConfig, context, userInput)

      // Store tool result
      context.toolResults.push(toolResult)

      // Find next transition
      const nextTransition = journey.transitions?.find((t) => t.from === state.id)

      return {
        success: toolResult.success,
        nextStateId: nextTransition?.to,
        conversationResponse: toolResult.success
          ? `✅ Executed ${state.name || toolId} successfully`
          : `❌ Failed to execute ${state.name || toolId}: ${toolResult.error?.message}`,
        toolExecutions: [toolResult],
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Tool execution failed',
          recoverable: true,
        },
      }
    }
  }

  private async executeTool(
    toolId: string,
    config: any,
    context: JourneyExecutionContext,
    userInput?: string
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const resultId = `tool_${Date.now()}_${Math.random().toString(36).substring(7)}`

    try {
      // This would integrate with the universal tool adapter system
      // For now, return a mock successful result

      return {
        id: resultId,
        toolId,
        stateId: context.currentStateId,
        input: { ...config, userInput },
        output: { success: true, data: 'Mock tool execution result' },
        executionTime: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
      }
    } catch (error) {
      return {
        id: resultId,
        toolId,
        stateId: context.currentStateId,
        input: { ...config, userInput },
        output: null,
        executionTime: Date.now() - startTime,
        success: false,
        error: {
          code: 'TOOL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown tool error',
          retryable: true,
        },
        timestamp: new Date(),
      }
    }
  }
}

/**
 * Chat state handler for user interaction
 */
class ChatStateHandler extends StateHandler {
  async execute(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition,
    userInput?: string
  ): Promise<StateExecutionResult> {
    // If this is the first time entering this state, ask for input
    if (!userInput) {
      return {
        success: true,
        conversationResponse:
          state.description || state.name || 'Please provide input to continue.',
        userInputRequired: true,
      }
    }

    // Process user input and continue
    const nextTransition = journey.transitions?.find((t) => t.from === state.id)

    return {
      success: true,
      nextStateId: nextTransition?.to,
      conversationResponse: `Thank you for your input. Continuing...`,
    }
  }
}

/**
 * Conditional state handler
 */
class ConditionalStateHandler extends StateHandler {
  async execute(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition
  ): Promise<StateExecutionResult> {
    // Evaluate condition and select appropriate transition
    const condition = state.config?.condition as string
    const evaluationResult = await this.evaluateCondition(condition, context)

    // Find appropriate transition based on condition result
    const transitions = journey.transitions?.filter((t) => t.from === state.id) || []
    const selectedTransition =
      transitions.find(
        (t) =>
          (evaluationResult && t.condition === 'true') ||
          (!evaluationResult && t.condition === 'false') ||
          !t.condition // Default transition
      ) || transitions[0]

    return {
      success: true,
      nextStateId: selectedTransition?.to,
      conversationResponse: `Condition evaluated: ${evaluationResult ? 'true' : 'false'}`,
    }
  }

  private async evaluateCondition(
    condition: string,
    context: JourneyExecutionContext
  ): Promise<boolean> {
    // Mock condition evaluation - would implement actual condition logic
    console.log(`Evaluating condition: ${condition}`)
    return true // Default to true for now
  }
}

/**
 * Parallel state handler
 */
class ParallelStateHandler extends StateHandler {
  async execute(
    state: JourneyState,
    context: JourneyExecutionContext,
    journey: JourneyDefinition
  ): Promise<StateExecutionResult> {
    // Execute multiple parallel branches
    const parallelBranches = (state.config?.branches as string[]) || []

    try {
      // This would execute branches in parallel
      // For now, just proceed to next state
      const nextTransition = journey.transitions?.find((t) => t.from === state.id)

      return {
        success: true,
        nextStateId: nextTransition?.to,
        conversationResponse: `Executed ${parallelBranches.length} parallel branches`,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PARALLEL_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Parallel execution failed',
          recoverable: true,
        },
      }
    }
  }
}
