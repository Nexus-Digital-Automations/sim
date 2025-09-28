/**
 * Advanced Conflict Resolution System for Concurrent Workflow Modifications
 *
 * Handles conflicts between simultaneous modifications from visual and chat interfaces
 * using sophisticated merge strategies and user intervention when necessary.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ConflictStrategy, SyncEvent } from './bidirectional-sync-engine'

const logger = createLogger('ConflictResolutionSystem')

// Conflict types and metadata
export interface Conflict {
  id: string
  timestamp: number
  type: ConflictType
  severity: ConflictSeverity
  events: SyncEvent[]
  resolution?: ConflictResolution
  metadata: ConflictMetadata
}

export type ConflictType =
  | 'CONCURRENT_EDIT' // Same element modified simultaneously
  | 'DEPENDENT_CHANGE' // Changes that depend on each other
  | 'ORDERING_CONFLICT' // Events arrived out of order
  | 'STATE_DIVERGENCE' // States have diverged significantly
  | 'RESOURCE_LOCK' // Competing for exclusive resource
  | 'SEMANTIC_CONFLICT' // Logically incompatible changes

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ConflictMetadata {
  affectedElements: string[]
  userIds: string[]
  sources: ('visual' | 'chat')[]
  elementTypes: string[]
  changeTypes: string[]
  confidenceScore: number
  automaticResolution: boolean
}

export interface ConflictResolution {
  strategy: ConflictStrategy
  outcome: 'resolved' | 'deferred' | 'escalated' | 'failed'
  resolvedEvent?: SyncEvent
  mergedData?: any
  userChoice?: string
  reason: string
  timestamp: number
  autoResolved: boolean
}

// Advanced merge strategies
export interface MergeStrategy {
  Name: string
  description: string
  applicableTypes: ConflictType[]
  priority: number
  execute: (conflict: Conflict) => Promise<ConflictResolution>
}

// User intervention interfaces
export interface UserPromptConfig {
  title: string
  message: string
  options: UserPromptOption[]
  timeout?: number
  defaultOption?: string
}

export interface UserPromptOption {
  id: string
  label: string
  description: string
  data?: any
}

export interface UserPromptResponse {
  optionId: string
  data?: any
  timestamp: number
}

/**
 * Advanced Conflict Resolution System
 */
export class ConflictResolutionSystem {
  private activeConflicts: Map<string, Conflict> = new Map()
  private resolvedConflicts: Conflict[] = []
  private mergeStrategies: Map<string, MergeStrategy> = new Map()
  private userPromptCallbacks: Map<string, (response: UserPromptResponse) => void> = new Map()
  private conflictSubscribers: Map<string, (conflict: Conflict) => void> = new Map()
  private resolutionHistory: ConflictResolution[] = []
  private conflictMetrics = {
    totalConflicts: 0,
    resolvedCount: 0,
    averageResolutionTime: 0,
    strategySuccess: new Map<string, number>(),
  }

  constructor() {
    this.initializeMergeStrategies()

    logger.info('ConflictResolutionSystem initialized', {
      strategiesCount: this.mergeStrategies.size,
    })
  }

  /**
   * Detect and register a new conflict
   */
  async detectConflict(events: SyncEvent[]): Promise<Conflict | null> {
    if (events.length < 2) return null

    const conflictType = this.analyzeConflictType(events)
    if (!conflictType) return null

    const conflict: Conflict = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: conflictType,
      severity: this.assessConflictSeverity(events, conflictType),
      events,
      metadata: this.generateConflictMetadata(events, conflictType),
    }

    // Register conflict
    this.activeConflicts.set(conflict.id, conflict)
    this.conflictMetrics.totalConflicts++

    logger.warn('Conflict detected', {
      conflictId: conflict.id,
      type: conflict.type,
      severity: conflict.severity,
      eventCount: events.length,
    })

    // Notify subscribers
    this.notifyConflictSubscribers(conflict)

    // Attempt automatic resolution
    const resolution = await this.resolveConflict(conflict)
    if (resolution) {
      conflict.resolution = resolution
    }

