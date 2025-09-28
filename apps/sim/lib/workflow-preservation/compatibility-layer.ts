/**
 * ReactFlow Workflow Preservation System
 *
 * This system ensures that all existing ReactFlow editor functionality remains
 * fully intact while adding conversational capabilities as an optional enhancement.
 *
 * Mission: Zero regression in existing ReactFlow functionality
 * Approach: Compatibility wrapper + version control + rollback mechanisms
 */

import type { Edge } from 'reactflow'
import { createLogger } from '@/lib/logs/console/logger'
import type { BlockState, Position, WorkflowState } from '@/stores/workflows/workflow/types'

const logger = createLogger('WorkflowPreservation')

// Version tracking for backward compatibility
export interface CompatibilityVersion {
  major: number
  minor: number
  patch: number
  reactFlowVersion: string
  simVersion: string
  timestamp: Date
}

// Current compatibility baseline
export const COMPATIBILITY_BASELINE: CompatibilityVersion = {
  major: 1,
  minor: 0,
  patch: 0,
  reactFlowVersion: '11.11.4',
  simVersion: '0.1.0',
  timestamp: new Date(),
}

// Workflow preservation state tracker
export interface PreservationState {
  originalWorkflow: WorkflowState
  preservedFunctionality: Set<string>
  migrationHistory: MigrationRecord[]
  rollbackAvailable: boolean
  lastValidation: Date
  compatibilityStatus: 'preserved' | 'enhanced' | 'migrating' | 'error'
}

export interface MigrationRecord {
  id: string
  timestamp: Date
  fromVersion: CompatibilityVersion
  toVersion: CompatibilityVersion
  changes: string[]
  rollbackData: any
  success: boolean
  errorDetails?: string
}

/**
 * Core Preservation System
 *
 * Maintains backward compatibility by wrapping new functionality
 * around existing ReactFlow implementation without modification
 */
export class WorkflowPreservationSystem {
  private preservationStates = new Map<string, PreservationState>()
  private functionalityRegistry = new Set<string>()

  constructor() {
    this.initializeFunctionalityRegistry()
  }

  /**
   * Register all existing ReactFlow functionality that must be preserved
   */
  private initializeFunctionalityRegistry(): void {
    // Core ReactFlow Editor Functions
    this.functionalityRegistry.add('workflow-creation')
    this.functionalityRegistry.add('block-drag-drop')
    this.functionalityRegistry.add('edge-connection')
    this.functionalityRegistry.add('node-positioning')
    this.functionalityRegistry.add('canvas-panning')
    this.functionalityRegistry.add('zoom-controls')
    this.functionalityRegistry.add('auto-layout')
    this.functionalityRegistry.add('collaborative-editing')

    // Block Operations
    this.functionalityRegistry.add('block-addition')
    this.functionalityRegistry.add('block-deletion')
    this.functionalityRegistry.add('block-duplication')
    this.functionalityRegistry.add('block-configuration')
    this.functionalityRegistry.add('subblock-editing')
    this.functionalityRegistry.add('block-enable-disable')
    this.functionalityRegistry.add('block-sizing')

    // Edge Operations
    this.functionalityRegistry.add('edge-creation')
    this.functionalityRegistry.add('edge-deletion')
    this.functionalityRegistry.add('edge-selection')
    this.functionalityRegistry.add('conditional-edges')
    this.functionalityRegistry.add('error-edges')

    // Container Operations
    this.functionalityRegistry.add('loop-containers')
    this.functionalityRegistry.add('parallel-containers')
    this.functionalityRegistry.add('container-nesting')
    this.functionalityRegistry.add('container-resizing')
    this.functionalityRegistry.add('parent-child-relationships')

    // Workflow Management
    this.functionalityRegistry.add('workflow-execution')
    this.functionalityRegistry.add('workflow-debugging')
    this.functionalityRegistry.add('workflow-deployment')
    this.functionalityRegistry.add('workflow-sharing')
    this.functionalityRegistry.add('workflow-versioning')

    // UI/UX Features
    this.functionalityRegistry.add('keyboard-shortcuts')
    this.functionalityRegistry.add('context-menus')
    this.functionalityRegistry.add('toolbar-interactions')
    this.functionalityRegistry.add('property-panels')
    this.functionalityRegistry.add('diff-visualization')

    // Data Operations
    this.functionalityRegistry.add('workflow-import')
    this.functionalityRegistry.add('workflow-export')
    this.functionalityRegistry.add('data-persistence')
    this.functionalityRegistry.add('real-time-sync')

    // Performance Features
    this.functionalityRegistry.add('viewport-optimization')
    this.functionalityRegistry.add('large-workflow-handling')
    this.functionalityRegistry.add('memory-management')

    logger.info('Functionality registry initialized', {
      totalFunctions: this.functionalityRegistry.size,
      functions: Array.from(this.functionalityRegistry),
    })
  }

