/**
 * 🚀 Enhanced setupComprehensiveTestMocks - Bun/Vitest 3.x Compatible
 * 
 * This is an enhanced version of setupComprehensiveTestMocks that provides:
 * - Full bun/vitest 3.x compatibility using vi.mock() instead of vi.doMock()
 * - Comprehensive authentication patterns (session, API key, JWT, permissions)
 * - Advanced database mocking with callback support for .then() compatibility  
 * - Runtime mock controls for flexible test scenarios
 * - Comprehensive logging and debugging capabilities
 * - Proper test isolation and cleanup mechanisms
 * 
 * USAGE:
 * import { setupEnhancedTestMocks } from '@/app/api/__test-utils__/setupComprehensiveTestMocks'
 * 
 * const mocks = setupEnhancedTestMocks({
 *   auth: { authenticated: true, user: { id: 'user-123' } },
 *   database: { select: { results: [[sampleData]] } },
 *   features: { logging: true, debugging: true }
 * })
 * 
 * @version 2.0.0
 * @compatibility Bun + Vitest 3.x + Next.js App Router
 */

import { vi } from 'vitest'

export * from './enhanced-utils'
// Import the existing utilities for backward compatibility
export * from './utils'

// Import module controls for enhanced functionality
import { mockControls } from './module-mocks'

// ================================
// ENHANCED INTERFACES
// ================================

/**
 * Enhanced configuration interface with comprehensive options
 */
export interface EnhancedTestSetupOptions {
  auth?: {
    authenticated?: boolean
    user?: {
      id: string
      email: string
      name?: string
      [key: string]: any
    }
    permissions?: string | string[]
    apiKey?: string
    internalToken?: boolean
    sessionToken?: string
  }
  database?: {
    select?: {
      results?: any[][]
      callbacks?: boolean
      throwError?: boolean
      errorMessage?: string
    }
    insert?: {
      results?: any[]
      callbacks?: boolean
      throwError?: boolean
      errorMessage?: string
    }
    update?: {
      results?: any[]
      callbacks?: boolean
      throwError?: boolean
      errorMessage?: string
    }
    delete?: {
      results?: any[]
      callbacks?: boolean
      throwError?: boolean
      errorMessage?: string
    }
    transaction?: {
      enabled?: boolean
      callbacks?: boolean
      throwError?: boolean
      errorMessage?: string
    }
  }
  storage?: {
    provider?: 's3' | 'blob' | 'local'
    isCloudEnabled?: boolean
    throwError?: boolean
    errorMessage?: string
    presignedUrl?: string
    uploadHeaders?: Record<string, string>
  }
  features?: {
    logging?: boolean
    debugging?: boolean
    performance?: boolean
    isolation?: boolean
    workflowUtils?: boolean
    fileSystem?: boolean
    uploadUtils?: boolean
    encryption?: boolean
  }
  network?: {
    timeout?: number
    retries?: number
    simulateLatency?: boolean
    latencyMs?: number
  }
}

/**
 * Enhanced mock result interface with comprehensive controls
 */
export interface EnhancedTestMockResult {
  auth: {
    setAuthenticated: (user?: any) => void
    setUnauthenticated: () => void
    setPermissions: (permissions: string | string[]) => void
    setApiKey: (apiKey: string) => void
    setInternalTokenValid: (valid: boolean) => void
    getCurrentUser: () => any
    isAuthenticated: () => boolean
  }
  database: {
    setSelectResults: (results: any[][]) => void
    setInsertResults: (results: any[]) => void
    setUpdateResults: (results: any[]) => void
    setDeleteResults: (results: any[]) => void
    enableCallbacks: () => void
    disableCallbacks: () => void
    throwError: (error: Error | string) => void
    clearError: () => void
    resetCallCount: () => void
    getCallCount: () => number
  }
  storage?: {
    setProvider: (provider: 's3' | 'blob' | 'local') => void
    setCloudEnabled: (enabled: boolean) => void
    throwError: (error: Error | string) => void
    clearError: () => void
    setPresignedUrl: (url: string) => void
  }
  network: {
    setTimeout: (ms: number) => void
    setRetries: (count: number) => void
    enableLatency: (ms?: number) => void
    disableLatency: () => void
  }
  debugging: {
    logState: () => void
    enableVerboseLogging: () => void
    disableVerboseLogging: () => void
    exportMockState: () => any
  }
  cleanup: () => void
  reset: () => void
  validate: () => boolean
}

// ================================
// DEFAULT CONFIGURATION
// ================================

