/**
 * Integration Tests for Universal Tool Adapter System
 *
 * Comprehensive tests to verify all tool adapters work correctly
 * with Parlant integration and provide expected functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { ParlantToolAdapterService } from '../service'
import { globalToolAdapterRegistry } from '../adapter-registry'
import { globalConfigurationManager } from '../configuration'
import type { AdapterContext } from '../types'

describe('Universal Tool Adapter System', () => {
  let service: ParlantToolAdapterService
  let testContext: AdapterContext

  beforeAll(async () => {
    // Initialize the service
    service = new ParlantToolAdapterService()
    await service.initialize()

    // Set up test context
    testContext = {
      user_id: 'test-user-123',
      workspace_id: 'test-workspace-456',
      session_id: 'test-session-789',
      agent_id: 'test-agent-abc',
    }
  })

  afterAll(async () => {
    await service.cleanup()
  })

  beforeEach(() => {
    // Reset any test-specific configuration
    globalConfigurationManager.resetToDefaults()
  })

  describe('Service Initialization', () => {
    it('should initialize successfully', async () => {
      const health = await service.getHealthStatus()
      expect(health.status).toBe('healthy')
      expect(health.initialized).toBe(true)
    })

    it('should register all expected tool adapters', () => {
      const schemas = service.getToolSchemas()
      expect(schemas.length).toBeGreaterThan(20) // Should have 20+ tools

      // Verify we have tools from each category
      const categories = new Set(schemas.map(s => s.category))
      expect(categories).toContain('workflow-management')
      expect(categories).toContain('data-retrieval')
      expect(categories).toContain('external-integration')
      expect(categories).toContain('file-operations')
    })

    it('should provide valid tool schemas', () => {
      const schemas = service.getToolSchemas()

      for (const schema of schemas) {
        expect(schema.name).toBeTruthy()
        expect(schema.description).toBeTruthy()
        expect(schema.usage_guidelines).toBeTruthy()
        expect(schema.parameters).toBeDefined()
        expect(schema.category).toBeTruthy()
        expect(schema.permission_level).toBeTruthy()
        expect(schema.performance).toBeDefined()
      }
    })
  })

  describe('Tool Execution', () => {
    it('should execute a basic tool successfully', async () => {
      const result = await service.executeTool(
        'get_blocks_metadata',
        { filter: 'all' },
        testContext
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.metadata?.execution_time_ms).toBeGreaterThan(0)
    })

    it('should handle tool not found gracefully', async () => {
      const result = await service.executeTool(
        'nonexistent_tool',
        {},
        testContext
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TOOL_NOT_FOUND')
      expect(result.error?.user_message).toContain('not available')
      expect(result.error?.retryable).toBe(false)
    })

    it('should validate tool arguments', async () => {
      // Test with invalid arguments for a tool that requires specific parameters
      const result = await service.executeTool(
        'create_workflow_from_template',
        { invalid_param: 'test' }, // Missing required template_name
        testContext
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should respect rate limiting', async () => {
      // Configure strict rate limiting
      globalConfigurationManager.updateGlobalConfig({
        rate_limiting: {
          enabled: true,
          default_requests_per_minute: 2,
          default_concurrent_limit: 1,
        }
      })

      const promises = Array(5).fill(null).map(() =>
        service.executeTool('get_blocks_metadata', {}, testContext)
      )

      const results = await Promise.all(promises)

      // Some requests should be rate limited
      const rateLimitedResults = results.filter(r =>
        !r.success && r.error?.code === 'RATE_LIMIT_EXCEEDED'
      )

      expect(rateLimitedResults.length).toBeGreaterThan(0)
    })
  })

  describe('Workflow Management Tools', () => {
    it('should create workflow from template', async () => {
      const result = await service.executeTool(
        'create_workflow_from_template',
        {
          template_name: 'data-processing',
          name: 'Test Data Pipeline',
          description: 'A test workflow for data processing',
        },
        testContext
      )

      expect(result.success).toBe(true)
      expect(result.data?.workflow_id).toBeDefined()
      expect(result.data?.name).toBe('Test Data Pipeline')
      expect(result.data?.template_used).toBe('data-processing')
    })

    it('should validate workflows', async () => {
      const result = await service.executeTool(
        'validate_workflow',
        {
          yaml_content: 'version: 1.0\nname: Test\nsteps: []',
          validation_level: 'comprehensive',
        },
        testContext
      )

      expect(result.success).toBe(true)
      expect(result.data?.valid).toBeDefined()
      expect(result.data?.performance_score).toBeDefined()
    })

    it('should manage workflow versions', async () => {
      const result = await service.executeTool(
        'manage_workflow_versions',
        {
          action: 'list_versions',
          workflow_id: 'test-workflow-123',
        },
        testContext
      )

      expect(result.success).toBe(true)
      expect(result.data?.versions).toBeDefined()
    })
  })

  describe('Data Retrieval Tools', () => {
    it('should perform advanced search', async () => {
      const result = await service.executeTool(
        'advanced_search',
        {
          query: 'test workflow',
          sources: ['workflows', 'knowledge'],
        },
        testContext
      )

      expect(result.success).toBe(true)
      expect(result.data?.results).toBeDefined()
      expect(result.data?.total).toBeDefined()
    })

    it('should query knowledge bases', async () => {
      const result = await service.executeTool(
        'query_knowledge_base',
        {
          question: 'How do I create a workflow?',
        },
        testContext
      )

      expect(result.success).toBe(true)
      expect(result.data?.answer).toBeDefined()
      expect(result.data?.sources).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock a network error scenario
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const result = await service.executeTool(
        'search_online',
        { query: 'test' },
        testContext
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NETWORK_ERROR')
      expect(result.error?.retryable).toBe(true)

      global.fetch = originalFetch
    })

    it('should provide helpful error suggestions', async () => {
      const result = await service.executeTool(
        'nonexistent_tool',
        {},
        testContext
      )

      expect(result.error?.suggestions).toBeDefined()
      expect(result.error?.suggestions?.length).toBeGreaterThan(0)
      expect(result.error?.user_message).toContain('not available')
    })
  })

  describe('Performance and Caching', () => {
    it('should cache tool results when enabled', async () => {
      // Enable caching
      globalConfigurationManager.updateGlobalConfig({
        caching: { enabled: true, default_ttl_seconds: 300 }
      })

      const tool = 'get_blocks_metadata'
      const args = { filter: 'cached_test' }

      // First execution
      const result1 = await service.executeTool(tool, args, testContext)
      expect(result1.metadata?.cached).toBe(false)

      // Second execution should be cached
      const result2 = await service.executeTool(tool, args, testContext)
      expect(result2.metadata?.cached).toBe(true)
    })

    it('should track performance metrics', async () => {
      await service.executeTool('get_blocks_metadata', {}, testContext)

      const metrics = service.getPerformanceMetrics('get_blocks_metadata')
      expect(metrics.totalExecutions).toBeGreaterThan(0)
      expect(metrics.averageDurationMs).toBeGreaterThan(0)
    })

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats()
      expect(stats.totalEntries).toBeDefined()
      expect(stats.totalSizeBytes).toBeDefined()
      expect(stats.utilizationPercent).toBeDefined()
    })
  })

  describe('Configuration Management', () => {
    it('should allow tool enabling/disabling', async () => {
      // Disable a tool
      globalConfigurationManager.setToolEnabled('get_blocks_metadata', false)

      const result = await service.executeTool(
        'get_blocks_metadata',
        {},
        testContext
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TOOL_DISABLED')

      // Re-enable the tool
      globalConfigurationManager.setToolEnabled('get_blocks_metadata', true)
    })

    it('should support workspace-specific configuration', async () => {
      globalConfigurationManager.setWorkspaceConfig(testContext.workspace_id, {
        global: {
          rate_limiting: {
            enabled: false,
            default_requests_per_minute: 1000,
            default_concurrent_limit: 100,
          }
        }
      })

      const config = globalConfigurationManager.getGlobalConfig(testContext.workspace_id)
      expect(config.rate_limiting.enabled).toBe(false)
    })
  })

  describe('Tool Discovery and Recommendations', () => {
    it('should provide tool recommendations', async () => {
      const recommendations = await service.getRecommendations(testContext, 5)
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBeLessThanOrEqual(5)
    })

    it('should support tool search', () => {
      const results = service.searchTools('workflow', testContext)
      expect(results.length).toBeGreaterThan(0)

      const workflowTools = results.filter(tool =>
        tool.name.includes('workflow') ||
        tool.description.toLowerCase().includes('workflow')
      )
      expect(workflowTools.length).toBeGreaterThan(0)
    })

    it('should categorize tools correctly', () => {
      const workflowTools = service.getToolsByCategory('workflow-management', testContext)
      expect(workflowTools.length).toBeGreaterThan(0)

      for (const tool of workflowTools) {
        expect(tool.category).toBe('workflow-management')
      }
    })
  })

  describe('Integration with Parlant', () => {
    it('should provide Parlant-compatible schemas', () => {
      const schemas = service.getToolSchemas(testContext)

      for (const schema of schemas) {
        // Verify Parlant compatibility
        expect(schema.name).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/) // Valid function name
        expect(schema.description).toBeTruthy()
        expect(schema.parameters).toHaveProperty('type', 'object')
        expect(typeof schema.usage_guidelines).toBe('string')
      }
    })

    it('should handle context correctly', async () => {
      const result = await service.executeTool(
        'get_blocks_metadata',
        {},
        testContext
      )

      // Tool should have access to context
      expect(result.success).toBe(true)
    })
  })

  describe('Health and Monitoring', () => {
    it('should provide comprehensive health status', async () => {
      const health = await service.getHealthStatus()

      expect(health.status).toBe('healthy')
      expect(health.initialized).toBe(true)
      expect(health.metrics).toBeDefined()
      expect(health.cache).toBeDefined()
      expect(health.registry).toBeDefined()
      expect(health.lastHealthCheck).toBeDefined()
    })

    it('should track service metrics', () => {
      const metrics = service.getPerformanceMetrics()
      expect(metrics.totalExecutions).toBeDefined()
      expect(metrics.successRate).toBeDefined()
      expect(metrics.averageDurationMs).toBeDefined()
    })
  })
})

/**
 * Performance Benchmarks
 */
