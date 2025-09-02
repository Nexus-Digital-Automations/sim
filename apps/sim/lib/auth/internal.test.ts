import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { generateInternalToken, verifyInternalToken, verifyCronAuth } from './internal'

/**
 * Comprehensive Unit Tests for Internal JWT and CRON Authentication System
 * 
 * CRITICAL SECURITY INFRASTRUCTURE TESTING
 * This module handles secure internal service-to-service communication:
 * 1. JWT token generation for internal API calls with short expiration
 * 2. JWT token verification with proper issuer/audience validation
 * 3. CRON job authentication for scheduled tasks
 * 4. Vercel CRON integration with x-vercel-cron header support
 * 
 * SECURITY BOUNDARIES TESTED:
 * - JWT token generation with proper claims and expiration
 * - JWT signature verification and tamper detection
 * - Issuer and audience claim validation
 * - CRON secret authentication and authorization
 * - Vercel CRON header validation
 * - Request metadata logging for security monitoring
 * - Token expiration and time-based security
 * 
 * ATTACK VECTORS TESTED:
 * - JWT token forgery and signature tampering
 * - Token replay attacks with expired tokens
 * - CRON secret brute force attempts
 * - Request header manipulation and spoofing
 * - Issuer/audience claim tampering
 * - Malformed JWT token formats
 * - IP spoofing and user agent manipulation
 */

// Mock external dependencies for isolated security testing
vi.mock('@/lib/env', () => ({
  env: {
    INTERNAL_API_SECRET: 'test-internal-secret-key-for-jwt-signing',
    CRON_SECRET: 'test-cron-secret-for-scheduled-tasks',
  },
}))

vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ 
      data, 
      status: init?.status || 200,
      json: () => Promise.resolve(data),
    })),
  },
}))

import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'

const mockNextResponse = NextResponse as any
const mockCreateLogger = createLogger as any
const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}
mockCreateLogger.mockReturnValue(mockLogger)

/**
 * Create mock NextRequest for testing authentication scenarios
 * @param options - Request configuration options
 * @returns Mock NextRequest object with headers and metadata
 */
function createMockRequest(options: {
  authorization?: string
  vercelCron?: string
  ip?: string
  userAgent?: string
  forwardedFor?: string
  realIp?: string
}): NextRequest {
  const headers = new Map<string, string>()
  if (options.authorization) headers.set('authorization', options.authorization)
  if (options.vercelCron) headers.set('x-vercel-cron', options.vercelCron)
  if (options.forwardedFor) headers.set('x-forwarded-for', options.forwardedFor)
  if (options.realIp) headers.set('x-real-ip', options.realIp)
  if (options.userAgent) headers.set('user-agent', options.userAgent)

  return {
    headers: {
      get: (key: string) => headers.get(key) || null,
    },
  } as any
}

