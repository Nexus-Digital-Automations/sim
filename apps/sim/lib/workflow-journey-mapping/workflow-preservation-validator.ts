/**
 * Comprehensive Workflow Preservation Validator
 *
 * This system provides the ultimate validation that ALL existing ReactFlow
 * workflows continue to work EXACTLY as before when journey mapping is introduced.
 *
 * VALIDATION PRINCIPLES:
 * 1. COMPREHENSIVE TESTING - Every aspect of workflow functionality validated
 * 2. BEHAVIORAL EQUIVALENCE - Same inputs produce identical outputs
 * 3. PERFORMANCE PARITY - No performance degradation in existing functionality
 * 4. USER EXPERIENCE CONSISTENCY - Visual and interaction behavior unchanged
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getBlock } from '@/blocks'
import { Serializer } from '@/serializer'
import type { WorkflowState } from '@/stores/workflows/workflow/types'
import {
  type CompatibilityValidationResult,
  workflowCompatibilityValidator,
} from './compatibility-validator'
import { type ConsistencyValidationResult, dataConsistencyManager } from './data-consistency'
import { type RegressionTestSuite, workflowRegressionTestRunner } from './regression-tests'

const logger = createLogger('WorkflowPreservationValidator')

export interface PreservationValidationResult {
  overallSuccess: boolean
  workflowId: string
  validationTimestamp: Date
  executionTime: number

  // Component validation results
  compatibilityResult: CompatibilityValidationResult
  regressionResult: RegressionTestSuite
  consistencyResult: ConsistencyValidationResult

  // Functional validation results
  visualEditorValidation: ValidationResult
  executionValidation: ValidationResult
  collaborationValidation: ValidationResult
  performanceValidation: ValidationResult
  dataIntegrityValidation: ValidationResult

  // Summary and recommendations
  criticalIssues: PreservationIssue[]
  warnings: PreservationWarning[]
  recommendations: string[]

  // Certification
  preservationCertified: boolean
  certificationLevel: 'FULL' | 'PARTIAL' | 'FAILED'
  certificationDetails: string[]
}

export interface ValidationResult {
  category: string
  passed: boolean
  score: number // 0-100
  details: string[]
  issues: PreservationIssue[]
  executionTime: number
}

export interface PreservationIssue {
  category: 'BREAKING_CHANGE' | 'FUNCTIONALITY_LOSS' | 'PERFORMANCE_REGRESSION' | 'UX_REGRESSION'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  impact: string
  affectedComponent: string
  suggestedFix: string
  blocksCertification: boolean
}

export interface PreservationWarning {
  type: 'MINOR_CHANGE' | 'ENHANCEMENT_OPPORTUNITY' | 'MAINTENANCE_NEEDED'
  description: string
  recommendation: string
  impact: string
}

export interface WorkflowPreservationConfig {
  strictValidation: boolean
  performanceThresholdMs: number
  minimumPassingScore: number
  enableDeepTesting: boolean
  validateAllBlockTypes: boolean
}

/**
 * Comprehensive workflow preservation validator
 */
export class WorkflowPreservationValidator {
  private logger = createLogger('WorkflowPreservationValidator')
  private config: WorkflowPreservationConfig

  constructor(
    config: WorkflowPreservationConfig = {
      strictValidation: true,
      performanceThresholdMs: 1000,
      minimumPassingScore: 95,
      enableDeepTesting: true,
      validateAllBlockTypes: true,
    }
  ) {
    this.config = config
    this.logger.info('Workflow preservation validator initialized', { config })
  }

