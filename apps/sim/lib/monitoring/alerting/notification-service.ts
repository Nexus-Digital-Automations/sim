/**
 * Notification Service
 * Handles sending alert notifications through various channels
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { AlertAction, AlertInstance, AlertRule } from '../types'

const logger = createLogger('NotificationService')

export class NotificationService {
  private static instance: NotificationService
  private rateLimits = new Map<string, { count: number; resetTime: number }>()

  private readonly DEFAULT_RATE_LIMIT = 10 // 10 notifications per hour per channel
  private readonly RATE_LIMIT_WINDOW_MS = 3600000 // 1 hour

  private constructor() {
    logger.info('NotificationService initialized')
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Send notification for an alert
   */
  async sendNotification(
    action: AlertAction,
    alert: AlertInstance,
    rule: AlertRule
  ): Promise<void> {
    const operationId = `notify-${alert.id}-${action.type}-${Date.now()}`
    logger.debug(`[${operationId}] Sending ${action.type} notification for alert ${alert.id}`)

    try {
      // Check rate limits
      if (!this.checkRateLimit(action, rule.workspaceId)) {
        throw new Error(`Rate limit exceeded for ${action.type} notifications`)
      }

      // Send notification based on type
      switch (action.type) {
        case 'email':
          await this.sendEmailNotification(action, alert, rule)
          break

        case 'slack':
          await this.sendSlackNotification(action, alert, rule)
          break

        case 'webhook':
          await this.sendWebhookNotification(action, alert, rule)
          break

        case 'sms':
          await this.sendSMSNotification(action, alert, rule)
          break

        case 'dashboard_notification':
          await this.sendDashboardNotification(action, alert, rule)
          break

        default:
          throw new Error(`Unsupported notification type: ${action.type}`)
      }

      // Update rate limit counter
      this.updateRateLimit(action, rule.workspaceId)

      logger.info(`[${operationId}] ${action.type} notification sent successfully`)
    } catch (error) {
      logger.error(`[${operationId}] Error sending ${action.type} notification:`, error)
      throw error
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    action: AlertAction,
    alert: AlertInstance,
    rule: AlertRule
  ): Promise<void> {
    const emailConfig = action.configuration.email
    if (!emailConfig?.to || emailConfig.to.length === 0) {
      throw new Error('Email configuration missing recipient addresses')
    }

    // Generate email content
    const subject = emailConfig.subject || `Alert: ${alert.message}`
    const body = this.generateEmailBody(alert, rule)

    logger.debug(`Sending email notification to ${emailConfig.to.length} recipients`)

    try {
      // This would integrate with the existing email service
      // For now, we'll log the email content
      logger.info('Email notification (mock):', {
        to: emailConfig.to,
        subject,
        body: `${body.substring(0, 200)}...`,
        alertId: alert.id,
        severity: alert.severity,
      })

      // In a real implementation, this would call the actual email service:
      // await emailService.sendAlert({
      //   to: emailConfig.to,
      //   subject,
      //   html: body,
      //   priority: alert.severity === 'critical' ? 'high' : 'normal'
      // })
    } catch (error) {
      logger.error('Error sending email notification:', error)
      throw new Error(
        `Email notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    action: AlertAction,
    alert: AlertInstance,
    rule: AlertRule
  ): Promise<void> {
    const slackConfig = action.configuration.slack
    if (!slackConfig?.webhookUrl) {
      throw new Error('Slack configuration missing webhook URL')
    }

    const slackMessage = this.generateSlackMessage(alert, rule, slackConfig)

    try {
      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
      }

      logger.debug('Slack notification sent successfully')
    } catch (error) {
      logger.error('Error sending Slack notification:', error)
      throw new Error(
        `Slack notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    action: AlertAction,
    alert: AlertInstance,
    rule: AlertRule
  ): Promise<void> {
    const webhookConfig = action.configuration.webhook
    if (!webhookConfig?.url) {
      throw new Error('Webhook configuration missing URL')
    }

    const payload = {
      alert,
      rule: {
        id: rule.id,
        name: rule.name,
        workspaceId: rule.workspaceId,
      },
      timestamp: new Date().toISOString(),
      event: 'alert_triggered',
    }

    const requestOptions: RequestInit = {
      method: webhookConfig.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SimWorkflows-AlertSystem/1.0',
        ...webhookConfig.headers,
      },
      body: webhookConfig.body || JSON.stringify(payload),
    }

    // Add timeout
    if (webhookConfig.timeout) {
      // Note: fetch doesn't support timeout directly in Node.js
      // This would need AbortController implementation
    }

    try {
      const response = await fetch(webhookConfig.url, requestOptions)

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status} ${response.statusText}`)
      }

      logger.debug(`Webhook notification sent to ${webhookConfig.url}`)
    } catch (error) {
      logger.error('Error sending webhook notification:', error)

      // Implement retries if configured
      if (webhookConfig.retries && webhookConfig.retries > 0) {
        logger.debug(`Retrying webhook notification (${webhookConfig.retries} retries remaining)`)
        // Implement exponential backoff retry logic here
      }

      throw new Error(
        `Webhook notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    action: AlertAction,
    alert: AlertInstance,
    rule: AlertRule
  ): Promise<void> {
    const smsConfig = action.configuration.sms
    if (!smsConfig?.phoneNumbers || smsConfig.phoneNumbers.length === 0) {
      throw new Error('SMS configuration missing phone numbers')
    }

    const message = this.generateSMSMessage(alert, rule, smsConfig)

    try {
      // This would integrate with SMS service (like Twilio)
      // For now, we'll log the SMS content
      logger.info('SMS notification (mock):', {
        phoneNumbers: smsConfig.phoneNumbers,
        message,
        alertId: alert.id,
        severity: alert.severity,
      })

      // In a real implementation:
      // for (const phoneNumber of smsConfig.phoneNumbers) {
      //   await smsService.send({
      //     to: phoneNumber,
      //     body: message,
      //     priority: alert.severity === 'critical' ? 'high' : 'normal'
      //   })
      // }
    } catch (error) {
      logger.error('Error sending SMS notification:', error)
      throw new Error(
        `SMS notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send dashboard notification
   */
  private async sendDashboardNotification(
    action: AlertAction,
    alert: AlertInstance,
    rule: AlertRule
  ): Promise<void> {
    const dashboardConfig = action.configuration.dashboard

    // This would typically store the notification in a database or send via WebSocket
    const notification = {
      id: `dashboard-notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      alertId: alert.id,
      ruleId: rule.id,
      workspaceId: rule.workspaceId,
      title: `Alert: ${rule.name}`,
      message: alert.message,
      severity: alert.severity,
      priority: dashboardConfig?.priority || 'medium',
      category: dashboardConfig?.category || 'alert',
      autoResolve: dashboardConfig?.autoResolve || false,
      createdAt: new Date().toISOString(),
      status: 'unread',
    }

    try {
      // This would typically:
      // 1. Store in database for persistence
      // 2. Send via WebSocket for real-time updates
      // await dashboardNotificationService.create(notification)
      // await websocketService.sendToWorkspace(rule.workspaceId, 'dashboard_notification', notification)

      logger.info('Dashboard notification created:', {
        id: notification.id,
        alertId: alert.id,
        workspaceId: rule.workspaceId,
        severity: alert.severity,
      })
    } catch (error) {
      logger.error('Error creating dashboard notification:', error)
      throw new Error(
        `Dashboard notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate email body for alert
   */
  private generateEmailBody(alert: AlertInstance, rule: AlertRule): string {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨',
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; }
        .header { border-bottom: 3px solid #e74c3c; padding-bottom: 20px; margin-bottom: 20px; }
        .alert-title { color: #e74c3c; font-size: 24px; font-weight: bold; margin: 0; }
        .alert-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #333; }
        .value { color: #666; }
        .severity-${alert.severity} { color: ${this.getSeverityColor(alert.severity)}; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="alert-title">${severityEmoji[alert.severity]} Alert Triggered</h1>
        </div>
        
        <div class="alert-details">
            <div class="detail-row">
                <span class="label">Alert:</span>
                <span class="value">${alert.message}</span>
            </div>
            <div class="detail-row">
                <span class="label">Rule:</span>
                <span class="value">${rule.name}</span>
            </div>
            <div class="detail-row">
                <span class="label">Severity:</span>
                <span class="severity-${alert.severity}">${alert.severity.toUpperCase()}</span>
            </div>
            <div class="detail-row">
                <span class="label">Workflow:</span>
                <span class="value">${alert.workflowId}</span>
            </div>
            <div class="detail-row">
                <span class="label">Triggered At:</span>
                <span class="value">${new Date(alert.triggeredAt).toLocaleString()}</span>
            </div>
        </div>

        ${alert.details?.conditionResults ? this.generateConditionResultsHTML(alert.details.conditionResults) : ''}

        <div class="footer">
            <p>This alert was generated by Sim Workflows monitoring system.</p>
            <p>Alert ID: ${alert.id}</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate Slack message for alert
   */
  private generateSlackMessage(alert: AlertInstance, rule: AlertRule, config: any): any {
    const severityColors = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#e74c3c',
      critical: '#d50200',
    }

    const severityEmoji = {
      low: ':warning:',
      medium: ':warning:',
      high: ':rotating_light:',
      critical: ':fire:',
    }

    return {
      username: config.username || 'Sim Workflows Alerts',
      icon_emoji: config.iconEmoji || ':robot_face:',
      channel: config.channel,
      attachments: [
        {
          color: severityColors[alert.severity],
          title: `${severityEmoji[alert.severity]} Alert: ${rule.name}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Workflow',
              value: alert.workflowId,
              short: true,
            },
            {
              title: 'Triggered At',
              value: new Date(alert.triggeredAt).toLocaleString(),
              short: true,
            },
            {
              title: 'Alert ID',
              value: alert.id,
              short: true,
            },
          ],
          footer: 'Sim Workflows Monitoring',
          ts: Math.floor(new Date(alert.triggeredAt).getTime() / 1000),
        },
      ],
    }
  }

  /**
   * Generate SMS message for alert
   */
  private generateSMSMessage(alert: AlertInstance, rule: AlertRule, config: any): string {
    const message =
      config.message ||
      `${rule.name}: ${alert.message} [${alert.severity.toUpperCase()}] at ${new Date(alert.triggeredAt).toLocaleString()}`

    // SMS has character limits, so truncate if necessary
    return message.length > 160 ? `${message.substring(0, 157)}...` : message
  }

  /**
   * Generate condition results HTML for email
   */
  private generateConditionResultsHTML(conditionResults: any[]): string {
    if (!conditionResults || conditionResults.length === 0) return ''

    const rows = conditionResults
      .map(
        (result) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${result.conditionType}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${result.actualValue}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${result.threshold}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${result.satisfied ? '#e74c3c' : '#27ae60'};">
          ${result.satisfied ? '✓ Triggered' : '✗ Not Met'}
        </td>
      </tr>
    `
      )
      .join('')

    return `
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 15px;">Condition Details</h3>
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Condition</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Actual Value</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Threshold</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: AlertInstance['severity']): string {
    const colors = {
      low: '#f39c12',
      medium: '#e67e22',
      high: '#e74c3c',
      critical: '#c0392b',
    }
    return colors[severity]
  }

  /**
   * Check rate limits for notification
   */
  private checkRateLimit(action: AlertAction, workspaceId: string): boolean {
    const key = `${workspaceId}:${action.type}`
    const now = Date.now()
    const limit = this.rateLimits.get(key)

    if (!limit) {
      this.rateLimits.set(key, { count: 0, resetTime: now + this.RATE_LIMIT_WINDOW_MS })
      return true
    }

    // Reset if window has passed
    if (now > limit.resetTime) {
      limit.count = 0
      limit.resetTime = now + this.RATE_LIMIT_WINDOW_MS
    }

    return limit.count < this.DEFAULT_RATE_LIMIT
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(action: AlertAction, workspaceId: string): void {
    const key = `${workspaceId}:${action.type}`
    const limit = this.rateLimits.get(key)

    if (limit) {
      limit.count++
    }
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    rateLimits: number
    recentNotifications: { type: string; count: number }[]
  } {
    return {
      rateLimits: this.rateLimits.size,
      recentNotifications: [], // Would track recent notifications in production
    }
  }

  /**
   * Test notification configuration
   */
  async testNotification(action: AlertAction, workspaceId: string): Promise<boolean> {
    try {
      const testAlert: AlertInstance = {
        id: 'test-alert',
        ruleId: 'test-rule',
        ruleName: 'Test Alert Rule',
        severity: 'medium',
        status: 'active',
        triggeredAt: new Date().toISOString(),
        message: 'This is a test alert to verify your notification configuration.',
        details: {},
        escalationLevel: 0,
        notificationsSent: [],
      }

      const testRule: AlertRule = {
        id: 'test-rule',
        name: 'Test Alert Rule',
        workspaceId,
        enabled: true,
        conditions: [],
        actions: [action],
        cooldownPeriod: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
      }

      await this.sendNotification(action, testAlert, testRule)
      return true
    } catch (error) {
      logger.error('Notification test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