    return conflict
  }

  /**
   * Resolve conflict using appropriate strategy
   */
  async resolveConflict(conflict: Conflict): Promise<ConflictResolution | null> {
    const startTime = Date.now()

    try {
      // Find best strategy for conflict type
      const strategy = this.selectOptimalStrategy(conflict)
      if (!strategy) {
        logger.warn('No suitable strategy found for conflict', {
          conflictId: conflict.id,
          type: conflict.type,
        })
        return this.createFailedResolution('No suitable strategy available')
      }

      logger.info('Resolving conflict', {
        conflictId: conflict.id,
        strategy: strategy.Name,
      })

      // Execute strategy
      const resolution = await strategy.execute(conflict)
      resolution.timestamp = Date.now()
      resolution.autoResolved = resolution.outcome !== 'deferred'

      // Update metrics
      this.updateResolutionMetrics(strategy.Name, resolution, startTime)

      // Store resolution
      this.resolutionHistory.push(resolution)

      // Clean up if resolved
      if (resolution.outcome === 'resolved') {
        this.activeConflicts.delete(conflict.id)
        this.resolvedConflicts.push(conflict)
        this.conflictMetrics.resolvedCount++
      }

      logger.info('Conflict resolution completed', {
        conflictId: conflict.id,
        outcome: resolution.outcome,
        strategy: resolution.strategy,
        duration: Date.now() - startTime,
      })

      return resolution
    } catch (error) {
      logger.error('Conflict resolution failed', {
        conflictId: conflict.id,
        error,
      })

      return this.createFailedResolution(String(error))
    }
  }

  /**
   * Analyze conflict type from events
   */
  private analyzeConflictType(events: SyncEvent[]): ConflictType | null {
    // Group events by target element
    const targetGroups = this.groupEventsByTarget(events)

    // Concurrent edits on same element
    if (targetGroups.size === 1) {
      const [target, targetEvents] = targetGroups.entries().next().value
      const sources = new Set(targetEvents.map((e) => e.source))

      if (sources.size > 1) {
        return 'CONCURRENT_EDIT'
      }

      // Check for ordering issues
      const sortedEvents = targetEvents.sort((a, b) => a.timestamp - b.timestamp)
      if (this.hasOrderingIssues(sortedEvents)) {
        return 'ORDERING_CONFLICT'
      }
    }

    // Multiple targets - check for dependencies
    if (targetGroups.size > 1) {
      if (this.hasDependentChanges(events)) {
        return 'DEPENDENT_CHANGE'
      }
    }

    // Check for semantic conflicts
    if (this.hasSemanticConflicts(events)) {
      return 'SEMANTIC_CONFLICT'
    }

    // Check for state divergence
    if (this.hasStateDivergence(events)) {
      return 'STATE_DIVERGENCE'
    }

    return null
  }

  /**
   * Group events by their target elements
   */
  private groupEventsByTarget(events: SyncEvent[]): Map<string, SyncEvent[]> {
    const groups = new Map<string, SyncEvent[]>()

    for (const event of events) {
      const target = this.extractEventTarget(event)
      if (target) {
        const existing = groups.get(target) || []
        existing.push(event)
        groups.set(target, existing)
      }
    }

    return groups
  }

  /**
   * Extract target element from event
   */
  private extractEventTarget(event: SyncEvent): string | null {
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
   * Check for ordering issues in events
   */
  private hasOrderingIssues(events: SyncEvent[]): boolean {
    // Check if version vectors indicate out-of-order delivery
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1]
      const curr = events[i]

      // Version should be increasing
      if (curr.version <= prev.version && curr.timestamp > prev.timestamp) {
        return true
      }
    }

    return false
  }

  /**
   * Check for dependent changes between events
   */
  private hasDependentChanges(events: SyncEvent[]): boolean {
    // Look for add/remove dependencies
    const additions = events.filter((e) => e.type.includes('ADD'))
    const removals = events.filter((e) => e.type.includes('REMOVE'))
    const updates = events.filter((e) => e.type.includes('UPDATE'))

    // Removing something that was just added or updating something that was removed
    for (const removal of removals) {
      const target = this.extractEventTarget(removal)
      if (
        additions.some((add) => this.extractEventTarget(add) === target) ||
        updates.some((upd) => this.extractEventTarget(upd) === target)
      ) {
        return true
      }
    }

    return false
  }

  /**
   * Check for semantic conflicts between events
   */
  private hasSemanticConflicts(events: SyncEvent[]): boolean {
    // Look for logically incompatible changes
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (this.areEventsSemanicallyIncompatible(events[i], events[j])) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if two events are semantically incompatible
   */
  private areEventsSemanicallyIncompatible(event1: SyncEvent, event2: SyncEvent): boolean {
    // Block removal vs block update
    if (event1.type === 'BLOCK_REMOVE' && event2.type === 'BLOCK_UPDATE') {
      return this.extractEventTarget(event1) === this.extractEventTarget(event2)
    }

    // Edge removal vs block removal (edge depends on blocks)
    if (event1.type === 'EDGE_REMOVE' && event2.type === 'BLOCK_REMOVE') {
      const edgeData = event1.payload
      const blockId = event2.payload.id

      return edgeData.source === blockId || edgeData.target === blockId
    }

    return false
  }

  /**
   * Check for state divergence
   */
  private hasStateDivergence(events: SyncEvent[]): boolean {
    // Simple heuristic: too many changes in short time window indicates divergence
    const timeWindow = 1000 // 1 second
    const maxChanges = 10

    const recentEvents = events.filter((e) => Date.now() - e.timestamp < timeWindow)

    return recentEvents.length > maxChanges
  }

  /**
   * Assess conflict severity
   */
  private assessConflictSeverity(events: SyncEvent[], type: ConflictType): ConflictSeverity {
    // Critical: Data loss potential
    const hasRemovalConflicts = events.some((e) => e.type.includes('REMOVE'))
    if (hasRemovalConflicts && type === 'CONCURRENT_EDIT') {
      return 'critical'
    }

    // High: Semantic conflicts or state divergence
    if (type === 'SEMANTIC_CONFLICT' || type === 'STATE_DIVERGENCE') {
      return 'high'
    }

    // Medium: Dependent changes
    if (type === 'DEPENDENT_CHANGE') {
      return 'medium'
    }

    // Low: Simple concurrent edits, ordering issues
    return 'low'
  }

  /**
   * Generate conflict metadata
   */
  private generateConflictMetadata(events: SyncEvent[], type: ConflictType): ConflictMetadata {
    const affectedElements = [
      ...new Set(events.map((e) => this.extractEventTarget(e)).filter(Boolean)),
    ]
    const userIds = [...new Set(events.map((e) => e.userId).filter(Boolean))]
    const sources = [...new Set(events.map((e) => e.source))]
    const elementTypes = [...new Set(events.map((e) => this.getElementType(e)))]
    const changeTypes = [...new Set(events.map((e) => e.type))]

    return {
      affectedElements,
      userIds,
      sources,
      elementTypes,
      changeTypes,
      confidenceScore: this.calculateConfidenceScore(events, type),
      automaticResolution: this.canAutoResolve(type, events),
    }
  }

  /**
   * Get element type from event
   */
  private getElementType(event: SyncEvent): string {
    if (event.type.includes('BLOCK')) return 'block'
    if (event.type.includes('EDGE')) return 'edge'
    if (event.type.includes('SUBBLOCK')) return 'subblock'
    return 'unknown'
  }

  /**
   * Calculate confidence score for conflict detection
   */
  private calculateConfidenceScore(events: SyncEvent[], type: ConflictType): number {
    let score = 0.5 // Base confidence

    // Higher confidence for clear patterns
    if (type === 'CONCURRENT_EDIT') score += 0.3
    if (type === 'SEMANTIC_CONFLICT') score += 0.4

    // Multiple sources increase confidence
    const sources = new Set(events.map((e) => e.source))
    if (sources.size > 1) score += 0.2

    // Time proximity increases confidence
    const timeSpread =
      Math.max(...events.map((e) => e.timestamp)) - Math.min(...events.map((e) => e.timestamp))
    if (timeSpread < 1000) score += 0.1 // Within 1 second

    return Math.min(1.0, score)
  }

  /**
   * Check if conflict can be automatically resolved
   */
  private canAutoResolve(type: ConflictType, events: SyncEvent[]): boolean {
    // Can auto-resolve simple concurrent edits
    if (type === 'CONCURRENT_EDIT' && events.length === 2) {
      return !events.some((e) => e.type.includes('REMOVE'))
    }

    // Can auto-resolve ordering conflicts
    if (type === 'ORDERING_CONFLICT') {
      return true
    }

    // Cannot auto-resolve critical conflicts
    return false
  }

  /**
   * Select optimal resolution strategy
   */
  private selectOptimalStrategy(conflict: Conflict): MergeStrategy | null {
    const applicableStrategies = Array.from(this.mergeStrategies.values())
      .filter((strategy) => strategy.applicableTypes.includes(conflict.type))
      .sort((a, b) => b.priority - a.priority)

    return applicableStrategies[0] || null
  }

  /**
   * Initialize merge strategies
   */
  private initializeMergeStrategies(): void {
    // Latest wins strategy
    this.mergeStrategies.set('latest-wins', {
      Name: 'latest-wins',
      description: 'Apply the most recent change',
      applicableTypes: ['CONCURRENT_EDIT', 'ORDERING_CONFLICT'],
      priority: 3,
      execute: async (conflict) => {
        const latestEvent = conflict.events.sort((a, b) => b.timestamp - a.timestamp)[0]

        return {
          strategy: 'latest-wins',
          outcome: 'resolved',
          resolvedEvent: latestEvent,
          reason: 'Applied most recent change',
          timestamp: Date.now(),
          autoResolved: true,
        }
      },
    })

    // Three-way merge strategy
    this.mergeStrategies.set('three-way-merge', {
      Name: 'three-way-merge',
      description: 'Merge changes intelligently when possible',
      applicableTypes: ['CONCURRENT_EDIT', 'DEPENDENT_CHANGE'],
      priority: 5,
      execute: async (conflict) => {
        const mergedData = await this.performThreeWayMerge(conflict.events)

        if (mergedData.success) {
          return {
            strategy: 'merge',
            outcome: 'resolved',
            mergedData: mergedData.result,
            reason: 'Successfully merged concurrent changes',
            timestamp: Date.now(),
            autoResolved: true,
          }
        }
        return {
          strategy: 'user-prompt',
          outcome: 'deferred',
          reason: 'Automatic merge failed, user intervention required',
          timestamp: Date.now(),
          autoResolved: false,
        }
      },
    })

    // User prompt strategy
    this.mergeStrategies.set('user-prompt', {
      Name: 'user-prompt',
      description: 'Ask user to resolve conflict manually',
      applicableTypes: ['SEMANTIC_CONFLICT', 'STATE_DIVERGENCE', 'CONCURRENT_EDIT'],
      priority: 2,
      execute: async (conflict) => {
        const userResponse = await this.promptUserForResolution(conflict)

        if (userResponse) {
          return {
            strategy: 'user-prompt',
            outcome: 'resolved',
            userChoice: userResponse.optionId,
            reason: 'User manually resolved conflict',
            timestamp: Date.now(),
            autoResolved: false,
          }
        }
        return {
          strategy: 'rollback',
          outcome: 'escalated',
          reason: 'User did not respond to prompt',
          timestamp: Date.now(),
          autoResolved: false,
        }
      },
    })

    // Rollback strategy
    this.mergeStrategies.set('rollback', {
      Name: 'rollback',
      description: 'Revert to previous stable state',
      applicableTypes: ['STATE_DIVERGENCE', 'SEMANTIC_CONFLICT'],
      priority: 1,
      execute: async (conflict) => {
        // Find last stable state before conflict
        const stableTimestamp = Math.min(...conflict.events.map((e) => e.timestamp)) - 1

        return {
          strategy: 'rollback',
          outcome: 'resolved',
          reason: `Rolled back to state at ${new Date(stableTimestamp).toISOString()}`,
          timestamp: Date.now(),
          autoResolved: true,
        }
      },
    })

    logger.debug('Merge strategies initialized', {
      strategies: Array.from(this.mergeStrategies.keys()),
    })
  }

  /**
   * Perform three-way merge of conflicting events
   */
  private async performThreeWayMerge(
    events: SyncEvent[]
  ): Promise<{ success: boolean; result?: any }> {
    if (events.length !== 2) {
      return { success: false }
    }

    const [event1, event2] = events

    // Only merge if both are updates to same element
    if (event1.type !== 'BLOCK_UPDATE' || event2.type !== 'BLOCK_UPDATE') {
      return { success: false }
    }

    const target1 = this.extractEventTarget(event1)
    const target2 = this.extractEventTarget(event2)

    if (target1 !== target2) {
      return { success: false }
    }

    try {
      // Merge payloads
      const merged = this.mergePayloads(event1.payload, event2.payload)
      return { success: true, result: merged }
    } catch (error) {
      logger.error('Three-way merge failed', { error })
      return { success: false }
    }
  }

  /**
   * Merge payloads from two events
   */
  private mergePayloads(payload1: any, payload2: any): any {
    // Simple object merge with conflict resolution
    const merged = { ...payload1 }

    for (const [key, value2] of Object.entries(payload2)) {
      const value1 = payload1[key]

      if (value1 === undefined) {
        // New property in payload2
        merged[key] = value2
      } else if (value1 !== value2) {
        // Conflict - use latest timestamp or more specific value
        if (typeof value2 === 'object' && typeof value1 === 'object') {
          merged[key] = { ...value1, ...value2 }
        } else {
          // Prefer non-null, non-empty values
          merged[key] = this.pickBetterValue(value1, value2)
        }
      }
    }

    return merged
  }

  /**
   * Pick better value between two conflicting values
   */
  private pickBetterValue(value1: any, value2: any): any {
    // Prefer non-null values
    if (value1 == null && value2 != null) return value2
    if (value2 == null && value1 != null) return value1

    // Prefer non-empty strings
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      if (value1.trim() === '' && value2.trim() !== '') return value2
      if (value2.trim() === '' && value1.trim() !== '') return value1
    }

    // Prefer larger numbers (assuming they represent more recent values)
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      return Math.max(value1, value2)
    }

    // Default to value2 (more recent)
    return value2
  }

  /**
   * Prompt user for conflict resolution
   */
  private async promptUserForResolution(conflict: Conflict): Promise<UserPromptResponse | null> {
    const config: UserPromptConfig = {
      title: 'Resolve Workflow Conflict',
      message: this.generateUserPromptMessage(conflict),
      options: this.generateUserPromptOptions(conflict),
      timeout: 30000, // 30 seconds
      defaultOption: 'latest',
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.userPromptCallbacks.delete(conflict.id)
        resolve(null)
      }, config.timeout || 30000)

      this.userPromptCallbacks.set(conflict.id, (response) => {
        clearTimeout(timeoutId)
        this.userPromptCallbacks.delete(conflict.id)
        resolve(response)
      })

      // Emit prompt to UI (would be handled by subscriber)
      this.notifyUserPromptSubscribers(conflict.id, config)
    })
  }

  /**
   * Generate user-friendly prompt message
   */
  private generateUserPromptMessage(conflict: Conflict): string {
    const elementCount = conflict.metadata.affectedElements.length
    const sourceList = conflict.metadata.sources.join(' and ')

    switch (conflict.type) {
      case 'CONCURRENT_EDIT':
        return `${elementCount} workflow element(s) were modified simultaneously from ${sourceList} interfaces. How would you like to resolve this?`

      case 'SEMANTIC_CONFLICT':
        return `Conflicting changes were made that are logically incompatible. Please choose how to proceed.`

      case 'STATE_DIVERGENCE':
        return `The workflow state has diverged significantly between interfaces. Choose a resolution strategy.`

      default:
        return `A conflict was detected in your workflow. Please choose how to resolve it.`
    }
  }

  /**
   * Generate user prompt options
   */
  private generateUserPromptOptions(conflict: Conflict): UserPromptOption[] {
    const options: UserPromptOption[] = [
      {
        id: 'latest',
        label: 'Keep Latest Changes',
        description: 'Apply the most recent modifications',
      },
      {
        id: 'merge',
        label: 'Try to Merge',
        description: 'Attempt to combine all changes automatically',
      },
      {
        id: 'rollback',
        label: 'Revert Changes',
        description: 'Go back to the previous stable state',
      },
    ]

    // Add conflict-specific options
    if (conflict.metadata.sources.includes('visual')) {
      options.push({
        id: 'visual',
        label: 'Keep Visual Editor Changes',
        description: 'Preserve changes made in the visual interface',
      })
    }

    if (conflict.metadata.sources.includes('chat')) {
      options.push({
        id: 'chat',
        label: 'Keep Chat Interface Changes',
        description: 'Preserve changes made in the chat interface',
      })
    }

    return options
  }

  /**
   * Notify user prompt subscribers
   */
  private notifyUserPromptSubscribers(conflictId: string, config: UserPromptConfig): void {
    // This would emit to UI components that can show user prompts
    // Implementation depends on specific UI framework
    logger.info('User prompt required', { conflictId, config })
  }

  /**
   * Handle user prompt response
   */
  handleUserPromptResponse(conflictId: string, response: UserPromptResponse): void {
    const callback = this.userPromptCallbacks.get(conflictId)
    if (callback) {
      callback(response)
    }
  }

  /**
   * Subscribe to conflict events
   */
  subscribeToConflicts(callback: (conflict: Conflict) => void): () => void {
    const subscriptionId = crypto.randomUUID()
    this.conflictSubscribers.set(subscriptionId, callback)

    return () => {
      this.conflictSubscribers.delete(subscriptionId)
    }
  }

  /**
   * Notify conflict subscribers
   */
  private notifyConflictSubscribers(conflict: Conflict): void {
    this.conflictSubscribers.forEach((callback) => {
      try {
        callback(conflict)
      } catch (error) {
        logger.error('Conflict subscriber callback failed', { error })
      }
    })
  }

  /**
   * Update resolution metrics
   */
  private updateResolutionMetrics(
    strategyName: string,
    resolution: ConflictResolution,
    startTime: number
  ): void {
    const duration = Date.now() - startTime

    // Update average resolution time
    const totalResolutions = this.resolutionHistory.length
    this.conflictMetrics.averageResolutionTime =
      (this.conflictMetrics.averageResolutionTime * totalResolutions + duration) /
      (totalResolutions + 1)

    // Update strategy success rate
    const currentSuccess = this.conflictMetrics.strategySuccess.get(strategyName) || 0
    const increment = resolution.outcome === 'resolved' ? 1 : 0
    this.conflictMetrics.strategySuccess.set(strategyName, currentSuccess + increment)
  }

  /**
   * Create failed resolution
   */
  private createFailedResolution(reason: string): ConflictResolution {
    return {
      strategy: 'rollback',
      outcome: 'failed',
      reason,
      timestamp: Date.now(),
      autoResolved: false,
    }
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): {
    activeConflicts: number
    resolvedConflicts: number
    totalConflicts: number
    resolutionRate: number
    averageResolutionTime: number
    strategyStats: Record<string, number>
  } {
    const strategyStats: Record<string, number> = {}
    this.conflictMetrics.strategySuccess.forEach((count, strategy) => {
      strategyStats[strategy] = count
    })

    return {
      activeConflicts: this.activeConflicts.size,
      resolvedConflicts: this.resolvedConflicts.length,
      totalConflicts: this.conflictMetrics.totalConflicts,
      resolutionRate:
        this.conflictMetrics.totalConflicts > 0
          ? this.conflictMetrics.resolvedCount / this.conflictMetrics.totalConflicts
          : 0,
      averageResolutionTime: this.conflictMetrics.averageResolutionTime,
      strategyStats,
    }
  }

  /**
   * Get active conflicts
   */
  getActiveConflicts(): Conflict[] {
    return Array.from(this.activeConflicts.values())
  }

  /**
   * Get resolved conflicts
   */
  getResolvedConflicts(): Conflict[] {
    return [...this.resolvedConflicts]
  }

  /**
   * Clear resolved conflicts history
   */
  clearHistory(): void {
    this.resolvedConflicts = []
    this.resolutionHistory = []

    // Reset metrics
    this.conflictMetrics = {
      totalConflicts: this.activeConflicts.size,
      resolvedCount: 0,
      averageResolutionTime: 0,
      strategySuccess: new Map(),
    }

    logger.info('Conflict resolution history cleared')
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.activeConflicts.clear()
    this.resolvedConflicts = []
    this.userPromptCallbacks.clear()
    this.conflictSubscribers.clear()
    this.resolutionHistory = []

    logger.info('ConflictResolutionSystem destroyed')
  }
}
