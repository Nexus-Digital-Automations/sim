/**
 * Debug Service
 * Provides debugging tools including step-by-step execution, replay, and variable inspection
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  Breakpoint,
  DebugSession,
  ExecutionDifference,
  ExecutionReplayOptions,
  ExecutionStep,
  IDebugService,
  ReplayResult,
  TraceSpan,
  VariableInspection,
  WorkflowExecutionLog,
} from '../types'

const logger = createLogger('DebugService')

interface ActiveDebugSession {
  session: DebugSession
  executionData: WorkflowExecutionLog | null
  currentStepIndex: number
  breakpointHits: Map<string, number>
  variableStates: Map<string, Map<string, unknown>>
}

interface ReplayExecution {
  replayId: string
  originalExecutionId: string
  options: ExecutionReplayOptions
  status: 'preparing' | 'running' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  steps: ExecutionStep[]
  differences: ExecutionDifference[]
}

export class DebugService implements IDebugService {
  private static instance: DebugService
  private activeSessions = new Map<string, ActiveDebugSession>()
  private replayExecutions = new Map<string, ReplayExecution>()
  private cleanupInterval: NodeJS.Timeout

  private readonly SESSION_TIMEOUT_MS = 3600000 // 1 hour
  private readonly CLEANUP_INTERVAL_MS = 300000 // 5 minutes

  private constructor() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, this.CLEANUP_INTERVAL_MS)

    logger.info('DebugService initialized')
  }

  static getInstance(): DebugService {
    if (!DebugService.instance) {
      DebugService.instance = new DebugService()
    }
    return DebugService.instance
  }

  /**
   * Create a new debug session for an execution
   */
  async createDebugSession(executionId: string, userId: string): Promise<DebugSession> {
    const operationId = `debug-session-${executionId}-${Date.now()}`
    logger.debug(`[${operationId}] Creating debug session for execution ${executionId}`)

    try {
      // Check if session already exists
      const existingSession = Array.from(this.activeSessions.values()).find(
        (session) =>
          session.session.executionId === executionId && session.session.userId === userId
      )

      if (existingSession) {
        logger.debug(`[${operationId}] Returning existing debug session`)
        return existingSession.session
      }

      // Get execution data - this would typically query the database
      const executionData = await this.getExecutionData(executionId)
      if (!executionData) {
        throw new Error(`Execution data not found for ID: ${executionId}`)
      }

      // Create new debug session
      const session: DebugSession = {
        id: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        executionId,
        workflowId: executionData.workflowId,
        userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        breakpoints: [],
        variableInspections: [],
        executionSteps: await this.buildExecutionSteps(executionData),
      }

      // Store active session
      const activeSession: ActiveDebugSession = {
        session,
        executionData,
        currentStepIndex: 0,
        breakpointHits: new Map(),
        variableStates: new Map(),
      }
      this.activeSessions.set(session.id, activeSession)

      logger.info(`[${operationId}] Debug session created: ${session.id}`, {
        executionId,
        workflowId: session.workflowId,
        stepsCount: session.executionSteps.length,
      })

      return session
    } catch (error) {
      logger.error(`[${operationId}] Error creating debug session:`, error)
      throw error
    }
  }

  /**
   * Add a breakpoint to a debug session
   */
  async addBreakpoint(
    sessionId: string,
    breakpoint: Omit<Breakpoint, 'id' | 'hitCount'>
  ): Promise<Breakpoint> {
    const operationId = `add-breakpoint-${sessionId}-${breakpoint.blockId}`
    logger.debug(`[${operationId}] Adding breakpoint`)

    try {
      const activeSession = this.activeSessions.get(sessionId)
      if (!activeSession) {
        throw new Error(`Debug session not found: ${sessionId}`)
      }

      // Create breakpoint
      const fullBreakpoint: Breakpoint = {
        ...breakpoint,
        id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        hitCount: 0,
      }

      // Add to session
      activeSession.session.breakpoints.push(fullBreakpoint)

      // Initialize hit counter
      activeSession.breakpointHits.set(fullBreakpoint.id, 0)

      logger.info(`[${operationId}] Breakpoint added: ${fullBreakpoint.id}`, {
        blockId: breakpoint.blockId,
        blockName: breakpoint.blockName,
        condition: breakpoint.condition,
      })

      return fullBreakpoint
    } catch (error) {
      logger.error(`[${operationId}] Error adding breakpoint:`, error)
      throw error
    }
  }

  /**
   * Inspect a variable at a specific block in the execution
   */
  async inspectVariable(
    sessionId: string,
    blockId: string,
    variableName: string
  ): Promise<VariableInspection> {
    const operationId = `inspect-var-${sessionId}-${blockId}-${variableName}`
    logger.debug(`[${operationId}] Inspecting variable`)

    try {
      const activeSession = this.activeSessions.get(sessionId)
      if (!activeSession) {
        throw new Error(`Debug session not found: ${sessionId}`)
      }

      // Get variable value from execution data
      const variableValue = await this.getVariableValue(
        activeSession.executionData!,
        blockId,
        variableName
      )

      // Create inspection record
      const inspection: VariableInspection = {
        id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        blockId,
        variableName,
        value: variableValue.value,
        type: variableValue.type,
        timestamp: new Date().toISOString(),
        stackTrace: variableValue.stackTrace,
      }

      // Add to session
      activeSession.session.variableInspections.push(inspection)

      // Cache variable state
      if (!activeSession.variableStates.has(blockId)) {
        activeSession.variableStates.set(blockId, new Map())
      }
      activeSession.variableStates.get(blockId)!.set(variableName, variableValue.value)

      logger.info(`[${operationId}] Variable inspected: ${variableName}`, {
        blockId,
        type: variableValue.type,
        hasValue: variableValue.value !== undefined,
      })

      return inspection
    } catch (error) {
      logger.error(`[${operationId}] Error inspecting variable:`, error)
      throw error
    }
  }

  /**
   * Replay an execution with optional modifications
   */
  async replayExecution(options: ExecutionReplayOptions): Promise<ReplayResult> {
    const operationId = `replay-${options.executionId}-${Date.now()}`
    logger.debug(`[${operationId}] Starting execution replay`, { options })

    try {
      // Get original execution data
      const originalExecution = await this.getExecutionData(options.executionId)
      if (!originalExecution) {
        throw new Error(`Original execution not found: ${options.executionId}`)
      }

      // Create replay execution tracking
      const replayId = `replay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const replay: ReplayExecution = {
        replayId,
        originalExecutionId: options.executionId,
        options,
        status: 'preparing',
        startTime: Date.now(),
        steps: [],
        differences: [],
      }
      this.replayExecutions.set(replayId, replay)

      // Start replay process
      const result = await this.executeReplay(replay, originalExecution)

      logger.info(`[${operationId}] Execution replay completed: ${replayId}`, {
        status: result.status,
        differences: result.differences.length,
      })

      return result
    } catch (error) {
      logger.error(`[${operationId}] Error replaying execution:`, error)
      throw error
    }
  }

  /**
   * Get execution timeline with detailed steps
   */
  async getExecutionTimeline(executionId: string): Promise<ExecutionStep[]> {
    const operationId = `timeline-${executionId}`
    logger.debug(`[${operationId}] Building execution timeline`)

    try {
      const executionData = await this.getExecutionData(executionId)
      if (!executionData) {
        throw new Error(`Execution data not found: ${executionId}`)
      }

      const timeline = await this.buildExecutionSteps(executionData)

      logger.debug(`[${operationId}] Built timeline with ${timeline.length} steps`)
      return timeline
    } catch (error) {
      logger.error(`[${operationId}] Error building execution timeline:`, error)
      throw error
    }
  }

  /**
   * Get execution data (mock implementation - would query database)
   */
  private async getExecutionData(executionId: string): Promise<WorkflowExecutionLog | null> {
    // This would typically query the execution logs database
    // For now, return mock data
    return {
      id: `log-${executionId}`,
      workflowId: 'workflow-123',
      executionId,
      stateSnapshotId: 'snapshot-123',
      level: 'info',
      trigger: 'manual',
      startedAt: new Date(Date.now() - 300000).toISOString(),
      endedAt: new Date().toISOString(),
      totalDurationMs: 45000,
      executionData: {
        traceSpans: this.generateMockTraceSpans(),
        environment: {
          variables: { API_KEY: 'hidden', USER_ID: 'user-123' },
          workflowId: 'workflow-123',
          executionId,
          userId: 'user-123',
          workspaceId: 'workspace-123',
        },
      },
      cost: {
        total: 0.15,
        input: 0.08,
        output: 0.07,
        tokens: { prompt: 150, completion: 75, total: 225 },
      },
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Build execution steps from trace spans
   */
  private async buildExecutionSteps(executionData: WorkflowExecutionLog): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = []

    if (!executionData.executionData?.traceSpans) {
      return steps
    }

    const traceSpans = executionData.executionData.traceSpans as TraceSpan[]

    for (const span of traceSpans) {
      // Add step for block entry
      steps.push({
        id: `step-${span.id}-enter`,
        blockId: span.blockId || span.id,
        blockName: span.name,
        blockType: span.type,
        action: 'enter',
        timestamp: span.startTime,
        data: span.input,
        duration: 0,
      })

      // Add step for block execution
      steps.push({
        id: `step-${span.id}-execute`,
        blockId: span.blockId || span.id,
        blockName: span.name,
        blockType: span.type,
        action: 'execute',
        timestamp: span.startTime,
        data: { input: span.input, status: span.status },
        duration: span.duration,
      })

      // Add step for block output
      if (span.status === 'error') {
        steps.push({
          id: `step-${span.id}-error`,
          blockId: span.blockId || span.id,
          blockName: span.name,
          blockType: span.type,
          action: 'error',
          timestamp: span.endTime,
          data: span.output,
          duration: span.duration,
        })
      } else {
        steps.push({
          id: `step-${span.id}-output`,
          blockId: span.blockId || span.id,
          blockName: span.name,
          blockType: span.type,
          action: 'output',
          timestamp: span.endTime,
          data: span.output,
          duration: span.duration,
        })
      }

      // Add step for block exit
      steps.push({
        id: `step-${span.id}-exit`,
        blockId: span.blockId || span.id,
        blockName: span.name,
        blockType: span.type,
        action: 'exit',
        timestamp: span.endTime,
        data: { status: span.status },
        duration: span.duration,
      })

      // Process children recursively
      if (span.children && span.children.length > 0) {
        const childSteps = await this.buildExecutionSteps({
          ...executionData,
          executionData: {
            ...executionData.executionData,
            traceSpans: span.children,
          },
        })
        steps.push(...childSteps)
      }
    }

    // Sort by timestamp
    steps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return steps
  }

  /**
   * Get variable value from execution data
   */
  private async getVariableValue(
    executionData: WorkflowExecutionLog,
    blockId: string,
    variableName: string
  ): Promise<{ value: unknown; type: string; stackTrace?: string[] }> {
    // Find the relevant trace span
    const traceSpans = (executionData.executionData?.traceSpans as TraceSpan[]) || []
    const targetSpan = this.findTraceSpan(traceSpans, blockId)

    if (!targetSpan) {
      return {
        value: undefined,
        type: 'undefined',
      }
    }

    // Look for variable in input or output
    let value: unknown
    let type = 'undefined'

    if (targetSpan.input && typeof targetSpan.input === 'object') {
      const inputObj = targetSpan.input as Record<string, unknown>
      if (variableName in inputObj) {
        value = inputObj[variableName]
        type = typeof value
      }
    }

    if (value === undefined && targetSpan.output && typeof targetSpan.output === 'object') {
      const outputObj = targetSpan.output as Record<string, unknown>
      if (variableName in outputObj) {
        value = outputObj[variableName]
        type = typeof value
      }
    }

    // Check environment variables
    if (value === undefined && executionData.executionData?.environment?.variables) {
      const envVars = executionData.executionData.environment.variables
      if (variableName in envVars) {
        value = envVars[variableName]
        type = typeof value
      }
    }

    return {
      value,
      type: Array.isArray(value) ? 'array' : type,
      stackTrace: [`Block: ${targetSpan.name} (${targetSpan.type})`],
    }
  }

  /**
   * Find trace span by block ID
   */
  private findTraceSpan(traceSpans: TraceSpan[], blockId: string): TraceSpan | null {
    for (const span of traceSpans) {
      if (span.blockId === blockId || span.id === blockId) {
        return span
      }

      if (span.children && span.children.length > 0) {
        const childResult = this.findTraceSpan(span.children, blockId)
        if (childResult) {
          return childResult
        }
      }
    }
    return null
  }

  /**
   * Execute replay with modifications
   */
  private async executeReplay(
    replay: ReplayExecution,
    originalExecution: WorkflowExecutionLog
  ): Promise<ReplayResult> {
    const operationId = `execute-replay-${replay.replayId}`
    logger.debug(`[${operationId}] Executing replay`)

    try {
      replay.status = 'running'

      // Build original execution steps
      const originalSteps = await this.buildExecutionSteps(originalExecution)

      // Apply modifications and simulate execution
      const modifiedSteps = await this.applyReplayModifications(originalSteps, replay.options)

      // Calculate differences
      const differences = await this.calculateExecutionDifferences(originalSteps, modifiedSteps)

      replay.steps = modifiedSteps
      replay.differences = differences
      replay.status = 'completed'
      replay.endTime = Date.now()

      // In a real implementation, this would:
      // 1. Create a new execution with modified inputs
      // 2. Run through the workflow executor
      // 3. Compare results with original execution

      const result: ReplayResult = {
        replayId: replay.replayId,
        originalExecutionId: replay.originalExecutionId,
        status: replay.status,
        startedAt: new Date(replay.startTime).toISOString(),
        completedAt: new Date(replay.endTime).toISOString(),
        differences,
        newExecutionId: `replay-exec-${replay.replayId}`,
      }

      logger.info(`[${operationId}] Replay execution completed`, {
        replayId: replay.replayId,
        differences: differences.length,
        duration: replay.endTime - replay.startTime,
      })

      return result
    } catch (error) {
      replay.status = 'failed'
      replay.endTime = Date.now()

      logger.error(`[${operationId}] Replay execution failed:`, error)
      throw error
    }
  }

  /**
   * Apply replay modifications to execution steps
   */
  private async applyReplayModifications(
    originalSteps: ExecutionStep[],
    options: ExecutionReplayOptions
  ): Promise<ExecutionStep[]> {
    let modifiedSteps = [...originalSteps]

    // Apply start/end filters
    if (options.startFromBlockId || options.endAtBlockId) {
      const startIndex = options.startFromBlockId
        ? modifiedSteps.findIndex((step) => step.blockId === options.startFromBlockId)
        : 0
      const endIndex = options.endAtBlockId
        ? modifiedSteps.findIndex((step) => step.blockId === options.endAtBlockId)
        : modifiedSteps.length

      modifiedSteps = modifiedSteps.slice(startIndex, endIndex + 1)
    }

    // Skip blocks if specified
    if (options.skipBlocks && options.skipBlocks.length > 0) {
      modifiedSteps = modifiedSteps.filter((step) => !options.skipBlocks!.includes(step.blockId))
    }

    // Apply modified inputs
    if (options.modifiedInputs) {
      modifiedSteps = modifiedSteps.map((step) => {
        if (step.action === 'enter' && options.modifiedInputs) {
          const blockInputs = options.modifiedInputs[step.blockId]
          if (blockInputs) {
            return {
              ...step,
              data: { ...step.data, ...blockInputs },
            }
          }
        }
        return step
      })
    }

    return modifiedSteps
  }

  /**
   * Calculate differences between original and replay execution
   */
  private async calculateExecutionDifferences(
    originalSteps: ExecutionStep[],
    replaySteps: ExecutionStep[]
  ): Promise<ExecutionDifference[]> {
    const differences: ExecutionDifference[] = []

    // Group steps by block for comparison
    const originalByBlock = this.groupStepsByBlock(originalSteps)
    const replayByBlock = this.groupStepsByBlock(replaySteps)

    for (const [blockId, originalBlockSteps] of originalByBlock.entries()) {
      const replayBlockSteps = replayByBlock.get(blockId)

      if (!replayBlockSteps) {
        // Block was skipped in replay
        differences.push({
          blockId,
          blockName: originalBlockSteps[0]?.blockName || 'Unknown',
          type: 'execution_time_changed',
          original: originalBlockSteps[0]?.duration || 0,
          replay: 0,
          impact: 'medium',
        })
        continue
      }

      // Compare inputs
      const originalInput = originalBlockSteps.find((s) => s.action === 'enter')
      const replayInput = replayBlockSteps.find((s) => s.action === 'enter')

      if (
        originalInput &&
        replayInput &&
        JSON.stringify(originalInput.data) !== JSON.stringify(replayInput.data)
      ) {
        differences.push({
          blockId,
          blockName: originalInput.blockName,
          type: 'input_changed',
          original: originalInput.data,
          replay: replayInput.data,
          impact: 'high',
        })
      }

      // Compare outputs
      const originalOutput = originalBlockSteps.find(
        (s) => s.action === 'output' || s.action === 'error'
      )
      const replayOutput = replayBlockSteps.find(
        (s) => s.action === 'output' || s.action === 'error'
      )

      if (
        originalOutput &&
        replayOutput &&
        JSON.stringify(originalOutput.data) !== JSON.stringify(replayOutput.data)
      ) {
        differences.push({
          blockId,
          blockName: originalOutput.blockName,
          type: 'output_changed',
          original: originalOutput.data,
          replay: replayOutput.data,
          impact: 'high',
        })
      }

      // Compare execution times
      const originalDuration = originalBlockSteps.reduce(
        (sum, step) => sum + (step.duration || 0),
        0
      )
      const replayDuration = replayBlockSteps.reduce((sum, step) => sum + (step.duration || 0), 0)

      if (Math.abs(originalDuration - replayDuration) > 1000) {
        // More than 1 second difference
        differences.push({
          blockId,
          blockName: originalBlockSteps[0]?.blockName || 'Unknown',
          type: 'execution_time_changed',
          original: originalDuration,
          replay: replayDuration,
          impact: Math.abs(originalDuration - replayDuration) > 10000 ? 'high' : 'medium',
        })
      }
    }

    return differences
  }

  /**
   * Group execution steps by block ID
   */
  private groupStepsByBlock(steps: ExecutionStep[]): Map<string, ExecutionStep[]> {
    const grouped = new Map<string, ExecutionStep[]>()

    for (const step of steps) {
      if (!grouped.has(step.blockId)) {
        grouped.set(step.blockId, [])
      }
      grouped.get(step.blockId)!.push(step)
    }

    return grouped
  }

  /**
   * Generate mock trace spans for testing
   */
  private generateMockTraceSpans(): TraceSpan[] {
    return [
      {
        id: 'span-1',
        name: 'HTTP Request',
        type: 'http_request',
        duration: 1500,
        startTime: new Date(Date.now() - 300000).toISOString(),
        endTime: new Date(Date.now() - 298500).toISOString(),
        blockId: 'block-1',
        status: 'success',
        input: { url: 'https://api.example.com/data', method: 'GET' },
        output: { statusCode: 200, data: { result: 'success' } },
      },
      {
        id: 'span-2',
        name: 'Data Transformation',
        type: 'transform',
        duration: 500,
        startTime: new Date(Date.now() - 298500).toISOString(),
        endTime: new Date(Date.now() - 298000).toISOString(),
        blockId: 'block-2',
        status: 'success',
        input: { data: { result: 'success' } },
        output: { transformedData: { status: 'SUCCESS', timestamp: Date.now() } },
      },
    ]
  }

  /**
   * Complete a debug session
   */
  async completeDebugSession(sessionId: string): Promise<void> {
    const operationId = `complete-session-${sessionId}`
    logger.debug(`[${operationId}] Completing debug session`)

    try {
      const activeSession = this.activeSessions.get(sessionId)
      if (!activeSession) {
        throw new Error(`Debug session not found: ${sessionId}`)
      }

      activeSession.session.status = 'completed'
      activeSession.session.completedAt = new Date().toISOString()

      logger.info(`[${operationId}] Debug session completed: ${sessionId}`)

      // Remove session after delay for final queries
      setTimeout(() => {
        this.activeSessions.delete(sessionId)
      }, 60000) // 1 minute
    } catch (error) {
      logger.error(`[${operationId}] Error completing debug session:`, error)
      throw error
    }
  }

  /**
   * Get debug session status
   */
  getDebugSession(sessionId: string): DebugSession | null {
    const activeSession = this.activeSessions.get(sessionId)
    return activeSession ? activeSession.session : null
  }

  /**
   * Get all active debug sessions for a user
   */
  getUserDebugSessions(userId: string): DebugSession[] {
    return Array.from(this.activeSessions.values())
      .map((session) => session.session)
      .filter((session) => session.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  /**
   * Get replay execution status
   */
  getReplayExecution(replayId: string): ReplayExecution | null {
    return this.replayExecutions.get(replayId) || null
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    let cleanedCount = 0

    // Clean up debug sessions
    for (const [sessionId, activeSession] of this.activeSessions.entries()) {
      const sessionAge = now - new Date(activeSession.session.createdAt).getTime()

      if (sessionAge > this.SESSION_TIMEOUT_MS || activeSession.session.status === 'completed') {
        this.activeSessions.delete(sessionId)
        cleanedCount++
      }
    }

    // Clean up completed replay executions
    for (const [replayId, replay] of this.replayExecutions.entries()) {
      if (replay.status === 'completed' || replay.status === 'failed') {
        const completionAge = replay.endTime ? now - replay.endTime : now - replay.startTime

        if (completionAge > this.SESSION_TIMEOUT_MS) {
          this.replayExecutions.delete(replayId)
          cleanedCount++
        }
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired debug sessions and replays`)
    }
  }

  /**
   * Get debug service statistics
   */
  getServiceStats(): {
    activeSessions: number
    activeReplays: number
    totalBreakpoints: number
    totalInspections: number
  } {
    let totalBreakpoints = 0
    let totalInspections = 0

    for (const session of this.activeSessions.values()) {
      totalBreakpoints += session.session.breakpoints.length
      totalInspections += session.session.variableInspections.length
    }

    return {
      activeSessions: this.activeSessions.size,
      activeReplays: this.replayExecutions.size,
      totalBreakpoints,
      totalInspections,
    }
  }

  /**
   * Destroy the service and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.activeSessions.clear()
    this.replayExecutions.clear()

    logger.info('DebugService destroyed and resources cleaned up')
  }
}

// Export singleton instance
export const debugService = DebugService.getInstance()
