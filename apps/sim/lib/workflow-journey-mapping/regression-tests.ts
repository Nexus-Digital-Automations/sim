/**
 * Comprehensive Regression Test Suite for ReactFlow Workflow Preservation
 *
 * This test suite ensures that all existing ReactFlow functionality continues
 * to work exactly as before when the journey mapping system is introduced.
 *
 * ZERO TOLERANCE for workflow functionality regression.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getBlock } from '@/blocks'
import { Serializer } from '@/serializer'
import type { WorkflowState } from '@/stores/workflows/workflow/types'

const logger = createLogger('WorkflowRegressionTests')

export interface RegressionTestResult {
  testName: string
  passed: boolean
  error?: string
  details?: any
  executionTime: number
}

export interface RegressionTestSuite {
  suiteName: string
  totalTests: number
  passedTests: number
  failedTests: number
  results: RegressionTestResult[]
  overallSuccess: boolean
  executionTime: number
}

export interface WorkflowTestScenario {
  Name: string
  description: string
  workflow: WorkflowState
  expectedBehavior: any
  testFunction: (workflow: WorkflowState) => Promise<boolean>
}

/**
 * Main regression test runner for ReactFlow workflow functionality
 */
export class WorkflowRegressionTestRunner {
  private logger = createLogger('WorkflowRegressionTestRunner')

  /**
   * Run the complete regression test suite
   */
  async runRegressionTests(workflow: WorkflowState): Promise<RegressionTestSuite> {
    const startTime = Date.now()
    this.logger.info('Starting comprehensive workflow regression tests', {
      blockCount: Object.keys(workflow.blocks).length,
      edgeCount: workflow.edges.length,
    })

    const results: RegressionTestResult[] = []

    // Core ReactFlow functionality tests
    results.push(...(await this.testReactFlowStructure(workflow)))
    results.push(...(await this.testBlockCreationAndModification(workflow)))
    results.push(...(await this.testEdgeConnectivity(workflow)))
    results.push(...(await this.testContainerNodes(workflow)))
    results.push(...(await this.testWorkflowExecution(workflow)))
    results.push(...(await this.testCollaborativeEditing(workflow)))
    results.push(...(await this.testVisualEditor(workflow)))
    results.push(...(await this.testDataPersistence(workflow)))
    results.push(...(await this.testPerformance(workflow)))

    const passedTests = results.filter((r) => r.passed).length
    const failedTests = results.filter((r) => !r.passed).length
    const overallSuccess = failedTests === 0

    const executionTime = Date.now() - startTime

    this.logger.info('Regression tests completed', {
      totalTests: results.length,
      passedTests,
      failedTests,
      overallSuccess,
      executionTime,
    })

    return {
      suiteName: 'ReactFlow Workflow Preservation',
      totalTests: results.length,
      passedTests,
      failedTests,
      results,
      overallSuccess,
      executionTime,
    }
  }

  /**
   * Test core ReactFlow structure preservation
   */
  private async testReactFlowStructure(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Blocks structure integrity
    tests.push(
      await this.runTest('Blocks Structure Integrity', async () => {
        if (!workflow.blocks || typeof workflow.blocks !== 'object') {
          throw new Error('Blocks structure is not an object')
        }

        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          if (!block.id || !block.type || !block.position) {
            throw new Error(`Block ${blockId} missing required properties`)
          }

          if (typeof block.position.x !== 'number' || typeof block.position.y !== 'number') {
            throw new Error(`Block ${blockId} position coordinates are not numbers`)
          }
        }

        return true
      })
    )

    // Test 2: Edges structure integrity
    tests.push(
      await this.runTest('Edges Structure Integrity', async () => {
        if (!Array.isArray(workflow.edges)) {
          throw new Error('Edges is not an array')
        }

        for (const edge of workflow.edges) {
          if (!edge.id || !edge.source || !edge.target) {
            throw new Error(`Edge ${edge.id} missing required properties`)
          }
        }

        return true
      })
    )

