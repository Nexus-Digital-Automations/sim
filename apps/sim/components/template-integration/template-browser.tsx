/**
 * Template Browser Component for Workflow Editor
 * 
 * Provides seamless template browsing and integration within the workflow editor.
 * Features context-aware suggestions, real-time search, and one-click instantiation.
 * 
 * Based on research from: research-create-comprehensive-template-library-system-with-business-automation-categories-1757006080425.md
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Book,
  ChevronDown,
  ChevronRight,
  Eye,
  Filter,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  Star,
  Tag,
  Wand2,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'
import type { Template, TemplateSearchQuery } from '@/lib/templates/types'
import { TEMPLATE_CATEGORIES } from '@/lib/templates/categories'

const logger = createLogger('TemplateBrowser')

interface TemplateBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId?: string
  /** Current workflow context for intelligent suggestions */
  workflowContext?: {
    blockTypes: string[]
    categories: string[]
    integrations: string[]
    complexity: 'simple' | 'moderate' | 'complex'
  }
  /** Callback when template is selected for instantiation */
  onTemplateSelect: (template: Template, action: 'instant' | 'preview' | 'customize') => void
  /** Callback for context-aware suggestions */
  onSuggestionsRequest?: () => void
}

interface TemplateCategory {
  id: string
  name: string
  description: string
  icon: any
  count?: number
  expanded?: boolean
}

/**
 * Template Browser with intelligent workflow integration
 */
