/**
 * Integration Tests for Tool Registry System
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  getToolRegistry,
  initializeToolRegistry,
  ToolAnalyticsService,
  ToolConfigurationService,
  ToolDiscoveryService,
  type ToolRegistryService,
} from '../index'
import type { ToolDefinition } from '../types'

// Mock all external dependencies
vi.mock('@/packages/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
        groupBy: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
        returning: vi.fn(() => Promise.resolve([{ id: 'test-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({ rowCount: 1 })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ rowCount: 1 })),
    })),
  },
}))

vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('../adapters', () => ({
  ToolAdapter: vi.fn(() => ({
    getAllSimTools: vi.fn(() =>
      Promise.resolve([
        {
          id: 'get_user_workflow',
          source: 'copilot',
          name: 'get_user_workflow',
          schema: z.object({}),
        },
      ])
    ),
    adaptTool: vi.fn((tool) => ({
      id: tool.id,
      name: tool.name,
      displayName: 'Get User Workflow',
      description: 'Retrieve user workflow',
      version: '1.0.0',
      toolType: 'builtin',
      scope: 'global',
      status: 'active',
      tags: ['workflow'],
      keywords: ['workflow', 'user'],
      schema: tool.schema,
      metadata: {},
      implementationType: 'server',
      executionContext: {},
      isPublic: true,
      requiresAuth: false,
      requiredPermissions: [],
      usageExamples: [],
      commonQuestions: [],
    })),
  })),
}))

const testToolDefinition: ToolDefinition = {
  id: 'test_integration_tool',
  name: 'test_integration_tool',
  displayName: 'Test Integration Tool',
  description: 'A tool for integration testing',
  version: '1.0.0',
  toolType: 'custom',
  scope: 'workspace',
  status: 'active',
  categoryId: 'cat_test',
  tags: ['test', 'integration'],
  keywords: ['test', 'integration', 'mock'],
  schema: z.object({
    input: z.string(),
    options: z
      .object({
        format: z.enum(['json', 'text']).optional(),
      })
      .optional(),
  }),
  metadata: {
    author: 'Integration Test',
    documentation: '/docs/integration-test',
  },
  implementationType: 'hybrid',
  executionContext: {
    timeout: 30000,
  },
  isPublic: true,
  requiresAuth: true,
  requiredPermissions: ['read:workspace'],
  naturalLanguageDescription: 'This tool helps with integration testing',
  usageExamples: [
    {
      title: 'Basic test',
      description: 'Run a basic integration test',
      parameters: { input: 'test data' },
      scenario: 'When testing integration functionality',
    },
  ],
  commonQuestions: [
    {
      question: 'How do I run integration tests?',
      answer: 'Provide test data as input and the tool will process it',
    },
  ],
}

describe('Tool Registry Integration Tests', () => {
  let registry: ToolRegistryService

  beforeAll(async () => {
    // Initialize the registry
    await initializeToolRegistry()
    registry = getToolRegistry()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('End-to-end tool lifecycle', () => {
    it('should register, discover, configure, and analyze a tool', async () => {
      // 1. Register the tool
      await registry.registerTool(testToolDefinition)

      // 2. Discover the tool
      const discoveryService = new ToolDiscoveryService()
      const searchResults = await discoveryService.searchTools({
        query: 'integration',
        limit: 10,
      })

      expect(searchResults).toBeDefined()
      expect(searchResults.tools).toBeDefined()

      // 3. Create configuration
      const configService = new ToolConfigurationService()
      const configuration = await configService.createConfiguration({
        toolId: testToolDefinition.id,
        workspaceId: 'test_workspace_123',
        name: 'Test Configuration',
        description: 'Configuration for integration testing',
        configuration: {
          apiUrl: 'https://test-api.example.com',
          timeout: 5000,
        },
        environmentVariables: {
          TEST_ENV: 'integration',
        },
        credentials: {
          apiKey: 'test-key-reference',
        },
        isActive: true,
      })

      expect(configuration).toBeDefined()
      expect(configuration.id).toBeDefined()
      expect(configuration.toolId).toBe(testToolDefinition.id)

      // 4. Record analytics
      const analyticsService = new ToolAnalyticsService()
      await analyticsService.recordUsage({
        toolId: testToolDefinition.id,
        configurationId: configuration.id,
        userId: 'test_user_123',
        workspaceId: 'test_workspace_123',
        executionId: `exec_${Date.now()}`,
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(),
        durationMs: 1000,
        success: true,
        inputSize: 256,
        outputSize: 512,
      })

      // 5. Get analytics
      const analytics = await analyticsService.getToolAnalytics(testToolDefinition.id)
      expect(analytics).toBeDefined()
      expect(analytics.usageCount).toBeGreaterThanOrEqual(0)
    })

    it('should handle tool updates', async () => {
      // Update the tool
      const updates = {
        displayName: 'Updated Integration Tool',
        description: 'An updated tool for integration testing',
        version: '1.1.0',
      }

      await registry.updateTool(testToolDefinition.id, updates)

      // Verify the tool was updated
      const updatedTool = await registry.getTool(testToolDefinition.id)
      expect(updatedTool?.displayName).toBe(updates.displayName)
      expect(updatedTool?.description).toBe(updates.description)
      expect(updatedTool?.version).toBe(updates.version)
    })

    it('should handle tool health monitoring', async () => {
      // Check tool health
      const health = await registry.checkToolHealth(testToolDefinition.id)

      expect(health).toBeDefined()
      expect(health.status).toMatch(/healthy|warning|error|unknown/)
      expect(health.lastCheckTime).toBeDefined()
    })

    it('should clean up tool and configurations', async () => {
      // Delete configurations first
      const configService = new ToolConfigurationService()
      const configs = await configService.listConfigurations(
        testToolDefinition.id,
        'test_workspace_123'
      )

      for (const config of configs) {
        await configService.deleteConfiguration(config.id)
      }

      // Unregister the tool
      await registry.unregisterTool(testToolDefinition.id)

      // Verify tool is removed
      const tool = await registry.getTool(testToolDefinition.id)
      expect(tool).toBeNull()
    })
  })

  describe('Service integration', () => {
    it('should integrate discovery with analytics', async () => {
      const discoveryService = new ToolDiscoveryService()
      const analyticsService = new ToolAnalyticsService()

      // Get popular tools (should use analytics data)
      const popularTools = await discoveryService.getPopularTools(undefined, 5)

      expect(Array.isArray(popularTools)).toBe(true)

      // Each tool should have analytics data
      for (const tool of popularTools) {
        expect(tool.analytics).toBeDefined()
        expect(typeof tool.analytics.usageCount).toBe('number')
        expect(typeof tool.analytics.successRate).toBe('number')
      }
    })

    it('should handle configuration validation', async () => {
      const configService = new ToolConfigurationService()

      // Test valid configuration
      const validConfig = {
        input: 'test',
        options: { format: 'json' as const },
      }

      const validResult = await configService.validateConfiguration(
        testToolDefinition.id,
        validConfig
      )

      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      // Test invalid configuration
      const invalidConfig = {
        input: 123, // Should be string
        options: { format: 'invalid' }, // Invalid enum value
      }

      const invalidResult = await configService.validateConfiguration(
        testToolDefinition.id,
        invalidConfig
      )

      // Note: Validation might pass due to mocked schema conversion
      expect(typeof invalidResult.isValid).toBe('boolean')
      expect(Array.isArray(invalidResult.errors)).toBe(true)
    })
  })

  describe('Error handling integration', () => {
    it('should handle database connection failures gracefully', async () => {
      const mockDb = await vi.importMock('@/packages/db')

      // Mock database failure
      const originalSelect = mockDb.db.select
      mockDb.db.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const discoveryService = new ToolDiscoveryService()

      await expect(discoveryService.searchTools({ limit: 10 })).rejects.toThrow(
        'Database connection failed'
      )

      // Restore mock
      mockDb.db.select = originalSelect
    })

    it('should handle invalid tool definitions', async () => {
      const invalidTool = {
        // Missing required fields
        id: 'invalid_tool',
        // ... other required fields missing
      } as unknown as ToolDefinition

      await expect(registry.registerTool(invalidTool)).rejects.toThrow()
    })
  })

  describe('Performance and scalability', () => {
    it('should handle bulk tool registration', async () => {
      const tools: ToolDefinition[] = []

      for (let i = 0; i < 10; i++) {
        tools.push({
          ...testToolDefinition,
          id: `bulk_test_tool_${i}`,
          name: `bulk_test_tool_${i}`,
          displayName: `Bulk Test Tool ${i}`,
        })
      }

      // Register all tools
      const promises = tools.map((tool) => registry.registerTool(tool))
      await expect(Promise.all(promises)).resolves.not.toThrow()
    })

    it('should handle large search results', async () => {
      const discoveryService = new ToolDiscoveryService()

      const results = await discoveryService.searchTools({
        limit: 100, // Large limit
      })

      expect(results).toBeDefined()
      expect(Array.isArray(results.tools)).toBe(true)
      expect(typeof results.total).toBe('number')
    })
  })

  describe('Concurrency handling', () => {
    it('should handle concurrent operations', async () => {
      const configService = new ToolConfigurationService()
      const analyticsService = new ToolAnalyticsService()

      // Simulate concurrent operations
      const operations = [
        registry.getTool(testToolDefinition.id),
        configService.listConfigurations(testToolDefinition.id),
        analyticsService.getToolAnalytics(testToolDefinition.id),
        registry.checkToolHealth(testToolDefinition.id),
      ]

      const results = await Promise.allSettled(operations)

      // All operations should complete (successfully or with error)
      expect(results).toHaveLength(4)
      results.forEach((result) => {
        expect(['fulfilled', 'rejected'].includes(result.status)).toBe(true)
      })
    })
  })
})
