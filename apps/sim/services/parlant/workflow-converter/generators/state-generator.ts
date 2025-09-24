/**
 * Workflow to Journey Mapping System - State Generator
 *
 * Generates Parlant states from ReactFlow nodes. Handles state creation,
 * data preservation, and ensures consistency across the conversion process.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ConnectionPreservation,
  ConversionContext,
  LayoutPreservation,
  MetadataPreservation,
  ParlantState,
  ParlantVariable,
  ReactFlowNode,
  StatePreservation,
} from '../types'

const logger = createLogger('StateGenerator')

/**
 * Generates Parlant states with data preservation
 */
export class StateGenerator {
  constructor() {
    logger.info('StateGenerator initialized')
  }

  /**
   * Generate a Parlant state from a ReactFlow node with full data preservation
   */
  async generateState(
    node: ReactFlowNode,
    context: ConversionContext,
    stateType:
      | 'initial'
      | 'chat'
      | 'tool'
      | 'condition'
      | 'loop_start'
      | 'loop_end'
      | 'parallel_start'
      | 'parallel_end'
      | 'final',
    overrides: Partial<ParlantState> = {}
  ): Promise<ParlantState> {
    logger.debug('Generating state', {
      nodeId: node.id,
      stateType,
      preserveLayout: context.options.preserveLayout,
    })

    // Create base state structure
    const baseState: ParlantState = {
      id: this.generateStateId(node, overrides.id),
      type: stateType,
      name: overrides.name || node.data?.name || this.generateStateName(node, stateType),
      description: overrides.description || this.generateStateDescription(node, stateType),
      position: context.options.preserveLayout ? node.position : { x: 0, y: 0 },
      ...overrides,
    }

    // Add preserved data if layout preservation is enabled
    if (context.options.preserveLayout) {
      await this.preserveNodeData(baseState, node, context)
    }

    logger.debug('State generated successfully', {
      nodeId: node.id,
      stateId: baseState.id,
      stateType,
    })

    return baseState
  }

  /**
   * Generate multiple states from a single complex node
   */
  async generateMultipleStates(
    node: ReactFlowNode,
    context: ConversionContext,
    stateConfigs: Array<{
      type: ParlantState['type']
      suffix?: string
      overrides?: Partial<ParlantState>
    }>
  ): Promise<ParlantState[]> {
    logger.debug('Generating multiple states', {
      nodeId: node.id,
      stateCount: stateConfigs.length,
    })

    const states: ParlantState[] = []

    for (let i = 0; i < stateConfigs.length; i++) {
      const config = stateConfigs[i]
      const suffix = config.suffix || `_${i + 1}`

      const state = await this.generateState(node, context, config.type, {
        id: `${this.generateStateId(node)}${suffix}`,
        ...config.overrides,
      })

      states.push(state)
    }

    logger.debug('Multiple states generated', {
      nodeId: node.id,
      generatedStates: states.length,
    })

    return states
  }

  /**
   * Create state preservation data for later reconstruction
   */
  async createStatePreservation(
    node: ReactFlowNode,
    context: ConversionContext
  ): Promise<StatePreservation> {
    logger.debug('Creating state preservation data', { nodeId: node.id })

    return {
      originalNodeData: this.preserveOriginalNodeData(node),
      layoutPreservation: this.preserveLayoutData(node, context),
      connectionPreservation: this.preserveConnectionData(node, context),
      metadataPreservation: this.preserveMetadata(node),
    }
  }

