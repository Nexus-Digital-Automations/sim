/**
 * State Management Compatibility Layer
 * ====================================
 *
 * Ensures state management and session handling work seamlessly between
 * workflow and journey execution modes, maintaining consistency and synchronization.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  CompatibilityEvent,
  CompatibilityEventBus,
  ContextState,
  ExecutionContext,
  ExecutionState,
  ProgressState,
  SessionState,
  StateCompatibilityConfig,
  StateLock,
  VariableState,
} from './types'

const logger = createLogger('StateManagementCompatibility')

/**
 * Manages state synchronization and compatibility between execution modes
 */
export class StateManagementCompatibilityLayer {
  private config: StateCompatibilityConfig
  private eventBus?: CompatibilityEventBus
  private executionStates: Map<string, ExecutionState> = new Map()
  private stateSnapshots: Map<string, StateSnapshot[]> = new Map()
  private stateLocks: Map<string, StateLock> = new Map()
  private synchronizationQueue: Map<string, StateUpdate[]> = new Map()
  private stateValidators: Map<string, StateValidator> = new Map()

  constructor(config: StateCompatibilityConfig, eventBus?: CompatibilityEventBus) {
    this.config = config
    this.eventBus = eventBus
    this.initializeStateValidators()
    logger.info('StateManagementCompatibilityLayer initialized', { config })
  }

  /**
   * Initialize state management for an execution session
   */
  async initializeExecutionState(
    executionId: string,
    mode: 'workflow' | 'journey',
    context: ExecutionContext
  ): Promise<ExecutionState> {
    logger.info('Initializing execution state', { executionId, mode })

    const initialState: ExecutionState = {
      variables: {},
      context: {
        workflowContext: {},
        journeyContext: {},
        userContext: context.requestMetadata || {},
        systemContext: {
          executionId,
          mode,
          workspaceId: context.workspaceId,
          userId: context.userId,
          timestamp: new Date().toISOString(),
        },
        conversationHistory: [],
        activeTools: [],
      },
      progress: {
        currentStep: '',
        completedSteps: [],
        totalSteps: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
        lastProgressUpdate: new Date().toISOString(),
      },
      locks: [],
      cache: {
        entries: [],
        size: 0,
        maxSize: this.config.maxStateHistorySize || 1024 * 1024, // 1MB default
        hitRate: 0,
        lastCleanup: new Date().toISOString(),
      },
      session: {
        sessionId: `session_${executionId}`,
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        authenticated: true,
        userId: context.userId,
        permissions: [],
        preferences: {},
        temporaryData: {},
      },
    }

    this.executionStates.set(executionId, initialState)

    // Initialize synchronization queue
    this.synchronizationQueue.set(executionId, [])

    // Create initial snapshot if enabled
    if (this.config.enableStateSnapshots) {
      await this.createStateSnapshot(executionId, 'initialization')
    }

    // Emit state initialized event
    await this.emitEvent({
      id: `state_init_${Date.now()}`,
      type: 'execution_started',
      source: mode,
      executionId,
      timestamp: new Date().toISOString(),
      data: { initialState },
    })

    return initialState
  }

