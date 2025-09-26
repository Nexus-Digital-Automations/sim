/**
 * Universal Tool Adapter - Parameter Mapping System
 *
 * Sophisticated parameter transformation engine that converts conversational
 * Parlant parameters into specific Sim tool parameter formats while preserving
 * context, validation, and type safety.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

import type { z } from 'zod'
import { ValidationError } from '../errors/adapter-errors'
import type {
  ContextualValue,
  MappingRule,
  MappingTransformation,
  ParameterMapping,
  ValidationConfig,
} from '../types/adapter-interfaces'
import type { ParlantExecutionContext } from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'

const logger = createLogger('ParameterMapper')

/**
 * Parameter transformation functions
 * These handle the actual conversion between different parameter formats
 */
export type TransformationFunction<TInput = any, TOutput = any> = (
  value: TInput,
  context: ParlantExecutionContext,
  mapping: ParameterMapping
) => Promise<TOutput> | TOutput

/**
 * Built-in transformation functions for common conversions
 */
export class ParameterTransformations {
  /**
   * Direct value mapping - no transformation
   */
  static direct: TransformationFunction = (value) => value

  /**
   * String transformations
   */
  static string = {
    toLowerCase: (value: string) => value.toLowerCase(),
    toUpperCase: (value: string) => value.toUpperCase(),
    trim: (value: string) => value.trim(),
    slugify: (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),

    /**
     * Template string replacement using context values
     */
    template: (template: string, context: ParlantExecutionContext) => {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const contextValue = (context.variables as any)?.[key] || (context as any)[key]
        return contextValue ? String(contextValue) : match
      })
    },
  }

  /**
   * Number transformations
   */
  static number = {
    round: (value: number) => Math.round(value),
    floor: (value: number) => Math.floor(value),
    ceil: (value: number) => Math.ceil(value),
    abs: (value: number) => Math.abs(value),

    /**
     * Clamp number to range
     */
    clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
  }

  /**
   * Array transformations
   */
  static array = {
    join: (array: any[], separator = ',') => array.join(separator),
    first: (array: any[]) => array[0],
    last: (array: any[]) => array[array.length - 1],
    unique: (array: any[]) => [...new Set(array)],
    filter: (array: any[], predicate: (item: any) => boolean) => array.filter(predicate),
  }

  /**
   * Object transformations
   */
  static object = {
    pick: (obj: Record<string, any>, keys: string[]) =>
      Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))),

    omit: (obj: Record<string, any>, keys: string[]) =>
      Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key))),

    flatten: (obj: Record<string, any>, prefix = ''): Record<string, any> => {
      return Object.entries(obj).reduce(
        (acc, [key, value]) => {
          const newKey = prefix ? `${prefix}.${key}` : key

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(acc, ParameterTransformations.object.flatten(value, newKey))
          } else {
            acc[newKey] = value
          }

          return acc
        },
        {} as Record<string, any>
      )
    },
  }

  /**
   * Context-aware transformations
   */
  static contextual = {
    /**
     * Extract workspace ID from context
     */
    workspaceId: (value: any, context: ParlantExecutionContext) => context.workspaceId,

    /**
     * Extract user ID from context
     */
    userId: (value: any, context: ParlantExecutionContext) => context.userId,

    /**
     * Extract session ID from context
     */
    sessionId: (value: any, context: ParlantExecutionContext) => context.sessionId,

    /**
     * Extract agent ID from context
     */
    agentId: (value: any, context: ParlantExecutionContext) => context.agentId,

    /**
     * Get current timestamp
     */
    timestamp: () => new Date().toISOString(),

    /**
     * Generate UUID
     */
    uuid: () => crypto.randomUUID(),
  }

  /**
   * Validation transformations
   */
  static validation = {
    /**
     * Ensure required field has a value
     */
    required: (value: any) => {
      if (value === null || value === undefined || value === '') {
        throw new ValidationError('Required field is missing')
      }
      return value
    },

    /**
     * Provide default value if missing
     */
    default: (value: any, defaultValue: any) =>
      value !== null && value !== undefined ? value : defaultValue,

    /**
     * Validate against schema
     */
    schema: (value: any, schema: z.ZodSchema) => {
      try {
        return schema.parse(value)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new ValidationError(`Schema validation failed: ${errorMessage}`)
      }
    },
  }
}

