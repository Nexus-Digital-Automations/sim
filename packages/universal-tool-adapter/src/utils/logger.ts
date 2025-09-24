/**
 * Universal Tool Adapter - Logger Utility
 *
 * Structured logging system for the adapter framework with contextual
 * information, performance tracking, and integration capabilities.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

/**
 * Log levels with priority ordering
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date
  level: LogLevel
  logger: string
  message: string
  context?: Record<string, any>
  error?: Error
  duration?: number
  correlationId?: string
  executionId?: string
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel
  formatters: LogFormatter[]
  transports: LogTransport[]
  enableContext: boolean
  enablePerformanceTracking: boolean
  enableCorrelation: boolean
}

/**
 * Log formatter interface
 */
export interface LogFormatter {
  format(entry: LogEntry): string
}

/**
 * Log transport interface
 */
export interface LogTransport {
  write(entry: LogEntry, formatted: string): Promise<void> | void
}

/**
 * Built-in log formatters
 */
export class LogFormatters {

  /**
   * Simple console formatter
   */
  static console: LogFormatter = {
    format(entry: LogEntry): string {
      const timestamp = entry.timestamp.toISOString()
      const level = LogLevel[entry.level].padEnd(5)
      const logger = entry.logger.padEnd(20)

      let message = `${timestamp} ${level} [${logger}] ${entry.message}`

      if (entry.context && Object.keys(entry.context).length > 0) {
        message += ` ${JSON.stringify(entry.context)}`
      }

      if (entry.duration !== undefined) {
        message += ` (${entry.duration}ms)`
      }

      if (entry.error) {
        message += `\n${entry.error.stack}`
      }

      return message
    }
  }

  /**
   * JSON formatter for structured logging
   */
  static json: LogFormatter = {
    format(entry: LogEntry): string {
      const jsonEntry = {
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        logger: entry.logger,
        message: entry.message,
        context: entry.context,
        duration: entry.duration,
        correlationId: entry.correlationId,
        executionId: entry.executionId,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined
      }

      return JSON.stringify(jsonEntry)
    }
  }

  /**
   * Development-friendly formatter with colors
   */
  static development: LogFormatter = {
    format(entry: LogEntry): string {
      const timestamp = entry.timestamp.toLocaleTimeString()
      const level = LogLevel[entry.level]

      // Color coding (basic ANSI colors)
      const colors = {
        DEBUG: '\x1b[36m', // Cyan
        INFO: '\x1b[32m',  // Green
        WARN: '\x1b[33m',  // Yellow
        ERROR: '\x1b[31m', // Red
        FATAL: '\x1b[35m', // Magenta
        RESET: '\x1b[0m'
      }

      const color = colors[level as keyof typeof colors] || colors.RESET
      let message = `${color}${timestamp} ${level.padEnd(5)} [${entry.logger}]${colors.RESET} ${entry.message}`

      if (entry.context && Object.keys(entry.context).length > 0) {
        message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
      }

      if (entry.duration !== undefined) {
        message += ` ${colors.DEBUG}(${entry.duration}ms)${colors.RESET}`
      }

      if (entry.error) {
        message += `\n${colors.ERROR}${entry.error.stack}${colors.RESET}`
      }

      return message
    }
  }
}

/**
 * Built-in log transports
 */
export class LogTransports {

  /**
   * Console transport
   */
  static console: LogTransport = {
    write(entry: LogEntry, formatted: string): void {
      if (entry.level >= LogLevel.ERROR) {
        console.error(formatted)
      } else if (entry.level >= LogLevel.WARN) {
        console.warn(formatted)
      } else {
        console.log(formatted)
      }
    }
  }

  /**
   * File transport (simplified - would use fs in real implementation)
   */
  static file(filePath: string): LogTransport {
    return {
      write(entry: LogEntry, formatted: string): void {
        // In a real implementation, this would write to a file
        // For now, it's a placeholder
        console.log(`[FILE:${filePath}] ${formatted}`)
      }
    }
  }

