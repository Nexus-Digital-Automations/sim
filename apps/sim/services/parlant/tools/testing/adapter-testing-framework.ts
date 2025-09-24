/**
 * Comprehensive Adapter Testing Framework
 * =======================================
 *
 * Testing framework specifically designed for validating tool adapters
 * Includes mock environments, performance testing, and validation utilities
 */

import type { AdapterExecutionResult, ToolExecutionContext } from '../adapter-framework'
import type { UniversalToolAdapterRegistry } from '../adapter-registry'

// ================================
// Testing Types and Interfaces
// ================================

/**
 * Test case definition for adapter validation
 */
export interface AdapterTestCase {
  /** Unique identifier for the test case */
  id: string
  /** Human-readable test description */
  description: string
  /** Test category for organization */
  category: 'unit' | 'integration' | 'performance' | 'security' | 'validation'
  /** Test priority level */
  priority: 'low' | 'medium' | 'high' | 'critical'
  /** Input parameters for the test */
  input: {
    parameters: Record<string, any>
    context: ToolExecutionContext
  }
  /** Expected test outcomes */
  expectations: {
    success: boolean
    responseSchema?: any
    performanceThresholds?: {
      maxLatencyMs?: number
      maxMemoryMb?: number
    }
    errorPatterns?: string[]
    customValidators?: ((result: AdapterExecutionResult) => ValidationResult)[]
  }
  /** Test setup and teardown hooks */
  hooks?: {
    beforeTest?: () => Promise<void>
    afterTest?: (result: AdapterTestResult) => Promise<void>
  }
  /** Test metadata */
  metadata?: {
    tags: string[]
    author: string
    created: string
    lastUpdated: string
  }
}

/**
 * Test execution result
 */
export interface AdapterTestResult {
  /** Test case that was executed */
  testCase: AdapterTestCase
  /** Whether the test passed */
  passed: boolean
  /** Test execution timing */
  timing: {
    startTime: string
    endTime: string
    duration: number
  }
  /** Actual adapter execution result */
  executionResult: AdapterExecutionResult
  /** Validation results */
  validationResults: ValidationResult[]
  /** Performance metrics */
  performance: {
    latencyMs: number
    memoryUsageMb?: number
    cpuUsagePercent?: number
  }
  /** Error details if test failed */
  errors: string[]
  /** Additional test metadata */
  metadata?: Record<string, any>
}

/**
 * Validation result for individual checks
 */
export interface ValidationResult {
  /** Type of validation performed */
  type: 'schema' | 'performance' | 'security' | 'business_logic' | 'error_handling'
  /** Whether validation passed */
  passed: boolean
  /** Validation description */
  description: string
  /** Actual vs expected values */
  comparison?: {
    expected: any
    actual: any
  }
  /** Validation error message */
  error?: string
}

/**
 * Test suite configuration
 */
export interface TestSuiteConfig {
  /** Test suite name */
  name: string
  /** Test execution timeout */
  timeout: number
  /** Number of parallel test executions */
  concurrency: number
  /** Whether to continue on first failure */
  failFast: boolean
  /** Test environment configuration */
  environment: 'development' | 'staging' | 'production'
  /** Mock configuration */
  mocking: {
    enabled: boolean
    mockApiResponses: boolean
    mockAuthCredentials: boolean
  }
}

/**
 * Test suite execution summary
 */
export interface TestSuiteResult {
  /** Suite configuration */
  config: TestSuiteConfig
  /** All test results */
  results: AdapterTestResult[]
  /** Summary statistics */
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration: number
    passRate: number
  }
  /** Performance statistics */
  performance: {
    averageLatencyMs: number
    maxLatencyMs: number
    minLatencyMs: number
    totalMemoryUsageMb: number
  }
  /** Test execution metadata */
  metadata: {
    startTime: string
    endTime: string
    environment: string
    version: string
  }
}

// ================================
// Mock Environment System
// ================================

