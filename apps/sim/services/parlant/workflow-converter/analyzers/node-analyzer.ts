/**
 * Workflow to Journey Mapping System - Node Analyzer
 *
 * Analyzes ReactFlow nodes to understand their structure, dependencies,
 * and conversion requirements. Provides detailed analysis for optimal
 * state generation and transition planning.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ConditionalEdge,
  ConversionContext,
  ConversionError,
  ConversionWarning,
  EdgeAnalysis,
  ReactFlowEdge,
  ReactFlowNode,
} from '../types'

const logger = createLogger('NodeAnalyzer')

/**
 * Analyzes ReactFlow nodes and their relationships for conversion planning
 */
export class NodeAnalyzer {
  constructor() {
    logger.info('NodeAnalyzer initialized')
  }

  /**
   * Analyze a single node and its relationships
   */
  async analyzeNode(node: ReactFlowNode, context: ConversionContext): Promise<NodeAnalysis> {
    logger.debug('Analyzing node', {
      nodeId: node.id,
      nodeType: node.type,
      dataType: node.data?.type,
    })

    const analysis: NodeAnalysis = {
      node,
      nodeType: this.determineNodeType(node),
      complexity: this.assessComplexity(node),
      edgeAnalysis: this.analyzeNodeEdges(node, context),
      dependencies: this.findDependencies(node, context),
      conversionStrategy: 'standard',
      requiredStates: 1,
      estimatedComplexity: 'low',
      specialHandling: [],
    }

    // Determine conversion strategy
    analysis.conversionStrategy = this.determineConversionStrategy(analysis)
    analysis.requiredStates = this.estimateRequiredStates(analysis)
    analysis.estimatedComplexity = this.estimateComplexity(analysis)
    analysis.specialHandling = this.identifySpecialHandling(analysis)

    // Add warnings for complex conversions
    if (analysis.estimatedComplexity === 'high') {
      const warning: ConversionWarning = {
        code: 'HIGH_COMPLEXITY_NODE',
        message: `Node ${node.id} has high conversion complexity`,
        nodeId: node.id,
        impact: 'medium',
        suggestions: [
          'Review node configuration',
          'Consider simplifying the node',
          'Test conversion thoroughly',
        ],
      }
      context.warnings.push(warning)
    }

    logger.debug('Node analysis completed', {
      nodeId: node.id,
      strategy: analysis.conversionStrategy,
      complexity: analysis.estimatedComplexity,
      requiredStates: analysis.requiredStates,
    })

    return analysis
  }

  /**
   * Analyze edges connected to a node
   */
  analyzeNodeEdges(node: ReactFlowNode, context: ConversionContext): EdgeAnalysis {
    const incoming: ReactFlowEdge[] = []
    const outgoing: ReactFlowEdge[] = []
    const conditionalOutgoing: ConditionalEdge[] = []

    // Find all edges connected to this node
    context.workflow.edges.forEach((edge) => {
      if (edge.target === node.id) {
        incoming.push(edge)
      }
      if (edge.source === node.id) {
        outgoing.push(edge)

        // Check if it's a conditional edge
        if (this.isConditionalEdge(edge, node)) {
          conditionalOutgoing.push(this.createConditionalEdge(edge, node))
        }
      }
    })

    return {
      incoming,
      outgoing,
      conditionalOutgoing,
      hasConditionalFlow: conditionalOutgoing.length > 0,
      isLoopConnection: this.isLoopConnection(node, context),
      isParallelConnection: this.isParallelConnection(node, context),
    }
  }

  /**
   * Find node dependencies
   */
  findDependencies(node: ReactFlowNode, context: ConversionContext): string[] {
    const dependencies: string[] = []

    // Check for parent container dependencies
    if (node.parentId) {
      dependencies.push(node.parentId)
    }

    // Check for data dependencies
    if (node.data?.workflowId) {
      dependencies.push(node.data.workflowId)
    }

    // Check for variable dependencies
    const variableRefs = this.extractVariableReferences(node)
    dependencies.push(...variableRefs)

    return [...new Set(dependencies)] // Remove duplicates
  }