  /**
   * HTTP transport for remote logging
   */
  static http(endpoint: string, headers: Record<string, string> = {}): LogTransport {
    return {
      async write(entry: LogEntry, formatted: string): Promise<void> {
        try {
          await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify({
              log: formatted,
              entry: {
                timestamp: entry.timestamp.toISOString(),
                level: LogLevel[entry.level],
                logger: entry.logger,
                message: entry.message,
                context: entry.context,
                correlationId: entry.correlationId,
                executionId: entry.executionId
              }
            })
          })
        } catch (error) {
          // Fallback to console if HTTP transport fails
          console.error('Log transport failed:', error)
          console.log(formatted)
        }
      }
    }
  }

  /**
   * Memory transport for testing
   */
  static memory(): LogTransport & { getLogs(): LogEntry[] } {
    const logs: LogEntry[] = []

    return {
      write(entry: LogEntry): void {
        logs.push({ ...entry })
      },
      getLogs(): LogEntry[] {
        return [...logs]
      }
    }
  }
}

/**
 * Performance timer for measuring execution time
 */
export class PerformanceTimer {
  private startTime: number
  private marks: Map<string, number> = new Map()

  constructor() {
    this.startTime = performance.now()
  }

  /**
   * Mark a specific point in time
   */
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  /**
   * Get elapsed time since start
   */
  elapsed(): number {
    return performance.now() - this.startTime
  }

  /**
   * Get time between marks
   */
  between(startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark)
    if (!start) {
      throw new Error(`Mark not found: ${startMark}`)
    }

    const end = endMark ? this.marks.get(endMark) : performance.now()
    if (endMark && !end) {
      throw new Error(`Mark not found: ${endMark}`)
    }

    return (end || performance.now()) - start
  }

  /**
   * Get all marks with their elapsed times
   */
  getAllMarks(): Record<string, number> {
    const result: Record<string, number> = {}
    const now = performance.now()

    for (const [name, time] of this.marks) {
      result[name] = time - this.startTime
    }

    return result
  }
}

/**
 * Main Logger class
 */
export class Logger {
  private config: LoggerConfig
  private context: Record<string, any> = {}
  private correlationId?: string
  private executionId?: string

  constructor(
    private name: string,
    config: Partial<LoggerConfig> = {}
  ) {
    this.config = {
      level: LogLevel.INFO,
      formatters: [LogFormatters.console],
      transports: [LogTransports.console],
      enableContext: true,
      enablePerformanceTracking: true,
      enableCorrelation: true,
      ...config
    }
  }

  /**
   * Set persistent context for this logger
   */
  setContext(context: Record<string, any>): void {
    if (this.config.enableContext) {
      this.context = { ...this.context, ...context }
    }
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {}
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): void {
    if (this.config.enableCorrelation) {
      this.correlationId = correlationId
    }
  }

  /**
   * Set execution ID for operation tracking
   */
  setExecutionId(executionId: string): void {
    this.executionId = executionId
  }

  /**
   * Log a message at DEBUG level
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log a message at INFO level
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log a message at WARN level
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log a message at ERROR level
   */
  error(message: string, contextOrError?: Record<string, any> | Error, error?: Error): void {
    if (contextOrError instanceof Error) {
      this.log(LogLevel.ERROR, message, {}, contextOrError)
    } else {
      this.log(LogLevel.ERROR, message, contextOrError, error)
    }
  }

  /**
   * Log a message at FATAL level
   */
  fatal(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error)
  }

  /**
   * Time an operation and log the duration
   */
  time<T>(operation: string, fn: () => T): T {
    if (!this.config.enablePerformanceTracking) {
      return fn()
    }

    const timer = new PerformanceTimer()
    this.debug(`Starting operation: ${operation}`)

    try {
      const result = fn()

      // Handle async operations
      if (result instanceof Promise) {
        return result.then(
          (value) => {
            this.info(`Operation completed: ${operation}`, { duration: timer.elapsed() })
            return value
          },
          (error) => {
            this.error(`Operation failed: ${operation}`, { duration: timer.elapsed() }, error)
            throw error
          }
        ) as T
      }

      this.info(`Operation completed: ${operation}`, { duration: timer.elapsed() })
      return result
    } catch (error) {
      this.error(`Operation failed: ${operation}`, { duration: timer.elapsed() }, error as Error)
      throw error
    }
  }

  /**
   * Time an async operation
   */
  async timeAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.config.enablePerformanceTracking) {
      return fn()
    }

    const timer = new PerformanceTimer()
    this.debug(`Starting async operation: ${operation}`)

    try {
      const result = await fn()
      this.info(`Async operation completed: ${operation}`, { duration: timer.elapsed() })
      return result
    } catch (error) {
      this.error(`Async operation failed: ${operation}`, { duration: timer.elapsed() }, error as Error)
      throw error
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.name, this.config)
    childLogger.setContext({ ...this.context, ...context })
    childLogger.correlationId = this.correlationId
    childLogger.executionId = this.executionId
    return childLogger
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    duration?: number
  ): void {
    // Skip if level is below configured threshold
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      logger: this.name,
      message,
      context: { ...this.context, ...context },
      error,
      duration,
      correlationId: this.correlationId,
      executionId: this.executionId
    }

    // Apply formatters and transports
    for (const formatter of this.config.formatters) {
      const formatted = formatter.format(entry)

      for (const transport of this.config.transports) {
        try {
          transport.write(entry, formatted)
        } catch (transportError) {
          console.error('Log transport error:', transportError)
        }
      }
    }
  }

  /**
   * Update logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }
}

/**
 * Global logger registry
 */
