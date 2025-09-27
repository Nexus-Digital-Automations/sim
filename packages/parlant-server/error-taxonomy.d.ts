/**
 * Comprehensive Error Taxonomy and Classification System for Universal Tool Adapter
 *
 * This module provides a hierarchical error classification system that covers all
 * possible failure modes in the Universal Tool Adapter System, with specific
 * categorization, severity levels, and automated correlation capabilities.
 */
import type { ParlantLogContext } from "./logging";
/**
 * Primary error categories in the Universal Tool Adapter System
 */
export declare enum ErrorCategory {
  TOOL_ADAPTER = "tool_adapter",
  TOOL_EXECUTION = "tool_execution",
  TOOL_CONFIGURATION = "tool_configuration",
  TOOL_AUTHENTICATION = "tool_authentication",
  TOOL_VALIDATION = "tool_validation",
  SYSTEM_RESOURCE = "system_resource",
  SYSTEM_NETWORK = "system_network",
  SYSTEM_PERMISSION = "system_permission",
  SYSTEM_DEPENDENCY = "system_dependency",
  INTEGRATION_API = "integration_api",
  INTEGRATION_DATABASE = "integration_database",
  INTEGRATION_AUTH = "integration_auth",
  INTEGRATION_WEBSOCKET = "integration_websocket",
  USER_INPUT = "user_input",
  USER_PERMISSION = "user_permission",
  USER_CONTEXT = "user_context",
  AGENT_REASONING = "agent_reasoning",
  AGENT_COMMUNICATION = "agent_communication",
  AGENT_WORKFLOW = "agent_workflow",
  EXTERNAL_SERVICE = "external_service",
  EXTERNAL_TIMEOUT = "external_timeout",
  EXTERNAL_QUOTA = "external_quota",
}
/**
 * Error severity levels with clear escalation paths
 */
export declare enum ErrorSeverity {
  TRACE = "trace", // Detailed debugging information
  DEBUG = "debug", // Development debugging
  INFO = "info", // Informational messages
  WARNING = "warning", // Potential issues that don't block execution
  ERROR = "error", // Errors that require attention but system continues
  CRITICAL = "critical", // Errors that require immediate attention
  FATAL = "fatal",
}
/**
 * Error impact assessment levels
 */
export declare enum ErrorImpact {
  NONE = "none", // No user impact
  LOW = "low", // Single user, single operation
  MEDIUM = "medium", // Single user, multiple operations or temporary degradation
  HIGH = "high", // Multiple users affected or extended degradation
  CRITICAL = "critical",
}
/**
 * Recovery strategy classifications
 */
export declare enum RecoveryStrategy {
  NONE = "none", // No recovery possible
  MANUAL = "manual", // Requires manual intervention
  RETRY = "retry", // Automatic retry with backoff
  FALLBACK = "fallback", // Switch to alternative approach
  CIRCUIT_BREAKER = "circuit_breaker", // Temporarily disable failing component
  GRACEFUL_DEGRADATION = "graceful_degradation",
}
/**
 * Detailed error subcategories for precise classification
 */
export declare const ErrorSubcategories: {
  readonly tool_adapter: readonly [
    "interface_mismatch",
    "parameter_mapping",
    "response_transformation",
    "schema_validation",
    "version_compatibility",
  ];
  readonly tool_execution: readonly [
    "timeout",
    "permission_denied",
    "resource_exhausted",
    "invalid_state",
    "dependency_failure",
    "data_corruption",
  ];
  readonly tool_configuration: readonly [
    "missing_config",
    "invalid_config",
    "config_conflict",
    "environment_mismatch",
    "secret_unavailable",
  ];
  readonly tool_authentication: readonly [
    "invalid_credentials",
    "token_expired",
    "insufficient_permissions",
    "oauth_failure",
    "api_key_invalid",
    "rate_limit_exceeded",
  ];
  readonly tool_validation: readonly [
    "input_validation",
    "output_validation",
    "schema_mismatch",
    "constraint_violation",
    "business_rule_violation",
  ];
  readonly system_resource: readonly [
    "memory_exhausted",
    "cpu_overload",
    "disk_full",
    "handle_exhausted",
    "connection_pool_full",
  ];
  readonly system_network: readonly [
    "connection_refused",
    "timeout",
    "dns_resolution",
    "ssl_handshake",
    "proxy_error",
    "firewall_blocked",
  ];
  readonly system_permission: readonly [
    "file_access_denied",
    "directory_access_denied",
    "execution_permission",
    "network_permission",
    "security_policy_violation",
  ];
  readonly system_dependency: readonly [
    "missing_dependency",
    "version_conflict",
    "circular_dependency",
    "initialization_failure",
    "service_unavailable",
  ];
  readonly integration_api: readonly [
    "endpoint_not_found",
    "method_not_allowed",
    "payload_too_large",
    "unsupported_media_type",
    "api_version_mismatch",
  ];
  readonly integration_database: readonly [
    "connection_failed",
    "query_timeout",
    "constraint_violation",
    "deadlock",
    "data_integrity_violation",
  ];
  readonly integration_auth: readonly [
    "session_expired",
    "invalid_token",
    "permission_denied",
    "workspace_access_denied",
    "user_not_found",
  ];
  readonly integration_websocket: readonly [
    "connection_lost",
    "handshake_failed",
    "protocol_error",
    "message_too_large",
    "rate_limit_exceeded",
  ];
  readonly user_input: readonly [
    "invalid_format",
    "missing_required_field",
    "value_out_of_range",
    "unsupported_operation",
    "malformed_request",
  ];
  readonly user_permission: readonly [
    "insufficient_role",
    "workspace_access_denied",
    "feature_not_enabled",
    "quota_exceeded",
    "account_suspended",
  ];
  readonly user_context: readonly [
    "session_invalid",
    "workspace_not_found",
    "context_mismatch",
    "state_conflict",
    "concurrent_modification",
  ];
  readonly agent_reasoning: readonly [
    "tool_selection_failed",
    "parameter_inference_failed",
    "goal_unreachable",
    "logical_contradiction",
    "infinite_loop_detected",
  ];
  readonly agent_communication: readonly [
    "message_parse_error",
    "response_generation_failed",
    "context_understanding_failed",
    "conversation_state_lost",
    "language_model_error",
  ];
  readonly agent_workflow: readonly [
    "workflow_execution_failed",
    "state_transition_invalid",
    "parallel_execution_conflict",
    "workflow_timeout",
    "checkpoint_corruption",
  ];
  readonly external_service: readonly [
    "service_unavailable",
    "api_error",
    "authentication_failed",
    "response_invalid",
    "service_deprecated",
  ];
  readonly external_timeout: readonly [
    "request_timeout",
    "response_timeout",
    "connection_timeout",
    "operation_timeout",
    "batch_timeout",
  ];
  readonly external_quota: readonly [
    "rate_limit_exceeded",
    "daily_quota_exceeded",
    "concurrent_limit_reached",
    "resource_limit_exceeded",
    "billing_limit_reached",
  ];
};
/**
 * Comprehensive error classification interface
 */
