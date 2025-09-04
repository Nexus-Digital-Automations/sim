/**
 * Documentation Manager - Content authoring and management interface
 *
 * Comprehensive documentation management system:
 * - Content authoring and editing interface
 * - Documentation versioning and updates
 * - Performance optimization for large content sets
 * - Search and discovery within documentation
 * - Usage analytics and engagement tracking
 * - Collaborative editing and review workflows
 * - Publication and deployment management
 *
 * @created 2025-09-04
 * @author Claude Development System
 * @version 1.0.0
 */

'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  BookOpenIcon,
  CheckCircleIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  GitBranchIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  TrendingUpIcon,
  UploadIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface DocumentationEntry {
  id: string
  title: string
  content: string
  type: 'guide' | 'reference' | 'tutorial' | 'example' | 'troubleshooting' | 'api'
  category: string
  tags: string[]
  status: 'draft' | 'review' | 'published' | 'archived'
  version: {
    current: string
    history: VersionEntry[]
  }
  author: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  metadata: {
    createdAt: Date
    updatedAt: Date
    publishedAt?: Date
    reviewedAt?: Date
    wordCount: number
    estimatedReadTime: number
  }
  analytics: {
    views: number
    uniqueViews: number
    engagement: {
      averageTimeOnPage: number
      bounceRate: number
      completionRate: number
    }
    feedback: {
      helpful: number
      notHelpful: number
      comments: FeedbackComment[]
    }
  }
  seo: {
    metaDescription?: string
    keywords: string[]
    slug: string
  }
  collaboration: {
    reviewers: string[]
    contributors: string[]
    comments: CollaborationComment[]
  }
}

export interface VersionEntry {
  version: string
  content: string
  author: string
  timestamp: Date
  changes: string[]
  published: boolean
}

export interface FeedbackComment {
  id: string
  author: {
    name: string
    email: string
  }
  content: string
  rating?: number
  timestamp: Date
  helpful: boolean
}

export interface CollaborationComment {
  id: string
  author: string
  content: string
  timestamp: Date
  resolved: boolean
  line?: number
  type: 'comment' | 'suggestion' | 'approval' | 'change_request'
}

export interface DocumentationManagerProps {
  className?: string
  onEntryEdit?: (entry: DocumentationEntry) => void
  onEntryDelete?: (entryId: string) => void
  onEntryPublish?: (entryId: string) => void
  onAnalyticsView?: (entryId: string) => void
}

// ========================
// SAMPLE DATA (In real app, this would come from API)
// ========================

const sampleEntries: DocumentationEntry[] = [
  {
    id: 'entry-1',
    title: 'Getting Started with Workflow Builder',
    content: '# Getting Started\n\nThis guide will help you...',
    type: 'guide',
    category: 'Basics',
    tags: ['beginner', 'workflow', 'tutorial'],
    status: 'published',
    version: {
      current: '2.1.0',
      history: [
        {
          version: '2.1.0',
          content: '# Getting Started\n\nThis guide will help you...',
          author: 'john-doe',
          timestamp: new Date('2025-01-15'),
          changes: ['Updated screenshots', 'Added new features'],
          published: true,
        },
        {
          version: '2.0.0',
          content: '# Getting Started\n\nOlder content...',
          author: 'jane-smith',
          timestamp: new Date('2024-12-01'),
          changes: ['Major rewrite', 'Improved structure'],
          published: true,
        },
      ],
    },
    author: {
      id: 'john-doe',
      name: 'John Doe',
      email: 'john@example.com',
    },
    metadata: {
      createdAt: new Date('2024-10-01'),
      updatedAt: new Date('2025-01-15'),
      publishedAt: new Date('2025-01-15'),
      wordCount: 2500,
      estimatedReadTime: 600, // seconds
    },
    analytics: {
      views: 1250,
      uniqueViews: 890,
      engagement: {
        averageTimeOnPage: 320,
        bounceRate: 0.25,
        completionRate: 0.78,
      },
      feedback: {
        helpful: 45,
        notHelpful: 3,
        comments: [],
      },
    },
    seo: {
      metaDescription: 'Learn how to build your first workflow with our comprehensive guide.',
      keywords: ['workflow', 'builder', 'tutorial', 'getting started'],
      slug: 'getting-started-workflow-builder',
    },
    collaboration: {
      reviewers: ['jane-smith', 'bob-wilson'],
      contributors: ['john-doe'],
      comments: [],
    },
  },
  // Add more sample entries...
]

// ========================
// UTILITY FUNCTIONS
// ========================

