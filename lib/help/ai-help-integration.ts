/**
 * AI Help Engine Integration Service
 *
 * Central integration layer that connects the AI Help Engine with the existing help system,
 * user interface components, and workflow management. Provides a unified API for AI-powered
 * help features across the Sim platform.
 *
 * Key Integration Points:
 * - Help content management system
 * - User workflow context detection
 * - Real-time assistance triggers
 * - Help UI component coordination
 * - Analytics and performance tracking
 *
 * Usage: Import and use as singleton service across the application
 *
 * @created 2025-09-04
 * @author AI Help Engine Core Architecture Specialist
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { Logger } from '@/lib/monitoring/logger'
import {
  type AIHelpContext,
  type AIHelpEngine,
  type AIHelpRequest,
  type AIHelpResponse,
  getAIHelpEngine,
} from './ai'

// ========================
// INTEGRATION TYPES
// ========================

export interface HelpIntegrationConfig {
  enableRealTimeAssistance: boolean
  enableContextualSuggestions: boolean
  enableProactiveHelp: boolean
  enableAnalytics: boolean
  debounceMs: number
  maxConcurrentRequests: number
  cacheTimeout: number
}

export interface WorkflowHelpContext {
  workflowId?: string
  workflowType?: string
  currentBlockId?: string
  currentBlockType?: string
  completedBlocks?: string[]
  errorHistory?: WorkflowError[]
  userActions?: UserAction[]
  timeSpentInWorkflow?: number
}

export interface WorkflowError {
  blockId: string
  errorType: string
  errorMessage: string
  timestamp: Date
  resolved: boolean
  solution?: string
}

export interface UserAction {
  action: string
  blockId?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface HelpSuggestion {
  id: string
  type: 'tutorial' | 'documentation' | 'example' | 'troubleshooting'
  title: string
  description: string
  priority: number
  confidence: number
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
}

export interface ProactiveHelpTrigger {
  triggerId: string
  condition: string
  threshold: number
  cooldownMs: number
  lastTriggered?: Date
}

// ========================
// MAIN INTEGRATION SERVICE
// ========================

export class AIHelpIntegrationService {
  private aiHelpEngine: AIHelpEngine
  private logger: Logger
  private config: HelpIntegrationConfig
  private contextCache: Map<string, { context: WorkflowHelpContext; timestamp: number }> = new Map()
  private requestQueue: Map<string, Promise<AIHelpResponse>> = new Map()
  private proactiveTriggers: Map<string, ProactiveHelpTrigger> = new Map()

  constructor(config?: Partial<HelpIntegrationConfig>) {
    this.logger = createLogger('AIHelpIntegration')
    this.config = {
      enableRealTimeAssistance: true,
      enableContextualSuggestions: true,
      enableProactiveHelp: true,
      enableAnalytics: true,
      debounceMs: 300,
      maxConcurrentRequests: 10,
      cacheTimeout: 60000, // 1 minute
      ...config,
    }

    this.aiHelpEngine = getAIHelpEngine()
    this.setupProactiveTriggers()
    this.setupCacheCleanup()

    this.logger.info('AIHelpIntegrationService initialized', {
      config: this.config,
    })
  }

  /**
   * Get contextual help suggestions based on current workflow state
   */
  async getContextualSuggestions(
    userId: string,
    workflowContext: WorkflowHelpContext,
    options: { maxResults?: number; includeProactive?: boolean } = {}
  ): Promise<HelpSuggestion[]> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Getting contextual suggestions`, {
      userId: this.sanitizeUserId(userId),
      workflowType: workflowContext.workflowType,
      currentBlockType: workflowContext.currentBlockType,
    })

    try {
      // Build AI help context
      const aiContext: AIHelpContext = {
        workflowContext: {
          type: workflowContext.workflowType || 'unknown',
          currentStep: workflowContext.currentBlockType || 'unknown',
          blockTypes: workflowContext.currentBlockType ? [workflowContext.currentBlockType] : [],
          completedSteps: workflowContext.completedBlocks || [],
          errors:
            workflowContext.errorHistory?.map((e) => ({
              code: e.errorType,
              message: e.errorMessage,
              context: e.blockId,
              timestamp: e.timestamp,
              resolved: e.resolved,
            })) || [],
          timeSpent: workflowContext.timeSpentInWorkflow || 0,
        },
        searchContext: {
          workflowType: workflowContext.workflowType,
          blockType: workflowContext.currentBlockType,
          userRole: 'intermediate', // Could be determined from user profile
          currentStep: workflowContext.currentBlockType,
          previousErrors: workflowContext.errorHistory?.map((e) => e.errorMessage) || [],
        },
      }

      // Request contextual suggestions
      const aiRequest: AIHelpRequest = {
        type: 'suggestions',
        userId,
        context: aiContext,
        options: {
          maxResults: options.maxResults || 5,
          enableProactive: options.includeProactive !== false,
        },
      }

      const response = await this.aiHelpEngine.processRequest(aiRequest)

      // Convert AI suggestions to help suggestions
      const suggestions: HelpSuggestion[] =
        response.suggestions?.map((s, index) => ({
          id: s.id,
          type: this.mapSuggestionType(s.type),
          title: s.title,
          description: s.description,
          priority: s.priority,
          confidence: s.confidence,
          actionUrl: s.parameters?.url,
          actionLabel: s.action === 'show_help' ? 'Learn More' : 'Take Action',
        })) || []

      // Add proactive suggestions if enabled
      if (options.includeProactive && this.config.enableProactiveHelp) {
        const proactiveSuggestions = await this.getProactiveSuggestions(userId, workflowContext)
        suggestions.push(...proactiveSuggestions)
      }

      const processingTime = Date.now() - startTime
      this.logger.info(`[${operationId}] Contextual suggestions generated`, {
        suggestionsCount: suggestions.length,
        processingTime,
      })

      return suggestions.slice(0, options.maxResults || 10)
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to get contextual suggestions`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: this.sanitizeUserId(userId),
      })
      return []
    }
  }

  /**
   * Process conversational help query
   */
  async processHelpQuery(
    userId: string,
    query: string,
    sessionId: string,
    workflowContext?: WorkflowHelpContext
  ): Promise<{
    response: string
    suggestions: HelpSuggestion[]
    relatedContent: any[]
    conversationState: any
  }> {
    const operationId = this.generateOperationId()

    this.logger.info(`[${operationId}] Processing help query`, {
      userId: this.sanitizeUserId(userId),
      queryLength: query.length,
      sessionId: `${sessionId.substring(0, 12)}***`,
      hasWorkflowContext: !!workflowContext,
    })

    try {
      // Build AI help context
      const aiContext: AIHelpContext = workflowContext
        ? {
            workflowContext: {
              type: workflowContext.workflowType || 'unknown',
              currentStep: workflowContext.currentBlockType || 'unknown',
              blockTypes: [workflowContext.currentBlockType || 'unknown'],
              completedSteps: workflowContext.completedBlocks || [],
              errors:
                workflowContext.errorHistory?.map((e) => ({
                  code: e.errorType,
                  message: e.errorMessage,
                  context: e.blockId,
                  timestamp: e.timestamp,
                  resolved: e.resolved,
                })) || [],
              timeSpent: workflowContext.timeSpentInWorkflow || 0,
            },
            conversationContext: {
              userId,
              sessionId,
              lastActivity: new Date(),
            },
          }
        : undefined

      // Process chat request
      const aiRequest: AIHelpRequest = {
        type: 'chat',
        userId,
        sessionId,
        query,
        context: aiContext,
      }

      const response = await this.aiHelpEngine.processRequest(aiRequest)

      // Extract chat response data
      const chatData = response.data

      return {
        response: chatData.message || 'I apologize, but I cannot provide a response at this time.',
        suggestions:
          response.suggestions?.map((s) => ({
            id: s.id,
            type: this.mapSuggestionType(s.type),
            title: s.title,
            description: s.description,
            priority: s.priority,
            confidence: s.confidence,
            actionUrl: s.parameters?.url,
            actionLabel: s.action === 'show_help' ? 'Learn More' : 'Take Action',
          })) || [],
        relatedContent: response.relatedContent || [],
        conversationState: chatData.conversationState || {},
      }
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to process help query`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: this.sanitizeUserId(userId),
      })

      return {
        response:
          "I'm sorry, I encountered an error while processing your question. Please try again or contact support if the issue persists.",
        suggestions: [],
        relatedContent: [],
        conversationState: {},
      }
    }
  }

  /**
   * Search for help content with AI-powered semantic matching
   */
  async searchHelpContent(
    query: string,
    userId: string,
    workflowContext?: WorkflowHelpContext,
    options: { maxResults?: number; includeMetadata?: boolean } = {}
  ): Promise<any[]> {
    const operationId = this.generateOperationId()

    this.logger.info(`[${operationId}] Searching help content`, {
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      userId: this.sanitizeUserId(userId),
      hasWorkflowContext: !!workflowContext,
    })

    try {
      const aiContext: AIHelpContext = workflowContext
        ? {
            searchContext: {
              workflowType: workflowContext.workflowType,
              blockType: workflowContext.currentBlockType,
              userRole: 'intermediate',
              currentStep: workflowContext.currentBlockType,
            },
          }
        : undefined

      const aiRequest: AIHelpRequest = {
        type: 'search',
        userId,
        query,
        context: aiContext,
        options: {
          maxResults: options.maxResults || 10,
          includeMetadata: options.includeMetadata !== false,
        },
      }

      const response = await this.aiHelpEngine.processRequest(aiRequest)

      return Array.isArray(response.data) ? response.data : [response.data]
    } catch (error) {
      this.logger.error(`[${operationId}] Help content search failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: this.sanitizeUserId(userId),
      })
      return []
    }
  }

  /**
   * Update workflow context for user session
   */
  updateWorkflowContext(userId: string, context: WorkflowHelpContext): void {
    this.contextCache.set(userId, {
      context,
      timestamp: Date.now(),
    })

    // Check for proactive help triggers
    if (this.config.enableProactiveHelp) {
      this.checkProactiveTriggers(userId, context).catch((error) => {
        this.logger.error('Proactive trigger check failed', {
          error,
          userId: this.sanitizeUserId(userId),
        })
      })
    }
  }

  /**
   * Get current workflow context for user
   */
  getWorkflowContext(userId: string): WorkflowHelpContext | null {
    const cached = this.contextCache.get(userId)
    if (!cached || Date.now() - cached.timestamp > this.config.cacheTimeout) {
      return null
    }
    return cached.context
  }

  // Private Methods

  private async getProactiveSuggestions(
    userId: string,
    workflowContext: WorkflowHelpContext
  ): Promise<HelpSuggestion[]> {
    try {
      const aiRequest: AIHelpRequest = {
        type: 'proactive',
        userId,
        context: {
          workflowContext: {
            type: workflowContext.workflowType || 'unknown',
            currentStep: workflowContext.currentBlockType || 'unknown',
            blockTypes: [workflowContext.currentBlockType || 'unknown'],
            completedSteps: workflowContext.completedBlocks || [],
            errors:
              workflowContext.errorHistory?.map((e) => ({
                code: e.errorType,
                message: e.errorMessage,
                context: e.blockId,
                timestamp: e.timestamp,
                resolved: e.resolved,
              })) || [],
            timeSpent: workflowContext.timeSpentInWorkflow || 0,
          },
        },
      }

      const response = await this.aiHelpEngine.processRequest(aiRequest)

      return (
        response.suggestions?.map((s) => ({
          id: `proactive_${s.id}`,
          type: 'tutorial' as const,
          title: `💡 ${s.title}`,
          description: s.description,
          priority: s.priority + 10, // Boost proactive suggestions
          confidence: s.confidence,
          actionLabel: 'Get Help',
        })) || []
      )
    } catch (error) {
      this.logger.error('Failed to get proactive suggestions', { error })
      return []
    }
  }

  private async checkProactiveTriggers(
    userId: string,
    context: WorkflowHelpContext
  ): Promise<void> {
    // Example proactive triggers - in production these would be more sophisticated
    const triggers = [
      {
        id: 'error_threshold',
        condition: 'error_count > 2',
        check: () => (context.errorHistory?.filter((e) => !e.resolved).length || 0) > 2,
      },
      {
        id: 'time_spent',
        condition: 'time_in_step > 300000', // 5 minutes
        check: () => (context.timeSpentInWorkflow || 0) > 300000,
      },
    ]

    for (const trigger of triggers) {
      if (trigger.check()) {
        this.logger.info('Proactive help trigger activated', {
          triggerId: trigger.id,
          condition: trigger.condition,
          userId: this.sanitizeUserId(userId),
        })

        // In a real implementation, you might emit an event or notification here
        // For now, we just log the trigger
      }
    }
  }

  private mapSuggestionType(
    aiType: string
  ): 'tutorial' | 'documentation' | 'example' | 'troubleshooting' {
    const typeMap: Record<string, 'tutorial' | 'documentation' | 'example' | 'troubleshooting'> = {
      tutorial: 'tutorial',
      content: 'documentation',
      action: 'example',
      troubleshoot: 'troubleshooting',
    }
    return typeMap[aiType] || 'documentation'
  }

  private setupProactiveTriggers(): void {
    // Configure common proactive help triggers
    this.proactiveTriggers.set('error_threshold', {
      triggerId: 'error_threshold',
      condition: 'error_count > 2',
      threshold: 2,
      cooldownMs: 300000, // 5 minutes
    })

    this.proactiveTriggers.set('time_spent', {
      triggerId: 'time_spent',
      condition: 'time_in_step > 300000',
      threshold: 300000, // 5 minutes
      cooldownMs: 600000, // 10 minutes
    })

    this.logger.info('Proactive triggers configured', {
      triggerCount: this.proactiveTriggers.size,
    })
  }

  private setupCacheCleanup(): void {
    // Clean up expired context cache every 5 minutes
    setInterval(() => {
      const now = Date.now()
      let cleaned = 0

      for (const [userId, cached] of this.contextCache.entries()) {
        if (now - cached.timestamp > this.config.cacheTimeout) {
          this.contextCache.delete(userId)
          cleaned++
        }
      }

      if (cleaned > 0) {
        this.logger.info('Context cache cleanup completed', { entriesCleaned: cleaned })
      }
    }, 300000) // 5 minutes
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private sanitizeUserId(userId: string): string {
    return `${userId.substring(0, 8)}***`
  }
}

// ========================
// SINGLETON INSTANCE
// ========================

let globalIntegrationService: AIHelpIntegrationService | null = null

/**
 * Get the global AI Help Integration Service instance
 */
export function getAIHelpIntegrationService(
  config?: Partial<HelpIntegrationConfig>
): AIHelpIntegrationService {
  if (!globalIntegrationService) {
    globalIntegrationService = new AIHelpIntegrationService(config)
  }
  return globalIntegrationService
}

/**
 * Initialize the global AI Help Integration Service with custom configuration
 */
export function initializeAIHelpIntegrationService(
  config: Partial<HelpIntegrationConfig>
): AIHelpIntegrationService {
  globalIntegrationService = new AIHelpIntegrationService(config)
  return globalIntegrationService
}

export default AIHelpIntegrationService
