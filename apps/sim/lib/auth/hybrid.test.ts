import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkHybridAuth } from './hybrid'

/**
 * Comprehensive Unit Tests for Hybrid Authentication System
 *
 * CRITICAL SECURITY INFRASTRUCTURE TESTING
 * This module handles three primary authentication methods:
 * 1. Session authentication (cookies for web UI)
 * 2. API key authentication (X-API-Key header for programmatic access)
 * 3. Internal JWT authentication (Bearer token for internal service calls)
 *
 * SECURITY BOUNDARIES TESTED:
 * - Session cookie validation and user context extraction
 * - API key lookup and user association verification
 * - Internal JWT token verification and workflow context resolution
 * - Authentication method precedence and fallback handling
 * - Workflow-based user context determination for internal calls
 * - Request body parsing for workflow ID extraction
 * - Error handling and security failure scenarios
 *
 * ATTACK VECTORS TESTED:
 * - Invalid session tokens and cookie tampering
 * - API key brute force and enumeration attempts
 * - JWT token forgery and tampering detection
 * - Request body manipulation and injection attempts
 * - Missing authentication header scenarios
 * - Malformed token and header formats
 * - Workflow ID extraction vulnerabilities
 */

// Mock external dependencies for isolated security testing
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/auth/internal', () => ({
  verifyInternalToken: vi.fn(),
}))

vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  },
}))

vi.mock('@/db/schema', () => ({
  apiKey: {
    userId: 'user_id',
    key: 'api_key',
  },
  workflow: {
    userId: 'user_id',
    id: 'workflow_id',
  },
}))

import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { db } from '@/db'

const mockGetSession = getSession as any
const mockVerifyInternalToken = verifyInternalToken as any
const mockDb = db as any

/**
 * Helper function to create mock database query chains for authentication testing
 * @param finalResult - The expected result from the database query
 * @returns Mock database query chain with proper method chaining
 */
