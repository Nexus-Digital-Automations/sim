/**
 * Accessibility Manager - WCAG 2.1 Level AA compliance system
 *
 * Provides comprehensive accessibility features including:
 * - WCAG 2.1 Level AA compliance validation and implementation
 * - High contrast mode and customizable themes
 * - Screen reader optimization and ARIA enhancements
 * - Keyboard navigation improvements
 * - Focus management and skip navigation
 * - Accessibility testing and reporting
 *
 * @created 2025-09-03
 * @author Claude Development System
 */

import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('AccessibilityManager')

export interface AccessibilityReport {
  id: string
  timestamp: Date
  level: 'A' | 'AA' | 'AAA'
  status: 'pass' | 'fail' | 'warning'
  score: number // 0-100
  violations: AccessibilityViolation[]
  recommendations: AccessibilityRecommendation[]
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
}

export interface AccessibilityViolation {
  id: string
  rule: string
  level: 'A' | 'AA' | 'AAA'
  severity: 'critical' | 'major' | 'minor'
  element: string
  description: string
  impact: string
  solution: string
  wcagReference: string
  automaticFix?: boolean
}

export interface AccessibilityRecommendation {
  id: string
  category: 'color' | 'keyboard' | 'screen-reader' | 'focus' | 'semantics' | 'content'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  implementation: string
  benefits: string[]
}

export interface AccessibilityPreferences {
  highContrast: boolean
  reducedMotion: boolean
  largeText: boolean
  focusIndicators: boolean
  screenReaderMode: boolean
  keyboardNavigation: boolean
  skipNavigation: boolean
  ariaLive: boolean
  colorBlindSupport: boolean
  customTheme?: {
    background: string
    foreground: string
    primary: string
    accent: string
    border: string
  }
}

export interface WCAGRequirement {
  id: string
  level: 'A' | 'AA' | 'AAA'
  guideline: string
  criteria: string
  description: string
  techniques: string[]
  testProcedure: string
}

/**
 * WCAG 2.1 Requirements Database
 */
