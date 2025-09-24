/**
 * Comprehensive Test Documentation and Reporting System
 * ====================================================
 *
 * Advanced reporting utilities for the workflow-to-journey mapping system
 * test infrastructure with detailed analytics, visualizations, and insights.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type {
  ConversionError,
  ConversionWarning,
  TestScenario,
  ValidationResult,
} from '../../services/parlant/workflow-converter/types'

// ========================================
// REPORTING CONFIGURATION
// ========================================

export interface TestReportConfig {
  outputDir: string
  includeScreenshots: boolean
  generateVisualizations: boolean
  includePerformanceMetrics: boolean
  includeCoverageAnalysis: boolean
  enableRealTimeReporting: boolean
  reportFormats: ('html' | 'json' | 'markdown' | 'junit' | 'pdf')[]
  retentionDays: number
}

export interface TestExecutionResult {
  testId: string
  scenarioId: string
  scenarioName: string
  status: 'passed' | 'failed' | 'skipped' | 'error'
  duration: number
  startTime: Date
  endTime: Date
  errors: ConversionError[]
  warnings: ConversionWarning[]
  metrics: TestMetrics
  artifacts: TestArtifacts
  metadata: Record<string, any>
}

export interface TestMetrics {
  conversionAccuracy: number
  performanceScore: number
  memoryUsage: {
    peak: number
    average: number
    final: number
  }
  processingTime: {
    conversion: number
    validation: number
    total: number
  }
  qualityMetrics: {
    stateCount: number
    transitionCount: number
    complexityScore: number
    completeness: number
  }
}

export interface TestArtifacts {
  screenshots: string[]
  logs: string[]
  conversionOutput: string
  errorTraces: string[]
  performanceProfiles: string[]
  visualizations: string[]
}

export interface TestSuite {
  id: string
  name: string
  description: string
  startTime: Date
  endTime?: Date
  duration?: number
  totalTests: number
  passed: number
  failed: number
  skipped: number
  errors: number
  results: TestExecutionResult[]
  summary: TestSuiteSummary
}

export interface TestSuiteSummary {
  overallStatus: 'passed' | 'failed' | 'error'
  successRate: number
  averageDuration: number
  totalDuration: number
  criticalIssues: number
  warningsCount: number
  performanceAverage: number
  coveragePercentage: number
  trends: {
    improvement: boolean
    regressions: string[]
    newIssues: string[]
  }
}

// ========================================
// COMPREHENSIVE TEST REPORTER
// ========================================

export class ComprehensiveTestReporter {
  private config: TestReportConfig
  private currentSuite: TestSuite | null = null
  private historicalData: TestSuite[] = []
  private realTimeCallbacks: ((update: RealtimeUpdate) => void)[] = []

  constructor(config: Partial<TestReportConfig> = {}) {
    this.config = {
      outputDir: './test-reports',
      includeScreenshots: true,
      generateVisualizations: true,
      includePerformanceMetrics: true,
      includeCoverageAnalysis: true,
      enableRealTimeReporting: false,
      reportFormats: ['html', 'json', 'markdown'],
      retentionDays: 30,
      ...config,
    }

    this.ensureOutputDirectory()
    this.loadHistoricalData()
  }

  // ========================================
  // TEST SUITE MANAGEMENT
  // ========================================

  /**
   * Start a new test suite execution
   */
  startTestSuite(id: string, name: string, description: string): void {
    this.currentSuite = {
      id,
      name,
      description,
      startTime: new Date(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: 0,
      results: [],
      summary: this.createEmptySummary(),
    }

    this.emitRealTimeUpdate({
      type: 'suite_started',
      suiteId: id,
      timestamp: new Date(),
      data: { name, description },
    })

    console.log(`🚀 Starting test suite: ${name}`)
  }

  /**
   * Complete the current test suite
   */
  async finishTestSuite(): Promise<TestSuite> {
    if (!this.currentSuite) {
      throw new Error('No active test suite to finish')
    }

    this.currentSuite.endTime = new Date()
    this.currentSuite.duration =
      this.currentSuite.endTime.getTime() - this.currentSuite.startTime.getTime()
    this.currentSuite.summary = this.generateSuiteSummary(this.currentSuite)

    // Save to historical data
    this.historicalData.push(this.currentSuite)
    this.saveHistoricalData()

    // Generate all requested report formats
    await this.generateAllReports(this.currentSuite)

    const completedSuite = this.currentSuite
    this.currentSuite = null

    this.emitRealTimeUpdate({
      type: 'suite_completed',
      suiteId: completedSuite.id,
      timestamp: new Date(),
      data: { summary: completedSuite.summary },
    })

    console.log(`✅ Test suite completed: ${completedSuite.name}`)
    console.log(
      `   Total: ${completedSuite.totalTests}, Passed: ${completedSuite.passed}, Failed: ${completedSuite.failed}`
    )
    console.log(`   Duration: ${this.formatDuration(completedSuite.duration!)}`)

    return completedSuite
  }

  // ========================================
  // INDIVIDUAL TEST REPORTING
  // ========================================

  /**
   * Record a test execution result
   */
  recordTestResult(result: TestExecutionResult): void {
    if (!this.currentSuite) {
      throw new Error('No active test suite to record results')
    }

    this.currentSuite.results.push(result)
    this.currentSuite.totalTests++

    switch (result.status) {
      case 'passed':
        this.currentSuite.passed++
        break
      case 'failed':
        this.currentSuite.failed++
        break
      case 'skipped':
        this.currentSuite.skipped++
        break
      case 'error':
        this.currentSuite.errors++
        break
    }

    this.emitRealTimeUpdate({
      type: 'test_completed',
      suiteId: this.currentSuite.id,
      timestamp: new Date(),
      data: {
        testId: result.testId,
        status: result.status,
        duration: result.duration,
        progress: {
          completed: this.currentSuite.totalTests,
          total: this.currentSuite.totalTests, // Will be updated as more tests are added
        },
      },
    })

    console.log(
      `${this.getStatusEmoji(result.status)} ${result.scenarioName} (${this.formatDuration(result.duration)})`
    )

    if (result.errors.length > 0) {
      result.errors.forEach((error) => console.error(`   ❌ ${error.message}`))
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((warning) => console.warn(`   ⚠️  ${warning.message}`))
    }
  }

  /**
   * Create a test execution result from scenario and conversion data
   */
  createTestResult(
    scenario: TestScenario,
    conversionResult: any,
    validationResult: ValidationResult,
    startTime: Date,
    endTime: Date,
    errors: ConversionError[] = [],
    warnings: ConversionWarning[] = []
  ): TestExecutionResult {
    const duration = endTime.getTime() - startTime.getTime()
    const status = this.determineTestStatus(validationResult, errors)

    return {
      testId: `test_${scenario.id}_${Date.now()}`,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status,
      duration,
      startTime,
      endTime,
      errors,
      warnings,
      metrics: this.calculateTestMetrics(scenario, conversionResult, duration),
      artifacts: this.collectTestArtifacts(scenario, conversionResult),
      metadata: {
        scenarioComplexity: scenario.complexity,
        nodeCount: scenario.metadata.nodeCount,
        edgeCount: scenario.metadata.edgeCount,
        blockTypes: scenario.metadata.blockTypes,
        validationScore: validationResult.score || 0,
      },
    }
  }

  private determineTestStatus(
    validationResult: ValidationResult,
    errors: ConversionError[]
  ): 'passed' | 'failed' | 'skipped' | 'error' {
    if (errors.some((e) => e.severity === 'critical' || e.severity === 'error')) {
      return 'error'
    }
    if (!validationResult.isValid) {
      return 'failed'
    }
    return 'passed'
  }

  private calculateTestMetrics(
    scenario: TestScenario,
    conversionResult: any,
    duration: number
  ): TestMetrics {
    const conversionAccuracy = this.calculateConversionAccuracy(scenario, conversionResult)
    const performanceScore = this.calculatePerformanceScore(duration, scenario.complexity)
    const memoryUsage = this.estimateMemoryUsage(scenario)
    const qualityMetrics = this.calculateQualityMetrics(scenario, conversionResult)

    return {
      conversionAccuracy,
      performanceScore,
      memoryUsage,
      processingTime: {
        conversion: duration * 0.7, // Estimate
        validation: duration * 0.2, // Estimate
        total: duration,
      },
      qualityMetrics,
    }
  }

  private calculateConversionAccuracy(scenario: TestScenario, conversionResult: any): number {
    // Calculate accuracy based on expected vs actual conversion results
    let accuracy = 100

    // Basic checks
    if (!conversionResult) accuracy -= 50
    if (!conversionResult.states) accuracy -= 20
    if (!conversionResult.transitions) accuracy -= 20

    // Node count accuracy
    const expectedNodes = scenario.metadata.nodeCount
    const actualNodes = conversionResult?.states?.length || 0
    const nodeAccuracy = Math.max(0, 100 - Math.abs(expectedNodes - actualNodes) * 5)
    accuracy = (accuracy + nodeAccuracy) / 2

    return Math.max(0, Math.min(100, accuracy))
  }

  private calculatePerformanceScore(duration: number, complexity: string): number {
    const targets: Record<string, number> = {
      simple: 500, // 500ms target
      medium: 1000, // 1s target
      complex: 2000, // 2s target
      extreme: 5000, // 5s target
    }

    const target = targets[complexity] || 1000
    const score = Math.max(0, Math.min(100, (target / Math.max(duration, 1)) * 100))
    return score
  }

  private estimateMemoryUsage(scenario: TestScenario): TestMetrics['memoryUsage'] {
    // Estimate memory usage based on scenario complexity
    const baseMemory = 10 * 1024 * 1024 // 10MB base
    const nodeMemory = scenario.metadata.nodeCount * 100 * 1024 // 100KB per node
    const edgeMemory = scenario.metadata.edgeCount * 50 * 1024 // 50KB per edge

    const estimated = baseMemory + nodeMemory + edgeMemory

    return {
      peak: estimated * 1.5,
      average: estimated,
      final: estimated * 0.8,
    }
  }

  private calculateQualityMetrics(
    scenario: TestScenario,
    conversionResult: any
  ): TestMetrics['qualityMetrics'] {
    const stateCount = conversionResult?.states?.length || 0
    const transitionCount = conversionResult?.transitions?.length || 0

    // Complexity score based on branching factor, depth, and loops
    const complexityScore =
      scenario.metadata.branchingFactor * 10 +
      scenario.metadata.maxDepth * 5 +
      (scenario.metadata.containsLoops ? 20 : 0)

    // Completeness based on how well the conversion preserved the original structure
    const completeness = Math.min(
      100,
      ((stateCount + transitionCount) /
        (scenario.metadata.nodeCount + scenario.metadata.edgeCount)) *
        100
    )

    return {
      stateCount,
      transitionCount,
      complexityScore,
      completeness,
    }
  }

  private collectTestArtifacts(scenario: TestScenario, conversionResult: any): TestArtifacts {
    const artifactsDir = join(this.config.outputDir, 'artifacts')
    this.ensureDirectory(artifactsDir)

    return {
      screenshots: [], // Would be populated in actual test execution
      logs: [`${artifactsDir}/test_${scenario.id}_${Date.now()}.log`],
      conversionOutput: JSON.stringify(conversionResult, null, 2),
      errorTraces: [],
      performanceProfiles: [],
      visualizations: [],
    }
  }

  // ========================================
  // REPORT GENERATION
  // ========================================

  /**
   * Generate all requested report formats
   */
  private async generateAllReports(suite: TestSuite): Promise<void> {
    const promises = this.config.reportFormats.map((format) => {
      switch (format) {
        case 'html':
          return this.generateHtmlReport(suite)
        case 'json':
          return this.generateJsonReport(suite)
        case 'markdown':
          return this.generateMarkdownReport(suite)
        case 'junit':
          return this.generateJUnitReport(suite)
        case 'pdf':
          return this.generatePdfReport(suite)
        default:
          return Promise.resolve()
      }
    })

    await Promise.all(promises)
    console.log(`📊 Reports generated in: ${this.config.outputDir}`)
  }

  /**
   * Generate comprehensive HTML report
   */
  private async generateHtmlReport(suite: TestSuite): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${suite.name}</title>
    <style>
        ${this.getHtmlReportStyles()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>🧪 Test Execution Report</h1>
            <div class="suite-info">
                <h2>${suite.name}</h2>
                <p>${suite.description}</p>
                <div class="meta-info">
                    <span>🕐 Started: ${suite.startTime.toLocaleString()}</span>
                    <span>⏱️ Duration: ${this.formatDuration(suite.duration!)}</span>
                    <span>📊 Tests: ${suite.totalTests}</span>
                </div>
            </div>
        </header>

        <section class="summary-section">
            <h3>📈 Executive Summary</h3>
            <div class="summary-grid">
                <div class="summary-card success">
                    <h4>✅ Passed</h4>
                    <div class="metric">${suite.passed}</div>
                    <div class="percentage">${this.calculatePercentage(suite.passed, suite.totalTests)}%</div>
                </div>
                <div class="summary-card failure">
                    <h4>❌ Failed</h4>
                    <div class="metric">${suite.failed}</div>
                    <div class="percentage">${this.calculatePercentage(suite.failed, suite.totalTests)}%</div>
                </div>
                <div class="summary-card error">
                    <h4>🚫 Errors</h4>
                    <div class="metric">${suite.errors}</div>
                    <div class="percentage">${this.calculatePercentage(suite.errors, suite.totalTests)}%</div>
                </div>
                <div class="summary-card skipped">
                    <h4>⏭️ Skipped</h4>
                    <div class="metric">${suite.skipped}</div>
                    <div class="percentage">${this.calculatePercentage(suite.skipped, suite.totalTests)}%</div>
                </div>
            </div>

            <div class="performance-summary">
                <h4>🚀 Performance Metrics</h4>
                <div class="performance-grid">
                    <div class="perf-metric">
                        <span>Average Duration</span>
                        <strong>${this.formatDuration(suite.summary.averageDuration)}</strong>
                    </div>
                    <div class="perf-metric">
                        <span>Success Rate</span>
                        <strong>${suite.summary.successRate.toFixed(1)}%</strong>
                    </div>
                    <div class="perf-metric">
                        <span>Performance Score</span>
                        <strong>${suite.summary.performanceAverage.toFixed(1)}</strong>
                    </div>
                    <div class="perf-metric">
                        <span>Coverage</span>
                        <strong>${suite.summary.coveragePercentage.toFixed(1)}%</strong>
                    </div>
                </div>
            </div>
        </section>

        <section class="charts-section">
            <h3>📊 Visual Analytics</h3>
            <div class="charts-grid">
                <div class="chart-container">
                    <canvas id="resultsChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>
        </section>

        <section class="detailed-results">
            <h3>🔍 Detailed Test Results</h3>
            <div class="results-table">
                <table>
                    <thead>
                        <tr>
                            <th>Test Name</th>
                            <th>Status</th>
                            <th>Duration</th>
                            <th>Accuracy</th>
                            <th>Performance</th>
                            <th>Issues</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suite.results
                          .map(
                            (result) => `
                            <tr class="result-row ${result.status}">
                                <td>
                                    <div class="test-name">${result.scenarioName}</div>
                                    <div class="test-meta">Complexity: ${result.metadata.scenarioComplexity}</div>
                                </td>
                                <td>
                                    <span class="status-badge ${result.status}">
                                        ${this.getStatusEmoji(result.status)} ${result.status.toUpperCase()}
                                    </span>
                                </td>
                                <td>${this.formatDuration(result.duration)}</td>
                                <td>${result.metrics.conversionAccuracy.toFixed(1)}%</td>
                                <td>${result.metrics.performanceScore.toFixed(1)}</td>
                                <td>
                                    ${result.errors.length > 0 ? `<span class="error-count">${result.errors.length} errors</span>` : ''}
                                    ${result.warnings.length > 0 ? `<span class="warning-count">${result.warnings.length} warnings</span>` : ''}
                                </td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
        </section>

        ${this.generateTrendsSection(suite)}
        ${this.generateRecommendationsSection(suite)}

        <footer class="report-footer">
            <p>Generated on ${new Date().toLocaleString()} by Workflow-Journey Testing Framework</p>
        </footer>
    </div>

    <script>
        ${this.generateHtmlReportScripts(suite)}
    </script>
</body>
</html>`

    const filePath = join(this.config.outputDir, `${suite.id}_report.html`)
    writeFileSync(filePath, html, 'utf8')
    console.log(`📄 HTML report generated: ${filePath}`)
  }

  /**
   * Generate JSON report for programmatic consumption
   */
  private async generateJsonReport(suite: TestSuite): Promise<void> {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportVersion: '2.0.0',
        framework: 'workflow-journey-testing',
        reportId: `report_${suite.id}_${Date.now()}`,
      },
      suite,
      analytics: this.calculateAnalytics(suite),
      trends: this.calculateTrends(suite),
      recommendations: this.generateRecommendations(suite),
      historicalComparison: this.generateHistoricalComparison(suite),
    }

    const filePath = join(this.config.outputDir, `${suite.id}_report.json`)
    writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8')
    console.log(`📋 JSON report generated: ${filePath}`)
  }

  /**
   * Generate Markdown report for documentation
   */
  private async generateMarkdownReport(suite: TestSuite): Promise<void> {
    const markdown = `# 🧪 Test Execution Report: ${suite.name}

${suite.description}

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | ${suite.totalTests} |
| **✅ Passed** | ${suite.passed} (${this.calculatePercentage(suite.passed, suite.totalTests)}%) |
| **❌ Failed** | ${suite.failed} (${this.calculatePercentage(suite.failed, suite.totalTests)}%) |
| **🚫 Errors** | ${suite.errors} (${this.calculatePercentage(suite.errors, suite.totalTests)}%) |
| **⏭️ Skipped** | ${suite.skipped} (${this.calculatePercentage(suite.skipped, suite.totalTests)}%) |
| **🕐 Started** | ${suite.startTime.toLocaleString()} |
| **⏱️ Duration** | ${this.formatDuration(suite.duration!)} |
| **🎯 Success Rate** | ${suite.summary.successRate.toFixed(1)}% |

## 🚀 Performance Metrics

- **Average Test Duration**: ${this.formatDuration(suite.summary.averageDuration)}
- **Performance Score**: ${suite.summary.performanceAverage.toFixed(1)}/100
- **Coverage Percentage**: ${suite.summary.coveragePercentage.toFixed(1)}%

## 🔍 Detailed Results

${suite.results
  .map(
    (result) => `
### ${this.getStatusEmoji(result.status)} ${result.scenarioName}

- **Status**: ${result.status.toUpperCase()}
- **Duration**: ${this.formatDuration(result.duration)}
- **Accuracy**: ${result.metrics.conversionAccuracy.toFixed(1)}%
- **Performance Score**: ${result.metrics.performanceScore.toFixed(1)}
- **Complexity**: ${result.metadata.scenarioComplexity}
- **Node Count**: ${result.metadata.nodeCount}
- **Edge Count**: ${result.metadata.edgeCount}

${
  result.errors.length > 0
    ? `
**❌ Errors (${result.errors.length})**:
${result.errors.map((error) => `- ${error.message}`).join('\n')}
`
    : ''
}

${
  result.warnings.length > 0
    ? `
**⚠️ Warnings (${result.warnings.length})**:
${result.warnings.map((warning) => `- ${warning.message}`).join('\n')}
`
    : ''
}
`
  )
  .join('\n')}

## 📈 Trends and Analysis

${this.generateTrendsMarkdown(suite)}

## 💡 Recommendations

${this.generateRecommendationsMarkdown(suite)}

---
*Generated on ${new Date().toLocaleString()} by Workflow-Journey Testing Framework*`

    const filePath = join(this.config.outputDir, `${suite.id}_report.md`)
    writeFileSync(filePath, markdown, 'utf8')
    console.log(`📝 Markdown report generated: ${filePath}`)
  }

  /**
   * Generate JUnit XML report for CI/CD integration
   */
  private async generateJUnitReport(suite: TestSuite): Promise<void> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite
        name="${suite.name}"
        tests="${suite.totalTests}"
        failures="${suite.failed}"
        errors="${suite.errors}"
        skipped="${suite.skipped}"
        time="${(suite.duration! / 1000).toFixed(3)}"
        timestamp="${suite.startTime.toISOString()}"
    >
        ${suite.results
          .map(
            (result) => `
        <testcase
            name="${result.scenarioName}"
            classname="WorkflowJourneyTest"
            time="${(result.duration / 1000).toFixed(3)}"
        >
            ${
              result.status === 'failed'
                ? `
            <failure message="Test failed">
                ${result.errors.map((error) => error.message).join('\n')}
            </failure>
            `
                : ''
            }
            ${
              result.status === 'error'
                ? `
            <error message="Test error">
                ${result.errors.map((error) => error.message).join('\n')}
            </error>
            `
                : ''
            }
            ${result.status === 'skipped' ? '<skipped />' : ''}
        </testcase>
        `
          )
          .join('')}
    </testsuite>
