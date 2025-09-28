/**
 * Enhanced Conversation Experience with Workflow Intelligence
 * =========================================================
 *
 * Provides intelligent, context-aware conversational interactions for workflows.
 * This system combines workflow knowledge, execution state, user preferences,
 * and conversation history to deliver personalized, helpful, and engaging
 * workflow conversations that feel natural and productive.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ExecutionEvent, ExecutionPhase } from './interactive-execution-visualization'
import type { UserExpertiseLevel } from './natural-language-representation'
import type { WorkflowTranslation } from './visual-to-conversational-translation'

const logger = createLogger('EnhancedConversationExperience')

/**
 * Conversation intelligence levels
 */
export enum ConversationIntelligenceLevel {
  BASIC = 'basic', // Simple Q&A responses
  CONTEXTUAL = 'contextual', // Context-aware responses
  PREDICTIVE = 'predictive', // Anticipates needs
  PROACTIVE = 'proactive', // Offers suggestions
  ADAPTIVE = 'adaptive', // Learns and adapts
}

/**
 * Conversation session state
 */
export interface ConversationSession {
  sessionId: string
  workflowId: string
  userId: string
  startTime: Date
  lastInteraction: Date

  // User context
  userProfile: {
    expertiseLevel: UserExpertiseLevel
    preferences: ConversationPreferences
    learningGoals?: string[]
    roleContext?: string
    domainExpertise?: string[]
  }

  // Conversation state
  conversationState: {
    currentTopic?: string
    currentFocus?: string // Element ID or concept
    conversationPhase: ConversationPhase
    intelligenceLevel: ConversationIntelligenceLevel
    contextStack: ConversationContext[]
    personalizationData: PersonalizationData
  }

  // Workflow context
  workflowContext: {
    workflowTranslation?: WorkflowTranslation
    currentExecutionState?: ExecutionPhase
    recentEvents?: ExecutionEvent[]
    focusedElements?: string[]
    userActions?: UserAction[]
  }

  // Conversation history
  conversationHistory: ConversationTurn[]

  // Intelligence features
  intelligence: {
    patternRecognition: ConversationPattern[]
    predictedNeeds: PredictedNeed[]
    suggestedActions: SuggestedAction[]
    learningInsights: LearningInsight[]
  }

  // Metrics and feedback
  metrics: {
    totalInteractions: number
    averageResponseTime: number
    satisfactionRatings: number[]
    topicsDiscussed: string[]
    helpfulnessScore?: number
  }
}

/**
 * Conversation phases for different interaction patterns
 */
export enum ConversationPhase {
  DISCOVERY = 'discovery', // Learning about the workflow
  EXPLORATION = 'exploration', // Exploring specific components
  EXECUTION = 'execution', // During workflow execution
  TROUBLESHOOTING = 'troubleshooting', // Problem-solving mode
  OPTIMIZATION = 'optimization', // Improving workflow performance
  LEARNING = 'learning', // Educational interactions
  MAINTENANCE = 'maintenance', // Ongoing workflow management
}

/**
 * User preferences for conversation experience
 */
interface ConversationPreferences {
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly'
  responseLength: 'brief' | 'standard' | 'detailed' | 'comprehensive'
  interactionFrequency: 'minimal' | 'moderate' | 'active' | 'continuous'
  learningSupport: boolean
  proactiveAssistance: boolean
  contextualHelp: boolean
  visualDescriptions: boolean
  performanceInsights: boolean
  troubleshootingGuidance: boolean
  personalization: boolean
}

/**
 * Conversation context for maintaining state
 */
interface ConversationContext {
  contextId: string
  timestamp: Date
  contextType:
    | 'element_focus'
    | 'topic_discussion'
    | 'execution_state'
    | 'problem_solving'
    | 'learning_goal'
  contextData: Record<string, any>
  priority: number
  expiresAt?: Date
}

/**
 * Individual conversation turn
 */
interface ConversationTurn {
  turnId: string
  timestamp: Date
  speaker: 'user' | 'assistant'
  content: string

  // Enhanced metadata
  metadata: {
    intent?: string
    entities?: Array<{
      type: string
      value: string
      confidence: number
    }>
    sentiment?: 'positive' | 'negative' | 'neutral'
    confidence: number
    responseTime?: number
    referencedElements?: string[]
    topicArea?: string
    conversationPhase: ConversationPhase
  }

