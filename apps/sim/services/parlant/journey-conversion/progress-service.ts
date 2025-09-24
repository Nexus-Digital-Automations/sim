/**
 * Progress Tracking Service
 * =========================
 *
 * Real-time progress tracking for workflow-to-journey conversions.
 * Supports WebSocket notifications and progress persistence.
 */

import { and, eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { generateId } from '@/lib/utils'
import { db } from '@/db'
import { parlantConversionHistory } from '@/db/parlant-schema'
import type { ConversionError, ConversionProgress } from './types'

const logger = createLogger('ProgressService')

export class ProgressService {
  private progressCache = new Map<string, ConversionProgress>()
  private readonly progressExpiry = 60 * 60 * 1000 // 1 hour

  /**
   * Initialize progress tracking for a conversion
   */
  async initializeProgress(
    conversionId: string,
    initialProgress: Partial<ConversionProgress>
  ): Promise<void> {
    try {
      const progress: ConversionProgress = {
        conversion_id: conversionId,
        status: 'queued',
        progress_percentage: 0,
        current_step: 'Initializing',
        blocks_processed: 0,
        total_blocks: 0,
        estimated_completion_ms: null,
        error: undefined,
        ...initialProgress,
      }

      // Store in memory cache
      this.progressCache.set(conversionId, progress)

      // Store in database for persistence
      await db.insert(parlantConversionHistory).values({
        id: generateId('history'),
        conversionId,
        workflowId: '', // Will be updated later
        templateId: null,
        workspaceId: initialProgress.workspace_id || '',
        userId: null,
        agentId: null,
        parameters: {},
        status: progress.status,
        metadata: {
          progress_percentage: progress.progress_percentage,
          current_step: progress.current_step,
          blocks_processed: progress.blocks_processed,
          total_blocks: progress.total_blocks,
          estimated_completion_ms: progress.estimated_completion_ms,
        },
        createdAt: new Date(),
      })

      logger.debug('Progress tracking initialized', { conversionId })
    } catch (error) {
      logger.error('Failed to initialize progress', { error: error.message, conversionId })
      throw error
    }
  }

  /**
   * Update conversion progress
   */
  async updateProgress(
    conversionId: string,
    progressUpdate: Partial<ConversionProgress>
  ): Promise<void> {
    try {
      const currentProgress = this.progressCache.get(conversionId)
      if (!currentProgress) {
        logger.warn('Progress not found in cache, skipping update', { conversionId })
        return
      }

      // Merge updates
      const updatedProgress = {
        ...currentProgress,
        ...progressUpdate,
      }

      // Store in memory cache
      this.progressCache.set(conversionId, updatedProgress)

      // Update database record
      const updateData: any = {
        status: updatedProgress.status,
        metadata: {
          progress_percentage: updatedProgress.progress_percentage,
          current_step: updatedProgress.current_step,
          blocks_processed: updatedProgress.blocks_processed,
          total_blocks: updatedProgress.total_blocks,
          estimated_completion_ms: updatedProgress.estimated_completion_ms,
        },
      }

      // Set completion timestamp for completed/failed status
      if (updatedProgress.status === 'completed') {
        updateData.completedAt = new Date()
      } else if (updatedProgress.status === 'processing' && !currentProgress.startedAt) {
        updateData.startedAt = new Date()
      }

      // Add error details if present
      if (progressUpdate.error) {
        updateData.errorDetails = {
          message: progressUpdate.error.message,
          type: progressUpdate.error.type,
          code: progressUpdate.error.code,
          details: progressUpdate.error.details,
        }
      }

      await db
        .update(parlantConversionHistory)
        .set(updateData)
        .where(eq(parlantConversionHistory.conversionId, conversionId))

      logger.debug('Progress updated', {
        conversionId,
        status: updatedProgress.status,
        progress: updatedProgress.progress_percentage,
      })
    } catch (error) {
      logger.error('Failed to update progress', { error: error.message, conversionId })
    }
  }

  /**
   * Get current progress for a conversion
   */
  async getProgress(conversionId: string): Promise<ConversionProgress> {
    try {
      // Check memory cache first
      const cachedProgress = this.progressCache.get(conversionId)
      if (cachedProgress) {
        return cachedProgress
      }

      // Check database
      const historyRecord = await db.query.parlantConversionHistory.findFirst({
        where: eq(parlantConversionHistory.conversionId, conversionId),
      })

      if (historyRecord) {
        const metadata = historyRecord.metadata as any
        const progress: ConversionProgress = {
          conversion_id: conversionId,
          status: historyRecord.status as ConversionProgress['status'],
          progress_percentage: metadata?.progress_percentage || 0,
          current_step: metadata?.current_step || 'Unknown',
          blocks_processed: metadata?.blocks_processed || 0,
          total_blocks: metadata?.total_blocks || 0,
          estimated_completion_ms: metadata?.estimated_completion_ms || null,
          error: historyRecord.errorDetails
            ? this.parseErrorDetails(historyRecord.errorDetails)
            : undefined,
        }

        // Cache for future requests
        this.progressCache.set(conversionId, progress)

        return progress
      }

      // Return default progress if not found
      return {
        conversion_id: conversionId,
        status: 'queued',
        progress_percentage: 0,
        current_step: 'Not found',
        blocks_processed: 0,
        total_blocks: 0,
      }
    } catch (error) {
      logger.error('Failed to get progress', { error: error.message, conversionId })

      return {
        conversion_id: conversionId,
        status: 'failed',
        progress_percentage: 0,
        current_step: 'Error retrieving progress',
        blocks_processed: 0,
        total_blocks: 0,
        error: {
          type: 'system',
          code: 'PROGRESS_RETRIEVAL_FAILED',
          message: error.message,
        } as ConversionError,
      }
    }
  }

  /**
   * Mark conversion as completed
   */
  async markCompleted(
    conversionId: string,
    result?: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.updateProgress(conversionId, {
        status: 'completed',
        progress_percentage: 100,
        current_step: 'Conversion completed successfully',
      })

      // Update final result in database
      await db
        .update(parlantConversionHistory)
        .set({
          status: 'completed',
          result: result || null,
          metadata: metadata || {},
          completedAt: new Date(),
        })
        .where(eq(parlantConversionHistory.conversionId, conversionId))

      logger.info('Conversion marked as completed', { conversionId })
    } catch (error) {
      logger.error('Failed to mark conversion as completed', { error: error.message, conversionId })
    }
  }

  /**
   * Mark conversion as failed
   */
  async markFailed(conversionId: string, error: ConversionError): Promise<void> {
    try {
      await this.updateProgress(conversionId, {
        status: 'failed',
        current_step: 'Conversion failed',
        error,
      })

      logger.info('Conversion marked as failed', { conversionId, errorType: error.type })
    } catch (updateError) {
      logger.error('Failed to mark conversion as failed', {
        error: updateError.message,
        conversionId,
        originalError: error.message,
      })
    }
  }

  /**
   * Clean up old progress entries
   */
  async cleanup(): Promise<void> {
    try {
      const cutoffTime = Date.now() - this.progressExpiry
      let cleanedCount = 0

      // Clean memory cache
      for (const [conversionId, progress] of this.progressCache.entries()) {
        // Remove entries older than expiry time
        // Note: This is a simple heuristic, could be improved with actual timestamps
        if (progress.status === 'completed' || progress.status === 'failed') {
          this.progressCache.delete(conversionId)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        logger.debug('Progress cache cleaned up', { cleanedCount })
      }
    } catch (error) {
      logger.error('Progress cleanup failed', { error: error.message })
    }
  }

  /**
   * Get all active conversions for a workspace
   */
  async getActiveConversions(workspaceId: string): Promise<ConversionProgress[]> {
    try {
      const activeRecords = await db.query.parlantConversionHistory.findMany({
        where: and(
          eq(parlantConversionHistory.workspaceId, workspaceId),
          eq(parlantConversionHistory.status, 'processing')
        ),
      })

      const activeProgress = await Promise.all(
        activeRecords.map((record) => this.getProgress(record.conversionId))
      )

      return activeProgress
    } catch (error) {
      logger.error('Failed to get active conversions', { error: error.message, workspaceId })
      return []
    }
  }

  // Private helper methods

  private parseErrorDetails(errorDetails: any): ConversionError | undefined {
    if (!errorDetails || typeof errorDetails !== 'object') {
      return undefined
    }

    try {
      const error = new Error(errorDetails.message) as ConversionError
      error.type = errorDetails.type || 'system'
      error.code = errorDetails.code || 'UNKNOWN_ERROR'
      error.details = errorDetails.details
      return error
    } catch {
      return undefined
    }
  }
}

// Start cleanup interval
const progressCleanupInterval = setInterval(
  async () => {
    await progressService.cleanup()
  },
  10 * 60 * 1000
) // Run every 10 minutes

// Cleanup on process exit
process.on('SIGTERM', () => {
  clearInterval(progressCleanupInterval)
})

process.on('SIGINT', () => {
  clearInterval(progressCleanupInterval)
})

// Export singleton instance
export const progressService = new ProgressService()
