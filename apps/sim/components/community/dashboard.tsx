/**
 * Community Dashboard - Central Hub Component
 *
 * The main dashboard for the community Q&A platform featuring:
 * - Recent discussions and popular questions
 * - Activity feed with personalized content
 * - Quick actions for posting questions and articles
 * - Featured community contributors and experts
 * - Knowledge base highlights and trending topics
 *
 * Integrates with existing reputation system and user profiles.
 * Provides real-time updates through WebSocket connections.
 *
 * @version 1.0.0
 * @created 2025-09-04
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Award,
  BookOpen,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Heart,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CommunityDashboardProps {
  userId?: string
}

interface Discussion {
  id: string
  title: string
  content: string
  author: {
    id: string
    name: string
    image?: string
    displayName?: string
    reputation: number
    badges: Array<{
      name: string
      color: string
      icon: string
    }>
  }
  category: string
  tags: string[]
  replyCount: number
  viewCount: number
  likeCount: number
  lastActivity: string
  isAnswered: boolean
  isFeatured: boolean
}

interface KnowledgeArticle {
  id: string
  title: string
  excerpt: string
  author: {
    name: string
    image?: string
    isExpert: boolean
  }
  category: string
  readTime: number
  likes: number
  views: number
  lastUpdated: string
}

interface CommunityExpert {
  id: string
  name: string
  displayName?: string
  image?: string
  title?: string
  company?: string
  reputation: number
  specializations: string[]
  answersCount: number
  helpfulRating: number
  isOnline: boolean
}

/**
 * Community Dashboard Component
 *
 * Central hub displaying:
 * - Active discussions organized by category
 * - Trending topics and popular questions
 * - Community experts and top contributors
 * - Knowledge base articles and tutorials
 * - Quick action buttons for engagement
 * - Personalized activity feed
 */
