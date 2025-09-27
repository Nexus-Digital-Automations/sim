/**
 * Journey Generator - Dynamic Journey Creation from Workflow Templates
 * ===================================================================
 *
 * This module generates Parlant journeys from processed workflow templates,
 * converting workflow blocks to journey states and edges to transitions.
 * It handles complex mappings, optimizations, and journey-specific logic.
 */

import { v4 as uuidv4 } from 'uuid'
import { type ProcessedTemplate, TemplateEngine } from '../core/template-engine'
import type {
  ConversionResult,
  GeneratedJourney,
  JourneyGenerationRequest,
  JourneyState,
  JourneyTransition,
  JourneyVariable,
  OptimizationTarget,
} from '../types/journey-types'
import type { TemplateBlock, TemplateEdge, WorkflowTemplate } from '../types/template-types'
import type { WorkflowAnalysis, WorkflowBlockType } from '../types/workflow-types'

export class JourneyGenerator {
  private readonly templateEngine = new TemplateEngine()
  private readonly blockConverters = new Map<WorkflowBlockType, BlockConverter>()
  private readonly optimizers = new Map<OptimizationTarget, JourneyOptimizer>()

  constructor() {
    this.initializeBlockConverters()
    this.initializeOptimizers()
  }

  /**
   * Generate a journey from a workflow template
   */
  async generateJourney(request: JourneyGenerationRequest): Promise<ConversionResult> {
    const startTime = Date.now()
    const conversionId = uuidv4()

    try {
      console.log(`Starting journey generation for template ${request.templateId}`)

      // Step 1: Load and process template
      const template = await this.loadTemplate(request.templateId, request.workspaceId)
      const processedTemplate = await this.templateEngine.processTemplate(
        template,
        request.parameters,
        {
          contextId: conversionId,
          workspaceId: request.workspaceId,
          userId: request.userId,
          agentId: request.agentId,
          optimizationLevel: request.options.optimizationLevel || 'standard',
          cacheEnabled: request.options.useCache || true,
          validationEnabled: request.options.validateGeneration || true,
        }
      )

      // Step 2: Analyze workflow structure
      const workflowAnalysis = await this.analyzeWorkflow(
        request.workflowId,
        processedTemplate.processedData
      )

      // Step 3: Generate journey structure
      const journeyStructure = await this.generateJourneyStructure(
        processedTemplate,
        workflowAnalysis,
        request
      )

      // Step 4: Apply optimizations
      const optimizedJourney = await this.applyOptimizations(
        journeyStructure,
        request.options.optimizationTargets || ['performance', 'user_experience'],
        request.options.optimizationLevel || 'standard'
      )

      // Step 5: Validate generated journey
      const validationResults = request.options.validateGeneration
        ? await this.validateJourney(optimizedJourney, request)
        : []

      // Step 6: Generate analytics and performance metrics
      const performance = this.calculatePerformanceMetrics(startTime, optimizedJourney)
      const analytics = await this.generateJourneyAnalytics(optimizedJourney, request)

      const result: ConversionResult = {
        success: true,
        journey: optimizedJourney,
        conversionId,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        templateId: request.templateId,
        workflowId: request.workflowId,
        parameters: request.parameters,
        statesGenerated: optimizedJourney.states.length,
        transitionsGenerated: optimizedJourney.transitions.length,
        variablesCreated: optimizedJourney.variables.length,
        optimizationsApplied: 0, // TODO: Track applied optimizations
        validationResults,
        warnings: [],
        errors: [],
        performance,
        cacheHit: false, // TODO: Implement caching
      }

      console.log(`Journey generation completed successfully in ${result.duration}ms`)
      return result
    } catch (error) {
      console.error(`Journey generation failed:`, error)

      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      return {
        success: false,
        conversionId,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        templateId: request.templateId,
        workflowId: request.workflowId,
        parameters: request.parameters,
        statesGenerated: 0,
        transitionsGenerated: 0,
        variablesCreated: 0,
        optimizationsApplied: 0,
        validationResults: [],
        warnings: [],
        errors: [
          {
            code: 'GENERATION_FAILED',
            message: errorMessage,
            category: 'system',
            fatal: true,
            context: { error: errorStack },
          },
        ],
        performance: this.calculatePerformanceMetrics(startTime),
        cacheHit: false,
      }
    }
  }

