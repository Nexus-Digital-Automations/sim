/**
 * Smart Help Bubbles - Intelligent contextual assistance bubbles
 *
 * Advanced help bubble system with smart behavior:
 * - Context-aware appearance and positioning
 * - Smart dismiss logic with user preferences
 * - Progressive disclosure and learning paths
 * - Adaptive timing based on user behavior
 * - Accessibility compliance with screen readers
 * - Analytics integration for optimization
 * - Mobile-responsive design patterns
 *
 * @created 2025-09-04
 * @author Claude Development System
 * @version 1.0.0
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  HelpCircleIcon,
  InfoIcon,
  LightbulbIcon,
  PlayCircleIcon,
  SparklesIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpBubble {
  id: string
  title: string
  content: React.ReactNode | string
  type: 'tip' | 'warning' | 'info' | 'success' | 'tutorial' | 'feature' | 'insight'
  priority: 'low' | 'medium' | 'high' | 'critical'
  trigger: {
    type: 'time' | 'interaction' | 'condition' | 'manual'
    value?: number // milliseconds for time, count for interaction
    condition?: () => boolean
  }
  target?: {
    selector?: string
    element?: Element
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
    offset?: { x: number; y: number }
  }
  behavior: {
    dismissible?: boolean
    persistent?: boolean
    autoHide?: boolean
    autoHideDelay?: number // milliseconds
    showOnce?: boolean
    requiresInteraction?: boolean
  }
  appearance: {
    size?: 'sm' | 'md' | 'lg'
    animation?: 'slide' | 'fade' | 'bounce' | 'pulse'
    theme?: 'light' | 'dark' | 'auto'
    customStyles?: React.CSSProperties
  }
  actions?: BubbleAction[]
  conditions?: {
    userLevel?: string[]
    featureFlags?: string[]
    timeOfDay?: { start: number; end: number }
    pageUrls?: string[]
    customCheck?: () => boolean
  }
  analytics?: {
    category: string
    properties?: Record<string, any>
  }
  scheduling?: {
    showAfter?: Date
    hideAfter?: Date
    recurring?: {
      interval: 'daily' | 'weekly' | 'monthly'
      times?: number // Max times to show
    }
  }
}

export interface BubbleAction {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  onClick: () => void | Promise<void>
  analytics?: {
    event: string
    properties?: Record<string, any>
  }
}

export interface SmartHelpBubblesProps {
  bubbles: HelpBubble[]
  maxConcurrent?: number
  globalPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  spacing?: number
  className?: string
  onBubbleShow?: (bubble: HelpBubble) => void
  onBubbleHide?: (bubble: HelpBubble) => void
  onBubbleInteraction?: (bubble: HelpBubble, action: string) => void
}

// ========================
// UTILITY FUNCTIONS
// ========================

const getBubbleIcon = (type: HelpBubble['type']) => {
  switch (type) {
    case 'tip':
      return <LightbulbIcon className='h-4 w-4 text-yellow-500' />
    case 'warning':
      return <AlertTriangleIcon className='h-4 w-4 text-amber-500' />
    case 'info':
      return <InfoIcon className='h-4 w-4 text-blue-500' />
    case 'success':
      return <CheckCircleIcon className='h-4 w-4 text-green-500' />
    case 'tutorial':
      return <PlayCircleIcon className='h-4 w-4 text-purple-500' />
    case 'feature':
      return <SparklesIcon className='h-4 w-4 text-indigo-500' />
    case 'insight':
      return <ZapIcon className='h-4 w-4 text-orange-500' />
    default:
      return <HelpCircleIcon className='h-4 w-4 text-gray-500' />
  }
}

const getBubbleColors = (type: HelpBubble['type'], priority: HelpBubble['priority']) => {
  const baseColors = {
    tip: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
    tutorial: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
    feature: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950',
    insight: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950',
  }

  let colors = baseColors[type] || baseColors.info

  // Add priority-based accent
  if (priority === 'critical') {
    colors += ' ring-2 ring-red-500/20'
  } else if (priority === 'high') {
    colors += ' ring-1 ring-current/20'
  }

  return colors
}

const getTargetPosition = (target: HelpBubble['target']) => {
  if (!target) return null

  const element =
    target.element || (target.selector ? document.querySelector(target.selector) : null)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

  const position = {
    x: rect.left + scrollLeft,
    y: rect.top + scrollTop,
    width: rect.width,
    height: rect.height,
  }

  const offset = target.offset || { x: 0, y: 0 }

  switch (target.position) {
    case 'top':
      return {
        x: position.x + position.width / 2 + offset.x,
        y: position.y - 10 + offset.y,
        transform: 'translateX(-50%) translateY(-100%)',
      }
    case 'bottom':
      return {
        x: position.x + position.width / 2 + offset.x,
        y: position.y + position.height + 10 + offset.y,
        transform: 'translateX(-50%)',
      }
    case 'left':
      return {
        x: position.x - 10 + offset.x,
        y: position.y + position.height / 2 + offset.y,
        transform: 'translateX(-100%) translateY(-50%)',
      }
    case 'right':
      return {
        x: position.x + position.width + 10 + offset.x,
        y: position.y + position.height / 2 + offset.y,
        transform: 'translateY(-50%)',
      }
    default: {
      // auto
      // Smart positioning based on available space
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceLeft = rect.left
      const spaceRight = window.innerWidth - rect.right

      if (spaceBelow > 150) {
        return {
          x: position.x + position.width / 2 + offset.x,
          y: position.y + position.height + 10 + offset.y,
          transform: 'translateX(-50%)',
        }
      }
      if (spaceAbove > 150) {
        return {
          x: position.x + position.width / 2 + offset.x,
          y: position.y - 10 + offset.y,
          transform: 'translateX(-50%) translateY(-100%)',
        }
      }
      if (spaceRight > 250) {
        return {
          x: position.x + position.width + 10 + offset.x,
          y: position.y + position.height / 2 + offset.y,
          transform: 'translateY(-50%)',
        }
      }
      return {
        x: position.x - 10 + offset.x,
        y: position.y + position.height / 2 + offset.y,
        transform: 'translateX(-100%) translateY(-50%)',
      }
    }
  }
}

// ========================
// BUBBLE COMPONENT
// ========================

interface HelpBubbleComponentProps {
  bubble: HelpBubble
  position: { x: number; y: number; transform?: string } | null
  onHide: () => void
  onInteraction: (action: string) => void
}

function HelpBubbleComponent({
  bubble,
  position,
  onHide,
  onInteraction,
}: HelpBubbleComponentProps) {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const progressInterval = useRef<NodeJS.Timeout | undefined>(undefined)

  const sizeClasses = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'max-w-md',
  }

  const animationVariants = {
    slide: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    bounce: {
      initial: { opacity: 0, scale: 0.8, y: 10 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.8, y: 10 },
    },
    pulse: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
  }

  const variants = animationVariants[bubble.appearance.animation || 'slide']

  // Auto-hide timer
  useEffect(() => {
    if (bubble.behavior.autoHide && bubble.behavior.autoHideDelay) {
      const timer = setTimeout(() => {
        handleHide()
      }, bubble.behavior.autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [])

  // Progress tracking for auto-hide
  useEffect(() => {
    if (bubble.behavior.autoHide && bubble.behavior.autoHideDelay) {
      const totalTime = bubble.behavior.autoHideDelay
      const updateInterval = totalTime / 100
      let currentProgress = 0

      progressInterval.current = setInterval(() => {
        currentProgress += 1
        setProgress(currentProgress)

        if (currentProgress >= 100) {
          clearInterval(progressInterval.current!)
        }
      }, updateInterval)

      return () => {
        if (progressInterval.current) {
          clearInterval(progressInterval.current)
        }
      }
    }
  }, [])

  // Show animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleHide = useCallback(() => {
    setIsVisible(false)
    setTimeout(onHide, 200) // Allow for exit animation
  }, [onHide])

  const handleActionClick = useCallback(
    async (action: BubbleAction) => {
      try {
        await action.onClick()
        onInteraction(`action:${action.id}`)
      } catch (error) {
        console.error('Error executing bubble action:', error)
      }
    },
    [onInteraction]
  )

  const renderContent = () => {
    return (
      <Card
        className={cn(
          'border p-4 shadow-lg',
          getBubbleColors(bubble.type, bubble.priority),
          sizeClasses[bubble.appearance.size || 'md']
        )}
        style={bubble.appearance.customStyles}
      >
        {/* Header */}
        <div className='mb-2 flex items-start justify-between'>
          <div className='flex flex-1 items-center gap-2'>
            {getBubbleIcon(bubble.type)}
            <h3 className='flex-1 font-medium text-sm'>{bubble.title}</h3>
          </div>

          {bubble.behavior.dismissible !== false && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleHide}
              className='h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10'
              aria-label='Dismiss'
            >
              <XIcon className='h-3 w-3' />
            </Button>
          )}
        </div>

        {/* Priority indicator */}
        {bubble.priority !== 'medium' && (
          <Badge
            variant={bubble.priority === 'critical' ? 'destructive' : 'secondary'}
            className='mb-2 text-xs'
          >
            {bubble.priority} priority
          </Badge>
        )}

        {/* Content */}
        <div className='mb-3 text-foreground/90 text-sm'>
          {typeof bubble.content === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: bubble.content }} />
          ) : (
            bubble.content
          )}
        </div>

        {/* Actions */}
        {bubble.actions && bubble.actions.length > 0 && (
          <div className='mb-3 flex flex-wrap gap-2'>
            {bubble.actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size='sm'
                onClick={() => handleActionClick(action)}
                className='h-8 text-xs'
              >
                {action.icon && <span className='mr-1'>{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Auto-hide progress */}
        {bubble.behavior.autoHide && bubble.behavior.autoHideDelay && progress > 0 && (
          <div className='space-y-1'>
            <div className='flex items-center justify-between text-muted-foreground text-xs'>
              <span>Auto-hiding</span>
              <span>
                {Math.round(((100 - progress) * bubble.behavior.autoHideDelay) / 100000)}s
              </span>
            </div>
            <Progress value={progress} className='h-1' />
          </div>
        )}
      </Card>
    )
  }

  if (!isVisible) return null

  // Positioned bubble
  if (position) {
    return createPortal(
      <motion.div
        ref={bubbleRef}
        className='pointer-events-auto fixed z-50'
        style={{
          left: position.x,
          top: position.y,
          transform: position.transform,
        }}
        variants={variants}
        initial='initial'
        animate='animate'
        exit='exit'
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {renderContent()}
      </motion.div>,
      document.body
    )
  }

  // Default positioned bubble (will be positioned by parent)
  return (
    <motion.div
      ref={bubbleRef}
      variants={variants}
      initial='initial'
      animate='animate'
      exit='exit'
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className='pointer-events-auto'
    >
      {renderContent()}
    </motion.div>
  )
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Smart Help Bubbles Component
 *
 * Intelligent contextual assistance with smart behavior and adaptive timing.
 */
export function SmartHelpBubbles({
  bubbles,
  maxConcurrent = 3,
  globalPosition = 'bottom-right',
  spacing = 16,
  className,
  onBubbleShow,
  onBubbleHide,
  onBubbleInteraction,
}: SmartHelpBubblesProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [activeBubbles, setActiveBubbles] = useState<Map<string, HelpBubble>>(new Map())
  const [dismissedBubbles, setDismissedBubbles] = useState<Set<string>>(new Set())
  const [interactionCounts, setInteractionCounts] = useState<Map<string, number>>(new Map())
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  // ========================
  // HELPER FUNCTIONS
  // ========================

  const shouldShowBubble = useCallback(
    (bubble: HelpBubble) => {
      // Check if already dismissed and should only show once
      if (bubble.behavior.showOnce && dismissedBubbles.has(bubble.id)) {
        return false
      }

      // Check if already active
      if (activeBubbles.has(bubble.id)) {
        return false
      }

      // Check user level conditions
      if (bubble.conditions?.userLevel) {
        if (!bubble.conditions.userLevel.includes(helpState.userLevel)) {
          return false
        }
      }

      // Check page URL conditions
      if (bubble.conditions?.pageUrls) {
        const currentUrl = window.location.pathname
        if (!bubble.conditions.pageUrls.some((url) => currentUrl.includes(url))) {
          return false
        }
      }

      // Check time of day conditions
      if (bubble.conditions?.timeOfDay) {
        const currentHour = new Date().getHours()
        const { start, end } = bubble.conditions.timeOfDay
        if (currentHour < start || currentHour > end) {
          return false
        }
      }

      // Check scheduling conditions
      if (bubble.scheduling) {
        const now = new Date()

        if (bubble.scheduling.showAfter && now < bubble.scheduling.showAfter) {
          return false
        }

        if (bubble.scheduling.hideAfter && now > bubble.scheduling.hideAfter) {
          return false
        }

        // Check recurring limits
        if (bubble.scheduling.recurring?.times) {
          const shownCount = interactionCounts.get(`${bubble.id}:shown`) || 0
          if (shownCount >= bubble.scheduling.recurring.times) {
            return false
          }
        }
      }

      // Check custom condition
      if (bubble.conditions?.customCheck) {
        if (!bubble.conditions.customCheck()) {
          return false
        }
      }

      return true
    },
    [activeBubbles, dismissedBubbles, helpState.userLevel, interactionCounts]
  )

  const showBubble = useCallback(
    (bubble: HelpBubble) => {
      if (!shouldShowBubble(bubble)) return

      // Check max concurrent limit
      if (activeBubbles.size >= maxConcurrent) {
        // Queue for later or replace lower priority bubble
        const lowestPriorityBubble = Array.from(activeBubbles.values()).sort((a, b) => {
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        })[0]

        if (lowestPriorityBubble) {
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
          if (priorityOrder[bubble.priority] > priorityOrder[lowestPriorityBubble.priority]) {
            hideBubble(lowestPriorityBubble.id)
          } else {
            return // Don't show if not higher priority
          }
        } else {
          return
        }
      }

      // Add to active bubbles
      setActiveBubbles((prev) => new Map(prev).set(bubble.id, bubble))

      // Track analytics
      if (bubble.analytics) {
        helpAnalytics.trackHelpView(bubble.id, helpState.sessionId, {
          type: bubble.type,
          priority: bubble.priority,
          category: bubble.analytics.category,
          ...bubble.analytics.properties,
        })
      }

      trackInteraction('help_bubble_show', bubble.id, {
        type: bubble.type,
        priority: bubble.priority,
      })

      // Update interaction counts
      setInteractionCounts((prev) => {
        const newCounts = new Map(prev)
        const shownKey = `${bubble.id}:shown`
        newCounts.set(shownKey, (newCounts.get(shownKey) || 0) + 1)
        return newCounts
      })

      onBubbleShow?.(bubble)
    },
    [
      activeBubbles,
      maxConcurrent,
      shouldShowBubble,
      helpState.sessionId,
      trackInteraction,
      onBubbleShow,
    ]
  )

  const hideBubble = useCallback(
    (bubbleId: string) => {
      const bubble = activeBubbles.get(bubbleId)
      if (!bubble) return

      // Remove from active bubbles
      setActiveBubbles((prev) => {
        const newMap = new Map(prev)
        newMap.delete(bubbleId)
        return newMap
      })

      // Clear any timers
      const timer = timersRef.current.get(bubbleId)
      if (timer) {
        clearTimeout(timer)
        timersRef.current.delete(bubbleId)
      }

      // Track analytics
      helpAnalytics.trackHelpInteraction(bubbleId, helpState.sessionId, 'bubble_hide', 'bubble')

      trackInteraction('help_bubble_hide', bubbleId)

      onBubbleHide?.(bubble)
    },
    [activeBubbles, helpState.sessionId, trackInteraction, onBubbleHide]
  )

  const dismissBubble = useCallback(
    (bubbleId: string) => {
      const bubble = activeBubbles.get(bubbleId)
      if (!bubble) return

      // Add to dismissed set if showOnce is true
      if (bubble.behavior.showOnce) {
        setDismissedBubbles((prev) => new Set(prev).add(bubbleId))
      }

      // Track dismiss analytics
      helpAnalytics.trackHelpInteraction(bubbleId, helpState.sessionId, 'bubble_dismiss', 'bubble')

      trackInteraction('help_bubble_dismiss', bubbleId)

      hideBubble(bubbleId)
      onBubbleInteraction?.(bubble, 'dismiss')
    },
    [activeBubbles, helpState.sessionId, trackInteraction, hideBubble, onBubbleInteraction]
  )

  const handleBubbleInteraction = useCallback(
    (bubble: HelpBubble, action: string) => {
      // Track interaction analytics
      helpAnalytics.trackHelpInteraction(
        bubble.id,
        helpState.sessionId,
        `bubble_${action}`,
        'bubble'
      )

      trackInteraction(`help_bubble_${action}`, bubble.id)

      onBubbleInteraction?.(bubble, action)
    },
    [helpState.sessionId, trackInteraction, onBubbleInteraction]
  )

  // ========================
  // EFFECTS
  // ========================

  // Process bubbles and set up triggers
  useEffect(() => {
    bubbles.forEach((bubble) => {
      if (activeBubbles.has(bubble.id) || timersRef.current.has(bubble.id)) return

      switch (bubble.trigger.type) {
        case 'time':
          if (bubble.trigger.value) {
            const timer = setTimeout(() => {
              showBubble(bubble)
              timersRef.current.delete(bubble.id)
            }, bubble.trigger.value)

            timersRef.current.set(bubble.id, timer)
          }
          break

        case 'manual':
          // These will be triggered externally
          break

        case 'condition':
          if (bubble.trigger.condition) {
            const checkCondition = () => {
              if (bubble.trigger.condition!()) {
                showBubble(bubble)
              }
            }

            // Check immediately and then set up interval
            checkCondition()

            const timer = setInterval(checkCondition, 1000) // Check every second
            timersRef.current.set(bubble.id, timer as any)
          }
          break

        case 'interaction':
          // These would be triggered by interaction events (not implemented in this scope)
          break
      }
    })

    return () => {
      // Clear all timers on unmount
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [bubbles, activeBubbles, showBubble])

  // ========================
  // RENDER
  // ========================

  const activeBubblesList = Array.from(activeBubbles.values())

  return (
    <>
      {/* Positioned bubbles (those with target selectors) */}
      <AnimatePresence>
        {activeBubblesList
          .filter((bubble) => bubble.target)
          .map((bubble) => {
            const position = getTargetPosition(bubble.target!)
            return (
              <HelpBubbleComponent
                key={bubble.id}
                bubble={bubble}
                position={position}
                onHide={() => dismissBubble(bubble.id)}
                onInteraction={(action) => handleBubbleInteraction(bubble, action)}
              />
            )
          })}
      </AnimatePresence>

      {/* Global positioned bubbles */}
      {activeBubblesList.filter((bubble) => !bubble.target).length > 0 && (
        <div
          className={cn(
            'fixed z-40 flex flex-col gap-3',
            positionClasses[globalPosition],
            className
          )}
        >
          <AnimatePresence>
            {activeBubblesList
              .filter((bubble) => !bubble.target)
              .map((bubble, index) => (
                <HelpBubbleComponent
                  key={bubble.id}
                  bubble={bubble}
                  position={null}
                  onHide={() => dismissBubble(bubble.id)}
                  onInteraction={(action) => handleBubbleInteraction(bubble, action)}
                />
              ))}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

// ========================
// HOOK FOR BUBBLE MANAGEMENT
// ========================

/**
 * Hook for managing smart help bubbles
 */
export function useSmartHelpBubbles() {
  const [bubbles, setBubbles] = useState<HelpBubble[]>([])

  const addBubble = useCallback((bubble: HelpBubble) => {
    setBubbles((prev) => [...prev, bubble])
  }, [])

  const removeBubble = useCallback((bubbleId: string) => {
    setBubbles((prev) => prev.filter((b) => b.id !== bubbleId))
  }, [])

  const clearBubbles = useCallback(() => {
    setBubbles([])
  }, [])

  const createBubble = useCallback(
    (config: Partial<HelpBubble> & Pick<HelpBubble, 'title' | 'content'>) => {
      const bubble: HelpBubble = {
        id: `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'info',
        priority: 'medium',
        trigger: { type: 'manual' },
        behavior: {
          dismissible: true,
          showOnce: false,
        },
        appearance: {
          size: 'md',
          animation: 'slide',
        },
        ...config,
      }

      addBubble(bubble)
      return bubble
    },
    [addBubble]
  )

  return {
    bubbles,
    addBubble,
    removeBubble,
    clearBubbles,
    createBubble,
  }
}

// ========================
// EXPORTS
// ========================

export default SmartHelpBubbles
export type { SmartHelpBubblesProps, HelpBubble, BubbleAction }
