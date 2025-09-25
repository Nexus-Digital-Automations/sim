/**
 * Workflow Context Integration with Journey Mapping
 *
 * Integrates conversational workflow chat interface with Parlant's journey state machine,
 * providing deep context awareness and bidirectional synchronization between
 * workflow execution and chat conversation state.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantJourney, JourneyState, StateTransition } from '../workflow-converter/types'
import type { WorkflowExecutionStreamer } from './real-time-execution-streamer'

const logger = createLogger('WorkflowContextIntegration')

export interface JourneyContext {
  journeyId: string
  workspaceId: string
  userId: string
  sessionId: string
  currentStateId: string
  previousStateId?: string
  variables: Map<string, any>
  executionHistory: ExecutionHistoryEntry[]
  conversationContext: ConversationContext
  metadata: JourneyMetadata
}

export interface ExecutionHistoryEntry {
  stepNumber: number
  stepId: string
  stepName: string
  startTime: number
  endTime?: number
  executionTime?: number
  success: boolean
  result?: any
  error?: string
  conversationMessages: string[]
  userInteractions: UserInteraction[]
}

export interface ConversationContext {
  messageHistory: ConversationMessage[]
  userPreferences: UserPreferences
  conversationFlow: ConversationFlow
  contextMemory: ContextMemory
}

export interface ConversationMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'workflow'
  content: string
  timestamp: string
  relatedStepId?: string
  metadata: any
}

export interface UserPreferences {
  verbosityLevel: 'minimal' | 'normal' | 'detailed'
  notificationPreferences: NotificationPreferences
  commandAliases: Record<string, string>
  displayFormat: 'simple' | 'technical' | 'business'
}

export interface NotificationPreferences {
  stepStarted: boolean
  stepCompleted: boolean
  stepFailed: boolean
  progressMilestones: boolean
  estimatedCompletion: boolean
}

export interface ConversationFlow {
  currentTopic: string
  contextSwitches: ContextSwitch[]
  pendingQuestions: PendingQuestion[]
  userIntent: UserIntent
}

export interface ContextSwitch {
  timestamp: string
  fromTopic: string
  toTopic: string
  trigger: 'user_request' | 'workflow_event' | 'system_initiative'
}

export interface PendingQuestion {
  id: string
  question: string
  stepId: string
  priority: 'low' | 'medium' | 'high'
  suggestedResponses?: string[]
}

export interface UserInteraction {
  timestamp: string
  type: 'command' | 'question' | 'feedback' | 'approval'
  content: string
  response: string
  resolved: boolean
}

export interface UserIntent {
  primary: 'control' | 'monitor' | 'understand' | 'troubleshoot'
  confidence: number
  context: string[]
}

export interface JourneyMetadata {
  originalWorkflowId: string
  conversionTimestamp: string
  executionStartTime: number
  estimatedDuration?: number
  complexityScore: number
  userExperienceLevel: 'beginner' | 'intermediate' | 'advanced'
}

export interface ContextMemory {
  recentTopics: string[]
  userMentionedConcerns: string[]
  troubleshootingHistory: TroubleshootingEntry[]
  performanceInsights: PerformanceInsight[]
}

export interface TroubleshootingEntry {
  stepId: string
  issue: string
  resolution: string
  timestamp: string
  effectiveness: number
}

export interface PerformanceInsight {
  stepId: string
  executionTime: number
  relativeToBenchmark: number
  suggestions: string[]
  timestamp: string
}

/**
 * Context integration manager for workflow-chat synchronization
 */
export class WorkflowContextIntegration {
  private contexts = new Map<string, JourneyContext>()
  private executionStreamer: WorkflowExecutionStreamer | null = null
  private contextUpdateListeners = new Map<string, Set<ContextUpdateListener>>()

  constructor(executionStreamer?: WorkflowExecutionStreamer) {
    this.executionStreamer = executionStreamer || null
    logger.info('WorkflowContextIntegration initialized')
  }

