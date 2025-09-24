/**
 * Personalization and Learning Engine
 *
 * Advanced personalization system that adapts tool recommendations based on
 * individual user preferences, learning patterns, feedback, and continuous
 * improvement through machine learning and rule-based adaptation.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  PersonalizationConfig,
  PersonalizationRule,
  PersonalizationAction,
  PrivacySettings,
  LearningEvent,
  UserBehaviorProfile,
  ToolRecommendation,
  RecommendationSet,
  SuggestionFeedback,
} from './types'

const logger = createLogger('PersonalizationEngine')

interface AdaptationRule {
  id: string
  condition: (event: LearningEvent, profile: UserBehaviorProfile) => boolean
  adaptation: (profile: UserBehaviorProfile, event: LearningEvent) => void
  weight: number
  enabled: boolean
}

interface LearningModel {
  userId: string
  workspaceId: string
  preferences: Map<string, number> // Tool preference scores
  patterns: Map<string, any> // Learned patterns
  adaptationHistory: AdaptationEvent[]
  lastUpdated: Date
}

interface AdaptationEvent {
  timestamp: Date
  type: string
  context: Record<string, any>
  impact: number
}

export class PersonalizationEngine {
  private userConfigs: Map<string, PersonalizationConfig>
  private learningModels: Map<string, LearningModel>
  private adaptationRules: AdaptationRule[]
  private feedbackHistory: Map<string, SuggestionFeedback[]>

  constructor() {
    this.userConfigs = new Map()
    this.learningModels = new Map()
    this.adaptationRules = []
    this.feedbackHistory = new Map()
    this.initializeAdaptationRules()
  }

  /**
   * Get or create personalization configuration for a user
   */
  async getPersonalizationConfig(
    userId: string,
    workspaceId: string
  ): Promise<PersonalizationConfig> {
    const configKey = `${userId}-${workspaceId}`
    let config = this.userConfigs.get(configKey)

    if (!config) {
      config = await this.createDefaultConfig(userId, workspaceId)
      this.userConfigs.set(configKey, config)
    }

    return config
  }

  /**
   * Update user personalization settings
   */
  async updatePersonalizationConfig(
    userId: string,
    workspaceId: string,
    updates: Partial<PersonalizationConfig>
  ): Promise<void> {
    const configKey = `${userId}-${workspaceId}`
    const existingConfig = await this.getPersonalizationConfig(userId, workspaceId)

    const updatedConfig = { ...existingConfig, ...updates }
    this.userConfigs.set(configKey, updatedConfig)

    logger.info(`Updated personalization config for user ${userId}`)
  }

  /**
   * Personalize recommendations based on user profile and preferences
   */
  async personalizeRecommendations(
    userId: string,
    workspaceId: string,
    recommendations: RecommendationSet,
    profile: UserBehaviorProfile
  ): Promise<RecommendationSet> {
    logger.debug(`Personalizing recommendations for user ${userId}`)

    const config = await this.getPersonalizationConfig(userId, workspaceId)
    const model = await this.getLearningModel(userId, workspaceId)

    // Apply personalization rules
    let personalizedRecommendations = [...recommendations.recommendations]

    for (const rule of config.customRules.filter(r => r.enabled)) {
      personalizedRecommendations = this.applyPersonalizationRule(
        personalizedRecommendations,
        rule,
        profile
      )
    }

    // Apply learned preferences
    personalizedRecommendations = this.applyLearnedPreferences(
      personalizedRecommendations,
      model,
      config
    )

    // Apply privacy settings
    personalizedRecommendations = this.applyPrivacySettings(
      personalizedRecommendations,
      config.privacySettings
    )

    // Re-sort by personalized scores
    personalizedRecommendations.sort((a, b) => b.score - a.score)

    return {
      ...recommendations,
      recommendations: personalizedRecommendations,
      metadata: {
        ...recommendations.metadata,
        personalizedFor: userId,
        adaptationLevel: config.adaptationRate,
      },
    }
  }

  /**
   * Process learning event and adapt user model
   */
  async processLearningEvent(
    userId: string,
    workspaceId: string,
    event: LearningEvent,
    profile: UserBehaviorProfile
  ): Promise<void> {
    logger.debug(`Processing learning event: ${event.eventType} for user ${userId}`)

    const config = await this.getPersonalizationConfig(userId, workspaceId)
    const model = await this.getLearningModel(userId, workspaceId)

    // Apply adaptation rules
    for (const rule of this.adaptationRules.filter(r => r.enabled)) {
      if (rule.condition(event, profile)) {
        rule.adaptation(profile, event)

        // Record adaptation
        model.adaptationHistory.push({
          timestamp: new Date(),
          type: rule.id,
          context: { eventType: event.eventType, toolId: event.toolId },
          impact: rule.weight,
        })
      }
    }

    // Update learned patterns
    await this.updateLearnedPatterns(model, event, config)

    // Cleanup old adaptations
    this.cleanupAdaptationHistory(model)

    // Update model
    model.lastUpdated = new Date()
    this.learningModels.set(`${userId}-${workspaceId}`, model)
  }

  /**
   * Process feedback and improve personalization
   */
  async processFeedback(
    userId: string,
    workspaceId: string,
    recommendationId: string,
    feedback: SuggestionFeedback,
    toolId: string
  ): Promise<void> {
    logger.info(`Processing feedback for user ${userId}, tool ${toolId}`)

    // Store feedback
    const feedbackKey = `${userId}-${workspaceId}`
    const history = this.feedbackHistory.get(feedbackKey) || []
    history.push({
      ...feedback,
      submittedAt: new Date(),
    })

    // Keep last 100 feedback items
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }

    this.feedbackHistory.set(feedbackKey, history)

    // Get models
    const config = await this.getPersonalizationConfig(userId, workspaceId)
    const model = await this.getLearningModel(userId, workspaceId)

    // Update tool preferences based on feedback
    const currentPreference = model.preferences.get(toolId) || 0.5

    let adjustmentFactor = 0
    if (feedback.helpful && feedback.accurate) {
      adjustmentFactor = 0.1 * feedback.rating / 5 // Positive adjustment
    } else if (!feedback.helpful || !feedback.accurate) {
      adjustmentFactor = -0.05 * (5 - feedback.rating) / 5 // Negative adjustment
    }

    const newPreference = Math.max(0, Math.min(1,
      currentPreference + adjustmentFactor * config.feedbackSensitivity
    ))

    model.preferences.set(toolId, newPreference)

    // Learn from feedback patterns
    await this.learnFromFeedbackPatterns(model, feedback, toolId)

    logger.debug(`Updated preference for ${toolId}: ${currentPreference} → ${newPreference}`)
  }

  /**
   * Generate personalized learning recommendations
   */
  async generateLearningRecommendations(
    userId: string,
    workspaceId: string,
    profile: UserBehaviorProfile
  ): Promise<{
    skillGaps: string[]
    recommendedTraining: string[]
    toolMastery: Array<{ toolId: string; level: string }>
    nextLearningGoals: string[]
  }> {
    const model = await this.getLearningModel(userId, workspaceId)
    const config = await this.getPersonalizationConfig(userId, workspaceId)

    // Identify skill gaps
    const skillGaps = this.identifySkillGaps(profile, model)

    // Recommend training based on usage patterns and feedback
    const recommendedTraining = this.recommendTraining(profile, model)

    // Assess tool mastery levels
    const toolMastery = this.assessToolMastery(profile, model)

    // Generate next learning goals
    const nextLearningGoals = this.generateLearningGoals(profile, model, config)

    return {
      skillGaps,
      recommendedTraining,
      toolMastery,
      nextLearningGoals,
    }
  }

  /**
   * Export personalization data (respecting privacy settings)
   */
  async exportPersonalizationData(
    userId: string,
    workspaceId: string
  ): Promise<{
    preferences: Record<string, any>
    learningProgress: Record<string, any>
    adaptationHistory: AdaptationEvent[]
    privacyCompliant: boolean
  }> {
    const config = await this.getPersonalizationConfig(userId, workspaceId)
    const model = await this.getLearningModel(userId, workspaceId)

    let exportData = {
      preferences: Object.fromEntries(model.preferences),
      learningProgress: Object.fromEntries(model.patterns),
      adaptationHistory: model.adaptationHistory,
      privacyCompliant: true,
    }

    // Apply privacy settings
    if (config.privacySettings.anonymizeData) {
      exportData = this.anonymizeExportData(exportData)
    }

    return exportData
  }

  /**
   * Private helper methods
   */
  private async createDefaultConfig(
    userId: string,
    workspaceId: string
  ): Promise<PersonalizationConfig> {
    return {
      userId,
      workspaceId,
      adaptationRate: 0.5,
      explorationRate: 0.2,
      feedbackSensitivity: 0.7,
      privacySettings: {
        shareWithTeam: false,
        shareAcrossWorkspaces: false,
        collectDetailedAnalytics: true,
        retentionPeriod: 365, // 1 year
        anonymizeData: false,
      },
      customRules: [],
    }
  }

  private async getLearningModel(userId: string, workspaceId: string): Promise<LearningModel> {
    const modelKey = `${userId}-${workspaceId}`
    let model = this.learningModels.get(modelKey)

    if (!model) {
      model = {
        userId,
        workspaceId,
        preferences: new Map(),
        patterns: new Map(),
        adaptationHistory: [],
        lastUpdated: new Date(),
      }
      this.learningModels.set(modelKey, model)
    }

    return model
  }

  private applyPersonalizationRule(
    recommendations: ToolRecommendation[],
    rule: PersonalizationRule,
    profile: UserBehaviorProfile
  ): ToolRecommendation[] {
    switch (rule.action.type) {
      case 'boost':
        return this.boostRecommendations(recommendations, rule)
      case 'suppress':
        return this.suppressRecommendations(recommendations, rule)
      case 'reorder':
        return this.reorderRecommendations(recommendations, rule)
      case 'customize':
        return this.customizeRecommendations(recommendations, rule, profile)
      default:
        return recommendations
    }
  }

  private applyLearnedPreferences(
    recommendations: ToolRecommendation[],
    model: LearningModel,
    config: PersonalizationConfig
  ): ToolRecommendation[] {
    return recommendations.map(rec => {
      const preference = model.preferences.get(rec.toolId) || 0.5
      const learningAdjustment = (preference - 0.5) * config.adaptationRate

      return {
        ...rec,
        score: Math.max(0, Math.min(1, rec.score + learningAdjustment)),
        userFit: preference,
      }
    })
  }

  private applyPrivacySettings(
    recommendations: ToolRecommendation[],
    privacy: PrivacySettings
  ): ToolRecommendation[] {
    if (!privacy.collectDetailedAnalytics) {
      // Remove detailed reasoning if privacy mode is strict
      return recommendations.map(rec => ({
        ...rec,
        reasons: rec.reasons.slice(0, 2), // Keep only top 2 reasons
      }))
    }

    return recommendations
  }

  private async updateLearnedPatterns(
    model: LearningModel,
    event: LearningEvent,
    config: PersonalizationConfig
  ): Promise<void> {
    const patternKey = `${event.eventType}_${event.toolId || 'general'}`
    let pattern = model.patterns.get(patternKey) || { frequency: 0, lastSeen: null }

    pattern.frequency += 1
    pattern.lastSeen = event.timestamp

    // Update pattern based on outcome
    if (event.outcome === 'positive') {
      pattern.positiveCount = (pattern.positiveCount || 0) + 1
    } else if (event.outcome === 'negative') {
      pattern.negativeCount = (pattern.negativeCount || 0) + 1
    }

    model.patterns.set(patternKey, pattern)
  }

  private cleanupAdaptationHistory(model: LearningModel): void {
    // Keep only last 50 adaptations
    if (model.adaptationHistory.length > 50) {
      model.adaptationHistory.splice(0, model.adaptationHistory.length - 50)
    }
  }

  private async learnFromFeedbackPatterns(
    model: LearningModel,
    feedback: SuggestionFeedback,
    toolId: string
  ): Promise<void> {
    // Learn from feedback timing patterns
    const hour = new Date().getHours()
    const timePattern = `feedback_time_${hour}`

    let pattern = model.patterns.get(timePattern) || { tools: new Set(), ratings: [] }
    pattern.tools = new Set([...Array.from(pattern.tools), toolId])
    pattern.ratings.push(feedback.rating)

    // Keep only last 20 ratings
    if (pattern.ratings.length > 20) {
      pattern.ratings = pattern.ratings.slice(-20)
    }

    model.patterns.set(timePattern, pattern)
  }

  private identifySkillGaps(profile: UserBehaviorProfile, model: LearningModel): string[] {
    const gaps: string[] = []

    // Identify tools with low familiarity but high team usage
    for (const [toolId, familiarity] of Object.entries(profile.toolFamiliarity)) {
      if (familiarity.score < 0.3 && familiarity.usageCount > 0) {
        gaps.push(`Low proficiency in frequently used tool: ${toolId}`)
      }

      if (familiarity.errorRate > 0.2) {
        gaps.push(`High error rate with tool: ${toolId}`)
      }
    }

    return gaps.slice(0, 5) // Return top 5 skill gaps
  }

  private recommendTraining(profile: UserBehaviorProfile, model: LearningModel): string[] {
    const training: string[] = []

    // Recommend training for tools with consistent errors
    const problemTools = Object.values(profile.successRates)
      .filter(sr => sr.rate < 0.6 && sr.attempts > 3)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3)

    for (const tool of problemTools) {
      training.push(`Advanced training for ${tool.toolId} (${Math.round(tool.rate * 100)}% success rate)`)
    }

    // Recommend exploration of underutilized tools
    const preferences = Array.from(model.preferences.entries())
      .filter(([, score]) => score > 0.7)
      .map(([toolId]) => toolId)

    if (preferences.length < 5) {
      training.push('Explore additional tools to expand your workflow capabilities')
    }

    return training
  }

  private assessToolMastery(profile: UserBehaviorProfile, model: LearningModel): Array<{ toolId: string; level: string }> {
    const mastery: Array<{ toolId: string; level: string }> = []

    for (const [toolId, familiarity] of Object.entries(profile.toolFamiliarity)) {
      let level = 'Beginner'

      if (familiarity.score > 0.8 && familiarity.usageCount > 50) {
        level = 'Expert'
      } else if (familiarity.score > 0.6 && familiarity.usageCount > 20) {
        level = 'Advanced'
      } else if (familiarity.score > 0.4 && familiarity.usageCount > 5) {
        level = 'Intermediate'
      }

      mastery.push({ toolId, level })
    }

    return mastery.sort((a, b) => {
      const levels = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 }
      return levels[b.level] - levels[a.level]
    })
  }

  private generateLearningGoals(
    profile: UserBehaviorProfile,
    model: LearningModel,
    config: PersonalizationConfig
  ): string[] {
    const goals: string[] = []

    // Based on learning style
    switch (profile.preferences.learningStyle) {
      case 'guided':
        goals.push('Complete structured tutorials for your most-used tools')
        goals.push('Follow step-by-step workflows for complex tasks')
        break
      case 'exploratory':
        goals.push('Experiment with advanced features of familiar tools')
        goals.push('Try alternative tools for your common workflows')
        break
      case 'documentation-first':
        goals.push('Read comprehensive documentation for new tools before using')
        goals.push('Create personal reference guides for complex workflows')
        break
    }

    // Based on collaboration style
    if (profile.collaborationStyle.mentorsOthers) {
      goals.push('Share your expertise by creating team training materials')
    }

    if (profile.collaborationStyle.askForHelp === 'rarely') {
      goals.push('Build stronger relationships with team members for collaborative learning')
    }

    return goals.slice(0, 4)
  }

  private anonymizeExportData(data: any): any {
    // Simple anonymization - in production this would be more sophisticated
    return {
      ...data,
      preferences: Object.fromEntries(
        Object.entries(data.preferences).map(([key, value]) => [`tool_${key.length}`, value])
      ),
      adaptationHistory: data.adaptationHistory.map((event: AdaptationEvent) => ({
        ...event,
        context: { type: 'anonymized' },
      })),
    }
  }

  // Personalization rule implementations
  private boostRecommendations(
    recommendations: ToolRecommendation[],
    rule: PersonalizationRule
  ): ToolRecommendation[] {
    const boost = rule.parameters.boost || 0.2
    const targetTool = rule.parameters.toolId

    return recommendations.map(rec => {
      if (!targetTool || rec.toolId === targetTool) {
        return { ...rec, score: Math.min(1, rec.score + boost) }
      }
      return rec
    })
  }

  private suppressRecommendations(
    recommendations: ToolRecommendation[],
    rule: PersonalizationRule
  ): ToolRecommendation[] {
    const suppress = rule.parameters.suppress || 0.3
    const targetTool = rule.parameters.toolId

    return recommendations
      .map(rec => {
        if (!targetTool || rec.toolId === targetTool) {
          return { ...rec, score: Math.max(0, rec.score - suppress) }
        }
        return rec
      })
      .filter(rec => rec.score > 0.1) // Remove heavily suppressed recommendations
  }

  private reorderRecommendations(
    recommendations: ToolRecommendation[],
    rule: PersonalizationRule
  ): ToolRecommendation[] {
    const priorityTools = rule.parameters.priorityTools || []

    return recommendations.sort((a, b) => {
      const aPriority = priorityTools.indexOf(a.toolId)
      const bPriority = priorityTools.indexOf(b.toolId)

      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority
      }
      if (aPriority !== -1) return -1
      if (bPriority !== -1) return 1

      return b.score - a.score // Default score ordering
    })
  }

  private customizeRecommendations(
    recommendations: ToolRecommendation[],
    rule: PersonalizationRule,
    profile: UserBehaviorProfile
  ): ToolRecommendation[] {
    // Custom logic based on rule parameters and user profile
    const customizations = rule.parameters.customizations || {}

    return recommendations.map(rec => {
      let customizedRec = { ...rec }

      // Apply custom scoring adjustments
      if (customizations.categoryBoosts) {
        const categoryBoost = customizations.categoryBoosts[rec.category] || 0
        customizedRec.score = Math.min(1, customizedRec.score + categoryBoost)
      }

      // Apply user-specific adjustments
      if (profile.preferences.toolComplexityTolerance === 'beginner') {
        // Prefer simpler tools
        const complexity = Object.keys(rec.tool.params).length
        if (complexity > 5) {
          customizedRec.score *= 0.8
        }
      }

      return customizedRec
    })
  }

  private initializeAdaptationRules(): void {
    this.adaptationRules = [
      {
        id: 'positive_tool_feedback',
        condition: (event, profile) =>
          event.eventType === 'tool_selected' && event.outcome === 'positive',
        adaptation: (profile, event) => {
          if (event.toolId && profile.toolFamiliarity[event.toolId]) {
            profile.toolFamiliarity[event.toolId].score = Math.min(
              1,
              profile.toolFamiliarity[event.toolId].score + 0.05
            )
          }
        },
        weight: 1.0,
        enabled: true,
      },
      {
        id: 'error_pattern_learning',
        condition: (event, profile) =>
          event.eventType === 'error_encountered' && event.outcome === 'negative',
        adaptation: (profile, event) => {
          if (event.toolId && profile.toolFamiliarity[event.toolId]) {
            profile.toolFamiliarity[event.toolId].errorRate = Math.min(
              1,
              profile.toolFamiliarity[event.toolId].errorRate + 0.1
            )
          }
        },
        weight: 0.8,
        enabled: true,
      },
      {
        id: 'help_request_adaptation',
        condition: (event, profile) =>
          event.eventType === 'help_requested',
        adaptation: (profile, event) => {
          // Adjust complexity tolerance based on help-seeking behavior
          if (profile.preferences.toolComplexityTolerance === 'advanced' &&
              profile.collaborationStyle.askForHelp === 'often') {
            profile.preferences.toolComplexityTolerance = 'intermediate'
          }
        },
        weight: 0.6,
        enabled: true,
      },
    ]

    logger.info(`Initialized ${this.adaptationRules.length} adaptation rules`)
  }

  /**
   * Get personalization insights for a user
   */
  async getPersonalizationInsights(userId: string, workspaceId: string): Promise<{
    adaptationLevel: number
    recentAdaptations: AdaptationEvent[]
    preferenceStrength: number
    learningVelocity: number
    recommendations: string[]
  }> {
    const config = await this.getPersonalizationConfig(userId, workspaceId)
    const model = await this.getLearningModel(userId, workspaceId)

    const recentAdaptations = model.adaptationHistory.slice(-10)

    // Calculate preference strength (how different from neutral)
    const preferences = Array.from(model.preferences.values())
    const preferenceStrength = preferences.length > 0
      ? preferences.reduce((sum, pref) => sum + Math.abs(pref - 0.5), 0) / preferences.length
      : 0

    // Calculate learning velocity (recent adaptation frequency)
    const recentEvents = model.adaptationHistory.filter(
      event => Date.now() - event.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    )
    const learningVelocity = recentEvents.length / 7 // Events per day

    return {
      adaptationLevel: config.adaptationRate,
      recentAdaptations,
      preferenceStrength,
      learningVelocity,
      recommendations: [
        preferenceStrength < 0.2 ? 'Try providing more feedback to improve recommendations' : '',
        learningVelocity < 0.5 ? 'Explore new tools to accelerate your learning' : '',
        config.explorationRate < 0.1 ? 'Consider increasing exploration to discover new capabilities' : '',
      ].filter(Boolean),
    }
  }
}

export const personalizationEngine = new PersonalizationEngine()