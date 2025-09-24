/**
 * Real-time State Manager for Conversational Workflows
 * ===================================================
 *
 * Manages real-time state updates and communication for
 * conversational workflow sessions using Socket.io integration.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ConversationalWorkflowState,
  ConversationalWorkflowUpdate,
  WorkflowUpdateType,
} from './types'
import { RealtimeCommunicationError } from './errors'

const logger = createLogger('ConversationalWorkflowStateManager')

/**
 * Real-time state manager for workflow sessions
 */
export class RealtimeStateManager {
  // Session state storage
  private readonly sessionStates = new Map<string, ConversationalWorkflowState>()

  // Session subscribers for real-time updates
  private readonly sessionSubscribers = new Map<string, Set<(update: ConversationalWorkflowUpdate) => void>>()

  // Update history for debugging and replay
  private readonly updateHistory = new Map<string, ConversationalWorkflowUpdate[]>()

  // Performance metrics
  private metrics = {
    totalSessions: 0,
    activeSubscribers: 0,
    totalUpdates: 0,
    averageUpdateLatency: 0,
  }

  constructor() {
    logger.info('Real-time State Manager initialized')

    // Set up periodic cleanup
    this.setupPeriodicCleanup()
  }

  /**
   * Register a new conversational workflow session
   */
  async registerSession(sessionId: string, initialState: ConversationalWorkflowState): Promise<void> {
    logger.info('Registering conversational workflow session', { sessionId })

    try {
      // Store initial state
      this.sessionStates.set(sessionId, { ...initialState })

      // Initialize update history
      this.updateHistory.set(sessionId, [])

      // Initialize subscriber set
      this.sessionSubscribers.set(sessionId, new Set())

      // Update metrics
      this.metrics.totalSessions++

      logger.info('Session registered successfully', {
        sessionId,
        workflowId: initialState.workflowId,
        totalSessions: this.metrics.totalSessions,
      })

      // Broadcast session started event
      await this.broadcastSessionUpdate(sessionId, {
        updateId: this.generateUpdateId(),
        workflowId: initialState.workflowId,
        sessionId,
        updateType: 'execution-started',
        timestamp: new Date(),
        data: {
          initialState,
          sessionRegistered: true,
        },
        agentMessage: 'Session started and ready for interaction',
        showNotification: false,
      })
    } catch (error: any) {
      logger.error('Failed to register session', {
        sessionId,
        error: error.message,
      })

      throw new RealtimeCommunicationError(
        'Failed to register conversational workflow session',
        'SESSION_REGISTRATION_FAILED',
        'socket',
        { sessionId, originalError: error.message }
      )
    }
  }

  /**
   * Update session state and broadcast changes
   */
  async updateSession(sessionId: string, stateUpdates: Partial<ConversationalWorkflowState>): Promise<ConversationalWorkflowState> {
    const startTime = Date.now()

    logger.info('Updating session state', {
      sessionId,
      updateFields: Object.keys(stateUpdates),
    })

    try {
      const currentState = this.sessionStates.get(sessionId)
      if (!currentState) {
        throw new RealtimeCommunicationError(
          'Session not found',
          'SESSION_NOT_FOUND',
          'socket',
          { sessionId }
        )
      }

      // Merge updates with current state
      const updatedState: ConversationalWorkflowState = {
        ...currentState,
        ...stateUpdates,
        lastUpdatedAt: new Date(),
      }

      // Validate state consistency
      this.validateStateConsistency(updatedState)

      // Store updated state
      this.sessionStates.set(sessionId, updatedState)

      // Create state change update
      const stateUpdate: ConversationalWorkflowUpdate = {
        updateId: this.generateUpdateId(),
        workflowId: updatedState.workflowId,
        sessionId,
        updateType: this.determineUpdateType(currentState, updatedState),
        timestamp: new Date(),
        data: {
          stateChanges: stateUpdates,
          previousState: this.sanitizeStateForTransmission(currentState),
          currentState: this.sanitizeStateForTransmission(updatedState),
        },
        showNotification: this.shouldShowNotification(currentState, updatedState),
      }

      // Broadcast state update
      await this.broadcastSessionUpdate(sessionId, stateUpdate)

      // Update performance metrics
      const updateLatency = Date.now() - startTime
      this.updateLatencyMetrics(updateLatency)

      logger.info('Session state updated successfully', {
        sessionId,
        updateType: stateUpdate.updateType,
        updateLatency,
      })

      return updatedState
    } catch (error: any) {
      logger.error('Failed to update session state', {
        sessionId,
        error: error.message,
        stateUpdates,
      })

      throw new RealtimeCommunicationError(
        'Failed to update session state',
        'SESSION_UPDATE_FAILED',
        'socket',
        { sessionId, updateFields: Object.keys(stateUpdates), originalError: error.message }
      )
    }
  }

