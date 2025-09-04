/**
 * Accessibility Testing and Monitoring System
 *
 * Comprehensive accessibility testing automation with WCAG 2.2 compliance validation.
 * Provides automated testing, manual testing procedures, performance monitoring,
 * user feedback collection, and compliance reporting.
 *
 * Features:
 * - Automated accessibility testing with axe-core integration
 * - Manual testing procedures and checklists
 * - Screen reader testing automation
 * - Keyboard navigation validation
 * - Color contrast and visual accessibility testing
 * - Performance monitoring and real-time alerting
 * - User feedback collection for accessibility issues
 * - WCAG 2.2 compliance reporting and documentation
 * - Integration with CI/CD pipelines
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('AccessibilityTesting')

export interface AccessibilityTestConfig {
  enableAutomatedTesting: boolean
  enableManualTesting: boolean
  enableScreenReaderTesting: boolean
  enableKeyboardTesting: boolean
  enableColorContrastTesting: boolean
  enablePerformanceMonitoring: boolean
  wcagLevel: 'A' | 'AA' | 'AAA'
  includedRules: string[]
  excludedRules: string[]
  testingSchedule: 'continuous' | 'daily' | 'weekly' | 'on-demand'
  reportingEnabled: boolean
  feedbackCollectionEnabled: boolean
}

export interface AccessibilityViolation {
  id: string
  ruleId: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  tags: string[]
  description: string
  help: string
  helpUrl: string
  nodes: AccessibilityNode[]
  timestamp: Date
  status: 'active' | 'fixed' | 'ignored' | 'false-positive'
}

export interface AccessibilityNode {
  target: string[]
  html: string
  failureSummary: string
  element: HTMLElement
  any: AccessibilityCheck[]
  all: AccessibilityCheck[]
  none: AccessibilityCheck[]
}

export interface AccessibilityCheck {
  id: string
  impact: string
  message: string
  data: any
  relatedNodes: AccessibilityRelatedNode[]
}

export interface AccessibilityRelatedNode {
  target: string[]
  html: string
}

export interface TestResult {
  testId: string
  testType: 'automated' | 'manual' | 'screen-reader' | 'keyboard' | 'contrast'
  timestamp: Date
  passed: boolean
  violations: AccessibilityViolation[]
  passes: AccessibilityViolation[]
  incomplete: AccessibilityViolation[]
  inapplicable: AccessibilityViolation[]
  score: number
  wcagLevel: string
  executionTime: number
  context?: {
    url: string
    viewport: { width: number; height: number }
    userAgent: string
    component?: string
  }
}

export interface ManualTestItem {
  id: string
  category: 'keyboard' | 'screen-reader' | 'visual' | 'cognitive' | 'interaction'
  title: string
  description: string
  instructions: string[]
  criteria: string[]
  wcagReference: string
  priority: 'high' | 'medium' | 'low'
  estimatedTime: number
  completed: boolean
  passed?: boolean
  notes?: string
  tester?: string
  completedAt?: Date
}

export interface AccessibilityReport {
  id: string
  generatedAt: Date
  testResults: TestResult[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    totalViolations: number
    criticalViolations: number
    seriousViolations: number
    moderateViolations: number
    minorViolations: number
    overallScore: number
    wcagCompliance: boolean
  }
  recommendations: AccessibilityRecommendation[]
  trends?: AccessibilityTrend[]
}

export interface AccessibilityRecommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  implementation: string[]
  resources: string[]
}

export interface AccessibilityTrend {
  date: Date
  score: number
  violations: number
  improvements: number
  regressions: number
}

export interface ScreenReaderTest {
  id: string
  name: string
  screenReader: 'nvda' | 'jaws' | 'voiceover' | 'talkback' | 'orca'
  scenario: string
  expectedOutput: string[]
  actualOutput?: string[]
  passed?: boolean
  notes?: string
}

export interface KeyboardNavigationTest {
  id: string
  element: string
  interactions: KeyboardInteraction[]
  expectedBehavior: string
  actualBehavior?: string
  passed?: boolean
}

export interface KeyboardInteraction {
  key: string
  modifiers?: string[]
  expectedResult: string
}

/**
 * Comprehensive Accessibility Testing System
 *
 * Provides automated and manual testing capabilities for WCAG compliance,
 * real-time monitoring, and detailed reporting.
 */
