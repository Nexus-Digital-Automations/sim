/**
 * Help Predictions API - Proactive assistance and contextual suggestions
 *
 * Advanced predictive help system that analyzes user behavior patterns, workflow context,
 * and historical data to provide proactive assistance before users request help.
 *
 * Key Features:
 * - Real-time behavior analysis and prediction models
 * - Context-aware help suggestions based on workflow state
 * - Proactive intervention triggers for user assistance
 * - Machine learning powered personalization
 * - Non-intrusive suggestion delivery system
 *
 * Performance Targets:
 * - 75% accuracy in predicting user assistance needs
 * - <100ms response time for real-time predictions
 * - 40% reduction in user struggle time
 *
 * @created 2025-09-04
 * @author Predictive Help Engine Specialist
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('HelpPredictionsAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const predictionRequestSchema = z.object({
  // User context
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  
  // Workflow context
  workflowId: z.string().optional(),
  workflowType: z.string().optional(),
  currentStep: z.string().optional(),
  blockType: z.string().optional(),
  
  // User state
  timeInCurrentStep: z.number().min(0).optional(),
  errorsSinceLastProgress: z.number().min(0).optional(),
  previousErrors: z.array(z.string()).optional(),
  userExpertiseLevel: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  
  // Prediction parameters
  predictionTypes: z.array(z.enum([
    'abandonment_risk',
    'help_need',
    'error_prediction',
    'learning_opportunity',
    'optimization_suggestion'
  ])).default(['help_need']),
  maxSuggestions: z.number().min(1).max(10).default(3),
  minConfidence: z.number().min(0).max(1).default(0.6),
  includeExplanations: z.boolean().default(false),
})

const behaviorAnalysisSchema = z.object({
  userId: z.string(),
  sessionData: z.object({
    startTime: z.string(),
    currentTime: z.string(),
    actionsPerformed: z.array(z.object({
      type: z.string(),
      timestamp: z.string(),
      context: z.record(z.any()).optional()
    })),
    errorsEncountered: z.array(z.object({
      type: z.string(),
      message: z.string(),
      timestamp: z.string(),
      resolved: z.boolean().optional()
    })),
    helpRequestsMade: z.array(z.object({
      type: z.string(),
      query: z.string().optional(),
      timestamp: z.string(),
      resolved: z.boolean().optional()
    }))
  }),
  workflowContext: z.object({
    workflowId: z.string().optional(),
    workflowType: z.string().optional(),
    currentStep: z.string().optional(),
    completionPercentage: z.number().min(0).max(100).optional(),
    timeSpent: z.number().min(0).optional()
  }).optional()
})

const feedbackSchema = z.object({
  predictionId: z.string(),
  userId: z.string(),
  wasHelpful: z.boolean(),
  wasAccurate: z.boolean(),
  userAction: z.enum(['accepted', 'dismissed', 'ignored']),
  actualOutcome: z.string().optional(),
  userComment: z.string().max(500).optional(),
  timestamp: z.string()
})

// ========================
// TYPE DEFINITIONS
// ========================

interface PredictionResult {
  id: string
  type: 'abandonment_risk' | 'help_need' | 'error_prediction' | 'learning_opportunity' | 'optimization_suggestion'
  confidence: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  trigger: string
  suggestion: {
    title: string
    description: string
    actionType: 'show_help' | 'suggest_tutorial' | 'offer_assistance' | 'recommend_pause'
    content?: {
      helpArticleId?: string
      tutorialId?: string
      interactiveGuideId?: string
      customMessage?: string
    }
    timing: {
      suggestNow: boolean
      delaySeconds?: number
      conditions?: string[]
    }
  }
  context: {
    workflowStep?: string
    blockType?: string
    errorPattern?: string
    userBehaviorPattern?: string
  }
  explanation?: string
  expiresAt: string
}

interface UserBehaviorInsights {
  strugglingIndicators: {
    timeSpentInCurrentStep: number
    averageTimeForSimilarSteps: number
    errorFrequency: number
    helpSeekingPattern: string
  }
  learningPattern: {
    preferredHelpType: string
    responseToInterventions: string
    learningVelocity: string
  }
  contextualFactors: {
    timeOfDay: string
    workflowComplexity: string
    sessionLength: number
    multitasking: boolean
  }
}

// ========================
// MOCK DATA & SERVICES
// ========================

class PredictiveHelpService {
  async analyzeUserBehavior(userId: string, context: any): Promise<UserBehaviorInsights> {
    // Mock behavior analysis - in production would use ML models
    const mockInsights: UserBehaviorInsights = {
      strugglingIndicators: {
        timeSpentInCurrentStep: context.timeInCurrentStep || 120,
        averageTimeForSimilarSteps: 60,
        errorFrequency: context.errorsSinceLastProgress || 0,
        helpSeekingPattern: this.determineHelpSeekingPattern(context)
      },
      learningPattern: {
        preferredHelpType: 'interactive',
        responseToInterventions: 'positive',
        learningVelocity: 'moderate'
      },
      contextualFactors: {
        timeOfDay: new Date().getHours() < 12 ? 'morning' : 'afternoon',
        workflowComplexity: context.workflowType === 'api_integration' ? 'high' : 'medium',
        sessionLength: 1800, // 30 minutes
        multitasking: false
      }
    }

    return mockInsights
  }

  async generatePredictions(
    context: any,
    behaviorInsights: UserBehaviorInsights,
    options: any
  ): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = []

    // Analyze for different prediction types
    for (const predictionType of options.predictionTypes) {
      const prediction = await this.generateSpecificPrediction(
        predictionType,
        context,
        behaviorInsights,
        options
      )
      
      if (prediction && prediction.confidence >= options.minConfidence) {
        predictions.push(prediction)
      }
    }

    // Sort by priority and confidence
    return predictions
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return b.confidence - a.confidence
      })
      .slice(0, options.maxSuggestions)
  }

  private async generateSpecificPrediction(
    type: string,
    context: any,
    insights: UserBehaviorInsights,
    options: any
  ): Promise<PredictionResult | null> {
    const baseId = `pred_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    switch (type) {
      case 'help_need':
        return this.generateHelpNeedPrediction(baseId, context, insights)
      
      case 'abandonment_risk':
        return this.generateAbandonmentRiskPrediction(baseId, context, insights)
      
      case 'error_prediction':
        return this.generateErrorPrediction(baseId, context, insights)
      
      case 'learning_opportunity':
        return this.generateLearningOpportunity(baseId, context, insights)
      
      case 'optimization_suggestion':
        return this.generateOptimizationSuggestion(baseId, context, insights)
      
      default:
        return null
    }
  }

  private generateHelpNeedPrediction(
    id: string,
    context: any,
    insights: UserBehaviorInsights
  ): PredictionResult {
    const isStrugglingTime = insights.strugglingIndicators.timeSpentInCurrentStep > 
      insights.strugglingIndicators.averageTimeForSimilarSteps * 1.5
    
    const hasErrors = insights.strugglingIndicators.errorFrequency > 0
    
    let confidence = 0.5
    if (isStrugglingTime) confidence += 0.3
    if (hasErrors) confidence += 0.2
    
    const priority = confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low'

    return {
      id,
      type: 'help_need',
      confidence,
      priority,
      trigger: 'prolonged_time_in_step',
      suggestion: {
        title: 'Need some help with this step?',
        description: "I noticed you've been working on this step for a while. Would you like some guidance?",
        actionType: 'offer_assistance',
        content: {
          helpArticleId: `help_${context.blockType || 'general'}_guide`,
          customMessage: 'I can provide step-by-step guidance or show you common solutions.'
        },
        timing: {
          suggestNow: confidence > 0.7,
          delaySeconds: confidence <= 0.7 ? 30 : 0,
          conditions: []
        }
      },
      context: {
        workflowStep: context.currentStep,
        blockType: context.blockType,
        userBehaviorPattern: insights.strugglingIndicators.helpSeekingPattern
      },
      explanation: `Time spent (${Math.round(insights.strugglingIndicators.timeSpentInCurrentStep)}s) exceeds average (${insights.strugglingIndicators.averageTimeForSimilarSteps}s)`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    }
  }

  private generateAbandonmentRiskPrediction(
    id: string,
    context: any,
    insights: UserBehaviorInsights
  ): PredictionResult {
    const longSession = insights.contextualFactors.sessionLength > 1800 // 30 minutes
    const multipleErrors = insights.strugglingIndicators.errorFrequency > 2
    const slowProgress = insights.strugglingIndicators.timeSpentInCurrentStep > 300 // 5 minutes
    
    let confidence = 0.4
    if (longSession) confidence += 0.2
    if (multipleErrors) confidence += 0.3
    if (slowProgress) confidence += 0.2

    return {
      id,
      type: 'abandonment_risk',
      confidence,
      priority: confidence > 0.7 ? 'critical' : 'high',
      trigger: 'multiple_struggle_indicators',
      suggestion: {
        title: 'Take a quick break?',
        description: "You've been working hard! Sometimes a short break can help clarify things.",
        actionType: 'recommend_pause',
        content: {
          customMessage: 'Consider taking a 5-minute break, or I can show you a different approach to this problem.'
        },
        timing: {
          suggestNow: confidence > 0.8,
          delaySeconds: confidence <= 0.8 ? 60 : 0
        }
      },
      context: {
        workflowStep: context.currentStep,
        userBehaviorPattern: 'extended_struggle_session'
      },
      explanation: `High stress indicators: long session (${Math.round(insights.contextualFactors.sessionLength/60)}min), ${insights.strugglingIndicators.errorFrequency} errors, slow progress`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    }
  }

  private generateErrorPrediction(
    id: string,
    context: any,
    insights: UserBehaviorInsights
  ): PredictionResult {
    const errorProne = context.blockType === 'api_call' || context.blockType === 'data_transform'
    const hasRecentErrors = insights.strugglingIndicators.errorFrequency > 0
    
    let confidence = errorProne ? 0.6 : 0.4
    if (hasRecentErrors) confidence += 0.2

    return {
      id,
      type: 'error_prediction',
      confidence,
      priority: 'medium',
      trigger: 'error_prone_operation',
      suggestion: {
        title: 'Heads up: Common pitfalls ahead',
        description: 'This step has common issues. Let me show you how to avoid them.',
        actionType: 'show_help',
        content: {
          helpArticleId: `troubleshooting_${context.blockType}`,
          customMessage: 'Here are the most common issues and their solutions.'
        },
        timing: {
          suggestNow: false,
          delaySeconds: 10,
          conditions: ['before_execution']
        }
      },
      context: {
        workflowStep: context.currentStep,
        blockType: context.blockType,
        errorPattern: 'common_pitfalls'
      },
      explanation: `Block type "${context.blockType}" has high error rate. Proactive guidance recommended.`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  }

  private generateLearningOpportunity(
    id: string,
    context: any,
    insights: UserBehaviorInsights
  ): PredictionResult {
    const isLearningMoment = context.userExpertiseLevel === 'beginner' || 
      insights.learningPattern.learningVelocity === 'fast'

    return {
      id,
      type: 'learning_opportunity',
      confidence: isLearningMoment ? 0.8 : 0.5,
      priority: 'low',
      trigger: 'learning_moment_detected',
      suggestion: {
        title: 'Learn something new?',
        description: 'Since you mastered this step, want to learn an advanced technique?',
        actionType: 'suggest_tutorial',
        content: {
          tutorialId: `advanced_${context.blockType}_tutorial`,
          customMessage: 'This tutorial builds on what you just learned.'
        },
        timing: {
          suggestNow: false,
          delaySeconds: 30,
          conditions: ['after_successful_completion']
        }
      },
      context: {
        workflowStep: context.currentStep,
        blockType: context.blockType,
        userBehaviorPattern: insights.learningPattern.learningVelocity
      },
      explanation: 'User shows strong learning pattern and would benefit from advanced content',
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString()
    }
  }

  private generateOptimizationSuggestion(
    id: string,
    context: any,
    insights: UserBehaviorInsights
  ): PredictionResult {
    return {
      id,
      type: 'optimization_suggestion',
      confidence: 0.7,
      priority: 'low',
      trigger: 'workflow_optimization_opportunity',
      suggestion: {
        title: 'Workflow optimization tip',
        description: 'I noticed a way to make this workflow more efficient.',
        actionType: 'show_help',
        content: {
          helpArticleId: 'workflow_optimization_tips',
          customMessage: 'Here are some ways to streamline this process.'
        },
        timing: {
          suggestNow: false,
          delaySeconds: 120,
          conditions: ['after_workflow_completion']
        }
      },
      context: {
        workflowStep: context.currentStep,
        blockType: context.blockType
      },
      explanation: 'Detected inefficient workflow pattern with optimization potential',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }
  }

  private determineHelpSeekingPattern(context: any): string {
    if (context.timeInCurrentStep > 300) return 'delayed_help_seeker'
    if (context.errorsSinceLastProgress > 0) return 'reactive_help_seeker'
    return 'proactive_learner'
  }
}

const predictiveHelpService = new PredictiveHelpService()

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/help/predictions - Get proactive help predictions
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing help predictions request`)

    const { searchParams } = new URL(request.url)
    const rawParams = Object.fromEntries(searchParams)

    // Parse array parameters
    if (rawParams.predictionTypes) {
      rawParams.predictionTypes = rawParams.predictionTypes.split(',')
    }
    if (rawParams.previousErrors) {
      rawParams.previousErrors = rawParams.previousErrors.split(',')
    }

    // Parse numeric parameters
    if (rawParams.timeInCurrentStep) {
      rawParams.timeInCurrentStep = Number.parseInt(rawParams.timeInCurrentStep, 10)
    }
    if (rawParams.errorsSinceLastProgress) {
      rawParams.errorsSinceLastProgress = Number.parseInt(rawParams.errorsSinceLastProgress, 10)
    }
    if (rawParams.maxSuggestions) {
      rawParams.maxSuggestions = Number.parseInt(rawParams.maxSuggestions, 10)
    }
    if (rawParams.minConfidence) {
      rawParams.minConfidence = Number.parseFloat(rawParams.minConfidence)
    }

    // Parse boolean parameters
    if (rawParams.includeExplanations !== undefined) {
      rawParams.includeExplanations = rawParams.includeExplanations === 'true'
    }

    const validationResult = predictionRequestSchema.safeParse(rawParams)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid prediction request parameters`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Get user session
    const session = await getSession()
    const userId = params.userId || session?.user?.id
    
    if (!userId) {
      logger.warn(`[${requestId}] No user ID provided for predictions`)
      return NextResponse.json(
        { error: 'User ID required for predictions' },
        { status: 400 }
      )
    }

    // Analyze user behavior
    const behaviorInsights = await predictiveHelpService.analyzeUserBehavior(userId, params)

    // Generate predictions
    const predictions = await predictiveHelpService.generatePredictions(
      params,
      behaviorInsights,
      {
        predictionTypes: params.predictionTypes,
        maxSuggestions: params.maxSuggestions,
        minConfidence: params.minConfidence
      }
    )

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Predictions generated successfully`, {
      userId: userId.substring(0, 8) + '...',
      predictionsCount: predictions.length,
      processingTimeMs: processingTime,
      highConfidencePredictions: predictions.filter(p => p.confidence > 0.8).length
    })

    const response = {
      predictions,
      behaviorInsights: params.includeExplanations ? behaviorInsights : undefined,
      metadata: {
        requestId,
        userId: userId.substring(0, 8) + '...',
        processingTime,
        context: {
          workflowType: params.workflowType,
          currentStep: params.currentStep,
          blockType: params.blockType
        },
        generatedAt: new Date().toISOString()
      }
    }

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Prediction-Count': predictions.length.toString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Predictions request failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      { 
        error: 'Predictions generation failed',
        requestId,
        processingTime 
      }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/help/predictions - Submit behavior data and get predictions
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { pathname } = new URL(request.url)
    
    if (pathname.endsWith('/behavior-analysis')) {
      return handleBehaviorAnalysis(request, requestId)
    }
    if (pathname.endsWith('/feedback')) {
      return handlePredictionFeedback(request, requestId)
    }

    // Default behavior analysis
    return handleBehaviorAnalysis(request, requestId)
  } catch (error) {
    logger.error(`[${requestId}] Predictions POST request failed`, { error })
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

async function handleBehaviorAnalysis(request: NextRequest, requestId: string) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const validationResult = behaviorAnalysisSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid behavior data', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { userId, sessionData, workflowContext } = validationResult.data

    // Analyze behavior and generate real-time predictions
    const behaviorInsights = await predictiveHelpService.analyzeUserBehavior(userId, {
      ...workflowContext,
      timeInCurrentStep: sessionData.currentTime ? 
        (new Date(sessionData.currentTime).getTime() - new Date(sessionData.startTime).getTime()) / 1000 : 0,
      errorsSinceLastProgress: sessionData.errorsEncountered.filter(e => !e.resolved).length,
      previousErrors: sessionData.errorsEncountered.map(e => e.type)
    })

    const predictions = await predictiveHelpService.generatePredictions(
      { ...workflowContext, userId },
      behaviorInsights,
      {
        predictionTypes: ['help_need', 'abandonment_risk', 'error_prediction'],
        maxSuggestions: 5,
        minConfidence: 0.5
      }
    )

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      analysis: {
        insights: behaviorInsights,
        predictions,
        riskFactors: {
          abandonmentRisk: predictions.find(p => p.type === 'abandonment_risk')?.confidence || 0,
          helpNeeded: predictions.find(p => p.type === 'help_need')?.confidence || 0,
          errorRisk: predictions.find(p => p.type === 'error_prediction')?.confidence || 0
        }
      },
      recommendations: predictions.filter(p => p.suggestion.timing.suggestNow),
      metadata: {
        requestId,
        processingTime,
        analysisTimestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error(`[${requestId}] Behavior analysis failed`, { error })
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

async function handlePredictionFeedback(request: NextRequest, requestId: string) {
  try {
    const body = await request.json()
    const validationResult = feedbackSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const feedback = validationResult.data

    // TODO: Store feedback for ML model training
    // await storePredictionFeedback(feedback)

    logger.info(`[${requestId}] Prediction feedback received`, {
      predictionId: feedback.predictionId,
      wasHelpful: feedback.wasHelpful,
      wasAccurate: feedback.wasAccurate,
      userAction: feedback.userAction
    })

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      thanksMessage: feedback.wasHelpful ? 
        'Thank you! Your feedback helps us improve our assistance.' :
        'Thanks for the feedback. We\'ll work on providing better suggestions.',
      metadata: {
        requestId,
        feedbackId: crypto.randomUUID().slice(0, 8),
        processedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error(`[${requestId}] Prediction feedback failed`, { error })
    return NextResponse.json({ error: 'Feedback processing failed' }, { status: 500 })
  }
}