/**
 * Parameter Mapping Engine
 *
 * Handles the conversion of parameters between Parlant and Sim formats
 * using configurable mapping rules and transformation functions.
 */
export class ParameterMapper {
  private readonly mappings: Map<string, ParameterMapping>
  private readonly transformations: Map<string, TransformationFunction>

  constructor(mappings: ParameterMapping[] = []) {
    this.mappings = new Map(mappings.map((m) => [m.parlantParameter, m]))
    this.transformations = new Map()

    // Register built-in transformations
    this.registerBuiltinTransformations()

    logger.info(`Parameter mapper initialized with ${mappings.length} mappings`)
  }

  /**
   * Register built-in transformation functions
   */
  private registerBuiltinTransformations(): void {
    // Direct transformations
    this.transformations.set('direct', ParameterTransformations.direct)

    // String transformations
    Object.entries(ParameterTransformations.string).forEach(([name, fn]) => {
      this.transformations.set(`string.${name}`, fn)
    })

    // Number transformations
    Object.entries(ParameterTransformations.number).forEach(([name, fn]) => {
      this.transformations.set(`number.${name}`, fn as TransformationFunction)
    })

    // Array transformations
    Object.entries(ParameterTransformations.array).forEach(([name, fn]) => {
      this.transformations.set(`array.${name}`, fn as TransformationFunction)
    })

    // Object transformations
    Object.entries(ParameterTransformations.object).forEach(([name, fn]) => {
      this.transformations.set(`object.${name}`, fn as unknown as TransformationFunction)
    })

    // Contextual transformations
    Object.entries(ParameterTransformations.contextual).forEach(([name, fn]) => {
      this.transformations.set(`contextual.${name}`, fn)
    })

    // Validation transformations
    Object.entries(ParameterTransformations.validation).forEach(([name, fn]) => {
      this.transformations.set(`validation.${name}`, fn as TransformationFunction)
    })
  }

  /**
   * Register custom transformation function
   */
  public registerTransformation(name: string, transformation: TransformationFunction): void {
    this.transformations.set(name, transformation)
    logger.debug(`Registered custom transformation: ${name}`)
  }

