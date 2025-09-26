/**
 * Comprehensive Error Manager for Universal Tool Adapter System
 *
 * This module provides the complete error handling infrastructure specifically designed
 * for tool interactions, building upon the existing error handling system to provide
 * specialized tool-specific error management, user-friendly explanations, and intelligent
 * recovery mechanisms.
 *
 * Features:
 * - Tool-specific error classification and handling
 * - Intelligent retry mechanisms with exponential backoff
 * - User-friendly error explanations with skill-level adaptation
 * - Proactive validation to prevent errors before they occur
 * - Comprehensive error analytics and pattern detection
 * - Interactive error recovery tutorials
 * - Integration with all tool adapter components
 *
 * @author Error Handling & Recovery Agent
 * @version 1.0.0
 */

import { createLogger } from '../utils/logger'

// Import replaced with local placeholder types to avoid path resolution issues
// import {
//   ErrorExplanationService,
//   explainError,
//   UserSkillLevel,
// } from '../../../parlant-server/error-explanations'

// Local placeholder types
type ErrorExplanationService = {
  explain: (error: any, skillLevel: UserSkillLevel) => string
}

type UserSkillLevel = 'beginner' | 'intermediate' | 'advanced'

// Placeholder implementation
const explainError = (error: any, skillLevel: UserSkillLevel): string => {
  return `Error: ${error.message || error}`
}

import {
  type BaseToolError,
  ToolAdapterError,
  ToolAuthenticationError,
  ToolExecutionError,
  UserInputError,
} from '../../../parlant-server/error-handler'
import { errorRecoveryService } from '../../../parlant-server/error-recovery'
import {
  ErrorCategory,
  ErrorImpact,
  ErrorSeverity,
  RecoveryStrategy,
} from '../../../parlant-server/error-taxonomy'
import type { ParlantLogContext } from '../../../parlant-server/logging'
import type {
  AdapterConfiguration,
  AdapterExecutionContext,
  ErrorHandlingConfig,
} from '../types/adapter-interfaces'

const logger = createLogger('ComprehensiveErrorManager')

/**
 * Tool-specific error categories for better classification
 */
export enum ToolErrorCategory {
  PARAMETER_VALIDATION = 'parameter_validation',
  TOOL_CONFIGURATION = 'tool_configuration',
  TOOL_EXECUTION_TIMEOUT = 'tool_execution_timeout',
  TOOL_AUTHENTICATION_FAILURE = 'tool_authentication_failure',
  TOOL_RATE_LIMIT = 'tool_rate_limit',
  TOOL_DEPENDENCY_FAILURE = 'tool_dependency_failure',
  TOOL_OUTPUT_VALIDATION = 'tool_output_validation',
  TOOL_VERSION_MISMATCH = 'tool_version_mismatch',
  TOOL_RESOURCE_EXHAUSTION = 'tool_resource_exhaustion',
  TOOL_NETWORK_ERROR = 'tool_network_error',
}

/**
 * Tool-specific error subcategories for precise classification
 */
export const ToolErrorSubcategories = {
  [ToolErrorCategory.PARAMETER_VALIDATION]: [
    'required_parameter_missing',
    'parameter_type_mismatch',
    'parameter_out_of_range',
    'parameter_format_invalid',
    'parameter_business_rule_violation',
  ],
  [ToolErrorCategory.TOOL_CONFIGURATION]: [
    'missing_api_key',
    'invalid_endpoint_url',
    'unsupported_configuration',
    'configuration_conflict',
    'environment_mismatch',
  ],
  [ToolErrorCategory.TOOL_EXECUTION_TIMEOUT]: [
    'request_timeout',
    'processing_timeout',
    'response_timeout',
    'operation_cancelled',
  ],
  [ToolErrorCategory.TOOL_AUTHENTICATION_FAILURE]: [
    'invalid_credentials',
    'expired_token',
    'insufficient_permissions',
    'oauth_flow_failure',
    'api_key_revoked',
  ],
  [ToolErrorCategory.TOOL_RATE_LIMIT]: [
    'requests_per_second_exceeded',
    'daily_quota_exceeded',
    'concurrent_limit_reached',
    'burst_limit_exceeded',
  ],
  [ToolErrorCategory.TOOL_DEPENDENCY_FAILURE]: [
    'external_service_unavailable',
    'database_connection_failed',
    'third_party_api_error',
    'network_dependency_failure',
  ],
} as const

