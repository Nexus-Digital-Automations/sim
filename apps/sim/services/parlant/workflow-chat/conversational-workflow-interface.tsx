'use client'

/**
 * Conversational Workflow Interface
 *
 * React component that provides a chat-based interface for workflow execution,
 * integrating with Parlant chat system to display real-time workflow progress
 * and enable interactive control through natural language commands.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantSocketClient } from '@/app/chat/workspace/[workspaceId]/agent/[agentId]/components/socket-client'
import type { ParlantJourney } from '../workflow-converter/types'
import {
  type ConversationalMessage,
  WorkflowExecutionStreamer,
} from './real-time-execution-streamer'

const logger = createLogger('ConversationalWorkflowInterface')

export interface ConversationalWorkflowInterfaceProps {
  journey: ParlantJourney
  workspaceId: string
  userId: string
  socketClient?: ParlantSocketClient
  onExecutionComplete?: (result: any) => void
  onExecutionError?: (error: string) => void
}

/**
 * Chat-based workflow execution interface
 */
export function ConversationalWorkflowInterface({
  journey,
  workspaceId,
  userId,
  socketClient,
  onExecutionComplete,
  onExecutionError,
}: ConversationalWorkflowInterfaceProps) {
  const streamerRef = useRef<WorkflowExecutionStreamer | null>(null)
  const [messages, setMessages] = useState<ConversationalMessage[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<
    'idle' | 'running' | 'paused' | 'completed' | 'failed'
  >('idle')
  const [userInput, setUserInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize execution streamer
  useEffect(() => {
    if (!socketClient) return

    const streamer = new WorkflowExecutionStreamer(socketClient)
    streamerRef.current = streamer

    // Set up message listener
    socketClient.on('workflow-chat-message', (data) => {
      if (data.journeyId === journey.id) {
        setMessages((prev) => [...prev, data.message])
        scrollToBottom()
      }
    })

    return () => {
      socketClient.off('workflow-chat-message')
    }
  }, [socketClient, journey.id])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Start workflow execution
  const startWorkflowExecution = async () => {
    if (!streamerRef.current || !socketClient) {
      logger.error('Cannot start execution: missing streamer or socket client')
      return
    }

    try {
      setIsExecuting(true)
      setExecutionStatus('running')
      setMessages([]) // Clear previous messages

      logger.info('Starting workflow execution through chat interface', {
        journeyId: journey.id,
        workspaceId,
      })

      await streamerRef.current.startWorkflowStreaming(journey.id, workspaceId, userId, journey)
    } catch (error) {
      logger.error('Failed to start workflow execution', error)
      onExecutionError?.(error instanceof Error ? error.message : 'Unknown error')
      setIsExecuting(false)
      setExecutionStatus('failed')
    }
  }

  // Handle user input and commands
  const handleUserInput = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim() || !streamerRef.current || !isExecuting) return

    const input = userInput.trim()
    setUserInput('')

    logger.debug('Processing user input', { input, journeyId: journey.id })

    // Add user message to chat
    const userMessage: ConversationalMessage = {
      id: `user_${Date.now()}`,
      type: 'system',
      content: input,
      timestamp: new Date().toISOString(),
      metadata: { stepId: 'user_input' },
    }

    setMessages((prev) => [...prev, userMessage])

    // Check if it's a command
    const commandMatch = input.match(/^\/(\w+)(?:\s+(.*))?$/)
    if (commandMatch) {
      const [, command, params] = commandMatch
      try {
        const response = await streamerRef.current.handleChatCommand(
          journey.id,
          command,
          params ? { params } : {}
        )
        setMessages((prev) => [...prev, response])
      } catch (error) {
        logger.error('Failed to handle chat command', { command, error })
      }
    } else {
      // Handle natural language queries about workflow
      await handleNaturalLanguageQuery(input)
    }
  }

  // Handle natural language queries about the workflow
  const handleNaturalLanguageQuery = async (query: string) => {
    // This would integrate with an AI service to understand natural language queries
    // about the workflow status, steps, etc.

    let response: ConversationalMessage

    if (query.toLowerCase().includes('status') || query.toLowerCase().includes('progress')) {
      response = await streamerRef.current!.handleChatCommand(journey.id, 'status')
    } else if (query.toLowerCase().includes('pause') || query.toLowerCase().includes('stop')) {
      response = await streamerRef.current!.handleChatCommand(journey.id, 'pause')
    } else if (query.toLowerCase().includes('continue') || query.toLowerCase().includes('resume')) {
      response = await streamerRef.current!.handleChatCommand(journey.id, 'resume')
    } else {
      // Generic helpful response
      response = {
        id: `assistant_${Date.now()}`,
        type: 'system',
        content: `I understand you're asking about "${query}". Here are some things I can help with:\n\n• Check workflow **status**\n• **Pause** or **resume** execution\n• Get **debug** information\n• **Skip** or **retry** current step\n\nYou can also use commands like /status, /pause, /resume, /debug, /skip, /retry`,
        timestamp: new Date().toISOString(),
        metadata: { stepId: 'natural_language_help' },
      }
    }

    setMessages((prev) => [...prev, response])
  }

  // Format message timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Get message styling based on type
  const getMessageStyling = (message: ConversationalMessage) => {
    const baseClasses = 'p-4 rounded-lg mb-3 max-w-4xl'

    switch (message.type) {
      case 'system':
        return `${baseClasses} bg-blue-50 border-l-4 border-blue-400 text-blue-800`
      case 'progress':
        return `${baseClasses} bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800`
      case 'result':
        return `${baseClasses} bg-green-50 border-l-4 border-green-400 text-green-800`
      case 'error':
        return `${baseClasses} bg-red-50 border-l-4 border-red-400 text-red-800`
      default:
        return `${baseClasses} bg-gray-50 border-l-4 border-gray-400 text-gray-800`
    }
  }

  return (
    <div className='flex h-full flex-col bg-white'>
      {/* Header */}
      <div className='border-b bg-gray-50 p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='font-semibold text-gray-900 text-lg'>
              Conversational Workflow: {journey.title}
            </h2>
            <p className='text-gray-600 text-sm'>
              {journey.states.length} steps • Interactive execution with real-time updates
            </p>
          </div>
          <div className='flex items-center space-x-3'>
            {/* Execution status indicator */}
            <div className='flex items-center space-x-2'>
              <div
                className={`h-3 w-3 rounded-full ${
                  executionStatus === 'running'
                    ? 'animate-pulse bg-green-400'
                    : executionStatus === 'paused'
                      ? 'bg-yellow-400'
                      : executionStatus === 'completed'
                        ? 'bg-blue-400'
                        : executionStatus === 'failed'
                          ? 'bg-red-400'
                          : 'bg-gray-400'
                }`}
              />
              <span className='font-medium text-gray-700 text-sm capitalize'>
                {executionStatus}
              </span>
            </div>

            {/* Start execution button */}
            {!isExecuting && (
              <button
                onClick={startWorkflowExecution}
                className='rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700'
              >
                Start Execution
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className='flex-1 space-y-3 overflow-y-auto p-4'>
        {messages.length === 0 && !isExecuting && (
          <div className='py-8 text-center text-gray-500'>
            <div className='mb-4'>
              <svg
                className='mx-auto h-16 w-16 text-gray-300'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.72-.424l-5.45 2.17a.75.75 0 01-.99-.99L5.05 15.31A8.955 8.955 0 014 12.72C4 8.302 7.582 4.72 12 4.72S20 8.302 20 12z'
                />
              </svg>
            </div>
            <h3 className='mb-2 font-medium text-gray-900 text-lg'>
              Ready for Interactive Execution
            </h3>
            <p className='mb-4 text-gray-600'>
              Click "Start Execution" to begin the workflow and get real-time updates through this
              chat interface.
            </p>
            <div className='text-gray-500 text-sm'>
              <p>During execution, you can:</p>
              <ul className='mt-2 space-y-1'>
                <li>• Ask about progress with "What's the status?"</li>
                <li>• Control execution with "Pause" or "Resume"</li>
                <li>• Get debug info with "/debug"</li>
                <li>• Skip steps with "/skip" or retry with "/retry"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={getMessageStyling(message)}>
            <div className='mb-2 flex items-start justify-between'>
              <div className='flex items-center space-x-2'>
                {/* Message type icon */}
                {message.type === 'system' && (
                  <svg
                    className='h-5 w-5 text-current'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                )}
                {message.type === 'progress' && (
                  <svg
                    className='h-5 w-5 animate-spin text-current'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                    />
                  </svg>
                )}
                {message.type === 'result' && (
                  <svg
                    className='h-5 w-5 text-current'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                )}
                {message.type === 'error' && (
                  <svg
                    className='h-5 w-5 text-current'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                )}
              </div>
              <span className='text-gray-500 text-xs'>{formatTimestamp(message.timestamp)}</span>
            </div>

            {/* Message content with markdown-style formatting */}
            <div
              className='prose prose-sm max-w-none'
              dangerouslySetInnerHTML={{
                __html: message.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(
                    /```(.*?)```/gs,
                    '<pre class="bg-gray-100 p-2 rounded text-sm overflow-x-auto"><code>$1</code></pre>'
                  )
                  .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
                  .replace(/\n/g, '<br>'),
              }}
            />

            {/* Metadata display for debugging */}
            {message.metadata.executionTime && (
              <div className='mt-2 text-gray-500 text-xs'>
                Execution time: {message.metadata.executionTime}ms
              </div>
            )}

            {message.metadata.toolsUsed && message.metadata.toolsUsed.length > 0 && (
              <div className='mt-2'>
                <span className='text-gray-500 text-xs'>Tools used: </span>
                {message.metadata.toolsUsed.map((tool, idx) => (
                  <span key={idx} className='mr-1 rounded bg-gray-200 px-2 py-1 text-xs'>
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - only show during execution */}
      {isExecuting && (
        <div className='border-t bg-gray-50 p-4'>
          <form onSubmit={handleUserInput} className='flex space-x-3'>
            <input
              type='text'
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder='Ask about progress, give commands (/status, /pause, /resume), or chat about the workflow...'
              className='flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            <button
              type='submit'
              disabled={!userInput.trim()}
              className='rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400'
            >
              Send
            </button>
          </form>
          <div className='mt-2 text-gray-500 text-xs'>
            💡 Try: "What's the status?", "/pause", "/resume", "/debug", "/skip", "/retry"
          </div>
        </div>
      )}
    </div>
  )
}
