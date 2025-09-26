/**
 * Governance Policies API Endpoint
 * ================================
 *
 * RESTful API for managing governance policies including CRUD operations,
 * policy evaluation, and compliance validation. Supports multi-tenant
 * policy management with enterprise-grade security and audit trails.
 *
 * Endpoints:
 * - GET /api/governance/policies - List policies for workspace
 * - POST /api/governance/policies - Create new policy
 * - PUT /api/governance/policies/:id - Update existing policy
 * - DELETE /api/governance/policies/:id - Delete policy
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { logAudit } from '@/services/parlant/compliance-reporting-service'
import {
  governanceComplianceService,
  initializeWorkspaceGovernance,
} from '@/services/parlant/governance-compliance-service'
import type {
  CreatePolicyRequest,
  GovernancePolicy,
  PolicyStatus,
  UpdatePolicyRequest,
} from '@/services/parlant/governance-compliance-types'

const logger = createLogger('GovernancePoliciesAPI')

/**
 * GET /api/governance/policies
 *
 * Retrieve governance policies for a workspace with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Extract query parameters
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspace_id')
    const status = url.searchParams.get('status') as PolicyStatus | null
    const category = url.searchParams.get('category')
    const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10)

    // Validate required parameters
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Get authentication context (simplified)
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: workspaceId,
      key_type: 'workspace' as const,
    }

    // Initialize governance if needed
    try {
      await initializeWorkspaceGovernance(workspaceId, auth)
    } catch (error) {
      logger.warn('Governance initialization warning', { error, workspaceId })
    }

    // Get policies
    const policies = await governanceComplianceService.getPolicies(workspaceId, auth)

    // Apply filters
    let filteredPolicies = policies

    if (status) {
      filteredPolicies = filteredPolicies.filter((p) => p.status === status)
    }

    if (category) {
      filteredPolicies = filteredPolicies.filter((p) => p.category === category)
    }

    // Apply pagination
    const totalCount = filteredPolicies.length
    const paginatedPolicies = filteredPolicies.slice(offset, offset + limit)

    // Log audit event
    await logAudit('data_access', 'policy', 'bulk', 'read', workspaceId, userId, {
      policies_count: paginatedPolicies.length,
      filters: { status, category },
    })

    const responseTime = performance.now() - startTime

    logger.info('Policies retrieved', {
      workspaceId,
      count: paginatedPolicies.length,
      totalCount,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      data: paginatedPolicies,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to retrieve policies', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve policies',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/governance/policies
 *
 * Create a new governance policy
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Parse request body
    const body = (await request.json()) as CreatePolicyRequest & { workspace_id: string }

    // Validate required fields
    if (!body.workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    if (!body.name || !body.description || !body.category || !body.rules) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['name', 'description', 'category', 'rules'],
        },
        { status: 400 }
      )
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: body.workspace_id,
      key_type: 'workspace' as const,
    }

    // Prepare policy data
    const policyData: Omit<GovernancePolicy, 'id' | 'created_at' | 'updated_at' | 'version'> = {
      workspace_id: body.workspace_id,
      name: body.name,
      description: body.description,
      category: body.category,
      type: body.type,
      status: 'draft', // New policies start as draft
      priority: body.priority,
      rules: body.rules.map((rule) => ({
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      })),
      enforcement_level: body.enforcement_level,
      applicable_agents: body.applicable_agents,
      applicable_users: body.applicable_users,
      effective_date: body.effective_date,
      expiry_date: body.expiry_date,
      created_by: userId,
      last_modified_by: userId,
      metadata: {
        created_via: 'api',
        user_agent: request.headers.get('user-agent')?.slice(0, 200),
      },
    }

    // Create policy
    const policy = await governanceComplianceService.createPolicy(policyData, auth)

    // Log audit event
    await logAudit(
      'configuration_change',
      'policy',
      policy.id,
      'create',
      body.workspace_id,
      userId,
      {
        policy_name: policy.name,
        category: policy.category,
        enforcement_level: policy.enforcement_level,
      }
    )

    const responseTime = performance.now() - startTime

    logger.info('Policy created', {
      policyId: policy.id,
      workspaceId: body.workspace_id,
      name: policy.name,
      responseTime,
    })

    return NextResponse.json(
      {
        success: true,
        data: policy,
        metadata: {
          responseTime: Math.round(responseTime),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to create policy', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create policy',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/governance/policies
 *
 * Update an existing governance policy
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Parse request body
    const body = (await request.json()) as UpdatePolicyRequest & {
      policy_id: string
      workspace_id: string
    }

    // Validate required fields
    if (!body.policy_id || !body.workspace_id) {
      return NextResponse.json(
        { error: 'policy_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: body.workspace_id,
      key_type: 'workspace' as const,
    }

    // Update policy
    const updatedPolicy = await governanceComplianceService.updatePolicy(body.policy_id, body, auth)

    // Log audit event
    await logAudit(
      'configuration_change',
      'policy',
      body.policy_id,
      'update',
      body.workspace_id,
      userId,
      {
        policy_name: updatedPolicy.name,
        version: updatedPolicy.version,
        changes: Object.keys(body).filter((key) => !['policy_id', 'workspace_id'].includes(key)),
      }
    )

    const responseTime = performance.now() - startTime

    logger.info('Policy updated', {
      policyId: body.policy_id,
      workspaceId: body.workspace_id,
      version: updatedPolicy.version,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      data: updatedPolicy,
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to update policy', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update policy',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/governance/policies
 *
 * Delete a governance policy (soft delete - mark as archived)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Extract query parameters
    const url = new URL(request.url)
    const policyId = url.searchParams.get('policy_id')
    const workspaceId = url.searchParams.get('workspace_id')

    // Validate required parameters
    if (!policyId || !workspaceId) {
      return NextResponse.json(
        { error: 'policy_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: workspaceId,
      key_type: 'workspace' as const,
    }

    // Soft delete by updating status to archived
    const updatedPolicy = await governanceComplianceService.updatePolicy(
      policyId,
      { status: 'archived' },
      auth
    )

    // Log audit event
    await logAudit('configuration_change', 'policy', policyId, 'delete', workspaceId, userId, {
      policy_name: updatedPolicy.name,
      deletion_type: 'soft_delete',
      archived_at: new Date().toISOString(),
    })

    const responseTime = performance.now() - startTime

    logger.info('Policy archived', {
      policyId,
      workspaceId,
      name: updatedPolicy.name,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      message: 'Policy archived successfully',
      data: {
        policy_id: policyId,
        status: updatedPolicy.status,
        archived_at: updatedPolicy.updated_at,
      },
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to archive policy', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to archive policy',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}
