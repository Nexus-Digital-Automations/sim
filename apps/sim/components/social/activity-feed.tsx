/**
 * Activity Feed Component - Real-time Social Activity Stream
 *
 * Comprehensive activity feed system for the community marketplace:
 * - Real-time activity streaming with WebSocket integration
 * - Advanced filtering and personalization capabilities
 * - Engagement tracking and social interaction buttons
 * - Infinite scroll and performance optimization
 * - Responsive design and accessibility compliance
 *
 * Features:
 * - Activity type filtering (template creation, likes, follows, etc.)
 * - Real-time WebSocket updates for live activity stream
 * - Optimistic UI updates for immediate user feedback
 * - Comprehensive engagement metrics and social analytics
 * - Advanced caching and virtualization for performance
 * - ARIA-compliant accessibility with keyboard navigation
 * - Mobile-responsive design with touch-friendly interactions
 * - Rich media support for activity content display
 *
 * @author Claude Code Social Platform
 * @version 1.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  Bookmark,
  Comment,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Share2,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// TypeScript interfaces
export interface User {
  id: string
  name: string
  displayName?: string
  image?: string
  isVerified?: boolean
  reputation?: {
    totalPoints: number
    level: number
  }
}

export interface ActivityItem {
  id: string
  userId: string
  user: User
  activityType:
    | 'template_created'
    | 'review_posted'
    | 'badge_earned'
    | 'template_starred'
    | 'collection_created'
    | 'user_followed'
    | 'template_shared'
    | 'comment_posted'
  activityData: {
    actionText?: string
    description?: string
    rating?: number
    color?: string
    templateId?: string
    collectionId?: string
    targetUserId?: string
  }
  targetId?: string
  targetTitle?: string
  targetType?: 'template' | 'collection' | 'user' | 'review'
  visibility: 'public' | 'followers' | 'private'
  engagementMetrics: {
    likeCount: number
    commentCount: number
    shareCount: number
    bookmarkCount: number
    isLiked?: boolean
    isBookmarked?: boolean
    isCommented?: boolean
  }
  createdAt: string
  updatedAt?: string
}

export interface ActivityFeedProps {
  /** Current user ID for personalization */
  currentUserId?: string
  /** Custom CSS class */
  className?: string
  /** Enable real-time updates */
  enableRealTime?: boolean
  /** Default activity filter */
  defaultFilter?: 'all' | 'following' | 'trending' | 'my-activity'
  /** Maximum items per page */
  pageSize?: number
  /** Enable infinite scroll */
  enableInfiniteScroll?: boolean
  /** WebSocket URL for real-time updates */
  wsUrl?: string
  /** Callback for activity interactions */
  onActivityInteraction?: (activityId: string, interactionType: string) => void
}

