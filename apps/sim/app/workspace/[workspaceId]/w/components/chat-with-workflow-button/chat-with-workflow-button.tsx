'use client'

import { useState } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ChatWithWorkflowButton')

export interface ChatWithWorkflowButtonProps {
  workflowId: string
  workflowName: string
  onChatClick: (workflowId: string) => void
  variant?: 'default' | 'compact' | 'icon-only'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
  showTooltip?: boolean
}

/**
 * Chat with Workflow Button Component
 *
 * Provides a consistent interface for initiating conversational interaction with workflows.
 * Supports multiple variants for different contexts (sidebar, cards, main interface).
 */
export function ChatWithWorkflowButton({
  workflowId,
  workflowName,
  onChatClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  className,
  showTooltip = true,
}: ChatWithWorkflowButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (disabled || loading) return

    logger.info('Chat with workflow initiated', {
      workflowId,
      workflowName,
      variant,
    })

    onChatClick(workflowId)
  }

  const buttonContent = () => {
    if (loading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {variant !== 'icon-only' && <span>Starting...</span>}
        </>
      )
    }

    switch (variant) {
      case 'compact':
        return (
          <>
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </>
        )
      case 'icon-only':
        return <MessageSquare className="h-4 w-4" />
      default:
        return (
          <>
            <MessageSquare className="h-4 w-4" />
            <span>Chat with Workflow</span>
          </>
        )
    }
  }

  const getButtonProps = () => {
    const baseProps = {
      onClick: handleClick,
      disabled: disabled || loading,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      'aria-label': `Start conversation with ${workflowName} workflow`,
    }

    switch (variant) {
      case 'compact':
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size: size === 'default' ? 'sm' : size,
          className: cn(
            'gap-1.5 h-7 px-2 text-xs font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:ring-1 focus-visible:ring-ring',
            isHovered && 'bg-accent/50',
            className
          ),
        }
      case 'icon-only':
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size: 'icon' as const,
          className: cn(
            'h-8 w-8 transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:ring-1 focus-visible:ring-ring',
            size === 'sm' && 'h-6 w-6',
            size === 'lg' && 'h-10 w-10',
            className
          ),
        }
      default:
        return {
          ...baseProps,
          variant: 'outline' as const,
          size,
          className: cn(
            'gap-2 transition-all duration-200',
            'hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20',
            'focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-50 disabled:pointer-events-none',
            className
          ),
        }
    }
  }

  const button = <Button {...getButtonProps()}>{buttonContent()}</Button>

  if (showTooltip && (variant === 'icon-only' || variant === 'compact')) {
    return (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={4}
          className="text-sm"
        >
          <p>Chat with {workflowName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a conversation about this workflow
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
}

/**
 * Hook to manage chat with workflow state and navigation
 */
export function useChatWithWorkflow() {
  const [activeChatWorkflowId, setActiveChatWorkflowId] = useState<string | null>(null)

  const startChat = (workflowId: string) => {
    logger.info('Starting chat with workflow', { workflowId })
    setActiveChatWorkflowId(workflowId)

    // In the future, this could navigate to a chat interface or open a modal
    // For now, we'll just track the active chat workflow
    // TODO: Integrate with actual chat routing when chat routes are implemented
  }

  const endChat = () => {
    logger.info('Ending chat with workflow', { workflowId: activeChatWorkflowId })
    setActiveChatWorkflowId(null)
  }

  return {
    activeChatWorkflowId,
    startChat,
    endChat,
    isChattingWithWorkflow: (workflowId: string) => activeChatWorkflowId === workflowId,
  }
}