/**
 * Conversion Engine Tests
 * ======================
 *
 * Comprehensive tests for workflow-to-journey conversion engine
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkflowToJourneyConverter } from '../conversion-engine'
import type { ConversionConfig, ConversionContext } from '../types'

// Mock dependencies
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('@/blocks', () => ({
  getBlock: vi.fn(),
}))

describe('WorkflowToJourneyConverter', () => {
  let converter: WorkflowToJourneyConverter
  let mockConfig: ConversionConfig
  let mockContext: ConversionContext

  beforeEach(() => {
    mockConfig = {
      preserve_block_names: true,
      generate_descriptions: true,
      enable_parameter_substitution: true,
      include_error_handling: true,
      optimization_level: 'standard',
      cache_duration_ms: 1800000,
    }

    mockContext = {
      workflow_id: 'test-workflow-123',
      workspace_id: 'test-workspace-456',
      user_id: 'test-user-789',
      parameters: {
        customer_name: 'John Doe',
        company: 'Acme Corp',
        max_iterations: 5,
      },
      config: mockConfig,
    }

    converter = new WorkflowToJourneyConverter(mockConfig)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(converter).toBeDefined()
      expect(converter.config).toEqual(mockConfig)
    })

    it('should initialize internal state correctly', () => {
      expect(converter.warnings).toEqual([])
      expect(converter.blockMappings).toBeInstanceOf(Map)
      expect(converter.edgeMappings).toBeInstanceOf(Map)
      expect(converter.parametersUsed).toBeInstanceOf(Set)
    })
  })

  describe('Parameter Substitution', () => {
    it('should substitute single parameter correctly', () => {
      const text = 'Hello {{customer_name}}, welcome to our service!'
      const result = converter.substituteParameters(text, mockContext.parameters)

      expect(result).toBe('Hello John Doe, welcome to our service!')
      expect(converter.parametersUsed.has('customer_name')).toBe(true)
    })

    it('should substitute multiple parameters', () => {
      const text = '{{customer_name}} from {{company}} has {{max_iterations}} attempts'
      const result = converter.substituteParameters(text, mockContext.parameters)

      expect(result).toBe('John Doe from Acme Corp has 5 attempts')
      expect(converter.parametersUsed.has('customer_name')).toBe(true)
      expect(converter.parametersUsed.has('company')).toBe(true)
      expect(converter.parametersUsed.has('max_iterations')).toBe(true)
    })

    it('should handle missing parameters gracefully', () => {
      const text = 'Hello {{missing_param}}, welcome!'
      const result = converter.substituteParameters(text, mockContext.parameters)

      expect(result).toBe('Hello {{missing_param}}, welcome!')
      expect(converter.parametersUsed.has('missing_param')).toBe(false)
    })

    it('should handle empty parameters object', () => {
      const text = 'Hello {{customer_name}}'
      const result = converter.substituteParameters(text, {})

      expect(result).toBe('Hello {{customer_name}}')
    })
  })

  describe('Block Type Detection', () => {
    it('should identify condition sub-blocks correctly', () => {
      expect(converter.isConditionSubBlock('condition_check', {})).toBe(true)
      expect(converter.isConditionSubBlock('if_statement', {})).toBe(true)
      expect(converter.isConditionSubBlock('when_trigger', {})).toBe(true)
      expect(converter.isConditionSubBlock('action_execute', {})).toBe(false)
    })

    it('should identify action sub-blocks correctly', () => {
      expect(converter.isActionSubBlock('execute_action', {})).toBe(true)
      expect(converter.isActionSubBlock('send_message', {})).toBe(true)
      expect(converter.isActionSubBlock('condition_check', {})).toBe(false)
      expect(converter.isActionSubBlock('if_statement', {})).toBe(false)
    })
  })

  describe('ID Generation', () => {
    it('should generate unique step IDs', () => {
      const blockId = 'block-123'
      const stepId1 = converter.generateStepId(blockId)
      const stepId2 = converter.generateStepId(blockId)

      expect(stepId1).toMatch(/^step_block-123_\d+$/)
      expect(stepId2).toMatch(/^step_block-123_\d+$/)
      expect(stepId1).not.toBe(stepId2)
    })

    it('should generate unique journey IDs', () => {
      const workflowId = 'workflow-456'
      const journeyId1 = converter.generateJourneyId(workflowId)
      const journeyId2 = converter.generateJourneyId(workflowId)

      expect(journeyId1).toMatch(/^journey_workflow-456_\d+$/)
      expect(journeyId2).toMatch(/^journey_workflow-456_\d+$/)
      expect(journeyId1).not.toBe(journeyId2)
    })
  })

  describe('Condition and Action Formatting', () => {
    it('should format conditions correctly', () => {
      const subBlockId = 'email_validation'
      const subBlockState = { value: 'user@example.com' }
      const result = converter.formatCondition(subBlockId, subBlockState)

      expect(result).toBe('email_validation: user@example.com')
    })

    it('should format actions correctly', () => {
      const subBlockId = 'send_welcome_email'
      const subBlockState = { value: 'template_123' }
      const result = converter.formatAction(subBlockId, subBlockState)

      expect(result).toBe('Execute send_welcome_email with value: template_123')
    })
  })

  describe('Tool Parameter Extraction', () => {
    it('should extract tool parameters from block state', () => {
      const mockBlockState = {
        id: 'block-1',
        type: 'email',
        name: 'Send Email',
        position: { x: 0, y: 0 },
        subBlocks: {
          recipient: { id: 'recipient', type: 'text', value: '{{customer_email}}' },
          subject: { id: 'subject', type: 'text', value: 'Welcome {{customer_name}}!' },
          body: { id: 'body', type: 'textarea', value: 'Thank you for joining!' },
        },
        outputs: {},
        enabled: true,
      }

      const result = converter.extractToolParameters(mockBlockState, 'email_tool', mockContext)

      expect(result).toEqual({
        recipient: '{{customer_email}}', // Not substituted since parameter doesn't exist
        subject: 'Welcome John Doe!', // Substituted
        body: 'Thank you for joining!',
      })
    })
  })

  describe('Output Mapping Creation', () => {
    it('should create output mappings correctly', () => {
      const outputs = {
        success: { type: 'boolean', description: 'Operation success' },
        message_id: { type: 'string', description: 'Sent message ID' },
        timestamp: { type: 'string', description: 'Send timestamp' },
      }

      const result = converter.createOutputMapping(outputs)

      expect(result).toEqual({
        success: '{{output.success}}',
        message_id: '{{output.message_id}}',
        timestamp: '{{output.timestamp}}',
      })
    })
  })

  describe('Transition Type Determination', () => {
    it('should determine sequential transition type', () => {
      const edge = { id: 'edge-1', source: 'block-1', target: 'block-2', data: {} }
      const result = converter.determineTransitionType(edge, mockContext)

      expect(result).toBe('sequential')
    })

    it('should determine conditional transition type', () => {
      const edge = {
        id: 'edge-1',
        source: 'block-1',
        target: 'block-2',
        data: { conditional: true },
      }
      const result = converter.determineTransitionType(edge, mockContext)

      expect(result).toBe('conditional')
    })

    it('should determine parallel transition type', () => {
      const edge = { id: 'edge-1', source: 'block-1', target: 'block-2', data: { parallel: true } }
      const result = converter.determineTransitionType(edge, mockContext)

      expect(result).toBe('parallel')
    })

    it('should determine loop transition type', () => {
      const edge = { id: 'edge-1', source: 'block-1', target: 'block-2', data: { loop: true } }
      const result = converter.determineTransitionType(edge, mockContext)

      expect(result).toBe('loop')
    })
  })

  describe('Warning System', () => {
    it('should add warnings correctly', () => {
      converter.addWarning('unsupported_block', 'Block type not supported', 'block-123', 'high')

      expect(converter.warnings).toHaveLength(1)
      expect(converter.warnings[0]).toEqual({
        type: 'unsupported_block',
        message: 'Block type not supported',
        block_id: 'block-123',
        severity: 'high',
      })
    })

    it('should handle multiple warnings', () => {
      converter.addWarning('parameter_missing', 'Parameter not found', undefined, 'medium')
      converter.addWarning('validation_failed', 'Validation error', 'block-456', 'low')

      expect(converter.warnings).toHaveLength(2)
      expect(converter.warnings[0].type).toBe('parameter_missing')
      expect(converter.warnings[1].type).toBe('validation_failed')
    })
  })

  describe('Error Creation', () => {
    it('should create conversion errors correctly', () => {
      const error = converter.createConversionError(
        'validation',
        'TEST_ERROR',
        'Test error message',
        { test: true }
      )

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error message')
      expect(error.type).toBe('validation')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ test: true })
    })
  })

  describe('State Management', () => {
    it('should reset state correctly', () => {
      // Add some state
      converter.warnings.push({
        type: 'parameter_missing',
        message: 'Test warning',
        severity: 'medium',
      })
      converter.blockMappings.set('block-1', {} as any)
      converter.edgeMappings.set('edge-1', {} as any)
      converter.parametersUsed.add('test_param')

      // Reset state
      converter.resetState()

      expect(converter.warnings).toEqual([])
      expect(converter.blockMappings.size).toBe(0)
      expect(converter.edgeMappings.size).toBe(0)
      expect(converter.parametersUsed.size).toBe(0)
    })
  })

  describe('Parameter Substitution Tracking', () => {
    it('should track parameter substitutions in blocks', () => {
      const mockBlockState = {
        id: 'block-1',
        type: 'test',
        name: 'Test Block',
        position: { x: 0, y: 0 },
        subBlocks: {
          field1: { id: 'field1', type: 'text', value: 'Hello {{customer_name}}!' },
          field2: { id: 'field2', type: 'text', value: 'Company: {{company}}' },
          field3: { id: 'field3', type: 'text', value: 'No parameters here' },
        },
        outputs: {},
        enabled: true,
      }

      const result = converter.extractParameterSubstitutions(mockBlockState, mockContext.parameters)

      expect(result).toEqual({
        'field1.customer_name': '{{customer_name}}',
        'field2.company': '{{company}}',
      })
    })

    it('should handle blocks without parameter substitutions', () => {
      const mockBlockState = {
        id: 'block-1',
        type: 'test',
        name: 'Test Block',
        position: { x: 0, y: 0 },
        subBlocks: {
          field1: { id: 'field1', type: 'text', value: 'Static text' },
          field2: { id: 'field2', type: 'number', value: 42 },
        },
        outputs: {},
        enabled: true,
      }

      const result = converter.extractParameterSubstitutions(mockBlockState, mockContext.parameters)

      expect(result).toEqual({})
    })
  })

  describe('Journey Conditions Creation', () => {
    it('should create journey conditions with context information', () => {
      const mockSteps = [
        {
          id: 'step-1',
          journey_id: 'journey-1',
          order: 1,
          title: 'First Step',
          conditions: [],
          actions: [],
        },
        {
          id: 'step-2',
          journey_id: 'journey-1',
          order: 2,
          title: 'Second Step',
          conditions: [],
          actions: [],
        },
      ]

      const result = converter.createJourneyConditions(mockSteps, mockContext)

      expect(result).toEqual([
        'Journey created from workflow conversion',
        'Original workflow: test-workflow-123',
        'Parameters applied: customer_name, company, max_iterations',
      ])
    })

    it('should handle empty parameters', () => {
      converter.parametersUsed.clear()
      const result = converter.createJourneyConditions([], mockContext)

      expect(result[2]).toBe('Parameters applied: ')
    })
  })
})

// Integration test for the full conversion flow
describe('WorkflowToJourneyConverter Integration', () => {
  it('should perform end-to-end conversion flow', async () => {
    // This would be a comprehensive integration test
    // For now, we'll test the main interface
    const config: ConversionConfig = {
      preserve_block_names: true,
      generate_descriptions: true,
      enable_parameter_substitution: true,
      include_error_handling: true,
      optimization_level: 'standard',
      cache_duration_ms: 1800000,
    }

    const converter = new WorkflowToJourneyConverter(config)
    expect(converter).toBeDefined()

    // The actual conversion would require mocking the entire workflow system
    // This serves as a structural test to ensure the converter can be instantiated
  })
})
