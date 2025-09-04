/**
 * React Accessibility Hooks and Utilities
 *
 * Collection of React hooks and components for implementing accessibility features
 * in the help system. Provides easy-to-use hooks for WCAG compliance, keyboard
 * navigation, screen reader support, and focus management.
 *
 * Features:
 * - Accessibility hooks for common patterns
 * - ARIA attribute management
 * - Keyboard navigation helpers
 * - Focus management utilities
 * - Screen reader announcement system
 * - High contrast and visual accessibility
 * - Accessible component wrappers
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { accessibilityManager } from './accessibility-manager'

const logger = createLogger('AccessibilityHooks')

// ================================================================================================
// ACCESSIBILITY HOOKS
// ================================================================================================

/**
 * Hook for managing ARIA attributes
 */
export function useAria(initialAttributes: Record<string, any> = {}) {
  const [attributes, setAttributes] = useState(initialAttributes)

  const setAriaAttribute = useCallback((key: string, value: any) => {
    setAttributes((prev) => ({ ...prev, [key]: value }))
  }, [])

  const removeAriaAttribute = useCallback((key: string) => {
    setAttributes((prev) => {
      const { [key]: removed, ...rest } = prev
      return rest
    })
  }, [])

  const ariaProps = useMemo(() => {
    const props: Record<string, any> = {}

    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const ariaKey = key.startsWith('aria-')
          ? key
          : `aria-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`
        props[ariaKey] = value
      }
    })

    return props
  }, [attributes])

  return {
    ariaProps,
    setAriaAttribute,
    removeAriaAttribute,
    updateAria: setAttributes,
  }
}

/**
 * Hook for keyboard navigation support
 */
export function useKeyboardNavigation(
  options: {
    onEscape?: () => void
    onEnter?: () => void
    onSpace?: () => void
    onArrowUp?: () => void
    onArrowDown?: () => void
    onArrowLeft?: () => void
    onArrowRight?: () => void
    onTab?: (event: KeyboardEvent) => void
    onHome?: () => void
    onEnd?: () => void
    preventDefault?: string[]
  } = {}
) {
  const {
    onEscape,
    onEnter,
    onSpace,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onHome,
    onEnd,
    preventDefault = [],
  } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, altKey, shiftKey, metaKey } = event

      // Create key combination string
      const keyCombo = [
        ctrlKey && 'ctrl',
        altKey && 'alt',
        shiftKey && 'shift',
        metaKey && 'meta',
        key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+')

      // Handle specific keys
      switch (key) {
        case 'Escape':
          if (onEscape) {
            if (preventDefault.includes('Escape') || preventDefault.includes('all')) {
              event.preventDefault()
            }
            onEscape()
          }
          break
        case 'Enter':
          if (onEnter) {
            if (preventDefault.includes('Enter') || preventDefault.includes('all')) {
              event.preventDefault()
            }
            onEnter()
          }
          break
        case ' ':
          if (onSpace) {
            if (preventDefault.includes('Space') || preventDefault.includes('all')) {
              event.preventDefault()
            }
            onSpace()
          }
          break
        case 'ArrowUp':
          if (onArrowUp) {
            if (
              preventDefault.includes('ArrowUp') ||
              preventDefault.includes('arrows') ||
              preventDefault.includes('all')
            ) {
              event.preventDefault()
            }
            onArrowUp()
          }
          break
        case 'ArrowDown':
          if (onArrowDown) {
            if (
              preventDefault.includes('ArrowDown') ||
              preventDefault.includes('arrows') ||
              preventDefault.includes('all')
            ) {
              event.preventDefault()
            }
            onArrowDown()
          }
          break
        case 'ArrowLeft':
          if (onArrowLeft) {
            if (
              preventDefault.includes('ArrowLeft') ||
              preventDefault.includes('arrows') ||
              preventDefault.includes('all')
            ) {
              event.preventDefault()
            }
            onArrowLeft()
          }
          break
        case 'ArrowRight':
          if (onArrowRight) {
            if (
              preventDefault.includes('ArrowRight') ||
              preventDefault.includes('arrows') ||
              preventDefault.includes('all')
            ) {
              event.preventDefault()
            }
            onArrowRight()
          }
          break
        case 'Tab':
          if (onTab) {
            onTab(event)
          }
          break
        case 'Home':
          if (onHome) {
            if (preventDefault.includes('Home') || preventDefault.includes('all')) {
              event.preventDefault()
            }
            onHome()
          }
          break
        case 'End':
          if (onEnd) {
            if (preventDefault.includes('End') || preventDefault.includes('all')) {
              event.preventDefault()
            }
            onEnd()
          }
          break
      }
    },
    [
      onEscape,
      onEnter,
      onSpace,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onTab,
      onHome,
      onEnd,
      preventDefault,
    ]
  )

  const keyboardProps = useMemo(
    () => ({
      onKeyDown: handleKeyDown,
      tabIndex: 0,
    }),
    [handleKeyDown]
  )

  return {
    keyboardProps,
    handleKeyDown,
  }
}