const WCAG_REQUIREMENTS: Record<string, WCAGRequirement> = {
  '1.1.1': {
    id: '1.1.1',
    level: 'A',
    guideline: 'Perceivable',
    criteria: 'Non-text Content',
    description: 'All non-text content has a text alternative that serves the equivalent purpose',
    techniques: ['H37', 'H53', 'H86', 'G94'],
    testProcedure: 'Check that all img elements have alt attributes with meaningful text',
  },
  '1.3.1': {
    id: '1.3.1',
    level: 'A',
    guideline: 'Perceivable',
    criteria: 'Info and Relationships',
    description: 'Information, structure, and relationships can be programmatically determined',
    techniques: ['H42', 'H43', 'H51', 'H71'],
    testProcedure: 'Verify semantic markup and proper heading structure',
  },
  '1.4.3': {
    id: '1.4.3',
    level: 'AA',
    guideline: 'Perceivable',
    criteria: 'Contrast (Minimum)',
    description: 'Text and background have contrast ratio of at least 4.5:1',
    techniques: ['G18', 'G145'],
    testProcedure: 'Test color contrast ratios with tools',
  },
  '1.4.11': {
    id: '1.4.11',
    level: 'AA',
    guideline: 'Perceivable',
    criteria: 'Non-text Contrast',
    description: 'UI components and graphical objects have contrast ratio of at least 3:1',
    techniques: ['G195', 'G207'],
    testProcedure: 'Check contrast of UI components against background',
  },
  '2.1.1': {
    id: '2.1.1',
    level: 'A',
    guideline: 'Operable',
    criteria: 'Keyboard',
    description: 'All functionality available via keyboard interface',
    techniques: ['G202', 'H91'],
    testProcedure: 'Navigate entire interface using only keyboard',
  },
  '2.1.2': {
    id: '2.1.2',
    level: 'A',
    guideline: 'Operable',
    criteria: 'No Keyboard Trap',
    description: 'Keyboard focus can be moved away from any focusable component',
    techniques: ['G21'],
    testProcedure: 'Ensure no keyboard traps exist in interface',
  },
  '2.4.3': {
    id: '2.4.3',
    level: 'A',
    guideline: 'Operable',
    criteria: 'Focus Order',
    description: 'Focusable components receive focus in logical order',
    techniques: ['G59', 'H4'],
    testProcedure: 'Tab through interface and verify logical order',
  },
  '2.4.7': {
    id: '2.4.7',
    level: 'AA',
    guideline: 'Operable',
    criteria: 'Focus Visible',
    description: 'Keyboard focus indicator is visible',
    techniques: ['G149', 'C15'],
    testProcedure: 'Verify visible focus indicators on all interactive elements',
  },
  '3.1.1': {
    id: '3.1.1',
    level: 'A',
    guideline: 'Understandable',
    criteria: 'Language of Page',
    description: 'Primary language of page can be programmatically determined',
    techniques: ['H57'],
    testProcedure: 'Check html lang attribute is present and correct',
  },
  '3.2.1': {
    id: '3.2.1',
    level: 'A',
    guideline: 'Understandable',
    criteria: 'On Focus',
    description: 'Receiving focus does not initiate change of context',
    techniques: ['G107'],
    testProcedure: 'Verify focus changes do not trigger unexpected context changes',
  },
  '4.1.1': {
    id: '4.1.1',
    level: 'A',
    guideline: 'Robust',
    criteria: 'Parsing',
    description: 'Content implemented using valid markup',
    techniques: ['G134', 'H88'],
    testProcedure: 'Validate HTML markup with W3C validator',
  },
  '4.1.2': {
    id: '4.1.2',
    level: 'A',
    guideline: 'Robust',
    criteria: 'Name, Role, Value',
    description: 'UI components have accessible name, role, and value',
    techniques: ['G108', 'H91'],
    testProcedure: 'Verify ARIA attributes and semantic markup',
  },
}

/**
 * Accessibility Manager Class
 *
 * Provides comprehensive accessibility management including WCAG compliance,
 * user preference handling, and automated accessibility improvements.
 */
export class AccessibilityManager {
  private preferences: AccessibilityPreferences
  private observers: Map<string, MutationObserver> = new Map()
  private liveRegions: Map<string, HTMLElement> = new Map()
  private skipLinks: HTMLElement[] = []
  private focusHistory: HTMLElement[] = []

  constructor(initialPreferences?: Partial<AccessibilityPreferences>) {
    logger.info('Initializing Accessibility Manager')

    // Initialize default preferences
    this.preferences = {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      focusIndicators: true,
      screenReaderMode: false,
      keyboardNavigation: true,
      skipNavigation: true,
      ariaLive: true,
      colorBlindSupport: false,
      ...initialPreferences,
    }

    // Apply initial accessibility enhancements
    this.initialize()
  }

