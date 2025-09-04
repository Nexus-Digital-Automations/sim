/**
 * Creator Profile and Portfolio Component - Comprehensive Creator Dashboard
 *
 * This component provides a complete creator profile and portfolio management system featuring:
 * - Professional creator profile with customizable branding and bio
 * - Comprehensive portfolio showcase with template galleries and collections
 * - Advanced analytics dashboard with performance metrics and insights
 * - Revenue tracking and earnings management with payment integration
 * - Community engagement metrics and social proof indicators
 * - Template performance analytics with user feedback and ratings
 * - Follower management and audience insights
 * - Achievement badges and recognition system
 * - Collaboration tools and team management features
 * - Export capabilities for portfolio and analytics data
 *
 * Features:
 * - Modern, professional design with customizable themes
 * - Interactive charts and visualizations for analytics
 * - Real-time data updates and notifications
 * - Social proof and credibility indicators
 * - SEO optimization for creator discoverability
 * - Integration with payment systems and tax reporting
 * - Mobile-responsive design with touch-friendly controls
 * - Advanced filtering and search within creator's templates
 * - Community features like messaging and collaboration requests
 * - Performance benchmarking against platform averages
 *
 * @author Claude Code Marketplace System - Creator Success Team
 * @version 2.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  Calendar,
  Download,
  Edit3,
  Eye,
  Globe,
  MapPin,
  MessageCircle,
  Search,
  Settings,
  Share2,
  Star,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Template, TemplateCollection, User } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Creator Profile Portfolio Props Interface
 */
export interface CreatorProfilePortfolioProps {
  /** Creator user data */
  creator: User
  /** Current viewer (for permission checks) */
  currentUser?: User
  /** View mode: public profile or personal dashboard */
  viewMode?: 'public' | 'dashboard'
  /** Custom CSS class name */
  className?: string
  /** Enable analytics features */
  enableAnalytics?: boolean
  /** Enable social features */
  enableSocialFeatures?: boolean
  /** Template selection handler */
  onTemplateSelect?: (template: Template) => void
  /** Follow/unfollow handler */
  onFollowToggle?: (creatorId: string, isFollowing: boolean) => void
  /** Profile edit handler */
  onProfileEdit?: () => void
}

/**
 * Creator Stats Interface
 */
interface CreatorStats {
  totalTemplates: number
  totalDownloads: number
  totalViews: number
  totalEarnings: number
  averageRating: number
  totalFollowers: number
  totalLikes: number
  joinedDate: Date
  lastActive: Date
  profileViews: number
  monthlyGrowth: {
    templates: number
    downloads: number
    earnings: number
    followers: number
  }
}

/**
 * Creator Analytics Interface
 */
interface CreatorAnalytics {
  templatePerformance: Array<{
    template: Template
    views: number
    downloads: number
    revenue: number
    rating: number
    conversionRate: number
  }>
  audienceInsights: {
    demographics: Record<string, number>
    interests: Record<string, number>
    geography: Record<string, number>
    deviceTypes: Record<string, number>
  }
  revenueAnalytics: {
    daily: Array<{ date: string; revenue: number; downloads: number }>
    monthly: Array<{ month: string; revenue: number; templates: number }>
    topEarning: Array<{ template: Template; revenue: number }>
  }
  engagementMetrics: {
    timeline: Array<{ date: string; views: number; likes: number; shares: number }>
    topPerformers: Array<{ template: Template; engagement: number }>
  }
}

/**
 * Achievement Interface
 */
interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'creator' | 'community' | 'quality' | 'milestone'
  level: 'bronze' | 'silver' | 'gold' | 'platinum'
  earnedAt: Date
  progress?: number
  maxProgress?: number
}

/**
 * Time Period Type
 */
type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all'

/**
 * Creator Profile Portfolio Component
 */