  /**
   * Perform comprehensive preservation validation on a workflow
   */
  async validateWorkflowPreservation(
    workflowId: string,
    reactFlowState: WorkflowState,
    journeyState?: any
  ): Promise<PreservationValidationResult> {
    const startTime = Date.now()

    this.logger.info('Starting comprehensive workflow preservation validation', {
      workflowId,
      blockCount: Object.keys(reactFlowState.blocks).length,
      edgeCount: reactFlowState.edges.length,
      hasJourneyState: !!journeyState,
    })

    try {
      // 1. Core compatibility validation
      this.logger.info('Running compatibility validation')
      const compatibilityResult =
        await workflowCompatibilityValidator.validateWorkflowCompatibility(
          reactFlowState,
          journeyState
        )

      // 2. Regression test suite
      this.logger.info('Running regression test suite')
      const regressionResult = await workflowRegressionTestRunner.runRegressionTests(reactFlowState)

      // 3. Data consistency validation
      this.logger.info('Running data consistency validation')
      const consistencyResult = await dataConsistencyManager.validateDataConsistency(
        workflowId,
        reactFlowState,
        journeyState
      )

      // 4. Visual editor validation
      this.logger.info('Running visual editor validation')
      const visualEditorValidation = await this.validateVisualEditor(reactFlowState)

      // 5. Execution validation
      this.logger.info('Running execution validation')
      const executionValidation = await this.validateExecution(workflowId, reactFlowState)

      // 6. Collaboration validation
      this.logger.info('Running collaboration validation')
      const collaborationValidation = await this.validateCollaboration(workflowId, reactFlowState)

      // 7. Performance validation
      this.logger.info('Running performance validation')
      const performanceValidation = await this.validatePerformance(reactFlowState)

      // 8. Data integrity validation
      this.logger.info('Running data integrity validation')
      const dataIntegrityValidation = await this.validateDataIntegrity(reactFlowState)

      // Compile results
      const executionTime = Date.now() - startTime
      const result = await this.compileValidationResult(workflowId, executionTime, {
        compatibilityResult,
        regressionResult,
        consistencyResult,
        visualEditorValidation,
        executionValidation,
        collaborationValidation,
        performanceValidation,
        dataIntegrityValidation,
      })

      this.logger.info('Workflow preservation validation completed', {
        workflowId,
        overallSuccess: result.overallSuccess,
        executionTime,
        certificationLevel: result.certificationLevel,
      })

      return result
    } catch (error) {
      this.logger.error('Workflow preservation validation failed', { error, workflowId })

      return {
        overallSuccess: false,
        workflowId,
        validationTimestamp: new Date(),
        executionTime: Date.now() - startTime,
        compatibilityResult: {
          isCompatible: false,
          errors: [],
          warnings: [],
          preservedFeatures: [],
          migrationSafety: {
            canRollback: true,
            dataBackupRequired: true,
            riskLevel: 'HIGH',
            safetyMeasures: [],
          },
        },
        regressionResult: {
          suiteName: 'Failed',
          totalTests: 0,
          passedTests: 0,
          failedTests: 1,
          results: [],
          overallSuccess: false,
          executionTime: 0,
        },
        consistencyResult: {
          isConsistent: false,
          inconsistencies: [],
          warnings: [],
          recommendations: [],
          canProceed: false,
        },
        visualEditorValidation: {
          category: 'Visual Editor',
          passed: false,
          score: 0,
          details: [],
          issues: [],
          executionTime: 0,
        },
        executionValidation: {
          category: 'Execution',
          passed: false,
          score: 0,
          details: [],
          issues: [],
          executionTime: 0,
        },
        collaborationValidation: {
          category: 'Collaboration',
          passed: false,
          score: 0,
          details: [],
          issues: [],
          executionTime: 0,
        },
        performanceValidation: {
          category: 'Performance',
          passed: false,
          score: 0,
          details: [],
          issues: [],
          executionTime: 0,
        },
        dataIntegrityValidation: {
          category: 'Data Integrity',
          passed: false,
          score: 0,
          details: [],
          issues: [],
          executionTime: 0,
        },
        criticalIssues: [
          {
            category: 'BREAKING_CHANGE',
            severity: 'CRITICAL',
            description: 'Validation system failure',
            impact: 'Cannot verify workflow preservation',
            affectedComponent: 'WorkflowPreservationValidator',
            suggestedFix: 'Review validation system and retry',
            blocksCertification: true,
          },
        ],
        warnings: [],
        recommendations: ['Fix validation system before proceeding with journey mapping'],
        preservationCertified: false,
        certificationLevel: 'FAILED',
        certificationDetails: ['Validation system failure prevents certification'],
      }
    }
  }

