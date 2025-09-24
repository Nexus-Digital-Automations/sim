/**
 * Main Service Layer for Sim-Parlant Integration Bridge
 * ====================================================
 *
 * Central service orchestrating all Parlant integration functionality:
 * - Unified service interface for agent and session management
 * - Health monitoring and connection management
 * - Configuration management and initialization
 * - Integration with Sim's authentication and workspace systems
 *
 * This service provides a high-level interface for consuming
 * applications while encapsulating all integration complexity.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { env } from '@/lib/env'
import { getParlantClient, createParlantClient, closeParlantClient } from './client'
import {
  ParlantConfigError,
  ParlantHealthError,
  ParlantErrorHandler
} from './errors'
import type {
  Agent,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentListQuery,
  Session,
  SessionCreateRequest,
  SessionListQuery,
  Event,
  EventCreateRequest,
  EventListQuery,
  ParlantClientConfig,
  ParlantHealthStatus,
  AuthContext,
  PaginatedResponse
} from './types'

// Re-export agent and session functions for convenience
import * as agents from './agents'
import * as sessions from './sessions'

const logger = createLogger('ParlantService')

/**
 * Main Parlant service class providing unified interface
 */
export class ParlantService {
  private initialized = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private lastHealthStatus: ParlantHealthStatus | null = null

  constructor(private config?: Partial<ParlantClientConfig>) {
    logger.info('Initializing Parlant service', {
      baseUrl: config?.baseUrl || 'default'
    })
  }

  /**
   * Initialize the service and establish connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Parlant service already initialized')
      return
    }

    try {
      logger.info('Starting Parlant service initialization')

      // Validate configuration
      this.validateConfiguration()

      // Initialize client
      const client = getParlantClient(this.config)

      // Test initial connection
      await this.performHealthCheck()

      // Start health monitoring
      this.startHealthMonitoring()

      this.initialized = true

      logger.info('Parlant service initialized successfully', {
        baseUrl: client.getConfig().baseUrl,
        healthStatus: this.lastHealthStatus?.status
      })
    } catch (error) {
      logger.error('Failed to initialize Parlant service', {
        error: (error as Error).message
      })

      throw new ParlantConfigError(
        `Parlant service initialization failed: ${(error as Error).message}`
      )
    }
  }

  /**
   * Shutdown the service and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    try {
      logger.info('Shutting down Parlant service')

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      // Close client connections
      await closeParlantClient()

      this.initialized = false
      this.lastHealthStatus = null

      logger.info('Parlant service shutdown completed')
    } catch (error) {
      logger.error('Error during Parlant service shutdown', {
        error: (error as Error).message
      })
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ParlantHealthStatus | null {
    return this.lastHealthStatus
  }

  /**
   * Perform immediate health check
   */
  async performHealthCheck(): Promise<ParlantHealthStatus> {
    try {
      const client = getParlantClient(this.config)
      const health = await client.healthCheck(false)
      this.lastHealthStatus = health

      logger.info('Health check completed', { status: health.status })
      return health
    } catch (error) {
      const healthError: ParlantHealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          server: {
            status: 'unhealthy',
            message: (error as Error).message
          },
          database: {
            status: 'unknown',
            message: 'Could not determine database status'
          },
          ai_providers: {
            openai: 'unknown',
            anthropic: 'unknown'
          }
        }
      }

