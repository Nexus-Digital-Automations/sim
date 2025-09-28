/**
 * Interactive Workflow Commands
 *
 * Comprehensive command system for controlling workflow execution through chat interface.
 * Supports both slash commands and natural language processing for user-friendly workflow control.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantJourney } from '../workflow-converter/types'

const logger = createLogger('InteractiveWorkflowCommands')

export interface WorkflowCommand {
  Name: string
  aliases: string[]
  description: string
  usage: string
  examples: string[]
  requiresParams?: boolean
  category: 'control' | 'info' | 'debug' | 'navigation'
}

export interface CommandContext {
  journeyId: string
  workspaceId: string
  userId: string
  journey: ParlantJourney
  currentStep: number
  executionStatus: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped'
  executionHistory: any[]
}

export interface CommandResult {
  success: boolean
  message: string
  data?: any
  action?: 'pause' | 'resume' | 'stop' | 'skip' | 'retry' | 'debug' | 'none'
  requiresConfirmation?: boolean
}

/**
 * Interactive workflow command processor
 */
export class InteractiveWorkflowCommands {
  private commands: Map<string, WorkflowCommand> = new Map()
  private commandHandlers: Map<
    string,
    (context: CommandContext, params: string[]) => Promise<CommandResult>
  > = new Map()

  constructor() {
    this.initializeCommands()
    logger.info('InteractiveWorkflowCommands initialized')
  }

