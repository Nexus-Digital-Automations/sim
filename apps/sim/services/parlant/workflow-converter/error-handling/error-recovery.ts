/**
 * Workflow to Journey Mapping System - Error Recovery
 *
 * Provides comprehensive error recovery mechanisms for the conversion process.
 * Handles conversion failures, data corruption, and provides fallback strategies
 * to ensure robust conversion results.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ConversionContext,
  ConversionError,
  ConversionWarning,
  NodeConversionResult,
  ParlantState,
  ReactFlowNode,
} from '../types'

const logger = createLogger('ErrorRecovery')

/**
 * Handles error recovery during conversion process
 */
export class ErrorRecovery {
  constructor() {
    logger.info('ErrorRecovery initialized')
  }

  /**
   * Recover from node conversion error by creating fallback state
   */
  async recoverFromNodeError(
    node: ReactFlowNode,
    context: ConversionContext,
    error?: any
  ): Promise<NodeConversionResult | null> {
    logger.warn('Attempting error recovery for node', {
      nodeId: node.id,
      nodeType: node.type,
      error: error instanceof Error ? error.message : String(error),
    })

    try {
      // Determine recovery strategy based on node type and error
      const strategy = this.determineRecoveryStrategy(node, error)

      switch (strategy) {
        case 'fallback_chat_state':
          return this.createFallbackChatState(node, context)

        case 'fallback_tool_state':
          return this.createFallbackToolState(node, context)

        case 'fallback_generic_state':
          return this.createFallbackGenericState(node, context)

        case 'skip_node':
          return this.skipNodeWithWarning(node, context)

        default:
          return this.createMinimalState(node, context)
      }
    } catch (recoveryError) {
      logger.error('Error recovery failed', {
        nodeId: node.id,
        originalError: error,
        recoveryError:
          recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      })

      // Add critical error to context
      const criticalError: ConversionError = {
        code: 'RECOVERY_FAILED',
        message: `Error recovery failed for node ${node.id}`,
        nodeId: node.id,
        severity: 'critical',
        suggestions: [
          'Check node structure is valid',
          'Review error recovery implementation',
          'Contact support if issue persists',
        ],
      }
      context.errors.push(criticalError)

      return null
    }
  }

  /**
   * Recover from transition building errors
   */
  async recoverFromTransitionError(
    edgeId: string,
    sourceNodeId: string,
    targetNodeId: string,
    context: ConversionContext,
    error?: any
  ): Promise<boolean> {
    logger.warn('Attempting transition error recovery', {
      edgeId,
      sourceNodeId,
      targetNodeId,
      error: error instanceof Error ? error.message : String(error),
    })

    try {
      // Try to create a generic transition
      const genericTransition = {
        id: `recovered_transition_${edgeId}`,
        sourceStateId: `state_${sourceNodeId}`,
        targetStateId: `state_${targetNodeId}`,
        description: `Recovered transition from ${sourceNodeId} to ${targetNodeId}`,
        condition: undefined,
        weight: undefined,
      }

      // Add recovery warning
      const warning: ConversionWarning = {
        code: 'TRANSITION_RECOVERED',
        message: `Transition ${edgeId} was recovered with generic configuration`,
        impact: 'medium',
        suggestions: [
          'Review original transition configuration',
          'Verify transition logic is correct',
          'Test transition behavior in journey',
        ],
      }
      context.warnings.push(warning)

      logger.info('Transition recovery successful', {
        edgeId,
        recoveredTransitionId: genericTransition.id,
      })

      return true
    } catch (recoveryError) {
      logger.error('Transition recovery failed', {
        edgeId,
        originalError: error,
        recoveryError:
          recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      })

      const criticalError: ConversionError = {
        code: 'TRANSITION_RECOVERY_FAILED',
        message: `Transition recovery failed for edge ${edgeId}`,
        severity: 'error',
        suggestions: [
          'Check edge configuration',
          'Verify source and target nodes exist',
          'Review transition building logic',
        ],
      }
      context.errors.push(criticalError)

      return false
    }
  }

