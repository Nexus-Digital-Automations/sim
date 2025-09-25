/**
 * Real-time Data Binding System for Workflow and Chat State Synchronization
 *
 * Provides efficient, memory-optimized data binding between workflow models
 * and chat interface state with change detection and propagation algorithms.
 */

import type { Edge } from 'reactflow'
import { createLogger } from '@/lib/logs/console/logger'
import type { BidirectionalSyncEngine, SyncEvent, SyncEventType } from './bidirectional-sync-engine'

const logger = createLogger('RealTimeDataBinding')

// Data binding configuration
export interface DataBindingConfig {
  debounceMs: number
  batchSize: number
  maxQueueSize: number
  enableChangeDetection: boolean
  enableOptimisticUpdates: boolean
  compressionThreshold: number
}

// Change detection types
export interface ChangeEvent {
  id: string
  timestamp: number
  path: string
  oldValue: any
  newValue: any
  source: 'visual' | 'chat'
  propagationPriority: 'high' | 'medium' | 'low'
}

export interface DataBinding {
  id: string
  visualPath: string
  chatPath: string
  transformer?: (value: any, direction: 'visual-to-chat' | 'chat-to-visual') => any
  validator?: (value: any) => boolean
  bidirectional: boolean
}

// State synchronization interfaces
export interface WorkflowVisualState {
  blocks: Record<string, any>
  edges: Edge[]
  loops: Record<string, any>
  parallels: Record<string, any>
  selectedElements: string[]
  viewportState: {
    zoom: number
    position: { x: number; y: number }
  }
}

export interface ChatWorkflowState {
  activeWorkflow: string | null
  conversationId: string | null
  messages: any[]
  workflowCommands: any[]
  executionState: {
    running: boolean
    currentStep: string | null
    results: Record<string, any>
  }
  agentSelections: string[]
}

/**
 * Real-time Data Binding Manager
 */
export class RealTimeDataBinding {
  private bindings: Map<string, DataBinding> = new Map()
  private changeQueue: ChangeEvent[] = []
  private visualState: WorkflowVisualState
  private chatState: ChatWorkflowState
  private subscribers: Map<string, (change: ChangeEvent) => void> = new Map()
  private changeBuffer: Map<string, ChangeEvent[]> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private config: DataBindingConfig
  private syncEngine: BidirectionalSyncEngine
  private isProcessingChanges = false

  constructor(syncEngine: BidirectionalSyncEngine, config: Partial<DataBindingConfig> = {}) {
    this.syncEngine = syncEngine
    this.config = {
      debounceMs: 100,
      batchSize: 50,
      maxQueueSize: 1000,
      enableChangeDetection: true,
      enableOptimisticUpdates: true,
      compressionThreshold: 100,
      ...config,
    }

    // Initialize states
    this.visualState = this.createEmptyVisualState()
    this.chatState = this.createEmptyChatState()

    // Setup default bindings
    this.setupDefaultBindings()

    // Subscribe to sync engine events
    this.syncEngine.subscribe('ALL', this.handleSyncEvent.bind(this))

    logger.info('RealTimeDataBinding initialized', {
      bindingCount: this.bindings.size,
      config: this.config,
    })
  }

  /**
   * Create binding between visual and chat state paths
   */
  createBinding(binding: DataBinding): void {
    this.bindings.set(binding.id, binding)
    logger.debug('Data binding created', { bindingId: binding.id })
  }

  /**
   * Remove data binding
   */
  removeBinding(bindingId: string): void {
    this.bindings.delete(bindingId)
    logger.debug('Data binding removed', { bindingId })
  }

  /**
   * Subscribe to change events
   */
  subscribe(path: string, callback: (change: ChangeEvent) => void): () => void {
    const subscriptionId = `${path}-${crypto.randomUUID()}`
    this.subscribers.set(subscriptionId, callback)

    return () => {
      this.subscribers.delete(subscriptionId)
    }
  }

  /**
   * Update visual state with change detection
   */
  updateVisualState(updates: Partial<WorkflowVisualState>): void {
    const changes = this.detectChanges('visual', this.visualState, updates)

    // Apply optimistic updates
    if (this.config.enableOptimisticUpdates) {
      this.applyVisualUpdates(updates)
    }

    // Process changes
    for (const change of changes) {
      this.queueChange(change)
    }

    logger.debug('Visual state updated', {
      changeCount: changes.length,
      updateKeys: Object.keys(updates),
    })
  }

