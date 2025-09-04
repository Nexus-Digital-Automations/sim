/**
 * Template Preview Modal Component
 *
 * Provides detailed template preview with workflow visualization,
 * variable mapping, and customization options before application.
 *
 * Features:
 * - Visual workflow preview
 * - Template variable mapping
 * - Conflict resolution with existing workflow
 * - Customization options
 * - Real-time validation
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Book,
  Code,
  Eye,
  GitBranch,
  Info,
  Loader2,
  Settings,
  Star,
  User,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import type { Template } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

const logger = createLogger('TemplatePreviewModal')

interface TemplateVariable {
  key: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  defaultValue?: any
  required: boolean
  placeholder?: string
  options?: string[]
}

interface WorkflowBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  data?: any
}

interface TemplatePreviewData {
  blocks: WorkflowBlock[]
  edges: Array<{ id: string; source: string; target: string }>
  variables: TemplateVariable[]
  conflicts?: Array<{
    type: 'name_conflict' | 'position_conflict' | 'dependency_conflict'
    description: string
    resolution: 'rename' | 'reposition' | 'skip' | 'replace'
  }>
  statistics: {
    blockCount: number
    connectionCount: number
    complexity: 'simple' | 'moderate' | 'complex'
    estimatedSetupTime: string
  }
}

interface TemplatePreviewModalProps {
  template: Template | null
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId?: string
  onApplyTemplate: (
    template: Template,
    options: {
      variables: Record<string, any>
      conflicts: Array<{ type: string; resolution: string }>
      mode: 'merge' | 'replace' | 'insert'
      position?: { x: number; y: number }
    }
  ) => void
  onStarTemplate?: (templateId: string, isStarred: boolean) => void
}

export function TemplatePreviewModal({
  template,
  open,
  onOpenChange,
  workflowId,
  onApplyTemplate,
  onStarTemplate,
}: TemplatePreviewModalProps) {
  // State management
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<TemplatePreviewData | null>(null)
  const [variables, setVariables] = useState<Record<string, any>>({})
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, { type: string; resolution: string }>
  >({})
  const [applyMode, setApplyMode] = useState<'merge' | 'replace' | 'insert'>('merge')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'blocks'])
  )
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Load template preview data when modal opens
  useEffect(() => {
    if (open && template) {
      loadTemplatePreview()
    }
  }, [open, template])

  // Load detailed template preview data
  const loadTemplatePreview = useCallback(async () => {
    if (!template) return

    setLoading(true)
    try {
      const response = await fetch(`/api/templates/${template.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          includeConflicts: true,
          includeVariables: true,
        }),
      })

      if (!response.ok) throw new Error('Failed to load template preview')

      const data = await response.json()
      setPreviewData(data)

      // Initialize variables with default values
      const initialVariables: Record<string, any> = {}
      data.variables?.forEach((variable: TemplateVariable) => {
        initialVariables[variable.key] = variable.defaultValue || ''
      })
      setVariables(initialVariables)

      // Initialize conflict resolutions
      const initialResolutions: Record<string, { type: string; resolution: string }> = {}
      data.conflicts?.forEach((conflict: any, index: number) => {
        initialResolutions[`conflict-${index}`] = {
          type: conflict.type,
          resolution: conflict.resolution,
        }
      })
      setConflictResolutions(initialResolutions)
    } catch (error) {
      logger.error('Failed to load template preview:', error)
      setPreviewData(null)
    } finally {
      setLoading(false)
    }
  }, [template, workflowId])

  // Validate variables
  const validateVariables = useCallback(() => {
    if (!previewData) return true

    const errors: Record<string, string> = {}
    previewData.variables.forEach((variable) => {
      const value = variables[variable.key]

      if (variable.required && (!value || value === '')) {
        errors[variable.key] = `${variable.name} is required`
        return
      }

      if (value && variable.type === 'number' && Number.isNaN(Number(value))) {
        errors[variable.key] = `${variable.name} must be a number`
        return
      }

      if (value && variable.options && !variable.options.includes(value)) {
        errors[variable.key] = `${variable.name} must be one of: ${variable.options.join(', ')}`
        return
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [previewData, variables])

  // Handle variable change
  const handleVariableChange = useCallback((key: string, value: any) => {
    setVariables((prev) => ({ ...prev, [key]: value }))
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[key]
      return newErrors
    })
  }, [])

  // Handle conflict resolution change
  const handleConflictResolutionChange = useCallback((conflictKey: string, resolution: string) => {
    setConflictResolutions((prev) => ({
      ...prev,
      [conflictKey]: { ...prev[conflictKey], resolution },
    }))
  }, [])

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  // Handle template application
  const handleApplyTemplate = useCallback(() => {
    if (!template || !previewData) return

    if (!validateVariables()) {
      return
    }

    const conflicts = Object.entries(conflictResolutions).map(([key, value]) => value)

    onApplyTemplate(template, {
      variables,
      conflicts,
      mode: applyMode,
    })

    onOpenChange(false)
  }, [
    template,
    previewData,
    variables,
    conflictResolutions,
    applyMode,
    validateVariables,
    onApplyTemplate,
    onOpenChange,
  ])

  // Handle star toggle
  const handleStarToggle = useCallback(() => {
    if (!template || !onStarTemplate) return
    onStarTemplate(template.id, template.isStarred || false)
  }, [template, onStarTemplate])

  // Render variable input
  const renderVariableInput = useCallback(
    (variable: TemplateVariable) => {
      const value = variables[variable.key]
      const error = validationErrors[variable.key]

      return (
        <div key={variable.key} className='space-y-2'>
          <Label className='flex items-center gap-2'>
            <span>{variable.name}</span>
            {variable.required && <span className='text-red-500'>*</span>}
            {variable.description && (
              <Tooltip>
                <TooltipTrigger>
                  <Info className='h-3 w-3 text-muted-foreground' />
                </TooltipTrigger>
                <TooltipContent>{variable.description}</TooltipContent>
              </Tooltip>
            )}
          </Label>

          {variable.options ? (
            <select
              className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
              value={value || ''}
              onChange={(e) => handleVariableChange(variable.key, e.target.value)}
            >
              <option value=''>Select {variable.name}</option>
              {variable.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : variable.type === 'boolean' ? (
            <label className='flex items-center gap-2'>
              <input
                type='checkbox'
                checked={value || false}
                onChange={(e) => handleVariableChange(variable.key, e.target.checked)}
                className='rounded'
              />
              <span className='text-sm'>Enable {variable.name}</span>
            </label>
          ) : variable.type === 'number' ? (
            <Input
              type='number'
              value={value || ''}
              onChange={(e) => handleVariableChange(variable.key, e.target.value)}
              placeholder={variable.placeholder || `Enter ${variable.name}`}
            />
          ) : variable.type === 'array' || variable.type === 'object' ? (
            <Textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  handleVariableChange(variable.key, parsed)
                } catch {
                  handleVariableChange(variable.key, e.target.value)
                }
              }}
              placeholder={variable.placeholder || `Enter ${variable.name} (JSON format)`}
              className='font-mono text-sm'
              rows={4}
            />
          ) : (
            <Input
              value={value || ''}
              onChange={(e) => handleVariableChange(variable.key, e.target.value)}
              placeholder={variable.placeholder || `Enter ${variable.name}`}
            />
          )}

          {error && <p className='text-red-500 text-sm'>{error}</p>}
        </div>
      )
    },
    [variables, validationErrors, handleVariableChange]
  )

  // Don't render if no template
  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[90vh] max-w-7xl flex-col gap-0 overflow-hidden p-0'>
        {/* Header */}
        <DialogHeader className='flex-shrink-0 border-b px-6 py-4'>
          <div className='flex items-start justify-between'>
            <div className='flex items-start gap-4'>
              <div
                className='flex h-12 w-12 items-center justify-center rounded-lg text-white'
                style={{ backgroundColor: template.color || '#3B82F6' }}
              >
                {template.icon ? (
                  <template.icon className='h-6 w-6' />
                ) : (
                  <Book className='h-6 w-6' />
                )}
              </div>
              <div>
                <DialogTitle className='mb-1 text-xl'>{template.name}</DialogTitle>
                <DialogDescription className='max-w-2xl'>{template.description}</DialogDescription>
                <div className='mt-2 flex items-center gap-4 text-muted-foreground text-sm'>
                  <div className='flex items-center gap-1'>
                    <User className='h-4 w-4' />
                    <span>{template.author}</span>
                  </div>
                  {template.stars > 0 && (
                    <div className='flex items-center gap-1'>
                      <Star className='h-4 w-4 fill-current text-yellow-400' />
                      <span>{template.stars}</span>
                    </div>
                  )}
                  {template.views > 0 && (
                    <div className='flex items-center gap-1'>
                      <Eye className='h-4 w-4' />
                      <span>{template.views}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              {onStarTemplate && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleStarToggle}
                  className={cn(template.isStarred && 'border-yellow-200 bg-yellow-50')}
                >
                  <Star
                    className={cn(
                      'mr-1 h-4 w-4',
                      template.isStarred && 'fill-current text-yellow-500'
                    )}
                  />
                  {template.isStarred ? 'Starred' : 'Star'}
                </Button>
              )}
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => onOpenChange(false)}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Template tags */}
          {template.tags && template.tags.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-2'>
              {template.tags.map((tag) => (
                <Badge key={tag} variant='secondary'>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <div className='flex flex-1 overflow-hidden'>
          {loading ? (
            <div className='flex flex-1 items-center justify-center'>
              <div className='text-center'>
                <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
                <p className='text-muted-foreground text-sm'>Loading template preview...</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue='overview' className='flex flex-1'>
              <div className='w-64 shrink-0 border-r bg-muted/30 p-4'>
                <TabsList orientation='vertical' className='grid w-full gap-1'>
                  <TabsTrigger value='overview' className='justify-start'>
                    <Eye className='mr-2 h-4 w-4' />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value='blocks' className='justify-start'>
                    <GitBranch className='mr-2 h-4 w-4' />
                    Workflow
                  </TabsTrigger>
                  {previewData?.variables.length > 0 && (
                    <TabsTrigger value='variables' className='justify-start'>
                      <Settings className='mr-2 h-4 w-4' />
                      Configure
                    </TabsTrigger>
                  )}
                  {previewData?.conflicts && previewData.conflicts.length > 0 && (
                    <TabsTrigger value='conflicts' className='justify-start'>
                      <Zap className='mr-2 h-4 w-4' />
                      Conflicts
                      <Badge variant='destructive' className='ml-2 text-xs'>
                        {previewData.conflicts.length}
                      </Badge>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className='flex-1 overflow-hidden'>
                <ScrollArea className='h-full'>
                  <div className='p-6'>
                    {/* Overview Tab */}
                    <TabsContent value='overview' className='mt-0 space-y-6'>
                      {previewData && (
                        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                          {/* Statistics */}
                          <Card>
                            <CardHeader>
                              <CardTitle className='text-sm'>Template Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                              <div className='grid grid-cols-2 gap-4'>
                                <div>
                                  <p className='font-bold text-2xl'>
                                    {previewData.statistics.blockCount}
                                  </p>
                                  <p className='text-muted-foreground text-sm'>Blocks</p>
                                </div>
                                <div>
                                  <p className='font-bold text-2xl'>
                                    {previewData.statistics.connectionCount}
                                  </p>
                                  <p className='text-muted-foreground text-sm'>Connections</p>
                                </div>
                              </div>
                              <div>
                                <p className='font-medium'>{previewData.statistics.complexity}</p>
                                <p className='text-muted-foreground text-sm'>Complexity</p>
                              </div>
                              <div>
                                <p className='font-medium'>
                                  {previewData.statistics.estimatedSetupTime}
                                </p>
                                <p className='text-muted-foreground text-sm'>Setup Time</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Quick Actions */}
                          <Card>
                            <CardHeader>
                              <CardTitle className='text-sm'>Application Mode</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className='space-y-3'>
                                <div className='grid grid-cols-1 gap-2'>
                                  <label className='flex items-center gap-2'>
                                    <input
                                      type='radio'
                                      name='applyMode'
                                      value='merge'
                                      checked={applyMode === 'merge'}
                                      onChange={(e) => setApplyMode('merge')}
                                    />
                                    <div>
                                      <p className='font-medium'>Merge with current workflow</p>
                                      <p className='text-muted-foreground text-sm'>
                                        Add template blocks to existing workflow
                                      </p>
                                    </div>
                                  </label>
                                  <label className='flex items-center gap-2'>
                                    <input
                                      type='radio'
                                      name='applyMode'
                                      value='replace'
                                      checked={applyMode === 'replace'}
                                      onChange={(e) => setApplyMode('replace')}
                                    />
                                    <div>
                                      <p className='font-medium'>Replace current workflow</p>
                                      <p className='text-muted-foreground text-sm'>
                                        Replace all blocks with template
                                      </p>
                                    </div>
                                  </label>
                                  <label className='flex items-center gap-2'>
                                    <input
                                      type='radio'
                                      name='applyMode'
                                      value='insert'
                                      checked={applyMode === 'insert'}
                                      onChange={(e) => setApplyMode('insert')}
                                    />
                                    <div>
                                      <p className='font-medium'>Insert at cursor position</p>
                                      <p className='text-muted-foreground text-sm'>
                                        Insert template at specific location
                                      </p>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Template description */}
                      {template.longDescription && (
                        <Card>
                          <CardHeader>
                            <CardTitle className='text-sm'>Description</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className='whitespace-pre-wrap text-sm leading-relaxed'>
                              {template.longDescription}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Workflow Tab */}
                    <TabsContent value='blocks' className='mt-0 space-y-4'>
                      {previewData && (
                        <div className='space-y-4'>
                          <Card>
                            <CardHeader>
                              <CardTitle className='text-sm'>Workflow Blocks</CardTitle>
                              <CardDescription>
                                {previewData.blocks.length} blocks will be added to your workflow
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className='space-y-3'>
                                {previewData.blocks.map((block) => (
                                  <div
                                    key={block.id}
                                    className='flex items-center gap-3 rounded-lg border p-3'
                                  >
                                    <div className='flex h-8 w-8 items-center justify-center rounded bg-primary/10'>
                                      <Code className='h-4 w-4' />
                                    </div>
                                    <div className='flex-1'>
                                      <p className='font-medium text-sm'>{block.name}</p>
                                      <p className='text-muted-foreground text-xs capitalize'>
                                        {block.type.replace(/([A-Z])/g, ' $1').trim()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </TabsContent>

                    {/* Variables Tab */}
                    {previewData?.variables.length > 0 && (
                      <TabsContent value='variables' className='mt-0 space-y-4'>
                        <Card>
                          <CardHeader>
                            <CardTitle className='text-sm'>Template Configuration</CardTitle>
                            <CardDescription>
                              Configure variables to customize the template for your needs
                            </CardDescription>
                          </CardHeader>
                          <CardContent className='space-y-4'>
                            {previewData.variables.map(renderVariableInput)}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    )}

                    {/* Conflicts Tab */}
                    {previewData?.conflicts && previewData.conflicts.length > 0 && (
                      <TabsContent value='conflicts' className='mt-0 space-y-4'>
                        <Card>
                          <CardHeader>
                            <CardTitle className='text-sm'>Resolve Conflicts</CardTitle>
                            <CardDescription>
                              Choose how to handle conflicts with your existing workflow
                            </CardDescription>
                          </CardHeader>
                          <CardContent className='space-y-4'>
                            {previewData.conflicts.map((conflict, index) => (
                              <div
                                key={index}
                                className='rounded-lg border border-orange-200 bg-orange-50/50 p-4'
                              >
                                <div className='mb-3'>
                                  <p className='font-medium text-sm'>{conflict.description}</p>
                                </div>
                                <div className='space-y-2'>
                                  <p className='text-muted-foreground text-xs'>Resolution:</p>
                                  <select
                                    className='w-full rounded border bg-background px-3 py-2 text-sm'
                                    value={
                                      conflictResolutions[`conflict-${index}`]?.resolution ||
                                      conflict.resolution
                                    }
                                    onChange={(e) =>
                                      handleConflictResolutionChange(
                                        `conflict-${index}`,
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value='rename'>Rename conflicting items</option>
                                    <option value='replace'>Replace existing items</option>
                                    <option value='skip'>Skip conflicting items</option>
                                    <option value='reposition'>Reposition items</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-muted-foreground text-sm'>
              <Info className='h-4 w-4' />
              <span>
                {Object.keys(validationErrors).length > 0
                  ? `${Object.keys(validationErrors).length} validation error(s)`
                  : 'Ready to apply template'}
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApplyTemplate}
                disabled={Object.keys(validationErrors).length > 0 || loading}
                className='min-w-32'
              >
                <Wand2 className='mr-2 h-4 w-4' />
                Apply Template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
