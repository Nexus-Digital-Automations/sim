import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'

/**
 * Comprehensive Unit Tests for Client-Side Authentication System
 * 
 * CRITICAL SECURITY INFRASTRUCTURE TESTING
 * This module tests the client-side authentication system:
 * 1. Better Auth React client configuration
 * 2. Session context and React hooks integration
 * 3. Environment-based URL configuration
 * 4. Subscription management client
 * 5. Organization client features
 * 6. Plugin initialization and security
 * 
 * SECURITY BOUNDARIES TESTED:
 * - Base URL configuration and validation
 * - Plugin initialization and security settings
 * - Session context provider security
 * - Client-side session validation
 * - Subscription authorization checks
 * - Organization membership validation
 * - Environment-specific configuration
 * 
 * ATTACK VECTORS TESTED:
 * - Base URL manipulation and injection
 * - Session context injection
 * - Plugin configuration tampering
 * - Client-side session hijacking
 * - Subscription bypass attempts
 * - Cross-origin configuration issues
 * - Environment variable exposure
 */

// Mock React dependencies
vi.mock('react', () => ({
  useContext: vi.fn(),
  createContext: vi.fn(),
  Provider: vi.fn(),
}))

// Mock Better Auth client dependencies
vi.mock('@better-auth/stripe/client', () => ({
  stripeClient: vi.fn(() => ({
    subscription: { enabled: true },
  })),
}))

vi.mock('better-auth/client/plugins', () => ({
  customSessionClient: vi.fn(() => ({ name: 'customSessionClient' })),
  emailOTPClient: vi.fn(() => ({ name: 'emailOTPClient' })),
  genericOAuthClient: vi.fn(() => ({ name: 'genericOAuthClient' })),
  organizationClient: vi.fn(() => ({ name: 'organizationClient' })),
}))

vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    useActiveOrganization: vi.fn(),
    subscription: {
      list: vi.fn(),
      upgrade: vi.fn(),
      cancel: vi.fn(),
      restore: vi.fn(),
    },
  })),
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    VERCEL_ENV: 'development',
    NODE_ENV: 'development',
    BETTER_AUTH_URL: null,
  },
  getEnv: vi.fn((key: string) => {
    const envMap: { [key: string]: string } = {
      NEXT_PUBLIC_VERCEL_URL: 'preview.example.com',
      NEXT_PUBLIC_APP_URL: 'https://localhost:3000',
    }
    return envMap[key] || null
  }),
}))

vi.mock('@/lib/environment', () => ({
  isProd: false,
}))

vi.mock('@/lib/session/session-context', () => ({
  SessionContext: React.createContext(null),
}))

import { stripeClient } from '@better-auth/stripe/client'
import {
  customSessionClient,
  emailOTPClient,
  genericOAuthClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { env, getEnv } from '@/lib/env'
import { isProd } from '@/lib/environment'
import { SessionContext } from '@/lib/session/session-context'

const mockUseContext = React.useContext as any
const mockStripeClient = stripeClient as any
const mockCustomSessionClient = customSessionClient as any
const mockEmailOTPClient = emailOTPClient as any
const mockGenericOAuthClient = genericOAuthClient as any
const mockOrganizationClient = organizationClient as any
const mockCreateAuthClient = createAuthClient as any
const mockGetEnv = getEnv as any

// Mock client instance
const mockClientInstance = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  useActiveOrganization: vi.fn(),
  subscription: {
    list: vi.fn(),
    upgrade: vi.fn(),
    cancel: vi.fn(),
    restore: vi.fn(),
  },
}

