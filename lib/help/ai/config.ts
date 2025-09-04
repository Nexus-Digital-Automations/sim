/**
 * AI Help Engine Configuration
 *
 * Centralized configuration for all AI help components with environment-specific settings.
 * Provides production-ready defaults with development overrides for testing.
 *
 * Key Configuration Areas:
 * - OpenAI API settings for embeddings
 * - Vector database configuration
 * - Chatbot parameters and models
 * - Predictive help thresholds
 * - Performance and caching settings
 *
 * Usage: Import and use getAIHelpConfig() for environment-appropriate settings
 */

import type { AIHelpEngineConfig } from './index'

export interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test'
  openaiApiKey: string
  redisUrl?: string
  pineconeApiKey?: string
  pineconeIndexName?: string
  claudeApiKey: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Get AI Help Engine configuration based on environment
 * @param env - Environment configuration
 * @returns AIHelpEngineConfig - Complete configuration object
 */
export function getAIHelpConfig(env: EnvironmentConfig): AIHelpEngineConfig {
  const isProduction = env.nodeEnv === 'production'
  const isDevelopment = env.nodeEnv === 'development'

  return {
    // Embedding Service Configuration
    embedding: {
      openaiApiKey: env.openaiApiKey,
      model: 'text-embedding-3-large',
      dimensions: isProduction ? 1536 : 512, // Smaller dimensions for development
      cacheEnabled: true,
      cacheTTL: isProduction ? 86400000 : 3600000, // 24h prod, 1h dev
      batchSize: isProduction ? 100 : 20,
      maxRetries: 3,
      rateLimitPerMinute: isProduction ? 3000 : 500,
    },

    // Chatbot Configuration
    chatbot: {
      claudeApiKey: env.claudeApiKey,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 1500,
      temperature: 0.3, // Lower temperature for more consistent help responses
      conversationTimeout: 1800000, // 30 minutes
      maxConversationHistory: 50,
      enableProactiveAssistance: true,
      enableContextRetention: true,
    },

    // Predictive Help Configuration
    predictiveHelp: {
      enableBehaviorAnalysis: true,
      enableProactiveAssistance: isProduction, // Only in production
      enablePersonalization: true,
      minConfidenceThreshold: 0.6,
      maxSuggestionsPerSession: 5,
      cooldownPeriod: 300000, // 5 minutes between suggestions
      learningEnabled: isProduction,
      dataRetentionDays: isProduction ? 90 : 7,
    },

    // Feature Flags
    enableRealTimeAssistance: true,
    enableContextualSuggestions: true,
    enableProactiveHelp: isProduction,

    // Performance & Monitoring
    performanceMonitoring: true,
    cachingEnabled: true,

    // Rate Limiting
    rateLimiting: {
      enabled: isProduction,
      requestsPerMinute: isProduction ? 60 : 300, // More lenient in development
      burstLimit: isProduction ? 10 : 50,
    },
  }
}

/**
 * Development-specific configuration overrides
 */
export function getDevelopmentConfig(env: EnvironmentConfig): Partial<AIHelpEngineConfig> {
  return {
    embedding: {
      openaiApiKey: env.openaiApiKey,
      model: 'text-embedding-3-small', // Cheaper model for development
      dimensions: 512,
      cacheEnabled: true,
      cacheTTL: 3600000, // 1 hour
      batchSize: 10,
      maxRetries: 2,
      rateLimitPerMinute: 100,
    },

    chatbot: {
      claudeApiKey: env.claudeApiKey,
      model: 'claude-3-haiku-20240307', // Faster model for development
      maxTokens: 500,
      temperature: 0.5,
      conversationTimeout: 600000, // 10 minutes
      maxConversationHistory: 20,
      enableProactiveAssistance: false, // Disable for faster testing
      enableContextRetention: false,
    },

    predictiveHelp: {
      enableBehaviorAnalysis: false, // Simplified for development
      enableProactiveAssistance: false,
      enablePersonalization: false,
      minConfidenceThreshold: 0.4, // Lower threshold for testing
      maxSuggestionsPerSession: 2,
      cooldownPeriod: 60000, // 1 minute
      learningEnabled: false,
      dataRetentionDays: 1,
    },

    enableProactiveHelp: false,
    performanceMonitoring: false,

    rateLimiting: {
      enabled: false,
      requestsPerMinute: 1000,
      burstLimit: 100,
    },
  }
}

/**
 * Test-specific configuration for unit and integration tests
 */
export function getTestConfig(): AIHelpEngineConfig {
  return {
    embedding: {
      openaiApiKey: 'test-key',
      model: 'text-embedding-3-small',
      dimensions: 256, // Very small for fast tests
      cacheEnabled: false, // Disable caching for predictable tests
      cacheTTL: 1000,
      batchSize: 5,
      maxRetries: 1,
      rateLimitPerMinute: 1000,
    },

    chatbot: {
      claudeApiKey: 'test-key',
      model: 'claude-3-haiku-20240307',
      maxTokens: 100,
      temperature: 0.1, // Very low temperature for consistent tests
      conversationTimeout: 60000, // 1 minute
      maxConversationHistory: 5,
      enableProactiveAssistance: false,
      enableContextRetention: false,
    },

    predictiveHelp: {
      enableBehaviorAnalysis: false,
      enableProactiveAssistance: false,
      enablePersonalization: false,
      minConfidenceThreshold: 0.5,
      maxSuggestionsPerSession: 1,
      cooldownPeriod: 1000, // 1 second
      learningEnabled: false,
      dataRetentionDays: 1,
    },

    enableRealTimeAssistance: false,
    enableContextualSuggestions: false,
    enableProactiveHelp: false,
    performanceMonitoring: false,
    cachingEnabled: false,

    rateLimiting: {
      enabled: false,
      requestsPerMinute: 10000,
      burstLimit: 1000,
    },
  }
}