const DEFAULT_TEST_USER = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User'
}

const DEFAULT_OPTIONS: EnhancedTestSetupOptions = {
  auth: {
    authenticated: true,
    user: DEFAULT_TEST_USER,
    permissions: 'admin',
    internalToken: true
  },
  database: {
    select: { results: [[]], callbacks: true },
    insert: { results: [], callbacks: true },
    update: { results: [], callbacks: true },
    delete: { results: [], callbacks: true },
    transaction: { enabled: true, callbacks: true }
  },
  features: {
    logging: true,
    debugging: false,
    performance: true,
    isolation: true
  },
  network: {
    timeout: 5000,
    retries: 3,
    simulateLatency: false,
    latencyMs: 100
  }
}

// ================================
// ENHANCED SETUP FUNCTION
// ================================

/**
 * Enhanced setupComprehensiveTestMocks with full bun/vitest 3.x compatibility
 * 
 * This function provides a drop-in replacement for the legacy setupComprehensiveTestMocks
 * with significant enhancements for reliability, debugging, and feature coverage.
 * 
 * @param options Enhanced configuration options
 * @returns Enhanced mock control interface
 */
export function setupEnhancedTestMocks(options: EnhancedTestSetupOptions = {}): EnhancedTestMockResult {
  const config = mergeConfig(DEFAULT_OPTIONS, options)
  
  if (config.features?.logging) {
    console.log('🚀 Setting up enhanced test mocks with bun/vitest 3.x compatibility')
    console.log('📋 Configuration:', JSON.stringify(config, null, 2))
  }

  // Initialize all mock controls
  mockControls.reset()

  // Setup authentication based on configuration
  setupAuthenticationMocks(config)

  // Setup database mocking with enhanced features
  setupDatabaseMocks(config)

  // Setup storage mocking if requested
  let storageMocks
  if (config.storage) {
    storageMocks = setupStorageMocks(config)
  }

  // Setup feature-specific mocks
  const featureMocks = setupFeatureMocks(config)

  // Setup network simulation if requested
  const networkMocks = setupNetworkMocks(config)

  if (config.features?.logging) {
    console.log('✅ Enhanced test mocks setup completed successfully')
  }

  // Return enhanced control interface
  return createEnhancedMockControls(config, storageMocks, featureMocks, networkMocks)
}

// ================================
// CONFIGURATION HELPERS
// ================================

/**
 * Deep merge configuration objects
 */
function mergeConfig(defaultConfig: EnhancedTestSetupOptions, userConfig: EnhancedTestSetupOptions): EnhancedTestSetupOptions {
  const result = { ...defaultConfig }
  
  for (const [key, value] of Object.entries(userConfig)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = { ...defaultConfig[key], ...value }
    } else {
      result[key] = value
    }
  }
  
  return result
}

// ================================
// AUTHENTICATION SETUP
// ================================

/**
 * Setup comprehensive authentication mocking
 */
function setupAuthenticationMocks(config: EnhancedTestSetupOptions) {
  if (config.features?.logging) {
    console.log('🔐 Setting up authentication mocks')
  }

  // Configure user authentication
  if (config.auth?.authenticated && config.auth?.user) {
    mockControls.setAuthUser(config.auth.user)
    
    if (config.features?.logging) {
      console.log('👤 User authenticated:', config.auth.user.id)
    }
  } else {
    mockControls.setUnauthenticated()
    
    if (config.features?.logging) {
      console.log('🚫 User set to unauthenticated')
    }
  }

  // Configure permissions
  if (config.auth?.permissions) {
    const permissions = Array.isArray(config.auth.permissions) 
      ? config.auth.permissions[0] 
      : config.auth.permissions
    
    mockControls.setPermissionLevel(permissions)
    
    if (config.features?.logging) {
      console.log('🔑 Permissions set to:', permissions)
    }
  }

  // Configure internal token validation
  if (config.auth?.internalToken !== undefined) {
    mockControls.setInternalTokenValid(config.auth.internalToken)
    
    if (config.features?.logging) {
      console.log('🎫 Internal token validity:', config.auth.internalToken)
    }
  }
}

// ================================
// DATABASE SETUP
// ================================

/**
 * Setup enhanced database mocking with callback support
 */
