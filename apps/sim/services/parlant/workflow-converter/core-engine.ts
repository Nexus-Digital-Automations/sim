/**
 * Workflow to Journey Mapping System - Core Conversion Engine
 *
 * The main conversion engine that orchestrates the transformation of ReactFlow
 * workflows into Parlant journey state machines. Handles node analysis, state
 * generation, transition creation, and error recovery.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { NodeAnalyzer } from './analyzers/node-analyzer'
import { TransitionBuilder } from './builders/transition-builder'
import { ErrorRecovery } from './error-handling/error-recovery'
import { StateGenerator } from './generators/state-generator'
import type {
  ConversionContext,
  ConversionError,
  ConversionMetadata,
  ConversionOptions,
  ConversionResult,
  ConversionWarning,
  NodeConverter,
  ParlantJourney,
  ProgressCallback,
  ReactFlowWorkflow,
} from './types'
import { ValidationEngine } from './validation/validation-engine'

const logger = createLogger('WorkflowConverter')

/**
 * Core conversion engine that transforms ReactFlow workflows to Parlant journeys
 */
export class WorkflowConversionEngine {
  private readonly nodeAnalyzer: NodeAnalyzer
  private readonly transitionBuilder: TransitionBuilder
  private readonly validationEngine: ValidationEngine
  private readonly errorRecovery: ErrorRecovery
  private readonly nodeConverters: Map<string, NodeConverter>

  constructor() {
    this.nodeAnalyzer = new NodeAnalyzer()
    this.stateGenerator = new StateGenerator()
    this.transitionBuilder = new TransitionBuilder()
    this.validationEngine = new ValidationEngine()
    this.errorRecovery = new ErrorRecovery()
    this.nodeConverters = new Map()

    // Initialize built-in node converters
    this.initializeBuiltInConverters()

    logger.info('WorkflowConversionEngine initialized')
  }

  /**
   * Main conversion method - transforms a ReactFlow workflow into a Parlant journey
   */
  async convert(
    workflow: ReactFlowWorkflow,
    options: ConversionOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<ConversionResult> {
    const startTime = Date.now()
    logger.info('Starting workflow conversion', {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    })

    try {
      // Initialize conversion context
      const context = await this.initializeContext(workflow, options)

      // Step 1: Analyze workflow structure
      progressCallback?.({ step: 'Analyzing workflow structure', completed: 0, total: 5 })
      await this.analyzeWorkflowStructure(context)

      // Step 2: Convert nodes to states
      progressCallback?.({ step: 'Converting nodes to states', completed: 1, total: 5 })
      await this.convertNodesToStates(context, progressCallback)

      // Step 3: Build transitions
      progressCallback?.({ step: 'Building state transitions', completed: 2, total: 5 })
      await this.buildStateTransitions(context)

      // Step 4: Apply state preservation
      progressCallback?.({ step: 'Preserving workflow state', completed: 3, total: 5 })
      await this.preserveWorkflowState(context)

      // Step 5: Validate and finalize
      progressCallback?.({ step: 'Validating journey', completed: 4, total: 5 })
      const journey = await this.finalizeJourney(context)

      // Create conversion result
      const result = this.createConversionResult(journey, context, Date.now() - startTime)

      logger.info('Workflow conversion completed successfully', {
        workflowId: workflow.id,
        journeyId: journey.id,
        processingTimeMs: result.metadata.processingTimeMs,
        convertedNodes: result.metadata.convertedNodes,
        totalErrors: result.errors.length,
        totalWarnings: result.warnings.length,
      })

      progressCallback?.({ step: 'Conversion completed', completed: 5, total: 5 })
      return result
    } catch (error) {
      logger.error('Critical error during workflow conversion', {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      return this.createErrorResult(workflow, error, Date.now() - startTime)
    }
  }

  /**
   * Register a custom node converter
   */
  registerNodeConverter(nodeType: string, converter: NodeConverter): void {
    this.nodeConverters.set(nodeType, converter)
    logger.info('Custom node converter registered', { nodeType })
  }

  /**
   * Get available node converter types
   */
  getAvailableConverters(): string[] {
    return Array.from(this.nodeConverters.keys())
  }

  /**
   * Validate workflow before conversion
   */
  async validateWorkflow(workflow: ReactFlowWorkflow): Promise<{
    valid: boolean
    errors: ConversionError[]
    warnings: ConversionWarning[]
  }> {
    return this.validationEngine.validateWorkflow(workflow, this.nodeConverters)
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async initializeContext(
    workflow: ReactFlowWorkflow,
    options: ConversionOptions
  ): Promise<ConversionContext> {
    // Build node and edge maps for efficient lookups
    const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]))
    const edgeMap = new Map<string, any[]>()

    // Group edges by source node
    workflow.edges.forEach((edge) => {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, [])
      }
      edgeMap.get(edge.source)!.push(edge)
    })

