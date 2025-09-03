/**
 * Alert Engine
 * Evaluates alert rules and manages alert lifecycle
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  AlertCondition,
  AlertEvent,
  AlertInstance,
  AlertRule,
  ExecutionUpdate,
  IAlertEngine,
  PerformanceMetrics,
} from '../types'
import { notificationService } from './notification-service'

const logger = createLogger('AlertEngine')

interface AlertRuleEvaluation {
  ruleId: string
  ruleName: string
  conditionResults: ConditionEvaluationResult[]
  triggered: boolean
  severity: AlertInstance['severity']
}

interface ConditionEvaluationResult {
  conditionId: string
  conditionType: AlertCondition['type']
  satisfied: boolean
  actualValue: number | string
  expectedValue: number | string
  threshold: number | string
}

interface MetricsWindow {
  windowKey: string
  timeWindow: string
  metrics: Array<{
    timestamp: string
    value: number
    executionId?: string
    workflowId?: string
  }>
  aggregatedValue?: number
  lastCleanup: number
}

export class AlertEngine extends EventEmitter implements IAlertEngine {
  private static instance: AlertEngine
  private alertRules = new Map<string, AlertRule>()
  private activeAlerts = new Map<string, AlertInstance>()
  private metricsWindows = new Map<string, MetricsWindow>()
  private evaluationInterval: NodeJS.Timeout
  private cleanupInterval: NodeJS.Timeout

  private readonly EVALUATION_INTERVAL_MS = 10000 // 10 seconds
  private readonly CLEANUP_INTERVAL_MS = 300000 // 5 minutes
  private readonly METRICS_RETENTION_MS = 86400000 // 24 hours

  private constructor() {
    super()

    // Start periodic rule evaluation
    this.evaluationInterval = setInterval(() => {
      this.evaluateAllRules()
    }, this.EVALUATION_INTERVAL_MS)

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleData()
    }, this.CLEANUP_INTERVAL_MS)

    logger.info('AlertEngine initialized with periodic evaluation')
  }

  static getInstance(): AlertEngine {
    if (!AlertEngine.instance) {
      AlertEngine.instance = new AlertEngine()
    }
    return AlertEngine.instance
  }

  /**
   * Evaluate alert rules based on execution metrics
   */
  async evaluateRules(executionId: string, metrics: PerformanceMetrics): Promise<void> {
    const operationId = `eval-${executionId}-${Date.now()}`
    logger.debug(`[${operationId}] Evaluating alert rules for execution ${executionId}`)

    try {
      // Update metrics windows
      await this.updateMetricsWindows(metrics)

      // Get applicable rules for this workflow
      const applicableRules = Array.from(this.alertRules.values()).filter((rule) => {
        if (!rule.enabled) return false

        // Check workspace match (assuming workspaceId is available in metrics context)
        // This would need to be enhanced based on actual metrics structure

        // Check workflow filter
        if (rule.workflowIds && rule.workflowIds.length > 0) {
          return rule.workflowIds.includes(metrics.workflowId)
        }

        return true
      })

      logger.debug(`[${operationId}] Found ${applicableRules.length} applicable rules`)

      // Evaluate each rule
      for (const rule of applicableRules) {
        try {
          const evaluation = await this.evaluateRule(rule, metrics)

          if (evaluation.triggered) {
            await this.handleTriggeredAlert(rule, evaluation, metrics)
          } else {
            // Check if we should resolve an existing alert
            await this.checkAlertResolution(rule.id, evaluation)
          }
        } catch (error) {
          logger.error(`[${operationId}] Error evaluating rule ${rule.id}:`, error)
        }
      }
    } catch (error) {
      logger.error(`[${operationId}] Error in rule evaluation:`, error)
    }
  }

  /**
   * Create a new alert rule
   */
  async createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const operationId = `create-rule-${Date.now()}`
    logger.debug(`[${operationId}] Creating new alert rule: ${rule.name}`)

    try {
      // Validate rule conditions
      this.validateAlertRule(rule)

      const now = new Date().toISOString()
      const fullRule: AlertRule = {
        ...rule,
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      }

      this.alertRules.set(fullRule.id, fullRule)

      logger.info(`[${operationId}] Alert rule created: ${fullRule.id} - ${fullRule.name}`)

      // Emit event
      this.emit('rule_created', {
        type: 'alert_rule_created',
        ruleId: fullRule.id,
        rule: fullRule,
      })

      return fullRule
    } catch (error) {
      logger.error(`[${operationId}] Error creating alert rule:`, error)
      throw error
    }
  }

  /**
   * Update an existing alert rule
   */
  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const operationId = `update-rule-${ruleId}`
    logger.debug(`[${operationId}] Updating alert rule`)

    try {
      const existingRule = this.alertRules.get(ruleId)
      if (!existingRule) {
        throw new Error(`Alert rule not found: ${ruleId}`)
      }

      // Validate updates
      const updatedRule = { ...existingRule, ...updates }
      this.validateAlertRule(updatedRule)

      updatedRule.updatedAt = new Date().toISOString()
      this.alertRules.set(ruleId, updatedRule)

      logger.info(`[${operationId}] Alert rule updated: ${ruleId}`)

      // Emit event
      this.emit('rule_updated', {
        type: 'alert_rule_updated',
        ruleId,
        rule: updatedRule,
        changes: Object.keys(updates),
      })

      return updatedRule
    } catch (error) {
      logger.error(`[${operationId}] Error updating alert rule:`, error)
      throw error
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const operationId = `delete-rule-${ruleId}`
    logger.debug(`[${operationId}] Deleting alert rule`)

    try {
      const rule = this.alertRules.get(ruleId)
      if (!rule) {
        throw new Error(`Alert rule not found: ${ruleId}`)
      }

      // Resolve any active alerts for this rule
      const activeAlertsForRule = Array.from(this.activeAlerts.values()).filter(
        (alert) => alert.ruleId === ruleId && alert.status === 'active'
      )

      for (const alert of activeAlertsForRule) {
        await this.resolveAlert(alert.id, 'system', 'Rule deleted')
      }

      this.alertRules.delete(ruleId)

      logger.info(`[${operationId}] Alert rule deleted: ${ruleId}`)

      // Emit event
      this.emit('rule_deleted', {
        type: 'alert_rule_deleted',
        ruleId,
        resolvedAlerts: activeAlertsForRule.length,
      })
    } catch (error) {
      logger.error(`[${operationId}] Error deleting alert rule:`, error)
      throw error
    }
  }

  /**
   * Get active alerts for a workspace
   */
  async getActiveAlerts(workspaceId: string): Promise<AlertInstance[]> {
    const alerts = Array.from(this.activeAlerts.values())
      .filter((alert) => {
        const rule = this.alertRules.get(alert.ruleId)
        return rule?.workspaceId === workspaceId && alert.status === 'active'
      })
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())

    logger.debug(`Retrieved ${alerts.length} active alerts for workspace ${workspaceId}`)
    return alerts
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const operationId = `ack-alert-${alertId}`
    logger.debug(`[${operationId}] Acknowledging alert`)

    try {
      const alert = this.activeAlerts.get(alertId)
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`)
      }

      if (alert.status !== 'active') {
        throw new Error(`Cannot acknowledge alert in status: ${alert.status}`)
      }

      alert.status = 'acknowledged'
      alert.acknowledgedAt = new Date().toISOString()
      alert.acknowledgedBy = userId

      logger.info(`[${operationId}] Alert acknowledged: ${alertId} by ${userId}`)

      // Emit event
      const alertEvent: AlertEvent = {
        type: 'alert_acknowledged',
        source: 'alert',
        timestamp: alert.acknowledgedAt,
        alertId,
        ruleId: alert.ruleId,
        data: alert,
      }
      this.emit('alert_acknowledged', alertEvent)
    } catch (error) {
      logger.error(`[${operationId}] Error acknowledging alert:`, error)
      throw error
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string, reason?: string): Promise<void> {
    const operationId = `resolve-alert-${alertId}`
    logger.debug(`[${operationId}] Resolving alert`)

    try {
      const alert = this.activeAlerts.get(alertId)
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`)
      }

      if (alert.status === 'resolved') {
        return // Already resolved
      }

      alert.status = 'resolved'
      alert.resolvedAt = new Date().toISOString()

      if (reason) {
        alert.details = { ...alert.details, resolutionReason: reason }
      }

      logger.info(`[${operationId}] Alert resolved: ${alertId} by ${userId}`)

      // Emit event
      const alertEvent: AlertEvent = {
        type: 'alert_resolved',
        source: 'alert',
        timestamp: alert.resolvedAt,
        alertId,
        ruleId: alert.ruleId,
        data: alert,
      }
      this.emit('alert_resolved', alertEvent)

      // Remove from active alerts after delay for final notifications
      setTimeout(() => {
        this.activeAlerts.delete(alertId)
      }, 30000) // 30 second delay
    } catch (error) {
      logger.error(`[${operationId}] Error resolving alert:`, error)
      throw error
    }
  }

  /**
   * Process execution updates for alert evaluation
   */
  async processExecutionUpdate(update: ExecutionUpdate): Promise<void> {
    try {
      // Convert execution update to metrics for evaluation
      if (update.type === 'execution_completed' || update.type === 'execution_failed') {
        const isFailure = update.type === 'execution_failed'

        // Create synthetic metrics for failure rate calculation
        const failureMetrics: PerformanceMetrics = {
          executionId: update.executionId,
          workflowId: update.workflowId,
          metrics: {
            executionTime: 0,
            resourceUsage: { cpu: 0, memory: 0, network: 0 },
            errorRate: isFailure ? 100 : 0,
          },
          timestamp: update.timestamp,
        }

        await this.evaluateRules(update.executionId, failureMetrics)
      }
    } catch (error) {
      logger.error('Error processing execution update for alerts:', error)
    }
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(
    rule: AlertRule,
    metrics: PerformanceMetrics
  ): Promise<AlertRuleEvaluation> {
    const conditionResults: ConditionEvaluationResult[] = []
    let triggered = true
    let maxSeverity: AlertInstance['severity'] = 'low'

    for (const condition of rule.conditions) {
      try {
        const result = await this.evaluateCondition(condition, metrics, rule.workflowIds)
        conditionResults.push(result)

        if (!result.satisfied) {
          triggered = false
        }

        // Determine severity based on condition criticality
        const conditionSeverity = this.determineSeverity(condition, result.actualValue as number)
        if (this.compareSeverity(conditionSeverity, maxSeverity) > 0) {
          maxSeverity = conditionSeverity
        }
      } catch (error) {
        logger.error(`Error evaluating condition ${condition.id}:`, error)
        conditionResults.push({
          conditionId: condition.id,
          conditionType: condition.type,
          satisfied: false,
          actualValue: 'error',
          expectedValue: condition.value,
          threshold: condition.value,
        })
        triggered = false
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      conditionResults,
      triggered,
      severity: maxSeverity,
    }
  }

  /**
   * Evaluate a single alert condition
   */
  private async evaluateCondition(
    condition: AlertCondition,
    metrics: PerformanceMetrics,
    workflowIds?: string[]
  ): Promise<ConditionEvaluationResult> {
    let actualValue: number | string = 0

    switch (condition.type) {
      case 'execution_duration':
        actualValue = metrics.metrics.executionTime
        break

      case 'resource_usage':
        // Use CPU usage as primary resource metric
        actualValue = metrics.metrics.resourceUsage.cpu
        break

      case 'error_count':
      case 'failure_rate':
        actualValue = metrics.metrics.errorRate || 0
        break

      case 'cost_threshold':
        // This would need cost information from metrics
        actualValue = 0 // Placeholder
        break

      case 'throughput':
        actualValue = metrics.metrics.throughput || 0
        break

      default:
        throw new Error(`Unsupported condition type: ${condition.type}`)
    }

    // Apply time window aggregation if specified
    if (condition.timeWindow && condition.timeWindow !== 'instant') {
      actualValue = await this.getAggregatedValue(
        condition,
        metrics.workflowId,
        actualValue as number
      )
    }

    // Evaluate condition
    const expectedValue =
      typeof condition.value === 'string' ? Number.parseFloat(condition.value) : condition.value
    const satisfied = this.evaluateOperator(
      actualValue as number,
      condition.operator,
      expectedValue as number
    )

    return {
      conditionId: condition.id,
      conditionType: condition.type,
      satisfied,
      actualValue,
      expectedValue: expectedValue,
      threshold: expectedValue,
    }
  }

  /**
   * Evaluate condition operator
   */
  private evaluateOperator(
    actual: number,
    operator: AlertCondition['operator'],
    expected: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return actual > expected
      case 'gte':
        return actual >= expected
      case 'lt':
        return actual < expected
      case 'lte':
        return actual <= expected
      case 'eq':
        return Math.abs(actual - expected) < 0.001 // Float comparison
      case 'contains':
      case 'not_contains':
        // String operations - would need different handling
        return false
      default:
        throw new Error(`Unsupported operator: ${operator}`)
    }
  }

  /**
   * Get aggregated value for time window conditions
   */
  private async getAggregatedValue(
    condition: AlertCondition,
    workflowId: string,
    currentValue: number
  ): Promise<number> {
    const windowKey = `${condition.id}-${workflowId}-${condition.timeWindow}`

    let window = this.metricsWindows.get(windowKey)
    if (!window) {
      window = {
        windowKey,
        timeWindow: condition.timeWindow,
        metrics: [],
        lastCleanup: Date.now(),
      }
      this.metricsWindows.set(windowKey, window)
    }

    // Add current value
    window.metrics.push({
      timestamp: new Date().toISOString(),
      value: currentValue,
      workflowId,
    })

    // Clean old values
    const windowMs = this.parseTimeWindow(condition.timeWindow)
    const cutoffTime = Date.now() - windowMs
    window.metrics = window.metrics.filter((m) => new Date(m.timestamp).getTime() > cutoffTime)

    // Calculate aggregated value
    if (window.metrics.length === 0) return currentValue

    const values = window.metrics.map((m) => m.value)

    switch (condition.aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0)
      case 'max':
        return Math.max(...values)
      case 'min':
        return Math.min(...values)
      case 'count':
        return values.length
      default:
        return currentValue
    }
  }

  /**
   * Parse time window string to milliseconds
   */
  private parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([smhd])$/)
    if (!match) return 300000 // 5 minutes default

    const [, value, unit] = match
    const num = Number.parseInt(value, 10)

    switch (unit) {
      case 's':
        return num * 1000
      case 'm':
        return num * 60 * 1000
      case 'h':
        return num * 60 * 60 * 1000
      case 'd':
        return num * 24 * 60 * 60 * 1000
      default:
        return 300000
    }
  }

  /**
   * Handle triggered alert
   */
  private async handleTriggeredAlert(
    rule: AlertRule,
    evaluation: AlertRuleEvaluation,
    metrics: PerformanceMetrics
  ): Promise<void> {
    const operationId = `trigger-${rule.id}-${Date.now()}`
    logger.debug(`[${operationId}] Handling triggered alert for rule ${rule.name}`)

    try {
      // Check if alert already exists and is in cooldown
      const existingAlert = this.findExistingAlert(rule.id, metrics.workflowId, metrics.executionId)
      if (existingAlert && this.isInCooldown(existingAlert, rule.cooldownPeriod)) {
        logger.debug(`[${operationId}] Alert in cooldown, skipping trigger`)
        return
      }

      // Create alert instance
      const alert: AlertInstance = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        workflowId: metrics.workflowId,
        executionId: metrics.executionId,
        severity: evaluation.severity,
        status: 'active',
        triggeredAt: new Date().toISOString(),
        message: this.generateAlertMessage(rule, evaluation),
        details: {
          conditionResults: evaluation.conditionResults,
          metrics: metrics.metrics,
          evaluationTimestamp: new Date().toISOString(),
        },
        escalationLevel: 0,
        notificationsSent: [],
      }

      this.activeAlerts.set(alert.id, alert)

      logger.info(`[${operationId}] Alert triggered: ${alert.id} - ${alert.message}`)

      // Send notifications
      await this.sendAlertNotifications(rule, alert)

      // Emit event
      const alertEvent: AlertEvent = {
        type: 'alert_triggered',
        source: 'alert',
        timestamp: alert.triggeredAt,
        alertId: alert.id,
        ruleId: rule.id,
        data: alert,
      }
      this.emit('alert_triggered', alertEvent)
    } catch (error) {
      logger.error(`[${operationId}] Error handling triggered alert:`, error)
    }
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(rule: AlertRule, alert: AlertInstance): Promise<void> {
    const operationId = `notify-${alert.id}`
    logger.debug(`[${operationId}] Sending alert notifications`)

    try {
      for (const action of rule.actions) {
        if (action.enabled) {
          try {
            await notificationService.sendNotification(action, alert, rule)

            // Record successful notification
            alert.notificationsSent.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              actionId: action.id,
              actionType: action.type,
              sentAt: new Date().toISOString(),
              status: 'sent',
            })
          } catch (error) {
            logger.error(`[${operationId}] Error sending ${action.type} notification:`, error)

            // Record failed notification
            alert.notificationsSent.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              actionId: action.id,
              actionType: action.type,
              sentAt: new Date().toISOString(),
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      logger.debug(`[${operationId}] Sent ${alert.notificationsSent.length} notifications`)
    } catch (error) {
      logger.error(`[${operationId}] Error in notification process:`, error)
    }
  }

  /**
   * Validate alert rule configuration
   */
  private validateAlertRule(rule: Partial<AlertRule>): void {
    if (!rule.name || rule.name.trim().length === 0) {
      throw new Error('Alert rule name is required')
    }

    if (!rule.workspaceId) {
      throw new Error('Workspace ID is required')
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error('At least one condition is required')
    }

    if (!rule.actions || rule.actions.length === 0) {
      throw new Error('At least one action is required')
    }

    // Validate conditions
    for (const condition of rule.conditions) {
      if (!condition.type || !condition.operator || condition.value === undefined) {
        throw new Error('Invalid condition configuration')
      }
    }

    // Validate actions
    for (const action of rule.actions) {
      if (!action.type || !action.configuration) {
        throw new Error('Invalid action configuration')
      }
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, evaluation: AlertRuleEvaluation): string {
    const failedConditions = evaluation.conditionResults.filter((c) => c.satisfied)

    if (failedConditions.length === 1) {
      const condition = failedConditions[0]
      return `${rule.name}: ${condition.conditionType} ${condition.actualValue} ${this.getOperatorText(rule.conditions.find((c) => c.id === condition.conditionId)?.operator || 'gt')} ${condition.threshold}`
    }

    return `${rule.name}: ${failedConditions.length} conditions triggered`
  }

  private getOperatorText(operator: AlertCondition['operator']): string {
    switch (operator) {
      case 'gt':
        return 'greater than'
      case 'gte':
        return 'greater than or equal to'
      case 'lt':
        return 'less than'
      case 'lte':
        return 'less than or equal to'
      case 'eq':
        return 'equal to'
      default:
        return operator
    }
  }

  /**
   * Utility methods
   */
  private findExistingAlert(
    ruleId: string,
    workflowId?: string,
    executionId?: string
  ): AlertInstance | undefined {
    return Array.from(this.activeAlerts.values()).find(
      (alert) =>
        alert.ruleId === ruleId &&
        alert.status === 'active' &&
        (!workflowId || alert.workflowId === workflowId)
    )
  }

  private isInCooldown(alert: AlertInstance, cooldownMinutes: number): boolean {
    const cooldownMs = cooldownMinutes * 60 * 1000
    const timeSinceTriggered = Date.now() - new Date(alert.triggeredAt).getTime()
    return timeSinceTriggered < cooldownMs
  }

  private determineSeverity(
    condition: AlertCondition,
    actualValue: number
  ): AlertInstance['severity'] {
    // Simple heuristic - could be made more sophisticated
    const threshold =
      typeof condition.value === 'string' ? Number.parseFloat(condition.value) : condition.value
    const ratio = Math.abs(actualValue - threshold) / Math.abs(threshold || 1)

    if (ratio > 2) return 'critical'
    if (ratio > 1) return 'high'
    if (ratio > 0.5) return 'medium'
    return 'low'
  }

  private compareSeverity(a: AlertInstance['severity'], b: AlertInstance['severity']): number {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
    return severityOrder[a] - severityOrder[b]
  }

  private async checkAlertResolution(
    ruleId: string,
    evaluation: AlertRuleEvaluation
  ): Promise<void> {
    const activeAlert = Array.from(this.activeAlerts.values()).find(
      (alert) => alert.ruleId === ruleId && alert.status === 'active'
    )

    if (activeAlert && !evaluation.triggered) {
      await this.resolveAlert(activeAlert.id, 'system', 'Conditions no longer met')
    }
  }

  private async evaluateAllRules(): Promise<void> {
    // This would need to be triggered by actual metrics
    // For now, it's a placeholder for periodic evaluation
  }

  private async updateMetricsWindows(metrics: PerformanceMetrics): Promise<void> {
    // Update metrics windows is handled in getAggregatedValue
  }

  private cleanupStaleData(): void {
    const now = Date.now()
    let cleanedCount = 0

    // Clean up old metrics windows
    for (const [key, window] of this.metricsWindows.entries()) {
      if (now - window.lastCleanup > this.METRICS_RETENTION_MS) {
        this.metricsWindows.delete(key)
        cleanedCount++
      }
    }

    // Clean up resolved alerts
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt) {
        const resolvedAge = now - new Date(alert.resolvedAt).getTime()
        if (resolvedAge > this.CLEANUP_INTERVAL_MS * 2) {
          // 10 minutes after resolution
          this.activeAlerts.delete(alertId)
          cleanedCount++
        }
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} stale data items`)
    }
  }

  /**
   * Get engine statistics
   */
  getEngineStats(): {
    rules: { total: number; enabled: number; disabled: number }
    alerts: { active: number; acknowledged: number; resolved: number }
    metricsWindows: number
  } {
    const rules = Array.from(this.alertRules.values())
    const alerts = Array.from(this.activeAlerts.values())

    return {
      rules: {
        total: rules.length,
        enabled: rules.filter((r) => r.enabled).length,
        disabled: rules.filter((r) => !r.enabled).length,
      },
      alerts: {
        active: alerts.filter((a) => a.status === 'active').length,
        acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
        resolved: alerts.filter((a) => a.status === 'resolved').length,
      },
      metricsWindows: this.metricsWindows.size,
    }
  }

  /**
   * Destroy the engine and cleanup resources
   */
  destroy(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.alertRules.clear()
    this.activeAlerts.clear()
    this.metricsWindows.clear()
    this.removeAllListeners()

    logger.info('AlertEngine destroyed and resources cleaned up')
  }
}

// Export singleton instance
export const alertEngine = AlertEngine.getInstance()