const getStatusColor = (status: DocumentationEntry['status']) => {
  switch (status) {
    case 'draft':
      return 'text-gray-500 bg-gray-100 dark:bg-gray-800'
    case 'review':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900'
    case 'published':
      return 'text-green-600 bg-green-100 dark:bg-green-900'
    case 'archived':
      return 'text-red-500 bg-red-100 dark:bg-red-900'
    default:
      return 'text-gray-500 bg-gray-100 dark:bg-gray-800'
  }
}

const getTypeIcon = (type: DocumentationEntry['type']) => {
  switch (type) {
    case 'guide':
      return <BookOpenIcon className='h-4 w-4' />
    case 'reference':
      return <FileTextIcon className='h-4 w-4' />
    case 'tutorial':
      return <EditIcon className='h-4 w-4' />
    case 'example':
      return <FolderIcon className='h-4 w-4' />
    case 'troubleshooting':
      return <SettingsIcon className='h-4 w-4' />
    case 'api':
      return <GitBranchIcon className='h-4 w-4' />
    default:
      return <FileTextIcon className='h-4 w-4' />
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatReadTime = (seconds: number) => {
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} min read`
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Documentation Manager Component
 *
 * Comprehensive documentation management interface with analytics and collaboration.
 */
export function DocumentationManager({
  className,
  onEntryEdit,
  onEntryDelete,
  onEntryPublish,
  onAnalyticsView,
}: DocumentationManagerProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [entries, setEntries] = useState<DocumentationEntry[]>(sampleEntries)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'views' | 'title'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTab, setSelectedTab] = useState('content')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // ========================
  // COMPUTED VALUES
  // ========================

  const categories = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.category)))
  }, [entries])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = entry.title.toLowerCase().includes(query)
        const matchesContent = entry.content.toLowerCase().includes(query)
        const matchesTags = entry.tags.some((tag) => tag.toLowerCase().includes(query))
        const matchesCategory = entry.category.toLowerCase().includes(query)

        if (!matchesTitle && !matchesContent && !matchesTags && !matchesCategory) {
          return false
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'all' && entry.status !== selectedStatus) {
        return false
      }

      // Type filter
      if (selectedType !== 'all' && entry.type !== selectedType) {
        return false
      }

      return true
    })
  }, [entries, searchQuery, selectedCategory, selectedStatus, selectedType])

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'updated':
          compareValue = a.metadata.updatedAt.getTime() - b.metadata.updatedAt.getTime()
          break
        case 'created':
          compareValue = a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime()
          break
        case 'views':
          compareValue = a.analytics.views - b.analytics.views
          break
        case 'title':
          compareValue = a.title.localeCompare(b.title)
          break
      }

      return sortOrder === 'desc' ? -compareValue : compareValue
    })
  }, [filteredEntries, sortBy, sortOrder])

  const analytics = useMemo(() => {
    const totalEntries = entries.length
    const publishedEntries = entries.filter((e) => e.status === 'published').length
    const draftEntries = entries.filter((e) => e.status === 'draft').length
    const totalViews = entries.reduce((sum, e) => sum + e.analytics.views, 0)
    const averageEngagement =
      entries.reduce((sum, e) => sum + e.analytics.engagement.completionRate, 0) / entries.length

    return {
      totalEntries,
      publishedEntries,
      draftEntries,
      totalViews,
      averageEngagement,
    }
  }, [entries])

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)

      if (query) {
        helpAnalytics.trackHelpInteraction(
          'documentation-manager',
          helpState.sessionId,
          'search',
          query
        )
      }
    },
    [helpState.sessionId]
  )

  const handleEntryEdit = useCallback(
    (entry: DocumentationEntry) => {
      trackInteraction('documentation_edit', entry.id, {
        type: entry.type,
        status: entry.status,
      })

      onEntryEdit?.(entry)
    },
    [trackInteraction, onEntryEdit]
  )

  const handleEntryDelete = useCallback(
    (entryId: string) => {
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) return

      trackInteraction('documentation_delete', entryId, {
        type: entry.type,
        status: entry.status,
      })

      setEntries((prev) => prev.filter((e) => e.id !== entryId))
      onEntryDelete?.(entryId)
    },
    [entries, trackInteraction, onEntryDelete]
  )

  const handleEntryPublish = useCallback(
    (entryId: string) => {
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) return

      trackInteraction('documentation_publish', entryId, {
        type: entry.type,
        previousStatus: entry.status,
      })

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                status: 'published' as const,
                metadata: {
                  ...e.metadata,
                  publishedAt: new Date(),
                },
              }
            : e
        )
      )

      onEntryPublish?.(entryId)
    },
    [entries, trackInteraction, onEntryPublish]
  )

  const handleAnalyticsView = useCallback(
    (entryId: string) => {
      trackInteraction('documentation_analytics_view', entryId)
      onAnalyticsView?.(entryId)
    },
    [trackInteraction, onAnalyticsView]
  )

  // ========================
  // RENDER HELPERS
  // ========================

  const renderAnalyticsSummary = () => {
    return (
      <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-5'>
        <Card className='p-4'>
          <div className='mb-2 flex items-center gap-2'>
            <FileTextIcon className='h-4 w-4 text-muted-foreground' />
            <span className='font-medium text-sm'>Total Entries</span>
          </div>
          <div className='font-bold text-2xl'>{analytics.totalEntries}</div>
        </Card>

        <Card className='p-4'>
          <div className='mb-2 flex items-center gap-2'>
            <CheckCircleIcon className='h-4 w-4 text-green-600' />
            <span className='font-medium text-sm'>Published</span>
          </div>
          <div className='font-bold text-2xl text-green-600'>{analytics.publishedEntries}</div>
        </Card>

        <Card className='p-4'>
          <div className='mb-2 flex items-center gap-2'>
            <EditIcon className='h-4 w-4 text-yellow-600' />
            <span className='font-medium text-sm'>Drafts</span>
          </div>
          <div className='font-bold text-2xl text-yellow-600'>{analytics.draftEntries}</div>
        </Card>

        <Card className='p-4'>
          <div className='mb-2 flex items-center gap-2'>
            <EyeIcon className='h-4 w-4 text-blue-600' />
            <span className='font-medium text-sm'>Total Views</span>
          </div>
          <div className='font-bold text-2xl text-blue-600'>
            {analytics.totalViews.toLocaleString()}
          </div>
        </Card>

        <Card className='p-4'>
          <div className='mb-2 flex items-center gap-2'>
            <TrendingUpIcon className='h-4 w-4 text-purple-600' />
            <span className='font-medium text-sm'>Avg. Engagement</span>
          </div>
          <div className='font-bold text-2xl text-purple-600'>
            {Math.round(analytics.averageEngagement * 100)}%
          </div>
        </Card>
      </div>
    )
  }

  const renderFilters = () => {
    return (
      <div className='mb-4 flex flex-wrap gap-3'>
        <div className='relative min-w-64 flex-1'>
          <SearchIcon className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
          <Input
            placeholder='Search documentation...'
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className='pl-10'
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className='w-40'>
            <SelectValue placeholder='Category' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
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
            <SelectItem value='guide'>Guide</SelectItem>
            <SelectItem value='reference'>Reference</SelectItem>
            <SelectItem value='tutorial'>Tutorial</SelectItem>
            <SelectItem value='example'>Example</SelectItem>
            <SelectItem value='troubleshooting'>Troubleshooting</SelectItem>
            <SelectItem value='api'>API</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
          <SelectTrigger className='w-32'>
            <SelectValue placeholder='Sort by' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='updated'>Updated</SelectItem>
            <SelectItem value='created'>Created</SelectItem>
            <SelectItem value='views'>Views</SelectItem>
            <SelectItem value='title'>Title</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant='outline'
          size='sm'
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>
    )
  }

  const renderEntryRow = (entry: DocumentationEntry) => {
    return (
      <TableRow key={entry.id}>
        <TableCell className='font-medium'>
          <div className='flex items-center gap-2'>
            {getTypeIcon(entry.type)}
            <div>
              <div className='font-medium'>{entry.title}</div>
              <div className='text-muted-foreground text-sm'>{entry.category}</div>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <Badge className={cn('text-xs', getStatusColor(entry.status))}>{entry.status}</Badge>
        </TableCell>

        <TableCell className='text-muted-foreground text-sm'>{entry.author.name}</TableCell>

        <TableCell className='text-muted-foreground text-sm'>
          {formatDate(entry.metadata.updatedAt)}
        </TableCell>

        <TableCell className='text-muted-foreground text-sm'>
          <div className='flex items-center gap-1'>
            <EyeIcon className='h-3 w-3' />
            {entry.analytics.views}
          </div>
        </TableCell>

        <TableCell className='text-muted-foreground text-sm'>
          {Math.round(entry.analytics.engagement.completionRate * 100)}%
        </TableCell>

        <TableCell className='text-muted-foreground text-sm'>v{entry.version.current}</TableCell>

        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                <MoreVerticalIcon className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => handleEntryEdit(entry)}>
                  <EditIcon className='mr-2 h-4 w-4' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAnalyticsView(entry.id)}>
                  <TrendingUpIcon className='mr-2 h-4 w-4' />
                  Analytics
                </DropdownMenuItem>
                {entry.status !== 'published' && (
                  <DropdownMenuItem onClick={() => handleEntryPublish(entry.id)}>
                    <UploadIcon className='mr-2 h-4 w-4' />
                    Publish
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleEntryDelete(entry.id)}
                className='text-red-600'
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  const renderContentTable = () => {
    return (
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className='w-12' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.length > 0 ? (
              sortedEntries.map(renderEntryRow)
            ) : (
              <TableRow>
                <TableCell colSpan={8} className='py-8 text-center text-muted-foreground'>
                  No documentation entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderAnalyticsDetail = () => {
    // This would show detailed analytics for all entries
    return (
      <div className='space-y-6'>
        <Card className='p-6'>
          <h3 className='mb-4 font-semibold'>Content Performance</h3>
          <div className='space-y-4'>
            {sortedEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  {getTypeIcon(entry.type)}
                  <div>
                    <div className='font-medium text-sm'>{entry.title}</div>
                    <div className='text-muted-foreground text-xs'>{entry.category}</div>
                  </div>
                </div>
                <div className='flex items-center gap-4 text-sm'>
                  <div className='text-center'>
                    <div className='font-medium'>{entry.analytics.views}</div>
                    <div className='text-muted-foreground text-xs'>views</div>
                  </div>
                  <div className='text-center'>
                    <div className='font-medium'>
                      {Math.round(entry.analytics.engagement.completionRate * 100)}%
                    </div>
                    <div className='text-muted-foreground text-xs'>completion</div>
                  </div>
                  <div className='text-center'>
                    <div className='font-medium'>{entry.analytics.feedback.helpful}</div>
                    <div className='text-muted-foreground text-xs'>helpful</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-2xl'>Documentation Manager</h1>
          <p className='text-muted-foreground'>Manage and analyze your documentation content</p>
        </div>

        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm'>
            <UploadIcon className='mr-2 h-4 w-4' />
            Import
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className='mr-2 h-4 w-4' />
            New Entry
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      {renderAnalyticsSummary()}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='content'>Content</TabsTrigger>
          <TabsTrigger value='analytics'>Analytics</TabsTrigger>
          <TabsTrigger value='collaboration'>Collaboration</TabsTrigger>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
        </TabsList>

        <TabsContent value='content' className='space-y-4'>
          {renderFilters()}
          {renderContentTable()}
        </TabsContent>

        <TabsContent value='analytics' className='space-y-4'>
          {renderAnalyticsDetail()}
        </TabsContent>

        <TabsContent value='collaboration' className='space-y-4'>
          <Card className='p-6'>
            <h3 className='mb-4 font-semibold'>Collaboration Features</h3>
            <p className='text-muted-foreground'>
              Collaboration features will be implemented here, including:
            </p>
            <ul className='mt-2 list-inside list-disc space-y-1 text-muted-foreground text-sm'>
              <li>Real-time collaborative editing</li>
              <li>Review and approval workflows</li>
              <li>Comment and suggestion system</li>
              <li>Version control and branching</li>
              <li>Team permissions and roles</li>
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value='settings' className='space-y-4'>
          <Card className='p-6'>
            <h3 className='mb-4 font-semibold'>Documentation Settings</h3>
            <div className='space-y-4'>
              <div>
                <Label className='font-medium text-sm'>Default Author</Label>
                <Input className='mt-1' placeholder='Enter default author name' />
              </div>
              <div>
                <Label className='font-medium text-sm'>Publication Workflow</Label>
                <Select>
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='Select workflow type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='direct'>Direct Publishing</SelectItem>
                    <SelectItem value='review'>Review Required</SelectItem>
                    <SelectItem value='approval'>Approval Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='font-medium text-sm'>SEO Settings</Label>
                <div className='mt-1 space-y-2'>
                  <Input placeholder='Default meta description template' />
                  <Textarea placeholder='Default keywords (comma-separated)' />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ========================
// EXPORTS
// ========================

export default DocumentationManager
export type {
  DocumentationManagerProps,
  DocumentationEntry,
  VersionEntry,
  FeedbackComment,
  CollaborationComment,
}
