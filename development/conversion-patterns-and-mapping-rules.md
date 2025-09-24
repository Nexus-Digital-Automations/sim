# Conversion Patterns and Mapping Rules
## Comprehensive ReactFlow to Parlant Journey Transformation Specifications

### Executive Summary

This document defines the complete set of conversion patterns and mapping rules for transforming ReactFlow workflows into Parlant journey state machines. It provides deterministic transformation algorithms, data mapping specifications, and validation rules to ensure accurate and reliable conversion while preserving all workflow functionality.

**Core Transformation Principles:**
- **Semantic Preservation** - All workflow logic and behavior must be maintained
- **Conversational Enhancement** - Add natural language interfaces while preserving functionality
- **Bidirectional Compatibility** - Enable seamless switching between visual and conversational modes
- **Context Continuity** - Maintain data flow and variable state across transformation boundaries
- **Error Recovery** - Provide graceful handling of conversion edge cases and failures

---

## 1. Block Type Conversion Patterns

### 1.1 Starter Block Conversion Pattern

#### 1.1.1 Pattern Definition

```typescript
interface StarterBlockPattern {
  sourceConfiguration: {
    blockType: 'starter'
    name: string
    description?: string

    // Input configuration
    inputFields: InputFieldConfig[]
    validation: ValidationConfig[]

    // Trigger configuration
    triggerMode: 'manual' | 'webhook' | 'schedule' | 'api'
    triggerConfig: TriggerConfig

    // Flow control
    outputs: OutputHandleConfig[]
    nextNodes: string[]
  }

  targetConfiguration: {
    stateType: 'input_collection' | 'initial'
    conversationalBehavior: ConversationalBehaviorConfig
    dataCollection: DataCollectionConfig
    validation: JourneyValidationConfig
  }
}
```

#### 1.1.2 Conversion Algorithm

```typescript
class StarterBlockConverter {
  convert(starterBlock: ReactFlowNode): ParlantJourneyStateDefinition {
    const config = starterBlock.data

    return {
      stateId: this.generateStateId(starterBlock.id),
      stateType: this.determineStateType(config),

      displayName: config.name || 'Workflow Start',
      description: this.generateDescription(config),

      // Source mapping
      sourceNodeId: starterBlock.id,
      sourceNodeType: 'starter',
      sourceBlockConfig: config,

      // State classification
      isEntryPoint: true,
      isExitPoint: false,
      requiresUserInput: this.hasUserInput(config),

      // Conversational interface
      conversationalPrompts: this.generateConversationalPrompts(config),
      responseTemplates: this.generateResponseTemplates(config),
      helpTexts: this.generateHelpTexts(config),
      errorMessages: this.generateErrorMessages(config),

      // Data collection
      inputVariables: this.extractInputVariables(config),
      outputVariables: this.extractOutputVariables(config),
      contextModifications: this.generateContextModifications(config),

      // Validation
      validationRules: this.convertValidationRules(config.validation),

      // Transitions
      successTransitions: this.mapSuccessTransitions(starterBlock),
      errorTransitions: ['error_recovery_state'],

      // Completion criteria
      completionCriteria: this.generateCompletionCriteria(config),

      // Execution configuration
      timeoutConfiguration: this.generateTimeoutConfig(config),
      retryPolicy: this.generateRetryPolicy(config)
    }
  }

  private determineStateType(config: any): ParlantJourneyStateType {
    // Starter blocks with user input become input collection states
    if (this.hasUserInput(config)) {
      return ParlantJourneyStateType.INPUT_COLLECTION
    }

    // Simple starter blocks become initial states
    return ParlantJourneyStateType.INITIAL
  }

  private generateConversationalPrompts(config: any): ConversationalPrompt[] {
    const prompts: ConversationalPrompt[] = []

    // Welcome prompt
    prompts.push({
      promptType: 'welcome',
      content: this.generateWelcomeMessage(config),
      priority: 1,
      showProgress: true,
      allowSkip: false,
      timing: 'immediate'
    })

    // Input collection prompts
    if (config.inputFields) {
      for (const field of config.inputFields) {
        prompts.push({
          promptType: 'input_request',
          content: this.generateInputPrompt(field),
          priority: 2,
          showProgress: true,
          allowSkip: !field.required,

          inputConfiguration: {
            fieldName: field.name,
            fieldType: field.type,
            validation: field.validation,
            helpText: field.description
          }
        })
      }
    }

    return prompts
  }

  private generateWelcomeMessage(config: any): string {
    const workflowName = config.workflowName || 'this workflow'
    const description = config.description || ''

    if (description) {
      return `Welcome! I'll help you execute ${workflowName}. ${description}\n\nLet's get started!`
    } else {
      return `Welcome! I'll help you execute ${workflowName}. Let's get started!`
    }
  }

  private generateInputPrompt(field: InputFieldConfig): string {
    const required = field.required ? ' (required)' : ' (optional)'
    const description = field.description ? `\n${field.description}` : ''

    return `Please provide ${field.displayName || field.name}${required}:${description}`
  }
}
```

#### 1.1.3 Data Mapping Rules

```typescript
interface StarterBlockDataMapping {
  // Input field mappings
  inputFieldMappings: {
    sourceField: string      // Original input field name
    targetVariable: string   // Journey context variable name
    dataType: string        // Data type transformation
    validation: ValidationRule[]
    defaultValue?: any
  }[]

  // Context initialization
  contextInitialization: {
    workflowId: string
    executionId: string
    userId: string
    workspaceId: string
    startedAt: Date
    initialInputs: Record<string, any>
  }

  // Output mappings
  outputMappings: {
    sourceOutput: string     // Original output handle
    targetTransition: string // Journey state transition
    conditions: string[]     // Transition conditions
  }[]
}
```

### 1.2 Agent Block Conversion Pattern

#### 1.2.1 Pattern Definition

```typescript
interface AgentBlockPattern {
  sourceConfiguration: {
    blockType: 'agent'
    agentConfig: {
      name: string
      description: string
      systemPrompt: string
      model: string
      temperature: number
      maxTokens: number
    }

    toolAccess: ToolAccessConfig[]
    conversationMode: 'single' | 'multi-turn'
    outputFormat: 'text' | 'json' | 'structured'

    inputs: InputMappingConfig[]
    outputs: OutputMappingConfig[]
  }

  targetConfiguration: {
    stateType: 'agent_interaction'
    agentIntegration: AgentIntegrationConfig
    conversationalFlow: ConversationalFlowConfig
    toolIntegration: ToolIntegrationConfig
  }
}
```