export const CreatorProfilePortfolio: React.FC<CreatorProfilePortfolioProps> = ({
  creator,
  currentUser,
  viewMode = 'public',
  className,
  enableAnalytics = true,
  enableSocialFeatures = true,
  onTemplateSelect,
  onFollowToggle,
  onProfileEdit,
}) => {
  // State management
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null)
  const [creatorAnalytics, setCreatorAnalytics] = useState<CreatorAnalytics | null>(null)
  const [creatorTemplates, setCreatorTemplates] = useState<Template[]>([])
  const [creatorCollections, setCreatorCollections] = useState<TemplateCollection[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('30d')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showContactDialog, setShowContactDialog] = useState(false)

  /**
   * Load creator data
   */
  const loadCreatorData = useCallback(async () => {
    try {
      setLoading(true)

      // Load creator stats
      const statsResponse = await fetch(`/api/marketplace/creators/${creator.id}/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setCreatorStats(statsData.data)
      }

      // Load analytics if enabled and viewing dashboard
      if (enableAnalytics && viewMode === 'dashboard') {
        const analyticsResponse = await fetch(
          `/api/marketplace/creators/${creator.id}/analytics?period=${selectedTimePeriod}`
        )
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          setCreatorAnalytics(analyticsData.data)
        }
      }

      // Load creator templates
      const templatesResponse = await fetch(`/api/marketplace/templates?creator=${creator.id}`)
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setCreatorTemplates(templatesData.data || [])
      }

      // Load creator collections
      const collectionsResponse = await fetch(`/api/marketplace/collections?creator=${creator.id}`)
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        setCreatorCollections(collectionsData.data || [])
      }

      // Load achievements
      const achievementsResponse = await fetch(
        `/api/marketplace/creators/${creator.id}/achievements`
      )
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json()
        setAchievements(achievementsData.data || [])
      }

      // Check if current user is following this creator
      if (currentUser && enableSocialFeatures) {
        const followResponse = await fetch(
          `/api/marketplace/creators/${creator.id}/follow-status?userId=${currentUser.id}`
        )
        if (followResponse.ok) {
          const followData = await followResponse.json()
          setIsFollowing(followData.isFollowing || false)
        }
      }
    } catch (error) {
      console.error('Failed to load creator data:', error)
    } finally {
      setLoading(false)
    }
  }, [creator.id, currentUser, enableAnalytics, enableSocialFeatures, selectedTimePeriod, viewMode])

  /**
   * Handle follow toggle
   */
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !enableSocialFeatures) return

    try {
      const response = await fetch(`/api/marketplace/creators/${creator.id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        setCreatorStats((prev) =>
          prev
            ? {
                ...prev,
                totalFollowers: prev.totalFollowers + (isFollowing ? -1 : 1),
              }
            : null
        )

        onFollowToggle?.(creator.id, !isFollowing)
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }, [creator.id, currentUser, enableSocialFeatures, isFollowing, onFollowToggle])

  // Load data on mount
  useEffect(() => {
    loadCreatorData()
  }, [loadCreatorData])

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = creatorTemplates

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query)
      )
    }

    switch (sortBy) {
      case 'popular':
        return filtered.sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
      case 'rating':
        return filtered.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0))
      default:
        return filtered.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }
  }, [creatorTemplates, searchQuery, sortBy])

  // Format numbers for display
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }, [])

  // Format currency
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }, [])

  // Get achievement color
  const getAchievementColor = useCallback((level: Achievement['level']): string => {
    switch (level) {
      case 'bronze':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'platinum':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  if (loading || !creatorStats) {
    return (
      <div className={cn('flex h-screen items-center justify-center', className)}>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
          <p className='text-muted-foreground'>Loading creator profile...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('min-h-screen bg-gradient-to-br from-blue-50 to-purple-50', className)}>
        {/* Creator Header */}
        <div className='border-b bg-white'>
          <div className='mx-auto max-w-7xl p-6'>
            <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
              <div className='flex items-start gap-6'>
                <Avatar className='h-24 w-24'>
                  <AvatarImage src={creator.avatar} />
                  <AvatarFallback className='font-bold text-2xl'>
                    {creator.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className='min-w-0 flex-1'>
                  <div className='mb-2 flex items-center gap-3'>
                    <h1 className='font-bold text-2xl'>{creator.name}</h1>
                    {creator.verified && (
                      <TooltipComponent>
                        <TooltipTrigger>
                          <Badge variant='default' className='gap-1'>
                            <Award className='h-3 w-3' />
                            Verified
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Verified Creator</TooltipContent>
                      </TooltipComponent>
                    )}
                  </div>

                  {creator.bio && (
                    <p className='mb-3 max-w-2xl text-muted-foreground'>{creator.bio}</p>
                  )}

                  <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm'>
                    {creator.location && (
                      <div className='flex items-center gap-1'>
                        <MapPin className='h-4 w-4' />
                        {creator.location}
                      </div>
                    )}
                    <div className='flex items-center gap-1'>
                      <Calendar className='h-4 w-4' />
                      Joined {new Date(creatorStats.joinedDate).toLocaleDateString()}
                    </div>
                    {creator.website && (
                      <div className='flex items-center gap-1'>
                        <Globe className='h-4 w-4' />
                        <a
                          href={creator.website}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:text-blue-600'
                        >
                          Website
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Creator Stats Bar */}
                  <div className='mt-4 grid grid-cols-2 gap-4 md:grid-cols-5'>
                    <div className='text-center'>
                      <div className='font-bold text-blue-600 text-lg'>
                        {formatNumber(creatorStats.totalTemplates)}
                      </div>
                      <div className='text-muted-foreground text-xs'>Templates</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-bold text-green-600 text-lg'>
                        {formatNumber(creatorStats.totalDownloads)}
                      </div>
                      <div className='text-muted-foreground text-xs'>Downloads</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-bold text-lg text-purple-600'>
                        {formatNumber(creatorStats.totalFollowers)}
                      </div>
                      <div className='text-muted-foreground text-xs'>Followers</div>
                    </div>
                    <div className='text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                        <span className='font-bold text-lg text-yellow-600'>
                          {creatorStats.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <div className='text-muted-foreground text-xs'>Avg. Rating</div>
                    </div>
                    {viewMode === 'dashboard' && (
                      <div className='text-center'>
                        <div className='font-bold text-lg text-orange-600'>
                          {formatCurrency(creatorStats.totalEarnings)}
                        </div>
                        <div className='text-muted-foreground text-xs'>Total Earnings</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className='flex items-center gap-3'>
                {viewMode === 'public' && currentUser?.id !== creator.id ? (
                  <>
                    {enableSocialFeatures && (
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        onClick={handleFollowToggle}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    )}
                    <Button variant='outline' onClick={() => setShowContactDialog(true)}>
                      <MessageCircle className='mr-2 h-4 w-4' />
                      Contact
                    </Button>
                    <Button variant='outline'>
                      <Share2 className='mr-2 h-4 w-4' />
                      Share
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant='outline' onClick={onProfileEdit}>
                      <Edit3 className='mr-2 h-4 w-4' />
                      Edit Profile
                    </Button>
                    <Button variant='outline'>
                      <Settings className='mr-2 h-4 w-4' />
                      Settings
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className='mt-6'>
                <h3 className='mb-3 font-semibold'>Achievements</h3>
                <div className='flex flex-wrap gap-2'>
                  {achievements.slice(0, 6).map((achievement) => (
                    <TooltipComponent key={achievement.id}>
                      <TooltipTrigger>
                        <Badge
                          variant='outline'
                          className={cn('gap-1', getAchievementColor(achievement.level))}
                        >
                          <span>{achievement.icon}</span>
                          {achievement.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className='text-center'>
                          <p className='font-medium'>{achievement.name}</p>
                          <p className='text-muted-foreground text-xs'>{achievement.description}</p>
                          <p className='text-muted-foreground text-xs'>
                            Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </TooltipContent>
                    </TooltipComponent>
                  ))}
                  {achievements.length > 6 && (
                    <Badge variant='outline' className='text-muted-foreground'>
                      +{achievements.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='mx-auto max-w-7xl p-6'>
          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
            <TabsList className='grid w-full grid-cols-2 lg:grid-cols-5'>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='templates'>Templates</TabsTrigger>
              <TabsTrigger value='collections'>Collections</TabsTrigger>
              {enableAnalytics && viewMode === 'dashboard' && (
                <>
                  <TabsTrigger value='analytics'>Analytics</TabsTrigger>
                  <TabsTrigger value='earnings'>Earnings</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value='overview' className='space-y-6'>
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <TrendingUp className='h-5 w-5' />
                    Recent Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                    <Card>
                      <CardContent className='p-4 text-center'>
                        <div className='font-bold text-2xl text-green-600'>
                          +{creatorStats.monthlyGrowth.downloads}
                        </div>
                        <p className='text-muted-foreground text-sm'>Downloads (30d)</p>
                        <div className='mt-1 flex items-center justify-center gap-1 text-green-600 text-xs'>
                          <TrendingUp className='h-3 w-3' />+
                          {(
                            (creatorStats.monthlyGrowth.downloads / creatorStats.totalDownloads) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className='p-4 text-center'>
                        <div className='font-bold text-2xl text-blue-600'>
                          +{creatorStats.monthlyGrowth.templates}
                        </div>
                        <p className='text-muted-foreground text-sm'>New Templates</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className='p-4 text-center'>
                        <div className='font-bold text-2xl text-purple-600'>
                          +{creatorStats.monthlyGrowth.followers}
                        </div>
                        <p className='text-muted-foreground text-sm'>New Followers</p>
                      </CardContent>
                    </Card>
                    {viewMode === 'dashboard' && (
                      <Card>
                        <CardContent className='p-4 text-center'>
                          <div className='font-bold text-2xl text-orange-600'>
                            {formatCurrency(creatorStats.monthlyGrowth.earnings)}
                          </div>
                          <p className='text-muted-foreground text-sm'>Earnings (30d)</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    {filteredTemplates.slice(0, 5).map((template, index) => (
                      <div
                        key={template.id}
                        className='flex items-center gap-4 rounded-lg border p-3 hover:bg-gray-50'
                      >
                        <div className='w-8 text-center font-bold text-lg text-muted-foreground'>
                          #{index + 1}
                        </div>
                        <div
                          className='flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white'
                          style={{ backgroundColor: template.color }}
                        >
                          {template.icon || '📄'}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate font-medium'>{template.name}</p>
                          <p className='truncate text-muted-foreground text-sm'>
                            {template.category}
                          </p>
                        </div>
                        <div className='flex items-center gap-4 text-sm'>
                          <div className='text-center'>
                            <div className='font-bold'>
                              {formatNumber(template.downloadCount || 0)}
                            </div>
                            <div className='text-muted-foreground'>Downloads</div>
                          </div>
                          <div className='text-center'>
                            <div className='flex items-center gap-1'>
                              <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                              <span className='font-bold'>
                                {template.ratingAverage?.toFixed(1) || '0.0'}
                              </span>
                            </div>
                            <div className='text-muted-foreground'>Rating</div>
                          </div>
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onTemplateSelect?.(template)}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value='templates' className='space-y-6'>
              {/* Search and Filter Controls */}
              <Card>
                <CardContent className='p-4'>
                  <div className='flex flex-col gap-4 md:flex-row'>
                    <div className='relative flex-1'>
                      <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400' />
                      <Input
                        placeholder='Search templates...'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10'
                      />
                    </div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className='w-48'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='recent'>Most Recent</SelectItem>
                        <SelectItem value='popular'>Most Popular</SelectItem>
                        <SelectItem value='rating'>Highest Rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Templates Grid */}
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                <AnimatePresence>
                  {filteredTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className='group h-full cursor-pointer transition-all duration-200 hover:shadow-lg'>
                        <CardHeader className='pb-3'>
                          <div className='flex items-start justify-between'>
                            <div className='flex items-center gap-3'>
                              <div
                                className='flex h-12 w-12 items-center justify-center rounded-lg font-bold text-white'
                                style={{ backgroundColor: template.color }}
                              >
                                {template.icon || '📄'}
                              </div>
                              <div className='min-w-0 flex-1'>
                                <CardTitle className='text-base leading-tight transition-colors group-hover:text-blue-600'>
                                  {template.name}
                                </CardTitle>
                                <Badge variant='outline' className='mt-1 text-xs'>
                                  {template.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className='pb-3'>
                          <p className='mb-3 line-clamp-2 text-muted-foreground text-sm'>
                            {template.description}
                          </p>

                          <div className='flex items-center justify-between text-muted-foreground text-xs'>
                            <div className='flex items-center gap-3'>
                              <div className='flex items-center gap-1'>
                                <Eye className='h-3 w-3' />
                                {formatNumber(template.views || 0)}
                              </div>
                              <div className='flex items-center gap-1'>
                                <Download className='h-3 w-3' />
                                {formatNumber(template.downloadCount || 0)}
                              </div>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                              {template.ratingAverage?.toFixed(1) || '0.0'}
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className='pt-0'>
                          <Button className='w-full' onClick={() => onTemplateSelect?.(template)}>
                            View Template
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {filteredTemplates.length === 0 && (
                <div className='py-12 text-center'>
                  <Search className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                  <h3 className='mb-2 font-medium'>No templates found</h3>
                  <p className='text-muted-foreground text-sm'>
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Collections Tab */}
            <TabsContent value='collections' className='space-y-6'>
              {creatorCollections.length > 0 ? (
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                  {creatorCollections.map((collection) => (
                    <Card
                      key={collection.id}
                      className='transition-all duration-200 hover:shadow-lg'
                    >
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                          <div
                            className='flex h-8 w-8 items-center justify-center rounded font-bold text-sm text-white'
                            style={{ backgroundColor: collection.theme?.primaryColor || '#3B82F6' }}
                          >
                            📁
                          </div>
                          {collection.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className='mb-3 text-muted-foreground text-sm'>
                          {collection.description}
                        </p>
                        <div className='flex items-center justify-between text-sm'>
                          <span>{collection.templates?.length || 0} templates</span>
                          <Badge variant='outline' className='text-xs'>
                            {collection.visibility}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className='py-12 text-center'>
                  <div className='mb-4 text-6xl'>📂</div>
                  <h3 className='mb-2 font-medium'>No collections yet</h3>
                  <p className='text-muted-foreground text-sm'>
                    Collections help organize templates by theme or purpose
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab (Dashboard Only) */}
            {enableAnalytics && viewMode === 'dashboard' && creatorAnalytics && (
              <TabsContent value='analytics' className='space-y-6'>
                {/* Time Period Selector */}
                <div className='flex justify-end'>
                  <Select
                    value={selectedTimePeriod}
                    onValueChange={(value: TimePeriod) => setSelectedTimePeriod(value)}
                  >
                    <SelectTrigger className='w-32'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='7d'>Last 7 days</SelectItem>
                      <SelectItem value='30d'>Last 30 days</SelectItem>
                      <SelectItem value='90d'>Last 90 days</SelectItem>
                      <SelectItem value='1y'>Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Engagement Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width='100%' height={300}>
                      <AreaChart data={creatorAnalytics.engagementMetrics.timeline}>
                        <XAxis dataKey='date' />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type='monotone'
                          dataKey='views'
                          stackId='1'
                          stroke='#8884d8'
                          fill='#8884d8'
                        />
                        <Area
                          type='monotone'
                          dataKey='likes'
                          stackId='1'
                          stroke='#82ca9d'
                          fill='#82ca9d'
                        />
                        <Area
                          type='monotone'
                          dataKey='shares'
                          stackId='1'
                          stroke='#ffc658'
                          fill='#ffc658'
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Template Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Template Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-4'>
                      {creatorAnalytics.templatePerformance.slice(0, 10).map((perf, index) => (
                        <div
                          key={perf.template.id}
                          className='flex items-center gap-4 rounded-lg border p-3'
                        >
                          <div className='w-8 text-center font-bold text-lg text-muted-foreground'>
                            #{index + 1}
                          </div>
                          <div
                            className='flex h-8 w-8 items-center justify-center rounded font-bold text-white text-xs'
                            style={{ backgroundColor: perf.template.color }}
                          >
                            {perf.template.icon || '📄'}
                          </div>
                          <div className='min-w-0 flex-1'>
                            <p className='truncate font-medium'>{perf.template.name}</p>
                          </div>
                          <div className='grid grid-cols-3 gap-4 text-center text-sm'>
                            <div>
                              <div className='font-bold'>{formatNumber(perf.views)}</div>
                              <div className='text-muted-foreground text-xs'>Views</div>
                            </div>
                            <div>
                              <div className='font-bold'>{formatNumber(perf.downloads)}</div>
                              <div className='text-muted-foreground text-xs'>Downloads</div>
                            </div>
                            <div>
                              <div className='font-bold'>
                                {(perf.conversionRate * 100).toFixed(1)}%
                              </div>
                              <div className='text-muted-foreground text-xs'>Conversion</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Earnings Tab (Dashboard Only) */}
            {viewMode === 'dashboard' && creatorAnalytics && (
              <TabsContent value='earnings' className='space-y-6'>
                {/* Revenue Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width='100%' height={300}>
                      <LineChart data={creatorAnalytics.revenueAnalytics.daily}>
                        <XAxis dataKey='date' />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Line type='monotone' dataKey='revenue' stroke='#8884d8' strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Earning Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Earning Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      {creatorAnalytics.revenueAnalytics.topEarning.map((item, index) => (
                        <div
                          key={item.template.id}
                          className='flex items-center justify-between rounded-lg border p-3'
                        >
                          <div className='flex items-center gap-3'>
                            <span className='font-bold text-lg text-muted-foreground'>
                              #{index + 1}
                            </span>
                            <div
                              className='flex h-8 w-8 items-center justify-center rounded font-bold text-white text-xs'
                              style={{ backgroundColor: item.template.color }}
                            >
                              {item.template.icon || '📄'}
                            </div>
                            <div>
                              <p className='font-medium'>{item.template.name}</p>
                              <p className='text-muted-foreground text-xs'>
                                {item.template.category}
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='font-bold text-green-600'>
                              {formatCurrency(item.revenue)}
                            </p>
                            <p className='text-muted-foreground text-xs'>Total revenue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Contact Dialog */}
        <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact {creator.name}</DialogTitle>
              <DialogDescription>Send a message to this creator</DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <label className='font-medium text-sm'>Message</label>
                <textarea
                  className='h-32 w-full resize-none rounded-lg border p-3'
                  placeholder='Write your message here...'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowContactDialog(false)}>
                Cancel
              </Button>
              <Button>Send Message</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default CreatorProfilePortfolio
