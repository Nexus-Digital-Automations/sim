/**
 * Workflow Structure Processing System
 *
 * Advanced processing system for analyzing and optimizing workflow structures,
 * handling complex patterns like loops, parallel execution, conditional branching,
 * and dependency resolution for accurate journey conversion.
 */

import type {
  AlternativePath,
  CircularDependency,
  ConditionalNode,
  ConversionContext,
  DependencyEdge,
  DependencyGraph,
  DependencyNode,
  ExecutionPath,
  LoopStructure,
  ParallelBranch,
  ParallelSection,
  ReactFlowEdge,
  ReactFlowNode,
  SimWorkflowDefinition,
  WorkflowStructure,
} from './types'

/**
 * Graph analysis utilities for workflow structure processing
 */
export class GraphAnalyzer {
  /**
   * Perform topological sort on workflow nodes
   */
  static topologicalSort(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string[] {
    const inDegree = new Map<string, number>()
    const adjacencyList = new Map<string, string[]>()
    const result: string[] = []
    const queue: string[] = []

    // Initialize data structures
    for (const node of nodes) {
      inDegree.set(node.id, 0)
      adjacencyList.set(node.id, [])
    }

    // Build adjacency list and calculate in-degrees
    for (const edge of edges) {
      const { source, target } = edge
      adjacencyList.get(source)?.push(target)
      inDegree.set(target, (inDegree.get(target) || 0) + 1)
    }

    // Add nodes with no incoming edges to queue
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId)
      }
    }

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)

      // Reduce in-degree of adjacent nodes
      const neighbors = adjacencyList.get(current) || []
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor)! - 1
        inDegree.set(neighbor, newDegree)

        if (newDegree === 0) {
          queue.push(neighbor)
        }
      }
    }

    // Check for cycles
    if (result.length !== nodes.length) {
      throw new Error('Workflow contains circular dependencies')
    }

    return result
  }

  /**
   * Find strongly connected components using Tarjan's algorithm
   */
  static findStronglyConnectedComponents(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): string[][] {
    const index = new Map<string, number>()
    const lowLink = new Map<string, number>()
    const onStack = new Set<string>()
    const stack: string[] = []
    const components: string[][] = []
    let indexCounter = 0

    const adjacencyList = new Map<string, string[]>()

    // Build adjacency list
    for (const node of nodes) {
      adjacencyList.set(node.id, [])
    }

    for (const edge of edges) {
      adjacencyList.get(edge.source)?.push(edge.target)
    }

    const strongConnect = (nodeId: string): void => {
      index.set(nodeId, indexCounter)
      lowLink.set(nodeId, indexCounter)
      indexCounter++
      stack.push(nodeId)
      onStack.add(nodeId)

      const neighbors = adjacencyList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!index.has(neighbor)) {
          strongConnect(neighbor)
          lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, lowLink.get(neighbor)!))
        } else if (onStack.has(neighbor)) {
          lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, index.get(neighbor)!))
        }
      }

      if (lowLink.get(nodeId) === index.get(nodeId)) {
        const component: string[] = []
        let w: string
        do {
          w = stack.pop()!
          onStack.delete(w)
          component.push(w)
        } while (w !== nodeId)

        if (component.length > 1) {
          components.push(component)
        }
      }
    }

    // Run algorithm on all unvisited nodes
    for (const node of nodes) {
      if (!index.has(node.id)) {
        strongConnect(node.id)
      }
    }

    return components
  }

  /**
   * Find the longest path in a DAG (critical path)
   */
  static findLongestPath(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    nodeWeights: Map<string, number> = new Map()
  ): { path: string[]; length: number } {
    const topologicalOrder = GraphAnalyzer.topologicalSort(nodes, edges)
    const distances = new Map<string, number>()
    const predecessors = new Map<string, string | null>()

    // Initialize distances
    for (const nodeId of topologicalOrder) {
      distances.set(nodeId, nodeWeights.get(nodeId) || 1)
      predecessors.set(nodeId, null)
    }

    // Build adjacency list with reverse lookup
    const incomingEdges = new Map<string, string[]>()
    for (const node of nodes) {
      incomingEdges.set(node.id, [])
    }
    for (const edge of edges) {
      incomingEdges.get(edge.target)?.push(edge.source)
    }

    // Calculate longest paths
    for (const nodeId of topologicalOrder) {
      const incoming = incomingEdges.get(nodeId) || []

      for (const predecessor of incoming) {
        const newDistance = (distances.get(predecessor) || 0) + (nodeWeights.get(nodeId) || 1)

        if (newDistance > (distances.get(nodeId) || 0)) {
          distances.set(nodeId, newDistance)
          predecessors.set(nodeId, predecessor)
        }
      }
    }

    // Find the node with maximum distance
    let maxDistance = 0
    let endNode = ''

    for (const [nodeId, distance] of distances.entries()) {
      if (distance > maxDistance) {
        maxDistance = distance
        endNode = nodeId
      }
    }

    // Reconstruct path
    const path: string[] = []
    let current: string | null = endNode

    while (current !== null) {
      path.unshift(current)
      current = predecessors.get(current) || null
    }

    return { path, length: maxDistance }
  }

  /**
   * Detect cycles in the workflow graph
   */
  static detectCycles(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string[][] {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []

    const adjacencyList = new Map<string, string[]>()

    // Build adjacency list
    for (const node of nodes) {
      adjacencyList.set(node.id, [])
    }

    for (const edge of edges) {
      adjacencyList.get(edge.source)?.push(edge.target)
    }

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const neighbors = adjacencyList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, nodeId])
        } else if (recursionStack.has(neighbor)) {
          // Found a back edge - cycle detected
          const cycleStart = path.indexOf(neighbor)
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), nodeId, neighbor])
          }
        }
      }

      recursionStack.delete(nodeId)
    }

    // Run DFS from all unvisited nodes
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, [])
      }
    }

    return cycles
  }
}

