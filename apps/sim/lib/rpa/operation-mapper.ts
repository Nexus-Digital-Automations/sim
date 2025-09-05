/**
 * RPA Operation Mapper
 * 
 * Maps ReactFlow RPA block parameters to Desktop Agent operations and handles
 * parameter transformation, validation, and optimization. Provides seamless
 * integration between Sim workflow blocks and agent execution.
 * 
 * Features:
 * - Block parameter mapping to agent operations
 * - Parameter validation and transformation
 * - Variable substitution and templating
 * - Operation optimization and batching
 * - Error handling and diagnostics
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { 
  RPAOperation,
  RPAClickOperation,
  RPATypeOperation,
  RPAExtractOperation,
  RPAScreenshotOperation,
  RPAWaitOperation,
  RPAFindElementOperation,
  RPAOperationType
} from '@/types/rpa'
import { z } from 'zod'

const logger = createLogger('RPAOperationMapper')

/**
 * Variable substitution patterns
 */
const VARIABLE_PATTERN = /\$\{([^}]+)\}/g
const LEGACY_VARIABLE_PATTERN = /\%([^%]+)\%/g

/**
 * Default operation timeouts by type (in milliseconds)
 */
const DEFAULT_TIMEOUTS: Record<RPAOperationType, number> = {
  'click': 15000,        // 15 seconds
  'type': 30000,         // 30 seconds
  'extract': 20000,      // 20 seconds
  'screenshot': 10000,   // 10 seconds
  'wait': 60000,         // 60 seconds (special case)
  'find-element': 25000  // 25 seconds
}

/**
 * Default retry counts by operation type
 */
const DEFAULT_RETRIES: Record<RPAOperationType, number> = {
  'click': 3,
  'type': 2,
  'extract': 2,
  'screenshot': 1,
  'wait': 1,
  'find-element': 3
}

/**
 * Parameter validation schemas for runtime checking
 */
const parameterSchemas = {
  click: z.object({
    clickType: z.enum(['left_click', 'right_click', 'double_click', 'middle_click']),
    targetingMethod: z.enum(['coordinates', 'image_recognition', 'ocr_text']),
    coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
    templateImage: z.string().optional(),
    ocrText: z.string().optional(),
    imageConfidenceThreshold: z.number().min(0.1).max(1.0).optional(),
    ocrConfidenceThreshold: z.number().min(0.1).max(1.0).optional(),
    ocrLanguage: z.string().optional(),
    postClickDelay: z.number().min(0).max(10000).optional(),
    captureScreenshot: z.boolean().optional()
  }),
  
  type: z.object({
    text: z.string().min(1),
    targetingMethod: z.enum(['active_element', 'coordinates', 'image_recognition', 'ocr_text']).optional(),
    coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
    templateImage: z.string().optional(),
    ocrText: z.string().optional(),
    typingSpeed: z.number().min(50).max(2000).optional(),
    humanTyping: z.boolean().optional(),
    clearFirst: z.boolean().optional(),
    pressEnterAfter: z.boolean().optional()
  })
}

/**
 * Operation Mapper Class
 * Handles mapping between ReactFlow blocks and Desktop Agent operations
 */
export class RPAOperationMapper {
  private variables: Record<string, any> = {}
  private context: Record<string, any> = {}

  constructor(variables?: Record<string, any>, context?: Record<string, any>) {
    this.variables = variables || {}
    this.context = context || {}
  }

  /**
   * Map ReactFlow block to RPA operation
   */
  mapBlockToOperation(
    blockData: any,
    operationId: string,
    agentId: string,
    workflowId?: string,
    executionId?: string
  ): RPAOperation {
    logger.debug('Mapping block to operation', {
      blockType: blockData.type,
      operationId,
      agentId,
      hasParameters: !!blockData.parameters
    })

    // Base operation properties
    const baseOperation = {
      id: operationId,
      agentId,
      workflowId,
      executionId,
      status: 'pending' as const,
      priority: blockData.priority || 'normal' as const,
      timeout: blockData.timeout || DEFAULT_TIMEOUTS[blockData.type as RPAOperationType],
      maxRetries: blockData.maxRetries || DEFAULT_RETRIES[blockData.type as RPAOperationType],
      retryDelay: blockData.retryDelay || 1000,
      createdAt: new Date()
    }

    // Map parameters based on operation type
    const parameters = this.mapParameters(blockData.type, blockData.parameters || {})

    // Create typed operation based on type
    switch (blockData.type) {
      case 'click':
        return {
          ...baseOperation,
          type: 'click',
          parameters
        } as RPAClickOperation

      case 'type':
        return {
          ...baseOperation,
          type: 'type', 
          parameters
        } as RPATypeOperation

      case 'extract':
        return {
          ...baseOperation,
          type: 'extract',
          parameters
        } as RPAExtractOperation

      case 'screenshot':
        return {
          ...baseOperation,
          type: 'screenshot',
          parameters
        } as RPAScreenshotOperation

      case 'wait':
        return {
          ...baseOperation,
          type: 'wait',
          parameters,
          // Wait operations often need longer timeouts
          timeout: blockData.timeout || parameters.maxWaitTime || DEFAULT_TIMEOUTS.wait
        } as RPAWaitOperation

      case 'find-element':
        return {
          ...baseOperation,
          type: 'find-element',
          parameters
        } as RPAFindElementOperation

      default:
        throw new Error(`Unsupported operation type: ${blockData.type}`)
    }
  }

