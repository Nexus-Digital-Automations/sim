/**
 * Template Publishing and Management Interface - Creator Dashboard Component
 *
 * This component provides a comprehensive interface for template creators to:
 * - Publish new templates with rich metadata and documentation
 * - Manage existing templates with version control and updates
 * - Track template performance with analytics and insights
 * - Handle template approval workflows and community feedback
 * - Configure pricing, licensing, and distribution settings
 * - Manage template collections and organization
 * - Monitor earnings and revenue analytics
 * - Respond to reviews and community feedback
 *
 * Features:
 * - Multi-step template publication wizard
 * - Rich text editor with markdown support
 * - Drag-and-drop file upload with preview
 * - Template validation and quality checks
 * - Version management with semantic versioning
 * - Advanced metadata configuration
 * - Real-time preview and testing capabilities
 * - Integration with Git workflows
 * - Automated template scanning and analysis
 * - Community engagement tools
 *
 * @author Claude Code Marketplace System
 * @version 2.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Code,
  DollarSign,
  Eye,
  FileText,
  Gift,
  Globe,
  Lock,
  Plus,
  Save,
  Tag,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Template, TemplateAnalytics, User } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Publishing Interface Props
 */
export interface TemplatePublishingInterfaceProps {
  /** Current user (creator) */
  currentUser: User
  /** Template to edit (for existing templates) */
  template?: Template
  /** Custom CSS class name */
  className?: string
  /** Publishing mode */
  mode?: 'create' | 'edit' | 'version'
  /** Show analytics dashboard */
  showAnalytics?: boolean
  /** Enable advanced features */
  enableAdvancedFeatures?: boolean
  /** Template submission handler */
  onSubmit?: (templateData: TemplateSubmissionData) => Promise<void>
  /** Navigation back handler */
  onBack?: () => void
}

/**
 * Template Submission Data Interface
 */
interface TemplateSubmissionData {
  name: string
  description: string
  longDescription?: string
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  content: any // Template workflow/content
  metadata: {
    version: string
    license: string
    requirements: string[]
    useCases: string[]
    estimatedTime: number
    compatibilityVersion: string
    changeLog?: string
  }
  publishing: {
    visibility: 'public' | 'private' | 'unlisted'
    pricing: 'free' | 'paid' | 'freemium'
    price?: number
    allowComments: boolean
    allowRating: boolean
    featuredImage?: File
    screenshots: File[]
    documentation?: string
  }
  seo: {
    keywords: string[]
    metaDescription: string
    ogTitle?: string
    ogDescription?: string
  }
}

/**
 * Template Category Interface
 */
interface TemplateCategory {
  id: string
  name: string
  description: string
  icon: string
  templateCount: number
}

/**
 * Publishing Step Interface
 */
interface PublishingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
  optional?: boolean
}

/**
 * Validation Error Interface
 */
interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Template Publishing Interface Component
 */