  /**
   * Generate journey structure from processed template
   */
  private async generateJourneyStructure(
    processedTemplate: ProcessedTemplate,
    workflowAnalysis: WorkflowAnalysis,
    request: JourneyGenerationRequest
  ): Promise<GeneratedJourney> {
    const journeyId = uuidv4()
    const workflowData = processedTemplate.processedData

    console.log(`Generating journey structure for ${workflowData.blocks?.length || 0} blocks`)

    // Initialize journey
    const journey: GeneratedJourney = {
      id: journeyId,
      title: this.generateJourneyTitle(processedTemplate.template, request.parameters),
      description: this.generateJourneyDescription(processedTemplate.template, request.parameters),
      agentId: request.agentId,
      workspaceId: request.workspaceId,
      templateId: request.templateId,
      states: [],
      transitions: [],
      variables: [],
      entryConditions: [],
      exitConditions: [],
      errorHandling: [],
      estimatedDuration: 0,
      complexity: this.determineComplexity(workflowAnalysis),
      tags: processedTemplate.template.tags || [],
      generatedAt: new Date(),
      generatedBy: request.userId || 'system',
      generationVersion: '1.0.0',
      sourceTemplate: request.templateId,
      analytics: {
        totalSessions: 0,
        completedSessions: 0,
        abandonedSessions: 0,
        averageCompletionTime: 0,
        stateVisits: {},
        stateCompletionRates: {},
        stateAverageTime: {},
        transitionUsage: {},
        transitionSuccessRates: {},
        errorsByState: {},
        errorsByTransition: {},
        satisfactionScores: [],
        feedbackComments: [],
        performance: {
          generationTime: 0,
          templateProcessingTime: processedTemplate.processingTime,
          validationTime: 0,
          optimizationTime: 0,
          averageStateLoadTime: 0,
          averageTransitionTime: 0,
          cacheHitRate: 0,
          memoryUsage: { peak: 0, average: 0, total: 0, unit: 'MB' },
          computeUsage: { peak: 0, average: 0, total: 0, unit: 'CPU' },
          networkUsage: { peak: 0, average: 0, total: 0, unit: 'KB' },
        },
      },
      performance: {
        generationTime: 0,
        templateProcessingTime: processedTemplate.processingTime,
        validationTime: 0,
        optimizationTime: 0,
        averageStateLoadTime: 0,
        averageTransitionTime: 0,
        cacheHitRate: 0,
        memoryUsage: { peak: 0, average: 0, total: 0, unit: 'MB' },
        computeUsage: { peak: 0, average: 0, total: 0, unit: 'CPU' },
        networkUsage: { peak: 0, average: 0, total: 0, unit: 'KB' },
      },
    }

    // Convert blocks to states
    const blockConversionMap = new Map<string, JourneyState>()

    for (const block of workflowData.blocks || []) {
      const state = await this.convertBlockToState(
        block,
        processedTemplate,
        request,
        workflowAnalysis
      )

      if (state) {
        journey.states.push(state)
        blockConversionMap.set(block.id, state)
      }
    }

    // Convert edges to transitions
    for (const edge of workflowData.edges || []) {
      const fromState = blockConversionMap.get(edge.sourceBlockId)
      const toState = blockConversionMap.get(edge.targetBlockId)

      if (fromState && toState) {
        const transition = await this.convertEdgeToTransition(
          edge,
          fromState,
          toState,
          processedTemplate,
          request
        )

        if (transition) {
          journey.transitions.push(transition)
        }
      }
    }

    // Generate variables
    journey.variables = await this.generateJourneyVariables(
      processedTemplate,
      workflowData.variables || {},
      request
    )

    // Set initial and final states
    this.setInitialAndFinalStates(journey, workflowAnalysis)

    // Calculate estimated duration
    journey.estimatedDuration = this.calculateEstimatedDuration(journey)

    console.log(
      `Generated journey with ${journey.states.length} states and ${journey.transitions.length} transitions`
    )

    return journey
  }