/**
 * Hook for focus management
 */
export function useFocusManagement(
  options: {
    autoFocus?: boolean
    restoreFocus?: boolean
    trapFocus?: boolean
    focusableSelector?: string
  } = {}
) {
  const { autoFocus = false, restoreFocus = false, trapFocus = false, focusableSelector } = options
  const elementRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [hasFocus, setHasFocus] = useState(false)

  // Default focusable element selector
  const defaultFocusableSelector =
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  const finalFocusableSelector = focusableSelector || defaultFocusableSelector

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && elementRef.current) {
      // Store previous focus if restore is enabled
      if (restoreFocus) {
        previousFocusRef.current = document.activeElement as HTMLElement
      }

      elementRef.current.focus()
      setHasFocus(true)

      logger.debug('Auto focus applied', {
        element: elementRef.current.tagName,
        previousFocus: previousFocusRef.current?.tagName,
      })
    }
  }, [autoFocus, restoreFocus])

  // Focus trap implementation
  useEffect(() => {
    if (!trapFocus || !elementRef.current) return

    const element = elementRef.current

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = element.querySelectorAll(
        finalFocusableSelector
      ) as NodeListOf<HTMLElement>
      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]

      if (!firstFocusable) return

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault()
          firstFocusable.focus()
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown)

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [trapFocus, finalFocusableSelector])

  // Track focus state
  useEffect(() => {
    if (!elementRef.current) return

    const element = elementRef.current

    const handleFocusIn = () => setHasFocus(true)
    const handleFocusOut = (event: FocusEvent) => {
      // Check if focus is moving outside the element
      if (!element.contains(event.relatedTarget as Node)) {
        setHasFocus(false)
      }
    }

    element.addEventListener('focusin', handleFocusIn)
    element.addEventListener('focusout', handleFocusOut)

    return () => {
      element.removeEventListener('focusin', handleFocusIn)
      element.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreFocus && previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus()

        logger.debug('Focus restored', {
          restoredTo: previousFocusRef.current.tagName,
        })
      }
    }
  }, [restoreFocus])

  const focusFirst = useCallback(() => {
    if (!elementRef.current) return false

    const focusableElements = elementRef.current.querySelectorAll(
      finalFocusableSelector
    ) as NodeListOf<HTMLElement>
    const firstFocusable = focusableElements[0]

    if (firstFocusable) {
      firstFocusable.focus()
      return true
    }

    return false
  }, [finalFocusableSelector])

  const focusLast = useCallback(() => {
    if (!elementRef.current) return false

    const focusableElements = elementRef.current.querySelectorAll(
      finalFocusableSelector
    ) as NodeListOf<HTMLElement>
    const lastFocusable = focusableElements[focusableElements.length - 1]

    if (lastFocusable) {
      lastFocusable.focus()
      return true
    }

    return false
  }, [finalFocusableSelector])

  const getFocusableElements = useCallback(() => {
    if (!elementRef.current) return []

    return Array.from(elementRef.current.querySelectorAll(finalFocusableSelector)) as HTMLElement[]
  }, [finalFocusableSelector])

  return {
    elementRef,
    hasFocus,
    focusFirst,
    focusLast,
    getFocusableElements,
  }
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReader() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    accessibilityManager.announce(message, priority)

    logger.debug('Screen reader announcement', { message, priority })
  }, [])

  const announceWithDelay = useCallback(
    (message: string, delay = 100, priority: 'polite' | 'assertive' = 'polite') => {
      setTimeout(() => {
        announce(message, priority)
      }, delay)
    },
    [announce]
  )

  return {
    announce,
    announceWithDelay,
  }
}

/**
 * Hook for detecting user preferences
 */
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    largeFonts: false,
    screenReader: false,
  })

  useEffect(() => {
    // Check for prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateReducedMotion = () =>
      setPreferences((prev) => ({ ...prev, reducedMotion: reducedMotionQuery.matches }))
    updateReducedMotion()
    reducedMotionQuery.addEventListener('change', updateReducedMotion)

    // Check for high contrast mode
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const updateHighContrast = () =>
      setPreferences((prev) => ({ ...prev, highContrast: highContrastQuery.matches }))
    updateHighContrast()
    highContrastQuery.addEventListener('change', updateHighContrast)

    // Check for screen reader (heuristic)
    const checkScreenReader = () => {
      const screenReaderDetected =
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        window.speechSynthesis !== undefined ||
        // @ts-ignore - Check for screen reader APIs
        window.speechSynthesis?.getVoices().length > 0

      setPreferences((prev) => ({ ...prev, screenReader: screenReaderDetected }))
    }

    checkScreenReader()

    return () => {
      reducedMotionQuery.removeEventListener('change', updateReducedMotion)
      highContrastQuery.removeEventListener('change', updateHighContrast)
    }
  }, [])

  return preferences
}

