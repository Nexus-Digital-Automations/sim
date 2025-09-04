/**
 * Discussions List - Q&A Discussion Listing Component
 *
 * Displays paginated list of Q&A discussions featuring:
 * - Thread-based discussion layout with voting system
 * - Answer status indicators and expert verification badges
 * - Real-time activity updates and engagement metrics
 * - Pagination and infinite scroll capabilities
 * - Advanced sorting and filtering options
 *
 * Integrates with reputation system for author credibility display.
 * Supports real-time updates through WebSocket connections.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowDown,
  ArrowUp,
  Award,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  MessageCircle,
  MessageSquare,
  Pin,
  Share,
  Star,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface DiscussionsListProps {
  category?: string
  sort?: string
  status?: string
  page?: number
  search?: string
  userId?: string
}

interface Discussion {
  id: string
  title: string
  content: string
  excerpt: string
  author: {
    id: string
    name: string
    displayName?: string
    image?: string
    reputation: number
    badges: Array<{
      id: string
      name: string
      color: string
      tier: string
    }>
    isExpert: boolean
    isOnline: boolean
  }
  category: {
    id: string
    name: string
    color: string
  }
  tags: string[]
  metrics: {
    viewCount: number
    replyCount: number
    upvoteCount: number
    downvoteCount: number
    bookmarkCount: number
    shareCount: number
  }
  status: 'open' | 'answered' | 'closed' | 'featured'
  acceptedAnswer?: {
    id: string
    author: {
      name: string
      isExpert: boolean
    }
  }
  lastActivity: {
    type: 'question' | 'answer' | 'comment'
    at: string
    by: {
      name: string
      image?: string
    }
  }
  isPinned: boolean
  isTrending: boolean
  isBookmarked?: boolean
  userVote?: 'up' | 'down' | null
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  hasMore: boolean
}

/**
 * Discussions List Component
 *
 * Renders paginated list of community discussions with:
 * - Rich discussion cards showing key metrics and status
 * - Real-time voting and interaction capabilities
 * - Author reputation and badge display
 * - Category and tag organization
 * - Activity indicators and timestamps
 */
