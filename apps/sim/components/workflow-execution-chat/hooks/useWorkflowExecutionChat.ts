/**
 * useWorkflowExecutionChat Hook
 * =============================
 *
 * React hook for managing workflow execution chat state, real-time streaming,
 * and interactive workflow controls. Integrates with the existing Socket.io
 * infrastructure and WorkflowExecutionStreamer service.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantSocketClient } from '@/app/chat/workspace/[workspaceId]/agent/[agentId]/components/socket-client'
import { WorkflowExecutionStreamer } from '@/services/parlant/workflow-chat/real-time-execution-streamer'
import type { ParlantJourney } from '@/services/parlant/workflow-converter/types'
import type {
  ChatCommand,
  ConversationalMessage,
  ExecutionChatState,
  ExecutionError,
  ExecutionPerformanceMetrics,
  ExecutionResult,
  UseWorkflowExecutionChatReturn,
  WorkflowChatCommand,
  WorkflowExecution,
  WorkflowExecutionEvent,
  WorkflowExecutionStatus,
} from '@/types/workflow-execution-chat'

const logger = createLogger('useWorkflowExecutionChat')

interface UseWorkflowExecutionChatOptions {
  journey: ParlantJourney
  workspaceId: string
  userId: string
  socketClient?: ParlantSocketClient
  onExecutionComplete?: (result: ExecutionResult) => void
  onExecutionError?: (error: ExecutionError) => void
  onChatCommand?: (command: ChatCommand) => void
  showDebugInfo?: boolean
  maxMessages?: number
}

/**
 * Hook for managing workflow execution chat functionality
 */
