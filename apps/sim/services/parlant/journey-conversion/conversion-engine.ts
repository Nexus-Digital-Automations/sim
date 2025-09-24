/**
 * Workflow to Journey Conversion Engine
 * ====================================
 *
 * Core engine for converting Sim ReactFlow workflows into Parlant journeys.
 * Handles block mapping, parameter substitution, and optimization.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getBlock } from '@/blocks'
import type { Journey, JourneyStep } from '@/services/parlant/types'
import type { BlockState, Edge, WorkflowState } from '@/stores/workflows/workflow/types'
import type {
  BlockJourneyMapping,
  ConversionConfig,
  ConversionContext,
  ConversionError,
  ConversionMetadata,
  ConversionWarning,
  EdgeJourneyMapping,
  JourneyConversionResult,
  ToolCall,
} from './types'

const logger = createLogger('ConversionEngine')

export class WorkflowToJourneyConverter {
  private config: ConversionConfig
  private warnings: ConversionWarning[] = []
  private blockMappings: Map<string, BlockJourneyMapping> = new Map()
  private edgeMappings: Map<string, EdgeJourneyMapping> = new Map()
  private parametersUsed: Set<string> = new Set()

  constructor(config: ConversionConfig) {
    this.config = config
  }

  /**
   * Convert a workflow to a journey with parameter substitution
   */
  async convertWorkflowToJourney(context: ConversionContext): Promise<JourneyConversionResult> {
    const startTime = Date.now()
    logger.info('Starting workflow to journey conversion', {
      workflowId: context.workflow_id,
      workspaceId: context.workspace_id,
      parametersCount: Object.keys(context.parameters).length,
    })

    try {
      // Reset state for new conversion
      this.resetState()

      // Get workflow data
      const workflowState = await this.getWorkflowState(context.workflow_id, context.workspace_id)

      // Validate parameters if template is provided
      if (context.template_version) {
        await this.validateParameters(context.parameters, context.template_version)
      }

      // Convert blocks to journey steps
      const journeySteps = await this.convertBlocksToSteps(workflowState.blocks, context)

      // Convert edges to journey flow
      const stepTransitions = await this.convertEdgesToTransitions(workflowState.edges, context)

      // Apply optimizations
      const optimizedSteps = await this.applyOptimizations(journeySteps, stepTransitions)

      // Create the journey
      const journey = await this.createJourney(workflowState, optimizedSteps, context)

      // Calculate metadata
      const metadata = this.createConversionMetadata(context, startTime, workflowState)

      const result: JourneyConversionResult = {
        journey,
        steps: optimizedSteps,
        metadata,
        warnings: [...this.warnings],
        parameters_used: Array.from(this.parametersUsed),
      }

      logger.info('Conversion completed successfully', {
        duration: metadata.conversion_duration_ms,
        stepsCreated: optimizedSteps.length,
        warningsCount: this.warnings.length,
      })

      return result
    } catch (error) {
      logger.error('Conversion failed', { error: error.message, context })
      throw this.createConversionError('conversion', 'CONVERSION_FAILED', error.message, {
        context,
      })
    }
  }

  /**
   * Convert workflow blocks to journey steps
   */
  private async convertBlocksToSteps(
    blocks: Record<string, BlockState>,
    context: ConversionContext
  ): Promise<JourneyStep[]> {
    const steps: JourneyStep[] = []
    let stepOrder = 1

    for (const [blockId, blockState] of Object.entries(blocks)) {
      try {
        const mapping = await this.convertBlockToStep(blockState, context, stepOrder)
        this.blockMappings.set(blockId, mapping)

        const step: JourneyStep = {
          id: mapping.journey_step_id,
          journey_id: '', // Will be set when journey is created
          order: stepOrder,
          title: mapping.step_title,
          description: mapping.step_description,
          conditions: mapping.conditions,
          actions: mapping.actions,
        }

        steps.push(step)
        stepOrder++
      } catch (error) {
        this.addWarning('unsupported_block', error.message, blockId, 'medium')
        logger.warn('Failed to convert block', { blockId, error: error.message })
      }
    }

    return steps
  }

  /**
   * Convert a single block to a journey step
   */
  private async convertBlockToStep(
    blockState: BlockState,
    context: ConversionContext,
    order: number
  ): Promise<BlockJourneyMapping> {
    const blockConfig = getBlock(blockState.type)

    if (!blockConfig) {
      throw new Error(`Unknown block type: ${blockState.type}`)
    }

    const stepId = this.generateStepId(blockState.id)
    let stepTitle = blockState.name
    let stepDescription = blockConfig.description

    // Apply parameter substitution if enabled
    if (this.config.enable_parameter_substitution) {
      stepTitle = this.substituteParameters(stepTitle, context.parameters)
      stepDescription = this.substituteParameters(stepDescription, context.parameters)
    }

    // Convert sub-blocks to conditions and actions
    const conditions = await this.convertSubBlocksToConditions(blockState, context)
    const actions = await this.convertSubBlocksToActions(blockState, context)
    const toolCalls = await this.convertBlockToToolCalls(blockState, context)

    return {
      block_id: blockState.id,
      block_type: blockState.type,
      journey_step_id: stepId,
      step_title: stepTitle,
      step_description: stepDescription,
      conditions,
      actions,
      tool_calls: toolCalls,
      parameter_substitutions: this.extractParameterSubstitutions(blockState, context.parameters),
    }
  }

  /**
   * Convert sub-blocks to journey conditions
   */
  private async convertSubBlocksToConditions(
    blockState: BlockState,
    context: ConversionContext
  ): Promise<string[]> {
    const conditions: string[] = []

    // Process sub-blocks that represent conditions
    for (const [subBlockId, subBlockState] of Object.entries(blockState.subBlocks)) {
      if (this.isConditionSubBlock(subBlockId, subBlockState)) {
        let condition = this.formatCondition(subBlockId, subBlockState)

        if (this.config.enable_parameter_substitution) {
          condition = this.substituteParameters(condition, context.parameters)
        }

        conditions.push(condition)
      }
    }

    return conditions
  }

  /**
   * Convert sub-blocks to journey actions
   */
  private async convertSubBlocksToActions(
    blockState: BlockState,
    context: ConversionContext
  ): Promise<string[]> {
    const actions: string[] = []

    // Process sub-blocks that represent actions
    for (const [subBlockId, subBlockState] of Object.entries(blockState.subBlocks)) {
      if (this.isActionSubBlock(subBlockId, subBlockState)) {
        let action = this.formatAction(subBlockId, subBlockState)

        if (this.config.enable_parameter_substitution) {
          action = this.substituteParameters(action, context.parameters)
        }

        actions.push(action)
      }
    }

    return actions
  }

  /**
   * Convert block to tool calls for Parlant integration
   */
  private async convertBlockToToolCalls(
    blockState: BlockState,
    context: ConversionContext
  ): Promise<ToolCall[]> {
    const blockConfig = getBlock(blockState.type)
    const toolCalls: ToolCall[] = []

    if (blockConfig?.tools?.access) {
      for (const toolId of blockConfig.tools.access) {
        const parameters = this.extractToolParameters(blockState, toolId, context)

        toolCalls.push({
          tool_id: toolId,
          tool_name: toolId, // Will be resolved by tool registry
          parameters,
          output_mapping: this.createOutputMapping(blockState.outputs),
        })
      }
    }

    return toolCalls
  }

  /**
   * Convert edges to journey transitions
   */
  private async convertEdgesToTransitions(
    edges: Edge[],
    context: ConversionContext
  ): Promise<EdgeJourneyMapping[]> {
    const transitions: EdgeJourneyMapping[] = []

    for (const edge of edges) {
      try {
        const mapping = await this.convertEdgeToTransition(edge, context)
        this.edgeMappings.set(edge.id, mapping)
        transitions.push(mapping)
      } catch (error) {
        this.addWarning('validation_failed', error.message, undefined, 'low')
        logger.warn('Failed to convert edge', { edgeId: edge.id, error: error.message })
      }
    }

    return transitions
  }

  /**
   * Convert a single edge to a journey transition
   */
  private async convertEdgeToTransition(
    edge: Edge,
    context: ConversionContext
  ): Promise<EdgeJourneyMapping> {
    const sourceMapping = this.blockMappings.get(edge.source)
    const targetMapping = this.blockMappings.get(edge.target)

    if (!sourceMapping || !targetMapping) {
      throw new Error(`Missing block mapping for edge ${edge.id}`)
    }

    // Determine transition type based on edge properties
    const transitionType = this.determineTransitionType(edge, context)

    // Create transition conditions
    const conditions = this.createTransitionConditions(edge, sourceMapping, targetMapping, context)

    return {
      edge_id: edge.id,
      source_block_id: edge.source,
      target_block_id: edge.target,
      source_step_id: sourceMapping.journey_step_id,
      target_step_id: targetMapping.journey_step_id,
      conditions,
      transition_type: transitionType,
    }
  }

  /**
   * Apply optimization strategies to journey steps
   */
  private async applyOptimizations(
    steps: JourneyStep[],
    transitions: EdgeJourneyMapping[]
  ): Promise<JourneyStep[]> {
    let optimizedSteps = [...steps]

    if (this.config.optimization_level === 'basic') {
      return optimizedSteps
    }

    // Standard optimizations
    if (
      this.config.optimization_level === 'standard' ||
      this.config.optimization_level === 'advanced'
    ) {
      optimizedSteps = this.optimizeSequentialSteps(optimizedSteps, transitions)
      optimizedSteps = this.optimizeConditionalSteps(optimizedSteps, transitions)
    }

    // Advanced optimizations
    if (this.config.optimization_level === 'advanced') {
      optimizedSteps = this.optimizeParallelSteps(optimizedSteps, transitions)
      optimizedSteps = this.optimizeLoopSteps(optimizedSteps, transitions)
    }

    return optimizedSteps
  }

  /**
   * Create the final journey object
   */
  private async createJourney(
    workflowState: WorkflowState,
    steps: JourneyStep[],
    context: ConversionContext
  ): Promise<Journey> {
    const journeyId = this.generateJourneyId(context.workflow_id)

    // Get workflow metadata
    const workflowMeta = await this.getWorkflowMetadata(context.workflow_id, context.workspace_id)

    let title = workflowMeta.name || `Journey from Workflow ${context.workflow_id}`
    let description = workflowMeta.description || 'Auto-generated journey from workflow conversion'

    // Apply parameter substitution
    if (this.config.enable_parameter_substitution) {
      title = this.substituteParameters(title, context.parameters)
      description = this.substituteParameters(description, context.parameters)
    }

    return {
      id: journeyId,
      agent_id: '', // Will be set by the service layer
      title,
      description,
      conditions: this.createJourneyConditions(steps, context),
      steps,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // Helper methods

  private resetState(): void {
    this.warnings = []
    this.blockMappings.clear()
    this.edgeMappings.clear()
    this.parametersUsed.clear()
  }

  private async getWorkflowState(workflowId: string, workspaceId: string): Promise<WorkflowState> {
    // TODO: Implement workflow state retrieval
    // This would integrate with the existing workflow store
    throw new Error('Method not implemented')
  }

  private async validateParameters(
    parameters: Record<string, any>,
    templateVersion: string
  ): Promise<void> {
    // TODO: Implement parameter validation against template
    // This would validate types, ranges, and required parameters
  }

  private substituteParameters(text: string, parameters: Record<string, any>): string {
    let result = text

    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      if (placeholder.test(result)) {
        this.parametersUsed.add(key)
        result = result.replace(placeholder, String(value))
      }
    }

    return result
  }

  private generateStepId(blockId: string): string {
    return `step_${blockId}_${Date.now()}`
  }

  private generateJourneyId(workflowId: string): string {
    return `journey_${workflowId}_${Date.now()}`
  }

  private isConditionSubBlock(subBlockId: string, subBlockState: any): boolean {
    // Determine if sub-block represents a condition
    return (
      subBlockId.includes('condition') || subBlockId.includes('if') || subBlockId.includes('when')
    )
  }

  private isActionSubBlock(subBlockId: string, subBlockState: any): boolean {
    // Determine if sub-block represents an action
    return !this.isConditionSubBlock(subBlockId, subBlockState)
  }

  private formatCondition(subBlockId: string, subBlockState: any): string {
    return `${subBlockId}: ${subBlockState.value}`
  }

  private formatAction(subBlockId: string, subBlockState: any): string {
    return `Execute ${subBlockId} with value: ${subBlockState.value}`
  }

  private extractToolParameters(
    blockState: BlockState,
    toolId: string,
    context: ConversionContext
  ): Record<string, any> {
    const parameters: Record<string, any> = {}

    // Extract parameters from block sub-blocks
    for (const [subBlockId, subBlockState] of Object.entries(blockState.subBlocks)) {
      let value = subBlockState.value

      if (this.config.enable_parameter_substitution && typeof value === 'string') {
        value = this.substituteParameters(value, context.parameters)
      }

      parameters[subBlockId] = value
    }

    return parameters
  }

  private createOutputMapping(outputs: Record<string, any>): Record<string, string> {
    const mapping: Record<string, string> = {}

    for (const [outputKey, outputDef] of Object.entries(outputs)) {
      mapping[outputKey] = `{{output.${outputKey}}}`
    }

    return mapping
  }

  private determineTransitionType(
    edge: Edge,
    context: ConversionContext
  ): 'sequential' | 'conditional' | 'parallel' | 'loop' {
    // Analyze edge properties to determine transition type
    if (edge.data?.conditional) return 'conditional'
    if (edge.data?.parallel) return 'parallel'
    if (edge.data?.loop) return 'loop'
    return 'sequential'
  }

  private createTransitionConditions(
    edge: Edge,
    sourceMapping: BlockJourneyMapping,
    targetMapping: BlockJourneyMapping,
    context: ConversionContext
  ): string[] {
    const conditions: string[] = []

    // Add default transition condition
    conditions.push(`After completing ${sourceMapping.step_title}`)

    // Add specific conditions based on edge data
    if (edge.data?.condition) {
      let condition = edge.data.condition
      if (this.config.enable_parameter_substitution) {
        condition = this.substituteParameters(condition, context.parameters)
      }
      conditions.push(condition)
    }

    return conditions
  }

  private optimizeSequentialSteps(
    steps: JourneyStep[],
    transitions: EdgeJourneyMapping[]
  ): JourneyStep[] {
    // TODO: Implement sequential step optimization
    return steps
  }

  private optimizeConditionalSteps(
    steps: JourneyStep[],
    transitions: EdgeJourneyMapping[]
  ): JourneyStep[] {
    // TODO: Implement conditional step optimization
    return steps
  }

  private optimizeParallelSteps(
    steps: JourneyStep[],
    transitions: EdgeJourneyMapping[]
  ): JourneyStep[] {
    // TODO: Implement parallel step optimization
    return steps
  }

  private optimizeLoopSteps(
    steps: JourneyStep[],
    transitions: EdgeJourneyMapping[]
  ): JourneyStep[] {
    // TODO: Implement loop step optimization
    return steps
  }

  private createJourneyConditions(steps: JourneyStep[], context: ConversionContext): string[] {
    return [
      'Journey created from workflow conversion',
      `Original workflow: ${context.workflow_id}`,
      `Parameters applied: ${Array.from(this.parametersUsed).join(', ')}`,
    ]
  }

  private async getWorkflowMetadata(
    workflowId: string,
    workspaceId: string
  ): Promise<{ name: string; description?: string }> {
    // TODO: Implement workflow metadata retrieval
    return { name: `Workflow ${workflowId}`, description: 'Converted workflow' }
  }

  private extractParameterSubstitutions(
    blockState: BlockState,
    parameters: Record<string, any>
  ): Record<string, string> {
    const substitutions: Record<string, string> = {}

    // Track which parameters were used in this block
    for (const [subBlockId, subBlockState] of Object.entries(blockState.subBlocks)) {
      if (typeof subBlockState.value === 'string') {
        for (const [paramKey] of Object.entries(parameters)) {
          const placeholder = `{{${paramKey}}}`
          if (subBlockState.value.includes(placeholder)) {
            substitutions[`${subBlockId}.${paramKey}`] = placeholder
          }
        }
      }
    }

    return substitutions
  }

  private createConversionMetadata(
    context: ConversionContext,
    startTime: number,
    workflowState: WorkflowState
  ): ConversionMetadata {
    return {
      source_workflow_id: context.workflow_id,
      conversion_timestamp: new Date().toISOString(),
      conversion_duration_ms: Date.now() - startTime,
      blocks_converted: Object.keys(workflowState.blocks).length,
      edges_converted: workflowState.edges.length,
      parameters_applied: context.parameters,
      optimization_applied: [this.config.optimization_level],
    }
  }

  private addWarning(
    type: ConversionWarning['type'],
    message: string,
    blockId?: string,
    severity: ConversionWarning['severity'] = 'medium'
  ): void {
    this.warnings.push({ type, message, block_id: blockId, severity })
  }

  private createConversionError(
    type: ConversionError['type'],
    code: string,
    message: string,
    details?: Record<string, any>
  ): ConversionError {
    const error = new Error(message) as ConversionError
    error.type = type
    error.code = code
    error.details = details
    return error
  }
}
