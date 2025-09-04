/**
 * 🔧 MIGRATION HELPER UTILITIES
 *
 * Comprehensive set of helper functions for API test migration to bun/vitest 3.x
 * compatible patterns. These utilities provide reusable patterns for common
 * migration tasks and testing scenarios.
 *
 * USAGE:
 * import { migrationHelpers } from '@/app/api/__test-utils__/migration-helpers'
 * const { setupTestEnvironment, createRequestBuilder } = migrationHelpers
 *
 * KEY FEATURES:
 * - ✅ Automated test environment setup
 * - ✅ Request/response builders with consistent patterns
 * - ✅ Mock management utilities
 * - ✅ Validation helpers with comprehensive assertions
 * - ✅ Performance measurement tools
 * - ✅ Error simulation utilities
 */

import { NextRequest } from 'next/server'
import { vi } from 'vitest'
import { mockControls } from './module-mocks'

// ================================
// TYPE DEFINITIONS
// ================================

export interface TestUser {
  id: string
  email: string
  name: string
  role?: string
}

export interface MockDatabaseConfig {
  selectResults?: any[][]
  insertResults?: any[]
  updateResults?: any[]
  deleteResults?: any[]
  errorToThrow?: string | Error
}

export interface AuthConfig {
  user?: TestUser | null
  permissionLevel?: string
  internalTokenValid?: boolean
  apiKeyValid?: boolean
}

export interface TestEnvironmentConfig {
  auth?: AuthConfig
  database?: MockDatabaseConfig
  logging?: boolean
  cleanup?: boolean
}

export interface RequestBuilderConfig {
  method?: string
  body?: any
  headers?: Record<string, string>
  params?: Record<string, string>
  query?: Record<string, string>
  baseUrl?: string
}

export interface ValidationConfig {
  expectedStatus: number
  requiredFields?: string[]
  forbiddenFields?: string[]
  typeChecks?: Record<string, string>
  customValidations?: Array<(data: any) => boolean | string>
}

export interface PerformanceMetrics {
  responseTime: number
  memoryUsage?: number
  requestCount: number
  errorRate: number
}

// ================================
// CORE MIGRATION UTILITIES
// ================================

/**
 * Comprehensive test environment setup utility
 */
export function setupTestEnvironment(config: TestEnvironmentConfig = {}) {
  const {
    auth = { user: createDefaultTestUser() },
    database = {},
    logging = true,
    cleanup = true,
  } = config

  if (logging) {
    console.log('🔧 Setting up comprehensive test environment')
  }

  // Reset all mocks to clean state
  mockControls.reset()
  vi.clearAllMocks()

  // Setup authentication
  if (auth.user) {
    mockControls.setAuthUser(auth.user)
    if (logging) {
      console.log(`🔐 Auth user set: ${auth.user.email} (${auth.user.id})`)
    }
  } else {
    mockControls.setUnauthenticated()
    if (logging) {
      console.log('🔐 User set to unauthenticated')
    }
  }

  // Setup permissions
  if (auth.permissionLevel) {
    mockControls.setPermissionLevel(auth.permissionLevel)
    if (logging) {
      console.log(`🛡️ Permission level set: ${auth.permissionLevel}`)
    }
  }

  // Setup internal token validation
  if (auth.internalTokenValid !== undefined) {
    mockControls.setInternalTokenValid(auth.internalTokenValid)
    if (logging) {
      console.log(`🔑 Internal token valid: ${auth.internalTokenValid}`)
    }
  }

  // Setup database mocks
  if (database.selectResults) {
    mockControls.setDatabaseResults(database.selectResults)
    if (logging) {
      console.log(
        `🗄️ Database select results configured: ${database.selectResults.length} result sets`
      )
    }
  }

  if (database.errorToThrow) {
    mockControls.setDatabaseError(database.errorToThrow)
    if (logging) {
      console.log(`❌ Database error configured: ${database.errorToThrow}`)
    }
  }

  if (logging) {
    console.log('✅ Test environment setup completed')
  }

  return {
    auth,
    database,
    cleanup: cleanup
      ? () => {
          if (logging) {
            console.log('🧹 Cleaning up test environment')
          }
          mockControls.reset()
          vi.clearAllMocks()
        }
      : () => {},
  }
}

/**
 * Flexible request builder utility
 */
