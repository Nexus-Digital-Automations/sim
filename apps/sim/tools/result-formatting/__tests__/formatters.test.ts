/**
 * Universal Tool Adapter System - Formatter Tests
 *
 * Comprehensive test suite for all result formatters ensuring correct behavior,
 * quality standards, and conversational presentation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ToolConfig, ToolResponse } from '@/tools/types'
import { ChartFormatter } from '../formatters/chart-formatter'
import { JsonFormatter } from '../formatters/json-formatter'
import { TableFormatter } from '../formatters/table-formatter'
import { TextFormatter } from '../formatters/text-formatter'
import type { FormatContext } from '../types'

// Mock logger to avoid console output in tests
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('Result Formatters', () => {
  let mockToolConfig: ToolConfig
  let mockContext: FormatContext

  beforeEach(() => {
    mockToolConfig = {
      id: 'test_tool',
      name: 'Test Tool',
      description: 'A tool for testing purposes',
      version: '1.0.0',
      params: {},
      request: {
        url: '/api/test',
        method: 'POST',
        headers: () => ({ 'Content-Type': 'application/json' }),
      },
    }

    mockContext = {
      toolId: 'test_tool',
      toolConfig: mockToolConfig,
      displayMode: 'detailed',
      targetAudience: 'general',
      locale: 'en-US',
      timezone: 'UTC',
    }
  })

  describe('TextFormatter', () => {
    let formatter: TextFormatter

    beforeEach(() => {
      formatter = new TextFormatter()
    })

    it('should format successful string result', async () => {
      const result: ToolResponse = {
        success: true,
        output: 'Hello, world!',
      }

      expect(formatter.canFormat(result, mockContext)).toBe(true)

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.format).toBe('text')
      expect(formatted.content.type).toBe('text')
      expect(formatted.content.text).toBe('Hello, world!')
      expect(formatted.summary.headline).toContain('Test Tool completed successfully')
      expect(formatted.metadata.qualityScore).toBeGreaterThan(0.5)
    })

    it('should format error result', async () => {
      const result: ToolResponse = {
        success: false,
        output: {},
        error: 'Something went wrong',
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.format).toBe('text')
      expect(formatted.content.text).toContain('Something went wrong')
      expect(formatted.summary.headline).toContain('failed with an error')
    })

    it('should format object result', async () => {
      const result: ToolResponse = {
        success: true,
        output: {
          id: 123,
          name: 'John Doe',
          email: 'john@example.com',
          status: 'active',
        },
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.content.text).toContain('Id: 123')
      expect(formatted.content.text).toContain('Name: John Doe')
      expect(formatted.content.text).toContain('Email: john@example.com')
      expect(formatted.content.text).toContain('Status: active')
    })

    it('should format array result', async () => {
      const result: ToolResponse = {
        success: true,
        output: ['apple', 'banana', 'cherry'],
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.content.text).toContain('3 items')
      expect(formatted.content.text).toContain('1. apple')
      expect(formatted.content.text).toContain('2. banana')
      expect(formatted.content.text).toContain('3. cherry')
    })

    it('should generate appropriate suggestions', async () => {
      const result: ToolResponse = {
        success: true,
        output: { results: [], total: 0 },
      }

      const searchContext = { ...mockContext, toolId: 'search_tool' }
      const formatted = await formatter.format(result, searchContext)

      expect(formatted.summary.suggestions).toContain('Try different search terms')
    })

    it('should handle markdown representation for rich text', async () => {
      const result: ToolResponse = {
        success: true,
        output:
          'This is a long text with multiple paragraphs.\n\nIt has URLs like https://example.com and lists:\n* Item 1\n* Item 2',
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.representations).toHaveLength(2)
      const markdownRep = formatted.representations.find((r) => r.format === 'markdown')
      expect(markdownRep).toBeDefined()
      expect(markdownRep?.content.markdown).toContain('[https://example.com](https://example.com)')
    })
  })

  describe('TableFormatter', () => {
    let formatter: TableFormatter

    beforeEach(() => {
      formatter = new TableFormatter()
    })

    it('should format array of objects as table', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          { id: 1, name: 'Alice', age: 30, active: true },
          { id: 2, name: 'Bob', age: 25, active: false },
          { id: 3, name: 'Charlie', age: 35, active: true },
        ],
      }

      expect(formatter.canFormat(result, mockContext)).toBe(true)

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.format).toBe('table')
      expect(formatted.content.type).toBe('table')
      expect(formatted.content.rows).toHaveLength(3)
      expect(formatted.content.columns).toHaveLength(4) // id, name, age, active
      expect(formatted.summary.headline).toContain('3 records')
    })

    it('should detect appropriate column types', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          {
            id: 1,
            email: 'test@example.com',
            created: '2023-01-01T00:00:00Z',
            score: 95.5,
            active: true,
          },
        ],
      }

      const formatted = await formatter.format(result, mockContext)
      const content = formatted.content as any

      const idColumn = content.columns.find((c: any) => c.key === 'id')
      const emailColumn = content.columns.find((c: any) => c.key === 'email')
      const dateColumn = content.columns.find((c: any) => c.key === 'created')
      const scoreColumn = content.columns.find((c: any) => c.key === 'score')
      const boolColumn = content.columns.find((c: any) => c.key === 'active')

      expect(idColumn.type).toBe('number')
      expect(emailColumn.type).toBe('email')
      expect(dateColumn.type).toBe('date')
      expect(scoreColumn.type).toBe('number')
      expect(boolColumn.type).toBe('boolean')
    })

    it('should handle empty array', async () => {
      const result: ToolResponse = {
        success: true,
        output: [],
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.content.rows).toHaveLength(0)
      expect(formatted.content.columns).toHaveLength(0)
      expect(formatted.summary.headline).toContain('0 records')
    })

    it('should create chart representation for numeric data', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          { category: 'A', value: 10 },
          { category: 'B', value: 20 },
          { category: 'C', value: 15 },
        ],
      }

      const formatted = await formatter.format(result, mockContext)
      const chartRep = formatted.representations.find((r) => r.format === 'chart')

      expect(chartRep).toBeDefined()
      expect(chartRep?.content.chartType).toBe('bar')
    })

    it('should add pagination for large datasets', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))
      const result: ToolResponse = {
        success: true,
        output: largeData,
      }

      const formatted = await formatter.format(result, mockContext)
      const content = formatted.content as any

      expect(content.pagination).toBeDefined()
      expect(content.pagination.totalRows).toBe(100)
      expect(content.pagination.pageSize).toBe(25)
      expect(content.pagination.totalPages).toBe(4)
    })

    it('should not format non-tabular data', async () => {
      const result: ToolResponse = {
        success: true,
        output: 'Just a string',
      }

      expect(formatter.canFormat(result, mockContext)).toBe(false)
    })
  })

  describe('JsonFormatter', () => {
    let formatter: JsonFormatter

    beforeEach(() => {
      formatter = new JsonFormatter()
    })

    it('should format complex nested object', async () => {
      const result: ToolResponse = {
        success: true,
        output: {
          user: {
            id: 123,
            profile: {
              name: 'John Doe',
              preferences: {
                theme: 'dark',
                language: 'en',
              },
            },
            activities: [
              { type: 'login', timestamp: '2023-01-01T10:00:00Z' },
              { type: 'logout', timestamp: '2023-01-01T18:00:00Z' },
            ],
          },
          meta: {
            total: 2,
            page: 1,
          },
        },
      }

      expect(formatter.canFormat(result, mockContext)).toBe(true)

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.format).toBe('json')
      expect(formatted.content.type).toBe('json')
      expect(formatted.content.data).toEqual(result.output)
      expect(formatted.content.schema).toBeDefined()
      expect(formatted.content.displayHints?.highlightFields).toContain('total')
    })

    it('should generate appropriate schema', async () => {
      const result: ToolResponse = {
        success: true,
        output: {
          id: 123,
          name: 'Test',
          tags: ['a', 'b', 'c'],
          metadata: {
            created: '2023-01-01',
            version: 1,
          },
        },
      }

      const formatted = await formatter.format(result, mockContext)
      const schema = formatted.content.schema

      expect(schema.type).toBe('object')
      expect(schema.properties.id.type).toBe('number')
      expect(schema.properties.name.type).toBe('string')
      expect(schema.properties.tags.type).toBe('array')
      expect(schema.properties.metadata.type).toBe('object')
    })

    it('should detect string formats', async () => {
      const result: ToolResponse = {
        success: true,
        output: {
          email: 'test@example.com',
          website: 'https://example.com',
          date: '2023-01-01T10:00:00Z',
          uuid: '550e8400-e29b-41d4-a716-446655440000',
        },
      }

      const formatted = await formatter.format(result, mockContext)
      const schema = formatted.content.schema

      expect(schema.properties.email.format).toBe('email')
      expect(schema.properties.website.format).toBe('url')
      expect(schema.properties.date.format).toBe('date-time')
      expect(schema.properties.uuid.format).toBe('uuid')
    })

    it('should prefer JSON for deeply nested data', async () => {
      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      }

      const result: ToolResponse = {
        success: true,
        output: deepData,
      }

      expect(formatter.canFormat(result, mockContext)).toBe(true)
    })

    it('should create table representation for suitable data', async () => {
      const result: ToolResponse = {
        success: true,
        output: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        },
      }

      const formatted = await formatter.format(result, mockContext)
      const tableRep = formatted.representations.find((r) => r.format === 'table')

      expect(tableRep).toBeDefined()
    })

    it('should not format simple data types', async () => {
      const stringResult: ToolResponse = { success: true, output: 'simple string' }
      const numberResult: ToolResponse = { success: true, output: 42 }

      expect(formatter.canFormat(stringResult, mockContext)).toBe(false)
      expect(formatter.canFormat(numberResult, mockContext)).toBe(false)
    })
  })

  describe('ChartFormatter', () => {
    let formatter: ChartFormatter

    beforeEach(() => {
      formatter = new ChartFormatter()
    })

    it('should format numerical array data as chart', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          { category: 'Q1', revenue: 100000, expenses: 80000 },
          { category: 'Q2', revenue: 120000, expenses: 90000 },
          { category: 'Q3', revenue: 110000, expenses: 85000 },
          { category: 'Q4', revenue: 140000, expenses: 95000 },
        ],
      }

      expect(formatter.canFormat(result, mockContext)).toBe(true)

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.format).toBe('chart')
      expect(formatted.content.type).toBe('chart')
      expect(['bar', 'line', 'pie', 'scatter']).toContain(formatted.content.chartType)
      expect(formatted.content.data).toHaveLength(4)
      expect(formatted.summary.headline).toContain('chart')
    })

    it('should select appropriate chart type for time series data', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          { x: '2023-01-01', y: 100 },
          { x: '2023-01-02', y: 110 },
          { x: '2023-01-03', y: 95 },
        ],
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.content.chartType).toBe('line')
    })

    it('should create multiple representations for chart data', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          { name: 'Product A', sales: 1000 },
          { name: 'Product B', sales: 1500 },
        ],
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.representations.length).toBeGreaterThan(1)
      expect(formatted.representations.some((r) => r.format === 'table')).toBe(true)
      expect(formatted.representations.some((r) => r.format === 'text')).toBe(true)
    })

    it('should calculate statistics for numerical data', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          { category: 'A', value: 10 },
          { category: 'B', value: 20 },
          { category: 'C', value: 15 },
        ],
      }

      const formatted = await formatter.format(result, mockContext)

      expect(formatted.summary.highlights).toContain('3 data points')
      expect(formatted.summary.description).toContain('ranges from')
    })

    it('should not format non-numerical data', async () => {
      const result: ToolResponse = {
        success: true,
        output: ['text', 'more text', 'even more text'],
      }

      expect(formatter.canFormat(result, mockContext)).toBe(false)
    })

    it('should handle insufficient data gracefully', async () => {
      const result: ToolResponse = {
        success: true,
        output: [{ value: 42 }], // Only one data point
      }

      expect(formatter.canFormat(result, mockContext)).toBe(false)
    })

    it('should generate appropriate chart config', async () => {
      const result: ToolResponse = {
        success: true,
        output: [
          { category: 'A', revenue: 100, expenses: 80 },
          { category: 'B', revenue: 120, expenses: 90 },
        ],
      }

      const formatted = await formatter.format(result, mockContext)
      const config = formatted.content.config

      expect(config.xAxis).toBeDefined()
      expect(config.yAxis).toBeDefined()
      expect(config.colors).toBeDefined()
      expect(config.tooltips).toBe(true)
      expect(config.responsive).toBe(true)
    })
  })

  describe('Formatter Quality and Validation', () => {
    it('should generate high-quality summaries', async () => {
      const formatter = new TextFormatter()
      const result: ToolResponse = {
        success: true,
        output: { message: 'Task completed', id: 'task_123', status: 'done' },
      }

      const formatted = await formatter.format(result, mockContext)

      // Check summary quality
      expect(formatted.summary.headline).toBeTruthy()
      expect(formatted.summary.headline.length).toBeGreaterThan(10)
      expect(formatted.summary.description).toBeTruthy()
      expect(formatted.summary.description.length).toBeGreaterThan(20)
      expect(formatted.summary.highlights).toBeDefined()
      expect(formatted.summary.suggestions).toBeDefined()
    })

    it('should maintain quality scores above threshold', async () => {
      const formatters = [new TextFormatter(), new TableFormatter(), new JsonFormatter()]

      for (const formatter of formatters) {
        const result: ToolResponse = {
          success: true,
          output: { test: 'data', value: 123 },
        }

        if (formatter.canFormat(result, mockContext)) {
          const formatted = await formatter.format(result, mockContext)
          expect(formatted.metadata.qualityScore).toBeGreaterThanOrEqual(0.5)
        }
      }
    })

    it('should provide multiple representations when appropriate', async () => {
      const tableFormatter = new TableFormatter()
      const result: ToolResponse = {
        success: true,
        output: [
          { name: 'Product A', sales: 100 },
          { name: 'Product B', sales: 150 },
        ],
      }

      const formatted = await tableFormatter.format(result, mockContext)

      expect(formatted.representations.length).toBeGreaterThan(1)
      expect(formatted.representations.some((r) => r.format === 'chart')).toBe(true)
      expect(formatted.representations.some((r) => r.format === 'json')).toBe(true)
    })

    it('should handle edge cases gracefully', async () => {
      const formatter = new TextFormatter()

      // Empty result
      const emptyResult: ToolResponse = { success: true, output: null }
      const emptyFormatted = await formatter.format(emptyResult, mockContext)
      expect(emptyFormatted.summary.headline).toBeTruthy()

      // Very large result
      const largeData = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
      const largeResult: ToolResponse = { success: true, output: largeData }
      const largeFormatted = await formatter.format(largeResult, mockContext)
      expect(largeFormatted.summary.highlights).toContain('1000 items')
    })
  })

  describe('Context-Aware Formatting', () => {
    it('should adapt to display mode', async () => {
      const formatter = new JsonFormatter()
      const result: ToolResponse = {
        success: true,
        output: { deep: { nested: { data: { value: 1 } } } },
      }

      const compactContext = { ...mockContext, displayMode: 'compact' as const }
      const detailedContext = { ...mockContext, displayMode: 'detailed' as const }

      const compactFormatted = await formatter.format(result, compactContext)
      const detailedFormatted = await formatter.format(result, detailedContext)

      expect(compactFormatted.content.displayHints?.maxDepth).toBeLessThan(
        detailedFormatted.content.displayHints?.maxDepth || 0
      )
    })

    it('should consider target audience', async () => {
      const formatter = new TextFormatter()
      const result: ToolResponse = {
        success: true,
        output: { api_response: 'success', status_code: 200 },
      }

      const technicalContext = { ...mockContext, targetAudience: 'technical' as const }
      const businessContext = { ...mockContext, targetAudience: 'business' as const }

      const technicalFormatted = await formatter.format(result, technicalContext)
      const businessFormatted = await formatter.format(result, businessContext)

      // Both should work, but might have different presentations
      expect(technicalFormatted.summary.headline).toBeTruthy()
      expect(businessFormatted.summary.headline).toBeTruthy()
    })

    it('should handle different locales', async () => {
      const formatter = new TextFormatter()
      const result: ToolResponse = {
        success: true,
        output: { count: 1234.56 },
      }

      const usContext = { ...mockContext, locale: 'en-US' }
      const formatted = await formatter.format(result, usContext)

      expect(formatted.content.text).toContain('1,234.56')
    })
  })

  describe('Performance and Reliability', () => {
    it('should complete formatting within reasonable time', async () => {
      const formatter = new TextFormatter()
      const largeResult: ToolResponse = {
        success: true,
        output: Array.from({ length: 10000 }, (_, i) => ({ id: i, data: `item_${i}` })),
      }

      const startTime = Date.now()
      const formatted = await formatter.format(largeResult, mockContext)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(formatted.metadata.processingTime).toBeLessThan(duration)
    })

    it('should handle malformed data gracefully', async () => {
      const formatter = new JsonFormatter()

      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj

      // This should not cause infinite recursion
      const result: ToolResponse = {
        success: true,
        output: { circular: circularObj },
      }

      // The formatter should handle this without throwing
      await expect(formatter.format(result, mockContext)).resolves.toBeDefined()
    })

    it('should maintain consistent behavior across multiple calls', async () => {
      const formatter = new TableFormatter()
      const result: ToolResponse = {
        success: true,
        output: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      }

      const formatted1 = await formatter.format(result, mockContext)
      const formatted2 = await formatter.format(result, mockContext)

      expect(formatted1.format).toBe(formatted2.format)
      expect(formatted1.content.columns).toEqual(formatted2.content.columns)
      expect(formatted1.content.rows).toEqual(formatted2.content.rows)
    })
  })
})
