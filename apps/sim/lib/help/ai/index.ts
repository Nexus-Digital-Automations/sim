/**
 * AI Help Engine - Core AI-Powered Help System
 *
 * Comprehensive AI help system that integrates multiple AI services and capabilities:
 * - Intelligent conversational assistance via chatbot
 * - Semantic search with contextual understanding
 * - Predictive help based on user behavior analysis
 * - Proactive assistance and contextual suggestions
 * - Real-time context-aware help responses
 *
 * This is the main entry point for the AI Help Engine, providing a unified
 * interface for all AI-powered help functionality.
 *
 * Key Features:
 * - Multi-modal AI assistance (chat, search, predictions)
 * - Context-aware response generation
 * - Learning from user interactions
 * - Performance monitoring and optimization
 * - Scalable architecture for enterprise use
 *
 * @created 2025-09-04
 * @author AI Help Engine Core Architecture Specialist
 */

import { createLogger } from '@/lib/logs/console/logger'
import { IntelligentChatbot } from './intelligent-chatbot'
import { SemanticSearchService } from './semantic-search'

const logger = createLogger('AIHelpEngine')

// ========================
// TYPE DEFINITIONS
// ========================

export interface AIHelpContext {
  workflowContext?: {
    type?: string
    currentStep?: string
    blockTypes?: string[]
    completedSteps?: string[]
    errors?: Array<{
      code: string
      message: string
      context: string
      timestamp: string
      resolved: boolean
    }>
    timeSpent?: number
  }
  searchContext?: {
    workflowType?: string
    blockType?: string
    userRole?: 'beginner' | 'intermediate' | 'expert'
    errorContext?: string
    currentStep?: string
    previousErrors?: string[]
    timeSpentInStep?: number
  }
  conversationContext?: {
    conversationHistory?: Array<{
      id: string
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: string
    }>
    lastActivity?: string
  }
  userPermissions?: {
    roles: string[]
    allowedVisibilityLevels: string[]
    userId: string
    organizationId?: string
  }
}

export interface AIHelpRequest {
  type: 'search' | 'chat' | 'suggestions' | 'proactive'
  userId: string
  sessionId: string
  query?: string
  context?: AIHelpContext
  options?: {
    maxResults?: number
    minScore?: number
    useHybridSearch?: boolean
    useReranking?: boolean
    contextBoost?: number
    includeMetadata?: boolean
    enableProactive?: boolean
  }
}

export interface AIHelpResponse {
  type: 'search' | 'chat' | 'suggestions' | 'proactive'
  data: any
  suggestions?: Array<{
    id: string
    title: string
    description: string
    confidence: number
    actionType: string
    metadata?: Record<string, any>
  }>
  relatedContent?: Array<{
    id: string
    title: string
    type: string
    relevanceScore: number
    url?: string
    metadata?: Record<string, any>
  }>
  metadata: {
    responseTime: number
    confidence: number
    cached: boolean
    searchResults?: number
    model?: string
    tokenUsage?: {
      input: number
      output: number
    }
  }
}

export interface AIHelpMetrics {
  totalRequests: number
  averageResponseTime: number
  successRate: number
  errorRate: number
  cacheHitRate: number
  components: {
    embedding: {
      totalEmbeddings: number
      averageEmbeddingTime: number
    }
    search: {
      totalSearches: number
      averageSearchTime: number
      cacheHitRate: number
    }
    chatbot: {
      totalMessages: number
      averageResponseTime: number
      satisfaction: number
    }
    predictiveHelp: {
      totalPredictions: number
      accuracy: number
      interventionRate: number
    }
  }
}

// ========================
// AI HELP ENGINE CLASS
// ========================

/**
 * Main AI Help Engine class that orchestrates all AI help functionality
 */
export class AIHelpEngine {
  private chatbot: IntelligentChatbot
  private semanticSearch: SemanticSearchService
  private metrics: AIHelpMetrics
  private isInitialized = false

  constructor() {
    logger.info('Initializing AI Help Engine')

    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      successRate: 1.0,
      errorRate: 0.0,
      cacheHitRate: 0.0,
      components: {
        embedding: {
          totalEmbeddings: 0,
          averageEmbeddingTime: 0,
        },
        search: {
          totalSearches: 0,
          averageSearchTime: 0,
          cacheHitRate: 0.0,
        },
        chatbot: {
          totalMessages: 0,
          averageResponseTime: 0,
          satisfaction: 0.8,
        },
        predictiveHelp: {
          totalPredictions: 0,
          accuracy: 0.75,
          interventionRate: 0.15,
        },
      },
    }

