/**
 * Trending Topics - Dynamic Content Discovery Component
 *
 * Displays trending discussions and topics based on real-time analytics:
 * - Hot discussions with rapid engagement growth
 * - Trending tags and popular search terms
 * - Rising questions needing expert attention
 * - Viral content and high-impact solutions
 * - Community-driven topic suggestions
 *
 * Uses algorithmic analysis of view counts, votes, replies, and temporal patterns
 * to surface the most relevant and timely content for community members.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Activity,
  ArrowUp,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Hash,
  MessageCircle,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TrendingTopic {
  id: string
  title: string
  type: 'discussion' | 'tag' | 'keyword'
  category: string
  engagement: {
    score: number
    growth: number
    views: number
    replies: number
    votes: number
  }
  timeframe: '1h' | '6h' | '24h' | '7d'
  author?: {
    name: string
    image?: string
    reputation: number
  }
  createdAt: string
  isHot: boolean
  isRising: boolean
}

interface PopularTag {
  name: string
  count: number
  growth: number
  category: string
  color: string
}

/**
 * Trending Topics Component
 *
 * Real-time trending content discovery featuring:
 * - Hot discussions with rapid engagement
 * - Rising topics gaining momentum
 * - Popular tags and search terms
 * - Expert-answered trending questions
 * - Time-sensitive trending indicators
 */
