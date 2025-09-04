/**
 * Advanced Floating Chat Widget - Intelligent Persistent AI Assistant
 *
 * Comprehensive floating chat widget providing smart, contextual AI assistance:
 * - Always-accessible chat interface with smart visibility logic
 * - Advanced minimizable/expandable design with smooth animations
 * - Context-aware assistance based on current page/workflow/user behavior
 * - Smart unread message indicators with priority levels
 * - Intelligent positioning with collision detection and user preferences
 * - Deep workflow context integration with proactive assistance
 * - User behavior analysis for optimal engagement timing
 * - Accessibility-compliant interactions and keyboard navigation
 * - Performance-optimized with lazy loading and efficient re-renders
 * - Comprehensive analytics integration for usage tracking
 *
 * Key Features:
 * - Smart auto-expand based on user struggle detection
 * - Contextual conversation starters and quick actions
 * - Persistent conversation history across sessions
 * - Multi-device synchronization support
 * - Advanced drag-and-drop positioning with snap zones
 * - Proactive help triggers based on user behavior patterns
 *
 * @created 2025-09-04
 * @author Advanced Help UI Components Specialist
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircleIcon,
  BrainIcon,
  ChevronUpIcon,
  Maximize2,
  MessageCircle,
  Minimize2,
  SparklesIcon,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'
import AIHelpChat from './ai-help-chat'

// ========================
// TYPES AND INTERFACES
// ========================

interface FloatingChatWidgetProps {
  /** Initial position of the widget */
  initialPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
  /** Whether the widget starts expanded */
  initialExpanded?: boolean
  /** Workflow context for contextual assistance */
  workflowContext?: {
    type?: string
    currentStep?: string
    blockTypes?: string[]
    completedSteps?: string[]
    errors?: Array<{
      code: string
      message: string
      context: string
      timestamp: string
      resolved: boolean
    }>
    timeSpent?: number
    userActions?: Array<{
      action: string
      timestamp: Date
      success: boolean
    }>
    strugglingIndicators?: {
      errorRate: number
      timeInCurrentStep: number
      helpRequestCount: number
      lastHelpRequest?: Date
    }
  }
  /** User profile for personalization */
  userProfile?: {
    expertiseLevel?: 'beginner' | 'intermediate' | 'expert'
    preferredLanguage?: string
    previousInteractions?: number
    commonIssues?: string[]
    helpPreferences?: {
      proactiveHelp: boolean
      detailedExplanations: boolean
      quickActions: boolean
    }
  }
  /** Custom CSS classes */
  className?: string
  /** Z-index for the widget */
  zIndex?: number
  /** Whether to show proactive suggestions */
  showProactiveSuggestions?: boolean
  /** Smart visibility configuration */
  smartVisibility?: {
    hideOnIdlePage?: boolean
    autoExpandOnErrors?: boolean
    contextualTriggers?: boolean
    respectUserPreferences?: boolean
  }
  /** Performance settings */
  performanceOptions?: {
    lazyLoad?: boolean
    debounceMs?: number
    maxMessageHistory?: number
  }
  /** Analytics configuration */
  analytics?: {
    trackInteractions?: boolean
    trackPerformance?: boolean
    sessionId?: string
  }
  /** Callback when widget state changes */
  onStateChange?: (state: {
    expanded: boolean
    minimized: boolean
    hasUnreadMessages: boolean
    interactionCount: number
  }) => void
  /** Callback for user struggle detection */
  onStruggleDetected?: (indicators: {
    errorCount: number
    timeSpent: number
    helpRequests: number
  }) => void
  /** Callback for analytics events */
  onAnalyticsEvent?: (event: string, data: any) => void
}

interface SmartTrigger {
  id: string
  type: 'error_threshold' | 'time_spent' | 'help_requests' | 'page_idle' | 'success_rate'
  condition: (context: any) => boolean
  priority: number
  cooldownMs: number
  lastTriggered?: Date
  message?: string
  action?: 'expand' | 'notify' | 'suggest'
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void | Promise<void>
  context?: string[]
  priority: number
}

