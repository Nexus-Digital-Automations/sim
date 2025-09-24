/**
 * Comprehensive Workflow Block Validation Tests
 * =============================================
 *
 * This test suite validates all workflow block types and their conversion
 * to Parlant journey steps, ensuring each block type is properly handled
 * with appropriate error cases and edge conditions.
 *
 * Test Coverage:
 * - All supported block types
 * - Block configuration validation
 * - Edge case handling per block type
 * - Block-specific parameter substitution
 * - Complex block configurations
 * - Integration between different block types
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createLogger } from '@/lib/logs/console/logger'
import { getAllBlocks } from '@/blocks'
import { WorkflowToJourneyConverter } from '@/services/parlant/journey-conversion/conversion-engine'
import type {
  BlockState,
  ConversionConfig,
  ConversionContext,
  JourneyConversionResult,
  WorkflowState,
} from '@/services/parlant/journey-conversion/types'

const logger = createLogger('BlockValidationTests')

// Test configuration
const BLOCK_TEST_CONFIG: ConversionConfig = {
  preserve_block_names: true,
  generate_descriptions: true,
  enable_parameter_substitution: true,
  include_error_handling: true,
  optimization_level: 'standard',
  cache_duration_ms: 0, // Disable caching for tests
}

// Block-specific test data generators
class BlockTestDataGenerator {
  static generateBlockTestData(blockType: string): any {
    const testDataMap: Record<string, any> = {
      // Core workflow blocks
      starter: {
        label: 'Test Starter',
        description: 'Starting point for test workflow',
      },

      condition: {
        label: 'Test Condition',
        condition: '{{test_value}} > 0',
        description: 'Conditional branch logic',
      },

      parallel: {
        label: 'Test Parallel',
        blocks: ['parallel-task-1', 'parallel-task-2'],
        wait_for_all: true,
        timeout: 30000,
      },

      router: {
        label: 'Test Router',
        routes: [
          { condition: '{{route_type}} === "a"', target: 'route-a-target' },
          { condition: '{{route_type}} === "b"', target: 'route-b-target' },
          { condition: 'true', target: 'default-route-target' },
        ],
        default_route: 'default-route-target',
      },

      // Agent and AI blocks
      agent: {
        label: 'Test Agent',
        model: 'gpt-4',
        prompt: 'Process the following input: {{user_input}}',
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: 'You are a helpful assistant for testing purposes.',
      },

      function: {
        label: 'Test Function',
        code: `
          function processData(input) {
            const result = {
              processed: true,
              original: input,
              timestamp: new Date().toISOString(),
              doubled: input.value ? input.value * 2 : 0
            };
            return result;
          }
          return processData(input);
        `,
      },

      evaluator: {
        label: 'Test Evaluator',
        expression: '{{input_value}} * {{multiplier}} + {{offset}}',
        variables: {
          multiplier: 2,
          offset: 10,
        },
      },

      // API and external service blocks
      api: {
        label: 'Test API Call',
        method: 'POST',
        url: '{{api_endpoint}}/test',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{api_token}}',
        },
        body: JSON.stringify({
          action: 'test',
          data: '{{request_data}}',
          timestamp: '{{current_time}}',
        }),
        timeout: 10000,
        retry_count: 3,
      },

      webhook: {
        label: 'Test Webhook',
        url: '{{webhook_url}}',
        method: 'POST',
        headers: {
          'X-Webhook-Source': 'sim-workflow-test',
        },
        payload: JSON.stringify({
          event: 'test_event',
          data: '{{webhook_data}}',
        }),
      },

      // Database blocks
      postgresql: {
        label: 'Test PostgreSQL Query',
        query: 'SELECT * FROM test_table WHERE id = {{record_id}}',
        connection_string: '{{postgres_connection}}',
        timeout: 5000,
      },

      mysql: {
        label: 'Test MySQL Query',
        query: 'UPDATE users SET last_active = NOW() WHERE user_id = {{user_id}}',
        connection: {
          host: '{{mysql_host}}',
          user: '{{mysql_user}}',
          password: '{{mysql_password}}',
          database: '{{mysql_database}}',
        },
      },

      mongodb: {
        label: 'Test MongoDB Operation',
        operation: 'findOne',
        collection: 'test_collection',
        filter: JSON.stringify({ _id: '{{document_id}}' }),
        connection_string: '{{mongodb_connection}}',
      },

      // Communication blocks
      gmail: {
        label: 'Test Gmail Send',
        to: '{{recipient_email}}',
        subject: 'Test Email from Workflow: {{subject_suffix}}',
        body: 'This is a test email generated by workflow automation.\n\nData: {{email_data}}',
        from: '{{sender_email}}',
      },

      slack: {
        label: 'Test Slack Message',
        channel: '{{slack_channel}}',
        message: 'Workflow notification: {{notification_message}}',
        webhook_url: '{{slack_webhook_url}}',
      },

      discord: {
        label: 'Test Discord Message',
        webhook_url: '{{discord_webhook_url}}',
        content: 'Workflow update: {{discord_message}}',
        embeds: [
          {
            title: 'Workflow Status',
            description: '{{status_description}}',
            color: 3447003,
          },
        ],
      },

      sms: {
        label: 'Test SMS',
        to: '{{phone_number}}',
        message: 'Workflow alert: {{sms_message}}',
        from: '{{sms_from_number}}',
      },

      // File and storage blocks
      google_drive: {
        label: 'Test Google Drive Upload',
        action: 'upload',
        file_path: '{{file_path}}',
        folder_id: '{{drive_folder_id}}',
        file_name: '{{uploaded_file_name}}',
      },

      s3: {
        label: 'Test S3 Upload',
        bucket: '{{s3_bucket}}',
        key: '{{s3_key}}',
        file_content: '{{file_content}}',
        region: 'us-east-1',
      },

      // External service blocks
      github: {
        label: 'Test GitHub Issue',
        action: 'create_issue',
        repo: '{{github_repo}}',
        title: 'Automated Issue: {{issue_title}}',
        body: 'Issue created by workflow.\n\nDetails: {{issue_details}}',
        token: '{{github_token}}',
      },

      jira: {
        label: 'Test Jira Ticket',
        action: 'create_issue',
        project_key: '{{jira_project}}',
        issue_type: 'Task',
        summary: 'Workflow Task: {{task_summary}}',
        description: '{{task_description}}',
        assignee: '{{assignee_email}}',
      },

      // Knowledge and search blocks
      knowledge: {
        label: 'Test Knowledge Search',
        knowledge_base_id: '{{kb_id}}',
        query: '{{search_query}}',
        max_results: 5,
        similarity_threshold: 0.7,
      },

      // Specialized blocks
      schedule: {
        label: 'Test Schedule',
        cron: '0 9 * * 1', // Every Monday at 9 AM
        timezone: 'America/New_York',
        enabled: true,
      },

      memory: {
        label: 'Test Memory Store',
        action: 'store',
        key: '{{memory_key}}',
        value: '{{memory_value}}',
        ttl: 3600,
      },
    }

    return (
      testDataMap[blockType] || {
        label: `Test ${blockType}`,
        description: `Test configuration for ${blockType} block`,
      }
    )
  }

  static generateParametersForBlock(blockType: string): Record<string, any> {
    const parameterMap: Record<string, Record<string, any>> = {
      condition: {
        test_value: 42,
      },

      parallel: {
        'parallel-task-1': 'Task 1 data',
        'parallel-task-2': 'Task 2 data',
      },

      router: {
        route_type: 'a',
      },

      agent: {
        user_input: 'Test input for AI processing',
        system_context: 'Testing environment',
      },

      evaluator: {
        input_value: 10,
        multiplier: 3,
        offset: 5,
      },

      api: {
        api_endpoint: 'https://api.test.example.com',
        api_token: 'test-token-123',
        request_data: { test: true, value: 'sample' },
        current_time: new Date().toISOString(),
      },

      webhook: {
        webhook_url: 'https://webhook.test.example.com/receive',
        webhook_data: { event: 'test', source: 'workflow' },
      },

      postgresql: {
        record_id: 123,
        postgres_connection: 'postgresql://test:test@localhost:5432/testdb',
      },

      mysql: {
        user_id: 456,
        mysql_host: 'localhost',
        mysql_user: 'test',
        mysql_password: 'testpass',
        mysql_database: 'testdb',
      },

      mongodb: {
        document_id: '507f1f77bcf86cd799439011',
        mongodb_connection: 'mongodb://localhost:27017/testdb',
      },

      gmail: {
        recipient_email: 'test@example.com',
        subject_suffix: 'Automated Test',
        email_data: 'Test data payload',
        sender_email: 'workflow@example.com',
      },

      slack: {
        slack_channel: '#testing',
        notification_message: 'Test workflow completed successfully',
        slack_webhook_url: 'https://hooks.slack.com/test-webhook',
      },

      discord: {
        discord_webhook_url: 'https://discord.com/api/webhooks/test',
        discord_message: 'Workflow test notification',
        status_description: 'All tests passing',
      },

      sms: {
        phone_number: '+1234567890',
        sms_message: 'Test workflow alert',
        sms_from_number: '+0987654321',
      },

      google_drive: {
        file_path: '/tmp/test-file.txt',
        drive_folder_id: '1AbCdEfGhIjKlMnOpQrStUv',
        uploaded_file_name: 'workflow-test-file.txt',
      },

      s3: {
        s3_bucket: 'test-workflow-bucket',
        s3_key: 'tests/workflow-output.json',
        file_content: JSON.stringify({ test: true, timestamp: Date.now() }),
      },

      github: {
        github_repo: 'testuser/test-repo',
        issue_title: 'Automated workflow issue',
        issue_details: 'Issue created during workflow testing',
        github_token: 'ghp_test_token_123',
      },

      jira: {
        jira_project: 'TEST',
        task_summary: 'Workflow generated task',
        task_description: 'Task created by automated workflow',
        assignee_email: 'assignee@example.com',
      },

      knowledge: {
        kb_id: 'kb_test_123',
        search_query: 'test documentation workflow',
      },

      memory: {
        memory_key: 'workflow_test_key',
        memory_value: 'Test workflow value',
      },
    }

    return parameterMap[blockType] || {}
  }

  static createWorkflowForBlock(blockType: string): WorkflowState {
    const blockData = BlockTestDataGenerator.generateBlockTestData(blockType)
    const parameters = BlockTestDataGenerator.generateParametersForBlock(blockType)

    const testBlock: BlockState = {
      id: `test-${blockType}-1`,
      type: blockType,
      position: { x: 200, y: 200 },
      data: blockData,
      width: 250,
      height: 150,
    }

    // Add starter block for non-starter blocks
    const blocks: BlockState[] = []
    const edges = []

    if (blockType !== 'starter') {
      blocks.push({
        id: 'starter-1',
        type: 'starter',
        position: { x: 50, y: 200 },
        data: { label: 'Start' },
        width: 150,
        height: 100,
      })

      edges.push({
        id: 'edge-to-test-block',
        source: 'starter-1',
        target: testBlock.id,
        type: 'default',
      })
    }

    blocks.push(testBlock)

    return {
      id: `test-workflow-${blockType}`,
      name: `Test Workflow for ${blockType}`,
      description: `Isolated test workflow for validating ${blockType} block conversion`,
      blocks,
      edges,
    }
  }
}

// Block-specific validation utilities
class BlockValidationUtils {
  static validateBlockConversion(
    originalBlock: BlockState,
    conversionResult: JourneyConversionResult,
    expectedParameters?: Record<string, any>
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Find corresponding journey step
    const correspondingStep = conversionResult.steps.find(
      (step) => step.source_block_id === originalBlock.id
    )

    if (!correspondingStep) {
      errors.push(`No journey step found for block ${originalBlock.id} (${originalBlock.type})`)
      return { isValid: false, errors, warnings }
    }

    // Validate step structure
    if (!correspondingStep.id) {
      errors.push(`Journey step missing ID for block ${originalBlock.id}`)
    }

    if (!correspondingStep.title) {
      errors.push(`Journey step missing title for block ${originalBlock.id}`)
    }

    if (!correspondingStep.type) {
      errors.push(`Journey step missing type for block ${originalBlock.id}`)
    }

    // Validate block-specific conversion
    switch (originalBlock.type) {
      case 'agent':
        BlockValidationUtils.validateAgentBlockConversion(
          originalBlock,
          correspondingStep,
          errors,
          warnings
        )
        break
      case 'api':
        BlockValidationUtils.validateApiBlockConversion(
          originalBlock,
          correspondingStep,
          errors,
          warnings
        )
        break
      case 'condition':
        BlockValidationUtils.validateConditionBlockConversion(
          originalBlock,
          correspondingStep,
          errors,
          warnings
        )
        break
      case 'parallel':
        BlockValidationUtils.validateParallelBlockConversion(
          originalBlock,
          correspondingStep,
          errors,
          warnings
        )
        break
      case 'router':
        BlockValidationUtils.validateRouterBlockConversion(
          originalBlock,
          correspondingStep,
          errors,
          warnings
        )
        break
      // Add more block-specific validations as needed
    }

    // Validate parameter substitution if parameters were provided
    if (expectedParameters) {
      BlockValidationUtils.validateParameterSubstitution(
        originalBlock,
        correspondingStep,
        expectedParameters,
        errors,
        warnings
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  private static validateAgentBlockConversion(
    block: BlockState,
    step: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (block.data.model && !step.configuration?.model) {
      errors.push(`Agent model not preserved in conversion: ${block.data.model}`)
    }

    if (block.data.prompt && !step.configuration?.prompt) {
      errors.push(`Agent prompt not preserved in conversion`)
    }

    if (block.data.temperature !== undefined && step.configuration?.temperature === undefined) {
      warnings.push(`Agent temperature parameter not preserved`)
    }
  }

  private static validateApiBlockConversion(
    block: BlockState,
    step: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (block.data.method && step.configuration?.method !== block.data.method) {
      errors.push(
        `API method not preserved: expected ${block.data.method}, got ${step.configuration?.method}`
      )
    }

    if (block.data.url && !step.configuration?.url) {
      errors.push(`API URL not preserved in conversion`)
    }

    if (block.data.headers && !step.configuration?.headers) {
      warnings.push(`API headers not preserved in conversion`)
    }
  }

  private static validateConditionBlockConversion(
    block: BlockState,
    step: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (block.data.condition && !step.configuration?.condition) {
      errors.push(`Condition logic not preserved in conversion`)
    }

    // Validate that the step type indicates conditional logic
    if (!step.type.includes('condition') && !step.type.includes('branch')) {
      warnings.push(`Step type '${step.type}' may not properly represent conditional logic`)
    }
  }

  private static validateParallelBlockConversion(
    block: BlockState,
    step: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (
      block.data.blocks &&
      (!step.configuration?.parallel_tasks || step.configuration.parallel_tasks.length === 0)
    ) {
      errors.push(`Parallel blocks not preserved in conversion`)
    }

    if (block.data.wait_for_all !== undefined && step.configuration?.wait_for_all === undefined) {
      warnings.push(`Parallel wait_for_all setting not preserved`)
    }
  }

  private static validateRouterBlockConversion(
    block: BlockState,
    step: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (
      block.data.routes &&
      (!step.configuration?.routes || step.configuration.routes.length === 0)
    ) {
      errors.push(`Router routes not preserved in conversion`)
    }

    if (block.data.default_route && !step.configuration?.default_route) {
      warnings.push(`Router default route not preserved`)
    }
  }

  private static validateParameterSubstitution(
    block: BlockState,
    step: any,
    parameters: Record<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    const stepJson = JSON.stringify(step)

    // Check that template placeholders were substituted
    const templateRegex = /{{([^}]+)}}/g
    const remainingTemplates = stepJson.match(templateRegex) || []

    for (const template of remainingTemplates) {
      const paramName = template.replace(/[{}]/g, '').trim()
      if (parameters[paramName] !== undefined) {
        errors.push(
          `Parameter template '${template}' was not substituted in step for block ${block.id}`
        )
      } else {
        warnings.push(`Unresolved parameter template '${template}' in step for block ${block.id}`)
      }
    }
  }
}

// Main test suites
describe('Workflow Block Validation Tests', () => {
  let converter: WorkflowToJourneyConverter
  let allBlockTypes: string[]

  beforeAll(async () => {
    logger.info('Initializing block validation test suite')
    converter = new WorkflowToJourneyConverter(BLOCK_TEST_CONFIG)

    // Get all available block types
    const allBlocks = getAllBlocks()
    allBlockTypes = allBlocks.map((block) => block.type)
    logger.info(`Found ${allBlockTypes.length} block types to test:`, allBlockTypes)
  })

  afterAll(async () => {
    logger.info('Cleanup block validation test suite')
  })

  beforeEach(() => {
    // Reset any state between tests
  })

  describe('Individual Block Type Conversion', () => {
    // Dynamically generate tests for each block type
    allBlockTypes.forEach((blockType) => {
      test(`should convert ${blockType} block correctly`, async () => {
        const workflow = BlockTestDataGenerator.createWorkflowForBlock(blockType)
        const parameters = BlockTestDataGenerator.generateParametersForBlock(blockType)

        const context: ConversionContext = {
          workflow_id: workflow.id,
          workspace_id: 'test-workspace',
          user_id: 'test-user',
          parameters,
          config: BLOCK_TEST_CONFIG,
        }

        // Mock workflow retrieval
        jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

        const result = await converter.convertWorkflowToJourney(context)

        // Find the test block (skip starter if present)
        const testBlock = workflow.blocks.find((b) => b.type === blockType)!

        const validation = BlockValidationUtils.validateBlockConversion(
          testBlock,
          result,
          parameters
        )

        if (!validation.isValid) {
          logger.error(`Block validation failed for ${blockType}:`, validation.errors)
        }

        expect(validation.isValid).toBe(true)
        expect(validation.errors).toEqual([])

        // Log warnings for review
        if (validation.warnings.length > 0) {
          logger.warn(`Warnings for ${blockType} conversion:`, validation.warnings)
        }
      })
    })
  })

  describe('Block Configuration Edge Cases', () => {
    test('should handle blocks with missing required configuration', async () => {
      // Test agent block without model
      const incompleteAgentBlock: BlockState = {
        id: 'incomplete-agent',
        type: 'agent',
        position: { x: 200, y: 200 },
        data: {
          label: 'Incomplete Agent',
          prompt: 'Test prompt',
          // Missing required 'model' field
        },
        width: 200,
        height: 150,
      }

      const workflow: WorkflowState = {
        id: 'test-incomplete-agent',
        name: 'Test Incomplete Agent',
        description: 'Test workflow with incomplete agent configuration',
        blocks: [incompleteAgentBlock],
        edges: [],
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters: {},
        config: BLOCK_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const result = await converter.convertWorkflowToJourney(context)

      // Should generate warnings or handle gracefully
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    test('should handle blocks with invalid configuration types', async () => {
      const invalidApiBlock: BlockState = {
        id: 'invalid-api',
        type: 'api',
        position: { x: 200, y: 200 },
        data: {
          label: 'Invalid API',
          method: 'INVALID_METHOD', // Invalid HTTP method
          url: 'not-a-valid-url', // Invalid URL format
          timeout: 'not-a-number', // Invalid timeout type
        },
        width: 200,
        height: 150,
      }

      const workflow: WorkflowState = {
        id: 'test-invalid-api',
        name: 'Test Invalid API',
        description: 'Test workflow with invalid API configuration',
        blocks: [invalidApiBlock],
        edges: [],
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters: {},
        config: BLOCK_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const result = await converter.convertWorkflowToJourney(context)

      // Should handle invalid configuration gracefully
      expect(result.warnings.some((w) => w.type === 'validation_failed')).toBe(true)
    })

    test('should handle blocks with circular parameter references', async () => {
      const circularRefBlock: BlockState = {
        id: 'circular-ref-block',
        type: 'evaluator',
        position: { x: 200, y: 200 },
        data: {
          label: 'Circular Reference Test',
          expression: '{{param_a}} + {{param_b}}',
          variables: {
            param_a: '{{param_b}}',
            param_b: '{{param_a}}',
          },
        },
        width: 200,
        height: 150,
      }

      const workflow: WorkflowState = {
        id: 'test-circular-ref',
        name: 'Test Circular References',
        description: 'Test workflow with circular parameter references',
        blocks: [circularRefBlock],
        edges: [],
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters: {
          param_a: '10',
          param_b: '20',
        },
        config: BLOCK_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      // Should either handle gracefully or detect circular references
      await expect(converter.convertWorkflowToJourney(context)).resolves.toBeDefined()
    })
  })

  describe('Block Type Combinations', () => {
    test('should handle workflow with all major block types', async () => {
      const majorBlockTypes = ['starter', 'agent', 'condition', 'api', 'parallel', 'router']
      const blocks: BlockState[] = []
      const edges = []

      let x = 100
      const y = 200

      majorBlockTypes.forEach((blockType, index) => {
        const blockData = BlockTestDataGenerator.generateBlockTestData(blockType)
        const block: BlockState = {
          id: `${blockType}-${index}`,
          type: blockType,
          position: { x, y },
          data: blockData,
          width: 200,
          height: 150,
        }

        blocks.push(block)

        // Connect to previous block
        if (index > 0) {
          edges.push({
            id: `edge-${index}`,
            source: `${majorBlockTypes[index - 1]}-${index - 1}`,
            target: block.id,
            type: 'default',
          })
        }

        x += 250
      })

      const workflow: WorkflowState = {
        id: 'test-major-block-types',
        name: 'Test Major Block Types',
        description: 'Test workflow with all major block types',
        blocks,
        edges,
      }

      const parameters = {
        test_value: 42,
        route_type: 'a',
        user_input: 'Test input for comprehensive workflow',
        api_endpoint: 'https://api.test.example.com',
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters,
        config: BLOCK_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const result = await converter.convertWorkflowToJourney(context)

      // Validate that all blocks were converted
      expect(result.steps.length).toBe(blocks.length)

      // Validate that each major block type has a corresponding step
      const stepTypes = result.steps.map((step) => step.source_block_type)
      majorBlockTypes.forEach((blockType) => {
        expect(stepTypes).toContain(blockType)
      })
    })

    test('should handle complex nested parallel and conditional blocks', async () => {
      const nestedWorkflow: WorkflowState = {
        id: 'test-nested-complex',
        name: 'Test Nested Complex Workflow',
        description: 'Complex workflow with nested parallel and conditional structures',
        blocks: [
          {
            id: 'start-1',
            type: 'starter',
            position: { x: 100, y: 200 },
            data: { label: 'Start' },
            width: 150,
            height: 100,
          },
          {
            id: 'condition-outer',
            type: 'condition',
            position: { x: 300, y: 200 },
            data: {
              label: 'Outer Condition',
              condition: '{{process_type}} === "complex"',
            },
            width: 200,
            height: 120,
          },
          {
            id: 'parallel-nested',
            type: 'parallel',
            position: { x: 550, y: 150 },
            data: {
              label: 'Nested Parallel Processing',
              blocks: ['condition-inner-1', 'condition-inner-2'],
              wait_for_all: true,
            },
            width: 250,
            height: 150,
          },
          {
            id: 'condition-inner-1',
            type: 'condition',
            position: { x: 850, y: 100 },
            data: {
              label: 'Inner Condition 1',
              condition: '{{data_source}} === "primary"',
            },
            width: 200,
            height: 120,
          },
          {
            id: 'condition-inner-2',
            type: 'condition',
            position: { x: 850, y: 250 },
            data: {
              label: 'Inner Condition 2',
              condition: '{{validation_passed}} === true',
            },
            width: 200,
            height: 120,
          },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'condition-outer', type: 'default' },
          {
            id: 'e2',
            source: 'condition-outer',
            target: 'parallel-nested',
            type: 'conditional',
            data: { condition: 'true' },
          },
        ],
      }

      const context: ConversionContext = {
        workflow_id: nestedWorkflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters: {
          process_type: 'complex',
          data_source: 'primary',
          validation_passed: true,
        },
        config: BLOCK_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(nestedWorkflow)

      const result = await converter.convertWorkflowToJourney(context)

      expect(result.steps.length).toBeGreaterThan(0)
      expect(result.warnings.length).toBeLessThan(5) // Should handle complex nesting reasonably well
    })
  })

  describe('Block Error Handling', () => {
    test('should handle blocks that throw conversion errors', async () => {
      // Create a block configuration that would cause conversion issues
      const problematicBlock: BlockState = {
        id: 'problematic-block',
        type: 'function',
        position: { x: 200, y: 200 },
        data: {
          label: 'Problematic Function',
          code: 'invalid javascript syntax { missing parenthesis',
        },
        width: 200,
        height: 150,
      }

      const workflow: WorkflowState = {
        id: 'test-problematic',
        name: 'Test Problematic Block',
        description: 'Test workflow with problematic block configuration',
        blocks: [problematicBlock],
        edges: [],
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters: {},
        config: BLOCK_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      // Should not throw but should handle errors gracefully
      const result = await converter.convertWorkflowToJourney(context)

      expect(result).toBeDefined()
      // Should have warnings or errors about the problematic block
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    test('should handle unsupported block types gracefully', async () => {
      const unsupportedBlock: BlockState = {
        id: 'unsupported-block',
        type: 'future-block-type-not-yet-implemented',
        position: { x: 200, y: 200 },
        data: {
          label: 'Unsupported Block',
          config: 'some configuration',
        },
        width: 200,
        height: 150,
      }

      const workflow: WorkflowState = {
        id: 'test-unsupported',
        name: 'Test Unsupported Block',
        description: 'Test workflow with unsupported block type',
        blocks: [unsupportedBlock],
        edges: [],
      }

      const context: ConversionContext = {
        workflow_id: workflow.id,
        workspace_id: 'test-workspace',
        user_id: 'test-user',
        parameters: {},
        config: BLOCK_TEST_CONFIG,
      }

      jest.spyOn(converter as any, 'getWorkflowState').mockResolvedValue(workflow)

      const result = await converter.convertWorkflowToJourney(context)

      expect(result).toBeDefined()
      expect(result.warnings.some((w) => w.type === 'unsupported_block')).toBe(true)
    })
  })
})

// Export utilities for use in other test files
export { BlockTestDataGenerator, BlockValidationUtils, BLOCK_TEST_CONFIG }