/**
 * Execution path analyzer for complex workflow patterns
 */
export class ExecutionPathAnalyzer {
  private context: ConversionContext

  constructor(context: ConversionContext) {
    this.context = context
  }

  /**
   * Analyze all possible execution paths through the workflow
   */
  analyzeExecutionPaths(
    workflow: SimWorkflowDefinition,
    structure: WorkflowStructure
  ): ExecutionPath[] {
    const paths: ExecutionPath[] = []
    const entryPoints = structure.entryPoints

    for (const entryPoint of entryPoints) {
      const nodePaths = this.tracePathsFromNode(
        entryPoint,
        workflow.nodes,
        workflow.edges,
        new Set(),
        []
      )

      for (const nodePath of nodePaths) {
        const executionPath: ExecutionPath = {
          id: `path_${paths.length}`,
          path: nodePath,
          probability: this.calculatePathProbability(nodePath, workflow),
          estimatedDuration: this.estimatePathDuration(nodePath, workflow),
          resourceRequirements: this.calculatePathResources(nodePath, workflow),
          errorProbability: this.calculatePathErrorProbability(nodePath, workflow),
          criticalPath: this.isCriticalPath(nodePath, workflow, structure),
        }

        paths.push(executionPath)
      }
    }

    return this.optimizeExecutionPaths(paths)
  }

  /**
   * Trace all possible paths from a given node
   */
  private tracePathsFromNode(
    nodeId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    visited: Set<string>,
    currentPath: string[]
  ): string[][] {
    // Prevent infinite loops
    if (visited.has(nodeId)) {
      return [currentPath] // Return current path to handle loops properly
    }

    const newVisited = new Set(visited)
    newVisited.add(nodeId)
    const newPath = [...currentPath, nodeId]

    // Find outgoing edges
    const outgoingEdges = edges.filter((edge) => edge.source === nodeId)

    // If no outgoing edges, this is a terminal node
    if (outgoingEdges.length === 0) {
      return [newPath]
    }

    // Recursively trace paths for each outgoing edge
    const allPaths: string[][] = []

    for (const edge of outgoingEdges) {
      const branchPaths = this.tracePathsFromNode(edge.target, nodes, edges, newVisited, newPath)

      allPaths.push(...branchPaths)
    }

    return allPaths
  }

  /**
   * Calculate the probability of a specific execution path
   */
  private calculatePathProbability(path: string[], workflow: SimWorkflowDefinition): number {
    let probability = 1.0

    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = path[i]
      const nextNode = path[i + 1]

      // Find the edge between these nodes
      const edge = workflow.edges.find((e) => e.source === currentNode && e.target === nextNode)

      if (edge?.data?.probability) {
        probability *= edge.data.probability
      } else {
        // If no probability specified, assume equal distribution among alternatives
        const outgoingEdges = workflow.edges.filter((e) => e.source === currentNode)
        if (outgoingEdges.length > 1) {
          probability *= 1 / outgoingEdges.length
        }
      }
    }

