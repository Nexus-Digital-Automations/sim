/**
 * Universal Tool Adapter - Validation Engine
 *
 * Comprehensive validation system for ensuring data integrity, type safety,
 * and business rule compliance across the adapter layer. Provides validation
 * for both input parameters and output results.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

import { z } from 'zod'
import { ValidationError } from '../errors/adapter-errors'
import type {
  BusinessRule,
  ConditionalValidation,
  ValidationConfig,
  ValidationError as ValidationErrorType,
  ValidationResult,
} from '../types/adapter-interfaces'
import type { ParlantExecutionContext } from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'

const logger = createLogger('ValidationEngine')

/**
 * Built-in validation schemas for common data types
 */
export class ValidationSchemas {
  // Basic type schemas
  static readonly string = z.string()
  static readonly number = z.number()
  static readonly boolean = z.boolean()
  static readonly date = z.date()
  static readonly uuid = z.string().uuid()
  static readonly email = z.string().email()
  static readonly url = z.string().url()

  // Extended string schemas
  static readonly nonEmptyString = z.string().min(1)
  static readonly trimmedString = z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1))
  static readonly slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

  // Number schemas with constraints
  static readonly positiveNumber = z.number().positive()
  static readonly nonNegativeNumber = z.number().min(0)
  static readonly percentage = z.number().min(0).max(100)
  static readonly port = z.number().int().min(1).max(65535)

  // Array schemas
  static readonly nonEmptyArray = z.array(z.any()).min(1)
  static readonly uniqueStringArray = z.array(z.string()).transform((arr) => [...new Set(arr)])

  // Object schemas
  static readonly record = z.record(z.any())
  static readonly metadata = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))

  // Workspace and user related schemas
  static readonly workspaceId = z.string().uuid()
  static readonly userId = z.string().uuid()
  static readonly sessionId = z.string().uuid()
  static readonly agentId = z.string().uuid()

  // File and media schemas
  static readonly fileName = z.string().regex(/^[^<>:"/\\|?*]+$/)
  static readonly mimeType = z.string().regex(/^\w+\/\w+$/)
  static readonly fileSize = z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024) // 100MB max

  // API and integration schemas
  static readonly httpMethod = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
  static readonly httpStatus = z.number().int().min(100).max(599)
  static readonly apiKey = z.string().min(10)

  // Workflow related schemas
  static readonly workflowId = z.string().uuid()
  static readonly nodeId = z.string()
  static readonly nodeType = z.string()

  // Common patterns
  static readonly phoneNumber = z.string().regex(/^\+?[1-9]\d{1,14}$/)
  static readonly ipAddress = z.string().ip()
  static readonly jsonString = z.string().transform((str, ctx) => {
    try {
      return JSON.parse(str)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON string' })
      return z.NEVER
    }
  })

  /**
   * Create conditional schema based on other field values
   */
  static conditional<T>(
    condition: (data: any) => boolean,
    trueSchema: z.ZodSchema<T>,
    falseSchema: z.ZodSchema<T> = z.any()
  ): z.ZodSchema<T> {
    return z.any().superRefine((data, ctx) => {
      const schema = condition(data) ? trueSchema : falseSchema
      const result = schema.safeParse(data)
      if (!result.success) {
        result.error.issues.forEach((issue) => ctx.addIssue(issue))
      }
    }) as z.ZodSchema<T>
  }

  /**
   * Create schema that validates against multiple possible schemas
   */
  static oneOf<T>(...schemas: z.ZodSchema<T>[]): z.ZodSchema<T> {
    return z.union(schemas as [z.ZodSchema<T>, z.ZodSchema<T>, ...z.ZodSchema<T>[]])
  }

  /**
   * Create schema for workspace-scoped resources
   */
  static workspaceResource(resourceSchema: z.ZodSchema<any>): z.ZodSchema<any> {
    return z.object({
      workspaceId: ValidationSchemas.workspaceId,
      ...resourceSchema.shape,
    })
  }
}

/**
 * Business rule validators for domain-specific validation logic
 */
export class BusinessRuleValidators {
  /**
   * Validate workspace access permissions
   */
  static async validateWorkspaceAccess(
    workspaceId: string,
    userId: string,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // In a real implementation, this would check against the database
    // For now, we'll assume workspace access is valid if both IDs are present
    return !!(workspaceId && userId && context.workspaceId === workspaceId)
  }

  /**
   * Validate user permissions for specific actions
   */
  static async validateUserPermissions(
    userId: string,
    action: string,
    resource: string,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Business logic for checking user permissions
    // This would integrate with the actual permission system
    logger.debug('Validating user permissions', { userId, action, resource })
    return true // Placeholder
  }

  /**
   * Validate rate limits for API calls
   */
  static async validateRateLimit(
    userId: string,
    toolName: string,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Rate limiting logic would go here
    // This might check against Redis or similar
    logger.debug('Checking rate limits', { userId, toolName })
    return true // Placeholder
  }

