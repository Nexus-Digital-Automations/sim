/**
 * AI Help Engine - Predictive Help and Proactive Assistance Engine
 *
 * Advanced machine learning system for predicting user needs and providing proactive assistance.
 * Analyzes user behavior patterns, workflow context, and historical data to anticipate help needs.
 *
 * Key Features:
 * - Behavioral pattern analysis and prediction models
 * - Workflow context understanding and state tracking
 * - Proactive intervention triggers and assistance delivery
 * - Machine learning models for personalization
 * - Non-intrusive suggestion delivery system
 *
 * Performance Targets:
 * - 75% accuracy in predicting user assistance needs
 * - <100ms latency for real-time predictions
 * - 40% reduction in user struggle time
 *
 * Dependencies: User behavior tracking, workflow monitoring, ML models
 * Usage: Proactive help suggestions, workflow optimization, user experience enhancement
 */

import type { Logger } from '@/lib/monitoring/logger'
import type { SemanticSearchService } from './semantic-search'

export interface PredictiveHelpConfig {
  enableBehaviorAnalysis: boolean
  enableProactiveAssistance: boolean
  enablePersonalization: boolean
  minConfidenceThreshold: number
  maxSuggestionsPerSession: number
  cooldownPeriod: number // milliseconds between suggestions
  learningEnabled: boolean
  dataRetentionDays: number
}

export interface UserBehaviorProfile {
  userId: string
  expertiseLevel: 'beginner' | 'intermediate' | 'expert'
  preferredLearningStyle: 'visual' | 'textual' | 'interactive' | 'video'
  commonWorkflows: string[]
  frequentIssues: UserIssuePattern[]
  helpSeeking: HelpSeekingPattern
  sessionMetrics: UserSessionMetrics
  learningProgress: LearningProgressMetrics
  lastUpdated: Date
}

export interface UserIssuePattern {
  issueType: string
  frequency: number
  averageResolutionTime: number
  commonSolutions: string[]
  lastOccurrence: Date
}

export interface HelpSeekingPattern {
  averageTimeBeforeAskingForHelp: number
  preferredHelpChannels: string[]
  responseToProactiveHelp: number // acceptance rate 0-1
  dismissalPatterns: DismissalPattern[]
}

export interface DismissalPattern {
  suggestionType: string
  dismissalRate: number
  reasonCodes: string[]
  timeOfDay: number
  workflowContext: string
}

export interface UserSessionMetrics {
  averageSessionDuration: number
  stepsPerSession: number
  errorRate: number
  completionRate: number
  timeSpentOnSteps: Map<string, number>
  abandonmentPoints: string[]
}

export interface LearningProgressMetrics {
  conceptsMastered: string[]
  skillsInProgress: string[]
  strugglingAreas: string[]
  improvementRate: number
  lastAssessment: Date
}

export interface WorkflowContext {
  workflowId: string
  type: string
  currentStep: string
  stepIndex: number
  totalSteps: number
  timeSpentInCurrentStep: number
  timeSpentTotal: number
  completedSteps: string[]
  errors: WorkflowError[]
  warnings: WorkflowWarning[]
  blockTypes: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  isFirstTime: boolean
}

export interface WorkflowError {
  code: string
  message: string
  step: string
  timestamp: Date
  resolved: boolean
  resolutionMethod?: string
}

export interface WorkflowWarning {
  type: string
  message: string
  step: string
  severity: 'low' | 'medium' | 'high'
  timestamp: Date
}

export interface PredictionTrigger {
  type: string
  confidence: number
  urgency: 'low' | 'medium' | 'high'
  context: Record<string, any>
  suggestedIntervention: InterventionSuggestion
}

export interface InterventionSuggestion {
  type: 'tooltip' | 'modal' | 'sidebar' | 'inline' | 'notification'
  timing: 'immediate' | 'next_action' | 'step_completion' | 'session_end'
  content: InterventionContent
  actions: InterventionAction[]
  dismissible: boolean
  priority: number
}

export interface InterventionContent {
  title: string
  message: string
  explanation?: string
  mediaType?: 'text' | 'video' | 'interactive' | 'image'
  mediaUrl?: string
  estimatedTime?: number
}