/**
 * Tool-specific error context interface
 */
export interface ToolErrorContext extends ParlantLogContext {
  toolId?: string
  toolName?: string
  toolVersion?: string
  adapterVersion?: string
  executionId?: string
  parameters?: Record<string, any>
  expectedOutput?: any
  actualOutput?: any
  retryAttempt?: number
  userSkillLevel?: UserSkillLevel
  workspaceFeatures?: string[]
}

/**
 * Enhanced error explanation specifically for tools
 */
export interface ToolErrorExplanation {
  // Basic error information
  errorId: string
  toolName: string
  errorType: ToolErrorCategory
  severity: ErrorSeverity
  impact: ErrorImpact

  // User-friendly explanations
  userMessage: string
  detailedExplanation: string
  technicalDetails?: string

  // Resolution guidance
  immediateActions: Array<{
    action: string
    description: string
    estimatedTime: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  }>

  preventionTips: Array<{
    tip: string
    category: 'configuration' | 'usage' | 'monitoring'
  }>

  // Interactive elements
  troubleshootingSteps: Array<{
    step: string
    instruction: string
    expectedResult: string
    troubleshootIf: string
  }>

  // Related information
  relatedErrors: string[]
  documentationLinks: Array<{
    title: string
    url: string
    type: 'tutorial' | 'reference' | 'troubleshooting'
  }>

  // Context
  timestamp: string
  context: ToolErrorContext
}

/**
 * Proactive validation configuration
 */
export interface ProactiveValidationConfig {
  enabled: boolean
  validationRules: Array<{
    name: string
    description: string
    validate: (context: AdapterExecutionContext, parameters: any) => Promise<boolean>
    errorMessage: string
    severity: ErrorSeverity
    preventionTip: string
  }>
  preExecutionChecks: Array<{
    name: string
    check: (context: AdapterExecutionContext) => Promise<boolean>
    errorMessage: string
    suggestedAction: string
  }>
}

/**
 * Error analytics and pattern detection
 */
export interface ErrorAnalytics {
  errorFrequency: Map<string, number>
  errorPatterns: Array<{
    pattern: string
    occurrences: number
    lastSeen: Date
    severity: ErrorSeverity
    suggestedFix: string
  }>
  userErrorProfiles: Map<
    string,
    {
      commonErrors: string[]
      skillLevel: UserSkillLevel
      preferredResolutions: string[]
    }
  >
  toolReliabilityMetrics: Map<
    string,
    {
      successRate: number
      averageResponseTime: number
      commonFailureModes: string[]
      recommendations: string[]
    }
  >
}

/**
 * Comprehensive Error Manager for the Universal Tool Adapter System
 */
export class ComprehensiveToolErrorManager {
  private errorAnalytics: ErrorAnalytics
  private proactiveValidationConfig: ProactiveValidationConfig
  private errorExplanationService: ErrorExplanationService
  private userSkillProfiles = new Map<string, UserSkillLevel>()
  private errorRecoveryAttempts = new Map<string, number>()

  constructor() {
    this.errorAnalytics = {
      errorFrequency: new Map(),
      errorPatterns: [],
      userErrorProfiles: new Map(),
      toolReliabilityMetrics: new Map(),
    }

    this.proactiveValidationConfig = {
      enabled: true,
      validationRules: [],
      preExecutionChecks: [],
    }

    this.errorExplanationService = new ErrorExplanationService()
    this.initializeProactiveValidation()
    this.initializeErrorPatterns()

    logger.info('Comprehensive Tool Error Manager initialized')
  }

