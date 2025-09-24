/**
 * Contextual Help Tooltip Component
 *
 * Intelligent tooltip that displays contextual help based on user actions
 * and expertise level. Supports accessibility and multiple delivery modes.
 *
 * @author Contextual Help Agent
 * @version 1.0.0
 */

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { HelpContent } from '../types'
import { useContextualHelp } from './ContextualHelpProvider'

export interface HelpTooltipProps {
  // Core Props
  toolId?: string
  toolName?: string
  currentAction?: string
  triggerElement?: string | HTMLElement

  // Content Props
  content?: string
  title?: string
  helpType?: 'tooltip' | 'popover' | 'inline'

  // Positioning
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  offset?: { x: number; y: number }

  // Behavior
  trigger?: 'hover' | 'click' | 'focus' | 'manual'
  delay?: { show: number; hide: number }
  autoClose?: number
  persistent?: boolean

  // Styling
  theme?: 'light' | 'dark' | 'auto'
  maxWidth?: number
  className?: string
  style?: React.CSSProperties

  // Accessibility
  ariaLabel?: string
  announceToScreenReader?: boolean

  // Callbacks
  onShow?: (content: HelpContent) => void
  onHide?: () => void
  onFeedback?: (rating: number, comment?: string) => void

  // Children
  children?: React.ReactNode
}

