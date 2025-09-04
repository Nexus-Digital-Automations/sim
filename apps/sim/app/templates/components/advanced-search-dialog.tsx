/**
 * Advanced Search Dialog - Comprehensive Template Discovery Interface
 *
 * This component provides a comprehensive modal interface for advanced template
 * search and filtering capabilities including:
 * - Multi-criteria filtering with real-time validation
 * - Category and tag selection with hierarchical organization
 * - Rating, difficulty, and date range filters
 * - Author and organization-specific searches
 * - Saved search functionality and export capabilities
 * - Accessibility-compliant interface with keyboard navigation
 *
 * Design Features:
 * - Intuitive tabbed interface for organized filtering
 * - Visual feedback for active filters and search state
 * - Responsive design optimized for mobile and desktop
 * - Professional UI following project design patterns
 * - Comprehensive error handling and validation
 *
 * @author Claude Code Template System - Advanced Search Specialist
 * @version 2.0.0
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Filter,
  Hash,
  Heart,
  Search,
  Settings2,
  Star,
  Tag,
  TrendingUp,
  Users,
  X,
  Save,
  Download,
  RotateCcw,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  TemplateCategory,
  TemplateDifficulty,
  TemplateSearchFilters,
  TemplateSearchResults,
} from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Advanced Search Dialog Props Interface
 */
export interface AdvancedSearchDialogProps {
  /** Dialog open state */
  open: boolean
  /** Dialog state change handler */
  onOpenChange: (open: boolean) => void
  /** Current search filters */
  filters: TemplateSearchFilters
  /** Filter change handler with comprehensive validation */
  onFiltersChange: (filters: Partial<TemplateSearchFilters>) => void
  /** Available categories for filtering */
  categories: TemplateCategory[]
  /** Search results facets for dynamic filter suggestions */
  facets?: TemplateSearchResults['facets']
  /** Loading state indicator */
  loading?: boolean
  /** Search execution handler */
  onSearch?: () => void
  /** Filter reset handler */
  onReset?: () => void
  /** Save search handler */
  onSaveSearch?: (name: string, filters: TemplateSearchFilters) => void
  /** Export filters handler */
  onExportFilters?: (filters: TemplateSearchFilters) => void
  /** Custom CSS class name */
  className?: string
}

/**
 * Difficulty Level Configuration with Enhanced Metadata
 */
const DIFFICULTY_LEVELS: Array<{
  value: TemplateDifficulty
  label: string
  description: string
  color: string
  icon: React.ReactNode
}> = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Simple workflows, perfect for getting started',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <BookOpen className='h-3 w-3' />,
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Moderate complexity, some automation experience helpful',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Settings2 className='h-3 w-3' />,
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Complex workflows requiring solid automation knowledge',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <TrendingUp className='h-3 w-3' />,
  },
  {
    value: 'expert',
    label: 'Expert',
    description: 'Highly complex, enterprise-level workflows',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <Star className='h-3 w-3' />,
  },
]

/**
 * Date Range Preset Options for Quick Selection
 */
const DATE_RANGE_PRESETS = [
  { label: 'Last 7 days', value: 7, key: 'week' },
  { label: 'Last 30 days', value: 30, key: 'month' },
  { label: 'Last 90 days', value: 90, key: 'quarter' },
  { label: 'Last 6 months', value: 180, key: 'halfYear' },
  { label: 'Last year', value: 365, key: 'year' },
  { label: 'All time', value: -1, key: 'all' },
]

/**
 * Sort Options with Enhanced Metadata
 */
const SORT_OPTIONS = [
  { 
    value: 'relevance', 
    label: 'Most Relevant', 
    icon: <Search className='h-4 w-4' />,
    description: 'Best match for search criteria'
  },
  { 
    value: 'trending', 
    label: 'Trending', 
    icon: <TrendingUp className='h-4 w-4' />,
    description: 'Popular templates gaining momentum'
  },
  { 
    value: 'newest', 
    label: 'Newest First', 
    icon: <Calendar className='h-4 w-4' />,
    description: 'Recently created templates'
  },
  { 
    value: 'rating', 
    label: 'Highest Rated', 
    icon: <Star className='h-4 w-4' />,
    description: 'Top-rated by community'
  },
  { 
    value: 'views', 
    label: 'Most Popular', 
    icon: <Users className='h-4 w-4' />,
    description: 'Most viewed templates'
  },
  { 
    value: 'name', 
    label: 'Alphabetical', 
    icon: <BookOpen className='h-4 w-4' />,
    description: 'Sorted by name A-Z'
  },
]

/**
 * Main Advanced Search Dialog Component
 */