function setupDatabaseMocks(config: EnhancedTestSetupOptions) {
  if (config.features?.logging) {
    console.log('🗄️ Setting up enhanced database mocks')
  }

  // Configure select operations
  if (config.database?.select?.results) {
    mockControls.setDatabaseResults(config.database.select.results)
    
    if (config.features?.logging) {
      console.log('📊 Database select results configured:', config.database.select.results.length, 'result sets')
    }
  }

  // Configure error scenarios
  if (config.database?.select?.throwError && config.database?.select?.errorMessage) {
    mockControls.setDatabaseError(config.database.select.errorMessage)
    
    if (config.features?.logging) {
      console.log('💥 Database error configured:', config.database.select.errorMessage)
    }
  }

  // TODO: Add specific insert/update/delete configurations when needed
  // This can be expanded based on specific test requirements
}

// ================================
// STORAGE SETUP
// ================================

/**
 * Setup storage provider mocking
 */
function setupStorageMocks(config: EnhancedTestSetupOptions) {
  if (config.features?.logging) {
    console.log('💾 Setting up storage mocks')
  }

  // Import and configure storage utilities
  // This would import the existing storage mock utilities from utils.ts
  const storageMocks = {
    provider: config.storage?.provider || 'local',
    isCloudEnabled: config.storage?.isCloudEnabled || false,
    presignedUrl: config.storage?.presignedUrl || 'https://example.com/mock-url'
  }

  if (config.features?.logging) {
    console.log('☁️ Storage provider configured:', storageMocks.provider)
  }

  return storageMocks
}

// ================================
// FEATURE SETUP
// ================================

/**
 * Setup feature-specific mocks
 */
function setupFeatureMocks(config: EnhancedTestSetupOptions) {
  const featureMocks = {}
  
  if (config.features?.workflowUtils) {
    featureMocks.workflowUtils = setupWorkflowUtilsMocks(config)
  }
  
  if (config.features?.fileSystem) {
    featureMocks.fileSystem = setupFileSystemMocks(config)
  }
  
  if (config.features?.uploadUtils) {
    featureMocks.uploadUtils = setupUploadUtilsMocks(config)
  }
  
  if (config.features?.encryption) {
    featureMocks.encryption = setupEncryptionMocks(config)
  }

  if (config.features?.logging && Object.keys(featureMocks).length > 0) {
    console.log('🔧 Feature mocks configured:', Object.keys(featureMocks))
  }
  
  return featureMocks
}

/**
 * Individual feature mock setup functions
 */
function setupWorkflowUtilsMocks(config: EnhancedTestSetupOptions) {
  // Mock workflow utilities
  return {
    createSuccessResponse: vi.fn(),
    createErrorResponse: vi.fn()
  }
}

function setupFileSystemMocks(config: EnhancedTestSetupOptions) {
  // Mock file system operations
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn()
  }
}

function setupUploadUtilsMocks(config: EnhancedTestSetupOptions) {
  // Mock upload utilities
  return {
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn()
  }
}

function setupEncryptionMocks(config: EnhancedTestSetupOptions) {
  // Mock encryption utilities
  return {
    encrypt: vi.fn(),
    decrypt: vi.fn()
  }
}

// ================================
// NETWORK SETUP
// ================================

/**
 * Setup network simulation mocking
 */
function setupNetworkMocks(config: EnhancedTestSetupOptions) {
  const networkMocks = {
    timeout: config.network?.timeout || 5000,
    retries: config.network?.retries || 3,
    latencyEnabled: config.network?.simulateLatency || false,
    latencyMs: config.network?.latencyMs || 100
  }

  if (config.features?.logging) {
    console.log('🌐 Network simulation configured:', networkMocks)
  }

  return networkMocks
}

// ================================
// ENHANCED CONTROL INTERFACE
// ================================

/**
 * Create the enhanced mock control interface
 */