  // Intelligence features
  intelligence: {
    predictedFollowUps?: string[]
    suggestedActions?: string[]
    relatedTopics?: string[]
    learningOpportunities?: string[]
  }

  // User feedback
  feedback?: {
    helpful: boolean
    rating?: number
    comments?: string
  }
}

/**
 * Personalization data for adaptive conversations
 */
interface PersonalizationData {
  communicationPatterns: {
    preferredQuestionTypes: string[]
    responseComplexityPreference: number
    topicInterests: Map<string, number>
    interactionTimingPreference: string[]
  }

  learningProgress: {
    conceptsUnderstood: Set<string>
    conceptsNeedingWork: Set<string>
    learningVelocity: number
    preferredLearningStyle: string
  }

  workflowFamiliarity: {
    elementExpertise: Map<string, number>
    patternRecognition: Map<string, number>
    troubleshootingSkills: Map<string, number>
  }

  adaptationHistory: Array<{
    timestamp: Date
    adaptationType: string
    reason: string
    effectiveness?: number
  }>
}

/**
 * Recognized conversation patterns
 */
interface ConversationPattern {
  patternId: string
  patternName: string
  description: string
  triggerConditions: string[]
  responseTemplate: ResponseTemplate
  learningWeight: number
  confidence: number
}

/**
 * Predicted user needs based on conversation intelligence
 */
interface PredictedNeed {
  needId: string
  description: string
  confidence: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  category: 'information' | 'guidance' | 'troubleshooting' | 'optimization' | 'learning'
  suggestedResponse: string
  timeToAddress?: number
}

/**
 * Suggested actions for proactive assistance
 */
interface SuggestedAction {
  actionId: string
  title: string
  description: string
  category:
    | 'workflow_optimization'
    | 'learning_opportunity'
    | 'problem_prevention'
    | 'efficiency_improvement'
  priority: number
  estimatedBenefit: string
  executionComplexity: 'simple' | 'moderate' | 'complex'
  prerequisites?: string[]
}

/**
 * Learning insights for educational conversations
 */
interface LearningInsight {
  insightId: string
  topic: string
  insight: string
  relevanceScore: number
  personalizedFor: UserExpertiseLevel
  supportingEvidence: string[]
  actionableSteps?: string[]
}

/**
 * User actions for context understanding
 */
interface UserAction {
  actionId: string
  timestamp: Date
  actionType:
    | 'element_select'
    | 'workflow_execute'
    | 'configuration_change'
    | 'question_ask'
    | 'help_request'
  elementId?: string
  actionData: Record<string, any>
  context: {
    conversationPhase: ConversationPhase
    currentTopic?: string
  }
}

/**
 * Response template for intelligent conversation generation
 */
interface ResponseTemplate {
  templateId: string
  Name: string
  pattern: string
  variations: Array<{
    condition: string
    response: string
    followUp?: string[]
  }>
  personalizationHooks: string[]
  contextRequirements: string[]
}

/**
 * Enhanced conversation experience engine
 */
export class EnhancedConversationExperience {
  // Active conversation sessions
  private readonly conversationSessions = new Map<string, ConversationSession>()

  // Intelligence engines
  private readonly intentRecognizer: IntentRecognizer
  private readonly contextManager: ContextManager
  private readonly personalizationEngine: PersonalizationEngine
  private readonly responseGenerator: ResponseGenerator

  constructor() {
    // Initialize intelligence engines
    this.intentRecognizer = new IntentRecognizer()
    this.contextManager = new ContextManager()
    this.personalizationEngine = new PersonalizationEngine()
    this.responseGenerator = new ResponseGenerator()
    this.learningAnalyzer = new LearningAnalyzer()
    this.workflowKnowledgeBase = new WorkflowKnowledgeBase()

    this.initializeConversationPatterns()
    this.initializeResponseTemplates()

    logger.info('Enhanced Conversation Experience initialized with intelligence engines')
  }

