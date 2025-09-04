/**
 * @vitest-environment jsdom
 *
 * Tools Utilities Comprehensive Unit Tests
 *
 * This file contains comprehensive unit tests for tools utilities,
 * including table transformation, parameter validation, request formatting,
 * and environment variable handling to achieve 100% code coverage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEnvironmentVariables } from '@/tools/__test-utils__/test-tools'
import type { TableRow, ToolConfig } from '@/tools/types'
import {
  executeRequest,
  formatRequestParams,
  getTool,
  transformTable,
  validateRequiredParametersAfterMerge,
} from '@/tools/utils'

// Mock dependencies
vi.mock('@/lib/urls/utils', () => ({
  getBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
}))

vi.mock('@/tools/registry', () => ({
  tools: {
    test_tool: {
      id: 'test_tool',
      name: 'Test Tool',
      description: 'Test tool for testing',
      version: '1.0.0',
      params: {
        input: { type: 'string', required: true, visibility: 'user-or-llm' },
      },
    },
  },
}))

describe('Tools Utils Comprehensive', () => {
  let cleanupEnvVars: () => void

  beforeEach(() => {
    cleanupEnvVars = mockEnvironmentVariables({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupEnvVars()
    vi.restoreAllMocks()
  })

  /**
   * Table Transformation Tests
   */
  describe('Table Transformation', () => {
    it.concurrent('should transform table rows to key-value object', () => {
      const tableRows: TableRow[] = [
        {
          id: 'row1',
          cells: {
            Key: 'name',
            Value: 'John Doe',
          },
        },
        {
          id: 'row2',
          cells: {
            Key: 'age',
            Value: '30',
          },
        },
        {
          id: 'row3',
          cells: {
            Key: 'city',
            Value: 'New York',
          },
        },
      ]

      const result = transformTable(tableRows)

      expect(result).toEqual({
        name: 'John Doe',
        age: '30',
        city: 'New York',
      })
    })

    it.concurrent('should handle empty table', () => {
      const result = transformTable([])
      expect(result).toEqual({})
    })

    it.concurrent('should handle rows with missing keys', () => {
      const tableRows: TableRow[] = [
        {
          id: 'row1',
          cells: {
            Key: '',
            Value: 'Empty Key',
          },
        },
        {
          id: 'row2',
          cells: {
            Key: 'valid',
            Value: 'Valid Value',
          },
        },
      ]

      const result = transformTable(tableRows)

      expect(result).toEqual({
        '': 'Empty Key',
        valid: 'Valid Value',
      })
    })

    it.concurrent('should handle rows with special characters in keys', () => {
      const tableRows: TableRow[] = [
        {
          id: 'row1',
          cells: {
            Key: 'special-key_123',
            Value: 'Special Value',
          },
        },
        {
          id: 'row2',
          cells: {
            Key: 'key with spaces',
            Value: 'Spaced Value',
          },
        },
      ]

      const result = transformTable(tableRows)

      expect(result['special-key_123']).toBe('Special Value')
      expect(result['key with spaces']).toBe('Spaced Value')
    })

    it.concurrent('should handle duplicate keys (last one wins)', () => {
      const tableRows: TableRow[] = [
        {
          id: 'row1',
          cells: {
            Key: 'duplicate',
            Value: 'First Value',
          },
        },
        {
          id: 'row2',
          cells: {
            Key: 'duplicate',
            Value: 'Second Value',
          },
        },
      ]

      const result = transformTable(tableRows)

      expect(result.duplicate).toBe('Second Value')
    })

    it.concurrent('should handle null and undefined values', () => {
      const tableRows: TableRow[] = [
        {
          id: 'row1',
          cells: {
            Key: 'nullValue',
            Value: null as any,
          },
        },
        {
          id: 'row2',
          cells: {
            Key: 'undefinedValue',
            Value: undefined as any,
          },
        },
      ]

      const result = transformTable(tableRows)

      expect(result.nullValue).toBeNull()
      expect(result.undefinedValue).toBeUndefined()
    })
  })

  /**
   * Request Parameter Formatting Tests
   */
  describe('Request Parameter Formatting', () => {
    it.concurrent('should format basic request parameters', () => {
      const tool: ToolConfig = {
        id: 'test_tool',
        name: 'Test Tool',
        description: 'Test tool',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/test',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: (params) => params,
        },
      }

      const params = { input: 'test value', number: 42 }

      const result = formatRequestParams(tool, params)

      expect(result.url).toBe('/api/test')
      expect(result.method).toBe('POST')
      expect(result.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(result.body).toBe(JSON.stringify(params))
    })

    it.concurrent('should handle dynamic URL generation', () => {
      const tool: ToolConfig = {
        id: 'dynamic_url_tool',
        name: 'Dynamic URL Tool',
        description: 'Tool with dynamic URL',
        version: '1.0.0',
        params: {},
        request: {
          url: (params) => `/api/users/${params.userId}`,
          method: 'GET',
          headers: () => ({}),
        },
      }

      const params = { userId: '123' }

      const result = formatRequestParams(tool, params)

      expect(result.url).toBe('/api/users/123')
      expect(result.method).toBe('GET')
    })

    it.concurrent('should handle dynamic headers', () => {
      const tool: ToolConfig = {
        id: 'auth_tool',
        name: 'Auth Tool',
        description: 'Tool with auth headers',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/protected',
          method: 'POST',
          headers: (params) => ({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.token}`,
          }),
        },
      }

      const params = { token: 'abc123' }

      const result = formatRequestParams(tool, params)

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer abc123',
      })
    })

    it.concurrent('should handle GET request without body', () => {
      const tool: ToolConfig = {
        id: 'get_tool',
        name: 'GET Tool',
        description: 'Tool with GET request',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/data',
          method: 'GET',
          headers: () => ({}),
        },
      }

      const result = formatRequestParams(tool, {})

      expect(result.method).toBe('GET')
      expect(result.body).toBeUndefined()
    })

    it.concurrent('should handle preformatted content', () => {
      const tool: ToolConfig = {
        id: 'form_tool',
        name: 'Form Tool',
        description: 'Tool with form data',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/form',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/x-www-form-urlencoded' }),
          body: () => ({ name: 'John', age: '30' }),
        },
      }

      const result = formatRequestParams(tool, {})

      expect(result.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' })
      expect(result.body).toEqual({ name: 'John', age: '30' })
    })
  })

  /**
   * Tool Registry Tests
   */
  describe('Tool Registry', () => {
    it.concurrent('should retrieve existing tool from registry', () => {
      const tool = getTool('test_tool')

      expect(tool).toBeDefined()
      expect(tool?.id).toBe('test_tool')
      expect(tool?.name).toBe('Test Tool')
    })

    it.concurrent('should return undefined for non-existent tool', () => {
      const tool = getTool('non_existent_tool')
      expect(tool).toBeUndefined()
    })

    it.concurrent('should handle empty or invalid tool ID', () => {
      expect(getTool('')).toBeUndefined()
      expect(getTool(null as any)).toBeUndefined()
      expect(getTool(undefined as any)).toBeUndefined()
    })
  })

  /**
   * Parameter Validation Tests
   */
  describe('Parameter Validation', () => {
    it.concurrent('should pass validation for valid parameters', () => {
      const tool: ToolConfig = {
        id: 'validation_tool',
        name: 'Validation Tool',
        description: 'Tool with validation',
        version: '1.0.0',
        params: {
          required_param: { type: 'string', required: true, visibility: 'user-or-llm' },
          optional_param: { type: 'string', required: false, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/validate',
          method: 'POST',
          headers: () => ({}),
        },
      }

      const params = { required_param: 'test value' }

      expect(() => {
        validateRequiredParametersAfterMerge('test_tool', tool, params)
      }).not.toThrow()
    })

    it.concurrent('should throw for missing required parameters', () => {
      const tool: ToolConfig = {
        id: 'strict_tool',
        name: 'Strict Tool',
        description: 'Tool with strict validation',
        version: '1.0.0',
        params: {
          required_param: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/strict',
          method: 'POST',
          headers: () => ({}),
        },
      }

      const params = {} // Missing required parameter

      expect(() => {
        validateRequiredParametersAfterMerge('strict_tool', tool, params)
      }).toThrow()
    })

    it.concurrent('should handle empty parameter definitions', () => {
      const tool: ToolConfig = {
        id: 'no_params_tool',
        name: 'No Params Tool',
        description: 'Tool with no parameters',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/no-params',
          method: 'GET',
          headers: () => ({}),
        },
      }

      expect(() => {
        validateRequiredParametersAfterMerge('optional_tool', tool, {})
      }).not.toThrow()
    })
  })

  /**
   * Request Execution Tests
   */
  describe('Request Execution', () => {
    it.concurrent('should execute successful request', async () => {
      const tool: ToolConfig = {
        id: 'success_tool',
        name: 'Success Tool',
        description: 'Tool that succeeds',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/success',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ result: 'success' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/success',
      })

      const result = await executeRequest('success_tool', tool, {
        url: '/api/success',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ result: 'success' })
    })

    it.concurrent('should handle HTTP error responses', async () => {
      const tool: ToolConfig = {
        id: 'error_tool',
        name: 'Error Tool',
        description: 'Tool that errors',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/error',
          method: 'POST',
          headers: () => ({}),
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Resource not found'),
      })

      const result = await executeRequest('error_tool', tool, {
        url: '/api/error',
        method: 'POST',
        headers: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 404')
    })

    it.concurrent('should handle network errors', async () => {
      const tool: ToolConfig = {
        id: 'network_error_tool',
        name: 'Network Error Tool',
        description: 'Tool with network error',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/network-error',
          method: 'GET',
          headers: () => ({}),
        },
      }

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await executeRequest('network_error_tool', tool, {
        url: '/api/network-error',
        method: 'GET',
        headers: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it.concurrent('should handle missing transform response', async () => {
      const tool: ToolConfig = {
        id: 'no_transform_tool',
        name: 'No Transform Tool',
        description: 'Tool without transform response',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/no-transform',
          method: 'GET',
          headers: () => ({}),
        },
        // No transformResponse function
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'raw' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/no-transform',
      })

      const result = await executeRequest('no_transform_tool', tool, {
        url: '/api/no-transform',
        method: 'GET',
        headers: {},
      })

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ data: 'raw' })
    })

    it.concurrent('should handle empty response body', async () => {
      const tool: ToolConfig = {
        id: 'empty_response_tool',
        name: 'Empty Response Tool',
        description: 'Tool with empty response',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/empty',
          method: 'POST',
          headers: () => ({}),
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204, // No Content
        json: () => Promise.resolve(undefined),
        headers: new Headers(),
        url: 'http://localhost:3000/api/empty',
      })

      const result = await executeRequest('empty_response_tool', tool, {
        url: '/api/empty',
        method: 'POST',
        headers: {},
      })

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ status: 204 })
    })
  })

  /**
   * Performance and Edge Cases
   */
  describe('Performance and Edge Cases', () => {
    it.concurrent('should handle large parameter objects', () => {
      const tool: ToolConfig = {
        id: 'large_params_tool',
        name: 'Large Params Tool',
        description: 'Tool with large parameters',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/large',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: (params) => params,
        },
      }

      // Create large parameter object
      const largeParams: Record<string, any> = {}
      for (let i = 0; i < 1000; i++) {
        largeParams[`param_${i}`] = `value_${i}`
      }

      const startTime = performance.now()
      const result = formatRequestParams(tool, largeParams)
      const endTime = performance.now()

      expect(result.body).toBeDefined()
      expect(JSON.parse(result.body!)).toEqual(largeParams)
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })

    it.concurrent('should handle Unicode and special characters', () => {
      const tool: ToolConfig = {
        id: 'unicode_tool',
        name: 'Unicode Tool',
        description: 'Tool with Unicode',
        version: '1.0.0',
        params: {},
        request: {
          url: (params) => `/api/unicode/${encodeURIComponent(params.unicode)}`,
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: (params) => params,
        },
      }

      const params = {
        unicode: '🚀 Hello 世界',
        emoji: '😀😃😄😁',
        special: '!@#$%^&*()_+-=[]{}|;:\'\",./<>?',
      }

      const result = formatRequestParams(tool, params)

      expect(result.url).toContain(encodeURIComponent('🚀 Hello 世界'))
      const parsedBody = JSON.parse(result.body!)
      expect(parsedBody.unicode).toBe('🚀 Hello 世界')
      expect(parsedBody.emoji).toBe('😀😃😄😁')
      expect(parsedBody.special).toBe('!@#$%^&*()_+-=[]{}|;:\'\",./<>?')
    })

    it.concurrent('should handle deeply nested objects', () => {
      const tool: ToolConfig = {
        id: 'nested_tool',
        name: 'Nested Tool',
        description: 'Tool with nested objects',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/nested',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: (params) => params,
        },
      }

      const nestedParams = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  deepValue: 'Found it!',
                  array: [1, 2, { nested: 'in array' }],
                },
              },
            },
          },
        },
      }

      const result = formatRequestParams(tool, nestedParams)

      const parsedBody = JSON.parse(result.body!)
      expect(parsedBody.level1.level2.level3.level4.level5.deepValue).toBe('Found it!')
      expect(parsedBody.level1.level2.level3.level4.level5.array[2].nested).toBe('in array')
    })
  })
})
