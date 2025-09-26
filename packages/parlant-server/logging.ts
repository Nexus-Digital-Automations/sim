/**
 * Parlant Server Structured Logging System
 *
 * This module provides specialized logging for Parlant server operations,
 * integrating with Sim's existing logging infrastructure while adding
 * Parlant-specific context and structured data.
 */

import { createLogger, type Logger } from '../../apps/sim/lib/logs/console/logger'
import { monitoring } from './monitoring'

/**
 * Parlant-specific log contexts
 */
export interface ParlantLogContext {
  // Agent-related context
  agentId?: string
  agentName?: string
  workspaceId?: string
  userId?: string

  // Session context
  sessionId?: string
  conversationId?: string
  messageId?: string

  // Operation context
  operation?:
    | 'agent_create'
    | 'agent_update'
    | 'session_start'
    | 'session_end'
    | 'message_process'
    | 'tool_execute'
    | 'guideline_apply'
    | 'journey_step'
    | 'alert_triggered'

  // Performance context
  duration?: number
  responseTime?: number
  tokenCount?: number
  toolCalls?: number

  // Integration context
  simWorkflowId?: string
  simBlockId?: string
  simExecutionId?: string

  // Error context
  errorCode?: string
  errorType?:
    | 'validation'
    | 'authentication'
    | 'authorization'
    | 'integration'
    | 'performance'
    | 'system'

  // Tool context
  toolName?: string

  // Tracing context
  correlationId?: string
  traceId?: string

  // Alert context
  alertId?: string
  ruleId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  errorCount?: number

  // Additional metadata
  metadata?: Record<string, any>
}

/**
 * Structured log entry for Parlant operations
 */
export interface ParlantLogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  message: string
  context: ParlantLogContext
  correlationId?: string
  requestId?: string
}

/**
 * Log aggregation for analytics and monitoring
 */
export interface LogAggregation {
  timeWindow: {
    start: string
    end: string
    duration: string
  }
  counts: {
    total: number
    debug: number
    info: number
    warn: number
    error: number
  }
  operations: {
    [operation: string]: {
      count: number
      averageDuration?: number
      errorCount: number
      successCount: number
    }
  }
  agents: {
    [agentId: string]: {
      count: number
      errors: number
      averageResponseTime?: number
    }
  }
  workspaces: {
    [workspaceId: string]: {
      count: number
      agents: number
      sessions: number
    }
  }
}

/**
 * Enhanced Parlant Logger with structured logging capabilities
 */
export class ParlantLogger {
  private baseLogger: Logger
  private logs: ParlantLogEntry[] = []
  private maxLogHistory = 10000
  private correlationId?: string

  constructor(module: string, correlationId?: string) {
    this.baseLogger = createLogger(`Parlant:${module}`)
    this.correlationId = correlationId
  }

  /**
   * Set correlation ID for tracking related operations
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId
  }

  /**
   * Log with Parlant-specific context
   */
  private log(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    message: string,
    context: ParlantLogContext = {},
    requestId?: string
  ): void {
    const timestamp = new Date().toISOString()

    // Create structured log entry
    const logEntry: ParlantLogEntry = {
      timestamp,
      level,
      message,
      context: {
        ...context,
        // Record performance timing if not already provided
        ...(context.duration === undefined &&
          context.responseTime !== undefined && {
            duration: context.responseTime,
          }),
      },
      correlationId: this.correlationId,
      requestId,
    }

    // Store for aggregation and analysis
    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogHistory) {
      this.logs.shift()
    }

