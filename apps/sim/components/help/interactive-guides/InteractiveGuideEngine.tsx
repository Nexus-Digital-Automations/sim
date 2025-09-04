/**
 * Interactive Guide Engine - Step-by-step interactive workflow guides
 *
 * Features:
 * - Context-aware step-by-step guidance system
 * - Real-time workflow state validation
 * - Interactive overlays with element highlighting
 * - Branching guide paths based on user choices
 * - Progress tracking and completion analytics
 * - Integration with video tutorials and help content
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  HelpCircleIcon,
  LightbulbIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface InteractiveGuide {
  id: string
  title: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number

  // Guide structure
  steps: GuideStep[]
  branches: GuideBranch[]
  prerequisites: string[]
  objectives: string[]

  // Context and triggers
  contextTriggers: ContextTrigger[]
  workflowStates: WorkflowStateCondition[]

  // Resources
  relatedTutorials: string[]
  helpLinks: HelpLink[]

  // Metadata
  author: string
  version: string
  createdAt: string
  updatedAt: string
}

export interface GuideStep {
  id: string
  title: string
  description: string
  content: string

  // Step behavior
  type: 'instruction' | 'action' | 'validation' | 'decision' | 'information'
  isOptional: boolean
  canSkip: boolean

  // UI interaction
  targetElement?: string
  highlightType: 'none' | 'outline' | 'spotlight' | 'overlay'
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'

  // Step progression
  nextStepId?: string
  conditions: StepCondition[]

  // Content enhancement
  media: MediaContent[]
  hints: string[]
  troubleshooting: TroubleshootingTip[]

  // Validation
  validationRules: ValidationRule[]
  successCriteria: string[]
  errorHandling: ErrorHandling[]
}

export interface GuideBranch {
  id: string
  name: string
  condition: string
  description: string
  steps: string[]
  rejoinsAt?: string
}

export interface StepCondition {
  type: 'user_action' | 'workflow_state' | 'element_exists' | 'custom_validation'
  condition: string
  value?: any
  message?: string
}

export interface MediaContent {
  id: string
  type: 'image' | 'video' | 'gif' | 'diagram'
  url: string
  alt: string
  caption?: string
}

export interface TroubleshootingTip {
  problem: string
  solution: string
  additionalHelp?: string
}

export interface ValidationRule {
  type: 'workflow_validation' | 'element_validation' | 'state_validation'
  rule: string
  errorMessage: string
  successMessage: string
}

export interface ErrorHandling {
  errorType: string
  message: string
  suggestedAction: string
  recoverySteps: string[]
}

export interface HelpLink {
  title: string
  url: string
  type: 'documentation' | 'tutorial' | 'community' | 'support'
}

export interface ContextTrigger {
  type: 'workflow_state' | 'user_action' | 'error_condition' | 'help_request'
  condition: string
  priority: number
}

export interface WorkflowStateCondition {
  state: string
  condition: string
  relevanceScore: number
}

export interface GuideProgress {
  guideId: string
  currentStepId: string
  completedSteps: string[]
  skippedSteps: string[]
  startedAt: string
  lastActivity: string
  completionPercent: number
  totalTimeSpent: number
  branchPath: string[]
  isCompleted: boolean
  rating?: number
  feedback?: string
}

export interface InteractiveGuideEngineProps {
  guideId?: string
  autoStart?: boolean
  showProgress?: boolean
  allowSkipping?: boolean
  enableTroubleshooting?: boolean
  className?: string
  onComplete?: (guideId: string, progress: GuideProgress) => void
  onStepComplete?: (stepId: string, guideId: string) => void
  onError?: (error: string, context: any) => void
}

// ========================
// MOCK DATA - TO BE REPLACED WITH API CALLS
// ========================

const MOCK_GUIDES: Record<string, InteractiveGuide> = {
  'create-first-workflow': {
    id: 'create-first-workflow',
    title: 'Create Your First Workflow',
    description: 'Step-by-step guide to building your first automation workflow',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: 300,
    steps: [
      {
        id: 'step-1',
        title: 'Open Workflow Editor',
        description: 'Navigate to the workflow creation area',
        content: 'Click the "Create Workflow" button to open the editor',
        type: 'action',
        isOptional: false,
        canSkip: false,
        targetElement: '[data-testid="create-workflow-button"]',
        highlightType: 'spotlight',
        position: 'bottom',
        nextStepId: 'step-2',
        conditions: [
          {
            type: 'element_exists',
            condition: '[data-testid="workflow-editor"]',
            message: 'Workflow editor should be visible',
          },
        ],
        media: [
          {
            id: 'step-1-image',
            type: 'image',
            url: '/guides/images/create-workflow-button.png',
            alt: 'Create workflow button location',
          },
        ],
        hints: [
          'Look for the blue "Create Workflow" button in the main navigation',
          "If you don't see the button, try refreshing the page",
        ],
        troubleshooting: [
          {
            problem: 'Create Workflow button is not visible',
            solution: 'Make sure you are logged in and have the necessary permissions',
            additionalHelp: 'Contact support if the problem persists',
          },
        ],
        validationRules: [
          {
            type: 'element_validation',
            rule: 'editor-opened',
            errorMessage: 'Workflow editor did not open properly',
            successMessage: 'Great! The workflow editor is now open',
          },
        ],
        errorHandling: [
          {
            errorType: 'navigation_error',
            message: 'Unable to open workflow editor',
            suggestedAction: 'Try refreshing the page',
            recoverySteps: [
              'Refresh the browser page',
              'Clear browser cache if needed',
              'Contact support',
            ],
          },
        ],
      },
      {
        id: 'step-2',
        title: 'Add Starter Block',
        description: 'Every workflow needs a starting point',
        content: 'Drag a starter block from the block library to the canvas',
        type: 'action',
        isOptional: false,
        canSkip: false,
        targetElement: '[data-testid="block-library"]',
        highlightType: 'outline',
        position: 'right',
        nextStepId: 'step-3',
        conditions: [
          {
            type: 'workflow_state',
            condition: 'blocks.length > 0',
            message: 'At least one block should be added',
          },
        ],
        media: [],
        hints: [
          'Look for the starter block in the "Core" category',
          'You can drag and drop or click to add blocks',
        ],
        troubleshooting: [
          {
            problem: 'Cannot find the starter block',
            solution: 'Use the search box in the block library to find "starter"',
          },
        ],
        validationRules: [
          {
            type: 'workflow_validation',
            rule: 'has-starter-block',
            errorMessage: 'Starter block was not added to the workflow',
            successMessage: "Perfect! You've added your first block",
          },
        ],
        errorHandling: [],
      },
    ],
    branches: [
      {
        id: 'advanced-path',
        name: 'Advanced Configuration',
        condition: 'user.experience === "advanced"',
        description: 'Additional configuration steps for advanced users',
        steps: ['step-advanced-1', 'step-advanced-2'],
      },
    ],
    prerequisites: [],
    objectives: [
      'Learn to navigate the workflow editor',
      'Add your first workflow block',
      'Understand basic workflow concepts',
    ],
    contextTriggers: [
      {
        type: 'workflow_state',
        condition: 'empty_canvas',
        priority: 1,
      },
    ],
    workflowStates: [
      {
        state: 'empty',
        condition: 'blocks.length === 0',
        relevanceScore: 1.0,
      },
    ],
    relatedTutorials: ['tutorial-1'],
    helpLinks: [
      {
        title: 'Workflow Basics Documentation',
        url: '/docs/workflows/basics',
        type: 'documentation',
      },
    ],
    author: 'Sim Team',
    version: '1.0',
    createdAt: '2025-01-04T10:00:00Z',
    updatedAt: '2025-01-04T10:00:00Z',
  },
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Interactive Guide Engine Component
 *
 * Provides step-by-step interactive guidance with context awareness,
 * element highlighting, and real-time validation.
 */
