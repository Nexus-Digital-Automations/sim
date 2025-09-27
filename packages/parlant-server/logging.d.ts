/**
 * Parlant Server Structured Logging System
 *
 * This module provides specialized logging for Parlant server operations,
 * integrating with Sim's existing logging infrastructure while adding
 * Parlant-specific context and structured data.
 */
/**
 * Parlant-specific log contexts
 */
export interface ParlantLogContext {
  agentId?: string;
  agentName?: string;
  workspaceId?: string;
  userId?: string;
  sessionId?: string;
  conversationId?: string;
  messageId?: string;
  operation?:
    | "agent_create"
    | "agent_update"
    | "session_start"
    | "session_end"
    | "message_process"
    | "tool_execute"
    | "guideline_apply"
    | "journey_step";
  duration?: number;
  responseTime?: number;
  tokenCount?: number;
  toolCalls?: number;
  simWorkflowId?: string;
  simBlockId?: string;
  simExecutionId?: string;
  errorCode?: string;
  errorType?:
    | "validation"
    | "authentication"
    | "authorization"
    | "integration"
    | "performance"
    | "system";
  metadata?: Record<string, any>;
}
/**
 * Structured log entry for Parlant operations
 */
export interface ParlantLogEntry {
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  message: string;
  context: ParlantLogContext;
  correlationId?: string;
  requestId?: string;
}
/**
 * Log aggregation for analytics and monitoring
 */
export interface LogAggregation {
  timeWindow: {
    start: string;
    end: string;
    duration: string;
  };
  counts: {
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
  };
  operations: {
    [operation: string]: {
      count: number;
      averageDuration?: number;
      errorCount: number;
      successCount: number;
    };
  };
  agents: {
    [agentId: string]: {
      count: number;
      errors: number;
      averageResponseTime?: number;
    };
  };
  workspaces: {
    [workspaceId: string]: {
      count: number;
      agents: number;
      sessions: number;
    };
  };
}
/**
 * Enhanced Parlant Logger with structured logging capabilities
 */
export declare class ParlantLogger {
  private baseLogger;
  private logs;
  private maxLogHistory;
  private correlationId?;
  constructor(module: string, correlationId?: string);
  /**
   * Set correlation ID for tracking related operations
   */
  setCorrelationId(correlationId: string): void;
  /**
   * Log with Parlant-specific context
   */
  private log;
  /**
   * Log debug information
   */
  debug(message: string, context?: ParlantLogContext, requestId?: string): void;
  /**
   * Log general information
   */
  info(message: string, context?: ParlantLogContext, requestId?: string): void;
  /**
   * Log warnings
   */
  warn(message: string, context?: ParlantLogContext, requestId?: string): void;
  /**
   * Log errors
   */
  error(message: string, context?: ParlantLogContext, requestId?: string): void;
  /**
   * Log agent-specific operations
   */
  logAgentOperation(
    operation: ParlantLogContext["operation"],
    message: string,
    context: ParlantLogContext,
    level?: "DEBUG" | "INFO" | "WARN" | "ERROR",
  ): void;
  /**
   * Log session lifecycle events
   */
  logSession(
    event: "start" | "end" | "message" | "tool_call",
    sessionId: string,
    context?: Omit<ParlantLogContext, "sessionId">,
  ): void;
  /**
   * Log performance metrics with timing
   */
  logPerformance(
    operation: string,
    startTime: number,
    context?: ParlantLogContext,
  ): void;
  /**
   * Log integration events with Sim
   */
  logIntegration(
    event: "workflow_trigger" | "tool_execute" | "auth_check" | "data_sync",
    message: string,
    context: ParlantLogContext,
  ): void;
  /**
   * Get recent logs for analysis
   */
  getRecentLogs(count?: number): ParlantLogEntry[];
  /**
   * Get logs by criteria
   */
  filterLogs(criteria: {
    level?: ParlantLogEntry["level"];
    operation?: ParlantLogContext["operation"];
    agentId?: string;
    workspaceId?: string;
    since?: Date;
  }): ParlantLogEntry[];
  /**
   * Generate log aggregation for analytics
   */
  generateLogAggregation(windowMinutes?: number): LogAggregation;
  /**
   * Record error metrics for monitoring integration
   */
  private recordErrorMetric;
  /**
   * Record performance metrics for monitoring integration
   */
  private recordPerformanceMetric;
  /**
   * Export logs in structured format
   */
  exportLogs(format?: "json" | "csv"): string;
}
/**
 * Create a specialized Parlant logger
 */
export declare function createParlantLogger(
  module: string,
  correlationId?: string,
): ParlantLogger;
/**
 * Global Parlant loggers for different components
 */
export declare const parlantLoggers: {
  agent: ParlantLogger;
  session: ParlantLogger;
  integration: ParlantLogger;
  monitoring: ParlantLogger;
  auth: ParlantLogger;
  tools: ParlantLogger;
  guidelines: ParlantLogger;
  journeys: ParlantLogger;
};
/**
 * Utility functions for common logging patterns
 */
export declare const logUtils: {
  /**
   * Start performance timing
   */
  startTimer: () => number;
  /**
   * Generate correlation ID
   */
  generateCorrelationId: () => string;
  /**
   * Format context for logging
   */
  formatContext: (context: Record<string, any>) => ParlantLogContext;
  /**
   * Create request ID
   */
  generateRequestId: () => string;
};
