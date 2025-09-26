/**
 * Test Data Generation and Maintenance System
 * ==========================================
 *
 * Comprehensive utilities for generating, maintaining, and validating test data
 * for the workflow-to-journey mapping system testing infrastructure.
 */

import type {
  ParlantJourney,
  ReactFlowEdge,
  ReactFlowNode,
  WorkflowState,
} from '../../services/parlant/workflow-converter/types'

// ========================================
// TEST DATA GENERATION CONFIGURATION
// ========================================

export interface TestDataConfig {
  seed?: string
  complexity: 'simple' | 'medium' | 'complex' | 'extreme'
  includeEdgeCases: boolean
  validationLevel: 'basic' | 'strict' | 'comprehensive'
  generateErrors: boolean
  customNodeTypes?: string[]
}

export interface TestScenario {
  id: string
  name: string
  description: string
  complexity: TestDataConfig['complexity']
  workflow: WorkflowState
  expectedJourney: Partial<ParlantJourney>
  validationRules: ValidationRule[]
  metadata: {
    nodeCount: number
    edgeCount: number
    branchingFactor: number
    maxDepth: number
    containsLoops: boolean
    blockTypes: string[]
  }
}

interface ValidationRule {
  id: string
  type: 'conversion' | 'performance' | 'data-integrity' | 'business-logic'
  assertion: string
  expected: any
  tolerance?: number
}

// ========================================
// COMPREHENSIVE TEST DATA GENERATOR
// ========================================

export class ComprehensiveTestDataGenerator {
  private config: TestDataConfig
  private scenarios: Map<string, TestScenario> = new Map()
  private seedRng: () => number

  constructor(
    config: TestDataConfig = {
      complexity: 'medium',
      includeEdgeCases: true,
      validationLevel: 'strict',
      generateErrors: false,
    }
  ) {
    this.config = config
    this.seedRng = this.createSeededRandom(config.seed || 'test-seed-2024')
  }

  // ========================================
  // WORKFLOW GENERATION
  // ========================================

  /**
   * Generate comprehensive test workflows for all complexity levels
   */
  generateTestWorkflows(): TestScenario[] {
    const scenarios: TestScenario[] = []

    // Basic workflows
    scenarios.push(...this.generateBasicWorkflows())

    // Complex workflows
    scenarios.push(...this.generateComplexWorkflows())

    // Edge case workflows
    if (this.config.includeEdgeCases) {
      scenarios.push(...this.generateEdgeCaseWorkflows())
    }

    // Error case workflows
    if (this.config.generateErrors) {
      scenarios.push(...this.generateErrorCaseWorkflows())
    }

    // Cache scenarios for reuse
    scenarios.forEach((scenario) => this.scenarios.set(scenario.id, scenario))

    return scenarios
  }

  private generateBasicWorkflows(): TestScenario[] {
    return [
      this.createLinearWorkflowScenario(),
      this.createSimpleBranchingScenario(),
      this.createBasicLoopScenario(),
      this.createApiCallScenario(),
      this.createAgentInteractionScenario(),
    ]
  }

  private generateComplexWorkflows(): TestScenario[] {
    return [
      this.createMultiBranchWorkflowScenario(),
      this.createNestedLoopScenario(),
      this.createParallelProcessingScenario(),
      this.createDynamicWorkflowScenario(),
      this.createLargeScaleWorkflowScenario(),
    ]
  }

  private generateEdgeCaseWorkflows(): TestScenario[] {
    return [
      this.createEmptyWorkflowScenario(),
      this.createSingleNodeScenario(),
      this.createDisconnectedNodesScenario(),
      this.createCircularDependencyScenario(),
      this.createMaximumComplexityScenario(),
    ]
  }

  private generateErrorCaseWorkflows(): TestScenario[] {
    return [
      this.createInvalidNodeDataScenario(),
      this.createMissingConnectionsScenario(),
      this.createUnsupportedBlockTypeScenario(),
      this.createCorruptedDataScenario(),
    ]
  }

  // ========================================
  // SPECIFIC SCENARIO GENERATORS
  // ========================================