export function useWorkflowExecutionChat({
  journey,
  workspaceId,
  userId,
  socketClient,
  onExecutionComplete,
  onExecutionError,
  onChatCommand,
  showDebugInfo = false,
  maxMessages = 200,
}: UseWorkflowExecutionChatOptions): UseWorkflowExecutionChatReturn {
  // State management
  const [execution, setExecution] = useState<WorkflowExecution | null>(null)
  const [messages, setMessages] = useState<ConversationalMessage[]>([])
  const [chatState, setChatState] = useState<ExecutionChatState>({
    isExpanded: true,
    showDebugInfo,
    showPerformanceMetrics: false,
    autoScroll: true,
    filterLevel: 'all',
    selectedMessage: null,
    isConnected: false,
    connectionError: null,
    retryCount: 0,
  })

  // Refs for managing services
  const streamerRef = useRef<WorkflowExecutionStreamer | null>(null)
  const executionIdRef = useRef<string | null>(null)

  /**
   * Initialize workflow execution streamer
   */
  const initializeStreamer = useCallback(async () => {
    if (!socketClient || streamerRef.current) {
      return
    }

    try {
      logger.info('Initializing workflow execution streamer', {
        workspaceId,
        userId,
        journeyId: journey.id,
      })

      const streamer = new WorkflowExecutionStreamer(socketClient)

      // Set up event handlers
      setupStreamerEventHandlers(streamer)

      streamerRef.current = streamer

      setChatState((prev) => ({
        ...prev,
        isConnected: true,
        connectionError: null,
      }))

      logger.info('Workflow execution streamer initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize workflow execution streamer', error)
      setChatState((prev) => ({
        ...prev,
        isConnected: false,
        connectionError: error.message,
      }))
    }
  }, [socketClient, workspaceId, userId, journey.id])

  /**
   * Set up event handlers for the execution streamer
   */
  const setupStreamerEventHandlers = useCallback(
    (streamer: WorkflowExecutionStreamer) => {
      // Handle execution events
      const handleExecutionEvent = async (event: WorkflowExecutionEvent) => {
        logger.debug('Received execution event', event)

        // Update execution state
        setExecution((prev) => {
          if (!prev || prev.journeyId !== event.journeyId) {
            return prev
          }

          return {
            ...prev,
            currentStep: event.progress.currentStep,
            status: getStatusFromEvent(event),
            estimatedTimeRemaining: event.estimatedTimeRemaining,
            performanceMetrics: updatePerformanceMetrics(prev.performanceMetrics, event),
          }
        })

        // Process the event through the streamer
        await streamer.handleExecutionEvent(event)
      }

      // Set up socket event listeners through the streamer
      if (socketClient) {
        // Journey execution events
        socketClient.on('journey-step-started', handleExecutionEvent)
        socketClient.on('journey-step-completed', handleExecutionEvent)
        socketClient.on('journey-step-failed', handleExecutionEvent)
        socketClient.on('workflow-completed', handleExecutionEvent)
        socketClient.on('workflow-failed', handleExecutionEvent)

        // Chat message events
        socketClient.on('workflow-chat-message', (data) => {
          if (data.journeyId === executionIdRef.current) {
            addMessage(data.message)
          }
        })

        // Error handling
        socketClient.on('error', (error) => {
          logger.error('Socket error in workflow execution', error)
          setChatState((prev) => ({
            ...prev,
            connectionError: `Socket error: ${error.message || error}`,
          }))
        })
      }
    },
    [socketClient]
  )

  /**
   * Start workflow execution
   */
  const startExecution = useCallback(
    async (journeyToExecute: ParlantJourney) => {
      logger.info('Starting workflow execution', { journeyId: journeyToExecute.id })

      try {
        // Initialize streamer if not already done
        if (!streamerRef.current) {
          await initializeStreamer()
        }

        const executionId = `execution_${journeyToExecute.id}_${Date.now()}`
        executionIdRef.current = executionId

        // Create execution context
        const newExecution: WorkflowExecution = {
          id: executionId,
          journeyId: journeyToExecute.id,
          workspaceId,
          userId,
          journey: journeyToExecute,
          startTime: Date.now(),
          currentStep: 0,
          status: 'starting',
          messages: [],
          performanceMetrics: createInitialPerformanceMetrics(),
        }

        setExecution(newExecution)
        setMessages([])

        // Start streaming through the streamer
        if (streamerRef.current) {
          await streamerRef.current.startWorkflowStreaming(
            executionId,
            workspaceId,
            userId,
            journeyToExecute
          )
        }

        logger.info('Workflow execution started successfully')
      } catch (error) {
        logger.error('Failed to start workflow execution', error)

        const executionError: ExecutionError = {
          code: 'execution_start_failed',
          message: `Failed to start execution: ${error.message}`,
          timestamp: new Date().toISOString(),
          recoverable: true,
          suggestions: ['Check network connection', 'Retry execution', 'Contact support'],
        }

        onExecutionError?.(executionError)
        setChatState((prev) => ({
          ...prev,
          connectionError: error.message,
        }))
      }
    },
    [initializeStreamer, workspaceId, userId, onExecutionError]
  )

  /**
   * Stop workflow execution
   */
  const stopExecution = useCallback(async () => {
    if (!execution || !streamerRef.current) {
      logger.warn('No active execution to stop')
      return
    }

    logger.info('Stopping workflow execution', { executionId: execution.id })

    try {
      const response = await streamerRef.current.handleChatCommand(execution.journeyId, 'stop')

      addMessage(response)

      setExecution((prev) =>
        prev
          ? {
              ...prev,
              status: 'stopped',
              endTime: Date.now(),
            }
          : null
      )

      logger.info('Workflow execution stopped successfully')
    } catch (error) {
      logger.error('Failed to stop workflow execution', error)
    }
  }, [execution])

  /**
   * Pause workflow execution
   */
  const pauseExecution = useCallback(async () => {
    if (!execution || !streamerRef.current) {
      logger.warn('No active execution to pause')
      return
    }

    logger.info('Pausing workflow execution', { executionId: execution.id })

    try {
      const response = await streamerRef.current.handleChatCommand(execution.journeyId, 'pause')

      addMessage(response)

      setExecution((prev) =>
        prev
          ? {
              ...prev,
              status: 'paused',
            }
          : null
      )

      logger.info('Workflow execution paused successfully')
    } catch (error) {
      logger.error('Failed to pause workflow execution', error)
    }
  }, [execution])

  /**
   * Resume workflow execution
   */
  const resumeExecution = useCallback(async () => {
    if (!execution || !streamerRef.current) {
      logger.warn('No active execution to resume')
      return
    }

    logger.info('Resuming workflow execution', { executionId: execution.id })

    try {
      const response = await streamerRef.current.handleChatCommand(execution.journeyId, 'resume')

      addMessage(response)

      setExecution((prev) =>
        prev
          ? {
              ...prev,
              status: 'running',
            }
          : null
      )

      logger.info('Workflow execution resumed successfully')
    } catch (error) {
      logger.error('Failed to resume workflow execution', error)
    }
  }, [execution])

  /**
   * Send chat command
   */
  const sendCommand = useCallback(
    async (command: WorkflowChatCommand, parameters?: any) => {
      if (!execution || !streamerRef.current) {
        logger.warn('No active execution for command', { command })
        return
      }

      logger.info('Sending chat command', { command, parameters, executionId: execution.id })

      try {
        const chatCommand: ChatCommand = {
          command,
          parameters,
          timestamp: new Date().toISOString(),
          userId,
        }

        // Notify parent component
        onChatCommand?.(chatCommand)

        // Send through streamer
        const response = await streamerRef.current.handleChatCommand(
          execution.journeyId,
          command,
          parameters
        )

        addMessage(response)

        logger.info('Chat command sent successfully')
      } catch (error) {
        logger.error('Failed to send chat command', error)

        // Add error message
        const errorMessage: ConversationalMessage = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: `Failed to execute command "${command}": ${error.message}`,
          timestamp: new Date().toISOString(),
          metadata: {
            stepId: 'command_error',
            errorCode: 'command_failed',
          },
        }

        addMessage(errorMessage)
      }
    },
    [execution, userId, onChatCommand]
  )

  /**
   * Add message to the chat
   */
  const addMessage = useCallback(
    (message: ConversationalMessage) => {
      setMessages((prev) => {
        const newMessages = [...prev, message]

        // Trim messages if exceeding max limit
        if (newMessages.length > maxMessages) {
          return newMessages.slice(-maxMessages)
        }

        return newMessages
      })

      // Update execution messages if available
      setExecution((prev) => {
        if (!prev) return prev

        const updatedMessages = [...prev.messages, message]

        return {
          ...prev,
          messages: updatedMessages.slice(-maxMessages),
        }
      })
    },
    [maxMessages]
  )

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setExecution((prev) => (prev ? { ...prev, messages: [] } : null))
    logger.info('Chat messages cleared')
  }, [])

  /**
   * Update chat state
   */
  const updateChatState = useCallback((updates: Partial<ExecutionChatState>) => {
    setChatState((prev) => ({ ...prev, ...updates }))
    logger.debug('Chat state updated', updates)
  }, [])

  /**
   * Get current execution status
   */
  const getExecutionStatus = useCallback((): WorkflowExecutionStatus => {
    return execution?.status ?? 'idle'
  }, [execution])

  /**
   * Check if execution is active
   */
  const isExecutionActive = useCallback((): boolean => {
    const status = getExecutionStatus()
    return status === 'starting' || status === 'running'
  }, [getExecutionStatus])

  /**
   * Export execution log
   */
  const exportLog = useCallback(
    (format: 'json' | 'csv' | 'txt'): string => {
      logger.info('Exporting execution log', { format })

      switch (format) {
        case 'json':
          return JSON.stringify(
            {
              execution,
              messages,
              exportTimestamp: new Date().toISOString(),
              totalMessages: messages.length,
            },
            null,
            2
          )

        case 'csv': {
          const csvHeader = 'Timestamp,Type,Content,StepId,ExecutionTime\n'
          const csvRows = messages
            .map(
              (msg) =>
                `${msg.timestamp},${msg.type},"${msg.content.replace(/"/g, '""')}",${msg.metadata.stepId},${msg.metadata.executionTime || ''}`
            )
            .join('\n')
          return csvHeader + csvRows
        }

        case 'txt':
          return messages
            .map(
              (msg) =>
                `[${formatTimestamp(msg.timestamp)}] ${msg.type.toUpperCase()}: ${msg.content}`
            )
            .join('\n')

        default:
          throw new Error(`Unsupported export format: ${format}`)
      }
    },
    [execution, messages]
  )

  // Initialize streamer on mount
  useEffect(() => {
    if (socketClient) {
      initializeStreamer()
    }

    return () => {
      // Cleanup on unmount
      if (streamerRef.current && execution) {
        logger.info('Cleaning up workflow execution streamer')
      }
    }
  }, [socketClient, initializeStreamer])

  // Handle execution completion
  useEffect(() => {
    if (execution?.status === 'completed' && onExecutionComplete) {
      const result: ExecutionResult = {
        success: true,
        journey: execution.journey,
        executionTime: execution.endTime ? execution.endTime - execution.startTime : 0,
        stepsCompleted: execution.performanceMetrics.completedSteps,
        stepsFailed: execution.performanceMetrics.failedSteps,
        summary: `Workflow "${execution.journey.title}" completed successfully`,
        performanceMetrics: execution.performanceMetrics,
      }

      onExecutionComplete(result)
    }
  }, [execution?.status, execution, onExecutionComplete])

  return {
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
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get execution status from event
 */
function getStatusFromEvent(event: WorkflowExecutionEvent): WorkflowExecutionStatus {
  switch (event.type) {
    case 'step_started':
      return 'running'
    case 'step_completed':
      return 'running'
    case 'step_failed':
      return 'error'
    case 'workflow_completed':
      return 'completed'
    case 'workflow_failed':
      return 'failed'
    case 'workflow_paused':
      return 'paused'
    case 'workflow_resumed':
      return 'running'
    case 'workflow_stopped':
      return 'stopped'
    default:
      return 'running'
  }
}

/**
 * Create initial performance metrics
 */
function createInitialPerformanceMetrics(): ExecutionPerformanceMetrics {
  return {
    averageStepTime: 0,
    totalSteps: 0,
    completedSteps: 0,
    failedSteps: 0,
    skippedSteps: 0,
    memoryUsage: {
      current: 0,
      peak: 0,
      average: 0,
      unit: 'MB',
    },
    networkUsage: {
      requestCount: 0,
      totalDataTransferred: 0,
      averageResponseTime: 0,
      unit: 'MB',
    },
  }
}

/**
 * Update performance metrics based on execution event
 */
function updatePerformanceMetrics(
  current: ExecutionPerformanceMetrics,
  event: WorkflowExecutionEvent
): ExecutionPerformanceMetrics {
  const updated = { ...current }

  if (event.type === 'step_completed') {
    updated.completedSteps++
    if (event.metadata?.executionTime) {
      const totalTime =
        updated.averageStepTime * (updated.completedSteps - 1) + event.metadata.executionTime
      updated.averageStepTime = totalTime / updated.completedSteps
    }
  } else if (event.type === 'step_failed') {
    updated.failedSteps++
  }

  // Update memory usage if provided
  if (event.metadata?.memoryUsage) {
    updated.memoryUsage.current = event.metadata.memoryUsage
    updated.memoryUsage.peak = Math.max(updated.memoryUsage.peak, event.metadata.memoryUsage)
  }

  return updated
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