#### 1.2.2 Conversion Algorithm

```typescript
class AgentBlockConverter {
  convert(agentBlock: ReactFlowNode): ParlantJourneyStateDefinition {
    const config = agentBlock.data.agentConfig

    return {
      stateId: this.generateStateId(agentBlock.id),
      stateType: ParlantJourneyStateType.AGENT_INTERACTION,

      displayName: config.name || 'AI Agent Task',
      description: `Execute AI agent: ${config.description}`,

      // Source mapping
      sourceNodeId: agentBlock.id,
      sourceNodeType: 'agent',
      sourceBlockConfig: agentBlock.data,

      // Agent behavior
      requiresUserInput: config.conversationMode === 'multi-turn',

      // Conversational integration
      conversationalPrompts: this.generateAgentPrompts(config),

      // Agent configuration
      agentIntegration: {
        agentProfile: this.mapAgentProfile(config),
        conversationHandling: this.mapConversationHandling(config),
        outputFormatting: this.mapOutputFormatting(config)
      },

      // Tool integration
      toolMappings: this.mapAgentTools(config.toolAccess),

      // Variable management
      inputVariables: this.extractAgentInputs(config),
      outputVariables: ['agent_response', 'agent_reasoning', 'tool_results', 'conversation_history'],
      contextModifications: this.generateAgentContextModifications(config),

      // Execution flow
      successTransitions: this.mapSuccessTransitions(agentBlock),
      errorTransitions: ['agent_error_recovery'],

      // Completion criteria
      completionCriteria: this.generateAgentCompletionCriteria(config),

      // Performance configuration
      timeoutConfiguration: {
        agentResponseTimeout: 60000,
        toolExecutionTimeout: 30000,
        totalStateTimeout: 300000
      },

      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        retryableErrors: ['timeout', 'rate_limit', 'temporary_failure']
      }
    }
  }

  private generateAgentPrompts(config: any): ConversationalPrompt[] {
    return [
      {
        promptType: 'agent_introduction',
        content: this.generateAgentIntroduction(config),
        priority: 1,
        showProgress: true,
        allowSkip: false
      },

      {
        promptType: 'task_explanation',
        content: this.generateTaskExplanation(config),
        priority: 2,
        showProgress: false,
        allowSkip: config.skipExplanation || false
      },

      {
        promptType: 'agent_execution',
        content: this.generateExecutionPrompt(config),
        priority: 3,
        showProgress: true,
        allowSkip: false,

        executionConfiguration: {
          showThinking: true,
          showToolUsage: true,
          allowInterruption: config.allowInterruption || false
        }
      }
    ]
  }

  private mapAgentProfile(config: any): ParlantAgentProfile {
    return {
      name: config.name,
      description: config.description,
      systemPrompt: this.adaptSystemPrompt(config.systemPrompt),

      modelConfiguration: {
        provider: this.extractModelProvider(config.model),
        modelName: this.extractModelName(config.model),
        temperature: config.temperature / 100, // Convert to 0-1 scale
        maxTokens: config.maxTokens,

        // Enhanced configuration for journey context
        journeyAware: true,
        contextPreservation: true,
        progressTracking: true
      },

      behaviorConfiguration: {
        conversationStyle: this.inferConversationStyle(config),
        verbosity: this.inferVerbosity(config),
        helpfulness: 'high',
        creativity: this.mapTemperatureToCreativity(config.temperature)
      }
    }
  }

  private adaptSystemPrompt(originalPrompt: string): string {
    // Enhance system prompt with journey context awareness
    const journeyContext = `
You are executing as part of a conversational workflow journey.

CONTEXT AWARENESS:
- You have access to the journey execution context
- Previous steps and their results are available in the context
- Your response should consider the overall workflow goals
- Maintain consistency with the workflow's purpose and user expectations

COMMUNICATION STYLE:
- Be conversational but professional
- Explain your reasoning when helpful
- Ask for clarification when inputs are ambiguous
- Provide progress updates for long-running tasks

TOOL USAGE:
- Use available tools to accomplish tasks efficiently
- Explain what tools you're using and why
- Handle tool errors gracefully with user communication

WORKFLOW INTEGRATION:
- Your outputs will be used by subsequent workflow steps
- Format responses appropriately for downstream processing
- Include metadata that might be useful for other steps

`

    return `${journeyContext}\n\nORIGINAL INSTRUCTIONS:\n${originalPrompt}`
  }
}
```

### 1.3 API Block Conversion Pattern

#### 1.3.1 Pattern Definition

```typescript
interface APIBlockPattern {
  sourceConfiguration: {
    blockType: 'api'
    name: string
    description?: string

    // HTTP configuration
    endpoint: string
    method: HttpMethod
    headers: Record<string, string>
    queryParameters: Record<string, any>
    body: any

    // Authentication
    authentication: AuthenticationConfig

    // Response handling
    responseMapping: ResponseMappingConfig[]
    errorHandling: ErrorHandlingConfig

    // Flow control
    successConditions: ConditionConfig[]
    outputs: OutputHandleConfig[]
  }

  targetConfiguration: {
    stateType: 'tool_execution'
    toolType: 'http_client'
    executionConfig: HttpExecutionConfig
    responseProcessing: ResponseProcessingConfig
  }
}
```

#### 1.3.2 Conversion Algorithm

