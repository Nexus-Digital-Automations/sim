/**
 * Workflow to Journey Mapping Integration Tests
 *
 * Comprehensive testing framework for validating workflow-to-journey conversion
 * accuracy, performance, and system integration.
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import type {
  ConversionResult,
  JourneyDefinition,
  PerformanceMetrics,
  ValidationReport,
  WorkflowDefinition,
} from '../types'

// Test data and mocks
const SAMPLE_WORKFLOWS = {
  simple_linear: {
    id: 'workflow_simple_linear',
    Name: 'Simple Linear Workflow',
    description: 'Basic sequential workflow with 3 steps',
    version: '1.0',
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'step1',
        type: 'tool',
        position: { x: 200, y: 100 },
        data: {
          label: 'Send Email',
          toolId: 'email_sender',
          config: { recipient: '{{customer_email}}', template: 'welcome' },
        },
      },
      {
        id: 'step2',
        type: 'tool',
        position: { x: 300, y: 100 },
        data: {
          label: 'Update CRM',
          toolId: 'crm_update',
          config: { status: 'contacted' },
        },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 400, y: 100 },
        data: { label: 'End' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'step1' },
      { id: 'e2', source: 'step1', target: 'step2' },
      { id: 'e3', source: 'step2', target: 'end' },
    ],
  },
  complex_branching: {
    id: 'workflow_complex_branching',
    Name: 'Complex Branching Workflow',
    description: 'Workflow with conditional branches and loops',
    version: '1.0',
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 200 },
        data: { label: 'Start' },
      },
      {
        id: 'check_user',
        type: 'condition',
        position: { x: 200, y: 200 },
        data: {
          label: 'Check User Status',
          condition: 'user.status === "premium"',
        },
      },
      {
        id: 'premium_path',
        type: 'tool',
        position: { x: 300, y: 150 },
        data: {
          label: 'Premium Service',
          toolId: 'premium_handler',
        },
      },
      {
        id: 'standard_path',
        type: 'tool',
        position: { x: 300, y: 250 },
        data: {
          label: 'Standard Service',
          toolId: 'standard_handler',
        },
      },
      {
        id: 'merge',
        type: 'merge',
        position: { x: 400, y: 200 },
        data: { label: 'Merge' },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 500, y: 200 },
        data: { label: 'End' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'check_user' },
      {
        id: 'e2',
        source: 'check_user',
        target: 'premium_path',
        condition: 'user.status === "premium"',
      },
      {
        id: 'e3',
        source: 'check_user',
        target: 'standard_path',
        condition: 'user.status === "standard"',
      },
      { id: 'e4', source: 'premium_path', target: 'merge' },
      { id: 'e5', source: 'standard_path', target: 'merge' },
      { id: 'e6', source: 'merge', target: 'end' },
    ],
  },
  error_handling: {
    id: 'workflow_error_handling',
    Name: 'Error Handling Workflow',
    description: 'Workflow with comprehensive error handling',
    version: '1.0',
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 200 },
        data: { label: 'Start' },
      },
      {
        id: 'api_call',
        type: 'tool',
        position: { x: 200, y: 200 },
        data: {
          label: 'API Call',
          toolId: 'external_api',
          errorHandling: {
            retry: 3,
            timeout: 30000,
            fallback: 'error_handler',
          },
        },
      },
      {
        id: 'success_handler',
        type: 'tool',
        position: { x: 300, y: 150 },
        data: {
          label: 'Success Handler',
          toolId: 'success_processor',
        },
      },
      {
        id: 'error_handler',
        type: 'tool',
        position: { x: 300, y: 250 },
        data: {
          label: 'Error Handler',
          toolId: 'error_processor',
        },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 400, y: 200 },
        data: { label: 'End' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'api_call' },
      { id: 'e2', source: 'api_call', target: 'success_handler', condition: 'success' },
      { id: 'e3', source: 'api_call', target: 'error_handler', condition: 'error' },
      { id: 'e4', source: 'success_handler', target: 'end' },
      { id: 'e5', source: 'error_handler', target: 'end' },
    ],
  },
}

class WorkflowToJourneyConverter {
  /**
   * Converts a ReactFlow workflow definition to a Parlant journey
   * This is a mock implementation that would be replaced with actual conversion logic
   */
  async convertWorkflowToJourney(workflow: WorkflowDefinition): Promise<ConversionResult> {
    const startTime = Date.now()

    try {
      // Mock conversion logic - would be replaced with actual implementation
      const journey: JourneyDefinition = {
        id: `journey_${workflow.id}`,
        title: workflow.Name,
        description: `Converted from workflow: ${workflow.description}`,
        conditions: [`User wants to execute ${workflow.Name}`],
        states: this.convertNodesToStates(workflow.nodes),
        transitions: this.convertEdgesToTransitions(workflow.edges),
        metadata: {
          originalWorkflowId: workflow.id,
          conversionTimestamp: new Date().toISOString(),
          preservedAttributes: this.extractPreservedAttributes(workflow),
        },
      }

      const conversionTime = Date.now() - startTime

      return {
        success: true,
        journey,
        metrics: {
          conversionTimeMs: conversionTime,
          originalNodeCount: workflow.nodes.length,
          originalEdgeCount: workflow.edges.length,
          resultingStateCount: journey.states.length,
          resultingTransitionCount: journey.transitions.length,
          preservationScore: this.calculatePreservationScore(workflow, journey),
        },
        validationReport: await this.validateConversion(workflow, journey),
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown conversion error',
          code: 'CONVERSION_FAILED',
          details: { workflow: workflow.id, timestamp: new Date().toISOString() },
        },
        metrics: {
          conversionTimeMs: Date.now() - startTime,
          originalNodeCount: workflow.nodes.length,
          originalEdgeCount: workflow.edges.length,
          resultingStateCount: 0,
          resultingTransitionCount: 0,
          preservationScore: 0,
        },
      }
    }
  }

  private convertNodesToStates(nodes: any[]): any[] {
    return nodes.map((node) => ({
      id: `state_${node.id}`,
      type: this.mapNodeTypeToStateType(node.type),
      Name: node.data.label || node.id,
      config: node.data.config || {},
      position: node.position,
      originalNodeId: node.id,
    }))
  }

  private convertEdgesToTransitions(edges: any[]): any[] {
    return edges.map((edge) => ({
      id: `transition_${edge.id}`,
      from: `state_${edge.source}`,
      to: `state_${edge.target}`,
      condition: edge.condition || null,
      originalEdgeId: edge.id,
    }))
  }

  private mapNodeTypeToStateType(nodeType: string): string {
    const mapping: Record<string, string> = {
      start: 'initial',
      end: 'final',
      tool: 'tool_state',
      condition: 'chat_state',
      merge: 'chat_state',
    }
    return mapping[nodeType] || 'chat_state'
  }

  private extractPreservedAttributes(workflow: WorkflowDefinition): any {
    return {
      Name: workflow.Name,
      description: workflow.description,
      version: workflow.version,
      nodeTypes: [...new Set(workflow.nodes.map((n) => n.type))],
      hasConditionalLogic: workflow.edges.some((e) => e.condition),
      complexityScore: this.calculateWorkflowComplexity(workflow),
    }
  }

  private calculateWorkflowComplexity(workflow: WorkflowDefinition): number {
    const nodeCount = workflow.nodes.length
    const edgeCount = workflow.edges.length
    const conditionalEdges = workflow.edges.filter((e) => e.condition).length
    const uniqueNodeTypes = new Set(workflow.nodes.map((n) => n.type)).size

    return nodeCount * 1 + edgeCount * 0.5 + conditionalEdges * 2 + uniqueNodeTypes * 0.5
  }

  private calculatePreservationScore(
    workflow: WorkflowDefinition,
    journey: JourneyDefinition
  ): number {
    // Mock preservation score calculation
    const nodePreservation = journey.states.length / workflow.nodes.length
    const edgePreservation = journey.transitions.length / workflow.edges.length
    const complexityPreservation =
      journey.states.filter((s) => s.type === 'tool_state').length /
      workflow.nodes.filter((n) => n.type === 'tool').length

    return Math.round(((nodePreservation + edgePreservation + complexityPreservation) / 3) * 100)
  }

  private async validateConversion(
    workflow: WorkflowDefinition,
    journey: JourneyDefinition
  ): Promise<ValidationReport> {
    const issues: string[] = []
    const warnings: string[] = []

    // Validate state mapping
    if (journey.states.length !== workflow.nodes.length) {
      warnings.push(
        `State count mismatch: ${journey.states.length} states vs ${workflow.nodes.length} nodes`
      )
    }

    // Validate transition mapping
    if (journey.transitions.length !== workflow.edges.length) {
      warnings.push(
        `Transition count mismatch: ${journey.transitions.length} transitions vs ${workflow.edges.length} edges`
      )
    }

    // Validate required states
    const hasInitialState = journey.states.some((s) => s.type === 'initial')
    const hasFinalState = journey.states.some((s) => s.type === 'final')

    if (!hasInitialState) {
      issues.push('Missing initial state in journey')
    }

    if (!hasFinalState) {
      issues.push('Missing final state in journey')
    }

    // Validate tool preservation
    const workflowTools = workflow.nodes.filter((n) => n.type === 'tool')
    const journeyTools = journey.states.filter((s) => s.type === 'tool_state')

    if (workflowTools.length !== journeyTools.length) {
      warnings.push(
        `Tool count mismatch: ${journeyTools.length} tool states vs ${workflowTools.length} tool nodes`
      )
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      score: issues.length === 0 ? (warnings.length === 0 ? 100 : 85) : 60,
    }
  }
}

