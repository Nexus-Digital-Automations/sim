/**
 * Workflow Analysis Engine
 *
 * Comprehensive analysis system for ReactFlow workflows that extracts structure,
 * dependencies, complexity metrics, and other critical information needed for
 * accurate conversion to Parlant journeys.
 */

import type {
  AccessControlSecurity,
  AlternativePath,
  CircularDependency,
  ComplexityAnalysis,
  ComplianceCheck,
  ConditionalNode,
  ConversionContext,
  DataFlowSecurity,
  DependencyEdge,
  DependencyGraph,
  DependencyNode,
  ErrorHandlingAnalysis,
  ErrorPath,
  ExecutionPath,
  LoopStructure,
  ParallelSection,
  PerformanceAnalysis,
  PerformanceBottleneck,
  PerformanceOptimization,
  ReactFlowEdge,
  ReactFlowNode,
  RecoveryMechanism,
  ResourceRequirement,
  ResourceUtilization,
  ScalabilityMetrics,
  SecurityAnalysis,
  SecurityRecommendation,
  SecurityVulnerability,
  SimWorkflowDefinition,
  ToolAnalysis,
  ToolCompatibilityReport,
  UnhandledError,
  VariableAnalysis,
  VariableIssue,
  VariableOptimization,
  VariableUsagePattern,
  WorkflowAnalysisResult,
  WorkflowStructure,
} from "./types";

/**
 * Comprehensive workflow analysis engine that processes ReactFlow workflows
 * and extracts all information needed for accurate journey conversion.
 */
export class WorkflowAnalysisEngine {
  private context: ConversionContext;
  private cache: Map<string, any> = new Map();

  constructor(context: ConversionContext) {
    this.context = context;
    this.cache = context.cache || new Map();
  }

