/**
 * Journey Mapping Service
 *
 * Converts ReactFlow workflow analysis results into Parlant journey definitions
 * with full fidelity preservation and optimized execution paths.
 */

import type { JourneyStateType } from "@sim/db/parlant";
import type {
  ChatStateConfiguration,
  ComplexityMetrics,
  ConditionalNode,
  ConversionContext,
  ErrorMapping,
  FinalStateConfiguration,
  JourneyDefinition,
  JourneyMetadata,
  JourneyStateConfiguration,
  JourneyStateDefinition,
  JourneyTransitionDefinition,
  LoopStructure,
  ParallelSection,
  ParameterMapping,
  PerformanceMetrics,
  PreservedAttributes,
  ReactFlowEdge,
  ReactFlowNode,
  SimBlockType,
  ToolDependency,
  ToolStateConfiguration,
  ValidationMetrics,
  VariableUsage,
  WorkflowAnalysisResult,
} from "./types";

/**
 * Journey Mapping Service that converts workflow analysis results
 * into Parlant-compatible journey definitions with full fidelity.
 */
export class JourneyMappingService {
  private context: ConversionContext;
  private cache: Map<string, any> = new Map();
  private toolMappings: Map<string, ToolDependency> = new Map();
  private stateIdMapping: Map<string, string> = new Map();
  private transitionIdMapping: Map<string, string> = new Map();

  constructor(context: ConversionContext) {
    this.context = context;
    this.cache = context.cache || new Map();
  }

  /**
   * Main conversion method - converts workflow analysis to journey definition
   */
  async mapToJourney(
    analysis: WorkflowAnalysisResult,
  ): Promise<JourneyDefinition> {
    const startTime = Date.now();
    const workflow = analysis.workflow;

    this.log("info", "Starting journey mapping", {
      workflowId: workflow.id,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    });

    try {
      // Reset mappings for this conversion
      this.stateIdMapping.clear();
      this.transitionIdMapping.clear();

      // Phase 1: Initialize tool mappings
      await this.initializeToolMappings(analysis);

      // Phase 2: Convert nodes to journey states
      const states = await this.convertNodesToStates(analysis);

      // Phase 3: Convert edges to journey transitions
      const transitions = await this.convertEdgesToTransitions(
        analysis,
        states,
      );

      // Phase 4: Process complex structures
      await this.processComplexStructures(analysis, states, transitions);

      // Phase 5: Optimize journey structure
      await this.optimizeJourneyStructure(states, transitions, analysis);

      // Phase 6: Build journey metadata
      const metadata = await this.buildJourneyMetadata(
        analysis,
        states,
        transitions,
      );

      // Phase 7: Create final journey definition
      const journey: JourneyDefinition = {
        id: `journey_${workflow.id}`,
        title: workflow.name,
        description: `Converted journey: ${workflow.description || workflow.name}`,
        workspaceId: workflow.workspaceId,
        createdBy: this.context.userId,
        status: "draft",
        conditions: [
          `User wants to execute workflow: ${workflow.name}`,
          `Workflow ID: ${workflow.id}`,
        ],
        isActive: false,
        version: 1,
        metadata: JSON.stringify(metadata),
        states,
        transitions,
      };

      // Validate journey structure
      await this.validateJourneyStructure(journey);

      const mappingTime = Date.now() - startTime;
      this.log("info", "Journey mapping completed", {
        workflowId: workflow.id,
        journeyId: journey.id,
        stateCount: states.length,
        transitionCount: transitions.length,
        mappingTimeMs: mappingTime,
      });

      return journey;
    } catch (error) {
      const mappingTime = Date.now() - startTime;
      this.log("error", "Journey mapping failed", {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : "Unknown error",
        mappingTimeMs: mappingTime,
      });
      throw error;
    }
  }

  /**
   * Initialize tool mappings for the workflow
   */
  private async initializeToolMappings(
    analysis: WorkflowAnalysisResult,
  ): Promise<void> {
    this.log("debug", "Initializing tool mappings", {
      toolCount: analysis.toolAnalysis.totalTools,
    });

    for (const compatibility of analysis.toolAnalysis.toolCompatibility) {
      const toolMapping: ToolDependency = {
        toolId: compatibility.toolId,
        toolName: compatibility.toolId,
        toolType: this.inferToolType(compatibility.toolId),
        configuration: {},
        inputMapping: await this.generateInputMapping(
          compatibility.toolId,
          analysis,
        ),
        outputMapping: await this.generateOutputMapping(
          compatibility.toolId,
          analysis,
        ),
        errorMapping: await this.generateErrorMapping(compatibility.toolId),
        compatibilityLevel: compatibility.compatibility,
        migrationRequired: compatibility.compatibility !== "full",
        deprecationWarning: compatibility.issues.find((issue) =>
          issue.includes("deprecated"),
        ),
      };

      this.toolMappings.set(compatibility.toolId, toolMapping);
    }
  }