  /**
   * Subscribe to session updates
   */
  subscribeToSession(
    sessionId: string,
    callback: (update: ConversationalWorkflowUpdate) => void
  ): () => void {
    logger.info('Adding subscriber to session', { sessionId })

    const subscribers = this.sessionSubscribers.get(sessionId)
    if (!subscribers) {
      throw new RealtimeCommunicationError(
        'Session not found for subscription',
        'SESSION_NOT_FOUND',
        'socket',
        { sessionId }
      )
    }

    subscribers.add(callback)
    this.metrics.activeSubscribers++

    // Return unsubscribe function
    return () => {
      subscribers.delete(callback)
      this.metrics.activeSubscribers--
      logger.info('Removed subscriber from session', { sessionId })
    }
  }

  /**
   * Broadcast update to all session subscribers
   */
  async broadcastUpdate(update: ConversationalWorkflowUpdate): Promise<void> {
    await this.broadcastSessionUpdate(update.sessionId, update)
  }

  /**
   * Get current session state
   */
  getSessionState(sessionId: string): ConversationalWorkflowState | null {
    return this.sessionStates.get(sessionId) || null
  }

  /**
   * Get update history for session
   */
  getUpdateHistory(sessionId: string, limit: number = 50): ConversationalWorkflowUpdate[] {
    const history = this.updateHistory.get(sessionId) || []
    return history.slice(-limit)
  }

  /**
   * Unregister session and cleanup resources
   */
  async unregisterSession(sessionId: string): Promise<void> {
    logger.info('Unregistering session', { sessionId })

    try {
      const state = this.sessionStates.get(sessionId)
      if (state) {
        // Broadcast session ended event
        await this.broadcastSessionUpdate(sessionId, {
          updateId: this.generateUpdateId(),
          workflowId: state.workflowId,
          sessionId,
          updateType: 'execution-completed',
          timestamp: new Date(),
          data: {
            finalState: this.sanitizeStateForTransmission(state),
            sessionEnded: true,
          },
          agentMessage: 'Session ended',
          showNotification: false,
        })
      }

      // Cleanup resources
      this.sessionStates.delete(sessionId)
      this.updateHistory.delete(sessionId)

      const subscribers = this.sessionSubscribers.get(sessionId)
      if (subscribers) {
        this.metrics.activeSubscribers -= subscribers.size
        this.sessionSubscribers.delete(sessionId)
      }

      logger.info('Session unregistered successfully', { sessionId })
    } catch (error: any) {
      logger.error('Failed to unregister session', {
        sessionId,
        error: error.message,
      })
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics }
  }

  /**
   * Broadcast update to session subscribers
   */
  private async broadcastSessionUpdate(sessionId: string, update: ConversationalWorkflowUpdate): Promise<void> {
    const subscribers = this.sessionSubscribers.get(sessionId)
    if (!subscribers || subscribers.size === 0) {
      logger.debug('No subscribers for session update', { sessionId })
      return
    }

    // Store update in history
    this.storeUpdateInHistory(sessionId, update)

    // Broadcast to all subscribers
    const broadcastPromises = Array.from(subscribers).map(async (callback) => {
      try {
        callback(update)
      } catch (error: any) {
        logger.error('Subscriber callback failed', {
          sessionId,
          error: error.message,
        })
      }
    })

    await Promise.allSettled(broadcastPromises)

    // Update metrics
    this.metrics.totalUpdates++

    logger.debug('Update broadcasted to subscribers', {
      sessionId,
      updateType: update.updateType,
      subscriberCount: subscribers.size,
    })
  }