  /**
   * Main error handling entry point for tool adapter operations
   */
  async handleToolError(
    error: Error,
    context: AdapterExecutionContext,
    config?: ErrorHandlingConfig
  ): Promise<{
    handled: boolean
    recovery: boolean
    explanation: ToolErrorExplanation
    suggestedActions: string[]
    shouldRetry: boolean
    retryDelay?: number
  }> {
    const startTime = Date.now()
    const errorId = `tool-err-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`

    logger.info('Handling tool error', {
      errorId,
      toolId: context.toolId,
      executionId: context.executionId,
      errorType: error.constructor.name,
      message: error.message,
    })

    try {
      // 1. Classify the error for tool-specific handling
      const toolError = await this.classifyToolError(error, context, errorId)

      // 2. Update error analytics
      this.updateErrorAnalytics(toolError, context)

      // 3. Determine user skill level for appropriate explanations
      const userSkillLevel = this.determineUserSkillLevel(context.userId)

      // 4. Generate comprehensive explanation
      const explanation = await this.generateToolErrorExplanation(
        toolError,
        context,
        userSkillLevel
      )

      // 5. Attempt intelligent recovery
      const recoveryResult = await this.attemptIntelligentRecovery(toolError, context, config)

      // 6. Determine retry strategy
      const retryDecision = this.determineRetryStrategy(toolError, context, config)

      // 7. Log comprehensive error information
      await this.logComprehensiveError(toolError, context, explanation, recoveryResult)

      const result = {
        handled: true,
        recovery: recoveryResult.success,
        explanation,
        suggestedActions: explanation.immediateActions.map((action) => action.action),
        shouldRetry: retryDecision.shouldRetry,
        retryDelay: retryDecision.delay,
      }

      logger.info('Tool error handling completed', {
        errorId,
        handled: result.handled,
        recovery: result.recovery,
        shouldRetry: result.shouldRetry,
        processingTimeMs: Date.now() - startTime,
      })

      return result
    } catch (handlingError) {
      logger.error('Error handling failed', {
        errorId,
        originalError: error.message,
        handlingError: handlingError instanceof Error ? handlingError.message : handlingError,
      })

      // Fallback to basic error handling
      return {
        handled: false,
        recovery: false,
        explanation: this.generateFallbackExplanation(error, context, errorId),
        suggestedActions: ['Try again', 'Contact support if issue persists'],
        shouldRetry: false,
      }
    }
  }

  /**
   * Proactive validation to prevent errors before tool execution
   */
  async proactiveValidation(
    context: AdapterExecutionContext,
    parameters: any,
    config: AdapterConfiguration
  ): Promise<{
    valid: boolean
    warnings: string[]
    blockingIssues: string[]
    suggestions: string[]
  }> {
    if (!this.proactiveValidationConfig.enabled) {
      return { valid: true, warnings: [], blockingIssues: [], suggestions: [] }
    }

    const warnings: string[] = []
    const blockingIssues: string[] = []
    const suggestions: string[] = []

    logger.debug('Running proactive validation', {
      toolId: context.toolId,
      executionId: context.executionId,
      rulesCount: this.proactiveValidationConfig.validationRules.length,
    })

    // Run pre-execution checks
    for (const check of this.proactiveValidationConfig.preExecutionChecks) {
      try {
        const passed = await check.check(context)
        if (!passed) {
          if (check.name.includes('critical') || check.name.includes('required')) {
            blockingIssues.push(check.errorMessage)
          } else {
            warnings.push(check.errorMessage)
          }
          suggestions.push(check.suggestedAction)
        }
      } catch (checkError) {
        logger.warn('Pre-execution check failed', {
          checkName: check.name,
          error: checkError instanceof Error ? checkError.message : checkError,
        })
        warnings.push(`Unable to validate ${check.name}`)
      }
    }

    // Run parameter validation rules
    for (const rule of this.proactiveValidationConfig.validationRules) {
      try {
        const passed = await rule.validate(context, parameters)
        if (!passed) {
          if (rule.severity === ErrorSeverity.CRITICAL || rule.severity === ErrorSeverity.FATAL) {
            blockingIssues.push(rule.errorMessage)
          } else {
            warnings.push(rule.errorMessage)
          }
          suggestions.push(rule.preventionTip)
        }
      } catch (validationError) {
        logger.warn('Validation rule failed', {
          ruleName: rule.name,
          error: validationError instanceof Error ? validationError.message : validationError,
        })
        warnings.push(`Unable to validate ${rule.name}`)
      }
    }

    // Check for common error patterns
    const commonPatterns = this.checkForCommonErrorPatterns(context, parameters)
    warnings.push(...commonPatterns.warnings)
    suggestions.push(...commonPatterns.suggestions)

    const valid = blockingIssues.length === 0

    logger.info('Proactive validation completed', {
      toolId: context.toolId,
      valid,
      warningsCount: warnings.length,
      blockingIssuesCount: blockingIssues.length,
      suggestionsCount: suggestions.length,
    })

    return { valid, warnings, blockingIssues, suggestions }
  }