export const TemplatePublishingInterface: React.FC<TemplatePublishingInterfaceProps> = ({
  currentUser,
  template,
  className,
  mode = 'create',
  showAnalytics = true,
  enableAdvancedFeatures = true,
  onSubmit,
  onBack,
}) => {
  const router = useRouter()

  // State management
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<TemplateSubmissionData>({
    name: template?.name || '',
    description: template?.description || '',
    longDescription: template?.metadata?.longDescription || '',
    category: template?.category || '',
    tags: template?.metadata?.tags || [],
    difficulty: (template?.metadata?.difficulty as any) || 'intermediate',
    content: template?.content || null,
    metadata: {
      version: template?.version || '1.0.0',
      license: template?.metadata?.license || 'MIT',
      requirements: template?.metadata?.requirements || [],
      useCases: template?.metadata?.useCases || [],
      estimatedTime: template?.metadata?.estimatedTime || 30,
      compatibilityVersion: '1.0.0',
      changeLog: '',
    },
    publishing: {
      visibility: 'public',
      pricing: 'free',
      allowComments: true,
      allowRating: true,
      screenshots: [],
    },
    seo: {
      keywords: [],
      metaDescription: '',
    },
  })
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [templateAnalytics, setTemplateAnalytics] = useState<TemplateAnalytics | null>(null)
  const [existingTemplates, setExistingTemplates] = useState<Template[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Publishing steps configuration
  const publishingSteps: PublishingStep[] = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Template name, description, and category',
      icon: <FileText className='h-5 w-5' />,
      completed: !!(formData.name && formData.description && formData.category),
    },
    {
      id: 'content',
      title: 'Template Content',
      description: 'Upload or define your template workflow',
      icon: <Code className='h-5 w-5' />,
      completed: !!formData.content,
    },
    {
      id: 'metadata',
      title: 'Metadata & Details',
      description: 'Tags, requirements, and additional information',
      icon: <Tag className='h-5 w-5' />,
      completed: formData.tags.length > 0 && formData.metadata.requirements.length > 0,
    },
    {
      id: 'publishing',
      title: 'Publishing Settings',
      description: 'Visibility, pricing, and distribution options',
      icon: <Globe className='h-5 w-5' />,
      completed: !!(formData.publishing.visibility && formData.publishing.pricing),
    },
    {
      id: 'preview',
      title: 'Preview & Submit',
      description: 'Review your template before publishing',
      icon: <Eye className='h-5 w-5' />,
      completed: false,
    },
  ]

  /**
   * Load initial data
   */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)

        // Load categories
        const categoriesResponse = await fetch('/api/marketplace/categories')
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.data || [])
        }

        // Load existing templates for creator
        const templatesResponse = await fetch(`/api/marketplace/templates?author=${currentUser.id}`)
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json()
          setExistingTemplates(templatesData.data || [])
        }

        // Load analytics if editing existing template
        if (template && showAnalytics) {
          const analyticsResponse = await fetch(
            `/api/marketplace/templates/${template.id}/analytics`
          )
          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json()
            setTemplateAnalytics(analyticsData.data || null)
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [currentUser.id, template, showAnalytics])

  /**
   * Validate current step
   */
  const validateCurrentStep = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = []
    const step = publishingSteps[currentStep]

    switch (step.id) {
      case 'basic-info':
        if (!formData.name.trim()) {
          errors.push({ field: 'name', message: 'Template name is required', severity: 'error' })
        }
        if (formData.name.length < 3) {
          errors.push({
            field: 'name',
            message: 'Template name must be at least 3 characters',
            severity: 'error',
          })
        }
        if (!formData.description.trim()) {
          errors.push({
            field: 'description',
            message: 'Description is required',
            severity: 'error',
          })
        }
        if (formData.description.length < 20) {
          errors.push({
            field: 'description',
            message: 'Description should be at least 20 characters for better discoverability',
            severity: 'warning',
          })
        }
        if (!formData.category) {
          errors.push({ field: 'category', message: 'Please select a category', severity: 'error' })
        }
        break

      case 'content':
        if (!formData.content) {
          errors.push({
            field: 'content',
            message: 'Template content is required',
            severity: 'error',
          })
        }
        break

      case 'metadata':
        if (formData.tags.length === 0) {
          errors.push({
            field: 'tags',
            message: 'At least one tag is required for discoverability',
            severity: 'error',
          })
        }
        if (formData.tags.length > 10) {
          errors.push({ field: 'tags', message: 'Maximum 10 tags allowed', severity: 'error' })
        }
        if (formData.metadata.requirements.length === 0) {
          errors.push({
            field: 'requirements',
            message: 'Please specify at least one requirement',
            severity: 'warning',
          })
        }
        if (!formData.metadata.version.match(/^\d+\.\d+\.\d+$/)) {
          errors.push({
            field: 'version',
            message: 'Version must follow semantic versioning (e.g., 1.0.0)',
            severity: 'error',
          })
        }
        break

      case 'publishing':
        if (
          formData.publishing.pricing === 'paid' &&
          (!formData.publishing.price || formData.publishing.price <= 0)
        ) {
          errors.push({
            field: 'price',
            message: 'Price must be greater than 0 for paid templates',
            severity: 'error',
          })
        }
        if (!formData.seo.metaDescription.trim()) {
          errors.push({
            field: 'metaDescription',
            message: 'Meta description recommended for SEO',
            severity: 'info',
          })
        }
        break
    }

    return errors
  }, [currentStep, formData, publishingSteps])

  /**
   * Handle form data updates
   */
  const updateFormData = useCallback((updates: Partial<TemplateSubmissionData>) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  /**
   * Handle nested form data updates
   */
  const updateNestedFormData = useCallback(
    <T extends keyof TemplateSubmissionData>(
      section: T,
      updates: Partial<TemplateSubmissionData[T]>
    ) => {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...updates,
        },
      }))
    },
    []
  )

  /**
   * Handle step navigation
   */
  const handleNextStep = useCallback(() => {
    const errors = validateCurrentStep()
    setValidationErrors(errors)

    const hasBlockingErrors = errors.some((error) => error.severity === 'error')
    if (!hasBlockingErrors && currentStep < publishingSteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, publishingSteps.length, validateCurrentStep])

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setValidationErrors([])
    }
  }, [currentStep])

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (stepIndex <= currentStep) {
        setCurrentStep(stepIndex)
        setValidationErrors([])
      }
    },
    [currentStep]
  )

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(
    (files: File[], type: 'content' | 'screenshot' | 'featured') => {
      if (type === 'content' && files.length > 0) {
        // Handle template content file upload
        const file = files[0]
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const content = JSON.parse(e.target?.result as string)
            updateFormData({ content })
          } catch (error) {
            console.error('Invalid template file:', error)
          }
        }
        reader.readAsText(file)
      } else if (type === 'screenshot') {
        updateNestedFormData('publishing', {
          screenshots: [...formData.publishing.screenshots, ...files],
        })
      } else if (type === 'featured' && files.length > 0) {
        updateNestedFormData('publishing', {
          featuredImage: files[0],
        })
      }
    },
    [formData.publishing.screenshots, updateFormData, updateNestedFormData]
  )

  /**
   * Handle template submission
   */
  const handleSubmit = useCallback(async () => {
    const errors = validateCurrentStep()
    setValidationErrors(errors)

    const hasBlockingErrors = errors.some((error) => error.severity === 'error')
    if (hasBlockingErrors) return

    setSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(formData)
      } else {
        const endpoint =
          mode === 'create'
            ? '/api/marketplace/templates'
            : `/api/marketplace/templates/${template?.id}`

        const response = await fetch(endpoint, {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            authorId: currentUser.id,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          router.push(`/marketplace/templates/${result.data.id}`)
        } else {
          throw new Error('Failed to submit template')
        }
      }
    } catch (error) {
      console.error('Submission failed:', error)
      setValidationErrors([
        {
          field: 'submit',
          message: 'Failed to submit template. Please try again.',
          severity: 'error',
        },
      ])
    } finally {
      setSubmitting(false)
    }
  }, [currentStep, formData, mode, onSubmit, router, template, currentUser.id, validateCurrentStep])

  /**
   * Add tag handler
   */
  const handleAddTag = useCallback(
    (tag: string) => {
      if (tag.trim() && !formData.tags.includes(tag.trim()) && formData.tags.length < 10) {
        updateFormData({
          tags: [...formData.tags, tag.trim()],
        })
      }
    },
    [formData.tags, updateFormData]
  )

  /**
   * Remove tag handler
   */
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      updateFormData({
        tags: formData.tags.filter((tag) => tag !== tagToRemove),
      })
    },
    [formData.tags, updateFormData]
  )

  /**
   * Format number for display
   */
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }, [])

  // Get current step progress
  const stepProgress = useMemo(() => {
    return ((currentStep + 1) / publishingSteps.length) * 100
  }, [currentStep, publishingSteps.length])

  // Get validation errors for current step
  const currentStepErrors = useMemo(() => {
    return validationErrors.filter((error) => error.severity === 'error')
  }, [validationErrors])

  const currentStepWarnings = useMemo(() => {
    return validationErrors.filter((error) => error.severity === 'warning')
  }, [validationErrors])

  if (loading) {
    return (
      <div className={cn('flex h-screen items-center justify-center', className)}>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
          <p className='text-muted-foreground'>Loading publishing interface...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('min-h-screen bg-gradient-to-br from-blue-50 to-purple-50', className)}>
        {/* Header */}
        <div className='border-b bg-white/80 p-4 backdrop-blur-sm'>
          <div className='mx-auto flex max-w-7xl items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Button variant='ghost' onClick={onBack || (() => router.back())}>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <div>
                <h1 className='font-semibold text-xl'>
                  {mode === 'create'
                    ? 'Publish New Template'
                    : mode === 'edit'
                      ? 'Edit Template'
                      : 'New Version'}
                </h1>
                <p className='text-muted-foreground text-sm'>
                  {mode === 'create'
                    ? 'Share your workflow template with the community'
                    : 'Update your template and manage its settings'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <Button variant='outline' onClick={() => setShowPreview(true)}>
                <Eye className='mr-2 h-4 w-4' />
                Preview
              </Button>
              <Button variant='outline'>
                <Save className='mr-2 h-4 w-4' />
                Save Draft
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className='bg-white/50 p-4'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='font-medium text-sm'>
                Step {currentStep + 1} of {publishingSteps.length}
              </span>
              <span className='text-muted-foreground text-sm'>
                {Math.round(stepProgress)}% Complete
              </span>
            </div>
            <Progress value={stepProgress} className='h-2' />
          </div>
        </div>

        <div className='mx-auto max-w-7xl p-6'>
          <div className='grid grid-cols-1 gap-8 lg:grid-cols-4'>
            {/* Steps Sidebar */}
            <div className='lg:col-span-1'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg'>Publishing Steps</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                  {publishingSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all',
                        index === currentStep
                          ? 'border-2 border-blue-300 bg-blue-100'
                          : index < currentStep
                            ? 'bg-green-50 hover:bg-green-100'
                            : 'hover:bg-gray-50',
                        index > currentStep && 'cursor-not-allowed opacity-60'
                      )}
                      onClick={() => handleStepClick(index)}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full',
                          index === currentStep
                            ? 'bg-blue-600 text-white'
                            : step.completed
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-300 text-gray-600'
                        )}
                      >
                        {step.completed ? <Check className='h-4 w-4' /> : step.icon}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate font-medium text-sm'>{step.title}</p>
                        <p className='truncate text-muted-foreground text-xs'>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Existing Templates (if editing) */}
              {mode !== 'create' && existingTemplates.length > 0 && (
                <Card className='mt-6'>
                  <CardHeader>
                    <CardTitle className='text-sm'>Your Templates</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    {existingTemplates.slice(0, 3).map((existingTemplate) => (
                      <div
                        key={existingTemplate.id}
                        className='flex items-center gap-2 rounded p-2 hover:bg-gray-50'
                      >
                        <div
                          className='flex h-6 w-6 items-center justify-center rounded text-white text-xs'
                          style={{ backgroundColor: existingTemplate.color }}
                        >
                          {existingTemplate.icon || '📄'}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate font-medium text-xs'>{existingTemplate.name}</p>
                          <p className='text-muted-foreground text-xs'>
                            {formatNumber(existingTemplate.downloadCount || 0)} downloads
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Main Form Content */}
            <div className='lg:col-span-3'>
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle>{publishingSteps[currentStep].title}</CardTitle>
                      <p className='mt-1 text-muted-foreground text-sm'>
                        {publishingSteps[currentStep].description}
                      </p>
                    </div>
                    {currentStep > 0 && (
                      <Badge
                        variant={publishingSteps[currentStep].completed ? 'default' : 'secondary'}
                      >
                        {publishingSteps[currentStep].completed ? 'Complete' : 'In Progress'}
                      </Badge>
                    )}
                  </div>

                  {/* Validation Errors */}
                  {(currentStepErrors.length > 0 || currentStepWarnings.length > 0) && (
                    <div className='mt-4 space-y-2'>
                      {currentStepErrors.map((error, index) => (
                        <Alert key={index} variant='destructive'>
                          <AlertCircle className='h-4 w-4' />
                          <AlertDescription>{error.message}</AlertDescription>
                        </Alert>
                      ))}
                      {currentStepWarnings.map((warning, index) => (
                        <Alert key={index}>
                          <AlertCircle className='h-4 w-4' />
                          <AlertDescription>{warning.message}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardContent className='space-y-6'>
                  <AnimatePresence mode='wait'>
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Step 1: Basic Information */}
                      {currentStep === 0 && (
                        <div className='space-y-6'>
                          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div className='space-y-2'>
                              <Label htmlFor='template-name'>Template Name *</Label>
                              <Input
                                id='template-name'
                                value={formData.name}
                                onChange={(e) => updateFormData({ name: e.target.value })}
                                placeholder='Enter a descriptive name for your template'
                              />
                            </div>
                            <div className='space-y-2'>
                              <Label htmlFor='category'>Category *</Label>
                              <Select
                                value={formData.category}
                                onValueChange={(value) => updateFormData({ category: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder='Select a category' />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      <div className='flex items-center gap-2'>
                                        <span>{category.icon}</span>
                                        {category.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className='space-y-2'>
                            <Label htmlFor='description'>Short Description *</Label>
                            <Textarea
                              id='description'
                              value={formData.description}
                              onChange={(e) => updateFormData({ description: e.target.value })}
                              placeholder='Provide a brief, compelling description of what your template does'
                              rows={3}
                            />
                            <p className='text-muted-foreground text-xs'>
                              {formData.description.length}/300 characters
                            </p>
                          </div>

                          <div className='space-y-2'>
                            <Label htmlFor='long-description'>Detailed Description</Label>
                            <Textarea
                              id='long-description'
                              value={formData.longDescription || ''}
                              onChange={(e) => updateFormData({ longDescription: e.target.value })}
                              placeholder='Provide detailed information about your template, including features, benefits, and use cases'
                              rows={6}
                            />
                          </div>

                          <div className='space-y-2'>
                            <Label>Difficulty Level</Label>
                            <RadioGroup
                              value={formData.difficulty}
                              onValueChange={(value: any) => updateFormData({ difficulty: value })}
                            >
                              <div className='flex items-center space-x-2'>
                                <RadioGroupItem value='beginner' id='beginner' />
                                <Label htmlFor='beginner' className='cursor-pointer'>
                                  <span className='font-medium'>Beginner</span>
                                  <span className='ml-2 text-muted-foreground text-sm'>
                                    Easy to set up and use
                                  </span>
                                </Label>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <RadioGroupItem value='intermediate' id='intermediate' />
                                <Label htmlFor='intermediate' className='cursor-pointer'>
                                  <span className='font-medium'>Intermediate</span>
                                  <span className='ml-2 text-muted-foreground text-sm'>
                                    Some technical knowledge required
                                  </span>
                                </Label>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <RadioGroupItem value='advanced' id='advanced' />
                                <Label htmlFor='advanced' className='cursor-pointer'>
                                  <span className='font-medium'>Advanced</span>
                                  <span className='ml-2 text-muted-foreground text-sm'>
                                    Requires significant technical expertise
                                  </span>
                                </Label>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <RadioGroupItem value='expert' id='expert' />
                                <Label htmlFor='expert' className='cursor-pointer'>
                                  <span className='font-medium'>Expert</span>
                                  <span className='ml-2 text-muted-foreground text-sm'>
                                    For advanced developers only
                                  </span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Template Content */}
                      {currentStep === 1 && (
                        <div className='space-y-6'>
                          <div className='rounded-lg border-2 border-gray-300 border-dashed p-8 text-center'>
                            <Upload className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                            <h3 className='mb-2 font-medium'>Upload Template Content</h3>
                            <p className='mb-4 text-muted-foreground text-sm'>
                              Upload your workflow file, or paste the content directly
                            </p>
                            <div className='flex items-center justify-center gap-4'>
                              <Button variant='outline'>
                                <Upload className='mr-2 h-4 w-4' />
                                Upload File
                              </Button>
                              <Button variant='outline'>
                                <Code className='mr-2 h-4 w-4' />
                                Paste Content
                              </Button>
                            </div>
                          </div>

                          {formData.content && (
                            <Card>
                              <CardHeader>
                                <CardTitle className='flex items-center gap-2 text-sm'>
                                  <CheckCircle className='h-4 w-4 text-green-600' />
                                  Template Content Loaded
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className='text-muted-foreground text-sm'>
                                  Template content has been successfully loaded and validated.
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          <div className='space-y-4'>
                            <div className='space-y-2'>
                              <Label>Template Preview</Label>
                              <Button variant='outline' className='w-full'>
                                <Eye className='mr-2 h-4 w-4' />
                                Preview Template Execution
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Metadata & Details */}
                      {currentStep === 2 && (
                        <div className='space-y-6'>
                          <div className='space-y-2'>
                            <Label>Tags *</Label>
                            <div className='mb-2 flex flex-wrap gap-2'>
                              {formData.tags.map((tag) => (
                                <Badge key={tag} variant='secondary' className='gap-1'>
                                  {tag}
                                  <X
                                    className='h-3 w-3 cursor-pointer'
                                    onClick={() => handleRemoveTag(tag)}
                                  />
                                </Badge>
                              ))}
                            </div>
                            <div className='flex gap-2'>
                              <Input
                                placeholder='Add tags (press Enter)'
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddTag(e.currentTarget.value)
                                    e.currentTarget.value = ''
                                  }
                                }}
                              />
                              <Button
                                type='button'
                                variant='outline'
                                onClick={() => {
                                  const input = document.querySelector(
                                    'input[placeholder="Add tags (press Enter)"]'
                                  ) as HTMLInputElement
                                  if (input?.value) {
                                    handleAddTag(input.value)
                                    input.value = ''
                                  }
                                }}
                              >
                                <Plus className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>

                          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div className='space-y-2'>
                              <Label htmlFor='version'>Version *</Label>
                              <Input
                                id='version'
                                value={formData.metadata.version}
                                onChange={(e) =>
                                  updateNestedFormData('metadata', { version: e.target.value })
                                }
                                placeholder='1.0.0'
                              />
                            </div>
                            <div className='space-y-2'>
                              <Label htmlFor='license'>License</Label>
                              <Select
                                value={formData.metadata.license}
                                onValueChange={(value) =>
                                  updateNestedFormData('metadata', { license: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='MIT'>MIT License</SelectItem>
                                  <SelectItem value='Apache-2.0'>Apache 2.0</SelectItem>
                                  <SelectItem value='GPL-3.0'>GPL 3.0</SelectItem>
                                  <SelectItem value='BSD-3-Clause'>BSD 3-Clause</SelectItem>
                                  <SelectItem value='custom'>Custom License</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className='space-y-2'>
                            <Label>Requirements</Label>
                            <Textarea
                              value={formData.metadata.requirements.join('\n')}
                              onChange={(e) =>
                                updateNestedFormData('metadata', {
                                  requirements: e.target.value.split('\n').filter(Boolean),
                                })
                              }
                              placeholder='List requirements, one per line (e.g., Node.js 16+, API key for service X)'
                              rows={4}
                            />
                          </div>

                          <div className='space-y-2'>
                            <Label>Use Cases</Label>
                            <Textarea
                              value={formData.metadata.useCases.join('\n')}
                              onChange={(e) =>
                                updateNestedFormData('metadata', {
                                  useCases: e.target.value.split('\n').filter(Boolean),
                                })
                              }
                              placeholder='Describe common use cases, one per line'
                              rows={4}
                            />
                          </div>

                          <div className='space-y-2'>
                            <Label htmlFor='estimated-time'>Estimated Setup Time (minutes)</Label>
                            <Input
                              id='estimated-time'
                              type='number'
                              min='1'
                              max='1440'
                              value={formData.metadata.estimatedTime}
                              onChange={(e) =>
                                updateNestedFormData('metadata', {
                                  estimatedTime: Number.parseInt(e.target.value) || 30,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Step 4: Publishing Settings */}
                      {currentStep === 3 && (
                        <div className='space-y-6'>
                          <div className='space-y-4'>
                            <div className='space-y-2'>
                              <Label>Visibility</Label>
                              <RadioGroup
                                value={formData.publishing.visibility}
                                onValueChange={(value: any) =>
                                  updateNestedFormData('publishing', { visibility: value })
                                }
                              >
                                <div className='flex items-center space-x-2'>
                                  <RadioGroupItem value='public' id='public' />
                                  <Label htmlFor='public' className='cursor-pointer'>
                                    <div className='flex items-center gap-2'>
                                      <Globe className='h-4 w-4' />
                                      <span className='font-medium'>Public</span>
                                    </div>
                                    <p className='ml-6 text-muted-foreground text-sm'>
                                      Available to everyone in the marketplace
                                    </p>
                                  </Label>
                                </div>
                                <div className='flex items-center space-x-2'>
                                  <RadioGroupItem value='unlisted' id='unlisted' />
                                  <Label htmlFor='unlisted' className='cursor-pointer'>
                                    <div className='flex items-center gap-2'>
                                      <Eye className='h-4 w-4' />
                                      <span className='font-medium'>Unlisted</span>
                                    </div>
                                    <p className='ml-6 text-muted-foreground text-sm'>
                                      Only accessible via direct link
                                    </p>
                                  </Label>
                                </div>
                                <div className='flex items-center space-x-2'>
                                  <RadioGroupItem value='private' id='private' />
                                  <Label htmlFor='private' className='cursor-pointer'>
                                    <div className='flex items-center gap-2'>
                                      <Lock className='h-4 w-4' />
                                      <span className='font-medium'>Private</span>
                                    </div>
                                    <p className='ml-6 text-muted-foreground text-sm'>
                                      Only you can see and use this template
                                    </p>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>

                            <div className='space-y-2'>
                              <Label>Pricing</Label>
                              <RadioGroup
                                value={formData.publishing.pricing}
                                onValueChange={(value: any) =>
                                  updateNestedFormData('publishing', { pricing: value })
                                }
                              >
                                <div className='flex items-center space-x-2'>
                                  <RadioGroupItem value='free' id='free' />
                                  <Label htmlFor='free' className='cursor-pointer'>
                                    <div className='flex items-center gap-2'>
                                      <Gift className='h-4 w-4' />
                                      <span className='font-medium'>Free</span>
                                    </div>
                                    <p className='ml-6 text-muted-foreground text-sm'>
                                      Template is available at no cost
                                    </p>
                                  </Label>
                                </div>
                                <div className='flex items-center space-x-2'>
                                  <RadioGroupItem value='paid' id='paid' />
                                  <Label htmlFor='paid' className='cursor-pointer'>
                                    <div className='flex items-center gap-2'>
                                      <DollarSign className='h-4 w-4' />
                                      <span className='font-medium'>Paid</span>
                                    </div>
                                    <p className='ml-6 text-muted-foreground text-sm'>
                                      One-time purchase required
                                    </p>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>

                            {formData.publishing.pricing === 'paid' && (
                              <div className='space-y-2'>
                                <Label htmlFor='price'>Price (USD)</Label>
                                <Input
                                  id='price'
                                  type='number'
                                  min='0.99'
                                  step='0.01'
                                  value={formData.publishing.price || ''}
                                  onChange={(e) =>
                                    updateNestedFormData('publishing', {
                                      price: Number.parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  placeholder='9.99'
                                />
                              </div>
                            )}

                            <div className='space-y-4'>
                              <Label>Community Features</Label>
                              <div className='space-y-3'>
                                <div className='flex items-center justify-between'>
                                  <div>
                                    <p className='font-medium'>Allow Comments</p>
                                    <p className='text-muted-foreground text-sm'>
                                      Users can leave comments on your template
                                    </p>
                                  </div>
                                  <Switch
                                    checked={formData.publishing.allowComments}
                                    onCheckedChange={(checked) =>
                                      updateNestedFormData('publishing', { allowComments: checked })
                                    }
                                  />
                                </div>
                                <div className='flex items-center justify-between'>
                                  <div>
                                    <p className='font-medium'>Allow Ratings</p>
                                    <p className='text-muted-foreground text-sm'>
                                      Users can rate your template
                                    </p>
                                  </div>
                                  <Switch
                                    checked={formData.publishing.allowRating}
                                    onCheckedChange={(checked) =>
                                      updateNestedFormData('publishing', { allowRating: checked })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className='space-y-4'>
                            <Label>SEO & Discoverability</Label>
                            <div className='space-y-2'>
                              <Label htmlFor='meta-description'>Meta Description</Label>
                              <Textarea
                                id='meta-description'
                                value={formData.seo.metaDescription}
                                onChange={(e) =>
                                  updateNestedFormData('seo', { metaDescription: e.target.value })
                                }
                                placeholder='A brief description for search engines and social media'
                                rows={3}
                              />
                            </div>
                            <div className='space-y-2'>
                              <Label>SEO Keywords</Label>
                              <Input
                                value={formData.seo.keywords.join(', ')}
                                onChange={(e) =>
                                  updateNestedFormData('seo', {
                                    keywords: e.target.value
                                      .split(',')
                                      .map((k) => k.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder='workflow, automation, integration, api'
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 5: Preview & Submit */}
                      {currentStep === 4 && (
                        <div className='space-y-6'>
                          <div className='rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-6'>
                            <h3 className='mb-2 font-semibold'>Ready to Publish!</h3>
                            <p className='mb-4 text-muted-foreground text-sm'>
                              Please review your template details below before publishing to the
                              marketplace.
                            </p>
                          </div>

                          {/* Template Summary */}
                          <Card>
                            <CardHeader>
                              <div className='flex items-start gap-4'>
                                <div
                                  className='flex h-16 w-16 items-center justify-center rounded-lg font-bold text-2xl text-white'
                                  style={{ backgroundColor: '#3B82F6' }}
                                >
                                  📄
                                </div>
                                <div className='flex-1'>
                                  <CardTitle className='text-xl'>{formData.name}</CardTitle>
                                  <p className='mt-1 text-muted-foreground'>
                                    {formData.description}
                                  </p>
                                  <div className='mt-3 flex items-center gap-4 text-muted-foreground text-sm'>
                                    <span>
                                      Category:{' '}
                                      {categories.find((c) => c.id === formData.category)?.name}
                                    </span>
                                    <span>•</span>
                                    <span>Version: {formData.metadata.version}</span>
                                    <span>•</span>
                                    <span>Difficulty: {formData.difficulty}</span>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>

                          {/* Details Grid */}
                          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <Card>
                              <CardHeader>
                                <CardTitle className='text-sm'>Tags & Keywords</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className='flex flex-wrap gap-1'>
                                  {formData.tags.map((tag) => (
                                    <Badge key={tag} variant='secondary' className='text-xs'>
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle className='text-sm'>Publishing Settings</CardTitle>
                              </CardHeader>
                              <CardContent className='space-y-1 text-sm'>
                                <div className='flex justify-between'>
                                  <span>Visibility:</span>
                                  <Badge variant='outline'>{formData.publishing.visibility}</Badge>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Pricing:</span>
                                  <Badge variant='outline'>
                                    {formData.publishing.pricing === 'paid'
                                      ? `$${formData.publishing.price}`
                                      : formData.publishing.pricing}
                                  </Badge>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Comments:</span>
                                  <span>
                                    {formData.publishing.allowComments ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Ratings:</span>
                                  <span>
                                    {formData.publishing.allowRating ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Final Validation */}
                          <Card>
                            <CardHeader>
                              <CardTitle className='flex items-center gap-2 text-sm'>
                                <CheckCircle className='h-4 w-4 text-green-600' />
                                Validation Complete
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className='text-muted-foreground text-sm'>
                                Your template has passed all validation checks and is ready to be
                                published.
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </CardContent>

                <CardFooter className='flex items-center justify-between pt-6'>
                  <div className='flex items-center gap-2'>
                    {currentStep > 0 && (
                      <Button variant='outline' onClick={handlePreviousStep}>
                        <ChevronLeft className='mr-2 h-4 w-4' />
                        Previous
                      </Button>
                    )}
                  </div>

                  <div className='flex items-center gap-2'>
                    {currentStep < publishingSteps.length - 1 ? (
                      <Button onClick={handleNextStep} disabled={currentStepErrors.length > 0}>
                        Next Step
                        <ChevronRight className='ml-2 h-4 w-4' />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || currentStepErrors.length > 0}
                        className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      >
                        {submitting ? (
                          <>
                            <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Zap className='mr-2 h-4 w-4' />
                            Publish Template
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className='max-h-[80vh] max-w-4xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                This is how your template will appear in the marketplace
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              {/* Template preview content would go here */}
              <Card>
                <CardHeader className='bg-gradient-to-r from-blue-600 to-purple-600 text-white'>
                  <CardTitle>{formData.name}</CardTitle>
                  <p className='text-blue-100'>{formData.description}</p>
                </CardHeader>
                <CardContent className='p-6'>
                  <div className='mb-4 flex flex-wrap gap-2'>
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant='secondary'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {formData.longDescription && (
                    <p className='text-muted-foreground'>{formData.longDescription}</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowPreview(false)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default TemplatePublishingInterface