  /**
   * Validate resource quotas (file size, storage, etc.)
   */
  static async validateResourceQuota(
    workspaceId: string,
    resourceType: string,
    requestedAmount: number,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Check against workspace quotas
    logger.debug('Validating resource quota', { workspaceId, resourceType, requestedAmount })
    return true // Placeholder
  }

  /**
   * Validate data dependencies (referenced resources exist)
   */
  static async validateDataDependencies(
    dependencies: Array<{ type: string; id: string }>,
    context: ParlantExecutionContext
  ): Promise<{ valid: boolean; missingDependencies: string[] }> {
    // Check that all referenced resources exist
    const missingDependencies: string[] = []

    for (const dep of dependencies) {
      // In real implementation, check database for resource existence
      logger.debug('Checking dependency', dep)
    }

    return {
      valid: missingDependencies.length === 0,
      missingDependencies,
    }
  }
}

/**
 * Validation Engine
 *
 * Main validation orchestrator that applies schema validation,
 * business rules, and contextual constraints to ensure data integrity
 * throughout the adapter system.
 */
export class ValidationEngine {
  private readonly config: ValidationConfig
  private readonly businessRules: BusinessRule[]
  private readonly customValidators: Map<string, (value: any, context: any) => Promise<boolean>>

  constructor(config: ValidationConfig = {}) {
    this.config = {
      enableStrictValidation: true,
      enableBusinessRules: true,
      enableCustomValidators: true,
      ...config,
    }

    this.businessRules = config.businessRules || []
    this.customValidators = new Map()

    logger.info('Validation engine initialized', {
      strictValidation: this.config.enableStrictValidation,
      businessRulesCount: this.businessRules.length,
    })
  }

  /**
   * Register a custom validation function
   */
  public registerValidator(
    name: string,
    validator: (value: any, context: any) => Promise<boolean>
  ): void {
    this.customValidators.set(name, validator)
    logger.debug(`Registered custom validator: ${name}`)
  }