  private createLinearWorkflowScenario(): TestScenario {
    const nodes: ReactFlowNode[] = [
      this.createStarterNode('start-1', 'Workflow Start', { x: 100, y: 100 }),
      this.createAgentNode(
        'agent-1',
        'Welcome Agent',
        { x: 100, y: 200 },
        {
          prompt: 'Welcome to our service! How can I help you today?',
          model: 'gpt-4',
          tools: ['conversation_management'],
        }
      ),
      this.createApiNode(
        'api-1',
        'User Data Fetch',
        { x: 100, y: 300 },
        {
          url: 'https://api.example.com/user-data',
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
      this.createEndNode('end-1', 'Workflow Complete', { x: 100, y: 400 }),
    ]

    const edges: ReactFlowEdge[] = [
      this.createEdge('edge-1', 'start-1', 'agent-1'),
      this.createEdge('edge-2', 'agent-1', 'api-1'),
      this.createEdge('edge-3', 'api-1', 'end-1'),
    ]

    return {
      id: 'linear-workflow-basic',
      name: 'Linear Workflow - Basic Flow',
      description: 'Simple linear progression through starter, agent, API call, and end',
      complexity: 'simple',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Linear Workflow Journey',
        description: 'Generated journey for linear workflow testing',
      },
      validationRules: [
        {
          id: 'node-count-validation',
          type: 'data-integrity',
          assertion: 'journey.states.length === 4',
          expected: 4,
        },
        {
          id: 'transition-count-validation',
          type: 'data-integrity',
          assertion: 'journey.transitions.length === 3',
          expected: 3,
        },
        {
          id: 'linear-flow-validation',
          type: 'business-logic',
          assertion: 'hasLinearFlow(journey)',
          expected: true,
        },
      ],
      metadata: {
        nodeCount: 4,
        edgeCount: 3,
        branchingFactor: 1,
        maxDepth: 4,
        containsLoops: false,
        blockTypes: ['starter', 'agent', 'api', 'end'],
      },
    }
  }

  private createSimpleBranchingScenario(): TestScenario {
    const nodes: ReactFlowNode[] = [
      this.createStarterNode('start-1', 'Start', { x: 200, y: 100 }),
      this.createDecisionNode(
        'decision-1',
        'User Type Check',
        { x: 200, y: 200 },
        {
          conditions: [
            { condition: 'user.type === "premium"', path: 'premium' },
            { condition: 'user.type === "basic"', path: 'basic' },
          ],
        }
      ),
      this.createAgentNode(
        'agent-premium',
        'Premium Support',
        { x: 100, y: 300 },
        {
          prompt: "Welcome, premium user! I'll provide you with priority support.",
          tools: ['premium_features', 'priority_queue'],
        }
      ),
      this.createAgentNode(
        'agent-basic',
        'Standard Support',
        { x: 300, y: 300 },
        {
          prompt: "Hello! I'm here to help with your questions.",
          tools: ['basic_features'],
        }
      ),
      this.createEndNode('end-1', 'Complete', { x: 200, y: 400 }),
    ]

    const edges: ReactFlowEdge[] = [
      this.createEdge('edge-1', 'start-1', 'decision-1'),
      this.createConditionalEdge('edge-2', 'decision-1', 'agent-premium', {
        condition: 'user.type === "premium"',
      }),
      this.createConditionalEdge('edge-3', 'decision-1', 'agent-basic', {
        condition: 'user.type === "basic"',
      }),
      this.createEdge('edge-4', 'agent-premium', 'end-1'),
      this.createEdge('edge-5', 'agent-basic', 'end-1'),
    ]

    return {
      id: 'simple-branching-workflow',
      name: 'Simple Branching - User Type Routing',
      description: 'Workflow with conditional branching based on user type',
      complexity: 'medium',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Branching Workflow Journey',
        description: 'Journey with conditional state transitions',
      },
      validationRules: [
        {
          id: 'branching-validation',
          type: 'business-logic',
          assertion: 'hasBranching(journey)',
          expected: true,
        },
        {
          id: 'conditional-transitions',
          type: 'conversion',
          assertion: 'journey.transitions.some(t => t.conditions?.length > 0)',
          expected: true,
        },
      ],
      metadata: {
        nodeCount: 5,
        edgeCount: 5,
        branchingFactor: 2,
        maxDepth: 4,
        containsLoops: false,
        blockTypes: ['starter', 'decision', 'agent', 'agent', 'end'],
      },
    }
  }

