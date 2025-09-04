/**
 * Advanced Search Dialog - Template Marketplace Search Component
 *
 * This component provides comprehensive advanced search functionality for the template
 * marketplace, enabling users to apply sophisticated filters and search criteria
 * to find templates that match their specific requirements.
 *
 * FEATURES:
 * - Advanced filtering with multiple criteria
 * - Real-time search with faceted navigation
 * - Template metadata and attribute filtering
 * - Tag-based search and categorization
 * - Rating and popularity filters
 * - Date range filtering capabilities
 * - User and author-based filtering
 *
 * INTEGRATION:
 * - Template search API integration
 * - Filter state management and persistence
 * - Search analytics and optimization
 * - User preference and search history
 *
 * @author Claude Code Template System
 * @version 1.0.0
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Calendar,
  Filter,
  RotateCcw,
  Search,
  Star,
  Tag,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('AdvancedSearchDialog')

/**
 * Template search filters structure
 */
export interface TemplateSearchFilters {
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[]
  tags?: string[]
  minRating?: number
  hasDescription?: boolean
  createdAfter?: string
  createdBefore?: string
  author?: string
  category?: string
  minDownloads?: number
  maxDownloads?: number
  isVerified?: boolean
  isFeatured?: boolean
  hasPreview?: boolean
}

/**
 * Template category structure
 */
export interface TemplateCategory {
  id: string
  name: string
  description?: string
  templateCount?: number
}

/**
 * Search facets for dynamic filtering
 */
export interface SearchFacets {
  categories: Array<{ name: string; count: number }>
  tags: Array<{ name: string; count: number }>
  authors: Array<{ name: string; count: number }>
  difficulties: Array<{ name: string; count: number }>
}

// Advanced search form validation schema
const advancedSearchSchema = z.object({
  searchText: z.string().optional(),
  difficulty: z.array(z.enum(['beginner', 'intermediate', 'advanced'])).default([]),
  tags: z.string().default(''),
  minRating: z.number().min(0).max(5).default(0),
  hasDescription: z.boolean().default(false),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  minDownloads: z.number().min(0).default(0),
  maxDownloads: z.number().min(0).optional(),
  isVerified: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  hasPreview: z.boolean().default(false),
})

type AdvancedSearchFormData = z.infer<typeof advancedSearchSchema>

interface AdvancedSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: TemplateSearchFilters
  onFiltersChange: (filters: TemplateSearchFilters) => void
  categories?: TemplateCategory[]
  facets?: SearchFacets
  onSearch?: () => void
}

/**
 * Difficulty level options
 */
const DIFFICULTY_OPTIONS = [
  {
    value: 'beginner' as const,
    label: 'Beginner',
    description: 'Easy to understand and implement',
    color: 'bg-green-100 text-green-800',
  },
  {
    value: 'intermediate' as const,
    label: 'Intermediate',
    description: 'Moderate complexity and customization',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'advanced' as const,
    label: 'Advanced',
    description: 'Complex features and integrations',
    color: 'bg-red-100 text-red-800',
  },
] as const