  /**
   * Recover from critical conversion errors that affect the entire workflow
   */
  async recoverFromCriticalError(
    context: ConversionContext,
    error: any
  ): Promise<{
    canRecover: boolean
    partialResult?: any
    recoveryActions: string[]
  }> {
    logger.error('Attempting critical error recovery', {
      workflowId: context.workflow.id,
      error: error instanceof Error ? error.message : String(error),
    })

    const recoveryActions: string[] = []
    let canRecover = false
    let partialResult: any = null

    try {
      // Assess what parts of the conversion succeeded
      const assessment = this.assessConversionState(context)

      if (assessment.hasStates) {
        canRecover = true
        recoveryActions.push('Preserved converted states')

        // Create partial journey with available states
        partialResult = {
          id: `partial_journey_${context.workflow.id}`,
          title: `${context.workflow.name} (Partial)`,
          description: `Partially converted journey due to critical error: ${error instanceof Error ? error.message : String(error)}`,
          conditions: ['Partial conversion due to errors'],
          states: Array.from(context.stateMap.values()),
          transitions: [], // Transitions might be incomplete
          metadata: {
            originalWorkflowId: context.workflow.id,
            conversionTimestamp: new Date().toISOString(),
            conversionVersion: '1.0.0-recovery',
            preservedData: {
              partialConversion: true,
              originalError: error instanceof Error ? error.message : String(error),
              recoveryActions,
            },
          },
        }

        recoveryActions.push('Created partial journey structure')
      }

      if (assessment.hasVariables) {
        recoveryActions.push('Preserved extracted variables')
      }

      // Add recovery warnings
      const recoveryWarning: ConversionWarning = {
        code: 'CRITICAL_ERROR_RECOVERY',
        message: 'Critical error occurred during conversion - partial recovery attempted',
        impact: 'high',
        suggestions: [
          'Review workflow structure for issues',
          'Check for unsupported node types',
          'Verify workflow configuration is complete',
          'Test partial journey functionality',
        ],
      }
      context.warnings.push(recoveryWarning)

      logger.info('Critical error recovery completed', {
        workflowId: context.workflow.id,
        canRecover,
        recoveryActionsCount: recoveryActions.length,
        hasPartialResult: !!partialResult,
      })
    } catch (recoveryError) {
      logger.error('Critical error recovery failed completely', {
        workflowId: context.workflow.id,
        originalError: error,
        recoveryError:
          recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      })

      recoveryActions.push('Recovery failed - manual intervention required')
    }

    return {
      canRecover,
      partialResult,
      recoveryActions,
    }
  }

