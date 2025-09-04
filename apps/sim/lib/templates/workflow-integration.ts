/**
 * Template-Workflow Integration Service
 *
 * Handles the complex process of integrating templates into existing workflows,
 * including conflict resolution, variable substitution, and position optimization.
 *
 * Features:
 * - Smart conflict detection and resolution
 * - Variable substitution and validation
 * - Position optimization and auto-layout
 * - Undo/redo support for template operations
 * - Real-time validation and error handling
 *
 * Based on research specifications from template library system design.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { Template } from '@/lib/templates/types'
import type { WorkflowState } from '@/stores/workflows/workflow/types'

const logger = createLogger('WorkflowIntegration')

/**
 * Template application configuration
 */
interface TemplateApplicationOptions {
  variables: Record<string, any>
  conflicts: Array<{ type: string; resolution: string }>
  mode: 'merge' | 'replace' | 'insert'
  position?: { x: number; y: number }
  preserveExisting?: boolean
  autoConnect?: boolean
  generateUniqueIds?: boolean
}

/**
 * Result of template application
 */
interface TemplateApplicationResult {
  success: boolean
  error?: string
  appliedBlocks: string[]
  appliedEdges: string[]
  conflicts: Array<{
    type: string
    description: string
    resolution: string
    affectedItems: string[]
  }>
  undoData?: {
    operation: string
    previousState: Partial<WorkflowState>
    appliedChanges: any[]
  }
  statistics: {
    blocksAdded: number
    edgesAdded: number
    conflictsResolved: number
    processingTime: number
  }
}

/**
 * Conflict detection result
 */
interface ConflictAnalysis {
  conflicts: Array<{
    type: 'name_conflict' | 'position_conflict' | 'dependency_conflict' | 'id_conflict'
    description: string
    severity: 'low' | 'medium' | 'high'
    affectedItems: string[]
    suggestedResolution: string
    autoResolvable: boolean
  }>
  canAutoResolve: boolean
  requiresUserInput: boolean
}

/**
 * Template Integration Service
 */
export class TemplateIntegrationService {
  /**
   * Analyze potential conflicts between template and existing workflow
   */
  static async analyzeConflicts(
    template: Template,
    workflowState: WorkflowState,
    options: Partial<TemplateApplicationOptions> = {}
  ): Promise<ConflictAnalysis> {
    const startTime = Date.now()

    try {
      logger.info('Analyzing conflicts for template integration', {
        templateId: template.id,
        templateName: template.name,
        workflowBlockCount: Object.keys(workflowState.blocks).length,
        mode: options.mode || 'merge',
      })

      const conflicts: ConflictAnalysis['conflicts'] = []
      const templateState = template.state as WorkflowState

      if (!templateState?.blocks) {
        return {
          conflicts: [],
          canAutoResolve: true,
          requiresUserInput: false,
        }
      }

      // Check for ID conflicts
      Object.keys(templateState.blocks).forEach((blockId) => {
        if (workflowState.blocks[blockId]) {
          conflicts.push({
            type: 'id_conflict',
            description: `Block ID "${blockId}" already exists in workflow`,
            severity: 'high',
            affectedItems: [blockId],
            suggestedResolution: 'generate_new_id',
            autoResolvable: true,
          })
        }
      })

      // Check for name conflicts
      const existingNames = new Set(Object.values(workflowState.blocks).map((block) => block.name))
      Object.values(templateState.blocks).forEach((templateBlock) => {
        if (existingNames.has(templateBlock.name)) {
          conflicts.push({
            type: 'name_conflict',
            description: `Block name "${templateBlock.name}" already exists in workflow`,
            severity: 'medium',
            affectedItems: [templateBlock.id],
            suggestedResolution: 'append_suffix',
            autoResolvable: true,
          })
        }
      })

      // Check for position conflicts (blocks too close together)
      if (options.mode !== 'replace') {
        const positionTolerance = 100 // pixels
        Object.values(templateState.blocks).forEach((templateBlock) => {
          const templatePos = templateBlock.position
          Object.values(workflowState.blocks).forEach((existingBlock) => {
            const existingPos = existingBlock.position
            const distance = Math.sqrt(
              (templatePos.x - existingPos.x) ** 2 + (templatePos.y - existingPos.y) ** 2
            )

            if (distance < positionTolerance) {
              conflicts.push({
                type: 'position_conflict',
                description: `Block "${templateBlock.name}" position conflicts with existing block "${existingBlock.name}"`,
                severity: 'low',
                affectedItems: [templateBlock.id, existingBlock.id],
                suggestedResolution: 'auto_reposition',
                autoResolvable: true,
              })
            }
          })
        })
      }

      // Check for dependency conflicts
      if (templateState.edges) {
        templateState.edges.forEach((edge) => {
          const sourceExists = templateState.blocks[edge.source]
          const targetExists = templateState.blocks[edge.target]

          if (!sourceExists || !targetExists) {
            conflicts.push({
              type: 'dependency_conflict',
              description: `Edge references missing block (${edge.source} -> ${edge.target})`,
              severity: 'high',
              affectedItems: [edge.id],
              suggestedResolution: 'skip_invalid_edges',
              autoResolvable: true,
            })
          }
        })
      }

      const canAutoResolve = conflicts.every((conflict) => conflict.autoResolvable)
      const requiresUserInput = conflicts.some(
        (conflict) => conflict.severity === 'high' && !conflict.autoResolvable
      )

      logger.info('Conflict analysis completed', {
        templateId: template.id,
        conflictCount: conflicts.length,
        canAutoResolve,
        requiresUserInput,
        processingTime: Date.now() - startTime,
      })

      return {
        conflicts,
        canAutoResolve,
        requiresUserInput,
      }
    } catch (error) {
      logger.error('Failed to analyze conflicts', { error, templateId: template.id })
      throw error
    }
  }