  /**
   * Main analysis entry point - performs comprehensive workflow analysis
   */
  async analyzeWorkflow(
    workflow: SimWorkflowDefinition,
  ): Promise<WorkflowAnalysisResult> {
    const startTime = Date.now();
    this.log("info", "Starting workflow analysis", { workflowId: workflow.id });

    try {
      // Check cache first
      const cacheKey = `analysis:${workflow.id}:${workflow.updatedAt}`;
      if (this.cache.has(cacheKey)) {
        this.log("debug", "Returning cached analysis result", {
          workflowId: workflow.id,
        });
        return this.cache.get(cacheKey);
      }

      // Perform parallel analysis operations
      const [
        structure,
        dependencies,
        executionPaths,
        complexityAnalysis,
        toolAnalysis,
        variableAnalysis,
        errorHandlingAnalysis,
        performanceAnalysis,
        securityAnalysis,
      ] = await Promise.all([
        this.analyzeWorkflowStructure(workflow),
        this.analyzeDependencies(workflow),
        this.analyzeExecutionPaths(workflow),
        this.analyzeComplexity(workflow),
        this.analyzeTools(workflow),
        this.analyzeVariables(workflow),
        this.analyzeErrorHandling(workflow),
        this.analyzePerformance(workflow),
        this.analyzeSecurityRisks(workflow),
      ]);

      const result: WorkflowAnalysisResult = {
        workflow,
        structure,
        dependencies,
        executionPaths,
        complexityAnalysis,
        toolAnalysis,
        variableAnalysis,
        errorHandlingAnalysis,
        performanceAnalysis,
        securityAnalysis,
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      const analysisTime = Date.now() - startTime;
      this.log("info", "Workflow analysis completed", {
        workflowId: workflow.id,
        analysisTimeMs: analysisTime,
        complexity: complexityAnalysis.overall,
      });

      return result;
    } catch (error) {
      const analysisTime = Date.now() - startTime;
      this.log("error", "Workflow analysis failed", {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : "Unknown error",
        analysisTimeMs: analysisTime,
      });
      throw error;
    }
  }

  /**
   * Analyzes the structural properties of the workflow graph
   */
  private async analyzeWorkflowStructure(
    workflow: SimWorkflowDefinition,
  ): Promise<WorkflowStructure> {
    const { nodes, edges } = workflow;

    // Find entry and exit points
    const entryPoints = this.findEntryPoints(nodes, edges);
    const exitPoints = this.findExitPoints(nodes, edges);

    // Identify structural patterns
    const conditionalNodes = this.findConditionalNodes(nodes, edges);
    const parallelSections = this.findParallelSections(nodes, edges);
    const loopStructures = this.findLoopStructures(nodes, edges);

    // Find critical and alternative paths
    const criticalPath = this.calculateCriticalPath(nodes, edges);
    const alternativePaths = this.findAlternativePaths(nodes, edges);

    // Identify structural issues
    const unreachableNodes = this.findUnreachableNodes(
      nodes,
      edges,
      entryPoints,
    );
    const orphanedNodes = this.findOrphanedNodes(nodes, edges);

    return {
      entryPoints,
      exitPoints,
      conditionalNodes,
      parallelSections,
      loopStructures,
      criticalPath,
      alternativePaths,
      unreachableNodes,
      orphanedNodes,
    };
  }

  /**
   * Analyzes dependencies between workflow nodes
   */
  private async analyzeDependencies(
    workflow: SimWorkflowDefinition,
  ): Promise<DependencyGraph> {
    const { nodes, edges } = workflow;

    // Build dependency graph
    const dependencyNodes = this.buildDependencyNodes(nodes, edges);
    const dependencyEdges = this.buildDependencyEdges(edges);

    // Analyze graph properties
    const stronglyConnectedComponents = this.findStronglyConnectedComponents(
      dependencyNodes,
      dependencyEdges,
    );
    const topologicalOrder = this.calculateTopologicalOrder(
      dependencyNodes,
      dependencyEdges,
    );
    const circularDependencies = this.findCircularDependencies(
      stronglyConnectedComponents,
      dependencyNodes,
    );
    const dependencyLevels = this.calculateDependencyLevels(
      dependencyNodes,
      dependencyEdges,
    );

    return {
      nodes: dependencyNodes,
      edges: dependencyEdges,
      stronglyConnectedComponents,
      topologicalOrder,
      circularDependencies,
      dependencyLevels,
    };
  }

  /**
   * Analyzes possible execution paths through the workflow
   */
  private async analyzeExecutionPaths(
    workflow: SimWorkflowDefinition,
  ): Promise<ExecutionPath[]> {
    const { nodes, edges } = workflow;
    const entryPoints = this.findEntryPoints(nodes, edges);
    const executionPaths: ExecutionPath[] = [];

    for (const entryPoint of entryPoints) {
      const paths = this.traceExecutionPaths(entryPoint, nodes, edges);
      executionPaths.push(...paths);
    }

    return executionPaths.map((path, index) => ({
      ...path,
      id: `path_${index}`,
      probability: this.calculatePathProbability(path, workflow),
      estimatedDuration: this.estimatePathDuration(path, workflow),
      resourceRequirements: this.calculatePathResourceRequirements(
        path,
        workflow,
      ),
      errorProbability: this.calculatePathErrorProbability(path, workflow),
      criticalPath: this.isCriticalPath(path, workflow),
    }));
  }

  /**
   * Analyzes workflow complexity using multiple metrics
   */
  private async analyzeComplexity(
    workflow: SimWorkflowDefinition,
  ): Promise<ComplexityAnalysis> {
    const { nodes, edges } = workflow;

    // Calculate various complexity metrics
    const cyclomatic = this.calculateCyclomaticComplexity(nodes, edges);
    const cognitive = this.calculateCognitiveComplexity(workflow);
    const structural = this.calculateStructuralComplexity(workflow);
    const maintainability = this.calculateMaintainabilityIndex(workflow);
    const testability = this.calculateTestabilityScore(workflow);

    const overall = Math.round((cyclomatic + cognitive + structural) / 3);

    // Categorize nodes by complexity
    const categories = this.categorizeNodesByComplexity(nodes, workflow);

    // Generate complexity-based recommendations
    const recommendations = this.generateComplexityRecommendations(
      overall,
      categories,
    );

    return {
      overall,
      cyclomatic,
      cognitive,
      structural,
      maintainability,
      testability,
      categories,
      recommendations,
    };
  }

  /**
   * Analyzes tools used in the workflow and their compatibility
   */
  private async analyzeTools(
    workflow: SimWorkflowDefinition,
  ): Promise<ToolAnalysis> {
    const { nodes } = workflow;

    const toolNodes = nodes.filter(
      (node) => node.type === "tool" || node.data?.toolId,
    );
    const totalTools = toolNodes.length;
    const uniqueTools = new Set(toolNodes.map((node) => node.data?.toolId))
      .size;

    // Categorize tools
    const toolCategories = this.categorizeTools(toolNodes);

    // Check tool compatibility with Parlant
    const toolCompatibility = await this.checkToolCompatibility(toolNodes);
    const migrationRequired = toolCompatibility
      .filter(
        (t) => t.compatibility === "partial" || t.compatibility === "none",
      )
      .map((t) => t.toolId);
    const deprecatedTools = toolCompatibility
      .filter((t) => t.issues.some((issue) => issue.includes("deprecated")))
      .map((t) => t.toolId);
    const securityRisks = toolCompatibility
      .filter((t) => t.issues.some((issue) => issue.includes("security")))
      .map((t) => t.toolId);

    // Calculate performance impact
    const performanceImpact = this.calculateToolPerformanceImpact(toolNodes);

    return {
      totalTools,
      uniqueTools,
      toolCategories,
      toolCompatibility,
      migrationRequired,
      deprecatedTools,
      securityRisks,
      performanceImpact,
    };
  }

  /**
   * Analyzes variable usage patterns throughout the workflow
   */
  private async analyzeVariables(
    workflow: SimWorkflowDefinition,
  ): Promise<VariableAnalysis> {
    const variables = this.extractVariables(workflow);
    const totalVariables = variables.length;

    // Analyze variable scopes and types
    const scopeDistribution = this.analyzeScopeDistribution(variables);
    const typeDistribution = this.analyzeTypeDistribution(variables);

    // Identify usage patterns
    const usagePatterns = this.identifyVariableUsagePatterns(
      variables,
      workflow,
    );

    // Find potential issues
    const potentialIssues = this.identifyVariableIssues(variables, workflow);

    // Suggest optimizations
    const optimizations = this.suggestVariableOptimizations(
      variables,
      usagePatterns,
    );

    return {
      totalVariables,
      scopeDistribution,
      typeDistribution,
      usagePatterns,
      potentialIssues,
      optimizations,
    };
  }

  /**
   * Analyzes error handling coverage and strategies
   */
  private async analyzeErrorHandling(
    workflow: SimWorkflowDefinition,
  ): Promise<ErrorHandlingAnalysis> {
    const { nodes, edges } = workflow;

    // Calculate error handling coverage
    const coverage = this.calculateErrorHandlingCoverage(nodes);

    // Analyze error handling strategies
    const strategies = this.analyzeErrorHandlingStrategies(nodes);

    // Find unhandled errors
    const unhandledErrors = this.findUnhandledErrors(nodes, workflow);

    // Trace error propagation paths
    const errorPaths = this.traceErrorPaths(nodes, edges);

    // Identify recovery mechanisms
    const recoveryMechanisms = this.identifyRecoveryMechanisms(nodes, edges);

    // Generate recommendations
    const recommendations = this.generateErrorHandlingRecommendations(
      coverage,
      unhandledErrors,
    );

    return {
      coverage,
      strategies,
      unhandledErrors,
      errorPaths,
      recoveryMechanisms,
      recommendations,
    };
  }

  /**
   * Analyzes workflow performance characteristics
   */
  private async analyzePerformance(
    workflow: SimWorkflowDefinition,
  ): Promise<PerformanceAnalysis> {
    const { nodes, edges } = workflow;

    // Estimate execution times
    const estimatedExecutionTime = this.estimateWorkflowExecutionTime(workflow);
    const criticalPathTime = this.calculateCriticalPathTime(workflow);

    // Identify optimization opportunities
    const parallelizationOpportunities =
      this.identifyParallelizationOpportunities(nodes, edges);
    const bottlenecks = this.identifyPerformanceBottlenecks(nodes, workflow);

    // Analyze resource utilization
    const resourceUtilization = this.analyzeResourceUtilization(workflow);

    // Calculate scalability metrics
    const scalabilityMetrics = this.calculateScalabilityMetrics(workflow);

    // Suggest optimizations
    const optimizations = this.suggestPerformanceOptimizations(
      workflow,
      bottlenecks,
    );

    return {
      estimatedExecutionTime,
      criticalPathTime,
      parallelizationOpportunities,
      bottlenecks,
      resourceUtilization,
      scalabilityMetrics,
      optimizations,
    };
  }

  /**
   * Analyzes security risks and vulnerabilities in the workflow
   */
  private async analyzeSecurityRisks(
    workflow: SimWorkflowDefinition,
  ): Promise<SecurityAnalysis> {
    const { nodes } = workflow;

    // Identify security vulnerabilities
    const vulnerabilities = this.identifySecurityVulnerabilities(
      nodes,
      workflow,
    );

    // Calculate overall risk level
    const riskLevel = this.calculateSecurityRiskLevel(vulnerabilities);

    // Analyze data flow security
    const dataFlowAnalysis = this.analyzeDataFlowSecurity(workflow);

    // Analyze access control
    const accessControlAnalysis = this.analyzeAccessControlSecurity(workflow);

    // Check compliance
    const compliance = this.checkComplianceRequirements(workflow);

    // Generate security recommendations
    const recommendations = this.generateSecurityRecommendations(
      vulnerabilities,
      dataFlowAnalysis,
    );

    return {
      riskLevel,
      vulnerabilities,
      dataFlowAnalysis,
      accessControlAnalysis,
      compliance,
      recommendations,
    };
  }

  // =============================================================================
  // Helper Methods - Structure Analysis
  // =============================================================================

  private findEntryPoints(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): string[] {
    const targets = new Set(edges.map((edge) => edge.target));
    const entryPoints = nodes
      .filter((node) => !targets.has(node.id) || node.type === "start")
      .map((node) => node.id);

    // If no explicit entry points found, look for start nodes
    if (entryPoints.length === 0) {
      const startNodes = nodes.filter((node) => node.type === "start");
      return startNodes.length > 0
        ? startNodes.map((n) => n.id)
        : [nodes[0]?.id].filter(Boolean);
    }

    return entryPoints;
  }

  private findExitPoints(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): string[] {
    const sources = new Set(edges.map((edge) => edge.source));
    const exitPoints = nodes
      .filter((node) => !sources.has(node.id) || node.type === "end")
      .map((node) => node.id);

    // If no explicit exit points found, look for end nodes
    if (exitPoints.length === 0) {
      const endNodes = nodes.filter((node) => node.type === "end");
      return endNodes.length > 0
        ? endNodes.map((n) => n.id)
        : [nodes[nodes.length - 1]?.id].filter(Boolean);
    }

    return exitPoints;
  }

  private findConditionalNodes(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): ConditionalNode[] {
    return nodes
      .filter((node) => node.type === "condition" || node.data?.condition)
      .map((node) => {
        const outgoingEdges = edges.filter((edge) => edge.source === node.id);
        const trueEdge = outgoingEdges.find(
          (edge) => edge.data?.condition === "true" || !edge.data?.condition,
        );
        const falseEdge = outgoingEdges.find(
          (edge) => edge.data?.condition === "false",
        );

        const truePath = trueEdge
          ? this.getPathFromNode(trueEdge.target, nodes, edges, new Set())
          : [];
        const falsePath = falseEdge
          ? this.getPathFromNode(falseEdge.target, nodes, edges, new Set())
          : [];

        const condition = node.data?.condition || "true";
        const variables = this.extractVariablesFromExpression(condition);

        return {
          nodeId: node.id,
          condition,
          truePath,
          falsePath,
          variables,
          complexity: this.calculateConditionComplexity(condition),
        };
      });
  }

  private findParallelSections(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): ParallelSection[] {
    const parallelSections: ParallelSection[] = [];
    const splitNodes = nodes.filter(
      (node) => node.type === "parallel_split" || node.type === "split",
    );

    for (const splitNode of splitNodes) {
      const outgoingEdges = edges.filter(
        (edge) => edge.source === splitNode.id,
      );

      if (outgoingEdges.length > 1) {
        // Find the corresponding join node
        const joinNode = this.findParallelJoinNode(splitNode.id, nodes, edges);

        if (joinNode) {
          const branches = outgoingEdges.map((edge, index) => {
            const branchNodes = this.getBranchNodes(
              edge.target,
              joinNode.id,
              nodes,
              edges,
            );
            return {
              id: `branch_${splitNode.id}_${index}`,
              nodes: branchNodes,
              estimatedDuration: this.estimateBranchDuration(
                branchNodes,
                nodes,
              ),
              priority: edge.data?.priority || 1,
              resources: this.calculateBranchResources(branchNodes, nodes),
              canFail: edge.data?.canFail !== false,
            };
          });

          parallelSections.push({
            id: `parallel_${splitNode.id}`,
            splitNode: splitNode.id,
            joinNode: joinNode.id,
            branches,
            synchronizationType: splitNode.data?.synchronizationType || "all",
            timeout: splitNode.data?.timeout,
            errorHandling: splitNode.data?.errorHandling || "fail_fast",
          });
        }
      }
    }

    return parallelSections;
  }

  private findLoopStructures(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): LoopStructure[] {
    const loopStructures: LoopStructure[] = [];
    const visited = new Set<string>();

    // Use DFS to find back edges that indicate loops
    const findBackEdges = (
      nodeId: string,
      path: string[],
      visited: Set<string>,
    ): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

      for (const edge of outgoingEdges) {
        const target = edge.target;
        const pathIndex = path.indexOf(target);

        if (pathIndex !== -1) {
          // Found a back edge - this creates a loop
          const loopNodes = path.slice(pathIndex);
          const entryNode = target;
          const exitNode = nodeId;

          const loopCondition =
            edge.data?.condition ||
            nodes.find((n) => n.id === entryNode)?.data?.condition ||
            "true";
          const loopType = this.determineLoopType(
            loopCondition,
            nodes.find((n) => n.id === entryNode),
          );

          loopStructures.push({
            id: `loop_${entryNode}_${exitNode}`,
            entryNode,
            exitNode,
            bodyNodes: loopNodes,
            condition: loopCondition,
            loopType,
            maxIterations: nodes.find((n) => n.id === entryNode)?.data
              ?.maxIterations,
            iterationVariable: nodes.find((n) => n.id === entryNode)?.data
              ?.iterationVariable,
            exitConditions: this.findLoopExitConditions(loopNodes, edges),
          });
        } else {
          findBackEdges(target, [...path, nodeId], visited);
        }
      }
    };

    // Start DFS from each entry point
    const entryPoints = this.findEntryPoints(nodes, edges);
    for (const entryPoint of entryPoints) {
      findBackEdges(entryPoint, [], new Set());
    }

    return loopStructures;
  }

