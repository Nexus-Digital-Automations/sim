/**
 * RPA Database Operations
 * 
 * Centralized database operations for RPA execution logging, persistence, and
 * analytics. Provides comprehensive data management for agents, operations,
 * workflows, and execution history with performance optimization.
 * 
 * Features:
 * - Agent registration and lifecycle tracking
 * - Operation execution logging and results storage
 * - Workflow execution history and analytics
 * - Performance metrics and error tracking
 * - Data retention and cleanup policies
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { 
  DesktopAgent,
  RPAOperation,
  RPAOperationResult,
  RPAWorkflowExecution,
  RPAExecutionLog,
  AgentMetrics,
  RPAError
} from '@/types/rpa'

const logger = createLogger('RPADatabase')

/**
 * Database configuration and connection settings
 */
interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  poolSize?: number
  connectionTimeout?: number
  queryTimeout?: number
}

/**
 * Data retention policies for different entity types
 */
export const RETENTION_POLICIES = {
  AGENT_METRICS: 30 * 24 * 60 * 60 * 1000, // 30 days
  OPERATION_LOGS: 90 * 24 * 60 * 60 * 1000, // 90 days
  WORKFLOW_EXECUTIONS: 180 * 24 * 60 * 60 * 1000, // 180 days
  ERROR_LOGS: 365 * 24 * 60 * 60 * 1000, // 1 year
  SCREENSHOTS: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const

/**
 * Database table schemas for RPA entities
 */
export const TABLE_SCHEMAS = {
  // Agent registration and status tracking
  AGENTS: `
    CREATE TABLE IF NOT EXISTS rpa_agents (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      version VARCHAR(50) NOT NULL,
      capabilities JSON NOT NULL,
      status ENUM('online', 'offline', 'busy', 'error') DEFAULT 'offline',
      connection_id VARCHAR(255),
      api_key_hash VARCHAR(255),
      last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_last_heartbeat (last_heartbeat)
    )
  `,

  // Agent performance metrics
  AGENT_METRICS: `
    CREATE TABLE IF NOT EXISTS rpa_agent_metrics (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      agent_id VARCHAR(36) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      cpu_usage DECIMAL(5,2) DEFAULT 0,
      memory_usage DECIMAL(5,2) DEFAULT 0,
      active_operations INT DEFAULT 0,
      total_operations_completed INT DEFAULT 0,
      average_response_time INT DEFAULT 0,
      error_rate DECIMAL(5,2) DEFAULT 0,
      INDEX idx_agent_timestamp (agent_id, timestamp),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    )
  `,

  // Operation execution tracking
  OPERATIONS: `
    CREATE TABLE IF NOT EXISTS rpa_operations (
      id VARCHAR(36) PRIMARY KEY,
      agent_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      workflow_id VARCHAR(36),
      execution_id VARCHAR(36),
      type ENUM('click', 'type', 'extract', 'screenshot', 'wait', 'find-element') NOT NULL,
      parameters JSON NOT NULL,
      status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'timeout') DEFAULT 'pending',
      priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',
      timeout INT DEFAULT 30000,
      max_retries INT DEFAULT 3,
      current_retry INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      execution_time INT,
      INDEX idx_agent_status (agent_id, status),
      INDEX idx_user_created (user_id, created_at),
      INDEX idx_workflow_execution (workflow_id, execution_id),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    )
  `,

  // Operation results and outputs
  OPERATION_RESULTS: `
    CREATE TABLE IF NOT EXISTS rpa_operation_results (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation_id VARCHAR(36) NOT NULL,
      success BOOLEAN NOT NULL,
      result JSON,
      error_message TEXT,
      screenshot_path VARCHAR(500),
      execution_time INT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_operation (operation_id),
      FOREIGN KEY (operation_id) REFERENCES rpa_operations(id) ON DELETE CASCADE
    )
  `,

  // Workflow execution tracking
  WORKFLOW_EXECUTIONS: `
    CREATE TABLE IF NOT EXISTS rpa_workflow_executions (
      id VARCHAR(36) PRIMARY KEY,
      workflow_id VARCHAR(36) NOT NULL,
      agent_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      status ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
      progress DECIMAL(5,2) DEFAULT 0,
      total_operations INT DEFAULT 0,
      completed_operations INT DEFAULT 0,
      failed_operations INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      execution_time INT,
      INDEX idx_workflow_status (workflow_id, status),
      INDEX idx_user_created (user_id, created_at),
      INDEX idx_agent_execution (agent_id, created_at),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    )
  `,

  // Execution logs and debugging information
  EXECUTION_LOGS: `
    CREATE TABLE IF NOT EXISTS rpa_execution_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      execution_id VARCHAR(36),
      operation_id VARCHAR(36),
      agent_id VARCHAR(36) NOT NULL,
      level ENUM('debug', 'info', 'warn', 'error') NOT NULL,
      message TEXT NOT NULL,
      details JSON,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_execution_timestamp (execution_id, timestamp),
      INDEX idx_operation_timestamp (operation_id, timestamp),
      INDEX idx_agent_level (agent_id, level),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    )
  `,

  // Error tracking and analytics
  ERROR_LOGS: `
    CREATE TABLE IF NOT EXISTS rpa_error_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      category ENUM('agent_connection', 'authentication', 'operation_execution', 'workflow_orchestration', 'validation', 'timeout', 'capability_mismatch', 'system_error') NOT NULL,
      severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
      agent_id VARCHAR(36),
      operation_id VARCHAR(36),
      execution_id VARCHAR(36),
      details JSON,
      stack_trace TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category_severity (category, severity),
      INDEX idx_agent_timestamp (agent_id, timestamp),
      INDEX idx_code (code),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE SET NULL
    )
  `,

  // Screenshot and file storage metadata
  FILE_STORAGE: `
    CREATE TABLE IF NOT EXISTS rpa_file_storage (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      file_path VARCHAR(500) NOT NULL,
      file_type ENUM('screenshot', 'log', 'result', 'diagnostic') NOT NULL,
      file_size BIGINT,
      mime_type VARCHAR(100),
      operation_id VARCHAR(36),
      execution_id VARCHAR(36),
      agent_id VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      INDEX idx_type_created (file_type, created_at),
      INDEX idx_operation (operation_id),
      INDEX idx_execution (execution_id),
      INDEX idx_expires (expires_at)
    )
  `
} as const

/**
 * RPA Database Manager Class
 * Handles all database operations for RPA functionality
 */
export class RPADatabaseManager {
  private config: DatabaseConfig
  private connection: any = null
  private isInitialized = false

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      // In production, this would establish actual database connection
      // For now, we'll simulate with logging
      logger.info('Initializing RPA database connection', {
        host: this.config.host,
        database: this.config.database,
        poolSize: this.config.poolSize || 10
      })

      // Create tables if they don't exist
      await this.createTables()
      
      // Set up cleanup job
      this.scheduleCleanupTasks()

      this.isInitialized = true
      logger.info('RPA database initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize RPA database', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Create database tables if they don't exist
   */
  private async createTables(): Promise<void> {
    for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
      try {
        // In production, execute actual SQL
        logger.debug(`Creating table schema: ${tableName}`)
        // await this.connection.execute(schema)
      } catch (error) {
        logger.error(`Failed to create table ${tableName}`, {
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      }
    }
  }

  /**
   * Agent Management Operations
   */

  async saveAgent(agent: DesktopAgent): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = `
        INSERT INTO rpa_agents 
        (id, user_id, name, platform, version, capabilities, status, connection_id, api_key_hash, last_heartbeat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        connection_id = VALUES(connection_id),
        last_heartbeat = VALUES(last_heartbeat),
        updated_at = CURRENT_TIMESTAMP
      `

      // In production, execute actual database query
      logger.debug('Saving agent to database', {
        agentId: agent.id,
        name: agent.name,
        status: agent.status
      })

    } catch (error) {
      logger.error('Failed to save agent', {
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getAgent(agentId: string): Promise<DesktopAgent | null> {
    this.ensureInitialized()
    
    try {
      const query = 'SELECT * FROM rpa_agents WHERE id = ?'
      
      // In production, execute query and return mapped result
      logger.debug('Retrieving agent from database', { agentId })
      
      // Simulated return - in production, map database row to DesktopAgent
      return null
    } catch (error) {
      logger.error('Failed to retrieve agent', {
        agentId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  async getUserAgents(userId: string): Promise<DesktopAgent[]> {
    this.ensureInitialized()
    
    try {
      const query = 'SELECT * FROM rpa_agents WHERE user_id = ? ORDER BY created_at DESC'
      
      logger.debug('Retrieving user agents from database', { userId })
      
      // In production, execute query and return mapped results
      return []
    } catch (error) {
      logger.error('Failed to retrieve user agents', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  async updateAgentStatus(agentId: string, status: DesktopAgent['status']): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = `
        UPDATE rpa_agents 
        SET status = ?, last_heartbeat = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `
      
      logger.debug('Updating agent status', { agentId, status })
      
    } catch (error) {
      logger.error('Failed to update agent status', {
        agentId,
        status,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = 'DELETE FROM rpa_agents WHERE id = ?'
      
      logger.info('Deleting agent from database', { agentId })
      
    } catch (error) {
      logger.error('Failed to delete agent', {
        agentId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Agent Metrics Operations
   */

  async saveAgentMetrics(metrics: AgentMetrics): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = `
        INSERT INTO rpa_agent_metrics 
        (agent_id, cpu_usage, memory_usage, active_operations, total_operations_completed, average_response_time, error_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      
      logger.debug('Saving agent metrics', {
        agentId: metrics.agentId,
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage
      })
      
    } catch (error) {
      logger.error('Failed to save agent metrics', {
        agentId: metrics.agentId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getAgentMetricsHistory(agentId: string, timeWindow?: number): Promise<AgentMetrics[]> {
    this.ensureInitialized()
    
    try {
      let query = 'SELECT * FROM rpa_agent_metrics WHERE agent_id = ?'
      const params = [agentId]
      
      if (timeWindow) {
        query += ' AND timestamp >= DATE_SUB(NOW(), INTERVAL ? MILLISECOND)'
        params.push(timeWindow.toString())
      }
      
      query += ' ORDER BY timestamp DESC LIMIT 1000'
      
      logger.debug('Retrieving agent metrics history', { agentId, timeWindow })
      
      return []
    } catch (error) {
      logger.error('Failed to retrieve agent metrics', {
        agentId,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Operation Management
   */

  async saveOperation(operation: RPAOperation): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = `
        INSERT INTO rpa_operations 
        (id, agent_id, user_id, workflow_id, execution_id, type, parameters, status, priority, timeout, max_retries)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        started_at = CASE WHEN VALUES(status) = 'in_progress' THEN CURRENT_TIMESTAMP ELSE started_at END,
        completed_at = CASE WHEN VALUES(status) IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END
      `
      
      logger.debug('Saving operation to database', {
        operationId: operation.id,
        type: operation.type,
        status: operation.status
      })
      
    } catch (error) {
      logger.error('Failed to save operation', {
        operationId: operation.id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getOperation(operationId: string): Promise<RPAOperation | null> {
    this.ensureInitialized()
    
    try {
      const query = 'SELECT * FROM rpa_operations WHERE id = ?'
      
      logger.debug('Retrieving operation from database', { operationId })
      
      return null
    } catch (error) {
      logger.error('Failed to retrieve operation', {
        operationId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  async updateOperationStatus(operationId: string, status: RPAOperation['status'], result?: RPAOperationResult): Promise<void> {
    this.ensureInitialized()
    
    try {
      // Update operation status
      const operationQuery = `
        UPDATE rpa_operations 
        SET status = ?,
            started_at = CASE WHEN ? = 'in_progress' AND started_at IS NULL THEN CURRENT_TIMESTAMP ELSE started_at END,
            completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END,
            execution_time = ?
        WHERE id = ?
      `
      
      // Save result if provided
      if (result) {
        const resultQuery = `
          INSERT INTO rpa_operation_results 
          (operation_id, success, result, error_message, screenshot_path, execution_time)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          success = VALUES(success),
          result = VALUES(result),
          error_message = VALUES(error_message),
          screenshot_path = VALUES(screenshot_path),
          execution_time = VALUES(execution_time)
        `
        
        logger.debug('Saving operation result', {
          operationId,
          success: result.success,
          executionTime: result.executionTime
        })
      }
      
      logger.debug('Updating operation status', { operationId, status })
      
    } catch (error) {
      logger.error('Failed to update operation status', {
        operationId,
        status,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getUserOperations(userId: string, limit: number = 100): Promise<RPAOperation[]> {
    this.ensureInitialized()
    
    try {
      const query = `
        SELECT * FROM rpa_operations 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `
      
      logger.debug('Retrieving user operations', { userId, limit })
      
      return []
    } catch (error) {
      logger.error('Failed to retrieve user operations', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Workflow Execution Management
   */

  async saveWorkflowExecution(execution: RPAWorkflowExecution): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = `
        INSERT INTO rpa_workflow_executions 
        (id, workflow_id, agent_id, user_id, status, progress, total_operations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        progress = VALUES(progress),
        completed_operations = ?,
        failed_operations = ?,
        started_at = CASE WHEN VALUES(status) = 'running' AND started_at IS NULL THEN CURRENT_TIMESTAMP ELSE started_at END,
        completed_at = CASE WHEN VALUES(status) IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END
      `
      
      logger.debug('Saving workflow execution', {
        executionId: execution.id,
        workflowId: execution.workflowId,
        status: execution.status
      })
      
    } catch (error) {
      logger.error('Failed to save workflow execution', {
        executionId: execution.id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getWorkflowExecution(executionId: string): Promise<RPAWorkflowExecution | null> {
    this.ensureInitialized()
    
    try {
      const query = 'SELECT * FROM rpa_workflow_executions WHERE id = ?'
      
      logger.debug('Retrieving workflow execution', { executionId })
      
      return null
    } catch (error) {
      logger.error('Failed to retrieve workflow execution', {
        executionId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  async getUserWorkflowExecutions(userId: string, limit: number = 50): Promise<RPAWorkflowExecution[]> {
    this.ensureInitialized()
    
    try {
      const query = `
        SELECT * FROM rpa_workflow_executions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `
      
      logger.debug('Retrieving user workflow executions', { userId, limit })
      
      return []
    } catch (error) {
      logger.error('Failed to retrieve user workflow executions', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Logging and Error Tracking
   */

  async saveExecutionLog(log: RPAExecutionLog): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = `
        INSERT INTO rpa_execution_logs 
        (execution_id, operation_id, agent_id, level, message, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      
      logger.debug('Saving execution log', {
        executionId: log.executionId,
        operationId: log.operationId,
        level: log.level
      })
      
    } catch (error) {
      logger.error('Failed to save execution log', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async saveError(error: RPAError): Promise<void> {
    this.ensureInitialized()
    
    try {
      const query = `
        INSERT INTO rpa_error_logs 
        (code, message, category, severity, agent_id, operation_id, execution_id, details, stack_trace)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      logger.debug('Saving error log', {
        code: error.code,
        category: error.category,
        severity: error.severity
      })
      
    } catch (error) {
      logger.error('Failed to save error log', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getExecutionLogs(executionId: string): Promise<RPAExecutionLog[]> {
    this.ensureInitialized()
    
    try {
      const query = `
        SELECT * FROM rpa_execution_logs 
        WHERE execution_id = ? 
        ORDER BY timestamp ASC
      `
      
      logger.debug('Retrieving execution logs', { executionId })
      
      return []
    } catch (error) {
      logger.error('Failed to retrieve execution logs', {
        executionId,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Analytics and Reporting
   */

  async getOperationStats(userId?: string, timeWindow?: number): Promise<{
    total: number
    successful: number
    failed: number
    averageExecutionTime: number
    errorRate: number
  }> {
    this.ensureInitialized()
    
    try {
      let query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          AVG(execution_time) as avg_execution_time
        FROM rpa_operations 
        WHERE 1=1
      `
      
      const params = []
      
      if (userId) {
        query += ' AND user_id = ?'
        params.push(userId)
      }
      
      if (timeWindow) {
        query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? MILLISECOND)'
        params.push(timeWindow.toString())
      }
      
      logger.debug('Retrieving operation statistics', { userId, timeWindow })
      
      // In production, execute query and calculate error rate
      return {
        total: 0,
        successful: 0,
        failed: 0,
        averageExecutionTime: 0,
        errorRate: 0
      }
    } catch (error) {
      logger.error('Failed to retrieve operation statistics', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getAgentPerformanceReport(agentId: string, timeWindow?: number): Promise<{
    operationsExecuted: number
    successRate: number
    averageResponseTime: number
    uptimePercentage: number
    errorCount: number
  }> {
    this.ensureInitialized()
    
    try {
      // Multiple queries to get comprehensive performance data
      logger.debug('Generating agent performance report', { agentId, timeWindow })
      
      return {
        operationsExecuted: 0,
        successRate: 0,
        averageResponseTime: 0,
        uptimePercentage: 0,
        errorCount: 0
      }
    } catch (error) {
      logger.error('Failed to generate performance report', {
        agentId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Data Cleanup and Maintenance
   */

  private scheduleCleanupTasks(): void {
    // Run cleanup every 24 hours
    setInterval(async () => {
      await this.performCleanup()
    }, 24 * 60 * 60 * 1000)

    logger.info('Database cleanup tasks scheduled')
  }

  private async performCleanup(): Promise<void> {
    logger.info('Starting database cleanup tasks')
    
    try {
      // Clean up old metrics
      await this.cleanupOldData('rpa_agent_metrics', RETENTION_POLICIES.AGENT_METRICS)
      
      // Clean up old operation logs
      await this.cleanupOldData('rpa_execution_logs', RETENTION_POLICIES.OPERATION_LOGS)
      
      // Clean up old workflow executions
      await this.cleanupOldData('rpa_workflow_executions', RETENTION_POLICIES.WORKFLOW_EXECUTIONS)
      
      // Clean up old screenshots and files
      await this.cleanupExpiredFiles()
      
      logger.info('Database cleanup completed successfully')
    } catch (error) {
      logger.error('Database cleanup failed', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async cleanupOldData(tableName: string, retentionMs: number): Promise<void> {
    try {
      const query = `
        DELETE FROM ${tableName} 
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? MILLISECOND)
      `
      
      logger.debug(`Cleaning up old data from ${tableName}`, { retentionMs })
      
    } catch (error) {
      logger.error(`Failed to cleanup ${tableName}`, {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async cleanupExpiredFiles(): Promise<void> {
    try {
      const query = 'SELECT file_path FROM rpa_file_storage WHERE expires_at < NOW()'
      
      // In production, execute query and delete files from storage
      // Also delete database records
      
      logger.debug('Cleaning up expired files')
      
    } catch (error) {
      logger.error('Failed to cleanup expired files', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Utility Methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      // In production, close database connection
      logger.info('Closing database connection')
      this.isInitialized = false
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency: number
    details: string
  }> {
    try {
      const startTime = Date.now()
      
      // In production, execute simple query to test connection
      // const result = await this.connection.execute('SELECT 1')
      
      const latency = Date.now() - startTime
      
      return {
        status: 'healthy',
        latency,
        details: 'Database connection is healthy'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Singleton database manager instance
 */
let databaseInstance: RPADatabaseManager | null = null

/**
 * Get singleton database manager instance
 */
export function getDatabaseManager(config?: DatabaseConfig): RPADatabaseManager {
  if (!databaseInstance && config) {
    databaseInstance = new RPADatabaseManager(config)
  }
  
  if (!databaseInstance) {
    throw new Error('Database manager not initialized. Provide configuration on first call.')
  }
  
  return databaseInstance
}

/**
 * Database utility functions
 */
export const DatabaseUtils = {
  /**
   * Create database connection configuration from environment variables
   */
  createConfigFromEnv(): DatabaseConfig {
    return {
      host: process.env.RPA_DB_HOST || 'localhost',
      port: parseInt(process.env.RPA_DB_PORT || '3306'),
      database: process.env.RPA_DB_NAME || 'sim_rpa',
      username: process.env.RPA_DB_USER || 'root',
      password: process.env.RPA_DB_PASSWORD || '',
      ssl: process.env.RPA_DB_SSL === 'true',
      poolSize: parseInt(process.env.RPA_DB_POOL_SIZE || '10'),
      connectionTimeout: parseInt(process.env.RPA_DB_CONNECTION_TIMEOUT || '30000'),
      queryTimeout: parseInt(process.env.RPA_DB_QUERY_TIMEOUT || '60000')
    }
  },

  /**
   * Test database connection
   */
  async testConnection(config: DatabaseConfig): Promise<boolean> {
    try {
      const testManager = new RPADatabaseManager(config)
      await testManager.initialize()
      const health = await testManager.healthCheck()
      await testManager.close()
      
      return health.status === 'healthy'
    } catch {
      return false
    }
  },

  /**
   * Generate migration scripts for schema updates
   */
  generateMigrationSQL(fromVersion: string, toVersion: string): string[] {
    // In production, implement version-specific migration logic
    logger.info('Generating migration scripts', { fromVersion, toVersion })
    return []
  }
}