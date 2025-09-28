/**
 * Conversational Workflow Execution Interface
 *
 * Provides a natural language interface for executing workflows through
 * conversational interactions with Parlant agents.
 */

import type {
  AgentResponse,
  ConversationMessage,
  JourneyDefinition,
  MessageAttachment,
  ProgressTracker,
  RecommendedAction,
  WorkflowData,
} from '../types/journey-execution-types'
import type { AgentCommunicationService } from './agent-communication-service'
import type { JourneyExecutionEngine } from './journey-execution-engine'

/**
 * Conversation context for maintaining state across interactions
 */
interface ConversationContext {
  sessionId: string
  journeyId: string
  workflowId: string
  userId: string
  workspaceId: string
  currentStep: string
  conversationMode: ConversationMode
  preferences: ConversationPreferences
  history: ConversationMessage[]
  variables: Record<string, any>
  metadata: ConversationMetadata
}

/**
 * Conversation mode options
 */
type ConversationMode = 'guided' | 'freeform' | 'expert' | 'tutorial'

/**
 * User conversation preferences
 */
interface ConversationPreferences {
  verbosity: 'brief' | 'normal' | 'detailed'
  confirmationLevel: 'none' | 'important' | 'all'
  errorHandling: 'automatic' | 'interactive' | 'strict'
  progressNotifications: boolean
  explanations: boolean
  suggestions: boolean
}

/**
 * Conversation metadata
 */
interface ConversationMetadata {
  startTime: Date
  lastActivity: Date
  messageCount: number
  errorCount: number
  completionRate: number
  satisfaction?: number
}

/**
 * Natural language command structure
 */
interface NLCommand {
  intent: string
  entities: Record<string, any>
  confidence: number
  parameters: Record<string, any>
}

/**
 * Contextual help information
 */
interface ContextualHelp {
  commands: string[]
  examples: string[]
  tips: string[]
  troubleshooting: string[]
}

/**
 * Main conversational execution interface
 */
export class ConversationalExecutionInterface {
  private communicationService: AgentCommunicationService
  private activeContexts = new Map<string, ConversationContext>()
  private nlProcessor: NaturalLanguageProcessor
  private helpSystem: ContextualHelpSystem
  private responseGenerator: ResponseGenerator

  constructor(
    communicationService: AgentCommunicationService,
    executionEngine: JourneyExecutionEngine
  ) {
    this.communicationService = communicationService
    this.executionEngine = executionEngine
    this.nlProcessor = new NaturalLanguageProcessor()
    this.helpSystem = new ContextualHelpSystem()
    this.responseGenerator = new ResponseGenerator()
  }

