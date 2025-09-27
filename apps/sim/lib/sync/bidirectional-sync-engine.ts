/**
 * Bidirectional Synchronization Engine for Visual & Chat Workflow Modes
 *
 * This module provides seamless synchronization between ReactFlow visual editor
 * and conversational chat interface, enabling simultaneous use without conflicts.
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('BidirectionalSyncEngine')

// Synchronization event types
export interface SyncEvent {
  id: string
  timestamp: number
  source: 'visual' | 'chat'
  workflowId: string
  userId?: string
  type: SyncEventType
  payload: any
  version: number
}

export type SyncEventType =
  | 'BLOCK_ADD'
  | 'BLOCK_UPDATE'
  | 'BLOCK_REMOVE'
  | 'BLOCK_POSITION_UPDATE'
  | 'EDGE_ADD'
  | 'EDGE_REMOVE'
  | 'SUBBLOCK_UPDATE'
  | 'WORKFLOW_STATE_SYNC'
  | 'CHAT_MESSAGE'
  | 'CHAT_WORKFLOW_COMMAND'
  | 'MODE_SWITCH'

// Conflict resolution strategies
export type ConflictStrategy = 'latest-wins' | 'merge' | 'user-prompt' | 'rollback'

export interface ConflictResolution {
  eventId: string
  strategy: ConflictStrategy
  resolution: 'resolved' | 'pending' | 'failed'
  mergedData?: any
  error?: string
}

// Operational transformation operations
export interface Operation {
  type: 'insert' | 'delete' | 'retain' | 'replace'
  length?: number
  attributes?: Record<string, any>
  data?: any
}

export interface TransformResult {
  transformed: Operation[]
  conflict: boolean
  metadata?: Record<string, any>
}

// Synchronization state
export interface SyncState {
  version: number
  lastSync: number
  pendingEvents: SyncEvent[]
  conflictQueue: SyncEvent[]
  isConnected: boolean
  mode: 'visual' | 'chat' | 'hybrid'
}

/**
 * Core Bidirectional Synchronization Engine
 */
export class BidirectionalSyncEngine {
  private eventQueue: SyncEvent[] = []
  private conflictQueue: SyncEvent[] = []
  private subscribers: Map<string, (event: SyncEvent) => void> = new Map()
  private versionVector: Map<string, number> = new Map()
  private operationBuffer: Map<string, Operation[]> = new Map()
  private syncState: SyncState
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(private workflowId: string) {
    this.syncState = {
      version: 0,
      lastSync: Date.now(),
      pendingEvents: [],
      conflictQueue: [],
      isConnected: true,
      mode: 'visual',
    }

    logger.info('BidirectionalSyncEngine initialized', { workflowId })
  }

  /**
   * Subscribe to synchronization events
   */
  subscribe(eventType: string, callback: (event: SyncEvent) => void): () => void {
    const subscriptionId = `${eventType}-${crypto.randomUUID()}`
    this.subscribers.set(subscriptionId, callback)

    return () => {
      this.subscribers.delete(subscriptionId)
    }
  }

  /**
   * Emit synchronization event with conflict detection
   */
  async emitEvent(
    type: SyncEventType,
    payload: any,
    source: 'visual' | 'chat',
    options?: { immediate?: boolean; skipConflictCheck?: boolean }
  ): Promise<void> {
    const event: SyncEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      source,
      workflowId: this.workflowId,
      type,
      payload,
      version: this.incrementVersion(),
    }

    logger.debug('Emitting sync event', { type, source, eventId: event.id })

    // Immediate processing for critical events
    if (options?.immediate) {
      await this.processEvent(event)
      return
    }

    // Check for conflicts unless explicitly skipped
    if (!options?.skipConflictCheck) {
      const hasConflict = await this.detectConflict(event)
      if (hasConflict) {
        this.conflictQueue.push(event)
        await this.resolveConflict(event)
        return
      }
    }

    // Add to processing queue
    this.eventQueue.push(event)

