/**
 * Help Context Provider - React context for help system state management
 *
 * Provides centralized state management for the help system including:
 * - Current help content and visibility
 * - User help preferences and settings
 * - Help interaction tracking and analytics
 * - Smart contextual help triggers
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import type * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logs/console/logger'
import { AIHelpEngine, type AIHelpRequest, type AIHelpResponse } from '../../lib/help/ai'
import { getConfigForEnvironment } from '../../lib/help/ai/config'
import {
  contextualHelpSystem,
  type HelpContent,
  type HelpContext,
  type UserInteraction,
} from './contextual-help'

const logger = createLogger('HelpContextProvider')

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpState {
  // Current help content
  activeHelp: Map<string, HelpContent>
  currentHelp: HelpContent | null
  helpQueue: HelpContent[]

  // UI state
  isHelpPanelOpen: boolean
  isSpotlightActive: boolean
  currentTourStep: number
  tourSteps: TourStep[]

  // User preferences
  userPreferences: HelpUserPreferences
  userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'

  // Analytics and tracking
  sessionId: string
  interactionHistory: UserInteraction[]
  analytics: HelpAnalytics

  // AI Help Engine state
  aiHelpEngine: AIHelpEngine | null
  aiEnabled: boolean
  chatSession: string | null
  smartSuggestions: Array<{
    id: string
    content: string
    confidence: number
    type: 'search' | 'chat' | 'proactive'
  }>

  // System state
  isInitialized: boolean
  isLoading: boolean
  error: string | null
}

export interface HelpUserPreferences {
  enableAutoHelp: boolean
  enableTooltips: boolean
  enableSpotlight: boolean
  preferredHelpStyle: 'minimal' | 'detailed' | 'interactive'
  dismissedHelp: string[]
  completedTours: string[]
  language: string
  accessibilityMode: boolean
  reducedMotion: boolean
  // AI Help preferences
  enableAIHelp: boolean
  enableSmartSuggestions: boolean
  enableProactiveHelp: boolean
  aiChatHistory: boolean
}

export interface TourStep {
  id: string
  title: string
  description: string
  target: string
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
  showSkip: boolean
  showPrevious: boolean
  actions?: TourStepAction[]
}

export interface TourStepAction {
  id: string
  label: string
  action: () => void | Promise<void>
  primary?: boolean
}

export interface HelpAnalytics {
  sessionStartTime: Date
  totalHelpViews: number
  totalInteractions: number
  helpEffectiveness: Map<string, number>
  commonStruggles: string[]
}

// ========================
// ACTION TYPES
// ========================

type HelpAction =
  | {
      type: 'INITIALIZE'
      payload: { userLevel: string; preferences: Partial<HelpUserPreferences> }
    }
  | { type: 'SHOW_HELP'; payload: { help: HelpContent; context: HelpContext } }
  | { type: 'HIDE_HELP'; payload: { helpId: string } }
  | { type: 'CLEAR_ALL_HELP' }
  | { type: 'OPEN_HELP_PANEL' }
  | { type: 'CLOSE_HELP_PANEL' }
  | { type: 'START_TOUR'; payload: { steps: TourStep[] } }
  | { type: 'NEXT_TOUR_STEP' }
  | { type: 'PREVIOUS_TOUR_STEP' }
  | { type: 'COMPLETE_TOUR' }
  | { type: 'SKIP_TOUR' }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<HelpUserPreferences> }
  | { type: 'TRACK_INTERACTION'; payload: UserInteraction }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_USER_LEVEL'; payload: 'beginner' | 'intermediate' | 'advanced' | 'expert' }
  | { type: 'INITIALIZE_AI_ENGINE'; payload: { engine: AIHelpEngine; enabled: boolean } }
  | { type: 'START_CHAT_SESSION'; payload: { sessionId: string } }
  | { type: 'ADD_SMART_SUGGESTION'; payload: { suggestion: any } }
  | { type: 'CLEAR_SMART_SUGGESTIONS' }
  | { type: 'SET_AI_ENABLED'; payload: boolean }

// ========================
// INITIAL STATE
// ========================

const initialState: HelpState = {
  activeHelp: new Map(),
  currentHelp: null,
  helpQueue: [],

  isHelpPanelOpen: false,
  isSpotlightActive: false,
  currentTourStep: 0,
  tourSteps: [],

  userPreferences: {
    enableAutoHelp: true,
    enableTooltips: true,
    enableSpotlight: true,
    preferredHelpStyle: 'detailed',
    dismissedHelp: [],
    completedTours: [],
    language: 'en',
    accessibilityMode: false,
    reducedMotion: false,
    // AI Help preferences
    enableAIHelp: true,
    enableSmartSuggestions: true,
    enableProactiveHelp: true,
    aiChatHistory: true,
  },
  userLevel: 'beginner',

  sessionId: nanoid(),
  interactionHistory: [],
  analytics: {
    sessionStartTime: new Date(),
    totalHelpViews: 0,
    totalInteractions: 0,
    helpEffectiveness: new Map(),
    commonStruggles: [],
  },

  // AI Help Engine state
  aiHelpEngine: null,
  aiEnabled: false,
  chatSession: null,
  smartSuggestions: [],

  isInitialized: false,
  isLoading: false,
  error: null,
}

// ========================
// REDUCER
// ========================

function helpReducer(state: HelpState, action: HelpAction): HelpState {
  const operationId = nanoid()

  switch (action.type) {
    case 'INITIALIZE': {
      logger.info(`[${operationId}] Initializing help system`, {
        userLevel: action.payload.userLevel,
        sessionId: state.sessionId,
      })

      return {
        ...state,
        userLevel: action.payload.userLevel as any,
        userPreferences: { ...state.userPreferences, ...action.payload.preferences },
        isInitialized: true,
        isLoading: false,
        error: null,
      }
    }

    case 'SHOW_HELP': {
      const { help, context } = action.payload
      const newActiveHelp = new Map(state.activeHelp)
      newActiveHelp.set(help.id, help)

      logger.info(`[${operationId}] Showing help content`, {
        helpId: help.id,
        helpTitle: help.title,
        component: context.component,
      })

      return {
        ...state,
        activeHelp: newActiveHelp,
        currentHelp: help,
        analytics: {
          ...state.analytics,
          totalHelpViews: state.analytics.totalHelpViews + 1,
        },
      }
    }

    case 'HIDE_HELP': {
      const { helpId } = action.payload
      const newActiveHelp = new Map(state.activeHelp)
      newActiveHelp.delete(helpId)

      const currentHelp = state.currentHelp?.id === helpId ? null : state.currentHelp

      logger.info(`[${operationId}] Hiding help content`, { helpId })

      return {
        ...state,
        activeHelp: newActiveHelp,
        currentHelp,
      }
    }

    case 'CLEAR_ALL_HELP': {
      logger.info(`[${operationId}] Clearing all help content`)

      return {
        ...state,
        activeHelp: new Map(),
        currentHelp: null,
        helpQueue: [],
      }
    }

    case 'OPEN_HELP_PANEL': {
      logger.info(`[${operationId}] Opening help panel`)

      return {
        ...state,
        isHelpPanelOpen: true,
      }
    }

    case 'CLOSE_HELP_PANEL': {
      logger.info(`[${operationId}] Closing help panel`)

      return {
        ...state,
        isHelpPanelOpen: false,
      }
    }

    case 'START_TOUR': {
      const { steps } = action.payload

      logger.info(`[${operationId}] Starting guided tour`, {
        stepsCount: steps.length,
        firstStep: steps[0]?.title,
      })

      return {
        ...state,
        isSpotlightActive: true,
        currentTourStep: 0,
        tourSteps: steps,
      }
    }

    case 'NEXT_TOUR_STEP': {
      const nextStep = Math.min(state.currentTourStep + 1, state.tourSteps.length - 1)

      logger.info(`[${operationId}] Moving to next tour step`, {
        currentStep: state.currentTourStep,
        nextStep,
        totalSteps: state.tourSteps.length,
      })

      return {
        ...state,
        currentTourStep: nextStep,
      }
    }

    case 'PREVIOUS_TOUR_STEP': {
      const prevStep = Math.max(state.currentTourStep - 1, 0)

      logger.info(`[${operationId}] Moving to previous tour step`, {
        currentStep: state.currentTourStep,
        prevStep,
      })

      return {
        ...state,
        currentTourStep: prevStep,
      }
    }

    case 'COMPLETE_TOUR': {
      const tourId = state.tourSteps[0]?.id || 'unknown'

      logger.info(`[${operationId}] Completing guided tour`, { tourId })

      return {
        ...state,
        isSpotlightActive: false,
        currentTourStep: 0,
        tourSteps: [],
        userPreferences: {
          ...state.userPreferences,
          completedTours: [...state.userPreferences.completedTours, tourId],
        },
      }
    }

    case 'SKIP_TOUR': {
      const tourId = state.tourSteps[0]?.id || 'unknown'

      logger.info(`[${operationId}] Skipping guided tour`, { tourId })

      return {
        ...state,
        isSpotlightActive: false,
        currentTourStep: 0,
        tourSteps: [],
      }
    }

    case 'UPDATE_PREFERENCES': {
      logger.info(`[${operationId}] Updating help preferences`, {
        updatedKeys: Object.keys(action.payload),
      })

      return {
        ...state,
        userPreferences: { ...state.userPreferences, ...action.payload },
      }
    }

    case 'TRACK_INTERACTION': {
      const interaction = action.payload

      return {
        ...state,
        interactionHistory: [...state.interactionHistory.slice(-49), interaction], // Keep last 50
        analytics: {
          ...state.analytics,
          totalInteractions: state.analytics.totalInteractions + 1,
        },
      }
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      }
    }

    case 'SET_ERROR': {
      if (action.payload) {
        logger.error(`[${operationId}] Help system error`, { error: action.payload })
      }

      return {
        ...state,
        error: action.payload,
        isLoading: false,
      }
    }

    case 'UPDATE_USER_LEVEL': {
      logger.info(`[${operationId}] Updating user level`, {
        oldLevel: state.userLevel,
        newLevel: action.payload,
      })

      return {
        ...state,
        userLevel: action.payload,
      }
    }

    case 'INITIALIZE_AI_ENGINE': {
      const { engine, enabled } = action.payload

      logger.info(`[${operationId}] Initializing AI Help Engine`, {
        enabled,
        engineAvailable: !!engine,
      })

      return {
        ...state,
        aiHelpEngine: engine,
        aiEnabled: enabled,
      }
    }

    case 'START_CHAT_SESSION': {
      const { sessionId } = action.payload

      logger.info(`[${operationId}] Starting AI chat session`, { sessionId })

      return {
        ...state,
        chatSession: sessionId,
      }
    }

    case 'ADD_SMART_SUGGESTION': {
      const { suggestion } = action.payload

      logger.info(`[${operationId}] Adding smart suggestion`, {
        suggestionType: suggestion.type,
        confidence: suggestion.confidence,
      })

      return {
        ...state,
        smartSuggestions: [...state.smartSuggestions, suggestion].slice(-5), // Keep last 5 suggestions
      }
    }

    case 'CLEAR_SMART_SUGGESTIONS': {
      logger.info(`[${operationId}] Clearing smart suggestions`)

      return {
        ...state,
        smartSuggestions: [],
      }
    }

    case 'SET_AI_ENABLED': {
      logger.info(`[${operationId}] Setting AI enabled`, { enabled: action.payload })

      return {
        ...state,
        aiEnabled: action.payload,
      }
    }

    default:
      return state
  }
}

// ========================
// CONTEXT DEFINITION
// ========================

interface HelpContextType {
  state: HelpState

  // Core help functions
  showHelp: (component: string, context?: Partial<HelpContext>) => Promise<void>
  hideHelp: (helpId: string) => void
  clearAllHelp: () => void

  // Panel management
  openHelpPanel: () => void
  closeHelpPanel: () => void
  toggleHelpPanel: () => void

  // Tour management
  startTour: (steps: TourStep[]) => void
  nextTourStep: () => void
  previousTourStep: () => void
  completeTour: () => void
  skipTour: () => void

  // User management
  updatePreferences: (preferences: Partial<HelpUserPreferences>) => void
  updateUserLevel: (level: 'beginner' | 'intermediate' | 'advanced' | 'expert') => void

  // Analytics
  trackInteraction: (type: UserInteraction['type'], target: string, context?: any) => void
  getAnalytics: () => HelpAnalytics

  // AI Help functions
  aiSearch: (query: string, context?: any) => Promise<AIHelpResponse>
  aiChat: (message: string, context?: any) => Promise<AIHelpResponse>
  getSmartSuggestions: (context?: any) => Promise<AIHelpResponse>
  startChatSession: () => string
  enableAI: (enabled: boolean) => void
  isAIEnabled: () => boolean

  // Utility functions
  isHelpDismissed: (helpId: string) => boolean
  isTourCompleted: (tourId: string) => boolean
}

const HelpReactContext = createContext<HelpContextType | null>(null)

// ========================
// PROVIDER COMPONENT
// ========================

interface HelpContextProviderProps {
  children: React.ReactNode
  initialUserLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  initialPreferences?: Partial<HelpUserPreferences>
}

export function HelpContextProvider({
  children,
  initialUserLevel = 'beginner',
  initialPreferences = {},
}: HelpContextProviderProps) {
  const [state, dispatch] = useReducer(helpReducer, initialState)

  // Initialize the help system
  useEffect(() => {
    const initializeSystem = async () => {
      const operationId = nanoid()

      try {
        logger.info(`[${operationId}] Initializing help context provider`)

        // Initialize traditional help system
        dispatch({
          type: 'INITIALIZE',
          payload: {
            userLevel: initialUserLevel,
            preferences: initialPreferences,
          },
        })

        // Initialize AI Help Engine if enabled
        const aiPrefs = { enableAIHelp: true, ...initialPreferences }
        if (aiPrefs.enableAIHelp) {
          try {
            const aiConfig = getConfigForEnvironment()
            const aiEngine = new AIHelpEngine(aiConfig, logger)

            dispatch({
              type: 'INITIALIZE_AI_ENGINE',
              payload: { engine: aiEngine, enabled: true },
            })

            logger.info(`[${operationId}] AI Help Engine initialized successfully`)
          } catch (aiError) {
            logger.warn(
              `[${operationId}] AI Help Engine initialization failed, continuing without AI features`,
              {
                error: aiError,
              }
            )
            dispatch({
              type: 'INITIALIZE_AI_ENGINE',
              payload: { engine: null, enabled: false },
            })
          }
        }

        logger.info(`[${operationId}] Help system initialized successfully`, {
          sessionId: state.sessionId,
          userLevel: initialUserLevel,
          aiEnabled: aiPrefs.enableAIHelp,
        })
      } catch (error) {
        logger.error(`[${operationId}] Failed to initialize help system`, { error })
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize help system' })
      }
    }

    initializeSystem()
  }, [initialUserLevel, initialPreferences, state.sessionId])

  // Core help functions
  const showHelp = useCallback(
    async (component: string, context?: Partial<HelpContext>) => {
      const operationId = nanoid()

      try {
        dispatch({ type: 'SET_LOADING', payload: true })

        const fullContext: HelpContext = {
          component,
          page: window.location.pathname,
          userLevel: state.userLevel,
          sessionTime: Date.now() - state.analytics.sessionStartTime.getTime(),
          ...context,
        }

        logger.info(`[${operationId}] Fetching contextual help`, { component, fullContext })

        const helpContent = await contextualHelpSystem.getContextualHelp(
          component,
          state.userLevel,
          fullContext
        )

        if (helpContent.length > 0) {
          const primaryHelp = helpContent[0]
          dispatch({
            type: 'SHOW_HELP',
            payload: { help: primaryHelp, context: fullContext },
          })
        }

        dispatch({ type: 'SET_LOADING', payload: false })
      } catch (error) {
        logger.error(`[${operationId}] Failed to show help`, { component, error })
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load help content' })
      }
    },
    [state.userLevel, state.analytics.sessionStartTime]
  )

  const hideHelp = useCallback((helpId: string) => {
    dispatch({ type: 'HIDE_HELP', payload: { helpId } })
    contextualHelpSystem.dismissHelp(helpId)
  }, [])

  const clearAllHelp = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_HELP' })
  }, [])

  // Panel management
  const openHelpPanel = useCallback(() => {
    dispatch({ type: 'OPEN_HELP_PANEL' })
  }, [])

  const closeHelpPanel = useCallback(() => {
    dispatch({ type: 'CLOSE_HELP_PANEL' })
  }, [])

  const toggleHelpPanel = useCallback(() => {
    if (state.isHelpPanelOpen) {
      closeHelpPanel()
    } else {
      openHelpPanel()
    }
  }, [state.isHelpPanelOpen, openHelpPanel, closeHelpPanel])

  // Tour management
  const startTour = useCallback((steps: TourStep[]) => {
    dispatch({ type: 'START_TOUR', payload: { steps } })
  }, [])

  const nextTourStep = useCallback(() => {
    dispatch({ type: 'NEXT_TOUR_STEP' })
  }, [])

  const previousTourStep = useCallback(() => {
    dispatch({ type: 'PREVIOUS_TOUR_STEP' })
  }, [])

  const completeTour = useCallback(() => {
    dispatch({ type: 'COMPLETE_TOUR' })
  }, [])

  const skipTour = useCallback(() => {
    dispatch({ type: 'SKIP_TOUR' })
  }, [])

  // User management
  const updatePreferences = useCallback((preferences: Partial<HelpUserPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences })
  }, [])

  const updateUserLevel = useCallback(
    (level: 'beginner' | 'intermediate' | 'advanced' | 'expert') => {
      dispatch({ type: 'UPDATE_USER_LEVEL', payload: level })
    },
    []
  )

  // Analytics
  const trackInteraction = useCallback(
    (type: UserInteraction['type'], target: string, context: any = {}) => {
      const interaction: UserInteraction = {
        timestamp: new Date(),
        type,
        target,
        context,
        successful: context.successful !== false,
      }

      dispatch({ type: 'TRACK_INTERACTION', payload: interaction })
    },
    []
  )

  const getAnalytics = useCallback(() => state.analytics, [state.analytics])

  // Utility functions
  const isHelpDismissed = useCallback(
    (helpId: string) => {
      return state.userPreferences.dismissedHelp.includes(helpId)
    },
    [state.userPreferences.dismissedHelp]
  )

  const isTourCompleted = useCallback(
    (tourId: string) => {
      return state.userPreferences.completedTours.includes(tourId)
    },
    [state.userPreferences.completedTours]
  )

  // AI Help functions
  const aiSearch = useCallback(
    async (query: string, context: any = {}): Promise<AIHelpResponse> => {
      const operationId = nanoid()

      if (!state.aiHelpEngine || !state.aiEnabled) {
        logger.warn(`[${operationId}] AI Help Engine not available`)
        throw new Error('AI Help Engine is not enabled or available')
      }

      try {
        logger.info(`[${operationId}] Processing AI search request`, { query, context })

        const request: AIHelpRequest = {
          type: 'search',
          userId: state.sessionId,
          query,
          context: {
            searchContext: {
              component: context.component || 'unknown',
              userRole: state.userLevel,
              page: window.location.pathname,
              ...context,
            },
          },
        }

        const response = await state.aiHelpEngine.processRequest(request)
        logger.info(`[${operationId}] AI search completed successfully`)
        return response
      } catch (error) {
        logger.error(`[${operationId}] AI search failed`, { error, query })
        throw error
      }
    },
    [state.aiHelpEngine, state.aiEnabled, state.sessionId, state.userLevel]
  )

  const aiChat = useCallback(
    async (message: string, context: any = {}): Promise<AIHelpResponse> => {
      const operationId = nanoid()

      if (!state.aiHelpEngine || !state.aiEnabled) {
        logger.warn(`[${operationId}] AI Help Engine not available`)
        throw new Error('AI Help Engine is not enabled or available')
      }

      try {
        logger.info(`[${operationId}] Processing AI chat message`, { message, context })

        let sessionId = state.chatSession
        if (!sessionId) {
          sessionId = nanoid()
          dispatch({ type: 'START_CHAT_SESSION', payload: { sessionId } })
        }

        const request: AIHelpRequest = {
          type: 'chat',
          userId: state.sessionId,
          sessionId,
          query: message,
          context: {
            conversationContext: {
              userId: state.sessionId,
              sessionId,
              userLevel: state.userLevel,
              component: context.component || 'unknown',
              page: window.location.pathname,
              interactionHistory: state.interactionHistory.slice(-10), // Last 10 interactions
              ...context,
            },
          },
        }

        const response = await state.aiHelpEngine.processRequest(request)
        logger.info(`[${operationId}] AI chat completed successfully`)
        return response
      } catch (error) {
        logger.error(`[${operationId}] AI chat failed`, { error, message })
        throw error
      }
    },
    [
      state.aiHelpEngine,
      state.aiEnabled,
      state.sessionId,
      state.chatSession,
      state.userLevel,
      state.interactionHistory,
    ]
  )

  const getSmartSuggestions = useCallback(
    async (context: any = {}): Promise<AIHelpResponse> => {
      const operationId = nanoid()

      if (!state.aiHelpEngine || !state.aiEnabled) {
        logger.warn(`[${operationId}] AI Help Engine not available`)
        throw new Error('AI Help Engine is not enabled or available')
      }

      try {
        logger.info(`[${operationId}] Getting smart suggestions`, { context })

        const request: AIHelpRequest = {
          type: 'proactive',
          userId: state.sessionId,
          context: {
            workflowContext: {
              userLevel: state.userLevel,
              component: context.component || 'unknown',
              page: window.location.pathname,
              sessionTime: Date.now() - state.analytics.sessionStartTime.getTime(),
              interactionHistory: state.interactionHistory.slice(-20), // Last 20 interactions
              strugglesDetected: state.analytics.commonStruggles,
              ...context,
            },
          },
        }

        const response = await state.aiHelpEngine.processRequest(request)
        logger.info(`[${operationId}] Smart suggestions retrieved successfully`)

        // Add suggestions to state
        if (response.suggestions && response.suggestions.length > 0) {
          response.suggestions.forEach((suggestion) => {
            dispatch({
              type: 'ADD_SMART_SUGGESTION',
              payload: {
                suggestion: {
                  id: nanoid(),
                  content: suggestion.content,
                  confidence: suggestion.confidence || 0.8,
                  type: 'proactive',
                },
              },
            })
          })
        }

        return response
      } catch (error) {
        logger.error(`[${operationId}] Smart suggestions failed`, { error, context })
        throw error
      }
    },
    [
      state.aiHelpEngine,
      state.aiEnabled,
      state.sessionId,
      state.userLevel,
      state.analytics,
      state.interactionHistory,
    ]
  )

  const startChatSession = useCallback(() => {
    const sessionId = nanoid()
    dispatch({ type: 'START_CHAT_SESSION', payload: { sessionId } })
    logger.info('Started new AI chat session', { sessionId })
    return sessionId
  }, [])

  const enableAI = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AI_ENABLED', payload: enabled })
    logger.info('AI Help Engine enabled state changed', { enabled })
  }, [])

  const isAIEnabled = useCallback(() => {
    return state.aiEnabled && !!state.aiHelpEngine
  }, [state.aiEnabled, state.aiHelpEngine])

  // Memoized context value
  const contextValue = useMemo<HelpContextType>(
    () => ({
      state,
      showHelp,
      hideHelp,
      clearAllHelp,
      openHelpPanel,
      closeHelpPanel,
      toggleHelpPanel,
      startTour,
      nextTourStep,
      previousTourStep,
      completeTour,
      skipTour,
      updatePreferences,
      updateUserLevel,
      trackInteraction,
      getAnalytics,
      // AI Help functions
      aiSearch,
      aiChat,
      getSmartSuggestions,
      startChatSession,
      enableAI,
      isAIEnabled,
      isHelpDismissed,
      isTourCompleted,
    }),
    [
      state,
      showHelp,
      hideHelp,
      clearAllHelp,
      openHelpPanel,
      closeHelpPanel,
      toggleHelpPanel,
      startTour,
      nextTourStep,
      previousTourStep,
      completeTour,
      skipTour,
      updatePreferences,
      updateUserLevel,
      trackInteraction,
      getAnalytics,
      // AI Help functions
      aiSearch,
      aiChat,
      getSmartSuggestions,
      startChatSession,
      enableAI,
      isAIEnabled,
      isHelpDismissed,
      isTourCompleted,
    ]
  )

  return <HelpReactContext.Provider value={contextValue}>{children}</HelpReactContext.Provider>
}

// ========================
// HOOK
// ========================

/**
 * Hook to access help context
 *
 * Provides access to help system state and actions.
 * Must be used within HelpContextProvider.
 *
 * @returns Help context value with state and actions
 * @throws Error if used outside of HelpContextProvider
 */
export function useHelp(): HelpContextType {
  const context = useContext(HelpReactContext)

  if (!context) {
    throw new Error('useHelp must be used within a HelpContextProvider')
  }

  return context
}

// ========================
// EXPORTS
// ========================

export default HelpContextProvider
export type { HelpState, HelpUserPreferences, TourStep, TourStepAction, HelpAnalytics }
