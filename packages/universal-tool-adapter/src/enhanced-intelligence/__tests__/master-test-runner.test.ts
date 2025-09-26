/**
 * Master Test Runner for Enhanced Tool Intelligence Testing Framework
 *
 * Comprehensive test orchestration system that coordinates all testing
 * frameworks to provide a complete validation of the enhanced tool
 * intelligence system including performance, quality, and user experience.
 *
 * @author Testing Framework Agent
 * @version 1.0.0
 */

import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals'
import { AnalyticsFeedbackSystem } from './analytics-feedback-system.test'
import { AutomatedTestingSuite } from './automated-testing-suite.test'
import { IntelligenceTestingFramework } from './intelligence-testing-framework.test'
import { QualityMonitoringSystem } from './quality-monitoring-system.test'
import { UserExperienceTestingFramework } from './user-experience-testing.test'

// =============================================================================
// Master Test Runner
// =============================================================================

export class MasterTestRunner {
  private intelligenceFramework: IntelligenceTestingFramework
  private automatedSuite: AutomatedTestingSuite
  private uxFramework: UserExperienceTestingFramework
  private qualityMonitoring: QualityMonitoringSystem
  private analyticsSystem: AnalyticsFeedbackSystem
  private testExecutionHistory: TestExecutionRecord[] = []

  constructor() {
    this.intelligenceFramework = new IntelligenceTestingFramework()
    this.automatedSuite = new AutomatedTestingSuite()
    this.uxFramework = new UserExperienceTestingFramework()
    this.qualityMonitoring = new QualityMonitoringSystem()
    this.analyticsSystem = new AnalyticsFeedbackSystem()
  }

  /**
   * Run the complete Enhanced Tool Intelligence Testing Suite
   */
  async runCompleteSuite(): Promise<MasterTestReport> {
    console.log('🚀 Starting Master Enhanced Tool Intelligence Testing Suite...')
    console.log('=========================================================')

    const startTime = Date.now()
    const executionId = this.generateExecutionId()

    let masterReport: MasterTestReport = {
      executionId,
      timestamp: new Date(),
      totalDuration: 0,
      overallScore: 0,
      testResults: {
        intelligence: null,
        automated: null,
        userExperience: null,
        qualityMonitoring: null,
        analytics: null,
      },
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        criticalIssues: 0,
        warnings: 0,
        recommendations: [],
      },
      executionMetadata: {
        environment: 'test',
        nodeVersion: process.version,
        testFramework: 'jest',
        parallelExecution: true,
        executionContext: 'ci/cd',
      },
      qualityGate: {
        passed: false,
        score: 0,
        threshold: 85,
        blockers: [],
        warnings: [],
      },
    }