  /**
   * Start enhanced conversation session
   */
  async startConversationSession(
    sessionId: string,
    workflowId: string,
    userId: string,
    initialContext: {
      userExpertiseLevel: UserExpertiseLevel
      workflowTranslation?: WorkflowTranslation
      preferences?: Partial<ConversationPreferences>
    }
  ): Promise<ConversationSession> {
    logger.info('Starting enhanced conversation session', {
      sessionId,
      workflowId,
      userId,
      userExpertiseLevel: initialContext.userExpertiseLevel,
    })

    // Load user profile and preferences
    const userProfile = await this.loadUserProfile(userId, initialContext)

    // Initialize conversation state
    const session: ConversationSession = {
      sessionId,
      workflowId,
      userId,
      startTime: new Date(),
      lastInteraction: new Date(),
      userProfile,
      conversationState: {
        conversationPhase: ConversationPhase.DISCOVERY,
        intelligenceLevel: this.determineIntelligenceLevel(userProfile),
        contextStack: [],
        personalizationData: await this.initializePersonalizationData(userId),
      },
      workflowContext: {
        workflowTranslation: initialContext.workflowTranslation,
        userActions: [],
      },
      conversationHistory: [],
      intelligence: {
        patternRecognition: [],
        predictedNeeds: [],
        suggestedActions: [],
        learningInsights: [],
      },
      metrics: {
        totalInteractions: 0,
        averageResponseTime: 0,
        satisfactionRatings: [],
        topicsDiscussed: [],
      },
    }

    // Store session
    this.conversationSessions.set(sessionId, session)

    // Initialize conversation intelligence
    await this.initializeConversationIntelligence(session)

    // Generate welcome message
    const welcomeMessage = await this.generateWelcomeMessage(session)
    await this.addConversationTurn(session, 'assistant', welcomeMessage, 'welcome')

    logger.info('Enhanced conversation session started successfully', {
      sessionId,
      intelligenceLevel: session.conversationState.intelligenceLevel,
      conversationPhase: session.conversationState.conversationPhase,
    })

    return session
  }

  /**
   * Process user message with enhanced intelligence
   */
  async processUserMessage(
    sessionId: string,
    userMessage: string,
    context?: {
      referencedElements?: string[]
      currentWorkflowState?: ExecutionPhase
      recentEvents?: ExecutionEvent[]
    }
  ): Promise<{
    response: string
    suggestions?: string[]
    actions?: SuggestedAction[]
    followUp?: string[]
    conversationPhase?: ConversationPhase
    confidence: number
  }> {
    const session = this.conversationSessions.get(sessionId)
    if (!session) {
      throw new Error(`Conversation session not found: ${sessionId}`)
    }

    logger.debug('Processing user message with enhanced intelligence', {
      sessionId,
      messageLength: userMessage.length,
      currentPhase: session.conversationState.conversationPhase,
      contextProvided: !!context,
    })

    try {
      // Update session timestamp
      session.lastInteraction = new Date()

      // Add user turn to conversation history
      const userTurn = await this.addConversationTurn(session, 'user', userMessage, 'user_message')

      // Analyze user intent and extract entities
      const intentAnalysis = await this.intentRecognizer.analyzeIntent(
        userMessage,
        session,
        context
      )

      // Update conversation context
      await this.contextManager.updateContext(session, {
        userIntent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
        workflowContext: context,
        conversationTurn: userTurn,
      })

      // Generate intelligent response
      const responseGeneration = await this.generateIntelligentResponse(
        session,
        intentAnalysis,
        context
      )

      // Add assistant turn to conversation history
      const assistantTurn = await this.addConversationTurn(
        session,
        'assistant',
        responseGeneration.response,
        intentAnalysis.intent
      )

      // Update personalization data
      await this.personalizationEngine.updatePersonalization(session, {
        userMessage,
        response: responseGeneration.response,
        intentAnalysis,
        satisfaction: undefined, // Will be updated later with user feedback
      })

      // Predict future needs
      const predictedNeeds = await this.predictUserNeeds(session, intentAnalysis)
      session.intelligence.predictedNeeds = predictedNeeds

      // Generate suggestions and actions
      const suggestions = await this.generateSuggestions(session, predictedNeeds)
      const actions = await this.generateSuggestedActions(session, predictedNeeds)

      // Update conversation intelligence
      await this.updateConversationIntelligence(session, {
        userMessage,
        response: responseGeneration.response,
        intentAnalysis,
        context,
      })

      // Update metrics
      this.updateSessionMetrics(session, userTurn, assistantTurn)

      const result = {
        response: responseGeneration.response,
        suggestions: suggestions.slice(0, 3), // Top 3 suggestions
        actions: actions.slice(0, 3), // Top 3 actions
        followUp: responseGeneration.followUp,
        conversationPhase: session.conversationState.conversationPhase,
        confidence: responseGeneration.confidence,
      }

      logger.info('User message processed successfully with enhanced intelligence', {
        sessionId,
        intent: intentAnalysis.intent,
        confidence: result.confidence,
        suggestionsCount: result.suggestions?.length || 0,
        actionsCount: result.actions?.length || 0,
      })

      return result
    } catch (error: any) {
      logger.error('Failed to process user message', {
        sessionId,
        error: error.message,
        userMessageLength: userMessage.length,
      })

      // Generate fallback response
      const fallbackResponse = await this.generateFallbackResponse(session, userMessage, error)
      return {
        response: fallbackResponse,
        confidence: 0.3,
      }
    }
  }

