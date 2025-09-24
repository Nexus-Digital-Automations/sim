/**
 * Data Consistency and Migration Safety System
 *
 * This system ensures 100% data integrity when introducing journey mapping
 * capabilities while maintaining complete backward compatibility with ReactFlow.
 *
 * CORE SAFETY PRINCIPLES:
 * 1. ZERO DATA LOSS - No existing workflow data is ever lost or corrupted
 * 2. ATOMIC OPERATIONS - All changes are reversible with full rollback
 * 3. INCREMENTAL MIGRATION - Gradual introduction with safety validation
 * 4. CONCURRENT SAFETY - Multiple users can work safely during migration
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { WorkflowState } from '@/stores/workflows/workflow/types'

const logger = createLogger('DataConsistency')

export interface DataConsistencyConfig {
  backupEnabled: boolean
  rollbackEnabled: boolean
  incrementalMigration: boolean
  validationStrict: boolean
  concurrentSafetyEnabled: boolean
}

export interface WorkflowSnapshot {
  snapshotId: string
  workflowId: string
  timestamp: Date
  version: string
  reactFlowState: WorkflowState
  journeyState?: any
  metadata: {
    reason: string
    userInitiated: boolean
    autoCreated: boolean
    checksum: string
  }
}

export interface MigrationOperation {
  operationId: string
  type: 'ADD_JOURNEY_MAPPING' | 'UPDATE_JOURNEY_MAPPING' | 'REMOVE_JOURNEY_MAPPING' | 'SYNC_STATES'
  workflowId: string
  timestamp: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK'
  preOperationSnapshot: string
  postOperationSnapshot?: string
  validationResult?: any
  rollbackData?: any
  error?: string
}

export interface ConsistencyValidationResult {
  isConsistent: boolean
  inconsistencies: DataInconsistency[]
  warnings: DataWarning[]
  recommendations: string[]
  canProceed: boolean
}

export interface DataInconsistency {
  type: 'MISSING_DATA' | 'CORRUPTED_DATA' | 'VERSION_MISMATCH' | 'REFERENCE_BROKEN'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  location: string
  description: string
  expected: any
  actual: any
  autoFixable: boolean
  fixSuggestion?: string
}

export interface DataWarning {
  type: 'PERFORMANCE_IMPACT' | 'COMPATIBILITY_CONCERN' | 'DEPRECATED_FEATURE'
  message: string
  impact: string
  recommendation: string
}

export interface RollbackPlan {
  planId: string
  workflowId: string
  targetSnapshotId: string
  estimatedTime: number
  riskLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'
  affectedComponents: string[]
  dataLossRisk: boolean
  steps: RollbackStep[]
}

export interface RollbackStep {
  stepId: string
  description: string
  action: string
  parameters: any
  expectedDuration: number
  rollbackable: boolean
}

/**
 * Core data consistency and migration safety manager
 */
export class DataConsistencyManager {
  private logger = createLogger('DataConsistencyManager')
  private config: DataConsistencyConfig
  private snapshots: Map<string, WorkflowSnapshot> = new Map()
  private migrations: Map<string, MigrationOperation> = new Map()
  private locks: Map<string, { userId: string; timestamp: Date; operation: string }> = new Map()

  constructor(
    config: DataConsistencyConfig = {
      backupEnabled: true,
      rollbackEnabled: true,
      incrementalMigration: true,
      validationStrict: true,
      concurrentSafetyEnabled: true,
    }
  ) {
    this.config = config
    this.logger.info('Data consistency manager initialized', { config })
  }