export interface InterventionAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'dismiss'
  action: string
  parameters?: Record<string, any>
}

export interface PredictionResult {
  userId: string
  sessionId: string
  timestamp: Date
  triggers: PredictionTrigger[]
  interventions: InterventionSuggestion[]
  modelVersion: string
  confidence: number
}

/**
 * Advanced predictive help engine with machine learning capabilities
 */
export class PredictiveHelpEngine {
  private userProfiles: Map<string, UserBehaviorProfile> = new Map()
  private sessionData: Map<string, WorkflowContext> = new Map()
  private predictionModels: Map<string, PredictionModel> = new Map()
  private interventionHistory: Map<string, InterventionHistory[]> = new Map()
  private logger: Logger

  constructor(
    private config: PredictiveHelpConfig,
    private semanticSearch: SemanticSearchService,
    logger: Logger
  ) {
    this.logger = logger.child({ service: 'PredictiveHelpEngine' })

    this.initializePredictionModels()
    this.setupDataCleanup()

    this.logger.info('PredictiveHelpEngine initialized', {
      behaviorAnalysis: config.enableBehaviorAnalysis,
      proactiveAssistance: config.enableProactiveAssistance,
      personalization: config.enablePersonalization,
      confidenceThreshold: config.minConfidenceThreshold,
    })
  }

