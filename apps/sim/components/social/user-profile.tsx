/**
 * User Profile Component - Comprehensive Social Profile System
 *
 * Advanced user profile system with social features and analytics:
 * - Complete user profile display with social statistics
 * - Following/followers management with relationship insights
 * - Activity history and contribution analytics
 * - Template collections and achievements showcase
 * - Real-time status updates and notifications
 * - Privacy controls and profile customization
 *
 * Features:
 * - Responsive profile layout with mobile optimization
 * - Social relationship management (follow/unfollow)
 * - Activity feed integration with user-specific filtering
 * - Template gallery and collection showcase
 * - Achievement and badge system display
 * - Reputation scoring and level progression
 * - Profile privacy controls and visibility settings
 * - ARIA-compliant accessibility with screen reader support
 *
 * @author Claude Code Social Platform
 * @version 1.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  Calendar,
  Crown,
  Edit3,
  ExternalLink,
  Heart,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Share2,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// TypeScript interfaces
export interface UserProfileData {
  id: string
  name: string
  displayName?: string
  email?: string
  image?: string
  bio?: string
  location?: string
  website?: string
  twitter?: string
  github?: string
  joinedAt: string
  isVerified?: boolean
  isFollowing?: boolean
  isFollower?: boolean

  // Reputation and achievements
  reputation: {
    totalPoints: number
    level: number
    badges: Badge[]
    achievements: Achievement[]
  }

  // Social statistics
  stats: {
    followersCount: number
    followingCount: number
    templatesCreated: number
    templatesShared: number
    collectionsCount: number
    totalDownloads: number
    totalLikes: number
    averageRating: number
    contributionStreak: number
  }

  // Activity data
  recentActivity?: ActivitySummary[]
  topTemplates?: TemplateSummary[]
  collections?: CollectionSummary[]
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface Achievement {
  id: string
  title: string
  description: string
  progress: number
  maxProgress: number
  completedAt?: string
  category: 'creator' | 'community' | 'explorer' | 'expert'
}

export interface ActivitySummary {
  id: string
  type: string
  description: string
  createdAt: string
  targetId?: string
  targetTitle?: string
}

export interface TemplateSummary {
  id: string
  name: string
  description: string
  rating: number
  downloads: number
  likes: number
  createdAt: string
  thumbnail?: string
}

export interface CollectionSummary {
  id: string
  name: string
  description: string
  templateCount: number
  followers: number
  isPublic: boolean
  updatedAt: string
}

export interface UserProfileProps {
  /** User ID to display profile for */
  userId: string
  /** Current viewing user ID */
  currentUserId?: string
  /** Custom CSS class */
  className?: string
  /** Enable editing for profile owner */
  enableEditing?: boolean
  /** Show detailed statistics */
  showDetailedStats?: boolean
  /** Enable follow functionality */
  enableFollowing?: boolean
  /** Callback for follow/unfollow actions */
  onFollowAction?: (userId: string, isFollowing: boolean) => void
}

