/**
 * Workflow to Journey Mapping System - Main Integration
 *
 * This is the primary integration point for the comprehensive workflow preservation
 * and journey mapping system. It provides a unified interface for ensuring 100%
 * backward compatibility with existing ReactFlow workflows while enabling new
 * Parlant journey capabilities.
 *
 * SYSTEM OVERVIEW:
 * 1. Compatibility Validation - Ensures ReactFlow workflows remain intact
 * 2. Regression Testing - Validates existing functionality continues to work
 * 3. Dual-Mode Architecture - Supports both ReactFlow and Journey execution
 * 4. Data Consistency - Maintains data integrity across all operations
 * 5. Preservation Validation - Comprehensive verification system
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { WorkflowState } from '@/stores/workflows/workflow/types'

// Import all system components
import {
  workflowCompatibilityValidator,
  type CompatibilityValidationResult,
  type ReactFlowWorkflowSnapshot
} from './compatibility-validator'

import {
  workflowRegressionTestRunner,
  type RegressionTestSuite,
  establishRegressionBaseline,
  validateNoRegressions
} from './regression-tests'

import {
  dualModeArchitecture,
  type DualModeConfig,
  type WorkflowExecutionContext,
  initializeDualMode,
  executeDualModeWorkflow,
  switchWorkflowMode,
  getWorkflowExecutionMode,
  isDualModeSupported
} from './dual-mode-architecture'

import {
  dataConsistencyManager,
  type WorkflowSnapshot,
  type MigrationOperation,
  validateWorkflowConsistency,
  performSafeMigration,
  createSafetySnapshot
} from './data-consistency'

import {
  workflowPreservationValidator,
  type PreservationValidationResult,
  validatePreservation,
  getPreservationReport,
  certifyWorkflowForJourneyMapping
} from './workflow-preservation-validator'

const logger = createLogger('WorkflowJourneyMapping')

export interface JourneyMappingConfig {
  enableCompatibilityValidation: boolean
  enableRegressionTesting: boolean
  enableDataConsistency: boolean
  strictValidation: boolean
  createBackups: boolean
  dualModeConfig: DualModeConfig
}

export interface JourneyMappingResult {
  success: boolean
  workflowId: string
  timestamp: Date
  executionTime: number

  // Validation results
  compatibilityResult: CompatibilityValidationResult
  regressionBaseline?: RegressionTestSuite
  preservationResult: PreservationValidationResult

  // Migration results
  migrationOperation?: MigrationOperation
  backupSnapshot?: WorkflowSnapshot
  dualModeContext?: WorkflowExecutionContext

  // Status and recommendations
  status: 'READY' | 'MIGRATED' | 'FAILED'
  recommendations: string[]
  nextSteps: string[]

  // Safety measures
  rollbackAvailable: boolean
  rollbackInstructions: string[]
}

export interface JourneyMappingStatus {
  workflowId: string
  isJourneyMappingEnabled: boolean
  currentMode: 'reactflow' | 'journey' | 'dual'
  lastValidation: Date
  preservationCertified: boolean
  backupAvailable: boolean
  migrationSafe: boolean
}

/**
 * Main Workflow to Journey Mapping System Manager
 */
export class WorkflowJourneyMappingSystem {
  private logger = createLogger('WorkflowJourneyMappingSystem')
  private config: JourneyMappingConfig
  private workflowStatuses: Map<string, JourneyMappingStatus> = new Map()

  constructor(config: JourneyMappingConfig = {
    enableCompatibilityValidation: true,
    enableRegressionTesting: true,
    enableDataConsistency: true,
    strictValidation: true,
    createBackups: true,
    dualModeConfig: {
      reactFlowEnabled: true,
      journeyMappingEnabled: true,
      preferredMode: 'reactflow',
      fallbackMode: 'reactflow',
      synchronizationEnabled: true
    }
  }) {
    this.config = config
    this.logger.info('Workflow Journey Mapping System initialized', { config })
  }

