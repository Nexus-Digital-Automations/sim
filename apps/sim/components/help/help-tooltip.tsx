/**
 * Help Tooltip Component - Smart contextual tooltips with progressive disclosure
 *
 * Enhanced tooltip component specifically designed for help content:
 * - Progressive disclosure of information
 * - Accessibility-first design with WCAG compliance
 * - Smart positioning and responsive behavior
 * - Analytics tracking and user interaction monitoring
 * - Customizable triggers and interactive content
 * - Support for rich content including markdown and media
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  InfoIcon,
  PlayCircleIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpTooltipProps {
  children: React.ReactNode
  content?: string | React.ReactNode
  helpId?: string
  component?: string
  trigger?: 'hover' | 'click' | 'focus' | 'manual'
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  delay?: number
  interactive?: boolean
  showArrow?: boolean
  maxWidth?: number
  className?: string
  contentClassName?: string
  disabled?: boolean

  // Progressive disclosure
  expandable?: boolean
  expandedContent?: string | React.ReactNode

  // Help-specific props
  helpType?: 'tip' | 'warning' | 'info' | 'success' | 'tutorial' | 'best-practice'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  userLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'

  // Actions
  actions?: HelpTooltipAction[]
  onInteraction?: (type: string, data?: any) => void
  onDismiss?: () => void

  // Analytics
  trackInteractions?: boolean
  analyticsContext?: Record<string, any>
}

export interface HelpTooltipAction {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg'
  onClick: () => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  external?: boolean
}

// ========================
// ICON MAPPING
// ========================

const getHelpIcon = (type: HelpTooltipProps['helpType']) => {
  switch (type) {
    case 'warning':
      return <AlertTriangleIcon className='h-4 w-4 text-amber-500' />
    case 'success':
      return <CheckCircleIcon className='h-4 w-4 text-green-500' />
    case 'tutorial':
      return <PlayCircleIcon className='h-4 w-4 text-blue-500' />
    case 'best-practice':
      return <BookOpenIcon className='h-4 w-4 text-purple-500' />
    default:
      return <InfoIcon className='h-4 w-4 text-blue-500' />
  }
}

const getPriorityBadgeVariant = (priority: HelpTooltipProps['priority']) => {
  switch (priority) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'default'
    case 'medium':
      return 'secondary'
    default:
      return 'outline'
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Help Tooltip Component
 *
 * Smart contextual tooltip with progressive disclosure and accessibility features.
 */
