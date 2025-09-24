/**
 * Comprehensive Workflow to Journey Conversion Accuracy Tests
 * ==========================================================
 *
 * This test suite provides comprehensive validation of the workflow-to-journey
 * conversion system, ensuring accuracy, completeness, and data integrity
 * across all supported workflow block types and edge cases.
 *
 * Test Categories:
 * - Basic conversion accuracy
 * - Block type coverage validation
 * - Parameter substitution accuracy
 * - Edge case handling
 * - Data integrity validation
 * - Performance benchmarking
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createLogger } from '@/lib/logs/console/logger'
import { getAllBlocks } from '@/blocks'
import { WorkflowToJourneyConverter } from '@/services/parlant/journey-conversion/conversion-engine'
import type {
  BlockState,
  ConversionConfig,
  ConversionContext,
  Edge,
  JourneyConversionResult,
  TemplateParameter,
  ValidationResult,
  WorkflowState,
} from '@/services/parlant/journey-conversion/types'

const logger = createLogger('ConversionAccuracyTests')

// Test configuration and constants
const TEST_CONFIG: ConversionConfig = {
  preserve_block_names: true,
  generate_descriptions: true,
  enable_parameter_substitution: true,
  include_error_handling: true,
  optimization_level: 'standard',
  cache_duration_ms: 60000,
}

const TEST_CONTEXT_BASE: Partial<ConversionContext> = {
  workspace_id: 'test-workspace',
  user_id: 'test-user',
  config: TEST_CONFIG,
}

// Test workflow definitions for different complexity levels
const SIMPLE_LINEAR_WORKFLOW: WorkflowState = {
  id: 'simple-linear-test',
  name: 'Simple Linear Workflow',
  description: 'Basic sequential workflow for testing',
  blocks: [
    {
      id: 'start-1',
      type: 'starter',
      position: { x: 100, y: 100 },
      data: { label: 'Start' },
      width: 200,
      height: 100,
    },
    {
      id: 'agent-1',
      type: 'agent',
      position: { x: 400, y: 100 },
      data: {
        label: 'Process Request',
        model: 'gpt-4',
        prompt: 'Process the user request: {{user_input}}',
        temperature: 0.7,
      },
      width: 200,
      height: 150,
    },
    {
      id: 'api-1',
      type: 'api',
      position: { x: 700, y: 100 },
      data: {
        label: 'Send Response',
        method: 'POST',
        url: '{{api_endpoint}}',
        headers: { 'Content-Type': 'application/json' },
        body: '{"result": "{{agent_output}}"}',
      },
      width: 200,
      height: 150,
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'start-1',
      target: 'agent-1',
      type: 'default',
    },
    {
      id: 'edge-2',
      source: 'agent-1',
      target: 'api-1',
      type: 'default',
    },
  ],
}

const COMPLEX_WORKFLOW_WITH_CONDITIONS: WorkflowState = {
  id: 'complex-conditional-test',
  name: 'Complex Conditional Workflow',
  description: 'Workflow with conditions, parallels, and loops',
  blocks: [
    {
      id: 'start-1',
      type: 'starter',
      position: { x: 100, y: 200 },
      data: { label: 'Start' },
      width: 200,
      height: 100,
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 400, y: 200 },
      data: {
        label: 'Check Input Type',
        condition: '{{input_type}} === "urgent"',
      },
      width: 200,
      height: 120,
    },
    {
      id: 'parallel-1',
      type: 'parallel',
      position: { x: 700, y: 100 },
      data: {
        label: 'Urgent Processing',
        blocks: ['agent-urgent', 'email-notify'],
      },
      width: 250,
      height: 150,
    },
    {
      id: 'agent-normal',
      type: 'agent',
      position: { x: 700, y: 300 },
      data: {
        label: 'Normal Processing',
        model: 'gpt-4',
        prompt: 'Process normally: {{user_input}}',
      },
      width: 200,
      height: 150,
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 1000, y: 200 },
      data: {
        label: 'Route Results',
        routes: [
          { condition: '{{urgent_processed}}', target: 'urgent-output' },
          { condition: '{{normal_processed}}', target: 'normal-output' },
        ],
      },
      width: 200,
      height: 150,
    },
  ],
  edges: [
    { id: 'edge-1', source: 'start-1', target: 'condition-1', type: 'default' },
    {
      id: 'edge-2',
      source: 'condition-1',
      target: 'parallel-1',
      type: 'conditional',
      data: { condition: 'true' },
    },
    {
      id: 'edge-3',
      source: 'condition-1',
      target: 'agent-normal',
      type: 'conditional',
      data: { condition: 'false' },
    },
    { id: 'edge-4', source: 'parallel-1', target: 'router-1', type: 'default' },
    { id: 'edge-5', source: 'agent-normal', target: 'router-1', type: 'default' },
  ],
}

// Test parameters for parameter substitution testing
const TEST_PARAMETERS: Record<string, TemplateParameter> = {
  user_input: {
    id: 'user_input',
    name: 'user_input',
    type: 'string',
    description: 'User input text',
    default_value: 'Test input',
    required: true,
    display_order: 1,
  },
  api_endpoint: {
    id: 'api_endpoint',
    name: 'api_endpoint',
    type: 'string',
    description: 'API endpoint URL',
    default_value: 'https://api.example.com/process',
    required: true,
    validation: {
      pattern: '^https?://',
    },
    display_order: 2,
  },
  input_type: {
    id: 'input_type',
    name: 'input_type',
    type: 'string',
    description: 'Priority level of input',
    default_value: 'normal',
    required: false,
    validation: {
      allowed_values: ['normal', 'urgent', 'low'],
    },
    display_order: 3,
  },
}

// Test utilities
class ConversionAccuracyValidator {
  private static validateBasicStructure(result: JourneyConversionResult): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate journey structure
    if (!result.journey) {
      errors.push('Missing journey in conversion result')
    } else {
      if (!result.journey.id) errors.push('Journey missing ID')
      if (!result.journey.name) errors.push('Journey missing name')
    }

    // Validate steps
    if (!result.steps || result.steps.length === 0) {
      errors.push('No journey steps generated')
    }

    // Validate metadata
    if (!result.metadata) {
      errors.push('Missing conversion metadata')
    } else {
      if (!result.metadata.source_workflow_id) errors.push('Missing source workflow ID in metadata')
      if (!result.metadata.conversion_timestamp) errors.push('Missing conversion timestamp')
      if (result.metadata.conversion_duration_ms < 0) errors.push('Invalid conversion duration')
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private static validateBlockConversion(
    originalBlocks: BlockState[],
    conversionResult: JourneyConversionResult
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check that all blocks were converted
    const convertedBlockIds = new Set(
      conversionResult.steps.map((step) => step.source_block_id).filter(Boolean)
    )

    for (const block of originalBlocks) {
      if (!convertedBlockIds.has(block.id)) {
        // Check if block type is supported
        if (ConversionAccuracyValidator.isSupportedBlockType(block.type)) {
          errors.push(`Supported block type '${block.type}' (${block.id}) was not converted`)
        } else {
          warnings.push(`Unsupported block type '${block.type}' (${block.id}) skipped`)
        }
      }
    }

    // Validate step structure
    for (const step of conversionResult.steps) {
      if (!step.id) errors.push(`Step missing ID: ${JSON.stringify(step)}`)
      if (!step.title) errors.push(`Step missing title: ${step.id}`)
      if (!step.type) errors.push(`Step missing type: ${step.id}`)
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private static validateParameterSubstitution(
    parameters: Record<string, any>,
    result: JourneyConversionResult
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check that parameters were applied
    const parametersApplied = result.metadata.parameters_applied || {}

    for (const [key, value] of Object.entries(parameters)) {
      if (!(key in parametersApplied)) {
        warnings.push(`Parameter '${key}' was not used in conversion`)
      } else if (parametersApplied[key] !== value) {
        errors.push(
          `Parameter '${key}' value mismatch: expected '${value}', got '${parametersApplied[key]}'`
        )
      }
    }

    // Validate parameter substitution in step content
    const stepContent = JSON.stringify(result.steps)
    for (const [key, value] of Object.entries(parameters)) {
      const templatePattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      if (templatePattern.test(stepContent)) {
        errors.push(`Parameter template '{{${key}}}' was not substituted in journey steps`)
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private static isSupportedBlockType(blockType: string): boolean {
    const allBlocks = getAllBlocks()
    return allBlocks.some((block) => block.type === blockType)
  }

  static validateConversion(
    originalWorkflow: WorkflowState,
    parameters: Record<string, any>,
    result: JourneyConversionResult
  ): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []

    // Run all validation checks
    const basicValidation = ConversionAccuracyValidator.validateBasicStructure(result)
    allErrors.push(...basicValidation.errors)
    allWarnings.push(...basicValidation.warnings)

    const blockValidation = ConversionAccuracyValidator.validateBlockConversion(
      originalWorkflow.blocks,
      result
    )
    allErrors.push(...blockValidation.errors)
    allWarnings.push(...blockValidation.warnings)

    const paramValidation = ConversionAccuracyValidator.validateParameterSubstitution(
      parameters,
      result
    )
    allErrors.push(...paramValidation.errors)
    allWarnings.push(...paramValidation.warnings)

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    }
  }
}

// Test data generation utilities
class TestDataGenerator {
  static generateRandomParameters(
    template: Record<string, TemplateParameter>
  ): Record<string, any> {
    const params: Record<string, any> = {}

    for (const [key, param] of Object.entries(template)) {
      switch (param.type) {
        case 'string':
          if (param.validation?.allowed_values) {
            const values = param.validation.allowed_values
            params[key] = values[Math.floor(Math.random() * values.length)]
          } else {
            params[key] = `test-${key}-${Math.random().toString(36).substr(2, 9)}`
          }
          break
        case 'number': {
          const min = param.validation?.min || 0
          const max = param.validation?.max || 100
          params[key] = Math.floor(Math.random() * (max - min + 1)) + min
          break
        }
        case 'boolean':
          params[key] = Math.random() > 0.5
          break
        default:
          params[key] = param.default_value || null
      }
    }

    return params
  }

  static generateWorkflowWithAllBlockTypes(): WorkflowState {
    const allBlocks = getAllBlocks()
    const blocks: BlockState[] = []
    const edges: Edge[] = []

    // Create blocks for each supported type
    let x = 100
    let y = 100

    allBlocks.slice(0, 10).forEach((blockDef, index) => {
      // Limit to first 10 for testing
      const blockId = `${blockDef.type}-${index}`

      blocks.push({
        id: blockId,
        type: blockDef.type,
        position: { x, y },
        data: {
          label: `Test ${blockDef.label || blockDef.type}`,
          ...TestDataGenerator.generateBlockData(blockDef.type),
        },
        width: 200,
        height: 150,
      })

      // Connect to previous block
      if (index > 0) {
        edges.push({
          id: `edge-${index}`,
          source: `${allBlocks[index - 1].type}-${index - 1}`,
          target: blockId,
          type: 'default',
        })
      }

      x += 300
      if (x > 1200) {
        x = 100
        y += 200
      }
    })

    return {
      id: 'comprehensive-block-test',
      name: 'Comprehensive Block Type Test',
      description: 'Workflow containing all supported block types',
      blocks,
      edges,
    }
  }

  private static generateBlockData(blockType: string): any {
    const commonData: Record<string, any> = {
      starter: {},
      condition: { condition: '{{test_condition}} === true' },
      agent: {
        model: 'gpt-4',
        prompt: 'Process: {{input}}',
        temperature: 0.7,
      },
      api: {
        method: 'GET',
        url: '{{api_url}}',
        headers: {},
      },
      function: {
        code: 'return { result: input.value * 2 }',
      },
      parallel: {
        blocks: ['sub-task-1', 'sub-task-2'],
      },
      router: {
        routes: [{ condition: '{{route_condition}}', target: 'route-1' }],
      },
    }

    return commonData[blockType] || {}
  }
}

// Main test suites
describe('Workflow to Journey Conversion Accuracy', () => {
  let converter: WorkflowToJourneyConverter

  beforeAll(async () => {
    logger.info('Initializing conversion accuracy test suite')
    converter = new WorkflowToJourneyConverter(TEST_CONFIG)
  })

  afterAll(async () => {
    logger.info('Cleanup conversion accuracy test suite')
  })

  beforeEach(() => {
    // Reset any state between tests
  })

  describe('Basic Conversion Accuracy', () => {
    test('should convert simple linear workflow correctly', async () => {
      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters: TestDataGenerator.generateRandomParameters(TEST_PARAMETERS),
      } as ConversionContext

      // Mock workflow retrieval
      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)

      const result = await converter.convertWorkflowToJourney(context)

      // Validate conversion result
      const validation = ConversionAccuracyValidator.validateConversion(
        SIMPLE_LINEAR_WORKFLOW,
        context.parameters,
        result
      )

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toEqual([])

      // Specific checks for simple workflow
      expect(result.journey).toBeDefined()
      expect(result.steps.length).toBeGreaterThan(0)
      expect(result.metadata.blocks_converted).toBe(SIMPLE_LINEAR_WORKFLOW.blocks.length)
      expect(result.metadata.edges_converted).toBe(SIMPLE_LINEAR_WORKFLOW.edges.length)
    })

    test('should handle complex workflow with conditions and parallels', async () => {
      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'complex-conditional-test',
        parameters: TestDataGenerator.generateRandomParameters(TEST_PARAMETERS),
      } as ConversionContext

      jest
        .spyOn(converter as any, 'getWorkflowState')
        .mockResolvedValue(COMPLEX_WORKFLOW_WITH_CONDITIONS)

      const result = await converter.convertWorkflowToJourney(context)

      const validation = ConversionAccuracyValidator.validateConversion(
        COMPLEX_WORKFLOW_WITH_CONDITIONS,
        context.parameters,
        result
      )

      expect(validation.isValid).toBe(true)
      expect(result.steps.length).toBeGreaterThan(SIMPLE_LINEAR_WORKFLOW.blocks.length)

      // Verify complex structures were converted
      const stepTypes = result.steps.map((step) => step.type)
      expect(stepTypes).toContain('condition')
      expect(stepTypes).toContain('parallel')
      expect(stepTypes).toContain('router')
    })
  })

  describe('Block Type Coverage Validation', () => {
    test('should convert all supported block types', async () => {
      const comprehensiveWorkflow = TestDataGenerator.generateWorkflowWithAllBlockTypes()
      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'comprehensive-block-test',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(comprehensiveWorkflow)

      const result = await converter.convertWorkflowToJourney(context)

      // Check that all supported blocks were converted
      const allBlocks = getAllBlocks()
      const supportedTypes = allBlocks.slice(0, 10).map((b) => b.type)
      const convertedTypes = result.steps.map((step) => step.source_block_type).filter(Boolean)

      for (const blockType of supportedTypes) {
        expect(convertedTypes).toContain(blockType)
      }
    })

    test('should report unsupported block types as warnings', async () => {
      const workflowWithUnsupported: WorkflowState = {
        ...SIMPLE_LINEAR_WORKFLOW,
        blocks: [
          ...SIMPLE_LINEAR_WORKFLOW.blocks,
          {
            id: 'unsupported-1',
            type: 'custom-unsupported-block',
            position: { x: 1000, y: 100 },
            data: { label: 'Unsupported Block' },
            width: 200,
            height: 100,
          },
        ],
      }

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'workflow-with-unsupported',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflowWithUnsupported)

      const result = await converter.convertWorkflowToJourney(context)

      // Should have warnings about unsupported blocks
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some((w) => w.type === 'unsupported_block')).toBe(true)
    })
  })

  describe('Parameter Substitution Accuracy', () => {
    test('should substitute all parameters correctly', async () => {
      const parameters = {
        user_input: 'Test user input content',
        api_endpoint: 'https://test.example.com/api',
        input_type: 'urgent',
      }

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters,
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)

      const result = await converter.convertWorkflowToJourney(context)

      // Verify parameters were substituted
      expect(result.parameters_used).toEqual(expect.arrayContaining(Object.keys(parameters)))
      expect(result.metadata.parameters_applied).toEqual(parameters)

      // Check that no template placeholders remain
      const stepContent = JSON.stringify(result.steps)
      expect(stepContent).not.toMatch(/{{[^}]+}}/g)
    })

    test('should handle missing required parameters', async () => {
      const incompleteParameters = {
        user_input: 'Test input',
        // Missing api_endpoint which is required
      }

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters: incompleteParameters,
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)

      const result = await converter.convertWorkflowToJourney(context)

      // Should have warnings about missing parameters
      expect(result.warnings.some((w) => w.type === 'parameter_missing')).toBe(true)
    })

    test('should validate parameter types and constraints', async () => {
      const invalidParameters = {
        user_input: 'Valid input',
        api_endpoint: 'invalid-url', // Should fail URL validation
        input_type: 'invalid-priority', // Should fail allowed values validation
      }

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters: invalidParameters,
        template_version: '1.0',
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)
      jest
        .spyOn(converter as any, 'validateParameters')
        .mockImplementation(async (params, version) => {
          if (params.api_endpoint && !params.api_endpoint.match(/^https?:\/\//)) {
            throw new Error('Invalid URL format for api_endpoint')
          }
        })

      await expect(converter.convertWorkflowToJourney(context)).rejects.toThrow(
        'Invalid URL format'
      )
    })
  })

  describe('Edge Case Handling', () => {
    test('should handle empty workflows', async () => {
      const emptyWorkflow: WorkflowState = {
        id: 'empty-test',
        name: 'Empty Workflow',
        description: 'Workflow with no blocks',
        blocks: [],
        edges: [],
      }

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'empty-test',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(emptyWorkflow)

      const result = await converter.convertWorkflowToJourney(context)

      expect(result.journey).toBeDefined()
      expect(result.steps).toEqual([])
      expect(result.metadata.blocks_converted).toBe(0)
    })

    test('should handle circular workflows', async () => {
      const circularWorkflow: WorkflowState = {
        id: 'circular-test',
        name: 'Circular Workflow',
        description: 'Workflow with circular dependencies',
        blocks: [
          {
            id: 'block-1',
            type: 'agent',
            position: { x: 100, y: 100 },
            data: { label: 'Block 1', model: 'gpt-4', prompt: 'Step 1' },
            width: 200,
            height: 100,
          },
          {
            id: 'block-2',
            type: 'agent',
            position: { x: 400, y: 100 },
            data: { label: 'Block 2', model: 'gpt-4', prompt: 'Step 2' },
            width: 200,
            height: 100,
          },
        ],
        edges: [
          { id: 'edge-1', source: 'block-1', target: 'block-2', type: 'default' },
          { id: 'edge-2', source: 'block-2', target: 'block-1', type: 'default' },
        ],
      }

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'circular-test',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(circularWorkflow)

      const result = await converter.convertWorkflowToJourney(context)

      // Should either handle gracefully or report appropriate warnings
      expect(result).toBeDefined()
      // Could have warnings about circular dependencies
    })

    test('should handle workflows with disconnected blocks', async () => {
      const disconnectedWorkflow: WorkflowState = {
        id: 'disconnected-test',
        name: 'Disconnected Workflow',
        description: 'Workflow with isolated blocks',
        blocks: [
          {
            id: 'connected-1',
            type: 'starter',
            position: { x: 100, y: 100 },
            data: { label: 'Connected Start' },
            width: 200,
            height: 100,
          },
          {
            id: 'connected-2',
            type: 'agent',
            position: { x: 400, y: 100 },
            data: { label: 'Connected Agent', model: 'gpt-4', prompt: 'Process' },
            width: 200,
            height: 100,
          },
          {
            id: 'isolated-1',
            type: 'api',
            position: { x: 100, y: 300 },
            data: { label: 'Isolated API', method: 'GET', url: '/test' },
            width: 200,
            height: 100,
          },
        ],
        edges: [
          { id: 'edge-1', source: 'connected-1', target: 'connected-2', type: 'default' },
          // Note: isolated-1 has no connections
        ],
      }

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'disconnected-test',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(disconnectedWorkflow)

      const result = await converter.convertWorkflowToJourney(context)

      expect(result).toBeDefined()
      // Should handle disconnected blocks appropriately
      // Could create separate journey branches or report warnings
    })
  })

  describe('Data Integrity Validation', () => {
    test('should preserve all workflow metadata', async () => {
      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters: TestDataGenerator.generateRandomParameters(TEST_PARAMETERS),
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)

      const result = await converter.convertWorkflowToJourney(context)

      // Verify metadata preservation
      expect(result.metadata.source_workflow_id).toBe(context.workflow_id)
      expect(result.metadata.conversion_timestamp).toBeDefined()
      expect(result.metadata.conversion_duration_ms).toBeGreaterThan(0)
      expect(result.metadata.blocks_converted).toBe(SIMPLE_LINEAR_WORKFLOW.blocks.length)
      expect(result.metadata.edges_converted).toBe(SIMPLE_LINEAR_WORKFLOW.edges.length)
    })

    test('should maintain referential integrity between blocks and steps', async () => {
      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)

      const result = await converter.convertWorkflowToJourney(context)

      // Verify that each step references a valid source block
      for (const step of result.steps) {
        if (step.source_block_id) {
          const sourceBlock = SIMPLE_LINEAR_WORKFLOW.blocks.find(
            (b) => b.id === step.source_block_id
          )
          expect(sourceBlock).toBeDefined()
          expect(step.source_block_type).toBe(sourceBlock!.type)
        }
      }
    })

    test('should generate unique IDs for journey and steps', async () => {
      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)

      const result1 = await converter.convertWorkflowToJourney(context)
      const result2 = await converter.convertWorkflowToJourney(context)

      // Journey IDs should be unique across conversions
      expect(result1.journey.id).not.toBe(result2.journey.id)

      // Step IDs should be unique within each conversion
      const stepIds1 = result1.steps.map((s) => s.id)
      const stepIds2 = result2.steps.map((s) => s.id)

      expect(new Set(stepIds1).size).toBe(stepIds1.length)
      expect(new Set(stepIds2).size).toBe(stepIds2.length)
    })
  })

  describe('Performance Validation', () => {
    test('should complete conversion within acceptable time limits', async () => {
      const startTime = Date.now()

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'simple-linear-test',
        parameters: TestDataGenerator.generateRandomParameters(TEST_PARAMETERS),
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(SIMPLE_LINEAR_WORKFLOW)

      const result = await converter.convertWorkflowToJourney(context)

      const conversionTime = Date.now() - startTime

      // Conversion should complete within 5 seconds for simple workflows
      expect(conversionTime).toBeLessThan(5000)
      expect(result.metadata.conversion_duration_ms).toBeLessThan(5000)
    })

    test('should handle large workflows efficiently', async () => {
      const largeWorkflow = TestDataGenerator.generateWorkflowWithAllBlockTypes()

      const context: ConversionContext = {
        ...TEST_CONTEXT_BASE,
        workflow_id: 'large-workflow-test',
        parameters: {},
      } as ConversionContext

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(largeWorkflow)

      const startTime = Date.now()
      const result = await converter.convertWorkflowToJourney(context)
      const conversionTime = Date.now() - startTime

      // Large workflows should still complete within reasonable time
      expect(conversionTime).toBeLessThan(10000)
      expect(result.steps.length).toBeGreaterThan(5)
    })
  })
})

// Export test utilities for use in other test files
export {
  ConversionAccuracyValidator,
  TestDataGenerator,
  TEST_CONFIG,
  SIMPLE_LINEAR_WORKFLOW,
  COMPLEX_WORKFLOW_WITH_CONDITIONS,
  TEST_PARAMETERS,
}