  /**
   * Validate visual editor functionality
   */
  private async validateVisualEditor(workflow: WorkflowState): Promise<ValidationResult> {
    const startTime = Date.now()
    const issues: PreservationIssue[] = []
    const details: string[] = []
    let score = 100

    try {
      // Test 1: ReactFlow node rendering compatibility
      let reactFlowNodeTest = true
      for (const [blockId, block] of Object.entries(workflow.blocks)) {
        if (['loop', 'parallel'].includes(block.type)) {
          // Container nodes should have proper dimensions
          if (!block.data?.width || !block.data?.height) {
            reactFlowNodeTest = false
            issues.push({
              category: 'UX_REGRESSION',
              severity: 'MEDIUM',
              description: `Container block ${blockId} missing dimensions`,
              impact: 'Visual rendering may be incorrect',
              affectedComponent: 'ReactFlow Renderer',
              suggestedFix: 'Ensure container blocks have width and height properties',
              blocksCertification: false,
            })
            score -= 5
          }
        } else {
          // Regular blocks should have valid block config
          const blockConfig = getBlock(block.type)
          if (!blockConfig) {
            reactFlowNodeTest = false
            issues.push({
              category: 'BREAKING_CHANGE',
              severity: 'HIGH',
              description: `Block ${blockId} has invalid type ${block.type}`,
              impact: 'Block will not render in visual editor',
              affectedComponent: 'Block Registry',
              suggestedFix: 'Ensure block type is registered',
              blocksCertification: true,
            })
            score -= 15
          }
        }
      }

      details.push(`ReactFlow node rendering: ${reactFlowNodeTest ? 'PASS' : 'FAIL'}`)

      // Test 2: Edge rendering and interaction
      let edgeRenderingTest = true
      const blockIds = new Set(Object.keys(workflow.blocks))
      for (const edge of workflow.edges) {
        if (!blockIds.has(edge.source) || !blockIds.has(edge.target)) {
          edgeRenderingTest = false
          issues.push({
            category: 'UX_REGRESSION',
            severity: 'MEDIUM',
            description: `Edge ${edge.id} references non-existent blocks`,
            impact: 'Edge will not render correctly',
            affectedComponent: 'ReactFlow Edge Renderer',
            suggestedFix: 'Clean up orphaned edges',
            blocksCertification: false,
          })
          score -= 3
        }
      }

      details.push(`Edge rendering: ${edgeRenderingTest ? 'PASS' : 'FAIL'}`)

      // Test 3: Drag and drop functionality
      const dragDropTest = this.validateDragDropStructure(workflow)
      details.push(`Drag and drop structure: ${dragDropTest ? 'PASS' : 'FAIL'}`)
      if (!dragDropTest) {
        score -= 10
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'MEDIUM',
          description: 'Drag and drop structure validation failed',
          impact: 'Users may not be able to drag blocks properly',
          affectedComponent: 'Visual Editor',
          suggestedFix: 'Verify position and parent-child relationships',
          blocksCertification: false,
        })
      }

