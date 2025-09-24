/**
 * Parlant integration configuration
 *
 * This module handles configuration for the Parlant server integration,
 * including environment variables, defaults, and validation.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { env } from '@/lib/env'
import type { ParlantConfig, ServiceConfig } from './types'

const logger = createLogger('ParlantConfig')

// Environment variable keys
const ENV_KEYS = {
  PARLANT_BASE_URL: 'PARLANT_BASE_URL',
  PARLANT_API_KEY: 'PARLANT_API_KEY',
  PARLANT_TIMEOUT: 'PARLANT_TIMEOUT',
  PARLANT_RETRY_ATTEMPTS: 'PARLANT_RETRY_ATTEMPTS',
  PARLANT_RETRY_DELAY: 'PARLANT_RETRY_DELAY',
  PARLANT_LOG_LEVEL: 'PARLANT_LOG_LEVEL',
  PARLANT_AUTH_ENABLED: 'PARLANT_AUTH_ENABLED'
} as const

// Default configuration values
const DEFAULTS = {
  baseUrl: 'http://localhost:8800',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  logLevel: 'info' as const,
  authEnabled: true,
  apiKeyRequired: false,
  workspaceValidation: true,
  includeRequests: false,
  includeResponses: false,
  maxDelay: 10000 // 10 seconds
} as const

/**
 * Get Parlant configuration from environment variables with fallbacks
 */
export function getParlantConfig(): ParlantConfig {
  // Get base URL with fallback
  const baseUrl = process.env[ENV_KEYS.PARLANT_BASE_URL] || DEFAULTS.baseUrl

  // Validate base URL format
  try {
    new URL(baseUrl)
  } catch (error) {
    logger.warn(`Invalid PARLANT_BASE_URL: ${baseUrl}, using default: ${DEFAULTS.baseUrl}`)
  }

  // Get timeout with validation
  const timeoutStr = process.env[ENV_KEYS.PARLANT_TIMEOUT]
  let timeout = DEFAULTS.timeout
  if (timeoutStr) {
    const parsed = parseInt(timeoutStr, 10)
    if (!isNaN(parsed) && parsed > 0) {
      timeout = parsed
    } else {
      logger.warn(`Invalid PARLANT_TIMEOUT: ${timeoutStr}, using default: ${DEFAULTS.timeout}`)
    }
  }

  // Get retry attempts with validation
  const retryAttemptsStr = process.env[ENV_KEYS.PARLANT_RETRY_ATTEMPTS]
  let retryAttempts = DEFAULTS.retryAttempts
  if (retryAttemptsStr) {
    const parsed = parseInt(retryAttemptsStr, 10)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      retryAttempts = parsed
    } else {
      logger.warn(`Invalid PARLANT_RETRY_ATTEMPTS: ${retryAttemptsStr}, using default: ${DEFAULTS.retryAttempts}`)
    }
  }

  // Get retry delay with validation
  const retryDelayStr = process.env[ENV_KEYS.PARLANT_RETRY_DELAY]
  let retryDelay = DEFAULTS.retryDelay
  if (retryDelayStr) {
    const parsed = parseInt(retryDelayStr, 10)
    if (!isNaN(parsed) && parsed >= 100) {
      retryDelay = parsed
    } else {
      logger.warn(`Invalid PARLANT_RETRY_DELAY: ${retryDelayStr}, using default: ${DEFAULTS.retryDelay}`)
    }
  }

  const config: ParlantConfig = {
    baseUrl,
    timeout,
    retryAttempts,
    retryDelay,
    apiKey: process.env[ENV_KEYS.PARLANT_API_KEY]
  }

  logger.info('Parlant configuration loaded', {
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    retryDelay: config.retryDelay,
    hasApiKey: !!config.apiKey
  })

  return config
}

/**
 * Get complete service configuration
 */
export function getServiceConfig(): ServiceConfig {
  const parlantConfig = getParlantConfig()

  // Auth configuration
  const authEnabledStr = process.env[ENV_KEYS.PARLANT_AUTH_ENABLED]
  const authEnabled = authEnabledStr !== 'false' && DEFAULTS.authEnabled

  // Log level validation
  const logLevelStr = process.env[ENV_KEYS.PARLANT_LOG_LEVEL]
  let logLevel: 'debug' | 'info' | 'warn' | 'error' = DEFAULTS.logLevel
  if (logLevelStr && ['debug', 'info', 'warn', 'error'].includes(logLevelStr)) {
    logLevel = logLevelStr as typeof logLevel
  }

  const config: ServiceConfig = {
    parlant: parlantConfig,
    auth: {
      enabled: authEnabled,
      apiKeyRequired: DEFAULTS.apiKeyRequired,
      workspaceValidation: DEFAULTS.workspaceValidation
    },
    logging: {
      level: logLevel,
      includeRequests: DEFAULTS.includeRequests,
      includeResponses: DEFAULTS.includeResponses
    },
    retry: {
      enabled: parlantConfig.retryAttempts > 0,
      maxAttempts: parlantConfig.retryAttempts,
      baseDelay: parlantConfig.retryDelay,
      maxDelay: DEFAULTS.maxDelay
    }
  }

  return config
}

/**
 * Validate configuration and return validation results
 */
export interface ConfigValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateConfig(): ConfigValidation {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const config = getParlantConfig()

    // Validate base URL
    try {
      const url = new URL(config.baseUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push(`Invalid protocol in baseUrl: ${url.protocol}. Must be http: or https:`)
      }
    } catch (error) {
      errors.push(`Invalid baseUrl format: ${config.baseUrl}`)
    }

    // Validate timeout
    if (config.timeout < 1000) {
      warnings.push(`Very low timeout value: ${config.timeout}ms. Consider increasing for reliable requests.`)
    }
    if (config.timeout > 120000) {
      warnings.push(`Very high timeout value: ${config.timeout}ms. Consider reducing for better UX.`)
    }

    // Validate retry configuration
    if (config.retryAttempts > 5) {
      warnings.push(`High retry attempts: ${config.retryAttempts}. May cause delays on failures.`)
    }

    if (config.retryDelay < 500) {
      warnings.push(`Low retry delay: ${config.retryDelay}ms. May overwhelm server on retries.`)
    }

    // Check for API key if required
    if (!config.apiKey) {
      warnings.push('No PARLANT_API_KEY configured. Some features may be limited.')
    }

  } catch (error) {
    errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  const isValid = errors.length === 0

  if (!isValid) {
    logger.error('Configuration validation failed', { errors, warnings })
  } else if (warnings.length > 0) {
    logger.warn('Configuration validation completed with warnings', { warnings })
  } else {
    logger.info('Configuration validation passed')
  }

  return {
    isValid,
    errors,
    warnings
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  const isTest = process.env.NODE_ENV === 'test'

  return {
    environment: process.env.NODE_ENV || 'development',
    isDevelopment,
    isProduction,
    isTest,
    // Development-specific settings
    ...(isDevelopment && {
      logging: {
        level: 'debug' as const,
        includeRequests: true,
        includeResponses: true
      }
    }),
    // Production-specific settings
    ...(isProduction && {
      logging: {
        level: 'warn' as const,
        includeRequests: false,
        includeResponses: false
      }
    }),
    // Test-specific settings
    ...(isTest && {
      parlant: {
        baseUrl: 'http://localhost:8801', // Different port for tests
        timeout: 5000,
        retryAttempts: 1,
        retryDelay: 100
      }
    })
  }
}

// Export singleton instance
export const parlantConfig = getParlantConfig()
export const serviceConfig = getServiceConfig()
export const envConfig = getEnvironmentConfig()