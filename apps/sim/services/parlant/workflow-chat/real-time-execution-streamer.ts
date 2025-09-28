/**
 * Real-time Workflow Execution Streamer
 *
 * Streams workflow execution progress and results to chat interface in real-time,
 * converting technical execution steps into conversational language for users.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantSocketClient } from '@/app/chat/workspace/[workspaceId]/agent/[agentId]/components/socket-client'
import type { JourneyState, ParlantJourney } from '../workflow-converter/types'

const logger = createLogger('WorkflowExecutionStreamer')

export interface WorkflowExecutionEvent {
  type: 'step_started' | 'step_completed' | 'step_failed' | 'workflow_completed' | 'workflow_failed'
  journeyId: string
  stepId: string
  stepName: string
  timestamp: string
  data?: any
  error?: string
  progress: {
    currentStep: number
    totalSteps: number
    percentComplete: number
  }
}

export interface ConversationalMessage {
  id: string
  type: 'system' | 'progress' | 'result' | 'error'
  content: string
  timestamp: string
  metadata: {
    stepId: string
    executionTime?: number
    toolsUsed?: string[]
    dataTransformed?: boolean
    userActionRequired?: boolean
  }
}

/**
 * Real-time execution streamer that converts workflow execution into conversational updates
 */
export class WorkflowExecutionStreamer {
  private socketClient: ParlantSocketClient | null = null
  private activeExecutions = new Map<string, WorkflowExecution>()

  constructor(socketClient?: ParlantSocketClient) {
    this.socketClient = socketClient || null
    logger.info('WorkflowExecutionStreamer initialized')
  }

  /**
   * Connect to Socket.io for real-time streaming
   */
  connectSocket(socketClient: ParlantSocketClient): void {
    this.socketClient = socketClient
    this.setupSocketEventHandlers()
    logger.info('Socket.io client connected for workflow streaming')
  }

  /**
   * Start streaming workflow execution progress
   */
  async startWorkflowStreaming(
    journeyId: string,
    workspaceId: string,
    userId: string,
    journey: ParlantJourney
  ): Promise<void> {
    logger.info('Starting workflow execution streaming', {
      journeyId,
      workspaceId,
      stepCount: journey.states.length,
    })

    // Create execution context
    const execution: WorkflowExecution = {
      id: journeyId,
      workspaceId,
      userId,
      journey,
      startTime: Date.now(),
      currentStep: 0,
      status: 'starting',
      messages: [],
    }

    this.activeExecutions.set(journeyId, execution)

    // Send initial conversation message
    const welcomeMessage = this.createConversationalMessage({
      type: 'system',
      content: `🚀 Starting workflow execution: **${journey.title}**\n\nI'll walk you through each step and keep you updated on the progress. You can ask questions or control the execution at any time.`,
      stepId: 'initialization',
      metadata: {
        stepId: 'initialization',
        totalSteps: journey.states.length,
      },
    })

    await this.sendConversationalMessage(journeyId, welcomeMessage)

    // Set up journey state monitoring
    await this.setupJourneyMonitoring(execution)
  }

  /**
   * Handle workflow execution events from Parlant journey engine
   */
  async handleExecutionEvent(event: WorkflowExecutionEvent): Promise<void> {
    const execution = this.activeExecutions.get(event.journeyId)
    if (!execution) {
      logger.warn('Received event for unknown execution', { journeyId: event.journeyId })
      return
    }

    logger.debug('Processing execution event', {
      type: event.type,
      journeyId: event.journeyId,
      stepId: event.stepId,
    })

    switch (event.type) {
      case 'step_started':
        await this.handleStepStarted(execution, event)
        break
      case 'step_completed':
        await this.handleStepCompleted(execution, event)
        break
      case 'step_failed':
        await this.handleStepFailed(execution, event)
        break
      case 'workflow_completed':
        await this.handleWorkflowCompleted(execution, event)
        break
      case 'workflow_failed':
        await this.handleWorkflowFailed(execution, event)
        break
    }
  }