  /**
   * Initialize a conversational workflow session
   */
  async initializeConversation(
    workflowId: string,
    userId: string,
    workspaceId: string,
    preferences: Partial<ConversationPreferences> = {}
  ): Promise<ConversationContext> {
    console.log(`Initializing conversational workflow for ${workflowId}`)

    try {
      // Get workflow data and convert to journey
      const workflow = await this.getWorkflowData(workflowId)
      const journey = await this.convertWorkflowToJourney(workflow)

      // Start journey session
      const session = await this.communicationService.startJourneySession({
        journeyId: journey.id,
        userId,
        workspaceId,
        preferences: {
          verbosity: 'standard',
          autoConfirm: false,
          timeout: 30000,
        },
      })

      // Create conversation context
      const context: ConversationContext = {
        sessionId: session.sessionId,
        journeyId: journey.id,
        workflowId,
        userId,
        workspaceId,
        currentStep: 'introduction',
        conversationMode: 'guided',
        preferences: this.mergePreferences(preferences),
        history: [],
        variables: {},
        metadata: {
          startTime: new Date(),
          lastActivity: new Date(),
          messageCount: 0,
          errorCount: 0,
          completionRate: 0,
        },
      }

      // Store context
      this.activeContexts.set(session.sessionId, context)

      // Send welcome message with workflow introduction
      await this.sendWelcomeMessage(context, workflow, journey)

      console.log(`Conversational session ${session.sessionId} initialized`)
      return context
    } catch (error) {
      console.error('Failed to initialize conversational workflow:', error)
      throw new Error(
        `Failed to initialize conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Process user message and generate conversational response
   */
  async processMessage(
    sessionId: string,
    message: string,
    attachments?: MessageAttachment[]
  ): Promise<AgentResponse> {
    const context = this.activeContexts.get(sessionId)
    if (!context) {
      throw new Error(`Conversation context not found: ${sessionId}`)
    }

    try {
      // Update activity
      context.metadata.lastActivity = new Date()
      context.metadata.messageCount++

      // Add user message to history
      const userMessage: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
        metadata: { attachments },
      }
      context.history.push(userMessage)

      // Process natural language to extract intent
      const nlCommand = await this.nlProcessor.processMessage(message, context)

      // Handle special conversational commands
      if (await this.handleSpecialCommands(nlCommand, context)) {
        return this.generateSpecialCommandResponse(nlCommand, context)
      }

      // Process through journey execution
      const executionResult = await this.communicationService.sendMessage(sessionId, message)

      // Generate contextual response
      const conversationalResponse = await this.generateConversationalResponse(
        executionResult,
        context,
        nlCommand
      )

      // Update conversation context
      this.updateConversationContext(context, executionResult, nlCommand)

      // Add agent response to history
      const agentMessage: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        role: 'agent',
        content: conversationalResponse.message,
        timestamp: new Date(),
        metadata: {
          progressUpdate: true,
        },
      }
      context.history.push(agentMessage)

      return conversationalResponse
    } catch (error) {
      console.error(`Failed to process message for session ${sessionId}:`, error)

      // Generate error response
      return this.generateErrorResponse(context, error)
    }
  }

  /**
   * Get conversational help for current context
   */
  async getContextualHelp(sessionId: string): Promise<ContextualHelp> {
    const context = this.activeContexts.get(sessionId)
    if (!context) {
      throw new Error(`Conversation context not found: ${sessionId}`)
    }

    return this.helpSystem.generateContextualHelp(context)
  }

  /**
   * Change conversation mode
   */
  async changeConversationMode(sessionId: string, mode: ConversationMode): Promise<void> {
    const context = this.activeContexts.get(sessionId)
    if (!context) {
      throw new Error(`Conversation context not found: ${sessionId}`)
    }

    const previousMode = context.conversationMode
    context.conversationMode = mode

    // Send mode change notification
    const modeDescriptions = {
      guided: "I'll guide you step-by-step through each part of the workflow.",
      freeform: 'You can interact with the workflow in any way you prefer.',
      expert: "I'll provide minimal guidance and assume you know what you're doing.",
      tutorial: "I'll explain each step in detail to help you learn.",
    }

    await this.sendAgentMessage(
      context,
      `🔄 Switched from ${previousMode} to ${mode} mode.\n\n${modeDescriptions[mode]}`
    )
  }

  /**
   * Update conversation preferences
   */
  async updatePreferences(
    sessionId: string,
    preferences: Partial<ConversationPreferences>
  ): Promise<void> {
    const context = this.activeContexts.get(sessionId)
    if (!context) {
      throw new Error(`Conversation context not found: ${sessionId}`)
    }

    context.preferences = { ...context.preferences, ...preferences }

    await this.sendAgentMessage(context, '✅ Your conversation preferences have been updated!')
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(sessionId: string): ConversationMetadata | undefined {
    const context = this.activeContexts.get(sessionId)
    return context?.metadata
  }

  /**
   * End conversation and cleanup
   */
  async endConversation(sessionId: string): Promise<void> {
    const context = this.activeContexts.get(sessionId)
    if (context) {
      await this.sendAgentMessage(
        context,
        '👋 Thank you for using the conversational workflow interface! Your session has been ended.'
      )

      // Terminate journey session
      await this.communicationService.terminateSession(sessionId)

      // Clean up context
      this.activeContexts.delete(sessionId)

      console.log(`Conversation ended for session ${sessionId}`)
    }
  }

  /**
   * Send welcome message with workflow introduction
   */
  private async sendWelcomeMessage(
    context: ConversationContext,
    workflow: WorkflowData,
    journey: JourneyDefinition
  ): Promise<void> {
    let welcomeMessage = `👋 Hello! I'm your AI assistant for the "${workflow.Name}" workflow.\n\n`

    if (context.preferences.explanations) {
      welcomeMessage += `📋 **About this workflow:**\n${workflow.description || 'No description available'}\n\n`
      welcomeMessage += `🎯 **What we'll accomplish:**\n`

      // Extract key steps from journey
      const keySteps = journey.states
        .filter((s) => s.type !== 'initial' && s.type !== 'final')
        .slice(0, 3)
        .map((s, i) => `${i + 1}. ${s.Name || s.id}`)
        .join('\n')

      welcomeMessage += `${keySteps}\n\n`
    }

    welcomeMessage += this.getConversationModeInstructions(context.conversationMode)

    if (context.preferences.suggestions) {
      welcomeMessage += `\n\n💡 **Quick tips:**\n`
      welcomeMessage += `• Say "help" anytime for assistance\n`
      welcomeMessage += `• Say "status" to check progress\n`
      welcomeMessage += `• Say "pause" to take a break\n`
      welcomeMessage += `• Ask me questions about any step\n`
    }

    welcomeMessage += `\n\nAre you ready to begin? Just say "start" or "begin" when you're ready!`

    await this.sendAgentMessage(context, welcomeMessage)
  }

  /**
   * Generate conversational response from execution result
   */
  private async generateConversationalResponse(
    executionResult: AgentResponse,
    context: ConversationContext,
    nlCommand: NLCommand
  ): Promise<AgentResponse> {
    // Enhance the basic execution response with conversational elements
    let enhancedMessage = executionResult.message

    // Add personality based on conversation mode
    enhancedMessage = this.responseGenerator.addPersonality(
      enhancedMessage,
      context.conversationMode
    )

    // Add progress context if appropriate
    if (executionResult.progress && context.preferences.progressNotifications) {
      enhancedMessage += this.responseGenerator.formatProgress(executionResult.progress)
    }

    // Add explanations if requested
    if (context.preferences.explanations && nlCommand.intent !== 'simple_acknowledgment') {
      const explanation = await this.generateStepExplanation(context, nlCommand)
      if (explanation) {
        enhancedMessage += `\n\n💡 ${explanation}`
      }
    }

    // Add suggestions based on current state
    const suggestions = await this.generateSuggestions(context, executionResult)

    return {
      ...executionResult,
      message: enhancedMessage,
      actions: [...(executionResult.actions || []), ...suggestions],
    }
  }

  /**
   * Handle special conversational commands
   */
  private async handleSpecialCommands(
    nlCommand: NLCommand,
    context: ConversationContext
  ): Promise<boolean> {
    const specialCommands = [
      'help',
      'status',
      'pause',
      'resume',
      'restart',
      'quit',
      'mode',
      'preferences',
    ]

    return specialCommands.includes(nlCommand.intent)
  }

  /**
   * Generate response for special commands
   */
  private generateSpecialCommandResponse(
    nlCommand: NLCommand,
    context: ConversationContext
  ): AgentResponse {
    switch (nlCommand.intent) {
      case 'help':
        return this.generateHelpResponse(context)
      case 'status':
        return this.generateStatusResponse(context)
      case 'pause':
        return this.generatePauseResponse(context)
      default:
        return {
          sessionId: context.sessionId,
          message: 'I understand that command, but let me process it properly for you.',
          requiresInput: false,
        }
    }
  }

  /**
   * Generate help response
   */
  private generateHelpResponse(context: ConversationContext): AgentResponse {
    const help =
      `🆘 **Help & Commands**\n\n` +
      `**Navigation:**\n` +
      `• "next" or "continue" - Move to the next step\n` +
      `• "back" or "previous" - Go back to the previous step\n` +
      `• "restart" - Start the workflow over\n\n` +
      `**Information:**\n` +
      `• "status" - Check current progress\n` +
      `• "explain" - Get detailed explanation of current step\n` +
      `• "summary" - View workflow summary\n\n` +
      `**Control:**\n` +
      `• "pause" - Temporarily pause execution\n` +
      `• "resume" - Resume paused execution\n` +
      `• "quit" or "exit" - End the session\n\n` +
      `**Preferences:**\n` +
      `• "mode tutorial" - Switch to tutorial mode\n` +
      `• "mode expert" - Switch to expert mode\n` +
      `• "brief" - Use brief responses\n` +
      `• "detailed" - Use detailed responses\n\n` +
      `You can also just describe what you want to do in natural language!`

    return {
      sessionId: context.sessionId,
      message: help,
      requiresInput: false,
      actions: [
        {
          id: 'continue_workflow',
          label: 'Continue Workflow',
          description: 'Return to workflow execution',
          type: 'continue',
        },
      ],
    }
  }

  /**
   * Generate status response
   */
  private generateStatusResponse(context: ConversationContext): AgentResponse {
    const duration = Date.now() - context.metadata.startTime.getTime()
    const formattedDuration = this.formatDuration(duration)

    let statusMessage = `📊 **Workflow Status**\n\n`
    statusMessage += `• Session time: ${formattedDuration}\n`
    statusMessage += `• Messages exchanged: ${context.metadata.messageCount}\n`
    statusMessage += `• Current step: ${context.currentStep}\n`
    statusMessage += `• Completion: ${context.metadata.completionRate}%\n`
    statusMessage += `• Mode: ${context.conversationMode}\n`

    if (context.metadata.errorCount > 0) {
      statusMessage += `• Errors encountered: ${context.metadata.errorCount}\n`
    }

    return {
      sessionId: context.sessionId,
      message: statusMessage,
      requiresInput: false,
    }
  }

  /**
   * Generate pause response
   */
  private generatePauseResponse(context: ConversationContext): AgentResponse {
    return {
      sessionId: context.sessionId,
      message:
        "⏸️ Workflow paused. Take your time - I'll be here when you're ready to continue. Just say 'resume' when you want to proceed.",
      requiresInput: false,
      actions: [
        {
          id: 'resume',
          label: 'Resume',
          description: 'Continue from where we left off',
          type: 'continue',
        },
      ],
    }
  }

  /**
   * Generate step explanation
   */
  private async generateStepExplanation(
    context: ConversationContext,
    nlCommand: NLCommand
  ): Promise<string | null> {
    // This would integrate with a knowledge base to provide step explanations
    // For now, return a generic explanation
    return 'This step processes your input and moves the workflow forward based on the configured logic.'
  }

  /**
   * Generate contextual suggestions
   */
  private async generateSuggestions(
    context: ConversationContext,
    result: AgentResponse
  ): Promise<RecommendedAction[]> {
    const suggestions: RecommendedAction[] = []

    // Add suggestions based on conversation mode
    if (context.conversationMode === 'tutorial') {
      suggestions.push({
        id: 'explain_more',
        label: 'Explain This Step',
        description: 'Get a detailed explanation of what just happened',
        type: 'continue',
      })
    }

    if (context.preferences.suggestions) {
      suggestions.push({
        id: 'skip_step',
        label: 'Skip This Step',
        description: "Skip this step if it's not relevant",
        type: 'skip',
      })
    }

    return suggestions
  }

  /**
   * Update conversation context based on execution result
   */
  private updateConversationContext(
    context: ConversationContext,
    result: AgentResponse,
    nlCommand: NLCommand
  ): void {
    // Update completion rate based on progress
    if (result.progress) {
      context.metadata.completionRate = result.progress.completionPercentage
      context.currentStep = result.progress.currentStateName
    }

    // Track command types for analytics
    if (nlCommand.intent === 'error' || nlCommand.intent === 'retry') {
      context.metadata.errorCount++
    }
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(context: ConversationContext, error: any): AgentResponse {
    const errorMessage =
      `❌ I encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
      `Don't worry! Here are some things you can try:\n` +
      `• Say "retry" to try again\n` +
      `• Say "help" for assistance\n` +
      `• Ask me a question about what you're trying to do\n` +
      `• Say "restart" to begin fresh`

    return {
      sessionId: context.sessionId,
      message: errorMessage,
      requiresInput: false,
      actions: [
        {
          id: 'retry',
          label: 'Retry',
          description: 'Try the last action again',
          type: 'continue',
        },
        {
          id: 'help',
          label: 'Get Help',
          description: 'Show help and available commands',
          type: 'continue',
        },
      ],
    }
  }

  /**
   * Send agent message
   */
  private async sendAgentMessage(context: ConversationContext, message: string): Promise<void> {
    const agentMessage: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      role: 'agent',
      content: message,
      timestamp: new Date(),
    }

    context.history.push(agentMessage)
    // This would integrate with the actual messaging system
    console.log(`Agent message for ${context.sessionId}:`, message)
  }

  /**
   * Helper methods
   */
  private mergePreferences(preferences: Partial<ConversationPreferences>): ConversationPreferences {
    return {
      verbosity: preferences.verbosity || 'normal',
      confirmationLevel: preferences.confirmationLevel || 'important',
      errorHandling: preferences.errorHandling || 'interactive',
      progressNotifications: preferences.progressNotifications ?? true,
      explanations: preferences.explanations ?? true,
      suggestions: preferences.suggestions ?? true,
    }
  }

  private getConversationModeInstructions(mode: ConversationMode): string {
    const instructions = {
      guided: "I'll guide you step-by-step and ask for confirmation at important points.",
      freeform: "Feel free to interact naturally - I'll understand what you need.",
      expert: "I'll keep explanations brief and assume you're familiar with the process.",
      tutorial: "I'll explain everything in detail to help you learn as we go.",
    }

    return `🎯 **Mode: ${mode}** - ${instructions[mode]}`
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  private async getWorkflowData(workflowId: string): Promise<WorkflowData> {
    // Mock implementation - would integrate with workflow storage
    return {
      id: workflowId,
      Name: 'Sample Workflow',
      description: 'A sample workflow for demonstration',
      version: '1.0',
      nodes: [],
      edges: [],
    }
  }

  private async convertWorkflowToJourney(workflow: WorkflowData): Promise<JourneyDefinition> {
    // Mock implementation - would use actual conversion service
    return {
      id: `journey_${workflow.id}`,
      title: workflow.Name,
      description: workflow.description,
      conditions: [`User wants to execute ${workflow.Name}`],
      states: [
        { id: 'start', type: 'initial', Name: 'Start' },
        { id: 'end', type: 'final', Name: 'Complete' },
      ],
    }
  }
}

/**
 * Natural language processing for conversation understanding
 */
class NaturalLanguageProcessor {
  async processMessage(message: string, context: ConversationContext): Promise<NLCommand> {
    // Mock NLP processing - would use actual NLP service
    const intent = this.extractIntent(message.toLowerCase())
    const entities = this.extractEntities(message)

    return {
      intent,
      entities,
      confidence: 0.85,
      parameters: {},
    }
  }

  private extractIntent(message: string): string {
    // Simple intent matching - would use ML model
    if (message.includes('help') || message.includes('?')) return 'help'
    if (message.includes('status') || message.includes('progress')) return 'status'
    if (message.includes('pause') || message.includes('wait')) return 'pause'
    if (message.includes('continue') || message.includes('next')) return 'continue'
    if (message.includes('restart') || message.includes('start over')) return 'restart'
    if (message.includes('quit') || message.includes('exit')) return 'quit'

    return 'general_input'
  }

  private extractEntities(message: string): Record<string, any> {
    // Simple entity extraction - would use NER
    return {}
  }
}

/**
 * Contextual help system
 */
class ContextualHelpSystem {
  generateContextualHelp(context: ConversationContext): ContextualHelp {
    return {
      commands: ['help', 'status', 'continue', 'pause', 'restart'],
      examples: [
        'Tell me about this step',
        'What happens next?',
        'Skip to the end',
        'Go back to the previous step',
      ],
      tips: [
        'You can ask questions in natural language',
        'Use "explain" for detailed information',
        'Say "brief" for shorter responses',
      ],
      troubleshooting: [
        'If stuck, try saying "help"',
        'Use "restart" to begin fresh',
        "Ask specific questions about what's confusing",
      ],
    }
  }
}

/**
 * Response generation and enhancement
 */
class ResponseGenerator {
  addPersonality(message: string, mode: ConversationMode): string {
    const personalities = {
      guided: '👉 ',
      freeform: '💬 ',
      expert: '🔧 ',
      tutorial: '📚 ',
    }

    return personalities[mode] + message
  }

  formatProgress(progress: ProgressTracker): string {
    return `\n\n📈 Progress: ${progress.completionPercentage}% complete (${progress.completedStates}/${progress.totalStates} steps)`
  }
}