describe('Performance Benchmarks', () => {
  let service: ParlantToolAdapterService
  let testContext: AdapterContext

  beforeAll(async () => {
    service = new ParlantToolAdapterService()
    await service.initialize()
    testContext = {
      user_id: 'bench-user',
      workspace_id: 'bench-workspace',
    }
  })

  afterAll(async () => {
    await service.cleanup()
  })

  it('should execute tools within performance targets', async () => {
    const tools = [
      'get_blocks_metadata',
      'advanced_search',
      'validate_workflow',
    ]

    for (const tool of tools) {
      const startTime = Date.now()
      const result = await service.executeTool(tool, {}, testContext)
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(5000) // 5 second maximum

      console.log(`${tool}: ${duration}ms`)
    }
  })

  it('should handle concurrent executions efficiently', async () => {
    const concurrentExecutions = 10
    const startTime = Date.now()

    const promises = Array(concurrentExecutions).fill(null).map((_, i) =>
      service.executeTool('get_blocks_metadata', { test_id: i }, testContext)
    )

    const results = await Promise.all(promises)
    const duration = Date.now() - startTime

    // All should succeed
    expect(results.every(r => r.success)).toBe(true)

    // Should complete within reasonable time
    expect(duration).toBeLessThan(10000) // 10 seconds for 10 concurrent

    console.log(`Concurrent execution (${concurrentExecutions} tools): ${duration}ms`)
  })
})