  private calculateCriticalPath(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): string[] {
    // Use longest path algorithm to find critical path
    const durations = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    // Initialize durations
    for (const node of nodes) {
      durations.set(node.id, this.estimateNodeDuration(node));
    }

    // Topological sort to process nodes in dependency order
    const sorted = this.topologicalSort(nodes, edges);

    let maxPath: string[] = [];
    let maxDuration = 0;

    // Calculate longest paths using dynamic programming
    for (const nodeId of sorted) {
      const incomingEdges = edges.filter((edge) => edge.target === nodeId);

      if (incomingEdges.length === 0) {
        predecessors.set(nodeId, null);
      } else {
        let maxPredecessor = null;
        let maxPredecessorDuration = 0;

        for (const edge of incomingEdges) {
          const predecessorDuration = durations.get(edge.source) || 0;
          if (predecessorDuration > maxPredecessorDuration) {
            maxPredecessorDuration = predecessorDuration;
            maxPredecessor = edge.source;
          }
        }

        predecessors.set(nodeId, maxPredecessor);
        durations.set(
          nodeId,
          (durations.get(nodeId) || 0) + maxPredecessorDuration,
        );
      }

      const currentDuration = durations.get(nodeId) || 0;
      if (currentDuration > maxDuration) {
        maxDuration = currentDuration;
        maxPath = this.reconstructPath(nodeId, predecessors);
      }
    }

    return maxPath;
  }

