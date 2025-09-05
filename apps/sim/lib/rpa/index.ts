/**
 * RPA Module Index
 * 
 * Main export file for all RPA-related utilities, managers, and database operations.
 * Provides a centralized entry point for importing RPA functionality throughout
 * the Sim platform.
 * 
 * Features:
 * - Centralized exports for all RPA utilities
 * - Configuration management
 * - Initialization helpers
 * - Production-ready database integration
 */

// Core managers and utilities
export { 
  RPAAgentManager, 
  getAgentManager,
  AgentUtils,
  AgentSelectionStrategy,
  HEALTH_THRESHOLDS,
  PERFORMANCE_WEIGHTS 
} from './agent-manager'

export { 
  RPAOperationMapper, 
  OperationMapperUtils 
} from './operation-mapper'

export { 
  RPADatabaseManager, 
  getDatabaseManager,
  DatabaseUtils,
  RETENTION_POLICIES,
  TABLE_SCHEMAS 
} from './database'

// Type exports
export type {
  DesktopAgent,
  RPAOperation,
  RPAOperationResult,
  RPAWorkflowExecution,
  RPAExecutionLog,
  AgentMetrics,
  RPAError,
  AgentCapability
} from '@/types/rpa'

import { createLogger } from '@/lib/logs/console/logger'
import { getDatabaseManager, DatabaseUtils, type RPADatabaseManager } from './database'
import { getAgentManager, type RPAAgentManager } from './agent-manager'

const logger = createLogger('RPAModule')

/**
 * RPA Module configuration
 */
export interface RPAModuleConfig {
  database?: {
    host?: string
    port?: number
    database?: string
    username?: string
    password?: string
    ssl?: boolean
    poolSize?: number
  }
  agents?: {
    maxAgentsPerUser?: number
    heartbeatTimeout?: number
    defaultTimeout?: number
  }
  operations?: {
    maxRetries?: number
    defaultPriority?: string
    cleanupDelay?: number
  }
  security?: {
    apiKeyExpiration?: number
    rateLimitWindow?: number
    rateLimitRequests?: number
  }
}

/**
 * Default RPA module configuration
 */
export const DEFAULT_RPA_CONFIG: Required<RPAModuleConfig> = {
  database: {
    host: 'localhost',
    port: 3306,
    database: 'sim_rpa',
    username: 'root',
    password: '',
    ssl: false,
    poolSize: 10
  },
  agents: {
    maxAgentsPerUser: 5,
    heartbeatTimeout: 90000, // 90 seconds
    defaultTimeout: 30000    // 30 seconds
  },
  operations: {
    maxRetries: 3,
    defaultPriority: 'normal',
    cleanupDelay: 300000     // 5 minutes
  },
  security: {
    apiKeyExpiration: 365 * 24 * 60 * 60 * 1000, // 1 year
    rateLimitWindow: 60 * 1000,                    // 1 minute
    rateLimitRequests: 100                         // 100 requests per minute
  }
}

/**
 * RPA Module initialization state
 */
let isInitialized = false
let moduleConfig: Required<RPAModuleConfig> = DEFAULT_RPA_CONFIG
let databaseManager: RPADatabaseManager | null = null
let agentManager: RPAAgentManager | null = null

/**
 * Initialize the RPA module with configuration
 */