/**
 * Hook for roving tabindex management
 */
export function useRovingTabindex(
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    focusOnClick?: boolean
  } = {}
) {
  const { orientation = 'both', loop = true, focusOnClick = true } = options
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(HTMLElement | null)[]>([])

  const registerItem = useCallback(
    (element: HTMLElement | null, index: number) => {
      itemRefs.current[index] = element

      if (element) {
        // Set tabindex based on active state
        element.tabIndex = index === activeIndex ? 0 : -1

        // Add click handler if enabled
        if (focusOnClick) {
          const handleClick = () => {
            setActiveIndex(index)
            element.focus()
          }

          element.addEventListener('click', handleClick)

          // Return cleanup function
          return () => {
            element.removeEventListener('click', handleClick)
          }
        }
      }
    },
    [activeIndex, focusOnClick]
  )

  const moveToIndex = useCallback(
    (newIndex: number) => {
      const validItems = itemRefs.current.filter(Boolean)
      if (validItems.length === 0) return

      let targetIndex = newIndex

      if (loop) {
        targetIndex = ((newIndex % validItems.length) + validItems.length) % validItems.length
      } else {
        targetIndex = Math.max(0, Math.min(newIndex, validItems.length - 1))
      }

      setActiveIndex(targetIndex)
      validItems[targetIndex]?.focus()
    },
    [loop]
  )

  const moveNext = useCallback(() => {
    moveToIndex(activeIndex + 1)
  }, [activeIndex, moveToIndex])

  const movePrevious = useCallback(() => {
    moveToIndex(activeIndex - 1)
  }, [activeIndex, moveToIndex])

  const moveFirst = useCallback(() => {
    moveToIndex(0)
  }, [moveToIndex])

  const moveLast = useCallback(() => {
    const validItems = itemRefs.current.filter(Boolean)
    moveToIndex(validItems.length - 1)
  }, [moveToIndex])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault()
            moveNext()
          }
          break
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault()
            movePrevious()
          }
          break
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault()
            moveNext()
          }
          break
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault()
            movePrevious()
          }
          break
        case 'Home':
          event.preventDefault()
          moveFirst()
          break
        case 'End':
          event.preventDefault()
          moveLast()
          break
      }
    },
    [orientation, moveNext, movePrevious, moveFirst, moveLast]
  )

  // Update tabindex when active index changes
  useEffect(() => {
    itemRefs.current.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === activeIndex ? 0 : -1
      }
    })
  }, [activeIndex])

  return {
    activeIndex,
    setActiveIndex,
    registerItem,
    handleKeyDown,
    moveNext,
    movePrevious,
    moveFirst,
    moveLast,
    moveToIndex,
  }
}

// ================================================================================================
// ACCESSIBLE COMPONENTS
// ================================================================================================

/**
 * Accessible Skip Link component
 */
