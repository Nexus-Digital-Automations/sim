/**
 * Universal Tool Adapter System - Integration Example
 *
 * Complete example showing how to integrate the result formatting system
 * with the Sim platform and conversation interface.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Import the result formatting system
import {
  defaultFormatterService,
  FormattedResultDisplay,
  formatToolResult,
} from '../index'

import type { ToolResponse, ToolConfig } from '@/tools/types'

/**
 * Example integration component showing how to use the result formatting system
 * in a conversational interface like Sim's chat.
 */
export function ResultFormattingIntegrationExample() {
  const [results, setResults] = useState<Array<{
    id: string
    toolResult: any
    toolConfig: ToolConfig
    formattedResult?: any
    isFormatting?: boolean
    error?: string
  }>>([])

  // Simulate tool execution and result formatting
  const executeExampleTool = useCallback(async (toolType: string) => {
    const toolId = `${toolType}_${Date.now()}`

    // Mock tool configurations and results
    const examples = {
      database: {
        config: {
          id: 'mysql_query',
          name: 'MySQL Database Query',
          description: 'Execute SQL queries against MySQL database',
        },
        result: {
          success: true,
          output: [
            { id: 1, name: 'John Doe', email: 'john@example.com', department: 'Engineering', salary: 95000, join_date: '2022-01-15' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', department: 'Marketing', salary: 87000, join_date: '2022-03-22' },
            { id: 3, name: 'Bob Wilson', email: 'bob@example.com', department: 'Sales', salary: 92000, join_date: '2021-11-08' },
            { id: 4, name: 'Alice Brown', email: 'alice@example.com', department: 'Engineering', salary: 98000, join_date: '2021-09-12' },
            { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', department: 'HR', salary: 75000, join_date: '2023-02-01' },
          ],
          timing: { duration: 245, startTime: Date.now() - 245, endTime: Date.now() }
        }
      },

      analytics: {
        config: {
          id: 'sales_analytics',
          name: 'Sales Analytics',
          description: 'Generate sales performance analytics and charts',
        },
        result: {
          success: true,
          output: {
            data: [
              { month: 'Jan', revenue: 125000, expenses: 80000, profit: 45000 },
              { month: 'Feb', revenue: 142000, expenses: 85000, profit: 57000 },
              { month: 'Mar', revenue: 158000, expenses: 92000, profit: 66000 },
              { month: 'Apr', revenue: 134000, expenses: 88000, profit: 46000 },
              { month: 'May', revenue: 167000, expenses: 95000, profit: 72000 },
              { month: 'Jun', revenue: 189000, expenses: 98000, profit: 91000 },
            ],
            summary: 'Sales performance showing strong growth trajectory with increasing profit margins.'
          },
          timing: { duration: 1200, startTime: Date.now() - 1200, endTime: Date.now() }
        }
      },

      search: {
        config: {
          id: 'product_search',
          name: 'Product Search',
          description: 'Search product catalog with advanced filtering',
        },
        result: {
          success: true,
          output: {
            results: [
              {
                id: 'prod-001',
                name: 'Wireless Bluetooth Headphones',
                description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
                price: 199.99,
                category: 'Electronics',
                rating: 4.5,
                image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
                url: 'https://example.com/products/prod-001'
              },
              {
                id: 'prod-002',
                name: 'Smart Fitness Watch',
                description: 'Advanced fitness tracking with heart rate monitoring, GPS, and waterproof design.',
                price: 299.99,
                category: 'Wearables',
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400',
                url: 'https://example.com/products/prod-002'
              },
              {
                id: 'prod-003',
                name: 'Portable Power Bank',
                description: '20000mAh portable charger with fast charging and multiple ports.',
                price: 49.99,
                category: 'Accessories',
                rating: 4.2,
                image: 'https://images.unsplash.com/photo-1609592817505-0f1956f8c131?w=400',
                url: 'https://example.com/products/prod-003'
              }
            ],
            total: 3,
            query: 'wireless technology'
          },
          timing: { duration: 450, startTime: Date.now() - 450, endTime: Date.now() }
        }
      },

      image: {
        config: {
          id: 'image_generator',
          name: 'AI Image Generator',
          description: 'Generate images using AI based on text prompts',
        },
        result: {
          success: true,
          output: {
            url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&h=600',
            width: 800,
            height: 600,
            mimeType: 'image/jpeg',
            prompt: 'A futuristic city skyline at sunset with flying cars',
            style: 'cyberpunk',
            generated_at: new Date().toISOString()
          },
          timing: { duration: 3200, startTime: Date.now() - 3200, endTime: Date.now() }
        }
      },

      error: {
        config: {
          id: 'failing_tool',
          name: 'Example Failing Tool',
          description: 'Tool that demonstrates error handling',
        },
        result: {
          success: false,
          error: 'Connection timeout: Unable to connect to external API after 30 seconds',
          timing: { duration: 30000, startTime: Date.now() - 30000, endTime: Date.now() }
        }
      }
    }

    const example = examples[toolType as keyof typeof examples]
    if (!example) return

    // Add to results with loading state
    const newResult = {
      id: toolId,
      toolResult: example.result,
      toolConfig: example.config,
      isFormatting: true,
    }

    setResults(prev => [...prev, newResult])

    try {
      // Format the result using the formatting system
      const formatted = await formatToolResult(
        example.result,
        example.config,
        {
          displayMode: 'detailed',
          targetAudience: 'general',
          conversationId: 'example-conversation',
          userId: 'example-user',
        }
      )

      // Update with formatted result
      setResults(prev => prev.map(r =>
        r.id === toolId
          ? { ...r, formattedResult: formatted, isFormatting: false }
          : r
      ))

    } catch (error) {
      // Handle formatting errors
      setResults(prev => prev.map(r =>
        r.id === toolId
          ? { ...r, error: (error as Error).message, isFormatting: false }
          : r
      ))
    }
  }, [])

  const handleResultAction = useCallback((action: string, params?: any) => {
    console.log('Result action:', action, params)

    // Handle different actions that come from the formatted results
    switch (action) {
      case 'download':
        console.log('Downloading result...', params)
        break

      case 'share':
        console.log('Sharing result...', params)
        break

      case 'copy_success':
        console.log('Content copied to clipboard successfully')
        break

      case 'table_exported':
        console.log('Table exported:', params)
        break

      case 'chart_type_changed':
        console.log('Chart type changed:', params)
        break

      case 'url_clicked':
        console.log('URL clicked:', params.url)
        break

      case 'email_clicked':
        console.log('Email clicked:', params.email)
        break

      case 'image_zoomed':
        console.log('Image zoomed:', params)
        break

      default:
        console.log('Unhandled action:', action, params)
    }
  }, [])

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Result Formatting System - Integration Example</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This example demonstrates how to integrate the Universal Tool Adapter Result Formatting System
            with the Sim platform. Click the buttons below to simulate different tool executions and see
            how their results are automatically formatted for optimal conversation experience.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button onClick={() => executeExampleTool('database')} variant="outline">
              📊 Database Query
            </Button>
            <Button onClick={() => executeExampleTool('analytics')} variant="outline">
              📈 Sales Analytics
            </Button>
            <Button onClick={() => executeExampleTool('search')} variant="outline">
              🔍 Product Search
            </Button>
            <Button onClick={() => executeExampleTool('image')} variant="outline">
              🎨 Image Generation
            </Button>
            <Button onClick={() => executeExampleTool('error')} variant="outline">
              ❌ Error Example
            </Button>
          </div>

          {results.length > 0 && (
            <Button onClick={clearResults} variant="ghost" size="sm">
              Clear All Results
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      <div className="space-y-6">
        {results.map((result) => (
          <div key={result.id}>
            {/* Tool Execution Info */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">{result.toolConfig.name}</Badge>
              {result.isFormatting && (
                <Badge variant="outline">Formatting...</Badge>
              )}
              {result.error && (
                <Badge variant="destructive">Format Error</Badge>
              )}
              {result.formattedResult && (
                <Badge variant="default">
                  Quality: {(result.formattedResult.metadata.qualityScore * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            {/* Formatted Result */}
            {result.formattedResult ? (
              <FormattedResultDisplay
                result={result.formattedResult}
                onAction={handleResultAction}
                showMetadata={true}
              />
            ) : result.error ? (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardContent className="p-6">
                  <div className="text-red-600 dark:text-red-400">
                    <div className="font-medium">Formatting Error</div>
                    <div className="text-sm mt-1">{result.error}</div>
                  </div>
                </CardContent>
              </Card>
            ) : result.isFormatting ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    Formatting result...
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ))}
      </div>

      {/* System Information */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 text-base">
            System Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">Supported Formats</div>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Interactive Tables (sorting, filtering, pagination)</li>
                <li>• Charts & Visualizations (multiple chart types)</li>
                <li>• Rich Cards (grid, list, masonry layouts)</li>
                <li>• Advanced Images (zoom, rotate, metadata)</li>
                <li>• Smart Text (reading time, word count)</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">Key Features</div>
              <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• Automatic format detection</li>
                <li>• Context-aware formatting</li>
                <li>• Natural language summaries</li>
                <li>• Progressive disclosure</li>
                <li>• Mobile-optimized responsive design</li>
                <li>• Export & sharing capabilities</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}