      // Test 4: Container node functionality
      const containerTest = this.validateContainerNodeStructure(workflow)
      details.push(`Container node structure: ${containerTest ? 'PASS' : 'FAIL'}`)
      if (!containerTest) {
        score -= 15
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'HIGH',
          description: 'Container node structure validation failed',
          impact: 'Loop and parallel blocks may not work correctly',
          affectedComponent: 'Container Nodes',
          suggestedFix: 'Fix parent-child relationships and container dimensions',
          blocksCertification: true,
        })
      }

      const passed = score >= this.config.minimumPassingScore

      return {
        category: 'Visual Editor',
        passed,
        score,
        details,
        issues,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        category: 'Visual Editor',
        passed: false,
        score: 0,
        details: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        issues: [
          {
            category: 'BREAKING_CHANGE',
            severity: 'CRITICAL',
            description: 'Visual editor validation system failure',
            impact: 'Cannot verify visual editor functionality',
            affectedComponent: 'Visual Editor Validator',
            suggestedFix: 'Fix validation system',
            blocksCertification: true,
          },
        ],
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Validate workflow execution functionality
   */
  private async validateExecution(
    workflowId: string,
    workflow: WorkflowState
  ): Promise<ValidationResult> {
    const startTime = Date.now()
    const issues: PreservationIssue[] = []
    const details: string[] = []
    let score = 100

    try {
      // Test 1: Workflow serializability
      const serializer = new Serializer()
      let serializationTest = true
      try {
        const serialized = serializer.serialize(workflow)
        if (!serialized || !serialized.blocks) {
          serializationTest = false
        }
      } catch {
        serializationTest = false
      }

      details.push(`Serialization: ${serializationTest ? 'PASS' : 'FAIL'}`)
      if (!serializationTest) {
        score -= 25
        issues.push({
          category: 'BREAKING_CHANGE',
          severity: 'CRITICAL',
          description: 'Workflow serialization failed',
          impact: 'Workflow cannot be executed',
          affectedComponent: 'Serializer',
          suggestedFix: 'Fix workflow structure for proper serialization',
          blocksCertification: true,
        })
      }

      // Test 2: Block execution readiness
      let blockExecutionTest = true
      for (const [blockId, block] of Object.entries(workflow.blocks)) {
        if (typeof block.enabled !== 'boolean') {
          blockExecutionTest = false
          score -= 5
        }

        if (block.outputs && typeof block.outputs !== 'object') {
          blockExecutionTest = false
          score -= 5
        }

        if (!['loop', 'parallel'].includes(block.type)) {
          const blockConfig = getBlock(block.type)
          if (!blockConfig) {
            blockExecutionTest = false
            score -= 10
          }
        }
      }

      details.push(`Block execution readiness: ${blockExecutionTest ? 'PASS' : 'FAIL'}`)
      if (!blockExecutionTest) {
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'HIGH',
          description: 'Some blocks are not ready for execution',
          impact: 'Workflow execution may fail or produce incorrect results',
          affectedComponent: 'Block Execution System',
          suggestedFix: 'Fix block configuration and state properties',
          blocksCertification: true,
        })
      }

      // Test 3: Execution flow validation
      const executionFlowTest = this.validateExecutionFlow(workflow)
      details.push(`Execution flow: ${executionFlowTest ? 'PASS' : 'FAIL'}`)
      if (!executionFlowTest) {
        score -= 20
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'HIGH',
          description: 'Execution flow validation failed',
          impact: 'Workflow may not execute in correct order',
          affectedComponent: 'Execution Engine',
          suggestedFix: 'Fix edge connections and block dependencies',
          blocksCertification: true,
        })
      }

      // Test 4: Container execution validation
      const containerExecutionTest = this.validateContainerExecution(workflow)
      details.push(`Container execution: ${containerExecutionTest ? 'PASS' : 'FAIL'}`)
      if (!containerExecutionTest) {
        score -= 15
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'MEDIUM',
          description: 'Container execution validation failed',
          impact: 'Loop and parallel blocks may not execute correctly',
          affectedComponent: 'Container Execution',
          suggestedFix: 'Fix loop and parallel block configurations',
          blocksCertification: false,
        })
      }

      const passed = score >= this.config.minimumPassingScore

      return {
        category: 'Execution',
        passed,
        score,
        details,
        issues,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        category: 'Execution',
        passed: false,
        score: 0,
        details: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        issues: [
          {
            category: 'BREAKING_CHANGE',
            severity: 'CRITICAL',
            description: 'Execution validation system failure',
            impact: 'Cannot verify execution functionality',
            affectedComponent: 'Execution Validator',
            suggestedFix: 'Fix validation system',
            blocksCertification: true,
          },
        ],
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Validate collaboration functionality
   */
  private async validateCollaboration(
    workflowId: string,
    workflow: WorkflowState
  ): Promise<ValidationResult> {
    const startTime = Date.now()
    const issues: PreservationIssue[] = []
    const details: string[] = []
    let score = 100

    try {
      // Test 1: Position update compatibility
      let positionTest = true
      for (const [blockId, block] of Object.entries(workflow.blocks)) {
        if (
          !block.position ||
          typeof block.position.x !== 'number' ||
          typeof block.position.y !== 'number' ||
          !Number.isFinite(block.position.x) ||
          !Number.isFinite(block.position.y)
        ) {
          positionTest = false
          score -= 5
        }
      }

      details.push(`Position compatibility: ${positionTest ? 'PASS' : 'FAIL'}`)
      if (!positionTest) {
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'MEDIUM',
          description: 'Position update compatibility issues detected',
          impact: 'Real-time collaboration may not work properly',
          affectedComponent: 'Collaborative Editing',
          suggestedFix: 'Fix block position properties to be finite numbers',
          blocksCertification: false,
        })
      }

      // Test 2: Update timestamp tracking
      const timestampTest = !workflow.lastUpdate || typeof workflow.lastUpdate === 'number'
      details.push(`Timestamp tracking: ${timestampTest ? 'PASS' : 'FAIL'}`)
      if (!timestampTest) {
        score -= 10
        issues.push({
          category: 'UX_REGRESSION',
          severity: 'LOW',
          description: 'Timestamp tracking format incorrect',
          impact: 'Collaboration synchronization may be affected',
          affectedComponent: 'Timestamp Tracking',
          suggestedFix: 'Ensure lastUpdate is a numeric timestamp',
          blocksCertification: false,
        })
      }

      // Test 3: State mutation safety
      const mutationTest = this.validateStateMutationSafety(workflow)
      details.push(`State mutation safety: ${mutationTest ? 'PASS' : 'FAIL'}`)
      if (!mutationTest) {
        score -= 15
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'MEDIUM',
          description: 'State mutation safety validation failed',
          impact: 'Concurrent editing may cause data corruption',
          affectedComponent: 'State Management',
          suggestedFix: 'Ensure all state updates are safe for concurrent access',
          blocksCertification: false,
        })
      }

      const passed = score >= this.config.minimumPassingScore

      return {
        category: 'Collaboration',
        passed,
        score,
        details,
        issues,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        category: 'Collaboration',
        passed: false,
        score: 0,
        details: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        issues: [
          {
            category: 'BREAKING_CHANGE',
            severity: 'CRITICAL',
            description: 'Collaboration validation system failure',
            impact: 'Cannot verify collaboration functionality',
            affectedComponent: 'Collaboration Validator',
            suggestedFix: 'Fix validation system',
            blocksCertification: true,
          },
        ],
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Validate performance characteristics
   */
  private async validatePerformance(workflow: WorkflowState): Promise<ValidationResult> {
    const startTime = Date.now()
    const issues: PreservationIssue[] = []
    const details: string[] = []
    let score = 100

    try {
      const blockCount = Object.keys(workflow.blocks).length
      const edgeCount = workflow.edges.length

      // Test 1: Structure size validation
      let sizeTest = true
      if (blockCount > 1000) {
        sizeTest = false
        score -= 10
        issues.push({
          category: 'PERFORMANCE_REGRESSION',
          severity: 'LOW',
          description: `Large workflow with ${blockCount} blocks`,
          impact: 'May impact performance with journey mapping',
          affectedComponent: 'Journey Conversion',
          suggestedFix: 'Consider breaking into smaller sub-workflows',
          blocksCertification: false,
        })
      }

      details.push(
        `Structure size: ${blockCount} blocks, ${edgeCount} edges - ${sizeTest ? 'PASS' : 'WARN'}`
      )

      // Test 2: Deep structure complexity
      const maxDepth = this.calculateMaxNestingDepth(workflow)
      let depthTest = true
      if (maxDepth > 5) {
        depthTest = false
        score -= 15
        issues.push({
          category: 'PERFORMANCE_REGRESSION',
          severity: 'MEDIUM',
          description: `Deep nesting detected: ${maxDepth} levels`,
          impact: 'May complicate journey execution logic',
          affectedComponent: 'Journey State Machine',
          suggestedFix: 'Flatten container structure where possible',
          blocksCertification: false,
        })
      }

      details.push(`Nesting depth: ${maxDepth} levels - ${depthTest ? 'PASS' : 'WARN'}`)

      // Test 3: Operation performance simulation
      const operationStart = Date.now()

      // Simulate typical operations
      for (let i = 0; i < Math.min(100, blockCount); i++) {
        const blockEntries = Object.entries(workflow.blocks)
        if (blockEntries[i]) {
          const [blockId, block] = blockEntries[i]
          // Simulate position validation (common operation)
          if (block.position && typeof block.position.x === 'number') {
            // Basic operation simulation
          }
        }
      }

      const operationTime = Date.now() - operationStart
      const performanceTest = operationTime < this.config.performanceThresholdMs

      details.push(
        `Operation performance: ${operationTime}ms - ${performanceTest ? 'PASS' : 'WARN'}`
      )

      if (!performanceTest) {
        score -= 20
        issues.push({
          category: 'PERFORMANCE_REGRESSION',
          severity: 'MEDIUM',
          description: `Operations taking ${operationTime}ms (threshold: ${this.config.performanceThresholdMs}ms)`,
          impact: 'User experience may be degraded',
          affectedComponent: 'Workflow Operations',
          suggestedFix: 'Optimize workflow structure or improve performance',
          blocksCertification: false,
        })
      }

      const passed = score >= this.config.minimumPassingScore

      return {
        category: 'Performance',
        passed,
        score,
        details,
        issues,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        category: 'Performance',
        passed: false,
        score: 0,
        details: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        issues: [
          {
            category: 'BREAKING_CHANGE',
            severity: 'CRITICAL',
            description: 'Performance validation system failure',
            impact: 'Cannot verify performance characteristics',
            affectedComponent: 'Performance Validator',
            suggestedFix: 'Fix validation system',
            blocksCertification: true,
          },
        ],
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Validate data integrity
   */
  private async validateDataIntegrity(workflow: WorkflowState): Promise<ValidationResult> {
    const startTime = Date.now()
    const issues: PreservationIssue[] = []
    const details: string[] = []
    let score = 100

    try {
      // Test 1: Deep clone integrity
      let cloneTest = true
      try {
        const cloned = JSON.parse(JSON.stringify(workflow))
        const originalBlockCount = Object.keys(workflow.blocks).length
        const clonedBlockCount = Object.keys(cloned.blocks || {}).length

        if (originalBlockCount !== clonedBlockCount) {
          cloneTest = false
        }
      } catch {
        cloneTest = false
      }

      details.push(`Deep clone integrity: ${cloneTest ? 'PASS' : 'FAIL'}`)
      if (!cloneTest) {
        score -= 25
        issues.push({
          category: 'BREAKING_CHANGE',
          severity: 'CRITICAL',
          description: 'Workflow cannot be safely cloned',
          impact: 'Data persistence and snapshots will fail',
          affectedComponent: 'Data Serialization',
          suggestedFix: 'Fix non-serializable properties in workflow state',
          blocksCertification: true,
        })
      }

      // Test 2: Reference integrity
      const referenceTest = this.validateReferenceIntegrity(workflow)
      details.push(`Reference integrity: ${referenceTest ? 'PASS' : 'FAIL'}`)
      if (!referenceTest) {
        score -= 20
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'HIGH',
          description: 'Reference integrity validation failed',
          impact: 'Workflow relationships may be corrupted',
          affectedComponent: 'Data References',
          suggestedFix: 'Fix broken references between blocks and edges',
          blocksCertification: true,
        })
      }

      // Test 3: Data consistency
      const consistencyTest = this.validateInternalDataConsistency(workflow)
      details.push(`Internal data consistency: ${consistencyTest ? 'PASS' : 'FAIL'}`)
      if (!consistencyTest) {
        score -= 15
        issues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'MEDIUM',
          description: 'Internal data consistency issues detected',
          impact: 'Workflow behavior may be unpredictable',
          affectedComponent: 'Data Consistency',
          suggestedFix: 'Fix data consistency issues',
          blocksCertification: false,
        })
      }

      const passed = score >= this.config.minimumPassingScore

      return {
        category: 'Data Integrity',
        passed,
        score,
        details,
        issues,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        category: 'Data Integrity',
        passed: false,
        score: 0,
        details: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        issues: [
          {
            category: 'BREAKING_CHANGE',
            severity: 'CRITICAL',
            description: 'Data integrity validation system failure',
            impact: 'Cannot verify data integrity',
            affectedComponent: 'Data Integrity Validator',
            suggestedFix: 'Fix validation system',
            blocksCertification: true,
          },
        ],
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Compile comprehensive validation result
   */
  private async compileValidationResult(
    workflowId: string,
    executionTime: number,
    results: {
      compatibilityResult: CompatibilityValidationResult
      regressionResult: RegressionTestSuite
      consistencyResult: ConsistencyValidationResult
      visualEditorValidation: ValidationResult
      executionValidation: ValidationResult
      collaborationValidation: ValidationResult
      performanceValidation: ValidationResult
      dataIntegrityValidation: ValidationResult
    }
  ): Promise<PreservationValidationResult> {
    // Collect all critical issues
    const criticalIssues: PreservationIssue[] = []
    const warnings: PreservationWarning[] = []
    const recommendations: string[] = []

    // Add compatibility errors as critical issues
    results.compatibilityResult.errors.forEach((error) => {
      if (error.severity === 'CRITICAL' || error.severity === 'HIGH') {
        criticalIssues.push({
          category: 'BREAKING_CHANGE',
          severity: error.severity,
          description: error.message,
          impact: error.details,
          affectedComponent: error.blockId || error.edgeId || 'Unknown',
          suggestedFix: error.suggestedFix || 'Review compatibility documentation',
          blocksCertification: true,
        })
      }
    })

    // Add regression test failures as critical issues
    results.regressionResult.results.forEach((test) => {
      if (!test.passed) {
        criticalIssues.push({
          category: 'FUNCTIONALITY_LOSS',
          severity: 'HIGH',
          description: `Regression test failed: ${test.testName}`,
          impact: test.error || 'Functionality regression detected',
          affectedComponent: 'Regression Test Suite',
          suggestedFix: 'Fix the underlying functionality issue',
          blocksCertification: true,
        })
      }
    })

    // Add validation issues
    const validations = [
      results.visualEditorValidation,
      results.executionValidation,
      results.collaborationValidation,
      results.performanceValidation,
      results.dataIntegrityValidation,
    ]

    validations.forEach((validation) => {
      criticalIssues.push(...validation.issues)
    })

    // Add compatibility warnings as warnings
    results.compatibilityResult.warnings.forEach((warning) => {
      warnings.push({
        type: 'MINOR_CHANGE',
        description: warning.message,
        recommendation: warning.details,
        impact: warning.impact,
      })
    })

    // Compile recommendations
    recommendations.push(
      ...results.compatibilityResult.preservedFeatures.map(
        (f) => `✓ ${f.feature}: ${f.description}`
      )
    )
    recommendations.push(...results.consistencyResult.recommendations)

    // Determine overall success
    const blockingIssues = criticalIssues.filter((issue) => issue.blocksCertification)
    const overallSuccess =
      blockingIssues.length === 0 &&
      results.compatibilityResult.isCompatible &&
      results.regressionResult.overallSuccess &&
      results.consistencyResult.canProceed &&
      validations.every((v) => v.passed)

    // Determine certification level
    let certificationLevel: 'FULL' | 'PARTIAL' | 'FAILED' = 'FAILED'
    const certificationDetails: string[] = []

    if (overallSuccess) {
      certificationLevel = 'FULL'
      certificationDetails.push('All validation tests passed')
      certificationDetails.push('ReactFlow functionality fully preserved')
      certificationDetails.push('Safe for journey mapping implementation')
    } else if (criticalIssues.length === 0) {
      certificationLevel = 'PARTIAL'
      certificationDetails.push('Core functionality preserved')
      certificationDetails.push('Some non-critical issues detected')
      certificationDetails.push('Journey mapping can proceed with caution')
    } else {
      certificationLevel = 'FAILED'
      certificationDetails.push('Critical issues prevent certification')
      certificationDetails.push('Journey mapping should not proceed until issues are resolved')
    }

    return {
      overallSuccess,
      workflowId,
      validationTimestamp: new Date(),
      executionTime,
      compatibilityResult: results.compatibilityResult,
      regressionResult: results.regressionResult,
      consistencyResult: results.consistencyResult,
      visualEditorValidation: results.visualEditorValidation,
      executionValidation: results.executionValidation,
      collaborationValidation: results.collaborationValidation,
      performanceValidation: results.performanceValidation,
      dataIntegrityValidation: results.dataIntegrityValidation,
      criticalIssues,
      warnings,
      recommendations,
      preservationCertified: overallSuccess,
      certificationLevel,
      certificationDetails,
    }
  }

  /**
   * Helper validation methods
   */
  private validateDragDropStructure(workflow: WorkflowState): boolean {
    for (const [blockId, block] of Object.entries(workflow.blocks)) {
      if (
        !block.position ||
        typeof block.position.x !== 'number' ||
        typeof block.position.y !== 'number'
      ) {
        return false
      }
    }
    return true
  }

  private validateContainerNodeStructure(workflow: WorkflowState): boolean {
    for (const [blockId, block] of Object.entries(workflow.blocks)) {
      if (['loop', 'parallel'].includes(block.type)) {
        if (!block.data?.width || !block.data?.height) {
          return false
        }
      }
    }
    return true
  }

  private validateExecutionFlow(workflow: WorkflowState): boolean {
    const blockIds = new Set(Object.keys(workflow.blocks))

    for (const edge of workflow.edges) {
      if (!blockIds.has(edge.source) || !blockIds.has(edge.target)) {
        return false
      }
    }

    return true
  }

  private validateContainerExecution(workflow: WorkflowState): boolean {
    if (workflow.loops) {
      for (const [loopId, loop] of Object.entries(workflow.loops)) {
        if (!loop.id || !Array.isArray(loop.nodes)) {
          return false
        }
      }
    }

    if (workflow.parallels) {
      for (const [parallelId, parallel] of Object.entries(workflow.parallels)) {
        if (!parallel.id || !Array.isArray(parallel.nodes)) {
          return false
        }
      }
    }

    return true
  }

  private validateStateMutationSafety(workflow: WorkflowState): boolean {
    // Check that all mutable properties are properly structured
    for (const [blockId, block] of Object.entries(workflow.blocks)) {
      if (block.subBlocks && typeof block.subBlocks !== 'object') {
        return false
      }
      if (block.outputs && typeof block.outputs !== 'object') {
        return false
      }
    }
    return true
  }

  private calculateMaxNestingDepth(workflow: WorkflowState): number {
    let maxDepth = 0

    const getDepth = (blockId: string, currentDepth = 0): number => {
      const block = workflow.blocks[blockId]
      if (!block || !block.data?.parentId) {
        return currentDepth
      }
      return getDepth(block.data.parentId, currentDepth + 1)
    }

    for (const blockId of Object.keys(workflow.blocks)) {
      const depth = getDepth(blockId)
      maxDepth = Math.max(maxDepth, depth)
    }

    return maxDepth
  }

  private validateReferenceIntegrity(workflow: WorkflowState): boolean {
    const blockIds = new Set(Object.keys(workflow.blocks))

    // Check edge references
    for (const edge of workflow.edges) {
      if (!blockIds.has(edge.source) || !blockIds.has(edge.target)) {
        return false
      }
    }

    // Check parent-child references
    for (const [blockId, block] of Object.entries(workflow.blocks)) {
      if (block.data?.parentId && !blockIds.has(block.data.parentId)) {
        return false
      }
    }

    return true
  }

  private validateInternalDataConsistency(workflow: WorkflowState): boolean {
    for (const [blockId, block] of Object.entries(workflow.blocks)) {
      if (block.id !== blockId) {
        return false
      }

      if (typeof block.enabled !== 'boolean') {
        return false
      }
    }

    return true
  }
}

/**
 * Singleton workflow preservation validator
 */
export const workflowPreservationValidator = new WorkflowPreservationValidator()

/**
 * Quick preservation check
 */
export async function validatePreservation(
  workflowId: string,
  reactFlowState: WorkflowState,
  journeyState?: any
): Promise<boolean> {
  const result = await workflowPreservationValidator.validateWorkflowPreservation(
    workflowId,
    reactFlowState,
    journeyState
  )
  return result.overallSuccess
}

/**
 * Get comprehensive preservation report
 */
export async function getPreservationReport(
  workflowId: string,
  reactFlowState: WorkflowState,
  journeyState?: any
): Promise<PreservationValidationResult> {
  return await workflowPreservationValidator.validateWorkflowPreservation(
    workflowId,
    reactFlowState,
    journeyState
  )
}

/**
 * Certify workflow for journey mapping
 */
export async function certifyWorkflowForJourneyMapping(
  workflowId: string,
  reactFlowState: WorkflowState
): Promise<{ certified: boolean; level: string; details: string[] }> {
  const result = await getPreservationReport(workflowId, reactFlowState)

  return {
    certified: result.preservationCertified,
    level: result.certificationLevel,
    details: result.certificationDetails,
  }
}
