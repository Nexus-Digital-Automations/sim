/**
 * Real-Time Progress Tracking Service
 *
 * Provides live updates and progress monitoring for journey-based workflow execution
 * with Socket.io integration for real-time client notifications.
 */

import type {
  ProgressTracker,
  RealTimeUpdateHandler,
  StateChangeUpdate,
  ProgressUpdate,
  ErrorUpdate,
  CompletionUpdate,
  ExecutionMetrics,
  PerformanceTrend,
  ExecutionStatistics,
  ConversationMessage
} from '../types/journey-execution-types'

/**
 * Real-time event types for Socket.io emission
 */
type ProgressEventType =
  | 'journey:state_changed'
  | 'journey:progress_updated'
  | 'journey:error_occurred'
  | 'journey:completed'
  | 'journey:message_sent'
  | 'journey:milestone_reached'
  | 'journey:performance_metric'

/**
 * Progress visualization data
 */
interface ProgressVisualization {
  type: 'linear' | 'circular' | 'tree' | 'timeline'
  data: ProgressDataPoint[]
  metadata: VisualizationMetadata
}

interface ProgressDataPoint {
  id: string
  name: string
  status: 'pending' | 'active' | 'completed' | 'error'
  progress: number
  timestamp?: Date
  duration?: number
  children?: ProgressDataPoint[]
}

interface VisualizationMetadata {
  totalSteps: number
  completedSteps: number
  estimatedTimeRemaining: number
  currentPhase: string
  theme: 'light' | 'dark' | 'auto'
}

/**
 * Performance metrics collection
 */
interface PerformanceMetricCollection {
  executionTime: number[]
  memoryUsage: number[]
  apiCalls: number[]
  errorRates: number[]
  userInteractionTimes: number[]
  throughput: number[]
  latency: number[]
}

/**
 * Alert configuration for progress monitoring
 */
interface ProgressAlert {
  id: string
  type: 'error' | 'warning' | 'milestone' | 'timeout'
  condition: AlertCondition
  actions: AlertAction[]
  enabled: boolean
}

interface AlertCondition {
  type: 'threshold' | 'duration' | 'pattern' | 'custom'
  value: any
  comparison: 'greater' | 'less' | 'equal' | 'contains'
}

interface AlertAction {
  type: 'notify' | 'escalate' | 'retry' | 'terminate'
  parameters: Record<string, any>
}

/**
 * Main real-time progress service
 */
export class RealTimeProgressService implements RealTimeUpdateHandler {
  private socketConnections = new Map<string, any>() // Would be proper Socket.io types
  private progressTrackers = new Map<string, ProgressTracker>()
  private performanceMetrics = new Map<string, PerformanceMetricCollection>()
  private activeAlerts = new Map<string, ProgressAlert[]>()
  private updateSubscribers = new Map<string, Set<string>>() // journeyId -> Set of socketIds
  private progressVisualizers = new Map<string, ProgressVisualization>()

  // Performance monitoring
  private metricsCollectionInterval: NodeJS.Timeout | null = null
  private progressUpdateBuffer = new Map<string, ProgressUpdate[]>()

  constructor() {
    this.initializeMetricsCollection()
  }

