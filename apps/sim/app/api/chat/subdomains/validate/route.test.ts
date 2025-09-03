/**
 * Chat Subdomain Validation API Route Tests - Comprehensive Bun/Vitest Compatible Test Suite
 *
 * This file contains comprehensive tests for the chat subdomain validation API route including:
 * - User authentication validation for subdomain operations
 * - Request parameter validation and sanitization
 * - Subdomain format validation and pattern matching
 * - Reserved subdomain protection mechanisms
 * - Database availability checks and conflict resolution
 * - Comprehensive error handling and status code management
 *
 * Migration Notes:
 * - Migrated from vi.doMock() to module-level vi.mock() declarations for bun compatibility
 * - Added comprehensive logging throughout all test scenarios for debugging
 * - Enhanced error handling and edge case coverage for production readiness
 * - Implemented proper authentication flow testing with realistic status codes
 * - Added detailed comments explaining each test scenario for future developers
 *
 * Test Infrastructure:
 * - Uses enhanced module mocks from @/app/api/__test-utils__/module-mocks
 * - Leverages enhanced utilities from @/app/api/__test-utils__/enhanced-utils
 * - Comprehensive logging for debugging test failures and execution flow
 * - Production-ready error handling and validation scenarios
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import enhanced test infrastructure for bun/vitest compatibility
import '@/app/api/__test-utils__/module-mocks'
import { setupEnhancedTestMocks } from '@/app/api/__test-utils__/enhanced-utils'

// Mock chat-specific schema for subdomain validation
vi.mock('@/db/schema', () => {
  console.log('📦 Mocking @/db/schema for chat subdomain validation tests')
  return {
    chat: {
      id: 'id',
      subdomain: 'subdomain',
      userId: 'userId',
      name: 'name',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      authType: 'authType',
      password: 'password',
      allowedEmails: 'allowedEmails',
    },
  }
})

// Mock workflow utilities for response handling
vi.mock('@/app/api/workflows/utils', () => {
  console.log('📦 Mocking @/app/api/workflows/utils for response handling')
  return {
    createSuccessResponse: vi.fn().mockImplementation((data) => {
      console.log('🔍 createSuccessResponse called with data:', data)
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
    createErrorResponse: vi.fn().mockImplementation((message, status = 500) => {
      console.log('🔍 createErrorResponse called with:', { message, status })
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  }
})

// Mock NextResponse for API responses
vi.mock('next/server', async (importOriginal) => {
  console.log('📦 Mocking next/server for NextRequest and NextResponse')
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    NextResponse: {
      json: vi.fn().mockImplementation((data, options) => {
        console.log('🔍 NextResponse.json called with:', { data, status: options?.status || 200 })
        return new Response(JSON.stringify(data), {
          status: options?.status || 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }),
    },
  }
})

describe('Chat Subdomain Validation API Route - Comprehensive Test Suite', () => {
  let testMocks: any

  beforeEach(() => {
    console.log('🚀 Setting up Chat Subdomain Validation API test environment')

    // Clear all mocks to ensure clean state
    vi.clearAllMocks()

    // Setup enhanced test mocks with subdomain validation specific configuration
    testMocks = setupEnhancedTestMocks({
      auth: {
        authenticated: true,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      },
      database: {
        select: { results: [[]] }, // Default to no existing subdomains
      },
      permissions: {
        level: 'admin',
      },
    })

    console.log('✅ Chat Subdomain Validation API test environment setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up Chat Subdomain Validation API test environment')

    // Clean up all mocks after each test
    testMocks?.cleanup()
    vi.clearAllMocks()

    console.log('✅ Chat Subdomain Validation API test cleanup complete')
  })

  describe('Authentication Validation', () => {
    /**
     * Test unauthenticated access to subdomain validation endpoint
     * Subdomain validation requires user authentication to prevent abuse
     * This ensures only authenticated users can check subdomain availability
     */
    it('should return 401 Unauthorized when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to subdomain validation')

      // Set up unauthenticated state
      testMocks.auth.setUnauthenticated()

      const request = new NextRequest(
        'http://localhost:3000/api/chat/subdomains/validate?subdomain=test-subdomain'
      )

      console.log('🔍 Processing unauthenticated request for subdomain validation')
      console.log('🔍 Request URL:', request.url)

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Unauthenticated response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      // Verify error response was created
      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Unauthorized', 401)

      console.log('✅ Unauthenticated access properly rejected with 401 status')
    })

    /**
     * Test authenticated access with proper user context
     * Authenticated users should be able to access subdomain validation
     */
    it('should allow authenticated users to access subdomain validation', async () => {
      console.log('🧪 Testing authenticated access to subdomain validation')

      // Ensure authenticated state with valid user
      testMocks.auth.setAuthenticated({ id: 'user-456', email: 'authenticated@example.com' })

      const request = new NextRequest(
        'http://localhost:3000/api/chat/subdomains/validate?subdomain=valid-test'
      )

      console.log('🔍 Processing authenticated request for subdomain validation')
      console.log('🔍 Request URL:', request.url)
      console.log('🔍 Authenticated user:', { id: 'user-456', email: 'authenticated@example.com' })

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Authenticated response status:', response.status)

      // Should not return 401 (authentication should pass)
      expect(response.status).not.toBe(401)

      console.log('✅ Authenticated access allowed successfully')
    })
  })

  describe('Request Parameter Validation', () => {
    /**
     * Test missing subdomain parameter handling
     * Requests without subdomain parameter should return 400 Bad Request
     * This ensures proper API contract validation
     */
    it('should return 400 Bad Request when subdomain parameter is missing', async () => {
      console.log('🧪 Testing missing subdomain parameter validation')

      // Ensure user is authenticated
      testMocks.auth.setAuthenticated({ id: 'user-789', email: 'param-test@example.com' })

      // Create request without subdomain parameter
      const request = new NextRequest('http://localhost:3000/api/chat/subdomains/validate')

      console.log('🔍 Processing request without subdomain parameter')
      console.log('🔍 Request URL:', request.url)
      console.log('🔍 URL search params:', Object.fromEntries(request.nextUrl.searchParams))

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Missing parameter response status:', response.status)

      // Should return 400 Bad Request
      expect(response.status).toBe(400)

      // Verify proper error response was created
      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Missing subdomain parameter', 400)

      console.log('✅ Missing subdomain parameter properly handled with 400 status')
    })

    /**
     * Test empty subdomain parameter handling
     * Empty subdomain values should be treated as missing parameters
     */
    it('should return 400 Bad Request when subdomain parameter is empty', async () => {
      console.log('🧪 Testing empty subdomain parameter validation')

      testMocks.auth.setAuthenticated({ id: 'user-empty', email: 'empty-test@example.com' })

      // Test various empty parameter scenarios
      const emptyParameterTests = [
        {
          url: 'http://localhost:3000/api/chat/subdomains/validate?subdomain=',
          description: 'empty string',
        },
        {
          url: 'http://localhost:3000/api/chat/subdomains/validate?subdomain=   ',
          description: 'whitespace only',
        },
      ]

      for (const test of emptyParameterTests) {
        console.log(`🔍 Testing ${test.description} subdomain parameter`)
        const request = new NextRequest(test.url)

        const { GET } = await import('@/app/api/chat/subdomains/validate/route')
        const response = await GET(request)

        console.log(`🔍 ${test.description} response status:`, response.status)

        // Should return 400 Bad Request for empty parameters
        expect(response.status).toBe(400)
      }

      console.log('✅ Empty subdomain parameters properly handled with 400 status')
    })
  })

  describe('Subdomain Format Validation', () => {
    /**
     * Test invalid subdomain format rejection
     * Subdomains must follow specific format rules for DNS compatibility
     * Invalid formats should return 400 with specific error message
     */
    it('should return 400 Bad Request for invalid subdomain format', async () => {
      console.log('🧪 Testing invalid subdomain format validation')

      testMocks.auth.setAuthenticated({ id: 'user-format', email: 'format-test@example.com' })

      // Test various invalid subdomain formats
      const invalidSubdomains = [
        { value: 'Invalid_Subdomain!', description: 'contains special characters' },
        { value: 'UPPERCASE-SUBDOMAIN', description: 'contains uppercase letters' },
        { value: 'subdomain-with-numbers-123!', description: 'contains exclamation mark' },
        { value: 'sub domain', description: 'contains space' },
        { value: '-invalid-start', description: 'starts with hyphen' },
        { value: 'invalid-end-', description: 'ends with hyphen' },
        { value: 'a', description: 'too short (less than 2 characters)' },
        { value: 'a'.repeat(64), description: 'too long (more than 63 characters)' },
      ]

      for (const invalidSubdomain of invalidSubdomains) {
        console.log(`🔍 Testing invalid subdomain: ${invalidSubdomain.description}`)

        const request = new NextRequest(
          `http://localhost:3000/api/chat/subdomains/validate?subdomain=${encodeURIComponent(invalidSubdomain.value)}`
        )

        console.log('🔍 Request subdomain value:', invalidSubdomain.value)

        const { GET } = await import('@/app/api/chat/subdomains/validate/route')
        const response = await GET(request)

        console.log(
          `🔍 Invalid format response status (${invalidSubdomain.description}):`,
          response.status
        )

        // Should return 400 for invalid format
        expect(response.status).toBe(400)

        // Parse response to check error details
        const responseData = await response.json()
        expect(responseData).toHaveProperty('available', false)
        expect(responseData).toHaveProperty('error', 'Invalid subdomain format')

        console.log(
          `✅ Invalid subdomain format (${invalidSubdomain.description}) properly rejected`
        )
      }

      console.log('✅ All invalid subdomain formats properly handled')
    })

    /**
     * Test valid subdomain format acceptance
     * Valid subdomains should pass format validation and proceed to availability check
     */
    it('should accept valid subdomain formats', async () => {
      console.log('🧪 Testing valid subdomain format acceptance')

      testMocks.auth.setAuthenticated({ id: 'user-valid', email: 'valid-test@example.com' })

      // Set database to return no existing subdomains (available)
      testMocks.database.setSelectResults([[]])

      // Test various valid subdomain formats
      const validSubdomains = [
        { value: 'valid-subdomain', description: 'lowercase with hyphens' },
        { value: 'subdomain123', description: 'lowercase with numbers' },
        { value: 'sub-domain-123', description: 'lowercase with hyphens and numbers' },
        { value: 'ab', description: 'minimum length (2 characters)' },
        { value: 'a'.repeat(63), description: 'maximum length (63 characters)' },
      ]

      for (const validSubdomain of validSubdomains) {
        console.log(`🔍 Testing valid subdomain: ${validSubdomain.description}`)

        const request = new NextRequest(
          `http://localhost:3000/api/chat/subdomains/validate?subdomain=${validSubdomain.value}`
        )

        console.log('🔍 Request subdomain value:', validSubdomain.value)

        const { GET } = await import('@/app/api/chat/subdomains/validate/route')
        const response = await GET(request)

        console.log(
          `🔍 Valid format response status (${validSubdomain.description}):`,
          response.status
        )

        // Should return 200 for valid format (proceeds to availability check)
        expect(response.status).toBe(200)

        console.log(`✅ Valid subdomain format (${validSubdomain.description}) accepted`)
      }

      console.log('✅ All valid subdomain formats properly accepted')
    })
  })

  describe('Subdomain Availability Checking', () => {
    /**
     * Test available subdomain response
     * Subdomains not in use should return available: true
     */
    it('should return available=true when subdomain is valid and not in use', async () => {
      console.log('🧪 Testing available subdomain detection')

      testMocks.auth.setAuthenticated({ id: 'user-available', email: 'available-test@example.com' })

      // Set database to return empty results (subdomain not in use)
      testMocks.database.setSelectResults([[]])

      const testSubdomain = 'available-subdomain'
      const request = new NextRequest(
        `http://localhost:3000/api/chat/subdomains/validate?subdomain=${testSubdomain}`
      )

      console.log('🔍 Testing subdomain availability for:', testSubdomain)
      console.log('🔍 Database configured to return: no existing subdomains')

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Available subdomain response status:', response.status)

      // Should return 200 OK
      expect(response.status).toBe(200)

      // Verify success response was created with correct data
      const { createSuccessResponse } = await import('@/app/api/workflows/utils')
      expect(createSuccessResponse).toHaveBeenCalledWith({
        available: true,
        subdomain: testSubdomain,
      })

      console.log('✅ Available subdomain properly detected and returned')
    })

    /**
     * Test unavailable subdomain response
     * Subdomains already in use should return available: false
     */
    it('should return available=false when subdomain is already in use', async () => {
      console.log('🧪 Testing unavailable subdomain detection')

      testMocks.auth.setAuthenticated({
        id: 'user-unavailable',
        email: 'unavailable-test@example.com',
      })

      // Set database to return existing subdomain data (subdomain in use)
      testMocks.database.setSelectResults([
        [
          {
            id: 'existing-chat-id-456',
            subdomain: 'used-subdomain',
            userId: 'other-user-123',
          },
        ],
      ])

      const testSubdomain = 'used-subdomain'
      const request = new NextRequest(
        `http://localhost:3000/api/chat/subdomains/validate?subdomain=${testSubdomain}`
      )

      console.log('🔍 Testing subdomain unavailability for:', testSubdomain)
      console.log('🔍 Database configured to return: existing subdomain data')

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Unavailable subdomain response status:', response.status)

      // Should return 200 OK (but available: false)
      expect(response.status).toBe(200)

      // Verify success response was created with correct unavailable data
      const { createSuccessResponse } = await import('@/app/api/workflows/utils')
      expect(createSuccessResponse).toHaveBeenCalledWith({
        available: false,
        subdomain: testSubdomain,
      })

      console.log('✅ Unavailable subdomain properly detected and returned')
    })
  })

  describe('Reserved Subdomain Protection', () => {
    /**
     * Test reserved subdomain rejection
     * System reserved subdomains should be protected from user registration
     * These subdomains are reserved for system functionality
     */
    it('should return available=false when subdomain is reserved', async () => {
      console.log('🧪 Testing reserved subdomain protection')

      testMocks.auth.setAuthenticated({ id: 'user-reserved', email: 'reserved-test@example.com' })

      // Test various reserved subdomains
      const reservedSubdomains = [
        'telemetry',
        'api',
        'www',
        'admin',
        'support',
        'help',
        'mail',
        'email',
        'ftp',
        'blog',
        'news',
        'shop',
        'store',
      ]

      for (const reservedSubdomain of reservedSubdomains) {
        console.log(`🔍 Testing reserved subdomain protection for: ${reservedSubdomain}`)

        const request = new NextRequest(
          `http://localhost:3000/api/chat/subdomains/validate?subdomain=${reservedSubdomain}`
        )

        console.log('🔍 Request for reserved subdomain:', reservedSubdomain)

        const { GET } = await import('@/app/api/chat/subdomains/validate/route')
        const response = await GET(request)

        console.log(
          `🔍 Reserved subdomain response status (${reservedSubdomain}):`,
          response.status
        )

        // Should return 400 Bad Request for reserved subdomains
        expect(response.status).toBe(400)

        // Parse response to verify error details
        const responseData = await response.json()
        expect(responseData).toHaveProperty('available', false)
        expect(responseData).toHaveProperty('error', 'This subdomain is reserved')

        console.log(`✅ Reserved subdomain (${reservedSubdomain}) properly protected`)
      }

      console.log('✅ All reserved subdomains properly protected from registration')
    })
  })

  describe('Database Error Handling', () => {
    /**
     * Test database connection failure handling
     * Database errors should return 500 Internal Server Error with appropriate message
     * This ensures graceful error handling during database outages
     */
    it('should return 500 Internal Server Error when database query fails', async () => {
      console.log('🧪 Testing database error handling')

      testMocks.auth.setAuthenticated({ id: 'user-db-error', email: 'db-error-test@example.com' })

      // Configure database to throw an error
      const databaseError = new Error('Database connection timeout')
      testMocks.database.setSelectResults([[]])

      // Mock the database select to throw an error instead
      const mockDb = vi.mocked((await import('@/db')).db)
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockRejectedValue(databaseError),
          })),
        })),
      }))

      const testSubdomain = 'error-test-subdomain'
      const request = new NextRequest(
        `http://localhost:3000/api/chat/subdomains/validate?subdomain=${testSubdomain}`
      )

      console.log('🔍 Testing database error for subdomain:', testSubdomain)
      console.log('🔍 Database configured to throw error:', databaseError.message)

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Database error response status:', response.status)

      // Should return 500 Internal Server Error
      expect(response.status).toBe(500)

      // Verify error response was created with appropriate message
      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith(
        'Failed to check subdomain availability',
        500
      )

      console.log('✅ Database error properly handled with 500 status and appropriate message')
    })

    /**
     * Test database timeout handling
     * Long-running queries should be handled gracefully
     */
    it('should handle database timeout scenarios gracefully', async () => {
      console.log('🧪 Testing database timeout handling')

      testMocks.auth.setAuthenticated({ id: 'user-timeout', email: 'timeout-test@example.com' })

      // Configure database to simulate timeout
      const timeoutError = new Error('Query timeout after 30 seconds')
      timeoutError.name = 'TimeoutError'

      const mockDb = vi.mocked((await import('@/db')).db)
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockRejectedValue(timeoutError),
          })),
        })),
      }))

      const testSubdomain = 'timeout-test-subdomain'
      const request = new NextRequest(
        `http://localhost:3000/api/chat/subdomains/validate?subdomain=${testSubdomain}`
      )

      console.log('🔍 Testing database timeout for subdomain:', testSubdomain)
      console.log('🔍 Database configured to timeout:', timeoutError.message)

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Database timeout response status:', response.status)

      // Should return 500 Internal Server Error
      expect(response.status).toBe(500)

      console.log('✅ Database timeout properly handled with 500 status')
    })
  })

  describe('Comprehensive Integration Scenarios', () => {
    /**
     * Test complete successful validation workflow
     * End-to-end test of successful subdomain validation with all checks passing
     */
    it('should complete successful validation workflow for available subdomain', async () => {
      console.log('🧪 Testing complete successful subdomain validation workflow')

      // Setup authenticated user with proper permissions
      const testUser = {
        id: 'integration-user-123',
        email: 'integration@example.com',
        name: 'Integration Test User',
      }
      testMocks.auth.setAuthenticated(testUser)

      // Configure database to show subdomain is available
      testMocks.database.setSelectResults([[]])

      const availableSubdomain = 'my-awesome-chat'
      const request = new NextRequest(
        `http://localhost:3000/api/chat/subdomains/validate?subdomain=${availableSubdomain}`
      )

      console.log('🔍 Running complete validation workflow for subdomain:', availableSubdomain)
      console.log('🔍 Authenticated user:', testUser)
      console.log(
        '🔍 Expected workflow: auth → param validation → format validation → availability check → success'
      )

      const { GET } = await import('@/app/api/chat/subdomains/validate/route')
      const response = await GET(request)

      console.log('🔍 Complete workflow response status:', response.status)

      // Should successfully complete all validation steps
      expect(response.status).toBe(200)

      // Verify success response with proper data structure
      const { createSuccessResponse } = await import('@/app/api/workflows/utils')
      expect(createSuccessResponse).toHaveBeenCalledWith({
        available: true,
        subdomain: availableSubdomain,
      })

      console.log('✅ Complete successful validation workflow executed properly')
      console.log('  - ✅ Authentication passed')
      console.log('  - ✅ Parameter validation passed')
      console.log('  - ✅ Format validation passed')
      console.log('  - ✅ Availability check passed')
      console.log('  - ✅ Success response generated')
    })

    /**
     * Test multiple validation failures in sequence
     * Ensures proper error precedence and handling
     */
    it('should handle multiple potential validation issues with proper precedence', async () => {
      console.log('🧪 Testing validation error precedence handling')

      // Test scenarios with different error precedence
      const errorScenarios = [
        {
          name: 'Unauthenticated user with invalid format',
          setup: () => {
            testMocks.auth.setUnauthenticated()
          },
          subdomain: 'INVALID_FORMAT!',
          expectedStatus: 401,
          expectedPrecedence: 'Authentication should be checked first',
        },
        {
          name: 'Authenticated user with missing parameter',
          setup: () => {
            testMocks.auth.setAuthenticated({ id: 'test-user', email: 'test@example.com' })
          },
          subdomain: null, // No subdomain parameter
          expectedStatus: 400,
          expectedPrecedence: 'Parameter validation should be checked after authentication',
        },
        {
          name: 'Authenticated user with invalid format',
          setup: () => {
            testMocks.auth.setAuthenticated({ id: 'test-user', email: 'test@example.com' })
          },
          subdomain: 'INVALID_FORMAT!',
          expectedStatus: 400,
          expectedPrecedence: 'Format validation should be checked after parameter validation',
        },
      ]

      for (const scenario of errorScenarios) {
        console.log(`🔍 Testing scenario: ${scenario.name}`)

        scenario.setup()

        const url = scenario.subdomain
          ? `http://localhost:3000/api/chat/subdomains/validate?subdomain=${encodeURIComponent(scenario.subdomain)}`
          : 'http://localhost:3000/api/chat/subdomains/validate'

        const request = new NextRequest(url)

        console.log('🔍 Request URL:', url)
        console.log('🔍 Expected precedence:', scenario.expectedPrecedence)

        const { GET } = await import('@/app/api/chat/subdomains/validate/route')
        const response = await GET(request)

        console.log(`🔍 ${scenario.name} response status:`, response.status)

        expect(response.status).toBe(scenario.expectedStatus)
        console.log(`✅ ${scenario.name} handled with correct precedence`)
      }

      console.log('✅ All validation error precedence scenarios handled correctly')
    })
  })
})