    return Math.max(probability, 0.001) // Minimum probability to avoid zero
  }

  /**
   * Estimate the duration of an execution path
   */
  private estimatePathDuration(path: string[], workflow: SimWorkflowDefinition): number {
    let totalDuration = 0

    for (const nodeId of path) {
      const node = workflow.nodes.find((n) => n.id === nodeId)
      if (node) {
        totalDuration += this.estimateNodeDuration(node)
      }
    }

    return totalDuration
  }

  /**
   * Estimate the execution duration of a single node
   */
  private estimateNodeDuration(node: ReactFlowNode): number {
    // Base durations by node type (in milliseconds)
    const baseDurations: Record<string, number> = {
      start: 0,
      end: 0,
      tool: 2000,
      condition: 100,
      user_input: 30000, // 30 seconds for user interaction
      merge: 50,
      parallel_split: 100,
      parallel_join: 100,
      loop: 500,
      api_call: 3000,
      database_operation: 1000,
      notification: 500,
      file_operation: 2000,
      data_transform: 1000,
    }

    let baseDuration = baseDurations[node.type] || 1000

    // Apply complexity multiplier
    const complexity = this.calculateNodeComplexity(node)
    baseDuration *= 1 + complexity * 0.5

    // Apply custom duration if specified
    if (node.data?.estimatedDuration) {
      baseDuration = node.data.estimatedDuration
    }

    return Math.round(baseDuration)
  }

  /**
   * Calculate node complexity factor
   */
  private calculateNodeComplexity(node: ReactFlowNode): number {
    let complexity = 0

    // Configuration complexity
    if (node.data?.config) {
      complexity += Object.keys(node.data.config).length * 0.1
    }

    // Condition complexity
    if (node.data?.condition) {
      const conditionLength = node.data.condition.length
      const operatorCount = (node.data.condition.match(/&&|\|\||==|!=|>|</g) || []).length
      complexity += conditionLength / 50 + operatorCount * 0.2
    }

    // Loop complexity
    if (node.type === 'loop') {
      const maxIterations = node.data?.maxIterations || 10
      complexity += Math.log(maxIterations) * 0.3
    }

    // Error handling complexity
    if (node.data?.errorHandling) {
      complexity += 0.2
    }

    return Math.min(complexity, 2) // Cap at 2x base complexity
  }

  /**
   * Calculate resource requirements for an execution path
   */
  private calculatePathResources(path: string[], workflow: SimWorkflowDefinition): any[] {
    const resources: any[] = []

    for (const nodeId of path) {
      const node = workflow.nodes.find((n) => n.id === nodeId)
      if (node?.data?.resources) {
        resources.push({
          nodeId,
          ...node.data.resources,
        })
      }
    }

    return resources
  }

  /**
   * Calculate error probability for an execution path
   */
  private calculatePathErrorProbability(path: string[], workflow: SimWorkflowDefinition): number {
    let errorProbability = 0

    for (const nodeId of path) {
      const node = workflow.nodes.find((n) => n.id === nodeId)
      if (node) {
        const nodeErrorProbability = this.getNodeErrorProbability(node)
        // Combine probabilities (1 - (1-p1)(1-p2)...)
        errorProbability = 1 - (1 - errorProbability) * (1 - nodeErrorProbability)
      }
    }

    return Math.min(errorProbability, 0.95) // Cap at 95%
  }

  /**
   * Get error probability for a single node
   */
  private getNodeErrorProbability(node: ReactFlowNode): number {
    if (node.data?.errorProbability !== undefined) {
      return node.data.errorProbability
    }

    // Default error probabilities by node type
    const errorProbabilities: Record<string, number> = {
      start: 0,
      end: 0,
      tool: 0.05, // 5% chance of tool failure
      condition: 0.01,
      user_input: 0.1, // 10% chance user provides invalid input
      api_call: 0.15, // 15% chance of API failure
      database_operation: 0.08,
      file_operation: 0.1,
      notification: 0.05,
    }

    return errorProbabilities[node.type] || 0.03 // Default 3% error rate
  }

  /**
   * Determine if a path is critical (longest path)
   */
  private isCriticalPath(
    path: string[],
    workflow: SimWorkflowDefinition,
    structure: WorkflowStructure
  ): boolean {
    // For simplicity, consider paths that include nodes from the critical path
    const criticalPathNodes = new Set(structure.criticalPath)
    const pathNodes = new Set(path)

    // Calculate overlap
    const overlap = [...criticalPathNodes].filter((node) => pathNodes.has(node))

    // Path is critical if it has significant overlap with the critical path
    return overlap.length >= Math.min(criticalPathNodes.size * 0.7, pathNodes.size * 0.7)
  }

  /**
   * Optimize execution paths by removing duplicates and merging similar paths
   */
  private optimizeExecutionPaths(paths: ExecutionPath[]): ExecutionPath[] {
    // Remove exact duplicates
    const uniquePaths = new Map<string, ExecutionPath>()

    for (const path of paths) {
      const pathKey = path.path.join('->')
      if (!uniquePaths.has(pathKey) || path.probability > uniquePaths.get(pathKey)!.probability) {
        uniquePaths.set(pathKey, path)
      }
    }

    // Sort by probability (descending) and keep top paths
    const optimizedPaths = Array.from(uniquePaths.values())
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 50) // Limit to top 50 paths to avoid explosion

    return optimizedPaths
  }
}

/**
 * Parallel execution analyzer for handling concurrent workflow sections
 */
export class ParallelExecutionAnalyzer {
  private context: ConversionContext

  constructor(context: ConversionContext) {
    this.context = context
  }

  /**
   * Analyze parallel execution sections in the workflow
   */
  analyzeParallelSections(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): ParallelSection[] {
    const parallelSections: ParallelSection[] = []

    // Find parallel split nodes
    const splitNodes = nodes.filter(
      (node) => node.type === 'parallel_split' || this.hasMultipleOutgoingEdges(node.id, edges)
    )

    for (const splitNode of splitNodes) {
      const section = this.analyzeParallelSection(splitNode, nodes, edges)
      if (section) {
        parallelSections.push(section)
      }
    }

    return parallelSections
  }

