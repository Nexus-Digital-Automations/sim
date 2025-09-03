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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'

// Import module-level mocks
import { mockControls } from '@/app/api/__test-utils__/module-mocks'

// Mock jwt-decode at module level
const mockJwtDecode = vi.fn()
vi.mock('jwt-decode', () => ({
  jwtDecode: mockJwtDecode,
}))

describe('OAuth Connections API Route', () => {
  let mocks: any
  let GET: any

  // Sample OAuth connection data for testing
  const sampleConnections = [
    {
      id: 'account-1',
      providerId: 'google-email',
      accountId: 'test@example.com',
      scope: 'email profile',
      updatedAt: new Date('2024-01-01'),
      idToken: null,
    },
    {
      id: 'account-2',
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

    // Setup comprehensive test infrastructure
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [sampleConnections, sampleUserRecord],
        },
      },
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
  })

  it('should return connections successfully', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    const mockAccounts = [
      {
        id: 'account-1',
        providerId: 'google-email',
        accountId: 'test@example.com',
        scope: 'email profile',
        updatedAt: new Date('2024-01-01'),
        idToken: null,
      },
      {
        id: 'account-2',
        providerId: 'github',
        accountId: 'testuser',
        scope: 'repo',
        updatedAt: new Date('2024-01-02'),
        idToken: null,
      },
    ]

    const mockUserRecord = [{ email: 'user@example.com' }]

    mockDb.select.mockReturnValueOnce(mockDb)
    mockDb.from.mockReturnValueOnce(mockDb)
    mockDb.where.mockResolvedValueOnce(mockAccounts)

    mockDb.select.mockReturnValueOnce(mockDb)
    mockDb.from.mockReturnValueOnce(mockDb)
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce(mockUserRecord)

    const req = createMockRequest('GET')
    const { GET } = await import('@/app/api/auth/oauth/connections/route')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.connections).toHaveLength(2)
    expect(data.connections[0]).toMatchObject({
      provider: 'google-email',
      baseProvider: 'google',
      featureType: 'email',
      isConnected: true,
    })
    expect(data.connections[1]).toMatchObject({
      provider: 'github',
      baseProvider: 'github',
      featureType: 'default',
      isConnected: true,
    })
  })

  it('should handle unauthenticated user', async () => {
    mockGetSession.mockResolvedValueOnce(null)

    const req = createMockRequest('GET')
    const { GET } = await import('@/app/api/auth/oauth/connections/route')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('User not authenticated')
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('should handle user with no connections', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    mockDb.select.mockReturnValueOnce(mockDb)
    mockDb.from.mockReturnValueOnce(mockDb)
    mockDb.where.mockResolvedValueOnce([])

    mockDb.select.mockReturnValueOnce(mockDb)
    mockDb.from.mockReturnValueOnce(mockDb)
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce([])

    const req = createMockRequest('GET')
    const { GET } = await import('@/app/api/auth/oauth/connections/route')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.connections).toHaveLength(0)
  })

  it('should handle database error', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

    mockDb.select.mockReturnValueOnce(mockDb)
    mockDb.from.mockReturnValueOnce(mockDb)
    mockDb.where.mockRejectedValueOnce(new Error('Database error'))

    const req = createMockRequest('GET')
    const { GET } = await import('@/app/api/auth/oauth/connections/route')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('should decode ID token for display name', async () => {
    const { jwtDecode } = await import('jwt-decode')
    const mockJwtDecode = jwtDecode as any

    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-123' },
    })

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

    mockJwtDecode.mockReturnValueOnce({
      email: 'decoded@example.com',
      name: 'Decoded User',
    })

    mockDb.select.mockReturnValueOnce(mockDb)
    mockDb.from.mockReturnValueOnce(mockDb)
    mockDb.where.mockResolvedValueOnce(mockAccounts)

    mockDb.select.mockReturnValueOnce(mockDb)
    mockDb.from.mockReturnValueOnce(mockDb)
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce([])

    const req = createMockRequest('GET')
    const { GET } = await import('@/app/api/auth/oauth/connections/route')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.connections[0].accounts[0].name).toBe('decoded@example.com')
  })
})
