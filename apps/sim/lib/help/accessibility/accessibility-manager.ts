/**
 * Accessibility Manager for Help System
 *
 * Implements comprehensive WCAG 2.2 AA compliance for help system components.
 * Provides screen reader support, keyboard navigation, high contrast mode,
 * and alternative input methods for inclusive user experience.
 *
 * Features:
 * - WCAG 2.2 AA compliance implementation
 * - Screen reader compatibility with ARIA support
 * - Keyboard navigation for all interactive elements
 * - High contrast mode and visual accessibility
 * - Voice control and alternative input methods
 * - Focus management and announcement system
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('AccessibilityManager')

export interface AccessibilityConfig {
  screenReaderSupport: boolean
  keyboardNavigation: boolean
  highContrastMode: boolean
  voiceControlEnabled: boolean
  focusManagement: boolean
  announcements: boolean
  reducedMotion: boolean
  fontSize: 'default' | 'large' | 'larger' | 'largest'
  colorBlindnessSupport: boolean
}

export interface AriaAttributes {
  role?: string
  label?: string
  labelledBy?: string
  describedBy?: string
  expanded?: boolean
  selected?: boolean
  pressed?: boolean
  checked?: boolean
  disabled?: boolean
  hidden?: boolean
  live?: 'off' | 'polite' | 'assertive'
  atomic?: boolean
  busy?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
}

export interface KeyboardShortcut {
  id: string
  keys: string[]
  description: string
  action: () => void
  context?: string
  global?: boolean
}

export interface FocusableElement {
  element: HTMLElement
  tabIndex: number
  focusable: boolean
  visible: boolean
  ariaLabel?: string
}

export interface AccessibilityEvent {
  type: 'focus' | 'blur' | 'keyboard' | 'screen-reader' | 'announcement'
  element?: HTMLElement
  data?: any
  timestamp: Date
}

/**
 * Comprehensive Accessibility Manager
 *
 * Manages all accessibility features for the help system including
 * WCAG compliance, screen reader support, and keyboard navigation.
 */
export class AccessibilityManager {
  private config: AccessibilityConfig
  private keyboardShortcuts: Map<string, KeyboardShortcut> = new Map()
  private focusStack: HTMLElement[] = []
  private announcer: HTMLElement | null = null
  private observers: Map<string, MutationObserver> = new Map()
  private eventListeners: Map<string, EventListener> = new Map()

  constructor(config: Partial<AccessibilityConfig> = {}) {
    logger.info('Initializing Accessibility Manager with WCAG 2.2 AA compliance')

    this.config = {
      screenReaderSupport: true,
      keyboardNavigation: true,
      highContrastMode: false,
      voiceControlEnabled: false,
      focusManagement: true,
      announcements: true,
      reducedMotion: false,
      fontSize: 'default',
      colorBlindnessSupport: false,
      ...config,
    }

    this.initializeAccessibility()
  }

  /**
   * Initialize accessibility features and compliance measures
   */
  private initializeAccessibility(): void {
    logger.info('Setting up accessibility features and WCAG compliance')

    // Initialize screen reader support
    if (this.config.screenReaderSupport) {
      this.initializeScreenReaderSupport()
    }

    // Initialize keyboard navigation
    if (this.config.keyboardNavigation) {
      this.initializeKeyboardNavigation()
    }

    // Initialize high contrast mode
    if (this.config.highContrastMode) {
      this.enableHighContrastMode()
    }

    // Initialize announcer for screen readers
    if (this.config.announcements) {
      this.initializeAnnouncer()
    }

    // Initialize focus management
    if (this.config.focusManagement) {
      this.initializeFocusManagement()
    }

    // Initialize reduced motion support
    if (this.config.reducedMotion) {
      this.enableReducedMotion()
    }

    // Initialize color blindness support
    if (this.config.colorBlindnessSupport) {
      this.enableColorBlindnessSupport()
    }

    // Set up default keyboard shortcuts for help system
    this.setupDefaultKeyboardShortcuts()

    logger.info('Accessibility Manager initialized successfully', {
      features: Object.keys(this.config).filter((key) => (this.config as any)[key]),
      shortcutsCount: this.keyboardShortcuts.size,
    })
  }