  /**
   * Batch analyze all nodes in a workflow
   */
  async analyzeAllNodes(context: ConversionContext): Promise<Map<string, NodeAnalysis>> {
    logger.info('Analyzing all workflow nodes', {
      totalNodes: context.workflow.nodes.length,
    })

    const analyses = new Map<string, NodeAnalysis>()

    for (const node of context.workflow.nodes) {
      try {
        const analysis = await this.analyzeNode(node, context)
        analyses.set(node.id, analysis)
      } catch (error) {
        logger.error('Failed to analyze node', {
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error),
        })

        const conversionError: ConversionError = {
          code: 'NODE_ANALYSIS_FAILED',
          message: `Failed to analyze node ${node.id}: ${error instanceof Error ? error.message : String(error)}`,
          nodeId: node.id,
          severity: 'warning',
          suggestions: [
            'Check node structure',
            'Verify node data integrity',
            'Review node configuration',
          ],
        }
        context.warnings.push(conversionError)
      }
    }

    logger.info('Node analysis completed', {
      totalNodes: context.workflow.nodes.length,
      analyzedNodes: analyses.size,
      failedAnalyses: context.workflow.nodes.length - analyses.size,
    })

    return analyses
  }

  // ========================================
  // PRIVATE ANALYSIS METHODS
  // ========================================

  private determineNodeType(node: ReactFlowNode): string {
    // Use explicit type first
    if (node.data?.type) {
      return node.data.type
    }

    // Fall back to ReactFlow type
    return node.type || 'unknown'
  }

  private assessComplexity(node: ReactFlowNode): number {
    let complexity = 1

    // Base complexity based on node type
    const nodeType = this.determineNodeType(node)
    const complexityMap: Record<string, number> = {
      starter: 1,
      response: 1,
      condition: 3,
      loop: 4,
      parallel: 4,
      api: 2,
      agent: 3,
      function: 2,
      evaluator: 3,
      router: 4,
      workflow: 5,
      webhook: 2,
    }

    complexity = complexityMap[nodeType] || 2

    // Add complexity for configuration
    if (node.data?.config) {
      const configKeys = Object.keys(node.data.config)
      complexity += configKeys.length * 0.1
    }

    // Add complexity for sub-blocks
    if (node.data?.subBlocks && Array.isArray(node.data.subBlocks)) {
      complexity += node.data.subBlocks.length * 0.5
    }

    return Math.round(complexity * 10) / 10 // Round to 1 decimal
  }

  private determineConversionStrategy(analysis: NodeAnalysis): ConversionStrategy {
    const nodeType = analysis.nodeType

    // Determine strategy based on node type and complexity
    if (nodeType === 'starter') return 'initial_state'
    if (nodeType === 'condition') return 'conditional_branching'
    if (nodeType === 'loop') return 'loop_construct'
    if (nodeType === 'parallel') return 'parallel_construct'
    if (nodeType === 'response') return 'final_state'
    if (nodeType === 'api' || nodeType === 'function') return 'tool_state'
    if (nodeType === 'agent') return 'chat_state'
    if (nodeType === 'workflow') return 'subjourney'

    // High complexity nodes get special handling
    if (analysis.complexity > 3) return 'complex_multi_state'

    return 'standard'
  }

  private estimateRequiredStates(analysis: NodeAnalysis): number {
    const strategy = analysis.conversionStrategy

    switch (strategy) {
      case 'initial_state':
      case 'final_state':
      case 'chat_state':
      case 'tool_state':
        return 1

      case 'conditional_branching':
        // One state + condition evaluation
        return 1 + analysis.edgeAnalysis.conditionalOutgoing.length

      case 'loop_construct':
        // Start, body, condition, end
        return 3

      case 'parallel_construct':
        // Start, branches, merge, end
        return 3

      case 'complex_multi_state':
        // Estimate based on complexity
        return Math.ceil(analysis.complexity / 2)

      case 'subjourney':
        // Single delegation state
        return 1

      default:
        return 1
    }
  }

  private estimateComplexity(analysis: NodeAnalysis): 'low' | 'medium' | 'high' {
    if (analysis.complexity <= 2 && analysis.requiredStates <= 2) return 'low'
    if (analysis.complexity <= 4 && analysis.requiredStates <= 4) return 'medium'
    return 'high'
  }

  private identifySpecialHandling(analysis: NodeAnalysis): SpecialHandling[] {
    const handling: SpecialHandling[] = []
    const node = analysis.node
    const nodeType = analysis.nodeType

    // Container nodes need special layout handling
    if (nodeType === 'loop' || nodeType === 'parallel') {
      handling.push('container_layout')
    }

    // Nested nodes need parent relationship preservation
    if (node.parentId) {
      handling.push('nested_context')
    }

    // Conditional nodes need decision logic
    if (analysis.edgeAnalysis.hasConditionalFlow) {
      handling.push('conditional_logic')
    }

    // Complex configurations need data preservation
    if (analysis.complexity > 3) {
      handling.push('complex_config')
    }

    // Variable-dependent nodes need dependency resolution
    if (analysis.dependencies.length > 0) {
      handling.push('dependency_resolution')
    }

    return handling
  }

  private isConditionalEdge(edge: ReactFlowEdge, node: ReactFlowNode): boolean {
    // Check if source handle indicates a condition
    if (edge.sourceHandle?.startsWith('condition-')) return true

    // Check node type for conditional behavior
    if (this.determineNodeType(node) === 'condition') return true

    // Check for router type (multiple outputs)
    if (this.determineNodeType(node) === 'router') return true

    return false
  }

  private createConditionalEdge(edge: ReactFlowEdge, node: ReactFlowNode): ConditionalEdge {
    let condition = 'default'
    let priority = 0

    // Extract condition from handle
    if (edge.sourceHandle?.startsWith('condition-')) {
      condition = edge.sourceHandle.replace('condition-', '')
      priority = Number.parseInt(condition, 10) || 0
    }

    return {
      ...edge,
      condition,
      priority,
    }
  }

  private isLoopConnection(node: ReactFlowNode, context: ConversionContext): boolean {
    return node.parentId !== undefined && context.nodeMap.get(node.parentId)?.data?.type === 'loop'
  }

  private isParallelConnection(node: ReactFlowNode, context: ConversionContext): boolean {
    return (
      node.parentId !== undefined && context.nodeMap.get(node.parentId)?.data?.type === 'parallel'
    )
  }

  private extractVariableReferences(node: ReactFlowNode): string[] {
    const refs: string[] = []
    const data = JSON.stringify(node.data)

    // Look for variable reference patterns like {{variable}} or ${variable}
    const patterns = [
      /\{\{([^}]+)\}\}/g, // {{variable}}
      /\$\{([^}]+)\}/g, // ${variable}
      /\{([^}]+)\}/g, // {variable}
    ]

    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(data)) !== null) {
        refs.push(match[1].trim())
      }
    })

    return [...new Set(refs)]
  }
}

// ========================================
// ANALYSIS RESULT TYPES
// ========================================

export interface NodeAnalysis {
  node: ReactFlowNode
  nodeType: string
  complexity: number
  edgeAnalysis: EdgeAnalysis
  dependencies: string[]
  conversionStrategy: ConversionStrategy
  requiredStates: number
  estimatedComplexity: 'low' | 'medium' | 'high'
  specialHandling: SpecialHandling[]
}

export type ConversionStrategy =
  | 'standard'
  | 'initial_state'
  | 'final_state'
  | 'chat_state'
  | 'tool_state'
  | 'conditional_branching'
  | 'loop_construct'
  | 'parallel_construct'
  | 'complex_multi_state'
  | 'subjourney'

export type SpecialHandling =
  | 'container_layout'
  | 'nested_context'
  | 'conditional_logic'
  | 'complex_config'
  | 'dependency_resolution'
  | 'variable_injection'
  | 'error_handling'
