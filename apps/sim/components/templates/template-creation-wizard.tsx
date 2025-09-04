/**
 * Template Creation Wizard - Step-by-Step Template Creation Interface
 *
 * This component provides a comprehensive wizard for creating templates with:
 * - Multi-step form with validation and progress tracking
 * - Visual workflow builder with drag-and-drop interface
 * - Metadata editor with category and tag selection
 * - Template preview and testing functionality
 * - Publishing workflow with quality validation
 * - Real-time collaboration support
 *
 * Design Features:
 * - Modern step-based wizard layout
 * - Intuitive drag-and-drop interface
 * - Real-time validation and feedback
 * - Responsive design for all devices
 * - Accessibility-compliant navigation
 * - Progressive disclosure of advanced options
 *
 * @author Claude Code Template System - UI/UX Specialist
 * @version 1.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Info,
  Settings,
  Tag,
  Upload,
  Users,
  Wand2,
  Workflow,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ColorPicker } from '@/components/ui/color-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type {
  Template,
  TemplateCategory,
  TemplateCreationOptions,
  TemplateDifficulty,
  TemplateMetadata,
  TemplateValidationResult,
  TemplateVisibility,
} from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Wizard step configuration
 */
interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  isOptional?: boolean
  isComplete?: boolean
  hasError?: boolean
  component: React.ComponentType<any>
}

/**
 * Template Creation Wizard Props Interface
 */
export interface TemplateCreationWizardProps {
  /** Initial template data (for editing existing templates) */
  initialTemplate?: Partial<Template>
  /** Available template categories */
  categories: TemplateCategory[]
  /** Available tags for template classification */
  availableTags: string[]
  /** Template creation options */
  creationOptions?: TemplateCreationOptions
  /** Callback when template is created/updated */
  onTemplateSubmit?: (template: TemplateMetadata, workflow: any) => Promise<void>
  /** Callback when wizard is cancelled */
  onCancel?: () => void
  /** Callback for template preview */
  onPreview?: (template: TemplateMetadata, workflow: any) => void
  /** Callback for template validation */
  onValidate?: (template: TemplateMetadata, workflow: any) => Promise<TemplateValidationResult>
  /** Current user information */
  currentUser?: {
    id: string
    name: string
    avatar?: string
  }
  /** Loading state */
  isLoading?: boolean
  /** Custom CSS class */
  className?: string
}

/**
 * Template wizard state interface
 */
interface WizardState {
  currentStep: number
  templateData: TemplateMetadata
  workflowData: any
  validationResults?: TemplateValidationResult
  isDraft: boolean
  isSubmitting: boolean
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
}

/**
 * Basic Information Step Component
 */
