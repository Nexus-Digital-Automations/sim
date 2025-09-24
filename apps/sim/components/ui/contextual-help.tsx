/**
 * Contextual Help React Components
 *
 * React components for rendering contextual help in various modes:
 * tooltips, modals, sidebars, inline help, and more with full accessibility support.
 */

'use client'

import React, { useEffect, useState, useCallback, useRef, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { X, HelpCircle, ChevronRight, ChevronLeft, Volume2, VolumeX } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Separator } from './separator'
import { Progress } from './progress'
import { cn } from '@/lib/utils'
import type {
  HelpContent,
  HelpDeliveryConfig,
  GuidanceStep,
  GuidanceTutorial,
  FeedbackData,
} from '@/services/contextual-help/types'

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

  const handleInteraction = useCallback((type: string, data?: any) => {
    if (onInteraction) {
      onInteraction(type, data)
    }
  }, [onInteraction])

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

  const tooltipContent = typeof content.content === 'string'
    ? content.content
    : Array.isArray(content.content)
    ? content.content.map(block => block.content).join(' ')
    : ''

  return createPortal(
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-50 max-w-xs p-3 text-sm bg-popover text-popover-foreground rounded-md border shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      style={{
        top: config.position?.offset?.y || 0,
        left: config.position?.offset?.x || 0,
      }}
      role="tooltip"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {content.title && (
            <h4 className="font-medium mb-1">{content.title}</h4>
          )}
          <p className="text-muted-foreground">{tooltipContent}</p>
        </div>
        {config.behavior?.dismissible !== false && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onInteraction?.('dismiss')
              setIsOpen(false)
              onDismiss?.()
            }}
            className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Close help tooltip</span>
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

  const handleFeedbackSubmit = useCallback((rating: number) => {
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
  }, [content.id, config.mode, onFeedback, onInteraction])

  if (!isOpen) return null

  const contentText = typeof content.content === 'string'
    ? content.content
    : Array.isArray(content.content)
    ? content.content.map(block => block.content).join('\n\n')
    : ''

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      aria-describedby="help-modal-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={config.behavior?.dismissible !== false ? handleClose : undefined}
      />

      {/* Modal Content */}
      <Card
        ref={modalRef}
        className={cn(
          'relative w-full max-w-lg m-4 max-h-[80vh] overflow-y-auto',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex-1">
            <CardTitle id="help-modal-title" className="text-lg">
              {content.title}
            </CardTitle>
            {content.description && (
              <CardDescription id="help-modal-description" className="mt-1">
                {content.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {content.priority && (
              <Badge variant={content.priority === 'critical' ? 'destructive' : 'secondary'}>
                {content.priority}
              </Badge>
            )}
            {config.behavior?.dismissible !== false && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close help modal</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Main content */}
            <div className="prose prose-sm max-w-none">
              {contentText.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Tags */}
            {content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {content.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
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
                size="sm"
              >
                Got it
              </Button>
            </div>

            {/* Feedback Section */}
            {showFeedback && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">Rate this help content:</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={feedbackRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFeedbackSubmit(rating)}
                      className="w-8 h-8 p-0"
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
        'fixed right-0 top-0 h-full z-40 bg-background border-l shadow-lg',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-12' : 'w-80',
        'animate-in slide-in-from-right',
        className
      )}
      role="complementary"
      aria-label="Help sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Help</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <ChevronLeft className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="sr-only">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </span>
          </Button>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">{content.title}</h3>
              {content.description && (
                <p className="text-xs text-muted-foreground mb-3">
                  {content.description}
                </p>
              )}
            </div>

            <div className="prose prose-sm max-w-none">
              {typeof content.content === 'string' ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {content.content}
                </div>
              ) : Array.isArray(content.content) ? (
                content.content.map((block, index) => (
                  <div key={block.id || index} className="text-sm text-muted-foreground mb-3">
                    {block.content}
                  </div>
                ))
              ) : null}
            </div>

            {content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {content.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
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
        'inline-block p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-md',
        'animate-in fade-in-0 slide-in-from-left-2',
        className
      )}
      role="complementary"
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-blue-900">{content.title}</h4>
            {content.priority && (
              <Badge
                variant={content.priority === 'critical' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {content.priority}
              </Badge>
            )}
          </div>

          {content.description && (
            <p className="text-sm text-blue-800 mb-2">{content.description}</p>
          )}

          {isExpanded && (
            <div className="text-sm text-blue-700 space-y-2">
              {typeof content.content === 'string' ? (
                <div className="whitespace-pre-wrap">{content.content}</div>
              ) : Array.isArray(content.content) ? (
                content.content.map((block, index) => (
                  <div key={block.id || index}>{block.content}</div>
                ))
              ) : null}

              {content.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {content.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            {typeof content.content === 'string' && content.content.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="h-6 px-2 text-xs text-blue-700 hover:text-blue-900"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
            {config.behavior?.dismissible !== false && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onInteraction?.('dismiss')
                  onDismiss?.()
                }}
                className="h-6 px-2 text-xs text-blue-700 hover:text-blue-900"
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={config.behavior?.dismissible !== false ? handleClose : undefined}
      />

      {/* Content */}
      <div
        className={cn(
          'relative bg-background rounded-lg p-6 max-w-md w-full',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium">{content.title}</h3>
          </div>
          {config.behavior?.dismissible !== false && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close overlay</span>
            </Button>
          )}
        </div>

        {content.description && (
          <p className="text-sm text-muted-foreground mb-4">{content.description}</p>
        )}

        <div className="text-sm space-y-2 mb-4">
          {typeof content.content === 'string' ? (
            <div className="whitespace-pre-wrap">{content.content}</div>
          ) : Array.isArray(content.content) ? (
            content.content.map((block, index) => (
              <div key={block.id || index}>{block.content}</div>
            ))
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => {
              onInteraction?.('complete')
              handleClose()
            }}
            size="sm"
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
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{tutorial.title}</CardTitle>
            <Badge variant="outline">
              Step {progress.currentStep} of {progress.totalSteps}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVoice}
              className="h-8 w-8 p-0"
            >
              {isVoiceEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isVoiceEnabled ? 'Disable voice' : 'Enable voice'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close tutorial</span>
            </Button>
          </div>
        </div>
        <Progress value={progress.completionPercentage} className="w-full" />
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">{currentStep.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {currentStep.description}
            </p>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="text-sm">{currentStep.content.text}</div>
          </div>

          {currentStep.content.multimedia?.screenshot && (
            <div className="border rounded-lg p-2">
              <img
                src={currentStep.content.multimedia.screenshot}
                alt={`Screenshot for ${currentStep.title}`}
                className="w-full h-auto rounded"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={onSkipStep}
              disabled={currentStep.type === 'validation'}
            >
              Skip
            </Button>

            <div className="flex gap-2">
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
            <HelpCircle className="h-4 w-4 mr-1" />
            {children || 'Help'}
          </>
        )
      case 'icon':
      default:
        return <HelpCircle className="h-4 w-4" />
    }
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        variant === 'icon' && 'w-8 h-8 p-0',
        className
      )}
      aria-label="Get help"
    >
      {getContent()}
    </Button>
  )
}

export default ContextualHelp