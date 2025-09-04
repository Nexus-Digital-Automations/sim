/**
 * Contextual Help Overlay Component - Smart contextual help display
 *
 * Advanced contextual help overlay that appears based on user location, actions,
 * and needs. Provides intelligent, non-intrusive assistance with:
 * - Smart positioning and collision detection
 * - Context-aware content delivery
 * - User behavior-based timing
 * - Accessibility compliance
 * - Performance optimized with React optimization patterns
 * - Comprehensive logging and analytics integration
 *
 * Key Features:
 * - Auto-positioning with viewport collision detection
 * - Contextual content based on component/page state
 * - Smart timing to avoid user workflow interruption
 * - Keyboard navigation and screen reader support
 * - Animation and transition effects
 * - User preference persistence
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  LightbulbIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { helpContentManager } from '@/lib/help/help-content-manager'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface ContextualOverlayProps {
  // Positioning
  targetRef?: React.RefObject<HTMLElement>
  position?: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  offset?: number

  // Content
  helpType?: 'tip' | 'tutorial' | 'warning' | 'feature' | 'troubleshooting'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  content?: ContextualContent

  // Behavior
  trigger?: 'hover' | 'focus' | 'manual' | 'automatic'
  delay?: number
  autoHide?: boolean
  autoHideDelay?: number
  dismissible?: boolean
  persistent?: boolean

  // Appearance
  variant?: 'default' | 'compact' | 'detailed' | 'minimal'
  showArrow?: boolean
  showActions?: boolean
  maxWidth?: number
  className?: string

  // Events
  onShow?: () => void
  onHide?: () => void
  onInteraction?: (action: string, data?: any) => void
  onDismiss?: (reason: string) => void

  // Advanced
  contextData?: Record<string, any>
  customContent?: React.ReactNode
  actionButtons?: ActionButton[]
}

export interface ContextualContent {
  title: string
  description?: string
  content: string | React.ReactNode
  category?: string
  tags?: string[]
  relatedActions?: string[]
  estimatedReadingTime?: number
  helpfulLinks?: HelpfulLink[]
  tips?: string[]
  warnings?: string[]
}

export interface ActionButton {
  id: string
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  icon?: React.ReactNode
  disabled?: boolean
  parameters?: Record<string, any>
}

export interface HelpfulLink {
  id: string
  title: string
  url: string
  type: 'internal' | 'external' | 'tutorial' | 'documentation'
  description?: string
}

interface OverlayState {
  isVisible: boolean
  position: Position
  content: ContextualContent | null
  isLoading: boolean
  error: string | null
  interactions: number
  showTime: number
}

interface Position {
  x: number
  y: number
  placement: 'top' | 'bottom' | 'left' | 'right'
  arrow: { x: number; y: number }
}

// ========================
// OVERLAY POSITIONING UTILITY
// ========================

class OverlayPositioner {
  /**
   * Calculate optimal position for overlay with collision detection
   * @param targetElement - Element to position relative to
   * @param overlayElement - Overlay element for size calculation
   * @param preferredPosition - Preferred position
   * @param offset - Distance from target element
   * @returns Position object with coordinates and placement
   */
  static calculatePosition(
    targetElement: HTMLElement,
    overlayElement: HTMLElement,
    preferredPosition = 'auto',
    offset = 8
  ): Position {
    const targetRect = targetElement.getBoundingClientRect()
    const overlayRect = overlayElement.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    // Calculate available space in each direction
    const spaceTop = targetRect.top
    const spaceBottom = viewport.height - targetRect.bottom
    const spaceLeft = targetRect.left
    const spaceRight = viewport.width - targetRect.right

    let placement: Position['placement'] = 'bottom'
    let x = 0
    let y = 0

    // Determine best placement
    if (preferredPosition === 'auto') {
      const placements = [
        { placement: 'bottom', space: spaceBottom, dimension: overlayRect.height },
        { placement: 'top', space: spaceTop, dimension: overlayRect.height },
        { placement: 'right', space: spaceRight, dimension: overlayRect.width },
        { placement: 'left', space: spaceLeft, dimension: overlayRect.width },
      ] as const

      const bestPlacement = placements
        .filter((p) => p.space >= p.dimension + offset)
        .sort((a, b) => b.space - a.space)[0]

      placement = bestPlacement?.placement || 'bottom'
    } else {
      placement = preferredPosition as Position['placement']
    }

    // Calculate coordinates based on placement
    switch (placement) {
      case 'top':
        x = targetRect.left + targetRect.width / 2 - overlayRect.width / 2
        y = targetRect.top - overlayRect.height - offset
        break
      case 'bottom':
        x = targetRect.left + targetRect.width / 2 - overlayRect.width / 2
        y = targetRect.bottom + offset
        break
      case 'left':
        x = targetRect.left - overlayRect.width - offset
        y = targetRect.top + targetRect.height / 2 - overlayRect.height / 2
        break
      case 'right':
        x = targetRect.right + offset
        y = targetRect.top + targetRect.height / 2 - overlayRect.height / 2
        break
    }

    // Constrain to viewport
    x = Math.max(8, Math.min(x, viewport.width - overlayRect.width - 8))
    y = Math.max(8, Math.min(y, viewport.height - overlayRect.height - 8))

    // Calculate arrow position
    const arrow = OverlayPositioner.calculateArrowPosition(targetRect, { x, y }, placement)

    return { x, y, placement, arrow }
  }

  private static calculateArrowPosition(
    targetRect: DOMRect,
    overlayPosition: { x: number; y: number },
    placement: Position['placement']
  ): { x: number; y: number } {
    const targetCenterX = targetRect.left + targetRect.width / 2
    const targetCenterY = targetRect.top + targetRect.height / 2

    switch (placement) {
      case 'top':
      case 'bottom':
        return {
          x: Math.max(12, Math.min(targetCenterX - overlayPosition.x, 200)),
          y: placement === 'top' ? -1 : -8,
        }
      case 'left':
      case 'right':
        return {
          x: placement === 'left' ? -1 : -8,
          y: Math.max(12, Math.min(targetCenterY - overlayPosition.y, 100)),
        }
      default:
        return { x: 0, y: 0 }
    }
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Contextual Help Overlay Component
 *
 * Intelligent overlay that provides contextual help based on user location and actions.
 */
export function ContextualOverlay({
  targetRef,
  position = 'auto',
  offset = 8,
  helpType = 'tip',
  priority = 'medium',
  content,
  trigger = 'automatic',
  delay = 1000,
  autoHide = false,
  autoHideDelay = 10000,
  dismissible = true,
  persistent = false,
  variant = 'default',
  showArrow = true,
  showActions = true,
  maxWidth = 320,
  className,
  onShow,
  onHide,
  onInteraction,
  onDismiss,
  contextData,
  customContent,
  actionButtons = [],
}: ContextualOverlayProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [overlayState, setOverlayState] = useState<OverlayState>({
    isVisible: false,
    position: { x: 0, y: 0, placement: 'bottom', arrow: { x: 0, y: 0 } },
    content: null,
    isLoading: false,
    error: null,
    interactions: 0,
    showTime: 0,
  })

  const overlayRef = useRef<HTMLDivElement>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const positionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // ========================
  // CONTENT LOADING
  // ========================

  const loadContextualContent = useCallback(async () => {
    if (content) {
      setOverlayState((prev) => ({ ...prev, content, isLoading: false }))
      return
    }

    if (!helpState.currentHelp?.context) {
      return
    }

    setOverlayState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const contextualContent = await helpContentManager.getContextualContent(
        helpState.currentHelp.context
      )

      if (contextualContent.length > 0) {
        const doc = contextualContent[0]
        const contextContent: ContextualContent = {
          title: doc.title,
          description: doc.metadata.description,
          content: typeof doc.content === 'string' ? doc.content : 'Interactive content',
          category: doc.metadata.category,
          tags: doc.tags,
          estimatedReadingTime: doc.metadata.estimatedReadingTime,
        }

        setOverlayState((prev) => ({ ...prev, content: contextContent, isLoading: false }))

        // Track content loading
        helpAnalytics.trackHelpInteraction(
          doc.id,
          helpState.sessionId,
          'contextual_load',
          'overlay'
        )
      } else {
        setOverlayState((prev) => ({
          ...prev,
          content: null,
          isLoading: false,
          error: 'No contextual content available',
        }))
      }
    } catch (error) {
      console.error('Failed to load contextual content:', error)
      setOverlayState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load content',
      }))
    }
  }, [content, helpState.currentHelp?.context, helpState.sessionId])

  // ========================
  // POSITIONING
  // ========================

  const updatePosition = useCallback(() => {
    if (!targetRef?.current || !overlayRef.current) {
      return
    }

    const newPosition = OverlayPositioner.calculatePosition(
      targetRef.current,
      overlayRef.current,
      position,
      offset
    )

    setOverlayState((prev) => ({ ...prev, position: newPosition }))
  }, [targetRef, position, offset])

  // ========================
  // SHOW/HIDE LOGIC
  // ========================

  const showOverlay = useCallback(async () => {
    if (overlayState.isVisible) return

    await loadContextualContent()

    setOverlayState((prev) => ({
      ...prev,
      isVisible: true,
      showTime: Date.now(),
      interactions: 0,
    }))

    // Update position after showing
    if (positionTimeoutRef.current) {
      clearTimeout(positionTimeoutRef.current)
    }
    positionTimeoutRef.current = setTimeout(updatePosition, 0)

    // Auto-hide timer
    if (autoHide && autoHideDelay > 0) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
      hideTimeoutRef.current = setTimeout(hideOverlay, autoHideDelay)
    }

    onShow?.()

    // Track overlay show
    trackInteraction('show', `contextual_overlay_${helpType}`, {
      priority,
      trigger,
      context: contextData,
    })
  }, [
    overlayState.isVisible,
    loadContextualContent,
    updatePosition,
    autoHide,
    autoHideDelay,
    onShow,
    trackInteraction,
    helpType,
    priority,
    trigger,
    contextData,
  ])

  const hideOverlay = useCallback(
    (reason = 'manual') => {
      if (!overlayState.isVisible) return

      setOverlayState((prev) => ({ ...prev, isVisible: false }))

      // Clear timers
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }

      onHide?.()
      onDismiss?.(reason)

      // Track overlay hide
      const showDuration = Date.now() - overlayState.showTime
      trackInteraction('hide', `contextual_overlay_${helpType}`, {
        reason,
        duration: showDuration,
        interactions: overlayState.interactions,
      })

      helpAnalytics.trackHelpInteraction(
        `contextual_overlay_${helpType}`,
        helpState.sessionId,
        'dismiss',
        'overlay',
        {
          reason,
          showDuration,
          interactions: overlayState.interactions,
        }
      )
    },
    [
      overlayState.isVisible,
      overlayState.showTime,
      overlayState.interactions,
      onHide,
      onDismiss,
      trackInteraction,
      helpType,
      helpState.sessionId,
    ]
  )

  // ========================
  // TRIGGER HANDLING
  // ========================

  useEffect(() => {
    if (!targetRef?.current) return

    const targetElement = targetRef.current

    const handleTrigger = () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }

      showTimeoutRef.current = setTimeout(showOverlay, delay)
    }

    const handleHide = () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
      if (!persistent) {
        hideOverlay('trigger_leave')
      }
    }

    switch (trigger) {
      case 'hover':
        targetElement.addEventListener('mouseenter', handleTrigger)
        targetElement.addEventListener('mouseleave', handleHide)
        break
      case 'focus':
        targetElement.addEventListener('focus', handleTrigger)
        targetElement.addEventListener('blur', handleHide)
        break
      case 'automatic': {
        // Show automatically based on context
        const autoShowDelay = priority === 'critical' ? 500 : delay
        showTimeoutRef.current = setTimeout(showOverlay, autoShowDelay)
        break
      }
    }

    return () => {
      targetElement.removeEventListener('mouseenter', handleTrigger)
      targetElement.removeEventListener('mouseleave', handleHide)
      targetElement.removeEventListener('focus', handleTrigger)
      targetElement.removeEventListener('blur', handleHide)

      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
    }
  }, [targetRef, trigger, delay, persistent, priority, showOverlay, hideOverlay])

  // ========================
  // KEYBOARD HANDLING
  // ========================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!overlayState.isVisible) return

      if (event.key === 'Escape' && dismissible) {
        hideOverlay('escape_key')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [overlayState.isVisible, dismissible, hideOverlay])

  // ========================
  // ACTION HANDLERS
  // ========================

  const handleAction = useCallback(
    (action: string, parameters?: any) => {
      setOverlayState((prev) => ({ ...prev, interactions: prev.interactions + 1 }))

      onInteraction?.(action, parameters)

      // Track action
      trackInteraction('action', `contextual_overlay_action_${action}`, parameters)

      // Handle built-in actions
      switch (action) {
        case 'dismiss':
          hideOverlay('action_dismiss')
          break
        case 'learn_more':
          // Navigate to detailed help
          if (parameters?.url) {
            window.open(parameters.url, '_blank')
          }
          break
        default:
          // Custom action
          break
      }
    },
    [onInteraction, trackInteraction, hideOverlay]
  )

  // ========================
  // RENDER HELPERS
  // ========================

  const renderIcon = () => {
    switch (helpType) {
      case 'tip':
        return <LightbulbIcon className='h-4 w-4' />
      case 'tutorial':
        return <BookOpenIcon className='h-4 w-4' />
      case 'warning':
        return <HelpCircleIcon className='h-4 w-4' />
      case 'feature':
        return <ZapIcon className='h-4 w-4' />
      default:
        return <HelpCircleIcon className='h-4 w-4' />
    }
  }

  const renderContent = () => {
    if (customContent) {
      return customContent
    }

    if (overlayState.isLoading) {
      return (
        <div className='flex items-center gap-2 p-4'>
          <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
          <span className='text-muted-foreground text-sm'>Loading help content...</span>
        </div>
      )
    }

    if (overlayState.error) {
      return (
        <div className='p-4 text-center'>
          <HelpCircleIcon className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
          <p className='text-muted-foreground text-sm'>Unable to load help content</p>
        </div>
      )
    }

    if (!overlayState.content) {
      return null
    }

    const { content: contentData } = overlayState

    return (
      <>
        <CardHeader className='pb-3'>
          <div className='flex items-start gap-3'>
            <div
              className={cn(
                'rounded-full p-2',
                helpType === 'warning' && 'bg-yellow-100 text-yellow-700',
                helpType === 'tip' && 'bg-blue-100 text-blue-700',
                helpType === 'tutorial' && 'bg-green-100 text-green-700',
                helpType === 'feature' && 'bg-purple-100 text-purple-700',
                helpType === 'troubleshooting' && 'bg-red-100 text-red-700'
              )}
            >
              {renderIcon()}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-start justify-between gap-2'>
                <h3 className='font-medium text-sm leading-tight'>{contentData.title}</h3>
                {dismissible && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleAction('dismiss')}
                    className='h-6 w-6 shrink-0 p-0'
                  >
                    <XIcon className='h-3 w-3' />
                  </Button>
                )}
              </div>
              {contentData.description && (
                <p className='mt-1 text-muted-foreground text-xs'>{contentData.description}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className='pt-0'>
          <div className='space-y-3'>
            {/* Main content */}
            <div className='text-sm'>
              {typeof contentData.content === 'string' ? (
                <p>{contentData.content}</p>
              ) : (
                contentData.content
              )}
            </div>

            {/* Tips */}
            {contentData.tips && contentData.tips.length > 0 && (
              <div className='space-y-2'>
                <Separator />
                <div className='space-y-1'>
                  <h4 className='font-medium text-muted-foreground text-xs uppercase tracking-wide'>
                    Tips
                  </h4>
                  {contentData.tips.map((tip, index) => (
                    <p key={index} className='text-muted-foreground text-xs'>
                      • {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {contentData.tags && contentData.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {contentData.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant='secondary' className='text-xs'>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            {showActions && (actionButtons.length > 0 || contentData.helpfulLinks) && (
              <>
                <Separator />
                <div className='space-y-2'>
                  {actionButtons.map((button) => (
                    <Button
                      key={button.id}
                      variant={button.variant || 'outline'}
                      size='sm'
                      onClick={() => handleAction(button.action, button.parameters)}
                      disabled={button.disabled}
                      className='h-7 w-full justify-start px-2 text-xs'
                    >
                      {button.icon && <span className='mr-2'>{button.icon}</span>}
                      {button.label}
                      <ChevronRightIcon className='ml-auto h-3 w-3' />
                    </Button>
                  ))}

                  {contentData.helpfulLinks?.slice(0, 2).map((link) => (
                    <Button
                      key={link.id}
                      variant='ghost'
                      size='sm'
                      onClick={() => handleAction('learn_more', { url: link.url })}
                      className='h-7 w-full justify-start px-2 text-muted-foreground text-xs'
                    >
                      {link.title}
                      <ChevronRightIcon className='ml-auto h-3 w-3' />
                    </Button>
                  ))}
                </div>
              </>
            )}

            {/* Reading time */}
            {contentData.estimatedReadingTime && contentData.estimatedReadingTime > 30 && (
              <p className='text-muted-foreground text-xs'>
                {Math.ceil(contentData.estimatedReadingTime / 60)} min read
              </p>
            )}
          </div>
        </CardContent>
      </>
    )
  }

  // ========================
  // ANIMATION VARIANTS
  // ========================

  const overlayVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: overlayState.position.placement === 'top' ? 10 : -10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: overlayState.position.placement === 'top' ? 10 : -10,
    },
  }

  // ========================
  // RENDER
  // ========================

  return (
    <AnimatePresence>
      {overlayState.isVisible && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-40 bg-black/5 md:hidden'
            onClick={() => handleAction('dismiss')}
          />

          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            variants={overlayVariants}
            initial='hidden'
            animate='visible'
            exit='exit'
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed z-50',
              variant === 'compact' && 'max-w-xs',
              variant === 'detailed' && 'max-w-md',
              variant === 'minimal' && 'max-w-xs',
              className
            )}
            style={{
              left: overlayState.position.x,
              top: overlayState.position.y,
              maxWidth: maxWidth,
            }}
            role='dialog'
            aria-label={`Contextual help: ${overlayState.content?.title || helpType}`}
            tabIndex={-1}
          >
            <Card className='border-2 shadow-lg'>
              {/* Arrow */}
              {showArrow && (
                <div
                  className={cn(
                    'absolute h-2 w-2 rotate-45 border bg-background',
                    overlayState.position.placement === 'top' &&
                      'bottom-[-5px] border-t-0 border-l-0',
                    overlayState.position.placement === 'bottom' &&
                      'top-[-5px] border-r-0 border-b-0',
                    overlayState.position.placement === 'left' &&
                      'right-[-5px] border-t-0 border-l-0',
                    overlayState.position.placement === 'right' &&
                      'left-[-5px] border-r-0 border-b-0'
                  )}
                  style={{
                    left:
                      overlayState.position.placement === 'top' ||
                      overlayState.position.placement === 'bottom'
                        ? overlayState.position.arrow.x
                        : undefined,
                    top:
                      overlayState.position.placement === 'left' ||
                      overlayState.position.placement === 'right'
                        ? overlayState.position.arrow.y
                        : undefined,
                  }}
                />
              )}

              {renderContent()}
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ========================
// EXPORTS
// ========================

export default ContextualOverlay
export type { ContextualOverlayProps, ContextualContent, ActionButton, HelpfulLink }
