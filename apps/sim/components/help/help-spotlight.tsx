/**
 * Help Spotlight Component - Guided walkthrough spotlight system
 *
 * Interactive guided tour system featuring:
 * - Spotlight overlay with element highlighting
 * - Step-by-step guided tours with navigation
 * - Accessible keyboard navigation and screen reader support
 * - Customizable tour steps with rich content
 * - Progress tracking and tour completion analytics
 * - Responsive design for mobile and desktop
 * - Smart positioning and collision detection
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useHelp, type TourStep } from '@/lib/help/help-context-provider'
import { helpAnalytics } from '@/lib/help/help-analytics'
import {
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SkipForwardIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  InfoIcon,
  CheckCircleIcon
} from 'lucide-react'

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpSpotlightProps {
  isActive: boolean
  steps: TourStep[]
  currentStep: number
  onNext?: () => void
  onPrevious?: () => void
  onComplete?: () => void
  onSkip?: () => void
  onClose?: () => void
  
  // Customization
  className?: string
  overlayClassName?: string
  spotlightRadius?: number
  spotlightPadding?: number
  animationDuration?: number
  
  // Accessibility
  enableKeyboardNavigation?: boolean
  announceSteps?: boolean
  focusTarget?: boolean
  
  // Behavior
  allowSkipping?: boolean
  allowClosing?: boolean
  pauseOnHover?: boolean
  autoAdvance?: boolean
  autoAdvanceDelay?: number
  
  // Analytics
  tourId?: string
  trackProgress?: boolean
  
  // Events
  onStepChange?: (step: number, stepData: TourStep) => void
  onInteraction?: (interaction: string, data?: any) => void
}

interface SpotlightPosition {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

interface TooltipPosition {
  x: number
  y: number
  placement: 'top' | 'bottom' | 'left' | 'right'
  arrow: {
    x: number
    y: number
    placement: 'top' | 'bottom' | 'left' | 'right'
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

const getElementPosition = (selector: string): DOMRect | null => {
  try {
    const element = document.querySelector(selector)
    return element ? element.getBoundingClientRect() : null
  } catch (error) {
    console.warn('Invalid selector:', selector, error)
    return null
  }
}

const calculateSpotlightPosition = (
  targetRect: DOMRect | null,
  radius: number,
  padding: number
): SpotlightPosition => {
  if (!targetRect) {
    // Default center position
    return {
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 50,
      width: 200,
      height: 100,
      radius,
    }
  }

  return {
    x: targetRect.left - padding,
    y: targetRect.top - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    radius,
  }
}

const calculateTooltipPosition = (
  spotlightPos: SpotlightPosition,
  tooltipWidth: number,
  tooltipHeight: number,
  preferredPlacement: TourStep['placement']
): TooltipPosition => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  const spotlightCenter = {
    x: spotlightPos.x + spotlightPos.width / 2,
    y: spotlightPos.y + spotlightPos.height / 2,
  }

  const positions = {
    top: {
      x: spotlightCenter.x - tooltipWidth / 2,
      y: spotlightPos.y - tooltipHeight - 20,
      placement: 'top' as const,
    },
    bottom: {
      x: spotlightCenter.x - tooltipWidth / 2,
      y: spotlightPos.y + spotlightPos.height + 20,
      placement: 'bottom' as const,
    },
    left: {
      x: spotlightPos.x - tooltipWidth - 20,
      y: spotlightCenter.y - tooltipHeight / 2,
      placement: 'left' as const,
    },
    right: {
      x: spotlightPos.x + spotlightPos.width + 20,
      y: spotlightCenter.y - tooltipHeight / 2,
      placement: 'right' as const,
    },
  }

  // Check if preferred placement fits
  let bestPosition = positions[preferredPlacement] || positions.bottom

  // Adjust if tooltip goes outside viewport
  if (bestPosition.x < 20) {
    bestPosition.x = 20
  } else if (bestPosition.x + tooltipWidth > viewport.width - 20) {
    bestPosition.x = viewport.width - tooltipWidth - 20
  }

  if (bestPosition.y < 20) {
    bestPosition = positions.bottom
    bestPosition.y = Math.max(20, bestPosition.y)
  } else if (bestPosition.y + tooltipHeight > viewport.height - 20) {
    bestPosition = positions.top
    bestPosition.y = Math.min(viewport.height - tooltipHeight - 20, bestPosition.y)
  }

  return {
    x: Math.max(20, Math.min(bestPosition.x, viewport.width - tooltipWidth - 20)),
    y: Math.max(20, Math.min(bestPosition.y, viewport.height - tooltipHeight - 20)),
    placement: bestPosition.placement,
    arrow: {
      x: spotlightCenter.x,
      y: spotlightCenter.y,
      placement: bestPosition.placement,
    },
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Help Spotlight Component
 *
 * Creates an overlay with spotlight effect for guided tours.
 */