```typescript
class APIBlockConverter {
  convert(apiBlock: ReactFlowNode): ParlantJourneyStateDefinition {
    const config = apiBlock.data.apiConfig

    return {
      stateId: this.generateStateId(apiBlock.id),
      stateType: ParlantJourneyStateType.TOOL_EXECUTION,

      displayName: this.generateDisplayName(config),
      description: this.generateDescription(config),

      // Source mapping
      sourceNodeId: apiBlock.id,
      sourceNodeType: 'api',
      sourceBlockConfig: apiBlock.data,

      // User interaction
      requiresUserInput: config.requiresUserConfirmation || this.requiresInputSubstitution(config),

      // Conversational interface
      conversationalPrompts: this.generateAPIPrompts(config),

      // Tool configuration
      toolMappings: [this.generateHTTPToolMapping(config)],

      // Variable management
      inputVariables: this.extractAPIInputs(config),
      outputVariables: this.extractAPIOutputs(config),
      contextModifications: this.generateAPIContextModifications(config),

      // Validation
      validationRules: this.generateAPIValidationRules(config),

      // Execution flow
      successTransitions: this.mapAPISuccessTransitions(apiBlock, config),
      errorTransitions: this.mapAPIErrorTransitions(apiBlock, config),
      conditionalTransitions: this.mapConditionalTransitions(apiBlock, config),

      // Completion criteria
      completionCriteria: this.generateAPICompletionCriteria(config),

      // Performance configuration
      timeoutConfiguration: {
        requestTimeout: config.timeout || 30000,
        responseTimeout: config.responseTimeout || 60000,
        totalExecutionTimeout: config.totalTimeout || 90000
      },

      retryPolicy: this.mapRetryPolicy(config.retryPolicy)
    }
  }

  private generateHTTPToolMapping(config: any): ToolMapping {
    return {
      toolType: 'http_client',
      toolId: `http_${generateId()}`,

      configuration: {
        // HTTP configuration
        endpoint: this.processEndpointTemplate(config.endpoint),
        method: config.method.toUpperCase(),
        headers: this.processHeaderTemplates(config.headers),
        queryParameters: this.processQueryParameterTemplates(config.queryParameters),
        body: this.processBodyTemplate(config.body),

        // Authentication
        authentication: this.mapAuthenticationConfig(config.authentication),

        // Request options
        timeout: config.timeout || 30000,
        followRedirects: config.followRedirects !== false,
        maxRedirects: config.maxRedirects || 5,
        validateStatus: this.generateStatusValidator(config.successConditions),

        // Response handling
        responseType: config.responseType || 'json',
        encoding: config.encoding || 'utf8',
        parseResponse: config.parseResponse !== false
      },

      // Input mapping
      inputMapping: this.generateInputMapping(config),

      // Output mapping
      outputMapping: this.generateOutputMapping(config),

      // Error mapping
      errorMapping: this.generateErrorMapping(config)
    }
  }

  private generateAPIPrompts(config: any): ConversationalPrompt[] {
    const prompts: ConversationalPrompt[] = []

    // Pre-execution prompt
    prompts.push({
      promptType: 'tool_execution_start',
      content: this.generatePreExecutionPrompt(config),
      priority: 1,
      showProgress: true,
      allowSkip: false
    })

    // Input collection prompt (if needed)
    if (this.requiresInputSubstitution(config)) {
      prompts.push({
        promptType: 'input_collection',
        content: this.generateInputCollectionPrompt(config),
        priority: 2,
        showProgress: false,
        allowSkip: false,

        inputConfiguration: this.generateInputConfiguration(config)
      })
    }

    // Execution progress prompt
    prompts.push({
      promptType: 'execution_progress',
      content: 'Executing API request...',
      priority: 3,
      showProgress: true,
      allowSkip: false,

      progressConfiguration: {
        showDetails: true,
        showTimings: true,
        showRetries: true
      }
    })

    return prompts
  }

  private generatePreExecutionPrompt(config: any): string {
    const method = config.method.toUpperCase()
    const endpoint = this.sanitizeEndpointForDisplay(config.endpoint)
    const description = config.description || 'API request'

    return `I'll execute ${description} using a ${method} request to ${endpoint}.`
  }

  private processEndpointTemplate(endpoint: string): string {
    // Convert workflow variable references to journey context references
    return endpoint.replace(
      /\{\{([^}]+)\}\}/g,
      (match, variableName) => `{{context.${variableName}}}`
    )
  }

  private generateInputMapping(config: any): ParameterMapping[] {
    const mappings: ParameterMapping[] = []

    // Extract variables from endpoint template
    const endpointVars = this.extractTemplateVariables(config.endpoint)
    endpointVars.forEach(varName => {
      mappings.push({
        sourceParameter: varName,
        targetParameter: `endpoint.${varName}`,
        transformation: 'url_encode',
        required: true
      })
    })

    // Extract variables from headers
    const headerVars = this.extractHeaderVariables(config.headers)
    headerVars.forEach(({ headerName, varName }) => {
      mappings.push({
        sourceParameter: varName,
        targetParameter: `headers.${headerName}`,
        transformation: 'string',
        required: true
      })
    })

    // Extract variables from body
    if (config.body) {
      const bodyVars = this.extractBodyVariables(config.body)
      bodyVars.forEach(varPath => {
        mappings.push({
          sourceParameter: varPath.source,
          targetParameter: `body.${varPath.target}`,
          transformation: varPath.transformation || 'direct',
          required: varPath.required || false
        })
      })
    }

    return mappings
  }

  private generateOutputMapping(config: any): OutputMapping[] {
    const mappings: OutputMapping[] = []

    // Standard HTTP response mappings
    mappings.push(
      {
        sourceField: 'response.data',
        targetVariable: 'api_response_data',
        transformation: 'direct'
      },
      {
        sourceField: 'response.status',
        targetVariable: 'api_response_status',
        transformation: 'number'
      },
      {
        sourceField: 'response.headers',
        targetVariable: 'api_response_headers',
        transformation: 'object'
      },
      {
        sourceField: 'response.executionTime',
        targetVariable: 'api_execution_time',
        transformation: 'number'
      }
    )

    // Custom response mappings from configuration
    if (config.responseMapping) {
      config.responseMapping.forEach(mapping => {
        mappings.push({
          sourceField: `response.data.${mapping.sourcePath}`,
          targetVariable: mapping.targetVariable,
          transformation: mapping.transformation || 'direct',
          required: mapping.required || false
        })
      })
    }

    return mappings
  }
}
```

### 1.4 Function Block Conversion Pattern

#### 1.4.1 Pattern Definition

```typescript
interface FunctionBlockPattern {
  sourceConfiguration: {
    blockType: 'function'
    name: string
    description?: string

    // Function configuration
    functionCode: string
    runtime: 'nodejs' | 'python' | 'javascript'
    dependencies: string[]
    environment: Record<string, string>

    // Input/Output configuration
    parameters: ParameterConfig[]
    returns: ReturnConfig

    // Execution configuration
    timeout: number
    memoryLimit: number
    errorHandling: ErrorHandlingConfig

    // Flow control
    outputs: OutputHandleConfig[]
  }