/**
 * Production configuration with all optimizations enabled
 */
export function getProductionConfig(env: EnvironmentConfig): AIHelpEngineConfig {
  const baseConfig = getAIHelpConfig(env)

  return {
    ...baseConfig,

    // Production-optimized embedding settings
    embedding: {
      ...baseConfig.embedding,
      model: 'text-embedding-3-large',
      dimensions: 1536, // Full dimensions for best accuracy
      batchSize: 100,
      cacheTTL: 86400000, // 24 hour cache
      rateLimitPerMinute: 3000,
    },

    // Production chatbot settings
    chatbot: {
      ...baseConfig.chatbot,
      model: 'claude-3-sonnet-20240229', // Best model for production
      maxTokens: 2000,
      conversationTimeout: 3600000, // 1 hour
      maxConversationHistory: 100,
    },

    // Full predictive help capabilities
    predictiveHelp: {
      ...baseConfig.predictiveHelp,
      enableBehaviorAnalysis: true,
      enableProactiveAssistance: true,
      enablePersonalization: true,
      learningEnabled: true,
      dataRetentionDays: 90,
    },

    // Production performance settings
    enableRealTimeAssistance: true,
    enableContextualSuggestions: true,
    enableProactiveHelp: true,
    performanceMonitoring: true,
    cachingEnabled: true,

    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60,
      burstLimit: 10,
    },
  }
}

/**
 * Validate configuration and environment variables
 * @param env - Environment configuration to validate
 * @throws Error if required configuration is missing
 */
export function validateConfig(env: EnvironmentConfig): void {
  const required = ['openaiApiKey', 'claudeApiKey']
  const missing = required.filter((key) => !env[key as keyof EnvironmentConfig])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Validate API key formats
  if (!env.openaiApiKey.startsWith('sk-') && env.nodeEnv !== 'test') {
    throw new Error('OpenAI API key must start with "sk-"')
  }

  // Additional validations for production
  if (env.nodeEnv === 'production') {
    if (!env.pineconeApiKey) {
      console.warn('Warning: Pinecone API key not provided for production')
    }

    if (!env.redisUrl) {
      console.warn('Warning: Redis URL not provided for production caching')
    }
  }
}

/**
 * Get configuration based on current environment
 * @returns AIHelpEngineConfig - Environment-appropriate configuration
 */
export function getConfigForEnvironment(): AIHelpEngineConfig {
  const env: EnvironmentConfig = {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    redisUrl: process.env.REDIS_URL,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeIndexName: process.env.PINECONE_INDEX_NAME,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  }

  // Validate configuration
  validateConfig(env)

  // Return appropriate configuration
  switch (env.nodeEnv) {
    case 'production':
      return getProductionConfig(env)
    case 'test':
      return getTestConfig()
    default:
      return { ...getAIHelpConfig(env), ...getDevelopmentConfig(env) }
  }
}

/**
 * Configuration presets for specific use cases
 */
export const ConfigPresets = {
  /**
   * Minimal configuration for basic semantic search only
   */
  searchOnly: (apiKeys: { openai: string }): Partial<AIHelpEngineConfig> => ({
    embedding: {
      openaiApiKey: apiKeys.openai,
      model: 'text-embedding-3-small',
      dimensions: 512,
      cacheEnabled: true,
      cacheTTL: 3600000,
      batchSize: 50,
      maxRetries: 2,
      rateLimitPerMinute: 500,
    },
    enableRealTimeAssistance: false,
    enableContextualSuggestions: true,
    enableProactiveHelp: false,
    performanceMonitoring: false,
    rateLimiting: { enabled: false, requestsPerMinute: 100, burstLimit: 20 },
  }),

  /**
   * Chat-focused configuration for conversational help
   */
  chatFocused: (apiKeys: { openai: string; claude: string }): Partial<AIHelpEngineConfig> => ({
    embedding: {
      openaiApiKey: apiKeys.openai,
      model: 'text-embedding-3-small',
      dimensions: 512,
      cacheEnabled: true,
      cacheTTL: 7200000,
      batchSize: 20,
      maxRetries: 2,
      rateLimitPerMinute: 300,
    },
    chatbot: {
      claudeApiKey: apiKeys.claude,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 1500,
      temperature: 0.3,
      conversationTimeout: 1800000,
      maxConversationHistory: 50,
      enableProactiveAssistance: true,
      enableContextRetention: true,
    },
    enableRealTimeAssistance: true,
    enableProactiveHelp: false,
    rateLimiting: { enabled: true, requestsPerMinute: 30, burstLimit: 5 },
  }),

  /**
   * High-performance configuration for enterprise use
   */
  enterprise: (env: EnvironmentConfig): AIHelpEngineConfig => ({
    ...getProductionConfig(env),
    embedding: {
      openaiApiKey: env.openaiApiKey,
      model: 'text-embedding-3-large',
      dimensions: 3072, // Maximum dimensions
      cacheEnabled: true,
      cacheTTL: 172800000, // 48 hours
      batchSize: 200,
      maxRetries: 5,
      rateLimitPerMinute: 5000,
    },
    chatbot: {
      claudeApiKey: env.claudeApiKey,
      model: 'claude-3-opus-20240229', // Most capable model
      maxTokens: 3000,
      temperature: 0.2,
      conversationTimeout: 7200000, // 2 hours
      maxConversationHistory: 200,
      enableProactiveAssistance: true,
      enableContextRetention: true,
    },
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 120, // Higher limits for enterprise
      burstLimit: 20,
    },
  }),
}

export default {
  getAIHelpConfig,
  getConfigForEnvironment,
  validateConfig,
  ConfigPresets,
}