export function HelpTooltip({
  children,
  content,
  helpId,
  component = 'unknown',
  trigger = 'hover',
  placement = 'auto',
  delay = 300,
  interactive = false,
  showArrow = true,
  maxWidth = 320,
  className,
  contentClassName,
  disabled = false,
  expandable = false,
  expandedContent,
  helpType = 'info',
  priority = 'medium',
  userLevel,
  actions = [],
  onInteraction,
  onDismiss,
  trackInteractions = true,
  analyticsContext = {},
}: HelpTooltipProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const interactionStartTime = useRef<number | undefined>(undefined)

  // Generate unique help ID if not provided
  const effectiveHelpId = helpId || `help-tooltip-${component}-${Date.now()}`

  // Check if help should be shown based on user preferences
  const shouldShow =
    !disabled &&
    helpState.userPreferences.enableTooltips &&
    !helpState.userPreferences.dismissedHelp.includes(effectiveHelpId)

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleOpen = useCallback(() => {
    if (!shouldShow) return

    interactionStartTime.current = Date.now()
    setIsOpen(true)

    // Track help view
    if (trackInteractions) {
      trackInteraction('hover', `help-tooltip-${effectiveHelpId}`, analyticsContext)
      helpAnalytics.trackHelpView(effectiveHelpId, helpState.sessionId, {
        component,
        page: window.location.pathname,
        userLevel: userLevel || helpState.userLevel,
      })
    }

    onInteraction?.('open')
  }, [
    shouldShow,
    effectiveHelpId,
    component,
    userLevel,
    helpState,
    trackInteractions,
    trackInteraction,
    analyticsContext,
    onInteraction,
  ])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setIsExpanded(false)

    // Track engagement duration
    if (trackInteractions && interactionStartTime.current) {
      const duration = Date.now() - interactionStartTime.current
      helpAnalytics.trackHelpInteraction(effectiveHelpId, helpState.sessionId, 'close', 'tooltip', {
        duration,
      })
    }

    onInteraction?.('close')
  }, [effectiveHelpId, helpState.sessionId, trackInteractions, onInteraction])

  const handleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)

    if (trackInteractions) {
      helpAnalytics.trackHelpInteraction(
        effectiveHelpId,
        helpState.sessionId,
        isExpanded ? 'collapse' : 'expand',
        'tooltip'
      )
    }

    onInteraction?.(isExpanded ? 'collapse' : 'expand')
  }, [isExpanded, effectiveHelpId, helpState.sessionId, trackInteractions, onInteraction])

  const handleActionClick = useCallback(
    async (action: HelpTooltipAction) => {
      try {
        if (trackInteractions) {
          helpAnalytics.trackHelpInteraction(
            effectiveHelpId,
            helpState.sessionId,
            'action_click',
            action.id
          )
        }

        await action.onClick()
        onInteraction?.('action', { actionId: action.id })
      } catch (error) {
        console.error('Error executing help tooltip action:', error)
      }
    },
    [effectiveHelpId, helpState.sessionId, trackInteractions, onInteraction]
  )

  const handleDismiss = useCallback(() => {
    handleClose()
    onDismiss?.()

    if (trackInteractions) {
      helpAnalytics.trackHelpInteraction(effectiveHelpId, helpState.sessionId, 'dismiss', 'tooltip')
    }
  }, [handleClose, onDismiss, effectiveHelpId, helpState.sessionId, trackInteractions])

  // ========================
  // EFFECTS
  // ========================

  // Handle trigger interactions
  useEffect(() => {
    if (!shouldShow || !triggerRef.current) return

    const triggerElement = triggerRef.current

    const handleMouseEnter = () => {
      if (trigger === 'hover') {
        timeoutRef.current = setTimeout(handleOpen, delay)
      }
    }

    const handleMouseLeave = () => {
      if (trigger === 'hover') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        if (!interactive) {
          handleClose()
        }
      }
    }

    const handleClick = () => {
      if (trigger === 'click') {
        if (isOpen) {
          handleClose()
        } else {
          handleOpen()
        }
      }
    }

    const handleFocus = () => {
      if (trigger === 'focus') {
        handleOpen()
      }
    }

    const handleBlur = () => {
      if (trigger === 'focus') {
        handleClose()
      }
    }

    if (trigger === 'hover') {
      triggerElement.addEventListener('mouseenter', handleMouseEnter)
      triggerElement.addEventListener('mouseleave', handleMouseLeave)
    }

    if (trigger === 'click') {
      triggerElement.addEventListener('click', handleClick)
    }

    if (trigger === 'focus') {
      triggerElement.addEventListener('focus', handleFocus)
      triggerElement.addEventListener('blur', handleBlur)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      triggerElement.removeEventListener('mouseenter', handleMouseEnter)
      triggerElement.removeEventListener('mouseleave', handleMouseLeave)
      triggerElement.removeEventListener('click', handleClick)
      triggerElement.removeEventListener('focus', handleFocus)
      triggerElement.removeEventListener('blur', handleBlur)
    }
  }, [shouldShow, trigger, delay, interactive, isOpen, handleOpen, handleClose])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderContent = () => {
    if (!content && !expandedContent) return null

    return (
      <div className='space-y-3'>
        {/* Header with icon and priority */}
        {(helpType !== 'info' || priority !== 'medium') && (
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {getHelpIcon(helpType)}
              {priority !== 'medium' && (
                <Badge variant={getPriorityBadgeVariant(priority)} size='sm'>
                  {priority}
                </Badge>
              )}
            </div>

            {onDismiss && (
              <Button
                variant='ghost'
                size='sm'
                onClick={handleDismiss}
                className='h-auto p-1 hover:bg-black/10 dark:hover:bg-white/10'
                aria-label='Dismiss help'
              >
                <XIcon className='h-3 w-3' />
              </Button>
            )}
          </div>
        )}

        {/* Main content */}
        <div className='text-sm'>
          {typeof content === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            content
          )}
        </div>

        {/* Expanded content */}
        {expandable && isExpanded && expandedContent && (
          <>
            <Separator className='bg-white/20 dark:bg-black/20' />
            <div className='text-sm'>
              {typeof expandedContent === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: expandedContent }} />
              ) : (
                expandedContent
              )}
            </div>
          </>
        )}

        {/* Actions */}
        {(actions.length > 0 || expandable) && (
          <>
            <Separator className='bg-white/20 dark:bg-black/20' />
            <div className='flex flex-wrap items-center gap-2'>
              {expandable && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleExpand}
                  className='h-auto px-2 py-1 text-xs hover:bg-white/10 dark:hover:bg-black/10'
                >
                  {isExpanded ? 'Show Less' : 'Learn More'}
                </Button>
              )}

              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'ghost'}
                  size='sm'
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled || action.loading}
                  className='h-auto px-2 py-1 text-xs hover:bg-white/10 dark:hover:bg-black/10'
                >
                  {action.loading ? (
                    <div className='h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  ) : (
                    <>
                      {action.icon && <span className='mr-1'>{action.icon}</span>}
                      {action.label}
                      {action.external && <ExternalLinkIcon className='ml-1 h-3 w-3' />}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (!shouldShow) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div ref={triggerRef} className={className}>
            {children}
          </div>
        </TooltipTrigger>

        <TooltipContent
          side={placement === 'auto' ? 'top' : placement}
          className={cn(
            'max-w-sm border-0 bg-black p-4 text-white shadow-lg dark:bg-white dark:text-black',
            interactive && 'cursor-auto',
            contentClassName
          )}
          style={{ maxWidth }}
          sideOffset={8}
        >
          {renderContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ========================
// SPECIALIZED VARIANTS
// ========================

/**
 * Quick Help Tooltip - Simple tooltip for basic help
 */
export function QuickHelpTooltip({
  children,
  text,
  ...props
}: {
  children: React.ReactNode
  text: string
} & Omit<HelpTooltipProps, 'content'>) {
  return (
    <HelpTooltip content={text} helpType='info' priority='low' trigger='hover' {...props}>
      {children}
    </HelpTooltip>
  )
}

/**
 * Warning Help Tooltip - For important warnings and cautions
 */
export function WarningHelpTooltip({
  children,
  message,
  ...props
}: {
  children: React.ReactNode
  message: string
} & Omit<HelpTooltipProps, 'content' | 'helpType'>) {
  return (
    <HelpTooltip content={message} helpType='warning' priority='high' interactive {...props}>
      {children}
    </HelpTooltip>
  )
}

/**
 * Tutorial Help Tooltip - For step-by-step guidance
 */
export function TutorialHelpTooltip({
  children,
  step,
  totalSteps,
  content,
  onNext,
  onPrevious,
  onSkip,
  ...props
}: {
  children: React.ReactNode
  step: number
  totalSteps: number
  content: string | React.ReactNode
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
} & Omit<HelpTooltipProps, 'content' | 'helpType' | 'actions'>) {
  const actions: HelpTooltipAction[] = []

  if (onPrevious && step > 1) {
    actions.push({
      id: 'previous',
      label: 'Previous',
      variant: 'outline',
      onClick: onPrevious,
    })
  }

  if (onNext && step < totalSteps) {
    actions.push({
      id: 'next',
      label: 'Next',
      variant: 'default',
      onClick: onNext,
    })
  }

  if (onSkip) {
    actions.push({
      id: 'skip',
      label: 'Skip Tour',
      variant: 'ghost',
      onClick: onSkip,
    })
  }

  const fullContent = (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <Badge variant='secondary' size='sm'>
          Step {step} of {totalSteps}
        </Badge>
      </div>
      <div>{content}</div>
    </div>
  )

  return (
    <HelpTooltip
      content={fullContent}
      helpType='tutorial'
      priority='high'
      interactive
      actions={actions}
      trigger='manual'
      {...props}
    >
      {children}
    </HelpTooltip>
  )
}

// ========================
// EXPORTS
// ========================

export default HelpTooltip
export type { HelpTooltipProps, HelpTooltipAction }
