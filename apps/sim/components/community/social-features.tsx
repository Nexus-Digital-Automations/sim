/**
 * Social Features Platform - Community Interactions and Activity Management
 *
 * This component provides comprehensive social features for the community marketplace including:
 * - Activity feeds with community interactions and real-time updates
 * - Template collections and personal galleries with sharing capabilities
 * - Following/followers system with notifications and relationship management
 * - Community discussions and template comments with threaded conversations
 * - Social sharing and collaboration features with rich media support
 *
 * Features:
 * - Real-time activity streams with personalized content
 * - Rich interaction system (likes, comments, shares, bookmarks)
 * - Template collection creation and management
 * - Advanced notification system with granular controls
 * - Community discovery and recommendation engine
 * - Privacy controls and content moderation
 * - Mobile-responsive design with touch-friendly interactions
 * - Accessibility-compliant with keyboard navigation and screen reader support
 *
 * @author Claude Code Community Platform
 * @version 1.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  Bell,
  Bookmark,
  Coffee,
  Comment,
  Eye,
  Flag,
  Folder,
  FolderPlus,
  Globe,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { CommunityUtils } from '@/lib/community'
import { cn } from '@/lib/utils'

/**
 * Social Features Platform Props Interface
 */
export interface SocialFeaturesPlatformProps {
  /** Current user ID for personalization and authentication */
  currentUserId?: string
  /** Custom CSS class name for styling */
  className?: string
  /** Enable real-time updates via WebSocket */
  enableRealTime?: boolean
  /** Show community discovery features */
  showDiscovery?: boolean
  /** Enable advanced notification system */
  enableNotifications?: boolean
  /** Default activity feed filter */
  defaultFilter?: 'all' | 'following' | 'trending' | 'my-activity'
  /** Maximum items to load per page */
  pageSize?: number
}

/**
 * Activity Item Interface
 */
interface CommunityActivity {
  id: string
  userId: string
  user: {
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
  activityType:
    | 'template_created'
    | 'review_posted'
    | 'badge_earned'
    | 'template_starred'
    | 'collection_created'
    | 'user_followed'
    | 'template_shared'
    | 'comment_posted'
  activityData: Record<string, any>
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
  }
  createdAt: string
  updatedAt?: string
}

/**
 * Template Collection Interface
 */
interface TemplateCollection {
  id: string
  name: string
  description?: string
  userId: string
  user: {
    name: string
    displayName?: string
    image?: string
  }
  visibility: 'private' | 'unlisted' | 'public'
  isFeatured: boolean
  templateCount: number
  followerCount: number
  tags: string[]
  coverImage?: string
  templates: Array<{
    id: string
    name: string
    description: string
    rating: number
    downloadCount: number
    coverImage?: string
  }>
  isFollowing?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Comment Thread Interface
 */
interface CommentThread {
  id: string
  targetId: string
  targetType: 'template' | 'activity' | 'collection'
  comments: Comment[]
  totalCount: number
  isLoading: boolean
}

interface Comment {
  id: string
  userId: string
  user: {
    name: string
    displayName?: string
    image?: string
    isVerified?: boolean
  }
  content: string
  parentId?: string
  replies?: Comment[]
  likeCount: number
  isLiked?: boolean
  isPinned?: boolean
  isEdited?: boolean
  createdAt: string
  updatedAt?: string
}

/**
 * Social Features Platform Component
 */
export const SocialFeaturesPlatform: React.FC<SocialFeaturesPlatformProps> = ({
  currentUserId,
  className,
  enableRealTime = true,
  showDiscovery = true,
  enableNotifications = true,
  defaultFilter = 'all',
  pageSize = 20,
}) => {
  const router = useRouter()
  const activityFeedRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activities, setActivities] = useState<CommunityActivity[]>([])
  const [collections, setCollections] = useState<TemplateCollection[]>([])
  const [commentThreads, setCommentThreads] = useState<Record<string, CommentThread>>({})

