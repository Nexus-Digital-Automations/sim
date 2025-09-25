/**
 * Bidirectional Synchronization System - Main Integration Module
 *
 * Provides a unified interface for seamless synchronization between visual
 * ReactFlow editor and conversational chat interface, enabling simultaneous
 * use without conflicts.
 */

import { createLogger } from '@/lib/logs/console/logger'
import {
  BidirectionalSyncEngine,
  createBidirectionalSyncEngine,
  type SyncEvent,
  type SyncEventType,
  type SyncState,
} from './bidirectional-sync-engine'
import {
  type Conflict,
  type ConflictResolution,
  ConflictResolutionSystem,
  type UserPromptResponse,
} from './conflict-resolution-system'
import {
  type ChangeEvent,
  type ChatWorkflowState,
  type DataBinding,
  type DataBindingConfig,
  RealTimeDataBinding,
  type WorkflowVisualState,
} from './real-time-data-binding'
import {
  type Alert,
  type AlertSeverity,
  type HealthMetrics,
  SyncMonitoringSystem,
} from './sync-monitoring-system'
import {
  type PerformanceConfig,
  type PerformanceMetrics,
  SyncPerformanceOptimizer,
} from './sync-performance-optimizer'

const logger = createLogger('BidirectionalSyncSystem')

// Main system configuration
export interface SyncSystemConfig {
  workflowId: string
  dataBinding?: Partial<DataBindingConfig>
  performance?: Partial<PerformanceConfig>
  enableConflictResolution?: boolean
  enablePerformanceOptimization?: boolean
  enableMonitoring?: boolean
}

// System status and statistics
export interface SyncSystemStatus {
  isInitialized: boolean
  isActive: boolean
  currentMode: 'visual' | 'chat' | 'hybrid'
  syncState: SyncState
  health: HealthMetrics
  performance: PerformanceMetrics
  activeConflicts: number
  totalEvents: number
  uptime: number
}

/**
 * Main Bidirectional Synchronization System
 *
 * Orchestrates all synchronization components to provide seamless workflow
 * synchronization between visual and chat modes.
 */
export class BidirectionalSyncSystem {
  private syncEngine: BidirectionalSyncEngine
  private dataBinding: RealTimeDataBinding
  private conflictResolution: ConflictResolutionSystem
  private performanceOptimizer: SyncPerformanceOptimizer
  private monitoring: SyncMonitoringSystem

  private isInitialized = false
  private isActive = false
  private eventCount = 0
  private startTime = Date.now()
  private config: SyncSystemConfig

  // Event handlers
  private eventHandlers: Map<string, Set<(event: SyncEvent) => void>> = new Map()
  private changeHandlers: Set<(change: ChangeEvent) => void> = new Set()
  private alertHandlers: Set<(alert: Alert) => void> = new Set()
  private healthHandlers: Set<(health: HealthMetrics) => void> = new Set()

  constructor(config: SyncSystemConfig) {
    this.config = {
      enableConflictResolution: true,
      enablePerformanceOptimization: true,
      enableMonitoring: true,
      ...config,
    }

    this.initializeComponents()
    this.setupEventHandlers()

    logger.info('BidirectionalSyncSystem created', {
      workflowId: config.workflowId,
      features: {
        conflictResolution: this.config.enableConflictResolution,
        performanceOptimization: this.config.enablePerformanceOptimization,
        monitoring: this.config.enableMonitoring,
      },
    })
  }

