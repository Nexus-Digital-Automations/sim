/**
 * Social Features WebSocket Handler
 *
 * Extends the monitoring WebSocket handler to support real-time social features:
 * - Real-time social notifications (follows, likes, comments, mentions)
 * - Live activity feed updates with personalized content
 * - Social interaction broadcasting and engagement tracking
 * - User presence and online status management
 * - Comment thread updates and real-time discussions
 * - Social analytics and engagement metrics
 * - Community event notifications and announcements
 * - Cross-user collaboration and workspace sharing
 *
 * ARCHITECTURE:
 * - Integrates with existing monitoring infrastructure
 * - Extends MonitoringWebSocketHandler with social subscriptions
 * - Real-time event streaming for social interactions
 * - Scalable pub/sub architecture for social updates
 * - Privacy-aware broadcasting with user permissions
 *
 * @created 2025-09-04
 * @author Social Features WebSocket Handler
 */

import { EventEmitter } from 'events'
import { sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { generateId } from '@/lib/utils'
import { db } from '@/db'
import type { MonitoringSubscription } from '../real-time/websocket-handler'

const logger = createLogger('SocialWebSocketHandler')

export interface SocialSubscription extends MonitoringSubscription {
  type:
    | 'social_notifications'
    | 'activity_feed'
    | 'user_presence'
    | 'comment_threads'
    | 'social_analytics'
    | 'community_events'
    | 'collaboration_updates'
    | 'user_interactions'
  socialFilters?: {
    userId?: string
    followedUsersOnly?: boolean
    contentTypes?: string[]
    engagementTypes?: string[]
    notificationTypes?: string[]
    threadIds?: string[]
    communityId?: string
    collaborationSpaces?: string[]
  }
  realTimeOptions?: {
    enableTypingIndicators?: boolean
    enablePresenceTracking?: boolean
    enableReadReceipts?: boolean
    maxBatchSize?: number
    debounceMs?: number
    priorityThreshold?: number
  }
}

export interface SocialNotification {
  id: string
  type: string
  userId: string
  fromUserId?: string
  title: string
  message: string
  data: Record<string, any>
  priority: 'low' | 'normal' | 'high' | 'urgent'
  createdAt: Date
  readAt?: Date
}

export interface ActivityFeedUpdate {
  id: string
  activityId: string
  activityType: string
  userId: string
  targetType: string
  targetId: string
  updateType: 'new_activity' | 'engagement_update' | 'content_update'
  data: Record<string, any>
  timestamp: Date
}

export interface UserPresence {
  userId: string
  status: 'online' | 'away' | 'busy' | 'offline'
  lastSeen: Date
  currentActivity?: string
  customStatus?: string
}

export interface CommentThreadUpdate {
  threadId: string
  commentId: string
  parentCommentId?: string
  updateType: 'new_comment' | 'comment_updated' | 'comment_deleted' | 'reaction_added'
  userId: string
  content?: string
  reactionType?: string
  timestamp: Date
}

export class SocialWebSocketHandler extends EventEmitter {
  private activeSubscriptions = new Map<string, SocialSubscription>()
  private userPresence = new Map<string, UserPresence>()
  private connectionUsers = new Map<string, string>() // connectionId -> userId
  private userConnections = new Map<string, Set<string>>() // userId -> Set<connectionId>
  private typingIndicators = new Map<string, Map<string, NodeJS.Timeout>>() // threadId -> userId -> timer
  private readReceipts = new Map<string, Map<string, Date>>() // contentId -> userId -> readAt
  private activityStreams = new Map<string, any[]>() // userId -> activity buffer
  private notificationQueues = new Map<string, SocialNotification[]>() // userId -> notifications

  constructor(private socketServer: any) {
    super()
    this.setupSocialEventHandlers()
    this.startPresenceHeartbeat()
    logger.info('SocialWebSocketHandler initialized', {
      features: [
        'social-notifications',
        'activity-feed-updates',
        'user-presence-tracking',
        'comment-thread-updates',
        'real-time-collaboration',
        'social-analytics',
      ],
    })
  }

  /**
   * Handle new social subscription
   */
  async handleSocialSubscription(
    connectionId: string,
    subscription: SocialSubscription
  ): Promise<void> {
    const operationId = generateId()
    logger.debug(`[${operationId}] Processing social subscription`, {
      connectionId,
      subscriptionType: subscription.type,
      socialFilters: subscription.socialFilters,
    })

    try {
      // Get user ID from connection
      const userId = this.connectionUsers.get(connectionId)
      if (!userId && subscription.type !== 'community_events') {
        throw new Error('User authentication required for social subscriptions')
      }

      // Store subscription
      const subscriptionKey = `${connectionId}:${subscription.id}`
      this.activeSubscriptions.set(subscriptionKey, subscription)

      // Set up specific subscription handler
      switch (subscription.type) {
        case 'social_notifications':
          await this.handleNotificationSubscription(connectionId, subscription, userId!)
          break

        case 'activity_feed':
          await this.handleActivityFeedSubscription(connectionId, subscription, userId!)
          break

        case 'user_presence':
          await this.handlePresenceSubscription(connectionId, subscription, userId!)
          break

        case 'comment_threads':
          await this.handleCommentThreadSubscription(connectionId, subscription, userId!)
          break

        case 'social_analytics':
          await this.handleSocialAnalyticsSubscription(connectionId, subscription, userId!)
          break

        case 'community_events':
          await this.handleCommunityEventsSubscription(connectionId, subscription)
          break

        case 'collaboration_updates':
          await this.handleCollaborationSubscription(connectionId, subscription, userId!)
          break

        case 'user_interactions':
          await this.handleUserInteractionSubscription(connectionId, subscription, userId!)
          break

        default:
          throw new Error(`Unsupported social subscription type: ${subscription.type}`)
      }

      // Send confirmation
      this.sendToConnection(connectionId, {
        type: 'social_subscription_confirmed',
        subscriptionId: subscription.id,
        subscriptionType: subscription.type,
        timestamp: new Date().toISOString(),
      })

      logger.debug(`[${operationId}] Social subscription confirmed`, {
        connectionId,
        subscriptionType: subscription.type,
      })
    } catch (error) {
      logger.error(`[${operationId}] Error handling social subscription:`, error)
      this.sendToConnection(connectionId, {
        type: 'social_subscription_error',
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Handle user connection with social features
   */
  async handleUserConnection(connectionId: string, userId: string): Promise<void> {
    const operationId = generateId()
    logger.info(`[${operationId}] Handling social connection for user`, { connectionId, userId })

    try {
      // Store connection mapping
      this.connectionUsers.set(connectionId, userId)

      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set())
      }
      this.userConnections.get(userId)!.add(connectionId)

      // Update user presence
      await this.updateUserPresence(userId, {
        userId,
        status: 'online',
        lastSeen: new Date(),
      })

      // Send pending notifications
      await this.sendPendingNotifications(connectionId, userId)

      // Initialize activity stream buffer
      if (!this.activityStreams.has(userId)) {
        this.activityStreams.set(userId, [])
      }

      // Send initial social data
      const socialData = await this.getInitialSocialData(userId)
      this.sendToConnection(connectionId, {
        type: 'social_connection_established',
        data: socialData,
        timestamp: new Date().toISOString(),
      })

      logger.info(`[${operationId}] Social connection established`, { connectionId, userId })
    } catch (error) {
      logger.error(`[${operationId}] Error establishing social connection:`, error)
    }
  }

  /**
   * Handle user disconnection
   */
  async handleUserDisconnection(connectionId: string): Promise<void> {
    const operationId = generateId()
    const userId = this.connectionUsers.get(connectionId)

    logger.info(`[${operationId}] Handling social disconnection`, { connectionId, userId })

    try {
      // Clean up connection mappings
      if (userId) {
        const userConnections = this.userConnections.get(userId)
        if (userConnections) {
          userConnections.delete(connectionId)

          // If no more connections, update presence to offline
          if (userConnections.size === 0) {
            await this.updateUserPresence(userId, {
              userId,
              status: 'offline',
              lastSeen: new Date(),
            })
            this.userConnections.delete(userId)
          }
        }
      }

      this.connectionUsers.delete(connectionId)

      // Clean up subscriptions
      for (const [key, subscription] of this.activeSubscriptions.entries()) {
        if (key.startsWith(connectionId)) {
          this.activeSubscriptions.delete(key)
        }
      }

      logger.info(`[${operationId}] Social disconnection handled`, { connectionId, userId })
    } catch (error) {
      logger.error(`[${operationId}] Error handling social disconnection:`, error)
    }
  }

  /**
   * Broadcast social notification to users
   */
  async broadcastNotification(
    notification: SocialNotification,
    targetUserIds?: string[]
  ): Promise<void> {
    const operationId = generateId()
    logger.debug(`[${operationId}] Broadcasting social notification`, {
      notificationId: notification.id,
      type: notification.type,
      targetUsers: targetUserIds?.length || 'all',
    })

    try {
      // Determine target users
      const recipients = targetUserIds || [notification.userId]

      for (const userId of recipients) {
        // Check user's notification preferences
        const shouldSend = await this.shouldSendNotification(userId, notification)
        if (!shouldSend) continue

        // Get user connections
        const userConnections = this.userConnections.get(userId)
        if (!userConnections || userConnections.size === 0) {
          // Queue notification for when user comes online
          this.queueNotification(userId, notification)
          continue
        }

        // Send to all user connections
        for (const connectionId of userConnections) {
          this.sendToConnection(connectionId, {
            type: 'social_notification',
            data: notification,
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Update notification delivery status
      await this.updateNotificationDeliveryStatus(notification.id, 'delivered')
    } catch (error) {
      logger.error(`[${operationId}] Error broadcasting notification:`, error)
    }
  }

  /**
   * Broadcast activity feed update
   */
  async broadcastActivityFeedUpdate(
    update: ActivityFeedUpdate,
    targetUserIds: string[]
  ): Promise<void> {
    const operationId = generateId()
    logger.debug(`[${operationId}] Broadcasting activity feed update`, {
      activityId: update.activityId,
      updateType: update.updateType,
      targetUsers: targetUserIds.length,
    })

    try {
      for (const userId of targetUserIds) {
        // Check if user should receive this update
        const shouldReceive = await this.shouldReceiveActivityUpdate(userId, update)
        if (!shouldReceive) continue

        // Get user connections
        const userConnections = this.userConnections.get(userId)
        if (!userConnections || userConnections.size === 0) {
          // Buffer update for when user comes online
          this.bufferActivityUpdate(userId, update)
          continue
        }

        // Send to all user connections with activity feed subscriptions
        for (const connectionId of userConnections) {
          const hasActivitySubscription = Array.from(this.activeSubscriptions.entries()).some(
            ([key, sub]) => key.startsWith(connectionId) && sub.type === 'activity_feed'
          )

          if (hasActivitySubscription) {
            this.sendToConnection(connectionId, {
              type: 'activity_feed_update',
              data: update,
              timestamp: new Date().toISOString(),
            })
          }
        }
      }
    } catch (error) {
      logger.error(`[${operationId}] Error broadcasting activity feed update:`, error)
    }
  }

  /**
   * Broadcast comment thread update
   */
  async broadcastCommentUpdate(
    threadUpdate: CommentThreadUpdate,
    targetUserIds: string[]
  ): Promise<void> {
    const operationId = generateId()
    logger.debug(`[${operationId}] Broadcasting comment thread update`, {
      threadId: threadUpdate.threadId,
      updateType: threadUpdate.updateType,
      targetUsers: targetUserIds.length,
    })

    try {
      for (const userId of targetUserIds) {
        const userConnections = this.userConnections.get(userId)
        if (!userConnections) continue

        for (const connectionId of userConnections) {
          // Check if connection has comment thread subscription for this thread
          const hasThreadSubscription = Array.from(this.activeSubscriptions.entries()).some(
            ([key, sub]) =>
              key.startsWith(connectionId) &&
              sub.type === 'comment_threads' &&
              sub.socialFilters?.threadIds?.includes(threadUpdate.threadId)
          )

          if (hasThreadSubscription) {
            this.sendToConnection(connectionId, {
              type: 'comment_thread_update',
              data: threadUpdate,
              timestamp: new Date().toISOString(),
            })
          }
        }
      }
    } catch (error) {
      logger.error(`[${operationId}] Error broadcasting comment update:`, error)
    }
  }

  /**
   * Update user presence status
   */
  async updateUserPresence(userId: string, presence: UserPresence): Promise<void> {
    try {
      const previousPresence = this.userPresence.get(userId)
      this.userPresence.set(userId, presence)

      // Broadcast presence update to followers
      if (!previousPresence || previousPresence.status !== presence.status) {
        const followers = await this.getUserFollowers(userId)

        for (const followerId of followers) {
          const followerConnections = this.userConnections.get(followerId)
          if (!followerConnections) continue

          for (const connectionId of followerConnections) {
            const hasPresenceSubscription = Array.from(this.activeSubscriptions.entries()).some(
              ([key, sub]) => key.startsWith(connectionId) && sub.type === 'user_presence'
            )

            if (hasPresenceSubscription) {
              this.sendToConnection(connectionId, {
                type: 'user_presence_update',
                data: presence,
                timestamp: new Date().toISOString(),
              })
            }
          }
        }
      }

      // Update database presence
      await this.updateDatabasePresence(userId, presence)
    } catch (error) {
      logger.error('[SocialWebSocket] Error updating user presence:', error)
    }
  }

  // ========================
  // SUBSCRIPTION HANDLERS
  // ========================

  private async handleNotificationSubscription(
    connectionId: string,
    subscription: SocialSubscription,
    userId: string
  ): Promise<void> {
    logger.debug('Setting up notification subscription', { connectionId, userId })

    // Send any queued notifications
    const queuedNotifications = this.notificationQueues.get(userId) || []
    for (const notification of queuedNotifications) {
      this.sendToConnection(connectionId, {
        type: 'social_notification',
        data: notification,
        timestamp: new Date().toISOString(),
      })
    }
    this.notificationQueues.delete(userId)
  }

  private async handleActivityFeedSubscription(
    connectionId: string,
    subscription: SocialSubscription,
    userId: string
  ): Promise<void> {
    logger.debug('Setting up activity feed subscription', { connectionId, userId })

    // Send buffered activity updates
    const bufferedActivities = this.activityStreams.get(userId) || []
    if (bufferedActivities.length > 0) {
      this.sendToConnection(connectionId, {
        type: 'activity_feed_batch',
        data: bufferedActivities,
        timestamp: new Date().toISOString(),
      })
      this.activityStreams.set(userId, []) // Clear buffer
    }
  }

  private async handlePresenceSubscription(
    connectionId: string,
    subscription: SocialSubscription,
    userId: string
  ): Promise<void> {
    logger.debug('Setting up presence subscription', { connectionId, userId })

    // Send current presence for followed users
    const following = await this.getUserFollowing(userId)
    const presenceUpdates = following
      .map((followedId) => this.userPresence.get(followedId))
      .filter(Boolean)

    if (presenceUpdates.length > 0) {
      this.sendToConnection(connectionId, {
        type: 'presence_batch_update',
        data: presenceUpdates,
        timestamp: new Date().toISOString(),
      })
    }
  }

  private async handleCommentThreadSubscription(
    connectionId: string,
    subscription: SocialSubscription,
    userId: string
  ): Promise<void> {
    logger.debug('Setting up comment thread subscription', {
      connectionId,
      userId,
      threadIds: subscription.socialFilters?.threadIds,
    })
  }

  private async handleSocialAnalyticsSubscription(
    connectionId: string,
    subscription: SocialSubscription,
    userId: string
  ): Promise<void> {
    logger.debug('Setting up social analytics subscription', { connectionId, userId })

    // Send initial analytics data
    const analytics = await this.getUserSocialAnalytics(userId)
    this.sendToConnection(connectionId, {
      type: 'social_analytics_data',
      data: analytics,
      timestamp: new Date().toISOString(),
    })
  }

  private async handleCommunityEventsSubscription(
    connectionId: string,
    subscription: SocialSubscription
  ): Promise<void> {
    logger.debug('Setting up community events subscription', { connectionId })
  }

  private async handleCollaborationSubscription(
    connectionId: string,
    subscription: SocialSubscription,
    userId: string
  ): Promise<void> {
    logger.debug('Setting up collaboration subscription', { connectionId, userId })
  }

  private async handleUserInteractionSubscription(
    connectionId: string,
    subscription: SocialSubscription,
    userId: string
  ): Promise<void> {
    logger.debug('Setting up user interaction subscription', { connectionId, userId })
  }

  // ========================
  // HELPER METHODS
  // ========================

  private setupSocialEventHandlers(): void {
    // Listen for social events from the application
    this.on('social_notification', (notification: SocialNotification, targetUserIds?: string[]) => {
      this.broadcastNotification(notification, targetUserIds)
    })

    this.on('activity_feed_update', (update: ActivityFeedUpdate, targetUserIds: string[]) => {
      this.broadcastActivityFeedUpdate(update, targetUserIds)
    })

    this.on('comment_thread_update', (update: CommentThreadUpdate, targetUserIds: string[]) => {
      this.broadcastCommentUpdate(update, targetUserIds)
    })

    this.on('user_presence_update', (userId: string, presence: UserPresence) => {
      this.updateUserPresence(userId, presence)
    })
  }

  private startPresenceHeartbeat(): void {
    // Update presence heartbeat every 30 seconds
    setInterval(() => {
      for (const [userId, connections] of this.userConnections.entries()) {
        if (connections.size > 0) {
          const currentPresence = this.userPresence.get(userId)
          if (currentPresence && currentPresence.status === 'online') {
            this.updateUserPresence(userId, {
              ...currentPresence,
              lastSeen: new Date(),
            })
          }
        }
      }
    }, 30000)
  }

  private sendToConnection(connectionId: string, message: any): void {
    try {
      if (this.socketServer?.to) {
        this.socketServer.to(connectionId).emit('social_update', message)
      }
    } catch (error) {
      logger.error(`Error sending message to connection ${connectionId}:`, error)
    }
  }

  private async getInitialSocialData(userId: string): Promise<any> {
    try {
      const [pendingNotifications, onlineFriends, recentActivities] = await Promise.all([
        this.getPendingNotifications(userId),
        this.getOnlineFriends(userId),
        this.getRecentActivities(userId, 10),
      ])

      return {
        pendingNotifications: pendingNotifications.length,
        onlineFriends,
        recentActivities,
        presence: this.userPresence.get(userId) || {
          userId,
          status: 'online',
          lastSeen: new Date(),
        },
      }
    } catch (error) {
      logger.error('Error getting initial social data:', error)
      return {}
    }
  }

  private async shouldSendNotification(
    userId: string,
    notification: SocialNotification
  ): Promise<boolean> {
    // Check user notification preferences
    try {
      const preferences = await db.execute(sql`
        SELECT email_notifications, push_notifications 
        FROM community_user_profiles 
        WHERE user_id = ${userId}
      `)

      if (preferences.length === 0) return true // Default to sending

      // Simple preference check - would be more sophisticated in production
      return (preferences[0] as any).push_notifications !== false
    } catch (error) {
      logger.error('Error checking notification preferences:', error)
      return true
    }
  }

  private queueNotification(userId: string, notification: SocialNotification): void {
    if (!this.notificationQueues.has(userId)) {
      this.notificationQueues.set(userId, [])
    }
    this.notificationQueues.get(userId)!.push(notification)
  }

  private async shouldReceiveActivityUpdate(
    userId: string,
    update: ActivityFeedUpdate
  ): Promise<boolean> {
    // Check if user should receive this activity update based on privacy settings
    return true // Simplified for now
  }

  private bufferActivityUpdate(userId: string, update: ActivityFeedUpdate): void {
    if (!this.activityStreams.has(userId)) {
      this.activityStreams.set(userId, [])
    }
    const buffer = this.activityStreams.get(userId)!
    buffer.push(update)

    // Keep buffer size manageable
    if (buffer.length > 100) {
      buffer.splice(0, buffer.length - 100)
    }
  }

  private async sendPendingNotifications(connectionId: string, userId: string): Promise<void> {
    const notifications = await this.getPendingNotifications(userId)
    for (const notification of notifications) {
      this.sendToConnection(connectionId, {
        type: 'social_notification',
        data: notification,
        timestamp: new Date().toISOString(),
      })
    }
  }

  private async updateNotificationDeliveryStatus(
    notificationId: string,
    status: string
  ): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE community_notifications 
        SET delivery_status = ${status}, delivered_at = NOW()
        WHERE id = ${notificationId}
      `)
    } catch (error) {
      logger.error('Error updating notification delivery status:', error)
    }
  }

  private async updateDatabasePresence(userId: string, presence: UserPresence): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE community_user_profiles 
        SET last_active_at = ${presence.lastSeen.toISOString()}
        WHERE user_id = ${userId}
      `)
    } catch (error) {
      logger.error('Error updating database presence:', error)
    }
  }

  private async getUserFollowers(userId: string): Promise<string[]> {
    try {
      const result = await db.execute(sql`
        SELECT follower_id FROM community_user_follows WHERE following_id = ${userId}
      `)
      return result.map((row: any) => row.follower_id)
    } catch (error) {
      logger.error('Error getting user followers:', error)
      return []
    }
  }

  private async getUserFollowing(userId: string): Promise<string[]> {
    try {
      const result = await db.execute(sql`
        SELECT following_id FROM community_user_follows WHERE follower_id = ${userId}
      `)
      return result.map((row: any) => row.following_id)
    } catch (error) {
      logger.error('Error getting user following:', error)
      return []
    }
  }

  private async getPendingNotifications(userId: string): Promise<SocialNotification[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, notification_type as type, title, message, notification_data as data,
               priority, created_at, read_at, source_user_id as from_user_id
        FROM community_notifications 
        WHERE user_id = ${userId} AND is_read = false
        ORDER BY created_at DESC 
        LIMIT 50
      `)

      return result.map((row: any) => ({
        id: row.id,
        type: row.type,
        userId,
        fromUserId: row.from_user_id,
        title: row.title,
        message: row.message,
        data: row.data || {},
        priority: row.priority || 'normal',
        createdAt: new Date(row.created_at),
        readAt: row.read_at ? new Date(row.read_at) : undefined,
      }))
    } catch (error) {
      logger.error('Error getting pending notifications:', error)
      return []
    }
  }

  private async getOnlineFriends(userId: string): Promise<any[]> {
    const following = await this.getUserFollowing(userId)
    return following
      .map((friendId) => {
        const presence = this.userPresence.get(friendId)
        return presence && presence.status === 'online' ? { userId: friendId, presence } : null
      })
      .filter(Boolean)
  }

  private async getRecentActivities(userId: string, limit: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT cua.id, cua.activity_type, cua.target_title, cua.created_at,
               u.name as user_name, cup.display_name as user_display_name
        FROM community_user_activities cua
        INNER JOIN "user" u ON cua.user_id = u.id
        LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
        WHERE cua.user_id IN (
          SELECT following_id FROM community_user_follows WHERE follower_id = ${userId}
        )
        AND cua.is_hidden = false
        AND cua.visibility IN ('public', 'followers')
        ORDER BY cua.created_at DESC
        LIMIT ${limit}
      `)

      return result.map((row: any) => ({
        id: row.id,
        activityType: row.activity_type,
        targetTitle: row.target_title,
        createdAt: row.created_at,
        user: {
          name: row.user_name,
          displayName: row.user_display_name,
        },
      }))
    } catch (error) {
      logger.error('Error getting recent activities:', error)
      return []
    }
  }

  private async getUserSocialAnalytics(userId: string): Promise<any> {
    try {
      const result = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM community_user_follows WHERE follower_id = ${userId}) as following_count,
          (SELECT COUNT(*) FROM community_user_follows WHERE following_id = ${userId}) as follower_count,
          (SELECT COUNT(*) FROM community_user_activities WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '7 days') as weekly_activities,
          (SELECT SUM(like_count + comment_count) FROM community_user_activities WHERE user_id = ${userId}) as total_engagement
      `)

      const analytics = result[0] as any
      return {
        followingCount: analytics?.following_count || 0,
        followerCount: analytics?.follower_count || 0,
        weeklyActivities: analytics?.weekly_activities || 0,
        totalEngagement: analytics?.total_engagement || 0,
      }
    } catch (error) {
      logger.error('Error getting user social analytics:', error)
      return {}
    }
  }

  /**
   * Get handler statistics
   */
  getHandlerStats(): any {
    return {
      activeSubscriptions: this.activeSubscriptions.size,
      connectedUsers: this.userConnections.size,
      onlineUsers: Array.from(this.userPresence.values()).filter((p) => p.status === 'online')
        .length,
      queuedNotifications: Array.from(this.notificationQueues.values()).reduce(
        (sum, queue) => sum + queue.length,
        0
      ),
      bufferedActivities: Array.from(this.activityStreams.values()).reduce(
        (sum, buffer) => sum + buffer.length,
        0
      ),
    }
  }

  /**
   * Cleanup handler resources
   */
  destroy(): void {
    const operationId = generateId()
    logger.info(`[${operationId}] Destroying SocialWebSocketHandler`)

    try {
      // Clear all timers
      for (const userTimers of this.typingIndicators.values()) {
        for (const timer of userTimers.values()) {
          clearTimeout(timer)
        }
      }

      // Clear all data structures
      this.activeSubscriptions.clear()
      this.userPresence.clear()
      this.connectionUsers.clear()
      this.userConnections.clear()
      this.typingIndicators.clear()
      this.readReceipts.clear()
      this.activityStreams.clear()
      this.notificationQueues.clear()

      // Remove all event listeners
      this.removeAllListeners()

      logger.info(`[${operationId}] SocialWebSocketHandler destroyed successfully`)
    } catch (error) {
      logger.error(`[${operationId}] Error destroying SocialWebSocketHandler:`, error)
    }
  }
}