  targetConfiguration: {
    stateType: 'tool_execution'
    toolType: 'custom_function'
    executionConfig: FunctionExecutionConfig
    codeExecution: CodeExecutionConfig
  }
}
```

#### 1.4.2 Conversion Algorithm

```typescript
class FunctionBlockConverter {
  convert(functionBlock: ReactFlowNode): ParlantJourneyStateDefinition {
    const config = functionBlock.data.functionConfig

    return {
      stateId: this.generateStateId(functionBlock.id),
      stateType: ParlantJourneyStateType.TOOL_EXECUTION,

      displayName: config.name || 'Custom Function',
      description: config.description || `Execute custom ${config.runtime} function`,

      // Source mapping
      sourceNodeId: functionBlock.id,
      sourceNodeType: 'function',
      sourceBlockConfig: functionBlock.data,

      // User interaction
      requiresUserInput: this.requiresFunctionInput(config),

      // Conversational interface
      conversationalPrompts: this.generateFunctionPrompts(config),

      // Tool configuration
      toolMappings: [this.generateFunctionToolMapping(config)],

      // Variable management
      inputVariables: this.extractFunctionInputs(config),
      outputVariables: this.extractFunctionOutputs(config),
      contextModifications: this.generateFunctionContextModifications(config),

      // Validation
      validationRules: this.generateFunctionValidationRules(config),

      // Execution flow
      successTransitions: this.mapSuccessTransitions(functionBlock),
      errorTransitions: ['function_error_recovery'],

      // Completion criteria
      completionCriteria: this.generateFunctionCompletionCriteria(config),

      // Performance configuration
      timeoutConfiguration: {
        executionTimeout: config.timeout || 30000,
        initializationTimeout: 10000,
        cleanupTimeout: 5000
      },

      retryPolicy: {
        maxAttempts: config.retryAttempts || 2,
        backoffStrategy: 'linear',
        retryableErrors: ['timeout', 'memory_error', 'temporary_failure']
      }
    }
  }

  private generateFunctionToolMapping(config: any): ToolMapping {
    return {
      toolType: 'custom_function',
      toolId: `func_${generateId()}`,

      configuration: {
        // Code execution configuration
        functionCode: this.processFunctionCode(config.functionCode),
        runtime: config.runtime,
        dependencies: config.dependencies || [],
        environment: config.environment || {},

        // Resource limits
        timeout: config.timeout || 30000,
        memoryLimit: config.memoryLimit || 128, // MB
        cpuLimit: config.cpuLimit || 1000, // CPU units

        // Security configuration
        sandboxed: true,
        allowNetworkAccess: config.allowNetworkAccess || false,
        allowFileSystemAccess: config.allowFileSystemAccess || false,

        // Logging and monitoring
        enableLogging: true,
        enableProfiling: config.enableProfiling || false,
        enableMetrics: true
      },

      // Input mapping
      inputMapping: this.generateFunctionInputMapping(config),

      // Output mapping
      outputMapping: this.generateFunctionOutputMapping(config),

      // Error mapping
      errorMapping: this.generateFunctionErrorMapping(config)
    }
  }

  private processFunctionCode(code: string): string {
    // Enhance function code with journey context integration
    const contextIntegration = `
// Journey context integration
const journeyContext = arguments[arguments.length - 1];
const { workflowId, executionId, stateId, userId, workspaceId } = journeyContext;

// Logging helpers
const log = {
  info: (msg, data) => console.log(JSON.stringify({ level: 'info', message: msg, data, timestamp: new Date().toISOString() })),
  warn: (msg, data) => console.warn(JSON.stringify({ level: 'warn', message: msg, data, timestamp: new Date().toISOString() })),
  error: (msg, data) => console.error(JSON.stringify({ level: 'error', message: msg, data, timestamp: new Date().toISOString() }))
};

// Progress reporting helper
const reportProgress = (percentage, message) => {
  console.log(JSON.stringify({
    type: 'progress',
    percentage,
    message,
    timestamp: new Date().toISOString()
  }));
};

`

    return `${contextIntegration}\n\n// Original function code:\n${code}`
  }

  private generateFunctionInputMapping(config: any): ParameterMapping[] {
    const mappings: ParameterMapping[] = []

    if (config.parameters) {
      config.parameters.forEach(param => {
        mappings.push({
          sourceParameter: param.name,
          targetParameter: `args.${param.name}`,
          transformation: this.mapParameterType(param.type),
          required: param.required || false,
          validation: param.validation || []
        })
      })
    }

    // Always include journey context
    mappings.push({
      sourceParameter: '_journey_context',
      targetParameter: 'context',
      transformation: 'object',
      required: true
    })

    return mappings
  }

  private generateFunctionOutputMapping(config: any): OutputMapping[] {
    const mappings: OutputMapping[] = []

    // Standard function execution results
    mappings.push(
      {
        sourceField: 'result',
        targetVariable: 'function_result',
        transformation: 'direct'
      },
      {
        sourceField: 'logs',
        targetVariable: 'execution_logs',
        transformation: 'array'
      },
      {
        sourceField: 'metrics.executionTime',
        targetVariable: 'execution_time',
        transformation: 'number'
      },
      {
        sourceField: 'metrics.memoryUsed',
        targetVariable: 'memory_used',
        transformation: 'number'
      }
    )

    // Custom return value mappings
    if (config.returns) {
      if (config.returns.type === 'object' && config.returns.properties) {
        Object.keys(config.returns.properties).forEach(propName => {
          mappings.push({
            sourceField: `result.${propName}`,
            targetVariable: propName,
            transformation: config.returns.properties[propName].type || 'direct'
          })
        })
      } else {
        mappings.push({
          sourceField: 'result',
          targetVariable: 'function_output',
          transformation: config.returns.type || 'direct'
        })
      }
    }

    return mappings
  }
}
```

---

## 2. Complex Pattern Conversion

### 2.1 Parallel Execution Pattern

#### 2.1.1 Pattern Definition

```typescript
interface ParallelExecutionPattern {
  sourceConfiguration: {
    parallelBlocks: ReactFlowNode[]
    convergencePoint: ReactFlowNode

    // Execution strategy
    executionMode: 'all' | 'any' | 'race' | 'majority'
    failureHandling: 'fail-fast' | 'collect-errors' | 'continue-partial'

    // Resource management
    maxConcurrency: number
    resourceLimits: ResourceLimits

    // Timing configuration
    overallTimeout: number
    individualTimeout: number

    // Result aggregation
    resultAggregation: ResultAggregationConfig
  }

  targetConfiguration: {
    parentStateType: 'parallel_execution'
    childStates: ParlantJourneyStateDefinition[]
    convergenceState: ParlantJourneyStateDefinition
    coordinationLogic: ParallelCoordinationConfig
  }
}
```

#### 2.1.2 Conversion Algorithm

```typescript
class ParallelExecutionConverter {
  convert(
    parallelNodes: ReactFlowNode[],
    convergenceNode: ReactFlowNode,
    config: ParallelExecutionConfig
  ): ParlantJourneyStateDefinition[] {

    // Generate parent coordination state
    const coordinationState = this.generateCoordinationState(parallelNodes, config)

    // Convert child nodes to parallel-aware states
    const childStates = parallelNodes.map(node =>
      this.convertParallelChild(node, coordinationState.stateId, config)
    )

    // Generate convergence state for result aggregation
    const convergenceState = this.generateConvergenceState(
      convergenceNode,
      childStates,
      config
    )

    return [coordinationState, ...childStates, convergenceState]
  }

