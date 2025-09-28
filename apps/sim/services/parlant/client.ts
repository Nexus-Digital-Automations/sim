/**
 * HTTP Client for Sim-Parlant Integration Bridge
 * =============================================
 *
 * Robust HTTP client providing:
 * - RESTful API communication with Parlant server
 * - Automatic retry logic with exponential backoff
 * - Request/response logging and monitoring
 * - Health checking and connectivity management
 * - Authentication token handling
 * - Connection pooling and timeout management
 *
 * This client handles all HTTP communication with the Parlant
 * server while providing resilience and observability.
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import { extractRequestId, ParlantConnectionError, ParlantErrorHandler } from './errors'
import type { ParlantClientConfig, ParlantHealthStatus } from './types'

const logger = createLogger('ParlantClient')

/**
 * HTTP client for Parlant server communication
 */
export class ParlantClient {
  private readonly axiosInstance: AxiosInstance
  private readonly config: ParlantClientConfig
  private readonly baseUrl: string
  private healthStatus: ParlantHealthStatus | null = null
  private lastHealthCheck: Date | null = null

  constructor(config?: Partial<ParlantClientConfig>) {
    // Merge with default configuration
    this.config = {
      baseUrl: env.PARLANT_SERVER_URL || 'http://localhost:8001',
      timeout: 30000, // 30 seconds
      retries: 3,
      retryDelay: 1000,
      maxRetries: 5,
      enableCompression: true,
      userAgent: `Sim-Parlant-Client/1.0.0`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...config,
    }

    this.baseUrl = this.config.baseUrl
    logger.info(`Initializing Parlant client`, { baseUrl: this.baseUrl })

    // Create axios instance with configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        ...this.config.headers,
      },
      ...(this.config.enableCompression && {
        decompress: true,
        'Accept-Encoding': 'gzip, deflate, br',
      }),
    })

    // Set up request interceptors
    this.setupRequestInterceptors()

    // Set up response interceptors
    this.setupResponseInterceptors()

    logger.info(`Parlant client initialized successfully`)
  }

  /**
   * Set up request interceptors for logging and authentication
   */
  private setupRequestInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestId = this.generateRequestId()
        config.metadata = { requestId, startTime: Date.now() }

        // Add authentication token if available
        if (this.config.authToken) {
          config.headers.Authorization = `Bearer ${this.config.authToken}`
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = requestId

        logger.info(`Parlant API request`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          requestId,
          headers: this.sanitizeHeaders(config.headers),
        })

        return config
      },
      (error) => {
        logger.error(`Request interceptor error`, { error: error.message })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Set up response interceptors for error handling and logging
   */
  private setupResponseInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const requestId = response.config.metadata?.requestId
        const duration = Date.now() - (response.config.metadata?.startTime || 0)

        logger.info(`Parlant API response`, {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          duration,
          requestId,
        })

        return response
      },
      async (error) => {
        const requestId = error.config?.metadata?.requestId
        const duration = Date.now() - (error.config?.metadata?.startTime || 0)

        // Log the error
        logger.error(`Parlant API error`, {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status: error.response?.status,
          duration,
          requestId,
          message: error.message,
        })

        // Convert to proper ParlantError
        const parlantError = error.response
          ? ParlantErrorHandler.fromHttpResponse(error.response, requestId)
          : new ParlantConnectionError(
              error.message || 'Connection failed',
              { code: error.code },
              true,
              requestId
            )

        return Promise.reject(parlantError)
      }
    )
  }

  /**
   * Make HTTP request with retry logic
   */
  private async requestWithRetry<T = any>(
    config: AxiosRequestConfig,
    attempt = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.request<T>(config)
    } catch (error) {
      const requestId = config.metadata?.requestId || extractRequestId(error)

      // Check if error is retryable and we haven't exceeded max attempts
      if (attempt < this.config.maxRetries! && ParlantErrorHandler.isRetryable(error as Error)) {
        const delay = ParlantErrorHandler.getRetryDelay(attempt, this.config.retryDelay)

        logger.warn(`Retrying Parlant request`, {
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          delay,
          requestId,
          error: (error as Error).message,
        })

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Retry the request
        return this.requestWithRetry<T>(config, attempt + 1)
      }

      // Re-throw the error if not retryable or max attempts exceeded
      throw error
    }
  }

  /**
   * Generic get request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.requestWithRetry<T>({
      method: 'get',
      url: endpoint,
      params,
      ...config,
    })

    return response.data
  }

  /**
   * Generic post request
   */
  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.requestWithRetry<T>({
      method: 'post',
      url: endpoint,
      data,
      ...config,
    })

    return response.data
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.requestWithRetry<T>({
      method: 'PUT',
      url: endpoint,
      data,
      ...config,
    })

    return response.data
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.requestWithRetry<T>({
      method: 'DELETE',
      url: endpoint,
      ...config,
    })

    return response.data
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.requestWithRetry<T>({
      method: 'PATCH',
      url: endpoint,
      data,
      ...config,
    })

    return response.data
  }

  /**
   * Health check endpoint
   */
  async healthCheck(useCache = true): Promise<ParlantHealthStatus> {
    const now = new Date()
    const cacheValid =
      this.lastHealthCheck && now.getTime() - this.lastHealthCheck.getTime() < 30000 // 30 seconds

    if (useCache && cacheValid && this.healthStatus) {
      return this.healthStatus
    }

    try {
      logger.info(`Checking Parlant server health`)

      const health = await this.get<ParlantHealthStatus>('/health', undefined, {
        timeout: 5000, // Shorter timeout for health checks
      })

      this.healthStatus = health
      this.lastHealthCheck = now

      logger.info(`Parlant health check completed`, {
        status: health.status,
        checks: Object.keys(health.checks).length,
      })

      return health
    } catch (error) {
      const healthError = {
        status: 'unhealthy' as const,
        timestamp: now.toISOString(),
        checks: {
          server: {
            status: 'unhealthy' as const,
            message: (error as Error).message,
          },
          database: {
            status: 'unknown' as const,
            message: 'Could not check database status',
          },
          ai_providers: {
            openai: 'unknown' as const,
            anthropic: 'unknown' as const,
          },
        },
      }

      this.healthStatus = healthError
      this.lastHealthCheck = now

      logger.error(`Parlant health check failed`, { error: (error as Error).message })
      return healthError
    }
  }

  /**
   * Test connection to Parlant server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck(false)
      return this.healthStatus?.status === 'healthy'
    } catch (error) {
      logger.warn(`Parlant connection test failed`, { error: (error as Error).message })
      return false
    }
  }

  /**
   * Long polling request for events
   */
  async longPoll<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    timeoutMs = 30000
  ): Promise<T> {
    const response = await this.requestWithRetry<T>({
      method: 'get',
      url: endpoint,
      params: {
        ...params,
        wait_for_data: true,
        timeout: timeoutMs,
      },
      timeout: timeoutMs + 5000, // Add buffer to axios timeout
    })

    return response.data
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token
    logger.info(`Authentication token updated`)
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.config.authToken = undefined
    logger.info(`Authentication token cleared`)
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<ParlantClientConfig>): void {
    Object.assign(this.config, config)
    logger.info(`Client configuration updated`, {
      updatedFields: Object.keys(config),
    })
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ParlantClientConfig> {
    return { ...this.config }
  }

  /**
   * Get current health status
   */
  getCurrentHealthStatus(): ParlantHealthStatus | null {
    return this.healthStatus
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `parlant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized = { ...headers }

    // Remove sensitive headers
    if (sanitized.Authorization) {
      sanitized.Authorization = '***REDACTED***'
    }
    if (sanitized['x-api-key']) {
      sanitized['x-api-key'] = '***REDACTED***'
    }

    return sanitized
  }

  /**
   * Close the client and clean up resources
   */
  async close(): Promise<void> {
    // Cancel any pending requests
    this.axiosInstance.defaults.timeout = 1

    logger.info(`Parlant client closed`)
  }
}

/**
 * Singleton instance for application-wide use
 */
let defaultClientInstance: ParlantClient | null = null

/**
 * Get or create default Parlant client instance
 */
export function getParlantClient(config?: Partial<ParlantClientConfig>): ParlantClient {
  if (!defaultClientInstance) {
    defaultClientInstance = new ParlantClient(config)
  }

  return defaultClientInstance
}

/**
 * Create new Parlant client instance
 */
export function createParlantClient(config?: Partial<ParlantClientConfig>): ParlantClient {
  return new ParlantClient(config)
}

/**
 * Close default client instance
 */
export async function closeParlantClient(): Promise<void> {
  if (defaultClientInstance) {
    await defaultClientInstance.close()
    defaultClientInstance = null
  }
}

/**
 * Default client instance for backwards compatibility
 */
export const parlantClient = getParlantClient()
