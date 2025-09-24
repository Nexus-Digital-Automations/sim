/**
 * ToolAnalyticsService - Tool usage analytics and performance monitoring
 *
 * Tracks tool usage patterns, performance metrics, success rates, and provides
 * insights for tool optimization and recommendation systems.
 */

import { and, asc, avg, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/packages/db'
import { toolRegistry, toolUsageAnalytics } from '@/packages/db/schema'
import type { IToolAnalyticsService, ToolAnalytics, ToolUsageAnalyticsInsert } from './types'

const logger = createLogger('ToolAnalyticsService')

/**
 * Service for tracking and analyzing tool usage patterns and performance
 */
export class ToolAnalyticsService implements IToolAnalyticsService {
  /**
   * Record a tool usage event
   */
  async recordUsage(usage: ToolUsageAnalyticsInsert): Promise<void> {
    logger.debug('Recording tool usage', {
      toolId: usage.toolId,
      executionId: usage.executionId,
      success: usage.success,
    })

    try {
      // Record the usage event
      await db.insert(toolUsageAnalytics).values({
        id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...usage,
      })

      // Update tool registry statistics
      await this.updateToolStatistics(usage.toolId)

      logger.debug('Tool usage recorded successfully', { toolId: usage.toolId })
    } catch (error) {
      logger.error('Failed to record tool usage', { usage, error })
      throw error
    }
  }

  /**
   * Get comprehensive analytics for a specific tool
   */
  async getToolAnalytics(
    toolId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ToolAnalytics> {
    try {
      // Build time range filter
      const timeConditions = []
      if (timeRange) {
        timeConditions.push(
          gte(toolUsageAnalytics.startTime, timeRange.start),
          lte(toolUsageAnalytics.startTime, timeRange.end)
        )
      }

      const conditions = [eq(toolUsageAnalytics.toolId, toolId), ...timeConditions]

      // Get basic usage statistics
      const [basicStats] = await db
        .select({
          totalUsage: count(toolUsageAnalytics.id),
          successCount: sum(sql`CASE WHEN ${toolUsageAnalytics.success} THEN 1 ELSE 0 END`),
          avgDuration: avg(toolUsageAnalytics.durationMs),
          lastUsed: sql`MAX(${toolUsageAnalytics.startTime})`,
        })
        .from(toolUsageAnalytics)
        .where(and(...conditions))

      const totalUsage = Number(basicStats?.totalUsage || 0)
      const successCount = Number(basicStats?.successCount || 0)
      const avgDuration = Number(basicStats?.avgDuration || 0)
      const lastUsed = basicStats?.lastUsed as Date | null

      // Calculate derived metrics
      const successRate = totalUsage > 0 ? successCount / totalUsage : 0
      const errorRate = totalUsage > 0 ? (totalUsage - successCount) / totalUsage : 0

      // Get popularity score (relative to other tools)
      const popularityScore = await this.calculatePopularityScore(toolId, totalUsage)

      // Get user ratings (if available)
      const { userRating, reviewCount } = await this.getUserRatings(toolId)

      return {
        usageCount: totalUsage,
        successRate,
        avgExecutionTimeMs: avgDuration,
        lastUsed: lastUsed || undefined,
        errorRate,
        popularityScore,
        userRating,
        reviewCount,
      }
    } catch (error) {
      logger.error('Failed to get tool analytics', { toolId, error })
      // Return default analytics on error
      return {
        usageCount: 0,
        successRate: 0,
        avgExecutionTimeMs: 0,
        errorRate: 0,
        popularityScore: 0,
        reviewCount: 0,
      }
    }
  }

  /**
   * Get analytics for all tools in a workspace
   */
  async getWorkspaceAnalytics(
    workspaceId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<Record<string, ToolAnalytics>> {
    try {
      // Build time range filter
      const timeConditions = []
      if (timeRange) {
        timeConditions.push(
          gte(toolUsageAnalytics.startTime, timeRange.start),
          lte(toolUsageAnalytics.startTime, timeRange.end)
        )
      }

      const conditions = [eq(toolUsageAnalytics.workspaceId, workspaceId), ...timeConditions]

      // Get usage stats grouped by tool
      const workspaceStats = await db
        .select({
          toolId: toolUsageAnalytics.toolId,
          totalUsage: count(toolUsageAnalytics.id),
          successCount: sum(sql`CASE WHEN ${toolUsageAnalytics.success} THEN 1 ELSE 0 END`),
          avgDuration: avg(toolUsageAnalytics.durationMs),
          lastUsed: sql`MAX(${toolUsageAnalytics.startTime})`,
        })
        .from(toolUsageAnalytics)
        .where(and(...conditions))
        .groupBy(toolUsageAnalytics.toolId)

      // Convert to analytics format
      const analytics: Record<string, ToolAnalytics> = {}

      for (const stat of workspaceStats) {
        const totalUsage = Number(stat.totalUsage)
        const successCount = Number(stat.successCount)
        const successRate = totalUsage > 0 ? successCount / totalUsage : 0
        const errorRate = totalUsage > 0 ? (totalUsage - successCount) / totalUsage : 0
        const popularityScore = await this.calculatePopularityScore(stat.toolId, totalUsage)
        const { userRating, reviewCount } = await this.getUserRatings(stat.toolId)

        analytics[stat.toolId] = {
          usageCount: totalUsage,
          successRate,
          avgExecutionTimeMs: Number(stat.avgDuration || 0),
          lastUsed: stat.lastUsed as Date | undefined,
          errorRate,
          popularityScore,
          userRating,
          reviewCount,
        }
      }

      return analytics
    } catch (error) {
      logger.error('Failed to get workspace analytics', { workspaceId, error })
      return {}
    }
  }

  /**
   * Get analytics for a specific user
   */
  async getUserAnalytics(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<Record<string, ToolAnalytics>> {
    try {
      // Build time range filter
      const timeConditions = []
      if (timeRange) {
        timeConditions.push(
          gte(toolUsageAnalytics.startTime, timeRange.start),
          lte(toolUsageAnalytics.startTime, timeRange.end)
        )
      }

      const conditions = [eq(toolUsageAnalytics.userId, userId), ...timeConditions]

      // Get usage stats grouped by tool
      const userStats = await db
        .select({
          toolId: toolUsageAnalytics.toolId,
          totalUsage: count(toolUsageAnalytics.id),
          successCount: sum(sql`CASE WHEN ${toolUsageAnalytics.success} THEN 1 ELSE 0 END`),
          avgDuration: avg(toolUsageAnalytics.durationMs),
          lastUsed: sql`MAX(${toolUsageAnalytics.startTime})`,
        })
        .from(toolUsageAnalytics)
        .where(and(...conditions))
        .groupBy(toolUsageAnalytics.toolId)

      // Convert to analytics format
      const analytics: Record<string, ToolAnalytics> = {}

      for (const stat of userStats) {
        const totalUsage = Number(stat.totalUsage)
        const successCount = Number(stat.successCount)
        const successRate = totalUsage > 0 ? successCount / totalUsage : 0
        const errorRate = totalUsage > 0 ? (totalUsage - successCount) / totalUsage : 0
        const popularityScore = await this.calculatePopularityScore(stat.toolId, totalUsage)

        analytics[stat.toolId] = {
          usageCount: totalUsage,
          successRate,
          avgExecutionTimeMs: Number(stat.avgDuration || 0),
          lastUsed: stat.lastUsed as Date | undefined,
          errorRate,
          popularityScore,
          userRating: undefined, // User-specific ratings could be added
          reviewCount: 0,
        }
      }

      return analytics
    } catch (error) {
      logger.error('Failed to get user analytics', { userId, error })
      return {}
    }
  }

  /**
   * Get popularity trends over time
   */
  async getPopularityTrends(timeRange?: {
    start: Date
    end: Date
  }): Promise<Array<{ toolId: string; trend: number }>> {
    try {
      const now = new Date()
      const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

      const start = timeRange?.start || defaultStart
      const end = timeRange?.end || now
      const midpoint = new Date((start.getTime() + end.getTime()) / 2)

      // Get usage counts for first half and second half of the period
      const firstHalfUsage = await db
        .select({
          toolId: toolUsageAnalytics.toolId,
          count: count(toolUsageAnalytics.id),
        })
        .from(toolUsageAnalytics)
        .where(
          and(gte(toolUsageAnalytics.startTime, start), lte(toolUsageAnalytics.startTime, midpoint))
        )
        .groupBy(toolUsageAnalytics.toolId)

      const secondHalfUsage = await db
        .select({
          toolId: toolUsageAnalytics.toolId,
          count: count(toolUsageAnalytics.id),
        })
        .from(toolUsageAnalytics)
        .where(
          and(gte(toolUsageAnalytics.startTime, midpoint), lte(toolUsageAnalytics.startTime, end))
        )
        .groupBy(toolUsageAnalytics.toolId)

      // Calculate trends
      const trends: Array<{ toolId: string; trend: number }> = []
      const toolIds = new Set([
        ...firstHalfUsage.map((u) => u.toolId),
        ...secondHalfUsage.map((u) => u.toolId),
      ])

      for (const toolId of toolIds) {
        const firstHalf = firstHalfUsage.find((u) => u.toolId === toolId)?.count || 0
        const secondHalf = secondHalfUsage.find((u) => u.toolId === toolId)?.count || 0

        const firstHalfCount = Number(firstHalf)
        const secondHalfCount = Number(secondHalf)

        // Calculate trend: positive = growing, negative = declining
        let trend = 0
        if (firstHalfCount > 0) {
          trend = (secondHalfCount - firstHalfCount) / firstHalfCount
        } else if (secondHalfCount > 0) {
          trend = 1 // 100% growth from zero
        }

        trends.push({ toolId, trend })
      }

      return trends.sort((a, b) => b.trend - a.trend)
    } catch (error) {
      logger.error('Failed to get popularity trends', { timeRange, error })
      return []
    }
  }

  /**
   * Get error analysis for tools
   */
  async getErrorAnalysis(
    toolId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<Array<{ errorType: string; count: number; percentage: number }>> {
    try {
      const conditions = [eq(toolUsageAnalytics.success, false)]

      if (toolId) {
        conditions.push(eq(toolUsageAnalytics.toolId, toolId))
      }

      if (timeRange) {
        conditions.push(
          gte(toolUsageAnalytics.startTime, timeRange.start),
          lte(toolUsageAnalytics.startTime, timeRange.end)
        )
      }

      // Get error counts by type
      const errorStats = await db
        .select({
          errorType: toolUsageAnalytics.errorType,
          count: count(toolUsageAnalytics.id),
        })
        .from(toolUsageAnalytics)
        .where(and(...conditions))
        .groupBy(toolUsageAnalytics.errorType)
        .orderBy(desc(count(toolUsageAnalytics.id)))

      // Calculate percentages
      const totalErrors = errorStats.reduce((sum, stat) => sum + Number(stat.count), 0)

      return errorStats.map((stat) => ({
        errorType: stat.errorType || 'unknown',
        count: Number(stat.count),
        percentage: totalErrors > 0 ? (Number(stat.count) / totalErrors) * 100 : 0,
      }))
    } catch (error) {
      logger.error('Failed to get error analysis', { toolId, timeRange, error })
      return []
    }
  }

  /**
   * Get performance metrics for tools
   */
  async getPerformanceMetrics(
    toolId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    avgExecutionTime: number
    p95ExecutionTime: number
    avgCpuUsage: number
    avgMemoryUsage: number
    networkCallsAvg: number
  }> {
    try {
      const conditions = [eq(toolUsageAnalytics.success, true)]

      if (toolId) {
        conditions.push(eq(toolUsageAnalytics.toolId, toolId))
      }

      if (timeRange) {
        conditions.push(
          gte(toolUsageAnalytics.startTime, timeRange.start),
          lte(toolUsageAnalytics.startTime, timeRange.end)
        )
      }

      // Get performance metrics
      const [metrics] = await db
        .select({
          avgExecutionTime: avg(toolUsageAnalytics.durationMs),
          avgCpuUsage: avg(toolUsageAnalytics.cpuUsage),
          avgMemoryUsage: avg(toolUsageAnalytics.memoryUsage),
          networkCallsAvg: avg(toolUsageAnalytics.networkCalls),
        })
        .from(toolUsageAnalytics)
        .where(and(...conditions))

      // Calculate P95 execution time separately (simplified)
      const executionTimes = await db
        .select({ duration: toolUsageAnalytics.durationMs })
        .from(toolUsageAnalytics)
        .where(and(...conditions))
        .orderBy(asc(toolUsageAnalytics.durationMs))

      const p95Index = Math.floor(executionTimes.length * 0.95)
      const p95ExecutionTime = executionTimes[p95Index]?.duration || 0

      return {
        avgExecutionTime: Number(metrics?.avgExecutionTime || 0),
        p95ExecutionTime: Number(p95ExecutionTime),
        avgCpuUsage: Number(metrics?.avgCpuUsage || 0),
        avgMemoryUsage: Number(metrics?.avgMemoryUsage || 0),
        networkCallsAvg: Number(metrics?.networkCallsAvg || 0),
      }
    } catch (error) {
      logger.error('Failed to get performance metrics', { toolId, timeRange, error })
      return {
        avgExecutionTime: 0,
        p95ExecutionTime: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        networkCallsAvg: 0,
      }
    }
  }

  // Private helper methods

  /**
   * Update tool statistics in the registry
   */
  private async updateToolStatistics(toolId: string): Promise<void> {
    try {
      // Get latest analytics
      const analytics = await this.getToolAnalytics(toolId)

      // Update tool registry with latest stats
      await db
        .update(toolRegistry)
        .set({
          usageCount: analytics.usageCount,
          successRate: analytics.successRate.toString(),
          avgExecutionTimeMs: Math.round(analytics.avgExecutionTimeMs),
          lastUsed: analytics.lastUsed || null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(toolRegistry.id, toolId))
    } catch (error) {
      logger.error('Failed to update tool statistics', { toolId, error })
    }
  }

  /**
   * Calculate relative popularity score for a tool
   */
  private async calculatePopularityScore(toolId: string, usageCount: number): Promise<number> {
    try {
      // Get average usage across all tools
      const [avgUsage] = await db
        .select({
          avgUsage: avg(toolRegistry.usageCount),
        })
        .from(toolRegistry)

      const averageUsage = Number(avgUsage?.avgUsage || 0)

      if (averageUsage === 0) {
        return 0
      }

      // Normalize score between 0 and 1
      const rawScore = usageCount / averageUsage
      return Math.min(rawScore / 2, 1) // Cap at 1, scale down for more reasonable scores
    } catch (error) {
      logger.error('Failed to calculate popularity score', { toolId, error })
      return 0
    }
  }

  /**
   * Get user ratings for a tool (placeholder implementation)
   */
  private async getUserRatings(
    toolId: string
  ): Promise<{ userRating?: number; reviewCount: number }> {
    // This would typically come from a separate ratings/reviews system
    // For now, return default values
    return {
      userRating: undefined,
      reviewCount: 0,
    }
  }
}
