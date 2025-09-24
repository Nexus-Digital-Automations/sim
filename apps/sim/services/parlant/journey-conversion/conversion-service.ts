/**
 * Journey Conversion Service
 * =========================
 *
 * Main service for managing workflow-to-journey conversions,
 * real-time progress tracking, and caching.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { WorkflowToJourneyConverter } from './conversion-engine'
import { templateService } from './template-service'
import { cacheService } from './cache-service'
import { progressService } from './progress-service'
import { agentService, sessionService } from '@/services/parlant'
import { generateId } from '@/lib/utils'
import {
  type ConversionService as IConversionService,
  type ConversionConfig,
  type ConversionContext,
  type ConversionProgress,
  type ConversionSubscription,
  type JourneyConversionResult,
  type JourneyCreateFromTemplateRequest,
  type JourneyCreateFromWorkflowRequest,
  type CacheStats,
  type ConversionError,
} from './types'

const logger = createLogger('ConversionService')

export class ConversionService implements IConversionService {
  private defaultConfig: ConversionConfig = {
    preserve_block_names: true,
    generate_descriptions: true,
    enable_parameter_substitution: true,
    include_error_handling: true,
    optimization_level: 'standard',
    cache_duration_ms: 30 * 60 * 1000, // 30 minutes
  }

  private subscriptions = new Map<string, Set<ConversionSubscription>>()

  /**
   * Convert workflow to journey with full context
   */
  async convertWorkflowToJourney(context: ConversionContext): Promise<JourneyConversionResult> {
    const startTime = Date.now()
    const conversionId = generateId('conversion')

    logger.info('Starting workflow to journey conversion', {
      conversionId,
      workflowId: context.workflow_id,
      workspaceId: context.workspace_id,
    })

    try {
      // Initialize progress tracking
      await progressService.initializeProgress(conversionId, {
        conversion_id: conversionId,
        workspace_id: context.workspace_id,
        user_id: context.user_id,
        status: 'queued',
        progress_percentage: 0,
        current_step: 'Initializing conversion',
        blocks_processed: 0,
        total_blocks: 0,
      })

      this.notifyProgress(conversionId, { status: 'queued', progress_percentage: 5 })

      // Check cache first
      const cacheKey = cacheService.generateCacheKey(
        context.workflow_id,
        context.template_version,
        context.parameters
      )

      const cachedResult = await cacheService.get(cacheKey, context.workspace_id)
      if (cachedResult) {
        logger.info('Cache hit for conversion', { conversionId, cacheKey })

        await progressService.updateProgress(conversionId, {
          status: 'completed',
          progress_percentage: 100,
          current_step: 'Conversion completed (cached)',
        })

        this.notifyProgress(conversionId, { status: 'completed', progress_percentage: 100 })
        return cachedResult
      }

      this.notifyProgress(conversionId, { status: 'processing', progress_percentage: 10 })

      // Create converter with merged configuration
      const config = { ...this.defaultConfig, ...context.config }
      const converter = new WorkflowToJourneyConverter(config)

      // Update progress
      await progressService.updateProgress(conversionId, {
        status: 'processing',
        progress_percentage: 20,
        current_step: 'Analyzing workflow structure',
      })

      this.notifyProgress(conversionId, { status: 'processing', progress_percentage: 20 })

      // Perform conversion
      const result = await converter.convertWorkflowToJourney({
        ...context,
        config,
      })

      // Cache the result
      await cacheService.set(cacheKey, result, context.workspace_id, config.cache_duration_ms)

      // Update progress to completion
      await progressService.updateProgress(conversionId, {
        status: 'completed',
        progress_percentage: 100,
        current_step: 'Conversion completed successfully',
        blocks_processed: result.metadata.blocks_converted,
        total_blocks: result.metadata.blocks_converted,
      })

      this.notifyProgress(conversionId, {
        status: 'completed',
        progress_percentage: 100,
        blocks_processed: result.metadata.blocks_converted,
        total_blocks: result.metadata.blocks_converted,
      })

      logger.info('Conversion completed successfully', {
        conversionId,
        duration: Date.now() - startTime,
        stepsCreated: result.steps.length,
      })

      return result

    } catch (error) {
      logger.error('Conversion failed', {
        conversionId,
        error: error.message,
        context: { workflowId: context.workflow_id, workspaceId: context.workspace_id },
      })

      // Update progress with error
      await progressService.updateProgress(conversionId, {
        status: 'failed',
        current_step: 'Conversion failed',
        error_details: {
          message: error.message,
          stack: error.stack,
          code: error.code || 'UNKNOWN_ERROR',
        },
      })

      this.notifyProgress(conversionId, {
        status: 'failed',
        error: error as ConversionError,
      })

      throw error
    }
  }

  /**
   * Convert template to journey with parameter substitution
   */
  async convertTemplateToJourney(request: JourneyCreateFromTemplateRequest): Promise<JourneyConversionResult> {
    const startTime = Date.now()
    logger.info('Converting template to journey', {
      templateId: request.template_id,
      agentId: request.agent_id,
      parametersCount: Object.keys(request.parameters).length,
    })

    try {
      // Get template
      const template = await templateService.getTemplate(request.template_id, request.workspace_id)

      // Validate parameters
      const validation = await templateService.validateParameters(request.template_id, request.parameters)
      if (!validation.valid) {
        throw this.createError('parameter', 'PARAMETER_VALIDATION_FAILED',
          `Invalid parameters: ${validation.errors.map(e => e.message).join(', ')}`,
          { validation }
        )
      }

      // Create conversion context
      const context: ConversionContext = {
        workflow_id: template.workflow_data.id || template.workflow_id,
        workspace_id: request.workspace_id,
        user_id: request.workspace_id, // TODO: Get actual user ID
        parameters: request.parameters,
        config: { ...this.defaultConfig, ...request.config },
        template_version: template.version,
      }

      // Convert workflow to journey
      const conversionResult = await this.convertWorkflowToJourney(context)

      // Create journey in Parlant
      const journey = await this.createJourneyInParlant(
        conversionResult,
        request.agent_id,
        request.journey_name || conversionResult.journey.title,
        request.journey_description || conversionResult.journey.description
      )

      // Update template usage stats
      await templateService.updateUsageStats(
        request.template_id,
        true,
        Date.now() - startTime
      )

      logger.info('Template conversion completed successfully', {
        templateId: request.template_id,
        journeyId: journey.id,
        duration: Date.now() - startTime,
      })

      return {
        ...conversionResult,
        journey: journey,
      }

    } catch (error) {
      logger.error('Template conversion failed', { error: error.message, request })

      // Update template usage stats (failure)
      try {
        await templateService.updateUsageStats(request.template_id, false, Date.now() - startTime)
      } catch (statsError) {
        logger.warn('Failed to update template usage stats', { error: statsError.message })
      }

      throw error
    }
  }

  /**
   * Convert workflow directly to journey (no template)
   */
  async convertWorkflowDirectlyToJourney(request: JourneyCreateFromWorkflowRequest): Promise<JourneyConversionResult> {
    logger.info('Converting workflow directly to journey', {
      workflowId: request.workflow_id,
      agentId: request.agent_id,
    })

    // Create conversion context
    const context: ConversionContext = {
      workflow_id: request.workflow_id,
      workspace_id: request.workspace_id,
      user_id: request.workspace_id, // TODO: Get actual user ID
      parameters: request.parameters || {},
      config: { ...this.defaultConfig, ...request.config },
    }

    // Convert workflow to journey
    const conversionResult = await this.convertWorkflowToJourney(context)

    // Create journey in Parlant
    const journey = await this.createJourneyInParlant(
      conversionResult,
      request.agent_id,
      request.journey_name || conversionResult.journey.title,
      request.journey_description || conversionResult.journey.description
    )

    return {
      ...conversionResult,
      journey: journey,
    }
  }

  /**
   * Get conversion progress
   */
  async getConversionProgress(conversionId: string): Promise<ConversionProgress> {
    return progressService.getProgress(conversionId)
  }

  /**
   * Subscribe to conversion progress updates
   */
  subscribeToConversion(subscription: ConversionSubscription): void {
    logger.info('Subscribing to conversion progress', {
      conversionId: subscription.conversion_id,
      userId: subscription.user_id,
      workspaceId: subscription.workspace_id,
    })

    if (!this.subscriptions.has(subscription.conversion_id)) {
      this.subscriptions.set(subscription.conversion_id, new Set())
    }

    this.subscriptions.get(subscription.conversion_id)!.add(subscription)

    // Send current progress immediately
    this.getConversionProgress(subscription.conversion_id)
      .then(progress => {
        subscription.callback(progress)
      })
      .catch(error => {
        logger.warn('Failed to get initial progress for subscription', { error: error.message })
      })
  }

  /**
   * Unsubscribe from conversion progress updates
   */
  unsubscribeFromConversion(conversionId: string, userId: string): void {
    logger.info('Unsubscribing from conversion progress', { conversionId, userId })

    const subscriptions = this.subscriptions.get(conversionId)
    if (subscriptions) {
      for (const sub of subscriptions) {
        if (sub.user_id === userId) {
          subscriptions.delete(sub)
        }
      }

      if (subscriptions.size === 0) {
        this.subscriptions.delete(conversionId)
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(workspaceId: string): Promise<CacheStats> {
    return cacheService.getStats(workspaceId)
  }

  /**
   * Clear conversion cache
   */
  async clearCache(workspaceId: string, templateId?: string): Promise<void> {
    logger.info('Clearing conversion cache', { workspaceId, templateId })
    await cacheService.clear(workspaceId, templateId)
  }

  // Private helper methods

  /**
   * Create journey in Parlant system
   */
  private async createJourneyInParlant(
    conversionResult: JourneyConversionResult,
    agentId: string,
    journeyName: string,
    journeyDescription?: string
  ) {
    // TODO: Implement journey creation in Parlant
    // This would use the Parlant API to create the actual journey
    logger.info('Creating journey in Parlant', {
      agentId,
      journeyName,
      stepsCount: conversionResult.steps.length,
    })

    // For now, return the converted journey with updated metadata
    return {
      ...conversionResult.journey,
      id: generateId('journey'),
      agent_id: agentId,
      title: journeyName,
      description: journeyDescription || conversionResult.journey.description,
    }
  }

  /**
   * Notify all subscribers of conversion progress
   */
  private notifyProgress(conversionId: string, progressUpdate: Partial<ConversionProgress>): void {
    const subscriptions = this.subscriptions.get(conversionId)
    if (subscriptions && subscriptions.size > 0) {
      logger.debug('Notifying progress subscribers', {
        conversionId,
        subscriberCount: subscriptions.size,
        progressUpdate,
      })

      for (const subscription of subscriptions) {
        try {
          // Get current progress and merge with update
          this.getConversionProgress(conversionId)
            .then(currentProgress => {
              const updatedProgress = { ...currentProgress, ...progressUpdate }
              subscription.callback(updatedProgress)
            })
            .catch(error => {
              logger.warn('Failed to notify subscriber', {
                conversionId,
                userId: subscription.user_id,
                error: error.message,
              })
            })
        } catch (error) {
          logger.warn('Failed to notify subscriber', {
            conversionId,
            userId: subscription.user_id,
            error: error.message,
          })
        }
      }
    }
  }

  /**
   * Create a conversion error
   */
  private createError(
    type: ConversionError['type'],
    code: string,
    message: string,
    details?: Record<string, any>
  ): ConversionError {
    const error = new Error(message) as ConversionError
    error.name = 'ConversionError'
    error.type = type
    error.code = code
    error.details = details
    return error
  }
}

// Export singleton instance
export const conversionService = new ConversionService()