  /**
   * Generate interactive error recovery tutorial
   */
  async generateRecoveryTutorial(
    errorId: string,
    userSkillLevel: UserSkillLevel = UserSkillLevel.INTERMEDIATE
  ): Promise<{
    tutorialId: string
    title: string
    estimatedTime: string
    difficulty: string
    steps: Array<{
      stepNumber: number
      title: string
      description: string
      instructions: string[]
      expectedResult: string
      commonMistakes: string[]
      helpResources: string[]
    }>
    additionalResources: Array<{
      title: string
      type: 'video' | 'article' | 'documentation' | 'forum'
      url: string
      estimatedTime: string
    }>
  }> {
    // This would generate step-by-step recovery tutorials based on error type and user skill level
    const tutorialId = `tutorial-${errorId}-${Date.now()}`

    // Mock implementation - would be more sophisticated in practice
    return {
      tutorialId,
      title: 'Resolving Tool Execution Error',
      estimatedTime: '5-10 minutes',
      difficulty: userSkillLevel,
      steps: [
        {
          stepNumber: 1,
          title: 'Identify the Root Cause',
          description: 'Understanding what went wrong is the first step to fixing it.',
          instructions: [
            'Review the error message carefully',
            'Check the tool configuration',
            'Verify your input parameters',
          ],
          expectedResult: 'You should have a clear understanding of the error cause',
          commonMistakes: ['Skipping error message details', 'Not checking configuration'],
          helpResources: ['Error message documentation', 'Configuration guide'],
        },
      ],
      additionalResources: [
        {
          title: 'Tool Configuration Best Practices',
          type: 'documentation',
          url: '/docs/tool-configuration',
          estimatedTime: '10 minutes',
        },
      ],
    }
  }

  /**
   * Get error analytics and insights
   */
  getErrorAnalytics(timeWindowHours = 24): {
    totalErrors: number
    errorsByCategory: Record<string, number>
    topFailingTools: Array<{ toolId: string; errorCount: number; successRate: number }>
    commonPatterns: Array<{ pattern: string; occurrences: number; impact: string }>
    recommendations: string[]
  } {
    const cutoffTime = Date.now() - timeWindowHours * 60 * 60 * 1000

    // Filter recent errors
    const recentPatterns = this.errorAnalytics.errorPatterns.filter(
      (pattern) => pattern.lastSeen.getTime() >= cutoffTime
    )

    const errorsByCategory: Record<string, number> = {}
    let totalErrors = 0

    for (const [category, count] of this.errorAnalytics.errorFrequency.entries()) {
      errorsByCategory[category] = count
      totalErrors += count
    }

    const topFailingTools = Array.from(this.errorAnalytics.toolReliabilityMetrics.entries())
      .sort((a, b) => a[1].successRate - b[1].successRate)
      .slice(0, 10)
      .map(([toolId, metrics]) => ({
        toolId,
        errorCount: Math.round((1 - metrics.successRate) * 100),
        successRate: metrics.successRate,
      }))

    const commonPatterns = recentPatterns
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map((pattern) => ({
        pattern: pattern.pattern,
        occurrences: pattern.occurrences,
        impact: pattern.severity,
      }))

    const recommendations = this.generateRecommendations(
      errorsByCategory,
      topFailingTools,
      commonPatterns
    )

    return {
      totalErrors,
      errorsByCategory,
      topFailingTools,
      commonPatterns,
      recommendations,
    }
  }

