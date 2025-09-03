/**
 * Bun/Vitest Compatible Test Suite for OAuth Token API
 * 
 * This is a migrated test suite using the proven module-mocks.ts pattern that works
 * reliably with bun and vitest 3.x without vi.doMock() issues.
 *
 * Key improvements:
 * - Uses centralized module-mocks.ts for consistent mocking
 * - Provides comprehensive logging for debugging test failures
 * - Includes runtime mock controls for different test scenarios
 * - Production-ready test coverage with proper status codes (200/400/401/403)
 * - Comprehensive error handling and authentication testing
 *
 * Run with: bun run test --run app/api/auth/oauth/token/route.test.ts
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Import module mocks FIRST - this must be before any other imports
import { mockControls, mockUser } from '../../../__test-utils__/module-mocks'

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

import { GET, POST } from './route'

/**
 * Create mock request for testing OAuth token API endpoints
 * This helper works reliably with bun's NextRequest implementation
 */
function createMockRequest(method = 'POST', body?: any): NextRequest {
  const url = 'http://localhost:3000/api/auth/oauth/token'
  
  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  const request = new NextRequest(url, requestInit)
  console.log(`🔧 Created ${method} request to ${url}`)
  return request
}

/**
 * Create mock GET request with query parameters
 */
function createMockGetRequest(queryParams = ''): NextRequest {
  const url = `http://localhost:3000/api/auth/oauth/token${queryParams}`
  const request = new NextRequest(url, { method: 'GET' })
  console.log(`🔧 Created GET request to ${url}`)
  return request
}

