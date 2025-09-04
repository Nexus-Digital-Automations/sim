/**
 * Community Navigation - Sidebar Navigation Component
 *
 * Provides navigation for the community Q&A platform featuring:
 * - Category-based navigation for discussions and knowledge base
 * - Quick access to user's activity and contributions
 * - Community statistics and trending topics
 * - Search functionality and filters
 * - User reputation and badge showcase
 *
 * Integrates with existing authentication and user management systems.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import {
  Award,
  BookOpen,
  ChevronRight,
  Clock,
  Hash,
  HelpCircle,
  Home,
  MessageSquare,
  Search,
  Settings,
  Star,
  Tag,
  User,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface CommunityNavigationProps {
  userId?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  count?: number
  isActive?: boolean
}

interface Category {
  id: string
  name: string
  description: string
  postCount: number
  color: string
  icon: string
}

interface UserStats {
  reputation: number
  questionsAsked: number
  answersGiven: number
  articlesWritten: number
  badgeCount: number
  helpfulAnswers: number
}

/**
 * Community Navigation Sidebar
 *
 * Provides structured navigation including:
 * - Main navigation sections (Q&A, Knowledge Base, Experts)
 * - Category filters for focused browsing
 * - User activity summary and quick stats
 * - Trending topics and popular tags
 * - Quick action buttons for common tasks
 */