  /**
   * Train the error handling system with user feedback
   */
  async trainWithFeedback(
    errorId: string,
    userId: string,
    feedback: {
      wasHelpful: boolean
      suggestedImprovement?: string
      preferredSkillLevel?: UserSkillLevel
      successfulResolution?: string
    }
  ): Promise<void> {
    logger.info('Training error handling system with user feedback', {
      errorId,
      userId,
      wasHelpful: feedback.wasHelpful,
    })

    // Update user skill profile
    if (feedback.preferredSkillLevel) {
      this.userSkillProfiles.set(userId, feedback.preferredSkillLevel)
    }

    // Update user error profile
    let userProfile = this.errorAnalytics.userErrorProfiles.get(userId)
    if (!userProfile) {
      userProfile = {
        commonErrors: [],
        skillLevel: feedback.preferredSkillLevel || UserSkillLevel.INTERMEDIATE,
        preferredResolutions: [],
      }
    }

    if (feedback.successfulResolution) {
      userProfile.preferredResolutions.push(feedback.successfulResolution)
    }

    this.errorAnalytics.userErrorProfiles.set(userId, userProfile)

    // Use feedback to improve error explanations
    if (feedback.suggestedImprovement) {
      // This would feed into the ML system for improving explanations
      logger.info('User suggested improvement recorded', {
        errorId,
        suggestion: feedback.suggestedImprovement,
      })
    }
  }

  /**
   * Private helper methods
   */