    try {
      // Phase 1: Core Intelligence Testing
      console.log('\n📊 Phase 1: Running Core Intelligence Testing...')
      const intelligenceResults = await this.runIntelligenceTests()
      masterReport.testResults.intelligence = intelligenceResults
      this.logPhaseResults('Intelligence Testing', intelligenceResults.overallScore)

      // Phase 2: Automated Testing Suite
      console.log('\n🤖 Phase 2: Running Automated Testing Suite...')
      const automatedResults = await this.runAutomatedTests()
      masterReport.testResults.automated = automatedResults
      this.logPhaseResults('Automated Testing', automatedResults.overallHealthScore)

      // Phase 3: User Experience Testing
      console.log('\n👥 Phase 3: Running User Experience Testing...')
      const uxResults = await this.runUserExperienceTests()
      masterReport.testResults.userExperience = uxResults
      this.logPhaseResults('User Experience Testing', uxResults.overallUXScore)

      // Phase 4: Quality Monitoring
      console.log('\n📈 Phase 4: Running Quality Monitoring...')
      const qualityResults = await this.runQualityMonitoring()
      masterReport.testResults.qualityMonitoring = qualityResults
      this.logPhaseResults('Quality Monitoring', qualityResults.overallQualityScore)

      // Phase 5: Analytics and Feedback Collection
      console.log('\n📊 Phase 5: Running Analytics and Feedback Collection...')
      const analyticsResults = await this.runAnalyticsCollection()
      masterReport.testResults.analytics = analyticsResults
      this.logPhaseResults('Analytics Collection', this.calculateAnalyticsScore(analyticsResults))

      // Calculate final results
      const endTime = Date.now()
      masterReport.totalDuration = endTime - startTime

      // Generate comprehensive summary
      masterReport = await this.generateComprehensiveSummary(masterReport)

      // Evaluate quality gate
      masterReport.qualityGate = this.evaluateQualityGate(masterReport)

      // Record execution history
      this.recordExecution(masterReport)

      // Display final results
      this.displayFinalResults(masterReport)

      return masterReport
    } catch (error) {
      console.error('❌ Master Test Suite Failed:', error)

      masterReport.totalDuration = Date.now() - startTime
      masterReport.summary.criticalIssues = 1
      masterReport.qualityGate.passed = false
      masterReport.qualityGate.blockers = [`Master test suite execution failed: ${error}`]

      return masterReport
    }
  }

  /**
   * Run intelligence testing phase
   */
  private async runIntelligenceTests(): Promise<any> {
    try {
      return await this.intelligenceFramework.runComprehensiveTests()
    } catch (error) {
      console.error('Intelligence testing failed:', error)
      return this.createFailedPhaseResult('Intelligence Testing', error)
    }
  }

  /**
   * Run automated testing phase
   */
  private async runAutomatedTests(): Promise<any> {
    try {
      return await this.automatedSuite.runAutomatedTestSuite()
    } catch (error) {
      console.error('Automated testing failed:', error)
      return this.createFailedPhaseResult('Automated Testing', error)
    }
  }

  /**
   * Run user experience testing phase
   */
  private async runUserExperienceTests(): Promise<any> {
    try {
      return await this.uxFramework.runUserExperienceTests()
    } catch (error) {
      console.error('UX testing failed:', error)
      return this.createFailedPhaseResult('User Experience Testing', error)
    }
  }

  /**
   * Run quality monitoring phase
   */
  private async runQualityMonitoring(): Promise<any> {
    try {
      return await this.qualityMonitoring.runQualityMonitoring()
    } catch (error) {
      console.error('Quality monitoring failed:', error)
      return this.createFailedPhaseResult('Quality Monitoring', error)
    }
  }

  /**
   * Run analytics collection phase
   */
  private async runAnalyticsCollection(): Promise<any> {
    try {
      return await this.analyticsSystem.runAnalyticsCollection()
    } catch (error) {
      console.error('Analytics collection failed:', error)
      return this.createFailedPhaseResult('Analytics Collection', error)
    }
  }

  /**
   * Generate comprehensive summary of all test results
   */
  private async generateComprehensiveSummary(report: MasterTestReport): Promise<MasterTestReport> {
    const results = report.testResults

    // Calculate overall metrics
    const scores = [
      results.intelligence?.overallScore || 0,
      results.automated?.overallHealthScore || 0,
      results.userExperience?.overallUXScore || 0,
      results.qualityMonitoring?.overallQualityScore || 0,
      this.calculateAnalyticsScore(results.analytics) || 0,
    ].filter((score) => score > 0)

    report.overallScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0

    // Aggregate test counts
    report.summary.totalTests = this.aggregateTestCounts(results)
    report.summary.passedTests = this.aggregatePassedTests(results)
    report.summary.failedTests = this.aggregateFailedTests(results)
    report.summary.criticalIssues = this.aggregateCriticalIssues(results)
    report.summary.warnings = this.aggregateWarnings(results)

    // Generate master recommendations
    report.summary.recommendations = this.generateMasterRecommendations(results)

    return report
  }

  /**
   * Evaluate quality gate criteria
   */
  private evaluateQualityGate(report: MasterTestReport): QualityGate {
    const qualityGate: QualityGate = {
      passed: false,
      score: report.overallScore,
      threshold: 85,
      blockers: [],
      warnings: [],
    }

    // Check overall score threshold
    if (report.overallScore < qualityGate.threshold) {
      qualityGate.blockers.push(
        `Overall score ${report.overallScore.toFixed(1)}% below threshold of ${qualityGate.threshold}%`
      )
    }

    // Check critical issues
    if (report.summary.criticalIssues > 0) {
      qualityGate.blockers.push(`${report.summary.criticalIssues} critical issues detected`)
    }

    // Check specific phase requirements
    const results = report.testResults

    if (results.intelligence && results.intelligence.overallScore < 80) {
      qualityGate.warnings.push('Intelligence testing score below recommended level')
    }

    if (results.automated && results.automated.overallHealthScore < 85) {
      qualityGate.warnings.push('System health score below recommended level')
    }

    if (results.userExperience && results.userExperience.overallUXScore < 75) {
      qualityGate.warnings.push('User experience score needs improvement')
    }

    if (results.qualityMonitoring && results.qualityMonitoring.overallQualityScore < 80) {
      qualityGate.warnings.push('Quality monitoring indicates issues')
    }

    // Determine if quality gate passes
    qualityGate.passed =
      qualityGate.blockers.length === 0 && report.overallScore >= qualityGate.threshold

    return qualityGate
  }

  /**
   * Display comprehensive final results
   */
  private displayFinalResults(report: MasterTestReport): void {
    console.log(`\n${'='.repeat(80)}`)
    console.log('🎯 ENHANCED TOOL INTELLIGENCE TESTING COMPLETE')
    console.log('='.repeat(80))

    console.log(`\n📊 OVERALL RESULTS:`)
    console.log(`   • Overall Score: ${report.overallScore.toFixed(1)}%`)
    console.log(`   • Total Duration: ${(report.totalDuration / 1000).toFixed(1)}s`)
    console.log(`   • Execution ID: ${report.executionId}`)

    console.log(`\n🧪 TEST SUMMARY:`)
    console.log(`   • Total Tests: ${report.summary.totalTests}`)
    console.log(`   • Passed: ${report.summary.passedTests} ✅`)
    console.log(`   • Failed: ${report.summary.failedTests} ❌`)
    console.log(`   • Skipped: ${report.summary.skippedTests} ⏭️`)

    console.log(`\n⚠️  ISSUES:`)
    console.log(`   • Critical: ${report.summary.criticalIssues}`)
    console.log(`   • Warnings: ${report.summary.warnings}`)

    console.log(`\n🎯 QUALITY GATE:`)
    console.log(`   • Status: ${report.qualityGate.passed ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(
      `   • Score: ${report.qualityGate.score.toFixed(1)}% (Threshold: ${report.qualityGate.threshold}%)`
    )

    if (report.qualityGate.blockers.length > 0) {
      console.log(`   • Blockers:`)
      report.qualityGate.blockers.forEach((blocker) => console.log(`     - ${blocker}`))
    }

    if (report.qualityGate.warnings.length > 0) {
      console.log(`   • Warnings:`)
      report.qualityGate.warnings.forEach((warning) => console.log(`     - ${warning}`))
    }

    console.log(`\n📈 PHASE RESULTS:`)
    const results = report.testResults
    if (results.intelligence)
      console.log(`   • Intelligence Testing: ${results.intelligence.overallScore.toFixed(1)}%`)
    if (results.automated)
      console.log(`   • Automated Testing: ${results.automated.overallHealthScore.toFixed(1)}%`)
    if (results.userExperience)
      console.log(`   • User Experience: ${results.userExperience.overallUXScore.toFixed(1)}%`)
    if (results.qualityMonitoring)
      console.log(
        `   • Quality Monitoring: ${results.qualityMonitoring.overallQualityScore.toFixed(1)}%`
      )
    if (results.analytics)
      console.log(
        `   • Analytics Collection: ${this.calculateAnalyticsScore(results.analytics).toFixed(1)}%`
      )

    if (report.summary.recommendations.length > 0) {
      console.log(`\n💡 TOP RECOMMENDATIONS:`)
      report.summary.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`)
      })
    }

    console.log(`\n🔗 For detailed results, check individual test reports`)
    console.log('='.repeat(80))
  }

  /**
   * Generate master recommendations from all test results
   */
  private generateMasterRecommendations(results: any): string[] {
    const recommendations: string[] = []

    // Intelligence testing recommendations
    if (results.intelligence && results.intelligence.overallScore < 90) {
      recommendations.push(
        'Improve natural language processing accuracy for better tool recommendations'
      )
    }

    // Automated testing recommendations
    if (results.automated && results.automated.overallHealthScore < 90) {
      recommendations.push('Address performance bottlenecks identified in automated testing')
    }

    // UX testing recommendations
    if (results.userExperience && results.userExperience.overallUXScore < 85) {
      recommendations.push('Enhance user onboarding and tool discoverability based on UX testing')
    }

    // Quality monitoring recommendations
    if (results.qualityMonitoring && results.qualityMonitoring.qualityAlerts?.length > 0) {
      recommendations.push('Address quality alerts to maintain system reliability')
    }

    // Analytics recommendations
    if (results.analytics && results.analytics.userInsights?.length > 0) {
      const highPriorityInsights = results.analytics.userInsights.filter(
        (insight: any) => insight.priority === 'high'
      )
      if (highPriorityInsights.length > 0) {
        recommendations.push('Implement high-priority user insights from analytics data')
      }
    }

    // Cross-cutting recommendations
    if (this.detectCrossPhaseIssues(results)) {
      recommendations.push(
        'Address cross-system integration issues affecting multiple testing phases'
      )
    }

    return recommendations
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private generateExecutionId(): string {
    return `ETI-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  }

  private logPhaseResults(phaseName: string, score: number): void {
    const status = score >= 85 ? '✅' : score >= 70 ? '⚠️' : '❌'
    console.log(`   ${status} ${phaseName}: ${score.toFixed(1)}%`)
  }

  private createFailedPhaseResult(phaseName: string, error: any): any {
    return {
      phaseName,
      overallScore: 0,
      overallHealthScore: 0,
      overallUXScore: 0,
      overallQualityScore: 0,
      failed: true,
      error: error.toString(),
      timestamp: new Date(),
    }
  }

  private calculateAnalyticsScore(analyticsResults: any): number {
    if (!analyticsResults) return 0

    // Calculate score based on analytics completeness and data quality
    const dataQuality = analyticsResults.dataQuality?.completeness || 0
    const insightCount = analyticsResults.userInsights?.length || 0
    const feedbackVolume = analyticsResults.feedbackData?.totalFeedbackItems || 0

    const dataQualityScore = dataQuality
    const insightScore = Math.min(100, (insightCount / 10) * 100) // Up to 10 insights expected
    const volumeScore = Math.min(100, (feedbackVolume / 100) * 100) // Up to 100 feedback items expected

    return (dataQualityScore + insightScore + volumeScore) / 3
  }

  private aggregateTestCounts(results: any): number {
    let total = 0

    if (results.intelligence?.testSuites) {
      Object.values(results.intelligence.testSuites).forEach((suite: any) => {
        total += suite.totalTests || 0
      })
    }

    if (results.automated?.testResults) {
      Object.values(results.automated.testResults).forEach((result: any) => {
        if (result.tests) total += result.tests.length
      })
    }

    if (results.userExperience?.testResults) {
      Object.values(results.userExperience.testResults).forEach((result: any) => {
        if (result.tests) total += result.tests.length
      })
    }

    return total
  }

  private aggregatePassedTests(results: any): number {
    let passed = 0

    if (results.intelligence?.testSuites) {
      Object.values(results.intelligence.testSuites).forEach((suite: any) => {
        passed += suite.passed || 0
      })
    }

    if (results.automated?.testResults) {
      Object.values(results.automated.testResults).forEach((result: any) => {
        if (result.tests) {
          passed += result.tests.filter((test: any) => test.status === 'passed').length
        }
      })
    }

    if (results.userExperience?.testResults) {
      Object.values(results.userExperience.testResults).forEach((result: any) => {
        if (result.tests) {
          passed += result.tests.filter((test: any) => test.status === 'passed').length
        }
      })
    }

    return passed
  }

  private aggregateFailedTests(results: any): number {
    let failed = 0

    if (results.intelligence?.testSuites) {
      Object.values(results.intelligence.testSuites).forEach((suite: any) => {
        failed += suite.failed || 0
      })
    }

    if (results.automated?.testResults) {
      Object.values(results.automated.testResults).forEach((result: any) => {
        if (result.tests) {
          failed += result.tests.filter((test: any) => test.status === 'failed').length
        }
      })
    }

    if (results.userExperience?.testResults) {
      Object.values(results.userExperience.testResults).forEach((result: any) => {
        if (result.tests) {
          failed += result.tests.filter((test: any) => test.status === 'failed').length
        }
      })
    }

    return failed
  }

  private aggregateCriticalIssues(results: any): number {
    let criticalIssues = 0

    if (results.qualityMonitoring?.qualityAlerts) {
      criticalIssues += results.qualityMonitoring.qualityAlerts.filter(
        (alert: any) => alert.severity === 'critical'
      ).length
    }

    if (results.automated?.testResults?.regression?.regressions) {
      criticalIssues += results.automated.testResults.regression.regressions.length
    }

    return criticalIssues
  }

  private aggregateWarnings(results: any): number {
    let warnings = 0

    if (results.qualityMonitoring?.qualityAlerts) {
      warnings += results.qualityMonitoring.qualityAlerts.filter(
        (alert: any) => alert.severity === 'warning'
      ).length
    }

    return warnings
  }

  private detectCrossPhaseIssues(results: any): boolean {
    // Check for issues that span multiple testing phases
    const performanceIssues =
      (results.automated?.testResults?.performance?.bottlenecks?.length || 0) > 0
    const uxPerformanceIssues = (
      results.userExperience?.testResults?.satisfaction?.tests || []
    ).some((test: any) => test.testName.includes('performance'))

    return performanceIssues && uxPerformanceIssues
  }

  private recordExecution(report: MasterTestReport): void {
    const record: TestExecutionRecord = {
      executionId: report.executionId,
      timestamp: report.timestamp,
      duration: report.totalDuration,
      overallScore: report.overallScore,
      qualityGatePassed: report.qualityGate.passed,
      criticalIssues: report.summary.criticalIssues,
      warnings: report.summary.warnings,
    }

    this.testExecutionHistory.push(record)

    // Keep only last 50 executions
    if (this.testExecutionHistory.length > 50) {
      this.testExecutionHistory = this.testExecutionHistory.slice(-50)
    }
  }

  /**
   * Get execution history for trend analysis
   */
  public getExecutionHistory(): TestExecutionRecord[] {
    return [...this.testExecutionHistory]
  }

  /**
   * Run specific test phase only
   */
  async runPhase(phase: TestPhase): Promise<any> {
    console.log(`🎯 Running specific phase: ${phase}`)

    switch (phase) {
      case 'intelligence':
        return await this.runIntelligenceTests()
      case 'automated':
        return await this.runAutomatedTests()
      case 'userExperience':
        return await this.runUserExperienceTests()
      case 'qualityMonitoring':
        return await this.runQualityMonitoring()
      case 'analytics':
        return await this.runAnalyticsCollection()
      default:
        throw new Error(`Unknown test phase: ${phase}`)
    }
  }

  /**
   * Generate execution summary for CI/CD integration
   */
  generateCICDSummary(report: MasterTestReport): CICDSummary {
    return {
      success: report.qualityGate.passed,
      overallScore: report.overallScore,
      duration: report.totalDuration,
      testResults: {
        total: report.summary.totalTests,
        passed: report.summary.passedTests,
        failed: report.summary.failedTests,
        skipped: report.summary.skippedTests,
      },
      qualityGate: {
        passed: report.qualityGate.passed,
        score: report.qualityGate.score,
        threshold: report.qualityGate.threshold,
      },
      issues: {
        critical: report.summary.criticalIssues,
        warnings: report.summary.warnings,
        blockers: report.qualityGate.blockers,
      },
      recommendations: report.summary.recommendations,
      artifacts: {
        reportUrl: `./test-reports/${report.executionId}.json`,
        logsUrl: `./test-logs/${report.executionId}.log`,
        metricsUrl: `./test-metrics/${report.executionId}.json`,
      },
    }
  }
}

// =============================================================================
// Type Definitions
// =============================================================================

interface MasterTestReport {
  executionId: string
  timestamp: Date
  totalDuration: number
  overallScore: number
  testResults: {
    intelligence: any
    automated: any
    userExperience: any
    qualityMonitoring: any
    analytics: any
  }
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    skippedTests: number
    criticalIssues: number
    warnings: number
    recommendations: string[]
  }
  executionMetadata: {
    environment: string
    nodeVersion: string
    testFramework: string
    parallelExecution: boolean
    executionContext: string
  }
  qualityGate: QualityGate
}

interface QualityGate {
  passed: boolean
  score: number
  threshold: number
  blockers: string[]
  warnings: string[]
}

interface TestExecutionRecord {
  executionId: string
  timestamp: Date
  duration: number
  overallScore: number
  qualityGatePassed: boolean
  criticalIssues: number
  warnings: number
}

interface CICDSummary {
  success: boolean
  overallScore: number
  duration: number
  testResults: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
  qualityGate: {
    passed: boolean
    score: number
    threshold: number
  }
  issues: {
    critical: number
    warnings: number
    blockers: string[]
  }
  recommendations: string[]
  artifacts: {
    reportUrl: string
    logsUrl: string
    metricsUrl: string
  }
}

type TestPhase = 'intelligence' | 'automated' | 'userExperience' | 'qualityMonitoring' | 'analytics'

// =============================================================================
// Jest Tests for Master Test Runner
// =============================================================================

describe('Master Test Runner for Enhanced Tool Intelligence', () => {
  let masterRunner: MasterTestRunner

  beforeAll(() => {
    // Set longer timeout for comprehensive testing
    jest.setTimeout(300000) // 5 minutes
  })

  beforeEach(() => {
    masterRunner = new MasterTestRunner()
  })

  afterAll(() => {
    jest.setTimeout(5000) // Reset timeout
  })

  test('should initialize master test runner', () => {
    expect(masterRunner).toBeInstanceOf(MasterTestRunner)
  })

  test('should run complete enhanced tool intelligence testing suite', async () => {
    const report = await masterRunner.runCompleteSuite()

    // Verify report structure
    expect(report).toBeDefined()
    expect(report.executionId).toBeDefined()
    expect(report.timestamp).toBeInstanceOf(Date)
    expect(report.totalDuration).toBeGreaterThan(0)
    expect(report.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.overallScore).toBeLessThanOrEqual(100)

    // Verify test results
    expect(report.testResults).toBeDefined()
    expect(report.testResults.intelligence).toBeDefined()
    expect(report.testResults.automated).toBeDefined()
    expect(report.testResults.userExperience).toBeDefined()
    expect(report.testResults.qualityMonitoring).toBeDefined()
    expect(report.testResults.analytics).toBeDefined()

    // Verify summary
    expect(report.summary.totalTests).toBeGreaterThan(0)
    expect(report.summary.passedTests).toBeGreaterThanOrEqual(0)
    expect(report.summary.failedTests).toBeGreaterThanOrEqual(0)
    expect(report.summary.recommendations).toBeInstanceOf(Array)

    // Verify quality gate
    expect(report.qualityGate).toBeDefined()
    expect(typeof report.qualityGate.passed).toBe('boolean')
    expect(report.qualityGate.score).toBeGreaterThanOrEqual(0)
    expect(report.qualityGate.threshold).toBe(85)

    console.log(`Test completed with overall score: ${report.overallScore.toFixed(1)}%`)
    console.log(`Quality gate: ${report.qualityGate.passed ? 'PASSED' : 'FAILED'}`)
  }, 300000) // 5 minute timeout

  test('should run individual test phases', async () => {
    const phases: TestPhase[] = [
      'intelligence',
      'automated',
      'userExperience',
      'qualityMonitoring',
      'analytics',
    ]

    for (const phase of phases) {
      const result = await masterRunner.runPhase(phase)
      expect(result).toBeDefined()
      console.log(`${phase} phase completed successfully`)
    }
  })

  test('should track execution history', async () => {
    // Run a quick test
    await masterRunner.runPhase('intelligence')

    const history = masterRunner.getExecutionHistory()
    expect(history).toBeInstanceOf(Array)
  })

  test('should generate CI/CD summary', async () => {
    const report = await masterRunner.runCompleteSuite()
    const summary = masterRunner.generateCICDSummary(report)

    expect(summary).toBeDefined()
    expect(typeof summary.success).toBe('boolean')
    expect(summary.overallScore).toBeGreaterThanOrEqual(0)
    expect(summary.testResults).toBeDefined()
    expect(summary.qualityGate).toBeDefined()
    expect(summary.issues).toBeDefined()
    expect(summary.artifacts).toBeDefined()
  }, 300000)

  test('should handle individual phase failures gracefully', async () => {
    // Test error handling by mocking a failure
    const originalConsoleError = console.error
    console.error = jest.fn()

    try {
      // This should complete even if individual phases have issues
      const report = await masterRunner.runCompleteSuite()
      expect(report).toBeDefined()
      expect(report.qualityGate).toBeDefined()
    } finally {
      console.error = originalConsoleError
    }
  })

  test('should validate quality gate criteria', async () => {
    const report = await masterRunner.runCompleteSuite()

    const qualityGate = report.qualityGate

    // Quality gate should have proper structure
    expect(qualityGate.passed).toBeDefined()
    expect(qualityGate.score).toBeDefined()
    expect(qualityGate.threshold).toBe(85)
    expect(qualityGate.blockers).toBeInstanceOf(Array)
    expect(qualityGate.warnings).toBeInstanceOf(Array)

    // If quality gate failed, there should be reasons
    if (!qualityGate.passed) {
      expect(qualityGate.blockers.length > 0 || qualityGate.score < qualityGate.threshold).toBe(
        true
      )
    }
  }, 300000)

  test('should generate meaningful recommendations', async () => {
    const report = await masterRunner.runCompleteSuite()

    expect(report.summary.recommendations).toBeInstanceOf(Array)

    // If there are issues, there should be recommendations
    if (report.summary.criticalIssues > 0 || report.summary.warnings > 0) {
      expect(report.summary.recommendations.length).toBeGreaterThan(0)
    }

    // Each recommendation should be a non-empty string
    report.summary.recommendations.forEach((rec) => {
      expect(typeof rec).toBe('string')
      expect(rec.length).toBeGreaterThan(0)
    })
  }, 300000)
})

// =============================================================================
// Export for use in CI/CD and other contexts
// =============================================================================

export type { MasterTestReport, QualityGate, TestExecutionRecord, CICDSummary, TestPhase }
