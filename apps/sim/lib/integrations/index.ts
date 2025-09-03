/**
 * Integration Framework - Core Module
 *
 * Comprehensive integration library for external APIs and data sources
 * Provides standardized connector development, authentication management,
 * rate limiting, error handling, and connection validation.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('IntegrationFramework')

// ====================================================================
// CORE TYPES AND INTERFACES
// ====================================================================

/**
 * Supported integration categories for business automation
 */
export type IntegrationCategory =
  | 'crm' // Customer Relationship Management
  | 'marketing' // Marketing platforms and automation
  | 'ecommerce' // E-commerce platforms and payment systems
  | 'financial' // Financial systems and accounting
  | 'communication' // Communication and messaging platforms
  | 'productivity' // Productivity and file management
  | 'database' // Database systems and data storage
  | 'analytics' // Analytics and reporting platforms
  | 'etl' // Extract, Transform, Load systems
  | 'streaming' // Real-time data streaming

/**
 * Authentication methods supported by the framework
 */
export type AuthMethod =
  | 'oauth2' // OAuth 2.0 flow
  | 'oauth1' // OAuth 1.0a flow
  | 'api_key' // API key authentication
  | 'bearer_token' // Bearer token authentication
  | 'basic_auth' // Basic username/password authentication
  | 'jwt' // JSON Web Token authentication
  | 'custom' // Custom authentication mechanism

/**
 * Data transformation types for ETL operations
 */
export type DataTransformation =
  | 'json_mapping' // JSON field mapping and transformation
  | 'csv_parsing' // CSV file parsing and conversion
  | 'xml_parsing' // XML parsing and transformation
  | 'excel_parsing' // Excel file processing
  | 'data_validation' // Data validation and sanitization
  | 'data_enrichment' // Data enrichment and augmentation
  | 'data_filtering' // Data filtering and selection
  | 'data_aggregation' // Data aggregation and summarization

/**
 * Rate limiting strategies to prevent API abuse
 */
export type RateLimitStrategy =
  | 'token_bucket' // Token bucket algorithm
  | 'sliding_window' // Sliding window rate limiting
  | 'fixed_window' // Fixed window rate limiting
  | 'exponential_backoff' // Exponential backoff retry

/**
 * Integration connector configuration interface
 */
export interface IntegrationConnector {
  /** Unique identifier for the connector */
  id: string

  /** Human-readable name for the connector */
  name: string

  /** Brief description of connector functionality */
  description: string

  /** Integration category classification */
  category: IntegrationCategory

  /** Version of the connector implementation */
  version: string

  /** Base API URL for the external service */
  baseUrl: string

  /** Authentication configuration */
  authentication: {
    method: AuthMethod
    config: AuthConfig
  }

  /** Rate limiting configuration */
  rateLimit: {
    strategy: RateLimitStrategy
    limits: RateLimitConfig
  }

  /** Available operations for this connector */
  operations: IntegrationOperation[]

  /** Data transformation capabilities */
  transformations: DataTransformation[]

  /** Connection health check configuration */
  healthCheck: HealthCheckConfig

  /** Error handling and retry configuration */
  errorHandling: ErrorHandlingConfig

  /** Additional metadata and tags */
  metadata: {
    tags: string[]
    documentation?: string
    supportContact?: string
    lastUpdated: Date
  }
}

/**
 * Authentication configuration based on method type
 */
export type AuthConfig =
  | OAuth2Config
  | OAuth1Config
  | ApiKeyConfig
  | BearerTokenConfig
  | BasicAuthConfig
  | JWTConfig
  | CustomAuthConfig

export interface OAuth2Config {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  redirectUri?: string
  pkce?: boolean
}

export interface OAuth1Config {
  consumerKey: string
  consumerSecret: string
  requestTokenUrl: string
  authorizationUrl: string
  accessTokenUrl: string
  signatureMethod: 'HMAC-SHA1' | 'RSA-SHA1' | 'PLAINTEXT'
}

export interface ApiKeyConfig {
  keyName: string
  keyLocation: 'header' | 'query' | 'body'
  keyPrefix?: string
}

export interface BearerTokenConfig {
  tokenUrl?: string
  tokenRefreshUrl?: string
  tokenField?: string
}

export interface BasicAuthConfig {
  usernameField: string
  passwordField: string
  realm?: string
}