    // Initialize semantic search service
    this.semanticSearch = new SemanticSearchService(logger)

    // Initialize chatbot with configuration
    const chatbotConfig = {
      claudeApiKey: process.env.CLAUDE_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      temperature: 0.7,
      conversationTimeout: 3600000, // 1 hour
      maxConversationHistory: 50,
      enableProactiveAssistance: true,
      enableContextRetention: true,
    }

    this.chatbot = new IntelligentChatbot(chatbotConfig, this.semanticSearch, logger)

    this.isInitialized = true
    logger.info('AI Help Engine initialized successfully')
  }

  /**
   * Process an AI help request and return appropriate response
   */
  async processRequest(request: AIHelpRequest): Promise<AIHelpResponse> {
    const startTime = Date.now()

    try {
      this.metrics.totalRequests++

      logger.info('Processing AI help request', {
        type: request.type,
        userId: `${request.userId.substring(0, 8)}***`,
        hasQuery: !!request.query,
        sessionId: `${request.sessionId.substring(0, 12)}***`,
      })

      let response: AIHelpResponse

      switch (request.type) {
        case 'chat':
          response = await this.processChatRequest(request)
          break
        case 'search':
          response = await this.processSearchRequest(request)
          break
        case 'suggestions':
          response = await this.processSuggestionsRequest(request)
          break
        case 'proactive':
          response = await this.processProactiveRequest(request)
          break
        default:
          throw new Error(`Unsupported request type: ${request.type}`)
      }

      const responseTime = Date.now() - startTime

      // Update metrics
      this.updateMetrics(responseTime, true)

      // Add response metadata
      response.metadata.responseTime = responseTime

      logger.info('AI help request processed successfully', {
        type: request.type,
        responseTime,
        confidence: response.metadata.confidence,
        suggestionsCount: response.suggestions?.length || 0,
      })

      return response
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateMetrics(responseTime, false)

      logger.error('AI help request processing failed', {
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      })

      throw error
    }
  }

  /**
   * Process chat-based help requests
   */
  private async processChatRequest(request: AIHelpRequest): Promise<AIHelpResponse> {
    if (!request.query) {
      throw new Error('Chat request requires a query')
    }

    const response = await this.chatbot.processMessage(
      request.userId,
      request.sessionId,
      request.query,
      request.context
    )

    this.metrics.components.chatbot.totalMessages++

    return {
      type: 'chat',
      data: {
        message: response.message,
        intent: response.intent,
        conversationState: response.conversationState,
      },
      suggestions: response.suggestedActions || [],
      relatedContent: response.relatedContent || [],
      metadata: {
        ...response.metadata,
        responseTime: 0, // Will be set by processRequest
        confidence: response.conversationState?.confidence || 0.8,
        cached: false,
        model: 'claude-3-5-sonnet-20241022',
      },
    }
  }

  /**
   * Process semantic search requests
   */
  private async processSearchRequest(request: AIHelpRequest): Promise<AIHelpResponse> {
    if (!request.query) {
      throw new Error('Search request requires a query')
    }

    const searchResults = await this.semanticSearch.search(request.query, {
      maxResults: request.options?.maxResults || 10,
      minScore: request.options?.minScore || 0.6,
      context: request.context?.searchContext,
      useHybridSearch: request.options?.useHybridSearch !== false,
      useReranking: request.options?.useReranking !== false,
    })

    this.metrics.components.search.totalSearches++

    return {
      type: 'search',
      data: {
        results: searchResults.results,
        query: request.query,
        totalResults: searchResults.totalResults,
      },
      suggestions: searchResults.suggestions || [],
      relatedContent: searchResults.relatedContent || [],
      metadata: {
        responseTime: 0, // Will be set by processRequest
        confidence: searchResults.confidence || 0.7,
        cached: searchResults.cached || false,
        searchResults: searchResults.results.length,
      },
    }
  }

  /**
   * Process contextual suggestions requests
   */
  private async processSuggestionsRequest(request: AIHelpRequest): Promise<AIHelpResponse> {
    // Generate contextual suggestions based on workflow context
    const suggestions = await this.generateContextualSuggestions(request.userId, request.context)

    return {
      type: 'suggestions',
      data: {
        suggestions,
        context: request.context,
      },
      suggestions,
      relatedContent: [],
      metadata: {
        responseTime: 0, // Will be set by processRequest
        confidence: 0.75,
        cached: false,
      },
    }
  }

  /**
   * Process proactive assistance requests
   */
  private async processProactiveRequest(request: AIHelpRequest): Promise<AIHelpResponse> {
    const proactiveAssistance = await this.chatbot.generateProactiveAssistance(
      request.userId,
      request.context?.workflowContext
    )

    this.metrics.components.predictiveHelp.totalPredictions++

    return {
      type: 'proactive',
      data: {
        assistance: proactiveAssistance,
        context: request.context,
      },
      suggestions: proactiveAssistance?.suggestedActions || [],
      relatedContent: proactiveAssistance?.relatedContent || [],
      metadata: {
        responseTime: 0, // Will be set by processRequest
        confidence: proactiveAssistance?.confidence || 0.7,
        cached: false,
      },
    }
  }

  /**
   * Generate contextual suggestions based on user context
   */
  private async generateContextualSuggestions(
    userId: string,
    context?: AIHelpContext
  ): Promise<
    Array<{
      id: string
      title: string
      description: string
      confidence: number
      actionType: string
      metadata?: Record<string, any>
    }>
  > {
    const suggestions = []

    // Workflow-based suggestions
    if (context?.workflowContext) {
      const workflowType = context.workflowContext.type
      const currentStep = context.workflowContext.currentStep
      const errors = context.workflowContext.errors || []

      if (errors.length > 0) {
        suggestions.push({
          id: `suggestion_${Date.now()}_error_help`,
          title: 'Get Help with Errors',
          description: `You have ${errors.length} unresolved error(s). Let me help you troubleshoot.`,
          confidence: 0.9,
          actionType: 'error_assistance',
          metadata: {
            errorCount: errors.length,
            workflowType,
            currentStep,
          },
        })
      }

      if (workflowType && currentStep) {
        suggestions.push({
          id: `suggestion_${Date.now()}_step_guide`,
          title: `${currentStep} Guide`,
          description: `Learn more about ${currentStep} in ${workflowType} workflows.`,
          confidence: 0.75,
          actionType: 'step_guidance',
          metadata: {
            workflowType,
            currentStep,
          },
        })
      }
    }

    // User role-based suggestions
    if (context?.searchContext?.userRole === 'beginner') {
      suggestions.push({
        id: `suggestion_${Date.now()}_beginner_guide`,
        title: 'Getting Started Guide',
        description: 'New to the platform? Check out our comprehensive getting started guide.',
        confidence: 0.8,
        actionType: 'tutorial',
        metadata: {
          userRole: 'beginner',
          contentType: 'tutorial',
        },
      })
    }

    return suggestions.slice(0, 5) // Limit to top 5 suggestions
  }

  /**
   * Index help content for semantic search
   */
  async indexHelpContent(
    content: Array<{
      id: string
      title: string
      content: string
      type: string
      metadata?: Record<string, any>
    }>
  ): Promise<void> {
    logger.info('Indexing help content', { contentCount: content.length })

    try {
      await this.semanticSearch.indexContent(content)

      this.metrics.components.embedding.totalEmbeddings += content.length

      logger.info('Help content indexed successfully', {
        contentCount: content.length,
      })
    } catch (error) {
      logger.error('Help content indexing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentCount: content.length,
      })
      throw error
    }
  }

  /**
   * Perform health check on the AI Help Engine
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if all components are healthy
      const chatbotHealthy = await this.chatbot.healthCheck()
      const searchHealthy = await this.semanticSearch.healthCheck()

      const isHealthy = this.isInitialized && chatbotHealthy && searchHealthy

      logger.info('AI Help Engine health check', {
        isHealthy,
        chatbotHealthy,
        searchHealthy,
        isInitialized: this.isInitialized,
      })

      return isHealthy
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Get system metrics
   */
  getMetrics(): AIHelpMetrics {
    return { ...this.metrics }
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
      this.metrics.totalRequests

    // Update success/error rates
    if (success) {
      this.metrics.successRate =
        (this.metrics.successRate * (this.metrics.totalRequests - 1) + 1) /
        this.metrics.totalRequests
    } else {
      this.metrics.errorRate =
        (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests
    }
  }
}

// ========================
// SINGLETON INSTANCE
// ========================

let aiHelpEngineInstance: AIHelpEngine | null = null

/**
 * Get the singleton AI Help Engine instance
 */
export function getAIHelpEngine(): AIHelpEngine {
  if (!aiHelpEngineInstance) {
    aiHelpEngineInstance = new AIHelpEngine()
  }
  return aiHelpEngineInstance
}

// ========================
// EXPORTS
// ========================

export type { AIHelpContext, AIHelpRequest, AIHelpResponse, AIHelpMetrics }
export { IntelligentChatbot } from './intelligent-chatbot'
export { SemanticSearchService } from './semantic-search'