  /**
   * Validate and repair conversion context
   */
  async repairConversionContext(context: ConversionContext): Promise<boolean> {
    logger.info('Repairing conversion context', {
      workflowId: context.workflow.id,
    })

    let repaired = false

    try {
      // Repair missing node map entries
      if (context.nodeMap.size !== context.workflow.nodes.length) {
        context.nodeMap.clear()
        context.workflow.nodes.forEach((node) => {
          context.nodeMap.set(node.id, node)
        })
        repaired = true
        logger.debug('Repaired node map')
      }

      // Repair missing edge map entries
      const expectedEdgeMapSize = new Set(context.workflow.edges.map((e) => e.source)).size
      if (context.edgeMap.size !== expectedEdgeMapSize) {
        context.edgeMap.clear()
        context.workflow.edges.forEach((edge) => {
          if (!context.edgeMap.has(edge.source)) {
            context.edgeMap.set(edge.source, [])
          }
          context.edgeMap.get(edge.source)!.push(edge)
        })
        repaired = true
        logger.debug('Repaired edge map')
      }

      // Ensure required collections are initialized
      if (!context.stateMap) {
        context.stateMap = new Map()
        repaired = true
      }

      if (!context.variables) {
        context.variables = new Map()
        repaired = true
      }

      if (!context.errors) {
        context.errors = []
        repaired = true
      }

      if (!context.warnings) {
        context.warnings = []
        repaired = true
      }

      if (repaired) {
        logger.info('Conversion context repaired successfully')
      }
    } catch (error) {
      logger.error('Failed to repair conversion context', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return repaired
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private determineRecoveryStrategy(node: ReactFlowNode, error?: any): RecoveryStrategy {
    const nodeType = node.data?.type || node.type

    // Strategy based on node type
    switch (nodeType) {
      case 'agent':
      case 'ai':
      case 'chat':
      case 'llm':
        return 'fallback_chat_state'

      case 'api':
      case 'function':
      case 'http':
      case 'rest':
        return 'fallback_tool_state'

      case 'starter':
      case 'trigger':
      case 'webhook':
      case 'schedule':
        return 'fallback_generic_state'

      default:
        // Check error type for strategy
        if (error?.message?.includes('unsupported')) {
          return 'skip_node'
        }
        return 'fallback_generic_state'
    }
  }

  private async createFallbackChatState(
    node: ReactFlowNode,
    context: ConversionContext
  ): Promise<NodeConversionResult> {
    const fallbackState: ParlantState = {
      id: `fallback_state_${node.id}`,
      type: 'chat',
      name: node.data?.name || `Fallback Chat (${node.id})`,
      description: `Fallback chat state created due to conversion error`,
      content: "I'm here to help. What can I do for you?",
      position: node.position,
    }

    const warning: ConversionWarning = {
      code: 'FALLBACK_STATE_CREATED',
      message: `Created fallback chat state for node ${node.id}`,
      nodeId: node.id,
      impact: 'medium',
      suggestions: [
        'Review original node configuration',
        'Test fallback state behavior',
        'Consider manual state configuration',
      ],
    }
    context.warnings.push(warning)

    return {
      states: [fallbackState],
      transitions: [],
    }
  }

  private async createFallbackToolState(
    node: ReactFlowNode,
    context: ConversionContext
  ): Promise<NodeConversionResult> {
    const fallbackState: ParlantState = {
      id: `fallback_state_${node.id}`,
      type: 'tool',
      name: node.data?.name || `Fallback Tool (${node.id})`,
      description: `Fallback tool state created due to conversion error`,
      content: 'Executing fallback operation',
      tools: ['fallback_operation'],
      position: node.position,
    }

    const warning: ConversionWarning = {
      code: 'FALLBACK_TOOL_STATE_CREATED',
      message: `Created fallback tool state for node ${node.id}`,
      nodeId: node.id,
      impact: 'medium',
      suggestions: [
        'Configure proper tool for this state',
        'Review original node configuration',
        'Test fallback tool behavior',
      ],
    }
    context.warnings.push(warning)

    return {
      states: [fallbackState],
      transitions: [],
    }
  }

  private async createFallbackGenericState(
    node: ReactFlowNode,
    context: ConversionContext
  ): Promise<NodeConversionResult> {
    const fallbackState: ParlantState = {
      id: `fallback_state_${node.id}`,
      type: 'chat',
      name: node.data?.name || `Fallback State (${node.id})`,
      description: `Generic fallback state created due to conversion error`,
      content: 'Processing request...',
      position: node.position,
    }

    const warning: ConversionWarning = {
      code: 'GENERIC_FALLBACK_CREATED',
      message: `Created generic fallback state for node ${node.id}`,
      nodeId: node.id,
      impact: 'medium',
      suggestions: [
        'Review node type and configuration',
        'Consider implementing specific converter',
        'Test fallback state behavior',
      ],
    }
    context.warnings.push(warning)

    return {
      states: [fallbackState],
      transitions: [],
    }
  }

  private async skipNodeWithWarning(
    node: ReactFlowNode,
    context: ConversionContext
  ): Promise<NodeConversionResult> {
    const warning: ConversionWarning = {
      code: 'NODE_SKIPPED',
      message: `Node ${node.id} was skipped due to conversion error`,
      nodeId: node.id,
      impact: 'high',
      suggestions: [
        'Review if node is necessary for workflow',
        'Consider alternative implementation',
        'Check for updated converter support',
      ],
    }
    context.warnings.push(warning)

    return {
      states: [],
      transitions: [],
      skipConnections: true,
    }
  }

  private async createMinimalState(
    node: ReactFlowNode,
    context: ConversionContext
  ): Promise<NodeConversionResult> {
    const minimalState: ParlantState = {
      id: `minimal_state_${node.id}`,
      type: 'chat',
      name: `Minimal State (${node.id})`,
      description: 'Minimal state created as last resort',
      content: 'State processed',
      position: node.position,
    }

    const warning: ConversionWarning = {
      code: 'MINIMAL_STATE_CREATED',
      message: `Created minimal state for node ${node.id} as last resort`,
      nodeId: node.id,
      impact: 'high',
      suggestions: [
        'This state has minimal functionality',
        'Review and enhance state configuration',
        'Consider implementing proper converter',
      ],
    }
    context.warnings.push(warning)

    return {
      states: [minimalState],
      transitions: [],
    }
  }

  private assessConversionState(context: ConversionContext): ConversionAssessment {
    return {
      hasStates: context.stateMap.size > 0,
      hasVariables: context.variables.size > 0,
      hasErrors: context.errors.length > 0,
      hasWarnings: context.warnings.length > 0,
      stateCount: context.stateMap.size,
      errorCount: context.errors.length,
      warningCount: context.warnings.length,
    }
  }
}

// ========================================
// SUPPORTING TYPES
// ========================================

type RecoveryStrategy =
  | 'fallback_chat_state'
  | 'fallback_tool_state'
  | 'fallback_generic_state'
  | 'skip_node'
  | 'minimal_state'

interface ConversionAssessment {
  hasStates: boolean
  hasVariables: boolean
  hasErrors: boolean
  hasWarnings: boolean
  stateCount: number
  errorCount: number
  warningCount: number
}