  /**
   * Update workflow execution context
   */
  async updateWorkflowContext(
    sessionId: string,
    executionUpdate: {
      currentState?: ExecutionPhase
      recentEvents?: ExecutionEvent[]
      focusedElements?: string[]
      userActions?: UserAction[]
    }
  ): Promise<void> {
    const session = this.conversationSessions.get(sessionId)
    if (!session) return

    logger.debug('Updating workflow context', {
      sessionId,
      currentState: executionUpdate.currentState,
      eventsCount: executionUpdate.recentEvents?.length || 0,
      focusedElementsCount: executionUpdate.focusedElements?.length || 0,
    })

    // Update workflow context
    if (executionUpdate.currentState) {
      session.workflowContext.currentExecutionState = executionUpdate.currentState
    }

    if (executionUpdate.recentEvents) {
      session.workflowContext.recentEvents = [
        ...(session.workflowContext.recentEvents || []),
        ...executionUpdate.recentEvents,
      ].slice(-10) // Keep last 10 events
    }

    if (executionUpdate.focusedElements) {
      session.workflowContext.focusedElements = executionUpdate.focusedElements
    }

    if (executionUpdate.userActions) {
      session.workflowContext.userActions = [
        ...(session.workflowContext.userActions || []),
        ...executionUpdate.userActions,
      ].slice(-20) // Keep last 20 actions
    }

    // Update conversation phase based on workflow state
    await this.updateConversationPhase(session, executionUpdate)

    // Generate proactive assistance if enabled
    if (session.userProfile.preferences.proactiveAssistance) {
      await this.generateProactiveAssistance(session, executionUpdate)
    }
  }

  /**
   * Generate intelligent response based on context and user profile
   */
  private async generateIntelligentResponse(
    session: ConversationSession,
    intentAnalysis: IntentAnalysis,
    workflowContext?: any
  ): Promise<{
    response: string
    followUp?: string[]
    confidence: number
  }> {
    // Select appropriate response generation strategy
    const strategy = this.selectResponseStrategy(session, intentAnalysis)

    // Generate response using selected strategy
    const response = await this.responseGenerator.generateResponse({
      session,
      intentAnalysis,
      workflowContext,
      strategy,
      personalizationData: session.conversationState.personalizationData,
    })

    // Apply personalization
    const personalizedResponse = await this.personalizationEngine.personalizeResponse(
      response,
      session
    )

    // Generate contextual follow-up suggestions
    const followUp = await this.generateFollowUpSuggestions(
      session,
      intentAnalysis,
      personalizedResponse
    )

    return {
      response: personalizedResponse.text,
      followUp,
      confidence: personalizedResponse.confidence,
    }
  }

  /**
   * Initialize conversation intelligence for new session
   */
  private async initializeConversationIntelligence(session: ConversationSession): Promise<void> {
    // Analyze workflow for conversation opportunities
    if (session.workflowContext.workflowTranslation) {
      const opportunities = await this.analyzeWorkflowConversationOpportunities(
        session.workflowContext.workflowTranslation,
        session.userProfile
      )

      session.intelligence.suggestedActions = opportunities.actions
      session.intelligence.learningInsights = opportunities.insights
    }

    // Load user's conversation patterns
    const userPatterns = await this.loadUserConversationPatterns(session.userId)
    session.intelligence.patternRecognition = userPatterns

    // Initialize personalization
    await this.personalizationEngine.initializePersonalization(session)
  }