  /**
   * Validate input parameters against schema and business rules
   */
  public async validateInput<T>(
    data: T,
    schema: z.ZodSchema<T>,
    context: ParlantExecutionContext
  ): Promise<{ data: T; errors: ValidationErrorType[] }> {
    const startTime = Date.now()
    const errors: ValidationErrorType[] = []

    try {
      // Step 1: Schema validation
      let validatedData: T
      try {
        validatedData = schema.parse(data)
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(
            ...error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
            }))
          )
        }

        // If strict validation is disabled, use original data
        validatedData = this.config.enableStrictValidation ? data : (data as T)
      }

      // Step 2: Business rule validation (if enabled)
      if (this.config.enableBusinessRules) {
        const businessRuleErrors = await this.validateBusinessRules(validatedData, context)
        errors.push(...businessRuleErrors)
      }

      // Step 3: Custom validation (if enabled)
      if (this.config.enableCustomValidators) {
        const customValidationErrors = await this.validateCustomRules(validatedData, context)
        errors.push(...customValidationErrors)
      }

      const duration = Date.now() - startTime
      logger.debug('Input validation completed', {
        duration,
        errorCount: errors.length,
        hasData: !!validatedData,
      })

      return { data: validatedData!, errors }
    } catch (error) {
      logger.error('Input validation failed', { error: error.message })
      throw new ValidationError('Input validation failed', errors)
    }
  }

  /**
   * Validate output results to ensure consistent format
   */
  public async validateOutput<T>(
    data: T,
    schema: z.ZodSchema<T>,
    context: ParlantExecutionContext
  ): Promise<{ data: T; errors: ValidationErrorType[] }> {
    const errors: ValidationErrorType[] = []

    try {
      // Output validation is typically less strict
      const validatedData = schema.parse(data)

      logger.debug('Output validation completed', {
        hasData: !!validatedData,
      })

      return { data: validatedData, errors }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(
          ...error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          }))
        )
      }

      // For output validation, we're more lenient - return original data with errors logged
      logger.warn('Output validation failed', { errorCount: errors.length })
      return { data: data as T, errors }
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    data: any,
    context: ParlantExecutionContext
  ): Promise<ValidationErrorType[]> {
    const errors: ValidationErrorType[] = []

    for (const rule of this.businessRules) {
      try {
        const isValid = await this.evaluateBusinessRule(rule, data, context)
        if (!isValid) {
          errors.push({
            field: rule.field || 'business_rule',
            message: rule.errorMessage || `Business rule violation: ${rule.name}`,
            code: 'business_rule_violation',
          })
        }
      } catch (error) {
        logger.error(`Business rule evaluation failed: ${rule.name}`, { error: error.message })
        errors.push({
          field: rule.field || 'business_rule',
          message: `Business rule error: ${error.message}`,
          code: 'business_rule_error',
        })
      }
    }

    return errors
  }

  /**
   * Evaluate a single business rule
   */
  private async evaluateBusinessRule(
    rule: BusinessRule,
    data: any,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    switch (rule.type) {
      case 'workspace_access':
        return BusinessRuleValidators.validateWorkspaceAccess(
          data.workspaceId || context.workspaceId,
          data.userId || context.userId,
          context
        )

      case 'user_permissions':
        return BusinessRuleValidators.validateUserPermissions(
          context.userId,
          rule.action || 'execute',
          rule.resource || 'tool',
          context
        )

      case 'rate_limit':
        return BusinessRuleValidators.validateRateLimit(
          context.userId,
          context.toolName || 'unknown',
          context
        )

      case 'resource_quota':
        return BusinessRuleValidators.validateResourceQuota(
          context.workspaceId,
          rule.resourceType || 'general',
          rule.requestedAmount || 1,
          context
        )

      case 'data_dependencies': {
        const depResult = await BusinessRuleValidators.validateDataDependencies(
          rule.dependencies || [],
          context
        )
        return depResult.valid
      }

      case 'custom':
        if (rule.validator) {
          return rule.validator(data, context)
        }
        return true

      default:
        logger.warn(`Unknown business rule type: ${rule.type}`)
        return true
    }
  }

  /**
   * Validate using custom validation functions
   */
  private async validateCustomRules(
    data: any,
    context: ParlantExecutionContext
  ): Promise<ValidationErrorType[]> {
    const errors: ValidationErrorType[] = []

    for (const [name, validator] of this.customValidators) {
      try {
        const isValid = await validator(data, context)
        if (!isValid) {
          errors.push({
            field: 'custom_validation',
            message: `Custom validation failed: ${name}`,
            code: 'custom_validation_error',
          })
        }
      } catch (error) {
        logger.error(`Custom validator failed: ${name}`, { error: error.message })
        errors.push({
          field: 'custom_validation',
          message: `Custom validator error: ${error.message}`,
          code: 'custom_validator_error',
        })
      }
    }

    return errors
  }

  /**
   * Validate conditional rules based on context or data
   */
  public async validateConditional(
    data: any,
    conditionalValidation: ConditionalValidation,
    context: ParlantExecutionContext
  ): Promise<ValidationResult> {
    // Evaluate condition
    let conditionMet: boolean
    try {
      conditionMet = await this.evaluateCondition(conditionalValidation.condition, data, context)
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            field: 'conditional',
            message: `Condition evaluation failed: ${error.message}`,
            code: 'condition_error',
          },
        ],
      }
    }

    // Apply appropriate validation schema
    const schema = conditionMet
      ? conditionalValidation.ifTrue
      : conditionalValidation.ifFalse || z.any()

    try {
      const validatedData = schema.parse(data)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        }
      }

      return {
        valid: false,
        errors: [
          {
            field: 'conditional',
            message: error.message,
            code: 'validation_error',
          },
        ],
      }
    }
  }

  /**
   * Evaluate a condition for conditional validation
   */
  private async evaluateCondition(
    condition: any, // This would be more specific in a real implementation
    data: any,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Simple implementation - in reality this would be much more sophisticated
    if (typeof condition === 'function') {
      return condition(data, context)
    }

    if (typeof condition === 'boolean') {
      return condition
    }

    // Object-based condition evaluation
    if (condition && typeof condition === 'object') {
      // Handle field-based conditions
      if (condition.field && condition.operator && condition.value !== undefined) {
        const fieldValue = this.getNestedValue(data, condition.field)
        return this.evaluateComparison(fieldValue, condition.operator, condition.value)
      }
    }

    return true // Default to true for unknown conditions
  }

  /**
   * Evaluate comparison operations
   */
  private evaluateComparison(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expected
      case 'not_equals':
        return value !== expected
      case 'greater_than':
        return value > expected
      case 'less_than':
        return value < expected
      case 'contains':
        return Array.isArray(value) && value.includes(expected)
      case 'matches':
        return typeof value === 'string' && new RegExp(expected).test(value)
      case 'exists':
        return value !== null && value !== undefined
      default:
        return true
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Utility methods for testing and configuration

  /**
   * Test validation rules without running full validation
   */
  public async testValidation<T>(
    data: T,
    schema: z.ZodSchema<T>
  ): Promise<{ success: boolean; errors: ValidationErrorType[] }> {
    try {
      schema.parse(data)
      return { success: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        }
      }
      return {
        success: false,
        errors: [{ field: 'unknown', message: error.message, code: 'unknown' }],
      }
    }
  }

  /**
   * Get validation configuration
   */
  public getConfig(): ValidationConfig {
    return { ...this.config }
  }

  /**
   * Update validation configuration
   */
  public updateConfig(newConfig: Partial<ValidationConfig>): void {
    Object.assign(this.config, newConfig)
    logger.debug('Validation configuration updated')
  }

  /**
   * Get registered business rules
   */
  public getBusinessRules(): BusinessRule[] {
    return [...this.businessRules]
  }

  /**
   * Add a new business rule
   */
  public addBusinessRule(rule: BusinessRule): void {
    this.businessRules.push(rule)
    logger.debug(`Added business rule: ${rule.name}`)
  }

  /**
   * Remove a business rule by name
   */
  public removeBusinessRule(name: string): boolean {
    const index = this.businessRules.findIndex((rule) => rule.name === name)
    if (index !== -1) {
      this.businessRules.splice(index, 1)
      logger.debug(`Removed business rule: ${name}`)
      return true
    }
    return false
  }
}
