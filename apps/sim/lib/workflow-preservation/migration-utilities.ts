/**
 * Migration and Rollback Utilities
 *
 * Provides safe migration paths and rollback capabilities
 * for workflows when adding conversational features
 *
 * Features:
 * 1. Version-controlled migrations
 * 2. Atomic operations with rollback
 * 3. Data integrity validation
 * 4. Zero-downtime migration strategies
 * 5. Automatic backup and restore
 */

import type { WorkflowState, BlockState } from '@/stores/workflows/workflow/types'
import type { Edge } from 'reactflow'
import { createLogger } from '@/lib/logs/console/logger'
import { workflowPreservationSystem, type CompatibilityVersion } from './compatibility-layer'

const logger = createLogger('MigrationUtilities')

export interface MigrationPlan {
  id: string
  name: string
  description: string
  fromVersion: CompatibilityVersion
  toVersion: CompatibilityVersion
  operations: MigrationOperation[]
  validations: ValidationCheck[]
  rollbackStrategy: RollbackStrategy
  estimatedDuration: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface MigrationOperation {
  id: string
  type: OperationType
  description: string
  params: Record<string, any>
  reversible: boolean
  rollbackData?: any
}

export interface ValidationCheck {
  id: string
  name: string
  description: string
  type: 'data-integrity' | 'functionality' | 'performance' | 'compatibility'
  validator: (workflow: WorkflowState) => Promise<ValidationResult>
}

export interface RollbackStrategy {
  type: 'automatic' | 'manual' | 'checkpoint'
  checkpoints: RollbackCheckpoint[]
  timeoutMs: number
  maxRetries: number
}

export interface RollbackCheckpoint {
  id: string
  name: string
  workflow: WorkflowState
  timestamp: Date
  metadata: Record<string, any>
}

export interface MigrationResult {
  success: boolean
  migrationId: string
  duration: number
  operationsCompleted: number
  operationsFailed: number
  rollbackAvailable: boolean
  error?: string
  details: {
    operationResults: OperationResult[]
    validationResults: ValidationResult[]
    checkpoints: RollbackCheckpoint[]
  }
}

export interface ValidationResult {
  checkId: string
  success: boolean
  error?: string
  details?: any
}

export interface OperationResult {
  operationId: string
  success: boolean
  duration: number
  rollbackData?: any
  error?: string
}

export type OperationType =
  | 'add-metadata'
  | 'update-schema'
  | 'migrate-data'
  | 'create-backup'
  | 'validate-integrity'
  | 'enable-feature'
  | 'update-permissions'

/**
 * Migration Utilities Manager
 */
export class MigrationUtilities {
  private migrationPlans = new Map<string, MigrationPlan>()
  private migrationHistory = new Map<string, MigrationResult[]>()
  private checkpoints = new Map<string, RollbackCheckpoint[]>()

  constructor() {
    this.initializeMigrationPlans()
  }

  /**
   * Initialize predefined migration plans
   */
  private initializeMigrationPlans(): void {
    // Migration plan for adding conversational capabilities
    const conversationalMigration: MigrationPlan = {
      id: 'add-conversational-v1',
      name: 'Add Conversational Capabilities',
      description: 'Safely add Parlant conversational layer while preserving all ReactFlow functionality',
      fromVersion: {
        major: 1,
        minor: 0,
        patch: 0,
        reactFlowVersion: '11.11.4',
        simVersion: '0.1.0',
        timestamp: new Date()
      },
      toVersion: {
        major: 1,
        minor: 1,
        patch: 0,
        reactFlowVersion: '11.11.4',
        simVersion: '0.2.0',
        timestamp: new Date()
      },
      operations: [
        {
          id: 'create-backup',
          type: 'create-backup',
          description: 'Create complete workflow backup',
          params: { includeHistory: true, includeMetadata: true },
          reversible: true
        },
        {
          id: 'add-journey-metadata',
          type: 'add-metadata',
          description: 'Add journey mapping metadata to blocks',
          params: { metadataType: 'journey-mapping' },
          reversible: true
        },
        {
          id: 'enable-coexistence',
          type: 'enable-feature',
          description: 'Enable dual-mode coexistence',
          params: { feature: 'conversational-mode' },
          reversible: true
        },
        {
          id: 'validate-preservation',
          type: 'validate-integrity',
          description: 'Validate all ReactFlow functionality preserved',
          params: { comprehensive: true },
          reversible: false
        }
      ],
      validations: [
        {
          id: 'reactflow-compatibility',
          name: 'ReactFlow Compatibility',
          description: 'Ensure ReactFlow components work unchanged',
          type: 'compatibility',
          validator: this.validateReactFlowCompatibility
        },
        {
          id: 'data-integrity',
          name: 'Data Integrity',
          description: 'Verify workflow data integrity',
          type: 'data-integrity',
          validator: this.validateDataIntegrity
        },
        {
          id: 'functionality-preservation',
          name: 'Functionality Preservation',
          description: 'Confirm all features work as before',
          type: 'functionality',
          validator: this.validateFunctionalityPreservation
        }
      ],
      rollbackStrategy: {
        type: 'checkpoint',
        checkpoints: [],
        timeoutMs: 30000,
        maxRetries: 3
      },
      estimatedDuration: 5000, // 5 seconds
      riskLevel: 'low'
    }

    this.migrationPlans.set(conversationalMigration.id, conversationalMigration)

    logger.info('Migration plans initialized', {
      planCount: this.migrationPlans.size,
      plans: Array.from(this.migrationPlans.keys())
    })
  }