  /**
   * Analyze a single parallel execution section
   */
  private analyzeParallelSection(
    splitNode: ReactFlowNode,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): ParallelSection | null {
    const outgoingEdges = edges.filter((edge) => edge.source === splitNode.id)

    if (outgoingEdges.length < 2) {
      return null // Not actually parallel
    }

    // Find the join node
    const joinNode = this.findJoinNode(splitNode.id, outgoingEdges, nodes, edges)

    if (!joinNode) {
      // No explicit join - use implicit convergence
      return this.createImplicitParallelSection(splitNode, outgoingEdges, nodes, edges)
    }

    // Analyze each parallel branch
    const branches: ParallelBranch[] = []

    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i]
      const branch = this.analyzeBranch(edge.target, joinNode.id, nodes, edges, i)
      branches.push(branch)
    }

    return {
      id: `parallel_${splitNode.id}`,
      splitNode: splitNode.id,
      joinNode: joinNode.id,
      branches,
      synchronizationType: this.determineSynchronizationType(splitNode),
      timeout: splitNode.data?.timeout,
      errorHandling: splitNode.data?.errorHandling || 'fail_fast',
    }
  }

  /**
   * Find the join node for a parallel section
   */
  private findJoinNode(
    splitNodeId: string,
    outgoingEdges: ReactFlowEdge[],
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): ReactFlowNode | null {
    // Look for explicit join/merge nodes
    const explicitJoinNodes = nodes.filter(
      (node) => node.type === 'parallel_join' || node.type === 'merge'
    )

    // Find join node that all branches converge to
    for (const joinNode of explicitJoinNodes) {
      const convergingPaths = outgoingEdges.map((edge) =>
        this.hasPathBetween(edge.target, joinNode.id, nodes, edges)
      )

      if (convergingPaths.every((hasPath) => hasPath)) {
        return joinNode
      }
    }

    // Look for implicit convergence point
    const convergencePoints = this.findConvergencePoints(outgoingEdges, nodes, edges)

    if (convergencePoints.length > 0) {
      // Return the earliest convergence point
      return nodes.find((node) => node.id === convergencePoints[0]) || null
    }

    return null
  }

  /**
   * Check if there's a path between two nodes
   */
  private hasPathBetween(
    fromId: string,
    toId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): boolean {
    if (fromId === toId) return true

    const visited = new Set<string>()
    const queue = [fromId]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (visited.has(current)) continue
      visited.add(current)

      if (current === toId) return true

      const outgoing = edges.filter((edge) => edge.source === current)
      queue.push(...outgoing.map((edge) => edge.target))
    }

    return false
  }

  /**
   * Find convergence points where multiple branches meet
   */
  private findConvergencePoints(
    outgoingEdges: ReactFlowEdge[],
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): string[] {
    const branchPaths: Set<string>[] = []

    // Get all nodes reachable from each branch
    for (const edge of outgoingEdges) {
      const reachableNodes = this.getReachableNodes(edge.target, nodes, edges)
      branchPaths.push(reachableNodes)
    }

    // Find common nodes across all branches
    if (branchPaths.length === 0) return []

    const intersection = branchPaths.reduce((common, current) => {
      return new Set([...common].filter((nodeId) => current.has(nodeId)))
    })

    return Array.from(intersection)
  }

  /**
   * Get all nodes reachable from a given node
   */
  private getReachableNodes(
    startId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): Set<string> {
    const reachable = new Set<string>()
    const queue = [startId]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (reachable.has(current)) continue
      reachable.add(current)

      const outgoing = edges.filter((edge) => edge.source === current)
      queue.push(...outgoing.map((edge) => edge.target))
    }

    return reachable
  }

  /**
   * Create an implicit parallel section when no explicit join is found
   */
  private createImplicitParallelSection(
    splitNode: ReactFlowNode,
    outgoingEdges: ReactFlowEdge[],
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): ParallelSection {
    const branches: ParallelBranch[] = []

    for (let i = 0; i < outgoingEdges.length; i++) {
      const edge = outgoingEdges[i]
      const branch = this.analyzeBranch(edge.target, null, nodes, edges, i)
      branches.push(branch)
    }

    return {
      id: `parallel_implicit_${splitNode.id}`,
      splitNode: splitNode.id,
      joinNode: 'implicit', // No explicit join
      branches,
      synchronizationType: 'any', // Don't wait for all branches
      timeout: splitNode.data?.timeout,
      errorHandling: 'continue', // Continue even if some branches fail
    }
  }

  /**
   * Analyze a single parallel branch
   */
  private analyzeBranch(
    startId: string,
    endId: string | null,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    index: number
  ): ParallelBranch {
    const branchNodes = endId
      ? this.getNodesBetween(startId, endId, nodes, edges)
      : this.getNodesFromStart(startId, nodes, edges)

    return {
      id: `branch_${index}`,
      nodes: branchNodes,
      estimatedDuration: this.estimateBranchDuration(branchNodes, nodes),
      priority: this.getBranchPriority(startId, nodes),
      resources: this.calculateBranchResources(branchNodes, nodes),
      canFail: this.canBranchFail(startId, nodes),
    }
  }

  /**
   * Get all nodes between start and end (exclusive)
   */
  private getNodesBetween(
    startId: string,
    endId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): string[] {
    const path: string[] = []
    const visited = new Set<string>()
    const queue = [startId]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (visited.has(current) || current === endId) {
        continue
      }

      visited.add(current)
      path.push(current)

      const outgoing = edges.filter((edge) => edge.source === current)
      queue.push(...outgoing.map((edge) => edge.target))
    }

    return path
  }

  /**
   * Get all nodes from a starting point (for branches without explicit end)
   */
  private getNodesFromStart(
    startId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): string[] {
    const reachableNodes = this.getReachableNodes(startId, nodes, edges)
    return Array.from(reachableNodes)
  }

  /**
   * Estimate duration for a branch
   */
  private estimateBranchDuration(branchNodes: string[], nodes: ReactFlowNode[]): number {
    let totalDuration = 0

    for (const nodeId of branchNodes) {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        totalDuration += this.estimateNodeDuration(node)
      }
    }

    return totalDuration
  }

  private estimateNodeDuration(node: ReactFlowNode): number {
    // Reuse logic from ExecutionPathAnalyzer
    const baseDurations: Record<string, number> = {
      tool: 2000,
      condition: 100,
      user_input: 30000,
      api_call: 3000,
      database_operation: 1000,
    }

    return baseDurations[node.type] || 1000
  }

  /**
   * Get branch priority from node configuration
   */
  private getBranchPriority(startId: string, nodes: ReactFlowNode[]): number {
    const node = nodes.find((n) => n.id === startId)
    return node?.data?.priority || 1
  }

  /**
   * Calculate resources required by a branch
   */
  private calculateBranchResources(branchNodes: string[], nodes: ReactFlowNode[]): any[] {
    const resources: any[] = []

    for (const nodeId of branchNodes) {
      const node = nodes.find((n) => n.id === nodeId)
      if (node?.data?.resources) {
        resources.push({
          nodeId,
          type: 'cpu',
          amount: node.data.resources.cpu || 1,
          unit: 'cores',
          duration: this.estimateNodeDuration(node),
          shared: false,
          critical: false,
        })
      }
    }

    return resources
  }

  /**
   * Determine if a branch can fail without affecting the overall execution
   */
  private canBranchFail(startId: string, nodes: ReactFlowNode[]): boolean {
    const node = nodes.find((n) => n.id === startId)
    return node?.data?.canFail !== false // Default to true
  }

  /**
   * Check if a node has multiple outgoing edges (potential parallel split)
   */
  private hasMultipleOutgoingEdges(nodeId: string, edges: ReactFlowEdge[]): boolean {
    const outgoingEdges = edges.filter((edge) => edge.source === nodeId)
    return outgoingEdges.length > 1
  }

  /**
   * Determine synchronization type for a parallel section
   */
  private determineSynchronizationType(
    splitNode: ReactFlowNode
  ): 'all' | 'any' | 'first' | 'majority' {
    return splitNode.data?.synchronizationType || 'all'
  }
}

