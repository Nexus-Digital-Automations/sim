'use client'

/**
 * Interactive Tour Component - Visual tutorial overlay system
 * 
 * Provides step-by-step guided tours with:
 * - Element highlighting and positioning
 * - Accessible navigation and announcements
 * - Progress tracking and validation
 * - Keyboard navigation support
 * - Screen reader compatibility
 * 
 * @created 2025-09-03
 * @author Claude Development System
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, HelpCircle, Keyboard, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'
import type { Tutorial, TutorialStep, TutorialSession } from '@/lib/onboarding/tutorial-system'

const logger = createLogger('InteractiveTour')

export interface InteractiveTourProps {
  tutorial: Tutorial
  session: TutorialSession
  currentStep: TutorialStep
  onComplete: (sessionId: string) => void
  onStepComplete: (sessionId: string, stepId: string, data?: Record<string, any>) => void
  onStepSkip: (sessionId: string, stepId: string) => void
  onExit: (sessionId: string) => void
  onRequestHint: (sessionId: string) => void
  className?: string
  overlayClassName?: string
  accessibilityMode?: boolean
  keyboardNavigation?: boolean
}

interface ElementPosition {
  top: number
  left: number
  width: number
  height: number
  element: Element
}

interface TooltipPosition {
  top: number
  left: number
  placement: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Interactive Tour Component
 * 
 * Provides comprehensive tutorial overlay with accessibility support,
 * element highlighting, step navigation, and progress tracking.
 */