  /**
   * Store update in history
   */
  private storeUpdateInHistory(sessionId: string, update: ConversationalWorkflowUpdate): void {
    const history = this.updateHistory.get(sessionId) || []
    history.push(update)

    // Keep only last 100 updates per session
    const maxHistory = 100
    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory)
    }

    this.updateHistory.set(sessionId, history)
  }

  /**
   * Determine update type based on state changes
   */
  private determineUpdateType(
    previousState: ConversationalWorkflowState,
    currentState: ConversationalWorkflowState
  ): WorkflowUpdateType {
    // Check execution status changes
    if (previousState.executionStatus !== currentState.executionStatus) {
      switch (currentState.executionStatus) {
        case 'running':
          return previousState.executionStatus === 'not-started' ? 'execution-started' : 'execution-resumed'
        case 'paused':
          return 'execution-paused'
        case 'completed':
          return 'execution-completed'
        case 'failed':
          return 'execution-failed'
        case 'cancelled':
          return 'execution-cancelled'
        case 'waiting-for-input':
          return 'input-required'
      }
    }

    // Check node changes
    if (previousState.currentNodeId !== currentState.currentNodeId) {
      if (currentState.failedNodes.length > previousState.failedNodes.length) {
        return 'node-failed'
      }
      if (currentState.completedNodes.length > previousState.completedNodes.length) {
        return 'node-completed'
      }
      return 'node-started'
    }

    // Check for input requirements
    if (!previousState.awaitingUserInput && currentState.awaitingUserInput) {
      return 'input-required'
    }

    // Default to progress update
    return 'progress-update'
  }

  /**
   * Determine if update should show notification
   */
  private shouldShowNotification(
    previousState: ConversationalWorkflowState,
    currentState: ConversationalWorkflowState
  ): boolean {
    // Show notification for significant state changes
    const significantChanges = [
      previousState.executionStatus !== currentState.executionStatus,
      currentState.errorCount > previousState.errorCount,
      currentState.awaitingUserInput !== previousState.awaitingUserInput,
      currentState.completedNodes.length > previousState.completedNodes.length,
    ]

    return significantChanges.some(Boolean)
  }

  /**
   * Validate state consistency
   */
  private validateStateConsistency(state: ConversationalWorkflowState): void {
    // Check completion percentage consistency
    const completedCount = state.completedNodes.length
    const totalCount = state.totalNodes

    if (completedCount > totalCount) {
      throw new Error('Completed nodes count exceeds total nodes count')
    }

    // Check status consistency
    if (state.executionStatus === 'completed' && completedCount < totalCount) {
      throw new Error('Status is completed but not all nodes are completed')
    }

    // Check current node consistency
    if (state.currentNodeId && state.completedNodes.includes(state.currentNodeId)) {
      logger.warn('Current node is already in completed nodes', {
        sessionId: state.sessionId,
        currentNodeId: state.currentNodeId,
      })
    }
  }

  /**
   * Sanitize state for transmission (remove sensitive data)
   */
  private sanitizeStateForTransmission(state: ConversationalWorkflowState): Partial<ConversationalWorkflowState> {
    return {
      workflowId: state.workflowId,
      journeyId: state.journeyId,
      sessionId: state.sessionId,
      currentNodeId: state.currentNodeId,
      currentStateId: state.currentStateId,
      executionStatus: state.executionStatus,
      completedNodes: state.completedNodes,
      failedNodes: state.failedNodes,
      skippedNodes: state.skippedNodes,
      totalNodes: state.totalNodes,
      startedAt: state.startedAt,
      lastUpdatedAt: state.lastUpdatedAt,
      estimatedCompletionTime: state.estimatedCompletionTime,
      awaitingUserInput: state.awaitingUserInput,
      currentUserPrompt: state.currentUserPrompt,
      availableActions: state.availableActions,
      errorCount: state.errorCount,
      lastError: state.lastError,
    }
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    // Simple moving average for latency
    const alpha = 0.1 // Smoothing factor
    this.metrics.averageUpdateLatency =
      this.metrics.averageUpdateLatency * (1 - alpha) + latency * alpha
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  /**
   * Setup periodic cleanup of stale sessions
   */
  private setupPeriodicCleanup(): void {
    const cleanupInterval = 5 * 60 * 1000 // 5 minutes

    setInterval(() => {
      this.performCleanup()
    }, cleanupInterval)

    logger.info('Periodic cleanup scheduled', { intervalMs: cleanupInterval })
  }

  /**
   * Perform cleanup of stale sessions
   */
  private performCleanup(): void {
    const now = Date.now()
    const staleThreshold = 60 * 60 * 1000 // 1 hour
    const staleSessions: string[] = []

    for (const [sessionId, state] of this.sessionStates.entries()) {
      const timeSinceUpdate = now - state.lastUpdatedAt.getTime()

      if (timeSinceUpdate > staleThreshold) {
        staleSessions.push(sessionId)
      }
    }

    if (staleSessions.length > 0) {
      logger.info('Cleaning up stale sessions', {
        staleSessionCount: staleSessions.length,
        staleThresholdMs: staleThreshold,
      })

      for (const sessionId of staleSessions) {
        this.unregisterSession(sessionId).catch((error) => {
          logger.error('Failed to cleanup stale session', {
            sessionId,
            error: error.message,
          })
        })
      }
    }
  }
}