/**
 * Comprehensive Error Taxonomy and Classification System for Universal Tool Adapter
 *
 * This module provides a hierarchical error classification system that covers all
 * possible failure modes in the Universal Tool Adapter System, with specific
 * categorization, severity levels, and automated correlation capabilities.
 */

import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { type ParlantLogContext } from './logging'

const logger = createLogger('ErrorTaxonomy')

/**
 * Primary error categories in the Universal Tool Adapter System
 */
export enum ErrorCategory {
  // Tool-specific errors
  TOOL_ADAPTER = 'tool_adapter',
  TOOL_EXECUTION = 'tool_execution',
  TOOL_CONFIGURATION = 'tool_configuration',
  TOOL_AUTHENTICATION = 'tool_authentication',
  TOOL_VALIDATION = 'tool_validation',

  // System-level errors
  SYSTEM_RESOURCE = 'system_resource',
  SYSTEM_NETWORK = 'system_network',
  SYSTEM_PERMISSION = 'system_permission',
  SYSTEM_DEPENDENCY = 'system_dependency',

  // Integration errors
  INTEGRATION_API = 'integration_api',
  INTEGRATION_DATABASE = 'integration_database',
  INTEGRATION_AUTH = 'integration_auth',
  INTEGRATION_WEBSOCKET = 'integration_websocket',

  // User interaction errors
  USER_INPUT = 'user_input',
  USER_PERMISSION = 'user_permission',
  USER_CONTEXT = 'user_context',

  // Agent-specific errors
  AGENT_REASONING = 'agent_reasoning',
  AGENT_COMMUNICATION = 'agent_communication',
  AGENT_WORKFLOW = 'agent_workflow',

  // External service errors
  EXTERNAL_SERVICE = 'external_service',
  EXTERNAL_TIMEOUT = 'external_timeout',
  EXTERNAL_QUOTA = 'external_quota'
}

/**
 * Error severity levels with clear escalation paths
 */
export enum ErrorSeverity {
  TRACE = 'trace',       // Detailed debugging information
  DEBUG = 'debug',       // Development debugging
  INFO = 'info',         // Informational messages
  WARNING = 'warning',   // Potential issues that don't block execution
  ERROR = 'error',       // Errors that require attention but system continues
  CRITICAL = 'critical', // Errors that require immediate attention
  FATAL = 'fatal'        // System-breaking errors that require shutdown
}

/**
 * Error impact assessment levels
 */
export enum ErrorImpact {
  NONE = 'none',           // No user impact
  LOW = 'low',             // Single user, single operation
  MEDIUM = 'medium',       // Single user, multiple operations or temporary degradation
  HIGH = 'high',           // Multiple users affected or extended degradation
  CRITICAL = 'critical'    // System-wide impact or data loss potential
}

/**
 * Recovery strategy classifications
 */
export enum RecoveryStrategy {
  NONE = 'none',           // No recovery possible
  MANUAL = 'manual',       // Requires manual intervention
  RETRY = 'retry',         // Automatic retry with backoff
  FALLBACK = 'fallback',   // Switch to alternative approach
  CIRCUIT_BREAKER = 'circuit_breaker', // Temporarily disable failing component
  GRACEFUL_DEGRADATION = 'graceful_degradation' // Continue with reduced functionality
}

/**
 * Detailed error subcategories for precise classification
 */
