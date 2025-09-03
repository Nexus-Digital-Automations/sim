/**
 * Comprehensive Test Suite for OAuth Utilities - Bun/Vitest Compatible
 * Tests OAuth utility functions including user ID resolution, credential management, and token refresh
 * Covers successful operations, validation failures, and service error scenarios
 *
 * This test suite uses the new module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Create standalone enhanced test utilities to avoid conflicts
const enhancedMockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
}

// Create standalone mock setup function
const setupEnhancedTestMocks = (config: any) => {
  const authMock = {
    setAuthenticated: (user: any) => {
      mockGetSession.mockResolvedValue({ user })
      console.log('🔧 Auth set to authenticated for user:', user.id)
    },
    setUnauthenticated: () => {
      mockGetSession.mockResolvedValue(null)
      console.log('🔧 Auth set to unauthenticated')
    },
  }

  const databaseMock = {
    setSelectResults: (results: any[][]) => {
      let callCount = 0
      // Mock the Drizzle query chain for SELECT operations
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockImplementation(() => {
              const limitResult = results[callCount] || []
              callCount++
              console.log('🔧 Database select with limit returning:', limitResult.length, 'records')
              return Promise.resolve(limitResult)
            }),
            // Return promise for queries without limit
            then: (resolve: any) => {
              const result = results[callCount] || []
              callCount++
              console.log('🔧 Database select returning:', result.length, 'records')
              return resolve(result)
            },
          })),
        })),
      }))

      // Mock the Drizzle query chain for UPDATE operations
      mockDbUpdate.mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            console.log('🔧 Database update executed')
            return Promise.resolve({ success: true })
          }),
        })),
      }))
    },
    throwError: (error: Error) => {
      mockDbSelect.mockImplementation(() => {
        throw error
      })
    },
  }

  // Apply initial configuration
  if (config?.auth?.authenticated) {
    authMock.setAuthenticated(config.auth.user || enhancedMockUser)
  }

  if (config?.database?.select?.results) {
    databaseMock.setSelectResults(config.database.select.results)
  }

  return {
    auth: authMock,
    database: databaseMock,
    cleanup: () => {
      vi.clearAllMocks()
    },
  }
}

// Mock OAuth utility at module level
const mockRefreshOAuthToken = vi.fn()
vi.mock('@/lib/oauth/oauth', () => ({
  refreshOAuthToken: mockRefreshOAuthToken,
}))

// Mock auth session at module level
const mockGetSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  getSession: mockGetSession,
}))

// Mock database at module level with proper query builder
const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
  },
}))

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq-condition'),
  and: vi.fn((...args) => `and(${args.join(', ')})`),
}))

// Mock database schema
vi.mock('@/db/schema', () => ({
  account: {
    id: 'account.id',
    userId: 'account.userId',
    accessToken: 'account.accessToken',
    accessTokenExpiresAt: 'account.accessTokenExpiresAt',
  },
  workflow: {
    userId: 'workflow.userId',
    id: 'workflow.id',
  },
}))

// Mock logger
const mockLogger = {
  warn: vi.fn((...args) => console.log('[LOGGER WARN]', ...args)),
  error: vi.fn((...args) => console.log('[LOGGER ERROR]', ...args)),
  info: vi.fn((...args) => console.log('[LOGGER INFO]', ...args)),
}
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}))

describe('OAuth Utils', () => {
  let mocks: any

  // Mock OAuth-specific functionality
  const mockSession = { user: { id: 'test-user-id' } }

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing enhanced test mocks for OAuth utilities')

    // Setup comprehensive test infrastructure with authenticated user
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: enhancedMockUser },
      database: {
        select: {
          results: [[]], // Default empty results, will be overridden per test
        },
      },
    })

    // Configure all module-level mocks with default behavior
    mockRefreshOAuthToken.mockReset()
    mockGetSession.mockReset()
    mockDbSelect.mockReset()
    mockDbUpdate.mockReset()

    // Configure auth session mock with default user session
    mockGetSession.mockResolvedValue(mockSession)

    // Configure update operations for token refresh functionality
    mockDbUpdate.mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => {
          console.log('🔧 Database update executed')
          return Promise.resolve({ success: true })
        }),
      })),
    }))

    // Mock crypto.randomUUID for request IDs
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('mock-uuid-123456789012'),
    })

    console.log('[SETUP] Enhanced test infrastructure initialized successfully')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
    mocks?.cleanup()

    // Reset OAuth utility mocks
    mockRefreshOAuthToken.mockReset()
    mockGetSession.mockReset()
    mockDbSelect.mockReset()
    mockDbUpdate.mockReset()

    console.log('[CLEANUP] Test cleanup completed')
  })

  describe('getUserId', () => {
    it('should get user ID from session when no workflowId is provided', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing user ID retrieval from session for OAuth utilities')

      // Setup authenticated session with user ID
      // This simulates a standard user session authentication scenario
      console.log('[TEST] Session configured with user ID:', mockSession.user.id)

      // Import OAuth utilities after mocks are set up
      const { getUserId } = await import('@/app/api/auth/oauth/utils')

      // Execute user ID retrieval without workflow ID
      const userId = await getUserId('request-id')

      console.log('[TEST] Retrieved user ID from session:', userId)

      // Verify that user ID is correctly extracted from session
      expect(userId).toBe('test-user-id')

      console.log('[TEST] Session user ID retrieval test completed successfully')
    })

    it('should get user ID from workflow when workflowId is provided', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing user ID retrieval from workflow for OAuth utilities')

      // Configure database to return workflow owner information
      // This simulates a workflow execution context where OAuth access is needed
      const workflowOwner = { userId: 'workflow-owner-id' }
      mocks.database.setSelectResults([[workflowOwner]])

      console.log('[TEST] Database configured with workflow owner:', workflowOwner.userId)

      // Import OAuth utilities after mocks are set up
      const { getUserId } = await import('@/app/api/auth/oauth/utils')

      // Execute user ID retrieval with workflow ID
      const userId = await getUserId('request-id', 'workflow-id')

      console.log('[TEST] Retrieved user ID from workflow:', userId)

      // Verify that workflow owner's user ID is correctly returned
      expect(userId).toBe('workflow-owner-id')

      console.log('[TEST] Workflow user ID retrieval test completed successfully')
    })

    it('should return undefined if no session is found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing user ID retrieval when no session is found')

      // Configure auth mock to return null session
      // This simulates an unauthenticated user attempting to access OAuth utilities
      mockGetSession.mockResolvedValueOnce(null)

      console.log('[TEST] Auth session configured to return null (unauthenticated)')

      // Import OAuth utilities with no session mock
      const { getUserId } = await import('@/app/api/auth/oauth/utils')

      // Execute user ID retrieval without session
      const userId = await getUserId('request-id')

      console.log('[TEST] User ID result for no session:', userId)

      // Verify that undefined is returned when no session exists
      expect(userId).toBeUndefined()

      console.log('[TEST] No session handling test completed successfully')
    })

    it('should return undefined if workflow is not found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing user ID retrieval when workflow is not found')

      // Configure database to return empty results (workflow not found)
      // This simulates a request with an invalid or deleted workflow ID
      mocks.database.setSelectResults([[]])

      console.log('[TEST] Database configured to return empty results (workflow not found)')

      // Import OAuth utilities after mocks are set up
      const { getUserId } = await import('@/app/api/auth/oauth/utils')

      // Execute user ID retrieval with non-existent workflow ID
      const userId = await getUserId('request-id', 'nonexistent-workflow-id')

      console.log('[TEST] User ID result for non-existent workflow:', userId)

      // Verify that undefined is returned when workflow is not found
      expect(userId).toBeUndefined()

      console.log('[TEST] Workflow not found handling test completed successfully')
    })
  })

  describe('getCredential', () => {
    it('should return credential when found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing successful OAuth credential retrieval')

      // Define mock credential data that should be returned
      const mockCredential = { id: 'credential-id', userId: 'test-user-id' }

      // Configure database to return the credential
      // This simulates finding a valid OAuth credential in the database
      mocks.database.setSelectResults([[mockCredential]])

      console.log('[TEST] Database configured with mock credential:', mockCredential.id)

      // Import OAuth utilities after mocks are set up
      const { getCredential } = await import('@/app/api/auth/oauth/utils')

      // Execute credential retrieval
      const credential = await getCredential('request-id', 'credential-id', 'test-user-id')

      console.log('[TEST] Retrieved credential:', credential?.id)

      // Verify that the correct credential is returned
      expect(credential).toEqual(mockCredential)

      console.log('[TEST] Credential retrieval test completed successfully')
    })

    it('should return undefined when credential is not found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing credential retrieval when credential is not found')

      // Configure database to return empty results (credential not found)
      // This simulates a request for a non-existent or unauthorized credential
      mocks.database.setSelectResults([[]])

      console.log('[TEST] Database configured to return empty results (credential not found)')

      // Import OAuth utilities after mocks are set up
      const { getCredential } = await import('@/app/api/auth/oauth/utils')

      // Execute credential retrieval with non-existent ID
      const credential = await getCredential('request-id', 'nonexistent-id', 'test-user-id')

      console.log('[TEST] Credential result for non-existent ID:', credential)

      // Verify that undefined is returned when credential is not found
      expect(credential).toBeUndefined()

      console.log('[TEST] Credential not found handling test completed successfully')
    })
  })

  describe('refreshTokenIfNeeded', () => {
    it('should return valid token without refresh if not expired', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing token refresh with valid (non-expired) token')

      // Define mock credential with valid access token
      // This simulates a credential with a token that doesn't need refreshing
      const mockCredential = {
        id: 'credential-id',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour in the future
        providerId: 'google',
      }

      console.log('[TEST] Mock credential configured with valid token expiring in 1 hour')

      // Import OAuth utilities after mocks are set up
      const { refreshTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute token refresh check
      const result = await refreshTokenIfNeeded('request-id', mockCredential, 'credential-id')

      console.log('[TEST] Token refresh result:', result)

      // Verify that no refresh was attempted and original token is returned
      expect(mockRefreshOAuthToken).not.toHaveBeenCalled()
      expect(result).toEqual({ accessToken: 'valid-token', refreshed: false })

      console.log('[TEST] Valid token (no refresh needed) test completed successfully')
    })

    it('should refresh token when expired', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing token refresh with expired token')

      // Define mock credential with expired access token
      // This simulates a credential that needs token refresh
      const mockCredential = {
        id: 'credential-id',
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
        providerId: 'google',
      }

      // Setup OAuth refresh to return new token
      // This simulates successful token refresh from OAuth provider
      mockRefreshOAuthToken.mockResolvedValueOnce({
        accessToken: 'new-token',
        expiresIn: 3600,
        refreshToken: 'new-refresh-token',
      })

      console.log(
        '[TEST] Mock credential configured with expired token, refresh utility configured for success'
      )

      // Import OAuth utilities after mocks are set up
      const { refreshTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute token refresh
      const result = await refreshTokenIfNeeded('request-id', mockCredential, 'credential-id')

      console.log('[TEST] Token refresh result:', result)

      // Verify that refresh was called and new token is returned
      expect(mockRefreshOAuthToken).toHaveBeenCalledWith('google', 'refresh-token')
      expect(result).toEqual({ accessToken: 'new-token', refreshed: true })

      console.log('[TEST] Expired token refresh test completed successfully')
    })

    it('should handle refresh token error', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing token refresh error handling')

      // Define mock credential with expired access token
      const mockCredential = {
        id: 'credential-id',
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
        providerId: 'google',
      }

      // Setup OAuth refresh to fail
      // This simulates OAuth provider rejecting the refresh token
      mockRefreshOAuthToken.mockResolvedValueOnce(null)

      console.log(
        '[TEST] Mock credential configured with expired token, refresh utility configured to fail'
      )

      // Import OAuth utilities after mocks are set up
      const { refreshTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute token refresh and expect it to throw
      await expect(
        refreshTokenIfNeeded('request-id', mockCredential, 'credential-id')
      ).rejects.toThrow('Failed to refresh token')

      console.log('[TEST] Token refresh error properly thrown')

      console.log('[TEST] Token refresh error handling test completed successfully')
    })

    it('should not attempt refresh if no refresh token', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing token refresh behavior when no refresh token is available')

      // Define mock credential without refresh token
      // This simulates a credential that cannot be refreshed
      const mockCredential = {
        id: 'credential-id',
        accessToken: 'token',
        refreshToken: null,
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
        providerId: 'google',
      }

      console.log('[TEST] Mock credential configured with no refresh token (cannot refresh)')

      // Import OAuth utilities after mocks are set up
      const { refreshTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute token refresh check
      const result = await refreshTokenIfNeeded('request-id', mockCredential, 'credential-id')

      console.log('[TEST] Token refresh result for no refresh token:', result)

      // Verify that no refresh was attempted and original token is returned
      expect(mockRefreshOAuthToken).not.toHaveBeenCalled()
      expect(result).toEqual({ accessToken: 'token', refreshed: false })

      console.log('[TEST] No refresh token handling test completed successfully')
    })
  })

  describe('refreshAccessTokenIfNeeded', () => {
    it('should return valid access token without refresh if not expired', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing refreshAccessTokenIfNeeded with valid token')

      // Define mock credential with valid access token
      const mockCredential = {
        id: 'credential-id',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour in the future
        providerId: 'google',
        userId: 'test-user-id',
      }

      // Configure database to return the valid credential
      mocks.database.setSelectResults([[mockCredential]])

      console.log('[TEST] Database configured with valid credential, token expires in 1 hour')

      // Import OAuth utilities after mocks are set up
      const { refreshAccessTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute access token refresh check
      const token = await refreshAccessTokenIfNeeded('credential-id', 'test-user-id', 'request-id')

      console.log('[TEST] Access token result:', token)

      // Verify that no refresh was attempted and valid token is returned
      expect(mockRefreshOAuthToken).not.toHaveBeenCalled()
      expect(token).toBe('valid-token')

      console.log('[TEST] Valid access token (no refresh) test completed successfully')
    })

    it('should refresh token when expired', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing refreshAccessTokenIfNeeded with expired token')

      // Define mock credential with expired access token
      const mockCredential = {
        id: 'credential-id',
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
        providerId: 'google',
        userId: 'test-user-id',
      }

      // Configure database to return the expired credential
      mocks.database.setSelectResults([[mockCredential]])

      // Setup OAuth refresh to return new token
      mockRefreshOAuthToken.mockResolvedValueOnce({
        accessToken: 'new-token',
        expiresIn: 3600,
        refreshToken: 'new-refresh-token',
      })

      console.log(
        '[TEST] Database configured with expired credential, refresh utility configured for success'
      )

      // Import OAuth utilities after mocks are set up
      const { refreshAccessTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute access token refresh
      const token = await refreshAccessTokenIfNeeded('credential-id', 'test-user-id', 'request-id')

      console.log('[TEST] Refreshed access token result:', token)

      // Verify that refresh was called and new token is returned
      expect(mockRefreshOAuthToken).toHaveBeenCalledWith('google', 'refresh-token')
      expect(token).toBe('new-token')

      console.log('[TEST] Expired access token refresh test completed successfully')
    })

    it('should return null if credential not found', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing refreshAccessTokenIfNeeded when credential is not found')

      // Configure database to return empty results (credential not found)
      mocks.database.setSelectResults([[]])

      console.log('[TEST] Database configured to return empty results (credential not found)')

      // Import OAuth utilities after mocks are set up
      const { refreshAccessTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute access token refresh with non-existent credential
      const token = await refreshAccessTokenIfNeeded('nonexistent-id', 'test-user-id', 'request-id')

      console.log('[TEST] Access token result for non-existent credential:', token)

      // Verify that null is returned when credential is not found
      expect(token).toBeNull()

      console.log(
        '[TEST] Credential not found in refreshAccessTokenIfNeeded test completed successfully'
      )
    })

    it('should return null if refresh fails', async () => {
      // Log test execution for debugging and future developer understanding
      console.log('[TEST] Testing refreshAccessTokenIfNeeded when refresh fails')

      // Define mock credential with expired access token
      const mockCredential = {
        id: 'credential-id',
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
        providerId: 'google',
        userId: 'test-user-id',
      }

      // Configure database to return the expired credential
      mocks.database.setSelectResults([[mockCredential]])

      // Setup OAuth refresh to fail
      mockRefreshOAuthToken.mockResolvedValueOnce(null)

      console.log(
        '[TEST] Database configured with expired credential, refresh utility configured to fail'
      )

      // Import OAuth utilities after mocks are set up
      const { refreshAccessTokenIfNeeded } = await import('@/app/api/auth/oauth/utils')

      // Execute access token refresh
      const token = await refreshAccessTokenIfNeeded('credential-id', 'test-user-id', 'request-id')

      console.log('[TEST] Access token result for failed refresh:', token)

      // Verify that null is returned when refresh fails
      expect(token).toBeNull()

      console.log('[TEST] Failed refresh in refreshAccessTokenIfNeeded test completed successfully')
    })
  })
})