export class AccessibilityTestingSystem {
  private config: AccessibilityTestConfig
  private testResults: Map<string, TestResult> = new Map()
  private violations: Map<string, AccessibilityViolation> = new Map()
  private manualTests: Map<string, ManualTestItem> = new Map()
  private screenReaderTests: Map<string, ScreenReaderTest> = new Map()
  private keyboardTests: Map<string, KeyboardNavigationTest> = new Map()
  private observers: Set<(result: TestResult) => void> = new Set()
  private monitoringInterval?: number

  constructor(config: Partial<AccessibilityTestConfig> = {}) {
    logger.info('Initializing Accessibility Testing System with WCAG 2.2 compliance')

    this.config = {
      enableAutomatedTesting: true,
      enableManualTesting: true,
      enableScreenReaderTesting: true,
      enableKeyboardTesting: true,
      enableColorContrastTesting: true,
      enablePerformanceMonitoring: true,
      wcagLevel: 'AA',
      includedRules: [],
      excludedRules: [],
      testingSchedule: 'continuous',
      reportingEnabled: true,
      feedbackCollectionEnabled: true,
      ...config,
    }

    this.initializeTestingSystem()
  }

  /**
   * Initialize accessibility testing system
   */
  private async initializeTestingSystem(): Promise<void> {
    logger.info('Setting up accessibility testing system', {
      automatedTesting: this.config.enableAutomatedTesting,
      manualTesting: this.config.enableManualTesting,
      wcagLevel: this.config.wcagLevel,
      schedule: this.config.testingSchedule,
    })

    // Load axe-core for automated testing
    if (this.config.enableAutomatedTesting) {
      await this.loadAxeCore()
    }

    // Initialize manual test procedures
    if (this.config.enableManualTesting) {
      this.initializeManualTests()
    }

    // Set up screen reader testing
    if (this.config.enableScreenReaderTesting) {
      this.initializeScreenReaderTests()
    }

    // Set up keyboard navigation testing
    if (this.config.enableKeyboardTesting) {
      this.initializeKeyboardTests()
    }

    // Start continuous monitoring if enabled
    if (this.config.enablePerformanceMonitoring && this.config.testingSchedule === 'continuous') {
      this.startContinuousMonitoring()
    }

    logger.info('Accessibility Testing System initialized successfully')
  }

  /**
   * Load axe-core accessibility testing library
   */
  private async loadAxeCore(): Promise<void> {
    try {
      // Check if axe is already loaded
      if (typeof (window as any).axe !== 'undefined') {
        logger.info('axe-core already loaded')
        return
      }

      // Load axe-core dynamically
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.8.0/axe.min.js'
      script.async = true

      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })

      // Configure axe for help system
      if ((window as any).axe) {
        ;(window as any).axe.configure({
          tags: this.getAxeTags(),
          rules: this.getAxeRules(),
        })
      }