  /**
   * Add conversation turn with enhanced metadata
   */
  private async addConversationTurn(
    session: ConversationSession,
    speaker: 'user' | 'assistant',
    content: string,
    intent?: string
  ): Promise<ConversationTurn> {
    const turnId = this.generateTurnId()
    const timestamp = new Date()

    // Analyze content for enhanced metadata
    const metadata = await this.analyzeConversationTurn(content, session, intent)

    // Generate intelligence features
    const intelligence = await this.generateTurnIntelligence(content, session, metadata)

    const turn: ConversationTurn = {
      turnId,
      timestamp,
      speaker,
      content,
      metadata,
      intelligence,
    }

    // Add to conversation history
    session.conversationHistory.push(turn)

    // Maintain conversation history size
    if (session.conversationHistory.length > 100) {
      session.conversationHistory = session.conversationHistory.slice(-100)
    }

    // Update conversation memory
    await this.updateConversationMemory(session, turn)

    return turn
  }

  // Helper methods and implementations

  private async loadUserProfile(
    userId: string,
    initialContext: any
  ): Promise<ConversationSession['userProfile']> {
    // Load from user preferences service or database
    return {
      expertiseLevel: initialContext.userExpertiseLevel,
      preferences: {
        communicationStyle: 'friendly',
        responseLength: 'standard',
        interactionFrequency: 'moderate',
        learningSupport: true,
        proactiveAssistance: true,
        contextualHelp: true,
        visualDescriptions: false,
        performanceInsights: true,
        troubleshootingGuidance: true,
        personalization: true,
        ...initialContext.preferences,
      },
    }
  }

  private determineIntelligenceLevel(
    userProfile: ConversationSession['userProfile']
  ): ConversationIntelligenceLevel {
    if (userProfile.preferences.personalization && userProfile.preferences.proactiveAssistance) {
      return ConversationIntelligenceLevel.ADAPTIVE
    }
    if (userProfile.preferences.proactiveAssistance) {
      return ConversationIntelligenceLevel.PROACTIVE
    }
    if (userProfile.preferences.contextualHelp) {
      return ConversationIntelligenceLevel.CONTEXTUAL
    }
    return ConversationIntelligenceLevel.BASIC
  }

  private async initializePersonalizationData(userId: string): Promise<PersonalizationData> {
    // Load from personalization service
    return {
      communicationPatterns: {
        preferredQuestionTypes: [],
        responseComplexityPreference: 0.5,
        topicInterests: new Map(),
        interactionTimingPreference: [],
      },
      learningProgress: {
        conceptsUnderstood: new Set(),
        conceptsNeedingWork: new Set(),
        learningVelocity: 0.5,
        preferredLearningStyle: 'mixed',
      },
      workflowFamiliarity: {
        elementExpertise: new Map(),
        patternRecognition: new Map(),
        troubleshootingSkills: new Map(),
      },
      adaptationHistory: [],
    }
  }

  private async generateWelcomeMessage(session: ConversationSession): Promise<string> {
    const workflowName =
      session.workflowContext.workflowTranslation?.workflowConversation?.introduction ||
      'your workflow'

    switch (session.userProfile.expertiseLevel) {
      case UserExpertiseLevel.NOVICE:
        return `Hello! I'm here to help you understand and work with ${workflowName}. I can explain how everything works in simple terms, guide you through each step, and answer any questions you have. What would you like to know first?`

      case UserExpertiseLevel.TECHNICAL:
        return `Technical workflow assistance ready. I can provide detailed implementation information, configuration schemas, performance metrics, and debugging support for ${workflowName}. How can I assist with your technical requirements?`

      default:
        return `Welcome! I'm your intelligent workflow assistant for ${workflowName}. I can help you understand how it works, guide you through execution, troubleshoot issues, and optimize performance. What can I help you with today?`
    }
  }

  private selectResponseStrategy(
    session: ConversationSession,
    intentAnalysis: IntentAnalysis
  ): ResponseStrategy {
    // Implementation for selecting appropriate response strategy
    return ResponseStrategy.CONTEXTUAL_EXPLANATION
  }