  /**
   * Convert workflow nodes to journey states
   */
  private async convertNodesToStates(
    analysis: WorkflowAnalysisResult,
  ): Promise<JourneyStateDefinition[]> {
    const { workflow, structure } = analysis;
    const states: JourneyStateDefinition[] = [];

    this.log("debug", "Converting nodes to states", {
      nodeCount: workflow.nodes.length,
    });

    for (const node of workflow.nodes) {
      const state = await this.convertNodeToState(node, analysis);
      if (state) {
        states.push(state);
        this.stateIdMapping.set(node.id, state.id);
      }
    }

    // Ensure we have proper entry and exit states
    await this.ensureProperEntryAndExitStates(states, structure);

    return states;
  }

  /**
   * Convert a single workflow node to a journey state
   */
  private async convertNodeToState(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): Promise<JourneyStateDefinition | null> {
    const blockType = node.type as SimBlockType;
    const stateId = `state_${node.id}_${Date.now()}`;

    // Determine state type and configuration based on node type
    let stateType: JourneyStateType;
    let configuration: JourneyStateConfiguration;

    switch (blockType) {
      case "start":
        // Start nodes don't map directly to states - handled by entry point logic
        return null;

      case "end":
        stateType = "final";
        configuration = this.createFinalStateConfiguration(node, analysis);
        break;

      case "tool":
        stateType = "tool";
        configuration = await this.createToolStateConfiguration(node, analysis);
        break;

      case "condition":
        stateType = "chat";
        configuration = this.createConditionalStateConfiguration(
          node,
          analysis,
        );
        break;

      case "user_input":
        stateType = "chat";
        configuration = this.createChatStateConfiguration(node, analysis);
        break;

      case "merge":
      case "parallel_join":
        // Merge nodes are handled by transition logic - they become implicit
        return null;

      case "parallel_split":
        stateType = "chat";
        configuration = this.createParallelSplitConfiguration(node, analysis);
        break;

      case "loop":
        stateType = "chat";
        configuration = this.createLoopStateConfiguration(node, analysis);
        break;

      default:
        // Default to tool state for unknown types
        stateType = "tool";
        configuration = await this.createDefaultToolStateConfiguration(
          node,
          analysis,
        );
        break;
    }

    const state: JourneyStateDefinition = {
      id: stateId,
      name: node.data?.label || node.id,
      description:
        node.data?.description ||
        `State converted from ${blockType} node: ${node.id}`,
      stateType,
      configuration: JSON.stringify(configuration),
      isInitial: false, // Will be set later for entry points
      isFinal: stateType === "final",
      position: node.position,
      originalNodeId: node.id,
      blockType,
      dependencies: this.getNodeDependencies(node.id, analysis),
      executionGroup: this.getExecutionGroup(node, analysis),
      errorHandling: this.createErrorHandling(node, analysis),
    };

    return state;
  }

  /**
   * Convert workflow edges to journey transitions
   */
  private async convertEdgesToTransitions(
    analysis: WorkflowAnalysisResult,
    states: JourneyStateDefinition[],
  ): Promise<JourneyTransitionDefinition[]> {
    const { workflow } = analysis;
    const transitions: JourneyTransitionDefinition[] = [];

    this.log("debug", "Converting edges to transitions", {
      edgeCount: workflow.edges.length,
    });

    for (const edge of workflow.edges) {
      const transition = await this.convertEdgeToTransition(
        edge,
        states,
        analysis,
      );
      if (transition) {
        transitions.push(transition);
        this.transitionIdMapping.set(edge.id, transition.id);
      }
    }

    // Add implicit transitions for complex structures
    const implicitTransitions = await this.createImplicitTransitions(
      analysis,
      states,
    );
    transitions.push(...implicitTransitions);

    return transitions;
  }

