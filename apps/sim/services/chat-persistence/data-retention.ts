import { and, eq, isNull, lte, gte, sql, inArray, or } from 'drizzle-orm'
import { db } from '@packages/db'
import {
  chatMessage,
  chatConversation,
  chatBrowserSession,
  chatSearchIndex,
  chatExportRequest,
} from '@packages/db/chat-persistence-schema'
import { parlantSession, parlantAgent } from '@packages/db/parlant-schema'
import { workspace, user } from '@packages/db/schema'

/**
 * Data Retention and Cleanup Service
 *
 * Manages chat data lifecycle, retention policies, and automated cleanup
 * to maintain optimal database performance and comply with data protection regulations.
 *
 * Key Features:
 * - Configurable retention policies per workspace
 * - Soft delete with recovery period
 * - Automated cleanup of expired data
 * - GDPR/CCPA compliance support
 * - Performance optimization through archival
 * - Audit trail maintenance
 */

export interface RetentionPolicy {
  workspaceId: string
  messageRetentionDays: number
  conversationRetentionDays: number
  sessionRetentionDays: number
  exportRetentionDays: number
  softDeleteRetentionDays: number
  enableAutoCleanup: boolean
  archiveBeforeDelete: boolean
  complianceMode: 'standard' | 'gdpr' | 'ccpa' | 'hipaa'
  customPolicies?: {
    messageTypes?: { [key: string]: number } // Different retention for different message types
    agentRetention?: { [key: string]: number } // Different retention per agent
    userRetention?: { [key: string]: number } // Different retention per user
  }
}

export interface CleanupStats {
  messagesProcessed: number
  messagesDeleted: number
  conversationsProcessed: number
  conversationsDeleted: number
  sessionsCleaned: number
  exportsExpired: number
  totalSpaceFreed: number // in bytes
  processingTime: number // in milliseconds
  errors: string[]
}

export interface RetentionReport {
  workspaceId: string
  policy: RetentionPolicy
  dataStats: {
    totalMessages: number
    totalConversations: number
    totalSessions: number
    expiredMessages: number
    expiredConversations: number
    scheduledForDeletion: number
    diskUsageBytes: number
  }
  nextCleanupAt: Date
  lastCleanupAt?: Date
  complianceStatus: 'compliant' | 'warning' | 'violation'
  recommendations: string[]
}

export class DataRetentionService {
  private static readonly DEFAULT_POLICY: RetentionPolicy = {
    workspaceId: '',
    messageRetentionDays: 365, // 1 year
    conversationRetentionDays: 730, // 2 years
    sessionRetentionDays: 90, // 3 months
    exportRetentionDays: 7, // 1 week
    softDeleteRetentionDays: 30, // 30-day recovery period
    enableAutoCleanup: true,
    archiveBeforeDelete: true,
    complianceMode: 'standard',
  }

  /**
   * Get retention policy for workspace
   */
  async getRetentionPolicy(workspaceId: string): Promise<RetentionPolicy> {
    try {
      // In production, this would be stored in a dedicated retention_policies table
      // For now, using default policy with workspace-specific overrides
      const policy = { ...DataRetentionService.DEFAULT_POLICY, workspaceId }

      // Check if workspace has custom retention settings (placeholder for future implementation)
      const workspaceSettings = await this.getWorkspaceRetentionSettings(workspaceId)
      if (workspaceSettings) {
        Object.assign(policy, workspaceSettings)
      }

      return policy
    } catch (error) {
      console.error(`Failed to get retention policy for workspace ${workspaceId}:`, error)
      return { ...DataRetentionService.DEFAULT_POLICY, workspaceId }
    }
  }

  /**
   * Set retention policy for workspace
   */
  async setRetentionPolicy(policy: RetentionPolicy): Promise<boolean> {
    try {
      // Validate policy
      this.validateRetentionPolicy(policy)

      // Store policy (in production, this would be in a dedicated table)
      await this.storeRetentionPolicy(policy)

      console.log(`Retention policy updated for workspace ${policy.workspaceId}`)
      return true
    } catch (error) {
      console.error(`Failed to set retention policy for workspace ${policy.workspaceId}:`, error)
      return false
    }
  }