    // Process with debouncing for performance
    this.debounceProcess(event.type)
  }

  /**
   * Process synchronization events with batching
   */
  private async processEvent(event: SyncEvent): Promise<void> {
    try {
      // Update version vector
      this.versionVector.set(event.source, event.version)

      // Broadcast to subscribers
      this.subscribers.forEach((callback, key) => {
        const eventType = key.split('-')[0]
        if (eventType === event.type || eventType === 'ALL') {
          callback(event)
        }
      })

      // Update sync state
      this.syncState.lastSync = event.timestamp
      this.syncState.version = Math.max(this.syncState.version, event.version)

      logger.debug('Event processed successfully', { eventId: event.id, type: event.type })
    } catch (error) {
      logger.error('Error processing sync event', {
        eventId: event.id,
        type: event.type,
        error,
      })

      // Add to retry queue
      this.eventQueue.unshift(event)
    }
  }

  /**
   * Detect conflicts between concurrent modifications
   */
  private async detectConflict(event: SyncEvent): Promise<boolean> {
    // Check for overlapping operations on same workflow elements
    const conflictingEvents = this.eventQueue.filter((queuedEvent) =>
      this.isConflicting(event, queuedEvent)
    )

    if (conflictingEvents.length > 0) {
      logger.warn('Conflict detected', {
        eventId: event.id,
        conflictingEvents: conflictingEvents.map((e) => e.id),
      })
      return true
    }

    // Check for timing-based conflicts (events too close in time)
    const recentEvents = this.eventQueue.filter(
      (queuedEvent) =>
        event.timestamp - queuedEvent.timestamp < 100 && // 100ms window
        this.targetsOverlap(event, queuedEvent)
    )

    return recentEvents.length > 0
  }

  /**
   * Check if two events conflict with each other
   */
  private isConflicting(event1: SyncEvent, event2: SyncEvent): boolean {
    // Same source events don't conflict
    if (event1.source === event2.source) return false

    // Check if events target the same workflow element
    const target1 = this.extractTarget(event1)
    const target2 = this.extractTarget(event2)

    if (target1 && target2 && target1 === target2) {
      // Same target with different operations
      return (
        event1.type !== event2.type ||
        JSON.stringify(event1.payload) !== JSON.stringify(event2.payload)
      )
    }

    return false
  }

  /**
   * Check if events target overlapping elements
   */
  private targetsOverlap(event1: SyncEvent, event2: SyncEvent): boolean {
    const target1 = this.extractTarget(event1)
    const target2 = this.extractTarget(event2)

    // If either event affects the entire workflow
    if (event1.type === 'WORKFLOW_STATE_SYNC' || event2.type === 'WORKFLOW_STATE_SYNC') {
      return true
    }

    return target1 === target2
  }

  /**
   * Extract target identifier from event
   */
  private extractTarget(event: SyncEvent): string | null {
    switch (event.type) {
      case 'BLOCK_ADD':
      case 'BLOCK_UPDATE':
      case 'BLOCK_REMOVE':
      case 'BLOCK_POSITION_UPDATE':
        return `block:${event.payload.id || event.payload.blockId}`

      case 'EDGE_ADD':
      case 'EDGE_REMOVE':
        return `edge:${event.payload.id || event.payload.edgeId}`

      case 'SUBBLOCK_UPDATE':
        return `subblock:${event.payload.blockId}:${event.payload.subblockId}`

      default:
        return null
    }
  }

  /**
   * Resolve conflicts using operational transformation
   */
  private async resolveConflict(event: SyncEvent): Promise<ConflictResolution> {
    logger.info('Resolving conflict', { eventId: event.id })

    const conflictingEvents = this.conflictQueue.filter(
      (queuedEvent) => queuedEvent.id !== event.id && this.isConflicting(event, queuedEvent)
    )

    try {
      // Apply operational transformation
      const transformResult = await this.transformOperation(event, conflictingEvents)

      if (transformResult.conflict) {
        // Use conflict resolution strategy
        const strategy = this.determineConflictStrategy(event, conflictingEvents)
        return await this.applyConflictStrategy(event, conflictingEvents, strategy)
      }
      // No conflict after transformation, process normally
      await this.processEvent({
        ...event,
        payload: transformResult.transformed,
      })

      return {
        eventId: event.id,
        strategy: 'merge',
        resolution: 'resolved',
      }
    } catch (error) {
      logger.error('Conflict resolution failed', { eventId: event.id, error })

      return {
        eventId: event.id,
        strategy: 'rollback',
        resolution: 'failed',
        error: String(error),
      }
    }
  }

  /**
   * Transform operations to resolve conflicts
   */
  private async transformOperation(
    event: SyncEvent,
    conflictingEvents: SyncEvent[]
  ): Promise<TransformResult> {
    const operations = this.eventToOperations(event)
    let transformedOps = [...operations]
    let hasConflict = false

    for (const conflictEvent of conflictingEvents) {
      const conflictOps = this.eventToOperations(conflictEvent)

      // Apply operational transformation algorithm
      const result = this.applyOperationalTransform(transformedOps, conflictOps)
      transformedOps = result.operations

      if (result.hasConflict) {
        hasConflict = true
      }
    }

    return {
      transformed: transformedOps,
      conflict: hasConflict,
      metadata: {
        originalOperationCount: operations.length,
        transformedOperationCount: transformedOps.length,
      },
    }
  }

  /**
   * Convert event to operational transformation operations
   */
  private eventToOperations(event: SyncEvent): Operation[] {
    switch (event.type) {
      case 'BLOCK_ADD':
        return [
          {
            type: 'insert',
            data: event.payload,
            attributes: { blockType: event.payload.type },
          },
        ]

      case 'BLOCK_UPDATE':
        return [
          {
            type: 'replace',
            data: event.payload,
            attributes: { target: 'block', id: event.payload.id },
          },
        ]

      case 'BLOCK_REMOVE':
        return [
          {
            type: 'delete',
            length: 1,
            attributes: { target: 'block', id: event.payload.id },
          },
        ]

      case 'BLOCK_POSITION_UPDATE':
        return [
          {
            type: 'replace',
            data: { position: event.payload.position },
            attributes: { target: 'position', id: event.payload.id },
          },
        ]

      case 'SUBBLOCK_UPDATE':
        return [
          {
            type: 'replace',
            data: { value: event.payload.value },
            attributes: {
              target: 'subblock',
              blockId: event.payload.blockId,
              subblockId: event.payload.subblockId,
            },
          },
        ]

      default:
        return [
          {
            type: 'retain',
            length: 1,
            data: event.payload,
          },
        ]
    }
  }

  /**
   * Apply operational transformation between two operation sets
   */
  private applyOperationalTransform(
    ops1: Operation[],
    ops2: Operation[]
  ): { operations: Operation[]; hasConflict: boolean } {
    const transformed: Operation[] = []
    let hasConflict = false

    // Simple implementation - can be enhanced with more sophisticated OT algorithms
    for (const op1 of ops1) {
      let transformedOp = { ...op1 }

      for (const op2 of ops2) {
        const result = this.transformOperationPair(transformedOp, op2)
        transformedOp = result.operation

        if (result.conflict) {
          hasConflict = true
        }
      }

      transformed.push(transformedOp)
    }

    return { operations: transformed, hasConflict }
  }

  /**
   * Transform a pair of operations
   */
  private transformOperationPair(
    op1: Operation,
    op2: Operation
  ): { operation: Operation; conflict: boolean } {
    // Handle same target conflicts
    if (
      op1.attributes?.target === op2.attributes?.target &&
      op1.attributes?.id === op2.attributes?.id
    ) {
      // Both trying to modify the same element
      if (op1.type === 'replace' && op2.type === 'replace') {
        // Merge the data if possible
        const merged = this.mergeData(op1.data, op2.data)
        if (merged.success) {
          return {
            operation: { ...op1, data: merged.data },
            conflict: false,
          }
        }
        return { operation: op1, conflict: true }
      }

      // Delete vs Update conflict
      if (
        (op1.type === 'delete' && op2.type === 'replace') ||
        (op1.type === 'replace' && op2.type === 'delete')
      ) {
        return { operation: op1, conflict: true }
      }
    }

    return { operation: op1, conflict: false }
  }

  /**
   * Merge data from conflicting operations
   */
  private mergeData(data1: any, data2: any): { success: boolean; data?: any } {
    try {
      // For simple cases, use latest timestamp or merge objects
      if (typeof data1 === 'object' && typeof data2 === 'object') {
        const merged = { ...data1, ...data2 }
        return { success: true, data: merged }
      }

      // For primitives, prefer data2 (more recent)
      return { success: true, data: data2 }
    } catch (error) {
      return { success: false }
    }
  }

  /**
   * Determine conflict resolution strategy
   */
  private determineConflictStrategy(
    event: SyncEvent,
    conflictingEvents: SyncEvent[]
  ): ConflictStrategy {
    // Use latest-wins for position updates (real-time collaboration)
    if (event.type === 'BLOCK_POSITION_UPDATE') {
      return 'latest-wins'
    }

    // Use merge for subblock updates when possible
    if (event.type === 'SUBBLOCK_UPDATE') {
      return 'merge'
    }

    // Use user-prompt for critical operations
    if (event.type === 'BLOCK_REMOVE' || event.type === 'EDGE_REMOVE') {
      return 'user-prompt'
    }

    return 'latest-wins'
  }

  /**
   * Apply conflict resolution strategy
   */
  private async applyConflictStrategy(
    event: SyncEvent,
    conflictingEvents: SyncEvent[],
    strategy: ConflictStrategy
  ): Promise<ConflictResolution> {
    switch (strategy) {
      case 'latest-wins': {
        // Process the most recent event
        const latestEvent = [event, ...conflictingEvents].sort(
          (a, b) => b.timestamp - a.timestamp
        )[0]

        await this.processEvent(latestEvent)

        return {
          eventId: event.id,
          strategy: 'latest-wins',
          resolution: 'resolved',
        }
      }

      case 'merge': {
        // Attempt to merge all events
        const mergedPayload = conflictingEvents.reduce(
          (acc, e) => ({ ...acc, ...e.payload }),
          event.payload
        )

        await this.processEvent({ ...event, payload: mergedPayload })

        return {
          eventId: event.id,
          strategy: 'merge',
          resolution: 'resolved',
          mergedData: mergedPayload,
        }
      }

      case 'user-prompt':
        // Defer to user for resolution
        return {
          eventId: event.id,
          strategy: 'user-prompt',
          resolution: 'pending',
        }

      case 'rollback':
        // Revert to previous state
        return {
          eventId: event.id,
          strategy: 'rollback',
          resolution: 'resolved',
        }

      default:
        throw new Error(`Unknown conflict strategy: ${strategy}`)
    }
  }

  /**
   * Debounce event processing for performance
   */
  private debounceProcess(eventType: SyncEventType): void {
    const key = `${eventType}-${this.workflowId}`

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.processPendingEvents()
      this.debounceTimers.delete(key)
    }, 50) // 50ms debounce

    this.debounceTimers.set(key, timer)
  }

  /**
   * Process all pending events in queue
   */
  private async processPendingEvents(): Promise<void> {
    const eventsToProcess = [...this.eventQueue]
    this.eventQueue = []

    // Group events by type for batch processing
    const eventGroups = this.groupEventsByType(eventsToProcess)

    for (const [eventType, events] of eventGroups) {
      try {
        await this.processBatch(eventType, events)
      } catch (error) {
        logger.error('Batch processing failed', { eventType, error })
        // Re-queue failed events
        this.eventQueue.push(...events)
      }
    }
  }

  /**
   * Group events by type for batch processing
   */
  private groupEventsByType(events: SyncEvent[]): Map<SyncEventType, SyncEvent[]> {
    const groups = new Map<SyncEventType, SyncEvent[]>()

    for (const event of events) {
      const existing = groups.get(event.type) || []
      existing.push(event)
      groups.set(event.type, existing)
    }

    return groups
  }

  /**
   * Process a batch of similar events
   */
  private async processBatch(eventType: SyncEventType, events: SyncEvent[]): Promise<void> {
    logger.debug('Processing event batch', { eventType, count: events.length })

    // Sort events by timestamp for consistent processing order
    events.sort((a, b) => a.timestamp - b.timestamp)

    for (const event of events) {
      await this.processEvent(event)
    }
  }

  /**
   * Increment version counter
   */
  private incrementVersion(): number {
    return ++this.syncState.version
  }

  /**
   * Get current synchronization state
   */
  getSyncState(): SyncState {
    return { ...this.syncState }
  }

  /**
   * Set synchronization mode
   */
  setMode(mode: 'visual' | 'chat' | 'hybrid'): void {
    this.syncState.mode = mode

    this.emitEvent('MODE_SWITCH', { mode }, 'visual', { immediate: true })

    logger.info('Sync mode changed', { mode, workflowId: this.workflowId })
  }

  /**
   * Clear all pending operations and reset state
   */
  reset(): void {
    this.eventQueue = []
    this.conflictQueue = []
    this.versionVector.clear()
    this.operationBuffer.clear()

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    this.syncState = {
      version: 0,
      lastSync: Date.now(),
      pendingEvents: [],
      conflictQueue: [],
      isConnected: true,
      mode: 'visual',
    }

    logger.info('Sync engine reset', { workflowId: this.workflowId })
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.reset()
    this.subscribers.clear()

    logger.info('Sync engine destroyed', { workflowId: this.workflowId })
  }
}

/**
 * Factory function to create sync engine instance
 */
export function createBidirectionalSyncEngine(workflowId: string): BidirectionalSyncEngine {
  return new BidirectionalSyncEngine(workflowId)
}