  /**
   * Convert a single workflow edge to a journey transition
   */
  private async convertEdgeToTransition(
    edge: ReactFlowEdge,
    states: JourneyStateDefinition[],
    analysis: WorkflowAnalysisResult,
  ): Promise<JourneyTransitionDefinition | null> {
    const fromStateId = this.stateIdMapping.get(edge.source);
    const toStateId = this.stateIdMapping.get(edge.target);

    // Skip transitions where source or target states don't exist
    // (e.g., start/end nodes or merged nodes)
    if (!fromStateId || !toStateId) {
      return null;
    }

    const transitionId = `transition_${edge.id}_${Date.now()}`;

    const transition: JourneyTransitionDefinition = {
      id: transitionId,
      fromStateId,
      toStateId,
      condition: this.convertEdgeCondition(edge),
      priority: edge.data?.priority || 1,
      originalEdgeId: edge.id,
      metadata: {
        animated: edge.animated,
        style: edge.style,
        label: edge.label,
      },
    };

    return transition;
  }

  /**
   * Process complex workflow structures (loops, parallel sections, etc.)
   */
  private async processComplexStructures(
    analysis: WorkflowAnalysisResult,
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): Promise<void> {
    this.log("debug", "Processing complex structures");

    // Process parallel sections
    for (const parallelSection of analysis.structure.parallelSections) {
      await this.processParallelSection(
        parallelSection,
        states,
        transitions,
        analysis,
      );
    }

    // Process loop structures
    for (const loopStructure of analysis.structure.loopStructures) {
      await this.processLoopStructure(
        loopStructure,
        states,
        transitions,
        analysis,
      );
    }

    // Process conditional nodes
    for (const conditionalNode of analysis.structure.conditionalNodes) {
      await this.processConditionalNode(
        conditionalNode,
        states,
        transitions,
        analysis,
      );
    }
  }

  /**
   * Process a parallel execution section
   */
  private async processParallelSection(
    parallelSection: ParallelSection,
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
    analysis: WorkflowAnalysisResult,
  ): Promise<void> {
    // Create coordination states for parallel execution
    const splitStateId = this.stateIdMapping.get(parallelSection.splitNode);
    const joinStateId = this.stateIdMapping.get(parallelSection.joinNode);

    if (!splitStateId) return;

    // Mark split state with parallel execution metadata
    const splitState = states.find((s) => s.id === splitStateId);
    if (splitState) {
      const config = JSON.parse(
        splitState.configuration,
      ) as JourneyStateConfiguration;
      config.parallelExecution = {
        type: "split",
        branchCount: parallelSection.branches.length,
        synchronization: parallelSection.synchronizationType,
        timeout: parallelSection.timeout,
        errorHandling: parallelSection.errorHandling,
      };
      splitState.configuration = JSON.stringify(config);
    }

    // If there's no explicit join state, create an implicit one
    if (!joinStateId && parallelSection.joinNode) {
      const joinState: JourneyStateDefinition = {
        id: `join_state_${parallelSection.id}`,
        name: `Join - ${parallelSection.id}`,
        description: `Parallel join point for ${parallelSection.id}`,
        stateType: "chat",
        configuration: JSON.stringify({
          stateType: "chat",
          parallelExecution: {
            type: "join",
            synchronization: parallelSection.synchronizationType,
            branchCount: parallelSection.branches.length,
          },
        }),
        isInitial: false,
        isFinal: false,
        originalNodeId: parallelSection.joinNode,
        blockType: "parallel_join",
      };

      states.push(joinState);
      this.stateIdMapping.set(parallelSection.joinNode, joinState.id);
    }
  }

  /**
   * Process a loop structure
   */
  private async processLoopStructure(
    loopStructure: LoopStructure,
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
    analysis: WorkflowAnalysisResult,
  ): Promise<void> {
    const entryStateId = this.stateIdMapping.get(loopStructure.entryNode);
    const exitStateId = this.stateIdMapping.get(loopStructure.exitNode);

    if (!entryStateId) return;

    // Add loop metadata to entry state
    const entryState = states.find((s) => s.id === entryStateId);
    if (entryState) {
      const config = JSON.parse(
        entryState.configuration,
      ) as JourneyStateConfiguration;
      config.loop = {
        type: loopStructure.loopType,
        condition: loopStructure.condition,
        maxIterations: loopStructure.maxIterations,
        iterationVariable: loopStructure.iterationVariable,
        bodyNodes: loopStructure.bodyNodes,
        exitConditions: loopStructure.exitConditions,
      };
      entryState.configuration = JSON.stringify(config);
    }

    // Create loop back transition if it doesn't exist
    if (exitStateId) {
      const loopBackTransition = transitions.find(
        (t) => t.fromStateId === exitStateId && t.toStateId === entryStateId,
      );

      if (!loopBackTransition) {
        const backTransition: JourneyTransitionDefinition = {
          id: `loop_back_${loopStructure.id}`,
          fromStateId: exitStateId,
          toStateId: entryStateId,
          condition: loopStructure.condition,
          priority: 0, // Lower priority than exit transitions
          metadata: {
            loopBack: true,
            loopId: loopStructure.id,
          },
        };

        transitions.push(backTransition);
      }
    }
  }