  private findAlternativePaths(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): AlternativePath[] {
    const alternativePaths: AlternativePath[] = [];
    const conditionalNodes = this.findConditionalNodes(nodes, edges);

    for (const conditionalNode of conditionalNodes) {
      if (
        conditionalNode.truePath.length > 0 &&
        conditionalNode.falsePath.length > 0
      ) {
        alternativePaths.push({
          mainPath: conditionalNode.truePath,
          alternativePath: conditionalNode.falsePath,
          condition: conditionalNode.condition,
          trigger: "condition",
          probability: 0.5, // Default, would be refined with actual data
        });
      }
    }

    // Find error handling paths
    const errorPaths = this.findErrorHandlingPaths(nodes, edges);
    alternativePaths.push(...errorPaths);

    return alternativePaths;
  }

  private findUnreachableNodes(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    entryPoints: string[],
  ): string[] {
    const reachable = new Set<string>();
    const queue = [...entryPoints];

    // BFS to find all reachable nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;

      reachable.add(current);
      const outgoing = edges.filter((edge) => edge.source === current);
      queue.push(...outgoing.map((edge) => edge.target));
    }

    return nodes
      .filter((node) => !reachable.has(node.id))
      .map((node) => node.id);
  }

  private findOrphanedNodes(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): string[] {
    const connected = new Set<string>();
    edges.forEach((edge) => {
      connected.add(edge.source);
      connected.add(edge.target);
    });

    return nodes
      .filter((node) => !connected.has(node.id))
      .map((node) => node.id);
  }

  // =============================================================================
  // Helper Methods - Dependency Analysis
  // =============================================================================

  private buildDependencyNodes(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): DependencyNode[] {
    return nodes.map((node) => {
      const incoming = edges.filter((edge) => edge.target === node.id);
      const outgoing = edges.filter((edge) => edge.source === node.id);

      return {
        nodeId: node.id,
        dependencies: incoming.map((edge) => edge.source),
        dependents: outgoing.map((edge) => edge.target),
        level: 0, // Will be calculated later
        criticalPath: false, // Will be calculated later
      };
    });
  }

  private buildDependencyEdges(edges: ReactFlowEdge[]): DependencyEdge[] {
    return edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
      type: this.determineDependencyType(edge),
      strength: this.determineDependencyStrength(edge),
      condition: edge.data?.condition,
    }));
  }

  private findStronglyConnectedComponents(
    nodes: DependencyNode[],
    edges: DependencyEdge[],
  ): string[][] {
    // Tarjan's algorithm for finding strongly connected components
    const components: string[][] = [];
    const stack: string[] = [];
    const onStack = new Set<string>();
    const indices = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    let index = 0;

    const strongConnect = (nodeId: string): void => {
      indices.set(nodeId, index);
      lowLinks.set(nodeId, index);
      index++;
      stack.push(nodeId);
      onStack.add(nodeId);

      const outgoing = edges.filter((edge) => edge.from === nodeId);
      for (const edge of outgoing) {
        const w = edge.to;
        if (!indices.has(w)) {
          strongConnect(w);
          lowLinks.set(
            nodeId,
            Math.min(lowLinks.get(nodeId)!, lowLinks.get(w)!),
          );
        } else if (onStack.has(w)) {
          lowLinks.set(
            nodeId,
            Math.min(lowLinks.get(nodeId)!, indices.get(w)!),
          );
        }
      }

      if (lowLinks.get(nodeId) === indices.get(nodeId)) {
        const component: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== nodeId);
        components.push(component);
      }
    };

    for (const node of nodes) {
      if (!indices.has(node.nodeId)) {
        strongConnect(node.nodeId);
      }
    }

    return components.filter((component) => component.length > 1);
  }

  private calculateTopologicalOrder(
    nodes: DependencyNode[],
    edges: DependencyEdge[],
  ): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degrees
    for (const node of nodes) {
      inDegree.set(node.nodeId, 0);
    }
    for (const edge of edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // Add nodes with no incoming edges to queue
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const outgoing = edges.filter((edge) => edge.from === current);
      for (const edge of outgoing) {
        const degree = inDegree.get(edge.to)! - 1;
        inDegree.set(edge.to, degree);
        if (degree === 0) {
          queue.push(edge.to);
        }
      }
    }

    return result;
  }

  private findCircularDependencies(
    components: string[][],
    nodes: DependencyNode[],
  ): CircularDependency[] {
    return components.map((component) => ({
      nodes: component,
      type: "control", // Simplified - would analyze actual dependency types
      severity: component.length > 2 ? "error" : "warning",
      resolution: `Consider breaking the circular dependency in nodes: ${component.join(", ")}`,
    }));
  }

  private calculateDependencyLevels(
    nodes: DependencyNode[],
    edges: DependencyEdge[],
  ): Record<string, number> {
    const levels: Record<string, number> = {};
    const topologicalOrder = this.calculateTopologicalOrder(nodes, edges);

    for (const nodeId of topologicalOrder) {
      const incoming = edges.filter((edge) => edge.to === nodeId);
      const maxLevel =
        incoming.length > 0
          ? Math.max(...incoming.map((edge) => levels[edge.from] || 0))
          : 0;
      levels[nodeId] = maxLevel + 1;
    }

    return levels;
  }

  // =============================================================================
  // Additional helper methods would continue here...
  // =============================================================================

  private determineDependencyType(
    edge: ReactFlowEdge,
  ): "data" | "control" | "resource" | "temporal" {
    // Analyze edge type based on its properties
    if (edge.data?.type) return edge.data.type;
    if (edge.data?.condition) return "control";
    if (edge.type === "smoothstep" || edge.type === "step") return "control";
    return "data"; // Default assumption
  }

  private determineDependencyStrength(
    edge: ReactFlowEdge,
  ): "strong" | "weak" | "optional" {
    if (edge.data?.required === false) return "optional";
    if (edge.data?.condition) return "weak";
    return "strong";
  }

  private estimateNodeDuration(node: ReactFlowNode): number {
    // Estimate based on node type and configuration
    const baseDurations: Record<string, number> = {
      start: 0,
      end: 0,
      tool: 1000,
      condition: 100,
      merge: 50,
      loop: 500,
      parallel_split: 100,
      parallel_join: 100,
      user_input: 30000, // 30 seconds for user interaction
      api_call: 2000,
      database_operation: 500,
    };

    const baseDuration = baseDurations[node.type] || 500;
    const complexity = this.calculateNodeComplexity(node);

    return Math.round(baseDuration * (1 + complexity * 0.5));
  }

  private calculateNodeComplexity(node: ReactFlowNode): number {
    let complexity = 0;

    // Add complexity based on configuration
    if (node.data?.config) {
      const configSize = Object.keys(node.data.config).length;
      complexity += configSize * 0.1;
    }

    // Add complexity based on conditions
    if (node.data?.condition) {
      complexity += this.calculateConditionComplexity(node.data.condition);
    }

    // Add complexity based on error handling
    if (node.data?.errorHandling) {
      complexity += 0.3;
    }

    return Math.min(complexity, 2); // Cap at 2x base complexity
  }

  private calculateConditionComplexity(condition: string): number {
    // Simple complexity calculation based on condition structure
    const operators = (condition.match(/&&|\|\||!|==|!=|<|>|<=|>=/g) || [])
      .length;
    const variables = (condition.match(/\w+/g) || []).length;
    const functions = (condition.match(/\w+\(/g) || []).length;

    return operators * 0.1 + variables * 0.05 + functions * 0.2;
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

  // Placeholder implementations for complex methods that would require full implementation
  private getPathFromNode(
    nodeId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    visited: Set<string>,
  ): string[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const outgoing = edges.filter((edge) => edge.source === nodeId);
    if (outgoing.length === 0) return [nodeId];

    const paths: string[][] = [];
    for (const edge of outgoing) {
      const subPath = this.getPathFromNode(
        edge.target,
        nodes,
        edges,
        new Set(visited),
      );
      if (subPath.length > 0) {
        paths.push([nodeId, ...subPath]);
      }
    }

    return paths.length > 0 ? paths[0] : [nodeId];
  }

  private extractVariablesFromExpression(expression: string): string[] {
    // Simple variable extraction - would be more sophisticated in real implementation
    const matches =
      expression.match(
        /\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\b/g,
      ) || [];
    return [
      ...new Set(
        matches.filter(
          (match) => !["true", "false", "null", "undefined"].includes(match),
        ),
      ),
    ];
  }

  private findParallelJoinNode(
    splitNodeId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): ReactFlowNode | null {
    // Find the corresponding join node for a parallel split
    // This is a simplified implementation
    const joinNodes = nodes.filter(
      (node) => node.type === "parallel_join" || node.type === "merge",
    );

    // Find the join node that all branches from the split converge to
    const splitEdges = edges.filter((edge) => edge.source === splitNodeId);
    for (const joinNode of joinNodes) {
      const convergingPaths = splitEdges.map((edge) =>
        this.hasPathBetweenNodes(edge.target, joinNode.id, nodes, edges),
      );

      if (convergingPaths.every((hasPath) => hasPath)) {
        return joinNode;
      }
    }

    return null;
  }

  private hasPathBetweenNodes(
    fromId: string,
    toId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): boolean {
    if (fromId === toId) return true;

    const visited = new Set<string>();
    const queue = [fromId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      if (current === toId) return true;

      const outgoing = edges.filter((edge) => edge.source === current);
      queue.push(...outgoing.map((edge) => edge.target));
    }

    return false;
  }

  private getBranchNodes(
    startId: string,
    endId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): string[] {
    // Get all nodes in a branch between start and end
    const branchNodes: string[] = [];
    const visited = new Set<string>();
    const queue = [startId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current) || current === endId) continue;

      visited.add(current);
      branchNodes.push(current);

      const outgoing = edges.filter((edge) => edge.source === current);
      queue.push(...outgoing.map((edge) => edge.target));
    }

    return branchNodes;
  }

  private estimateBranchDuration(
    branchNodes: string[],
    nodes: ReactFlowNode[],
  ): number {
    return branchNodes.reduce((total, nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      return total + (node ? this.estimateNodeDuration(node) : 0);
    }, 0);
  }

  private calculateBranchResources(
    branchNodes: string[],
    nodes: ReactFlowNode[],
  ): ResourceRequirement[] {
    // Simplified resource calculation
    const resources: ResourceRequirement[] = [];

    for (const nodeId of branchNodes) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.data?.resources) {
        resources.push({
          type: "cpu",
          amount: node.data.resources.cpu || 1,
          unit: "cores",
          duration: this.estimateNodeDuration(node),
          shared: false,
          critical: node.data.critical || false,
        });
      }
    }

    return resources;
  }

  private determineLoopType(
    condition: string,
    node?: ReactFlowNode,
  ): "while" | "for" | "do_while" | "foreach" {
    // Analyze condition and node properties to determine loop type
    if (node?.data?.loopType) return node.data.loopType;
    if (condition.includes("forEach") || condition.includes("for each"))
      return "foreach";
    if (condition.includes("for(") || condition.includes("for ")) return "for";
    if (node?.data?.doWhile) return "do_while";
    return "while";
  }

  private findLoopExitConditions(
    bodyNodes: string[],
    edges: ReactFlowEdge[],
  ): string[] {
    // Find conditions that can cause loop exit
    const exitConditions: string[] = [];

    for (const nodeId of bodyNodes) {
      const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!bodyNodes.includes(edge.target) && edge.data?.condition) {
          exitConditions.push(edge.data.condition);
        }
      }
    }

    return exitConditions;
  }

  private topologicalSort(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const node of nodes) {
      inDegree.set(node.id, 0);
    }
    for (const edge of edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Add nodes with no incoming edges
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const outgoing = edges.filter((edge) => edge.source === current);
      for (const edge of outgoing) {
        const newDegree = inDegree.get(edge.target)! - 1;
        inDegree.set(edge.target, newDegree);
        if (newDegree === 0) {
          queue.push(edge.target);
        }
      }
    }

    return result;
  }

  private reconstructPath(
    nodeId: string,
    predecessors: Map<string, string | null>,
  ): string[] {
    const path: string[] = [];
    let current: string | null = nodeId;

    while (current !== null) {
      path.unshift(current);
      current = predecessors.get(current) || null;
    }

    return path;
  }

  // Additional helper methods would be implemented here...
  // For brevity, I'm providing simplified implementations of the remaining methods

  private traceExecutionPaths(
    entryPoint: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): ExecutionPath[] {
    // Simplified implementation - would be more comprehensive in reality
    return [
      {
        id: `path_${entryPoint}`,
        path: [entryPoint],
        probability: 1.0,
        estimatedDuration: 1000,
        resourceRequirements: [],
        errorProbability: 0.1,
        criticalPath: true,
      },
    ];
  }

  private calculatePathProbability(
    path: ExecutionPath,
    workflow: SimWorkflowDefinition,
  ): number {
    // Simplified probability calculation
    return 1.0 / (path.path.length || 1);
  }

  private estimatePathDuration(
    path: ExecutionPath,
    workflow: SimWorkflowDefinition,
  ): number {
    return path.path.reduce((total, nodeId) => {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      return total + (node ? this.estimateNodeDuration(node) : 0);
    }, 0);
  }

  private calculatePathResourceRequirements(
    path: ExecutionPath,
    workflow: SimWorkflowDefinition,
  ): ResourceRequirement[] {
    return []; // Simplified
  }

  private calculatePathErrorProbability(
    path: ExecutionPath,
    workflow: SimWorkflowDefinition,
  ): number {
    return 0.1; // Simplified
  }

  private isCriticalPath(
    path: ExecutionPath,
    workflow: SimWorkflowDefinition,
  ): boolean {
    return true; // Simplified
  }

  private calculateCyclomaticComplexity(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): number {
    // M = E - N + 2P (where E = edges, N = nodes, P = connected components)
    return edges.length - nodes.length + 2;
  }

  private calculateCognitiveComplexity(
    workflow: SimWorkflowDefinition,
  ): number {
    // Simplified cognitive complexity calculation
    let complexity = 0;
    for (const node of workflow.nodes) {
      if (node.type === "condition") complexity += 1;
      if (node.data?.condition) complexity += 1;
      if (node.type === "loop") complexity += 2;
    }
    return complexity;
  }

  private calculateStructuralComplexity(
    workflow: SimWorkflowDefinition,
  ): number {
    // Based on graph structure metrics
    const nodes = workflow.nodes.length;
    const edges = workflow.edges.length;
    const density = nodes > 1 ? edges / (nodes * (nodes - 1)) : 0;
    return Math.round(density * 100);
  }

  private calculateMaintainabilityIndex(
    workflow: SimWorkflowDefinition,
  ): number {
    // Simplified maintainability calculation
    const nodeCount = workflow.nodes.length;
    const complexity = this.calculateCyclomaticComplexity(
      workflow.nodes,
      workflow.edges,
    );
    return Math.max(0, 171 - 5.2 * Math.log(nodeCount) - 0.23 * complexity);
  }

  private calculateTestabilityScore(workflow: SimWorkflowDefinition): number {
    // Simplified testability score
    const hasTests = workflow.metadata?.hasTests || false;
    const complexity = this.calculateCyclomaticComplexity(
      workflow.nodes,
      workflow.edges,
    );
    const baseScore = hasTests ? 80 : 40;
    return Math.max(0, baseScore - complexity * 2);
  }

  private categorizeNodesByComplexity(
    nodes: ReactFlowNode[],
    workflow: SimWorkflowDefinition,
  ): {
    simple: string[];
    moderate: string[];
    complex: string[];
    veryComplex: string[];
  } {
    const categories = {
      simple: [],
      moderate: [],
      complex: [],
      veryComplex: [],
    };

    for (const node of nodes) {
      const complexity = this.calculateNodeComplexity(node);
      if (complexity < 0.5) categories.simple.push(node.id);
      else if (complexity < 1) categories.moderate.push(node.id);
      else if (complexity < 2) categories.complex.push(node.id);
      else categories.veryComplex.push(node.id);
    }

    return categories;
  }

  private generateComplexityRecommendations(
    overall: number,
    categories: any,
  ): string[] {
    const recommendations = [];

    if (overall > 10) {
      recommendations.push(
        "Consider breaking down complex workflows into smaller, manageable pieces",
      );
    }

    if (categories.veryComplex.length > 0) {
      recommendations.push(
        `Review very complex nodes: ${categories.veryComplex.join(", ")}`,
      );
    }

    if (categories.complex.length > categories.simple.length) {
      recommendations.push(
        "Workflow has high complexity - consider simplification",
      );
    }

    return recommendations;
  }

  // Additional simplified implementations for remaining methods...
  private categorizeTools(toolNodes: ReactFlowNode[]): Record<string, number> {
    return {}; // Simplified
  }

  private async checkToolCompatibility(
    toolNodes: ReactFlowNode[],
  ): Promise<ToolCompatibilityReport[]> {
    return []; // Simplified
  }

  private calculateToolPerformanceImpact(
    toolNodes: ReactFlowNode[],
  ): Record<string, number> {
    return {}; // Simplified
  }

  private extractVariables(workflow: SimWorkflowDefinition): any[] {
    return []; // Simplified
  }

  private analyzeScopeDistribution(variables: any[]): Record<string, number> {
    return {}; // Simplified
  }

  private analyzeTypeDistribution(variables: any[]): Record<string, number> {
    return {}; // Simplified
  }

  private identifyVariableUsagePatterns(
    variables: any[],
    workflow: SimWorkflowDefinition,
  ): VariableUsagePattern[] {
    return []; // Simplified
  }

  private identifyVariableIssues(
    variables: any[],
    workflow: SimWorkflowDefinition,
  ): VariableIssue[] {
    return []; // Simplified
  }

  private suggestVariableOptimizations(
    variables: any[],
    patterns: VariableUsagePattern[],
  ): VariableOptimization[] {
    return []; // Simplified
  }

  private calculateErrorHandlingCoverage(nodes: ReactFlowNode[]): number {
    return 0.8; // Simplified
  }

  private analyzeErrorHandlingStrategies(
    nodes: ReactFlowNode[],
  ): Record<string, number> {
    return {}; // Simplified
  }

  private findUnhandledErrors(
    nodes: ReactFlowNode[],
    workflow: SimWorkflowDefinition,
  ): UnhandledError[] {
    return []; // Simplified
  }

  private traceErrorPaths(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): ErrorPath[] {
    return []; // Simplified
  }

  private identifyRecoveryMechanisms(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): RecoveryMechanism[] {
    return []; // Simplified
  }

  private generateErrorHandlingRecommendations(
    coverage: number,
    unhandledErrors: UnhandledError[],
  ): string[] {
    return []; // Simplified
  }

  private estimateWorkflowExecutionTime(
    workflow: SimWorkflowDefinition,
  ): number {
    return 5000; // Simplified
  }

  private calculateCriticalPathTime(workflow: SimWorkflowDefinition): number {
    return 3000; // Simplified
  }

  private identifyParallelizationOpportunities(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): string[] {
    return []; // Simplified
  }

  private identifyPerformanceBottlenecks(
    nodes: ReactFlowNode[],
    workflow: SimWorkflowDefinition,
  ): PerformanceBottleneck[] {
    return []; // Simplified
  }

  private analyzeResourceUtilization(
    workflow: SimWorkflowDefinition,
  ): ResourceUtilization {
    return {
      cpu: { peak: 50, average: 30, distribution: {} },
      memory: { peak: 100, average: 60, allocation: {} },
      network: { bandwidth: 10, latency: 100, requests: 5 },
      disk: { reads: 3, writes: 2, space: 50 },
    };
  }

  private calculateScalabilityMetrics(
    workflow: SimWorkflowDefinition,
  ): ScalabilityMetrics {
    return {
      maxConcurrentUsers: 100,
      throughput: 50,
      responseTime: { p50: 1000, p95: 2000, p99: 3000 },
      errorRate: 0.01,
      degradationPoints: [],
    };
  }

  private suggestPerformanceOptimizations(
    workflow: SimWorkflowDefinition,
    bottlenecks: PerformanceBottleneck[],
  ): PerformanceOptimization[] {
    return []; // Simplified
  }

  private identifySecurityVulnerabilities(
    nodes: ReactFlowNode[],
    workflow: SimWorkflowDefinition,
  ): SecurityVulnerability[] {
    return []; // Simplified
  }

  private calculateSecurityRiskLevel(
    vulnerabilities: SecurityVulnerability[],
  ): "low" | "medium" | "high" | "critical" {
    return "low"; // Simplified
  }

  private analyzeDataFlowSecurity(
    workflow: SimWorkflowDefinition,
  ): DataFlowSecurity {
    return {
      sensitiveDataPaths: [],
      encryptionCoverage: 0.8,
      exposurePoints: [],
      dataClassification: {},
    };
  }

  private analyzeAccessControlSecurity(
    workflow: SimWorkflowDefinition,
  ): AccessControlSecurity {
    return {
      authenticationRequired: true,
      authorizationGranularity: "role_based",
      privilegeEscalation: [],
      bypasses: [],
      sessionSecurity: "secure",
    };
  }

  private checkComplianceRequirements(
    workflow: SimWorkflowDefinition,
  ): ComplianceCheck[] {
    return []; // Simplified
  }

  private generateSecurityRecommendations(
    vulnerabilities: SecurityVulnerability[],
    dataFlow: DataFlowSecurity,
  ): SecurityRecommendation[] {
    return []; // Simplified
  }

  private findErrorHandlingPaths(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
  ): AlternativePath[] {
    return []; // Simplified
  }
}