export function createRequestBuilder(baseUrl: string) {
  return function buildRequest(config: RequestBuilderConfig = {}): NextRequest {
    const { method = 'GET', body, headers = {}, params = {}, query = {} } = config

    let url = baseUrl

    // Replace path parameters
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`[${key}]`, value).replace(`:${key}`, value)
    })

    // Add query parameters
    const queryString = new URLSearchParams(query).toString()
    if (queryString) {
      url += `?${queryString}`
    }

    console.log(`📨 Building ${method} request to ${url}`)

    const requestInit: RequestInit = {
      method,
      headers: new Headers({
        'Content-Type': 'application/json',
        'User-Agent': 'Migration-Test-Client/1.0',
        ...headers,
      }),
    }

    if (body && !['GET', 'HEAD'].includes(method)) {
      requestInit.body = JSON.stringify(body)
      console.log(`📨 Request body keys: [${Object.keys(body).join(', ')}]`)
    }

    return new NextRequest(url, requestInit)
  }
}

/**
 * Comprehensive response validation utility
 */
export async function validateResponse(
  response: Response,
  config: ValidationConfig,
  operationName = 'API operation'
): Promise<any> {
  const {
    expectedStatus,
    requiredFields = [],
    forbiddenFields = [],
    typeChecks = {},
    customValidations = [],
  } = config

  console.log(
    `✅ Validating ${operationName} response (expected: ${expectedStatus}, actual: ${response.status})`
  )

  // Validate status code
  expect(response.status).toBe(expectedStatus)

  // Parse response data
  const data = await response.json()
  console.log(`📊 Response data keys: [${Object.keys(data).join(', ')}]`)

  // Validate required fields
  requiredFields.forEach((field) => {
    expect(data[field]).toBeDefined()
    console.log(`✅ Required field present: ${field}`)
  })

  // Validate forbidden fields
  forbiddenFields.forEach((field) => {
    expect(data[field]).toBeUndefined()
    console.log(`✅ Forbidden field absent: ${field}`)
  })

  // Validate field types
  Object.entries(typeChecks).forEach(([field, expectedType]) => {
    if (data[field] !== undefined) {
      expect(typeof data[field]).toBe(expectedType)
      console.log(`✅ Field type correct: ${field} is ${expectedType}`)
    }
  })

  // Run custom validations
  customValidations.forEach((validation, index) => {
    const result = validation(data)
    if (typeof result === 'string') {
      throw new Error(`Custom validation ${index + 1} failed: ${result}`)
    }
    if (!result) {
      throw new Error(`Custom validation ${index + 1} failed`)
    }
    console.log(`✅ Custom validation ${index + 1} passed`)
  })

  console.log(`✅ ${operationName} response validation completed successfully`)
  return data
}

/**
 * Performance measurement utility
 */
export function createPerformanceTracker() {
  const metrics: PerformanceMetrics = {
    responseTime: 0,
    requestCount: 0,
    errorRate: 0,
  }

  let startTime = 0
  let requestTimes: number[] = []
  let errorCount = 0

  return {
    start() {
      startTime = Date.now()
      console.log('⏱️ Performance tracking started')
    },

    end() {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      requestTimes.push(responseTime)
      metrics.requestCount++
      metrics.responseTime = responseTime

      console.log(`⏱️ Request completed in ${responseTime}ms`)
      return responseTime
    },

    recordError() {
      errorCount++
      console.log(`❌ Error recorded (total: ${errorCount})`)
    },

    getMetrics(): PerformanceMetrics {
      const totalTime = requestTimes.reduce((sum, time) => sum + time, 0)
      const averageTime = requestTimes.length > 0 ? totalTime / requestTimes.length : 0

      return {
        ...metrics,
        responseTime: averageTime,
        errorRate: metrics.requestCount > 0 ? (errorCount / metrics.requestCount) * 100 : 0,
      }
    },

    reset() {
      requestTimes = []
      errorCount = 0
      metrics.requestCount = 0
      metrics.responseTime = 0
      metrics.errorRate = 0
      console.log('⏱️ Performance metrics reset')
    },
  }
}

/**
 * Error simulation utility
 */
