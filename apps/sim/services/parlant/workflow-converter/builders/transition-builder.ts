/**
 * Workflow to Journey Mapping System - Transition Builder
 *
 * Builds Parlant transitions from ReactFlow edges. Handles connection logic,
 * conditional routing, and ensures proper state flow in the converted journey.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ConversionContext,
  ConversionError,
  ConversionWarning,
  ParlantTransition,
  ReactFlowEdge,
} from '../types'

const logger = createLogger('TransitionBuilder')

/**
 * Builds Parlant transitions from ReactFlow edges
 */
export class TransitionBuilder {
  private transitions: Map<string, ParlantTransition> = new Map()

  constructor() {
    logger.info('TransitionBuilder initialized')
  }

  /**
   * Build a single transition from a ReactFlow edge
   */
  async buildTransition(
    edge: ReactFlowEdge,
    context: ConversionContext
  ): Promise<ParlantTransition | null> {
    logger.debug('Building transition', {
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })

    try {
      // Validate edge
      const validation = this.validateEdge(edge, context)
      if (!validation.valid) {
        validation.errors.forEach((error) => context.errors.push(error))
        validation.warnings.forEach((warning) => context.warnings.push(warning))

        if (validation.errors.some((e) => e.severity === 'critical' || e.severity === 'error')) {
          return null
        }
      }

      // Find corresponding states
      const sourceStateId = this.findStateIdForNode(edge.source, context)
      const targetStateId = this.findStateIdForNode(edge.target, context)

      if (!sourceStateId || !targetStateId) {
        const error: ConversionError = {
          code: 'MISSING_STATES_FOR_TRANSITION',
          message: `Cannot create transition: missing states for edge ${edge.id}`,
          severity: 'warning',
          suggestions: [
            'Ensure source and target nodes are converted to states',
            'Check node conversion process',
            'Verify edge references valid nodes',
          ],
        }
        context.warnings.push(error)
        return null
      }

      // Create the transition
      const transition = this.createTransition(edge, sourceStateId, targetStateId, context)

      // Store transition for later retrieval
      this.transitions.set(transition.id, transition)

      logger.debug('Transition built successfully', {
        edgeId: edge.id,
        transitionId: transition.id,
        from: sourceStateId,
        to: targetStateId,
      })

      return transition
    } catch (error) {
      logger.error('Failed to build transition', {
        edgeId: edge.id,
        error: error instanceof Error ? error.message : String(error),
      })

      const conversionError: ConversionError = {
        code: 'TRANSITION_BUILD_ERROR',
        message: `Failed to build transition for edge ${edge.id}: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'warning',
        suggestions: [
          'Check edge configuration',
          'Verify source and target nodes exist',
          'Review transition logic',
        ],
      }
      context.warnings.push(conversionError)

      return null
    }
  }

  /**
   * Build all transitions for the workflow
   */
  async buildAllTransitions(context: ConversionContext): Promise<ParlantTransition[]> {
    logger.info('Building all workflow transitions', {
      totalEdges: context.workflow.edges.length,
    })

    const transitions: ParlantTransition[] = []

    for (const edge of context.workflow.edges) {
      const transition = await this.buildTransition(edge, context)
      if (transition) {
        transitions.push(transition)
      }
    }

    logger.info('All transitions built', {
      totalEdges: context.workflow.edges.length,
      builtTransitions: transitions.length,
      skippedEdges: context.workflow.edges.length - transitions.length,
    })

    return transitions
  }

  /**
   * Get all built transitions
   */
  async getAllTransitions(context: ConversionContext): Promise<ParlantTransition[]> {
    if (this.transitions.size === 0) {
      return this.buildAllTransitions(context)
    }
    return Array.from(this.transitions.values())
  }

  /**
   * Clear all stored transitions
   */
  clear(): void {
    this.transitions.clear()
    logger.debug('TransitionBuilder cleared')
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private validateEdge(
    edge: ReactFlowEdge,
    context: ConversionContext
  ): {
    valid: boolean
    errors: ConversionError[]
    warnings: ConversionWarning[]
  } {
    const errors: ConversionError[] = []
    const warnings: ConversionWarning[] = []

    // Check if source and target nodes exist
    const sourceNode = context.nodeMap.get(edge.source)
    const targetNode = context.nodeMap.get(edge.target)

    if (!sourceNode) {
      errors.push({
        code: 'MISSING_SOURCE_NODE',
        message: `Edge ${edge.id} references non-existent source node ${edge.source}`,
        severity: 'error',
        suggestions: ['Check edge source reference', 'Verify node exists in workflow'],
      })
    }

    if (!targetNode) {
      errors.push({
        code: 'MISSING_TARGET_NODE',
        message: `Edge ${edge.id} references non-existent target node ${edge.target}`,
        severity: 'error',
        suggestions: ['Check edge target reference', 'Verify node exists in workflow'],
      })
    }

    // Check for self-loops
    if (edge.source === edge.target) {
      warnings.push({
        code: 'SELF_LOOP_DETECTED',
        message: `Edge ${edge.id} creates a self-loop on node ${edge.source}`,
        impact: 'medium',
        suggestions: [
          'Review workflow logic',
          'Consider if self-loop is intentional',
          'May cause infinite loops in journey execution',
        ],
      })
    }

    // Validate handle types if specified
    if (edge.sourceHandle && sourceNode) {
      this.validateHandle(edge.sourceHandle, sourceNode, 'source', warnings)
    }

    if (edge.targetHandle && targetNode) {
      this.validateHandle(edge.targetHandle, targetNode, 'target', warnings)
    }

    return {
      valid: errors.filter((e) => e.severity === 'critical' || e.severity === 'error').length === 0,
      errors,
      warnings,
    }
  }

  private validateHandle(
    handle: string,
    node: any,
    type: 'source' | 'target',
    warnings: ConversionWarning[]
  ): void {
    // Check for valid handle patterns
    const validPatterns = [
      /^source$/,
      /^target$/,
      /^condition-/,
      /^loop-(start|end)-source$/,
      /^parallel-(start|end)-source$/,
    ]

    const isValid = validPatterns.some((pattern) => pattern.test(handle))

    if (!isValid) {
      warnings.push({
        code: 'UNKNOWN_HANDLE_TYPE',
        message: `Unknown ${type} handle type: ${handle} on node ${node.id}`,
        nodeId: node.id,
        impact: 'low',
        suggestions: [
          'Verify handle type is supported',
          'Check node configuration',
          'Handle may be converted generically',
        ],
      })
    }
  }

  private findStateIdForNode(nodeId: string, context: ConversionContext): string | null {
    // Look for direct state mapping
    const state = context.stateMap.get(nodeId)
    if (state) {
      return state.id
    }

    // Look for state that starts with the node ID (for multi-state nodes)
    for (const [stateId, state] of context.stateMap.entries()) {
      if (state.id.startsWith(`state_${nodeId}`)) {
        return state.id
      }
    }

    // Fallback: generate expected state ID
    const expectedStateId = `state_${nodeId}`
    logger.debug('Using expected state ID', { nodeId, expectedStateId })
    return expectedStateId
  }

  private createTransition(
    edge: ReactFlowEdge,
    sourceStateId: string,
    targetStateId: string,
    context: ConversionContext
  ): ParlantTransition {
    const transitionId = this.generateTransitionId(sourceStateId, targetStateId)

    // Determine condition from source handle or edge data
    const condition = this.extractCondition(edge, context)

    // Calculate weight for transition priority
    const weight = this.calculateTransitionWeight(edge, context)

    // Generate description
    const description = this.generateTransitionDescription(edge, context)

    return {
      id: transitionId,
      sourceStateId,
      targetStateId,
      condition,
      description,
      weight,
    }
  }

  private generateTransitionId(sourceStateId: string, targetStateId: string): string {
    return `transition_${sourceStateId}_to_${targetStateId}`
  }

  private extractCondition(edge: ReactFlowEdge, context: ConversionContext): string | undefined {
    // Check for condition in source handle
    if (edge.sourceHandle?.startsWith('condition-')) {
      const condition = edge.sourceHandle.replace('condition-', '')
      return this.humanizeCondition(condition)
    }

    // Check for loop/parallel handles
    if (edge.sourceHandle === 'loop-end-source') {
      return 'Loop completed'
    }

    if (edge.sourceHandle === 'parallel-end-source') {
      return 'All parallel branches completed'
    }

    if (edge.sourceHandle === 'loop-start-source') {
      return 'Loop iteration started'
    }

    if (edge.sourceHandle === 'parallel-start-source') {
      return 'Parallel execution started'
    }

    // Check source node for conditional logic
    const sourceNode = context.nodeMap.get(edge.source)
    if (sourceNode) {
      const nodeType = sourceNode.data?.type || sourceNode.type

      if (nodeType === 'condition') {
        // For condition nodes, try to extract condition from configuration
        const conditionConfig = sourceNode.data?.condition || sourceNode.data?.config?.condition
        if (conditionConfig) {
          return conditionConfig
        }
        return 'Condition met' // Default for condition nodes
      }

      if (nodeType === 'router') {
        // For router nodes, create route-based condition
        return `Route to ${this.getTargetNodeName(edge.target, context)}`
      }
    }

    // No specific condition
    return undefined
  }

  private humanizeCondition(condition: string): string {
    // Convert technical condition names to human-readable format
    const conditionMap: Record<string, string> = {
      true: 'When condition is true',
      false: 'When condition is false',
      success: 'On success',
      error: 'On error',
      timeout: 'On timeout',
      retry: 'On retry',
      default: 'Default path',
    }

    // Try direct mapping first
    if (conditionMap[condition.toLowerCase()]) {
      return conditionMap[condition.toLowerCase()]
    }

    // Try to parse numeric conditions
    if (/^\d+$/.test(condition)) {
      return `Option ${condition}`
    }

    // Convert snake_case or camelCase to human readable
    const humanized = condition
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
      .replace(/_/g, ' ') // snake_case
      .toLowerCase()
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter

    return humanized
  }

  private calculateTransitionWeight(
    edge: ReactFlowEdge,
    context: ConversionContext
  ): number | undefined {
    // Weight based on handle priority
    if (edge.sourceHandle?.startsWith('condition-')) {
      const conditionNum = edge.sourceHandle.replace('condition-', '')
      const num = Number.parseInt(conditionNum, 10)
      if (!Number.isNaN(num)) {
        return num
      }
    }

    // Default weights for special handles
    const handleWeights: Record<string, number> = {
      source: 0,
      'loop-start-source': 1,
      'loop-end-source': 2,
      'parallel-start-source': 1,
      'parallel-end-source': 2,
    }

    if (edge.sourceHandle && handleWeights[edge.sourceHandle] !== undefined) {
      return handleWeights[edge.sourceHandle]
    }

    // No specific weight
    return undefined
  }

  private generateTransitionDescription(
    edge: ReactFlowEdge,
    context: ConversionContext
  ): string | undefined {
    const sourceNode = context.nodeMap.get(edge.source)
    const targetNode = context.nodeMap.get(edge.target)

    if (!sourceNode || !targetNode) {
      return undefined
    }

    const sourceName = sourceNode.data?.name || `Node ${edge.source}`
    const targetName = targetNode.data?.name || `Node ${edge.target}`

    let description = `Transition from ${sourceName} to ${targetName}`

    // Add handle-specific information
    if (edge.sourceHandle && edge.sourceHandle !== 'source') {
      description += ` via ${edge.sourceHandle.replace('-', ' ')}`
    }

    return description
  }

  private getTargetNodeName(targetNodeId: string, context: ConversionContext): string {
    const targetNode = context.nodeMap.get(targetNodeId)
    return targetNode?.data?.name || `Node ${targetNodeId}`
  }
}
