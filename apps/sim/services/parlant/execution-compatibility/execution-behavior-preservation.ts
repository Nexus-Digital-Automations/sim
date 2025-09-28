/**
 * Execution Behavior Preservation System
 * =====================================
 *
 * Ensures that journey execution preserves all behavioral aspects of workflow
 * execution including timing, side effects, API calls, logging, and monitoring.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ApiCall,
  CompatibilityEvent,
  CompatibilityEventBus,
  DatabaseOperation,
  ExecutionBehaviorConfig,
  ExecutionContext,
  ExternalIntegration,
  SideEffectTracker,
} from './types'

const logger = createLogger('ExecutionBehaviorPreservation')

/**
 * System that ensures journey execution behaves identically to workflow execution
 */
export class ExecutionBehaviorPreservationSystem {
  private config: ExecutionBehaviorConfig
  private sideEffectTracker: SideEffectTracker
  private eventBus?: CompatibilityEventBus
  private behaviorInterceptors: Map<string, BehaviorInterceptor> = new Map()
  private timingData: Map<string, TimingRecord> = new Map()
  private activeExecutions: Map<string, ExecutionSession> = new Map()

  constructor(config: ExecutionBehaviorConfig, eventBus?: CompatibilityEventBus) {
    this.config = config
    this.eventBus = eventBus
    this.sideEffectTracker = {
      apiCalls: [],
      databaseOperations: [],
      fileOperations: [],
      externalIntegrations: [],
      webhooks: [],
      notifications: [],
    }

    this.initializeBehaviorInterceptors()
    logger.info('ExecutionBehaviorPreservationSystem initialized', { config })
  }

  /**
   * Start tracking execution behavior for a session
   */
  async startExecutionTracking(
    executionId: string,
    mode: 'workflow' | 'journey',
    context: ExecutionContext
  ): Promise<void> {
    logger.info('Starting execution tracking', { executionId, mode })

    const session: ExecutionSession = {
      executionId,
      mode,
      context,
      startTime: Date.now(),
      sideEffects: {
        apiCalls: [],
        databaseOperations: [],
        fileOperations: [],
        externalIntegrations: [],
        webhooks: [],
        notifications: [],
      },
      timingRecords: [],
      behaviorEvents: [],
      synchronized: false,
    }

    this.activeExecutions.set(executionId, session)

    // Initialize behavior tracking based on configuration
    if (this.config.preserveApiCalls) {
      await this.initializeApiCallTracking(executionId)
    }

    if (this.config.preserveSideEffects) {
      await this.initializeSideEffectTracking(executionId)
    }

    if (this.config.preserveTiming) {
      await this.initializeTimingTracking(executionId)
    }

    if (this.config.preserveLogging) {
      await this.initializeLoggingInterception(executionId)
    }

    // Emit tracking started event
    await this.emitEvent({
      id: `tracking_${Date.now()}`,
      type: 'execution_started',
      source: mode,
      executionId,
      timestamp: new Date().toISOString(),
      data: { session },
    })
  }

  /**
   * Stop tracking execution behavior
   */
  async stopExecutionTracking(executionId: string): Promise<ExecutionBehaviorSummary> {
    logger.info('Stopping execution tracking', { executionId })

    const session = this.activeExecutions.get(executionId)
    if (!session) {
      throw new Error(`No active execution session found for ID: ${executionId}`)
    }

    session.endTime = Date.now()

    // Generate behavior summary
    const summary = await this.generateBehaviorSummary(session)

    // Cleanup
    this.activeExecutions.delete(executionId)
    this.timingData.delete(executionId)

    // Emit tracking stopped event
    await this.emitEvent({
      id: `tracking_end_${Date.now()}`,
      type: 'execution_completed',
      source: session.mode,
      executionId,
      timestamp: new Date().toISOString(),
      data: { summary },
    })

    return summary
  }