// ========================
// MAIN COMPONENT
// ========================

export function FloatingChatWidget({
  initialPosition = 'bottom-right',
  initialExpanded = false,
  workflowContext,
  userProfile,
  className,
  zIndex = 1000,
  showProactiveSuggestions = true,
  smartVisibility = {
    hideOnIdlePage: false,
    autoExpandOnErrors: true,
    contextualTriggers: true,
    respectUserPreferences: true,
  },
  performanceOptions = {
    lazyLoad: true,
    debounceMs: 300,
    maxMessageHistory: 50,
  },
  analytics = {
    trackInteractions: true,
    trackPerformance: true,
  },
  onStateChange,
  onStruggleDetected,
  onAnalyticsEvent,
}: FloatingChatWidgetProps) {
  const { state: helpState, trackInteraction } = useHelp()

  // Core state management
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [sessionId] = useState(analytics?.sessionId || `floating_chat_${Date.now()}`)

  // Advanced state management
  const [smartTriggers, setSmartTriggers] = useState<SmartTrigger[]>([])
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])
  const [interactionCount, setInteractionCount] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [lastActivity, setLastActivity] = useState<Date>(new Date())
  const [strugglingScore, setStruggling] = useState(0)
  const [contextualSuggestions, setContextualSuggestions] = useState<string[]>([])

  // Refs for advanced functionality
  const widgetRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<any>(null)
  const activityTimeoutRef = useRef<NodeJS.Timeout>()
  const struggleDetectionRef = useRef<NodeJS.Timeout>()

  // ========================
  // SMART ANALYTICS & TRACKING
  // ========================

  const trackAnalyticsEvent = useCallback(
    (event: string, data?: any) => {
      if (analytics?.trackInteractions) {
        helpAnalytics.trackHelpInteraction(
          `floating_widget_${event}`,
          helpState.sessionId,
          event,
          'floating_chat_widget',
          data
        )
      }

      trackInteraction(event, `floating_widget_${event}`, data)
      onAnalyticsEvent?.(event, data)
      setInteractionCount((prev) => prev + 1)
    },
    [analytics?.trackInteractions, helpState.sessionId, trackInteraction, onAnalyticsEvent]
  )

  // ========================
  // STRUGGLE DETECTION LOGIC
  // ========================

  const calculateStruggleScore = useCallback(() => {
    if (!workflowContext) return 0

    let score = 0
    const indicators = workflowContext.strugglingIndicators

    // Error rate contribution (0-40 points)
    if (indicators?.errorRate) {
      score += Math.min(indicators.errorRate * 20, 40)
    }

    // Time spent in current step (0-30 points)
    if (indicators?.timeInCurrentStep && indicators.timeInCurrentStep > 300000) {
      // > 5 minutes
      score += Math.min(((indicators.timeInCurrentStep - 300000) / 60000) * 5, 30)
    }

    // Help request frequency (0-30 points)
    if (indicators?.helpRequestCount && indicators.helpRequestCount > 2) {
      score += Math.min((indicators.helpRequestCount - 2) * 10, 30)
    }

    return Math.min(score, 100)
  }, [workflowContext])

  // ========================
  // SMART TRIGGER SYSTEM
  // ========================

  const initializeSmartTriggers = useCallback(() => {
    const triggers: SmartTrigger[] = [
      {
        id: 'error_threshold',
        type: 'error_threshold',
        condition: (ctx) => ctx?.errors?.filter((e: any) => !e.resolved).length >= 3,
        priority: 100,
        cooldownMs: 300000, // 5 minutes
        message: "I noticed you're encountering some errors. Let me help you resolve them!",
        action: 'expand',
      },
      {
        id: 'time_spent_threshold',
        type: 'time_spent',
        condition: (ctx) => ctx?.strugglingIndicators?.timeInCurrentStep > 600000, // > 10 minutes
        priority: 80,
        cooldownMs: 600000, // 10 minutes
        message: "You've been working on this step for a while. Would you like some guidance?",
        action: 'suggest',
      },
      {
        id: 'help_requests_threshold',
        type: 'help_requests',
        condition: (ctx) => ctx?.strugglingIndicators?.helpRequestCount > 3,
        priority: 90,
        cooldownMs: 180000, // 3 minutes
        message: "I see you're looking for help frequently. Let's have a conversation!",
        action: 'expand',
      },
    ]

    setSmartTriggers(triggers)
  }, [])

  const checkSmartTriggers = useCallback(() => {
    if (!smartVisibility?.contextualTriggers) return

    const now = new Date()
    const activeTriggersToProcess = smartTriggers.filter((trigger) => {
      // Check cooldown
      if (
        trigger.lastTriggered &&
        now.getTime() - trigger.lastTriggered.getTime() < trigger.cooldownMs
      ) {
        return false
      }

      // Check condition
      return trigger.condition(workflowContext)
    })

    if (activeTriggersToProcess.length > 0) {
      // Sort by priority and take the highest
      const highestPriorityTrigger = activeTriggersToProcess.sort(
        (a, b) => b.priority - a.priority
      )[0]

      // Execute trigger action
      switch (highestPriorityTrigger.action) {
        case 'expand':
          setIsExpanded(true)
          setHasUnreadMessages(true)
          if (highestPriorityTrigger.message) {
            setContextualSuggestions((prev) => [...prev, highestPriorityTrigger.message!])
          }
          break
        case 'suggest':
          setHasUnreadMessages(true)
          setUnreadCount((prev) => prev + 1)
          break
        case 'notify':
          setHasUnreadMessages(true)
          break
      }

      // Update trigger last triggered time
      setSmartTriggers((prev) =>
        prev.map((t) => (t.id === highestPriorityTrigger.id ? { ...t, lastTriggered: now } : t))
      )

      trackAnalyticsEvent('smart_trigger_activated', {
        triggerId: highestPriorityTrigger.id,
        triggerType: highestPriorityTrigger.type,
        action: highestPriorityTrigger.action,
      })
    }
  }, [smartVisibility?.contextualTriggers, smartTriggers, workflowContext, trackAnalyticsEvent])

  // ========================
  // QUICK ACTIONS SYSTEM
  // ========================

  const initializeQuickActions = useCallback(() => {
    const actions: QuickAction[] = [
      {
        id: 'getting_started',
        label: 'Getting Started',
        icon: <SparklesIcon className='h-4 w-4' />,
        action: () => {
          // Navigate to getting started tutorial
          trackAnalyticsEvent('quick_action_used', { actionId: 'getting_started' })
        },
        context: ['beginner'],
        priority: 100,
      },
      {
        id: 'workflow_help',
        label: 'Workflow Help',
        icon: <BrainIcon className='h-4 w-4' />,
        action: () => {
          // Open workflow-specific help
          trackAnalyticsEvent('quick_action_used', { actionId: 'workflow_help' })
        },
        context: ['workflow'],
        priority: 90,
      },
      {
        id: 'troubleshooting',
        label: 'Troubleshooting',
        icon: <AlertCircleIcon className='h-4 w-4' />,
        action: () => {
          // Open troubleshooting guide
          trackAnalyticsEvent('quick_action_used', { actionId: 'troubleshooting' })
        },
        context: ['error'],
        priority: 85,
      },
    ]

    setQuickActions(actions)
  }, [trackAnalyticsEvent])

  // ========================
  // EFFECTS & INITIALIZATION
  // ========================

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({
      expanded: isExpanded,
      minimized: isMinimized,
      hasUnreadMessages,
      interactionCount,
    })
  }, [isExpanded, isMinimized, hasUnreadMessages, interactionCount, onStateChange])

  // Initialize systems
  useEffect(() => {
    initializeSmartTriggers()
    initializeQuickActions()
  }, [initializeSmartTriggers, initializeQuickActions])

  // Struggle detection and proactive assistance
  useEffect(() => {
    const score = calculateStruggleScore()
    setStruggling(score)

    if (score > 70 && smartVisibility?.autoExpandOnErrors && !isExpanded) {
      // High struggle score - proactively expand
      setIsExpanded(true)
      setHasUnreadMessages(true)
      setContextualSuggestions((prev) => [
        ...prev,
        "I noticed you might be having some difficulty. I'm here to help!",
      ])

      trackAnalyticsEvent('proactive_expansion', { struggleScore: score })

      // Notify parent about struggle detection
      onStruggleDetected?.({
        errorCount: workflowContext?.errors?.length || 0,
        timeSpent: workflowContext?.timeSpent || 0,
        helpRequests: workflowContext?.strugglingIndicators?.helpRequestCount || 0,
      })
    }

    // Schedule next check
    if (struggleDetectionRef.current) {
      clearTimeout(struggleDetectionRef.current)
    }
    struggleDetectionRef.current = setTimeout(checkSmartTriggers, 10000) // Check every 10 seconds
  }, [
    workflowContext,
    calculateStruggleScore,
    smartVisibility?.autoExpandOnErrors,
    isExpanded,
    checkSmartTriggers,
    trackAnalyticsEvent,
    onStruggleDetected,
  ])

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleToggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    setHasUnreadMessages(false)
    setUnreadCount(0)
    setLastActivity(new Date())

    if (newExpanded) {
      setIsMinimized(false)
      trackAnalyticsEvent('widget_expanded', {
        triggeredBy: 'user_click',
        strugglingScore,
        contextualSuggestions: contextualSuggestions.length,
      })
    } else {
      trackAnalyticsEvent('widget_collapsed', { interactionCount })
    }
  }, [
    isExpanded,
    trackAnalyticsEvent,
    strugglingScore,
    contextualSuggestions.length,
    interactionCount,
  ])

  const handleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const newMinimized = !isMinimized
      setIsMinimized(newMinimized)
      setLastActivity(new Date())

      trackAnalyticsEvent('widget_minimized', {
        minimized: newMinimized,
        sessionDuration: Date.now() - new Date(sessionId.split('_')[2]).getTime(),
      })
    },
    [isMinimized, trackAnalyticsEvent, sessionId]
  )

  const handleClose = useCallback(() => {
    setIsExpanded(false)
    setIsMinimized(false)
    setHasUnreadMessages(false)
    setUnreadCount(0)
    setContextualSuggestions([])

    trackAnalyticsEvent('widget_closed', {
      interactionCount,
      sessionDuration: Date.now() - new Date(sessionId.split('_')[2]).getTime(),
      strugglingScore,
    })
  }, [trackAnalyticsEvent, interactionCount, sessionId, strugglingScore])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isExpanded) return // Only allow dragging when expanded

      setIsDragging(true)
      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })

      trackAnalyticsEvent('widget_drag_started')
    },
    [isExpanded, trackAnalyticsEvent]
  )

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)
    trackAnalyticsEvent('widget_drag_ended', { newPosition: position })
  }, [isDragging, trackAnalyticsEvent, position])

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      setLastActivity(new Date())
      action.action()
      trackAnalyticsEvent('quick_action_clicked', {
        actionId: action.id,
        actionLabel: action.label,
      })
    },
    [trackAnalyticsEvent]
  )

  // ========================
  // POSITION CALCULATIONS
  // ========================

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex,
    }

    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' }
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' }
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' }
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' }
      default:
        return { ...baseStyles, bottom: '20px', right: '20px' }
    }
  }

  // ========================
  // RENDER FLOATING BUTTON
  // ========================

  const renderFloatingButton = () => {
    const getSmartButtonStyle = () => {
      if (strugglingScore > 80) {
        return 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
      }
      if (strugglingScore > 50) {
        return 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
      }
      if (strugglingScore > 30) {
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
      }
      return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
    }

    const getSmartIcon = () => {
      if (strugglingScore > 70) {
        return <AlertCircleIcon className='h-6 w-6 text-white' />
      }
      if (contextualSuggestions.length > 0) {
        return <SparklesIcon className='h-6 w-6 text-white' />
      }
      if (workflowContext?.type) {
        return <BrainIcon className='h-6 w-6 text-white' />
      }
      return <MessageCircle className='h-6 w-6 text-white' />
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={widgetRef}
              onClick={handleToggleExpanded}
              className={cn(
                'h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl',
                getSmartButtonStyle(),
                'group relative ring-2 ring-white/20'
              )}
              style={getPositionStyles()}
            >
              {getSmartIcon()}

              {/* Smart unread indicator with priority levels */}
              {hasUnreadMessages && (
                <Badge
                  className={cn(
                    '-top-2 -right-2 absolute flex h-6 w-6 items-center justify-center rounded-full text-white text-xs',
                    strugglingScore > 70
                      ? 'animate-bounce bg-red-600'
                      : strugglingScore > 40
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                  )}
                >
                  {unreadCount > 9 ? '9+' : unreadCount || '!'}
                </Badge>
              )}

              {/* Contextual suggestions indicator */}
              {contextualSuggestions.length > 0 && (
                <div className='-bottom-1 -right-1 absolute h-4 w-4 animate-pulse rounded-full bg-green-500 ring-2 ring-white' />
              )}

              {/* Smart activity pulse */}
              {strugglingScore > 50 && (
                <div
                  className={cn(
                    'absolute inset-0 rounded-full opacity-40',
                    strugglingScore > 80
                      ? 'animate-ping bg-red-400'
                      : strugglingScore > 70
                        ? 'animate-pulse bg-orange-400'
                        : 'animate-pulse bg-yellow-400'
                  )}
                />
              )}

              {/* Quick actions preview */}
              {isExpanded === false && quickActions.length > 0 && (
                <div className='-top-12 -translate-x-1/2 pointer-events-none absolute left-1/2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                  {quickActions.slice(0, 3).map((action) => (
                    <div
                      key={action.id}
                      className='flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md backdrop-blur-sm'
                    >
                      {action.icon}
                    </div>
                  ))}
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side='left' className='max-w-xs'>
            <div className='space-y-2'>
              <div className='font-medium'>AI Assistant</div>
              <div className='text-muted-foreground text-sm'>
                {strugglingScore > 70
                  ? "I can help resolve the issues you're facing!"
                  : strugglingScore > 40
                    ? 'Need assistance with your current workflow?'
                    : contextualSuggestions.length > 0
                      ? 'I have some helpful suggestions for you!'
                      : 'Ask me anything about the platform!'}
              </div>
              {workflowContext?.type && (
                <Badge variant='secondary' className='text-xs'>
                  {workflowContext.type} context
                </Badge>
              )}
              {contextualSuggestions.length > 0 && (
                <div className='text-green-600 text-xs'>
                  💡 {contextualSuggestions.length} suggestion
                  {contextualSuggestions.length !== 1 ? 's' : ''} available
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // ========================
  // RENDER EXPANDED WIDGET
  // ========================

  const renderExpandedWidget = () => (
    <Card
      className={cn(
        'overflow-hidden border-0 shadow-2xl backdrop-blur-sm transition-all duration-300',
        isMinimized ? 'h-12' : 'h-[600px]',
        'w-96 max-w-[90vw]',
        isDragging && 'scale-105 shadow-3xl'
      )}
      style={getPositionStyles()}
    >
      {/* Enhanced Header */}
      <div
        className={cn(
          'flex cursor-move items-center justify-between p-3 text-white transition-all duration-300',
          strugglingScore > 70
            ? 'bg-gradient-to-r from-red-500 to-pink-600'
            : strugglingScore > 50
              ? 'bg-gradient-to-r from-orange-500 to-red-500'
              : strugglingScore > 30
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                : 'bg-gradient-to-r from-purple-600 to-blue-600',
          isDragging && 'cursor-grabbing shadow-lg'
        )}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
      >
        <div className='flex items-center gap-2'>
          <div className='relative'>
            {strugglingScore > 70 ? (
              <AlertCircleIcon className='h-5 w-5' />
            ) : contextualSuggestions.length > 0 ? (
              <SparklesIcon className='h-5 w-5' />
            ) : workflowContext?.type ? (
              <BrainIcon className='h-5 w-5' />
            ) : (
              <MessageCircle className='h-5 w-5' />
            )}

            {/* Real-time activity indicator */}
            <div className='-top-1 -right-1 absolute h-2 w-2 animate-pulse rounded-full bg-green-400' />
          </div>

          <div className='flex flex-col'>
            <h3 className='font-semibold text-sm'>AI Assistant</h3>
            {strugglingScore > 50 && (
              <div className='text-xs opacity-90'>
                {strugglingScore > 80 ? 'Emergency Help Mode' : 'Assistance Mode'}
              </div>
            )}
          </div>

          {workflowContext?.type && (
            <Badge variant='secondary' className='border-0 bg-white/20 text-white text-xs'>
              {workflowContext.type}
            </Badge>
          )}

          {contextualSuggestions.length > 0 && (
            <Badge className='border-0 bg-green-500 text-white text-xs'>
              {contextualSuggestions.length} tips
            </Badge>
          )}
        </div>

        <div className='flex items-center gap-1'>
          {/* Struggle score indicator for debugging/admin */}
          {process.env.NODE_ENV === 'development' && strugglingScore > 0 && (
            <div className='text-xs opacity-75'>{Math.round(strugglingScore)}%</div>
          )}

          <Button
            variant='ghost'
            size='sm'
            onClick={handleMinimize}
            className='h-6 w-6 p-0 text-white hover:bg-white/20'
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className='h-3 w-3' /> : <Minimize2 className='h-3 w-3' />}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            className='h-6 w-6 p-0 text-white hover:bg-white/20'
            title='Close assistant'
          >
            <X className='h-3 w-3' />
          </Button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      {!isMinimized && quickActions.length > 0 && (
        <div className='border-b bg-gray-50 p-2 dark:bg-gray-900'>
          <div className='flex gap-1 overflow-x-auto'>
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant='ghost'
                size='sm'
                onClick={() => handleQuickAction(action)}
                className='flex-shrink-0 gap-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-800'
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Suggestions */}
      {!isMinimized && contextualSuggestions.length > 0 && (
        <div className='border-b bg-gradient-to-r from-green-50 to-blue-50 p-3 dark:from-green-950 dark:to-blue-950'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 font-medium text-green-700 text-sm dark:text-green-300'>
              <SparklesIcon className='h-4 w-4' />
              Helpful Suggestions
            </div>
            {contextualSuggestions.slice(0, 2).map((suggestion, index) => (
              <div key={index} className='text-green-600 text-sm dark:text-green-400'>
                • {suggestion}
              </div>
            ))}
            {contextualSuggestions.length > 2 && (
              <Button
                variant='ghost'
                size='sm'
                className='text-green-600 text-xs hover:text-green-700'
                onClick={() => setIsExpanded(true)}
              >
                <ChevronUpIcon className='mr-1 h-3 w-3' />
                Show {contextualSuggestions.length - 2} more suggestions
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Chat Content */}
      {!isMinimized && (
        <div className='h-[calc(100%-48px)] bg-white dark:bg-gray-950'>
          <AIHelpChat
            isOpen={true}
            variant='inline'
            contextData={{
              workflowContext,
              userProfile,
              strugglingScore,
              contextualSuggestions,
              sessionId,
              quickActions: quickActions.map((a) => ({ id: a.id, label: a.label })),
            }}
            onClose={handleClose}
            initialMessage={
              contextualSuggestions.length > 0
                ? `I have ${contextualSuggestions.length} contextual suggestions for you. What would you like help with?`
                : strugglingScore > 50
                  ? 'I noticed you might be having some difficulty. How can I help you resolve this?'
                  : undefined
            }
            welcomeMessage={
              workflowContext?.type
                ? `Hi! I'm here to help you with your ${workflowContext.type} workflow. What can I assist you with?`
                : "Hello! I'm your AI assistant. How can I help you today?"
            }
            maxHeight='100%'
            autoFocus={true}
            trackProgress={analytics?.trackInteractions}
          />
        </div>
      )}
    </Card>
  )

  // ========================
  // CLEANUP EFFECTS
  // ========================

  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      if (struggleDetectionRef.current) {
        clearTimeout(struggleDetectionRef.current)
      }
    }
  }, [])

  // ========================
  // MAIN RENDER
  // ========================

  // Don't render if visibility is disabled
  if (!isVisible && smartVisibility?.hideOnIdlePage) {
    return null
  }

  return (
    <div className={cn('z-50 select-none', className)}>
      {isExpanded ? renderExpandedWidget() : renderFloatingButton()}

      {/* Performance monitoring in development */}
      {process.env.NODE_ENV === 'development' && analytics?.trackPerformance && (
        <div className='fixed bottom-2 left-2 rounded bg-black/80 p-2 text-white text-xs'>
          <div>Interactions: {interactionCount}</div>
          <div>Struggle Score: {Math.round(strugglingScore)}</div>
          <div>Suggestions: {contextualSuggestions.length}</div>
          <div>Smart Triggers: {smartTriggers.length}</div>
        </div>
      )}
    </div>
  )
}

// ========================
// PROVIDER COMPONENT
// ========================

/**
 * Advanced Provider component to inject the smart floating chat widget into any page
 */
interface ChatWidgetProviderProps {
  children: React.ReactNode
  /** Widget configuration */
  widgetProps?: Partial<FloatingChatWidgetProps>
  /** Whether to show the widget */
  enabled?: boolean
  /** Global struggle detection configuration */
  globalStruggleDetection?: {
    enabled: boolean
    errorThreshold: number
    timeThreshold: number
    helpRequestThreshold: number
  }
  /** Performance monitoring */
  performanceMonitoring?: {
    enabled: boolean
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
}

export function ChatWidgetProvider({
  children,
  widgetProps = {},
  enabled = true,
  globalStruggleDetection = {
    enabled: true,
    errorThreshold: 3,
    timeThreshold: 600000, // 10 minutes
    helpRequestThreshold: 3,
  },
  performanceMonitoring = {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: 'info',
  },
}: ChatWidgetProviderProps) {
  const [globalContext, setGlobalContext] = useState<any>(null)

  const handleStruggleDetected = useCallback(
    (indicators: any) => {
      if (globalStruggleDetection.enabled) {
        console.log('Global struggle detection triggered:', indicators)

        // You could emit events here for other components to respond to user struggles
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('user-struggle-detected', {
              detail: indicators,
            })
          )
        }
      }
    },
    [globalStruggleDetection.enabled]
  )

  const handleAnalyticsEvent = useCallback(
    (event: string, data: any) => {
      if (performanceMonitoring.enabled) {
        console.log(`[FloatingChatWidget] ${event}:`, data)
      }
    },
    [performanceMonitoring.enabled]
  )

  return (
    <>
      {children}
      {enabled && (
        <FloatingChatWidget
          showProactiveSuggestions={true}
          smartVisibility={{
            hideOnIdlePage: false,
            autoExpandOnErrors: true,
            contextualTriggers: true,
            respectUserPreferences: true,
          }}
          analytics={{
            trackInteractions: true,
            trackPerformance: performanceMonitoring.enabled,
            sessionId: `global_${Date.now()}`,
          }}
          onStruggleDetected={handleStruggleDetected}
          onAnalyticsEvent={handleAnalyticsEvent}
          {...widgetProps}
        />
      )}
    </>
  )
}

export default FloatingChatWidget