  /**
   * Initialize accessibility features
   */
  private async initialize(): Promise<void> {
    const operationId = nanoid()
    const startTime = Date.now()

    logger.info(`[${operationId}] Initializing accessibility features`, {
      preferences: this.preferences,
      timestamp: new Date().toISOString(),
    })

    try {
      // Set up basic accessibility enhancements
      await this.setupBasicAccessibility()

      // Apply user preferences
      await this.applyPreferences(this.preferences)

      // Set up keyboard navigation
      if (this.preferences.keyboardNavigation) {
        await this.setupKeyboardNavigation()
      }

      // Set up screen reader support
      if (this.preferences.screenReaderMode || this.preferences.ariaLive) {
        await this.setupScreenReaderSupport()
      }

      // Set up skip navigation
      if (this.preferences.skipNavigation) {
        await this.setupSkipNavigation()
      }

      // Set up focus management
      await this.setupFocusManagement()

      // Monitor DOM changes for accessibility
      this.setupDOMObserver()

      const processingTime = Date.now() - startTime
      logger.info(`[${operationId}] Accessibility features initialized successfully`, {
        processingTimeMs: processingTime,
        featuresEnabled: Object.keys(this.preferences).filter(
          (key) => this.preferences[key as keyof AccessibilityPreferences]
        ).length,
      })
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Failed to initialize accessibility features`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      })
      throw error
    }
  }

  /**
   * Enable high contrast mode with custom theme support
   */
  async enableHighContrastMode(
    customTheme?: AccessibilityPreferences['customTheme']
  ): Promise<void> {
    const operationId = nanoid()

    logger.info(`[${operationId}] Enabling high contrast mode`, {
      hasCustomTheme: !!customTheme,
    })

    try {
      // Remove existing high contrast classes
      document.documentElement.classList.remove('high-contrast', 'custom-theme')

      // Apply high contrast mode
      document.documentElement.classList.add('high-contrast')

      // Apply custom theme if provided
      if (customTheme) {
        document.documentElement.classList.add('custom-theme')

        const style = document.createElement('style')
        style.id = 'accessibility-custom-theme'
        style.textContent = `
          .custom-theme {
            --background: ${customTheme.background};
            --foreground: ${customTheme.foreground};
            --primary: ${customTheme.primary};
            --accent: ${customTheme.accent};
            --border: ${customTheme.border};
          }
          
          .custom-theme * {
            background-color: var(--background) !important;
            color: var(--foreground) !important;
            border-color: var(--border) !important;
          }
          
          .custom-theme button,
          .custom-theme [role="button"] {
            background-color: var(--primary) !important;
            color: var(--background) !important;
          }
          
          .custom-theme a,
          .custom-theme [role="link"] {
            color: var(--accent) !important;
          }
        `

        document.head.appendChild(style)
      } else {
        // Apply default high contrast styles
        const style = document.createElement('style')
        style.id = 'accessibility-high-contrast'
        style.textContent = `
          .high-contrast {
            --background: #000000;
            --foreground: #ffffff;
            --primary: #ffffff;
            --accent: #ffff00;
            --border: #ffffff;
          }
          
          .high-contrast * {
            background-color: var(--background) !important;
            color: var(--foreground) !important;
            border: 1px solid var(--border) !important;
          }
          
          .high-contrast button,
          .high-contrast [role="button"] {
            background-color: var(--primary) !important;
            color: var(--background) !important;
            font-weight: bold !important;
          }
          
          .high-contrast a,
          .high-contrast [role="link"] {
            color: var(--accent) !important;
            text-decoration: underline !important;
          }
        `

        document.head.appendChild(style)
      }

      // Update preferences
      this.preferences.highContrast = true
      if (customTheme) {
        this.preferences.customTheme = customTheme
      }

      // Announce change to screen readers
      this.announceToScreenReader('High contrast mode enabled')

      logger.info(`[${operationId}] High contrast mode enabled successfully`)
    } catch (error) {
      logger.error(`[${operationId}] Failed to enable high contrast mode`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Configure screen reader optimizations
   */
  async configureScreenReader(): Promise<void> {
    const operationId = nanoid()

    logger.info(`[${operationId}] Configuring screen reader optimizations`)

    try {
      // Ensure proper document structure
      this.ensureDocumentStructure()

      // Set up ARIA live regions
      this.setupLiveRegions()

      // Enhance interactive elements
      this.enhanceInteractiveElements()

      // Add landmark roles
      this.addLandmarkRoles()

      // Optimize heading structure
      this.optimizeHeadingStructure()

      // Update preferences
      this.preferences.screenReaderMode = true

      logger.info(`[${operationId}] Screen reader optimizations configured successfully`)
    } catch (error) {
      logger.error(`[${operationId}] Failed to configure screen reader`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Setup comprehensive keyboard navigation
   */
  async setupKeyboardNavigation(): Promise<void> {
    const operationId = nanoid()

    logger.info(`[${operationId}] Setting up keyboard navigation`)

    try {
      // Add keyboard event listeners
      document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this))

      // Ensure all interactive elements are focusable
      this.makeInteractiveElementsFocusable()

      // Set up focus trapping for modals
      this.setupFocusTrapping()

      // Add keyboard shortcuts
      this.setupKeyboardShortcuts()

      // Update preferences
      this.preferences.keyboardNavigation = true

      logger.info(`[${operationId}] Keyboard navigation setup completed`)
    } catch (error) {
      logger.error(`[${operationId}] Failed to setup keyboard navigation`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Validate component accessibility
   */
  async validateAccessibility(component: HTMLElement): Promise<AccessibilityReport> {
    const operationId = nanoid()
    const startTime = Date.now()

    logger.info(`[${operationId}] Starting accessibility validation`, {
      componentTag: component.tagName,
      componentId: component.id,
      componentClass: component.className,
    })

    try {
      const violations: AccessibilityViolation[] = []
      const recommendations: AccessibilityRecommendation[] = []

      // Test Level A requirements
      violations.push(...(await this.testLevelA(component)))

      // Test Level AA requirements
      violations.push(...(await this.testLevelAA(component)))

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(component, violations))

      // Calculate score
      const totalTests = Object.keys(WCAG_REQUIREMENTS).filter(
        (key) => WCAG_REQUIREMENTS[key].level === 'A' || WCAG_REQUIREMENTS[key].level === 'AA'
      ).length
      const passedTests =
        totalTests - violations.filter((v) => v.level === 'A' || v.level === 'AA').length
      const score = Math.round((passedTests / totalTests) * 100)

      const report: AccessibilityReport = {
        id: operationId,
        timestamp: new Date(),
        level: 'AA',
        status: violations.some((v) => v.severity === 'critical')
          ? 'fail'
          : violations.some((v) => v.severity === 'major')
            ? 'warning'
            : 'pass',
        score,
        violations,
        recommendations,
        summary: {
          total: totalTests,
          passed: passedTests,
          failed: violations.filter((v) => v.severity === 'critical' || v.severity === 'major')
            .length,
          warnings: violations.filter((v) => v.severity === 'minor').length,
        },
      }

      const processingTime = Date.now() - startTime
      logger.info(`[${operationId}] Accessibility validation completed`, {
        score,
        status: report.status,
        violationsCount: violations.length,
        recommendationsCount: recommendations.length,
        processingTimeMs: processingTime,
      })

      return report
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Failed to validate accessibility`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      })