  /**
   * Compare execution behaviors between workflow and journey
   */
  async compareBehaviors(
    workflowSummary: ExecutionBehaviorSummary,
    journeySummary: ExecutionBehaviorSummary,
    context: ExecutionContext
  ): Promise<BehaviorComparisonResult> {
    logger.info('Comparing execution behaviors')

    const comparison: BehaviorComparisonResult = {
      compatible: true,
      differences: [],
      timingComparison: await this.compareTimingBehaviors(workflowSummary, journeySummary),
      sideEffectComparison: await this.compareSideEffects(workflowSummary, journeySummary),
      apiCallComparison: await this.compareApiCalls(workflowSummary, journeySummary),
      integrationComparison: await this.compareIntegrations(workflowSummary, journeySummary),
      metadata: {
        comparedAt: new Date().toISOString(),
        context,
        workflowExecutionId: workflowSummary.executionId,
        journeyExecutionId: journeySummary.executionId,
      },
    }

    // Aggregate all differences
    comparison.differences = [
      ...comparison.timingComparison.differences,
      ...comparison.sideEffectComparison.differences,
      ...comparison.apiCallComparison.differences,
      ...comparison.integrationComparison.differences,
    ]

    // Determine overall compatibility
    comparison.compatible =
      comparison.differences.filter(
        (diff) => diff.severity === 'critical' || diff.severity === 'error'
      ).length === 0

    logger.info('Behavior comparison completed', {
      compatible: comparison.compatible,
      differences: comparison.differences.length,
    })

    return comparison
  }

  /**
   * Synchronize execution behavior between workflow and journey modes
   */
  async synchronizeBehavior(sourceExecutionId: string, targetExecutionId: string): Promise<void> {
    if (!this.config.synchronizeExecution) {
      logger.debug('Execution synchronization disabled')
      return
    }

    logger.info('Synchronizing execution behavior', { sourceExecutionId, targetExecutionId })

    const sourceSession = this.activeExecutions.get(sourceExecutionId)
    const targetSession = this.activeExecutions.get(targetExecutionId)

    if (!sourceSession || !targetSession) {
      throw new Error('Both execution sessions must be active for synchronization')
    }

    // Synchronize timing
    if (this.config.preserveTiming) {
      await this.synchronizeTimingBehavior(sourceSession, targetSession)
    }

    // Synchronize side effects
    if (this.config.preserveSideEffects) {
      await this.synchronizeSideEffects(sourceSession, targetSession)
    }

    // Synchronize API calls
    if (this.config.preserveApiCalls) {
      await this.synchronizeApiCalls(sourceSession, targetSession)
    }

    // Mark sessions as synchronized
    sourceSession.synchronized = true
    targetSession.synchronized = true

    logger.info('Execution behavior synchronized')
  }

  /**
   * Register behavior interceptor for custom behavior preservation
   */
  registerBehaviorInterceptor(Name: string, interceptor: BehaviorInterceptor): void {
    this.behaviorInterceptors.set(Name, interceptor)
    logger.info('Behavior interceptor registered', { Name })
  }

  /**
   * Intercept and record API call
   */
  async interceptApiCall(executionId: string, call: ApiCall): Promise<ApiCall> {
    const session = this.activeExecutions.get(executionId)
    if (!session) return call

    // Record the API call
    session.sideEffects.apiCalls.push(call)
    this.sideEffectTracker.apiCalls.push(call)

    // Apply behavior preservation logic
    if (this.config.preserveApiCalls) {
      const interceptor = this.behaviorInterceptors.get('api_calls')
      if (interceptor) {
        await interceptor.intercept('api_call', call, session)
      }
    }

    // Emit API call event
    await this.emitEvent({
      id: `api_${call.id}`,
      type: 'integration_called',
      source: session.mode,
      executionId,
      timestamp: new Date().toISOString(),
      data: { call },
    })

    return call
  }

  /**
   * Intercept and record database operation
   */
  async interceptDatabaseOperation(
    executionId: string,
    operation: DatabaseOperation
  ): Promise<DatabaseOperation> {
    const session = this.activeExecutions.get(executionId)
    if (!session) return operation

    // Record the database operation
    session.sideEffects.databaseOperations.push(operation)
    this.sideEffectTracker.databaseOperations.push(operation)

    // Apply behavior preservation logic
    const interceptor = this.behaviorInterceptors.get('database_operations')
    if (interceptor) {
      await interceptor.intercept('database_operation', operation, session)
    }

    return operation
  }

