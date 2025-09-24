/**
 * Block-Specific Converter Handlers
 *
 * Specialized conversion logic for each type of workflow block,
 * ensuring accurate mapping to Parlant journey states with full
 * preservation of functionality and configuration.
 */

import type {
  ReactFlowNode,
  SimBlockType,
  BlockConfiguration,
  JourneyStateDefinition,
  JourneyStateConfiguration,
  ChatStateConfiguration,
  ToolStateConfiguration,
  ConditionalStateConfiguration,
  FinalStateConfiguration,
  WorkflowAnalysisResult,
  ConversionContext,
  ToolDependency,
  ParameterMapping,
  ErrorMapping,
  TransformationFunction,
  ValidationRule,
  RecoveryStrategy
} from './types'

/**
 * Abstract base class for block converters
 */
export abstract class BlockConverter {
  protected context: ConversionContext

  constructor(context: ConversionContext) {
    this.context = context
  }

  /**
   * Convert a workflow block to a journey state
   */
  abstract convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null>

  /**
   * Validate that this converter can handle the given block type
   */
  abstract canHandle(blockType: SimBlockType): boolean

  /**
   * Get the priority of this converter (higher numbers = higher priority)
   */
  abstract getPriority(): number

  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.context.logger) {
      this.context.logger[level](message, meta)
    }
  }

  protected generateStateId(nodeId: string): string {
    return `state_${nodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  protected extractBlockConfiguration(node: ReactFlowNode): BlockConfiguration | null {
    if (!node.data?.blockConfig) return null

    return {
      type: node.type as SimBlockType,
      parameters: node.data.config || node.data.parameters || {},
      inputSchema: node.data.inputSchema,
      outputSchema: node.data.outputSchema,
      errorHandling: node.data.errorHandling,
      execution: node.data.execution,
      validation: node.data.validation,
      ui: node.data.ui
    }
  }

  protected createDefaultErrorHandling(node: ReactFlowNode): any {
    return {
      onError: 'retry',
      maxRetries: 3,
      timeout: 30000,
      fallbackState: node.data?.errorHandling?.fallbackState
    }
  }
}

/**
 * Converter for start blocks
 */
export class StartBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'start'
  }

  getPriority(): number {
    return 100
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    // Start blocks don't create actual states - they mark entry points
    // The journey mapper will handle creating proper initial states
    return null
  }
}

/**
 * Converter for end blocks
 */
export class EndBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'end'
  }

  getPriority(): number {
    return 100
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    const stateId = this.generateStateId(node.id)

    const configuration: FinalStateConfiguration = {
      stateType: 'final',
      outcome: {
        status: this.determineOutcomeStatus(node),
        message: node.data?.message || node.data?.label || 'Workflow completed',
        data: node.data?.outputData || {}
      },
      cleanup: {
        clearVariables: node.data?.clearVariables !== false,
        saveSession: node.data?.saveSession !== false,
        sendNotifications: node.data?.sendNotifications === true
      }
    }

    return {
      id: stateId,
      name: node.data?.label || 'End State',
      description: node.data?.description || 'Workflow completion state',
      stateType: 'final',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: true,
      position: node.position,
      originalNodeId: node.id,
      blockType: 'end',
      errorHandling: this.createDefaultErrorHandling(node)
    }
  }

  private determineOutcomeStatus(node: ReactFlowNode): 'success' | 'failure' | 'cancelled' | 'timeout' {
    if (node.data?.status) return node.data.status
    if (node.data?.error || node.data?.failure) return 'failure'
    if (node.data?.cancelled) return 'cancelled'
    if (node.data?.timeout) return 'timeout'
    return 'success'
  }
}

/**
 * Converter for tool blocks
 */
export class ToolBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'tool'
  }

  getPriority(): number {
    return 90
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    const stateId = this.generateStateId(node.id)
    const toolId = this.extractToolId(node)

    if (!toolId) {
      this.log('warn', 'Tool block missing toolId', { nodeId: node.id })
      return null
    }

    const toolConfig = await this.buildToolConfiguration(node, toolId, analysis)

    const configuration: ToolStateConfiguration = {
      stateType: 'tool',
      toolId,
      parameters: node.data?.config || node.data?.parameters || {},
      inputMapping: toolConfig.inputMapping,
      outputMapping: toolConfig.outputMapping,
      errorHandling: {
        strategy: node.data?.errorHandling?.strategy || 'retry',
        maxRetries: node.data?.errorHandling?.maxRetries || 3,
        fallbackValue: node.data?.errorHandling?.fallbackValue,
        timeout: node.data?.errorHandling?.timeout || 30000
      },
      async: node.data?.async === true,
      cacheable: node.data?.cacheable !== false
    }

    return {
      id: stateId,
      name: node.data?.label || `Tool: ${toolId}`,
      description: node.data?.description || `Execute tool: ${toolId}`,
      stateType: 'tool',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: false,
      position: node.position,
      originalNodeId: node.id,
      blockType: 'tool',
      dependencies: this.extractDependencies(node, analysis),
      executionGroup: this.getExecutionGroup(node, analysis),
      errorHandling: this.createToolErrorHandling(node)
    }
  }

  private extractToolId(node: ReactFlowNode): string | null {
    return node.data?.toolId || node.data?.tool || node.data?.action || null
  }

  private async buildToolConfiguration(
    node: ReactFlowNode,
    toolId: string,
    analysis: WorkflowAnalysisResult
  ): Promise<{ inputMapping: ParameterMapping[], outputMapping: ParameterMapping[] }> {
    // Find tool compatibility information
    const toolCompatibility = analysis.toolAnalysis.toolCompatibility.find(t => t.toolId === toolId)

    if (!toolCompatibility) {
      // Create default mappings
      return {
        inputMapping: await this.createDefaultInputMapping(node, toolId),
        outputMapping: await this.createDefaultOutputMapping(node, toolId)
      }
    }

    // Use existing compatibility information to build mappings
    return {
      inputMapping: await this.createInputMappingFromCompatibility(node, toolCompatibility),
      outputMapping: await this.createOutputMappingFromCompatibility(node, toolCompatibility)
    }
  }

  private async createDefaultInputMapping(node: ReactFlowNode, toolId: string): Promise<ParameterMapping[]> {
    const mappings: ParameterMapping[] = []

    if (node.data?.config) {
      for (const [key, value] of Object.entries(node.data.config)) {
        mappings.push({
          workflowParameter: key,
          journeyParameter: key,
          transformation: this.createTransformationFunction(key, value),
          validation: this.createValidationRules(key, value),
          required: this.isParameterRequired(key, node),
          defaultValue: value,
          description: `Parameter ${key} for tool ${toolId}`
        })
      }
    }

    return mappings
  }

  private async createDefaultOutputMapping(node: ReactFlowNode, toolId: string): Promise<ParameterMapping[]> {
    const mappings: ParameterMapping[] = []

    // Standard output mappings
    mappings.push({
      workflowParameter: 'result',
      journeyParameter: 'toolResult',
      required: false,
      description: `Primary result from tool ${toolId}`
    })

    mappings.push({
      workflowParameter: 'success',
      journeyParameter: 'executionSuccess',
      required: false,
      defaultValue: false,
      description: `Success flag for tool ${toolId}`
    })

    mappings.push({
      workflowParameter: 'error',
      journeyParameter: 'executionError',
      required: false,
      description: `Error information from tool ${toolId}`
    })

    // Add custom output mappings if specified
    if (node.data?.outputs) {
      for (const [key, mapping] of Object.entries(node.data.outputs)) {
        mappings.push({
          workflowParameter: key,
          journeyParameter: typeof mapping === 'string' ? mapping : key,
          required: false,
          description: `Custom output ${key} from tool ${toolId}`
        })
      }
    }

    return mappings
  }

  private async createInputMappingFromCompatibility(
    node: ReactFlowNode,
    compatibility: any
  ): Promise<ParameterMapping[]> {
    // Use compatibility information to create more accurate mappings
    return this.createDefaultInputMapping(node, compatibility.toolId)
  }

  private async createOutputMappingFromCompatibility(
    node: ReactFlowNode,
    compatibility: any
  ): Promise<ParameterMapping[]> {
    // Use compatibility information to create more accurate mappings
    return this.createDefaultOutputMapping(node, compatibility.toolId)
  }

  private createTransformationFunction(key: string, value: any): TransformationFunction | undefined {
    // Create transformation function based on value type and patterns
    if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
      return {
        type: 'computed',
        expression: value,
        validation: {
          inputTypes: ['string'],
          outputType: 'string'
        }
      }
    }

    if (Array.isArray(value)) {
      return {
        type: 'aggregate',
        function: 'array_processing',
        validation: {
          inputTypes: ['array'],
          outputType: 'array'
        }
      }
    }

    return undefined
  }

  private createValidationRules(key: string, value: any): ValidationRule[] {
    const rules: ValidationRule[] = []

    // Type validation
    rules.push({
      type: 'type',
      constraint: typeof value,
      errorMessage: `Parameter ${key} must be of type ${typeof value}`,
      severity: 'error'
    })

    // Value-specific validations
    if (typeof value === 'string' && value.includes('@')) {
      rules.push({
        type: 'pattern',
        constraint: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        errorMessage: `Parameter ${key} must be a valid email address`,
        severity: 'error'
      })
    }

    if (typeof value === 'number' && value > 0) {
      rules.push({
        type: 'range',
        constraint: { min: 0 },
        errorMessage: `Parameter ${key} must be a positive number`,
        severity: 'error'
      })
    }

    return rules
  }

  private isParameterRequired(key: string, node: ReactFlowNode): boolean {
    // Check if parameter is marked as required
    if (node.data?.required && Array.isArray(node.data.required)) {
      return node.data.required.includes(key)
    }

    if (node.data?.validation?.required) {
      return true
    }

    // Default heuristics
    const requiredKeys = ['email', 'password', 'id', 'name', 'url', 'api_key']
    return requiredKeys.some(reqKey => key.toLowerCase().includes(reqKey))
  }

  private extractDependencies(node: ReactFlowNode, analysis: WorkflowAnalysisResult): string[] {
    const dependencyNode = analysis.dependencies.nodes.find(n => n.nodeId === node.id)
    return dependencyNode?.dependencies || []
  }

  private getExecutionGroup(node: ReactFlowNode, analysis: WorkflowAnalysisResult): string | undefined {
    // Find parallel execution group
    for (const section of analysis.structure.parallelSections) {
      for (const branch of section.branches) {
        if (branch.nodes.includes(node.id)) {
          return `parallel_${section.id}`
        }
      }
    }
    return undefined
  }

  private createToolErrorHandling(node: ReactFlowNode): any {
    return {
      onError: node.data?.errorHandling?.onError || 'retry',
      maxRetries: node.data?.errorHandling?.maxRetries || 3,
      timeout: node.data?.errorHandling?.timeout || 30000,
      fallbackState: node.data?.errorHandling?.fallbackState
    }
  }
}

/**
 * Converter for condition blocks
 */
export class ConditionBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'condition'
  }

  getPriority(): number {
    return 80
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    const stateId = this.generateStateId(node.id)
    const condition = this.extractCondition(node)

    if (!condition) {
      this.log('warn', 'Condition block missing condition expression', { nodeId: node.id })
      return null
    }

    const configuration: ChatStateConfiguration = {
      stateType: 'chat',
      prompt: {
        template: this.buildConditionalPrompt(node, condition),
        variables: this.extractVariablesFromCondition(condition),
        tone: 'professional',
        length: 'brief'
      },
      validation: {
        required: false // Conditions are evaluated automatically
      },
      conditional: {
        condition: this.translateConditionSyntax(condition),
        variables: this.extractVariablesFromCondition(condition),
        evaluationType: this.determineEvaluationType(condition),
        timeout: node.data?.timeout || 5000,
        async: node.data?.async === true,
        caching: node.data?.cache !== false
      }
    }

    return {
      id: stateId,
      name: node.data?.label || `Condition: ${this.summarizeCondition(condition)}`,
      description: node.data?.description || `Evaluate condition: ${condition}`,
      stateType: 'chat',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: false,
      position: node.position,
      originalNodeId: node.id,
      blockType: 'condition',
      errorHandling: this.createConditionalErrorHandling(node)
    }
  }

  private extractCondition(node: ReactFlowNode): string | null {
    return node.data?.condition || node.data?.expression || node.data?.rule || null
  }

  private buildConditionalPrompt(node: ReactFlowNode, condition: string): string {
    if (node.data?.prompt) {
      return node.data.prompt
    }

    if (node.data?.label) {
      return `Evaluating: ${node.data.label}`
    }

    return `Evaluating condition: ${this.humanizeCondition(condition)}`
  }

  private extractVariablesFromCondition(condition: string): Record<string, string> {
    const variables: Record<string, string> = {}
    const matches = condition.match(/\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\b/g) || []

    for (const match of matches) {
      if (!this.isReservedKeyword(match)) {
        variables[match] = `\${${match}}`
      }
    }

    return variables
  }

  private isReservedKeyword(word: string): boolean {
    const reserved = [
      'true', 'false', 'null', 'undefined',
      'and', 'or', 'not',
      'if', 'then', 'else',
      'equals', 'contains', 'matches',
      'greater', 'less', 'than'
    ]
    return reserved.includes(word.toLowerCase())
  }

  private translateConditionSyntax(condition: string): string {
    // Translate various condition syntaxes to Parlant format
    return condition
      .replace(/\s*===\s*/g, ' equals ')
      .replace(/\s*==\s*/g, ' equals ')
      .replace(/\s*!==\s*/g, ' not equals ')
      .replace(/\s*!=\s*/g, ' not equals ')
      .replace(/\s*&&\s*/g, ' and ')
      .replace(/\s*\|\|\s*/g, ' or ')
      .replace(/\s*!\s*/g, 'not ')
      .replace(/\s*>=\s*/g, ' greater than or equals ')
      .replace(/\s*<=\s*/g, ' less than or equals ')
      .replace(/\s*>\s*/g, ' greater than ')
      .replace(/\s*<\s*/g, ' less than ')
      .replace(/\.includes\(/g, ' contains ')
      .replace(/\.match\(/g, ' matches ')
      .replace(/\.test\(/g, ' matches ')
  }

  private determineEvaluationType(condition: string): 'boolean' | 'comparison' | 'regex' | 'custom' {
    if (condition.includes('matches') || condition.includes('test') || condition.includes('/')) {
      return 'regex'
    }

    if (condition.includes('greater') || condition.includes('less') ||
        condition.includes('>') || condition.includes('<') ||
        condition.includes('equals') || condition.includes('==')) {
      return 'comparison'
    }

    if (condition.includes('and') || condition.includes('or') ||
        condition === 'true' || condition === 'false') {
      return 'boolean'
    }

    return 'custom'
  }

  private summarizeCondition(condition: string): string {
    // Create a human-readable summary of the condition
    if (condition.length <= 30) {
      return condition
    }

    // Simplify complex conditions
    let summary = condition
      .replace(/\s*===\s*/g, '=')
      .replace(/\s*!==\s*/g, '≠')
      .replace(/\s*&&\s*/g, ' & ')
      .replace(/\s*\|\|\s*/g, ' | ')

    if (summary.length > 30) {
      summary = summary.substring(0, 27) + '...'
    }

    return summary
  }

  private humanizeCondition(condition: string): string {
    // Convert technical condition to human-readable form
    return condition
      .replace(/\s*===\s*/g, ' is exactly ')
      .replace(/\s*==\s*/g, ' equals ')
      .replace(/\s*!==\s*/g, ' is not ')
      .replace(/\s*!=\s*/g, ' does not equal ')
      .replace(/\s*&&\s*/g, ' and ')
      .replace(/\s*\|\|\s*/g, ' or ')
      .replace(/\s*!\s*/g, 'not ')
      .replace(/\.includes\(/g, ' contains ')
      .replace(/\.length\s*>\s*0/g, ' is not empty')
      .replace(/\.length\s*===\s*0/g, ' is empty')
  }

  private createConditionalErrorHandling(node: ReactFlowNode): any {
    return {
      onError: 'fallback',
      maxRetries: 1,
      timeout: node.data?.timeout || 5000,
      fallbackValue: false, // Default to false for failed conditions
      fallbackState: node.data?.errorHandling?.fallbackState
    }
  }
}

/**
 * Converter for user input blocks
 */
export class UserInputBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'user_input'
  }

  getPriority(): number {
    return 85
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    const stateId = this.generateStateId(node.id)

    const configuration: ChatStateConfiguration = {
      stateType: 'chat',
      prompt: {
        template: this.buildInputPrompt(node),
        variables: node.data?.variables || {},
        tone: node.data?.tone || 'friendly',
        length: node.data?.length || 'moderate'
      },
      validation: {
        required: node.data?.required !== false,
        minLength: node.data?.minLength,
        maxLength: node.data?.maxLength,
        pattern: node.data?.pattern
      },
      responseOptions: {
        type: this.determineInputType(node),
        choices: node.data?.choices,
        multiSelect: node.data?.multiSelect === true
      },
      userInput: {
        placeholder: node.data?.placeholder,
        helpText: node.data?.helpText,
        validation: this.createInputValidation(node),
        formatting: this.createInputFormatting(node)
      }
    }

    return {
      id: stateId,
      name: node.data?.label || 'User Input',
      description: node.data?.description || 'Collect user input',
      stateType: 'chat',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: false,
      position: node.position,
      originalNodeId: node.id,
      blockType: 'user_input',
      errorHandling: this.createUserInputErrorHandling(node)
    }
  }

  private buildInputPrompt(node: ReactFlowNode): string {
    if (node.data?.prompt) {
      return node.data.prompt
    }

    if (node.data?.label) {
      return node.data.label
    }

    if (node.data?.question) {
      return node.data.question
    }

    return 'Please provide your input:'
  }

  private determineInputType(node: ReactFlowNode): 'text' | 'choice' | 'number' | 'date' | 'file' {
    if (node.data?.inputType) {
      return node.data.inputType
    }

    if (node.data?.choices && Array.isArray(node.data.choices)) {
      return 'choice'
    }

    if (node.data?.dataType === 'number' || node.data?.type === 'number') {
      return 'number'
    }

    if (node.data?.dataType === 'date' || node.data?.type === 'date') {
      return 'date'
    }

    if (node.data?.acceptFiles || node.data?.fileUpload) {
      return 'file'
    }

    return 'text'
  }

  private createInputValidation(node: ReactFlowNode): any {
    const validation: any = {
      required: node.data?.required !== false
    }

    if (node.data?.minLength) {
      validation.minLength = node.data.minLength
    }

    if (node.data?.maxLength) {
      validation.maxLength = node.data.maxLength
    }

    if (node.data?.pattern) {
      validation.pattern = node.data.pattern
    }

    if (node.data?.min !== undefined) {
      validation.min = node.data.min
    }

    if (node.data?.max !== undefined) {
      validation.max = node.data.max
    }

    if (node.data?.allowedFileTypes) {
      validation.allowedFileTypes = node.data.allowedFileTypes
    }

    if (node.data?.maxFileSize) {
      validation.maxFileSize = node.data.maxFileSize
    }

    return validation
  }

  private createInputFormatting(node: ReactFlowNode): any {
    const formatting: any = {}

    if (node.data?.format) {
      formatting.format = node.data.format
    }

    if (node.data?.mask) {
      formatting.mask = node.data.mask
    }

    if (node.data?.transform) {
      formatting.transform = node.data.transform
    }

    return formatting
  }

  private createUserInputErrorHandling(node: ReactFlowNode): any {
    return {
      onError: 'retry',
      maxRetries: 3,
      timeout: node.data?.timeout || 300000, // 5 minutes for user input
      retryPrompt: node.data?.retryPrompt || 'Please try again. Make sure your input is valid.',
      fallbackState: node.data?.errorHandling?.fallbackState
    }
  }
}

/**
 * Converter for merge blocks
 */
export class MergeBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'merge' || blockType === 'parallel_join'
  }

  getPriority(): number {
    return 70
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    // Merge blocks are typically handled implicitly by the transition logic
    // However, for complex merge scenarios, we might need explicit states

    const hasMergeLogic = this.hasMergeLogic(node)

    if (!hasMergeLogic) {
      // Simple merge - handled by transitions
      return null
    }

    const stateId = this.generateStateId(node.id)

    const configuration: ChatStateConfiguration = {
      stateType: 'chat',
      prompt: {
        template: 'Merging execution paths...',
        tone: 'professional',
        length: 'brief'
      },
      validation: {
        required: false
      },
      merge: {
        strategy: node.data?.mergeStrategy || 'wait_all',
        timeout: node.data?.timeout || 30000,
        preserveData: node.data?.preserveData !== false,
        conflictResolution: node.data?.conflictResolution || 'last_wins'
      }
    }

    return {
      id: stateId,
      name: node.data?.label || 'Merge Point',
      description: node.data?.description || 'Merge parallel execution paths',
      stateType: 'chat',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: false,
      position: node.position,
      originalNodeId: node.id,
      blockType: 'merge',
      errorHandling: this.createMergeErrorHandling(node)
    }
  }

  private hasMergeLogic(node: ReactFlowNode): boolean {
    return !!(
      node.data?.mergeStrategy ||
      node.data?.conflictResolution ||
      node.data?.dataAggregation ||
      node.data?.customMergeLogic
    )
  }

  private createMergeErrorHandling(node: ReactFlowNode): any {
    return {
      onError: 'continue',
      maxRetries: 1,
      timeout: node.data?.timeout || 30000,
      partialMerge: node.data?.allowPartialMerge !== false
    }
  }
}

/**
 * Converter for parallel split blocks
 */
export class ParallelSplitBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'parallel_split'
  }

  getPriority(): number {
    return 75
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    const stateId = this.generateStateId(node.id)

    const configuration: ChatStateConfiguration = {
      stateType: 'chat',
      prompt: {
        template: 'Starting parallel execution...',
        tone: 'professional',
        length: 'brief'
      },
      validation: {
        required: false
      },
      parallelExecution: {
        type: 'split',
        synchronization: node.data?.synchronization || 'all',
        timeout: node.data?.timeout,
        errorHandling: node.data?.errorHandling || 'fail_fast',
        resourceAllocation: node.data?.resourceAllocation,
        loadBalancing: node.data?.loadBalancing
      }
    }

    return {
      id: stateId,
      name: node.data?.label || 'Parallel Split',
      description: node.data?.description || 'Split execution into parallel paths',
      stateType: 'chat',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: false,
      position: node.position,
      originalNodeId: node.id,
      blockType: 'parallel_split',
      errorHandling: this.createParallelSplitErrorHandling(node)
    }
  }

  private createParallelSplitErrorHandling(node: ReactFlowNode): any {
    return {
      onError: 'abort',
      maxRetries: 1,
      timeout: node.data?.timeout || 60000,
      cleanupOnError: node.data?.cleanupOnError !== false
    }
  }
}

/**
 * Converter for loop blocks
 */
export class LoopBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return blockType === 'loop'
  }

  getPriority(): number {
    return 75
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    const stateId = this.generateStateId(node.id)
    const loopCondition = this.extractLoopCondition(node)

    const configuration: ChatStateConfiguration = {
      stateType: 'chat',
      prompt: {
        template: this.buildLoopPrompt(node, loopCondition),
        variables: this.extractVariablesFromCondition(loopCondition),
        tone: 'professional',
        length: 'brief'
      },
      validation: {
        required: false
      },
      loop: {
        type: this.determineLoopType(node),
        condition: loopCondition,
        maxIterations: node.data?.maxIterations || 100,
        iterationVariable: node.data?.iterationVariable || 'iteration',
        breakCondition: node.data?.breakCondition,
        continueCondition: node.data?.continueCondition,
        iterationDelay: node.data?.iterationDelay || 0
      }
    }

    return {
      id: stateId,
      name: node.data?.label || 'Loop',
      description: node.data?.description || `Loop: ${loopCondition}`,
      stateType: 'chat',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: false,
      position: node.position,
      originalNodeId: node.id,
      blockType: 'loop',
      errorHandling: this.createLoopErrorHandling(node)
    }
  }

  private extractLoopCondition(node: ReactFlowNode): string {
    return node.data?.condition ||
           node.data?.while ||
           node.data?.until ||
           node.data?.forEach ||
           'true'
  }

  private determineLoopType(node: ReactFlowNode): 'while' | 'for' | 'do_while' | 'foreach' {
    if (node.data?.loopType) return node.data.loopType
    if (node.data?.forEach || node.data?.items) return 'foreach'
    if (node.data?.for || node.data?.count) return 'for'
    if (node.data?.doWhile) return 'do_while'
    return 'while'
  }

  private buildLoopPrompt(node: ReactFlowNode, condition: string): string {
    if (node.data?.prompt) return node.data.prompt

    const loopType = this.determineLoopType(node)

    switch (loopType) {
      case 'foreach':
        return `Processing items: ${condition}`
      case 'for':
        return `Iteration loop: ${condition}`
      case 'while':
        return `While loop: ${condition}`
      case 'do_while':
        return `Do-while loop: ${condition}`
      default:
        return `Loop: ${condition}`
    }
  }

  private extractVariablesFromCondition(condition: string): Record<string, string> {
    const variables: Record<string, string> = {}
    const matches = condition.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []

    for (const match of matches) {
      if (!['true', 'false', 'null', 'undefined', 'for', 'while', 'do', 'forEach'].includes(match)) {
        variables[match] = `\${${match}}`
      }
    }

    return variables
  }

  private createLoopErrorHandling(node: ReactFlowNode): any {
    return {
      onError: 'break',
      maxRetries: 1,
      timeout: node.data?.timeout || 300000, // 5 minutes for loops
      infiniteLoopProtection: node.data?.infiniteLoopProtection !== false,
      maxExecutionTime: node.data?.maxExecutionTime || 600000 // 10 minutes max
    }
  }
}

/**
 * Default converter for unknown block types
 */
export class DefaultBlockConverter extends BlockConverter {
  canHandle(blockType: SimBlockType): boolean {
    return true // Handles any block type
  }

  getPriority(): number {
    return 1 // Lowest priority - used as fallback
  }

  async convert(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    this.log('warn', 'Using default converter for unknown block type', {
      nodeId: node.id,
      blockType: node.type
    })

    const stateId = this.generateStateId(node.id)

    // Create a generic chat state for unknown blocks
    const configuration: ChatStateConfiguration = {
      stateType: 'chat',
      prompt: {
        template: node.data?.label || node.data?.prompt || `Processing ${node.type} block`,
        variables: node.data?.variables || {},
        tone: 'professional'
      },
      validation: {
        required: false
      },
      generic: {
        originalType: node.type,
        originalData: node.data,
        fallbackBehavior: 'continue'
      }
    }

    return {
      id: stateId,
      name: node.data?.label || `${node.type}: ${node.id}`,
      description: node.data?.description || `Generic state for ${node.type} block`,
      stateType: 'chat',
      configuration: JSON.stringify(configuration),
      isInitial: false,
      isFinal: false,
      position: node.position,
      originalNodeId: node.id,
      blockType: node.type as SimBlockType,
      errorHandling: this.createDefaultErrorHandling(node)
    }
  }
}

/**
 * Block Converter Registry
 *
 * Manages all block converters and routes blocks to appropriate converters
 */
export class BlockConverterRegistry {
  private converters: BlockConverter[] = []

  constructor(context: ConversionContext) {
    // Register all converters in priority order
    this.converters = [
      new StartBlockConverter(context),
      new EndBlockConverter(context),
      new ToolBlockConverter(context),
      new UserInputBlockConverter(context),
      new ConditionBlockConverter(context),
      new ParallelSplitBlockConverter(context),
      new LoopBlockConverter(context),
      new MergeBlockConverter(context),
      new DefaultBlockConverter(context) // Always last (lowest priority)
    ].sort((a, b) => b.getPriority() - a.getPriority())
  }

  /**
   * Find the best converter for a given block type
   */
  getConverter(blockType: SimBlockType): BlockConverter {
    const converter = this.converters.find(c => c.canHandle(blockType))

    if (!converter) {
      throw new Error(`No converter found for block type: ${blockType}`)
    }

    return converter
  }

  /**
   * Convert a workflow node using the appropriate converter
   */
  async convertNode(
    node: ReactFlowNode,
    analysis: WorkflowAnalysisResult
  ): Promise<JourneyStateDefinition | null> {
    const blockType = node.type as SimBlockType
    const converter = this.getConverter(blockType)

    return await converter.convert(node, analysis)
  }

  /**
   * Get all available converters
   */
  getAllConverters(): BlockConverter[] {
    return [...this.converters]
  }

  /**
   * Register a custom converter
   */
  registerConverter(converter: BlockConverter): void {
    this.converters.push(converter)
    this.converters.sort((a, b) => b.getPriority() - a.getPriority())
  }
}