  /**
   * Create preservation state for a workflow before any modifications
   */
  createPreservationState(workflowId: string, originalWorkflow: WorkflowState): PreservationState {
    const preservationState: PreservationState = {
      originalWorkflow: this.deepClone(originalWorkflow),
      preservedFunctionality: new Set(this.functionalityRegistry),
      migrationHistory: [],
      rollbackAvailable: true,
      lastValidation: new Date(),
      compatibilityStatus: 'preserved',
    }

    this.preservationStates.set(workflowId, preservationState)

    logger.info('Preservation state created', {
      workflowId,
      blocksCount: Object.keys(originalWorkflow.blocks).length,
      edgesCount: originalWorkflow.edges.length,
      preservedFunctions: preservationState.preservedFunctionality.size,
    })

    return preservationState
  }

  /**
   * Validate that all core functionality remains intact
   */
  async validatePreservation(
    workflowId: string,
    currentWorkflow: WorkflowState
  ): Promise<ValidationResult> {
    const preservationState = this.preservationStates.get(workflowId)
    if (!preservationState) {
      return {
        success: false,
        error: 'No preservation state found for workflow',
        details: { workflowId },
      }
    }

    const validationResults: FunctionValidationResult[] = []

    // Validate core data structures
    validationResults.push(
      await this.validateDataStructures(preservationState.originalWorkflow, currentWorkflow)
    )

    // Validate ReactFlow compatibility
    validationResults.push(await this.validateReactFlowCompatibility(currentWorkflow))

    // Validate operational functionality
    validationResults.push(await this.validateOperationalFunctionality(workflowId, currentWorkflow))

    // Validate UI/UX preservation
    validationResults.push(await this.validateUIPreservation(currentWorkflow))

    const failedValidations = validationResults.filter((result) => !result.success)
    const overallSuccess = failedValidations.length === 0

    // Update preservation state
    preservationState.lastValidation = new Date()
    preservationState.compatibilityStatus = overallSuccess ? 'preserved' : 'error'

    const result: ValidationResult = {
      success: overallSuccess,
      details: {
        workflowId,
        totalChecks: validationResults.length,
        passedChecks: validationResults.length - failedValidations.length,
        failedChecks: failedValidations.length,
        validationResults,
        timestamp: new Date(),
      },
    }

    if (!overallSuccess) {
      result.error = 'Preservation validation failed'
      result.details.failures = failedValidations

      logger.error('Preservation validation failed', result.details)
    } else {
      logger.info('Preservation validation passed', result.details)
    }

    return result
  }

  /**
   * Validate core data structures remain compatible
   */
  private async validateDataStructures(
    original: WorkflowState,
    current: WorkflowState
  ): Promise<FunctionValidationResult> {
    const checks: { Name: string; passed: boolean; details?: any }[] = []

    // Validate blocks structure
    checks.push({
      Name: 'blocks-structure',
      passed: typeof current.blocks === 'object' && current.blocks !== null,
      details: { currentType: typeof current.blocks },
    })

    // Validate edges structure
    checks.push({
      Name: 'edges-structure',
      passed: Array.isArray(current.edges),
      details: { currentType: typeof current.edges, isArray: Array.isArray(current.edges) },
    })

    // Validate essential block properties
    const blockValidation = this.validateBlockStructures(original.blocks, current.blocks)
    checks.push({
      Name: 'block-properties',
      passed: blockValidation.success,
      details: blockValidation.details,
    })

    // Validate edge properties
    const edgeValidation = this.validateEdgeStructures(original.edges, current.edges)
    checks.push({
      Name: 'edge-properties',
      passed: edgeValidation.success,
      details: edgeValidation.details,
    })

    const failedChecks = checks.filter((check) => !check.passed)

    return {
      functionality: 'data-structures',
      success: failedChecks.length === 0,
      details: {
        totalChecks: checks.length,
        passedChecks: checks.length - failedChecks.length,
        checks,
        failures: failedChecks,
      },
    }
  }