/**
 * Mock environment for testing adapters without external dependencies
 */
export class AdapterMockEnvironment {
  private mockResponses = new Map<string, any>()
  private mockCredentials = new Map<string, any>()
  private interceptors: ((request: any) => any)[] = []

  /**
   * Register a mock API response for testing
   */
  mockApiResponse(pattern: string | RegExp, response: any): void {
    this.mockResponses.set(pattern.toString(), response)
  }

  /**
   * Register mock credentials for authentication testing
   */
  mockCredentials(service: string, credentials: any): void {
    this.mockCredentials.set(service, credentials)
  }

  /**
   * Add request interceptor for custom mock logic
   */
  addInterceptor(interceptor: (request: any) => any): void {
    this.interceptors.push(interceptor)
  }

  /**
   * Get mock response for a request pattern
   */
  getMockResponse(url: string, method = 'GET'): any {
    const requestKey = `${method}:${url}`

    // Check exact matches first
    if (this.mockResponses.has(requestKey)) {
      return this.mockResponses.get(requestKey)
    }

    // Check pattern matches
    for (const [pattern, response] of this.mockResponses.entries()) {
      try {
        const regex = new RegExp(pattern)
        if (regex.test(requestKey)) {
          return response
        }
      } catch (e) {
        // Invalid regex pattern, skip
      }
    }

    // Apply interceptors
    for (const interceptor of this.interceptors) {
      const result = interceptor({ url, method })
      if (result) return result
    }

    return null
  }

  /**
   * Get mock credentials for a service
   */
  getMockCredentials(service: string): any {
    return this.mockCredentials.get(service) || this.generateDefaultCredentials(service)
  }

  /**
   * Generate default mock credentials
   */
  private generateDefaultCredentials(service: string): any {
    switch (service.toLowerCase()) {
      case 'openai':
        return { api_key: 'sk-mock-openai-key' }
      case 'github':
        return { github_token: 'ghp_mock_github_token' }
      case 'slack':
        return { bot_token: 'xoxb-mock-slack-token' }
      case 'google':
        return {
          oauth_credentials: {
            access_token: 'ya29.mock_google_token',
            refresh_token: 'mock_refresh_token',
            expires_at: Date.now() / 1000 + 3600,
          },
        }
      default:
        return {
          api_key: `mock-${service}-key`,
          token: `mock-${service}-token`,
        }
    }
  }

  /**
   * Clear all mocks
   */
  clear(): void {
    this.mockResponses.clear()
    this.mockCredentials.clear()
    this.interceptors = []
  }
}

// ================================
// Core Testing Framework
// ================================

/**
 * Main testing framework class for adapter validation
 */
export class AdapterTestingFramework {
  private registry: UniversalToolAdapterRegistry
  private mockEnvironment: AdapterMockEnvironment
  private testSuites = new Map<string, AdapterTestCase[]>()

  constructor(registry: UniversalToolAdapterRegistry) {
    this.registry = registry
    this.mockEnvironment = new AdapterMockEnvironment()
  }

  // ================================
  // Test Suite Management
  // ================================

  /**
   * Register a test suite with multiple test cases
   */
  registerTestSuite(suiteName: string, testCases: AdapterTestCase[]): void {
    this.testSuites.set(suiteName, testCases)
  }

  /**
   * Create standard test cases for an adapter
   */
  createStandardTestSuite(adapterId: string): AdapterTestCase[] {
    const adapter = this.registry.getAdapter(adapterId)
    if (!adapter) {
      throw new Error(`Adapter '${adapterId}' not found in registry`)
    }

    const parlantTool = adapter.getParlantTool()
    const testCases: AdapterTestCase[] = []

    // 1. Parameter validation tests
    testCases.push(...this.createParameterValidationTests(parlantTool))

    // 2. Success path tests
    testCases.push(...this.createSuccessPathTests(parlantTool))

    // 3. Error handling tests
    testCases.push(...this.createErrorHandlingTests(parlantTool))

    // 4. Performance tests
    testCases.push(...this.createPerformanceTests(parlantTool))

    // 5. Security tests
    testCases.push(...this.createSecurityTests(parlantTool))

    return testCases
  }

