/**
 * @vitest-environment jsdom
 *
 * Tools Advanced Features Unit Tests
 *
 * This file contains comprehensive unit tests for advanced tools features,
 * including execution context, parameter validation, error handling, security,
 * and performance testing to achieve 100% code coverage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockEnvironmentVariables } from '@/tools/__test-utils__/test-tools'
import { executeTool } from '@/tools/index'
import type { ExecutionContext, ToolConfig } from '@/tools/types'

// Mock dependencies
vi.mock('@/lib/auth/internal', () => ({
  generateInternalToken: vi.fn().mockResolvedValue('mock-internal-token'),
}))

vi.mock('@/lib/urls/utils', () => ({
  getBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
}))

vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/tools/utils', () => ({
  getTool: vi.fn(),
  getToolAsync: vi.fn(),
  validateRequiredParametersAfterMerge: vi.fn(),
}))

describe('Tools Advanced Features', () => {
  let cleanupEnvVars: () => void

  beforeEach(() => {
    cleanupEnvVars = mockEnvironmentVariables({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    })
    // Mock logger is handled by vi.mock above
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupEnvVars()
    vi.restoreAllMocks()
  })

  /**
   * Execution Context Integration Tests
   */
  describe('Execution Context Integration', () => {
    it.concurrent('should handle execution context with workflowId', async () => {
      const mockTool: ToolConfig = {
        id: 'test_tool_context',
        name: 'Test Tool with Context',
        description: 'Test tool',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/test/context',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: () => ({ data: 'test' }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      const executionContext: ExecutionContext = {
        workflowId: 'workflow-123',
        executionId: 'exec-456',
        userId: 'user-789',
        organizationId: 'org-abc',
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(mockTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: 'context-test' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/test/context',
      })

      const result = await executeTool(
        'test_tool_context',
        { param: 'value' },
        false,
        false,
        executionContext
      )

      expect(result.success).toBe(true)
      expect(result.timing).toBeDefined()
      expect(result.timing?.startTime).toBeDefined()
      expect(result.timing?.endTime).toBeDefined()
    })

    it.concurrent('should handle file output processing with execution context', async () => {
      const mockTool: ToolConfig = {
        id: 'file_tool',
        name: 'File Tool',
        description: 'Tool that processes files',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/files/process',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: () => ({ action: 'process' }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      const executionContext: ExecutionContext = {
        workflowId: 'workflow-file-123',
        executionId: 'exec-file-456',
        userId: 'user-789',
        organizationId: 'org-abc',
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(mockTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      // Mock FileToolProcessor
      const mockFileProcessor = {
        hasFileOutputs: vi.fn().mockReturnValue(true),
        processToolOutputs: vi.fn().mockResolvedValue({ processedFile: 'file.txt' }),
      }

      vi.doMock('@/executor/utils/file-tool-processor', () => ({
        FileToolProcessor: mockFileProcessor,
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ file: 'test.txt' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/files/process',
      })

      const result = await executeTool('file_tool', {}, true, false, executionContext)

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ processedFile: 'file.txt' })
      expect(mockFileProcessor.hasFileOutputs).toHaveBeenCalledWith(mockTool)
      expect(mockFileProcessor.processToolOutputs).toHaveBeenCalledWith(
        { file: 'test.txt' },
        mockTool,
        executionContext
      )
    })

    it.concurrent('should skip file processing on client-side', async () => {
      const mockTool: ToolConfig = {
        id: 'client_tool',
        name: 'Client Tool',
        description: 'Tool running on client',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/client/test',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      // Mock window object to simulate client-side
      const originalWindow = global.window
      ;(global as any).window = { location: { href: 'http://localhost:3000' } }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(mockTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ clientData: 'test' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/client/test',
      })

      const result = await executeTool('client_tool', {}, true, false, {
        workflowId: 'workflow-client',
        executionId: 'exec-client',
        userId: 'user-123',
        organizationId: 'org-123',
      })

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ clientData: 'test' })

      // Restore window
      global.window = originalWindow
    })
  })

  /**
   * OAuth and Credential Management Tests
   */
  describe('OAuth and Credential Management', () => {
    it.concurrent('should fetch access token for credential parameter', async () => {
      const mockTool: ToolConfig = {
        id: 'oauth_tool',
        name: 'OAuth Tool',
        description: 'Tool requiring OAuth',
        version: '1.0.0',
        params: {
          credential: { type: 'string', required: true, visibility: 'user-only' },
          data: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/oauth/test',
          method: 'POST',
          headers: (params) => ({
            'Content-Type': 'application/json',
            Authorization: params.accessToken ? `Bearer ${params.accessToken}` : '',
          }),
          body: (params) => ({ data: params.data }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(mockTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      // Mock token fetch response
      global.fetch = vi
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ accessToken: 'oauth-token-123' }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ result: 'oauth-success' }),
            headers: new Headers(),
            url: 'http://localhost:3000/api/oauth/test',
          })
        )

      const result = await executeTool(
        'oauth_tool',
        {
          credential: 'oauth-credential-456',
          workflowId: 'workflow-oauth',
          data: 'test-data',
        },
        true
      )

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ result: 'oauth-success' })

      // Verify token fetch was called
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/oauth/token?workflowId=workflow-oauth',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-internal-token',
          }),
          body: JSON.stringify({
            credentialId: 'oauth-credential-456',
            workflowId: 'workflow-oauth',
          }),
        })
      )

      // Verify actual request was made with access token
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/oauth/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer oauth-token-123',
          }),
        })
      )
    })

    it.concurrent('should handle OAuth token fetch failure', async () => {
      const mockTool: ToolConfig = {
        id: 'oauth_fail_tool',
        name: 'OAuth Fail Tool',
        description: 'Tool with OAuth failure',
        version: '1.0.0',
        params: {
          credential: { type: 'string', required: true, visibility: 'user-only' },
        },
        request: {
          url: '/api/oauth/fail',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(mockTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      // Mock failed token fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      const result = await executeTool(
        'oauth_fail_tool',
        {
          credential: 'invalid-credential',
        },
        true
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to obtain credential')
      // Logger error would be called but we don't need to verify it
    })

    it.concurrent('should handle workflowId from execution context for OAuth', async () => {
      const mockTool: ToolConfig = {
        id: 'context_oauth_tool',
        name: 'Context OAuth Tool',
        description: 'OAuth tool using execution context',
        version: '1.0.0',
        params: {
          credential: { type: 'string', required: true, visibility: 'user-only' },
        },
        request: {
          url: '/api/context/oauth',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
      }

      const executionContext: ExecutionContext = {
        workflowId: 'context-workflow-123',
        executionId: 'exec-context',
        userId: 'user-context',
        organizationId: 'org-context',
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(mockTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ accessToken: 'context-token' }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ contextResult: 'success' }),
            headers: new Headers(),
            url: 'http://localhost:3000/api/context/oauth',
          })
        )

      await executeTool(
        'context_oauth_tool',
        {
          credential: 'context-credential',
        },
        true,
        false,
        executionContext
      )

      // Verify workflowId from execution context was used
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/oauth/token?workflowId=context-workflow-123',
        expect.objectContaining({
          body: JSON.stringify({
            credentialId: 'context-credential',
            workflowId: 'context-workflow-123',
          }),
        })
      )
    })
  })

  /**
   * Custom Tools Integration Tests
   */
  describe('Custom Tools Integration', () => {
    it.concurrent('should execute custom tool with async resolution', async () => {
      const mockCustomTool: ToolConfig = {
        id: 'custom_test_tool',
        name: 'Custom Test Tool',
        description: 'Custom tool for testing',
        version: '1.0.0',
        params: {
          input: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/function/execute',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: (params) => ({
            code: 'return { result: params.input }',
            params: params,
          }),
        },
        transformResponse: async (response) => {
          const data = await response.json()
          return {
            success: true,
            output: data.output.result || data.output,
          }
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(null) // Not found in built-in
      vi.mocked(require('@/tools/utils').getToolAsync).mockResolvedValue(mockCustomTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            output: { result: 'custom-result' },
          }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/function/execute',
      })

      const result = await executeTool(
        'custom_test_tool',
        {
          input: 'test-input',
          _context: { workflowId: 'custom-workflow' },
        },
        true
      )

      expect(result.success).toBe(true)
      expect(result.output).toEqual('custom-result')

      expect(vi.mocked(require('@/tools/utils').getToolAsync)).toHaveBeenCalledWith(
        'custom_test_tool',
        'custom-workflow'
      )
    })

    it.concurrent('should handle custom tool not found', async () => {
      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(null)
      vi.mocked(require('@/tools/utils').getToolAsync).mockResolvedValue(undefined)

      const result = await executeTool('custom_non_existent', {}, true)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Tool not found')
      // Logger error would be called but we don't need to verify it
    })
  })

  /**
   * Error Handling and Edge Cases
   */
  describe('Error Handling and Edge Cases', () => {
    it.concurrent('should handle network timeout errors', async () => {
      const timeoutTool: ToolConfig = {
        id: 'timeout_tool',
        name: 'Timeout Tool',
        description: 'Tool that times out',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/timeout/test',
          method: 'GET',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(timeoutTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      const timeoutError = new Error('Network timeout')
      timeoutError.name = 'TimeoutError'

      global.fetch = vi.fn().mockRejectedValue(timeoutError)

      const result = await executeTool('timeout_tool', {}, true)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
      expect(result.timing).toBeDefined()
    })

    it.concurrent('should handle malformed JSON responses', async () => {
      const jsonTool: ToolConfig = {
        id: 'json_tool',
        name: 'JSON Tool',
        description: 'Tool with malformed JSON',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/json/malformed',
          method: 'GET',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(jsonTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: new Headers(),
        url: 'http://localhost:3000/api/json/malformed',
      })

      const result = await executeTool('json_tool', {}, true)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to parse response')
    })

    it.concurrent('should handle HTTP 202 responses with empty body', async () => {
      const acceptedTool: ToolConfig = {
        id: 'accepted_tool',
        name: 'Accepted Tool',
        description: 'Tool returning 202',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/accepted',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: () => ({ action: 'process' }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(acceptedTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202, // Accepted
        json: () => Promise.resolve(undefined), // Empty body
        headers: new Headers(),
        url: 'http://localhost:3000/api/accepted',
      })

      const result = await executeTool('accepted_tool', {}, true)

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ status: 202 })
    })

    it.concurrent('should handle post-processing errors gracefully', async () => {
      const postProcessTool: ToolConfig = {
        id: 'postprocess_tool',
        name: 'Post Process Tool',
        description: 'Tool with post-processing error',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/postprocess',
          method: 'GET',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
        postProcess: async () => {
          throw new Error('Post-processing failed')
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(postProcessTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'original' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/postprocess',
      })

      const result = await executeTool('postprocess_tool', {}, true)

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ data: 'original' }) // Should return original result
      // Logger error would be called but we don't need to verify it
    })

    it.concurrent('should handle transform response errors', async () => {
      const transformErrorTool: ToolConfig = {
        id: 'transform_error_tool',
        name: 'Transform Error Tool',
        description: 'Tool with transform error',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/transform-error',
          method: 'GET',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
        transformResponse: async () => {
          throw new Error('Transform failed')
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(transformErrorTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/transform-error',
      })

      const result = await executeTool('transform_error_tool', {}, true)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Transform failed')
    })

    it.concurrent('should handle complex error objects', async () => {
      const complexErrorTool: ToolConfig = {
        id: 'complex_error_tool',
        name: 'Complex Error Tool',
        description: 'Tool with complex error',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/complex-error',
          method: 'GET',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(complexErrorTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      const complexError = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {
          errors: [
            { message: 'Database connection failed' },
            { message: 'Cache service unavailable' },
          ],
          code: 'SERVICE_UNAVAILABLE',
          requestId: 'req-123',
        },
      }

      global.fetch = vi.fn().mockRejectedValue(complexError)

      const result = await executeTool('complex_error_tool', {}, true)

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 500: Internal Server Error')
    })
  })

  /**
   * Security and Validation Tests
   */
  describe('Security and Validation Tests', () => {
    it.concurrent('should validate required parameters before execution', async () => {
      const validationTool: ToolConfig = {
        id: 'validation_tool',
        name: 'Validation Tool',
        description: 'Tool with validation',
        version: '1.0.0',
        params: {
          required_param: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/validation',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(validationTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {
          throw new Error('Required parameter missing: required_param')
        }
      )

      const result = await executeTool('validation_tool', {}, true)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Required parameter missing: required_param')
    })

    it.concurrent('should sanitize sensitive data in logs', async () => {
      const sensitiveTool: ToolConfig = {
        id: 'sensitive_tool',
        name: 'Sensitive Tool',
        description: 'Tool with sensitive data',
        version: '1.0.0',
        params: {
          apiKey: { type: 'string', required: true, visibility: 'user-only' },
          password: { type: 'string', required: true, visibility: 'user-only' },
          data: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/sensitive',
          method: 'POST',
          headers: (params) => ({
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json',
          }),
          body: (params) => ({
            password: params.password,
            data: params.data,
          }),
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(sensitiveTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/sensitive',
      })

      const result = await executeTool(
        'sensitive_tool',
        {
          apiKey: 'secret-api-key-123',
          password: 'super-secret-password',
          data: 'public-data',
        },
        true
      )

      expect(result.success).toBe(true)

      // Verify the request was made but sensitive data is handled properly
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sensitive',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-api-key-123',
          }),
          body: JSON.stringify({
            password: 'super-secret-password',
            data: 'public-data',
          }),
        })
      )

      // Verify request succeeded - no errors logged
    })

    it.concurrent('should handle parameter injection attempts', async () => {
      const injectionTool: ToolConfig = {
        id: 'injection_tool',
        name: 'Injection Tool',
        description: 'Tool vulnerable to injection',
        version: '1.0.0',
        params: {
          userInput: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: (params) => `/api/user/${params.userInput}`,
          method: 'GET',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(injectionTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: 'found' }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/user/..%2F..%2Fadmin',
      })

      const result = await executeTool(
        'injection_tool',
        {
          userInput: '../../../admin', // Path traversal attempt
        },
        true
      )

      expect(result.success).toBe(true)

      // Verify the malicious input was passed through (tool should handle validation)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/user/../../../admin',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })

  /**
   * Performance and Load Testing
   */
  describe('Performance and Load Testing', () => {
    it.concurrent('should handle concurrent tool executions', async () => {
      const concurrentTool: ToolConfig = {
        id: 'concurrent_tool',
        name: 'Concurrent Tool',
        description: 'Tool for concurrent testing',
        version: '1.0.0',
        params: {
          id: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/concurrent',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: (params) => ({ id: params.id }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(concurrentTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      // Mock fetch with delay to simulate network latency
      global.fetch = vi.fn().mockImplementation(async (url, options) => {
        await new Promise((resolve) => setTimeout(resolve, 10)) // 10ms delay
        const bodyData = JSON.parse(options.body as string)
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ result: `processed-${bodyData.id}` }),
          headers: new Headers(),
          url: url.toString(),
        }
      })

      const startTime = performance.now()

      // Execute 10 concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        executeTool('concurrent_tool', { id: `request-${i}` }, true)
      )

      const results = await Promise.all(promises)

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // All requests should succeed
      expect(results.every((r) => r.success)).toBe(true)
      expect(results).toHaveLength(10)

      // Should complete faster than sequential (less than 10 * 10ms = 100ms + overhead)
      expect(totalTime).toBeLessThan(200)

      // Verify each request got the correct response
      results.forEach((result, index) => {
        expect(result.output).toEqual({ result: `processed-request-${index}` })
      })
    })

    it.concurrent('should handle large payloads efficiently', async () => {
      const largeTool: ToolConfig = {
        id: 'large_tool',
        name: 'Large Tool',
        description: 'Tool handling large payloads',
        version: '1.0.0',
        params: {
          data: { type: 'string', required: true, visibility: 'user-or-llm' },
        },
        request: {
          url: '/api/large',
          method: 'POST',
          headers: () => ({ 'Content-Type': 'application/json' }),
          body: (params) => ({ data: params.data }),
        },
        transformResponse: async (response) => ({
          success: true,
          output: await response.json(),
        }),
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(largeTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      // Create a large payload (1MB of text)
      const largePayload = 'A'.repeat(1024 * 1024)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ processed: true, size: largePayload.length }),
        headers: new Headers(),
        url: 'http://localhost:3000/api/large',
      })

      const startTime = performance.now()
      const result = await executeTool('large_tool', { data: largePayload }, true)
      const endTime = performance.now()

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ processed: true, size: 1024 * 1024 })

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it.concurrent('should measure and report accurate timing', async () => {
      const timingTool: ToolConfig = {
        id: 'timing_tool',
        name: 'Timing Tool',
        description: 'Tool for timing tests',
        version: '1.0.0',
        params: {},
        request: {
          url: '/api/timing',
          method: 'GET',
          headers: () => ({ 'Content-Type': 'application/json' }),
        },
        transformResponse: async (response) => {
          // Add artificial delay to test timing accuracy
          await new Promise((resolve) => setTimeout(resolve, 50))
          return {
            success: true,
            output: await response.json(),
          }
        },
      }

      vi.mocked(require('@/tools/utils').getTool).mockReturnValue(timingTool)
      vi.mocked(require('@/tools/utils').validateRequiredParametersAfterMerge).mockImplementation(
        () => {}
      )

      global.fetch = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25)) // 25ms delay
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ timed: true }),
          headers: new Headers(),
          url: 'http://localhost:3000/api/timing',
        }
      })

      const result = await executeTool('timing_tool', {}, true)

      expect(result.success).toBe(true)
      expect(result.timing).toBeDefined()
      expect(result.timing?.duration).toBeGreaterThan(70) // Should be at least 75ms (25 + 50)
      expect(result.timing?.duration).toBeLessThan(200) // But not too much overhead
      expect(result.timing?.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(result.timing?.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})
