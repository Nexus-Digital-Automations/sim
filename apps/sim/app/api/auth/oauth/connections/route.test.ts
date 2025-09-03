/**
 * Comprehensive Test Suite for OAuth Connections API - Bun/Vitest Compatible
 * Tests OAuth connection listing functionality including authentication and error handling
 * Covers successful connection retrieval, user authentication, and database error scenarios
 *
 * This test suite uses the new module-level mocking infrastructure for compatibility
 * with bun/vitest and provides comprehensive logging for debugging and maintenance.
 *
 * @vitest-environment node
 */
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Create standalone enhanced test utilities to avoid conflicts
const createEnhancedMockRequest = (method = 'GET', body?: any): NextRequest => {
  const url = 'http://localhost:3000/api/auth/oauth/connections'
  return new NextRequest(new URL(url), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

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
      // Mock the Drizzle query chain: db.select().from().where() and db.select().from().where().limit()
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            const result = results[callCount] || []
            callCount++
            console.log('🔧 Database select returning:', result.length, 'records')
            return {
              limit: vi.fn().mockImplementation(() => {
                const limitResult = results[callCount] || []
                callCount++
                console.log(
                  '🔧 Database select with limit returning:',
                  limitResult.length,
                  'records'
                )
                return Promise.resolve(limitResult)
              }),
              // Return promise for queries without limit
              then: (resolve: any) => resolve(result),
            }
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

// Mock jwt-decode at module level
const mockJwtDecode = vi.fn()
vi.mock('jwt-decode', () => ({
  jwtDecode: mockJwtDecode,
}))

// Mock OAuth utility at module level
const mockParseProvider = vi.fn()
vi.mock('@/lib/oauth/oauth', () => ({
  parseProvider: mockParseProvider,
}))

// Mock auth session at module level
const mockGetSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  getSession: mockGetSession,
}))

// Mock database at module level with proper query builder
const mockDbSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: mockDbSelect,
  },
}))

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq-condition'),
}))

// Mock database schema
vi.mock('@/db/schema', () => ({
  account: {
    userId: 'account.userId',
  },
  user: {
    id: 'user.id',
    email: 'user.email',
  },
}))

// Mock logger with actual logging to see errors
const mockLogger = {
  warn: vi.fn((...args) => console.log('[LOGGER WARN]', ...args)),
  error: vi.fn((...args) => console.log('[LOGGER ERROR]', ...args)),
  info: vi.fn((...args) => console.log('[LOGGER INFO]', ...args)),
}
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}))