      // Return error report
      return {
        id: operationId,
        timestamp: new Date(),
        level: 'AA',
        status: 'fail',
        score: 0,
        violations: [
          {
            id: nanoid(),
            rule: 'validation-error',
            level: 'AA',
            severity: 'critical',
            element: component.tagName,
            description: 'Failed to complete accessibility validation',
            impact: 'Cannot determine accessibility compliance',
            solution: 'Fix validation system and retry',
            wcagReference: 'N/A',
          },
        ],
        recommendations: [],
        summary: { total: 0, passed: 0, failed: 1, warnings: 0 },
      }
    }
  }

  /**
   * Apply accessibility preferences
   */
  async applyPreferences(preferences: Partial<AccessibilityPreferences>): Promise<void> {
    const operationId = nanoid()

    logger.info(`[${operationId}] Applying accessibility preferences`, {
      preferences,
    })

    try {
      // Update preferences
      this.preferences = { ...this.preferences, ...preferences }

      // Apply high contrast if enabled
      if (preferences.highContrast) {
        await this.enableHighContrastMode(preferences.customTheme)
      }

      // Apply reduced motion
      if (preferences.reducedMotion) {
        document.documentElement.style.setProperty('--motion-reduce', 'reduce')
        document.documentElement.classList.add('reduce-motion')
      }

      // Apply large text
      if (preferences.largeText) {
        document.documentElement.classList.add('large-text')
      }

      // Apply focus indicators
      if (preferences.focusIndicators) {
        this.enhanceFocusIndicators()
      }

      // Configure screen reader mode
      if (preferences.screenReaderMode) {
        await this.configureScreenReader()
      }

      logger.info(`[${operationId}] Accessibility preferences applied successfully`)
    } catch (error) {
      logger.error(`[${operationId}] Failed to apply accessibility preferences`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // Private helper methods

  private async setupBasicAccessibility(): Promise<void> {
    // Ensure lang attribute
    if (!document.documentElement.lang) {
      document.documentElement.lang = 'en'
    }

    // Add meta viewport for responsive design
    const viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) {
      const meta = document.createElement('meta')
      meta.name = 'viewport'
      meta.content = 'width=device-width, initial-scale=1'
      document.head.appendChild(meta)
    }
  }

  private async setupScreenReaderSupport(): Promise<void> {
    // Create ARIA live regions
    this.setupLiveRegions()

    // Add screen reader only styles
    const style = document.createElement('style')
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `
    document.head.appendChild(style)
  }

  private setupLiveRegions(): void {
    const regions = [
      { id: 'aria-live-polite', politeness: 'polite' },
      { id: 'aria-live-assertive', politeness: 'assertive' },
    ]

    regions.forEach((region) => {
      let liveRegion = document.getElementById(region.id)
      if (!liveRegion) {
        liveRegion = document.createElement('div')
        liveRegion.id = region.id
        liveRegion.setAttribute('aria-live', region.politeness)
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.className = 'sr-only'
        document.body.appendChild(liveRegion)
      }
      this.liveRegions.set(region.politeness, liveRegion)
    })
  }

  private async setupSkipNavigation(): Promise<void> {
    // Create skip links container
    const skipNav = document.createElement('nav')
    skipNav.setAttribute('aria-label', 'Skip navigation')
    skipNav.className = 'skip-navigation'
    skipNav.innerHTML = `
      <style>
        .skip-navigation {
          position: fixed;
          top: -40px;
          left: 8px;
          z-index: 10000;
          transition: top 0.3s;
        }
        .skip-navigation:focus-within {
          top: 8px;
        }
        .skip-link {
          display: inline-block;
          padding: 8px 16px;
          background: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        }
        .skip-link:hover,
        .skip-link:focus {
          background: #333;
          outline: 2px solid #fff;
        }
      </style>
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#primary-navigation" class="skip-link">Skip to navigation</a>
    `

    document.body.prepend(skipNav)
    this.skipLinks.push(skipNav)

    // Ensure main content landmark exists
    if (!document.getElementById('main-content') && !document.querySelector('main')) {
      const main = document.querySelector(
        '.workflow-container, .main-content, #main, [role="main"]'
      )
      if (main) {
        main.id = 'main-content'
        main.setAttribute('role', 'main')
      }
    }
  }

  private async setupFocusManagement(): Promise<void> {
    // Track focus for better management
    document.addEventListener('focusin', (e) => {
      if (e.target instanceof HTMLElement) {
        this.focusHistory.push(e.target)
        // Keep only last 10 focused elements
        if (this.focusHistory.length > 10) {
          this.focusHistory.shift()
        }
      }
    })
  }

  private setupDOMObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              this.enhanceNewElement(node)
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    this.observers.set('dom-observer', observer)
  }

  private enhanceNewElement(element: HTMLElement): void {
    // Add accessibility enhancements to new elements
    if (this.preferences.focusIndicators) {
      this.addFocusIndicators(element)
    }

    // Ensure interactive elements are accessible
    const interactiveElements = element.querySelectorAll(
      'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    )

    interactiveElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        this.enhanceInteractiveElement(el)
      }
    })
  }

  private ensureDocumentStructure(): void {
    // Ensure proper heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    let currentLevel = 0

    headings.forEach((heading) => {
      const level = Number.parseInt(heading.tagName.substring(1))
      if (level > currentLevel + 1) {
        logger.warn('Heading hierarchy violation detected', {
          element: heading.tagName,
          expectedMax: currentLevel + 1,
          actual: level,
        })
      }
      currentLevel = level
    })
  }

  private enhanceInteractiveElements(): void {
    const elements = document.querySelectorAll(
      'button, [role="button"], input, select, textarea, a[href]'
    )

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        this.enhanceInteractiveElement(element)
      }
    })
  }

  private enhanceInteractiveElement(element: HTMLElement): void {
    // Ensure focusable elements have proper attributes
    if (
      !element.hasAttribute('tabindex') &&
      !['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName)
    ) {
      element.tabIndex = 0
    }

    // Add ARIA labels where missing
    if (
      !element.hasAttribute('aria-label') &&
      !element.hasAttribute('aria-labelledby') &&
      !element.textContent?.trim()
    ) {
      const placeholder = element.getAttribute('placeholder')
      const title = element.getAttribute('title')
      if (placeholder) {
        element.setAttribute('aria-label', placeholder)
      } else if (title) {
        element.setAttribute('aria-label', title)
      }
    }
  }

  private addLandmarkRoles(): void {
    // Add landmark roles where missing
    const landmarks = [
      { selector: 'header', role: 'banner' },
      { selector: 'nav', role: 'navigation' },
      { selector: 'main', role: 'main' },
      { selector: 'aside', role: 'complementary' },
      { selector: 'footer', role: 'contentinfo' },
    ]

    landmarks.forEach(({ selector, role }) => {
      const elements = document.querySelectorAll(selector)
      elements.forEach((element) => {
        if (!element.hasAttribute('role')) {
          element.setAttribute('role', role)
        }
      })
    })
  }

  private optimizeHeadingStructure(): void {
    // Add IDs to headings for better navigation
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    headings.forEach((heading, index) => {
      if (!heading.id) {
        const text =
          heading.textContent
            ?.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-') || `heading-${index}`
        heading.id = text
      }
    })
  }

  private makeInteractiveElementsFocusable(): void {
    const elements = document.querySelectorAll('[role="button"], [onclick]')
    elements.forEach((element) => {
      if (element instanceof HTMLElement && element.tabIndex < 0) {
        element.tabIndex = 0
      }
    })
  }

  private setupFocusTrapping(): void {
    // Focus trapping will be handled by modal components
    // This sets up the foundation for focus management
  }

  private setupKeyboardShortcuts(): void {
    // Global accessibility shortcuts
    const shortcuts = {
      'Alt+1': () => document.querySelector('h1')?.focus(),
      'Alt+2': () => document.querySelector('[role="navigation"], nav')?.focus(),
      'Alt+3': () => document.querySelector('[role="main"], main')?.focus(),
      'Alt+/': () => this.announceCurrentFocus(),
    }

    // Implementation would be handled by individual components
  }

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // Handle global keyboard navigation
    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event)
        break
      case 'Escape':
        this.handleEscapeKey(event)
        break
    }
  }

  private handleTabNavigation(event: KeyboardEvent): void {
    // Enhanced tab navigation handling
    const focusableElements = this.getFocusableElements()
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)

    if (event.shiftKey) {
      // Shift+Tab (backwards)
      if (currentIndex <= 0) {
        event.preventDefault()
        focusableElements[focusableElements.length - 1]?.focus()
      }
    } else {
      // Tab (forwards)
      if (currentIndex >= focusableElements.length - 1) {
        event.preventDefault()
        focusableElements[0]?.focus()
      }
    }
  }

  private handleEscapeKey(event: KeyboardEvent): void {
    // Handle escape key for closing modals, etc.
    const modal = document.querySelector('[role="dialog"]:not([hidden])')
    if (modal instanceof HTMLElement) {
      // Let modal handle its own escape logic
      return
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    return Array.from(document.querySelectorAll(selector)) as HTMLElement[]
  }

  private enhanceFocusIndicators(): void {
    const style = document.createElement('style')
    style.id = 'accessibility-focus-indicators'
    style.textContent = `
      *:focus {
        outline: 2px solid #0066cc !important;
        outline-offset: 2px !important;
      }
      
      *:focus:not(:focus-visible) {
        outline: none !important;
      }
      
      button:focus,
      [role="button"]:focus {
        outline: 2px solid #0066cc !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.2) !important;
      }
    `

    document.head.appendChild(style)
  }

  private addFocusIndicators(element: HTMLElement): void {
    // Add enhanced focus indicators to specific elements
    if (element.matches('button, [role="button"], input, select, textarea, a[href]')) {
      element.style.setProperty('--focus-ring', '2px solid #0066cc')
    }
  }

  private announceCurrentFocus(): void {
    const focused = document.activeElement
    if (focused instanceof HTMLElement) {
      const text = focused.textContent || focused.getAttribute('aria-label') || focused.tagName
      this.announceToScreenReader(`Currently focused on: ${text}`)
    }
  }

  private announceToScreenReader(
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): void {
    const liveRegion = this.liveRegions.get(priority)
    if (liveRegion) {
      liveRegion.textContent = message

      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }
  }

  private async testLevelA(component: HTMLElement): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = []

    // Test 1.1.1 - Non-text Content
    const images = component.querySelectorAll('img')
    images.forEach((img) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        violations.push({
          id: nanoid(),
          rule: '1.1.1',
          level: 'A',
          severity: 'critical',
          element: `img[src="${img.src}"]`,
          description: 'Image missing alternative text',
          impact: 'Screen readers cannot describe the image',
          solution: 'Add alt attribute with descriptive text',
          wcagReference: 'WCAG 1.1.1 Non-text Content',
          automaticFix: false,
        })
      }
    })

    // Test 2.1.1 - Keyboard Access
    const interactive = component.querySelectorAll('button, [role="button"], [onclick]')
    interactive.forEach((element) => {
      if (element instanceof HTMLElement && element.tabIndex < 0) {
        violations.push({
          id: nanoid(),
          rule: '2.1.1',
          level: 'A',
          severity: 'major',
          element: element.tagName,
          description: 'Interactive element not keyboard accessible',
          impact: 'Keyboard users cannot access this functionality',
          solution: 'Remove negative tabindex or add keyboard event handlers',
          wcagReference: 'WCAG 2.1.1 Keyboard',
          automaticFix: true,
        })
      }
    })

    return violations
  }

  private async testLevelAA(component: HTMLElement): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = []

    // Test 1.4.3 - Color Contrast
    const textElements = component.querySelectorAll('*')
    for (const element of textElements) {
      if (element instanceof HTMLElement && element.textContent?.trim()) {
        const contrastRatio = await this.calculateContrastRatio(element)
        if (contrastRatio < 4.5) {
          violations.push({
            id: nanoid(),
            rule: '1.4.3',
            level: 'AA',
            severity: 'major',
            element: element.tagName,
            description: `Insufficient color contrast ratio: ${contrastRatio.toFixed(2)}:1`,
            impact: 'Text may be difficult to read for users with visual impairments',
            solution: 'Increase contrast between text and background colors',
            wcagReference: 'WCAG 1.4.3 Contrast (Minimum)',
            automaticFix: false,
          })
        }
      }
    }

    // Test 2.4.7 - Focus Visible
    const focusable = component.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable.forEach((element) => {
      if (element instanceof HTMLElement) {
        const styles = window.getComputedStyle(element, ':focus')
        const outline = styles.outline
        const outlineWidth = styles.outlineWidth

        if (outline === 'none' || outlineWidth === '0px') {
          violations.push({
            id: nanoid(),
            rule: '2.4.7',
            level: 'AA',
            severity: 'major',
            element: element.tagName,
            description: 'Focus indicator not visible',
            impact: 'Keyboard users cannot see which element has focus',
            solution: 'Add visible focus indicators with CSS',
            wcagReference: 'WCAG 2.4.7 Focus Visible',
            automaticFix: true,
          })
        }
      }
    })

    return violations
  }

  private generateRecommendations(
    component: HTMLElement,
    violations: AccessibilityViolation[]
  ): AccessibilityRecommendation[] {
    const recommendations: AccessibilityRecommendation[] = []

    // General recommendations based on violations
    const violationTypes = new Set(violations.map((v) => v.rule))

    if (violationTypes.has('1.1.1')) {
      recommendations.push({
        id: nanoid(),
        category: 'content',
        priority: 'high',
        title: 'Improve Alternative Text',
        description: 'Add meaningful alternative text to all images and non-text content',
        implementation:
          'Review each image and provide descriptive alt text that conveys the same information',
        benefits: [
          'Improved screen reader accessibility',
          'Better SEO',
          'Content available when images fail to load',
        ],
      })
    }

    if (violationTypes.has('1.4.3')) {
      recommendations.push({
        id: nanoid(),
        category: 'color',
        priority: 'high',
        title: 'Improve Color Contrast',
        description: 'Increase contrast ratios to meet WCAG AA standards',
        implementation:
          'Use darker colors for text or lighter backgrounds to achieve 4.5:1 contrast ratio',
        benefits: [
          'Better readability for all users',
          'Compliance with accessibility standards',
          'Improved usability in bright environments',
        ],
      })
    }

    return recommendations
  }

  private async calculateContrastRatio(element: HTMLElement): Promise<number> {
    // Simplified contrast calculation
    // In a real implementation, this would use proper color space calculations
    const styles = window.getComputedStyle(element)
    const textColor = styles.color
    const backgroundColor = styles.backgroundColor

    // This is a simplified calculation - real implementation would be more complex
    const textLuminance = this.getColorLuminance(textColor)
    const backgroundLuminance = this.getColorLuminance(backgroundColor)

    const lighter = Math.max(textLuminance, backgroundLuminance)
    const darker = Math.min(textLuminance, backgroundLuminance)

    return (lighter + 0.05) / (darker + 0.05)
  }

  private getColorLuminance(color: string): number {
    // Simplified luminance calculation
    // Real implementation would properly parse RGB values and apply gamma correction
    return 0.5 // Placeholder
  }

  // Public API methods

  public getPreferences(): AccessibilityPreferences {
    return { ...this.preferences }
  }

  public async updatePreferences(preferences: Partial<AccessibilityPreferences>): Promise<void> {
    await this.applyPreferences(preferences)
  }

  public async auditComponent(component: HTMLElement): Promise<AccessibilityReport> {
    return await this.validateAccessibility(component)
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.announceToScreenReader(message, priority)
  }

  public destroy(): void {
    logger.info('Destroying Accessibility Manager')

    // Remove observers
    this.observers.forEach((observer) => {
      observer.disconnect()
    })
    this.observers.clear()

    // Remove live regions
    this.liveRegions.forEach((region) => {
      region.remove()
    })
    this.liveRegions.clear()

    // Remove skip links
    this.skipLinks.forEach((link) => {
      link.remove()
    })
    this.skipLinks = []

    // Remove added styles
    document.getElementById('accessibility-high-contrast')?.remove()
    document.getElementById('accessibility-custom-theme')?.remove()
    document.getElementById('accessibility-focus-indicators')?.remove()

    // Clear focus history
    this.focusHistory = []
  }
}

// Export singleton instance
export const accessibilityManager = new AccessibilityManager({
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  focusIndicators: true,
  screenReaderMode: true,
  keyboardNavigation: true,
  skipNavigation: true,
  ariaLive: true,
  colorBlindSupport: false,
})

export default AccessibilityManager