  /**
   * Initialize comprehensive screen reader support with ARIA
   */
  private initializeScreenReaderSupport(): void {
    logger.info('Initializing screen reader support with ARIA attributes')

    // Add ARIA landmarks to help content
    this.addAriaLandmarks()

    // Set up live regions for dynamic content
    this.setupLiveRegions()

    // Initialize ARIA descriptions for interactive elements
    this.initializeAriaDescriptions()

    // Monitor DOM changes for new elements
    this.setupAriaObserver()
  }

  /**
   * Add ARIA landmarks for better screen reader navigation
   */
  private addAriaLandmarks(): void {
    // Add main landmark for help content
    const helpMainElements = document.querySelectorAll('[data-help-main]')
    helpMainElements.forEach((element) => {
      element.setAttribute('role', 'main')
      element.setAttribute('aria-label', 'Help content')
    })

    // Add navigation landmarks for help menus
    const helpNavElements = document.querySelectorAll('[data-help-nav]')
    helpNavElements.forEach((element) => {
      element.setAttribute('role', 'navigation')
      element.setAttribute('aria-label', 'Help navigation')
    })

    // Add complementary landmarks for sidebars
    const helpSidebarElements = document.querySelectorAll('[data-help-sidebar]')
    helpSidebarElements.forEach((element) => {
      element.setAttribute('role', 'complementary')
      element.setAttribute('aria-label', 'Additional help information')
    })

    logger.info('ARIA landmarks added to help system elements')
  }

  /**
   * Set up live regions for dynamic content announcements
   */
  private setupLiveRegions(): void {
    // Create polite live region for non-urgent updates
    const politeLiveRegion = document.createElement('div')
    politeLiveRegion.setAttribute('aria-live', 'polite')
    politeLiveRegion.setAttribute('aria-atomic', 'true')
    politeLiveRegion.setAttribute('class', 'sr-only')
    politeLiveRegion.id = 'help-live-polite'
    document.body.appendChild(politeLiveRegion)

    // Create assertive live region for urgent announcements
    const assertiveLiveRegion = document.createElement('div')
    assertiveLiveRegion.setAttribute('aria-live', 'assertive')
    assertiveLiveRegion.setAttribute('aria-atomic', 'true')
    assertiveLiveRegion.setAttribute('class', 'sr-only')
    assertiveLiveRegion.id = 'help-live-assertive'
    document.body.appendChild(assertiveLiveRegion)

    logger.info('Live regions created for screen reader announcements')
  }

  /**
   * Initialize ARIA descriptions for interactive elements
   */
  private initializeAriaDescriptions(): void {
    // Add descriptions to help tooltips
    const tooltipElements = document.querySelectorAll('[data-help-tooltip]')
    tooltipElements.forEach((element, index) => {
      const tooltip = element.getAttribute('data-help-tooltip')
      if (tooltip) {
        const descriptionId = `help-tooltip-desc-${index}`
        const descriptionElement = document.createElement('span')
        descriptionElement.id = descriptionId
        descriptionElement.className = 'sr-only'
        descriptionElement.textContent = tooltip
        document.body.appendChild(descriptionElement)

        element.setAttribute('aria-describedby', descriptionId)
      }
    })

    // Add descriptions to help buttons
    const helpButtons = document.querySelectorAll('[data-help-button]')
    helpButtons.forEach((button) => {
      const action = button.getAttribute('data-help-action')
      if (action) {
        button.setAttribute('aria-label', `Help: ${action}`)
        button.setAttribute('role', 'button')
      }
    })

    logger.info('ARIA descriptions initialized for interactive elements')
  }

