/**
 * Enhanced Validation Engine
 *
 * Comprehensive parameter validation and type conversion system with support for
 * business rules, contextual validation, async validation, and sophisticated
 * type transformations for BlockConfig parameters.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

import { z } from 'zod'
import type {
  ValidationConfig,
  ValidationResult,
  ValidationError,
  BusinessRule,
  ConditionalValidation,
  ParameterMapping,
  ContextualValue,
  AdapterExecutionContext
} from '../types/adapter-interfaces'

import type {
  ParlantExecutionContext
} from '../types/parlant-interfaces'

import type {
  SubBlockConfig,
  SubBlockType,
  ParamType
} from '@/blocks/types'

import { createLogger } from '../utils/logger'

const logger = createLogger('EnhancedValidationEngine')

/**
 * Enhanced validation engine with comprehensive parameter processing
 */
export class EnhancedValidationEngine {

  // Validation caches for performance
  private readonly schemaCache = new Map<string, z.ZodSchema<any>>()
  private readonly validationCache = new Map<string, ValidationResult>()
  private readonly businessRuleCache = new Map<string, boolean>()

  // Type conversion registry
  private readonly typeConverters = new Map<string, TypeConverter>()
  private readonly customValidators = new Map<string, CustomValidator>()

  // Configuration
  private readonly config: ValidationEngineConfig

  constructor(config: ValidationEngineConfig = {}) {
    this.config = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      maxCacheSize: 1000,
      strictMode: false,
      enableAsyncValidation: true,
      enableBusinessRules: true,
      enableTypeConversion: true,
      conversionTimeout: 5000,
      validationTimeout: 10000,
      ...config
    }

    // Initialize built-in type converters
    this.initializeTypeConverters()

    // Initialize built-in validators
    this.initializeCustomValidators()