  /**
   * Execute retention cleanup for workspace
   */
  async executeCleanup(workspaceId: string, dryRun: boolean = false): Promise<CleanupStats> {
    const startTime = Date.now()
    const stats: CleanupStats = {
      messagesProcessed: 0,
      messagesDeleted: 0,
      conversationsProcessed: 0,
      conversationsDeleted: 0,
      sessionsCleaned: 0,
      exportsExpired: 0,
      totalSpaceFreed: 0,
      processingTime: 0,
      errors: [],
    }

    try {
      const policy = await this.getRetentionPolicy(workspaceId)

      if (!policy.enableAutoCleanup && !dryRun) {
        throw new Error('Automatic cleanup is disabled for this workspace')
      }

      // 1. Clean up expired messages
      const messageStats = await this.cleanupExpiredMessages(workspaceId, policy, dryRun)
      stats.messagesProcessed = messageStats.processed
      stats.messagesDeleted = messageStats.deleted

      // 2. Clean up expired conversations
      const conversationStats = await this.cleanupExpiredConversations(workspaceId, policy, dryRun)
      stats.conversationsProcessed = conversationStats.processed
      stats.conversationsDeleted = conversationStats.deleted

      // 3. Clean up expired browser sessions
      const sessionStats = await this.cleanupExpiredSessions(workspaceId, policy, dryRun)
      stats.sessionsCleaned = sessionStats.cleaned

      // 4. Clean up expired export requests
      const exportStats = await this.cleanupExpiredExports(workspaceId, policy, dryRun)
      stats.exportsExpired = exportStats.expired

      // 5. Clean up soft-deleted items past recovery period
      const softDeleteStats = await this.cleanupSoftDeleted(workspaceId, policy, dryRun)

      // Calculate total space freed (approximation)
      stats.totalSpaceFreed = this.estimateSpaceFreed(stats)

      console.log(
        `Cleanup ${dryRun ? 'simulation' : 'execution'} completed for workspace ${workspaceId}:`,
        stats
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      stats.errors.push(errorMsg)
      console.error(`Cleanup failed for workspace ${workspaceId}:`, error)
    }

    stats.processingTime = Date.now() - startTime
    return stats
  }

  /**
   * Generate retention report for workspace
   */
  async generateRetentionReport(workspaceId: string): Promise<RetentionReport> {
    const policy = await this.getRetentionPolicy(workspaceId)

    // Gather data statistics
    const dataStats = await this.gatherDataStatistics(workspaceId, policy)

    // Calculate next cleanup time
    const nextCleanupAt = new Date()
    nextCleanupAt.setDate(nextCleanupAt.getDate() + 1) // Daily cleanup

    // Assess compliance status
    const complianceStatus = this.assessComplianceStatus(dataStats, policy)

    // Generate recommendations
    const recommendations = this.generateRecommendations(dataStats, policy)

    return {
      workspaceId,
      policy,
      dataStats,
      nextCleanupAt,
      complianceStatus,
      recommendations,
    }
  }

  /**
   * Execute emergency data purge (GDPR Right to Erasure)
   */
  async executeEmergencyPurge(params: {
    workspaceId: string
    userId?: string
    conversationIds?: string[]
    sessionIds?: string[]
    reason: string
    requestedBy: string
  }): Promise<CleanupStats> {
    const startTime = Date.now()
    const stats: CleanupStats = {
      messagesProcessed: 0,
      messagesDeleted: 0,
      conversationsProcessed: 0,
      conversationsDeleted: 0,
      sessionsCleaned: 0,
      exportsExpired: 0,
      totalSpaceFreed: 0,
      processingTime: 0,
      errors: [],
    }

    try {
      // Log emergency purge request for audit trail
      console.log('Emergency data purge initiated:', {
        workspaceId: params.workspaceId,
        userId: params.userId,
        reason: params.reason,
        requestedBy: params.requestedBy,
        timestamp: new Date().toISOString(),
      })

      if (params.userId) {
        // Purge all user data
        await this.purgeUserData(params.workspaceId, params.userId, stats)
      }

      if (params.conversationIds?.length) {
        // Purge specific conversations
        await this.purgeConversations(params.conversationIds, stats)
      }

      if (params.sessionIds?.length) {
        // Purge specific sessions
        await this.purgeSessions(params.sessionIds, stats)
      }

      // Clean up related search indexes
      await this.cleanupSearchIndexes(params.workspaceId)

      console.log('Emergency purge completed:', stats)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      stats.errors.push(errorMsg)
      console.error('Emergency purge failed:', error)
    }

    stats.processingTime = Date.now() - startTime
    return stats
  }

  /**
   * Archive old data before deletion
   */
  async archiveData(workspaceId: string, beforeDate: Date): Promise<boolean> {
    try {
      // This would typically export to external storage (S3, etc.)
      // For now, we'll just mark items as archived

      await db
        .update(chatMessage)
        .set({ metadata: sql`${chatMessage.metadata} || '{"archived": true}'::jsonb` })
        .where(
          and(
            eq(chatMessage.workspaceId, workspaceId),
            lte(chatMessage.createdAt, beforeDate),
            isNull(chatMessage.deletedAt)
          )
        )

      console.log(`Data archived for workspace ${workspaceId} before ${beforeDate.toISOString()}`)
      return true
    } catch (error) {
      console.error('Failed to archive data:', error)
      return false
    }
  }

  /**
   * Restore soft-deleted data within recovery period
   */
  async restoreSoftDeleted(params: {
    workspaceId: string
    messageIds?: string[]
    conversationIds?: string[]
    beforeDate?: Date
  }): Promise<number> {
    let restoredCount = 0

    try {
      if (params.messageIds?.length) {
        const result = await db
          .update(chatMessage)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(
            and(
              eq(chatMessage.workspaceId, params.workspaceId),
              inArray(chatMessage.id, params.messageIds)
            )
          )
        restoredCount += result.rowCount || 0
      }

      if (params.conversationIds?.length) {
        const result = await db
          .update(chatConversation)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(
            and(
              eq(chatConversation.workspaceId, params.workspaceId),
              inArray(chatConversation.id, params.conversationIds)
            )
          )
        restoredCount += result.rowCount || 0
      }

      if (params.beforeDate) {
        const messageResult = await db
          .update(chatMessage)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(
            and(
              eq(chatMessage.workspaceId, params.workspaceId),
              lte(chatMessage.deletedAt, params.beforeDate)
            )
          )
        restoredCount += messageResult.rowCount || 0

        const conversationResult = await db
          .update(chatConversation)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(
            and(
              eq(chatConversation.workspaceId, params.workspaceId),
              lte(chatConversation.deletedAt, params.beforeDate)
            )
          )
        restoredCount += conversationResult.rowCount || 0
      }

      console.log(`Restored ${restoredCount} items for workspace ${params.workspaceId}`)
    } catch (error) {
      console.error('Failed to restore soft-deleted data:', error)
    }

    return restoredCount
  }

  // Private helper methods

  private async cleanupExpiredMessages(
    workspaceId: string,
    policy: RetentionPolicy,
    dryRun: boolean
  ): Promise<{ processed: number; deleted: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.messageRetentionDays)

    const expiredMessages = await db
      .select({ id: chatMessage.id, createdAt: chatMessage.createdAt })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.workspaceId, workspaceId),
          lte(chatMessage.createdAt, cutoffDate),
          isNull(chatMessage.deletedAt)
        )
      )

    if (dryRun) {
      return { processed: expiredMessages.length, deleted: 0 }
    }

    let deleted = 0
    if (expiredMessages.length > 0) {
      const messageIds = expiredMessages.map(m => m.id)

      if (policy.archiveBeforeDelete) {
        await this.archiveData(workspaceId, cutoffDate)
      }

      // Soft delete messages
      const result = await db
        .update(chatMessage)
        .set({ deletedAt: new Date() })
        .where(inArray(chatMessage.id, messageIds))

      deleted = result.rowCount || 0
    }

    return { processed: expiredMessages.length, deleted }
  }

  private async cleanupExpiredConversations(
    workspaceId: string,
    policy: RetentionPolicy,
    dryRun: boolean
  ): Promise<{ processed: number; deleted: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.conversationRetentionDays)

    const expiredConversations = await db
      .select({ id: chatConversation.id })
      .from(chatConversation)
      .where(
        and(
          eq(chatConversation.workspaceId, workspaceId),
          lte(chatConversation.createdAt, cutoffDate),
          isNull(chatConversation.deletedAt)
        )
      )

    if (dryRun) {
      return { processed: expiredConversations.length, deleted: 0 }
    }

    let deleted = 0
    if (expiredConversations.length > 0) {
      const conversationIds = expiredConversations.map(c => c.id)

      // Soft delete conversations
      const result = await db
        .update(chatConversation)
        .set({ deletedAt: new Date(), isActive: false })
        .where(inArray(chatConversation.id, conversationIds))

      deleted = result.rowCount || 0
    }

    return { processed: expiredConversations.length, deleted }
  }

  private async cleanupExpiredSessions(
    workspaceId: string,
    policy: RetentionPolicy,
    dryRun: boolean
  ): Promise<{ cleaned: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.sessionRetentionDays)

    const expiredSessions = await db
      .select({ id: chatBrowserSession.id })
      .from(chatBrowserSession)
      .where(
        and(
          eq(chatBrowserSession.workspaceId, workspaceId),
          or(
            lte(chatBrowserSession.expiresAt, new Date()),
            lte(chatBrowserSession.createdAt, cutoffDate)
          )
        )
      )

    if (dryRun) {
      return { cleaned: expiredSessions.length }
    }

    let cleaned = 0
    if (expiredSessions.length > 0) {
      const sessionIds = expiredSessions.map(s => s.id)

      const result = await db
        .delete(chatBrowserSession)
        .where(inArray(chatBrowserSession.id, sessionIds))

      cleaned = result.rowCount || 0
    }

    return { cleaned }
  }

  private async cleanupExpiredExports(
    workspaceId: string,
    policy: RetentionPolicy,
    dryRun: boolean
  ): Promise<{ expired: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.exportRetentionDays)

    const expiredExports = await db
      .select({ id: chatExportRequest.id })
      .from(chatExportRequest)
      .where(
        and(
          eq(chatExportRequest.workspaceId, workspaceId),
          lte(chatExportRequest.expiresAt, new Date())
        )
      )

    if (dryRun) {
      return { expired: expiredExports.length }
    }

    let expired = 0
    if (expiredExports.length > 0) {
      const exportIds = expiredExports.map(e => e.id)

      const result = await db
        .delete(chatExportRequest)
        .where(inArray(chatExportRequest.id, exportIds))

      expired = result.rowCount || 0
    }

    return { expired }
  }

  private async cleanupSoftDeleted(
    workspaceId: string,
    policy: RetentionPolicy,
    dryRun: boolean
  ): Promise<{ permanentlyDeleted: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.softDeleteRetentionDays)

    if (dryRun) {
      // Just count soft-deleted items past recovery period
      const [{ count: messageCount }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(chatMessage)
        .where(
          and(
            eq(chatMessage.workspaceId, workspaceId),
            lte(chatMessage.deletedAt, cutoffDate)
          )
        )

      return { permanentlyDeleted: messageCount }
    }

    // Permanently delete soft-deleted items past recovery period
    const messageResult = await db
      .delete(chatMessage)
      .where(
        and(
          eq(chatMessage.workspaceId, workspaceId),
          lte(chatMessage.deletedAt, cutoffDate)
        )
      )

    const conversationResult = await db
      .delete(chatConversation)
      .where(
        and(
          eq(chatConversation.workspaceId, workspaceId),
          lte(chatConversation.deletedAt, cutoffDate)
        )
      )

    return {
      permanentlyDeleted: (messageResult.rowCount || 0) + (conversationResult.rowCount || 0),
    }
  }

  private async purgeUserData(
    workspaceId: string,
    userId: string,
    stats: CleanupStats
  ): Promise<void> {
    // Permanently delete all user messages
    const messageResult = await db
      .delete(chatMessage)
      .where(
        and(
          eq(chatMessage.workspaceId, workspaceId),
          eq(chatMessage.senderId, userId)
        )
      )
    stats.messagesDeleted += messageResult.rowCount || 0

    // Delete user's conversations
    const conversationResult = await db
      .delete(chatConversation)
      .where(
        and(
          eq(chatConversation.workspaceId, workspaceId),
          eq(chatConversation.createdBy, userId)
        )
      )
    stats.conversationsDeleted += conversationResult.rowCount || 0

    // Delete user's browser sessions
    const sessionResult = await db
      .delete(chatBrowserSession)
      .where(
        and(
          eq(chatBrowserSession.workspaceId, workspaceId),
          eq(chatBrowserSession.userId, userId)
        )
      )
    stats.sessionsCleaned += sessionResult.rowCount || 0
  }

  private async purgeConversations(
    conversationIds: string[],
    stats: CleanupStats
  ): Promise<void> {
    // Delete messages in conversations
    const messageResult = await db
      .delete(chatMessage)
      .where(
        sql`${chatMessage.sessionId} IN (
          SELECT session_id FROM ${chatConversation}
          WHERE id = ANY(${conversationIds})
        )`
      )
    stats.messagesDeleted += messageResult.rowCount || 0

    // Delete conversations
    const conversationResult = await db
      .delete(chatConversation)
      .where(inArray(chatConversation.id, conversationIds))
    stats.conversationsDeleted += conversationResult.rowCount || 0
  }

  private async purgeSessions(sessionIds: string[], stats: CleanupStats): Promise<void> {
    // Delete messages in sessions
    const messageResult = await db
      .delete(chatMessage)
      .where(inArray(chatMessage.sessionId, sessionIds))
    stats.messagesDeleted += messageResult.rowCount || 0

    // Delete browser sessions associated with these Parlant sessions
    const browserSessionResult = await db
      .delete(chatBrowserSession)
      .where(inArray(chatBrowserSession.parlantSessionId, sessionIds))
    stats.sessionsCleaned += browserSessionResult.rowCount || 0
  }

  private async cleanupSearchIndexes(workspaceId: string): Promise<void> {
    // Clean up orphaned search indexes
    await db
      .delete(chatSearchIndex)
      .where(
        and(
          eq(chatSearchIndex.workspaceId, workspaceId),
          sql`NOT EXISTS (
            SELECT 1 FROM ${chatMessage}
            WHERE ${chatMessage.id} = ${chatSearchIndex.messageId}
          )`
        )
      )
  }

  private async gatherDataStatistics(
    workspaceId: string,
    policy: RetentionPolicy
  ): Promise<RetentionReport['dataStats']> {
    const messageCutoff = new Date()
    messageCutoff.setDate(messageCutoff.getDate() - policy.messageRetentionDays)

    const conversationCutoff = new Date()
    conversationCutoff.setDate(conversationCutoff.getDate() - policy.conversationRetentionDays)

    const [messageStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        expired: sql<number>`COUNT(*) FILTER (WHERE ${chatMessage.createdAt} <= ${messageCutoff})`,
        softDeleted: sql<number>`COUNT(*) FILTER (WHERE ${chatMessage.deletedAt} IS NOT NULL)`,
      })
      .from(chatMessage)
      .where(eq(chatMessage.workspaceId, workspaceId))

    const [conversationStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        expired: sql<number>`COUNT(*) FILTER (WHERE ${chatConversation.createdAt} <= ${conversationCutoff})`,
      })
      .from(chatConversation)
      .where(eq(chatConversation.workspaceId, workspaceId))

    const [sessionStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
      })
      .from(chatBrowserSession)
      .where(eq(chatBrowserSession.workspaceId, workspaceId))

    return {
      totalMessages: messageStats.total,
      totalConversations: conversationStats.total,
      totalSessions: sessionStats.total,
      expiredMessages: messageStats.expired,
      expiredConversations: conversationStats.expired,
      scheduledForDeletion: messageStats.softDeleted,
      diskUsageBytes: this.estimateDiskUsage(messageStats.total, conversationStats.total),
    }
  }

  private assessComplianceStatus(
    stats: RetentionReport['dataStats'],
    policy: RetentionPolicy
  ): RetentionReport['complianceStatus'] {
    const expiredRatio = stats.expiredMessages / Math.max(stats.totalMessages, 1)

    if (expiredRatio > 0.1) {
      return 'violation' // More than 10% of data is expired
    } else if (expiredRatio > 0.05) {
      return 'warning' // More than 5% of data is expired
    } else {
      return 'compliant'
    }
  }

  private generateRecommendations(
    stats: RetentionReport['dataStats'],
    policy: RetentionPolicy
  ): string[] {
    const recommendations: string[] = []

    if (stats.expiredMessages > 1000) {
      recommendations.push('Consider running cleanup to remove expired messages')
    }

    if (stats.scheduledForDeletion > 500) {
      recommendations.push('Review soft-deleted items - some may be permanently deleted soon')
    }

    if (stats.diskUsageBytes > 1024 * 1024 * 1024) {
      // > 1GB
      recommendations.push('Consider archiving old data to reduce storage costs')
    }

    if (!policy.enableAutoCleanup) {
      recommendations.push('Enable automatic cleanup to maintain optimal performance')
    }

    return recommendations
  }

  private estimateSpaceFreed(stats: CleanupStats): number {
    // Rough estimate: 1KB per message, 0.5KB per conversation
    return stats.messagesDeleted * 1024 + stats.conversationsDeleted * 512
  }

  private estimateDiskUsage(messageCount: number, conversationCount: number): number {
    // Rough estimate: 1KB per message, 0.5KB per conversation
    return messageCount * 1024 + conversationCount * 512
  }

  private validateRetentionPolicy(policy: RetentionPolicy): void {
    if (policy.messageRetentionDays < 1) {
      throw new Error('Message retention must be at least 1 day')
    }
    if (policy.softDeleteRetentionDays < 1) {
      throw new Error('Soft delete retention must be at least 1 day')
    }
    if (policy.softDeleteRetentionDays > policy.messageRetentionDays) {
      throw new Error('Soft delete retention cannot be longer than message retention')
    }
  }

  private async getWorkspaceRetentionSettings(workspaceId: string): Promise<Partial<RetentionPolicy> | null> {
    // Placeholder - would query workspace-specific settings from database
    return null
  }

  private async storeRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    // Placeholder - would store policy in dedicated table
    console.log('Storing retention policy:', policy)
  }
}

export default DataRetentionService