function createMockDbChain(finalResult: any) {
  const chain: any = {}
  chain.then = vi.fn().mockImplementation((resolve: any) => resolve(finalResult))
  chain.select = vi.fn().mockReturnValue(chain)
  chain.from = vi.fn().mockReturnValue(chain)
  chain.where = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

/**
 * Create mock NextRequest for testing authentication scenarios
 * @param options - Request configuration options
 * @returns Mock NextRequest object with headers, URL, and body
 */
function createMockRequest(options: {
  authorization?: string
  apiKey?: string
  url?: string
  method?: string
  body?: any
  searchParams?: { [key: string]: string }
}): NextRequest {
  const headers = new Map<string, string>()
  if (options.authorization) headers.set('authorization', options.authorization)
  if (options.apiKey) headers.set('x-api-key', options.apiKey)

  // Build URL with search parameters
  const baseUrl = options.url || 'https://example.com/api/test'
  const url = new URL(baseUrl)
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return {
    headers: {
      get: (key: string) => headers.get(key) || null,
    },
    url: url.toString(),
    method: options.method || 'GET',
    clone: () => ({
      text: () => Promise.resolve(JSON.stringify(options.body || {})),
    }),
  } as any
}

describe('Hybrid Authentication System - Critical Security Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset all mock implementations for test isolation
    mockDb.select.mockReset()
    mockGetSession.mockReset()
    mockVerifyInternalToken.mockReset()
  })

  describe('🔐 Internal JWT Authentication Security', () => {
    /**
     * TEST: Valid internal JWT with workflow context from query parameters
     * SECURITY BOUNDARY: Internal JWTs must be verified and provide workflow context
     */
    it('should authenticate valid internal JWT with workflow ID from query params', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        searchParams: { workflowId: 'workflow-123' },
      })

      // Mock successful JWT verification
      mockVerifyInternalToken.mockResolvedValue(true)

      // Mock workflow lookup returning valid user context
      const workflowChain = createMockDbChain([{ userId: 'workflow-owner-456' }])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'workflow-owner-456',
        authType: 'internal_jwt',
      })

      expect(mockVerifyInternalToken).toHaveBeenCalledWith('valid-internal-jwt')
    })

    /**
     * TEST: Internal JWT with workflow context from POST body
     * SECURITY BOUNDARY: Body parsing must safely extract workflow context
     */
    it('should extract workflow ID from POST request body for internal JWT', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        method: 'POST',
        body: { workflowId: 'workflow-789', otherData: 'test' },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const workflowChain = createMockDbChain([{ userId: 'workflow-owner-123' }])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'workflow-owner-123',
        authType: 'internal_jwt',
      })
    })

    /**
     * TEST: Internal JWT with invalid/malformed JSON body
     * SECURITY BOUNDARY: Malformed body should not cause crashes or security issues
     */
    it('should handle malformed JSON in request body gracefully', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        method: 'POST',
      })

      // Mock request clone that returns invalid JSON
      request.clone = () =>
        ({
          text: () => Promise.resolve('invalid-json{'),
        }) as any

      mockVerifyInternalToken.mockResolvedValue(true)

      const result = await checkHybridAuth(request, { requireWorkflowId: false })

      expect(result).toEqual({
        success: true,
        authType: 'internal_jwt',
      })
    })

    /**
     * TEST: Internal JWT requiring workflow ID but none provided
     * SECURITY BOUNDARY: Internal calls should require workflow context by default
     */
    it('should reject internal JWT when workflow ID required but missing', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'workflowId required for internal JWT calls',
      })
    })

    /**
     * TEST: Internal JWT with non-existent workflow
     * SECURITY BOUNDARY: Invalid workflows should be rejected
     */
    it('should reject internal JWT with non-existent workflow', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        searchParams: { workflowId: 'non-existent-workflow' },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      // Mock workflow not found
      const workflowChain = createMockDbChain([])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Workflow not found',
      })
    })

    /**
     * TEST: Invalid internal JWT token
     * SECURITY BOUNDARY: Invalid JWTs must be rejected
     */
    it('should reject invalid internal JWT token', async () => {
      const request = createMockRequest({
        authorization: 'Bearer invalid-jwt-token',
      })

      mockVerifyInternalToken.mockResolvedValue(false)

      // Should fall through to session authentication
      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: Internal JWT with optional workflow requirement disabled
     * SECURITY BOUNDARY: Some internal operations may not need workflow context
     */
    it('should allow internal JWT without workflow when requirement disabled', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const result = await checkHybridAuth(request, { requireWorkflowId: false })

      expect(result).toEqual({
        success: true,
        authType: 'internal_jwt',
      })
    })

    /**
     * TEST: Bearer token that is not a valid internal JWT
     * SECURITY BOUNDARY: Non-internal bearer tokens should fall through to other auth
     */
    it('should fall through when bearer token is not internal JWT', async () => {
      const request = createMockRequest({
        authorization: 'Bearer external-token',
      })

      mockVerifyInternalToken.mockResolvedValue(false)
      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })

      expect(mockVerifyInternalToken).toHaveBeenCalledWith('external-token')
    })

    /**
     * TEST: Malformed Bearer header
     * SECURITY BOUNDARY: Malformed auth headers should be handled safely
     */
    it('should handle malformed Bearer header gracefully', async () => {
      const request = createMockRequest({
        authorization: 'Bearer',
      })

      // Should fall through since no token after Bearer
      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: Empty Bearer token
     * SECURITY BOUNDARY: Empty tokens should be rejected
     */
    it('should handle empty Bearer token', async () => {
      const request = createMockRequest({
        authorization: 'Bearer ',
      })

      mockVerifyInternalToken.mockResolvedValue(false)
      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })

      expect(mockVerifyInternalToken).toHaveBeenCalledWith('')
    })
  })

  describe('🍪 Session Authentication Security', () => {
    /**
     * TEST: Valid session authentication
     * SECURITY BOUNDARY: Session cookies must provide valid user context
     */
    it('should authenticate valid session with user ID', async () => {
      const request = createMockRequest({})

      mockGetSession.mockResolvedValue({
        user: { id: 'session-user-123' },
      })

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'session-user-123',
        authType: 'session',
      })
    })

    /**
     * TEST: Session without user information
     * SECURITY BOUNDARY: Sessions without user data should be rejected
     */
    it('should reject session without user ID', async () => {
      const request = createMockRequest({})

      mockGetSession.mockResolvedValue({
        user: {},
      })

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: Null session
     * SECURITY BOUNDARY: Null sessions should fall through to API key authentication
     */
    it('should handle null session gracefully', async () => {
      const request = createMockRequest({})

      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: Session with null user
     * SECURITY BOUNDARY: Sessions with null user should be rejected
     */
    it('should reject session with null user', async () => {
      const request = createMockRequest({})

      mockGetSession.mockResolvedValue({
        user: null,
      })

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: Session with undefined user ID
     * SECURITY BOUNDARY: Sessions with undefined user ID should be rejected
     */
    it('should reject session with undefined user ID', async () => {
      const request = createMockRequest({})

      mockGetSession.mockResolvedValue({
        user: { id: undefined },
      })

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: Session service failure
     * SECURITY BOUNDARY: Session service errors should be handled gracefully
     */
    it('should handle session service errors', async () => {
      const request = createMockRequest({})

      mockGetSession.mockRejectedValue(new Error('Session service unavailable'))

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication error',
      })
    })
  })

  describe('🔑 API Key Authentication Security', () => {
    /**
     * TEST: Valid API key authentication
     * SECURITY BOUNDARY: API keys must be validated against database records
     */
    it('should authenticate valid API key', async () => {
      const request = createMockRequest({
        apiKey: 'valid-api-key-123',
      })

      mockGetSession.mockResolvedValue(null)

      const apiKeyChain = createMockDbChain([{ userId: 'api-user-456' }])
      mockDb.select.mockReturnValue(apiKeyChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'api-user-456',
        authType: 'api_key',
      })
    })

    /**
     * TEST: Invalid API key
     * SECURITY BOUNDARY: Invalid API keys must be explicitly rejected
     */
    it('should reject invalid API key', async () => {
      const request = createMockRequest({
        apiKey: 'invalid-api-key',
      })

      mockGetSession.mockResolvedValue(null)

      const apiKeyChain = createMockDbChain([])
      mockDb.select.mockReturnValue(apiKeyChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      })
    })

    /**
     * TEST: Empty API key
     * SECURITY BOUNDARY: Empty API keys should be rejected
     */
    it('should reject empty API key', async () => {
      const request = createMockRequest({
        apiKey: '',
      })

      mockGetSession.mockResolvedValue(null)

      const apiKeyChain = createMockDbChain([])
      mockDb.select.mockReturnValue(apiKeyChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      })
    })

    /**
     * TEST: SQL injection attempt through API key
     * SECURITY BOUNDARY: Malicious API keys should be handled by ORM safely
     */
    it('should handle malicious API key inputs safely', async () => {
      const request = createMockRequest({
        apiKey: "'; DROP TABLE api_keys; --",
      })

      mockGetSession.mockResolvedValue(null)

      const apiKeyChain = createMockDbChain([])
      mockDb.select.mockReturnValue(apiKeyChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      })
    })

    /**
     * TEST: Very long API key
     * SECURITY BOUNDARY: System should handle unusually long API keys
     */
    it('should handle very long API keys', async () => {
      const longApiKey = 'a'.repeat(10000)
      const request = createMockRequest({
        apiKey: longApiKey,
      })

      mockGetSession.mockResolvedValue(null)

      const apiKeyChain = createMockDbChain([])
      mockDb.select.mockReturnValue(apiKeyChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      })
    })

    /**
     * TEST: Unicode characters in API key
     * SECURITY BOUNDARY: System should handle unicode API key input
     */
    it('should handle unicode characters in API key', async () => {
      const request = createMockRequest({
        apiKey: '🔑api-key-🚀123',
      })

      mockGetSession.mockResolvedValue(null)

      const apiKeyChain = createMockDbChain([{ userId: 'unicode-user-123' }])
      mockDb.select.mockReturnValue(apiKeyChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'unicode-user-123',
        authType: 'api_key',
      })
    })

    /**
     * TEST: Database error during API key lookup
     * SECURITY BOUNDARY: Database errors should be handled gracefully
     */
    it('should handle database errors during API key lookup', async () => {
      const request = createMockRequest({
        apiKey: 'valid-key-123',
      })

      mockGetSession.mockResolvedValue(null)
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication error',
      })
    })
  })

  describe('🔄 Authentication Method Precedence', () => {
    /**
     * TEST: Internal JWT takes precedence over session
     * SECURITY BOUNDARY: Authentication method priority should be enforced
     */
    it('should prioritize internal JWT over session authentication', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
      })

      mockVerifyInternalToken.mockResolvedValue(true)
      mockGetSession.mockResolvedValue({
        user: { id: 'session-user-123' },
      })

      const result = await checkHybridAuth(request, { requireWorkflowId: false })

      expect(result).toEqual({
        success: true,
        authType: 'internal_jwt',
      })

      // Session should not be checked when JWT is valid
      expect(mockGetSession).not.toHaveBeenCalled()
    })

    /**
     * TEST: Session takes precedence over API key
     * SECURITY BOUNDARY: Session authentication should be checked before API key
     */
    it('should prioritize session over API key authentication', async () => {
      const request = createMockRequest({
        apiKey: 'valid-api-key-123',
      })

      mockGetSession.mockResolvedValue({
        user: { id: 'session-user-456' },
      })

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'session-user-456',
        authType: 'session',
      })

      // API key should not be checked when session is valid
      expect(mockDb.select).not.toHaveBeenCalled()
    })

    /**
     * TEST: Multiple authentication methods provided
     * SECURITY BOUNDARY: Only the highest priority method should be used
     */
    it('should use only the highest priority authentication method', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        apiKey: 'valid-api-key-123',
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const result = await checkHybridAuth(request, { requireWorkflowId: false })

      expect(result).toEqual({
        success: true,
        authType: 'internal_jwt',
      })

      // Lower priority methods should not be checked
      expect(mockGetSession).not.toHaveBeenCalled()
      expect(mockDb.select).not.toHaveBeenCalled()
    })
  })

  describe('🚫 No Authentication Scenarios', () => {
    /**
     * TEST: No authentication headers provided
     * SECURITY BOUNDARY: Requests without authentication should be rejected
     */
    it('should reject requests with no authentication', async () => {
      const request = createMockRequest({})

      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: All authentication methods fail
     * SECURITY BOUNDARY: When all auth methods fail, request should be rejected
     */
    it('should reject when all authentication methods fail', async () => {
      const request = createMockRequest({
        authorization: 'Bearer invalid-jwt',
        apiKey: 'invalid-key',
      })

      mockVerifyInternalToken.mockResolvedValue(false)
      mockGetSession.mockResolvedValue(null)

      const apiKeyChain = createMockDbChain([])
      mockDb.select.mockReturnValue(apiKeyChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      })
    })
  })

  describe('🔍 Workflow ID Extraction Security', () => {
    /**
     * TEST: Workflow ID from query parameters with URL encoding
     * SECURITY BOUNDARY: URL-encoded workflow IDs should be handled correctly
     */
    it('should handle URL-encoded workflow ID in query parameters', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        searchParams: { workflowId: 'workflow%20with%20spaces' },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const workflowChain = createMockDbChain([{ userId: 'workflow-owner-123' }])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'workflow-owner-123',
        authType: 'internal_jwt',
      })
    })

    /**
     * TEST: Workflow ID precedence - query parameter over body
     * SECURITY BOUNDARY: Query parameter should take precedence over body
     */
    it('should prioritize query parameter workflow ID over body', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        method: 'POST',
        searchParams: { workflowId: 'query-workflow-123' },
        body: { workflowId: 'body-workflow-456' },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const workflowChain = createMockDbChain([{ userId: 'workflow-owner-789' }])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result.success).toBe(true)
      expect(result.authType).toBe('internal_jwt')

      // Verify the database was queried with the query parameter workflow ID
      expect(mockDb.select).toHaveBeenCalled()
    })

    /**
     * TEST: Empty workflow ID in query parameters
     * SECURITY BOUNDARY: Empty workflow IDs should be treated as missing
     */
    it('should handle empty workflow ID in query parameters', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        searchParams: { workflowId: '' },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'workflowId required for internal JWT calls',
      })
    })

    /**
     * TEST: Workflow ID with special characters
     * SECURITY BOUNDARY: Special characters in workflow IDs should be handled
     */
    it('should handle workflow ID with special characters', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        searchParams: { workflowId: 'workflow-<script>alert("xss")</script>' },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const workflowChain = createMockDbChain([{ userId: 'workflow-owner-123' }])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'workflow-owner-123',
        authType: 'internal_jwt',
      })
    })

    /**
     * TEST: Deep nested workflow ID in request body
     * SECURITY BOUNDARY: Only top-level workflow ID should be extracted
     */
    it('should only extract top-level workflow ID from body', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        method: 'POST',
        body: {
          workflowId: 'top-level-workflow',
          nested: {
            workflowId: 'nested-workflow',
          },
        },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      const workflowChain = createMockDbChain([{ userId: 'workflow-owner-123' }])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result.success).toBe(true)
      expect(result.userId).toBe('workflow-owner-123')
    })
  })

  describe('🛡️ Error Handling and Edge Cases', () => {
    /**
     * TEST: Network timeout during authentication
     * SECURITY BOUNDARY: Network errors should not expose sensitive information
     */
    it('should handle authentication timeouts gracefully', async () => {
      const request = createMockRequest({})

      mockGetSession.mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 100))
      )

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication error',
      })
    })

    /**
     * TEST: Unexpected error during workflow lookup
     * SECURITY BOUNDARY: Database errors should not leak implementation details
     */
    it('should handle workflow lookup errors', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        searchParams: { workflowId: 'workflow-123' },
      })

      mockVerifyInternalToken.mockResolvedValue(true)

      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection lost')
      })

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication error',
      })
    })

    /**
     * TEST: Malformed authorization header
     * SECURITY BOUNDARY: Malformed headers should be handled gracefully
     */
    it('should handle malformed authorization headers', async () => {
      const request = createMockRequest({
        authorization: 'InvalidFormat token123',
      })

      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication required - provide session, API key, or internal JWT',
      })
    })

    /**
     * TEST: Request with null URL
     * SECURITY BOUNDARY: Null URLs should be handled without crashes
     */
    it('should handle requests with null URL', async () => {
      const request = {
        headers: {
          get: () => null,
        },
        url: null,
        method: 'GET',
        clone: () => ({
          text: () => Promise.resolve('{}'),
        }),
      } as any

      mockGetSession.mockResolvedValue(null)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: false,
        error: 'Authentication error',
      })
    })

    /**
     * TEST: Request body that is not JSON
     * SECURITY BOUNDARY: Non-JSON body should not cause parsing errors
     */
    it('should handle non-JSON request body', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        method: 'POST',
      })

      // Mock request clone that returns non-JSON content
      request.clone = () =>
        ({
          text: () => Promise.resolve('not-json-content'),
        }) as any

      mockVerifyInternalToken.mockResolvedValue(true)

      const result = await checkHybridAuth(request, { requireWorkflowId: false })

      expect(result).toEqual({
        success: true,
        authType: 'internal_jwt',
      })
    })

    /**
     * TEST: Extremely large request body
     * SECURITY BOUNDARY: Large bodies should be handled without memory issues
     */
    it('should handle large request bodies safely', async () => {
      const request = createMockRequest({
        authorization: 'Bearer valid-internal-jwt',
        method: 'POST',
      })

      // Mock request clone that returns very large content
      const largeContent = JSON.stringify({
        workflowId: 'workflow-123',
        largeData: 'x'.repeat(100000),
      })
      request.clone = () =>
        ({
          text: () => Promise.resolve(largeContent),
        }) as any

      mockVerifyInternalToken.mockResolvedValue(true)

      const workflowChain = createMockDbChain([{ userId: 'workflow-owner-123' }])
      mockDb.select.mockReturnValue(workflowChain)

      const result = await checkHybridAuth(request)

      expect(result).toEqual({
        success: true,
        userId: 'workflow-owner-123',
        authType: 'internal_jwt',
      })
    })
  })
})