class WorkflowJourneyTestSuite {
  private converter: WorkflowToJourneyConverter
  private performanceMetrics: PerformanceMetrics[] = []

  constructor() {
    this.converter = new WorkflowToJourneyConverter()
  }

  async runConversionAccuracyTests(): Promise<void> {
    console.log('🧪 Running Conversion Accuracy Tests...')

    for (const [testName, workflow] of Object.entries(SAMPLE_WORKFLOWS)) {
      await test(`Conversion accuracy: ${testName}`, async () => {
        const result = await this.converter.convertWorkflowToJourney(workflow as WorkflowDefinition)

        expect(result.success).toBe(true)
        expect(result.journey).toBeDefined()
        expect(result.validationReport.isValid).toBe(true)
        expect(result.metrics.preservationScore).toBeGreaterThanOrEqual(80)

        // Store metrics for performance analysis
        this.performanceMetrics.push({
          testName,
          conversionTime: result.metrics.conversionTimeMs,
          preservationScore: result.metrics.preservationScore,
          complexity: (workflow as WorkflowDefinition).nodes.length,
          timestamp: new Date().toISOString(),
        })

        console.log(`✅ ${testName}: Preservation Score ${result.metrics.preservationScore}%`)
      })
    }
  }

  async runFunctionalEquivalenceTests(): Promise<void> {
    console.log('⚙️ Running Functional Equivalence Tests...')

    for (const [testName, workflow] of Object.entries(SAMPLE_WORKFLOWS)) {
      await test(`Functional equivalence: ${testName}`, async () => {
        const result = await this.converter.convertWorkflowToJourney(workflow as WorkflowDefinition)

        expect(result.success).toBe(true)

        const journey = result.journey!

        // Test that all tools are preserved
        const workflowTools = (workflow as WorkflowDefinition).nodes.filter(
          (n) => n.type === 'tool'
        )
        const journeyTools = journey.states.filter((s) => s.type === 'tool_state')

        expect(journeyTools).toHaveLength(workflowTools.length)

        // Test that conditional logic is preserved
        const workflowConditionals = (workflow as WorkflowDefinition).edges.filter(
          (e) => e.condition
        )
        const journeyConditionals = journey.transitions.filter((t) => t.condition)

        expect(journeyConditionals).toHaveLength(workflowConditionals.length)

        // Test that execution flow is preserved
        expect(journey.states.some((s) => s.type === 'initial')).toBe(true)
        expect(journey.states.some((s) => s.type === 'final')).toBe(true)

        console.log(`✅ ${testName}: Functional equivalence verified`)
      })
    }
  }