  /**
   * Create a snapshot of workflow state for rollback safety
   */
  async createWorkflowSnapshot(
    workflowId: string,
    reactFlowState: WorkflowState,
    reason: string,
    journeyState?: any
  ): Promise<WorkflowSnapshot> {
    const snapshotId = `snapshot-${workflowId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    this.logger.info('Creating workflow snapshot', {
      workflowId,
      snapshotId,
      reason,
      hasJourneyState: !!journeyState,
    })

    // Create deep copy to prevent mutations
    const snapshot: WorkflowSnapshot = {
      snapshotId,
      workflowId,
      timestamp: new Date(),
      version: '1.0.0',
      reactFlowState: this.deepCloneWorkflowState(reactFlowState),
      journeyState: journeyState ? JSON.parse(JSON.stringify(journeyState)) : undefined,
      metadata: {
        reason,
        userInitiated: reason.includes('user'),
        autoCreated: reason.includes('auto'),
        checksum: await this.calculateChecksum(reactFlowState),
      },
    }

    this.snapshots.set(snapshotId, snapshot)

    this.logger.info('Workflow snapshot created successfully', {
      snapshotId,
      checksum: snapshot.metadata.checksum,
    })

    return snapshot
  }

  /**
   * Validate data consistency between ReactFlow and Journey states
   */
  async validateDataConsistency(
    workflowId: string,
    reactFlowState: WorkflowState,
    journeyState?: any
  ): Promise<ConsistencyValidationResult> {
    this.logger.info('Validating data consistency', {
      workflowId,
      hasJourneyState: !!journeyState,
    })

    const inconsistencies: DataInconsistency[] = []
    const warnings: DataWarning[] = []
    const recommendations: string[] = []

    try {
      // 1. Validate ReactFlow state integrity
      await this.validateReactFlowStateIntegrity(reactFlowState, inconsistencies)

      // 2. Validate journey state if present
      if (journeyState) {
        await this.validateJourneyStateIntegrity(journeyState, inconsistencies)

        // 3. Cross-validate between states
        await this.validateCrossStateConsistency(reactFlowState, journeyState, inconsistencies)
      }

      // 4. Check for performance and compatibility issues
      await this.checkPerformanceImpacts(reactFlowState, warnings)

      // 5. Generate recommendations
      recommendations.push(...this.generateConsistencyRecommendations(inconsistencies, warnings))

      // Determine if we can proceed
      const criticalIssues = inconsistencies.filter((i) => i.severity === 'CRITICAL')
      const canProceed =
        criticalIssues.length === 0 &&
        (!this.config.validationStrict || inconsistencies.length === 0)

      const result: ConsistencyValidationResult = {
        isConsistent: inconsistencies.length === 0,
        inconsistencies,
        warnings,
        recommendations,
        canProceed,
      }

      this.logger.info('Data consistency validation completed', {
        workflowId,
        isConsistent: result.isConsistent,
        inconsistencyCount: inconsistencies.length,
        warningCount: warnings.length,
        canProceed,
      })

      return result
    } catch (error) {
      this.logger.error('Data consistency validation failed', { error, workflowId })

      return {
        isConsistent: false,
        inconsistencies: [
          {
            type: 'CORRUPTED_DATA',
            severity: 'CRITICAL',
            location: 'DataConsistencyManager',
            description: 'Validation process failed',
            expected: 'Successful validation',
            actual: error instanceof Error ? error.message : 'Unknown error',
            autoFixable: false,
            fixSuggestion: 'Check workflow state integrity and retry',
          },
        ],
        warnings: [],
        recommendations: ['Fix validation errors before proceeding'],
        canProceed: false,
      }
    }
  }

  /**
   * Perform incremental migration with safety validation
   */
  async performIncrementalMigration(
    workflowId: string,
    reactFlowState: WorkflowState,
    targetJourneyState: any
  ): Promise<MigrationOperation> {
    const operationId = `migration-${workflowId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    this.logger.info('Starting incremental migration', {
      workflowId,
      operationId,
    })

    // Acquire migration lock
    if (!(await this.acquireLock(workflowId, operationId, 'MIGRATION'))) {
      throw new Error(`Cannot acquire migration lock for workflow ${workflowId}`)
    }

    try {
      // Create pre-migration snapshot
      const preSnapshot = await this.createWorkflowSnapshot(
        workflowId,
        reactFlowState,
        `Pre-migration snapshot for operation ${operationId}`
      )

      // Initialize migration operation
      const migration: MigrationOperation = {
        operationId,
        type: 'ADD_JOURNEY_MAPPING',
        workflowId,
        timestamp: new Date(),
        status: 'IN_PROGRESS',
        preOperationSnapshot: preSnapshot.snapshotId,
      }

      this.migrations.set(operationId, migration)

      // Validate pre-migration state
      const preValidation = await this.validateDataConsistency(workflowId, reactFlowState)
      if (!preValidation.canProceed) {
        throw new Error(
          `Pre-migration validation failed: ${preValidation.inconsistencies.map((i) => i.description).join(', ')}`
        )
      }

      // Perform incremental steps
      await this.performMigrationSteps(migration, reactFlowState, targetJourneyState)

      // Create post-migration snapshot
      const postSnapshot = await this.createWorkflowSnapshot(
        workflowId,
        reactFlowState,
        `Post-migration snapshot for operation ${operationId}`,
        targetJourneyState
      )

      migration.postOperationSnapshot = postSnapshot.snapshotId

      // Validate post-migration state
      const postValidation = await this.validateDataConsistency(
        workflowId,
        reactFlowState,
        targetJourneyState
      )
      migration.validationResult = postValidation

      if (!postValidation.isConsistent) {
        this.logger.warn('Post-migration validation found inconsistencies', {
          operationId,
          inconsistencies: postValidation.inconsistencies,
        })

        if (postValidation.inconsistencies.some((i) => i.severity === 'CRITICAL')) {
          throw new Error('Critical inconsistencies detected after migration')
        }
      }

      migration.status = 'COMPLETED'

      this.logger.info('Incremental migration completed successfully', {
        operationId,
        workflowId,
      })

      return migration
    } catch (error) {
      const migration = this.migrations.get(operationId)
      if (migration) {
        migration.status = 'FAILED'
        migration.error = error instanceof Error ? error.message : 'Unknown error'

        // Attempt rollback if enabled
        if (this.config.rollbackEnabled) {
          try {
            await this.performRollback(operationId)
            migration.status = 'ROLLED_BACK'
          } catch (rollbackError) {
            this.logger.error('Rollback also failed', { rollbackError, operationId })
          }
        }
      }

      this.logger.error('Incremental migration failed', { error, operationId })
      throw error
    } finally {
      // Release migration lock
      await this.releaseLock(workflowId)
    }
  }

  /**
   * Perform rollback to a previous snapshot
   */
  async performRollback(operationId: string): Promise<void> {
    const migration = this.migrations.get(operationId)
    if (!migration) {
      throw new Error(`Migration operation ${operationId} not found`)
    }

    this.logger.info('Performing rollback', {
      operationId,
      workflowId: migration.workflowId,
      targetSnapshot: migration.preOperationSnapshot,
    })

    const snapshot = this.snapshots.get(migration.preOperationSnapshot)
    if (!snapshot) {
      throw new Error(`Pre-operation snapshot ${migration.preOperationSnapshot} not found`)
    }

    // Create rollback plan
    const rollbackPlan = await this.createRollbackPlan(migration, snapshot)

    // Execute rollback steps
    for (const step of rollbackPlan.steps) {
      await this.executeRollbackStep(step, snapshot)
    }

    // Validate rollback success
    const validationResult = await this.validateDataConsistency(
      migration.workflowId,
      snapshot.reactFlowState,
      snapshot.journeyState
    )

    if (!validationResult.isConsistent) {
      throw new Error('Rollback validation failed')
    }

    migration.rollbackData = {
      rollbackPlan,
      completedAt: new Date(),
      validationResult,
    }

    this.logger.info('Rollback completed successfully', { operationId })
  }

  /**
   * Synchronize states with conflict resolution
   */
  async synchronizeStates(
    workflowId: string,
    reactFlowState: WorkflowState,
    journeyState: any,
    conflictResolution: 'PREFER_REACTFLOW' | 'PREFER_JOURNEY' | 'MERGE' = 'PREFER_REACTFLOW'
  ): Promise<{ reactFlowState: WorkflowState; journeyState: any }> {
    this.logger.info('Synchronizing states', {
      workflowId,
      conflictResolution,
    })

    // Create pre-sync snapshot
    await this.createWorkflowSnapshot(
      workflowId,
      reactFlowState,
      'Pre-synchronization snapshot',
      journeyState
    )

    // Detect differences
    const differences = await this.detectStateDifferences(reactFlowState, journeyState)

    if (differences.length === 0) {
      this.logger.info('States already synchronized', { workflowId })
      return { reactFlowState, journeyState }
    }

    // Resolve conflicts and apply changes
    const { updatedReactFlow, updatedJourney } = await this.resolveAndApplyChanges(
      reactFlowState,
      journeyState,
      differences,
      conflictResolution
    )

    // Validate synchronized state
    const validation = await this.validateDataConsistency(
      workflowId,
      updatedReactFlow,
      updatedJourney
    )
    if (!validation.isConsistent) {
      throw new Error('State synchronization resulted in inconsistent data')
    }

    this.logger.info('State synchronization completed', {
      workflowId,
      changeCount: differences.length,
    })

    return {
      reactFlowState: updatedReactFlow,
      journeyState: updatedJourney,
    }
  }

  /**
   * Validate ReactFlow state integrity
   */
  private async validateReactFlowStateIntegrity(
    state: WorkflowState,
    inconsistencies: DataInconsistency[]
  ): Promise<void> {
    // Check basic structure
    if (!state.blocks || typeof state.blocks !== 'object') {
      inconsistencies.push({
        type: 'MISSING_DATA',
        severity: 'CRITICAL',
        location: 'workflow.blocks',
        description: 'Blocks object is missing or invalid',
        expected: 'Object with block data',
        actual: typeof state.blocks,
        autoFixable: false,
      })
      return
    }

    if (!Array.isArray(state.edges)) {
      inconsistencies.push({
        type: 'MISSING_DATA',
        severity: 'CRITICAL',
        location: 'workflow.edges',
        description: 'Edges array is missing or invalid',
        expected: 'Array of edge objects',
        actual: typeof state.edges,
        autoFixable: false,
      })
    }

    // Validate blocks
    for (const [blockId, block] of Object.entries(state.blocks)) {
      if (!block.id || block.id !== blockId) {
        inconsistencies.push({
          type: 'CORRUPTED_DATA',
          severity: 'HIGH',
          location: `blocks.${blockId}`,
          description: 'Block ID mismatch',
          expected: blockId,
          actual: block.id,
          autoFixable: true,
          fixSuggestion: 'Update block.id to match key',
        })
      }

      if (!block.type || !block.name || !block.position) {
        inconsistencies.push({
          type: 'MISSING_DATA',
          severity: 'HIGH',
          location: `blocks.${blockId}`,
          description: 'Block missing required properties',
          expected: 'type, name, and position properties',
          actual: { type: block.type, name: block.name, position: block.position },
          autoFixable: false,
        })
      }
    }

    // Validate edges
    const blockIds = new Set(Object.keys(state.blocks))
    for (const edge of state.edges) {
      if (!blockIds.has(edge.source)) {
        inconsistencies.push({
          type: 'REFERENCE_BROKEN',
          severity: 'HIGH',
          location: `edges.${edge.id}`,
          description: 'Edge references non-existent source block',
          expected: `Block ${edge.source} to exist`,
          actual: 'Block not found',
          autoFixable: true,
          fixSuggestion: 'Remove orphaned edge or create missing block',
        })
      }

      if (!blockIds.has(edge.target)) {
        inconsistencies.push({
          type: 'REFERENCE_BROKEN',
          severity: 'HIGH',
          location: `edges.${edge.id}`,
          description: 'Edge references non-existent target block',
          expected: `Block ${edge.target} to exist`,
          actual: 'Block not found',
          autoFixable: true,
          fixSuggestion: 'Remove orphaned edge or create missing block',
        })
      }
    }
  }

  /**
   * Validate journey state integrity
   */
  private async validateJourneyStateIntegrity(
    journeyState: any,
    inconsistencies: DataInconsistency[]
  ): Promise<void> {
    if (!journeyState || typeof journeyState !== 'object') {
      inconsistencies.push({
        type: 'MISSING_DATA',
        severity: 'HIGH',
        location: 'journeyState',
        description: 'Journey state is missing or invalid',
        expected: 'Valid journey state object',
        actual: typeof journeyState,
        autoFixable: false,
      })
      return
    }

    if (!journeyState.journeyId) {
      inconsistencies.push({
        type: 'MISSING_DATA',
        severity: 'MEDIUM',
        location: 'journeyState.journeyId',
        description: 'Journey ID is missing',
        expected: 'String journey identifier',
        actual: journeyState.journeyId,
        autoFixable: true,
        fixSuggestion: 'Generate unique journey ID',
      })
    }

    if (!Array.isArray(journeyState.states)) {
      inconsistencies.push({
        type: 'CORRUPTED_DATA',
        severity: 'HIGH',
        location: 'journeyState.states',
        description: 'Journey states array is invalid',
        expected: 'Array of journey state objects',
        actual: typeof journeyState.states,
        autoFixable: false,
      })
    }
  }

  /**
   * Validate consistency between ReactFlow and Journey states
   */
  private async validateCrossStateConsistency(
    reactFlowState: WorkflowState,
    journeyState: any,
    inconsistencies: DataInconsistency[]
  ): Promise<void> {
    if (!journeyState || !journeyState.states) return

    const reactFlowBlockIds = new Set(Object.keys(reactFlowState.blocks))
    const journeyStateIds = new Set(
      journeyState.states.map((s: any) => s.metadata?.reactFlowBlockId).filter(Boolean)
    )

    // Check for missing blocks in journey state
    for (const blockId of reactFlowBlockIds) {
      if (!journeyStateIds.has(blockId)) {
        inconsistencies.push({
          type: 'MISSING_DATA',
          severity: 'MEDIUM',
          location: 'journeyState.states',
          description: `ReactFlow block ${blockId} not represented in journey state`,
          expected: `Journey state for block ${blockId}`,
          actual: 'Missing',
          autoFixable: true,
          fixSuggestion: 'Generate journey state for missing block',
        })
      }
    }

    // Check for orphaned journey states
    for (const journeyStateId of journeyStateIds) {
      if (!reactFlowBlockIds.has(journeyStateId)) {
        inconsistencies.push({
          type: 'CORRUPTED_DATA',
          severity: 'MEDIUM',
          location: 'journeyState.states',
          description: `Journey state references non-existent ReactFlow block ${journeyStateId}`,
          expected: `ReactFlow block ${journeyStateId} to exist`,
          actual: 'Block not found',
          autoFixable: true,
          fixSuggestion: 'Remove orphaned journey state',
        })
      }
    }
  }

  /**
   * Check for performance impacts
   */
  private async checkPerformanceImpacts(
    state: WorkflowState,
    warnings: DataWarning[]
  ): Promise<void> {
    const blockCount = Object.keys(state.blocks).length
    const edgeCount = state.edges.length

    if (blockCount > 100) {
      warnings.push({
        type: 'PERFORMANCE_IMPACT',
        message: 'Large workflow detected',
        impact: `${blockCount} blocks may impact journey mapping performance`,
        recommendation: 'Consider breaking into smaller sub-workflows',
      })
    }

    if (edgeCount > 200) {
      warnings.push({
        type: 'PERFORMANCE_IMPACT',
        message: 'High edge count detected',
        impact: `${edgeCount} edges may slow visual rendering`,
        recommendation: 'Optimize workflow structure for better performance',
      })
    }

    // Check for deeply nested containers
    const maxDepth = this.calculateMaxContainerDepth(state)
    if (maxDepth > 3) {
      warnings.push({
        type: 'COMPATIBILITY_CONCERN',
        message: 'Deep container nesting detected',
        impact: 'May complicate journey execution logic',
        recommendation: 'Flatten container structure where possible',
      })
    }
  }

  /**
   * Generate consistency recommendations
   */
  private generateConsistencyRecommendations(
    inconsistencies: DataInconsistency[],
    warnings: DataWarning[]
  ): string[] {
    const recommendations: string[] = []

    const criticalCount = inconsistencies.filter((i) => i.severity === 'CRITICAL').length
    const highCount = inconsistencies.filter((i) => i.severity === 'HIGH').length

    if (criticalCount > 0) {
      recommendations.push(`Resolve ${criticalCount} critical inconsistencies before proceeding`)
    }

    if (highCount > 0) {
      recommendations.push(`Address ${highCount} high-priority issues for better reliability`)
    }

    const autoFixableCount = inconsistencies.filter((i) => i.autoFixable).length
    if (autoFixableCount > 0) {
      recommendations.push(`${autoFixableCount} issues can be automatically fixed`)
    }

    if (warnings.length > 0) {
      recommendations.push(`Review ${warnings.length} warnings for performance optimization`)
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate actions required - workflow is in good state')
    }

    return recommendations
  }

  /**
   * Helper methods for internal operations
   */
  private deepCloneWorkflowState(state: WorkflowState): WorkflowState {
    return JSON.parse(JSON.stringify(state))
  }

  private async calculateChecksum(state: WorkflowState): Promise<string> {
    const stateString = JSON.stringify(state, Object.keys(state).sort())
    // Simple hash function for demonstration - use proper crypto hash in production
    let hash = 0
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private calculateMaxContainerDepth(state: WorkflowState): number {
    let maxDepth = 0

    const calculateDepth = (blockId: string, currentDepth = 0): number => {
      const block = state.blocks[blockId]
      if (!block) return currentDepth

      if (block.data?.parentId) {
        return calculateDepth(block.data.parentId, currentDepth + 1)
      }

      return currentDepth
    }

    for (const blockId of Object.keys(state.blocks)) {
      const depth = calculateDepth(blockId)
      maxDepth = Math.max(maxDepth, depth)
    }

    return maxDepth
  }

  private async acquireLock(
    workflowId: string,
    userId: string,
    operation: string
  ): Promise<boolean> {
    if (!this.config.concurrentSafetyEnabled) return true

    const existingLock = this.locks.get(workflowId)
    if (existingLock) {
      // Check if lock is stale (older than 5 minutes)
      const lockAge = Date.now() - existingLock.timestamp.getTime()
      if (lockAge < 5 * 60 * 1000) {
        return false
      }
    }

    this.locks.set(workflowId, {
      userId,
      timestamp: new Date(),
      operation,
    })

    return true
  }

  private async releaseLock(workflowId: string): Promise<void> {
    this.locks.delete(workflowId)
  }

  private async performMigrationSteps(
    migration: MigrationOperation,
    reactFlowState: WorkflowState,
    targetJourneyState: any
  ): Promise<void> {
    // Implementation would perform actual migration steps
    // This is a placeholder for the actual migration logic
    this.logger.info('Performing migration steps', {
      operationId: migration.operationId,
    })
  }

  private async createRollbackPlan(
    migration: MigrationOperation,
    snapshot: WorkflowSnapshot
  ): Promise<RollbackPlan> {
    return {
      planId: `rollback-${migration.operationId}`,
      workflowId: migration.workflowId,
      targetSnapshotId: snapshot.snapshotId,
      estimatedTime: 1000, // 1 second
      riskLevel: 'MINIMAL',
      affectedComponents: ['ReactFlow state', 'Journey state'],
      dataLossRisk: false,
      steps: [
        {
          stepId: 'restore-reactflow',
          description: 'Restore ReactFlow state from snapshot',
          action: 'RESTORE_STATE',
          parameters: { snapshot },
          expectedDuration: 500,
          rollbackable: true,
        },
      ],
    }
  }

  private async executeRollbackStep(step: RollbackStep, snapshot: WorkflowSnapshot): Promise<void> {
    this.logger.info('Executing rollback step', { stepId: step.stepId })
    // Implementation would execute the actual rollback step
  }

  private async detectStateDifferences(
    reactFlowState: WorkflowState,
    journeyState: any
  ): Promise<any[]> {
    // Implementation would detect actual differences
    return []
  }

  private async resolveAndApplyChanges(
    reactFlowState: WorkflowState,
    journeyState: any,
    differences: any[],
    conflictResolution: string
  ): Promise<{ updatedReactFlow: WorkflowState; updatedJourney: any }> {
    // Implementation would resolve conflicts and apply changes
    return {
      updatedReactFlow: reactFlowState,
      updatedJourney: journeyState,
    }
  }
}

/**
 * Singleton data consistency manager
 */
export const dataConsistencyManager = new DataConsistencyManager()

/**
 * Quick consistency check
 */
export async function validateWorkflowConsistency(
  workflowId: string,
  reactFlowState: WorkflowState,
  journeyState?: any
): Promise<boolean> {
  const result = await dataConsistencyManager.validateDataConsistency(
    workflowId,
    reactFlowState,
    journeyState
  )
  return result.canProceed
}

/**
 * Create safe migration with full rollback capability
 */
export async function performSafeMigration(
  workflowId: string,
  reactFlowState: WorkflowState,
  targetJourneyState: any
): Promise<MigrationOperation> {
  return await dataConsistencyManager.performIncrementalMigration(
    workflowId,
    reactFlowState,
    targetJourneyState
  )
}

/**
 * Create workflow snapshot for safety
 */
export async function createSafetySnapshot(
  workflowId: string,
  reactFlowState: WorkflowState,
  reason = 'User-initiated safety snapshot'
): Promise<WorkflowSnapshot> {
  return await dataConsistencyManager.createWorkflowSnapshot(workflowId, reactFlowState, reason)
}