  /**
   * Extract and generate variables from node configuration
   */
  extractNodeVariables(node: ReactFlowNode): ParlantVariable[] {
    const variables: ParlantVariable[] = []

    // Extract from inputs configuration
    if (node.data?.inputs) {
      Object.entries(node.data.inputs).forEach(([key, config]: [string, any]) => {
        variables.push({
          name: `${node.id}_input_${key}`,
          type: this.mapTypeToPariant(config.type || 'string'),
          description: config.description || `Input ${key} from node ${node.id}`,
          defaultValue: config.defaultValue,
        })
      })
    }

    // Extract from outputs configuration
    if (node.data?.outputs) {
      Object.entries(node.data.outputs).forEach(([key, config]: [string, any]) => {
        variables.push({
          name: `${node.id}_output_${key}`,
          type: this.mapTypeToPariant(config.type || 'string'),
          description: config.description || `Output ${key} from node ${node.id}`,
          defaultValue: config.defaultValue,
        })
      })
    }

    // Extract from sub-blocks if present
    if (node.data?.subBlocks && Array.isArray(node.data.subBlocks)) {
      node.data.subBlocks.forEach((subBlock: any) => {
        if (subBlock.value !== undefined) {
          variables.push({
            name: `${node.id}_${subBlock.id}`,
            type: this.inferVariableType(subBlock.value),
            description: subBlock.title || `Configuration ${subBlock.id} from node ${node.id}`,
            defaultValue: subBlock.value,
          })
        }
      })
    }

    return variables
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private generateStateId(node: ReactFlowNode, customId?: string): string {
    if (customId) return customId
    return `state_${node.id}`
  }

  private generateStateName(node: ReactFlowNode, stateType: string): string {
    if (node.data?.name) return node.data.name

    const typeMap: Record<string, string> = {
      initial: 'Journey Start',
      chat: 'AI Interaction',
      tool: 'Tool Execution',
      condition: 'Decision Point',
      loop_start: 'Loop Begin',
      loop_end: 'Loop End',
      parallel_start: 'Parallel Start',
      parallel_end: 'Parallel End',
      final: 'Journey End',
    }

    return typeMap[stateType] || `${stateType} State`
  }

  private generateStateDescription(node: ReactFlowNode, stateType: string): string {
    let description = `Generated ${stateType} state from ${node.type || 'unknown'} node`

    if (node.data?.description) {
      description += ` - ${node.data.description}`
    }

    if (node.data?.type && node.data.type !== node.type) {
      description += ` (${node.data.type})`
    }

    return description
  }

  private async preserveNodeData(
    state: ParlantState,
    node: ReactFlowNode,
    context: ConversionContext
  ): Promise<void> {
    // Add preservation metadata to the state
    if (!state.variables) state.variables = []

    // Store original node data as a variable for reconstruction
    state.variables.push({
      name: `_preserved_${node.id}`,
      type: 'json',
      description: `Preserved data from original node ${node.id}`,
      defaultValue: {
        originalId: node.id,
        originalType: node.type,
        originalData: node.data,
        originalPosition: node.position,
        preservedAt: new Date().toISOString(),
      },
    })
  }

  private preserveOriginalNodeData(node: ReactFlowNode): Record<string, any> {
    return {
      id: node.id,
      type: node.type,
      position: node.position,
      data: JSON.parse(JSON.stringify(node.data)), // Deep clone
      parentId: node.parentId,
      measured: (node as any).measured,
      selected: (node as any).selected,
      dragging: (node as any).dragging,
    }
  }

  private preserveLayoutData(node: ReactFlowNode, context: ConversionContext): LayoutPreservation {
    const nodePositions: Record<string, { x: number; y: number }> = {}
    const containerHierarchy: Record<string, string[]> = {}
    const visualProperties: Record<string, any> = {}

    // Store node position
    nodePositions[node.id] = { x: node.position.x, y: node.position.y }

    // Store container hierarchy if node is in a container
    if (node.parentId) {
      if (!containerHierarchy[node.parentId]) {
        containerHierarchy[node.parentId] = []
      }
      containerHierarchy[node.parentId].push(node.id)
    }

    // Store visual properties
    visualProperties[node.id] = {
      width: (node as any).width,
      height: (node as any).height,
      zIndex: (node as any).zIndex,
      style: (node as any).style,
      className: (node as any).className,
    }

    return {
      nodePositions,
      containerHierarchy,
      visualProperties,
    }
  }

  private preserveConnectionData(
    node: ReactFlowNode,
    context: ConversionContext
  ): ConnectionPreservation {
    const originalEdges = context.workflow.edges.filter(
      (edge) => edge.source === node.id || edge.target === node.id
    )

    const handleMappings: Record<string, string> = {}
    const conditionalLogic: Record<string, string> = {}

    // Map handles and conditions
    originalEdges.forEach((edge) => {
      if (edge.sourceHandle) {
        handleMappings[`${edge.source}_${edge.sourceHandle}`] = edge.sourceHandle
      }
      if (edge.targetHandle) {
        handleMappings[`${edge.target}_${edge.targetHandle}`] = edge.targetHandle
      }

      // Store conditional logic if present
      if (edge.sourceHandle?.startsWith('condition-')) {
        conditionalLogic[edge.id] = edge.sourceHandle.replace('condition-', '')
      }
    })

    return {
      originalEdges: originalEdges.map((edge) => ({ ...edge })), // Clone edges
      handleMappings,
      conditionalLogic,
    }
  }

  private preserveMetadata(node: ReactFlowNode): MetadataPreservation {
    const originalTypes: Record<string, string> = {}
    const blockConfigurations: Record<string, any> = {}
    const customProperties: Record<string, any> = {}

    // Store type information
    originalTypes[node.id] = node.type || 'unknown'
    if (node.data?.type) {
      originalTypes[`${node.id}_data_type`] = node.data.type
    }

    // Store block configuration
    if (node.data?.config) {
      blockConfigurations[node.id] = JSON.parse(JSON.stringify(node.data.config))
    }

    // Store custom properties
    const knownProperties = ['id', 'type', 'position', 'data', 'parentId']
    Object.entries(node).forEach(([key, value]) => {
      if (!knownProperties.includes(key) && value !== undefined) {
        customProperties[key] = value
      }
    })

    return {
      originalTypes,
      blockConfigurations,
      customProperties,
    }
  }

  private mapTypeToPariant(
    workflowType: string
  ): 'string' | 'number' | 'boolean' | 'json' | 'array' {
    const typeMap: Record<string, 'string' | 'number' | 'boolean' | 'json' | 'array'> = {
      string: 'string',
      text: 'string',
      number: 'number',
      integer: 'number',
      float: 'number',
      boolean: 'boolean',
      bool: 'boolean',
      object: 'json',
      json: 'json',
      array: 'array',
      list: 'array',
    }

    return typeMap[workflowType.toLowerCase()] || 'string'
  }

  private inferVariableType(value: any): 'string' | 'number' | 'boolean' | 'json' | 'array' {
    if (typeof value === 'string') return 'string'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object' && value !== null) return 'json'
    return 'string'
  }
}
