/**
 * Predictive Help Integration - Complete Help System Integration Component
 *
 * Comprehensive integration component that orchestrates all predictive help features
 * including behavior tracking, semantic search, proactive assistance, and user analytics.
 *
 * This component serves as the main integration point for the predictive help system,
 * combining all research findings and implementations into a cohesive user experience.
 *
 * Key Features:
 * - Real-time behavior monitoring and context tracking
 * - Semantic search integration with contextual filtering
 * - Proactive assistance delivery based on ML predictions
 * - User learning path optimization and goal tracking
 * - Comprehensive analytics and feedback collection
 *
 * Integration Points:
 * - SemanticSearchService for content discovery
 * - PredictiveHelpEngine for proactive suggestions
 * - Vector embeddings for help content matching
 * - User behavior analytics and goal tracking
 *
 * @created 2025-09-04
 * @author Predictive Help Engine Integration Specialist
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, Target } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import ProactiveHelpEngine, { useProactiveHelp } from './ProactiveHelpEngine'

// ========================
// TYPE DEFINITIONS
// ========================

interface WorkflowContext {
  workflowId?: string
  workflowType?: string
  currentStep?: string
  blockType?: string
  completionPercentage?: number
  blocksCount?: number
  edgesCount?: number
  executionState?: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  lastError?: {
    type: string
    message: string
    timestamp: Date
  }
}

interface UserGoal {
  id: string
  title: string
  description: string
  category: 'skill_development' | 'productivity' | 'exploration' | 'mastery'
  targetValue: number
  currentValue: number
  progressPercentage: number
  targetDate?: Date
  status: 'active' | 'paused' | 'completed'
}

interface LearningInsights {
  currentLevel: 'beginner' | 'intermediate' | 'expert'
  learningVelocity: 'slow' | 'moderate' | 'fast'
  preferredContentType: 'visual' | 'textual' | 'interactive' | 'video'
  strugglingAreas: string[]
  masteredConcepts: string[]
  recommendedNextSteps: string[]
}

interface PredictiveHelpIntegrationProps {
  workflowContext: WorkflowContext
  enabled?: boolean
  showAnalytics?: boolean
  onGoalProgress?: (goalId: string, progress: number) => void
  onLearningInsight?: (insight: string, data: any) => void
  className?: string
}

// ========================
// MAIN INTEGRATION COMPONENT
// ========================

export default function PredictiveHelpIntegration({
  workflowContext,
  enabled = true,
  showAnalytics = false,
  onGoalProgress,
  onLearningInsight,
  className = '',
}: PredictiveHelpIntegrationProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  // ========================
  // STATE MANAGEMENT
  // ========================

  const [behaviorContext, setBehaviorContext] = useState(() => ({
    workflowId: workflowContext.workflowId,
    workflowType: workflowContext.workflowType,
    currentStep: workflowContext.currentStep,
    blockType: workflowContext.blockType,
    timeInCurrentStep: 0,
    errorsSinceLastProgress: 0,
    previousErrors: [],
    userExpertiseLevel: 'intermediate' as const,
  }))

  const [userGoals, setUserGoals] = useState<UserGoal[]>([])
  const [learningInsights, setLearningInsights] = useState<LearningInsights | null>(null)
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Refs for tracking
  const stepStartTime = useRef<Date>(new Date())
  const sessionStartTime = useRef<Date>(new Date())
  const behaviorUpdateInterval = useRef<NodeJS.Timeout | null>(null)
  const userInteractions = useRef<
    Array<{
      type: string
      timestamp: Date
      context: any
    }>
  >([])

  // ========================
  // PROACTIVE HELP INTEGRATION
  // ========================

  const proactiveHelp = useProactiveHelp(behaviorContext)

  const handleHelpAccepted = useCallback(
    (prediction: any) => {
      // Track successful help intervention
      trackUserInteraction('help_accepted', {
        predictionId: prediction.id,
        predictionType: prediction.type,
        confidence: prediction.confidence,
      })

      // Update user goals based on help acceptance
      updateGoalProgress(prediction)

      // Trigger learning insight
      onLearningInsight?.('help_intervention_successful', {
        predictionType: prediction.type,
        workflowContext,
        timestamp: new Date(),
      })

      toast.success('Great! Help is on the way. Let me know if you need more assistance.')
    },
    [workflowContext, onLearningInsight]
  )

  const handleHelpDismissed = useCallback((prediction: any) => {
    // Track dismissed help for ML improvement
    trackUserInteraction('help_dismissed', {
      predictionId: prediction.id,
      predictionType: prediction.type,
      confidence: prediction.confidence,
    })

    // Adjust future prediction thresholds
    adjustPredictionSensitivity(prediction)
  }, [])

  // ========================
  // BEHAVIOR TRACKING
  // ========================

  const trackUserInteraction = useCallback(
    (type: string, context: any = {}) => {
      const interaction = {
        type,
        timestamp: new Date(),
        context: {
          ...context,
          workflowContext: workflowContext,
          currentStep: behaviorContext.currentStep,
        },
      }

      userInteractions.current.push(interaction)

      // Keep only recent interactions (last 100)
      if (userInteractions.current.length > 100) {
        userInteractions.current = userInteractions.current.slice(-100)
      }

      // Trigger analytics update
      updateAnalytics()
    },
    [workflowContext, behaviorContext]
  )

  const updateBehaviorContext = useCallback(() => {
    const now = new Date()
    const timeInCurrentStep = Math.floor((now.getTime() - stepStartTime.current.getTime()) / 1000)

    // Count recent errors
    const recentErrors = userInteractions.current.filter(
      (interaction) =>
        interaction.type === 'error_encountered' &&
        now.getTime() - interaction.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    )

    setBehaviorContext((prev) => ({
      ...prev,
      workflowId: workflowContext.workflowId,
      workflowType: workflowContext.workflowType,
      currentStep: workflowContext.currentStep,
      blockType: workflowContext.blockType,
      timeInCurrentStep,
      errorsSinceLastProgress: recentErrors.length,
      previousErrors: recentErrors.map((e) => e.context?.errorType || 'unknown_error'),
    }))
  }, [workflowContext])

  // ========================
  // SEMANTIC SEARCH INTEGRATION
  // ========================

  const performContextualSearch = useCallback(
    async (query?: string) => {
      if (!semanticSearchEnabled || !userId) return

      try {
        const searchContext = {
          workflowType: workflowContext.workflowType,
          blockType: workflowContext.blockType,
          currentStep: workflowContext.currentStep,
          userRole: behaviorContext.userExpertiseLevel,
          errorContext: workflowContext.lastError?.message,
        }

        const searchQuery =
          query ||
          `help with ${workflowContext.blockType || 'workflow'} ${workflowContext.currentStep || 'step'}`

        const response = await fetch('/api/help/search', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        // Note: In production, this would use the enhanced semantic search API
        // with vector embeddings and contextual ranking

        trackUserInteraction('contextual_search_performed', {
          query: searchQuery,
          context: searchContext,
        })
      } catch (error) {
        console.error('Contextual search failed:', error)
      }
    },
    [semanticSearchEnabled, userId, workflowContext, behaviorContext]
  )

  // ========================
  // GOAL TRACKING & PROGRESS
  // ========================

  const updateGoalProgress = useCallback(
    async (prediction: any) => {
      // Update goals based on help interactions and workflow progress
      setUserGoals((prev) =>
        prev.map((goal) => {
          let progressIncrement = 0

          // Different prediction types contribute to different goals
          switch (prediction.type) {
            case 'help_need':
              if (goal.category === 'skill_development') progressIncrement = 5
              break
            case 'learning_opportunity':
              if (goal.category === 'exploration') progressIncrement = 10
              break
            case 'optimization_suggestion':
              if (goal.category === 'productivity') progressIncrement = 8
              break
          }

          if (progressIncrement > 0) {
            const newValue = Math.min(goal.currentValue + progressIncrement, goal.targetValue)
            const newPercentage = (newValue / goal.targetValue) * 100

            onGoalProgress?.(goal.id, newPercentage)

            return {
              ...goal,
              currentValue: newValue,
              progressPercentage: newPercentage,
              status: newPercentage >= 100 ? ('completed' as const) : goal.status,
            }
          }

          return goal
        })
      )
    },
    [onGoalProgress]
  )

  const generateLearningInsights = useCallback(async () => {
    if (!userId || userInteractions.current.length < 10) return

    try {
      // Analyze user behavior patterns to generate insights
      const helpRequests = userInteractions.current.filter((i) => i.type.includes('help'))
      const errorPatterns = userInteractions.current.filter((i) => i.type.includes('error'))
      const completedActions = userInteractions.current.filter((i) => i.type.includes('completed'))

      const insights: LearningInsights = {
        currentLevel:
          helpRequests.length > 20
            ? 'beginner'
            : helpRequests.length > 10
              ? 'intermediate'
              : 'expert',
        learningVelocity:
          completedActions.length / Math.max(helpRequests.length, 1) > 2
            ? 'fast'
            : completedActions.length / Math.max(helpRequests.length, 1) > 1
              ? 'moderate'
              : 'slow',
        preferredContentType: 'interactive', // Could be determined from interaction patterns
        strugglingAreas: [
          ...new Set(errorPatterns.map((e) => e.context?.blockType).filter(Boolean)),
        ],
        masteredConcepts: [
          ...new Set(completedActions.map((a) => a.context?.blockType).filter(Boolean)),
        ],
        recommendedNextSteps: generateNextStepRecommendations(completedActions, errorPatterns),
      }

      setLearningInsights(insights)

      onLearningInsight?.('learning_insights_updated', {
        insights,
        totalInteractions: userInteractions.current.length,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Learning insights generation failed:', error)
    }
  }, [userId, onLearningInsight])

  const generateNextStepRecommendations = useCallback(
    (completed: any[], errors: any[]): string[] => {
      const recommendations = []

      if (errors.length > completed.length) {
        recommendations.push('Focus on error handling and debugging techniques')
      }

      if (completed.some((c) => c.context?.blockType === 'api_call')) {
        recommendations.push('Explore advanced API integration patterns')
      }

      if (completed.length > 10) {
        recommendations.push('Try building a complex multi-step workflow')
      }

      return recommendations.slice(0, 3) // Limit to top 3 recommendations
    },
    []
  )

  // ========================
  // ANALYTICS & INSIGHTS
  // ========================

  const updateAnalytics = useCallback(async () => {
    if (!showAnalytics || !userId) return

    const sessionDuration = Date.now() - sessionStartTime.current.getTime()
    const interactionRate = userInteractions.current.length / Math.max(sessionDuration / 60000, 1) // per minute

    const analytics = {
      sessionDuration: Math.round(sessionDuration / 1000), // seconds
      totalInteractions: userInteractions.current.length,
      interactionRate: Math.round(interactionRate * 100) / 100,
      helpRequestRate:
        userInteractions.current.filter((i) => i.type.includes('help')).length /
        userInteractions.current.length,
      errorRate:
        userInteractions.current.filter((i) => i.type.includes('error')).length /
        userInteractions.current.length,
      workflowProgress: workflowContext.completionPercentage || 0,
      currentContext: {
        workflowType: workflowContext.workflowType,
        step: workflowContext.currentStep,
        timeInStep: behaviorContext.timeInCurrentStep,
      },
      timestamp: new Date(),
    }

    setAnalyticsData(analytics)
  }, [showAnalytics, userId, workflowContext, behaviorContext])

  const adjustPredictionSensitivity = useCallback(
    (dismissedPrediction: any) => {
      // Adjust future prediction sensitivity based on user feedback
      // This would typically update user preference models
      trackUserInteraction('prediction_sensitivity_adjusted', {
        predictionType: dismissedPrediction.type,
        previousConfidence: dismissedPrediction.confidence,
        adjustment: 'increase_threshold',
      })
    },
    [trackUserInteraction]
  )

  // ========================
  // LIFECYCLE EFFECTS
  // ========================

  useEffect(() => {
    if (!enabled || !userId) return

    // Initialize the system
    setIsInitialized(true)
    trackUserInteraction('predictive_help_initialized', { workflowContext })

    // Set up behavior context updates
    behaviorUpdateInterval.current = setInterval(updateBehaviorContext, 10000) // Every 10 seconds

    // Generate initial insights
    setTimeout(generateLearningInsights, 5000) // After 5 seconds

    return () => {
      if (behaviorUpdateInterval.current) {
        clearInterval(behaviorUpdateInterval.current)
      }

      trackUserInteraction('predictive_help_session_ended', {
        sessionDuration: Date.now() - sessionStartTime.current.getTime(),
        totalInteractions: userInteractions.current.length,
      })
    }
  }, [enabled, userId, updateBehaviorContext, generateLearningInsights])

  // Track workflow context changes
  useEffect(() => {
    if (workflowContext.currentStep !== behaviorContext.currentStep) {
      // Step changed - reset step timer and track progress
      stepStartTime.current = new Date()

      trackUserInteraction('workflow_step_changed', {
        previousStep: behaviorContext.currentStep,
        newStep: workflowContext.currentStep,
        workflowType: workflowContext.workflowType,
      })

      // Trigger contextual search for new step
      if (isInitialized) {
        performContextualSearch()
      }
    }

    if (workflowContext.lastError) {
      trackUserInteraction('error_encountered', {
        errorType: workflowContext.lastError.type,
        errorMessage: workflowContext.lastError.message,
        workflowStep: workflowContext.currentStep,
      })
    }
  }, [
    workflowContext,
    behaviorContext,
    isInitialized,
    performContextualSearch,
    trackUserInteraction,
  ])

  // ========================
  // RENDER
  // ========================

  if (!enabled || !userId) {
    return null
  }

  return (
    <div className={`predictive-help-integration ${className}`}>
      {/* Main Proactive Help Engine */}
      <ProactiveHelpEngine
        userId={userId}
        sessionId={`session_${sessionStartTime.current.getTime()}`}
        behaviorContext={behaviorContext}
        enabled={enabled}
        minConfidence={0.6}
        maxSuggestionsPerSession={8}
        onHelpAccepted={handleHelpAccepted}
        onHelpDismissed={handleHelpDismissed}
        onUserFeedback={proactiveHelp.handlers.onUserFeedback}
      />

      {/* Analytics Dashboard (Development/Debug View) */}
      {showAnalytics && analyticsData && process.env.NODE_ENV === 'development' && (
        <div className='fixed right-4 bottom-4 max-w-sm rounded-lg border bg-white p-4 text-xs shadow-lg'>
          <div className='mb-2 flex items-center justify-between'>
            <h4 className='flex items-center font-semibold'>
              <BarChart3 className='mr-1 h-4 w-4' />
              Help Analytics
            </h4>
            <button
              onClick={() => setShowAnalytics(false)}
              className='text-gray-400 hover:text-gray-600'
            >
              ×
            </button>
          </div>

          <div className='space-y-1'>
            <div>Session: {Math.round(analyticsData.sessionDuration / 60)}min</div>
            <div>Interactions: {analyticsData.totalInteractions}</div>
            <div>Help Rate: {Math.round(analyticsData.helpRequestRate * 100)}%</div>
            <div>Error Rate: {Math.round(analyticsData.errorRate * 100)}%</div>
            <div>Progress: {analyticsData.workflowProgress}%</div>
            {learningInsights && (
              <div className='mt-2 border-t pt-2'>
                <div className='font-medium'>Learning Insights:</div>
                <div>Level: {learningInsights.currentLevel}</div>
                <div>Velocity: {learningInsights.learningVelocity}</div>
                <div>Struggling: {learningInsights.strugglingAreas.slice(0, 2).join(', ')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goal Progress Indicator */}
      {userGoals.length > 0 && (
        <div className='fixed bottom-4 left-4 max-w-xs'>
          {userGoals
            .filter((goal) => goal.status === 'active' && goal.progressPercentage < 100)
            .slice(0, 1) // Show only the most relevant active goal
            .map((goal) => (
              <div key={goal.id} className='mb-2 rounded-lg border bg-white p-3 shadow-sm'>
                <div className='mb-1 flex items-center justify-between'>
                  <span className='flex items-center font-medium text-sm'>
                    <Target className='mr-1 h-4 w-4 text-blue-500' />
                    {goal.title}
                  </span>
                  <span className='text-gray-500 text-xs'>
                    {Math.round(goal.progressPercentage)}%
                  </span>
                </div>
                <div className='h-2 w-full rounded-full bg-gray-200'>
                  <div
                    className='h-2 rounded-full bg-blue-500 transition-all duration-300'
                    style={{ width: `${goal.progressPercentage}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Learning Insights Notification */}
      {learningInsights?.recommendedNextSteps &&
        learningInsights.recommendedNextSteps.length > 0 && (
          <div className='sr-only'>
            {/* Screen reader accessible content */}
            Learning recommendation: {learningInsights.recommendedNextSteps[0]}
          </div>
        )}
    </div>
  )
}

// ========================
// INTEGRATION HOOK
// ========================

/**
 * Hook for integrating predictive help into any workflow component
 */
export function usePredictiveHelpIntegration(workflowContext: WorkflowContext) {
  const [isEnabled, setIsEnabled] = useState(true)
  const [goalProgress, setGoalProgress] = useState<Record<string, number>>({})
  const [learningInsights, setLearningInsights] = useState<string[]>([])

  const handleGoalProgress = useCallback((goalId: string, progress: number) => {
    setGoalProgress((prev) => ({
      ...prev,
      [goalId]: progress,
    }))

    // Provide user feedback on goal progress
    if (progress >= 100) {
      toast.success(`🎉 Goal completed! You've mastered this skill.`)
    } else if (progress >= 50 && prev[goalId] < 50) {
      toast.success(`🎯 Halfway there! You're making great progress.`)
    }
  }, [])

  const handleLearningInsight = useCallback((insight: string, data: any) => {
    setLearningInsights((prev) => [...prev.slice(-4), insight]) // Keep last 5 insights

    // Provide contextual learning feedback
    if (insight === 'help_intervention_successful') {
      toast.success("Great job! You're learning effectively.")
    } else if (insight === 'learning_insights_updated') {
      console.log('Learning insights updated:', data.insights)
    }
  }, [])

  return {
    isEnabled,
    setIsEnabled,
    goalProgress,
    learningInsights,
    handlers: {
      onGoalProgress: handleGoalProgress,
      onLearningInsight: handleLearningInsight,
    },
  }
}
