/**
 * Workflow to Journey Mapping System - Base Node Converter
 *
 * Abstract base class for all node converters. Provides common functionality
 * and enforces consistent conversion patterns across all node types.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  NodeConverter,
  ReactFlowNode,
  ConversionContext,
  NodeConversionResult,
  ValidationResult,
  ParlantState,
  ParlantTransition,
  ParlantVariable,
  ConversionError,
  ConversionWarning
} from '../types'

const logger = createLogger('BaseConverter')

/**
 * Abstract base converter that all specific node converters extend
 */
export abstract class BaseNodeConverter implements NodeConverter {
  protected readonly nodeType: string
  protected readonly supportedDataTypes: string[]

  constructor(nodeType: string, supportedDataTypes: string[] = []) {
    this.nodeType = nodeType
    this.supportedDataTypes = supportedDataTypes
    logger.debug(`Initialized ${this.constructor.name}`, { nodeType, supportedDataTypes })
  }

  /**
   * Check if this converter can handle the given node
   */
  canConvert(node: ReactFlowNode): boolean {
    // Check ReactFlow node type
    if (node.type === this.nodeType) return true

    // Check data.type if specified
    if (node.data?.type && this.supportedDataTypes.includes(node.data.type)) {
      return true
    }

    return false
  }

  /**
   * Validate node before conversion
   */
  validateInput?(node: ReactFlowNode): ValidationResult {
    const errors: ConversionError[] = []
    const warnings: ConversionWarning[] = []

    // Basic validation
    if (!node.id) {
      errors.push({
        code: 'MISSING_NODE_ID',
        message: 'Node must have an ID',
        nodeId: node.id,
        severity: 'critical',
        suggestions: ['Ensure node has a valid ID']
      })
    }

    if (!node.data) {
      warnings.push({
        code: 'MISSING_NODE_DATA',
        message: 'Node has no data object',
        nodeId: node.id,
        impact: 'low',
        suggestions: ['Add data object to node if needed']
      })
    }

    // Let subclasses add their own validation
    const customValidation = this.validateNodeSpecific(node)
    errors.push(...customValidation.errors)
    warnings.push(...customValidation.warnings)

    return {
      valid: errors.filter(e => e.severity === 'critical' || e.severity === 'error').length === 0,
      errors,
      warnings
    }
  }

  /**
   * Main conversion method - must be implemented by subclasses
   */
  abstract convert(node: ReactFlowNode, context: ConversionContext): Promise<NodeConversionResult>

  // ========================================
  // PROTECTED HELPER METHODS
  // ========================================

  /**
   * Create a basic Parlant state from a ReactFlow node
   */
  protected createBaseState(
    node: ReactFlowNode,
    type: ParlantStateType,
    overrides: Partial<ParlantState> = {}
  ): ParlantState {
    const baseState: ParlantState = {
      id: this.generateStateId(node),
      type,
      name: node.data?.name || `State for ${node.id}`,
      description: node.data?.description || `Generated from ${this.nodeType} node`,
      position: node.position,
      ...overrides
    }

    logger.debug('Created base state', {
      nodeId: node.id,
      stateId: baseState.id,
      stateType: type
    })

    return baseState
  }

  /**
   * Generate a unique state ID for a node
   */
  protected generateStateId(node: ReactFlowNode, suffix?: string): string {
    const baseSuffix = suffix ? `_${suffix}` : ''
    return `state_${node.id}${baseSuffix}`
  }

  /**
   * Generate a unique transition ID
   */
  protected generateTransitionId(sourceStateId: string, targetStateId: string): string {
    return `transition_${sourceStateId}_to_${targetStateId}`
  }

  /**
   * Extract variables from node configuration
   */
  protected extractVariables(node: ReactFlowNode): ParlantVariable[] {
    const variables: ParlantVariable[] = []

    // Extract from inputs/outputs if defined
    if (node.data?.inputs) {
      Object.entries(node.data.inputs).forEach(([key, config]: [string, any]) => {
        variables.push({
          name: key,
          type: this.mapTypeToPariant(config.type || 'string'),
          description: config.description || `Input variable from ${node.id}`
        })
      })
    }

    if (node.data?.outputs) {
      Object.entries(node.data.outputs).forEach(([key, config]: [string, any]) => {
        variables.push({
          name: key,
          type: this.mapTypeToPariant(config.type || 'string'),
          description: config.description || `Output variable from ${node.id}`
        })
      })
    }

    return variables
  }