  private generateCoordinationState(
    parallelNodes: ReactFlowNode[],
    config: ParallelExecutionConfig
  ): ParlantJourneyStateDefinition {

    return {
      stateId: `parallel_coordinator_${generateId()}`,
      stateType: ParlantJourneyStateType.PARALLEL_EXECUTION,

      displayName: 'Parallel Task Coordination',
      description: `Coordinating ${parallelNodes.length} parallel tasks`,

      isParallel: true,
      requiresUserInput: false,

      // Conversational prompts
      conversationalPrompts: [
        {
          promptType: 'parallel_start',
          content: this.generateParallelStartPrompt(parallelNodes.length, config),
          priority: 1,
          showProgress: true,
          allowSkip: false
        },

        {
          promptType: 'parallel_progress',
          content: 'Monitoring parallel task progress...',
          priority: 2,
          showProgress: true,
          allowSkip: false,

          progressConfiguration: {
            showIndividualTasks: true,
            showAggregateProgress: true,
            updateInterval: 2000,
            showTimings: true
          }
        }
      ],

      // Parallel execution configuration
      parallelConfig: {
        childStateIds: parallelNodes.map(node => `state_${node.id}`),
        executionMode: config.executionMode,
        failureHandling: config.failureHandling,
        maxConcurrency: config.maxConcurrency,

        // Timing configuration
        overallTimeout: config.overallTimeout,
        individualTimeout: config.individualTimeout,

        // Progress tracking
        progressTracking: {
          trackIndividualProgress: true,
          aggregateProgress: true,
          reportingInterval: 2000,
          showDetailedTimings: true
        },

        // Result collection
        resultCollection: {
          collectAllResults: true,
          collectErrors: true,
          collectMetrics: true,
          preserveExecutionOrder: false
        }
      },

      // Transitions based on execution mode
      successTransitions: this.generateParallelSuccessTransitions(config),
      errorTransitions: this.generateParallelErrorTransitions(config),

      // Completion criteria
      completionCriteria: this.generateParallelCompletionCriteria(config),

      // Context management
      inputVariables: this.extractParallelInputs(parallelNodes),
      outputVariables: this.extractParallelOutputs(parallelNodes, config),
      contextModifications: this.generateParallelContextModifications(config)
    }
  }

  private convertParallelChild(
    node: ReactFlowNode,
    coordinatorStateId: string,
    config: ParallelExecutionConfig
  ): ParlantJourneyStateDefinition {

    // Convert node using standard converter
    const baseState = this.nodeConverter.convert(node)

    // Enhance for parallel execution
    return {
      ...baseState,

      // Parallel-specific metadata
      parallelExecution: {
        isParallelChild: true,
        coordinatorStateId,
        parallelIndex: this.getParallelIndex(node, config),
        isolatedExecution: true
      },

      // Modified conversational prompts for parallel context
      conversationalPrompts: this.adaptPromptsForParallel(
        baseState.conversationalPrompts,
        config
      ),

      // Parallel-aware transitions
      successTransitions: [coordinatorStateId],
      errorTransitions: [coordinatorStateId],

      // Enhanced context management
      contextModifications: [
        ...baseState.contextModifications,
        {
          type: 'report_parallel_progress',
          coordinatorStateId,
          progressData: {
            taskIndex: this.getParallelIndex(node, config),
            taskName: baseState.displayName,
            status: 'in_progress'
          }
        }
      ]
    }
  }

  private generateConvergenceState(
    convergenceNode: ReactFlowNode,
    childStates: ParlantJourneyStateDefinition[],
    config: ParallelExecutionConfig
  ): ParlantJourneyStateDefinition {

    return {
      stateId: `convergence_${convergenceNode.id}`,
      stateType: ParlantJourneyStateType.AGGREGATION,

      displayName: 'Parallel Results Aggregation',
      description: 'Aggregating results from parallel tasks',

      // Source mapping
      sourceNodeId: convergenceNode.id,
      sourceNodeType: convergenceNode.type,

      requiresUserInput: false,

      // Conversational prompts
      conversationalPrompts: [
        {
          promptType: 'aggregation_start',
          content: this.generateAggregationPrompt(childStates.length),
          priority: 1,
          showProgress: true,
          allowSkip: false
        }
      ],

      // Aggregation configuration
      aggregationConfig: {
        inputSources: childStates.map(state => state.stateId),
        aggregationStrategy: config.resultAggregation.strategy,

        // Data processing
        dataTransformation: config.resultAggregation.dataTransformation,
        errorHandling: config.resultAggregation.errorHandling,

        // Output formatting
        outputFormat: config.resultAggregation.outputFormat || 'combined'
      },

      // Variable management
      inputVariables: this.extractAggregationInputs(childStates),
      outputVariables: this.extractAggregationOutputs(config),

      // Transitions
      successTransitions: this.mapSuccessTransitions(convergenceNode),
      errorTransitions: ['aggregation_error_recovery'],

      // Completion criteria
      completionCriteria: {
        type: 'aggregation_complete',
        conditions: ['all_inputs_received', 'aggregation_successful']
      }
    }
  }
}
```

### 2.2 Conditional Flow Pattern

#### 2.2.1 Pattern Definition

```typescript
interface ConditionalFlowPattern {
  sourceConfiguration: {
    conditionNode: ReactFlowNode
    trueBranch: ReactFlowNode[]
    falseBranch: ReactFlowNode[]

    // Condition configuration
    conditionExpression: string
    conditionType: 'expression' | 'user_choice' | 'data_based' | 'external'

    // User interaction
    userChoiceConfig?: UserChoiceConfig
    confirmationRequired: boolean

    // Evaluation configuration
    evaluationTimeout: number
    defaultPath: 'true' | 'false' | 'error'
  }