  /**
   * Initialize journey context for conversational workflow
   */
  async initializeJourneyContext(
    journey: ParlantJourney,
    workspaceId: string,
    userId: string,
    sessionId: string,
    userPreferences?: Partial<UserPreferences>
  ): Promise<JourneyContext> {
    logger.info('Initializing journey context', {
      journeyId: journey.id,
      workspaceId,
      userId,
    })

    const context: JourneyContext = {
      journeyId: journey.id,
      workspaceId,
      userId,
      sessionId,
      currentStateId: journey.states[0]?.id || 'initial',
      variables: new Map(),
      executionHistory: [],
      conversationContext: {
        messageHistory: [],
        userPreferences: {
          verbosityLevel: 'normal',
          notificationPreferences: {
            stepStarted: true,
            stepCompleted: true,
            stepFailed: true,
            progressMilestones: true,
            estimatedCompletion: true,
          },
          commandAliases: {},
          displayFormat: 'simple',
          ...userPreferences,
        },
        conversationFlow: {
          currentTopic: 'workflow_initialization',
          contextSwitches: [],
          pendingQuestions: [],
          userIntent: {
            primary: 'monitor',
            confidence: 0.7,
            context: ['workflow_startup'],
          },
        },
        contextMemory: {
          recentTopics: ['workflow_initialization'],
          userMentionedConcerns: [],
          troubleshootingHistory: [],
          performanceInsights: [],
        },
      },
      metadata: {
        originalWorkflowId: journey.metadata?.originalWorkflowId || journey.id,
        conversionTimestamp: journey.metadata?.conversionTimestamp || new Date().toISOString(),
        executionStartTime: Date.now(),
        complexityScore: this.calculateComplexityScore(journey),
        userExperienceLevel: this.inferUserExperienceLevel(userPreferences),
      },
    }

    this.contexts.set(journey.id, context)

    // Initialize context-aware features
    await this.initializeContextAwareFeatures(context, journey)

    logger.debug('Journey context initialized', {
      journeyId: journey.id,
      complexityScore: context.metadata.complexityScore,
      userLevel: context.metadata.userExperienceLevel,
    })

    return context
  }

  /**
   * Update journey state and maintain context synchronization
   */
  async updateJourneyState(
    journeyId: string,
    newStateId: string,
    transitionData?: any
  ): Promise<void> {
    const context = this.contexts.get(journeyId)
    if (!context) {
      logger.warn('Context not found for journey state update', { journeyId })
      return
    }

    const previousStateId = context.currentStateId
    context.previousStateId = previousStateId
    context.currentStateId = newStateId

    logger.debug('Journey state updated', {
      journeyId,
      from: previousStateId,
      to: newStateId,
    })

    // Update conversation context
    await this.updateConversationContext(context, 'state_transition', {
      previousStateId,
      newStateId,
      transitionData,
    })

    // Update execution history
    if (previousStateId !== newStateId) {
      await this.updateExecutionHistory(context, previousStateId, newStateId, transitionData)
    }

    // Notify listeners
    await this.notifyContextUpdate(context, 'state_changed', {
      previousStateId,
      newStateId,
      transitionData,
    })
  }

  /**
   * Process conversational message with context awareness
   */
  async processConversationalMessage(
    journeyId: string,
    message: ConversationMessage
  ): Promise<ConversationResponse> {
    const context = this.contexts.get(journeyId)
    if (!context) {
      throw new Error(`Context not found for journey: ${journeyId}`)
    }

    logger.debug('Processing conversational message with context', {
      journeyId,
      messageType: message.type,
      currentState: context.currentStateId,
    })

    // Add message to conversation history
    context.conversationContext.messageHistory.push(message)

    // Analyze user intent
    const intent = await this.analyzeUserIntent(message, context)
    context.conversationContext.conversationFlow.userIntent = intent

    // Generate context-aware response
    const response = await this.generateContextAwareResponse(message, context)

    // Update conversation flow
    await this.updateConversationFlow(context, message, response)

    // Update context memory
    await this.updateContextMemory(context, message, response)

    return response
  }

