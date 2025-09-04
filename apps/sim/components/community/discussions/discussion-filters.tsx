/**
 * Discussion Filters - Advanced Filtering Component
 *
 * Provides comprehensive filtering options for Q&A discussions:
 * - Category-based filtering with hierarchical organization
 * - Status filters (open, answered, featured, trending)
 * - Time-based filtering (recent, this week, this month)
 * - Sorting options (newest, most voted, most viewed, trending)
 * - Tag-based filtering with autocomplete suggestions
 *
 * Integrates with URL state management for shareable filtered views.
 * Supports real-time filter updates without page refresh.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

'use client'

import { useEffect, useState } from 'react'
import {
  ArrowUp,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  MessageSquare,
  Star,
  Tag,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DiscussionFiltersProps {
  selectedCategory?: string
  selectedSort?: string
  selectedStatus?: string
}

interface Category {
  id: string
  name: string
  description: string
  color: string
  icon: string
  count: number
  subcategories?: Category[]
}

interface FilterState {
  categories: string[]
  status: string[]
  timeRange: string
  sortBy: string
  tags: string[]
  hasAnswers: boolean | null
  isExpertAnswered: boolean | null
  minVotes: number
}

/**
 * Discussion Filters Component
 *
 * Advanced filtering system providing:
 * - Multi-select category filters with counts
 * - Status-based filters (answered, trending, featured)
 * - Time range selection for recent activity
 * - Sorting options with visual indicators
 * - Tag-based filtering with suggestions
 * - Expert and answer quality filters
 */