  /**
   * Convert a workflow block to a journey state
   */
  private async convertBlockToState(
    block: TemplateBlock,
    processedTemplate: ProcessedTemplate,
    request: JourneyGenerationRequest,
    workflowAnalysis: WorkflowAnalysis
  ): Promise<JourneyState | null> {
    const converter = this.blockConverters.get(block.type as WorkflowBlockType)

    if (!converter) {
      console.warn(`No converter found for block type: ${block.type}`)
      return null
    }

    try {
      const state = await converter.convert(block, {
        processedTemplate,
        request,
        workflowAnalysis,
        stateId: uuidv4(),
      })

      return state
    } catch (error) {
      console.error(`Failed to convert block ${block.id} to state:`, error)
      return null
    }
  }

  /**
   * Convert a workflow edge to a journey transition
   */
  private async convertEdgeToTransition(
    edge: TemplateEdge,
    fromState: JourneyState,
    toState: JourneyState,
    processedTemplate: ProcessedTemplate,
    request: JourneyGenerationRequest
  ): Promise<JourneyTransition | null> {
    try {
      const transition: JourneyTransition = {
        id: uuidv4(),
        fromStateId: fromState.id,
        toStateId: toState.id,
        conditions: edge.conditionalConnection ? [edge.conditionalConnection] : [],
        priority: 100,
        actions: [],
        validations: [],
        metadata: {
          sourceEdgeId: edge.id,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        },
      }

      // Apply dynamic routing if present
      if (edge.dynamicRouting) {
        for (const rule of edge.dynamicRouting) {
          transition.conditions.push(rule.condition)
          transition.priority = Math.max(transition.priority, rule.priority)
        }
      }

      return transition
    } catch (error) {
      console.error(`Failed to convert edge ${edge.id} to transition:`, error)
      return null
    }
  }

  /**
   * Generate journey variables from workflow variables and template parameters
   */
  private async generateJourneyVariables(
    processedTemplate: ProcessedTemplate,
    workflowVariables: Record<string, any>,
    request: JourneyGenerationRequest
  ): Promise<JourneyVariable[]> {
    const variables: JourneyVariable[] = []

    // Convert template parameters to journey variables
    for (const param of processedTemplate.template.parameters) {
      variables.push({
        id: uuidv4(),
        name: param.name,
        type: this.mapParameterTypeToVariableType(param.type),
        scope: 'journey',
        defaultValue: param.defaultValue,
        persistent: true,
        encrypted:
          param.name.toLowerCase().includes('secret') ||
          param.name.toLowerCase().includes('password'),
        validation: {
          rules: param.validation ? this.convertValidationRules(param.validation) : [],
        },
        description: param.description,
        category: param.category || 'template',
        metadata: {
          sourceParameterId: param.id,
          required: param.required,
        },
      })
    }

    // Convert workflow variables
    for (const [name, value] of Object.entries(workflowVariables)) {
      variables.push({
        id: uuidv4(),
        name,
        type: this.inferVariableType(value),
        scope: 'journey',
        defaultValue: value,
        persistent: false,
        encrypted: false,
        description: `Workflow variable: ${name}`,
        category: 'workflow',
        metadata: {
          sourceType: 'workflow',
        },
      })
    }

    return variables
  }

