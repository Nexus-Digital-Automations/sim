/**
 * Workflow to Journey Mapping System - Validation Engine
 *
 * Comprehensive validation system for both input workflows and output journeys.
 * Ensures data integrity, validates conversion rules, and provides detailed
 * feedback on potential issues.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ConversionError,
  ConversionWarning,
  NodeConverter,
  ParlantJourney,
  ParlantState,
  ParlantTransition,
  ReactFlowNode,
  ReactFlowWorkflow,
  ValidationResult,
} from '../types'

const logger = createLogger('ValidationEngine')

/**
 * Validates workflows and journeys for conversion integrity
 */
export class ValidationEngine {
  constructor() {
    logger.info('ValidationEngine initialized')
  }

  /**
   * Validate a ReactFlow workflow before conversion
   */
  async validateWorkflow(
    workflow: ReactFlowWorkflow,
    availableConverters: Map<string, NodeConverter>
  ): Promise<ValidationResult> {
    logger.info('Validating workflow', {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    })

    const errors: ConversionError[] = []
    const warnings: ConversionWarning[] = []

    try {
      // Basic structure validation
      await this.validateWorkflowStructure(workflow, errors, warnings)

      // Node validation
      await this.validateNodes(workflow.nodes, availableConverters, errors, warnings)

      // Edge validation
      await this.validateEdges(workflow.edges, workflow.nodes, errors, warnings)

      // Workflow flow validation
      await this.validateWorkflowFlow(workflow, errors, warnings)

      // Data integrity validation
      await this.validateDataIntegrity(workflow, errors, warnings)

      const isValid =
        errors.filter((e) => e.severity === 'critical' || e.severity === 'error').length === 0

      logger.info('Workflow validation completed', {
        workflowId: workflow.id,
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
      })

      return { valid: isValid, errors, warnings }
    } catch (error) {
      logger.error('Workflow validation failed', {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : String(error),
      })

      errors.push({
        code: 'VALIDATION_SYSTEM_ERROR',
        message: `Validation system error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical',
        suggestions: [
          'Check workflow structure',
          'Verify validation system integrity',
          'Contact support if issue persists',
        ],
      })

      return { valid: false, errors, warnings }
    }
  }

  /**
   * Validate a converted Parlant journey
   */
  async validateJourney(journey: ParlantJourney): Promise<ValidationResult> {
    logger.info('Validating journey', {
      journeyId: journey.id,
      stateCount: journey.states.length,
      transitionCount: journey.transitions.length,
    })

    const errors: ConversionError[] = []
    const warnings: ConversionWarning[] = []

    try {
      // Basic structure validation
      await this.validateJourneyStructure(journey, errors, warnings)

      // State validation
      await this.validateStates(journey.states, errors, warnings)

      // Transition validation
      await this.validateTransitions(journey.transitions, journey.states, errors, warnings)

      // Journey flow validation
      await this.validateJourneyFlow(journey, errors, warnings)

      // Semantic validation
      await this.validateJourneySemantics(journey, errors, warnings)

      const isValid =
        errors.filter((e) => e.severity === 'critical' || e.severity === 'error').length === 0

      logger.info('Journey validation completed', {
        journeyId: journey.id,
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
      })

      return { valid: isValid, errors, warnings }
    } catch (error) {
      logger.error('Journey validation failed', {
        journeyId: journey.id,
        error: error instanceof Error ? error.message : String(error),
      })

      errors.push({
        code: 'JOURNEY_VALIDATION_ERROR',
        message: `Journey validation error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical',
        suggestions: [
          'Check journey structure',
          'Verify conversion output',
          'Review validation logic',
        ],
      })

      return { valid: false, errors, warnings }
    }
  }