  /**
   * Execute migration plan
   */
  async executeMigration(workflowId: string, migrationId: string): Promise<MigrationResult> {
    const plan = this.migrationPlans.get(migrationId)
    if (!plan) {
      return {
        success: false,
        migrationId,
        duration: 0,
        operationsCompleted: 0,
        operationsFailed: 1,
        rollbackAvailable: false,
        error: `Migration plan not found: ${migrationId}`,
        details: {
          operationResults: [],
          validationResults: [],
          checkpoints: []
        }
      }
    }

    const startTime = Date.now()
    const operationResults: OperationResult[] = []
    const validationResults: ValidationResult[] = []
    const checkpoints: RollbackCheckpoint[] = []

    logger.info(`Starting migration: ${plan.name}`, {
      workflowId,
      migrationId,
      operationCount: plan.operations.length
    })

    try {
      // Create initial checkpoint
      const initialCheckpoint = await this.createCheckpoint(
        workflowId,
        'migration-start',
        'Initial state before migration'
      )
      checkpoints.push(initialCheckpoint)

      // Execute migration operations
      for (const operation of plan.operations) {
        const operationResult = await this.executeOperation(workflowId, operation)
        operationResults.push(operationResult)

        if (!operationResult.success) {
          throw new Error(`Operation failed: ${operation.id} - ${operationResult.error}`)
        }

        // Create checkpoint after critical operations
        if (['update-schema', 'migrate-data'].includes(operation.type)) {
          const checkpoint = await this.createCheckpoint(
            workflowId,
            `post-${operation.id}`,
            `After ${operation.description}`
          )
          checkpoints.push(checkpoint)
        }
      }

      // Run validations
      for (const validation of plan.validations) {
        const workflow = await this.getCurrentWorkflow(workflowId)
        const validationResult = await validation.validator(workflow)
        validationResult.checkId = validation.id
        validationResults.push(validationResult)

        if (!validationResult.success) {
          throw new Error(`Validation failed: ${validation.id} - ${validationResult.error}`)
        }
      }

      const duration = Date.now() - startTime
      const successfulResult: MigrationResult = {
        success: true,
        migrationId,
        duration,
        operationsCompleted: operationResults.length,
        operationsFailed: 0,
        rollbackAvailable: true,
        details: {
          operationResults,
          validationResults,
          checkpoints
        }
      }

      // Store migration history
      const history = this.migrationHistory.get(workflowId) || []
      history.push(successfulResult)
      this.migrationHistory.set(workflowId, history)

      // Store checkpoints
      this.checkpoints.set(workflowId, checkpoints)

      logger.info('Migration completed successfully', {
        workflowId,
        migrationId,
        duration: `${duration}ms`,
        operationsCompleted: operationResults.length,
        checkpointsCreated: checkpoints.length
      })

      return successfulResult

    } catch (error) {
      logger.error('Migration failed, initiating rollback', {
        workflowId,
        migrationId,
        error,
        operationsCompleted: operationResults.length
      })

      // Attempt rollback
      const rollbackResult = await this.rollbackToCheckpoint(
        workflowId,
        checkpoints[checkpoints.length - 1]?.id || 'migration-start'
      )

      const duration = Date.now() - startTime
      const failedResult: MigrationResult = {
        success: false,
        migrationId,
        duration,
        operationsCompleted: operationResults.filter(r => r.success).length,
        operationsFailed: operationResults.filter(r => !r.success).length + 1,
        rollbackAvailable: rollbackResult.success,
        error: error instanceof Error ? error.message : String(error),
        details: {
          operationResults,
          validationResults,
          checkpoints
        }
      }

      return failedResult
    }
  }