  /**
   * Analyze current workflow context and predict help needs
   * @param userId - User identifier
   * @param sessionId - Session identifier
   * @param context - Current workflow context
   * @returns Promise<PredictionResult> - Prediction results with interventions
   */
  async predictHelpNeeds(
    userId: string,
    sessionId: string,
    context: WorkflowContext
  ): Promise<PredictionResult> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Predicting help needs`, {
      userId,
      sessionId,
      workflowType: context.type,
      currentStep: context.currentStep,
      errorCount: context.errors.length,
    })

    try {
      // Update user profile and session data
      await this.updateUserProfile(userId, context)
      this.updateSessionContext(sessionId, context)

      // Get user behavior profile
      const userProfile = this.getUserProfile(userId)

      // Run prediction models
      const triggers = await this.runPredictionModels(userId, context, userProfile)

      // Filter triggers by confidence threshold
      const qualifiedTriggers = triggers.filter(
        (trigger) => trigger.confidence >= this.config.minConfidenceThreshold
      )

      // Generate intervention suggestions
      const interventions = await this.generateInterventions(
        qualifiedTriggers,
        userProfile,
        context
      )

      // Apply personalization and filtering
      const personalizedInterventions = this.personalizeInterventions(
        interventions,
        userProfile,
        context
      )

      // Record prediction for learning
      if (this.config.learningEnabled) {
        this.recordPrediction(userId, sessionId, triggers, personalizedInterventions)
      }

      const processingTime = Date.now() - startTime
      const result: PredictionResult = {
        userId,
        sessionId,
        timestamp: new Date(),
        triggers: qualifiedTriggers,
        interventions: personalizedInterventions,
        modelVersion: '1.0.0',
        confidence: this.calculateOverallConfidence(qualifiedTriggers),
      }

      this.logger.info(`[${operationId}] Help needs predicted`, {
        triggersFound: qualifiedTriggers.length,
        interventionsGenerated: personalizedInterventions.length,
        overallConfidence: result.confidence,
        processingTimeMs: processingTime,
      })

      return result
    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.error(`[${operationId}] Help prediction failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        sessionId,
        processingTimeMs: processingTime,
      })
      throw error
    }
  }

  /**
   * Record user feedback on intervention effectiveness
   * @param userId - User identifier
   * @param interventionId - Intervention identifier
   * @param feedback - User feedback data
   */
  async recordInterventionFeedback(
    userId: string,
    interventionId: string,
    feedback: InterventionFeedback
  ): Promise<void> {
    const operationId = this.generateOperationId()

    this.logger.info(`[${operationId}] Recording intervention feedback`, {
      userId,
      interventionId,
      action: feedback.action,
      helpful: feedback.helpful,
    })

    try {
      // Update user profile with feedback
      const userProfile = this.getUserProfile(userId)
      this.updateUserProfileWithFeedback(userProfile, interventionId, feedback)

      // Update intervention history
      this.updateInterventionHistory(userId, interventionId, feedback)

      // Learn from feedback if learning is enabled
      if (this.config.learningEnabled) {
        await this.learnFromFeedback(userId, interventionId, feedback)
      }
    } catch (error) {
      this.logger.error(`[${operationId}] Feedback recording failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        interventionId,
      })
      throw error
    }
  }

  /**
   * Get user behavior analytics and insights
   * @param userId - User identifier
   * @returns UserBehaviorProfile | null - User behavior profile or null
   */
  getUserBehaviorAnalytics(userId: string): UserBehaviorProfile | null {
    return this.userProfiles.get(userId) || null
  }

  /**
   * Get system-wide predictive help metrics
   */
  getMetrics() {
    const totalUsers = this.userProfiles.size
    const activeSessions = this.sessionData.size
    const modelsLoaded = this.predictionModels.size

    const userMetrics = Array.from(this.userProfiles.values())
    const avgCompletionRate =
      userMetrics.reduce((sum, profile) => sum + profile.sessionMetrics.completionRate, 0) /
      (totalUsers || 1)

    const avgErrorRate =
      userMetrics.reduce((sum, profile) => sum + profile.sessionMetrics.errorRate, 0) /
      (totalUsers || 1)

    return {
      totalUsers,
      activeSessions,
      modelsLoaded,
      averageCompletionRate: avgCompletionRate,
      averageErrorRate: avgErrorRate,
      config: this.config,
    }
  }

  // Private Methods

  private async updateUserProfile(userId: string, context: WorkflowContext): Promise<void> {
    let profile = this.userProfiles.get(userId)

    if (!profile) {
      profile = this.createNewUserProfile(userId)
    }

    // Update workflow patterns
    if (!profile.commonWorkflows.includes(context.type)) {
      profile.commonWorkflows.push(context.type)
    }

    // Update session metrics
    this.updateSessionMetrics(profile, context)

    // Update issue patterns
    this.updateIssuePatterns(profile, context)

    // Update learning progress
    this.updateLearningProgress(profile, context)

    profile.lastUpdated = new Date()
    this.userProfiles.set(userId, profile)
  }

  private createNewUserProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      expertiseLevel: 'beginner', // Will be inferred from behavior
      preferredLearningStyle: 'textual', // Will be learned
      commonWorkflows: [],
      frequentIssues: [],
      helpSeeking: {
        averageTimeBeforeAskingForHelp: 300000, // 5 minutes default
        preferredHelpChannels: ['tooltip', 'inline'],
        responseToProactiveHelp: 0.5, // Neutral start
        dismissalPatterns: [],
      },
      sessionMetrics: {
        averageSessionDuration: 0,
        stepsPerSession: 0,
        errorRate: 0,
        completionRate: 0,
        timeSpentOnSteps: new Map(),
        abandonmentPoints: [],
      },
      learningProgress: {
        conceptsMastered: [],
        skillsInProgress: [],
        strugglingAreas: [],
        improvementRate: 0,
        lastAssessment: new Date(),
      },
      lastUpdated: new Date(),
    }
  }

  private updateSessionContext(sessionId: string, context: WorkflowContext): void {
    this.sessionData.set(sessionId, { ...context })
  }

  private getUserProfile(userId: string): UserBehaviorProfile {
    return this.userProfiles.get(userId) || this.createNewUserProfile(userId)
  }

  private async runPredictionModels(
    userId: string,
    context: WorkflowContext,
    userProfile: UserBehaviorProfile
  ): Promise<PredictionTrigger[]> {
    const triggers: PredictionTrigger[] = []

    // Time-based prediction model
    const timeBasedTrigger = this.runTimeBasedModel(context, userProfile)
    if (timeBasedTrigger) triggers.push(timeBasedTrigger)

    // Error pattern prediction model
    const errorPatternTrigger = this.runErrorPatternModel(context, userProfile)
    if (errorPatternTrigger) triggers.push(errorPatternTrigger)

    // Abandonment prediction model
    const abandonmentTrigger = this.runAbandonmentModel(context, userProfile)
    if (abandonmentTrigger) triggers.push(abandonmentTrigger)

    // Complexity mismatch model
    const complexityTrigger = this.runComplexityModel(context, userProfile)
    if (complexityTrigger) triggers.push(complexityTrigger)

    // Workflow progression model
    const progressionTrigger = this.runProgressionModel(context, userProfile)
    if (progressionTrigger) triggers.push(progressionTrigger)

    return triggers
  }

  private runTimeBasedModel(
    context: WorkflowContext,
    userProfile: UserBehaviorProfile
  ): PredictionTrigger | null {
    const expectedTime =
      userProfile.sessionMetrics.timeSpentOnSteps.get(context.currentStep) || 120000 // 2 minutes default
    const actualTime = context.timeSpentInCurrentStep

    if (actualTime > expectedTime * 2) {
      // Taking twice as long as expected
      return {
        type: 'excessive_time_on_step',
        confidence: Math.min(0.9, actualTime / (expectedTime * 3)),
        urgency: 'medium',
        context: {
          expectedTime,
          actualTime,
          step: context.currentStep,
        },
        suggestedIntervention: {
          type: 'tooltip',
          timing: 'immediate',
          content: {
            title: 'Need some help?',
            message: `You've been working on this step for ${Math.round(actualTime / 60000)} minutes. Would you like some guidance?`,
            estimatedTime: 2,
          },
          actions: [
            {
              id: 'show_help',
              label: 'Show Help',
              type: 'primary',
              action: 'display_contextual_help',
            },
            {
              id: 'continue',
              label: 'Continue Working',
              type: 'secondary',
              action: 'dismiss',
            },
          ],
          dismissible: true,
          priority: 2,
        },
      }
    }

    return null
  }

  private runErrorPatternModel(
    context: WorkflowContext,
    userProfile: UserBehaviorProfile
  ): PredictionTrigger | null {
    const recentErrors = context.errors.filter(
      (error) => Date.now() - error.timestamp.getTime() < 300000 // Last 5 minutes
    )

    if (recentErrors.length >= 2) {
      const errorTypes = recentErrors.map((e) => e.code)
      const hasKnownPattern = userProfile.frequentIssues.some((issue) =>
        errorTypes.includes(issue.issueType)
      )

      return {
        type: 'repeated_errors',
        confidence: hasKnownPattern ? 0.85 : 0.7,
        urgency: 'high',
        context: {
          errorCount: recentErrors.length,
          errorTypes,
          hasKnownPattern,
        },
        suggestedIntervention: {
          type: 'modal',
          timing: 'immediate',
          content: {
            title: 'Troubleshooting Assistant',
            message: "I noticed you're encountering some errors. Let me help you resolve them.",
            estimatedTime: 5,
          },
          actions: [
            {
              id: 'start_troubleshoot',
              label: 'Help Me Fix This',
              type: 'primary',
              action: 'start_guided_troubleshooting',
            },
            {
              id: 'view_docs',
              label: 'View Documentation',
              type: 'secondary',
              action: 'show_error_documentation',
            },
          ],
          dismissible: true,
          priority: 1,
        },
      }
    }

    return null
  }

  private runAbandonmentModel(
    context: WorkflowContext,
    userProfile: UserBehaviorProfile
  ): PredictionTrigger | null {
    const isAtKnownAbandonmentPoint = userProfile.sessionMetrics.abandonmentPoints.includes(
      context.currentStep
    )

    const progressRatio = context.stepIndex / context.totalSteps
    const timeRatio =
      context.timeSpentTotal / (userProfile.sessionMetrics.averageSessionDuration || 1)

    if (isAtKnownAbandonmentPoint && progressRatio < 0.7 && timeRatio > 1.5) {
      return {
        type: 'abandonment_risk',
        confidence: 0.75,
        urgency: 'medium',
        context: {
          abandonmentPoint: context.currentStep,
          progressRatio,
          timeRatio,
        },
        suggestedIntervention: {
          type: 'sidebar',
          timing: 'next_action',
          content: {
            title: 'Keep Going!',
            message: `You're ${Math.round(progressRatio * 100)}% through this workflow. Need a quick boost to finish?`,
            estimatedTime: 3,
          },
          actions: [
            {
              id: 'quick_tutorial',
              label: 'Quick Tutorial',
              type: 'primary',
              action: 'show_step_tutorial',
            },
            {
              id: 'save_progress',
              label: 'Save & Continue Later',
              type: 'secondary',
              action: 'save_and_exit',
            },
          ],
          dismissible: true,
          priority: 3,
        },
      }
    }

    return null
  }

  private runComplexityModel(
    context: WorkflowContext,
    userProfile: UserBehaviorProfile
  ): PredictionTrigger | null {
    const isComplexWorkflow = context.complexity === 'complex'
    const isBeginnerUser = userProfile.expertiseLevel === 'beginner'
    const hasComplexBlocks = context.blockTypes.some((type) =>
      ['transform', 'condition', 'loop'].includes(type)
    )

    if ((isComplexWorkflow || hasComplexBlocks) && isBeginnerUser) {
      return {
        type: 'complexity_mismatch',
        confidence: 0.8,
        urgency: 'medium',
        context: {
          workflowComplexity: context.complexity,
          userExpertise: userProfile.expertiseLevel,
          complexBlocks: context.blockTypes.filter((type) =>
            ['transform', 'condition', 'loop'].includes(type)
          ),
        },
        suggestedIntervention: {
          type: 'inline',
          timing: 'immediate',
          content: {
            title: 'Advanced Features Detected',
            message:
              'This workflow uses some advanced features. Would you like me to explain them as we go?',
            estimatedTime: 1,
          },
          actions: [
            {
              id: 'enable_explanations',
              label: 'Yes, Explain As I Go',
              type: 'primary',
              action: 'enable_detailed_explanations',
            },
            {
              id: 'continue_normal',
              label: "I'm Good, Thanks",
              type: 'secondary',
              action: 'dismiss',
            },
          ],
          dismissible: true,
          priority: 2,
        },
      }
    }

    return null
  }

  private runProgressionModel(
    context: WorkflowContext,
    userProfile: UserBehaviorProfile
  ): PredictionTrigger | null {
    const progressRate = context.stepIndex / (context.timeSpentTotal / 60000) // steps per minute
    const expectedRate =
      userProfile.sessionMetrics.stepsPerSession /
        (userProfile.sessionMetrics.averageSessionDuration / 60000) || 0.5

    if (progressRate < expectedRate * 0.5 && context.stepIndex > 2) {
      return {
        type: 'slow_progression',
        confidence: 0.65,
        urgency: 'low',
        context: {
          currentRate: progressRate,
          expectedRate,
          stepsCompleted: context.stepIndex,
        },
        suggestedIntervention: {
          type: 'notification',
          timing: 'step_completion',
          content: {
            title: 'Workflow Tips',
            message: 'Here are some tips to help you move through workflows more efficiently.',
            estimatedTime: 2,
          },
          actions: [
            {
              id: 'show_tips',
              label: 'Show Tips',
              type: 'primary',
              action: 'display_efficiency_tips',
            },
            {
              id: 'dismiss',
              label: 'Not Now',
              type: 'dismiss',
              action: 'dismiss',
            },
          ],
          dismissible: true,
          priority: 4,
        },
      }
    }

    return null
  }

  private async generateInterventions(
    triggers: PredictionTrigger[],
    userProfile: UserBehaviorProfile,
    context: WorkflowContext
  ): Promise<InterventionSuggestion[]> {
    const interventions: InterventionSuggestion[] = []

    for (const trigger of triggers) {
      // Use the suggested intervention from the trigger
      const intervention = trigger.suggestedIntervention

      // Enhance with related content from semantic search
      const relatedContent = await this.findRelatedContent(trigger, context)
      if (relatedContent.length > 0) {
        intervention.actions.push({
          id: 'related_content',
          label: 'View Related Help',
          type: 'secondary',
          action: 'show_related_content',
          parameters: { content: relatedContent },
        })
      }

      interventions.push(intervention)
    }

    return interventions
  }

  private personalizeInterventions(
    interventions: InterventionSuggestion[],
    userProfile: UserBehaviorProfile,
    context: WorkflowContext
  ): InterventionSuggestion[] {
    return interventions.map((intervention) => {
      // Adjust intervention type based on user preferences
      const preferredTypes = this.getPreferredInterventionTypes(userProfile)
      if (!preferredTypes.includes(intervention.type)) {
        intervention.type = preferredTypes[0] || intervention.type
      }

      // Adjust timing based on user behavior
      if (userProfile.helpSeeking.responseToProactiveHelp < 0.3) {
        // User doesn't like proactive help, make it less intrusive
        if (intervention.timing === 'immediate') {
          intervention.timing = 'next_action'
        }
      }

      // Adjust content based on expertise level
      if (userProfile.expertiseLevel === 'beginner') {
        intervention.content.explanation =
          intervention.content.explanation || 'This will help you understand the next steps better.'
      } else if (userProfile.expertiseLevel === 'expert') {
        // Make content more concise for experts
        intervention.content.message = `${intervention.content.message.split('.')[0]}.`
      }

      return intervention
    })
  }

  private getPreferredInterventionTypes(userProfile: UserBehaviorProfile): string[] {
    // Analyze dismissal patterns to infer preferences
    const dismissalRates = new Map<string, number>()

    userProfile.helpSeeking.dismissalPatterns.forEach((pattern) => {
      dismissalRates.set(pattern.suggestionType, pattern.dismissalRate)
    })

    // Sort by lowest dismissal rate (highest acceptance)
    const sortedTypes = Array.from(dismissalRates.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([type]) => type)

    // Default preferences if no data
    const defaults = ['tooltip', 'inline', 'notification', 'sidebar', 'modal']

    return sortedTypes.length > 0 ? sortedTypes : defaults
  }

  private async findRelatedContent(trigger: PredictionTrigger, context: WorkflowContext) {
    const queries = this.generateQueriesForTrigger(trigger, context)

    const searchResults = await Promise.all(
      queries.map((query) =>
        this.semanticSearch.search(
          query,
          {
            workflowType: context.type,
            blockType: context.blockTypes[0],
          },
          { maxResults: 2 }
        )
      )
    )

    return searchResults.flat().slice(0, 3)
  }

  private generateQueriesForTrigger(
    trigger: PredictionTrigger,
    context: WorkflowContext
  ): string[] {
    const queries: string[] = []

    switch (trigger.type) {
      case 'excessive_time_on_step':
        queries.push(`${context.currentStep} help guide`)
        queries.push(`${context.currentStep} troubleshooting`)
        break

      case 'repeated_errors': {
        const errorTypes = trigger.context.errorTypes || []
        errorTypes.forEach((errorType: string) => {
          queries.push(`fix ${errorType} error`)
        })
        break
      }

      case 'complexity_mismatch': {
        const complexBlocks = trigger.context.complexBlocks || []
        complexBlocks.forEach((blockType: string) => {
          queries.push(`${blockType} beginner guide`)
        })
        break
      }

      default:
        queries.push(`${context.type} help`)
    }

    return queries
  }

  private recordPrediction(
    userId: string,
    sessionId: string,
    triggers: PredictionTrigger[],
    interventions: InterventionSuggestion[]
  ): void {
    // This would record predictions for model training and evaluation
    this.logger.info('Prediction recorded for learning', {
      userId,
      sessionId,
      triggersCount: triggers.length,
      interventionsCount: interventions.length,
    })
  }

  private updateSessionMetrics(profile: UserBehaviorProfile, context: WorkflowContext): void {
    // Update time spent on specific steps
    if (context.timeSpentInCurrentStep > 0) {
      const existingTime = profile.sessionMetrics.timeSpentOnSteps.get(context.currentStep) || 0
      const avgTime = (existingTime + context.timeSpentInCurrentStep) / 2
      profile.sessionMetrics.timeSpentOnSteps.set(context.currentStep, avgTime)
    }

    // Update error rate
    if (context.errors.length > 0) {
      const totalSteps = context.stepIndex || 1
      const errorRate = context.errors.length / totalSteps
      profile.sessionMetrics.errorRate = (profile.sessionMetrics.errorRate + errorRate) / 2
    }
  }

  private updateIssuePatterns(profile: UserBehaviorProfile, context: WorkflowContext): void {
    context.errors.forEach((error) => {
      let pattern = profile.frequentIssues.find((p) => p.issueType === error.code)

      if (!pattern) {
        pattern = {
          issueType: error.code,
          frequency: 0,
          averageResolutionTime: 0,
          commonSolutions: [],
          lastOccurrence: new Date(),
        }
        profile.frequentIssues.push(pattern)
      }

      pattern.frequency++
      pattern.lastOccurrence = error.timestamp
    })
  }

  private updateLearningProgress(profile: UserBehaviorProfile, context: WorkflowContext): void {
    // Track workflow types as skills in progress
    if (!profile.learningProgress.skillsInProgress.includes(context.type)) {
      profile.learningProgress.skillsInProgress.push(context.type)
    }

    // Move to mastered if user completes workflow quickly with few errors
    if (context.stepIndex === context.totalSteps && context.errors.length === 0) {
      if (!profile.learningProgress.conceptsMastered.includes(context.type)) {
        profile.learningProgress.conceptsMastered.push(context.type)
        profile.learningProgress.skillsInProgress =
          profile.learningProgress.skillsInProgress.filter((skill) => skill !== context.type)
      }
    }
  }

  private updateUserProfileWithFeedback(
    profile: UserBehaviorProfile,
    interventionId: string,
    feedback: InterventionFeedback
  ): void {
    // Update response to proactive help based on feedback
    const helpfulWeight = feedback.helpful ? 1 : 0
    profile.helpSeeking.responseToProactiveHelp =
      (profile.helpSeeking.responseToProactiveHelp + helpfulWeight) / 2
  }

  private updateInterventionHistory(
    userId: string,
    interventionId: string,
    feedback: InterventionFeedback
  ): void {
    if (!this.interventionHistory.has(userId)) {
      this.interventionHistory.set(userId, [])
    }

    const history = this.interventionHistory.get(userId)!
    history.push({
      interventionId,
      timestamp: new Date(),
      feedback,
      helpful: feedback.helpful,
    })

    // Keep only recent history
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }

  private async learnFromFeedback(
    userId: string,
    interventionId: string,
    feedback: InterventionFeedback
  ): Promise<void> {
    // This would update ML models based on user feedback
    // For now, just log for future implementation
    this.logger.info('Learning from feedback', {
      userId,
      interventionId,
      feedback: feedback.action,
      helpful: feedback.helpful,
    })
  }

  private calculateOverallConfidence(triggers: PredictionTrigger[]): number {
    if (triggers.length === 0) return 0

    return triggers.reduce((sum, trigger) => sum + trigger.confidence, 0) / triggers.length
  }

  private initializePredictionModels(): void {
    // Initialize ML prediction models
    // This would load trained models in a production system
    this.predictionModels.set('time_based', new TimeBasedModel())
    this.predictionModels.set('error_pattern', new ErrorPatternModel())
    this.predictionModels.set('abandonment', new AbandonmentModel())
    this.predictionModels.set('complexity', new ComplexityModel())
  }

  private setupDataCleanup(): void {
    // Clean up old data periodically
    setInterval(() => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays)

      let cleaned = 0
      for (const [userId, profile] of this.userProfiles.entries()) {
        if (profile.lastUpdated < cutoffDate) {
          this.userProfiles.delete(userId)
          this.interventionHistory.delete(userId)
          cleaned++
        }
      }

      if (cleaned > 0) {
        this.logger.info('Predictive help data cleanup completed', {
          profilesCleaned: cleaned,
          remainingProfiles: this.userProfiles.size,
        })
      }
    }, 86400000) // Daily cleanup
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
}

// Supporting interfaces
interface InterventionFeedback {
  action: 'accepted' | 'dismissed' | 'completed'
  helpful: boolean
  timeToAction: number
  additionalFeedback?: string
}

interface InterventionHistory {
  interventionId: string
  timestamp: Date
  feedback: InterventionFeedback
  helpful: boolean
}

// Placeholder prediction models (would be ML models in production)
class PredictionModel {
  predict(context: any): PredictionTrigger | null {
    return null // Base class implementation
  }
}

class TimeBasedModel extends PredictionModel {}
class ErrorPatternModel extends PredictionModel {}
class AbandonmentModel extends PredictionModel {}
class ComplexityModel extends PredictionModel {}

export default PredictiveHelpEngine
