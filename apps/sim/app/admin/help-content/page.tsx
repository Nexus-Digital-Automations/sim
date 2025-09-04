/**
 * Help Content Management System - Main Admin Dashboard
 *
 * Based on research report requirements for comprehensive content management
 * Features: Rich text editing, multimedia support, versioning, collaboration
 * Compliance: WCAG 2.2 AA accessibility standards
 *
 * @author Claude Code
 * @version 1.0.0
 */

'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { AccessibilityChecker } from './components/accessibility/accessibility-checker'
import { ContentAnalytics } from './components/analytics/content-analytics'
import { CollaborationPanel } from './components/collaboration/collaboration-panel'
import { ContentEditor } from './components/content-editor/content-editor'
import { ContentList } from './components/content-list/content-list'
import { MediaManager } from './components/media/media-manager'
import { PerformanceMonitor } from './components/monitoring/performance-monitor'
import { WorkflowManager } from './components/workflow/workflow-manager'

// Content management interfaces based on research specifications
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
  }
  collaborators: Array<{
    id: string
    name: string
    role: 'editor' | 'reviewer' | 'approver'
  }>
  versions: Array<{
    id: string
    version: string
    content: string
    changes: string
    createdAt: Date
    createdBy: string
  }>
  analytics: {
    views: number
    engagement: number
    helpfulness: number
    completionRate: number
    searchRanking: number
  }
  accessibility: {
    wcagCompliance: 'A' | 'AA' | 'AAA'
    issues: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      fix: string
    }>
  }
  multimedia: {
    images: Array<{
      id: string
      url: string
      alt: string
      caption?: string
    }>
    videos: Array<{
      id: string
      url: string
      title: string
      duration: number
      transcript?: string
    }>
    interactive: Array<{
      id: string
      type: 'demo' | 'tutorial' | 'sandbox'
      config: Record<string, any>
    }>
  }
  seo: {
    metaTitle: string
    metaDescription: string
    keywords: string[]
    slug: string
  }
  localization: {
    defaultLanguage: string
    translations: Record<
      string,
      {
        title: string
        content: string
        status: 'pending' | 'complete'
      }
    >
  }
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

interface DashboardStats {
  totalContent: number
  publishedContent: number
  draftContent: number
  pendingReview: number
  viewsThisMonth: number
  engagementRate: number
  avgCompletionRate: number
  topPerformingContent: ContentItem[]
  accessibilityScore: number
  collaborativeEdits: number
}

/**
 * Main Help Content Management Dashboard
 * Implements enterprise-grade content management with AI-powered assistance
 */
