/**
 * Quick Actions - Discussion Interface Action Buttons
 *
 * Provides quick access actions for community engagement:
 * - Ask new question with category pre-selection
 * - Advanced search with saved queries
 * - Filter shortcuts and popular categories
 * - User-specific actions (bookmarks, notifications)
 * - Expert consultation and direct messaging
 *
 * Adapts based on user authentication and reputation level.
 * Provides contextual actions based on current page state.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Bell,
  Bookmark,
  BookOpen,
  ChevronDown,
  Cpu,
  Database,
  Filter,
  HelpCircle,
  MessageCircle,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface QuickActionsProps {
  userId?: string
}

interface QuickCategory {
  id: string
  name: string
  icon: React.ComponentType<any>
  color: string
  count: number
}

interface UserNotification {
  id: string
  type: 'reply' | 'mention' | 'answer' | 'badge'
  message: string
  isRead: boolean
  createdAt: string
}

/**
 * Quick Actions Component
 *
 * Provides contextual action buttons including:
 * - Primary action: Ask Question with category suggestions
 * - Secondary actions: Search, Filter shortcuts, Bookmarks
 * - User notifications and activity indicators
 * - Expert consultation quick access
 * - Popular categories for quick filtering
 */
export function QuickActions({ userId }: QuickActionsProps) {
  const [quickCategories, setQuickCategories] = useState<QuickCategory[]>([])
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchQuickActionsData = async () => {
      try {
        setIsLoading(true)

        // TODO: Replace with actual API calls
        // const [categoriesRes, notificationsRes] = await Promise.all([
        //   fetch('/api/community/categories/popular'),
        //   userId ? fetch(`/api/community/notifications/${userId}`) : Promise.resolve(null)
        // ])

        // Mock data for development
        setQuickCategories([
          {
            id: 'integrations',
            name: 'Integrations',
            icon: Zap,
            color: '#3B82F6',
            count: 234,
          },
          {
            id: 'data-processing',
            name: 'Data Processing',
            icon: Database,
            color: '#10B981',
            count: 186,
          },
          {
            id: 'automation',
            name: 'Automation',
            icon: Cpu,
            color: '#8B5CF6',
            count: 312,
          },
          {
            id: 'troubleshooting',
            name: 'Troubleshooting',
            icon: AlertCircle,
            color: '#F59E0B',
            count: 145,
          },
        ])

        if (userId) {
          const mockNotifications: UserNotification[] = [
            {
              id: 'notif1',
              type: 'reply',
              message: 'Sarah Chen replied to your question about API rate limiting',
              isRead: false,
              createdAt: '2024-01-15T10:30:00Z',
            },
            {
              id: 'notif2',
              type: 'answer',
              message: 'Your answer was accepted as the best solution',
              isRead: false,
              createdAt: '2024-01-15T09:15:00Z',
            },
            {
              id: 'notif3',
              type: 'badge',
              message: 'You earned the "Helpful Reviewer" badge!',
              isRead: true,
              createdAt: '2024-01-14T16:20:00Z',
            },
          ]

          setNotifications(mockNotifications)
          setUnreadCount(mockNotifications.filter((n) => !n.isRead).length)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch quick actions data:', error)
        setIsLoading(false)
      }
    }

    fetchQuickActionsData()
  }, [userId])

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // TODO: Implement actual API call
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center gap-2'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='h-10 w-24 animate-pulse rounded bg-gray-200' />
        ))}
      </div>
    )
  }

  return (
    <div className='flex items-center gap-3'>
      {/* Primary Action: Ask Question */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className='bg-indigo-600 text-white hover:bg-indigo-700'>
            <Plus className='mr-2 h-4 w-4' />
            Ask Question
            <ChevronDown className='ml-2 h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel>Ask in Category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {quickCategories.map((category) => (
            <DropdownMenuItem key={category.id} asChild>
              <Link
                href={`/community/questions/ask?category=${category.id}`}
                className='flex items-center gap-2'
              >
                <category.icon className='h-4 w-4' style={{ color: category.color }} />
                <span className='flex-1'>{category.name}</span>
                <Badge variant='secondary' className='text-xs'>
                  {category.count}
                </Badge>
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href='/community/questions/ask' className='flex items-center gap-2'>
              <HelpCircle className='h-4 w-4' />
              General Question
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href='/community/knowledge/create' className='flex items-center gap-2'>
              <BookOpen className='h-4 w-4' />
              Write Article
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search Button */}
      <Button variant='outline' asChild>
        <Link href='/community/search'>
          <Search className='mr-2 h-4 w-4' />
          Search
        </Link>
      </Button>

      {/* User-specific Actions (if logged in) */}
      {userId && (
        <>
          {/* Bookmarks */}
          <Button variant='outline' size='sm' asChild>
            <Link href='/community/my/bookmarks'>
              <Bookmark className='h-4 w-4' />
            </Link>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='relative'>
                <Bell className='h-4 w-4' />
                {unreadCount > 0 && (
                  <Badge className='-top-2 -right-2 absolute flex h-5 w-5 items-center justify-center bg-red-500 p-0 text-white text-xs'>
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-80'>
              <DropdownMenuLabel className='flex items-center justify-between'>
                Notifications
                {unreadCount > 0 && (
                  <Badge variant='secondary' className='text-xs'>
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {notifications.length === 0 ? (
                <div className='p-4 text-center text-gray-500 text-sm dark:text-gray-400'>
                  No notifications yet
                </div>
              ) : (
                <div className='max-h-64 overflow-y-auto'>
                  {notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`cursor-pointer p-3 ${
                        !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className='flex w-full items-start gap-3'>
                        <div className='mt-1 flex-shrink-0'>
                          {notification.type === 'reply' && (
                            <MessageCircle className='h-4 w-4 text-blue-500' />
                          )}
                          {notification.type === 'answer' && (
                            <Star className='h-4 w-4 text-green-500' />
                          )}
                          {notification.type === 'badge' && (
                            <Badge className='h-4 w-4 text-purple-500' />
                          )}
                          {notification.type === 'mention' && (
                            <Users className='h-4 w-4 text-orange-500' />
                          )}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='line-clamp-2 text-gray-900 text-sm dark:text-white'>
                            {notification.message}
                          </p>
                          <p className='mt-1 text-gray-500 text-xs dark:text-gray-400'>
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className='mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500' />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}

              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href='/community/notifications'
                      className='text-center text-indigo-600 hover:text-indigo-700'
                    >
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Filter Shortcuts (smaller screens) */}
      <div className='md:hidden'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              <Filter className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href='/community/discussions?status=unanswered'>
                <HelpCircle className='mr-2 h-4 w-4' />
                Unanswered
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href='/community/discussions?status=trending'>
                <TrendingUp className='mr-2 h-4 w-4' />
                Trending
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href='/community/discussions?status=featured'>
                <Star className='mr-2 h-4 w-4' />
                Featured
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href='/community/discussions?sort=votes'>
                <TrendingUp className='mr-2 h-4 w-4' />
                Most Voted
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expert Consultation (for authenticated users with sufficient reputation) */}
      {userId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='hidden lg:flex'>
              <Users className='mr-2 h-4 w-4' />
              Experts
              <ChevronDown className='ml-2 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuLabel>Expert Services</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href='/community/experts'>
                <Users className='mr-2 h-4 w-4' />
                Browse Experts
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href='/community/consultation'>
                <MessageCircle className='mr-2 h-4 w-4' />
                Request Consultation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href='/community/experts/apply'>
                <Star className='mr-2 h-4 w-4' />
                Become an Expert
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