  /**
   * Process a conditional node
   */
  private async processConditionalNode(
    conditionalNode: ConditionalNode,
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
    analysis: WorkflowAnalysisResult,
  ): Promise<void> {
    const stateId = this.stateIdMapping.get(conditionalNode.nodeId);
    if (!stateId) return;

    const state = states.find((s) => s.id === stateId);
    if (!state) return;

    // Ensure the state is configured for conditional logic
    const config = JSON.parse(state.configuration) as JourneyStateConfiguration;
    if (config.stateType === "chat") {
      const chatConfig = config as ChatStateConfiguration;
      chatConfig.conditional = {
        condition: conditionalNode.condition,
        variables: conditionalNode.variables,
        truePath: conditionalNode.truePath,
        falsePath: conditionalNode.falsePath,
        complexity: conditionalNode.complexity,
      };
      state.configuration = JSON.stringify(chatConfig);
    }
  }

  /**
   * Optimize journey structure for better performance
   */
  private async optimizeJourneyStructure(
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
    analysis: WorkflowAnalysisResult,
  ): Promise<void> {
    if (!this.context.config.optimization.enableOptimizations) {
      return;
    }

    this.log("debug", "Optimizing journey structure");

    // Remove redundant states
    await this.removeRedundantStates(states, transitions);

    // Merge sequential tool states where possible
    await this.mergeSequentialToolStates(states, transitions);

    // Optimize conditional logic
    await this.optimizeConditionalLogic(states, transitions);

    // Parallel execution optimization
    await this.optimizeParallelExecution(states, transitions, analysis);

    // Cache frequently accessed states
    await this.optimizeStateCaching(states, analysis);
  }

  /**
   * Build comprehensive journey metadata
   */
  private async buildJourneyMetadata(
    analysis: WorkflowAnalysisResult,
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): Promise<JourneyMetadata> {
    const { workflow } = analysis;

    const preservedAttributes: PreservedAttributes = {
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      workspaceId: workflow.workspaceId,
      nodeTypes: [
        ...new Set(workflow.nodes.map((n) => n.type as SimBlockType)),
      ],
      edgeTypes: [...new Set(workflow.edges.map((e) => e.type || "default"))],
      hasConditionalLogic: analysis.structure.conditionalNodes.length > 0,
      hasParallelExecution: analysis.structure.parallelSections.length > 0,
      hasLoops: analysis.structure.loopStructures.length > 0,
      hasUserInteraction: workflow.nodes.some((n) => n.type === "user_input"),
      toolDependencies: Array.from(this.toolMappings.values()),
      variableUsage: this.extractVariableUsage(workflow),
      errorHandlingStrategies: Object.keys(
        analysis.errorHandlingAnalysis.strategies,
      ),
    };

    const complexityMetrics: ComplexityMetrics = {
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
      conditionalBranches: analysis.structure.conditionalNodes.length,
      parallelPaths: analysis.structure.parallelSections.reduce(
        (sum, section) => sum + section.branches.length,
        0,
      ),
      loopStructures: analysis.structure.loopStructures.length,
      maxDepth: this.calculateMaxExecutionDepth(analysis),
      cyclomaticComplexity: analysis.complexityAnalysis.cyclomatic,
      halsteadComplexity: this.calculateHalsteadComplexity(workflow),
    };

    const performanceMetrics: PerformanceMetrics = {
      conversionTimeMs: 0, // Will be set by the main conversion engine
      analysisTimeMs: 0,
      mappingTimeMs: 0,
      validationTimeMs: 0,
      memoryUsageMB: 0,
      cacheHitRate: 0,
      optimizationApplied: this.getAppliedOptimizations(),
    };

    const validationMetrics: ValidationMetrics = {
      preservationScore: this.calculatePreservationScore(
        workflow,
        states,
        transitions,
      ),
      functionalEquivalenceScore: this.calculateFunctionalEquivalenceScore(
        analysis,
        states,
        transitions,
      ),
      structuralIntegrityScore: this.calculateStructuralIntegrityScore(
        states,
        transitions,
      ),
      errorCount: 0, // Will be set by validation
      warningCount: 0, // Will be set by validation
      issueCategories: [],
    };

    return {
      originalWorkflowId: workflow.id,
      conversionTimestamp: new Date().toISOString(),
      conversionVersion: "1.0.0",
      preservedAttributes,
      executionMode: workflow.configuration?.executionMode || "sequential",
      complexity: complexityMetrics,
      performance: performanceMetrics,
      validation: validationMetrics,
    };
  }

