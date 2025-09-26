/**
 * Adapter Error Integration Module
 *
 * This module integrates the comprehensive error handling system with all
 * Universal Tool Adapter components, providing seamless error management
 * throughout the adapter lifecycle.
 *
 * @author Error Handling & Recovery Agent
 * @version 1.0.0
 */

import type {
  AdapterConfiguration,
  AdapterExecutionContext,
  AdapterExecutionResult,
  ErrorHandlingConfig,
  ValidationResult,
} from '../types/adapter-interfaces'
import { createLogger } from '../utils/logger'
import { handleToolError, validateBeforeExecution } from './comprehensive-error-manager'

const logger = createLogger('AdapterErrorIntegration')

/**
 * Error-aware parameter mapping with validation
 */
export class ErrorAwareParameterMapper {
  async mapParameters(
    parlantParams: Record<string, any>,
    config: AdapterConfiguration,
    context: AdapterExecutionContext
  ): Promise<{
    mappedParams: Record<string, any>
    validationResult: ValidationResult
    warnings: string[]
  }> {
    const startTime = Date.now()

    try {
      // Proactive validation before mapping
      const proactiveValidation = await validateBeforeExecution(context, parlantParams, config)

      if (!proactiveValidation.valid) {
        logger.warn('Parameter mapping blocked by validation', {
          executionId: context.executionId,
          blockingIssues: proactiveValidation.blockingIssues,
        })

        throw new Error(
          `Parameter validation failed: ${proactiveValidation.blockingIssues.join(', ')}`
        )
      }

      // Perform parameter mapping with error handling
      const mappedParams = await this.performMapping(parlantParams, config, context)

      // Validate mapped parameters
      const validationResult = await this.validateMappedParameters(mappedParams, config, context)

      logger.info('Parameter mapping completed', {
        executionId: context.executionId,
        mappingTimeMs: Date.now() - startTime,
        validationPassed: validationResult.valid,
        warningCount: proactiveValidation.warnings.length,
      })

      return {
        mappedParams,
        validationResult,
        warnings: proactiveValidation.warnings,
      }
    } catch (error) {
      logger.error('Parameter mapping failed', {
        executionId: context.executionId,
        error: error instanceof Error ? error.message : error,
      })

      // Handle mapping error through comprehensive error manager
      const errorResult = await handleToolError(error as Error, context, config.errorHandling)

      throw new Error(`Parameter mapping failed: ${errorResult.explanation.userMessage}`)
    }
  }

  private async performMapping(
    parlantParams: Record<string, any>,
    config: AdapterConfiguration,
    context: AdapterExecutionContext
  ): Promise<Record<string, any>> {
    const mappedParams: Record<string, any> = {}

    if (!config.parameterMappings) {
      return parlantParams
    }

    for (const mapping of config.parameterMappings) {
      try {
        let value = parlantParams[mapping.parlantParameter]

        // Apply default value if parameter is missing
        if (value === undefined && mapping.defaultValue !== undefined) {
          value = mapping.defaultValue
        }

        // Check required parameters
        if (mapping.required && value === undefined) {
          throw new Error(`Required parameter '${mapping.parlantParameter}' is missing`)
        }

        // Apply transformations
        if (mapping.transformations && value !== undefined) {
          for (const transformation of mapping.transformations) {
            value = await this.applyTransformation(value, transformation, context)
          }
        }

        mappedParams[mapping.simParameter] = value
      } catch (mappingError) {
        logger.error('Parameter mapping error', {
          parameter: mapping.parlantParameter,
          error: mappingError instanceof Error ? mappingError.message : mappingError,
        })
        throw mappingError
      }
    }

    return mappedParams
  }

  private async applyTransformation(
    value: any,
    transformation: any,
    context: AdapterExecutionContext
  ): Promise<any> {
    // Apply various transformations with error handling
    try {
      switch (transformation.type) {
        case 'string_format':
          return String(value)
        case 'number_format': {
          const num = Number(value)
          if (Number.isNaN(num)) {
            throw new Error(`Cannot convert '${value}' to number`)
          }
          return num
        }
        case 'json_parse':
          return JSON.parse(value)
        case 'custom':
          if (transformation.customTransform) {
            return await transformation.customTransform(value, transformation.config, context)
          }
          break
      }
      return value
    } catch (transformError) {
      logger.error('Transformation failed', {
        type: transformation.type,
        value: value,
        error: transformError instanceof Error ? transformError.message : transformError,
      })
      throw new Error(`Transformation '${transformation.type}' failed: ${transformError}`)
    }
  }