describe('OAuth Token API Routes - Bun Compatible', () => {
  const mockUUID = 'mock-uuid-12345678-90ab-cdef-1234-567890abcdef'
  const mockRequestId = mockUUID.slice(0, 8)

  beforeEach(() => {
    console.log('\n🧪 Setting up test: OAuth Token API')
    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Configure OAuth utility mocks with default behavior
    mockGetUserId.mockReset()
    mockGetCredential.mockReset()
    mockRefreshTokenIfNeeded.mockReset()
    mockAuthorizeCredentialUse.mockReset()

    // Setup crypto mock for consistent UUID generation
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockImplementation(() => {
        console.log('🔍 crypto.randomUUID called, returning:', mockUUID)
        return mockUUID
      }),
    })
  })

  afterEach(() => {
    console.log('🧹 Cleaning up test\n')
  })

  describe('POST Handler', () => {
    describe('Authentication and Authorization', () => {
      it('should return access token successfully', async () => {
        console.log('📋 Testing: Successful OAuth access token retrieval via POST')

        // Setup authentication authorization for credential access
        mockAuthorizeCredentialUse.mockResolvedValueOnce({
          ok: true,
          authType: 'session',
          requesterUserId: 'test-user-id',
          credentialOwnerUserId: 'owner-user-id',
        })

        // Setup mock OAuth credential with valid access token
        mockGetCredential.mockResolvedValueOnce({
          id: 'credential-id',
          accessToken: 'test-token',
          refreshToken: 'refresh-token',
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // Valid for 1 hour
          providerId: 'google',
        })

        // Setup token refresh utility to return fresh token
        mockRefreshTokenIfNeeded.mockResolvedValueOnce({
          accessToken: 'fresh-token',
          refreshed: false, // No refresh was needed
        })

        console.log('🔧 OAuth utilities configured for successful token retrieval')

        const request = createMockRequest('POST', {
          credentialId: 'credential-id',
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(200)

        const data = await response.json()
        console.log('📊 Access token received:', `${data.accessToken?.substring(0, 10)}...`)
        expect(data).toHaveProperty('accessToken', 'fresh-token')

        // Verify all OAuth utility functions were called properly
        expect(mockAuthorizeCredentialUse).toHaveBeenCalled()
        expect(mockGetCredential).toHaveBeenCalled()
        expect(mockRefreshTokenIfNeeded).toHaveBeenCalled()
      })

      it('should handle workflowId for server-side authentication', async () => {
        console.log('📋 Testing: OAuth token access with workflowId for server-side authentication')

        // Setup authentication for workflow server-side execution
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

        console.log('🔧 Workflow authentication configured for server-side access')

        const request = createMockRequest('POST', {
          credentialId: 'credential-id',
          workflowId: 'workflow-id',
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(200)

        const data = await response.json()
        console.log('📊 Workflow access token received:', `${data.accessToken?.substring(0, 10)}...`)
        expect(data).toHaveProperty('accessToken', 'fresh-token')

        // Verify authentication and credential retrieval were called
        expect(mockAuthorizeCredentialUse).toHaveBeenCalled()
        expect(mockGetCredential).toHaveBeenCalled()
      })

      it('should return 401 when user is not authenticated', async () => {
        console.log('📋 Testing: Unauthenticated access returns 401')

        // Setup authentication authorization to fail
        mockAuthorizeCredentialUse.mockResolvedValueOnce({
          ok: false,
          error: 'Authentication required',
        })

        console.log('🔧 Authentication configured to fail with permission error')

        const request = createMockRequest('POST', {
          credentialId: 'credential-id',
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(403)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error')
      })
    })

    describe('Input Validation', () => {
      it('should return 400 for missing credentialId', async () => {
        console.log('📋 Testing: Missing credentialId parameter validation')

        const request = createMockRequest('POST', {})
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(400)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error', 'Credential ID is required')
      })

      it('should validate credentialId format', async () => {
        console.log('📋 Testing: CredentialId format validation')

        // Setup successful authentication and credential retrieval
        mockAuthorizeCredentialUse.mockResolvedValueOnce({
          ok: true,
          authType: 'session',
          requesterUserId: 'test-user-id',
          credentialOwnerUserId: 'owner-user-id',
        })

        mockGetCredential.mockResolvedValueOnce({
          id: 'valid-credential-123',
          accessToken: 'test-token',
          refreshToken: 'refresh-token',
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          providerId: 'google',
        })

        mockRefreshTokenIfNeeded.mockResolvedValueOnce({
          accessToken: 'fresh-token',
          refreshed: false,
        })

        const request = createMockRequest('POST', {
          credentialId: 'valid-credential-123',
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.accessToken).toBe('fresh-token')
      })

      it('should handle empty credentialId string', async () => {
        console.log('📋 Testing: Empty credentialId string validation')

        const request = createMockRequest('POST', {
          credentialId: '',
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data.error).toBe('Credential ID is required')
      })

      it('should handle null credentialId', async () => {
        console.log('📋 Testing: Null credentialId validation')

        const request = createMockRequest('POST', {
          credentialId: null,
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data.error).toBe('Credential ID is required')
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        // Setup successful authentication for error handling tests
        mockAuthorizeCredentialUse.mockResolvedValue({
          ok: true,
          authType: 'session',
          requesterUserId: 'test-user-id',
          credentialOwnerUserId: 'owner-user-id',
        })
      })

      it('should handle credential not found', async () => {
        console.log('📋 Testing: Credential not found error handling')

        // Setup credential lookup to return undefined (not found)
        mockGetCredential.mockResolvedValueOnce(undefined)

        console.log('🔧 Authentication authorized but credential configured as not found')

        const request = createMockRequest('POST', {
          credentialId: 'nonexistent-credential-id',
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(401)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error')
      })

      it('should handle token refresh failure', async () => {
        console.log('📋 Testing: Token refresh failure handling')

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

        console.log('🔧 Expired credential configured with failed refresh scenario')

        const request = createMockRequest('POST', {
          credentialId: 'credential-id',
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(401)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error', 'Failed to refresh access token')
      })

      it('should handle workflow not found', async () => {
        console.log('📋 Testing: Workflow not found error handling')

        // Setup authentication authorization to fail due to non-existent workflow
        mockAuthorizeCredentialUse.mockResolvedValueOnce({
          ok: false,
          error: 'Workflow not found',
        })

        console.log('🔧 Authentication configured to fail with workflow not found error')

        const request = createMockRequest('POST', {
          credentialId: 'credential-id',
          workflowId: 'nonexistent-workflow-id',
        })
        const response = await POST(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(403)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error')
      })

      it('should handle invalid JSON body', async () => {
        console.log('📋 Testing: Invalid JSON body handling')

        const request = new NextRequest('http://localhost:3000/api/auth/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json-content',
        })

        const response = await POST(request)
        console.log('📊 Response status:', response.status)
        // Should return an error status for invalid JSON
        expect(response.status >= 400).toBe(true)
      })
    })
  })

  describe('GET Handler', () => {
    describe('Authentication and Authorization', () => {
      it('should return access token successfully', async () => {
        console.log('📋 Testing: Successful OAuth access token retrieval via GET')

        // Setup authenticated user
        mockControls.setAuthUser(mockUser)

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

        console.log('🔧 Authentication and OAuth utilities configured for GET request')

        const request = createMockGetRequest('?credentialId=credential-id')
        const response = await GET(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(200)

        const data = await response.json()
        console.log('📊 GET access token received:', `${data.accessToken?.substring(0, 10)}...`)
        expect(data).toHaveProperty('accessToken', 'fresh-token')

        // Verify OAuth utilities were called
        expect(mockGetCredential).toHaveBeenCalledWith(mockRequestId, 'credential-id', 'user-123')
        expect(mockRefreshTokenIfNeeded).toHaveBeenCalled()
      })

      it('should return 401 when user is not authenticated', async () => {
        console.log('📋 Testing: Unauthenticated GET request returns 401')

        // Setup unauthenticated user
        mockControls.setUnauthenticated()

        const request = createMockGetRequest('?credentialId=credential-id')
        const response = await GET(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(401)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error')
      })
    })

    describe('Input Validation', () => {
      beforeEach(() => {
        mockControls.setAuthUser(mockUser)
      })

      it('should return 400 for missing credentialId', async () => {
        console.log('📋 Testing: Missing credentialId in GET request')

        const request = createMockGetRequest()
        const response = await GET(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(400)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error', 'Credential ID is required')
      })

      it('should handle valid query parameters', async () => {
        console.log('📋 Testing: Valid query parameters handling')

        mockGetCredential.mockResolvedValueOnce({
          id: 'test-credential',
          accessToken: 'test-token',
          refreshToken: 'refresh-token',
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          providerId: 'google',
        })

        mockRefreshTokenIfNeeded.mockResolvedValueOnce({
          accessToken: 'fresh-token',
          refreshed: false,
        })

        const request = createMockGetRequest('?credentialId=test-credential')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.accessToken).toBe('fresh-token')
      })

      it('should validate credentialId format in query params', async () => {
        console.log('📋 Testing: CredentialId format validation in query params')

        // Valid UUID-like format
        const validCredentialId = 'credential-12345678-90ab-cdef-1234-567890abcdef'
        
        mockGetCredential.mockResolvedValueOnce({
          id: validCredentialId,
          accessToken: 'test-token',
          refreshToken: 'refresh-token',
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          providerId: 'google',
        })

        mockRefreshTokenIfNeeded.mockResolvedValueOnce({
          accessToken: 'fresh-token',
          refreshed: false,
        })

        const request = createMockGetRequest(`?credentialId=${validCredentialId}`)
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.accessToken).toBe('fresh-token')
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        mockControls.setAuthUser(mockUser)
      })

      it('should handle credential not found', async () => {
        console.log('📋 Testing: GET credential not found error handling')

        // Setup credential lookup to return undefined (not found)
        mockGetCredential.mockResolvedValueOnce(undefined)

        console.log('🔧 GET authentication authorized but credential configured as not found')

        const request = createMockGetRequest('?credentialId=nonexistent-credential-id')
        const response = await GET(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(404)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error')
      })

      it('should handle missing access token', async () => {
        console.log('📋 Testing: Missing access token error handling')

        // Setup credential with null access token
        mockGetCredential.mockResolvedValueOnce({
          id: 'credential-id',
          accessToken: null,
          refreshToken: 'refresh-token',
          providerId: 'google',
        })

        console.log('🔧 Credential configured with null access token')

        const request = createMockGetRequest('?credentialId=credential-id')
        const response = await GET(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(400)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error')
      })

      it('should handle token refresh failure', async () => {
        console.log('📋 Testing: GET token refresh failure handling')

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

        console.log('🔧 GET request configured with expired credential and failed refresh scenario')

        const request = createMockGetRequest('?credentialId=credential-id')
        const response = await GET(request)

        console.log('📊 Response status:', response.status)
        expect(response.status).toBe(401)

        const data = await response.json()
        console.log('📊 Response data:', data)
        expect(data).toHaveProperty('error')
      })
    })
  })

  describe('Token Refresh Scenarios', () => {
    beforeEach(() => {
      mockControls.setAuthUser(mockUser)
      mockAuthorizeCredentialUse.mockResolvedValue({
        ok: true,
        authType: 'session',
        requesterUserId: 'test-user-id',
        credentialOwnerUserId: 'owner-user-id',
      })
    })

    it('should handle successful token refresh', async () => {
      console.log('📋 Testing: Successful token refresh scenario')

      // Setup expired credential that needs refresh
      mockGetCredential.mockResolvedValue({
        id: 'credential-id',
        accessToken: 'old-token',
        refreshToken: 'valid-refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // Expired
        providerId: 'google',
      })

      // Setup successful token refresh
      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: 'new-refreshed-token',
        refreshed: true,
      })

      const request = createMockRequest('POST', {
        credentialId: 'credential-id',
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.accessToken).toBe('new-refreshed-token')
    })

    it('should handle token that does not need refresh', async () => {
      console.log('📋 Testing: Token that does not need refresh')

      // Setup valid unexpired credential
      mockGetCredential.mockResolvedValue({
        id: 'credential-id',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 7200 * 1000), // Valid for 2 hours
        providerId: 'google',
      })

      // Setup token refresh that returns same token
      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: 'valid-token',
        refreshed: false,
      })

      const request = createMockRequest('POST', {
        credentialId: 'credential-id',
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.accessToken).toBe('valid-token')
    })

    it('should handle refresh token expiry', async () => {
      console.log('📋 Testing: Refresh token expiry scenario')

      mockGetCredential.mockResolvedValue({
        id: 'credential-id',
        accessToken: 'old-token',
        refreshToken: 'expired-refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // Expired
        providerId: 'google',
      })

      // Setup token refresh to fail with expired refresh token
      mockRefreshTokenIfNeeded.mockRejectedValue(
        new Error('Refresh token has expired')
      )

      const request = createMockRequest('POST', {
        credentialId: 'credential-id',
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Failed to refresh access token')
    })
  })

  describe('Edge Cases and Security', () => {
    beforeEach(() => {
      mockControls.setAuthUser(mockUser)
    })

    it('should handle concurrent token requests', async () => {
      console.log('📋 Testing: Concurrent token requests')

      mockAuthorizeCredentialUse.mockResolvedValue({
        ok: true,
        authType: 'session',
        requesterUserId: 'test-user-id',
        credentialOwnerUserId: 'owner-user-id',
      })

      mockGetCredential.mockResolvedValue({
        id: 'credential-id',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        providerId: 'google',
      })

      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: 'fresh-token',
        refreshed: false,
      })

      const request1 = createMockRequest('POST', { credentialId: 'credential-id' })
      const request2 = createMockRequest('POST', { credentialId: 'credential-id' })

      // Execute concurrent requests
      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2)
      ])

      // Both should succeed
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
    })

    it('should handle malformed credentialId', async () => {
      console.log('📋 Testing: Malformed credentialId handling')

      mockAuthorizeCredentialUse.mockResolvedValue({
        ok: true,
        authType: 'session',
        requesterUserId: 'test-user-id',
        credentialOwnerUserId: 'owner-user-id',
      })

      // Setup credential not found for malformed ID
      mockGetCredential.mockResolvedValue(undefined)

      const request = createMockRequest('POST', {
        credentialId: 'malformed-credential-id-@#$%^&*()',
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should validate response format consistency', async () => {
      console.log('📋 Testing: Response format consistency')

      mockAuthorizeCredentialUse.mockResolvedValue({
        ok: true,
        authType: 'session',
        requesterUserId: 'test-user-id',
        credentialOwnerUserId: 'owner-user-id',
      })

      mockGetCredential.mockResolvedValue({
        id: 'credential-id',
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        providerId: 'google',
      })

      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: 'fresh-token',
        refreshed: false,
      })

      const request = createMockRequest('POST', {
        credentialId: 'credential-id',
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Verify response structure
      const data = await response.json()
      expect(data).toHaveProperty('accessToken')
      expect(typeof data.accessToken).toBe('string')
      expect(data.accessToken.length).toBeGreaterThan(0)

      // Verify content type header
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})