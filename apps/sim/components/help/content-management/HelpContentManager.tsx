/**
 * Help Content Management System - Comprehensive multimedia help content organization
 *
 * Features:
 * - Unified content management for tutorials, guides, and documentation
 * - Advanced categorization and tagging system
 * - Content lifecycle management (draft, review, published, archived)
 * - Multi-language content support with localization
 * - SEO optimization and search indexing
 * - Content analytics and performance tracking
 * - Collaborative editing and approval workflows
 * - CDN integration for optimized content delivery
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BookOpenIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  GlobeIcon,
  PlayCircleIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  TrendingUpIcon,
  UserCheckIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpContent {
  id: string
  title: string
  description: string
  slug: string

  // Content type and format
  type: 'tutorial' | 'guide' | 'documentation' | 'faq' | 'troubleshooting'
  format: 'video' | 'interactive' | 'article' | 'checklist' | 'mixed'

  // Content organization
  category: string
  subcategory?: string
  tags: string[]
  keywords: string[]

  // Content data
  content: HelpContentData

  // Metadata
  author: string
  contributors: string[]
  reviewers: string[]

  // Status and workflow
  status: 'draft' | 'review' | 'published' | 'archived' | 'deprecated'
  publishedAt?: string
  lastModifiedAt: string
  createdAt: string

  // Localization
  language: string
  translations: Record<string, string> // language code -> content id

  // SEO and discovery
  seoTitle?: string
  seoDescription?: string
  searchKeywords: string[]

  // Analytics and performance
  viewCount: number
  completionRate: number
  averageRating: number
  ratingCount: number

  // Access control
  visibility: 'public' | 'internal' | 'restricted'
  permissions: ContentPermissions

  // Related content
  relatedContent: string[]
  prerequisites: string[]
  followUpContent: string[]

  // Content versioning
  version: string
  changelog: ChangelogEntry[]
}

export interface HelpContentData {
  // Video tutorial specific
  videoUrl?: string
  thumbnail?: string
  duration?: number
  chapters?: VideoChapter[]

  // Interactive guide specific
  steps?: GuideStep[]
  branches?: GuideBranch[]

  // Article/documentation specific
  body?: string
  sections?: ContentSection[]

  // Shared content elements
  media: MediaAsset[]
  attachments: FileAttachment[]
  links: ExternalLink[]
}

export interface VideoChapter {
  id: string
  title: string
  startTime: number
  endTime: number
  description?: string
}

export interface GuideStep {
  id: string
  title: string
  content: string
  type: 'instruction' | 'action' | 'validation'
}

export interface GuideBranch {
  id: string
  name: string
  condition: string
  steps: string[]
}

export interface ContentSection {
  id: string
  title: string
  content: string
  order: number
  subsections?: ContentSection[]
}

export interface MediaAsset {
  id: string
  type: 'image' | 'video' | 'audio' | 'document'
  url: string
  alt?: string
  caption?: string
  size?: number
  duration?: number
}

export interface FileAttachment {
  id: string
  name: string
  url: string
  size: number
  type: string
}

export interface ExternalLink {
  id: string
  title: string
  url: string
  description?: string
}

export interface ContentPermissions {
  canView: string[]
  canEdit: string[]
  canPublish: string[]
  canDelete: string[]
}

export interface ChangelogEntry {
  id: string
  version: string
  changes: string
  author: string
  timestamp: string
}

export interface ContentCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  parent?: string
  subcategories: ContentCategory[]
  contentCount: number
}

export interface ContentTemplate {
  id: string
  name: string
  description: string
  type: 'tutorial' | 'guide' | 'documentation'
  structure: TemplateStructure
}

export interface TemplateStructure {
  sections: Array<{
    name: string
    required: boolean
    type: 'text' | 'media' | 'steps' | 'chapters'
  }>
}

export interface ContentAnalytics {
  contentId: string
  timeframe: 'day' | 'week' | 'month'
  metrics: {
    views: number
    uniqueViews: number
    completions: number
    averageTimeSpent: number
    bounceRate: number
    ratingAverage: number
    searchImpressions: number
    searchClicks: number
  }
  trends: {
    viewsTrend: number // percentage change
    completionTrend: number
    ratingTrend: number
  }
}

export interface HelpContentManagerProps {
  className?: string
  showAnalytics?: boolean
  enableCollaboration?: boolean
  enableVersioning?: boolean
  enableLocalization?: boolean
}

// ========================
// MOCK DATA - TO BE REPLACED WITH API CALLS
// ========================

const MOCK_CATEGORIES: ContentCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential content for new users',
    icon: 'play-circle',
    color: 'blue',
    subcategories: [
      {
        id: 'basics',
        name: 'Basics',
        description: 'Fundamental concepts',
        icon: 'book',
        color: 'blue',
        subcategories: [],
        contentCount: 8,
      },
    ],
    contentCount: 12,
  },
  {
    id: 'workflows',
    name: 'Workflows',
    description: 'Workflow creation and management',
    icon: 'workflow',
    color: 'green',
    subcategories: [],
    contentCount: 15,
  },
]

const MOCK_CONTENT: HelpContent[] = [
  {
    id: 'content-1',
    title: 'Introduction to Sim Workflows',
    description: 'Learn the fundamentals of creating automation workflows',
    slug: 'intro-to-workflows',
    type: 'tutorial',
    format: 'video',
    category: 'getting-started',
    subcategory: 'basics',
    tags: ['workflows', 'basics', 'automation'],
    keywords: ['workflow', 'automation', 'getting started', 'tutorial'],
    content: {
      videoUrl: '/tutorials/intro-workflows.mp4',
      thumbnail: '/tutorials/thumbnails/intro-workflows.jpg',
      duration: 480,
      chapters: [
        {
          id: 'ch1',
          title: 'What are Workflows?',
          startTime: 0,
          endTime: 120,
        },
      ],
      media: [],
      attachments: [],
      links: [],
    },
    author: 'John Doe',
    contributors: [],
    reviewers: ['Jane Smith'],
    status: 'published',
    publishedAt: '2025-01-04T10:00:00Z',
    lastModifiedAt: '2025-01-04T10:00:00Z',
    createdAt: '2025-01-04T09:00:00Z',
    language: 'en',
    translations: {
      es: 'content-1-es',
      fr: 'content-1-fr',
    },
    searchKeywords: ['workflow', 'automation', 'tutorial', 'beginner'],
    viewCount: 1250,
    completionRate: 0.82,
    averageRating: 4.7,
    ratingCount: 89,
    visibility: 'public',
    permissions: {
      canView: ['*'],
      canEdit: ['author', 'admin'],
      canPublish: ['admin'],
      canDelete: ['admin'],
    },
    relatedContent: ['content-2', 'content-3'],
    prerequisites: [],
    followUpContent: ['content-2'],
    version: '1.2.0',
    changelog: [
      {
        id: 'cl1',
        version: '1.2.0',
        changes: 'Updated video quality and added closed captions',
        author: 'John Doe',
        timestamp: '2025-01-04T10:00:00Z',
      },
    ],
  },
]

const MOCK_TEMPLATES: ContentTemplate[] = [
  {
    id: 'video-tutorial-template',
    name: 'Video Tutorial Template',
    description: 'Standard template for video tutorials',
    type: 'tutorial',
    structure: {
      sections: [
        { name: 'Introduction', required: true, type: 'text' },
        { name: 'Video Content', required: true, type: 'media' },
        { name: 'Key Points', required: false, type: 'text' },
        { name: 'Practice Exercises', required: false, type: 'steps' },
      ],
    },
  },
]

// ========================
// MAIN COMPONENT
// ========================

export function HelpContentManager({
  className,
  showAnalytics = true,
  enableCollaboration = true,
  enableVersioning = true,
  enableLocalization = true,
}: HelpContentManagerProps) {
  const { state: helpState } = useHelp()

  // Core state
  const [content, setContent] = useState<HelpContent[]>(MOCK_CONTENT)
  const [categories, setCategories] = useState<ContentCategory[]>(MOCK_CATEGORIES)
  const [templates, setTemplates] = useState<ContentTemplate[]>(MOCK_TEMPLATES)

  // UI state
  const [activeTab, setActiveTab] = useState('content')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('lastModified')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // ========================
  // DATA FETCHING
  // ========================

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API calls
      // const contentResponse = await fetch('/api/help/content')
      // const categoriesResponse = await fetch('/api/help/categories')
      // setContent(await contentResponse.json())
      // setCategories(await categoriesResponse.json())

      // Track content manager access
      helpAnalytics.trackHelpInteraction(
        'content-manager',
        helpState.sessionId,
        'manager_access',
        'content_management',
        { activeTab }
      )
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [helpState.sessionId, activeTab])

  const loadAnalytics = useCallback(async (contentId: string): Promise<ContentAnalytics> => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/help/content/${contentId}/analytics`)
      // return await response.json()

      // Mock analytics for demonstration
      return {
        contentId,
        timeframe: 'week',
        metrics: {
          views: 1250,
          uniqueViews: 890,
          completions: 720,
          averageTimeSpent: 340,
          bounceRate: 0.15,
          ratingAverage: 4.7,
          searchImpressions: 5600,
          searchClicks: 340,
        },
        trends: {
          viewsTrend: 12,
          completionTrend: 8,
          ratingTrend: 3,
        },
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      throw error
    }
  }, [])

  // ========================
  // CONTENT OPERATIONS
  // ========================

  const createContent = useCallback(
    async (contentData: Partial<HelpContent>) => {
      try {
        // TODO: Replace with actual API call
        const newContent: HelpContent = {
          id: `content-${Date.now()}`,
          title: contentData.title || 'New Content',
          description: contentData.description || '',
          slug: contentData.title?.toLowerCase().replace(/\s+/g, '-') || 'new-content',
          type: contentData.type || 'tutorial',
          format: contentData.format || 'video',
          category: contentData.category || 'getting-started',
          tags: contentData.tags || [],
          keywords: contentData.keywords || [],
          content: contentData.content || { media: [], attachments: [], links: [] },
          author: helpState.userProfile?.name || 'Unknown Author',
          contributors: [],
          reviewers: [],
          status: 'draft',
          lastModifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          language: 'en',
          translations: {},
          searchKeywords: contentData.keywords || [],
          viewCount: 0,
          completionRate: 0,
          averageRating: 0,
          ratingCount: 0,
          visibility: 'internal',
          permissions: {
            canView: ['author'],
            canEdit: ['author'],
            canPublish: ['admin'],
            canDelete: ['admin'],
          },
          relatedContent: [],
          prerequisites: [],
          followUpContent: [],
          version: '1.0.0',
          changelog: [],
        }

        setContent((prev) => [newContent, ...prev])

        // Track content creation
        helpAnalytics.trackHelpInteraction(
          newContent.id,
          helpState.sessionId,
          'content_create',
          'content_management',
          { type: newContent.type, format: newContent.format }
        )

        return newContent
      } catch (error) {
        console.error('Error creating content:', error)
        throw error
      }
    },
    [helpState]
  )

  const updateContent = useCallback(
    async (contentId: string, updates: Partial<HelpContent>) => {
      try {
        // TODO: Replace with actual API call
        setContent((prev) =>
          prev.map((item) =>
            item.id === contentId
              ? { ...item, ...updates, lastModifiedAt: new Date().toISOString() }
              : item
          )
        )

        // Track content update
        helpAnalytics.trackHelpInteraction(
          contentId,
          helpState.sessionId,
          'content_update',
          'content_management',
          { updatedFields: Object.keys(updates) }
        )
      } catch (error) {
        console.error('Error updating content:', error)
        throw error
      }
    },
    [helpState.sessionId]
  )

  const deleteContent = useCallback(
    async (contentId: string) => {
      try {
        // TODO: Replace with actual API call
        setContent((prev) => prev.filter((item) => item.id !== contentId))

        // Track content deletion
        helpAnalytics.trackHelpInteraction(
          contentId,
          helpState.sessionId,
          'content_delete',
          'content_management',
          {}
        )
      } catch (error) {
        console.error('Error deleting content:', error)
        throw error
      }
    },
    [helpState.sessionId]
  )

  const publishContent = useCallback(
    async (contentId: string) => {
      try {
        await updateContent(contentId, {
          status: 'published',
          publishedAt: new Date().toISOString(),
        })

        // Track content publication
        helpAnalytics.trackHelpInteraction(
          contentId,
          helpState.sessionId,
          'content_publish',
          'content_management',
          {}
        )
      } catch (error) {
        console.error('Error publishing content:', error)
        throw error
      }
    },
    [updateContent, helpState.sessionId]
  )

  // ========================
  // FILTERING AND SEARCH
  // ========================

  const filteredContent = useCallback(() => {
    let filtered = [...content]

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          item.keywords.some((keyword) => keyword.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory)
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === selectedStatus)
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((item) => item.type === selectedType)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'lastModified':
          return new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime()
        case 'views':
          return b.viewCount - a.viewCount
        case 'rating':
          return b.averageRating - a.averageRating
        default:
          return 0
      }
    })

    return filtered
  }, [content, searchQuery, selectedCategory, selectedStatus, selectedType, sortBy])

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    loadContent()
  }, [loadContent])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderContentCard = (item: HelpContent) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'published':
          return 'bg-green-100 text-green-800'
        case 'draft':
          return 'bg-gray-100 text-gray-800'
        case 'review':
          return 'bg-yellow-100 text-yellow-800'
        case 'archived':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'tutorial':
          return <PlayCircleIcon className='h-4 w-4' />
        case 'guide':
          return <BookOpenIcon className='h-4 w-4' />
        case 'documentation':
          return <FileTextIcon className='h-4 w-4' />
        default:
          return <FileTextIcon className='h-4 w-4' />
      }
    }

    return (
      <Card key={item.id} className='group transition-shadow hover:shadow-md'>
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <CardTitle className='mb-1 font-semibold text-lg'>{item.title}</CardTitle>
              <p className='mb-2 line-clamp-2 text-muted-foreground text-sm'>{item.description}</p>
            </div>

            <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
          </div>

          <div className='flex items-center space-x-4 text-muted-foreground text-sm'>
            <div className='flex items-center'>
              {getTypeIcon(item.type)}
              <span className='ml-1 capitalize'>{item.type}</span>
            </div>

            <div className='flex items-center'>
              <EyeIcon className='mr-1 h-4 w-4' />
              {item.viewCount.toLocaleString()}
            </div>

            {showAnalytics && (
              <div className='flex items-center'>
                <TrendingUpIcon className='mr-1 h-4 w-4' />
                {Math.round(item.completionRate * 100)}%
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className='pt-0'>
          {/* Tags */}
          <div className='mb-3 flex flex-wrap gap-1'>
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant='outline' className='text-xs'>
                <TagIcon className='mr-1 h-2 w-2' />
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant='outline' className='text-xs'>
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Metadata */}
          <div className='space-y-1 text-muted-foreground text-xs'>
            <div>Author: {item.author}</div>
            <div>Last modified: {new Date(item.lastModifiedAt).toLocaleDateString()}</div>
            {enableLocalization && Object.keys(item.translations).length > 0 && (
              <div className='flex items-center'>
                <GlobeIcon className='mr-1 h-3 w-3' />
                {Object.keys(item.translations).length + 1} languages
              </div>
            )}
          </div>

          {/* Actions */}
          <div className='mt-4 flex items-center justify-between border-t pt-3'>
            <div className='flex items-center space-x-2'>
              <Button variant='ghost' size='sm' onClick={() => setSelectedContent(item)}>
                <EyeIcon className='mr-1 h-4 w-4' />
                View
              </Button>

              <Button variant='ghost' size='sm'>
                <EditIcon className='mr-1 h-4 w-4' />
                Edit
              </Button>

              {enableCollaboration && (
                <Button variant='ghost' size='sm'>
                  <UserCheckIcon className='mr-1 h-4 w-4' />
                  Review
                </Button>
              )}
            </div>

            <div className='flex items-center space-x-2'>
              {item.status === 'draft' && (
                <Button variant='outline' size='sm' onClick={() => publishContent(item.id)}>
                  Publish
                </Button>
              )}

              {showAnalytics && (
                <Button variant='outline' size='sm'>
                  Analytics
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCreateContentDialog = () => (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className='mr-2 h-4 w-4' />
          Create Content
        </Button>
      </DialogTrigger>

      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='title'>Title</Label>
              <Input id='title' placeholder='Content title' />
            </div>

            <div>
              <Label htmlFor='type'>Content Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='tutorial'>Video Tutorial</SelectItem>
                  <SelectItem value='guide'>Interactive Guide</SelectItem>
                  <SelectItem value='documentation'>Documentation</SelectItem>
                  <SelectItem value='faq'>FAQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor='description'>Description</Label>
            <Textarea id='description' placeholder='Brief description of the content' />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='category'>Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder='Select category' />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='template'>Use Template</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder='Optional template' />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor='tags'>Tags</Label>
            <Input id='tags' placeholder='Comma-separated tags' />
          </div>

          {enableLocalization && (
            <div className='flex items-center space-x-2'>
              <Switch id='multilingual' />
              <Label htmlFor='multilingual'>Enable multi-language support</Label>
            </div>
          )}

          <div className='flex justify-end space-x-2'>
            <Button variant='outline' onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Implement content creation
                setIsCreateDialogOpen(false)
              }}
            >
              Create Content
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-2xl'>Help Content Manager</h1>
          <p className='text-muted-foreground'>Manage tutorials, guides, and documentation</p>
        </div>

        {renderCreateContentDialog()}
      </div>

      {/* Content Management Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
        <TabsList>
          <TabsTrigger value='content'>Content</TabsTrigger>
          <TabsTrigger value='categories'>Categories</TabsTrigger>
          {showAnalytics && <TabsTrigger value='analytics'>Analytics</TabsTrigger>}
          <TabsTrigger value='templates'>Templates</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value='content' className='space-y-6'>
          {/* Filters and Search */}
          <div className='flex flex-col gap-4 lg:flex-row'>
            <div className='flex-1'>
              <div className='relative'>
                <SearchIcon className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
                <Input
                  placeholder='Search content...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>

            <div className='flex gap-2'>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className='w-40'>
                  <SelectValue placeholder='Category' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='draft'>Draft</SelectItem>
                  <SelectItem value='review'>Review</SelectItem>
                  <SelectItem value='published'>Published</SelectItem>
                  <SelectItem value='archived'>Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='Type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Types</SelectItem>
                  <SelectItem value='tutorial'>Tutorial</SelectItem>
                  <SelectItem value='guide'>Guide</SelectItem>
                  <SelectItem value='documentation'>Docs</SelectItem>
                  <SelectItem value='faq'>FAQ</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className='w-40'>
                  <SelectValue placeholder='Sort by' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='lastModified'>Last Modified</SelectItem>
                  <SelectItem value='created'>Created</SelectItem>
                  <SelectItem value='title'>Title</SelectItem>
                  <SelectItem value='views'>Views</SelectItem>
                  <SelectItem value='rating'>Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Grid */}
          {isLoading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent' />
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {filteredContent().map(renderContentCard)}
            </div>
          )}

          {filteredContent().length === 0 && !isLoading && (
            <div className='py-12 text-center'>
              <FolderIcon className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
              <h3 className='font-semibold text-lg text-muted-foreground'>No content found</h3>
              <p className='text-muted-foreground'>
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first piece of content to get started'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value='categories' className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className='flex items-center text-lg'>
                    <div
                      className={`mr-3 flex h-8 w-8 items-center justify-center rounded-md bg-${category.color}-100`}
                    >
                      <FolderIcon className={`h-4 w-4 text-${category.color}-600`} />
                    </div>
                    {category.name}
                  </CardTitle>
                  <p className='text-muted-foreground text-sm'>{category.description}</p>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground text-sm'>
                      {category.contentCount} items
                    </span>
                    <Button variant='ghost' size='sm'>
                      <EditIcon className='h-4 w-4' />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        {showAnalytics && (
          <TabsContent value='analytics' className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='font-medium text-sm'>Total Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='font-bold text-2xl'>{content.length}</div>
                  <p className='text-muted-foreground text-xs'>+2 from last week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='font-medium text-sm'>Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='font-bold text-2xl'>
                    {content.reduce((sum, item) => sum + item.viewCount, 0).toLocaleString()}
                  </div>
                  <p className='text-muted-foreground text-xs'>+15% from last week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='font-medium text-sm'>Avg. Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='font-bold text-2xl'>
                    {Math.round(
                      (content.reduce((sum, item) => sum + item.completionRate, 0) /
                        content.length) *
                        100
                    )}
                    %
                  </div>
                  <p className='text-muted-foreground text-xs'>+3% from last week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='font-medium text-sm'>Avg. Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='font-bold text-2xl'>
                    {(
                      content.reduce((sum, item) => sum + item.averageRating, 0) / content.length
                    ).toFixed(1)}
                  </div>
                  <p className='text-muted-foreground text-xs'>+0.2 from last week</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Templates Tab */}
        <TabsContent value='templates' className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className='text-lg'>{template.name}</CardTitle>
                  <p className='text-muted-foreground text-sm'>{template.description}</p>
                </CardHeader>
                <CardContent>
                  <Badge className='mb-3'>{template.type}</Badge>
                  <div className='text-sm'>
                    <strong>Sections:</strong>
                    <ul className='mt-1 space-y-1'>
                      {template.structure.sections.map((section, index) => (
                        <li key={index} className='flex items-center'>
                          <span
                            className={section.required ? 'font-medium' : 'text-muted-foreground'}
                          >
                            {section.name}
                          </span>
                          {section.required && (
                            <Badge variant='outline' className='ml-2 text-xs'>
                              Required
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ========================
// EXPORTS
// ========================

export default HelpContentManager
export type {
  HelpContent,
  HelpContentData,
  ContentCategory,
  ContentTemplate,
  ContentAnalytics,
  HelpContentManagerProps,
}
