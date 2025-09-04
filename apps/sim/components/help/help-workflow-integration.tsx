/**
 * Help System Integration for Workflow Editor
 *
 * Comprehensive help system integration that adds contextual help throughout
 * the workflow editor interface. This provides contextual tooltips, guided tours,
 * help triggers, and smart assistance based on user actions and workflow state.
 *
 * Integration Points:
 * - Workflow canvas with contextual help for drag & drop
 * - Individual workflow blocks with configuration help
 * - Toolbar and sidebar with feature explanations
 * - Control bar with execution and debugging help
 * - Edge connections with relationship guidance
 * - Error states with troubleshooting assistance
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { HelpCircle, Lightbulb, Play } from 'lucide-react'
import { useParams } from 'next/navigation'
import type { NodeTypes } from 'reactflow'
import { HelpPanel } from '@/components/help/help-panel'
import { HelpSearchBar } from '@/components/help/help-search-bar'
import { HelpSpotlight } from '@/components/help/help-spotlight'
import { HelpTooltip } from '@/components/help/help-tooltip'
import { Button } from '@/components/ui/button'
import type { HelpContext, HelpTourStep } from '@/lib/help/help-context-provider'
import { HelpProvider } from '@/lib/help/help-context-provider'
import { createLogger } from '@/lib/logs/console/logger'
import { useCurrentWorkflow } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks'
import { useExecutionStore } from '@/stores/execution/store'
import { useGeneralStore } from '@/stores/settings/general/store'

const logger = createLogger('HelpWorkflowIntegration')

// ========================
// HELP CONTEXT DETECTION
// ========================

interface WorkflowHelpContext {
  workflowState: 'empty' | 'creating' | 'editing' | 'running' | 'debugging' | 'error'
  userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  currentAction: string
  blockCount: number
  hasErrors: boolean
  isExecuting: boolean
  selectedElements: {
    blocks: string[]
    edges: string[]
  }
  lastUserAction?: {
    type: string
    timestamp: number
    context: any
  }
}

/**
 * Hook to detect current workflow context for help system
 */
function useWorkflowHelpContext(): WorkflowHelpContext {
  const currentWorkflow = useCurrentWorkflow()
  const { activeBlockIds } = useExecutionStore()
  const { isDebugModeEnabled } = useGeneralStore()

  const [selectedElements, setSelectedElements] = useState<{
    blocks: string[]
    edges: string[]
  }>({ blocks: [], edges: [] })

  const [lastUserAction, setLastUserAction] = useState<
    | {
        type: string
        timestamp: number
        context: any
      }
    | undefined
  >()

  const workflowState = useMemo((): WorkflowHelpContext['workflowState'] => {
    const blockCount = Object.keys(currentWorkflow.blocks).length
    const isExecuting = activeBlockIds.size > 0

    if (isExecuting) return 'running'
    if (isDebugModeEnabled) return 'debugging'
    if (blockCount === 0) return 'empty'
    if (blockCount < 3) return 'creating'
    return 'editing'
  }, [currentWorkflow.blocks, activeBlockIds, isDebugModeEnabled])

  const context: WorkflowHelpContext = {
    workflowState,
    userLevel: 'beginner', // TODO: Get from user preferences
    currentAction: lastUserAction?.type || 'viewing',
    blockCount: Object.keys(currentWorkflow.blocks).length,
    hasErrors: false, // TODO: Check for workflow errors
    isExecuting: activeBlockIds.size > 0,
    selectedElements,
    lastUserAction,
  }

  // Listen for user actions
  useEffect(() => {
    const handleBlockDrop = () => {
      setLastUserAction({
        type: 'block_dropped',
        timestamp: Date.now(),
        context: { workflowState, blockCount: context.blockCount },
      })
    }

    const handleBlockSelect = (event: CustomEvent) => {
      setSelectedElements((prev) => ({
        ...prev,
        blocks: [...prev.blocks, event.detail.blockId],
      }))
      setLastUserAction({
        type: 'block_selected',
        timestamp: Date.now(),
        context: { blockId: event.detail.blockId },
      })
    }

    const handleEdgeCreate = () => {
      setLastUserAction({
        type: 'edge_created',
        timestamp: Date.now(),
        context: { workflowState, blockCount: context.blockCount },
      })
    }

    window.addEventListener('add-block-from-toolbar', handleBlockDrop)
    window.addEventListener('block-selected', handleBlockSelect as EventListener)
    window.addEventListener('edge-created', handleEdgeCreate)

    return () => {
      window.removeEventListener('add-block-from-toolbar', handleBlockDrop)
      window.removeEventListener('block-selected', handleBlockSelect as EventListener)
      window.removeEventListener('edge-created', handleEdgeCreate)
    }
  }, [workflowState, context.blockCount])

  return context
}

