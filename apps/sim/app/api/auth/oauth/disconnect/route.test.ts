/**
 * Comprehensive Test Suite for OAuth Disconnect API - Bun/Vitest Compatible
 * Tests OAuth provider disconnection including authentication, validation, and error handling
 * Covers successful disconnections, validation failures, and service error scenarios
 *
 * This test suite uses the new module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Import enhanced test utilities with bun/vitest compatibility
import {
  createEnhancedMockRequest,
  enhancedMockUser,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'
// Import module-level mocks for reliable auth and database mocking
import '@/app/api/__test-utils__/module-mocks'

describe('OAuth Disconnect API Route', () => {
  let mocks: any
  let POST: any
  const mockUUID = 'mock-uuid-12345678-90ab-cdef-1234-567890abcdef'

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing enhanced test mocks for OAuth disconnect API')

    // Setup comprehensive test infrastructure with authenticated user
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: enhancedMockUser },
      database: {
        select: {
          results: [[]], // Default empty results, will be overridden per test
        },
      },
    })

    // Setup crypto mock for consistent UUID generation
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockImplementation(() => {
        console.log('[CRYPTO] randomUUID called, returning:', mockUUID)
        return mockUUID
      }),
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
    console.log('[CLEANUP] Test cleanup completed')
  })

  it('should disconnect provider successfully', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing successful OAuth provider disconnection')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Configure database to simulate successful deletion
    // This represents the successful removal of OAuth credentials from database
    mocks.database.setDeleteResults([{ id: 'credential-123' }])

    console.log('[TEST] Database configured for successful provider disconnection')

    // Create request to disconnect Google OAuth provider
    const req = createEnhancedMockRequest('POST', {
      provider: 'google',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] OAuth disconnect response status: ${response.status}`)
    console.log(`[TEST] Disconnect success:`, data.success)

    // Verify successful provider disconnection
    // The API should return 200 OK with success confirmation
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    console.log('[TEST] OAuth provider disconnection test completed successfully')
  })

  it('should disconnect specific provider ID successfully', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing specific OAuth provider ID disconnection')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Configure database to simulate successful deletion of specific provider ID
    // This represents removing a specific OAuth credential (e.g., google-email vs google-default)
    mocks.database.setDeleteResults([{ id: 'credential-google-email' }])

    console.log('[TEST] Database configured for specific provider ID disconnection')

    // Create request to disconnect specific Google OAuth provider ID
    // This allows users to disconnect specific OAuth scopes while keeping others
    const req = createEnhancedMockRequest('POST', {
      provider: 'google',
      providerId: 'google-email',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Specific provider disconnect response status: ${response.status}`)
    console.log(`[TEST] Disconnect success:`, data.success)

    // Verify successful specific provider ID disconnection
    // The API should handle granular provider disconnection
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    console.log('[TEST] Specific provider ID disconnection test completed successfully')
  })

  it('should handle unauthenticated user', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing unauthenticated user access to OAuth disconnect')

    // Set user as unauthenticated for this test
    // This simulates a user who is not logged in attempting to disconnect OAuth providers
    mocks.auth.setUnauthenticated()

    // Create request attempting to disconnect OAuth provider without authentication
    const req = createEnhancedMockRequest('POST', {
      provider: 'google',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Unauthenticated disconnect response status: ${response.status}`)
    console.log(`[TEST] Error message:`, data.error)

    // Verify that unauthenticated access is properly rejected
    // OAuth management requires authentication for security reasons
    expect(response.status).toBe(401)
    expect(data.error).toBe('User not authenticated')

    console.log('[TEST] Unauthenticated user handling test completed successfully')
  })

  it('should handle missing provider', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when provider parameter is missing')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Create request without provider parameter
    // This tests the API's input validation for required parameters
    const req = createEnhancedMockRequest('POST', {})

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Missing provider validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.error)

    // Verify that proper validation error is returned
    // Provider parameter is required to know which OAuth connection to disconnect
    expect(response.status).toBe(400)
    expect(data.error).toBe('Provider is required')

    console.log('[TEST] Missing provider parameter test completed successfully')
  })

  it('should handle database error', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing database error handling in OAuth disconnect API')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Configure database mock to simulate a deletion error
    // This tests the API's resilience against infrastructure failures during disconnection
    const databaseError = new Error('Database deletion failed')

    // Override the database mock to throw an error during delete operation
    // This simulates real-world scenarios where database operations might fail
    vi.doMock('@/db', () => ({
      db: {
        delete: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockRejectedValue(databaseError),
        })),
      },
    }))

    console.log('[TEST] Database configured to throw error:', databaseError.message)

    // Create valid request that should succeed under normal circumstances
    const req = createEnhancedMockRequest('POST', {
      provider: 'google',
    })

    // Execute the API endpoint and capture response
    const response = await POST(req)
    const data = await response.json()

    console.log(`[TEST] Database error response status: ${response.status}`)
    console.log(`[TEST] Error message:`, data.error)

    // Verify that database errors are handled gracefully
    // The API should return 500 Internal Server Error with appropriate message
    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')

    console.log('[TEST] Database error handling test completed successfully')
  })
})