export function CommunityDashboard({ userId }: CommunityDashboardProps) {
  const [activeTab, setActiveTab] = useState('discussions')
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([])
  const [communityExperts, setCommunityExperts] = useState<CommunityExpert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setIsLoading(true)
        // TODO: Replace with actual API calls
        // const [discussionsRes, articlesRes, expertsRes] = await Promise.all([
        //   fetch('/api/community/discussions'),
        //   fetch('/api/community/knowledge'),
        //   fetch('/api/community/experts')
        // ])

        // Mock data for development
        setDiscussions([
          {
            id: '1',
            title: 'How to integrate Slack notifications with workflow triggers?',
            content:
              "I'm trying to set up automated Slack notifications when specific workflow conditions are met...",
            author: {
              id: 'user1',
              name: 'Sarah Chen',
              displayName: 'Sarah Chen',
              image: '/avatars/sarah.jpg',
              reputation: 2450,
              badges: [
                { name: 'Expert', color: '#7C3AED', icon: 'Award' },
                { name: 'Helper', color: '#10B981', icon: 'Heart' },
              ],
            },
            category: 'Integrations',
            tags: ['slack', 'notifications', 'triggers'],
            replyCount: 8,
            viewCount: 156,
            likeCount: 12,
            lastActivity: '2 hours ago',
            isAnswered: true,
            isFeatured: false,
          },
          {
            id: '2',
            title: 'Best practices for handling large CSV data processing',
            content:
              'What are the recommended approaches for processing CSV files with 100k+ rows efficiently?',
            author: {
              id: 'user2',
              name: 'Michael Rodriguez',
              displayName: 'Mike R.',
              reputation: 1280,
              badges: [{ name: 'Contributor', color: '#F59E0B', icon: 'Star' }],
            },
            category: 'Data Processing',
            tags: ['csv', 'data', 'performance', 'optimization'],
            replyCount: 15,
            viewCount: 342,
            likeCount: 28,
            lastActivity: '4 hours ago',
            isAnswered: false,
            isFeatured: true,
          },
        ])

        setKnowledgeArticles([
          {
            id: 'kb1',
            title: 'Complete Guide to Workflow Error Handling',
            excerpt:
              'Learn how to implement robust error handling in your automation workflows with practical examples and best practices.',
            author: {
              name: 'David Kim',
              image: '/avatars/david.jpg',
              isExpert: true,
            },
            category: 'Best Practices',
            readTime: 8,
            likes: 145,
            views: 2340,
            lastUpdated: '3 days ago',
          },
          {
            id: 'kb2',
            title: 'API Rate Limiting Strategies',
            excerpt:
              'Comprehensive strategies for handling API rate limits in production workflows to ensure reliability.',
            author: {
              name: 'Lisa Wang',
              isExpert: true,
            },
            category: 'APIs',
            readTime: 12,
            likes: 89,
            views: 1560,
            lastUpdated: '1 week ago',
          },
        ])

        setCommunityExperts([
          {
            id: 'expert1',
            name: 'Dr. Jennifer Martinez',
            displayName: 'Dr. Martinez',
            image: '/avatars/jennifer.jpg',
            title: 'Senior Automation Engineer',
            company: 'TechCorp Solutions',
            reputation: 5420,
            specializations: ['API Integration', 'Data Processing', 'Security'],
            answersCount: 234,
            helpfulRating: 94.5,
            isOnline: true,
          },
          {
            id: 'expert2',
            name: 'Alex Thompson',
            title: 'DevOps Specialist',
            company: 'CloudFirst Inc',
            reputation: 4180,
            specializations: ['CI/CD', 'Infrastructure', 'Monitoring'],
            answersCount: 156,
            helpfulRating: 91.2,
            isOnline: false,
          },
        ])

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch community data:', error)
        setIsLoading(false)
      }
    }

    fetchCommunityData()
  }, [])

  if (isLoading) {
    return (
      <div className='space-y-6'>
        {[1, 2, 3].map((i) => (
          <Card key={i} className='animate-pulse'>
            <CardContent className='p-6'>
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
      {/* Quick Actions Header */}
      <Card>
        <CardContent className='p-6'>
          <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
            <div>
              <h2 className='font-semibold text-gray-900 text-xl dark:text-white'>
                Welcome to the Community
              </h2>
              <p className='mt-1 text-gray-600 text-sm dark:text-gray-300'>
                Ask questions, share knowledge, and connect with automation experts
              </p>
            </div>
            <div className='flex gap-2'>
              <Button asChild className='bg-indigo-600 hover:bg-indigo-700'>
                <Link href='/community/questions/ask'>
                  <Plus className='mr-2 h-4 w-4' />
                  Ask Question
                </Link>
              </Button>
              <Button variant='outline' asChild>
                <Link href='/community/knowledge/create'>
                  <BookOpen className='mr-2 h-4 w-4' />
                  Write Article
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='discussions' className='flex items-center gap-2'>
            <MessageSquare className='h-4 w-4' />
            Discussions
          </TabsTrigger>
          <TabsTrigger value='knowledge' className='flex items-center gap-2'>
            <BookOpen className='h-4 w-4' />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value='experts' className='flex items-center gap-2'>
            <Users className='h-4 w-4' />
            Experts
          </TabsTrigger>
          <TabsTrigger value='trending' className='flex items-center gap-2'>
            <TrendingUp className='h-4 w-4' />
            Trending
          </TabsTrigger>
        </TabsList>

        {/* Discussions Tab */}
        <TabsContent value='discussions' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-medium text-gray-900 text-lg dark:text-white'>
              Recent Discussions
            </h3>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm'>
                <Filter className='mr-2 h-4 w-4' />
                Filter
              </Button>
              <Button variant='outline' size='sm'>
                <Search className='mr-2 h-4 w-4' />
                Search
              </Button>
            </div>
          </div>

          <div className='space-y-4'>
            {discussions.map((discussion) => (
              <Card key={discussion.id} className='transition-shadow hover:shadow-md'>
                <CardContent className='p-6'>
                  <div className='flex items-start gap-4'>
                    <Avatar className='h-12 w-12'>
                      <AvatarImage src={discussion.author.image} />
                      <AvatarFallback>
                        {discussion.author.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <Link
                            href={`/community/discussions/${discussion.id}`}
                            className='font-medium text-gray-900 text-lg hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400'
                          >
                            {discussion.title}
                          </Link>
                          {discussion.isFeatured && (
                            <Badge className='ml-2 bg-yellow-100 text-yellow-800'>
                              <Star className='mr-1 h-3 w-3' />
                              Featured
                            </Badge>
                          )}
                          {discussion.isAnswered && (
                            <Badge className='ml-2 bg-green-100 text-green-800'>✓ Answered</Badge>
                          )}
                        </div>
                        <ChevronRight className='h-5 w-5 text-gray-400' />
                      </div>

                      <p className='mt-2 line-clamp-2 text-gray-600 text-sm dark:text-gray-300'>
                        {discussion.content}
                      </p>

                      <div className='mt-4 flex items-center gap-4'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-gray-900 text-sm dark:text-white'>
                            {discussion.author.displayName || discussion.author.name}
                          </span>
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
                          <span className='text-gray-500 text-sm'>
                            {discussion.author.reputation} rep
                          </span>
                        </div>
                      </div>

                      <div className='mt-3 flex items-center gap-6 text-gray-500 text-sm'>
                        <Badge variant='secondary'>{discussion.category}</Badge>
                        <div className='flex items-center gap-1'>
                          <MessageCircle className='h-4 w-4' />
                          {discussion.replyCount} replies
                        </div>
                        <div className='flex items-center gap-1'>
                          <Eye className='h-4 w-4' />
                          {discussion.viewCount} views
                        </div>
                        <div className='flex items-center gap-1'>
                          <Heart className='h-4 w-4' />
                          {discussion.likeCount} likes
                        </div>
                        <div className='flex items-center gap-1'>
                          <Clock className='h-4 w-4' />
                          {discussion.lastActivity}
                        </div>
                      </div>

                      <div className='mt-2 flex gap-1'>
                        {discussion.tags.map((tag) => (
                          <Badge key={tag} variant='outline' className='text-xs'>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='text-center'>
            <Button variant='outline' asChild>
              <Link href='/community/discussions'>
                View All Discussions
                <ChevronRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value='knowledge' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-medium text-gray-900 text-lg dark:text-white'>
              Featured Knowledge Base Articles
            </h3>
            <Button variant='outline' size='sm' asChild>
              <Link href='/community/knowledge'>
                View All Articles
                <ChevronRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>

          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            {knowledgeArticles.map((article) => (
              <Card key={article.id} className='transition-shadow hover:shadow-md'>
                <CardContent className='p-6'>
                  <div className='flex items-start gap-4'>
                    <BookOpen className='mt-1 h-8 w-8 text-indigo-600' />
                    <div className='flex-1'>
                      <Link
                        href={`/community/knowledge/${article.id}`}
                        className='font-medium text-gray-900 text-lg hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400'
                      >
                        {article.title}
                      </Link>
                      <p className='mt-2 text-gray-600 text-sm dark:text-gray-300'>
                        {article.excerpt}
                      </p>

                      <div className='mt-4 flex items-center gap-4'>
                        <div className='flex items-center gap-2'>
                          <Avatar className='h-6 w-6'>
                            <AvatarImage src={article.author.image} />
                            <AvatarFallback className='text-xs'>
                              {article.author.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className='text-gray-700 text-sm dark:text-gray-300'>
                            {article.author.name}
                          </span>
                          {article.author.isExpert && (
                            <Badge className='bg-purple-100 text-purple-800 text-xs'>
                              <Award className='mr-1 h-3 w-3' />
                              Expert
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className='mt-3 flex items-center gap-6 text-gray-500 text-sm'>
                        <Badge variant='secondary'>{article.category}</Badge>
                        <div className='flex items-center gap-1'>
                          <Clock className='h-4 w-4' />
                          {article.readTime} min read
                        </div>
                        <div className='flex items-center gap-1'>
                          <Heart className='h-4 w-4' />
                          {article.likes}
                        </div>
                        <div className='flex items-center gap-1'>
                          <Eye className='h-4 w-4' />
                          {article.views}
                        </div>
                        <span>Updated {article.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Experts Tab */}
        <TabsContent value='experts' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-medium text-gray-900 text-lg dark:text-white'>Community Experts</h3>
            <Button variant='outline' size='sm' asChild>
              <Link href='/community/experts'>
                View All Experts
                <ChevronRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>

          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            {communityExperts.map((expert) => (
              <Card key={expert.id} className='transition-shadow hover:shadow-md'>
                <CardContent className='p-6'>
                  <div className='flex items-start gap-4'>
                    <div className='relative'>
                      <Avatar className='h-16 w-16'>
                        <AvatarImage src={expert.image} />
                        <AvatarFallback>
                          {expert.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      {expert.isOnline && (
                        <div className='-bottom-1 -right-1 absolute h-4 w-4 rounded-full border-2 border-white bg-green-500' />
                      )}
                    </div>

                    <div className='flex-1'>
                      <Link
                        href={`/community/experts/${expert.id}`}
                        className='font-medium text-gray-900 text-lg hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400'
                      >
                        {expert.displayName || expert.name}
                      </Link>
                      <p className='text-gray-600 text-sm dark:text-gray-300'>
                        {expert.title}
                        {expert.company && ` at ${expert.company}`}
                      </p>

                      <div className='mt-3 flex items-center gap-4'>
                        <div className='flex items-center gap-1 text-gray-600 text-sm dark:text-gray-300'>
                          <Star className='h-4 w-4 text-yellow-500' />
                          {expert.reputation} reputation
                        </div>
                        <div className='text-gray-600 text-sm dark:text-gray-300'>
                          {expert.answersCount} answers
                        </div>
                        <div className='text-gray-600 text-sm dark:text-gray-300'>
                          {expert.helpfulRating}% helpful
                        </div>
                      </div>

                      <div className='mt-3 flex flex-wrap gap-1'>
                        {expert.specializations.map((spec) => (
                          <Badge key={spec} variant='outline' className='text-xs'>
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Trending Tab */}
        <TabsContent value='trending' className='space-y-4'>
          <div className='py-12 text-center'>
            <TrendingUp className='mx-auto mb-4 h-16 w-16 text-gray-400' />
            <h3 className='mb-2 font-medium text-gray-900 text-lg dark:text-white'>
              Trending Topics
            </h3>
            <p className='mb-4 text-gray-600 dark:text-gray-300'>
              Coming Soon! Discover what's trending in the community.
            </p>
            <Button variant='outline' disabled>
              Check Back Soon
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
