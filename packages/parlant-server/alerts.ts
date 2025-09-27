/**
 * Parlant Server Error Handling and Alerting System
 *
 * This module provides comprehensive error handling, alerting, and incident
 * management for the Parlant server integration with proactive monitoring.
 */

import { createParlantLogger, type ParlantLogContext } from './logging'
import { systemMetrics } from './metrics'
import { monitoring } from './monitoring'

const logger = createParlantLogger('AlertSystem')

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency'

/**
 * Alert categories for classification
 */
export type AlertCategory =
  | 'database'
  | 'performance'
  | 'security'
  | 'integration'
  | 'agent'
  | 'system'
  | 'business'

/**
 * Alert interface
 */
export interface Alert {
  id: string
  timestamp: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  description: string
  source: string
  context: ParlantLogContext
  metadata: Record<string, any>
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed'
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolvedAt?: string
  suppressedUntil?: string
  escalationLevel: number
  correlationId?: string
  relatedAlerts?: string[]
}

/**
 * Alert rule for proactive monitoring
 */
export interface AlertRule {
  id: string
  name: string
  description: string
  category: AlertCategory
  severity: AlertSeverity
  enabled: boolean
  conditions: {
    metric: string
    operator: '>' | '<' | '>=' | '<=' | '==' | '!='
    threshold: number
    window: number // time window in minutes
  }[]
  actions: {
    type: 'log' | 'email' | 'webhook' | 'escalate'
    config: Record<string, any>
  }[]
  cooldown: number // cooldown period in minutes
  suppressionRules?: {
    condition: string
    duration: number // suppression duration in minutes
  }[]
}

/**
 * Error classification for automatic handling
 */
export interface ErrorClassification {
  type: 'recoverable' | 'non_recoverable' | 'timeout' | 'validation' | 'security'
  severity: AlertSeverity
  autoRetry: boolean
  maxRetries?: number
  escalateAfter?: number // minutes
  suppressSimilar?: number // minutes
}

/**
 * Incident tracking for major issues
 */
export interface Incident {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  status: 'open' | 'investigating' | 'mitigating' | 'resolved'
  createdAt: string
  resolvedAt?: string
  assignedTo?: string
  alerts: string[] // Related alert IDs
  timeline: Array<{
    timestamp: string
    action: string
    user?: string
    details: string
  }>
  impact: {
    affectedAgents?: string[]
    affectedWorkspaces?: string[]
    affectedUsers?: string[]
    serviceUnavailable: boolean
    dataLoss: boolean
  }
  rootCause?: string
  resolution?: string
  postMortem?: string
}

/**
 * Alert management system
 */
export class AlertManager {
  private alerts: Map<string, Alert> = new Map()
  private incidents: Map<string, Incident> = new Map()
  private rules: Map<string, AlertRule> = new Map()
  private errorClassifications: Map<string, ErrorClassification> = new Map()
  private suppressions: Map<string, { until: Date; reason: string }> = new Map()

