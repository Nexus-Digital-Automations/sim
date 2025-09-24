/**
 * Session Continuity Manager
 *
 * Advanced session management system for Parlant conversations with intelligent
 * session restoration, context preservation, and seamless conversation continuity
 * across browser sessions, device switches, and network interruptions.
 */

import { db } from '@sim/db'
import { parlantEvent, parlantSession, parlantVariable } from '@sim/db/schema'
import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import type { IsolationContext } from './workspace-isolation-service'

const logger = createLogger('SessionContinuityManager')

/**
 * Session restoration options
 */
export interface SessionRestoreOptions {
  preserveContext: boolean
  restoreVariables: boolean
  resumeJourney: boolean
  maxInactivityHours?: number
  allowCrossDevice?: boolean
}

/**
 * Session state snapshot
 */
export interface SessionStateSnapshot {
  sessionId: string
  agentId: string
  workspaceId: string
  userId?: string
  currentJourneyId?: string
  currentStateId?: string
  variables: Record<string, any>
  contextHistory: Array<{
    offset: number
    type: string
    content: any
    timestamp: string
  }>
  lastActivity: string
  sessionMetadata: Record<string, any>
}

/**
 * Session continuity strategy
 */
export type ContinuityStrategy =
  | 'resume_existing' // Resume the same session
  | 'create_linked' // Create new session linked to previous
  | 'start_fresh' // Start completely new session
  | 'restore_context' // New session with restored context

/**
 * Session heartbeat configuration
 */
export interface SessionHeartbeat {
  sessionId: string
  lastHeartbeat: Date
  isActive: boolean
  connectionId?: string
  deviceInfo?: {
    userAgent: string
    deviceType: string
    browserName: string
  }
}

/**
 * Multi-device session sync
 */
export interface MultiDeviceSync {
  userId: string
  primarySessionId: string
  syncedSessions: Array<{
    sessionId: string
    deviceId: string
    lastSync: Date
    status: 'active' | 'inactive' | 'expired'
  }>
}

/**
 * Session recovery context
 */
export interface SessionRecoveryContext {
  originalSessionId: string
  recoveryReason: 'timeout' | 'disconnect' | 'device_switch' | 'browser_restart'
  contextPreservation: {
    messagesPreserved: number
    variablesPreserved: number
    journeyStatePreserved: boolean
  }
  recoveryTimestamp: string
}

/**
 * Advanced Session Continuity Manager
 */
export class SessionContinuityManager {
  private readonly DEFAULT_INACTIVITY_HOURS = 24
  private readonly HEARTBEAT_INTERVAL_MS = 30000 // 30 seconds
  private readonly SESSION_CLEANUP_HOURS = 168 // 7 days
  private readonly MAX_CONTEXT_MESSAGES = 50

  private heartbeatTrackers = new Map<string, NodeJS.Timeout>()
  private activeSessions = new Map<string, SessionHeartbeat>()

  constructor() {
    logger.info('Session Continuity Manager initialized', {
      defaultInactivityHours: this.DEFAULT_INACTIVITY_HOURS,
      heartbeatInterval: this.HEARTBEAT_INTERVAL_MS,
      cleanupHours: this.SESSION_CLEANUP_HOURS,
      maxContextMessages: this.MAX_CONTEXT_MESSAGES,
    })

    // Start periodic cleanup
    this.startPeriodicCleanup()
  }