      this.lastHealthStatus = healthError
      logger.warn('Health check failed', { error: (error as Error).message })
      return healthError
    }
  }

  // Agent Management Methods

  /**
   * Create a new agent
   */
  async createAgent(
    request: AgentCreateRequest,
    context: AuthContext
  ): Promise<Agent> {
    this.ensureInitialized()
    return agents.createAgent(request, context)
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string, context: AuthContext): Promise<Agent> {
    this.ensureInitialized()
    return agents.getAgent(agentId, context)
  }

  /**
   * Update agent
   */
  async updateAgent(
    agentId: string,
    request: AgentUpdateRequest,
    context: AuthContext
  ): Promise<Agent> {
    this.ensureInitialized()
    return agents.updateAgent(agentId, request, context)
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string, context: AuthContext): Promise<void> {
    this.ensureInitialized()
    return agents.deleteAgent(agentId, context)
  }

  /**
   * List agents
   */
  async listAgents(
    query: AgentListQuery,
    context: AuthContext
  ): Promise<PaginatedResponse<Agent>> {
    this.ensureInitialized()
    return agents.listAgents(query, context)
  }

  /**
   * Get agent guidelines
   */
  async getAgentGuidelines(
    agentId: string,
    context: AuthContext
  ): Promise<any[]> {
    this.ensureInitialized()
    return agents.getAgentGuidelines(agentId, context)
  }

  /**
   * Add guideline to agent
   */
  async addAgentGuideline(
    agentId: string,
    guideline: { condition: string; action: string; priority?: number },
    context: AuthContext
  ): Promise<any> {
    this.ensureInitialized()
    return agents.addAgentGuideline(agentId, guideline, context)
  }

  // Session Management Methods

  /**
   * Create a new session
   */
  async createSession(
    request: SessionCreateRequest,
    context: AuthContext
  ): Promise<Session> {
    this.ensureInitialized()
    return sessions.createSession(request, context)
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, context: AuthContext): Promise<Session> {
    this.ensureInitialized()
    return sessions.getSession(sessionId, context)
  }

  /**
   * List sessions
   */
  async listSessions(
    query: SessionListQuery,
    context: AuthContext
  ): Promise<PaginatedResponse<Session>> {
    this.ensureInitialized()
    return sessions.listSessions(query, context)
  }

  /**
   * Send message to session
   */
  async sendMessage(
    sessionId: string,
    message: EventCreateRequest,
    context: AuthContext
  ): Promise<Event> {
    this.ensureInitialized()
    return sessions.sendMessage(sessionId, message, context)
  }

  /**
   * Get events from session
   */
  async getEvents(
    sessionId: string,
    query: EventListQuery,
    context: AuthContext
  ): Promise<Event[]> {
    this.ensureInitialized()
    return sessions.getEvents(sessionId, query, context)
  }

  /**
   * End session
   */
  async endSession(sessionId: string, context: AuthContext): Promise<Session> {
    this.ensureInitialized()
    return sessions.endSession(sessionId, context)
  }

  /**
   * Pause session
   */
  async pauseSession(sessionId: string, context: AuthContext): Promise<Session> {
    this.ensureInitialized()
    return sessions.pauseSession(sessionId, context)
  }

  /**
   * Resume session
   */
  async resumeSession(sessionId: string, context: AuthContext): Promise<Session> {
    this.ensureInitialized()
    return sessions.resumeSession(sessionId, context)
  }

  // Utility Methods

  /**
   * Test connection to Parlant server
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = getParlantClient(this.config)
      return await client.testConnection()
    } catch (error) {
      logger.warn('Connection test failed', { error: (error as Error).message })
      return false
    }
  }

  /**
   * Get service configuration
   */
  getConfiguration(): Readonly<ParlantClientConfig> {
    const client = getParlantClient(this.config)
    return client.getConfig()
  }

  /**
   * Update service configuration
   */
  updateConfiguration(config: Partial<ParlantClientConfig>): void {
    const client = getParlantClient(this.config)
    client.updateConfig(config)

    // Update internal config reference
    this.config = { ...this.config, ...config }

    logger.info('Service configuration updated', {
      updatedFields: Object.keys(config)
    })
  }

  // Private Methods

  /**
   * Validate service configuration
   */
  private validateConfiguration(): void {
    const baseUrl = this.config?.baseUrl || env.PARLANT_SERVER_URL

    if (!baseUrl) {
      throw new ParlantConfigError(
        'Parlant server URL not configured. Set PARLANT_SERVER_URL environment variable.'
      )
    }

    // Validate URL format
    try {
      new URL(baseUrl)
    } catch {
      throw new ParlantConfigError(
        `Invalid Parlant server URL: ${baseUrl}`
      )
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        logger.warn('Health monitoring check failed', {
          error: (error as Error).message
        })
      }
    }, 30000)

    logger.info('Health monitoring started')
  }

  /**
   * Ensure service is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ParlantConfigError(
        'Parlant service not initialized. Call initialize() first.'
      )
    }
  }
}

// Default service instance for application-wide use
let defaultServiceInstance: ParlantService | null = null

/**
 * Get or create default Parlant service instance
 */
export function getParlantService(config?: Partial<ParlantClientConfig>): ParlantService {
  if (!defaultServiceInstance) {
    defaultServiceInstance = new ParlantService(config)
  }
  return defaultServiceInstance
}

/**
 * Initialize default service instance
 */
export async function initializeParlantService(
  config?: Partial<ParlantClientConfig>
): Promise<ParlantService> {
  const service = getParlantService(config)
  await service.initialize()
  return service
}

/**
 * Shutdown default service instance
 */
export async function shutdownParlantService(): Promise<void> {
  if (defaultServiceInstance) {
    await defaultServiceInstance.shutdown()
    defaultServiceInstance = null
  }
}

// Convenience functions that use the default service instance

/**
 * Convenience function to create an agent using default service
 */
export async function createAgent(
  request: AgentCreateRequest,
  context: AuthContext
): Promise<Agent> {
  const service = getParlantService()
  await service.initialize()
  return service.createAgent(request, context)
}

/**
 * Convenience function to get an agent using default service
 */
export async function getAgent(agentId: string, context: AuthContext): Promise<Agent> {
  const service = getParlantService()
  await service.initialize()
  return service.getAgent(agentId, context)
}

/**
 * Convenience function to create a session using default service
 */
export async function createSession(
  request: SessionCreateRequest,
  context: AuthContext
): Promise<Session> {
  const service = getParlantService()
  await service.initialize()
  return service.createSession(request, context)
}

/**
 * Convenience function to send a message using default service
 */
export async function sendMessage(
  sessionId: string,
  message: EventCreateRequest,
  context: AuthContext
): Promise<Event> {
  const service = getParlantService()
  await service.initialize()
  return service.sendMessage(sessionId, message, context)
}