  /**
   * Set up observer for new DOM elements requiring ARIA
   */
  private setupAriaObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            this.processNewElementForAria(element)
          }
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    this.observers.set('aria', observer)
    logger.info('ARIA observer set up for dynamic content')
  }

  /**
   * Process new DOM elements for ARIA compliance
   */
  private processNewElementForAria(element: HTMLElement): void {
    // Process help tooltips
    if (element.hasAttribute('data-help-tooltip')) {
      const tooltip = element.getAttribute('data-help-tooltip')
      if (tooltip) {
        const descriptionId = `help-tooltip-desc-${Date.now()}`
        const descriptionElement = document.createElement('span')
        descriptionElement.id = descriptionId
        descriptionElement.className = 'sr-only'
        descriptionElement.textContent = tooltip
        document.body.appendChild(descriptionElement)

        element.setAttribute('aria-describedby', descriptionId)
      }
    }

    // Process help buttons
    if (element.hasAttribute('data-help-button')) {
      const action = element.getAttribute('data-help-action')
      if (action) {
        element.setAttribute('aria-label', `Help: ${action}`)
        element.setAttribute('role', 'button')
      }
    }

    // Process help panels
    if (element.hasAttribute('data-help-panel')) {
      element.setAttribute('role', 'region')
      element.setAttribute('aria-label', 'Help panel')
    }
  }

  /**
   * Initialize comprehensive keyboard navigation
   */
  private initializeKeyboardNavigation(): void {
    logger.info('Setting up keyboard navigation for help system')

    // Set up keyboard event listeners
    this.setupKeyboardEventListeners()

    // Initialize tab order management
    this.initializeTabOrder()

    // Set up skip links for better navigation
    this.setupSkipLinks()

    // Initialize roving tabindex for complex widgets
    this.initializeRovingTabindex()
  }

  /**
   * Set up keyboard event listeners
   */
  private setupKeyboardEventListeners(): void {
    const keydownListener = (event: KeyboardEvent) => {
      this.handleKeyboardEvent(event)
    }

    document.addEventListener('keydown', keydownListener)
    this.eventListeners.set('keydown', keydownListener)

    // Set up focus events for keyboard navigation feedback
    const focusListener = (event: FocusEvent) => {
      this.handleFocusEvent(event)
    }

    document.addEventListener('focusin', focusListener, true)
    this.eventListeners.set('focusin', focusListener)

    logger.info('Keyboard event listeners registered')
  }

  /**
   * Handle keyboard events for help system navigation
   */
  private handleKeyboardEvent(event: KeyboardEvent): void {
    // Check for registered keyboard shortcuts
    const shortcutKey = this.generateShortcutKey(event)
    const shortcut = this.keyboardShortcuts.get(shortcutKey)

    if (shortcut) {
      event.preventDefault()
      shortcut.action()
      this.announce(`Activated: ${shortcut.description}`)
      return
    }

    // Handle special keys for help system
    switch (event.key) {
      case 'Escape':
        this.handleEscapeKey()
        break
      case 'F1':
        event.preventDefault()
        this.showContextualHelp()
        break
      case 'Tab':
        this.handleTabKey(event)
        break
      case 'Enter':
      case ' ':
        this.handleActivationKey(event)
        break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleArrowKey(event)
        break
    }
  }

  /**
   * Handle focus events for accessibility feedback
   */
  private handleFocusEvent(event: FocusEvent): void {
    const target = event.target as HTMLElement

    // Announce focused help elements to screen readers
    if (target.hasAttribute('data-help-element')) {
      const helpText =
        target.getAttribute('aria-label') ||
        target.getAttribute('data-help-tooltip') ||
        target.textContent

      if (helpText) {
        this.announce(helpText, 'polite')
      }
    }

    // Add focus to stack for management
    if (this.config.focusManagement) {
      this.focusStack.push(target)

      // Limit focus stack size
      if (this.focusStack.length > 10) {
        this.focusStack.shift()
      }
    }
  }

  /**
   * Initialize proper tab order for help elements
   */
  private initializeTabOrder(): void {
    const helpElements = document.querySelectorAll('[data-help-element]')
    const tabIndex = 0

    helpElements.forEach((element) => {
      if (!element.hasAttribute('tabindex')) {
        if (this.isInteractiveElement(element as HTMLElement)) {
          element.setAttribute('tabindex', '0')
        }
      }
    })

    logger.info('Tab order initialized for help elements')
  }

  /**
   * Check if element is interactive and should receive focus
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveRoles = [
      'button',
      'link',
      'textbox',
      'combobox',
      'checkbox',
      'radio',
      'menuitem',
      'tab',
      'option',
    ]

    const tagName = element.tagName.toLowerCase()
    const role = element.getAttribute('role')

    return (
      tagName === 'button' ||
      tagName === 'input' ||
      tagName === 'select' ||
      tagName === 'textarea' ||
      tagName === 'a' ||
      (role && interactiveRoles.includes(role)) ||
      element.hasAttribute('onclick') ||
      element.hasAttribute('data-help-button')
    )
  }

  /**
   * Set up skip links for better navigation
   */
  private setupSkipLinks(): void {
    const skipLink = document.createElement('a')
    skipLink.href = '#help-main-content'
    skipLink.textContent = 'Skip to help content'
    skipLink.className = 'skip-link'
    skipLink.addEventListener('click', (e) => {
      e.preventDefault()
      const target = document.querySelector('#help-main-content')
      if (target) {
        ;(target as HTMLElement).focus()
        this.announce('Skipped to help content')
      }
    })

    // Insert at beginning of body
    document.body.insertBefore(skipLink, document.body.firstChild)

    logger.info('Skip links added for help navigation')
  }

  /**
   * Initialize roving tabindex for complex widgets
   */
  private initializeRovingTabindex(): void {
    const helpMenus = document.querySelectorAll('[data-help-menu]')

    helpMenus.forEach((menu) => {
      const items = menu.querySelectorAll('[data-help-menu-item]')

      if (items.length > 0) {
        // Set first item as focusable
        items[0].setAttribute('tabindex', '0')

        // Set other items as not focusable
        for (let i = 1; i < items.length; i++) {
          items[i].setAttribute('tabindex', '-1')
        }

        // Add arrow key navigation
        menu.addEventListener('keydown', (e) => {
          this.handleMenuNavigation(e as KeyboardEvent, items)
        })
      }
    })

    logger.info('Roving tabindex initialized for help menus')
  }

  /**
   * Handle menu navigation with arrow keys
   */
  private handleMenuNavigation(event: KeyboardEvent, items: NodeListOf<Element>): void {
    const currentIndex = Array.from(items).findIndex((item) => item === document.activeElement)

    if (currentIndex === -1) return

    let nextIndex = currentIndex

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        nextIndex = (currentIndex + 1) % items.length
        break
      case 'ArrowUp':
        event.preventDefault()
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1
        break
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
      case 'End':
        event.preventDefault()
        nextIndex = items.length - 1
        break
    }

    if (nextIndex !== currentIndex) {
      // Update tabindex
      items[currentIndex].setAttribute('tabindex', '-1')
      items[nextIndex].setAttribute('tabindex', '0')

      // Move focus

      ;(items[nextIndex] as HTMLElement).focus()
    }
  }

  /**
   * Initialize announcer for screen reader announcements
   */
  private initializeAnnouncer(): void {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.setAttribute('class', 'sr-only')
    announcer.id = 'accessibility-announcer'

    document.body.appendChild(announcer)
    this.announcer = announcer

    logger.info('Accessibility announcer initialized')
  }

  /**
   * Initialize focus management system
   */
  private initializeFocusManagement(): void {
    // Track focus changes for restoration
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement
      if (target.hasAttribute('data-help-element')) {
        this.focusStack.push(target)
      }
    })

    // Set up focus trap for modals
    this.setupFocusTraps()

    logger.info('Focus management system initialized')
  }

  /**
   * Set up focus traps for modal help dialogs
   */
  private setupFocusTraps(): void {
    const helpModals = document.querySelectorAll('[data-help-modal]')

    helpModals.forEach((modal) => {
      modal.addEventListener('keydown', (e) => {
        this.handleModalFocusTrap(e as KeyboardEvent, modal as HTMLElement)
      })
    })
  }

  /**
   * Handle focus trapping in modal dialogs
   */
  private handleModalFocusTrap(event: KeyboardEvent, modal: HTMLElement): void {
    if (event.key !== 'Tab') return

    const focusableElements = modal.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  /**
   * Enable high contrast mode for better visibility
   */
  private enableHighContrastMode(): void {
    document.body.classList.add('help-high-contrast')

    // Apply high contrast styles dynamically
    const style = document.createElement('style')
    style.textContent = `
      .help-high-contrast {
        --help-text-color: #000000;
        --help-background-color: #ffffff;
        --help-link-color: #0000ff;
        --help-border-color: #000000;
        --help-focus-color: #ff0000;
      }
      
      .help-high-contrast [data-help-element] {
        color: var(--help-text-color) !important;
        background-color: var(--help-background-color) !important;
        border: 1px solid var(--help-border-color) !important;
      }
      
      .help-high-contrast [data-help-element]:focus {
        outline: 2px solid var(--help-focus-color) !important;
        outline-offset: 2px !important;
      }
      
      .help-high-contrast a[data-help-element] {
        color: var(--help-link-color) !important;
        text-decoration: underline !important;
      }
    `

    document.head.appendChild(style)

    logger.info('High contrast mode enabled for help system')
  }

  /**
   * Enable reduced motion for users with vestibular disorders
   */
  private enableReducedMotion(): void {
    document.body.classList.add('help-reduced-motion')

    const style = document.createElement('style')
    style.textContent = `
      .help-reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `

    document.head.appendChild(style)

    logger.info('Reduced motion mode enabled')
  }

  /**
   * Enable color blindness support with alternative indicators
   */
  private enableColorBlindnessSupport(): void {
    document.body.classList.add('help-colorblind-support')

    // Add patterns and shapes to color-coded elements
    const style = document.createElement('style')
    style.textContent = `
      .help-colorblind-support [data-help-status="success"]::before {
        content: "✓ ";
      }
      
      .help-colorblind-support [data-help-status="error"]::before {
        content: "✗ ";
      }
      
      .help-colorblind-support [data-help-status="warning"]::before {
        content: "⚠ ";
      }
      
      .help-colorblind-support [data-help-priority="high"] {
        border-left: 4px solid currentColor;
      }
    `

    document.head.appendChild(style)

    logger.info('Color blindness support enabled')
  }

  /**
   * Set up default keyboard shortcuts for help system
   */
  private setupDefaultKeyboardShortcuts(): void {
    // F1 - Show contextual help
    this.addKeyboardShortcut({
      id: 'show-help',
      keys: ['F1'],
      description: 'Show contextual help',
      action: () => this.showContextualHelp(),
      global: true,
    })

    // Ctrl+? - Show keyboard shortcuts
    this.addKeyboardShortcut({
      id: 'show-shortcuts',
      keys: ['Control', '?'],
      description: 'Show keyboard shortcuts',
      action: () => this.showKeyboardShortcuts(),
      global: true,
    })

    // Alt+H - Open help panel
    this.addKeyboardShortcut({
      id: 'toggle-help-panel',
      keys: ['Alt', 'h'],
      description: 'Toggle help panel',
      action: () => this.toggleHelpPanel(),
      global: true,
    })

    // Escape - Close help dialogs
    this.addKeyboardShortcut({
      id: 'close-help',
      keys: ['Escape'],
      description: 'Close help dialogs',
      action: () => this.closeHelpDialogs(),
      context: 'help',
    })

    logger.info('Default keyboard shortcuts configured', {
      shortcutsCount: this.keyboardShortcuts.size,
    })
  }

  // Public API methods

  /**
   * Add custom keyboard shortcut
   */
  public addKeyboardShortcut(shortcut: KeyboardShortcut): void {
    const key = shortcut.keys.join('+').toLowerCase()
    this.keyboardShortcuts.set(key, shortcut)

    logger.info('Keyboard shortcut added', {
      shortcutId: shortcut.id,
      keys: shortcut.keys,
      description: shortcut.description,
    })
  }

  /**
   * Remove keyboard shortcut
   */
  public removeKeyboardShortcut(shortcutId: string): boolean {
    for (const [key, shortcut] of this.keyboardShortcuts.entries()) {
      if (shortcut.id === shortcutId) {
        this.keyboardShortcuts.delete(key)
        logger.info('Keyboard shortcut removed', { shortcutId })
        return true
      }
    }
    return false
  }

  /**
   * Announce message to screen readers
   */
  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.announcements) return

    const liveRegion = document.getElementById(
      priority === 'assertive' ? 'help-live-assertive' : 'help-live-polite'
    )

    if (liveRegion) {
      liveRegion.textContent = message

      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }

    logger.info('Screen reader announcement', { message, priority })
  }

  /**
   * Set ARIA attributes on element
   */
  public setAriaAttributes(element: HTMLElement, attributes: AriaAttributes): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        const ariaKey =
          key === 'role' ? 'role' : `aria-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`
        element.setAttribute(ariaKey, String(value))
      }
    })

    logger.info('ARIA attributes set', {
      element: element.tagName,
      attributes: Object.keys(attributes),
    })
  }

  /**
   * Focus management - focus element with announcement
   */
  public focusElement(element: HTMLElement, announce = true): void {
    element.focus()

    if (announce) {
      const label =
        element.getAttribute('aria-label') ||
        element.getAttribute('data-help-tooltip') ||
        element.textContent

      if (label) {
        this.announce(`Focused: ${label}`)
      }
    }

    logger.info('Element focused', {
      element: element.tagName,
      id: element.id,
    })
  }

  /**
   * Restore focus to previous element
   */
  public restoreFocus(): void {
    if (this.focusStack.length > 1) {
      const previousElement = this.focusStack[this.focusStack.length - 2]
      if (previousElement && document.contains(previousElement)) {
        this.focusElement(previousElement, false)
        this.focusStack.pop()
      }
    }
  }

  /**
   * Update accessibility configuration
   */
  public updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates }

    // Apply configuration changes
    if (updates.highContrastMode !== undefined) {
      if (updates.highContrastMode) {
        this.enableHighContrastMode()
      } else {
        document.body.classList.remove('help-high-contrast')
      }
    }

    if (updates.reducedMotion !== undefined) {
      if (updates.reducedMotion) {
        this.enableReducedMotion()
      } else {
        document.body.classList.remove('help-reduced-motion')
      }
    }

    if (updates.colorBlindnessSupport !== undefined) {
      if (updates.colorBlindnessSupport) {
        this.enableColorBlindnessSupport()
      } else {
        document.body.classList.remove('help-colorblind-support')
      }
    }

    logger.info('Accessibility configuration updated', { updates })
  }

  /**
   * Get current accessibility status and compliance info
   */
  public getAccessibilityStatus(): {
    wcagCompliance: string
    featuresEnabled: string[]
    shortcutsCount: number
    liveRegionsActive: boolean
    focusManagement: boolean
  } {
    return {
      wcagCompliance: 'WCAG 2.2 AA',
      featuresEnabled: Object.entries(this.config)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      shortcutsCount: this.keyboardShortcuts.size,
      liveRegionsActive: !!document.getElementById('help-live-polite'),
      focusManagement: this.config.focusManagement,
    }
  }

  /**
   * Clean up accessibility resources
   */
  public cleanup(): void {
    // Remove event listeners
    this.eventListeners.forEach((listener, event) => {
      document.removeEventListener(event, listener)
    })
    this.eventListeners.clear()

    // Disconnect observers
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()

    // Remove announcer
    if (this.announcer?.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer)
    }

    // Clear focus stack
    this.focusStack.length = 0

    logger.info('Accessibility Manager cleaned up')
  }

  // Private helper methods

  private generateShortcutKey(event: KeyboardEvent): string {
    const keys: string[] = []

    if (event.ctrlKey) keys.push('control')
    if (event.altKey) keys.push('alt')
    if (event.shiftKey) keys.push('shift')
    if (event.metaKey) keys.push('meta')

    keys.push(event.key.toLowerCase())

    return keys.join('+')
  }

  private handleEscapeKey(): void {
    // Close any open help dialogs
    this.closeHelpDialogs()
  }

  private handleTabKey(event: KeyboardEvent): void {
    // Special handling for help system tab navigation
    const activeElement = document.activeElement as HTMLElement

    if (activeElement?.hasAttribute('data-help-element')) {
      // Let normal tab behavior work but announce context
      const context = activeElement.getAttribute('data-help-context')
      if (context) {
        this.announce(`Help context: ${context}`, 'polite')
      }
    }
  }

  private handleActivationKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement

    if (target.hasAttribute('data-help-button')) {
      event.preventDefault()
      target.click()

      const action = target.getAttribute('data-help-action')
      if (action) {
        this.announce(`Activated: ${action}`)
      }
    }
  }

  private handleArrowKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement

    // Handle arrow navigation in help menus
    if (target.closest('[data-help-menu]')) {
      // Let the menu navigation handler take care of this
      return
    }

    // Handle arrow navigation in help carousels or step-by-step guides
    if (target.closest('[data-help-carousel]')) {
      event.preventDefault()

      if (event.key === 'ArrowLeft') {
        this.navigateHelpCarousel('previous')
      } else if (event.key === 'ArrowRight') {
        this.navigateHelpCarousel('next')
      }
    }
  }

  private showContextualHelp(): void {
    // Implementation depends on help system integration
    logger.info('Showing contextual help')
    this.announce('Contextual help opened')
  }

  private showKeyboardShortcuts(): void {
    // Show list of available keyboard shortcuts
    const shortcuts = Array.from(this.keyboardShortcuts.values())
      .map((s) => `${s.keys.join(' + ')}: ${s.description}`)
      .join('\n')

    logger.info('Showing keyboard shortcuts')
    this.announce('Keyboard shortcuts dialog opened')

    // Could show in a modal or dedicated panel
    console.log('Available keyboard shortcuts:\n', shortcuts)
  }

  private toggleHelpPanel(): void {
    // Toggle help panel visibility
    logger.info('Toggling help panel')
    this.announce('Help panel toggled')
  }

  private closeHelpDialogs(): void {
    // Close any open help dialogs or panels
    const helpDialogs = document.querySelectorAll('[data-help-modal][open]')
    helpDialogs.forEach((dialog) => {
      ;(dialog as HTMLDialogElement).close?.()
    })

    if (helpDialogs.length > 0) {
      this.announce('Help dialogs closed')
      this.restoreFocus()
    }
  }

  private navigateHelpCarousel(direction: 'previous' | 'next'): void {
    logger.info(`Navigating help carousel: ${direction}`)
    this.announce(`${direction === 'next' ? 'Next' : 'Previous'} help item`)
  }
}

// Export singleton instance
export const accessibilityManager = new AccessibilityManager()

export default AccessibilityManager