  /**
   * Update chat state with change detection
   */
  updateChatState(updates: Partial<ChatWorkflowState>): void {
    const changes = this.detectChanges('chat', this.chatState, updates)

    // Apply optimistic updates
    if (this.config.enableOptimisticUpdates) {
      this.applyChatUpdates(updates)
    }

    // Process changes
    for (const change of changes) {
      this.queueChange(change)
    }

    logger.debug('Chat state updated', {
      changeCount: changes.length,
      updateKeys: Object.keys(updates),
    })
  }

  /**
   * Detect changes between current and new state
   */
  private detectChanges(
    source: 'visual' | 'chat',
    currentState: any,
    updates: any,
    basePath = ''
  ): ChangeEvent[] {
    const changes: ChangeEvent[] = []

    for (const [key, newValue] of Object.entries(updates)) {
      const path = basePath ? `${basePath}.${key}` : key
      const oldValue = this.getNestedValue(currentState, path)

      if (this.hasValueChanged(oldValue, newValue)) {
        changes.push({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          path,
          oldValue,
          newValue,
          source,
          propagationPriority: this.determinePriority(path, newValue),
        })

        // Recursively detect nested changes for objects
        if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
          const nestedChanges = this.detectChanges(source, oldValue || {}, newValue, path)
          changes.push(...nestedChanges)
        }
      }
    }

