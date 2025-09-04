/**
 * Inline Documentation Panel - Embedded help content within the interface
 *
 * Comprehensive inline documentation system:
 * - Contextual documentation panels within workflows
 * - Expandable help sections with progressive disclosure
 * - Interactive examples and code snippets
 * - Search and filtering within documentation
 * - Bookmarking and favorites system
 * - Version-aware content with update notifications
 * - Collaborative features for team documentation
 *
 * @created 2025-09-04
 * @author Claude Development System
 * @version 1.0.0
 */

'use client'

import type React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  BookmarkIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  EyeIcon,
  FilterIcon,
  HeartIcon,
  LinkIcon,
  MoreVerticalIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  ShareIcon,
  TagIcon,
  ThumbsUpIcon,
  UserIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface DocumentationItem {
  id: string
  title: string
  content: React.ReactNode | string
  type: 'guide' | 'reference' | 'tutorial' | 'example' | 'troubleshooting' | 'best-practice'
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  estimatedReadTime?: number
  lastUpdated: Date
  version?: string
  author?: {
    name: string
    avatar?: string
  }
  examples?: CodeExample[]
  relatedItems?: string[]
  prerequisites?: string[]
  nextSteps?: string[]
  bookmarked?: boolean
  liked?: boolean
  viewCount?: number
  rating?: {
    average: number
    count: number
  }
  metadata?: Record<string, any>
}

export interface CodeExample {
  id: string
  title: string
  description?: string
  code: string
  language: string
  executable?: boolean
  result?: string
  imports?: string[]
}

export interface DocumentationSection {
  id: string
  title: string
  description?: string
  items: DocumentationItem[]
  collapsible?: boolean
  defaultExpanded?: boolean
  icon?: React.ReactNode
}

export interface InlineDocumentationPanelProps {
  sections: DocumentationSection[]
  contextId?: string // For contextual filtering
  searchable?: boolean
  filterable?: boolean
  bookmarkable?: boolean
  shareable?: boolean
  collaborative?: boolean
  className?: string
  maxHeight?: number
  defaultTab?: string
  onItemView?: (item: DocumentationItem) => void
  onItemBookmark?: (item: DocumentationItem, bookmarked: boolean) => void
  onItemLike?: (item: DocumentationItem, liked: boolean) => void
  onItemShare?: (item: DocumentationItem) => void
  onSearch?: (query: string) => void
}

// ========================
// UTILITY FUNCTIONS
// ========================

const getTypeIcon = (type: DocumentationItem['type']) => {
  switch (type) {
    case 'guide':
      return <BookOpenIcon className='h-4 w-4' />
    case 'reference':
      return <BookmarkIcon className='h-4 w-4' />
    case 'tutorial':
      return <PlayIcon className='h-4 w-4' />
    case 'example':
      return <CopyIcon className='h-4 w-4' />
    case 'troubleshooting':
      return <RefreshCwIcon className='h-4 w-4' />
    case 'best-practice':
      return <ThumbsUpIcon className='h-4 w-4' />
    default:
      return <BookOpenIcon className='h-4 w-4' />
  }
}

const getDifficultyColor = (difficulty: DocumentationItem['difficulty']) => {
  switch (difficulty) {
    case 'beginner':
      return 'text-green-500 bg-green-500/10 border-green-500/20'
    case 'intermediate':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    case 'advanced':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
    case 'expert':
      return 'text-red-500 bg-red-500/10 border-red-500/20'
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
  }
}

const formatReadTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes}min`
}

const formatLastUpdated = (date: Date) => {
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 1) return 'Just updated'
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
  return date.toLocaleDateString()
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Inline Documentation Panel Component
 *
 * Comprehensive documentation system embedded within the interface.
 */
export function InlineDocumentationPanel({
  sections,
  contextId,
  searchable = true,
  filterable = true,
  bookmarkable = true,
  shareable = true,
  collaborative = true,
  className,
  maxHeight = 600,
  defaultTab = 'all',
  onItemView,
  onItemBookmark,
  onItemLike,
  onItemShare,
  onSearch,
}: InlineDocumentationPanelProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState(defaultTab)
  const [selectedFilters, setSelectedFilters] = useState<{
    type?: DocumentationItem['type']
    difficulty?: DocumentationItem['difficulty']
    category?: string
    tags?: string[]
  }>({})
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.filter((s) => s.defaultExpanded !== false).map((s) => s.id))
  )
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ========================
  // COMPUTED VALUES
  // ========================

  const allItems = useMemo(() => {
    return sections.flatMap((section) => section.items)
  }, [sections])

  const allTypes = useMemo(() => {
    return Array.from(new Set(allItems.map((item) => item.type)))
  }, [allItems])

  const allCategories = useMemo(() => {
    return Array.from(new Set(allItems.map((item) => item.category)))
  }, [allItems])

  const allTags = useMemo(() => {
    return Array.from(new Set(allItems.flatMap((item) => item.tags)))
  }, [allItems])

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(query)
        const matchesContent =
          typeof item.content === 'string' && item.content.toLowerCase().includes(query)
        const matchesTags = item.tags.some((tag) => tag.toLowerCase().includes(query))
        const matchesCategory = item.category.toLowerCase().includes(query)

        if (!matchesTitle && !matchesContent && !matchesTags && !matchesCategory) {
          return false
        }
      }

      // Type filter
      if (selectedFilters.type && item.type !== selectedFilters.type) {
        return false
      }

      // Difficulty filter
      if (selectedFilters.difficulty && item.difficulty !== selectedFilters.difficulty) {
        return false
      }

      // Category filter
      if (selectedFilters.category && item.category !== selectedFilters.category) {
        return false
      }

      // Tags filter
      if (selectedFilters.tags && selectedFilters.tags.length > 0) {
        if (!selectedFilters.tags.some((tag) => item.tags.includes(tag))) {
          return false
        }
      }

      // Tab filter
      if (selectedTab !== 'all') {
        switch (selectedTab) {
          case 'bookmarked':
            return item.bookmarked === true
          case 'recent': {
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return item.lastUpdated > weekAgo
          }
          case 'popular':
            return (item.viewCount || 0) > 10
          default:
            return item.type === selectedTab
        }
      }

      return true
    })
  }, [allItems, searchQuery, selectedFilters, selectedTab])

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => filteredItems.includes(item)),
      }))
      .filter((section) => section.items.length > 0)
  }, [sections, filteredItems])

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)

      // Track search analytics
      if (query) {
        helpAnalytics.trackHelpInteraction(
          'documentation-panel',
          helpState.sessionId,
          'search',
          query
        )
      }

      onSearch?.(query)
    },
    [helpState.sessionId, onSearch]
  )

  const handleItemView = useCallback(
    (item: DocumentationItem) => {
      // Track item view
      helpAnalytics.trackHelpView(item.id, helpState.sessionId, {
        type: item.type,
        category: item.category,
        difficulty: item.difficulty,
        searchQuery,
        contextId,
      })

      // Track interaction
      trackInteraction('documentation_view', item.id, {
        type: item.type,
        category: item.category,
      })

      onItemView?.(item)
    },
    [helpState.sessionId, searchQuery, contextId, trackInteraction, onItemView]
  )

  const handleItemBookmark = useCallback(
    (item: DocumentationItem) => {
      const newBookmarked = !item.bookmarked

      // Track bookmark action
      helpAnalytics.trackHelpInteraction(
        item.id,
        helpState.sessionId,
        newBookmarked ? 'bookmark' : 'unbookmark',
        'documentation'
      )

      onItemBookmark?.(item, newBookmarked)
    },
    [helpState.sessionId, onItemBookmark]
  )

  const handleItemLike = useCallback(
    (item: DocumentationItem) => {
      const newLiked = !item.liked

      // Track like action
      helpAnalytics.trackHelpInteraction(
        item.id,
        helpState.sessionId,
        newLiked ? 'like' : 'unlike',
        'documentation'
      )

      onItemLike?.(item, newLiked)
    },
    [helpState.sessionId, onItemLike]
  )

  const handleItemShare = useCallback(
    (item: DocumentationItem) => {
      // Track share action
      helpAnalytics.trackHelpInteraction(item.id, helpState.sessionId, 'share', 'documentation')

      onItemShare?.(item)
    },
    [helpState.sessionId, onItemShare]
  )

  const handleSectionToggle = useCallback((sectionId: string) => {
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

  const handleItemToggle = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderCodeExample = (example: CodeExample) => {
    return (
      <div key={example.id} className='overflow-hidden rounded-lg border'>
        <div className='flex items-center justify-between bg-muted px-3 py-2'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-xs'>
              {example.language}
            </Badge>
            <span className='font-medium text-sm'>{example.title}</span>
          </div>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => copyToClipboard(example.code)}
            className='h-6 w-6 p-0'
          >
            <CopyIcon className='h-3 w-3' />
          </Button>
        </div>

        {example.description && (
          <div className='border-b px-3 py-2 text-muted-foreground text-sm'>
            {example.description}
          </div>
        )}

        <pre className='overflow-x-auto bg-muted/50 p-3 text-sm'>
          <code>{example.code}</code>
        </pre>

        {example.result && (
          <div className='border-t bg-green-500/5 px-3 py-2'>
            <div className='mb-1 text-muted-foreground text-xs'>Output:</div>
            <pre className='text-sm'>
              <code>{example.result}</code>
            </pre>
          </div>
        )}
      </div>
    )
  }

  const renderDocumentationItem = (item: DocumentationItem) => {
    const isExpanded = expandedItems.has(item.id)

    return (
      <Card key={item.id} className='mb-3'>
        <div className='p-4'>
          <div className='mb-2 flex items-start justify-between'>
            <div className='flex flex-1 items-start gap-3'>
              <div className='mt-0.5'>{getTypeIcon(item.type)}</div>

              <div className='min-w-0 flex-1'>
                <button
                  onClick={() => {
                    handleItemView(item)
                    handleItemToggle(item.id)
                  }}
                  className='w-full rounded text-left focus:outline-none focus:ring-2 focus:ring-primary/50'
                >
                  <h3 className='font-medium text-sm transition-colors hover:text-primary'>
                    {item.title}
                  </h3>
                </button>

                <div className='mt-1 flex flex-wrap items-center gap-2'>
                  <Badge
                    variant='outline'
                    className={cn('px-2 py-0.5 text-xs', getDifficultyColor(item.difficulty))}
                  >
                    {item.difficulty}
                  </Badge>

                  <Badge variant='secondary' className='px-2 py-0.5 text-xs'>
                    {item.category}
                  </Badge>

                  {item.estimatedReadTime && (
                    <Badge variant='outline' className='px-2 py-0.5 text-xs'>
                      {formatReadTime(item.estimatedReadTime)}
                    </Badge>
                  )}

                  <span className='text-muted-foreground text-xs'>
                    {formatLastUpdated(item.lastUpdated)}
                  </span>
                </div>
              </div>
            </div>

            <div className='ml-2 flex items-center gap-1'>
              {bookmarkable && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleItemBookmark(item)}
                        className={cn('h-7 w-7 p-0', item.bookmarked && 'text-yellow-500')}
                      >
                        <BookmarkIcon
                          className={cn('h-3 w-3', item.bookmarked && 'fill-current')}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {item.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleItemLike(item)}
                      className={cn('h-7 w-7 p-0', item.liked && 'text-red-500')}
                    >
                      <HeartIcon className={cn('h-3 w-3', item.liked && 'fill-current')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{item.liked ? 'Unlike' : 'Like'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
                    <MoreVerticalIcon className='h-3 w-3' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => handleItemView(item)}>
                      <EyeIcon className='mr-2 h-4 w-4' />
                      View Details
                    </DropdownMenuItem>
                    {shareable && (
                      <DropdownMenuItem onClick={() => handleItemShare(item)}>
                        <ShareIcon className='mr-2 h-4 w-4' />
                        Share
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => copyToClipboard(window.location.href)}>
                      <LinkIcon className='mr-2 h-4 w-4' />
                      Copy Link
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className='mb-3 flex flex-wrap gap-1'>
              {item.tags.map((tag) => (
                <Badge key={tag} variant='outline' className='px-1.5 py-0.5 text-xs'>
                  <TagIcon className='mr-1 h-2 w-2' />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Expanded content */}
          {isExpanded && (
            <div className='space-y-4'>
              <Separator />

              {/* Content */}
              <div className='text-muted-foreground text-sm'>
                {typeof item.content === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: item.content }} />
                ) : (
                  item.content
                )}
              </div>

              {/* Examples */}
              {item.examples && item.examples.length > 0 && (
                <div className='space-y-3'>
                  <h4 className='font-medium text-sm'>Examples</h4>
                  {item.examples.map(renderCodeExample)}
                </div>
              )}

              {/* Prerequisites */}
              {item.prerequisites && item.prerequisites.length > 0 && (
                <div>
                  <h4 className='mb-2 font-medium text-sm'>Prerequisites</h4>
                  <ul className='space-y-1 text-muted-foreground text-sm'>
                    {item.prerequisites.map((prereq, index) => (
                      <li key={index} className='flex items-center gap-2'>
                        <div className='h-1 w-1 rounded-full bg-current opacity-60' />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next steps */}
              {item.nextSteps && item.nextSteps.length > 0 && (
                <div>
                  <h4 className='mb-2 font-medium text-sm'>Next Steps</h4>
                  <ul className='space-y-1 text-muted-foreground text-sm'>
                    {item.nextSteps.map((step, index) => (
                      <li key={index} className='flex items-center gap-2'>
                        <div className='h-1 w-1 rounded-full bg-current opacity-60' />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Author and metadata */}
              {item.author && (
                <div className='flex items-center gap-2 border-t pt-3'>
                  <div className='flex items-center gap-2'>
                    {item.author.avatar ? (
                      <img
                        src={item.author.avatar}
                        alt={item.author.name}
                        className='h-5 w-5 rounded-full'
                      />
                    ) : (
                      <UserIcon className='h-4 w-4' />
                    )}
                    <span className='text-muted-foreground text-xs'>By {item.author.name}</span>
                  </div>

                  {item.viewCount && (
                    <div className='flex items-center gap-1 text-muted-foreground text-xs'>
                      <EyeIcon className='h-3 w-3' />
                      {item.viewCount} views
                    </div>
                  )}

                  {item.rating && (
                    <div className='flex items-center gap-1 text-muted-foreground text-xs'>
                      ★ {item.rating.average.toFixed(1)} ({item.rating.count})
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    )
  }

  const renderSection = (section: DocumentationSection) => {
    const isExpanded = expandedSections.has(section.id)

    if (section.collapsible === false) {
      return (
        <div key={section.id} className='space-y-3'>
          {section.items.map(renderDocumentationItem)}
        </div>
      )
    }

    return (
      <Collapsible
        key={section.id}
        open={isExpanded}
        onOpenChange={() => handleSectionToggle(section.id)}
      >
        <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg p-3 hover:bg-muted/50'>
          <div className='flex items-center gap-2'>
            {section.icon}
            <h2 className='font-medium text-sm'>{section.title}</h2>
            <Badge variant='outline' className='text-xs'>
              {section.items.length}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className='h-4 w-4' />
          ) : (
            <ChevronDownIcon className='h-4 w-4' />
          )}
        </CollapsibleTrigger>

        {section.description && (
          <div className='px-3 pb-2 text-muted-foreground text-sm'>{section.description}</div>
        )}

        <CollapsibleContent className='space-y-3 px-3 pb-3'>
          {section.items.map(renderDocumentationItem)}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className={cn('rounded-lg border bg-background', className)}>
      <div className='border-b p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h1 className='font-semibold text-lg'>Documentation</h1>

          {filterable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm'>
                  <FilterIcon className='mr-2 h-4 w-4' />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <div className='space-y-3 p-3'>
                  <div>
                    <label className='font-medium text-muted-foreground text-xs'>Type</label>
                    <select
                      value={selectedFilters.type || ''}
                      onChange={(e) =>
                        setSelectedFilters((prev) => ({
                          ...prev,
                          type: (e.target.value as DocumentationItem['type']) || undefined,
                        }))
                      }
                      className='mt-1 w-full rounded border px-2 py-1 text-sm'
                    >
                      <option value=''>All types</option>
                      {allTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className='font-medium text-muted-foreground text-xs'>Difficulty</label>
                    <select
                      value={selectedFilters.difficulty || ''}
                      onChange={(e) =>
                        setSelectedFilters((prev) => ({
                          ...prev,
                          difficulty:
                            (e.target.value as DocumentationItem['difficulty']) || undefined,
                        }))
                      }
                      className='mt-1 w-full rounded border px-2 py-1 text-sm'
                    >
                      <option value=''>All levels</option>
                      <option value='beginner'>Beginner</option>
                      <option value='intermediate'>Intermediate</option>
                      <option value='advanced'>Advanced</option>
                      <option value='expert'>Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className='font-medium text-muted-foreground text-xs'>Category</label>
                    <select
                      value={selectedFilters.category || ''}
                      onChange={(e) =>
                        setSelectedFilters((prev) => ({
                          ...prev,
                          category: e.target.value || undefined,
                        }))
                      }
                      className='mt-1 w-full rounded border px-2 py-1 text-sm'
                    >
                      <option value=''>All categories</option>
                      {allCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setSelectedFilters({})} className='text-center'>
                  Clear filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {searchable && (
          <div className='relative'>
            <SearchIcon className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
            <Input
              ref={searchInputRef}
              placeholder='Search documentation...'
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className='pl-10'
            />
          </div>
        )}
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className='w-full'>
        <div className='border-b px-4 py-2'>
          <TabsList className='h-9'>
            <TabsTrigger value='all' className='text-xs'>
              All
            </TabsTrigger>
            <TabsTrigger value='guide' className='text-xs'>
              Guides
            </TabsTrigger>
            <TabsTrigger value='tutorial' className='text-xs'>
              Tutorials
            </TabsTrigger>
            <TabsTrigger value='example' className='text-xs'>
              Examples
            </TabsTrigger>
            <TabsTrigger value='bookmarked' className='text-xs'>
              Bookmarked
            </TabsTrigger>
            <TabsTrigger value='recent' className='text-xs'>
              Recent
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className='h-full' style={{ maxHeight }}>
          <div className='p-4'>
            <TabsContent value={selectedTab} className='mt-0 space-y-4'>
              {filteredSections.length > 0 ? (
                filteredSections.map(renderSection)
              ) : (
                <div className='py-8 text-center'>
                  <BookOpenIcon className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
                  <p className='text-muted-foreground text-sm'>
                    {searchQuery || Object.keys(selectedFilters).length > 0
                      ? 'No documentation found matching your criteria'
                      : 'No documentation available'}
                  </p>
                  {(searchQuery || Object.keys(selectedFilters).length > 0) && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedFilters({})
                      }}
                      className='mt-2'
                    >
                      Clear search and filters
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

// ========================
// EXPORTS
// ========================

export default InlineDocumentationPanel
export type { InlineDocumentationPanelProps, DocumentationItem, DocumentationSection, CodeExample }
