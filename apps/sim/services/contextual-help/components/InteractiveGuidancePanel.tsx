/**
 * Interactive Guidance Panel Component
 *
 * Step-by-step interactive guidance panel that provides contextual
 * tutorials and help workflows with progress tracking.
 *
 * @author Contextual Help Agent
 * @version 1.0.0
 */

import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { GuidanceStep, GuidanceTutorial, InteractiveElement } from '../types'
import { useContextualHelp } from './ContextualHelpProvider'

export interface InteractiveGuidancePanelProps {
  // Core Props
  isVisible: boolean
  onClose?: () => void

  // Tutorial Props
  tutorialId?: string
  autoStart?: boolean

  // UI Props
  position?: 'left' | 'right' | 'bottom' | 'center'
  width?: number | string
  height?: number | string
  minimizable?: boolean
  draggable?: boolean

  // Behavior
  allowSkip?: boolean
  autoAdvance?: boolean
  showProgress?: boolean
  pauseOnUnfocus?: boolean

  // Styling
  theme?: 'light' | 'dark' | 'auto'
  className?: string
  style?: React.CSSProperties

  // Callbacks
  onStepChange?: (stepIndex: number, step: GuidanceStep) => void
  onTutorialComplete?: (tutorial: GuidanceTutorial) => void
  onTutorialSkip?: () => void
}

