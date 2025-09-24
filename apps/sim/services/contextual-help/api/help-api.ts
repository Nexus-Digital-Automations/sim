/**
 * Contextual Help API
 *
 * Main API interface for the contextual help system, providing
 * endpoints for help content retrieval, user guidance, and
 * adaptive help delivery.
 *
 * @author Contextual Help Agent
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import { helpContentManager } from '../content/content-manager'
import type { GeneratedHelpContent, NLHelpContentConfig } from '../content/nl-framework-integration'
import { nlFrameworkIntegration } from '../content/nl-framework-integration'
import { contextualHelpSystem } from '../core/help-system'
import { userFeedbackSystem } from '../feedback/feedback-system'
import { interactiveGuidance } from '../guidance/interactive-guidance'
import type {
  FeedbackData,
  GuidanceTutorial,
  HelpContent,
  HelpContext,
  HelpDeliveryConfig,
  HelpEvent,
  HelpSearchQuery,
  HelpSearchResult,
  HelpSystemMetrics,
} from '../types'

const logger = createLogger('ContextualHelpAPI')

export interface HelpAPIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    timestamp: Date
    requestId: string
    performance: {
      duration: number
      cacheHit: boolean
    }
  }
}

export interface HelpRequestContext {
  userId: string
  sessionId: string
  userAgent?: string
  ipAddress?: string
  requestId: string
}

/**
 * Contextual Help API Service
 *
 * Provides comprehensive API for contextual help interactions
 * with intelligent content adaptation and multi-modal delivery
 */
export class ContextualHelpAPI {
  constructor() {
    logger.info('Contextual Help API initialized')
  }

