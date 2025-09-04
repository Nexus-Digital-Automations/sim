/**
 * Contextual Overlay System - Smart overlays and guided tours
 *
 * Comprehensive overlay system for in-app guidance:
 * - Multi-step guided tours and onboarding flows
 * - Contextual overlays with smart positioning
 * - Spotlight highlighting with dimmed backgrounds
 * - Progressive disclosure for complex workflows
 * - Accessibility-first design with keyboard navigation
 * - Analytics integration for engagement tracking
 * - Responsive design for all device sizes
 *
 * @created 2025-09-04
 * @author Claude Development System
 * @version 1.0.0
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  SkipForwardIcon,
  XIcon,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface OverlayStep {
  id: string
  title: string
  content: React.ReactNode | string
  target?: string // CSS selector
  targetDescription?: string // Description of what to interact with
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto'
  offset?: { x?: number; y?: number }
  spotlightRadius?: number
  spotlightPadding?: number
  actions?: OverlayAction[]
  optional?: boolean
  skippable?: boolean
  waitForInteraction?: boolean // Wait for user to interact with target
  validationCheck?: () => boolean // Check if step requirements are met
  prerequisites?: string[]
  estimatedDuration?: number // seconds
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'gif'
}

export interface OverlayAction {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  disabled?: boolean
  loading?: boolean
  onClick: () => void | Promise<void>
  analytics?: {
    event: string
    properties?: Record<string, any>
  }
}

export interface TourConfig {
  id: string
  title: string
  description?: string
  steps: OverlayStep[]
  showProgress?: boolean
  allowSkipping?: boolean
  showStepNumbers?: boolean
  dimBackground?: boolean
  highlightTarget?: boolean
  autoAdvance?: boolean
  autoAdvanceDelay?: number
  onStart?: () => void
  onComplete?: () => void
  onSkip?: () => void
  onStepChange?: (stepIndex: number, step: OverlayStep) => void
  analytics?: {
    tourId: string
    category?: string
    properties?: Record<string, any>
  }
}

export interface ContextualOverlayProps {
  tour: TourConfig
  isActive: boolean
  onClose: () => void
  className?: string
  zIndex?: number
}

// ========================
// UTILITY FUNCTIONS
// ========================

const getTargetElement = (selector: string): Element | null => {
  try {
    return document.querySelector(selector)
  } catch (error) {
    console.warn('Invalid CSS selector:', selector)
    return null
  }
}

const getElementPosition = (element: Element) => {
  const rect = element.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
  
  return {
    x: rect.left + scrollLeft,
    y: rect.top + scrollTop,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + scrollLeft + rect.width / 2,
    centerY: rect.top + scrollTop + rect.height / 2,
  }
}

const calculateOverlayPosition = (
  targetElement: Element | null,
  position: OverlayStep['position'],
  offset: OverlayStep['offset'] = {}
) => {
  if (!targetElement) {
    // Center overlay if no target
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      transform: 'translate(-50%, -50%)',
    }
  }
  
  const target = getElementPosition(targetElement)
  const { x: offsetX = 0, y: offsetY = 0 } = offset
  
  switch (position) {
    case 'top':
      return {
        x: target.centerX + offsetX,
        y: target.y - 20 + offsetY,
        transform: 'translate(-50%, -100%)',
      }
    case 'bottom':
      return {
        x: target.centerX + offsetX,
        y: target.y + target.height + 20 + offsetY,
        transform: 'translate(-50%, 0)',
      }
    case 'left':
      return {
        x: target.x - 20 + offsetX,
        y: target.centerY + offsetY,
        transform: 'translate(-100%, -50%)',
      }
    case 'right':
      return {
        x: target.x + target.width + 20 + offsetX,
        y: target.centerY + offsetY,
        transform: 'translate(0, -50%)',
      }
    case 'center':
      return {
        x: target.centerX + offsetX,
        y: target.centerY + offsetY,
        transform: 'translate(-50%, -50%)',
      }
    default: { // auto
      // Smart positioning based on available space
      const spaceAbove = target.y
      const spaceBelow = window.innerHeight - (target.y + target.height)
      const spaceLeft = target.x
      const spaceRight = window.innerWidth - (target.x + target.width)
      
      if (spaceBelow > 300) {
        return calculateOverlayPosition(targetElement, 'bottom', offset)
      }if (spaceAbove > 300) {
        return calculateOverlayPosition(targetElement, 'top', offset)
      }if (spaceRight > 400) {
        return calculateOverlayPosition(targetElement, 'right', offset)
      }if (spaceLeft > 400) {
        return calculateOverlayPosition(targetElement, 'left', offset)
      }
        return calculateOverlayPosition(targetElement, 'center', offset)
    }
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Contextual Overlay Component
 *
 * Smart overlay system with guided tours and contextual assistance.
 */