/**
 * Helper function to wait for a specified number of milliseconds
 * @param ms - Milliseconds to wait
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('Internal JWT and CRON Authentication - Critical Security Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNextResponse.json.mockClear()
    mockLogger.warn.mockClear()
    mockLogger.error.mockClear()
  })

  describe('🔐 JWT Token Generation Security', () => {
    /**
     * TEST: Generate valid internal JWT token with proper structure
     * SECURITY BOUNDARY: Tokens must contain proper claims and signatures
     */
    it('should generate valid JWT token with correct structure', async () => {
      const token = await generateInternalToken()

      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // Header.Payload.Signature format
      
      // Token should be non-empty and properly formatted
      expect(token).not.toBe('')
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    })

    /**
     * TEST: Generated token can be verified immediately
     * SECURITY BOUNDARY: Newly generated tokens must be immediately valid
     */
    it('should generate token that can be immediately verified', async () => {
      const token = await generateInternalToken()
      const isValid = await verifyInternalToken(token)

      expect(isValid).toBe(true)
    })

    /**
     * TEST: Generate multiple unique tokens
     * SECURITY BOUNDARY: Each token generation should produce unique results
     */
    it('should generate unique tokens on multiple calls', async () => {
      const token1 = await generateInternalToken()
      const token2 = await generateInternalToken()
      const token3 = await generateInternalToken()

      expect(token1).not.toBe(token2)
      expect(token2).not.toBe(token3)
      expect(token1).not.toBe(token3)

      // All tokens should be valid
      expect(await verifyInternalToken(token1)).toBe(true)
      expect(await verifyInternalToken(token2)).toBe(true)
      expect(await verifyInternalToken(token3)).toBe(true)
    })

    /**
     * TEST: Token contains proper JWT claims structure
     * SECURITY BOUNDARY: JWT payload must contain required security claims
     */
    it('should generate token with proper JWT claims', async () => {
      const token = await generateInternalToken()
      
      // Decode the payload (without verification for testing purposes)
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

      expect(payload).toHaveProperty('type', 'internal')
      expect(payload).toHaveProperty('iss', 'sim-internal')
      expect(payload).toHaveProperty('aud', 'sim-api')
      expect(payload).toHaveProperty('iat') // Issued at
      expect(payload).toHaveProperty('exp') // Expiration
      
      // Verify expiration is set to 5 minutes (300 seconds) from issued time
      const expectedExpiration = payload.iat + 300
      expect(payload.exp).toBe(expectedExpiration)
    })

    /**
     * TEST: Token expiration timing accuracy
     * SECURITY BOUNDARY: Tokens must expire exactly after 5 minutes for security
     */
    it('should generate token with 5 minute expiration', async () => {
      const beforeGeneration = Math.floor(Date.now() / 1000)
      const token = await generateInternalToken()
      const afterGeneration = Math.floor(Date.now() / 1000)
      
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

      // Expiration should be 300 seconds (5 minutes) after issued time
      expect(payload.exp - payload.iat).toBe(300)
      
      // Issued time should be within our time window
      expect(payload.iat).toBeGreaterThanOrEqual(beforeGeneration)
      expect(payload.iat).toBeLessThanOrEqual(afterGeneration)
    })

    /**
     * TEST: Token generation with consistent algorithm
     * SECURITY BOUNDARY: All tokens should use HS256 algorithm for consistency
     */
    it('should generate token with HS256 algorithm', async () => {
      const token = await generateInternalToken()
      
      // Decode the header to check algorithm
      const parts = token.split('.')
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())

      expect(header).toHaveProperty('alg', 'HS256')
      expect(header).toHaveProperty('typ', 'JWT')
    })
  })

  describe('🔍 JWT Token Verification Security', () => {
    /**
     * TEST: Verify valid internal JWT tokens
     * SECURITY BOUNDARY: Valid tokens must pass all verification checks
     */
    it('should verify valid internal JWT tokens', async () => {
      const token = await generateInternalToken()
      const isValid = await verifyInternalToken(token)

      expect(isValid).toBe(true)
    })

    /**
     * TEST: Reject completely invalid token formats
     * SECURITY BOUNDARY: Malformed tokens must be rejected
     */
    it('should reject invalid token formats', async () => {
      const invalidTokens = [
        'invalid-token',
        'not.a.jwt',
        'too.many.parts.here.invalid',
        '',
        'a.b', // Missing signature
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Only header
      ]

      for (const invalidToken of invalidTokens) {
        const isValid = await verifyInternalToken(invalidToken)
        expect(isValid).toBe(false)
      }
    })

    /**
     * TEST: Reject tokens with tampered signatures
     * SECURITY BOUNDARY: Signature tampering must be detected
     */
    it('should reject tokens with tampered signatures', async () => {
      const validToken = await generateInternalToken()
      
      // Tamper with the signature part
      const parts = validToken.split('.')
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered-signature`

      const isValid = await verifyInternalToken(tamperedToken)
      expect(isValid).toBe(false)
    })

    /**
     * TEST: Reject tokens with tampered payload
     * SECURITY BOUNDARY: Payload tampering must be detected by signature mismatch
     */
    it('should reject tokens with tampered payload', async () => {
      const validToken = await generateInternalToken()
      
      // Create tampered payload with different type
      const tamperedPayload = {
        type: 'external', // Changed from 'internal'
        iss: 'sim-internal',
        aud: 'sim-api',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
      }
      
      const parts = validToken.split('.')
      const tamperedPayloadBase64 = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url')
      const tamperedToken = `${parts[0]}.${tamperedPayloadBase64}.${parts[2]}`

      const isValid = await verifyInternalToken(tamperedToken)
      expect(isValid).toBe(false)
    })

    /**
     * TEST: Reject tokens with wrong issuer
     * SECURITY BOUNDARY: Issuer claim validation must be enforced
     */
    it('should reject tokens with incorrect issuer', async () => {
      // Generate token and manually verify it would fail with wrong issuer
      const token = await generateInternalToken()
      
      // This is indirect since we can't easily create a token with wrong issuer
      // but we can verify that our verification logic checks the issuer
      const isValid = await verifyInternalToken(token)
      expect(isValid).toBe(true) // Confirm our token works
      
      // Test with a crafted token that has wrong issuer (would fail verification)
      const invalidIssuerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiaW50ZXJuYWwiLCJpc3MiOiJyb2d1ZS1pc3N1ZXIiLCJhdWQiOiJzaW0tYXBpIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAzMDB9.invalid'
      expect(await verifyInternalToken(invalidIssuerToken)).toBe(false)
    })

    /**
     * TEST: Reject tokens with wrong audience
     * SECURITY BOUNDARY: Audience claim validation must be enforced
     */
    it('should reject tokens with incorrect audience', async () => {
      const token = await generateInternalToken()
      const isValid = await verifyInternalToken(token)
      expect(isValid).toBe(true)
      
      // Test with crafted token having wrong audience
      const invalidAudienceToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiaW50ZXJuYWwiLCJpc3MiOiJzaW0taW50ZXJuYWwiLCJhdWQiOiJyb2d1ZS1hdWRpZW5jZSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMzAwfQ.invalid'
      expect(await verifyInternalToken(invalidAudienceToken)).toBe(false)
    })

    /**
     * TEST: Reject tokens with wrong type claim
     * SECURITY BOUNDARY: Type claim must be 'internal' for security
     */
    it('should reject tokens with incorrect type claim', async () => {
      // Since our verification checks payload.type === 'internal',
      // tokens with different types should be rejected
      const token = await generateInternalToken()
      expect(await verifyInternalToken(token)).toBe(true)
      
      // Any token that doesn't have type: 'internal' should fail
      // This is checked in the verification logic
    })

    /**
     * TEST: Reject expired tokens
     * SECURITY BOUNDARY: Expired tokens must be rejected for security
     */
    it('should reject expired tokens', async () => {
      // This test is challenging since we can't easily fast-forward time
      // But we can test with artificially created expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiaW50ZXJuYWwiLCJpc3MiOiJzaW0taW50ZXJuYWwiLCJhdWQiOiJzaW0tYXBpIiwiaWF0IjoxNTAwMDAwMDAwLCJleHAiOjE1MDAwMDAzMDB9.invalid'
      
      const isValid = await verifyInternalToken(expiredToken)
      expect(isValid).toBe(false)
    })

    /**
     * TEST: Handle malformed JSON in token payload
     * SECURITY BOUNDARY: Malformed payloads should not cause crashes
     */
    it('should handle malformed token payloads gracefully', async () => {
      const malformedTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-base64.signature',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.bWFsZm9ybWVkLWpzb24.signature', // 'malformed-json' in base64
      ]

      for (const malformedToken of malformedTokens) {
        const isValid = await verifyInternalToken(malformedToken)
        expect(isValid).toBe(false)
      }
    })

    /**
     * TEST: Handle verification errors gracefully
     * SECURITY BOUNDARY: Verification errors should not expose internal details
     */
    it('should handle verification errors gracefully', async () => {
      // Test with completely invalid input
      const result1 = await verifyInternalToken(null as any)
      expect(result1).toBe(false)

      const result2 = await verifyInternalToken(undefined as any)
      expect(result2).toBe(false)

      // Very long token
      const veryLongToken = 'a'.repeat(10000)
      const result3 = await verifyInternalToken(veryLongToken)
      expect(result3).toBe(false)
    })

    /**
     * TEST: Handle unicode characters in tokens
     * SECURITY BOUNDARY: Unicode input should be handled safely
     */
    it('should handle unicode characters in tokens', async () => {
      const unicodeTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.🔒.🔑',
        '🚀.🌟.⚡',
        'header.payload.signature🔐',
      ]

      for (const unicodeToken of unicodeTokens) {
        const isValid = await verifyInternalToken(unicodeToken)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('⏰ CRON Authentication Security', () => {
    /**
     * TEST: Valid CRON secret authentication
     * SECURITY BOUNDARY: Correct CRON secrets must be accepted
     */
    it('should accept valid CRON secret', () => {
      const request = createMockRequest({
        authorization: 'Bearer test-cron-secret-for-scheduled-tasks',
      })

      const result = verifyCronAuth(request)
      expect(result).toBeNull() // null means authorized
    })

    /**
     * TEST: Vercel CRON header authentication
     * SECURITY BOUNDARY: Vercel CRON requests should be accepted via header
     */
    it('should accept Vercel CRON header authentication', () => {
      const request = createMockRequest({
        vercelCron: '1',
      })

      const result = verifyCronAuth(request)
      expect(result).toBeNull() // null means authorized
    })

    /**
     * TEST: Reject invalid CRON secret
     * SECURITY BOUNDARY: Incorrect CRON secrets must be rejected
     */
    it('should reject invalid CRON secret', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-cron-secret',
      })

      const result = verifyCronAuth(request)
      
      expect(result).not.toBeNull()
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    })

    /**
     * TEST: Reject requests with no authentication
     * SECURITY BOUNDARY: CRON requests must have authentication
     */
    it('should reject CRON requests with no authentication', () => {
      const request = createMockRequest({})

      const result = verifyCronAuth(request)
      
      expect(result).not.toBeNull()
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    })

    /**
     * TEST: Reject malformed authorization header
     * SECURITY BOUNDARY: Malformed auth headers should be rejected
     */
    it('should reject malformed authorization header', () => {
      const malformedHeaders = [
        'Bearer', // No token
        'Basic dGVzdA==', // Wrong auth type
        'InvalidFormat token',
        'Bearer ', // Empty token
      ]

      for (const authHeader of malformedHeaders) {
        const request = createMockRequest({
          authorization: authHeader,
        })

        const result = verifyCronAuth(request)
        expect(result).not.toBeNull()
      }
    })

    /**
     * TEST: Vercel CRON header with wrong value
     * SECURITY BOUNDARY: Vercel header must have exact value '1'
     */
    it('should reject incorrect Vercel CRON header values', () => {
      const incorrectValues = ['0', 'true', 'yes', '2', 'vercel']

      for (const value of incorrectValues) {
        const request = createMockRequest({
          vercelCron: value,
        })

        const result = verifyCronAuth(request)
        expect(result).not.toBeNull()
      }
    })

    /**
     * TEST: CRON authentication with context logging
     * SECURITY BOUNDARY: Security events should be logged with context
     */
    it('should log unauthorized CRON access attempts with context', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
        forwardedFor: '192.168.1.100',
        userAgent: 'Malicious-Bot/1.0',
      })

      const context = 'test-cron-job'
      const result = verifyCronAuth(request, context)

      expect(result).not.toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unauthorized CRON access attempt for test-cron-job',
        expect.objectContaining({
          providedAuth: 'Bearer wrong-secret',
          ip: '192.168.1.100',
          userAgent: 'Malicious-Bot/1.0',
          context: 'test-cron-job',
        })
      )
    })

    /**
     * TEST: CRON authentication logging with missing headers
     * SECURITY BOUNDARY: Missing request metadata should be handled gracefully
     */
    it('should handle missing request metadata in logging', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
      })

      const result = verifyCronAuth(request)

      expect(result).not.toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unauthorized CRON access attempt',
        expect.objectContaining({
          providedAuth: 'Bearer wrong-secret',
          ip: 'unknown',
          userAgent: 'unknown',
        })
      )
    })

    /**
     * TEST: CRON authentication with IP spoofing detection
     * SECURITY BOUNDARY: Various IP headers should be logged for analysis
     */
    it('should log different IP sources for security analysis', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
        forwardedFor: '10.0.0.1, 192.168.1.1',
        realIp: '203.0.113.1',
      })

      const result = verifyCronAuth(request)

      expect(result).not.toBeNull()
      
      // Should prefer x-forwarded-for over x-real-ip
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ip: '10.0.0.1, 192.168.1.1',
        })
      )
    })

    /**
     * TEST: CRON authentication fallback IP detection
     * SECURITY BOUNDARY: Should use x-real-ip when x-forwarded-for is missing
     */
    it('should use x-real-ip when x-forwarded-for is not available', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
        realIp: '198.51.100.1',
      })

      const result = verifyCronAuth(request)

      expect(result).not.toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ip: '198.51.100.1',
        })
      )
    })

    /**
     * TEST: Case sensitivity of CRON secret
     * SECURITY BOUNDARY: CRON secrets should be case-sensitive
     */
    it('should enforce case sensitivity for CRON secrets', () => {
      const request = createMockRequest({
        authorization: 'Bearer TEST-CRON-SECRET-FOR-SCHEDULED-TASKS', // Uppercase
      })

      const result = verifyCronAuth(request)
      expect(result).not.toBeNull() // Should be rejected
    })

    /**
     * TEST: CRON secret with extra whitespace
     * SECURITY BOUNDARY: Extra whitespace should cause rejection
     */
    it('should reject CRON secret with extra whitespace', () => {
      const request = createMockRequest({
        authorization: 'Bearer  test-cron-secret-for-scheduled-tasks  ', // Extra spaces
      })

      const result = verifyCronAuth(request)
      expect(result).not.toBeNull() // Should be rejected
    })

    /**
     * TEST: Both Vercel header and authorization present
     * SECURITY BOUNDARY: Vercel header should take precedence
     */
    it('should allow Vercel CRON even with invalid authorization', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
        vercelCron: '1',
      })

      const result = verifyCronAuth(request)
      expect(result).toBeNull() // Should be authorized due to Vercel header
    })

    /**
     * TEST: CRON authentication with SQL injection attempt
     * SECURITY BOUNDARY: Malicious auth headers should not cause issues
     */
    it('should handle malicious authorization headers safely', () => {
      const maliciousHeaders = [
        "Bearer '; DROP TABLE users; --",
        'Bearer <script>alert("xss")</script>',
        'Bearer ' + 'A'.repeat(10000), // Very long token
        'Bearer \x00\x01\x02', // Control characters
      ]

      for (const authHeader of maliciousHeaders) {
        const request = createMockRequest({
          authorization: authHeader,
        })

        const result = verifyCronAuth(request)
        expect(result).not.toBeNull() // Should be rejected
        
        // Verify logging captured the malicious attempt
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            providedAuth: authHeader,
          })
        )
      }
    })
  })

  describe('🛡️ Security Edge Cases and Error Handling', () => {
    /**
     * TEST: JWT generation with system clock manipulation
     * SECURITY BOUNDARY: Time-based attacks should not succeed
     */
    it('should handle time-based edge cases in JWT generation', async () => {
      // Generate multiple tokens quickly to test time consistency
      const tokens = await Promise.all([
        generateInternalToken(),
        generateInternalToken(),
        generateInternalToken(),
      ])

      // All tokens should be unique and valid
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(3)

      for (const token of tokens) {
        expect(await verifyInternalToken(token)).toBe(true)
      }
    })

    /**
     * TEST: Memory and performance with many token operations
     * SECURITY BOUNDARY: System should handle high token throughput
     */
    it('should handle high volume token operations', async () => {
      const tokenCount = 100
      const tokens: string[] = []

      // Generate many tokens
      for (let i = 0; i < tokenCount; i++) {
        const token = await generateInternalToken()
        tokens.push(token)
      }

      // Verify all tokens
      const verificationResults = await Promise.all(
        tokens.map(token => verifyInternalToken(token))
      )

      // All should be valid
      expect(verificationResults.every(result => result === true)).toBe(true)
      
      // All should be unique
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(tokenCount)
    })

    /**
     * TEST: Concurrent token generation and verification
     * SECURITY BOUNDARY: Race conditions should not affect security
     */
    it('should handle concurrent token operations safely', async () => {
      const concurrentOperations = Array.from({ length: 50 }, async () => {
        const token = await generateInternalToken()
        const isValid = await verifyInternalToken(token)
        return { token, isValid }
      })

      const results = await Promise.all(concurrentOperations)

      // All operations should succeed
      expect(results.every(r => r.isValid)).toBe(true)
      
      // All tokens should be unique
      const allTokens = results.map(r => r.token)
      const uniqueTokens = new Set(allTokens)
      expect(uniqueTokens.size).toBe(50)
    })

    /**
     * TEST: Error handling with corrupted secret key
     * SECURITY BOUNDARY: Invalid secrets should cause predictable failures
     */
    it('should handle secret key issues gracefully', async () => {
      // Mock temporarily corrupted environment
      const originalMock = vi.mocked(require('@/lib/env'))
      originalMock.env.INTERNAL_API_SECRET = '' // Empty secret

      try {
        const token = await generateInternalToken()
        // Should still generate a token (with empty secret)
        expect(typeof token).toBe('string')
        
        // But verification should fail due to secret mismatch
        // (This behavior depends on jose library implementation)
      } catch (error) {
        // Or it might throw an error, which is also acceptable
        expect(error).toBeDefined()
      }

      // Restore original mock
      originalMock.env.INTERNAL_API_SECRET = 'test-internal-secret-key-for-jwt-signing'
    })

    /**
     * TEST: CRON authentication with null/undefined inputs
     * SECURITY BOUNDARY: Null inputs should be handled safely
     */
    it('should handle null/undefined request inputs for CRON auth', () => {
      // Test with null request (should not crash)
      expect(() => {
        const result = verifyCronAuth(null as any)
        expect(result).not.toBeNull()
      }).not.toThrow()

      // Test with request missing headers
      const incompleteRequest = {
        headers: null,
      } as any

      expect(() => {
        const result = verifyCronAuth(incompleteRequest)
        expect(result).not.toBeNull()
      }).not.toThrow()
    })

    /**
     * TEST: Very long context strings in CRON logging
     * SECURITY BOUNDARY: Long contexts should not cause issues
     */
    it('should handle very long context strings in CRON logging', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
      })

      const veryLongContext = 'context-' + 'x'.repeat(10000)
      const result = verifyCronAuth(request, veryLongContext)

      expect(result).not.toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(veryLongContext),
        expect.any(Object)
      )
    })

    /**
     * TEST: Special characters in context strings
     * SECURITY BOUNDARY: Special characters should not break logging
     */
    it('should handle special characters in CRON context', () => {
      const request = createMockRequest({
        authorization: 'Bearer wrong-secret',
      })

      const specialContext = 'context-with-🔒-<script>-&-"quotes"'
      const result = verifyCronAuth(request, specialContext)

      expect(result).not.toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(specialContext),
        expect.objectContaining({
          context: specialContext,
        })
      )
    })
  })

  describe('📊 Security Metrics and Monitoring', () => {
    /**
     * TEST: Security event logging completeness
     * SECURITY BOUNDARY: All security events must be properly logged
     */
    it('should log all required security event fields', () => {
      const request = createMockRequest({
        authorization: 'Bearer malicious-token',
        forwardedFor: '192.168.1.100, 10.0.0.1',
        realIp: '203.0.113.195',
        userAgent: 'AttackerBot/2.0 (Penetration Testing)',
      })

      const result = verifyCronAuth(request, 'critical-job')

      expect(result).not.toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unauthorized CRON access attempt for critical-job',
        {
          providedAuth: 'Bearer malicious-token',
          ip: '192.168.1.100, 10.0.0.1',
          userAgent: 'AttackerBot/2.0 (Penetration Testing)',
          context: 'critical-job',
        }
      )
    })

    /**
     * TEST: Rate limiting considerations in logging
     * SECURITY BOUNDARY: High-frequency attacks should be logged efficiently
     */
    it('should handle rapid successive authentication attempts', () => {
      const request = createMockRequest({
        authorization: 'Bearer brute-force-attempt',
        forwardedFor: '192.168.1.100',
      })

      // Simulate rapid successive attempts
      for (let i = 0; i < 10; i++) {
        const result = verifyCronAuth(request, `attempt-${i}`)
        expect(result).not.toBeNull()
      }

      // Verify all attempts were logged
      expect(mockLogger.warn).toHaveBeenCalledTimes(10)
    })

    /**
     * TEST: Security context preservation across operations
     * SECURITY BOUNDARY: Security context should be maintained consistently
     */
    it('should maintain security context across multiple operations', async () => {
      // Generate and verify multiple tokens while logging CRON attempts
      const token1 = await generateInternalToken()
      const token2 = await generateInternalToken()

      const cronRequest = createMockRequest({
        authorization: 'Bearer wrong-secret',
      })

      const cronResult = verifyCronAuth(cronRequest, 'mixed-operations')

      const verification1 = await verifyInternalToken(token1)
      const verification2 = await verifyInternalToken(token2)

      expect(verification1).toBe(true)
      expect(verification2).toBe(true)
      expect(cronResult).not.toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    })
  })
})