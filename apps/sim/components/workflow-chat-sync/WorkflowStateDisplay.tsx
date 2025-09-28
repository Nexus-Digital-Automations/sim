'use client'

import React, { useMemo } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Link,
  Pause,
  Play,
  Square,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { useWorkflowChatSyncStore } from '@/stores/workflow-chat-sync/store'

interface WorkflowStateDisplayProps {
  compact?: boolean
  showControls?: boolean
  className?: string
}

/**
 * WorkflowStateDisplay Component
 *
 * Displays the current workflow state in a chat-friendly format,
 * showing blocks, connections, and execution status with real-time updates.
 */
export function WorkflowStateDisplay({
  compact = false,
  showControls = true,
  className = '',
}: WorkflowStateDisplayProps) {
  const { workflowStateRepresentation, syncState, isEnabled, enableSync, disableSync } =
    useWorkflowChatSyncStore()

  const [blocksExpanded, setBlocksExpanded] = React.useState(!compact)
  const [connectionsExpanded, setConnectionsExpanded] = React.useState(!compact)

  // Memoized state analysis
  const stateAnalysis = useMemo(() => {
    if (!workflowStateRepresentation) {
      return {
        totalBlocks: 0,
        activeBlocks: 0,
        totalConnections: 0,
        enabledBlocks: 0,
        disabledBlocks: 0,
      }
    }

    const blocks = workflowStateRepresentation.blockSummaries
    return {
      totalBlocks: blocks.length,
      activeBlocks: blocks.filter((b) => b.isActive).length,
      totalConnections: workflowStateRepresentation.connectionSummaries.length,
      enabledBlocks: blocks.filter((b) => b.isEnabled).length,
      disabledBlocks: blocks.filter((b) => !b.isEnabled).length,
    }
  }, [workflowStateRepresentation])

  if (!isEnabled) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className='pt-6'>
          <div className='space-y-3 text-center'>
            <Info className='mx-auto h-8 w-8 text-muted-foreground' />
            <p className='text-muted-foreground text-sm'>Workflow-Chat sync is disabled</p>
            <Button onClick={enableSync} size='sm' variant='outline'>
              Enable Sync
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!workflowStateRepresentation) {
    return (
      <Card className={`${className}`}>
        <CardContent className='pt-6'>
          <div className='space-y-3 text-center'>
            <div className='animate-pulse space-y-2'>
              <div className='mx-auto h-4 w-3/4 rounded bg-muted' />
              <div className='mx-auto h-4 w-1/2 rounded bg-muted' />
            </div>
            <p className='text-muted-foreground text-xs'>Loading workflow state...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getExecutionStatusIcon = () => {
    switch (workflowStateRepresentation.executionState) {
      case 'running':
        return <Play className='h-4 w-4 text-green-500' />
      case 'paused':
        return <Pause className='h-4 w-4 text-yellow-500' />
      case 'error':
        return <AlertTriangle className='h-4 w-4 text-red-500' />
      default:
        return <Square className='h-4 w-4 text-muted-foreground' />
    }
  }

  const getExecutionStatusText = () => {
    switch (workflowStateRepresentation.executionState) {
      case 'running':
        return 'Running'
      case 'paused':
        return 'Paused'
      case 'error':
        return 'Error'
      default:
        return 'Idle'
    }
  }

  return (
    <Card className={`transition-all duration-200 ${className}`}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 font-medium text-sm'>
            <Zap className='h-4 w-4' />
            Workflow State
          </CardTitle>
          <div className='flex items-center gap-2'>
            <Badge variant={syncState === 'syncing' ? 'secondary' : 'outline'} className='text-xs'>
              {syncState}
            </Badge>
            {showControls && (
              <Button
                onClick={isEnabled ? disableSync : enableSync}
                size='sm'
                variant='ghost'
                className='h-6 w-6 p-0'
              >
                {isEnabled ? <Eye className='h-3 w-3' /> : <EyeOff className='h-3 w-3' />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Summary Section */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>Status:</span>
            <div className='flex items-center gap-1'>
              {getExecutionStatusIcon()}
              <span>{getExecutionStatusText()}</span>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-muted-foreground'>Blocks:</span>
              <div className='font-medium'>
                {stateAnalysis.totalBlocks}
                {stateAnalysis.activeBlocks > 0 && (
                  <Badge variant='secondary' className='ml-2 text-xs'>
                    {stateAnalysis.activeBlocks} active
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <span className='text-muted-foreground'>Connections:</span>
              <div className='font-medium'>{stateAnalysis.totalConnections}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Blocks Section */}
        {workflowStateRepresentation.blockSummaries.length > 0 && (
          <Collapsible open={blocksExpanded} onOpenChange={setBlocksExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant='ghost' className='h-8 w-full justify-between px-0'>
                <span className='font-medium text-sm'>Blocks ({stateAnalysis.totalBlocks})</span>
                {blocksExpanded ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='mt-2 space-y-2'>
              {workflowStateRepresentation.blockSummaries.map((block) => (
                <div
                  key={block.id}
                  className={`rounded border p-2 text-sm transition-colors ${
                    block.isActive
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{block.Name}</span>
                      <Badge variant='outline' className='text-xs'>
                        {block.type}
                      </Badge>
                    </div>
                    <div className='flex items-center gap-1'>
                      {block.isActive && (
                        <Badge variant='secondary' className='text-xs'>
                          active
                        </Badge>
                      )}
                      {!block.isEnabled && (
                        <Badge variant='destructive' className='text-xs'>
                          disabled
                        </Badge>
                      )}
                    </div>
                  </div>

                  {block.description && (
                    <p className='mt-1 text-muted-foreground text-xs'>{block.description}</p>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Connections Section */}
        {workflowStateRepresentation.connectionSummaries.length > 0 && (
          <Collapsible open={connectionsExpanded} onOpenChange={setConnectionsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant='ghost' className='h-8 w-full justify-between px-0'>
                <span className='font-medium text-sm'>
                  Connections ({stateAnalysis.totalConnections})
                </span>
                {connectionsExpanded ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='mt-2 space-y-2'>
              {workflowStateRepresentation.connectionSummaries.map((connection) => (
                <div key={connection.id} className='rounded border bg-card p-2 text-sm'>
                  <div className='flex items-center gap-2'>
                    <Link className='h-3 w-3 text-muted-foreground' />
                    <span className='text-muted-foreground text-xs'>{connection.description}</span>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {stateAnalysis.totalBlocks === 0 && (
          <div className='py-4 text-center'>
            <p className='text-muted-foreground text-sm'>No blocks in this workflow yet.</p>
            <p className='mt-1 text-muted-foreground text-xs'>
              Try saying "add llm block" to get started.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WorkflowStateDisplay