export function HelpSpotlight({
  isActive,
  steps,
  currentStep,
  onNext,
  onPrevious,
  onComplete,
  onSkip,
  onClose,
  className,
  overlayClassName,
  spotlightRadius = 8,
  spotlightPadding = 8,
  animationDuration = 300,
  enableKeyboardNavigation = true,
  announceSteps = true,
  focusTarget = true,
  allowSkipping = true,
  allowClosing = true,
  pauseOnHover = false,
  autoAdvance = false,
  autoAdvanceDelay = 5000,
  tourId,
  trackProgress = true,
  onStepChange,
  onInteraction,
}: HelpSpotlightProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [spotlightPosition, setSpotlightPosition] = useState<SpotlightPosition | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  
  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout>()

  const currentStepData = useMemo(() => {
    return steps[currentStep] || null
  }, [steps, currentStep])

  const totalSteps = steps.length
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1

  // ========================
  // POSITION CALCULATION
  // ========================

  const updatePositions = useCallback(() => {
    if (!currentStepData || !isActive) return

    const targetRect = getElementPosition(currentStepData.target)
    const spotlight = calculateSpotlightPosition(targetRect, spotlightRadius, spotlightPadding)
    
    setSpotlightPosition(spotlight)

    // Calculate tooltip position after a short delay to ensure tooltip dimensions are available
    setTimeout(() => {
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const tooltip = calculateTooltipPosition(
          spotlight,
          tooltipRect.width,
          tooltipRect.height,
          currentStepData.placement
        )
        setTooltipPosition(tooltip)
      }
    }, 50)
  }, [currentStepData, isActive, spotlightRadius, spotlightPadding])

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete()
      return
    }

    setIsAnimating(true)
    onNext?.()
    onStepChange?.(currentStep + 1, steps[currentStep + 1])
    
    if (trackProgress && tourId) {
      helpAnalytics.trackTourProgress(tourId, helpState.sessionId, currentStep + 1, 'step')
    }

    onInteraction?.('next', { step: currentStep + 1 })

    setTimeout(() => setIsAnimating(false), animationDuration)
  }, [isLastStep, onNext, onStepChange, currentStep, steps, trackProgress, tourId, helpState.sessionId, onInteraction, animationDuration])

  const handlePrevious = useCallback(() => {
    if (isFirstStep) return

    setIsAnimating(true)
    onPrevious?.()
    onStepChange?.(currentStep - 1, steps[currentStep - 1])
    
    if (trackProgress && tourId) {
      helpAnalytics.trackTourProgress(tourId, helpState.sessionId, currentStep - 1, 'step')
    }

    onInteraction?.('previous', { step: currentStep - 1 })

    setTimeout(() => setIsAnimating(false), animationDuration)
  }, [isFirstStep, onPrevious, onStepChange, currentStep, steps, trackProgress, tourId, helpState.sessionId, onInteraction, animationDuration])

  const handleComplete = useCallback(() => {
    onComplete?.()
    
    if (trackProgress && tourId) {
      helpAnalytics.trackTourProgress(tourId, helpState.sessionId, currentStep, 'complete')
    }

    onInteraction?.('complete')
  }, [onComplete, trackProgress, tourId, helpState.sessionId, currentStep, onInteraction])

  const handleSkip = useCallback(() => {
    onSkip?.()
    
    if (trackProgress && tourId) {
      helpAnalytics.trackTourProgress(tourId, helpState.sessionId, currentStep, 'skip')
    }

    onInteraction?.('skip')
  }, [onSkip, trackProgress, tourId, helpState.sessionId, currentStep, onInteraction])

  const handleClose = useCallback(() => {
    onClose?.()
    onInteraction?.('close')
  }, [onClose, onInteraction])

  const handlePause = useCallback(() => {
    setIsPaused(!isPaused)
    
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current)
      autoAdvanceTimeoutRef.current = undefined
    }

    onInteraction?.('pause', { isPaused: !isPaused })
  }, [isPaused, onInteraction])

  // ========================
  // EFFECTS
  // ========================

  // Handle spotlight activation/deactivation
  useEffect(() => {
    if (isActive) {
      setIsVisible(true)
      updatePositions()
      
      if (trackProgress && tourId && currentStep === 0) {
        helpAnalytics.trackTourProgress(tourId, helpState.sessionId, 0, 'start')
      }
    } else {
      setIsVisible(false)
      setSpotlightPosition(null)
      setTooltipPosition(null)
    }
  }, [isActive, updatePositions, trackProgress, tourId, helpState.sessionId, currentStep])

  // Update positions when step changes
  useEffect(() => {
    if (isActive && currentStepData) {
      updatePositions()
    }
  }, [currentStep, currentStepData, isActive, updatePositions])

  // Handle window resize
  useEffect(() => {
    if (!isActive) return

    const handleResize = () => {
      updatePositions()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, updatePositions])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive || !enableKeyboardNavigation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'Space':
          event.preventDefault()
          handleNext()
          break
        case 'ArrowLeft':
          event.preventDefault()
          handlePrevious()
          break
        case 'Escape':
          event.preventDefault()
          if (allowClosing) handleClose()
          break
        case 'Enter':
          event.preventDefault()
          if (currentStepData?.actions?.[0]) {
            currentStepData.actions[0].action()
          } else {
            handleNext()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    isActive,
    enableKeyboardNavigation,
    handleNext,
    handlePrevious,
    handleClose,
    allowClosing,
    currentStepData,
  ])

  // Handle auto-advance
  useEffect(() => {
    if (!autoAdvance || isPaused || !isActive || isLastStep) return

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      handleNext()
    }, autoAdvanceDelay)

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current)
      }
    }
  }, [autoAdvance, isPaused, isActive, isLastStep, autoAdvanceDelay, handleNext])

  // Focus target element
  useEffect(() => {
    if (focusTarget && currentStepData && isActive) {
      const targetElement = document.querySelector(currentStepData.target) as HTMLElement
      if (targetElement && targetElement.focus) {
        setTimeout(() => targetElement.focus(), animationDuration + 100)
      }
    }
  }, [focusTarget, currentStepData, isActive, animationDuration])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderOverlay = () => {
    if (!spotlightPosition) return null

    const maskPath = `
      M 0,0 
      L ${window.innerWidth},0 
      L ${window.innerWidth},${window.innerHeight} 
      L 0,${window.innerHeight} 
      Z 
      M ${spotlightPosition.x},${spotlightPosition.y} 
      a ${spotlightPosition.radius},${spotlightPosition.radius} 0 0,1 ${spotlightPosition.radius},-${spotlightPosition.radius} 
      L ${spotlightPosition.x + spotlightPosition.width - spotlightPosition.radius},${spotlightPosition.y} 
      a ${spotlightPosition.radius},${spotlightPosition.radius} 0 0,1 ${spotlightPosition.radius},${spotlightPosition.radius} 
      L ${spotlightPosition.x + spotlightPosition.width},${spotlightPosition.y + spotlightPosition.height - spotlightPosition.radius} 
      a ${spotlightPosition.radius},${spotlightPosition.radius} 0 0,1 -${spotlightPosition.radius},${spotlightPosition.radius} 
      L ${spotlightPosition.x + spotlightPosition.radius},${spotlightPosition.y + spotlightPosition.height} 
      a ${spotlightPosition.radius},${spotlightPosition.radius} 0 0,1 -${spotlightPosition.radius},-${spotlightPosition.radius} 
      Z
    `

    return (
      <div
        className={cn(
          'fixed inset-0 z-[100] transition-opacity',
          isVisible ? 'opacity-100' : 'opacity-0',
          overlayClassName
        )}
        style={{ transitionDuration: `${animationDuration}ms` }}
      >
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <path d={maskPath} fill="black" fillRule="evenodd" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="black"
            fillOpacity={0.8}
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>
    )
  }

  const renderTooltip = () => {
    if (!currentStepData || !tooltipPosition) return null

    return (
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-[101] max-w-sm transition-all',
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          isAnimating && 'transition-transform',
          className
        )}
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transitionDuration: `${animationDuration}ms`,
        }}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
      >
        <Card className="shadow-lg border-0 bg-white dark:bg-black">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle id="tour-title" className="text-lg font-semibold">
                  {currentStepData.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" size="sm">
                    {currentStep + 1} of {totalSteps}
                  </Badge>
                  {autoAdvance && !isPaused && (
                    <Badge variant="outline" size="sm" className="text-xs">
                      Auto
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                {autoAdvance && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePause}
                    className="h-6 w-6 p-0"
                    title={isPaused ? 'Resume tour' : 'Pause tour'}
                  >
                    {isPaused ? (
                      <PlayIcon className="h-3 w-3" />
                    ) : (
                      <PauseIcon className="h-3 w-3" />
                    )}
                  </Button>
                )}
                
                {allowClosing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-6 w-6 p-0"
                    title="Close tour"
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <Progress value={progress} className="mt-2" />
          </CardHeader>

          <CardContent className="space-y-4">
            <div id="tour-description" className="text-sm text-muted-foreground">
              {currentStepData.description}
            </div>

            {currentStepData.actions && currentStepData.actions.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {currentStepData.actions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      onClick={action.action}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </>
            )}

            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStepData.showPrevious && !isFirstStep && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeftIcon className="h-3 w-3" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {allowSkipping && currentStepData.showSkip && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="flex items-center gap-1 text-muted-foreground"
                  >
                    <SkipForwardIcon className="h-3 w-3" />
                    Skip Tour
                  </Button>
                )}
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNext}
                  className="flex items-center gap-1"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircleIcon className="h-3 w-3" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRightIcon className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========================
  // RENDER
  // ========================

  if (!isActive || !isVisible || !currentStepData) {
    return null
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100]"
      role="presentation"
      aria-hidden="false"
    >
      {renderOverlay()}
      {renderTooltip()}
      
      {/* Screen reader announcements */}
      {announceSteps && (
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Step {currentStep + 1} of {totalSteps}: {currentStepData.title}
        </div>
      )}
    </div>,
    document.body
  )
}

// ========================
// EXPORTS
// ========================

export default HelpSpotlight
export type { HelpSpotlightProps }