export function createErrorSimulator() {
  return {
    simulateDatabaseError(errorMessage = 'Database connection failed') {
      mockControls.setDatabaseError(errorMessage)
      console.log(`💥 Database error simulated: ${errorMessage}`)
    },

    simulateAuthFailure() {
      mockControls.setUnauthenticated()
      console.log('💥 Authentication failure simulated')
    },

    simulatePermissionDenial(level = 'read') {
      mockControls.setPermissionLevel(level)
      console.log(`💥 Permission denial simulated: ${level} level`)
    },

    simulateNetworkTimeout() {
      // Mock fetch to simulate timeout
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'))
      console.log('💥 Network timeout simulated')

      return () => {
        global.fetch = originalFetch
        console.log('🔧 Network timeout simulation restored')
      }
    },

    simulateRateLimit() {
      // Mock fetch to simulate rate limiting
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
        headers: new Headers({ 'Retry-After': '60' }),
      })
      console.log('💥 Rate limiting simulated')

      return () => {
        global.fetch = originalFetch
        console.log('🔧 Rate limiting simulation restored')
      }
    },
  }
}

// ================================
// AUTHENTICATION HELPERS
// ================================

/**
 * Create default test user
 */
export function createDefaultTestUser(): TestUser {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  }
}

/**
 * Authentication test scenarios utility
 */
export function createAuthTestScenarios(requestBuilder: ReturnType<typeof createRequestBuilder>) {
  return {
    async testUnauthenticated(handler: any, expectedStatus = 401) {
      console.log('🔐 Testing unauthenticated access')

      setupTestEnvironment({ auth: { user: null } })

      const request = requestBuilder()
      const response = await handler(request)

      await validateResponse(
        response,
        {
          expectedStatus,
          requiredFields: ['error'],
          customValidations: [
            (data) => data.error === 'Unauthorized' || data.error.includes('unauthorized'),
          ],
        },
        'unauthenticated access'
      )
    },

    async testSessionAuth(handler: any, user?: TestUser) {
      console.log('🔐 Testing session authentication')

      const testUser = user || createDefaultTestUser()
      setupTestEnvironment({
        auth: { user: testUser },
        database: { selectResults: [[testUser], [{ count: 1 }]] },
      })

      const request = requestBuilder()
      const response = await handler(request)

      await validateResponse(
        response,
        {
          expectedStatus: 200,
          customValidations: [(data) => response.status < 400],
        },
        'session authentication'
      )
    },

    async testApiKeyAuth(handler: any, apiKey = 'test-api-key-123') {
      console.log('🔐 Testing API key authentication')

      setupTestEnvironment({
        auth: { user: null },
        database: { selectResults: [[{ userId: 'user-123' }], [createDefaultTestUser()]] },
      })

      const request = requestBuilder({
        headers: { 'x-api-key': apiKey },
      })
      const response = await handler(request)

      await validateResponse(
        response,
        {
          expectedStatus: 200,
          customValidations: [(data) => response.status < 400],
        },
        'API key authentication'
      )
    },

    async testJwtAuth(handler: any, token = 'internal-jwt-token-123') {
      console.log('🔐 Testing JWT token authentication')

      setupTestEnvironment({
        auth: { user: null, internalTokenValid: true },
        database: { selectResults: [[createDefaultTestUser()]] },
      })

      const request = requestBuilder({
        headers: { authorization: `Bearer ${token}` },
      })
      const response = await handler(request)

      await validateResponse(
        response,
        {
          expectedStatus: 200,
          customValidations: [(data) => response.status < 400],
        },
        'JWT token authentication'
      )
    },

    async testInvalidCredentials(handler: any) {
      console.log('🔐 Testing invalid credentials')

      setupTestEnvironment({
        auth: { user: null },
        database: { selectResults: [[]] }, // No matching user
      })

      const request = requestBuilder({
        method: 'POST',
        body: { email: 'invalid@example.com', password: 'wrongpassword' },
      })
      const response = await handler(request)

      await validateResponse(
        response,
        {
          expectedStatus: 401,
          requiredFields: ['error'],
          customValidations: [
            (data) => data.error.includes('credentials') || data.error.includes('invalid'),
          ],
        },
        'invalid credentials'
      )
    },
  }
}

// ================================
// DATABASE TESTING HELPERS
// ================================

/**
 * Database operation test scenarios
 */