export function CommunityNavigation({ userId }: CommunityNavigationProps) {
  const pathname = usePathname()
  const [categories, setCategories] = useState<Category[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNavigationData = async () => {
      try {
        setIsLoading(true)

        // TODO: Replace with actual API calls
        // const [categoriesRes, userStatsRes] = await Promise.all([
        //   fetch('/api/community/categories'),
        //   userId ? fetch(`/api/community/users/${userId}/stats`) : Promise.resolve(null)
        // ])

        // Mock data for development
        setCategories([
          {
            id: 'integrations',
            name: 'Integrations',
            description: 'API connections and third-party integrations',
            postCount: 234,
            color: '#3B82F6',
            icon: 'Zap',
          },
          {
            id: 'data-processing',
            name: 'Data Processing',
            description: 'Data transformation, CSV, JSON handling',
            postCount: 186,
            color: '#10B981',
            icon: 'Database',
          },
          {
            id: 'automation',
            name: 'Automation',
            description: 'Workflow design and automation best practices',
            postCount: 312,
            color: '#8B5CF6',
            icon: 'Cpu',
          },
          {
            id: 'troubleshooting',
            name: 'Troubleshooting',
            description: 'Error handling and debugging help',
            postCount: 145,
            color: '#F59E0B',
            icon: 'AlertCircle',
          },
          {
            id: 'best-practices',
            name: 'Best Practices',
            description: 'Tips, guides, and optimization strategies',
            postCount: 89,
            color: '#EF4444',
            icon: 'Star',
          },
        ])

        if (userId) {
          setUserStats({
            reputation: 1245,
            questionsAsked: 8,
            answersGiven: 23,
            articlesWritten: 4,
            badgeCount: 7,
            helpfulAnswers: 19,
          })
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch navigation data:', error)
        setIsLoading(false)
      }
    }

    fetchNavigationData()
  }, [userId])

  const mainNavigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/community',
      icon: Home,
      isActive: pathname === '/community',
    },
    {
      name: 'Q&A Discussions',
      href: '/community/discussions',
      icon: MessageSquare,
      count: 1247,
      isActive: pathname.startsWith('/community/discussions'),
    },
    {
      name: 'Knowledge Base',
      href: '/community/knowledge',
      icon: BookOpen,
      count: 156,
      isActive: pathname.startsWith('/community/knowledge'),
    },
    {
      name: 'Community Experts',
      href: '/community/experts',
      icon: Users,
      count: 42,
      isActive: pathname.startsWith('/community/experts'),
    },
    {
      name: 'Ask Question',
      href: '/community/questions/ask',
      icon: HelpCircle,
      isActive: pathname === '/community/questions/ask',
    },
  ]

  const userNavigation: NavigationItem[] = userId
    ? [
        {
          name: 'My Activity',
          href: '/community/my/activity',
          icon: Clock,
          isActive: pathname.startsWith('/community/my/activity'),
        },
        {
          name: 'My Questions',
          href: '/community/my/questions',
          icon: MessageSquare,
          count: userStats?.questionsAsked,
          isActive: pathname.startsWith('/community/my/questions'),
        },
        {
          name: 'My Answers',
          href: '/community/my/answers',
          icon: MessageSquare,
          count: userStats?.answersGiven,
          isActive: pathname.startsWith('/community/my/answers'),
        },
        {
          name: 'My Articles',
          href: '/community/my/articles',
          icon: BookOpen,
          count: userStats?.articlesWritten,
          isActive: pathname.startsWith('/community/my/articles'),
        },
        {
          name: 'Settings',
          href: '/community/settings',
          icon: Settings,
          isActive: pathname.startsWith('/community/settings'),
        },
      ]
    : []

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <Card key={i} className='animate-pulse'>
            <CardContent className='p-4'>
              <div className='mb-2 h-4 w-3/4 rounded bg-gray-200' />
              <div className='h-4 w-1/2 rounded bg-gray-200' />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Main Navigation */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
            <Hash className='h-5 w-5 text-indigo-600' />
            Community Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <nav className='space-y-2'>
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 font-medium text-sm transition-colors',
                  item.isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                <div className='flex items-center gap-2'>
                  <item.icon className='h-4 w-4' />
                  {item.name}
                </div>
                <div className='flex items-center gap-1'>
                  {item.count && (
                    <Badge variant='secondary' className='text-xs'>
                      {item.count}
                    </Badge>
                  )}
                  <ChevronRight className='h-3 w-3 text-gray-400 group-hover:text-gray-600' />
                </div>
              </Link>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
            <Tag className='h-5 w-5 text-indigo-600' />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-3'>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/community/categories/${category.id}`}
                className='group block rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='mb-1 flex items-center gap-2'>
                      <div
                        className='h-3 w-3 rounded-full'
                        style={{ backgroundColor: category.color }}
                      />
                      <h4 className='font-medium text-gray-900 text-sm group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400'>
                        {category.name}
                      </h4>
                    </div>
                    <p className='line-clamp-2 text-gray-500 text-xs dark:text-gray-400'>
                      {category.description}
                    </p>
                  </div>
                  <Badge variant='outline' className='ml-2 text-xs'>
                    {category.postCount}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Stats (if logged in) */}
      {userId && userStats && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
              <User className='h-5 w-5 text-indigo-600' />
              My Community Stats
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-gray-600 text-sm dark:text-gray-300'>Reputation</span>
                <div className='flex items-center gap-1'>
                  <Star className='h-4 w-4 text-yellow-500' />
                  <span className='font-semibold text-sm'>{userStats.reputation}</span>
                </div>
              </div>

              <Separator />

              <div className='grid grid-cols-2 gap-4 text-center'>
                <div>
                  <div className='font-semibold text-gray-900 text-lg dark:text-white'>
                    {userStats.questionsAsked}
                  </div>
                  <div className='text-gray-500 text-xs dark:text-gray-400'>Questions</div>
                </div>
                <div>
                  <div className='font-semibold text-gray-900 text-lg dark:text-white'>
                    {userStats.answersGiven}
                  </div>
                  <div className='text-gray-500 text-xs dark:text-gray-400'>Answers</div>
                </div>
                <div>
                  <div className='font-semibold text-gray-900 text-lg dark:text-white'>
                    {userStats.articlesWritten}
                  </div>
                  <div className='text-gray-500 text-xs dark:text-gray-400'>Articles</div>
                </div>
                <div>
                  <div className='font-semibold text-gray-900 text-lg dark:text-white'>
                    {userStats.badgeCount}
                  </div>
                  <div className='text-gray-500 text-xs dark:text-gray-400'>Badges</div>
                </div>
              </div>

              <Separator />

              <nav className='space-y-1'>
                {userNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors',
                      item.isActive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    <div className='flex items-center gap-2'>
                      <item.icon className='h-4 w-4' />
                      {item.name}
                    </div>
                    {item.count !== undefined && (
                      <Badge variant='secondary' className='text-xs'>
                        {item.count}
                      </Badge>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='font-semibold text-lg'>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-2'>
            <Button asChild className='w-full justify-start' variant='outline'>
              <Link href='/community/questions/ask'>
                <HelpCircle className='mr-2 h-4 w-4' />
                Ask a Question
              </Link>
            </Button>
            <Button asChild className='w-full justify-start' variant='outline'>
              <Link href='/community/knowledge/create'>
                <BookOpen className='mr-2 h-4 w-4' />
                Write an Article
              </Link>
            </Button>
            <Button asChild className='w-full justify-start' variant='outline'>
              <Link href='/community/search'>
                <Search className='mr-2 h-4 w-4' />
                Search Community
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Community Guidelines */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
            <Award className='h-5 w-5 text-indigo-600' />
            Community Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-2 text-gray-600 text-sm dark:text-gray-300'>
            <p>• Be respectful and helpful to other members</p>
            <p>• Search before posting to avoid duplicates</p>
            <p>• Provide clear and detailed questions</p>
            <p>• Mark helpful answers and give feedback</p>
            <Link
              href='/community/guidelines'
              className='mt-2 inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400'
            >
              Read full guidelines
              <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