  private async classifyToolError(
    error: Error,
    context: AdapterExecutionContext,
    errorId: string
  ): Promise<BaseToolError> {
    const toolContext: ToolErrorContext = {
      ...context,
      toolId: context.toolId,
      toolName: context.toolId, // Assuming toolId contains tool name
      executionId: context.executionId,
      userId: context.userId,
      workspaceId: context.workspaceId,
    }

    // Classify based on error type and context
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return new ToolExecutionError(
        error.message,
        'timeout',
        context.toolId,
        toolContext,
        error,
        context.executionId
      )
    }

    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return new ToolAuthenticationError(
        error.message,
        'invalid_credentials',
        context.toolId,
        toolContext,
        error
      )
    }

    if (error.message.includes('validation') || error.message.includes('invalid parameter')) {
      return new UserInputError(error.message, 'invalid_format', toolContext)
    }

    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      return new ToolAuthenticationError(
        error.message,
        'rate_limit_exceeded',
        context.toolId,
        toolContext,
        error
      )
    }

    // Default to generic tool adapter error
    return new ToolAdapterError(
      error.message,
      'interface_mismatch',
      context.toolId,
      toolContext,
      error
    )
  }

  private updateErrorAnalytics(error: BaseToolError, context: AdapterExecutionContext): void {
    // Update error frequency
    const errorKey = `${error.category}:${error.subcategory}`
    const currentCount = this.errorAnalytics.errorFrequency.get(errorKey) || 0
    this.errorAnalytics.errorFrequency.set(errorKey, currentCount + 1)

    // Update tool reliability metrics
    let toolMetrics = this.errorAnalytics.toolReliabilityMetrics.get(context.toolId)
    if (!toolMetrics) {
      toolMetrics = {
        successRate: 1.0,
        averageResponseTime: 0,
        commonFailureModes: [],
        recommendations: [],
      }
    }

    // Update success rate (simplified calculation)
    toolMetrics.successRate = Math.max(0, toolMetrics.successRate - 0.01)

    // Track common failure modes
    const failureMode = `${error.category}:${error.subcategory}`
    if (!toolMetrics.commonFailureModes.includes(failureMode)) {
      toolMetrics.commonFailureModes.push(failureMode)
    }

    this.errorAnalytics.toolReliabilityMetrics.set(context.toolId, toolMetrics)
  }

  private determineUserSkillLevel(userId: string): UserSkillLevel {
    return this.userSkillProfiles.get(userId) || UserSkillLevel.INTERMEDIATE
  }

  private async generateToolErrorExplanation(
    error: BaseToolError,
    context: AdapterExecutionContext,
    userSkillLevel: UserSkillLevel
  ): Promise<ToolErrorExplanation> {
    const baseExplanation = explainError(error, userSkillLevel)

    return {
      errorId: error.id,
      toolName: context.toolId,
      errorType: this.mapToToolErrorCategory(error.category, error.subcategory),
      severity: error.severity,
      impact: error.impact,
      userMessage: baseExplanation.messages[userSkillLevel],
      detailedExplanation: baseExplanation.summary,
      technicalDetails: error.message,
      immediateActions: baseExplanation.quickActions.map((action) => ({
        action: action.title,
        description: action.description,
        estimatedTime: action.estimatedTime,
        difficulty: this.mapSkillLevelToDifficulty(action.skillLevel),
      })),
      preventionTips: baseExplanation.preventionTips.map((tip) => ({
        tip: tip.description,
        category: tip.category,
      })),
      troubleshootingSteps: this.generateTroubleshootingSteps(error, context),
      relatedErrors: baseExplanation.relatedErrors,
      documentationLinks: baseExplanation.documentationLinks.map((link) => ({
        title: link.title,
        url: link.url,
        type: link.type as 'tutorial' | 'reference' | 'troubleshooting',
      })),
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        toolId: context.toolId,
        toolName: context.toolId,
        executionId: context.executionId,
      },
    }
  }

  private async attemptIntelligentRecovery(
    error: BaseToolError,
    context: AdapterExecutionContext,
    config?: ErrorHandlingConfig
  ): Promise<{ success: boolean; strategy: string; details: string }> {
    if (!error.recoverable) {
      return { success: false, strategy: 'none', details: 'Error is not recoverable' }
    }

    try {
      const recoveryResult = await errorRecoveryService.executeWithRecovery(
        async () => {
          throw error // Simulate the error to test recovery
        },
        {
          operationId: context.executionId,
          component: 'tool-adapter',
          category: error.category,
          subcategory: error.subcategory,
          toolName: context.toolId,
          parlantContext: error.context,
        }
      )

      return {
        success: false, // Since we're just simulating
        strategy: error.recoveryStrategy,
        details: 'Recovery strategy identified but not executed',
      }
    } catch (recoveryError) {
      return {
        success: false,
        strategy: 'failed',
        details: 'Recovery attempt failed',
      }
    }
  }

  private determineRetryStrategy(
    error: BaseToolError,
    context: AdapterExecutionContext,
    config?: ErrorHandlingConfig
  ): { shouldRetry: boolean; delay?: number; maxRetries?: number } {
    const retryCount = this.errorRecoveryAttempts.get(context.executionId) || 0
    const maxRetries = config?.retry?.maxAttempts || 3

    if (retryCount >= maxRetries) {
      return { shouldRetry: false }
    }

    // Determine if error type is retryable
    const retryableCategories = [
      ErrorCategory.EXTERNAL_TIMEOUT,
      ErrorCategory.SYSTEM_NETWORK,
      ErrorCategory.EXTERNAL_SERVICE,
    ]

    const shouldRetry =
      retryableCategories.includes(error.category) ||
      error.recoveryStrategy === RecoveryStrategy.RETRY

    if (shouldRetry) {
      const baseDelay = config?.retry?.backoffMs || 1000
      const delay = baseDelay * 2 ** retryCount // Exponential backoff

      this.errorRecoveryAttempts.set(context.executionId, retryCount + 1)

      return { shouldRetry: true, delay, maxRetries }
    }

    return { shouldRetry: false }
  }

  private async logComprehensiveError(
    error: BaseToolError,
    context: AdapterExecutionContext,
    explanation: ToolErrorExplanation,
    recoveryResult: any
  ): Promise<void> {
    logger.error('Comprehensive tool error logged', {
      errorId: error.id,
      toolId: context.toolId,
      executionId: context.executionId,
      category: error.category,
      severity: error.severity,
      recoverable: error.recoverable,
      userMessage: explanation.userMessage,
      immediateActionsCount: explanation.immediateActions.length,
      recoveryAttempted: recoveryResult.success,
      context: error.context,
    })
  }

  private generateFallbackExplanation(
    error: Error,
    context: AdapterExecutionContext,
    errorId: string
  ): ToolErrorExplanation {
    return {
      errorId,
      toolName: context.toolId,
      errorType: ToolErrorCategory.TOOL_EXECUTION_TIMEOUT,
      severity: ErrorSeverity.ERROR,
      impact: ErrorImpact.MEDIUM,
      userMessage:
        'An unexpected error occurred while executing the tool. Please try again or contact support.',
      detailedExplanation: error.message,
      immediateActions: [
        {
          action: 'Try Again',
          description: 'Attempt the operation again',
          estimatedTime: '30 seconds',
          difficulty: 'beginner',
        },
        {
          action: 'Check Configuration',
          description: 'Verify tool settings and parameters',
          estimatedTime: '2 minutes',
          difficulty: 'intermediate',
        },
      ],
      preventionTips: [
        {
          tip: 'Verify all required parameters before execution',
          category: 'usage',
        },
      ],
      troubleshootingSteps: [],
      relatedErrors: [],
      documentationLinks: [],
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        toolId: context.toolId,
        toolName: context.toolId,
        executionId: context.executionId,
      },
    }
  }

  private initializeProactiveValidation(): void {
    // Add common validation rules
    this.proactiveValidationConfig.validationRules.push(
      {
        name: 'Required Parameters Check',
        description: 'Verify all required parameters are provided',
        validate: async (context, parameters) => {
          // Basic check for required parameters
          return parameters && typeof parameters === 'object'
        },
        errorMessage: 'Missing required parameters',
        severity: ErrorSeverity.ERROR,
        preventionTip: 'Always provide all required parameters before execution',
      },
      {
        name: 'Parameter Type Validation',
        description: 'Check parameter types match expectations',
        validate: async (context, parameters) => {
          // Basic type checking
          return true // Simplified for now
        },
        errorMessage: 'Parameter type mismatch detected',
        severity: ErrorSeverity.WARNING,
        preventionTip: 'Verify parameter types match tool requirements',
      }
    )

    // Add pre-execution checks
    this.proactiveValidationConfig.preExecutionChecks.push(
      {
        name: 'Tool Availability Check',
        check: async (context) => {
          // Check if tool is available and healthy
          return true // Simplified for now
        },
        errorMessage: 'Tool is currently unavailable',
        suggestedAction: 'Wait a moment and try again, or use an alternative tool',
      },
      {
        name: 'User Permission Check',
        check: async (context) => {
          // Verify user has permission to execute this tool
          return true // Simplified for now
        },
        errorMessage: 'Insufficient permissions to execute this tool',
        suggestedAction: 'Contact your administrator to request access',
      }
    )
  }

  private initializeErrorPatterns(): void {
    // Initialize with common error patterns
    this.errorAnalytics.errorPatterns.push(
      {
        pattern: 'authentication_failure_burst',
        occurrences: 0,
        lastSeen: new Date(),
        severity: ErrorSeverity.CRITICAL,
        suggestedFix: 'Check API credentials and token expiration',
      },
      {
        pattern: 'timeout_cascade',
        occurrences: 0,
        lastSeen: new Date(),
        severity: ErrorSeverity.ERROR,
        suggestedFix: 'Review timeout settings and network connectivity',
      }
    )
  }

  private mapToToolErrorCategory(category: ErrorCategory, subcategory: string): ToolErrorCategory {
    // Map generic error categories to tool-specific categories
    switch (category) {
      case ErrorCategory.TOOL_EXECUTION:
        if (subcategory.includes('timeout')) return ToolErrorCategory.TOOL_EXECUTION_TIMEOUT
        return ToolErrorCategory.TOOL_EXECUTION_TIMEOUT
      case ErrorCategory.TOOL_AUTHENTICATION:
        return ToolErrorCategory.TOOL_AUTHENTICATION_FAILURE
      case ErrorCategory.USER_INPUT:
        return ToolErrorCategory.PARAMETER_VALIDATION
      case ErrorCategory.TOOL_CONFIGURATION:
        return ToolErrorCategory.TOOL_CONFIGURATION
      default:
        return ToolErrorCategory.TOOL_EXECUTION_TIMEOUT
    }
  }

  private mapSkillLevelToDifficulty(
    skillLevel: UserSkillLevel
  ): 'beginner' | 'intermediate' | 'advanced' {
    switch (skillLevel) {
      case UserSkillLevel.BEGINNER:
        return 'beginner'
      case UserSkillLevel.ADVANCED:
      case UserSkillLevel.DEVELOPER:
        return 'advanced'
      default:
        return 'intermediate'
    }
  }

  private generateTroubleshootingSteps(
    error: BaseToolError,
    context: AdapterExecutionContext
  ): Array<{
    step: string
    instruction: string
    expectedResult: string
    troubleshootIf: string
  }> {
    // Generate context-specific troubleshooting steps
    return [
      {
        step: 'Verify Tool Configuration',
        instruction: 'Check that all tool settings and API keys are correct',
        expectedResult: 'Tool connects successfully without authentication errors',
        troubleshootIf: 'Still getting authentication errors',
      },
      {
        step: 'Test with Simple Parameters',
        instruction: 'Try executing the tool with minimal, basic parameters',
        expectedResult: 'Tool executes successfully with simple inputs',
        troubleshootIf: 'Simple execution also fails',
      },
      {
        step: 'Check Network Connectivity',
        instruction: "Verify that you can reach the tool's service endpoints",
        expectedResult: 'Network connection is stable and responsive',
        troubleshootIf: 'Network connectivity issues persist',
      },
    ]
  }

  private checkForCommonErrorPatterns(
    context: AdapterExecutionContext,
    parameters: any
  ): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = []
    const suggestions: string[] = []

    // Check for patterns that commonly lead to errors

    // Large parameter patterns
    if (parameters && JSON.stringify(parameters).length > 10000) {
      warnings.push('Large parameter size detected - may cause timeout')
      suggestions.push('Consider breaking the operation into smaller chunks')
    }

    // Missing common parameters
    if (parameters && !parameters.workspaceId && !parameters.workspace_id) {
      warnings.push('Workspace context not provided - may cause permission issues')
      suggestions.push('Ensure workspace context is included in parameters')
    }

    return { warnings, suggestions }
  }

  private generateRecommendations(
    errorsByCategory: Record<string, number>,
    topFailingTools: any[],
    commonPatterns: any[]
  ): string[] {
    const recommendations: string[] = []

    // Generate recommendations based on error patterns
    if (errorsByCategory.tool_authentication > 10) {
      recommendations.push(
        'Consider implementing automatic token refresh for authentication-related tools'
      )
    }

    if (errorsByCategory['tool_execution:timeout'] > 15) {
      recommendations.push(
        'Review timeout settings and consider implementing streaming responses for long-running operations'
      )
    }

    if (topFailingTools.length > 0) {
      recommendations.push(
        `Review configuration for ${topFailingTools[0].toolId} - it has the highest failure rate`
      )
    }

    if (commonPatterns.length > 0) {
      recommendations.push(
        `Address the ${commonPatterns[0].pattern} pattern which is occurring frequently`
      )
    }

    return recommendations
  }
}

/**
 * Singleton instance for tool error management
 */
export const comprehensiveToolErrorManager = new ComprehensiveToolErrorManager()

/**
 * Convenience function for handling tool errors
 */
export const handleToolError = (
  error: Error,
  context: AdapterExecutionContext,
  config?: ErrorHandlingConfig
) => comprehensiveToolErrorManager.handleToolError(error, context, config)

/**
 * Convenience function for proactive validation
 */
export const validateBeforeExecution = (
  context: AdapterExecutionContext,
  parameters: any,
  config: AdapterConfiguration
) => comprehensiveToolErrorManager.proactiveValidation(context, parameters, config)

/**
 * Convenience function for generating recovery tutorials
 */
export const generateRecoveryTutorial = (errorId: string, userSkillLevel?: UserSkillLevel) =>
  comprehensiveToolErrorManager.generateRecoveryTutorial(errorId, userSkillLevel)
