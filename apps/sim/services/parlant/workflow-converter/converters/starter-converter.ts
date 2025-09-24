/**
 * Workflow to Journey Mapping System - Starter Node Converter
 *
 * Converts ReactFlow starter nodes into Parlant initial states.
 * Handles workflow entry points and initial conditions.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { BaseNodeConverter } from './base-converter'
import type {
  ReactFlowNode,
  ConversionContext,
  NodeConversionResult,
  ValidationResult,
  ParlantState,
  ParlantStateType
} from '../types'

const logger = createLogger('StarterConverter')

/**
 * Converter for starter/trigger nodes
 */
export class StarterNodeConverter extends BaseNodeConverter {
  constructor() {
    super('starter', ['starter', 'trigger', 'webhook', 'schedule'])
    logger.info('StarterNodeConverter initialized')
  }

  /**
   * Convert starter node to initial Parlant state
   */
  async convert(node: ReactFlowNode, context: ConversionContext): Promise<NodeConversionResult> {
    this.logConversion(node, 'Converting starter node')

    try {
      // Create the initial state
      const initialState = this.createInitialState(node, context)

      // Extract any variables for the journey
      const variables = this.extractVariables(node)

      // Add workflow-specific variables
      if (node.data?.input) {
        variables.push({
          name: 'start_input',
          type: 'json',
          description: 'Input variable passed to the workflow',
          defaultValue: node.data.input
        })
      }

      this.logConversion(node, 'Starter node converted successfully', {
        stateId: initialState.id,
        variableCount: variables.length
      })

      return {
        states: [initialState],
        transitions: [], // Initial states don't have incoming transitions
        variables: variables.length > 0 ? variables : undefined
      }

    } catch (error) {
      logger.error('Failed to convert starter node', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error)
      })

      // Add error to context
      context.errors.push(
        this.createConversionError(
          node,
          'STARTER_CONVERSION_ERROR',
          `Failed to convert starter node: ${error instanceof Error ? error.message : String(error)}`,
          'error',
          [
            'Check starter node configuration',
            'Verify trigger conditions',
            'Review input parameters'
          ]
        )
      )

      // Return minimal fallback state
      return {
        states: [this.createFallbackInitialState(node)],
        transitions: [],
        variables: undefined
      }
    }
  }

  /**
   * Validate starter node configuration
   */
  protected validateNodeSpecific(node: ReactFlowNode): ValidationResult {
    const errors = []
    const warnings = []

    // Validate trigger configuration
    if (node.data?.type === 'webhook') {
      if (!node.data?.webhook?.url && !node.data?.webhook?.path) {
        warnings.push(
          this.createConversionWarning(
            node,
            'MISSING_WEBHOOK_CONFIG',
            'Webhook node missing URL or path configuration',
            'medium',
            ['Add webhook URL or path', 'Configure webhook parameters']
          )
        )
      }
    }

    if (node.data?.type === 'schedule') {
      if (!node.data?.schedule?.cron && !node.data?.schedule?.interval) {
        warnings.push(
          this.createConversionWarning(
            node,
            'MISSING_SCHEDULE_CONFIG',
            'Schedule node missing cron or interval configuration',
            'medium',
            ['Add cron expression', 'Configure schedule interval']
          )
        )
      }
    }

    return { valid: true, errors, warnings }
  }

  /**
   * Get the primary state type for starter nodes
   */
  protected getPrimaryStateType(): ParlantStateType {
    return 'initial'
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private createInitialState(node: ReactFlowNode, context: ConversionContext): ParlantState {
    const nodeType = node.data?.type || 'starter'
    let content = 'Workflow started'
    const conditions: string[] = []

    // Customize content based on starter type
    switch (nodeType) {
      case 'webhook':
        content = 'Webhook triggered - processing request'
        conditions.push('Webhook request received')
        break
      case 'schedule':
        content = 'Scheduled execution triggered'
        conditions.push('Schedule time reached')
        break
      case 'trigger':
        content = 'Event trigger activated'
        conditions.push('Trigger event occurred')
        break
      default:
        content = 'Journey initiated'
        conditions.push('Journey started')
    }

    // Add custom conditions from node data
    const customConditions = this.extractConditions(node)
    conditions.push(...customConditions)

    return this.createBaseState(node, 'initial', {
      name: node.data?.name || 'Journey Start',
      description: this.generateDescription(node),
      content,
      conditions: conditions.length > 0 ? conditions : undefined,
      tools: this.extractTools(node)
    })
  }

  private createFallbackInitialState(node: ReactFlowNode): ParlantState {
    return this.createBaseState(node, 'initial', {
      name: 'Journey Start (Fallback)',
      description: 'Fallback initial state created due to conversion error',
      content: 'Journey started with fallback configuration',
      conditions: ['Journey started (fallback)']
    })
  }

  private generateDescription(node: ReactFlowNode): string {
    const nodeType = node.data?.type || 'starter'
    const baseName = node.data?.name || `${nodeType} trigger`

    let description = `Initial state for ${baseName}`

    // Add type-specific information
    switch (nodeType) {
      case 'webhook':
        if (node.data?.webhook?.path) {
          description += ` - Webhook endpoint: ${node.data.webhook.path}`
        }
        break
      case 'schedule':
        if (node.data?.schedule?.cron) {
          description += ` - Schedule: ${node.data.schedule.cron}`
        } else if (node.data?.schedule?.interval) {
          description += ` - Interval: ${node.data.schedule.interval}`
        }
        break
      default:
        if (node.data?.description) {
          description += ` - ${node.data.description}`
        }
    }

    return description
  }
}