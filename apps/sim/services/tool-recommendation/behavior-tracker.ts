/**
 * User Behavior Tracking System
 *
 * Comprehensive system for tracking and analyzing user behavior patterns,
 * tool usage, preferences, and learning progress to build detailed user
 * profiles for intelligent tool recommendations.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  UserBehaviorProfile,
  UserPreferences,
  UsagePattern,
  ToolSequence,
  ToolFamiliarityScore,
  ToolSuccessRate,
  CollaborationStyle,
  LearningEvent,
  LearningEventType,
} from './types'

const logger = createLogger('BehaviorTracker')

interface SessionData {
  sessionId: string
  userId: string
  workspaceId: string
  startTime: Date
  endTime?: Date
  toolsUsed: string[]
  interactions: InteractionEvent[]
  context: string[]
}

interface InteractionEvent {
  timestamp: Date
  type: 'tool_execution' | 'tool_selection' | 'error' | 'help_request' | 'feedback'
  toolId?: string
  data: Record<string, any>
  outcome: 'success' | 'failure' | 'partial' | 'abandoned'
  duration?: number
}

export class BehaviorTracker {
  private sessions: Map<string, SessionData>
  private userProfiles: Map<string, UserBehaviorProfile>
  private learningEvents: Map<string, LearningEvent[]>
  private patternCache: Map<string, UsagePattern[]>

  constructor() {
    this.sessions = new Map()
    this.userProfiles = new Map()
    this.learningEvents = new Map()
    this.patternCache = new Map()
  }

  /**
   * Start tracking a new user session
   */
  startSession(userId: string, workspaceId: string, sessionId: string): void {
    logger.info(`Starting behavior tracking for session ${sessionId}`)

    const sessionData: SessionData = {
      sessionId,
      userId,
      workspaceId,
      startTime: new Date(),
      toolsUsed: [],
      interactions: [],
      context: [],
    }

    this.sessions.set(sessionId, sessionData)
  }

  /**
   * End a user session and process the data
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      logger.warn(`No session found for ID: ${sessionId}`)
      return
    }

    session.endTime = new Date()
    logger.info(`Ending session ${sessionId} after ${this.getSessionDuration(session)}ms`)

    // Process session data
    await this.processSessionData(session)

    // Update user profile
    await this.updateUserProfile(session)

    // Clean up
    this.sessions.delete(sessionId)
  }

  /**
   * Track a tool execution event
   */
  trackToolExecution(
    sessionId: string,
    toolId: string,
    outcome: 'success' | 'failure' | 'partial',
    duration: number,
    context?: Record<string, any>
  ): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const event: InteractionEvent = {
      timestamp: new Date(),
      type: 'tool_execution',
      toolId,
      data: context || {},
      outcome,
      duration,
    }

    session.interactions.push(event)
    if (!session.toolsUsed.includes(toolId)) {
      session.toolsUsed.push(toolId)
    }

    // Record learning event
    this.recordLearningEvent(session.userId, session.workspaceId, {
      eventType: 'tool_selected',
      toolId,
      outcome: outcome === 'success' ? 'positive' : outcome === 'failure' ? 'negative' : 'neutral',
      context: { duration, ...context },
    })

    logger.debug(`Tool execution tracked: ${toolId} (${outcome})`)
  }

  /**
   * Track user tool selection behavior
   */
  trackToolSelection(
    sessionId: string,
    selectedToolId: string,
    alternativesShown: string[],
    selectionTime: number
  ): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const event: InteractionEvent = {
      timestamp: new Date(),
      type: 'tool_selection',
      toolId: selectedToolId,
      data: {
        alternatives: alternativesShown,
        selectionTime,
        alternativeCount: alternativesShown.length,
      },
      outcome: 'success',
      duration: selectionTime,
    }

    session.interactions.push(event)

    this.recordLearningEvent(session.userId, session.workspaceId, {
      eventType: 'tool_selected',
      toolId: selectedToolId,
      outcome: 'positive',
      context: { alternatives: alternativesShown, selectionTime },
    })
  }

  /**
   * Track user errors and help requests
   */
  trackError(sessionId: string, toolId: string, errorType: string, errorMessage: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const event: InteractionEvent = {
      timestamp: new Date(),
      type: 'error',
      toolId,
      data: { errorType, errorMessage },
      outcome: 'failure',
    }

    session.interactions.push(event)

    this.recordLearningEvent(session.userId, session.workspaceId, {
      eventType: 'error_encountered',
      toolId,
      outcome: 'negative',
      context: { errorType, errorMessage },
    })
  }

  /**
   * Track help requests and learning behaviors
   */
  trackHelpRequest(sessionId: string, toolId: string, helpType: string, resolved: boolean): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const event: InteractionEvent = {
      timestamp: new Date(),
      type: 'help_request',
      toolId,
      data: { helpType, resolved },
      outcome: resolved ? 'success' : 'partial',
    }

    session.interactions.push(event)

    this.recordLearningEvent(session.userId, session.workspaceId, {
      eventType: 'help_requested',
      toolId,
      outcome: resolved ? 'positive' : 'neutral',
      context: { helpType },
    })
  }

  /**
   * Track user feedback on recommendations
   */
  trackFeedback(
    sessionId: string,
    recommendationId: string,
    toolId: string,
    rating: number,
    feedback: string
  ): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const event: InteractionEvent = {
      timestamp: new Date(),
      type: 'feedback',
      toolId,
      data: { recommendationId, rating, feedback },
      outcome: rating >= 3 ? 'success' : 'failure',
    }

    session.interactions.push(event)

    this.recordLearningEvent(session.userId, session.workspaceId, {
      eventType: 'feedback_provided',
      toolId,
      outcome: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
      context: { rating, feedback },
    })
  }

  /**
   * Get or create user behavior profile
   */
  async getUserProfile(userId: string, workspaceId: string): Promise<UserBehaviorProfile> {
    const profileKey = `${userId}-${workspaceId}`
    let profile = this.userProfiles.get(profileKey)

    if (!profile) {
      profile = await this.createNewProfile(userId, workspaceId)
      this.userProfiles.set(profileKey, profile)
    }

    return profile
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    workspaceId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const profile = await this.getUserProfile(userId, workspaceId)
    profile.preferences = { ...profile.preferences, ...preferences }
    profile.updatedAt = new Date()

    const profileKey = `${userId}-${workspaceId}`
    this.userProfiles.set(profileKey, profile)

    logger.info(`Updated preferences for user ${userId}`)
  }

  /**
   * Analyze usage patterns for insights
   */
  async analyzeUsagePatterns(userId: string, workspaceId: string): Promise<{
    dominantPatterns: UsagePattern[]
    toolPreferences: string[]
    collaborationInsights: CollaborationStyle
    learningProgress: number
    recommendations: string[]
  }> {
    const profile = await this.getUserProfile(userId, workspaceId)

    // Find dominant usage patterns
    const dominantPatterns = profile.patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)

    // Identify tool preferences
    const toolPreferences = Object.entries(profile.toolFamiliarity)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 10)
      .map(([toolId]) => toolId)

    // Calculate learning progress
    const learningProgress = this.calculateLearningProgress(profile)

    // Generate behavioral recommendations
    const recommendations = this.generateBehavioralRecommendations(profile)

    return {
      dominantPatterns,
      toolPreferences,
      collaborationInsights: profile.collaborationStyle,
      learningProgress,
      recommendations,
    }
  }

  /**
   * Process session data to extract patterns
   */
  private async processSessionData(session: SessionData): Promise<void> {
    const duration = this.getSessionDuration(session)
    const hour = session.startTime.getHours()
    const dayOfWeek = session.startTime.getDay()

    // Extract tool sequences
    const toolSequences = this.extractToolSequences(session.interactions)

    // Update pattern cache
    const patternKey = `${session.userId}-${session.workspaceId}`
    const existingPatterns = this.patternCache.get(patternKey) || []

    // Find or create pattern for this time slot
    let pattern = existingPatterns.find(
      p => p.timeOfDay === hour && p.dayOfWeek === dayOfWeek
    )

    if (!pattern) {
      pattern = {
        timeOfDay: hour,
        dayOfWeek,
        toolSequences: [],
        sessionDuration: duration,
        frequency: 1,
        context: session.context,
      }
      existingPatterns.push(pattern)
    } else {
      pattern.frequency++
      pattern.sessionDuration = (pattern.sessionDuration + duration) / 2 // Average
    }

    // Update tool sequences
    for (const sequence of toolSequences) {
      const existingSequence = pattern.toolSequences.find(s =>
        this.arraysEqual(s.tools, sequence.tools)
      )

      if (existingSequence) {
        existingSequence.frequency++
        existingSequence.averageDuration = (existingSequence.averageDuration + sequence.averageDuration) / 2
        existingSequence.successRate = this.calculateSequenceSuccessRate(session, sequence.tools)
      } else {
        pattern.toolSequences.push({
          ...sequence,
          frequency: 1,
          successRate: this.calculateSequenceSuccessRate(session, sequence.tools),
        })
      }
    }

    this.patternCache.set(patternKey, existingPatterns)
  }

  /**
   * Update user profile with session insights
   */
  private async updateUserProfile(session: SessionData): Promise<void> {
    const profile = await this.getUserProfile(session.userId, session.workspaceId)

    // Update tool familiarity scores
    for (const toolId of session.toolsUsed) {
      if (!profile.toolFamiliarity[toolId]) {
        profile.toolFamiliarity[toolId] = {
          toolId,
          score: 0.1,
          usageCount: 0,
          lastUsed: new Date(),
          errorRate: 0,
          helpRequests: 0,
        }
      }

      const familiarity = profile.toolFamiliarity[toolId]
      familiarity.usageCount++
      familiarity.lastUsed = new Date()

      // Update familiarity score based on usage and success
      const successfulUses = session.interactions.filter(
        i => i.toolId === toolId && i.outcome === 'success'
      ).length
      const totalUses = session.interactions.filter(i => i.toolId === toolId).length
      const sessionSuccessRate = totalUses > 0 ? successfulUses / totalUses : 0

      familiarity.score = Math.min(1, familiarity.score + 0.1 * sessionSuccessRate)

      // Update error rate
      const errors = session.interactions.filter(
        i => i.toolId === toolId && i.type === 'error'
      ).length
      familiarity.errorRate = (familiarity.errorRate + errors / totalUses) / 2

      // Update help requests
      const helpRequests = session.interactions.filter(
        i => i.toolId === toolId && i.type === 'help_request'
      ).length
      familiarity.helpRequests += helpRequests
    }

    // Update success rates
    for (const toolId of session.toolsUsed) {
      if (!profile.successRates[toolId]) {
        profile.successRates[toolId] = {
          toolId,
          attempts: 0,
          successes: 0,
          rate: 0,
          lastCalculated: new Date(),
          commonErrors: [],
        }
      }

      const successRate = profile.successRates[toolId]
      const toolInteractions = session.interactions.filter(i => i.toolId === toolId)
      const successes = toolInteractions.filter(i => i.outcome === 'success').length

      successRate.attempts += toolInteractions.length
      successRate.successes += successes
      successRate.rate = successRate.attempts > 0 ? successRate.successes / successRate.attempts : 0
      successRate.lastCalculated = new Date()

      // Update common errors
      const errors = toolInteractions
        .filter(i => i.type === 'error')
        .map(i => i.data.errorType)
        .filter(Boolean)

      for (const error of errors) {
        if (!successRate.commonErrors.includes(error)) {
          successRate.commonErrors.push(error)
        }
      }
    }

    // Update usage patterns from cache
    const patternKey = `${session.userId}-${session.workspaceId}`
    const patterns = this.patternCache.get(patternKey) || []
    profile.patterns = patterns

    profile.updatedAt = new Date()
  }

  /**
   * Create a new user profile with default values
   */
  private async createNewProfile(userId: string, workspaceId: string): Promise<UserBehaviorProfile> {
    return {
      userId,
      workspaceId,
      preferences: {
        preferredCategories: [],
        toolComplexityTolerance: 'intermediate',
        communicationStyle: 'casual',
        feedbackFrequency: 'medium',
        privacyLevel: 'moderate',
        learningStyle: 'guided',
      },
      patterns: [],
      toolFamiliarity: {},
      successRates: {},
      collaborationStyle: {
        prefersIndependentWork: false,
        sharesWorkflows: true,
        askForHelp: 'sometimes',
        mentorsOthers: false,
        teamRole: 'contributor',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Record learning events for analysis
   */
  private recordLearningEvent(
    userId: string,
    workspaceId: string,
    eventData: {
      eventType: LearningEventType
      toolId?: string
      outcome: 'positive' | 'negative' | 'neutral'
      context: Record<string, any>
    }
  ): void {
    const userKey = `${userId}-${workspaceId}`
    const events = this.learningEvents.get(userKey) || []

    const learningEvent: LearningEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      workspaceId,
      eventType: eventData.eventType,
      toolId: eventData.toolId,
      context: eventData.context,
      outcome: eventData.outcome,
      timestamp: new Date(),
    }

    events.push(learningEvent)

    // Keep only last 1000 events per user
    if (events.length > 1000) {
      events.splice(0, events.length - 1000)
    }

    this.learningEvents.set(userKey, events)
  }

  /**
   * Extract tool usage sequences from interactions
   */
  private extractToolSequences(interactions: InteractionEvent[]): ToolSequence[] {
    const sequences: ToolSequence[] = []
    const toolEvents = interactions
      .filter(i => i.type === 'tool_execution' && i.toolId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Group consecutive tool uses into sequences
    let currentSequence: string[] = []
    let sequenceDuration = 0

    for (let i = 0; i < toolEvents.length; i++) {
      const event = toolEvents[i]
      const nextEvent = toolEvents[i + 1]

      currentSequence.push(event.toolId!)
      sequenceDuration += event.duration || 0

      // End sequence if next event is far apart or we're at the end
      const isEndOfSequence =
        !nextEvent ||
        nextEvent.timestamp.getTime() - event.timestamp.getTime() > 300000 // 5 minutes

      if (isEndOfSequence && currentSequence.length > 1) {
        sequences.push({
          tools: [...currentSequence],
          frequency: 1,
          successRate: 0, // Will be calculated later
          averageDuration: sequenceDuration,
        })
        currentSequence = []
        sequenceDuration = 0
      }
    }

    return sequences
  }

  /**
   * Calculate success rate for a tool sequence
   */
  private calculateSequenceSuccessRate(session: SessionData, tools: string[]): number {
    let totalAttempts = 0
    let successfulAttempts = 0

    for (const toolId of tools) {
      const toolInteractions = session.interactions.filter(
        i => i.toolId === toolId && i.type === 'tool_execution'
      )

      totalAttempts += toolInteractions.length
      successfulAttempts += toolInteractions.filter(i => i.outcome === 'success').length
    }

    return totalAttempts > 0 ? successfulAttempts / totalAttempts : 0
  }

  /**
   * Calculate user learning progress
   */
  private calculateLearningProgress(profile: UserBehaviorProfile): number {
    const familiarityScores = Object.values(profile.toolFamiliarity)
    const averageFamiliarity = familiarityScores.reduce((sum, f) => sum + f.score, 0) / familiarityScores.length || 0

    const successRates = Object.values(profile.successRates)
    const averageSuccess = successRates.reduce((sum, s) => sum + s.rate, 0) / successRates.length || 0

    return (averageFamiliarity + averageSuccess) / 2
  }

  /**
   * Generate behavioral recommendations
   */
  private generateBehavioralRecommendations(profile: UserBehaviorProfile): string[] {
    const recommendations: string[] = []

    // Check for improvement opportunities
    const lowFamiliarityTools = Object.values(profile.toolFamiliarity)
      .filter(f => f.score < 0.3 && f.usageCount > 0)
      .map(f => f.toolId)

    if (lowFamiliarityTools.length > 0) {
      recommendations.push('Consider additional training on frequently used but unfamiliar tools')
    }

    const lowSuccessTools = Object.values(profile.successRates)
      .filter(s => s.rate < 0.5 && s.attempts > 3)
      .map(s => s.toolId)

    if (lowSuccessTools.length > 0) {
      recommendations.push('Review tool documentation for tools with low success rates')
    }

    // Pattern-based recommendations
    const hasConsistentPatterns = profile.patterns.some(p => p.frequency > 5)
    if (!hasConsistentPatterns) {
      recommendations.push('Try to establish consistent work patterns for better tool recommendations')
    }

    return recommendations
  }

  // Utility methods
  private getSessionDuration(session: SessionData): number {
    const endTime = session.endTime || new Date()
    return endTime.getTime() - session.startTime.getTime()
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i])
  }

  /**
   * Get user behavior analytics
   */
  async getUserAnalytics(userId: string, workspaceId: string): Promise<{
    totalSessions: number
    averageSessionDuration: number
    mostUsedTools: string[]
    learningVelocity: number
    collaborationMetrics: Record<string, any>
  }> {
    const userKey = `${userId}-${workspaceId}`
    const events = this.learningEvents.get(userKey) || []
    const profile = await this.getUserProfile(userId, workspaceId)

    // Calculate session metrics
    const sessions = events.filter(e => e.eventType === 'tool_selected').length
    const totalDuration = profile.patterns.reduce((sum, p) => sum + p.sessionDuration * p.frequency, 0)
    const averageDuration = sessions > 0 ? totalDuration / sessions : 0

    // Most used tools
    const toolUsage = Object.entries(profile.toolFamiliarity)
      .sort(([, a], [, b]) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(([toolId]) => toolId)

    // Learning velocity (improvement rate)
    const learningEvents = events.filter(e => e.outcome === 'positive').length
    const learningVelocity = events.length > 0 ? learningEvents / events.length : 0

    return {
      totalSessions: sessions,
      averageSessionDuration: averageDuration,
      mostUsedTools: toolUsage,
      learningVelocity,
      collaborationMetrics: {
        helpsGiven: profile.collaborationStyle.mentorsOthers ? 1 : 0,
        helpsReceived: events.filter(e => e.eventType === 'help_requested').length,
        workflowsShared: profile.collaborationStyle.sharesWorkflows ? 1 : 0,
      },
    }
  }
}

export const behaviorTracker = new BehaviorTracker()