export function HelpTooltip({
  toolId,
  toolName,
  currentAction,
  triggerElement,
  content: staticContent,
  title,
  helpType = 'tooltip',
  position = 'auto',
  offset = { x: 0, y: 8 },
  trigger = 'hover',
  delay = { show: 500, hide: 200 },
  autoClose,
  persistent = false,
  theme = 'auto',
  maxWidth = 320,
  className = '',
  style,
  ariaLabel,
  announceToScreenReader = true,
  onShow,
  onHide,
  onFeedback,
  children,
}: HelpTooltipProps) {
  const { state, getContextualHelp, generateIntelligentHelp, submitFeedback } = useContextualHelp()

  // State
  const [isVisible, setIsVisible] = useState(false)
  const [currentContent, setCurrentContent] = useState<HelpContent | null>(null)
  const [computedPosition, setComputedPosition] = useState(position)
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackVisible, setFeedbackVisible] = useState(false)

  // Refs
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout>()
  const hideTimeoutRef = useRef<NodeJS.Timeout>()
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout>()

  // Get trigger element
  const getTriggerElement = useCallback((): HTMLElement | null => {
    if (typeof triggerElement === 'string') {
      return document.querySelector(triggerElement)
    }
    if (triggerElement instanceof HTMLElement) {
      return triggerElement
    }
    return triggerRef.current
  }, [triggerElement])

  // Load contextual help content
  const loadHelpContent = useCallback(async () => {
    if (!state.userContext || isLoading) return

    setIsLoading(true)

    try {
      // If static content is provided, use it
      if (staticContent) {
        const helpContent: HelpContent = {
          id: `static_${Date.now()}`,
          title: title || 'Help',
          description: '',
          content: staticContent,
          type: helpType,
          priority: 'medium',
          triggers: [],
          conditions: [],
          tags: [],
          version: '1.0.0',
          lastUpdated: new Date(),
          analytics: {
            views: 0,
            interactions: 0,
            completions: 0,
            averageRating: 0,
            feedbackCount: 0,
            lastViewed: new Date(),
            effectivenessScore: 0,
            userSegments: { beginner: 0, intermediate: 0, advanced: 0 },
            deliveryModes: {},
            completionRate: 0,
            averageDuration: 0,
            dropOffPoints: [],
          },
        }
        setCurrentContent(helpContent)
        setIsLoading(false)
        return
      }

      // Generate intelligent help if tool context is available
      if (toolId && toolName) {
        await generateIntelligentHelp({
          toolId,
          toolName,
          userExpertiseLevel: state.userContext.userState.expertiseLevel,
          currentContext: {
            ...state.userContext,
            currentAction,
            toolContext: {
              toolId,
              toolName,
              currentStep: currentAction,
            },
          },
          contentType: helpType,
          deliveryMode: 'tooltip',
          adaptToAccessibility: state.userContext.userState.accessibility.screenReader,
        })

        // Use the generated content
        if (state.currentHelpContent.length > 0) {
          setCurrentContent(state.currentHelpContent[0])
        }
      } else {
        // Get general contextual help
        await getContextualHelp({
          mode: helpType,
          styling: { maxWidth, theme },
          behavior: { persistent, autoClose },
        })

        if (state.currentHelpContent.length > 0) {
          setCurrentContent(state.currentHelpContent[0])
        }
      }
    } catch (error) {
      console.error('Failed to load help content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [
    state.userContext,
    state.currentHelpContent,
    isLoading,
    staticContent,
    title,
    helpType,
    toolId,
    toolName,
    currentAction,
    generateIntelligentHelp,
    getContextualHelp,
    maxWidth,
    theme,
    persistent,
    autoClose,
  ])

  // Show tooltip
  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      loadHelpContent()

      if (autoClose && !persistent) {
        autoCloseTimeoutRef.current = setTimeout(() => {
          hideTooltip()
        }, autoClose)
      }
    }, delay.show)
  }, [delay.show, autoClose, persistent, loadHelpContent])

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current)
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setFeedbackVisible(false)
      onHide?.()
    }, delay.hide)
  }, [delay.hide, onHide])

  // Calculate position
  const calculatePosition = useCallback(() => {
    const triggerEl = getTriggerElement()
    const tooltipEl = tooltipRef.current

    if (!triggerEl || !tooltipEl) return

    const triggerRect = triggerEl.getBoundingClientRect()
    const tooltipRect = tooltipEl.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let finalPosition = position

    // Auto-calculate position if set to auto
    if (position === 'auto') {
      const spaceAbove = triggerRect.top
      const spaceBelow = viewportHeight - triggerRect.bottom
      const spaceLeft = triggerRect.left
      const spaceRight = viewportWidth - triggerRect.right

      if (spaceBelow >= tooltipRect.height + 10) {
        finalPosition = 'bottom'
      } else if (spaceAbove >= tooltipRect.height + 10) {
        finalPosition = 'top'
      } else if (spaceRight >= tooltipRect.width + 10) {
        finalPosition = 'right'
      } else if (spaceLeft >= tooltipRect.width + 10) {
        finalPosition = 'left'
      } else {
        finalPosition = 'bottom' // Default fallback
      }
    }

    setComputedPosition(finalPosition)
  }, [position, getTriggerElement])

  // Handle feedback submission
  const handleFeedback = useCallback(
    async (rating: number, comment?: string) => {
      if (!currentContent || !state.userContext) return

      await submitFeedback({
        userId: state.userContext.userId,
        sessionId: state.userContext.sessionId,
        helpContentId: currentContent.id,
        type: 'rating',
        rating,
        comment,
        category: 'tooltip_feedback',
      })

      onFeedback?.(rating, comment)
      setFeedbackVisible(false)
    },
    [currentContent, state.userContext, submitFeedback, onFeedback]
  )

  // Event handlers
  const handleMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      showTooltip()
    }
  }, [trigger, showTooltip])

  const handleMouseLeave = useCallback(() => {
    if (trigger === 'hover' && !persistent) {
      hideTooltip()
    }
  }, [trigger, persistent, hideTooltip])

  const handleClick = useCallback(() => {
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip()
      } else {
        showTooltip()
      }
    }
  }, [trigger, isVisible, showTooltip, hideTooltip])

  const handleFocus = useCallback(() => {
    if (trigger === 'focus') {
      showTooltip()
    }
  }, [trigger, showTooltip])

  const handleBlur = useCallback(() => {
    if (trigger === 'focus') {
      hideTooltip()
    }
  }, [trigger, hideTooltip])

  // Setup event listeners
  useEffect(() => {
    const triggerEl = getTriggerElement()
    if (!triggerEl) return

    triggerEl.addEventListener('mouseenter', handleMouseEnter)
    triggerEl.addEventListener('mouseleave', handleMouseLeave)
    triggerEl.addEventListener('click', handleClick)
    triggerEl.addEventListener('focus', handleFocus)
    triggerEl.addEventListener('blur', handleBlur)

    return () => {
      triggerEl.removeEventListener('mouseenter', handleMouseEnter)
      triggerEl.removeEventListener('mouseleave', handleMouseLeave)
      triggerEl.removeEventListener('click', handleClick)
      triggerEl.removeEventListener('focus', handleFocus)
      triggerEl.removeEventListener('blur', handleBlur)
    }
  }, [getTriggerElement, handleMouseEnter, handleMouseLeave, handleClick, handleFocus, handleBlur])

  // Calculate position when visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition()
      onShow?.(currentContent!)
    }
  }, [isVisible, calculatePosition, currentContent, onShow])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current)
    }
  }, [])

  // Screen reader announcement
  useEffect(() => {
    if (isVisible && currentContent && announceToScreenReader) {
      const announcement = `Help available: ${currentContent.title}. ${typeof currentContent.content === 'string' ? currentContent.content : ''}`

      // Create invisible element for screen readers
      const srElement = document.createElement('div')
      srElement.setAttribute('aria-live', 'polite')
      srElement.setAttribute('aria-atomic', 'true')
      srElement.style.position = 'absolute'
      srElement.style.left = '-10000px'
      srElement.style.width = '1px'
      srElement.style.height = '1px'
      srElement.style.overflow = 'hidden'
      srElement.textContent = announcement

      document.body.appendChild(srElement)

      setTimeout(() => {
        document.body.removeChild(srElement)
      }, 1000)
    }
  }, [isVisible, currentContent, announceToScreenReader])

  if (!isVisible) {
    return children ? <span ref={triggerRef}>{children}</span> : null
  }

  return (
    <>
      {children && <span ref={triggerRef}>{children}</span>}

      <div
        ref={tooltipRef}
        className={`contextual-help-tooltip contextual-help-tooltip--${computedPosition} contextual-help-tooltip--${theme} ${className}`}
        style={{
          maxWidth,
          ...style,
        }}
        role='tooltip'
        aria-label={ariaLabel}
        aria-describedby={currentContent?.id}
      >
        {isLoading ? (
          <div className='contextual-help-tooltip__loading'>
            <div className='spinner' />
            <span>Loading help...</span>
          </div>
        ) : currentContent ? (
          <div className='contextual-help-tooltip__content'>
            <div className='contextual-help-tooltip__header'>
              <h4 className='contextual-help-tooltip__title'>{currentContent.title}</h4>
              {!persistent && (
                <button
                  className='contextual-help-tooltip__close'
                  onClick={hideTooltip}
                  aria-label='Close help'
                >
                  ×
                </button>
              )}
            </div>

            <div className='contextual-help-tooltip__body'>
              {typeof currentContent.content === 'string' ? (
                <p>{currentContent.content}</p>
              ) : (
                <div className='contextual-help-tooltip__blocks'>
                  {currentContent.content.map((block, index) => (
                    <div key={block.id} className={`help-block help-block--${block.type}`}>
                      {block.type === 'text' && <p>{block.content}</p>}
                      {block.type === 'code' && (
                        <pre>
                          <code>{block.content}</code>
                        </pre>
                      )}
                      {block.type === 'link' && <a href={block.content}>Learn more</a>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!feedbackVisible ? (
              <div className='contextual-help-tooltip__actions'>
                <button
                  className='contextual-help-tooltip__feedback-btn'
                  onClick={() => setFeedbackVisible(true)}
                >
                  Was this helpful?
                </button>
              </div>
            ) : (
              <div className='contextual-help-tooltip__feedback'>
                <p>Rate this help:</p>
                <div className='rating-buttons'>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      className='rating-btn'
                      onClick={() => handleFeedback(rating)}
                      aria-label={`Rate ${rating} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div
          className={`contextual-help-tooltip__arrow contextual-help-tooltip__arrow--${computedPosition}`}
        />
      </div>
    </>
  )
}

export default HelpTooltip
