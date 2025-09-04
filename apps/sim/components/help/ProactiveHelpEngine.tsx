/**
 * Proactive Help Engine - React Component for Real-time Assistance
 *
 * Advanced React component that provides proactive, context-aware assistance
 * by analyzing user behavior patterns and delivering timely help suggestions.
 *
 * Key Features:
 * - Real-time behavior monitoring and analysis
 * - Non-intrusive suggestion delivery system
 * - Context-aware help prediction and intervention
 * - Machine learning powered personalization
 * - User feedback integration for continuous improvement
 *
 * Performance Targets:
 * - <100ms latency for prediction generation
 * - 75% accuracy in predicting user assistance needs
 * - 40% reduction in user struggle time
 * - 90% user satisfaction with proactive suggestions
 *
 * @created 2025-09-04
 * @author Predictive Help Engine Specialist
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

// ========================
// TYPE DEFINITIONS
// ========================

interface PredictionResult {
  id: string
  type:
    | 'abandonment_risk'
    | 'help_need'
    | 'error_prediction'
    | 'learning_opportunity'
    | 'optimization_suggestion'
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

interface UserBehaviorContext {
  workflowId?: string
  workflowType?: string
  currentStep?: string
  blockType?: string
  timeInCurrentStep: number
  errorsSinceLastProgress: number
  previousErrors: string[]
  userExpertiseLevel?: 'beginner' | 'intermediate' | 'expert'
}

interface ProactiveHelpEngineProps {
  userId?: string
  sessionId?: string
  behaviorContext: UserBehaviorContext
  enabled?: boolean
  minConfidence?: number
  maxSuggestionsPerSession?: number
  onHelpAccepted?: (prediction: PredictionResult) => void
  onHelpDismissed?: (prediction: PredictionResult) => void
  onUserFeedback?: (predictionId: string, feedback: PredictionFeedback) => void
}

interface PredictionFeedback {
  wasHelpful: boolean
  wasAccurate: boolean
  userAction: 'accepted' | 'dismissed' | 'ignored'
  actualOutcome?: string
  userComment?: string
}

interface SuggestionDisplayState {
  visible: boolean
  prediction: PredictionResult | null
  showFeedback: boolean
  position: { x: number; y: number }
}

// ========================
// MAIN COMPONENT
// ========================

export default function ProactiveHelpEngine({
  userId,
  sessionId,
  behaviorContext,
  enabled = true,
  minConfidence = 0.6,
  maxSuggestionsPerSession = 5,
  onHelpAccepted,
  onHelpDismissed,
  onUserFeedback,
}: ProactiveHelpEngineProps) {
  // State management
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [suggestionDisplay, setSuggestionDisplay] = useState<SuggestionDisplayState>({
    visible: false,
    prediction: null,
    showFeedback: false,
    position: { x: 0, y: 0 },
  })
  const [suggestionsShownCount, setSuggestionsShownCount] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null)

  // Refs for behavior tracking
  const behaviorAnalysisInterval = useRef<NodeJS.Timeout | null>(null)
  const pendingPredictions = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const sessionStartTime = useRef<Date>(new Date())
  const userActions = useRef<Array<{ type: string; timestamp: string; context?: any }>>([])

  // ========================
  // BEHAVIOR MONITORING
  // ========================

  const trackUserAction = useCallback((actionType: string, context?: any) => {
    userActions.current.push({
      type: actionType,
      timestamp: new Date().toISOString(),
      context,
    })

    // Keep only recent actions (last 50)
    if (userActions.current.length > 50) {
      userActions.current = userActions.current.slice(-50)
    }
  }, [])

  const analyzeBehaviorAndPredict = useCallback(async () => {
    if (!enabled || !userId || suggestionsShownCount >= maxSuggestionsPerSession) {
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/help/predictions/behavior-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionData: {
            startTime: sessionStartTime.current.toISOString(),
            currentTime: new Date().toISOString(),
            actionsPerformed: userActions.current,
            errorsEncountered: behaviorContext.previousErrors.map((error) => ({
              type: error,
              message: error,
              timestamp: new Date().toISOString(),
              resolved: false,
            })),
            helpRequestsMade: [],
          },
          workflowContext: {
            workflowId: behaviorContext.workflowId,
            workflowType: behaviorContext.workflowType,
            currentStep: behaviorContext.currentStep,
            completionPercentage: 0,
            timeSpent: behaviorContext.timeInCurrentStep,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Prediction request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.analysis?.predictions) {
        setPredictions((prev) => {
          const newPredictions = data.analysis.predictions.filter(
            (newPred: PredictionResult) =>
              newPred.confidence >= minConfidence &&
              !prev.some((existing) => existing.id === newPred.id)
          )

          // Schedule delayed predictions
          newPredictions.forEach((prediction: PredictionResult) => {
            if (
              !prediction.suggestion.timing.suggestNow &&
              prediction.suggestion.timing.delaySeconds
            ) {
              const timeoutId = setTimeout(() => {
                showPredictionSuggestion(prediction)
                pendingPredictions.current.delete(prediction.id)
              }, prediction.suggestion.timing.delaySeconds * 1000)

              pendingPredictions.current.set(prediction.id, timeoutId)
            } else if (prediction.suggestion.timing.suggestNow) {
              // Show immediately with slight delay to avoid overwhelming user
              setTimeout(() => showPredictionSuggestion(prediction), 500)
            }
          })

          return [...prev, ...newPredictions]
        })
      }

      setLastAnalysisTime(new Date())
    } catch (error) {
      console.error('Behavior analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [
    enabled,
    userId,
    behaviorContext,
    minConfidence,
    maxSuggestionsPerSession,
    suggestionsShownCount,
  ])

  // ========================
  // PREDICTION DISPLAY
  // ========================

  const showPredictionSuggestion = useCallback(
    (prediction: PredictionResult) => {
      if (suggestionsShownCount >= maxSuggestionsPerSession || suggestionDisplay.visible) {
        return
      }

      // Calculate position (center of screen with offset)
      const position = {
        x: window.innerWidth / 2 - 200, // Assuming 400px width
        y: window.innerHeight / 3,
      }

      setSuggestionDisplay({
        visible: true,
        prediction,
        showFeedback: false,
        position,
      })

      setSuggestionsShownCount((prev) => prev + 1)
      trackUserAction('prediction_shown', { predictionId: prediction.id, type: prediction.type })

      // Auto-hide after 30 seconds if not interacted with
      setTimeout(() => {
        setSuggestionDisplay((prev) =>
          prev.prediction?.id === prediction.id && prev.visible ? { ...prev, visible: false } : prev
        )
      }, 30000)
    },
    [suggestionsShownCount, maxSuggestionsPerSession, suggestionDisplay.visible, trackUserAction]
  )

  const handleSuggestionAction = useCallback(
    async (action: 'accept' | 'dismiss', prediction: PredictionResult) => {
      trackUserAction(`suggestion_${action}`, { predictionId: prediction.id })

      if (action === 'accept') {
        onHelpAccepted?.(prediction)

        // Execute the suggested action
        switch (prediction.suggestion.actionType) {
          case 'show_help':
            if (prediction.suggestion.content?.helpArticleId) {
              window.open(`/help/articles/${prediction.suggestion.content.helpArticleId}`, '_blank')
            }
            break
          case 'suggest_tutorial':
            if (prediction.suggestion.content?.tutorialId) {
              window.open(`/tutorials/${prediction.suggestion.content.tutorialId}`, '_blank')
            }
            break
          case 'offer_assistance':
            // Could open help chat or show contextual help panel
            toast.info(
              prediction.suggestion.content?.customMessage || 'Help is available when you need it!'
            )
            break
          case 'recommend_pause':
            toast.info("Consider taking a break. You're doing great!", {
              duration: 5000,
              action: {
                label: 'Set Timer',
                onClick: () => {
                  // Could integrate with a break timer
                  toast.success('5-minute break timer started!')
                },
              },
            })
            break
        }
      } else {
        onHelpDismissed?.(prediction)
      }

      // Show feedback collection after action
      setSuggestionDisplay((prev) => ({
        ...prev,
        showFeedback: true,
      }))

      // Hide feedback form after 10 seconds
      setTimeout(() => {
        setSuggestionDisplay((prev) => ({
          ...prev,
          visible: false,
          showFeedback: false,
        }))
      }, 10000)
    },
    [trackUserAction, onHelpAccepted, onHelpDismissed]
  )

  const handleUserFeedback = useCallback(
    async (feedback: PredictionFeedback) => {
      if (!suggestionDisplay.prediction) return

      const predictionId = suggestionDisplay.prediction.id
      trackUserAction('feedback_provided', { predictionId, feedback })

      try {
        await fetch('/api/help/predictions/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            predictionId,
            userId,
            ...feedback,
            timestamp: new Date().toISOString(),
          }),
        })

        onUserFeedback?.(predictionId, feedback)

        setSuggestionDisplay((prev) => ({
          ...prev,
          visible: false,
          showFeedback: false,
        }))

        toast.success('Thank you for your feedback!')
      } catch (error) {
        console.error('Failed to submit feedback:', error)
        toast.error('Failed to submit feedback')
      }
    },
    [suggestionDisplay.prediction, userId, trackUserAction, onUserFeedback]
  )

  // ========================
  // LIFECYCLE & EFFECTS
  // ========================

  useEffect(() => {
    if (!enabled) return

    // Initial analysis
    analyzeBehaviorAndPredict()

    // Set up periodic analysis (every 30 seconds)
    behaviorAnalysisInterval.current = setInterval(analyzeBehaviorAndPredict, 30000)

    return () => {
      if (behaviorAnalysisInterval.current) {
        clearInterval(behaviorAnalysisInterval.current)
      }

      // Clear pending prediction timeouts
      pendingPredictions.current.forEach((timeoutId) => clearTimeout(timeoutId))
      pendingPredictions.current.clear()
    }
  }, [enabled, analyzeBehaviorAndPredict])

  // Update behavior context when it changes
  useEffect(() => {
    trackUserAction('context_change', behaviorContext)
  }, [behaviorContext, trackUserAction])

  // ========================
  // SUGGESTION COMPONENTS
  // ========================

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'help_need':
        return <HelpCircle className='h-5 w-5 text-blue-500' />
      case 'abandonment_risk':
        return <AlertTriangle className='h-5 w-5 text-red-500' />
      case 'error_prediction':
        return <AlertTriangle className='h-5 w-5 text-orange-500' />
      case 'learning_opportunity':
        return <Lightbulb className='h-5 w-5 text-green-500' />
      case 'optimization_suggestion':
        return <Zap className='h-5 w-5 text-purple-500' />
      default:
        return <HelpCircle className='h-5 w-5 text-gray-500' />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'high':
        return 'border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-blue-500 bg-blue-50'
      case 'low':
        return 'border-green-500 bg-green-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  // ========================
  // RENDER
  // ========================

  if (!enabled || !suggestionDisplay.visible || !suggestionDisplay.prediction) {
    return null
  }

  const { prediction, showFeedback, position } = suggestionDisplay

  return (
    <div
      className='fixed z-50 max-w-sm'
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, 0)',
      }}
    >
      {/* Main Suggestion Card */}
      {!showFeedback && (
        <div
          className={`slide-in-from-top-2 animate-in rounded-lg border-2 bg-white p-4 shadow-lg duration-300 ${getPriorityColor(prediction.priority)} `}
        >
          {/* Header */}
          <div className='mb-3 flex items-start justify-between'>
            <div className='flex items-center space-x-2'>
              {getPredictionIcon(prediction.type)}
              <span className='font-medium text-gray-700 text-sm capitalize'>
                {prediction.type.replace('_', ' ')}
              </span>
              <span
                className={`rounded-full px-2 py-1 font-medium text-xs ${
                  prediction.priority === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : prediction.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : prediction.priority === 'medium'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                } `}
              >
                {Math.round(prediction.confidence * 100)}% confident
              </span>
            </div>
            <button
              onClick={() => handleSuggestionAction('dismiss', prediction)}
              className='text-gray-400 transition-colors hover:text-gray-600'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          {/* Content */}
          <div className='mb-4'>
            <h3 className='mb-1 font-semibold text-gray-900'>{prediction.suggestion.title}</h3>
            <p className='text-gray-600 text-sm leading-relaxed'>
              {prediction.suggestion.description}
            </p>

            {prediction.suggestion.content?.customMessage && (
              <div className='mt-2 rounded bg-white bg-opacity-70 p-2 text-gray-600 text-xs'>
                {prediction.suggestion.content.customMessage}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className='flex space-x-2'>
            <button
              onClick={() => handleSuggestionAction('accept', prediction)}
              className='flex flex-1 items-center justify-center space-x-1 rounded bg-blue-600 px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700 '
            >
              <CheckCircle className='h-4 w-4' />
              <span>
                {prediction.suggestion.actionType === 'show_help' && 'Show Help'}
                {prediction.suggestion.actionType === 'suggest_tutorial' && 'Start Tutorial'}
                {prediction.suggestion.actionType === 'offer_assistance' && 'Get Assistance'}
                {prediction.suggestion.actionType === 'recommend_pause' && 'Take Break'}
              </span>
            </button>

            <button
              onClick={() => handleSuggestionAction('dismiss', prediction)}
              className='rounded bg-gray-200 px-3 py-2 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-300 '
            >
              Not Now
            </button>
          </div>

          {/* Context Info (for debugging, can be hidden in production) */}
          {process.env.NODE_ENV === 'development' && prediction.explanation && (
            <div className='mt-3 border-t pt-3 text-gray-500 text-xs'>
              <strong>Debug:</strong> {prediction.explanation}
            </div>
          )}
        </div>
      )}

      {/* Feedback Form */}
      {showFeedback && (
        <div className='slide-in-from-top-2 animate-in rounded-lg border-2 border-gray-300 bg-white p-4 shadow-lg duration-300 '>
          <h4 className='mb-3 font-semibold text-gray-900'>How was this suggestion?</h4>

          <div className='space-y-3'>
            <div className='flex justify-center space-x-4'>
              <button
                onClick={() =>
                  handleUserFeedback({
                    wasHelpful: true,
                    wasAccurate: true,
                    userAction: 'accepted',
                  })
                }
                className='flex items-center space-x-2 rounded-lg bg-green-100 px-4 py-2 text-green-800 transition-colors hover:bg-green-200 '
              >
                <ThumbsUp className='h-4 w-4' />
                <span>Helpful</span>
              </button>

              <button
                onClick={() =>
                  handleUserFeedback({
                    wasHelpful: false,
                    wasAccurate: false,
                    userAction: 'dismissed',
                  })
                }
                className='flex items-center space-x-2 rounded-lg bg-red-100 px-4 py-2 text-red-800 transition-colors hover:bg-red-200 '
              >
                <ThumbsDown className='h-4 w-4' />
                <span>Not Helpful</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Status Indicator (development only) */}
      {process.env.NODE_ENV === 'development' && isAnalyzing && (
        <div className='mt-2 text-center'>
          <span className='rounded bg-white px-2 py-1 text-gray-500 text-xs shadow'>
            Analyzing behavior...
          </span>
        </div>
      )}
    </div>
  )
}

// ========================
// HOOK FOR EASY INTEGRATION
// ========================

export function useProactiveHelp(behaviorContext: UserBehaviorContext) {
  const [helpAccepted, setHelpAccepted] = useState<PredictionResult | null>(null)
  const [helpDismissed, setHelpDismissed] = useState<PredictionResult | null>(null)
  const [feedbackProvided, setFeedbackProvided] = useState<{
    predictionId: string
    feedback: PredictionFeedback
  } | null>(null)

  const handleHelpAccepted = useCallback((prediction: PredictionResult) => {
    setHelpAccepted(prediction)
  }, [])

  const handleHelpDismissed = useCallback((prediction: PredictionResult) => {
    setHelpDismissed(prediction)
  }, [])

  const handleUserFeedback = useCallback((predictionId: string, feedback: PredictionFeedback) => {
    setFeedbackProvided({ predictionId, feedback })
  }, [])

  return {
    helpAccepted,
    helpDismissed,
    feedbackProvided,
    handlers: {
      onHelpAccepted: handleHelpAccepted,
      onHelpDismissed: handleHelpDismissed,
      onUserFeedback: handleUserFeedback,
    },
  }
}