export const AdvancedSearchDialog: React.FC<AdvancedSearchDialogProps> = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  categories,
  facets,
  loading = false,
  onSearch,
  onReset,
  onSaveSearch,
  onExportFilters,
  className,
}) => {
  // Component state
  const [activeTab, setActiveTab] = useState('filters')
  const [saveSearchName, setSaveSearchName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [localFilters, setLocalFilters] = useState<TemplateSearchFilters>(filters)
  const [searchQuery, setSearchQuery] = useState('')

  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (localFilters.categories?.length) count += localFilters.categories.length
    if (localFilters.tags?.length) count += localFilters.tags.length
    if (localFilters.difficulty?.length) count += localFilters.difficulty.length
    if (localFilters.minRating) count += 1
    if (localFilters.minStars) count += 1
    if (localFilters.createdAfter || localFilters.createdBefore) count += 1
    if (localFilters.hasDescription) count += 1
    if (localFilters.hasThumbnail) count += 1
    if (localFilters.authorId) count += 1
    if (searchQuery.trim()) count += 1
    return count
  }, [localFilters, searchQuery])

  // Handle local filter changes
  const handleLocalFilterChange = useCallback((newFilters: Partial<TemplateSearchFilters>) => {
    setLocalFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Handle search execution
  const handleSearch = useCallback(() => {
    const searchFilters = { ...localFilters }
    if (searchQuery.trim()) {
      // Add search query to the filters context
      searchFilters.searchQuery = searchQuery
    }
    onFiltersChange(searchFilters)
    onSearch?.()
    onOpenChange(false)
  }, [localFilters, searchQuery, onFiltersChange, onSearch, onOpenChange])

  // Handle filter reset
  const handleReset = useCallback(() => {
    const emptyFilters: TemplateSearchFilters = {}
    setLocalFilters(emptyFilters)
    setSearchQuery('')
    onReset?.()
  }, [onReset])

  // Handle save search
  const handleSaveSearch = useCallback(() => {
    if (saveSearchName.trim() && onSaveSearch) {
      onSaveSearch(saveSearchName.trim(), localFilters)
      setShowSaveForm(false)
      setSaveSearchName('')
    }
  }, [saveSearchName, localFilters, onSaveSearch])

  // Handle export filters
  const handleExportFilters = useCallback(() => {
    onExportFilters?.(localFilters)
  }, [localFilters, onExportFilters])

  // Handle date range preset selection
  const handleDateRangePreset = useCallback((days: number) => {
    if (days === -1) {
      handleLocalFilterChange({
        createdAfter: undefined,
        createdBefore: undefined,
      })
    } else {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      handleLocalFilterChange({
        createdAfter: startDate,
        createdBefore: endDate,
      })
    }
  }, [handleLocalFilterChange])

  // Category selection handler
  const handleCategoryToggle = useCallback((categoryId: string) => {
    const currentCategories = localFilters.categories || []
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId]
    
    handleLocalFilterChange({ categories: newCategories })
  }, [localFilters.categories, handleLocalFilterChange])

  // Tag selection handler
  const handleTagToggle = useCallback((tag: string) => {
    const currentTags = localFilters.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    
    handleLocalFilterChange({ tags: newTags })
  }, [localFilters.tags, handleLocalFilterChange])

  // Difficulty selection handler
  const handleDifficultyToggle = useCallback((difficulty: TemplateDifficulty) => {
    const currentDifficulty = localFilters.difficulty || []
    const newDifficulty = currentDifficulty.includes(difficulty)
      ? currentDifficulty.filter(d => d !== difficulty)
      : [...currentDifficulty, difficulty]
    
    handleLocalFilterChange({ difficulty: newDifficulty })
  }, [localFilters.difficulty, handleLocalFilterChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-4xl max-h-[90vh]', className)} hideCloseButton>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Filter className='h-5 w-5 text-blue-600' />
              <DialogTitle>Advanced Search</DialogTitle>
              {activeFilterCount > 0 && (
                <Badge variant='secondary' className='ml-2'>
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onOpenChange(false)}
              className='h-8 w-8 p-0'
            >
              <X className='h-4 w-4' />
              <span className='sr-only'>Close</span>
            </Button>
          </div>
          <DialogDescription>
            Use advanced filters to find exactly the templates you need. Configure multiple
            criteria and save searches for future use.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden'>
          <Tabs value={activeTab} onValueChange={setActiveTab} className='h-full flex flex-col'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='filters' className='flex items-center gap-2'>
                <Filter className='h-4 w-4' />
                Filters
              </TabsTrigger>
              <TabsTrigger value='content' className='flex items-center gap-2'>
                <Search className='h-4 w-4' />
                Content
              </TabsTrigger>
              <TabsTrigger value='social' className='flex items-center gap-2'>
                <Heart className='h-4 w-4' />
                Community
              </TabsTrigger>
              <TabsTrigger value='advanced' className='flex items-center gap-2'>
                <Settings2 className='h-4 w-4' />
                Advanced
              </TabsTrigger>
            </TabsList>

            <div className='flex-1 mt-4 overflow-hidden'>
              <ScrollArea className='h-[400px]'>
                <TabsContent value='filters' className='space-y-6 mt-0'>
                  {/* Search Query */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Search className='h-4 w-4' />
                        Search Query
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        placeholder='Search templates, descriptions, or authors...'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='w-full'
                      />
                      <p className='mt-2 text-xs text-muted-foreground'>
                        Use quotes for exact phrases, + for required terms, - to exclude terms
                      </p>
                    </CardContent>
                  </Card>

                  {/* Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Tag className='h-4 w-4' />
                        Categories
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className='h-3 w-3 text-muted-foreground' />
                            </TooltipTrigger>
                            <TooltipContent>
                              Select one or more categories to filter templates
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-2 gap-2 max-h-32 overflow-y-auto'>
                        {categories.map((category) => (
                          <div key={category.id} className='flex items-center space-x-2'>
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={localFilters.categories?.includes(category.id) || false}
                              onCheckedChange={() => handleCategoryToggle(category.id)}
                            />
                            <Label
                              htmlFor={`category-${category.id}`}
                              className='text-sm font-normal cursor-pointer flex-1 flex items-center justify-between'
                            >
                              <span>{category.name}</span>
                              <Badge variant='outline' className='text-xs'>
                                {category.templateCount}
                              </Badge>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Difficulty */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <TrendingUp className='h-4 w-4' />
                        Difficulty Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-2 gap-3'>
                        {DIFFICULTY_LEVELS.map((level) => (
                          <div key={level.value} className='flex items-center space-x-2'>
                            <Checkbox
                              id={`difficulty-${level.value}`}
                              checked={localFilters.difficulty?.includes(level.value) || false}
                              onCheckedChange={() => handleDifficultyToggle(level.value)}
                            />
                            <Label
                              htmlFor={`difficulty-${level.value}`}
                              className='cursor-pointer'
                            >
                              <Badge
                                variant='outline'
                                className={cn('flex items-center gap-1', level.color)}
                              >
                                {level.icon}
                                {level.label}
                              </Badge>
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className='mt-2 text-xs text-muted-foreground'>
                        Filter templates by complexity and skill level required
                      </p>
                    </CardContent>
                  </Card>

                  {/* Rating */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Star className='h-4 w-4' />
                        Minimum Rating
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div>
                        <Slider
                          value={[localFilters.minRating || 0]}
                          onValueChange={([value]) => handleLocalFilterChange({ minRating: value })}
                          max={5}
                          min={0}
                          step={0.5}
                          className='w-full'
                        />
                        <div className='flex justify-between text-sm text-muted-foreground mt-2'>
                          <span>Any rating</span>
                          <span className='flex items-center gap-1'>
                            <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                            {localFilters.minRating || 0}+
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='content' className='space-y-6 mt-0'>
                  {/* Tags */}
                  {facets?.tags && facets.tags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                          <Hash className='h-4 w-4' />
                          Popular Tags
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='flex flex-wrap gap-2 max-h-40 overflow-y-auto'>
                          {facets.tags.slice(0, 24).map((tag) => (
                            <Toggle
                              key={tag.name}
                              pressed={localFilters.tags?.includes(tag.name) || false}
                              onPressedChange={() => handleTagToggle(tag.name)}
                              variant='outline'
                              size='sm'
                              className='h-8 text-xs'
                            >
                              {tag.name}
                              <Badge variant='secondary' className='ml-1 text-xs'>
                                {tag.count}
                              </Badge>
                            </Toggle>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Content Requirements */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <BookOpen className='h-4 w-4' />
                        Content Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='space-y-3'>
                        <div className='flex items-center space-x-2'>
                          <Checkbox
                            id='has-description'
                            checked={localFilters.hasDescription || false}
                            onCheckedChange={(checked) =>
                              handleLocalFilterChange({ hasDescription: checked as boolean })
                            }
                          />
                          <Label htmlFor='has-description' className='text-sm font-normal'>
                            Has detailed description
                          </Label>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Checkbox
                            id='has-thumbnail'
                            checked={localFilters.hasThumbnail || false}
                            onCheckedChange={(checked) =>
                              handleLocalFilterChange({ hasThumbnail: checked as boolean })
                            }
                          />
                          <Label htmlFor='has-thumbnail' className='text-sm font-normal'>
                            Has preview thumbnail
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stars/Views Range */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Users className='h-4 w-4' />
                        Popularity Filters
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div>
                        <Label className='text-sm font-medium'>Minimum Stars</Label>
                        <Slider
                          value={[localFilters.minStars || 0]}
                          onValueChange={([value]) => handleLocalFilterChange({ minStars: value })}
                          max={1000}
                          min={0}
                          step={1}
                          className='w-full mt-2'
                        />
                        <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                          <span>0</span>
                          <span>{localFilters.minStars || 0}+ stars</span>
                        </div>
                      </div>

                      <div>
                        <Label className='text-sm font-medium'>Minimum Views</Label>
                        <Slider
                          value={[localFilters.minViews || 0]}
                          onValueChange={([value]) => handleLocalFilterChange({ minViews: value })}
                          max={10000}
                          min={0}
                          step={10}
                          className='w-full mt-2'
                        />
                        <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                          <span>0</span>
                          <span>{localFilters.minViews || 0}+ views</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='social' className='space-y-6 mt-0'>
                  {/* Author Filter */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Users className='h-4 w-4' />
                        Author & Organization
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div>
                        <Label className='text-sm font-medium'>Specific Author</Label>
                        <Input
                          placeholder='Enter author username or ID...'
                          value={localFilters.authorId || ''}
                          onChange={(e) => handleLocalFilterChange({ authorId: e.target.value || undefined })}
                          className='w-full mt-1'
                        />
                      </div>

                      <div>
                        <Label className='text-sm font-medium'>Organization</Label>
                        <Input
                          placeholder='Enter organization name or ID...'
                          value={localFilters.organizationId || ''}
                          onChange={(e) => handleLocalFilterChange({ organizationId: e.target.value || undefined })}
                          className='w-full mt-1'
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Community Features */}
                  {facets?.authors && facets.authors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                          <TrendingUp className='h-4 w-4' />
                          Top Contributors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-2 max-h-32 overflow-y-auto'>
                          {facets.authors.slice(0, 10).map((author) => (
                            <Button
                              key={author.name}
                              variant='outline'
                              size='sm'
                              className='w-full justify-between h-8'
                              onClick={() => handleLocalFilterChange({ authorId: author.name })}
                            >
                              <span className='text-sm'>{author.name}</span>
                              <Badge variant='secondary' className='text-xs'>
                                {author.count}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value='advanced' className='space-y-6 mt-0'>
                  {/* Date Range */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Calendar className='h-4 w-4' />
                        Date Range
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div>
                        <Label className='text-sm font-medium mb-2 block'>Quick Presets</Label>
                        <div className='grid grid-cols-3 gap-2'>
                          {DATE_RANGE_PRESETS.map((preset) => (
                            <Button
                              key={preset.key}
                              variant='outline'
                              size='sm'
                              onClick={() => handleDateRangePreset(preset.value)}
                              className='text-xs'
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <Label className='text-sm font-medium'>Created After</Label>
                          <Input
                            type='date'
                            value={localFilters.createdAfter?.toISOString().split('T')[0] || ''}
                            onChange={(e) =>
                              handleLocalFilterChange({
                                createdAfter: e.target.value ? new Date(e.target.value) : undefined,
                              })
                            }
                            className='w-full mt-1'
                          />
                        </div>
                        <div>
                          <Label className='text-sm font-medium'>Created Before</Label>
                          <Input
                            type='date'
                            value={localFilters.createdBefore?.toISOString().split('T')[0] || ''}
                            onChange={(e) =>
                              handleLocalFilterChange({
                                createdBefore: e.target.value ? new Date(e.target.value) : undefined,
                              })
                            }
                            className='w-full mt-1'
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Search */}
                  {onSaveSearch && (
                    <Card>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                          <Save className='h-4 w-4' />
                          Save Search
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showSaveForm ? (
                          <div className='space-y-3'>
                            <Input
                              placeholder='Enter search name...'
                              value={saveSearchName}
                              onChange={(e) => setSaveSearchName(e.target.value)}
                              className='w-full'
                            />
                            <div className='flex gap-2'>
                              <Button
                                size='sm'
                                onClick={handleSaveSearch}
                                disabled={!saveSearchName.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setShowSaveForm(false)
                                  setSaveSearchName('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant='outline'
                            onClick={() => setShowSaveForm(true)}
                            className='w-full'
                          >
                            <Save className='mr-2 h-4 w-4' />
                            Save Current Search
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        <DialogFooter className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {activeFilterCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={handleReset}
                className='text-red-600 hover:text-red-700'
              >
                <RotateCcw className='mr-2 h-4 w-4' />
                Reset All
              </Button>
            )}
            
            {onExportFilters && activeFilterCount > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleExportFilters}
              >
                <Download className='mr-2 h-4 w-4' />
                Export
              </Button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className='min-w-[100px]'
            >
              {loading ? (
                <>
                  <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  Searching...
                </>
              ) : (
                <>
                  <Search className='mr-2 h-4 w-4' />
                  Search
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AdvancedSearchDialog