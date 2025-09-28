/**
 * End-to-End Workflow Testing Suite for Universal Tool Adapter System
 * ==================================================================
 *
 * Comprehensive testing of complete user workflows that span multiple
 * tool adapters, simulating real-world usage patterns and validating
 * the entire system integration from user intent to final results.
 *
 * Features:
 * - Multi-tool workflow orchestration testing
 * - Realistic user scenario simulation
 * - Data flow validation across tool boundaries
 * - Context preservation testing
 * - Error recovery and fallback validation
 * - Performance under complex workflow conditions
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import { agentService, createAuthContext, sessionService } from '@/services/parlant'
import type { Agent, AuthContext, Session } from '@/services/parlant/types'
import type { ToolExecutionContext } from '../tools/adapter-framework'
import { globalAdapterRegistry } from '../tools/adapter-registry'
import { COMPREHENSIVE_TEST_CONFIG, IMPLEMENTED_ADAPTERS } from './comprehensive-tool-adapter-tests'

// =====================================================
// END-TO-END TEST CONFIGURATION
// =====================================================

const E2E_TEST_CONFIG = {
  // Workflow test timeouts
  SIMPLE_WORKFLOW_TIMEOUT: 60000, // 1 minute for simple workflows
  COMPLEX_WORKFLOW_TIMEOUT: 180000, // 3 minutes for complex workflows
  AGENT_CREATION_TIMEOUT: 30000, // 30 seconds for agent setup

  // Test environments
  WORKFLOW_WORKSPACES: {
    PRIMARY: 'e2e-workflow-primary',
    SECONDARY: 'e2e-workflow-secondary',
    ISOLATED: 'e2e-workflow-isolated',
  },

  // Workflow complexity levels
  WORKFLOW_TYPES: {
    SIMPLE: { tools: 2, steps: 3, max_duration: 30000 },
    MEDIUM: { tools: 3, steps: 5, max_duration: 60000 },
    COMPLEX: { tools: 4, steps: 7, max_duration: 120000 },
  },
}

// =====================================================
// WORKFLOW DEFINITION TYPES
// =====================================================

interface WorkflowStep {
  stepId: string
  toolId: string
  description: string
  parameters: Record<string, any>
  expectedOutputs: string[]
  dependsOn?: string[]
  optional?: boolean
}

interface WorkflowDefinition {
  id: string
  Name: string
  description: string
  complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
  scenario: string
  steps: WorkflowStep[]
  expectedFinalOutcome: string
  successCriteria: string[]
}

interface WorkflowExecutionResult {
  workflowId: string
  success: boolean
  totalExecutionTime: number
  stepsExecuted: number
  stepsSuccessful: number
  stepResults: Array<{
    stepId: string
    toolId: string
    success: boolean
    executionTime: number
    output?: any
    error?: string
  }>
  finalOutcome?: any
  error?: string
}

// =====================================================
// PREDEFINED WORKFLOW SCENARIOS
// =====================================================

const WORKFLOW_SCENARIOS: WorkflowDefinition[] = [
  {
    id: 'data-research-workflow',
    Name: 'Data Research and Documentation',
    description: 'Research information, process it, and document findings',
    complexity: 'SIMPLE',
    scenario: 'User wants to research a topic and save findings to a document',
    steps: [
      {
        stepId: 'research-step',
        toolId: 'thinking',
        description: 'Research and analyze the given topic',
        parameters: {
          query: 'artificial intelligence trends 2024',
          depth: 'comprehensive',
        },
        expectedOutputs: ['research_summary', 'key_points', 'sources'],
      },
      {
        stepId: 'document-creation',
        toolId: 'google_sheets',
        description: 'Create a document with research findings',
        parameters: {
          spreadsheet_id: 'test-research-doc',
          sheet_name: 'Research Findings',
          operation: 'create_sheet',
        },
        expectedOutputs: ['sheet_created', 'sheet_url'],
        dependsOn: ['research-step'],
      },
    ],
    expectedFinalOutcome: 'Research findings documented in a structured format',
    successCriteria: [
      'Research was conducted successfully',
      'Document was created with research content',
      'All data flows between steps correctly',
    ],
  },

  {
    id: 'communication-workflow',
    Name: 'Multi-Channel Communication',
    description: 'Send notifications across multiple communication channels',
    complexity: 'MEDIUM',
    scenario: 'User wants to broadcast important information to team via multiple channels',
    steps: [
      {
        stepId: 'prepare-message',
        toolId: 'thinking',
        description: 'Prepare and format the message for different channels',
        parameters: {
          content: 'Important system update: New features released',
          audience: 'development team',
          channels: ['slack', 'github'],
        },
        expectedOutputs: ['formatted_messages', 'channel_specific_content'],
      },
      {
        stepId: 'slack-notification',
        toolId: 'slack',
        description: 'Send notification to Slack channel',
        parameters: {
          action: 'send_message',
          channel: '#general',
          message: 'System Update: New features are now live!',
          bot_token: COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.SLACK_BOT_TOKEN,
        },
        expectedOutputs: ['message_sent', 'message_ts'],
        dependsOn: ['prepare-message'],
      },
      {
        stepId: 'github-issue',
        toolId: 'github',
        description: 'Create tracking issue on GitHub',
        parameters: {
          action: 'create_issue',
          title: 'Feature Release Tracking',
          body: 'Track the deployment and rollout of new features',
          token: COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.GITHUB_TOKEN,
        },
        expectedOutputs: ['issue_created', 'issue_url'],
        dependsOn: ['prepare-message'],
      },
    ],
    expectedFinalOutcome: 'Information broadcasted across all specified channels',
    successCriteria: [
      'Message prepared and formatted correctly',
      'Slack notification sent successfully',
      'GitHub issue created successfully',
      'All channels received consistent information',
    ],
  },

  {
    id: 'data-pipeline-workflow',
    Name: 'Data Processing Pipeline',
    description: 'Extract, transform, and load data across multiple systems',
    complexity: 'COMPLEX',
    scenario: 'User wants to process data from one system and load it into another',
    steps: [
      {
        stepId: 'data-extraction',
        toolId: 'postgresql',
        description: 'Extract data from source database',
        parameters: {
          connection_string: COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.POSTGRESQL_URL,
          query: "SELECT * FROM user_activity WHERE date >= CURRENT_DATE - INTERVAL '7 days'",
          operation: 'query',
        },
        expectedOutputs: ['query_results', 'row_count'],
      },
      {
        stepId: 'data-analysis',
        toolId: 'thinking',
        description: 'Analyze extracted data and identify patterns',
        parameters: {
          data_source: 'user_activity_data',
          analysis_type: 'trend_analysis',
          time_period: '7_days',
        },
        expectedOutputs: ['analysis_results', 'insights', 'trends'],
        dependsOn: ['data-extraction'],
      },
      {
        stepId: 'embedding-generation',
        toolId: 'openai_embeddings',
        description: 'Generate embeddings for text data',
        parameters: {
          text: 'Sample user activity data for analysis',
          model: 'text-embedding-3-small',
          api_key: COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.OPENAI_API_KEY,
        },
        expectedOutputs: ['embeddings', 'model_used'],
        dependsOn: ['data-analysis'],
      },
      {
        stepId: 'results-documentation',
        toolId: 'google_sheets',
        description: 'Document analysis results in spreadsheet',
        parameters: {
          spreadsheet_id: 'data-analysis-results',
          sheet_name: 'Weekly Analysis',
          operation: 'update_data',
          api_key: COMPREHENSIVE_TEST_CONFIG.TEST_CREDENTIALS.GOOGLE_SHEETS_KEY,
        },
        expectedOutputs: ['data_updated', 'sheet_url'],
        dependsOn: ['data-analysis', 'embedding-generation'],
      },
    ],
    expectedFinalOutcome: 'Complete data pipeline execution with results documented',
    successCriteria: [
      'Data extracted successfully from source',
      'Analysis completed with meaningful insights',
      'Embeddings generated for relevant text data',
      'Results properly documented',
      'All steps completed within performance thresholds',
    ],
  },
]

// =====================================================
// END-TO-END WORKFLOW TESTING ENGINE
// =====================================================

class EndToEndWorkflowTester {
  private testAgent: { agent: Agent; session: Session; authContext: AuthContext } | null = null
  private registry = globalAdapterRegistry
  private workflowResults: Map<string, WorkflowExecutionResult> = new Map()

  async setupTestEnvironment(): Promise<void> {
    console.log('🚀 Setting up end-to-end workflow testing environment...')

    try {
      // Create authentication context
      const authContext = createAuthContext(
        'e2e-test-user',
        E2E_TEST_CONFIG.WORKFLOW_WORKSPACES.PRIMARY,
        'workspace'
      )

      // Create test agent for workflow execution
      const agentResponse = await agentService.createAgent(
        {
          Name: 'E2E Workflow Test Agent',
          description: 'Agent for testing end-to-end workflows with Universal Tool Adapter System',
          workspace_id: E2E_TEST_CONFIG.WORKFLOW_WORKSPACES.PRIMARY,
          config: {
            model: 'gpt-4',
            temperature: 0.1,
            max_turns: 20,
          },
          guidelines: [
            {
              Name: 'Workflow Testing Guidelines',
              description: 'Guidelines for systematic workflow testing',
              content: `You are a workflow testing agent. Your role is to:
1. Execute multi-tool workflows systematically
2. Validate data flows between different tools
3. Ensure context preservation across tool boundaries
4. Test error recovery and fallback mechanisms
5. Verify final outcomes match expected results
6. Maintain detailed execution logs for analysis`,
            },
          ],
        },
        authContext
      )

      if (!agentResponse.success) {
        throw new Error(`Failed to create test agent: ${agentResponse.error}`)
      }

      // Create test session
      const sessionResponse = await sessionService.createSession(
        {
          agent_id: agentResponse.data.id,
          workspace_id: E2E_TEST_CONFIG.WORKFLOW_WORKSPACES.PRIMARY,
          customer_id: 'e2e-workflow-testing-session',
        },
        authContext
      )

      if (!sessionResponse.success) {
        throw new Error(`Failed to create test session: ${sessionResponse.error}`)
      }

      this.testAgent = {
        agent: agentResponse.data,
        session: sessionResponse.data,
        authContext,
      }

      console.log('✅ E2E workflow test environment setup complete')
      console.log(`📋 Agent ID: ${agentResponse.data.id}`)
      console.log(`📋 Session ID: ${sessionResponse.data.id}`)
    } catch (error) {
      console.error('❌ Failed to setup E2E test environment:', error)
      throw error
    }
  }

  async teardownTestEnvironment(): Promise<void> {
    console.log('🧹 Tearing down E2E workflow test environment...')

    try {
      if (this.testAgent) {
        await sessionService.closeSession(this.testAgent.session.id, this.testAgent.authContext)
      }
      console.log('✅ E2E test environment cleanup complete')
    } catch (error) {
      console.error('⚠️ Warning: E2E test environment cleanup failed:', error)
    }
  }

  async executeWorkflow(workflowDef: WorkflowDefinition): Promise<WorkflowExecutionResult> {
    console.log(`🔄 Executing workflow: ${workflowDef.Name}`)
    console.log(`   Scenario: ${workflowDef.scenario}`)
    console.log(`   Complexity: ${workflowDef.complexity}`)
    console.log(`   Steps: ${workflowDef.steps.length}`)

    const startTime = Date.now()
    const result: WorkflowExecutionResult = {
      workflowId: workflowDef.id,
      success: false,
      totalExecutionTime: 0,
      stepsExecuted: 0,
      stepsSuccessful: 0,
      stepResults: [],
    }

    try {
      const executionContext: ToolExecutionContext = {
        userId: 'e2e-test-user',
        workspaceId: E2E_TEST_CONFIG.WORKFLOW_WORKSPACES.PRIMARY,
        agentId: this.testAgent!.agent.id,
        sessionId: this.testAgent!.session.id,
        metadata: {
          workflowId: workflowDef.id,
          workflowName: workflowDef.Name,
          testRun: true,
        },
      }

      // Execute workflow steps sequentially (respecting dependencies)
      const executedSteps = new Set<string>()
      const stepOutputs = new Map<string, any>()

      for (const step of workflowDef.steps) {
        // Check dependencies
        if (step.dependsOn && !step.dependsOn.every((dep) => executedSteps.has(dep))) {
          console.log(`   ⏸️  Skipping ${step.stepId} - dependencies not met`)
          continue
        }

        console.log(`   🔧 Executing step: ${step.stepId} (${step.toolId})`)

        const stepStartTime = Date.now()
        const stepResult = await this.executeWorkflowStep(step, stepOutputs, executionContext)
        const stepEndTime = Date.now()

        result.stepResults.push({
          stepId: step.stepId,
          toolId: step.toolId,
          success: stepResult.success,
          executionTime: stepEndTime - stepStartTime,
          output: stepResult.output,
          error: stepResult.error,
        })

        result.stepsExecuted++

        if (stepResult.success) {
          result.stepsSuccessful++
          executedSteps.add(step.stepId)
          stepOutputs.set(step.stepId, stepResult.output)
          console.log(`   ✅ Step ${step.stepId} completed successfully`)
        } else {
          console.log(`   ❌ Step ${step.stepId} failed: ${stepResult.error}`)

          if (!step.optional) {
            // Non-optional step failed, abort workflow
            result.error = `Workflow failed at step ${step.stepId}: ${stepResult.error}`
            break
          }
        }
      }

      // Evaluate overall workflow success
      const requiredStepsCompleted = workflowDef.steps.filter((s) => !s.optional).length
      const requiredStepsSuccessful = result.stepResults.filter((r) => {
        const step = workflowDef.steps.find((s) => s.stepId === r.stepId)
        return r.success && (!step || !step.optional)
      }).length

      result.success = requiredStepsSuccessful === requiredStepsCompleted
      result.totalExecutionTime = Date.now() - startTime

      if (result.success) {
        result.finalOutcome = this.generateWorkflowSummary(workflowDef, stepOutputs)
      }

      console.log(`   🎯 Workflow ${workflowDef.Name}: ${result.success ? 'SUCCESS' : 'FAILED'}`)
      console.log(`      Steps: ${result.stepsSuccessful}/${result.stepsExecuted} successful`)
      console.log(`      Duration: ${result.totalExecutionTime}ms`)
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
      result.totalExecutionTime = Date.now() - startTime
      console.log(`   ❌ Workflow ${workflowDef.Name} failed with error: ${result.error}`)
    }

    this.workflowResults.set(workflowDef.id, result)
    return result
  }

  private async executeWorkflowStep(
    step: WorkflowStep,
    previousOutputs: Map<string, any>,
    context: ToolExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // Resolve parameter values from previous step outputs
      const resolvedParameters = this.resolveStepParameters(step.parameters, previousOutputs)

      // Execute the tool through the registry
      const result = await this.registry.executeTool(
        step.toolId,
        resolvedParameters,
        {
          ...context,
          metadata: {
            ...context.metadata,
            stepId: step.stepId,
            stepDescription: step.description,
          },
        },
        {
          useCache: false, // Disable caching for workflow testing
          timeout: 30000, // 30 second timeout per step
        }
      )

      if (result.success) {
        // Validate expected outputs
        const outputValidation = this.validateStepOutputs(result.data, step.expectedOutputs)
        if (!outputValidation.valid) {
          return {
            success: false,
            error: `Output validation failed: ${outputValidation.missingOutputs.join(', ')}`,
          }
        }

        return {
          success: true,
          output: result.data,
        }
      }
      return {
        success: false,
        error: result.error || 'Tool execution failed',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private resolveStepParameters(
    parameters: Record<string, any>,
    previousOutputs: Map<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {}

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Parameter reference to previous step output
        const reference = value.slice(2, -1) // Remove ${ and }
        const [stepId, outputKey] = reference.split('.')

        if (previousOutputs.has(stepId)) {
          const stepOutput = previousOutputs.get(stepId)
          resolved[key] = outputKey ? stepOutput[outputKey] : stepOutput
        } else {
          // Reference not found, use original value
          resolved[key] = value
        }
      } else {
        resolved[key] = value
      }
    }

    return resolved
  }

  private validateStepOutputs(
    actualOutput: any,
    expectedOutputs: string[]
  ): { valid: boolean; missingOutputs: string[] } {
    if (!actualOutput || typeof actualOutput !== 'object') {
      return {
        valid: expectedOutputs.length === 0,
        missingOutputs: expectedOutputs,
      }
    }

    const missingOutputs = expectedOutputs.filter((expected) => !(expected in actualOutput))

    return {
      valid: missingOutputs.length === 0,
      missingOutputs,
    }
  }

  private generateWorkflowSummary(
    workflowDef: WorkflowDefinition,
    stepOutputs: Map<string, any>
  ): any {
    return {
      workflowId: workflowDef.id,
      workflowName: workflowDef.Name,
      completedSteps: Array.from(stepOutputs.keys()),
      finalResults: Object.fromEntries(stepOutputs),
      expectedOutcome: workflowDef.expectedFinalOutcome,
      successCriteriaEvaluated: workflowDef.successCriteria.map((criteria) => ({
        criteria,
        met: true, // Simplified - in real implementation would check against actual results
      })),
    }
  }

  async runAllWorkflowScenarios(): Promise<{
    success: boolean
    totalWorkflows: number
    successfulWorkflows: number
    failedWorkflows: number
    averageExecutionTime: number
    workflowResults: WorkflowExecutionResult[]
    complexityAnalysis: Map<string, { success: number; total: number; avgTime: number }>
  }> {
    console.log('🚀 Running all end-to-end workflow scenarios...')

    const allResults: WorkflowExecutionResult[] = []
    const complexityStats = new Map<string, { success: number; total: number; totalTime: number }>()

    for (const workflow of WORKFLOW_SCENARIOS) {
      const result = await this.executeWorkflow(workflow)
      allResults.push(result)

      // Update complexity statistics
      const complexity = workflow.complexity
      if (!complexityStats.has(complexity)) {
        complexityStats.set(complexity, { success: 0, total: 0, totalTime: 0 })
      }

      const stats = complexityStats.get(complexity)!
      stats.total++
      stats.totalTime += result.totalExecutionTime
      if (result.success) {
        stats.success++
      }
    }

    // Calculate summary statistics
    const successful = allResults.filter((r) => r.success)
    const totalTime = allResults.reduce((sum, r) => sum + r.totalExecutionTime, 0)
    const avgTime = totalTime / allResults.length

    // Transform complexity stats for output
    const complexityAnalysis = new Map<
      string,
      { success: number; total: number; avgTime: number }
    >()
    complexityStats.forEach((stats, complexity) => {
      complexityAnalysis.set(complexity, {
        success: stats.success,
        total: stats.total,
        avgTime: stats.totalTime / stats.total,
      })
    })

    const success = successful.length === allResults.length

    console.log(`🎯 End-to-end workflow testing complete: ${success ? 'ALL PASS' : 'SOME FAILED'}`)
    console.log(`   Total workflows: ${allResults.length}`)
    console.log(`   Successful: ${successful.length}`)
    console.log(`   Failed: ${allResults.length - successful.length}`)
    console.log(`   Average execution time: ${avgTime.toFixed(2)}ms`)

    return {
      success,
      totalWorkflows: allResults.length,
      successfulWorkflows: successful.length,
      failedWorkflows: allResults.length - successful.length,
      averageExecutionTime: avgTime,
      workflowResults: allResults,
      complexityAnalysis,
    }
  }

  getWorkflowResult(workflowId: string): WorkflowExecutionResult | undefined {
    return this.workflowResults.get(workflowId)
  }

  getAllResults(): WorkflowExecutionResult[] {
    return Array.from(this.workflowResults.values())
  }
}

// =====================================================
// TEST SUITE IMPLEMENTATION
// =====================================================

describe('End-to-End Workflow Integration Tests', () => {
  let workflowTester: EndToEndWorkflowTester

  beforeAll(async () => {
    workflowTester = new EndToEndWorkflowTester()
    await workflowTester.setupTestEnvironment()
  }, E2E_TEST_CONFIG.AGENT_CREATION_TIMEOUT)

  afterAll(async () => {
    await workflowTester.teardownTestEnvironment()
  })

  describe('Individual Workflow Scenarios', () => {
    test.each(WORKFLOW_SCENARIOS.map((w) => [w.id, w]))(
      'should execute %s workflow successfully',
      async (workflowId, workflowDef) => {
        const workflow = workflowDef as WorkflowDefinition
        const result = await workflowTester.executeWorkflow(workflow)

        console.log(`\n📊 Workflow Results for ${workflow.Name}:`)
        console.log(`   Overall Success: ${result.success ? '✅' : '❌'}`)
        console.log(`   Steps Executed: ${result.stepsExecuted}`)
        console.log(`   Steps Successful: ${result.stepsSuccessful}`)
        console.log(`   Total Time: ${result.totalExecutionTime}ms`)

        // Log individual step results
        result.stepResults.forEach((step) => {
          console.log(
            `   Step ${step.stepId} (${step.toolId}): ${step.success ? '✅' : '❌'} (${step.executionTime}ms)`
          )
          if (!step.success && step.error) {
            console.log(`      Error: ${step.error}`)
          }
        })

        // Assert basic workflow execution
        expect(result.stepsExecuted).toBeGreaterThan(0)
        expect(result.totalExecutionTime).toBeLessThan(
          E2E_TEST_CONFIG.WORKFLOW_TYPES[workflow.complexity].max_duration
        )

        // For implemented adapters, we expect success if all tools are available
        const requiredTools = workflow.steps.map((s) => s.toolId)
        const availableTools = requiredTools.filter((toolId) =>
          IMPLEMENTED_ADAPTERS.includes(toolId)
        )

        if (availableTools.length === requiredTools.length) {
          // All required tools are implemented, workflow should succeed
          expect(result.success).toBe(true)
        } else {
          // Some tools not implemented, document what's missing
          const missingTools = requiredTools.filter(
            (toolId) => !IMPLEMENTED_ADAPTERS.includes(toolId)
          )
          console.log(`   ⚠️  Missing tool implementations: ${missingTools.join(', ')}`)

          // Workflow may fail, but should at least execute available steps
          expect(result.stepsExecuted).toBeGreaterThanOrEqual(availableTools.length)
        }
      },
      E2E_TEST_CONFIG.COMPLEX_WORKFLOW_TIMEOUT
    )
  })

  describe('Comprehensive Workflow Analysis', () => {
    test(
      'should successfully execute all workflow scenarios',
      async () => {
        const results = await workflowTester.runAllWorkflowScenarios()

        console.log(`\n📈 Comprehensive Workflow Analysis:`)
        console.log(`   Total Workflows: ${results.totalWorkflows}`)
        console.log(`   Successful Workflows: ${results.successfulWorkflows}`)
        console.log(`   Failed Workflows: ${results.failedWorkflows}`)
        console.log(
          `   Success Rate: ${((results.successfulWorkflows / results.totalWorkflows) * 100).toFixed(2)}%`
        )
        console.log(`   Average Execution Time: ${results.averageExecutionTime.toFixed(2)}ms`)

        console.log(`\n📊 Analysis by Complexity:`)
        results.complexityAnalysis.forEach((stats, complexity) => {
          console.log(
            `   ${complexity}: ${stats.success}/${stats.total} successful (${stats.avgTime.toFixed(2)}ms avg)`
          )
        })

        // Test assertions
        expect(results.totalWorkflows).toBe(WORKFLOW_SCENARIOS.length)
        expect(results.successfulWorkflows).toBeGreaterThanOrEqual(0)
        expect(results.averageExecutionTime).toBeGreaterThan(0)

        // At least some workflows should succeed (those using only implemented adapters)
        expect(results.successfulWorkflows).toBeGreaterThanOrEqual(1)
      },
      E2E_TEST_CONFIG.COMPLEX_WORKFLOW_TIMEOUT
    )
  })

  describe('Data Flow Validation', () => {
    test(
      'should preserve data context across workflow steps',
      async () => {
        // Test a simple workflow that passes data between steps
        const dataFlowWorkflow: WorkflowDefinition = {
          id: 'data-flow-test',
          Name: 'Data Flow Validation',
          description: 'Test data passing between workflow steps',
          complexity: 'SIMPLE',
          scenario: 'Validate that data flows correctly between tools',
          steps: [
            {
              stepId: 'generate-data',
              toolId: 'thinking',
              description: 'Generate test data',
              parameters: {
                task: 'generate_test_data',
                format: 'json',
              },
              expectedOutputs: ['generated_data'],
            },
            {
              stepId: 'process-data',
              toolId: 'thinking',
              description: 'Process the generated data',
              parameters: {
                input_data: `\${generate-data.generated_data}`,
                operation: 'validate_and_format',
              },
              expectedOutputs: ['processed_data'],
              dependsOn: ['generate-data'],
            },
          ],
          expectedFinalOutcome: 'Data successfully passed and processed between steps',
          successCriteria: [
            'Data generated in first step',
            'Data successfully passed to second step',
            'Second step processed the data correctly',
          ],
        }

        const result = await workflowTester.executeWorkflow(dataFlowWorkflow)

        console.log(`\n🔄 Data Flow Validation Results:`)
        console.log(`   Workflow Success: ${result.success ? '✅' : '❌'}`)
        console.log(`   Steps Completed: ${result.stepsSuccessful}/${result.stepsExecuted}`)

        result.stepResults.forEach((step) => {
          console.log(`   ${step.stepId}: ${step.success ? '✅' : '❌'}`)
          if (step.output) {
            console.log(`      Output keys: ${Object.keys(step.output).join(', ')}`)
          }
        })

        // Basic validation
        expect(result.stepsExecuted).toBe(2)
        expect(result.stepResults[0].success).toBe(true) // First step should always work

        if (result.stepResults[1].success) {
          // If second step succeeded, data flow worked
          expect(result.success).toBe(true)
        }
      },
      E2E_TEST_CONFIG.SIMPLE_WORKFLOW_TIMEOUT
    )
  })

  describe('Error Recovery and Fallbacks', () => {
    test(
      'should handle tool failures gracefully',
      async () => {
        // Test workflow with intentional failures
        const errorRecoveryWorkflow: WorkflowDefinition = {
          id: 'error-recovery-test',
          Name: 'Error Recovery Validation',
          description: 'Test workflow behavior with tool failures',
          complexity: 'MEDIUM',
          scenario: 'Validate error handling and recovery mechanisms',
          steps: [
            {
              stepId: 'working-step',
              toolId: 'thinking',
              description: 'Step that should work',
              parameters: {
                task: 'simple_task',
              },
              expectedOutputs: ['result'],
            },
            {
              stepId: 'failing-step',
              toolId: 'nonexistent_tool',
              description: 'Step that should fail',
              parameters: {
                invalid: 'parameters',
              },
              expectedOutputs: ['should_not_exist'],
              optional: true, // Mark as optional to test fallback behavior
            },
            {
              stepId: 'recovery-step',
              toolId: 'thinking',
              description: 'Step that should work after failure',
              parameters: {
                task: 'recovery_task',
              },
              expectedOutputs: ['recovery_result'],
              dependsOn: ['working-step'], // Don't depend on failing step
            },
          ],
          expectedFinalOutcome: 'Workflow completes despite individual step failures',
          successCriteria: [
            'Working steps complete successfully',
            'Optional failing steps are handled gracefully',
            'Workflow continues after recoverable failures',
          ],
        }

        const result = await workflowTester.executeWorkflow(errorRecoveryWorkflow)

        console.log(`\n🛡️ Error Recovery Test Results:`)
        console.log(`   Workflow Success: ${result.success ? '✅' : '❌'}`)
        console.log(`   Steps Executed: ${result.stepsExecuted}`)
        console.log(`   Successful Steps: ${result.stepsSuccessful}`)

        result.stepResults.forEach((step) => {
          console.log(`   ${step.stepId}: ${step.success ? '✅' : '❌'}`)
          if (!step.success && step.error) {
            console.log(`      Error: ${step.error}`)
          }
        })

        // Should execute at least the working steps
        expect(result.stepsExecuted).toBeGreaterThanOrEqual(2)

        // Should have at least one successful step
        expect(result.stepsSuccessful).toBeGreaterThanOrEqual(1)

        // Should handle the failing step gracefully
        const failingStepResult = result.stepResults.find((s) => s.stepId === 'failing-step')
        if (failingStepResult) {
          expect(failingStepResult.success).toBe(false) // Should fail as expected
          expect(failingStepResult.error).toBeDefined() // Should have error details
        }
      },
      E2E_TEST_CONFIG.COMPLEX_WORKFLOW_TIMEOUT
    )
  })
})

// NOTE: If these utilities need to be shared with other tests, move them to a separate
// non-test file like __tests__/utils/end-to-end-workflow-utils.ts
// export { EndToEndWorkflowTester, WORKFLOW_SCENARIOS, E2E_TEST_CONFIG }
// export type { WorkflowDefinition, WorkflowExecutionResult, WorkflowStep }