  /**
   * Initialize the synchronization system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Sync system already initialized')
      return
    }

    try {
      logger.info('Initializing bidirectional sync system...')

      // Initialize components
      await this.initializeDataBinding()

      this.isInitialized = true
      this.isActive = true

      logger.info('Bidirectional sync system initialized successfully', {
        workflowId: this.config.workflowId,
      })
    } catch (error) {
      logger.error('Failed to initialize sync system', { error })
      throw new Error(`Sync system initialization failed: ${error}`)
    }
  }

  /**
   * Emit synchronization event
   */
  async emitEvent(
    type: SyncEventType,
    payload: any,
    source: 'visual' | 'chat',
    options?: { immediate?: boolean; skipConflictCheck?: boolean }
  ): Promise<void> {
    if (!this.isActive) {
      logger.warn('Sync system not active, ignoring event', { type, source })
      return
    }

    const startTime = performance.now()
    let success = false
    let error: Error | undefined

    try {
      // Optimize event through performance system
      if (this.config.enablePerformanceOptimization) {
        const event: SyncEvent = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          source,
          workflowId: this.config.workflowId,
          type,
          payload,
          version: 1,
        }

        const optimizedEvent = await this.performanceOptimizer.optimizeEvent(event)
        if (optimizedEvent) {
          await this.syncEngine.emitEvent(type, optimizedEvent.payload, source, options)
        }
      } else {
        await this.syncEngine.emitEvent(type, payload, source, options)
      }

      this.eventCount++
      success = true
    } catch (err) {
      error = err as Error
      logger.error('Event emission failed', { type, source, error: error.message })
      throw error
    } finally {
      // Record metrics
      if (this.config.enableMonitoring) {
        const processingTime = performance.now() - startTime
        const event: SyncEvent = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          source,
          workflowId: this.config.workflowId,
          type,
          payload,
          version: 1,
        }

        this.monitoring.recordSyncEvent(event, processingTime, success, error)
      }
    }
  }

  /**
   * Update visual state
   */
  updateVisualState(updates: Partial<WorkflowVisualState>): void {
    if (!this.isActive) return

    this.dataBinding.updateVisualState(updates)

    logger.debug('Visual state updated', {
      updateKeys: Object.keys(updates),
      workflowId: this.config.workflowId,
    })
  }

  /**
   * Update chat state
   */
  updateChatState(updates: Partial<ChatWorkflowState>): void {
    if (!this.isActive) return

    this.dataBinding.updateChatState(updates)

    logger.debug('Chat state updated', {
      updateKeys: Object.keys(updates),
      workflowId: this.config.workflowId,
    })
  }

  /**
   * Switch synchronization mode
   */
  switchMode(mode: 'visual' | 'chat' | 'hybrid'): void {
    if (!this.isActive) return

    this.syncEngine.setMode(mode)

    logger.info('Sync mode changed', {
      mode,
      workflowId: this.config.workflowId,
    })
  }

  /**
   * Get current visual state
   */
  getVisualState(): WorkflowVisualState {
    return this.dataBinding.getVisualState()
  }

  /**
   * Get current chat state
   */
  getChatState(): ChatWorkflowState {
    return this.dataBinding.getChatState()
  }

  /**
   * Get system status
   */
  getStatus(): SyncSystemStatus {
    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      currentMode: this.syncEngine.getSyncState().mode,
      syncState: this.syncEngine.getSyncState(),
      health: this.config.enableMonitoring
        ? this.monitoring.getHealthStatus()
        : this.createEmptyHealth(),
      performance: this.config.enablePerformanceOptimization
        ? this.performanceOptimizer.getMetrics()
        : this.createEmptyMetrics(),
      activeConflicts: this.config.enableConflictResolution
        ? this.conflictResolution.getActiveConflicts().length
        : 0,
      totalEvents: this.eventCount,
      uptime: Date.now() - this.startTime,
    }
  }

  /**
   * Get active conflicts
   */
  getActiveConflicts(): Conflict[] {
    if (!this.config.enableConflictResolution) return []
    return this.conflictResolution.getActiveConflicts()
  }

  /**
   * Handle user prompt response for conflict resolution
   */
  handleConflictResolution(conflictId: string, response: UserPromptResponse): void {
    if (!this.config.enableConflictResolution) return

    this.conflictResolution.handleUserPromptResponse(conflictId, response)
  }

  /**
   * Force synchronization of all states
   */
  async forceSynchronization(): Promise<void> {
    if (!this.isActive) return

    logger.info('Forcing full synchronization...')

    try {
      // Emit workflow state sync event
      await this.emitEvent(
        'WORKFLOW_STATE_SYNC',
        {
          visual: this.dataBinding.getVisualState(),
          chat: this.dataBinding.getChatState(),
          timestamp: Date.now(),
        },
        'visual',
        { immediate: true }
      )

      logger.info('Full synchronization completed')
    } catch (error) {
      logger.error('Force synchronization failed', { error })
      throw error
    }
  }

  /**
   * Subscribe to synchronization events
   */
  onEvent(eventType: SyncEventType | 'ALL', handler: (event: SyncEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }

    this.eventHandlers.get(eventType)!.add(handler)

    // Subscribe to sync engine
    const unsubscribe = this.syncEngine.subscribe(eventType, handler)

    return () => {
      this.eventHandlers.get(eventType)?.delete(handler)
      unsubscribe()
    }
  }

  /**
   * Subscribe to change events
   */
  onChange(handler: (change: ChangeEvent) => void): () => void {
    this.changeHandlers.add(handler)

    const unsubscribe = this.dataBinding.subscribe('*', handler)

    return () => {
      this.changeHandlers.delete(handler)
      unsubscribe()
    }
  }

  /**
   * Subscribe to alerts
   */
  onAlert(handler: (alert: Alert) => void): () => void {
    if (!this.config.enableMonitoring) {
      return () => {} // No-op if monitoring disabled
    }

    this.alertHandlers.add(handler)

    const unsubscribe = this.monitoring.subscribeToAlerts(handler)

    return () => {
      this.alertHandlers.delete(handler)
      unsubscribe()
    }
  }

  /**
   * Subscribe to health updates
   */
  onHealthUpdate(handler: (health: HealthMetrics) => void): () => void {
    if (!this.config.enableMonitoring) {
      return () => {} // No-op if monitoring disabled
    }

    this.healthHandlers.add(handler)

    const unsubscribe = this.monitoring.subscribeToHealth(handler)

    return () => {
      this.healthHandlers.delete(handler)
      unsubscribe()
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    if (!this.config.enablePerformanceOptimization) {
      return this.createEmptyMetrics()
    }

    return this.performanceOptimizer.getMetrics()
  }

  /**
   * Get health status
   */
  getHealthStatus(): HealthMetrics {
    if (!this.config.enableMonitoring) {
      return this.createEmptyHealth()
    }

    return this.monitoring.getHealthStatus()
  }

  /**
   * Create custom data binding
   */
  createBinding(binding: DataBinding): void {
    this.dataBinding.createBinding(binding)
  }

  /**
   * Remove data binding
   */
  removeBinding(bindingId: string): void {
    this.dataBinding.removeBinding(bindingId)
  }

  /**
   * Pause synchronization
   */
  pause(): void {
    this.isActive = false
    logger.info('Synchronization paused', { workflowId: this.config.workflowId })
  }

  /**
   * Resume synchronization
   */
  resume(): void {
    this.isActive = true
    logger.info('Synchronization resumed', { workflowId: this.config.workflowId })
  }

  /**
   * Reset synchronization system
   */
  reset(): void {
    logger.info('Resetting synchronization system...')

    this.syncEngine.reset()
    this.dataBinding.reset()

    if (this.config.enableConflictResolution) {
      this.conflictResolution.clearHistory()
    }

    if (this.config.enablePerformanceOptimization) {
      this.performanceOptimizer.resetMetrics()
    }

    this.eventCount = 0
    this.startTime = Date.now()

    logger.info('Synchronization system reset complete')
  }

  /**
   * Export system data for debugging
   */
  exportDebugData(): {
    config: SyncSystemConfig
    status: SyncSystemStatus
    events: { total: number }
    conflicts: Conflict[]
    performance: PerformanceMetrics
    monitoring?: any
  } {
    const debugData = {
      config: this.config,
      status: this.getStatus(),
      events: { total: this.eventCount },
      conflicts: this.getActiveConflicts(),
      performance: this.getPerformanceMetrics(),
    }

    if (this.config.enableMonitoring) {
      ;(debugData as any).monitoring = this.monitoring.exportData()
    }

    return debugData
  }

  /**
   * Cleanup and destroy system
   */
  destroy(): void {
    logger.info('Destroying bidirectional sync system...')

    this.isActive = false
    this.isInitialized = false

    // Clean up components
    this.syncEngine.destroy()
    this.dataBinding.destroy()
    this.conflictResolution.destroy()
    this.performanceOptimizer.destroy()
    this.monitoring.destroy()

    // Clear handlers
    this.eventHandlers.clear()
    this.changeHandlers.clear()
    this.alertHandlers.clear()
    this.healthHandlers.clear()

    logger.info('Bidirectional sync system destroyed')
  }

  /**
   * Initialize system components
   */
  private initializeComponents(): void {
    // Create sync engine
    this.syncEngine = createBidirectionalSyncEngine(this.config.workflowId)

    // Create performance optimizer
    this.performanceOptimizer = new SyncPerformanceOptimizer(this.config.performance)

    // Create data binding
    this.dataBinding = new RealTimeDataBinding(this.syncEngine, this.config.dataBinding)

    // Create conflict resolution (if enabled)
    this.conflictResolution = new ConflictResolutionSystem()

    // Create monitoring system (if enabled)
    this.monitoring = new SyncMonitoringSystem()

    logger.debug('Sync system components initialized')
  }

  /**
   * Initialize data binding with default configurations
   */
  private async initializeDataBinding(): Promise<void> {
    // Data binding is ready by default - no async initialization needed
    logger.debug('Data binding initialized')
  }

  /**
   * Setup event handlers between components
   */
  private setupEventHandlers(): void {
    // Connect conflict resolution to sync engine
    if (this.config.enableConflictResolution) {
      this.syncEngine.subscribe('ALL', async (event) => {
        // Check for potential conflicts
        const conflict = await this.conflictResolution.detectConflict([event])
        if (conflict && this.config.enableMonitoring) {
          this.monitoring.recordConflictResolution(
            conflict,
            Date.now() - conflict.timestamp,
            conflict.resolution?.outcome === 'resolved'
          )
        }
      })
    }

    // Connect performance monitoring
    if (this.config.enablePerformanceOptimization && this.config.enableMonitoring) {
      setInterval(() => {
        const metrics = this.performanceOptimizer.getMetrics()
        this.monitoring.recordPerformanceMetrics(metrics)
      }, 5000) // Every 5 seconds
    }

    logger.debug('Event handlers configured')
  }

  /**
   * Create empty health metrics for when monitoring is disabled
   */
  private createEmptyHealth(): HealthMetrics {
    const emptyComponent = {
      status: 'healthy' as const,
      latency: 0,
      errorRate: 0,
      throughput: 0,
      recoveryAttempts: 0,
      isRecovering: false,
    }

    return {
      syncEngine: emptyComponent,
      dataBinding: emptyComponent,
      conflictResolution: emptyComponent,
      performance: emptyComponent,
      overall: 'healthy' as const,
      uptime: Date.now() - this.startTime,
      lastUpdate: Date.now(),
    }
  }

  /**
   * Create empty performance metrics for when optimization is disabled
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      syncLatency: [],
      throughput: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      batchEfficiency: 1,
      compressionRatio: 1,
      averageEventSize: 0,
      queueDepth: 0,
      processingTime: [],
      errorRate: 0,
    }
  }
}

/**
 * Factory function to create and initialize sync system
 */
export async function createSyncSystem(config: SyncSystemConfig): Promise<BidirectionalSyncSystem> {
  const system = new BidirectionalSyncSystem(config)
  await system.initialize()
  return system
}

/**
 * Export all types and classes for external use
 */
export {
  BidirectionalSyncEngine,
  RealTimeDataBinding,
  ConflictResolutionSystem,
  SyncPerformanceOptimizer,
  SyncMonitoringSystem,
}

export type {
  SyncEvent,
  SyncEventType,
  SyncState,
  DataBinding,
  ChangeEvent,
  WorkflowVisualState,
  ChatWorkflowState,
  DataBindingConfig,
  Conflict,
  ConflictResolution,
  UserPromptResponse,
  PerformanceConfig,
  PerformanceMetrics,
  HealthMetrics,
  Alert,
  AlertSeverity,
  SyncSystemConfig,
  SyncSystemStatus,
}