  /**
   * Get contextual help for current user context
   */
  async getContextualHelp(
    context: HelpContext,
    requestContext: HelpRequestContext,
    deliveryConfig?: HelpDeliveryConfig
  ): Promise<HelpAPIResponse<HelpContent[]>> {
    const startTime = Date.now()
    logger.info('Getting contextual help', {
      userId: context.userId,
      toolContext: context.toolContext,
      expertiseLevel: context.userState.expertiseLevel,
    })

    try {
      // Analyze context and determine help needs
      const helpNeeds = await contextualHelpSystem.analyzeHelpNeeds(context)

      // Get appropriate help content
      const helpContent = await contextualHelpSystem.getRelevantHelp(
        context,
        deliveryConfig || this.getDefaultDeliveryConfig(context)
      )

      // Log help event
      await this.logHelpEvent({
        type: 'view',
        userId: context.userId,
        sessionId: context.sessionId,
        context,
        data: { helpNeedsCount: helpNeeds.length },
      })

      return {
        success: true,
        data: helpContent,
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to get contextual help', { error, context })
      return {
        success: false,
        error: {
          code: 'HELP_RETRIEVAL_FAILED',
          message: 'Failed to retrieve contextual help',
          details: error.message,
        },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    }
  }

  /**
   * Generate intelligent help content using NL Framework
   */
  async generateIntelligentHelp(
    config: NLHelpContentConfig,
    requestContext: HelpRequestContext
  ): Promise<HelpAPIResponse<GeneratedHelpContent>> {
    const startTime = Date.now()
    logger.info('Generating intelligent help content', {
      toolId: config.toolId,
      expertiseLevel: config.userExpertiseLevel,
      contentType: config.contentType,
    })

    try {
      // Generate content using NL Framework integration
      const generatedContent = await nlFrameworkIntegration.generateHelpContent(config)

      // Store generated content for future use
      await helpContentManager.storeGeneratedContent(generatedContent.primaryContent)

      // Log generation event
      await this.logHelpEvent({
        type: 'interaction',
        userId: config.currentContext.userId,
        sessionId: config.currentContext.sessionId,
        context: config.currentContext,
        data: {
          generationType: 'intelligent',
          qualityScore: generatedContent.generationMetadata.qualityScore,
        },
      })

      return {
        success: true,
        data: generatedContent,
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to generate intelligent help', { error, config })
      return {
        success: false,
        error: {
          code: 'INTELLIGENT_HELP_GENERATION_FAILED',
          message: 'Failed to generate intelligent help content',
          details: error.message,
        },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    }
  }

  /**
   * Start interactive guidance session
   */
  async startInteractiveGuidance(
    toolId: string,
    tutorialType: 'quick_start' | 'comprehensive' | 'troubleshooting',
    userContext: HelpContext,
    requestContext: HelpRequestContext
  ): Promise<HelpAPIResponse<{ tutorial: GuidanceTutorial; sessionId: string }>> {
    const startTime = Date.now()
    logger.info('Starting interactive guidance', { toolId, tutorialType })

    try {
      // Generate tutorial using NL Framework
      const tutorial = await nlFrameworkIntegration.generateInteractiveTutorial(
        toolId,
        userContext,
        tutorialType
      )

      // Start guidance session
      const sessionId = await interactiveGuidance.startGuidanceSession(tutorial, userContext)

      // Log guidance start
      await this.logHelpEvent({
        type: 'interaction',
        tutorialId: tutorial.id,
        userId: userContext.userId,
        sessionId: userContext.sessionId,
        context: userContext,
        data: { action: 'guidance_started', tutorialType },
      })

      return {
        success: true,
        data: { tutorial, sessionId },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to start interactive guidance', { error, toolId, tutorialType })
      return {
        success: false,
        error: {
          code: 'GUIDANCE_START_FAILED',
          message: 'Failed to start interactive guidance',
          details: error.message,
        },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    }
  }

  /**
   * Search help content with intelligent ranking
   */
  async searchHelpContent(
    query: HelpSearchQuery,
    requestContext: HelpRequestContext
  ): Promise<HelpAPIResponse<HelpSearchResult[]>> {
    const startTime = Date.now()
    logger.info('Searching help content', { query: query.query })

    try {
      // Perform intelligent search
      const results = await helpContentManager.searchContent(query)

      // Enhance results with contextual relevance
      const enhancedResults = await this.enhanceSearchResults(results, query)

      // Log search event
      await this.logHelpEvent({
        type: 'interaction',
        userId: query.context?.userId || 'anonymous',
        sessionId: query.context?.sessionId || 'anonymous',
        context: query.context,
        data: {
          action: 'search',
          query: query.query,
          resultCount: enhancedResults.length,
        },
      })

      return {
        success: true,
        data: enhancedResults,
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to search help content', { error, query })
      return {
        success: false,
        error: {
          code: 'HELP_SEARCH_FAILED',
          message: 'Failed to search help content',
          details: error.message,
        },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    }
  }

  /**
   * Submit user feedback on help content
   */
  async submitFeedback(
    feedbackData: Omit<FeedbackData, 'id' | 'status'>,
    requestContext: HelpRequestContext
  ): Promise<HelpAPIResponse<{ feedbackId: string }>> {
    const startTime = Date.now()
    logger.info('Submitting help feedback', {
      type: feedbackData.type,
      userId: feedbackData.userId,
    })

    try {
      // Process feedback
      const feedbackId = await userFeedbackSystem.submitFeedback(feedbackData)

      // Log feedback event
      await this.logHelpEvent({
        type: 'feedback',
        userId: feedbackData.userId,
        sessionId: feedbackData.sessionId,
        context: feedbackData.metadata.context,
        data: {
          feedbackType: feedbackData.type,
          rating: feedbackData.rating,
        },
      })

      return {
        success: true,
        data: { feedbackId },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to submit feedback', { error, feedbackData })
      return {
        success: false,
        error: {
          code: 'FEEDBACK_SUBMISSION_FAILED',
          message: 'Failed to submit feedback',
          details: error.message,
        },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    }
  }

  /**
   * Get help system metrics and analytics
   */
  async getHelpMetrics(
    timeRange?: { start: Date; end: Date },
    requestContext?: HelpRequestContext
  ): Promise<HelpAPIResponse<HelpSystemMetrics>> {
    const startTime = Date.now()
    logger.info('Getting help system metrics')

    try {
      // Get comprehensive metrics
      const metrics = await contextualHelpSystem.getSystemMetrics(timeRange)

      return {
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date(),
          requestId: requestContext?.requestId || 'internal',
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to get help metrics', { error })
      return {
        success: false,
        error: {
          code: 'METRICS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve help system metrics',
          details: error.message,
        },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext?.requestId || 'internal',
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    }
  }

  /**
   * Adapt existing help content for new context
   */
  async adaptHelpContent(
    contentId: string,
    newContext: HelpContext,
    requestContext: HelpRequestContext
  ): Promise<HelpAPIResponse<HelpContent>> {
    const startTime = Date.now()
    logger.info('Adapting help content for new context', { contentId })

    try {
      // Get existing content
      const existingContent = await helpContentManager.getContent(contentId)
      if (!existingContent) {
        throw new Error('Content not found')
      }

      // Adapt content using NL Framework
      const adaptedContent = await nlFrameworkIntegration.adaptContentForNewContext(
        existingContent,
        newContext
      )

      // Log adaptation event
      await this.logHelpEvent({
        type: 'interaction',
        contentId: adaptedContent.id,
        userId: newContext.userId,
        sessionId: newContext.sessionId,
        context: newContext,
        data: { action: 'content_adapted', originalContentId: contentId },
      })

      return {
        success: true,
        data: adaptedContent,
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to adapt help content', { error, contentId })
      return {
        success: false,
        error: {
          code: 'CONTENT_ADAPTATION_FAILED',
          message: 'Failed to adapt help content',
          details: error.message,
        },
        metadata: {
          timestamp: new Date(),
          requestId: requestContext.requestId,
          performance: {
            duration: Date.now() - startTime,
            cacheHit: false,
          },
        },
      }
    }
  }

  // Helper methods

  private getDefaultDeliveryConfig(context: HelpContext): HelpDeliveryConfig {
    return {
      mode: context.userState.preferredHelpMode || 'tooltip',
      styling: {
        theme: 'auto',
        animation: 'fade',
        zIndex: 1000,
      },
      behavior: {
        autoClose: 10000,
        persistent: false,
        dismissible: true,
      },
      accessibility: {
        announceToScreenReader: context.userState.accessibility.screenReader,
        trapFocus: true,
        returnFocus: true,
      },
    }
  }

  private async enhanceSearchResults(
    results: HelpSearchResult[],
    query: HelpSearchQuery
  ): Promise<HelpSearchResult[]> {
    // Enhance search results with contextual relevance
    return results
      .map((result) => ({
        ...result,
        relevanceScore: this.calculateContextualRelevance(result, query),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private calculateContextualRelevance(result: HelpSearchResult, query: HelpSearchQuery): number {
    let relevance = result.relevanceScore

    // Boost relevance based on user context
    if (query.context) {
      const userLevel = query.context.userState.expertiseLevel
      const contentTags = result.content.tags

      // Boost if content matches user expertise level
      if (contentTags.includes(userLevel)) {
        relevance += 0.2
      }

      // Boost if content relates to current tool context
      if (query.context.toolContext && contentTags.includes(query.context.toolContext.toolName)) {
        relevance += 0.3
      }
    }

    return Math.min(relevance, 1.0) // Cap at 1.0
  }

  private async logHelpEvent(eventData: Omit<HelpEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: HelpEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...eventData,
    }

    // Log to help system for analytics
    await contextualHelpSystem.logEvent(event)
  }
}

// Create singleton instance
export const contextualHelpAPI = new ContextualHelpAPI()

export default contextualHelpAPI
