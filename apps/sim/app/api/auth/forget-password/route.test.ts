/**
 * Comprehensive Test Suite for Forget Password API - Bun/Vitest Compatible
 * Tests password reset email functionality including validation and error handling
 * Covers successful requests, validation failures, and service error scenarios
 *
 * This test suite uses the new module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'

// Import module-level mocks and auth API controls
import { mockAuthApi } from '@/app/api/__test-utils__/module-mocks'

describe('Forget Password API Route', () => {
  let mocks: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing enhanced test mocks for forget password API')

    // Setup comprehensive test infrastructure
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [[]],
        },
      },
    })

    // Configure auth API mock to return success by default
    mockAuthApi.forgetPassword.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    })

    console.log('[SETUP] Enhanced test infrastructure initialized successfully')

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    POST = routeModule.POST
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
    mocks?.cleanup()
  })

  it('should send password reset email successfully with redirectTo', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing successful password reset email with redirectTo URL')

    // Configure auth API to return successful response for this test
    // This simulates the auth service successfully sending the password reset email
    mockAuthApi.forgetPassword.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    })

    // Create request with both email and redirectTo parameters
    // The redirectTo URL is where users will be sent after clicking the reset link
    const req = createMockRequest('POST', {
      email: 'test@example.com',
      redirectTo: 'https://example.com/reset',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Forget password response status: ${response.status}`)
    console.log(`[TEST] Response data:`, data)

    // Verify successful response structure and status
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify that the auth API was called with correct parameters
    // This ensures the request data is properly forwarded to the auth service
    expect(mockAuthApi.forgetPassword).toHaveBeenCalledWith({
      body: {
        email: 'test@example.com',
        redirectTo: 'https://example.com/reset',
      },
      method: 'POST',
    })

    console.log('[TEST] Password reset email with redirectTo test completed successfully')
  })

  it('should send password reset email without redirectTo', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing successful password reset email without redirectTo URL')

    // Configure auth API to return successful response for this test
    // This test verifies the optional nature of the redirectTo parameter
    mockAuthApi.forgetPassword.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    })

    // Create request with only email parameter (redirectTo is optional)
    // When redirectTo is not provided, the system should use a default behavior
    const req = createMockRequest('POST', {
      email: 'test@example.com',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Forget password (no redirect) response status: ${response.status}`)
    console.log(`[TEST] Response data:`, data)

    // Verify successful response structure and status
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify that the auth API was called with email only and undefined redirectTo
    // This ensures the API can handle requests without optional parameters
    expect(mockAuthApi.forgetPassword).toHaveBeenCalledWith({
      body: {
        email: 'test@example.com',
        redirectTo: undefined,
      },
      method: 'POST',
    })

    console.log('[TEST] Password reset email without redirectTo test completed successfully')
  })

  it('should handle missing email validation', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when email is missing from request')

    // Create request with empty body (no email provided)
    // This tests the API's input validation for required fields
    const req = createMockRequest('POST', {})

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Missing email validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.message)

    // Verify that proper validation error is returned
    // The API should return 400 Bad Request for missing required fields
    expect(response.status).toBe(400)
    expect(data.message).toBe('Email is required')

    // Verify that auth service is not called when validation fails
    // This ensures validation happens before expensive external service calls
    expect(mockAuthApi.forgetPassword).not.toHaveBeenCalled()

    console.log('[TEST] Missing email validation test completed successfully')
  })

  it('should handle empty email validation', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when email is empty string')

    // Create request with empty email string
    // This tests the API's validation for empty values vs missing values
    const req = createMockRequest('POST', {
      email: '',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Empty email validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.message)

    // Verify that empty email is treated as missing email
    // Both empty string and undefined should trigger the same validation error
    expect(response.status).toBe(400)
    expect(data.message).toBe('Email is required')

    // Verify that auth service is not called for empty email
    // This prevents unnecessary service calls with invalid data
    expect(mockAuthApi.forgetPassword).not.toHaveBeenCalled()

    console.log('[TEST] Empty email validation test completed successfully')
  })

  it('should handle auth service error with specific message', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing auth service error handling with specific error message')

    const errorMessage = 'User not found'

    // Configure auth API to throw an error with specific message
    // This simulates scenarios where the auth service encounters issues
    mockAuthApi.forgetPassword.mockRejectedValue(new Error(errorMessage))

    // Create request for non-existent user
    // This tests error handling for legitimate requests that fail due to business logic
    const req = createMockRequest('POST', {
      email: 'nonexistent@example.com',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Auth service error response status: ${response.status}`)
    console.log(`[TEST] Error message:`, data.message)

    // Verify that the API properly handles and forwards auth service errors
    // Error responses should include the specific error message from the service
    expect(response.status).toBe(500)
    expect(data.message).toBe(errorMessage)

    // Verify that the auth API was still called with correct parameters
    // Even failed requests should be properly forwarded to the auth service
    expect(mockAuthApi.forgetPassword).toHaveBeenCalledWith({
      body: {
        email: 'nonexistent@example.com',
        redirectTo: undefined,
      },
      method: 'POST',
    })

    console.log('[TEST] Auth service error handling test completed successfully')
  })

  it('should handle unexpected auth service exceptions', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing unexpected exception handling from auth service')

    // Configure auth API to throw a non-Error object (string rejection)
    // This tests the API's resilience against unforeseen service failures and proper fallback message handling
    mockAuthApi.forgetPassword.mockRejectedValue('Unknown service error')

    // Create a valid request that should succeed under normal circumstances
    // This tests that even valid requests are handled gracefully when services fail
    const req = createMockRequest('POST', {
      email: 'test@example.com',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Unknown error response status: ${response.status}`)
    console.log(`[TEST] Generic error message:`, data.message)

    // Verify that unexpected errors are handled gracefully
    // The API should return a generic user-friendly error message
    expect(response.status).toBe(500)
    expect(data.message).toBe('Failed to send password reset email. Please try again later.')

    // Verify that the auth API was called with correct parameters
    // Even failed requests should attempt to call the auth service properly
    expect(mockAuthApi.forgetPassword).toHaveBeenCalledWith({
      body: {
        email: 'test@example.com',
        redirectTo: undefined,
      },
      method: 'POST',
    })

    console.log('[TEST] Unknown error handling test completed successfully')
  })
})