export const ErrorSubcategories = {
  [ErrorCategory.TOOL_ADAPTER]: [
    'interface_mismatch',
    'parameter_mapping',
    'response_transformation',
    'schema_validation',
    'version_compatibility'
  ],

  [ErrorCategory.TOOL_EXECUTION]: [
    'timeout',
    'permission_denied',
    'resource_exhausted',
    'invalid_state',
    'dependency_failure',
    'data_corruption'
  ],

  [ErrorCategory.TOOL_CONFIGURATION]: [
    'missing_config',
    'invalid_config',
    'config_conflict',
    'environment_mismatch',
    'secret_unavailable'
  ],

  [ErrorCategory.TOOL_AUTHENTICATION]: [
    'invalid_credentials',
    'token_expired',
    'insufficient_permissions',
    'oauth_failure',
    'api_key_invalid',
    'rate_limit_exceeded'
  ],

  [ErrorCategory.TOOL_VALIDATION]: [
    'input_validation',
    'output_validation',
    'schema_mismatch',
    'constraint_violation',
    'business_rule_violation'
  ],

  [ErrorCategory.SYSTEM_RESOURCE]: [
    'memory_exhausted',
    'cpu_overload',
    'disk_full',
    'handle_exhausted',
    'connection_pool_full'
  ],

  [ErrorCategory.SYSTEM_NETWORK]: [
    'connection_refused',
    'timeout',
    'dns_resolution',
    'ssl_handshake',
    'proxy_error',
    'firewall_blocked'
  ],

  [ErrorCategory.SYSTEM_PERMISSION]: [
    'file_access_denied',
    'directory_access_denied',
    'execution_permission',
    'network_permission',
    'security_policy_violation'
  ],

  [ErrorCategory.SYSTEM_DEPENDENCY]: [
    'missing_dependency',
    'version_conflict',
    'circular_dependency',
    'initialization_failure',
    'service_unavailable'
  ],

  [ErrorCategory.INTEGRATION_API]: [
    'endpoint_not_found',
    'method_not_allowed',
    'payload_too_large',
    'unsupported_media_type',
    'api_version_mismatch'
  ],

  [ErrorCategory.INTEGRATION_DATABASE]: [
    'connection_failed',
    'query_timeout',
    'constraint_violation',
    'deadlock',
    'data_integrity_violation'
  ],

  [ErrorCategory.INTEGRATION_AUTH]: [
    'session_expired',
    'invalid_token',
    'permission_denied',
    'workspace_access_denied',
    'user_not_found'
  ],

  [ErrorCategory.INTEGRATION_WEBSOCKET]: [
    'connection_lost',
    'handshake_failed',
    'protocol_error',
    'message_too_large',
    'rate_limit_exceeded'
  ],

  [ErrorCategory.USER_INPUT]: [
    'invalid_format',
    'missing_required_field',
    'value_out_of_range',
    'unsupported_operation',
    'malformed_request'
  ],

  [ErrorCategory.USER_PERMISSION]: [
    'insufficient_role',
    'workspace_access_denied',
    'feature_not_enabled',
    'quota_exceeded',
    'account_suspended'
  ],

  [ErrorCategory.USER_CONTEXT]: [
    'session_invalid',
    'workspace_not_found',
    'context_mismatch',
    'state_conflict',
    'concurrent_modification'
  ],

  [ErrorCategory.AGENT_REASONING]: [
    'tool_selection_failed',
    'parameter_inference_failed',
    'goal_unreachable',
    'logical_contradiction',
    'infinite_loop_detected'
  ],

  [ErrorCategory.AGENT_COMMUNICATION]: [
    'message_parse_error',
    'response_generation_failed',
    'context_understanding_failed',
    'conversation_state_lost',
    'language_model_error'
  ],

  [ErrorCategory.AGENT_WORKFLOW]: [
    'workflow_execution_failed',
    'state_transition_invalid',
    'parallel_execution_conflict',
    'workflow_timeout',
    'checkpoint_corruption'
  ],

  [ErrorCategory.EXTERNAL_SERVICE]: [
    'service_unavailable',
    'api_error',
    'authentication_failed',
    'response_invalid',
    'service_deprecated'
  ],

  [ErrorCategory.EXTERNAL_TIMEOUT]: [
    'request_timeout',
    'response_timeout',
    'connection_timeout',
    'operation_timeout',
    'batch_timeout'
  ],

  [ErrorCategory.EXTERNAL_QUOTA]: [
    'rate_limit_exceeded',
    'daily_quota_exceeded',
    'concurrent_limit_reached',
    'resource_limit_exceeded',
    'billing_limit_reached'
  ]
} as const

/**
 * Comprehensive error classification interface
 */
export interface ErrorClassification {
  // Core classification
  id: string
  category: ErrorCategory
  subcategory: string
  severity: ErrorSeverity
  impact: ErrorImpact

  // Error details
  message: string
  originalError?: Error
  context: ParlantLogContext
  timestamp: string

  // Classification metadata
  component: string
  operation?: string
  userAgent?: string

  // Recovery information
  recoverable: boolean
  recoveryStrategy: RecoveryStrategy
  suggestedActions: string[]

  // Correlation data
  correlationId?: string
  traceId?: string
  parentErrorId?: string
  childErrorIds: string[]

