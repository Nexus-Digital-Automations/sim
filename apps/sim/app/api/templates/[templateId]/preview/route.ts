/**
 * Template Preview API Endpoint
 *
 * Provides detailed template preview data including blocks, variables,
 * conflict analysis, and application statistics.
 */

import type { NextRequest } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { TemplateIntegrationService } from '@/lib/templates/workflow-integration'

const logger = createLogger('TemplatePreviewAPI')

interface TemplatePreviewRequest {
  workflowId?: string
  includeConflicts?: boolean
  includeVariables?: boolean
}

export async function POST(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { templateId } = params
    const body: TemplatePreviewRequest = await request.json()

    logger.info('Generating template preview', {
      templateId,
      workflowId: body.workflowId,
      includeConflicts: body.includeConflicts,
      includeVariables: body.includeVariables,
    })

    // Fetch template data
    const templateResponse = await fetch(`${request.nextUrl.origin}/api/templates/${templateId}`, {
      headers: { Authorization: request.headers.get('Authorization') || '' },
    })

    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch template: ${templateResponse.statusText}`)
    }

    const template = await templateResponse.json()
    const templateData = template.data || template

    // Get workflow state if workflowId is provided
    let workflowState = { blocks: {}, edges: [] }
    if (body.workflowId) {
      try {
        const workflowResponse = await fetch(
          `${request.nextUrl.origin}/api/workflows/${body.workflowId}`,
          {
            headers: { Authorization: request.headers.get('Authorization') || '' },
          }
        )

        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json()
          workflowState = workflowData.state || workflowState
        }
      } catch (error) {
        logger.warn('Failed to fetch workflow state for preview', {
          error,
          workflowId: body.workflowId,
        })
      }
    }

    const templateState = templateData.state || {}
    const blocks = templateState.blocks || {}
    const edges = templateState.edges || []

    // Extract template variables
    const variables: any[] = []
    if (body.includeVariables) {
      // Extract variables from template metadata or analyze template content
      if (templateData.variables) {
        variables.push(...templateData.variables)
      } else {
        // Auto-detect variables from template blocks
        const variablePattern = /\{\{(\w+)\}\}/g
        const foundVariables = new Set<string>()

        const searchForVariables = (obj: any) => {
          if (typeof obj === 'string') {
            let match
            while ((match = variablePattern.exec(obj)) !== null) {
              foundVariables.add(match[1])
            }
          } else if (Array.isArray(obj)) {
            obj.forEach(searchForVariables)
          } else if (obj && typeof obj === 'object') {
            Object.values(obj).forEach(searchForVariables)
          }
        }

        searchForVariables(blocks)

        foundVariables.forEach((varName) => {
          variables.push({
            key: varName,
            name: varName.charAt(0).toUpperCase() + varName.slice(1).replace(/([A-Z])/g, ' $1'),
            type: 'string',
            description: `Variable: ${varName}`,
            defaultValue: '',
            required: false,
            placeholder: `Enter ${varName}`,
          })
        })
      }
    }

    // Analyze conflicts if requested
    let conflicts: any[] = []
    if (body.includeConflicts && body.workflowId) {
      try {
        const conflictAnalysis = await TemplateIntegrationService.analyzeConflicts(
          templateData,
          workflowState
        )
        conflicts = conflictAnalysis.conflicts.map((conflict) => ({
          type: conflict.type,
          description: conflict.description,
          resolution: conflict.suggestedResolution,
        }))
      } catch (error) {
        logger.warn('Failed to analyze conflicts', { error })
      }
    }

    // Calculate statistics
    const blockCount = Object.keys(blocks).length
    const connectionCount = edges.length

    let complexity: 'simple' | 'moderate' | 'complex' = 'simple'
    if (blockCount > 15 || connectionCount > 20) {
      complexity = 'complex'
    } else if (blockCount > 5 || connectionCount > 10) {
      complexity = 'moderate'
    }

    const baseTime = Math.max(2, blockCount * 0.5)
    const variableTime = variables.length * 1
    const conflictTime = conflicts.length * 2
    const totalMinutes = Math.ceil(baseTime + variableTime + conflictTime)

    const estimatedSetupTime =
      totalMinutes < 60
        ? `${totalMinutes} min`
        : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`

    const previewData = {
      blocks: Object.values(blocks).map((block: any) => ({
        id: block.id,
        type: block.type,
        name: block.name || `${block.type} Block`,
        position: block.position || { x: 0, y: 0 },
      })),
      edges: edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      variables,
      conflicts,
      statistics: {
        blockCount,
        connectionCount,
        complexity,
        estimatedSetupTime,
      },
    }

    logger.info('Template preview generated successfully', {
      templateId,
      blockCount,
      variableCount: variables.length,
      conflictCount: conflicts.length,
    })

    return Response.json(previewData)
  } catch (error) {
    logger.error('Template preview generation failed', {
      error,
      templateId: params.templateId,
    })

    return Response.json({ error: 'Failed to generate template preview' }, { status: 500 })
  }
}