  /**
   * Send interactive workflow commands through chat
   */
  async handleChatCommand(
    journeyId: string,
    command: string,
    parameters: any = {}
  ): Promise<ConversationalMessage> {
    const execution = this.activeExecutions.get(journeyId)
    if (!execution) {
      return this.createConversationalMessage({
        type: 'error',
        content: '❌ No active workflow found. Please start a workflow first.',
        stepId: 'command_error',
        metadata: { stepId: 'command_error' },
      })
    }

    logger.info('Processing chat command for workflow', {
      journeyId,
      command,
      parameters,
    })

    switch (command.toLowerCase()) {
      case 'pause':
        return await this.pauseWorkflow(execution)
      case 'resume':
        return await this.resumeWorkflow(execution)
      case 'stop':
        return await this.stopWorkflow(execution)
      case 'status':
        return await this.getWorkflowStatus(execution)
      case 'debug':
        return await this.debugCurrentStep(execution, parameters)
      case 'skip':
        return await this.skipCurrentStep(execution, parameters)
      case 'retry':
        return await this.retryCurrentStep(execution)
      default:
        return this.createConversationalMessage({
          type: 'error',
          content: `❓ Unknown command: "${command}"\n\nAvailable commands: pause, resume, stop, status, debug, skip, retry`,
          stepId: 'unknown_command',
          metadata: { stepId: 'unknown_command' },
        })
    }
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private setupSocketEventHandlers(): void {
    if (!this.socketClient) return

    // Listen for journey execution events
    this.socketClient.on('journey-step-started', (data) => {
      this.handleExecutionEvent({
        type: 'step_started',
        journeyId: data.journeyId,
        stepId: data.stepId,
        stepName: data.stepName,
        timestamp: data.timestamp,
        data: data.stepData,
        progress: data.progress,
      })
    })

    this.socketClient.on('journey-step-completed', (data) => {
      this.handleExecutionEvent({
        type: 'step_completed',
        journeyId: data.journeyId,
        stepId: data.stepId,
        stepName: data.stepName,
        timestamp: data.timestamp,
        data: data.result,
        progress: data.progress,
      })
    })

    this.socketClient.on('journey-step-failed', (data) => {
      this.handleExecutionEvent({
        type: 'step_failed',
        journeyId: data.journeyId,
        stepId: data.stepId,
        stepName: data.stepName,
        timestamp: data.timestamp,
        error: data.error,
        progress: data.progress,
      })
    })

    // Listen for chat commands
    this.socketClient.on('workflow-chat-command', async (data) => {
      const response = await this.handleChatCommand(data.journeyId, data.command, data.parameters)
      await this.sendConversationalMessage(data.journeyId, response)
    })
  }

  private async setupJourneyMonitoring(execution: WorkflowExecution): Promise<void> {
    // This would integrate with Parlant's journey execution engine
    // to receive real-time events about step execution
    logger.debug('Setting up journey monitoring for execution', {
      journeyId: execution.id,
      stepCount: execution.journey.states.length,
    })

    // Emit event to start monitoring this journey
    if (this.socketClient) {
      this.socketClient.emit('start-journey-monitoring', {
        journeyId: execution.id,
        workspaceId: execution.workspaceId,
        userId: execution.userId,
      })
    }
  }

  private async handleStepStarted(
    execution: WorkflowExecution,
    event: WorkflowExecutionEvent
  ): Promise<void> {
    execution.currentStep = event.progress.currentStep
    execution.status = 'running'

    // Find the step definition
    const step = execution.journey.states.find((s) => s.id === event.stepId)
    const stepDescription = this.generateStepDescription(step, 'starting')

    const message = this.createConversationalMessage({
      type: 'progress',
      content: `🔄 **Step ${event.progress.currentStep}/${event.progress.totalSteps}**: ${stepDescription}\n\n${this.generateProgressBar(event.progress.percentComplete)}`,
      stepId: event.stepId,
      metadata: {
        stepId: event.stepId,
        toolsUsed: step?.toolId ? [step.toolId] : [],
      },
    })

    execution.messages.push(message)
    await this.sendConversationalMessage(execution.id, message)
  }

  private async handleStepCompleted(
    execution: WorkflowExecution,
    event: WorkflowExecutionEvent
  ): Promise<void> {
    const step = execution.journey.states.find((s) => s.id === event.stepId)
    const executionTime = Date.now() - (execution.lastStepStart || Date.now())
    const stepDescription = this.generateStepDescription(step, 'completed')

    let resultSummary = ''
    if (event.data && typeof event.data === 'object') {
      resultSummary = this.generateResultSummary(event.data, step)
    }

    const message = this.createConversationalMessage({
      type: 'result',
      content: `✅ **Completed**: ${stepDescription}\n${resultSummary}\n\n${this.generateProgressBar(event.progress.percentComplete)}`,
      stepId: event.stepId,
      metadata: {
        stepId: event.stepId,
        executionTime,
        dataTransformed: Boolean(event.data),
        toolsUsed: step?.toolId ? [step.toolId] : [],
      },
    })

    execution.messages.push(message)
    await this.sendConversationalMessage(execution.id, message)
  }

  private async handleStepFailed(
    execution: WorkflowExecution,
    event: WorkflowExecutionEvent
  ): Promise<void> {
    execution.status = 'error'

    const step = execution.journey.states.find((s) => s.id === event.stepId)
    const stepDescription = this.generateStepDescription(step, 'failed')
    const errorExplanation = this.generateErrorExplanation(event.error, step)

    const message = this.createConversationalMessage({
      type: 'error',
      content: `❌ **Error in Step ${event.progress.currentStep}**: ${stepDescription}\n\n${errorExplanation}\n\n💡 You can try "retry" to attempt this step again, "skip" to move to the next step, or "debug" to get more details.`,
      stepId: event.stepId,
      metadata: {
        stepId: event.stepId,
        userActionRequired: true,
      },
    })

    execution.messages.push(message)
    await this.sendConversationalMessage(execution.id, message)
  }

  private async handleWorkflowCompleted(
    execution: WorkflowExecution,
    event: WorkflowExecutionEvent
  ): Promise<void> {
    execution.status = 'completed'
    execution.endTime = Date.now()

    const totalTime = execution.endTime - execution.startTime
    const summary = this.generateWorkflowSummary(execution)

    const message = this.createConversationalMessage({
      type: 'system',
      content: `🎉 **Workflow Completed Successfully!**\n\n${summary}\n\n⏱️ Total execution time: ${this.formatDuration(totalTime)}\n\n✨ All ${execution.journey.states.length} steps completed successfully. Great work!`,
      stepId: 'completion',
      metadata: {
        stepId: 'completion',
        executionTime: totalTime,
      },
    })

    execution.messages.push(message)
    await this.sendConversationalMessage(execution.id, message)

    // Clean up execution after completion
    setTimeout(
      () => {
        this.activeExecutions.delete(execution.id)
        logger.info('Cleaned up completed execution', { journeyId: execution.id })
      },
      5 * 60 * 1000
    ) // Clean up after 5 minutes
  }

  private async handleWorkflowFailed(
    execution: WorkflowExecution,
    event: WorkflowExecutionEvent
  ): Promise<void> {
    execution.status = 'failed'
    execution.endTime = Date.now()

    const message = this.createConversationalMessage({
      type: 'error',
      content: `🚨 **Workflow Failed**\n\nThe workflow encountered a critical error and cannot continue:\n\n${event.error}\n\n🔧 You can review the execution history and try running the workflow again after addressing any issues.`,
      stepId: 'workflow_failure',
      metadata: {
        stepId: 'workflow_failure',
        userActionRequired: true,
      },
    })

    execution.messages.push(message)
    await this.sendConversationalMessage(execution.id, message)
  }

  private generateStepDescription(step: JourneyState | undefined, action: string): string {
    if (!step) return 'Unknown step'

    const actionVerb =
      {
        starting: 'Starting',
        completed: 'Completed',
        failed: 'Failed at',
      }[action] || 'Processing'

    return `${actionVerb} ${step.Name || step.id}`
  }

  private generateResultSummary(data: any, step: JourneyState | undefined): string {
    if (!data || typeof data !== 'object') return ''

    // Generate a user-friendly summary of the step results
    if (Array.isArray(data)) {
      return `📊 Processed ${data.length} items`
    }

    if (data.success === true) {
      return `✅ Operation completed successfully`
    }

    if (data.count !== undefined) {
      return `📈 ${data.count} items processed`
    }

    if (data.message) {
      return `💬 ${data.message}`
    }

    return `📋 Step completed with results`
  }

  private generateErrorExplanation(
    error: string | undefined,
    step: JourneyState | undefined
  ): string {
    if (!error) return 'An unknown error occurred'

    // Provide user-friendly error explanations
    const commonErrors: Record<string, string> = {
      timeout:
        '⏰ The step took too long to complete. This might be due to a slow network connection or heavy processing.',
      authentication: '🔐 Authentication failed. Please check your credentials or permissions.',
      not_found: '🔍 Required resource not found. Please verify the input data.',
      network: '🌐 Network connection error. Please check your internet connection.',
      permission: '🚫 Permission denied. You may not have access to the required resources.',
      validation: '📝 Input validation failed. Please check the data format.',
    }

    // Try to match common error patterns
    const errorLower = error.toLowerCase()
    for (const [pattern, explanation] of Object.entries(commonErrors)) {
      if (errorLower.includes(pattern)) {
        return explanation
      }
    }

    return `⚠️ ${error}`
  }

  private generateProgressBar(percentComplete: number): string {
    const totalBars = 20
    const filledBars = Math.round((percentComplete / 100) * totalBars)
    const emptyBars = totalBars - filledBars

    return `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${percentComplete.toFixed(0)}%`
  }

  private generateWorkflowSummary(execution: WorkflowExecution): string {
    const stepCount = execution.journey.states.length
    const completedSteps = execution.messages.filter((m) => m.type === 'result').length

    return `**${execution.journey.title}** completed with ${completedSteps}/${stepCount} steps executed successfully.`
  }

  private formatDuration(ms: number): string {
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

  private createConversationalMessage(params: {
    type: ConversationalMessage['type']
    content: string
    stepId: string
    metadata: Partial<ConversationalMessage['metadata']>
  }): ConversationalMessage {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      content: params.content,
      timestamp: new Date().toISOString(),
      metadata: {
        stepId: params.stepId,
        ...params.metadata,
      },
    }
  }

  private async sendConversationalMessage(
    journeyId: string,
    message: ConversationalMessage
  ): Promise<void> {
    if (!this.socketClient) {
      logger.warn('No socket client available for sending message')
      return
    }

    // Send message through Socket.io to the chat interface
    this.socketClient.emit('workflow-chat-message', {
      journeyId,
      message,
      timestamp: Date.now(),
    })

    logger.debug('Sent conversational message', {
      journeyId,
      messageId: message.id,
      type: message.type,
    })
  }

  // Workflow control commands
  private async pauseWorkflow(execution: WorkflowExecution): Promise<ConversationalMessage> {
    // Implementation would pause the journey execution
    execution.status = 'paused'

    return this.createConversationalMessage({
      type: 'system',
      content:
        '⏸️ **Workflow Paused**\n\nExecution has been paused. Use "resume" to continue or "stop" to end the workflow.',
      stepId: 'pause_command',
      metadata: { stepId: 'pause_command' },
    })
  }

  private async resumeWorkflow(execution: WorkflowExecution): Promise<ConversationalMessage> {
    // Implementation would resume the journey execution
    execution.status = 'running'

    return this.createConversationalMessage({
      type: 'system',
      content: '▶️ **Workflow Resumed**\n\nExecution is continuing from where it left off...',
      stepId: 'resume_command',
      metadata: { stepId: 'resume_command' },
    })
  }

  private async stopWorkflow(execution: WorkflowExecution): Promise<ConversationalMessage> {
    // Implementation would stop the journey execution
    execution.status = 'stopped'
    execution.endTime = Date.now()

    return this.createConversationalMessage({
      type: 'system',
      content: '🛑 **Workflow Stopped**\n\nExecution has been stopped by user request.',
      stepId: 'stop_command',
      metadata: { stepId: 'stop_command' },
    })
  }

  private async getWorkflowStatus(execution: WorkflowExecution): Promise<ConversationalMessage> {
    const progress = (execution.currentStep / execution.journey.states.length) * 100
    const runningTime = Date.now() - execution.startTime

    return this.createConversationalMessage({
      type: 'system',
      content: `📊 **Workflow Status**\n\n**Name**: ${execution.journey.title}\n**Progress**: ${execution.currentStep}/${execution.journey.states.length} steps (${progress.toFixed(0)}%)\n**Status**: ${execution.status}\n**Running time**: ${this.formatDuration(runningTime)}\n\n${this.generateProgressBar(progress)}`,
      stepId: 'status_command',
      metadata: { stepId: 'status_command' },
    })
  }

  private async debugCurrentStep(
    execution: WorkflowExecution,
    parameters: any
  ): Promise<ConversationalMessage> {
    const currentStepId = execution.journey.states[execution.currentStep]?.id
    const currentStep = execution.journey.states.find((s) => s.id === currentStepId)

    const debugInfo = {
      stepId: currentStepId,
      stepName: currentStep?.Name || 'Unknown',
      stepType: currentStep?.type || 'Unknown',
      toolId: currentStep?.toolId,
      configuration: currentStep?.configuration,
    }

    return this.createConversationalMessage({
      type: 'system',
      content: `🔧 **Debug Information**\n\n\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\`\n\nThis shows the technical details of the current step.`,
      stepId: 'debug_command',
      metadata: { stepId: 'debug_command' },
    })
  }

  private async skipCurrentStep(
    execution: WorkflowExecution,
    parameters: any
  ): Promise<ConversationalMessage> {
    // Implementation would skip the current step
    execution.currentStep++

    return this.createConversationalMessage({
      type: 'system',
      content: '⏭️ **Step Skipped**\n\nMoving to the next step in the workflow...',
      stepId: 'skip_command',
      metadata: { stepId: 'skip_command' },
    })
  }

  private async retryCurrentStep(execution: WorkflowExecution): Promise<ConversationalMessage> {
    // Implementation would retry the current step
    return this.createConversationalMessage({
      type: 'system',
      content: '🔄 **Retrying Step**\n\nAttempting to execute the current step again...',
      stepId: 'retry_command',
      metadata: { stepId: 'retry_command' },
    })
  }
}

interface WorkflowExecution {
  id: string
  workspaceId: string
  userId: string
  journey: ParlantJourney
  startTime: number
  endTime?: number
  currentStep: number
  status: 'starting' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped' | 'error'
  messages: ConversationalMessage[]
  lastStepStart?: number
}