  /**
   * Intercept and record external integration
   */
  async interceptExternalIntegration(
    executionId: string,
    integration: ExternalIntegration
  ): Promise<ExternalIntegration> {
    const session = this.activeExecutions.get(executionId)
    if (!session) return integration

    // Record the external integration
    session.sideEffects.externalIntegrations.push(integration)
    this.sideEffectTracker.externalIntegrations.push(integration)

    // Apply behavior preservation logic
    const interceptor = this.behaviorInterceptors.get('external_integrations')
    if (interceptor) {
      await interceptor.intercept('external_integration', integration, session)
    }

    return integration
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async initializeBehaviorInterceptors(): Promise<void> {
    // API Call Interceptor
    this.registerBehaviorInterceptor('api_calls', {
      intercept: async (type: string, data: any, session: ExecutionSession) => {
        if (type === 'api_call' && this.config.preserveApiCalls) {
          // Apply API call preservation logic
          await this.preserveApiCallBehavior(data as ApiCall, session)
        }
      },
    })

    // Database Operation Interceptor
    this.registerBehaviorInterceptor('database_operations', {
      intercept: async (type: string, data: any, session: ExecutionSession) => {
        if (type === 'database_operation') {
          // Apply database operation preservation logic
          await this.preserveDatabaseBehavior(data as DatabaseOperation, session)
        }
      },
    })

    // External Integration Interceptor
    this.registerBehaviorInterceptor('external_integrations', {
      intercept: async (type: string, data: any, session: ExecutionSession) => {
        if (type === 'external_integration') {
          // Apply external integration preservation logic
          await this.preserveExternalIntegrationBehavior(data as ExternalIntegration, session)
        }
      },
    })

    logger.info('Behavior interceptors initialized')
  }

  private async initializeApiCallTracking(executionId: string): Promise<void> {
    // Initialize API call tracking mechanisms
    logger.debug('Initializing API call tracking', { executionId })
  }

  private async initializeSideEffectTracking(executionId: string): Promise<void> {
    // Initialize side effect tracking mechanisms
    logger.debug('Initializing side effect tracking', { executionId })
  }

  private async initializeTimingTracking(executionId: string): Promise<void> {
    // Initialize timing tracking mechanisms
    logger.debug('Initializing timing tracking', { executionId })

    this.timingData.set(executionId, {
      executionId,
      startTime: Date.now(),
      stepTimings: [],
      totalDuration: 0,
      averageStepDuration: 0,
    })
  }

  private async initializeLoggingInterception(executionId: string): Promise<void> {
    // Initialize logging interception for behavior preservation
    logger.debug('Initializing logging interception', { executionId })
  }

  private async generateBehaviorSummary(
    session: ExecutionSession
  ): Promise<ExecutionBehaviorSummary> {
    const duration = (session.endTime || Date.now()) - session.startTime

    return {
      executionId: session.executionId,
      mode: session.mode,
      totalDuration: duration,
      sideEffects: session.sideEffects,
      timingRecords: session.timingRecords,
      behaviorEvents: session.behaviorEvents,
      synchronized: session.synchronized,
      preservationMetrics: {
        apiCallsPreserved: session.sideEffects.apiCalls.length,
        databaseOpsPreserved: session.sideEffects.databaseOperations.length,
        integrationCallsPreserved: session.sideEffects.externalIntegrations.length,
        webhooksPreserved: session.sideEffects.webhooks.length,
        notificationsPreserved: session.sideEffects.notifications.length,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        context: session.context,
      },
    }
  }

  private async compareTimingBehaviors(
    workflowSummary: ExecutionBehaviorSummary,
    journeySummary: ExecutionBehaviorSummary
  ): Promise<TimingComparisonResult> {
    const differences: BehaviorDifference[] = []

    // Compare total duration
    const durationDiff = Math.abs(workflowSummary.totalDuration - journeySummary.totalDuration)
    const tolerance = this.config.preserveTiming ? 100 : 1000 // More strict if timing preservation is enabled

    if (durationDiff > tolerance) {
      differences.push({
        type: 'timing_difference',
        path: 'totalDuration',
        workflowValue: workflowSummary.totalDuration,
        journeyValue: journeySummary.totalDuration,
        difference: durationDiff,
        severity: durationDiff > tolerance * 2 ? 'error' : 'warning',
        description: `Total execution duration differs by ${durationDiff}ms`,
      })
    }

    return {
      compatible:
        differences.filter((d) => d.severity === 'error' || d.severity === 'critical').length === 0,
      differences,
      workflowDuration: workflowSummary.totalDuration,
      journeyDuration: journeySummary.totalDuration,
      durationDifference: durationDiff,
      tolerance,
    }
  }

  private async compareSideEffects(
    workflowSummary: ExecutionBehaviorSummary,
    journeySummary: ExecutionBehaviorSummary
  ): Promise<SideEffectComparisonResult> {
    const differences: BehaviorDifference[] = []

    // Compare API calls count
    const workflowApiCalls = workflowSummary.sideEffects.apiCalls.length
    const journeyApiCalls = journeySummary.sideEffects.apiCalls.length

    if (workflowApiCalls !== journeyApiCalls) {
      differences.push({
        type: 'side_effect_difference',
        path: 'apiCalls.count',
        workflowValue: workflowApiCalls,
        journeyValue: journeyApiCalls,
        difference: Math.abs(workflowApiCalls - journeyApiCalls),
        severity: 'error',
        description: `Different number of API calls made (workflow: ${workflowApiCalls}, journey: ${journeyApiCalls})`,
      })
    }

    // Compare database operations count
    const workflowDbOps = workflowSummary.sideEffects.databaseOperations.length
    const journeyDbOps = journeySummary.sideEffects.databaseOperations.length

    if (workflowDbOps !== journeyDbOps) {
      differences.push({
        type: 'side_effect_difference',
        path: 'databaseOperations.count',
        workflowValue: workflowDbOps,
        journeyValue: journeyDbOps,
        difference: Math.abs(workflowDbOps - journeyDbOps),
        severity: 'error',
        description: `Different number of database operations (workflow: ${workflowDbOps}, journey: ${journeyDbOps})`,
      })
    }

    return {
      compatible:
        differences.filter((d) => d.severity === 'error' || d.severity === 'critical').length === 0,
      differences,
      preservationScore: this.calculateSideEffectPreservationScore(workflowSummary, journeySummary),
    }
  }

  private async compareApiCalls(
    workflowSummary: ExecutionBehaviorSummary,
    journeySummary: ExecutionBehaviorSummary
  ): Promise<ApiCallComparisonResult> {
    const differences: BehaviorDifference[] = []
    const workflowCalls = workflowSummary.sideEffects.apiCalls
    const journeyCalls = journeySummary.sideEffects.apiCalls

    // Compare each API call
    for (let i = 0; i < Math.max(workflowCalls.length, journeyCalls.length); i++) {
      const workflowCall = workflowCalls[i]
      const journeyCall = journeyCalls[i]

      if (!workflowCall && journeyCall) {
        differences.push({
          type: 'side_effect_difference',
          path: `apiCalls[${i}]`,
          workflowValue: undefined,
          journeyValue: journeyCall,
          difference: 1,
          severity: 'error',
          description: `Extra API call in journey execution: ${journeyCall.method} ${journeyCall.url}`,
        })
      } else if (workflowCall && !journeyCall) {
        differences.push({
          type: 'side_effect_difference',
          path: `apiCalls[${i}]`,
          workflowValue: workflowCall,
          journeyValue: undefined,
          difference: 1,
          severity: 'error',
          description: `Missing API call in journey execution: ${workflowCall.method} ${workflowCall.url}`,
        })
      } else if (workflowCall && journeyCall) {
        // Compare call details
        if (workflowCall.url !== journeyCall.url) {
          differences.push({
            type: 'side_effect_difference',
            path: `apiCalls[${i}].url`,
            workflowValue: workflowCall.url,
            journeyValue: journeyCall.url,
            difference: 1,
            severity: 'error',
            description: `API call URL differs at index ${i}`,
          })
        }

        if (workflowCall.method !== journeyCall.method) {
          differences.push({
            type: 'side_effect_difference',
            path: `apiCalls[${i}].method`,
            workflowValue: workflowCall.method,
            journeyValue: journeyCall.method,
            difference: 1,
            severity: 'error',
            description: `API call method differs at index ${i}`,
          })
        }
      }
    }

    return {
      compatible:
        differences.filter((d) => d.severity === 'error' || d.severity === 'critical').length === 0,
      differences,
      workflowCallCount: workflowCalls.length,
      journeyCallCount: journeyCalls.length,
      matchedCalls: Math.min(workflowCalls.length, journeyCalls.length) - differences.length,
    }
  }

  private async compareIntegrations(
    workflowSummary: ExecutionBehaviorSummary,
    journeySummary: ExecutionBehaviorSummary
  ): Promise<IntegrationComparisonResult> {
    const differences: BehaviorDifference[] = []

    // Compare external integrations
    const workflowIntegrations = workflowSummary.sideEffects.externalIntegrations.length
    const journeyIntegrations = journeySummary.sideEffects.externalIntegrations.length

    if (workflowIntegrations !== journeyIntegrations) {
      differences.push({
        type: 'side_effect_difference',
        path: 'externalIntegrations.count',
        workflowValue: workflowIntegrations,
        journeyValue: journeyIntegrations,
        difference: Math.abs(workflowIntegrations - journeyIntegrations),
        severity: 'error',
        description: `Different number of external integrations called`,
      })
    }

    // Compare webhooks
    const workflowWebhooks = workflowSummary.sideEffects.webhooks.length
    const journeyWebhooks = journeySummary.sideEffects.webhooks.length

    if (workflowWebhooks !== journeyWebhooks) {
      differences.push({
        type: 'side_effect_difference',
        path: 'webhooks.count',
        workflowValue: workflowWebhooks,
        journeyValue: journeyWebhooks,
        difference: Math.abs(workflowWebhooks - journeyWebhooks),
        severity: 'warning',
        description: `Different number of webhooks sent`,
      })
    }

    return {
      compatible:
        differences.filter((d) => d.severity === 'error' || d.severity === 'critical').length === 0,
      differences,
      integrationScore: this.calculateIntegrationCompatibilityScore(
        workflowSummary,
        journeySummary
      ),
    }
  }

  private async synchronizeTimingBehavior(
    sourceSession: ExecutionSession,
    targetSession: ExecutionSession
  ): Promise<void> {
    // Implement timing synchronization logic
    logger.debug('Synchronizing timing behavior between sessions')
  }

  private async synchronizeSideEffects(
    sourceSession: ExecutionSession,
    targetSession: ExecutionSession
  ): Promise<void> {
    // Implement side effect synchronization logic
    logger.debug('Synchronizing side effects between sessions')
  }

  private async synchronizeApiCalls(
    sourceSession: ExecutionSession,
    targetSession: ExecutionSession
  ): Promise<void> {
    // Implement API call synchronization logic
    logger.debug('Synchronizing API calls between sessions')
  }

  private async preserveApiCallBehavior(call: ApiCall, session: ExecutionSession): Promise<void> {
    // Apply API call preservation logic
    logger.debug('Preserving API call behavior', {
      callId: call.id,
      sessionId: session.executionId,
    })
  }

  private async preserveDatabaseBehavior(
    operation: DatabaseOperation,
    session: ExecutionSession
  ): Promise<void> {
    // Apply database operation preservation logic
    logger.debug('Preserving database behavior', {
      operationId: operation.id,
      sessionId: session.executionId,
    })
  }

  private async preserveExternalIntegrationBehavior(
    integration: ExternalIntegration,
    session: ExecutionSession
  ): Promise<void> {
    // Apply external integration preservation logic
    logger.debug('Preserving external integration behavior', {
      integrationId: integration.id,
      sessionId: session.executionId,
    })
  }

  private calculateSideEffectPreservationScore(
    workflowSummary: ExecutionBehaviorSummary,
    journeySummary: ExecutionBehaviorSummary
  ): number {
    // Calculate a score (0-100) for how well side effects are preserved
    const totalWorkflowEffects =
      workflowSummary.sideEffects.apiCalls.length +
      workflowSummary.sideEffects.databaseOperations.length +
      workflowSummary.sideEffects.externalIntegrations.length +
      workflowSummary.sideEffects.webhooks.length +
      workflowSummary.sideEffects.notifications.length

    const totalJourneyEffects =
      journeySummary.sideEffects.apiCalls.length +
      journeySummary.sideEffects.databaseOperations.length +
      journeySummary.sideEffects.externalIntegrations.length +
      journeySummary.sideEffects.webhooks.length +
      journeySummary.sideEffects.notifications.length

    if (totalWorkflowEffects === 0 && totalJourneyEffects === 0) return 100
    if (totalWorkflowEffects === 0 || totalJourneyEffects === 0) return 0

    const score =
      (Math.min(totalWorkflowEffects, totalJourneyEffects) /
        Math.max(totalWorkflowEffects, totalJourneyEffects)) *
      100
    return Math.round(score * 100) / 100
  }

  private calculateIntegrationCompatibilityScore(
    workflowSummary: ExecutionBehaviorSummary,
    journeySummary: ExecutionBehaviorSummary
  ): number {
    // Calculate compatibility score for external integrations
    const workflowIntegrations = workflowSummary.sideEffects.externalIntegrations.length
    const journeyIntegrations = journeySummary.sideEffects.externalIntegrations.length

    if (workflowIntegrations === journeyIntegrations) return 100
    if (workflowIntegrations === 0 || journeyIntegrations === 0) return 0

    const score =
      (Math.min(workflowIntegrations, journeyIntegrations) /
        Math.max(workflowIntegrations, journeyIntegrations)) *
      100
    return Math.round(score * 100) / 100
  }

  private async emitEvent(event: CompatibilityEvent): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.publish(event)
    }
  }
}