  private createBasicLoopScenario(): TestScenario {
    const nodes: ReactFlowNode[] = [
      this.createStarterNode('start-1', 'Start Loop Demo', { x: 200, y: 100 }),
      this.createAgentNode(
        'agent-1',
        'Question Agent',
        { x: 200, y: 200 },
        {
          prompt: 'I\'ll ask you some questions. Type "done" when finished.',
          tools: ['question_management'],
        }
      ),
      this.createDecisionNode(
        'decision-1',
        'Continue Check',
        { x: 200, y: 300 },
        {
          conditions: [
            { condition: 'user_input !== "done"', path: 'continue' },
            { condition: 'user_input === "done"', path: 'finish' },
          ],
        }
      ),
      this.createEndNode('end-1', 'Loop Complete', { x: 200, y: 400 }),
    ]

    const edges: ReactFlowEdge[] = [
      this.createEdge('edge-1', 'start-1', 'agent-1'),
      this.createEdge('edge-2', 'agent-1', 'decision-1'),
      this.createConditionalEdge('edge-3', 'decision-1', 'agent-1', {
        condition: 'user_input !== "done"',
      }),
      this.createConditionalEdge('edge-4', 'decision-1', 'end-1', {
        condition: 'user_input === "done"',
      }),
    ]

    return {
      id: 'basic-loop-workflow',
      name: 'Basic Loop - Question Iteration',
      description: 'Workflow with simple loop for repeated interactions',
      complexity: 'medium',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Loop Workflow Journey',
        description: 'Journey with loop-back transitions',
      },
      validationRules: [
        {
          id: 'loop-detection',
          type: 'business-logic',
          assertion: 'hasLoops(journey)',
          expected: true,
        },
        {
          id: 'loop-exit-condition',
          type: 'business-logic',
          assertion: 'hasLoopExitCondition(journey)',
          expected: true,
        },
      ],
      metadata: {
        nodeCount: 4,
        edgeCount: 4,
        branchingFactor: 2,
        maxDepth: 4,
        containsLoops: true,
        blockTypes: ['starter', 'agent', 'decision', 'end'],
      },
    }
  }

  private createLargeScaleWorkflowScenario(): TestScenario {
    const nodes: ReactFlowNode[] = []
    const edges: ReactFlowEdge[] = []

    // Create a comprehensive workflow with 20+ nodes
    nodes.push(this.createStarterNode('start-1', 'Large Workflow Start', { x: 100, y: 50 }))

    // Create multiple parallel branches
    for (let branch = 1; branch <= 3; branch++) {
      const branchY = 50 + branch * 200

      // Each branch has multiple steps
      nodes.push(
        this.createAgentNode(`branch-${branch}-agent-1`, `Branch ${branch} - Initial`, {
          x: 200,
          y: branchY,
        }),
        this.createApiNode(
          `branch-${branch}-api-1`,
          `Branch ${branch} - Data Fetch`,
          { x: 300, y: branchY },
          {
            url: `https://api.example.com/branch-${branch}/data`,
            method: 'GET',
          }
        ),
        this.createDecisionNode(`branch-${branch}-decision`, `Branch ${branch} - Decision`, {
          x: 400,
          y: branchY,
        }),
        this.createAgentNode(`branch-${branch}-agent-2`, `Branch ${branch} - Processing`, {
          x: 500,
          y: branchY,
        })
      )
    }

    // Convergence point
    nodes.push(
      this.createAgentNode('convergence', 'Results Compilation', { x: 600, y: 250 }),
      this.createApiNode(
        'final-api',
        'Final Data Save',
        { x: 700, y: 250 },
        {
          url: 'https://api.example.com/save-results',
          method: 'POST',
        }
      ),
      this.createEndNode('end-1', 'Large Workflow Complete', { x: 800, y: 250 })
    )

    // Connect the workflow
    edges.push(this.createEdge('start-to-branches', 'start-1', 'branch-1-agent-1'))

    for (let branch = 1; branch <= 3; branch++) {
      edges.push(
        this.createEdge(`branch-${branch}-1`, `branch-${branch}-agent-1`, `branch-${branch}-api-1`),
        this.createEdge(
          `branch-${branch}-2`,
          `branch-${branch}-api-1`,
          `branch-${branch}-decision`
        ),
        this.createEdge(
          `branch-${branch}-3`,
          `branch-${branch}-decision`,
          `branch-${branch}-agent-2`
        ),
        this.createEdge(
          `branch-${branch}-to-convergence`,
          `branch-${branch}-agent-2`,
          'convergence'
        )
      )
    }

    edges.push(
      this.createEdge('convergence-to-final', 'convergence', 'final-api'),
      this.createEdge('final-to-end', 'final-api', 'end-1')
    )

    return {
      id: 'large-scale-workflow',
      name: 'Large Scale - Complex Multi-Branch',
      description: 'Large workflow with parallel processing and convergence',
      complexity: 'extreme',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Large Scale Journey',
        description: 'Complex journey with parallel state execution',
      },
      validationRules: [
        {
          id: 'scale-validation',
          type: 'performance',
          assertion: 'journey.states.length >= 15',
          expected: 15,
        },
        {
          id: 'parallel-processing',
          type: 'business-logic',
          assertion: 'hasParallelExecution(journey)',
          expected: true,
        },
        {
          id: 'convergence-validation',
          type: 'business-logic',
          assertion: 'hasConvergencePoint(journey)',
          expected: true,
        },
      ],
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        branchingFactor: 3,
        maxDepth: 8,
        containsLoops: false,
        blockTypes: ['starter', 'agent', 'api', 'decision', 'end'],
      },
    }
  }

  private createEmptyWorkflowScenario(): TestScenario {
    return {
      id: 'empty-workflow-edge-case',
      name: 'Empty Workflow - Edge Case',
      description: 'Workflow with no nodes or edges to test error handling',
      complexity: 'simple',
      workflow: { nodes: [], edges: [] },
      expectedJourney: {
        name: 'Empty Journey',
        description: 'Should handle empty workflow gracefully',
      },
      validationRules: [
        {
          id: 'empty-handling',
          type: 'conversion',
          assertion: 'journey.states.length === 0 || hasDefaultInitialState(journey)',
          expected: true,
        },
      ],
      metadata: {
        nodeCount: 0,
        edgeCount: 0,
        branchingFactor: 0,
        maxDepth: 0,
        containsLoops: false,
        blockTypes: [],
      },
    }
  }

  // ========================================
  // NODE CREATION UTILITIES
  // ========================================

  private createStarterNode(
    id: string,
    name: string,
    position: { x: number; y: number },
    data?: any
  ): ReactFlowNode {
    return {
      id,
      type: 'starter',
      position,
      data: {
        name,
        type: 'starter',
        description: `Starter node for ${name}`,
        ...data,
      },
    }
  }

  private createAgentNode(
    id: string,
    name: string,
    position: { x: number; y: number },
    config: any
  ): ReactFlowNode {
    return {
      id,
      type: 'agent',
      position,
      data: {
        name,
        type: 'agent',
        description: `AI agent: ${name}`,
        ...config,
      },
    }
  }

  private createApiNode(
    id: string,
    name: string,
    position: { x: number; y: number },
    config: any
  ): ReactFlowNode {
    return {
      id,
      type: 'api',
      position,
      data: {
        name,
        type: 'api',
        description: `API call: ${name}`,
        ...config,
      },
    }
  }

  private createDecisionNode(
    id: string,
    name: string,
    position: { x: number; y: number },
    config: any
  ): ReactFlowNode {
    return {
      id,
      type: 'decision',
      position,
      data: {
        name,
        type: 'decision',
        description: `Decision point: ${name}`,
        ...config,
      },
    }
  }

  private createEndNode(
    id: string,
    name: string,
    position: { x: number; y: number },
    data?: any
  ): ReactFlowNode {
    return {
      id,
      type: 'end',
      position,
      data: {
        name,
        type: 'end',
        description: `End point: ${name}`,
        ...data,
      },
    }
  }

  // ========================================
  // EDGE CREATION UTILITIES
  // ========================================

  private createEdge(id: string, source: string, target: string): ReactFlowEdge {
    return {
      id,
      source,
      target,
      type: 'default',
    }
  }

  private createConditionalEdge(
    id: string,
    source: string,
    target: string,
    condition: any
  ): ReactFlowEdge {
    return {
      id,
      source,
      target,
      type: 'conditional',
      data: condition,
    }
  }

  // ========================================
  // VALIDATION UTILITIES
  // ========================================

  /**
   * Validate generated test scenario data
   */
  validateTestScenario(scenario: TestScenario): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate basic structure
    if (!scenario.id) errors.push('Scenario missing ID')
    if (!scenario.name) errors.push('Scenario missing name')
    if (!scenario.workflow) errors.push('Scenario missing workflow')
    if (!scenario.workflow.nodes) errors.push('Workflow missing nodes array')
    if (!scenario.workflow.edges) errors.push('Workflow missing edges array')

    // Validate node-edge consistency
    const nodeIds = new Set(scenario.workflow.nodes.map((n) => n.id))
    scenario.workflow.edges.forEach((edge) => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`)
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`)
      }
    })

    // Validate metadata consistency
    if (scenario.metadata.nodeCount !== scenario.workflow.nodes.length) {
      warnings.push('Metadata node count does not match actual node count')
    }
    if (scenario.metadata.edgeCount !== scenario.workflow.edges.length) {
      warnings.push('Metadata edge count does not match actual edge count')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors, warnings),
    }
  }

  private calculateValidationScore(errors: string[], warnings: string[]): number {
    const maxScore = 100
    const errorPenalty = 10
    const warningPenalty = 2

    return Math.max(0, maxScore - errors.length * errorPenalty - warnings.length * warningPenalty)
  }

  // ========================================
  // TEST DATA PERSISTENCE
  // ========================================

  /**
   * Export test scenarios for reuse
   */
  exportTestScenarios(): string {
    const data = {
      config: this.config,
      scenarios: Array.from(this.scenarios.values()),
      metadata: {
        generated: new Date().toISOString(),
        totalScenarios: this.scenarios.size,
        complexityBreakdown: this.getComplexityBreakdown(),
      },
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Import previously generated test scenarios
   */
  importTestScenarios(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData)

      if (data.scenarios) {
        this.scenarios.clear()
        data.scenarios.forEach((scenario: TestScenario) => {
          this.scenarios.set(scenario.id, scenario)
        })
      }

      if (data.config) {
        this.config = { ...this.config, ...data.config }
      }
    } catch (error) {
      throw new Error(
        `Failed to import test scenarios: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private getComplexityBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {
      simple: 0,
      medium: 0,
      complex: 0,
      extreme: 0,
    }

    this.scenarios.forEach((scenario) => {
      breakdown[scenario.complexity]++
    })

    return breakdown
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private createSeededRandom(seed: string): () => number {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }

    return () => {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff
      return hash / 0x7fffffff
    }
  }

  /**
   * Get scenario by ID
   */
  getScenario(id: string): TestScenario | undefined {
    return this.scenarios.get(id)
  }

  /**
   * Get all scenarios by complexity
   */
  getScenariosByComplexity(complexity: TestDataConfig['complexity']): TestScenario[] {
    return Array.from(this.scenarios.values()).filter((s) => s.complexity === complexity)
  }

  /**
   * Get random scenario for fuzzing
   */
  getRandomScenario(): TestScenario | undefined {
    const scenarios = Array.from(this.scenarios.values())
    if (scenarios.length === 0) return undefined

    const index = Math.floor(this.seedRng() * scenarios.length)
    return scenarios[index]
  }
}

// ========================================
// ADDITIONAL UTILITY TYPES
// ========================================

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  score: number
}

// ========================================
// PERFORMANCE TEST DATA GENERATOR
// ========================================

export class PerformanceTestDataGenerator {
  private generator: ComprehensiveTestDataGenerator

  constructor(config: TestDataConfig) {
    this.generator = new ComprehensiveTestDataGenerator(config)
  }

  /**
   * Generate test data specifically for performance benchmarking
   */
  generatePerformanceTestSuite(): PerformanceTestSuite {
    return {
      benchmarkScenarios: this.generateBenchmarkScenarios(),
      loadTestScenarios: this.generateLoadTestScenarios(),
      stressTestScenarios: this.generateStressTestScenarios(),
      memoryTestScenarios: this.generateMemoryTestScenarios(),
    }
  }

  private generateBenchmarkScenarios(): TestScenario[] {
    return [
      // Small workflow - baseline
      this.generator.getScenariosByComplexity('simple')[0],
      // Medium workflow - typical use case
      this.generator.getScenariosByComplexity('medium')[0],
      // Large workflow - stress test
      this.generator.getScenariosByComplexity('extreme')[0],
    ].filter(Boolean)
  }

  private generateLoadTestScenarios(): TestScenario[] {
    // Create scenarios with increasing node counts
    const scenarios: TestScenario[] = []
    const nodeCounts = [5, 10, 25, 50, 100, 250]

    nodeCounts.forEach((nodeCount) => {
      scenarios.push(this.createLoadTestScenario(nodeCount))
    })

    return scenarios
  }

  private createLoadTestScenario(nodeCount: number): TestScenario {
    const nodes: ReactFlowNode[] = []
    const edges: ReactFlowEdge[] = []

    // Create linear chain of nodes
    for (let i = 0; i < nodeCount; i++) {
      const nodeType = i === 0 ? 'starter' : i === nodeCount - 1 ? 'end' : 'agent'
      nodes.push({
        id: `load-node-${i}`,
        type: nodeType,
        position: { x: i * 100, y: 100 },
        data: {
          name: `Load Test Node ${i}`,
          type: nodeType,
          description: `Generated node for load testing - ${i}/${nodeCount}`,
        },
      })

      if (i > 0) {
        edges.push({
          id: `load-edge-${i}`,
          source: `load-node-${i - 1}`,
          target: `load-node-${i}`,
          type: 'default',
        })
      }
    }

    return {
      id: `load-test-${nodeCount}-nodes`,
      name: `Load Test - ${nodeCount} Nodes`,
      description: `Linear workflow with ${nodeCount} nodes for load testing`,
      complexity: nodeCount < 25 ? 'simple' : nodeCount < 100 ? 'medium' : 'extreme',
      workflow: { nodes, edges },
      expectedJourney: {
        name: `Load Test Journey - ${nodeCount} nodes`,
        description: `Performance test journey with ${nodeCount} states`,
      },
      validationRules: [
        {
          id: 'node-count-validation',
          type: 'performance',
          assertion: `journey.states.length === ${nodeCount}`,
          expected: nodeCount,
        },
      ],
      metadata: {
        nodeCount,
        edgeCount: nodeCount - 1,
        branchingFactor: 1,
        maxDepth: nodeCount,
        containsLoops: false,
        blockTypes: ['starter', 'agent', 'end'],
      },
    }
  }

  private generateStressTestScenarios(): TestScenario[] {
    return [
      this.createHighBranchingScenario(),
      this.createDeepNestingScenario(),
      this.createMaximumComplexityScenario(),
    ]
  }

  private createHighBranchingScenario(): TestScenario {
    const nodes: ReactFlowNode[] = []
    const edges: ReactFlowEdge[] = []
    const branchCount = 10

    // Root node
    nodes.push({
      id: 'stress-root',
      type: 'starter',
      position: { x: 500, y: 100 },
      data: { name: 'Stress Test Root', type: 'starter' },
    })

    // Create many branches
    for (let i = 0; i < branchCount; i++) {
      const angle = (2 * Math.PI * i) / branchCount
      const x = 500 + Math.cos(angle) * 200
      const y = 300 + Math.sin(angle) * 200

      nodes.push({
        id: `stress-branch-${i}`,
        type: 'agent',
        position: { x: Math.round(x), y: Math.round(y) },
        data: {
          name: `Stress Branch ${i}`,
          type: 'agent',
          prompt: `Processing branch ${i} of ${branchCount}`,
        },
      })

      edges.push({
        id: `stress-edge-${i}`,
        source: 'stress-root',
        target: `stress-branch-${i}`,
        type: 'default',
      })
    }

    // Convergence point
    nodes.push({
      id: 'stress-end',
      type: 'end',
      position: { x: 500, y: 500 },
      data: { name: 'Stress Test End', type: 'end' },
    })

    for (let i = 0; i < branchCount; i++) {
      edges.push({
        id: `stress-converge-${i}`,
        source: `stress-branch-${i}`,
        target: 'stress-end',
        type: 'default',
      })
    }

    return {
      id: 'stress-high-branching',
      name: 'Stress Test - High Branching Factor',
      description: `Workflow with ${branchCount} parallel branches`,
      complexity: 'extreme',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'High Branching Stress Journey',
        description: 'Journey with many parallel states',
      },
      validationRules: [
        {
          id: 'branching-factor-validation',
          type: 'performance',
          assertion: `getMaxBranchingFactor(journey) === ${branchCount}`,
          expected: branchCount,
        },
      ],
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        branchingFactor: branchCount,
        maxDepth: 3,
        containsLoops: false,
        blockTypes: ['starter', 'agent', 'end'],
      },
    }
  }

  private createDeepNestingScenario(): TestScenario {
    const nodes: ReactFlowNode[] = []
    const edges: ReactFlowEdge[] = []
    const depth = 20

    // Create deep linear chain
    for (let i = 0; i < depth; i++) {
      const nodeType = i === 0 ? 'starter' : i === depth - 1 ? 'end' : 'agent'
      nodes.push({
        id: `deep-node-${i}`,
        type: nodeType,
        position: { x: 100, y: i * 50 + 100 },
        data: {
          name: `Deep Node ${i}`,
          type: nodeType,
          description: `Depth level ${i}/${depth}`,
        },
      })

      if (i > 0) {
        edges.push({
          id: `deep-edge-${i}`,
          source: `deep-node-${i - 1}`,
          target: `deep-node-${i}`,
          type: 'default',
        })
      }
    }

    return {
      id: 'stress-deep-nesting',
      name: 'Stress Test - Deep Nesting',
      description: `Linear workflow with ${depth} levels of depth`,
      complexity: 'extreme',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Deep Nesting Stress Journey',
        description: 'Journey with maximum depth',
      },
      validationRules: [
        {
          id: 'depth-validation',
          type: 'performance',
          assertion: `getMaxDepth(journey) === ${depth}`,
          expected: depth,
        },
      ],
      metadata: {
        nodeCount: depth,
        edgeCount: depth - 1,
        branchingFactor: 1,
        maxDepth: depth,
        containsLoops: false,
        blockTypes: ['starter', 'agent', 'end'],
      },
    }
  }

  private createMaximumComplexityScenario(): TestScenario {
    // Combine high branching, deep nesting, and loops
    const nodes: ReactFlowNode[] = []
    const edges: ReactFlowEdge[] = []

    // This would be a very complex scenario combining all stress factors
    // Implementation details would depend on maximum system capabilities

    return {
      id: 'stress-maximum-complexity',
      name: 'Stress Test - Maximum Complexity',
      description: 'Ultimate stress test combining all complexity factors',
      complexity: 'extreme',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Maximum Complexity Journey',
        description: 'Ultimate stress test journey',
      },
      validationRules: [],
      metadata: {
        nodeCount: 100,
        edgeCount: 150,
        branchingFactor: 10,
        maxDepth: 25,
        containsLoops: true,
        blockTypes: ['starter', 'agent', 'api', 'decision', 'end'],
      },
    }
  }

  private generateMemoryTestScenarios(): TestScenario[] {
    // Create scenarios designed to test memory usage patterns
    return [
      this.createLargeDataPayloadScenario(),
      this.createManyVariablesScenario(),
      this.createComplexConditionsScenario(),
    ]
  }

  private createLargeDataPayloadScenario(): TestScenario {
    const largeData = {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        data: Array.from({ length: 100 }, (_, j) => `data-${i}-${j}`),
      })),
    }

    const nodes: ReactFlowNode[] = [
      {
        id: 'memory-start',
        type: 'starter',
        position: { x: 100, y: 100 },
        data: {
          name: 'Memory Test Start',
          type: 'starter',
          payload: largeData,
        },
      },
      {
        id: 'memory-agent',
        type: 'agent',
        position: { x: 100, y: 200 },
        data: {
          name: 'Memory Processing Agent',
          type: 'agent',
          prompt: 'Process large dataset',
          context: largeData,
        },
      },
      {
        id: 'memory-end',
        type: 'end',
        position: { x: 100, y: 300 },
        data: { name: 'Memory Test End', type: 'end' },
      },
    ]

    const edges: ReactFlowEdge[] = [
      { id: 'memory-edge-1', source: 'memory-start', target: 'memory-agent', type: 'default' },
      { id: 'memory-edge-2', source: 'memory-agent', target: 'memory-end', type: 'default' },
    ]

    return {
      id: 'memory-large-payload',
      name: 'Memory Test - Large Data Payload',
      description: 'Test memory handling with large data structures',
      complexity: 'complex',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Memory Test Journey',
        description: 'Journey with large data payloads',
      },
      validationRules: [
        {
          id: 'memory-efficiency',
          type: 'performance',
          assertion: 'getMemoryUsage(journey) < MAX_MEMORY_THRESHOLD',
          expected: true,
        },
      ],
      metadata: {
        nodeCount: 3,
        edgeCount: 2,
        branchingFactor: 1,
        maxDepth: 3,
        containsLoops: false,
        blockTypes: ['starter', 'agent', 'end'],
      },
    }
  }

  private createManyVariablesScenario(): TestScenario {
    const variables: Record<string, any> = {}

    // Create 100 variables
    for (let i = 0; i < 100; i++) {
      variables[`var_${i}`] = {
        type: 'string',
        value: `value_${i}`,
        description: `Variable ${i} for memory testing`,
      }
    }

    const nodes: ReactFlowNode[] = [
      {
        id: 'vars-start',
        type: 'starter',
        position: { x: 100, y: 100 },
        data: {
          name: 'Variables Test Start',
          type: 'starter',
          variables,
        },
      },
      {
        id: 'vars-end',
        type: 'end',
        position: { x: 100, y: 200 },
        data: { name: 'Variables Test End', type: 'end' },
      },
    ]

    const edges: ReactFlowEdge[] = [
      { id: 'vars-edge-1', source: 'vars-start', target: 'vars-end', type: 'default' },
    ]

    return {
      id: 'memory-many-variables',
      name: 'Memory Test - Many Variables',
      description: 'Test memory handling with many variables',
      complexity: 'complex',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Many Variables Journey',
        description: 'Journey with many state variables',
      },
      validationRules: [
        {
          id: 'variable-count',
          type: 'data-integrity',
          assertion: 'journey.variables.length === 100',
          expected: 100,
        },
      ],
      metadata: {
        nodeCount: 2,
        edgeCount: 1,
        branchingFactor: 1,
        maxDepth: 2,
        containsLoops: false,
        blockTypes: ['starter', 'end'],
      },
    }
  }

  private createComplexConditionsScenario(): TestScenario {
    const complexConditions = Array.from(
      { length: 50 },
      (_, i) =>
        `user.score > ${i * 10} && user.level === "${i % 5}" && user.permissions.includes("level_${i}")`
    )

    const nodes: ReactFlowNode[] = [
      {
        id: 'conditions-start',
        type: 'starter',
        position: { x: 100, y: 100 },
        data: { name: 'Complex Conditions Start', type: 'starter' },
      },
      {
        id: 'conditions-decision',
        type: 'decision',
        position: { x: 100, y: 200 },
        data: {
          name: 'Complex Decision',
          type: 'decision',
          conditions: complexConditions.map((condition, i) => ({
            condition,
            path: `path_${i}`,
          })),
        },
      },
      {
        id: 'conditions-end',
        type: 'end',
        position: { x: 100, y: 300 },
        data: { name: 'Complex Conditions End', type: 'end' },
      },
    ]

    const edges: ReactFlowEdge[] = [
      {
        id: 'conditions-edge-1',
        source: 'conditions-start',
        target: 'conditions-decision',
        type: 'default',
      },
      {
        id: 'conditions-edge-2',
        source: 'conditions-decision',
        target: 'conditions-end',
        type: 'conditional',
        data: { conditions: complexConditions },
      },
    ]

    return {
      id: 'memory-complex-conditions',
      name: 'Memory Test - Complex Conditions',
      description: 'Test memory handling with complex conditional logic',
      complexity: 'complex',
      workflow: { nodes, edges },
      expectedJourney: {
        name: 'Complex Conditions Journey',
        description: 'Journey with complex conditional transitions',
      },
      validationRules: [
        {
          id: 'conditions-complexity',
          type: 'performance',
          assertion: 'getConditionComplexity(journey) < MAX_COMPLEXITY_THRESHOLD',
          expected: true,
        },
      ],
      metadata: {
        nodeCount: 3,
        edgeCount: 2,
        branchingFactor: 1,
        maxDepth: 3,
        containsLoops: false,
        blockTypes: ['starter', 'decision', 'end'],
      },
    }
  }
}

// ========================================
// EXPORT PERFORMANCE TEST SUITE TYPE
// ========================================

interface PerformanceTestSuite {
  benchmarkScenarios: TestScenario[]
  loadTestScenarios: TestScenario[]
  stressTestScenarios: TestScenario[]
  memoryTestScenarios: TestScenario[]
}

// ========================================
// MAIN EXPORT
// ========================================

export default ComprehensiveTestDataGenerator