export function InteractiveGuideEngine({
  guideId,
  autoStart = false,
  showProgress = true,
  allowSkipping = true,
  enableTroubleshooting = true,
  className,
  onComplete,
  onStepComplete,
  onError,
}: InteractiveGuideEngineProps) {
  const { state: helpState } = useHelp()

  // Core state
  const [guide, setGuide] = useState<InteractiveGuide | null>(null)
  const [currentStep, setCurrentStep] = useState<GuideStep | null>(null)
  const [progress, setProgress] = useState<GuideProgress | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // UI state
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const [showHints, setShowHints] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null)
  const stepTimerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // ========================
  // GUIDE LIFECYCLE
  // ========================

  const loadGuide = useCallback(
    async (id: string) => {
      setIsLoading(true)
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/help/guides/${id}`)
        // const guideData = await response.json()

        const guideData = MOCK_GUIDES[id]
        if (!guideData) {
          throw new Error(`Guide not found: ${id}`)
        }

        setGuide(guideData)

        // Initialize progress
        const initialProgress: GuideProgress = {
          guideId: id,
          currentStepId: guideData.steps[0]?.id || '',
          completedSteps: [],
          skippedSteps: [],
          startedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          completionPercent: 0,
          totalTimeSpent: 0,
          branchPath: [],
          isCompleted: false,
        }

        setProgress(initialProgress)
        setCurrentStep(guideData.steps[0] || null)

        // Track guide start
        helpAnalytics.trackHelpInteraction(
          id,
          helpState.sessionId,
          'guide_start',
          'interactive_guide',
          { guideTitle: guideData.title }
        )
      } catch (error) {
        console.error('Error loading guide:', error)
        onError?.(error instanceof Error ? error.message : 'Failed to load guide', { guideId: id })
      } finally {
        setIsLoading(false)
      }
    },
    [helpState.sessionId, onError]
  )

  const startGuide = useCallback(() => {
    if (!guide || !currentStep) return

    setIsActive(true)
    setIsPaused(false)
    startTimeRef.current = Date.now()

    // Start step timer
    if (stepTimerRef.current) clearInterval(stepTimerRef.current)
    stepTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          totalTimeSpent: prev.totalTimeSpent + 1,
          lastActivity: new Date().toISOString(),
        }
      })
    }, 1000)

    highlightTargetElement(currentStep)
  }, [guide, currentStep])

  const pauseGuide = useCallback(() => {
    setIsPaused(true)
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current)
      stepTimerRef.current = null
    }
    removeHighlight()
  }, [])

  const resumeGuide = useCallback(() => {
    setIsPaused(false)
    startGuide()
  }, [startGuide])

  const stopGuide = useCallback(() => {
    setIsActive(false)
    setIsPaused(false)
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current)
      stepTimerRef.current = null
    }
    removeHighlight()

    if (guide) {
      helpAnalytics.trackHelpInteraction(
        guide.id,
        helpState.sessionId,
        'guide_stop',
        'interactive_guide',
        {
          completedSteps: progress?.completedSteps.length || 0,
          totalSteps: guide.steps.length,
          timeSpent: progress?.totalTimeSpent || 0,
        }
      )
    }
  }, [guide, progress, helpState.sessionId])

  // ========================
  // STEP NAVIGATION
  // ========================

  const goToStep = useCallback(
    (stepId: string) => {
      if (!guide) return

      const step = guide.steps.find((s) => s.id === stepId)
      if (!step) return

      // Update progress
      setProgress((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          currentStepId: stepId,
          lastActivity: new Date().toISOString(),
        }
      })

      setCurrentStep(step)
      setValidationErrors([])
      setShowHints(false)
      setShowTroubleshooting(false)

      // Highlight target element
      if (isActive && !isPaused) {
        highlightTargetElement(step)
      }

      // Track step navigation
      helpAnalytics.trackHelpInteraction(
        guide.id,
        helpState.sessionId,
        'guide_step_change',
        'interactive_guide',
        { stepId, stepTitle: step.title }
      )
    },
    [guide, isActive, isPaused, helpState.sessionId]
  )

  const nextStep = useCallback(() => {
    if (!guide || !currentStep || !progress) return

    // Validate current step before proceeding
    const isValid = validateStep(currentStep)
    if (!isValid && !currentStep.canSkip) {
      return
    }

    // Mark current step as completed
    const updatedProgress = {
      ...progress,
      completedSteps: [...progress.completedSteps, currentStep.id],
      completionPercent: ((progress.completedSteps.length + 1) / guide.steps.length) * 100,
    }
    setProgress(updatedProgress)

    // Track step completion
    onStepComplete?.(currentStep.id, guide.id)
    helpAnalytics.trackHelpInteraction(
      guide.id,
      helpState.sessionId,
      'guide_step_complete',
      'interactive_guide',
      { stepId: currentStep.id, stepTitle: currentStep.title }
    )

    // Find next step
    const nextStepId = currentStep.nextStepId || findNextStep(currentStep.id)
    if (nextStepId) {
      goToStep(nextStepId)
    } else {
      // Guide completed
      completeGuide()
    }
  }, [guide, currentStep, progress, helpState.sessionId, onStepComplete])

  const skipStep = useCallback(() => {
    if (!currentStep || !allowSkipping || !progress) return

    // Mark step as skipped
    setProgress((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        skippedSteps: [...prev.skippedSteps, currentStep.id],
      }
    })

    // Track step skip
    helpAnalytics.trackHelpInteraction(
      guide?.id || '',
      helpState.sessionId,
      'guide_step_skip',
      'interactive_guide',
      { stepId: currentStep.id, stepTitle: currentStep.title }
    )

    // Move to next step
    const nextStepId = currentStep.nextStepId || findNextStep(currentStep.id)
    if (nextStepId) {
      goToStep(nextStepId)
    } else {
      completeGuide()
    }
  }, [currentStep, allowSkipping, progress, guide?.id, helpState.sessionId])

  const completeGuide = useCallback(() => {
    if (!guide || !progress) return

    const finalProgress = {
      ...progress,
      isCompleted: true,
      completionPercent: 100,
      lastActivity: new Date().toISOString(),
    }

    setProgress(finalProgress)
    setIsActive(false)
    removeHighlight()

    // Track completion
    helpAnalytics.trackHelpInteraction(
      guide.id,
      helpState.sessionId,
      'guide_complete',
      'interactive_guide',
      {
        totalSteps: guide.steps.length,
        completedSteps: finalProgress.completedSteps.length,
        skippedSteps: finalProgress.skippedSteps.length,
        totalTime: finalProgress.totalTimeSpent,
      }
    )

    onComplete?.(guide.id, finalProgress)
  }, [guide, progress, helpState.sessionId, onComplete])

  // ========================
  // STEP VALIDATION
  // ========================

  const validateStep = useCallback((step: GuideStep): boolean => {
    const errors: string[] = []

    // Check step conditions
    for (const condition of step.conditions) {
      try {
        const isValid = evaluateCondition(condition)
        if (!isValid) {
          errors.push(condition.message || `Condition failed: ${condition.condition}`)
        }
      } catch (error) {
        errors.push(`Validation error: ${error}`)
      }
    }

    // Check validation rules
    for (const rule of step.validationRules) {
      try {
        const isValid = evaluateValidationRule(rule)
        if (!isValid) {
          errors.push(rule.errorMessage)
        }
      } catch (error) {
        errors.push(`Validation error: ${rule.errorMessage}`)
      }
    }

    setValidationErrors(errors)
    return errors.length === 0
  }, [])

  const evaluateCondition = useCallback((condition: StepCondition): boolean => {
    // TODO: Implement actual condition evaluation based on workflow state
    switch (condition.type) {
      case 'element_exists':
        return document.querySelector(condition.condition) !== null
      case 'workflow_state':
        // Mock validation for demonstration
        return true
      case 'user_action':
        // Mock validation for demonstration
        return true
      default:
        return true
    }
  }, [])

  const evaluateValidationRule = useCallback((rule: ValidationRule): boolean => {
    // TODO: Implement actual validation rule evaluation
    switch (rule.type) {
      case 'element_validation':
        return true // Mock validation
      case 'workflow_validation':
        return true // Mock validation
      case 'state_validation':
        return true // Mock validation
      default:
        return true
    }
  }, [])

  // ========================
  // ELEMENT HIGHLIGHTING
  // ========================

  const highlightTargetElement = useCallback((step: GuideStep) => {
    removeHighlight()

    if (!step.targetElement || step.highlightType === 'none') return

    const element = document.querySelector(step.targetElement) as HTMLElement
    if (!element) return

    setHighlightedElement(element)

    // Apply highlight styling based on type
    switch (step.highlightType) {
      case 'outline':
        element.style.outline = '2px solid #3b82f6'
        element.style.outlineOffset = '2px'
        break
      case 'spotlight':
        // Create spotlight effect with overlay
        createSpotlightOverlay(element)
        break
      case 'overlay':
        element.style.position = 'relative'
        element.style.zIndex = '1000'
        break
    }

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const removeHighlight = useCallback(() => {
    if (highlightedElement) {
      highlightedElement.style.outline = ''
      highlightedElement.style.outlineOffset = ''
      highlightedElement.style.position = ''
      highlightedElement.style.zIndex = ''
      setHighlightedElement(null)
    }

    // Remove spotlight overlay
    const overlay = document.getElementById('guide-spotlight-overlay')
    if (overlay) {
      overlay.remove()
    }
  }, [highlightedElement])

  const createSpotlightOverlay = useCallback((element: HTMLElement) => {
    const overlay = document.createElement('div')
    overlay.id = 'guide-spotlight-overlay'
    overlay.className = 'fixed inset-0 bg-black/50 pointer-events-none z-40'

    const rect = element.getBoundingClientRect()
    const spotlight = document.createElement('div')
    spotlight.className = 'absolute bg-white rounded-lg'
    spotlight.style.left = `${rect.left - 8}px`
    spotlight.style.top = `${rect.top - 8}px`
    spotlight.style.width = `${rect.width + 16}px`
    spotlight.style.height = `${rect.height + 16}px`
    spotlight.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)'

    overlay.appendChild(spotlight)
    document.body.appendChild(overlay)
  }, [])

  // ========================
  // UTILITY FUNCTIONS
  // ========================

  const findNextStep = useCallback(
    (currentStepId: string): string | null => {
      if (!guide) return null

      const currentIndex = guide.steps.findIndex((s) => s.id === currentStepId)
      if (currentIndex === -1 || currentIndex >= guide.steps.length - 1) return null

      return guide.steps[currentIndex + 1].id
    },
    [guide]
  )

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    if (guideId) {
      loadGuide(guideId)
    }
  }, [guideId, loadGuide])

  useEffect(() => {
    if (autoStart && guide && !isActive) {
      startGuide()
    }
  }, [autoStart, guide, isActive, startGuide])

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current)
      }
      removeHighlight()
    }
  }, [removeHighlight])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderStepContent = () => {
    if (!currentStep) return null

    return (
      <div className='space-y-4'>
        {/* Step header */}
        <div>
          <h3 className='flex items-center font-semibold text-lg'>
            {currentStep.title}
            {currentStep.type === 'action' && <ArrowRightIcon className='ml-2 h-4 w-4' />}
            {currentStep.type === 'validation' && <CheckCircleIcon className='ml-2 h-4 w-4' />}
            {currentStep.type === 'information' && <HelpCircleIcon className='ml-2 h-4 w-4' />}
          </h3>
          <p className='text-muted-foreground text-sm'>{currentStep.description}</p>
        </div>

        {/* Step content */}
        <div className='text-sm'>{currentStep.content}</div>

        {/* Media content */}
        {currentStep.media.length > 0 && (
          <div className='space-y-2'>
            {currentStep.media.map((media) => (
              <div key={media.id}>
                {media.type === 'image' && (
                  <img src={media.url} alt={media.alt} className='h-auto max-w-full rounded-md' />
                )}
                {media.caption && (
                  <p className='mt-1 text-muted-foreground text-xs'>{media.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className='rounded-md border border-red-200 bg-red-50 p-3'>
            <div className='mb-2 flex items-center'>
              <AlertTriangleIcon className='mr-2 h-4 w-4 text-red-600' />
              <span className='font-medium text-red-800 text-sm'>Issues Found</span>
            </div>
            <ul className='space-y-1 text-red-700 text-sm'>
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Hints */}
        {showHints && currentStep.hints.length > 0 && (
          <div className='rounded-md border border-blue-200 bg-blue-50 p-3'>
            <div className='mb-2 flex items-center'>
              <LightbulbIcon className='mr-2 h-4 w-4 text-blue-600' />
              <span className='font-medium text-blue-800 text-sm'>Helpful Hints</span>
            </div>
            <ul className='space-y-1 text-blue-700 text-sm'>
              {currentStep.hints.map((hint, index) => (
                <li key={index}>• {hint}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Troubleshooting */}
        {showTroubleshooting && enableTroubleshooting && currentStep.troubleshooting.length > 0 && (
          <div className='rounded-md border border-yellow-200 bg-yellow-50 p-3'>
            <div className='mb-2 flex items-center'>
              <HelpCircleIcon className='mr-2 h-4 w-4 text-yellow-600' />
              <span className='font-medium text-sm text-yellow-800'>Troubleshooting</span>
            </div>
            <div className='space-y-3'>
              {currentStep.troubleshooting.map((tip, index) => (
                <div key={index} className='text-sm'>
                  <p className='font-medium text-yellow-800'>{tip.problem}</p>
                  <p className='text-yellow-700'>{tip.solution}</p>
                  {tip.additionalHelp && (
                    <p className='mt-1 text-xs text-yellow-600'>{tip.additionalHelp}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderControls = () => {
    if (!guide || !progress) return null

    return (
      <div className='flex items-center justify-between border-t pt-4'>
        {/* Left controls */}
        <div className='flex items-center space-x-2'>
          {!isActive ? (
            <Button onClick={startGuide} size='sm'>
              <PlayIcon className='mr-2 h-4 w-4' />
              Start Guide
            </Button>
          ) : isPaused ? (
            <Button onClick={resumeGuide} size='sm'>
              <PlayIcon className='mr-2 h-4 w-4' />
              Resume
            </Button>
          ) : (
            <Button onClick={pauseGuide} variant='outline' size='sm'>
              <PauseIcon className='mr-2 h-4 w-4' />
              Pause
            </Button>
          )}

          <Button onClick={stopGuide} variant='outline' size='sm'>
            <XIcon className='mr-2 h-4 w-4' />
            Stop
          </Button>

          <Button onClick={() => loadGuide(guide.id)} variant='outline' size='sm'>
            <RefreshCwIcon className='mr-2 h-4 w-4' />
            Restart
          </Button>
        </div>

        {/* Right controls */}
        <div className='flex items-center space-x-2'>
          {currentStep?.hints.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='sm' onClick={() => setShowHints(!showHints)}>
                    <LightbulbIcon className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show hints</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {enableTroubleshooting && currentStep?.troubleshooting.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  >
                    <HelpCircleIcon className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Get help</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {currentStep?.canSkip && allowSkipping && (
            <Button onClick={skipStep} variant='outline' size='sm'>
              Skip
            </Button>
          )}

          <Button onClick={nextStep} size='sm'>
            {progress.completedSteps.length >= guide.steps.length - 1 ? 'Complete' : 'Next'}
            <ArrowRightIcon className='ml-2 h-4 w-4' />
          </Button>
        </div>
      </div>
    )
  }

  // ========================
  // MAIN RENDER
  // ========================

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className='flex items-center justify-center p-8'>
          <div className='h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent' />
          <span className='ml-2'>Loading guide...</span>
        </CardContent>
      </Card>
    )
  }

  if (!guide) {
    return (
      <Card className={className}>
        <CardContent className='flex items-center justify-center p-8'>
          <p className='text-muted-foreground'>No guide selected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('relative', className)}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center'>
              <BookOpenIcon className='mr-2 h-5 w-5' />
              {guide.title}
            </CardTitle>
            <p className='mt-1 text-muted-foreground text-sm'>{guide.description}</p>
          </div>

          <div className='flex items-center space-x-2'>
            <Badge variant={guide.difficulty === 'beginner' ? 'default' : 'secondary'}>
              {guide.difficulty}
            </Badge>
            <Badge variant='outline'>{formatTime(guide.estimatedTime)}</Badge>
            {progress && (
              <Badge variant='outline'>
                {progress.completedSteps.length} / {guide.steps.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && progress && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span>Progress</span>
              <span>{Math.round(progress.completionPercent)}%</span>
            </div>
            <Progress value={progress.completionPercent} className='h-2' />
          </div>
        )}
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Current step content */}
        {currentStep && renderStepContent()}

        {/* Controls */}
        {renderControls()}

        {/* Guide objectives */}
        {guide.objectives.length > 0 && (
          <div className='mt-6 border-t pt-4'>
            <h4 className='mb-2 font-medium text-sm'>What you'll learn:</h4>
            <ul className='space-y-1 text-muted-foreground text-sm'>
              {guide.objectives.map((objective, index) => (
                <li key={index} className='flex items-center'>
                  <CheckCircleIcon className='mr-2 h-3 w-3' />
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ========================
// EXPORTS
// ========================

export default InteractiveGuideEngine
export type { InteractiveGuide, GuideStep, GuideProgress, InteractiveGuideEngineProps }