describe('OAuth Connections API Route', () => {
  let mocks: any
  let GET: any

  // Sample OAuth connection data for testing - matches database schema
  const sampleConnections = [
    {
      id: 'account-1',
      userId: 'user-123', // Required by route
      providerId: 'google-email',
      accountId: 'test@example.com',
      scope: 'email profile',
      updatedAt: new Date('2024-01-01'),
      idToken: null,
    },
    {
      id: 'account-2',
      userId: 'user-123', // Required by route
      providerId: 'github',
      accountId: 'testuser',
      scope: 'repo',
      updatedAt: new Date('2024-01-02'),
      idToken: null,
    },
  ]

  const sampleUserRecord = [{ email: 'user@example.com' }]

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing enhanced test mocks for OAuth connections API')

    // Setup comprehensive test infrastructure with authenticated user
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: enhancedMockUser },
      database: {
        select: {
          results: [sampleConnections, sampleUserRecord],
        },
      },
    })

    // Configure all module-level mocks with default behavior
    mockParseProvider.mockReset()
    mockParseProvider.mockImplementation((provider: string) => {
      console.log('[OAUTH] parseProvider called with:', provider)
      return {
        baseProvider: provider.split('-')[0] || provider,
        featureType: provider.includes('-') ? provider.split('-')[1] : 'default',
      }
    })

    // Mock crypto.randomUUID for request IDs
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('mock-uuid-123456789012'),
    })

    mockGetSession.mockReset()
    mockDbSelect.mockReset()
    mockFrom.mockReset()
    mockWhere.mockReset()
    mockLimit.mockReset()

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
    mockJwtDecode.mockReset()
    mockParseProvider.mockReset()
    mockGetSession.mockReset()
    mockDbSelect.mockReset()
    mockFrom.mockReset()
    mockWhere.mockReset()
    mockLimit.mockReset()

    console.log('[CLEANUP] Test cleanup completed')
  })

  it('should return connections successfully', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing successful OAuth connections retrieval')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Configure database with connection and user data
    // First query returns OAuth connections, second query returns user email
    mocks.database.setSelectResults([sampleConnections, sampleUserRecord])

    console.log('[TEST] Database configured with', sampleConnections.length, 'sample connections')

    // Create GET request for OAuth connections
    const req = createEnhancedMockRequest('GET')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] OAuth connections response status: ${response.status}`)
    console.log(`[TEST] Response data:`, JSON.stringify(data, null, 2))
    console.log(`[TEST] Returned`, data.connections?.length || 0, 'connections')

    // Verify successful response with correct connection structure
    expect(response.status).toBe(200)
    expect(data.connections).toHaveLength(2)

    // Verify Google email connection details
    expect(data.connections[0]).toMatchObject({
      provider: 'google-email',
      baseProvider: 'google',
      featureType: 'email',
      isConnected: true,
    })

    // Verify GitHub connection details
    expect(data.connections[1]).toMatchObject({
      provider: 'github',
      baseProvider: 'github',
      featureType: 'default',
      isConnected: true,
    })

    console.log('[TEST] OAuth connections retrieval test completed successfully')
  })

  it('should handle unauthenticated user', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing unauthenticated user access to OAuth connections')

    // Set user as unauthenticated for this test
    // This simulates a user who is not logged in attempting to view connections
    mocks.auth.setUnauthenticated()

    // Create GET request attempting to access OAuth connections
    const req = createEnhancedMockRequest('GET')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] Unauthenticated connections access response status: ${response.status}`)
    console.log(`[TEST] Error message:`, data.error)

    // Verify that unauthenticated access is properly rejected
    // The API should return 401 Unauthorized for unauthenticated requests
    expect(response.status).toBe(401)
    expect(data.error).toBe('User not authenticated')

    console.log('[TEST] Unauthenticated user handling test completed successfully')
  })

  it('should handle user with no connections', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing response when user has no OAuth connections')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Configure database to return empty results (no connections)
    // This simulates a user who hasn't connected any OAuth providers yet
    mocks.database.setSelectResults([[], []])

    console.log('[TEST] Database configured to return no connections')

    // Create GET request for user with no connections
    const req = createEnhancedMockRequest('GET')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] No connections response status: ${response.status}`)
    console.log(`[TEST] Connections array length:`, data.connections?.length || 0)

    // Verify that empty result is handled gracefully
    // The API should return 200 OK with an empty connections array
    expect(response.status).toBe(200)
    expect(data.connections).toHaveLength(0)

    console.log('[TEST] No connections handling test completed successfully')
  })

  it('should handle database error', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing database error handling in OAuth connections API')

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
    const req = createEnhancedMockRequest('GET')

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

  it('should decode ID token for display name', async () => {
    // Log test execution for debugging and future developer understanding
    console.log('[TEST] Testing ID token decoding for OAuth connection display names')

    // Setup authenticated user for this test
    mocks.auth.setAuthenticated({ id: 'user-123', email: 'test@example.com' })

    // Define mock account with ID token for decoding
    // This simulates connections that include JWT tokens with user information
    const mockAccounts = [
      {
        id: 'account-1',
        providerId: 'google',
        accountId: 'google-user-id',
        scope: 'email profile',
        updatedAt: new Date('2024-01-01'),
        idToken: 'mock-jwt-token',
      },
    ]

    // Configure database to return the account with ID token
    mocks.database.setSelectResults([mockAccounts, []])

    // Setup JWT decode mock to return user information
    // This simulates extracting user information from the OAuth provider's token
    mockJwtDecode.mockReturnValueOnce({
      email: 'decoded@example.com',
      name: 'Decoded User',
    })

    console.log('[TEST] Database configured with ID token account, JWT decode configured')

    // Create GET request for connections with ID tokens
    const req = createEnhancedMockRequest('GET')

    // Execute the API endpoint and capture response
    const response = await GET(req)
    const data = await response.json()

    console.log(`[TEST] ID token decode response status: ${response.status}`)
    console.log(`[TEST] Decoded connection name:`, data.connections?.[0]?.accounts?.[0]?.name)

    // Verify that ID token was properly decoded and used for display name
    // The decoded email should be used as the connection display name
    expect(response.status).toBe(200)
    expect(data.connections[0].accounts[0].name).toBe('decoded@example.com')

    console.log('[TEST] ID token decoding test completed successfully')
  })
})