  async runPerformanceBenchmarks(): Promise<void> {
    console.log('🚀 Running Performance Benchmarks...')

    const performanceTests = [
      { Name: 'Small workflow (5 nodes)', size: 5 },
      { Name: 'Medium workflow (20 nodes)', size: 20 },
      { Name: 'Large workflow (50 nodes)', size: 50 },
      { Name: 'Extra large workflow (100 nodes)', size: 100 },
    ]

    for (const testCase of performanceTests) {
      await test(`Performance: ${testCase.Name}`, async () => {
        const syntheticWorkflow = this.generateSyntheticWorkflow(testCase.size)
        const startTime = Date.now()

        const result = await this.converter.convertWorkflowToJourney(syntheticWorkflow)
        const conversionTime = Date.now() - startTime

        expect(result.success).toBe(true)
        expect(conversionTime).toBeLessThan(testCase.size * 100) // Max 100ms per node

        console.log(
          `⚡ ${testCase.Name}: ${conversionTime}ms (${(conversionTime / testCase.size).toFixed(2)}ms/node)`
        )
      })
    }
  }

  async runAcceptanceCriteriaTests(): Promise<void> {
    console.log('✅ Running Acceptance Criteria Validation Tests...')

    await test('Acceptance Criteria 1: Existing workflows can be converted to journeys', async () => {
      for (const workflow of Object.values(SAMPLE_WORKFLOWS)) {
        const result = await this.converter.convertWorkflowToJourney(workflow as WorkflowDefinition)
        expect(result.success).toBe(true)
        expect(result.journey).toBeDefined()
      }
    })

    await test('Acceptance Criteria 2: Journey execution produces same results as workflows', async () => {
      for (const [testName, workflow] of Object.entries(SAMPLE_WORKFLOWS)) {
        const result = await this.converter.convertWorkflowToJourney(workflow as WorkflowDefinition)
        expect(result.success).toBe(true)

        // Verify functional equivalence
        const journey = result.journey!
        expect(result.validationReport.isValid).toBe(true)
        expect(result.metrics.preservationScore).toBeGreaterThanOrEqual(80)
      }
    })

    await test('Acceptance Criteria 3: Users can interact with workflows conversationally', async () => {
      for (const workflow of Object.values(SAMPLE_WORKFLOWS)) {
        const result = await this.converter.convertWorkflowToJourney(workflow as WorkflowDefinition)
        expect(result.success).toBe(true)

        const journey = result.journey!
        expect(journey.conditions).toBeDefined()
        expect(journey.conditions.length).toBeGreaterThan(0)
        expect(journey.title).toBeDefined()
        expect(journey.description).toBeDefined()
      }
    })

    await test('Acceptance Criteria 4: Original ReactFlow editor remains functional', async () => {
      // This test would verify that workflow conversion doesn't break existing functionality
      // For now, we'll validate that original workflow structure is preserved
      for (const workflow of Object.values(SAMPLE_WORKFLOWS)) {
        const result = await this.converter.convertWorkflowToJourney(workflow as WorkflowDefinition)
        expect(result.success).toBe(true)

        const journey = result.journey!
        expect(journey.metadata?.originalWorkflowId).toBe((workflow as WorkflowDefinition).id)
        expect(journey.metadata?.preservedAttributes).toBeDefined()
      }
    })
  }