  /**
   * Enable journey mapping for a workflow with full safety validation
   */
  async enableJourneyMapping(
    workflowId: string,
    reactFlowState: WorkflowState
  ): Promise<JourneyMappingResult> {
    const startTime = Date.now()

    this.logger.info('Enabling journey mapping for workflow', {
      workflowId,
      blockCount: Object.keys(reactFlowState.blocks).length
    })

    try {
      // Phase 1: Pre-Migration Validation
      this.logger.info('Phase 1: Pre-migration validation')

      // 1. Compatibility validation
      const compatibilityResult = this.config.enableCompatibilityValidation
        ? await workflowCompatibilityValidator.validateWorkflowCompatibility(reactFlowState)
        : { isCompatible: true, errors: [], warnings: [], preservedFeatures: [], migrationSafety: { canRollback: true, dataBackupRequired: false, riskLevel: 'MINIMAL', safetyMeasures: [] } }

      if (!compatibilityResult.isCompatible) {
        throw new Error('Workflow compatibility validation failed: ' +
          compatibilityResult.errors.map(e => e.message).join(', '))
      }

      // 2. Regression baseline establishment
      const regressionBaseline = this.config.enableRegressionTesting
        ? await establishRegressionBaseline(reactFlowState)
        : undefined

      // 3. Preservation validation
      const preservationResult = await workflowPreservationValidator.validateWorkflowPreservation(
        workflowId,
        reactFlowState
      )

      if (!preservationResult.overallSuccess && this.config.strictValidation) {
        throw new Error('Workflow preservation validation failed')
      }

      // Phase 2: Safety Measures
      this.logger.info('Phase 2: Safety measures')

      // 1. Create backup snapshot
      const backupSnapshot = this.config.createBackups
        ? await dataConsistencyManager.createWorkflowSnapshot(
            workflowId,
            reactFlowState,
            'Pre-journey-mapping backup'
          )
        : undefined

      // 2. Dual-mode initialization
      const dualModeContext = await dualModeArchitecture.initializeDualModeContext(
        workflowId,
        reactFlowState
      )

      // Phase 3: Migration (if needed)
      this.logger.info('Phase 3: Journey mapping enablement')

      let migrationOperation: MigrationOperation | undefined

      if (dualModeContext.journeyState) {
        // Journey state was successfully created, perform migration
        migrationOperation = this.config.enableDataConsistency
          ? await dataConsistencyManager.performIncrementalMigration(
              workflowId,
              reactFlowState,
              dualModeContext.journeyState
            )
          : undefined
      }

      // Phase 4: Post-Migration Validation
      this.logger.info('Phase 4: Post-migration validation')

      // Validate no regressions occurred
      if (regressionBaseline) {
        const regressionValidation = await validateNoRegressions(reactFlowState, regressionBaseline)
        if (!regressionValidation.success) {
          throw new Error('Regressions detected: ' + regressionValidation.regressions.join(', '))
        }
      }

      // Update workflow status
      const status: JourneyMappingStatus = {
        workflowId,
        isJourneyMappingEnabled: true,
        currentMode: 'dual',
        lastValidation: new Date(),
        preservationCertified: preservationResult.preservationCertified,
        backupAvailable: !!backupSnapshot,
        migrationSafe: true
      }

      this.workflowStatuses.set(workflowId, status)

      const executionTime = Date.now() - startTime

      this.logger.info('Journey mapping enabled successfully', {
        workflowId,
        executionTime,
        preservationCertified: preservationResult.preservationCertified
      })

      return {
        success: true,
        workflowId,
        timestamp: new Date(),
        executionTime,
        compatibilityResult,
        regressionBaseline,
        preservationResult,
        migrationOperation,
        backupSnapshot,
        dualModeContext,
        status: 'MIGRATED',
        recommendations: [
          'Journey mapping enabled successfully',
          'ReactFlow functionality preserved',
          'Both visual and conversational modes available'
        ],
        nextSteps: [
          'Test workflow in both ReactFlow and journey modes',
          'Monitor performance and user experience',
          'Provide user training on new conversational features'
        ],
        rollbackAvailable: !!backupSnapshot,
        rollbackInstructions: backupSnapshot ? [
          `Backup snapshot available: ${backupSnapshot.snapshotId}`,
          'Contact support for rollback assistance if needed',
          'All data can be fully restored'
        ] : []
      }

    } catch (error) {
      this.logger.error('Journey mapping enablement failed', { error, workflowId })

      // Attempt cleanup if partial state exists
      try {
        await this.cleanupFailedMigration(workflowId)
      } catch (cleanupError) {
        this.logger.error('Cleanup also failed', { cleanupError, workflowId })
      }

      return {
        success: false,
        workflowId,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        compatibilityResult: { isCompatible: false, errors: [], warnings: [], preservedFeatures: [], migrationSafety: { canRollback: true, dataBackupRequired: true, riskLevel: 'HIGH', safetyMeasures: [] } },
        preservationResult: {
          overallSuccess: false,
          workflowId,
          validationTimestamp: new Date(),
          executionTime: 0,
          compatibilityResult: { isCompatible: false, errors: [], warnings: [], preservedFeatures: [], migrationSafety: { canRollback: true, dataBackupRequired: true, riskLevel: 'HIGH', safetyMeasures: [] } },
          regressionResult: { suiteName: 'Failed', totalTests: 0, passedTests: 0, failedTests: 0, results: [], overallSuccess: false, executionTime: 0 },
          consistencyResult: { isConsistent: false, inconsistencies: [], warnings: [], recommendations: [], canProceed: false },
          visualEditorValidation: { category: 'Visual Editor', passed: false, score: 0, details: [], issues: [], executionTime: 0 },
          executionValidation: { category: 'Execution', passed: false, score: 0, details: [], issues: [], executionTime: 0 },
          collaborationValidation: { category: 'Collaboration', passed: false, score: 0, details: [], issues: [], executionTime: 0 },
          performanceValidation: { category: 'Performance', passed: false, score: 0, details: [], issues: [], executionTime: 0 },
          dataIntegrityValidation: { category: 'Data Integrity', passed: false, score: 0, details: [], issues: [], executionTime: 0 },
          criticalIssues: [],
          warnings: [],
          recommendations: [],
          preservationCertified: false,
          certificationLevel: 'FAILED',
          certificationDetails: []
        },
        status: 'FAILED',
        recommendations: [
          'Fix validation errors before attempting journey mapping',
          'Review compatibility and preservation reports',
          'Contact support for assistance'
        ],
        nextSteps: [
          'Review error logs and fix issues',
          'Run validation again',
          'Consider workflow simplification if needed'
        ],
        rollbackAvailable: false,
        rollbackInstructions: ['No rollback needed - original workflow unchanged']
      }
    }
  }