  /**
   * Map Parlant parameters to Sim parameters
   *
   * This is the main mapping function that processes all parameter conversions
   * according to the configured mapping rules.
   */
  public async mapParlantToSim(
    parlantArgs: Record<string, any>,
    context: ParlantExecutionContext,
    additionalMappings: ParameterMapping[] = []
  ): Promise<Record<string, any>> {
    const startTime = Date.now()
    const allMappings = new Map([
      ...Array.from(this.mappings.entries()),
      ...additionalMappings.map((m) => [m.parlantParameter, m] as [string, ParameterMapping]),
    ])

    logger.debug(`Starting parameter mapping`, {
      parlantParameterCount: Object.keys(parlantArgs).length,
      mappingRuleCount: allMappings.size,
      contextType: context.type,
    })

    const simArgs: Record<string, any> = {}
    const errors: Array<{ parameter: string; error: string }> = []

    // Process each mapping rule
    for (const [parlantParam, mapping] of allMappings) {
      try {
        const value = await this.applyParameterMapping(parlantParam as string, mapping, parlantArgs, context)

        if (value !== undefined) {
          // Handle nested parameter paths
          this.setNestedValue(simArgs, mapping.simParameter, value)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown mapping error'
        logger.warn(`Parameter mapping failed`, {
          parlantParameter: parlantParam,
          simParameter: mapping.simParameter,
          error: errorMsg,
        })

        errors.push({
          parameter: parlantParam as string,
          error: errorMsg,
        })
      }
    }

    // Handle unmapped parameters (if configured to pass through)
    for (const [key, value] of Object.entries(parlantArgs)) {
      if (!allMappings.has(key) && !Object.hasOwn(simArgs, key)) {
        // Check if this should be passed through directly
        if (this.shouldPassThrough(key, value, context)) {
          simArgs[key] = value
        }
      }
    }

    // Throw validation error if there were mapping errors
    if (errors.length > 0) {
      throw new ValidationError(
        'Parameter mapping failed',
        errors.map((e) => ({
          field: e.parameter,
          message: e.error,
          code: 'mapping_error',
        }))
      )
    }

    const duration = Date.now() - startTime
    logger.debug(`Parameter mapping completed`, {
      duration,
      mappedParameterCount: Object.keys(simArgs).length,
      errorCount: errors.length,
    })

    return simArgs
  }

  /**
   * Apply a single parameter mapping transformation
   */
  private async applyParameterMapping(
    parlantParam: string,
    mapping: ParameterMapping,
    parlantArgs: Record<string, any>,
    context: ParlantExecutionContext
  ): Promise<any> {
    // Get the source value
    let value = this.getNestedValue(parlantArgs, parlantParam)

    // Handle conditional mappings
    if (mapping.conditions && !this.evaluateConditions(mapping.conditions, parlantArgs, context)) {
      return mapping.defaultValue
    }

    // Handle contextual values
    if (mapping.contextualValue) {
      value = this.resolveContextualValue(mapping.contextualValue, context, value)
    }

    // Apply transformations
    if (mapping.transformations && mapping.transformations.length > 0) {
      for (const transformation of mapping.transformations) {
        value = await this.applyTransformation(transformation, value, context, mapping)
      }
    }

    // Apply validation
    if (mapping.validation) {
      value = await this.applyValidation(mapping.validation, value, parlantParam)
    }

    return value
  }

  /**
   * Apply a single transformation to a value
   */
  private async applyTransformation(
    transformation: MappingTransformation,
    value: any,
    context: ParlantExecutionContext,
    mapping: ParameterMapping
  ): Promise<any> {
    const transformFn = this.transformations.get(transformation.type)
    if (!transformFn) {
      throw new Error(`Unknown transformation type: ${transformation.type}`)
    }

    try {
      // Call transformation function with parameters
      const result = await transformFn(value, context, mapping)

      logger.debug(`Applied transformation`, {
        type: transformation.type,
        hasValue: value !== undefined,
        hasResult: result !== undefined,
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Transformation '${transformation.type}' failed: ${errorMessage}`)
    }
  }

  /**
   * Apply validation to a transformed value
   */
  private async applyValidation(
    validation: ValidationConfig,
    value: any,
    parameterName: string
  ): Promise<any> {
    // Required field validation
    if (validation.required && (value === null || value === undefined || value === '')) {
      throw new ValidationError(`Required parameter '${parameterName}' is missing`)
    }

    // Type validation
    if (validation.type && value !== null && value !== undefined) {
      const actualType = typeof value
      const expectedTypes = Array.isArray(validation.type) ? validation.type : [validation.type]

      if (!expectedTypes.includes(actualType)) {
        throw new ValidationError(
          `Parameter '${parameterName}' expected type ${expectedTypes.join('|')} but got ${actualType}`
        )
      }
    }

    // Schema validation
    if (validation.schema && value !== null && value !== undefined) {
      try {
        return validation.schema.parse(value)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new ValidationError(
          `Parameter '${parameterName}' schema validation failed: ${errorMessage}`
        )
      }
    }

    // Custom validation function
    if (validation.custom) {
      try {
        const result = await validation.custom(value, parameterName)
        if (result !== true && typeof result === 'string') {
          throw new ValidationError(result)
        }
        return value
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new ValidationError(
          `Parameter '${parameterName}' custom validation failed: ${errorMessage}`
        )
      }
    }

    return value
  }

  /**
   * Evaluate conditional mapping rules
   */
  private evaluateConditions(
    conditions: MappingRule[],
    parlantArgs: Record<string, any>,
    context: ParlantExecutionContext
  ): boolean {
    return conditions.every((condition) => {
      const contextValue = condition.contextField
        ? this.getNestedValue(context as any, condition.contextField)
        : this.getNestedValue(parlantArgs, condition.field)

      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value
        case 'not_equals':
          return contextValue !== condition.value
        case 'exists':
          return contextValue !== null && contextValue !== undefined
        case 'not_exists':
          return contextValue === null || contextValue === undefined
        case 'contains':
          return Array.isArray(contextValue) && contextValue.includes(condition.value)
        case 'matches':
          return typeof contextValue === 'string' && new RegExp(condition.value).test(contextValue)
        default:
          logger.warn(`Unknown condition operator: ${condition.operator}`)
          return true
      }
    })
  }

  /**
   * Resolve contextual values from execution context
   */
  private resolveContextualValue(
    contextualValue: ContextualValue,
    context: ParlantExecutionContext,
    originalValue?: any
  ): any {
    switch (contextualValue.source) {
      case 'context':
        return this.getNestedValue(context as any, contextualValue.path || '')

      case 'user':
        return context.userId

      case 'workspace':
        return context.workspaceId

      case 'session':
        return context.sessionId

      case 'agent':
        return context.agentId

      case 'timestamp':
        return new Date().toISOString()

      case 'uuid':
        return crypto.randomUUID()

      case 'original':
        return originalValue

      case 'constant':
        return contextualValue.value

      case 'computed':
        // Execute computed function if provided
        return contextualValue.compute?.(context, originalValue) || contextualValue.value

      default:
        logger.warn(`Unknown contextual value source: ${contextualValue.source}`)
        return contextualValue.value
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!

    const target = keys.reduce((current, key) => {
      if (current[key] === undefined || current[key] === null) {
        current[key] = {}
      }
      return current[key]
    }, obj)

    target[lastKey] = value
  }

  /**
   * Determine if unmapped parameter should be passed through
   */
  private shouldPassThrough(key: string, value: any, context: ParlantExecutionContext): boolean {
    // Skip system parameters
    const systemParams = ['__context', '__metadata', '__parlant']
    if (systemParams.some((param) => key.startsWith(param))) {
      return false
    }

    // Skip complex objects that likely need transformation
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return false
    }

    // Pass through simple values
    return true
  }

  // Utility methods for testing and debugging

  /**
   * Test a single parameter mapping without full execution
   */
  public async testMapping(
    parlantParameter: string,
    value: any,
    context: ParlantExecutionContext
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const mapping = this.mappings.get(parlantParameter)
    if (!mapping) {
      return { success: false, error: `No mapping found for parameter: ${parlantParameter}` }
    }

    try {
      const result = await this.applyParameterMapping(
        parlantParameter,
        mapping,
        { [parlantParameter]: value },
        context
      )

      return { success: true, result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get mapping configuration for a parameter
   */
  public getMapping(parlantParameter: string): ParameterMapping | undefined {
    return this.mappings.get(parlantParameter)
  }

  /**
   * Get all configured mappings
   */
  public getAllMappings(): ParameterMapping[] {
    return Array.from(this.mappings.values())
  }

  /**
   * Add or update a parameter mapping
   */
  public setMapping(mapping: ParameterMapping): void {
    this.mappings.set(mapping.parlantParameter, mapping)
    logger.debug(`Updated mapping for parameter: ${mapping.parlantParameter}`)
  }

  /**
   * Remove a parameter mapping
   */
  public removeMapping(parlantParameter: string): boolean {
    const deleted = this.mappings.delete(parlantParameter)
    if (deleted) {
      logger.debug(`Removed mapping for parameter: ${parlantParameter}`)
    }
    return deleted
  }
}