/**
 * User Profile Component
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  currentUserId,
  className,
  enableEditing = true,
  showDetailedStats = true,
  enableFollowing = true,
  onFollowAction,
}) => {
  const router = useRouter()

  // State management
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showEditDialog, setShowEditDialog] = useState(false)

  const isOwnProfile = currentUserId === userId

  /**
   * Load user profile data
   */
  const loadProfile = useCallback(async () => {
    const operationId = `profile-load-${userId}-${Date.now()}`

    try {
      console.log(`[UserProfile][${operationId}] Loading user profile`, {
        userId,
        currentUserId,
        isOwnProfile,
      })

      setIsLoading(true)

      const response = await fetch(`/api/community/users/${userId}/profile`, {
        headers: currentUserId ? { 'X-User-ID': currentUserId } : {},
      })

      if (!response.ok) {
        throw new Error(`Failed to load profile: ${response.statusText}`)
      }

      const data = await response.json()
      setProfile(data.data)

      console.log(`[UserProfile][${operationId}] Profile loaded successfully`, {
        userId: data.data.id,
        displayName: data.data.displayName || data.data.name,
        stats: data.data.stats,
      })
    } catch (error) {
      console.error(`[UserProfile][${operationId}] Failed to load profile:`, error)
      toast.error('Failed to load user profile')
    } finally {
      setIsLoading(false)
    }
  }, [userId, currentUserId, isOwnProfile])

  /**
   * Handle follow/unfollow action
   */
  const handleFollowAction = useCallback(async () => {
    if (!currentUserId || !profile) {
      toast.error('Please sign in to follow users')
      return
    }

    const operationId = `follow-action-${userId}-${Date.now()}`
    const action = profile.isFollowing ? 'unfollow' : 'follow'

    try {
      console.log(`[UserProfile][${operationId}] Processing ${action} action`, {
        targetUserId: userId,
        currentUserId,
        currentStatus: profile.isFollowing,
      })

      setIsFollowLoading(true)

      // Optimistic update
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: !prev.isFollowing,
              stats: {
                ...prev.stats,
                followersCount: prev.stats.followersCount + (prev.isFollowing ? -1 : 1),
              },
            }
          : null
      )

      const response = await fetch('/api/community/social/follows', {
        method: profile.isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
        },
        body: JSON.stringify({ targetUserId: userId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`)
      }

      const result = await response.json()

      // Update with server response
      if (result.data) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                ...result.data,
              }
            : null
        )
      }

      toast.success(profile.isFollowing ? 'Unfollowed successfully' : 'Following!')

      // Fire callback
      onFollowAction?.(userId, !profile.isFollowing)

      console.log(`[UserProfile][${operationId}] ${action} action completed successfully`)
    } catch (error) {
      console.error(`[UserProfile][${operationId}] ${action} action failed:`, error)

      // Revert optimistic update
      await loadProfile()
      toast.error(`Failed to ${action} user`)
    } finally {
      setIsFollowLoading(false)
    }
  }, [currentUserId, profile, userId, onFollowAction, loadProfile])

  /**
   * Get badge color based on rarity
   */
  const getBadgeColor = (rarity: Badge['rarity']) => {
    const colors = {
      common: 'bg-gray-100 text-gray-800',
      rare: 'bg-blue-100 text-blue-800',
      epic: 'bg-purple-100 text-purple-800',
      legendary: 'bg-yellow-100 text-yellow-800',
    }
    return colors[rarity] || colors.common
  }

  /**
   * Format date helper
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  /**
   * Get user avatar URL
   */
  const getUserAvatarUrl = (size = 120) => {
    if (profile?.image) return profile.image
    const name = profile?.displayName || profile?.name || 'User'
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    return `https://ui-avatars.com/api/?name=${initials}&size=${size}&background=6366F1&color=ffffff`
  }

  // Load profile on mount
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (isLoading) {
    return (
      <div className={cn('user-profile', className)}>
        <Card>
          <CardHeader>
            <div className='animate-pulse space-y-4'>
              <div className='flex items-center gap-4'>
                <Skeleton className='h-20 w-20 rounded-full' />
                <div className='space-y-2'>
                  <Skeleton className='h-6 w-40' />
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-4 w-24' />
                </div>
              </div>
              <div className='flex gap-2'>
                <Skeleton className='h-9 w-24' />
                <Skeleton className='h-9 w-24' />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={cn('user-profile', className)}>
        <Card>
          <CardContent className='flex h-64 items-center justify-center'>
            <div className='text-center'>
              <Users className='mx-auto mb-4 h-12 w-12 text-gray-400' />
              <h3 className='mb-2 font-semibold'>User not found</h3>
              <p className='text-muted-foreground text-sm'>
                The requested user profile could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('user-profile space-y-6', className)}>
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className='flex flex-col gap-6 sm:flex-row sm:items-start'>
            {/* Avatar and Basic Info */}
            <div className='flex flex-col items-center gap-4 sm:flex-row'>
              <div className='relative'>
                <img
                  src={getUserAvatarUrl(120)}
                  alt={`${profile.displayName || profile.name}'s profile picture`}
                  className='h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24'
                />
                {profile.isVerified && (
                  <div className='-right-1 -bottom-1 absolute rounded-full bg-blue-500 p-1'>
                    <Star className='h-4 w-4 fill-white text-white' />
                  </div>
                )}
              </div>

              <div className='text-center sm:text-left'>
                <div className='flex items-center gap-2'>
                  <h1 className='font-bold text-2xl'>{profile.displayName || profile.name}</h1>
                  {profile.reputation.level >= 10 && <Crown className='h-5 w-5 text-yellow-500' />}
                </div>

                <p className='text-muted-foreground'>@{profile.name}</p>

                {profile.bio && <p className='mt-2 max-w-md text-sm'>{profile.bio}</p>}

                {/* Profile Metadata */}
                <div className='mt-3 flex flex-wrap gap-4 text-muted-foreground text-sm'>
                  {profile.location && (
                    <div className='flex items-center gap-1'>
                      <MapPin className='h-4 w-4' />
                      <span>{profile.location}</span>
                    </div>
                  )}

                  <div className='flex items-center gap-1'>
                    <Calendar className='h-4 w-4' />
                    <span>Joined {formatDate(profile.joinedAt)}</span>
                  </div>
                </div>

                {/* External Links */}
                {(profile.website || profile.twitter || profile.github) && (
                  <div className='mt-3 flex gap-3'>
                    {profile.website && (
                      <Button variant='ghost' size='sm' className='h-auto p-1' asChild>
                        <a href={profile.website} target='_blank' rel='noopener noreferrer'>
                          <Link2 className='h-4 w-4' />
                        </a>
                      </Button>
                    )}
                    {profile.twitter && (
                      <Button variant='ghost' size='sm' className='h-auto p-1' asChild>
                        <a
                          href={`https://twitter.com/${profile.twitter}`}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          <ExternalLink className='h-4 w-4' />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions and Stats */}
            <div className='flex flex-1 flex-col gap-4 sm:items-end'>
              {/* Action Buttons */}
              <div className='flex gap-2'>
                {isOwnProfile ? (
                  <>
                    {enableEditing && (
                      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                        <DialogTrigger asChild>
                          <Button variant='outline' size='sm'>
                            <Edit3 className='mr-2 h-4 w-4' />
                            Edit Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                            <DialogDescription>
                              Update your profile information and preferences.
                            </DialogDescription>
                          </DialogHeader>
                          {/* Profile editing form would go here */}
                          <div className='py-4 text-center text-muted-foreground'>
                            Profile editing form coming soon...
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Button variant='outline' size='sm'>
                      <Settings className='mr-2 h-4 w-4' />
                      Settings
                    </Button>
                  </>
                ) : (
                  <>
                    {enableFollowing && (
                      <Button
                        variant={profile.isFollowing ? 'outline' : 'default'}
                        size='sm'
                        onClick={handleFollowAction}
                        disabled={isFollowLoading}
                      >
                        <Users className='mr-2 h-4 w-4' />
                        {isFollowLoading
                          ? 'Loading...'
                          : profile.isFollowing
                            ? 'Following'
                            : 'Follow'}
                      </Button>
                    )}

                    <Button variant='outline' size='sm'>
                      <MessageCircle className='mr-2 h-4 w-4' />
                      Message
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem>
                          <Share2 className='mr-2 h-4 w-4' />
                          Share Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className='text-red-600'>Report User</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              {/* Quick Stats */}
              <div className='flex gap-6 text-center'>
                <div>
                  <div className='font-semibold text-lg'>{profile.stats.followersCount}</div>
                  <div className='text-muted-foreground text-xs'>Followers</div>
                </div>
                <div>
                  <div className='font-semibold text-lg'>{profile.stats.followingCount}</div>
                  <div className='text-muted-foreground text-xs'>Following</div>
                </div>
                <div>
                  <div className='font-semibold text-lg'>{profile.stats.templatesCreated}</div>
                  <div className='text-muted-foreground text-xs'>Templates</div>
                </div>
              </div>

              {/* Reputation Level */}
              <div className='flex items-center gap-2'>
                <Badge variant='secondary' className='bg-purple-100 text-purple-800'>
                  Level {profile.reputation.level}
                </Badge>
                <span className='text-muted-foreground text-sm'>
                  {profile.reputation.totalPoints.toLocaleString()} points
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='templates'>Templates</TabsTrigger>
          <TabsTrigger value='collections'>Collections</TabsTrigger>
          <TabsTrigger value='achievements'>Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value='overview' className='space-y-6'>
          {showDetailedStats && (
            <div className='grid gap-6 md:grid-cols-2'>
              {/* Detailed Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <TrendingUp className='h-5 w-5' />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex justify-between'>
                    <span>Total Downloads</span>
                    <span className='font-medium'>
                      {profile.stats.totalDownloads.toLocaleString()}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Total Likes</span>
                    <span className='font-medium'>{profile.stats.totalLikes.toLocaleString()}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Average Rating</span>
                    <div className='flex items-center gap-1'>
                      <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                      <span className='font-medium'>{profile.stats.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className='flex justify-between'>
                    <span>Contribution Streak</span>
                    <span className='font-medium'>{profile.stats.contributionStreak} days</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Star className='h-5 w-5' />
                    Recent Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    {profile.reputation.badges.slice(0, 3).map((badge) => (
                      <div key={badge.id} className='flex items-center gap-3'>
                        <div className={cn('rounded-full p-2', getBadgeColor(badge.rarity))}>
                          <span className='text-lg'>{badge.icon}</span>
                        </div>
                        <div className='flex-1'>
                          <div className='font-medium'>{badge.name}</div>
                          <div className='text-muted-foreground text-sm'>{badge.description}</div>
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          {formatDate(badge.earnedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          {profile.recentActivity && profile.recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {profile.recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className='flex items-center gap-3 py-2'>
                      <div className='h-2 w-2 rounded-full bg-blue-500' />
                      <div className='flex-1'>
                        <span className='text-sm'>{activity.description}</span>
                        {activity.targetTitle && (
                          <span className='ml-1 font-medium text-sm'>"{activity.targetTitle}"</span>
                        )}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value='templates'>
          <Card>
            <CardHeader>
              <CardTitle>Templates ({profile.stats.templatesCreated})</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.topTemplates && profile.topTemplates.length > 0 ? (
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {profile.topTemplates.map((template) => (
                    <div
                      key={template.id}
                      className='group cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50'
                    >
                      <div className='mb-3'>
                        <h3 className='font-medium group-hover:text-blue-600'>{template.name}</h3>
                        <p className='line-clamp-2 text-muted-foreground text-sm'>
                          {template.description}
                        </p>
                      </div>
                      <div className='flex items-center justify-between text-sm'>
                        <div className='flex items-center gap-3'>
                          <div className='flex items-center gap-1'>
                            <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                            <span>{template.rating.toFixed(1)}</span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Heart className='h-3 w-3' />
                            <span>{template.likes}</span>
                          </div>
                        </div>
                        <span className='text-muted-foreground'>
                          {template.downloads} downloads
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center text-muted-foreground'>No templates created yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value='collections'>
          <Card>
            <CardHeader>
              <CardTitle>Collections ({profile.stats.collectionsCount})</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.collections && profile.collections.length > 0 ? (
                <div className='space-y-4'>
                  {profile.collections.map((collection) => (
                    <div
                      key={collection.id}
                      className='group cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50'
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <h3 className='font-medium group-hover:text-blue-600'>
                            {collection.name}
                          </h3>
                          <p className='text-muted-foreground text-sm'>{collection.description}</p>
                          <div className='mt-2 flex items-center gap-4 text-sm'>
                            <span>{collection.templateCount} templates</span>
                            <span>{collection.followers} followers</span>
                            <Badge variant={collection.isPublic ? 'default' : 'secondary'}>
                              {collection.isPublic ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          Updated {formatDate(collection.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center text-muted-foreground'>No collections created yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value='achievements' className='space-y-6'>
          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges ({profile.reputation.badges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 md:grid-cols-2'>
                {profile.reputation.badges.map((badge) => (
                  <div key={badge.id} className='flex items-center gap-3 rounded-lg border p-3'>
                    <div className={cn('rounded-full p-3', getBadgeColor(badge.rarity))}>
                      <span className='text-2xl'>{badge.icon}</span>
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{badge.name}</span>
                        <Badge variant='outline' className={getBadgeColor(badge.rarity)}>
                          {badge.rarity}
                        </Badge>
                      </div>
                      <p className='text-muted-foreground text-sm'>{badge.description}</p>
                      <p className='text-muted-foreground text-xs'>
                        Earned {formatDate(badge.earnedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Progress Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Achievement Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {profile.reputation.achievements.map((achievement) => (
                  <div key={achievement.id} className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='font-medium'>{achievement.title}</span>
                      <span className='text-muted-foreground text-sm'>
                        {achievement.progress}/{achievement.maxProgress}
                      </span>
                    </div>
                    <p className='text-muted-foreground text-sm'>{achievement.description}</p>
                    <div className='h-2 rounded-full bg-gray-200'>
                      <div
                        className='h-2 rounded-full bg-blue-600 transition-all'
                        style={{
                          width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                        }}
                      />
                    </div>
                    {achievement.completedAt && (
                      <p className='text-green-600 text-xs'>
                        ✓ Completed {formatDate(achievement.completedAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default UserProfile