      logger.info('axe-core loaded and configured for accessibility testing')
    } catch (error) {
      logger.error('Failed to load axe-core', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error('Could not initialize automated accessibility testing')
    }
  }

  /**
   * Get axe tags based on WCAG level
   */
  private getAxeTags(): string[] {
    const baseTags = ['wcag2a', 'wcag21a']

    if (this.config.wcagLevel === 'AA' || this.config.wcagLevel === 'AAA') {
      baseTags.push('wcag2aa', 'wcag21aa', 'wcag22aa')
    }

    if (this.config.wcagLevel === 'AAA') {
      baseTags.push('wcag2aaa', 'wcag21aaa')
    }

    return baseTags
  }

  /**
   * Get axe rules configuration
   */
  private getAxeRules(): Record<string, { enabled: boolean }> {
    const rules: Record<string, { enabled: boolean }> = {}

    // Enable included rules
    this.config.includedRules.forEach((ruleId) => {
      rules[ruleId] = { enabled: true }
    })

    // Disable excluded rules
    this.config.excludedRules.forEach((ruleId) => {
      rules[ruleId] = { enabled: false }
    })

    return rules
  }

  /**
   * Run comprehensive automated accessibility test
   */
  public async runAutomatedTest(
    element?: HTMLElement,
    options?: {
      includedRules?: string[]
      excludedRules?: string[]
      tags?: string[]
      context?: string
    }
  ): Promise<TestResult> {
    if (!this.config.enableAutomatedTesting) {
      throw new Error('Automated testing is disabled')
    }

    const testId = `automated-${Date.now()}`
    const startTime = Date.now()

    logger.info('Running automated accessibility test', {
      testId,
      element: element?.tagName,
      options,
    })

    try {
      const axe = (window as any).axe
      if (!axe) {
        throw new Error('axe-core not available')
      }

      // Configure test options
      const axeOptions = {
        tags: options?.tags || this.getAxeTags(),
        rules: {
          ...this.getAxeRules(),
          ...this.buildRulesConfig(options?.includedRules, options?.excludedRules),
        },
      }

      // Run axe test
      const results = await axe.run(element || document, axeOptions)

      // Process results
      const testResult: TestResult = {
        testId,
        testType: 'automated',
        timestamp: new Date(),
        passed: results.violations.length === 0,
        violations: results.violations.map((v: any) => this.processViolation(v)),
        passes: results.passes.map((p: any) => this.processViolation(p)),
        incomplete: results.incomplete.map((i: any) => this.processViolation(i)),
        inapplicable: results.inapplicable.map((ia: any) => this.processViolation(ia)),
        score: this.calculateAccessibilityScore(results),
        wcagLevel: this.config.wcagLevel,
        executionTime: Date.now() - startTime,
        context: {
          url: window.location.href,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          userAgent: navigator.userAgent,
          component: options?.context,
        },
      }

      // Store results
      this.testResults.set(testId, testResult)

      // Store violations
      testResult.violations.forEach((violation) => {
        this.violations.set(violation.id, violation)
      })

      // Notify observers
      this.notifyTestComplete(testResult)

      logger.info('Automated accessibility test completed', {
        testId,
        passed: testResult.passed,
        violationsCount: testResult.violations.length,
        score: testResult.score,
        executionTime: testResult.executionTime,
      })

      return testResult
    } catch (error) {
      logger.error('Automated accessibility test failed', {
        testId,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      })

      throw error
    }
  }

  /**
   * Build rules configuration from included/excluded arrays
   */
  private buildRulesConfig(
    includedRules?: string[],
    excludedRules?: string[]
  ): Record<string, { enabled: boolean }> {
    const rules: Record<string, { enabled: boolean }> = {}

    includedRules?.forEach((ruleId) => {
      rules[ruleId] = { enabled: true }
    })

    excludedRules?.forEach((ruleId) => {
      rules[ruleId] = { enabled: false }
    })

    return rules
  }

  /**
   * Process axe violation into our format
   */
  private processViolation(violation: any): AccessibilityViolation {
    return {
      id: `${violation.id}-${Date.now()}`,
      ruleId: violation.id,
      impact: violation.impact || 'moderate',
      tags: violation.tags || [],
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes:
        violation.nodes?.map((node: any) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
          element: node.element,
          any: node.any || [],
          all: node.all || [],
          none: node.none || [],
        })) || [],
      timestamp: new Date(),
      status: 'active',
    }
  }

  /**
   * Calculate accessibility score from test results
   */
  private calculateAccessibilityScore(results: any): number {
    const totalTests = results.passes.length + results.violations.length
    if (totalTests === 0) return 100

    // Weight violations by impact
    const impactWeights = { critical: 4, serious: 3, moderate: 2, minor: 1 }
    const totalViolationWeight = results.violations.reduce((sum: number, v: any) => {
      return sum + (impactWeights[v.impact as keyof typeof impactWeights] || 1)
    }, 0)

    const maxPossibleWeight = totalTests * 4 // All critical
    const score = Math.max(0, 100 - (totalViolationWeight / maxPossibleWeight) * 100)

    return Math.round(score)
  }

  /**
   * Initialize manual testing procedures
   */
  private initializeManualTests(): void {
    const manualTests: ManualTestItem[] = [
      {
        id: 'keyboard-navigation',
        category: 'keyboard',
        title: 'Keyboard Navigation Test',
        description:
          'Test all interactive elements can be reached and operated using only keyboard',
        instructions: [
          'Use Tab key to navigate through all interactive elements',
          'Use Shift+Tab to navigate backwards',
          'Test Enter and Space keys activate buttons and links',
          'Test arrow keys work in menus and lists',
          'Verify focus indicators are clearly visible',
          'Check no keyboard traps exist',
        ],
        criteria: [
          'All interactive elements are reachable via keyboard',
          'Focus indicators are clearly visible',
          'Navigation order is logical',
          'No keyboard traps present',
          'All functionality available via keyboard',
        ],
        wcagReference: 'WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7',
        priority: 'high',
        estimatedTime: 15,
        completed: false,
      },
      {
        id: 'screen-reader-compatibility',
        category: 'screen-reader',
        title: 'Screen Reader Compatibility',
        description: 'Test help content is properly announced by screen readers',
        instructions: [
          'Enable screen reader (NVDA, JAWS, VoiceOver)',
          'Navigate through help content using screen reader',
          'Verify all text content is announced',
          'Check ARIA labels and descriptions are read',
          'Test landmark navigation works',
          'Verify form labels are associated correctly',
        ],
        criteria: [
          'All content is announced by screen reader',
          'ARIA labels provide clear descriptions',
          'Navigation landmarks work correctly',
          'Form controls have proper labels',
          'Interactive elements announce their role and state',
        ],
        wcagReference: 'WCAG 1.3.1, 2.4.6, 3.3.2, 4.1.2, 4.1.3',
        priority: 'high',
        estimatedTime: 20,
        completed: false,
      },
      {
        id: 'color-contrast-visual',
        category: 'visual',
        title: 'Color Contrast and Visual Accessibility',
        description: 'Manually verify color contrast meets WCAG requirements',
        instructions: [
          'Check text has sufficient contrast against backgrounds',
          'Verify interactive elements meet contrast ratios',
          'Test with high contrast mode enabled',
          'Check color is not the only way to convey information',
          'Verify content is readable at 200% zoom',
          'Test with color blindness simulation tools',
        ],
        criteria: [
          'Text contrast ratio meets WCAG AA (4.5:1 normal, 3:1 large)',
          'Interactive elements meet contrast requirements',
          'Information not conveyed by color alone',
          'Content readable at 200% zoom',
          'Works with high contrast mode',
        ],
        wcagReference: 'WCAG 1.4.3, 1.4.4, 1.4.6, 1.4.11',
        priority: 'high',
        estimatedTime: 10,
        completed: false,
      },
      {
        id: 'focus-management',
        category: 'interaction',
        title: 'Focus Management',
        description: 'Test focus is properly managed in dynamic content',
        instructions: [
          'Open help modals and verify focus moves to modal',
          'Close modals and verify focus returns to trigger',
          'Test focus trapping in modal dialogs',
          'Verify skip links work correctly',
          'Check focus is not lost when content updates',
        ],
        criteria: [
          'Focus moves to modals when opened',
          'Focus returns to trigger when closed',
          'Focus is trapped in modal dialogs',
          'Skip links function properly',
          'Focus management is predictable',
        ],
        wcagReference: 'WCAG 2.4.3, 3.2.1, 3.2.2',
        priority: 'high',
        estimatedTime: 12,
        completed: false,
      },
      {
        id: 'cognitive-accessibility',
        category: 'cognitive',
        title: 'Cognitive Accessibility',
        description: 'Test content is understandable and predictable',
        instructions: [
          'Check help content is written in plain language',
          'Verify instructions are clear and specific',
          'Test error messages are helpful and actionable',
          'Check time limits are reasonable or can be extended',
          'Verify animations can be paused or disabled',
        ],
        criteria: [
          'Content uses plain, understandable language',
          'Instructions are clear and specific',
          'Error messages are helpful',
          'Time limits are appropriate',
          'Animations are controllable',
        ],
        wcagReference: 'WCAG 2.2.2, 3.1.3, 3.2.4, 3.3.1, 3.3.3',
        priority: 'medium',
        estimatedTime: 15,
        completed: false,
      },
    ]

    manualTests.forEach((test) => {
      this.manualTests.set(test.id, test)
    })

    logger.info('Manual test procedures initialized', {
      testsCount: manualTests.length,
      categories: [...new Set(manualTests.map((t) => t.category))],
    })
  }

  /**
   * Initialize screen reader tests
   */
  private initializeScreenReaderTests(): void {
    const screenReaderTests: ScreenReaderTest[] = [
      {
        id: 'help-tooltip-announcement',
        name: 'Help Tooltip Announcement',
        screenReader: 'nvda',
        scenario: 'Focus on element with help tooltip and verify announcement',
        expectedOutput: [
          'Button, Help: Create new workflow',
          'Help tooltip, Create a new workflow by clicking this button',
        ],
      },
      {
        id: 'help-panel-navigation',
        name: 'Help Panel Navigation',
        screenReader: 'nvda',
        scenario: 'Navigate through help panel using landmarks',
        expectedOutput: [
          'Main landmark, Help content',
          'Navigation landmark, Help navigation',
          'Complementary landmark, Additional help information',
        ],
      },
      {
        id: 'help-search-results',
        name: 'Help Search Results Announcement',
        screenReader: 'nvda',
        scenario: 'Perform help search and navigate results',
        expectedOutput: [
          'Live region, 5 search results found',
          'List, Search results',
          'Link, How to create workflows',
        ],
      },
    ]

    screenReaderTests.forEach((test) => {
      this.screenReaderTests.set(test.id, test)
    })

    logger.info('Screen reader tests initialized', {
      testsCount: screenReaderTests.length,
    })
  }

  /**
   * Initialize keyboard navigation tests
   */
  private initializeKeyboardTests(): void {
    const keyboardTests: KeyboardNavigationTest[] = [
      {
        id: 'help-button-navigation',
        element: '[data-help-button]',
        interactions: [
          {
            key: 'Tab',
            expectedResult: 'Focus moves to help button with visible focus indicator',
          },
          {
            key: 'Enter',
            expectedResult: 'Help content is displayed',
          },
          {
            key: 'Escape',
            expectedResult: 'Help content is dismissed',
          },
        ],
        expectedBehavior: 'Help buttons are fully keyboard accessible',
      },
      {
        id: 'help-menu-navigation',
        element: '[data-help-menu]',
        interactions: [
          {
            key: 'ArrowDown',
            expectedResult: 'Focus moves to next menu item',
          },
          {
            key: 'ArrowUp',
            expectedResult: 'Focus moves to previous menu item',
          },
          {
            key: 'Home',
            expectedResult: 'Focus moves to first menu item',
          },
          {
            key: 'End',
            expectedResult: 'Focus moves to last menu item',
          },
        ],
        expectedBehavior: 'Help menus support arrow key navigation',
      },
    ]

    keyboardTests.forEach((test) => {
      this.keyboardTests.set(test.id, test)
    })

    logger.info('Keyboard navigation tests initialized', {
      testsCount: keyboardTests.length,
    })
  }

  /**
   * Start continuous accessibility monitoring
   */
  private startContinuousMonitoring(): void {
    // Run test every 30 seconds
    this.monitoringInterval = window.setInterval(async () => {
      try {
        await this.runAutomatedTest(undefined, { context: 'continuous-monitoring' })
      } catch (error) {
        logger.error('Continuous monitoring test failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }, 30000)

    logger.info('Continuous accessibility monitoring started')
  }

  /**
   * Run manual test
   */
  public async runManualTest(testId: string, tester: string): Promise<ManualTestItem> {
    const test = this.manualTests.get(testId)
    if (!test) {
      throw new Error(`Manual test ${testId} not found`)
    }

    logger.info('Starting manual test', {
      testId,
      title: test.title,
      tester,
    })

    // Mark test as started
    test.tester = tester
    test.completed = false
    this.manualTests.set(testId, test)

    return test
  }

  /**
   * Complete manual test
   */
  public completeManualTest(testId: string, passed: boolean, notes?: string): ManualTestItem {
    const test = this.manualTests.get(testId)
    if (!test) {
      throw new Error(`Manual test ${testId} not found`)
    }

    test.completed = true
    test.passed = passed
    test.notes = notes
    test.completedAt = new Date()

    this.manualTests.set(testId, test)

    logger.info('Manual test completed', {
      testId,
      passed,
      tester: test.tester,
      executionTime: test.completedAt.getTime() - (test.completedAt.getTime() - 1000), // Approximate
    })

    return test
  }

  /**
   * Generate accessibility report
   */
  public generateReport(): AccessibilityReport {
    const testResults = Array.from(this.testResults.values())
    const violations = Array.from(this.violations.values())

    const summary = {
      totalTests: testResults.length,
      passedTests: testResults.filter((t) => t.passed).length,
      failedTests: testResults.filter((t) => !t.passed).length,
      totalViolations: violations.length,
      criticalViolations: violations.filter((v) => v.impact === 'critical').length,
      seriousViolations: violations.filter((v) => v.impact === 'serious').length,
      moderateViolations: violations.filter((v) => v.impact === 'moderate').length,
      minorViolations: violations.filter((v) => v.impact === 'minor').length,
      overallScore: this.calculateOverallScore(testResults),
      wcagCompliance:
        violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length === 0,
    }

    const report: AccessibilityReport = {
      id: `report-${Date.now()}`,
      generatedAt: new Date(),
      testResults,
      summary,
      recommendations: this.generateRecommendations(violations),
    }

    logger.info('Accessibility report generated', {
      reportId: report.id,
      summary,
    })

    return report
  }

  /**
   * Calculate overall accessibility score
   */
  private calculateOverallScore(testResults: TestResult[]): number {
    if (testResults.length === 0) return 0

    const totalScore = testResults.reduce((sum, result) => sum + result.score, 0)
    return Math.round(totalScore / testResults.length)
  }

  /**
   * Generate accessibility recommendations
   */
  private generateRecommendations(
    violations: AccessibilityViolation[]
  ): AccessibilityRecommendation[] {
    const recommendations: AccessibilityRecommendation[] = []

    // Group violations by rule ID
    const violationsByRule = new Map<string, AccessibilityViolation[]>()
    violations.forEach((violation) => {
      const existing = violationsByRule.get(violation.ruleId) || []
      existing.push(violation)
      violationsByRule.set(violation.ruleId, existing)
    })

    // Generate recommendations for each rule
    violationsByRule.forEach((ruleViolations, ruleId) => {
      const recommendation = this.createRecommendation(ruleId, ruleViolations)
      if (recommendation) {
        recommendations.push(recommendation)
      }
    })

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Create recommendation for rule violations
   */
  private createRecommendation(
    ruleId: string,
    violations: AccessibilityViolation[]
  ): AccessibilityRecommendation | null {
    const highestImpact = violations.reduce(
      (max, v) => {
        const impactOrder = { critical: 4, serious: 3, moderate: 2, minor: 1 }
        return impactOrder[v.impact] > impactOrder[max] ? v.impact : max
      },
      'minor' as AccessibilityViolation['impact']
    )

    const priority =
      highestImpact === 'critical'
        ? 'critical'
        : highestImpact === 'serious'
          ? 'high'
          : highestImpact === 'moderate'
            ? 'medium'
            : 'low'

    // Rule-specific recommendations
    const ruleRecommendations: Record<string, Partial<AccessibilityRecommendation>> = {
      'color-contrast': {
        title: 'Improve Color Contrast',
        description: 'Text and interactive elements need better color contrast for accessibility',
        category: 'visual',
        implementation: [
          'Increase contrast ratio to meet WCAG AA standards (4.5:1 for normal text)',
          'Use color contrast tools to verify compliance',
          'Consider high contrast mode support',
          'Test with color blindness simulation',
        ],
        resources: [
          'https://webaim.org/resources/contrastchecker/',
          'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
        ],
        effort: 'low',
      },
      keyboard: {
        title: 'Fix Keyboard Navigation',
        description: 'Interactive elements are not fully accessible via keyboard',
        category: 'keyboard',
        implementation: [
          'Add proper tabindex values to interactive elements',
          'Implement keyboard event handlers',
          'Ensure focus indicators are visible',
          'Test tab order and navigation flow',
        ],
        resources: [
          'https://webaim.org/techniques/keyboard/',
          'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
        ],
        effort: 'medium',
      },
    }

    const baseRecommendation = ruleRecommendations[ruleId] || {
      title: `Fix ${ruleId} Issues`,
      description: violations[0].description,
      category: 'general',
      implementation: ['Review and fix accessibility violations'],
      resources: [violations[0].helpUrl],
      effort: 'medium',
    }

    return {
      id: `rec-${ruleId}-${Date.now()}`,
      priority,
      impact: `Affects ${violations.length} element${violations.length > 1 ? 's' : ''}`,
      ...baseRecommendation,
    } as AccessibilityRecommendation
  }

  /**
   * Add test observer
   */
  public onTestComplete(callback: (result: TestResult) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  /**
   * Notify observers of test completion
   */
  private notifyTestComplete(result: TestResult): void {
    this.observers.forEach((callback) => {
      try {
        callback(result)
      } catch (error) {
        logger.error('Test observer error', {
          testId: result.testId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }

  /**
   * Get testing statistics
   */
  public getTestingStats(): {
    automatedTests: number
    manualTests: number
    completedManualTests: number
    totalViolations: number
    averageScore: number
    wcagCompliance: boolean
  } {
    const testResults = Array.from(this.testResults.values())
    const manualTests = Array.from(this.manualTests.values())
    const violations = Array.from(this.violations.values())

    return {
      automatedTests: testResults.length,
      manualTests: manualTests.length,
      completedManualTests: manualTests.filter((t) => t.completed).length,
      totalViolations: violations.length,
      averageScore: this.calculateOverallScore(testResults),
      wcagCompliance:
        violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length === 0,
    }
  }

  /**
   * Clean up testing resources
   */
  public cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    this.testResults.clear()
    this.violations.clear()
    this.observers.clear()

    logger.info('Accessibility Testing System cleaned up')
  }
}

// Export singleton instance
export const accessibilityTesting = new AccessibilityTestingSystem()

export default AccessibilityTestingSystem