  /**
   * Apply optimizations to the generated journey
   */
  private async applyOptimizations(
    journey: GeneratedJourney,
    targets: OptimizationTarget[],
    level: 'minimal' | 'standard' | 'aggressive'
  ): Promise<GeneratedJourney> {
    let optimizedJourney = { ...journey }

    for (const target of targets) {
      const optimizer = this.optimizers.get(target)
      if (optimizer) {
        optimizedJourney = await optimizer.optimize(optimizedJourney, level)
      }
    }

    return optimizedJourney
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async loadTemplate(templateId: string, workspaceId: string): Promise<WorkflowTemplate> {
    // In a real implementation, this would load from database
    throw new Error('Template loading not implemented')
  }

  private async analyzeWorkflow(workflowId: string, workflowData: any): Promise<WorkflowAnalysis> {
    // In a real implementation, this would analyze the workflow structure
    return {
      workflowId,
      analysis: {
        totalBlocks: workflowData.blocks?.length || 0,
        totalEdges: workflowData.edges?.length || 0,
        blocksByType: {},
        entryPoints: ['start'],
        exitPoints: ['end'],
        cycles: [],
        branches: [],
        parallelPaths: [],
        dependencies: [],
        criticalPath: [],
        isolatedBlocks: [],
        dataFlow: {
          inputs: [],
          outputs: [],
          transformations: [],
          flows: [],
          sinks: [],
          sources: [],
        },
        variableUsage: {
          variables: [],
          totalVariables: 0,
          scopeDistribution: {},
          typeDistribution: {},
          unusedVariables: [],
          overusedVariables: [],
        },
      },
      complexity: {
        overall: 'moderate',
        scores: {
          structural: 50,
          logical: 50,
          dataFlow: 50,
          integration: 50,
        },
        factors: [],
      },
      suitability: {
        score: 80,
        suitabilityLevel: 'good',
        strengths: [],
        weaknesses: [],
        recommendations: [],
      },
      recommendations: [],
      metadata: {
        name: 'Workflow',
        tags: [],
        author: 'system',
        created: new Date(),
        updated: new Date(),
        isPublic: false,
      },
    }
  }

  private generateJourneyTitle(
    template: WorkflowTemplate,
    parameters: Record<string, any>
  ): string {
    return template.name || 'Generated Journey'
  }

  private generateJourneyDescription(
    template: WorkflowTemplate,
    parameters: Record<string, any>
  ): string {
    return template.description || 'Journey generated from workflow template'
  }

  private determineComplexity(analysis: WorkflowAnalysis): 'simple' | 'moderate' | 'complex' {
    return analysis.complexity.overall === 'very_complex' ? 'complex' : analysis.complexity.overall
  }

  private setInitialAndFinalStates(journey: GeneratedJourney, analysis: WorkflowAnalysis): void {
    // Set initial states
    for (const entryPoint of analysis.analysis.entryPoints) {
      const state = journey.states.find((s) => s.metadata.sourceBlockId === entryPoint)
      if (state) {
        state.isInitial = true
      }
    }

    // Set final states
    for (const exitPoint of analysis.analysis.exitPoints) {
      const state = journey.states.find((s) => s.metadata.sourceBlockId === exitPoint)
      if (state) {
        state.isFinal = true
      }
    }

    // If no initial/final states found, use first/last
    if (!journey.states.some((s) => s.isInitial) && journey.states.length > 0) {
      journey.states[0].isInitial = true
    }

    if (!journey.states.some((s) => s.isFinal) && journey.states.length > 0) {
      journey.states[journey.states.length - 1].isFinal = true
    }
  }

  private calculateEstimatedDuration(journey: GeneratedJourney): number {
    // Simple estimation: 2 minutes per state
    return journey.states.length * 2
  }

  private mapParameterTypeToVariableType(paramType: string): any {
    const typeMap: Record<string, any> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
      json: 'object',
      enum: 'string',
      date: 'date',
      reference: 'reference',
    }
    return typeMap[paramType] || 'string'
  }

  private convertValidationRules(validation: any): any[] {
    // Convert template validation to journey validation rules
    return []
  }

  private inferVariableType(value: any): any {
    if (typeof value === 'string') return 'string'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (Array.isArray(value)) return 'array'
    if (value instanceof Date) return 'date'
    return 'object'
  }

  private calculatePerformanceMetrics(startTime: number, journey?: GeneratedJourney): any {
    const endTime = Date.now()
    return {
      templateLoadTime: 0,
      parameterValidationTime: 0,
      workflowAnalysisTime: 0,
      journeyGenerationTime: endTime - startTime,
      optimizationTime: 0,
      validationTime: 0,
      totalTime: endTime - startTime,
      peakMemoryMB: 0,
      averageMemoryMB: 0,
      cacheOperations: 0,
      databaseQueries: 0,
    }
  }

  private async generateJourneyAnalytics(
    journey: GeneratedJourney,
    request: JourneyGenerationRequest
  ): Promise<any> {
    // Generate initial analytics structure
    return journey.analytics
  }

  private async validateJourney(
    journey: GeneratedJourney,
    request: JourneyGenerationRequest
  ): Promise<any[]> {
    // Implement journey validation
    return []
  }

  // ============================================================================
  // Block Converters Initialization
  // ============================================================================

