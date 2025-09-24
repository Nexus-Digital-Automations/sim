/**
 * React Hook for Contextual Help System
 *
 * Provides easy integration with the contextual help system,
 * allowing components to trigger help, track interactions,
 * and manage help state.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  contextualHelpSystem,
  helpContentManager,
  interactiveGuidance,
  multiModalDelivery,
  userFeedbackSystem,
} from '@/services/contextual-help'
import type {
  FeedbackData,
  GuidanceTutorial,
  HelpContent,
  HelpContext,
  HelpDeliveryConfig,
  HelpDeliveryMode,
} from '@/services/contextual-help/types'

// Hook for basic contextual help functionality
export function useContextualHelp() {
  const pathname = usePathname()
  const [helpContext, setHelpContext] = useState<HelpContext | null>(null)
  const [activeHelp, setActiveHelp] = useState<{
    content: HelpContent
    config: HelpDeliveryConfig
    deliveryId?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize help context
  useEffect(() => {
    const initializeContext = async () => {
      try {
        // TODO: Get real user data from authentication context
        const context: HelpContext = {
          id: `context_${Date.now()}`,
          userId: 'current-user', // TODO: Get from auth
          workspaceId: 'current-workspace', // TODO: Get from auth
          sessionId: `session_${Date.now()}`,
          currentRoute: pathname,
          userState: {
            expertiseLevel: 'intermediate', // TODO: Get from user profile
            recentActions: [],
            strugglingAreas: [],
            preferredHelpMode: 'modal',
            accessibility: {
              screenReader: false,
              reducedMotion: false,
              highContrast: false,
              fontSize: 'normal',
              voiceGuidance: false,
              keyboardNavigation: true,
            },
          },
          timestamp: new Date(),
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            referrer: typeof document !== 'undefined' ? document.referrer : '',
          },
        }

        setHelpContext(context)
      } catch (error) {
        console.error('Failed to initialize help context:', error)
        setError('Failed to initialize help system')
      }
    }

    initializeContext()
  }, [pathname])

  // Show contextual help
  const showHelp = useCallback(
    async (
      contentId?: string,
      options?: {
        mode?: HelpDeliveryMode
        trigger?: 'manual' | 'automatic' | 'error'
        position?: { x: number; y: number }
      }
    ) => {
      if (!helpContext) {
        setError('Help context not initialized')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let content: HelpContent | null = null

        if (contentId) {
          // Get specific content
          content = helpContentManager.getContent(contentId)
        } else {
          // Get contextual help based on current state
          content = await contextualHelpSystem.getContextualHelp(helpContext)
        }

        if (!content) {
          setError('No help content available for current context')
          return
        }

        // Determine optimal delivery configuration
        const { mode, confidence } = await multiModalDelivery.getOptimalDeliveryMode(
          content,
          helpContext
        )

        const config: HelpDeliveryConfig = {
          mode: options?.mode || mode,
          position: options?.position
            ? {
                offset: options.position,
              }
            : undefined,
          behavior: {
            autoClose: content.priority === 'critical' ? undefined : 30000,
            dismissible: true,
            persistent: content.priority === 'critical',
          },
          accessibility: {
            announceToScreenReader: helpContext.userState.accessibility.screenReader,
            trapFocus: mode === 'modal',
            returnFocus: true,
          },
        }

        // Deliver help
        const deliveryResult = await multiModalDelivery.deliverHelp(content, helpContext, config)

        if (deliveryResult.success) {
          setActiveHelp({
            content,
            config,
            deliveryId: deliveryResult.deliveryId,
          })
        } else {
          setError('Failed to deliver help content')
        }
      } catch (error) {
        console.error('Error showing help:', error)
        setError(error instanceof Error ? error.message : 'Failed to show help')
      } finally {
        setIsLoading(false)
      }
    },
    [helpContext]
  )

  // Hide active help
  const hideHelp = useCallback(
    async (reason: 'user' | 'timeout' | 'completed' = 'user') => {
      if (activeHelp?.deliveryId) {
        await multiModalDelivery.dismissDelivery(activeHelp.deliveryId, reason)
      }
      setActiveHelp(null)
    },
    [activeHelp]
  )

  // Track interaction
  const trackInteraction = useCallback(
    async (
      type: 'view' | 'click' | 'scroll' | 'voice' | 'keyboard',
      data?: Record<string, any>
    ) => {
      if (activeHelp?.deliveryId) {
        await multiModalDelivery.trackInteraction(activeHelp.deliveryId, type, data)
      }
    },
    [activeHelp]
  )

  // Submit feedback
  const submitFeedback = useCallback(
    async (feedback: Omit<FeedbackData, 'id' | 'metadata' | 'status'>) => {
      if (!helpContext) return

      const completeFeedback = {
        ...feedback,
        metadata: {
          ...feedback.metadata,
          context: helpContext,
          timestamp: new Date(),
          helpDeliveryMode: activeHelp?.config.mode,
        },
      }

      await userFeedbackSystem.collectFeedback(completeFeedback)
    },
    [helpContext, activeHelp]
  )

  // Search help content
  const searchHelp = useCallback(
    async (query: string, filters?: Record<string, any>) => {
      if (!helpContext) return []

      return await helpContentManager.searchContent({
        query,
        filters,
        context: helpContext,
        options: {
          fuzzy: true,
          semantic: true,
          maxResults: 10,
        },
      })
    },
    [helpContext]
  )

  return {
    helpContext,
    activeHelp,
    isLoading,
    error,
    showHelp,
    hideHelp,
    trackInteraction,
    submitFeedback,
    searchHelp,
    // Helper functions
    isHelpActive: !!activeHelp,
    currentHelpContent: activeHelp?.content || null,
    currentDeliveryMode: activeHelp?.config.mode || null,
  }
}

// Hook for interactive tutorials
export function useTutorial() {
  const [activeTutorial, setActiveTutorial] = useState<{
    sessionId: string
    tutorial: GuidanceTutorial
    currentStep: any
    progress: any
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { helpContext } = useContextualHelp()

  // Start tutorial
  const startTutorial = useCallback(
    async (
      tutorialId: string,
      options?: {
        startFromStep?: string
        skipCompletedSteps?: boolean
      }
    ) => {
      if (!helpContext) {
        setError('Help context not available')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await interactiveGuidance.startTutorial(tutorialId, helpContext, options)

        setActiveTutorial({
          sessionId: result.sessionId,
          tutorial: result.currentStep as any, // TODO: Fix type
          currentStep: result.currentStep,
          progress: result.progress,
        })
      } catch (error) {
        console.error('Error starting tutorial:', error)
        setError(error instanceof Error ? error.message : 'Failed to start tutorial')
      } finally {
        setIsLoading(false)
      }
    },
    [helpContext]
  )

  // Process tutorial interaction
  const processInteraction = useCallback(
    async (interactionType: string, data: any) => {
      if (!activeTutorial) return

      try {
        const result = await interactiveGuidance.processInteraction(
          activeTutorial.sessionId,
          interactionType,
          data
        )

        if (result.result === 'success' && result.nextStep) {
          setActiveTutorial((prev) =>
            prev
              ? {
                  ...prev,
                  currentStep: result.nextStep,
                  progress: result.updatedProgress || prev.progress,
                }
              : null
          )
        }

        return result
      } catch (error) {
        console.error('Error processing tutorial interaction:', error)
        setError(error instanceof Error ? error.message : 'Failed to process interaction')
        return { result: 'failure' as const, message: 'Interaction failed' }
      }
    },
    [activeTutorial]
  )

  // Skip current step
  const skipStep = useCallback(
    async (reason?: string) => {
      if (!activeTutorial) return

      try {
        const result = await interactiveGuidance.skipCurrentStep(activeTutorial.sessionId, reason)

        if (result.result === 'success' && result.nextStep) {
          setActiveTutorial((prev) =>
            prev
              ? {
                  ...prev,
                  currentStep: result.nextStep,
                  progress: result.updatedProgress || prev.progress,
                }
              : null
          )
        }

        return result
      } catch (error) {
        console.error('Error skipping tutorial step:', error)
        setError(error instanceof Error ? error.message : 'Failed to skip step')
      }
    },
    [activeTutorial]
  )

  // Pause tutorial
  const pauseTutorial = useCallback(async () => {
    if (!activeTutorial) return null

    try {
      const result = await interactiveGuidance.pauseTutorial(activeTutorial.sessionId)
      setActiveTutorial(null)
      return result.resumeToken
    } catch (error) {
      console.error('Error pausing tutorial:', error)
      setError(error instanceof Error ? error.message : 'Failed to pause tutorial')
      return null
    }
  }, [activeTutorial])

  // Resume tutorial
  const resumeTutorial = useCallback(
    async (resumeToken: string) => {
      if (!helpContext) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await interactiveGuidance.resumeTutorial(resumeToken, helpContext)

        setActiveTutorial({
          sessionId: result.sessionId,
          tutorial: result.currentStep as any, // TODO: Fix type
          currentStep: result.currentStep,
          progress: result.progress,
        })
      } catch (error) {
        console.error('Error resuming tutorial:', error)
        setError(error instanceof Error ? error.message : 'Failed to resume tutorial')
      } finally {
        setIsLoading(false)
      }
    },
    [helpContext]
  )

  // End tutorial
  const endTutorial = useCallback(() => {
    setActiveTutorial(null)
    setError(null)
  }, [])

  // Get available tutorials
  const getAvailableTutorials = useCallback(
    async (filters?: {
      category?: string
      difficulty?: 'beginner' | 'intermediate' | 'advanced'
      estimatedDuration?: number
    }) => {
      if (!helpContext) return []

      return await interactiveGuidance.getAvailableTutorials(helpContext, filters)
    },
    [helpContext]
  )

  return {
    activeTutorial,
    isLoading,
    error,
    startTutorial,
    processInteraction,
    skipStep,
    pauseTutorial,
    resumeTutorial,
    endTutorial,
    getAvailableTutorials,
    // Helper functions
    isTutorialActive: !!activeTutorial,
    currentProgress: activeTutorial?.progress || null,
    currentStep: activeTutorial?.currentStep || null,
  }
}

// Hook for help analytics and insights
export function useHelpAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get help usage analytics
  const getAnalytics = useCallback(async (contentId?: string) => {
    setIsLoading(true)
    try {
      const helpAnalytics = contextualHelpSystem.getSystemMetrics()
      const feedbackAnalytics = userFeedbackSystem.getFeedbackAnalytics(contentId)
      const deliveryAnalytics = multiModalDelivery.getDeliveryAnalytics()
      const satisfactionMetrics = userFeedbackSystem.getUserSatisfactionMetrics()

      setAnalytics({
        system: helpAnalytics,
        feedback: feedbackAnalytics,
        delivery: deliveryAnalytics,
        satisfaction: satisfactionMetrics,
      })
    } catch (error) {
      console.error('Error getting help analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get improvement suggestions
  const getImprovementSuggestions = useCallback(
    async (contentId?: string, priority?: 'low' | 'medium' | 'high' | 'critical') => {
      return await userFeedbackSystem.getImprovementSuggestions(contentId, priority)
    },
    []
  )

  return {
    analytics,
    isLoading,
    getAnalytics,
    getImprovementSuggestions,
  }
}

// Hook for help content management (admin features)
export function useHelpContentManagement() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create help content
  const createContent = useCallback(
    async (
      content: Omit<HelpContent, 'id' | 'version' | 'lastUpdated' | 'analytics'>,
      authorId: string
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const newContent = await helpContentManager.createContent(content, authorId)
        return newContent
      } catch (error) {
        console.error('Error creating help content:', error)
        setError(error instanceof Error ? error.message : 'Failed to create content')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Update help content
  const updateContent = useCallback(
    async (contentId: string, updates: Partial<HelpContent>, authorId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const updatedContent = await helpContentManager.updateContent(contentId, updates, authorId)
        return updatedContent
      } catch (error) {
        console.error('Error updating help content:', error)
        setError(error instanceof Error ? error.message : 'Failed to update content')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Get content analytics
  const getContentAnalytics = useCallback((contentId?: string) => {
    return helpContentManager.getContentAnalytics(contentId)
  }, [])

  // Get content usage stats
  const getUsageStats = useCallback(() => {
    return helpContentManager.getContentUsageStats()
  }, [])

  return {
    isLoading,
    error,
    createContent,
    updateContent,
    getContentAnalytics,
    getUsageStats,
  }
}

// Auto-trigger help based on user behavior
export function useAutoHelp() {
  const { showHelp, helpContext } = useContextualHelp()
  const inactivityTimer = useRef<NodeJS.Timeout>()
  const interactionCount = useRef(0)
  const [autoHelpEnabled, setAutoHelpEnabled] = useState(true)

  // Track user inactivity
  useEffect(() => {
    if (!autoHelpEnabled || !helpContext) return

    const handleUserActivity = () => {
      interactionCount.current++

      // Clear existing timer
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }

      // Set new inactivity timer
      inactivityTimer.current = setTimeout(() => {
        if (interactionCount.current < 3) {
          // User seems to be struggling, offer help
          showHelp(undefined, { trigger: 'automatic' })
        }
      }, 30000) // 30 seconds of inactivity
    }

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach((event) => {
      document.addEventListener(event, handleUserActivity, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserActivity)
      })
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
    }
  }, [autoHelpEnabled, helpContext, showHelp])

  // Track implicit feedback
  useEffect(() => {
    if (!helpContext) return

    const trackBehavior = (action: string, data?: any) => {
      userFeedbackSystem.collectImplicitFeedback({
        userId: helpContext.userId,
        sessionId: helpContext.sessionId,
        action: action as any,
        context: helpContext,
        metadata: data,
      })
    }

    // Track page focus loss (potential confusion)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackBehavior('sought_help', { reason: 'left_page' })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [helpContext])

  return {
    autoHelpEnabled,
    setAutoHelpEnabled,
  }
}