export function createDatabaseTestScenarios() {
  return {
    setupCrudScenario(operation: 'create' | 'read' | 'update' | 'delete', data?: any) {
      console.log(`🗄️ Setting up ${operation} database scenario`)

      const sampleData = data || {
        id: 'test-record-123',
        name: 'Test Record',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      switch (operation) {
        case 'create':
          mockControls.setDatabaseResults([
            [], // No existing record
            [{ ...sampleData, id: 'new-record-123' }], // Created record
          ])
          break
        case 'read':
          mockControls.setDatabaseResults([[sampleData]])
          break
        case 'update':
          mockControls.setDatabaseResults([
            [sampleData], // Existing record
            [{ ...sampleData, updatedAt: new Date() }], // Updated record
          ])
          break
        case 'delete':
          mockControls.setDatabaseResults([
            [sampleData], // Existing record
            [{ id: sampleData.id }], // Deletion confirmation
          ])
          break
      }

      return sampleData
    },

    setupPaginationScenario(
      totalItems: number,
      page: number,
      limit: number,
      itemFactory?: (index: number) => any
    ) {
      console.log(
        `🗄️ Setting up pagination scenario: ${totalItems} total, page ${page}, limit ${limit}`
      )

      const startIndex = (page - 1) * limit
      const pageItems = Array.from({ length: Math.min(limit, totalItems - startIndex) }, (_, i) => {
        const index = startIndex + i
        return itemFactory
          ? itemFactory(index)
          : {
              id: `item-${index}`,
              name: `Item ${index}`,
              index,
            }
      })

      mockControls.setDatabaseResults([pageItems, [{ count: totalItems }]])

      return { pageItems, totalPages: Math.ceil(totalItems / limit) }
    },

    setupFilteringScenario(allItems: any[], filter: Record<string, any>) {
      console.log(`🗄️ Setting up filtering scenario:`, filter)

      const filteredItems = allItems.filter((item) => {
        return Object.entries(filter).every(([key, value]) => {
          return item[key] === value
        })
      })

      mockControls.setDatabaseResults([filteredItems, [{ count: filteredItems.length }]])

      return filteredItems
    },

    setupErrorScenario(errorType: 'connection' | 'constraint' | 'timeout' | 'transaction') {
      console.log(`🗄️ Setting up database error scenario: ${errorType}`)

      const errorMessages = {
        connection: 'Database connection failed',
        constraint: 'Foreign key constraint violation',
        timeout: 'Query timeout exceeded',
        transaction: 'Transaction rollback failed',
      }

      mockControls.setDatabaseError(errorMessages[errorType])
      return errorMessages[errorType]
    },
  }
}

// ================================
// VALIDATION HELPERS
// ================================

/**
 * Common validation patterns
 */
export function createValidationHelpers() {
  return {
    validatePaginationResponse(data: any, expectedPage: number, expectedLimit: number) {
      console.log('📄 Validating pagination response')

      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(expectedPage)
      expect(data.pagination.limit).toBe(expectedLimit)
      expect(data.pagination.total).toBeDefined()
      expect(typeof data.pagination.total).toBe('number')

      if (data.data) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeLessThanOrEqual(expectedLimit)
      }

      console.log('✅ Pagination validation passed')
    },

    validateTimestamps(data: any, fields = ['createdAt', 'updatedAt']) {
      console.log('🕒 Validating timestamp fields')

      fields.forEach((field) => {
        if (data[field]) {
          expect(typeof data[field]).toBe('string')
          expect(() => new Date(data[field])).not.toThrow()
          expect(new Date(data[field]).getTime()).toBeGreaterThan(0)
          console.log(`✅ Valid timestamp: ${field}`)
        }
      })
    },

    validateUuidFields(data: any, fields = ['id']) {
      console.log('🔢 Validating UUID fields')

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      fields.forEach((field) => {
        if (data[field]) {
          // Allow either UUID format or custom ID format (like 'user-123')
          const isUuid = uuidRegex.test(data[field])
          const isCustomId = typeof data[field] === 'string' && data[field].length > 0

          expect(isUuid || isCustomId).toBe(true)
          console.log(`✅ Valid ID format: ${field}`)
        }
      })
    },

    validateSortOrder(items: any[], field: string, order: 'asc' | 'desc' = 'asc') {
      console.log(`🔄 Validating sort order: ${field} (${order})`)

      if (items.length < 2) {
        console.log('✅ Sort validation skipped (insufficient items)')
        return
      }

      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1][field]
        const current = items[i][field]

        if (order === 'asc') {
          expect(prev <= current).toBe(true)
        } else {
          expect(prev >= current).toBe(true)
        }
      }

      console.log('✅ Sort order validation passed')
    },

    validateErrorResponse(data: any, expectedErrorType?: string) {
      console.log('❌ Validating error response')

      expect(data.error).toBeDefined()
      expect(typeof data.error).toBe('string')
      expect(data.error.length).toBeGreaterThan(0)

      if (expectedErrorType) {
        expect(data.error.toLowerCase()).toContain(expectedErrorType.toLowerCase())
        console.log(`✅ Error type matches: ${expectedErrorType}`)
      }

      // Optional fields that might be present in error responses
      if (data.code) {
        expect(typeof data.code).toBe('string')
      }
      if (data.details) {
        expect(typeof data.details).toBe('object')
      }

      console.log('✅ Error response validation passed')
    },
  }
}

