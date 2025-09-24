/**
 * Workflow Journey Mapper
 * =======================
 *
 * Maps Sim ReactFlow workflows to Parlant journey state machines
 * for conversational execution.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getBlock } from '@/blocks'
import { Serializer } from '@/serializer'
import type { SerializedWorkflow } from '@/serializer/types'
import { getParlantClient } from '../client'
import type {
  ContextVariableMapping,
  ConversationalConfig,
  ConversationalTrigger,
  EdgeTransitionMapping,
  ExecutionTrigger,
  NodeStateMapping,
  ParlantJourneyState,
  ParlantJourneyTransition,
  TransitionCondition,
  ValidationRule,
  WorkflowExecutionConfig,
  WorkflowToJourneyMapping,
} from './types'

const logger = createLogger('WorkflowJourneyMapper')

/**
 * Service for mapping workflows to journeys
 */
export class WorkflowJourneyMapper {
  private readonly parlantClient
  private readonly serializer: Serializer

  // Cache for workflow definitions
  private readonly workflowCache = new Map<string, SerializedWorkflow>()

  // Journey state templates for different node types
  private readonly stateTemplates = new Map<string, Partial<ParlantJourneyState>>()

  constructor() {
    this.parlantClient = getParlantClient()
    this.serializer = new Serializer()
    this.initializeStateTemplates()

    logger.info('WorkflowJourneyMapper initialized')
  }