  targetConfiguration: {
    decisionStateType: 'decision_point'
    branchStates: ParlantJourneyStateDefinition[]
    evaluationLogic: ConditionEvaluationConfig
  }
}
```

#### 2.2.2 Conversion Algorithm

```typescript
class ConditionalFlowConverter {
  convert(
    conditionNode: ReactFlowNode,
    trueBranch: ReactFlowNode[],
    falseBranch: ReactFlowNode[],
    config: ConditionalFlowConfig
  ): ParlantJourneyStateDefinition[] {

    // Generate decision state
    const decisionState = this.generateDecisionState(conditionNode, config)

    // Convert branch nodes
    const trueBranchStates = trueBranch.map(node =>
      this.convertBranchNode(node, 'true', decisionState.stateId)
    )

    const falseBranchStates = falseBranch.map(node =>
      this.convertBranchNode(node, 'false', decisionState.stateId)
    )

    return [decisionState, ...trueBranchStates, ...falseBranchStates]
  }

  private generateDecisionState(
    conditionNode: ReactFlowNode,
    config: ConditionalFlowConfig
  ): ParlantJourneyStateDefinition {

    return {
      stateId: `decision_${conditionNode.id}`,
      stateType: ParlantJourneyStateType.DECISION_POINT,

      displayName: conditionNode.data.name || 'Decision Point',
      description: `Evaluate: ${config.conditionExpression}`,

      // Source mapping
      sourceNodeId: conditionNode.id,
      sourceNodeType: 'condition',
      sourceBlockConfig: conditionNode.data,

      requiresUserInput: config.conditionType === 'user_choice',

      // Conversational prompts
      conversationalPrompts: this.generateDecisionPrompts(config),

      // Decision configuration
      decisionConfig: {
        conditionExpression: config.conditionExpression,
        conditionType: config.conditionType,
        evaluationTimeout: config.evaluationTimeout,
        defaultPath: config.defaultPath,

        // User interaction configuration
        userChoiceConfig: config.userChoiceConfig ? {
          question: config.userChoiceConfig.question,
          options: config.userChoiceConfig.options,
          defaultOption: config.userChoiceConfig.defaultOption,
          allowCustomInput: config.userChoiceConfig.allowCustomInput || false
        } : undefined,

        // Evaluation logic
        evaluationStrategy: this.determineEvaluationStrategy(config),

        // Context requirements
        requiredVariables: this.extractRequiredVariables(config.conditionExpression)
      },

      // Conditional transitions
      conditionalTransitions: [
        {
          condition: 'evaluation_result === true',
          targetStateId: this.getTrueBranchEntryState(config),
          description: 'Condition is true',
          metadata: { branchType: 'true' }
        },
        {
          condition: 'evaluation_result === false',
          targetStateId: this.getFalseBranchEntryState(config),
          description: 'Condition is false',
          metadata: { branchType: 'false' }
        }
      ],

      // Error handling
      errorTransitions: ['decision_error_recovery'],

      // Variable management
      inputVariables: this.extractDecisionInputs(config),
      outputVariables: ['decision_result', 'evaluation_metadata', 'branch_taken'],

      // Completion criteria
      completionCriteria: {
        type: 'decision_made',
        conditions: ['evaluation_complete', 'branch_selected']
      },

      // Timeout configuration
      timeoutConfiguration: {
        evaluationTimeout: config.evaluationTimeout,
        userInputTimeout: config.userChoiceConfig?.inputTimeout || 300000
      }
    }
  }

  private generateDecisionPrompts(config: ConditionalFlowConfig): ConversationalPrompt[] {
    const prompts: ConversationalPrompt[] = []

    // Decision evaluation prompt
    prompts.push({
      promptType: 'decision_evaluation',
      content: this.generateEvaluationPrompt(config),
      priority: 1,
      showProgress: true,
      allowSkip: false
    })

    // User choice prompt (if applicable)
    if (config.conditionType === 'user_choice' && config.userChoiceConfig) {
      prompts.push({
        promptType: 'user_choice',
        content: config.userChoiceConfig.question,
        priority: 2,
        showProgress: false,
        allowSkip: false,

        choiceConfiguration: {
          options: config.userChoiceConfig.options,
          defaultOption: config.userChoiceConfig.defaultOption,
          allowCustomInput: config.userChoiceConfig.allowCustomInput,
          multiSelect: config.userChoiceConfig.multiSelect || false
        }
      })
    }

    // Explanation prompt
    prompts.push({
      promptType: 'decision_explanation',
      content: 'I\'ll explain the decision logic and proceed accordingly.',
      priority: 3,
      showProgress: false,
      allowSkip: config.skipExplanation || false
    })

    return prompts
  }

  private generateEvaluationPrompt(config: ConditionalFlowConfig): string {
    switch (config.conditionType) {
      case 'expression':
        return `Evaluating condition: ${this.humanizeExpression(config.conditionExpression)}`

      case 'user_choice':
        return 'I need your input to determine the next step.'

      case 'data_based':
        return `Checking data conditions: ${config.conditionExpression}`

      case 'external':
        return 'Waiting for external condition evaluation...'

      default:
        return `Evaluating decision condition...`
    }
  }

  private humanizeExpression(expression: string): string {
    // Convert technical expressions to human-readable format
    return expression
      .replace(/&&/g, ' and ')
      .replace(/\|\|/g, ' or ')
      .replace(/===/g, ' equals ')
      .replace(/!==/g, ' does not equal ')
      .replace(/>=/g, ' is greater than or equal to ')
      .replace(/<=/g, ' is less than or equal to ')
      .replace(/>/g, ' is greater than ')
      .replace(/</g, ' is less than ')
      .replace(/!/g, ' not ')
  }
}
```

---

## 3. Data Mapping and Transformation Rules

### 3.1 Context Variable Mapping

```typescript
interface ContextVariableMapping {
  // Source workflow context
  workflowVariables: {
    variableName: string
    dataType: string
    scope: 'global' | 'node' | 'execution'
    defaultValue?: any
  }[]

  // Target journey context
  journeyVariables: {
    variableName: string
    dataType: string
    scope: 'journey' | 'state' | 'session' | 'agent'
    defaultValue?: any
  }[]

  // Mapping rules
  mappingRules: VariableMappingRule[]

  // Transformation functions
  transformations: DataTransformation[]
}

interface VariableMappingRule {
  sourceVariable: string
  targetVariable: string

  // Transformation configuration
  transformation: TransformationType
  transformationConfig?: Record<string, any>

  // Validation
  validation: ValidationRule[]

  // Synchronization
  syncDirection: 'uni' | 'bi'
  syncTrigger: 'immediate' | 'state_change' | 'journey_end'

  // Metadata
  description: string
  required: boolean
  preserveHistory: boolean
}

