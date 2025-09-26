/**
 * LogLevel enum defines the severity levels for logging
 *
 * DEBUG: Detailed information, typically useful only for diagnosing problems
 *        These logs are only shown in development environment
 *
 * INFO: Confirmation that things are working as expected
 *       These logs are shown in both development and production environments
 *
 * WARN: Indication that something unexpected happened, or may happen in the near future
 *       The application can still continue working as expected
 *
 * ERROR: Error events that might still allow the application to continue running
 *        These should be investigated and fixed
 */
export declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR"
}
/**
 * Logger class for standardized console logging
 *
 * This class provides methods for logging at different severity levels
 * and handles formatting, colorization, and environment-specific behavior.
 */
export declare class Logger {
    private module;
    /**
     * Create a new logger for a specific module
     * @param module The name of the module (e.g., 'OpenAIProvider', 'AgentBlockHandler')
     */
    constructor(module: string);
    /**
     * Determines if a log at the given level should be displayed
     * based on the current environment configuration
     *
     * @param level The log level to check
     * @returns boolean indicating whether the log should be displayed
     */
    private shouldLog;
    /**
     * Format arguments for logging, converting objects to JSON strings
     *
     * @param args Arguments to format
     * @returns Formatted arguments
     */
    private formatArgs;
    /**
     * Internal method to log a message with the specified level
     *
     * @param level The severity level of the log
     * @param message The main log message
     * @param args Additional arguments to log
     */
    private log;
    /**
     * Log a debug message
     *
     * Use for detailed information useful during development and debugging.
     * These logs are only shown in development environment.
     *
     * Examples:
     * - Variable values during execution
     * - Function entry/exit points
     * - Detailed request/response data
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    debug(message: string, ...args: any[]): void;
    /**
     * Log an info message
     *
     * Use for general information about application operation.
     * These logs are shown in both development and production environments.
     *
     * Examples:
     * - Application startup/shutdown
     * - Configuration information
     * - Successful operations
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    info(message: string, ...args: any[]): void;
    /**
     * Log a warning message
     *
     * Use for potentially problematic situations that don't cause operation failure.
     *
     * Examples:
     * - Deprecated feature usage
     * - Suboptimal configurations
     * - Recoverable errors
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    warn(message: string, ...args: any[]): void;
    /**
     * Log an error message
     *
     * Use for error events that might still allow the application to continue.
     *
     * Examples:
     * - API call failures
     * - Operation failures
     * - Unexpected exceptions
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    error(message: string, ...args: any[]): void;
}
/**
 * Create a logger for a specific module
 *
 * Usage example:
 * ```
 * import { createLogger } from '@/lib/logger'
 *
 * const logger = createLogger('MyComponent')
 *
 * logger.debug('Initializing component', { props })
 * logger.info('Component mounted')
 * logger.warn('Deprecated prop used', { propName })
 * logger.error('Failed to fetch data', error)
 * ```
 *
 * @param module The name of the module (e.g., 'OpenAIProvider', 'AgentBlockHandler')
 * @returns A Logger instance
 */
export declare function createLogger(module: string): Logger;