  /**
   * Map multiple blocks to operations (for workflow execution)
   */
  mapBlocksToOperations(
    blocks: any[],
    agentId: string,
    workflowId: string,
    executionId: string
  ): RPAOperation[] {
    return blocks.map((block, index) => {
      const operationId = `${executionId}-op-${index + 1}`
      return this.mapBlockToOperation(block, operationId, agentId, workflowId, executionId)
    })
  }

  /**
   * Map and validate parameters for specific operation type
   */
  mapParameters(operationType: string, rawParameters: any): any {
    // Apply variable substitution
    const processedParameters = this.substituteVariables(rawParameters)
    
    // Apply operation-specific transformations
    const transformedParameters = this.transformParameters(operationType, processedParameters)
    
    // Validate parameters
    const validatedParameters = this.validateParameters(operationType, transformedParameters)
    
    logger.debug('Parameters mapped and validated', {
      operationType,
      originalKeys: Object.keys(rawParameters),
      finalKeys: Object.keys(validatedParameters)
    })

    return validatedParameters
  }

  /**
   * Substitute variables in parameter values
   */
  substituteVariables(obj: any): any {
    if (typeof obj === 'string') {
      return this.substituteStringVariables(obj)
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.substituteVariables(item))
    } else if (obj && typeof obj === 'object') {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteVariables(value)
      }
      return result
    }
    return obj
  }

  /**
   * Substitute variables in a string value
   */
  private substituteStringVariables(str: string): string {
    let result = str

    // Handle modern ${variable} syntax
    result = result.replace(VARIABLE_PATTERN, (match, varName) => {
      const value = this.getVariableValue(varName.trim())
      if (value !== undefined) {
        return String(value)
      }
      logger.warn('Variable not found for substitution', { variable: varName, string: str })
      return match // Keep original if variable not found
    })

    // Handle legacy %variable% syntax for backwards compatibility
    result = result.replace(LEGACY_VARIABLE_PATTERN, (match, varName) => {
      const value = this.getVariableValue(varName.trim())
      if (value !== undefined) {
        return String(value)
      }
      logger.warn('Legacy variable not found for substitution', { variable: varName, string: str })
      return match
    })

    return result
  }

  /**
   * Get variable value with support for nested properties
   */
  private getVariableValue(varName: string): any {
    // Support dot notation for nested properties (e.g., user.name)
    const parts = varName.split('.')
    let value = this.variables[parts[0]]

    // Traverse nested properties
    for (let i = 1; i < parts.length && value !== undefined; i++) {
      value = value[parts[i]]
    }

    // Fallback to context variables
    if (value === undefined) {
      value = this.context[parts[0]]
      for (let i = 1; i < parts.length && value !== undefined; i++) {
        value = value[parts[i]]
      }
    }

    return value
  }

  /**
   * Transform parameters for specific operation types
   */
  private transformParameters(operationType: string, parameters: any): any {
    switch (operationType) {
      case 'click':
        return this.transformClickParameters(parameters)
      case 'type':
        return this.transformTypeParameters(parameters)
      case 'extract':
        return this.transformExtractParameters(parameters)
      case 'screenshot':
        return this.transformScreenshotParameters(parameters)
      case 'wait':
        return this.transformWaitParameters(parameters)
      case 'find-element':
        return this.transformFindElementParameters(parameters)
      default:
        return parameters
    }
  }

  /**
   * Transform click-specific parameters
   */
  private transformClickParameters(params: any): any {
    const transformed = { ...params }

    // Ensure coordinates are numbers
    if (transformed.coordinates) {
      transformed.coordinates.x = Number(transformed.coordinates.x)
      transformed.coordinates.y = Number(transformed.coordinates.y)
    }

    // Set default confidence thresholds
    if (transformed.targetingMethod === 'image_recognition' && !transformed.imageConfidenceThreshold) {
      transformed.imageConfidenceThreshold = 0.8
    }
    if (transformed.targetingMethod === 'ocr_text' && !transformed.ocrConfidenceThreshold) {
      transformed.ocrConfidenceThreshold = 0.7
    }

    // Set default OCR language
    if (transformed.targetingMethod === 'ocr_text' && !transformed.ocrLanguage) {
      transformed.ocrLanguage = 'eng'
    }

    return transformed
  }

  /**
   * Transform type-specific parameters
   */
  private transformTypeParameters(params: any): any {
    const transformed = { ...params }

    // Ensure text is a string
    if (transformed.text !== undefined) {
      transformed.text = String(transformed.text)
    }

    // Set default typing speed if human typing is enabled
    if (transformed.humanTyping && !transformed.typingSpeed) {
      transformed.typingSpeed = 250 // Natural typing speed
    }

    // Set default targeting method
    if (!transformed.targetingMethod) {
      transformed.targetingMethod = 'active_element'
    }

    return transformed
  }

  /**
   * Transform extract-specific parameters
   */
  private transformExtractParameters(params: any): any {
    const transformed = { ...params }

    // Set default OCR language
    if (transformed.extractionMethod === 'ocr' && !transformed.ocrLanguage) {
      transformed.ocrLanguage = 'eng'
    }

    // Set default region mode
    if (!transformed.regionMode) {
      transformed.regionMode = 'fullscreen'
    }

    return transformed
  }

  /**
   * Transform screenshot-specific parameters
   */
  private transformScreenshotParameters(params: any): any {
    const transformed = { ...params }

    // Set default format
    if (!transformed.format) {
      transformed.format = 'png'
    }

    // Set default quality for JPEG
    if (transformed.format === 'jpeg' && !transformed.quality) {
      transformed.quality = 85
    }

    return transformed
  }

  /**
   * Transform wait-specific parameters
   */
  private transformWaitParameters(params: any): any {
    const transformed = { ...params }

    // Set default check interval
    if (!transformed.checkInterval) {
      transformed.checkInterval = 1000 // 1 second
    }

    // Ensure max wait time doesn't exceed operation timeout
    if (transformed.maxWaitTime && transformed.maxWaitTime > 300000) {
      transformed.maxWaitTime = 300000 // Cap at 5 minutes
    }

    return transformed
  }

  /**
   * Transform find-element-specific parameters
   */
  private transformFindElementParameters(params: any): any {
    const transformed = { ...params }

    // Set default confidence thresholds
    if (transformed.searchMethod === 'image_recognition' && !transformed.imageConfidenceThreshold) {
      transformed.imageConfidenceThreshold = 0.8
    }
    if (transformed.searchMethod === 'ocr_text' && !transformed.textConfidenceThreshold) {
      transformed.textConfidenceThreshold = 0.7
    }

    // Set default text match mode
    if (transformed.searchMethod === 'ocr_text' && !transformed.textMatchMode) {
      transformed.textMatchMode = 'contains'
    }

    // Set default return strategy
    if (!transformed.returnStrategy) {
      transformed.returnStrategy = 'first'
    }

    return transformed
  }

  /**
   * Validate parameters using Zod schemas where available
   */
  private validateParameters(operationType: string, parameters: any): any {
    const schema = parameterSchemas[operationType as keyof typeof parameterSchemas]
    
    if (schema) {
      try {
        return schema.parse(parameters)
      } catch (error) {
        logger.error('Parameter validation failed', {
          operationType,
          parameters,
          error: error instanceof Error ? error.message : String(error)
        })
        
        // Return original parameters with warning - don't block execution
        logger.warn('Using unvalidated parameters due to validation failure')
        return parameters
      }
    }

    return parameters
  }

  /**
   * Optimize operations for batching or performance
   */
  optimizeOperations(operations: RPAOperation[]): RPAOperation[] {
    logger.debug('Optimizing operations', { count: operations.length })

    // Group consecutive operations by type for potential batching
    const optimized: RPAOperation[] = []
    let currentGroup: RPAOperation[] = []
    let currentType: string | null = null

    for (const operation of operations) {
      if (operation.type === currentType && this.canBatchOperationType(operation.type)) {
        currentGroup.push(operation)
      } else {
        // Process current group
        if (currentGroup.length > 0) {
          optimized.push(...this.optimizeOperationGroup(currentGroup))
        }
        
        // Start new group
        currentGroup = [operation]
        currentType = operation.type
      }
    }

    // Process final group
    if (currentGroup.length > 0) {
      optimized.push(...this.optimizeOperationGroup(currentGroup))
    }

    logger.debug('Operations optimized', { 
      originalCount: operations.length,
      optimizedCount: optimized.length
    })

    return optimized
  }

  /**
   * Check if operation type supports batching
   */
  private canBatchOperationType(type: string): boolean {
    // Currently, most operations are executed individually
    // Future: implement batching for certain operation types
    return false
  }

  /**
   * Optimize a group of similar operations
   */
  private optimizeOperationGroup(operations: RPAOperation[]): RPAOperation[] {
    // For now, return operations as-is
    // Future: implement operation-specific optimizations
    return operations
  }

  /**
   * Update variables for subsequent operations
   */
  updateVariables(newVariables: Record<string, any>): void {
    this.variables = { ...this.variables, ...newVariables }
    logger.debug('Variables updated', { 
      newKeys: Object.keys(newVariables),
      totalKeys: Object.keys(this.variables).length
    })
  }

  /**
   * Update context for subsequent operations
   */
  updateContext(newContext: Record<string, any>): void {
    this.context = { ...this.context, ...newContext }
    logger.debug('Context updated', { 
      newKeys: Object.keys(newContext),
      totalKeys: Object.keys(this.context).length
    })
  }

  /**
   * Get current variables (for debugging)
   */
  getVariables(): Record<string, any> {
    return { ...this.variables }
  }

  /**
   * Get current context (for debugging)
   */
  getContext(): Record<string, any> {
    return { ...this.context }
  }
}