  /**
   * Update variable in execution state
   */
  async updateVariable(
    executionId: string,
    Name: string,
    value: any,
    source: 'workflow' | 'journey' | 'user' | 'system' = 'system',
    scope: 'global' | 'workflow' | 'block' | 'step' = 'global'
  ): Promise<VariableState> {
    const state = this.executionStates.get(executionId)
    if (!state) {
      throw new Error(`No execution state found for ID: ${executionId}`)
    }

    // Acquire lock if needed
    await this.acquireLock(executionId, `variable:${Name}`, 'write')

    try {
      const existingVariable = state.variables[Name]
      const newVariable: VariableState = {
        Name,
        value,
        type: typeof value,
        scope,
        lastUpdated: new Date().toISOString(),
        source,
        encrypted: this.shouldEncryptVariable(Name, value),
      }

      // Validate variable if configured
      if (this.config.preserveVariableTypes && existingVariable) {
        await this.validateVariableTypeConsistency(existingVariable, newVariable)
      }

      // Update variable
      state.variables[Name] = newVariable

      // Queue state update for synchronization
      if (this.config.enableStateSynchronization) {
        await this.queueStateUpdate(executionId, {
          type: 'variable_update',
          path: `variables.${Name}`,
          oldValue: existingVariable,
          newValue: newVariable,
          timestamp: new Date().toISOString(),
          source,
        })
      }

      // Create snapshot if significant change
      if (
        this.config.enableStateSnapshots &&
        this.isSignificantChange('variable', existingVariable, newVariable)
      ) {
        await this.createStateSnapshot(executionId, `variable_update:${Name}`)
      }

      // Emit variable updated event
      await this.emitEvent({
        id: `var_update_${Date.now()}`,
        type: 'variable_updated',
        source: source as any,
        executionId,
        timestamp: new Date().toISOString(),
        data: { Name, value, previousValue: existingVariable?.value },
      })

      logger.debug('Variable updated', { executionId, Name, type: typeof value, source, scope })
      return newVariable
    } finally {
      // Release lock
      await this.releaseLock(executionId, `variable:${Name}`)
    }
  }

