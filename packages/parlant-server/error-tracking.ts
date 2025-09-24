/**
 * Parlant Server Error Tracking and Alerting System
 *
 * This module provides comprehensive error tracking, categorization, and alerting
 * capabilities for the Parlant server integration with real-time monitoring and reporting.
 */

import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { parlantLoggers, type ParlantLogContext } from './logging'
import { monitoring } from './monitoring'

const logger = createLogger('ParlantErrorTracking')

export interface ErrorDetails {
  id: string
  timestamp: string
  level: 'warning' | 'error' | 'critical'
  category: 'system' | 'database' | 'authentication' | 'integration' | 'agent' | 'user'
  service: string
  operation?: string
  message: string
  stack?: string
  context: ParlantLogContext
  metadata: {
    userAgent?: string
    requestId?: string
    userId?: string
    workspaceId?: string
    agentId?: string
    sessionId?: string

    // Technical details
    errorCode?: string
    httpStatus?: number
    responseTime?: number
    retryCount?: number

    // System context
    nodeVersion?: string
    memoryUsage?: number
    cpuUsage?: number

    // Additional data
    [key: string]: any
  }
}

export interface AlertRule {
  id: string
  name: string
  description: string
  enabled: boolean
  conditions: {
    errorLevel?: ('warning' | 'error' | 'critical')[]
    categories?: string[]
    services?: string[]
    operations?: string[]
    frequency?: {
      count: number
      timeWindowMinutes: number
    }
    threshold?: {
      errorRate?: number // Percentage
      responseTime?: number // Milliseconds
    }
  }
  actions: {
    log?: boolean
    notify?: boolean
    webhook?: {
      url: string
      method: 'POST' | 'GET'
      headers?: Record<string, string>
    }
    email?: {
      recipients: string[]
      subject: string
    }
  }
  cooldownMinutes?: number // Prevent alert spam
}

export interface AlertInstance {
  id: string
  ruleId: string
  timestamp: string
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  errors: ErrorDetails[]
  resolved: boolean
  resolvedAt?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
}

/**
 * Default alert rules for common error scenarios
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds threshold within time window',
    enabled: true,
    conditions: {
      errorLevel: ['error', 'critical'],
      frequency: {
        count: 10,
        timeWindowMinutes: 5
      }
    },
    actions: {
      log: true,
      notify: true
    },
    cooldownMinutes: 15
  },
  {
    id: 'database-errors',
    name: 'Database Connection Errors',
    description: 'Alert on database connection or query failures',
    enabled: true,
    conditions: {
      categories: ['database'],
      errorLevel: ['error', 'critical'],
      frequency: {
        count: 3,
        timeWindowMinutes: 5
      }
    },
    actions: {
      log: true,
      notify: true
    },
    cooldownMinutes: 10
  },
  {
    id: 'auth-failures',
    name: 'Authentication Failures',
    description: 'Alert on repeated authentication failures',
    enabled: true,
    conditions: {
      categories: ['authentication'],
      frequency: {
        count: 5,
        timeWindowMinutes: 10
      }
    },
    actions: {
      log: true,
      notify: true
    },
    cooldownMinutes: 20
  },
  {
    id: 'agent-critical-errors',
    name: 'Agent Critical Errors',
    description: 'Alert immediately on critical agent errors',
    enabled: true,
    conditions: {
      categories: ['agent'],
      errorLevel: ['critical']
    },
    actions: {
      log: true,
      notify: true
    },
    cooldownMinutes: 5
  },
  {
    id: 'system-performance',
    name: 'System Performance Degradation',
    description: 'Alert on high response times or resource usage',
    enabled: true,
    conditions: {
      threshold: {
        responseTime: 30000 // 30 seconds
      }
    },
    actions: {
      log: true,
      notify: true
    },
    cooldownMinutes: 30
  }
]

/**
 * Parlant Error Tracking Service
 */
export class ParlantErrorTracker {
  private errors: ErrorDetails[] = []
  private alerts: AlertInstance[] = []
  private alertRules: AlertRule[] = []
  private maxErrorHistory = 5000
  private maxAlertHistory = 1000
  private alertCooldowns = new Map<string, number>()

  constructor(alertRules: AlertRule[] = DEFAULT_ALERT_RULES) {
    this.alertRules = alertRules
    logger.info('Parlant Error Tracker initialized', {
      alertRules: alertRules.length,
      enabledRules: alertRules.filter(r => r.enabled).length
    })
  }