  private initializeBlockConverters(): void {
    // Starter block converter
    this.blockConverters.set('starter', {
      convert: async (block, context) => ({
        id: context.stateId,
        name: block.name || 'Start',
        stateType: 'chat',
        content: {
          chatPrompt: "Welcome! Let's get started.",
        },
        isInitial: true,
        isFinal: false,
        allowSkip: false,
        validationRules: [],
        uiConfiguration: {
          layout: 'default',
          position: 'center',
          showProgress: true,
          showBreadcrumbs: true,
          showHelp: true,
          showSkip: false,
          accessibilityFeatures: [],
          mobileOptimized: true,
          touchGestures: [],
        },
        metadata: {
          sourceBlockId: block.id,
          sourceBlockType: block.type,
        },
      }),
    })

    // Agent block converter
    this.blockConverters.set('agent', {
      convert: async (block, context) => ({
        id: context.stateId,
        name: block.name || 'AI Interaction',
        stateType: 'chat',
        content: {
          chatPrompt: block.data?.prompt || 'How can I help you?',
          systemInstructions: block.data?.systemInstructions,
        },
        isInitial: false,
        isFinal: false,
        allowSkip: true,
        validationRules: [],
        uiConfiguration: {
          layout: 'default',
          position: 'center',
          showProgress: true,
          showBreadcrumbs: true,
          showHelp: true,
          showSkip: true,
          accessibilityFeatures: [],
          mobileOptimized: true,
          touchGestures: [],
        },
        metadata: {
          sourceBlockId: block.id,
          sourceBlockType: block.type,
          agentConfiguration: block.data,
        },
      }),
    })

    // API block converter
    this.blockConverters.set('api', {
      convert: async (block, context) => ({
        id: context.stateId,
        name: block.name || 'API Call',
        stateType: 'processing',
        content: {
          processingMessage: 'Making API request...',
          progressIndicator: true,
          estimatedDuration: 5,
        },
        isInitial: false,
        isFinal: false,
        allowSkip: false,
        validationRules: [],
        uiConfiguration: {
          layout: 'compact',
          position: 'center',
          showProgress: true,
          showBreadcrumbs: true,
          showHelp: false,
          showSkip: false,
          accessibilityFeatures: [],
          mobileOptimized: true,
          touchGestures: [],
        },
        metadata: {
          sourceBlockId: block.id,
          sourceBlockType: block.type,
          apiConfiguration: block.data,
        },
      }),
    })

    // Decision block converter
    this.blockConverters.set('decision', {
      convert: async (block, context) => ({
        id: context.stateId,
        name: block.name || 'Decision Point',
        stateType: 'decision',
        content: {
          decisionPrompt: 'Please make a choice:',
          options: [
            { id: 'yes', label: 'Yes', value: true },
            { id: 'no', label: 'No', value: false },
          ],
        },
        isInitial: false,
        isFinal: false,
        allowSkip: false,
        validationRules: [],
        uiConfiguration: {
          layout: 'default',
          position: 'center',
          showProgress: true,
          showBreadcrumbs: true,
          showHelp: true,
          showSkip: false,
          accessibilityFeatures: [],
          mobileOptimized: true,
          touchGestures: [],
        },
        metadata: {
          sourceBlockId: block.id,
          sourceBlockType: block.type,
          decisionConfiguration: block.data,
        },
      }),
    })
  }

  // ============================================================================
  // Optimizers Initialization
  // ============================================================================

  private initializeOptimizers(): void {
    // Performance optimizer
    this.optimizers.set('performance', {
      optimize: async (journey, level) => {
        // Implement performance optimizations
        return journey
      },
    })

    // User experience optimizer
    this.optimizers.set('user_experience', {
      optimize: async (journey, level) => {
        // Implement UX optimizations
        return journey
      },
    })

    // Memory optimizer
    this.optimizers.set('memory', {
      optimize: async (journey, level) => {
        // Implement memory optimizations
        return journey
      },
    })
  }
}

// ============================================================================
// Supporting Interfaces
// ============================================================================

interface BlockConverter {
  convert(block: TemplateBlock, context: BlockConversionContext): Promise<JourneyState>
}

interface BlockConversionContext {
  processedTemplate: ProcessedTemplate
  request: JourneyGenerationRequest
  workflowAnalysis: WorkflowAnalysis
  stateId: string
}

interface JourneyOptimizer {
  optimize(
    journey: GeneratedJourney,
    level: 'minimal' | 'standard' | 'aggressive'
  ): Promise<GeneratedJourney>
}