  /**
   * Get rich context information for current journey state
   */
  getContextualInformation(journeyId: string): ContextualInformation | null {
    const context = this.contexts.get(journeyId)
    if (!context) return null

    return {
      currentStep: this.getCurrentStepInfo(context),
      progressSummary: this.getProgressSummary(context),
      recentHistory: this.getRecentExecutionHistory(context),
      conversationSummary: this.getConversationSummary(context),
      userInsights: this.getUserInsights(context),
      nextStepPrediction: this.predictNextStep(context),
      troubleshootingContext: this.getTroubleshootingContext(context),
    }
  }

  /**
   * Register context update listener
   */
  onContextUpdate(journeyId: string, listener: ContextUpdateListener): () => void {
    if (!this.contextUpdateListeners.has(journeyId)) {
      this.contextUpdateListeners.set(journeyId, new Set())
    }

    this.contextUpdateListeners.get(journeyId)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.contextUpdateListeners.get(journeyId)?.delete(listener)
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    journeyId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const context = this.contexts.get(journeyId)
    if (!context) return

    Object.assign(context.conversationContext.userPreferences, preferences)

    logger.debug('User preferences updated', {
      journeyId,
      preferences,
    })

    await this.notifyContextUpdate(context, 'preferences_updated', preferences)
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async initializeContextAwareFeatures(
    context: JourneyContext,
    journey: ParlantJourney
  ): Promise<void> {
    // Set estimated duration based on journey complexity
    context.metadata.estimatedDuration = this.estimateJourneyDuration(journey)

    // Initialize context-specific variables
    await this.initializeContextVariables(context, journey)

    // Set up personalized conversation style
    await this.personalizeConversationStyle(context)
  }

  private calculateComplexityScore(journey: ParlantJourney): number {
    let score = 0

    // Base score from number of states
    score += journey.states.length * 2

    // Add complexity for different state types
    journey.states.forEach(state => {
      switch (state.type) {
        case 'conditional':
          score += 5
          break
        case 'parallel':
          score += 7
          break
        case 'loop':
          score += 6
          break
        case 'tool_execution':
          score += 3
          break
        default:
          score += 1
      }
    })

    // Add complexity for transitions
    score += journey.transitions.length

    // Normalize to 1-10 scale
    return Math.min(10, Math.max(1, Math.round(score / 10)))
  }

  private inferUserExperienceLevel(
    preferences?: Partial<UserPreferences>
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (!preferences) return 'beginner'

    // Simple heuristics - could be enhanced with ML
    if (preferences.displayFormat === 'technical' && preferences.verbosityLevel === 'minimal') {
      return 'advanced'
    }

    if (preferences.displayFormat === 'business' || preferences.verbosityLevel === 'detailed') {
      return 'beginner'
    }

    return 'intermediate'
  }

  private estimateJourneyDuration(journey: ParlantJourney): number {
    // Simple estimation based on journey complexity
    const baseTimePerStep = 30000 // 30 seconds base time per step
    const complexityMultiplier = 1 + (this.calculateComplexityScore(journey) / 10)

    return journey.states.length * baseTimePerStep * complexityMultiplier
  }

  private async initializeContextVariables(
    context: JourneyContext,
    journey: ParlantJourney
  ): Promise<void> {
    // Initialize workflow-specific variables
    context.variables.set('journey_start_time', Date.now())
    context.variables.set('total_steps', journey.states.length)
    context.variables.set('user_timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    context.variables.set('conversation_language', 'en')
  }

  private async personalizeConversationStyle(context: JourneyContext): Promise<void> {
    const { userExperienceLevel } = context.metadata
    const { verbosityLevel, displayFormat } = context.conversationContext.userPreferences

    // Adjust conversation style based on user level and preferences
    if (userExperienceLevel === 'beginner') {
      context.conversationContext.conversationFlow.currentTopic = 'user_guidance'
    } else if (userExperienceLevel === 'advanced') {
      context.conversationContext.conversationFlow.currentTopic = 'technical_monitoring'
    }
  }

  private async updateConversationContext(
    context: JourneyContext,
    eventType: string,
    eventData: any
  ): Promise<void> {
    // Update conversation flow based on workflow events
    const flow = context.conversationContext.conversationFlow

    // Track context switches
    if (eventType === 'state_transition') {
      flow.contextSwitches.push({
        timestamp: new Date().toISOString(),
        fromTopic: flow.currentTopic,
        toTopic: this.getTopicForState(eventData.newStateId),
        trigger: 'workflow_event',
      })

      flow.currentTopic = this.getTopicForState(eventData.newStateId)
    }
  }

  private getTopicForState(stateId: string): string {
    // Map state IDs to conversation topics
    if (stateId.includes('validation')) return 'validation'
    if (stateId.includes('processing')) return 'data_processing'
    if (stateId.includes('api')) return 'api_integration'
    if (stateId.includes('notification')) return 'notification'
    return 'workflow_execution'
  }

  private async updateExecutionHistory(
    context: JourneyContext,
    previousStateId: string,
    newStateId: string,
    transitionData: any
  ): Promise<void> {
    // Update or complete previous execution entry
    const lastEntry = context.executionHistory[context.executionHistory.length - 1]

    if (lastEntry && !lastEntry.endTime) {
      lastEntry.endTime = Date.now()
      lastEntry.executionTime = lastEntry.endTime - lastEntry.startTime
      lastEntry.success = !transitionData?.error
      lastEntry.result = transitionData?.result
      lastEntry.error = transitionData?.error
    }

    // Start new execution entry if moving to a new state
    if (newStateId !== previousStateId) {
      const stepNumber = context.executionHistory.length + 1
      context.executionHistory.push({
        stepNumber,
        stepId: newStateId,
        stepName: this.getStepName(context, newStateId),
        startTime: Date.now(),
        success: false, // Will be updated when step completes
        conversationMessages: [],
        userInteractions: [],
      })
    }
  }

  private getStepName(context: JourneyContext, stepId: string): string {
    // This would lookup step name from journey definition
    return stepId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  private async analyzeUserIntent(
    message: ConversationMessage,
    context: JourneyContext
  ): Promise<UserIntent> {
    const content = message.content.toLowerCase()

    // Simple intent analysis - could be enhanced with NLP
    let primary: UserIntent['primary'] = 'monitor'
    let confidence = 0.5
    const contextWords: string[] = []

    if (content.includes('pause') || content.includes('stop') || content.includes('resume')) {
      primary = 'control'
      confidence = 0.9
      contextWords.push('workflow_control')
    } else if (content.includes('status') || content.includes('progress')) {
      primary = 'monitor'
      confidence = 0.8
      contextWords.push('status_inquiry')
    } else if (content.includes('debug') || content.includes('error') || content.includes('problem')) {
      primary = 'troubleshoot'
      confidence = 0.9
      contextWords.push('troubleshooting')
    } else if (content.includes('how') || content.includes('why') || content.includes('explain')) {
      primary = 'understand'
      confidence = 0.7
      contextWords.push('explanation_request')
    }

    return { primary, confidence, context: contextWords }
  }

  private async generateContextAwareResponse(
    message: ConversationMessage,
    context: JourneyContext
  ): Promise<ConversationResponse> {
    // Generate response based on user intent, current state, and conversation history
    const intent = context.conversationContext.conversationFlow.userIntent
    const currentState = context.currentStateId
    const userLevel = context.metadata.userExperienceLevel

    // This would integrate with an AI service for natural language generation
    return {
      content: await this.generateResponseContent(message, context, intent),
      actions: await this.generateSuggestedActions(context, intent),
      contextHints: await this.generateContextHints(context),
    }
  }

  private async generateResponseContent(
    message: ConversationMessage,
    context: JourneyContext,
    intent: UserIntent
  ): Promise<string> {
    // Generate appropriate response based on intent and context
    switch (intent.primary) {
      case 'control':
        return this.generateControlResponse(message, context)
      case 'monitor':
        return this.generateMonitoringResponse(context)
      case 'troubleshoot':
        return this.generateTroubleshootingResponse(context)
      case 'understand':
        return this.generateExplanationResponse(message, context)
      default:
        return 'I understand your message. How can I help with the workflow?'
    }
  }

  private generateControlResponse(message: ConversationMessage, context: JourneyContext): string {
    return `I understand you want to control the workflow. Based on the current state (${context.currentStateId}), here are your options...`
  }

  private generateMonitoringResponse(context: JourneyContext): string {
    const progress = (context.executionHistory.length / context.variables.get('total_steps')) * 100
    return `Current workflow progress: ${progress.toFixed(0)}%. We're currently at step "${context.currentStateId}".`
  }

  private generateTroubleshootingResponse(context: JourneyContext): string {
    return `I can help troubleshoot the current workflow. Let me check the recent execution history and identify any issues...`
  }

  private generateExplanationResponse(message: ConversationMessage, context: JourneyContext): string {
    return `Let me explain what's happening in the workflow. Currently, we're at step "${context.currentStateId}"...`
  }

  private async generateSuggestedActions(
    context: JourneyContext,
    intent: UserIntent
  ): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = []

    switch (intent.primary) {
      case 'control':
        actions.push(
          { type: 'command', label: 'Pause Workflow', command: '/pause' },
          { type: 'command', label: 'Get Status', command: '/status' }
        )
        break
      case 'monitor':
        actions.push(
          { type: 'command', label: 'Show History', command: '/history' },
          { type: 'command', label: 'Debug Current Step', command: '/debug' }
        )
        break
    }

    return actions
  }

  private async generateContextHints(context: JourneyContext): Promise<ContextHint[]> {
    const hints: ContextHint[] = []

    // Add hints based on current state and user experience level
    if (context.metadata.userExperienceLevel === 'beginner') {
      hints.push({
        type: 'tip',
        content: 'You can ask me about the workflow progress anytime by typing "status"',
      })
    }

    return hints
  }

  private async updateConversationFlow(
    context: JourneyContext,
    message: ConversationMessage,
    response: ConversationResponse
  ): Promise<void> {
    // Update conversation flow tracking
    const flow = context.conversationContext.conversationFlow

    // Update recent topics
    const memory = context.conversationContext.contextMemory
    memory.recentTopics.unshift(flow.currentTopic)
    memory.recentTopics = memory.recentTopics.slice(0, 10) // Keep last 10 topics
  }

  private async updateContextMemory(
    context: JourneyContext,
    message: ConversationMessage,
    response: ConversationResponse
  ): Promise<void> {
    const memory = context.conversationContext.contextMemory

    // Extract and store user concerns
    if (message.content.toLowerCase().includes('concern') ||
        message.content.toLowerCase().includes('worry') ||
        message.content.toLowerCase().includes('problem')) {
      memory.userMentionedConcerns.push(message.content)
    }
  }

  private async notifyContextUpdate(
    context: JourneyContext,
    updateType: string,
    data: any
  ): Promise<void> {
    const listeners = this.contextUpdateListeners.get(context.journeyId)
    if (!listeners || listeners.size === 0) return

    const updateEvent: ContextUpdateEvent = {
      journeyId: context.journeyId,
      type: updateType,
      timestamp: new Date().toISOString(),
      data,
      context: this.getContextualInformation(context.journeyId),
    }

    listeners.forEach(listener => {
      try {
        listener(updateEvent)
      } catch (error) {
        logger.error('Context update listener error', error)
      }
    })
  }

  // Context information getters
  private getCurrentStepInfo(context: JourneyContext): CurrentStepInfo {
    return {
      stepId: context.currentStateId,
      stepName: this.getStepName(context, context.currentStateId),
      stepNumber: context.executionHistory.length + 1,
      totalSteps: context.variables.get('total_steps'),
      startTime: context.executionHistory[context.executionHistory.length - 1]?.startTime,
    }
  }

  private getProgressSummary(context: JourneyContext): ProgressSummary {
    const total = context.variables.get('total_steps')
    const completed = context.executionHistory.filter(e => e.success).length
    const failed = context.executionHistory.filter(e => !e.success && e.endTime).length

    return {
      totalSteps: total,
      completedSteps: completed,
      failedSteps: failed,
      currentStep: context.executionHistory.length + 1,
      percentComplete: ((completed + failed) / total) * 100,
    }
  }

  private getRecentExecutionHistory(context: JourneyContext): ExecutionHistoryEntry[] {
    return context.executionHistory.slice(-5) // Last 5 entries
  }

  private getConversationSummary(context: JourneyContext): ConversationSummary {
    const messages = context.conversationContext.messageHistory
    return {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.type === 'user').length,
      assistantMessages: messages.filter(m => m.type === 'assistant').length,
      recentTopics: context.conversationContext.contextMemory.recentTopics.slice(0, 5),
    }
  }

  private getUserInsights(context: JourneyContext): UserInsights {
    return {
      experienceLevel: context.metadata.userExperienceLevel,
      preferredVerbosity: context.conversationContext.userPreferences.verbosityLevel,
      primaryInteractionMode: context.conversationContext.conversationFlow.userIntent.primary,
      concerns: context.conversationContext.contextMemory.userMentionedConcerns.slice(-3),
    }
  }

  private predictNextStep(context: JourneyContext): NextStepPrediction {
    // Simple prediction based on current execution
    const currentHistory = context.executionHistory
    const avgStepTime = currentHistory.length > 0
      ? currentHistory.reduce((sum, entry) => sum + (entry.executionTime || 0), 0) / currentHistory.length
      : 30000

    return {
      estimatedTimeToNext: avgStepTime,
      confidence: 0.7,
      possibleNextSteps: ['unknown'], // Would be determined from journey definition
    }
  }

  private getTroubleshootingContext(context: JourneyContext): TroubleshootingContext {
    const recentFailures = context.executionHistory.filter(e => !e.success).slice(-3)
    const troubleshootingHistory = context.conversationContext.contextMemory.troubleshootingHistory.slice(-5)

    return {
      recentFailures,
      troubleshootingHistory,
      commonIssues: [], // Would be populated from knowledge base
      suggestedActions: [], // Would be generated based on current issues
    }
  }
}

// Type definitions for response and context structures
export interface ConversationResponse {
  content: string
  actions: SuggestedAction[]
  contextHints: ContextHint[]
}

export interface SuggestedAction {
  type: 'command' | 'question' | 'navigation'
  label: string
  command?: string
  description?: string
}

export interface ContextHint {
  type: 'tip' | 'warning' | 'info'
  content: string
}

export interface ContextUpdateEvent {
  journeyId: string
  type: string
  timestamp: string
  data: any
  context: ContextualInformation | null
}

export type ContextUpdateListener = (event: ContextUpdateEvent) => void

export interface ContextualInformation {
  currentStep: CurrentStepInfo
  progressSummary: ProgressSummary
  recentHistory: ExecutionHistoryEntry[]
  conversationSummary: ConversationSummary
  userInsights: UserInsights
  nextStepPrediction: NextStepPrediction
  troubleshootingContext: TroubleshootingContext
}

export interface CurrentStepInfo {
  stepId: string
  stepName: string
  stepNumber: number
  totalSteps: number
  startTime?: number
}

export interface ProgressSummary {
  totalSteps: number
  completedSteps: number
  failedSteps: number
  currentStep: number
  percentComplete: number
}

export interface ConversationSummary {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  recentTopics: string[]
}

export interface UserInsights {
  experienceLevel: string
  preferredVerbosity: string
  primaryInteractionMode: string
  concerns: string[]
}

export interface NextStepPrediction {
  estimatedTimeToNext: number
  confidence: number
  possibleNextSteps: string[]
}

export interface TroubleshootingContext {
  recentFailures: ExecutionHistoryEntry[]
  troubleshootingHistory: TroubleshootingEntry[]
  commonIssues: any[]
  suggestedActions: any[]
}