  private async generateFollowUpSuggestions(
    session: ConversationSession,
    intentAnalysis: IntentAnalysis,
    response: any
  ): Promise<string[]> {
    // Generate contextual follow-up suggestions
    return [
      'Would you like to explore this in more detail?',
      "Are there other aspects you'd like to understand?",
      'Should we look at related workflow components?',
    ]
  }

  private async predictUserNeeds(
    session: ConversationSession,
    intentAnalysis: IntentAnalysis
  ): Promise<PredictedNeed[]> {
    // Predict user needs based on conversation context
    return []
  }

  private async generateSuggestions(
    session: ConversationSession,
    predictedNeeds: PredictedNeed[]
  ): Promise<string[]> {
    return predictedNeeds.slice(0, 3).map((need) => need.suggestedResponse)
  }

  private async generateSuggestedActions(
    session: ConversationSession,
    predictedNeeds: PredictedNeed[]
  ): Promise<SuggestedAction[]> {
    return []
  }

  private async updateConversationIntelligence(
    session: ConversationSession,
    updateData: any
  ): Promise<void> {
    // Update conversation intelligence based on interaction
  }

  private updateSessionMetrics(
    session: ConversationSession,
    userTurn: ConversationTurn,
    assistantTurn: ConversationTurn
  ): void {
    session.metrics.totalInteractions++

    if (assistantTurn.metadata.responseTime) {
      const currentAvg = session.metrics.averageResponseTime
      const count = session.metrics.totalInteractions
      session.metrics.averageResponseTime =
        (currentAvg * (count - 1) + assistantTurn.metadata.responseTime) / count
    }
  }

  private async generateFallbackResponse(
    session: ConversationSession,
    userMessage: string,
    error: Error
  ): Promise<string> {
    return "I apologize, but I encountered an issue processing your message. Could you please rephrase your question, or let me know if you'd like help with a specific aspect of your workflow?"
  }

  private initializeConversationPatterns(): void {
    // Initialize common conversation patterns
  }

  private initializeResponseTemplates(): void {
    // Initialize response templates
  }

  private generateTurnId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  // Additional methods would be implemented here for:
  // - analyzeConversationTurn
  // - generateTurnIntelligence
  // - updateConversationMemory
  // - updateConversationPhase
  // - generateProactiveAssistance
  // - analyzeWorkflowConversationOpportunities
  // - loadUserConversationPatterns
}

// Supporting classes and interfaces

class IntentRecognizer {
  async analyzeIntent(
    message: string,
    session: ConversationSession,
    context?: any
  ): Promise<IntentAnalysis> {
    return {
      intent: 'general_question',
      confidence: 0.8,
      entities: [],
      context: context || {},
    }
  }
}

class ContextManager {
  async updateContext(session: ConversationSession, update: any): Promise<void> {
    // Context management implementation
  }
}

class PersonalizationEngine {
  async updatePersonalization(session: ConversationSession, data: any): Promise<void> {
    // Personalization update implementation
  }

  async personalizeResponse(response: any, session: ConversationSession): Promise<any> {
    return {
      text: response,
      confidence: 0.8,
    }
  }

  async initializePersonalization(session: ConversationSession): Promise<void> {
    // Personalization initialization
  }
}

class ResponseGenerator {
  async generateResponse(params: any): Promise<string> {
    return "I understand your question and I'm here to help with your workflow."
  }
}

class LearningAnalyzer {
  // Learning analysis implementation
}

class WorkflowKnowledgeBase {
  // Workflow knowledge base implementation
}

interface IntentAnalysis {
  intent: string
  confidence: number
  entities: Array<{
    type: string
    value: string
    confidence: number
  }>
  context: Record<string, any>
}

interface ConversationMemory {
  sessionId: string
  recentTopics: string[]
  importantConcepts: Set<string>
  userPreferences: Record<string, any>
  conversationPatterns: ConversationPattern[]
}

enum ResponseStrategy {
  DIRECT_ANSWER = 'direct_answer',
  CONTEXTUAL_EXPLANATION = 'contextual_explanation',
  GUIDED_DISCOVERY = 'guided_discovery',
  EDUCATIONAL_JOURNEY = 'educational_journey',
  TROUBLESHOOTING_MODE = 'troubleshooting_mode',
  PROACTIVE_ASSISTANCE = 'proactive_assistance',
}

/**
 * Singleton service instance
 */
export const enhancedConversationExperience = new EnhancedConversationExperience()