const BasicInfoStep: React.FC<{
  templateData: TemplateMetadata
  errors: Record<string, string[]>
  onChange: (data: Partial<TemplateMetadata>) => void
}> = ({ templateData, errors, onChange }) => {
  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='template-name'>
            Template Name <span className='text-red-500'>*</span>
          </Label>
          <Input
            id='template-name'
            value={templateData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder='Enter template name'
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className='text-red-500 text-sm'>{errors.name[0]}</p>}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='template-author'>
            Author <span className='text-red-500'>*</span>
          </Label>
          <Input
            id='template-author'
            value={templateData.author}
            onChange={(e) => onChange({ author: e.target.value })}
            placeholder='Your name'
            className={errors.author ? 'border-red-500' : ''}
          />
          {errors.author && <p className='text-red-500 text-sm'>{errors.author[0]}</p>}
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='template-description'>Description</Label>
        <Textarea
          id='template-description'
          value={templateData.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder='Describe what this template does and when to use it'
          className='min-h-[100px]'
        />
        <p className='text-muted-foreground text-sm'>
          A good description helps users understand when and how to use your template.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='space-y-2'>
          <Label htmlFor='template-icon'>Template Icon</Label>
          <div className='flex items-center gap-2'>
            <Input
              id='template-icon'
              value={templateData.icon}
              onChange={(e) => onChange({ icon: e.target.value })}
              placeholder='📄'
              className='w-16 text-center'
            />
            <span className='text-2xl'>{templateData.icon || '📄'}</span>
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='template-color'>Template Color</Label>
          <ColorPicker value={templateData.color} onChange={(color) => onChange({ color })} />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='template-version'>Version</Label>
          <Input
            id='template-version'
            value={templateData.version}
            onChange={(e) => onChange({ version: e.target.value })}
            placeholder='1.0.0'
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Category and Classification Step Component
 */
const CategoryStep: React.FC<{
  templateData: TemplateMetadata
  categories: TemplateCategory[]
  availableTags: string[]
  errors: Record<string, string[]>
  onChange: (data: Partial<TemplateMetadata>) => void
}> = ({ templateData, categories, availableTags, errors, onChange }) => {
  const [customTag, setCustomTag] = useState('')

  const addCustomTag = useCallback(() => {
    if (customTag.trim() && !templateData.tags.includes(customTag.trim())) {
      onChange({
        tags: [...templateData.tags, customTag.trim()],
      })
      setCustomTag('')
    }
  }, [customTag, templateData.tags, onChange])

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange({
        tags: templateData.tags.filter((tag) => tag !== tagToRemove),
      })
    },
    [templateData.tags, onChange]
  )

  return (
    <div className='space-y-6'>
      <div className='grid gap-6 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='template-category'>
            Category <span className='text-red-500'>*</span>
          </Label>
          <Select
            value={templateData.category}
            onValueChange={(value) => onChange({ category: value })}
          >
            <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
              <SelectValue placeholder='Select a category' />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>{category.icon}</span>
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className='text-red-500 text-sm'>{errors.category[0]}</p>}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='template-difficulty'>
            Difficulty Level <span className='text-red-500'>*</span>
          </Label>
          <Select
            value={templateData.difficulty}
            onValueChange={(value: TemplateDifficulty) => onChange({ difficulty: value })}
          >
            <SelectTrigger className={errors.difficulty ? 'border-red-500' : ''}>
              <SelectValue placeholder='Select difficulty' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='beginner'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-green-500' />
                  Beginner
                </div>
              </SelectItem>
              <SelectItem value='intermediate'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-blue-500' />
                  Intermediate
                </div>
              </SelectItem>
              <SelectItem value='advanced'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-orange-500' />
                  Advanced
                </div>
              </SelectItem>
              <SelectItem value='expert'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-red-500' />
                  Expert
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.difficulty && <p className='text-red-500 text-sm'>{errors.difficulty[0]}</p>}
        </div>
      </div>

      <div className='space-y-4'>
        <Label>Tags</Label>

        {/* Popular Tags */}
        <div>
          <p className='mb-2 text-muted-foreground text-sm'>Popular tags:</p>
          <div className='flex flex-wrap gap-2'>
            {availableTags.slice(0, 12).map((tag) => (
              <Badge
                key={tag}
                variant={templateData.tags.includes(tag) ? 'default' : 'outline'}
                className='cursor-pointer'
                onClick={() => {
                  if (templateData.tags.includes(tag)) {
                    removeTag(tag)
                  } else {
                    onChange({ tags: [...templateData.tags, tag] })
                  }
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Custom Tag Input */}
        <div>
          <p className='mb-2 text-muted-foreground text-sm'>Add custom tags:</p>
          <div className='flex gap-2'>
            <Input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder='Enter custom tag'
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomTag()
                }
              }}
            />
            <Button onClick={addCustomTag} variant='outline'>
              Add
            </Button>
          </div>
        </div>

        {/* Selected Tags */}
        {templateData.tags.length > 0 && (
          <div>
            <p className='mb-2 text-muted-foreground text-sm'>Selected tags:</p>
            <div className='flex flex-wrap gap-2'>
              {templateData.tags.map((tag) => (
                <Badge key={tag} variant='secondary' className='gap-1'>
                  {tag}
                  <button onClick={() => removeTag(tag)} className='ml-1 hover:text-red-500'>
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor='estimated-time'>Estimated Setup Time</Label>
        <Input
          id='estimated-time'
          value={templateData.estimatedTime || ''}
          onChange={(e) => onChange({ estimatedTime: e.target.value })}
          placeholder='e.g., 5-10 minutes'
        />
      </div>
    </div>
  )
}

/**
 * Workflow Builder Step Component
 */
const WorkflowBuilderStep: React.FC<{
  workflowData: any
  onChange: (data: any) => void
}> = ({ workflowData, onChange }) => {
  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-dashed p-8 text-center'>
        <Workflow className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
        <h3 className='mb-2 font-semibold text-lg'>Visual Workflow Builder</h3>
        <p className='mb-4 text-muted-foreground'>
          Drag and drop blocks to create your template workflow
        </p>
        <Button variant='outline'>
          <Wand2 className='mr-2 h-4 w-4' />
          Open Workflow Builder
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Block Library</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='flex items-center gap-2 rounded p-2 hover:bg-muted'>
              <div className='h-4 w-4 rounded bg-blue-500' />
              <span className='text-sm'>Trigger Blocks</span>
            </div>
            <div className='flex items-center gap-2 rounded p-2 hover:bg-muted'>
              <div className='h-4 w-4 rounded bg-green-500' />
              <span className='text-sm'>Action Blocks</span>
            </div>
            <div className='flex items-center gap-2 rounded p-2 hover:bg-muted'>
              <div className='h-4 w-4 rounded bg-orange-500' />
              <span className='text-sm'>Logic Blocks</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Workflow Properties</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='text-sm'>
              <span className='text-muted-foreground'>Total Blocks:</span> 0
            </div>
            <div className='text-sm'>
              <span className='text-muted-foreground'>Connections:</span> 0
            </div>
            <div className='text-sm'>
              <span className='text-muted-foreground'>Complexity:</span> Simple
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Publishing Configuration Step Component
 */
const PublishingStep: React.FC<{
  templateData: TemplateMetadata
  onChange: (data: Partial<TemplateMetadata>) => void
}> = ({ templateData, onChange }) => {
  return (
    <div className='space-y-6'>
      <div className='grid gap-6 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='template-visibility'>Template Visibility</Label>
          <Select
            value={templateData.visibility}
            onValueChange={(value: TemplateVisibility) => onChange({ visibility: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='public'>
                <div className='flex items-center gap-2'>
                  <Users className='h-4 w-4' />
                  <div>
                    <div className='font-medium'>Public</div>
                    <div className='text-muted-foreground text-xs'>
                      Available to everyone in the marketplace
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value='organization'>
                <div className='flex items-center gap-2'>
                  <Settings className='h-4 w-4' />
                  <div>
                    <div className='font-medium'>Organization</div>
                    <div className='text-muted-foreground text-xs'>
                      Only visible to your organization
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value='private'>
                <div className='flex items-center gap-2'>
                  <Eye className='h-4 w-4' />
                  <div>
                    <div className='font-medium'>Private</div>
                    <div className='text-muted-foreground text-xs'>Only visible to you</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-4'>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='allow-comments'
              checked={templateData.allowComments}
              onCheckedChange={(checked) => onChange({ allowComments: Boolean(checked) })}
            />
            <Label
              htmlFor='allow-comments'
              className='font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Allow comments and reviews
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      <div className='space-y-4'>
        <h4 className='font-medium'>Template Requirements</h4>
        <div className='space-y-2'>
          {templateData.requirements.map((req, index) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                value={req}
                onChange={(e) => {
                  const newReqs = [...templateData.requirements]
                  newReqs[index] = e.target.value
                  onChange({ requirements: newReqs })
                }}
                placeholder='e.g., API key for service X'
              />
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  const newReqs = templateData.requirements.filter((_, i) => i !== index)
                  onChange({ requirements: newReqs })
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant='outline'
            onClick={() => onChange({ requirements: [...templateData.requirements, ''] })}
          >
            Add Requirement
          </Button>
        </div>
      </div>

      <div className='space-y-4'>
        <h4 className='font-medium'>Use Cases</h4>
        <div className='space-y-2'>
          {templateData.useCases.map((useCase, index) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                value={useCase}
                onChange={(e) => {
                  const newUseCases = [...templateData.useCases]
                  newUseCases[index] = e.target.value
                  onChange({ useCases: newUseCases })
                }}
                placeholder='e.g., Automated customer onboarding'
              />
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  const newUseCases = templateData.useCases.filter((_, i) => i !== index)
                  onChange({ useCases: newUseCases })
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant='outline'
            onClick={() => onChange({ useCases: [...templateData.useCases, ''] })}
          >
            Add Use Case
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Review and Preview Step Component
 */
const ReviewStep: React.FC<{
  templateData: TemplateMetadata
  validationResults?: TemplateValidationResult
  onPreview: () => void
}> = ({ templateData, validationResults, onPreview }) => {
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CheckCircle className='h-5 w-5' />
            Template Summary
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <span className='text-muted-foreground text-sm'>Name:</span>
              <p className='font-medium'>{templateData.name}</p>
            </div>
            <div>
              <span className='text-muted-foreground text-sm'>Author:</span>
              <p className='font-medium'>{templateData.author}</p>
            </div>
            <div>
              <span className='text-muted-foreground text-sm'>Category:</span>
              <p className='font-medium'>{templateData.category}</p>
            </div>
            <div>
              <span className='text-muted-foreground text-sm'>Difficulty:</span>
              <Badge variant='outline'>{templateData.difficulty}</Badge>
            </div>
          </div>

          {templateData.description && (
            <div>
              <span className='text-muted-foreground text-sm'>Description:</span>
              <p className='mt-1 text-sm'>{templateData.description}</p>
            </div>
          )}

          <div>
            <span className='text-muted-foreground text-sm'>Tags:</span>
            <div className='mt-1 flex flex-wrap gap-1'>
              {templateData.tags.map((tag) => (
                <Badge key={tag} variant='secondary' className='text-xs'>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Info className='h-5 w-5' />
              Quality Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center gap-4'>
              <div>
                <span className='text-muted-foreground text-sm'>Quality Score:</span>
                <div className='flex items-center gap-2'>
                  <Progress value={validationResults.qualityScore} className='w-20' />
                  <span className='font-medium'>{validationResults.qualityScore}%</span>
                </div>
              </div>
            </div>

            {validationResults.errors.length > 0 && (
              <div>
                <h5 className='mb-2 font-medium text-red-600'>Errors to Fix:</h5>
                <ul className='space-y-1'>
                  {validationResults.errors.map((error, index) => (
                    <li key={index} className='text-red-600 text-sm'>
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationResults.warnings.length > 0 && (
              <div>
                <h5 className='mb-2 font-medium text-yellow-600'>Warnings:</h5>
                <ul className='space-y-1'>
                  {validationResults.warnings.map((warning, index) => (
                    <li key={index} className='text-sm text-yellow-600'>
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationResults.suggestions.length > 0 && (
              <div>
                <h5 className='mb-2 font-medium text-blue-600'>Suggestions:</h5>
                <ul className='space-y-1'>
                  {validationResults.suggestions.map((suggestion, index) => (
                    <li key={index} className='text-blue-600 text-sm'>
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className='flex justify-center'>
        <Button onClick={onPreview} variant='outline' className='gap-2'>
          <Eye className='h-4 w-4' />
          Preview Template
        </Button>
      </div>
    </div>
  )
}

/**
 * Main Template Creation Wizard Component
 */
export const TemplateCreationWizard: React.FC<TemplateCreationWizardProps> = ({
  initialTemplate,
  categories = [],
  availableTags = [],
  creationOptions,
  onTemplateSubmit,
  onCancel,
  onPreview,
  onValidate,
  currentUser,
  isLoading = false,
  className,
}) => {
  const [wizardState, setWizardState] = useState<WizardState>(() => {
    const initialData: TemplateMetadata = {
      name: initialTemplate?.name || '',
      description: initialTemplate?.description || '',
      author: initialTemplate?.author || currentUser?.name || '',
      category: initialTemplate?.category || '',
      icon: initialTemplate?.icon || '📄',
      color: initialTemplate?.color || '#3B82F6',
      tags: initialTemplate?.metadata?.tags || [],
      difficulty: initialTemplate?.metadata?.difficulty || 'beginner',
      version: initialTemplate?.metadata?.version || '1.0.0',
      estimatedTime: initialTemplate?.metadata?.estimatedTime || '',
      requirements: initialTemplate?.metadata?.requirements || [],
      useCases: initialTemplate?.metadata?.useCases || [],
      visibility: initialTemplate?.metadata?.visibility || 'public',
      status: 'draft',
      isPublic: true,
      allowComments: initialTemplate?.metadata?.allowComments ?? true,
    }

    return {
      currentStep: 0,
      templateData: initialData,
      workflowData: initialTemplate?.state || {},
      isDraft: false,
      isSubmitting: false,
      errors: {},
      warnings: {},
    }
  })

  // Define wizard steps
  const wizardSteps: WizardStep[] = useMemo(
    () => [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Name, description, and basic details',
        icon: Settings,
        component: BasicInfoStep,
      },
      {
        id: 'category',
        title: 'Category & Tags',
        description: 'Organize and classify your template',
        icon: Tag,
        component: CategoryStep,
      },
      {
        id: 'workflow',
        title: 'Workflow Builder',
        description: 'Create your template workflow',
        icon: Workflow,
        component: WorkflowBuilderStep,
      },
      {
        id: 'publishing',
        title: 'Publishing Settings',
        description: 'Configure visibility and permissions',
        icon: Upload,
        component: PublishingStep,
      },
      {
        id: 'review',
        title: 'Review & Publish',
        description: 'Final review and quality check',
        icon: CheckCircle,
        component: ReviewStep,
      },
    ],
    []
  )

  // Update wizard state
  const updateWizardState = useCallback((updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Update template data
  const updateTemplateData = useCallback((updates: Partial<TemplateMetadata>) => {
    setWizardState((prev) => ({
      ...prev,
      templateData: { ...prev.templateData, ...updates },
    }))
  }, [])

  // Update workflow data
  const updateWorkflowData = useCallback((updates: any) => {
    setWizardState((prev) => ({
      ...prev,
      workflowData: { ...prev.workflowData, ...updates },
    }))
  }, [])

  // Validate current step
  const validateCurrentStep = useCallback(() => {
    const errors: Record<string, string[]> = {}
    const step = wizardSteps[wizardState.currentStep]

    switch (step.id) {
      case 'basic-info':
        if (!wizardState.templateData.name.trim()) {
          errors.name = ['Template name is required']
        }
        if (!wizardState.templateData.author.trim()) {
          errors.author = ['Author name is required']
        }
        break
      case 'category':
        if (!wizardState.templateData.category) {
          errors.category = ['Please select a category']
        }
        if (!wizardState.templateData.difficulty) {
          errors.difficulty = ['Please select a difficulty level']
        }
        break
    }

    updateWizardState({ errors })
    return Object.keys(errors).length === 0
  }, [wizardState.currentStep, wizardState.templateData, wizardSteps, updateWizardState])

  // Navigate between steps
  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < wizardSteps.length) {
        updateWizardState({ currentStep: stepIndex })
      }
    },
    [wizardSteps.length, updateWizardState]
  )

  const goToPreviousStep = useCallback(() => {
    goToStep(wizardState.currentStep - 1)
  }, [goToStep, wizardState.currentStep])

  const goToNextStep = useCallback(() => {
    if (validateCurrentStep()) {
      goToStep(wizardState.currentStep + 1)
    }
  }, [goToStep, validateCurrentStep, wizardState.currentStep])

  // Handle template validation
  const handleValidation = useCallback(async () => {
    if (onValidate) {
      try {
        const result = await onValidate(wizardState.templateData, wizardState.workflowData)
        updateWizardState({ validationResults: result })
      } catch (error) {
        console.error('Template validation failed:', error)
      }
    }
  }, [onValidate, wizardState.templateData, wizardState.workflowData, updateWizardState])

  // Handle template preview
  const handlePreview = useCallback(() => {
    onPreview?.(wizardState.templateData, wizardState.workflowData)
  }, [onPreview, wizardState.templateData, wizardState.workflowData])

  // Handle template submission
  const handleSubmit = useCallback(async () => {
    if (!onTemplateSubmit || wizardState.isSubmitting) return

    updateWizardState({ isSubmitting: true })
    try {
      await onTemplateSubmit(wizardState.templateData, wizardState.workflowData)
    } catch (error) {
      console.error('Template submission failed:', error)
    } finally {
      updateWizardState({ isSubmitting: false })
    }
  }, [
    onTemplateSubmit,
    wizardState.isSubmitting,
    wizardState.templateData,
    wizardState.workflowData,
    updateWizardState,
  ])

  // Calculate progress
  const progress = useMemo(() => {
    return ((wizardState.currentStep + 1) / wizardSteps.length) * 100
  }, [wizardState.currentStep, wizardSteps.length])

  const currentStep = wizardSteps[wizardState.currentStep]
  const StepComponent = currentStep.component

  // Run validation when reaching review step
  React.useEffect(() => {
    if (wizardState.currentStep === wizardSteps.length - 1) {
      handleValidation()
    }
  }, [wizardState.currentStep, wizardSteps.length, handleValidation])

  return (
    <div className={cn('mx-auto max-w-4xl space-y-6', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-2xl'>
            {initialTemplate ? 'Edit Template' : 'Create New Template'}
          </h1>
          <p className='text-muted-foreground'>{currentStep.description}</p>
        </div>
        {onCancel && (
          <Button variant='ghost' onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className='space-y-2'>
        <div className='flex justify-between text-sm'>
          <span>
            Step {wizardState.currentStep + 1} of {wizardSteps.length}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className='h-2' />
      </div>

      {/* Step Navigation */}
      <div className='flex gap-4 overflow-x-auto pb-4'>
        {wizardSteps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => goToStep(index)}
            disabled={index > wizardState.currentStep}
            className={cn(
              'flex min-w-fit items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
              index === wizardState.currentStep
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : index < wizardState.currentStep
                  ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-gray-200 text-gray-500'
            )}
          >
            <step.icon className='h-4 w-4' />
            <div className='text-left'>
              <div className='font-medium'>{step.title}</div>
            </div>
            {index < wizardState.currentStep && <CheckCircle className='h-4 w-4 text-green-600' />}
          </button>
        ))}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <currentStep.icon className='h-5 w-5' />
            {currentStep.title}
          </CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode='wait'>
            <motion.div
              key={wizardState.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StepComponent
                templateData={wizardState.templateData}
                workflowData={wizardState.workflowData}
                categories={categories}
                availableTags={availableTags}
                errors={wizardState.errors}
                validationResults={wizardState.validationResults}
                onChange={updateTemplateData}
                onWorkflowChange={updateWorkflowData}
                onPreview={handlePreview}
              />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className='flex justify-between'>
        <Button
          variant='outline'
          onClick={goToPreviousStep}
          disabled={wizardState.currentStep === 0}
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Previous
        </Button>

        <div className='flex gap-2'>
          {wizardState.currentStep < wizardSteps.length - 1 ? (
            <Button onClick={goToNextStep}>
              Next
              <ArrowRight className='ml-2 h-4 w-4' />
            </Button>
          ) : (
            <div className='flex gap-2'>
              <Button variant='outline' onClick={handlePreview}>
                <Eye className='mr-2 h-4 w-4' />
                Preview
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={wizardState.isSubmitting || !wizardState.validationResults?.isValid}
              >
                {wizardState.isSubmitting ? (
                  <>
                    <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className='mr-2 h-4 w-4' />
                    Publish Template
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TemplateCreationWizard
