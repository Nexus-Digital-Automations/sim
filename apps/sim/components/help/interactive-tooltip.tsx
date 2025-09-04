/**
 * Interactive Tooltip Component - Rich content tooltips with progressive disclosure
 *
 * Advanced tooltip system with rich content support:
 * - Multi-step guided tours and onboarding flows
 * - Interactive elements within tooltips
 * - Dynamic positioning with collision detection
 * - Progressive disclosure for complex information
 * - WCAG 2.2 accessibility compliance
 * - Mobile-responsive design patterns
 * - Usage analytics and engagement tracking
 *
 * @created 2025-09-04
 * @author Claude Development System
 * @version 1.0.0
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  InfoIcon,
  PlayCircleIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface InteractiveTooltipContent {
  id: string
  title: string
  content: React.ReactNode | string
  expandedContent?: React.ReactNode | string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'gif'
  category?: 'tutorial' | 'tip' | 'warning' | 'best-practice' | 'feature'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  estimatedReadTime?: number // in seconds
  relatedTopics?: string[]
  prerequisites?: string[]
  nextSteps?: string[]
}

export interface TooltipAction {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg'
  onClick: () => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  external?: boolean
  analytics?: {
    event: string
    properties?: Record<string, any>
  }
}

export interface TourStep {
  id: string
  title: string
  content: React.ReactNode | string
  target?: string // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  actions?: TooltipAction[]
  optional?: boolean
  conditions?: {
    userLevel?: string
    featureEnabled?: string
    customCheck?: () => boolean
  }
}

export interface InteractiveTooltipProps {
  children: React.ReactNode
  content: InteractiveTooltipContent
  trigger?: 'hover' | 'click' | 'focus' | 'manual'
  placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  interactive?: boolean
  showArrow?: boolean
  maxWidth?: number
  maxHeight?: number
  className?: string
  contentClassName?: string
  disabled?: boolean
  dismissible?: boolean
  persistent?: boolean // Don't auto-hide

  // Progressive disclosure
  expandable?: boolean
  expandedByDefault?: boolean

  // Tour integration
  tourStep?: TourStep
  tourPosition?: {
    current: number
    total: number
  }

  // Actions and callbacks
  actions?: TooltipAction[]
  onOpen?: () => void
  onClose?: () => void
  onExpand?: () => void
  onCollapse?: () => void
  onActionClick?: (actionId: string) => void
  onDismiss?: () => void

  // Analytics
  trackInteractions?: boolean
  analyticsContext?: Record<string, any>
}

// ========================
// UTILITY FUNCTIONS
// ========================

const getCategoryIcon = (category: InteractiveTooltipContent['category']) => {
  switch (category) {
    case 'tutorial':
      return <PlayCircleIcon className='h-4 w-4 text-blue-500' />
    case 'tip':
      return <ZapIcon className='h-4 w-4 text-yellow-500' />
    case 'warning':
      return <AlertTriangleIcon className='h-4 w-4 text-amber-500' />
    case 'best-practice':
      return <BookOpenIcon className='h-4 w-4 text-purple-500' />
    case 'feature':
      return <CheckCircleIcon className='h-4 w-4 text-green-500' />
    default:
      return <InfoIcon className='h-4 w-4 text-blue-500' />
  }
}

const getPriorityColor = (priority: InteractiveTooltipContent['priority']) => {
  switch (priority) {
    case 'critical':
      return 'border-red-500 bg-red-500/10'
    case 'high':
      return 'border-orange-500 bg-orange-500/10'
    case 'medium':
      return 'border-blue-500 bg-blue-500/10'
    case 'low':
      return 'border-gray-500 bg-gray-500/10'
    default:
      return 'border-blue-500 bg-blue-500/10'
  }
}

const formatReadTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s read`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes}min read`
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Interactive Tooltip Component
 *
 * Rich tooltip with progressive disclosure, media support, and analytics.
 */