    return {
      workflow,
      options: {
        preserveLayout: true,
        includeDebugInfo: false,
        validateOutput: true,
        ...options,
      },
      nodeMap,
      edgeMap,
      stateMap: new Map(),
      variables: new Map(),
      errors: [],
      warnings: [],
    }
  }

  private async analyzeWorkflowStructure(context: ConversionContext): Promise<void> {
    logger.info('Analyzing workflow structure', {
      totalNodes: context.workflow.nodes.length,
      totalEdges: context.workflow.edges.length,
    })

    // Analyze each node
    for (const node of context.workflow.nodes) {
      try {
        await this.nodeAnalyzer.analyzeNode(node, context)
      } catch (error) {
        const conversionError: ConversionError = {
          code: 'NODE_ANALYSIS_ERROR',
          message: `Failed to analyze node ${node.id}: ${error instanceof Error ? error.message : String(error)}`,
          nodeId: node.id,
          severity: 'warning',
          suggestions: [
            'Check node configuration',
            'Verify node type is supported',
            'Review node data structure',
          ],
        }
        context.warnings.push(conversionError)
      }
    }

    logger.info('Workflow structure analysis completed', {
      analyzedNodes: context.workflow.nodes.length,
      warnings: context.warnings.length,
    })
  }

  private async convertNodesToStates(
    context: ConversionContext,
    progressCallback?: ProgressCallback
  ): Promise<void> {
    logger.info('Converting nodes to Parlant states')

    const totalNodes = context.workflow.nodes.length
    let processedNodes = 0

    for (const node of context.workflow.nodes) {
      try {
        progressCallback?.({
          step: 'Converting nodes to states',
          completed: 1,
          total: 5,
          currentNode: node.data.name || node.id,
        })

        // Find appropriate converter
        const converter = this.findNodeConverter(node)
        if (!converter) {
          const warning: ConversionWarning = {
            code: 'NO_CONVERTER',
            message: `No converter found for node type: ${node.type}`,
            nodeId: node.id,
            impact: 'medium',
            suggestions: [
              'Register a custom converter for this node type',
              'Use a generic converter',
              'Skip this node',
            ],
          }
          context.warnings.push(warning)
          continue
        }

        // Convert node to states
        const conversionResult = await converter.convert(node, context)

        // Store generated states
        conversionResult.states.forEach((state) => {
          context.stateMap.set(state.id, state)
        })

        // Store variables if any
        if (conversionResult.variables) {
          conversionResult.variables.forEach((variable) => {
            context.variables.set(variable.name, variable)
          })
        }

        processedNodes++
      } catch (error) {
        const conversionError: ConversionError = {
          code: 'NODE_CONVERSION_ERROR',
          message: `Failed to convert node ${node.id}: ${error instanceof Error ? error.message : String(error)}`,
          nodeId: node.id,
          severity: 'error',
          suggestions: [
            'Check node configuration',
            'Review converter implementation',
            'Try error recovery',
          ],
        }
        context.errors.push(conversionError)

        // Attempt error recovery
        try {
          await this.errorRecovery.recoverFromNodeError(node, context)
        } catch (recoveryError) {
          logger.error('Failed to recover from node conversion error', {
            nodeId: node.id,
            originalError: error,
            recoveryError,
          })
        }
      }
    }

    logger.info('Node to state conversion completed', {
      totalNodes,
      processedNodes,
      generatedStates: context.stateMap.size,
      errors: context.errors.length,
    })
  }

  private async buildStateTransitions(context: ConversionContext): Promise<void> {
    logger.info('Building state transitions from workflow edges')

    for (const edge of context.workflow.edges) {
      try {
        const transition = await this.transitionBuilder.buildTransition(edge, context)
        if (transition) {
          // Transitions will be collected in the context
          logger.debug('Built transition', {
            from: transition.sourceStateId,
            to: transition.targetStateId,
          })
        }
      } catch (error) {
        const conversionError: ConversionError = {
          code: 'TRANSITION_BUILD_ERROR',
          message: `Failed to build transition for edge ${edge.id}: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'warning',
          suggestions: [
            'Check edge configuration',
            'Verify source and target states exist',
            'Review transition logic',
          ],
        }
        context.warnings.push(conversionError)
      }
    }

    logger.info('State transition building completed')
  }

  private async preserveWorkflowState(context: ConversionContext): Promise<void> {
    if (!context.options.preserveLayout) {
      logger.info('Layout preservation disabled, skipping state preservation')
      return
    }

    logger.info('Preserving workflow state and layout information')

    // Add preservation logic here
    // This would store original node positions, custom properties, etc.
    // in the journey metadata for potential reverse conversion
  }

  private async finalizeJourney(context: ConversionContext): Promise<ParlantJourney> {
    // Collect all states and transitions
    const states = Array.from(context.stateMap.values())
    const transitions = await this.transitionBuilder.getAllTransitions(context)

    // Create journey
    const journey: ParlantJourney = {
      id: `journey_${context.workflow.id}`,
      title: context.workflow.name,
      description:
        context.workflow.description || `Converted from workflow: ${context.workflow.name}`,
      conditions: [`Converted from workflow ${context.workflow.name}`],
      states,
      transitions,
      metadata: {
        originalWorkflowId: context.workflow.id,
        conversionTimestamp: new Date().toISOString(),
        conversionVersion: '1.0.0',
        preservedData: context.options.preserveLayout
          ? {
              originalNodes: context.workflow.nodes,
              originalEdges: context.workflow.edges,
            }
          : {},
      },
    }

    // Validate if requested
    if (context.options.validateOutput) {
      const validationResult = await this.validationEngine.validateJourney(journey)
      context.errors.push(...validationResult.errors)
      context.warnings.push(...validationResult.warnings)
    }

    return journey
  }

  private findNodeConverter(node: any): NodeConverter | undefined {
    // Try exact type match first
    let converter = this.nodeConverters.get(node.type)
    if (converter?.canConvert(node)) {
      return converter
    }

    // Try data.type match
    if (node.data?.type) {
      converter = this.nodeConverters.get(node.data.type)
      if (converter?.canConvert(node)) {
        return converter
      }
    }

    // Try generic converter as fallback
    converter = this.nodeConverters.get('generic')
    if (converter?.canConvert(node)) {
      return converter
    }

    return undefined
  }

  private createConversionResult(
    journey: ParlantJourney,
    context: ConversionContext,
    processingTimeMs: number
  ): ConversionResult {
    const metadata: ConversionMetadata = {
      totalNodes: context.workflow.nodes.length,
      convertedNodes: context.stateMap.size,
      skippedNodes: context.workflow.nodes.length - context.stateMap.size,
      totalEdges: context.workflow.edges.length,
      convertedTransitions: journey.transitions.length,
      processingTimeMs,
      conversionMap: this.buildConversionMap(context),
    }

    return {
      success:
        context.errors.filter((e) => e.severity === 'critical' || e.severity === 'error').length ===
        0,
      journey,
      errors: context.errors,
      warnings: context.warnings,
      metadata,
    }
  }

  private createErrorResult(
    workflow: ReactFlowWorkflow,
    error: any,
    processingTimeMs: number
  ): ConversionResult {
    const criticalError: ConversionError = {
      code: 'CRITICAL_CONVERSION_ERROR',
      message: error instanceof Error ? error.message : String(error),
      severity: 'critical',
      suggestions: [
        'Check workflow structure',
        'Verify all nodes are valid',
        'Review conversion options',
        'Contact support if issue persists',
      ],
    }

    return {
      success: false,
      errors: [criticalError],
      warnings: [],
      metadata: {
        totalNodes: workflow.nodes.length,
        convertedNodes: 0,
        skippedNodes: workflow.nodes.length,
        totalEdges: workflow.edges.length,
        convertedTransitions: 0,
        processingTimeMs,
        conversionMap: {},
      },
    }
  }

  private buildConversionMap(context: ConversionContext): Record<string, string> {
    const map: Record<string, string> = {}

    context.workflow.nodes.forEach((node) => {
      // Find corresponding states for this node
      const nodeStates = Array.from(context.stateMap.values()).filter(
        (state) => state.id.startsWith(node.id) || state.name.includes(node.data.name || '')
      )

      if (nodeStates.length > 0) {
        map[node.id] = nodeStates[0].id
      }
    })

    return map
  }

  private initializeBuiltInConverters(): void {
    // Built-in converters will be loaded from separate modules
    // This allows for easy extensibility and testing
    logger.info('Loading built-in node converters...')

    // Note: Actual converter implementations will be in separate files
    // and loaded dynamically to keep this core engine focused
  }
}