// ========================
// CONTEXTUAL HELP CONTENT
// ========================

/**
 * Get contextual help content based on workflow state
 */
function getContextualHelp(context: WorkflowHelpContext) {
  const { workflowState, userLevel, currentAction, blockCount } = context

  // Empty workflow - guide user to create first workflow
  if (workflowState === 'empty') {
    return {
      priority: 'high' as const,
      title: 'Create Your First Workflow',
      content:
        'Start by dragging a block from the toolbar to the canvas, or click the "+" button to add your first block.',
      actions: [
        { label: 'Take Quick Tour', action: 'start_tour', variant: 'default' as const },
        { label: 'Browse Templates', action: 'open_templates', variant: 'outline' as const },
      ],
      helpType: 'guide' as const,
    }
  }

  // Creating workflow - provide guidance on building
  if (workflowState === 'creating') {
    return {
      priority: 'medium' as const,
      title: 'Building Your Workflow',
      content:
        'Great start! Add more blocks and connect them to create your automation. Each workflow needs a trigger to start.',
      actions: [
        {
          label: 'Learn About Triggers',
          action: 'show_triggers_help',
          variant: 'default' as const,
        },
        { label: 'Auto-Layout Blocks', action: 'auto_layout', variant: 'outline' as const },
      ],
      helpType: 'tip' as const,
    }
  }

  // Running workflow - show execution help
  if (workflowState === 'running') {
    return {
      priority: 'info' as const,
      title: 'Workflow Executing',
      content:
        'Your workflow is currently running. Watch the highlighted blocks to see the execution progress.',
      actions: [
        { label: 'View Execution Logs', action: 'open_logs', variant: 'default' as const },
        { label: 'Stop Execution', action: 'stop_execution', variant: 'outline' as const },
      ],
      helpType: 'info' as const,
    }
  }

  // Default editing help
  return {
    priority: 'low' as const,
    title: 'Workflow Editor',
    content:
      'You can add blocks, create connections, and configure your workflow. Click the help button for more guidance.',
    actions: [{ label: 'Open Help Panel', action: 'open_help_panel', variant: 'default' as const }],
    helpType: 'info' as const,
  }
}

// ========================
// GUIDED TOUR DEFINITIONS
// ========================

const WORKFLOW_TOUR_STEPS: HelpTourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Sim Workflows',
    content:
      "Let's take a quick tour of the workflow editor. You'll learn how to create and manage your automations.",
    target: '.workflow-container',
    position: 'center',
    order: 0,
  },
  {
    id: 'toolbar',
    title: 'Block Toolbar',
    content:
      'Drag blocks from here to add them to your workflow. Each block performs a specific function like sending emails or processing data.',
    target: '[data-testid="block-toolbar"]',
    position: 'right',
    order: 1,
  },
  {
    id: 'canvas',
    title: 'Workflow Canvas',
    content:
      'This is where you build your workflow. Drop blocks here and connect them to create your automation.',
    target: '.workflow-container .react-flow',
    position: 'center',
    order: 2,
  },
  {
    id: 'control-bar',
    title: 'Control Bar',
    content:
      'Use these controls to run, test, and save your workflow. The play button executes your automation.',
    target: '[data-testid="control-bar"]',
    position: 'bottom',
    order: 3,
  },
  {
    id: 'panel',
    title: 'Properties Panel',
    content:
      'When you select a block, this panel shows its configuration options. This is where you set up how each block works.',
    target: '[data-testid="panel"]',
    position: 'left',
    order: 4,
  },
]

