/**
 * Contextual Help React Components
 *
 * React components for rendering contextual help in various modes:
 * tooltips, modals, sidebars, inline help, and more with full accessibility support.
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, HelpCircle, Volume2, VolumeX, X } from 'lucide-react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type {
  FeedbackData,
  GuidanceStep,
  GuidanceTutorial,
  HelpContent,
  HelpDeliveryConfig,
} from '@/services/contextual-help/types'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Progress } from './progress'
import { Separator } from './separator'

// Main Help Container Component
interface ContextualHelpProps {
  content: HelpContent
  config: HelpDeliveryConfig
  onInteraction?: (type: string, data?: any) => void
  onDismiss?: () => void
  onFeedback?: (feedback: Omit<FeedbackData, 'id' | 'metadata' | 'status'>) => void
  className?: string
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  content,
  config,
  onInteraction,
  onDismiss,
  onFeedback,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const helpRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (onInteraction) {
      onInteraction('view', { contentId: content.id, mode: config.mode })
    }
  }, [content.id, config.mode, onInteraction])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }, [onDismiss])

  const handleInteraction = useCallback(
    (type: string, data?: any) => {
      if (onInteraction) {
        onInteraction(type, data)
      }
    },
    [onInteraction]
  )

  if (!isVisible) return null

  // Render based on delivery mode
  switch (config.mode) {
    case 'tooltip':
      return (
        <HelpTooltip
          content={content}
          config={config}
          onInteraction={handleInteraction}
          onDismiss={handleDismiss}
          className={className}
        />
      )

    case 'modal':
      return (
        <HelpModal
          content={content}
          config={config}
          onInteraction={handleInteraction}
          onDismiss={handleDismiss}
          onFeedback={onFeedback}
          className={className}
        />
      )

    case 'sidebar':
      return (
        <HelpSidebar
          content={content}
          config={config}
          onInteraction={handleInteraction}
          onDismiss={handleDismiss}
          onFeedback={onFeedback}
          className={className}
        />
      )

    case 'inline':
      return (
        <HelpInline
          content={content}
          config={config}
          onInteraction={handleInteraction}
          onDismiss={handleDismiss}
          className={className}
        />
      )

    case 'overlay':
      return (
        <HelpOverlay
          content={content}
          config={config}
          onInteraction={handleInteraction}
          onDismiss={handleDismiss}
          className={className}
        />
      )

    default:
      return (
        <HelpModal
          content={content}
          config={config}
          onInteraction={handleInteraction}
          onDismiss={handleDismiss}
          onFeedback={onFeedback}
          className={className}
        />
      )
  }
}

// Help Tooltip Component
const HelpTooltip: React.FC<ContextualHelpProps> = ({
  content,
  config,
  onInteraction,
  onDismiss,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-close tooltip after timeout
    if (config.behavior?.autoClose) {
      const timer = setTimeout(() => {
        setIsOpen(false)
        onDismiss?.()
      }, config.behavior.autoClose)

      return () => clearTimeout(timer)
    }
  }, [config.behavior?.autoClose, onDismiss])

  useEffect(() => {
    // Handle clicks outside tooltip
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        if (config.behavior?.dismissible !== false) {
          setIsOpen(false)
          onDismiss?.()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, config.behavior?.dismissible, onDismiss])

  if (!isOpen) return null

  const tooltipContent =
    typeof content.content === 'string'
      ? content.content
      : Array.isArray(content.content)
        ? content.content.map((block) => block.content).join(' ')
        : ''

  return createPortal(
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-50 max-w-xs rounded-md border bg-popover p-3 text-popover-foreground text-sm shadow-md',
        'fade-in-0 zoom-in-95 animate-in',
        className
      )}
      style={{
        top: config.position?.offset?.y || 0,
        left: config.position?.offset?.x || 0,
      }}
      role='tooltip'
      aria-live='polite'
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1'>
          {content.title && <h4 className='mb-1 font-medium'>{content.title}</h4>}
          <p className='text-muted-foreground'>{tooltipContent}</p>
        </div>
        {config.behavior?.dismissible !== false && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              onInteraction?.('dismiss')
              setIsOpen(false)
              onDismiss?.()
            }}
            className='h-4 w-4 p-0 text-muted-foreground hover:text-foreground'
          >
            <X className='h-3 w-3' />
            <span className='sr-only'>Close help tooltip</span>
          </Button>
        )}
      </div>
    </div>,
    document.body
  )
}

// Help Modal Component
const HelpModal: React.FC<ContextualHelpProps> = ({
  content,
  config,
  onInteraction,
  onDismiss,
  onFeedback,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const modalRef = useRef<HTMLDivElement>(null)
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    // Focus management for accessibility
    if (isOpen && modalRef.current) {
      const focusableElement = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      focusableElement?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    // Handle escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && config.behavior?.dismissible !== false) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, config.behavior?.dismissible])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    onInteraction?.('dismiss')
    onDismiss?.()
  }, [onInteraction, onDismiss])

  const handleFeedbackSubmit = useCallback(
    (rating: number) => {
      if (onFeedback) {
        onFeedback({
          userId: 'current-user', // TODO: Get from context
          sessionId: 'current-session', // TODO: Get from context
          helpContentId: content.id,
          type: 'rating',
          rating,
          metadata: {
            context: {} as any, // TODO: Get from context
            timestamp: new Date(),
            helpDeliveryMode: config.mode,
          },
        })
      }
      setFeedbackRating(rating)
      setShowFeedback(false)
      onInteraction?.('feedback', { rating })
    },
    [content.id, config.mode, onFeedback, onInteraction]
  )

  if (!isOpen) return null

  const contentText =
    typeof content.content === 'string'
      ? content.content
      : Array.isArray(content.content)
        ? content.content.map((block) => block.content).join('\n\n')
        : ''

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-center justify-center'
      role='dialog'
      aria-modal='true'
      aria-labelledby='help-modal-title'
      aria-describedby='help-modal-description'
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-background/80 backdrop-blur-sm'
        onClick={config.behavior?.dismissible !== false ? handleClose : undefined}
      />

      {/* Modal Content */}
      <Card
        ref={modalRef}
        className={cn(
          'relative m-4 max-h-[80vh] w-full max-w-lg overflow-y-auto',
          'fade-in-0 zoom-in-95 animate-in',
          className
        )}
      >
        <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-4'>
          <div className='flex-1'>
            <CardTitle id='help-modal-title' className='text-lg'>
              {content.title}
            </CardTitle>
            {content.description && (
              <CardDescription id='help-modal-description' className='mt-1'>
                {content.description}
              </CardDescription>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {content.priority && (
              <Badge variant={content.priority === 'critical' ? 'destructive' : 'secondary'}>
                {content.priority}
              </Badge>
            )}
            {config.behavior?.dismissible !== false && (
              <Button variant='ghost' size='sm' onClick={handleClose} className='h-6 w-6 p-0'>
                <X className='h-4 w-4' />
                <span className='sr-only'>Close help modal</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className='space-y-4'>
            {/* Main content */}
            <div className='prose prose-sm max-w-none'>
              {contentText.split('\n\n').map((paragraph, index) => (
                <p key={index} className='text-muted-foreground text-sm'>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Tags */}
            {content.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {content.tags.map((tag) => (
                  <Badge key={tag} variant='outline' className='text-xs'>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className='flex items-center justify-between'>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setShowFeedback(!showFeedback)
                    onInteraction?.('feedback_toggle')
                  }}
                >
                  Was this helpful?
                </Button>
              </div>

              <Button
                onClick={() => {
                  onInteraction?.('complete')
                  handleClose()
                }}
                size='sm'
              >
                Got it
              </Button>
            </div>

            {/* Feedback Section */}
            {showFeedback && (
              <div className='space-y-3 border-t pt-2'>
                <p className='font-medium text-sm'>Rate this help content:</p>
                <div className='flex gap-1'>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={feedbackRating === rating ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => handleFeedbackSubmit(rating)}
                      className='h-8 w-8 p-0'
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}

// Help Sidebar Component
const HelpSidebar: React.FC<ContextualHelpProps> = ({
  content,
  config,
  onInteraction,
  onDismiss,
  onFeedback,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleClose = useCallback(() => {
    setIsOpen(false)
    onInteraction?.('dismiss')
    onDismiss?.()
  }, [onInteraction, onDismiss])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed)
    onInteraction?.('toggle_collapse', { collapsed: !isCollapsed })
  }, [isCollapsed, onInteraction])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed top-0 right-0 z-40 h-full border-l bg-background shadow-lg',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-12' : 'w-80',
        'slide-in-from-right animate-in',
        className
      )}
      role='complementary'
      aria-label='Help sidebar'
    >
      {/* Header */}
      <div className='flex items-center justify-between border-b p-3'>
        {!isCollapsed && (
          <div className='flex items-center gap-2'>
            <HelpCircle className='h-4 w-4 text-blue-600' />
            <span className='font-medium text-sm'>Help</span>
          </div>
        )}
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='sm' onClick={toggleCollapse} className='h-6 w-6 p-0'>
            {isCollapsed ? (
              <ChevronLeft className='h-3 w-3' />
            ) : (
              <ChevronRight className='h-3 w-3' />
            )}
            <span className='sr-only'>{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </Button>
          {!isCollapsed && (
            <Button variant='ghost' size='sm' onClick={handleClose} className='h-6 w-6 p-0'>
              <X className='h-3 w-3' />
              <span className='sr-only'>Close sidebar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className='flex-1 overflow-y-auto p-4'>
          <div className='space-y-4'>
            <div>
              <h3 className='mb-2 font-medium text-sm'>{content.title}</h3>
              {content.description && (
                <p className='mb-3 text-muted-foreground text-xs'>{content.description}</p>
              )}
            </div>

            <div className='prose prose-sm max-w-none'>
              {typeof content.content === 'string' ? (
                <div className='whitespace-pre-wrap text-muted-foreground text-sm'>
                  {content.content}
                </div>
              ) : Array.isArray(content.content) ? (
                content.content.map((block, index) => (
                  <div key={block.id || index} className='mb-3 text-muted-foreground text-sm'>
                    {block.content}
                  </div>
                ))
              ) : null}
            </div>

            {content.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {content.tags.map((tag) => (
                  <Badge key={tag} variant='outline' className='text-xs'>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Help Inline Component
const HelpInline: React.FC<ContextualHelpProps> = ({
  content,
  config,
  onInteraction,
  onDismiss,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
    onInteraction?.('toggle_expand', { expanded: !isExpanded })
  }, [isExpanded, onInteraction])

  return (
    <div
      className={cn(
        'inline-block rounded-r-md border-blue-400 border-l-4 bg-blue-50 p-3',
        'fade-in-0 slide-in-from-left-2 animate-in',
        className
      )}
      role='complementary'
    >
      <div className='flex items-start gap-3'>
        <HelpCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600' />
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <h4 className='font-medium text-blue-900 text-sm'>{content.title}</h4>
            {content.priority && (
              <Badge
                variant={content.priority === 'critical' ? 'destructive' : 'secondary'}
                className='text-xs'
              >
                {content.priority}
              </Badge>
            )}
          </div>

          {content.description && (
            <p className='mb-2 text-blue-800 text-sm'>{content.description}</p>
          )}

          {isExpanded && (
            <div className='space-y-2 text-blue-700 text-sm'>
              {typeof content.content === 'string' ? (
                <div className='whitespace-pre-wrap'>{content.content}</div>
              ) : Array.isArray(content.content) ? (
                content.content.map((block, index) => (
                  <div key={block.id || index}>{block.content}</div>
                ))
              ) : null}

              {content.tags.length > 0 && (
                <div className='flex flex-wrap gap-1 pt-2'>
                  {content.tags.map((tag) => (
                    <Badge key={tag} variant='outline' className='text-xs'>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className='mt-2 flex items-center gap-2'>
            {typeof content.content === 'string' && content.content.length > 100 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={toggleExpanded}
                className='h-6 px-2 text-blue-700 text-xs hover:text-blue-900'
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
            {config.behavior?.dismissible !== false && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  onInteraction?.('dismiss')
                  onDismiss?.()
                }}
                className='h-6 px-2 text-blue-700 text-xs hover:text-blue-900'
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Help Overlay Component
const HelpOverlay: React.FC<ContextualHelpProps> = ({
  content,
  config,
  onInteraction,
  onDismiss,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = useCallback(() => {
    setIsVisible(false)
    onInteraction?.('dismiss')
    onDismiss?.()
  }, [onInteraction, onDismiss])

  if (!isVisible) return null

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
    >
      {/* Dark overlay */}
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={config.behavior?.dismissible !== false ? handleClose : undefined}
      />

      {/* Content */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-lg bg-background p-6',
          'fade-in-0 zoom-in-95 animate-in',
          className
        )}
      >
        <div className='mb-4 flex items-start justify-between'>
          <div className='flex items-center gap-2'>
            <HelpCircle className='h-5 w-5 text-blue-600' />
            <h3 className='font-medium'>{content.title}</h3>
          </div>
          {config.behavior?.dismissible !== false && (
            <Button variant='ghost' size='sm' onClick={handleClose} className='h-6 w-6 p-0'>
              <X className='h-4 w-4' />
              <span className='sr-only'>Close overlay</span>
            </Button>
          )}
        </div>

        {content.description && (
          <p className='mb-4 text-muted-foreground text-sm'>{content.description}</p>
        )}

        <div className='mb-4 space-y-2 text-sm'>
          {typeof content.content === 'string' ? (
            <div className='whitespace-pre-wrap'>{content.content}</div>
          ) : Array.isArray(content.content) ? (
            content.content.map((block, index) => (
              <div key={block.id || index}>{block.content}</div>
            ))
          ) : null}
        </div>

        <div className='flex justify-end'>
          <Button
            onClick={() => {
              onInteraction?.('complete')
              handleClose()
            }}
            size='sm'
          >
            Got it
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Interactive Tutorial Component
interface InteractiveTutorialProps {
  tutorial: GuidanceTutorial
  currentStep: GuidanceStep
  progress: {
    currentStep: number
    totalSteps: number
    completionPercentage: number
  }
  onStepComplete: () => void
  onSkipStep: () => void
  onDismiss: () => void
  className?: string
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  tutorial,
  currentStep,
  progress,
  onStepComplete,
  onSkipStep,
  onDismiss,
  className,
}) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(!isVoiceEnabled)
    // TODO: Implement voice toggle
  }, [isVoiceEnabled])

  return (
    <Card className={cn('mx-auto w-full max-w-2xl', className)}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <CardTitle className='text-lg'>{tutorial.title}</CardTitle>
            <Badge variant='outline'>
              Step {progress.currentStep} of {progress.totalSteps}
            </Badge>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={toggleVoice} className='h-8 w-8 p-0'>
              {isVoiceEnabled ? <Volume2 className='h-4 w-4' /> : <VolumeX className='h-4 w-4' />}
              <span className='sr-only'>{isVoiceEnabled ? 'Disable voice' : 'Enable voice'}</span>
            </Button>
            <Button variant='ghost' size='sm' onClick={onDismiss} className='h-8 w-8 p-0'>
              <X className='h-4 w-4' />
              <span className='sr-only'>Close tutorial</span>
            </Button>
          </div>
        </div>
        <Progress value={progress.completionPercentage} className='w-full' />
      </CardHeader>

      <CardContent>
        <div className='space-y-4'>
          <div>
            <h3 className='mb-2 font-medium'>{currentStep.title}</h3>
            <p className='mb-4 text-muted-foreground text-sm'>{currentStep.description}</p>
          </div>

          <div className='prose prose-sm max-w-none'>
            <div className='text-sm'>{currentStep.content.text}</div>
          </div>

          {currentStep.content.multimedia?.screenshot && (
            <div className='relative rounded-lg border p-2'>
              <Image
                src={currentStep.content.multimedia.screenshot}
                alt={`Screenshot for ${currentStep.title}`}
                width={800}
                height={600}
                className='h-auto w-full rounded'
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
          )}

          <div className='flex items-center justify-between pt-4'>
            <Button
              variant='outline'
              onClick={onSkipStep}
              disabled={currentStep.type === 'validation'}
            >
              Skip
            </Button>

            <div className='flex gap-2'>
              <Button onClick={onStepComplete}>
                {progress.currentStep === progress.totalSteps ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Help Trigger Button Component
interface HelpTriggerProps {
  contentId?: string
  variant?: 'icon' | 'text' | 'combo'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children?: React.ReactNode
}

export const HelpTrigger: React.FC<HelpTriggerProps> = ({
  contentId,
  variant = 'icon',
  size = 'default',
  className,
  children,
}) => {
  const handleClick = useCallback(() => {
    // TODO: Trigger contextual help system
    console.log('Help trigger clicked', { contentId })
  }, [contentId])

  const getContent = () => {
    switch (variant) {
      case 'text':
        return children || 'Help'
      case 'combo':
        return (
          <>
            <HelpCircle className='mr-1 h-4 w-4' />
            {children || 'Help'}
          </>
        )
      default:
        return <HelpCircle className='h-4 w-4' />
    }
  }

  return (
    <Button
      variant='ghost'
      size={size}
      onClick={handleClick}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        variant === 'icon' && 'h-8 w-8 p-0',
        className
      )}
      aria-label='Get help'
    >
      {getContent()}
    </Button>
  )
}

export default ContextualHelp