  /**
   * Process a command from user input
   */
  async processCommand(input: string, context: CommandContext): Promise<CommandResult> {
    // Parse command input
    const { command, params } = this.parseInput(input)

    if (!command) {
      return {
        success: false,
        message: '❓ No command specified. Try /help to see available commands.',
      }
    }

    logger.debug('Processing workflow command', {
      command,
      params,
      journeyId: context.journeyId,
    })

    // Find command (exact match or alias)
    const commandDef = this.findCommand(command)
    if (!commandDef) {
      return this.handleUnknownCommand(command, context)
    }

    // Validate parameters
    if (commandDef.requiresParams && params.length === 0) {
      return {
        success: false,
        message: `❌ Command "${command}" requires parameters.\n\n**Usage**: ${commandDef.usage}\n\n**Examples**:\n${commandDef.examples.map((e) => `• ${e}`).join('\n')}`,
      }
    }

    // Execute command
    const handler = this.commandHandlers.get(commandDef.Name)
    if (!handler) {
      return {
        success: false,
        message: `⚠️ Command "${command}" is not yet implemented.`,
      }
    }

    try {
      return await handler(context, params)
    } catch (error) {
      logger.error('Command execution failed', {
        command,
        error: error instanceof Error ? error.message : String(error),
      })

      return {
        success: false,
        message: `❌ Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get help information for all commands
   */
  getHelpMessage(context: CommandContext): string {
    const categories = {
      control: 'Workflow Control',
      info: 'Information',
      debug: 'Debugging',
      navigation: 'Navigation',
    }

    let helpMessage = '📋 **Available Workflow Commands**\n\n'

    for (const [categoryKey, categoryName] of Object.entries(categories)) {
      const categoryCommands = Array.from(this.commands.values()).filter(
        (cmd) => cmd.category === categoryKey
      )

      if (categoryCommands.length > 0) {
        helpMessage += `**${categoryName}**\n`
        categoryCommands.forEach((cmd) => {
          helpMessage += `• \`/${cmd.Name}\` - ${cmd.description}\n`
        })
        helpMessage += '\n'
      }
    }

    helpMessage += '💡 **Pro Tips**:\n'
    helpMessage +=
      '• You can also ask in natural language: "What\'s the status?", "Pause the workflow"\n'
    helpMessage += '• Use tab completion for command suggestions\n'
    helpMessage += '• Commands are case-insensitive\n\n'

    helpMessage += '🔗 **Quick Commands**: `/status`, `/pause`, `/resume`, `/debug`, `/help`'

    return helpMessage
  }

  /**
   * Process natural language input for workflow control
   */
  async processNaturalLanguage(input: string, context: CommandContext): Promise<CommandResult> {
    const inputLower = input.toLowerCase()

    // Status queries
    if (this.matchesPattern(inputLower, ['status', 'progress', 'how', 'going', 'where are we'])) {
      return this.handleStatusCommand(context, [])
    }

    // Control commands
    if (this.matchesPattern(inputLower, ['pause', 'stop', 'halt'])) {
      return this.handlePauseCommand(context, [])
    }

    if (this.matchesPattern(inputLower, ['resume', 'continue', 'start again', 'go on'])) {
      return this.handleResumeCommand(context, [])
    }

    if (this.matchesPattern(inputLower, ['skip', 'next', 'move on', 'bypass'])) {
      return this.handleSkipCommand(context, [])
    }

    if (this.matchesPattern(inputLower, ['retry', 'try again', 'repeat', 'redo'])) {
      return this.handleRetryCommand(context, [])
    }

    if (this.matchesPattern(inputLower, ['debug', 'info', 'details', "what's happening"])) {
      return this.handleDebugCommand(context, [])
    }

    if (this.matchesPattern(inputLower, ['help', 'commands', 'what can you do'])) {
      return {
        success: true,
        message: this.getHelpMessage(context),
        action: 'none',
      }
    }

    // If no pattern matches, provide helpful guidance
    return {
      success: true,
      message: `🤔 I understand you said "${input}". I can help with workflow control!\n\nTry asking:\n• "What's the status?" - Get current progress\n• "Pause the workflow" - Stop execution\n• "Skip this step" - Move to next step\n• "Show me debug info" - Get technical details\n\nOr use commands like \`/status\`, \`/pause\`, \`/skip\`, \`/debug\``,
      action: 'none',
    }
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private initializeCommands(): void {
    // Control commands
    this.addCommand(
      {
        Name: 'pause',
        aliases: ['stop', 'halt'],
        description: 'Pause workflow execution',
        usage: '/pause',
        examples: ['/pause', '/stop'],
        category: 'control',
      },
      this.handlePauseCommand.bind(this)
    )

    this.addCommand(
      {
        Name: 'resume',
        aliases: ['continue', 'start'],
        description: 'Resume paused workflow execution',
        usage: '/resume',
        examples: ['/resume', '/continue'],
        category: 'control',
      },
      this.handleResumeCommand.bind(this)
    )

    this.addCommand(
      {
        Name: 'skip',
        aliases: ['next'],
        description: 'Skip current step and move to next',
        usage: '/skip [reason]',
        examples: ['/skip', '/skip "Not needed for this run"'],
        category: 'control',
      },
      this.handleSkipCommand.bind(this)
    )

    this.addCommand(
      {
        Name: 'retry',
        aliases: ['redo', 'repeat'],
        description: 'Retry the current step',
        usage: '/retry',
        examples: ['/retry'],
        category: 'control',
      },
      this.handleRetryCommand.bind(this)
    )

    // Information commands
    this.addCommand(
      {
        Name: 'status',
        aliases: ['progress', 'info'],
        description: 'Show current workflow status and progress',
        usage: '/status',
        examples: ['/status'],
        category: 'info',
      },
      this.handleStatusCommand.bind(this)
    )

    this.addCommand(
      {
        Name: 'history',
        aliases: ['log'],
        description: 'Show execution history',
        usage: '/history [count]',
        examples: ['/history', '/history 10'],
        category: 'info',
      },
      this.handleHistoryCommand.bind(this)
    )

    this.addCommand(
      {
        Name: 'steps',
        aliases: ['workflow', 'journey'],
        description: 'List all workflow steps',
        usage: '/steps',
        examples: ['/steps'],
        category: 'info',
      },
      this.handleStepsCommand.bind(this)
    )

    // Debug commands
    this.addCommand(
      {
        Name: 'debug',
        aliases: ['inspect', 'details'],
        description: 'Show debug information for current step',
        usage: '/debug [step_id]',
        examples: ['/debug', '/debug step_5'],
        category: 'debug',
      },
      this.handleDebugCommand.bind(this)
    )

    this.addCommand(
      {
        Name: 'context',
        aliases: ['variables', 'data'],
        description: 'Show current workflow context and variables',
        usage: '/context',
        examples: ['/context'],
        category: 'debug',
      },
      this.handleContextCommand.bind(this)
    )

    // Navigation commands
    this.addCommand(
      {
        Name: 'goto',
        aliases: ['jump'],
        description: 'Jump to a specific step (advanced)',
        usage: '/goto <step_number>',
        examples: ['/goto 3', '/goto step_validation'],
        requiresParams: true,
        category: 'navigation',
      },
      this.handleGotoCommand.bind(this)
    )

    // Help command
    this.addCommand(
      {
        Name: 'help',
        aliases: ['commands', '?'],
        description: 'Show available commands',
        usage: '/help [command]',
        examples: ['/help', '/help status'],
        category: 'info',
      },
      this.handleHelpCommand.bind(this)
    )
  }

  private addCommand(
    command: WorkflowCommand,
    handler: (context: CommandContext, params: string[]) => Promise<CommandResult>
  ): void {
    this.commands.set(command.Name, command)
    this.commandHandlers.set(command.Name, handler)

    // Add aliases
    command.aliases.forEach((alias) => {
      this.commands.set(alias, command)
      this.commandHandlers.set(alias, handler)
    })
  }

  private parseInput(input: string): { command: string | null; params: string[] } {
    const trimmed = input.trim()

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/)
      return {
        command: parts[0].toLowerCase(),
        params: parts.slice(1),
      }
    }

    // For natural language, return null command
    return { command: null, params: [] }
  }

  private findCommand(Name: string): WorkflowCommand | undefined {
    return this.commands.get(Name.toLowerCase())
  }

  private matchesPattern(input: string, patterns: string[]): boolean {
    return patterns.some((pattern) => input.includes(pattern))
  }

  private handleUnknownCommand(command: string, context: CommandContext): CommandResult {
    // Try to suggest similar commands
    const allCommands = Array.from(new Set(Array.from(this.commands.keys())))
    const suggestions = allCommands
      .filter((cmd) => this.levenshteinDistance(command, cmd) <= 2)
      .slice(0, 3)

    let message = `❓ Unknown command: "${command}"`

    if (suggestions.length > 0) {
      message += `\n\n💡 Did you mean:\n${suggestions.map((s) => `• /${s}`).join('\n')}`
    }

    message += '\n\nUse `/help` to see all available commands.'

    return {
      success: false,
      message,
    }
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // ========================================
  // COMMAND HANDLERS
  // ========================================

  private async handlePauseCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    if (context.executionStatus !== 'running') {
      return {
        success: false,
        message: `⚠️ Cannot pause workflow. Current status: ${context.executionStatus}`,
      }
    }

    return {
      success: true,
      message:
        '⏸️ **Workflow Paused**\n\nExecution has been paused. Use `/resume` to continue or `/stop` to end the workflow.',
      action: 'pause',
    }
  }

  private async handleResumeCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    if (context.executionStatus !== 'paused') {
      return {
        success: false,
        message: `⚠️ Cannot resume workflow. Current status: ${context.executionStatus}`,
      }
    }

    return {
      success: true,
      message: '▶️ **Workflow Resumed**\n\nExecution is continuing from where it left off...',
      action: 'resume',
    }
  }

  private async handleSkipCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    if (context.executionStatus !== 'running' && context.executionStatus !== 'paused') {
      return {
        success: false,
        message: `⚠️ Cannot skip step. Workflow is not running (status: ${context.executionStatus})`,
      }
    }

    const currentStepName = context.journey.states[context.currentStep]?.Name || 'Unknown Step'
    const reason = params.join(' ') || 'User requested'

    return {
      success: true,
      message: `⏭️ **Step Skipped**\n\n**Step**: ${currentStepName}\n**Reason**: ${reason}\n\nMoving to the next step...`,
      action: 'skip',
      data: { reason },
    }
  }

  private async handleRetryCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    if (context.executionStatus === 'completed') {
      return {
        success: false,
        message: '⚠️ Cannot retry - workflow has already completed successfully.',
      }
    }

    const currentStepName = context.journey.states[context.currentStep]?.Name || 'Unknown Step'

    return {
      success: true,
      message: `🔄 **Retrying Step**\n\n**Step**: ${currentStepName}\n\nAttempting to execute this step again...`,
      action: 'retry',
    }
  }

  private async handleStatusCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    const progress = ((context.currentStep + 1) / context.journey.states.length) * 100
    const currentStepName = context.journey.states[context.currentStep]?.Name || 'Unknown Step'

    // Calculate estimated time remaining based on execution history
    const avgStepTime = this.calculateAverageStepTime(context.executionHistory)
    const remainingSteps = context.journey.states.length - context.currentStep - 1
    const estimatedTimeRemaining = remainingSteps * avgStepTime

    const progressBar = this.generateProgressBar(progress)

    let message = `📊 **Workflow Status**\n\n`
    message += `**Name**: ${context.journey.title}\n`
    message += `**Current Step**: ${context.currentStep + 1}/${context.journey.states.length} - ${currentStepName}\n`
    message += `**Status**: ${context.executionStatus.charAt(0).toUpperCase() + context.executionStatus.slice(1)}\n`
    message += `**Progress**: ${progress.toFixed(0)}%\n\n`
    message += `${progressBar}\n\n`

    if (estimatedTimeRemaining > 0) {
      message += `**Estimated time remaining**: ${this.formatDuration(estimatedTimeRemaining)}\n`
    }

    if (context.executionHistory.length > 0) {
      const lastStep = context.executionHistory[context.executionHistory.length - 1]
      message += `**Last completed**: ${lastStep.stepName} (${this.formatDuration(lastStep.executionTime)})\n`
    }

    return {
      success: true,
      message,
      action: 'none',
    }
  }

  private async handleHistoryCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    const count = params[0] ? Number.parseInt(params[0], 10) : 10
    const recentHistory = context.executionHistory.slice(-count)

    if (recentHistory.length === 0) {
      return {
        success: true,
        message: '📝 **Execution History**\n\nNo execution history available yet.',
      }
    }

    let message = `📝 **Execution History** (last ${recentHistory.length} steps)\n\n`

    recentHistory.forEach((entry, index) => {
      const status = entry.success ? '✅' : '❌'
      const time = this.formatDuration(entry.executionTime)
      message += `${status} **Step ${entry.stepNumber}**: ${entry.stepName} (${time})\n`
    })

    return {
      success: true,
      message,
      action: 'none',
    }
  }

  private async handleStepsCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    let message = `📋 **Workflow Steps**\n\n**${context.journey.title}**\n\n`

    context.journey.states.forEach((step, index) => {
      const isCurrent = index === context.currentStep
      const isCompleted = index < context.currentStep
      const status = isCompleted ? '✅' : isCurrent ? '🔄' : '⏸️'

      message += `${status} **Step ${index + 1}**: ${step.Name || step.id}\n`
      if (step.type) {
        message += `   *Type*: ${step.type}\n`
      }
      if (step.toolId) {
        message += `   *Tool*: ${step.toolId}\n`
      }
      message += '\n'
    })

    return {
      success: true,
      message,
      action: 'none',
    }
  }

  private async handleDebugCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    const stepId = params[0] || context.journey.states[context.currentStep]?.id
    const step =
      context.journey.states.find((s) => s.id === stepId) ||
      context.journey.states[context.currentStep]

    if (!step) {
      return {
        success: false,
        message: '❌ Step not found for debugging.',
      }
    }

    const debugInfo = {
      stepId: step.id,
      stepName: step.Name || 'Unnamed',
      stepType: step.type || 'Unknown',
      toolId: step.toolId || 'None',
      configuration: step.configuration || {},
      position: context.journey.states.indexOf(step) + 1,
    }

    const message = `🔧 **Debug Information**\n\n\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\`\n\nThis shows the technical details of step ${debugInfo.position}.`

    return {
      success: true,
      message,
      action: 'debug',
      data: debugInfo,
    }
  }

  private async handleContextCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    // This would show workflow variables and context data
    const contextData = {
      journeyId: context.journeyId,
      workspaceId: context.workspaceId,
      currentStep: context.currentStep,
      totalSteps: context.journey.states.length,
      executionStatus: context.executionStatus,
      // Add more context variables as they become available
    }

    const message = `🔍 **Workflow Context**\n\n\`\`\`json\n${JSON.stringify(contextData, null, 2)}\n\`\`\`\n\nThis shows the current workflow execution context.`

    return {
      success: true,
      message,
      action: 'none',
      data: contextData,
    }
  }

  private async handleGotoCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    if (context.executionStatus === 'running') {
      return {
        success: false,
        message: '⚠️ Cannot jump to step while workflow is running. Pause first.',
      }
    }

    const target = params[0]
    let targetStep: number

    if (/^\d+$/.test(target)) {
      targetStep = Number.parseInt(target, 10) - 1 // Convert to 0-based index
    } else {
      // Try to find step by ID
      const stepIndex = context.journey.states.findIndex((s) => s.id === target)
      if (stepIndex === -1) {
        return {
          success: false,
          message: `❌ Step "${target}" not found.`,
        }
      }
      targetStep = stepIndex
    }

    if (targetStep < 0 || targetStep >= context.journey.states.length) {
      return {
        success: false,
        message: `❌ Step ${targetStep + 1} is out of range (1-${context.journey.states.length}).`,
      }
    }

    const stepName = context.journey.states[targetStep]?.Name || 'Unknown Step'

    return {
      success: true,
      message: `🎯 **Jumping to Step ${targetStep + 1}**\n\n**Step**: ${stepName}\n\n⚠️ **Warning**: This is an advanced operation. Make sure you understand the workflow dependencies.`,
      action: 'debug',
      data: { targetStep },
      requiresConfirmation: true,
    }
  }

  private async handleHelpCommand(
    context: CommandContext,
    params: string[]
  ): Promise<CommandResult> {
    if (params[0]) {
      // Help for specific command
      const command = this.findCommand(params[0])
      if (!command) {
        return {
          success: false,
          message: `❓ Command "${params[0]}" not found.`,
        }
      }

      let message = `📖 **Help: /${command.Name}**\n\n`
      message += `**Description**: ${command.description}\n`
      message += `**Usage**: ${command.usage}\n\n`
      message += `**Examples**:\n${command.examples.map((e) => `• ${e}`).join('\n')}\n\n`

      if (command.aliases.length > 0) {
        message += `**Aliases**: ${command.aliases.map((a) => `/${a}`).join(', ')}\n`
      }

      return {
        success: true,
        message,
        action: 'none',
      }
    }

    return {
      success: true,
      message: this.getHelpMessage(context),
      action: 'none',
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private generateProgressBar(percentage: number): string {
    const totalBars = 20
    const filledBars = Math.round((percentage / 100) * totalBars)
    const emptyBars = totalBars - filledBars

    return `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${percentage.toFixed(0)}%`
  }

  private calculateAverageStepTime(history: any[]): number {
    if (history.length === 0) return 0

    const totalTime = history.reduce((sum, entry) => sum + entry.executionTime, 0)
    return totalTime / history.length
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }
}