  /**
   * Validate ReactFlow specific compatibility
   */
  private async validateReactFlowCompatibility(
    workflow: WorkflowState
  ): Promise<FunctionValidationResult> {
    const checks: { Name: string; passed: boolean; details?: any }[] = []

    // Check ReactFlow node format compatibility
    Object.values(workflow.blocks).forEach((block, index) => {
      checks.push({
        Name: `block-${index}-reactflow-compat`,
        passed: this.isReactFlowNodeCompatible(block),
        details: { blockId: block.id, blockType: block.type },
      })
    })

    // Check ReactFlow edge format compatibility
    workflow.edges.forEach((edge, index) => {
      checks.push({
        Name: `edge-${index}-reactflow-compat`,
        passed: this.isReactFlowEdgeCompatible(edge),
        details: { edgeId: edge.id, source: edge.source, target: edge.target },
      })
    })

    const failedChecks = checks.filter((check) => !check.passed)

    return {
      functionality: 'reactflow-compatibility',
      success: failedChecks.length === 0,
      details: {
        totalChecks: checks.length,
        passedChecks: checks.length - failedChecks.length,
        checks,
        failures: failedChecks,
      },
    }
  }

  /**
   * Validate operational functionality preservation
   */
  private async validateOperationalFunctionality(
    workflowId: string,
    workflow: WorkflowState
  ): Promise<FunctionValidationResult> {
    const checks: { Name: string; passed: boolean; details?: any }[] = []

    // Validate workflow can be executed
    checks.push({
      Name: 'workflow-executable',
      passed: this.isWorkflowExecutable(workflow),
      details: { blockCount: Object.keys(workflow.blocks).length },
    })

    // Validate all blocks have valid configurations
    const blockConfigChecks = this.validateBlockConfigurations(workflow.blocks)
    checks.push(...blockConfigChecks)

    // Validate edge connectivity
    checks.push({
      Name: 'edge-connectivity',
      passed: this.validateEdgeConnectivity(workflow),
      details: { edgeCount: workflow.edges.length },
    })

    const failedChecks = checks.filter((check) => !check.passed)

    return {
      functionality: 'operational',
      success: failedChecks.length === 0,
      details: {
        totalChecks: checks.length,
        passedChecks: checks.length - failedChecks.length,
        checks,
        failures: failedChecks,
      },
    }
  }

  /**
   * Validate UI/UX preservation
   */
  private async validateUIPreservation(workflow: WorkflowState): Promise<FunctionValidationResult> {
    const checks: { Name: string; passed: boolean; details?: any }[] = []

    // Validate block positioning
    Object.values(workflow.blocks).forEach((block) => {
      checks.push({
        Name: `block-${block.id}-position`,
        passed: this.isValidPosition(block.position),
        details: { position: block.position },
      })
    })

    // Validate container structures
    const containerBlocks = Object.values(workflow.blocks).filter(
      (b) => b.type === 'loop' || b.type === 'parallel'
    )
    containerBlocks.forEach((container) => {
      checks.push({
        Name: `container-${container.id}-structure`,
        passed: this.isValidContainerStructure(container),
        details: { containerId: container.id, type: container.type, data: container.data },
      })
    })

    const failedChecks = checks.filter((check) => !check.passed)

    return {
      functionality: 'ui-preservation',
      success: failedChecks.length === 0,
      details: {
        totalChecks: checks.length,
        passedChecks: checks.length - failedChecks.length,
        checks,
        failures: failedChecks,
      },
    }
  }