export interface JWTConfig {
  algorithm: string
  secret: string
  expiresIn: string
  issuer?: string
  audience?: string
}

export interface CustomAuthConfig {
  handler: string // Function name for custom auth handler
  parameters: Record<string, any>
}

/**
 * Rate limiting configuration parameters
 */
export interface RateLimitConfig {
  /** Maximum requests per time window */
  maxRequests: number

  /** Time window in milliseconds */
  windowMs: number

  /** Maximum concurrent requests */
  maxConcurrent?: number

  /** Burst allowance for initial requests */
  burstLimit?: number

  /** Minimum delay between requests (ms) */
  minDelay?: number

  /** Maximum retry attempts */
  maxRetries?: number

  /** Exponential backoff multiplier */
  backoffMultiplier?: number
}

/**
 * Integration operation definition
 */
export interface IntegrationOperation {
  /** Unique operation identifier */
  id: string

  /** Operation name and description */
  name: string
  description: string

  /** HTTP method for the operation */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

  /** API endpoint path (relative to baseUrl) */
  path: string

  /** Input parameters schema */
  inputSchema: OperationSchema

  /** Output response schema */
  outputSchema: OperationSchema

  /** Required authentication scopes */
  requiredScopes?: string[]

  /** Rate limit override for this operation */
  rateLimitOverride?: Partial<RateLimitConfig>

  /** Data transformation pipeline */
  transformations?: {
    input?: DataTransformationStep[]
    output?: DataTransformationStep[]
  }

  /** Operation-specific error handling */
  errorHandling?: Partial<ErrorHandlingConfig>
}

/**
 * JSON schema definition for operation parameters
 */
export interface OperationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean'
  properties?: Record<string, OperationSchemaProperty>
  required?: string[]
  items?: OperationSchema
}

export interface OperationSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  example?: any
  enum?: any[]
  format?: string
  minimum?: number
  maximum?: number
  pattern?: string
  items?: OperationSchema
  properties?: Record<string, OperationSchemaProperty>
}

/**
 * Data transformation step definition
 */
export interface DataTransformationStep {
  /** Transformation type */
  type: DataTransformation

  /** Transformation configuration */
  config: Record<string, any>

  /** Field mapping for transformations */
  fieldMapping?: Record<string, string>

  /** Conditional transformation rules */
  conditions?: TransformationCondition[]
}

export interface TransformationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex'
  value: any
  transform: DataTransformationStep
}

/**
 * Health check configuration for connection validation
 */
export interface HealthCheckConfig {
  /** Health check endpoint (relative to baseUrl) */
  endpoint: string

  /** HTTP method for health check */
  method: 'GET' | 'POST' | 'HEAD'

  /** Expected status codes for healthy response */
  expectedStatusCodes: number[]

  /** Timeout for health check request (ms) */
  timeout: number

  /** Health check interval (ms) */
  interval: number

  /** Maximum failed attempts before marking unhealthy */
  maxFailures: number

  /** Custom validation function name */
  customValidator?: string
}

/**
 * Error handling and retry configuration
 */
export interface ErrorHandlingConfig {
  /** Retry configuration */
  retry: {
    maxAttempts: number
    initialDelay: number
    maxDelay: number
    exponentialMultiplier: number
    jitter: boolean
  }

  /** HTTP status codes to retry */
  retryableStatusCodes: number[]

  /** Error categories and their handling */
  errorCategories: {
    network: ErrorCategoryConfig
    authentication: ErrorCategoryConfig
    rateLimit: ErrorCategoryConfig
    validation: ErrorCategoryConfig
    server: ErrorCategoryConfig
  }

  /** Dead letter queue configuration */
  deadLetterQueue?: {
    enabled: boolean
    maxRetries: number
    ttl: number
  }
}

export interface ErrorCategoryConfig {
  retryable: boolean
  maxRetries: number
  customHandler?: string
  notification?: {
    enabled: boolean
    channels: string[]
    threshold: number
  }
}

// ====================================================================
// INTEGRATION REGISTRY AND MANAGEMENT
// ====================================================================

/**
 * Central registry for all integration connectors
 */
export class IntegrationRegistry {
  private connectors = new Map<string, IntegrationConnector>()
  private activeConnections = new Map<string, IntegrationConnection>()

  constructor() {
    logger.info('Integration Registry initialized')
  }