export function SkipLink({
  href,
  children,
  className = '',
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [isVisible, setIsVisible] = useState(false)

  const handleFocus = () => setIsVisible(true)
  const handleBlur = () => setIsVisible(false)

  const skipLinkStyles = isVisible
    ? {
        position: 'absolute' as const,
        top: '0',
        left: '0',
        zIndex: 9999,
        padding: '8px 16px',
        backgroundColor: '#000',
        color: '#fff',
        textDecoration: 'none',
        fontSize: '14px',
      }
    : {
        position: 'absolute' as const,
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }

  return (
    <a
      href={href}
      className={`skip-link ${className}`}
      style={skipLinkStyles}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {children || 'Skip to main content'}
    </a>
  )
}

/**
 * Screen Reader Only text component
 */
export function ScreenReaderOnly({
  children,
  as: Component = 'span',
  ...props
}: {
  children: React.ReactNode
  as?: React.ElementType
} & React.HTMLAttributes<HTMLElement>) {
  const srOnlyStyles: React.CSSProperties = {
    position: 'absolute',
    left: '-10000px',
    top: 'auto',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
  }

  return (
    <Component style={srOnlyStyles} {...props}>
      {children}
    </Component>
  )
}

/**
 * Live Region component for announcements
 */
export function LiveRegion({
  children,
  priority = 'polite',
  atomic = true,
  relevant = 'additions text',
  ...props
}: {
  children: React.ReactNode
  priority?: 'off' | 'polite' | 'assertive'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all' | string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-live={priority} aria-atomic={atomic} aria-relevant={relevant} {...props}>
      {children}
    </div>
  )
}

/**
 * Focus Trap component
 */
export function FocusTrap({
  children,
  active = true,
  autoFocus = true,
  restoreFocus = true,
  ...props
}: {
  children: React.ReactNode
  active?: boolean
  autoFocus?: boolean
  restoreFocus?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  const { elementRef } = useFocusManagement({
    autoFocus: autoFocus && active,
    restoreFocus: restoreFocus && active,
    trapFocus: active,
  })

  return (
    <div ref={elementRef} {...props}>
      {children}
    </div>
  )
}

/**
 * Accessible Button component with enhanced ARIA support
 */
export function AccessibleButton({
  children,
  variant = 'button',
  pressed,
  expanded,
  describedBy,
  labelledBy,
  disabled,
  loading = false,
  loadingText = 'Loading...',
  ...props
}: {
  children: React.ReactNode
  variant?: 'button' | 'toggle' | 'menu'
  pressed?: boolean
  expanded?: boolean
  describedBy?: string
  labelledBy?: string
  disabled?: boolean
  loading?: boolean
  loadingText?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { ariaProps } = useAria({
    pressed: variant === 'toggle' ? pressed : undefined,
    expanded: variant === 'menu' ? expanded : undefined,
    describedBy,
    labelledBy,
    disabled: disabled || loading,
    busy: loading,
  })

  const { announce } = useScreenReader()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return

    // Announce state changes
    if (variant === 'toggle' && pressed !== undefined) {
      announce(`Button ${!pressed ? 'pressed' : 'not pressed'}`)
    }

    if (variant === 'menu' && expanded !== undefined) {
      announce(`Menu ${!expanded ? 'expanded' : 'collapsed'}`)
    }

    props.onClick?.(event)
  }

  return (
    <button {...props} {...ariaProps} disabled={disabled || loading} onClick={handleClick}>
      {loading ? loadingText : children}
    </button>
  )
}

/**
 * Accessible Menu component with keyboard navigation
 */
export function AccessibleMenu({
  children,
  orientation = 'vertical',
  label,
  ...props
}: {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  label?: string
} & React.HTMLAttributes<HTMLUListElement>) {
  const { activeIndex, registerItem, handleKeyDown } = useRovingTabindex({
    orientation,
    loop: true,
    focusOnClick: true,
  })

  const { ariaProps } = useAria({
    label,
    orientation,
  })

  return (
    <ul {...ariaProps} {...props} onKeyDown={handleKeyDown}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            ref: (el: HTMLElement) => registerItem(el, index),
            role: 'menuitem',
            tabIndex: index === activeIndex ? 0 : -1,
          })
        }
        return child
      })}
    </ul>
  )
}

// ================================================================================================
// HIGHER ORDER COMPONENTS
// ================================================================================================

/**
 * HOC to add accessibility features to any component
 */
export function withAccessibility<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  accessibilityOptions: {
    autoAnnounce?: string
    focusOnMount?: boolean
    role?: string
    label?: string
  } = {}
) {
  const AccessibleComponent = React.forwardRef<any, T>((props, ref) => {
    const { autoAnnounce, focusOnMount, role, label } = accessibilityOptions
    const { announce } = useScreenReader()
    const { ariaProps } = useAria({ label, role })
    const elementRef = useRef<HTMLElement>(null)

    // Auto announce on mount
    useEffect(() => {
      if (autoAnnounce) {
        announce(autoAnnounce)
      }
    }, [announce])

    // Focus on mount if requested
    useEffect(() => {
      if (focusOnMount && elementRef.current) {
        elementRef.current.focus()
      }
    }, [focusOnMount])

    const combinedRef = useCallback(
      (element: HTMLElement) => {
        elementRef.current = element
        if (typeof ref === 'function') {
          ref(element)
        } else if (ref) {
          ref.current = element
        }
      },
      [ref]
    )

    return <WrappedComponent {...props} {...ariaProps} ref={combinedRef} />
  })

  AccessibleComponent.displayName = `withAccessibility(${WrappedComponent.displayName || WrappedComponent.name})`

  return AccessibleComponent
}

export default {
  // Hooks
  useAria,
  useKeyboardNavigation,
  useFocusManagement,
  useScreenReader,
  useAccessibilityPreferences,
  useRovingTabindex,

  // Components
  SkipLink,
  ScreenReaderOnly,
  LiveRegion,
  FocusTrap,
  AccessibleButton,
  AccessibleMenu,

  // HOCs
  withAccessibility,
}