export function ContextualOverlay({
  tour,
  isActive,
  onClose,
  className,
  zIndex = 9999,
}: ContextualOverlayProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0, transform: '' })
  const [targetElement, setTargetElement] = useState<Element | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const overlayRef = useRef<HTMLDivElement>(null)
  const tourStartTime = useRef<number | undefined>(undefined)
  const stepStartTime = useRef<number | undefined>(undefined)
  
  const currentStep = tour.steps[currentStepIndex]
  const isLastStep = currentStepIndex === tour.steps.length - 1
  const progress = ((currentStepIndex + 1) / tour.steps.length) * 100
  
  // ========================
  // HELPER FUNCTIONS
  // ========================
  
  const updateOverlayPosition = useCallback(() => {
    if (!currentStep) return
    
    let target: Element | null = null
    
    if (currentStep.target) {
      target = getTargetElement(currentStep.target)
      setTargetElement(target)
    }
    
    const position = calculateOverlayPosition(target, currentStep.position, currentStep.offset)
    setOverlayPosition(position)
  }, [currentStep])
  
  const scrollToTarget = useCallback((element: Element) => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    })
  }, [])
  
  const highlightTarget = useCallback((element: Element | null) => {
    if (!element || !tour.highlightTarget) return
    
    // Add highlight class to target element
    element.classList.add('tour-highlight')
    
    // Remove highlight after a delay
    setTimeout(() => {
      element.classList.remove('tour-highlight')
    }, 2000)
  }, [tour.highlightTarget])
  
  // ========================
  // EVENT HANDLERS
  // ========================
  
  const handleNext = useCallback(async () => {
    if (!currentStep) return
    
    try {
      setIsLoading(true)
      
      // Validate step requirements if validation exists
      if (currentStep.validationCheck && !currentStep.validationCheck()) {
        console.warn('Step validation failed, cannot proceed')
        return
      }
      
      // Track step completion
      if (stepStartTime.current) {
        const duration = Date.now() - stepStartTime.current
        helpAnalytics.trackHelpInteraction(
          tour.id,
          helpState.sessionId,
          'step_complete',
          `step-${currentStepIndex}`,
          {
            stepId: currentStep.id,
            duration,
            stepIndex: currentStepIndex,
          }
        )
      }
      
      // Mark step as completed
      setCompletedSteps(prev => new Set(prev).add(currentStepIndex))
      
      if (isLastStep) {
        handleComplete()
      } else {
        const nextIndex = currentStepIndex + 1
        setCurrentStepIndex(nextIndex)
        
        // Track step change
        tour.onStepChange?.(nextIndex, tour.steps[nextIndex])
        stepStartTime.current = Date.now()
      }
    } catch (error) {
      console.error('Error advancing to next step:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentStep, currentStepIndex, isLastStep, tour, helpState.sessionId])
  
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1
      setCurrentStepIndex(prevIndex)
      
      // Track step change
      tour.onStepChange?.(prevIndex, tour.steps[prevIndex])
      stepStartTime.current = Date.now()
      
      // Track analytics
      helpAnalytics.trackHelpInteraction(
        tour.id,
        helpState.sessionId,
        'step_previous',
        `step-${prevIndex}`
      )
    }
  }, [currentStepIndex, tour, helpState.sessionId])
  
  const handleSkip = useCallback(() => {
    // Track skip analytics
    helpAnalytics.trackHelpInteraction(
      tour.id,
      helpState.sessionId,
      'tour_skip',
      `step-${currentStepIndex}`,
      {
        completedSteps: completedSteps.size,
        totalSteps: tour.steps.length,
        completionRate: (completedSteps.size / tour.steps.length) * 100,
      }
    )
    
    tour.onSkip?.()
    onClose()
  }, [tour, helpState.sessionId, currentStepIndex, completedSteps, onClose])
  
  const handleComplete = useCallback(() => {
    // Track completion analytics
    if (tourStartTime.current) {
      const duration = Date.now() - tourStartTime.current
      helpAnalytics.trackHelpInteraction(
        tour.id,
        helpState.sessionId,
        'tour_complete',
        'complete',
        {
          totalDuration: duration,
          completedSteps: completedSteps.size + 1, // +1 for current step
          totalSteps: tour.steps.length,
          completionRate: 100,
        }
      )
    }
    
    tour.onComplete?.()
    onClose()
  }, [tour, helpState.sessionId, completedSteps, onClose])
  
  const handleActionClick = useCallback(
    async (action: OverlayAction) => {
      try {
        setIsLoading(true)
        
        // Track action click
        helpAnalytics.trackHelpInteraction(
          tour.id,
          helpState.sessionId,
          'action_click',
          action.id,
          action.analytics?.properties
        )
        
        await action.onClick()
      } catch (error) {
        console.error('Error executing overlay action:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [tour.id, helpState.sessionId]
  )
  
  const handleClose = useCallback(() => {
    // Track close analytics
    helpAnalytics.trackHelpInteraction(
      tour.id,
      helpState.sessionId,
      'tour_close',
      `step-${currentStepIndex}`,
      {
        completedSteps: completedSteps.size,
        totalSteps: tour.steps.length,
        completionRate: (completedSteps.size / tour.steps.length) * 100,
      }
    )
    
    onClose()
  }, [tour.id, helpState.sessionId, currentStepIndex, completedSteps, onClose])
  
  // ========================
  // EFFECTS
  // ========================
  
  // Initialize tour
  useEffect(() => {
    if (isActive && !tourStartTime.current) {
      tourStartTime.current = Date.now()
      stepStartTime.current = Date.now()
      
      // Track tour start
      helpAnalytics.trackHelpInteraction(
        tour.id,
        helpState.sessionId,
        'tour_start',
        'start',
        tour.analytics?.properties
      )
      
      tour.onStart?.()
    }
  }, [isActive, tour, helpState.sessionId])
  
  // Update overlay position when step changes
  useEffect(() => {
    if (isActive) {
      updateOverlayPosition()
      
      // Scroll to target if it exists
      if (targetElement) {
        setTimeout(() => scrollToTarget(targetElement), 100)
        setTimeout(() => highlightTarget(targetElement), 200)
      }
    }
  }, [isActive, currentStepIndex, updateOverlayPosition, targetElement, scrollToTarget, highlightTarget])
  
  // Handle window resize
  useEffect(() => {
    if (!isActive) return
    
    const handleResize = () => updateOverlayPosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize)
    }
  }, [isActive, updateOverlayPosition])
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          handleClose()
          break
        case 'ArrowLeft':
          if (currentStepIndex > 0) {
            event.preventDefault()
            handlePrevious()
          }
          break
        case 'ArrowRight':
        case 'Enter':
        case ' ':
          event.preventDefault()
          handleNext()
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, currentStepIndex, handleClose, handlePrevious, handleNext])
  
  // Auto-advance if enabled
  useEffect(() => {
    if (!isActive || !tour.autoAdvance || !tour.autoAdvanceDelay) return
    
    const timer = setTimeout(() => {
      if (!currentStep.waitForInteraction) {
        handleNext()
      }
    }, tour.autoAdvanceDelay * 1000)
    
    return () => clearTimeout(timer)
  }, [isActive, currentStepIndex, tour.autoAdvance, tour.autoAdvanceDelay, currentStep, handleNext])
  
  // ========================
  // RENDER HELPERS
  // ========================
  
  const renderSpotlight = () => {
    if (!targetElement || !tour.highlightTarget) return null
    
    const target = getElementPosition(targetElement)
    const radius = currentStep.spotlightRadius || 8
    const padding = currentStep.spotlightPadding || 8
    
    return (
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          background: `radial-gradient(circle at ${target.centerX}px ${target.centerY}px, transparent ${radius + padding}px, rgba(0, 0, 0, 0.7) ${radius + padding + 2}px)`,
        }}
      />
    )
  }
  
  const renderMedia = () => {
    if (!currentStep.mediaUrl) return null
    
    return (
      <div className='mb-4'>
        {currentStep.mediaType === 'video' ? (
          <video
            className='max-h-48 w-full rounded-lg'
            controls
            poster={currentStep.mediaUrl.replace('.mp4', '-poster.jpg')}
          >
            <source src={currentStep.mediaUrl} type='video/mp4' />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={currentStep.mediaUrl}
            alt={currentStep.title}
            className='max-h-48 w-full rounded-lg object-cover'
          />
        )}
      </div>
    )
  }
  
  const renderContent = () => {
    return (
      <Card className='w-full max-w-md border-0 bg-background shadow-xl'>
        <div className='p-6'>
          {/* Header */}
          <div className='mb-4 flex items-start justify-between'>
            <div className='flex-1'>
              <div className='mb-2 flex items-center gap-2'>
                <InfoIcon className='h-4 w-4 text-primary' />
                <h2 className='font-semibold text-lg'>{currentStep.title}</h2>
              </div>
              
              {tour.showProgress && (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-muted-foreground text-sm'>
                    <span>Step {currentStepIndex + 1} of {tour.steps.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <Progress value={progress} className='h-2' />
                </div>
              )}
            </div>
            
            <Button
              variant='ghost'
              size='sm'
              onClick={handleClose}
              className='h-8 w-8 p-0 hover:bg-muted'
              aria-label='Close tour'
            >
              <XIcon className='h-4 w-4' />
            </Button>
          </div>
          
          {renderMedia()}
          
          {/* Content */}
          <div className='mb-6 text-muted-foreground text-sm leading-relaxed'>
            {typeof currentStep.content === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: currentStep.content }} />
            ) : (
              currentStep.content
            )}
          </div>
          
          {/* Target description */}
          {currentStep.targetDescription && (
            <div className='mb-4 rounded-lg bg-muted p-3'>
              <div className='flex items-center gap-2 text-sm'>
                <ArrowRightIcon className='h-4 w-4 text-primary' />
                <span className='font-medium'>Look for:</span>
                <span>{currentStep.targetDescription}</span>
              </div>
            </div>
          )}
          
          {/* Prerequisites */}
          {currentStep.prerequisites && currentStep.prerequisites.length > 0 && (
            <div className='mb-4'>
              <h4 className='mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide'>
                Prerequisites
              </h4>
              <ul className='space-y-1 text-sm'>
                {currentStep.prerequisites.map((prereq, index) => (
                  <li key={index} className='flex items-center gap-2'>
                    <CheckCircleIcon className='h-3 w-3 text-green-500' />
                    {prereq}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Custom actions */}
          {currentStep.actions && currentStep.actions.length > 0 && (
            <>
              <Separator className='mb-4' />
              <div className='space-y-2'>
                {currentStep.actions.map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant || 'outline'}
                    onClick={() => handleActionClick(action)}
                    disabled={action.disabled || isLoading}
                    className='w-full'
                  >
                    {action.loading || isLoading ? (
                      <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                    ) : (
                      action.icon && <span className='mr-2'>{action.icon}</span>
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
              <Separator className='mt-4' />
            </>
          )}
          
          {/* Navigation */}
          <div className='flex items-center justify-between pt-4'>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={handlePrevious}
                disabled={currentStepIndex === 0 || isLoading}
                className='h-9'
              >
                <ChevronLeftIcon className='mr-1 h-4 w-4' />
                Previous
              </Button>
              
              {tour.allowSkipping && (
                <Button
                  variant='ghost'
                  onClick={handleSkip}
                  disabled={isLoading}
                  className='h-9'
                >
                  <SkipForwardIcon className='mr-1 h-4 w-4' />
                  Skip Tour
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className='h-9'
            >
              {isLoading && (
                <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              )}
              {isLastStep ? (
                <>
                  Complete
                  <CheckCircleIcon className='ml-1 h-4 w-4' />
                </>
              ) : (
                <>
                  Next
                  <ChevronRightIcon className='ml-1 h-4 w-4' />
                </>
              )}
            </Button>
          </div>
          
          {/* Optional step indicator */}
          {currentStep.optional && (
            <div className='mt-4 border-t pt-4'>
              <Badge variant='outline' className='text-xs'>
                Optional Step
              </Badge>
            </div>
          )}
        </div>
      </Card>
    )
  }
  
  if (!isActive || !currentStep) {
    return null
  }
  
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center',
        tour.dimBackground && 'bg-black/50',
        className
      )}
      style={{ zIndex }}
      aria-modal='true'
      role='dialog'
      aria-labelledby={`tour-step-${currentStepIndex}`}
    >
      {/* Spotlight effect */}
      {tour.dimBackground && renderSpotlight()}
      
      {/* Overlay content */}
      <div
        ref={overlayRef}
        className='absolute transition-all duration-300 ease-out'
        style={{
          left: overlayPosition.x,
          top: overlayPosition.y,
          transform: overlayPosition.transform,
        }}
        id={`tour-step-${currentStepIndex}`}
      >
        {renderContent()}
      </div>
    </div>,
    document.body
  )
}

// ========================
// TOUR HOOK
// ========================

/**
 * Hook for managing tour state
 */
export function useTour() {
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null)
  const [isActive, setIsActive] = useState(false)
  
  const startTour = useCallback((tour: TourConfig) => {
    setActiveTour(tour)
    setIsActive(true)
  }, [])
  
  const endTour = useCallback(() => {
    setActiveTour(null)
    setIsActive(false)
  }, [])
  
  return {
    activeTour,
    isActive,
    startTour,
    endTour,
  }
}

// ========================
// EXPORTS
// ========================

export default ContextualOverlay
export type {
  ContextualOverlayProps,
  TourConfig,
  OverlayStep,
  OverlayAction,
}