  /**
   * Initialize Socket.io integration for real-time updates
   */
  initializeSocketIntegration(io: any): void {
    io.on('connection', (socket: any) => {
      console.log(`Socket connected: ${socket.id}`)

      // Store socket connection
      this.socketConnections.set(socket.id, socket)

      // Handle journey subscription
      socket.on('journey:subscribe', (data: { journeyId: string; sessionId: string }) => {
        this.subscribeToJourney(socket.id, data.journeyId, data.sessionId)
      })

      // Handle unsubscription
      socket.on('journey:unsubscribe', (data: { journeyId: string }) => {
        this.unsubscribeFromJourney(socket.id, data.journeyId)
      })

      // Handle progress visualization requests
      socket.on('journey:request_visualization', async (data: { journeyId: string; type: string }) => {
        const visualization = await this.generateProgressVisualization(data.journeyId, data.type as any)
        socket.emit('journey:visualization_data', visualization)
      })

      // Handle performance metrics requests
      socket.on('journey:request_metrics', (data: { journeyId: string }) => {
        const metrics = this.getPerformanceMetrics(data.journeyId)
        socket.emit('journey:metrics_data', metrics)
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`)
        this.cleanupSocket(socket.id)
      })
    })
  }

  /**
   * Subscribe to journey updates
   */
  subscribeToJourney(socketId: string, journeyId: string, sessionId: string): void {
    let subscribers = this.updateSubscribers.get(journeyId)
    if (!subscribers) {
      subscribers = new Set()
      this.updateSubscribers.set(journeyId, subscribers)
    }
    subscribers.add(socketId)

    // Send current progress state
    const currentProgress = this.progressTrackers.get(journeyId)
    if (currentProgress) {
      this.emitToSocket(socketId, 'journey:progress_updated', {
        journeyId,
        sessionId,
        progress: currentProgress,
        timestamp: new Date()
      })
    }

    console.log(`Socket ${socketId} subscribed to journey ${journeyId}`)
  }

  /**
   * Unsubscribe from journey updates
   */
  unsubscribeFromJourney(socketId: string, journeyId: string): void {
    const subscribers = this.updateSubscribers.get(journeyId)
    if (subscribers) {
      subscribers.delete(socketId)
      if (subscribers.size === 0) {
        this.updateSubscribers.delete(journeyId)
      }
    }

    console.log(`Socket ${socketId} unsubscribed from journey ${journeyId}`)
  }

  /**
   * Handle state change updates
   */
  async onStateChange(update: StateChangeUpdate): Promise<void> {
    console.log(`State change: ${update.previousState} -> ${update.currentState}`)

    // Update progress tracker
    await this.updateProgressFromStateChange(update)

    // Check for milestone completion
    await this.checkMilestoneCompletion(update)

    // Emit real-time update
    this.emitToJourneySubscribers(update.journeyId, 'journey:state_changed', update)

    // Update visualization
    await this.updateProgressVisualization(update.journeyId, update)

    // Collect performance metrics
    this.collectStateChangeMetrics(update)
  }

  /**
   * Handle progress updates
   */
  async onProgressUpdate(update: ProgressUpdate): Promise<void> {
    console.log(`Progress update: ${update.progress.completionPercentage}%`)

    // Store progress tracker
    this.progressTrackers.set(update.journeyId, update.progress)

    // Buffer updates for performance
    this.bufferProgressUpdate(update)

    // Emit throttled updates (max 2 per second)
    await this.throttledProgressEmit(update)

    // Update visualization
    await this.updateProgressVisualization(update.journeyId, update)

    // Check for alerts
    await this.checkProgressAlerts(update)
  }

  /**
   * Handle error updates
   */
  async onError(update: ErrorUpdate): Promise<void> {
    console.log(`Error occurred: ${update.error.message}`)

    // Emit immediate error notification
    this.emitToJourneySubscribers(update.journeyId, 'journey:error_occurred', update)

    // Update error metrics
    this.updateErrorMetrics(update)

    // Trigger error alerts
    await this.triggerErrorAlerts(update)

    // Update visualization to show error state
    await this.updateVisualizationWithError(update.journeyId, update)
  }

  /**
   * Handle completion updates
   */
  async onCompletion(update: CompletionUpdate): Promise<void> {
    console.log(`Journey completed: ${update.journeyId}`)

    // Final progress update
    const finalProgress = this.progressTrackers.get(update.journeyId)
    if (finalProgress) {
      finalProgress.completionPercentage = 100
      finalProgress.currentStateName = 'Completed'
    }

    // Emit completion notification
    this.emitToJourneySubscribers(update.journeyId, 'journey:completed', update)

    // Generate completion visualization
    const completionViz = await this.generateCompletionVisualization(update)
    this.emitToJourneySubscribers(update.journeyId, 'journey:completion_visualization', completionViz)

    // Final performance metrics
    await this.finalizePerformanceMetrics(update.journeyId)

    // Cleanup after delay
    setTimeout(() => {
      this.cleanupJourneyData(update.journeyId)
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Generate progress visualization
   */
  async generateProgressVisualization(
    journeyId: string,
    type: 'linear' | 'circular' | 'tree' | 'timeline'
  ): Promise<ProgressVisualization> {
    const progress = this.progressTrackers.get(journeyId)
    if (!progress) {
      throw new Error(`Progress tracker not found for journey: ${journeyId}`)
    }

    // Convert milestones to data points
    const dataPoints: ProgressDataPoint[] = progress.milestones.map(milestone => ({
      id: milestone.id,
      name: milestone.name,
      status: milestone.completed ? 'completed' :
              (milestone.stateId === progress.currentStateName ? 'active' : 'pending'),
      progress: milestone.completed ? 100 : 0,
      timestamp: milestone.timestamp
    }))

    const visualization: ProgressVisualization = {
      type,
      data: dataPoints,
      metadata: {
        totalSteps: progress.totalStates,
        completedSteps: progress.completedStates,
        estimatedTimeRemaining: progress.estimatedTimeRemaining || 0,
        currentPhase: progress.currentStateName,
        theme: 'auto'
      }
    }

    // Cache visualization
    this.progressVisualizers.set(journeyId, visualization)

    return visualization
  }

  /**
   * Get performance metrics for a journey
   */
  getPerformanceMetrics(journeyId: string): PerformanceMetricCollection | null {
    return this.performanceMetrics.get(journeyId) || null
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): ExecutionStatistics {
    const totalJourneys = this.progressTrackers.size
    const completedJourneys = Array.from(this.progressTrackers.values())
      .filter(p => p.completionPercentage === 100).length
    const activeJourneys = totalJourneys - completedJourneys

    // Calculate metrics from performance data
    const allMetrics = Array.from(this.performanceMetrics.values())
    const avgExecutionTime = this.calculateAverage(
      allMetrics.flatMap(m => m.executionTime)
    )
    const successRate = completedJourneys / (totalJourneys || 1)
    const errorRate = 1 - successRate

    return {
      totalJourneys,
      activeJourneys,
      completedJourneys,
      averageExecutionTime: avgExecutionTime,
      successRate,
      errorRate,
      toolUsageStats: [], // Would be populated with actual tool usage data
      performanceTrends: this.generatePerformanceTrends()
    }
  }

  /**
   * Configure progress alerts
   */
  configureProgressAlerts(journeyId: string, alerts: ProgressAlert[]): void {
    this.activeAlerts.set(journeyId, alerts)
    console.log(`Configured ${alerts.length} alerts for journey ${journeyId}`)
  }

  /**
   * Send message update
   */
  async sendMessageUpdate(
    journeyId: string,
    sessionId: string,
    message: ConversationMessage
  ): Promise<void> {
    this.emitToJourneySubscribers(journeyId, 'journey:message_sent', {
      journeyId,
      sessionId,
      message,
      timestamp: new Date()
    })
  }

  /**
   * Private helper methods
   */

  private initializeMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.collectSystemMetrics()
    }, 10000) // Every 10 seconds
  }

  private collectSystemMetrics(): void {
    // Collect system-wide metrics
    for (const [journeyId, metrics] of this.performanceMetrics.entries()) {
      // Mock metrics collection - would integrate with actual monitoring
      metrics.memoryUsage.push(process.memoryUsage().heapUsed / 1024 / 1024)
      metrics.throughput.push(Math.random() * 100)
      metrics.latency.push(Math.random() * 1000)

      // Keep only recent metrics (last 100 data points)
      if (metrics.memoryUsage.length > 100) {
        metrics.memoryUsage.shift()
        metrics.throughput.shift()
        metrics.latency.shift()
      }
    }
  }

  private async updateProgressFromStateChange(update: StateChangeUpdate): Promise<void> {
    const progress = this.progressTrackers.get(update.journeyId)
    if (progress) {
      progress.currentStateName = update.stateName

      // Update milestone completion
      const milestone = progress.milestones.find(m => m.stateId === update.currentState)
      if (milestone && !milestone.completed) {
        milestone.completed = true
        milestone.timestamp = new Date()
        progress.completedStates++
        progress.completionPercentage = Math.round(
          (progress.completedStates / progress.totalStates) * 100
        )
      }
    }
  }

  private async checkMilestoneCompletion(update: StateChangeUpdate): Promise<void> {
    const progress = this.progressTrackers.get(update.journeyId)
    if (!progress) return

    const milestone = progress.milestones.find(m => m.stateId === update.currentState)
    if (milestone && milestone.completed) {
      this.emitToJourneySubscribers(update.journeyId, 'journey:milestone_reached', {
        journeyId: update.journeyId,
        milestone,
        progress: progress.completionPercentage,
        timestamp: new Date()
      })
    }
  }

  private bufferProgressUpdate(update: ProgressUpdate): void {
    let buffer = this.progressUpdateBuffer.get(update.journeyId)
    if (!buffer) {
      buffer = []
      this.progressUpdateBuffer.set(update.journeyId, buffer)
    }
    buffer.push(update)
  }

  private async throttledProgressEmit(update: ProgressUpdate): Promise<void> {
    // Implement throttling to prevent overwhelming clients
    const lastEmit = (this as any).lastProgressEmit?.get(update.journeyId) || 0
    const now = Date.now()

    if (now - lastEmit > 500) { // Max 2 updates per second
      this.emitToJourneySubscribers(update.journeyId, 'journey:progress_updated', update)

      if (!(this as any).lastProgressEmit) {
        (this as any).lastProgressEmit = new Map()
      }
      (this as any).lastProgressEmit.set(update.journeyId, now)
    }
  }

  private async checkProgressAlerts(update: ProgressUpdate): Promise<void> {
    const alerts = this.activeAlerts.get(update.journeyId)
    if (!alerts) return

    for (const alert of alerts) {
      if (alert.enabled && this.evaluateAlertCondition(alert.condition, update)) {
        await this.triggerAlert(alert, update)
      }
    }
  }

  private evaluateAlertCondition(condition: AlertCondition, update: ProgressUpdate): boolean {
    // Simple condition evaluation - would be more sophisticated in practice
    switch (condition.type) {
      case 'threshold':
        return update.progress.completionPercentage >= condition.value
      case 'duration':
        return update.estimatedCompletion ?
          (new Date(update.estimatedCompletion).getTime() - Date.now()) > condition.value : false
      default:
        return false
    }
  }

  private async triggerAlert(alert: ProgressAlert, update: ProgressUpdate): Promise<void> {
    console.log(`Triggering alert ${alert.id} for journey ${update.journeyId}`)

    for (const action of alert.actions) {
      switch (action.type) {
        case 'notify':
          this.emitToJourneySubscribers(update.journeyId, 'journey:alert', {
            alert,
            update,
            timestamp: new Date()
          })
          break
        case 'escalate':
          // Would integrate with notification system
          console.log(`Escalating alert: ${alert.id}`)
          break
      }
    }
  }

  private async triggerErrorAlerts(update: ErrorUpdate): Promise<void> {
    const alerts = this.activeAlerts.get(update.journeyId)
    if (!alerts) return

    const errorAlerts = alerts.filter(a => a.type === 'error' && a.enabled)
    for (const alert of errorAlerts) {
      await this.triggerAlert(alert, update as any)
    }
  }

  private updateErrorMetrics(update: ErrorUpdate): void {
    let metrics = this.performanceMetrics.get(update.journeyId)
    if (!metrics) {
      metrics = this.initializeMetrics(update.journeyId)
    }

    // Track error occurrence
    metrics.errorRates.push(1)

    // Update visualization with error indicators
    const viz = this.progressVisualizers.get(update.journeyId)
    if (viz) {
      // Mark current step as error
      const currentStep = viz.data.find(d => d.status === 'active')
      if (currentStep) {
        currentStep.status = 'error'
      }
    }
  }

  private collectStateChangeMetrics(update: StateChangeUpdate): void {
    let metrics = this.performanceMetrics.get(update.journeyId)
    if (!metrics) {
      metrics = this.initializeMetrics(update.journeyId)
    }

    // Mock state transition time
    const transitionTime = Math.random() * 2000 + 500 // 500-2500ms
    metrics.executionTime.push(transitionTime)
  }

  private initializeMetrics(journeyId: string): PerformanceMetricCollection {
    const metrics: PerformanceMetricCollection = {
      executionTime: [],
      memoryUsage: [],
      apiCalls: [],
      errorRates: [],
      userInteractionTimes: [],
      throughput: [],
      latency: []
    }
    this.performanceMetrics.set(journeyId, metrics)
    return metrics
  }

  private async updateProgressVisualization(
    journeyId: string,
    update: StateChangeUpdate | ProgressUpdate
  ): Promise<void> {
    const viz = this.progressVisualizers.get(journeyId)
    if (viz) {
      // Update visualization based on current progress
      const progress = this.progressTrackers.get(journeyId)
      if (progress) {
        viz.metadata.completedSteps = progress.completedStates
        viz.metadata.currentPhase = progress.currentStateName

        // Update data points
        viz.data.forEach(point => {
          const milestone = progress.milestones.find(m => m.id === point.id)
          if (milestone) {
            point.status = milestone.completed ? 'completed' :
                         (milestone.stateId === progress.currentStateName ? 'active' : 'pending')
            point.progress = milestone.completed ? 100 : 0
          }
        })
      }
    }
  }

  private async updateVisualizationWithError(journeyId: string, update: ErrorUpdate): Promise<void> {
    const viz = this.progressVisualizers.get(journeyId)
    if (viz) {
      // Find current step and mark as error
      const currentStep = viz.data.find(d => d.status === 'active')
      if (currentStep) {
        currentStep.status = 'error'
      }
    }
  }

  private async generateCompletionVisualization(update: CompletionUpdate): Promise<any> {
    return {
      type: 'completion_summary',
      summary: update.summary,
      visualizations: {
        timeline: await this.generateProgressVisualization(update.journeyId, 'timeline'),
        metrics: this.getPerformanceMetrics(update.journeyId)
      }
    }
  }

  private async finalizePerformanceMetrics(journeyId: string): Promise<void> {
    const metrics = this.performanceMetrics.get(journeyId)
    if (metrics) {
      // Calculate final statistics
      const finalMetrics = {
        totalExecutionTime: metrics.executionTime.reduce((a, b) => a + b, 0),
        averageExecutionTime: this.calculateAverage(metrics.executionTime),
        totalErrors: metrics.errorRates.length,
        peakMemoryUsage: Math.max(...metrics.memoryUsage),
        averageLatency: this.calculateAverage(metrics.latency)
      }

      // Emit final metrics
      this.emitToJourneySubscribers(journeyId, 'journey:performance_metric', {
        journeyId,
        metrics: finalMetrics,
        timestamp: new Date()
      })
    }
  }

  private generatePerformanceTrends(): PerformanceTrend[] {
    // Mock trend data - would use actual historical data
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return dates.map(date => ({
      date,
      executionCount: Math.floor(Math.random() * 50) + 10,
      averageTime: Math.random() * 5000 + 1000,
      successRate: 0.85 + Math.random() * 0.14,
      errorRate: Math.random() * 0.15
    }))
  }

  private emitToJourneySubscribers(journeyId: string, event: ProgressEventType, data: any): void {
    const subscribers = this.updateSubscribers.get(journeyId)
    if (subscribers) {
      subscribers.forEach(socketId => {
        this.emitToSocket(socketId, event, data)
      })
    }
  }

  private emitToSocket(socketId: string, event: ProgressEventType, data: any): void {
    const socket = this.socketConnections.get(socketId)
    if (socket) {
      socket.emit(event, data)
    }
  }

  private cleanupSocket(socketId: string): void {
    this.socketConnections.delete(socketId)

    // Remove from all journey subscriptions
    for (const [journeyId, subscribers] of this.updateSubscribers.entries()) {
      subscribers.delete(socketId)
      if (subscribers.size === 0) {
        this.updateSubscribers.delete(journeyId)
      }
    }
  }

  private cleanupJourneyData(journeyId: string): void {
    this.progressTrackers.delete(journeyId)
    this.performanceMetrics.delete(journeyId)
    this.activeAlerts.delete(journeyId)
    this.updateSubscribers.delete(journeyId)
    this.progressVisualizers.delete(journeyId)
    this.progressUpdateBuffer.delete(journeyId)

    console.log(`Cleaned up data for journey ${journeyId}`)
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  /**
   * Cleanup on service shutdown
   */
  shutdown(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval)
    }

    // Close all socket connections
    this.socketConnections.forEach(socket => {
      socket.disconnect()
    })

    console.log('RealTimeProgressService shutdown complete')
  }
}