  /**
   * Map workflow types to Parlant variable types
   */
  protected mapTypeToPariant(workflowType: string): 'string' | 'number' | 'boolean' | 'json' | 'array' {
    const typeMap: Record<string, 'string' | 'number' | 'boolean' | 'json' | 'array'> = {
      'string': 'string',
      'text': 'string',
      'number': 'number',
      'integer': 'number',
      'float': 'number',
      'boolean': 'boolean',
      'bool': 'boolean',
      'object': 'json',
      'json': 'json',
      'array': 'array',
      'list': 'array'
    }

    return typeMap[workflowType.toLowerCase()] || 'string'
  }

  /**
   * Extract tools from node configuration
   */
  protected extractTools(node: ReactFlowNode): string[] {
    const tools: string[] = []

    // Extract from tools configuration
    if (node.data?.tools?.access) {
      tools.push(...node.data.tools.access)
    }

    // Extract from block configuration if available
    if (node.data?.config?.tools) {
      if (Array.isArray(node.data.config.tools)) {
        tools.push(...node.data.config.tools)
      }
    }

    return [...new Set(tools)] // Remove duplicates
  }

  /**
   * Extract conditions from node configuration
   */
  protected extractConditions(node: ReactFlowNode): string[] {
    const conditions: string[] = []

    // Extract from various configuration locations
    if (node.data?.conditions) {
      if (Array.isArray(node.data.conditions)) {
        conditions.push(...node.data.conditions)
      } else if (typeof node.data.conditions === 'string') {
        conditions.push(node.data.conditions)
      }
    }

    if (node.data?.config?.conditions) {
      if (Array.isArray(node.data.config.conditions)) {
        conditions.push(...node.data.config.conditions)
      } else if (typeof node.data.config.conditions === 'string') {
        conditions.push(node.data.config.conditions)
      }
    }

    return conditions
  }

  /**
   * Create error for conversion failures
   */
  protected createConversionError(
    node: ReactFlowNode,
    code: string,
    message: string,
    severity: 'critical' | 'error' | 'warning' = 'error',
    suggestions: string[] = []
  ): ConversionError {
    return {
      code,
      message,
      nodeId: node.id,
      severity,
      suggestions: suggestions.length > 0 ? suggestions : [
        'Check node configuration',
        'Review converter implementation',
        'Contact support if issue persists'
      ]
    }
  }

  /**
   * Create warning for conversion issues
   */
  protected createConversionWarning(
    node: ReactFlowNode,
    code: string,
    message: string,
    impact: 'high' | 'medium' | 'low' = 'medium',
    suggestions: string[] = []
  ): ConversionWarning {
    return {
      code,
      message,
      nodeId: node.id,
      impact,
      suggestions: suggestions.length > 0 ? suggestions : [
        'Review node configuration',
        'Consider alternative approaches'
      ]
    }
  }

  /**
   * Log conversion progress
   */
  protected logConversion(
    node: ReactFlowNode,
    action: string,
    details: Record<string, any> = {}
  ): void {
    logger.debug(`${this.constructor.name}: ${action}`, {
      nodeId: node.id,
      nodeType: this.nodeType,
      ...details
    })
  }

  // ========================================
  // ABSTRACT METHODS
  // ========================================

  /**
   * Node-specific validation - implemented by subclasses
   */
  protected abstract validateNodeSpecific(node: ReactFlowNode): ValidationResult

  /**
   * Get the primary state type for this converter
   */
  protected abstract getPrimaryStateType(): ParlantStateType
}

// ========================================
// TYPE IMPORTS FOR PARLANT STATE TYPES
// ========================================

import type { ParlantStateType } from '../types'