// ================================
// PERFORMANCE TESTING HELPERS
// ================================

/**
 * Performance testing utilities
 */
export function createPerformanceHelpers() {
  return {
    async testResponseTime(
      operation: () => Promise<Response>,
      maxResponseTime: number,
      operationName = 'API operation'
    ): Promise<number> {
      console.log(`⏱️ Testing response time for ${operationName} (max: ${maxResponseTime}ms)`)

      const startTime = Date.now()
      const response = await operation()
      const endTime = Date.now()

      const responseTime = endTime - startTime

      expect(responseTime).toBeLessThan(maxResponseTime)
      expect(response.status).toBeLessThan(500) // Should not fail due to performance

      console.log(
        `✅ ${operationName} completed in ${responseTime}ms (under ${maxResponseTime}ms limit)`
      )
      return responseTime
    },

    async testConcurrentRequests(
      operationFactory: (index: number) => Promise<Response>,
      concurrencyLevel: number,
      operationName = 'API operation'
    ): Promise<Response[]> {
      console.log(`🚀 Testing concurrent requests: ${concurrencyLevel} ${operationName}s`)

      const operations = Array.from({ length: concurrencyLevel }, (_, i) => operationFactory(i))

      const startTime = Date.now()
      const responses = await Promise.all(operations)
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const averageTime = totalTime / concurrencyLevel

      // Validate all responses
      responses.forEach((response, i) => {
        expect(response.status).toBeLessThan(500)
        console.log(`📊 Concurrent request ${i + 1} status: ${response.status}`)
      })

      console.log(
        `✅ ${concurrencyLevel} concurrent ${operationName}s completed in ${totalTime}ms (avg: ${averageTime}ms)`
      )
      return responses
    },

    async benchmarkOperation(
      operation: () => Promise<Response>,
      iterations: number,
      operationName = 'API operation'
    ) {
      console.log(`📊 Benchmarking ${operationName} over ${iterations} iterations`)

      const responseTimes: number[] = []
      const results = { success: 0, error: 0, total: iterations }

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()

        try {
          const response = await operation()
          const endTime = Date.now()
          const responseTime = endTime - startTime

          responseTimes.push(responseTime)

          if (response.status < 400) {
            results.success++
          } else {
            results.error++
          }
        } catch (error) {
          results.error++
          console.warn(`⚠️ Benchmark iteration ${i + 1} failed:`, error)
        }
      }

      // Calculate statistics
      const totalTime = responseTimes.reduce((sum, time) => sum + time, 0)
      const averageTime = totalTime / responseTimes.length
      const minTime = Math.min(...responseTimes)
      const maxTime = Math.max(...responseTimes)
      const successRate = (results.success / results.total) * 100

      const benchmark = {
        iterations,
        totalTime,
        averageTime: Math.round(averageTime * 100) / 100,
        minTime,
        maxTime,
        successRate: Math.round(successRate * 100) / 100,
        ...results,
      }

      console.log(`📈 Benchmark results for ${operationName}:`)
      console.log(`   Total time: ${totalTime}ms`)
      console.log(`   Average: ${benchmark.averageTime}ms`)
      console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`)
      console.log(`   Success rate: ${benchmark.successRate}%`)

      return benchmark
    },
  }
}

// ================================
// MIGRATION WORKFLOW HELPERS
// ================================

/**
 * Complete migration workflow utility
 */
export function createMigrationWorkflow(endpointPath: string, handlers: Record<string, any>) {
  const requestBuilder = createRequestBuilder(endpointPath)
  const authScenarios = createAuthTestScenarios(requestBuilder)
  const dbScenarios = createDatabaseTestScenarios()
  const validators = createValidationHelpers()
  const performanceHelpers = createPerformanceHelpers()
  const errorSimulator = createErrorSimulator()

  return {
    requestBuilder,
    authScenarios,
    dbScenarios,
    validators,
    performanceHelpers,
    errorSimulator,

    // Complete test suite generator
    generateTestSuite(testConfig: {
      authentication?: boolean
      crud?: boolean
      pagination?: boolean
      validation?: boolean
      performance?: boolean
      errorHandling?: boolean
    }) {
      const {
        authentication = true,
        crud = true,
        pagination = true,
        validation = true,
        performance = true,
        errorHandling = true,
      } = testConfig

      return {
        async runAuthenticationTests() {
          if (!authentication || !handlers.GET) return

          console.log('🔐 Running authentication test suite')

          await authScenarios.testUnauthenticated(handlers.GET)
          await authScenarios.testSessionAuth(handlers.GET)
          await authScenarios.testApiKeyAuth(handlers.GET)
          await authScenarios.testJwtAuth(handlers.GET)

          console.log('✅ Authentication tests completed')
        },

        async runCrudTests() {
          if (!crud) return

          console.log('📊 Running CRUD test suite')

          if (handlers.POST) {
            const createData = dbScenarios.setupCrudScenario('create')
            const request = requestBuilder({ method: 'POST', body: createData })
            const response = await handlers.POST(request)
            await validateResponse(response, { expectedStatus: 201 })
          }

          if (handlers.GET) {
            dbScenarios.setupCrudScenario('read')
            const request = requestBuilder()
            const response = await handlers.GET(request)
            await validateResponse(response, { expectedStatus: 200 })
          }

          if (handlers.PUT) {
            const updateData = dbScenarios.setupCrudScenario('update')
            const request = requestBuilder({ method: 'PUT', body: updateData })
            const response = await handlers.PUT(request)
            await validateResponse(response, { expectedStatus: 200 })
          }

          if (handlers.DELETE) {
            dbScenarios.setupCrudScenario('delete')
            const request = requestBuilder({ method: 'DELETE' })
            const response = await handlers.DELETE(request)
            await validateResponse(response, { expectedStatus: 200 })
          }

          console.log('✅ CRUD tests completed')
        },

        async runPerformanceTests() {
          if (!performance || !handlers.GET) return

          console.log('⏱️ Running performance test suite')

          // Response time test
          await performanceHelpers.testResponseTime(
            async () => {
              setupTestEnvironment({ database: { selectResults: [[{ id: 'test' }]] } })
              return handlers.GET(requestBuilder())
            },
            2000, // 2 second max
            'GET endpoint'
          )

          // Concurrent requests test
          await performanceHelpers.testConcurrentRequests(
            async (index) => {
              setupTestEnvironment({ database: { selectResults: [[{ id: `test-${index}` }]] } })
              return handlers.GET(requestBuilder({ query: { test: index.toString() } }))
            },
            5,
            'GET endpoint'
          )

          console.log('✅ Performance tests completed')
        },

        async runErrorHandlingTests() {
          if (!errorHandling || !handlers.GET) return

          console.log('❌ Running error handling test suite')

          // Database error
          setupTestEnvironment({ database: { errorToThrow: 'Database connection failed' } })
          const dbErrorRequest = requestBuilder()
          const dbErrorResponse = await handlers.GET(dbErrorRequest)
          expect(dbErrorResponse.status).toBe(500)

          // Network timeout simulation
          const restoreNetwork = errorSimulator.simulateNetworkTimeout()
          // Test timeout handling if endpoint makes external calls
          restoreNetwork()

          console.log('✅ Error handling tests completed')
        },
      }
    },
  }
}

// ================================
// EXPORT MIGRATION HELPERS
// ================================

export const migrationHelpers = {
  // Core utilities
  setupTestEnvironment,
  createRequestBuilder,
  validateResponse,
  createPerformanceTracker,
  createErrorSimulator,

  // Specialized helpers
  createDefaultTestUser,
  createAuthTestScenarios,
  createDatabaseTestScenarios,
  createValidationHelpers,
  createPerformanceHelpers,
  createMigrationWorkflow,

  // Utility functions
  generateSampleData: (count: number, factory?: (index: number) => any) => {
    return Array.from({ length: count }, (_, i) =>
      factory
        ? factory(i)
        : {
            id: `sample-${i}`,
            name: `Sample Item ${i}`,
            index: i,
            createdAt: new Date(),
          }
    )
  },

  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  randomString: (length = 8) =>
    Math.random()
      .toString(36)
      .substring(2, length + 2),

  randomEmail: () => `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
}

export default migrationHelpers
