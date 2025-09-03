/**
 * Comprehensive Test Suite for OAuth Token API - Bun/Vitest Compatible
 * Tests OAuth token management including access token retrieval, refresh, and error handling
 * Covers successful requests, validation failures, authentication errors, and service error scenarios
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

// Note: Using custom module-level mocks instead of shared module-mocks to avoid conflicts

// Mock OAuth utilities at module level
const mockGetUserId = vi.fn()
const mockGetCredential = vi.fn()
const mockRefreshTokenIfNeeded = vi.fn()
vi.mock('@/app/api/auth/oauth/utils', () => ({
  getUserId: mockGetUserId,
  getCredential: mockGetCredential,
  refreshTokenIfNeeded: mockRefreshTokenIfNeeded,
}))

// Mock auth credential access at module level
const mockAuthorizeCredentialUse = vi.fn()
vi.mock('@/lib/auth/credential-access', () => ({
  authorizeCredentialUse: mockAuthorizeCredentialUse,
}))

// Mock hybrid auth at module level
const mockCheckHybridAuth = vi.fn()
vi.mock('@/lib/auth/hybrid', () => ({
  checkHybridAuth: mockCheckHybridAuth,
}))

describe('OAuth Token API Routes', () => {
  let mocks: any
  let GET: any
  let POST: any

  const mockUUID = 'mock-uuid-12345678-90ab-cdef-1234-567890abcdef'
  const mockRequestId = mockUUID.slice(0, 8)

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing enhanced test mocks for OAuth token API')

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
    mockGetUserId.mockReset()
    mockGetCredential.mockReset()
    mockRefreshTokenIfNeeded.mockReset()

    // Configure auth utility mocks with default behavior
    mockAuthorizeCredentialUse.mockReset()
    mockCheckHybridAuth.mockReset()

    console.log('[SETUP] Enhanced test infrastructure initialized successfully')

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
    mocks?.cleanup()

    // Reset all module-level OAuth utility mocks
    mockGetUserId.mockReset()
    mockGetCredential.mockReset()
    mockRefreshTokenIfNeeded.mockReset()
    mockAuthorizeCredentialUse.mockReset()
    mockCheckHybridAuth.mockReset()

    console.log('[CLEANUP] Test cleanup completed')
  })

  /**
   * POST route tests
   */
  describe('POST handler', () => {
    it('should return access token successfully', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing successful OAuth access token retrieval via POST')

      // Setup authentication authorization for credential access
      // This simulates successful authorization of the user to access the OAuth credential
      mockAuthorizeCredentialUse.mockResolvedValueOnce({
        ok: true,
        authType: 'session',
        requesterUserId: 'test-user-id',
        credentialOwnerUserId: 'owner-user-id',
      })

      // Setup mock OAuth credential with valid access token
      // This represents a stored OAuth credential with unexpired access token
      mockGetCredential.mockResolvedValueOnce({
        id: 'credential-id',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // Valid for 1 hour
        providerId: 'google',
      })

      // Setup token refresh utility to return fresh token
      // This handles automatic token refresh if needed
      mockRefreshTokenIfNeeded.mockResolvedValueOnce({
        accessToken: 'fresh-token',
        refreshed: false, // No refresh was needed
      })

      console.log('[TEST] OAuth utilities configured for successful token retrieval')

      // Create POST request with credential ID
      const req = createEnhancedMockRequest('POST', {
        credentialId: 'credential-id',
      })

      // Execute the API endpoint and capture response
      const response = await POST(req)
      const data = await response.json()

      console.log(`[TEST] OAuth token POST response status: ${response.status}`)
      console.log(`[TEST] Access token received:`, `${data.accessToken?.substring(0, 10)}...`)

      // Verify successful token retrieval
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('accessToken', 'fresh-token')

      // Verify all OAuth utility functions were called properly
      expect(mockAuthorizeCredentialUse).toHaveBeenCalled()
      expect(mockGetCredential).toHaveBeenCalled()
      expect(mockRefreshTokenIfNeeded).toHaveBeenCalled()

      console.log('[TEST] OAuth token retrieval POST test completed successfully')
    })

    it('should handle workflowId for server-side authentication', async () => {
      // Log test execution for debugging and future developer understanding
      console.log(
        '[TEST] Testing OAuth token access with workflowId for server-side authentication'
      )

      // Setup authentication for workflow server-side execution
      // This simulates a workflow running server-side and accessing OAuth credentials
      mockAuthorizeCredentialUse.mockResolvedValueOnce({
        ok: true,
        authType: 'internal_jwt', // Server-side JWT authentication
        requesterUserId: 'workflow-owner-id',
        credentialOwnerUserId: 'workflow-owner-id',
      })

      // Setup mock OAuth credential for workflow access
      mockGetCredential.mockResolvedValueOnce({
        id: 'credential-id',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        providerId: 'google',
      })

      // Setup token refresh utility
      mockRefreshTokenIfNeeded.mockResolvedValueOnce({
        accessToken: 'fresh-token',
        refreshed: false,
      })

      console.log('[TEST] Workflow authentication configured for server-side access')

      // Create POST request with both credential ID and workflow ID
      // This enables server-side workflow authentication
      const req = createEnhancedMockRequest('POST', {
        credentialId: 'credential-id',
        workflowId: 'workflow-id',
      })

      // Execute the API endpoint and capture response
      const response = await POST(req)
      const data = await response.json()

      console.log(`[TEST] Workflow token access response status: ${response.status}`)
      console.log(
        `[TEST] Workflow access token received:`,
        `${data.accessToken?.substring(0, 10)}...`
      )

      // Verify successful workflow token access
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('accessToken', 'fresh-token')

      // Verify authentication and credential retrieval were called
      expect(mockAuthorizeCredentialUse).toHaveBeenCalled()
      expect(mockGetCredential).toHaveBeenCalled()

      console.log('[TEST] Workflow server-side authentication test completed successfully')
    })

    it('should handle missing credentialId', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing validation error when credentialId is missing from POST request')

      // Create POST request without credential ID
      // This tests the API's input validation for required parameters
      const req = createEnhancedMockRequest('POST', {})

      // Execute the API endpoint and capture response
      const response = await POST(req)
      const data = await response.json()

      console.log(`[TEST] Missing credentialId validation response status: ${response.status}`)
      console.log(`[TEST] Validation error message:`, data.error)

      // Verify that proper validation error is returned
      // Credential ID is required to identify which OAuth token to retrieve
      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Credential ID is required')

      console.log('[TEST] Missing credentialId validation test completed successfully')
    })

    it('should handle authentication failure', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing authentication failure in OAuth token POST request')

      // Setup authentication authorization to fail
      // This simulates a user who doesn't have permission to access the credential
      mockAuthorizeCredentialUse.mockResolvedValueOnce({
        ok: false,
        error: 'Authentication required',
      })

      console.log('[TEST] Authentication configured to fail with permission error')

      // Create POST request with credential ID but insufficient permissions
      const req = createEnhancedMockRequest('POST', {
        credentialId: 'credential-id',
      })

      // Execute the API endpoint and capture response
      const response = await POST(req)
      const data = await response.json()

      console.log(`[TEST] Authentication failure response status: ${response.status}`)
      console.log(`[TEST] Authentication error:`, data.error)

      // Verify that authentication failure is properly handled
      // The API should return 403 Forbidden for unauthorized access
      expect(response.status).toBe(403)
      expect(data).toHaveProperty('error')

      console.log('[TEST] Authentication failure handling test completed successfully')
    })

    it('should handle workflow not found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing workflow not found error in OAuth token POST request')

      // Setup authentication authorization to fail due to non-existent workflow
      // This simulates a request with an invalid or deleted workflow ID
      mockAuthorizeCredentialUse.mockResolvedValueOnce({
        ok: false,
        error: 'Workflow not found',
      })

      console.log('[TEST] Authentication configured to fail with workflow not found error')

      // Create POST request with non-existent workflow ID
      const req = createEnhancedMockRequest('POST', {
        credentialId: 'credential-id',
        workflowId: 'nonexistent-workflow-id',
      })

      // Execute the API endpoint and capture response
      const response = await POST(req)
      const data = await response.json()

      console.log(`[TEST] Workflow not found response status: ${response.status}`)
      console.log(`[TEST] Workflow error:`, data.error)

      // Verify that workflow not found is properly handled
      // The API should return 403 Forbidden for invalid workflow access
      expect(response.status).toBe(403)

      console.log('[TEST] Workflow not found handling test completed successfully')
    })

    it('should handle credential not found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing credential not found error in OAuth token POST request')

      // Setup authentication to succeed but credential lookup to fail
      // This simulates authorized access to a non-existent credential
      mockAuthorizeCredentialUse.mockResolvedValueOnce({
        ok: true,
        authType: 'session',
        requesterUserId: 'test-user-id',
        credentialOwnerUserId: 'owner-user-id',
      })

      // Setup credential lookup to return undefined (not found)
      mockGetCredential.mockResolvedValueOnce(undefined)

      console.log('[TEST] Authentication authorized but credential configured as not found')

      // Create POST request with non-existent credential ID
      const req = createEnhancedMockRequest('POST', {
        credentialId: 'nonexistent-credential-id',
      })

      // Execute the API endpoint and capture response
      const response = await POST(req)
      const data = await response.json()

      console.log(`[TEST] Credential not found response status: ${response.status}`)
      console.log(`[TEST] Credential error:`, data.error)

      // Verify that credential not found is properly handled
      // The API should return 401 Unauthorized for missing credentials
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')

      console.log('[TEST] Credential not found handling test completed successfully')
    })

    it('should handle token refresh failure', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing token refresh failure in OAuth token POST request')

      // Setup successful authentication
      mockAuthorizeCredentialUse.mockResolvedValueOnce({
        ok: true,
        authType: 'session',
        requesterUserId: 'test-user-id',
        credentialOwnerUserId: 'owner-user-id',
      })

      // Setup expired OAuth credential requiring refresh
      // This simulates a stored credential with an expired access token
      mockGetCredential.mockResolvedValueOnce({
        id: 'credential-id',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
        providerId: 'google',
      })

      // Setup token refresh to fail
      // This simulates OAuth provider rejecting the refresh token
      mockRefreshTokenIfNeeded.mockRejectedValueOnce(new Error('Refresh failure'))

      console.log('[TEST] Expired credential configured with failed refresh scenario')

      // Create POST request for expired credential
      const req = createEnhancedMockRequest('POST', {
        credentialId: 'credential-id',
      })

      // Execute the API endpoint and capture response
      const response = await POST(req)
      const data = await response.json()

      console.log(`[TEST] Token refresh failure response status: ${response.status}`)
      console.log(`[TEST] Refresh error:`, data.error)

      // Verify that token refresh failure is properly handled
      // The API should return 401 Unauthorized when token refresh fails
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Failed to refresh access token')

      console.log('[TEST] Token refresh failure handling test completed successfully')
    })
  })

  /**
   * GET route tests
   */
  describe('GET handler', () => {
    it('should return access token successfully', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing successful OAuth access token retrieval via GET')

      // Setup hybrid authentication for GET request
      // This handles both session-based and API key-based authentication
      mockCheckHybridAuth.mockResolvedValueOnce({
        success: true,
        authType: 'session',
        userId: 'test-user-id',
      })

      // Setup mock OAuth credential with valid access token
      mockGetCredential.mockResolvedValueOnce({
        id: 'credential-id',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        providerId: 'google',
      })

      // Setup token refresh utility
      mockRefreshTokenIfNeeded.mockResolvedValueOnce({
        accessToken: 'fresh-token',
        refreshed: false,
      })

      console.log('[TEST] Hybrid auth and OAuth utilities configured for GET request')

      // Create GET request with credential ID as query parameter
      const req = new Request(
        'http://localhost:3000/api/auth/oauth/token?credentialId=credential-id'
      )

      // Execute the API endpoint and capture response
      const response = await GET(req as any)
      const data = await response.json()

      console.log(`[TEST] OAuth token GET response status: ${response.status}`)
      console.log(`[TEST] GET access token received:`, `${data.accessToken?.substring(0, 10)}...`)

      // Verify successful token retrieval via GET
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('accessToken', 'fresh-token')

      // Verify all authentication and OAuth utilities were called
      expect(mockCheckHybridAuth).toHaveBeenCalled()
      expect(mockGetCredential).toHaveBeenCalledWith(mockRequestId, 'credential-id', 'test-user-id')
      expect(mockRefreshTokenIfNeeded).toHaveBeenCalled()

      console.log('[TEST] OAuth token retrieval GET test completed successfully')
    })

    it('should handle missing credentialId', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing validation error when credentialId is missing from GET request')

      // Create GET request without credential ID query parameter
      // This tests the API's input validation for required query parameters
      const req = new Request('http://localhost:3000/api/auth/oauth/token')

      // Execute the API endpoint and capture response
      const response = await GET(req as any)
      const data = await response.json()

      console.log(`[TEST] Missing credentialId GET validation response status: ${response.status}`)
      console.log(`[TEST] GET validation error message:`, data.error)

      // Verify that proper validation error is returned
      // Credential ID is required in query parameters for GET requests
      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Credential ID is required')

      console.log('[TEST] Missing credentialId GET validation test completed successfully')
    })

    it('should handle authentication failure', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing authentication failure in OAuth token GET request')

      // Setup hybrid authentication to fail
      // This simulates a request without proper session or API key authentication
      mockCheckHybridAuth.mockResolvedValueOnce({
        success: false,
        error: 'Authentication required',
      })

      console.log('[TEST] Hybrid authentication configured to fail')

      // Create GET request with credential ID but no authentication
      const req = new Request(
        'http://localhost:3000/api/auth/oauth/token?credentialId=credential-id'
      )

      // Execute the API endpoint and capture response
      const response = await GET(req as any)
      const data = await response.json()

      console.log(`[TEST] GET authentication failure response status: ${response.status}`)
      console.log(`[TEST] GET authentication error:`, data.error)

      // Verify that authentication failure is properly handled
      // The API should return 401 Unauthorized for unauthenticated GET requests
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')

      console.log('[TEST] GET authentication failure handling test completed successfully')
    })

    it('should handle credential not found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing credential not found error in OAuth token GET request')

      // Setup successful authentication
      mockCheckHybridAuth.mockResolvedValueOnce({
        success: true,
        authType: 'session',
        userId: 'test-user-id',
      })

      // Setup credential lookup to return undefined (not found)
      mockGetCredential.mockResolvedValueOnce(undefined)

      console.log('[TEST] GET authentication authorized but credential configured as not found')

      // Create GET request with non-existent credential ID
      const req = new Request(
        'http://localhost:3000/api/auth/oauth/token?credentialId=nonexistent-credential-id'
      )

      // Execute the API endpoint and capture response
      const response = await GET(req as any)
      const data = await response.json()

      console.log(`[TEST] GET credential not found response status: ${response.status}`)
      console.log(`[TEST] GET credential error:`, data.error)

      // Verify that credential not found is properly handled
      // The API should return 404 Not Found for missing credentials in GET requests
      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error')

      console.log('[TEST] GET credential not found handling test completed successfully')
    })

    it('should handle missing access token', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing missing access token error in OAuth token GET request')

      // Setup successful authentication
      mockCheckHybridAuth.mockResolvedValueOnce({
        success: true,
        authType: 'session',
        userId: 'test-user-id',
      })

      // Setup credential with null access token
      // This simulates a credential that was stored but has no valid access token
      mockGetCredential.mockResolvedValueOnce({
        id: 'credential-id',
        accessToken: null,
        refreshToken: 'refresh-token',
        providerId: 'google',
      })

      console.log('[TEST] Credential configured with null access token')

      // Create GET request for credential without access token
      const req = new Request(
        'http://localhost:3000/api/auth/oauth/token?credentialId=credential-id'
      )

      // Execute the API endpoint and capture response
      const response = await GET(req as any)
      const data = await response.json()

      console.log(`[TEST] Missing access token response status: ${response.status}`)
      console.log(`[TEST] Missing token error:`, data.error)

      // Verify that missing access token is properly handled
      // The API should return 400 Bad Request when credential has no access token
      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')

      console.log('[TEST] Missing access token handling test completed successfully')
    })

    it('should handle token refresh failure', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing token refresh failure in OAuth token GET request')

      // Setup successful authentication
      mockCheckHybridAuth.mockResolvedValueOnce({
        success: true,
        authType: 'session',
        userId: 'test-user-id',
      })

      // Setup expired OAuth credential requiring refresh
      mockGetCredential.mockResolvedValueOnce({
        id: 'credential-id',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
        providerId: 'google',
      })

      // Setup token refresh to fail
      mockRefreshTokenIfNeeded.mockRejectedValueOnce(new Error('Refresh failure'))

      console.log(
        '[TEST] GET request configured with expired credential and failed refresh scenario'
      )

      // Create GET request for expired credential
      const req = new Request(
        'http://localhost:3000/api/auth/oauth/token?credentialId=credential-id'
      )

      // Execute the API endpoint and capture response
      const response = await GET(req as any)
      const data = await response.json()

      console.log(`[TEST] GET token refresh failure response status: ${response.status}`)
      console.log(`[TEST] GET refresh error:`, data.error)

      // Verify that token refresh failure is properly handled in GET requests
      // The API should return 401 Unauthorized when token refresh fails
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')

      console.log('[TEST] GET token refresh failure handling test completed successfully')
    })
  })
})
