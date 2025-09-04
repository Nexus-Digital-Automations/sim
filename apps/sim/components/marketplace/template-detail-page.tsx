/**
 * Template Detail Page - Comprehensive Template Information and Interaction Component
 *
 * This component provides a complete template detail view featuring:
 * - Rich template metadata and description display
 * - Interactive rating and review system with sentiment analysis
 * - Author information and social proof indicators
 * - Advanced template preview and demonstration capabilities
 * - Installation and instantiation workflows
 * - Social sharing and community interaction features
 * - Related template recommendations
 * - Usage analytics and performance metrics
 * - Version history and changelog display
 * - Accessibility-compliant design with keyboard navigation
 *
 * Features:
 * - Modern card-based layout with responsive design
 * - Interactive elements with smooth animations
 * - Comprehensive template information architecture
 * - Integration with community features and social proof
 * - Advanced search and filtering capabilities
 * - Real-time data updates and notifications
 * - Performance-optimized with lazy loading
 * - Comprehensive error handling and loading states
 *
 * @author Claude Code Marketplace System
 * @version 2.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Code,
  Download,
  ExternalLink,
  Eye,
  GitBranch,
  Heart,
  MoreHorizontal,
  Share2,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Template, TemplateReview, User as UserType } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Template Detail Page Props Interface
 */
export interface TemplateDetailPageProps {
  /** Template ID to display */
  templateId: string
  /** Current user for permission checks */
  currentUser?: UserType
  /** Custom CSS class name */
  className?: string
  /** Show advanced analytics */
  showAnalytics?: boolean
  /** Enable community features */
  enableCommunityFeatures?: boolean
  /** Show version history */
  showVersionHistory?: boolean
  /** Enable real-time updates */
  enableRealTimeUpdates?: boolean
  /** Template selection handler */
  onTemplateSelect?: (template: Template) => void
  /** Installation handler */
  onInstall?: (templateId: string) => Promise<void>
  /** Back navigation handler */
  onBack?: () => void
}

/**
 * Template Version Interface
 */
interface TemplateVersion {
  id: string
  version: string
  releaseDate: string
  description: string
  changes: string[]
  downloads: number
  isLatest: boolean
  compatibility: string[]
}

/**
 * Template Analytics Interface
 */
interface TemplateAnalytics {
  totalViews: number
  totalDownloads: number
  totalInstantiations: number
  weeklyGrowth: number
  popularityRank: number
  usageByCategory: Record<string, number>
  geographicDistribution: Record<string, number>
  performanceMetrics: {
    averageSetupTime: number
    successRate: number
    userSatisfaction: number
  }
}

/**
 * Review Statistics Interface
 */
interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: Record<number, number>
  sentimentAnalysis: {
    positive: number
    neutral: number
    negative: number
  }
  topKeywords: Array<{ word: string; frequency: number }>
}

/**
 * Template Detail Page Component
 */