export function AdvancedSearchDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  categories = [],
  facets,
  onSearch,
}: AdvancedSearchDialogProps) {
  // State management
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [ratingRange, setRatingRange] = useState<number[]>([0])

  // Form management with validation
  const form = useForm<AdvancedSearchFormData>({
    resolver: zodResolver(advancedSearchSchema),
    defaultValues: {
      searchText: '',
      difficulty: [],
      tags: '',
      minRating: 0,
      hasDescription: false,
      createdAfter: '',
      createdBefore: '',
      author: '',
      category: '',
      minDownloads: 0,
      maxDownloads: undefined,
      isVerified: false,
      isFeatured: false,
      hasPreview: false,
    },
  })

  /**
   * Initialize form with current filters
   */
  useEffect(() => {
    if (open) {
      // Convert filters to form data
      form.reset({
        difficulty: filters.difficulty || [],
        tags: filters.tags?.join(', ') || '',
        minRating: filters.minRating || 0,
        hasDescription: filters.hasDescription || false,
        createdAfter: filters.createdAfter || '',
        createdBefore: filters.createdBefore || '',
        author: filters.author || '',
        category: filters.category || '',
        minDownloads: filters.minDownloads || 0,
        maxDownloads: filters.maxDownloads,
        isVerified: filters.isVerified || false,
        isFeatured: filters.isFeatured || false,
        hasPreview: filters.hasPreview || false,
      })

      setSelectedDifficulties(filters.difficulty || [])
      setSelectedTags(filters.tags || [])
      setRatingRange([filters.minRating || 0])
    }
  }, [open, filters, form])

  /**
   * Handle difficulty selection toggle
   */
  const toggleDifficulty = useCallback((difficulty: string) => {
    setSelectedDifficulties((prev) => {
      const isSelected = prev.includes(difficulty)
      const newDifficulties = isSelected
        ? prev.filter((d) => d !== difficulty)
        : [...prev, difficulty]

      // Update form
      form.setValue('difficulty', newDifficulties as any)
      return newDifficulties
    })
  }, [form])

  /**
   * Handle tag selection from suggestions
   */
  const addTag = useCallback((tag: string) => {
    if (!selectedTags.includes(tag)) {
      const newTags = [...selectedTags, tag]
      setSelectedTags(newTags)
      form.setValue('tags', newTags.join(', '))
    }
  }, [selectedTags, form])

  /**
   * Remove tag from selection
   */
  const removeTag = useCallback((tagToRemove: string) => {
    const newTags = selectedTags.filter((tag) => tag !== tagToRemove)
    setSelectedTags(newTags)
    form.setValue('tags', newTags.join(', '))
  }, [selectedTags, form])

  /**
   * Handle rating change
   */
  const handleRatingChange = useCallback((value: number[]) => {
    setRatingRange(value)
    form.setValue('minRating', value[0])
  }, [form])

  /**
   * Apply filters and close dialog
   */
  const handleApplyFilters = useCallback((formData: AdvancedSearchFormData) => {
    logger.info('Applying advanced search filters', { formData })

    // Convert form data to filters
    const newFilters: TemplateSearchFilters = {
      difficulty: formData.difficulty.length > 0 ? formData.difficulty : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      minRating: formData.minRating > 0 ? formData.minRating : undefined,
      hasDescription: formData.hasDescription || undefined,
      createdAfter: formData.createdAfter || undefined,
      createdBefore: formData.createdBefore || undefined,
      author: formData.author || undefined,
      category: formData.category || undefined,
      minDownloads: formData.minDownloads > 0 ? formData.minDownloads : undefined,
      maxDownloads: formData.maxDownloads || undefined,
      isVerified: formData.isVerified || undefined,
      isFeatured: formData.isFeatured || undefined,
      hasPreview: formData.hasPreview || undefined,
    }

    // Remove undefined values
    Object.keys(newFilters).forEach((key) => {
      if ((newFilters as any)[key] === undefined) {
        delete (newFilters as any)[key]
      }
    })

    onFiltersChange(newFilters)
    onSearch?.()
    onOpenChange(false)
  }, [selectedTags, onFiltersChange, onSearch, onOpenChange])

  /**
   * Reset all filters
   */
  const handleResetFilters = useCallback(() => {
    form.reset()
    setSelectedDifficulties([])
    setSelectedTags([])
    setRatingRange([0])
    onFiltersChange({})
  }, [form, onFiltersChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
          <DialogDescription>
            Use advanced filters to find templates that match your specific requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleApplyFilters)}
              className="space-y-6 p-1"
              id="advanced-search-form"
            >
              {/* Search Text */}
              <FormField
                control={form.control}
                name="searchText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search Text
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter keywords, template names, or descriptions..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Search in template names, descriptions, and content.
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Selection */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                              {category.templateCount && (
                                <span className="text-muted-foreground ml-2">
                                  ({category.templateCount})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Author Filter */}
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Author
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Filter by author name..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Difficulty Level */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Difficulty Level</Label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleDifficulty(option.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg border transition-colors text-sm',
                        selectedDifficulties.includes(option.value)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-accent'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Minimum Rating: {ratingRange[0]}/5
                </Label>
                <div className="px-3">
                  <Slider
                    min={0}
                    max={5}
                    step={0.5}
                    value={ratingRange}
                    onValueChange={handleRatingChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Enter tags separated by commas..."
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            const tags = e.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                            setSelectedTags(tags)
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Popular Tags from Facets */}
                {facets?.tags && facets.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Popular tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {facets.tags.slice(0, 10).map((tag) => (
                        <Button
                          key={tag.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => addTag(tag.name)}
                          disabled={selectedTags.includes(tag.name)}
                        >
                          {tag.name} ({tag.count})
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="createdAfter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Created After
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="createdBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Created Before
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Download Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minDownloads"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Minimum Downloads
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxDownloads"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Downloads</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => 
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Boolean Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="hasDescription"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Has Description</FormLabel>
                          <FormDescription>
                            Only show templates with detailed descriptions
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasPreview"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Has Preview</FormLabel>
                          <FormDescription>
                            Only show templates with preview images or demos
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isVerified"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Verified Templates</FormLabel>
                          <FormDescription>
                            Only show templates from verified authors
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Featured Templates</FormLabel>
                          <FormDescription>
                            Only show featured and highlighted templates
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="advanced-search-form"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}