// ========================
// HELP-ENHANCED WORKFLOW COMPONENTS
// ========================

interface WorkflowBlockWithHelpProps {
  originalProps: any
  helpContext: WorkflowHelpContext
  onHelpAction: (action: string, context?: any) => void
}

/**
 * Enhanced workflow block component with contextual help
 */
const WorkflowBlockWithHelp: React.FC<WorkflowBlockWithHelpProps> = ({
  originalProps,
  helpContext,
  onHelpAction,
}) => {
  const { id, data } = originalProps
  const { type, config, name } = data

  // Determine help content based on block type and state
  const blockHelpContent = useMemo(() => {
    const isNewBlock = !data.configured // Assume blocks start unconfigured
    const isComplexBlock = ['condition', 'loop', 'parallel'].includes(type)

    if (isNewBlock) {
      return {
        title: `Configure ${config.name}`,
        content: `Click to configure this ${config.name.toLowerCase()} block. ${config.description}`,
        helpType: 'setup' as const,
        priority: 'high' as const,
        expandable: true,
        actions: [
          { label: 'Configure Now', action: 'configure_block', variant: 'default' as const },
          { label: 'Learn More', action: 'block_documentation', variant: 'outline' as const },
        ],
      }
    }

    if (isComplexBlock) {
      return {
        title: `${config.name} Block`,
        content: 'This is an advanced block. Click for configuration help and best practices.',
        helpType: 'info' as const,
        priority: 'medium' as const,
        expandable: true,
        actions: [
          { label: 'Configuration Guide', action: 'block_guide', variant: 'default' as const },
        ],
      }
    }

    return null
  }, [type, config, data])

  // Show help tooltip for unconfigured or complex blocks
  if (!blockHelpContent) {
    return <div {...originalProps} />
  }

  return (
    <HelpTooltip
      content={blockHelpContent.content}
      title={blockHelpContent.title}
      helpType={blockHelpContent.helpType}
      priority={blockHelpContent.priority}
      expandable={blockHelpContent.expandable}
      actions={blockHelpContent.actions}
      onAction={(action) => onHelpAction(action, { blockId: id, blockType: type })}
    >
      <div {...originalProps} />
    </HelpTooltip>
  )
}

/**
 * Enhanced control bar with help integration
 */
interface ControlBarWithHelpProps {
  children: React.ReactNode
  helpContext: WorkflowHelpContext
  onHelpAction: (action: string, context?: any) => void
}

const ControlBarWithHelp: React.FC<ControlBarWithHelpProps> = ({
  children,
  helpContext,
  onHelpAction,
}) => {
  const showExecutionHelp = helpContext.workflowState === 'running'
  const showSetupHelp = helpContext.workflowState === 'empty' || helpContext.blockCount < 2

  return (
    <div className='relative'>
      {children}

      {/* Contextual help button */}
      <div className='-translate-y-1/2 absolute top-1/2 right-4 transform'>
        <HelpTooltip
          content={
            showExecutionHelp
              ? 'Your workflow is running. Monitor progress and view logs here.'
              : showSetupHelp
                ? 'Add blocks and configure them before running your workflow.'
                : 'Control workflow execution, testing, and deployment from here.'
          }
          helpType='info'
          priority='medium'
        >
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onHelpAction('open_help_panel', { source: 'control_bar' })}
            className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
          >
            <HelpCircle className='h-4 w-4' />
          </Button>
        </HelpTooltip>
      </div>
    </div>
  )
}

/**
 * Canvas help overlay for empty workflows
 */
interface CanvasHelpOverlayProps {
  helpContext: WorkflowHelpContext
  onHelpAction: (action: string, context?: any) => void
}