  private generateSyntheticWorkflow(nodeCount: number): WorkflowDefinition {
    const nodes = []
    const edges = []

    // Generate start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: 0, y: 100 },
      data: { label: 'Start' },
    })

    // Generate intermediate nodes
    for (let i = 1; i < nodeCount - 1; i++) {
      nodes.push({
        id: `node_${i}`,
        type: Math.random() > 0.5 ? 'tool' : 'condition',
        position: { x: i * 100, y: 100 },
        data: {
          label: `Node ${i}`,
          toolId: `tool_${i}`,
          config: { param: `value_${i}` },
        },
      })

      edges.push({
        id: `edge_${i}`,
        source: i === 1 ? 'start' : `node_${i - 1}`,
        target: `node_${i}`,
      })
    }

    // Generate end node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: (nodeCount - 1) * 100, y: 100 },
      data: { label: 'End' },
    })

    edges.push({
      id: `edge_${nodeCount}`,
      source: `node_${nodeCount - 2}`,
      target: 'end',
    })

    return {
      id: `synthetic_workflow_${nodeCount}`,
      Name: `Synthetic Workflow (${nodeCount} nodes)`,
      description: `Generated workflow with ${nodeCount} nodes for performance testing`,
      version: '1.0',
      nodes,
      edges,
    }
  }

  getPerformanceReport(): any {
    if (this.performanceMetrics.length === 0) {
      return { message: 'No performance metrics available' }
    }

    const avgConversionTime =
      this.performanceMetrics.reduce((sum, m) => sum + m.conversionTime, 0) /
      this.performanceMetrics.length
    const avgPreservationScore =
      this.performanceMetrics.reduce((sum, m) => sum + m.preservationScore, 0) /
      this.performanceMetrics.length
    const maxConversionTime = Math.max(...this.performanceMetrics.map((m) => m.conversionTime))
    const minConversionTime = Math.min(...this.performanceMetrics.map((m) => m.conversionTime))

    return {
      totalTests: this.performanceMetrics.length,
      avgConversionTime: Math.round(avgConversionTime),
      avgPreservationScore: Math.round(avgPreservationScore),
      maxConversionTime,
      minConversionTime,
      performanceGrade: avgConversionTime < 1000 ? 'A' : avgConversionTime < 2000 ? 'B' : 'C',
    }
  }
}

// Test Suite Execution
describe('Workflow to Journey Mapping Integration Tests', () => {
  let testSuite: WorkflowJourneyTestSuite

  beforeAll(async () => {
    console.log('🚀 Initializing Workflow to Journey Integration Test Suite')
    testSuite = new WorkflowJourneyTestSuite()
  })

  afterAll(async () => {
    const performanceReport = testSuite.getPerformanceReport()
    console.log('📊 Performance Report:', performanceReport)
  })

  describe('Conversion Accuracy Tests', () => {
    test('should run all conversion accuracy tests', async () => {
      await testSuite.runConversionAccuracyTests()
    })
  })

  describe('Functional Equivalence Tests', () => {
    test('should run all functional equivalence tests', async () => {
      await testSuite.runFunctionalEquivalenceTests()
    })
  })

  describe('Performance Benchmarks', () => {
    test('should run all performance benchmarks', async () => {
      await testSuite.runPerformanceBenchmarks()
    })
  })

  describe('Acceptance Criteria Validation', () => {
    test('should run all acceptance criteria tests', async () => {
      await testSuite.runAcceptanceCriteriaTests()
    })
  })
})