    // Format for console output
    const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context, null, 2) : ''
    const fullMessage = requestId ? `[${requestId}] ${message}` : message

    // Send to base logger with appropriate level
    switch (level) {
      case 'DEBUG':
        this.baseLogger.debug(fullMessage, contextStr)
        break
      case 'INFO':
        this.baseLogger.info(fullMessage, contextStr)
        break
      case 'WARN':
        this.baseLogger.warn(fullMessage, contextStr)
        break
      case 'ERROR':
        this.baseLogger.error(fullMessage, contextStr)

        // Record error metrics for monitoring
        if (context.operation) {
          this.recordErrorMetric(context.operation, context.errorType)
        }
        break
    }

    // Record performance metrics
    if (context.duration !== undefined && context.operation) {
      this.recordPerformanceMetric(context.operation, context.duration)
    }
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: ParlantLogContext, requestId?: string): void {
    this.log('DEBUG', message, context, requestId)
  }

  /**
   * Log general information
   */
  info(message: string, context?: ParlantLogContext, requestId?: string): void {
    this.log('INFO', message, context, requestId)
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: ParlantLogContext, requestId?: string): void {
    this.log('WARN', message, context, requestId)
  }

  /**
   * Log errors
   */
  error(message: string, context?: ParlantLogContext, requestId?: string): void {
    this.log('ERROR', message, context, requestId)
  }

  /**
   * Log agent-specific operations
   */
  logAgentOperation(
    operation: ParlantLogContext['operation'],
    message: string,
    context: ParlantLogContext,
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'INFO'
  ): void {
    this.log(level, message, {
      ...context,
      operation,
    })
  }

  /**
   * Log session lifecycle events
   */
  logSession(
    event: 'start' | 'end' | 'message' | 'tool_call',
    sessionId: string,
    context: Omit<ParlantLogContext, 'sessionId'> = {}
  ): void {
    const operation =
      event === 'start' ? 'session_start' : event === 'end' ? 'session_end' : 'message_process'

    this.log('INFO', `Session ${event}`, {
      ...context,
      sessionId,
      operation,
    })
  }

  /**
   * Log performance metrics with timing
   */
  logPerformance(operation: string, startTime: number, context: ParlantLogContext = {}): void {
    const duration = performance.now() - startTime

    this.log('INFO', `${operation} completed`, {
      ...context,
      operation: operation as any,
      duration,
      responseTime: duration,
    })

    // Record for monitoring
    monitoring.recordQuery(duration)
  }

  /**
   * Log integration events with Sim
   */
  logIntegration(
    event: 'workflow_trigger' | 'tool_execute' | 'auth_check' | 'data_sync',
    message: string,
    context: ParlantLogContext
  ): void {
    this.log('INFO', `[Integration] ${message}`, {
      ...context,
      operation: 'tool_execute', // Generic integration operation
    })
  }

  /**
   * Get recent logs for analysis
   */
  getRecentLogs(count = 100): ParlantLogEntry[] {
    return this.logs.slice(-count)
  }

  /**
   * Get logs by criteria
   */
  filterLogs(criteria: {
    level?: ParlantLogEntry['level']
    operation?: ParlantLogContext['operation']
    agentId?: string
    workspaceId?: string
    since?: Date
  }): ParlantLogEntry[] {
    return this.logs.filter((log) => {
      if (criteria.level && log.level !== criteria.level) return false
      if (criteria.operation && log.context.operation !== criteria.operation) return false
      if (criteria.agentId && log.context.agentId !== criteria.agentId) return false
      if (criteria.workspaceId && log.context.workspaceId !== criteria.workspaceId) return false
      if (criteria.since && new Date(log.timestamp) < criteria.since) return false
      return true
    })
  }

  /**
   * Generate log aggregation for analytics
   */
  generateLogAggregation(windowMinutes = 60): LogAggregation {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
    const windowEnd = new Date()
    const relevantLogs = this.filterLogs({ since: windowStart })

    const counts = {
      total: relevantLogs.length,
      debug: relevantLogs.filter((l) => l.level === 'DEBUG').length,
      info: relevantLogs.filter((l) => l.level === 'INFO').length,
      warn: relevantLogs.filter((l) => l.level === 'WARN').length,
      error: relevantLogs.filter((l) => l.level === 'ERROR').length,
    }

    const operations: LogAggregation['operations'] = {}
    const agents: LogAggregation['agents'] = {}
    const workspaces: LogAggregation['workspaces'] = {}

    relevantLogs.forEach((log) => {
      // Aggregate by operation
      if (log.context.operation) {
        if (!operations[log.context.operation]) {
          operations[log.context.operation] = {
            count: 0,
            errorCount: 0,
            successCount: 0,
          }
        }
        operations[log.context.operation].count++

        if (log.level === 'ERROR') {
          operations[log.context.operation].errorCount++
        } else {
          operations[log.context.operation].successCount++
        }

        // Add duration if available
        if (log.context.duration !== undefined) {
          const current = operations[log.context.operation].averageDuration || 0
          const count = operations[log.context.operation].count
          operations[log.context.operation].averageDuration =
            (current * (count - 1) + log.context.duration) / count
        }
      }

      // Aggregate by agent
      if (log.context.agentId) {
        if (!agents[log.context.agentId]) {
          agents[log.context.agentId] = {
            count: 0,
            errors: 0,
          }
        }
        agents[log.context.agentId].count++
        if (log.level === 'ERROR') {
          agents[log.context.agentId].errors++
        }

        // Add response time if available
        if (log.context.responseTime !== undefined) {
          const current = agents[log.context.agentId].averageResponseTime || 0
          const count = agents[log.context.agentId].count
          agents[log.context.agentId].averageResponseTime =
            (current * (count - 1) + log.context.responseTime) / count
        }
      }

      // Aggregate by workspace
      if (log.context.workspaceId) {
        if (!workspaces[log.context.workspaceId]) {
          workspaces[log.context.workspaceId] = {
            count: 0,
            agents: 0,
            sessions: 0,
          }
        }
        workspaces[log.context.workspaceId].count++
      }
    })

    return {
      timeWindow: {
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
        duration: `${windowMinutes} minutes`,
      },
      counts,
      operations,
      agents,
      workspaces,
    }
  }

  /**
   * Record error metrics for monitoring integration
   */
  private recordErrorMetric(operation: string, errorType?: string): void {
    // This would integrate with the monitoring system to track error rates
    // Implementation would depend on the specific monitoring backend
  }

  /**
   * Record performance metrics for monitoring integration
   */
  private recordPerformanceMetric(operation: string, duration: number): void {
    // Record duration for monitoring system
    monitoring.recordQuery(duration)
  }

  /**
   * Export logs in structured format
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getRecentLogs()

    if (format === 'json') {
      return JSON.stringify(logs, null, 2)
    }

    if (format === 'csv') {
      const headers = [
        'timestamp',
        'level',
        'message',
        'operation',
        'agentId',
        'workspaceId',
        'duration',
        'errorType',
      ]
      const rows = logs.map((log) => [
        log.timestamp,
        log.level,
        log.message,
        log.context.operation || '',
        log.context.agentId || '',
        log.context.workspaceId || '',
        log.context.duration || '',
        log.context.errorType || '',
      ])

      return [headers, ...rows].map((row) => row.join(',')).join('\n')
    }

    return JSON.stringify(logs, null, 2)
  }
}

/**
 * Create a specialized Parlant logger
 */
export function createParlantLogger(module: string, correlationId?: string): ParlantLogger {
  return new ParlantLogger(module, correlationId)
}

/**
 * Global Parlant loggers for different components
 */
export const parlantLoggers = {
  agent: createParlantLogger('Agent'),
  session: createParlantLogger('Session'),
  integration: createParlantLogger('Integration'),
  monitoring: createParlantLogger('Monitoring'),
  auth: createParlantLogger('Auth'),
  tools: createParlantLogger('Tools'),
  guidelines: createParlantLogger('Guidelines'),
  journeys: createParlantLogger('Journeys'),
}

/**
 * Utility functions for common logging patterns
 */
export const logUtils = {
  /**
   * Start performance timing
   */
  startTimer: () => performance.now(),

  /**
   * Generate correlation ID
   */
  generateCorrelationId: () => `parlant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Format context for logging
   */
  formatContext: (context: Record<string, any>): ParlantLogContext => {
    return Object.keys(context).reduce((acc, key) => {
      if (context[key] !== undefined && context[key] !== null) {
        acc[key as keyof ParlantLogContext] = context[key]
      }
      return acc
    }, {} as ParlantLogContext)
  },

  /**
   * Create request ID
   */
  generateRequestId: () => `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
}
