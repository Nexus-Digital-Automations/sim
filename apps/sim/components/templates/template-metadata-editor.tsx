/**
 * Template Metadata Editor - Comprehensive Template Information Management
 *
 * This component provides a rich interface for editing template metadata:
 * - Category and tag management with auto-suggestions
 * - Visual branding with color and icon selection
 * - Requirements and use cases with dynamic lists
 * - Publishing settings and visibility controls
 * - Quality assessment and validation feedback
 * - Version management and changelog tracking
 *
 * Design Features:
 * - Intuitive form layout with logical grouping
 * - Real-time validation and error feedback
 * - Rich text editing for descriptions
 * - Visual preview of metadata changes
 * - Accessibility-compliant form controls
 * - Responsive design for all screen sizes
 *
 * @author Claude Code Template System - UI/UX Specialist
 * @version 1.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  Plus,
  Save,
  Settings,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ColorPicker } from '@/components/ui/color-picker'
import { ImageUpload } from '@/components/ui/image-upload'
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
import { Textarea } from '@/components/ui/textarea'
import type {
  TemplateCategory,
  TemplateDifficulty,
  TemplateMetadata,
  TemplateValidationResult,
  TemplateVisibility,
} from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Template Metadata Editor Props Interface
 */
export interface TemplateMetadataEditorProps {
  /** Initial metadata values */
  metadata: TemplateMetadata
  /** Available template categories */
  categories: TemplateCategory[]
  /** Popular tags for auto-suggestions */
  popularTags: string[]
  /** Validation results for quality feedback */
  validationResults?: TemplateValidationResult
  /** Callback when metadata changes */
  onChange: (metadata: TemplateMetadata) => void
  /** Callback for saving metadata */
  onSave?: () => void
  /** Callback for metadata validation */
  onValidate?: () => void
  /** Whether the editor is in read-only mode */
  readOnly?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Custom CSS class */
  className?: string
}

/**
 * Form validation errors interface
 */
interface ValidationErrors {
  [key: string]: string[]
}

/**
 * Tag input with auto-suggestions
 */