    return changes
  }

  /**
   * Check if value has changed (deep comparison)
   */
  private hasValueChanged(oldValue: any, newValue: any): boolean {
    // Handle null/undefined cases
    if (oldValue === newValue) return false
    if (oldValue == null && newValue == null) return false
    if (oldValue == null || newValue == null) return true

    // Handle arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) return true
      return oldValue.some((item, index) => this.hasValueChanged(item, newValue[index]))
    }

    // Handle objects
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      const oldKeys = Object.keys(oldValue)
      const newKeys = Object.keys(newValue)

      if (oldKeys.length !== newKeys.length) return true

      return oldKeys.some(
        (key) => !newKeys.includes(key) || this.hasValueChanged(oldValue[key], newValue[key])
      )
    }

    // Handle primitives
    return oldValue !== newValue
  }

  /**
   * Determine change propagation priority
   */
  private determinePriority(path: string, value: any): 'high' | 'medium' | 'low' {
    // High priority for critical workflow elements
    if (path.includes('blocks') || path.includes('edges')) {
      return 'high'
    }

    // High priority for execution state
    if (path.includes('executionState.running')) {
      return 'high'
    }

    // Medium priority for UI state changes
    if (path.includes('selectedElements') || path.includes('viewportState')) {
      return 'medium'
    }

    // Low priority for everything else
    return 'low'
  }

  /**
   * Queue change for processing with debouncing
   */
  private queueChange(change: ChangeEvent): void {
    // Add to queue
    this.changeQueue.push(change)

    // Trim queue if too large
    if (this.changeQueue.length > this.config.maxQueueSize) {
      const removed = this.changeQueue.splice(0, this.changeQueue.length - this.config.maxQueueSize)
      logger.warn('Change queue trimmed', { removedCount: removed.length })
    }

    // Buffer changes by path for batching
    const pathBuffer = this.changeBuffer.get(change.path) || []
    pathBuffer.push(change)
    this.changeBuffer.set(change.path, pathBuffer)

    // Debounce processing
    this.debounceChangeProcessing(change.path)
  }

  /**
   * Debounce change processing by path
   */
  private debounceChangeProcessing(path: string): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(path)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.processChangesForPath(path)
      this.debounceTimers.delete(path)
    }, this.config.debounceMs)

    this.debounceTimers.set(path, timer)
  }

  /**
   * Process changes for specific path
   */
  private async processChangesForPath(path: string): Promise<void> {
    const pathChanges = this.changeBuffer.get(path) || []
    if (pathChanges.length === 0) return

    // Clear buffer
    this.changeBuffer.delete(path)

    // Sort by priority and timestamp
    pathChanges.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const priorityDiff =
        priorityOrder[a.propagationPriority] - priorityOrder[b.propagationPriority]

      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp
    })

    // Batch process changes
    const batches = this.createBatches(pathChanges, this.config.batchSize)

    for (const batch of batches) {
      await this.processBatch(batch)
    }
  }

  /**
   * Create batches from changes array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Process batch of changes
   */
  private async processBatch(changes: ChangeEvent[]): Promise<void> {
    if (this.isProcessingChanges) {
      // Re-queue if already processing
      this.changeQueue.push(...changes)
      return
    }

    this.isProcessingChanges = true

    try {
      for (const change of changes) {
        await this.propagateChange(change)
      }
    } catch (error) {
      logger.error('Batch processing failed', { error, batchSize: changes.length })
    } finally {
      this.isProcessingChanges = false
    }
  }

  /**
   * Propagate change across bindings
   */
  private async propagateChange(change: ChangeEvent): Promise<void> {
    const relevantBindings = this.findRelevantBindings(change)

    for (const binding of relevantBindings) {
      try {
        await this.applyBinding(binding, change)
      } catch (error) {
        logger.error('Binding application failed', {
          bindingId: binding.id,
          changePath: change.path,
          error,
        })
      }
    }

    // Notify subscribers
    this.notifySubscribers(change)

    // Emit sync event if needed
    await this.emitSyncEvent(change)
  }

  /**
   * Find bindings relevant to change
   */
  private findRelevantBindings(change: ChangeEvent): DataBinding[] {
    const relevantBindings: DataBinding[] = []

    for (const binding of this.bindings.values()) {
      const sourcePath = change.source === 'visual' ? binding.visualPath : binding.chatPath

      if (this.pathMatches(change.path, sourcePath)) {
        relevantBindings.push(binding)
      }
    }

    return relevantBindings
  }

  /**
   * Check if paths match (supports wildcards)
   */
  private pathMatches(changePath: string, bindingPath: string): boolean {
    // Convert wildcard patterns to regex
    const regex = new RegExp(bindingPath.replace(/\*/g, '.*').replace(/\?/g, '.'))

    return regex.test(changePath)
  }

  /**
   * Apply binding transformation
   */
  private async applyBinding(binding: DataBinding, change: ChangeEvent): Promise<void> {
    const direction = change.source === 'visual' ? 'visual-to-chat' : 'chat-to-visual'
    const targetPath = change.source === 'visual' ? binding.chatPath : binding.visualPath

    // Skip if not bidirectional and wrong direction
    if (!binding.bidirectional && change.source !== 'visual') {
      return
    }

    // Transform value if transformer exists
    let transformedValue = change.newValue
    if (binding.transformer) {
      transformedValue = binding.transformer(change.newValue, direction)
    }

    // Validate if validator exists
    if (binding.validator && !binding.validator(transformedValue)) {
      logger.warn('Binding validation failed', {
        bindingId: binding.id,
        value: transformedValue,
      })
      return
    }

    // Apply to target state
    if (change.source === 'visual') {
      this.setNestedValue(this.chatState, targetPath, transformedValue)
    } else {
      this.setNestedValue(this.visualState, targetPath, transformedValue)
    }

    logger.debug('Binding applied', {
      bindingId: binding.id,
      direction,
      targetPath,
    })
  }

  /**
   * Notify subscribers of change
   */
  private notifySubscribers(change: ChangeEvent): void {
    for (const [subscriptionId, callback] of this.subscribers) {
      const pathPattern = subscriptionId.split('-')[0]

      if (this.pathMatches(change.path, pathPattern)) {
        try {
          callback(change)
        } catch (error) {
          logger.error('Subscriber callback failed', {
            subscriptionId,
            changePath: change.path,
            error,
          })
        }
      }
    }
  }

  /**
   * Emit sync event for change
   */
  private async emitSyncEvent(change: ChangeEvent): Promise<void> {
    const eventType = this.mapChangeToEventType(change)
    if (!eventType) return

    await this.syncEngine.emitEvent(
      eventType,
      {
        path: change.path,
        value: change.newValue,
        oldValue: change.oldValue,
      },
      change.source,
      { immediate: change.propagationPriority === 'high' }
    )
  }

  /**
   * Map change to sync event type
   */
  private mapChangeToEventType(change: ChangeEvent): SyncEventType | null {
    if (change.path.includes('blocks')) {
      if (change.path.includes('position')) {
        return 'BLOCK_POSITION_UPDATE'
      }
      if (change.oldValue === undefined) {
        return 'BLOCK_ADD'
      }
      if (change.newValue === undefined) {
        return 'BLOCK_REMOVE'
      }
      return 'BLOCK_UPDATE'
    }

    if (change.path.includes('edges')) {
      if (change.oldValue === undefined) {
        return 'EDGE_ADD'
      }
      if (change.newValue === undefined) {
        return 'EDGE_REMOVE'
      }
    }

    if (change.path.includes('subBlocks')) {
      return 'SUBBLOCK_UPDATE'
    }

    if (change.path.includes('messages')) {
      return 'CHAT_MESSAGE'
    }

    if (change.path.includes('workflowCommands')) {
      return 'CHAT_WORKFLOW_COMMAND'
    }

    return null
  }

  /**
   * Handle sync events from engine
   */
  private handleSyncEvent(event: SyncEvent): void {
    // Convert sync event to change and propagate
    const change: ChangeEvent = {
      id: event.id,
      timestamp: event.timestamp,
      path: event.payload.path || 'unknown',
      oldValue: event.payload.oldValue,
      newValue: event.payload.value,
      source: event.source,
      propagationPriority: 'medium',
    }

    this.propagateChange(change)
  }

  /**
   * Apply visual state updates
   */
  private applyVisualUpdates(updates: Partial<WorkflowVisualState>): void {
    this.visualState = { ...this.visualState, ...updates }
  }

  /**
   * Apply chat state updates
   */
  private applyChatUpdates(updates: Partial<ChatWorkflowState>): void {
    this.chatState = { ...this.chatState, ...updates }
  }

  /**
   * Get nested value from object using path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Set nested value in object using path
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {}
      return current[key]
    }, obj)

    target[lastKey] = value
  }

  /**
   * Setup default data bindings
   */
  private setupDefaultBindings(): void {
    // Block synchronization
    this.createBinding({
      id: 'blocks-sync',
      visualPath: 'blocks.*',
      chatPath: 'executionState.blocks.*',
      bidirectional: true,
    })

    // Edge synchronization
    this.createBinding({
      id: 'edges-sync',
      visualPath: 'edges.*',
      chatPath: 'executionState.edges.*',
      bidirectional: true,
    })

    // Execution state synchronization
    this.createBinding({
      id: 'execution-sync',
      visualPath: 'executionState',
      chatPath: 'executionState',
      bidirectional: true,
    })

    // Selection synchronization
    this.createBinding({
      id: 'selection-sync',
      visualPath: 'selectedElements',
      chatPath: 'agentSelections',
      bidirectional: false,
    })

    logger.debug('Default bindings created', { count: this.bindings.size })
  }

  /**
   * Create empty visual state
   */
  private createEmptyVisualState(): WorkflowVisualState {
    return {
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
      selectedElements: [],
      viewportState: {
        zoom: 1,
        position: { x: 0, y: 0 },
      },
    }
  }

  /**
   * Create empty chat state
   */
  private createEmptyChatState(): ChatWorkflowState {
    return {
      activeWorkflow: null,
      conversationId: null,
      messages: [],
      workflowCommands: [],
      executionState: {
        running: false,
        currentStep: null,
        results: {},
      },
      agentSelections: [],
    }
  }

  /**
   * Get current visual state
   */
  getVisualState(): WorkflowVisualState {
    return { ...this.visualState }
  }

  /**
   * Get current chat state
   */
  getChatState(): ChatWorkflowState {
    return { ...this.chatState }
  }

  /**
   * Get binding statistics
   */
  getStats(): {
    bindingCount: number
    changeQueueSize: number
    bufferSizes: Record<string, number>
    isProcessing: boolean
  } {
    const bufferSizes: Record<string, number> = {}
    for (const [path, buffer] of this.changeBuffer) {
      bufferSizes[path] = buffer.length
    }

    return {
      bindingCount: this.bindings.size,
      changeQueueSize: this.changeQueue.length,
      bufferSizes,
      isProcessing: this.isProcessingChanges,
    }
  }

  /**
   * Clear all queues and reset state
   */
  reset(): void {
    this.changeQueue = []
    this.changeBuffer.clear()

    // Clear debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer))
    this.debounceTimers.clear()

    this.isProcessingChanges = false

    // Reset states
    this.visualState = this.createEmptyVisualState()
    this.chatState = this.createEmptyChatState()

    logger.info('Data binding reset complete')
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.reset()
    this.bindings.clear()
    this.subscribers.clear()

    logger.info('RealTimeDataBinding destroyed')
  }
}