  /**
   * Validate conversion result integrity
   */
  async validateConversionResult(
    originalWorkflow: ReactFlowWorkflow,
    convertedJourney: ParlantJourney
  ): Promise<ValidationResult> {
    logger.info('Validating conversion result integrity', {
      workflowId: originalWorkflow.id,
      journeyId: convertedJourney.id,
    })

    const errors: ConversionError[] = []
    const warnings: ConversionWarning[] = []

    try {
      // Validate preservation of essential data
      await this.validateDataPreservation(originalWorkflow, convertedJourney, errors, warnings)

      // Validate flow preservation
      await this.validateFlowPreservation(originalWorkflow, convertedJourney, errors, warnings)

      // Validate metadata integrity
      await this.validateMetadataIntegrity(originalWorkflow, convertedJourney, errors, warnings)

      const isValid =
        errors.filter((e) => e.severity === 'critical' || e.severity === 'error').length === 0

      logger.info('Conversion result validation completed', {
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
      })

      return { valid: isValid, errors, warnings }
    } catch (error) {
      logger.error('Conversion result validation failed', {
        error: error instanceof Error ? error.message : String(error),
      })

      errors.push({
        code: 'CONVERSION_VALIDATION_ERROR',
        message: `Conversion validation error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical',
        suggestions: ['Review conversion process', 'Check data integrity'],
      })

      return { valid: false, errors, warnings }
    }
  }

  // ========================================
  // WORKFLOW VALIDATION METHODS
  // ========================================

  private async validateWorkflowStructure(
    workflow: ReactFlowWorkflow,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check required fields
    if (!workflow.id) {
      errors.push({
        code: 'MISSING_WORKFLOW_ID',
        message: 'Workflow must have an ID',
        severity: 'critical',
        suggestions: ['Add unique ID to workflow'],
      })
    }

    if (!workflow.name || workflow.name.trim().length === 0) {
      warnings.push({
        code: 'MISSING_WORKFLOW_NAME',
        message: 'Workflow should have a descriptive name',
        impact: 'low',
        suggestions: ['Add meaningful name to workflow'],
      })
    }

    // Check nodes and edges exist
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push({
        code: 'INVALID_NODES_STRUCTURE',
        message: 'Workflow nodes must be an array',
        severity: 'critical',
        suggestions: ['Ensure nodes is a valid array'],
      })
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      errors.push({
        code: 'INVALID_EDGES_STRUCTURE',
        message: 'Workflow edges must be an array',
        severity: 'critical',
        suggestions: ['Ensure edges is a valid array'],
      })
    }

    // Check for empty workflow
    if (workflow.nodes.length === 0) {
      warnings.push({
        code: 'EMPTY_WORKFLOW',
        message: 'Workflow has no nodes',
        impact: 'high',
        suggestions: ['Add nodes to create a meaningful workflow'],
      })
    }
  }

  private async validateNodes(
    nodes: ReactFlowNode[],
    availableConverters: Map<string, NodeConverter>,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    const nodeIds = new Set<string>()
    let hasStarterNode = false

    for (const node of nodes) {
      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        errors.push({
          code: 'DUPLICATE_NODE_ID',
          message: `Duplicate node ID found: ${node.id}`,
          nodeId: node.id,
          severity: 'critical',
          suggestions: ['Ensure all node IDs are unique'],
        })
      }
      nodeIds.add(node.id)

      // Check required node fields
      if (!node.id) {
        errors.push({
          code: 'MISSING_NODE_ID',
          message: 'Node is missing required ID',
          severity: 'critical',
          suggestions: ['Add unique ID to all nodes'],
        })
      }

      if (!node.type) {
        errors.push({
          code: 'MISSING_NODE_TYPE',
          message: `Node ${node.id} is missing type`,
          nodeId: node.id,
          severity: 'error',
          suggestions: ['Specify node type'],
        })
      }

      // Check for starter nodes
      const nodeType = node.data?.type || node.type
      if (nodeType === 'starter' || nodeType === 'trigger' || nodeType === 'webhook') {
        hasStarterNode = true
      }

      // Check if converter exists
      const hasConverter = this.findConverterForNode(node, availableConverters)
      if (!hasConverter) {
        warnings.push({
          code: 'NO_CONVERTER_AVAILABLE',
          message: `No converter available for node type: ${nodeType}`,
          nodeId: node.id,
          impact: 'high',
          suggestions: [
            'Register a converter for this node type',
            'Use generic converter',
            'Convert node to supported type',
          ],
        })
      }

      // Validate node position
      if (
        !node.position ||
        typeof node.position.x !== 'number' ||
        typeof node.position.y !== 'number'
      ) {
        warnings.push({
          code: 'INVALID_NODE_POSITION',
          message: `Node ${node.id} has invalid position`,
          nodeId: node.id,
          impact: 'low',
          suggestions: ['Set valid x,y coordinates for node position'],
        })
      }
    }

    // Check for starter node
    if (!hasStarterNode) {
      warnings.push({
        code: 'NO_STARTER_NODE',
        message: 'Workflow has no starter/trigger node',
        impact: 'high',
        suggestions: [
          'Add a starter node to define workflow entry point',
          'Add trigger conditions for workflow activation',
        ],
      })
    }
  }

  private async validateEdges(
    edges: any[],
    nodes: ReactFlowNode[],
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    const nodeIds = new Set(nodes.map((n) => n.id))
    const edgeIds = new Set<string>()

    for (const edge of edges) {
      // Check for duplicate edge IDs
      if (edgeIds.has(edge.id)) {
        errors.push({
          code: 'DUPLICATE_EDGE_ID',
          message: `Duplicate edge ID found: ${edge.id}`,
          severity: 'error',
          suggestions: ['Ensure all edge IDs are unique'],
        })
      }
      edgeIds.add(edge.id)

      // Check required fields
      if (!edge.source) {
        errors.push({
          code: 'MISSING_EDGE_SOURCE',
          message: `Edge ${edge.id} is missing source`,
          severity: 'critical',
          suggestions: ['Specify source node for edge'],
        })
      }

      if (!edge.target) {
        errors.push({
          code: 'MISSING_EDGE_TARGET',
          message: `Edge ${edge.id} is missing target`,
          severity: 'critical',
          suggestions: ['Specify target node for edge'],
        })
      }

      // Check if referenced nodes exist
      if (edge.source && !nodeIds.has(edge.source)) {
        errors.push({
          code: 'INVALID_EDGE_SOURCE',
          message: `Edge ${edge.id} references non-existent source node: ${edge.source}`,
          severity: 'error',
          suggestions: ['Ensure edge source references existing node'],
        })
      }

      if (edge.target && !nodeIds.has(edge.target)) {
        errors.push({
          code: 'INVALID_EDGE_TARGET',
          message: `Edge ${edge.id} references non-existent target node: ${edge.target}`,
          severity: 'error',
          suggestions: ['Ensure edge target references existing node'],
        })
      }

      // Check for self-loops
      if (edge.source === edge.target) {
        warnings.push({
          code: 'SELF_LOOP_EDGE',
          message: `Edge ${edge.id} creates a self-loop on node ${edge.source}`,
          impact: 'medium',
          suggestions: [
            'Review if self-loop is intentional',
            'Consider workflow logic implications',
          ],
        })
      }
    }
  }

  private async validateWorkflowFlow(
    workflow: ReactFlowWorkflow,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check for disconnected nodes
    const connectedNodes = new Set<string>()
    workflow.edges.forEach((edge) => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    const disconnectedNodes = workflow.nodes.filter((node) => !connectedNodes.has(node.id))
    if (disconnectedNodes.length > 0) {
      warnings.push({
        code: 'DISCONNECTED_NODES',
        message: `Found ${disconnectedNodes.length} disconnected nodes`,
        impact: 'medium',
        suggestions: [
          'Connect all nodes to workflow flow',
          'Remove unused nodes',
          'Review workflow logic',
        ],
      })
    }

    // Check for potential infinite loops
    const cycles = this.detectCycles(workflow.nodes, workflow.edges)
    if (cycles.length > 0) {
      warnings.push({
        code: 'POTENTIAL_CYCLES',
        message: `Found ${cycles.length} potential cycles in workflow`,
        impact: 'high',
        suggestions: [
          'Review workflow loops for termination conditions',
          'Add proper exit conditions',
          'Verify loop logic is correct',
        ],
      })
    }
  }

  private async validateDataIntegrity(
    workflow: ReactFlowWorkflow,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check for data consistency
    workflow.nodes.forEach((node) => {
      if (node.data && typeof node.data !== 'object') {
        errors.push({
          code: 'INVALID_NODE_DATA',
          message: `Node ${node.id} has invalid data structure`,
          nodeId: node.id,
          severity: 'error',
          suggestions: ['Ensure node data is a valid object'],
        })
      }

      // Check for missing required data fields based on node type
      this.validateNodeDataByType(node, errors, warnings)
    })
  }

  // ========================================
  // JOURNEY VALIDATION METHODS
  // ========================================

  private async validateJourneyStructure(
    journey: ParlantJourney,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check required fields
    if (!journey.id) {
      errors.push({
        code: 'MISSING_JOURNEY_ID',
        message: 'Journey must have an ID',
        severity: 'critical',
        suggestions: ['Add unique ID to journey'],
      })
    }

    if (!journey.title || journey.title.trim().length === 0) {
      warnings.push({
        code: 'MISSING_JOURNEY_TITLE',
        message: 'Journey should have a descriptive title',
        impact: 'low',
        suggestions: ['Add meaningful title to journey'],
      })
    }

    // Check states and transitions
    if (!journey.states || !Array.isArray(journey.states)) {
      errors.push({
        code: 'INVALID_STATES_STRUCTURE',
        message: 'Journey states must be an array',
        severity: 'critical',
        suggestions: ['Ensure states is a valid array'],
      })
    }

    if (!journey.transitions || !Array.isArray(journey.transitions)) {
      errors.push({
        code: 'INVALID_TRANSITIONS_STRUCTURE',
        message: 'Journey transitions must be an array',
        severity: 'critical',
        suggestions: ['Ensure transitions is a valid array'],
      })
    }
  }

  private async validateStates(
    states: ParlantState[],
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    const stateIds = new Set<string>()
    let hasInitialState = false

    for (const state of states) {
      // Check for duplicate IDs
      if (stateIds.has(state.id)) {
        errors.push({
          code: 'DUPLICATE_STATE_ID',
          message: `Duplicate state ID found: ${state.id}`,
          severity: 'critical',
          suggestions: ['Ensure all state IDs are unique'],
        })
      }
      stateIds.add(state.id)

      // Check required fields
      if (!state.id) {
        errors.push({
          code: 'MISSING_STATE_ID',
          message: 'State is missing required ID',
          severity: 'critical',
          suggestions: ['Add unique ID to all states'],
        })
      }

      if (!state.type) {
        errors.push({
          code: 'MISSING_STATE_TYPE',
          message: `State ${state.id} is missing type`,
          severity: 'error',
          suggestions: ['Specify state type'],
        })
      }

      // Check for initial state
      if (state.type === 'initial') {
        hasInitialState = true
      }

      // Validate state content
      this.validateStateByType(state, errors, warnings)
    }

    // Check for initial state
    if (!hasInitialState) {
      errors.push({
        code: 'NO_INITIAL_STATE',
        message: 'Journey must have an initial state',
        severity: 'critical',
        suggestions: ['Add an initial state to define journey entry point'],
      })
    }
  }

  private async validateTransitions(
    transitions: ParlantTransition[],
    states: ParlantState[],
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    const stateIds = new Set(states.map((s) => s.id))
    const transitionIds = new Set<string>()

    for (const transition of transitions) {
      // Check for duplicate IDs
      if (transitionIds.has(transition.id)) {
        errors.push({
          code: 'DUPLICATE_TRANSITION_ID',
          message: `Duplicate transition ID found: ${transition.id}`,
          severity: 'error',
          suggestions: ['Ensure all transition IDs are unique'],
        })
      }
      transitionIds.add(transition.id)

      // Check required fields
      if (!transition.sourceStateId) {
        errors.push({
          code: 'MISSING_TRANSITION_SOURCE',
          message: `Transition ${transition.id} is missing source state`,
          severity: 'critical',
          suggestions: ['Specify source state for transition'],
        })
      }

      if (!transition.targetStateId) {
        errors.push({
          code: 'MISSING_TRANSITION_TARGET',
          message: `Transition ${transition.id} is missing target state`,
          severity: 'critical',
          suggestions: ['Specify target state for transition'],
        })
      }

      // Check if referenced states exist
      if (transition.sourceStateId && !stateIds.has(transition.sourceStateId)) {
        errors.push({
          code: 'INVALID_TRANSITION_SOURCE',
          message: `Transition ${transition.id} references non-existent source state: ${transition.sourceStateId}`,
          severity: 'error',
          suggestions: ['Ensure transition source references existing state'],
        })
      }

      if (transition.targetStateId && !stateIds.has(transition.targetStateId)) {
        errors.push({
          code: 'INVALID_TRANSITION_TARGET',
          message: `Transition ${transition.id} references non-existent target state: ${transition.targetStateId}`,
          severity: 'error',
          suggestions: ['Ensure transition target references existing state'],
        })
      }
    }
  }

  private async validateJourneyFlow(
    journey: ParlantJourney,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check for unreachable states
    const reachableStates = new Set<string>()
    const initialStates = journey.states.filter((s) => s.type === 'initial')

    if (initialStates.length > 0) {
      // Start from initial states and follow transitions
      const queue = [...initialStates.map((s) => s.id)]

      while (queue.length > 0) {
        const currentStateId = queue.shift()!
        if (reachableStates.has(currentStateId)) continue

        reachableStates.add(currentStateId)

        // Find outgoing transitions
        const outgoingTransitions = journey.transitions.filter(
          (t) => t.sourceStateId === currentStateId
        )
        outgoingTransitions.forEach((t) => {
          if (!reachableStates.has(t.targetStateId)) {
            queue.push(t.targetStateId)
          }
        })
      }
    }

    const unreachableStates = journey.states.filter((s) => !reachableStates.has(s.id))
    if (unreachableStates.length > 0) {
      warnings.push({
        code: 'UNREACHABLE_STATES',
        message: `Found ${unreachableStates.length} unreachable states`,
        impact: 'medium',
        suggestions: [
          'Connect unreachable states to journey flow',
          'Remove unused states',
          'Review journey logic',
        ],
      })
    }
  }

  private async validateJourneySemantics(
    journey: ParlantJourney,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check for semantic consistency
    journey.states.forEach((state) => {
      // Tool states should have tools
      if (state.type === 'tool' && (!state.tools || state.tools.length === 0)) {
        warnings.push({
          code: 'TOOL_STATE_NO_TOOLS',
          message: `Tool state ${state.id} has no tools configured`,
          impact: 'high',
          suggestions: ['Add tools to tool state', 'Change state type if tools not needed'],
        })
      }

      // Chat states should have content
      if (state.type === 'chat' && (!state.content || state.content.trim().length === 0)) {
        warnings.push({
          code: 'CHAT_STATE_NO_CONTENT',
          message: `Chat state ${state.id} has no content`,
          impact: 'medium',
          suggestions: ['Add content to chat state', 'Define what the agent should say'],
        })
      }
    })
  }

  // ========================================
  // CONVERSION INTEGRITY VALIDATION
  // ========================================

  private async validateDataPreservation(
    originalWorkflow: ReactFlowWorkflow,
    convertedJourney: ParlantJourney,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check if original workflow ID is preserved
    if (convertedJourney.metadata.originalWorkflowId !== originalWorkflow.id) {
      errors.push({
        code: 'WORKFLOW_ID_NOT_PRESERVED',
        message: 'Original workflow ID not preserved in journey metadata',
        severity: 'error',
        suggestions: ['Ensure workflow ID is preserved during conversion'],
      })
    }

    // Check node count preservation (approximately)
    const significantNodeLoss = originalWorkflow.nodes.length - convertedJourney.states.length
    if (significantNodeLoss > originalWorkflow.nodes.length * 0.5) {
      warnings.push({
        code: 'SIGNIFICANT_NODE_LOSS',
        message: `Significant loss of nodes during conversion: ${significantNodeLoss} nodes lost`,
        impact: 'high',
        suggestions: [
          'Review node conversion process',
          'Check for unsupported node types',
          'Verify all nodes are being processed',
        ],
      })
    }
  }

  private async validateFlowPreservation(
    originalWorkflow: ReactFlowWorkflow,
    convertedJourney: ParlantJourney,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check edge to transition conversion
    const significantTransitionLoss =
      originalWorkflow.edges.length - convertedJourney.transitions.length
    if (significantTransitionLoss > originalWorkflow.edges.length * 0.3) {
      warnings.push({
        code: 'SIGNIFICANT_TRANSITION_LOSS',
        message: `Significant loss of connections during conversion: ${significantTransitionLoss} connections lost`,
        impact: 'high',
        suggestions: [
          'Review edge conversion process',
          'Check for unsupported edge types',
          'Verify all edges are being processed',
        ],
      })
    }
  }

  private async validateMetadataIntegrity(
    originalWorkflow: ReactFlowWorkflow,
    convertedJourney: ParlantJourney,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): Promise<void> {
    // Check metadata structure
    if (!convertedJourney.metadata) {
      errors.push({
        code: 'MISSING_CONVERSION_METADATA',
        message: 'Converted journey missing metadata',
        severity: 'error',
        suggestions: ['Add conversion metadata to journey'],
      })
      return
    }

    // Check required metadata fields
    if (!convertedJourney.metadata.conversionTimestamp) {
      warnings.push({
        code: 'MISSING_CONVERSION_TIMESTAMP',
        message: 'Conversion timestamp missing from metadata',
        impact: 'low',
        suggestions: ['Add conversion timestamp to metadata'],
      })
    }

    if (!convertedJourney.metadata.conversionVersion) {
      warnings.push({
        code: 'MISSING_CONVERSION_VERSION',
        message: 'Conversion version missing from metadata',
        impact: 'low',
        suggestions: ['Add conversion version to metadata'],
      })
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private findConverterForNode(
    node: ReactFlowNode,
    availableConverters: Map<string, NodeConverter>
  ): boolean {
    // Check exact type match
    if (availableConverters.has(node.type)) {
      const converter = availableConverters.get(node.type)
      if (converter?.canConvert(node)) return true
    }

    // Check data type match
    if (node.data?.type && availableConverters.has(node.data.type)) {
      const converter = availableConverters.get(node.data.type)
      if (converter?.canConvert(node)) return true
    }

    // Check for generic converter
    const genericConverter = availableConverters.get('generic')
    if (genericConverter?.canConvert(node)) return true

    return false
  }

  private detectCycles(nodes: ReactFlowNode[], edges: any[]): string[][] {
    // Simple cycle detection using DFS
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    const buildAdjacencyList = () => {
      const adj = new Map<string, string[]>()
      nodes.forEach((node) => {
        adj.set(node.id, [])
      })
      edges.forEach((edge) => {
        if (adj.has(edge.source)) {
          adj.get(edge.source)!.push(edge.target)
        }
      })
      return adj
    }

    const dfs = (nodeId: string, adj: Map<string, string[]>) => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      path.push(nodeId)

      const neighbors = adj.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, adj)) return true
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor)
          cycles.push(path.slice(cycleStart))
          return true
        }
      }

      recursionStack.delete(nodeId)
      path.pop()
      return false
    }

    const adj = buildAdjacencyList()
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, adj)
      }
    }

    return cycles
  }

  private validateNodeDataByType(
    node: ReactFlowNode,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): void {
    const nodeType = node.data?.type || node.type

    switch (nodeType) {
      case 'api':
      case 'http':
        if (!node.data?.url && !node.data?.endpoint) {
          warnings.push({
            code: 'API_NODE_MISSING_URL',
            message: `API node ${node.id} missing URL configuration`,
            nodeId: node.id,
            impact: 'high',
            suggestions: ['Add URL or endpoint to API node configuration'],
          })
        }
        break

      case 'condition':
        if (!node.data?.condition && !node.data?.config?.condition) {
          warnings.push({
            code: 'CONDITION_NODE_MISSING_CONDITION',
            message: `Condition node ${node.id} missing condition logic`,
            nodeId: node.id,
            impact: 'high',
            suggestions: ['Add condition logic to condition node'],
          })
        }
        break

      case 'agent':
      case 'ai':
        if (!node.data?.prompt && !node.data?.systemPrompt) {
          warnings.push({
            code: 'AGENT_NODE_MISSING_PROMPT',
            message: `Agent node ${node.id} missing prompt configuration`,
            nodeId: node.id,
            impact: 'medium',
            suggestions: ['Add prompt or system prompt to agent node'],
          })
        }
        break
    }
  }

  private validateStateByType(
    state: ParlantState,
    errors: ConversionError[],
    warnings: ConversionWarning[]
  ): void {
    switch (state.type) {
      case 'tool':
        if (!state.tools || state.tools.length === 0) {
          warnings.push({
            code: 'TOOL_STATE_NO_TOOLS',
            message: `Tool state ${state.id} has no tools configured`,
            impact: 'high',
            suggestions: ['Add tools to tool state configuration'],
          })
        }
        break

      case 'chat':
        if (!state.content || state.content.trim().length === 0) {
          warnings.push({
            code: 'CHAT_STATE_NO_CONTENT',
            message: `Chat state ${state.id} has no content`,
            impact: 'medium',
            suggestions: ['Add content to define what the agent should communicate'],
          })
        }
        break

      case 'condition':
        // Condition states should have multiple outgoing transitions
        // This would be validated in transition validation
        break
    }
  }
}