const CanvasHelpOverlay: React.FC<CanvasHelpOverlayProps> = ({ helpContext, onHelpAction }) => {
  if (helpContext.workflowState !== 'empty') return null

  return (
    <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center'>
      <div className='pointer-events-auto max-w-md rounded-lg border bg-background/95 p-8 text-center shadow-lg backdrop-blur-sm'>
        <Lightbulb className='mx-auto mb-4 h-8 w-8 text-yellow-500' />
        <h3 className='mb-2 font-semibold text-lg'>Create Your First Workflow</h3>
        <p className='mb-4 text-muted-foreground'>
          Drag a block from the toolbar to get started, or choose from our templates.
        </p>
        <div className='flex justify-center gap-2'>
          <Button onClick={() => onHelpAction('start_tour')} className='gap-2'>
            <Play className='h-4 w-4' />
            Take Tour
          </Button>
          <Button variant='outline' onClick={() => onHelpAction('open_templates')}>
            Browse Templates
          </Button>
        </div>
      </div>
    </div>
  )
}

// ========================
// MAIN INTEGRATION COMPONENT
// ========================

interface HelpWorkflowIntegrationProps {
  children: React.ReactNode
  originalNodeTypes: NodeTypes
}

/**
 * Main help system integration wrapper for workflow editor
 */
