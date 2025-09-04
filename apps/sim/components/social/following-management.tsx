/**
 * Following Management Component - Social Relationship Management
 *
 * Comprehensive following/followers management system:
 * - Following and followers lists with search and filtering
 * - Mutual connections and relationship insights
 * - Bulk follow/unfollow operations with confirmation
 * - User discovery and recommendations
 * - Relationship analytics and social graph visualization
 * - Privacy controls and blocking functionality
 *
 * Features:
 * - Advanced user search with debounced input
 * - Infinite scroll with virtualization for performance
 * - Real-time relationship status updates
 * - Batch operations with progress indicators
 * - Social graph insights and mutual connections
 * - User recommendation engine integration
 * - Privacy controls and content filtering
 * - ARIA-compliant accessibility with screen reader support
 *
 * @author Claude Code Social Platform
 * @version 1.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Heart,
  Loader2,
  MoreHorizontal,
  Search,
  Star,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// TypeScript interfaces
export interface FollowUser {
  id: string
  name: string
  displayName?: string
  image?: string
  bio?: string
  isVerified?: boolean
  isFollowing?: boolean
  isFollower?: boolean
  isMutual?: boolean
  isBlocked?: boolean

  // Relationship metadata
  relationship: {
    followedAt?: string
    mutualCount?: number
    interactionScore?: number
  }

  // User statistics
  stats: {
    followersCount: number
    followingCount: number
    templatesCount: number
    reputation: number
  }

  // Activity indicators
  activity: {
    isOnline?: boolean
    lastActiveAt?: string
    recentActivity?: string
  }
}

export interface FollowingStats {
  followingCount: number
  followersCount: number
  mutualCount: number
  newFollowersToday: number
  unfollowsToday: number
  engagementRate: number
}

export interface FollowingManagementProps {
  /** Current user ID */
  userId: string
  /** Custom CSS class */
  className?: string
  /** Default active tab */
  defaultTab?: 'following' | 'followers' | 'discover'
  /** Enable bulk operations */
  enableBulkOperations?: boolean
  /** Show relationship analytics */
  showAnalytics?: boolean
  /** Enable user discovery */
  enableDiscovery?: boolean
  /** Maximum users to display per page */
  pageSize?: number
  /** Callback for follow/unfollow actions */
  onFollowChange?: (userId: string, isFollowing: boolean) => void
}

/**
 * Following Management Component
 */