/**
 * Loop structure analyzer for handling iterative workflow patterns
 */
export class LoopStructureAnalyzer {
  private context: ConversionContext

  constructor(context: ConversionContext) {
    this.context = context
  }

  /**
   * Analyze loop structures in the workflow
   */
  analyzeLoopStructures(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): LoopStructure[] {
    const loopStructures: LoopStructure[] = []

    // Find back edges that indicate loops
    const backEdges = this.findBackEdges(nodes, edges)

    for (const backEdge of backEdges) {
      const loopStructure = this.analyzeLoopStructure(backEdge, nodes, edges)
      if (loopStructure) {
        loopStructures.push(loopStructure)
      }
    }

    // Also check for explicit loop nodes
    const explicitLoops = this.findExplicitLoops(nodes, edges)
    loopStructures.push(...explicitLoops)

    return loopStructures
  }

  /**
   * Find back edges that create cycles (loops)
   */
  private findBackEdges(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): ReactFlowEdge[] {
    const backEdges: ReactFlowEdge[] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (nodeId: string): void => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const outgoingEdges = edges.filter((edge) => edge.source === nodeId)

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          dfs(edge.target)
        } else if (recursionStack.has(edge.target)) {
          // This is a back edge
          backEdges.push(edge)
        }
      }

      recursionStack.delete(nodeId)
    }

    // Run DFS from all unvisited nodes
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id)
      }
    }

    return backEdges
  }

  /**
   * Analyze a single loop structure based on a back edge
   */
  private analyzeLoopStructure(
    backEdge: ReactFlowEdge,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): LoopStructure | null {
    const entryNode = backEdge.target // Where the loop starts
    const exitNode = backEdge.source // Where the loop ends/continues

    // Find the loop body (all nodes in the cycle)
    const bodyNodes = this.findLoopBody(entryNode, exitNode, nodes, edges)

    if (bodyNodes.length === 0) {
      return null
    }

    const entryNodeData = nodes.find((n) => n.id === entryNode)
    const condition = this.extractLoopCondition(backEdge, entryNodeData)
    const loopType = this.determineLoopType(condition, entryNodeData)

    return {
      id: `loop_${entryNode}_${exitNode}`,
      entryNode,
      exitNode,
      bodyNodes,
      condition,
      loopType,
      maxIterations: entryNodeData?.data?.maxIterations,
      iterationVariable: entryNodeData?.data?.iterationVariable,
      exitConditions: this.findLoopExitConditions(bodyNodes, edges),
    }
  }

  /**
   * Find all nodes that are part of the loop body
   */
  private findLoopBody(
    entryNode: string,
    exitNode: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): string[] {
    const bodyNodes = new Set<string>()
    const queue = [entryNode]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (bodyNodes.has(current)) continue
      bodyNodes.add(current)

      if (current === exitNode) continue // Don't traverse past exit

      const outgoing = edges.filter((edge) => edge.source === current)
      for (const edge of outgoing) {
        if (!bodyNodes.has(edge.target)) {
          queue.push(edge.target)
        }
      }
    }

    return Array.from(bodyNodes)
  }

  /**
   * Extract loop condition from back edge or entry node
   */
  private extractLoopCondition(
    backEdge: ReactFlowEdge,
    entryNode: ReactFlowNode | undefined
  ): string {
    // Check back edge condition first
    if (backEdge.data?.condition) {
      return backEdge.data.condition
    }

    // Check entry node condition
    if (entryNode?.data?.condition) {
      return entryNode.data.condition
    }

    // Check for common loop patterns
    if (entryNode?.data?.while) {
      return entryNode.data.while
    }

    if (entryNode?.data?.until) {
      return `not (${entryNode.data.until})`
    }

    if (entryNode?.data?.forEach || entryNode?.data?.items) {
      return `iteration < ${entryNode.data.items?.length || 'items.length'}`
    }

    return 'true' // Default infinite loop condition
  }

  /**
   * Determine the type of loop based on condition and node data
   */
  private determineLoopType(
    condition: string,
    entryNode: ReactFlowNode | undefined
  ): 'while' | 'for' | 'do_while' | 'foreach' {
    if (entryNode?.data?.loopType) {
      return entryNode.data.loopType
    }

    if (condition.includes('forEach') || entryNode?.data?.forEach || entryNode?.data?.items) {
      return 'foreach'
    }

    if (condition.includes('for(') || condition.includes('for ') || entryNode?.data?.for) {
      return 'for'
    }

    if (entryNode?.data?.doWhile) {
      return 'do_while'
    }

    return 'while'
  }

  /**
   * Find conditions that can cause loop exit
   */
  private findLoopExitConditions(bodyNodes: string[], edges: ReactFlowEdge[]): string[] {
    const exitConditions: string[] = []

    for (const nodeId of bodyNodes) {
      const outgoingEdges = edges.filter((edge) => edge.source === nodeId)

      for (const edge of outgoingEdges) {
        // If edge goes outside the loop body and has a condition, it's an exit condition
        if (!bodyNodes.includes(edge.target) && edge.data?.condition) {
          exitConditions.push(edge.data.condition)
        }
      }
    }

    return exitConditions
  }

  /**
   * Find explicit loop nodes in the workflow
   */
  private findExplicitLoops(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): LoopStructure[] {
    const explicitLoops: LoopStructure[] = []

    const loopNodes = nodes.filter((node) => node.type === 'loop')

    for (const loopNode of loopNodes) {
      const structure = this.analyzeExplicitLoop(loopNode, nodes, edges)
      if (structure) {
        explicitLoops.push(structure)
      }
    }

    return explicitLoops
  }

  /**
   * Analyze an explicit loop node
   */
  private analyzeExplicitLoop(
    loopNode: ReactFlowNode,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): LoopStructure | null {
    // Find the loop body by tracing outgoing edges
    const outgoingEdges = edges.filter((edge) => edge.source === loopNode.id)

    if (outgoingEdges.length === 0) {
      return null
    }

    // For explicit loops, the body is typically everything reachable until we return
    const bodyNodes = this.getLoopBodyForExplicitLoop(loopNode.id, nodes, edges)

    const condition = this.extractLoopCondition({ data: loopNode.data } as any, loopNode)
    const loopType = this.determineLoopType(condition, loopNode)

    return {
      id: `explicit_loop_${loopNode.id}`,
      entryNode: loopNode.id,
      exitNode: loopNode.id, // For explicit loops, entry and exit are the same node
      bodyNodes,
      condition,
      loopType,
      maxIterations: loopNode.data?.maxIterations,
      iterationVariable: loopNode.data?.iterationVariable,
      exitConditions: loopNode.data?.exitConditions || [],
    }
  }

  /**
   * Get loop body for explicit loop node
   */
  private getLoopBodyForExplicitLoop(
    loopNodeId: string,
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): string[] {
    const bodyNodes = new Set<string>()
    const queue = [loopNodeId]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!

      if (visited.has(current)) continue
      visited.add(current)

      if (current !== loopNodeId) {
        bodyNodes.add(current)
      }

      const outgoing = edges.filter((edge) => edge.source === current)
      for (const edge of outgoing) {
        // Stop if we return to the loop node (loop back edge)
        if (edge.target === loopNodeId) continue

        queue.push(edge.target)
      }
    }

    return Array.from(bodyNodes)
  }
}

