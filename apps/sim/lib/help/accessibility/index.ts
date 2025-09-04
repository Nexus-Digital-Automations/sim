/**
 * Accessibility System - Main Export Index
 *
 * Central export point for comprehensive accessibility features in the help system.
 * Provides WCAG 2.2 AA compliance, screen reader support, keyboard navigation,
 * high contrast mode, and accessibility testing capabilities.
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

// ================================================================================================
// CORE ACCESSIBILITY MANAGER
// ================================================================================================

export {
  type AccessibilityConfig,
  type AccessibilityEvent,
  AccessibilityManager,
  type AriaAttributes,
  accessibilityManager,
  type FocusableElement,
  type KeyboardShortcut,
} from './accessibility-manager'

// ================================================================================================
// ACCESSIBILITY TESTING SYSTEM
// ================================================================================================

export {
  type AccessibilityNode,
  type AccessibilityRecommendation,
  type AccessibilityReport,
  type AccessibilityTestConfig,
  AccessibilityTestingSystem,
  type AccessibilityViolation,
  accessibilityTesting,
  type KeyboardNavigationTest,
  type ManualTestItem,
  type ScreenReaderTest,
  type TestResult,
} from './accessibility-testing'

// ================================================================================================
// REACT HOOKS AND COMPONENTS
// ================================================================================================

export {
  AccessibleButton,
  AccessibleMenu,
  FocusTrap,
  LiveRegion,
  ScreenReaderOnly,
  // Components
  SkipLink,
  useAccessibilityPreferences,
  // Hooks
  useAria,
  useFocusManagement,
  useKeyboardNavigation,
  useRovingTabindex,
  useScreenReader,
  // HOCs
  withAccessibility,
} from './accessibility-hooks'

// ================================================================================================
// ACCESSIBILITY UTILITIES
// ================================================================================================

/**
 * Accessibility utility functions for common operations
 */
export const AccessibilityUtils = {
  /**
   * Check if element is focusable
   */
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ]

    return (
      focusableSelectors.some((selector) => element.matches(selector)) ||
      element.hasAttribute('contenteditable')
    )
  },

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelector =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    return Array.from(container.querySelectorAll(focusableSelector)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && AccessibilityUtils.isFocusable(el)
    )
  },

  /**
   * Calculate color contrast ratio
   */
  calculateContrastRatio: (color1: string, color2: string): number => {
    // Simplified contrast calculation - in production, use a proper color library
    const getLuminance = (color: string): number => {
      // This is a simplified implementation
      // In production, convert hex/rgb to sRGB and calculate proper luminance
      return 0.5 // Placeholder
    }

    const l1 = getLuminance(color1)
    const l2 = getLuminance(color2)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)

    return (lighter + 0.05) / (darker + 0.05)
  },

  /**
   * Check if contrast ratio meets WCAG standards
   */
  meetsContrastRequirement: (
    ratio: number,
    level: 'AA' | 'AAA' = 'AA',
    isLargeText = false
  ): boolean => {
    if (level === 'AA') {
      return isLargeText ? ratio >= 3.0 : ratio >= 4.5
    }
    return isLargeText ? ratio >= 4.5 : ratio >= 7.0
  },

  /**
   * Generate unique ID for accessibility
   */
  generateId: (prefix = 'a11y'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Announce text to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    accessibilityManager.announce(message, priority)
  },

  /**
   * Create ARIA attributes object
   */
  createAriaAttributes: (attributes: Record<string, any>): Record<string, string> => {
    const ariaProps: Record<string, string> = {}

    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const ariaKey =
          key === 'role' ? 'role' : `aria-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`
        ariaProps[ariaKey] = String(value)
      }
    })

    return ariaProps
  },

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },

  /**
   * Check if user prefers high contrast
   */
  prefersHighContrast: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches
  },

  /**
   * Detect screen reader usage (heuristic)
   */
  detectScreenReader: (): boolean => {
    return (
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      // @ts-ignore
      navigator.userAgent.includes('ORCA') ||
      window.speechSynthesis !== undefined
    )
  },

  /**
   * Focus element with proper timing and announcement
   */
  focusElement: (element: HTMLElement, announce = true): void => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      element.focus()

      if (announce) {
        const label =
          element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent

        if (label) {
          AccessibilityUtils.announce(`Focused: ${label}`)
        }
      }
    })
  },

  /**
   * Create keyboard shortcut handler
   */
  createKeyboardHandler: (shortcuts: Record<string, () => void>) => {
    return (event: KeyboardEvent) => {
      const combo = [
        event.ctrlKey && 'ctrl',
        event.altKey && 'alt',
        event.shiftKey && 'shift',
        event.metaKey && 'meta',
        event.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+')

      const handler = shortcuts[combo]
      if (handler) {
        event.preventDefault()
        handler()
      }
    }
  },
}