  /**
   * Synchronize state between workflow and journey executions
   */
  async synchronizeStates(
    workflowExecutionId: string,
    journeyExecutionId: string,
    direction: 'workflow_to_journey' | 'journey_to_workflow' | 'bidirectional' = 'bidirectional'
  ): Promise<StateSynchronizationResult> {
    if (!this.config.enableStateSynchronization) {
      logger.debug('State synchronization disabled')
      return {
        synchronized: false,
        reason: 'synchronization_disabled',
        changes: [],
        conflicts: [],
      }
    }

    logger.info('Synchronizing execution states', {
      workflowExecutionId,
      journeyExecutionId,
      direction,
    })

    const workflowState = this.executionStates.get(workflowExecutionId)
    const journeyState = this.executionStates.get(journeyExecutionId)

    if (!workflowState || !journeyState) {
      throw new Error('Both execution states must exist for synchronization')
    }

    const changes: StateChange[] = []
    const conflicts: StateConflict[] = []

    try {
      // Synchronize variables
      if (direction === 'workflow_to_journey' || direction === 'bidirectional') {
        const variableChanges = await this.synchronizeVariables(
          workflowState.variables,
          journeyState.variables,
          'workflow_to_journey'
        )
        changes.push(...variableChanges.changes)
        conflicts.push(...variableChanges.conflicts)
      }

      if (direction === 'journey_to_workflow' || direction === 'bidirectional') {
        const variableChanges = await this.synchronizeVariables(
          journeyState.variables,
          workflowState.variables,
          'journey_to_workflow'
        )
        changes.push(...variableChanges.changes)
        conflicts.push(...variableChanges.conflicts)
      }

      // Synchronize context
      await this.synchronizeContext(workflowState.context, journeyState.context, direction)

      // Synchronize progress
      await this.synchronizeProgress(workflowState.progress, journeyState.progress, direction)

      // Synchronize session state
      await this.synchronizeSession(workflowState.session, journeyState.session, direction)

      // Apply queued updates
      await this.processStateUpdateQueues(workflowExecutionId, journeyExecutionId)

      // Emit synchronization completed event
      await this.emitEvent({
        id: `sync_complete_${Date.now()}`,
        type: 'state_synchronized',
        source: 'workflow',
        executionId: workflowExecutionId,
        timestamp: new Date().toISOString(),
        data: {
          journeyExecutionId,
          changes: changes.length,
          conflicts: conflicts.length,
          direction,
        },
      })

      logger.info('State synchronization completed', {
        changes: changes.length,
        conflicts: conflicts.length,
        direction,
      })

      return {
        synchronized: true,
        changes,
        conflicts,
        direction,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logger.error('State synchronization failed', {
        error: error instanceof Error ? error.message : String(error),
        workflowExecutionId,
        journeyExecutionId,
      })

      return {
        synchronized: false,
        reason: 'synchronization_error',
        error: error instanceof Error ? error.message : String(error),
        changes,
        conflicts,
      }
    }
  }

  /**
   * Validate state consistency between executions
   */
  async validateStateConsistency(
    workflowExecutionId: string,
    journeyExecutionId: string
  ): Promise<StateConsistencyReport> {
    logger.info('Validating state consistency', { workflowExecutionId, journeyExecutionId })

    const workflowState = this.executionStates.get(workflowExecutionId)
    const journeyState = this.executionStates.get(journeyExecutionId)

    if (!workflowState || !journeyState) {
      throw new Error('Both execution states must exist for validation')
    }

    const inconsistencies: StateInconsistency[] = []

    // Validate variables
    const variableInconsistencies = await this.validateVariableConsistency(
      workflowState.variables,
      journeyState.variables
    )
    inconsistencies.push(...variableInconsistencies)

    // Validate context
    const contextInconsistencies = await this.validateContextConsistency(
      workflowState.context,
      journeyState.context
    )
    inconsistencies.push(...contextInconsistencies)

    // Validate progress
    const progressInconsistencies = await this.validateProgressConsistency(
      workflowState.progress,
      journeyState.progress
    )
    inconsistencies.push(...progressInconsistencies)

    // Calculate consistency score
    const totalChecks =
      Object.keys(workflowState.variables).length + Object.keys(journeyState.variables).length + 10 // Additional checks for context, progress, etc.
    const consistencyScore =
      totalChecks > 0 ? Math.max(0, 100 - (inconsistencies.length / totalChecks) * 100) : 100

    const report: StateConsistencyReport = {
      consistent: inconsistencies.length === 0,
      consistencyScore,
      inconsistencies,
      totalChecks,
      workflowExecutionId,
      journeyExecutionId,
      validatedAt: new Date().toISOString(),
      recommendations: await this.generateConsistencyRecommendations(inconsistencies),
    }

    logger.info('State consistency validation completed', {
      consistent: report.consistent,
      score: report.consistencyScore,
      inconsistencies: inconsistencies.length,
    })

    return report
  }

  /**
   * Create state snapshot for rollback capabilities
   */
  async createStateSnapshot(executionId: string, reason: string): Promise<StateSnapshot> {
    const state = this.executionStates.get(executionId)
    if (!state) {
      throw new Error(`No execution state found for ID: ${executionId}`)
    }

    const snapshot: StateSnapshot = {
      id: `snapshot_${executionId}_${Date.now()}`,
      executionId,
      timestamp: new Date().toISOString(),
      reason,
      state: JSON.parse(JSON.stringify(state)), // Deep copy
      size: JSON.stringify(state).length,
    }

    // Add to snapshots
    const snapshots = this.stateSnapshots.get(executionId) || []
    snapshots.push(snapshot)

    // Enforce max history size
    while (snapshots.length > this.config.maxStateHistorySize) {
      snapshots.shift()
    }

    this.stateSnapshots.set(executionId, snapshots)

    logger.debug('State snapshot created', { executionId, reason, snapshotId: snapshot.id })
    return snapshot
  }

  /**
   * Restore state from snapshot
   */
  async restoreFromSnapshot(executionId: string, snapshotId: string): Promise<boolean> {
    const snapshots = this.stateSnapshots.get(executionId) || []
    const snapshot = snapshots.find((s) => s.id === snapshotId)

    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`)
    }

    // Restore state
    this.executionStates.set(executionId, snapshot.state)

    logger.info('State restored from snapshot', { executionId, snapshotId })
    return true
  }

  /**
   * Get execution state
   */
  getExecutionState(executionId: string): ExecutionState | undefined {
    return this.executionStates.get(executionId)
  }

  /**
   * Clean up execution state
   */
  async cleanupExecutionState(executionId: string): Promise<void> {
    // Release all locks
    const locks = Array.from(this.stateLocks.values()).filter(
      (lock) => lock.acquiredBy === executionId
    )

    for (const lock of locks) {
      await this.releaseLock(executionId, lock.resource)
    }

    // Clean up state data
    this.executionStates.delete(executionId)
    this.synchronizationQueue.delete(executionId)
    this.stateSnapshots.delete(executionId)

    logger.info('Execution state cleaned up', { executionId })
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private initializeStateValidators(): void {
    // Variable type validator
    this.stateValidators.set('variable_type', {
      validate: async (path: string, oldValue: any, newValue: any) => {
        if (typeof oldValue !== typeof newValue) {
          return {
            valid: false,
            issues: [`Type changed from ${typeof oldValue} to ${typeof newValue} at ${path}`],
          }
        }
        return { valid: true, issues: [] }
      },
    })

    // Variable scope validator
    this.stateValidators.set('variable_scope', {
      validate: async (path: string, oldValue: any, newValue: any) => {
        if (oldValue?.scope && newValue?.scope && oldValue.scope !== newValue.scope) {
          return {
            valid: false,
            issues: [
              `Variable scope changed from ${oldValue.scope} to ${newValue.scope} at ${path}`,
            ],
          }
        }
        return { valid: true, issues: [] }
      },
    })

    logger.info('State validators initialized')
  }

  private async validateVariableTypeConsistency(
    existingVariable: VariableState,
    newVariable: VariableState
  ): Promise<void> {
    if (!this.config.preserveVariableTypes) return

    const typeValidator = this.stateValidators.get('variable_type')
    if (typeValidator) {
      const result = await typeValidator.validate(
        `variables.${newVariable.Name}`,
        existingVariable,
        newVariable
      )

      if (!result.valid && this.config.handleStateConflicts === 'error') {
        throw new Error(`Variable type consistency violation: ${result.issues.join(', ')}`)
      }
    }
  }

  private async queueStateUpdate(executionId: string, update: StateUpdate): Promise<void> {
    const queue = this.synchronizationQueue.get(executionId) || []
    queue.push(update)
    this.synchronizationQueue.set(executionId, queue)

    logger.debug('State update queued', { executionId, updateType: update.type, path: update.path })
  }

  private async processStateUpdateQueues(
    workflowExecutionId: string,
    journeyExecutionId: string
  ): Promise<void> {
    const workflowQueue = this.synchronizationQueue.get(workflowExecutionId) || []
    const journeyQueue = this.synchronizationQueue.get(journeyExecutionId) || []

    // Process workflow updates to journey
    for (const update of workflowQueue) {
      await this.applyStateUpdate(journeyExecutionId, update)
    }

    // Process journey updates to workflow
    for (const update of journeyQueue) {
      await this.applyStateUpdate(workflowExecutionId, update)
    }

    // Clear queues
    this.synchronizationQueue.set(workflowExecutionId, [])
    this.synchronizationQueue.set(journeyExecutionId, [])
  }

  private async applyStateUpdate(executionId: string, update: StateUpdate): Promise<void> {
    const state = this.executionStates.get(executionId)
    if (!state) return

    try {
      // Apply update based on type and path
      const pathParts = update.path.split('.')
      let target: any = state

      // Navigate to target object
      for (let i = 0; i < pathParts.length - 1; i++) {
        target = target[pathParts[i]]
        if (!target) return // Path doesn't exist
      }

      // Apply the update
      const finalKey = pathParts[pathParts.length - 1]
      target[finalKey] = update.newValue

      logger.debug('State update applied', { executionId, path: update.path, type: update.type })
    } catch (error) {
      logger.error('Failed to apply state update', {
        executionId,
        update,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async synchronizeVariables(
    sourceVariables: Record<string, VariableState>,
    targetVariables: Record<string, VariableState>,
    direction: 'workflow_to_journey' | 'journey_to_workflow'
  ): Promise<{ changes: StateChange[]; conflicts: StateConflict[] }> {
    const changes: StateChange[] = []
    const conflicts: StateConflict[] = []

    for (const [Name, sourceVar] of Object.entries(sourceVariables)) {
      const targetVar = targetVariables[Name]

      if (!targetVar) {
        // Variable doesn't exist in target, add it
        targetVariables[Name] = { ...sourceVar }
        changes.push({
          type: 'variable_added',
          path: `variables.${Name}`,
          value: sourceVar,
          direction,
        })
      } else if (sourceVar.value !== targetVar.value) {
        // Variable values differ, handle based on conflict resolution strategy
        switch (this.config.handleStateConflicts) {
          case 'workflow_wins':
            if (direction === 'workflow_to_journey') {
              targetVariables[Name] = { ...sourceVar }
              changes.push({
                type: 'variable_updated',
                path: `variables.${Name}`,
                value: sourceVar,
                previousValue: targetVar,
                direction,
              })
            }
            break
          case 'journey_wins':
            if (direction === 'journey_to_workflow') {
              targetVariables[Name] = { ...sourceVar }
              changes.push({
                type: 'variable_updated',
                path: `variables.${Name}`,
                value: sourceVar,
                previousValue: targetVar,
                direction,
              })
            }
            break
          case 'merge': {
            // Attempt to merge values (implementation depends on value types)
            const mergedValue = await this.mergeVariableValues(targetVar, sourceVar)
            targetVariables[Name] = mergedValue
            changes.push({
              type: 'variable_merged',
              path: `variables.${Name}`,
              value: mergedValue,
              previousValue: targetVar,
              direction,
            })
            break
          }
          case 'error':
            conflicts.push({
              type: 'variable_value_conflict',
              path: `variables.${Name}`,
              workflowValue: direction === 'workflow_to_journey' ? sourceVar : targetVar,
              journeyValue: direction === 'workflow_to_journey' ? targetVar : sourceVar,
              resolution: 'unresolved',
            })
            break
        }
      }
    }

    return { changes, conflicts }
  }

  private async synchronizeContext(
    workflowContext: ContextState,
    journeyContext: ContextState,
    direction: 'workflow_to_journey' | 'journey_to_workflow' | 'bidirectional'
  ): Promise<void> {
    // Synchronize conversation history
    if (direction === 'journey_to_workflow' || direction === 'bidirectional') {
      workflowContext.conversationHistory = [...journeyContext.conversationHistory]
    }

    // Synchronize active tools
    if (direction === 'bidirectional') {
      const allTools = new Map()
      for (const tool of workflowContext.activeTools) {
        allTools.set(tool.Name, tool)
      }
      for (const tool of journeyContext.activeTools) {
        allTools.set(tool.Name, tool)
      }

      const mergedTools = Array.from(allTools.values())
      workflowContext.activeTools = mergedTools
      journeyContext.activeTools = mergedTools
    }
  }

  private async synchronizeProgress(
    workflowProgress: ProgressState,
    journeyProgress: ProgressState,
    direction: 'workflow_to_journey' | 'journey_to_workflow' | 'bidirectional'
  ): Promise<void> {
    if (direction === 'workflow_to_journey' || direction === 'bidirectional') {
      journeyProgress.completedSteps = [...workflowProgress.completedSteps]
      journeyProgress.percentage = workflowProgress.percentage
    }

    if (direction === 'journey_to_workflow' || direction === 'bidirectional') {
      workflowProgress.completedSteps = [...journeyProgress.completedSteps]
      workflowProgress.percentage = journeyProgress.percentage
    }
  }

  private async synchronizeSession(
    workflowSession: SessionState,
    journeySession: SessionState,
    direction: 'workflow_to_journey' | 'journey_to_workflow' | 'bidirectional'
  ): Promise<void> {
    // Update last activity time to most recent
    const workflowTime = new Date(workflowSession.lastActivity).getTime()
    const journeyTime = new Date(journeySession.lastActivity).getTime()
    const lastActivity = new Date(Math.max(workflowTime, journeyTime)).toISOString()

    workflowSession.lastActivity = lastActivity
    journeySession.lastActivity = lastActivity

    // Merge temporary data
    if (direction === 'bidirectional') {
      const mergedData = { ...workflowSession.temporaryData, ...journeySession.temporaryData }
      workflowSession.temporaryData = mergedData
      journeySession.temporaryData = mergedData
    }
  }

  private async validateVariableConsistency(
    workflowVariables: Record<string, VariableState>,
    journeyVariables: Record<string, VariableState>
  ): Promise<StateInconsistency[]> {
    const inconsistencies: StateInconsistency[] = []

    const allVariableNames = new Set([
      ...Object.keys(workflowVariables),
      ...Object.keys(journeyVariables),
    ])

    for (const Name of allVariableNames) {
      const workflowVar = workflowVariables[Name]
      const journeyVar = journeyVariables[Name]

      if (!workflowVar && journeyVar) {
        inconsistencies.push({
          type: 'missing_variable',
          path: `variables.${Name}`,
          description: `Variable exists in journey but not in workflow`,
          severity: 'warning',
          workflowValue: undefined,
          journeyValue: journeyVar,
        })
      } else if (workflowVar && !journeyVar) {
        inconsistencies.push({
          type: 'missing_variable',
          path: `variables.${Name}`,
          description: `Variable exists in workflow but not in journey`,
          severity: 'warning',
          workflowValue: workflowVar,
          journeyValue: undefined,
        })
      } else if (workflowVar && journeyVar) {
        // Check value consistency
        if (workflowVar.value !== journeyVar.value) {
          inconsistencies.push({
            type: 'value_mismatch',
            path: `variables.${Name}.value`,
            description: `Variable values differ between workflow and journey`,
            severity: 'error',
            workflowValue: workflowVar.value,
            journeyValue: journeyVar.value,
          })
        }

        // Check type consistency
        if (workflowVar.type !== journeyVar.type) {
          inconsistencies.push({
            type: 'type_mismatch',
            path: `variables.${Name}.type`,
            description: `Variable types differ between workflow and journey`,
            severity: 'error',
            workflowValue: workflowVar.type,
            journeyValue: journeyVar.type,
          })
        }
      }
    }

    return inconsistencies
  }

  private async validateContextConsistency(
    workflowContext: ContextState,
    journeyContext: ContextState
  ): Promise<StateInconsistency[]> {
    const inconsistencies: StateInconsistency[] = []

    // Compare conversation history lengths (journey should have more or equal)
    if (workflowContext.conversationHistory.length > journeyContext.conversationHistory.length) {
      inconsistencies.push({
        type: 'data_inconsistency',
        path: 'context.conversationHistory.length',
        description: 'Workflow has more conversation history than journey',
        severity: 'warning',
        workflowValue: workflowContext.conversationHistory.length,
        journeyValue: journeyContext.conversationHistory.length,
      })
    }

    return inconsistencies
  }

  private async validateProgressConsistency(
    workflowProgress: ProgressState,
    journeyProgress: ProgressState
  ): Promise<StateInconsistency[]> {
    const inconsistencies: StateInconsistency[] = []

    // Compare completion percentages
    const percentageDiff = Math.abs(workflowProgress.percentage - journeyProgress.percentage)
    if (percentageDiff > 5) {
      // 5% tolerance
      inconsistencies.push({
        type: 'progress_mismatch',
        path: 'progress.percentage',
        description: 'Progress percentages differ significantly',
        severity: 'warning',
        workflowValue: workflowProgress.percentage,
        journeyValue: journeyProgress.percentage,
      })
    }

    return inconsistencies
  }

  private async generateConsistencyRecommendations(
    inconsistencies: StateInconsistency[]
  ): Promise<string[]> {
    const recommendations = new Set<string>()

    for (const inconsistency of inconsistencies) {
      switch (inconsistency.type) {
        case 'missing_variable':
          recommendations.add(
            'Ensure all variables are properly synchronized between execution modes'
          )
          break
        case 'value_mismatch':
          recommendations.add('Review variable update logic to ensure consistency')
          break
        case 'type_mismatch':
          recommendations.add('Enforce variable type consistency across execution modes')
          break
        case 'progress_mismatch':
          recommendations.add(
            'Synchronize progress tracking between workflow and journey execution'
          )
          break
        case 'data_inconsistency':
          recommendations.add('Review data flow to ensure proper state management')
          break
      }
    }

    return Array.from(recommendations)
  }

  private async mergeVariableValues(
    targetVar: VariableState,
    sourceVar: VariableState
  ): Promise<VariableState> {
    // Simple merge strategy - take the most recently updated value
    const targetTime = new Date(targetVar.lastUpdated).getTime()
    const sourceTime = new Date(sourceVar.lastUpdated).getTime()

    return sourceTime > targetTime ? sourceVar : targetVar
  }

  private shouldEncryptVariable(Name: string, value: any): boolean {
    // Encrypt sensitive variables
    const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i, /credential/i]

    return sensitivePatterns.some((pattern) => pattern.test(Name))
  }

  private isSignificantChange(type: string, oldValue: any, newValue: any): boolean {
    if (type === 'variable') {
      // Consider type changes or large value changes as significant
      if (typeof oldValue !== typeof newValue) return true
      if (typeof oldValue === 'string' && Math.abs(oldValue.length - newValue.length) > 100)
        return true
      if (typeof oldValue === 'number' && Math.abs(oldValue - newValue) > oldValue * 0.1)
        return true
    }

    return false
  }

  private async acquireLock(
    executionId: string,
    resource: string,
    type: 'read' | 'write' | 'exclusive'
  ): Promise<void> {
    const lockId = `${executionId}:${resource}`
    const existingLock = this.stateLocks.get(lockId)

    if (existingLock && new Date(existingLock.expiresAt) > new Date()) {
      // Lock still valid, wait or throw error based on type
      throw new Error(`Resource ${resource} is locked by ${existingLock.acquiredBy}`)
    }

    const lock: StateLock = {
      id: lockId,
      resource,
      type,
      acquiredBy: executionId,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30000).toISOString(), // 30 second default timeout
    }

    this.stateLocks.set(lockId, lock)
  }

  private async releaseLock(executionId: string, resource: string): Promise<void> {
    const lockId = `${executionId}:${resource}`
    this.stateLocks.delete(lockId)
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

interface StateValidator {
  validate(
    path: string,
    oldValue: any,
    newValue: any
  ): Promise<{ valid: boolean; issues: string[] }>
}

interface StateUpdate {
  type: string
  path: string
  oldValue: any
  newValue: any
  timestamp: string
  source: string
}

interface StateSnapshot {
  id: string
  executionId: string
  timestamp: string
  reason: string
  state: ExecutionState
  size: number
}

interface StateSynchronizationResult {
  synchronized: boolean
  reason?: string
  error?: string
  changes: StateChange[]
  conflicts: StateConflict[]
  direction?: string
  timestamp?: string
}

interface StateChange {
  type:
    | 'variable_added'
    | 'variable_updated'
    | 'variable_merged'
    | 'context_updated'
    | 'progress_updated'
  path: string
  value: any
  previousValue?: any
  direction: 'workflow_to_journey' | 'journey_to_workflow'
}

interface StateConflict {
  type: 'variable_value_conflict' | 'context_conflict' | 'progress_conflict'
  path: string
  workflowValue: any
  journeyValue: any
  resolution: 'workflow_wins' | 'journey_wins' | 'merged' | 'unresolved'
}

interface StateConsistencyReport {
  consistent: boolean
  consistencyScore: number
  inconsistencies: StateInconsistency[]
  totalChecks: number
  workflowExecutionId: string
  journeyExecutionId: string
  validatedAt: string
  recommendations: string[]
}

interface StateInconsistency {
  type:
    | 'missing_variable'
    | 'value_mismatch'
    | 'type_mismatch'
    | 'progress_mismatch'
    | 'data_inconsistency'
  path: string
  description: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  workflowValue: any
  journeyValue: any
}