/**
 * Main workflow structure processor that coordinates all analysis components
 */
export class WorkflowStructureProcessor {
  private context: ConversionContext
  private graphAnalyzer: GraphAnalyzer
  private pathAnalyzer: ExecutionPathAnalyzer
  private parallelAnalyzer: ParallelExecutionAnalyzer
  private loopAnalyzer: LoopStructureAnalyzer

  constructor(context: ConversionContext) {
    this.context = context
    this.pathAnalyzer = new ExecutionPathAnalyzer(context)
    this.parallelAnalyzer = new ParallelExecutionAnalyzer(context)
    this.loopAnalyzer = new LoopStructureAnalyzer(context)
  }

  /**
   * Process workflow structure and generate comprehensive analysis
   */
  async processWorkflowStructure(workflow: SimWorkflowDefinition): Promise<{
    structure: WorkflowStructure
    executionPaths: ExecutionPath[]
    dependencies: DependencyGraph
  }> {
    const { nodes, edges } = workflow

    this.log('info', 'Processing workflow structure', {
      workflowId: workflow.id,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    })

    // Analyze basic structure
    const structure = await this.analyzeBasicStructure(nodes, edges)

    // Analyze execution paths
    const executionPaths = this.pathAnalyzer.analyzeExecutionPaths(workflow, structure)

    // Build dependency graph
    const dependencies = this.buildDependencyGraph(nodes, edges)

    this.log('info', 'Workflow structure processing complete', {
      workflowId: workflow.id,
      entryPoints: structure.entryPoints.length,
      exitPoints: structure.exitPoints.length,
      executionPaths: executionPaths.length,
      parallelSections: structure.parallelSections.length,
      loops: structure.loopStructures.length,
    })

    return {
      structure,
      executionPaths,
      dependencies,
    }
  }

