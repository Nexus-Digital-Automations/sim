/**
 * AI Help Engine - Intelligent Chatbot with Contextual Awareness
 *
 * Advanced conversational AI system providing contextual help through natural language interaction.
 * Integrates with Claude AI for sophisticated natural language understanding and response generation.
 *
 * Key Features:
 * - Contextual conversation management with workflow awareness
 * - Natural language intent recognition and entity extraction
 * - Integration with semantic search for knowledge retrieval
 * - Multi-turn conversation memory and context preservation
 * - Proactive assistance based on user behavior patterns
 *
 * Performance Targets:
 * - <2s response time for conversational queries
 * - 90%+ intent recognition accuracy
 * - Context retention across conversation sessions
 *
 * Dependencies: Claude AI API, SemanticSearchService, conversation storage
 * Usage: Interactive help, conversational troubleshooting, guided assistance
 */

import type { Logger } from '@/lib/monitoring/logger'
import type { SemanticSearchService } from './semantic-search'

export interface ChatbotConfig {
  claudeApiKey: string
  model: string
  maxTokens: number
  temperature: number
  conversationTimeout: number
  maxConversationHistory: number
  enableProactiveAssistance: boolean
  enableContextRetention: boolean
}

export interface ConversationContext {
  userId: string
  sessionId: string
  workflowContext?: {
    type: string
    currentStep: string
    blockTypes: string[]
    completedSteps: string[]
    errors: ConversationError[]
    timeSpent: number
  }
  userProfile?: {
    expertiseLevel: 'beginner' | 'intermediate' | 'expert'
    preferredLanguage: string
    previousInteractions: number
    commonIssues: string[]
  }
  conversationHistory: ConversationMessage[]
  lastActivity: Date
  metadata?: Record<string, any>
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  intent?: DetectedIntent
  entities?: ExtractedEntity[]
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ConversationError {
  code: string
  message: string
  context: string
  timestamp: Date
  resolved: boolean
}

export interface DetectedIntent {
  name: string
  confidence: number
  parameters?: Record<string, any>
  domain?: string
}

export interface ExtractedEntity {
  type: string
  value: string
  confidence: number
  startOffset: number
  endOffset: number
}

export interface ChatResponse {
  message: string
  intent: DetectedIntent | null
  suggestedActions?: SuggestedAction[]
  relatedContent?: RelatedContent[]
  conversationState: ConversationState
  metadata?: Record<string, any>
}

export interface SuggestedAction {
  type: 'navigation' | 'tutorial' | 'documentation' | 'contact_support'
  title: string
  description: string
  action: string
  priority: number
}

export interface RelatedContent {
  id: string
  title: string
  type: 'article' | 'tutorial' | 'video' | 'faq'
  url: string
  relevanceScore: number
}

export interface ConversationState {
  phase:
    | 'greeting'
    | 'problem_identification'
    | 'solution_exploration'
    | 'implementation'
    | 'resolution'
  confidence: number
  needsEscalation: boolean
  resolvedIssues: string[]
  pendingActions: string[]
}

/**
 * Intelligent chatbot providing contextual conversational assistance
 */
export class IntelligentChatbot {
  private conversations: Map<string, ConversationContext> = new Map()
  private intentClassifier: IntentClassifier
  private entityExtractor: EntityExtractor
  private responseGenerator: ResponseGenerator
  private logger: Logger

  constructor(
    private config: ChatbotConfig,
    private semanticSearch: SemanticSearchService,
    logger: Logger
  ) {
    this.logger = logger.child({ service: 'IntelligentChatbot' })

    this.intentClassifier = new IntentClassifier(config, logger)
    this.entityExtractor = new EntityExtractor(logger)
    this.responseGenerator = new ResponseGenerator(config, semanticSearch, logger)

    this.setupConversationCleanup()

    this.logger.info('IntelligentChatbot initialized', {
      model: config.model,
      maxTokens: config.maxTokens,
      conversationTimeout: config.conversationTimeout,
    })
  }