  // Impact assessment
  affectedUsers: string[]
  affectedWorkspaces: string[]
  affectedTools: string[]

  // Resolution tracking
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  resolutionNotes?: string

  // Analytics metadata
  tags: string[]
  customMetadata: Record<string, any>
}

/**
 * Error pattern recognition for automated correlation
 */
export interface ErrorPattern {
  id: string
  name: string
  description: string

  // Pattern matching criteria
  category?: ErrorCategory
  subcategories?: string[]
  messagePatterns?: RegExp[]
  components?: string[]

  // Pattern characteristics
  frequency: {
    threshold: number
    timeWindowMs: number
  }

  // Correlation rules
  correlationRules: {
    timeWindowMs: number
    maxDistance: number
    similarityThreshold: number
  }

  // Automated responses
  autoActions: {
    notify: boolean
    createIncident: boolean
    escalate: boolean
    applyCircuitBreaker: boolean
  }
}

/**
 * Default error patterns for common scenarios
 */
export const DEFAULT_ERROR_PATTERNS: ErrorPattern[] = [
  {
    id: 'tool-cascade-failure',
    name: 'Tool Cascade Failure',
    description: 'Multiple tools failing in sequence due to upstream dependency',
    category: ErrorCategory.TOOL_EXECUTION,
    subcategories: ['dependency_failure', 'timeout'],
    frequency: { threshold: 3, timeWindowMs: 300000 }, // 3 errors in 5 minutes
    correlationRules: { timeWindowMs: 60000, maxDistance: 5, similarityThreshold: 0.7 },
    autoActions: { notify: true, createIncident: true, escalate: false, applyCircuitBreaker: true }
  },

  {
    id: 'authentication-storm',
    name: 'Authentication Storm',
    description: 'Multiple authentication failures across different tools',
    category: ErrorCategory.TOOL_AUTHENTICATION,
    frequency: { threshold: 5, timeWindowMs: 60000 }, // 5 errors in 1 minute
    correlationRules: { timeWindowMs: 180000, maxDistance: 10, similarityThreshold: 0.5 },
    autoActions: { notify: true, createIncident: true, escalate: true, applyCircuitBreaker: false }
  },

  {
    id: 'resource-exhaustion',
    name: 'Resource Exhaustion Pattern',
    description: 'System running out of resources affecting multiple components',
    category: ErrorCategory.SYSTEM_RESOURCE,
    frequency: { threshold: 10, timeWindowMs: 600000 }, // 10 errors in 10 minutes
    correlationRules: { timeWindowMs: 300000, maxDistance: 20, similarityThreshold: 0.6 },
    autoActions: { notify: true, createIncident: true, escalate: true, applyCircuitBreaker: true }
  },

  {
    id: 'external-service-degradation',
    name: 'External Service Degradation',
    description: 'External service experiencing issues affecting multiple operations',
    category: ErrorCategory.EXTERNAL_SERVICE,
    frequency: { threshold: 7, timeWindowMs: 300000 }, // 7 errors in 5 minutes
    correlationRules: { timeWindowMs: 900000, maxDistance: 15, similarityThreshold: 0.8 },
    autoActions: { notify: true, createIncident: true, escalate: false, applyCircuitBreaker: true }
  }
]

/**
 * Error classification service
 */
export class ErrorClassifier {
  private patterns: ErrorPattern[] = []
  private recentErrors: ErrorClassification[] = []
  private maxHistorySize = 10000

  constructor(patterns: ErrorPattern[] = DEFAULT_ERROR_PATTERNS) {
    this.patterns = patterns
    logger.info('Error Classifier initialized', {
      patterns: patterns.length,
      categories: Object.keys(ErrorCategory).length
    })
  }