  /**
   * Create new session with continuity metadata
   */
  async createSessionWithContinuity(
    agentId: string,
    context: IsolationContext,
    options: {
      title?: string
      linkedSessionId?: string
      restoreContext?: boolean
      deviceInfo?: any
    } = {}
  ): Promise<{
    sessionId: string
    continuityEnabled: boolean
    recoveryContext?: SessionRecoveryContext
  }> {
    const startTime = performance.now()
    const requestId = `create-session-${Date.now()}`

    try {
      logger.info('Creating session with continuity', {
        requestId,
        agentId,
        workspaceId: context.workspaceId,
        userId: context.userId,
        linkedSessionId: options.linkedSessionId,
        restoreContext: options.restoreContext,
      })

      // Create the session with enhanced metadata
      const [newSession] = await db
        .insert(parlantSession)
        .values({
          agentId,
          workspaceId: context.workspaceId,
          userId: context.userId,
          title: options.title,
          status: 'active',
          mode: 'auto',
          metadata: {
            continuityEnabled: true,
            deviceInfo: options.deviceInfo,
            linkedSessionId: options.linkedSessionId,
            createdBy: context.userId,
            creationContext: {
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              sessionId: context.sessionId,
            },
          },
          variables: {},
          startedAt: new Date(),
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      if (!newSession) {
        throw new Error('Failed to create session')
      }

      // Restore context from linked session if requested
      let recoveryContext: SessionRecoveryContext | undefined

      if (options.linkedSessionId && options.restoreContext) {
        recoveryContext = await this.restoreSessionContext(
          newSession.id,
          options.linkedSessionId,
          context
        )
      }

      // Start heartbeat tracking
      this.startHeartbeatTracking(newSession.id, {
        deviceInfo: options.deviceInfo,
        connectionId: context.sessionId,
      })

      const duration = performance.now() - startTime

      logger.info('Session with continuity created successfully', {
        requestId,
        sessionId: newSession.id,
        continuityEnabled: true,
        hasRecoveryContext: !!recoveryContext,
        duration: `${duration}ms`,
      })

      return {
        sessionId: newSession.id,
        continuityEnabled: true,
        recoveryContext,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to create session with continuity', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Find and restore previous session
   */
  async findAndRestoreSession(
    agentId: string,
    context: IsolationContext,
    options: SessionRestoreOptions = {
      preserveContext: true,
      restoreVariables: true,
      resumeJourney: true,
      maxInactivityHours: this.DEFAULT_INACTIVITY_HOURS,
      allowCrossDevice: false,
    }
  ): Promise<{
    strategy: ContinuityStrategy
    sessionId: string
    restored: boolean
    contextPreserved: boolean
    snapshot?: SessionStateSnapshot
  }> {
    const startTime = performance.now()
    const requestId = `restore-session-${Date.now()}`

    try {
      logger.info('Finding and restoring session', {
        requestId,
        agentId,
        workspaceId: context.workspaceId,
        userId: context.userId,
        options,
      })

      const maxInactivityDate = new Date()
      maxInactivityDate.setHours(
        maxInactivityDate.getHours() - (options.maxInactivityHours || this.DEFAULT_INACTIVITY_HOURS)
      )

      // Find recent sessions for this user and agent
      const recentSessions = await db
        .select({
          id: parlantSession.id,
          status: parlantSession.status,
          lastActivityAt: parlantSession.lastActivityAt,
          currentJourneyId: parlantSession.currentJourneyId,
          currentStateId: parlantSession.currentStateId,
          variables: parlantSession.variables,
          metadata: parlantSession.metadata,
          messageCount: parlantSession.messageCount,
        })
        .from(parlantSession)
        .where(
          and(
            eq(parlantSession.agentId, agentId),
            eq(parlantSession.workspaceId, context.workspaceId),
            context.userId
              ? eq(parlantSession.userId, context.userId)
              : isNull(parlantSession.userId),
            gte(parlantSession.lastActivityAt, maxInactivityDate),
            or(eq(parlantSession.status, 'active'), eq(parlantSession.status, 'abandoned'))
          )
        )
        .orderBy(desc(parlantSession.lastActivityAt))
        .limit(5)

      if (recentSessions.length === 0) {
        // No recent sessions found - create fresh session
        const freshSession = await this.createSessionWithContinuity(agentId, context)

        const duration = performance.now() - startTime

        logger.info('No sessions to restore, created fresh session', {
          requestId,
          sessionId: freshSession.sessionId,
          duration: `${duration}ms`,
        })

        return {
          strategy: 'start_fresh',
          sessionId: freshSession.sessionId,
          restored: false,
          contextPreserved: false,
        }
      }

      const mostRecentSession = recentSessions[0]

      // Determine restoration strategy
      let strategy: ContinuityStrategy
      let targetSessionId: string
      let contextPreserved = false
      let snapshot: SessionStateSnapshot | undefined

      if (mostRecentSession.status === 'active' && mostRecentSession.messageCount > 0) {
        // Resume existing active session
        strategy = 'resume_existing'
        targetSessionId = mostRecentSession.id

        // Update session activity
        await db
          .update(parlantSession)
          .set({
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(parlantSession.id, targetSessionId))

        // Restart heartbeat tracking
        this.startHeartbeatTracking(targetSessionId)

        contextPreserved = true
      } else if (options.preserveContext && mostRecentSession.messageCount > 0) {
        // Create new session with restored context
        const newSession = await this.createSessionWithContinuity(agentId, context, {
          linkedSessionId: mostRecentSession.id,
          restoreContext: true,
        })

        strategy = 'restore_context'
        targetSessionId = newSession.sessionId
        contextPreserved = true

        // Create state snapshot
        snapshot = await this.createStateSnapshot(mostRecentSession.id)
      } else {
        // Create linked session without context
        const linkedSession = await this.createSessionWithContinuity(agentId, context, {
          linkedSessionId: mostRecentSession.id,
          restoreContext: false,
        })

        strategy = 'create_linked'
        targetSessionId = linkedSession.sessionId
        contextPreserved = false
      }

      const duration = performance.now() - startTime

      logger.info('Session restoration completed', {
        requestId,
        strategy,
        sessionId: targetSessionId,
        contextPreserved,
        recentSessionsFound: recentSessions.length,
        duration: `${duration}ms`,
      })

      return {
        strategy,
        sessionId: targetSessionId,
        restored: strategy !== 'start_fresh',
        contextPreserved,
        snapshot,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to find and restore session', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Create comprehensive state snapshot
   */
  async createStateSnapshot(sessionId: string): Promise<SessionStateSnapshot> {
    const startTime = performance.now()
    const requestId = `create-snapshot-${Date.now()}`

    try {
      logger.debug('Creating state snapshot', {
        requestId,
        sessionId,
      })

      // Get session details
      const [sessionDetails] = await db
        .select({
          id: parlantSession.id,
          agentId: parlantSession.agentId,
          workspaceId: parlantSession.workspaceId,
          userId: parlantSession.userId,
          currentJourneyId: parlantSession.currentJourneyId,
          currentStateId: parlantSession.currentStateId,
          variables: parlantSession.variables,
          metadata: parlantSession.metadata,
          lastActivityAt: parlantSession.lastActivityAt,
        })
        .from(parlantSession)
        .where(eq(parlantSession.id, sessionId))
        .limit(1)

      if (!sessionDetails) {
        throw new Error('Session not found')
      }

      // Get recent context messages
      const contextHistory = await db
        .select({
          offset: parlantEvent.offset,
          eventType: parlantEvent.eventType,
          content: parlantEvent.content,
          createdAt: parlantEvent.createdAt,
        })
        .from(parlantEvent)
        .where(eq(parlantEvent.sessionId, sessionId))
        .orderBy(desc(parlantEvent.offset))
        .limit(this.MAX_CONTEXT_MESSAGES)

      // Get session variables
      const sessionVariables = await db
        .select({
          key: parlantVariable.key,
          value: parlantVariable.value,
          scope: parlantVariable.scope,
        })
        .from(parlantVariable)
        .where(eq(parlantVariable.sessionId, sessionId))

      // Compile variables
      const variables: Record<string, any> = {}
      sessionVariables.forEach((variable) => {
        variables[variable.key] = variable.value
      })

      // Add session-level variables
      Object.assign(variables, sessionDetails.variables || {})

      const snapshot: SessionStateSnapshot = {
        sessionId: sessionDetails.id,
        agentId: sessionDetails.agentId,
        workspaceId: sessionDetails.workspaceId,
        userId: sessionDetails.userId || undefined,
        currentJourneyId: sessionDetails.currentJourneyId || undefined,
        currentStateId: sessionDetails.currentStateId || undefined,
        variables,
        contextHistory: contextHistory.reverse().map((event) => ({
          offset: event.offset,
          type: event.eventType,
          content: event.content,
          timestamp: event.createdAt.toISOString(),
        })),
        lastActivity: sessionDetails.lastActivityAt.toISOString(),
        sessionMetadata: (sessionDetails.metadata as Record<string, any>) || {},
      }

      const duration = performance.now() - startTime

      logger.debug('State snapshot created', {
        requestId,
        sessionId,
        contextMessagesCount: contextHistory.length,
        variablesCount: Object.keys(variables).length,
        duration: `${duration}ms`,
      })

      return snapshot
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to create state snapshot', {
        requestId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Restore session context from previous session
   */
  async restoreSessionContext(
    newSessionId: string,
    sourceSessionId: string,
    context: IsolationContext
  ): Promise<SessionRecoveryContext> {
    const startTime = performance.now()
    const requestId = `restore-context-${Date.now()}`

    try {
      logger.info('Restoring session context', {
        requestId,
        newSessionId,
        sourceSessionId,
        workspaceId: context.workspaceId,
      })

      // Get source session snapshot
      const snapshot = await this.createStateSnapshot(sourceSessionId)

      // Validate workspace isolation
      if (snapshot.workspaceId !== context.workspaceId) {
        throw new Error('Cross-workspace context restoration not allowed')
      }

      // Restore variables
      let variablesPreserved = 0
      if (Object.keys(snapshot.variables).length > 0) {
        // Update session variables
        await db
          .update(parlantSession)
          .set({
            variables: snapshot.variables,
            updatedAt: new Date(),
          })
          .where(eq(parlantSession.id, newSessionId))

        // Restore individual variable records
        for (const [key, value] of Object.entries(snapshot.variables)) {
          await db
            .insert(parlantVariable)
            .values({
              agentId: snapshot.agentId,
              sessionId: newSessionId,
              key,
              value,
              valueType: typeof value,
              scope: 'session',
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [parlantVariable.sessionId, parlantVariable.key],
              set: {
                value,
                updatedAt: new Date(),
              },
            })

          variablesPreserved++
        }
      }

      // Restore journey state if applicable
      let journeyStatePreserved = false
      if (snapshot.currentJourneyId && snapshot.currentStateId) {
        await db
          .update(parlantSession)
          .set({
            currentJourneyId: snapshot.currentJourneyId,
            currentStateId: snapshot.currentStateId,
            updatedAt: new Date(),
          })
          .where(eq(parlantSession.id, newSessionId))

        journeyStatePreserved = true
      }

      // Add context restoration event
      await db.insert(parlantEvent).values({
        sessionId: newSessionId,
        offset: 0, // First event in new session
        eventType: 'status_update',
        content: {
          type: 'context_restored',
          sourceSessionId,
          messagesPreserved: snapshot.contextHistory.length,
          variablesPreserved,
          journeyStatePreserved,
          restorationTimestamp: new Date().toISOString(),
        },
        metadata: {
          continuity: true,
          restoration: true,
          sourceSession: sourceSessionId,
        },
        createdAt: new Date(),
      })

      const recoveryContext: SessionRecoveryContext = {
        originalSessionId: sourceSessionId,
        recoveryReason: 'browser_restart', // Default reason
        contextPreservation: {
          messagesPreserved: snapshot.contextHistory.length,
          variablesPreserved,
          journeyStatePreserved,
        },
        recoveryTimestamp: new Date().toISOString(),
      }

      const duration = performance.now() - startTime

      logger.info('Session context restored successfully', {
        requestId,
        newSessionId,
        sourceSessionId,
        messagesPreserved: snapshot.contextHistory.length,
        variablesPreserved,
        journeyStatePreserved,
        duration: `${duration}ms`,
      })

      return recoveryContext
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to restore session context', {
        requestId,
        newSessionId,
        sourceSessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Start heartbeat tracking for session
   */
  startHeartbeatTracking(
    sessionId: string,
    options: {
      deviceInfo?: any
      connectionId?: string
    } = {}
  ): void {
    logger.debug('Starting heartbeat tracking', {
      sessionId,
      hasDeviceInfo: !!options.deviceInfo,
      connectionId: options.connectionId,
    })

    // Stop existing heartbeat if any
    this.stopHeartbeatTracking(sessionId)

    // Create heartbeat record
    const heartbeat: SessionHeartbeat = {
      sessionId,
      lastHeartbeat: new Date(),
      isActive: true,
      connectionId: options.connectionId,
      deviceInfo: options.deviceInfo,
    }

    this.activeSessions.set(sessionId, heartbeat)

    // Start heartbeat timer
    const heartbeatTimer = setInterval(async () => {
      try {
        await this.updateSessionHeartbeat(sessionId)
      } catch (error) {
        logger.error('Heartbeat update failed', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        this.stopHeartbeatTracking(sessionId)
      }
    }, this.HEARTBEAT_INTERVAL_MS)

    this.heartbeatTrackers.set(sessionId, heartbeatTimer)
  }

  /**
   * Stop heartbeat tracking for session
   */
  stopHeartbeatTracking(sessionId: string): void {
    logger.debug('Stopping heartbeat tracking', { sessionId })

    const timer = this.heartbeatTrackers.get(sessionId)
    if (timer) {
      clearInterval(timer)
      this.heartbeatTrackers.delete(sessionId)
    }

    this.activeSessions.delete(sessionId)
  }

  /**
   * Update session heartbeat
   */
  private async updateSessionHeartbeat(sessionId: string): Promise<void> {
    const heartbeat = this.activeSessions.get(sessionId)
    if (!heartbeat) return

    try {
      // Update database
      await db
        .update(parlantSession)
        .set({
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(parlantSession.id, sessionId))

      // Update in-memory record
      heartbeat.lastHeartbeat = new Date()
    } catch (error) {
      logger.error('Failed to update session heartbeat', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Get session continuity status
   */
  async getSessionContinuityStatus(sessionId: string): Promise<{
    sessionId: string
    isActive: boolean
    lastHeartbeat?: Date
    continuityEnabled: boolean
    deviceInfo?: any
    linkedSessions: string[]
  }> {
    const startTime = performance.now()

    try {
      // Get session details
      const [sessionDetails] = await db
        .select({
          id: parlantSession.id,
          status: parlantSession.status,
          metadata: parlantSession.metadata,
          lastActivityAt: parlantSession.lastActivityAt,
        })
        .from(parlantSession)
        .where(eq(parlantSession.id, sessionId))
        .limit(1)

      if (!sessionDetails) {
        throw new Error('Session not found')
      }

      const sessionMetadata = (sessionDetails.metadata as Record<string, any>) || {}
      const heartbeat = this.activeSessions.get(sessionId)

      // Find linked sessions
      const linkedSessions = await db
        .select({ id: parlantSession.id })
        .from(parlantSession)
        .where(eq(parlantSession.metadata, { linkedSessionId: sessionId } as any))

      const duration = performance.now() - startTime

      return {
        sessionId,
        isActive: sessionDetails.status === 'active' && !!heartbeat,
        lastHeartbeat: heartbeat?.lastHeartbeat,
        continuityEnabled: sessionMetadata.continuityEnabled || false,
        deviceInfo: sessionMetadata.deviceInfo,
        linkedSessions: linkedSessions.map((s) => s.id),
      }
    } catch (error) {
      logger.error('Failed to get session continuity status', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Cleanup inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const requestId = `cleanup-${Date.now()}`

    try {
      logger.info('Starting inactive session cleanup', { requestId })

      const cleanupDate = new Date()
      cleanupDate.setHours(cleanupDate.getHours() - this.SESSION_CLEANUP_HOURS)

      // Find inactive sessions to cleanup
      const inactiveSessions = await db
        .select({ id: parlantSession.id })
        .from(parlantSession)
        .where(
          and(
            lte(parlantSession.lastActivityAt, cleanupDate),
            or(eq(parlantSession.status, 'abandoned'), eq(parlantSession.status, 'completed'))
          )
        )

      // Stop heartbeat tracking for cleanup sessions
      for (const session of inactiveSessions) {
        this.stopHeartbeatTracking(session.id)
      }

      logger.info('Inactive session cleanup completed', {
        requestId,
        cleanedSessions: inactiveSessions.length,
      })
    } catch (error) {
      logger.error('Failed to cleanup inactive sessions', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Start periodic cleanup process
   */
  private startPeriodicCleanup(): void {
    logger.info('Starting periodic session cleanup')

    // Run cleanup every 4 hours
    setInterval(
      () => {
        this.cleanupInactiveSessions()
      },
      4 * 60 * 60 * 1000
    )

    // Run initial cleanup after 1 minute
    setTimeout(() => {
      this.cleanupInactiveSessions()
    }, 60 * 1000)
  }
}

// Export singleton instance
export const sessionContinuityManager = new SessionContinuityManager()
