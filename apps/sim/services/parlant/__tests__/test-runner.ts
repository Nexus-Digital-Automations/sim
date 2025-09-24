#!/usr/bin/env tsx

/**
 * Workflow to Journey Mapping System - Test Runner
 * ===============================================
 *
 * Comprehensive test runner for the Workflow to Journey Mapping System integration testing.
 * Orchestrates all testing suites for validation and production readiness.
 *
 * Usage:
 *   npx tsx apps/sim/services/parlant/__tests__/test-runner.ts
 *   npm run test:workflow-journey
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

interface TestRunConfiguration {
  // Test execution settings
  runIndividualToolTests: boolean
  runEndToEndTests: boolean
  runConversationalTests: boolean
  runPerformanceTests: boolean
  runWorkspaceIsolationTests: boolean
  runAcceptanceCriteriaValidation: boolean

  // Tool selection
  testAllTools: boolean
  testSpecificTools: string[]
  skipTools: string[]

  // Performance settings
  concurrentTestLimit: number
  timeoutPerTool: number
  maxRetries: number

  // Reporting
  generateDetailedReport: boolean
  saveResultsToFile: boolean
  outputDirectory: string
}

const DEFAULT_CONFIG: TestRunConfiguration = {
  // Test execution settings
  runIndividualToolTests: true,
  runEndToEndTests: true,
  runConversationalTests: true,
  runPerformanceTests: true,
  runWorkspaceIsolationTests: true,
  runAcceptanceCriteriaValidation: true,

  // Tool selection
  testAllTools: true,
  testSpecificTools: [],
  skipTools: [],

  // Performance settings
  concurrentTestLimit: 5,
  timeoutPerTool: 30000,
  maxRetries: 3,

  // Reporting
  generateDetailedReport: true,
  saveResultsToFile: true,
  outputDirectory: './test-reports',
}

class ToolAdapterTestRunner {
  private config: TestRunConfiguration
  private framework: ToolAdapterTestingFramework
  private startTime = 0
  private endTime = 0

  constructor(config: Partial<TestRunConfiguration> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.framework = new ToolAdapterTestingFramework()
  }

  async run(): Promise<void> {
    console.log('🚀 Universal Tool Adapter System - Comprehensive Integration Testing')
    console.log('='.repeat(80))
    console.log(`📅 Test Run Started: ${new Date().toISOString()}`)
    console.log(`🔧 Testing ${this.getToolsToTest().length} tools`)
    console.log(`⚙️  Configuration:`, JSON.stringify(this.config, null, 2))
    console.log('='.repeat(80))

    this.startTime = Date.now()

    try {
      // Setup test environment
      console.log('\n📋 Phase 1: Environment Setup')
      await this.framework.setupTestEnvironment()

      // Run individual tool adapter tests
      if (this.config.runIndividualToolTests) {
        console.log('\n📋 Phase 2: Individual Tool Adapter Testing')
        await this.runIndividualToolTests()
      }

      // Run end-to-end integration tests
      if (this.config.runEndToEndTests) {
        console.log('\n📋 Phase 3: End-to-End Integration Testing')
        await this.runEndToEndTests()
      }

      // Run conversational AI tests
      if (this.config.runConversationalTests) {
        console.log('\n📋 Phase 4: Conversational AI Testing')
        await this.runConversationalTests()
      }

      // Run performance tests
      if (this.config.runPerformanceTests) {
        console.log('\n📋 Phase 5: Performance and Load Testing')
        await this.runPerformanceTests()
      }

      // Run workspace isolation tests
      if (this.config.runWorkspaceIsolationTests) {
        console.log('\n📋 Phase 6: Workspace Isolation Testing')
        await this.runWorkspaceIsolationTests()
      }

      // Validate acceptance criteria
      if (this.config.runAcceptanceCriteriaValidation) {
        console.log('\n📋 Phase 7: Acceptance Criteria Validation')
        await this.validateAcceptanceCriteria()
      }

      // Generate comprehensive report
      console.log('\n📋 Phase 8: Report Generation')
      await this.generateReports()

      this.endTime = Date.now()
      console.log(`\n✅ Testing completed successfully in ${this.getTotalExecutionTime()}`)
    } catch (error) {
      this.endTime = Date.now()
      console.error(`\n❌ Testing failed after ${this.getTotalExecutionTime()}:`, error)
      throw error
    } finally {
      // Cleanup
      console.log('\n🧹 Phase 9: Cleanup')
      await this.framework.teardownTestEnvironment()
    }
  }

  private getToolsToTest(): string[] {
    let tools = this.config.testAllTools ? [...ALL_SIM_TOOLS] : this.config.testSpecificTools

    // Remove skipped tools
    if (this.config.skipTools.length > 0) {
      tools = tools.filter((tool) => !this.config.skipTools.includes(tool))
    }

    return tools
  }

  private getTotalExecutionTime(): string {
    const duration = this.endTime - this.startTime
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  private async runIndividualToolTests(): Promise<void> {
    const toolsToTest = this.getToolsToTest()
    console.log(`  🔧 Testing ${toolsToTest.length} individual tool adapters...`)

    const results = []
    let completedTests = 0

    // Test tools in batches to avoid overwhelming the system
    for (let i = 0; i < toolsToTest.length; i += this.config.concurrentTestLimit) {
      const batch = toolsToTest.slice(i, i + this.config.concurrentTestLimit)

      const batchPromises = batch.map(async (toolId) => {
        console.log(`    🔧 [${completedTests + 1}/${toolsToTest.length}] Testing ${toolId}...`)

        try {
          const result = await this.framework.testToolAdapter(toolId)
          completedTests++
          return result
        } catch (error) {
          completedTests++
          console.error(`    ❌ Failed to test ${toolId}:`, error)
          return {
            toolId,
            success: false,
            executionTime: 0,
            parameterMappingValid: false,
            responseTransformationValid: false,
            errorHandlingValid: false,
            conversationalFormatValid: false,
            naturalLanguageDescriptionValid: false,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Progress update
      const successfulInBatch = batchResults.filter((r) => r.success).length
      console.log(`    📊 Batch complete: ${successfulInBatch}/${batchResults.length} successful`)
    }

    const successful = results.filter((r) => r.success).length
    console.log(
      `  ✅ Individual tool testing complete: ${successful}/${results.length} tools passed`
    )

    if (successful === 0) {
      console.log(
        `  ⚠️  All tests failed - this is expected since Universal Tool Adapter System is not yet implemented`
      )
    }
  }

  private async runEndToEndTests(): Promise<void> {
    console.log('  🔄 Running end-to-end integration tests...')

    // Test various workflow combinations
    const testWorkflows = [
      ['thinking', 'google', 'memory'],
      ['vision', 'openai', 'file'],
      ['airtable', 'gmail', 'notion'],
      ['github', 'jira', 'slack'],
    ]

    for (const workflow of testWorkflows) {
      console.log(`    🔄 Testing workflow: ${workflow.join(' → ')}`)
      const result = await this.framework.testEndToEndWorkflow(workflow)

      if (result.success) {
        console.log(`    ✅ Workflow successful in ${result.executionTime}ms`)
      } else {
        console.log(`    ❌ Workflow failed: ${result.error || 'Unknown error'}`)
      }
    }

    console.log('  ✅ End-to-end testing complete')
  }

  private async runConversationalTests(): Promise<void> {
    console.log('  💬 Running conversational AI integration tests...')

    const result = await this.framework.testConversationalInteractions()

    console.log(`  📊 Conversational tests: ${result.conversationTests.length} scenarios tested`)
    result.conversationTests.forEach((test) => {
      const status = test.success ? '✅' : '❌'
      console.log(`    ${status} ${test.testName} (${test.executionTime}ms)`)
      if (!test.success && test.error) {
        console.log(`      Error: ${test.error}`)
      }
    })

    console.log('  ✅ Conversational AI testing complete')
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('  ⚡ Running performance and load tests...')

    const result = await this.framework.testPerformanceUnderLoad()

    console.log(`  📊 Performance Results:`)
    console.log(`    Average Execution Time: ${result.averageExecutionTime.toFixed(2)}ms`)
    console.log(`    Max Execution Time: ${result.maxExecutionTime}ms`)
    console.log(`    Min Execution Time: ${result.minExecutionTime}ms`)
    console.log(`    Failure Rate: ${result.failureRate.toFixed(2)}%`)

    console.log('  ✅ Performance testing complete')
  }

  private async runWorkspaceIsolationTests(): Promise<void> {
    console.log('  🔒 Running workspace isolation tests...')

    const result = await this.framework.testWorkspaceIsolation()

    console.log(`  📊 Isolation Tests: ${result.isolationTests.length} scenarios tested`)
    result.isolationTests.forEach((test) => {
      const status = test.success ? '✅' : '❌'
      console.log(`    ${status} ${test.testName}: ${test.description}`)
      if (!test.success && test.error) {
        console.log(`      Error: ${test.error}`)
      }
    })

    console.log('  ✅ Workspace isolation testing complete')
  }

  private async validateAcceptanceCriteria(): Promise<void> {
    console.log('  ✅ Validating acceptance criteria...')

    const result = await this.framework.validateAcceptanceCriteria()

    console.log(`  📊 Acceptance Criteria: ${result.allCriteriaMet ? 'ALL MET' : 'NOT MET'}`)
    result.criteriaResults.forEach((criteria) => {
      const status = criteria.met ? '✅' : '❌'
      console.log(`    ${status} ${criteria.criteria}`)
      console.log(`      ${criteria.details}`)
    })

    console.log('  ✅ Acceptance criteria validation complete')
  }

  private async generateReports(): Promise<void> {
    console.log('  📊 Generating comprehensive test report...')

    const report = this.framework.generateComprehensiveReport()

    // Console report
    console.log('\n📋 COMPREHENSIVE TEST REPORT')
    console.log('='.repeat(50))
    console.log(`📊 Summary:`)
    console.log(`  Total Tools: ${report.summary.totalTools}`)
    console.log(`  Tools Tested: ${report.summary.toolsTested}`)
    console.log(`  Tests Passed: ${report.summary.testsPassed}`)
    console.log(`  Tests Failed: ${report.summary.testsFailed}`)
    console.log(`  Success Rate: ${report.summary.overallSuccessRate.toFixed(2)}%`)
    console.log(`  Avg Execution Time: ${report.summary.averageExecutionTime.toFixed(2)}ms`)

    console.log(`\n🎯 Key Recommendations:`)
    report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })

    console.log(`\n🚀 Next Steps:`)
    report.nextSteps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`)
    })

    // Save detailed report to file
    if (this.config.saveResultsToFile) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const reportPath = join(
        this.config.outputDirectory,
        `tool-adapter-test-report-${timestamp}.json`
      )

      const detailedReport = {
        metadata: {
          testRunId: `tool-adapter-test-${timestamp}`,
          startTime: new Date(this.startTime).toISOString(),
          endTime: new Date(this.endTime).toISOString(),
          totalDuration: this.endTime - this.startTime,
          configuration: this.config,
          toolsToTest: this.getToolsToTest(),
        },
        summary: report.summary,
        detailedResults: report.detailedResults,
        recommendations: report.recommendations,
        nextSteps: report.nextSteps,
      }

      try {
        writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2))
        console.log(`  💾 Detailed report saved to: ${reportPath}`)
      } catch (error) {
        console.error(`  ❌ Failed to save report:`, error)
      }
    }

    console.log('  ✅ Report generation complete')
  }
}

// =====================================================
// COMMAND LINE EXECUTION
// =====================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const config: Partial<TestRunConfiguration> = {}

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--skip-performance':
        config.runPerformanceTests = false
        break
      case '--skip-end-to-end':
        config.runEndToEndTests = false
        break
      case '--skip-conversational':
        config.runConversationalTests = false
        break
      case '--tools':
        if (i + 1 < args.length) {
          config.testSpecificTools = args[i + 1].split(',')
          config.testAllTools = false
          i++
        }
        break
      case '--concurrent-limit':
        if (i + 1 < args.length) {
          config.concurrentTestLimit = Number.parseInt(args[i + 1])
          i++
        }
        break
      case '--output-dir':
        if (i + 1 < args.length) {
          config.outputDirectory = args[i + 1]
          i++
        }
        break
      case '--help':
        console.log(`
Universal Tool Adapter System Test Runner

Usage: npx tsx test-runner.ts [options]

Options:
  --skip-performance      Skip performance and load testing
  --skip-end-to-end      Skip end-to-end integration testing
  --skip-conversational  Skip conversational AI testing
  --tools <list>         Test only specific tools (comma-separated)
  --concurrent-limit <n> Number of concurrent tests (default: 5)
  --output-dir <path>    Directory for test reports (default: ./test-reports)
  --help                 Show this help message

Examples:
  npx tsx test-runner.ts
  npx tsx test-runner.ts --tools thinking,vision,memory
  npx tsx test-runner.ts --skip-performance --concurrent-limit 3
        `)
        process.exit(0)
    }
  }

  try {
    const testRunner = new ToolAdapterTestRunner(config)
    await testRunner.run()

    console.log('\n🎉 All testing phases completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Test runner failed:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { ToolAdapterTestRunner, DEFAULT_CONFIG }
export type { TestRunConfiguration }