  /**
   * Apply template to workflow with conflict resolution
   */
  static async applyTemplate(
    template: Template,
    workflowState: WorkflowState,
    options: TemplateApplicationOptions
  ): Promise<TemplateApplicationResult> {
    const startTime = Date.now()

    try {
      logger.info('Applying template to workflow', {
        templateId: template.id,
        templateName: template.name,
        mode: options.mode,
        workflowBlockCount: Object.keys(workflowState.blocks).length,
      })

      const result: TemplateApplicationResult = {
        success: false,
        appliedBlocks: [],
        appliedEdges: [],
        conflicts: [],
        statistics: {
          blocksAdded: 0,
          edgesAdded: 0,
          conflictsResolved: 0,
          processingTime: 0,
        },
      }

      const templateState = template.state as WorkflowState
      if (!templateState?.blocks) {
        throw new Error('Invalid template state: no blocks found')
      }

      // Create a copy of the workflow state for modifications
      const newWorkflowState: WorkflowState = JSON.parse(JSON.stringify(workflowState))

      // Store undo data
      result.undoData = {
        operation: 'apply_template',
        previousState: {
          blocks: { ...workflowState.blocks },
          edges: [...(workflowState.edges || [])],
        },
        appliedChanges: [],
      }

      // Handle different application modes
      if (options.mode === 'replace') {
        // Clear existing workflow
        newWorkflowState.blocks = {}
        newWorkflowState.edges = []
        logger.info('Cleared existing workflow for replace mode')
      }

      // Process template variables
      const processedTemplateState = TemplateIntegrationService.processTemplateVariables(
        templateState,
        options.variables
      )

      // Generate unique IDs if needed
      const { blocks: processedBlocks, idMapping } =
        options.generateUniqueIds !== false
          ? TemplateIntegrationService.generateUniqueIds(
              processedTemplateState.blocks,
              newWorkflowState.blocks
            )
          : { blocks: processedTemplateState.blocks, idMapping: new Map() }

      // Resolve conflicts and apply blocks
      const { resolvedBlocks, conflictsResolved } =
        await TemplateIntegrationService.resolveConflicts(
          processedBlocks,
          newWorkflowState.blocks,
          options.conflicts
        )

      // Calculate positions
      const positionedBlocks = TemplateIntegrationService.calculateOptimalPositions(
        resolvedBlocks,
        newWorkflowState.blocks,
        options.position,
        options.mode
      )

      // Apply blocks to workflow
      Object.entries(positionedBlocks).forEach(([blockId, block]) => {
        newWorkflowState.blocks[blockId] = block
        result.appliedBlocks.push(blockId)
        result.statistics.blocksAdded++
      })

      // Process and apply edges
      if (processedTemplateState.edges) {
        const processedEdges = TemplateIntegrationService.processTemplateEdges(
          processedTemplateState.edges,
          idMapping,
          newWorkflowState.blocks
        )

        processedEdges.forEach((edge) => {
          // Generate unique edge ID
          const edgeId = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const newEdge = { ...edge, id: edgeId }

          newWorkflowState.edges = newWorkflowState.edges || []
          newWorkflowState.edges.push(newEdge)
          result.appliedEdges.push(edgeId)
          result.statistics.edgesAdded++
        })
      }

      // Auto-connect if enabled
      if (options.autoConnect && options.mode === 'merge') {
        await TemplateIntegrationService.autoConnectBlocks(newWorkflowState, result.appliedBlocks)
      }

      // Update statistics
      result.statistics.conflictsResolved = conflictsResolved.length
      result.statistics.processingTime = Date.now() - startTime
      result.conflicts = conflictsResolved
      result.success = true

      logger.info('Template applied successfully', {
        templateId: template.id,
        statistics: result.statistics,
      })

      // Update the original workflow state
      Object.assign(workflowState, newWorkflowState)

      return result
    } catch (error) {
      logger.error('Failed to apply template', { error, templateId: template.id })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        appliedBlocks: [],
        appliedEdges: [],
        conflicts: [],
        statistics: {
          blocksAdded: 0,
          edgesAdded: 0,
          conflictsResolved: 0,
          processingTime: Date.now() - startTime,
        },
      }
    }
  }

  /**
   * Process template variables by substituting values
   */
  private static processTemplateVariables(
    templateState: WorkflowState,
    variables: Record<string, any>
  ): WorkflowState {
    const processedState = JSON.parse(JSON.stringify(templateState))

    // Recursive function to replace variables in any object/string
    const replaceVariables = (obj: any): any => {
      if (typeof obj === 'string') {
        // Replace {{variable}} patterns
        return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return variables[key] !== undefined ? variables[key] : match
        })
      }
      if (Array.isArray(obj)) {
        return obj.map(replaceVariables)
      }
      if (obj && typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceVariables(value)
        }
        return result
      }
      return obj
    }

    return replaceVariables(processedState)
  }

  /**
   * Generate unique IDs for blocks to avoid conflicts
   */
  private static generateUniqueIds(
    templateBlocks: Record<string, any>,
    existingBlocks: Record<string, any>
  ): { blocks: Record<string, any>; idMapping: Map<string, string> } {
    const idMapping = new Map<string, string>()
    const newBlocks: Record<string, any> = {}
    const existingIds = new Set(Object.keys(existingBlocks))

    Object.entries(templateBlocks).forEach(([oldId, block]) => {
      let newId = oldId
      let counter = 1

      // Generate unique ID
      while (existingIds.has(newId)) {
        newId = `${oldId}-${counter}`
        counter++
      }

      idMapping.set(oldId, newId)
      existingIds.add(newId)

      newBlocks[newId] = {
        ...block,
        id: newId,
      }
    })

    return { blocks: newBlocks, idMapping }
  }

  /**
   * Resolve conflicts based on user-specified resolutions
   */
  private static async resolveConflicts(
    blocks: Record<string, any>,
    existingBlocks: Record<string, any>,
    conflictResolutions: Array<{ type: string; resolution: string }>
  ): Promise<{ resolvedBlocks: Record<string, any>; conflictsResolved: any[] }> {
    const resolvedBlocks = { ...blocks }
    const conflictsResolved: any[] = []
    const existingNames = new Set(Object.values(existingBlocks).map((block: any) => block.name))

    // Apply conflict resolutions
    conflictResolutions.forEach((resolution) => {
      switch (resolution.type) {
        case 'name_conflict':
          if (resolution.resolution === 'append_suffix') {
            Object.values(resolvedBlocks).forEach((block: any) => {
              if (existingNames.has(block.name)) {
                const originalName = block.name
                let counter = 1
                let newName = `${block.name} (${counter})`

                while (existingNames.has(newName)) {
                  counter++
                  newName = `${originalName} (${counter})`
                }

                block.name = newName
                existingNames.add(newName)

                conflictsResolved.push({
                  type: 'name_conflict',
                  description: `Renamed "${originalName}" to "${newName}"`,
                  resolution: 'append_suffix',
                  affectedItems: [block.id],
                })
              }
            })
          }
          break

        default:
          logger.warn('Unknown conflict resolution type', resolution.type)
      }
    })

    return { resolvedBlocks, conflictsResolved }
  }

  /**
   * Calculate optimal positions for template blocks
   */
  private static calculateOptimalPositions(
    blocks: Record<string, any>,
    existingBlocks: Record<string, any>,
    insertPosition?: { x: number; y: number },
    mode = 'merge'
  ): Record<string, any> {
    const positionedBlocks = { ...blocks }

    if (mode === 'replace' || Object.keys(existingBlocks).length === 0) {
      // For replace mode or empty workflow, use template's original positions
      return positionedBlocks
    }

    // Calculate bounds of existing workflow
    const existingPositions = Object.values(existingBlocks).map((block: any) => block.position)
    const bounds = {
      minX: Math.min(...existingPositions.map((pos) => pos.x)),
      maxX: Math.max(...existingPositions.map((pos) => pos.x)),
      minY: Math.min(...existingPositions.map((pos) => pos.y)),
      maxY: Math.max(...existingPositions.map((pos) => pos.y)),
    }

    // Calculate offset for template blocks
    let offsetX = 0
    let offsetY = 0

    if (insertPosition) {
      // Use specific position
      const templatePositions = Object.values(blocks).map((block: any) => block.position)
      const templateBounds = {
        minX: Math.min(...templatePositions.map((pos) => pos.x)),
        minY: Math.min(...templatePositions.map((pos) => pos.y)),
      }

      offsetX = insertPosition.x - templateBounds.minX
      offsetY = insertPosition.y - templateBounds.minY
    } else {
      // Position to the right of existing workflow
      offsetX = bounds.maxX + 200 // 200px gap
      offsetY = bounds.minY
    }

    // Apply offset to all blocks
    Object.values(positionedBlocks).forEach((block: any) => {
      block.position = {
        x: block.position.x + offsetX,
        y: block.position.y + offsetY,
      }
    })

    return positionedBlocks
  }

  /**
   * Process template edges with ID mapping
   */
  private static processTemplateEdges(
    edges: any[],
    idMapping: Map<string, string>,
    allBlocks: Record<string, any>
  ): any[] {
    return edges
      .map((edge) => ({
        ...edge,
        source: idMapping.get(edge.source) || edge.source,
        target: idMapping.get(edge.target) || edge.target,
      }))
      .filter((edge) => {
        // Only include edges where both source and target exist
        return allBlocks[edge.source] && allBlocks[edge.target]
      })
  }

  /**
   * Auto-connect template blocks to existing workflow
   */
  private static async autoConnectBlocks(
    workflowState: WorkflowState,
    appliedBlockIds: string[]
  ): Promise<void> {
    // This is a simplified auto-connection algorithm
    // In a real implementation, this would be more sophisticated

    const allBlocks = workflowState.blocks
    const existingBlockIds = Object.keys(allBlocks).filter((id) => !appliedBlockIds.includes(id))

    if (existingBlockIds.length === 0) return

    // Find a good connection point (e.g., the rightmost existing block)
    const existingBlocks = existingBlockIds.map((id) => allBlocks[id])
    const rightmostBlock = existingBlocks.reduce((rightmost, block) =>
      block.position.x > rightmost.position.x ? block : rightmost
    )

    // Find the leftmost template block
    const templateBlocks = appliedBlockIds.map((id) => allBlocks[id])
    const leftmostTemplateBlock = templateBlocks.reduce((leftmost, block) =>
      block.position.x < leftmost.position.x ? block : leftmost
    )

    // Create a connection if it makes sense
    if (rightmostBlock && leftmostTemplateBlock) {
      const connectionEdge = {
        id: `auto-connection-${Date.now()}`,
        source: rightmostBlock.id,
        target: leftmostTemplateBlock.id,
        sourceHandle: 'source',
        targetHandle: 'target',
        type: 'workflowEdge',
      }

      workflowState.edges = workflowState.edges || []
      workflowState.edges.push(connectionEdge)

      logger.info('Auto-connected template to existing workflow', {
        source: rightmostBlock.id,
        target: leftmostTemplateBlock.id,
      })
    }
  }

  /**
   * Validate template before application
   */
  static validateTemplate(template: Template): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!template.state) {
      errors.push('Template has no workflow state')
      return { valid: false, errors }
    }

    const templateState = template.state as WorkflowState

    if (!templateState.blocks || Object.keys(templateState.blocks).length === 0) {
      errors.push('Template has no blocks')
    }

    // Validate block structure
    Object.entries(templateState.blocks).forEach(([id, block]) => {
      if (!block.name) {
        errors.push(`Block ${id} is missing a name`)
      }
      if (!block.type) {
        errors.push(`Block ${id} is missing a type`)
      }
      if (!block.position) {
        errors.push(`Block ${id} is missing position`)
      }
    })

    // Validate edges reference existing blocks
    if (templateState.edges) {
      templateState.edges.forEach((edge, index) => {
        if (!templateState.blocks[edge.source]) {
          errors.push(`Edge ${index} references non-existent source block: ${edge.source}`)
        }
        if (!templateState.blocks[edge.target]) {
          errors.push(`Edge ${index} references non-existent target block: ${edge.target}`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get template application preview without actually applying
   */
  static async getApplicationPreview(
    template: Template,
    workflowState: WorkflowState,
    options: Partial<TemplateApplicationOptions> = {}
  ): Promise<{
    preview: WorkflowState
    conflicts: ConflictAnalysis
    statistics: {
      blocksToAdd: number
      edgesToAdd: number
      estimatedComplexity: 'simple' | 'moderate' | 'complex'
      estimatedSetupTime: string
    }
  }> {
    const conflicts = await TemplateIntegrationService.analyzeConflicts(
      template,
      workflowState,
      options
    )
    const templateState = template.state as WorkflowState

    const blocksToAdd = Object.keys(templateState.blocks || {}).length
    const edgesToAdd = (templateState.edges || []).length
    const existingBlocks = Object.keys(workflowState.blocks).length
    const totalBlocks = blocksToAdd + existingBlocks

    // Estimate complexity based on total blocks and connections
    let estimatedComplexity: 'simple' | 'moderate' | 'complex' = 'simple'
    if (totalBlocks > 20 || edgesToAdd > 30) {
      estimatedComplexity = 'complex'
    } else if (totalBlocks > 10 || edgesToAdd > 15) {
      estimatedComplexity = 'moderate'
    }

    // Estimate setup time based on variables and conflicts
    const variableCount = template.variables?.length || 0
    const conflictCount = conflicts.conflicts.length
    const baseTime = Math.max(2, blocksToAdd * 0.5) // Minimum 2 minutes, 30s per block
    const variableTime = variableCount * 1 // 1 minute per variable
    const conflictTime = conflictCount * 2 // 2 minutes per conflict

    const totalMinutes = Math.ceil(baseTime + variableTime + conflictTime)
    const estimatedSetupTime =
      totalMinutes < 60
        ? `${totalMinutes} min`
        : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`

    // Create a preview of the combined workflow (without actually modifying the original)
    const preview: WorkflowState = JSON.parse(JSON.stringify(workflowState))

    if (options.mode === 'replace') {
      preview.blocks = templateState.blocks || {}
      preview.edges = templateState.edges || []
    } else {
      // Merge mode preview
      Object.assign(preview.blocks, templateState.blocks || {})
      if (templateState.edges) {
        preview.edges = [...(preview.edges || []), ...templateState.edges]
      }
    }

    return {
      preview,
      conflicts,
      statistics: {
        blocksToAdd,
        edgesToAdd,
        estimatedComplexity,
        estimatedSetupTime,
      },
    }
  }
}