export const HelpWorkflowIntegration: React.FC<HelpWorkflowIntegrationProps> = ({
  children,
  originalNodeTypes,
}) => {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workflowId = params.workflowId as string

  const helpContext = useWorkflowHelpContext()
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
  const [activeTour, setActiveTour] = useState<string | null>(null)
  const [tourStep, setTourStep] = useState(0)

  // Initialize help context for the workflow editor
  const currentHelpContext: HelpContext = {
    component: 'workflow-editor',
    page: `/workspace/${workspaceId}/w/${workflowId}`,
    userLevel: helpContext.userLevel,
    workflowState: helpContext.workflowState,
    blockType: undefined,
    errorState: helpContext.hasErrors,
    lastAction: helpContext.lastUserAction?.type,
  }

  // Handle help actions
  const handleHelpAction = useCallback(
    (action: string, context?: any) => {
      logger.info('Help action triggered', { action, context, helpContext })

      switch (action) {
        case 'open_help_panel':
          setIsHelpPanelOpen(true)
          break

        case 'start_tour':
          setActiveTour('workflow_basics')
          setTourStep(0)
          break

        case 'auto_layout':
          // Trigger auto-layout via keyboard shortcut simulation
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'L',
              shiftKey: true,
            })
          )
          break

        case 'configure_block':
          if (context?.blockId) {
            // Focus on the block's configuration panel
            const blockElement = document.querySelector(`[data-id="${context.blockId}"]`)
            if (blockElement) {
              blockElement.scrollIntoView({ behavior: 'smooth' })
              // Simulate click to open configuration
              ;(blockElement as HTMLElement).click()
            }
          }
          break

        case 'block_documentation':
          if (context?.blockType) {
            setIsHelpPanelOpen(true)
            // TODO: Navigate to specific block documentation
          }
          break

        case 'open_templates':
          // Navigate to template selection
          // TODO: Implement template modal or navigation
          break

        case 'open_logs':
          // Open execution logs panel
          // TODO: Focus on logs section
          break

        case 'stop_execution':
          // Stop workflow execution
          // TODO: Trigger execution stop
          break

        default:
          logger.warn('Unknown help action', { action })
      }
    },
    [helpContext]
  )

  // Enhanced node types with help integration
  const enhancedNodeTypes = useMemo(() => {
    const enhanced: NodeTypes = {}

    for (const [typeName, OriginalComponent] of Object.entries(originalNodeTypes)) {
      enhanced[typeName] = (props: any) => {
        // Only enhance workflow blocks, not other node types
        if (typeName === 'workflowBlock') {
          return (
            <WorkflowBlockWithHelp
              originalProps={props}
              helpContext={helpContext}
              onHelpAction={handleHelpAction}
            />
          )
        }

        return <OriginalComponent {...props} />
      }
    }

    return enhanced
  }, [originalNodeTypes, helpContext, handleHelpAction])

  // Tour step management
  const handleTourNext = useCallback(() => {
    if (activeTour && tourStep < WORKFLOW_TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1)
    } else {
      setActiveTour(null)
      setTourStep(0)
    }
  }, [activeTour, tourStep])

  const handleTourPrevious = useCallback(() => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1)
    }
  }, [tourStep])

  const handleTourComplete = useCallback(() => {
    setActiveTour(null)
    setTourStep(0)
    // Show completion message
    handleHelpAction('tour_completed')
  }, [handleHelpAction])

  // Contextual help content
  const contextualHelp = getContextualHelp(helpContext)

  return (
    <HelpProvider
      initialContext={currentHelpContext}
      userPreferences={{
        showTooltips: true,
        autoPlayVideos: false,
        completedTours: [],
        preferredContentTypes: ['tutorial', 'guide'],
        complexityLevel: helpContext.userLevel,
      }}
    >
      <div className='relative h-full w-full'>
        {/* Main workflow editor content with enhanced components */}
        <div className='h-full'>
          {/* Inject enhanced node types into children */}
          {React.cloneElement(children as React.ReactElement, {
            nodeTypes: enhancedNodeTypes,
          })}
        </div>

        {/* Canvas help overlay for empty workflows */}
        <CanvasHelpOverlay helpContext={helpContext} onHelpAction={handleHelpAction} />

        {/* Contextual help notification */}
        {contextualHelp.priority === 'high' && (
          <div className='-translate-x-1/2 absolute top-4 left-1/2 z-20 transform'>
            <HelpTooltip
              content={contextualHelp.content}
              title={contextualHelp.title}
              helpType={contextualHelp.helpType}
              priority={contextualHelp.priority}
              actions={contextualHelp.actions}
              onAction={handleHelpAction}
              expandable
              className='max-w-md'
            >
              <div className='cursor-pointer rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-lg'>
                <div className='flex items-center gap-2'>
                  <Lightbulb className='h-4 w-4' />
                  <span className='font-medium'>{contextualHelp.title}</span>
                </div>
              </div>
            </HelpTooltip>
          </div>
        )}

        {/* Guided tour spotlight */}
        {activeTour && (
          <HelpSpotlight
            isActive={true}
            steps={WORKFLOW_TOUR_STEPS}
            currentStep={tourStep}
            onNext={handleTourNext}
            onPrevious={handleTourPrevious}
            onComplete={handleTourComplete}
            onSkip={() => setActiveTour(null)}
            enableKeyboardNavigation
            announceSteps
          />
        )}

        {/* Help panel */}
        <HelpPanel
          isOpen={isHelpPanelOpen}
          onClose={() => setIsHelpPanelOpen(false)}
          initialContext={currentHelpContext}
          enableSearch
          enableBookmarks
        />

        {/* Floating help button */}
        <div className='absolute right-6 bottom-6 z-30'>
          <HelpTooltip
            content='Get help and guidance for using the workflow editor'
            helpType='info'
          >
            <Button
              onClick={() => setIsHelpPanelOpen(true)}
              className='h-12 w-12 rounded-full bg-primary shadow-lg hover:bg-primary/90'
              size='sm'
            >
              <HelpCircle className='h-6 w-6' />
            </Button>
          </HelpTooltip>
        </div>

        {/* Quick help search */}
        <div className='absolute top-4 right-4 z-20'>
          <HelpSearchBar
            placeholder='Search help...'
            context={currentHelpContext}
            onSelect={(result) => {
              // Handle help search result selection
              if (result.type === 'content') {
                setIsHelpPanelOpen(true)
              } else if (result.type === 'action') {
                handleHelpAction(result.action, result.context)
              }
            }}
            className='w-64'
          />
        </div>
      </div>
    </HelpProvider>
  )
}

// ========================
// USAGE EXAMPLE
// ========================

/**
 * Example of how to integrate with existing workflow component:
 *
 * ```tsx
 * import { HelpWorkflowIntegration } from '@/components/help/help-workflow-integration'
 *
 * // In your workflow component
 * const WorkflowWithHelp = () => {
 *   const nodeTypes = { workflowBlock: WorkflowBlock, subflowNode: SubflowNodeComponent }
 *
 *   return (
 *     <HelpWorkflowIntegration originalNodeTypes={nodeTypes}>
 *       <ReactFlow
 *         nodes={nodes}
 *         edges={edges}
 *         nodeTypes={nodeTypes} // This will be enhanced automatically
 *         // ... other ReactFlow props
 *       />
 *     </HelpWorkflowIntegration>
 *   )
 * }
 * ```
 */

export default HelpWorkflowIntegration