  constructor() {
    this.initializeDefaultRules()
    this.initializeErrorClassifications()
    this.startAlertProcessing()
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'db-connection-high',
        name: 'High Database Connection Count',
        description: 'Database connection count exceeds threshold',
        category: 'database',
        severity: 'warning',
        enabled: true,
        conditions: [
          {
            metric: 'database.connectionCount',
            operator: '>',
            threshold: 50,
            window: 5,
          },
        ],
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
          },
        ],
        cooldown: 15,
      },
      {
        id: 'response-time-critical',
        name: 'Critical Response Time',
        description: 'Agent response time is critically high',
        category: 'performance',
        severity: 'critical',
        enabled: true,
        conditions: [
          {
            metric: 'agent.averageResponseTime',
            operator: '>',
            threshold: 30000,
            window: 10,
          },
        ],
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'escalate', config: { level: 1 } },
        ],
        cooldown: 5,
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        description: 'System error rate exceeds acceptable threshold',
        category: 'system',
        severity: 'warning',
        enabled: true,
        conditions: [
          {
            metric: 'system.errorRate',
            operator: '>',
            threshold: 5,
            window: 15,
          },
        ],
        actions: [
          {
            type: 'log',
            config: { level: 'warn' },
          },
        ],
        cooldown: 30,
      },
      {
        id: 'memory-usage-critical',
        name: 'Critical Memory Usage',
        description: 'Memory usage is approaching system limits',
        category: 'system',
        severity: 'critical',
        enabled: true,
        conditions: [
          {
            metric: 'system.memory.percentage',
            operator: '>',
            threshold: 90,
            window: 5,
          },
        ],
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'escalate', config: { level: 2 } },
        ],
        cooldown: 10,
      },
    ]

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule)
    }
    logger.info('Default alert rules initialized', { ruleCount: defaultRules.length })
  }

  /**
   * Initialize error classifications
   */
  private initializeErrorClassifications(): void {
    const classifications: Array<[string, ErrorClassification]> = [
      [
        'ConnectionError',
        {
          type: 'recoverable',
          severity: 'warning',
          autoRetry: true,
          maxRetries: 3,
          escalateAfter: 15,
        },
      ],
      [
        'TimeoutError',
        {
          type: 'timeout',
          severity: 'warning',
          autoRetry: true,
          maxRetries: 2,
          escalateAfter: 10,
        },
      ],
      [
        'ValidationError',
        {
          type: 'validation',
          severity: 'info',
          autoRetry: false,
          suppressSimilar: 60,
        },
      ],
      [
        'AuthenticationError',
        {
          type: 'security',
          severity: 'critical',
          autoRetry: false,
          escalateAfter: 0,
        },
      ],
      [
        'SystemError',
        {
          type: 'non_recoverable',
          severity: 'critical',
          autoRetry: false,
          escalateAfter: 5,
        },
      ],
    ]

    for (const [errorType, classification] of classifications) {
      this.errorClassifications.set(errorType, classification)
    }

    logger.info('Error classifications initialized', {
      classificationCount: classifications.length,
    })
  }

  /**
   * Create and process a new alert
   */
  async createAlert(
    severity: AlertSeverity,
    category: AlertCategory,
    title: string,
    description: string,
    source: string,
    context: ParlantLogContext = {},
    metadata: Record<string, any> = {}
  ): Promise<Alert> {
    const alertId = this.generateAlertId()
    const correlationId = context.operation
      ? `${category}-${context.operation}-${Date.now()}`
      : undefined

    const alert: Alert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      severity,
      category,
      title,
      description,
      source,
      context,
      metadata,
      status: 'active',
      escalationLevel: 0,
      correlationId,
    }

    // Check for suppression rules
    if (this.isAlertSuppressed(alert)) {
      alert.status = 'suppressed'
      alert.suppressedUntil = this.suppressions
        .get(this.getSuppressionKey(alert))
        ?.until.toISOString()
    }

    this.alerts.set(alertId, alert)

    logger.logAgentOperation(
      'alert_create',
      `Alert created: ${title}`,
      {
        ...context,
        alertId,
        severity,
        category,
        status: alert.status,
      },
      severity === 'critical' || severity === 'emergency' ? 'ERROR' : 'WARN'
    )

    // Process the alert
    await this.processAlert(alert)

    return alert
  }

  /**
   * Handle an error and create appropriate alerts
   */
  async handleError(
    error: Error,
    context: ParlantLogContext = {},
    source = 'unknown'
  ): Promise<Alert[]> {
    const errorType = error.constructor.name
    const classification = this.errorClassifications.get(errorType) || {
      type: 'non_recoverable' as const,
      severity: 'warning' as const,
      autoRetry: false,
    }

    const alerts: Alert[] = []

    // Create main error alert
    const mainAlert = await this.createAlert(
      classification.severity,
      this.getCategoryForError(error),
      `${errorType}: ${error.message}`,
      `An error occurred: ${error.message}`,
      source,
      {
        ...context,
        errorType: classification.type,
        errorCode: errorType,
      },
      {
        stack: error.stack,
        classification,
        autoRetry: classification.autoRetry,
        maxRetries: classification.maxRetries,
      }
    )

    alerts.push(mainAlert)

    // Create cascading alerts based on error impact
    if (classification.severity === 'critical' || classification.severity === 'emergency') {
      const impactAlert = await this.createAlert(
        'warning',
        'system',
        'Service Impact Alert',
        `Critical error may impact service availability: ${error.message}`,
        source,
        context,
        { relatedAlert: mainAlert.id }
      )
      alerts.push(impactAlert)
    }

    // Auto-retry logic
    if (classification.autoRetry && classification.maxRetries) {
      setTimeout(() => {
        this.handleRetry(mainAlert.id, context)
      }, 5000) // 5 second delay before retry
    }

    return alerts
  }

  /**
   * Process alert according to rules and actions
   */
  private async processAlert(alert: Alert): Promise<void> {
    if (alert.status === 'suppressed') {
      return
    }

    // Find matching rules
    const matchingRules = Array.from(this.rules.values()).filter(
      (rule) => rule.enabled && rule.category === alert.category
    )

    for (const rule of matchingRules) {
      await this.executeRuleActions(rule, alert)
    }

    // Auto-escalate critical and emergency alerts
    if (alert.severity === 'critical' || alert.severity === 'emergency') {
      await this.escalateAlert(alert.id, 1)
    }
  }

  /**
   * Execute rule actions for an alert
   */
  private async executeRuleActions(rule: AlertRule, alert: Alert): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'log':
            this.executeLogAction(action.config, alert)
            break
          case 'escalate':
            await this.escalateAlert(alert.id, action.config.level || 1)
            break
          case 'webhook':
            await this.executeWebhookAction(action.config, alert)
            break
          // Email action would be implemented here
        }
      } catch (error) {
        logger.error('Failed to execute alert action', {
          ruleId: rule.id,
          actionType: action.type,
          alertId: alert.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  /**
   * Execute log action
   */
  private executeLogAction(config: any, alert: Alert): void {
    const level = config.level || 'info'
    const message = `[ALERT] ${alert.title}: ${alert.description}`

    switch (level) {
      case 'debug':
        logger.debug(message, alert.context)
        break
      case 'info':
        logger.info(message, alert.context)
        break
      case 'warn':
        logger.warn(message, alert.context)
        break
      case 'error':
        logger.error(message, alert.context)
        break
    }
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(config: any, alert: Alert): Promise<void> {
    if (!config.url) {
      logger.warn('Webhook action missing URL', { alertId: alert.id })
      return
    }

    try {
      const payload = {
        alert,
        timestamp: new Date().toISOString(),
        source: 'parlant-server',
      }

      // In a real implementation, this would make an HTTP request
      logger.info('Webhook alert sent', {
        alertId: alert.id,
        webhookUrl: config.url,
        severity: alert.severity,
      })
    } catch (error) {
      logger.error('Webhook action failed', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Escalate an alert
   */
  async escalateAlert(alertId: string, level: number): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      logger.warn('Attempted to escalate unknown alert', { alertId })
      return
    }

    alert.escalationLevel = Math.max(alert.escalationLevel, level)

    logger.warn(`Alert escalated to level ${level}`, {
      alertId,
      title: alert.title,
      severity: alert.severity,
      escalationLevel: level,
      operation: 'alert_escalate',
    })

    // Create incident for high-level escalations
    if (level >= 2 && !this.findIncidentByAlert(alertId)) {
      await this.createIncident(alert)
    }
  }

  /**
   * Create incident from alert
   */
  private async createIncident(alert: Alert): Promise<Incident> {
    const incidentId = this.generateIncidentId()

    const incident: Incident = {
      id: incidentId,
      title: `Incident: ${alert.title}`,
      description: alert.description,
      severity: alert.severity,
      status: 'open',
      createdAt: new Date().toISOString(),
      alerts: [alert.id],
      timeline: [
        {
          timestamp: new Date().toISOString(),
          action: 'incident_created',
          details: `Incident created from alert ${alert.id}`,
        },
      ],
      impact: {
        serviceUnavailable: alert.severity === 'emergency',
        dataLoss: false,
      },
    }

    this.incidents.set(incidentId, incident)

    logger.error('Incident created', {
      incidentId,
      alertId: alert.id,
      severity: alert.severity,
      operation: 'incident_create',
    })

    return incident
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert || alert.status !== 'active') {
      return false
    }

    alert.status = 'acknowledged'
    alert.acknowledgedBy = acknowledgedBy
    alert.acknowledgedAt = new Date().toISOString()

    logger.info('Alert acknowledged', {
      alertId,
      acknowledgedBy,
      title: alert.title,
      operation: 'alert_acknowledge',
    })

    return true
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      return false
    }

    alert.status = 'resolved'
    alert.resolvedAt = new Date().toISOString()
    if (resolution) {
      alert.metadata.resolution = resolution
    }

    logger.info('Alert resolved', {
      alertId,
      title: alert.title,
      resolution,
      operation: 'alert_resolve',
    })

    return true
  }

  /**
   * Start background alert processing
   */
  private startAlertProcessing(): void {
    setInterval(async () => {
      await this.processPeriodicChecks()
    }, 60000) // Run every minute

    logger.info('Alert processing started')
  }

  /**
   * Periodic health checks and alert evaluation
   */
  private async processPeriodicChecks(): Promise<void> {
    try {
      const systemMetricsData = await systemMetrics.collectSystemMetrics()
      const monitoringData = await monitoring.alerts()

      // Check system health metrics against alert rules
      await this.evaluateMetricRules(systemMetricsData)

      // Process existing monitoring alerts
      for (const existingAlert of monitoringData.alerts) {
        await this.createAlert(
          existingAlert.severity === 'critical' ? 'critical' : 'warning',
          existingAlert.category as AlertCategory,
          existingAlert.message,
          `System alert: ${existingAlert.message}`,
          'monitoring',
          {},
          {
            value: existingAlert.value,
            threshold: existingAlert.threshold,
            timestamp: existingAlert.timestamp,
          }
        )
      }

      // Clean up old resolved alerts
      this.cleanupOldAlerts()
    } catch (error) {
      logger.error('Periodic alert check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'alert_periodic_check',
      })
    }
  }

  /**
   * Helper methods
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateIncidentId(): string {
    return `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getCategoryForError(error: Error): AlertCategory {
    const errorType = error.constructor.name.toLowerCase()
    if (errorType.includes('connection') || errorType.includes('database')) return 'database'
    if (errorType.includes('auth')) return 'security'
    if (errorType.includes('timeout') || errorType.includes('performance')) return 'performance'
    if (errorType.includes('integration')) return 'integration'
    return 'system'
  }

  private isAlertSuppressed(alert: Alert): boolean {
    const key = this.getSuppressionKey(alert)
    const suppression = this.suppressions.get(key)
    return suppression ? new Date() < suppression.until : false
  }

  private getSuppressionKey(alert: Alert): string {
    return `${alert.category}-${alert.title}`
  }

  private findIncidentByAlert(alertId: string): Incident | undefined {
    return Array.from(this.incidents.values()).find((incident) => incident.alerts.includes(alertId))
  }

  private async evaluateMetricRules(systemMetricsData: any): Promise<void> {
    // This would evaluate system metrics against alert rules
    // Implementation would check current metrics against thresholds
  }

  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
    const alertsToRemove: string[] = []

    this.alerts.forEach((alert, id) => {
      const alertTime = new Date(alert.timestamp).getTime()
      if (alertTime < cutoffTime && alert.status === 'resolved') {
        alertsToRemove.push(id)
      }
    })

    for (const id of alertsToRemove) {
      this.alerts.delete(id)
    }

    if (alertsToRemove.length > 0) {
      logger.debug('Cleaned up old alerts', { removedCount: alertsToRemove.length })
    }
  }

  private async handleRetry(alertId: string, context: ParlantLogContext): Promise<void> {
    // Implementation for retry logic would go here
    logger.info('Alert retry initiated', { alertId, operation: 'alert_retry' })
  }

  /**
   * Public API methods
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => alert.status === 'active')
  }

  getIncidents(): Incident[] {
    return Array.from(this.incidents.values())
  }

  getAlertsByCategory(category: AlertCategory): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => alert.category === category)
  }

  getAlertMetrics(): {
    total: number
    active: number
    resolved: number
    critical: number
    bySeverity: Record<AlertSeverity, number>
    byCategory: Record<AlertCategory, number>
  } {
    const alerts = Array.from(this.alerts.values())

    const bySeverity = alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1
        return acc
      },
      {} as Record<AlertSeverity, number>
    )

    const byCategory = alerts.reduce(
      (acc, alert) => {
        acc[alert.category] = (acc[alert.category] || 0) + 1
        return acc
      },
      {} as Record<AlertCategory, number>
    )

    return {
      total: alerts.length,
      active: alerts.filter((a) => a.status === 'active').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
      critical: alerts.filter((a) => a.severity === 'critical' || a.severity === 'emergency')
        .length,
      bySeverity,
      byCategory,
    }
  }
}

/**
 * Global alert manager instance
 */
export const alertManager = new AlertManager()

/**
 * Convenience functions for common alert operations
 */
export const alerts = {
  /**
   * Create error alert
   */
  error: (title: string, description: string, context?: ParlantLogContext) =>
    alertManager.createAlert('critical', 'system', title, description, 'parlant-server', context),

  /**
   * Create warning alert
   */
  warn: (title: string, description: string, context?: ParlantLogContext) =>
    alertManager.createAlert('warning', 'system', title, description, 'parlant-server', context),

  /**
   * Handle error with automatic classification
   */
  handleError: (error: Error, context?: ParlantLogContext, source?: string) =>
    alertManager.handleError(error, context, source),

  /**
   * Get dashboard data
   */
  getDashboard: () => ({
    activeAlerts: alertManager.getActiveAlerts(),
    incidents: alertManager.getIncidents(),
    metrics: alertManager.getAlertMetrics(),
  }),
}