export function InteractiveGuidancePanel({
  isVisible,
  onClose,
  tutorialId,
  autoStart = false,
  position = 'right',
  width = 400,
  height = 'auto',
  minimizable = true,
  draggable = false,
  allowSkip = true,
  autoAdvance = false,
  showProgress = true,
  pauseOnUnfocus = true,
  theme = 'auto',
  className = '',
  style,
  onStepChange,
  onTutorialComplete,
  onTutorialSkip,
}: InteractiveGuidancePanelProps) {
  const {
    state,
    startGuidance,
    nextGuidanceStep,
    previousGuidanceStep,
    endGuidance,
    submitFeedback,
  } = useContextualHelp()

  // State
  const [isMinimized, setIsMinimized] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null)
  const [completionFeedback, setCompletionFeedback] = useState<{
    rating?: number
    comment?: string
  }>({})

  const { activeGuidance } = state
  const currentTutorial = activeGuidance.tutorial
  const currentStep = currentTutorial?.steps[activeGuidance.currentStepIndex]
  const isLastStep =
    currentTutorial && activeGuidance.currentStepIndex === currentTutorial.steps.length - 1
  const progressPercentage = currentTutorial
    ? ((activeGuidance.currentStepIndex + 1) / currentTutorial.steps.length) * 100
    : 0

  // Auto-start tutorial if specified
  useEffect(() => {
    if (autoStart && tutorialId && isVisible && !currentTutorial) {
      // We would need the tool context to start a tutorial
      // This is a placeholder for the actual implementation
    }
  }, [autoStart, tutorialId, isVisible, currentTutorial, startGuidance])

  // Auto-advance handling
  useEffect(() => {
    if (autoAdvance && currentStep?.timing?.autoAdvance && !isLastStep) {
      const timer = setTimeout(() => {
        nextGuidanceStep()
      }, currentStep.timing.autoAdvance)

      setAutoAdvanceTimer(timer)

      return () => {
        if (timer) clearTimeout(timer)
      }
    }
  }, [autoAdvance, currentStep, isLastStep, nextGuidanceStep])

  // Step change callback
  useEffect(() => {
    if (currentStep && onStepChange) {
      onStepChange(activeGuidance.currentStepIndex, currentStep)
    }
  }, [currentStep, activeGuidance.currentStepIndex, onStepChange])

  // Handle next step
  const handleNextStep = useCallback(async () => {
    if (!currentTutorial) return

    if (isLastStep) {
      // Tutorial completed
      onTutorialComplete?.(currentTutorial)

      // Show completion feedback form
      setCompletionFeedback({})
    } else {
      await nextGuidanceStep()
    }
  }, [currentTutorial, isLastStep, onTutorialComplete, nextGuidanceStep])

  // Handle previous step
  const handlePreviousStep = useCallback(async () => {
    if (activeGuidance.currentStepIndex > 0) {
      await previousGuidanceStep()
    }
  }, [activeGuidance.currentStepIndex, previousGuidanceStep])

  // Handle tutorial skip
  const handleSkipTutorial = useCallback(async () => {
    if (!allowSkip) return

    await endGuidance()
    onTutorialSkip?.()
  }, [allowSkip, endGuidance, onTutorialSkip])

  // Handle tutorial close
  const handleCloseTutorial = useCallback(async () => {
    await endGuidance()
    onClose?.()
  }, [endGuidance, onClose])

  // Handle step action execution
  const handleExecuteAction = useCallback(
    async (action: any) => {
      // This would integrate with the actual action execution system
      console.log('Executing step action:', action)

      // For now, just advance to next step
      setTimeout(handleNextStep, 1000)
    },
    [handleNextStep]
  )

  // Handle completion feedback submission
  const handleSubmitCompletionFeedback = useCallback(async () => {
    if (!currentTutorial || !state.userContext) return

    await submitFeedback({
      userId: state.userContext.userId,
      sessionId: state.userContext.sessionId,
      tutorialId: currentTutorial.id,
      type: 'completion',
      rating: completionFeedback.rating,
      comment: completionFeedback.comment,
      category: 'tutorial_completion',
    })

    handleCloseTutorial()
  }, [currentTutorial, state.userContext, completionFeedback, submitFeedback, handleCloseTutorial])

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable) return

      setIsDragging(true)
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [draggable]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !draggable) return

      // Update panel position based on mouse movement
      // This would be implemented with actual positioning logic
    },
    [isDragging, draggable]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Don't render if not visible or no tutorial
  if (!isVisible || !currentTutorial) {
    return null
  }

  return (
    <div
      className={`interactive-guidance-panel interactive-guidance-panel--${position} interactive-guidance-panel--${theme} ${
        isMinimized ? 'interactive-guidance-panel--minimized' : ''
      } ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
    >
      {/* Header */}
      <div className='interactive-guidance-panel__header' onMouseDown={handleMouseDown}>
        <div className='interactive-guidance-panel__title'>
          <h3>{currentTutorial.title}</h3>
          <span className='difficulty-badge difficulty-badge--{currentTutorial.difficulty}'>
            {currentTutorial.difficulty}
          </span>
        </div>

        <div className='interactive-guidance-panel__controls'>
          {minimizable && (
            <button
              className='panel-control-btn'
              onClick={() => setIsMinimized(!isMinimized)}
              aria-label={isMinimized ? 'Maximize panel' : 'Minimize panel'}
            >
              {isMinimized ? '◇' : '◈'}
            </button>
          )}

          <button
            className='panel-control-btn'
            onClick={handleCloseTutorial}
            aria-label='Close guidance'
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Progress Bar */}
          {showProgress && (
            <div className='interactive-guidance-panel__progress'>
              <div className='progress-bar' style={{ width: `${progressPercentage}%` }} />
              <span className='progress-text'>
                Step {activeGuidance.currentStepIndex + 1} of {currentTutorial.steps.length}
              </span>
            </div>
          )}

          {/* Tutorial Description */}
          {activeGuidance.currentStepIndex === 0 && (
            <div className='interactive-guidance-panel__description'>
              <p>{currentTutorial.description}</p>
              <div className='tutorial-meta'>
                <span className='estimated-time'>⏱️ ~{currentTutorial.estimatedDuration} min</span>
                {currentTutorial.prerequisites && currentTutorial.prerequisites.length > 0 && (
                  <div className='prerequisites'>
                    <strong>Prerequisites:</strong>
                    <ul>
                      {currentTutorial.prerequisites.map((prereq, index) => (
                        <li key={index}>{prereq}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Step Content */}
          {currentStep && (
            <div className='interactive-guidance-panel__step'>
              <div className='step-header'>
                <h4 className='step-title'>{currentStep.title}</h4>
                <span className='step-type step-type--{currentStep.type}'>{currentStep.type}</span>
              </div>

              <div className='step-content'>
                <p className='step-description'>{currentStep.description}</p>

                {currentStep.content.multimedia?.screenshot && (
                  <div className='step-media'>
                    <img
                      src={currentStep.content.multimedia.screenshot}
                      alt={`Step ${activeGuidance.currentStepIndex + 1} screenshot`}
                      className='step-screenshot'
                    />
                  </div>
                )}

                {currentStep.content.interactiveElements && (
                  <div className='step-interactive-elements'>
                    {currentStep.content.interactiveElements.map((element, index) => (
                      <InteractiveElementRenderer
                        key={element.id}
                        element={element}
                        onAction={handleExecuteAction}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Step Actions */}
              {currentStep.actions && currentStep.actions.length > 0 && (
                <div className='step-actions'>
                  <h5>Actions:</h5>
                  {currentStep.actions.map((action, index) => (
                    <button
                      key={index}
                      className='step-action-btn'
                      onClick={() => handleExecuteAction(action)}
                    >
                      {action.type}: {action.target}
                    </button>
                  ))}
                </div>
              )}

              {/* Auto-advance indicator */}
              {autoAdvance && currentStep.timing?.autoAdvance && (
                <div className='auto-advance-indicator'>
                  <span>Auto-advancing in {Math.ceil(currentStep.timing.autoAdvance / 1000)}s</span>
                  <button onClick={() => autoAdvanceTimer && clearTimeout(autoAdvanceTimer)}>
                    Pause
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className='interactive-guidance-panel__navigation'>
            <button
              className='nav-btn nav-btn--previous'
              onClick={handlePreviousStep}
              disabled={activeGuidance.currentStepIndex === 0}
            >
              ← Previous
            </button>

            <div className='nav-center'>
              {allowSkip && (
                <button className='nav-btn nav-btn--skip' onClick={handleSkipTutorial}>
                  Skip Tutorial
                </button>
              )}
            </div>

            <button className='nav-btn nav-btn--next' onClick={handleNextStep}>
              {isLastStep ? 'Complete' : 'Next →'}
            </button>
          </div>

          {/* Completion Feedback Form */}
          {isLastStep && Object.keys(completionFeedback).length === 0 && (
            <div className='completion-feedback'>
              <h4>How was this tutorial?</h4>
              <div className='rating-section'>
                <span>Rating:</span>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    className={`rating-btn ${completionFeedback.rating === rating ? 'selected' : ''}`}
                    onClick={() => setCompletionFeedback((prev) => ({ ...prev, rating }))}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className='comment-section'>
                <textarea
                  placeholder='Any additional feedback? (optional)'
                  value={completionFeedback.comment || ''}
                  onChange={(e) =>
                    setCompletionFeedback((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className='feedback-actions'>
                <button onClick={handleCloseTutorial}>Skip Feedback</button>
                <button
                  onClick={handleSubmitCompletionFeedback}
                  disabled={!completionFeedback.rating}
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Helper component for rendering interactive elements
interface InteractiveElementRendererProps {
  element: InteractiveElement
  onAction: (action: any) => void
}

function InteractiveElementRenderer({ element, onAction }: InteractiveElementRendererProps) {
  const handleElementAction = useCallback(() => {
    if (element.action) {
      onAction(element.action)
    }
  }, [element.action, onAction])

  switch (element.type) {
    case 'button':
      return (
        <button
          className='interactive-element interactive-element--button'
          onClick={handleElementAction}
          style={element.style}
        >
          {element.content}
        </button>
      )

    case 'highlight':
      return (
        <div
          className='interactive-element interactive-element--highlight'
          style={{
            position: 'absolute',
            ...element.style,
            border: '2px solid #ff6b35',
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
            pointerEvents: 'none',
          }}
        />
      )

    case 'tooltip':
      return (
        <div className='interactive-element interactive-element--tooltip' style={element.style}>
          {element.content}
        </div>
      )

    default:
      return (
        <div
          className={`interactive-element interactive-element--${element.type}`}
          onClick={handleElementAction}
          style={element.style}
        >
          {element.content}
        </div>
      )
  }
}

export default InteractiveGuidancePanel