export function TemplateBrowser({
  open,
  onOpenChange,
  workflowId,
  workflowContext,
  onTemplateSelect,
  onSuggestionsRequest,
}: TemplateBrowserProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [suggestions, setSuggestions] = useState<Template[]>([])
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['suggested']))
  const [sortBy, setSortBy] = useState<'relevance' | 'popularity' | 'recent'>('relevance')
  const [showFilters, setShowFilters] = useState(false)

  // Memoized search query for API calls
  const searchQueryData = useMemo<TemplateSearchQuery>(
    () => ({
      search: searchQuery || undefined,
      category: selectedCategory || undefined,
      filters: {
        difficulty: [],
        tags: [],
        minRating: undefined,
        hasDescription: true,
      },
      sortBy: sortBy === 'relevance' ? 'relevance' : sortBy === 'popularity' ? 'views' : 'createdAt',
      sortOrder: sortBy === 'recent' ? 'desc' : 'desc',
      page: 1,
      limit: 20,
      includeMetadata: true,
      includeUserData: true,
      includeAnalytics: true,
    }),
    [searchQuery, selectedCategory, sortBy]
  )

  // Load templates and suggestions when modal opens
  useEffect(() => {
    if (open) {
      loadTemplates()
      loadSuggestions()
      loadCategories()
    }
  }, [open, searchQueryData])

  // Load templates from API
  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (searchQueryData.search) queryParams.set('search', searchQueryData.search)
      if (searchQueryData.category) queryParams.set('category', searchQueryData.category)
      if (searchQueryData.sortBy) queryParams.set('sortBy', searchQueryData.sortBy)
      if (searchQueryData.sortOrder) queryParams.set('sortOrder', searchQueryData.sortOrder)
      queryParams.set('limit', searchQueryData.limit?.toString() || '20')
      queryParams.set('page', searchQueryData.page?.toString() || '1')

      const response = await fetch(`/api/templates?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch templates')

      const data = await response.json()
      setTemplates(data.data || [])
    } catch (error) {
      logger.error('Failed to load templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [searchQueryData])

  // Load context-aware suggestions
  const loadSuggestions = useCallback(async () => {
    if (!workflowContext || !workflowId) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch('/api/workflow-wizard/templates/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          context: workflowContext,
          limit: 6,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      logger.error('Failed to load suggestions:', error)
      setSuggestions([])
    }
  }, [workflowContext, workflowId])

  // Load template categories with counts
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/templates/v2/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || Object.values(TEMPLATE_CATEGORIES))
      }
    } catch (error) {
      logger.error('Failed to load categories:', error)
      setCategories(Object.values(TEMPLATE_CATEGORIES))
    }
  }, [])

  // Handle category toggle
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }, [])

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId)
    if (categoryId) {
      setExpandedCategories((prev) => new Set(prev).add(categoryId))
    }
  }, [])

  // Handle template action
  const handleTemplateAction = useCallback(
    (template: Template, action: 'instant' | 'preview' | 'customize') => {
      onTemplateSelect(template, action)
      if (action === 'instant') {
        onOpenChange(false)
      }
    },
    [onTemplateSelect, onOpenChange]
  )

  // Render template card
  const renderTemplateCard = useCallback(
    (template: Template, issuggestion = false) => (
      <Card
        key={template.id}
        className={cn(
          'group cursor-pointer transition-all duration-200 hover:shadow-md',
          issuggestion && 'border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20'
        )}
        onClick={() => handleTemplateAction(template, 'preview')}
      >
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-start gap-3'>
              <div
                className='flex h-10 w-10 items-center justify-center rounded-lg text-white'
                style={{ backgroundColor: template.color || '#3B82F6' }}
              >
                {template.icon ? (
                  <template.icon className='h-5 w-5' />
                ) : (
                  <Book className='h-5 w-5' />
                )}
              </div>
              <div className='min-w-0 flex-1'>
                <CardTitle className='line-clamp-2 text-sm'>{template.name}</CardTitle>
                <CardDescription className='line-clamp-2 text-xs'>
                  {template.description}
                </CardDescription>
              </div>
            </div>
            {issuggestion && (
              <Tooltip>
                <TooltipTrigger>
                  <Lightbulb className='h-4 w-4 text-amber-500' />
                </TooltipTrigger>
                <TooltipContent>Suggested for your workflow</TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        <CardContent className='pt-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4 text-xs text-muted-foreground'>
              {template.stars > 0 && (
                <div className='flex items-center gap-1'>
                  <Star className='h-3 w-3 fill-current text-yellow-400' />
                  <span>{template.stars}</span>
                </div>
              )}
              {template.views > 0 && (
                <div className='flex items-center gap-1'>
                  <Eye className='h-3 w-3' />
                  <span>{template.views}</span>
                </div>
              )}
            </div>

            <div className='flex items-center gap-1'>
              <Button
                size='sm'
                variant='ghost'
                className='h-7 px-2'
                onClick={(e) => {
                  e.stopPropagation()
                  handleTemplateAction(template, 'customize')
                }}
              >
                <Wand2 className='h-3 w-3' />
              </Button>
              <Button
                size='sm'
                className='h-7 px-3'
                onClick={(e) => {
                  e.stopPropagation()
                  handleTemplateAction(template, 'instant')
                }}
              >
                <Plus className='h-3 w-3 mr-1' />
                Add
              </Button>
            </div>
          </div>

          {template.tags && template.tags.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-1'>
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant='secondary' className='text-xs'>
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant='secondary' className='text-xs'>
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    ),
    [handleTemplateAction]
  )

  // Render category section
  const renderCategorySection = useCallback(
    (category: TemplateCategory, templates: Template[]) => {
      const isExpanded = expandedCategories.has(category.id)
      
      return (
        <div key={category.id} className='space-y-3'>
          <div
            className='flex cursor-pointer items-center justify-between py-2'
            onClick={() => toggleCategory(category.id)}
          >
            <div className='flex items-center gap-2'>
              {isExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
              <h3 className='font-medium text-sm'>{category.name}</h3>
              {category.count !== undefined && (
                <Badge variant='secondary' className='text-xs'>
                  {category.count}
                </Badge>
              )}
            </div>
            <Button
              size='sm'
              variant='ghost'
              className='h-7 w-7 p-0'
              onClick={(e) => {
                e.stopPropagation()
                handleCategorySelect(selectedCategory === category.id ? null : category.id)
              }}
            >
              <Filter className='h-3 w-3' />
            </Button>
          </div>

          {isExpanded && (
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
              {templates.slice(0, 6).map((template) => renderTemplateCard(template))}
            </div>
          )}
        </div>
      )
    },
    [expandedCategories, toggleCategory, selectedCategory, handleCategorySelect, renderTemplateCard]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] max-w-6xl flex-col gap-0 overflow-hidden p-0'>
        {/* Header */}
        <DialogHeader className='flex-shrink-0 border-b px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle className='flex items-center gap-2'>
                <Book className='h-5 w-5' />
                Template Library
              </DialogTitle>
              <DialogDescription>
                Browse and add workflow templates to enhance your automation
              </DialogDescription>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 p-0'
              onClick={() => onOpenChange(false)}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Search and filters */}
          <div className='mt-4 flex gap-3'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search templates, categories, or features...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className='w-40'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='relevance'>Most Relevant</SelectItem>
                <SelectItem value='popularity'>Most Popular</SelectItem>
                <SelectItem value='recent'>Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Sidebar - Categories */}
          <div className='w-64 shrink-0 border-r bg-muted/30 p-4'>
            <div className='space-y-2'>
              <Button
                size='sm'
                variant={selectedCategory === null ? 'default' : 'ghost'}
                className='h-8 w-full justify-start'
                onClick={() => handleCategorySelect(null)}
              >
                All Templates
              </Button>
              
              {categories.map((category) => (
                <Button
                  key={category.id}
                  size='sm'
                  variant={selectedCategory === category.id ? 'default' : 'ghost'}
                  className='h-8 w-full justify-start'
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <div className='flex items-center justify-between w-full'>
                    <span className='truncate'>{category.name}</span>
                    {category.count !== undefined && (
                      <Badge variant='secondary' className='text-xs'>
                        {category.count}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Main content area */}
          <div className='flex-1 overflow-y-auto p-6'>
            {loading ? (
              <div className='space-y-6'>
                {/* Loading state */}
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <div className='flex items-start gap-3'>
                          <Skeleton className='h-10 w-10 rounded-lg' />
                          <div className='space-y-2'>
                            <Skeleton className='h-4 w-32' />
                            <Skeleton className='h-3 w-48' />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className='flex items-center justify-between'>
                          <div className='flex gap-2'>
                            <Skeleton className='h-3 w-12' />
                            <Skeleton className='h-3 w-12' />
                          </div>
                          <Skeleton className='h-7 w-16' />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className='space-y-6'>
                {/* Context-aware suggestions */}
                {suggestions.length > 0 && !selectedCategory && !searchQuery && (
                  <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <Lightbulb className='h-5 w-5 text-amber-500' />
                      <h3 className='font-medium'>Suggested for Your Workflow</h3>
                    </div>
                    <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
                      {suggestions.map((template) => renderTemplateCard(template, true))}
                    </div>
                  </div>
                )}

                {/* Template results */}
                {templates.length > 0 ? (
                  <div className='space-y-3'>
                    {!selectedCategory && !searchQuery && suggestions.length > 0 && (
                      <div className='flex items-center gap-2'>
                        <Tag className='h-5 w-5' />
                        <h3 className='font-medium'>All Templates</h3>
                      </div>
                    )}
                    <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
                      {templates.map((template) => renderTemplateCard(template))}
                    </div>
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <Search className='h-12 w-12 text-muted-foreground mb-4' />
                    <h3 className='font-medium text-lg mb-2'>No templates found</h3>
                    <p className='text-muted-foreground mb-4'>
                      Try adjusting your search terms or browse different categories
                    </p>
                    <Button variant='outline' onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}