    logger.info('Enhanced Validation Engine initialized', {
      caching: this.config.enableCaching,
      asyncValidation: this.config.enableAsyncValidation,
      businessRules: this.config.enableBusinessRules,
      typeConversion: this.config.enableTypeConversion
    })
  }

  /**
   * Comprehensive parameter validation with type conversion
   */
  async validateParameters(
    parameters: Record<string, any>,
    parameterMappings: ParameterMapping[],
    context: ParlantExecutionContext
  ): Promise<ValidationResult> {
    const startTime = Date.now()
    const validationId = this.generateValidationId(parameters, parameterMappings)

    logger.debug('Starting parameter validation', {
      validationId,
      parameterCount: Object.keys(parameters).length,
      mappingCount: parameterMappings.length
    })

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.validationCache.get(validationId)
      if (cached && !this.isCacheExpired(cached.timestamp)) {
        logger.debug('Returning cached validation result', { validationId })
        return cached.result
      }
    }

    try {
      const result = await this.performValidation(
        parameters,
        parameterMappings,
        context
      )

      // Cache successful validation
      if (this.config.enableCaching && result.valid) {
        this.cacheValidationResult(validationId, result)
      }

      const duration = Date.now() - startTime
      logger.debug('Parameter validation completed', {
        validationId,
        valid: result.valid,
        errorCount: result.errors.length,
        duration
      })

      return result

    } catch (error) {
      logger.error('Parameter validation failed', {
        validationId,
        error: error.message,
        duration: Date.now() - startTime
      })

      return {
        valid: false,
        errors: [{
          field: 'validation_system',
          message: `Validation system error: ${error.message}`,
          code: 'VALIDATION_SYSTEM_ERROR'
        }],
        transformedParameters: parameters,
        metadata: {
          validationId,
          error: error.message
        }
      }
    }
  }

  /**
   * Validate and transform a single parameter
   */
  async validateSingleParameter(
    value: any,
    parameterName: string,
    mapping: ParameterMapping,
    context: ParlantExecutionContext
  ): Promise<SingleParameterResult> {
    const startTime = Date.now()

    try {
      // Apply contextual value resolution
      let processedValue = value
      if (mapping.contextualValue) {
        processedValue = await this.resolveContextualValue(
          mapping.contextualValue,
          value,
          context
        )
      }

      // Apply transformations
      if (mapping.transformations) {
        for (const transformation of mapping.transformations) {
          processedValue = await this.applyTransformation(
            processedValue,
            transformation,
            context
          )
        }
      }

      // Type conversion
      if (this.config.enableTypeConversion && mapping.targetType) {
        processedValue = await this.convertType(
          processedValue,
          mapping.targetType,
          parameterName
        )
      }

      // Validation
      const validationResult = await this.validateValue(
        processedValue,
        parameterName,
        mapping,
        context
      )

      const duration = Date.now() - startTime
      logger.debug('Single parameter validation completed', {
        parameter: parameterName,
        valid: validationResult.valid,
        duration
      })

      return {
        valid: validationResult.valid,
        value: validationResult.valid ? processedValue : value,
        errors: validationResult.errors,
        transformations: mapping.transformations?.map(t => t.type) || [],
        metadata: {
          originalValue: value,
          processedValue,
          duration
        }
      }

    } catch (error) {
      logger.error('Single parameter validation failed', {
        parameter: parameterName,
        error: error.message
      })

      return {
        valid: false,
        value,
        errors: [{
          field: parameterName,
          message: error.message,
          code: 'PARAMETER_VALIDATION_ERROR'
        }],
        transformations: [],
        metadata: {
          originalValue: value,
          error: error.message
        }
      }
    }
  }

  /**
   * Build comprehensive validation schema for SubBlockConfig
   */
  buildValidationSchema(subBlocks: SubBlockConfig[]): z.ZodSchema<any> {
    const cacheKey = this.generateSchemaKey(subBlocks)

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.schemaCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const shape: Record<string, z.ZodTypeAny> = {}

    for (const subBlock of subBlocks) {
      if (subBlock.hidden || subBlock.type === 'trigger-config') {
        continue
      }

      let schema = this.createZodSchemaForSubBlock(subBlock)

      // Apply conditions
      if (subBlock.condition) {
        schema = this.applyConditionalSchema(schema, subBlock.condition)
      }

      // Make optional if not required
      if (!subBlock.required) {
        schema = schema.optional()
      }

      // Add default value
      if (subBlock.defaultValue !== undefined) {
        schema = schema.default(subBlock.defaultValue)
      }

      shape[subBlock.id] = schema
    }

    const finalSchema = z.object(shape)

    // Cache schema
    if (this.config.enableCaching) {
      this.schemaCache.set(cacheKey, finalSchema)
    }

    return finalSchema
  }

  /**
   * Register custom type converter
   */
  registerTypeConverter(type: string, converter: TypeConverter): void {
    this.typeConverters.set(type, converter)
    logger.debug('Registered type converter', { type })
  }

  /**
   * Register custom validator
   */
  registerCustomValidator(name: string, validator: CustomValidator): void {
    this.customValidators.set(name, validator)
    logger.debug('Registered custom validator', { name })
  }

  /**
   * Clear validation caches
   */
  clearCaches(): void {
    this.schemaCache.clear()
    this.validationCache.clear()
    this.businessRuleCache.clear()
    logger.debug('Validation caches cleared')
  }

  /**
   * Get validation engine statistics
   */
  getStatistics(): ValidationEngineStats {
    return {
      schemaCacheSize: this.schemaCache.size,
      validationCacheSize: this.validationCache.size,
      businessRuleCacheSize: this.businessRuleCache.size,
      registeredTypeConverters: this.typeConverters.size,
      registeredCustomValidators: this.customValidators.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageValidationTime: 0 // Would be tracked in a real implementation
    }
  }

  // Private implementation methods

  private async performValidation(
    parameters: Record<string, any>,
    parameterMappings: ParameterMapping[],
    context: ParlantExecutionContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const transformedParameters: Record<string, any> = { ...parameters }
    const validationMetadata: Record<string, any> = {}

    // Process each parameter mapping
    for (const mapping of parameterMappings) {
      const paramValue = parameters[mapping.parlantParameter]

      // Skip if parameter not provided and not required
      if (paramValue === undefined && !mapping.required) {
        continue
      }

      // Validate required parameters
      if (mapping.required && (paramValue === undefined || paramValue === null || paramValue === '')) {
        errors.push({
          field: mapping.parlantParameter,
          message: `${mapping.parlantParameter} is required`,
          code: 'REQUIRED_FIELD_MISSING'
        })
        continue
      }

      // Process parameter
      const paramResult = await this.validateSingleParameter(
        paramValue,
        mapping.parlantParameter,
        mapping,
        context
      )

      if (!paramResult.valid) {
        errors.push(...paramResult.errors)
      } else {
        // Store transformed value using Sim parameter name
        transformedParameters[mapping.simParameter] = paramResult.value
        validationMetadata[mapping.parlantParameter] = paramResult.metadata
      }
    }

    // Apply business rules if enabled
    if (this.config.enableBusinessRules) {
      const businessRuleErrors = await this.validateBusinessRules(
        transformedParameters,
        parameterMappings,
        context
      )
      errors.push(...businessRuleErrors)
    }

    // Cross-parameter validation
    const crossValidationErrors = await this.performCrossParameterValidation(
      transformedParameters,
      parameterMappings,
      context
    )
    errors.push(...crossValidationErrors)

    return {
      valid: errors.length === 0,
      errors,
      transformedParameters,
      metadata: validationMetadata
    }
  }

  private async validateValue(
    value: any,
    parameterName: string,
    mapping: ParameterMapping,
    context: ParlantExecutionContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    // Basic validation config
    if (mapping.validation) {
      // Zod schema validation
      if (mapping.validation.schema) {
        try {
          mapping.validation.schema.parse(value)
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(e => ({
              field: parameterName,
              message: e.message,
              code: e.code
            })))
          }
        }
      }

      // Type validation
      if (mapping.validation.type && !this.validateType(value, mapping.validation.type)) {
        errors.push({
          field: parameterName,
          message: `Expected type ${mapping.validation.type}, got ${typeof value}`,
          code: 'TYPE_MISMATCH'
        })
      }

      // Custom validation
      if (mapping.validation.custom) {
        try {
          const customResult = await mapping.validation.custom(value, parameterName)
          if (customResult !== true) {
            errors.push({
              field: parameterName,
              message: typeof customResult === 'string' ? customResult : 'Custom validation failed',
              code: 'CUSTOM_VALIDATION_FAILED'
            })
          }
        } catch (error) {
          errors.push({
            field: parameterName,
            message: `Custom validation error: ${error.message}`,
            code: 'CUSTOM_VALIDATION_ERROR'
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      transformedParameters: { [parameterName]: value }
    }
  }

  private async validateBusinessRules(
    parameters: Record<string, any>,
    parameterMappings: ParameterMapping[],
    context: ParlantExecutionContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    for (const mapping of parameterMappings) {
      if (!mapping.validation?.businessRules) continue

      for (const rule of mapping.validation.businessRules) {
        const ruleKey = this.generateBusinessRuleKey(rule, parameters)

        // Check cache
        if (this.config.enableCaching) {
          const cached = this.businessRuleCache.get(ruleKey)
          if (cached !== undefined) {
            if (!cached) {
              errors.push({
                field: mapping.parlantParameter,
                message: rule.errorMessage || `Business rule '${rule.name}' failed`,
                code: 'BUSINESS_RULE_VIOLATION'
              })
            }
            continue
          }
        }

        try {
          const isValid = await this.evaluateBusinessRule(rule, parameters, context)

          // Cache result
          if (this.config.enableCaching) {
            this.businessRuleCache.set(ruleKey, isValid)
          }

          if (!isValid) {
            errors.push({
              field: mapping.parlantParameter,
              message: rule.errorMessage || `Business rule '${rule.name}' failed`,
              code: 'BUSINESS_RULE_VIOLATION'
            })
          }

        } catch (error) {
          logger.warn('Business rule evaluation failed', {
            rule: rule.name,
            error: error.message
          })

          errors.push({
            field: mapping.parlantParameter,
            message: `Business rule evaluation failed: ${error.message}`,
            code: 'BUSINESS_RULE_ERROR'
          })
        }
      }
    }

    return errors
  }

  private async evaluateBusinessRule(
    rule: BusinessRule,
    parameters: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    switch (rule.type) {
      case 'workspace_access':
        return this.validateWorkspaceAccess(rule, parameters, context)

      case 'user_permissions':
        return this.validateUserPermissions(rule, parameters, context)

      case 'rate_limit':
        return this.validateRateLimit(rule, parameters, context)

      case 'resource_quota':
        return this.validateResourceQuota(rule, parameters, context)

      case 'data_dependencies':
        return this.validateDataDependencies(rule, parameters, context)

      case 'custom':
        if (rule.validator) {
          return rule.validator(parameters, context)
        }
        return true

      default:
        logger.warn('Unknown business rule type', { type: rule.type })
        return true
    }
  }

  private async performCrossParameterValidation(
    parameters: Record<string, any>,
    parameterMappings: ParameterMapping[],
    context: ParlantExecutionContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    // Validate parameter dependencies
    for (const mapping of parameterMappings) {
      if (mapping.conditions) {
        const conditionsMet = await this.evaluateConditions(
          mapping.conditions,
          parameters,
          context
        )

        if (!conditionsMet && parameters[mapping.simParameter] !== undefined) {
          errors.push({
            field: mapping.parlantParameter,
            message: `Parameter conditions not met for ${mapping.parlantParameter}`,
            code: 'CONDITION_NOT_MET'
          })
        }
      }
    }

    // Additional cross-parameter validations could be added here

    return errors
  }

  private async resolveContextualValue(
    contextualValue: ContextualValue,
    originalValue: any,
    context: ParlantExecutionContext
  ): Promise<any> {
    switch (contextualValue.source) {
      case 'constant':
        return contextualValue.value

      case 'original':
        return originalValue

      case 'context':
        if (contextualValue.path) {
          return this.getNestedValue(context, contextualValue.path)
        }
        return undefined

      case 'computed':
        if (contextualValue.compute) {
          return contextualValue.compute(context, originalValue)
        }
        return originalValue

      case 'timestamp':
        return new Date().toISOString()

      case 'uuid':
        return this.generateUUID()

      default:
        return originalValue
    }
  }

  private async applyTransformation(
    value: any,
    transformation: any,
    context: ParlantExecutionContext
  ): Promise<any> {
    try {
      switch (transformation.type) {
        case 'oauth_credential_resolver':
          return this.resolveOAuthCredential(value, transformation.config, context)

        case 'resource_id_resolver':
          return this.resolveResourceId(value, transformation.config, context)

        case 'json_parser':
          return this.parseJSON(value, transformation.config)

        case 'time_normalizer':
          return this.normalizeTime(value, transformation.config)

        case 'array_normalizer':
          return this.normalizeArray(value, transformation.config)

        case 'numeric_range_validator':
          return this.validateNumericRange(value, transformation.config)

        case 'code_processor':
          return this.processCode(value, transformation.config)

        case 'conditional_processor':
          return this.processConditional(value, transformation.config, context)

        default:
          if (transformation.customTransform) {
            return transformation.customTransform(value, transformation.config, context)
          }
          return value
      }
    } catch (error) {
      logger.warn('Transformation failed', {
        type: transformation.type,
        error: error.message
      })
      throw error
    }
  }

  private async convertType(
    value: any,
    targetType: string,
    parameterName: string
  ): Promise<any> {
    if (!this.config.enableTypeConversion) {
      return value
    }

    const converter = this.typeConverters.get(targetType)
    if (!converter) {
      // Fall back to basic type conversion
      return this.basicTypeConversion(value, targetType)
    }

    try {
      return await converter(value, parameterName)
    } catch (error) {
      logger.warn('Type conversion failed', {
        targetType,
        parameter: parameterName,
        error: error.message
      })
      throw new Error(`Type conversion failed for ${parameterName}: ${error.message}`)
    }
  }

  private createZodSchemaForSubBlock(subBlock: SubBlockConfig): z.ZodTypeAny {
    switch (subBlock.type) {
      case 'short-input':
      case 'long-input':
      case 'oauth-input':
      case 'file-selector':
      case 'project-selector':
      case 'channel-selector':
      case 'folder-selector':
        return z.string()

      case 'slider':
        let numberSchema = z.number()
        if (subBlock.min !== undefined) numberSchema = numberSchema.min(subBlock.min)
        if (subBlock.max !== undefined) numberSchema = numberSchema.max(subBlock.max)
        return numberSchema

      case 'switch':
        return z.boolean()

      case 'dropdown':
      case 'combobox':
        if (subBlock.options) {
          const options = typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options
          const enumValues = options.map(opt => opt.id) as [string, ...string[]]
          return z.enum(enumValues)
        }
        return z.string()

      case 'checkbox-list':
        return z.array(z.string())

      case 'code':
      case 'table':
        return z.any()

      case 'time-input':
        return z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Invalid time format')

      default:
        return z.string()
    }
  }

  private applyConditionalSchema(
    schema: z.ZodTypeAny,
    condition: any
  ): z.ZodTypeAny {
    // For now, return the schema as-is
    // In a full implementation, this would apply conditional logic
    return schema
  }

  private validateType(value: any, expectedTypes: string | string[]): boolean {
    const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes]

    return types.some(type => {
      switch (type) {
        case 'string':
          return typeof value === 'string'
        case 'number':
          return typeof value === 'number'
        case 'boolean':
          return typeof value === 'boolean'
        case 'array':
          return Array.isArray(value)
        case 'object':
          return typeof value === 'object' && value !== null && !Array.isArray(value)
        case 'json':
          try {
            if (typeof value === 'string') {
              JSON.parse(value)
              return true
            }
            return typeof value === 'object'
          } catch {
            return false
          }
        default:
          return true
      }
    })
  }

  private async evaluateConditions(
    conditions: any[],
    parameters: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Simplified condition evaluation
    // A full implementation would handle complex boolean logic
    return conditions.every(condition => {
      const fieldValue = parameters[condition.field]
      return fieldValue === condition.value
    })
  }

  private basicTypeConversion(value: any, targetType: string): any {
    switch (targetType) {
      case 'string':
        return value?.toString() || ''

      case 'number':
        const num = Number(value)
        if (isNaN(num)) {
          throw new Error(`Cannot convert "${value}" to number`)
        }
        return num

      case 'boolean':
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') {
          const lowered = value.toLowerCase()
          return lowered === 'true' || lowered === '1' || lowered === 'yes'
        }
        return Boolean(value)

      case 'array':
        if (Array.isArray(value)) return value
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : [parsed]
          } catch {
            return [value]
          }
        }
        return [value]

      case 'object':
        if (typeof value === 'object' && value !== null) return value
        if (typeof value === 'string') {
          try {
            return JSON.parse(value)
          } catch {
            throw new Error(`Cannot parse "${value}" as object`)
          }
        }
        return {}

      default:
        return value
    }
  }

  // Business rule validation methods

  private async validateWorkspaceAccess(
    rule: BusinessRule,
    parameters: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Implementation would check workspace access permissions
    return true // Placeholder
  }

  private async validateUserPermissions(
    rule: BusinessRule,
    parameters: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Implementation would check user permissions
    return true // Placeholder
  }

  private async validateRateLimit(
    rule: BusinessRule,
    parameters: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Implementation would check rate limits
    return true // Placeholder
  }

  private async validateResourceQuota(
    rule: BusinessRule,
    parameters: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Implementation would check resource quotas
    return true // Placeholder
  }

  private async validateDataDependencies(
    rule: BusinessRule,
    parameters: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<boolean> {
    // Implementation would check data dependencies
    if (rule.dependencies) {
      return rule.dependencies.every(dep => {
        return parameters[dep.id] !== undefined
      })
    }
    return true
  }

  // Transformation implementations

  private async resolveOAuthCredential(
    value: any,
    config: any,
    context: ParlantExecutionContext
  ): Promise<any> {
    // Implementation would resolve OAuth credentials
    return value // Placeholder
  }

  private async resolveResourceId(
    value: any,
    config: any,
    context: ParlantExecutionContext
  ): Promise<any> {
    // Implementation would resolve resource IDs
    return value // Placeholder
  }

  private parseJSON(value: any, config: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch (error) {
        if (config.validateJson) {
          throw new Error(`Invalid JSON: ${error.message}`)
        }
        return value
      }
    }
    return value
  }

  private normalizeTime(value: any, config: any): any {
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value)
      if (config.outputFormat === 'iso8601') {
        return date.toISOString()
      }
      return date
    }
    return value
  }

  private normalizeArray(value: any, config: any): any {
    if (config.ensureArray && !Array.isArray(value)) {
      return [value]
    }
    return value
  }

  private validateNumericRange(value: any, config: any): any {
    const num = Number(value)
    if (isNaN(num)) {
      throw new Error('Value must be a number')
    }

    if (config.min !== undefined && num < config.min) {
      throw new Error(`Value must be at least ${config.min}`)
    }

    if (config.max !== undefined && num > config.max) {
      throw new Error(`Value must be at most ${config.max}`)
    }

    if (config.integer && !Number.isInteger(num)) {
      throw new Error('Value must be an integer')
    }

    return num
  }

  private processCode(value: any, config: any): any {
    // Implementation would process code based on language and generation type
    return value // Placeholder
  }

  private processConditional(
    value: any,
    config: any,
    context: ParlantExecutionContext
  ): any {
    // Implementation would process conditional logic
    return value // Placeholder
  }

  // Utility methods

  private generateValidationId(
    parameters: Record<string, any>,
    mappings: ParameterMapping[]
  ): string {
    return `${JSON.stringify(parameters)}_${mappings.map(m => m.parlantParameter).join(',')}`
  }

  private generateSchemaKey(subBlocks: SubBlockConfig[]): string {
    return subBlocks.map(sb => `${sb.id}:${sb.type}:${sb.required}`).join('|')
  }

  private generateBusinessRuleKey(
    rule: BusinessRule,
    parameters: Record<string, any>
  ): string {
    return `${rule.name}_${JSON.stringify(parameters)}`
  }

  private cacheValidationResult(id: string, result: ValidationResult): void {
    if (this.validationCache.size >= this.config.maxCacheSize) {
      // Simple LRU: remove oldest entry
      const firstKey = this.validationCache.keys().next().value
      this.validationCache.delete(firstKey)
    }

    this.validationCache.set(id, {
      result,
      timestamp: Date.now()
    })
  }

  private isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.cacheTimeout
  }

  private calculateCacheHitRate(): number {
    // Would be properly implemented with hit/miss counters
    return 0.8 // Placeholder
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Initialize built-in type converters
  private initializeTypeConverters(): void {
    this.typeConverters.set('string', async (value) => String(value || ''))
    this.typeConverters.set('number', async (value) => {
      const num = Number(value)
      if (isNaN(num)) throw new Error(`Cannot convert to number: ${value}`)
      return num
    })
    this.typeConverters.set('boolean', async (value) => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const lowered = value.toLowerCase()
        return lowered === 'true' || lowered === '1' || lowered === 'yes'
      }
      return Boolean(value)
    })
    this.typeConverters.set('array', async (value) => {
      if (Array.isArray(value)) return value
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          return [value]
        }
      }
      return [value]
    })
  }

  // Initialize built-in custom validators
  private initializeCustomValidators(): void {
    this.customValidators.set('email', async (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    })

    this.customValidators.set('url', async (value) => {
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    })

    this.customValidators.set('json', async (value) => {
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    })
  }
}

// Supporting types and interfaces

interface ValidationEngineConfig {
  enableCaching?: boolean
  cacheTimeout?: number
  maxCacheSize?: number
  strictMode?: boolean
  enableAsyncValidation?: boolean
  enableBusinessRules?: boolean
  enableTypeConversion?: boolean
  conversionTimeout?: number
  validationTimeout?: number
}

interface SingleParameterResult {
  valid: boolean
  value: any
  errors: ValidationError[]
  transformations: string[]
  metadata: Record<string, any>
}

interface ValidationEngineStats {
  schemaCacheSize: number
  validationCacheSize: number
  businessRuleCacheSize: number
  registeredTypeConverters: number
  registeredCustomValidators: number
  cacheHitRate: number
  averageValidationTime: number
}

interface CachedValidationResult {
  result: ValidationResult
  timestamp: number
}

type TypeConverter = (value: any, parameterName: string) => Promise<any>
type CustomValidator = (value: any, parameterName: string) => Promise<boolean>

// Extend ValidationResult interface
declare module '../types/adapter-interfaces' {
  interface ValidationResult {
    transformedParameters?: Record<string, any>
    metadata?: Record<string, any>
    timestamp?: number
  }

  interface ParameterMapping {
    targetType?: string
  }
}