/**
 * Utility functions for operation mapping
 */
export const OperationMapperUtils = {
  /**
   * Create mapper instance with variables
   */
  createMapper(variables?: Record<string, any>, context?: Record<string, any>): RPAOperationMapper {
    return new RPAOperationMapper(variables, context)
  },

  /**
   * Quick operation mapping without instance
   */
  mapSingleOperation(
    blockData: any,
    operationId: string,
    agentId: string,
    variables?: Record<string, any>,
    workflowId?: string,
    executionId?: string
  ): RPAOperation {
    const mapper = new RPAOperationMapper(variables)
    return mapper.mapBlockToOperation(blockData, operationId, agentId, workflowId, executionId)
  },

  /**
   * Extract variables from operation result for next operations
   */
  extractVariablesFromResult(result: any, extractionRules?: Record<string, string>): Record<string, any> {
    const variables: Record<string, any> = {}

    // Default extractions
    if (result.extractedText) {
      variables.lastExtractedText = result.extractedText
    }
    if (result.imageData) {
      variables.lastScreenshot = result.imageData
    }
    if (result.elements && result.elements.length > 0) {
      variables.lastFoundElement = result.elements[0]
      variables.lastFoundElements = result.elements
    }

    // Custom extraction rules
    if (extractionRules) {
      for (const [variableName, sourcePath] of Object.entries(extractionRules)) {
        const value = getNestedValue(result, sourcePath)
        if (value !== undefined) {
          variables[variableName] = value
        }
      }
    }

    return variables
  },

  /**
   * Validate operation compatibility with agent
   */
  validateOperationCompatibility(operation: RPAOperation, agentCapabilities: string[]): {
    compatible: boolean
    missing: string[]
    warnings: string[]
  } {
    const required: string[] = ['desktop-automation']
    const warnings: string[] = []

    // Add capability requirements based on operation type and parameters
    switch (operation.type) {
      case 'click':
      case 'type':
        if (operation.parameters.targetingMethod === 'image_recognition') {
          required.push('image-recognition')
        }
        if (operation.parameters.targetingMethod === 'ocr_text') {
          required.push('ocr-processing')
        }
        break
        
      case 'screenshot':
        required.push('screen-capture')
        break
        
      case 'extract':
        if (operation.parameters.extractionMethod === 'ocr') {
          required.push('ocr-processing')
        }
        break
    }

    const missing = required.filter(cap => !agentCapabilities.includes(cap))
    const compatible = missing.length === 0

    // Add warnings for optional capabilities
    if (operation.type === 'screenshot' && operation.parameters.saveToFile && 
        !agentCapabilities.includes('file-operations')) {
      warnings.push('File operations not supported - screenshot will return base64 only')
    }

    return { compatible, missing, warnings }
  }
}

/**
 * Helper function to get nested object values
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}