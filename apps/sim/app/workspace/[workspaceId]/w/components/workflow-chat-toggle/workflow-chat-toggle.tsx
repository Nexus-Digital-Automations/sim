'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Eye, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('WorkflowChatToggle')

export type ViewMode = 'visual' | 'chat'

interface WorkflowChatToggleProps {
  workflowId: string
  workflowName: string
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Workflow Chat Toggle Component
 *
 * Provides a prominent interface for switching between visual workflow editor
 * and conversational chat mode. Designed for main workflow view areas.
 */
export function WorkflowChatToggle({
  workflowId,
  workflowName,
  currentMode,
  onModeChange,
  loading = false,
  disabled = false,
  className,
}: WorkflowChatToggleProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleModeSwitch = async (newMode: ViewMode) => {
    if (disabled || loading || currentMode === newMode) return

    logger.info('Switching workflow view mode', {
      workflowId,
      workflowName,
      fromMode: currentMode,
      toMode: newMode,
    })

    setIsTransitioning(true)

    // Add a small delay to show transition state
    setTimeout(() => {
      onModeChange(newMode)
      setIsTransitioning(false)
    }, 200)
  }

  // Reset transition state if mode changes externally
  useEffect(() => {
    setIsTransitioning(false)
  }, [currentMode])

  if (currentMode === 'visual') {
    return (
      <Card className={cn('border-2 border-dashed border-primary/20 bg-primary/5', className)}>
        <CardContent className='flex items-center justify-between p-4'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
              <MessageSquare className='h-5 w-5 text-primary' />
            </div>
            <div>
              <h3 className='font-medium text-sm'>Chat with this workflow</h3>
              <p className='text-muted-foreground text-xs'>
                Switch to conversational mode to interact with {workflowName}
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleModeSwitch('chat')}
            disabled={disabled || loading || isTransitioning}
            className='gap-2'
            size="sm"
          >
            {isTransitioning ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                Switching...
              </>
            ) : (
              <>
                <MessageSquare className='h-4 w-4' />
                Start Chat
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('flex items-center justify-between rounded-lg border bg-card p-3', className)}>
      <div className='flex items-center gap-3'>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleModeSwitch('visual')}
          disabled={disabled || loading || isTransitioning}
          className='gap-2'
        >
          {isTransitioning ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              Switching...
            </>
          ) : (
            <>
              <ArrowLeft className='h-4 w-4' />
              Back to Visual
            </>
          )}
        </Button>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <MessageSquare className='h-4 w-4' />
          </div>
          <div>
            <span className='font-medium text-sm'>Chatting with {workflowName}</span>
            <p className='text-muted-foreground text-xs'>Conversational workflow mode</p>
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleModeSwitch('visual')}
        disabled={disabled || loading || isTransitioning}
        className='gap-2'
      >
        <Eye className='h-4 w-4' />
        Visual Editor
      </Button>
    </div>
  )
}

/**
 * Compact Chat Mode Indicator
 *
 * Shows current mode and allows quick switching - for smaller spaces
 */
interface ChatModeIndicatorProps {
  workflowName: string
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
  className?: string
}

export function ChatModeIndicator({
  workflowName,
  currentMode,
  onModeChange,
  className,
}: ChatModeIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className='flex rounded-md border p-1'>
        <Button
          variant={currentMode === 'visual' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('visual')}
          className='h-7 px-2 text-xs'
        >
          <Eye className='mr-1 h-3 w-3' />
          Visual
        </Button>
        <Button
          variant={currentMode === 'chat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('chat')}
          className='h-7 px-2 text-xs'
        >
          <MessageSquare className='mr-1 h-3 w-3' />
          Chat
        </Button>
      </div>
      {currentMode === 'chat' && (
        <span className='text-muted-foreground text-xs'>
          Chatting with {workflowName}
        </span>
      )}
    </div>
  )
}