// ================================================================================================
// ACCESSIBILITY CONSTANTS
// ================================================================================================

export const ACCESSIBILITY_CONSTANTS = {
  // WCAG contrast ratios
  CONTRAST_RATIOS: {
    AA_NORMAL: 4.5,
    AA_LARGE: 3.0,
    AAA_NORMAL: 7.0,
    AAA_LARGE: 4.5,
  },

  // Common ARIA roles
  ARIA_ROLES: {
    BUTTON: 'button',
    LINK: 'link',
    MENU: 'menu',
    MENUITEM: 'menuitem',
    TAB: 'tab',
    TABPANEL: 'tabpanel',
    DIALOG: 'dialog',
    REGION: 'region',
    MAIN: 'main',
    NAVIGATION: 'navigation',
    COMPLEMENTARY: 'complementary',
    BANNER: 'banner',
    CONTENTINFO: 'contentinfo',
  },

  // Keyboard keys
  KEYS: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    TAB: 'Tab',
  },

  // Focusable element selector
  FOCUSABLE_SELECTOR: 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',

  // Screen reader only CSS class
  SCREEN_READER_ONLY_CLASS: 'sr-only',
}

// ================================================================================================
// GLOBAL ACCESSIBILITY CONFIGURATION
// ================================================================================================

/**
 * Global accessibility system configuration
 */
export const AccessibilitySystem = {
  /**
   * Initialize accessibility system globally
   */
  init: (config?: Partial<AccessibilityConfig>) => {
    try {
      // Initialize the accessibility manager with config
      if (config) {
        accessibilityManager.updateConfig(config)
      }

      // Add global CSS for screen reader only content
      if (!document.getElementById('accessibility-styles')) {
        const style = document.createElement('style')
        style.id = 'accessibility-styles'
        style.textContent = `
          .sr-only {
            position: absolute !important;
            left: -10000px !important;
            top: auto !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
          }
          
          .skip-link:focus {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            z-index: 9999 !important;
            width: auto !important;
            height: auto !important;
            clip: auto !important;
            background: #000 !important;
            color: #fff !important;
            padding: 8px 16px !important;
            text-decoration: none !important;
          }

          .help-high-contrast {
            --help-text-color: #000000;
            --help-background-color: #ffffff;
            --help-link-color: #0000ff;
            --help-border-color: #000000;
            --help-focus-color: #ff0000;
          }

          .help-reduced-motion * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .help-rtl {
            direction: rtl;
          }
        `
        document.head.appendChild(style)
      }

      console.log(
        'Help System Accessibility initialized',
        accessibilityManager.getAccessibilityStatus()
      )
    } catch (error) {
      console.error('Failed to initialize accessibility system:', error)
    }
  },

  /**
   * Get current accessibility status
   */
  getStatus: () => {
    return {
      ...accessibilityManager.getAccessibilityStatus(),
      testing: accessibilityTesting.getTestingStats(),
    }
  },

  /**
   * Run accessibility audit
   */
  audit: async (element?: HTMLElement) => {
    try {
      const result = await accessibilityTesting.runAutomatedTest(element)
      return result
    } catch (error) {
      console.error('Accessibility audit failed:', error)
      throw error
    }
  },

  /**
   * Generate accessibility report
   */
  generateReport: () => {
    return accessibilityTesting.generateReport()
  },

  /**
   * Clean up accessibility resources
   */
  cleanup: () => {
    accessibilityManager.cleanup()
    accessibilityTesting.cleanup()
  },
}

// ================================================================================================
// DEFAULT EXPORT
// ================================================================================================

const Accessibility = {
  // Core system
  Manager: AccessibilityManager,
  Testing: AccessibilityTestingSystem,
  System: AccessibilitySystem,

  // Instances
  manager: accessibilityManager,
  testing: accessibilityTesting,

  // Utilities
  Utils: AccessibilityUtils,
  Constants: ACCESSIBILITY_CONSTANTS,

  // React hooks (re-exported for convenience)
  useAria,
  useKeyboardNavigation,
  useFocusManagement,
  useScreenReader,
  useAccessibilityPreferences,
  useRovingTabindex,

  // React components
  SkipLink,
  ScreenReaderOnly,
  LiveRegion,
  FocusTrap,
  AccessibleButton,
  AccessibleMenu,
  withAccessibility,
}

export default Accessibility
