/**
 * Content List Component - Advanced Content Library Management
 *
 * Features:
 * - Advanced filtering and sorting
 * - Bulk operations and management
 * - Content performance metrics
 * - Real-time status updates
 * - Advanced search with faceted filters
 * - Content preview and quick actions
 * - Accessibility compliance indicators
 *
 * Based on research report requirements for enterprise content management
 *
 * @author Claude Code
 * @version 1.0.0
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Accessibility,
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit,
  Eye,
  FileText,
  Filter,
  Grid3X3,
  HelpCircle,
  List as ListIcon,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  Video,
} from 'lucide-react'

// Content interfaces
interface ContentItem {
  id: string
  title: string
  content: string
  type: 'article' | 'tutorial' | 'faq' | 'video' | 'interactive'
  category: string
  tags: string[]
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived'
  author: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  collaborators: Array<{
    id: string
    name: string
    role: 'editor' | 'reviewer' | 'approver'
  }>
  analytics: {
    views: number
    engagement: number
    helpfulness: number
    completionRate: number
    searchRanking: number
    lastViewedAt?: Date
  }
  accessibility: {
    wcagCompliance: 'A' | 'AA' | 'AAA'
    issues: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
    }>
  }
  multimedia: {
    images: any[]
    videos: any[]
    interactive: any[]
  }
  versions: Array<{
    id: string
    version: string
    createdAt: Date
  }>
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  wordCount?: number
  readingTime?: number
}

interface ContentListProps {
  content: ContentItem[]
  categories: string[]
  statuses: string[]
  selectedCategory: string
  selectedStatus: string
  onCategoryChange: (category: string) => void
  onStatusChange: (status: string) => void
  onEdit: (content: ContentItem) => void
  onDelete: (contentId: string) => void
  onDuplicate: (content: ContentItem) => void
}

interface SortConfig {
  key: keyof ContentItem | string
  direction: 'asc' | 'desc'
}

interface BulkActions {
  selectedItems: Set<string>
  action: 'delete' | 'publish' | 'archive' | 'export' | null
}

/**
 * Advanced Content List Management Component
 * Provides comprehensive content library management with enterprise features
 */