enum TransformationType {
  DIRECT = 'direct',
  TYPE_CONVERSION = 'type_conversion',
  FORMAT_CONVERSION = 'format_conversion',
  AGGREGATION = 'aggregation',
  EXTRACTION = 'extraction',
  CALCULATION = 'calculation',
  LOOKUP = 'lookup',
  CUSTOM = 'custom'
}
```

### 3.2 Data Transformation Engine

```typescript
class DataTransformationEngine {
  private readonly transformationRegistry = new Map<string, TransformationFunction>()

  constructor() {
    this.registerBuiltinTransformations()
  }

  /**
   * Apply data transformation based on mapping rules
   */
  async transform(
    sourceData: any,
    transformationConfig: DataTransformation
  ): Promise<any> {

    const transformer = this.transformationRegistry.get(transformationConfig.type)
    if (!transformer) {
      throw new TransformationError(`Unknown transformation type: ${transformationConfig.type}`)
    }

    try {
      const result = await transformer(sourceData, transformationConfig.config)

      // Validate result if validation rules are provided
      if (transformationConfig.validation) {
        await this.validateTransformationResult(result, transformationConfig.validation)
      }

      return result
    } catch (error) {
      throw new TransformationError(
        `Transformation failed: ${transformationConfig.type}`,
        error
      )
    }
  }

  /**
   * Register built-in transformation functions
   */
  private registerBuiltinTransformations(): void {

    // Direct pass-through
    this.transformationRegistry.set('direct', (data) => data)

    // Type conversions
    this.transformationRegistry.set('to_string', (data) => String(data))
    this.transformationRegistry.set('to_number', (data) => {
      const num = Number(data)
      if (isNaN(num)) throw new Error(`Cannot convert to number: ${data}`)
      return num
    })
    this.transformationRegistry.set('to_boolean', (data) => Boolean(data))
    this.transformationRegistry.set('to_array', (data) =>
      Array.isArray(data) ? data : [data]
    )

    // Format conversions
    this.transformationRegistry.set('json_parse', (data) => {
      if (typeof data === 'string') {
        return JSON.parse(data)
      }
      return data
    })
    this.transformationRegistry.set('json_stringify', (data) => JSON.stringify(data))

    this.transformationRegistry.set('date_format', (data, config) => {
      const date = new Date(data)
      return this.formatDate(date, config.format || 'ISO')
    })

    // Aggregation functions
    this.transformationRegistry.set('sum', (data) => {
      if (!Array.isArray(data)) throw new Error('Sum requires array input')
      return data.reduce((sum, val) => sum + Number(val), 0)
    })

    this.transformationRegistry.set('average', (data) => {
      if (!Array.isArray(data)) throw new Error('Average requires array input')
      const sum = data.reduce((sum, val) => sum + Number(val), 0)
      return sum / data.length
    })

    this.transformationRegistry.set('count', (data) => {
      if (Array.isArray(data)) return data.length
      return 1
    })

    // Extraction functions
    this.transformationRegistry.set('extract_path', (data, config) => {
      return this.extractFromPath(data, config.path)
    })

    this.transformationRegistry.set('extract_regex', (data, config) => {
      const regex = new RegExp(config.pattern, config.flags || 'g')
      const matches = String(data).match(regex)
      return matches || []
    })

    // String manipulations
    this.transformationRegistry.set('trim', (data) => String(data).trim())
    this.transformationRegistry.set('uppercase', (data) => String(data).toUpperCase())
    this.transformationRegistry.set('lowercase', (data) => String(data).toLowerCase())

    this.transformationRegistry.set('replace', (data, config) => {
      return String(data).replace(
        new RegExp(config.pattern, config.flags || 'g'),
        config.replacement
      )
    })

    // URL encoding
    this.transformationRegistry.set('url_encode', (data) =>
      encodeURIComponent(String(data))
    )
    this.transformationRegistry.set('url_decode', (data) =>
      decodeURIComponent(String(data))
    )

    // Base64 encoding
    this.transformationRegistry.set('base64_encode', (data) =>
      Buffer.from(String(data)).toString('base64')
    )
    this.transformationRegistry.set('base64_decode', (data) =>
      Buffer.from(String(data), 'base64').toString('utf8')
    )
  }

  /**
   * Register custom transformation function
   */
  registerTransformation(
    name: string,
    transformer: TransformationFunction
  ): void {
    this.transformationRegistry.set(name, transformer)
  }

  /**
   * Extract value from nested object using path
   */
  private extractFromPath(data: any, path: string): any {
    const pathParts = path.split('.')
    let current = data

    for (const part of pathParts) {
      if (current == null) return undefined

      // Handle array indices
      if (/^\d+$/.test(part)) {
        const index = parseInt(part)
        if (Array.isArray(current) && index < current.length) {
          current = current[index]
        } else {
          return undefined
        }
      } else {
        current = current[part]
      }
    }

    return current
  }

  /**
   * Format date according to specified format
   */
  private formatDate(date: Date, format: string): string {
    switch (format) {
      case 'ISO':
        return date.toISOString()
      case 'short':
        return date.toLocaleDateString()
      case 'long':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      case 'time':
        return date.toLocaleTimeString()
      default:
        return date.toISOString()
    }
  }

  /**
   * Validate transformation result
   */
  private async validateTransformationResult(
    result: any,
    validationRules: ValidationRule[]
  ): Promise<void> {
    for (const rule of validationRules) {
      const isValid = await this.validateValue(result, rule)
      if (!isValid) {
        throw new ValidationError(`Validation failed: ${rule.errorMessage}`)
      }
    }
  }

  private async validateValue(value: any, rule: ValidationRule): Promise<boolean> {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== ''

      case 'type':
        return typeof value === rule.expectedType

      case 'range':
        if (typeof value !== 'number') return false
        return value >= rule.min && value <= rule.max

      case 'pattern':
        if (typeof value !== 'string') return false
        return new RegExp(rule.pattern).test(value)

      case 'length':
        const length = Array.isArray(value) ? value.length : String(value).length
        return rule.minLength ? length >= rule.minLength : true &&
               rule.maxLength ? length <= rule.maxLength : true

      case 'custom':
        // Execute custom validation function
        if (typeof rule.validator === 'function') {
          return await rule.validator(value)
        }
        return true

      default:
        return true
    }
  }
}
```

### 3.3 Input/Output Mapping Specifications

```typescript
interface IOMapping {
  // Input mappings - from workflow context to journey state
  inputMappings: {
    sourceContext: string         // Workflow variable path
    targetParameter: string       // State input parameter
    transformation?: DataTransformation
    required: boolean
    defaultValue?: any
    validation?: ValidationRule[]
  }[]