  /**
   * Process user message and generate intelligent response
   * @param userId - User identifier
   * @param sessionId - Conversation session identifier
   * @param message - User's message
   * @param context - Additional context information
   * @returns Promise<ChatResponse> - Generated response with suggestions
   */
  async processMessage(
    userId: string,
    sessionId: string,
    message: string,
    context?: Partial<ConversationContext>
  ): Promise<ChatResponse> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Processing chat message`, {
      userId,
      sessionId,
      messageLength: message.length,
      hasContext: !!context,
    })

    try {
      // Get or create conversation context
      const conversationContext = this.getOrCreateConversation(userId, sessionId, context)

      // Detect intent and extract entities
      const [intent, entities] = await Promise.all([
        this.intentClassifier.classify(message, conversationContext),
        this.entityExtractor.extract(message, conversationContext),
      ])

      // Create conversation message
      const conversationMessage: ConversationMessage = {
        id: this.generateMessageId(),
        role: 'user',
        content: message,
        intent,
        entities,
        timestamp: new Date(),
      }

      // Add to conversation history
      conversationContext.conversationHistory.push(conversationMessage)
      conversationContext.lastActivity = new Date()

      // Generate response based on intent and context
      const response = await this.generateResponse(
        conversationMessage,
        conversationContext,
        operationId
      )

      // Update conversation state
      conversationContext.conversationHistory.push({
        id: this.generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: response.metadata,
      })

      // Trim conversation history if needed
      this.trimConversationHistory(conversationContext)

      // Update stored conversation
      this.conversations.set(this.getConversationKey(userId, sessionId), conversationContext)

      const processingTime = Date.now() - startTime
      this.logger.info(`[${operationId}] Chat message processed`, {
        intent: intent?.name,
        entitiesCount: entities.length,
        responseLength: response.message.length,
        processingTimeMs: processingTime,
      })

      return response
    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.error(`[${operationId}] Chat message processing failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        sessionId,
        processingTimeMs: processingTime,
      })

      // Return error response
      return this.generateErrorResponse(error, operationId)
    }
  }

  /**
   * Generate proactive assistance suggestions based on workflow context
   * @param userId - User identifier
   * @param workflowContext - Current workflow state
   * @returns Promise<ChatResponse | null> - Proactive assistance or null
   */
  async generateProactiveAssistance(
    userId: string,
    workflowContext: ConversationContext['workflowContext']
  ): Promise<ChatResponse | null> {
    if (!this.config.enableProactiveAssistance || !workflowContext) {
      return null
    }

    const operationId = this.generateOperationId()

    this.logger.info(`[${operationId}] Generating proactive assistance`, {
      userId,
      workflowType: workflowContext.type,
      currentStep: workflowContext.currentStep,
      errorCount: workflowContext.errors.length,
    })

    try {
      // Analyze context for proactive triggers
      const triggers = this.analyzeProactiveTriggers(workflowContext)

      if (triggers.length === 0) {
        return null
      }

      // Generate proactive assistance message
      const message = await this.generateProactiveMessage(triggers, workflowContext)

      // Find related content
      const relatedContent = await this.findRelatedContent(triggers, workflowContext)

      return {
        message,
        intent: {
          name: 'proactive_assistance',
          confidence: 0.95,
          parameters: { triggers: triggers.map((t) => t.type) },
        },
        suggestedActions: this.generateProactiveSuggestedActions(triggers),
        relatedContent,
        conversationState: {
          phase: 'problem_identification',
          confidence: 0.8,
          needsEscalation: false,
          resolvedIssues: [],
          pendingActions: triggers.map((t) => t.suggestedAction),
        },
      }
    } catch (error) {
      this.logger.error(`[${operationId}] Proactive assistance generation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      })
      return null
    }
  }

  /**
   * Get conversation history for a user session
   * @param userId - User identifier
   * @param sessionId - Session identifier
   * @returns ConversationContext | null - Conversation context or null
   */
  getConversationHistory(userId: string, sessionId: string): ConversationContext | null {
    const key = this.getConversationKey(userId, sessionId)
    return this.conversations.get(key) || null
  }

  /**
   * Clear conversation history for a user session
   * @param userId - User identifier
   * @param sessionId - Session identifier
   */
  clearConversation(userId: string, sessionId: string): void {
    const key = this.getConversationKey(userId, sessionId)
    this.conversations.delete(key)

    this.logger.info('Conversation cleared', { userId, sessionId })
  }

  /**
   * Get chatbot metrics and statistics
   */
  getMetrics() {
    const activeConversations = this.conversations.size
    const totalMessages = Array.from(this.conversations.values()).reduce(
      (sum, conv) => sum + conv.conversationHistory.length,
      0
    )

    return {
      activeConversations,
      totalMessages,
      averageMessagesPerConversation:
        activeConversations > 0 ? totalMessages / activeConversations : 0,
      config: {
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        conversationTimeout: this.config.conversationTimeout,
      },
    }
  }

  // Private Methods

  private getOrCreateConversation(
    userId: string,
    sessionId: string,
    context?: Partial<ConversationContext>
  ): ConversationContext {
    const key = this.getConversationKey(userId, sessionId)
    let conversation = this.conversations.get(key)

    if (!conversation) {
      conversation = {
        userId,
        sessionId,
        conversationHistory: [],
        lastActivity: new Date(),
        ...context,
      }
    } else {
      // Update context if provided
      if (context) {
        conversation = { ...conversation, ...context }
      }
    }

    return conversation
  }

  private async generateResponse(
    message: ConversationMessage,
    context: ConversationContext,
    operationId: string
  ): Promise<ChatResponse> {
    // Delegate to response generator
    return await this.responseGenerator.generate(message, context, operationId)
  }

  private analyzeProactiveTriggers(workflowContext: ConversationContext['workflowContext']) {
    if (!workflowContext) return []

    const triggers = []

    // Time-based triggers
    if (workflowContext.timeSpent > 300000) {
      // 5 minutes
      triggers.push({
        type: 'time_spent',
        severity: 'medium',
        message: "You've been working on this step for a while",
        suggestedAction: 'offer_help',
      })
    }

    // Error-based triggers
    if (workflowContext.errors.length > 2) {
      triggers.push({
        type: 'repeated_errors',
        severity: 'high',
        message: "I noticed you're encountering some errors",
        suggestedAction: 'troubleshoot',
      })
    }

    // Step completion triggers
    const completionRate =
      workflowContext.completedSteps.length / (workflowContext.completedSteps.length + 1) // +1 for current step

    if (completionRate < 0.3) {
      triggers.push({
        type: 'low_completion',
        severity: 'medium',
        message: 'Would you like some guidance to get started?',
        suggestedAction: 'provide_guidance',
      })
    }

    return triggers
  }

  private async generateProactiveMessage(triggers: any[], workflowContext: any): Promise<string> {
    // Simple template-based message generation
    // In production, this would use more sophisticated NLG

    if (triggers.some((t) => t.type === 'repeated_errors')) {
      return "I noticed you're encountering some errors. Would you like me to help troubleshoot the issue?"
    }

    if (triggers.some((t) => t.type === 'time_spent')) {
      return "You've been working on this step for a while. Can I help you move forward?"
    }

    if (triggers.some((t) => t.type === 'low_completion')) {
      return 'Would you like some guidance to help you get started with this workflow?'
    }

    return "I'm here to help if you need any assistance with your current workflow."
  }

  private generateProactiveSuggestedActions(triggers: any[]): SuggestedAction[] {
    const actions: SuggestedAction[] = []

    if (triggers.some((t) => t.type === 'repeated_errors')) {
      actions.push({
        type: 'tutorial',
        title: 'View Troubleshooting Guide',
        description: 'Learn how to diagnose and fix common issues',
        action: 'show_troubleshooting',
        priority: 1,
      })
    }

    if (triggers.some((t) => t.type === 'time_spent')) {
      actions.push({
        type: 'tutorial',
        title: 'Quick Start Guide',
        description: 'Get up to speed quickly with this step',
        action: 'show_quick_start',
        priority: 2,
      })
    }

    return actions
  }

  private async findRelatedContent(
    triggers: any[],
    workflowContext: any
  ): Promise<RelatedContent[]> {
    const queries = triggers.map((trigger) => {
      switch (trigger.type) {
        case 'repeated_errors':
          return `troubleshooting ${workflowContext.type}`
        case 'time_spent':
          return `${workflowContext.currentStep} guide`
        case 'low_completion':
          return `getting started with ${workflowContext.type}`
        default:
          return `${workflowContext.type} help`
      }
    })

    const searchResults = await Promise.all(
      queries.map((query) =>
        this.semanticSearch.search(
          query,
          {
            workflowType: workflowContext.type,
          },
          { maxResults: 3 }
        )
      )
    )

    const allResults = searchResults.flat()
    const unique = new Map()

    allResults.forEach((result) => {
      if (!unique.has(result.id)) {
        unique.set(result.id, {
          id: result.id,
          title: result.title,
          type: 'article' as const,
          url: `/help/${result.id}`,
          relevanceScore: result.score,
        })
      }
    })

    return Array.from(unique.values()).slice(0, 5)
  }

  private generateErrorResponse(error: any, operationId: string): ChatResponse {
    return {
      message:
        "I'm sorry, I encountered an issue processing your request. Please try rephrasing your question or contact support if the problem persists.",
      intent: null,
      suggestedActions: [
        {
          type: 'contact_support',
          title: 'Contact Support',
          description: 'Get help from our support team',
          action: 'contact_support',
          priority: 1,
        },
      ],
      conversationState: {
        phase: 'greeting',
        confidence: 0,
        needsEscalation: true,
        resolvedIssues: [],
        pendingActions: ['contact_support'],
      },
      metadata: {
        error: true,
        operationId,
      },
    }
  }

  private trimConversationHistory(context: ConversationContext): void {
    if (context.conversationHistory.length > this.config.maxConversationHistory) {
      const excess = context.conversationHistory.length - this.config.maxConversationHistory
      context.conversationHistory.splice(0, excess)
    }
  }

  private getConversationKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private setupConversationCleanup(): void {
    // Clean up old conversations every hour
    setInterval(() => {
      const now = Date.now()
      let cleaned = 0

      for (const [key, conversation] of this.conversations.entries()) {
        const timeSinceLastActivity = now - conversation.lastActivity.getTime()
        if (timeSinceLastActivity > this.config.conversationTimeout) {
          this.conversations.delete(key)
          cleaned++
        }
      }

      if (cleaned > 0) {
        this.logger.info('Conversation cleanup completed', {
          conversationsCleaned: cleaned,
          activeConversations: this.conversations.size,
        })
      }
    }, 3600000) // 1 hour
  }
}

/**
 * Intent classification service for understanding user queries
 */
class IntentClassifier {
  private logger: Logger

  constructor(
    private config: ChatbotConfig,
    logger: Logger
  ) {
    this.logger = logger.child({ service: 'IntentClassifier' })
  }

  async classify(message: string, context: ConversationContext): Promise<DetectedIntent | null> {
    // Simple intent classification based on patterns
    // In production, this would use ML models or Claude API for intent recognition

    const normalizedMessage = message.toLowerCase().trim()

    // Help/support intents
    if (normalizedMessage.includes('help') || normalizedMessage.includes('assist')) {
      return {
        name: 'request_help',
        confidence: 0.9,
        domain: 'support',
      }
    }

    // Error/troubleshooting intents
    if (
      normalizedMessage.includes('error') ||
      normalizedMessage.includes('problem') ||
      normalizedMessage.includes('issue') ||
      normalizedMessage.includes('bug')
    ) {
      return {
        name: 'report_issue',
        confidence: 0.85,
        domain: 'troubleshooting',
      }
    }

    // How-to/tutorial intents
    if (
      normalizedMessage.includes('how to') ||
      normalizedMessage.includes('how do i') ||
      normalizedMessage.includes('tutorial') ||
      normalizedMessage.includes('guide')
    ) {
      return {
        name: 'request_tutorial',
        confidence: 0.8,
        domain: 'learning',
      }
    }

    // Configuration intents
    if (
      normalizedMessage.includes('setup') ||
      normalizedMessage.includes('configure') ||
      normalizedMessage.includes('settings') ||
      normalizedMessage.includes('config')
    ) {
      return {
        name: 'configuration_help',
        confidence: 0.75,
        domain: 'configuration',
      }
    }

    return null
  }
}

/**
 * Entity extraction service for identifying key information in user messages
 */
class EntityExtractor {
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger.child({ service: 'EntityExtractor' })
  }

  async extract(message: string, context: ConversationContext): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = []

    // Extract workflow types
    const workflowTypes = ['automation', 'integration', 'webhook', 'api', 'database']
    for (const type of workflowTypes) {
      const index = message.toLowerCase().indexOf(type)
      if (index !== -1) {
        entities.push({
          type: 'workflow_type',
          value: type,
          confidence: 0.9,
          startOffset: index,
          endOffset: index + type.length,
        })
      }
    }

    // Extract block types
    const blockTypes = ['trigger', 'action', 'condition', 'transform', 'loop']
    for (const type of blockTypes) {
      const index = message.toLowerCase().indexOf(type)
      if (index !== -1) {
        entities.push({
          type: 'block_type',
          value: type,
          confidence: 0.85,
          startOffset: index,
          endOffset: index + type.length,
        })
      }
    }

    return entities
  }
}

/**
 * Response generation service using Claude AI for natural language responses
 */
class ResponseGenerator {
  private logger: Logger
  private claudeApiClient: ClaudeAPIClient

  constructor(
    private config: ChatbotConfig,
    private semanticSearch: SemanticSearchService,
    logger: Logger
  ) {
    this.logger = logger.child({ service: 'ResponseGenerator' })
    this.claudeApiClient = new ClaudeAPIClient(config.claudeApiKey, logger)
  }

  async generate(
    message: ConversationMessage,
    context: ConversationContext,
    operationId: string
  ): Promise<ChatResponse> {
    const startTime = Date.now()
    
    try {
      // Find relevant content using semantic search
      const relatedContent = await this.findRelatedContent(message, context)

      // Build comprehensive context for Claude
      const claudeContext = this.buildClaudeContext(message, context, relatedContent)

      // Generate response using Claude AI with streaming support
      const response = await this.generateClaudeResponse(
        message.content,
        claudeContext,
        operationId
      )

      // Generate suggested actions based on intent and context
      const suggestedActions = await this.generateIntelligentSuggestedActions(
        message.intent,
        context,
        response
      )

      const processingTime = Date.now() - startTime

      this.logger.info(`[${operationId}] Response generation completed`, {
        processingTimeMs: processingTime,
        responseLength: response.length,
        suggestedActionsCount: suggestedActions.length,
        relatedContentCount: relatedContent.length
      })

      return {
        message: response,
        intent: message.intent,
        suggestedActions,
        relatedContent: relatedContent.map((result) => ({
          id: result.id,
          title: result.title,
          type: 'article' as const,
          url: `/help/${result.id}`,
          relevanceScore: result.score,
        })),
        conversationState: this.determineConversationState(message, context, response),
        metadata: {
          processingTime,
          operationId,
          modelUsed: this.config.model,
          contextSize: claudeContext.length
        }
      }
    } catch (error) {
      this.logger.error(`[${operationId}] Response generation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      })
      throw error
    }
  }

  private async findRelatedContent(message: ConversationMessage, context: ConversationContext) {
    const searchContext = {
      workflowType: context.workflowContext?.type,
      blockType: context.workflowContext?.blockTypes?.[0],
      userRole: context.userProfile?.expertiseLevel,
      userId: context.userId,
    }

    return await this.semanticSearch.search(message.content, searchContext, { maxResults: 5 })
  }

  private buildClaudeContext(
    message: ConversationMessage, 
    context: ConversationContext, 
    relatedContent: any[]
  ): string {
    const contextParts = []
    
    // Add conversation history for context
    if (context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-5) // Last 5 messages
      contextParts.push(`Previous conversation:\n${recentHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n')}`)
    }
    
    // Add workflow context
    if (context.workflowContext) {
      contextParts.push(`Current workflow context:
- Type: ${context.workflowContext.type}
- Current step: ${context.workflowContext.currentStep}
- Completed steps: ${context.workflowContext.completedSteps?.join(', ') || 'none'}
- Recent errors: ${context.workflowContext.errors?.length || 0} errors
- Time spent: ${Math.round((context.workflowContext.timeSpent || 0) / 1000)}s`)
    }
    
    // Add user profile context
    if (context.userProfile) {
      contextParts.push(`User profile:
- Expertise level: ${context.userProfile.expertiseLevel || 'unknown'}
- Previous interactions: ${context.userProfile.previousInteractions || 0}
- Common issues: ${context.userProfile.commonIssues?.join(', ') || 'none'}`)
    }
    
    // Add related content context
    if (relatedContent.length > 0) {
      contextParts.push(`Relevant documentation:
${relatedContent.slice(0, 3).map(content => `- ${content.title} (score: ${content.score})`).join('\n')}`)
    }
    
    return contextParts.join('\n\n')
  }

  private async generateClaudeResponse(
    message: string,
    context: string,
    operationId: string
  ): Promise<string> {
    try {
      const prompt = this.buildClaudePrompt(message, context)
      
      const response = await this.claudeApiClient.generateResponse({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
      
      return response.content || this.getFallbackResponse(message)
    } catch (error) {
      this.logger.error(`[${operationId}] Claude API call failed`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return this.getFallbackResponse(message)
    }
  }
  
  private buildClaudePrompt(message: string, context: string): string {
    return `You are an AI assistant helping users with workflow automation, integrations, and troubleshooting. You have access to the following context:

${context}

Current user message: "${message}"

Please provide a helpful, accurate, and contextually relevant response. Be concise but thorough. If you can provide specific steps or solutions, please do so. If you need more information, ask clarifying questions.

Response:`
  }
  
  private getFallbackResponse(message: string): string {
    const normalizedMessage = message.toLowerCase()
    
    if (normalizedMessage.includes('error') || normalizedMessage.includes('problem')) {
      return "I understand you're experiencing an issue. Can you provide more details about what happened and any error messages you saw? I'll help you troubleshoot this step by step."
    }
    
    if (normalizedMessage.includes('how to') || normalizedMessage.includes('tutorial')) {
      return "I'd be happy to guide you through that process! Can you tell me more specifically what you're trying to accomplish? I can provide step-by-step instructions."
    }
    
    return "I'm here to help with your workflow automation needs. Could you provide more details about what you're trying to accomplish? I can offer specific guidance based on your situation."
  }

  private async generateIntelligentSuggestedActions(
    intent: DetectedIntent | undefined,
    context: ConversationContext,
    response: string
  ): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = []
    
    // Intent-based actions
    if (intent) {
      switch (intent.name) {
        case 'request_help':
          actions.push({
            type: 'documentation',
            title: 'Browse Help Center',
            description: 'Explore comprehensive documentation',
            action: '/help/docs',
            priority: 1,
          })
          break
          
        case 'report_issue':
          actions.push({
            type: 'tutorial',
            title: 'Troubleshooting Guide',
            description: 'Step-by-step problem resolution',
            action: '/help/troubleshooting',
            priority: 1,
          })
          if (context.workflowContext?.errors && context.workflowContext.errors.length > 0) {
            actions.push({
              type: 'tutorial',
              title: 'View Error Details',
              description: 'Analyze specific error information',
              action: 'show_error_details',
              priority: 2,
            })
          }
          break
          
        case 'request_tutorial':
          actions.push({
            type: 'tutorial',
            title: 'Interactive Tutorial',
            description: 'Learn with hands-on examples',
            action: '/help/tutorials',
            priority: 1,
          })
          break
          
        case 'configuration_help':
          actions.push({
            type: 'documentation',
            title: 'Configuration Guide',
            description: 'Setup and configuration instructions',
            action: '/help/configuration',
            priority: 1,
          })
          break
      }
    }
    
    // Context-based actions
    if (context.workflowContext) {
      const workflowType = context.workflowContext.type
      
      actions.push({
        type: 'documentation',
        title: `${workflowType} Documentation`,
        description: `Specific help for ${workflowType} workflows`,
        action: `/help/workflows/${workflowType}`,
        priority: 2,
      })
      
      // If user is stuck on a step
      if (context.workflowContext.timeSpent && context.workflowContext.timeSpent > 300000) {
        actions.push({
          type: 'tutorial',
          title: 'Video Tutorial',
          description: 'Watch a step-by-step video guide',
          action: `/help/videos/${workflowType}`,
          priority: 1,
        })
      }
    }
    
    // User profile-based actions
    if (context.userProfile?.expertiseLevel === 'beginner') {
      actions.push({
        type: 'tutorial',
        title: 'Getting Started Guide',
        description: 'Beginner-friendly introduction',
        action: '/help/getting-started',
        priority: 3,
      })
    }
    
    // Always offer support contact for complex issues
    if (intent?.name === 'report_issue' || (context.workflowContext?.errors?.length || 0) > 2) {
      actions.push({
        type: 'contact_support',
        title: 'Contact Support',
        description: 'Get help from our support team',
        action: 'contact_support',
        priority: 4,
      })
    }
    
    return actions.sort((a, b) => a.priority - b.priority)
  }

  private generateSuggestedActions(intent: DetectedIntent | undefined): SuggestedAction[] {
    if (!intent) return []

    const actions: SuggestedAction[] = []

    switch (intent.name) {
      case 'request_help':
        actions.push({
          type: 'documentation',
          title: 'View Documentation',
          description: 'Browse comprehensive help articles',
          action: 'show_docs',
          priority: 1,
        })
        break

      case 'report_issue':
        actions.push({
          type: 'tutorial',
          title: 'Troubleshooting Guide',
          description: 'Step-by-step problem resolution',
          action: 'show_troubleshooting',
          priority: 1,
        })
        break

      case 'request_tutorial':
        actions.push({
          type: 'tutorial',
          title: 'Interactive Tutorial',
          description: 'Learn with hands-on examples',
          action: 'start_tutorial',
          priority: 1,
        })
        break
    }

    return actions
  }

  private determineConversationState(
    message: ConversationMessage,
    context: ConversationContext,
    response: string
  ): ConversationState {
    const conversationLength = context.conversationHistory.length
    const hasErrors = context.workflowContext?.errors?.length || 0 > 0
    const timeSpent = context.workflowContext?.timeSpent || 0
    
    // Determine phase based on conversation flow and context
    let phase: ConversationState['phase'] = 'greeting'
    let confidence = 0.7
    let needsEscalation = false
    const resolvedIssues: string[] = []
    const pendingActions: string[] = []
    
    // Phase determination logic
    if (conversationLength <= 1) {
      phase = 'greeting'
      confidence = 0.9
    } else if (message.intent?.name === 'report_issue' || hasErrors) {
      phase = 'problem_identification'
      confidence = 0.8
      
      if (hasErrors && timeSpent > 600000) { // 10 minutes
        needsEscalation = true
        pendingActions.push('consider_support_escalation')
      }
      
      pendingActions.push('gather_error_details', 'analyze_root_cause')
    } else if (message.intent?.name === 'request_tutorial' || 
               message.intent?.name === 'configuration_help') {
      phase = 'solution_exploration'
      confidence = 0.85
      pendingActions.push('provide_guidance', 'check_understanding')
    } else if (response.includes('step') || response.includes('guide')) {
      phase = 'implementation'
      confidence = 0.75
      pendingActions.push('monitor_progress', 'provide_assistance')
    } else {
      // Determine based on conversation context
      const hasQuestions = response.includes('?')
      const hasInstructions = response.includes('step') || response.includes('try')
      
      if (hasQuestions && conversationLength < 3) {
        phase = 'problem_identification'
        confidence = 0.7
      } else if (hasInstructions) {
        phase = 'implementation'
        confidence = 0.8
      } else {
        phase = 'solution_exploration'
        confidence = 0.75
      }
    }
    
    // Check for resolution indicators
    if (response.toLowerCase().includes('solved') || 
        response.toLowerCase().includes('resolved') ||
        response.toLowerCase().includes('working now')) {
      phase = 'resolution'
      confidence = 0.9
      if (message.intent?.name === 'report_issue') {
        resolvedIssues.push('reported_issue')
      }
    }
    
    // Escalation triggers
    if (conversationLength > 10 || 
        (hasErrors && timeSpent > 1200000) || // 20 minutes
        context.workflowContext?.errors?.filter(e => !e.resolved).length || 0 > 3) {
      needsEscalation = true
    }
    
    return {
      phase,
      confidence,
      needsEscalation,
      resolvedIssues,
      pendingActions,
    }
  }
}

/**
 * Claude API Client for generating sophisticated conversational responses
 */
class ClaudeAPIClient {
  private logger: Logger

  constructor(
    private apiKey: string,
    logger: Logger
  ) {
    this.logger = logger.child({ service: 'ClaudeAPIClient' })
  }

  async generateResponse(request: {
    model: string
    max_tokens: number
    temperature: number
    messages: Array<{
      role: 'user' | 'assistant'
      content: string
    }>
  }): Promise<{ content: string }> {
    const operationId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Generating Claude response`, {
      model: request.model,
      maxTokens: request.max_tokens,
      temperature: request.temperature,
      messageCount: request.messages.length,
    })

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.max_tokens,
          temperature: request.temperature,
          messages: request.messages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const processingTime = Date.now() - startTime

      this.logger.info(`[${operationId}] Claude response generated successfully`, {
        responseLength: data.content?.[0]?.text?.length || 0,
        usage: data.usage,
        processingTimeMs: processingTime,
      })

      return {
        content: data.content?.[0]?.text || '',
      }
    } catch (error) {
      const processingTime = Date.now() - startTime

      this.logger.error(`[${operationId}] Claude API call failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
      })

      throw error
    }
  }
}

export default IntelligentChatbot
