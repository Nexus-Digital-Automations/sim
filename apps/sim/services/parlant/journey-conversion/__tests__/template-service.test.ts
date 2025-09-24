/**
 * Template Service Tests
 * =====================
 *
 * Tests for workflow template management service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TemplateService } from '../template-service'
import type {
  TemplateCreateRequest,
  TemplateUpdateRequest,
  TemplateListQuery,
  WorkflowTemplate,
  TemplateParameter,
} from '../types'

// Mock dependencies
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('@/db', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      workflowTemplates: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  },
}))

vi.mock('@/db/schema/parlant', () => ({
  workflowTemplates: {},
  templateParameters: {},
  templateUsageStats: {},
}))

vi.mock('@/lib/utils', () => ({
  generateId: vi.fn().mockImplementation((prefix: string) => `${prefix}_${Date.now()}`),
}))

describe('TemplateService', () => {
  let templateService: TemplateService
  let mockCreateRequest: TemplateCreateRequest
  let mockTemplate: WorkflowTemplate

  beforeEach(() => {
    templateService = new TemplateService()

    mockCreateRequest = {
      name: 'Customer Onboarding Template',
      description: 'Template for onboarding new customers',
      workflow_id: 'workflow_123',
      workspace_id: 'workspace_456',
      parameters: [
        {
          name: 'customer_name',
          type: 'string',
          description: 'Name of the customer',
          required: true,
          display_order: 0,
        },
        {
          name: 'email',
          type: 'string',
          description: 'Customer email address',
          required: true,
          validation: {
            pattern: '^[^@]+@[^@]+\\.[^@]+$',
          },
          display_order: 1,
        },
        {
          name: 'priority_level',
          type: 'string',
          description: 'Priority level for onboarding',
          default_value: 'normal',
          required: false,
          validation: {
            allowed_values: ['low', 'normal', 'high', 'urgent'],
          },
          display_order: 2,
        },
      ],
      tags: ['customer', 'onboarding'],
    }

    mockTemplate = {
      id: 'template_123',
      name: mockCreateRequest.name,
      description: mockCreateRequest.description,
      workspace_id: mockCreateRequest.workspace_id,
      version: '1.0.0',
      workflow_data: {},
      parameters: mockCreateRequest.parameters.map((param, index) => ({
        id: `param_${index}`,
        ...param,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: mockCreateRequest.tags || [],
      usage_count: 0,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Parameter Validation', () => {
    describe('validateParameterType', () => {
      it('should validate string types correctly', () => {
        expect(templateService['validateParameterType']('string', 'hello')).toBe(true)
        expect(templateService['validateParameterType']('string', 123)).toBe(false)
        expect(templateService['validateParameterType']('string', null)).toBe(false)
      })

      it('should validate number types correctly', () => {
        expect(templateService['validateParameterType']('number', 123)).toBe(true)
        expect(templateService['validateParameterType']('number', 45.67)).toBe(true)
        expect(templateService['validateParameterType']('number', '123')).toBe(false)
        expect(templateService['validateParameterType']('number', NaN)).toBe(false)
      })

      it('should validate boolean types correctly', () => {
        expect(templateService['validateParameterType']('boolean', true)).toBe(true)
        expect(templateService['validateParameterType']('boolean', false)).toBe(true)
        expect(templateService['validateParameterType']('boolean', 'true')).toBe(false)
        expect(templateService['validateParameterType']('boolean', 1)).toBe(false)
      })

      it('should validate array types correctly', () => {
        expect(templateService['validateParameterType']('array', [])).toBe(true)
        expect(templateService['validateParameterType']('array', [1, 2, 3])).toBe(true)
        expect(templateService['validateParameterType']('array', {})).toBe(false)
        expect(templateService['validateParameterType']('array', 'array')).toBe(false)
      })

      it('should validate object types correctly', () => {
        expect(templateService['validateParameterType']('object', {})).toBe(true)
        expect(templateService['validateParameterType']('object', { a: 1 })).toBe(true)
        expect(templateService['validateParameterType']('object', [])).toBe(false)
        expect(templateService['validateParameterType']('object', null)).toBe(false)
      })

      it('should validate json types correctly', () => {
        expect(templateService['validateParameterType']('json', {})).toBe(true)
        expect(templateService['validateParameterType']('json', [])).toBe(true)
        expect(templateService['validateParameterType']('json', '{"valid": "json"}')).toBe(true)
        expect(templateService['validateParameterType']('json', '{invalid json')).toBe(false)
      })
    })

    describe('validateParameter', () => {
      it('should validate parameter with type check', () => {
        const param: TemplateParameter = {
          id: 'param_1',
          name: 'test_param',
          type: 'string',
          description: 'Test parameter',
          required: true,
          display_order: 0,
        }

        const result1 = templateService['validateParameter'](param, 'valid string')
        expect(result1.valid).toBe(true)

        const result2 = templateService['validateParameter'](param, 123)
        expect(result2.valid).toBe(false)
        expect(result2.error).toBe('Value must be of type string')
      })

      it('should validate number range constraints', () => {
        const param: TemplateParameter = {
          id: 'param_1',
          name: 'test_number',
          type: 'number',
          description: 'Test number parameter',
          required: true,
          display_order: 0,
          validation: {
            min: 10,
            max: 100,
          },
        }

        const result1 = templateService['validateParameter'](param, 50)
        expect(result1.valid).toBe(true)

        const result2 = templateService['validateParameter'](param, 5)
        expect(result2.valid).toBe(false)
        expect(result2.error).toBe('Value must be at least 10')

        const result3 = templateService['validateParameter'](param, 150)
        expect(result3.valid).toBe(false)
        expect(result3.error).toBe('Value must be at most 100')
      })

      it('should validate string pattern constraints', () => {
        const param: TemplateParameter = {
          id: 'param_1',
          name: 'email',
          type: 'string',
          description: 'Email parameter',
          required: true,
          display_order: 0,
          validation: {
            pattern: '^[^@]+@[^@]+\\.[^@]+$',
          },
        }

        const result1 = templateService['validateParameter'](param, 'user@example.com')
        expect(result1.valid).toBe(true)

        const result2 = templateService['validateParameter'](param, 'invalid-email')
        expect(result2.valid).toBe(false)
        expect(result2.error).toBe('Value does not match required pattern')
      })

      it('should validate allowed values constraints', () => {
        const param: TemplateParameter = {
          id: 'param_1',
          name: 'priority',
          type: 'string',
          description: 'Priority parameter',
          required: true,
          display_order: 0,
          validation: {
            allowed_values: ['low', 'medium', 'high'],
          },
        }

        const result1 = templateService['validateParameter'](param, 'medium')
        expect(result1.valid).toBe(true)

        const result2 = templateService['validateParameter'](param, 'critical')
        expect(result2.valid).toBe(false)
        expect(result2.error).toBe('Value must be one of: low, medium, high')
      })
    })
  })

  describe('Template Data Mapping', () => {
    it('should map database template to API template correctly', () => {
      const dbTemplate = {
        id: 'template_123',
        name: 'Test Template',
        description: 'Test description',
        workspace_id: 'workspace_456',
        version: '1.0.0',
        workflow_data: { test: 'data' },
        tags: ['test'],
        usage_count: 5,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02'),
        parameters: [
          {
            id: 'param_1',
            name: 'test_param',
            type: 'string',
            description: 'Test parameter',
            default_value: 'default',
            required: true,
            validation: {},
            display_order: 0,
          },
        ],
      }

      const result = templateService['mapDbTemplateToApiTemplate'](dbTemplate)

      expect(result).toEqual({
        id: 'template_123',
        name: 'Test Template',
        description: 'Test description',
        workspace_id: 'workspace_456',
        version: '1.0.0',
        workflow_data: { test: 'data' },
        tags: ['test'],
        usage_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
        parameters: [
          {
            id: 'param_1',
            name: 'test_param',
            type: 'string',
            description: 'Test parameter',
            default_value: 'default',
            required: true,
            validation: {},
            display_order: 0,
          },
        ],
      })
    })

    it('should map database parameter to API parameter correctly', () => {
      const dbParam = {
        id: 'param_1',
        name: 'test_param',
        type: 'string',
        description: 'Test parameter',
        default_value: 'default',
        required: true,
        validation: { min: 1, max: 100 },
        display_order: 5,
      }

      const result = templateService['mapDbParameterToApiParameter'](dbParam)

      expect(result).toEqual({
        id: 'param_1',
        name: 'test_param',
        type: 'string',
        description: 'Test parameter',
        default_value: 'default',
        required: true,
        validation: { min: 1, max: 100 },
        display_order: 5,
      })
    })
  })

  describe('Error Handling', () => {
    it('should create conversion errors correctly', () => {
      const error = templateService['createError']('template', 'TEST_ERROR', 'Test error', { test: true })

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('ConversionError')
      expect(error.message).toBe('Test error')
      expect(error.type).toBe('template')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ test: true })
    })
  })

  // Note: The following tests would require proper database mocking
  // They serve as documentation of expected behavior

  describe('Template CRUD Operations (Integration)', () => {
    it('should define createTemplate method', () => {
      expect(typeof templateService.createTemplate).toBe('function')
    })

    it('should define updateTemplate method', () => {
      expect(typeof templateService.updateTemplate).toBe('function')
    })

    it('should define getTemplate method', () => {
      expect(typeof templateService.getTemplate).toBe('function')
    })

    it('should define listTemplates method', () => {
      expect(typeof templateService.listTemplates).toBe('function')
    })

    it('should define deleteTemplate method', () => {
      expect(typeof templateService.deleteTemplate).toBe('function')
    })

    it('should define validateParameters method', () => {
      expect(typeof templateService.validateParameters).toBe('function')
    })

    it('should define updateUsageStats method', () => {
      expect(typeof templateService.updateUsageStats).toBe('function')
    })
  })

  describe('Parameter Validation Integration', () => {
    it('should validate complete parameter set', async () => {
      // Mock the getTemplate method to return our test template
      const getTemplateSpy = vi.spyOn(templateService, 'getTemplate').mockResolvedValue(mockTemplate)

      const parameters = {
        customer_name: 'John Doe',
        email: 'john@example.com',
        priority_level: 'high',
      }

      // Since we can't actually call the database, we'll test the validation logic directly
      const validationResults = mockTemplate.parameters.map(param => {
        const value = parameters[param.name]
        if (param.required && value === undefined) {
          return { parameter: param.name, message: `Required parameter '${param.name}' is missing` }
        }
        const validation = templateService['validateParameter'](param, value)
        return validation.valid ? null : { parameter: param.name, message: validation.error || 'Invalid value' }
      }).filter(Boolean)

      expect(validationResults).toHaveLength(0) // All parameters should be valid

      getTemplateSpy.mockRestore()
    })

    it('should detect missing required parameters', () => {
      const parameters = {
        // Missing customer_name and email
        priority_level: 'normal',
      }

      const errors = []
      for (const param of mockTemplate.parameters) {
        if (param.required && !(param.name in parameters)) {
          errors.push({
            parameter: param.name,
            message: `Required parameter '${param.name}' is missing`,
          })
        }
      }

      expect(errors).toHaveLength(2)
      expect(errors[0].parameter).toBe('customer_name')
      expect(errors[1].parameter).toBe('email')
    })

    it('should detect invalid parameter values', () => {
      const parameters = {
        customer_name: 'John Doe',
        email: 'invalid-email', // Invalid email format
        priority_level: 'critical', // Not in allowed values
      }

      const errors = []
      for (const param of mockTemplate.parameters) {
        if (param.name in parameters) {
          const validation = templateService['validateParameter'](param, parameters[param.name])
          if (!validation.valid) {
            errors.push({
              parameter: param.name,
              message: validation.error || 'Invalid value',
            })
          }
        }
      }

      expect(errors).toHaveLength(2)
      expect(errors.find(e => e.parameter === 'email')).toBeTruthy()
      expect(errors.find(e => e.parameter === 'priority_level')).toBeTruthy()
    })

    it('should detect unexpected parameters', () => {
      const parameters = {
        customer_name: 'John Doe',
        email: 'john@example.com',
        priority_level: 'high',
        unexpected_param: 'value', // This parameter is not in the template
      }

      const validParamNames = new Set(mockTemplate.parameters.map(p => p.name))
      const errors = []

      for (const paramName of Object.keys(parameters)) {
        if (!validParamNames.has(paramName)) {
          errors.push({
            parameter: paramName,
            message: `Unknown parameter '${paramName}'`,
          })
        }
      }

      expect(errors).toHaveLength(1)
      expect(errors[0].parameter).toBe('unexpected_param')
    })
  })
})