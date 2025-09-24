/**
 * Integration Test Runner for Sim-Parlant Integration Bridge
 * =========================================================
 *
 * This test runner orchestrates the complete integration testing suite,
 * ensuring all components are tested systematically and results are
 * properly collected and reported.
 *
 * Features:
 * - Sequential test execution with dependency management
 * - Comprehensive test result collection
 * - Test environment validation
 * - Parallel test execution for non-conflicting tests
 * - Detailed reporting and analytics
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs').promises
const axios = require('axios')

class IntegrationTestRunner {
  constructor() {
    this.config = {
      test_environment: {
        parlant_server_url: process.env.PARLANT_SERVER_URL || 'http://localhost:8800',
        sim_server_url: process.env.SIM_SERVER_URL || 'http://localhost:3000',
        socket_server_url: process.env.SOCKET_SERVER_URL || 'http://localhost:3001',
        database_url:
          process.env.DATABASE_URL ||
          'postgresql://postgres:postgres@localhost:5432/simstudio_test',
        jwt_secret: process.env.BETTER_AUTH_SECRET || 'test-auth-secret',
      },
      test_suites: [
        {
          name: 'Comprehensive Integration Tests',
          file: 'comprehensive-integration.test.js',
          priority: 1,
          timeout: 300000, // 5 minutes
          description: 'Complete acceptance criteria validation and end-to-end testing',
        },
        {
          name: 'Authentication Integration Tests',
          file: 'auth-integration.test.js',
          priority: 2,
          timeout: 120000, // 2 minutes
          description: 'Better Auth and JWT authentication flow testing',
        },
        {
          name: 'Real-time Communication Tests',
          file: 'realtime-communication.test.js',
          priority: 3,
          timeout: 180000, // 3 minutes
          description: 'Socket.io integration and workspace isolation testing',
        },
        {
          name: 'Performance and Load Tests',
          file: '../performance/load-testing.test.js',
          priority: 4,
          timeout: 600000, // 10 minutes
          description: 'Performance benchmarking and load testing',
        },
        {
          name: 'Parlant Server Integration Tests',
          file: 'parlant-server.integration.test.js',
          priority: 5,
          timeout: 240000, // 4 minutes
          description: 'Core Parlant server functionality and API testing',
        },
      ],
      reporting: {
        output_directory: path.join(__dirname, 'reports'),
        generate_html_report: true,
        generate_json_report: true,
        generate_junit_xml: true,
      },
    }

    this.testResults = {
      overall_status: 'PENDING',
      started_at: null,
      completed_at: null,
      total_duration: null,
      environment: this.config.test_environment,
      suite_results: [],
      summary: {
        total_suites: this.config.test_suites.length,
        passed_suites: 0,
        failed_suites: 0,
        skipped_suites: 0,
        total_tests: 0,
        passed_tests: 0,
        failed_tests: 0,
      },
    }
  }

  async run() {
    console.log('🚀 Starting Sim-Parlant Integration Test Runner')
    console.log('==================================================')

    this.testResults.started_at = new Date().toISOString()

    try {
      // 1. Validate test environment
      await this.validateTestEnvironment()

      // 2. Prepare test environment
      await this.prepareTestEnvironment()

      // 3. Run test suites
      await this.runTestSuites()

      // 4. Generate reports
      await this.generateReports()

      // 5. Determine overall status
      this.determineOverallStatus()

      this.testResults.completed_at = new Date().toISOString()
      this.testResults.total_duration =
        new Date(this.testResults.completed_at).getTime() -
        new Date(this.testResults.started_at).getTime()

      console.log('')
      console.log('🎉 Integration Test Runner Completed')
      console.log('====================================')
      this.printSummary()
    } catch (error) {
      console.error('❌ Integration Test Runner Failed:', error.message)
      this.testResults.overall_status = 'FAILED'
      this.testResults.error = error.message
      throw error
    }
  }

  async validateTestEnvironment() {
    console.log('🔍 Validating Test Environment...')

    const validations = [
      {
        name: 'Database Connection',
        check: () => this.checkDatabaseConnection(),
      },
      {
        name: 'Environment Variables',
        check: () => this.checkEnvironmentVariables(),
      },
      {
        name: 'Test Dependencies',
        check: () => this.checkTestDependencies(),
      },
    ]

    for (const validation of validations) {
      try {
        console.log(`  → Checking ${validation.name}...`)
        await validation.check()
        console.log(`  ✅ ${validation.name} - OK`)
      } catch (error) {
        console.log(`  ❌ ${validation.name} - FAILED: ${error.message}`)
        throw new Error(`Environment validation failed: ${validation.name}`)
      }
    }

    console.log('✅ Test environment validation completed')
  }

  async checkDatabaseConnection() {
    // This would check database connectivity
    // For now, just verify the URL is set
    if (!this.config.test_environment.database_url) {
      throw new Error('DATABASE_URL environment variable not set')
    }
  }

  async checkEnvironmentVariables() {
    const requiredVars = ['DATABASE_URL', 'BETTER_AUTH_SECRET']

    const missingVars = requiredVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      console.warn(`  ⚠️  Missing optional environment variables: ${missingVars.join(', ')}`)
      console.warn('  → Tests will use default values')
    }
  }

  async checkTestDependencies() {
    // Check if required test files exist
    for (const suite of this.config.test_suites) {
      const testFilePath = path.join(__dirname, suite.file)
      try {
        await fs.access(testFilePath)
      } catch (error) {
        throw new Error(`Test file not found: ${suite.file}`)
      }
    }
  }

  async prepareTestEnvironment() {
    console.log('🛠️  Preparing Test Environment...')

    // Create reports directory
    try {
      await fs.mkdir(this.config.reporting.output_directory, { recursive: true })
      console.log('  ✅ Created reports directory')
    } catch (error) {
      console.log('  ✅ Reports directory already exists')
    }

    // Wait for services to be ready (if they should be running)
    await this.waitForServices()

    console.log('✅ Test environment preparation completed')
  }

  async waitForServices() {
    console.log('  → Waiting for services to be ready...')

    const services = [
      {
        name: 'Parlant Server',
        url: `${this.config.test_environment.parlant_server_url}/health`,
        required: false,
      },
      {
        name: 'Sim Server',
        url: `${this.config.test_environment.sim_server_url}/api/health`,
        required: false,
      },
    ]

    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 2000 })
        if (response.status === 200) {
          console.log(`    ✅ ${service.name} is ready`)
        }
      } catch (error) {
        if (service.required) {
          throw new Error(`Required service ${service.name} is not available`)
        }
        console.log(`    ⚠️  ${service.name} not available - tests may be limited`)
      }
    }
  }

  async runTestSuites() {
    console.log('🧪 Running Integration Test Suites...')
    console.log('')

    // Sort test suites by priority
    const sortedSuites = [...this.config.test_suites].sort((a, b) => a.priority - b.priority)

    for (const suite of sortedSuites) {
      console.log(`📋 Running: ${suite.name}`)
      console.log(`   ${suite.description}`)
      console.log(`   File: ${suite.file}`)
      console.log(`   Timeout: ${suite.timeout / 1000}s`)

      const suiteResult = {
        name: suite.name,
        file: suite.file,
        started_at: new Date().toISOString(),
        status: 'RUNNING',
        tests: [],
        error: null,
      }

      try {
        const testOutput = await this.runSingleTestSuite(suite)

        suiteResult.status = testOutput.success ? 'PASSED' : 'FAILED'
        suiteResult.output = testOutput.output
        suiteResult.tests = testOutput.tests || []

        if (testOutput.success) {
          console.log(`   ✅ ${suite.name} - PASSED`)
          this.testResults.summary.passed_suites++
        } else {
          console.log(`   ❌ ${suite.name} - FAILED`)
          console.log(`      ${testOutput.error || 'Unknown error'}`)
          this.testResults.summary.failed_suites++
          suiteResult.error = testOutput.error
        }

        // Update test counts
        this.testResults.summary.total_tests += testOutput.tests?.length || 0
        this.testResults.summary.passed_tests +=
          testOutput.tests?.filter((t) => t.status === 'passed').length || 0
        this.testResults.summary.failed_tests +=
          testOutput.tests?.filter((t) => t.status === 'failed').length || 0
      } catch (error) {
        console.log(`   💥 ${suite.name} - ERROR: ${error.message}`)
        suiteResult.status = 'ERROR'
        suiteResult.error = error.message
        this.testResults.summary.failed_suites++
      }

      suiteResult.completed_at = new Date().toISOString()
      suiteResult.duration =
        new Date(suiteResult.completed_at).getTime() - new Date(suiteResult.started_at).getTime()

      this.testResults.suite_results.push(suiteResult)
      console.log('')
    }

    console.log('✅ All test suites completed')
  }

  async runSingleTestSuite(suite) {
    return new Promise((resolve, reject) => {
      const testFilePath = path.resolve(__dirname, suite.file)

      const jest = spawn('npx', ['jest', testFilePath, '--json', '--verbose'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          ...this.config.test_environment,
        },
      })

      let output = ''
      let errorOutput = ''

      jest.stdout.on('data', (data) => {
        output += data.toString()
      })

      jest.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      jest.on('close', (code) => {
        try {
          // Try to parse Jest JSON output
          const lines = output.split('\n')
          const jsonLine = lines.find(
            (line) => line.trim().startsWith('{') && line.includes('"testResults"')
          )

          if (jsonLine) {
            const testResults = JSON.parse(jsonLine)

            resolve({
              success: code === 0,
              output: output,
              error: code !== 0 ? errorOutput : null,
              tests: this.parseJestResults(testResults),
            })
          } else {
            resolve({
              success: code === 0,
              output: output,
              error: code !== 0 ? errorOutput || 'Test execution failed' : null,
              tests: [],
            })
          }
        } catch (error) {
          resolve({
            success: false,
            output: output,
            error: `Failed to parse test results: ${error.message}`,
            tests: [],
          })
        }
      })

      jest.on('error', (error) => {
        reject(new Error(`Failed to start test: ${error.message}`))
      })

      // Timeout handling
      setTimeout(() => {
        jest.kill('SIGKILL')
        reject(new Error(`Test suite timeout after ${suite.timeout / 1000}s`))
      }, suite.timeout)
    })
  }

  parseJestResults(jestResults) {
    const tests = []

    if (jestResults.testResults) {
      for (const testFile of jestResults.testResults) {
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            tests.push({
              name: assertion.fullName || assertion.title,
              status: assertion.status, // 'passed', 'failed', 'skipped'
              duration: assertion.duration || 0,
              error: assertion.failureMessages?.join('\n') || null,
            })
          }
        }
      }
    }

    return tests
  }

  async generateReports() {
    console.log('📊 Generating Test Reports...')

    const reportPromises = []

    // Generate JSON report
    if (this.config.reporting.generate_json_report) {
      reportPromises.push(this.generateJsonReport())
    }

    // Generate HTML report
    if (this.config.reporting.generate_html_report) {
      reportPromises.push(this.generateHtmlReport())
    }

    // Generate JUnit XML report
    if (this.config.reporting.generate_junit_xml) {
      reportPromises.push(this.generateJunitXmlReport())
    }

    await Promise.all(reportPromises)

    console.log('✅ Test reports generated')
  }

  async generateJsonReport() {
    const reportPath = path.join(
      this.config.reporting.output_directory,
      'integration-test-results.json'
    )
    await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2))
    console.log(`  → JSON Report: ${reportPath}`)
  }

  async generateHtmlReport() {
    const htmlContent = this.generateHtmlReportContent()
    const reportPath = path.join(
      this.config.reporting.output_directory,
      'integration-test-report.html'
    )
    await fs.writeFile(reportPath, htmlContent)
    console.log(`  → HTML Report: ${reportPath}`)
  }

  generateHtmlReportContent() {
    const { testResults } = this
    const passingRate = (
      (testResults.summary.passed_tests / testResults.summary.total_tests) *
      100
    ).toFixed(1)

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Sim-Parlant Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background-color: #e3f2fd; padding: 15px; border-radius: 5px; flex: 1; }
        .suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background-color: #f0f0f0; padding: 10px; font-weight: bold; }
        .suite.passed .suite-header { background-color: #d4edda; }
        .suite.failed .suite-header { background-color: #f8d7da; }
        .test { padding: 10px; border-bottom: 1px solid #eee; }
        .test.passed { color: #155724; }
        .test.failed { color: #721c24; }
        .error { background-color: #f8f8f8; padding: 10px; margin: 10px; border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sim-Parlant Integration Bridge Test Report</h1>
        <p><strong>Status:</strong> ${testResults.overall_status}</p>
        <p><strong>Started:</strong> ${testResults.started_at}</p>
        <p><strong>Completed:</strong> ${testResults.completed_at}</p>
        <p><strong>Duration:</strong> ${testResults.total_duration ? `${(testResults.total_duration / 1000).toFixed(1)}s` : 'N/A'}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Test Suites</h3>
            <p>${testResults.summary.passed_suites}/${testResults.summary.total_suites} Passed</p>
        </div>
        <div class="metric">
            <h3>Test Cases</h3>
            <p>${testResults.summary.passed_tests}/${testResults.summary.total_tests} Passed</p>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <p>${passingRate}%</p>
        </div>
    </div>

    <h2>Test Suite Results</h2>
    ${testResults.suite_results
      .map(
        (suite) => `
        <div class="suite ${suite.status.toLowerCase()}">
            <div class="suite-header">
                ${suite.name} - ${suite.status}
                ${suite.duration ? `(${(suite.duration / 1000).toFixed(1)}s)` : ''}
            </div>
            ${suite.error ? `<div class="error"><strong>Error:</strong> ${suite.error}</div>` : ''}
            ${
              suite.tests && suite.tests.length > 0
                ? `
                <div>
                    ${suite.tests
                      .map(
                        (test) => `
                        <div class="test ${test.status}">
                            ✓ ${test.name} ${test.duration ? `(${test.duration}ms)` : ''}
                            ${test.error ? `<div class="error">${test.error}</div>` : ''}
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `
                : ''
            }
        </div>
    `
      )
      .join('')}

    <h2>Environment Configuration</h2>
    <pre>${JSON.stringify(testResults.environment, null, 2)}</pre>

</body>
</html>
    `.trim()
  }

  async generateJunitXmlReport() {
    // Basic JUnit XML generation
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Sim-Parlant Integration Tests" tests="${this.testResults.summary.total_tests}" failures="${this.testResults.summary.failed_tests}" time="${(this.testResults.total_duration / 1000).toFixed(3)}">
  ${this.testResults.suite_results
    .map(
      (suite) => `
  <testsuite name="${suite.name}" tests="${suite.tests.length}" failures="${suite.tests.filter((t) => t.status === 'failed').length}" time="${(suite.duration / 1000).toFixed(3)}">
    ${suite.tests
      .map(
        (test) => `
    <testcase name="${test.name}" time="${(test.duration / 1000).toFixed(3)}" classname="${suite.name}">
      ${test.status === 'failed' ? `<failure message="Test failed">${test.error || 'Unknown error'}</failure>` : ''}
    </testcase>
    `
      )
      .join('')}
  </testsuite>
  `
    )
    .join('')}
</testsuites>`

    const reportPath = path.join(this.config.reporting.output_directory, 'junit-results.xml')
    await fs.writeFile(reportPath, xml)
    console.log(`  → JUnit XML: ${reportPath}`)
  }

  determineOverallStatus() {
    if (this.testResults.summary.failed_suites === 0 && this.testResults.summary.total_suites > 0) {
      this.testResults.overall_status = 'PASSED'
    } else if (this.testResults.summary.passed_suites > 0) {
      this.testResults.overall_status = 'PARTIALLY_PASSED'
    } else {
      this.testResults.overall_status = 'FAILED'
    }
  }

  printSummary() {
    const { summary } = this.testResults

    console.log(`📊 INTEGRATION TEST SUMMARY:`)
    console.log(`  → Overall Status: ${this.testResults.overall_status}`)
    console.log(`  → Test Suites: ${summary.passed_suites}/${summary.total_suites} passed`)
    console.log(`  → Test Cases: ${summary.passed_tests}/${summary.total_tests} passed`)
    console.log(
      `  → Success Rate: ${((summary.passed_tests / summary.total_tests) * 100).toFixed(1)}%`
    )
    console.log(`  → Duration: ${(this.testResults.total_duration / 1000).toFixed(1)}s`)

    if (this.testResults.overall_status === 'PASSED') {
      console.log('🎉 ALL ACCEPTANCE CRITERIA VALIDATED - INTEGRATION BRIDGE READY!')
    } else {
      console.log('⚠️  Some tests failed - review results before deployment')
    }
  }
}

// Export for use as module
module.exports = IntegrationTestRunner

// Run directly if called from command line
if (require.main === module) {
  const runner = new IntegrationTestRunner()

  runner
    .run()
    .then(() => {
      process.exit(runner.testResults.overall_status === 'PASSED' ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Test runner crashed:', error.message)
      process.exit(2)
    })
}