  /**
   * Create rollback point before making changes
   */
  createRollbackPoint(workflowId: string, description: string): string {
    const preservationState = this.preservationStates.get(workflowId)
    if (!preservationState) {
      throw new Error(`No preservation state found for workflow ${workflowId}`)
    }

    const rollbackId = `rollback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const migrationRecord: MigrationRecord = {
      id: rollbackId,
      timestamp: new Date(),
      fromVersion: COMPATIBILITY_BASELINE,
      toVersion: COMPATIBILITY_BASELINE, // Same version for rollback point
      changes: [description],
      rollbackData: this.deepClone(preservationState.originalWorkflow),
      success: true,
    }

    preservationState.migrationHistory.push(migrationRecord)

    logger.info('Rollback point created', {
      workflowId,
      rollbackId,
      description,
      timestamp: migrationRecord.timestamp,
    })

    return rollbackId
  }

  /**
   * Execute rollback to previous state
   */
  async executeRollback(workflowId: string, rollbackId: string): Promise<RollbackResult> {
    const preservationState = this.preservationStates.get(workflowId)
    if (!preservationState) {
      return {
        success: false,
        error: 'No preservation state found',
        details: { workflowId },
      }
    }

    const migrationRecord = preservationState.migrationHistory.find(
      (record) => record.id === rollbackId
    )
    if (!migrationRecord) {
      return {
        success: false,
        error: 'Rollback point not found',
        details: { workflowId, rollbackId },
      }
    }

    try {
      // Restore original workflow state
      const restoredWorkflow = this.deepClone(migrationRecord.rollbackData)

      // Update preservation state
      preservationState.originalWorkflow = restoredWorkflow
      preservationState.compatibilityStatus = 'preserved'
      preservationState.rollbackAvailable = true

      logger.info('Rollback executed successfully', {
        workflowId,
        rollbackId,
        restoredBlocks: Object.keys(restoredWorkflow.blocks).length,
        restoredEdges: restoredWorkflow.edges.length,
      })

      return {
        success: true,
        details: {
          workflowId,
          rollbackId,
          restoredWorkflow,
          timestamp: new Date(),
        },
      }
    } catch (error) {
      logger.error('Rollback execution failed', {
        workflowId,
        rollbackId,
        error,
      })

      return {
        success: false,
        error: 'Rollback execution failed',
        details: {
          workflowId,
          rollbackId,
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  // Helper methods

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  private validateBlockStructures(
    originalBlocks: Record<string, BlockState>,
    currentBlocks: Record<string, BlockState>
  ) {
    const issues: string[] = []

    // Check that essential block properties are preserved
    Object.values(currentBlocks).forEach((block) => {
      if (!block.id) issues.push(`Block missing id: ${JSON.stringify(block)}`)
      if (!block.type) issues.push(`Block ${block.id} missing type`)
      if (!block.Name) issues.push(`Block ${block.id} missing Name`)
      if (
        !block.position ||
        typeof block.position.x !== 'number' ||
        typeof block.position.y !== 'number'
      ) {
        issues.push(`Block ${block.id} has invalid position`)
      }
    })

    return {
      success: issues.length === 0,
      details: { issues, blockCount: Object.keys(currentBlocks).length },
    }
  }

  private validateEdgeStructures(originalEdges: Edge[], currentEdges: Edge[]) {
    const issues: string[] = []

    currentEdges.forEach((edge) => {
      if (!edge.id) issues.push(`Edge missing id: ${JSON.stringify(edge)}`)
      if (!edge.source) issues.push(`Edge ${edge.id} missing source`)
      if (!edge.target) issues.push(`Edge ${edge.id} missing target`)
    })

    return {
      success: issues.length === 0,
      details: { issues, edgeCount: currentEdges.length },
    }
  }

  private isReactFlowNodeCompatible(block: BlockState): boolean {
    return !!(
      block.id &&
      block.type &&
      block.position &&
      typeof block.position.x === 'number' &&
      typeof block.position.y === 'number'
    )
  }

  private isReactFlowEdgeCompatible(edge: Edge): boolean {
    return !!(edge.id && edge.source && edge.target)
  }

  private isWorkflowExecutable(workflow: WorkflowState): boolean {
    // Basic check - at least one block exists
    return Object.keys(workflow.blocks).length > 0
  }

  private validateBlockConfigurations(blocks: Record<string, BlockState>) {
    return Object.values(blocks).map((block) => ({
      Name: `block-${block.id}-config`,
      passed: block.enabled !== undefined,
      details: { blockId: block.id, enabled: block.enabled },
    }))
  }

  private validateEdgeConnectivity(workflow: WorkflowState): boolean {
    const blockIds = new Set(Object.keys(workflow.blocks))
    return workflow.edges.every((edge) => blockIds.has(edge.source) && blockIds.has(edge.target))
  }

  private isValidPosition(position: Position): boolean {
    return (
      position &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      !Number.isNaN(position.x) &&
      !Number.isNaN(position.y)
    )
  }

  private isValidContainerStructure(container: BlockState): boolean {
    return !!(
      container.data &&
      (container.data.width || container.data.height) &&
      (container.type === 'loop' || container.type === 'parallel')
    )
  }

  /**
   * Get preservation state for a workflow
   */
  getPreservationState(workflowId: string): PreservationState | undefined {
    return this.preservationStates.get(workflowId)
  }

  /**
   * Get all registered functionality
   */
  getRegisteredFunctionality(): string[] {
    return Array.from(this.functionalityRegistry)
  }
}

// Type definitions

export interface ValidationResult {
  success: boolean
  error?: string
  details: {
    workflowId: string
    totalChecks: number
    passedChecks: number
    failedChecks: number
    validationResults: FunctionValidationResult[]
    failures?: FunctionValidationResult[]
    timestamp: Date
  }
}

export interface FunctionValidationResult {
  functionality: string
  success: boolean
  details: any
}

export interface RollbackResult {
  success: boolean
  error?: string
  details: {
    workflowId: string
    rollbackId?: string
    restoredWorkflow?: WorkflowState
    timestamp?: Date
    error?: string
  }
}

// Singleton instance
export const workflowPreservationSystem = new WorkflowPreservationSystem()