  /**
   * Validate the generated journey structure
   */
  private async validateJourneyStructure(
    journey: JourneyDefinition,
  ): Promise<void> {
    const validationErrors: string[] = [];

    // Validate states
    if (journey.states.length === 0) {
      validationErrors.push("Journey must have at least one state");
    }

    const hasInitialState = journey.states.some((s) => s.isInitial);
    if (!hasInitialState) {
      validationErrors.push("Journey must have at least one initial state");
    }

    const hasFinalState = journey.states.some((s) => s.isFinal);
    if (!hasFinalState) {
      validationErrors.push("Journey must have at least one final state");
    }

    // Validate transitions
    for (const transition of journey.transitions) {
      const fromState = journey.states.find(
        (s) => s.id === transition.fromStateId,
      );
      const toState = journey.states.find((s) => s.id === transition.toStateId);

      if (!fromState) {
        validationErrors.push(
          `Transition ${transition.id} references non-existent from state: ${transition.fromStateId}`,
        );
      }

      if (!toState) {
        validationErrors.push(
          `Transition ${transition.id} references non-existent to state: ${transition.toStateId}`,
        );
      }
    }

    // Check for unreachable states
    const reachableStates = this.findReachableStates(journey);
    const unreachableStates = journey.states.filter(
      (s) => !reachableStates.has(s.id) && !s.isInitial,
    );

    if (unreachableStates.length > 0) {
      validationErrors.push(
        `Found unreachable states: ${unreachableStates.map((s) => s.id).join(", ")}`,
      );
    }

    if (validationErrors.length > 0) {
      throw new Error(
        `Journey validation failed: ${validationErrors.join("; ")}`,
      );
    }
  }

  // =============================================================================
  // State Configuration Creation Methods
  // =============================================================================

  private createFinalStateConfiguration(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): FinalStateConfiguration {
    return {
      stateType: "final",
      outcome: {
        status: "success",
        message: node.data?.message || "Workflow completed successfully",
        data: node.data?.outputData || {},
      },
      cleanup: {
        clearVariables: node.data?.clearVariables !== false,
        saveSession: node.data?.saveSession !== false,
        sendNotifications: node.data?.sendNotifications === true,
      },
    };
  }

  private async createToolStateConfiguration(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): Promise<ToolStateConfiguration> {
    const toolId = node.data?.toolId || node.data?.tool || node.id;
    const toolMapping =
      this.toolMappings.get(toolId) ||
      (await this.createDefaultToolMapping(toolId, node));

    return {
      stateType: "tool",
      toolId,
      parameters: node.data?.config || node.data?.parameters || {},
      inputMapping: toolMapping.inputMapping,
      outputMapping: toolMapping.outputMapping,
      errorHandling: {
        strategy: node.data?.errorHandling?.strategy || "retry",
        maxRetries: node.data?.errorHandling?.maxRetries || 3,
        fallbackValue: node.data?.errorHandling?.fallbackValue,
        timeout: node.data?.errorHandling?.timeout || 30000,
      },
      async: node.data?.async === true,
      cacheable: node.data?.cacheable !== false,
    };
  }

  private createConditionalStateConfiguration(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): ChatStateConfiguration {
    return {
      stateType: "chat",
      prompt: {
        template:
          node.data?.prompt ||
          `Evaluating condition: ${node.data?.condition || "true"}`,
        variables: this.extractVariablesFromCondition(
          node.data?.condition || "true",
        ),
        tone: "professional",
      },
      validation: {
        required: true,
      },
      conditional: {
        condition: node.data?.condition || "true",
        variables: this.extractVariablesFromCondition(
          node.data?.condition || "true",
        ),
      },
    };
  }

  private createChatStateConfiguration(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): ChatStateConfiguration {
    return {
      stateType: "chat",
      prompt: {
        template:
          node.data?.prompt || node.data?.label || "Please provide input",
        variables: node.data?.variables || {},
        tone: node.data?.tone || "friendly",
      },
      validation: {
        required: node.data?.required !== false,
        minLength: node.data?.minLength,
        maxLength: node.data?.maxLength,
        pattern: node.data?.pattern,
      },
      responseOptions: {
        type: node.data?.inputType || "text",
        choices: node.data?.choices,
        multiSelect: node.data?.multiSelect === true,
      },
    };
  }