const TagInput: React.FC<{
  tags: string[]
  popularTags: string[]
  onChange: (tags: string[]) => void
  readOnly?: boolean
}> = ({ tags, popularTags, onChange, readOnly = false }) => {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return popularTags.slice(0, 8)
    return popularTags
      .filter((tag) => tag.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(tag))
      .slice(0, 8)
  }, [inputValue, popularTags, tags])

  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim()
      if (trimmedTag && !tags.includes(trimmedTag)) {
        onChange([...tags, trimmedTag])
      }
      setInputValue('')
      setShowSuggestions(false)
    },
    [tags, onChange]
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove))
    },
    [tags, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (inputValue.trim()) {
          addTag(inputValue)
        }
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        removeTag(tags[tags.length - 1])
      }
    },
    [inputValue, tags, addTag, removeTag]
  )

  return (
    <div className='space-y-3'>
      {/* Tag Input */}
      <div className='relative'>
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder='Type tags and press Enter'
          disabled={readOnly}
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className='absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-lg'>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => addTag(suggestion)}
                className='flex w-full items-center px-3 py-2 text-sm hover:bg-gray-50'
              >
                <Tag className='mr-2 h-3 w-3' />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Tags */}
      {tags.length > 0 && (
        <div className='flex flex-wrap gap-1'>
          {tags.map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant='secondary' className='gap-1'>
              {tag}
              {!readOnly && (
                <button
                  onClick={() => removeTag(tag)}
                  className='ml-1 hover:text-red-500'
                  type='button'
                >
                  <X className='h-3 w-3' />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Dynamic list input for requirements and use cases
 */
const DynamicListInput: React.FC<{
  items: string[]
  placeholder: string
  onChange: (items: string[]) => void
  readOnly?: boolean
}> = ({ items, placeholder, onChange, readOnly = false }) => {
  const addItem = useCallback(() => {
    onChange([...items, ''])
  }, [items, onChange])

  const updateItem = useCallback(
    (index: number, value: string) => {
      const updated = [...items]
      updated[index] = value
      onChange(updated)
    },
    [items, onChange]
  )

  const removeItem = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index))
    },
    [items, onChange]
  )

  return (
    <div className='space-y-2'>
      {items.map((item, index) => (
        <div key={index} className='flex items-center gap-2'>
          <Input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={placeholder}
            disabled={readOnly}
          />
          {!readOnly && (
            <Button
              type='button'
              size='sm'
              variant='ghost'
              onClick={() => removeItem(index)}
              className='h-9 w-9 p-0 text-red-500 hover:text-red-600'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button type='button' variant='outline' onClick={addItem} className='w-full'>
          <Plus className='mr-2 h-4 w-4' />
          Add Item
        </Button>
      )}
    </div>
  )
}

/**
 * Quality assessment display
 */
const QualityAssessment: React.FC<{
  validationResults?: TemplateValidationResult
  onValidate?: () => void
}> = ({ validationResults, onValidate }) => {
  if (!validationResults) {
    return (
      <Card>
        <CardContent className='flex items-center justify-between p-4'>
          <div className='flex items-center gap-2'>
            <AlertCircle className='h-5 w-5 text-muted-foreground' />
            <span className='text-muted-foreground text-sm'>Quality assessment not available</span>
          </div>
          {onValidate && (
            <Button size='sm' variant='outline' onClick={onValidate}>
              Run Assessment
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <CheckCircle className='h-5 w-5' />
          Quality Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Overall Score */}
        <div className='flex items-center justify-between'>
          <span className='font-medium text-sm'>Overall Quality</span>
          <div className='flex items-center gap-2'>
            <Progress value={validationResults.qualityScore} className='w-24' />
            <span
              className={cn('font-medium text-sm', getScoreColor(validationResults.qualityScore))}
            >
              {validationResults.qualityScore}%
            </span>
          </div>
        </div>

        {/* Individual Scores */}
        <div className='grid gap-2 text-sm'>
          {Object.entries(validationResults.checks).map(([check, passed]) => (
            <div key={check} className='flex items-center justify-between'>
              <span className='capitalize'>{check.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div
                className={cn(
                  'flex items-center gap-1',
                  passed ? 'text-green-600' : 'text-red-600'
                )}
              >
                {passed ? <CheckCircle className='h-4 w-4' /> : <X className='h-4 w-4' />}
                <span className='text-xs'>{passed ? 'Pass' : 'Fail'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Issues */}
        {validationResults.errors.length > 0 && (
          <div className='space-y-2'>
            <h5 className='font-medium text-red-600 text-sm'>Issues to Fix</h5>
            <ul className='space-y-1'>
              {validationResults.errors.map((error, index) => (
                <li key={index} className='text-red-600 text-xs'>
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {validationResults.warnings.length > 0 && (
          <div className='space-y-2'>
            <h5 className='font-medium text-sm text-yellow-600'>Warnings</h5>
            <ul className='space-y-1'>
              {validationResults.warnings.map((warning, index) => (
                <li key={index} className='text-xs text-yellow-600'>
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {validationResults.suggestions.length > 0 && (
          <div className='space-y-2'>
            <h5 className='font-medium text-blue-600 text-sm'>Suggestions</h5>
            <ul className='space-y-1'>
              {validationResults.suggestions.map((suggestion, index) => (
                <li key={index} className='text-blue-600 text-xs'>
                  • {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Main Template Metadata Editor Component
 */
export const TemplateMetadataEditor: React.FC<TemplateMetadataEditorProps> = ({
  metadata,
  categories = [],
  popularTags = [],
  validationResults,
  onChange,
  onSave,
  onValidate,
  readOnly = false,
  isLoading = false,
  className,
}) => {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'publishing' | 'quality'>(
    'basic'
  )

  // Validate form fields
  const validateField = useCallback((field: string, value: any): string[] => {
    const fieldErrors: string[] = []

    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) {
          fieldErrors.push('Template name is required')
        } else if (value.trim().length < 3) {
          fieldErrors.push('Template name must be at least 3 characters')
        } else if (value.trim().length > 100) {
          fieldErrors.push('Template name must be less than 100 characters')
        }
        break
      case 'author':
        if (!value || value.trim().length === 0) {
          fieldErrors.push('Author name is required')
        }
        break
      case 'category':
        if (!value) {
          fieldErrors.push('Please select a category')
        }
        break
      case 'difficulty':
        if (!value) {
          fieldErrors.push('Please select a difficulty level')
        }
        break
      case 'version':
        if (!value || value.trim().length === 0) {
          fieldErrors.push('Version is required')
        } else if (!/^\d+\.\d+\.\d+$/.test(value.trim())) {
          fieldErrors.push('Version must follow semantic versioning (e.g., 1.0.0)')
        }
        break
    }

    return fieldErrors
  }, [])

  // Update metadata with validation
  const updateMetadata = useCallback(
    (field: string, value: any) => {
      if (readOnly) return

      const fieldErrors = validateField(field, value)
      setErrors((prev) => ({
        ...prev,
        [field]: fieldErrors,
      }))

      onChange({
        ...metadata,
        [field]: value,
      })
    },
    [metadata, onChange, readOnly, validateField]
  )

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    let completed = 0
    const total = 10 // Total number of important fields

    if (metadata.name?.trim()) completed++
    if (metadata.author?.trim()) completed++
    if (metadata.description?.trim()) completed++
    if (metadata.category) completed++
    if (metadata.difficulty) completed++
    if (metadata.version?.trim()) completed++
    if (metadata.tags.length > 0) completed++
    if (metadata.requirements.length > 0) completed++
    if (metadata.useCases.length > 0) completed++
    if (metadata.estimatedTime?.trim()) completed++

    return (completed / total) * 100
  }, [metadata])

  // Check if form has errors
  const hasErrors = useMemo(() => {
    return Object.values(errors).some((fieldErrors) => fieldErrors.length > 0)
  }, [errors])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with completion status */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='font-semibold text-xl'>Template Metadata</h2>
          <p className='text-muted-foreground text-sm'>
            Configure your template's information and settings
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <div className='text-right'>
            <div className='font-medium text-sm'>{Math.round(completionPercentage)}% Complete</div>
            <Progress value={completionPercentage} className='mt-1 w-24' />
          </div>
          {onSave && (
            <Button onClick={onSave} disabled={hasErrors || isLoading} className='gap-2'>
              {isLoading ? (
                <>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  Saving...
                </>
              ) : (
                <>
                  <Save className='h-4 w-4' />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className='flex space-x-1 rounded-lg bg-gray-100 p-1'>
        {[
          { id: 'basic', name: 'Basic Info', icon: Settings },
          { id: 'advanced', name: 'Advanced', icon: Tag },
          { id: 'publishing', name: 'Publishing', icon: Upload },
          { id: 'quality', name: 'Quality', icon: CheckCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className='h-4 w-4' />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'basic' && (
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Basic Information</CardTitle>
                <CardDescription>Essential details about your template</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='template-name'>
                    Template Name <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='template-name'
                    value={metadata.name}
                    onChange={(e) => updateMetadata('name', e.target.value)}
                    placeholder='Enter template name'
                    disabled={readOnly}
                    className={errors.name?.length ? 'border-red-500' : ''}
                  />
                  {errors.name?.length > 0 && (
                    <p className='text-red-500 text-xs'>{errors.name[0]}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='template-author'>
                    Author <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='template-author'
                    value={metadata.author}
                    onChange={(e) => updateMetadata('author', e.target.value)}
                    placeholder='Your name'
                    disabled={readOnly}
                    className={errors.author?.length ? 'border-red-500' : ''}
                  />
                  {errors.author?.length > 0 && (
                    <p className='text-red-500 text-xs'>{errors.author[0]}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='template-version'>
                    Version <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='template-version'
                    value={metadata.version}
                    onChange={(e) => updateMetadata('version', e.target.value)}
                    placeholder='1.0.0'
                    disabled={readOnly}
                    className={errors.version?.length ? 'border-red-500' : ''}
                  />
                  {errors.version?.length > 0 && (
                    <p className='text-red-500 text-xs'>{errors.version[0]}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='estimated-time'>Estimated Setup Time</Label>
                  <Input
                    id='estimated-time'
                    value={metadata.estimatedTime || ''}
                    onChange={(e) => updateMetadata('estimatedTime', e.target.value)}
                    placeholder='e.g., 5-10 minutes'
                    disabled={readOnly}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Visual Branding</CardTitle>
                <CardDescription>Customize your template's appearance</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='template-icon'>Template Icon</Label>
                    <div className='flex items-center gap-2'>
                      <Input
                        id='template-icon'
                        value={metadata.icon}
                        onChange={(e) => updateMetadata('icon', e.target.value)}
                        placeholder='📄'
                        className='w-20 text-center'
                        disabled={readOnly}
                      />
                      <div className='flex h-10 w-10 items-center justify-center rounded border text-2xl'>
                        {metadata.icon || '📄'}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='template-color'>Template Color</Label>
                    <ColorPicker
                      value={metadata.color}
                      onChange={(color) => updateMetadata('color', color)}
                      disabled={readOnly}
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='template-thumbnail'>Thumbnail Image</Label>
                  <ImageUpload
                    value={metadata.thumbnail}
                    onChange={(url) => updateMetadata('thumbnail', url)}
                    disabled={readOnly}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='template-description'>Description</Label>
                  <Textarea
                    id='template-description'
                    value={metadata.description || ''}
                    onChange={(e) => updateMetadata('description', e.target.value)}
                    placeholder='Describe what this template does and when to use it'
                    className='min-h-[100px]'
                    disabled={readOnly}
                  />
                  <div className='flex justify-between text-muted-foreground text-xs'>
                    <span>A good description helps users understand your template</span>
                    <span>{(metadata.description || '').length}/500</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Classification</CardTitle>
                <CardDescription>Categorize and organize your template</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='template-category'>
                    Category <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={metadata.category}
                    onValueChange={(value) => updateMetadata('category', value)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className={errors.category?.length ? 'border-red-500' : ''}>
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
                  {errors.category?.length > 0 && (
                    <p className='text-red-500 text-xs'>{errors.category[0]}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='template-difficulty'>
                    Difficulty Level <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={metadata.difficulty}
                    onValueChange={(value: TemplateDifficulty) =>
                      updateMetadata('difficulty', value)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger className={errors.difficulty?.length ? 'border-red-500' : ''}>
                      <SelectValue placeholder='Select difficulty' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='beginner'>
                        <div className='flex items-center gap-2'>
                          <div className='h-2 w-2 rounded-full bg-green-500' />
                          Beginner - Easy to set up and use
                        </div>
                      </SelectItem>
                      <SelectItem value='intermediate'>
                        <div className='flex items-center gap-2'>
                          <div className='h-2 w-2 rounded-full bg-blue-500' />
                          Intermediate - Requires some configuration
                        </div>
                      </SelectItem>
                      <SelectItem value='advanced'>
                        <div className='flex items-center gap-2'>
                          <div className='h-2 w-2 rounded-full bg-orange-500' />
                          Advanced - Complex setup and customization
                        </div>
                      </SelectItem>
                      <SelectItem value='expert'>
                        <div className='flex items-center gap-2'>
                          <div className='h-2 w-2 rounded-full bg-red-500' />
                          Expert - Requires deep technical knowledge
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.difficulty?.length > 0 && (
                    <p className='text-red-500 text-xs'>{errors.difficulty[0]}</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label>Tags</Label>
                  <TagInput
                    tags={metadata.tags}
                    popularTags={popularTags}
                    onChange={(tags) => updateMetadata('tags', tags)}
                    readOnly={readOnly}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Requirements & Use Cases</CardTitle>
                <CardDescription>Define prerequisites and common usage scenarios</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='space-y-2'>
                  <Label>Requirements</Label>
                  <p className='text-muted-foreground text-xs'>
                    List any prerequisites, API keys, or setup requirements
                  </p>
                  <DynamicListInput
                    items={metadata.requirements}
                    placeholder='e.g., API key for service X'
                    onChange={(requirements) => updateMetadata('requirements', requirements)}
                    readOnly={readOnly}
                  />
                </div>

                <div className='space-y-2'>
                  <Label>Use Cases</Label>
                  <p className='text-muted-foreground text-xs'>
                    Describe common scenarios where this template is useful
                  </p>
                  <DynamicListInput
                    items={metadata.useCases}
                    placeholder='e.g., Automated customer onboarding'
                    onChange={(useCases) => updateMetadata('useCases', useCases)}
                    readOnly={readOnly}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'publishing' && (
          <div className='grid gap-6 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Visibility & Access</CardTitle>
                <CardDescription>Control who can see and use your template</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='template-visibility'>Template Visibility</Label>
                  <Select
                    value={metadata.visibility}
                    onValueChange={(value: TemplateVisibility) =>
                      updateMetadata('visibility', value)
                    }
                    disabled={readOnly}
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
                          <EyeOff className='h-4 w-4' />
                          <div>
                            <div className='font-medium'>Private</div>
                            <div className='text-muted-foreground text-xs'>Only visible to you</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value='unlisted'>
                        <div className='flex items-center gap-2'>
                          <Eye className='h-4 w-4' />
                          <div>
                            <div className='font-medium'>Unlisted</div>
                            <div className='text-muted-foreground text-xs'>
                              Accessible only via direct link
                            </div>
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
                      checked={metadata.allowComments}
                      onCheckedChange={(checked) =>
                        updateMetadata('allowComments', Boolean(checked))
                      }
                      disabled={readOnly}
                    />
                    <Label htmlFor='allow-comments' className='text-sm'>
                      Allow comments and reviews
                    </Label>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='is-public'
                      checked={metadata.isPublic}
                      onCheckedChange={(checked) => updateMetadata('isPublic', Boolean(checked))}
                      disabled={readOnly}
                    />
                    <Label htmlFor='is-public' className='text-sm'>
                      Include in public search results
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Publishing Status</CardTitle>
                <CardDescription>Current status and publication settings</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        metadata.status === 'published'
                          ? 'bg-green-500'
                          : metadata.status === 'draft'
                            ? 'bg-gray-500'
                            : metadata.status === 'pending_review'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                      )}
                    />
                    <span className='font-medium text-sm capitalize'>
                      {metadata.status.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    {metadata.visibility}
                  </Badge>
                </div>

                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Created:</span>
                    <span>
                      {metadata.createdAt
                        ? new Date(metadata.createdAt).toLocaleDateString()
                        : 'Not set'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Last Updated:</span>
                    <span>
                      {metadata.updatedAt
                        ? new Date(metadata.updatedAt).toLocaleDateString()
                        : 'Not set'}
                    </span>
                  </div>
                  {metadata.publishedAt && (
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Published:</span>
                      <span>{new Date(metadata.publishedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {metadata.status === 'draft' && (
                  <div className='rounded-lg bg-blue-50 p-3'>
                    <p className='text-blue-800 text-sm'>
                      <Info className='mr-2 inline h-4 w-4' />
                      This template is in draft mode. Complete the required fields and publish to
                      make it available.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className='space-y-6'>
            <QualityAssessment validationResults={validationResults} onValidate={onValidate} />

            {/* Additional Quality Metrics */}
            <div className='grid gap-6 md:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base'>Completeness Checklist</CardTitle>
                  <CardDescription>
                    Ensure your template has all recommended information
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {[
                    { field: 'name', label: 'Template name', required: true },
                    { field: 'author', label: 'Author information', required: true },
                    { field: 'description', label: 'Detailed description', required: false },
                    { field: 'category', label: 'Category selection', required: true },
                    { field: 'tags', label: 'Relevant tags', required: false },
                    { field: 'difficulty', label: 'Difficulty level', required: true },
                    { field: 'requirements', label: 'Prerequisites listed', required: false },
                    { field: 'useCases', label: 'Use cases described', required: false },
                  ].map((item) => {
                    const isComplete =
                      item.field === 'tags'
                        ? metadata.tags.length > 0
                        : item.field === 'requirements'
                          ? metadata.requirements.length > 0
                          : item.field === 'useCases'
                            ? metadata.useCases.length > 0
                            : Boolean(
                                (metadata as any)[item.field]?.trim?.() ||
                                  (metadata as any)[item.field]
                              )

                    return (
                      <div key={item.field} className='flex items-center justify-between'>
                        <span className='text-sm'>{item.label}</span>
                        <div className='flex items-center gap-2'>
                          {item.required && (
                            <Badge variant='outline' className='text-xs'>
                              Required
                            </Badge>
                          )}
                          {isComplete ? (
                            <CheckCircle className='h-4 w-4 text-green-600' />
                          ) : (
                            <AlertCircle className='h-4 w-4 text-gray-400' />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='text-base'>Improvement Tips</CardTitle>
                  <CardDescription>Suggestions to enhance your template</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='text-sm'>
                    <h6 className='mb-2 font-medium'>Writing Tips</h6>
                    <ul className='space-y-1 text-muted-foreground'>
                      <li>• Use clear, descriptive names</li>
                      <li>• Write detailed descriptions explaining the purpose</li>
                      <li>• Add relevant tags for better discoverability</li>
                      <li>• List all prerequisites and requirements</li>
                    </ul>
                  </div>

                  <div className='text-sm'>
                    <h6 className='mb-2 font-medium'>Visual Appeal</h6>
                    <ul className='space-y-1 text-muted-foreground'>
                      <li>• Choose appropriate icons and colors</li>
                      <li>• Add thumbnail images when possible</li>
                      <li>• Use consistent naming conventions</li>
                    </ul>
                  </div>

                  <div className='text-sm'>
                    <h6 className='mb-2 font-medium'>User Experience</h6>
                    <ul className='space-y-1 text-muted-foreground'>
                      <li>• Set accurate difficulty levels</li>
                      <li>• Provide realistic time estimates</li>
                      <li>• Include common use case examples</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default TemplateMetadataEditor