  /**
   * Track an error with comprehensive context
   */
  async trackError(
    level: ErrorDetails['level'],
    category: ErrorDetails['category'],
    service: string,
    message: string,
    error?: Error,
    context: ParlantLogContext = {},
    metadata: Partial<ErrorDetails['metadata']> = {}
  ): Promise<string> {
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
    const timestamp = new Date().toISOString()

    // Get system context
    const memoryUsage = process.memoryUsage()

    const errorDetails: ErrorDetails = {
      id: errorId,
      timestamp,
      level,
      category,
      service,
      operation: context.operation,
      message,
      stack: error?.stack,
      context,
      metadata: {
        ...metadata,
        errorCode: error?.name,
        nodeVersion: process.version,
        memoryUsage: memoryUsage.heapUsed,

        // Include request context if available
        requestId: context.metadata?.requestId || metadata.requestId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        agentId: context.agentId,
        sessionId: context.sessionId
      }
    }

    // Store error
    this.errors.push(errorDetails)
    if (this.errors.length > this.maxErrorHistory) {
      this.errors.shift()
    }

    // Log error appropriately
    const logContext = {
      ...context,
      errorId,
      errorLevel: level,
      errorCategory: category
    }

    switch (level) {
      case 'warning':
        parlantLoggers.monitoring.warn(message, logContext, errorDetails.metadata.requestId)
        break
      case 'error':
        parlantLoggers.monitoring.error(message, logContext, errorDetails.metadata.requestId)
        break
      case 'critical':
        parlantLoggers.monitoring.error(`[CRITICAL] ${message}`, logContext, errorDetails.metadata.requestId)
        break
    }

    // Check alert rules
    await this.evaluateAlertRules(errorDetails)

    logger.debug('Error tracked', {
      errorId,
      level,
      category,
      service,
      hasStack: !!error?.stack
    })

    return errorId
  }