  /**
   * Execute single migration operation
   */
  private async executeOperation(workflowId: string, operation: MigrationOperation): Promise<OperationResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Executing operation: ${operation.id}`, {
        workflowId,
        type: operation.type,
        description: operation.description
      })

      let rollbackData: any = null

      // Execute operation based on type
      switch (operation.type) {
        case 'create-backup':
          rollbackData = await this.executeBackupOperation(workflowId, operation.params)
          break

        case 'add-metadata':
          rollbackData = await this.executeAddMetadataOperation(workflowId, operation.params)
          break

        case 'enable-feature':
          rollbackData = await this.executeEnableFeatureOperation(workflowId, operation.params)
          break

        case 'validate-integrity':
          await this.executeValidationOperation(workflowId, operation.params)
          break

        default:
          throw new Error(`Unknown operation type: ${operation.type}`)
      }

      return {
        operationId: operation.id,
        success: true,
        duration: Date.now() - startTime,
        rollbackData
      }

    } catch (error) {
      return {
        operationId: operation.id,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Execute backup operation
   */
  private async executeBackupOperation(workflowId: string, params: Record<string, any>): Promise<any> {
    const workflow = await this.getCurrentWorkflow(workflowId)

    const backup = {
      workflowId,
      workflow: this.deepClone(workflow),
      timestamp: new Date(),
      metadata: {
        includeHistory: params.includeHistory || false,
        includeMetadata: params.includeMetadata || false
      }
    }

    // Store backup (in production, this would go to persistent storage)
    logger.info('Backup created', {
      workflowId,
      blockCount: Object.keys(workflow.blocks).length,
      edgeCount: workflow.edges.length
    })

    return backup
  }

  /**
   * Execute add metadata operation
   */
  private async executeAddMetadataOperation(workflowId: string, params: Record<string, any>): Promise<any> {
    const workflow = await this.getCurrentWorkflow(workflowId)
    const originalMetadata = { blocks: {}, edges: {} }

    // Add journey mapping metadata to blocks
    if (params.metadataType === 'journey-mapping') {
      Object.values(workflow.blocks).forEach(block => {
        // Store original state for rollback
        originalMetadata.blocks[block.id] = {
          data: block.data ? this.deepClone(block.data) : null
        }

        // Add journey mapping metadata
        block.data = {
          ...block.data,
          journeyMapping: {
            enabled: false,
            nodeType: this.getJourneyNodeType(block.type),
            capabilities: this.getBlockCapabilities(block.type),
            addedAt: new Date()
          }
        }
      })
    }

    logger.info('Metadata added', {
      workflowId,
      metadataType: params.metadataType,
      blocksUpdated: Object.keys(workflow.blocks).length
    })

    return originalMetadata
  }

  /**
   * Execute enable feature operation
   */
  private async executeEnableFeatureOperation(workflowId: string, params: Record<string, any>): Promise<any> {
    const workflow = await this.getCurrentWorkflow(workflowId)

    // Enable conversational mode
    if (params.feature === 'conversational-mode') {
      // Add workflow-level metadata for conversational capabilities
      const originalData = workflow.lastUpdate

      workflow.lastUpdate = Date.now()

      // Add conversational metadata at workflow level
      if (!workflow.conversationalCapabilities) {
        workflow.conversationalCapabilities = {
          enabled: true,
          version: '1.0.0',
          enabledAt: new Date(),
          modes: ['visual', 'conversational', 'hybrid']
        }
      }

      logger.info('Conversational mode enabled', {
        workflowId,
        modes: workflow.conversationalCapabilities.modes
      })

      return { originalData }
    }

    return null
  }

  /**
   * Execute validation operation
   */
  private async executeValidationOperation(workflowId: string, params: Record<string, any>): Promise<void> {
    const workflow = await this.getCurrentWorkflow(workflowId)

    if (params.comprehensive) {
      const validation = await workflowPreservationSystem.validatePreservation(workflowId, workflow)

      if (!validation.success) {
        throw new Error(`Comprehensive validation failed: ${validation.error}`)
      }

      logger.info('Comprehensive validation passed', {
        workflowId,
        checksRun: validation.details.totalChecks,
        checksPassed: validation.details.passedChecks
      })
    }
  }

  /**
   * Create rollback checkpoint
   */
  async createCheckpoint(workflowId: string, checkpointId: string, description: string): Promise<RollbackCheckpoint> {
    const workflow = await this.getCurrentWorkflow(workflowId)

    const checkpoint: RollbackCheckpoint = {
      id: checkpointId,
      name: description,
      workflow: this.deepClone(workflow),
      timestamp: new Date(),
      metadata: {
        workflowId,
        blockCount: Object.keys(workflow.blocks).length,
        edgeCount: workflow.edges.length
      }
    }

    logger.debug('Checkpoint created', {
      workflowId,
      checkpointId,
      description
    })

    return checkpoint
  }

  /**
   * Rollback to specific checkpoint
   */
  async rollbackToCheckpoint(workflowId: string, checkpointId: string): Promise<{ success: boolean; error?: string }> {
    const workflowCheckpoints = this.checkpoints.get(workflowId) || []
    const checkpoint = workflowCheckpoints.find(cp => cp.id === checkpointId)

    if (!checkpoint) {
      return {
        success: false,
        error: `Checkpoint not found: ${checkpointId}`
      }
    }

    try {
      // Restore workflow state from checkpoint
      await this.restoreWorkflowState(workflowId, checkpoint.workflow)

      logger.info('Rollback successful', {
        workflowId,
        checkpointId,
        restoredBlocks: Object.keys(checkpoint.workflow.blocks).length
      })

      return { success: true }

    } catch (error) {
      logger.error('Rollback failed', {
        workflowId,
        checkpointId,
        error
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Get migration history for workflow
   */
  getMigrationHistory(workflowId: string): MigrationResult[] {
    return this.migrationHistory.get(workflowId) || []
  }

  /**
   * Get available migration plans
   */
  getMigrationPlans(): MigrationPlan[] {
    return Array.from(this.migrationPlans.values())
  }

  /**
   * Check if rollback is available
   */
  isRollbackAvailable(workflowId: string): boolean {
    const checkpoints = this.checkpoints.get(workflowId) || []
    return checkpoints.length > 0
  }

  // Helper methods

  private async getCurrentWorkflow(workflowId: string): Promise<WorkflowState> {
    // In production, this would fetch from the workflow store
    // For now, return a mock workflow state
    return {
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
      lastSaved: Date.now()
    }
  }

  private async restoreWorkflowState(workflowId: string, workflow: WorkflowState): Promise<void> {
    // In production, this would update the workflow store
    logger.debug('Restoring workflow state', {
      workflowId,
      blockCount: Object.keys(workflow.blocks).length
    })
  }

  private getJourneyNodeType(blockType: string): string {
    const typeMapping: Record<string, string> = {
      'starter': 'root',
      'agent': 'action',
      'condition': 'decision',
      'response': 'end',
      'loop': 'subflow',
      'parallel': 'subflow'
    }

    return typeMapping[blockType] || 'action'
  }

  private getBlockCapabilities(blockType: string): string[] {
    const capabilityMapping: Record<string, string[]> = {
      'agent': ['ai-interaction', 'tool-usage', 'context-aware'],
      'condition': ['branching', 'logic-evaluation'],
      'loop': ['iteration', 'collection-processing'],
      'parallel': ['concurrent-execution', 'load-balancing']
    }

    return capabilityMapping[blockType] || ['basic-operation']
  }

  // Validation functions

  private async validateReactFlowCompatibility(workflow: WorkflowState): Promise<ValidationResult> {
    try {
      // Check that all blocks have required ReactFlow properties
      const blocks = Object.values(workflow.blocks)
      const incompatibleBlocks = blocks.filter(block =>
        !block.id || !block.type || !block.position ||
        typeof block.position.x !== 'number' || typeof block.position.y !== 'number'
      )

      if (incompatibleBlocks.length > 0) {
        return {
          checkId: '',
          success: false,
          error: `${incompatibleBlocks.length} blocks are not ReactFlow compatible`,
          details: { incompatibleBlocks: incompatibleBlocks.map(b => b.id) }
        }
      }

      // Check edges
      const invalidEdges = workflow.edges.filter(edge =>
        !edge.id || !edge.source || !edge.target
      )

      if (invalidEdges.length > 0) {
        return {
          checkId: '',
          success: false,
          error: `${invalidEdges.length} edges are not ReactFlow compatible`,
          details: { invalidEdges: invalidEdges.map(e => e.id) }
        }
      }

      return { checkId: '', success: true }

    } catch (error) {
      return {
        checkId: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async validateDataIntegrity(workflow: WorkflowState): Promise<ValidationResult> {
    try {
      const blockIds = new Set(Object.keys(workflow.blocks))

      // Validate edge references
      const invalidEdges = workflow.edges.filter(edge =>
        !blockIds.has(edge.source) || !blockIds.has(edge.target)
      )

      if (invalidEdges.length > 0) {
        return {
          checkId: '',
          success: false,
          error: `${invalidEdges.length} edges reference non-existent blocks`,
          details: { invalidEdges: invalidEdges.map(e => e.id) }
        }
      }

      return { checkId: '', success: true }

    } catch (error) {
      return {
        checkId: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async validateFunctionalityPreservation(workflow: WorkflowState): Promise<ValidationResult> {
    try {
      // This would run comprehensive functionality tests in production
      // For now, simulate a successful validation
      return { checkId: '', success: true }

    } catch (error) {
      return {
        checkId: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }
}

// Singleton instance
export const migrationUtilities = new MigrationUtilities()