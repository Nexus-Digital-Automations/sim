/**
 * Universal Tool Adapter System - Chart Display Component
 *
 * Interactive chart visualization component with responsive design,
 * multiple chart types, and data exploration capabilities.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { BarChart3, LineChart, PieChart, TrendingUp, Download, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { ChartContent } from '../../types'

interface ChartDisplayProps {
  content: ChartContent
  onAction?: (action: string, params?: any) => void
  compact?: boolean
  className?: string
}

// Simulated chart icons for different types
const chartTypeIcons = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: TrendingUp,
  scatter: TrendingUp,
  histogram: BarChart3,
  heatmap: TrendingUp,
  treemap: TrendingUp,
}

export function ChartDisplay({ content, onAction, compact = false, className }: ChartDisplayProps) {
  const [selectedChartType, setSelectedChartType] = useState(content.chartType)
  const [showDataTable, setShowDataTable] = useState(false)

  // Calculate chart statistics
  const stats = useMemo(() => {
    if (!content.data || content.data.length === 0) return null

    const numericalFields = Object.keys(content.data[0]).filter(key =>
      key !== 'x' && key !== 'label' &&
      content.data.some(item => typeof item[key] === 'number')
    )

    if (numericalFields.length === 0) return null

    const primaryField = content.config.yAxis as string || numericalFields[0]
    const values = content.data
      .map(item => item[primaryField])
      .filter(val => typeof val === 'number')

    if (values.length === 0) return null

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      total: values.reduce((sum, val) => sum + val, 0),
      count: values.length,
      field: primaryField,
    }
  }, [content.data, content.config])

  const handleChartTypeChange = (newType: string) => {
    setSelectedChartType(newType as ChartContent['chartType'])
    onAction?.('chart_type_changed', { previousType: selectedChartType, newType })
  }

  const exportChart = () => {
    // In a real implementation, this would export the chart as image
    onAction?.('chart_exported', { type: selectedChartType, format: 'png' })
  }

  const exportData = () => {
    const csv = [
      Object.keys(content.data[0]).join(','),
      ...content.data.map(row =>
        Object.values(row).map(value =>
          typeof value === 'string' && value.includes(',')
            ? `"${value.replace(/"/g, '""')}"`
            : String(value)
        ).join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chart-data.csv'
    a.click()
    URL.revokeObjectURL(url)

    onAction?.('chart_data_exported', { format: 'csv', rowCount: content.data.length })
  }

  const ChartIcon = chartTypeIcons[selectedChartType] || BarChart3

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          {content.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ChartIcon className="h-5 w-5" />
              {content.title}
            </h3>
          )}
          {content.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {content.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <Select value={selectedChartType} onValueChange={handleChartTypeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="scatter">Scatter Plot</SelectItem>
              <SelectItem value="histogram">Histogram</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDataTable(!showDataTable)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {showDataTable ? 'Hide' : 'Show'} Data
          </Button>

          <Button variant="outline" size="sm" onClick={exportChart}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.count}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Data Points</div>
          </Card>

          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {typeof stats.max === 'number' ? stats.max.toLocaleString() : stats.max}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Maximum</div>
          </Card>

          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {typeof stats.avg === 'number' ? stats.avg.toFixed(1) : stats.avg}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
          </Card>

          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {typeof stats.total === 'number' ? stats.total.toLocaleString() : stats.total}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </Card>
        </div>
      )}

      {/* Chart Container */}
      <Card>
        <CardContent className="p-6">
          <div
            className="w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center"
            style={{
              height: compact ? '200px' : content.dimensions?.height || '400px',
              minHeight: '200px'
            }}
          >
            {/* Placeholder for actual chart library integration */}
            <div className="text-center space-y-4">
              <ChartIcon className="h-16 w-16 mx-auto text-gray-400" />
              <div>
                <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)} Chart
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {content.data.length} data points • {content.config.yAxis} vs {content.config.xAxis}
                </div>
              </div>

              {/* Chart would render here with actual library like Recharts */}
              <div className="text-xs text-gray-400">
                Chart visualization would render here with actual data
              </div>
            </div>
          </div>

          {/* Chart Legend */}
          {content.config.legend && Array.isArray(content.config.yAxis) && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {(content.config.yAxis as string[]).map((series, index) => (
                <div key={series} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor: content.config.colors?.[index] || `hsl(${index * 60}, 70%, 50%)`
                    }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {series.charAt(0).toUpperCase() + series.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {showDataTable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Chart Data
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {Object.keys(content.data[0] || {}).map(key => (
                      <th key={key} className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {content.data.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="px-3 py-2 text-gray-900 dark:text-gray-100">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {content.data.length > 10 && (
                <div className="text-center py-3 text-sm text-gray-500 dark:text-gray-400">
                  Showing first 10 of {content.data.length} rows
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart Insights */}
      {stats && !compact && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
              Data Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Range:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">
                  {stats.min.toLocaleString()} - {stats.max.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Variance:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">
                  {((stats.max - stats.min) / stats.avg * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}