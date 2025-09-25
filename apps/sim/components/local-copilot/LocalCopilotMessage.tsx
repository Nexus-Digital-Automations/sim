/**
 * Local Copilot Message Component
 *
 * Displays individual messages in the local copilot conversation,
 * including user messages, assistant responses, tool calls, and
 * file attachments with proper formatting and interaction support.
 */

'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Code,
  FileText,
  Image,
  Loader2,
  User,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import type { Agent } from '@/services/parlant/types'
import type {
  LocalCopilotToolCall,
  MessageFileAttachment,
  LocalCopilotMessage as MessageType,
} from '@/stores/local-copilot/types'

const logger = createLogger('LocalCopilotMessage')

interface LocalCopilotMessageProps {
  message: MessageType
  isStreaming?: boolean
  selectedAgent?: Agent | null
  className?: string
  showTimestamp?: boolean
  showAvatar?: boolean
  compact?: boolean
}

interface ToolCallDisplayProps {
  toolCall: LocalCopilotToolCall
  compact?: boolean
}

interface FileAttachmentDisplayProps {
  attachment: MessageFileAttachment
  compact?: boolean
}

// Tool call display component
const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCall, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStateIcon = () => {
    switch (toolCall.state) {
      case 'pending':
        return <Clock className='h-3 w-3 text-muted-foreground' />
      case 'executing':
        return <Loader2 className='h-3 w-3 animate-spin text-blue-500' />
      case 'success':
        return <CheckCircle className='h-3 w-3 text-green-500' />
      case 'error':
        return <AlertTriangle className='h-3 w-3 text-red-500' />
      default:
        return <Zap className='h-3 w-3 text-muted-foreground' />
    }
  }

  const getStateBadge = () => {
    const variants = {
      pending: 'secondary',
      executing: 'default',
      success: 'default',
      error: 'destructive',
    } as const

    const colors = {
      pending: 'text-muted-foreground',
      executing: 'text-blue-600',
      success: 'text-green-600',
      error: 'text-red-600',
    }

    return (
      <Badge
        variant={variants[toolCall.state] as any}
        className={cn('text-xs', colors[toolCall.state])}
      >
        {toolCall.state}
      </Badge>
    )
  }

  const formatToolName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (compact) {
    return (
      <div className='flex items-center gap-2 rounded-md border bg-muted/50 p-2'>
        {getStateIcon()}
        <span className='font-medium text-xs'>{formatToolName(toolCall.name)}</span>
        {getStateBadge()}
      </div>
    )
  }

  return (
    <Card className='border-l-4 border-l-primary/30'>
      <CardContent className='p-3'>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant='ghost' className='h-auto w-full justify-between p-0 font-normal'>
              <div className='flex items-center gap-2'>
                {getStateIcon()}
                <span className='font-medium text-sm'>{formatToolName(toolCall.name)}</span>
                {getStateBadge()}
              </div>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className='space-y-2'>
            <Separator className='my-2' />

            {/* Arguments */}
            {toolCall.arguments && Object.keys(toolCall.arguments).length > 0 && (
              <div>
                <div className='mb-1 font-medium text-muted-foreground text-xs'>Arguments:</div>
                <ScrollArea className='max-h-24'>
                  <pre className='whitespace-pre-wrap text-muted-foreground text-xs'>
                    {JSON.stringify(toolCall.arguments, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* Result */}
            {toolCall.state === 'success' && toolCall.result && (
              <div>
                <div className='mb-1 font-medium text-muted-foreground text-xs'>Result:</div>
                <ScrollArea className='max-h-32'>
                  <pre className='whitespace-pre-wrap text-muted-foreground text-xs'>
                    {typeof toolCall.result === 'string'
                      ? toolCall.result
                      : JSON.stringify(toolCall.result, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* Error */}
            {toolCall.state === 'error' && toolCall.error && (
              <div>
                <div className='mb-1 font-medium text-red-600 text-xs'>Error:</div>
                <div className='text-red-600 text-xs'>{toolCall.error}</div>
              </div>
            )}

            {/* Duration */}
            {toolCall.duration && (
              <div className='text-muted-foreground text-xs'>Duration: {toolCall.duration}ms</div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

// File attachment display component
const FileAttachmentDisplay: React.FC<FileAttachmentDisplayProps> = ({
  attachment,
  compact = false,
}) => {
  const getFileIcon = () => {
    if (attachment.media_type.startsWith('image/')) {
      return <Image className='h-4 w-4 text-blue-500' />
    }
    if (attachment.media_type.includes('text') || attachment.media_type.includes('json')) {
      return <FileText className='h-4 w-4 text-green-500' />
    }
    if (
      attachment.media_type.includes('code') ||
      attachment.filename.match(/\.(js|ts|py|java|cpp|c|rs|go)$/)
    ) {
      return <Code className='h-4 w-4 text-purple-500' />
    }
    return <FileText className='h-4 w-4 text-muted-foreground' />
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`
  }

  if (compact) {
    return (
      <div className='flex items-center gap-2 rounded-md border bg-muted/50 p-2'>
        {getFileIcon()}
        <span className='truncate font-medium text-xs'>{attachment.filename}</span>
        <Badge variant='secondary' className='text-xs'>
          {formatFileSize(attachment.size)}
        </Badge>
      </div>
    )
  }

  return (
    <div className='flex items-center gap-3 rounded-md border bg-muted/50 p-3'>
      <div className='flex h-10 w-10 items-center justify-center rounded-md bg-background'>
        {getFileIcon()}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='truncate font-medium text-sm'>{attachment.filename}</div>
        <div className='text-muted-foreground text-xs'>
          {attachment.media_type} • {formatFileSize(attachment.size)}
        </div>
      </div>
    </div>
  )
}

export const LocalCopilotMessage: React.FC<LocalCopilotMessageProps> = ({
  message,
  isStreaming = false,
  selectedAgent,
  className = '',
  showTimestamp = true,
  showAvatar = true,
  compact = false,
}) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'

  // Format timestamp
  const timestamp = useMemo(() => {
    if (!showTimestamp) return null
    return new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [message.timestamp, showTimestamp])

  // Get avatar icon
  const getAvatarIcon = () => {
    if (isUser) return <User className='h-4 w-4' />
    if (isAssistant) return <Bot className='h-4 w-4' />
    return <Zap className='h-4 w-4' />
  }

  // Get message styling
  const messageClasses = cn(
    'flex gap-3 p-4',
    {
      'bg-muted/30': isSystem,
      'bg-transparent': !isSystem,
    },
    className
  )

  const contentClasses = cn('flex-1 space-y-2', compact ? 'space-y-1' : 'space-y-2')

  // Split content by lines for better rendering
  const contentLines = message.content.split('\n').filter((line) => line.trim())

  return (
    <TooltipProvider>
      <div className={messageClasses}>
        {/* Avatar */}
        {showAvatar && (
          <div
            className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', {
              'bg-primary text-primary-foreground': isUser,
              'bg-secondary text-secondary-foreground': isAssistant,
              'bg-muted text-muted-foreground': isSystem,
            })}
          >
            {getAvatarIcon()}
          </div>
        )}

        <div className={contentClasses}>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span
                className={cn('font-medium text-sm', {
                  'text-primary': isUser,
                  'text-foreground': isAssistant,
                  'text-muted-foreground': isSystem,
                })}
              >
                {isUser && 'You'}
                {isAssistant && (message.agentName || selectedAgent?.name || 'Assistant')}
                {isSystem && 'System'}
              </span>

              {isStreaming && (
                <div className='flex items-center gap-1'>
                  <Loader2 className='h-3 w-3 animate-spin text-blue-500' />
                  <span className='text-blue-600 text-xs'>Thinking...</span>
                </div>
              )}
            </div>

            {timestamp && (
              <Tooltip>
                <TooltipTrigger>
                  <span className='text-muted-foreground text-xs'>{timestamp}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{new Date(message.timestamp).toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* File Attachments */}
          {message.fileAttachments && message.fileAttachments.length > 0 && (
            <div className='space-y-2'>
              {message.fileAttachments.map((attachment) => (
                <FileAttachmentDisplay
                  key={attachment.id}
                  attachment={attachment}
                  compact={compact}
                />
              ))}
            </div>
          )}

          {/* Contexts */}
          {message.contexts && message.contexts.length > 0 && (
            <div className='space-y-1'>
              <div className='text-muted-foreground text-xs'>Context:</div>
              <div className='flex flex-wrap gap-1'>
                {message.contexts.map((context, index) => (
                  <Badge key={index} variant='outline' className='text-xs'>
                    {context.kind}: {context.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message Content */}
          {message.content && (
            <div className='space-y-1'>
              {contentLines.map((line, index) => (
                <p key={index} className='whitespace-pre-wrap text-sm leading-relaxed'>
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Tool Calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className='space-y-2'>
              <div className='font-medium text-muted-foreground text-xs'>
                Tool Calls ({message.toolCalls.length})
              </div>
              <div className='space-y-2'>
                {message.toolCalls.map((toolCall) => (
                  <ToolCallDisplay key={toolCall.id} toolCall={toolCall} compact={compact} />
                ))}
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && message.content && (
            <div className='flex items-center gap-1 text-muted-foreground text-xs'>
              <div className='h-1 w-1 animate-pulse rounded-full bg-current' />
              <div
                className='h-1 w-1 animate-pulse rounded-full bg-current'
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className='h-1 w-1 animate-pulse rounded-full bg-current'
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