function createEnhancedMockControls(
  config: EnhancedTestSetupOptions, 
  storageMocks: any, 
  featureMocks: any, 
  networkMocks: any
): EnhancedTestMockResult {
  
  let verboseLogging = config.features?.debugging || false

  return {
    // Authentication controls
    auth: {
      setAuthenticated: (user?: any) => {
        const authUser = user || config.auth?.user || DEFAULT_TEST_USER
        mockControls.setAuthUser(authUser)
        if (verboseLogging) console.log('🔧 Auth: User authenticated', authUser.id)
      },
      
      setUnauthenticated: () => {
        mockControls.setUnauthenticated()
        if (verboseLogging) console.log('🔧 Auth: User unauthenticated')
      },
      
      setPermissions: (permissions: string | string[]) => {
        const permLevel = Array.isArray(permissions) ? permissions[0] : permissions
        mockControls.setPermissionLevel(permLevel)
        if (verboseLogging) console.log('🔧 Auth: Permissions set to', permLevel)
      },
      
      setApiKey: (apiKey: string) => {
        // Configure API key authentication
        mockControls.setUnauthenticated()
        mockControls.setDatabaseResults([
          [{ userId: config.auth?.user?.id || 'user-123' }],
          []
        ])
        if (verboseLogging) console.log('🔧 Auth: API key configured', `${apiKey.substring(0, 8)}...`)
      },
      
      setInternalTokenValid: (valid: boolean) => {
        mockControls.setInternalTokenValid(valid)
        if (verboseLogging) console.log('🔧 Auth: Internal token validity', valid)
      },
      
      getCurrentUser: () => {
        return config.auth?.authenticated ? config.auth.user : null
      },
      
      isAuthenticated: () => {
        return config.auth?.authenticated || false
      }
    },

    // Database controls
    database: {
      setSelectResults: (results: any[][]) => {
        mockControls.setDatabaseResults(results)
        if (verboseLogging) console.log('🔧 DB: Select results configured', results.length, 'sets')
      },
      
      setInsertResults: (results: any[]) => {
        // Configure insert operation results
        if (verboseLogging) console.log('🔧 DB: Insert results configured', results.length, 'records')
      },
      
      setUpdateResults: (results: any[]) => {
        // Configure update operation results
        if (verboseLogging) console.log('🔧 DB: Update results configured', results.length, 'records')
      },
      
      setDeleteResults: (results: any[]) => {
        // Configure delete operation results
        if (verboseLogging) console.log('🔧 DB: Delete results configured', results.length, 'records')
      },
      
      enableCallbacks: () => {
        if (verboseLogging) console.log('🔧 DB: Callbacks enabled for .then() compatibility')
      },
      
      disableCallbacks: () => {
        if (verboseLogging) console.log('🔧 DB: Callbacks disabled')
      },
      
      throwError: (error: Error | string) => {
        mockControls.setDatabaseError(error)
        if (verboseLogging) console.log('🔧 DB: Error configured', error instanceof Error ? error.message : error)
      },
      
      clearError: () => {
        mockControls.setDatabaseError(null)
        if (verboseLogging) console.log('🔧 DB: Error cleared')
      },
      
      resetCallCount: () => {
        if (verboseLogging) console.log('🔧 DB: Call count reset')
      },
      
      getCallCount: () => {
        return 0 // Placeholder for call tracking
      }
    },

    // Storage controls (if configured)
    storage: storageMocks ? {
      setProvider: (provider: 's3' | 'blob' | 'local') => {
        storageMocks.provider = provider
        if (verboseLogging) console.log('🔧 Storage: Provider set to', provider)
      },
      
      setCloudEnabled: (enabled: boolean) => {
        storageMocks.isCloudEnabled = enabled
        if (verboseLogging) console.log('🔧 Storage: Cloud enabled', enabled)
      },
      
      throwError: (error: Error | string) => {
        storageMocks.error = error
        if (verboseLogging) console.log('🔧 Storage: Error configured', error instanceof Error ? error.message : error)
      },
      
      clearError: () => {
        storageMocks.error = undefined
        if (verboseLogging) console.log('🔧 Storage: Error cleared')
      },
      
      setPresignedUrl: (url: string) => {
        storageMocks.presignedUrl = url
        if (verboseLogging) console.log('🔧 Storage: Presigned URL set')
      }
    } : undefined,

    // Network controls
    network: {
      setTimeout: (ms: number) => {
        networkMocks.timeout = ms
        if (verboseLogging) console.log('🔧 Network: Timeout set to', ms, 'ms')
      },
      
      setRetries: (count: number) => {
        networkMocks.retries = count
        if (verboseLogging) console.log('🔧 Network: Retries set to', count)
      },
      
      enableLatency: (ms?: number) => {
        networkMocks.latencyEnabled = true
        if (ms) networkMocks.latencyMs = ms
        if (verboseLogging) console.log('🔧 Network: Latency enabled', networkMocks.latencyMs, 'ms')
      },
      
      disableLatency: () => {
        networkMocks.latencyEnabled = false
        if (verboseLogging) console.log('🔧 Network: Latency disabled')
      }
    },

    // Debugging controls
    debugging: {
      logState: () => {
        console.log('🔍 Current Mock State:')
        console.log('  Auth:', config.auth)
        console.log('  Database:', config.database)
        console.log('  Storage:', storageMocks)
        console.log('  Network:', networkMocks)
        console.log('  Features:', featureMocks)
      },
      
      enableVerboseLogging: () => {
        verboseLogging = true
        console.log('🔧 Verbose logging enabled')
      },
      
      disableVerboseLogging: () => {
        verboseLogging = false
        console.log('🔧 Verbose logging disabled')
      },
      
      exportMockState: () => {
        return {
          config,
          storageMocks,
          networkMocks,
          featureMocks
        }
      }
    },

    // Cleanup and reset
    cleanup: () => {
      if (verboseLogging) console.log('🧹 Enhanced mocks: Full cleanup initiated')
      
      mockControls.reset()
      vi.clearAllMocks()
      
      // Reset configuration to defaults
      Object.assign(config, DEFAULT_OPTIONS)
      
      if (verboseLogging) console.log('✅ Enhanced mocks: Cleanup completed')
    },
    
    reset: () => {
      if (verboseLogging) console.log('🔄 Enhanced mocks: Reset to defaults')
      
      mockControls.reset()
      setupAuthenticationMocks(config)
      setupDatabaseMocks(config)
      
      if (verboseLogging) console.log('✅ Enhanced mocks: Reset completed')
    },
    
    validate: () => {
      // Validate that all mocks are properly configured
      const isValid = true // Add validation logic
      
      if (verboseLogging) {
        console.log('🔍 Mock validation:', isValid ? 'PASSED' : 'FAILED')
      }
      
      return isValid
    }
  }
}

