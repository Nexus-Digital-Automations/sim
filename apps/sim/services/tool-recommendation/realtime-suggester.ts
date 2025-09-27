/**
 * Real-Time Tool Suggestion System
 *
 * Provides intelligent, context-aware tool suggestions in real-time during
 * user conversations. Monitors conversation flow, detects suggestion triggers,
 * and delivers timely recommendations with appropriate urgency and timing.
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'
import { behaviorTracker } from './behavior-tracker'
import { contextAnalyzer } from './context-analyzer'
import { mlEngine } from './ml-engine'
import type {
  ConversationContext,
  RealTimeSuggestion,
  SuggestionFeedback,
  SuggestionTrigger,
  ToolRecommendation,
  TriggerType,
  UserBehaviorProfile,
  WorkspacePattern,
} from './types'

const logger = createLogger('RealtimeSuggester')

interface ActiveConversation {
  id: string
  context: ConversationContext
  lastActivity: Date
  suggestionHistory: RealTimeSuggestion[]
  triggers: SuggestionTrigger[]
  userProfile?: UserBehaviorProfile
  workspacePattern?: WorkspacePattern
}

interface TriggerRule {
  type: TriggerType
  condition: (context: ConversationContext) => boolean
  cooldownMinutes: number
  priority: number
}

export class RealtimeSuggester extends EventEmitter {
  private activeConversations: Map<string, ActiveConversation>
  private triggerRules: TriggerRule[]
  private cooldowns: Map<string, Date>
  private suggestionQueue: Map<string, RealTimeSuggestion[]>

  constructor() {
    super()
    this.activeConversations = new Map()
    this.triggerRules = []
    this.cooldowns = new Map()
    this.suggestionQueue = new Map()
    this.initializeTriggerRules()
  }

  /**
   * Start monitoring a conversation for real-time suggestions
   */
  startMonitoring(
    conversationId: string,
    context: ConversationContext,
    userProfile?: UserBehaviorProfile,
    workspacePattern?: WorkspacePattern
  ): void {
    logger.info(`Starting real-time monitoring for conversation ${conversationId}`)

    const activeConversation: ActiveConversation = {
      id: conversationId,
      context,
      lastActivity: new Date(),
      suggestionHistory: [],
      triggers: this.getDefaultTriggers(),
      userProfile,
      workspacePattern,
    }

    this.activeConversations.set(conversationId, activeConversation)
    this.suggestionQueue.set(conversationId, [])

    // Emit monitoring started event
    this.emit('monitoringStarted', conversationId)
  }

  /**
   * Stop monitoring a conversation
   */
  stopMonitoring(conversationId: string): void {
    logger.info(`Stopping monitoring for conversation ${conversationId}`)

    this.activeConversations.delete(conversationId)
    this.suggestionQueue.delete(conversationId)

    // Clean up cooldowns
    const keys = Array.from(this.cooldowns.keys())
    keys.forEach((key) => {
      if (key.startsWith(conversationId)) {
        this.cooldowns.delete(key)
      }
    })

    this.emit('monitoringStopped', conversationId)
  }

  /**
   * Update conversation context and check for triggers
   */
  async updateContext(conversationId: string, newMessage: any): Promise<void> {
    const conversation = this.activeConversations.get(conversationId)
    if (!conversation) return

    // Update context
    conversation.context.messages.push(newMessage)
    conversation.lastActivity = new Date()

    // Analyze updated context
    const analyzedContext = await contextAnalyzer.analyzeContext(conversation.context)
    conversation.context = analyzedContext

    // Check for triggers
    await this.checkTriggers(conversation)

    // Update conversation
    this.activeConversations.set(conversationId, conversation)
  }

  /**
   * Get current suggestions for a conversation
   */
  getCurrentSuggestions(conversationId: string): RealTimeSuggestion[] {
    return this.suggestionQueue.get(conversationId) || []
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(conversationId: string, suggestionId: string): void {
    const suggestions = this.suggestionQueue.get(conversationId) || []
    const suggestion = suggestions.find((s) => s.id === suggestionId)

    if (suggestion) {
      suggestion.dismissed = true
      this.emit('suggestionDismissed', suggestion)

      // Remove from active queue
      const updatedSuggestions = suggestions.filter((s) => s.id !== suggestionId)
      this.suggestionQueue.set(conversationId, updatedSuggestions)

      logger.debug(`Suggestion ${suggestionId} dismissed`)
    }
  }

  /**
   * Accept a suggestion
   */
  acceptSuggestion(conversationId: string, suggestionId: string): void {
    const conversation = this.activeConversations.get(conversationId)
    const suggestions = this.suggestionQueue.get(conversationId) || []
    const suggestion = suggestions.find((s) => s.id === suggestionId)

    if (suggestion) {
      suggestion.accepted = true
      this.emit('suggestionAccepted', suggestion)

      // Track acceptance for learning
      if (suggestion.suggestion.toolId) {
        behaviorTracker.recordLearningEvent(
          conversation?.context.userId || '',
          conversation?.context.workspaceId || '',
          {
            eventType: 'suggestion_accepted',
            toolId: suggestion.suggestion.toolId,
            outcome: 'positive',
            context: { suggestionId, trigger: suggestion.trigger },
          }
        )
      }

      logger.info(`Suggestion ${suggestionId} accepted`)
    }
  }

  /**
   * Provide feedback on a suggestion
   */
  provideFeedback(suggestionId: string, feedback: SuggestionFeedback): void {
    // Find suggestion across all conversations
    for (const [conversationId, suggestions] of this.suggestionQueue.entries()) {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      if (suggestion) {
        suggestion.feedback = feedback
        this.emit('feedbackProvided', { suggestion, feedback })

        // Learn from feedback
        this.learnFromFeedback(suggestion, feedback)
        break
      }
    }
  }

  /**
   * Configure triggers for a conversation
   */
  configureTriggers(conversationId: string, triggers: SuggestionTrigger[]): void {
    const conversation = this.activeConversations.get(conversationId)
    if (conversation) {
      conversation.triggers = triggers
      this.activeConversations.set(conversationId, conversation)
      logger.debug(`Updated triggers for conversation ${conversationId}`)
    }
  }

  /**
   * Check for suggestion triggers in a conversation
   */
  private async checkTriggers(conversation: ActiveConversation): Promise<void> {
    for (const rule of this.triggerRules) {
      if (!this.isTriggerEnabled(conversation, rule.type)) continue
      if (this.isInCooldown(conversation.id, rule.type)) continue

      if (rule.condition(conversation.context)) {
        await this.fireTrigger(conversation, rule)
      }
    }
  }

  /**
   * Fire a suggestion trigger
   */
  private async fireTrigger(conversation: ActiveConversation, rule: TriggerRule): Promise<void> {
    logger.info(`Trigger fired: ${rule.type} for conversation ${conversation.id}`)

    // Set cooldown
    const cooldownKey = `${conversation.id}-${rule.type}`
    const cooldownUntil = new Date(Date.now() + rule.cooldownMinutes * 60 * 1000)
    this.cooldowns.set(cooldownKey, cooldownUntil)

    try {
      // Generate recommendations
      const recommendations = await this.generateTriggeredRecommendations(conversation, rule.type)

      // Create suggestions
      for (const recommendation of recommendations) {
        const suggestion = await this.createSuggestion(conversation, rule.type, recommendation)

        // Add to queue
        const queue = this.suggestionQueue.get(conversation.id) || []
        queue.push(suggestion)
        this.suggestionQueue.set(conversation.id, queue)

        // Emit suggestion event
        this.emit('suggestionGenerated', suggestion)
      }
    } catch (error) {
      logger.error(`Error generating suggestions for trigger ${rule.type}:`, error)
    }
  }

  /**
   * Generate recommendations for a triggered scenario
   */
  private async generateTriggeredRecommendations(
    conversation: ActiveConversation,
    triggerType: TriggerType
  ): Promise<ToolRecommendation[]> {
    const requestData = {
      context: conversation.context,
      userProfile: conversation.userProfile,
      workspacePattern: conversation.workspacePattern,
      maxSuggestions: this.getMaxSuggestionsForTrigger(triggerType),
      explainReasons: true,
    }

    const recommendations = await mlEngine.generateRecommendations(requestData)

    // Filter recommendations based on trigger type
    return this.filterRecommendationsForTrigger(recommendations, triggerType)
  }

  /**
   * Create a real-time suggestion
   */
  private async createSuggestion(
    conversation: ActiveConversation,
    triggerType: TriggerType,
    recommendation: ToolRecommendation
  ): Promise<RealTimeSuggestion> {
    const urgency = this.calculateUrgency(triggerType, recommendation)
    const timing = this.calculateTiming(triggerType, conversation)

    return {
      id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId: conversation.id,
      trigger: triggerType,
      suggestion: recommendation,
      urgency,
      timing,
      displayDuration: this.getDisplayDuration(urgency),
      createdAt: new Date(),
    }
  }

  /**
   * Initialize default trigger rules
   */
  private initializeTriggerRules(): void {
    this.triggerRules = [
      {
        type: 'user_pause',
        condition: (context) => this.detectUserPause(context),
        cooldownMinutes: 2,
        priority: 2,
      },
      {
        type: 'error_detected',
        condition: (context) => this.detectError(context),
        cooldownMinutes: 1,
        priority: 5,
      },
      {
        type: 'inefficient_pattern',
        condition: (context) => this.detectInefficientPattern(context),
        cooldownMinutes: 5,
        priority: 3,
      },
      {
        type: 'new_capability',
        condition: (context) => this.detectNewCapability(context),
        cooldownMinutes: 10,
        priority: 1,
      },
      {
        type: 'workflow_completion',
        condition: (context) => this.detectWorkflowCompletion(context),
        cooldownMinutes: 3,
        priority: 2,
      },
      {
        type: 'integration_opportunity',
        condition: (context) => this.detectIntegrationOpportunity(context),
        cooldownMinutes: 15,
        priority: 4,
      },
    ]

    // Sort by priority (higher number = higher priority)
    this.triggerRules.sort((a, b) => b.priority - a.priority)

    logger.info(`Initialized ${this.triggerRules.length} trigger rules`)
  }

  /**
   * Trigger detection methods
   */
  private detectUserPause(context: ConversationContext): boolean {
    if (context.messages.length < 2) return false

    const lastMessage = context.messages[context.messages.length - 1]
    const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime()

    // Consider it a pause if more than 30 seconds have passed
    return timeSinceLastMessage > 30000
  }

  private detectError(context: ConversationContext): boolean {
    const recentMessages = context.messages.slice(-3)
    return recentMessages.some(
      (msg) =>
        msg.content.toLowerCase().includes('error') ||
        msg.content.toLowerCase().includes('problem') ||
        msg.content.toLowerCase().includes('not working') ||
        msg.content.toLowerCase().includes('failed')
    )
  }

  private detectInefficientPattern(context: ConversationContext): boolean {
    // Detect if user is repeating similar queries
    if (context.messages.length < 4) return false

    const recentMessages = context.messages.slice(-4)
    const queries = recentMessages.filter((msg) => msg.role === 'user')

    if (queries.length < 3) return false

    // Simple similarity check
    const similar = queries.some((msg, i) =>
      queries
        .slice(i + 1)
        .some((other) => this.calculateStringSimilarity(msg.content, other.content) > 0.7)
    )

    return similar
  }

  private detectNewCapability(context: ConversationContext): boolean {
    // Detect if user is asking about capabilities they haven't used
    const lastMessage = context.messages[context.messages.length - 1]
    if (lastMessage.role !== 'user') return false

    const content = lastMessage.content.toLowerCase()
    return (
      content.includes('can you') ||
      content.includes('is it possible') ||
      content.includes('how do i') ||
      content.includes('what tools')
    )
  }

  private detectWorkflowCompletion(context: ConversationContext): boolean {
    const recentMessages = context.messages.slice(-2)
    return recentMessages.some(
      (msg) =>
        msg.content.toLowerCase().includes('done') ||
        msg.content.toLowerCase().includes('finished') ||
        msg.content.toLowerCase().includes('complete') ||
        msg.content.toLowerCase().includes('success')
    )
  }

  private detectIntegrationOpportunity(context: ConversationContext): boolean {
    // Detect if multiple tools are mentioned in recent conversation
    const recentMessages = context.messages.slice(-5)
    const toolMentions = new Set<string>()

    for (const message of recentMessages) {
      if (message.metadata?.toolsUsed) {
        for (const tool of message.metadata.toolsUsed) {
          toolMentions.add(tool)
        }
      }
    }

    return toolMentions.size >= 2
  }

  /**
   * Helper methods
   */
  private isTriggerEnabled(conversation: ActiveConversation, triggerType: TriggerType): boolean {
    return conversation.triggers.some((t) => t.type === triggerType && t.enabled)
  }

  private isInCooldown(conversationId: string, triggerType: TriggerType): boolean {
    const cooldownKey = `${conversationId}-${triggerType}`
    const cooldownUntil = this.cooldowns.get(cooldownKey)

    if (!cooldownUntil) return false

    const now = new Date()
    if (now > cooldownUntil) {
      this.cooldowns.delete(cooldownKey)
      return false
    }

    return true
  }

  private getMaxSuggestionsForTrigger(triggerType: TriggerType): number {
    switch (triggerType) {
      case 'error_detected':
        return 2
      case 'user_pause':
        return 3
      case 'inefficient_pattern':
        return 1
      case 'new_capability':
        return 5
      case 'workflow_completion':
        return 2
      case 'integration_opportunity':
        return 3
      default:
        return 2
    }
  }

  private filterRecommendationsForTrigger(
    recommendations: ToolRecommendation[],
    triggerType: TriggerType
  ): ToolRecommendation[] {
    // Apply trigger-specific filtering
    switch (triggerType) {
      case 'error_detected':
        return recommendations.filter((r) => r.category === 'highly_relevant')
      case 'inefficient_pattern':
        return recommendations.filter(
          (r) => r.category === 'workflow_enhancement' || r.category === 'alternative_approach'
        )
      case 'new_capability':
        return recommendations.filter((r) => r.category === 'learning_opportunity')
      default:
        return recommendations
    }
  }

  private calculateUrgency(
    triggerType: TriggerType,
    recommendation: ToolRecommendation
  ): 'low' | 'medium' | 'high' {
    if (triggerType === 'error_detected') return 'high'
    if (triggerType === 'inefficient_pattern') return 'medium'
    if (recommendation.score > 0.8) return 'medium'
    return 'low'
  }

  private calculateTiming(
    triggerType: TriggerType,
    conversation: ActiveConversation
  ): 'immediate' | 'next_pause' | 'end_of_task' {
    if (triggerType === 'error_detected') return 'immediate'
    if (triggerType === 'user_pause') return 'immediate'
    if (triggerType === 'workflow_completion') return 'end_of_task'
    return 'next_pause'
  }

  private getDisplayDuration(urgency: 'low' | 'medium' | 'high'): number {
    switch (urgency) {
      case 'high':
        return 10000 // 10 seconds
      case 'medium':
        return 7000 // 7 seconds
      case 'low':
        return 5000 // 5 seconds
    }
  }

  private getDefaultTriggers(): SuggestionTrigger[] {
    return [
      { type: 'user_pause', threshold: 0.5, cooldown: 120, enabled: true },
      { type: 'error_detected', threshold: 0.8, cooldown: 60, enabled: true },
      { type: 'inefficient_pattern', threshold: 0.6, cooldown: 300, enabled: true },
      { type: 'new_capability', threshold: 0.4, cooldown: 600, enabled: true },
      { type: 'workflow_completion', threshold: 0.7, cooldown: 180, enabled: true },
      { type: 'integration_opportunity', threshold: 0.5, cooldown: 900, enabled: true },
    ]
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/)
    const words2 = str2.toLowerCase().split(/\s+/)

    const intersection = words1.filter((word) => words2.includes(word))
    const union = [...new Set([...words1, ...words2])]

    return union.length > 0 ? intersection.length / union.length : 0
  }

  private learnFromFeedback(suggestion: RealTimeSuggestion, feedback: SuggestionFeedback): void {
    // Update trigger thresholds based on feedback
    if (feedback.helpful && feedback.timely) {
      // This trigger is working well - potentially lower threshold
      logger.debug(`Positive feedback for trigger ${suggestion.trigger}`)
    } else if (!feedback.helpful || !feedback.accurate) {
      // This trigger needs adjustment - raise threshold
      logger.debug(`Negative feedback for trigger ${suggestion.trigger}`)
    }

    // In production, this would update ML model weights and trigger configurations
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    activeConversations: number
    totalSuggestions: number
    acceptanceRate: number
    triggerStats: Record<TriggerType, number>
  } {
    const totalSuggestions = Array.from(this.suggestionQueue.values()).reduce(
      (sum, queue) => sum + queue.length,
      0
    )

    const acceptedSuggestions = Array.from(this.suggestionQueue.values())
      .flat()
      .filter((s) => s.accepted).length

    const acceptanceRate = totalSuggestions > 0 ? acceptedSuggestions / totalSuggestions : 0

    const triggerStats: Record<string, number> = {}
    Array.from(this.suggestionQueue.values())
      .flat()
      .forEach((s) => {
        triggerStats[s.trigger] = (triggerStats[s.trigger] || 0) + 1
      })

    return {
      activeConversations: this.activeConversations.size,
      totalSuggestions,
      acceptanceRate,
      triggerStats: triggerStats as Record<TriggerType, number>,
    }
  }

  /**
   * Clean up old conversations and cooldowns
   */
  cleanup(): void {
    const now = new Date()
    const maxAge = 60 * 60 * 1000 // 1 hour

    // Clean up inactive conversations
    for (const [id, conversation] of this.activeConversations.entries()) {
      if (now.getTime() - conversation.lastActivity.getTime() > maxAge) {
        this.stopMonitoring(id)
        logger.debug(`Cleaned up inactive conversation ${id}`)
      }
    }

    // Clean up expired cooldowns
    for (const [key, expiry] of this.cooldowns.entries()) {
      if (now > expiry) {
        this.cooldowns.delete(key)
      }
    }
  }
}

export const realtimeSuggester = new RealtimeSuggester()

// Set up cleanup interval
setInterval(() => {
  realtimeSuggester.cleanup()
}, 300000) // Clean up every 5 minutes