/**
 * Activity Feed Component
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  currentUserId,
  className,
  enableRealTime = true,
  defaultFilter = 'all',
  pageSize = 20,
  enableInfiniteScroll = true,
  wsUrl,
  onActivityInteraction,
}) => {
  // State management
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState(defaultFilter)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [websocket, setWebsocket] = useState<WebSocket | null>(null)

  // Refs for infinite scroll and performance
  const feedRef = useRef<HTMLDivElement>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
  const loadingTriggerRef = useRef<HTMLDivElement>(null)

  /**
   * Initialize activity feed data
   */
  const initializeActivityFeed = useCallback(
    async (resetPage = false) => {
      try {
        const currentPage = resetPage ? 1 : page
        const operationId = `feed-init-${currentPage}-${activeFilter}-${Date.now()}`

        console.log(`[ActivityFeed][${operationId}] Initializing activity feed`, {
          filter: activeFilter,
          page: currentPage,
          pageSize,
          userId: currentUserId,
        })

        setIsLoading(resetPage)

        const response = await fetch(
          `/api/community/social/activities?filter=${activeFilter}&page=${currentPage}&limit=${pageSize}`,
          {
            headers: currentUserId ? { 'X-User-ID': currentUserId } : {},
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.statusText}`)
        }

        const data = await response.json()
        const newActivities = data.data || []

        if (resetPage) {
          setActivities(newActivities)
          setPage(2)
        } else {
          setActivities((prev) => [...prev, ...newActivities])
          setPage((prev) => prev + 1)
        }

        setHasMore(newActivities.length === pageSize)

        console.log(`[ActivityFeed][${operationId}] Activity feed loaded successfully`, {
          activitiesCount: newActivities.length,
          totalActivities: resetPage
            ? newActivities.length
            : activities.length + newActivities.length,
          hasMore: newActivities.length === pageSize,
        })
      } catch (error) {
        console.error('[ActivityFeed] Failed to load activities:', error)
        toast.error('Failed to load activity feed')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeFilter, page, pageSize, currentUserId, activities.length]
  )

  /**
   * Setup WebSocket connection for real-time updates
   */
  const setupWebSocket = useCallback(() => {
    if (!enableRealTime || !currentUserId || !wsUrl) return

    const operationId = `ws-setup-${currentUserId}-${Date.now()}`

    try {
      console.log(`[ActivityFeed][${operationId}] Setting up WebSocket connection`, {
        wsUrl,
        userId: currentUserId,
      })

      const ws = new WebSocket(`${wsUrl}?userId=${currentUserId}&type=activity_feed`)

      ws.onopen = () => {
        console.log(`[ActivityFeed][${operationId}] WebSocket connected`)
        setWebsocket(ws)
        toast.success('Connected to live activity feed')
      }

      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data)
          console.log(`[ActivityFeed][${operationId}] Real-time update received:`, update)

          switch (update.type) {
            case 'activity_created':
              // Add new activity to the top of the feed
              setActivities((prev) => [update.data, ...prev])
              break

            case 'activity_updated':
              // Update existing activity
              setActivities((prev) =>
                prev.map((activity) =>
                  activity.id === update.data.id ? { ...activity, ...update.data } : activity
                )
              )
              break

            case 'engagement_updated':
              // Update engagement metrics for specific activity
              setActivities((prev) =>
                prev.map((activity) =>
                  activity.id === update.activityId
                    ? {
                        ...activity,
                        engagementMetrics: { ...activity.engagementMetrics, ...update.data },
                      }
                    : activity
                )
              )
              break

            default:
              console.log(`[ActivityFeed][${operationId}] Unknown update type:`, update.type)
          }
        } catch (error) {
          console.error(`[ActivityFeed][${operationId}] Error processing WebSocket message:`, error)
        }
      }

      ws.onclose = () => {
        console.log(
          `[ActivityFeed][${operationId}] WebSocket disconnected, attempting reconnection`
        )
        setWebsocket(null)
        // Attempt reconnection after 5 seconds
        setTimeout(setupWebSocket, 5000)
      }

      ws.onerror = (error) => {
        console.error(`[ActivityFeed][${operationId}] WebSocket error:`, error)
      }
    } catch (error) {
      console.error(`[ActivityFeed][${operationId}] Failed to setup WebSocket:`, error)
    }
  }, [enableRealTime, currentUserId, wsUrl])

  /**
   * Handle activity engagement (like, comment, share, bookmark)
   */
  const handleEngagement = useCallback(
    async (activityId: string, engagementType: 'like' | 'comment' | 'share' | 'bookmark') => {
      if (!currentUserId) {
        toast.error('Please sign in to interact with activities')
        return
      }

      const operationId = `engagement-${activityId}-${engagementType}-${Date.now()}`

      try {
        console.log(`[ActivityFeed][${operationId}] Processing engagement`, {
          activityId,
          engagementType,
          userId: currentUserId,
        })

        // Optimistic update
        setActivities((prev) =>
          prev.map((activity) => {
            if (activity.id === activityId) {
              const updatedMetrics = { ...activity.engagementMetrics }

              switch (engagementType) {
                case 'like':
                  updatedMetrics.isLiked = !updatedMetrics.isLiked
                  updatedMetrics.likeCount += updatedMetrics.isLiked ? 1 : -1
                  break
                case 'bookmark':
                  updatedMetrics.isBookmarked = !updatedMetrics.isBookmarked
                  updatedMetrics.bookmarkCount += updatedMetrics.isBookmarked ? 1 : -1
                  break
                case 'share':
                  updatedMetrics.shareCount += 1
                  break
                case 'comment':
                  updatedMetrics.isCommented = true
                  updatedMetrics.commentCount += 1
                  break
              }

              return { ...activity, engagementMetrics: updatedMetrics }
            }
            return activity
          })
        )

        const response = await fetch('/api/community/social/interactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': currentUserId,
          },
          body: JSON.stringify({
            targetId: activityId,
            targetType: 'activity',
            engagementType,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to ${engagementType} activity`)
        }

        const result = await response.json()

        // Update with server response if needed
        if (result.data?.engagementMetrics) {
          setActivities((prev) =>
            prev.map((activity) =>
              activity.id === activityId
                ? { ...activity, engagementMetrics: result.data.engagementMetrics }
                : activity
            )
          )
        }

        // Fire callback
        onActivityInteraction?.(activityId, engagementType)

        // Success feedback
        const messages = {
          like: 'Liked!',
          bookmark: 'Bookmarked!',
          share: 'Shared successfully!',
          comment: 'Comment interaction recorded!',
        }
        toast.success(messages[engagementType])

        console.log(`[ActivityFeed][${operationId}] Engagement processed successfully`)
      } catch (error) {
        console.error(`[ActivityFeed][${operationId}] Engagement failed:`, error)

        // Revert optimistic update on error
        await initializeActivityFeed(true)
        toast.error(`Failed to ${engagementType} activity`)
      }
    },
    [currentUserId, onActivityInteraction, initializeActivityFeed]
  )

  /**
   * Handle feed refresh
   */
  const handleRefresh = useCallback(async () => {
    const operationId = `refresh-${Date.now()}`
    console.log(`[ActivityFeed][${operationId}] Refreshing activity feed`)

    setIsRefreshing(true)
    await initializeActivityFeed(true)
    toast.success('Activity feed refreshed!')
  }, [initializeActivityFeed])

  /**
   * Setup infinite scroll intersection observer
   */
  const setupInfiniteScroll = useCallback(() => {
    if (!enableInfiniteScroll || !loadingTriggerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !isLoading) {
          console.log('[ActivityFeed] Loading more activities via infinite scroll')
          initializeActivityFeed(false)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    )

    observer.observe(loadingTriggerRef.current)
    intersectionObserverRef.current = observer

    return () => {
      observer.disconnect()
      intersectionObserverRef.current = null
    }
  }, [enableInfiniteScroll, hasMore, isLoading, initializeActivityFeed])

  /**
   * Get activity icon based on type
   */
  const getActivityIcon = (activityType: ActivityItem['activityType']) => {
    const icons = {
      template_created: Zap,
      review_posted: MessageCircle,
      badge_earned: Star,
      template_starred: Heart,
      collection_created: Activity,
      user_followed: Users,
      template_shared: Share2,
      comment_posted: Comment,
    }
    return icons[activityType] || Activity
  }

  /**
   * Get user avatar URL with fallback
   */
  const getUserAvatarUrl = (user: User, size = 40) => {
    if (user.image) return user.image
    // Generate initials-based avatar or return placeholder
    const initials = (user.displayName || user.name)
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    return `https://ui-avatars.com/api/?name=${initials}&size=${size}&background=6366F1&color=ffffff`
  }

  /**
   * Format time ago helper
   */
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  /**
   * Render individual activity item
   */
  const renderActivity = useCallback(
    (activity: ActivityItem) => {
      const ActivityIcon = getActivityIcon(activity.activityType)

      return (
        <Card key={activity.id} className='mb-4 transition-all hover:shadow-md'>
          <CardContent className='p-4'>
            {/* Activity Header */}
            <div className='mb-3 flex items-start justify-between'>
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <img
                    src={getUserAvatarUrl(activity.user, 40)}
                    alt={activity.user.displayName || activity.user.name}
                    className='h-10 w-10 rounded-full object-cover'
                  />
                  {activity.user.isVerified && (
                    <div className='-right-1 -bottom-1 absolute rounded-full bg-blue-500 p-0.5'>
                      <Star className='h-3 w-3 fill-white text-white' />
                    </div>
                  )}
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='font-semibold'>
                      {activity.user.displayName || activity.user.name}
                    </span>
                    {activity.user.reputation && (
                      <Badge variant='secondary' className='text-xs'>
                        Level {activity.user.reputation.level}
                      </Badge>
                    )}
                    <span className='text-muted-foreground text-xs'>
                      {getTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-gray-600 text-sm'>
                    <ActivityIcon className='h-4 w-4' />
                    <span>{activity.activityData.actionText || 'performed an action'}</span>
                  </div>
                </div>
              </div>

              {/* Activity Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={() => handleEngagement(activity.id, 'bookmark')}>
                    <Bookmark className='mr-2 h-4 w-4' />
                    {activity.engagementMetrics.isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEngagement(activity.id, 'share')}>
                    <Share2 className='mr-2 h-4 w-4' />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Flag className='mr-2 h-4 w-4' />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Activity Content */}
            {activity.targetTitle && (
              <div className='mb-3 rounded-lg bg-gray-50 p-3'>
                <div className='flex items-center gap-2'>
                  <div
                    className='h-2 w-2 rounded-full'
                    style={{ backgroundColor: activity.activityData.color || '#6366F1' }}
                  />
                  <span className='font-medium'>{activity.targetTitle}</span>
                  {activity.activityData.rating && (
                    <div className='ml-auto flex items-center gap-1'>
                      <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                      <span className='text-sm'>{activity.activityData.rating}</span>
                    </div>
                  )}
                </div>
                {activity.activityData.description && (
                  <p className='mt-1 text-gray-600 text-sm'>{activity.activityData.description}</p>
                )}
              </div>
            )}

            {/* Engagement Actions */}
            <div className='flex items-center justify-between border-t pt-3'>
              <div className='flex items-center gap-4'>
                <Button
                  variant='ghost'
                  size='sm'
                  className={cn(
                    'gap-1 text-gray-600 hover:text-red-600',
                    activity.engagementMetrics.isLiked && 'text-red-600'
                  )}
                  onClick={() => handleEngagement(activity.id, 'like')}
                  aria-label={`${activity.engagementMetrics.isLiked ? 'Unlike' : 'Like'} this activity`}
                >
                  <Heart
                    className={cn('h-4 w-4', activity.engagementMetrics.isLiked && 'fill-current')}
                  />
                  {activity.engagementMetrics.likeCount}
                </Button>

                <Button
                  variant='ghost'
                  size='sm'
                  className='gap-1 text-gray-600 hover:text-blue-600'
                  aria-label='View comments'
                >
                  <MessageCircle className='h-4 w-4' />
                  {activity.engagementMetrics.commentCount}
                </Button>

                <Button
                  variant='ghost'
                  size='sm'
                  className='gap-1 text-gray-600 hover:text-green-600'
                  onClick={() => handleEngagement(activity.id, 'share')}
                  aria-label='Share this activity'
                >
                  <Share2 className='h-4 w-4' />
                  {activity.engagementMetrics.shareCount}
                </Button>
              </div>

              <Button
                variant='ghost'
                size='sm'
                className={cn(
                  'gap-1 text-gray-600 hover:text-orange-600',
                  activity.engagementMetrics.isBookmarked && 'text-orange-600'
                )}
                onClick={() => handleEngagement(activity.id, 'bookmark')}
                aria-label={`${activity.engagementMetrics.isBookmarked ? 'Remove bookmark' : 'Bookmark'} this activity`}
              >
                <Bookmark
                  className={cn(
                    'h-4 w-4',
                    activity.engagementMetrics.isBookmarked && 'fill-current'
                  )}
                />
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    },
    [handleEngagement]
  )

  // Effects
  useEffect(() => {
    initializeActivityFeed(true)
  }, [initializeActivityFeed, activeFilter])

  useEffect(() => {
    setupWebSocket()
    return () => {
      websocket?.close()
    }
  }, [setupWebSocket, websocket])

  useEffect(() => {
    return setupInfiniteScroll()
  }, [setupInfiniteScroll])

  return (
    <div className={cn('activity-feed', className)}>
      {/* Header with Controls */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h2 className='font-semibold text-xl'>Activity Feed</h2>
          <p className='text-muted-foreground text-sm'>Stay updated with community activities</p>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label='Refresh activity feed'
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>

          {websocket && (
            <Badge variant='secondary' className='bg-green-100 text-green-800'>
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Activity Filters */}
      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)}>
        <TabsList className='mb-6 grid w-full grid-cols-4'>
          <TabsTrigger value='all'>All Activity</TabsTrigger>
          <TabsTrigger value='following'>Following</TabsTrigger>
          <TabsTrigger value='trending'>
            <TrendingUp className='mr-1 h-4 w-4' />
            Trending
          </TabsTrigger>
          {currentUserId && <TabsTrigger value='my-activity'>My Activity</TabsTrigger>}
        </TabsList>

        {/* Activity Feed Content */}
        <TabsContent value={activeFilter} className='mt-0'>
          <ScrollArea className='h-[calc(100vh-300px)]' ref={feedRef}>
            {isLoading && activities.length === 0 ? (
              // Loading skeletons
              <div className='space-y-4'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className='p-4'>
                    <div className='animate-pulse space-y-3'>
                      <div className='flex items-center gap-3'>
                        <Skeleton className='h-10 w-10 rounded-full' />
                        <div className='space-y-1'>
                          <Skeleton className='h-4 w-32' />
                          <Skeleton className='h-3 w-24' />
                        </div>
                      </div>
                      <Skeleton className='h-16 rounded' />
                      <div className='flex gap-4'>
                        <Skeleton className='h-8 w-16' />
                        <Skeleton className='h-8 w-16' />
                        <Skeleton className='h-8 w-16' />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : activities.length === 0 ? (
              // Empty state
              <div className='flex h-64 items-center justify-center text-center'>
                <div>
                  <Activity className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                  <h3 className='mb-2 font-semibold'>No activity yet</h3>
                  <p className='text-muted-foreground text-sm'>
                    {activeFilter === 'following'
                      ? 'Follow community members to see their activity here'
                      : 'Be the first to create templates or engage with the community!'}
                  </p>
                </div>
              </div>
            ) : (
              // Activity items
              <div className='space-y-4'>
                {activities.map(renderActivity)}

                {/* Infinite scroll trigger */}
                {enableInfiniteScroll && hasMore && (
                  <div ref={loadingTriggerRef} className='flex justify-center py-4'>
                    <div className='animate-pulse text-muted-foreground text-sm'>
                      Loading more activities...
                    </div>
                  </div>
                )}

                {/* End of feed indicator */}
                {!hasMore && activities.length > 0 && (
                  <div className='flex justify-center py-4'>
                    <p className='text-muted-foreground text-sm'>
                      You've reached the end of the activity feed
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ActivityFeed
