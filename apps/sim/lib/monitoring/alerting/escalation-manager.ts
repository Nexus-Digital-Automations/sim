/**
 * Escalation Manager
 * Handles alert escalation policies and automatic escalation logic
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  AlertEvent,
  AlertInstance,
  AlertRule,
  EscalationLevel,
  EscalationPolicy,
} from '../types'
import { notificationService } from './notification-service'

const logger = createLogger('EscalationManager')

interface EscalationTimer {
  alertId: string
  ruleId: string
  level: number
  scheduledTime: number
  timeoutId: NodeJS.Timeout
}

interface EscalationTracking {
  alertId: string
  ruleId: string
  currentLevel: number
  levelStartTime: number
  escalationHistory: EscalationEvent[]
}

interface EscalationEvent {
  level: number
  escalatedAt: string
  reason: string
  notificationsSent: number
  success: boolean
}

export class EscalationManager extends EventEmitter {
  private static instance: EscalationManager
  private escalationTimers = new Map<string, EscalationTimer>()
  private escalationTracking = new Map<string, EscalationTracking>()
  private cleanupInterval: NodeJS.Timeout

  private readonly CLEANUP_INTERVAL_MS = 300000 // 5 minutes

  private constructor() {
    super()

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedEscalations()
    }, this.CLEANUP_INTERVAL_MS)

    logger.info('EscalationManager initialized')
  }

  static getInstance(): EscalationManager {
    if (!EscalationManager.instance) {
      EscalationManager.instance = new EscalationManager()
    }
    return EscalationManager.instance
  }

  /**
   * Start escalation process for an alert
   */
  async startEscalation(alert: AlertInstance, rule: AlertRule): Promise<void> {
    const operationId = `escalate-start-${alert.id}`
    logger.debug(`[${operationId}] Starting escalation for alert ${alert.id}`)

    try {
      // Check if rule has escalation policy
      if (
        !rule.escalationPolicy ||
        !rule.escalationPolicy.levels ||
        rule.escalationPolicy.levels.length === 0
      ) {
        logger.debug(`[${operationId}] No escalation policy defined, skipping escalation`)
        return
      }

      // Initialize escalation tracking
      const tracking: EscalationTracking = {
        alertId: alert.id,
        ruleId: rule.id,
        currentLevel: 0,
        levelStartTime: Date.now(),
        escalationHistory: [],
      }
      this.escalationTracking.set(alert.id, tracking)

      // Schedule first escalation level
      await this.scheduleEscalation(alert, rule, rule.escalationPolicy.levels[0], 0)

      logger.info(
        `[${operationId}] Escalation started for alert ${alert.id} with ${rule.escalationPolicy.levels.length} levels`
      )
    } catch (error) {
      logger.error(`[${operationId}] Error starting escalation:`, error)
      throw error
    }
  }

  /**
   * Stop escalation for an alert
   */
  async stopEscalation(alertId: string, reason: string): Promise<void> {
    const operationId = `escalate-stop-${alertId}`
    logger.debug(`[${operationId}] Stopping escalation for alert ${alertId}: ${reason}`)

    try {
      // Cancel any scheduled escalation timers
      const timer = this.escalationTimers.get(alertId)
      if (timer) {
        clearTimeout(timer.timeoutId)
        this.escalationTimers.delete(alertId)
        logger.debug(`[${operationId}] Cancelled escalation timer`)
      }

      // Update tracking
      const tracking = this.escalationTracking.get(alertId)
      if (tracking) {
        tracking.escalationHistory.push({
          level: tracking.currentLevel,
          escalatedAt: new Date().toISOString(),
          reason: `Escalation stopped: ${reason}`,
          notificationsSent: 0,
          success: true,
        })

        // Keep tracking for a short time for audit purposes
        setTimeout(() => {
          this.escalationTracking.delete(alertId)
        }, 60000) // 1 minute
      }

      // Emit event
      this.emit('escalation_stopped', {
        type: 'escalation_stopped',
        alertId,
        reason,
        timestamp: new Date().toISOString(),
      })

      logger.info(`[${operationId}] Escalation stopped for alert ${alertId}`)
    } catch (error) {
      logger.error(`[${operationId}] Error stopping escalation:`, error)
      throw error
    }
  }

  /**
   * Handle alert acknowledgment for escalation logic
   */
  async handleAlertAcknowledged(alert: AlertInstance): Promise<void> {
    const operationId = `escalate-ack-${alert.id}`
    logger.debug(`[${operationId}] Handling alert acknowledgment`)

    try {
      const tracking = this.escalationTracking.get(alert.id)
      if (!tracking) {
        logger.debug(`[${operationId}] No escalation tracking found`)
        return
      }

      // Check if current escalation level should stop on acknowledgment
      const timer = this.escalationTimers.get(alert.id)
      if (timer) {
        // For now, we'll stop escalation on any acknowledgment
        // This could be made configurable per escalation level
        await this.stopEscalation(alert.id, 'Alert acknowledged')
      }
    } catch (error) {
      logger.error(`[${operationId}] Error handling alert acknowledgment:`, error)
    }
  }

  /**
   * Handle alert resolution for escalation logic
   */
  async handleAlertResolved(alert: AlertInstance): Promise<void> {
    const operationId = `escalate-resolve-${alert.id}`
    logger.debug(`[${operationId}] Handling alert resolution`)

    try {
      // Always stop escalation when alert is resolved
      await this.stopEscalation(alert.id, 'Alert resolved')
    } catch (error) {
      logger.error(`[${operationId}] Error handling alert resolution:`, error)
    }
  }

  /**
   * Schedule escalation for a specific level
   */
  private async scheduleEscalation(
    alert: AlertInstance,
    rule: AlertRule,
    level: EscalationLevel,
    levelIndex: number
  ): Promise<void> {
    const operationId = `schedule-${alert.id}-level-${levelIndex}`
    logger.debug(`[${operationId}] Scheduling escalation level ${levelIndex + 1}`)

    try {
      // Cancel existing timer if any
      const existingTimer = this.escalationTimers.get(alert.id)
      if (existingTimer) {
        clearTimeout(existingTimer.timeoutId)
      }

      // Calculate delay
      const delayMs = level.delayMinutes * 60 * 1000
      const scheduledTime = Date.now() + delayMs

      // Create timer
      const timeoutId = setTimeout(async () => {
        try {
          await this.executeEscalationLevel(alert, rule, level, levelIndex)
        } catch (error) {
          logger.error(`Error executing escalation level ${levelIndex + 1}:`, error)
        }
      }, delayMs)

      // Store timer
      const timer: EscalationTimer = {
        alertId: alert.id,
        ruleId: rule.id,
        level: levelIndex,
        scheduledTime,
        timeoutId,
      }
      this.escalationTimers.set(alert.id, timer)

      logger.debug(
        `[${operationId}] Escalation level ${levelIndex + 1} scheduled for ${new Date(scheduledTime).toISOString()}`
      )
    } catch (error) {
      logger.error(`[${operationId}] Error scheduling escalation:`, error)
      throw error
    }
  }

  /**
   * Execute escalation level
   */
  private async executeEscalationLevel(
    alert: AlertInstance,
    rule: AlertRule,
    level: EscalationLevel,
    levelIndex: number
  ): Promise<void> {
    const operationId = `execute-${alert.id}-level-${levelIndex}`
    logger.debug(`[${operationId}] Executing escalation level ${levelIndex + 1}`)

    try {
      const tracking = this.escalationTracking.get(alert.id)
      if (!tracking) {
        logger.warn(`[${operationId}] No escalation tracking found, skipping`)
        return
      }

      // Check if escalation should proceed based on condition
      if (!this.shouldEscalate(alert, level, tracking)) {
        logger.debug(`[${operationId}] Escalation condition not met, skipping level`)
        return
      }

      // Update tracking
      tracking.currentLevel = levelIndex
      tracking.levelStartTime = Date.now()

      // Update alert escalation level
      alert.escalationLevel = levelIndex

      let notificationsSent = 0
      let escalationSuccess = true

      // Send notifications for this escalation level
      for (const action of level.actions) {
        if (action.enabled) {
          try {
            await notificationService.sendNotification(action, alert, rule)
            notificationsSent++

            // Record successful notification
            alert.notificationsSent.push({
              id: `escalation-notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              actionId: action.id,
              actionType: action.type,
              sentAt: new Date().toISOString(),
              status: 'sent',
              details: { escalationLevel: levelIndex + 1 },
            })
          } catch (error) {
            logger.error(`[${operationId}] Error sending escalation notification:`, error)
            escalationSuccess = false

            // Record failed notification
            alert.notificationsSent.push({
              id: `escalation-notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              actionId: action.id,
              actionType: action.type,
              sentAt: new Date().toISOString(),
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              details: { escalationLevel: levelIndex + 1 },
            })
          }
        }
      }

      // Record escalation event
      const escalationEvent: EscalationEvent = {
        level: levelIndex + 1,
        escalatedAt: new Date().toISOString(),
        reason: `Automatic escalation - Level ${levelIndex + 1}`,
        notificationsSent,
        success: escalationSuccess,
      }
      tracking.escalationHistory.push(escalationEvent)

      // Emit escalation event
      const alertEvent: AlertEvent = {
        type: 'alert_escalated',
        source: 'alert',
        timestamp: escalationEvent.escalatedAt,
        alertId: alert.id,
        ruleId: rule.id,
        data: {
          ...alert,
          escalationLevel: escalationEvent.level,
        },
      }
      this.emit('alert_escalated', alertEvent)

      logger.info(`[${operationId}] Escalation level ${levelIndex + 1} executed`, {
        notificationsSent,
        success: escalationSuccess,
      })

      // Schedule next escalation level if available
      if (rule.escalationPolicy && levelIndex + 1 < rule.escalationPolicy.levels.length) {
        const nextLevel = rule.escalationPolicy.levels[levelIndex + 1]
        await this.scheduleEscalation(alert, rule, nextLevel, levelIndex + 1)
        logger.debug(`[${operationId}] Scheduled next escalation level ${levelIndex + 2}`)
      } else {
        logger.debug(`[${operationId}] No more escalation levels, escalation complete`)

        // Emit escalation completed event
        this.emit('escalation_completed', {
          type: 'escalation_completed',
          alertId: alert.id,
          ruleId: rule.id,
          finalLevel: levelIndex + 1,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      logger.error(`[${operationId}] Error executing escalation level:`, error)

      // Record failed escalation
      const tracking = this.escalationTracking.get(alert.id)
      if (tracking) {
        tracking.escalationHistory.push({
          level: levelIndex + 1,
          escalatedAt: new Date().toISOString(),
          reason: `Escalation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          notificationsSent: 0,
          success: false,
        })
      }
    } finally {
      // Clean up timer
      this.escalationTimers.delete(alert.id)
    }
  }

  /**
   * Check if escalation should proceed based on condition
   */
  private shouldEscalate(
    alert: AlertInstance,
    level: EscalationLevel,
    tracking: EscalationTracking
  ): boolean {
    switch (level.condition) {
      case 'always':
        return true

      case 'alert_not_acknowledged':
        return alert.status === 'active' // Not acknowledged

      case 'alert_not_resolved':
        return alert.status !== 'resolved'

      default:
        logger.warn(`Unknown escalation condition: ${level.condition}`)
        return false
    }
  }

  /**
   * Get escalation status for an alert
   */
  getEscalationStatus(alertId: string): EscalationTracking | null {
    return this.escalationTracking.get(alertId) || null
  }

  /**
   * Get all active escalations
   */
  getActiveEscalations(): EscalationTracking[] {
    return Array.from(this.escalationTracking.values())
  }

  /**
   * Cleanup completed escalations
   */
  private cleanupCompletedEscalations(): void {
    const now = Date.now()
    let cleanedCount = 0

    // Clean up old escalation tracking
    for (const [alertId, tracking] of this.escalationTracking.entries()) {
      const timeSinceLastActivity = now - tracking.levelStartTime

      // Remove tracking after 1 hour of inactivity
      if (timeSinceLastActivity > 3600000) {
        this.escalationTracking.delete(alertId)
        cleanedCount++
      }
    }

    // Clean up orphaned timers
    for (const [alertId, timer] of this.escalationTimers.entries()) {
      if (!this.escalationTracking.has(alertId)) {
        clearTimeout(timer.timeoutId)
        this.escalationTimers.delete(alertId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} completed escalations`)
    }
  }

  /**
   * Get escalation manager statistics
   */
  getEscalationStats(): {
    activeEscalations: number
    scheduledTimers: number
    totalEscalationHistory: number
  } {
    let totalHistory = 0
    for (const tracking of this.escalationTracking.values()) {
      totalHistory += tracking.escalationHistory.length
    }

    return {
      activeEscalations: this.escalationTracking.size,
      scheduledTimers: this.escalationTimers.size,
      totalEscalationHistory: totalHistory,
    }
  }

  /**
   * Create escalation policy
   */
  createEscalationPolicy(
    name: string,
    levels: Omit<EscalationLevel, 'levelNumber'>[]
  ): EscalationPolicy {
    const policy: EscalationPolicy = {
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      levels: levels.map((level, index) => ({
        ...level,
        levelNumber: index + 1,
      })),
    }

    logger.debug(`Created escalation policy: ${policy.id} with ${policy.levels.length} levels`)
    return policy
  }

  /**
   * Validate escalation policy
   */
  validateEscalationPolicy(policy: EscalationPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!policy.name || policy.name.trim().length === 0) {
      errors.push('Policy name is required')
    }

    if (!policy.levels || policy.levels.length === 0) {
      errors.push('At least one escalation level is required')
    }

    for (let i = 0; i < (policy.levels?.length || 0); i++) {
      const level = policy.levels[i]

      if (level.delayMinutes < 0) {
        errors.push(`Level ${i + 1}: Delay cannot be negative`)
      }

      if (!level.actions || level.actions.length === 0) {
        errors.push(`Level ${i + 1}: At least one action is required`)
      }

      if (!['always', 'alert_not_acknowledged', 'alert_not_resolved'].includes(level.condition)) {
        errors.push(`Level ${i + 1}: Invalid escalation condition`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Destroy the escalation manager and cleanup resources
   */
  destroy(): void {
    // Cancel all active timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer.timeoutId)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.escalationTimers.clear()
    this.escalationTracking.clear()
    this.removeAllListeners()

    logger.info('EscalationManager destroyed and resources cleaned up')
  }
}

// Export singleton instance
export const escalationManager = EscalationManager.getInstance()
