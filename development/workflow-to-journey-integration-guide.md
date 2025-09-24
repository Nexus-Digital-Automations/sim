# Workflow to Journey Mapping Integration Guide
## Step-by-Step Implementation and Best Practices

### Table of Contents
1. [Quick Start Guide](#quick-start-guide)
2. [Development Environment Setup](#development-environment-setup)
3. [Integration Patterns](#integration-patterns)
4. [Best Practices](#best-practices)
5. [Advanced Configuration](#advanced-configuration)
6. [Performance Optimization](#performance-optimization)
7. [Security Guidelines](#security-guidelines)
8. [Production Deployment](#production-deployment)

---

## Quick Start Guide

This section helps you get up and running with workflow-to-journey mapping in under 15 minutes.

### Prerequisites

- Node.js 18+ and npm/yarn
- Access to Sim workspace with workflow creation permissions
- Parlant server instance (local or hosted)
- Valid API credentials

### Step 1: Environment Setup

```bash
# Clone the Sim project (if not already done)
git clone https://github.com/sim-co/sim.git
cd sim

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

**Required Environment Variables:**
```bash
# .env.local
SIM_API_KEY=your_sim_api_key_here
WORKSPACE_ID=your_workspace_id_here
PARLANT_SERVER_URL=http://localhost:8000
PARLANT_API_KEY=your_parlant_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/sim_parlant
```

### Step 2: Basic Workflow Creation

Create a simple workflow to test the mapping system:

```typescript
// examples/simple-workflow.ts
import { WorkflowBuilder } from '@/lib/workflow-builder'

const simpleWorkflow = new WorkflowBuilder()
  .addStartBlock('start', {
    name: 'Welcome Process',
    description: 'Simple customer welcome workflow'
  })
  .addInputBlock('collect_info', {
    name: 'Collect Customer Info',
    fields: [
      { name: 'customer_name', type: 'text', required: true },
      { name: 'customer_email', type: 'email', required: true }
    ]
  })
  .addToolBlock('send_welcome', {
    name: 'Send Welcome Email',
    tool: 'mail',
    config: {
      to: '{{customer_email}}',
      subject: 'Welcome {{customer_name}}!',
      body: 'Thank you for joining us, {{customer_name}}!'
    }
  })
  .addEndBlock('complete', {
    name: 'Process Complete'
  })
  .connect('start', 'collect_info')
  .connect('collect_info', 'send_welcome')
  .connect('send_welcome', 'complete')
  .build()

export default simpleWorkflow
```

### Step 3: Convert to Journey

```typescript
// examples/workflow-to-journey.ts
import { WorkflowToJourneyConverter } from '@/services/parlant/workflow-mapping'
import simpleWorkflow from './simple-workflow'

async function convertSimpleWorkflow() {
  const converter = new WorkflowToJourneyConverter({
    apiKey: process.env.SIM_API_KEY!,
    workspaceId: process.env.WORKSPACE_ID!
  })

  try {
    // 1. Analyze the workflow
    const analysis = await converter.analyzeWorkflow(simpleWorkflow.id)

    console.log('Workflow Analysis:')
    console.log(`- Blocks: ${analysis.blocksCount}`)
    console.log(`- Complexity: ${analysis.complexity}`)
    console.log(`- Conversion Feasible: ${analysis.conversionFeasibility.canConvert}`)

    if (!analysis.conversionFeasibility.canConvert) {
      throw new Error('Workflow cannot be converted to journey')
    }

    // 2. Convert to journey
    const journey = await converter.convertToJourney(simpleWorkflow.id, {
      journeyName: 'Customer Welcome Journey',
      conversationalStyle: 'friendly',
      agentName: 'Welcome Assistant'
    })

    console.log(`Journey created: ${journey.journeyId}`)
    return journey

  } catch (error) {
    console.error('Conversion failed:', error)
    throw error
  }
}

// Run the conversion
convertSimpleWorkflow()
  .then(journey => console.log('Success!', journey.journeyId))
  .catch(error => console.error('Failed:', error.message))
```

### Step 4: Test Journey Execution

```typescript
// examples/test-journey-execution.ts
import { JourneyExecutor } from '@/services/parlant/execution'

async function testJourneyExecution(journeyId: string) {
  const executor = new JourneyExecutor({
    apiKey: process.env.SIM_API_KEY!,
    workspaceId: process.env.WORKSPACE_ID!
  })

  try {
    // Start journey execution
    const execution = await executor.startJourney(journeyId, {
      sessionName: 'Test Customer Welcome',
      initialContext: {
        source: 'integration_test'
      }
    })

    console.log(`Journey execution started: ${execution.executionId}`)

    // Simulate user interactions
    await executor.sendUserInput(execution.executionId, {
      message: 'John Doe',
      context: { field: 'customer_name' }
    })

    await executor.sendUserInput(execution.executionId, {
      message: 'john.doe@example.com',
      context: { field: 'customer_email' }
    })

    // Monitor progress
    const finalStatus = await executor.waitForCompletion(execution.executionId)
    console.log('Journey completed:', finalStatus.status)

  } catch (error) {
    console.error('Journey execution failed:', error)
  }
}
```

---

## Development Environment Setup

### Local Development Stack

#### 1. Database Setup

```bash
# Start PostgreSQL with Docker
docker run --name sim-postgres \
  -e POSTGRES_DB=sim_parlant \
  -e POSTGRES_USER=sim_user \
  -e POSTGRES_PASSWORD=sim_password \
  -p 5432:5432 \
  -d postgres:15

# Run database migrations
npm run db:migrate
npm run db:seed:dev
```

#### 2. Parlant Server Setup

```bash
# In a separate terminal, start Parlant server
cd packages/parlant-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the server
python -m parlant.server --host 0.0.0.0 --port 8000
```

#### 3. Sim Development Server

```bash
# Start the Sim development server
npm run dev

# In another terminal, start the Socket.io server
npm run socket:dev
```

#### 4. Verification

Visit these URLs to verify setup:
- Sim Frontend: http://localhost:3000
- Parlant API: http://localhost:8000/docs
- Socket.io Health: http://localhost:3001/health

### Development Tools

#### 1. Testing Framework Setup

```bash
# Install additional testing dependencies
npm install --save-dev @testing-library/jest-dom vitest @vitest/ui
```

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 60000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './apps/sim'),
      '@test': resolve(__dirname, './test')
    }
  }
})
```

#### 2. Development Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev:full": "concurrently \"npm run dev\" \"npm run socket:dev\" \"npm run parlant:dev\"",
    "test:journey": "vitest run --testNamePattern=\"journey\"",
    "test:workflow-conversion": "vitest run --testNamePattern=\"workflow.*conversion\"",
    "db:migrate:dev": "drizzle-kit migrate --config=drizzle.config.dev.ts",
    "journey:validate": "node scripts/validate-journeys.js",
    "workflow:analyze": "node scripts/analyze-workflow.js"
  }
}
```

### Code Quality Setup

#### 1. ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "overrides": [
    {
      "files": ["**/*workflow-mapping*/**/*.ts"],
      "rules": {
        "@typescript-eslint/explicit-function-return-type": "error",
        "complexity": ["error", 15]
      }
    }
  ]
}
```

#### 2. Pre-commit Hooks

```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run type-check
npm run test:journey --run
```

---

## Integration Patterns

### Pattern 1: Simple Linear Workflows

**Use Case**: Straightforward processes with sequential steps

**Example**: Customer onboarding, form processing, notification workflows

```typescript
// patterns/linear-workflow-pattern.ts
class LinearWorkflowPattern {
  static async convert(workflowId: string): Promise<JourneyDefinition> {
    const analysis = await this.analyzeLinearFlow(workflowId)

    return {
      id: generateJourneyId(),
      name: analysis.workflow.name,
      states: analysis.blocks.map(block => ({
        id: block.id,
        type: this.mapBlockTypeToStateType(block.type),
        name: block.name,
        description: block.description,
        configuration: this.mapBlockConfig(block)
      })),
      transitions: analysis.edges.map(edge => ({
        from: edge.source,
        to: edge.target,
        trigger: 'automatic'
      })),
      initialState: analysis.entryPoint,
      finalStates: analysis.exitPoints
    }
  }

  private static mapBlockTypeToStateType(blockType: string): StateType {
    const mapping = {
      'input': 'input_collection',
      'api': 'tool_execution',
      'mail': 'tool_execution',
      'condition': 'conditional',
      'notification': 'notification'
    }
    return mapping[blockType] || 'tool_execution'
  }
}
```

### Pattern 2: Conditional Workflows

**Use Case**: Workflows with branching logic based on data or user decisions

**Example**: Approval processes, dynamic routing, A/B testing workflows

```typescript
// patterns/conditional-workflow-pattern.ts
class ConditionalWorkflowPattern {
  static async convert(workflowId: string): Promise<JourneyDefinition> {
    const analysis = await this.analyzeConditionalFlow(workflowId)

    const conditionalStates = analysis.conditionalBlocks.map(block => ({
      id: block.id,
      type: 'conditional' as StateType,
      name: block.name,
      description: `Decision point: ${block.condition.description}`,
      configuration: {
        condition: this.translateCondition(block.condition),
        branches: {
          true: block.trueBranch.map(b => b.id),
          false: block.falseBranch.map(b => b.id)
        }
      }
    }))

    return {
      // ... journey definition with conditional states
      states: [...regularStates, ...conditionalStates],
      transitions: this.buildConditionalTransitions(analysis)
    }
  }

  private static translateCondition(condition: WorkflowCondition): JourneyCondition {
    return {
      expression: condition.expression,
      variables: condition.variables,
      operator: condition.operator,
      evaluationType: 'runtime'
    }
  }
}
```

### Pattern 3: Parallel Workflows

**Use Case**: Workflows with concurrent execution paths

**Example**: Multi-channel notifications, parallel data processing, bulk operations

```typescript
// patterns/parallel-workflow-pattern.ts
class ParallelWorkflowPattern {
  static async convert(workflowId: string): Promise<JourneyDefinition> {
    const analysis = await this.analyzeParallelFlow(workflowId)

    const parallelStates = analysis.parallelSections.map(section => ({
      id: `parallel_${section.id}`,
      type: 'parallel' as StateType,
      name: `Parallel Execution: ${section.name}`,
      description: `Execute ${section.branches.length} operations concurrently`,
      configuration: {
        branches: section.branches.map(branch => ({
          id: branch.id,
          states: branch.blocks.map(b => b.id)
        })),
        convergencePoint: section.convergenceBlock.id,
        maxConcurrency: section.maxConcurrency || 5,
        waitForAll: section.waitForAll !== false
      }
    }))

    return {
      // ... journey definition with parallel execution
      states: [...sequentialStates, ...parallelStates],
      transitions: this.buildParallelTransitions(analysis)
    }
  }
}
```

### Pattern 4: Loop Workflows

**Use Case**: Workflows with iterative processing

**Example**: Data processing batches, retry mechanisms, periodic tasks

```typescript
// patterns/loop-workflow-pattern.ts
class LoopWorkflowPattern {
  static async convert(workflowId: string): Promise<JourneyDefinition> {
    const analysis = await this.analyzeLoopFlow(workflowId)

    const loopStates = analysis.loopStructures.map(loop => ({
      id: `loop_${loop.id}`,
      type: 'loop' as StateType,
      name: `Iterative Process: ${loop.name}`,
      description: `Repeat operations until ${loop.exitCondition.description}`,
      configuration: {
        entryCondition: this.translateCondition(loop.entryCondition),
        exitCondition: this.translateCondition(loop.exitCondition),
        bodyStates: loop.bodyBlocks.map(b => b.id),
        maxIterations: loop.maxIterations || 100,
        iterationVariable: loop.iterationVariable || 'iteration_count'
      }
    }))

    return {
      // ... journey definition with loop states
      states: [...linearStates, ...loopStates],
      transitions: this.buildLoopTransitions(analysis)
    }
  }
}
```

---

## Best Practices

### Code Organization

#### 1. Service Layer Structure

```typescript
// services/workflow-mapping/index.ts
export { WorkflowAnalysisService } from './analysis/workflow-analysis.service'
export { JourneyMappingService } from './mapping/journey-mapping.service'
export { ConversionValidationService } from './validation/conversion-validation.service'
export { ExecutionEngine } from './execution/execution-engine.service'

// services/workflow-mapping/types/index.ts
export interface WorkflowMappingService {
  analyzeWorkflow(workflowId: string): Promise<WorkflowAnalysis>
  convertToJourney(analysis: WorkflowAnalysis, config: ConversionConfig): Promise<JourneyDefinition>
  validateConversion(journey: JourneyDefinition): Promise<ValidationResult>
  deployJourney(journey: JourneyDefinition): Promise<DeploymentResult>
}
```

#### 2. Configuration Management

```typescript
// config/workflow-mapping.config.ts
export const WorkflowMappingConfig = {
  conversion: {
    maxComplexity: 150,
    timeoutSeconds: 60,
    enableOptimization: true,
    preserveMetadata: true
  },
  execution: {
    maxConcurrentJourneys: 100,
    defaultTimeoutMinutes: 30,
    enableProgressTracking: true,
    autoSaveInterval: 30000
  },
  tool_mapping: {
    strictValidation: true,
    enableFallbacks: true,
    cacheTimeout: 3600
  },
  performance: {
    enableCaching: true,
    cacheStrategy: 'redis',
    cacheTTL: 1800,
    enableMetrics: true
  }
} as const

export type WorkflowMappingConfig = typeof WorkflowMappingConfig
```

#### 3. Error Handling Strategy

```typescript
// lib/errors/workflow-mapping-errors.ts
export class WorkflowMappingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'WorkflowMappingError'
  }
}

export class ConversionError extends WorkflowMappingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONVERSION_ERROR', context)
  }
}

export class ValidationError extends WorkflowMappingError {
  constructor(
    message: string,
    public violations: ValidationViolation[],
    context?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', context)
  }
}

// Usage example
try {
  const journey = await converter.convertToJourney(workflowId, config)
} catch (error) {
  if (error instanceof ValidationError) {
    logger.error('Validation failed', {
      violations: error.violations,
      workflowId,
      context: error.context
    })
  } else if (error instanceof ConversionError) {
    logger.error('Conversion failed', {
      error: error.message,
      context: error.context
    })
  }
  throw error
}
```

### Data Modeling Best Practices

#### 1. Type-Safe Models

```typescript
// types/workflow-mapping.types.ts
export interface WorkflowAnalysis {
  readonly id: string
  readonly workflowId: string
  readonly timestamp: Date
  readonly analysis: {
    readonly blocksCount: number
    readonly edgesCount: number
    readonly complexity: ComplexityScore
    readonly entryPoints: readonly string[]
    readonly exitPoints: readonly string[]
    readonly patterns: readonly WorkflowPattern[]
  }
  readonly feasibility: ConversionFeasibility
}

export interface JourneyDefinition {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly states: readonly JourneyState[]
  readonly transitions: readonly StateTransition[]
  readonly metadata: JourneyMetadata
}

// Use branded types for IDs to prevent mixing
export type WorkflowId = string & { readonly __brand: 'WorkflowId' }
export type JourneyId = string & { readonly __brand: 'JourneyId' }
export type ExecutionId = string & { readonly __brand: 'ExecutionId' }
```

#### 2. Immutable Data Structures

```typescript
// utils/immutable-helpers.ts
import { produce } from 'immer'

export class ImmutableJourneyBuilder {
  constructor(private readonly definition: JourneyDefinition) {}

  addState(state: JourneyState): ImmutableJourneyBuilder {
    return new ImmutableJourneyBuilder(
      produce(this.definition, draft => {
        draft.states.push(state)
      })
    )
  }

  updateState(stateId: string, updates: Partial<JourneyState>): ImmutableJourneyBuilder {
    return new ImmutableJourneyBuilder(
      produce(this.definition, draft => {
        const state = draft.states.find(s => s.id === stateId)
        if (state) {
          Object.assign(state, updates)
        }
      })
    )
  }

  build(): JourneyDefinition {
    return this.definition
  }
}
```

### Performance Best Practices

#### 1. Caching Strategy

```typescript
// services/caching/workflow-mapping-cache.ts
export class WorkflowMappingCache {
  private analysisCache = new Map<string, CacheEntry<WorkflowAnalysis>>()
  private journeyCache = new Map<string, CacheEntry<JourneyDefinition>>()

  async getOrAnalyze(
    workflowId: string,
    analyzer: () => Promise<WorkflowAnalysis>
  ): Promise<WorkflowAnalysis> {
    const cacheKey = `analysis:${workflowId}`
    const cached = this.analysisCache.get(cacheKey)

    if (cached && !this.isExpired(cached)) {
      return cached.data
    }

    const analysis = await analyzer()
    this.analysisCache.set(cacheKey, {
      data: analysis,
      timestamp: Date.now(),
      ttl: 3600000 // 1 hour
    })

    return analysis
  }

  async getOrConvert(
    analysisId: string,
    converter: () => Promise<JourneyDefinition>
  ): Promise<JourneyDefinition> {
    const cacheKey = `journey:${analysisId}`
    const cached = this.journeyCache.get(cacheKey)

    if (cached && !this.isExpired(cached)) {
      return cached.data
    }

    const journey = await converter()
    this.journeyCache.set(cacheKey, {
      data: journey,
      timestamp: Date.now(),
      ttl: 7200000 // 2 hours
    })

    return journey
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
}
```

#### 2. Batch Processing

```typescript
// services/batch/workflow-batch-converter.ts
export class WorkflowBatchConverter {
  async convertWorkflowsBatch(
    workflowIds: string[],
    config: BatchConversionConfig
  ): Promise<BatchConversionResult> {
    const batchSize = config.batchSize || 5
    const results: ConversionResult[] = []

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < workflowIds.length; i += batchSize) {
      const batch = workflowIds.slice(i, i + batchSize)

      const batchPromises = batch.map(async workflowId => {
        try {
          const analysis = await this.analyzeWorkflow(workflowId)
          const journey = await this.convertToJourney(analysis, config)
          return { success: true, workflowId, journeyId: journey.id }
        } catch (error) {
          return {
            success: false,
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add delay between batches to prevent rate limiting
      if (i + batchSize < workflowIds.length) {
        await this.delay(config.batchDelay || 1000)
      }
    }

    return {
      total: workflowIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### Testing Best Practices

#### 1. Unit Testing

```typescript
// __tests__/workflow-mapping/analysis.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowAnalysisService } from '@/services/workflow-mapping'
import { createMockWorkflow } from '@test/factories/workflow.factory'

describe('WorkflowAnalysisService', () => {
  let analysisService: WorkflowAnalysisService

  beforeEach(() => {
    analysisService = new WorkflowAnalysisService()
  })

  describe('analyzeWorkflow', () => {
    it('should correctly analyze a linear workflow', async () => {
      const mockWorkflow = createMockWorkflow({
        type: 'linear',
        blocksCount: 5,
        complexity: 'low'
      })

      const analysis = await analysisService.analyzeWorkflow(mockWorkflow.id)

      expect(analysis).toMatchObject({
        workflowId: mockWorkflow.id,
        analysis: {
          blocksCount: 5,
          complexity: expect.any(Number),
          entryPoints: expect.arrayContaining([expect.any(String)]),
          exitPoints: expect.arrayContaining([expect.any(String)])
        },
        feasibility: {
          canConvert: true,
          confidence: expect.any(Number)
        }
      })
    })

    it('should identify complex workflows as non-convertible', async () => {
      const complexWorkflow = createMockWorkflow({
        type: 'complex',
        blocksCount: 50,
        complexity: 'very_high',
        nestedLoops: 3,
        deepConditionals: 5
      })

      const analysis = await analysisService.analyzeWorkflow(complexWorkflow.id)

      expect(analysis.feasibility.canConvert).toBe(false)
      expect(analysis.feasibility.blockedBy).toContain('COMPLEXITY_TOO_HIGH')
    })
  })

  describe('error handling', () => {
    it('should handle missing workflows gracefully', async () => {
      await expect(
        analysisService.analyzeWorkflow('nonexistent-workflow')
      ).rejects.toThrow('Workflow not found')
    })
  })
})
```

#### 2. Integration Testing

```typescript
// __tests__/integration/workflow-to-journey.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment } from '@test/setup'
import { WorkflowToJourneyConverter } from '@/services/workflow-mapping'
import { JourneyExecutor } from '@/services/journey-execution'

describe('Workflow to Journey Integration', () => {
  let converter: WorkflowToJourneyConverter
  let executor: JourneyExecutor
  let testWorkflowId: string

  beforeAll(async () => {
    await setupTestEnvironment()
    converter = new WorkflowToJourneyConverter(testConfig)
    executor = new JourneyExecutor(testConfig)
    testWorkflowId = await createTestWorkflow()
  })

  afterAll(async () => {
    await cleanupTestEnvironment()
  })

  it('should convert and execute a workflow end-to-end', async () => {
    // Convert workflow to journey
    const journey = await converter.convertWorkflowToJourney(testWorkflowId, {
      journeyName: 'Integration Test Journey'
    })

    expect(journey.success).toBe(true)
    expect(journey.journeyId).toBeDefined()

    // Execute the journey
    const execution = await executor.startJourney(journey.journeyId)
    expect(execution.success).toBe(true)

    // Simulate user interactions
    const response1 = await executor.sendInput(execution.executionId, {
      message: 'Test User'
    })
    expect(response1.success).toBe(true)

    // Wait for completion
    const finalResult = await executor.waitForCompletion(execution.executionId, {
      timeout: 30000
    })

    expect(finalResult.status).toBe('completed')
    expect(finalResult.results).toBeDefined()
  }, 60000) // 60 second timeout for integration test
})
```

---

## Advanced Configuration

### Custom Tool Adapters

```typescript
// adapters/custom-tool-adapter.ts
export class CustomToolAdapter implements ToolAdapter {
  constructor(
    private config: CustomToolConfig,
    private logger: Logger
  ) {}

  async adapt(
    simTool: SimToolConfig,
    parlantContext: ParlantContext
  ): Promise<ParlantTool> {
    const adapter = await this.createAdapter(simTool)

    return {
      id: this.generateToolId(simTool),
      name: simTool.name,
      description: this.generateDescription(simTool),
      input_schema: this.mapInputSchema(simTool.parameters),
      handler: this.createHandler(adapter, parlantContext),
      metadata: {
        originalSimTool: simTool.type,
        complexity: this.calculateComplexity(simTool),
        estimatedDurationMs: this.estimateDuration(simTool)
      }
    }
  }

  private createHandler(
    adapter: BaseAdapter,
    context: ParlantContext
  ): ToolHandler {
    return async (params: any) => {
      const startTime = Date.now()

      try {
        this.logger.info('Executing tool', {
          toolId: adapter.id,
          userId: context.userId,
          params: this.sanitizeParams(params)
        })

        const result = await adapter.execute(params, context)

        this.logger.info('Tool execution completed', {
          toolId: adapter.id,
          durationMs: Date.now() - startTime,
          success: result.success
        })

        return this.formatResult(result)

      } catch (error) {
        this.logger.error('Tool execution failed', {
          toolId: adapter.id,
          error: error.message,
          durationMs: Date.now() - startTime
        })

        throw new ToolExecutionError(error.message, {
          toolId: adapter.id,
          params,
          context: this.sanitizeContext(context)
        })
      }
    }
  }
}
```

### Journey State Machines

```typescript
// state-machines/journey-state-machine.ts
export class JourneyStateMachine {
  private currentState: string
  private context: JourneyContext
  private history: StateTransition[]

  constructor(
    private definition: JourneyDefinition,
    private executor: StateExecutor
  ) {
    this.currentState = definition.initialState
    this.context = this.initializeContext()
    this.history = []
  }

  async transition(trigger: TransitionTrigger): Promise<TransitionResult> {
    const currentStateDefinition = this.getStateDefinition(this.currentState)
    const availableTransitions = this.getAvailableTransitions(this.currentState)

    // Find matching transition
    const transition = availableTransitions.find(t =>
      this.evaluateTransitionCondition(t, trigger, this.context)
    )

    if (!transition) {
      throw new InvalidTransitionError(
        `No valid transition from ${this.currentState} with trigger ${trigger.type}`
      )
    }

    // Execute transition
    const transitionResult = await this.executeTransition(transition, trigger)

    // Update state
    this.currentState = transition.to
    this.history.push({
      ...transition,
      timestamp: new Date(),
      trigger,
      context: { ...this.context }
    })

    return transitionResult
  }

  private async executeTransition(
    transition: StateTransition,
    trigger: TransitionTrigger
  ): Promise<TransitionResult> {
    const fromState = this.getStateDefinition(transition.from)
    const toState = this.getStateDefinition(transition.to)

    // Execute exit actions for current state
    if (fromState.onExit) {
      await this.executeActions(fromState.onExit)
    }

    // Execute transition actions
    if (transition.actions) {
      await this.executeActions(transition.actions)
    }

    // Execute entry actions for new state
    if (toState.onEntry) {
      await this.executeActions(toState.onEntry)
    }

    // Execute state-specific logic
    const stateResult = await this.executor.executeState(toState, this.context)

    return {
      success: true,
      fromState: transition.from,
      toState: transition.to,
      stateResult,
      updatedContext: this.context
    }
  }
}
```

### Performance Monitoring

```typescript
// monitoring/journey-performance-monitor.ts
export class JourneyPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>()
  private alertThresholds: AlertThresholds

  constructor(
    private logger: Logger,
    private alertManager: AlertManager,
    thresholds: AlertThresholds
  ) {
    this.alertThresholds = thresholds
  }

  async trackConversion(
    workflowId: string,
    conversionFn: () => Promise<ConversionResult>
  ): Promise<ConversionResult> {
    const startTime = Date.now()
    const metricKey = `conversion:${workflowId}`

    try {
      const result = await conversionFn()
      const duration = Date.now() - startTime

      this.recordMetric(metricKey, {
        type: 'conversion',
        duration,
        success: result.success,
        timestamp: new Date()
      })

      if (duration > this.alertThresholds.conversionTimeout) {
        await this.alertManager.sendAlert({
          type: 'SLOW_CONVERSION',
          message: `Workflow conversion took ${duration}ms`,
          severity: 'warning',
          context: { workflowId, duration }
        })
      }

      return result

    } catch (error) {
      const duration = Date.now() - startTime

      this.recordMetric(metricKey, {
        type: 'conversion',
        duration,
        success: false,
        error: error.message,
        timestamp: new Date()
      })

      await this.alertManager.sendAlert({
        type: 'CONVERSION_FAILED',
        message: `Workflow conversion failed: ${error.message}`,
        severity: 'error',
        context: { workflowId, error: error.message }
      })

      throw error
    }
  }

  async trackExecution(
    journeyId: string,
    executionFn: () => Promise<ExecutionResult>
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    const metricKey = `execution:${journeyId}`

    try {
      const result = await executionFn()
      const duration = Date.now() - startTime

      this.recordMetric(metricKey, {
        type: 'execution',
        duration,
        success: result.success,
        stepsCompleted: result.stepsCompleted,
        timestamp: new Date()
      })

      return result

    } catch (error) {
      const duration = Date.now() - startTime

      this.recordMetric(metricKey, {
        type: 'execution',
        duration,
        success: false,
        error: error.message,
        timestamp: new Date()
      })

      throw error
    }
  }

  getPerformanceReport(timeRange: TimeRange): PerformanceReport {
    const relevantMetrics = Array.from(this.metrics.values())
      .filter(metric => this.isInTimeRange(metric.timestamp, timeRange))

    return {
      timeRange,
      totalOperations: relevantMetrics.length,
      successRate: this.calculateSuccessRate(relevantMetrics),
      averageDuration: this.calculateAverageDuration(relevantMetrics),
      p95Duration: this.calculatePercentile(relevantMetrics, 0.95),
      errorRate: this.calculateErrorRate(relevantMetrics),
      topErrors: this.getTopErrors(relevantMetrics),
      recommendations: this.generateRecommendations(relevantMetrics)
    }
  }
}
```

---

This comprehensive integration guide provides developers with practical, step-by-step instructions for implementing the Workflow to Journey Mapping system, along with best practices for code organization, performance optimization, and production deployment.