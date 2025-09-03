/**
 * Alert Rules API
 * Provides CRUD operations for alert rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { alertEngine } from '@/lib/monitoring/alerting/alert-engine'
import type { MonitoringApiResponse, AlertRule } from '@/lib/monitoring/types'

const logger = createLogger('AlertRulesAPI')

const CreateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  workspaceId: z.string(),
  workflowIds: z.array(z.string()).optional(),
  folderIds: z.array(z.string()).optional(),
  enabled: z.boolean().optional().default(true),
  conditions: z.array(z.object({
    id: z.string(),
    type: z.enum(['execution_duration', 'failure_rate', 'cost_threshold', 'resource_usage', 'error_count', 'throughput']),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'contains', 'not_contains']),
    value: z.union([z.number(), z.string()]),
    timeWindow: z.string(),
    aggregation: z.enum(['avg', 'sum', 'max', 'min', 'count'])
  })).min(1),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(['email', 'slack', 'webhook', 'sms', 'dashboard_notification']),
    configuration: z.record(z.any()),
    enabled: z.boolean()
  })).min(1),
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
  cooldownPeriod: z.number().min(0).optional().default(15)
})

const UpdateAlertRuleSchema = CreateAlertRuleSchema.partial()

const QuerySchema = z.object({
  workspaceId: z.string(),
  enabled: z.coerce.boolean().optional(),
  workflowIds: z.string().optional(), // Comma-separated
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0)
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized alert rules access`)
      return NextResponse.json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      } as MonitoringApiResponse, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = QuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.debug(`[${requestId}] Fetching alert rules`, {
      workspaceId: params.workspaceId,
      enabled: params.enabled,
      limit: params.limit
    })

    // For now, return mock alert rules since alertEngine doesn't have a list method
    // In a real implementation, this would query from a database
    const mockRules: AlertRule[] = [
      {
        id: 'rule-1',
        name: 'High Execution Time Alert',
        description: 'Alert when workflow execution time exceeds 30 seconds',
        workspaceId: params.workspaceId,
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
    ]

    // Apply filters
    let filteredRules = mockRules

    if (params.enabled !== undefined) {
      filteredRules = filteredRules.filter(rule => rule.enabled === params.enabled)
    }

    if (params.workflowIds) {
      const workflowIdList = params.workflowIds.split(',').map(id => id.trim())
      filteredRules = filteredRules.filter(rule => 
        !rule.workflowIds || rule.workflowIds.some(id => workflowIdList.includes(id))
      )
    }

    // Apply pagination
    const total = filteredRules.length
    const paginatedRules = filteredRules.slice(params.offset, params.offset + params.limit)

    const response: MonitoringApiResponse<{ rules: AlertRule[] }> = {
      success: true,
      data: { rules: paginatedRules },
      pagination: {
        page: Math.floor(params.offset / params.limit) + 1,
        pageSize: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    }

    logger.info(`[${requestId}] Retrieved ${paginatedRules.length} alert rules`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request parameters`, { errors: error.errors })
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid request parameters',
          details: error.errors
        }
      } as MonitoringApiResponse, { status: 400 })
    }

    logger.error(`[${requestId}] Error fetching alert rules:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch alert rules',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as MonitoringApiResponse, { status: 500 })
  }
}

/**
 * Create a new alert rule
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      } as MonitoringApiResponse, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateAlertRuleSchema.parse(body)

    logger.debug(`[${requestId}] Creating alert rule`, {
      name: validatedData.name,
      workspaceId: validatedData.workspaceId,
      conditionsCount: validatedData.conditions.length,
      actionsCount: validatedData.actions.length
    })

    // Create the rule using alert engine
    const rule = await alertEngine.createRule({
      ...validatedData,
      createdBy: session.user.id
    })

    const response: MonitoringApiResponse<{ rule: AlertRule }> = {
      success: true,
      data: { rule }
    }

    logger.info(`[${requestId}] Alert rule created: ${rule.id}`)

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid alert rule data`, { errors: error.errors })
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_RULE_DATA',
          message: 'Invalid alert rule data',
          details: error.errors
        }
      } as MonitoringApiResponse, { status: 400 })
    }

    logger.error(`[${requestId}] Error creating alert rule:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'CREATION_ERROR',
        message: 'Failed to create alert rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as MonitoringApiResponse, { status: 500 })
  }
}