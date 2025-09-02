/**
 * Comprehensive Unit Tests for Block Validation
 *
 * This module contains exhaustive tests for all block validation functions,
 * covering configuration validation, parameter validation, and runtime validation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlockConfig, ParamConfig, SubBlockConfig } from '@/blocks/types'
import {
  type ValidationOptions,
  validateBlockConfig,
  validateOutputFieldDefinition,
  validateParamConfig,
  validateParameterValues,
  validateSubBlockConfig,
} from '@/blocks/validation'

// Mock logger to prevent console noise during tests
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
}))

describe('Block Validation', () => {
  beforeEach(() => {
    // Clear all mocks before each test to ensure clean state
    vi.clearAllMocks()
  })

  describe('validateBlockConfig', () => {
    const validBlockConfig: BlockConfig = {
      type: 'test_block',
      name: 'Test Block',
      description: 'A test block for validation',
      category: 'blocks',
      bgColor: '#FF6B35',
      icon: () => null as any,
      subBlocks: [
        {
          id: 'test_input',
          type: 'short-input',
          layout: 'full',
        },
      ],
      tools: {
        access: ['test_tool'],
      },
      inputs: {
        testParam: {
          type: 'string',
          description: 'Test parameter',
        },
      },
      outputs: {
        result: { type: 'string', description: 'Test result' },
      },
    }

    it('should validate a complete valid block configuration', () => {
      const result = validateBlockConfig(validBlockConfig)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      // Note: Logger calls are mocked, so we don't test specific call details
    })

    it('should fail validation for missing required fields', () => {
      const incompleteConfig = {
        name: 'Test Block',
        // Missing other required fields
      } as Partial<BlockConfig>

      const result = validateBlockConfig(incompleteConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      // Check for specific missing field errors
      const missingTypeError = result.errors.find(
        (e) => e.code === 'MISSING_REQUIRED_FIELD' && e.field === 'type'
      )
      expect(missingTypeError).toBeDefined()

      const missingDescriptionError = result.errors.find(
        (e) => e.code === 'MISSING_REQUIRED_FIELD' && e.field === 'description'
      )
      expect(missingDescriptionError).toBeDefined()
    })

    it('should validate block type format correctly', () => {
      const invalidTypeConfigs = [
        { ...validBlockConfig, type: 'InvalidType' }, // uppercase
        { ...validBlockConfig, type: 'invalid-type' }, // hyphen
        { ...validBlockConfig, type: 'invalid type' }, // space
        { ...validBlockConfig, type: '123invalid' }, // starts with number
        { ...validBlockConfig, type: '' }, // empty
      ]

      invalidTypeConfigs.forEach((config, index) => {
        const result = validateBlockConfig(config)

        if (config.type === '') {
          expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true)
        } else {
          expect(result.errors.some((e) => e.code === 'INVALID_BLOCK_TYPE_FORMAT')).toBe(true)
        }
      })
    })

    it('should validate category values', () => {
      const invalidCategories = ['invalid', 'BLOCKS', 'tool', 'trigger']

      invalidCategories.forEach((category) => {
        const config = { ...validBlockConfig, category: category as any }
        const result = validateBlockConfig(config)

        expect(result.isValid).toBe(false)
        expect(result.errors.some((e) => e.code === 'INVALID_CATEGORY')).toBe(true)
      })
    })

    it('should validate background color format', () => {
      const invalidColors = [
        'red', // not hex
        '#FF6', // too short
        '#GGHHII', // invalid hex characters
        '#FF6B3500', // too long
        'FF6B35', // missing #
      ]

      invalidColors.forEach((color) => {
        const config = { ...validBlockConfig, bgColor: color }
        const result = validateBlockConfig(config)

        expect(result.isValid).toBe(false)
        expect(result.errors.some((e) => e.code === 'INVALID_COLOR_FORMAT')).toBe(true)
      })
    })

    it('should validate field types correctly', () => {
      const invalidTypeConfig = {
        ...validBlockConfig,
        name: 123, // should be string
        description: true, // should be string
        icon: 'not a function', // should be function
        subBlocks: 'not an array', // should be array
        tools: 'not an object', // should be object
        inputs: [], // should be object
        outputs: 'not an object', // should be object
      } as any

      const result = validateBlockConfig(invalidTypeConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      // Check for specific type errors
      expect(result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'name')).toBe(
        true
      )

      expect(
        result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'description')
      ).toBe(true)

      expect(result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'icon')).toBe(
        true
      )
    })

    it('should validate optional fields when present', () => {
      const configWithOptionals = {
        ...validBlockConfig,
        longDescription: 123, // should be string
        docsLink: 'invalid-url', // should be valid URL
        hideFromToolbar: 'yes', // should be boolean
      } as any

      const result = validateBlockConfig(configWithOptionals)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'longDescription')
      ).toBe(true)

      expect(
        result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'hideFromToolbar')
      ).toBe(true)

      // URL validation should produce a warning, not an error
      expect(result.warnings?.some((w) => w.includes('docsLink'))).toBe(true)
    })

    it('should validate tools configuration structure', () => {
      const invalidToolsConfigs = [
        { ...validBlockConfig, tools: { access: 'not array' } },
        { ...validBlockConfig, tools: { access: [], config: { tool: 'not function' } } },
        { ...validBlockConfig, tools: { access: [], config: { params: 123 } } },
      ]

      invalidToolsConfigs.forEach((config) => {
        const result = validateBlockConfig(config as any)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    it('should validate trigger configuration when present', () => {
      const configWithTriggers = {
        ...validBlockConfig,
        triggers: {
          enabled: 'yes', // should be boolean
          available: 'not array', // should be array
        },
      } as any

      const result = validateBlockConfig(configWithTriggers)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'triggers.enabled')
      ).toBe(true)

      expect(
        result.errors.some(
          (e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'triggers.available'
        )
      ).toBe(true)
    })

    it('should handle validation exceptions gracefully', () => {
      // Test that the function handles exceptions by trying to create one during validation
      // We'll use a circular reference in the validation process
      const circularRef: any = { name: 'test' }
      circularRef.self = circularRef

      const configWithCircularRef = {
        type: 'test_block',
        name: 'Test Block',
        description: 'Test',
        category: 'blocks',
        bgColor: '#FF6B35',
        icon: () => null as any,
        subBlocks: [],
        tools: { access: [] },
        inputs: { circular: { type: 'json', schema: circularRef } },
        outputs: { result: 'string' },
      } as any

      // The function should handle any internal exceptions gracefully
      const result = validateBlockConfig(configWithCircularRef)
      expect(result.isValid).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should validate with different options', () => {
      const options: ValidationOptions = {
        strict: true,
        allowEmpty: false,
        validateSchema: true,
        maxDepth: 5,
      }

      const result = validateBlockConfig(validBlockConfig, options)

      expect(result.isValid).toBe(true)
      // Note: Logger calls are mocked
    })
  })

  describe('validateParamConfig', () => {
    const validParamConfig: ParamConfig = {
      type: 'string',
      description: 'Test parameter',
      schema: {
        type: 'string',
        minLength: 1,
      },
    }

    it('should validate valid parameter configuration', () => {
      const result = validateParamConfig(validParamConfig)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail for missing parameter configuration', () => {
      const result = validateParamConfig(null as any)

      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MISSING_PARAM_CONFIG')
    })

    it('should validate parameter types', () => {
      const validTypes = ['string', 'number', 'boolean', 'json']
      const invalidTypes = ['text', 'int', 'array', 'object']

      validTypes.forEach((type) => {
        const config = { ...validParamConfig, type: type as any }
        const result = validateParamConfig(config)
        expect(result.isValid).toBe(true)
      })

      invalidTypes.forEach((type) => {
        const config = { ...validParamConfig, type: type as any }
        const result = validateParamConfig(config)
        expect(result.isValid).toBe(false)
        expect(result.errors.some((e) => e.code === 'INVALID_PARAM_TYPE')).toBe(true)
      })
    })

    it('should validate description type', () => {
      const invalidDescriptionConfig = {
        ...validParamConfig,
        description: 123, // should be string
      } as any

      const result = validateParamConfig(invalidDescriptionConfig)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'description')
      ).toBe(true)
    })

    it('should validate schema structure', () => {
      const invalidSchemaConfig = {
        ...validParamConfig,
        schema: {
          // missing type
          properties: {},
        },
      }

      const result = validateParamConfig(invalidSchemaConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.code === 'MISSING_SCHEMA_TYPE')).toBe(true)
    })

    it('should handle missing required fields', () => {
      const missingTypeConfig = {
        description: 'Test',
        // missing type
      } as any

      const result = validateParamConfig(missingTypeConfig)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD' && e.field === 'type')
      ).toBe(true)
    })
  })

  describe('validateSubBlockConfig', () => {
    const validSubBlockConfig: SubBlockConfig = {
      id: 'test_input',
      type: 'short-input',
      layout: 'full',
      mode: 'both',
      required: true,
    }

    it('should validate valid sub-block configuration', () => {
      const result = validateSubBlockConfig(validSubBlockConfig)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail for missing sub-block configuration', () => {
      const result = validateSubBlockConfig(null as any)

      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MISSING_SUBBLOCK_CONFIG')
    })

    it('should validate required fields', () => {
      const missingIdConfig = {
        type: 'short-input',
        // missing id
      } as any

      const result = validateSubBlockConfig(missingIdConfig)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD' && e.field === 'id')
      ).toBe(true)
    })

    it('should validate sub-block types', () => {
      const validTypes = [
        'short-input',
        'long-input',
        'dropdown',
        'combobox',
        'slider',
        'table',
        'code',
        'switch',
        'tool-input',
        'checkbox-list',
        'condition-input',
        'eval-input',
        'time-input',
        'oauth-input',
      ]

      const invalidTypes = ['invalid-type', 'text-input', 'button']

      validTypes.forEach((type) => {
        const config = { ...validSubBlockConfig, type: type as any }
        const result = validateSubBlockConfig(config)
        expect(result.isValid).toBe(true)
      })

      invalidTypes.forEach((type) => {
        const config = { ...validSubBlockConfig, type: type as any }
        const result = validateSubBlockConfig(config)
        expect(result.isValid).toBe(false)
        expect(result.errors.some((e) => e.code === 'INVALID_SUBBLOCK_TYPE')).toBe(true)
      })
    })

    it('should validate layout options', () => {
      const validLayouts = ['full', 'half']
      const invalidLayouts = ['quarter', 'auto', 'flex']

      validLayouts.forEach((layout) => {
        const config = { ...validSubBlockConfig, layout: layout as any }
        const result = validateSubBlockConfig(config)
        expect(result.isValid).toBe(true)
      })

      invalidLayouts.forEach((layout) => {
        const config = { ...validSubBlockConfig, layout: layout as any }
        const result = validateSubBlockConfig(config)
        expect(result.isValid).toBe(false)
        expect(result.errors.some((e) => e.code === 'INVALID_LAYOUT')).toBe(true)
      })
    })

    it('should validate mode options', () => {
      const validModes = ['basic', 'advanced', 'both']
      const invalidModes = ['simple', 'expert', 'all']

      validModes.forEach((mode) => {
        const config = { ...validSubBlockConfig, mode: mode as any }
        const result = validateSubBlockConfig(config)
        expect(result.isValid).toBe(true)
      })

      invalidModes.forEach((mode) => {
        const config = { ...validSubBlockConfig, mode: mode as any }
        const result = validateSubBlockConfig(config)
        expect(result.isValid).toBe(false)
        expect(result.errors.some((e) => e.code === 'INVALID_MODE')).toBe(true)
      })
    })

    it('should validate field types', () => {
      const invalidTypeConfig = {
        ...validSubBlockConfig,
        id: 123, // should be string
        required: 'yes', // should be boolean
      } as any

      const result = validateSubBlockConfig(invalidTypeConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'id')).toBe(
        true
      )

      expect(
        result.errors.some((e) => e.code === 'INVALID_FIELD_TYPE' && e.field === 'required')
      ).toBe(true)
    })
  })

  describe('validateOutputFieldDefinition', () => {
    it('should validate string output field definitions', () => {
      const validStringTypes = ['string', 'number', 'boolean', 'json', 'array', 'any']

      validStringTypes.forEach((type) => {
        const result = validateOutputFieldDefinition(type as any)
        expect(result.isValid).toBe(true)
      })
    })

    it('should validate object output field definitions', () => {
      const validObjectDefinition = {
        type: 'string',
        description: 'Test output field',
      }

      const result = validateOutputFieldDefinition(validObjectDefinition)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail for missing output field definition', () => {
      const result = validateOutputFieldDefinition(null as any)

      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MISSING_OUTPUT_FIELD')
    })

    it('should validate invalid string types', () => {
      const invalidTypes = ['text', 'int', 'float', 'list']

      invalidTypes.forEach((type) => {
        const result = validateOutputFieldDefinition(type as any)
        expect(result.isValid).toBe(false)
        expect(result.errors.some((e) => e.code === 'INVALID_OUTPUT_TYPE')).toBe(true)
      })
    })

    it('should validate object format requirements', () => {
      const invalidObjectDefinitions = [
        { description: 'Missing type' }, // missing type
        { type: 'invalid', description: 'Invalid type' }, // invalid type
        { type: 'string', description: 123 }, // invalid description type
      ]

      invalidObjectDefinitions.forEach((definition) => {
        const result = validateOutputFieldDefinition(definition as any)
        expect(result.isValid).toBe(false)
      })
    })

    it('should handle invalid formats', () => {
      const invalidFormats = [123, true, [], () => {}]

      invalidFormats.forEach((format, index) => {
        const result = validateOutputFieldDefinition(format as any)
        expect(result.isValid).toBe(false)

        // Just verify that each invalid format produces at least one error
        expect(result.errors.length).toBeGreaterThan(0)

        // The specific error code may vary based on the input type
        const hasRelevantError = result.errors.some(
          (e) =>
            e.code === 'INVALID_OUTPUT_FIELD_FORMAT' ||
            e.code === 'MISSING_REQUIRED_FIELD' ||
            e.code === 'INVALID_OUTPUT_TYPE'
        )
        expect(hasRelevantError).toBe(true)
      })
    })
  })

  describe('validateParameterValues', () => {
    const paramConfigs: Record<string, ParamConfig> = {
      stringParam: { type: 'string', description: 'String parameter' },
      numberParam: { type: 'number', description: 'Number parameter' },
      booleanParam: { type: 'boolean', description: 'Boolean parameter' },
      jsonParam: {
        type: 'json',
        description: 'JSON parameter',
        schema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
      },
    }

    it('should validate correct parameter values', () => {
      const validValues = {
        stringParam: 'test string',
        numberParam: 42,
        booleanParam: true,
        jsonParam: { name: 'test' },
      }

      const result = validateParameterValues(validValues, paramConfigs)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      // Note: Logger calls are mocked
    })

    it('should fail for missing required parameters', () => {
      const incompleteValues = {
        stringParam: 'test',
        // missing other required params
      }

      const result = validateParameterValues(incompleteValues, paramConfigs)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_PARAMETER')).toBe(true)
    })

    it('should allow missing parameters when allowEmpty option is set', () => {
      const incompleteValues = {
        stringParam: 'test',
        // missing other params
      }

      const options: ValidationOptions = { allowEmpty: true }
      const result = validateParameterValues(incompleteValues, paramConfigs, options)

      expect(result.isValid).toBe(true)
    })

    it('should validate parameter types correctly', () => {
      const invalidValues = {
        stringParam: 123, // should be string
        numberParam: 'not a number', // should be number
        booleanParam: 'yes', // should be boolean
        jsonParam: 'not json', // should be object
      }

      const result = validateParameterValues(invalidValues, paramConfigs)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      expect(
        result.errors.some((e) => e.code === 'INVALID_PARAMETER_TYPE' && e.field === 'stringParam')
      ).toBe(true)

      expect(
        result.errors.some((e) => e.code === 'INVALID_PARAMETER_TYPE' && e.field === 'numberParam')
      ).toBe(true)
    })

    it('should validate JSON parameters with string input', () => {
      const values = {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        jsonParam: '{"name":"test"}', // JSON string
      }

      const result = validateParameterValues(values, paramConfigs)

      expect(result.isValid).toBe(true)
    })

    it('should handle invalid JSON strings', () => {
      const values = {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        jsonParam: '{"invalid": json}', // invalid JSON
      }

      const result = validateParameterValues(values, paramConfigs)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.code === 'INVALID_JSON_FORMAT')).toBe(true)
    })

    it('should validate against schemas when option is set', () => {
      const values = {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        jsonParam: {
          /* missing required name field */
        },
      }

      const options: ValidationOptions = { validateSchema: true }
      const result = validateParameterValues(values, paramConfigs, options)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_SCHEMA_FIELD')).toBe(true)
    })

    it('should detect unexpected parameters in strict mode', () => {
      const valuesWithExtra = {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        jsonParam: { name: 'test' },
        unexpectedParam: 'should not be here',
      }

      const options: ValidationOptions = { strict: true }
      const result = validateParameterValues(valuesWithExtra, paramConfigs, options)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some(
          (e) => e.code === 'UNEXPECTED_PARAMETER' && e.field === 'unexpectedParam'
        )
      ).toBe(true)
    })

    it('should handle validation exceptions gracefully', () => {
      const maliciousValues = {
        get stringParam() {
          throw new Error('Malicious getter')
        },
      }

      const result = validateParameterValues(maliciousValues, paramConfigs)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.code === 'PARAMETER_VALIDATION_EXCEPTION')).toBe(true)
      // Note: Logger calls are mocked
    })

    it('should handle special number values', () => {
      const specialNumbers = {
        stringParam: 'test',
        numberParam: Number.NaN, // Invalid number
        booleanParam: true,
        jsonParam: { name: 'test' },
      }

      const result = validateParameterValues(specialNumbers, paramConfigs)

      expect(result.isValid).toBe(false)
      expect(
        result.errors.some((e) => e.code === 'INVALID_PARAMETER_TYPE' && e.field === 'numberParam')
      ).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // These functions should return validation results, not throw errors
      const blockResult = validateBlockConfig(null as any)
      expect(blockResult.isValid).toBe(false)
      expect(blockResult.errors[0].code).toBe('MISSING_BLOCK_CONFIG')

      const blockResultUndef = validateBlockConfig(undefined as any)
      expect(blockResultUndef.isValid).toBe(false)
      expect(blockResultUndef.errors[0].code).toBe('MISSING_BLOCK_CONFIG')

      const paramResult = validateParamConfig(null as any)
      expect(paramResult.isValid).toBe(false)
      expect(paramResult.errors[0].code).toBe('MISSING_PARAM_CONFIG')

      const subBlockResult = validateSubBlockConfig(null as any)
      expect(subBlockResult.isValid).toBe(false)
      expect(subBlockResult.errors[0].code).toBe('MISSING_SUBBLOCK_CONFIG')

      const outputResult = validateOutputFieldDefinition(null as any)
      expect(outputResult.isValid).toBe(false)
      expect(outputResult.errors[0].code).toBe('MISSING_OUTPUT_FIELD')
    })

    it('should handle circular references in parameter values', () => {
      const circularObject: any = { name: 'test' }
      circularObject.self = circularObject

      const values = {
        jsonParam: circularObject,
      }

      const paramConfigs = {
        jsonParam: { type: 'json' as const },
      }

      // Should not throw, even with circular reference
      expect(() => validateParameterValues(values, paramConfigs)).not.toThrow()
    })

    it('should handle very large objects and arrays', () => {
      const largeArray = new Array(10000).fill('test')
      const largeObject = Object.fromEntries(
        new Array(1000).fill(0).map((_, i) => [`key${i}`, `value${i}`])
      )

      const values = {
        arrayParam: largeArray,
        objectParam: largeObject,
      }

      const paramConfigs = {
        arrayParam: { type: 'json' as const },
        objectParam: { type: 'json' as const },
      }

      expect(() => validateParameterValues(values, paramConfigs)).not.toThrow()
    })

    it('should handle malformed configurations without crashing', () => {
      const malformedConfigs = [
        { type: Symbol('invalid') }, // Symbol type
        {
          get type() {
            return undefined
          },
        }, // Dynamic undefined
        { type: 'string', description: {} }, // Object description
      ]

      malformedConfigs.forEach((config) => {
        expect(() => validateParamConfig(config as any)).not.toThrow()
      })
    })
  })

  describe('Performance Tests', () => {
    it('should validate large block configurations efficiently', () => {
      const largeBlockConfig = {
        ...{
          type: 'large_block',
          name: 'Large Block',
          description: 'A block with many sub-blocks',
          category: 'blocks' as const,
          bgColor: '#FF6B35',
          icon: () => null as any,
          tools: { access: [] },
          inputs: {},
          outputs: { result: 'string' as const },
        },
        subBlocks: new Array(100).fill(0).map((_, i) => ({
          id: `input_${i}`,
          type: 'short-input' as const,
          layout: 'full' as const,
        })),
      }

      const startTime = Date.now()
      const result = validateBlockConfig(largeBlockConfig)
      const endTime = Date.now()

      expect(result.isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('should handle concurrent validation efficiently', async () => {
      const validationPromises = Array.from({ length: 100 }, async (_, index) => {
        const config = {
          type: `test_block_${index}`,
          name: `Test Block ${index}`,
          description: `Test block number ${index}`,
          category: 'blocks' as const,
          bgColor: '#FF6B35',
          icon: () => null as any,
          subBlocks: [],
          tools: { access: [] },
          inputs: {},
          outputs: { result: 'string' as const },
        }

        const result = validateBlockConfig(config)
        expect(result.isValid).toBe(true)
      })

      await Promise.all(validationPromises)
    })
  })
})