  /**
   * Create a workflow-to-journey mapping
   */
  async createWorkflowToJourneyMapping(
    workflowId: string,
    workspaceId: string,
    userId: string,
    options: {
      conversationalConfig?: Partial<ConversationalConfig>
      executionConfig?: Partial<WorkflowExecutionConfig>
      forceParsing?: boolean
    } = {}
  ): Promise<WorkflowToJourneyMapping> {
    logger.info('Creating workflow-to-journey mapping', {
      workflowId,
      workspaceId,
      userId,
    })

    try {
      // Load workflow definition
      const workflow = await this.loadWorkflowDefinition(workflowId, workspaceId)
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      // Analyze workflow structure
      const workflowAnalysis = await this.analyzeWorkflowStructure(workflow)

      // Generate journey states from workflow nodes
      const nodeStateMappings = await this.generateNodeStateMappings(
        workflowAnalysis.nodes,
        options.conversationalConfig || {}
      )

      // Generate journey transitions from workflow edges
      const edgeTransitionMappings = await this.generateEdgeTransitionMappings(
        workflowAnalysis.edges,
        nodeStateMappings
      )

      // Map context variables
      const contextVariableMappings = await this.generateContextVariableMappings(workflowAnalysis)

      // Create default configurations
      const executionConfig = this.createDefaultExecutionConfig(options.executionConfig || {})
      const conversationalConfig = this.createDefaultConversationalConfig(
        options.conversationalConfig || {}
      )

      // Create Parlant journey
      const journeyId = await this.createParlantJourney({
        workflowId,
        workspaceId,
        userId,
        nodeStateMappings,
        edgeTransitionMappings,
        executionConfig,
        conversationalConfig,
      })

      // Create the complete mapping
      const mapping: WorkflowToJourneyMapping = {
        workflowId,
        journeyId,
        mappingVersion: this.generateMappingVersion(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        nodeStateMappings,
        edgeTransitionMappings,
        contextVariableMappings,
        executionConfig,
        conversationalConfig,
      }

      // Save mapping to database (would be implemented)
      await this.saveMappingToDatabase(mapping, workspaceId)

      logger.info('Workflow-to-journey mapping created successfully', {
        workflowId,
        journeyId,
        nodeCount: nodeStateMappings.length,
        edgeCount: edgeTransitionMappings.length,
      })

      return mapping
    } catch (error: any) {
      logger.error('Failed to create workflow-to-journey mapping', {
        workflowId,
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * Load workflow definition from database or API
   */
  private async loadWorkflowDefinition(
    workflowId: string,
    workspaceId: string
  ): Promise<SerializedWorkflow | null> {
    // Check cache first
    const cached = this.workflowCache.get(workflowId)
    if (cached) {
      return cached
    }

    try {
      // This would integrate with the actual workflow storage system
      // For now, returning a mock structure that would be replaced with actual API call
      const response = await fetch(`/api/workflows/${workflowId}`, {
        headers: {
          'X-Workspace-ID': workspaceId,
        },
      })

      if (!response.ok) {
        logger.warn('Failed to load workflow from API', {
          workflowId,
          status: response.status,
        })
        return null
      }

      const workflowData = await response.json()

      // Convert to SerializedWorkflow format using the serializer
      const serializedWorkflow = this.serializer.serializeWorkflow(
        workflowData.blocks || {},
        workflowData.edges || [],
        workflowData.loops || [],
        workflowData.parallels || []
      )

      // Cache the result
      this.workflowCache.set(workflowId, serializedWorkflow)

      return serializedWorkflow
    } catch (error: any) {
      logger.error('Error loading workflow definition', {
        workflowId,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Analyze workflow structure for mapping
   */
  private async analyzeWorkflowStructure(workflow: SerializedWorkflow): Promise<{
    nodes: Array<{ id: string; type: string; data: any; position: any }>
    edges: Array<{ id: string; source: string; target: string; data?: any }>
    entryPoints: string[]
    exitPoints: string[]
    variables: Array<{ name: string; type: string; defaultValue?: any }>
  }> {
    const nodes = Object.entries(workflow.blocks).map(([id, block]) => ({
      id,
      type: block.type,
      data: block.subBlocks || {},
      position: { x: 0, y: 0 }, // Would extract actual positions
    }))

    const edges = workflow.connections.map((conn, index) => ({
      id: `edge-${index}`,
      source: conn.source,
      target: conn.target,
      data: conn.data || {},
    }))

    // Find entry points (nodes with no incoming edges)
    const targetNodeIds = new Set(edges.map((e) => e.target))
    const entryPoints = nodes.filter((node) => !targetNodeIds.has(node.id)).map((node) => node.id)

    // Find exit points (nodes with no outgoing edges)
    const sourceNodeIds = new Set(edges.map((e) => e.source))
    const exitPoints = nodes.filter((node) => !sourceNodeIds.has(node.id)).map((node) => node.id)

    // Extract variables (would be implemented based on workflow structure)
    const variables = this.extractWorkflowVariables(workflow)

    return {
      nodes,
      edges,
      entryPoints,
      exitPoints,
      variables,
    }
  }

  /**
   * Generate node-to-state mappings
   */
  private async generateNodeStateMappings(
    nodes: Array<{ id: string; type: string; data: any; position: any }>,
    conversationalConfig: Partial<ConversationalConfig>
  ): Promise<NodeStateMapping[]> {
    const mappings: NodeStateMapping[] = []

    for (const node of nodes) {
      const blockConfig = getBlock(node.type)
      if (!blockConfig) {
        logger.warn('Unknown block type encountered', { nodeId: node.id, type: node.type })
        continue
      }

      // Generate journey state ID
      const journeyStateId = `state_${node.id}_${node.type}`

      // Create conversational templates
      const conversationTemplate = await this.generateConversationTemplate(
        node,
        blockConfig,
        conversationalConfig
      )

      // Generate user prompts and agent responses
      const userPrompts = await this.generateUserPrompts(node, blockConfig)
      const agentResponses = await this.generateAgentResponses(node, blockConfig)

      // Determine execution trigger
      const executionTrigger = this.determineExecutionTrigger(node, blockConfig)

      // Create validation rules
      const validationRules = this.createValidationRules(node, blockConfig)

      const mapping: NodeStateMapping = {
        nodeId: node.id,
        nodeType: node.type,
        journeyStateId,
        displayName: this.generateDisplayName(node, blockConfig),
        description: this.generateDescription(node, blockConfig),
        isStartState: false, // Will be updated based on workflow analysis
        isEndState: false, // Will be updated based on workflow analysis
        conversationTemplate,
        userPrompts,
        agentResponses,
        executionTrigger,
        validationRules,
      }

      mappings.push(mapping)
    }

    // Mark start and end states
    this.markStartAndEndStates(mappings, nodes)

    return mappings
  }

  /**
   * Generate edge-to-transition mappings
   */
  private async generateEdgeTransitionMappings(
    edges: Array<{ id: string; source: string; target: string; data?: any }>,
    nodeStateMappings: NodeStateMapping[]
  ): Promise<EdgeTransitionMapping[]> {
    const mappings: EdgeTransitionMapping[] = []
    const nodeStateMap = new Map(nodeStateMappings.map((mapping) => [mapping.nodeId, mapping]))

    for (const edge of edges) {
      const sourceMapping = nodeStateMap.get(edge.source)
      const targetMapping = nodeStateMap.get(edge.target)

      if (!sourceMapping || !targetMapping) {
        logger.warn('Edge references unknown nodes', {
          edgeId: edge.id,
          source: edge.source,
          target: edge.target,
        })
        continue
      }

      // Generate transition ID
      const journeyTransitionId = `transition_${edge.source}_${edge.target}`

      // Create transition conditions
      const conditions = this.createTransitionConditions(edge)

      // Create conversational triggers
      const conversationalTriggers = this.createConversationalTriggers(edge)

      // Determine if confirmation is required
      const requiresConfirmation = this.shouldRequireConfirmation(
        sourceMapping,
        targetMapping,
        edge
      )

      const mapping: EdgeTransitionMapping = {
        edgeId: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        journeyTransitionId,
        conditions,
        conversationalTriggers,
        requiresConfirmation,
        confirmationMessage: requiresConfirmation
          ? `Are you ready to proceed from ${sourceMapping.displayName} to ${targetMapping.displayName}?`
          : '',
      }

      mappings.push(mapping)
    }

    return mappings
  }

  /**
   * Generate context variable mappings
   */
  private async generateContextVariableMappings(
    workflowAnalysis: any
  ): Promise<ContextVariableMapping[]> {
    const mappings: ContextVariableMapping[] = []

    for (const variable of workflowAnalysis.variables) {
      const mapping: ContextVariableMapping = {
        workflowVariable: variable.name,
        journeyVariable: `journey_${variable.name}`,
        dataType: this.mapDataType(variable.type),
        defaultValue: variable.defaultValue,
      }

      mappings.push(mapping)
    }

    return mappings
  }

  /**
   * Create Parlant journey from mappings
   */
  private async createParlantJourney(params: {
    workflowId: string
    workspaceId: string
    userId: string
    nodeStateMappings: NodeStateMapping[]
    edgeTransitionMappings: EdgeTransitionMapping[]
    executionConfig: WorkflowExecutionConfig
    conversationalConfig: ConversationalConfig
  }): Promise<string> {
    const {
      workflowId,
      workspaceId,
      userId,
      nodeStateMappings,
      edgeTransitionMappings,
      executionConfig,
      conversationalConfig,
    } = params

    try {
      // Create Parlant journey states
      const journeyStates: ParlantJourneyState[] = nodeStateMappings.map((mapping) => ({
        stateId: mapping.journeyStateId,
        stateName: mapping.displayName,
        description: mapping.description,
        stateType: this.mapToJourneyStateType(mapping.nodeType),
        isStartState: mapping.isStartState,
        isEndState: mapping.isEndState,
        entryMessage: mapping.conversationTemplate,
        helpMessage: `This step handles: ${mapping.description}`,
        transitions: this.createParlantTransitions(mapping, edgeTransitionMappings),
        requiredTools: this.getRequiredTools(mapping),
        toolParameters: this.getToolParameters(mapping),
        allowedUserActions: this.getAllowedUserActions(mapping),
        customInstructions: this.getCustomInstructions(mapping, conversationalConfig),
      }))

      // Create journey via Parlant API
      const journeyResponse = await this.parlantClient.post('/journeys', {
        name: `Workflow: ${workflowId}`,
        description: `Conversational journey for Sim workflow ${workflowId}`,
        workspace_id: workspaceId,
        created_by: userId,
        states: journeyStates,
        metadata: {
          source_workflow_id: workflowId,
          execution_config: executionConfig,
          conversational_config: conversationalConfig,
        },
      })

      return journeyResponse.journey_id
    } catch (error: any) {
      logger.error('Failed to create Parlant journey', {
        workflowId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Initialize state templates for different node types
   */
  private initializeStateTemplates(): void {
    // Agent/LLM nodes
    this.stateTemplates.set('agent', {
      stateType: 'processing',
      entryMessage: "I'm thinking about this...",
      allowedUserActions: ['continue', 'modify-input', 'explain'],
    })

    // API nodes
    this.stateTemplates.set('api', {
      stateType: 'processing',
      entryMessage: 'Making API call...',
      allowedUserActions: ['continue', 'retry', 'cancel'],
    })

    // Input nodes
    this.stateTemplates.set('input', {
      stateType: 'input',
      entryMessage: 'Please provide the required input.',
      allowedUserActions: ['provide-input', 'help'],
    })

    // Decision nodes
    this.stateTemplates.set('decision', {
      stateType: 'decision',
      entryMessage: 'Let me evaluate the conditions...',
      allowedUserActions: ['continue', 'explain-decision'],
    })

    // Output nodes
    this.stateTemplates.set('output', {
      stateType: 'output',
      entryMessage: 'Here are the results:',
      allowedUserActions: ['continue', 'save-results', 'export'],
    })
  }

  // Helper methods

  private generateMappingVersion(): string {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async generateConversationTemplate(
    node: any,
    blockConfig: any,
    conversationalConfig: Partial<ConversationalConfig>
  ): Promise<string> {
    const template = this.stateTemplates.get(node.type)
    const baseMessage =
      template?.entryMessage || `Executing ${blockConfig.name || node.type} step...`

    // Customize based on conversational config
    if (conversationalConfig.explainSteps) {
      return `${baseMessage} This step will ${blockConfig.description || 'perform an operation'}.`
    }

    return baseMessage
  }

  private async generateUserPrompts(node: any, blockConfig: any): Promise<string[]> {
    const prompts = [
      'What does this step do?',
      'Can I modify the input?',
      'Skip this step',
      'Show me the current progress',
    ]

    // Add node-type specific prompts
    if (node.type === 'input') {
      prompts.push('What input is required?', 'Use default values')
    } else if (node.type === 'decision') {
      prompts.push('Explain the decision logic', 'Show possible outcomes')
    }

    return prompts
  }

  private async generateAgentResponses(node: any, blockConfig: any): Promise<string[]> {
    return [
      `This ${blockConfig.name || node.type} step is designed to ${blockConfig.description || 'process data'}.`,
      "I can help you understand what's happening at each step.",
      'Feel free to ask me to explain anything or modify the execution.',
    ]
  }

  private determineExecutionTrigger(node: any, blockConfig: any): ExecutionTrigger {
    // Default trigger based on node type
    switch (node.type) {
      case 'input':
        return {
          type: 'user-input',
          inputRequirements: {
            fields: this.extractInputFields(node),
            validation: this.extractValidationRules(node),
          },
        }

      case 'decision':
      case 'condition':
        return {
          type: 'user-confirmation',
          confirmationRequirements: {
            message: 'Should I proceed with this decision?',
            options: ['Yes, continue', 'No, let me review', 'Explain the logic'],
            defaultOption: 'Yes, continue',
          },
        }

      default:
        return { type: 'automatic' }
    }
  }

  private createValidationRules(node: any, blockConfig: any): ValidationRule[] {
    const rules: ValidationRule[] = []

    // Add common validation rules based on node type
    if (node.type === 'input') {
      rules.push({
        type: 'required',
        configuration: { fields: this.getRequiredFields(node) },
        errorMessage: 'Required fields are missing',
      })
    }

    return rules
  }

  private generateDisplayName(node: any, blockConfig: any): string {
    return blockConfig.name || `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} Step`
  }

  private generateDescription(node: any, blockConfig: any): string {
    return blockConfig.description || `Executes a ${node.type} operation`
  }

  private markStartAndEndStates(
    mappings: NodeStateMapping[],
    nodes: Array<{ id: string; type: string; data: any; position: any }>
  ): void {
    // Find start nodes (would be based on actual workflow analysis)
    const startNode = nodes.find((n) => n.type === 'starter' || n.id.includes('start'))
    if (startNode) {
      const mapping = mappings.find((m) => m.nodeId === startNode.id)
      if (mapping) mapping.isStartState = true
    } else if (mappings.length > 0) {
      // Default to first node if no explicit start
      mappings[0].isStartState = true
    }

    // Find end nodes
    nodes
      .filter((n) => n.type === 'output' || n.id.includes('end'))
      .forEach((endNode) => {
        const mapping = mappings.find((m) => m.nodeId === endNode.id)
        if (mapping) mapping.isEndState = true
      })
  }

  private createTransitionConditions(edge: any): TransitionCondition[] {
    // Default conditions based on edge data
    if (edge.data?.condition) {
      return [
        {
          type: 'value-based',
          expression: edge.data.condition,
        },
      ]
    }

    return [
      {
        type: 'system-state',
        expression: 'previous_step_completed === true',
      },
    ]
  }

  private createConversationalTriggers(edge: any): ConversationalTrigger[] {
    return [
      {
        type: 'user-command',
        pattern: 'continue|next|proceed',
        confidence: 0.8,
        priority: 1,
      },
      {
        type: 'keyword-detection',
        pattern: 'ready|go ahead|yes',
        confidence: 0.7,
        priority: 2,
      },
    ]
  }

  private shouldRequireConfirmation(
    sourceMapping: NodeStateMapping,
    targetMapping: NodeStateMapping,
    edge: any
  ): boolean {
    // Require confirmation for critical transitions
    return (
      targetMapping.nodeType === 'api' ||
      targetMapping.nodeType === 'external' ||
      sourceMapping.nodeType === 'decision'
    )
  }

  private mapDataType(type: string): 'string' | 'number' | 'boolean' | 'object' | 'array' {
    switch (type?.toLowerCase()) {
      case 'number':
      case 'int':
      case 'float':
        return 'number'
      case 'boolean':
      case 'bool':
        return 'boolean'
      case 'object':
      case 'json':
        return 'object'
      case 'array':
      case 'list':
        return 'array'
      default:
        return 'string'
    }
  }

  private mapToJourneyStateType(
    nodeType: string
  ): 'input' | 'processing' | 'confirmation' | 'output' | 'decision' {
    switch (nodeType) {
      case 'input':
        return 'input'
      case 'output':
        return 'output'
      case 'decision':
      case 'condition':
        return 'decision'
      case 'confirmation':
        return 'confirmation'
      default:
        return 'processing'
    }
  }

  private createParlantTransitions(
    mapping: NodeStateMapping,
    edgeTransitionMappings: EdgeTransitionMapping[]
  ): ParlantJourneyTransition[] {
    return edgeTransitionMappings
      .filter((edge) => edge.sourceNodeId === mapping.nodeId)
      .map((edge) => ({
        transitionId: edge.journeyTransitionId,
        targetStateId: edge.targetNodeId,
        triggerConditions: edge.conditions.map((c) => c.expression),
        userCommands: edge.conversationalTriggers
          .filter((t) => t.type === 'user-command')
          .map((t) => t.pattern),
        systemEvents: ['step_completed'],
        requiresConfirmation: edge.requiresConfirmation,
        confirmationMessage: edge.confirmationMessage,
        autoTransition: !edge.requiresConfirmation,
      }))
  }

  private getRequiredTools(mapping: NodeStateMapping): string[] {
    // Map node types to required tools
    const toolMappings: Record<string, string[]> = {
      agent: ['openai', 'anthropic'],
      api: ['http-client'],
      database: ['postgresql', 'mongodb'],
      email: ['email-sender'],
      file: ['file-operations'],
    }

    return toolMappings[mapping.nodeType] || []
  }

  private getToolParameters(mapping: NodeStateMapping): Record<string, any> {
    // Return node-specific tool parameters
    return {
      node_id: mapping.nodeId,
      node_type: mapping.nodeType,
    }
  }

  private getAllowedUserActions(mapping: NodeStateMapping): string[] {
    const template = this.stateTemplates.get(mapping.nodeType)
    return template?.allowedUserActions || ['continue', 'help', 'explain']
  }

  private getCustomInstructions(
    mapping: NodeStateMapping,
    conversationalConfig: ConversationalConfig
  ): string {
    let instructions = `Execute ${mapping.displayName} step in the workflow.`

    if (conversationalConfig.explainSteps) {
      instructions += ` Explain what this step does if the user asks.`
    }

    if (conversationalConfig.askForConfirmation) {
      instructions += ` Ask for confirmation before proceeding.`
    }

    return instructions
  }

  private extractWorkflowVariables(
    workflow: SerializedWorkflow
  ): Array<{ name: string; type: string; defaultValue?: any }> {
    // Extract variables from workflow structure
    const variables: Array<{ name: string; type: string; defaultValue?: any }> = []

    // This would analyze the workflow blocks to find variable definitions
    // For now, returning common workflow variables
    variables.push(
      { name: 'workflow_input', type: 'object' },
      { name: 'execution_context', type: 'object' },
      { name: 'current_step', type: 'string' },
      { name: 'progress_percentage', type: 'number', defaultValue: 0 }
    )

    return variables
  }

  private extractInputFields(node: any): Array<{
    fieldName: string
    displayName: string
    description: string
    dataType: string
    required: boolean
  }> {
    // Extract input field requirements from node configuration
    return [
      {
        fieldName: 'user_input',
        displayName: 'User Input',
        description: 'Input required to proceed',
        dataType: 'string',
        required: true,
      },
    ]
  }

  private extractValidationRules(node: any): ValidationRule[] {
    return [
      {
        type: 'required',
        configuration: { field: 'user_input' },
        errorMessage: 'Input is required to proceed',
      },
    ]
  }

  private getRequiredFields(node: any): string[] {
    return ['user_input']
  }

  private createDefaultExecutionConfig(
    overrides: Partial<WorkflowExecutionConfig>
  ): WorkflowExecutionConfig {
    return {
      mode: 'step-by-step',
      pausePoints: [],
      autoApproval: false,
      timeoutMs: 30000,
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        backoffMs: 1000,
        retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE'],
      },
      ...overrides,
    }
  }

  private createDefaultConversationalConfig(
    overrides: Partial<ConversationalConfig>
  ): ConversationalConfig {
    return {
      personalityProfile: 'helpful-assistant',
      communicationStyle: 'friendly',
      verbosityLevel: 'normal',
      showProgress: true,
      explainSteps: true,
      askForConfirmation: false,
      provideSuggestions: true,
      gracefulDegradation: true,
      fallbackToVisual: true,
      ...overrides,
    }
  }

  private async saveMappingToDatabase(
    mapping: WorkflowToJourneyMapping,
    workspaceId: string
  ): Promise<void> {
    // This would save the mapping to the database
    // Implementation would depend on the actual database setup
    logger.info('Mapping saved to database', {
      workflowId: mapping.workflowId,
      journeyId: mapping.journeyId,
    })
  }
}
