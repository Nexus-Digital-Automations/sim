/**
 * Comprehensive Test Suite for Reset Password API - Bun/Vitest Compatible
 * Tests password reset functionality including token validation and error handling
 * Covers successful resets, validation failures, invalid tokens, and service error scenarios
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

describe('Reset Password API Route', () => {
  let mocks: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing enhanced test mocks for reset password API')

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
    mockAuthApi.resetPassword.mockResolvedValue({
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

  it('should reset password successfully with valid token', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing successful password reset with valid token')

    // Configure auth API to return successful response for this test
    // This simulates the auth service successfully processing a valid reset token
    mockAuthApi.resetPassword.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    })

    // Create request with valid reset token and new password
    // This tests the happy path where user provides all required information correctly
    const req = createMockRequest('POST', {
      token: 'valid-reset-token',
      newPassword: 'newSecurePassword123',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Reset password response status: ${response.status}`)
    console.log(`[TEST] Response data:`, data)

    // Verify successful password reset response structure and status
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify that the auth API was called with correct parameters
    // This ensures the request data is properly forwarded to the auth service
    expect(mockAuthApi.resetPassword).toHaveBeenCalledWith({
      body: {
        token: 'valid-reset-token',
        newPassword: 'newSecurePassword123',
      },
      method: 'POST',
    })

    console.log('[TEST] Successful password reset test completed successfully')
  })

  it('should handle missing token validation', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when reset token is missing from request')

    // Create request with only password but missing token
    // This tests the API's input validation for required token parameter
    const req = createMockRequest('POST', {
      newPassword: 'newSecurePassword123',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Missing token validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.message)

    // Verify that proper validation error is returned
    // The API should return 400 Bad Request for missing required parameters
    expect(response.status).toBe(400)
    expect(data.message).toBe('Token and new password are required')

    // Verify that auth service is not called when validation fails
    // This ensures validation happens before expensive external service calls
    expect(mockAuthApi.resetPassword).not.toHaveBeenCalled()

    console.log('[TEST] Missing token validation test completed successfully')
  })

  it('should handle missing new password validation', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when new password is missing from request')

    // Create request with token but missing new password
    // This tests the API's input validation for required password parameter
    const req = createMockRequest('POST', {
      token: 'valid-reset-token',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Missing password validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.message)

    // Verify that proper validation error is returned
    // Both token and password are required for password reset
    expect(response.status).toBe(400)
    expect(data.message).toBe('Token and new password are required')

    // Verify that auth service is not called when validation fails
    // This prevents potentially dangerous operations with incomplete data
    expect(mockAuthApi.resetPassword).not.toHaveBeenCalled()

    console.log('[TEST] Missing password validation test completed successfully')
  })

  it('should handle empty token validation', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when reset token is empty string')

    // Create request with empty token string and valid password
    // This tests the API's validation for empty values vs missing values
    const req = createMockRequest('POST', {
      token: '',
      newPassword: 'newSecurePassword123',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Empty token validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.message)

    // Verify that empty token is treated as missing token
    // Both empty string and undefined should trigger the same validation error
    expect(response.status).toBe(400)
    expect(data.message).toBe('Token and new password are required')

    // Verify that auth service is not called for empty token
    // This prevents attempts to reset password with invalid tokens
    expect(mockAuthApi.resetPassword).not.toHaveBeenCalled()

    console.log('[TEST] Empty token validation test completed successfully')
  })

  it('should handle empty new password validation', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when new password is empty string')

    // Create request with valid token but empty password string
    // This tests the API's validation for empty password values
    const req = createMockRequest('POST', {
      token: 'valid-reset-token',
      newPassword: '',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Empty password validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.message)

    // Verify that empty password is treated as missing password
    // Empty passwords should not be allowed for security reasons
    expect(response.status).toBe(400)
    expect(data.message).toBe('Token and new password are required')

    // Verify that auth service is not called for empty password
    // This prevents setting empty passwords which would compromise security
    expect(mockAuthApi.resetPassword).not.toHaveBeenCalled()

    console.log('[TEST] Empty password validation test completed successfully')
  })

  it('should handle auth service error with specific message', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing auth service error handling with specific error message')

    const errorMessage = 'Invalid or expired token'

    // Configure auth API to throw an error with specific message
    // This simulates scenarios where the auth service encounters token validation issues
    mockAuthApi.resetPassword.mockRejectedValue(new Error(errorMessage))

    // Create request with invalid token that should fail validation
    // This tests error handling for legitimate requests that fail due to invalid tokens
    const req = createMockRequest('POST', {
      token: 'invalid-token',
      newPassword: 'newSecurePassword123',
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
    expect(mockAuthApi.resetPassword).toHaveBeenCalledWith({
      body: {
        token: 'invalid-token',
        newPassword: 'newSecurePassword123',
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
    mockAuthApi.resetPassword.mockRejectedValue('Unknown service error')

    // Create a valid request that should succeed under normal circumstances
    // This tests that even valid requests are handled gracefully when services fail
    const req = createMockRequest('POST', {
      token: 'valid-reset-token',
      newPassword: 'newSecurePassword123',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Unknown error response status: ${response.status}`)
    console.log(`[TEST] Generic error message:`, data.message)

    // Verify that unexpected errors are handled gracefully
    // The API should return a generic user-friendly error message
    expect(response.status).toBe(500)
    expect(data.message).toBe(
      'Failed to reset password. Please try again or request a new reset link.'
    )

    // Verify that the auth API was called with correct parameters
    // Even failed requests should attempt to call the auth service properly
    expect(mockAuthApi.resetPassword).toHaveBeenCalledWith({
      body: {
        token: 'valid-reset-token',
        newPassword: 'newSecurePassword123',
      },
      method: 'POST',
    })

    console.log('[TEST] Unknown error handling test completed successfully')
  })
})
