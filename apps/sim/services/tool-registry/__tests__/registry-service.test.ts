/**
 * Tests for ToolRegistryService
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ToolRegistryService } from '../registry-service'
import type { ToolDefinition } from '../types'

// Mock database
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
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
        returning: vi.fn(() => Promise.resolve([{ id: 'test-category' }])),
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

// Mock logger
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

// Mock adapters
vi.mock('../adapters', () => ({
  ToolAdapter: vi.fn(() => ({
    getAllSimTools: vi.fn(() => Promise.resolve([])),
    adaptTool: vi.fn(() => mockToolDefinition),
  })),
}))

const mockToolDefinition: ToolDefinition = {
  id: 'test_tool',
  name: 'test_tool',
  displayName: 'Test Tool',
  description: 'A test tool',
  version: '1.0.0',
  toolType: 'builtin',
  scope: 'global',
  status: 'active',
  tags: ['test'],
  keywords: ['test', 'mock'],
  schema: z.object({ input: z.string() }),
  metadata: { author: 'Test' },
  implementationType: 'server',
  executionContext: {},
  isPublic: true,
  requiresAuth: false,
  requiredPermissions: [],
  naturalLanguageDescription: 'A tool for testing',
  usageExamples: [],
  commonQuestions: [],
}

describe('ToolRegistryService', () => {
  let registryService: ToolRegistryService

  beforeEach(() => {
    registryService = new ToolRegistryService()
    vi.clearAllMocks()
  })

  describe('registerTool', () => {
    it('should register a tool successfully', async () => {
      await expect(registryService.registerTool(mockToolDefinition)).resolves.not.toThrow()
    })

    it('should emit registration event', async () => {
      const eventSpy = vi.fn()
      registryService.on('tool.registered', eventSpy)

      await registryService.registerTool(mockToolDefinition)

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool.registered',
          toolId: 'test_tool',
          data: mockToolDefinition,
        })
      )
    })
  })

  describe('unregisterTool', () => {
    it('should unregister a tool successfully', async () => {
      await expect(registryService.unregisterTool('test_tool')).resolves.not.toThrow()
    })

    it('should emit unregistration event', async () => {
      const eventSpy = vi.fn()
      registryService.on('tool.unregistered', eventSpy)

      await registryService.unregisterTool('test_tool')

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool.unregistered',
          toolId: 'test_tool',
        })
      )
    })
  })

  describe('updateTool', () => {
    it('should update tool successfully', async () => {
      const updates = {
        displayName: 'Updated Test Tool',
        description: 'An updated test tool',
      }

      await expect(registryService.updateTool('test_tool', updates)).resolves.not.toThrow()
    })

    it('should emit update event', async () => {
      const eventSpy = vi.fn()
      registryService.on('tool.updated', eventSpy)

      const updates = { displayName: 'Updated Tool' }
      await registryService.updateTool('test_tool', updates)

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool.updated',
          toolId: 'test_tool',
          data: updates,
        })
      )
    })
  })

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'A test category',
        sortOrder: 1,
      }

      const result = await registryService.createCategory(categoryData)
      expect(result).toBeDefined()
    })
  })

  describe('checkToolHealth', () => {
    it('should perform health check', async () => {
      // Mock getTool to return a tool
      vi.spyOn(registryService, 'getTool').mockResolvedValue({
        ...mockToolDefinition,
        category: undefined,
        analytics: {
          usageCount: 0,
          successRate: 0,
          avgExecutionTimeMs: 0,
          errorRate: 0,
          popularityScore: 0,
          reviewCount: 0,
        },
        healthStatus: {
          status: 'unknown',
          lastCheckTime: new Date(),
        },
      })

      const health = await registryService.checkToolHealth('test_tool')

      expect(health).toBeDefined()
      expect(health.status).toMatch(/healthy|warning|error/)
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockDb = await vi.importMock('@/packages/db')
      mockDb.db.insert.mockImplementation(() => {
        throw new Error('Database error')
      })

      await expect(registryService.registerTool(mockToolDefinition)).rejects.toThrow(
        'Database error'
      )
    })
  })
})