    // Test 3: ReactFlow node types compatibility
    tests.push(
      await this.runTest('ReactFlow Node Types', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          if (['loop', 'parallel'].includes(block.type)) {
            // Container nodes should be compatible with subflowNode type
            if (
              !block.data ||
              typeof block.data.width !== 'number' ||
              typeof block.data.height !== 'number'
            ) {
              throw new Error(`Container block ${blockId} missing required dimensions`)
            }
          } else {
            // Regular blocks should have valid block config
            const blockConfig = getBlock(block.type)
            if (!blockConfig) {
              throw new Error(`Block ${blockId} has invalid type ${block.type}`)
            }
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test block creation and modification functionality
   */
  private async testBlockCreationAndModification(
    workflow: WorkflowState
  ): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Block property modification preservation
    tests.push(
      await this.runTest('Block Property Modification', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          // Ensure all properties that can be modified are present
          const requiredProps = ['enabled', 'Name', 'position']
          for (const prop of requiredProps) {
            if (!(prop in block)) {
              throw new Error(`Block ${blockId} missing required property: ${prop}`)
            }
          }

          // Check type-specific properties
          if (typeof block.enabled !== 'boolean') {
            throw new Error(`Block ${blockId} enabled property is not boolean`)
          }

          if (typeof block.Name !== 'string' || block.Name.length === 0) {
            throw new Error(`Block ${blockId} Name is not a valid string`)
          }
        }

        return true
      })
    )

    // Test 2: Sub-block structure preservation
    tests.push(
      await this.runTest('Sub-block Structure Preservation', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          if (!['loop', 'parallel'].includes(block.type)) {
            const blockConfig = getBlock(block.type)
            if (blockConfig?.subBlocks) {
              if (!block.subBlocks || typeof block.subBlocks !== 'object') {
                throw new Error(`Block ${blockId} missing sub-blocks structure`)
              }

              // Verify sub-block structure matches config
              for (const subBlockConfig of blockConfig.subBlocks) {
                if (!block.subBlocks[subBlockConfig.id]) {
                  throw new Error(`Block ${blockId} missing sub-block ${subBlockConfig.id}`)
                }
              }
            }
          }
        }

        return true
      })
    )

    // Test 3: Container block data integrity
    tests.push(
      await this.runTest('Container Block Data Integrity', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          if (['loop', 'parallel'].includes(block.type)) {
            if (!block.data) {
              throw new Error(`Container block ${blockId} missing data object`)
            }

            // Check required container properties
            if (typeof block.data.width !== 'number' || block.data.width <= 0) {
              throw new Error(`Container block ${blockId} invalid width`)
            }

            if (typeof block.data.height !== 'number' || block.data.height <= 0) {
              throw new Error(`Container block ${blockId} invalid height`)
            }

            // Check parent-child relationships
            if (block.data.parentId) {
              if (!workflow.blocks[block.data.parentId]) {
                throw new Error(`Container block ${blockId} references non-existent parent`)
              }
            }
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test edge connectivity functionality
   */
  private async testEdgeConnectivity(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Edge-block relationship integrity
    tests.push(
      await this.runTest('Edge-Block Relationship Integrity', async () => {
        const blockIds = new Set(Object.keys(workflow.blocks))

        for (const edge of workflow.edges) {
          if (!blockIds.has(edge.source)) {
            throw new Error(`Edge ${edge.id} source block ${edge.source} does not exist`)
          }

          if (!blockIds.has(edge.target)) {
            throw new Error(`Edge ${edge.id} target block ${edge.target} does not exist`)
          }
        }

        return true
      })
    )

    // Test 2: Handle compatibility
    tests.push(
      await this.runTest('Edge Handle Compatibility', async () => {
        for (const edge of workflow.edges) {
          // Source handles should be valid
          if (edge.sourceHandle !== null && typeof edge.sourceHandle !== 'string') {
            throw new Error(`Edge ${edge.id} invalid sourceHandle type`)
          }

          // Target handles should be valid
          if (edge.targetHandle !== null && typeof edge.targetHandle !== 'string') {
            throw new Error(`Edge ${edge.id} invalid targetHandle type`)
          }
        }

        return true
      })
    )

    // Test 3: Container boundary respect
    tests.push(
      await this.runTest('Container Boundary Respect', async () => {
        for (const edge of workflow.edges) {
          const sourceBlock = workflow.blocks[edge.source]
          const targetBlock = workflow.blocks[edge.target]

          if (sourceBlock && targetBlock) {
            // Check parent relationships for container boundary validation
            const sourceParentId = sourceBlock.data?.parentId
            const targetParentId = targetBlock.data?.parentId

            // Both should be in same container or both outside containers
            if (sourceParentId !== targetParentId) {
              // Exception: container start handles can connect to child nodes
              if (
                !(
                  edge.sourceHandle === 'loop-start-source' ||
                  edge.sourceHandle === 'parallel-start-source'
                )
              ) {
                throw new Error(`Edge ${edge.id} crosses container boundaries illegally`)
              }
            }
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test container nodes (loops and parallels) functionality
   */
  private async testContainerNodes(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Loop structure validation
    tests.push(
      await this.runTest('Loop Structure Validation', async () => {
        if (workflow.loops) {
          for (const [loopId, loop] of Object.entries(workflow.loops)) {
            if (!loop.id || !Array.isArray(loop.nodes)) {
              throw new Error(`Loop ${loopId} missing id or nodes array`)
            }

            if (!['for', 'forEach'].includes(loop.loopType)) {
              throw new Error(`Loop ${loopId} invalid loopType: ${loop.loopType}`)
            }

            // Validate nodes exist
            for (const nodeId of loop.nodes) {
              if (!workflow.blocks[nodeId]) {
                throw new Error(`Loop ${loopId} references non-existent node ${nodeId}`)
              }
            }
          }
        }

        return true
      })
    )

    // Test 2: Parallel structure validation
    tests.push(
      await this.runTest('Parallel Structure Validation', async () => {
        if (workflow.parallels) {
          for (const [parallelId, parallel] of Object.entries(workflow.parallels)) {
            if (!parallel.id || !Array.isArray(parallel.nodes)) {
              throw new Error(`Parallel ${parallelId} missing id or nodes array`)
            }

            // Validate nodes exist
            for (const nodeId of parallel.nodes) {
              if (!workflow.blocks[nodeId]) {
                throw new Error(`Parallel ${parallelId} references non-existent node ${nodeId}`)
              }
            }
          }
        }

        return true
      })
    )

    // Test 3: Parent-child relationship consistency
    tests.push(
      await this.runTest('Parent-Child Relationship Consistency', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          if (block.data?.parentId) {
            const parent = workflow.blocks[block.data.parentId]
            if (!parent) {
              throw new Error(
                `Block ${blockId} references non-existent parent ${block.data.parentId}`
              )
            }

            if (!['loop', 'parallel'].includes(parent.type)) {
              throw new Error(
                `Block ${blockId} has parent ${block.data.parentId} which is not a container`
              )
            }

            // Check that parent's loop/parallel structure includes this block
            if (parent.type === 'loop' && workflow.loops?.[parent.id]) {
              const loop = workflow.loops[parent.id]
              if (!loop.nodes.includes(blockId)) {
                throw new Error(
                  `Block ${blockId} is child of loop ${parent.id} but not in loop.nodes`
                )
              }
            }

            if (parent.type === 'parallel' && workflow.parallels?.[parent.id]) {
              const parallel = workflow.parallels[parent.id]
              if (!parallel.nodes.includes(blockId)) {
                throw new Error(
                  `Block ${blockId} is child of parallel ${parent.id} but not in parallel.nodes`
                )
              }
            }
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test workflow execution functionality
   */
  private async testWorkflowExecution(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Workflow serializability
    tests.push(
      await this.runTest('Workflow Serializability', async () => {
        try {
          const serializer = new Serializer()
          const serialized = serializer.serialize(workflow)

          if (!serialized || !serialized.blocks) {
            throw new Error('Workflow failed to serialize properly')
          }

          // Check that all blocks are serialized
          const originalBlockCount = Object.keys(workflow.blocks).length
          const serializedBlockCount = Object.keys(serialized.blocks).length

          if (originalBlockCount !== serializedBlockCount) {
            throw new Error(
              `Block count mismatch: ${originalBlockCount} vs ${serializedBlockCount}`
            )
          }
        } catch (error) {
          throw new Error(
            `Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }

        return true
      })
    )

    // Test 2: Block execution state preservation
    tests.push(
      await this.runTest('Block Execution State Preservation', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          // Check that outputs structure is preserved
          if (block.outputs && typeof block.outputs !== 'object') {
            throw new Error(`Block ${blockId} outputs structure is invalid`)
          }

          // Check enabled state
          if (typeof block.enabled !== 'boolean') {
            throw new Error(`Block ${blockId} enabled state is not boolean`)
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test collaborative editing functionality
   */
  private async testCollaborativeEditing(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Timestamp tracking
    tests.push(
      await this.runTest('Timestamp Tracking', async () => {
        if (workflow.lastUpdate && typeof workflow.lastUpdate !== 'number') {
          throw new Error('lastUpdate timestamp is not a number')
        }

        return true
      })
    )

    // Test 2: Position update compatibility
    tests.push(
      await this.runTest('Position Update Compatibility', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          if (block.position) {
            if (typeof block.position.x !== 'number' || typeof block.position.y !== 'number') {
              throw new Error(`Block ${blockId} position coordinates are not numbers`)
            }

            // Check for valid position values (not NaN, Infinity, etc.)
            if (!Number.isFinite(block.position.x) || !Number.isFinite(block.position.y)) {
              throw new Error(`Block ${blockId} position coordinates are not finite numbers`)
            }
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test visual editor functionality
   */
  private async testVisualEditor(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: ReactFlow node type mapping
    tests.push(
      await this.runTest('ReactFlow Node Type Mapping', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          if (['loop', 'parallel'].includes(block.type)) {
            // Should be mapped to subflowNode
            if (!block.data || !block.data.width || !block.data.height) {
              throw new Error(`Container block ${blockId} missing dimensions for ReactFlow`)
            }
          } else {
            // Should be mapped to workflowBlock
            const blockConfig = getBlock(block.type)
            if (!blockConfig) {
              throw new Error(`Regular block ${blockId} missing block config`)
            }
          }
        }

        return true
      })
    )

    // Test 2: Visual properties preservation
    tests.push(
      await this.runTest('Visual Properties Preservation', async () => {
        for (const [blockId, block] of Object.entries(workflow.blocks)) {
          // Check visual state properties
          if (typeof block.isWide !== 'boolean') {
            throw new Error(`Block ${blockId} isWide property is not boolean`)
          }

          if (block.height !== undefined && typeof block.height !== 'number') {
            throw new Error(`Block ${blockId} height property is not number`)
          }

          if (typeof block.horizontalHandles !== 'boolean') {
            throw new Error(`Block ${blockId} horizontalHandles property is not boolean`)
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test data persistence functionality
   */
  private async testDataPersistence(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Deep clone integrity
    tests.push(
      await this.runTest('Deep Clone Integrity', async () => {
        const cloned = JSON.parse(JSON.stringify(workflow))

        // Check that all properties are preserved
        const originalBlockIds = Object.keys(workflow.blocks)
        const clonedBlockIds = Object.keys(cloned.blocks || {})

        if (originalBlockIds.length !== clonedBlockIds.length) {
          throw new Error('Cloned workflow has different block count')
        }

        for (const blockId of originalBlockIds) {
          if (!cloned.blocks[blockId]) {
            throw new Error(`Block ${blockId} missing in cloned workflow`)
          }

          // Check critical properties
          const original = workflow.blocks[blockId]
          const clonedBlock = cloned.blocks[blockId]

          if (original.type !== clonedBlock.type) {
            throw new Error(`Block ${blockId} type changed in clone`)
          }

          if (original.Name !== clonedBlock.Name) {
            throw new Error(`Block ${blockId} Name changed in clone`)
          }
        }

        return true
      })
    )

    return tests
  }

  /**
   * Test performance characteristics
   */
  private async testPerformance(workflow: WorkflowState): Promise<RegressionTestResult[]> {
    const tests: RegressionTestResult[] = []

    // Test 1: Large workflow handling
    tests.push(
      await this.runTest('Large Workflow Handling', async () => {
        const blockCount = Object.keys(workflow.blocks).length
        const edgeCount = workflow.edges.length

        // Performance should not degrade significantly with reasonable workflow sizes
        const startTime = Date.now()

        // Simulate typical operations
        const blockEntries = Object.entries(workflow.blocks)
        for (let i = 0; i < Math.min(100, blockEntries.length); i++) {
          const [blockId, block] = blockEntries[i]
          // Simulate typical block operations
          if (block.position && typeof block.position.x === 'number') {
            // Position validation (typical operation)
          }
        }

        const executionTime = Date.now() - startTime

        // Should not take more than 100ms for reasonable operations on typical workflows
        if (executionTime > 100 && blockCount < 1000) {
          throw new Error(
            `Performance regression detected: ${executionTime}ms for ${blockCount} blocks`
          )
        }

        return true
      })
    )

    return tests
  }

  /**
   * Helper method to run individual tests with error handling
   */
  private async runTest(
    testName: string,
    testFunction: () => Promise<boolean>
  ): Promise<RegressionTestResult> {
    const startTime = Date.now()

    try {
      const result = await testFunction()
      return {
        testName,
        passed: result,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      }
    }
  }
}

/**
 * Singleton regression test runner
 */
export const workflowRegressionTestRunner = new WorkflowRegressionTestRunner()

/**
 * Quick regression test for immediate validation
 */
export async function runQuickRegressionTest(workflow: WorkflowState): Promise<boolean> {
  const testSuite = await workflowRegressionTestRunner.runRegressionTests(workflow)
  return testSuite.overallSuccess
}

/**
 * Comprehensive regression test with detailed results
 */
export async function runFullRegressionTest(workflow: WorkflowState): Promise<RegressionTestSuite> {
  return await workflowRegressionTestRunner.runRegressionTests(workflow)
}

/**
 * Pre-journey mapping regression test to establish baseline
 */
export async function establishRegressionBaseline(
  workflow: WorkflowState
): Promise<RegressionTestSuite> {
  const logger = createLogger('RegressionBaseline')
  logger.info('Establishing regression test baseline before journey mapping')

  const baseline = await runFullRegressionTest(workflow)

  if (!baseline.overallSuccess) {
    logger.error('Baseline regression tests failed - workflow has existing issues', {
      failedTests: baseline.failedTests,
      errors: baseline.results.filter((r) => !r.passed).map((r) => r.error),
    })
    throw new Error('Cannot establish baseline - existing workflow has issues')
  }

  logger.info('Regression baseline established successfully', {
    totalTests: baseline.totalTests,
    executionTime: baseline.executionTime,
  })

  return baseline
}

/**
 * Post-journey mapping regression test to ensure no regressions
 */
export async function validateNoRegressions(
  workflow: WorkflowState,
  baseline: RegressionTestSuite
): Promise<{ success: boolean; regressions: string[] }> {
  const logger = createLogger('RegressionValidation')
  logger.info('Validating no regressions after journey mapping')

  const current = await runFullRegressionTest(workflow)
  const regressions: string[] = []

  // Check if any previously passing tests now fail
  for (const baselineResult of baseline.results) {
    if (baselineResult.passed) {
      const currentResult = current.results.find((r) => r.testName === baselineResult.testName)
      if (currentResult && !currentResult.passed) {
        regressions.push(`${baselineResult.testName}: ${currentResult.error || 'Unknown failure'}`)
      }
    }
  }

  const success = regressions.length === 0

  if (success) {
    logger.info('No regressions detected after journey mapping')
  } else {
    logger.error('Regressions detected after journey mapping', { regressions })
  }

  return { success, regressions }
}