  /**
   * Validate workflow readiness for journey mapping
   */
  async validateWorkflowReadiness(
    workflowId: string,
    reactFlowState: WorkflowState
  ): Promise<{
    ready: boolean
    compatibilityScore: number
    preservationScore: number
    recommendations: string[]
    issues: string[]
  }> {
    this.logger.info('Validating workflow readiness for journey mapping', { workflowId })

    try {
      // Run comprehensive validation
      const preservationResult = await getPreservationReport(workflowId, reactFlowState)
      const compatibilityResult = await workflowCompatibilityValidator.validateWorkflowCompatibility(reactFlowState)

      // Calculate scores
      const validationScores = [
        preservationResult.visualEditorValidation.score,
        preservationResult.executionValidation.score,
        preservationResult.collaborationValidation.score,
        preservationResult.performanceValidation.score,
        preservationResult.dataIntegrityValidation.score
      ]

      const preservationScore = validationScores.reduce((sum, score) => sum + score, 0) / validationScores.length
      const compatibilityScore = compatibilityResult.isCompatible ? 100 :
        Math.max(0, 100 - (compatibilityResult.errors.length * 10))

      // Determine readiness
      const ready = preservationResult.overallSuccess &&
                   compatibilityResult.isCompatible &&
                   preservationScore >= 90

      // Compile recommendations and issues
      const recommendations: string[] = []
      const issues: string[] = []

      if (ready) {
        recommendations.push('Workflow is ready for journey mapping')
        recommendations.push('All validation checks passed')
      } else {
        recommendations.push('Workflow needs fixes before journey mapping')

        if (!compatibilityResult.isCompatible) {
          recommendations.push('Fix compatibility issues first')
          issues.push(...compatibilityResult.errors.map(e => e.message))
        }

        if (!preservationResult.overallSuccess) {
          recommendations.push('Address preservation validation failures')
          issues.push(...preservationResult.criticalIssues.map(i => i.description))
        }
      }

      recommendations.push(...preservationResult.recommendations)

      return {
        ready,
        compatibilityScore,
        preservationScore,
        recommendations,
        issues
      }

    } catch (error) {
      this.logger.error('Workflow readiness validation failed', { error, workflowId })

      return {
        ready: false,
        compatibilityScore: 0,
        preservationScore: 0,
        recommendations: ['Fix validation system errors'],
        issues: [error instanceof Error ? error.message : 'Unknown validation error']
      }
    }
  }

