/**
 * Nexus AI Assistant - Advanced Workflow Copilot
 * Enhanced version of Sim's copilot with comprehensive API integration
 * Provides superior AI capabilities with tool orchestration and context intelligence
 * Created: 2025-09-03
 */

'use client'

import * as React from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useChat } from 'ai/react'
import {
  AlertCircle,
  ArrowDown,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  FileText,
  Loader2,
  Send,
  Settings,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingAgent } from '@/components/ui/loading-agent'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'

const logger = createLogger('NexusUI')

interface NexusMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  toolInvocations?: ToolCall[]
  metadata?: {
    operationId?: string
    executionTime?: number
    tokensUsed?: number
  }
}

interface ToolCall {
  id: string
  toolCallId: string
  toolName: string
  state: 'call' | 'result' | 'error'
  args?: any
  result?: any
  error?: string
  executionTime?: number
}

interface NexusProps {
  panelWidth: number
}

interface NexusRef {
  createNewChat: () => void
}

/**
 * Tool Result Renderer Component
 * Specialized UI components for visualizing different tool execution results
 */
function ToolResultRenderer({
  toolName,
  result,
  status,
  executionTime,
}: {
  toolName: string
  result: any
  status: 'success' | 'error' | 'executing'
  executionTime?: number
}) {
  if (status === 'executing') {
    return (
      <Card className='mt-2 border-l-4 border-l-blue-400'>
        <CardContent className='p-3'>
          <div className='flex items-center gap-2 text-blue-600 text-sm'>
            <Clock className='h-4 w-4 animate-pulse' />
            Executing {toolName}...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <Card className='mt-2 border-l-4 border-l-red-400'>
        <CardContent className='p-3'>
          <div className='flex items-center gap-2 text-red-600 text-sm'>
            <AlertCircle className='h-4 w-4' />
            {toolName} failed: {result?.message || 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success status - render based on tool type
  switch (toolName) {
    case 'listWorkflows':
      return <WorkflowListResult result={result} executionTime={executionTime} />
    case 'executeWorkflow':
      return <WorkflowExecutionResult result={result} executionTime={executionTime} />
    case 'searchKnowledge':
      return <KnowledgeSearchResult result={result} executionTime={executionTime} />
    case 'billingOperations':
      return <BillingResult result={result} executionTime={executionTime} />
    case 'manageFiles':
      return <FileManagementResult result={result} executionTime={executionTime} />
    default:
      return <GenericToolResult toolName={toolName} result={result} executionTime={executionTime} />
  }
}

/**
 * Workflow List Result Component
 * Displays workflow search and listing results in an organized table format
 */
function WorkflowListResult({ result, executionTime }: { result: any; executionTime?: number }) {
  const workflows = result?.workflows || []

  return (
    <Card className='mt-2 border-l-4 border-l-green-400'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <CheckCircle className='h-4 w-4 text-green-500' />
          Found {workflows.length} workflows
          {executionTime && (
            <Badge variant='outline' className='text-xs'>
              {executionTime}ms
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='max-h-40 space-y-2 overflow-y-auto'>
          {workflows.map((workflow: any) => (
            <div
              key={workflow.id}
              className='flex items-center justify-between rounded bg-gray-50 p-2'
            >
              <div className='min-w-0 flex-1'>
                <div className='truncate font-medium text-sm'>{workflow.name}</div>
                <div className='truncate text-gray-500 text-xs'>{workflow.description}</div>
              </div>
              <Badge
                variant={workflow.status === 'published' ? 'default' : 'secondary'}
                className='ml-2 flex-shrink-0'
              >
                {workflow.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Workflow Execution Result Component
 * Shows the results of workflow execution with detailed status and output information
 */
function WorkflowExecutionResult({
  result,
  executionTime,
}: {
  result: any
  executionTime?: number
}) {
  return (
    <Card className='mt-2 border-l-4 border-l-blue-400'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <Zap className='h-4 w-4 text-blue-500' />
          Workflow Execution
          {executionTime && (
            <Badge variant='outline' className='text-xs'>
              {executionTime}ms
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm'>Status:</span>
            <Badge
              variant={
                result.status === 'success'
                  ? 'default'
                  : result.status === 'error'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {result.status}
            </Badge>
          </div>
          {result.executionId && (
            <div className='text-gray-500 text-xs'>Execution ID: {result.executionId}</div>
          )}
          {result.output && (
            <div className='mt-2'>
              <div className='mb-1 font-medium text-sm'>Output:</div>
              <pre className='max-h-32 overflow-x-auto overflow-y-auto rounded bg-gray-100 p-2 text-xs'>
                {JSON.stringify(result.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Knowledge Search Result Component
 * Displays search results from knowledge base with relevance scores and snippets
 */
function KnowledgeSearchResult({ result, executionTime }: { result: any; executionTime?: number }) {
  const results = result?.results || []

  return (
    <Card className='mt-2 border-l-4 border-l-purple-400'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <FileText className='h-4 w-4 text-purple-500' />
          Knowledge Search - {results.length} results
          {executionTime && (
            <Badge variant='outline' className='text-xs'>
              {executionTime}ms
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='max-h-40 space-y-2 overflow-y-auto'>
          {results.map((item: any, index: number) => (
            <div key={index} className='rounded bg-purple-50 p-2'>
              <div className='font-medium text-sm'>{item.title}</div>
              <div className='mt-1 text-gray-600 text-xs'>{item.snippet}</div>
              {item.relevanceScore && (
                <div className='mt-1 flex items-center gap-2'>
                  <span className='text-gray-500 text-xs'>Relevance:</span>
                  <Progress value={item.relevanceScore * 100} className='h-1 max-w-20 flex-1' />
                  <span className='text-gray-500 text-xs'>
                    {Math.round(item.relevanceScore * 100)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Billing Result Component
 * Shows usage analytics, limits, and billing information with progress bars
 */
function BillingResult({ result, executionTime }: { result: any; executionTime?: number }) {
  if (result.action === 'getBillingLimits') {
    const { currentUsage = {}, limits = {}, utilizationPercentage = {} } = result

    return (
      <Card className='mt-2 border-l-4 border-l-blue-400'>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm'>
            <TrendingUp className='h-4 w-4 text-blue-500' />
            Usage & Limits
            {executionTime && (
              <Badge variant='outline' className='text-xs'>
                {executionTime}ms
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-3'>
            <div>
              <div className='mb-1 flex justify-between text-sm'>
                <span>API Calls</span>
                <span>
                  {currentUsage.apiCalls || 0} / {limits.apiCalls || 'N/A'}
                </span>
              </div>
              <Progress value={utilizationPercentage.apiCalls || 0} className='h-2' />
            </div>
            <div>
              <div className='mb-1 flex justify-between text-sm'>
                <span>Storage</span>
                <span>
                  {currentUsage.storageGB || 0}GB / {limits.storageGB || 'N/A'}GB
                </span>
              </div>
              <Progress value={utilizationPercentage.storage || 0} className='h-2' />
            </div>
            <div>
              <div className='mb-1 flex justify-between text-sm'>
                <span>Compute</span>
                <span>
                  {currentUsage.computeMinutes || 0}min / {limits.computeMinutes || 'N/A'}min
                </span>
              </div>
              <Progress value={utilizationPercentage.compute || 0} className='h-2' />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <GenericToolResult toolName='billingOperations' result={result} executionTime={executionTime} />
  )
}

/**
 * File Management Result Component
 * Shows file operations results including uploads, downloads, and management actions
 */
function FileManagementResult({ result, executionTime }: { result: any; executionTime?: number }) {
  return (
    <Card className='mt-2 border-l-4 border-l-orange-400'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <Database className='h-4 w-4 text-orange-500' />
          File Operation
          {executionTime && (
            <Badge variant='outline' className='text-xs'>
              {executionTime}ms
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='space-y-2'>
          <div className='text-sm'>
            <span className='font-medium'>Action:</span> {result.action || 'Unknown'}
          </div>
          {result.files && (
            <div>
              <div className='mb-1 font-medium text-sm'>Files:</div>
              <div className='space-y-1'>
                {result.files.map((file: any, index: number) => (
                  <div key={index} className='rounded bg-orange-50 p-2 text-xs'>
                    {file.name || file.path || 'Unknown file'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Generic Tool Result Component
 * Fallback component for tool results that don't have specialized renderers
 */
function GenericToolResult({
  toolName,
  result,
  executionTime,
}: {
  toolName: string
  result: any
  executionTime?: number
}) {
  return (
    <Card className='mt-2 border-l-4 border-l-gray-400'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <CheckCircle className='h-4 w-4 text-green-500' />
          {toolName} completed
          {executionTime && (
            <Badge variant='outline' className='text-xs'>
              {executionTime}ms
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0'>
        <pre className='max-h-40 overflow-x-auto overflow-y-auto rounded bg-gray-100 p-3 text-xs'>
          {JSON.stringify(result, null, 2)}
        </pre>
      </CardContent>
    </Card>
  )
}

/**
 * Main Nexus Component
 * Advanced AI assistant interface with enhanced workflow integration capabilities
 */
export const Nexus = forwardRef<NexusRef, NexusProps>(({ panelWidth }, ref) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const { activeWorkflowId } = useWorkflowRegistry()

  // Enhanced useChat with Nexus endpoint
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    setMessages,
  } = useChat({
    api: '/api/nexus/chat', // Nexus-specific endpoint
    initialMessages: [],
    body: {
      workspaceId: activeWorkflowId, // Using workflow ID as workspace context
      workflowId: activeWorkflowId,
    },
    onResponse: (response) => {
      logger.info('Nexus response received', {
        status: response.status,
        operationId: response.headers.get('X-Operation-ID'),
      })
    },
    onError: (error) => {
      logger.error('Nexus chat error', { error: error.message })
    },
  })

  // Initialize component when workflow is available
  useEffect(() => {
    if (activeWorkflowId && !isInitialized) {
      setIsInitialized(true)
      logger.info('Nexus initialized for workflow', { workflowId: activeWorkflowId })
    }
  }, [activeWorkflowId, isInitialized])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement && isNearBottom) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, isNearBottom])

  // Handle scroll events to track user position
  const handleScroll = useCallback(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]')
    if (!viewport) return

    const { scrollTop, scrollHeight, clientHeight } = viewport
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Consider "near bottom" if within 100px of bottom
    const nearBottom = distanceFromBottom <= 100
    setIsNearBottom(nearBottom)
    setShowScrollButton(!nearBottom)
  }, [])

  // Attach scroll listener
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]')
    if (!viewport) return

    viewport.addEventListener('scroll', handleScroll, { passive: true })

    // Initial scroll state check
    setTimeout(handleScroll, 100)

    return () => {
      viewport.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth',
        })
      }
    }
  }, [])

  // Handle new chat creation
  const handleStartNewChat = useCallback(() => {
    setMessages([])
    logger.info('Started new Nexus chat')
  }, [setMessages])

  // Expose functions to parent
  useImperativeHandle(
    ref,
    () => ({
      createNewChat: handleStartNewChat,
    }),
    [handleStartNewChat]
  )

  // Enhanced message rendering with tool call visualization
  const renderMessage = (message: any) => {
    const isUser = message.role === 'user'
    const isNexus = message.role === 'assistant'

    return (
      <div
        key={message.id}
        className={cn('flex gap-3 rounded-lg p-4', isUser ? 'ml-8 bg-blue-50' : 'mr-8 bg-gray-50')}
      >
        <div className='flex-shrink-0'>
          {isUser ? (
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-500'>
              <User className='h-4 w-4 text-white' />
            </div>
          ) : (
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500'>
              <Zap className='h-4 w-4 text-white' />
            </div>
          )}
        </div>

        <div className='min-w-0 flex-grow'>
          <div className='mb-1 flex items-center gap-2'>
            <span className='font-medium text-sm'>{isUser ? 'You' : 'Nexus'}</span>
            {isNexus && (
              <Badge variant='secondary' className='text-xs'>
                Advanced AI
              </Badge>
            )}
            <span className='text-gray-500 text-xs'>
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <div className='prose prose-sm max-w-none text-sm'>{message.content}</div>

          {/* Tool calls visualization */}
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className='mt-3 space-y-2'>
              {message.toolInvocations.map((toolCall: any) => (
                <ToolResultRenderer
                  key={toolCall.toolCallId}
                  toolName={toolCall.toolName}
                  result={toolCall.result}
                  status={
                    toolCall.state === 'result'
                      ? 'success'
                      : toolCall.state === 'error'
                        ? 'error'
                        : 'executing'
                  }
                  executionTime={toolCall.executionTime}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleNexusSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      logger.info('Nexus query submitted', {
        query: input.substring(0, 100),
        workflowId: activeWorkflowId,
      })

      handleSubmit(e)
    },
    [input, isLoading, handleSubmit, activeWorkflowId]
  )

  // Show loading state until initialized
  if (!isInitialized) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <LoadingAgent size='md' />
          <p className='text-muted-foreground text-sm'>Initializing Nexus...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col bg-white'>
      {/* Nexus Header */}
      <div className='flex items-center justify-between border-b bg-gradient-to-r from-purple-50 to-blue-50 p-4'>
        <div className='flex items-center gap-2'>
          <div className='flex h-6 w-6 items-center justify-center rounded bg-gradient-to-r from-purple-500 to-blue-500'>
            <Zap className='h-3 w-3 text-white' />
          </div>
          <h3 className='font-semibold text-gray-900'>Nexus</h3>
          <Badge variant='outline' className='text-xs'>
            Advanced AI Assistant
          </Badge>
        </div>

        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowAnalytics(!showAnalytics)}
            className='text-gray-600 hover:text-gray-900'
          >
            <BarChart3 className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setIsExpanded(!isExpanded)}
            className='text-gray-600 hover:text-gray-900'
          >
            <Settings className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Analytics Panel (if enabled) */}
      {showAnalytics && (
        <div className='border-b bg-gray-50 p-4'>
          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div className='text-center'>
              <div className='font-medium text-blue-600'>{messages.length}</div>
              <div className='text-gray-600'>Messages</div>
            </div>
            <div className='text-center'>
              <div className='font-medium text-green-600'>
                {messages.filter((m) => m.role === 'assistant').length}
              </div>
              <div className='text-gray-600'>AI Responses</div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className='relative flex-1 overflow-hidden'>
        <ScrollArea ref={scrollAreaRef} className='h-full' hideScrollbar={true}>
          <div className='space-y-4 p-4'>
            {messages.length === 0 && (
              <div className='py-8 text-center text-gray-500'>
                <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-100 to-blue-100'>
                  <Zap className='h-6 w-6 text-purple-500' />
                </div>
                <p className='mb-1 font-medium'>Welcome to Nexus</p>
                <p className='text-sm'>Your advanced AI assistant for workflow management</p>
                <div className='mt-4 space-y-1 text-xs'>
                  <p>• Execute and monitor workflows</p>
                  <p>• Search knowledge bases</p>
                  <p>• Manage files and environments</p>
                  <p>• Analyze usage and billing</p>
                </div>
              </div>
            )}

            {messages.map(renderMessage)}

            {isLoading && (
              <div className='mr-8 flex gap-3 rounded-lg bg-gray-50 p-4'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500'>
                  <Zap className='h-4 w-4 text-white' />
                </div>
                <div className='flex-grow'>
                  <div className='mb-2 flex items-center gap-2'>
                    <span className='font-medium text-sm'>Nexus</span>
                    <Badge variant='secondary' className='text-xs'>
                      Processing
                    </Badge>
                  </div>
                  <div className='flex items-center gap-2 text-gray-600 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Analyzing your request...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className='-translate-x-1/2 absolute bottom-4 left-1/2 z-10 transform'>
            <Button
              onClick={scrollToBottom}
              size='sm'
              variant='outline'
              className='flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-lg transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
            >
              <ArrowDown className='h-3.5 w-3.5 text-gray-700 dark:text-gray-300' />
              <span className='sr-only'>Scroll to bottom</span>
            </Button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className='border-t bg-gray-50/50 p-4'>
        <form onSubmit={handleNexusSubmit} className='flex gap-2'>
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder='Ask Nexus anything about your workflows...'
            disabled={isLoading}
            className='flex-grow'
            autoComplete='off'
          />
          <Button
            type='submit'
            disabled={isLoading || !input.trim()}
            className='bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
          >
            {isLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Send className='h-4 w-4' />
            )}
          </Button>
        </form>

        {error && (
          <div className='mt-2 rounded bg-red-50 p-2 text-red-600 text-xs'>
            Error: {error.message}
          </div>
        )}

        <div className='mt-2 text-center text-gray-500 text-xs'>
          Powered by Claude 3.5 Sonnet • Context: Workflow {activeWorkflowId?.slice(-8) || 'N/A'}
        </div>
      </div>
    </div>
  )
})

Nexus.displayName = 'Nexus'