export default function HelpContentManagementPage() {
  // State management for comprehensive content operations
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'content' | 'editor' | 'analytics' | 'collaboration' | 'workflow' | 'media'
  >('dashboard')
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load dashboard data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch content items with comprehensive metadata
        const contentResponse = await fetch('/api/help/content', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!contentResponse.ok) {
          throw new Error(`Failed to load content: ${contentResponse.statusText}`)
        }

        const contentData = await contentResponse.json()
        setContentItems(contentData.items || [])

        // Fetch dashboard analytics
        const analyticsResponse = await fetch('/api/help/analytics', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!analyticsResponse.ok) {
          throw new Error(`Failed to load analytics: ${analyticsResponse.statusText}`)
        }

        const analyticsData = await analyticsResponse.json()
        setDashboardStats(analyticsData.stats)

        console.log('✅ Dashboard data loaded successfully', {
          contentCount: contentData.items?.length || 0,
          analyticsLoaded: !!analyticsData.stats,
        })
      } catch (error) {
        console.error('❌ Failed to load dashboard data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Filter content based on search and filters
  const filteredContent = useMemo(() => {
    return contentItems.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [contentItems, searchQuery, selectedCategory, selectedStatus])

  // Get unique categories and statuses for filters
  const categories = useMemo(() => {
    const uniqueCategories = new Set(contentItems.map((item) => item.category))
    return Array.from(uniqueCategories).sort()
  }, [contentItems])

  const statuses = useMemo(() => {
    return ['draft', 'review', 'approved', 'published', 'archived']
  }, [])

  // Handle content creation
  const handleCreateContent = useCallback(async (contentData: Partial<ContentItem>) => {
    try {
      const response = await fetch('/api/help/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...contentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create content: ${response.statusText}`)
      }

      const newContent = await response.json()
      setContentItems((prev) => [newContent, ...prev])
      setActiveTab('editor')
      setSelectedContent(newContent)
      setIsEditing(true)

      console.log('✅ Content created successfully', { id: newContent.id })
    } catch (error) {
      console.error('❌ Failed to create content:', error)
      setError(error instanceof Error ? error.message : 'Failed to create content')
    }
  }, [])

  // Handle content update
  const handleUpdateContent = useCallback(
    async (contentId: string, updates: Partial<ContentItem>) => {
      try {
        const response = await fetch(`/api/help/content/${contentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...updates,
            updatedAt: new Date(),
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to update content: ${response.statusText}`)
        }

        const updatedContent = await response.json()
        setContentItems((prev) =>
          prev.map((item) => (item.id === contentId ? updatedContent : item))
        )

        if (selectedContent?.id === contentId) {
          setSelectedContent(updatedContent)
        }

        console.log('✅ Content updated successfully', { id: contentId })
      } catch (error) {
        console.error('❌ Failed to update content:', error)
        setError(error instanceof Error ? error.message : 'Failed to update content')
      }
    },
    [selectedContent]
  )

  // Handle content deletion
  const handleDeleteContent = useCallback(
    async (contentId: string) => {
      if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
        return
      }

      try {
        const response = await fetch(`/api/help/content/${contentId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error(`Failed to delete content: ${response.statusText}`)
        }

        setContentItems((prev) => prev.filter((item) => item.id !== contentId))

        if (selectedContent?.id === contentId) {
          setSelectedContent(null)
          setIsEditing(false)
        }

        console.log('✅ Content deleted successfully', { id: contentId })
      } catch (error) {
        console.error('❌ Failed to delete content:', error)
        setError(error instanceof Error ? error.message : 'Failed to delete content')
      }
    },
    [selectedContent]
  )

  // Dashboard overview statistics
  const DashboardOverview = () => (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='font-bold text-2xl text-gray-900'>Content Management Dashboard</h2>
        <button
          onClick={() =>
            handleCreateContent({
              title: 'New Help Article',
              type: 'article',
              status: 'draft',
              category: 'general',
              tags: [],
              content: '',
            })
          }
          className='inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          aria-label='Create new content'
        >
          <PlusIcon className='mr-2 h-5 w-5' />
          Create Content
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
          <div className='flex items-center'>
            <DocumentTextIcon className='h-8 w-8 text-blue-600' />
            <div className='ml-4'>
              <p className='font-medium text-gray-600 text-sm'>Total Content</p>
              <p className='font-bold text-2xl text-gray-900'>
                {dashboardStats?.totalContent || 0}
              </p>
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
          <div className='flex items-center'>
            <CheckCircleIcon className='h-8 w-8 text-green-600' />
            <div className='ml-4'>
              <p className='font-medium text-gray-600 text-sm'>Published</p>
              <p className='font-bold text-2xl text-gray-900'>
                {dashboardStats?.publishedContent || 0}
              </p>
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
          <div className='flex items-center'>
            <EyeIcon className='h-8 w-8 text-purple-600' />
            <div className='ml-4'>
              <p className='font-medium text-gray-600 text-sm'>Views This Month</p>
              <p className='font-bold text-2xl text-gray-900'>
                {dashboardStats?.viewsThisMonth?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow'>
          <div className='flex items-center'>
            <ChartBarIcon className='h-8 w-8 text-orange-600' />
            <div className='ml-4'>
              <p className='font-medium text-gray-600 text-sm'>Engagement Rate</p>
              <p className='font-bold text-2xl text-gray-900'>
                {dashboardStats?.engagementRate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Status Overview */}
      <div className='rounded-lg border border-gray-200 bg-white shadow'>
        <div className='border-gray-200 border-b px-6 py-4'>
          <h3 className='font-medium text-gray-900 text-lg'>Content Status Overview</h3>
        </div>
        <div className='p-6'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5'>
            {statuses.map((status) => {
              const count = contentItems.filter((item) => item.status === status).length
              const color =
                {
                  draft: 'text-gray-600 bg-gray-100',
                  review: 'text-yellow-600 bg-yellow-100',
                  approved: 'text-blue-600 bg-blue-100',
                  published: 'text-green-600 bg-green-100',
                  archived: 'text-red-600 bg-red-100',
                }[status] || 'text-gray-600 bg-gray-100'

              return (
                <div key={status} className='text-center'>
                  <div
                    className={`inline-flex items-center rounded-full px-3 py-1 font-medium text-sm ${color} mb-2`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                  <p className='font-bold text-2xl text-gray-900'>{count}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className='rounded-lg border border-gray-200 bg-white shadow'>
        <div className='border-gray-200 border-b px-6 py-4'>
          <h3 className='font-medium text-gray-900 text-lg'>Recent Activity</h3>
        </div>
        <div className='p-6'>
          <div className='space-y-4'>
            {contentItems
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 5)
              .map((item) => (
                <div
                  key={item.id}
                  className='flex items-center justify-between border-gray-100 border-b py-3 last:border-b-0'
                >
                  <div className='flex items-center'>
                    <DocumentTextIcon className='mr-3 h-5 w-5 text-gray-400' />
                    <div>
                      <p className='font-medium text-gray-900 text-sm'>{item.title}</p>
                      <p className='text-gray-500 text-xs'>
                        Updated {new Date(item.updatedAt).toLocaleDateString()} by{' '}
                        {item.author.name}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
                      item.status === 'published'
                        ? 'bg-green-100 text-green-600'
                        : item.status === 'review'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='flex h-64 items-center justify-center'>
          <div className='h-12 w-12 animate-spin rounded-full border-blue-600 border-b-2' />
          <span className='ml-3 text-gray-600 text-lg'>Loading content management system...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='flex h-64 items-center justify-center'>
          <div className='text-center'>
            <ExclamationCircleIcon className='mx-auto mb-4 h-12 w-12 text-red-500' />
            <h2 className='mb-2 font-medium text-gray-900 text-lg'>Error Loading Dashboard</h2>
            <p className='mb-4 text-gray-600 text-sm'>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className='inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='border-gray-200 border-b bg-white shadow'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between py-6'>
            <div className='flex items-center'>
              <DocumentTextIcon className='mr-3 h-8 w-8 text-blue-600' />
              <h1 className='font-bold text-2xl text-gray-900'>Help Content Management</h1>
            </div>

            {/* Search Bar */}
            <div className='flex items-center space-x-4'>
              <div className='relative'>
                <MagnifyingGlassIcon className='-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 transform text-gray-400' />
                <input
                  type='text'
                  placeholder='Search content...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className='flex space-x-8 border-gray-200 border-b'>
            {[
              { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
              { id: 'content', name: 'Content Library', icon: DocumentTextIcon },
              { id: 'editor', name: 'Content Editor', icon: PencilIcon },
              { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
              { id: 'collaboration', name: 'Collaboration', icon: UsersIcon },
              { id: 'workflow', name: 'Workflow', icon: ClockIcon },
              { id: 'media', name: 'Media Library', icon: PhotoIcon },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center border-b-2 px-1 py-4 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className='mr-2 h-5 w-5' />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <Suspense
          fallback={
            <div className='flex h-64 items-center justify-center'>
              <div className='h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2' />
            </div>
          }
        >
          {activeTab === 'dashboard' && <DashboardOverview />}

          {activeTab === 'content' && (
            <ContentList
              content={filteredContent}
              categories={categories}
              statuses={statuses}
              selectedCategory={selectedCategory}
              selectedStatus={selectedStatus}
              onCategoryChange={setSelectedCategory}
              onStatusChange={setSelectedStatus}
              onEdit={(content) => {
                setSelectedContent(content)
                setIsEditing(true)
                setActiveTab('editor')
              }}
              onDelete={handleDeleteContent}
              onDuplicate={(content) =>
                handleCreateContent({
                  ...content,
                  title: `${content.title} (Copy)`,
                  id: undefined,
                  status: 'draft',
                })
              }
            />
          )}

          {activeTab === 'editor' && (
            <ContentEditor
              content={selectedContent}
              isEditing={isEditing}
              onSave={handleUpdateContent}
              onCancel={() => {
                setIsEditing(false)
                setSelectedContent(null)
              }}
              onPublish={async (contentId) => {
                await handleUpdateContent(contentId, {
                  status: 'published',
                  publishedAt: new Date(),
                })
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <ContentAnalytics content={contentItems} stats={dashboardStats} />
          )}

          {activeTab === 'collaboration' && (
            <CollaborationPanel
              content={contentItems}
              onAssignCollaborator={async (contentId, collaborator) => {
                const content = contentItems.find((item) => item.id === contentId)
                if (content) {
                  const updatedCollaborators = [...content.collaborators, collaborator]
                  await handleUpdateContent(contentId, { collaborators: updatedCollaborators })
                }
              }}
            />
          )}

          {activeTab === 'workflow' && (
            <WorkflowManager
              content={contentItems}
              onStatusChange={async (contentId, status) => {
                await handleUpdateContent(contentId, { status })
              }}
            />
          )}

          {activeTab === 'media' && (
            <MediaManager
              onMediaSelect={(media) => {
                // Handle media selection for content
                console.log('Media selected:', media)
              }}
            />
          )}
        </Suspense>
      </main>

      {/* Performance Monitor */}
      <PerformanceMonitor />

      {/* Accessibility Checker */}
      <AccessibilityChecker />
    </div>
  )
}