export function InteractiveTour({
  tutorial,
  session,
  currentStep,
  onComplete,
  onStepComplete,
  onStepSkip,
  onExit,
  onRequestHint,
  className,
  overlayClassName,
  accessibilityMode = true,
  keyboardNavigation = true
}: InteractiveTourProps) {
  // State management
  const [targetElement, setTargetElement] = useState<Element | null>(null)
  const [targetPosition, setTargetPosition] = useState<ElementPosition | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [validationPassed, setValidationPassed] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  
  // Refs for DOM manipulation and accessibility
  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  
  // Calculate current step progress
  const currentStepIndex = tutorial.steps.findIndex(step => step.id === currentStep.id)
  const progress = Math.round(((currentStepIndex + 1) / tutorial.steps.length) * 100)
  const isLastStep = currentStepIndex === tutorial.steps.length - 1

  /**
   * Find and position the target element for highlighting
   */
  const findAndPositionTarget = useCallback(() => {
    const operationId = Date.now().toString()
    
    logger.info(`[${operationId}] Finding target element`, {
      stepId: currentStep.id,
      target: currentStep.target,
      sessionId: session.id
    })

    try {
      if (!currentStep.target || currentStep.target === '.workflow-container') {
        // No specific target or targeting the whole container
        setTargetElement(null)
        setTargetPosition(null)
        setTooltipPosition({
          top: window.innerHeight / 2 - 200,
          left: window.innerWidth / 2 - 200,
          placement: 'bottom'
        })
        return
      }

      // Find target element
      const element = document.querySelector(currentStep.target)
      if (!element) {
        logger.warn(`[${operationId}] Target element not found`, {
          target: currentStep.target,
          stepId: currentStep.id
        })
        
        // Fallback to center positioning
        setTargetElement(null)
        setTargetPosition(null)
        setTooltipPosition({
          top: window.innerHeight / 2 - 200,
          left: window.innerWidth / 2 - 200,
          placement: 'bottom'
        })
        return
      }

      // Get element position
      const rect = element.getBoundingClientRect()
      const elementPosition: ElementPosition = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
        element
      }

      // Calculate tooltip position based on element position and step preferences
      const tooltipPos = calculateTooltipPosition(elementPosition, currentStep.position)
      
      setTargetElement(element)
      setTargetPosition(elementPosition)
      setTooltipPosition(tooltipPos)
      setIsHighlighted(true)

      // Scroll element into view if needed
      if (!isElementInViewport(element)) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })
      }

      // Add accessibility attributes to target element
      if (accessibilityMode) {
        element.setAttribute('aria-describedby', `tutorial-step-${currentStep.id}`)
        element.setAttribute('data-tutorial-target', 'true')
      }

      logger.info(`[${operationId}] Target element positioned successfully`, {
        elementPosition,
        tooltipPosition: tooltipPos,
        stepId: currentStep.id
      })

    } catch (error) {
      logger.error(`[${operationId}] Error positioning target element`, {
        target: currentStep.target,
        error: error instanceof Error ? error.message : String(error),
        stepId: currentStep.id
      })
      
      // Fallback positioning
      setTooltipPosition({
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 200,
        placement: 'bottom'
      })
    }
  }, [currentStep, session.id, accessibilityMode])

  /**
   * Calculate optimal tooltip position relative to target element
   */
  const calculateTooltipPosition = (elementPos: ElementPosition, preferredPosition?: string): TooltipPosition => {
    const tooltipWidth = 400
    const tooltipHeight = 300
    const padding = 16
    
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let placement: TooltipPosition['placement'] = 'bottom'
    let top = elementPos.top + elementPos.height + padding
    let left = elementPos.left + elementPos.width / 2 - tooltipWidth / 2

    // Determine best placement based on available space
    const spaceBelow = viewportHeight - (elementPos.top + elementPos.height)
    const spaceAbove = elementPos.top
    const spaceRight = viewportWidth - (elementPos.left + elementPos.width)
    const spaceLeft = elementPos.left

    // Use preferred position if specified and there's enough space
    if (preferredPosition) {
      switch (preferredPosition) {
        case 'top':
          if (spaceAbove >= tooltipHeight + padding) {
            placement = 'top'
            top = elementPos.top - tooltipHeight - padding
          }
          break
        case 'left':
          if (spaceLeft >= tooltipWidth + padding) {
            placement = 'left'
            top = elementPos.top + elementPos.height / 2 - tooltipHeight / 2
            left = elementPos.left - tooltipWidth - padding
          }
          break
        case 'right':
          if (spaceRight >= tooltipWidth + padding) {
            placement = 'right'
            top = elementPos.top + elementPos.height / 2 - tooltipHeight / 2
            left = elementPos.left + elementPos.width + padding
          }
          break
        case 'bottom':
        default:
          // Keep default bottom placement
          break
      }
    } else {
      // Auto-determine best placement
      if (spaceBelow < tooltipHeight && spaceAbove >= tooltipHeight) {
        placement = 'top'
        top = elementPos.top - tooltipHeight - padding
      } else if (spaceLeft >= tooltipWidth && spaceRight < tooltipWidth) {
        placement = 'left'
        top = elementPos.top + elementPos.height / 2 - tooltipHeight / 2
        left = elementPos.left - tooltipWidth - padding
      } else if (spaceRight >= tooltipWidth && spaceLeft < tooltipWidth) {
        placement = 'right'
        top = elementPos.top + elementPos.height / 2 - tooltipHeight / 2
        left = elementPos.left + elementPos.width + padding
      }
    }

    // Ensure tooltip stays within viewport bounds
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding))
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding))

    return { top, left, placement }
  }

  /**
   * Check if element is in viewport
   */
  const isElementInViewport = (element: Element): boolean => {
    const rect = element.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    )
  }

  /**
   * Validate step completion
   */
  const validateStep = useCallback(() => {
    if (!currentStep.validation) {
      setValidationPassed(true)
      return true
    }

    try {
      const isValid = typeof currentStep.validation === 'string' 
        ? document.querySelector(currentStep.validation) !== null
        : currentStep.validation()

      setValidationPassed(isValid)
      return isValid
    } catch (error) {
      logger.error('Step validation error', {
        stepId: currentStep.id,
        error: error instanceof Error ? error.message : String(error)
      })
      setValidationPassed(false)
      return false
    }
  }, [currentStep])

  /**
   * Handle step completion
   */
  const handleStepComplete = useCallback(() => {
    const operationId = Date.now().toString()
    
    logger.info(`[${operationId}] Completing tutorial step`, {
      stepId: currentStep.id,
      sessionId: session.id,
      validationPassed
    })

    if (currentStep.validation && !validateStep()) {
      // Show hint if validation fails
      setShowHint(true)
      onRequestHint(session.id)
      return
    }

    // Cleanup current step
    if (targetElement && accessibilityMode) {
      targetElement.removeAttribute('aria-describedby')
      targetElement.removeAttribute('data-tutorial-target')
    }

    // Complete step
    onStepComplete(session.id, currentStep.id, {
      timeOnStep: Date.now() - session.startedAt.getTime(),
      hintsUsed: showHint ? 1 : 0,
      validationAttempts: validationPassed ? 1 : 0
    })

    // Announce completion to screen readers
    if (accessibilityMode) {
      announceToScreenReader(`Step completed: ${currentStep.title}`)
    }

    logger.info(`[${operationId}] Tutorial step completed successfully`, {
      stepId: currentStep.id,
      sessionId: session.id,
      isLastStep
    })

    if (isLastStep) {
      onComplete(session.id)
    }
  }, [
    currentStep,
    session.id,
    validationPassed,
    validateStep,
    targetElement,
    accessibilityMode,
    showHint,
    onStepComplete,
    onComplete,
    onRequestHint,
    isLastStep
  ])

  /**
   * Handle step skip
   */
  const handleStepSkip = useCallback(() => {
    if (currentStep.skipable === false) {
      return
    }

    logger.info('Skipping tutorial step', {
      stepId: currentStep.id,
      sessionId: session.id
    })

    // Cleanup
    if (targetElement && accessibilityMode) {
      targetElement.removeAttribute('aria-describedby')
      targetElement.removeAttribute('data-tutorial-target')
    }

    onStepSkip(session.id, currentStep.id)

    // Announce skip to screen readers
    if (accessibilityMode) {
      announceToScreenReader(`Step skipped: ${currentStep.title}`)
    }
  }, [currentStep, session.id, targetElement, accessibilityMode, onStepSkip])

  /**
   * Handle tutorial exit
   */
  const handleExit = useCallback(() => {
    logger.info('Exiting tutorial', {
      sessionId: session.id,
      currentStepId: currentStep.id
    })

    // Cleanup
    if (targetElement && accessibilityMode) {
      targetElement.removeAttribute('aria-describedby')
      targetElement.removeAttribute('data-tutorial-target')
    }

    setIsVisible(false)
    onExit(session.id)

    // Announce exit to screen readers
    if (accessibilityMode) {
      announceToScreenReader('Tutorial exited')
    }
  }, [session.id, currentStep.id, targetElement, accessibilityMode, onExit])

  /**
   * Announce message to screen readers
   */
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  /**
   * Keyboard navigation handler
   */
  useEffect(() => {
    if (!keyboardNavigation) return

    const handleKeydown = (event: KeyboardEvent) => {
      // Don't interfere with form inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      switch (event.key) {
        case 'Escape':
          if (event.ctrlKey) {
            handleExit()
          }
          break
        case 'Enter':
        case ' ':
          if (event.ctrlKey) {
            event.preventDefault()
            handleStepComplete()
          }
          break
        case 'ArrowRight':
        case 'n':
          if (event.ctrlKey) {
            event.preventDefault()
            handleStepComplete()
          }
          break
        case 's':
          if (event.ctrlKey && event.altKey) {
            event.preventDefault()
            handleStepSkip()
          }
          break
        case 'h':
          if (event.ctrlKey && event.altKey) {
            event.preventDefault()
            setShowHint(true)
            onRequestHint(session.id)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [keyboardNavigation, handleStepComplete, handleStepSkip, handleExit, onRequestHint, session.id])

  /**
   * Initialize tour when step changes
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      findAndPositionTarget()
      validateStep()
      setShowHint(false)
    }, 100) // Small delay to ensure DOM is ready

    return () => clearTimeout(timer)
  }, [currentStep.id, findAndPositionTarget, validateStep])

  /**
   * Handle window resize and scroll
   */
  useEffect(() => {
    const handleResize = () => {
      findAndPositionTarget()
    }

    const handleScroll = () => {
      if (targetPosition) {
        findAndPositionTarget()
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [findAndPositionTarget, targetPosition])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (targetElement && accessibilityMode) {
        targetElement.removeAttribute('aria-describedby')
        targetElement.removeAttribute('data-tutorial-target')
      }
    }
  }, [targetElement, accessibilityMode])

  if (!isVisible) {
    return null
  }

  return (
    <>
      {/* Dark overlay */}
      <div
        ref={overlayRef}
        className={cn(
          'fixed inset-0 z-[9999] bg-black/60 transition-opacity duration-300',
          overlayClassName
        )}
        style={{
          pointerEvents: 'none'
        }}
        role="presentation"
        aria-hidden="true"
      />

      {/* Element highlight */}
      {targetPosition && isHighlighted && (
        <div
          ref={highlightRef}
          className="fixed z-[10000] pointer-events-none"
          style={{
            top: targetPosition.top - 4,
            left: targetPosition.left - 4,
            width: targetPosition.width + 8,
            height: targetPosition.height + 8,
            boxShadow: `
              0 0 0 4px rgba(59, 130, 246, 0.5),
              0 0 0 8px rgba(59, 130, 246, 0.3),
              0 0 32px rgba(59, 130, 246, 0.8),
              inset 0 0 0 2px rgba(255, 255, 255, 0.8)
            `,
            borderRadius: '8px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'tutorial-highlight 2s ease-in-out infinite alternate'
          }}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Tutorial tooltip/card */}
      {tooltipPosition && (
        <Card
          ref={tooltipRef}
          className={cn(
            'fixed z-[10001] w-[400px] max-w-[90vw] shadow-2xl border-2 border-primary/20',
            'bg-background/95 backdrop-blur-sm',
            className
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            pointerEvents: 'auto',
            transform: tooltipPosition.placement === 'center' ? 'translate(-50%, -50%)' : undefined
          }}
          id={`tutorial-step-${currentStep.id}`}
          role="dialog"
          aria-labelledby={`tutorial-step-title-${currentStep.id}`}
          aria-describedby={`tutorial-step-content-${currentStep.id}`}
          tabIndex={-1}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  Step {currentStepIndex + 1} of {tutorial.steps.length}
                </Badge>
                {currentStep.optional && (
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                )}
                {validationPassed && (
                  <CheckCircle className="w-4 h-4 text-green-500" aria-label="Validation passed" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                className="h-6 w-6 p-0"
                aria-label="Exit tutorial"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <CardTitle 
                id={`tutorial-step-title-${currentStep.id}`}
                className="text-lg font-semibold"
              >
                {currentStep.title}
              </CardTitle>
              <Progress 
                ref={progressRef}
                value={progress} 
                className="h-2"
                aria-label={`Tutorial progress: ${progress}% complete`}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Step content */}
            <div 
              id={`tutorial-step-content-${currentStep.id}`}
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ 
                __html: typeof currentStep.content === 'string' ? currentStep.content : currentStep.description
              }}
            />

            {/* Accessibility instructions */}
            {accessibilityMode && currentStep.accessibilityInstructions && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Accessibility:</strong> {currentStep.accessibilityInstructions}
                  </div>
                </div>
              </div>
            )}

            {/* Keyboard shortcuts */}
            {keyboardNavigation && currentStep.keyboardShortcuts && currentStep.keyboardShortcuts.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Keyboard className="w-4 h-4" />
                <span>Shortcuts: {currentStep.keyboardShortcuts.join(', ')}</span>
              </div>
            )}

            {/* Hint section */}
            {showHint && currentStep.hints && currentStep.hints.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Hint:</strong> {currentStep.hints[0]}
                  </div>
                </div>
              </div>
            )}

            {/* Validation message */}
            {currentStep.validation && !validationPassed && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  Please complete the required action before continuing.
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                {!showHint && currentStep.hints && currentStep.hints.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowHint(true)
                          onRequestHint(session.id)
                        }}
                        className="h-8"
                      >
                        <HelpCircle className="w-4 h-4 mr-1" />
                        Hint
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Get a hint for this step</TooltipContent>
                  </Tooltip>
                )}
                
                {currentStep.skipable !== false && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStepSkip}
                        className="h-8"
                      >
                        <SkipForward className="w-4 h-4 mr-1" />
                        Skip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Skip this step (Ctrl+Alt+S)</TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={validationPassed || !currentStep.validation ? "default" : "outline"}
                  onClick={handleStepComplete}
                  disabled={currentStep.validation && !validationPassed}
                  className="h-8"
                >
                  {isLastStep ? (
                    <>
                      Complete Tutorial
                      <CheckCircle className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Tutorial info */}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{tutorial.title}</span>
                <span>~{tutorial.estimatedDuration} min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes tutorial-highlight {
          0% {
            box-shadow: 
              0 0 0 4px rgba(59, 130, 246, 0.5),
              0 0 0 8px rgba(59, 130, 246, 0.3),
              0 0 32px rgba(59, 130, 246, 0.8),
              inset 0 0 0 2px rgba(255, 255, 255, 0.8);
          }
          100% {
            box-shadow: 
              0 0 0 6px rgba(59, 130, 246, 0.7),
              0 0 0 12px rgba(59, 130, 246, 0.4),
              0 0 40px rgba(59, 130, 246, 1),
              inset 0 0 0 2px rgba(255, 255, 255, 1);
          }
        }
      `}</style>
    </>
  )
}

export default InteractiveTour