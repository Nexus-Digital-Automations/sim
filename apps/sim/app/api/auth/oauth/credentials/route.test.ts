/**
 * Comprehensive Test Suite for OAuth Credentials API - Bun/Vitest Compatible
 * Tests OAuth credential management including retrieval, authentication, and error handling
 * Covers successful requests, validation failures, and service error scenarios
 *
 * This test suite uses the new module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Import enhanced test utilities with bun/vitest compatibility
import { enhancedMockUser, setupEnhancedTestMocks } from '@/app/api/__test-utils__/enhanced-utils'

// Note: Using custom module-level mocks instead of shared module-mocks to avoid conflicts

// Mock OAuth utility at module level
const mockParseProvider = vi.fn()
vi.mock('@/lib/oauth/oauth', () => ({
  parseProvider: mockParseProvider,
}))

// Mock hybrid authentication at module level
const mockCheckHybridAuth = vi.fn()
vi.mock('@/lib/auth/hybrid', () => ({
  checkHybridAuth: mockCheckHybridAuth,
}))

// Mock JWT decode at module level
const mockJwtDecode = vi.fn()
vi.mock('jwt-decode', () => ({
  jwtDecode: mockJwtDecode,
}))

describe('OAuth Credentials API Route', () => {
  let mocks: any
  let GET: any
  const mockUUID = 'mock-uuid-12345678-90ab-cdef-1234-567890abcdef'

  /**
   * Creates a mock request with query parameters for OAuth credential testing
   * @param method HTTP method for the request
   * @param queryParams Query string parameters to append to the URL
   * @returns NextRequest configured for OAuth credential API testing
   */
  function createMockRequestWithQuery(method = 'GET', queryParams = ''): NextRequest {
    const url = `http://localhost:3000/api/auth/oauth/credentials${queryParams}`
    console.log(`[REQUEST] Creating ${method} request to ${url}`)
    return new NextRequest(new URL(url), { method })
  }

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing enhanced test mocks for OAuth credentials API')

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

    // Configure OAuth utility mocks with default behavior
    mockParseProvider.mockReset()
    mockParseProvider.mockImplementation((provider: string) => {
      console.log('[OAUTH] parseProvider called with:', provider)
      return {
        baseProvider: provider.split('-')[0] || provider,
        featureType: provider.includes('-') ? provider.split('-')[1] : 'default',
      }
    })

    // Configure hybrid authentication mock with default successful auth
    mockCheckHybridAuth.mockReset()
    mockCheckHybridAuth.mockResolvedValue({
      success: true,
      userId: 'user-123',
      authType: 'session',
    })

    console.log('[SETUP] Enhanced test infrastructure initialized successfully')

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
    mocks?.cleanup()

    // Reset module-level mocks
    mockParseProvider.mockReset()
    mockCheckHybridAuth.mockReset()
    mockJwtDecode.mockReset()

    console.log('[CLEANUP] Test cleanup completed')
  })

  it('should return credentials successfully', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing successful OAuth credentials retrieval')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Define mock account credentials that should be returned
    // This simulates the database containing OAuth credentials for the authenticated user
    const mockAccounts = [
      {
        id: 'credential-1',
        userId: 'user-123',
        providerId: 'google-email',
        accountId: 'test@example.com',
        updatedAt: new Date('2024-01-01'),
        idToken: null,
      },
      {
        id: 'credential-2',
        userId: 'user-123',
        providerId: 'google-default',
        accountId: 'user-id',
        updatedAt: new Date('2024-01-02'),
        idToken: null,
      },
    ]

    // Configure database mock to return the OAuth credentials
    // First query returns the credentials, second query returns user email
    mocks.database.setSelectResults([
      mockAccounts, // OAuth credentials query result
      [{ email: 'user@example.com' }], // User email query result
    ])

    console.log('[TEST] Database configured with', mockAccounts.length, 'mock credentials')

    // Create request with provider query parameter
    const req = createMockRequestWithQuery('GET', '?provider=google-email')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] OAuth credentials response status: ${response.status}`)
    console.log(`[TEST] Returned`, data.credentials?.length || 0, 'credentials')

    // Verify successful response with correct credential structure
    expect(response.status).toBe(200)
    expect(data.credentials).toHaveLength(2)

    // Verify first credential details and structure
    expect(data.credentials[0]).toMatchObject({
      id: 'credential-1',
      provider: 'google-email',
      isDefault: false,
    })

    // Verify second credential is marked as default
    expect(data.credentials[1]).toMatchObject({
      id: 'credential-2',
      provider: 'google-default',
      isDefault: true,
    })

    console.log('[TEST] OAuth credentials retrieval test completed successfully')
  })

  it('should handle unauthenticated user', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing unauthenticated user access to OAuth credentials')

    // Set user as unauthenticated for this test
    // This simulates a user who is not logged in attempting to access credentials
    mocks.auth.setUnauthenticated()

    // Create request attempting to access OAuth credentials
    const req = createMockRequestWithQuery('GET', '?provider=google')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] Unauthenticated access response status: ${response.status}`)
    console.log(`[TEST] Error message:`, data.error)

    // Verify that unauthenticated access is properly rejected
    // The API should return 401 Unauthorized for unauthenticated requests
    expect(response.status).toBe(401)
    expect(data.error).toBe('User not authenticated')

    console.log('[TEST] Unauthenticated user handling test completed successfully')
  })

  it('should handle missing provider parameter', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing validation error when provider parameter is missing')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Create request without provider query parameter
    // This tests the API's input validation for required parameters
    const req = createMockRequestWithQuery('GET')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] Missing provider validation response status: ${response.status}`)
    console.log(`[TEST] Validation error message:`, data.error)

    // Verify that proper validation error is returned
    // The API should return 400 Bad Request for missing required parameters
    expect(response.status).toBe(400)
    expect(data.error).toBe('Provider or credentialId is required')

    console.log('[TEST] Missing provider parameter test completed successfully')
  })

  it('should handle no credentials found', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing response when no OAuth credentials are found')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Configure database to return empty results (no credentials found)
    // This simulates a user who hasn't connected any OAuth providers yet
    mocks.database.setSelectResults([[]])

    console.log('[TEST] Database configured to return no credentials')

    // Create request for provider that user hasn't connected
    const req = createMockRequestWithQuery('GET', '?provider=github')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] No credentials found response status: ${response.status}`)
    console.log(`[TEST] Credentials array length:`, data.credentials?.length || 0)

    // Verify that empty result is handled gracefully
    // The API should return 200 OK with an empty credentials array
    expect(response.status).toBe(200)
    expect(data.credentials).toHaveLength(0)

    console.log('[TEST] No credentials found test completed successfully')
  })

  it('should decode ID token for display name', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing ID token decoding for OAuth credential display names')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Define mock account with ID token for decoding
    // This simulates credentials that include JWT tokens with user information
    const mockAccounts = [
      {
        id: 'credential-1',
        userId: 'user-123',
        providerId: 'google-default',
        accountId: 'google-user-id',
        updatedAt: new Date('2024-01-01'),
        idToken: 'mock-jwt-token',
      },
    ]

    // Configure database to return the credential with ID token
    mocks.database.setSelectResults([mockAccounts])

    console.log('[TEST] Database configured with ID token credential')

    // Configure JWT decode functionality for token parsing
    // This simulates extracting user information from the OAuth provider's token
    mockJwtDecode.mockReturnValueOnce({
      email: 'decoded@example.com',
      name: 'Decoded User',
    })

    // Create request for Google provider credentials
    const req = createMockRequestWithQuery('GET', '?provider=google')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] ID token decode response status: ${response.status}`)
    console.log(`[TEST] Decoded credential name:`, data.credentials?.[0]?.name)

    // Verify that ID token was properly decoded and used for display name
    // The decoded email should be used as the credential display name
    expect(response.status).toBe(200)
    expect(data.credentials[0].name).toBe('decoded@example.com')

    console.log('[TEST] ID token decoding test completed successfully')
  })

  it('should handle database error', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing database error handling in OAuth credentials API')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Configure database mock to simulate a connection or query error
    // This tests the API's resilience against infrastructure failures
    const databaseError = new Error('Database connection failed')

    // Configure database mock to throw an error
    // This simulates real-world scenarios where database operations might fail
    mocks.database.throwError(databaseError)

    console.log('[TEST] Database configured to throw error:', databaseError.message)

    // Create valid request that should succeed under normal circumstances
    const req = createMockRequestWithQuery('GET', '?provider=google')

    // Execute the API endpoint and capture response
    const response = await GET(req)
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