export function DiscussionFilters({
  selectedCategory,
  selectedSort,
  selectedStatus,
}: DiscussionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [popularTags, setPopularTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    categories: selectedCategory ? [selectedCategory] : [],
    status: selectedStatus ? [selectedStatus] : [],
    timeRange: 'all',
    sortBy: selectedSort || 'latest',
    tags: [],
    hasAnswers: null,
    isExpertAnswered: null,
    minVotes: 0,
  })

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        setIsLoading(true)

        // TODO: Replace with actual API calls
        // const [categoriesRes, tagsRes] = await Promise.all([
        //   fetch('/api/community/categories'),
        //   fetch('/api/community/tags/popular')
        // ])

        // Mock data for development
        setCategories([
          {
            id: 'integrations',
            name: 'Integrations',
            description: 'API connections and third-party services',
            color: '#3B82F6',
            icon: 'Zap',
            count: 234,
          },
          {
            id: 'data-processing',
            name: 'Data Processing',
            description: 'CSV, JSON, and data transformation',
            color: '#10B981',
            icon: 'Database',
            count: 186,
          },
          {
            id: 'automation',
            name: 'Automation',
            description: 'Workflow design and best practices',
            color: '#8B5CF6',
            icon: 'Cpu',
            count: 312,
          },
          {
            id: 'troubleshooting',
            name: 'Troubleshooting',
            description: 'Error handling and debugging',
            color: '#F59E0B',
            icon: 'AlertCircle',
            count: 145,
          },
          {
            id: 'api-development',
            name: 'API Development',
            description: 'REST, GraphQL, and webhook development',
            color: '#EF4444',
            icon: 'Code',
            count: 89,
          },
          {
            id: 'best-practices',
            name: 'Best Practices',
            description: 'Tips, guides, and optimization',
            color: '#F97316',
            icon: 'Star',
            count: 67,
          },
        ])

        setPopularTags([
          'api',
          'webhook',
          'csv',
          'json',
          'slack',
          'gmail',
          'automation',
          'javascript',
          'python',
          'error-handling',
          'performance',
          'security',
        ])

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch filter data:', error)
        setIsLoading(false)
      }
    }

    fetchFilterData()
  }, [])

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)

    // Update URL parameters
    const params = new URLSearchParams(searchParams)

    if (updatedFilters.categories.length > 0) {
      params.set('category', updatedFilters.categories.join(','))
    } else {
      params.delete('category')
    }

    if (updatedFilters.status.length > 0) {
      params.set('status', updatedFilters.status.join(','))
    } else {
      params.delete('status')
    }

    if (updatedFilters.sortBy !== 'latest') {
      params.set('sort', updatedFilters.sortBy)
    } else {
      params.delete('sort')
    }

    if (updatedFilters.timeRange !== 'all') {
      params.set('time', updatedFilters.timeRange)
    } else {
      params.delete('time')
    }

    if (updatedFilters.tags.length > 0) {
      params.set('tags', updatedFilters.tags.join(','))
    } else {
      params.delete('tags')
    }

    router.push(`/community/discussions?${params.toString()}`)
  }

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      status: [],
      timeRange: 'all',
      sortBy: 'latest',
      tags: [],
      hasAnswers: null,
      isExpertAnswered: null,
      minVotes: 0,
    })
    router.push('/community/discussions')
  }

  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((c) => c !== categoryId)
      : [...filters.categories, categoryId]
    updateFilters({ categories: newCategories })
  }

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status]
    updateFilters({ status: newStatus })
  }

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag]
    updateFilters({ tags: newTags })
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.status.length > 0 ||
    filters.timeRange !== 'all' ||
    filters.tags.length > 0 ||
    filters.sortBy !== 'latest'

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <Card key={i} className='animate-pulse'>
            <CardContent className='p-4'>
              <div className='mb-2 h-4 w-3/4 rounded bg-gray-200' />
              <div className='h-4 w-1/2 rounded bg-gray-200' />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Filter Header */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
              <Filter className='h-5 w-5 text-indigo-600' />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant='ghost'
                size='sm'
                onClick={clearAllFilters}
                className='text-red-600 hover:text-red-700'
              >
                <X className='mr-1 h-4 w-4' />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-4'>
            {/* Sort Options */}
            <div>
              <label
                htmlFor='sort-by-select'
                className='mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300'
              >
                Sort by
              </label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilters({ sortBy: value })}
              >
                <SelectTrigger id='sort-by-select'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='latest'>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4' />
                      Latest Activity
                    </div>
                  </SelectItem>
                  <SelectItem value='newest'>
                    <div className='flex items-center gap-2'>
                      <Calendar className='h-4 w-4' />
                      Newest Questions
                    </div>
                  </SelectItem>
                  <SelectItem value='votes'>
                    <div className='flex items-center gap-2'>
                      <ArrowUp className='h-4 w-4' />
                      Most Voted
                    </div>
                  </SelectItem>
                  <SelectItem value='views'>
                    <div className='flex items-center gap-2'>
                      <Eye className='h-4 w-4' />
                      Most Viewed
                    </div>
                  </SelectItem>
                  <SelectItem value='trending'>
                    <div className='flex items-center gap-2'>
                      <TrendingUp className='h-4 w-4' />
                      Trending
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div>
              <label
                htmlFor='time-range-select'
                className='mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300'
              >
                Time range
              </label>
              <Select
                value={filters.timeRange}
                onValueChange={(value) => updateFilters({ timeRange: value })}
              >
                <SelectTrigger id='time-range-select'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All time</SelectItem>
                  <SelectItem value='today'>Today</SelectItem>
                  <SelectItem value='week'>This week</SelectItem>
                  <SelectItem value='month'>This month</SelectItem>
                  <SelectItem value='quarter'>This quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Filters */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='font-semibold text-lg'>Status</CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-3'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='status-answered'
                checked={filters.status.includes('answered')}
                onCheckedChange={() => toggleStatus('answered')}
              />
              <label
                htmlFor='status-answered'
                className='flex cursor-pointer items-center gap-2 text-sm'
              >
                <CheckCircle2 className='h-4 w-4 text-green-600' />
                Has accepted answer
                <Badge variant='secondary' className='text-xs'>
                  892
                </Badge>
              </label>
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='status-unanswered'
                checked={filters.status.includes('unanswered')}
                onCheckedChange={() => toggleStatus('unanswered')}
              />
              <label
                htmlFor='status-unanswered'
                className='flex cursor-pointer items-center gap-2 text-sm'
              >
                <MessageSquare className='h-4 w-4 text-orange-600' />
                Unanswered questions
                <Badge variant='secondary' className='text-xs'>
                  355
                </Badge>
              </label>
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='status-featured'
                checked={filters.status.includes('featured')}
                onCheckedChange={() => toggleStatus('featured')}
              />
              <label
                htmlFor='status-featured'
                className='flex cursor-pointer items-center gap-2 text-sm'
              >
                <Star className='h-4 w-4 text-yellow-600' />
                Featured discussions
                <Badge variant='secondary' className='text-xs'>
                  12
                </Badge>
              </label>
            </div>

            <div className='flex items-center space-x-2'>
              <Checkbox
                id='status-trending'
                checked={filters.status.includes('trending')}
                onCheckedChange={() => toggleStatus('trending')}
              />
              <label
                htmlFor='status-trending'
                className='flex cursor-pointer items-center gap-2 text-sm'
              >
                <TrendingUp className='h-4 w-4 text-green-600' />
                Trending topics
                <Badge variant='secondary' className='text-xs'>
                  28
                </Badge>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
            <BookOpen className='h-5 w-5 text-indigo-600' />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-3'>
            {categories.map((category) => (
              <div key={category.id} className='flex items-center space-x-2'>
                <Checkbox
                  id={`category-${category.id}`}
                  checked={filters.categories.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                />
                <label
                  htmlFor={`category-${category.id}`}
                  className='flex flex-1 cursor-pointer items-center gap-2 text-sm'
                >
                  <div
                    className='h-3 w-3 rounded-full'
                    style={{ backgroundColor: category.color }}
                  />
                  <span className='flex-1'>{category.name}</span>
                  <Badge variant='secondary' className='text-xs'>
                    {category.count}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Popular Tags */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
            <Tag className='h-5 w-5 text-indigo-600' />
            Popular Tags
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='flex flex-wrap gap-2'>
            {popularTags.map((tag) => (
              <Button
                key={tag}
                variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                size='sm'
                className='h-7 text-xs'
                onClick={() => toggleTag(tag)}
              >
                #{tag}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='font-semibold text-lg'>Advanced</CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-4'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='expert-answered'
                checked={filters.isExpertAnswered === true}
                onCheckedChange={(checked) =>
                  updateFilters({ isExpertAnswered: checked ? true : null })
                }
              />
              <label
                htmlFor='expert-answered'
                className='flex cursor-pointer items-center gap-2 text-sm'
              >
                <Users className='h-4 w-4 text-purple-600' />
                Has expert answers
              </label>
            </div>

            <div>
              <label
                htmlFor='min-votes-input'
                className='mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300'
              >
                Minimum votes
              </label>
              <Input
                id='min-votes-input'
                type='number'
                min='0'
                value={filters.minVotes}
                onChange={(e) => updateFilters({ minVotes: Number.parseInt(e.target.value) || 0 })}
                placeholder='0'
                className='w-full'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <Card className='border-indigo-200 dark:border-indigo-800'>
          <CardHeader className='pb-3'>
            <CardTitle className='font-semibold text-indigo-700 text-lg dark:text-indigo-300'>
              Active Filters
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <div className='space-y-2'>
              {filters.categories.length > 0 && (
                <div>
                  <span className='font-medium text-gray-600 text-xs dark:text-gray-400'>
                    Categories:
                  </span>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {filters.categories.map((categoryId) => {
                      const category = categories.find((c) => c.id === categoryId)
                      return category ? (
                        <Badge key={categoryId} variant='secondary' className='text-xs'>
                          {category.name}
                          <X
                            className='ml-1 h-3 w-3 cursor-pointer'
                            onClick={() => toggleCategory(categoryId)}
                          />
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {filters.status.length > 0 && (
                <div>
                  <span className='font-medium text-gray-600 text-xs dark:text-gray-400'>
                    Status:
                  </span>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {filters.status.map((status) => (
                      <Badge key={status} variant='secondary' className='text-xs'>
                        {status}
                        <X
                          className='ml-1 h-3 w-3 cursor-pointer'
                          onClick={() => toggleStatus(status)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {filters.tags.length > 0 && (
                <div>
                  <span className='font-medium text-gray-600 text-xs dark:text-gray-400'>
                    Tags:
                  </span>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {filters.tags.map((tag) => (
                      <Badge key={tag} variant='secondary' className='text-xs'>
                        #{tag}
                        <X className='ml-1 h-3 w-3 cursor-pointer' onClick={() => toggleTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
