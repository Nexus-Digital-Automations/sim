/**
 * Contextual Help System Core Engine
 *
 * The main orchestrator for intelligent contextual help delivery.
 * Analyzes user context, detects help needs, and coordinates appropriate
 * help content delivery through multiple channels.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { contextAnalyzer } from '../../tool-recommendation/context-analyzer'
import type {
  HelpContext,
  HelpContent,
  HelpDeliveryConfig,
  HelpSystemMetrics,
  HelpEvent,
  ContentRecommendation,
  HelpSystemError,
} from '../types'

const logger = createLogger('ContextualHelpSystem')

export class ContextualHelpSystem {
  private activeHelpSessions = new Map<string, HelpSession>()
  private helpContent = new Map<string, HelpContent>()
  private userProfiles = new Map<string, UserHelpProfile>()
  private systemMetrics: HelpSystemMetrics
  private eventQueue: HelpEvent[] = []
  private contextDetectionRules: ContextDetectionRule[] = []

  constructor() {
    this.initializeSystem()
  }

  /**
   * Initialize the contextual help system
   */
  private async initializeSystem(): Promise<void> {
    logger.info('Initializing Contextual Help System')

    // Initialize system metrics
    this.systemMetrics = {
      totalUsers: 0,
      activeHelpSessions: 0,
      contentLibrarySize: 0,
      averageHelpSessionDuration: 0,
      topHelpTopics: [],
      userSatisfactionScore: 0,
      contentEffectiveness: {},
      systemPerformance: {
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
      },
    }

    // Load help content library
    await this.loadHelpContentLibrary()

    // Initialize context detection rules
    this.initializeContextDetectionRules()

    // Start periodic maintenance
    this.startMaintenanceLoop()

    logger.info('Contextual Help System initialized successfully')
  }

  /**
   * Analyze user context and provide appropriate help
   */
  async analyzeContextAndProvideHelp(context: HelpContext): Promise<{
    recommendations: ContentRecommendation[]
    urgentHelp?: HelpContent
    deliveryConfig: HelpDeliveryConfig
  }> {
    const startTime = Date.now()
    logger.info(`Analyzing context for help recommendations`, {
      userId: context.userId,
      currentRoute: context.currentRoute,
      toolContext: context.toolContext?.toolId,
    })

    try {
      // Update user profile
      await this.updateUserProfile(context)

      // Detect help needs
      const helpNeeds = await this.detectHelpNeeds(context)

      // Generate content recommendations
      const recommendations = await this.generateContentRecommendations(context, helpNeeds)

      // Check for urgent help scenarios
      const urgentHelp = await this.checkUrgentHelpNeeds(context, helpNeeds)

      // Determine optimal delivery configuration
      const deliveryConfig = await this.determineOptimalDelivery(context, recommendations)

      // Log event
      this.logHelpEvent({
        id: `help_analysis_${Date.now()}`,
        type: 'view',
        userId: context.userId,
        sessionId: context.sessionId,
        context,
        data: {
          recommendationCount: recommendations.length,
          hasUrgentHelp: !!urgentHelp,
          deliveryMode: deliveryConfig.mode,
        },
        timestamp: new Date(),
      })

      // Update metrics
      this.updateSystemMetrics('analysis', Date.now() - startTime)

      return {
        recommendations,
        urgentHelp,
        deliveryConfig,
      }
    } catch (error) {
      logger.error('Error analyzing context for help', {
        error: error instanceof Error ? error.message : String(error),
        context: context.id,
      })

      this.handleSystemError({
        code: 'CONTEXT_ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error during context analysis',
        context,
        timestamp: new Date(),
        severity: 'medium',
      })

      throw error
    }
  }

  /**
   * Get contextual help content based on current user state
   */
  async getContextualHelp(
    context: HelpContext,
    contentType?: string
  ): Promise<HelpContent | null> {
    logger.info(`Getting contextual help content`, {
      userId: context.userId,
      contentType,
      currentRoute: context.currentRoute,
    })

    // Check for active help session
    const session = this.activeHelpSessions.get(context.sessionId)
    if (session && session.currentContent) {
      return session.currentContent
    }

    // Find most relevant help content
    const relevantContent = await this.findRelevantContent(context, contentType)

    if (relevantContent) {
      // Start help session
      await this.startHelpSession(context, relevantContent)

      // Update analytics
      relevantContent.analytics.views++
      relevantContent.analytics.lastViewed = new Date()
    }

    return relevantContent
  }

  /**
   * Track user interaction with help content
   */
  async trackHelpInteraction(
    sessionId: string,
    contentId: string,
    interactionType: 'click' | 'scroll' | 'complete' | 'dismiss' | 'feedback',
    data?: Record<string, any>
  ): Promise<void> {
    const session = this.activeHelpSessions.get(sessionId)
    if (!session) {
      logger.warn('No active help session found for interaction tracking', { sessionId })
      return
    }

    const content = this.helpContent.get(contentId)
    if (!content) {
      logger.warn('Help content not found for interaction tracking', { contentId })
      return
    }

    // Update session
    session.interactions.push({
      type: interactionType,
      timestamp: new Date(),
      data,
    })

    // Update content analytics
    content.analytics.interactions++

    if (interactionType === 'complete') {
      content.analytics.completions++
      session.completed = true
      session.completedAt = new Date()
    }

    // Log event
    this.logHelpEvent({
      id: `interaction_${Date.now()}`,
      type: 'interaction',
      contentId,
      userId: session.context.userId,
      sessionId,
      context: session.context,
      data: {
        interactionType,
        ...data,
      },
      timestamp: new Date(),
    })

    logger.info(`Help interaction tracked`, {
      sessionId,
      contentId,
      interactionType,
    })
  }

  /**
   * End help session and collect completion metrics
   */
  async endHelpSession(
    sessionId: string,
    reason: 'completed' | 'dismissed' | 'timeout' | 'error'
  ): Promise<void> {
    const session = this.activeHelpSessions.get(sessionId)
    if (!session) {
      logger.warn('No active help session found for ending', { sessionId })
      return
    }

    const duration = Date.now() - session.startTime.getTime()

    // Update session
    session.endTime = new Date()
    session.endReason = reason
    session.duration = duration

    // Update user profile
    const userProfile = this.userProfiles.get(session.context.userId)
    if (userProfile) {
      userProfile.totalHelpSessions++
      userProfile.totalHelpTime += duration
      userProfile.lastHelpSession = new Date()

      if (reason === 'completed') {
        userProfile.completedSessions++
      }

      // Update struggling areas
      if (reason === 'dismissed' && session.currentContent) {
        const contentTags = session.currentContent.tags
        for (const tag of contentTags) {
          userProfile.strugglingAreas.set(tag, (userProfile.strugglingAreas.get(tag) || 0) + 1)
        }
      }
    }

    // Log completion event
    this.logHelpEvent({
      id: `session_end_${Date.now()}`,
      type: 'completion',
      contentId: session.currentContent?.id,
      userId: session.context.userId,
      sessionId,
      context: session.context,
      data: {
        reason,
        duration,
        interactionCount: session.interactions.length,
        completed: session.completed,
      },
      timestamp: new Date(),
    })

    // Remove from active sessions
    this.activeHelpSessions.delete(sessionId)

    // Update metrics
    this.systemMetrics.activeHelpSessions--
    this.updateSystemMetrics('session_completion', duration)

    logger.info(`Help session ended`, {
      sessionId,
      reason,
      duration: `${Math.round(duration / 1000)}s`,
      interactions: session.interactions.length,
    })
  }

  /**
   * Get system performance metrics
   */
  getSystemMetrics(): HelpSystemMetrics {
    return { ...this.systemMetrics }
  }

  /**
   * Get user help profile for personalization
   */
  getUserProfile(userId: string): UserHelpProfile | null {
    return this.userProfiles.get(userId) || null
  }

  /**
   * Update help content in the system
   */
  async updateHelpContent(content: HelpContent): Promise<void> {
    this.helpContent.set(content.id, content)
    this.systemMetrics.contentLibrarySize = this.helpContent.size
    logger.info(`Help content updated`, { contentId: content.id })
  }

  /**
   * Search help content
   */
  async searchHelpContent(
    query: string,
    context?: HelpContext,
    filters?: Record<string, any>
  ): Promise<HelpContent[]> {
    const results: Array<{ content: HelpContent; score: number }> = []

    for (const [id, content] of this.helpContent) {
      let score = 0

      // Text matching
      const queryLower = query.toLowerCase()
      if (content.title.toLowerCase().includes(queryLower)) score += 5
      if (content.description.toLowerCase().includes(queryLower)) score += 3
      if (content.tags.some((tag) => tag.toLowerCase().includes(queryLower))) score += 2

      // Context relevance
      if (context) {
        if (content.triggers.some((trigger) => this.evaluateTrigger(trigger, context))) {
          score += 3
        }
        if (content.conditions.every((condition) => this.evaluateCondition(condition, context))) {
          score += 2
        }
      }

      // Filter matching
      if (filters) {
        if (filters.type && content.type === filters.type) score += 1
        if (filters.priority && content.priority === filters.priority) score += 1
      }

      if (score > 0) {
        results.push({ content, score })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((result) => result.content)
  }

  // Private helper methods
  private async loadHelpContentLibrary(): Promise<void> {
    // TODO: Load from database or content management system
    // For now, initialize with some basic help content
    const basicContent: HelpContent[] = [
      {
        id: 'getting_started_guide',
        title: 'Getting Started with SIM',
        description: 'Learn the basics of using SIM for workflow automation',
        content: 'Welcome to SIM! This guide will help you get started...',
        type: 'tutorial',
        priority: 'high',
        triggers: [
          {
            type: 'route',
            condition: '/dashboard',
          },
        ],
        conditions: [
          {
            type: 'user_expertise',
            operator: 'equals',
            value: 'beginner',
          },
        ],
        tags: ['getting-started', 'basics', 'introduction'],
        version: '1.0.0',
        lastUpdated: new Date(),
        analytics: {
          views: 0,
          interactions: 0,
          completions: 0,
          averageRating: 0,
          feedbackCount: 0,
          lastViewed: new Date(),
          effectivenessScore: 0,
          userSegments: { beginner: 0, intermediate: 0, advanced: 0 },
          deliveryModes: {
            tooltip: 0,
            sidebar: 0,
            modal: 0,
            inline: 0,
            overlay: 0,
            voice: 0,
            chat: 0,
            notification: 0,
          },
          completionRate: 0,
          averageDuration: 0,
          dropOffPoints: [],
        },
      },
      // More content would be loaded here...
    ]

    for (const content of basicContent) {
      this.helpContent.set(content.id, content)
    }

    this.systemMetrics.contentLibrarySize = this.helpContent.size
    logger.info(`Loaded ${this.helpContent.size} help content items`)
  }

  private initializeContextDetectionRules(): void {
    this.contextDetectionRules = [
      {
        id: 'new_user_detection',
        condition: (context) =>
          context.userState.expertiseLevel === 'beginner' &&
          context.userState.recentActions.length === 0,
        helpPriority: 'high',
        contentTypes: ['tutorial', 'tooltip'],
      },
      {
        id: 'error_state_detection',
        condition: (context) => context.conversationContext?.messages.some(
          (msg) => msg.metadata?.intent?.primary === 'error_report'
        ),
        helpPriority: 'critical',
        contentTypes: ['modal', 'inline'],
      },
      {
        id: 'struggling_user_detection',
        condition: (context) => {
          const profile = this.userProfiles.get(context.userId)
          return profile ? profile.strugglingAreas.size > 3 : false
        },
        helpPriority: 'high',
        contentTypes: ['tutorial', 'voice'],
      },
    ]

    logger.info(`Initialized ${this.contextDetectionRules.length} context detection rules`)
  }

  private async updateUserProfile(context: HelpContext): Promise<void> {
    let profile = this.userProfiles.get(context.userId)

    if (!profile) {
      profile = {
        userId: context.userId,
        expertiseLevel: context.userState.expertiseLevel,
        preferredDeliveryModes: [context.userState.preferredHelpMode],
        strugglingAreas: new Map(),
        completedTutorials: [],
        totalHelpSessions: 0,
        completedSessions: 0,
        totalHelpTime: 0,
        averageSessionDuration: 0,
        lastHelpSession: new Date(),
        accessibilityNeeds: context.userState.accessibility,
        helpEffectiveness: new Map(),
        recentFeedback: [],
        adaptiveSettings: {
          autoTriggerHelp: true,
          progressiveDisclosure: true,
          voiceEnabled: context.userState.accessibility.voiceGuidance,
        },
      }
      this.userProfiles.set(context.userId, profile)
      this.systemMetrics.totalUsers++
    } else {
      // Update existing profile
      profile.expertiseLevel = context.userState.expertiseLevel
      profile.lastHelpSession = new Date()

      // Update accessibility needs
      profile.accessibilityNeeds = context.userState.accessibility
    }
  }

  private async detectHelpNeeds(context: HelpContext): Promise<HelpNeed[]> {
    const needs: HelpNeed[] = []

    // Apply context detection rules
    for (const rule of this.contextDetectionRules) {
      if (rule.condition(context)) {
        needs.push({
          type: rule.id,
          priority: rule.helpPriority,
          contentTypes: rule.contentTypes,
          context,
        })
      }
    }

    // Analyze conversation context if available
    if (context.conversationContext) {
      const insights = contextAnalyzer.getContextualInsights(context.conversationContext)

      // User frustration detection
      if (insights.sentimentTrend < -0.3) {
        needs.push({
          type: 'user_frustration',
          priority: 'high',
          contentTypes: ['voice', 'tutorial'],
          context,
        })
      }

      // Help request detection
      if (insights.dominantIntents.includes('help_request')) {
        needs.push({
          type: 'explicit_help_request',
          priority: 'critical',
          contentTypes: ['modal', 'tutorial'],
          context,
        })
      }
    }

    logger.info(`Detected ${needs.length} help needs`, {
      userId: context.userId,
      needs: needs.map((n) => ({ type: n.type, priority: n.priority })),
    })

    return needs
  }

  private async generateContentRecommendations(
    context: HelpContext,
    helpNeeds: HelpNeed[]
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    for (const need of helpNeeds) {
      const relevantContent = await this.findContentForNeed(need)

      for (const content of relevantContent) {
        const confidence = this.calculateRecommendationConfidence(content, need, context)

        recommendations.push({
          contentId: content.id,
          reason: `Addresses ${need.type} with ${confidence * 100}% confidence`,
          confidence,
          context: {
            userState: context.userState.expertiseLevel,
            currentAction: context.currentAction || 'unknown',
            similarUsers: [], // TODO: Implement similar user matching
          },
        })
      }
    }

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // Limit recommendations
  }

  private async checkUrgentHelpNeeds(
    context: HelpContext,
    helpNeeds: HelpNeed[]
  ): Promise<HelpContent | undefined> {
    const urgentNeeds = helpNeeds.filter((need) => need.priority === 'critical')

    if (urgentNeeds.length === 0) {
      return undefined
    }

    // Find the most appropriate urgent help content
    const urgentNeed = urgentNeeds[0]
    const relevantContent = await this.findContentForNeed(urgentNeed)

    return relevantContent.length > 0 ? relevantContent[0] : undefined
  }

  private async determineOptimalDelivery(
    context: HelpContext,
    recommendations: ContentRecommendation[]
  ): Promise<HelpDeliveryConfig> {
    const userProfile = this.userProfiles.get(context.userId)

    // Base configuration
    const config: HelpDeliveryConfig = {
      mode: context.userState.preferredHelpMode,
      behavior: {
        autoClose: 30000, // 30 seconds
        persistent: false,
        dismissible: true,
      },
      accessibility: {
        announceToScreenReader: context.userState.accessibility.screenReader,
        trapFocus: true,
        returnFocus: true,
      },
    }

    // Adapt based on context and recommendations
    if (recommendations.length > 0) {
      const topRecommendation = recommendations[0]
      const content = this.helpContent.get(topRecommendation.contentId)

      if (content) {
        // Override mode based on content type and priority
        if (content.priority === 'critical') {
          config.mode = 'modal'
          config.behavior!.persistent = true
        } else if (content.type === 'tooltip') {
          config.mode = 'tooltip'
          config.behavior!.autoClose = 10000
        }
      }
    }

    // Accessibility adaptations
    if (context.userState.accessibility.reducedMotion) {
      config.styling = {
        ...config.styling,
        animation: 'none',
      }
    }

    if (context.userState.accessibility.highContrast) {
      config.styling = {
        ...config.styling,
        theme: 'dark',
      }
    }

    return config
  }

  private async startHelpSession(context: HelpContext, content: HelpContent): Promise<void> {
    const session: HelpSession = {
      id: `session_${Date.now()}`,
      context,
      currentContent: content,
      startTime: new Date(),
      interactions: [],
      completed: false,
    }

    this.activeHelpSessions.set(context.sessionId, session)
    this.systemMetrics.activeHelpSessions++

    logger.info(`Started help session`, {
      sessionId: session.id,
      contentId: content.id,
      userId: context.userId,
    })
  }

  private async findRelevantContent(
    context: HelpContext,
    contentType?: string
  ): Promise<HelpContent | null> {
    let bestMatch: HelpContent | null = null
    let bestScore = 0

    for (const [id, content] of this.helpContent) {
      if (contentType && content.type !== contentType) continue

      let score = 0

      // Check triggers
      for (const trigger of content.triggers) {
        if (this.evaluateTrigger(trigger, context)) {
          score += 3
        }
      }

      // Check conditions
      const conditionsMet = content.conditions.every((condition) =>
        this.evaluateCondition(condition, context)
      )
      if (conditionsMet) {
        score += 2
      }

      // Priority bonus
      const priorityBonus = { low: 0, medium: 1, high: 2, critical: 3 }
      score += priorityBonus[content.priority]

      if (score > bestScore) {
        bestScore = score
        bestMatch = content
      }
    }

    return bestMatch
  }

  private evaluateTrigger(trigger: any, context: HelpContext): boolean {
    switch (trigger.type) {
      case 'route':
        return context.currentRoute.includes(trigger.condition)
      case 'action':
        return context.currentAction === trigger.condition
      case 'user_state':
        return context.userState.expertiseLevel === trigger.condition
      default:
        return false
    }
  }

  private evaluateCondition(condition: any, context: HelpContext): boolean {
    switch (condition.type) {
      case 'user_expertise':
        return condition.operator === 'equals'
          ? context.userState.expertiseLevel === condition.value
          : context.userState.expertiseLevel !== condition.value
      default:
        return true
    }
  }

  private async findContentForNeed(need: HelpNeed): Promise<HelpContent[]> {
    const matching: HelpContent[] = []

    for (const [id, content] of this.helpContent) {
      // Check if content type matches need
      if (need.contentTypes.includes(content.type)) {
        // Check if content addresses the need
        if (content.tags.some((tag) => need.type.includes(tag))) {
          matching.push(content)
        }
      }
    }

    return matching
  }

  private calculateRecommendationConfidence(
    content: HelpContent,
    need: HelpNeed,
    context: HelpContext
  ): number {
    let confidence = 0.5 // Base confidence

    // Content type match
    if (need.contentTypes.includes(content.type)) confidence += 0.2

    // Priority match
    if (content.priority === need.priority) confidence += 0.15

    // Tag relevance
    const relevantTags = content.tags.filter((tag) => need.type.includes(tag))
    confidence += (relevantTags.length / content.tags.length) * 0.1

    // Historical effectiveness
    if (content.analytics.effectivenessScore > 0.7) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  private logHelpEvent(event: HelpEvent): void {
    this.eventQueue.push(event)

    // Process events in batches
    if (this.eventQueue.length >= 100) {
      this.processEventQueue()
    }
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return

    // TODO: Send events to analytics service
    logger.info(`Processing ${this.eventQueue.length} help events`)

    // Clear queue
    this.eventQueue = []
  }

  private updateSystemMetrics(operation: string, duration?: number): void {
    if (duration) {
      // Update response time
      const currentAvg = this.systemMetrics.systemPerformance.averageResponseTime
      this.systemMetrics.systemPerformance.averageResponseTime =
        (currentAvg + duration) / 2
    }

    // TODO: Update other metrics based on operation
  }

  private handleSystemError(error: HelpSystemError): void {
    logger.error('Help system error', error)

    // TODO: Implement error handling and recovery
    this.systemMetrics.systemPerformance.errorRate++
  }

  private startMaintenanceLoop(): void {
    setInterval(() => {
      // Clean up expired sessions
      const now = Date.now()
      const sessionTimeout = 30 * 60 * 1000 // 30 minutes

      for (const [sessionId, session] of this.activeHelpSessions) {
        if (now - session.startTime.getTime() > sessionTimeout) {
          this.endHelpSession(sessionId, 'timeout')
        }
      }

      // Process queued events
      if (this.eventQueue.length > 0) {
        this.processEventQueue()
      }
    }, 5 * 60 * 1000) // Every 5 minutes

    logger.info('Started help system maintenance loop')
  }
}

// Supporting interfaces
interface HelpSession {
  id: string
  context: HelpContext
  currentContent: HelpContent | null
  startTime: Date
  endTime?: Date
  endReason?: string
  duration?: number
  interactions: Array<{
    type: string
    timestamp: Date
    data?: Record<string, any>
  }>
  completed: boolean
  completedAt?: Date
}

interface UserHelpProfile {
  userId: string
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced'
  preferredDeliveryModes: string[]
  strugglingAreas: Map<string, number>
  completedTutorials: string[]
  totalHelpSessions: number
  completedSessions: number
  totalHelpTime: number
  averageSessionDuration: number
  lastHelpSession: Date
  accessibilityNeeds: any
  helpEffectiveness: Map<string, number>
  recentFeedback: any[]
  adaptiveSettings: {
    autoTriggerHelp: boolean
    progressiveDisclosure: boolean
    voiceEnabled: boolean
  }
}

interface HelpNeed {
  type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  contentTypes: string[]
  context: HelpContext
}

interface ContextDetectionRule {
  id: string
  condition: (context: HelpContext) => boolean
  helpPriority: 'low' | 'medium' | 'high' | 'critical'
  contentTypes: string[]
}

// Export singleton instance
export const contextualHelpSystem = new ContextualHelpSystem()