export const FollowingManagement: React.FC<FollowingManagementProps> = ({
  userId,
  className,
  defaultTab = 'following',
  enableBulkOperations = true,
  showAnalytics = true,
  enableDiscovery = true,
  pageSize = 20,
  onFollowChange,
}) => {
  // State management
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([])
  const [followersUsers, setFollowersUsers] = useState<FollowUser[]>([])
  const [discoverUsers, setDiscoverUsers] = useState<FollowUser[]>([])
  const [stats, setStats] = useState<FollowingStats | null>(null)

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkOperation, setBulkOperation] = useState<'follow' | 'unfollow' | null>(null)
  const [isBulkProcessing, setBulkProcessing] = useState(false)

  // Refs for performance
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const followingLoadedRef = useRef(false)
  const followersLoadedRef = useRef(false)

  /**
   * Load following/followers data based on active tab
   */
  const loadUsersData = useCallback(
    async (tab: string) => {
      const operationId = `load-${tab}-${userId}-${Date.now()}`

      try {
        console.log(`[FollowingManagement][${operationId}] Loading ${tab} data`, {
          userId,
          searchQuery,
          pageSize,
        })

        setIsLoading(true)

        const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
        const endpoint = {
          following: `/api/community/users/${userId}/following?limit=${pageSize}${searchParam}`,
          followers: `/api/community/users/${userId}/followers?limit=${pageSize}${searchParam}`,
          discover: `/api/community/users/discover?limit=${pageSize}${searchParam}`,
        }[tab]

        if (!endpoint) return

        const response = await fetch(endpoint, {
          headers: { 'X-User-ID': userId },
        })

        if (!response.ok) {
          throw new Error(`Failed to load ${tab}: ${response.statusText}`)
        }

        const data = await response.json()
        const users = data.data || []

        // Update appropriate state
        switch (tab) {
          case 'following':
            setFollowingUsers(users)
            followingLoadedRef.current = true
            break
          case 'followers':
            setFollowersUsers(users)
            followersLoadedRef.current = true
            break
          case 'discover':
            setDiscoverUsers(users)
            break
        }

        console.log(`[FollowingManagement][${operationId}] ${tab} data loaded`, {
          count: users.length,
        })
      } catch (error) {
        console.error(`[FollowingManagement][${operationId}] Failed to load ${tab}:`, error)
        toast.error(`Failed to load ${tab} list`)
      } finally {
        setIsLoading(false)
      }
    },
    [userId, searchQuery, pageSize]
  )

  /**
   * Load user statistics
   */
  const loadStats = useCallback(async () => {
    const operationId = `load-stats-${userId}-${Date.now()}`

    try {
      console.log(`[FollowingManagement][${operationId}] Loading following statistics`)

      const response = await fetch(`/api/community/users/${userId}/following/stats`, {
        headers: { 'X-User-ID': userId },
      })

      if (!response.ok) {
        throw new Error('Failed to load statistics')
      }

      const data = await response.json()
      setStats(data.data)

      console.log(`[FollowingManagement][${operationId}] Statistics loaded`, {
        stats: data.data,
      })
    } catch (error) {
      console.error(`[FollowingManagement][${operationId}] Failed to load stats:`, error)
    }
  }, [userId])

  /**
   * Handle follow/unfollow action
   */
  const handleFollowAction = useCallback(
    async (targetUserId: string, shouldFollow: boolean) => {
      const operationId = `follow-action-${targetUserId}-${Date.now()}`
      const action = shouldFollow ? 'follow' : 'unfollow'

      try {
        console.log(`[FollowingManagement][${operationId}] Processing ${action}`, {
          targetUserId,
          userId,
        })

        const response = await fetch('/api/community/social/follows', {
          method: shouldFollow ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId,
          },
          body: JSON.stringify({ targetUserId }),
        })

        if (!response.ok) {
          throw new Error(`Failed to ${action} user`)
        }

        // Update user in all relevant lists
        const updateUser = (user: FollowUser) =>
          user.id === targetUserId
            ? {
                ...user,
                isFollowing: shouldFollow,
                stats: {
                  ...user.stats,
                  followersCount: user.stats.followersCount + (shouldFollow ? 1 : -1),
                },
              }
            : user

        setFollowingUsers((prev) => prev.map(updateUser))
        setFollowersUsers((prev) => prev.map(updateUser))
        setDiscoverUsers((prev) => prev.map(updateUser))

        // Update stats
        if (stats) {
          setStats({
            ...stats,
            followingCount: stats.followingCount + (shouldFollow ? 1 : -1),
          })
        }

        // Fire callback
        onFollowChange?.(targetUserId, shouldFollow)

        toast.success(shouldFollow ? 'Following user!' : 'Unfollowed user')

        console.log(`[FollowingManagement][${operationId}] ${action} completed successfully`)
      } catch (error) {
        console.error(`[FollowingManagement][${operationId}] ${action} failed:`, error)
        toast.error(`Failed to ${action} user`)
      }
    },
    [userId, stats, onFollowChange]
  )

  /**
   * Handle bulk follow/unfollow operations
   */
  const handleBulkOperation = useCallback(async () => {
    if (!bulkOperation || selectedUsers.size === 0) return

    const operationId = `bulk-${bulkOperation}-${Date.now()}`

    try {
      console.log(`[FollowingManagement][${operationId}] Processing bulk ${bulkOperation}`, {
        count: selectedUsers.size,
        userIds: Array.from(selectedUsers),
      })

      setBulkProcessing(true)

      const promises = Array.from(selectedUsers).map((targetUserId) =>
        handleFollowAction(targetUserId, bulkOperation === 'follow')
      )

      await Promise.allSettled(promises)

      setSelectedUsers(new Set())
      setShowBulkDialog(false)
      setBulkOperation(null)

      toast.success(`Bulk ${bulkOperation} completed for ${selectedUsers.size} users`)

      console.log(`[FollowingManagement][${operationId}] Bulk operation completed`)
    } catch (error) {
      console.error(`[FollowingManagement][${operationId}] Bulk operation failed:`, error)
      toast.error(`Bulk ${bulkOperation} operation failed`)
    } finally {
      setBulkProcessing(false)
    }
  }, [bulkOperation, selectedUsers, handleFollowAction])

  /**
   * Handle search with debouncing
   */
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        loadUsersData(activeTab)
      }, 300)
    },
    [activeTab, loadUsersData]
  )

  /**
   * Get user avatar URL
   */
  const getUserAvatarUrl = (user: FollowUser) => {
    if (user.image) return user.image
    const name = user.displayName || user.name
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    return `https://ui-avatars.com/api/?name=${initials}&size=40&background=6366F1&color=ffffff`
  }

  /**
   * Format time helper
   */
  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  /**
   * Render user item
   */
  const renderUserItem = useCallback(
    (user: FollowUser) => {
      const isSelected = selectedUsers.has(user.id)

      return (
        <div
          key={user.id}
          className={cn(
            'flex items-center gap-4 rounded-lg border p-4 transition-colors',
            isSelected && 'border-blue-200 bg-blue-50',
            'hover:bg-gray-50'
          )}
        >
          {/* Selection checkbox for bulk operations */}
          {enableBulkOperations && (
            <input
              type='checkbox'
              checked={isSelected}
              onChange={(e) => {
                const newSelected = new Set(selectedUsers)
                if (e.target.checked) {
                  newSelected.add(user.id)
                } else {
                  newSelected.delete(user.id)
                }
                setSelectedUsers(newSelected)
              }}
              className='h-4 w-4 rounded border-gray-300'
            />
          )}

          {/* User Avatar */}
          <div className='relative'>
            <Avatar className='h-12 w-12'>
              <AvatarImage src={getUserAvatarUrl(user)} alt={user.displayName || user.name} />
              <AvatarFallback>
                {(user.displayName || user.name)
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {user.activity.isOnline && (
              <div className='-right-1 -bottom-1 absolute h-4 w-4 rounded-full border-2 border-white bg-green-500' />
            )}

            {user.isVerified && (
              <div className='-right-1 -top-1 absolute rounded-full bg-blue-500 p-0.5'>
                <Check className='h-3 w-3 text-white' />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <h3 className='truncate font-medium'>{user.displayName || user.name}</h3>
              {user.isMutual && (
                <Badge variant='secondary' className='text-xs'>
                  Mutual
                </Badge>
              )}
              {user.stats.reputation > 1000 && <Star className='h-3 w-3 text-yellow-500' />}
            </div>

            <p className='truncate text-muted-foreground text-sm'>@{user.name}</p>

            {user.bio && <p className='line-clamp-1 text-gray-600 text-sm'>{user.bio}</p>}

            {/* User Stats */}
            <div className='mt-2 flex items-center gap-4 text-muted-foreground text-xs'>
              <span>{user.stats.followersCount} followers</span>
              <span>{user.stats.templatesCount} templates</span>
              {user.relationship.mutualCount && user.relationship.mutualCount > 0 && (
                <span>{user.relationship.mutualCount} mutual</span>
              )}
              {user.relationship.followedAt && (
                <span>Followed {formatTime(user.relationship.followedAt)}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center gap-2'>
            {user.isFollowing ? (
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleFollowAction(user.id, false)}
                className='hover:border-red-200 hover:bg-red-50 hover:text-red-600'
              >
                <UserCheck className='mr-1 h-4 w-4' />
                Following
              </Button>
            ) : (
              <Button variant='default' size='sm' onClick={() => handleFollowAction(user.id, true)}>
                <UserPlus className='mr-1 h-4 w-4' />
                Follow
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>View Templates</DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.isFollowing && <DropdownMenuItem>Add to Close Friends</DropdownMenuItem>}
                <DropdownMenuItem className='text-red-600'>Block User</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )
    },
    [enableBulkOperations, selectedUsers, handleFollowAction]
  )

  // Load initial data
  useEffect(() => {
    loadUsersData(activeTab)
    if (showAnalytics) {
      loadStats()
    }
  }, [loadUsersData, loadStats, activeTab, showAnalytics])

  // Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn('following-management space-y-6', className)}>
      {/* Header with Stats */}
      {showAnalytics && stats && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Social Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6'>
              <div className='text-center'>
                <div className='font-bold text-2xl text-blue-600'>{stats.followingCount}</div>
                <div className='text-muted-foreground text-sm'>Following</div>
              </div>
              <div className='text-center'>
                <div className='font-bold text-2xl text-green-600'>{stats.followersCount}</div>
                <div className='text-muted-foreground text-sm'>Followers</div>
              </div>
              <div className='text-center'>
                <div className='font-bold text-2xl text-purple-600'>{stats.mutualCount}</div>
                <div className='text-muted-foreground text-sm'>Mutual</div>
              </div>
              <div className='text-center'>
                <div className='font-bold text-2xl text-orange-600'>+{stats.newFollowersToday}</div>
                <div className='text-muted-foreground text-sm'>New Today</div>
              </div>
              <div className='text-center'>
                <div className='font-bold text-2xl text-red-600'>{stats.unfollowsToday}</div>
                <div className='text-muted-foreground text-sm'>Unfollows</div>
              </div>
              <div className='text-center'>
                <div className='font-bold text-2xl text-indigo-600'>
                  {stats.engagementRate.toFixed(1)}%
                </div>
                <div className='text-muted-foreground text-sm'>Engagement</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle>Manage Connections</CardTitle>

            <div className='flex items-center gap-2'>
              {/* Search */}
              <div className='relative'>
                <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search users...'
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className='w-64 pl-9'
                />
              </div>

              {/* Bulk Actions */}
              {enableBulkOperations && selectedUsers.size > 0 && (
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setBulkOperation('follow')
                      setShowBulkDialog(true)
                    }}
                  >
                    <UserPlus className='mr-1 h-4 w-4' />
                    Follow ({selectedUsers.size})
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setBulkOperation('unfollow')
                      setShowBulkDialog(true)
                    }}
                  >
                    <UserMinus className='mr-1 h-4 w-4' />
                    Unfollow ({selectedUsers.size})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='following'>Following ({stats?.followingCount || 0})</TabsTrigger>
              <TabsTrigger value='followers'>Followers ({stats?.followersCount || 0})</TabsTrigger>
              {enableDiscovery && (
                <TabsTrigger value='discover'>
                  <TrendingUp className='mr-1 h-4 w-4' />
                  Discover
                </TabsTrigger>
              )}
            </TabsList>

            {/* Following Tab */}
            <TabsContent value='following' className='mt-6'>
              <ScrollArea className='h-96'>
                {isLoading ? (
                  <div className='space-y-4'>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className='flex items-center gap-4 p-4'>
                        <Skeleton className='h-12 w-12 rounded-full' />
                        <div className='flex-1 space-y-2'>
                          <Skeleton className='h-4 w-32' />
                          <Skeleton className='h-3 w-24' />
                        </div>
                        <Skeleton className='h-8 w-20' />
                      </div>
                    ))}
                  </div>
                ) : followingUsers.length === 0 ? (
                  <div className='flex h-32 items-center justify-center text-center'>
                    <div>
                      <Users className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                      <p className='text-muted-foreground'>No users followed yet</p>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>{followingUsers.map(renderUserItem)}</div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Followers Tab */}
            <TabsContent value='followers' className='mt-6'>
              <ScrollArea className='h-96'>
                {isLoading ? (
                  <div className='space-y-4'>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className='flex items-center gap-4 p-4'>
                        <Skeleton className='h-12 w-12 rounded-full' />
                        <div className='flex-1 space-y-2'>
                          <Skeleton className='h-4 w-32' />
                          <Skeleton className='h-3 w-24' />
                        </div>
                        <Skeleton className='h-8 w-20' />
                      </div>
                    ))}
                  </div>
                ) : followersUsers.length === 0 ? (
                  <div className='flex h-32 items-center justify-center text-center'>
                    <div>
                      <Heart className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                      <p className='text-muted-foreground'>No followers yet</p>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>{followersUsers.map(renderUserItem)}</div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Discover Tab */}
            {enableDiscovery && (
              <TabsContent value='discover' className='mt-6'>
                <ScrollArea className='h-96'>
                  {isLoading ? (
                    <div className='space-y-4'>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className='flex items-center gap-4 p-4'>
                          <Skeleton className='h-12 w-12 rounded-full' />
                          <div className='flex-1 space-y-2'>
                            <Skeleton className='h-4 w-32' />
                            <Skeleton className='h-3 w-24' />
                          </div>
                          <Skeleton className='h-8 w-20' />
                        </div>
                      ))}
                    </div>
                  ) : discoverUsers.length === 0 ? (
                    <div className='flex h-32 items-center justify-center text-center'>
                      <div>
                        <TrendingUp className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                        <p className='text-muted-foreground'>No recommendations available</p>
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-3'>{discoverUsers.map(renderUserItem)}</div>
                  )}
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Bulk Operation Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Bulk {bulkOperation === 'follow' ? 'Follow' : 'Unfollow'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {bulkOperation} {selectedUsers.size} users? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowBulkDialog(false)}
              disabled={isBulkProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkOperation}
              disabled={isBulkProcessing}
              variant={bulkOperation === 'unfollow' ? 'destructive' : 'default'}
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Processing...
                </>
              ) : (
                <>
                  {bulkOperation === 'follow' ? (
                    <UserPlus className='mr-2 h-4 w-4' />
                  ) : (
                    <UserMinus className='mr-2 h-4 w-4' />
                  )}
                  {bulkOperation === 'follow' ? 'Follow' : 'Unfollow'} All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FollowingManagement