  /**
   * Evaluate alert rules against the current error
   */
  private async evaluateAlertRules(error: ErrorDetails): Promise<void> {
    const now = Date.now()

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue

      // Check cooldown
      const lastAlert = this.alertCooldowns.get(rule.id)
      if (lastAlert && (now - lastAlert) < (rule.cooldownMinutes || 0) * 60 * 1000) {
        continue
      }

      if (await this.doesErrorMatchRule(error, rule)) {
        await this.triggerAlert(rule, [error])
        this.alertCooldowns.set(rule.id, now)
      }
    }
  }

  /**
   * Check if an error matches an alert rule
   */
  private async doesErrorMatchRule(error: ErrorDetails, rule: AlertRule): Promise<boolean> {
    const conditions = rule.conditions

    // Check error level
    if (conditions.errorLevel && !conditions.errorLevel.includes(error.level)) {
      return false
    }

    // Check categories
    if (conditions.categories && !conditions.categories.includes(error.category)) {
      return false
    }

    // Check services
    if (conditions.services && !conditions.services.includes(error.service)) {
      return false
    }

    // Check operations
    if (conditions.operations && error.operation && !conditions.operations.includes(error.operation)) {
      return false
    }

    // Check frequency conditions
    if (conditions.frequency) {
      const timeWindow = conditions.frequency.timeWindowMinutes * 60 * 1000
      const windowStart = Date.now() - timeWindow

      const recentErrors = this.errors.filter(err =>
        new Date(err.timestamp).getTime() >= windowStart &&
        err.category === error.category &&
        err.service === error.service
      )

      if (recentErrors.length < conditions.frequency.count) {
        return false
      }
    }

    // Check threshold conditions
    if (conditions.threshold) {
      if (conditions.threshold.responseTime &&
          (!error.metadata.responseTime || error.metadata.responseTime < conditions.threshold.responseTime)) {
        return false
      }

      if (conditions.threshold.errorRate) {
        // Calculate error rate - would need more context for accurate calculation
        // This is a simplified implementation
        const recentErrors = this.getRecentErrors(5) // Last 5 minutes
        const totalOperations = recentErrors.length + 10 // Approximate
        const errorRate = (recentErrors.length / totalOperations) * 100

        if (errorRate < conditions.threshold.errorRate) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Trigger an alert based on matching rule
   */
  private async triggerAlert(rule: AlertRule, errors: ErrorDetails[]): Promise<void> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    const timestamp = new Date().toISOString()

    const alert: AlertInstance = {
      id: alertId,
      ruleId: rule.id,
      timestamp,
      title: rule.name,
      message: this.generateAlertMessage(rule, errors),
      severity: this.determineSeverity(errors),
      errors,
      resolved: false
    }

    // Store alert
    this.alerts.push(alert)
    if (this.alerts.length > this.maxAlertHistory) {
      this.alerts.shift()
    }

    // Execute alert actions
    await this.executeAlertActions(rule, alert)

    logger.warn('Alert triggered', {
      alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: alert.severity,
      errorCount: errors.length
    })
  }

  /**
   * Generate alert message from rule and errors
   */
  private generateAlertMessage(rule: AlertRule, errors: ErrorDetails[]): string {
    const errorCount = errors.length
    const categories = [...new Set(errors.map(e => e.category))]
    const services = [...new Set(errors.map(e => e.service))]

    let message = `${rule.name}: ${errorCount} error(s) detected`

    if (categories.length === 1) {
      message += ` in ${categories[0]} category`
    } else if (categories.length > 1) {
      message += ` across ${categories.length} categories (${categories.join(', ')})`
    }

    if (services.length === 1) {
      message += ` from ${services[0]} service`
    } else if (services.length > 1) {
      message += ` from ${services.length} services`
    }

    const criticalErrors = errors.filter(e => e.level === 'critical')
    if (criticalErrors.length > 0) {
      message += `. ${criticalErrors.length} critical error(s) require immediate attention.`
    }

    return message
  }

  /**
   * Determine alert severity from errors
   */
  private determineSeverity(errors: ErrorDetails[]): AlertInstance['severity'] {
    const levels = errors.map(e => e.level)

    if (levels.includes('critical')) return 'critical'
    if (levels.filter(l => l === 'error').length >= 5) return 'high'
    if (levels.includes('error')) return 'medium'
    return 'low'
  }

  /**
   * Execute alert actions
   */
  private async executeAlertActions(rule: AlertRule, alert: AlertInstance): Promise<void> {
    const actions = rule.actions

    // Log action
    if (actions.log) {
      parlantLoggers.monitoring.error(`Alert: ${alert.title}`, {
        operation: 'alert_triggered',
        alertId: alert.id,
        ruleId: rule.id,
        severity: alert.severity,
        errorCount: alert.errors.length
      })
    }

    // Webhook action
    if (actions.webhook) {
      try {
        await this.executeWebhook(actions.webhook, alert)
      } catch (error) {
        logger.error('Webhook execution failed', { error, alertId: alert.id })
      }
    }

    // Email action would be implemented here
    if (actions.email) {
      logger.info('Email alert action configured', {
        alertId: alert.id,
        recipients: actions.email.recipients.length
      })
      // Email implementation would go here
    }
  }

  /**
   * Execute webhook alert action
   */
  private async executeWebhook(webhook: NonNullable<AlertRule['actions']['webhook']>, alert: AlertInstance): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp
      },
      errors: alert.errors.map(error => ({
        id: error.id,
        level: error.level,
        category: error.category,
        service: error.service,
        message: error.message,
        timestamp: error.timestamp
      }))
    }

    // This would typically use fetch or axios
    logger.info('Webhook would be executed', {
      url: webhook.url,
      method: webhook.method,
      alertId: alert.id,
      payloadSize: JSON.stringify(payload).length
    })
  }

  /**
   * Get recent errors within specified minutes
   */
  getRecentErrors(minutes: number = 60): ErrorDetails[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.errors.filter(error => new Date(error.timestamp) >= cutoff)
  }

  /**
   * Get error statistics for a time window
   */
  getErrorStats(windowMinutes: number = 60): {
    total: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
    byService: Record<string, number>
    topErrors: Array<{ message: string; count: number }>
  } {
    const recentErrors = this.getRecentErrors(windowMinutes)

    const byLevel: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const byService: Record<string, number> = {}
    const messageCounts: Record<string, number> = {}

    recentErrors.forEach(error => {
      byLevel[error.level] = (byLevel[error.level] || 0) + 1
      byCategory[error.category] = (byCategory[error.category] || 0) + 1
      byService[error.service] = (byService[error.service] || 0) + 1
      messageCounts[error.message] = (messageCounts[error.message] || 0) + 1
    })

    const topErrors = Object.entries(messageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }))

    return {
      total: recentErrors.length,
      byLevel,
      byCategory,
      byService,
      topErrors
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertInstance[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.acknowledgedAt = new Date().toISOString()
      alert.acknowledgedBy = acknowledgedBy

      logger.info('Alert acknowledged', { alertId, acknowledgedBy })
      return true
    }
    return false
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()

      logger.info('Alert resolved', { alertId })
      return true
    }
    return false
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules]
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId)
    if (ruleIndex >= 0) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates }
      logger.info('Alert rule updated', { ruleId, updates: Object.keys(updates) })
      return true
    }
    return false
  }
}

/**
 * Singleton error tracker instance
 */
export const parlantErrorTracker = new ParlantErrorTracker()

/**
 * Convenience functions for error tracking
 */
export const errorTracker = {
  trackWarning: (category: ErrorDetails['category'], service: string, message: string, error?: Error, context?: ParlantLogContext) =>
    parlantErrorTracker.trackError('warning', category, service, message, error, context),

  trackError: (category: ErrorDetails['category'], service: string, message: string, error?: Error, context?: ParlantLogContext) =>
    parlantErrorTracker.trackError('error', category, service, message, error, context),

  trackCritical: (category: ErrorDetails['category'], service: string, message: string, error?: Error, context?: ParlantLogContext) =>
    parlantErrorTracker.trackError('critical', category, service, message, error, context),

  getStats: (windowMinutes?: number) => parlantErrorTracker.getErrorStats(windowMinutes),
  getActiveAlerts: () => parlantErrorTracker.getActiveAlerts(),
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => parlantErrorTracker.acknowledgeAlert(alertId, acknowledgedBy),
  resolveAlert: (alertId: string) => parlantErrorTracker.resolveAlert(alertId)
}