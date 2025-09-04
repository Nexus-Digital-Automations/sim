/**
 * Interactive Tutorial Component - Step-by-step guided tutorials
 *
 * Advanced tutorial system providing interactive, step-by-step guidance:
 * - Multi-step tutorial progression with branching paths
 * - Interactive elements highlighting and user actions
 * - Progress tracking and completion analytics
 * - Accessibility-compliant navigation and screen reader support
 * - Responsive design for desktop and mobile
 * - Integration with help analytics and user progress tracking
 *
 * Key Features:
 * - Step-by-step guided walkthroughs
 * - Element highlighting and focus management
 * - User progress persistence and resumption
 * - Branching tutorial paths based on user choices
 * - Interactive element validation
 * - Comprehensive completion tracking
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface InteractiveTutorialProps {
  tutorialId: string
  title: string
  description?: string
  steps: TutorialStep[]

  // Behavior
  autoStart?: boolean
  allowSkip?: boolean
  allowPause?: boolean
  persistProgress?: boolean

  // Appearance
  variant?: 'overlay' | 'sidebar' | 'inline' | 'modal'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  showProgress?: boolean
  showStepNumbers?: boolean
  maxWidth?: number
  className?: string

  // Events
  onStart?: () => void
  onComplete?: (completionData: CompletionData) => void
  onStepChange?: (stepIndex: number, step: TutorialStep) => void
  onPause?: () => void
  onResume?: () => void
  onSkip?: (reason: string) => void
  onExit?: (reason: string) => void

  // Advanced
  customActions?: CustomAction[]
  validationMode?: 'none' | 'automatic' | 'manual'
  highlightDelay?: number
}

export interface TutorialStep {
  id: string
  title: string
  content: string | React.ReactNode
  type?: 'instruction' | 'interaction' | 'validation' | 'completion'

  // Targeting
  targetSelector?: string
  targetElement?: HTMLElement
  highlightType?: 'outline' | 'overlay' | 'spotlight' | 'none'

  // Interaction
  expectedAction?: string
  validationFn?: () => boolean | Promise<boolean>
  nextStepCondition?: () => boolean

  // Appearance
  position?: 'auto' | 'top' | 'bottom' | 'left' | 'right'
  showArrow?: boolean
  showSkip?: boolean

  // Content
  tips?: string[]
  warnings?: string[]
  resources?: Resource[]
  estimatedTime?: number

  // Navigation
  canGoBack?: boolean
  canSkip?: boolean
  nextStepId?: string
  branches?: StepBranch[]
}

export interface StepBranch {
  id: string
  label: string
  condition: () => boolean
  nextStepId: string
}

export interface Resource {
  id: string
  title: string
  type: 'link' | 'video' | 'document' | 'tutorial'
  url: string
  description?: string
}

export interface CompletionData {
  tutorialId: string
  completedSteps: string[]
  totalSteps: number
  startTime: Date
  endTime: Date
  duration: number
  skippedSteps: string[]
  interactions: TutorialInteraction[]
}

export interface TutorialInteraction {
  stepId: string
  action: string
  timestamp: Date
  data?: any
}

export interface CustomAction {
  id: string
  label: string
  icon?: React.ReactNode
  action: (step: TutorialStep) => void
  visible?: (step: TutorialStep) => boolean
}

interface TutorialState {
  isActive: boolean
  isPaused: boolean
  currentStepIndex: number
  completedSteps: Set<string>
  skippedSteps: Set<string>
  interactions: TutorialInteraction[]
  startTime: Date | null
  highlightedElement: HTMLElement | null
  position: { x: number; y: number }
  isValidating: boolean
}

// ========================
// ELEMENT HIGHLIGHTER UTILITY
// ========================

class ElementHighlighter {
  private static highlightOverlay: HTMLDivElement | null = null
  private static spotlightOverlay: HTMLDivElement | null = null

  /**
   * Highlight target element with specified type
   */
  static highlight(
    element: HTMLElement,
    type: TutorialStep['highlightType'] = 'outline',
    onRemove?: () => void
  ): void {
    ElementHighlighter.removeHighlight()

    const rect = element.getBoundingClientRect()

    switch (type) {
      case 'outline':
        ElementHighlighter.createOutlineHighlight(element)
        break
      case 'overlay':
        ElementHighlighter.createOverlayHighlight(rect)
        break
      case 'spotlight':
        ElementHighlighter.createSpotlightHighlight(rect)
        break
    }

    // Auto-scroll to element if not visible
    const isVisible = ElementHighlighter.isElementVisible(element)
    if (!isVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  /**
   * Remove all highlights
   */
  static removeHighlight(): void {
    if (ElementHighlighter.highlightOverlay) {
      ElementHighlighter.highlightOverlay.remove()
      ElementHighlighter.highlightOverlay = null
    }
    if (ElementHighlighter.spotlightOverlay) {
      ElementHighlighter.spotlightOverlay.remove()
      ElementHighlighter.spotlightOverlay = null
    }

    // Remove outline styles
    const highlightedElements = document.querySelectorAll('[data-tutorial-highlight]')
    highlightedElements.forEach((el) => {
      el.removeAttribute('data-tutorial-highlight')
      ;(el as HTMLElement).style.outline = ''
      ;(el as HTMLElement).style.outlineOffset = ''
    })
  }

  private static createOutlineHighlight(element: HTMLElement): void {
    element.setAttribute('data-tutorial-highlight', 'true')
    element.style.outline = '2px solid #3b82f6'
    element.style.outlineOffset = '2px'
  }

  private static createOverlayHighlight(rect: DOMRect): void {
    ElementHighlighter.highlightOverlay = document.createElement('div')
    ElementHighlighter.highlightOverlay.style.cssText = `
      position: fixed;
      top: ${rect.top - 4}px;
      left: ${rect.left - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      z-index: 9999;
      animation: tutorial-pulse 2s infinite;
    `

    // Add CSS animation
    if (!document.querySelector('#tutorial-animations')) {
      const style = document.createElement('style')
      style.id = 'tutorial-animations'
      style.textContent = `
        @keyframes tutorial-pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(ElementHighlighter.highlightOverlay)
  }

  private static createSpotlightHighlight(rect: DOMRect): void {
    ElementHighlighter.spotlightOverlay = document.createElement('div')
    ElementHighlighter.spotlightOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      pointer-events: none;
      z-index: 9998;
    `

    // Create spotlight hole
    const spotlightHole = document.createElement('div')
    spotlightHole.style.cssText = `
      position: absolute;
      top: ${rect.top - 8}px;
      left: ${rect.left - 8}px;
      width: ${rect.width + 16}px;
      height: ${rect.height + 16}px;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      background: transparent;
    `

    ElementHighlighter.spotlightOverlay.appendChild(spotlightHole)
    document.body.appendChild(ElementHighlighter.spotlightOverlay)
  }

  private static isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    )
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Interactive Tutorial Component
 *
 * Provides step-by-step guided tutorials with element highlighting and progress tracking.
 */
export function InteractiveTutorial({
  tutorialId,
  title,
  description,
  steps,
  autoStart = false,
  allowSkip = true,
  allowPause = true,
  persistProgress = true,
  variant = 'overlay',
  position = 'bottom-right',
  showProgress = true,
  showStepNumbers = true,
  maxWidth = 400,
  className,
  onStart,
  onComplete,
  onStepChange,
  onPause,
  onResume,
  onSkip,
  onExit,
  customActions = [],
  validationMode = 'none',
  highlightDelay = 500,
}: InteractiveTutorialProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    isActive: false,
    isPaused: false,
    currentStepIndex: 0,
    completedSteps: new Set(),
    skippedSteps: new Set(),
    interactions: [],
    startTime: null,
    highlightedElement: null,
    position: { x: 0, y: 0 },
    isValidating: false,
  })

  const tutorialRef = useRef<HTMLDivElement>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // ========================
  // COMPUTED VALUES
  // ========================

  const currentStep = useMemo(
    () => steps[tutorialState.currentStepIndex] || null,
    [steps, tutorialState.currentStepIndex]
  )

  const progress = useMemo(() => {
    if (steps.length === 0) return 0
    return (tutorialState.completedSteps.size / steps.length) * 100
  }, [steps.length, tutorialState.completedSteps.size])

  const canGoNext = useMemo(() => {
    if (!currentStep) return false
    if (tutorialState.isValidating) return false
    if (validationMode === 'manual' && currentStep.validationFn) {
      return tutorialState.completedSteps.has(currentStep.id)
    }
    return true
  }, [currentStep, tutorialState.isValidating, tutorialState.completedSteps, validationMode])

  const canGoPrevious = useMemo(() => {
    return tutorialState.currentStepIndex > 0 && currentStep?.canGoBack !== false
  }, [tutorialState.currentStepIndex, currentStep?.canGoBack])

  // ========================
  // TUTORIAL CONTROL
  // ========================

  const startTutorial = useCallback(() => {
    setTutorialState((prev) => ({
      ...prev,
      isActive: true,
      isPaused: false,
      startTime: new Date(),
      currentStepIndex: 0,
    }))

    onStart?.()
    trackInteraction('start', `tutorial_${tutorialId}`)

    helpAnalytics.trackHelpInteraction(
      tutorialId,
      helpState.sessionId,
      'tutorial_start',
      'interactive_tutorial'
    )
  }, [tutorialId, onStart, trackInteraction, helpState.sessionId])

  const pauseTutorial = useCallback(() => {
    setTutorialState((prev) => ({ ...prev, isPaused: true }))
    ElementHighlighter.removeHighlight()

    onPause?.()
    trackInteraction('pause', `tutorial_${tutorialId}`)
  }, [tutorialId, onPause, trackInteraction])

  const resumeTutorial = useCallback(() => {
    setTutorialState((prev) => ({ ...prev, isPaused: false }))

    onResume?.()
    trackInteraction('resume', `tutorial_${tutorialId}`)

    // Re-highlight current step
    if (currentStep) {
      highlightCurrentStep()
    }
  }, [tutorialId, onResume, trackInteraction, currentStep])

  const completeTutorial = useCallback(() => {
    const endTime = new Date()
    const completionData: CompletionData = {
      tutorialId,
      completedSteps: Array.from(tutorialState.completedSteps),
      totalSteps: steps.length,
      startTime: tutorialState.startTime!,
      endTime,
      duration: endTime.getTime() - tutorialState.startTime!.getTime(),
      skippedSteps: Array.from(tutorialState.skippedSteps),
      interactions: tutorialState.interactions,
    }

    ElementHighlighter.removeHighlight()

    setTutorialState((prev) => ({
      ...prev,
      isActive: false,
      isPaused: false,
    }))

    onComplete?.(completionData)
    trackInteraction('complete', `tutorial_${tutorialId}`, {
      duration: completionData.duration,
      completedSteps: completionData.completedSteps.length,
      skippedSteps: completionData.skippedSteps.length,
    })

    helpAnalytics.trackHelpInteraction(
      tutorialId,
      helpState.sessionId,
      'tutorial_complete',
      'interactive_tutorial',
      completionData
    )
  }, [
    tutorialId,
    tutorialState.completedSteps,
    tutorialState.skippedSteps,
    tutorialState.interactions,
    tutorialState.startTime,
    steps.length,
    onComplete,
    trackInteraction,
    helpState.sessionId,
  ])

  const exitTutorial = useCallback(
    (reason = 'manual') => {
      ElementHighlighter.removeHighlight()

      setTutorialState((prev) => ({
        ...prev,
        isActive: false,
        isPaused: false,
      }))

      onExit?.(reason)
      trackInteraction('exit', `tutorial_${tutorialId}`, { reason })

      helpAnalytics.trackHelpInteraction(
        tutorialId,
        helpState.sessionId,
        'tutorial_exit',
        'interactive_tutorial',
        { reason, step: currentStep?.id }
      )
    },
    [tutorialId, onExit, trackInteraction, helpState.sessionId, currentStep?.id]
  )

  // ========================
  // STEP NAVIGATION
  // ========================

  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex < 0 || stepIndex >= steps.length) return

      const step = steps[stepIndex]
      setTutorialState((prev) => ({
        ...prev,
        currentStepIndex: stepIndex,
      }))

      onStepChange?.(stepIndex, step)
      trackInteraction('step_change', `tutorial_${tutorialId}`, {
        stepIndex,
        stepId: step.id,
      })

      // Highlight new step after delay
      setTimeout(() => {
        highlightCurrentStep()
      }, highlightDelay)
    },
    [steps, onStepChange, trackInteraction, tutorialId, highlightDelay]
  )

  const nextStep = useCallback(() => {
    if (!currentStep || !canGoNext) return

    // Mark current step as completed
    setTutorialState((prev) => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, currentStep.id]),
      interactions: [
        ...prev.interactions,
        {
          stepId: currentStep.id,
          action: 'complete',
          timestamp: new Date(),
        },
      ],
    }))

    // Check for completion
    if (tutorialState.currentStepIndex === steps.length - 1) {
      completeTutorial()
      return
    }

    // Handle branches
    if (currentStep.branches) {
      const branch = currentStep.branches.find((b) => b.condition())
      if (branch) {
        const nextStepIndex = steps.findIndex((s) => s.id === branch.nextStepId)
        if (nextStepIndex !== -1) {
          goToStep(nextStepIndex)
          return
        }
      }
    }

    // Handle direct next step ID
    if (currentStep.nextStepId) {
      const nextStepIndex = steps.findIndex((s) => s.id === currentStep.nextStepId)
      if (nextStepIndex !== -1) {
        goToStep(nextStepIndex)
        return
      }
    }

    // Default to next sequential step
    goToStep(tutorialState.currentStepIndex + 1)
  }, [currentStep, canGoNext, tutorialState.currentStepIndex, steps, completeTutorial, goToStep])

  const previousStep = useCallback(() => {
    if (!canGoPrevious) return

    goToStep(tutorialState.currentStepIndex - 1)
  }, [canGoPrevious, goToStep, tutorialState.currentStepIndex])

  const skipStep = useCallback(
    (reason = 'user_skip') => {
      if (!currentStep || currentStep.canSkip === false) return

      setTutorialState((prev) => ({
        ...prev,
        skippedSteps: new Set([...prev.skippedSteps, currentStep.id]),
      }))

      onSkip?.(reason)
      trackInteraction('skip', `tutorial_${tutorialId}`, {
        stepId: currentStep.id,
        reason,
      })

      nextStep()
    },
    [currentStep, onSkip, trackInteraction, tutorialId, nextStep]
  )

  // ========================
  // ELEMENT HIGHLIGHTING
  // ========================

  const highlightCurrentStep = useCallback(() => {
    if (!currentStep || tutorialState.isPaused) return

    ElementHighlighter.removeHighlight()

    let targetElement: HTMLElement | null = null

    // Get target element
    if (currentStep.targetElement) {
      targetElement = currentStep.targetElement
    } else if (currentStep.targetSelector) {
      targetElement = document.querySelector(currentStep.targetSelector) as HTMLElement
    }

    if (targetElement && currentStep.highlightType !== 'none') {
      ElementHighlighter.highlight(targetElement, currentStep.highlightType)
      setTutorialState((prev) => ({ ...prev, highlightedElement: targetElement }))
    }
  }, [currentStep, tutorialState.isPaused])

  // ========================
  // VALIDATION
  // ========================

  const validateStep = useCallback(async () => {
    if (!currentStep?.validationFn) return true

    setTutorialState((prev) => ({ ...prev, isValidating: true }))

    try {
      const isValid = await currentStep.validationFn()

      if (isValid) {
        setTutorialState((prev) => ({
          ...prev,
          completedSteps: new Set([...prev.completedSteps, currentStep.id]),
          isValidating: false,
        }))
      } else {
        setTutorialState((prev) => ({ ...prev, isValidating: false }))
      }

      return isValid
    } catch (error) {
      console.error('Step validation error:', error)
      setTutorialState((prev) => ({ ...prev, isValidating: false }))
      return false
    }
  }, [currentStep])

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    if (autoStart && !tutorialState.isActive) {
      startTutorial()
    }
  }, [autoStart, tutorialState.isActive, startTutorial])

  useEffect(() => {
    if (tutorialState.isActive && !tutorialState.isPaused) {
      highlightCurrentStep()
    }

    return () => {
      ElementHighlighter.removeHighlight()
    }
  }, [
    tutorialState.isActive,
    tutorialState.isPaused,
    tutorialState.currentStepIndex,
    highlightCurrentStep,
  ])

  useEffect(() => {
    if (validationMode === 'automatic' && currentStep?.validationFn) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }

      validationTimeoutRef.current = setTimeout(() => {
        validateStep()
      }, 1000)
    }

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [validationMode, currentStep, validateStep])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderStepContent = () => {
    if (!currentStep) return null

    return (
      <div className='space-y-4'>
        {/* Step header */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            {showStepNumbers && (
              <Badge variant='secondary' className='h-6 w-6 rounded-full p-0 text-xs'>
                {tutorialState.currentStepIndex + 1}
              </Badge>
            )}
            <h3 className='font-semibold text-sm'>{currentStep.title}</h3>
          </div>

          {currentStep.estimatedTime && (
            <p className='text-muted-foreground text-xs'>~{currentStep.estimatedTime}s</p>
          )}
        </div>

        {/* Step content */}
        <div className='text-sm'>
          {typeof currentStep.content === 'string' ? (
            <p>{currentStep.content}</p>
          ) : (
            currentStep.content
          )}
        </div>

        {/* Tips */}
        {currentStep.tips && currentStep.tips.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-muted-foreground text-xs uppercase tracking-wide'>
              Tips
            </h4>
            <ul className='space-y-1'>
              {currentStep.tips.map((tip, index) => (
                <li key={index} className='text-muted-foreground text-xs'>
                  • {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {currentStep.warnings && currentStep.warnings.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-xs text-yellow-700 uppercase tracking-wide'>
              Important
            </h4>
            <ul className='space-y-1'>
              {currentStep.warnings.map((warning, index) => (
                <li key={index} className='text-xs text-yellow-700'>
                  ⚠ {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resources */}
        {currentStep.resources && currentStep.resources.length > 0 && (
          <div className='space-y-2'>
            <h4 className='font-medium text-muted-foreground text-xs uppercase tracking-wide'>
              Resources
            </h4>
            <div className='space-y-1'>
              {currentStep.resources.map((resource) => (
                <Button
                  key={resource.id}
                  variant='ghost'
                  size='sm'
                  onClick={() => window.open(resource.url, '_blank')}
                  className='h-auto justify-start p-2 text-xs'
                >
                  <EyeIcon className='mr-2 h-3 w-3' />
                  {resource.title}
                  <ChevronRightIcon className='ml-auto h-3 w-3' />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Validation status */}
        {tutorialState.isValidating && (
          <div className='flex items-center gap-2 rounded bg-blue-50 p-2'>
            <div className='h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
            <span className='text-blue-700 text-xs'>Validating...</span>
          </div>
        )}

        {validationMode === 'manual' && currentStep.validationFn && (
          <Button
            variant='outline'
            size='sm'
            onClick={validateStep}
            disabled={tutorialState.isValidating}
            className='w-full'
          >
            {tutorialState.isValidating ? (
              <>
                <div className='mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
                Validating...
              </>
            ) : (
              <>
                <CheckCircleIcon className='mr-2 h-3 w-3' />
                Validate Step
              </>
            )}
          </Button>
        )}
      </div>
    )
  }

  const renderTutorial = () => {
    if (!tutorialState.isActive || tutorialState.isPaused) {
      return null
    }

    return (
      <motion.div
        ref={tutorialRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed z-50',
          variant === 'overlay' && 'shadow-lg',
          position === 'top-left' && 'top-4 left-4',
          position === 'top-right' && 'top-4 right-4',
          position === 'bottom-left' && 'bottom-4 left-4',
          position === 'bottom-right' && 'right-4 bottom-4',
          position === 'center' && '-translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2',
          className
        )}
        style={{ maxWidth }}
      >
        <Card className='border-2'>
          {/* Header */}
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0 flex-1'>
                <h2 className='font-semibold text-base leading-tight'>{title}</h2>
                {description && <p className='mt-1 text-muted-foreground text-sm'>{description}</p>}
              </div>

              <div className='flex items-center gap-1'>
                {allowPause && (
                  <Button variant='ghost' size='sm' onClick={pauseTutorial} className='h-6 w-6 p-0'>
                    <PauseIcon className='h-3 w-3' />
                  </Button>
                )}

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => exitTutorial('manual')}
                  className='h-6 w-6 p-0'
                >
                  <XIcon className='h-3 w-3' />
                </Button>
              </div>
            </div>

            {/* Progress */}
            {showProgress && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground'>
                    Step {tutorialState.currentStepIndex + 1} of {steps.length}
                  </span>
                  <span className='text-muted-foreground'>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className='h-1' />
              </div>
            )}
          </CardHeader>

          {/* Content */}
          <CardContent className='pb-4'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={tutorialState.currentStepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          {/* Footer */}
          <CardFooter className='pt-0'>
            <div className='flex w-full items-center justify-between gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={previousStep}
                disabled={!canGoPrevious}
                className='h-8'
              >
                <ArrowLeftIcon className='mr-1 h-3 w-3' />
                Back
              </Button>

              <div className='flex items-center gap-2'>
                {/* Custom actions */}
                {customActions
                  .filter((action) => !action.visible || action.visible(currentStep!))
                  .map((action) => (
                    <Button
                      key={action.id}
                      variant='ghost'
                      size='sm'
                      onClick={() => action.action(currentStep!)}
                      className='h-8'
                    >
                      {action.icon && <span className='mr-1'>{action.icon}</span>}
                      {action.label}
                    </Button>
                  ))}

                {/* Skip button */}
                {allowSkip && currentStep?.canSkip !== false && (
                  <Button variant='ghost' size='sm' onClick={() => skipStep()} className='h-8'>
                    <SkipForwardIcon className='mr-1 h-3 w-3' />
                    Skip
                  </Button>
                )}

                {/* Next button */}
                <Button
                  variant='default'
                  size='sm'
                  onClick={nextStep}
                  disabled={!canGoNext}
                  className='h-8'
                >
                  {tutorialState.currentStepIndex === steps.length - 1 ? 'Complete' : 'Next'}
                  {tutorialState.currentStepIndex < steps.length - 1 && (
                    <ArrowRightIcon className='ml-1 h-3 w-3' />
                  )}
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    )
  }

  const renderPausedState = () => {
    if (!tutorialState.isPaused) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'fixed z-50',
          position === 'top-left' && 'top-4 left-4',
          position === 'top-right' && 'top-4 right-4',
          position === 'bottom-left' && 'bottom-4 left-4',
          position === 'bottom-right' && 'right-4 bottom-4',
          position === 'center' && '-translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2'
        )}
        style={{ maxWidth: 280 }}
      >
        <Card>
          <CardContent className='p-4 text-center'>
            <PauseIcon className='mx-auto mb-3 h-8 w-8 text-muted-foreground' />
            <h3 className='mb-2 font-medium'>Tutorial Paused</h3>
            <p className='mb-4 text-muted-foreground text-sm'>
              Resume when you're ready to continue.
            </p>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={resumeTutorial} className='flex-1'>
                <PlayIcon className='mr-1 h-3 w-3' />
                Resume
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => exitTutorial('paused')}
                className='flex-1'
              >
                Exit
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // ========================
  // RENDER
  // ========================

  return (
    <AnimatePresence>
      {tutorialState.isActive && (
        <>
          {renderTutorial()}
          {renderPausedState()}
        </>
      )}
    </AnimatePresence>
  )
}

// ========================
// EXPORTS
// ========================

export default InteractiveTutorial
export type {
  InteractiveTutorialProps,
  TutorialStep,
  CompletionData,
  TutorialInteraction,
  CustomAction,
  Resource,
  StepBranch,
}
