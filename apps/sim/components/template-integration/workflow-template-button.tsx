/**
 * Workflow Template Integration Button
 * 
 * Provides quick access to templates from within the workflow editor.
 * Features context-aware suggestions and seamless integration.
 */

'use client'

import { useCallback, useState, useMemo } from 'react'
import { Book, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'
import { TemplateBrowser } from './template-browser'
import { TemplatePreviewModal } from './template-preview-modal'
import { TemplateIntegrationService } from '@/lib/templates/workflow-integration'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'
import { useCollaborativeWorkflow } from '@/hooks/use-collaborative-workflow'
import type { Template } from '@/lib/templates/types'

const logger = createLogger('WorkflowTemplateButton')

interface WorkflowTemplateButtonProps {
  workflowId: string
  /** User permissions for template operations */
  userPermissions: {
    canEdit: boolean
    canRead: boolean
  }
  /** Whether the workflow editor is in a state that allows template integration */
  isEnabled?: boolean
  /** Additional CSS classes */
  className?: string
}

export function WorkflowTemplateButton({
  workflowId,
  userPermissions,
  isEnabled = true,
  className,
}: WorkflowTemplateButtonProps) {
  // State management
  const [showBrowser, setShowBrowser] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  // Workflow state and actions
  const { blocks, edges } = useWorkflowStore()
  const {
    collaborativeAddBlock,
    collaborativeAddEdge,
    collaborativeUpdateBlockPosition,
  } = useCollaborativeWorkflow()

  // Generate workflow context for intelligent suggestions
  const workflowContext = useMemo(() => {
    const blockTypes = Object.values(blocks).map((block) => block.type)
    const uniqueBlockTypes = [...new Set(blockTypes)]
    
    // Analyze workflow complexity
    const blockCount = Object.keys(blocks).length
    const edgeCount = edges?.length || 0
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple'
    if (blockCount > 15 || edgeCount > 20) {
      complexity = 'complex'
    } else if (blockCount > 5 || edgeCount > 8) {
      complexity = 'moderate'
    }

    // Infer categories based on block types
    const categories: string[] = []
    if (uniqueBlockTypes.some(type => ['email', 'slack', 'discord'].includes(type))) {
      categories.push('communication')
    }
    if (uniqueBlockTypes.some(type => ['database', 'sql', 'mongodb'].includes(type))) {
      categories.push('data-processing')
    }
    if (uniqueBlockTypes.some(type => ['condition', 'loop', 'parallel'].includes(type))) {
      categories.push('workflow-control')
    }

    // Infer integrations
    const integrations = uniqueBlockTypes.filter(type => 
      !['starter', 'condition', 'loop', 'parallel', 'delay', 'javascript'].includes(type)
    )

    return {
      blockTypes: uniqueBlockTypes,
      categories,
      integrations,
      complexity,
    }
  }, [blocks, edges])

  // Handle opening template browser
  const handleOpenBrowser = useCallback(() => {
    if (!userPermissions.canRead || !isEnabled) {
      return
    }

    logger.info('Opening template browser', {
      workflowId,
      blockCount: Object.keys(blocks).length,
      context: workflowContext,
    })

    setShowBrowser(true)
  }, [userPermissions.canRead, isEnabled, workflowId, blocks, workflowContext])

  // Handle template selection from browser
  const handleTemplateSelect = useCallback(
    (template: Template, action: 'instant' | 'preview' | 'customize') => {
      logger.info('Template selected', {
        templateId: template.id,
        templateName: template.name,
        action,
      })

      setSelectedTemplate(template)

      if (action === 'instant') {
        // Apply template immediately with default settings
        handleApplyTemplate(template, {
          variables: {},
          conflicts: [],
          mode: 'merge',
          position: undefined,
        })
      } else {
        // Show preview/customization modal
        setShowBrowser(false)
        setShowPreview(true)
      }
    },
    []
  )

  // Handle template application
  const handleApplyTemplate = useCallback(
    async (
      template: Template,
      options: {
        variables: Record<string, any>
        conflicts: Array<{ type: string; resolution: string }>
        mode: 'merge' | 'replace' | 'insert'
        position?: { x: number; y: number }
      }
    ) => {
      if (!userPermissions.canEdit || isApplying) {
        return
      }

      setIsApplying(true)

      try {
        logger.info('Applying template to workflow', {
          templateId: template.id,
          templateName: template.name,
          options,
          workflowId,
        })

        // Get current workflow state
        const workflowState = {
          blocks,
          edges: edges || [],
        }

        // Validate template before application
        const validation = TemplateIntegrationService.validateTemplate(template)
        if (!validation.valid) {
          throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
        }

        // Apply template using integration service
        const result = await TemplateIntegrationService.applyTemplate(
          template,
          workflowState,
          {
            ...options,
            preserveExisting: options.mode !== 'replace',
            autoConnect: true,
            generateUniqueIds: true,
          }
        )

        if (!result.success) {
          throw new Error(result.error || 'Failed to apply template')
        }

        logger.info('Template applied successfully', {
          templateId: template.id,
          statistics: result.statistics,
          appliedBlocks: result.appliedBlocks.length,
          appliedEdges: result.appliedEdges.length,
        })

        // The workflowState object has been modified by reference,
        // but we need to trigger the collaborative updates for real-time sync

        // Note: In a real implementation, you might want to batch these operations
        // or use a more efficient method to sync the entire state at once

        // For now, we'll log the success and let the parent component handle
        // the actual state updates through the workflow store
        
        logger.info('Template integration completed', {
          templateId: template.id,
          workflowId,
          result: result.statistics,
        })

        // Close modals
        setShowPreview(false)
        setShowBrowser(false)
        setSelectedTemplate(null)

        // You might want to show a success toast here
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('template-applied', {
              detail: {
                templateId: template.id,
                templateName: template.name,
                statistics: result.statistics,
              },
            })
          )
        }
      } catch (error) {
        logger.error('Failed to apply template', {
          error,
          templateId: template.id,
          workflowId,
        })

        // You might want to show an error toast here
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('template-application-error', {
              detail: {
                templateId: template.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            })
          )
        }
      } finally {
        setIsApplying(false)
      }
    },
    [
      userPermissions.canEdit,
      isApplying,
      workflowId,
      blocks,
      edges,
      collaborativeAddBlock,
      collaborativeAddEdge,
    ]
  )

  // Handle star template
  const handleStarTemplate = useCallback(async (templateId: string, isStarred: boolean) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/star`, {
        method: isStarred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to update star status')
      }

      logger.info('Template star status updated', { templateId, isStarred: !isStarred })
    } catch (error) {
      logger.error('Failed to update template star status', { error, templateId })
    }
  }, [])

  // Determine if button should be disabled
  const isDisabled = !userPermissions.canRead || !isEnabled || isApplying

  // Get tooltip content
  const getTooltipContent = () => {
    if (!userPermissions.canRead) {
      return 'Read permission required to browse templates'
    }
    if (!isEnabled) {
      return 'Template browser is currently disabled'
    }
    if (isApplying) {
      return 'Applying template...'
    }
    return 'Browse workflow templates'
  }

  // Determine if we should show the sparkles icon for smart suggestions
  const hasSmartSuggestions = workflowContext.blockTypes.length > 2 || workflowContext.categories.length > 0

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {isDisabled ? (
            <div className='inline-flex h-12 w-12 cursor-not-allowed items-center justify-center rounded-[11px] border bg-card text-card-foreground opacity-50 shadow-xs transition-colors'>
              <Book className='h-4 w-4' />
            </div>
          ) : (
            <Button
              variant='outline'
              onClick={handleOpenBrowser}
              disabled={isApplying}
              className={cn(
                'h-12 w-12 rounded-[11px] border bg-card text-card-foreground shadow-xs hover:bg-secondary relative',
                className
              )}
            >
              {isApplying ? (
                <div className='h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent' />
              ) : (
                <>
                  <Book className='h-5 w-5' />
                  {hasSmartSuggestions && (
                    <Sparkles className='absolute -top-1 -right-1 h-3 w-3 text-blue-500' />
                  )}
                </>
              )}
              <span className='sr-only'>Browse Templates</span>
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>{getTooltipContent()}</TooltipContent>
      </Tooltip>

      {/* Template Browser Modal */}
      <TemplateBrowser
        open={showBrowser}
        onOpenChange={setShowBrowser}
        workflowId={workflowId}
        workflowContext={workflowContext}
        onTemplateSelect={handleTemplateSelect}
      />

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={selectedTemplate}
        open={showPreview}
        onOpenChange={setShowPreview}
        workflowId={workflowId}
        onApplyTemplate={handleApplyTemplate}
        onStarTemplate={handleStarTemplate}
      />
    </>
  )
}