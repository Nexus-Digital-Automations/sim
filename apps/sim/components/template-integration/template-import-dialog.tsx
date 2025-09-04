/**
 * Template Import Dialog - Workflow Editor Integration Component
 *
 * This component provides a comprehensive template import dialog that integrates
 * directly with the workflow editor, enabling users to import templates with
 * guided customization and real-time preview capabilities.
 *
 * FEATURES:
 * - Template browsing and selection with advanced filtering
 * - Real-time template preview with customization options
 * - Interactive customization wizard with field validation
 * - Conflict detection and resolution strategies
 * - Dependency validation and requirement checking
 * - Progress tracking and error handling
 *
 * INTEGRATION:
 * - Seamless workflow editor integration
 * - Event-driven state management
 * - Comprehensive error handling and recovery
 * - Performance-optimized with lazy loading
 *
 * @author Claude Code Template Integration Team
 * @version 2.0.0
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  Search,
  Star,
  Zap,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createLogger } from '@/lib/logs/console/logger'
import type { Template } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

const logger = createLogger('TemplateImportDialog')

// Template import form validation schema
const importFormSchema = z.object({
  templateId: z.string().min(1, 'Please select a template'),
  workflowName: z.string().min(1, 'Workflow name is required').max(100),
  description: z.string().max(500).optional(),
  mergeStrategy: z.enum(['replace', 'merge', 'append']).default('replace'),
  variables: z.record(z.string()).optional(),
  preserveExisting: z.boolean().default(false),
  validateCompatibility: z.boolean().default(true),
})

type ImportFormData = z.infer<typeof importFormSchema>

interface TemplateImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetWorkflowId: string
  onImportComplete?: (result: any) => void
  onImportError?: (error: Error) => void
}

interface ImportStep {
  id: string
  title: string
  description: string
  completed: boolean
  current: boolean
  error?: string
}

export function TemplateImportDialog({
  open,
  onOpenChange,
  targetWorkflowId,
  onImportComplete,
  onImportError,
}: TemplateImportDialogProps) {
  // State management
  const [currentStep, setCurrentStep] = useState('browse')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [previewData, setPreviewData] = useState<any>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [dependencies, setDependencies] = useState<any[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Form management
  const form = useForm<ImportFormData>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      templateId: '',
      workflowName: '',
      description: '',
      mergeStrategy: 'replace',
      variables: {},
      preserveExisting: false,
      validateCompatibility: true,
    },
  })

  // Import steps configuration
  const importSteps: ImportStep[] = useMemo(
    () => [
      {
        id: 'browse',
        title: 'Browse Templates',
        description: 'Search and select a template to import',
        completed: !!selectedTemplate,
        current: currentStep === 'browse',
      },
      {
        id: 'customize',
        title: 'Customize Template',
        description: 'Configure template settings and variables',
        completed: currentStep === 'preview' || currentStep === 'import',
        current: currentStep === 'customize',
      },
      {
        id: 'preview',
        title: 'Preview & Validate',
        description: 'Review changes and resolve conflicts',
        completed: currentStep === 'import',
        current: currentStep === 'preview',
      },
      {
        id: 'import',
        title: 'Import Template',
        description: 'Apply template to your workflow',
        completed: false,
        current: currentStep === 'import',
      },
    ],
    [currentStep, selectedTemplate]
  )

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates()
      resetImportState()
    }
  }, [open])

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.author.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [templates, searchQuery, categoryFilter])

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(templates.map((t) => t.category))]
    return uniqueCategories.sort()
  }, [templates])

  /**
   * Load available templates with pagination and filtering
   */
  const loadTemplates = async () => {
    setIsLoading(true)
    setError(null)

    try {
      logger.info('Loading templates for import dialog')

      const response = await fetch('/api/templates?limit=50&includeStats=true&sortBy=views')

      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.statusText}`)
      }

      const result = await response.json()
      setTemplates(result.data || [])

      logger.info('Templates loaded successfully', {
        templateCount: result.data?.length || 0,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load templates'
      setError(errorMessage)
      logger.error('Failed to load templates', { error: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Select template and move to customization step
   */
  const selectTemplate = useCallback(
    (template: Template) => {
      logger.info('Template selected for import', {
        templateId: template.id,
        templateName: template.name,
      })

      setSelectedTemplate(template)
      setCurrentStep('customize')

      // Pre-fill form with template data
      form.setValue('templateId', template.id)
      form.setValue('workflowName', `${template.name} (Imported)`)
      form.setValue('description', template.description || '')
    },
    [form]
  )

  /**
   * Generate template preview with customizations
   */
  const generatePreview = async (formData: ImportFormData) => {
    if (!selectedTemplate) return

    setIsLoading(true)
    setError(null)

    try {
      logger.info('Generating template preview', {
        templateId: selectedTemplate.id,
        customizations: formData,
      })

      const response = await fetch('/api/templates/integration/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customizations: {
            workflowName: formData.workflowName,
            description: formData.description,
            variables: formData.variables || {},
          },
          options: {
            includeMetrics: true,
            validateDependencies: formData.validateCompatibility,
            showConflicts: true,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate preview: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Preview generation failed')
      }

      setPreviewData(result.data.previewState)
      setConflicts(result.data.conflicts || [])
      setDependencies(result.data.dependencies || [])
      setCurrentStep('preview')

      logger.info('Template preview generated successfully', {
        conflictCount: result.data.conflicts?.length || 0,
        dependencyCount: result.data.dependencies?.length || 0,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate preview'
      setError(errorMessage)
      logger.error('Failed to generate preview', { error: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Execute template import
   */
  const executeImport = async (formData: ImportFormData) => {
    if (!selectedTemplate) return

    setIsImporting(true)
    setImportProgress(0)
    setError(null)
    setCurrentStep('import')

    try {
      logger.info('Starting template import', {
        templateId: selectedTemplate.id,
        targetWorkflowId,
        formData,
      })

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/templates/integration/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          targetWorkflowId,
          customizations: {
            workflowName: formData.workflowName,
            description: formData.description,
            variables: formData.variables || {},
          },
          options: {
            mergeStrategy: formData.mergeStrategy,
            preserveExisting: formData.preserveExisting,
            validateCompatibility: formData.validateCompatibility,
            generatePreview: false,
          },
        }),
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Import failed')
      }

      logger.info('Template import completed successfully', {
        templateId: selectedTemplate.id,
        importResult: result.data,
      })

      // Notify parent component
      onImportComplete?.(result.data)

      // Close dialog after successful import
      setTimeout(() => {
        onOpenChange(false)
      }, 1000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed'
      setError(errorMessage)
      logger.error('Template import failed', { error: errorMessage })
      onImportError?.(error instanceof Error ? error : new Error(errorMessage))
    } finally {
      setIsImporting(false)
    }
  }

  /**
   * Reset import state when dialog closes
   */
  const resetImportState = () => {
    setCurrentStep('browse')
    setSelectedTemplate(null)
    setPreviewData(null)
    setConflicts([])
    setDependencies([])
    setImportProgress(0)
    setError(null)
    form.reset()
  }

  /**
   * Handle form submission based on current step
   */
  const handleFormSubmit = (formData: ImportFormData) => {
    switch (currentStep) {
      case 'customize':
        generatePreview(formData)
        break
      case 'preview':
        executeImport(formData)
        break
      default:
        break
    }
  }

  /**
   * Render template card
   */
  const renderTemplateCard = (template: Template) => (
    <Card
      key={template.id}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        selectedTemplate?.id === template.id && 'ring-2 ring-primary'
      )}
      onClick={() => selectTemplate(template)}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className='flex h-10 w-10 items-center justify-center rounded-lg text-white'
              style={{ backgroundColor: template.color }}
            >
              <FileText className='h-5 w-5' />
            </div>
            <div>
              <CardTitle className='line-clamp-1 font-medium text-base'>{template.name}</CardTitle>
              <p className='text-muted-foreground text-sm'>by {template.author}</p>
            </div>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <div className='flex items-center gap-1'>
              <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
              <span className='text-muted-foreground text-xs'>{template.stars}</span>
            </div>
            <div className='flex items-center gap-1'>
              <Eye className='h-3 w-3 text-muted-foreground' />
              <span className='text-muted-foreground text-xs'>{template.views}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <p className='mb-3 line-clamp-2 text-muted-foreground text-sm'>{template.description}</p>
        <div className='flex items-center justify-between'>
          <Badge variant='secondary' className='text-xs'>
            {template.category}
          </Badge>
          <Button
            size='sm'
            variant='ghost'
            className='h-7 px-2 text-xs'
            onClick={(e) => {
              e.stopPropagation()
              selectTemplate(template)
            }}
          >
            Select
            <ChevronRight className='ml-1 h-3 w-3' />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[80vh] max-w-4xl flex-col p-0'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle className='font-semibold text-xl'>Import Template</DialogTitle>
          <DialogDescription>
            Import an existing template into your workflow with guided customization
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className='border-b bg-muted/30 px-6 py-4'>
          <div className='flex items-center space-x-4'>
            {importSteps.map((step, index) => (
              <div key={step.id} className='flex items-center'>
                <div className='flex items-center'>
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm',
                      step.completed
                        ? 'bg-primary text-primary-foreground'
                        : step.current
                          ? 'border-2 border-primary bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {step.completed ? <Check className='h-4 w-4' /> : index + 1}
                  </div>
                  <div className='ml-3'>
                    <p
                      className={cn(
                        'font-medium text-sm',
                        step.current ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {step.title}
                    </p>
                    <p className='text-muted-foreground text-xs'>{step.description}</p>
                  </div>
                </div>
                {index < importSteps.length - 1 && (
                  <ChevronRight className='mx-4 h-4 w-4 text-muted-foreground' />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className='px-6'>
            <Alert variant='destructive'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step Content */}
        <div className='flex-1 overflow-hidden'>
          {currentStep === 'browse' && (
            <div className='flex h-full flex-col'>
              {/* Search and Filter */}
              <div className='border-b bg-background px-6 py-4'>
                <div className='flex items-center gap-4'>
                  <div className='relative flex-1'>
                    <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
                    <Input
                      placeholder='Search templates...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className='w-48'>
                      <SelectValue placeholder='Category' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Templates Grid */}
              <ScrollArea className='flex-1 px-6 py-4'>
                {isLoading ? (
                  <div className='flex h-32 items-center justify-center'>
                    <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className='flex h-32 flex-col items-center justify-center text-center'>
                    <FileText className='mb-4 h-12 w-12 text-muted-foreground' />
                    <p className='text-muted-foreground'>
                      {searchQuery || categoryFilter !== 'all'
                        ? 'No templates found matching your criteria'
                        : 'No templates available'}
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    {filteredTemplates.map(renderTemplateCard)}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {currentStep === 'customize' && selectedTemplate && (
            <div className='h-full overflow-auto'>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleFormSubmit)}
                  className='space-y-6 px-6 py-4'
                >
                  {/* Template Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='text-base'>Selected Template</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='flex items-start gap-4'>
                        <div
                          className='flex h-12 w-12 items-center justify-center rounded-lg text-white'
                          style={{ backgroundColor: selectedTemplate.color }}
                        >
                          <FileText className='h-6 w-6' />
                        </div>
                        <div className='flex-1'>
                          <h3 className='font-medium'>{selectedTemplate.name}</h3>
                          <p className='mb-2 text-muted-foreground text-sm'>
                            by {selectedTemplate.author}
                          </p>
                          <p className='text-muted-foreground text-sm'>
                            {selectedTemplate.description}
                          </p>
                        </div>
                        <div className='flex items-center gap-4'>
                          <div className='flex items-center gap-1'>
                            <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                            <span className='text-sm'>{selectedTemplate.stars}</span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Eye className='h-4 w-4 text-muted-foreground' />
                            <span className='text-sm'>{selectedTemplate.views}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customization Fields */}
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <FormField
                      control={form.control}
                      name='workflowName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workflow Name</FormLabel>
                          <FormControl>
                            <Input placeholder='Enter workflow name' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='mergeStrategy'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Import Strategy</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder='Select strategy' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='replace'>
                                Replace - Replace existing workflow
                              </SelectItem>
                              <SelectItem value='merge'>
                                Merge - Combine with existing blocks
                              </SelectItem>
                              <SelectItem value='append'>
                                Append - Add to end of workflow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='Describe your customization...'
                            className='resize-none'
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Advanced Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='text-base'>Advanced Options</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='flex items-center space-x-2'>
                        <input
                          type='checkbox'
                          id='preserveExisting'
                          {...form.register('preserveExisting')}
                          className='h-4 w-4'
                        />
                        <Label htmlFor='preserveExisting' className='text-sm'>
                          Preserve existing workflow elements
                        </Label>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <input
                          type='checkbox'
                          id='validateCompatibility'
                          {...form.register('validateCompatibility')}
                          className='h-4 w-4'
                        />
                        <Label htmlFor='validateCompatibility' className='text-sm'>
                          Validate template compatibility
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className='flex items-center justify-between border-t pt-6'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setCurrentStep('browse')}
                    >
                      Back
                    </Button>
                    <Button type='submit' disabled={isLoading} className='min-w-32'>
                      {isLoading ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          Generate Preview
                          <ChevronRight className='ml-2 h-4 w-4' />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className='h-full overflow-auto px-6 py-4'>
              <div className='space-y-6'>
                {/* Import Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-base'>Import Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div>
                        <Label className='font-medium'>Template:</Label>
                        <p className='text-muted-foreground'>{selectedTemplate?.name}</p>
                      </div>
                      <div>
                        <Label className='font-medium'>Strategy:</Label>
                        <p className='text-muted-foreground capitalize'>
                          {form.getValues('mergeStrategy')}
                        </p>
                      </div>
                      <div>
                        <Label className='font-medium'>New Name:</Label>
                        <p className='text-muted-foreground'>{form.getValues('workflowName')}</p>
                      </div>
                      <div>
                        <Label className='font-medium'>Blocks:</Label>
                        <p className='text-muted-foreground'>
                          {previewData ? Object.keys(previewData.blocks || {}).length : 0} blocks
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conflicts */}
                {conflicts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center text-base'>
                        <AlertTriangle className='mr-2 h-4 w-4 text-yellow-500' />
                        Conflicts Detected ({conflicts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {conflicts.map((conflict, index) => (
                          <div
                            key={index}
                            className='rounded-lg border bg-yellow-50 p-3 dark:bg-yellow-900/20'
                          >
                            <p className='font-medium text-sm'>{conflict.description}</p>
                            <p className='mt-1 text-muted-foreground text-xs'>
                              Resolution: {conflict.resolution}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Dependencies */}
                {dependencies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center text-base'>
                        <Zap className='mr-2 h-4 w-4 text-blue-500' />
                        Dependencies ({dependencies.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-2'>
                        {dependencies.map((dep, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between rounded border p-2'
                          >
                            <span className='text-sm'>{dep.name}</span>
                            <div className='flex items-center'>
                              {dep.satisfied ? (
                                <CheckCircle className='h-4 w-4 text-green-500' />
                              ) : (
                                <AlertTriangle className='h-4 w-4 text-red-500' />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className='flex items-center justify-between border-t pt-6'>
                  <Button variant='outline' onClick={() => setCurrentStep('customize')}>
                    Back to Customize
                  </Button>
                  <Button
                    onClick={() => form.handleSubmit(handleFormSubmit)()}
                    disabled={isImporting}
                    className='min-w-32'
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className='mr-2 h-4 w-4' />
                        Import Template
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'import' && (
            <div className='flex h-full items-center justify-center px-6'>
              <div className='max-w-md space-y-4 text-center'>
                <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20'>
                  {isImporting ? (
                    <Loader2 className='h-8 w-8 animate-spin text-primary' />
                  ) : (
                    <CheckCircle className='h-8 w-8 text-green-500' />
                  )}
                </div>
                <div>
                  <h3 className='mb-2 font-semibold text-lg'>
                    {isImporting ? 'Importing Template...' : 'Import Complete!'}
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    {isImporting
                      ? 'Applying template to your workflow. This may take a moment.'
                      : 'Template has been successfully imported into your workflow.'}
                  </p>
                </div>
                {isImporting && (
                  <div className='space-y-2'>
                    <Progress value={importProgress} className='w-full' />
                    <p className='text-muted-foreground text-xs'>{importProgress}% complete</p>
                  </div>
                )}
                {!isImporting && <Button onClick={() => onOpenChange(false)}>Close</Button>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