class LoggerRegistry {
  private loggers: Map<string, Logger> = new Map()
  private globalConfig: Partial<LoggerConfig> = {}

  /**
   * Set global configuration for all loggers
   */
  setGlobalConfig(config: Partial<LoggerConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config }

    // Update existing loggers
    for (const logger of this.loggers.values()) {
      logger.setConfig(config)
    }
  }

  /**
   * Get or create a logger
   */
  getLogger(name: string): Logger {
    let logger = this.loggers.get(name)

    if (!logger) {
      logger = new Logger(name, this.globalConfig)
      this.loggers.set(name, logger)
    }

    return logger
  }

  /**
   * Get all registered loggers
   */
  getAllLoggers(): Logger[] {
    return Array.from(this.loggers.values())
  }

  /**
   * Remove a logger from registry
   */
  removeLogger(name: string): boolean {
    return this.loggers.delete(name)
  }

  /**
   * Clear all loggers
   */
  clear(): void {
    this.loggers.clear()
  }
}

/**
 * Global logger registry instance
 */
const globalRegistry = new LoggerRegistry()

/**
 * Create or get a logger instance
 */
export function createLogger(name: string): Logger {
  return globalRegistry.getLogger(name)
}

/**
 * Set global logging configuration
 */
export function setGlobalLogConfig(config: Partial<LoggerConfig>): void {
  globalRegistry.setGlobalConfig(config)
}

/**
 * Get all registered loggers
 */
export function getAllLoggers(): Logger[] {
  return globalRegistry.getAllLoggers()
}

/**
 * Configure development logging
 */
export function configureDevelopmentLogging(): void {
  setGlobalLogConfig({
    level: LogLevel.DEBUG,
    formatters: [LogFormatters.development],
    transports: [LogTransports.console],
    enableContext: true,
    enablePerformanceTracking: true,
    enableCorrelation: true
  })
}

/**
 * Configure production logging
 */
export function configureProductionLogging(options: {
  logLevel?: LogLevel
  httpEndpoint?: string
  enableFileLogging?: boolean
  filePath?: string
} = {}): void {
  const transports: LogTransport[] = []

  // Always include console for production
  transports.push(LogTransports.console)

  // Add HTTP transport if endpoint provided
  if (options.httpEndpoint) {
    transports.push(LogTransports.http(options.httpEndpoint))
  }

  // Add file transport if enabled
  if (options.enableFileLogging && options.filePath) {
    transports.push(LogTransports.file(options.filePath))
  }

  setGlobalLogConfig({
    level: options.logLevel || LogLevel.INFO,
    formatters: [LogFormatters.json],
    transports,
    enableContext: true,
    enablePerformanceTracking: false, // Reduced overhead in production
    enableCorrelation: true
  })
}

/**
 * Configure test logging
 */
export function configureTestLogging(): LogTransport & { getLogs(): LogEntry[] } {
  const memoryTransport = LogTransports.memory()

  setGlobalLogConfig({
    level: LogLevel.DEBUG,
    formatters: [LogFormatters.json],
    transports: [memoryTransport],
    enableContext: true,
    enablePerformanceTracking: true,
    enableCorrelation: true
  })

  return memoryTransport
}