  /**
   * Analyze basic workflow structure
   */
  private async analyzeBasicStructure(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): Promise<WorkflowStructure> {
    // Find entry and exit points
    const entryPoints = this.findEntryPoints(nodes, edges)
    const exitPoints = this.findExitPoints(nodes, edges)

    // Analyze complex structures
    const conditionalNodes = this.findConditionalNodes(nodes, edges)
    const parallelSections = this.parallelAnalyzer.analyzeParallelSections(nodes, edges)
    const loopStructures = this.loopAnalyzer.analyzeLoopStructures(nodes, edges)

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(nodes, edges)

    // Find alternative paths
    const alternativePaths = this.findAlternativePaths(nodes, edges, conditionalNodes)

    // Identify structural issues
    const unreachableNodes = this.findUnreachableNodes(nodes, edges, entryPoints)
    const orphanedNodes = this.findOrphanedNodes(nodes, edges)

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
    }
  }

  private findEntryPoints(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string[] {
    const targets = new Set(edges.map((edge) => edge.target))
    const entryPoints = nodes
      .filter((node) => !targets.has(node.id) || node.type === 'start')
      .map((node) => node.id)

    return entryPoints.length > 0 ? entryPoints : [nodes[0]?.id].filter(Boolean)
  }

  private findExitPoints(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string[] {
    const sources = new Set(edges.map((edge) => edge.source))
    const exitPoints = nodes
      .filter((node) => !sources.has(node.id) || node.type === 'end')
      .map((node) => node.id)

    return exitPoints.length > 0 ? exitPoints : [nodes[nodes.length - 1]?.id].filter(Boolean)
  }

  private findConditionalNodes(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): ConditionalNode[] {
    return nodes
      .filter((node) => node.type === 'condition' || node.data?.condition)
      .map((node) => {
        const outgoingEdges = edges.filter((edge) => edge.source === node.id)
        const condition = node.data?.condition || 'true'

        return {
          nodeId: node.id,
          condition,
          truePath: this.getConditionalPath(node.id, edges, 'true'),
          falsePath: this.getConditionalPath(node.id, edges, 'false'),
          variables: this.extractVariablesFromCondition(condition),
          complexity: this.calculateConditionComplexity(condition),
        }
      })
  }

  private getConditionalPath(nodeId: string, edges: ReactFlowEdge[], branch: string): string[] {
    const relevantEdges = edges.filter(
      (edge) =>
        edge.source === nodeId &&
        (edge.data?.condition === branch || (!edge.data?.condition && branch === 'true'))
    )

    return relevantEdges.map((edge) => edge.target)
  }

  private extractVariablesFromCondition(condition: string): string[] {
    const matches =
      condition.match(/\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\b/g) || []
    return [
      ...new Set(
        matches.filter((match) => !['true', 'false', 'null', 'undefined'].includes(match))
      ),
    ]
  }

  private calculateConditionComplexity(condition: string): number {
    const operators = (condition.match(/&&|\|\||!|==|!=|<|>|<=|>=/g) || []).length
    const variables = (condition.match(/\w+/g) || []).length
    const functions = (condition.match(/\w+\(/g) || []).length

    return operators * 0.1 + variables * 0.05 + functions * 0.2
  }

  private calculateCriticalPath(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string[] {
    try {
      const nodeWeights = new Map(nodes.map((node) => [node.id, this.estimateNodeWeight(node)]))

      const { path } = GraphAnalyzer.findLongestPath(nodes, edges, nodeWeights)
      return path
    } catch (error) {
      this.log('warn', 'Could not calculate critical path, using simple traversal', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Fallback to simple traversal from first entry point
      const entryPoints = this.findEntryPoints(nodes, edges)
      return entryPoints.length > 0 ? [entryPoints[0]] : []
    }
  }

  private estimateNodeWeight(node: ReactFlowNode): number {
    const weights: Record<string, number> = {
      start: 0,
      end: 0,
      tool: 5,
      condition: 1,
      user_input: 10,
      loop: 3,
      parallel_split: 2,
      merge: 1,
    }

    return weights[node.type] || 2
  }

  private findAlternativePaths(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    conditionalNodes: ConditionalNode[]
  ): AlternativePath[] {
    const alternativePaths: AlternativePath[] = []

    for (const conditionalNode of conditionalNodes) {
      if (conditionalNode.truePath.length > 0 && conditionalNode.falsePath.length > 0) {
        alternativePaths.push({
          mainPath: conditionalNode.truePath,
          alternativePath: conditionalNode.falsePath,
          condition: conditionalNode.condition,
          trigger: 'condition',
          probability: 0.5,
        })
      }
    }

    return alternativePaths
  }

  private findUnreachableNodes(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    entryPoints: string[]
  ): string[] {
    const reachable = new Set<string>()
    const queue = [...entryPoints]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (reachable.has(current)) continue

      reachable.add(current)
      const outgoing = edges.filter((edge) => edge.source === current)
      queue.push(...outgoing.map((edge) => edge.target))
    }

    return nodes.filter((node) => !reachable.has(node.id)).map((node) => node.id)
  }

  private findOrphanedNodes(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): string[] {
    const connected = new Set<string>()

    edges.forEach((edge) => {
      connected.add(edge.source)
      connected.add(edge.target)
    })

    return nodes.filter((node) => !connected.has(node.id)).map((node) => node.id)
  }

  private buildDependencyGraph(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): DependencyGraph {
    const dependencyNodes: DependencyNode[] = nodes.map((node) => {
      const incoming = edges.filter((edge) => edge.target === node.id)
      const outgoing = edges.filter((edge) => edge.source === node.id)

      return {
        nodeId: node.id,
        dependencies: incoming.map((edge) => edge.source),
        dependents: outgoing.map((edge) => edge.target),
        level: 0, // Will be calculated
        criticalPath: false, // Will be calculated
      }
    })

    const dependencyEdges: DependencyEdge[] = edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
      type: 'control',
      strength: 'strong',
      condition: edge.data?.condition,
    }))

    // Find strongly connected components
    const stronglyConnectedComponents = GraphAnalyzer.findStronglyConnectedComponents(nodes, edges)

    // Calculate topological order
    let topologicalOrder: string[] = []
    try {
      topologicalOrder = GraphAnalyzer.topologicalSort(nodes, edges)
    } catch (error) {
      this.log('warn', 'Could not calculate topological order due to cycles')
      topologicalOrder = nodes.map((n) => n.id)
    }

    // Find circular dependencies
    const circularDependencies: CircularDependency[] = stronglyConnectedComponents.map(
      (component) => ({
        nodes: component,
        type: 'control',
        severity: 'warning',
        resolution: `Consider restructuring nodes: ${component.join(', ')}`,
      })
    )

    // Calculate dependency levels
    const dependencyLevels: Record<string, number> = {}
    for (let i = 0; i < topologicalOrder.length; i++) {
      dependencyLevels[topologicalOrder[i]] = i
    }

    return {
      nodes: dependencyNodes,
      edges: dependencyEdges,
      stronglyConnectedComponents,
      topologicalOrder,
      circularDependencies,
      dependencyLevels,
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.context.logger) {
      this.context.logger[level](message, meta)
    }
  }
}

export {
  GraphAnalyzer,
  ExecutionPathAnalyzer,
  ParallelExecutionAnalyzer,
  LoopStructureAnalyzer,
  WorkflowStructureProcessor,
}
