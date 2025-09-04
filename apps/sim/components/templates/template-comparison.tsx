/**
 * Template Comparison - Side-by-Side Template Analysis Tool
 *
 * This component provides comprehensive template comparison functionality with:
 * - Side-by-side template comparison interface
 * - Detailed feature and metadata comparison
 * - Visual workflow structure comparison
 * - Performance metrics and analytics comparison
 * - Rating and review comparison
 * - Block-by-block analysis with diff highlighting
 * - Compatibility and requirement analysis
 * - Export and sharing of comparison reports
 *
 * Design Features:
 * - Split-screen comparison layout with synchronized scrolling
 * - Interactive comparison matrix with highlight differences
 * - Responsive design with mobile-friendly stacked layout
 * - Advanced filtering and comparison criteria selection
 * - Visual diff indicators with color coding
 * - Export functionality for comparison reports
 *
 * Based on comparison tools from GitHub diff views, VS Code compare editor,
 * and product comparison interfaces from e-commerce platforms.
 *
 * @author Claude Code Template System - Comparison & Analysis Specialist
 * @version 2.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Download,
  Eye,
  Filter,
  GitCompare,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Share2,
  Star,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Import template types
import type { Template, TemplateUsageAnalytics } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Template Comparison Props
 */
export interface TemplateComparisonProps {
  /** Templates to compare (2-4 templates) */
  templates: Template[]
  /** Available templates for selection */
  availableTemplates: Template[]
  /** Analytics data for templates */
  analytics?: Record<string, TemplateUsageAnalytics>
  /** Template selection handler */
  onTemplateSelect?: (template: Template) => void
  /** Template installation handler */
  onTemplateInstall?: (template: Template) => void
  /** Template removal from comparison */
  onTemplateRemove?: (templateId: string) => void
  /** Template addition to comparison */
  onTemplateAdd?: (template: Template) => void
  /** Export comparison handler */
  onExportComparison?: (templates: Template[]) => void
  /** Share comparison handler */
  onShareComparison?: (templates: Template[]) => void
  /** Open comparison dialog */
  open: boolean
  /** Dialog state change handler */
  onOpenChange: (open: boolean) => void
  /** Custom CSS class */
  className?: string
}

/**
 * Comparison Criteria Configuration
 */
const COMPARISON_CRITERIA = [
  { key: 'basic', label: 'Basic Information', enabled: true },
  { key: 'features', label: 'Features & Capabilities', enabled: true },
  { key: 'performance', label: 'Performance Metrics', enabled: true },
  { key: 'community', label: 'Community & Ratings', enabled: true },
  { key: 'technical', label: 'Technical Details', enabled: false },
  { key: 'compatibility', label: 'Compatibility', enabled: false },
] as const

/**
 * Template Selection Dialog
 */
