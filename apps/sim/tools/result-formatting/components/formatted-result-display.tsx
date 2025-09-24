/**
 * Universal Tool Adapter System - Formatted Result Display
 *
 * Main component for displaying formatted results with interactive elements,
 * progressive disclosure, and mobile-optimized responsive design.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Eye, Download, Share, Copy, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// Import individual formatters
import { TextDisplay } from './displays/text-display'
import { TableDisplay } from './displays/table-display'
import { ChartDisplay } from './displays/chart-display'
import { CardDisplay } from './displays/card-display'
import { ImageDisplay } from './displays/image-display'

import type { FormattedResult } from '../types'

interface FormattedResultDisplayProps {
  result: FormattedResult
  className?: string
  compact?: boolean
  showMetadata?: boolean
  onAction?: (action: string, parameters?: Record<string, any>) => void
}

export function FormattedResultDisplay({
  result,
  className,
  compact = false,
  showMetadata = false,
  onAction,
}: FormattedResultDisplayProps) {
  const [selectedView, setSelectedView] = useState<string>(result.format)
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [showFullSummary, setShowFullSummary] = useState(false)

  // Prepare available views
  const availableViews = useMemo(() => {
    const views = [
      {
        id: result.format,
        label: formatTypeLabel(result.format),
        content: result.content,
        priority: 100,
      },
      ...result.representations.map((rep, index) => ({
        id: `${rep.format}_${index}`,
        label: rep.label,
        content: rep.content,
        priority: rep.priority,
      })),
    ]

    return views.sort((a, b) => b.priority - a.priority)
  }, [result])

  const currentView = availableViews.find(view => view.id === selectedView) || availableViews[0]

  const handleAction = (action: string, parameters?: Record<string, any>) => {
    onAction?.(action, parameters)
  }

  const copyToClipboard = async () => {
    try {
      const textContent = result.format === 'text'
        ? (result.content as any).text
        : JSON.stringify(result.content, null, 2)

      await navigator.clipboard.writeText(textContent)
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Result Summary */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {result.summary.headline}
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {showFullSummary ? result.summary.description : (
                  result.summary.description.length > 100
                    ? `${result.summary.description.substring(0, 100)}...`
                    : result.summary.description
                )}
                {result.summary.description.length > 100 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowFullSummary(!showFullSummary)}
                    className="p-0 h-auto ml-1 text-blue-600 dark:text-blue-400"
                  >
                    {showFullSummary ? 'Show less' : 'Show more'}
                  </Button>
                )}
              </CardDescription>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 ml-4">
              <div className="flex gap-1">
                {result.summary.highlights.map((highlight, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {highlight}
                  </Badge>
                ))}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Result
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('share')}>
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('download')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Suggestions */}
          {result.summary.suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.summary.suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('suggestion', { suggestion })}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Content Display */}
      <Card>
        {availableViews.length > 1 && (
          <CardHeader className="pb-0">
            <Tabs value={selectedView} onValueChange={setSelectedView}>
              <TabsList className="grid w-full grid-cols-auto gap-1">
                {availableViews.map((view) => (
                  <TabsTrigger
                    key={view.id}
                    value={view.id}
                    className="text-sm"
                  >
                    {view.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
        )}

        <CardContent className={cn('p-6', availableViews.length <= 1 && 'pt-6')}>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            {compact && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 mb-4">
                  <span className="font-medium">
                    {currentView.content.title || formatTypeLabel(currentView.content.type)}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}

            <CollapsibleContent>
              <div className="space-y-4">
                {renderContent(currentView.content, { onAction: handleAction, compact })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Metadata (if enabled) */}
      {showMetadata && result.metadata && (
        <Card className="bg-gray-50 dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Formatted:</span>
                <span className="ml-2">
                  {new Date(result.metadata.formattedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Processing:</span>
                <span className="ml-2">{result.metadata.processingTime}ms</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Version:</span>
                <span className="ml-2">{result.metadata.version}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Quality:</span>
                <span className="ml-2">{(result.metadata.qualityScore * 100).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {result.errors && result.errors.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">
              Formatting Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {result.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-700 dark:text-red-300">
                  <span className="font-medium">{error.type}:</span> {error.message}
                  {error.field && <span className="ml-2 text-red-600 dark:text-red-400">({error.field})</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Content rendering function
function renderContent(
  content: any,
  options: { onAction?: (action: string, params?: any) => void; compact?: boolean } = {}
) {
  switch (content.type) {
    case 'text':
      return <TextDisplay content={content} {...options} />

    case 'table':
      return <TableDisplay content={content} {...options} />

    case 'chart':
      return <ChartDisplay content={content} {...options} />

    case 'card':
      return <CardDisplay content={content} {...options} />

    case 'image':
      return <ImageDisplay content={content} {...options} />

    case 'json':
      return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(content.data, null, 2)}
          </pre>
        </div>
      )

    case 'markdown':
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {/* Would render markdown here - using simple pre for now */}
          <pre className="whitespace-pre-wrap">{content.markdown}</pre>
        </div>
      )

    default:
      return (
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          Unsupported content type: {content.type}
        </div>
      )
  }
}

// Utility function to format type labels
function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}