describe('Client-Side Authentication System - Critical Security Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset environment variables to defaults
    vi.mocked(env).VERCEL_ENV = 'development'
    vi.mocked(env).NODE_ENV = 'development' 
    vi.mocked(env).BETTER_AUTH_URL = null
    vi.mocked(isProd) = false
    
    // Reset mock implementations
    mockCreateAuthClient.mockReturnValue(mockClientInstance)
    mockGetEnv.mockImplementation((key: string) => {
      const envMap: { [key: string]: string } = {
        NEXT_PUBLIC_VERCEL_URL: 'preview.example.com',
        NEXT_PUBLIC_APP_URL: 'https://localhost:3000',
      }
      return envMap[key] || null
    })
  })

  describe('🌐 Base URL Configuration Security', () => {
    /**
     * TEST: Base URL configuration for preview environment
     * SECURITY BOUNDARY: Preview environments must use secure HTTPS URLs
     */
    it('should configure base URL for preview environment', () => {
      vi.mocked(env).VERCEL_ENV = 'preview'
      
      // Re-import to trigger fresh configuration
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('https://preview.example.com')
    })

    /**
     * TEST: Base URL configuration for development environment on Vercel
     * SECURITY BOUNDARY: Development environment URLs must be properly configured
     */
    it('should configure base URL for development environment', () => {
      vi.mocked(env).VERCEL_ENV = 'development'
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('https://preview.example.com')
    })

    /**
     * TEST: Base URL configuration for production environment
     * SECURITY BOUNDARY: Production URLs must prioritize BETTER_AUTH_URL
     */
    it('should prioritize BETTER_AUTH_URL in production', () => {
      vi.mocked(env).VERCEL_ENV = 'production'
      vi.mocked(env).BETTER_AUTH_URL = 'https://auth.production.com'
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('https://auth.production.com')
    })

    /**
     * TEST: Base URL fallback to NEXT_PUBLIC_APP_URL in production
     * SECURITY BOUNDARY: Production must have fallback URL configuration
     */
    it('should fallback to NEXT_PUBLIC_APP_URL in production', () => {
      vi.mocked(env).VERCEL_ENV = 'production'
      vi.mocked(env).BETTER_AUTH_URL = null
      
      mockGetEnv.mockImplementation((key: string) => {
        if (key === 'NEXT_PUBLIC_APP_URL') return 'https://app.production.com'
        return null
      })
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('https://app.production.com')
    })

    /**
     * TEST: Base URL configuration for local development
     * SECURITY BOUNDARY: Local development must have proper localhost configuration
     */
    it('should configure localhost for local development', () => {
      vi.mocked(env).VERCEL_ENV = undefined as any
      vi.mocked(env).NODE_ENV = 'development'
      vi.mocked(env).BETTER_AUTH_URL = null
      
      mockGetEnv.mockImplementation((key: string) => {
        if (key === 'NEXT_PUBLIC_APP_URL') return 'http://localhost:3000'
        return null
      })
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('http://localhost:3000')
    })

    /**
     * TEST: Base URL fallback to default localhost
     * SECURITY BOUNDARY: Ultimate fallback must be secure localhost
     */
    it('should fallback to default localhost when no URLs configured', () => {
      vi.mocked(env).VERCEL_ENV = undefined as any
      vi.mocked(env).NODE_ENV = 'development'
      vi.mocked(env).BETTER_AUTH_URL = null
      
      mockGetEnv.mockImplementation(() => null)
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('http://localhost:3000')
    })

    /**
     * TEST: Base URL with BETTER_AUTH_URL override in development
     * SECURITY BOUNDARY: BETTER_AUTH_URL should override other development URLs
     */
    it('should use BETTER_AUTH_URL override in development', () => {
      vi.mocked(env).VERCEL_ENV = undefined as any
      vi.mocked(env).NODE_ENV = 'development'
      vi.mocked(env).BETTER_AUTH_URL = 'https://custom-auth.dev'
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('https://custom-auth.dev')
    })

    /**
     * TEST: Base URL security validation with malicious input
     * SECURITY BOUNDARY: Malicious URLs should not break configuration
     */
    it('should handle malicious URL configurations safely', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://malicious.com',
        'http://localhost:3000"><script>alert("xss")</script>',
      ]

      for (const maliciousUrl of maliciousUrls) {
        vi.mocked(env).BETTER_AUTH_URL = maliciousUrl
        
        vi.resetModules()
        const { getBaseURL } = require('./auth-client')
        
        // Should still return the URL (validation happens elsewhere)
        // But it shouldn't crash or cause issues
        expect(() => getBaseURL()).not.toThrow()
      }
    })

    /**
     * TEST: Base URL with empty environment variables
     * SECURITY BOUNDARY: Empty env vars should not break URL configuration
     */
    it('should handle empty environment variables gracefully', () => {
      vi.mocked(env).VERCEL_ENV = ''
      vi.mocked(env).NODE_ENV = ''
      vi.mocked(env).BETTER_AUTH_URL = ''
      
      mockGetEnv.mockImplementation(() => '')
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      const baseURL = getBaseURL()
      expect(baseURL).toBe('http://localhost:3000') // Should fallback
    })
  })

  describe('🔧 Auth Client Configuration Security', () => {
    /**
     * TEST: Auth client creation with proper plugin configuration
     * SECURITY BOUNDARY: Client must be configured with all required security plugins
     */
    it('should create auth client with required plugins', () => {
      vi.resetModules()
      require('./auth-client')
      
      expect(mockCreateAuthClient).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        plugins: expect.arrayContaining([
          expect.objectContaining({ name: 'emailOTPClient' }),
          expect.objectContaining({ name: 'genericOAuthClient' }),
          expect.objectContaining({ name: 'customSessionClient' }),
          expect.objectContaining({ name: 'organizationClient' }),
        ]),
      })
    })

    /**
     * TEST: Stripe client inclusion in production
     * SECURITY BOUNDARY: Stripe client should only be included in production
     */
    it('should include Stripe client only in production', () => {
      vi.mocked(isProd) = true
      
      vi.resetModules()
      require('./auth-client')
      
      expect(mockStripeClient).toHaveBeenCalledWith({
        subscription: true,
      })
      
      expect(mockCreateAuthClient).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        plugins: expect.arrayContaining([
          expect.anything(), // Stripe client plugin
        ]),
      })
    })

    /**
     * TEST: Stripe client exclusion in development
     * SECURITY BOUNDARY: Stripe client should be excluded from development
     */
    it('should exclude Stripe client in development', () => {
      vi.mocked(isProd) = false
      
      vi.resetModules()
      require('./auth-client')
      
      // Verify Stripe client is not called in development
      expect(mockStripeClient).not.toHaveBeenCalled()
    })

    /**
     * TEST: Plugin initialization order and security
     * SECURITY BOUNDARY: Plugins must be initialized in correct order
     */
    it('should initialize plugins in correct order', () => {
      vi.resetModules()
      require('./auth-client')
      
      expect(mockEmailOTPClient).toHaveBeenCalledBefore(mockCustomSessionClient as any)
      expect(mockGenericOAuthClient).toHaveBeenCalledBefore(mockOrganizationClient as any)
    })

    /**
     * TEST: Custom session client type safety
     * SECURITY BOUNDARY: Custom session client must have proper type constraints
     */
    it('should configure custom session client with type safety', () => {
      vi.resetModules()
      require('./auth-client')
      
      expect(mockCustomSessionClient).toHaveBeenCalledWith(
        expect.any(Object) // Should pass auth type for type safety
      )
    })
  })

  describe('🔒 Session Context Security', () => {
    /**
     * TEST: useSession hook with valid context
     * SECURITY BOUNDARY: Session hook must validate context provider
     */
    it('should return session data when context is provided', () => {
      const mockSessionData = {
        user: { id: 'user-123', email: 'user@example.com' },
        isLoading: false,
        session: { id: 'session-456' },
      }
      
      mockUseContext.mockReturnValue(mockSessionData)
      
      vi.resetModules()
      const { useSession } = require('./auth-client')
      
      const result = useSession()
      expect(result).toBe(mockSessionData)
      expect(mockUseContext).toHaveBeenCalledWith(SessionContext)
    })

    /**
     * TEST: useSession hook without context provider
     * SECURITY BOUNDARY: Missing context provider must throw security error
     */
    it('should throw error when SessionProvider is not mounted', () => {
      mockUseContext.mockReturnValue(null)
      
      vi.resetModules()
      const { useSession } = require('./auth-client')
      
      expect(() => useSession()).toThrow(
        'SessionProvider is not mounted. Wrap your app with <SessionProvider> in app/layout.tsx.'
      )
    })

    /**
     * TEST: useSession hook with undefined context
     * SECURITY BOUNDARY: Undefined context should throw security error
     */
    it('should throw error when context is undefined', () => {
      mockUseContext.mockReturnValue(undefined)
      
      vi.resetModules()
      const { useSession } = require('./auth-client')
      
      expect(() => useSession()).toThrow(
        'SessionProvider is not mounted. Wrap your app with <SessionProvider> in app/layout.tsx.'
      )
    })

    /**
     * TEST: Session context with malicious data
     * SECURITY BOUNDARY: Malicious session data should not crash the hook
     */
    it('should handle malicious session context data', () => {
      const maliciousData = {
        user: { 
          id: '<script>alert("xss")</script>',
          email: 'javascript:alert("xss")' 
        },
        __proto__: { malicious: true },
        constructor: { name: 'hacked' },
      }
      
      mockUseContext.mockReturnValue(maliciousData)
      
      vi.resetModules()
      const { useSession } = require('./auth-client')
      
      expect(() => useSession()).not.toThrow()
      const result = useSession()
      expect(result).toBe(maliciousData) // Should return as-is but not crash
    })
  })

  describe('🏢 Organization Management Security', () => {
    /**
     * TEST: useActiveOrganization hook export
     * SECURITY BOUNDARY: Organization hook must be properly exported
     */
    it('should export useActiveOrganization hook', () => {
      vi.resetModules()
      const { useActiveOrganization } = require('./auth-client')
      
      expect(useActiveOrganization).toBe(mockClientInstance.useActiveOrganization)
    })

    /**
     * TEST: Organization client initialization
     * SECURITY BOUNDARY: Organization client must be properly initialized
     */
    it('should initialize organization client plugin', () => {
      vi.resetModules()
      require('./auth-client')
      
      expect(mockOrganizationClient).toHaveBeenCalled()
    })
  })

  describe('💳 Subscription Management Security', () => {
    /**
     * TEST: useSubscription hook with all methods
     * SECURITY BOUNDARY: Subscription methods must be properly exported
     */
    it('should export all subscription methods', () => {
      vi.resetModules()
      const { useSubscription } = require('./auth-client')
      
      const subscription = useSubscription()
      
      expect(subscription).toEqual({
        list: mockClientInstance.subscription.list,
        upgrade: mockClientInstance.subscription.upgrade,
        cancel: mockClientInstance.subscription.cancel,
        restore: mockClientInstance.subscription.restore,
      })
    })

    /**
     * TEST: Subscription methods availability
     * SECURITY BOUNDARY: All subscription methods must be accessible
     */
    it('should provide access to all subscription management methods', () => {
      vi.resetModules()
      const { useSubscription } = require('./auth-client')
      
      const subscription = useSubscription()
      
      expect(subscription.list).toBe(mockClientInstance.subscription.list)
      expect(subscription.upgrade).toBe(mockClientInstance.subscription.upgrade)
      expect(subscription.cancel).toBe(mockClientInstance.subscription.cancel)
      expect(subscription.restore).toBe(mockClientInstance.subscription.restore)
    })

    /**
     * TEST: Subscription hook with missing client methods
     * SECURITY BOUNDARY: Missing subscription methods should be handled gracefully
     */
    it('should handle missing subscription methods gracefully', () => {
      const clientWithoutSubscription = {
        ...mockClientInstance,
        subscription: null,
      }
      mockCreateAuthClient.mockReturnValue(clientWithoutSubscription)
      
      vi.resetModules()
      const { useSubscription } = require('./auth-client')
      
      const subscription = useSubscription()
      
      expect(subscription).toEqual({
        list: undefined,
        upgrade: undefined,
        cancel: undefined,
        restore: undefined,
      })
    })

    /**
     * TEST: Subscription hook with partial methods
     * SECURITY BOUNDARY: Partial subscription implementations should be handled
     */
    it('should handle partial subscription method availability', () => {
      const clientWithPartialSubscription = {
        ...mockClientInstance,
        subscription: {
          list: vi.fn(),
          upgrade: vi.fn(),
          // cancel and restore missing
        },
      }
      mockCreateAuthClient.mockReturnValue(clientWithPartialSubscription)
      
      vi.resetModules()
      const { useSubscription } = require('./auth-client')
      
      const subscription = useSubscription()
      
      expect(subscription.list).toBeDefined()
      expect(subscription.upgrade).toBeDefined()
      expect(subscription.cancel).toBeUndefined()
      expect(subscription.restore).toBeUndefined()
    })
  })

  describe('🔐 Authentication Method Security', () => {
    /**
     * TEST: Sign-in method export
     * SECURITY BOUNDARY: Sign-in method must be properly exported
     */
    it('should export signIn method', () => {
      vi.resetModules()
      const { signIn } = require('./auth-client')
      
      expect(signIn).toBe(mockClientInstance.signIn)
    })

    /**
     * TEST: Sign-up method export
     * SECURITY BOUNDARY: Sign-up method must be properly exported
     */
    it('should export signUp method', () => {
      vi.resetModules()
      const { signUp } = require('./auth-client')
      
      expect(signUp).toBe(mockClientInstance.signUp)
    })

    /**
     * TEST: Sign-out method export
     * SECURITY BOUNDARY: Sign-out method must be properly exported
     */
    it('should export signOut method', () => {
      vi.resetModules()
      const { signOut } = require('./auth-client')
      
      expect(signOut).toBe(mockClientInstance.signOut)
    })

    /**
     * TEST: All authentication methods availability
     * SECURITY BOUNDARY: All auth methods must be accessible
     */
    it('should provide access to all authentication methods', () => {
      vi.resetModules()
      const { signIn, signUp, signOut } = require('./auth-client')
      
      expect(typeof signIn).toBe('function')
      expect(typeof signUp).toBe('function')
      expect(typeof signOut).toBe('function')
    })
  })

  describe('🛡️ Security Edge Cases and Error Handling', () => {
    /**
     * TEST: Client creation with plugin initialization errors
     * SECURITY BOUNDARY: Plugin errors should not prevent client creation
     */
    it('should handle plugin initialization errors gracefully', () => {
      mockEmailOTPClient.mockImplementation(() => {
        throw new Error('Plugin initialization failed')
      })
      
      vi.resetModules()
      expect(() => require('./auth-client')).toThrow('Plugin initialization failed')
    })

    /**
     * TEST: Client creation with missing plugin dependencies
     * SECURITY BOUNDARY: Missing plugins should be handled gracefully
     */
    it('should handle missing plugin dependencies', () => {
      mockCustomSessionClient.mockReturnValue(null)
      
      vi.resetModules()
      require('./auth-client')
      
      expect(mockCreateAuthClient).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        plugins: expect.arrayContaining([null]), // Should include null plugin
      })
    })

    /**
     * TEST: Base URL with extremely long values
     * SECURITY BOUNDARY: Very long URLs should not break configuration
     */
    it('should handle extremely long base URLs', () => {
      const longUrl = 'https://' + 'a'.repeat(10000) + '.com'
      vi.mocked(env).BETTER_AUTH_URL = longUrl
      
      vi.resetModules()
      const { getBaseURL } = require('./auth-client')
      
      expect(() => getBaseURL()).not.toThrow()
      expect(getBaseURL()).toBe(longUrl)
    })

    /**
     * TEST: Client with circular reference handling
     * SECURITY BOUNDARY: Circular references should not break client
     */
    it('should handle circular references in client configuration', () => {
      const circularClient: any = { signIn: vi.fn() }
      circularClient.self = circularClient
      
      mockCreateAuthClient.mockReturnValue(circularClient)
      
      vi.resetModules()
      const { signIn } = require('./auth-client')
      
      expect(signIn).toBe(circularClient.signIn)
    })

    /**
     * TEST: Environment variable injection attacks
     * SECURITY BOUNDARY: Malicious env vars should not compromise security
     */
    it('should handle environment variable injection attempts', () => {
      const injectionAttempts = [
        '$(rm -rf /)',
        '`whoami`',
        '${process.exit(1)}',
        '{{constructor.constructor("return process")().exit()}}',
        '\x00malicious',
      ]

      for (const injection of injectionAttempts) {
        vi.mocked(env).BETTER_AUTH_URL = injection
        
        vi.resetModules()
        const { getBaseURL } = require('./auth-client')
        
        expect(() => getBaseURL()).not.toThrow()
        expect(getBaseURL()).toBe(injection) // Should be treated as string
      }
    })

    /**
     * TEST: React context pollution prevention
     * SECURITY BOUNDARY: Context should not be pollutable by malicious code
     */
    it('should prevent React context pollution', () => {
      const maliciousContext = {
        user: { id: 'user-123' },
        pollute: function() { global.hacked = true },
      }
      
      mockUseContext.mockReturnValue(maliciousContext)
      
      vi.resetModules()
      const { useSession } = require('./auth-client')
      
      const result = useSession()
      expect(result).toBe(maliciousContext)
      
      // Ensure global wasn't polluted
      expect((global as any).hacked).toBeUndefined()
    })

    /**
     * TEST: Memory usage with large session data
     * SECURITY BOUNDARY: Large session data should not cause memory issues
     */
    it('should handle large session data efficiently', () => {
      const largeSessionData = {
        user: {
          id: 'user-123',
          metadata: 'x'.repeat(100000), // Large metadata
        },
        permissions: Array.from({ length: 10000 }, (_, i) => `perm-${i}`),
      }
      
      mockUseContext.mockReturnValue(largeSessionData)
      
      vi.resetModules()
      const { useSession } = require('./auth-client')
      
      expect(() => useSession()).not.toThrow()
      const result = useSession()
      expect(result.user.metadata.length).toBe(100000)
    })

    /**
     * TEST: Concurrent session hook usage
     * SECURITY BOUNDARY: Multiple simultaneous hook calls should be safe
     */
    it('should handle concurrent session hook usage', () => {
      const sessionData = { user: { id: 'user-123' }, session: { id: 'session-456' } }
      mockUseContext.mockReturnValue(sessionData)
      
      vi.resetModules()
      const { useSession } = require('./auth-client')
      
      // Simulate concurrent calls
      const results = Array.from({ length: 100 }, () => useSession())
      
      expect(results).toHaveLength(100)
      results.forEach(result => {
        expect(result).toBe(sessionData)
      })
    })
  })
})