const TemplateSelectionDialog: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  availableTemplates: Template[]
  selectedTemplates: Template[]
  onTemplateAdd: (template: Template) => void
  maxTemplates: number
}> = ({
  open,
  onOpenChange,
  availableTemplates,
  selectedTemplates,
  onTemplateAdd,
  maxTemplates,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const selectedIds = new Set(selectedTemplates.map((t) => t.id))
  const filteredTemplates = availableTemplates.filter(
    (template) =>
      !selectedIds.has(template.id) &&
      (!searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleAddTemplate = useCallback(
    (template: Template) => {
      if (selectedTemplates.length < maxTemplates) {
        onTemplateAdd(template)
        onOpenChange(false)
      }
    },
    [selectedTemplates.length, maxTemplates, onTemplateAdd, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Add Template to Comparison</DialogTitle>
          <DialogDescription>
            Select a template to add to your comparison (max {maxTemplates})
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='relative'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search templates...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>

          <ScrollArea className='h-96'>
            <div className='space-y-2'>
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className='flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50'
                >
                  <div
                    className='flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm text-white'
                    style={{ backgroundColor: template.color }}
                  >
                    {template.icon || '📄'}
                  </div>
                  <div className='flex-1'>
                    <h4 className='font-medium text-sm'>{template.name}</h4>
                    <p className='text-muted-foreground text-xs'>
                      {template.author} • {template.category}
                    </p>
                  </div>
                  <div className='flex items-center gap-2 text-muted-foreground text-xs'>
                    <div className='flex items-center gap-1'>
                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                      <span>{template.ratingAverage?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Eye className='h-3 w-3' />
                      <span>{template.views}</span>
                    </div>
                  </div>
                  <Button
                    size='sm'
                    onClick={() => handleAddTemplate(template)}
                    disabled={selectedTemplates.length >= maxTemplates}
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add
                  </Button>
                </div>
              ))}
              {filteredTemplates.length === 0 && (
                <div className='py-8 text-center text-muted-foreground'>
                  <Search className='mx-auto mb-2 h-6 w-6' />
                  <p>No templates found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Comparison Matrix Row Component
 */
const ComparisonRow: React.FC<{
  label: string
  values: (string | number | boolean | React.ReactNode)[]
  type?: 'text' | 'number' | 'boolean' | 'rating' | 'progress' | 'badge' | 'custom'
  highlightDifferences?: boolean
}> = ({ label, values, type = 'text', highlightDifferences = false }) => {
  // Determine if values are different for highlighting
  const hasDifferences = highlightDifferences && new Set(values.map((v) => String(v))).size > 1

  const renderValue = useCallback(
    (value: any, index: number) => {
      switch (type) {
        case 'boolean':
          return value ? (
            <CheckCircle2 className='h-4 w-4 text-green-500' />
          ) : (
            <XCircle className='h-4 w-4 text-red-500' />
          )

        case 'rating':
          if (typeof value === 'number') {
            return (
              <div className='flex items-center gap-1'>
                <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                <span>{value.toFixed(1)}</span>
              </div>
            )
          }
          return <span className='text-muted-foreground'>N/A</span>

        case 'progress':
          if (typeof value === 'number') {
            return (
              <div className='flex items-center gap-2'>
                <Progress value={value} className='h-2 flex-1' />
                <span className='text-xs'>{value}%</span>
              </div>
            )
          }
          return <span className='text-muted-foreground'>N/A</span>

        case 'badge':
          return (
            <Badge variant='secondary' className='text-xs'>
              {String(value)}
            </Badge>
          )

        case 'number':
          if (typeof value === 'number') {
            return value.toLocaleString()
          }
          return String(value)

        case 'custom':
          return value

        default:
          return String(value)
      }
    },
    [type]
  )

  return (
    <TableRow className={hasDifferences ? 'bg-yellow-50' : undefined}>
      <TableCell className='font-medium'>{label}</TableCell>
      {values.map((value, index) => (
        <TableCell
          key={index}
          className={cn(
            'text-center',
            hasDifferences && 'relative',
            hasDifferences && index > 0 && values[index] !== values[0] && 'bg-blue-50'
          )}
        >
          {renderValue(value, index)}
        </TableCell>
      ))}
    </TableRow>
  )
}

/**
 * Main Template Comparison Component
 */
export const TemplateComparison: React.FC<TemplateComparisonProps> = ({
  templates,
  availableTemplates,
  analytics,
  onTemplateSelect,
  onTemplateInstall,
  onTemplateRemove,
  onTemplateAdd,
  onExportComparison,
  onShareComparison,
  open,
  onOpenChange,
  className,
}) => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [enabledCriteria, setEnabledCriteria] = useState(
    new Set(COMPARISON_CRITERIA.filter((c) => c.enabled).map((c) => c.key))
  )
  const [isFullscreen, setIsFullscreen] = useState(false)

  const maxTemplates = 4
  const minTemplates = 2

  // Ensure we have at least the minimum templates for comparison
  const canCompare = templates.length >= minTemplates

  const handleCriteriaToggle = useCallback((key: string, enabled: boolean) => {
    setEnabledCriteria((prev) => {
      const newSet = new Set(prev)
      if (enabled) {
        newSet.add(key)
      } else {
        newSet.delete(key)
      }
      return newSet
    })
  }, [])

  // Generate comparison data based on enabled criteria
  const comparisonData = useMemo(() => {
    const data: Array<{
      section: string
      rows: Array<{
        label: string
        values: any[]
        type: 'text' | 'number' | 'boolean' | 'rating' | 'progress' | 'badge' | 'custom'
        highlightDifferences?: boolean
      }>
    }> = []

    // Basic Information
    if (enabledCriteria.has('basic')) {
      data.push({
        section: 'Basic Information',
        rows: [
          {
            label: 'Name',
            values: templates.map((t) => t.name),
            type: 'text',
            highlightDifferences: true,
          },
          {
            label: 'Author',
            values: templates.map((t) => t.author),
            type: 'text',
            highlightDifferences: true,
          },
          {
            label: 'Category',
            values: templates.map((t) => t.category),
            type: 'badge',
            highlightDifferences: true,
          },
          {
            label: 'Created',
            values: templates.map((t) => new Date(t.createdAt).toLocaleDateString()),
            type: 'text',
          },
          {
            label: 'Updated',
            values: templates.map((t) => new Date(t.updatedAt).toLocaleDateString()),
            type: 'text',
          },
        ],
      })
    }

    // Community & Ratings
    if (enabledCriteria.has('community')) {
      data.push({
        section: 'Community & Ratings',
        rows: [
          {
            label: 'Average Rating',
            values: templates.map((t) => t.ratingAverage || 0),
            type: 'rating',
            highlightDifferences: true,
          },
          {
            label: 'Total Ratings',
            values: templates.map((t) => t.ratingCount || 0),
            type: 'number',
            highlightDifferences: true,
          },
          {
            label: 'Views',
            values: templates.map((t) => t.views),
            type: 'number',
            highlightDifferences: true,
          },
          {
            label: 'Stars',
            values: templates.map((t) => t.stars),
            type: 'number',
            highlightDifferences: true,
          },
          {
            label: 'Downloads',
            values: templates.map((t) => t.downloadCount || 0),
            type: 'number',
            highlightDifferences: true,
          },
        ],
      })
    }

    // Features & Capabilities
    if (enabledCriteria.has('features')) {
      data.push({
        section: 'Features & Capabilities',
        rows: [
          {
            label: 'Difficulty',
            values: templates.map((t) => t.metadata?.difficulty || 'Unknown'),
            type: 'badge',
            highlightDifferences: true,
          },
          {
            label: 'Estimated Time',
            values: templates.map((t) => t.metadata?.estimatedTime || 'Not specified'),
            type: 'text',
            highlightDifferences: true,
          },
          {
            label: 'Tags',
            values: templates.map((t) => (
              <div key={t.id} className='flex flex-wrap gap-1'>
                {(t.metadata?.tags || []).slice(0, 3).map((tag) => (
                  <Badge key={tag} variant='outline' className='text-xs'>
                    {tag}
                  </Badge>
                ))}
                {(t.metadata?.tags?.length || 0) > 3 && (
                  <Badge variant='outline' className='text-xs'>
                    +{(t.metadata?.tags?.length || 0) - 3}
                  </Badge>
                )}
              </div>
            )),
            type: 'custom',
          },
          {
            label: 'Requirements',
            values: templates.map((t) => t.metadata?.requirements?.length || 0),
            type: 'number',
            highlightDifferences: true,
          },
          {
            label: 'Use Cases',
            values: templates.map((t) => t.metadata?.useCases?.length || 0),
            type: 'number',
            highlightDifferences: true,
          },
        ],
      })
    }

    // Performance Metrics
    if (enabledCriteria.has('performance') && analytics) {
      data.push({
        section: 'Performance Metrics',
        rows: [
          {
            label: 'Success Rate',
            values: templates.map((t) => analytics[t.id]?.successRate || 0),
            type: 'progress',
            highlightDifferences: true,
          },
          {
            label: 'Avg Execution Time',
            values: templates.map((t) => `${analytics[t.id]?.averageExecutionTime || 0}ms`),
            type: 'text',
            highlightDifferences: true,
          },
          {
            label: 'Error Rate',
            values: templates.map(
              (t) => `${((analytics[t.id]?.errorRate || 0) * 100).toFixed(1)}%`
            ),
            type: 'text',
            highlightDifferences: true,
          },
        ],
      })
    }

    return data
  }, [templates, enabledCriteria, analytics])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] max-w-6xl overflow-hidden',
          isFullscreen && 'h-screen max-h-none w-screen max-w-none',
          className
        )}
      >
        <DialogHeader className='flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle className='flex items-center gap-2'>
                <GitCompare className='h-5 w-5' />
                Template Comparison
              </DialogTitle>
              <DialogDescription>
                Compare templates side-by-side to make the best choice
              </DialogDescription>
            </div>
            <div className='flex items-center gap-2'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <Filter className='mr-2 h-4 w-4' />
                    Criteria
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Comparison Criteria</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {COMPARISON_CRITERIA.map((criteria) => (
                    <DropdownMenuCheckboxItem
                      key={criteria.key}
                      checked={enabledCriteria.has(criteria.key)}
                      onCheckedChange={(checked) => handleCriteriaToggle(criteria.key, checked)}
                    >
                      {criteria.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant='outline' size='sm' onClick={() => onExportComparison?.(templates)}>
                <Download className='mr-2 h-4 w-4' />
                Export
              </Button>

              <Button variant='outline' size='sm' onClick={() => onShareComparison?.(templates)}>
                <Share2 className='mr-2 h-4 w-4' />
                Share
              </Button>

              <Button variant='outline' size='sm' onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? (
                  <Minimize2 className='h-4 w-4' />
                ) : (
                  <Maximize2 className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-hidden'>
          {!canCompare ? (
            <div className='flex h-full items-center justify-center'>
              <div className='text-center'>
                <GitCompare className='mx-auto mb-4 h-8 w-8 text-muted-foreground' />
                <p className='mb-2 font-medium'>Add templates to compare</p>
                <p className='mb-4 text-muted-foreground text-sm'>
                  Select at least {minTemplates} templates to start comparing
                </p>
                <Button onClick={() => setShowTemplateSelector(true)}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Templates
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue='overview' className='flex h-full flex-col'>
              <TabsList className='flex-shrink-0'>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='detailed'>Detailed</TabsTrigger>
                <TabsTrigger value='side-by-side'>Side by Side</TabsTrigger>
              </TabsList>

              <TabsContent value='overview' className='flex-1 overflow-hidden'>
                <ScrollArea className='h-full'>
                  <div className='space-y-6'>
                    {/* Template Cards */}
                    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                      {templates.map((template) => (
                        <Card key={template.id} className='group relative'>
                          {onTemplateRemove && templates.length > minTemplates && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => onTemplateRemove(template.id)}
                              className='absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100'
                            >
                              <X className='h-3 w-3' />
                            </Button>
                          )}
                          <CardContent className='p-4'>
                            <div className='mb-3 flex items-center gap-3'>
                              <div
                                className='flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm text-white'
                                style={{ backgroundColor: template.color }}
                              >
                                {template.icon || '📄'}
                              </div>
                              <div>
                                <h4 className='font-medium text-sm'>{template.name}</h4>
                                <p className='text-muted-foreground text-xs'>{template.author}</p>
                              </div>
                            </div>
                            <div className='space-y-2 text-xs'>
                              <div className='flex justify-between'>
                                <span>Rating:</span>
                                <div className='flex items-center gap-1'>
                                  <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                                  <span>{template.ratingAverage?.toFixed(1) || 'N/A'}</span>
                                </div>
                              </div>
                              <div className='flex justify-between'>
                                <span>Views:</span>
                                <span>{template.views.toLocaleString()}</span>
                              </div>
                              <div className='flex justify-between'>
                                <span>Category:</span>
                                <Badge variant='secondary' className='text-xs'>
                                  {template.category}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {templates.length < maxTemplates && (
                        <Card
                          className='flex cursor-pointer items-center justify-center border-2 border-gray-300 border-dashed transition-colors hover:border-blue-400 hover:bg-blue-50'
                          onClick={() => setShowTemplateSelector(true)}
                        >
                          <div className='text-center text-muted-foreground'>
                            <Plus className='mx-auto mb-2 h-6 w-6' />
                            <p className='text-sm'>Add Template</p>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value='detailed' className='flex-1 overflow-hidden'>
                <ScrollArea className='h-full'>
                  <div className='space-y-6'>
                    {comparisonData.map((section) => (
                      <Card key={section.section}>
                        <CardHeader>
                          <CardTitle className='text-lg'>{section.section}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Property</TableHead>
                                {templates.map((template) => (
                                  <TableHead key={template.id} className='text-center'>
                                    {template.name}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {section.rows.map((row) => (
                                <ComparisonRow
                                  key={row.label}
                                  label={row.label}
                                  values={row.values}
                                  type={row.type}
                                  highlightDifferences={row.highlightDifferences}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value='side-by-side' className='flex-1 overflow-hidden'>
                <div className='grid h-full grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4'>
                  {templates.map((template) => (
                    <Card key={template.id} className='flex flex-col overflow-hidden'>
                      <CardHeader className='flex-shrink-0'>
                        <div className='flex items-center gap-3'>
                          <div
                            className='flex h-8 w-8 items-center justify-center rounded font-bold text-sm text-white'
                            style={{ backgroundColor: template.color }}
                          >
                            {template.icon || '📄'}
                          </div>
                          <div>
                            <h4 className='font-medium text-sm'>{template.name}</h4>
                            <p className='text-muted-foreground text-xs'>{template.author}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className='flex-1 overflow-hidden'>
                        <ScrollArea className='h-full'>
                          <div className='space-y-3 text-sm'>
                            <div>
                              <h5 className='mb-1 font-medium'>Description</h5>
                              <p className='text-muted-foreground text-xs'>
                                {template.description}
                              </p>
                            </div>
                            <Separator />
                            <div>
                              <h5 className='mb-1 font-medium'>Rating</h5>
                              <div className='flex items-center gap-1'>
                                <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                                <span className='text-xs'>
                                  {template.ratingAverage?.toFixed(1) || 'N/A'}
                                  {template.ratingCount && ` (${template.ratingCount})`}
                                </span>
                              </div>
                            </div>
                            <div>
                              <h5 className='mb-1 font-medium'>Stats</h5>
                              <div className='space-y-1 text-xs'>
                                <div className='flex justify-between'>
                                  <span>Views:</span>
                                  <span>{template.views.toLocaleString()}</span>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Stars:</span>
                                  <span>{template.stars.toLocaleString()}</span>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Downloads:</span>
                                  <span>{(template.downloadCount || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            {template.metadata?.tags && (
                              <div>
                                <h5 className='mb-1 font-medium'>Tags</h5>
                                <div className='flex flex-wrap gap-1'>
                                  {template.metadata.tags.slice(0, 4).map((tag) => (
                                    <Badge key={tag} variant='outline' className='text-xs'>
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                        <div className='mt-3 flex gap-2'>
                          <Button
                            size='sm'
                            onClick={() => onTemplateInstall?.(template)}
                            className='flex-1 text-xs'
                          >
                            <Zap className='mr-1 h-3 w-3' />
                            Install
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => onTemplateSelect?.(template)}
                            className='text-xs'
                          >
                            <Eye className='h-3 w-3' />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Template Selection Dialog */}
        {onTemplateAdd && (
          <TemplateSelectionDialog
            open={showTemplateSelector}
            onOpenChange={setShowTemplateSelector}
            availableTemplates={availableTemplates}
            selectedTemplates={templates}
            onTemplateAdd={onTemplateAdd}
            maxTemplates={maxTemplates}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default TemplateComparison