export function TrendingTopics() {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [popularTags, setPopularTags] = useState<PopularTag[]>([])
  const [timeframe, setTimeframe] = useState<'1h' | '6h' | '24h' | '7d'>('24h')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        setIsLoading(true)

        // TODO: Replace with actual API call
        // const response = await fetch(`/api/community/trending?timeframe=${timeframe}`)
        // const data = await response.json()

        // Mock data for development
        const mockTrendingTopics: TrendingTopic[] = [
          {
            id: 'trend1',
            title: 'New Slack API changes breaking workflows',
            type: 'discussion',
            category: 'Integrations',
            engagement: {
              score: 95,
              growth: 340,
              views: 1240,
              replies: 18,
              votes: 34,
            },
            timeframe: '6h',
            author: {
              name: 'Alex Thompson',
              image: '/avatars/alex.jpg',
              reputation: 2450,
            },
            createdAt: '2024-01-15T06:00:00Z',
            isHot: true,
            isRising: false,
          },
          {
            id: 'trend2',
            title: 'Memory optimization for large CSV processing',
            type: 'discussion',
            category: 'Performance',
            engagement: {
              score: 87,
              growth: 180,
              views: 890,
              replies: 12,
              votes: 28,
            },
            timeframe: '24h',
            author: {
              name: 'Dr. Martinez',
              reputation: 5420,
            },
            createdAt: '2024-01-14T15:30:00Z',
            isHot: false,
            isRising: true,
          },
          {
            id: 'trend3',
            title: 'webhook-security',
            type: 'tag',
            category: 'Security',
            engagement: {
              score: 78,
              growth: 220,
              views: 456,
              replies: 8,
              votes: 15,
            },
            timeframe: '24h',
            createdAt: '2024-01-15T10:00:00Z',
            isHot: false,
            isRising: true,
          },
          {
            id: 'trend4',
            title: 'Best practices for error handling in production',
            type: 'discussion',
            category: 'Best Practices',
            engagement: {
              score: 82,
              growth: 150,
              views: 675,
              replies: 15,
              votes: 22,
            },
            timeframe: '24h',
            author: {
              name: 'Sarah Chen',
              image: '/avatars/sarah.jpg',
              reputation: 3180,
            },
            createdAt: '2024-01-14T20:15:00Z',
            isHot: false,
            isRising: false,
          },
        ]

        const mockPopularTags: PopularTag[] = [
          {
            name: 'api-integration',
            count: 89,
            growth: 25,
            category: 'Integrations',
            color: '#3B82F6',
          },
          {
            name: 'webhook-security',
            count: 67,
            growth: 45,
            category: 'Security',
            color: '#EF4444',
          },
          { name: 'csv-processing', count: 45, growth: 35, category: 'Data', color: '#10B981' },
          {
            name: 'error-handling',
            count: 34,
            growth: 18,
            category: 'Best Practices',
            color: '#F59E0B',
          },
          {
            name: 'slack-integration',
            count: 56,
            growth: 60,
            category: 'Integrations',
            color: '#8B5CF6',
          },
        ]

        setTrendingTopics(mockTrendingTopics)
        setPopularTags(mockPopularTags)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch trending data:', error)
        setIsLoading(false)
      }
    }

    fetchTrendingData()

    // Refresh trending data every 5 minutes
    const interval = setInterval(fetchTrendingData, 300000)
    return () => clearInterval(interval)
  }, [timeframe])

  const getTrendingIcon = (topic: TrendingTopic) => {
    if (topic.isHot) {
      return <Flame className='h-4 w-4 text-red-500' />
    }
    if (topic.isRising) {
      return <TrendingUp className='h-4 w-4 text-green-500' />
    }
    return <Activity className='h-4 w-4 text-blue-500' />
  }

  const getGrowthIndicator = (growth: number) => {
    if (growth > 200) return 'text-red-600 bg-red-50 dark:bg-red-900/20'
    if (growth > 100) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    if (growth > 50) return 'text-green-600 bg-green-50 dark:bg-green-900/20'
    return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
  }

  if (isLoading) {
    return (
      <Card className='animate-pulse'>
        <CardContent className='p-4'>
          <div className='space-y-3'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='flex items-center gap-3'>
                <div className='h-8 w-8 rounded bg-gray-200' />
                <div className='flex-1'>
                  <div className='mb-1 h-4 w-3/4 rounded bg-gray-200' />
                  <div className='h-3 w-1/2 rounded bg-gray-200' />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Trending Topics */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
              <TrendingUp className='h-5 w-5 text-indigo-600' />
              Trending Now
            </CardTitle>
            <div className='flex items-center gap-1'>
              {(['1h', '6h', '24h', '7d'] as const).map((period) => (
                <Button
                  key={period}
                  variant={timeframe === period ? 'default' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => setTimeframe(period)}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-3'>
            {trendingTopics.map((topic, index) => (
              <div
                key={topic.id}
                className='group rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800'
              >
                <div className='flex items-start gap-3'>
                  <div className='flex items-center gap-1'>
                    <span className='w-4 font-medium text-gray-500 text-xs dark:text-gray-400'>
                      {index + 1}
                    </span>
                    {getTrendingIcon(topic)}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        {topic.type === 'discussion' ? (
                          <Link
                            href={`/community/discussions/${topic.id}`}
                            className='line-clamp-2 font-medium text-gray-900 text-sm hover:text-indigo-600 group-hover:underline dark:text-white dark:hover:text-indigo-400'
                          >
                            {topic.title}
                          </Link>
                        ) : (
                          <Link
                            href={`/community/discussions?tags=${topic.title}`}
                            className='flex items-center gap-1 font-medium text-gray-900 text-sm hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400'
                          >
                            <Hash className='h-3 w-3' />
                            {topic.title}
                          </Link>
                        )}

                        <div className='mt-1 flex items-center gap-3'>
                          <Badge variant='outline' className='text-xs'>
                            {topic.category}
                          </Badge>

                          {topic.author && (
                            <div className='flex items-center gap-1'>
                              <Avatar className='h-4 w-4'>
                                <AvatarImage src={topic.author.image} />
                                <AvatarFallback className='text-xs'>
                                  {topic.author.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className='text-gray-500 text-xs dark:text-gray-400'>
                                {topic.author.name}
                              </span>
                            </div>
                          )}

                          <div className='flex items-center gap-2 text-gray-500 text-xs dark:text-gray-400'>
                            <div className='flex items-center gap-1'>
                              <Eye className='h-3 w-3' />
                              {topic.engagement.views}
                            </div>
                            {topic.type === 'discussion' && (
                              <>
                                <div className='flex items-center gap-1'>
                                  <MessageCircle className='h-3 w-3' />
                                  {topic.engagement.replies}
                                </div>
                                <div className='flex items-center gap-1'>
                                  <ArrowUp className='h-3 w-3' />
                                  {topic.engagement.votes}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-col items-end gap-1'>
                        <Badge className={`text-xs ${getGrowthIndicator(topic.engagement.growth)}`}>
                          <TrendingUp className='mr-1 h-3 w-3' />+{topic.engagement.growth}%
                        </Badge>
                        <span className='text-gray-500 text-xs dark:text-gray-400'>
                          {formatDistanceToNow(new Date(topic.createdAt))} ago
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className='mt-4 border-gray-200 border-t pt-3 dark:border-gray-700'>
            <Button variant='ghost' size='sm' className='w-full' asChild>
              <Link href='/community/trending'>
                View All Trending
                <ChevronRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Popular Tags */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
            <Hash className='h-5 w-5 text-indigo-600' />
            Hot Tags
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-2'>
            {popularTags.map((tag, index) => (
              <div
                key={tag.name}
                className='group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800'
              >
                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='w-4 font-medium text-gray-500 text-xs dark:text-gray-400'>
                      {index + 1}
                    </span>
                    <div className='h-2 w-2 rounded-full' style={{ backgroundColor: tag.color }} />
                  </div>

                  <Link
                    href={`/community/discussions?tags=${tag.name}`}
                    className='flex items-center gap-1 font-medium text-gray-900 text-sm hover:text-indigo-600 group-hover:underline dark:text-white dark:hover:text-indigo-400'
                  >
                    #{tag.name}
                  </Link>

                  <Badge variant='secondary' className='text-xs'>
                    {tag.count}
                  </Badge>
                </div>

                <Badge className={`text-xs ${getGrowthIndicator(tag.growth)}`}>
                  +{tag.growth}%
                </Badge>
              </div>
            ))}
          </div>

          <div className='mt-4 border-gray-200 border-t pt-3 dark:border-gray-700'>
            <Button variant='ghost' size='sm' className='w-full' asChild>
              <Link href='/community/tags'>
                Browse All Tags
                <ChevronRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Community Health */}
      <Card className='border-green-200 dark:border-green-800'>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 font-semibold text-green-700 text-lg dark:text-green-300'>
            <Zap className='h-5 w-5' />
            Community Pulse
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='space-y-3 text-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Users className='h-4 w-4 text-blue-500' />
                <span className='text-gray-600 dark:text-gray-300'>Active members today</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-semibold'>234</span>
                <Badge className='bg-green-100 text-green-800 text-xs'>
                  <TrendingUp className='mr-1 h-3 w-3' />
                  +15%
                </Badge>
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <MessageCircle className='h-4 w-4 text-purple-500' />
                <span className='text-gray-600 dark:text-gray-300'>Questions answered</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-semibold'>47</span>
                <Badge className='bg-green-100 text-green-800 text-xs'>87% rate</Badge>
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Star className='h-4 w-4 text-yellow-500' />
                <span className='text-gray-600 dark:text-gray-300'>Expert contributions</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-semibold'>23</span>
                <Badge className='bg-purple-100 text-purple-800 text-xs'>High quality</Badge>
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Clock className='h-4 w-4 text-orange-500' />
                <span className='text-gray-600 dark:text-gray-300'>Avg response time</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-semibold'>2.4h</span>
                <Badge className='bg-green-100 text-green-800 text-xs'>
                  <TrendingUp className='mr-1 h-3 w-3' />
                  Fast
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
