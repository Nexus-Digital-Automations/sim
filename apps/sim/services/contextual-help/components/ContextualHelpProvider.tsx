/**
 * Contextual Help Provider Component
 *
 * React context provider that manages contextual help state and provides
 * help functionality throughout the application.
 *
 * @author Contextual Help Agent
 * @version 1.0.0
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { contextualHelpAPI } from '../api/help-api'
import type {
  HelpContext,
  HelpContent,
  HelpDeliveryConfig,
  GuidanceTutorial,
  HelpSearchResult,
  FeedbackData
} from '../types'
import type { NLHelpContentConfig } from '../content/nl-framework-integration'

// Context State Interface
export interface ContextualHelpState {
  isInitialized: boolean
  currentHelpContent: HelpContent[]
  activeGuidance: {
    tutorial: GuidanceTutorial | null
    sessionId: string | null
    currentStepIndex: number
  }
  helpHistory: HelpContent[]
  searchResults: HelpSearchResult[]
  isLoading: boolean
  error: string | null
  userContext: HelpContext | null
  helpMetrics: {
    sessionStartTime: Date | null
    totalHelpViews: number
    feedbackSubmitted: number
  }
}

// Action Types
type ContextualHelpAction =
  | { type: 'INITIALIZE'; payload: { userContext: HelpContext } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HELP_CONTENT'; payload: HelpContent[] }
  | { type: 'ADD_TO_HISTORY'; payload: HelpContent }
  | { type: 'START_GUIDANCE'; payload: { tutorial: GuidanceTutorial; sessionId: string } }
  | { type: 'UPDATE_GUIDANCE_STEP'; payload: number }
  | { type: 'END_GUIDANCE' }
  | { type: 'SET_SEARCH_RESULTS'; payload: HelpSearchResult[] }
  | { type: 'INCREMENT_HELP_VIEWS' }
  | { type: 'INCREMENT_FEEDBACK_COUNT' }
  | { type: 'RESET_STATE' }

// Initial State
const initialState: ContextualHelpState = {
  isInitialized: false,
  currentHelpContent: [],
  activeGuidance: {
    tutorial: null,
    sessionId: null,
    currentStepIndex: 0
  },
  helpHistory: [],
  searchResults: [],
  isLoading: false,
  error: null,
  userContext: null,
  helpMetrics: {
    sessionStartTime: null,
    totalHelpViews: 0,
    feedbackSubmitted: 0
  }
}

// Reducer
function contextualHelpReducer(
  state: ContextualHelpState,
  action: ContextualHelpAction
): ContextualHelpState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        isInitialized: true,
        userContext: action.payload.userContext,
        helpMetrics: {
          ...state.helpMetrics,
          sessionStartTime: new Date()
        }
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      }

    case 'SET_HELP_CONTENT':
      return {
        ...state,
        currentHelpContent: action.payload,
        isLoading: false,
        error: null
      }

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        helpHistory: [action.payload, ...state.helpHistory.slice(0, 19)] // Keep last 20
      }

    case 'START_GUIDANCE':
      return {
        ...state,
        activeGuidance: {
          tutorial: action.payload.tutorial,
          sessionId: action.payload.sessionId,
          currentStepIndex: 0
        }
      }

    case 'UPDATE_GUIDANCE_STEP':
      return {
        ...state,
        activeGuidance: {
          ...state.activeGuidance,
          currentStepIndex: action.payload
        }
      }

    case 'END_GUIDANCE':
      return {
        ...state,
        activeGuidance: {
          tutorial: null,
          sessionId: null,
          currentStepIndex: 0
        }
      }

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
        isLoading: false,
        error: null
      }

    case 'INCREMENT_HELP_VIEWS':
      return {
        ...state,
        helpMetrics: {
          ...state.helpMetrics,
          totalHelpViews: state.helpMetrics.totalHelpViews + 1
        }
      }

    case 'INCREMENT_FEEDBACK_COUNT':
      return {
        ...state,
        helpMetrics: {
          ...state.helpMetrics,
          feedbackSubmitted: state.helpMetrics.feedbackSubmitted + 1
        }
      }

    case 'RESET_STATE':
      return initialState

    default:
      return state
  }
}

// Context Interface
export interface ContextualHelpContextType {
  state: ContextualHelpState

  // Core Actions
  initializeHelp: (userContext: HelpContext) => Promise<void>
  getContextualHelp: (deliveryConfig?: HelpDeliveryConfig) => Promise<void>
  generateIntelligentHelp: (config: NLHelpContentConfig) => Promise<void>

  // Guidance Actions
  startGuidance: (toolId: string, tutorialType: 'quick_start' | 'comprehensive' | 'troubleshooting') => Promise<void>
  nextGuidanceStep: () => Promise<void>
  previousGuidanceStep: () => Promise<void>
  endGuidance: () => Promise<void>

  // Search Actions
  searchHelp: (query: string, filters?: any) => Promise<void>

  // Feedback Actions
  submitFeedback: (feedbackData: Omit<FeedbackData, 'id' | 'status' | 'metadata'>) => Promise<void>

  // Utility Actions
  adaptHelpContent: (contentId: string, newContext: HelpContext) => Promise<void>
  clearError: () => void
  resetHelp: () => void
}

// Create Context
const ContextualHelpContext = createContext<ContextualHelpContextType | null>(null)

// Provider Component Props
export interface ContextualHelpProviderProps {
  children: React.ReactNode
  initialContext?: Partial<HelpContext>
  enableAnalytics?: boolean
  debugMode?: boolean
}

// Provider Component
export function ContextualHelpProvider({
  children,
  initialContext,
  enableAnalytics = true,
  debugMode = false
}: ContextualHelpProviderProps) {
  const [state, dispatch] = useReducer(contextualHelpReducer, initialState)

  // Generate request context
  const generateRequestContext = useCallback(() => ({
    userId: state.userContext?.userId || 'anonymous',
    sessionId: state.userContext?.sessionId || `session_${Date.now()}`,
    userAgent: navigator.userAgent,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }), [state.userContext])

  // Initialize help system
  const initializeHelp = useCallback(async (userContext: HelpContext) => {
    if (debugMode) console.log('Initializing contextual help', userContext)

    dispatch({ type: 'INITIALIZE', payload: { userContext } })

    // Load initial help content if tool context is available
    if (userContext.toolContext) {
      await getContextualHelp()
    }
  }, [debugMode])

  // Get contextual help
  const getContextualHelp = useCallback(async (deliveryConfig?: HelpDeliveryConfig) => {
    if (!state.userContext) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await contextualHelpAPI.getContextualHelp(
        state.userContext,
        generateRequestContext(),
        deliveryConfig
      )

      if (response.success && response.data) {
        dispatch({ type: 'SET_HELP_CONTENT', payload: response.data })
        dispatch({ type: 'INCREMENT_HELP_VIEWS' })

        // Add to history
        response.data.forEach(content => {
          dispatch({ type: 'ADD_TO_HISTORY', payload: content })
        })
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error?.message || 'Failed to get help' })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error occurred' })
    }
  }, [state.userContext, generateRequestContext])

  // Generate intelligent help
  const generateIntelligentHelp = useCallback(async (config: NLHelpContentConfig) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await contextualHelpAPI.generateIntelligentHelp(
        config,
        generateRequestContext()
      )

      if (response.success && response.data) {
        dispatch({ type: 'SET_HELP_CONTENT', payload: [response.data.primaryContent] })
        dispatch({ type: 'ADD_TO_HISTORY', payload: response.data.primaryContent })
        dispatch({ type: 'INCREMENT_HELP_VIEWS' })
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error?.message || 'Failed to generate help' })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error occurred' })
    }
  }, [generateRequestContext])

  // Start guidance
  const startGuidance = useCallback(async (
    toolId: string,
    tutorialType: 'quick_start' | 'comprehensive' | 'troubleshooting'
  ) => {
    if (!state.userContext) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await contextualHelpAPI.startInteractiveGuidance(
        toolId,
        tutorialType,
        state.userContext,
        generateRequestContext()
      )

      if (response.success && response.data) {
        dispatch({ type: 'START_GUIDANCE', payload: response.data })
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error?.message || 'Failed to start guidance' })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error occurred' })
    }
  }, [state.userContext, generateRequestContext])

  // Guidance navigation
  const nextGuidanceStep = useCallback(async () => {
    if (!state.activeGuidance.tutorial) return

    const nextIndex = state.activeGuidance.currentStepIndex + 1
    if (nextIndex < state.activeGuidance.tutorial.steps.length) {
      dispatch({ type: 'UPDATE_GUIDANCE_STEP', payload: nextIndex })
    }
  }, [state.activeGuidance])

  const previousGuidanceStep = useCallback(async () => {
    const prevIndex = state.activeGuidance.currentStepIndex - 1
    if (prevIndex >= 0) {
      dispatch({ type: 'UPDATE_GUIDANCE_STEP', payload: prevIndex })
    }
  }, [state.activeGuidance.currentStepIndex])

  const endGuidance = useCallback(async () => {
    dispatch({ type: 'END_GUIDANCE' })
  }, [])

  // Search help
  const searchHelp = useCallback(async (query: string, filters?: any) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const searchQuery = {
        query,
        filters,
        context: state.userContext,
        options: {
          semantic: true,
          maxResults: 10,
          includeAnalytics: true
        }
      }

      const response = await contextualHelpAPI.searchHelpContent(
        searchQuery,
        generateRequestContext()
      )

      if (response.success && response.data) {
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: response.data })
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error?.message || 'Search failed' })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Search network error occurred' })
    }
  }, [state.userContext, generateRequestContext])

  // Submit feedback
  const submitFeedback = useCallback(async (
    feedbackData: Omit<FeedbackData, 'id' | 'status' | 'metadata'>
  ) => {
    if (!state.userContext) return

    try {
      const completeFeedbackData = {
        ...feedbackData,
        metadata: {
          context: state.userContext,
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          helpDeliveryMode: 'panel' as const
        }
      }

      const response = await contextualHelpAPI.submitFeedback(
        completeFeedbackData,
        generateRequestContext()
      )

      if (response.success) {
        dispatch({ type: 'INCREMENT_FEEDBACK_COUNT' })
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }, [state.userContext, generateRequestContext])

  // Adapt help content
  const adaptHelpContent = useCallback(async (contentId: string, newContext: HelpContext) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await contextualHelpAPI.adaptHelpContent(
        contentId,
        newContext,
        generateRequestContext()
      )

      if (response.success && response.data) {
        dispatch({ type: 'SET_HELP_CONTENT', payload: [response.data] })
        dispatch({ type: 'ADD_TO_HISTORY', payload: response.data })
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error?.message || 'Failed to adapt content' })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error occurred' })
    }
  }, [generateRequestContext])

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  // Reset help
  const resetHelp = useCallback(() => {
    dispatch({ type: 'RESET_STATE' })
  }, [])

  // Auto-initialize if initial context provided
  useEffect(() => {
    if (initialContext && !state.isInitialized) {
      const fullContext: HelpContext = {
        id: initialContext.id || `ctx_${Date.now()}`,
        userId: initialContext.userId || 'anonymous',
        workspaceId: initialContext.workspaceId || 'default',
        sessionId: initialContext.sessionId || `session_${Date.now()}`,
        currentRoute: initialContext.currentRoute || window.location.pathname,
        currentAction: initialContext.currentAction,
        toolContext: initialContext.toolContext,
        userState: {
          expertiseLevel: 'intermediate',
          recentActions: [],
          strugglingAreas: [],
          preferredHelpMode: 'tooltip',
          accessibility: {
            screenReader: false,
            reducedMotion: false,
            highContrast: false,
            fontSize: 'normal',
            voiceGuidance: false,
            keyboardNavigation: true
          },
          ...initialContext.userState
        },
        conversationContext: initialContext.conversationContext,
        timestamp: new Date(),
        metadata: initialContext.metadata || {}
      }

      initializeHelp(fullContext)
    }
  }, [initialContext, state.isInitialized, initializeHelp])

  const contextValue: ContextualHelpContextType = {
    state,
    initializeHelp,
    getContextualHelp,
    generateIntelligentHelp,
    startGuidance,
    nextGuidanceStep,
    previousGuidanceStep,
    endGuidance,
    searchHelp,
    submitFeedback,
    adaptHelpContent,
    clearError,
    resetHelp
  }

  return (
    <ContextualHelpContext.Provider value={contextValue}>
      {children}
    </ContextualHelpContext.Provider>
  )
}

// Hook for using contextual help
export function useContextualHelp(): ContextualHelpContextType {
  const context = useContext(ContextualHelpContext)
  if (!context) {
    throw new Error('useContextualHelp must be used within a ContextualHelpProvider')
  }
  return context
}

export default ContextualHelpProvider