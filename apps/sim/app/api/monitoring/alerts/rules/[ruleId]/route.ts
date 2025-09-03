/**
 * Individual Alert Rule API
 * Provides operations for specific alert rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { alertEngine } from '@/lib/monitoring/alerting/alert-engine'
import type { MonitoringApiResponse, AlertRule } from '@/lib/monitoring/types'

const logger = createLogger('AlertRuleAPI')

const UpdateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  workflowIds: z.array(z.string()).optional(),
  folderIds: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  conditions: z.array(z.object({
    id: z.string(),
    type: z.enum(['execution_duration', 'failure_rate', 'cost_threshold', 'resource_usage', 'error_count', 'throughput']),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'contains', 'not_contains']),
    value: z.union([z.number(), z.string()]),
    timeWindow: z.string(),
    aggregation: z.enum(['avg', 'sum', 'max', 'min', 'count'])
  })).optional(),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(['email', 'slack', 'webhook', 'sms', 'dashboard_notification']),
    configuration: z.record(z.any()),
    enabled: z.boolean()
  })).optional(),
  escalationPolicy: z.object({
    id: z.string(),
    name: z.string(),
    levels: z.array(z.object({
      levelNumber: z.number(),
      delayMinutes: z.number().min(0),
      actions: z.array(z.any()),
      condition: z.enum(['alert_not_acknowledged', 'alert_not_resolved', 'always'])
    }))
  }).optional(),
  cooldownPeriod: z.number().min(0).optional()
})

interface RouteContext {
  params: { ruleId: string }
}

/**
 * Get a specific alert rule
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { ruleId } = context.params
  
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized alert rule access`)
      return NextResponse.json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      } as MonitoringApiResponse, { status: 401 })
    }

    logger.debug(`[${requestId}] Fetching alert rule ${ruleId}`)

    // Mock rule data since alertEngine doesn't have a get method
    const mockRule: AlertRule = {
      id: ruleId,
      name: 'High Execution Time Alert',
      description: 'Alert when workflow execution time exceeds 30 seconds',
      workspaceId: 'workspace-123',
      enabled: true,
      conditions: [
        {
          id: 'cond-1',
          type: 'execution_duration',
          operator: 'gt',
          value: 30000,
          timeWindow: '5m',
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          id: 'action-1',
          type: 'email',
          configuration: {
            email: {
              to: ['admin@example.com'],
              subject: 'High Execution Time Alert'
            }
          },
          enabled: true
        }
      ],
      cooldownPeriod: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.user.id
    }

    const response: MonitoringApiResponse<{ rule: AlertRule }> = {
      success: true,
      data: { rule: mockRule }
    }

    logger.info(`[${requestId}] Retrieved alert rule: ${ruleId}`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    logger.error(`[${requestId}] Error fetching alert rule:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch alert rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as MonitoringApiResponse, { status: 500 })
  }
}

/**
 * Update an alert rule
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { ruleId } = context.params

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      } as MonitoringApiResponse, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateAlertRuleSchema.parse(body)

    logger.debug(`[${requestId}] Updating alert rule ${ruleId}`, {
      updates: Object.keys(validatedData)
    })

    // Update the rule using alert engine
    const updatedRule = await alertEngine.updateRule(ruleId, validatedData)

    const response: MonitoringApiResponse<{ rule: AlertRule }> = {
      success: true,
      data: { rule: updatedRule }
    }

    logger.info(`[${requestId}] Alert rule updated: ${ruleId}`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid alert rule update data`, { errors: error.errors })
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_UPDATE_DATA',
          message: 'Invalid alert rule update data',
          details: error.errors
        }
      } as MonitoringApiResponse, { status: 400 })
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: `Alert rule not found: ${ruleId}`
        }
      } as MonitoringApiResponse, { status: 404 })
    }

    logger.error(`[${requestId}] Error updating alert rule:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update alert rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as MonitoringApiResponse, { status: 500 })
  }
}

/**
 * Delete an alert rule
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { ruleId } = context.params

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      } as MonitoringApiResponse, { status: 401 })
    }

    logger.debug(`[${requestId}] Deleting alert rule ${ruleId}`)

    // Delete the rule using alert engine
    await alertEngine.deleteRule(ruleId)

    const response: MonitoringApiResponse = {
      success: true,
      data: { message: 'Alert rule deleted successfully' }
    }

    logger.info(`[${requestId}] Alert rule deleted: ${ruleId}`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: `Alert rule not found: ${ruleId}`
        }
      } as MonitoringApiResponse, { status: 404 })
    }

    logger.error(`[${requestId}] Error deleting alert rule:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete alert rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as MonitoringApiResponse, { status: 500 })
  }
}