export async function initializeRPAModule(config?: Partial<RPAModuleConfig>): Promise<void> {
  if (isInitialized) {
    logger.warn('RPA module already initialized, skipping')
    return
  }

  logger.info('Initializing RPA module', { providedConfig: !!config })

  try {
    // Merge configuration with defaults
    moduleConfig = {
      ...DEFAULT_RPA_CONFIG,
      ...config,
      database: { ...DEFAULT_RPA_CONFIG.database, ...config?.database },
      agents: { ...DEFAULT_RPA_CONFIG.agents, ...config?.agents },
      operations: { ...DEFAULT_RPA_CONFIG.operations, ...config?.operations },
      security: { ...DEFAULT_RPA_CONFIG.security, ...config?.security }
    }

    // Initialize database manager
    const dbConfig = DatabaseUtils.createConfigFromEnv()
    databaseManager = getDatabaseManager({
      ...dbConfig,
      ...moduleConfig.database
    })
    
    await databaseManager.initialize()
    logger.info('Database manager initialized successfully')

    // Initialize agent manager
    agentManager = getAgentManager()
    logger.info('Agent manager initialized successfully')

    // Verify all components are working
    await performHealthCheck()

    isInitialized = true
    logger.info('RPA module initialization completed successfully')

  } catch (error) {
    logger.error('Failed to initialize RPA module', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw new Error(`RPA module initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get current RPA module configuration
 */
export function getRPAConfig(): Required<RPAModuleConfig> {
  return { ...moduleConfig }
}

/**
 * Update RPA module configuration
 */
export function updateRPAConfig(updates: Partial<RPAModuleConfig>): void {
  moduleConfig = {
    ...moduleConfig,
    ...updates,
    database: { ...moduleConfig.database, ...updates.database },
    agents: { ...moduleConfig.agents, ...updates.agents },
    operations: { ...moduleConfig.operations, ...updates.operations },
    security: { ...moduleConfig.security, ...updates.security }
  }

  logger.info('RPA module configuration updated', { updates })
}

/**
 * Get database manager instance
 */
export function getRPADatabaseManager(): RPADatabaseManager {
  if (!databaseManager) {
    throw new Error('RPA module not initialized. Call initializeRPAModule() first.')
  }
  return databaseManager
}

/**
 * Get agent manager instance
 */
export function getRPAAgentManager(): RPAAgentManager {
  if (!agentManager) {
    throw new Error('RPA module not initialized. Call initializeRPAModule() first.')
  }
  return agentManager
}

/**
 * Perform health check on all RPA components
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, any>
  timestamp: Date
}> {
  const timestamp = new Date()
  const components: Record<string, any> = {}

  try {
    // Check database health
    if (databaseManager) {
      components.database = await databaseManager.healthCheck()
    } else {
      components.database = { status: 'unhealthy', details: 'Not initialized' }
    }

    // Check agent manager health
    if (agentManager) {
      const userAgents = agentManager.getUserAgents('system') // Get system agents for health check
      components.agentManager = {
        status: 'healthy',
        details: `${userAgents.length} agents registered`,
        latency: 0
      }
    } else {
      components.agentManager = { status: 'unhealthy', details: 'Not initialized' }
    }

    // Check module initialization
    components.module = {
      status: isInitialized ? 'healthy' : 'unhealthy',
      details: isInitialized ? 'Module initialized' : 'Module not initialized',
      config: isInitialized ? moduleConfig : null
    }

    // Determine overall status
    const componentStatuses = Object.values(components).map(c => c.status)
    const overallStatus = componentStatuses.includes('unhealthy') ? 'unhealthy' :
                         componentStatuses.includes('degraded') ? 'degraded' : 'healthy'

    logger.debug('RPA module health check completed', {
      overallStatus,
      components: Object.keys(components)
    })

    return {
      status: overallStatus,
      components,
      timestamp
    }

  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      status: 'unhealthy',
      components: {
        error: {
          status: 'unhealthy',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      timestamp
    }
  }
}

/**
 * Gracefully shutdown the RPA module
 */
export async function shutdownRPAModule(): Promise<void> {
  logger.info('Shutting down RPA module')

  try {
    // Close database connections
    if (databaseManager) {
      await databaseManager.close()
      logger.info('Database connections closed')
    }

    // Reset state
    isInitialized = false
    databaseManager = null
    agentManager = null

    logger.info('RPA module shutdown completed')

  } catch (error) {
    logger.error('Error during RPA module shutdown', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Utility functions for common RPA operations
 */
export const RPAUtils = {
  /**
   * Check if RPA module is initialized
   */
  isInitialized(): boolean {
    return isInitialized
  },

  /**
   * Get module version information
   */
  getVersion(): {
    version: string
    buildDate: Date
    components: string[]
  } {
    return {
      version: '1.0.0',
      buildDate: new Date(),
      components: [
        'AgentManager',
        'OperationMapper', 
        'DatabaseManager',
        'SocketHandlers',
        'APIEndpoints'
      ]
    }
  },

  /**
   * Create operation ID
   */
  createOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  },

  /**
   * Create execution ID
   */
  createExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  },

  /**
   * Create agent API key
   */
  createAgentApiKey(): string {
    return `rpa_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  },

  /**
   * Validate operation timeout
   */
  validateTimeout(timeout: number): number {
    const min = 1000   // 1 second
    const max = 300000 // 5 minutes
    return Math.max(min, Math.min(max, timeout))
  },

  /**
   * Format execution time for display
   */
  formatExecutionTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(milliseconds / 60000)
      const seconds = Math.floor((milliseconds % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  },

  /**
   * Calculate success rate percentage
   */
  calculateSuccessRate(successful: number, total: number): number {
    if (total === 0) return 0
    return Math.round((successful / total) * 100)
  }
}

/**
 * Environment-specific initialization for different deployment contexts
 */
export const RPAEnvironment = {
  /**
   * Initialize for development environment
   */
  async initializeDevelopment(): Promise<void> {
    await initializeRPAModule({
      database: {
        host: 'localhost',
        database: 'sim_rpa_dev',
        poolSize: 5
      },
      agents: {
        maxAgentsPerUser: 10,
        heartbeatTimeout: 30000 // Shorter timeout for dev
      },
      operations: {
        cleanupDelay: 60000 // Faster cleanup for dev
      }
    })
  },

  /**
   * Initialize for production environment
   */
  async initializeProduction(): Promise<void> {
    await initializeRPAModule({
      database: {
        ssl: true,
        poolSize: 20
      },
      agents: {
        maxAgentsPerUser: 5,
        heartbeatTimeout: 90000
      },
      operations: {
        cleanupDelay: 300000
      },
      security: {
        apiKeyExpiration: 30 * 24 * 60 * 60 * 1000, // 30 days in production
        rateLimitRequests: 50 // More restrictive in production
      }
    })
  },

  /**
   * Initialize for testing environment
   */
  async initializeTesting(): Promise<void> {
    await initializeRPAModule({
      database: {
        host: 'localhost',
        database: 'sim_rpa_test',
        poolSize: 2
      },
      agents: {
        maxAgentsPerUser: 2,
        heartbeatTimeout: 10000 // Very short for testing
      },
      operations: {
        maxRetries: 1,
        cleanupDelay: 10000 // Very fast cleanup for testing
      }
    })
  }
}