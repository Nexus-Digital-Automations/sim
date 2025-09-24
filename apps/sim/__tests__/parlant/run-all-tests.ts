#!/usr/bin/env bun
/**
 * Parlant Database Test Suite Runner
 *
 * Comprehensive test runner for all Parlant database tests including:
 * - Migration validation
 * - Integration testing
 * - Performance testing
 * - Sim compatibility validation
 * - Concurrent access testing
 * - Automated compatibility checks
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

interface TestSuite {
  name: string
  file: string
  description: string
  timeout: number
  critical: boolean
}

interface TestResult {
  suite: string
  passed: boolean
  output: string
  error?: string
  duration: number
}

class ParlantTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Migration Tests',
      file: 'migration.test.ts',
      description: 'Database schema migration and rollback validation',
      timeout: 60000,
      critical: true
    },
    {
      name: 'Integration Tests',
      file: 'integration.test.ts',
      description: 'Complete Parlant functionality integration tests',
      timeout: 120000,
      critical: true
    },
    {
      name: 'Performance Tests',
      file: 'performance.test.ts',
      description: 'Database performance and scalability validation',
      timeout: 180000,
      critical: false
    },
    {
      name: 'Sim Compatibility Tests',
      file: 'sim-compatibility.test.ts',
      description: 'Existing Sim functionality compatibility validation',
      timeout: 90000,
      critical: true
    },
    {
      name: 'Concurrent Access Tests',
      file: 'concurrent.test.ts',
      description: 'Concurrency, transactions, and race condition testing',
      timeout: 150000,
      critical: false
    },
    {
      name: 'Automated Compatibility Checks',
      file: 'compatibility-checks.test.ts',
      description: 'Comprehensive automated compatibility validation',
      timeout: 60000,
      critical: true
    }
  ]

  private results: TestResult[] = []

  /**
   * Check if all test files exist
   */
  private checkTestFiles(): { allExist: boolean; missing: string[] } {
    const missing: string[] = []
    const testDir = join(__dirname)

    for (const suite of this.testSuites) {
      const filePath = join(testDir, suite.file)
      if (!existsSync(filePath)) {
        missing.push(suite.file)
      }
    }

    return {
      allExist: missing.length === 0,
      missing
    }
  }

  /**
   * Run a single test suite
   */
  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      console.log(`🧪 Running ${suite.name}...`)
      console.log(`   📋 ${suite.description}`)

      const testFile = join(__dirname, suite.file)
      const child = spawn('bunx', ['vitest', 'run', testFile], {
        stdio: 'pipe',
        timeout: suite.timeout,
        cwd: process.cwd()
      })

      let output = ''
      let error = ''

      child.stdout?.on('data', (data) => {
        output += data.toString()
      })

      child.stderr?.on('data', (data) => {
        error += data.toString()
      })

      child.on('close', (code) => {
        const duration = Date.now() - startTime
        const passed = code === 0

        if (passed) {
          console.log(`✅ ${suite.name} - PASSED (${duration}ms)`)
        } else {
          console.log(`❌ ${suite.name} - FAILED (${duration}ms)`)
          if (suite.critical) {
            console.log(`🚨 CRITICAL TEST FAILURE: ${suite.name}`)
          }
        }

        resolve({
          suite: suite.name,
          passed,
          output,
          error: error || undefined,
          duration
        })
      })

      child.on('error', (err) => {
        const duration = Date.now() - startTime
        console.log(`💥 ${suite.name} - ERROR (${duration}ms)`)
        console.error(`   Error: ${err.message}`)

        resolve({
          suite: suite.name,
          passed: false,
          output: '',
          error: err.message,
          duration
        })
      })
    })
  }

  /**
   * Run all test suites
   */
  async runAllTests(options: {
    parallel?: boolean
    criticalOnly?: boolean
    verbose?: boolean
  } = {}): Promise<{
    success: boolean
    results: TestResult[]
    summary: {
      total: number
      passed: number
      failed: number
      critical_failures: number
      total_duration: number
    }
  }> {
    console.log('🚀 Starting Parlant Database Test Suite')
    console.log('=' .repeat(50))

    // Check if all test files exist
    const fileCheck = this.checkTestFiles()
    if (!fileCheck.allExist) {
      console.error('❌ Missing test files:')
      fileCheck.missing.forEach(file => console.error(`   - ${file}`))
      return {
        success: false,
        results: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          critical_failures: 0,
          total_duration: 0
        }
      }
    }

    const suitesToRun = options.criticalOnly
      ? this.testSuites.filter(suite => suite.critical)
      : this.testSuites

    const startTime = Date.now()

    if (options.parallel) {
      console.log('🔄 Running tests in parallel...')
      this.results = await Promise.all(
        suitesToRun.map(suite => this.runTestSuite(suite))
      )
    } else {
      console.log('🔄 Running tests sequentially...')
      for (const suite of suitesToRun) {
        const result = await this.runTestSuite(suite)
        this.results.push(result)

        // Stop on critical failure if not running all tests
        if (!result.passed && suite.critical && !options.verbose) {
          console.log('🛑 Stopping due to critical test failure')
          break
        }
      }
    }

    const totalDuration = Date.now() - startTime

    // Calculate summary
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      critical_failures: this.results.filter(r =>
        !r.passed && suitesToRun.find(s => s.name === r.suite)?.critical
      ).length,
      total_duration: totalDuration
    }

    this.printSummary(summary, options.verbose)

    return {
      success: summary.critical_failures === 0,
      results: this.results,
      summary
    }
  }

  /**
   * Print test summary
   */
  private printSummary(summary: any, verbose: boolean = false) {
    console.log('\n' + '=' .repeat(50))
    console.log('📊 TEST SUMMARY')
    console.log('=' .repeat(50))

    console.log(`Total Tests: ${summary.total}`)
    console.log(`✅ Passed: ${summary.passed}`)
    console.log(`❌ Failed: ${summary.failed}`)
    console.log(`🚨 Critical Failures: ${summary.critical_failures}`)
    console.log(`⏱️  Total Duration: ${summary.total_duration}ms`)

    if (summary.critical_failures === 0) {
      console.log('\n🎉 ALL CRITICAL TESTS PASSED!')
      console.log('   Parlant database integration is compatible with Sim')
    } else {
      console.log('\n⚠️  CRITICAL TESTS FAILED!')
      console.log('   Parlant database integration has compatibility issues')
    }

    if (verbose) {
      console.log('\n📋 DETAILED RESULTS:')
      this.results.forEach(result => {
        const status = result.passed ? '✅' : '❌'
        console.log(`${status} ${result.suite} (${result.duration}ms)`)
        if (!result.passed && result.error) {
          console.log(`   Error: ${result.error}`)
        }
      })
    }

    console.log('\n' + '=' .repeat(50))
  }

  /**
   * Generate test report
   */
  generateReport(): {
    timestamp: string
    environment: any
    results: TestResult[]
    recommendations: string[]
  } {
    const recommendations: string[] = []

    // Analyze results and generate recommendations
    const failedCritical = this.results.filter(r =>
      !r.passed && this.testSuites.find(s => s.name === r.suite)?.critical
    )

    if (failedCritical.length > 0) {
      recommendations.push('Address critical test failures before deploying Parlant integration')
      failedCritical.forEach(result => {
        recommendations.push(`- Fix issues in: ${result.suite}`)
      })
    }

    const slowTests = this.results.filter(r => r.duration > 30000)
    if (slowTests.length > 0) {
      recommendations.push('Consider optimizing performance for slow-running tests')
      slowTests.forEach(result => {
        recommendations.push(`- Optimize: ${result.suite} (${result.duration}ms)`)
      })
    }

    if (this.results.every(r => r.passed)) {
      recommendations.push('All tests passed! Parlant integration is ready for deployment')
      recommendations.push('Consider setting up automated testing in CI/CD pipeline')
      recommendations.push('Monitor performance metrics in production environment')
    }

    return {
      timestamp: new Date().toISOString(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      },
      results: this.results,
      recommendations
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2)
  const options = {
    parallel: args.includes('--parallel'),
    criticalOnly: args.includes('--critical-only'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help')
  }

  if (options.help) {
    console.log(`
Parlant Database Test Suite Runner

Usage: bun run-all-tests.ts [options]

Options:
  --parallel      Run tests in parallel (faster but may mask issues)
  --critical-only Run only critical tests (schema, integration, compatibility)
  --verbose       Show detailed output and continue on failures
  --help          Show this help message

Examples:
  bun run-all-tests.ts                    # Run all tests sequentially
  bun run-all-tests.ts --parallel         # Run all tests in parallel
  bun run-all-tests.ts --critical-only    # Run only critical tests
  bun run-all-tests.ts --verbose          # Show detailed output
    `)
    process.exit(0)
  }

  const runner = new ParlantTestRunner()

  try {
    const { success, summary } = await runner.runAllTests(options)

    // Generate and save report
    const report = runner.generateReport()
    console.log('\n📝 Test Report Generated')

    if (options.verbose) {
      console.log('\n🔍 RECOMMENDATIONS:')
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
    }

    // Exit with appropriate code
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('💥 Test runner failed:', error)
    process.exit(2)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { ParlantTestRunner }