  // Output mappings - from journey state to workflow context
  outputMappings: {
    sourceResult: string          // State output field
    targetContext: string         // Workflow variable path
    transformation?: DataTransformation
    persistenceLevel: 'temporary' | 'session' | 'permanent'
    syncToWorkflow: boolean
  }[]

  // Bi-directional mappings - synchronized variables
  bidirectionalMappings: {
    workflowVariable: string
    journeyVariable: string
    syncMode: 'immediate' | 'batch' | 'on_demand'
    conflictResolution: 'workflow_wins' | 'journey_wins' | 'merge' | 'user_choice'
  }[]
}

class IOMapperEngine {
  /**
   * Map workflow inputs to journey state parameters
   */
  async mapInputs(
    workflowContext: WorkflowContext,
    inputMappings: IOMapping['inputMappings']
  ): Promise<Record<string, any>> {

    const mappedInputs: Record<string, any> = {}

    for (const mapping of inputMappings) {
      try {
        // Extract source value
        let sourceValue = this.extractContextValue(workflowContext, mapping.sourceContext)

        // Apply default if value is missing and not required
        if (sourceValue === undefined || sourceValue === null) {
          if (mapping.required) {
            throw new MappingError(`Required input missing: ${mapping.sourceContext}`)
          }
          sourceValue = mapping.defaultValue
        }

        // Apply transformation if specified
        if (mapping.transformation && sourceValue !== undefined) {
          sourceValue = await this.dataTransformer.transform(sourceValue, mapping.transformation)
        }

        // Validate value
        if (mapping.validation && sourceValue !== undefined) {
          await this.validateValue(sourceValue, mapping.validation)
        }

        // Set mapped value
        mappedInputs[mapping.targetParameter] = sourceValue

      } catch (error) {
        throw new MappingError(
          `Input mapping failed: ${mapping.sourceContext} -> ${mapping.targetParameter}`,
          error
        )
      }
    }

    return mappedInputs
  }

  /**
   * Map journey state outputs back to workflow context
   */
  async mapOutputs(
    stateResults: Record<string, any>,
    workflowContext: WorkflowContext,
    outputMappings: IOMapping['outputMappings']
  ): Promise<WorkflowContext> {

    const updatedContext = { ...workflowContext }

    for (const mapping of outputMappings) {
      try {
        // Extract result value
        let resultValue = this.extractResultValue(stateResults, mapping.sourceResult)

        // Apply transformation if specified
        if (mapping.transformation && resultValue !== undefined) {
          resultValue = await this.dataTransformer.transform(resultValue, mapping.transformation)
        }

        // Set context value
        this.setContextValue(updatedContext, mapping.targetContext, resultValue)

        // Handle workflow synchronization
        if (mapping.syncToWorkflow) {
          await this.syncToWorkflow(mapping.targetContext, resultValue, mapping.persistenceLevel)
        }

      } catch (error) {
        throw new MappingError(
          `Output mapping failed: ${mapping.sourceResult} -> ${mapping.targetContext}`,
          error
        )
      }
    }

    return updatedContext
  }

  /**
   * Handle bidirectional synchronization
   */
  async synchronizeBidirectional(
    workflowContext: WorkflowContext,
    journeyContext: JourneyContext,
    bidirectionalMappings: IOMapping['bidirectionalMappings']
  ): Promise<{ workflowContext: WorkflowContext, journeyContext: JourneyContext }> {

    const updatedWorkflowContext = { ...workflowContext }
    const updatedJourneyContext = { ...journeyContext }

    for (const mapping of bidirectionalMappings) {
      const workflowValue = this.extractContextValue(workflowContext, mapping.workflowVariable)
      const journeyValue = this.extractContextValue(journeyContext, mapping.journeyVariable)

      // Detect conflicts
      if (workflowValue !== journeyValue && workflowValue !== undefined && journeyValue !== undefined) {
        const resolvedValue = await this.resolveConflict(
          workflowValue,
          journeyValue,
          mapping.conflictResolution
        )

        this.setContextValue(updatedWorkflowContext, mapping.workflowVariable, resolvedValue)
        this.setContextValue(updatedJourneyContext, mapping.journeyVariable, resolvedValue)
      } else {
        // No conflict - use available value
        const syncValue = workflowValue !== undefined ? workflowValue : journeyValue

        if (syncValue !== undefined) {
          this.setContextValue(updatedWorkflowContext, mapping.workflowVariable, syncValue)
          this.setContextValue(updatedJourneyContext, mapping.journeyVariable, syncValue)
        }
      }
    }

    return {
      workflowContext: updatedWorkflowContext,
      journeyContext: updatedJourneyContext
    }
  }

  private extractContextValue(context: any, path: string): any {
    const pathParts = path.split('.')
    let current = context

    for (const part of pathParts) {
      if (current == null) return undefined
      current = current[part]
    }

    return current
  }

  private setContextValue(context: any, path: string, value: any): void {
    const pathParts = path.split('.')
    const lastPart = pathParts.pop()!

    let current = context
    for (const part of pathParts) {
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }

    current[lastPart] = value
  }

  private async resolveConflict(
    workflowValue: any,
    journeyValue: any,
    resolution: string
  ): Promise<any> {

    switch (resolution) {
      case 'workflow_wins':
        return workflowValue

      case 'journey_wins':
        return journeyValue

      case 'merge':
        return this.mergeValues(workflowValue, journeyValue)

      case 'user_choice':
        return await this.getUserChoice(workflowValue, journeyValue)

      default:
        return workflowValue // Default to workflow value
    }
  }

  private mergeValues(value1: any, value2: any): any {
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return { ...value1, ...value2 }
    }

    if (Array.isArray(value1) && Array.isArray(value2)) {
      return [...value1, ...value2]
    }

    // For primitive types, return the more recent (journey) value
    return value2
  }
}
```

---

This comprehensive conversion pattern specification provides the complete foundation for transforming ReactFlow workflows into Parlant journeys. The patterns ensure semantic preservation, conversational enhancement, and full compatibility between visual and conversational execution modes.

Key features include:

- **Universal Block Conversion** - Detailed patterns for all ReactFlow block types
- **Complex Pattern Handling** - Parallel execution, conditionals, loops, and aggregations
- **Data Transformation Engine** - Comprehensive data mapping and transformation capabilities
- **Input/Output Mapping** - Precise specifications for data flow preservation
- **Validation Framework** - Ensures data integrity throughout transformation
- **Error Handling** - Graceful handling of conversion edge cases
- **Extensibility** - Plugin architecture for custom transformations and validations

These patterns serve as the implementation blueprint for the conversion system, ensuring reliable and accurate transformation of complex workflow logic into conversational journey experiences.