  /**
   * Register a new integration connector
   */
  registerConnector(connector: IntegrationConnector): void {
    logger.info(`Registering connector: ${connector.id}`, {
      name: connector.name,
      category: connector.category,
      version: connector.version,
    })

    // Validate connector configuration
    this.validateConnector(connector)

    this.connectors.set(connector.id, connector)

    logger.info(`Connector ${connector.id} registered successfully`)
  }

  /**
   * Get connector by ID
   */
  getConnector(id: string): IntegrationConnector | undefined {
    return this.connectors.get(id)
  }

  /**
   * Get all connectors by category
   */
  getConnectorsByCategory(category: IntegrationCategory): IntegrationConnector[] {
    return Array.from(this.connectors.values()).filter(
      (connector) => connector.category === category
    )
  }

  /**
   * Get all available connectors
   */
  getAllConnectors(): IntegrationConnector[] {
    return Array.from(this.connectors.values())
  }

  /**
   * Remove a connector from registry
   */
  unregisterConnector(id: string): boolean {
    const removed = this.connectors.delete(id)
    if (removed) {
      // Close any active connections for this connector
      this.closeConnectionsByConnector(id)
      logger.info(`Connector ${id} unregistered successfully`)
    }
    return removed
  }

  /**
   * Validate connector configuration
   */
  private validateConnector(connector: IntegrationConnector): void {
    if (!connector.id || !connector.name || !connector.baseUrl) {
      throw new Error('Connector must have id, name, and baseUrl')
    }

    if (!connector.operations || connector.operations.length === 0) {
      throw new Error('Connector must have at least one operation')
    }

    // Validate authentication configuration
    if (!connector.authentication?.method) {
      throw new Error('Connector must specify authentication method')
    }

    // Validate rate limiting configuration
    if (!connector.rateLimit?.limits?.maxRequests) {
      throw new Error('Connector must specify rate limit configuration')
    }

    logger.debug(`Connector ${connector.id} validation passed`)
  }

  /**
   * Close all connections for a specific connector
   */
  private closeConnectionsByConnector(connectorId: string): void {
    for (const [connectionId, connection] of this.activeConnections) {
      if (connection.connectorId === connectorId) {
        connection.close()
        this.activeConnections.delete(connectionId)
      }
    }
  }
}

/**
 * Integration connection instance
 */
export interface IntegrationConnection {
  /** Unique connection identifier */
  id: string

  /** Connector ID this connection belongs to */
  connectorId: string

  /** Connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'

  /** Last successful health check */
  lastHealthCheck?: Date

  /** Connection statistics */
  stats: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    lastRequestTime?: Date
  }

  /** Close the connection */
  close(): void

  /** Execute an operation */
  execute(operationId: string, parameters: any): Promise<any>

  /** Test connection health */
  healthCheck(): Promise<boolean>
}

// Export the global registry instance
export const integrationRegistry = new IntegrationRegistry()

/**
 * Integration framework initialization
 */
export function initializeIntegrationFramework(): void {
  logger.info('Initializing Integration Framework...')

  // Load built-in connectors
  loadBuiltInConnectors()

  // Initialize monitoring and health checks
  initializeMonitoring()

  logger.info('Integration Framework initialized successfully')
}

/**
 * Load built-in connectors for common integrations
 */
function loadBuiltInConnectors(): void {
  logger.info('Loading built-in connectors...')

  // Built-in connectors will be loaded from separate modules
  // This allows for better organization and maintainability

  logger.info('Built-in connectors loaded')
}

/**
 * Initialize monitoring and health check systems
 */
function initializeMonitoring(): void {
  logger.info('Initializing integration monitoring...')

  // Set up periodic health checks for active connections
  setInterval(() => {
    performHealthChecks()
  }, 30000) // Check every 30 seconds

  logger.info('Integration monitoring initialized')
}

/**
 * Perform health checks on all active connections
 */
async function performHealthChecks(): Promise<void> {
  const registry = integrationRegistry
  const connections = Array.from((registry as any).activeConnections.values())

  for (const connection of connections) {
    try {
      const isHealthy = await connection.healthCheck()
      if (!isHealthy) {
        logger.warn(`Health check failed for connection ${connection.id}`)
      }
    } catch (error) {
      logger.error(`Health check error for connection ${connection.id}:`, error)
    }
  }
}