  private async validateMappedParameters(
    mappedParams: Record<string, any>,
    config: AdapterConfiguration,
    context: AdapterExecutionContext
  ): Promise<ValidationResult> {
    const errors: Array<{ field: string; message: string; code: string }> = []

    if (!config.validation) {
      return { valid: true, errors: [] }
    }

    // Basic validation logic
    for (const [key, value] of Object.entries(mappedParams)) {
      try {
        // Type validation
        if (config.validation.type) {
          const expectedTypes = Array.isArray(config.validation.type)
            ? config.validation.type
            : [config.validation.type]

          const actualType = typeof value
          if (!expectedTypes.includes(actualType)) {
            errors.push({
              field: key,
              message: `Expected type ${expectedTypes.join(' or ')}, got ${actualType}`,
              code: 'TYPE_MISMATCH',
            })
          }
        }

        // Required field validation
        if (config.validation.required && (value === undefined || value === null)) {
          errors.push({
            field: key,
            message: `Required field '${key}' is missing`,
            code: 'REQUIRED_FIELD_MISSING',
          })
        }
      } catch (validationError) {
        errors.push({
          field: key,
          message: `Validation failed: ${validationError}`,
          code: 'VALIDATION_ERROR',
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

/**
 * Error-aware result formatter
 */
export class ErrorAwareResultFormatter {
  async formatResult(
    simResult: any,
    config: AdapterConfiguration,
    context: AdapterExecutionContext
  ): Promise<{
    formattedResult: any
    metadata: Record<string, any>
    warnings: string[]
  }> {
    const startTime = Date.now()
    const warnings: string[] = []

    try {
      // Validate result before formatting
      const resultValidation = await this.validateResult(simResult, config, context)

      if (!resultValidation.valid) {
        warnings.push(
          `Result validation issues: ${resultValidation.errors.map((e) => e.message).join(', ')}`
        )
      }

      // Format the result based on configuration
      const formattedResult = await this.performFormatting(simResult, config, context)

      // Generate metadata
      const metadata = {
        formattingTimeMs: Date.now() - startTime,
        originalResultType: typeof simResult,
        formattedResultType: typeof formattedResult,
        hasWarnings: warnings.length > 0,
      }

      logger.info('Result formatting completed', {
        executionId: context.executionId,
        ...metadata,
      })

      return {
        formattedResult,
        metadata,
        warnings,
      }
    } catch (error) {
      logger.error('Result formatting failed', {
        executionId: context.executionId,
        error: error instanceof Error ? error.message : error,
      })

      // Handle formatting error
      const errorResult = await handleToolError(error as Error, context, config.errorHandling)

      // Return a safe fallback format
      return {
        formattedResult: {
          error: true,
          message: errorResult.explanation.userMessage,
          originalResult: simResult,
        },
        metadata: {
          formattingTimeMs: Date.now() - startTime,
          error: true,
        },
        warnings: [errorResult.explanation.userMessage],
      }
    }
  }

  private async validateResult(
    result: any,
    config: AdapterConfiguration,
    context: AdapterExecutionContext
  ): Promise<ValidationResult> {
    const errors: Array<{ field: string; message: string; code: string }> = []

    // Check if result is in expected format
    if (result === null || result === undefined) {
      errors.push({
        field: 'result',
        message: 'Result is null or undefined',
        code: 'NULL_RESULT',
      })
    }

    // Validate result structure if configured
    if (config.resultFormatting?.templates) {
      // Check if result matches any expected template
      const matchesTemplate = config.resultFormatting.templates.some((template) => {
        return this.resultMatchesTemplate(result, template)
      })

      if (!matchesTemplate) {
        errors.push({
          field: 'result',
          message: 'Result does not match any expected template',
          code: 'TEMPLATE_MISMATCH',
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private resultMatchesTemplate(result: any, template: any): boolean {
    // Simplified template matching - would be more sophisticated in practice
    if (template.condition) {
      if (typeof template.condition === 'function') {
        return template.condition(result, {})
      }
    }
    return true
  }

  private async performFormatting(
    result: any,
    config: AdapterConfiguration,
    context: AdapterExecutionContext
  ): Promise<any> {
    if (!config.resultFormatting) {
      return result
    }

    let formattedResult = { ...result }

    // Apply conversational formatting if enabled
    if (config.resultFormatting.enableConversationalFormatting) {
      formattedResult = await this.applyConversationalFormatting(formattedResult, config, context)
    }

    // Apply template formatting if configured
    if (config.resultFormatting.templates) {
      const matchingTemplate = config.resultFormatting.templates.find((template) =>
        this.resultMatchesTemplate(result, template)
      )

      if (matchingTemplate) {
        formattedResult = await this.applyTemplateFormatting(
          formattedResult,
          matchingTemplate,
          context
        )
      }
    }

    return formattedResult
  }

  private async applyConversationalFormatting(
    result: any,
    config: AdapterConfiguration,
    context: AdapterExecutionContext
  ): Promise<any> {
    // Add conversational elements to make results more natural
    return {
      ...result,
      conversational: {
        summary: this.generateResultSummary(result, context),
        suggestion: this.generateResultSuggestion(result, context),
        nextActions: this.generateNextActions(result, context),
      },
    }
  }

  private async applyTemplateFormatting(
    result: any,
    template: any,
    context: AdapterExecutionContext
  ): Promise<any> {
    // Apply template-based formatting
    return {
      ...result,
      formatted: {
        summary: this.interpolateTemplate(template.summary, result, context),
        details: template.details
          ? this.interpolateTemplate(template.details, result, context)
          : undefined,
        suggestion: template.suggestion
          ? this.interpolateTemplate(template.suggestion, result, context)
          : undefined,
        actions: template.actions || [],
      },
    }
  }

  private generateResultSummary(result: any, context: AdapterExecutionContext): string {
    if (result.success) {
      return `Successfully completed ${context.toolId} operation`
    }
    return `${context.toolId} operation encountered an issue`
  }

  private generateResultSuggestion(result: any, context: AdapterExecutionContext): string {
    if (result.success) {
      return 'The operation completed successfully. You can now proceed with the next step.'
    }
    return 'Please review the error details and try again with corrected parameters.'
  }

  private generateNextActions(result: any, context: AdapterExecutionContext): string[] {
    if (result.success) {
      return ['Review the results', 'Proceed to next step', 'Save or export data if needed']
    }
    return ['Check error details', 'Verify parameters', 'Try again', 'Contact support if needed']
  }

  private interpolateTemplate(
    template: string,
    result: any,
    context: AdapterExecutionContext
  ): string {
    let interpolated = template

    // Replace common placeholders
    interpolated = interpolated.replace(/\{\{toolName\}\}/g, context.toolId)
    interpolated = interpolated.replace(/\{\{userId\}\}/g, context.userId)
    interpolated = interpolated.replace(/\{\{workspaceId\}\}/g, context.workspaceId)

    // Replace result-based placeholders
    if (result.data) {
      Object.entries(result.data).forEach(([key, value]) => {
        const placeholder = new RegExp(`\\{\\{data\\.${key}\\}\\}`, 'g')
        interpolated = interpolated.replace(placeholder, String(value))
      })
    }

    return interpolated
  }
}

/**
 * Error-aware execution wrapper
 */
export class ErrorAwareExecutionWrapper {
  private parameterMapper = new ErrorAwareParameterMapper()
  private resultFormatter = new ErrorAwareResultFormatter()

  async executeWithErrorHandling(
    operation: () => Promise<any>,
    context: AdapterExecutionContext,
    config: AdapterConfiguration
  ): Promise<AdapterExecutionResult> {
    const startTime = new Date()
    const executionId = context.executionId

    logger.info('Starting error-aware execution', {
      executionId,
      toolId: context.toolId,
      userId: context.userId,
    })

    try {
      // Execute the operation with comprehensive error handling
      const result = await operation()
      const completedAt = new Date()

      logger.info('Execution completed successfully', {
        executionId,
        durationMs: completedAt.getTime() - startTime.getTime(),
      })

      return {
        success: true,
        executionId,
        toolId: context.toolId,
        startedAt: startTime,
        completedAt,
        durationMs: completedAt.getTime() - startTime.getTime(),
        data: result,
        stats: {
          parameterMappingTimeMs: 0, // Would be tracked in actual implementation
          validationTimeMs: 0,
          simToolExecutionTimeMs: completedAt.getTime() - startTime.getTime(),
          resultFormattingTimeMs: 0,
        },
      }
    } catch (error) {
      const completedAt = new Date()

      logger.error('Execution failed', {
        executionId,
        error: error instanceof Error ? error.message : error,
        durationMs: completedAt.getTime() - startTime.getTime(),
      })

      // Handle the error through comprehensive error manager
      const errorResult = await handleToolError(error as Error, context, config.errorHandling)

      return {
        success: false,
        executionId,
        toolId: context.toolId,
        startedAt: startTime,
        completedAt,
        durationMs: completedAt.getTime() - startTime.getTime(),
        error: {
          type: errorResult.explanation.errorType,
          message: errorResult.explanation.userMessage,
          code: 'EXECUTION_FAILED',
          details: errorResult.explanation.technicalDetails,
          recoverable: errorResult.recovery,
        },
        suggestions: errorResult.suggestedActions.map((action) => ({
          type: 'recovery',
          message: action,
          action: action,
          priority: 'high' as const,
        })),
        stats: {
          parameterMappingTimeMs: 0,
          validationTimeMs: 0,
          simToolExecutionTimeMs: completedAt.getTime() - startTime.getTime(),
          resultFormattingTimeMs: 0,
        },
      }
    }
  }

  async executeWithFullPipeline(
    simTool: any,
    parlantParams: Record<string, any>,
    context: AdapterExecutionContext,
    config: AdapterConfiguration
  ): Promise<AdapterExecutionResult> {
    return this.executeWithErrorHandling(
      async () => {
        // 1. Parameter mapping with error handling
        const mappingResult = await this.parameterMapper.mapParameters(
          parlantParams,
          config,
          context
        )

        if (!mappingResult.validationResult.valid) {
          throw new Error(
            `Parameter validation failed: ${mappingResult.validationResult.errors.map((e) => e.message).join(', ')}`
          )
        }

        // 2. Execute the Sim tool
        const simResult = await simTool.execute(
          {
            toolCallId: context.executionId,
            toolName: context.toolId,
            log: (level: string, message: string, extra?: any) => {
              logger[level as keyof typeof logger]?.(message, {
                executionId: context.executionId,
                ...extra,
              })
            },
          },
          mappingResult.mappedParams
        )

        // 3. Format the result with error handling
        const formattingResult = await this.resultFormatter.formatResult(simResult, config, context)

        return {
          ...simResult,
          formatted: formattingResult.formattedResult,
          metadata: formattingResult.metadata,
          warnings: [...mappingResult.warnings, ...formattingResult.warnings],
        }
      },
      context,
      config
    )
  }
}

/**
 * Integration decorator for adapter methods
 */
export function withErrorHandling(config?: Partial<ErrorHandlingConfig>) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const context = args.find((arg: any) => arg?.executionId) as AdapterExecutionContext

      if (!context) {
        logger.warn('No execution context found for error handling', { method: propertyName })
        return method.apply(this, args)
      }

      try {
        return await method.apply(this, args)
      } catch (error) {
        logger.error('Method execution failed', {
          method: propertyName,
          executionId: context.executionId,
          error: error instanceof Error ? error.message : error,
        })

        const errorResult = await handleToolError(error as Error, context, config)

        // Re-throw with enhanced error information
        const enhancedError = new Error(errorResult.explanation.userMessage)
        enhancedError.cause = error
        throw enhancedError
      }
    }

    return descriptor
  }
}

/**
 * Singleton instances for integration
 */
export const errorAwareParameterMapper = new ErrorAwareParameterMapper()
export const errorAwareResultFormatter = new ErrorAwareResultFormatter()
export const errorAwareExecutionWrapper = new ErrorAwareExecutionWrapper()

/**
 * Convenience functions for integration
 */
export const mapParametersWithErrorHandling = (
  parlantParams: Record<string, any>,
  config: AdapterConfiguration,
  context: AdapterExecutionContext
) => errorAwareParameterMapper.mapParameters(parlantParams, config, context)

export const formatResultWithErrorHandling = (
  simResult: any,
  config: AdapterConfiguration,
  context: AdapterExecutionContext
) => errorAwareResultFormatter.formatResult(simResult, config, context)

export const executeWithErrorHandling = (
  operation: () => Promise<any>,
  context: AdapterExecutionContext,
  config: AdapterConfiguration
) => errorAwareExecutionWrapper.executeWithErrorHandling(operation, context, config)