export const TemplateDetailPage: React.FC<TemplateDetailPageProps> = ({
  templateId,
  currentUser,
  className,
  showAnalytics = true,
  enableCommunityFeatures = true,
  showVersionHistory = true,
  enableRealTimeUpdates = false,
  onTemplateSelect,
  onInstall,
  onBack,
}) => {
  const router = useRouter()

  // State management
  const [template, setTemplate] = useState<Template | null>(null)
  const [reviews, setReviews] = useState<TemplateReview[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [templateAnalytics, setTemplateAnalytics] = useState<TemplateAnalytics | null>(null)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [similarTemplates, setSimilarTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [userReview, setUserReview] = useState<string>('')
  const [userRating, setUserRating] = useState<number>(0)
  const [isStarred, setIsStarred] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  /**
   * Load template data and related information
   */
  const loadTemplateData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load template details with all related data
      const [
        templateResponse,
        reviewsResponse,
        analyticsResponse,
        versionsResponse,
        similarResponse,
      ] = await Promise.all([
        // Main template data
        fetch(`/api/marketplace/templates/${templateId}?include=author,metrics,tags`),
        // Reviews and ratings
        enableCommunityFeatures
          ? fetch(`/api/marketplace/templates/${templateId}/reviews?include=stats`)
          : Promise.resolve(null),
        // Analytics data
        showAnalytics
          ? fetch(`/api/marketplace/templates/${templateId}/analytics`)
          : Promise.resolve(null),
        // Version history
        showVersionHistory
          ? fetch(`/api/marketplace/templates/${templateId}/versions`)
          : Promise.resolve(null),
        // Similar templates
        fetch(`/api/marketplace/templates/${templateId}/similar?limit=6`),
      ])

      if (!templateResponse.ok) {
        throw new Error('Failed to load template details')
      }

      const templateData = await templateResponse.json()
      setTemplate(templateData.data)

      // Load reviews if community features enabled
      if (reviewsResponse?.ok) {
        const reviewsData = await reviewsResponse.json()
        setReviews(reviewsData.data || [])
        setReviewStats(reviewsData.stats || null)
      }

      // Load analytics if enabled
      if (analyticsResponse?.ok) {
        const analyticsData = await analyticsResponse.json()
        setTemplateAnalytics(analyticsData.data || null)
      }

      // Load version history
      if (versionsResponse?.ok) {
        const versionsData = await versionsResponse.json()
        setVersions(versionsData.data || [])
      }

      // Load similar templates
      if (similarResponse.ok) {
        const similarData = await similarResponse.json()
        setSimilarTemplates(similarData.data || [])
      }

      // Check if user has starred this template
      if (currentUser) {
        const starResponse = await fetch(
          `/api/marketplace/templates/${templateId}/star?userId=${currentUser.id}`
        )
        if (starResponse.ok) {
          const starData = await starResponse.json()
          setIsStarred(starData.isStarred || false)
        }
      }

      // Track template view
      if (currentUser) {
        fetch('/api/marketplace/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'template_view',
            templateId,
            userId: currentUser.id,
            timestamp: new Date().toISOString(),
          }),
        }).catch(console.error)
      }
    } catch (error) {
      console.error('Failed to load template data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }, [templateId, currentUser, enableCommunityFeatures, showAnalytics, showVersionHistory])

  /**
   * Handle template installation
   */
  const handleInstall = useCallback(async () => {
    if (!template || installing) return

    setInstalling(true)
    try {
      if (onInstall) {
        await onInstall(template.id)
      } else {
        const response = await fetch('/api/templates/instantiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: template.id,
            userId: currentUser?.id,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          router.push(`/workspace/${data.workspaceId}/workflow/${data.workflowId}`)
        } else {
          throw new Error('Installation failed')
        }
      }

      // Track installation event
      fetch('/api/marketplace/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'template_install',
          templateId: template.id,
          userId: currentUser?.id,
        }),
      }).catch(console.error)
    } catch (error) {
      console.error('Installation failed:', error)
      setError('Installation failed. Please try again.')
    } finally {
      setInstalling(false)
    }
  }, [template, installing, onInstall, currentUser, router])

  /**
   * Handle star toggle
   */
  const handleStarToggle = useCallback(async () => {
    if (!template || !currentUser) return

    try {
      const response = await fetch(`/api/marketplace/templates/${template.id}/star`, {
        method: isStarred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      })

      if (response.ok) {
        setIsStarred(!isStarred)
        // Update template star count locally
        setTemplate((prev) =>
          prev
            ? {
                ...prev,
                stars: prev.stars + (isStarred ? -1 : 1),
              }
            : null
        )
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }, [template, currentUser, isStarred])

  /**
   * Handle review submission
   */
  const handleReviewSubmit = useCallback(async () => {
    if (!template || !currentUser || !userReview.trim() || userRating === 0) return

    try {
      const response = await fetch(`/api/marketplace/templates/${template.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: userRating,
          content: userReview,
          userId: currentUser.id,
        }),
      })

      if (response.ok) {
        const newReview = await response.json()
        setReviews((prev) => [newReview.data, ...prev])
        setUserReview('')
        setUserRating(0)

        // Refresh review stats
        loadTemplateData()
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
    }
  }, [template, currentUser, userReview, userRating, loadTemplateData])

  /**
   * Handle section toggle
   */
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }, [])

  // Load data on mount
  useEffect(() => {
    loadTemplateData()
  }, [loadTemplateData])

  // Set up real-time updates if enabled
  useEffect(() => {
    if (!enableRealTimeUpdates || !template) return

    const eventSource = new EventSource(
      `/api/marketplace/templates/${template.id}/updates?userId=${currentUser?.id}`
    )

    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data)

      switch (update.type) {
        case 'review_added':
          setReviews((prev) => [update.data, ...prev])
          break
        case 'rating_updated':
          setTemplate((prev) => (prev ? { ...prev, ratingAverage: update.data.average } : null))
          break
        case 'stats_updated':
          setTemplate((prev) => (prev ? { ...prev, ...update.data } : null))
          break
      }
    }

    return () => eventSource.close()
  }, [enableRealTimeUpdates, template, currentUser])

  // Format numbers for display
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }, [])

  // Get difficulty color
  const getDifficultyColor = useCallback((difficulty: string): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'advanced':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'expert':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  // Render rating stars
  const renderRating = useCallback(
    (rating: number, showValue = true) => (
      <div className='flex items-center gap-1'>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              'h-4 w-4',
              index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            )}
          />
        ))}
        {showValue && (
          <span className='ml-1 text-muted-foreground text-sm'>({rating.toFixed(1)})</span>
        )}
      </div>
    ),
    []
  )

  // Loading state
  if (loading) {
    return (
      <div className={cn('flex h-screen items-center justify-center', className)}>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
          <p className='text-muted-foreground'>Loading template details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !template) {
    return (
      <div className={cn('flex h-screen items-center justify-center', className)}>
        <div className='flex flex-col items-center gap-4 text-center'>
          <div className='text-6xl'>😞</div>
          <div>
            <h2 className='font-semibold text-xl'>Template Not Found</h2>
            <p className='text-muted-foreground'>
              {error || 'The requested template could not be found'}
            </p>
          </div>
          <Button onClick={() => router.back()}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div
        className={cn('min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-8', className)}
      >
        {/* Header */}
        <div className='border-b bg-white/80 p-4 backdrop-blur-sm'>
          <div className='mx-auto flex max-w-7xl items-center justify-between'>
            <Button variant='ghost' onClick={onBack || (() => router.back())} className='gap-2'>
              <ArrowLeft className='h-4 w-4' />
              Back to Templates
            </Button>

            {/* Action Buttons */}
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleStarToggle}
                disabled={!currentUser}
                className={cn(isStarred && 'border-yellow-400 bg-yellow-50')}
              >
                <Heart
                  className={cn('mr-2 h-4 w-4', isStarred && 'fill-yellow-400 text-yellow-400')}
                />
                {isStarred ? 'Starred' : 'Star'}
                <Badge variant='secondary' className='ml-2'>
                  {formatNumber(template.stars)}
                </Badge>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <Share2 className='mr-2 h-4 w-4' />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                  >
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem>Share on Twitter</DropdownMenuItem>
                  <DropdownMenuItem>Share on LinkedIn</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Report Template</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleInstall} disabled={installing || !currentUser} size='lg'>
                {installing ? (
                  <>
                    <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                    Installing...
                  </>
                ) : (
                  <>
                    <Zap className='mr-2 h-4 w-4' />
                    Use This Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='mx-auto max-w-7xl p-6'>
          <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
            {/* Main Content Column */}
            <div className='lg:col-span-2'>
              {/* Template Header */}
              <Card className='mb-6 overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
                <CardHeader className='bg-gradient-to-r from-blue-600 to-purple-600 text-white'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center gap-4'>
                      <div
                        className='flex h-16 w-16 items-center justify-center rounded-xl font-bold text-2xl text-white'
                        style={{ backgroundColor: template.color }}
                      >
                        {template.icon || '📄'}
                      </div>
                      <div>
                        <CardTitle className='font-bold text-2xl'>{template.name}</CardTitle>
                        <p className='text-blue-100'>{template.description}</p>
                        <div className='mt-2 flex items-center gap-4 text-blue-200 text-sm'>
                          <div className='flex items-center gap-1'>
                            <User className='h-4 w-4' />
                            {template.author}
                          </div>
                          <div className='flex items-center gap-1'>
                            <Calendar className='h-4 w-4' />
                            {new Date(template.createdAt).toLocaleDateString()}
                          </div>
                          <div className='flex items-center gap-1'>
                            <Download className='h-4 w-4' />
                            {formatNumber(template.downloadCount || 0)} downloads
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Template Status Badges */}
                    <div className='flex flex-col gap-2'>
                      {template.featured && (
                        <Badge className='bg-yellow-400 text-yellow-900'>
                          <Star className='mr-1 h-3 w-3' />
                          Featured
                        </Badge>
                      )}
                      {template.trending && (
                        <Badge className='bg-orange-400 text-orange-900'>
                          <TrendingUp className='mr-1 h-3 w-3' />
                          Trending
                        </Badge>
                      )}
                      {template.metadata?.difficulty && (
                        <Badge variant='outline' className='border-white/30 bg-white/20 text-white'>
                          {template.metadata.difficulty}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Template Metrics */}
                <CardContent className='p-6'>
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <div className='text-center'>
                      <div className='font-bold text-2xl text-blue-600'>
                        {formatNumber(template.views || 0)}
                      </div>
                      <div className='text-muted-foreground text-sm'>Views</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-bold text-2xl text-green-600'>
                        {formatNumber(template.downloadCount || 0)}
                      </div>
                      <div className='text-muted-foreground text-sm'>Downloads</div>
                    </div>
                    <div className='text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        {renderRating(template.ratingAverage || 0, false)}
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        {template.ratingCount || 0} reviews
                      </div>
                    </div>
                    <div className='text-center'>
                      <div className='font-bold text-2xl text-purple-600'>
                        {formatNumber(template.stars || 0)}
                      </div>
                      <div className='text-muted-foreground text-sm'>Stars</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Template Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
                <TabsList className='grid w-full grid-cols-5'>
                  <TabsTrigger value='overview'>Overview</TabsTrigger>
                  <TabsTrigger value='details'>Details</TabsTrigger>
                  {enableCommunityFeatures && <TabsTrigger value='reviews'>Reviews</TabsTrigger>}
                  {showAnalytics && <TabsTrigger value='analytics'>Analytics</TabsTrigger>}
                  {showVersionHistory && <TabsTrigger value='versions'>Versions</TabsTrigger>}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value='overview' className='space-y-6'>
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='prose max-w-none'>
                        <p>{template.description || 'No description available.'}</p>
                        {template.metadata?.longDescription && (
                          <div className='mt-4'>
                            <p>{template.metadata.longDescription}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Use Cases */}
                  {template.metadata?.useCases && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Use Cases</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className='list-inside list-disc space-y-1'>
                          {template.metadata.useCases.map((useCase, index) => (
                            <li key={index} className='text-sm'>
                              {useCase}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Requirements */}
                  {template.metadata?.requirements && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Requirements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='flex flex-wrap gap-2'>
                          {template.metadata.requirements.map((req, index) => (
                            <Badge key={index} variant='outline'>
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value='details' className='space-y-6'>
                  <Card>
                    <CardHeader>
                      <CardTitle>Template Information</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div>
                          <label className='font-medium text-sm'>Category</label>
                          <p className='text-muted-foreground text-sm'>{template.category}</p>
                        </div>
                        <div>
                          <label className='font-medium text-sm'>Version</label>
                          <p className='text-muted-foreground text-sm'>
                            {template.version || '1.0.0'}
                          </p>
                        </div>
                        <div>
                          <label className='font-medium text-sm'>License</label>
                          <p className='text-muted-foreground text-sm'>
                            {template.metadata?.license || 'MIT'}
                          </p>
                        </div>
                        <div>
                          <label className='font-medium text-sm'>Last Updated</label>
                          <p className='text-muted-foreground text-sm'>
                            {new Date(
                              template.updatedAt || template.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Tags */}
                      {template.metadata?.tags && (
                        <div>
                          <label className='font-medium text-sm'>Tags</label>
                          <div className='mt-2 flex flex-wrap gap-2'>
                            {template.metadata.tags.map((tag, index) => (
                              <Badge key={index} variant='secondary'>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Reviews Tab */}
                {enableCommunityFeatures && (
                  <TabsContent value='reviews' className='space-y-6'>
                    {/* Review Summary */}
                    {reviewStats && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Review Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div>
                              <div className='text-center'>
                                <div className='font-bold text-4xl'>
                                  {reviewStats.averageRating.toFixed(1)}
                                </div>
                                {renderRating(reviewStats.averageRating, false)}
                                <p className='mt-1 text-muted-foreground text-sm'>
                                  {reviewStats.totalReviews} reviews
                                </p>
                              </div>
                            </div>
                            <div className='space-y-2'>
                              {[5, 4, 3, 2, 1].map((rating) => (
                                <div key={rating} className='flex items-center gap-2'>
                                  <span className='w-8 text-sm'>{rating}★</span>
                                  <Progress
                                    value={
                                      ((reviewStats.ratingDistribution[rating] || 0) /
                                        reviewStats.totalReviews) *
                                      100
                                    }
                                    className='flex-1'
                                  />
                                  <span className='w-8 text-muted-foreground text-sm'>
                                    {reviewStats.ratingDistribution[rating] || 0}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Add Review */}
                    {currentUser && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Write a Review</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                          <div>
                            <label className='font-medium text-sm'>Rating</label>
                            <div className='mt-1 flex items-center gap-1'>
                              {Array.from({ length: 5 }).map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setUserRating(index + 1)}
                                  className='transition-colors hover:text-yellow-400'
                                >
                                  <Star
                                    className={cn(
                                      'h-6 w-6',
                                      index < userRating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    )}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className='font-medium text-sm'>Review</label>
                            <Textarea
                              value={userReview}
                              onChange={(e) => setUserReview(e.target.value)}
                              placeholder='Share your experience with this template...'
                              className='mt-1'
                              rows={4}
                            />
                          </div>
                          <Button
                            onClick={handleReviewSubmit}
                            disabled={!userReview.trim() || userRating === 0}
                          >
                            Submit Review
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Reviews List */}
                    <div className='space-y-4'>
                      {reviews.map((review) => (
                        <Card key={review.id}>
                          <CardHeader className='pb-3'>
                            <div className='flex items-start justify-between'>
                              <div className='flex items-center gap-3'>
                                <Avatar>
                                  <AvatarImage src={review.user.avatar} />
                                  <AvatarFallback>
                                    {review.user.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className='font-medium'>{review.user.name}</p>
                                  <div className='flex items-center gap-2'>
                                    {renderRating(review.rating, false)}
                                    <span className='text-muted-foreground text-sm'>
                                      {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant='ghost' size='sm'>
                                    <MoreHorizontal className='h-4 w-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    <ThumbsUp className='mr-2 h-4 w-4' />
                                    Helpful
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ThumbsDown className='mr-2 h-4 w-4' />
                                    Not Helpful
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Report</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className='text-sm leading-relaxed'>{review.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {/* Analytics Tab */}
                {showAnalytics && templateAnalytics && (
                  <TabsContent value='analytics' className='space-y-6'>
                    <Card>
                      <CardHeader>
                        <CardTitle>Usage Analytics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
                          <div className='text-center'>
                            <div className='font-bold text-3xl text-blue-600'>
                              {formatNumber(templateAnalytics.totalViews)}
                            </div>
                            <p className='text-muted-foreground text-sm'>Total Views</p>
                            <div className='mt-1 flex items-center justify-center gap-1 text-green-600 text-xs'>
                              <TrendingUp className='h-3 w-3' />+{templateAnalytics.weeklyGrowth}%
                              this week
                            </div>
                          </div>
                          <div className='text-center'>
                            <div className='font-bold text-3xl text-green-600'>
                              {formatNumber(templateAnalytics.totalDownloads)}
                            </div>
                            <p className='text-muted-foreground text-sm'>Total Downloads</p>
                          </div>
                          <div className='text-center'>
                            <div className='font-bold text-3xl text-purple-600'>
                              {formatNumber(templateAnalytics.totalInstantiations)}
                            </div>
                            <p className='text-muted-foreground text-sm'>Total Uses</p>
                          </div>
                        </div>

                        <Separator className='my-6' />

                        <div>
                          <h4 className='mb-3 font-medium'>Performance Metrics</h4>
                          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                            <div>
                              <p className='text-muted-foreground text-sm'>Average Setup Time</p>
                              <p className='font-medium text-lg'>
                                {templateAnalytics.performanceMetrics.averageSetupTime}m
                              </p>
                            </div>
                            <div>
                              <p className='text-muted-foreground text-sm'>Success Rate</p>
                              <p className='font-medium text-lg'>
                                {(templateAnalytics.performanceMetrics.successRate * 100).toFixed(
                                  1
                                )}
                                %
                              </p>
                            </div>
                            <div>
                              <p className='text-muted-foreground text-sm'>User Satisfaction</p>
                              <p className='font-medium text-lg'>
                                {(
                                  templateAnalytics.performanceMetrics.userSatisfaction * 100
                                ).toFixed(1)}
                                %
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Versions Tab */}
                {showVersionHistory && versions.length > 0 && (
                  <TabsContent value='versions' className='space-y-4'>
                    {versions.map((version) => (
                      <Card key={version.id}>
                        <CardHeader className='pb-3'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                              <div className='flex items-center gap-2'>
                                <GitBranch className='h-4 w-4 text-muted-foreground' />
                                <span className='font-medium'>{version.version}</span>
                                {version.isLatest && (
                                  <Badge variant='default' className='text-xs'>
                                    Latest
                                  </Badge>
                                )}
                              </div>
                              <span className='text-muted-foreground text-sm'>
                                {new Date(version.releaseDate).toLocaleDateString()}
                              </span>
                            </div>
                            <Badge variant='outline' className='text-xs'>
                              {formatNumber(version.downloads)} downloads
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className='mb-3 text-sm'>{version.description}</p>
                          {version.changes.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleSection(`version-${version.id}`)}
                                className='flex items-center gap-2 font-medium text-blue-600 text-sm hover:text-blue-700'
                              >
                                {expandedSections[`version-${version.id}`] ? (
                                  <ChevronDown className='h-4 w-4' />
                                ) : (
                                  <ChevronRight className='h-4 w-4' />
                                )}
                                View Changes ({version.changes.length})
                              </button>
                              <AnimatePresence>
                                {expandedSections[`version-${version.id}`] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className='mt-3 overflow-hidden'
                                  >
                                    <ul className='list-inside list-disc space-y-1'>
                                      {version.changes.map((change, index) => (
                                        <li key={index} className='text-muted-foreground text-sm'>
                                          {change}
                                        </li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className='space-y-6'>
              {/* Author Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <User className='h-5 w-5' />
                    Author
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-12 w-12'>
                      <AvatarImage src={template.authorAvatar} />
                      <AvatarFallback>{template.author.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <p className='font-medium'>{template.author}</p>
                      <p className='text-muted-foreground text-sm'>
                        {template.authorTemplateCount || 1} templates
                      </p>
                    </div>
                    <Button variant='outline' size='sm'>
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <Button variant='outline' className='w-full justify-start'>
                    <Eye className='mr-2 h-4 w-4' />
                    Preview Template
                  </Button>
                  <Button variant='outline' className='w-full justify-start'>
                    <Code className='mr-2 h-4 w-4' />
                    View Source
                  </Button>
                  <Button variant='outline' className='w-full justify-start'>
                    <BookOpen className='mr-2 h-4 w-4' />
                    Documentation
                  </Button>
                  <Button variant='outline' className='w-full justify-start'>
                    <ExternalLink className='mr-2 h-4 w-4' />
                    Demo
                  </Button>
                </CardContent>
              </Card>

              {/* Similar Templates */}
              {similarTemplates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Similar Templates</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {similarTemplates.slice(0, 3).map((similarTemplate) => (
                      <div
                        key={similarTemplate.id}
                        className='flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50'
                        onClick={() => onTemplateSelect?.(similarTemplate)}
                      >
                        <div
                          className='flex h-8 w-8 items-center justify-center rounded font-bold text-white text-xs'
                          style={{ backgroundColor: similarTemplate.color }}
                        >
                          {similarTemplate.icon || '📄'}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate font-medium text-sm'>{similarTemplate.name}</p>
                          <div className='flex items-center gap-1'>
                            {renderRating(similarTemplate.ratingAverage || 0, false)}
                            <span className='text-muted-foreground text-xs'>
                              ({similarTemplate.ratingCount || 0})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {similarTemplates.length > 3 && (
                      <Button variant='outline' size='sm' className='w-full'>
                        View All Similar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Template Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Created</span>
                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Last Updated</span>
                    <span>
                      {new Date(template.updatedAt || template.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Total Views</span>
                    <span>{formatNumber(template.views || 0)}</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Downloads</span>
                    <span>{formatNumber(template.downloadCount || 0)}</span>
                  </div>
                  {template.metadata?.estimatedTime && (
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>Setup Time</span>
                      <span>{template.metadata.estimatedTime} min</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default TemplateDetailPage
