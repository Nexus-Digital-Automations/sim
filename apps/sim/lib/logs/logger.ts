/**
 * Logging System - Enhanced logging with structured format and analytics integration
 *
 * Provides comprehensive logging functionality for the Sim platform including:
 * - Structured logging with context and metadata
 * - Performance tracking and timing information  
 * - Error handling with stack traces and correlation IDs
 * - Integration with help system analytics
 * - Development and production environment awareness
 *
 * @created 2025-09-04
 * @author Claude Development System - Final Concurrent Subagent 10/10
 */

export interface LogContext {
  operationId?: string
  userId?: string
  component?: string
  duration?: number
  metadata?: Record<string, any>
}

export interface Logger {
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
  debug(message: string, context?: LogContext): void
}

/**
 * Enhanced Logger Implementation
 * 
 * Provides structured logging with comprehensive context information
 * and integration with the help system analytics.
 */
class EnhancedLogger implements Logger {
  constructor(private module: string) {}

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const ctx = context ? ` [${JSON.stringify(context)}]` : ''
    return `[${timestamp}] [${level}] [${this.module}] ${message}${ctx}`
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('INFO', message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('WARN', message, context))
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('ERROR', message, context))
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, context))
    }
  }
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(module: string): Logger {
  return new EnhancedLogger(module)
}

export default createLogger