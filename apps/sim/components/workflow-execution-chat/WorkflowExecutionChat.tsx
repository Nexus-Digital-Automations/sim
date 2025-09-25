'use client'

/**
 * WorkflowExecutionChat Component
 * ===============================
 *
 * Real-time chat interface for workflow execution that displays step-by-step
 * progress updates as conversational messages. Provides interactive controls
 * for pausing, resuming, and debugging workflow execution.
 *
 * Features:
 * - Real-time execution status streaming via WebSocket/Socket.io
 * - Conversational progress updates with visual indicators
 * - Interactive workflow controls (pause, resume, stop, debug)
 * - Progress tracking with time estimates and performance metrics
 * - Error handling with recovery suggestions
 * - Exportable execution logs
 * - Responsive design following existing chat UI patterns
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  Clock,
  Download,
  Eye,
  EyeOff,
  Info,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import type {
  ConversationalMessage,
  ExecutionProgress,
  WorkflowChatCommand,
  WorkflowExecution,
  WorkflowExecutionChatProps,
  WorkflowExecutionStatus,
} from '@/types/workflow-execution-chat'
import { useWorkflowExecutionChat } from './hooks/useWorkflowExecutionChat'

const logger = createLogger('WorkflowExecutionChat')

/**
 * Main WorkflowExecutionChat component
 */