  /**
   * Execute a single test case
   */
  async executeTestCase(adapterId: string, testCase: AdapterTestCase): Promise<AdapterTestResult> {
    const startTime = Date.now()
    const adapter = this.registry.getAdapter(adapterId)

    if (!adapter) {
      return {
        testCase,
        passed: false,
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration: Date.now() - startTime,
        },
        executionResult: {
          success: false,
          error: `Adapter '${adapterId}' not found`,
          timing: {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date().toISOString(),
            duration: 0,
          },
        },
        validationResults: [],
        performance: { latencyMs: 0 },
        errors: [`Adapter '${adapterId}' not found in registry`],
      }
    }

    try {
      // Execute before hook
      if (testCase.hooks?.beforeTest) {
        await testCase.hooks.beforeTest()
      }

      // Setup mock environment
      this.setupMockEnvironment(testCase)

      // Execute the adapter
      const executionResult = await adapter.execute(
        testCase.input.parameters,
        testCase.input.context
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      // Validate results
      const validationResults = await this.validateTestResult(testCase, executionResult)

      const testResult: AdapterTestResult = {
        testCase,
        passed: this.determineTestPassed(testCase, executionResult, validationResults),
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration,
        },
        executionResult,
        validationResults,
        performance: {
          latencyMs: executionResult.timing.duration,
          memoryUsageMb: await this.getMemoryUsage(),
          cpuUsagePercent: await this.getCpuUsage(),
        },
        errors: this.extractErrors(testCase, executionResult, validationResults),
      }

      // Execute after hook
      if (testCase.hooks?.afterTest) {
        await testCase.hooks.afterTest(testResult)
      }

      return testResult
    } catch (error) {
      const endTime = Date.now()
      return {
        testCase,
        passed: false,
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: endTime - startTime,
        },
        executionResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown test execution error',
          timing: {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration: endTime - startTime,
          },
        },
        validationResults: [],
        performance: { latencyMs: endTime - startTime },
        errors: [error instanceof Error ? error.message : 'Unknown test execution error'],
      }
    }
  }

  /**
   * Execute a complete test suite
   */
  async executeTestSuite(
    adapterId: string,
    suiteName: string,
    config: Partial<TestSuiteConfig> = {}
  ): Promise<TestSuiteResult> {
    const suiteConfig: TestSuiteConfig = {
      name: suiteName,
      timeout: 30000,
      concurrency: 1,
      failFast: false,
      environment: 'development',
      mocking: {
        enabled: true,
        mockApiResponses: true,
        mockAuthCredentials: true,
      },
      ...config,
    }

    const testCases = this.testSuites.get(suiteName) || []
    const startTime = Date.now()
    const results: AdapterTestResult[] = []

    console.log(
      `[AdapterTesting] Starting test suite '${suiteName}' with ${testCases.length} test cases`
    )

    // Execute test cases (with concurrency control)
    const batches = this.createBatches(testCases, suiteConfig.concurrency)

    for (const batch of batches) {
      const batchPromises = batch.map((testCase) => this.executeTestCase(adapterId, testCase))

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Check fail-fast condition
      if (suiteConfig.failFast && batchResults.some((r) => !r.passed)) {
        console.log(
          `[AdapterTesting] Stopping test suite '${suiteName}' due to failure (fail-fast enabled)`
        )
        break
      }
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    // Calculate summary statistics
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      skipped: testCases.length - results.length,
      duration,
      passRate: results.length > 0 ? results.filter((r) => r.passed).length / results.length : 0,
    }

    // Calculate performance statistics
    const latencies = results.map((r) => r.performance.latencyMs).filter((l) => l > 0)
    const performance = {
      averageLatencyMs:
        latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
      minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : 0,
      totalMemoryUsageMb: results.reduce((sum, r) => sum + (r.performance.memoryUsageMb || 0), 0),
    }

    const suiteResult: TestSuiteResult = {
      config: suiteConfig,
      results,
      summary,
      performance,
      metadata: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        environment: suiteConfig.environment,
        version: '1.0.0',
      },
    }

    console.log(
      `[AdapterTesting] Test suite '${suiteName}' completed: ${summary.passed}/${summary.total} passed (${(summary.passRate * 100).toFixed(1)}%)`
    )

    return suiteResult
  }

  // ================================
  // Test Case Generators
  // ================================

  private createParameterValidationTests(parlantTool: any): AdapterTestCase[] {
    const tests: AdapterTestCase[] = []

    // Required parameters test
    tests.push({
      id: `${parlantTool.id}_required_params`,
      description: 'Validate that all required parameters are enforced',
      category: 'validation',
      priority: 'high',
      input: {
        parameters: {}, // Empty parameters to test validation
        context: this.createTestContext(),
      },
      expectations: {
        success: false,
        errorPatterns: ['required', 'missing'],
      },
    })

    // Parameter type validation tests
    parlantTool.parameters.forEach((param: any) => {
      if (param.required) {
        tests.push({
          id: `${parlantTool.id}_${param.name}_type_validation`,
          description: `Validate ${param.name} parameter type checking`,
          category: 'validation',
          priority: 'medium',
          input: {
            parameters: {
              [param.name]: this.getInvalidTypeValue(param.type),
            },
            context: this.createTestContext(),
          },
          expectations: {
            success: false,
            errorPatterns: ['type', 'invalid'],
          },
        })
      }
    })

    return tests
  }

  private createSuccessPathTests(parlantTool: any): AdapterTestCase[] {
    const tests: AdapterTestCase[] = []

    // Basic success test with valid parameters
    const validParams = this.generateValidParameters(parlantTool)
    tests.push({
      id: `${parlantTool.id}_success_basic`,
      description: 'Basic successful execution with valid parameters',
      category: 'integration',
      priority: 'critical',
      input: {
        parameters: validParams,
        context: this.createTestContext(),
      },
      expectations: {
        success: true,
        performanceThresholds: {
          maxLatencyMs: 10000, // 10 seconds
        },
      },
    })

    return tests
  }

  private createErrorHandlingTests(parlantTool: any): AdapterTestCase[] {
    const tests: AdapterTestCase[] = []

    // Invalid authentication test
    if (parlantTool.requiresAuth) {
      const invalidAuthParams = this.generateValidParameters(parlantTool)
      // Corrupt the authentication
      if (parlantTool.requiresAuth.type === 'api_key') {
        invalidAuthParams.api_key = 'invalid-key'
      }

      tests.push({
        id: `${parlantTool.id}_invalid_auth`,
        description: 'Handle invalid authentication gracefully',
        category: 'security',
        priority: 'high',
        input: {
          parameters: invalidAuthParams,
          context: this.createTestContext(),
        },
        expectations: {
          success: false,
          errorPatterns: ['auth', 'unauthorized', 'invalid'],
        },
      })
    }

    return tests
  }

  private createPerformanceTests(parlantTool: any): AdapterTestCase[] {
    const tests: AdapterTestCase[] = []

    // Performance benchmark test
    tests.push({
      id: `${parlantTool.id}_performance_benchmark`,
      description: 'Performance benchmark under normal load',
      category: 'performance',
      priority: 'medium',
      input: {
        parameters: this.generateValidParameters(parlantTool),
        context: this.createTestContext(),
      },
      expectations: {
        success: true,
        performanceThresholds: {
          maxLatencyMs: 5000, // 5 seconds
          maxMemoryMb: 100, // 100 MB
        },
      },
    })

    return tests
  }

  private createSecurityTests(parlantTool: any): AdapterTestCase[] {
    const tests: AdapterTestCase[] = []

    // SQL injection test (for database tools)
    if (parlantTool.category === 'data') {
      const maliciousParams = this.generateValidParameters(parlantTool)
      // Add SQL injection payload
      Object.keys(maliciousParams).forEach((key) => {
        if (typeof maliciousParams[key] === 'string') {
          maliciousParams[key] = "'; DROP TABLE users; --"
        }
      })

      tests.push({
        id: `${parlantTool.id}_sql_injection`,
        description: 'Resist SQL injection attempts',
        category: 'security',
        priority: 'critical',
        input: {
          parameters: maliciousParams,
          context: this.createTestContext(),
        },
        expectations: {
          success: false,
          errorPatterns: ['invalid', 'sanitization', 'injection'],
        },
      })
    }

    return tests
  }

  // ================================
  // Utility Methods
  // ================================

  private setupMockEnvironment(testCase: AdapterTestCase): void {
    // Setup mock API responses based on test case
    this.mockEnvironment.mockApiResponse('.*', { success: true, data: 'mock response' })
  }

  private async validateTestResult(
    testCase: AdapterTestCase,
    result: AdapterExecutionResult
  ): Promise<ValidationResult[]> {
    const validations: ValidationResult[] = []

    // Success expectation validation
    validations.push({
      type: 'business_logic',
      passed: result.success === testCase.expectations.success,
      description: 'Success expectation matches',
      comparison: {
        expected: testCase.expectations.success,
        actual: result.success,
      },
    })

    // Performance validation
    if (testCase.expectations.performanceThresholds?.maxLatencyMs) {
      validations.push({
        type: 'performance',
        passed: result.timing.duration <= testCase.expectations.performanceThresholds.maxLatencyMs,
        description: 'Latency within acceptable threshold',
        comparison: {
          expected: `<= ${testCase.expectations.performanceThresholds.maxLatencyMs}ms`,
          actual: `${result.timing.duration}ms`,
        },
      })
    }

    // Error pattern validation
    if (testCase.expectations.errorPatterns && result.error) {
      const errorMatches = testCase.expectations.errorPatterns.some((pattern) =>
        result.error!.toLowerCase().includes(pattern.toLowerCase())
      )

      validations.push({
        type: 'error_handling',
        passed: errorMatches,
        description: 'Error message matches expected patterns',
        comparison: {
          expected: testCase.expectations.errorPatterns,
          actual: result.error,
        },
      })
    }

    // Custom validators
    if (testCase.expectations.customValidators) {
      for (const validator of testCase.expectations.customValidators) {
        validations.push(validator(result))
      }
    }

    return validations
  }

  private determineTestPassed(
    testCase: AdapterTestCase,
    result: AdapterExecutionResult,
    validations: ValidationResult[]
  ): boolean {
    return validations.every((v) => v.passed)
  }

  private extractErrors(
    testCase: AdapterTestCase,
    result: AdapterExecutionResult,
    validations: ValidationResult[]
  ): string[] {
    const errors: string[] = []

    if (result.error) {
      errors.push(result.error)
    }

    validations.forEach((v) => {
      if (!v.passed && v.error) {
        errors.push(v.error)
      }
    })

    return errors
  }

  private createTestContext(): ToolExecutionContext {
    return {
      userId: 'test-user-123',
      workspaceId: 'test-workspace-456',
      agentId: 'test-agent-789',
      sessionId: 'test-session-abc',
    }
  }

  private generateValidParameters(parlantTool: any): Record<string, any> {
    const params: Record<string, any> = {}

    parlantTool.parameters.forEach((param: any) => {
      if (param.required || param.default !== undefined) {
        params[param.name] = this.generateValidValue(param)
      }
    })

    // Add mock authentication if required
    if (parlantTool.requiresAuth) {
      const credentials = this.mockEnvironment.getMockCredentials(parlantTool.requiresAuth.provider)
      Object.assign(params, credentials)
    }

    return params
  }

  private generateValidValue(param: any): any {
    if (param.default !== undefined) {
      return param.default
    }

    if (param.examples && param.examples.length > 0) {
      return param.examples[0]
    }

    switch (param.type) {
      case 'string':
        return 'test-string-value'
      case 'number':
        return param.constraints?.min || 1
      case 'boolean':
        return true
      case 'array':
        return ['test-item']
      case 'object':
        return { test: 'value' }
      default:
        return 'test-value'
    }
  }

  private getInvalidTypeValue(type: string): any {
    switch (type) {
      case 'string':
        return 12345 // Number instead of string
      case 'number':
        return 'not-a-number'
      case 'boolean':
        return 'not-boolean'
      case 'array':
        return 'not-an-array'
      case 'object':
        return 'not-an-object'
      default:
        return null
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private async getMemoryUsage(): Promise<number> {
    // Mock memory usage calculation
    return Math.random() * 50 + 10 // 10-60 MB
  }

  private async getCpuUsage(): Promise<number> {
    // Mock CPU usage calculation
    return Math.random() * 20 + 5 // 5-25%
  }

  /**
   * Get mock environment for external setup
   */
  getMockEnvironment(): AdapterMockEnvironment {
    return this.mockEnvironment
  }

  /**
   * Generate test report in various formats
   */
  generateTestReport(
    results: TestSuiteResult,
    format: 'json' | 'html' | 'markdown' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2)
      case 'html':
        return this.generateHtmlReport(results)
      case 'markdown':
        return this.generateMarkdownReport(results)
      default:
        return JSON.stringify(results, null, 2)
    }
  }

  private generateHtmlReport(results: TestSuiteResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Adapter Test Report - ${results.config.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .passed { color: green; }
    .failed { color: red; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Test Report: ${results.config.name}</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Total Tests: ${results.summary.total}</p>
    <p class="passed">Passed: ${results.summary.passed}</p>
    <p class="failed">Failed: ${results.summary.failed}</p>
    <p>Pass Rate: ${(results.summary.passRate * 100).toFixed(1)}%</p>
    <p>Duration: ${results.summary.duration}ms</p>
  </div>
  <h2>Test Results</h2>
  ${results.results
    .map(
      (result) => `
    <div class="${result.passed ? 'passed' : 'failed'}">
      <h3>${result.testCase.id}</h3>
      <p>${result.testCase.description}</p>
      <p>Status: ${result.passed ? 'PASSED' : 'FAILED'}</p>
      <p>Duration: ${result.timing.duration}ms</p>
      ${result.errors.length > 0 ? `<p>Errors: ${result.errors.join(', ')}</p>` : ''}
    </div>
  `
    )
    .join('')}
</body>
</html>
    `.trim()
  }

  private generateMarkdownReport(results: TestSuiteResult): string {
    return `
# Test Report: ${results.config.name}

## Summary
- **Total Tests:** ${results.summary.total}
- **Passed:** ${results.summary.passed} ✅
- **Failed:** ${results.summary.failed} ❌
- **Pass Rate:** ${(results.summary.passRate * 100).toFixed(1)}%
- **Duration:** ${results.summary.duration}ms

## Performance Metrics
- **Average Latency:** ${results.performance.averageLatencyMs.toFixed(2)}ms
- **Max Latency:** ${results.performance.maxLatencyMs}ms
- **Min Latency:** ${results.performance.minLatencyMs}ms

## Test Results

${results.results
  .map(
    (result) => `
### ${result.testCase.id} ${result.passed ? '✅' : '❌'}

**Description:** ${result.testCase.description}
**Category:** ${result.testCase.category}
**Duration:** ${result.timing.duration}ms

${result.errors.length > 0 ? `**Errors:**\n${result.errors.map((e) => `- ${e}`).join('\n')}` : ''}
`
  )
  .join('\n')}
    `.trim()
  }
}
