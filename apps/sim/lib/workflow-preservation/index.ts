/**
 * Workflow Preservation System - Main Export
 *
 * This module provides the complete ReactFlow workflow preservation system
 * ensuring that all existing functionality remains intact while adding
 * conversational capabilities as an optional enhancement layer.
 *
 * Key Components:
 * - Compatibility Layer: Core preservation and validation
 * - Coexistence Manager: Dual-mode visual/conversational management
 * - Regression Testing: Comprehensive functionality testing
 * - Migration Utilities: Safe upgrade and rollback capabilities
 */

export {
  // Coexistence Manager
  CoexistenceManager,
  type CoexistenceState,
  type ConversationalContext,
  coexistenceManager,
  type ModeActivity,
  type ModeRestriction,
  type ModeState,
  type ModeSwitchResult,
  type PendingChange,
  type SyncStatus,
  type UserModePreferences,
  type WorkflowMode,
} from './coexistence-manager'
export {
  COMPATIBILITY_BASELINE,
  type CompatibilityVersion,
  type FunctionValidationResult,
  type MigrationRecord,
  type PreservationState,
  type RollbackResult,
  type ValidationResult,
  // Compatibility Layer
  WorkflowPreservationSystem,
  workflowPreservationSystem,
} from './compatibility-layer'
export {
  type MigrationOperation,
  type MigrationPlan,
  type MigrationResult,
  // Migration Utilities
  MigrationUtilities,
  migrationUtilities,
  type RollbackCheckpoint,
  type RollbackStrategy,
  type ValidationCheck,
} from './migration-utilities'
export {
  type AssertionResult,
  type ExpectedResult,
  type OperationResult,
  type OperationType,
  // Regression Testing
  RegressionTestingFramework,
  regressionTestingFramework,
  type TestCase,
  type TestCategory,
  type TestExecutionSummary,
  type TestOperation,
  type TestPriority,
  type TestResult,
  type TestSuite,
} from './regression-testing'

/**
 * Main Workflow Preservation API
 *
 * Provides a unified interface for all preservation operations
 */
export class WorkflowPreservationAPI {
  /**
   * Initialize preservation for a workflow
   */
  static async initializePreservation(
    workflowId: string,
    workflow: any
  ): Promise<{
    preservationState: any
    coexistenceState: any
  }> {
    // Create preservation state
    const preservationState = workflowPreservationSystem.createPreservationState(
      workflowId,
      workflow
    )

    // Initialize coexistence
    const coexistenceState = coexistenceManager.initializeCoexistence(workflowId, workflow)

    return {
      preservationState,
      coexistenceState,
    }
  }

  /**
   * Validate that all functionality is preserved
   */
  static async validatePreservation(workflowId: string, currentWorkflow: any): Promise<any> {
    return await workflowPreservationSystem.validatePreservation(workflowId, currentWorkflow)
  }

  /**
   * Switch between visual and conversational modes
   */
  static async switchMode(
    workflowId: string,
    targetMode: WorkflowMode,
    userId?: string
  ): Promise<any> {
    return await coexistenceManager.switchMode(workflowId, targetMode, userId)
  }

  /**
   * Run comprehensive regression tests
   */
  static async runRegressionTests(): Promise<any> {
    return await regressionTestingFramework.runAllTests()
  }

  /**
   * Execute safe migration with rollback capability
   */
  static async executeMigration(workflowId: string, migrationId: string): Promise<any> {
    return await migrationUtilities.executeMigration(workflowId, migrationId)
  }

  /**
   * Create rollback checkpoint
   */
  static async createCheckpoint(workflowId: string, description: string): Promise<string> {
    return workflowPreservationSystem.createRollbackPoint(workflowId, description)
  }

  /**
   * Execute rollback to previous state
   */
  static async rollback(workflowId: string, checkpointId: string): Promise<any> {
    return await workflowPreservationSystem.executeRollback(workflowId, checkpointId)
  }

  /**
   * Get preservation status for a workflow
   */
  static getPreservationStatus(workflowId: string): {
    preservationState?: any
    coexistenceState?: any
    migrationHistory: any[]
    testResults: any[]
  } {
    return {
      preservationState: workflowPreservationSystem.getPreservationState(workflowId),
      coexistenceState: coexistenceManager.getCoexistenceState(workflowId),
      migrationHistory: migrationUtilities.getMigrationHistory(workflowId),
      testResults: regressionTestingFramework.getTestResults(workflowId),
    }
  }

  /**
   * Check if workflow is safe for modifications
   */
  static async isSafeForModification(workflowId: string): Promise<{
    safe: boolean
    reasons: string[]
    recommendations: string[]
  }> {
    const preservationState = workflowPreservationSystem.getPreservationState(workflowId)
    const coexistenceState = coexistenceManager.getCoexistenceState(workflowId)

    const reasons: string[] = []
    const recommendations: string[] = []

    // Check preservation state
    if (!preservationState) {
      reasons.push('No preservation state found')
      recommendations.push('Initialize preservation before making changes')
    } else if (preservationState.compatibilityStatus === 'error') {
      reasons.push('Compatibility errors detected')
      recommendations.push('Run validation and fix errors before proceeding')
    }

    // Check sync status
    if (coexistenceState && !coexistenceState.syncStatus.isInSync) {
      reasons.push('Pending sync operations')
      recommendations.push('Wait for sync to complete before making changes')
    }

    // Check for ongoing migrations
    const migrationHistory = migrationUtilities.getMigrationHistory(workflowId)
    const hasRecentFailedMigration = migrationHistory.some(
      (m) =>
        !m.success &&
        Date.now() - new Date(m.details.checkpoints[0]?.timestamp || 0).getTime() < 300000 // 5 minutes
    )

    if (hasRecentFailedMigration) {
      reasons.push('Recent migration failure detected')
      recommendations.push('Review and resolve migration issues before proceeding')
    }

    const safe = reasons.length === 0

    return {
      safe,
      reasons,
      recommendations,
    }
  }

  /**
   * Get system health status
   */
  static getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical'
    issues: Array<{
      type: 'preservation' | 'coexistence' | 'testing' | 'migration'
      severity: 'low' | 'medium' | 'high'
      description: string
      recommendation: string
    }>
    metrics: {
      totalWorkflows: number
      preservedWorkflows: number
      migratedWorkflows: number
      testCoverage: number
    }
  } {
    // This would analyze system-wide health in production
    // For now, return a healthy status
    return {
      status: 'healthy',
      issues: [],
      metrics: {
        totalWorkflows: 0,
        preservedWorkflows: 0,
        migratedWorkflows: 0,
        testCoverage: 100,
      },
    }
  }
}

// Default export for convenience
export default WorkflowPreservationAPI