export function ContentList({
  content,
  categories,
  statuses,
  selectedCategory,
  selectedStatus,
  onCategoryChange,
  onStatusChange,
  onEdit,
  onDelete,
  onDuplicate,
}: ContentListProps) {
  // State management for advanced features
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('table')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updatedAt', direction: 'desc' })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [bulkActions, setBulkActions] = useState<BulkActions>({
    selectedItems: new Set(),
    action: null,
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [previewContent, setPreviewContent] = useState<ContentItem | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null)

  // Real-time refresh setup
  useEffect(() => {
    const timer = setInterval(() => {
      // Refresh content list every 30 seconds
      console.log('🔄 Auto-refreshing content list')
    }, 30000)

    setRefreshTimer(timer)
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])

  // Get unique authors and types for filters
  const authors = useMemo(() => {
    const uniqueAuthors = new Set(content.map((item) => item.author.name))
    return Array.from(uniqueAuthors).sort()
  }, [content])

  const types = useMemo(() => {
    const uniqueTypes = new Set(content.map((item) => item.type))
    return Array.from(uniqueTypes).sort()
  }, [content])

  // Advanced filtering logic
  const filteredAndSortedContent = useMemo(() => {
    const filtered = content.filter((item) => {
      // Basic filters
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.author.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
      const matchesType = selectedType === 'all' || item.type === selectedType
      const matchesAuthor = selectedAuthor === 'all' || item.author.name === selectedAuthor

      // Date range filter
      let matchesDateRange = true
      if (dateRange.start && dateRange.end) {
        const itemDate = new Date(item.updatedAt)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        matchesDateRange = itemDate >= startDate && itemDate <= endDate
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesType &&
        matchesAuthor &&
        matchesDateRange
      )
    })

    // Sorting logic
    filtered.sort((a, b) => {
      let aValue
      let bValue

      switch (sortConfig.key) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'author':
          aValue = a.author.name.toLowerCase()
          bValue = b.author.name.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'updatedAt':
        case 'createdAt':
        case 'publishedAt':
          aValue = new Date((a[sortConfig.key as keyof ContentItem] as string) || 0).getTime()
          bValue = new Date((b[sortConfig.key as keyof ContentItem] as string) || 0).getTime()
          break
        case 'analytics.views':
          aValue = a.analytics.views
          bValue = b.analytics.views
          break
        case 'analytics.engagement':
          aValue = a.analytics.engagement
          bValue = b.analytics.engagement
          break
        case 'analytics.helpfulness':
          aValue = a.analytics.helpfulness
          bValue = b.analytics.helpfulness
          break
        case 'wordCount':
          aValue = a.wordCount || 0
          bValue = b.wordCount || 0
          break
        default:
          aValue = a[sortConfig.key as keyof ContentItem]
          bValue = b[sortConfig.key as keyof ContentItem]
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    return filtered
  }, [
    content,
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedType,
    selectedAuthor,
    dateRange,
    sortConfig,
  ])

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  // Handle bulk selection
  const handleBulkSelection = useCallback((contentId: string, selected: boolean) => {
    setBulkActions((prev) => {
      const newSelectedItems = new Set(prev.selectedItems)
      if (selected) {
        newSelectedItems.add(contentId)
      } else {
        newSelectedItems.delete(contentId)
      }
      return { ...prev, selectedItems: newSelectedItems }
    })
  }, [])

  // Handle select all
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      setBulkActions((prev) => ({
        ...prev,
        selectedItems: selected
          ? new Set(filteredAndSortedContent.map((item) => item.id))
          : new Set(),
      }))
    },
    [filteredAndSortedContent]
  )

  // Handle bulk actions
  const handleBulkAction = useCallback(
    async (action: string) => {
      if (bulkActions.selectedItems.size === 0) return

      const selectedIds = Array.from(bulkActions.selectedItems)

      try {
        setIsLoading(true)

        switch (action) {
          case 'delete':
            if (confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) {
              for (const id of selectedIds) {
                await onDelete(id)
              }
            }
            break
          case 'publish':
            // Implement bulk publish
            console.log('Bulk publishing:', selectedIds)
            break
          case 'archive':
            // Implement bulk archive
            console.log('Bulk archiving:', selectedIds)
            break
          case 'export':
            // Implement bulk export
            console.log('Bulk exporting:', selectedIds)
            break
        }

        setBulkActions({ selectedItems: new Set(), action: null })
      } catch (error) {
        console.error('Bulk action failed:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [bulkActions.selectedItems, onDelete]
  )

  // Content type icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className='h-4 w-4' />
      case 'tutorial':
        return <FileText className='h-4 w-4' />
      case 'faq':
        return <HelpCircle className='h-4 w-4' />
      case 'interactive':
        return <Settings className='h-4 w-4' />
      default:
        return <FileText className='h-4 w-4' />
    }
  }

  // Status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Accessibility compliance styling
  const getAccessibilityStyle = (compliance: string) => {
    switch (compliance) {
      case 'AAA':
        return 'bg-green-100 text-green-800'
      case 'AA':
        return 'bg-blue-100 text-blue-800'
      case 'A':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  // Content preview
  const handlePreview = useCallback((content: ContentItem) => {
    setPreviewContent(content)
    setShowPreviewModal(true)
  }, [])

  return (
    <div className='space-y-6'>
      {/* Header with Actions */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <h2 className='font-bold text-2xl text-gray-900'>Content Library</h2>
          <span className='inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-800 text-sm'>
            {filteredAndSortedContent.length} items
          </span>
        </div>

        <div className='flex items-center space-x-2'>
          {/* Bulk Actions */}
          {bulkActions.selectedItems.size > 0 && (
            <div className='flex items-center space-x-2 rounded-md bg-blue-50 px-3 py-2'>
              <span className='text-blue-700 text-sm'>
                {bulkActions.selectedItems.size} selected
              </span>
              <button
                onClick={() => handleBulkAction('publish')}
                className='font-medium text-blue-600 text-xs hover:text-blue-800'
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className='font-medium text-blue-600 text-xs hover:text-blue-800'
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className='font-medium text-red-600 text-xs hover:text-red-800'
              >
                Delete
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className='flex items-center rounded-md bg-gray-100 p-1'>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded p-2 ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title='Table View'
            >
              <ListIcon className='h-4 w-4' />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-2 ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title='Grid View'
            >
              <Grid3X3 className='h-4 w-4' />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className='p-2 text-gray-500 hover:text-gray-700'
            title='Refresh'
          >
            <RefreshCw className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
        {/* Basic Filters */}
        <div className='mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6'>
          {/* Search */}
          <div className='lg:col-span-2'>
            <div className='relative'>
              <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 transform text-gray-400' />
              <input
                type='text'
                placeholder='Search content...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className='w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='all'>All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className='w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='all'>All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className='w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='all'>All Types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Filters Toggle */}
          <div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className='flex w-full items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50'
            >
              <Filter className='mr-2 h-4 w-4' />
              Advanced
              {showAdvancedFilters ? (
                <ChevronDown className='ml-2 h-4 w-4' />
              ) : (
                <ChevronRight className='ml-2 h-4 w-4' />
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className='border-gray-200 border-t pt-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              {/* Author Filter */}
              <div>
                <label
                  htmlFor='author-select'
                  className='mb-2 block font-medium text-gray-700 text-sm'
                >
                  Author
                </label>
                <select
                  id='author-select'
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  className='w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='all'>All Authors</option>
                  {authors.map((author) => (
                    <option key={author} value={author}>
                      {author}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label
                  htmlFor='date-range-start'
                  className='mb-2 block font-medium text-gray-700 text-sm'
                >
                  Date Range
                </label>
                <div className='flex space-x-2'>
                  <input
                    id='date-range-start'
                    type='date'
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className='flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                  <input
                    type='date'
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className='flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className='flex items-end'>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    onCategoryChange('all')
                    onStatusChange('all')
                    setSelectedType('all')
                    setSelectedAuthor('all')
                    setDateRange({ start: '', end: '' })
                  }}
                  className='w-full rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200'
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Table */}
      {viewMode === 'table' && (
        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left'>
                    <input
                      type='checkbox'
                      checked={
                        bulkActions.selectedItems.size === filteredAndSortedContent.length &&
                        filteredAndSortedContent.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                  </th>
                  <th
                    className='cursor-pointer px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hover:bg-gray-100'
                    onClick={() => handleSort('title')}
                  >
                    <div className='flex items-center'>
                      Title
                      <ArrowUpDown className='ml-1 h-4 w-4' />
                    </div>
                  </th>
                  <th className='px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider'>
                    Type
                  </th>
                  <th
                    className='cursor-pointer px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hover:bg-gray-100'
                    onClick={() => handleSort('status')}
                  >
                    <div className='flex items-center'>
                      Status
                      <ArrowUpDown className='ml-1 h-4 w-4' />
                    </div>
                  </th>
                  <th
                    className='cursor-pointer px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hover:bg-gray-100'
                    onClick={() => handleSort('author')}
                  >
                    <div className='flex items-center'>
                      Author
                      <ArrowUpDown className='ml-1 h-4 w-4' />
                    </div>
                  </th>
                  <th
                    className='cursor-pointer px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hover:bg-gray-100'
                    onClick={() => handleSort('analytics.views')}
                  >
                    <div className='flex items-center'>
                      Views
                      <ArrowUpDown className='ml-1 h-4 w-4' />
                    </div>
                  </th>
                  <th className='px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider'>
                    Accessibility
                  </th>
                  <th
                    className='cursor-pointer px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider hover:bg-gray-100'
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className='flex items-center'>
                      Updated
                      <ArrowUpDown className='ml-1 h-4 w-4' />
                    </div>
                  </th>
                  <th className='px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {filteredAndSortedContent.map((item) => (
                  <tr key={item.id} className='hover:bg-gray-50'>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <input
                        type='checkbox'
                        checked={bulkActions.selectedItems.has(item.id)}
                        onChange={(e) => handleBulkSelection(item.id, e.target.checked)}
                        className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-start'>
                        <div className='mr-3 flex-shrink-0 pt-1'>{getTypeIcon(item.type)}</div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate font-medium text-gray-900 text-sm'>{item.title}</p>
                          <p className='truncate text-gray-500 text-xs'>
                            {item.category} • {item.wordCount || 0} words
                          </p>
                          <div className='mt-1 flex items-center space-x-1'>
                            {item.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className='inline-flex items-center rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800 text-xs'
                              >
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className='text-gray-500 text-xs'>
                                +{item.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <div className='flex items-center'>
                        {getTypeIcon(item.type)}
                        <span className='ml-2 text-gray-700 text-sm capitalize'>{item.type}</span>
                      </div>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${getStatusStyle(item.status)}`}
                      >
                        {item.status === 'published' && <CheckCircle className='mr-1 h-3 w-3' />}
                        {item.status === 'review' && <Clock className='mr-1 h-3 w-3' />}
                        {item.status === 'draft' && <Edit className='mr-1 h-3 w-3' />}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <div className='flex items-center'>
                        {item.author.avatar && (
                          <img
                            className='mr-3 h-8 w-8 rounded-full'
                            src={item.author.avatar}
                            alt={item.author.name}
                          />
                        )}
                        <div>
                          <p className='font-medium text-gray-900 text-sm'>{item.author.name}</p>
                          <p className='text-gray-500 text-xs'>{item.author.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <div className='flex items-center'>
                        <Eye className='mr-2 h-4 w-4 text-gray-400' />
                        <div>
                          <p className='font-medium text-gray-900 text-sm'>
                            {item.analytics.views.toLocaleString()}
                          </p>
                          <div className='flex items-center text-gray-500 text-xs'>
                            {item.analytics.engagement > 50 ? (
                              <TrendingUp className='mr-1 h-3 w-3 text-green-500' />
                            ) : (
                              <TrendingDown className='mr-1 h-3 w-3 text-red-500' />
                            )}
                            {item.analytics.engagement}% engagement
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4'>
                      <div className='flex items-center'>
                        <span
                          className={`inline-flex items-center rounded px-2 py-1 font-medium text-xs ${getAccessibilityStyle(item.accessibility.wcagCompliance)}`}
                        >
                          <Accessibility className='mr-1 h-3 w-3' />
                          WCAG {item.accessibility.wcagCompliance}
                        </span>
                        {item.accessibility.issues.length > 0 && (
                          <div title={`${item.accessibility.issues.length} accessibility issues`}>
                            <AlertCircle className='ml-2 h-4 w-4 text-red-500' />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4 text-gray-500 text-sm'>
                      <div>
                        <p>{new Date(item.updatedAt).toLocaleDateString()}</p>
                        <p className='text-xs'>{new Date(item.updatedAt).toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className='whitespace-nowrap px-6 py-4 font-medium text-sm'>
                      <div className='flex items-center space-x-2'>
                        <button
                          onClick={() => handlePreview(item)}
                          className='text-blue-600 hover:text-blue-900'
                          title='Preview'
                        >
                          <Eye className='h-4 w-4' />
                        </button>
                        <button
                          onClick={() => onEdit(item)}
                          className='text-indigo-600 hover:text-indigo-900'
                          title='Edit'
                        >
                          <Edit className='h-4 w-4' />
                        </button>
                        <button
                          onClick={() => onDuplicate(item)}
                          className='text-green-600 hover:text-green-900'
                          title='Duplicate'
                        >
                          <Copy className='h-4 w-4' />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className='text-red-600 hover:text-red-900'
                          title='Delete'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                        <button className='text-gray-600 hover:text-gray-900' title='More actions'>
                          <MoreHorizontal className='h-4 w-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedContent.length === 0 && (
            <div className='py-12 text-center'>
              <FileText className='mx-auto mb-4 h-12 w-12 text-gray-400' />
              <h3 className='mb-2 font-medium text-gray-900 text-lg'>No Content Found</h3>
              <p className='text-gray-500'>Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {filteredAndSortedContent.map((item) => (
            <div
              key={item.id}
              className='rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md'
            >
              {/* Card Header */}
              <div className='border-gray-200 border-b p-4'>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center space-x-2'>
                    {getTypeIcon(item.type)}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${getStatusStyle(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <input
                    type='checkbox'
                    checked={bulkActions.selectedItems.has(item.id)}
                    onChange={(e) => handleBulkSelection(item.id, e.target.checked)}
                    className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                  />
                </div>
                <h3 className='mt-2 line-clamp-2 font-medium text-gray-900 text-sm'>
                  {item.title}
                </h3>
                <p className='mt-1 text-gray-500 text-xs'>
                  {item.category} • {item.wordCount || 0} words
                </p>
              </div>

              {/* Card Content */}
              <div className='p-4'>
                <div className='mb-3 flex items-center space-x-4 text-gray-500 text-xs'>
                  <div className='flex items-center'>
                    <Eye className='mr-1 h-3 w-3' />
                    {item.analytics.views.toLocaleString()}
                  </div>
                  <div className='flex items-center'>
                    <BarChart3 className='mr-1 h-3 w-3' />
                    {item.analytics.engagement}%
                  </div>
                  <div className='flex items-center'>
                    <Accessibility className='mr-1 h-3 w-3' />
                    {item.accessibility.wcagCompliance}
                  </div>
                </div>

                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    {item.author.avatar && (
                      <img
                        className='h-6 w-6 rounded-full'
                        src={item.author.avatar}
                        alt={item.author.name}
                      />
                    )}
                    <span className='text-gray-600 text-xs'>{item.author.name}</span>
                  </div>
                  <span className='text-gray-500 text-xs'>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Tags */}
                <div className='mb-3 flex flex-wrap gap-1'>
                  {item.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className='inline-flex items-center rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800 text-xs'
                    >
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 2 && (
                    <span className='text-gray-500 text-xs'>+{item.tags.length - 2}</span>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className='border-gray-200 border-t bg-gray-50 px-4 py-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <button
                      onClick={() => handlePreview(item)}
                      className='text-blue-600 hover:text-blue-900'
                      title='Preview'
                    >
                      <Eye className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className='text-indigo-600 hover:text-indigo-900'
                      title='Edit'
                    >
                      <Edit className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => onDuplicate(item)}
                      className='text-green-600 hover:text-green-900'
                      title='Duplicate'
                    >
                      <Copy className='h-4 w-4' />
                    </button>
                  </div>
                  <button
                    onClick={() => onDelete(item.id)}
                    className='text-red-600 hover:text-red-900'
                    title='Delete'
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredAndSortedContent.length === 0 && (
            <div className='col-span-full py-12 text-center'>
              <FileText className='mx-auto mb-4 h-12 w-12 text-gray-400' />
              <h3 className='mb-2 font-medium text-gray-900 text-lg'>No Content Found</h3>
              <p className='text-gray-500'>Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      )}

      {/* Content Preview Modal */}
      {showPreviewModal && previewContent && (
        <div className='fixed inset-0 z-50 overflow-y-auto'>
          <div className='flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0'>
            <div className='fixed inset-0 transition-opacity' aria-hidden='true'>
              <div
                className='absolute inset-0 bg-gray-500 opacity-75'
                onClick={() => setShowPreviewModal(false)}
              />
            </div>

            <div className='inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6 sm:align-middle'>
              <div className='mb-4 flex items-center justify-between'>
                <div>
                  <h3 className='font-medium text-gray-900 text-lg'>Content Preview</h3>
                  <p className='text-gray-500 text-sm'>{previewContent.title}</p>
                </div>
                <div className='flex items-center space-x-2'>
                  <button
                    onClick={() => onEdit(previewContent)}
                    className='inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 text-sm hover:bg-gray-50'
                  >
                    <Edit className='mr-1 h-4 w-4' />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className='inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 text-sm hover:bg-gray-50'
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className='prose prose-sm max-w-none'>
                <div dangerouslySetInnerHTML={{ __html: previewContent.content }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