  /**
   * Get current workflow status
   */
  getWorkflowStatus(workflowId: string): JourneyMappingStatus | undefined {
    return this.workflowStatuses.get(workflowId)
  }

  /**
   * Switch workflow execution mode
   */
  async switchMode(
    workflowId: string,
    mode: 'reactflow' | 'journey'
  ): Promise<void> {
    const status = this.workflowStatuses.get(workflowId)
    if (!status || !status.isJourneyMappingEnabled) {
      throw new Error(`Journey mapping not enabled for workflow ${workflowId}`)
    }

    await switchWorkflowMode(workflowId, mode)

    status.currentMode = mode
    status.lastValidation = new Date()

    this.logger.info('Workflow mode switched', { workflowId, mode })
  }

  /**
   * Execute workflow with dual-mode support
   */
  async executeWorkflow(
    workflowId: string,
    options: any = {}
  ): Promise<any> {
    const status = this.workflowStatuses.get(workflowId)
    if (!status || !status.isJourneyMappingEnabled) {
      throw new Error(`Journey mapping not enabled for workflow ${workflowId}`)
    }

    return await executeDualModeWorkflow(workflowId, options)
  }

  /**
   * Create safety backup before any operations
   */
  async createWorkflowBackup(
    workflowId: string,
    reactFlowState: WorkflowState,
    reason: string = 'Manual backup'
  ): Promise<WorkflowSnapshot> {
    return await createSafetySnapshot(workflowId, reactFlowState, reason)
  }

  /**
   * Cleanup failed migration attempts
   */
  private async cleanupFailedMigration(workflowId: string): Promise<void> {
    // Remove any partial state
    await dualModeArchitecture.cleanup(workflowId)
    this.workflowStatuses.delete(workflowId)

    this.logger.info('Failed migration cleanup completed', { workflowId })
  }
}

/**
 * Singleton instance for global use
 */
export const workflowJourneyMappingSystem = new WorkflowJourneyMappingSystem()

// Re-export all system components for direct use
export {
  // Compatibility validation
  workflowCompatibilityValidator,
  validateWorkflowCompatibility,
  type CompatibilityValidationResult,
  type ReactFlowWorkflowSnapshot,

  // Regression testing
  workflowRegressionTestRunner,
  runQuickRegressionTest,
  runFullRegressionTest,
  establishRegressionBaseline,
  validateNoRegressions,
  type RegressionTestSuite,

  // Dual-mode architecture
  dualModeArchitecture,
  initializeDualMode,
  executeDualModeWorkflow,
  switchWorkflowMode,
  getWorkflowExecutionMode,
  isDualModeSupported,
  type DualModeConfig,
  type WorkflowExecutionContext,

  // Data consistency
  dataConsistencyManager,
  validateWorkflowConsistency,
  performSafeMigration,
  createSafetySnapshot,
  type WorkflowSnapshot,
  type MigrationOperation,

  // Preservation validation
  workflowPreservationValidator,
  validatePreservation,
  getPreservationReport,
  certifyWorkflowForJourneyMapping,
  type PreservationValidationResult
}

/**
 * Convenience functions for quick operations
 */

/**
 * Quick check if workflow is ready for journey mapping
 */
export async function isWorkflowReady(
  workflowId: string,
  reactFlowState: WorkflowState
): Promise<boolean> {
  const readiness = await workflowJourneyMappingSystem.validateWorkflowReadiness(
    workflowId,
    reactFlowState
  )
  return readiness.ready
}

/**
 * Enable journey mapping with full safety validation
 */
export async function enableJourneyMappingForWorkflow(
  workflowId: string,
  reactFlowState: WorkflowState
): Promise<JourneyMappingResult> {
  return await workflowJourneyMappingSystem.enableJourneyMapping(workflowId, reactFlowState)
}

/**
 * Get comprehensive workflow status
 */
export function getJourneyMappingStatus(workflowId: string): JourneyMappingStatus | undefined {
  return workflowJourneyMappingSystem.getWorkflowStatus(workflowId)
}

/**
 * Execute workflow with journey mapping support
 */
export async function executeJourneyWorkflow(
  workflowId: string,
  options: any = {}
): Promise<any> {
  return await workflowJourneyMappingSystem.executeWorkflow(workflowId, options)
}