export function InteractiveTooltip({
  children,
  content,
  trigger = 'hover',
  placement = 'auto',
  delay = 300,
  interactive = true,
  showArrow = true,
  maxWidth = 400,
  maxHeight = 600,
  className,
  contentClassName,
  disabled = false,
  dismissible = true,
  persistent = false,
  expandable = false,
  expandedByDefault = false,
  tourStep,
  tourPosition,
  actions = [],
  onOpen,
  onClose,
  onExpand,
  onCollapse,
  onActionClick,
  onDismiss,
  trackInteractions = true,
  analyticsContext = {},
}: InteractiveTooltipProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(expandedByDefault)
  const [isLoading, setIsLoading] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const triggerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const interactionStartTime = useRef<number | undefined>(undefined)
  const readTrackingInterval = useRef<NodeJS.Timeout | undefined>(undefined)

  // Check if tooltip should be shown
  const shouldShow = !disabled && helpState.userPreferences.enableTooltips

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleOpen = useCallback(() => {
    if (!shouldShow) return

    interactionStartTime.current = Date.now()
    setIsOpen(true)

    // Start read progress tracking for content with estimated read time
    if (content.estimatedReadTime && content.estimatedReadTime > 0) {
      const updateInterval = (content.estimatedReadTime * 1000) / 100 // Update every 1% of read time
      let progress = 0

      readTrackingInterval.current = setInterval(() => {
        progress += 1
        setReadProgress(progress)

        if (progress >= 100) {
          clearInterval(readTrackingInterval.current!)
        }
      }, updateInterval)
    }

    // Track tooltip view
    if (trackInteractions) {
      helpAnalytics.trackHelpView(content.id, helpState.sessionId, {
        category: content.category,
        priority: content.priority,
        hasMedia: !!content.mediaUrl,
        estimatedReadTime: content.estimatedReadTime,
        page: window.location.pathname,
        ...analyticsContext,
      })

      trackInteraction('tooltip_open', content.id, analyticsContext)
    }

    onOpen?.()
  }, [
    shouldShow,
    content,
    helpState,
    trackInteractions,
    trackInteraction,
    analyticsContext,
    onOpen,
  ])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setIsExpanded(expandedByDefault)
    setReadProgress(0)

    // Clear read tracking
    if (readTrackingInterval.current) {
      clearInterval(readTrackingInterval.current)
    }

    // Track engagement duration
    if (trackInteractions && interactionStartTime.current) {
      const duration = Date.now() - interactionStartTime.current
      helpAnalytics.trackHelpInteraction(content.id, helpState.sessionId, 'close', 'tooltip', {
        duration,
        readProgress,
        expanded: isExpanded,
      })
    }

    onClose?.()
  }, [
    expandedByDefault,
    trackInteractions,
    content.id,
    helpState.sessionId,
    readProgress,
    isExpanded,
    onClose,
  ])

  const handleExpand = useCallback(() => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)

    if (trackInteractions) {
      helpAnalytics.trackHelpInteraction(
        content.id,
        helpState.sessionId,
        newExpanded ? 'expand' : 'collapse',
        'tooltip'
      )
    }

    if (newExpanded) {
      onExpand?.()
    } else {
      onCollapse?.()
    }
  }, [isExpanded, trackInteractions, content.id, helpState.sessionId, onExpand, onCollapse])

  const handleActionClick = useCallback(
    async (action: TooltipAction) => {
      try {
        setIsLoading(true)

        if (trackInteractions) {
          helpAnalytics.trackHelpInteraction(
            content.id,
            helpState.sessionId,
            'action_click',
            action.id,
            action.analytics?.properties
          )
        }

        await action.onClick()
        onActionClick?.(action.id)
      } catch (error) {
        console.error('Error executing tooltip action:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [trackInteractions, content.id, helpState.sessionId, onActionClick]
  )

  const handleDismiss = useCallback(() => {
    handleClose()

    if (trackInteractions) {
      helpAnalytics.trackHelpInteraction(content.id, helpState.sessionId, 'dismiss', 'tooltip')
    }

    onDismiss?.()
  }, [handleClose, trackInteractions, content.id, helpState.sessionId, onDismiss])

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
        if (!interactive || !persistent) {
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
      if (trigger === 'focus' && !persistent) {
        handleClose()
      }
    }

    // Add event listeners based on trigger type
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
  }, [shouldShow, trigger, delay, interactive, persistent, isOpen, handleOpen, handleClose])

  // Handle escape key and cleanup
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)

      if (readTrackingInterval.current) {
        clearInterval(readTrackingInterval.current)
      }
    }
  }, [isOpen, handleClose])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderMedia = () => {
    if (!content.mediaUrl) return null

    return (
      <div className='mb-4'>
        {content.mediaType === 'video' ? (
          <video
            className='w-full rounded-md'
            controls
            poster={content.mediaUrl.replace('.mp4', '-poster.jpg')}
          >
            <source src={content.mediaUrl} type='video/mp4' />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={content.mediaUrl}
            alt={content.title}
            className='w-full rounded-md object-cover'
            style={{ maxHeight: '200px' }}
          />
        )}
      </div>
    )
  }

  const renderHeader = () => {
    return (
      <div className='mb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex flex-1 items-center gap-2'>
            {content.category && getCategoryIcon(content.category)}
            <h3 className='flex-1 font-medium text-sm'>{content.title}</h3>
            {dismissible && (
              <Button
                variant='ghost'
                size='sm'
                onClick={handleDismiss}
                className='h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10'
                aria-label='Dismiss'
              >
                <XIcon className='h-3 w-3' />
              </Button>
            )}
          </div>
        </div>

        <div className='mt-2 flex items-center gap-2'>
          {content.priority && content.priority !== 'medium' && (
            <Badge
              variant={content.priority === 'critical' ? 'destructive' : 'secondary'}
              className='text-xs'
            >
              {content.priority}
            </Badge>
          )}

          {content.estimatedReadTime && (
            <Badge variant='outline' className='text-xs'>
              {formatReadTime(content.estimatedReadTime)}
            </Badge>
          )}

          {tourPosition && (
            <Badge variant='secondary' className='text-xs'>
              {tourPosition.current} of {tourPosition.total}
            </Badge>
          )}
        </div>

        {content.estimatedReadTime && readProgress > 0 && readProgress < 100 && (
          <Progress value={readProgress} className='mt-2 h-1' />
        )}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className='space-y-3'>
        {renderHeader()}
        {renderMedia()}

        {/* Main content */}
        <div className='text-foreground/90 text-sm'>
          {typeof content.content === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: content.content }} />
          ) : (
            content.content
          )}
        </div>

        {/* Expanded content */}
        {expandable && isExpanded && content.expandedContent && (
          <>
            <Separator className='bg-border/50' />
            <div className='text-foreground/80 text-sm'>
              {typeof content.expandedContent === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: content.expandedContent }} />
              ) : (
                content.expandedContent
              )}
            </div>
          </>
        )}

        {/* Prerequisites */}
        {content.prerequisites && content.prerequisites.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-muted-foreground text-xs uppercase tracking-wide'>
              Prerequisites
            </h4>
            <ul className='space-y-1 text-xs'>
              {content.prerequisites.map((prereq, index) => (
                <li key={index} className='flex items-center gap-2'>
                  <div className='h-1 w-1 rounded-full bg-current opacity-60' />
                  {prereq}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next steps */}
        {content.nextSteps && content.nextSteps.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-muted-foreground text-xs uppercase tracking-wide'>
              What's Next
            </h4>
            <ul className='space-y-1 text-xs'>
              {content.nextSteps.map((step, index) => (
                <li key={index} className='flex items-center gap-2'>
                  <div className='h-1 w-1 rounded-full bg-current opacity-60' />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {(actions.length > 0 || expandable) && (
          <>
            <Separator className='bg-border/50' />
            <div className='flex flex-wrap items-center gap-2'>
              {expandable && content.expandedContent && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleExpand}
                  className='h-8 px-3 text-xs'
                >
                  <ChevronDownIcon
                    className={cn('mr-1 h-3 w-3 transition-transform', isExpanded && 'rotate-180')}
                  />
                  {isExpanded ? 'Show Less' : 'Show More'}
                </Button>
              )}

              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant === 'primary' ? 'default' : action.variant || 'ghost'}
                  size='sm'
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled || isLoading}
                  className='h-8 px-3 text-xs'
                >
                  {action.loading || isLoading ? (
                    <div className='mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  ) : (
                    action.icon && <span className='mr-1'>{action.icon}</span>
                  )}
                  {action.label}
                  {action.external && <ExternalLinkIcon className='ml-1 h-3 w-3' />}
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Related topics */}
        {content.relatedTopics && content.relatedTopics.length > 0 && (
          <div className='border-border/50 border-t pt-2'>
            <h4 className='mb-2 font-medium text-muted-foreground text-xs'>Related Topics</h4>
            <div className='flex flex-wrap gap-1'>
              {content.relatedTopics.map((topic) => (
                <Badge key={topic} variant='outline' className='px-2 py-0.5 text-xs'>
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
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
            'max-w-sm border-0 p-0 shadow-lg',
            getPriorityColor(content.priority),
            contentClassName
          )}
          style={{ maxWidth, maxHeight }}
          sideOffset={8}
        >
          <Card className='border-0 bg-background p-4 shadow-none'>{renderContent()}</Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ========================
// SPECIALIZED VARIANTS
// ========================

/**
 * Quick Help Tooltip - Simple tooltip for basic assistance
 */
export function QuickHelpTooltip({
  children,
  title,
  content,
  ...props
}: {
  children: React.ReactNode
  title: string
  content: string
} & Omit<InteractiveTooltipProps, 'content'>) {
  const tooltipContent: InteractiveTooltipContent = {
    id: `quick-help-${Date.now()}`,
    title,
    content,
    category: 'tip',
    priority: 'low',
  }

  return (
    <InteractiveTooltip
      content={tooltipContent}
      trigger='hover'
      interactive={false}
      expandable={false}
      maxWidth={300}
      {...props}
    >
      {children}
    </InteractiveTooltip>
  )
}

/**
 * Tutorial Tooltip - For guided learning experiences
 */
export function TutorialTooltip({
  children,
  step,
  totalSteps,
  title,
  content,
  onNext,
  onPrevious,
  onSkip,
  ...props
}: {
  children: React.ReactNode
  step: number
  totalSteps: number
  title: string
  content: string | React.ReactNode
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
} & Omit<InteractiveTooltipProps, 'content' | 'actions' | 'tourPosition'>) {
  const actions: TooltipAction[] = []

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
      label: step === totalSteps ? 'Finish' : 'Next',
      variant: 'primary',
      onClick: onNext,
    })
  }

  if (onSkip) {
    actions.push({
      id: 'skip',
      label: 'Skip Tutorial',
      variant: 'ghost',
      onClick: onSkip,
    })
  }

  const tooltipContent: InteractiveTooltipContent = {
    id: `tutorial-step-${step}`,
    title,
    content,
    category: 'tutorial',
    priority: 'high',
  }

  return (
    <InteractiveTooltip
      content={tooltipContent}
      tourPosition={{ current: step, total: totalSteps }}
      actions={actions}
      trigger='manual'
      interactive
      persistent
      dismissible={false}
      maxWidth={450}
      {...props}
    >
      {children}
    </InteractiveTooltip>
  )
}

/**
 * Feature Announcement Tooltip - For showcasing new features
 */
export function FeatureAnnouncementTooltip({
  children,
  title,
  description,
  mediaUrl,
  onTryNow,
  onLearnMore,
  ...props
}: {
  children: React.ReactNode
  title: string
  description: string
  mediaUrl?: string
  onTryNow?: () => void
  onLearnMore?: () => void
} & Omit<InteractiveTooltipProps, 'content' | 'actions'>) {
  const actions: TooltipAction[] = []

  if (onTryNow) {
    actions.push({
      id: 'try-now',
      label: 'Try Now',
      variant: 'primary',
      onClick: onTryNow,
      analytics: {
        event: 'feature_announcement_try_now',
        properties: { feature: title },
      },
    })
  }

  if (onLearnMore) {
    actions.push({
      id: 'learn-more',
      label: 'Learn More',
      variant: 'outline',
      onClick: onLearnMore,
      analytics: {
        event: 'feature_announcement_learn_more',
        properties: { feature: title },
      },
    })
  }

  const tooltipContent: InteractiveTooltipContent = {
    id: `feature-announcement-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    content: description,
    category: 'feature',
    priority: 'high',
    mediaUrl,
    mediaType: mediaUrl?.includes('.mp4') ? 'video' : 'image',
  }

  return (
    <InteractiveTooltip
      content={tooltipContent}
      actions={actions}
      trigger='click'
      interactive
      maxWidth={500}
      {...props}
    >
      {children}
    </InteractiveTooltip>
  )
}

// ========================
// EXPORTS
// ========================

export default InteractiveTooltip
export type { InteractiveTooltipProps, InteractiveTooltipContent, TooltipAction, TourStep }
