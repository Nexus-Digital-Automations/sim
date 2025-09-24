/**
 * Template Engine - Core Template Processing System
 * =================================================
 *
 * The template engine is responsible for processing workflow templates,
 * applying parameter substitutions, handling inheritance and mixins,
 * and generating the final workflow configurations for journey conversion.
 */

import { z } from 'zod'
import {
  WorkflowTemplate,
  TemplateParameter,
  ParameterValidation,
  ValidationContext,
  ValidationResult,
  ConditionalExpression,
  ParameterMapping,
  ComputationRule,
  TransformationRule,
  TemplateMixin,
  TemplateOverrides,
} from '../types/template-types'

export class TemplateEngine {
  private readonly validationCache = new Map<string, ValidationResult>()
  private readonly computationCache = new Map<string, any>()

  /**
   * Process a template with given parameters
   */
  async processTemplate(
    template: WorkflowTemplate,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<ProcessedTemplate> {
    const startTime = Date.now()

    try {
      // Step 1: Validate parameters
      const validationResult = await this.validateParameters(template, parameters, context)
      if (!validationResult.isValid) {
        throw new TemplateProcessingError('Parameter validation failed', validationResult.errors)
      }

      // Step 2: Apply inheritance and mixins
      const inheritedTemplate = await this.applyInheritance(template, context)

      // Step 3: Process parameter mappings
      const processedData = await this.processParameterMappings(
        inheritedTemplate.workflowData,
        parameters,
        context
      )

      // Step 4: Evaluate conditional blocks and content
      const finalData = await this.evaluateConditionals(processedData, parameters, context)

      // Step 5: Apply optimizations
      const optimizedData = await this.applyOptimizations(finalData, context)

      const processingTime = Date.now() - startTime

      return {
        template: inheritedTemplate,
        processedData: optimizedData,
        appliedParameters: parameters,
        validationResult,
        processingTime,
        metadata: {
          processedAt: new Date(),
          version: template.version,
          contextId: context.contextId,
        },
      }
    } catch (error) {
      throw new TemplateProcessingError(
        `Failed to process template ${template.id}: ${error.message}`,
        [],
        error
      )
    }
  }

  /**
   * Validate template parameters against their definitions
   */
  async validateParameters(
    template: WorkflowTemplate,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<ValidationResult> {
    const cacheKey = this.generateValidationCacheKey(template.id, parameters, context)

    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!
    }

    const validationContext: ValidationContext = {
      templateId: template.id,
      workspaceId: template.workspaceId,
      userId: context.userId,
      agentId: context.agentId,
      existingParameters: parameters,
      environment: context.environment || 'production',
    }

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate each template parameter
    for (const param of template.parameters) {
      const value = parameters[param.name]
      const paramResult = await this.validateParameter(param, value, validationContext)

      errors.push(...paramResult.errors)
      warnings.push(...paramResult.warnings)
    }

    // Check for required parameters
    const requiredParams = template.parameters.filter(p => p.required)
    for (const param of requiredParams) {
      if (!(param.name in parameters) || parameters[param.name] == null) {
        errors.push({
          code: 'REQUIRED_PARAMETER_MISSING',
          message: `Required parameter '${param.name}' is missing`,
          path: param.name,
          context: { parameterId: param.id },
        })
      }
    }

    // Check for unexpected parameters
    const expectedParams = new Set(template.parameters.map(p => p.name))
    for (const paramName of Object.keys(parameters)) {
      if (!expectedParams.has(paramName)) {
        warnings.push({
          code: 'UNEXPECTED_PARAMETER',
          message: `Unexpected parameter '${paramName}' provided`,
          path: paramName,
          suggestion: 'Remove this parameter or add it to the template definition',
        })
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    }

    this.validationCache.set(cacheKey, result)
    return result
  }

  /**
   * Validate a single parameter
   */
  private async validateParameter(
    param: TemplateParameter,
    value: any,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Handle null/undefined values
    if (value == null) {
      if (param.required) {
        errors.push({
          code: 'REQUIRED_VALUE_MISSING',
          message: `Required value for parameter '${param.name}' is missing`,
          path: param.name,
        })
      } else if (param.defaultValue != null) {
        // Use default value
        value = param.defaultValue
      }
      return { isValid: errors.length === 0, errors, warnings }
    }

    // Type validation
    const typeValidation = this.validateParameterType(param, value)
    if (!typeValidation.isValid) {
      errors.push(...typeValidation.errors)
      return { isValid: false, errors, warnings }
    }

    // Specific validation rules
    if (param.validation) {
      const validationResult = await this.applyValidationRules(param.validation, value, context)
      errors.push(...validationResult.errors)
      warnings.push(...validationResult.warnings)
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(param: TemplateParameter, value: any): ValidationResult {
    const errors: ValidationError[] = []

    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            code: 'TYPE_MISMATCH',
            message: `Expected string for parameter '${param.name}', got ${typeof value}`,
            path: param.name,
          })
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            code: 'TYPE_MISMATCH',
            message: `Expected number for parameter '${param.name}', got ${typeof value}`,
            path: param.name,
          })
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            code: 'TYPE_MISMATCH',
            message: `Expected boolean for parameter '${param.name}', got ${typeof value}`,
            path: param.name,
          })
        }
        break

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            code: 'TYPE_MISMATCH',
            message: `Expected array for parameter '${param.name}', got ${typeof value}`,
            path: param.name,
          })
        }
        break

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push({
            code: 'TYPE_MISMATCH',
            message: `Expected object for parameter '${param.name}', got ${typeof value}`,
            path: param.name,
          })
        }
        break

      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value)
          } else if (typeof value !== 'object') {
            throw new Error('Not a valid JSON value')
          }
        } catch {
          errors.push({
            code: 'INVALID_JSON',
            message: `Invalid JSON for parameter '${param.name}'`,
            path: param.name,
          })
        }
        break
    }

    return { isValid: errors.length === 0, errors, warnings: [] }
  }

  /**
   * Apply validation rules to a parameter value
   */
  private async applyValidationRules(
    validation: ParameterValidation,
    value: any,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push({
          code: 'MIN_LENGTH_VIOLATION',
          message: `Value length ${value.length} is less than minimum ${validation.minLength}`,
        })
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push({
          code: 'MAX_LENGTH_VIOLATION',
          message: `Value length ${value.length} exceeds maximum ${validation.maxLength}`,
        })
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern)
        if (!regex.test(value)) {
          errors.push({
            code: 'PATTERN_MISMATCH',
            message: `Value does not match required pattern: ${validation.pattern}`,
          })
        }
      }

      if (validation.format) {
        const formatValidation = this.validateFormat(value, validation.format)
        if (!formatValidation.isValid) {
          errors.push(...formatValidation.errors)
        }
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          code: 'MIN_VALUE_VIOLATION',
          message: `Value ${value} is less than minimum ${validation.min}`,
        })
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          code: 'MAX_VALUE_VIOLATION',
          message: `Value ${value} exceeds maximum ${validation.max}`,
        })
      }

      if (validation.multipleOf && value % validation.multipleOf !== 0) {
        errors.push({
          code: 'MULTIPLE_OF_VIOLATION',
          message: `Value ${value} is not a multiple of ${validation.multipleOf}`,
        })
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (validation.minItems && value.length < validation.minItems) {
        errors.push({
          code: 'MIN_ITEMS_VIOLATION',
          message: `Array length ${value.length} is less than minimum ${validation.minItems}`,
        })
      }

      if (validation.maxItems && value.length > validation.maxItems) {
        errors.push({
          code: 'MAX_ITEMS_VIOLATION',
          message: `Array length ${value.length} exceeds maximum ${validation.maxItems}`,
        })
      }

      if (validation.uniqueItems) {
        const uniqueItems = new Set(value.map(item => JSON.stringify(item)))
        if (uniqueItems.size !== value.length) {
          errors.push({
            code: 'UNIQUE_ITEMS_VIOLATION',
            message: 'Array contains duplicate items',
          })
        }
      }
    }

    // Enum validations
    if (validation.options) {
      const validOptions = validation.options.map(opt => opt.value)
      if (!validOptions.some(opt => this.deepEqual(opt, value))) {
        errors.push({
          code: 'INVALID_OPTION',
          message: `Value is not one of the allowed options: ${validOptions.join(', ')}`,
        })
      }
    }

    // Custom validation
    if (validation.customValidator) {
      try {
        const customResult = await validation.customValidator(value, context)
        errors.push(...customResult.errors)
        warnings.push(...customResult.warnings)
      } catch (error) {
        errors.push({
          code: 'CUSTOM_VALIDATION_ERROR',
          message: `Custom validation failed: ${error.message}`,
        })
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Apply template inheritance and mixins
   */
  private async applyInheritance(
    template: WorkflowTemplate,
    context: ProcessingContext
  ): Promise<WorkflowTemplate> {
    let processedTemplate = { ...template }

    // Apply parent template if exists
    if (template.parentTemplateId) {
      const parentTemplate = await this.loadTemplate(template.parentTemplateId, context)
      processedTemplate = this.mergeTemplates(parentTemplate, processedTemplate)
    }

    // Apply mixins
    for (const mixinId of template.mixins) {
      const mixin = await this.loadMixin(mixinId, context)
      processedTemplate = this.applyMixin(processedTemplate, mixin)
    }

    // Apply overrides
    if (template.overrides) {
      processedTemplate = this.applyOverrides(processedTemplate, template.overrides)
    }

    return processedTemplate
  }

  /**
   * Process parameter mappings in workflow data
   */
  private async processParameterMappings(
    workflowData: any,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<any> {
    const result = JSON.parse(JSON.stringify(workflowData)) // Deep clone

    if (workflowData.parameterMappings) {
      for (const mapping of workflowData.parameterMappings) {
        const value = await this.resolveParameterValue(mapping, parameters, context)
        this.setValueAtPath(result, mapping.targetPath, value)
      }
    }

    // Process blocks
    if (result.blocks) {
      for (const block of result.blocks) {
        if (block.parameterBindings) {
          for (const binding of block.parameterBindings) {
            const value = await this.resolveParameterBinding(binding, parameters, context)
            this.setValueAtPath(block, binding.propertyPath, value)
          }
        }
      }
    }

    return result
  }

  /**
   * Evaluate conditional expressions and dynamic content
   */
  private async evaluateConditionals(
    workflowData: any,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<any> {
    const result = { ...workflowData }

    // Evaluate conditional blocks
    if (result.conditionalBlocks) {
      const activeBlocks = new Set<string>()
      const activeEdges = new Set<string>()

      for (const conditionalBlock of result.conditionalBlocks) {
        const shouldActivate = await this.evaluateCondition(
          conditionalBlock.condition,
          parameters,
          context
        )

        if (shouldActivate) {
          conditionalBlock.blocksToShow?.forEach(blockId => activeBlocks.add(blockId))
          conditionalBlock.edgesToActivate?.forEach(edgeId => activeEdges.add(edgeId))
        } else {
          conditionalBlock.blocksToHide?.forEach(blockId => activeBlocks.delete(blockId))
          conditionalBlock.edgesToDeactivate?.forEach(edgeId => activeEdges.delete(edgeId))
        }
      }

      // Filter blocks and edges based on conditions
      if (result.blocks) {
        result.blocks = result.blocks.filter((block: any) => {
          if (!block.conditionalVisibility) return true
          return this.evaluateCondition(block.conditionalVisibility, parameters, context)
        })
      }

      if (result.edges) {
        result.edges = result.edges.filter((edge: any) => {
          if (!edge.conditionalConnection) return true
          return this.evaluateCondition(edge.conditionalConnection, parameters, context)
        })
      }
    }

    // Process dynamic content
    if (result.dynamicContent) {
      for (const section of result.dynamicContent) {
        const content = await this.generateDynamicContent(section, parameters, context)
        // Apply generated content to result
        this.applyDynamicContent(result, section, content)
      }
    }

    return result
  }

  /**
   * Apply template optimizations
   */
  private async applyOptimizations(
    workflowData: any,
    context: ProcessingContext
  ): Promise<any> {
    let result = { ...workflowData }

    if (context.optimizationLevel === 'none') {
      return result
    }

    // Apply optimization hints
    if (workflowData.optimizationHints) {
      for (const hint of workflowData.optimizationHints) {
        if (this.shouldApplyOptimization(hint, context)) {
          result = await this.applyOptimizationHint(result, hint, context)
        }
      }
    }

    // Apply performance settings
    if (workflowData.performanceSettings) {
      result = this.applyPerformanceSettings(result, workflowData.performanceSettings)
    }

    return result
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateValidationCacheKey(
    templateId: string,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): string {
    const contextData = {
      templateId,
      userId: context.userId,
      agentId: context.agentId,
      environment: context.environment,
    }
    return JSON.stringify({ contextData, parameters })
  }

  private validateFormat(value: string, format: string): ValidationResult {
    const errors: ValidationError[] = []

    switch (format) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors.push({ code: 'INVALID_EMAIL', message: 'Invalid email format' })
        }
        break

      case 'url':
        try {
          new URL(value)
        } catch {
          errors.push({ code: 'INVALID_URL', message: 'Invalid URL format' })
        }
        break

      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(value)) {
          errors.push({ code: 'INVALID_UUID', message: 'Invalid UUID format' })
        }
        break

      case 'json':
        try {
          JSON.parse(value)
        } catch {
          errors.push({ code: 'INVALID_JSON', message: 'Invalid JSON format' })
        }
        break
    }

    return { isValid: errors.length === 0, errors, warnings: [] }
  }

  private deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  private async loadTemplate(templateId: string, context: ProcessingContext): Promise<WorkflowTemplate> {
    // Implementation would load template from database
    throw new Error('Template loading not implemented')
  }

  private async loadMixin(mixinId: string, context: ProcessingContext): Promise<TemplateMixin> {
    // Implementation would load mixin from database
    throw new Error('Mixin loading not implemented')
  }

  private mergeTemplates(parent: WorkflowTemplate, child: WorkflowTemplate): WorkflowTemplate {
    // Implementation would merge parent template with child
    return { ...parent, ...child }
  }

  private applyMixin(template: WorkflowTemplate, mixin: TemplateMixin): WorkflowTemplate {
    // Implementation would apply mixin to template
    return template
  }

  private applyOverrides(template: WorkflowTemplate, overrides: TemplateOverrides): WorkflowTemplate {
    // Implementation would apply overrides to template
    return template
  }

  private async resolveParameterValue(
    mapping: ParameterMapping,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<any> {
    let value = parameters[mapping.parameterId]

    if (mapping.transformation) {
      value = await this.applyTransformation(value, mapping.transformation, context)
    }

    return value
  }

  private async resolveParameterBinding(
    binding: any,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<any> {
    // Implementation would resolve parameter binding
    return parameters[binding.parameterId]
  }

  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current)) {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }

  private async evaluateCondition(
    condition: ConditionalExpression,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<boolean> {
    // Implementation would evaluate conditional expression
    return true
  }

  private async generateDynamicContent(
    section: any,
    parameters: Record<string, any>,
    context: ProcessingContext
  ): Promise<any> {
    // Implementation would generate dynamic content
    return {}
  }

  private applyDynamicContent(workflowData: any, section: any, content: any): void {
    // Implementation would apply dynamic content to workflow data
  }

  private shouldApplyOptimization(hint: any, context: ProcessingContext): boolean {
    return context.optimizationLevel !== 'none'
  }

  private async applyOptimizationHint(
    workflowData: any,
    hint: any,
    context: ProcessingContext
  ): Promise<any> {
    // Implementation would apply optimization hint
    return workflowData
  }

  private applyPerformanceSettings(workflowData: any, settings: any): any {
    // Implementation would apply performance settings
    return workflowData
  }

  private async applyTransformation(
    value: any,
    transformation: TransformationRule,
    context: ProcessingContext
  ): Promise<any> {
    switch (transformation.type) {
      case 'direct':
        return value

      case 'computed':
        if (transformation.expression) {
          return await this.evaluateExpression(transformation.expression, { value }, context)
        }
        return value

      case 'lookup':
        if (transformation.lookupTable && value in transformation.lookupTable) {
          return transformation.lookupTable[value]
        }
        return transformation.defaultValue || value

      case 'format':
        if (transformation.formatString) {
          return transformation.formatString.replace('{value}', String(value))
        }
        return value

      default:
        return value
    }
  }

  private async evaluateExpression(
    expression: string,
    variables: Record<string, any>,
    context: ProcessingContext
  ): Promise<any> {
    // Implementation would safely evaluate expression
    return variables.value
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ProcessingContext {
  contextId: string
  workspaceId: string
  userId?: string
  agentId?: string
  environment?: 'development' | 'production' | 'test'
  optimizationLevel: 'none' | 'basic' | 'aggressive'
  cacheEnabled: boolean
  validationEnabled: boolean
}

export interface ProcessedTemplate {
  template: WorkflowTemplate
  processedData: any
  appliedParameters: Record<string, any>
  validationResult: ValidationResult
  processingTime: number
  metadata: {
    processedAt: Date
    version: string
    contextId: string
  }
}

export interface ValidationError {
  code: string
  message: string
  path?: string
  context?: Record<string, any>
}

export interface ValidationWarning {
  code: string
  message: string
  path?: string
  suggestion?: string
}

export class TemplateProcessingError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: ValidationError[],
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'TemplateProcessingError'
  }
}