export function WorkflowExecutionChat({
  journey,
  workspaceId,
  userId,
  socketClient,
  initialStatus = 'idle',
  onExecutionComplete,
  onExecutionError,
  onChatCommand,
  className,
  showDebugInfo = false,
  enableCommands = true,
  maxMessages = 200,
  autoStart = false,
}: WorkflowExecutionChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const {
    execution,
    chatState,
    messages,
    startExecution,
    stopExecution,
    pauseExecution,
    resumeExecution,
    sendCommand,
    clearMessages,
    updateChatState,
    getExecutionStatus,
    isExecutionActive,
    exportLog,
  } = useWorkflowExecutionChat({
    journey,
    workspaceId,
    userId,
    socketClient,
    onExecutionComplete,
    onExecutionError,
    onChatCommand,
    showDebugInfo,
    maxMessages,
  })

  // Auto-scroll to latest messages
  const scrollToBottom = useCallback(() => {
    if (chatState.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatState.autoScroll])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-start execution if enabled
  useEffect(() => {
    if (autoStart && getExecutionStatus() === 'idle') {
      logger.info('Auto-starting workflow execution', { journeyId: journey.id })
      startExecution(journey)
    }
  }, [autoStart, journey, startExecution, getExecutionStatus])

  // Handle command execution
  const handleCommand = async (command: WorkflowChatCommand, parameters?: any) => {
    logger.info('Executing chat command', { command, parameters })
    try {
      await sendCommand(command, parameters)
    } catch (error) {
      logger.error('Failed to execute chat command', { command, error })
    }
  }

  // Export execution log
  const handleExport = () => {
    try {
      const log = exportLog('json')
      const blob = new Blob([log], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workflow-execution-${journey.id}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      logger.info('Execution log exported successfully')
    } catch (error) {
      logger.error('Failed to export execution log', error)
    }
  }

  // Toggle chat expansion
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    logger.debug('Chat expansion toggled', { isExpanded: !isExpanded })
  }

  return (
    <Card className={cn('flex h-full max-h-[80vh] min-h-[400px] flex-col', className)}>
      {/* Chat Header */}
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <MessageSquare className='h-5 w-5 text-blue-600' />
            <div>
              <h3 className='font-semibold text-gray-900'>{journey.title}</h3>
              <div className='flex items-center space-x-2 text-gray-500 text-sm'>
                <ExecutionStatusIndicator
                  status={getExecutionStatus()}
                  progress={
                    execution?.messages.length ? getProgressFromMessages(messages) : undefined
                  }
                />
                {chatState.isConnected && (
                  <>
                    <span>•</span>
                    <span className='text-green-600'>Real-time</span>
                  </>
                )}
                {execution && (
                  <>
                    <span>•</span>
                    <span>{execution.messages.length} messages</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-1'>
            {/* Execution Controls */}
            {enableCommands && (
              <ExecutionControls
                status={getExecutionStatus()}
                isActive={isExecutionActive()}
                onStart={() => startExecution(journey)}
                onPause={() => handleCommand('pause')}
                onResume={() => handleCommand('resume')}
                onStop={() => handleCommand('stop')}
                onRetry={() => handleCommand('retry')}
                onSkip={() => handleCommand('skip')}
                onDebug={() => handleCommand('debug')}
              />
            )}

            {/* Settings and Export */}
            <div className='ml-2 flex items-center space-x-1 border-l pl-2'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => updateChatState({ showDebugInfo: !chatState.showDebugInfo })}
                  >
                    {chatState.showDebugInfo ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {chatState.showDebugInfo ? 'Hide debug info' : 'Show debug info'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleExport}
                    disabled={messages.length === 0}
                  >
                    <Download className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export execution log</TooltipContent>
              </Tooltip>

              <Button variant='ghost' size='sm' onClick={toggleExpanded}>
                {isExpanded ? '−' : '+'}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {execution && isExpanded && (
          <div className='mt-3'>
            <ExecutionProgressBar execution={execution} />
          </div>
        )}
      </CardHeader>

      {/* Messages Area */}
      {isExpanded && (
        <CardContent className='flex flex-1 flex-col p-0'>
          <ScrollArea className='flex-1 px-4'>
            <div className='space-y-3 py-2'>
              {messages.length === 0 ? (
                <EmptyState
                  status={getExecutionStatus()}
                  onStart={() => startExecution(journey)}
                  enableStart={enableCommands}
                />
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    showDebugInfo={chatState.showDebugInfo}
                    onRetry={() => handleCommand('retry', { stepId: message.metadata.stepId })}
                    onSkip={() => handleCommand('skip', { stepId: message.metadata.stepId })}
                    onDebug={() => handleCommand('debug', { stepId: message.metadata.stepId })}
                    enableCommands={enableCommands}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Connection Status */}
          {chatState.connectionError && (
            <div className='border-t bg-red-50 p-3'>
              <div className='flex items-center space-x-2 text-red-600 text-sm'>
                <XCircle className='h-4 w-4' />
                <span>Connection Error: {chatState.connectionError}</span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Execution status indicator component
 */
function ExecutionStatusIndicator({
  status,
  progress,
}: {
  status: WorkflowExecutionStatus
  progress?: ExecutionProgress
}) {
  const getStatusConfig = (status: WorkflowExecutionStatus) => {
    switch (status) {
      case 'idle':
        return {
          label: 'Ready',
          color: 'bg-gray-500',
          icon: Clock,
          variant: 'secondary' as const,
        }
      case 'starting':
        return {
          label: 'Starting...',
          color: 'bg-blue-500',
          icon: Play,
          variant: 'default' as const,
        }
      case 'running':
        return {
          label: progress ? `Step ${progress.currentStep}/${progress.totalSteps}` : 'Running...',
          color: 'bg-blue-500 animate-pulse',
          icon: Play,
          variant: 'default' as const,
        }
      case 'paused':
        return {
          label: 'Paused',
          color: 'bg-yellow-500',
          icon: Pause,
          variant: 'secondary' as const,
        }
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-green-500',
          icon: CheckCircle,
          variant: 'default' as const,
        }
      case 'failed':
        return {
          label: 'Failed',
          color: 'bg-red-500',
          icon: XCircle,
          variant: 'destructive' as const,
        }
      case 'stopped':
        return {
          label: 'Stopped',
          color: 'bg-gray-500',
          icon: Square,
          variant: 'secondary' as const,
        }
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-500',
          icon: AlertTriangle,
          variant: 'secondary' as const,
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className='flex items-center space-x-1'>
      <div className={cn('h-2 w-2 rounded-full', config.color)} />
      <Icon className='h-3 w-3' />
      <span>{config.label}</span>
    </Badge>
  )
}

/**
 * Execution controls component
 */
function ExecutionControls({
  status,
  isActive,
  onStart,
  onPause,
  onResume,
  onStop,
  onRetry,
  onSkip,
  onDebug,
}: {
  status: WorkflowExecutionStatus
  isActive: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onRetry: () => void
  onSkip: () => void
  onDebug: () => void
}) {
  return (
    <div className='flex items-center space-x-1'>
      {status === 'idle' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='default' size='sm' onClick={onStart}>
              <Play className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start execution</TooltipContent>
        </Tooltip>
      )}

      {status === 'running' && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='sm' onClick={onPause}>
                <Pause className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pause execution</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='destructive' size='sm' onClick={onStop}>
                <Square className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop execution</TooltipContent>
          </Tooltip>
        </>
      )}

      {status === 'paused' && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='default' size='sm' onClick={onResume}>
                <Play className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resume execution</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='destructive' size='sm' onClick={onStop}>
                <Square className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop execution</TooltipContent>
          </Tooltip>
        </>
      )}

      {(status === 'failed' || status === 'error') && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='sm' onClick={onRetry}>
                <RotateCcw className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retry current step</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='sm' onClick={onSkip}>
                <SkipForward className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Skip current step</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='sm' onClick={onDebug}>
                <Bug className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Debug current step</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  )
}

/**
 * Progress bar component for execution
 */
function ExecutionProgressBar({ execution }: { execution: WorkflowExecution }) {
  const progress = getProgressFromMessages(execution.messages)

  return (
    <div className='space-y-2'>
      <div className='flex justify-between text-sm'>
        <span className='text-gray-600'>
          Progress: {progress.currentStep} of {progress.totalSteps} steps
        </span>
        <span className='text-gray-600'>{progress.percentComplete.toFixed(0)}% complete</span>
      </div>
      <Progress value={progress.percentComplete} className='h-2' />
      {execution.estimatedTimeRemaining && (
        <div className='text-gray-500 text-xs'>
          Estimated time remaining: {formatDuration(execution.estimatedTimeRemaining)}
        </div>
      )}
    </div>
  )
}

/**
 * Individual chat message component
 */
function ChatMessage({
  message,
  showDebugInfo,
  onRetry,
  onSkip,
  onDebug,
  enableCommands,
}: {
  message: ConversationalMessage
  showDebugInfo: boolean
  onRetry: () => void
  onSkip: () => void
  onDebug: () => void
  enableCommands: boolean
}) {
  const getMessageIcon = (type: ConversationalMessage['type']) => {
    switch (type) {
      case 'system':
        return <Info className='h-4 w-4 text-blue-500' />
      case 'progress':
        return <Clock className='h-4 w-4 text-blue-500' />
      case 'result':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'error':
        return <XCircle className='h-4 w-4 text-red-500' />
      case 'warning':
        return <AlertTriangle className='h-4 w-4 text-yellow-500' />
      default:
        return <Info className='h-4 w-4 text-gray-500' />
    }
  }

  const getMessageStyle = (type: ConversationalMessage['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'result':
        return 'border-green-200 bg-green-50'
      case 'progress':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className={cn('rounded-lg border p-3', getMessageStyle(message.type))}>
      <div className='flex items-start space-x-2'>
        {getMessageIcon(message.type)}
        <div className='min-w-0 flex-1'>
          <div className='prose prose-sm max-w-none'>
            <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
          </div>

          {/* Message Actions */}
          {message.metadata.userActionRequired && enableCommands && (
            <div className='mt-2 flex items-center space-x-2'>
              {message.metadata.canRetry && (
                <Button variant='outline' size='sm' onClick={onRetry}>
                  <RotateCcw className='mr-1 h-3 w-3' />
                  Retry
                </Button>
              )}
              {message.metadata.canSkip && (
                <Button variant='outline' size='sm' onClick={onSkip}>
                  <SkipForward className='mr-1 h-3 w-3' />
                  Skip
                </Button>
              )}
              {message.metadata.canDebug && (
                <Button variant='outline' size='sm' onClick={onDebug}>
                  <Bug className='mr-1 h-3 w-3' />
                  Debug
                </Button>
              )}
            </div>
          )}

          {/* Debug Information */}
          {showDebugInfo && (
            <details className='mt-2'>
              <summary className='cursor-pointer text-gray-500 text-xs hover:text-gray-700'>
                Debug Info
              </summary>
              <pre className='mt-1 overflow-x-auto rounded bg-gray-100 p-2 text-xs'>
                {JSON.stringify(message.metadata, null, 2)}
              </pre>
            </details>
          )}

          {/* Timestamp */}
          <div className='mt-1 text-gray-500 text-xs'>
            {formatTimestamp(message.timestamp)}
            {message.metadata.executionTime && (
              <span className='ml-2'>({formatDuration(message.metadata.executionTime)})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state when no messages
 */
function EmptyState({
  status,
  onStart,
  enableStart,
}: {
  status: WorkflowExecutionStatus
  onStart: () => void
  enableStart: boolean
}) {
  if (status !== 'idle') {
    return (
      <div className='py-8 text-center'>
        <div className='animate-pulse'>
          <div className='mx-auto mb-2 h-8 w-8 rounded-full bg-blue-500' />
        </div>
        <p className='text-gray-500'>Initializing workflow execution...</p>
      </div>
    )
  }

  return (
    <div className='py-8 text-center'>
      <MessageSquare className='mx-auto mb-4 h-12 w-12 text-gray-400' />
      <h3 className='mb-2 font-medium text-gray-900 text-lg'>Ready to Execute</h3>
      <p className='mb-4 text-gray-500'>
        Start the workflow execution to see real-time progress updates.
      </p>
      {enableStart && (
        <Button onClick={onStart}>
          <Play className='mr-2 h-4 w-4' />
          Start Execution
        </Button>
      )}
    </div>
  )
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Extract progress information from messages
 */
function getProgressFromMessages(messages: ConversationalMessage[]): ExecutionProgress {
  // Find the latest progress message
  const progressMessages = messages.filter((m) => m.metadata.progressData)
  const latestProgress = progressMessages[progressMessages.length - 1]?.metadata.progressData

  if (latestProgress) {
    return latestProgress
  }

  // Fallback: calculate from message types
  const resultMessages = messages.filter((m) => m.type === 'result').length
  const errorMessages = messages.filter((m) => m.type === 'error').length
  const totalMessages = messages.length

  return {
    currentStep: resultMessages + errorMessages,
    totalSteps: Math.max(totalMessages, 1),
    percentComplete:
      totalMessages > 0 ? ((resultMessages + errorMessages) / totalMessages) * 100 : 0,
    stepsCompleted: resultMessages,
    stepsFailed: errorMessages,
    stepsSkipped: 0,
  }
}

/**
 * Format message content with markdown support
 */
function formatMessageContent(content: string): string {
  // Basic markdown formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/\n/g, '<br>')
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