  private createParallelSplitConfiguration(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): ChatStateConfiguration {
    return {
      stateType: "chat",
      prompt: {
        template: "Initiating parallel execution paths",
        tone: "professional",
      },
      validation: {
        required: false,
      },
      parallelExecution: {
        type: "split",
        synchronization: node.data?.synchronization || "all",
        timeout: node.data?.timeout,
        errorHandling: node.data?.errorHandling || "fail_fast",
      },
    };
  }

  private createLoopStateConfiguration(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): ChatStateConfiguration {
    return {
      stateType: "chat",
      prompt: {
        template: `Loop iteration: ${node.data?.condition || "continuing loop"}`,
        variables: this.extractVariablesFromCondition(
          node.data?.condition || "true",
        ),
        tone: "professional",
      },
      validation: {
        required: false,
      },
      loop: {
        type: node.data?.loopType || "while",
        condition: node.data?.condition || "true",
        maxIterations: node.data?.maxIterations,
        iterationVariable: node.data?.iterationVariable,
      },
    };
  }

  private async createDefaultToolStateConfiguration(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): Promise<ToolStateConfiguration> {
    return {
      stateType: "tool",
      toolId: "generic_tool",
      parameters: node.data || {},
      inputMapping: [],
      outputMapping: [],
      errorHandling: {
        strategy: "retry",
        maxRetries: 1,
        timeout: 10000,
      },
      async: false,
      cacheable: false,
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private inferToolType(
    toolId: string,
  ): "builtin" | "custom" | "external" | "mcp" {
    // Heuristics to determine tool type
    if (toolId.startsWith("builtin_") || toolId.startsWith("sim_"))
      return "builtin";
    if (toolId.includes("api") || toolId.includes("http")) return "external";
    if (toolId.includes("mcp") || toolId.includes("server")) return "mcp";
    return "custom";
  }

  private async generateInputMapping(
    toolId: string,
    analysis: WorkflowAnalysisResult,
  ): Promise<ParameterMapping[]> {
    // Generate parameter mappings based on tool analysis
    const mappings: ParameterMapping[] = [];

    // Find nodes using this tool
    const toolNodes = analysis.workflow.nodes.filter(
      (node) => node.data?.toolId === toolId,
    );

    for (const node of toolNodes) {
      if (node.data?.config) {
        for (const [key, value] of Object.entries(node.data.config)) {
          mappings.push({
            workflowParameter: key,
            journeyParameter: key,
            required: true,
            defaultValue: value,
            description: `Parameter ${key} for tool ${toolId}`,
          });
        }
      }
    }

    return mappings;
  }

  private async generateOutputMapping(
    toolId: string,
    analysis: WorkflowAnalysisResult,
  ): Promise<ParameterMapping[]> {
    // Generate output mappings - simplified implementation
    return [
      {
        workflowParameter: "result",
        journeyParameter: "toolResult",
        required: false,
        description: `Output result from tool ${toolId}`,
      },
    ];
  }

  private async generateErrorMapping(toolId: string): Promise<ErrorMapping[]> {
    // Generate error mappings - simplified implementation
    return [
      {
        workflowErrorCode: "TOOL_ERROR",
        journeyErrorCode: "EXECUTION_ERROR",
        recovery: {
          type: "retry",
          maxAttempts: 3,
          backoffDelay: 1000,
        },
        userMessage: `Error executing tool: ${toolId}`,
        logLevel: "error",
      },
    ];
  }

  private async createDefaultToolMapping(
    toolId: string,
    node: ReactFlowNode,
  ): Promise<ToolDependency> {
    return {
      toolId,
      toolName: toolId,
      toolType: "custom",
      configuration: node.data?.config || {},
      inputMapping: await this.generateInputMapping(toolId, {
        workflow: { nodes: [node] },
      } as any),
      outputMapping: await this.generateOutputMapping(toolId, {
        workflow: { nodes: [node] },
      } as any),
      errorMapping: await this.generateErrorMapping(toolId),
      compatibilityLevel: "partial",
    };
  }

  private convertEdgeCondition(edge: ReactFlowEdge): string | undefined {
    if (edge.data?.condition) {
      return this.translateConditionSyntax(edge.data.condition);
    }
    return undefined;
  }

  private translateConditionSyntax(condition: string): string {
    // Translate workflow condition syntax to journey condition syntax
    // This is a simplified implementation
    return condition
      .replace(/\s*===\s*/g, " == ")
      .replace(/\s*!==\s*/g, " != ")
      .replace(/\s*&&\s*/g, " and ")
      .replace(/\s*\|\|\s*/g, " or ")
      .replace(/\s*!\s*/g, "not ");
  }

  private getNodeDependencies(
    nodeId: string,
    analysis: WorkflowAnalysisResult,
  ): string[] {
    const dependencyNode = analysis.dependencies.nodes.find(
      (n) => n.nodeId === nodeId,
    );
    return dependencyNode?.dependencies || [];
  }

  private getExecutionGroup(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): string | undefined {
    // Determine execution group based on parallel sections
    for (const section of analysis.structure.parallelSections) {
      for (const branch of section.branches) {
        if (branch.nodes.includes(node.id)) {
          return `parallel_${section.id}`;
        }
      }
    }
    return undefined;
  }

  private createErrorHandling(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult,
  ): any {
    const errorHandling = node.data?.errorHandling;

    if (!errorHandling) {
      return {
        onError: "retry",
        maxRetries: 3,
        timeout: 30000,
      };
    }

    return {
      onError: errorHandling.strategy || "retry",
      maxRetries: errorHandling.maxRetries || 3,
      fallbackState: errorHandling.fallbackState,
      timeout: errorHandling.timeout || 30000,
    };
  }

  private async ensureProperEntryAndExitStates(
    states: JourneyStateDefinition[],
    structure: any,
  ): Promise<void> {
    // Mark entry states
    for (const entryPoint of structure.entryPoints) {
      const stateId = this.stateIdMapping.get(entryPoint);
      if (stateId) {
        const state = states.find((s) => s.id === stateId);
        if (state) {
          state.isInitial = true;
        }
      }
    }

    // Ensure we have at least one initial state
    const hasInitialState = states.some((s) => s.isInitial);
    if (!hasInitialState && states.length > 0) {
      states[0].isInitial = true;
    }

    // Mark final states
    for (const exitPoint of structure.exitPoints) {
      const stateId = this.stateIdMapping.get(exitPoint);
      if (stateId) {
        const state = states.find((s) => s.id === stateId);
        if (state) {
          state.isFinal = true;
        }
      }
    }

    // Ensure we have at least one final state
    const hasFinalState = states.some((s) => s.isFinal);
    if (!hasFinalState) {
      // Create a default final state
      const finalState: JourneyStateDefinition = {
        id: `final_state_${Date.now()}`,
        name: "Journey Complete",
        description: "Default final state for journey completion",
        stateType: "final",
        configuration: JSON.stringify({
          stateType: "final",
          outcome: {
            status: "success",
            message: "Journey completed successfully",
          },
        }),
        isInitial: false,
        isFinal: true,
      };

      states.push(finalState);
    }
  }

  private async createImplicitTransitions(
    analysis: WorkflowAnalysisResult,
    states: JourneyStateDefinition[],
  ): Promise<JourneyTransitionDefinition[]> {
    const implicitTransitions: JourneyTransitionDefinition[] = [];

    // Create transitions to final states for states that don't have outgoing transitions
    const statesWithoutTransitions = states.filter((state) => {
      const hasOutgoing = analysis.workflow.edges.some(
        (edge) => this.stateIdMapping.get(edge.source) === state.id,
      );
      return !hasOutgoing && !state.isFinal;
    });

    const finalStates = states.filter((s) => s.isFinal);
    if (finalStates.length > 0) {
      const defaultFinalState = finalStates[0];

      for (const state of statesWithoutTransitions) {
        implicitTransitions.push({
          id: `implicit_transition_${state.id}_to_final`,
          fromStateId: state.id,
          toStateId: defaultFinalState.id,
          priority: 1,
          metadata: {
            implicit: true,
            reason: "Default transition to final state",
          },
        });
      }
    }

    return implicitTransitions;
  }

  private extractVariablesFromCondition(
    condition: string,
  ): Record<string, string> {
    const variables: Record<string, string> = {};
    const matches =
      condition.match(
        /\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\b/g,
      ) || [];

    for (const match of matches) {
      if (
        !["true", "false", "null", "undefined", "and", "or", "not"].includes(
          match,
        )
      ) {
        variables[match] = `\${${match}}`;
      }
    }

    return variables;
  }

  private extractVariableUsage(workflow: any): VariableUsage[] {
    // Simplified variable usage extraction
    const variables: VariableUsage[] = [];

    if (workflow.variables) {
      for (const [name, value] of Object.entries(workflow.variables)) {
        variables.push({
          variableName: name,
          variableType: "configuration",
          scope: "global",
          dataType: typeof value,
          defaultValue: value,
          dependencies: [],
          usageCount: 1,
          firstUsed: workflow.id,
          lastModified: workflow.id,
          description: `Global variable: ${name}`,
        });
      }
    }

    return variables;
  }

  private calculateMaxExecutionDepth(analysis: WorkflowAnalysisResult): number {
    // Calculate maximum execution depth based on dependency levels
    const levels = Object.values(analysis.dependencies.dependencyLevels);
    return levels.length > 0 ? Math.max(...levels) : 1;
  }

  private calculateHalsteadComplexity(workflow: any): any {
    // Simplified Halstead complexity calculation
    const operators = workflow.edges.length;
    const operands = workflow.nodes.length;
    const vocabulary = operators + operands;
    const length = vocabulary;
    const volume = length * Math.log2(vocabulary || 1);

    return {
      vocabulary,
      length,
      volume,
      difficulty: (operators / 2) * (operands / (operands || 1)),
      effort: volume * ((operators / 2) * (operands / (operands || 1))),
    };
  }

  private getAppliedOptimizations(): string[] {
    // Return list of optimizations that were applied
    const optimizations: string[] = [];

    if (this.context.config.optimization.enableOptimizations) {
      optimizations.push("structure_optimization");
    }

    if (this.context.config.optimization.parallelizeExecution) {
      optimizations.push("parallel_execution");
    }

    if (this.context.config.optimization.cacheToolResults) {
      optimizations.push("tool_caching");
    }

    return optimizations;
  }

  private calculatePreservationScore(
    workflow: any,
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): number {
    // Calculate how well the original workflow structure is preserved
    const nodePreservation = states.length / (workflow.nodes.length || 1);
    const edgePreservation = transitions.length / (workflow.edges.length || 1);
    const structurePreservation = (nodePreservation + edgePreservation) / 2;

    return Math.round(Math.min(structurePreservation, 1) * 100);
  }

  private calculateFunctionalEquivalenceScore(
    analysis: WorkflowAnalysisResult,
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): number {
    // Calculate functional equivalence between workflow and journey
    let score = 100;

    // Reduce score for each missing tool mapping
    const incompatibleTools = analysis.toolAnalysis.toolCompatibility.filter(
      (t) => t.compatibility === "none",
    );
    score -= incompatibleTools.length * 10;

    // Reduce score for missing error handling
    if (analysis.errorHandlingAnalysis.coverage < 0.8) {
      score -= (0.8 - analysis.errorHandlingAnalysis.coverage) * 50;
    }

    return Math.max(score, 0);
  }

  private calculateStructuralIntegrityScore(
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): number {
    let score = 100;

    // Check for structural issues
    const hasInitialState = states.some((s) => s.isInitial);
    const hasFinalState = states.some((s) => s.isFinal);

    if (!hasInitialState) score -= 20;
    if (!hasFinalState) score -= 20;

    // Check for orphaned states
    const reachableStates = this.findReachableStates({
      states,
      transitions,
    } as any);
    const orphanedStates = states.filter(
      (s) => !reachableStates.has(s.id) && !s.isInitial,
    );
    score -= orphanedStates.length * 5;

    return Math.max(score, 0);
  }

  private findReachableStates(journey: {
    states: JourneyStateDefinition[];
    transitions: JourneyTransitionDefinition[];
  }): Set<string> {
    const reachable = new Set<string>();
    const queue = journey.states.filter((s) => s.isInitial).map((s) => s.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;

      reachable.add(current);
      const outgoing = journey.transitions.filter(
        (t) => t.fromStateId === current,
      );
      queue.push(...outgoing.map((t) => t.toStateId));
    }

    return reachable;
  }

  // Optimization methods (simplified implementations)
  private async removeRedundantStates(
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): Promise<void> {
    // Remove states that don't add value
    // Implementation would be more sophisticated
  }

  private async mergeSequentialToolStates(
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): Promise<void> {
    // Merge consecutive tool states where possible
    // Implementation would be more sophisticated
  }

  private async optimizeConditionalLogic(
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
  ): Promise<void> {
    // Optimize conditional branching
    // Implementation would be more sophisticated
  }

  private async optimizeParallelExecution(
    states: JourneyStateDefinition[],
    transitions: JourneyTransitionDefinition[],
    analysis: WorkflowAnalysisResult,
  ): Promise<void> {
    // Optimize parallel execution paths
    // Implementation would be more sophisticated
  }

  private async optimizeStateCaching(
    states: JourneyStateDefinition[],
    analysis: WorkflowAnalysisResult,
  ): Promise<void> {
    // Mark states for caching optimization
    // Implementation would be more sophisticated
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: any,
  ): void {
    if (this.context.logger) {
      this.context.logger[level](message, meta);
    }
  }
}