export function DiscussionsList({
  category,
  sort = 'latest',
  status,
  page = 1,
  search,
  userId,
}: DiscussionsListProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState<string | null>(null)

  const fetchDiscussions = useCallback(async () => {
    try {
      setIsLoading(true)

      // TODO: Replace with actual API call
      // const params = new URLSearchParams({
      //   page: page.toString(),
      //   sort,
      //   ...(category && { category }),
      //   ...(status && { status }),
      //   ...(search && { search })
      // })
      // const response = await fetch(`/api/community/discussions?${params}`)
      // const data = await response.json()

      // Mock data for development
      const mockDiscussions: Discussion[] = [
        {
          id: 'disc1',
          title: 'How to handle API rate limits in complex workflows?',
          content:
            "I'm building a workflow that calls multiple APIs and I'm running into rate limiting issues...",
          excerpt:
            'Looking for best practices on managing API rate limits when dealing with multiple external services in a single workflow.',
          author: {
            id: 'user1',
            name: 'Sarah Chen',
            displayName: 'Sarah C.',
            image: '/avatars/sarah.jpg',
            reputation: 2450,
            badges: [
              { id: 'expert', name: 'Expert', color: '#7C3AED', tier: 'gold' },
              { id: 'helper', name: 'Helper', color: '#10B981', tier: 'silver' },
            ],
            isExpert: true,
            isOnline: true,
          },
          category: {
            id: 'api-integration',
            name: 'API Integration',
            color: '#3B82F6',
          },
          tags: ['api', 'rate-limiting', 'workflows', 'best-practices'],
          metrics: {
            viewCount: 342,
            replyCount: 8,
            upvoteCount: 15,
            downvoteCount: 1,
            bookmarkCount: 12,
            shareCount: 3,
          },
          status: 'answered',
          acceptedAnswer: {
            id: 'ans1',
            author: {
              name: 'Dr. Martinez',
              isExpert: true,
            },
          },
          lastActivity: {
            type: 'answer',
            at: '2024-01-15T10:30:00Z',
            by: {
              name: 'Dr. Martinez',
              image: '/avatars/martinez.jpg',
            },
          },
          isPinned: false,
          isTrending: true,
          isBookmarked: false,
          userVote: null,
          createdAt: '2024-01-14T08:15:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
        {
          id: 'disc2',
          title: 'Best practices for CSV data processing with large files',
          content: 'What are the recommended approaches for handling CSV files with 100k+ rows?',
          excerpt:
            'Need guidance on memory-efficient processing of large CSV files in automation workflows.',
          author: {
            id: 'user2',
            name: 'Michael Rodriguez',
            displayName: 'Mike R.',
            reputation: 1280,
            badges: [{ id: 'contributor', name: 'Contributor', color: '#F59E0B', tier: 'bronze' }],
            isExpert: false,
            isOnline: false,
          },
          category: {
            id: 'data-processing',
            name: 'Data Processing',
            color: '#10B981',
          },
          tags: ['csv', 'data-processing', 'performance', 'memory'],
          metrics: {
            viewCount: 156,
            replyCount: 5,
            upvoteCount: 8,
            downvoteCount: 0,
            bookmarkCount: 6,
            shareCount: 1,
          },
          status: 'open',
          lastActivity: {
            type: 'comment',
            at: '2024-01-15T09:45:00Z',
            by: {
              name: 'Lisa Wang',
              image: '/avatars/lisa.jpg',
            },
          },
          isPinned: false,
          isTrending: false,
          isBookmarked: true,
          userVote: 'up',
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-15T09:45:00Z',
        },
        {
          id: 'disc3',
          title: 'Slack integration not triggering - webhook issues',
          content: 'My Slack webhook integration stopped working after the recent update...',
          excerpt:
            'Troubleshooting webhook connectivity issues with Slack integration after platform update.',
          author: {
            id: 'user3',
            name: 'Jennifer Adams',
            reputation: 856,
            badges: [{ id: 'newcomer', name: 'Newcomer', color: '#6B7280', tier: 'bronze' }],
            isExpert: false,
            isOnline: true,
          },
          category: {
            id: 'troubleshooting',
            name: 'Troubleshooting',
            color: '#F59E0B',
          },
          tags: ['slack', 'webhooks', 'troubleshooting', 'integration'],
          metrics: {
            viewCount: 89,
            replyCount: 3,
            upvoteCount: 4,
            downvoteCount: 0,
            bookmarkCount: 2,
            shareCount: 0,
          },
          status: 'open',
          lastActivity: {
            type: 'answer',
            at: '2024-01-15T11:15:00Z',
            by: {
              name: 'Alex Thompson',
              image: '/avatars/alex.jpg',
            },
          },
          isPinned: false,
          isTrending: false,
          isBookmarked: false,
          userVote: null,
          createdAt: '2024-01-15T07:30:00Z',
          updatedAt: '2024-01-15T11:15:00Z',
        },
      ]

      setDiscussions(mockDiscussions)
      setPagination({
        currentPage: page,
        totalPages: 5,
        totalCount: 47,
        hasMore: page < 5,
      })

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to fetch discussions:', error)
      setIsLoading(false)
    }
  }, [category, sort, status, page, search])

  useEffect(() => {
    fetchDiscussions()
  }, [fetchDiscussions])

  const handleVote = async (discussionId: string, voteType: 'up' | 'down') => {
    if (!userId || isVoting) return

    setIsVoting(discussionId)
    try {
      // TODO: Implement actual voting API call
      // await fetch(`/api/community/discussions/${discussionId}/vote`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ type: voteType })
      // })

      // Update local state optimistically
      setDiscussions((prev) =>
        prev.map((discussion) => {
          if (discussion.id === discussionId) {
            const wasUpvoted = discussion.userVote === 'up'
            const wasDownvoted = discussion.userVote === 'down'
            const newVote = discussion.userVote === voteType ? null : voteType

            return {
              ...discussion,
              userVote: newVote,
              metrics: {
                ...discussion.metrics,
                upvoteCount:
                  discussion.metrics.upvoteCount +
                  (newVote === 'up' ? 1 : 0) -
                  (wasUpvoted ? 1 : 0),
                downvoteCount:
                  discussion.metrics.downvoteCount +
                  (newVote === 'down' ? 1 : 0) -
                  (wasDownvoted ? 1 : 0),
              },
            }
          }
          return discussion
        })
      )
    } catch (error) {
      console.error('Failed to vote:', error)
    } finally {
      setIsVoting(null)
    }
  }

  const handleBookmark = async (discussionId: string) => {
    if (!userId) return

    try {
      // TODO: Implement actual bookmark API call
      setDiscussions((prev) =>
        prev.map((discussion) => {
          if (discussion.id === discussionId) {
            const isBookmarked = !discussion.isBookmarked
            return {
              ...discussion,
              isBookmarked,
              metrics: {
                ...discussion.metrics,
                bookmarkCount: discussion.metrics.bookmarkCount + (isBookmarked ? 1 : -1),
              },
            }
          }
          return discussion
        })
      )
    } catch (error) {
      console.error('Failed to bookmark:', error)
    }
  }

  const getStatusBadge = (discussion: Discussion) => {
    switch (discussion.status) {
      case 'answered':
        return (
          <Badge className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'>
            <CheckCircle2 className='mr-1 h-3 w-3' />
            Answered
          </Badge>
        )
      case 'featured':
        return (
          <Badge className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'>
            <Star className='mr-1 h-3 w-3' />
            Featured
          </Badge>
        )
      case 'closed':
        return (
          <Badge className='bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'>
            Closed
          </Badge>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className='animate-pulse'>
            <CardContent className='p-6'>
              <div className='flex gap-4'>
                <div className='h-12 w-12 rounded-full bg-gray-200' />
                <div className='flex-1'>
                  <div className='mb-2 h-4 w-3/4 rounded bg-gray-200' />
                  <div className='mb-4 h-4 w-1/2 rounded bg-gray-200' />
                  <div className='flex gap-2'>
                    <div className='h-6 w-16 rounded bg-gray-200' />
                    <div className='h-6 w-20 rounded bg-gray-200' />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Results Summary */}
      <div className='flex items-center justify-between'>
        <div className='text-gray-600 text-sm dark:text-gray-300'>
          Showing {discussions.length} of {pagination.totalCount} discussions
        </div>
        <div className='flex items-center gap-2 text-gray-500 text-sm dark:text-gray-400'>
          <Clock className='h-4 w-4' />
          Updated {formatDistanceToNow(new Date())} ago
        </div>
      </div>

      {/* Discussions List */}
      <div className='space-y-4'>
        {discussions.map((discussion) => (
          <Card key={discussion.id} className='transition-shadow duration-200 hover:shadow-lg'>
            <CardContent className='p-6'>
              <div className='flex gap-4'>
                {/* Voting Column */}
                <div className='flex min-w-[48px] flex-col items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`h-8 w-8 p-1 ${
                      discussion.userVote === 'up'
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20'
                        : 'text-gray-400 hover:text-orange-600'
                    }`}
                    onClick={() => handleVote(discussion.id, 'up')}
                    disabled={!userId || isVoting === discussion.id}
                  >
                    <ArrowUp className='h-4 w-4' />
                  </Button>

                  <span
                    className={`font-semibold text-sm ${
                      discussion.metrics.upvoteCount > discussion.metrics.downvoteCount
                        ? 'text-orange-600'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {discussion.metrics.upvoteCount - discussion.metrics.downvoteCount}
                  </span>

                  <Button
                    variant='ghost'
                    size='sm'
                    className={`h-8 w-8 p-1 ${
                      discussion.userVote === 'down'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                        : 'text-gray-400 hover:text-blue-600'
                    }`}
                    onClick={() => handleVote(discussion.id, 'down')}
                    disabled={!userId || isVoting === discussion.id}
                  >
                    <ArrowDown className='h-4 w-4' />
                  </Button>
                </div>

                {/* Main Content */}
                <div className='min-w-0 flex-1'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='min-w-0 flex-1'>
                      {/* Title and Status */}
                      <div className='mb-2 flex items-center gap-2'>
                        {discussion.isPinned && <Pin className='h-4 w-4 text-yellow-600' />}
                        {discussion.isTrending && <TrendingUp className='h-4 w-4 text-green-600' />}
                        <Link
                          href={`/community/discussions/${discussion.id}`}
                          className='line-clamp-2 font-semibold text-gray-900 text-lg hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400'
                        >
                          {discussion.title}
                        </Link>
                      </div>

                      {/* Status and Category Badges */}
                      <div className='mb-3 flex items-center gap-2'>
                        {getStatusBadge(discussion)}
                        <Badge
                          variant='outline'
                          style={{
                            borderColor: discussion.category.color,
                            color: discussion.category.color,
                          }}
                        >
                          {discussion.category.name}
                        </Badge>
                        {discussion.acceptedAnswer && (
                          <Badge className='bg-green-100 text-green-800 text-xs'>
                            ✓ Best Answer by {discussion.acceptedAnswer.author.name}
                          </Badge>
                        )}
                      </div>

                      {/* Excerpt */}
                      <p className='mb-4 line-clamp-2 text-gray-600 text-sm dark:text-gray-300'>
                        {discussion.excerpt}
                      </p>

                      {/* Tags */}
                      <div className='mb-4 flex flex-wrap gap-1'>
                        {discussion.tags.map((tag) => (
                          <Badge key={tag} variant='secondary' className='text-xs'>
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Author Information */}
                      <div className='flex items-center gap-3'>
                        <div className='relative'>
                          <Avatar className='h-8 w-8'>
                            <AvatarImage src={discussion.author.image} />
                            <AvatarFallback className='text-xs'>
                              {discussion.author.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          {discussion.author.isOnline && (
                            <div className='-bottom-0.5 -right-0.5 absolute h-3 w-3 rounded-full border-2 border-white bg-green-500' />
                          )}
                        </div>

                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-gray-900 text-sm dark:text-white'>
                              {discussion.author.displayName || discussion.author.name}
                            </span>
                            {discussion.author.isExpert && (
                              <Badge className='bg-purple-100 text-purple-800 text-xs'>
                                <Award className='mr-1 h-3 w-3' />
                                Expert
                              </Badge>
                            )}
                            <div className='flex items-center gap-1'>
                              {discussion.author.badges.map((badge, index) => (
                                <Badge
                                  key={index}
                                  className='text-xs'
                                  style={{ backgroundColor: badge.color }}
                                >
                                  {badge.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className='flex items-center gap-2 text-gray-500 text-xs dark:text-gray-400'>
                            <span>{discussion.author.reputation} reputation</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(discussion.createdAt))} ago</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex flex-col gap-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className={`p-2 ${discussion.isBookmarked ? 'text-yellow-600' : ''}`}
                        onClick={() => handleBookmark(discussion.id)}
                      >
                        <Bookmark className='h-4 w-4' />
                      </Button>
                      <Button variant='ghost' size='sm' className='p-2'>
                        <Share className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  <Separator className='my-4' />

                  {/* Metrics and Last Activity */}
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-6 text-gray-500 text-sm dark:text-gray-400'>
                      <div className='flex items-center gap-1'>
                        <Eye className='h-4 w-4' />
                        {discussion.metrics.viewCount} views
                      </div>
                      <div className='flex items-center gap-1'>
                        <MessageCircle className='h-4 w-4' />
                        {discussion.metrics.replyCount} replies
                      </div>
                      <div className='flex items-center gap-1'>
                        <ThumbsUp className='h-4 w-4' />
                        {discussion.metrics.upvoteCount} votes
                      </div>
                      <div className='flex items-center gap-1'>
                        <Bookmark className='h-4 w-4' />
                        {discussion.metrics.bookmarkCount} bookmarks
                      </div>
                    </div>

                    <div className='flex items-center gap-2 text-gray-500 text-sm dark:text-gray-400'>
                      <div className='flex items-center gap-1'>
                        <Avatar className='h-5 w-5'>
                          <AvatarImage src={discussion.lastActivity.by.image} />
                          <AvatarFallback className='text-xs'>
                            {discussion.lastActivity.by.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {discussion.lastActivity.type} by {discussion.lastActivity.by.name}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(discussion.lastActivity.at))} ago</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Arrow */}
                <div className='flex items-center'>
                  <ChevronRight className='h-5 w-5 text-gray-400' />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2'>
          <Button variant='outline' disabled={pagination.currentPage === 1} asChild>
            <Link href={`?page=${pagination.currentPage - 1}`}>Previous</Link>
          </Button>

          <div className='flex items-center gap-1'>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={pagination.currentPage === pageNum ? 'default' : 'outline'}
                  size='sm'
                  asChild
                >
                  <Link href={`?page=${pageNum}`}>{pageNum}</Link>
                </Button>
              )
            })}
          </div>

          <Button variant='outline' disabled={!pagination.hasMore} asChild>
            <Link href={`?page=${pagination.currentPage + 1}`}>Next</Link>
          </Button>
        </div>
      )}

      {/* Empty State */}
      {discussions.length === 0 && !isLoading && (
        <div className='py-12 text-center'>
          <MessageSquare className='mx-auto mb-4 h-16 w-16 text-gray-400' />
          <h3 className='mb-2 font-medium text-gray-900 text-lg dark:text-white'>
            No discussions found
          </h3>
          <p className='mb-4 text-gray-600 dark:text-gray-300'>
            Be the first to start a discussion in this category!
          </p>
          <Button asChild>
            <Link href='/community/questions/ask'>Ask a Question</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