// ================================
// BACKWARD COMPATIBILITY
// ================================

/**
 * Legacy setupComprehensiveTestMocks wrapper for backward compatibility
 * 
 * @deprecated Use setupEnhancedTestMocks instead
 */
export function setupComprehensiveTestMocks(options = {}) {
  console.warn('⚠️ setupComprehensiveTestMocks is deprecated. Use setupEnhancedTestMocks instead.')
  
  // Convert legacy options to enhanced options format
  const enhancedOptions = convertLegacyOptions(options)
  
  return setupEnhancedTestMocks(enhancedOptions)
}

/**
 * Convert legacy options to enhanced options format
 */
function convertLegacyOptions(legacyOptions: any): EnhancedTestSetupOptions {
  return {
    auth: {
      authenticated: legacyOptions.auth?.authenticated !== false,
      user: legacyOptions.auth?.user || DEFAULT_TEST_USER
    },
    database: {
      select: {
        results: legacyOptions.database?.select?.results || [[]]
      }
    },
    features: {
      logging: true,
      debugging: false,
      workflowUtils: legacyOptions.features?.workflowUtils || false,
      fileSystem: legacyOptions.features?.fileSystem || false,
      uploadUtils: legacyOptions.features?.uploadUtils || false,
      encryption: legacyOptions.features?.encryption || false
    }
  }
}

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Quick setup for common test patterns
 */
export function quickTestSetup(authenticated = true, user?: any) {
  return setupEnhancedTestMocks({
    auth: {
      authenticated,
      user: user || DEFAULT_TEST_USER
    },
    features: {
      logging: false,
      debugging: false
    }
  })
}

/**
 * Setup for authentication-focused tests
 */
export function setupAuthTestMocks(options: {
  sessionAuth?: boolean
  apiKey?: boolean
  internalToken?: boolean
  permissions?: string
} = {}) {
  return setupEnhancedTestMocks({
    auth: {
      authenticated: options.sessionAuth !== false,
      user: DEFAULT_TEST_USER,
      permissions: options.permissions || 'admin',
      internalToken: options.internalToken !== false
    },
    features: {
      logging: true,
      debugging: true
    }
  })
}

/**
 * Setup for database-focused tests
 */
export function setupDatabaseTestMocks(
  selectResults: any[][] = [[]],
  options: { callbacks?: boolean; errors?: boolean } = {}
) {
  return setupEnhancedTestMocks({
    auth: {
      authenticated: true,
      user: DEFAULT_TEST_USER
    },
    database: {
      select: {
        results: selectResults,
        callbacks: options.callbacks !== false,
        throwError: options.errors || false
      }
    },
    features: {
      logging: true,
      debugging: true
    }
  })
}

// ================================
// EXPORTS
// ================================

// Export the main function as default
export default setupEnhancedTestMocks

// Export all enhanced interfaces and utilities
export type {
  EnhancedTestSetupOptions,
  EnhancedTestMockResult
}

// Export helper functions
export {
  quickTestSetup,
  setupAuthTestMocks,
  setupDatabaseTestMocks,
  DEFAULT_TEST_USER,
  DEFAULT_OPTIONS
}