  /**
   * Classify an error with full taxonomic analysis
   */
  classify(
    category: ErrorCategory,
    subcategory: string,
    message: string,
    error?: Error,
    context: ParlantLogContext = {},
    component: string = 'unknown'
  ): ErrorClassification {
    const id = `err-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
    const timestamp = new Date().toISOString()

    // Determine severity based on category and subcategory
    const severity = this.determineSeverity(category, subcategory, error)

    // Assess impact based on context and error type
    const impact = this.assessImpact(category, subcategory, context, severity)

    // Determine recovery strategy
    const { recoverable, recoveryStrategy, suggestedActions } = this.determineRecoveryApproach(
      category, subcategory, error
    )

    // Extract affected entities from context
    const { affectedUsers, affectedWorkspaces, affectedTools } = this.extractAffectedEntities(context)

    // Generate tags for analytics
    const tags = this.generateTags(category, subcategory, component, context)

    const classification: ErrorClassification = {
      id,
      category,
      subcategory,
      severity,
      impact,
      message,
      originalError: error,
      context,
      timestamp,
      component,
      operation: context.operation,
      userAgent: context.metadata?.userAgent,
      recoverable,
      recoveryStrategy,
      suggestedActions,
      correlationId: context.correlationId,
      traceId: context.traceId,
      childErrorIds: [],
      affectedUsers,
      affectedWorkspaces,
      affectedTools,
      resolved: false,
      tags,
      customMetadata: {}
    }

    // Store for pattern analysis
    this.recentErrors.push(classification)
    if (this.recentErrors.length > this.maxHistorySize) {
      this.recentErrors.shift()
    }

    // Perform correlation analysis
    this.performCorrelationAnalysis(classification)

    logger.debug('Error classified', {
      errorId: id,
      category,
      subcategory,
      severity,
      impact,
      recoverable,
      component
    })

    return classification
  }

  /**
   * Determine severity based on error characteristics
   */
  private determineSeverity(
    category: ErrorCategory,
    subcategory: string,
    error?: Error
  ): ErrorSeverity {
    // Critical severity patterns
    if (subcategory.includes('fatal') || subcategory.includes('corruption')) {
      return ErrorSeverity.FATAL
    }

    // High severity categories
    const criticalCategories = [
      ErrorCategory.SYSTEM_RESOURCE,
      ErrorCategory.INTEGRATION_DATABASE
    ]

    const criticalSubcategories = [
      'memory_exhausted', 'disk_full', 'deadlock',
      'data_integrity_violation', 'security_policy_violation'
    ]

    if (criticalCategories.includes(category) || criticalSubcategories.includes(subcategory)) {
      return ErrorSeverity.CRITICAL
    }

    // Error level patterns
    const errorCategories = [
      ErrorCategory.TOOL_EXECUTION,
      ErrorCategory.INTEGRATION_API,
      ErrorCategory.EXTERNAL_SERVICE
    ]

    if (errorCategories.includes(category) || error instanceof Error) {
      return ErrorSeverity.ERROR
    }

    // Warning level patterns
    const warningCategories = [
      ErrorCategory.TOOL_VALIDATION,
      ErrorCategory.USER_INPUT,
      ErrorCategory.EXTERNAL_TIMEOUT
    ]

    if (warningCategories.includes(category)) {
      return ErrorSeverity.WARNING
    }

    return ErrorSeverity.INFO
  }

  /**
   * Assess error impact on system and users
   */
  private assessImpact(
    category: ErrorCategory,
    subcategory: string,
    context: ParlantLogContext,
    severity: ErrorSeverity
  ): ErrorImpact {
    // Fatal and critical errors have high impact by default
    if (severity === ErrorSeverity.FATAL || severity === ErrorSeverity.CRITICAL) {
      return ErrorImpact.CRITICAL
    }

    // System-wide impact categories
    const systemWideCategories = [
      ErrorCategory.SYSTEM_RESOURCE,
      ErrorCategory.SYSTEM_NETWORK,
      ErrorCategory.INTEGRATION_DATABASE
    ]

    if (systemWideCategories.includes(category)) {
      return ErrorImpact.HIGH
    }

    // Multi-user impact indicators
    if (subcategory.includes('service') || subcategory.includes('connection') ||
        subcategory.includes('auth')) {
      return ErrorImpact.MEDIUM
    }

    // Single user impact
    if (context.userId || category === ErrorCategory.USER_INPUT) {
      return ErrorImpact.LOW
    }

    return ErrorImpact.NONE
  }

  /**
   * Determine recovery approach for error type
   */
  private determineRecoveryApproach(
    category: ErrorCategory,
    subcategory: string,
    error?: Error
  ): { recoverable: boolean; recoveryStrategy: RecoveryStrategy; suggestedActions: string[] } {
    const actions: string[] = []

    // Non-recoverable errors
    if (subcategory.includes('corruption') || subcategory.includes('fatal')) {
      return {
        recoverable: false,
        recoveryStrategy: RecoveryStrategy.NONE,
        suggestedActions: ['Contact system administrator', 'Check system logs', 'Restart service']
      }
    }

    // Retry-eligible errors
    const retryableSubcategories = [
      'timeout', 'connection_failed', 'rate_limit_exceeded', 'service_unavailable'
    ]

    if (retryableSubcategories.some(sub => subcategory.includes(sub))) {
      return {
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        suggestedActions: [
          'Retry operation with exponential backoff',
          'Check network connectivity',
          'Verify service availability'
        ]
      }
    }

    // Fallback-eligible errors
    if (category === ErrorCategory.TOOL_EXECUTION || category === ErrorCategory.EXTERNAL_SERVICE) {
      return {
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        suggestedActions: [
          'Try alternative tool or service',
          'Use cached data if available',
          'Simplify operation parameters'
        ]
      }
    }

    // Configuration and validation errors
    if (category === ErrorCategory.TOOL_CONFIGURATION || category === ErrorCategory.USER_INPUT) {
      return {
        recoverable: true,
        recoveryStrategy: RecoveryStrategy.MANUAL,
        suggestedActions: [
          'Check configuration settings',
          'Validate input parameters',
          'Review documentation'
        ]
      }
    }

    // Default recovery approach
    return {
      recoverable: true,
      recoveryStrategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
      suggestedActions: [
        'Continue with reduced functionality',
        'Log error for investigation',
        'Monitor for resolution'
      ]
    }
  }

  /**
   * Extract affected entities from error context
   */
  private extractAffectedEntities(context: ParlantLogContext): {
    affectedUsers: string[]
    affectedWorkspaces: string[]
    affectedTools: string[]
  } {
    const affectedUsers = context.userId ? [context.userId] : []
    const affectedWorkspaces = context.workspaceId ? [context.workspaceId] : []
    const affectedTools = context.toolName ? [context.toolName] : []

    return { affectedUsers, affectedWorkspaces, affectedTools }
  }

  /**
   * Generate tags for analytics and searching
   */
  private generateTags(
    category: ErrorCategory,
    subcategory: string,
    component: string,
    context: ParlantLogContext
  ): string[] {
    const tags = [category, subcategory, component]

    // Add context-based tags
    if (context.operation) tags.push(`op:${context.operation}`)
    if (context.toolName) tags.push(`tool:${context.toolName}`)
    if (context.agentId) tags.push(`agent:${context.agentId}`)
    if (context.workspaceId) tags.push(`workspace:${context.workspaceId}`)

    // Add environment tags
    tags.push(`env:${process.env.NODE_ENV || 'unknown'}`)

    return tags
  }

  /**
   * Perform correlation analysis to identify patterns
   */
  private performCorrelationAnalysis(newError: ErrorClassification): void {
    // Look for matching patterns
    for (const pattern of this.patterns) {
      if (this.doesErrorMatchPattern(newError, pattern)) {
        this.checkPatternFrequency(pattern, newError)
      }
    }

    // Look for related errors
    this.findRelatedErrors(newError)
  }

  /**
   * Check if error matches a specific pattern
   */
  private doesErrorMatchPattern(error: ErrorClassification, pattern: ErrorPattern): boolean {
    // Check category match
    if (pattern.category && error.category !== pattern.category) {
      return false
    }

    // Check subcategory match
    if (pattern.subcategories && !pattern.subcategories.includes(error.subcategory)) {
      return false
    }

    // Check component match
    if (pattern.components && !pattern.components.includes(error.component)) {
      return false
    }

    // Check message patterns
    if (pattern.messagePatterns) {
      const messageMatches = pattern.messagePatterns.some(regex => regex.test(error.message))
      if (!messageMatches) {
        return false
      }
    }

    return true
  }

  /**
   * Check pattern frequency and trigger actions
   */
  private checkPatternFrequency(pattern: ErrorPattern, newError: ErrorClassification): void {
    const timeWindow = pattern.frequency.timeWindowMs
    const threshold = pattern.frequency.threshold
    const cutoff = Date.now() - timeWindow

    // Count matching errors in time window
    const matchingErrors = this.recentErrors.filter(error =>
      new Date(error.timestamp).getTime() >= cutoff &&
      this.doesErrorMatchPattern(error, pattern)
    )

    if (matchingErrors.length >= threshold) {
      logger.warn('Error pattern detected', {
        patternId: pattern.id,
        patternName: pattern.name,
        errorCount: matchingErrors.length,
        threshold,
        timeWindowMs: timeWindow
      })

      // Trigger pattern-based actions
      this.triggerPatternActions(pattern, matchingErrors)
    }
  }

  /**
   * Find related errors for correlation
   */
  private findRelatedErrors(newError: ErrorClassification): void {
    const timeWindow = 300000 // 5 minutes
    const cutoff = Date.now() - timeWindow

    const recentErrors = this.recentErrors.filter(error =>
      error.id !== newError.id &&
      new Date(error.timestamp).getTime() >= cutoff
    )

    // Find errors with same correlation ID
    const correlatedErrors = recentErrors.filter(error =>
      error.correlationId && error.correlationId === newError.correlationId
    )

    // Find errors affecting same entities
    const relatedErrors = recentErrors.filter(error =>
      (error.affectedUsers.some(user => newError.affectedUsers.includes(user))) ||
      (error.affectedWorkspaces.some(ws => newError.affectedWorkspaces.includes(ws))) ||
      (error.affectedTools.some(tool => newError.affectedTools.includes(tool)))
    )

    if (correlatedErrors.length > 0 || relatedErrors.length > 0) {
      logger.debug('Related errors found', {
        errorId: newError.id,
        correlatedCount: correlatedErrors.length,
        relatedCount: relatedErrors.length
      })
    }
  }

  /**
   * Trigger actions based on pattern detection
   */
  private triggerPatternActions(pattern: ErrorPattern, errors: ErrorClassification[]): void {
    if (pattern.autoActions.notify) {
      logger.warn(`Pattern alert: ${pattern.name}`, {
        pattern: pattern.id,
        description: pattern.description,
        errorCount: errors.length
      })
    }

    if (pattern.autoActions.createIncident) {
      logger.error(`Incident created for pattern: ${pattern.name}`, {
        pattern: pattern.id,
        errors: errors.map(e => e.id)
      })
    }

    if (pattern.autoActions.escalate) {
      logger.error(`Escalating pattern: ${pattern.name}`, {
        pattern: pattern.id,
        severity: 'high',
        requiresAttention: true
      })
    }
  }

  /**
   * Get error statistics by category and time window
   */
  getErrorStatistics(timeWindowMs: number = 3600000): {
    total: number
    byCategory: Record<string, number>
    bySeverity: Record<string, number>
    byComponent: Record<string, number>
    patterns: Array<{ pattern: string; count: number }>
  } {
    const cutoff = Date.now() - timeWindowMs
    const relevantErrors = this.recentErrors.filter(error =>
      new Date(error.timestamp).getTime() >= cutoff
    )

    const byCategory: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const byComponent: Record<string, number> = {}

    relevantErrors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1
      byComponent[error.component] = (byComponent[error.component] || 0) + 1
    })

    // Count pattern occurrences
    const patternCounts: Record<string, number> = {}
    this.patterns.forEach(pattern => {
      const matching = relevantErrors.filter(error => this.doesErrorMatchPattern(error, pattern))
      if (matching.length > 0) {
        patternCounts[pattern.name] = matching.length
      }
    })

    const patterns = Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([pattern, count]) => ({ pattern, count }))

    return {
      total: relevantErrors.length,
      byCategory,
      bySeverity,
      byComponent,
      patterns
    }
  }

  /**
   * Add custom error pattern
   */
  addPattern(pattern: ErrorPattern): void {
    this.patterns.push(pattern)
    logger.info('Error pattern added', { patternId: pattern.id, patternName: pattern.name })
  }

  /**
   * Get all error patterns
   */
  getPatterns(): ErrorPattern[] {
    return [...this.patterns]
  }
}

/**
 * Singleton error classifier instance
 */
export const errorClassifier = new ErrorClassifier()

/**
 * Utility functions for error classification
 */
export const classifyError = (
  category: ErrorCategory,
  subcategory: string,
  message: string,
  error?: Error,
  context?: ParlantLogContext,
  component?: string
) => errorClassifier.classify(category, subcategory, message, error, context, component)

export const getErrorStats = (timeWindowMs?: number) =>
  errorClassifier.getErrorStatistics(timeWindowMs)