</testsuites>`

    const filePath = join(this.config.outputDir, `${suite.id}_junit.xml`)
    writeFileSync(filePath, xml, 'utf8')
    console.log(`🔧 JUnit report generated: ${filePath}`)
  }

  /**
   * Generate PDF report (placeholder implementation)
   */
  private async generatePdfReport(suite: TestSuite): Promise<void> {
    // In a real implementation, this would use a library like Puppeteer or jsPDF
    // For now, create a detailed text report
    const textReport = this.generateDetailedTextReport(suite)
    const filePath = join(this.config.outputDir, `${suite.id}_report.txt`)
    writeFileSync(filePath, textReport, 'utf8')
    console.log(
      `📄 Text report generated: ${filePath} (PDF generation requires additional dependencies)`
    )
  }

  // ========================================
  // ANALYTICS AND INSIGHTS
  // ========================================

  private calculateAnalytics(suite: TestSuite): any {
    const results = suite.results

    return {
      distribution: {
        byComplexity: this.getDistributionByComplexity(results),
        byStatus: this.getDistributionByStatus(results),
        byDuration: this.getDistributionByDuration(results),
        byBlockType: this.getDistributionByBlockType(results),
      },
      correlations: {
        complexityVsPerformance: this.calculateComplexityPerformanceCorrelation(results),
        sizeVsAccuracy: this.calculateSizeAccuracyCorrelation(results),
        durationVsSuccess: this.calculateDurationSuccessCorrelation(results),
      },
      qualityMetrics: {
        averageAccuracy: this.calculateAverageAccuracy(results),
        averagePerformance: this.calculateAveragePerformance(results),
        consistencyScore: this.calculateConsistencyScore(results),
        reliabilityScore: this.calculateReliabilityScore(results),
      },
    }
  }

  private calculateTrends(suite: TestSuite): any {
    // Compare with historical data
    const recent = this.historicalData.slice(-5) // Last 5 runs

    if (recent.length === 0) {
      return { message: 'No historical data for trend analysis' }
    }

    return {
      successRateTrend: this.calculateTrend(recent.map((s) => s.summary.successRate)),
      performanceTrend: this.calculateTrend(recent.map((s) => s.summary.performanceAverage)),
      durationTrend: this.calculateTrend(recent.map((s) => s.summary.averageDuration)),
      improvement:
        suite.summary.successRate > (recent[recent.length - 1]?.summary.successRate || 0),
      regressions: this.identifyRegressions(suite, recent[recent.length - 1]),
    }
  }

  private generateRecommendations(suite: TestSuite): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    if (suite.summary.performanceAverage < 70) {
      recommendations.push('Consider optimizing conversion performance - average score is below 70')
    }

    // Reliability recommendations
    if (suite.summary.successRate < 90) {
      recommendations.push(
        'Success rate is below 90% - review failed tests and improve error handling'
      )
    }

    // Coverage recommendations
    if (suite.summary.coveragePercentage < 80) {
      recommendations.push('Test coverage is below 80% - add more comprehensive test scenarios')
    }

    // Error pattern recommendations
    const errorPatterns = this.analyzeErrorPatterns(suite)
    errorPatterns.forEach((pattern) => {
      recommendations.push(`Address recurring error pattern: ${pattern}`)
    })

    return recommendations
  }

  // ========================================
  // REAL-TIME REPORTING
  // ========================================

  /**
   * Subscribe to real-time test updates
   */
  subscribeToUpdates(callback: (update: RealtimeUpdate) => void): void {
    this.realTimeCallbacks.push(callback)
  }

  /**
   * Unsubscribe from real-time test updates
   */
  unsubscribeFromUpdates(callback: (update: RealtimeUpdate) => void): void {
    const index = this.realTimeCallbacks.indexOf(callback)
    if (index > -1) {
      this.realTimeCallbacks.splice(index, 1)
    }
  }

  private emitRealTimeUpdate(update: RealtimeUpdate): void {
    if (!this.config.enableRealTimeReporting) return

    this.realTimeCallbacks.forEach((callback) => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in real-time update callback:', error)
      }
    })
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private createEmptySummary(): TestSuiteSummary {
    return {
      overallStatus: 'passed',
      successRate: 0,
      averageDuration: 0,
      totalDuration: 0,
      criticalIssues: 0,
      warningsCount: 0,
      performanceAverage: 0,
      coveragePercentage: 0,
      trends: {
        improvement: false,
        regressions: [],
        newIssues: [],
      },
    }
  }

  private generateSuiteSummary(suite: TestSuite): TestSuiteSummary {
    const results = suite.results
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
    const avgDuration = results.length > 0 ? totalDuration / results.length : 0

    const successRate = suite.totalTests > 0 ? (suite.passed / suite.totalTests) * 100 : 0
    const avgPerformance =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.metrics.performanceScore, 0) / results.length
        : 0

    const criticalIssues = results.reduce(
      (sum, r) => sum + r.errors.filter((e) => e.severity === 'critical').length,
      0
    )
    const warningsCount = results.reduce((sum, r) => sum + r.warnings.length, 0)

    return {
      overallStatus: suite.failed === 0 && suite.errors === 0 ? 'passed' : 'failed',
      successRate,
      averageDuration: avgDuration,
      totalDuration: suite.duration || 0,
      criticalIssues,
      warningsCount,
      performanceAverage: avgPerformance,
      coveragePercentage: this.calculateCoverage(results),
      trends: {
        improvement: this.detectImprovement(suite),
        regressions: this.detectRegressions(suite),
        newIssues: this.detectNewIssues(suite),
      },
    }
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true })
    }
  }

  private ensureDirectory(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  private loadHistoricalData(): void {
    try {
      const historyFile = join(this.config.outputDir, 'history.json')
      if (existsSync(historyFile)) {
        const data = readFileSync(historyFile, 'utf8')
        this.historicalData = JSON.parse(data)
      }
    } catch (error) {
      console.warn('Could not load historical data:', error)
      this.historicalData = []
    }
  }

  private saveHistoricalData(): void {
    try {
      const historyFile = join(this.config.outputDir, 'history.json')

      // Keep only recent history based on retention policy
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000)
      const filteredHistory = this.historicalData.filter(
        (suite) => new Date(suite.startTime) > cutoffDate
      )

      writeFileSync(historyFile, JSON.stringify(filteredHistory, null, 2), 'utf8')
    } catch (error) {
      console.error('Could not save historical data:', error)
    }
  }

  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      passed: '✅',
      failed: '❌',
      error: '🚫',
      skipped: '⏭️',
    }
    return emojis[status] || '❓'
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  private calculatePercentage(value: number, total: number): string {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
  }

  // Additional utility methods would be implemented here...
  private getHtmlReportStyles(): string {
    return ''
  }
  private generateHtmlReportScripts(suite: TestSuite): string {
    return ''
  }
  private generateTrendsSection(suite: TestSuite): string {
    return ''
  }
  private generateRecommendationsSection(suite: TestSuite): string {
    return ''
  }
  private generateTrendsMarkdown(suite: TestSuite): string {
    return ''
  }
  private generateRecommendationsMarkdown(suite: TestSuite): string {
    return ''
  }
  private generateDetailedTextReport(suite: TestSuite): string {
    return ''
  }
  private generateHistoricalComparison(suite: TestSuite): any {
    return {}
  }
  private getDistributionByComplexity(results: TestExecutionResult[]): any {
    return {}
  }
  private getDistributionByStatus(results: TestExecutionResult[]): any {
    return {}
  }
  private getDistributionByDuration(results: TestExecutionResult[]): any {
    return {}
  }
  private getDistributionByBlockType(results: TestExecutionResult[]): any {
    return {}
  }
  private calculateComplexityPerformanceCorrelation(results: TestExecutionResult[]): number {
    return 0
  }
  private calculateSizeAccuracyCorrelation(results: TestExecutionResult[]): number {
    return 0
  }
  private calculateDurationSuccessCorrelation(results: TestExecutionResult[]): number {
    return 0
  }
  private calculateAverageAccuracy(results: TestExecutionResult[]): number {
    return 0
  }
  private calculateAveragePerformance(results: TestExecutionResult[]): number {
    return 0
  }
  private calculateConsistencyScore(results: TestExecutionResult[]): number {
    return 0
  }
  private calculateReliabilityScore(results: TestExecutionResult[]): number {
    return 0
  }
  private calculateTrend(values: number[]): string {
    return 'stable'
  }
  private identifyRegressions(current: TestSuite, previous: TestSuite): string[] {
    return []
  }
  private analyzeErrorPatterns(suite: TestSuite): string[] {
    return []
  }
  private calculateCoverage(results: TestExecutionResult[]): number {
    return 0
  }
  private detectImprovement(suite: TestSuite): boolean {
    return false
  }
  private detectRegressions(suite: TestSuite): string[] {
    return []
  }
  private detectNewIssues(suite: TestSuite): string[] {
    return []
  }
}

// ========================================
// EXPORT TYPES
// ========================================

interface RealtimeUpdate {
  type: 'suite_started' | 'suite_completed' | 'test_completed' | 'error_occurred'
  suiteId: string
  timestamp: Date
  data: any
}

export default ComprehensiveTestReporter