export interface ErrorClassification {
  id: string;
  category: ErrorCategory;
  subcategory: string;
  severity: ErrorSeverity;
  impact: ErrorImpact;
  message: string;
  originalError?: Error;
  context: ParlantLogContext;
  timestamp: string;
  component: string;
  operation?: string;
  userAgent?: string;
  recoverable: boolean;
  recoveryStrategy: RecoveryStrategy;
  suggestedActions: string[];
  correlationId?: string;
  traceId?: string;
  parentErrorId?: string;
  childErrorIds: string[];
  affectedUsers: string[];
  affectedWorkspaces: string[];
  affectedTools: string[];
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  tags: string[];
  customMetadata: Record<string, any>;
}
/**
 * Error pattern recognition for automated correlation
 */
export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  category?: ErrorCategory;
  subcategories?: string[];
  messagePatterns?: RegExp[];
  components?: string[];
  frequency: {
    threshold: number;
    timeWindowMs: number;
  };
  correlationRules: {
    timeWindowMs: number;
    maxDistance: number;
    similarityThreshold: number;
  };
  autoActions: {
    notify: boolean;
    createIncident: boolean;
    escalate: boolean;
    applyCircuitBreaker: boolean;
  };
}
/**
 * Default error patterns for common scenarios
 */
export declare const DEFAULT_ERROR_PATTERNS: ErrorPattern[];
/**
 * Error classification service
 */
export declare class ErrorClassifier {
  private patterns;
  private recentErrors;
  private maxHistorySize;
  constructor(patterns?: ErrorPattern[]);
  /**
   * Classify an error with full taxonomic analysis
   */
  classify(
    category: ErrorCategory,
    subcategory: string,
    message: string,
    error?: Error,
    context?: ParlantLogContext,
    component?: string,
  ): ErrorClassification;
  /**
   * Determine severity based on error characteristics
   */
  private determineSeverity;
  /**
   * Assess error impact on system and users
   */
  private assessImpact;
  /**
   * Determine recovery approach for error type
   */
  private determineRecoveryApproach;
  /**
   * Extract affected entities from error context
   */
  private extractAffectedEntities;
  /**
   * Generate tags for analytics and searching
   */
  private generateTags;
  /**
   * Perform correlation analysis to identify patterns
   */
  private performCorrelationAnalysis;
  /**
   * Check if error matches a specific pattern
   */
  private doesErrorMatchPattern;
  /**
   * Check pattern frequency and trigger actions
   */
  private checkPatternFrequency;
  /**
   * Find related errors for correlation
   */
  private findRelatedErrors;
  /**
   * Trigger actions based on pattern detection
   */
  private triggerPatternActions;
  /**
   * Get error statistics by category and time window
   */
  getErrorStatistics(timeWindowMs?: number): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    patterns: Array<{
      pattern: string;
      count: number;
    }>;
  };
  /**
   * Add custom error pattern
   */
  addPattern(pattern: ErrorPattern): void;
  /**
   * Get all error patterns
   */
  getPatterns(): ErrorPattern[];
}
/**
 * Singleton error classifier instance
 */
export declare const errorClassifier: ErrorClassifier;
/**
 * Utility functions for error classification
 */
export declare const classifyError: (
  category: ErrorCategory,
  subcategory: string,
  message: string,
  error?: Error,
  context?: ParlantLogContext,
  component?: string,
) => ErrorClassification;
export declare const getErrorStats: (timeWindowMs?: number) => {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byComponent: Record<string, number>;
  patterns: Array<{
    pattern: string;
    count: number;
  }>;
};
