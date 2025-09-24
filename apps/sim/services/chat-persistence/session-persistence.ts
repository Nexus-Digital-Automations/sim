import { db } from '@packages/db'
import { BrowserSessionManager, ConversationManager } from '@packages/db/chat-persistence-queries'
import { parlantSession } from '@packages/db/parlant-schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

/**
 * Session Persistence Service
 *
 * Handles browser session persistence and restoration for seamless chat continuity.
 * Provides cross-browser session management and automatic state restoration.
 *
 * Key Features:
 * - Browser session persistence across page refreshes
 * - Cross-device conversation continuity
 * - Automatic session restoration with fallback
 * - Session state synchronization
 * - Cleanup and expiration management
 */

export interface ChatSessionState {
  conversationId?: string
  parlantSessionId?: string
  agentId?: string
  currentMessageId?: string
  scrollPosition?: number
  typing?: boolean
  draft?: string
  uiPreferences?: {
    theme?: string
    fontSize?: number
    compactMode?: boolean
    soundEnabled?: boolean
  }
  metadata?: Record<string, any>
}

export interface SessionRestorationResult {
  success: boolean
  sessionState?: ChatSessionState
  conversationId?: string
  parlantSessionId?: string
  requiresNewSession?: boolean
  error?: string
}

export class SessionPersistenceService {
  private sessionManager: BrowserSessionManager
  private conversationManager: ConversationManager
  private sessionToken: string | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.sessionManager = new BrowserSessionManager(db)
    this.conversationManager = new ConversationManager(db)
  }

  /**
   * Initialize or restore a browser session
   */
  async initializeSession(params: {
    workspaceId: string
    userId?: string
    sessionToken?: string
    conversationId?: string
    parlantSessionId?: string
    agentId?: string
    deviceInfo?: Record<string, any>
  }): Promise<SessionRestorationResult> {
    try {
      let sessionToken = params.sessionToken

      // Try to restore existing session first
      if (sessionToken) {
        const restored = await this.restoreExistingSession(sessionToken)
        if (restored.success) {
          this.sessionToken = sessionToken
          this.startHeartbeat()
          return restored
        }
      }

      // Create new session
      sessionToken = this.generateSessionToken()

      const initialState: ChatSessionState = {
        conversationId: params.conversationId,
        parlantSessionId: params.parlantSessionId,
        agentId: params.agentId,
        scrollPosition: 0,
        uiPreferences: {
          theme: 'system',
          fontSize: 14,
          compactMode: false,
          soundEnabled: true,
        },
        metadata: {
          initialized: new Date().toISOString(),
          userAgent: params.deviceInfo?.userAgent,
        },
      }

      const browserSession = await this.sessionManager.createOrUpdateSession({
        sessionToken,
        workspaceId: params.workspaceId,
        userId: params.userId,
        conversationId: params.conversationId,
        parlantSessionId: params.parlantSessionId,
        chatState: initialState,
        deviceInfo: params.deviceInfo,
        expirationHours: 24,
      })

      this.sessionToken = sessionToken
      this.startHeartbeat()

      return {
        success: true,
        sessionState: initialState,
        conversationId: browserSession.conversationId,
        parlantSessionId: browserSession.parlantSessionId,
        requiresNewSession: false,
      }
    } catch (error) {
      console.error('Failed to initialize session:', error)
      return {
        success: false,
        requiresNewSession: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Restore existing session by token
   */
  async restoreExistingSession(sessionToken: string): Promise<SessionRestorationResult> {
    try {
      const browserSession = await this.sessionManager.restoreSession(sessionToken)

      if (!browserSession) {
        return {
          success: false,
          requiresNewSession: true,
          error: 'Session not found or expired',
        }
      }

      // Verify Parlant session is still valid
      if (browserSession.parlantSessionId) {
        const parlantSessionValid = await this.verifyParlantSession(browserSession.parlantSessionId)

        if (!parlantSessionValid) {
          // Parlant session expired, but we can create a new one
          return {
            success: true,
            sessionState: browserSession.chatState as ChatSessionState,
            conversationId: browserSession.conversationId,
            requiresNewSession: true, // Need new Parlant session
          }
        }
      }

      return {
        success: true,
        sessionState: browserSession.chatState as ChatSessionState,
        conversationId: browserSession.conversationId,
        parlantSessionId: browserSession.parlantSessionId,
        requiresNewSession: false,
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      return {
        success: false,
        requiresNewSession: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update session state
   */
  async updateSessionState(
    updates: Partial<ChatSessionState>,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.sessionToken) {
      console.warn('No session token available for state update')
      return false
    }

    try {
      // Get current session to merge state
      const currentSession = await this.sessionManager.restoreSession(this.sessionToken)
      if (!currentSession) {
        console.warn('Session not found for state update')
        return false
      }

      const currentState = currentSession.chatState as ChatSessionState
      const newState: ChatSessionState = {
        ...currentState,
        ...updates,
        uiPreferences: {
          ...currentState.uiPreferences,
          ...updates.uiPreferences,
        },
        metadata: {
          ...currentState.metadata,
          ...updates.metadata,
          ...metadata,
          lastUpdated: new Date().toISOString(),
        },
      }

      await this.sessionManager.createOrUpdateSession({
        sessionToken: this.sessionToken,
        workspaceId: currentSession.workspaceId,
        userId: currentSession.userId,
        conversationId: updates.conversationId || currentSession.conversationId,
        parlantSessionId: updates.parlantSessionId || currentSession.parlantSessionId,
        chatState: newState,
        deviceInfo: currentSession.deviceInfo,
      })

      return true
    } catch (error) {
      console.error('Failed to update session state:', error)
      return false
    }
  }

  /**
   * Link session to conversation
   */
  async linkToConversation(conversationId: string, parlantSessionId?: string): Promise<boolean> {
    if (!this.sessionToken) {
      return false
    }

    try {
      // Update browser session
      await this.updateSessionState({
        conversationId,
        parlantSessionId,
      })

      // Link in conversation manager if Parlant session provided
      if (parlantSessionId) {
        await this.conversationManager.linkSessionToConversation(conversationId, parlantSessionId)
      }

      return true
    } catch (error) {
      console.error('Failed to link session to conversation:', error)
      return false
    }
  }

  /**
   * Update scroll position
   */
  async updateScrollPosition(scrollPosition: number): Promise<void> {
    await this.updateSessionState({ scrollPosition })
  }

  /**
   * Update typing status
   */
  async updateTypingStatus(typing: boolean): Promise<void> {
    await this.updateSessionState({ typing })
  }

  /**
   * Save draft message
   */
  async saveDraft(draft: string): Promise<void> {
    await this.updateSessionState({ draft })
  }

  /**
   * Update UI preferences
   */
  async updateUIPreferences(
    preferences: Partial<ChatSessionState['uiPreferences']>
  ): Promise<void> {
    await this.updateSessionState({ uiPreferences: preferences })
  }

  /**
   * Get current session token
   */
  getSessionToken(): string | null {
    return this.sessionToken
  }

  /**
   * Destroy current session
   */
  async destroySession(): Promise<void> {
    if (this.sessionToken) {
      this.stopHeartbeat()

      try {
        // Mark session as inactive
        const currentSession = await this.sessionManager.restoreSession(this.sessionToken)
        if (currentSession) {
          await this.sessionManager.createOrUpdateSession({
            sessionToken: this.sessionToken,
            workspaceId: currentSession.workspaceId,
            userId: currentSession.userId,
            conversationId: currentSession.conversationId,
            parlantSessionId: currentSession.parlantSessionId,
            chatState: { ...currentSession.chatState, sessionEnded: new Date().toISOString() },
            deviceInfo: currentSession.deviceInfo,
          })
        }
      } catch (error) {
        console.error('Failed to properly destroy session:', error)
      }

      this.sessionToken = null
    }
  }

  /**
   * Start heartbeat to maintain session
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(async () => {
      if (this.sessionToken) {
        try {
          await this.sessionManager.updateHeartbeat(this.sessionToken)
        } catch (error) {
          console.error('Heartbeat failed:', error)
          this.stopHeartbeat()
        }
      }
    }, 30000) // 30-second heartbeat
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Verify Parlant session is still active
   */
  private async verifyParlantSession(sessionId: string): Promise<boolean> {
    try {
      const [session] = await db
        .select()
        .from(parlantSession)
        .where(eq(parlantSession.id, sessionId))
        .limit(1)

      return session && session.status === 'active'
    } catch (error) {
      console.error('Failed to verify Parlant session:', error)
      return false
    }
  }

  /**
   * Generate unique session token
   */
  private generateSessionToken(): string {
    return `chat_session_${uuidv4()}_${Date.now()}`
  }

  /**
   * Cleanup expired sessions (background task)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const sessionManager = new BrowserSessionManager(db)
    return await sessionManager.expireOldSessions()
  }
}

/**
 * Session Persistence Factory
 * Provides singleton instance management for session persistence
 */
class SessionPersistenceFactory {
  private static instance: SessionPersistenceService | null = null

  static getInstance(): SessionPersistenceService {
    if (!SessionPersistenceFactory.instance) {
      SessionPersistenceFactory.instance = new SessionPersistenceService()
    }
    return SessionPersistenceFactory.instance
  }

  static destroyInstance(): void {
    if (SessionPersistenceFactory.instance) {
      SessionPersistenceFactory.instance.destroySession()
      SessionPersistenceFactory.instance = null
    }
  }
}

export { SessionPersistenceFactory }
export default SessionPersistenceService