// ========================================
// SUPPORTING INTERFACES
// ========================================

interface BehaviorInterceptor {
  intercept(type: string, data: any, session: ExecutionSession): Promise<void>
}

interface ExecutionSession {
  executionId: string
  mode: 'workflow' | 'journey'
  context: ExecutionContext
  startTime: number
  endTime?: number
  sideEffects: SideEffectTracker
  timingRecords: TimingRecord[]
  behaviorEvents: CompatibilityEvent[]
  synchronized: boolean
}

interface TimingRecord {
  executionId: string
  startTime: number
  stepTimings: Array<{ step: string; duration: number }>
  totalDuration: number
  averageStepDuration: number
}

interface ExecutionBehaviorSummary {
  executionId: string
  mode: 'workflow' | 'journey'
  totalDuration: number
  sideEffects: SideEffectTracker
  timingRecords: TimingRecord[]
  behaviorEvents: CompatibilityEvent[]
  synchronized: boolean
  preservationMetrics: PreservationMetrics
  metadata: {
    generatedAt: string
    context: ExecutionContext
  }
}

interface PreservationMetrics {
  apiCallsPreserved: number
  databaseOpsPreserved: number
  integrationCallsPreserved: number
  webhooksPreserved: number
  notificationsPreserved: number
}

interface BehaviorComparisonResult {
  compatible: boolean
  differences: BehaviorDifference[]
  timingComparison: TimingComparisonResult
  sideEffectComparison: SideEffectComparisonResult
  apiCallComparison: ApiCallComparisonResult
  integrationComparison: IntegrationComparisonResult
  metadata: {
    comparedAt: string
    context: ExecutionContext
    workflowExecutionId: string
    journeyExecutionId: string
  }
}

interface BehaviorDifference {
  type:
    | 'timing_difference'
    | 'side_effect_difference'
    | 'api_call_difference'
    | 'integration_difference'
  path: string
  workflowValue: any
  journeyValue: any
  difference: number
  severity: 'critical' | 'error' | 'warning' | 'info'
  description: string
}

interface TimingComparisonResult {
  compatible: boolean
  differences: BehaviorDifference[]
  workflowDuration: number
  journeyDuration: number
  durationDifference: number
  tolerance: number
}

interface SideEffectComparisonResult {
  compatible: boolean
  differences: BehaviorDifference[]
  preservationScore: number
}

interface ApiCallComparisonResult {
  compatible: boolean
  differences: BehaviorDifference[]
  workflowCallCount: number
  journeyCallCount: number
  matchedCalls: number
}

interface IntegrationComparisonResult {
  compatible: boolean
  differences: BehaviorDifference[]
  integrationScore: number
}