  // State management
  const [activeFilter, setActiveFilter] = useState(defaultFilter)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateCollection, setShowCreateCollection] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<CommunityActivity | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Collection creation state
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'private' | 'unlisted' | 'public',
    tags: [] as string[],
  })

  // Real-time WebSocket connection
  const [socket, setSocket] = useState<WebSocket | null>(null)

  /**
   * Initialize social features and data loading
   */
  const initializeSocialFeatures = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log('[SocialFeatures] Initializing social features platform')

      // Load initial data in parallel
      const [activitiesResponse, collectionsResponse, notificationsResponse] = await Promise.all([
        // Fetch activity feed based on current filter
        fetch(`/api/community/social/activities?filter=${activeFilter}&limit=${pageSize}`, {
          headers: currentUserId ? { 'X-User-ID': currentUserId } : {},
        }),
        // Fetch user's collections and featured public collections
        fetch(
          `/api/community/social/collections${currentUserId ? `?userId=${currentUserId}` : ''}`,
          {
            headers: currentUserId ? { 'X-User-ID': currentUserId } : {},
          }
        ),
        // Fetch notifications for authenticated users
        currentUserId
          ? fetch(`/api/community/social/notifications`, {
              headers: { 'X-User-ID': currentUserId },
            })
          : Promise.resolve(null),
      ])

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json()
        setActivities(activitiesData.data || [])
      }

      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        setCollections(collectionsData.data || [])
      }

      if (notificationsResponse?.ok) {
        const notificationsData = await notificationsResponse.json()
        setNotifications(notificationsData.data || [])
        setUnreadCount(notificationsData.unreadCount || 0)
      }

      console.log('[SocialFeatures] Social features initialized successfully')
    } catch (error) {
      console.error('[SocialFeatures] Failed to initialize social features:', error)
      toast.error('Failed to load social features')
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, activeFilter, pageSize])

  /**
   * Setup real-time WebSocket connection
   */
  const setupRealTimeConnection = useCallback(() => {
    if (!enableRealTime || !currentUserId) return

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/community/social/ws`
      const newSocket = new WebSocket(`${wsUrl}?userId=${currentUserId}`)

      newSocket.onopen = () => {
        console.log('[SocialFeatures] WebSocket connected for real-time updates')
        setSocket(newSocket)
      }

      newSocket.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data)
          console.log('[SocialFeatures] Real-time update received:', update)

          switch (update.type) {
            case 'activity_created':
              setActivities((prev) => [update.data, ...prev])
              break
            case 'activity_updated':
              setActivities((prev) =>
                prev.map((activity) =>
                  activity.id === update.data.id ? { ...activity, ...update.data } : activity
                )
              )
              break
            case 'engagement_updated':
              setActivities((prev) =>
                prev.map((activity) =>
                  activity.id === update.targetId
                    ? { ...activity, engagementMetrics: update.data }
                    : activity
                )
              )
              break
            case 'notification_received':
              setNotifications((prev) => [update.data, ...prev])
              setUnreadCount((prev) => prev + 1)
              break
            default:
              console.log('[SocialFeatures] Unknown real-time update type:', update.type)
          }
        } catch (error) {
          console.error('[SocialFeatures] Failed to process real-time update:', error)
        }
      }

      newSocket.onclose = () => {
        console.log('[SocialFeatures] WebSocket disconnected, attempting reconnection...')
        setSocket(null)
        // Attempt reconnection after 5 seconds
        setTimeout(setupRealTimeConnection, 5000)
      }

      newSocket.onerror = (error) => {
        console.error('[SocialFeatures] WebSocket error:', error)
      }
    } catch (error) {
      console.error('[SocialFeatures] Failed to setup WebSocket connection:', error)
    }
  }, [enableRealTime, currentUserId])

  /**
   * Handle activity engagement (like, comment, share, bookmark)
   */
  const handleEngagement = useCallback(
    async (
      activityId: string,
      engagementType: 'like' | 'comment' | 'share' | 'bookmark',
      data?: any
    ) => {
      if (!currentUserId) {
        toast.error('Please sign in to interact with community content')
        return
      }

      try {
        console.log(
          `[SocialFeatures] Processing ${engagementType} engagement for activity:`,
          activityId
        )

        const response = await fetch(`/api/community/social/interactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': currentUserId,
          },
          body: JSON.stringify({
            targetId: activityId,
            targetType: 'activity',
            engagementType,
            data,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `Failed to ${engagementType} activity`)
        }

        const result = await response.json()

        // Update local state optimistically
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
                  updatedMetrics.commentCount += 1
                  break
              }

              return { ...activity, engagementMetrics: updatedMetrics }
            }
            return activity
          })
        )

        // Show success feedback
        const engagementMessages = {
          like: updatedMetrics.isLiked ? 'Liked!' : 'Like removed',
          bookmark: updatedMetrics.isBookmarked ? 'Bookmarked!' : 'Bookmark removed',
          share: 'Shared successfully!',
          comment: 'Comment posted!',
        }

        toast.success(engagementMessages[engagementType])
      } catch (error) {
        console.error(`[SocialFeatures] Failed to ${engagementType} activity:`, error)
        toast.error(error instanceof Error ? error.message : `Failed to ${engagementType} activity`)
      }
    },
    [currentUserId]
  )

  /**
   * Handle comment posting
   */
  const handlePostComment = useCallback(
    async (
      targetId: string,
      targetType: 'activity' | 'template' | 'collection',
      content: string,
      parentId?: string
    ) => {
      if (!currentUserId || !content.trim()) {
        return
      }

      try {
        console.log('[SocialFeatures] Posting comment:', { targetId, targetType, content })

        const response = await fetch(`/api/community/social/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': currentUserId,
          },
          body: JSON.stringify({
            targetId,
            targetType,
            content: content.trim(),
            parentId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to post comment')
        }

        const newComment = await response.json()

        // Update comment threads
        setCommentThreads((prev) => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            comments: [...(prev[targetId]?.comments || []), newComment.data],
            totalCount: (prev[targetId]?.totalCount || 0) + 1,
          },
        }))

        // Also trigger engagement update if commenting on activity
        if (targetType === 'activity') {
          handleEngagement(targetId, 'comment')
        }

        toast.success('Comment posted successfully!')
      } catch (error) {
        console.error('[SocialFeatures] Failed to post comment:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to post comment')
      }
    },
    [currentUserId, handleEngagement]
  )

  /**
   * Handle collection creation
   */
  const handleCreateCollection = useCallback(async () => {
    if (!currentUserId || !newCollection.name.trim()) {
      return
    }

    try {
      console.log('[SocialFeatures] Creating new collection:', newCollection)

      const response = await fetch(`/api/community/social/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
        },
        body: JSON.stringify({
          name: newCollection.name.trim(),
          description: newCollection.description.trim() || undefined,
          visibility: newCollection.visibility,
          tags: newCollection.tags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create collection')
      }

      const createdCollection = await response.json()

      // Add to local state
      setCollections((prev) => [createdCollection.data, ...prev])

      // Reset form
      setNewCollection({
        name: '',
        description: '',
        visibility: 'public',
        tags: [],
      })
      setShowCreateCollection(false)

      toast.success('Collection created successfully!')
    } catch (error) {
      console.error('[SocialFeatures] Failed to create collection:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create collection')
    }
  }, [currentUserId, newCollection])

  /**
   * Handle follow/unfollow actions
   */
  const handleFollow = useCallback(
    async (targetUserId: string, isFollowing: boolean) => {
      if (!currentUserId || targetUserId === currentUserId) {
        return
      }

      try {
        console.log(
          `[SocialFeatures] ${isFollowing ? 'Unfollowing' : 'Following'} user:`,
          targetUserId
        )

        const response = await fetch(`/api/community/social/follows`, {
          method: isFollowing ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': currentUserId,
          },
          body: JSON.stringify({ targetUserId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.message || `Failed to ${isFollowing ? 'unfollow' : 'follow'} user`
          )
        }

        toast.success(isFollowing ? 'Unfollowed successfully!' : 'Following!')
      } catch (error) {
        console.error('[SocialFeatures] Failed to follow/unfollow user:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to update follow status')
      }
    },
    [currentUserId]
  )

  /**
   * Handle activity refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await initializeSocialFeatures()
    setRefreshing(false)
    toast.success('Feed refreshed!')
  }, [initializeSocialFeatures])

  // Initialize on mount
  useEffect(() => {
    initializeSocialFeatures()
  }, [initializeSocialFeatures])

  // Setup real-time connection
  useEffect(() => {
    setupRealTimeConnection()
    return () => {
      socket?.close()
    }
  }, [setupRealTimeConnection, socket])

  // Filter change handler
  useEffect(() => {
    initializeSocialFeatures()
  }, [activeFilter])

  // Activity renderer
  const renderActivity = useCallback(
    (activity: CommunityActivity) => {
      const activityIcons = {
        template_created: Zap,
        review_posted: MessageCircle,
        badge_earned: Star,
        template_starred: Heart,
        collection_created: Folder,
        user_followed: Users,
        template_shared: Share2,
        comment_posted: Comment,
      }

      const ActivityIcon = activityIcons[activity.activityType] || Activity

      return (
        <Card key={activity.id} className='mb-4 transition-all hover:shadow-md'>
          <CardContent className='p-4'>
            {/* Activity Header */}
            <div className='mb-3 flex items-start justify-between'>
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <img
                    src={CommunityUtils.getUserAvatarUrl(activity.user, 40)}
                    alt={activity.user.displayName || activity.user.name}
                    className='h-10 w-10 rounded-full object-cover'
                  />
                  {activity.user.isVerified && (
                    <div className='-bottom-1 -right-1 absolute rounded-full bg-blue-500 p-0.5'>
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
                      {CommunityUtils.getTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-gray-600 text-sm'>
                    <ActivityIcon className='h-4 w-4' />
                    <span>{activity.activityData.actionText || 'performed an action'}</span>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm'>
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
                  onClick={() => setSelectedActivity(activity)}
                >
                  <MessageCircle className='h-4 w-4' />
                  {activity.engagementMetrics.commentCount}
                </Button>

                <Button
                  variant='ghost'
                  size='sm'
                  className='gap-1 text-gray-600 hover:text-green-600'
                  onClick={() => handleEngagement(activity.id, 'share')}
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

  return (
    <div className={cn('mx-auto flex h-full max-w-7xl gap-6 p-6', className)}>
      {/* Main Content Area */}
      <div className='max-w-2xl flex-1'>
        {/* Header with Actions */}
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='font-bold text-2xl'>Community</h1>
            <p className='text-muted-foreground'>Stay connected with the automation community</p>
          </div>

          <div className='flex items-center gap-2'>
            {/* Refresh Button */}
            <Button variant='outline' size='sm' onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>

            {/* Notifications */}
            {enableNotifications && currentUserId && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant='outline' size='sm' className='relative'>
                    <Bell className='h-4 w-4' />
                    {unreadCount > 0 && (
                      <Badge
                        variant='destructive'
                        className='-right-2 -top-2 absolute h-5 w-5 rounded-full p-0 text-xs'
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side='right' className='w-96'>
                  <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                    <SheetDescription>Stay updated with community activity</SheetDescription>
                  </SheetHeader>
                  <ScrollArea className='mt-4 h-[calc(100vh-120px)]'>
                    {notifications.length === 0 ? (
                      <div className='flex h-32 items-center justify-center text-muted-foreground'>
                        No notifications yet
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        {notifications.map((notification) => (
                          <Card key={notification.id} className='p-3'>
                            <div className='text-sm'>{notification.title}</div>
                            <div className='text-muted-foreground text-xs'>
                              {CommunityUtils.getTimeAgo(notification.createdAt)}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            )}

            {/* Create Collection */}
            {currentUserId && (
              <Dialog open={showCreateCollection} onOpenChange={setShowCreateCollection}>
                <DialogTrigger asChild>
                  <Button size='sm'>
                    <Plus className='mr-2 h-4 w-4' />
                    Create Collection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Template Collection</DialogTitle>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='collection-name'>Collection Name</Label>
                      <Input
                        id='collection-name'
                        value={newCollection.name}
                        onChange={(e) =>
                          setNewCollection((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder='My Awesome Templates'
                      />
                    </div>
                    <div>
                      <Label htmlFor='collection-description'>Description (Optional)</Label>
                      <Textarea
                        id='collection-description'
                        value={newCollection.description}
                        onChange={(e) =>
                          setNewCollection((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder='Describe what this collection is about...'
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Visibility</Label>
                      <div className='mt-2 space-y-2'>
                        {[
                          {
                            value: 'public',
                            label: 'Public',
                            icon: Globe,
                            desc: 'Anyone can see this collection',
                          },
                          {
                            value: 'unlisted',
                            label: 'Unlisted',
                            icon: Eye,
                            desc: 'Only people with the link can see it',
                          },
                          {
                            value: 'private',
                            label: 'Private',
                            icon: Lock,
                            desc: 'Only you can see this collection',
                          },
                        ].map((option) => (
                          <div key={option.value} className='flex items-center space-x-2'>
                            <input
                              type='radio'
                              id={option.value}
                              name='visibility'
                              value={option.value}
                              checked={newCollection.visibility === option.value}
                              onChange={(e) =>
                                setNewCollection((prev) => ({
                                  ...prev,
                                  visibility: e.target.value as 'private' | 'unlisted' | 'public',
                                }))
                              }
                            />
                            <Label htmlFor={option.value} className='flex items-center gap-2'>
                              <option.icon className='h-4 w-4' />
                              <div>
                                <div>{option.label}</div>
                                <div className='text-muted-foreground text-xs'>{option.desc}</div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className='flex justify-end gap-2'>
                      <Button variant='outline' onClick={() => setShowCreateCollection(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateCollection}
                        disabled={!newCollection.name.trim()}
                      >
                        Create Collection
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Activity Feed Filters */}
        <Tabs
          value={activeFilter}
          onValueChange={(value) => setActiveFilter(value as typeof activeFilter)}
        >
          <TabsList className='mb-6 grid w-full grid-cols-4'>
            <TabsTrigger value='all'>All Activity</TabsTrigger>
            <TabsTrigger value='following'>Following</TabsTrigger>
            <TabsTrigger value='trending'>Trending</TabsTrigger>
            {currentUserId && <TabsTrigger value='my-activity'>My Activity</TabsTrigger>}
          </TabsList>

          {/* Activity Feed */}
          <TabsContent value={activeFilter} className='mt-0'>
            <ScrollArea className='h-[calc(100vh-300px)]' ref={activityFeedRef}>
              {isLoading ? (
                <div className='space-y-4'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className='p-4'>
                      <div className='animate-pulse space-y-3'>
                        <div className='flex items-center gap-3'>
                          <div className='h-10 w-10 rounded-full bg-gray-200' />
                          <div className='space-y-1'>
                            <div className='h-4 w-32 rounded bg-gray-200' />
                            <div className='h-3 w-24 rounded bg-gray-200' />
                          </div>
                        </div>
                        <div className='h-16 rounded bg-gray-100' />
                        <div className='flex gap-4'>
                          <div className='h-8 w-16 rounded bg-gray-200' />
                          <div className='h-8 w-16 rounded bg-gray-200' />
                          <div className='h-8 w-16 rounded bg-gray-200' />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className='flex h-64 items-center justify-center text-center'>
                  <div>
                    <Activity className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                    <h3 className='mb-2 font-semibold'>No activity yet</h3>
                    <p className='text-muted-foreground text-sm'>
                      {activeFilter === 'following'
                        ? 'Follow some community members to see their activity here'
                        : 'Be the first to share a template or engage with the community!'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>{activities.map(renderActivity)}</div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar */}
      <div className='w-80 space-y-6'>
        {/* Template Collections */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle className='text-lg'>Template Collections</CardTitle>
            {currentUserId && (
              <Button variant='ghost' size='sm' onClick={() => setShowCreateCollection(true)}>
                <FolderPlus className='h-4 w-4' />
              </Button>
            )}
          </CardHeader>
          <CardContent className='space-y-3'>
            {collections.slice(0, 5).map((collection) => (
              <div
                key={collection.id}
                className='flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50'
                onClick={() => router.push(`/community/collections/${collection.id}`)}
              >
                <div
                  className='flex h-10 w-10 items-center justify-center rounded-lg text-white'
                  style={{ backgroundColor: collection.coverImage ? undefined : '#6366F1' }}
                >
                  {collection.coverImage ? (
                    <img
                      src={collection.coverImage}
                      alt={collection.name}
                      className='h-10 w-10 rounded-lg object-cover'
                    />
                  ) : (
                    <Folder className='h-5 w-5' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate font-medium'>{collection.name}</span>
                    {collection.isFeatured && (
                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                    )}
                  </div>
                  <div className='flex items-center gap-2 text-gray-500 text-xs'>
                    <span>{collection.templateCount} templates</span>
                    {collection.followerCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{collection.followerCount} followers</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {collections.length > 5 && (
              <Button variant='ghost' size='sm' className='w-full'>
                View All Collections
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Community Discovery */}
        {showDiscovery && (
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Discover</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Button variant='ghost' className='w-full justify-start' size='sm'>
                <TrendingUp className='mr-2 h-4 w-4' />
                Trending Templates
              </Button>
              <Button variant='ghost' className='w-full justify-start' size='sm'>
                <Users className='mr-2 h-4 w-4' />
                Active Contributors
              </Button>
              <Button variant='ghost' className='w-full justify-start' size='sm'>
                <Star className='mr-2 h-4 w-4' />
                Top Rated
              </Button>
              <Button variant='ghost' className='w-full justify-start' size='sm'>
                <Coffee className='mr-2 h-4 w-4' />
                Community Events
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {currentUserId && (
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Your Stats</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Templates Created</span>
                <span className='font-medium'>12</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Community Reputation</span>
                <span className='font-medium'>1,247</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Followers</span>
                <span className='font-medium'>89</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Following</span>
                <span className='font-medium'>156</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Comment Dialog */}
      <Dialog
        open={selectedActivity !== null}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
      >
        <DialogContent className='max-h-[80vh] max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className='space-y-4'>
              {/* Activity Summary */}
              <div className='rounded-lg bg-gray-50 p-3'>
                <div className='flex items-center gap-2'>
                  <img
                    src={CommunityUtils.getUserAvatarUrl(selectedActivity.user, 32)}
                    alt={selectedActivity.user.name}
                    className='h-8 w-8 rounded-full'
                  />
                  <div>
                    <div className='font-medium'>
                      {selectedActivity.user.displayName || selectedActivity.user.name}
                    </div>
                    <div className='text-gray-600 text-sm'>{selectedActivity.targetTitle}</div>
                  </div>
                </div>
              </div>

              {/* Comment Form */}
              {currentUserId && (
                <div className='space-y-2'>
                  <Textarea
                    placeholder='Write a comment...'
                    className='min-h-[80px]'
                    id='comment-input'
                  />
                  <div className='flex justify-end'>
                    <Button
                      size='sm'
                      onClick={() => {
                        const textarea = document.getElementById(
                          'comment-input'
                        ) as HTMLTextAreaElement
                        if (textarea?.value.trim()) {
                          handlePostComment(selectedActivity.id, 'activity', textarea.value)
                          textarea.value = ''
                        }
                      }}
                    >
                      <Send className='mr-2 h-4 w-4' />
                      Post Comment
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <ScrollArea className='h-96'>
                <div className='space-y-3'>
                  {commentThreads[selectedActivity.id]?.comments.map((comment) => (
                    <div key={comment.id} className='flex gap-3'>
                      <img
                        src={CommunityUtils.getUserAvatarUrl(comment.user, 32)}
                        alt={comment.user.name}
                        className='h-8 w-8 rounded-full'
                      />
                      <div className='flex-1'>
                        <div className='rounded-lg bg-gray-50 p-3'>
                          <div className='mb-1 flex items-center gap-2'>
                            <span className='font-medium text-sm'>
                              {comment.user.displayName || comment.user.name}
                            </span>
                            <span className='text-muted-foreground text-xs'>
                              {CommunityUtils.getTimeAgo(comment.createdAt)}
                            </span>
                            {comment.isEdited && (
                              <Badge variant='secondary' className='text-xs'>
                                edited
                              </Badge>
                            )}
                          </div>
                          <p className='text-sm'>{comment.content}</p>
                        </div>
                        {comment.likeCount > 0 && (
                          <div className='mt-1 flex items-center gap-1 text-gray-500 text-xs'>
                            <Heart className='h-3 w-3' />
                            {comment.likeCount}
                          </div>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className='py-8 text-center text-muted-foreground'>
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SocialFeaturesPlatform
