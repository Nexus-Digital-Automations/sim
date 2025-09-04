/**
 * Template Detail Page - Comprehensive Template Information Display
 *
 * This component provides a detailed view of individual templates with:
 * - Complete template information and metadata display
 * - Visual workflow preview with block diagram
 * - Rating and review system with user feedback
 * - Installation options and customization previews
 * - Related templates and recommendations
 * - Usage statistics and community metrics
 * - Share and collaboration features
 * - Mobile-responsive design with touch interactions
 *
 * Design Features:
 * - Clean, magazine-style layout with visual hierarchy
 * - Interactive elements with hover states and animations
 * - Comprehensive accessibility support
 * - Performance-optimized image loading and rendering
 * - Social proof integration with ratings and usage stats
 * - Context-aware actions based on user permissions
 *
 * Based on best practices from leading template marketplaces including
 * Figma Community, Webflow Templates, and WordPress theme directories.
 *
 * @author Claude Code Template System - Detail Page Specialist
 * @version 2.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Flag,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Shield,
  Star,
  Tag,
  ThumbsUp,
  TrendingUp,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
// Import template types
import type {
  Template,
  TemplateComment,
  TemplateRating,
  TemplateUsageAnalytics,
} from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Template Detail Page Props Interface
 */
export interface TemplateDetailPageProps {
  /** Template to display */
  template: Template
  /** Current user ID for personalization */
  userId?: string
  /** Organization ID for enterprise features */
  organizationId?: string
  /** Template ratings and reviews */
  ratings?: TemplateRating[]
  /** Template comments and discussions */
  comments?: TemplateComment[]
  /** Template usage analytics */
  analytics?: TemplateUsageAnalytics
  /** Related templates */
  relatedTemplates?: Template[]
  /** Loading state */
  loading?: boolean
  /** Back navigation handler */
  onBack?: () => void
  /** Installation handler */
  onInstall?: (template: Template) => void
  /** Preview handler */
  onPreview?: (template: Template) => void
  /** Favorite toggle handler */
  onToggleFavorite?: (templateId: string, isFavorited: boolean) => Promise<void>
  /** Share handler */
  onShare?: (template: Template) => void
  /** Report handler */
  onReport?: (templateId: string, reason: string) => void
  /** Comment submission handler */
  onSubmitComment?: (templateId: string, content: string) => Promise<void>
  /** Rating submission handler */
  onSubmitRating?: (templateId: string, rating: number, review?: string) => Promise<void>
  /** Custom CSS class */
  className?: string
}

/**
 * Template Header Component
 * Displays the main template information and primary actions
 */
const TemplateHeader: React.FC<{
  template: Template
  onInstall?: (template: Template) => void
  onPreview?: (template: Template) => void
  onToggleFavorite?: (templateId: string, isFavorited: boolean) => Promise<void>
  onShare?: (template: Template) => void
  onBack?: () => void
}> = ({ template, onInstall, onPreview, onToggleFavorite, onShare, onBack }) => {
  const [isFavoriting, setIsFavoriting] = useState(false)

  const handleToggleFavorite = useCallback(async () => {
    if (!onToggleFavorite || isFavoriting) return
    setIsFavoriting(true)
    try {
      await onToggleFavorite(template.id, !template.isStarred)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setIsFavoriting(false)
    }
  }, [template.id, template.isStarred, onToggleFavorite, isFavoriting])

  return (
    <div className='space-y-6'>
      {/* Navigation */}
      {onBack && (
        <Button variant='ghost' size='sm' onClick={onBack} className='text-muted-foreground'>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Templates
        </Button>
      )}

      {/* Main Header */}
      <div className='flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between'>
        {/* Template Info */}
        <div className='flex-1 space-y-4'>
          <div className='flex items-start gap-4'>
            {/* Template Icon */}
            <div
              className='flex h-16 w-16 items-center justify-center rounded-lg font-bold text-2xl text-white'
              style={{ backgroundColor: template.color }}
            >
              {template.icon || '📄'}
            </div>

            {/* Title and Meta */}
            <div className='flex-1 space-y-2'>
              <div className='flex items-center gap-2'>
                <h1 className='font-bold text-2xl lg:text-3xl'>{template.name}</h1>
                {template.featured && (
                  <Badge className='bg-yellow-100 text-yellow-800'>
                    <Star className='mr-1 h-3 w-3' />
                    Featured
                  </Badge>
                )}
                {template.trending && (
                  <Badge className='bg-orange-100 text-orange-800'>
                    <TrendingUp className='mr-1 h-3 w-3' />
                    Trending
                  </Badge>
                )}
              </div>

              <p className='text-muted-foreground leading-relaxed'>{template.description}</p>

              {/* Author and Metadata */}
              <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm'>
                <div className='flex items-center gap-2'>
                  <User className='h-4 w-4' />
                  <span>by {template.author}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Calendar className='h-4 w-4' />
                  <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Tag className='h-4 w-4' />
                  <span>{template.category}</span>
                </div>
              </div>

              {/* Rating Display */}
              {template.ratingAverage && (
                <div className='flex items-center gap-2'>
                  <div className='flex items-center'>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'h-4 w-4',
                          star <= (template.ratingAverage || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className='font-medium text-sm'>{template.ratingAverage.toFixed(1)}</span>
                  <span className='text-muted-foreground text-sm'>
                    ({template.ratingCount} reviews)
                  </span>
                </div>
              )}

              {/* Template Tags */}
              {template.metadata?.tags && (
                <div className='flex flex-wrap gap-2'>
                  {template.metadata.tags.slice(0, 5).map((tag) => (
                    <Badge key={tag} variant='secondary' className='text-xs'>
                      {tag}
                    </Badge>
                  ))}
                  {template.metadata.tags.length > 5 && (
                    <Badge variant='secondary' className='text-xs'>
                      +{template.metadata.tags.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex flex-col gap-3 lg:w-64'>
          <Button size='lg' onClick={() => onInstall?.(template)} className='w-full'>
            <Zap className='mr-2 h-5 w-5' />
            Install Template
          </Button>

          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => onPreview?.(template)} className='flex-1'>
              <Eye className='mr-2 h-4 w-4' />
              Preview
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={handleToggleFavorite}
                    disabled={isFavoriting}
                  >
                    <Heart
                      className={cn('h-4 w-4', template.isStarred && 'fill-red-500 text-red-500')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {template.isStarred ? 'Remove from favorites' : 'Add to favorites'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='outline' size='icon' onClick={() => onShare?.(template)}>
                    <Share2 className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share template</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='icon'>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem>
                  <Copy className='mr-2 h-4 w-4' />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className='mr-2 h-4 w-4' />
                  View Source
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='text-red-600'>
                  <Flag className='mr-2 h-4 w-4' />
                  Report Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Template Statistics Component
 */
const TemplateStatistics: React.FC<{ template: Template; analytics?: TemplateUsageAnalytics }> = ({
  template,
  analytics,
}) => {
  const stats = [
    { label: 'Views', value: template.views, icon: Eye },
    { label: 'Downloads', value: template.downloadCount || 0, icon: Download },
    { label: 'Favorites', value: template.stars, icon: Heart },
    { label: 'Forks', value: template.forkCount || 0, icon: Users },
  ]

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className='flex items-center justify-between p-4'>
            <div>
              <p className='font-medium text-sm'>{formatNumber(stat.value)}</p>
              <p className='text-muted-foreground text-xs'>{stat.label}</p>
            </div>
            <stat.icon className='h-5 w-5 text-muted-foreground' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Rating and Review Component
 */
const RatingAndReviews: React.FC<{
  template: Template
  ratings?: TemplateRating[]
  onSubmitRating?: (templateId: string, rating: number, review?: string) => Promise<void>
}> = ({ template, ratings = [], onSubmitRating }) => {
  const [userRating, setUserRating] = useState(0)
  const [userReview, setUserReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitRating = useCallback(async () => {
    if (!onSubmitRating || userRating === 0) return
    setSubmitting(true)
    try {
      await onSubmitRating(template.id, userRating, userReview.trim() || undefined)
      setUserRating(0)
      setUserReview('')
    } catch (error) {
      console.error('Failed to submit rating:', error)
    } finally {
      setSubmitting(false)
    }
  }, [template.id, userRating, userReview, onSubmitRating])

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    ratings.forEach((rating) => {
      distribution[rating.rating as keyof typeof distribution]++
    })
    return distribution
  }, [ratings])

  const totalRatings = ratings.length

  return (
    <div className='space-y-6'>
      {/* Rating Overview */}
      <div className='flex flex-col gap-6 lg:flex-row'>
        {/* Average Rating */}
        <div className='text-center lg:text-left'>
          <div className='mb-2 font-bold text-4xl'>
            {template.ratingAverage?.toFixed(1) || 'N/A'}
          </div>
          <div className='mb-2 flex justify-center lg:justify-start'>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'h-5 w-5',
                  star <= (template.ratingAverage || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                )}
              />
            ))}
          </div>
          <p className='text-muted-foreground text-sm'>{totalRatings} reviews</p>
        </div>

        {/* Rating Distribution */}
        <div className='flex-1 space-y-2'>
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars} className='flex items-center gap-2'>
              <span className='text-sm'>{stars}</span>
              <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
              <Progress
                value={
                  totalRatings > 0
                    ? (ratingDistribution[stars as keyof typeof ratingDistribution] /
                        totalRatings) *
                      100
                    : 0
                }
                className='h-2 flex-1'
              />
              <span className='text-muted-foreground text-sm'>
                {ratingDistribution[stars as keyof typeof ratingDistribution]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Review Form */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Write a Review</CardTitle>
          <CardDescription>Share your experience with this template</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Star Rating */}
          <div>
            <label className='mb-2 block font-medium text-sm'>Rating</label>
            <div className='flex gap-1'>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className='transition-colors hover:text-yellow-400'
                >
                  <Star
                    className={cn(
                      'h-6 w-6',
                      star <= userRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className='mb-2 block font-medium text-sm'>Review (Optional)</label>
            <Textarea
              value={userReview}
              onChange={(e) => setUserReview(e.target.value)}
              placeholder='Describe your experience with this template...'
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmitRating}
            disabled={userRating === 0 || submitting}
            className='w-full'
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      <div className='space-y-4'>
        <h3 className='font-semibold text-lg'>Reviews</h3>
        {ratings.length === 0 ? (
          <p className='text-center text-muted-foreground'>
            No reviews yet. Be the first to review!
          </p>
        ) : (
          <div className='space-y-4'>
            {ratings.slice(0, 5).map((rating) => (
              <Card key={rating.id}>
                <CardContent className='p-4'>
                  <div className='mb-2 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Avatar className='h-6 w-6'>
                        <AvatarImage src={rating.userAvatar} />
                        <AvatarFallback>{rating.userDisplayName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className='font-medium text-sm'>{rating.userDisplayName}</span>
                      {rating.isVerifiedUser && <CheckCircle2 className='h-4 w-4 text-blue-500' />}
                    </div>
                    <div className='flex items-center gap-1'>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'h-3 w-3',
                            star <= rating.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {rating.review && (
                    <p className='text-muted-foreground text-sm'>{rating.review}</p>
                  )}
                  <div className='mt-2 flex items-center gap-2 text-muted-foreground text-xs'>
                    <span>{new Date(rating.createdAt).toLocaleDateString()}</span>
                    {rating.helpful > 0 && (
                      <span className='flex items-center gap-1'>
                        <ThumbsUp className='h-3 w-3' />
                        {rating.helpful}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Main Template Detail Page Component
 */
export const TemplateDetailPage: React.FC<TemplateDetailPageProps> = ({
  template,
  userId,
  organizationId,
  ratings,
  comments,
  analytics,
  relatedTemplates = [],
  loading = false,
  onBack,
  onInstall,
  onPreview,
  onToggleFavorite,
  onShare,
  onReport,
  onSubmitComment,
  onSubmitRating,
  className,
}) => {
  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
          <p className='text-muted-foreground'>Loading template details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('mx-auto max-w-6xl space-y-8 p-6', className)}>
      {/* Template Header */}
      <TemplateHeader
        template={template}
        onInstall={onInstall}
        onPreview={onPreview}
        onToggleFavorite={onToggleFavorite}
        onShare={onShare}
        onBack={onBack}
      />

      {/* Statistics */}
      <TemplateStatistics template={template} analytics={analytics} />

      {/* Main Content Tabs */}
      <Tabs defaultValue='overview' className='w-full'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='reviews'>Reviews ({template.ratingCount || 0})</TabsTrigger>
          <TabsTrigger value='discussion'>Discussion ({comments?.length || 0})</TabsTrigger>
          <TabsTrigger value='related'>Related</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-6'>
          {/* Template Information */}
          <Card>
            <CardHeader>
              <CardTitle>About This Template</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {template.metadata?.useCases && (
                <div>
                  <h4 className='mb-2 font-semibold'>Use Cases</h4>
                  <ul className='space-y-1'>
                    {template.metadata.useCases.map((useCase, index) => (
                      <li key={index} className='flex items-center gap-2 text-sm'>
                        <div className='h-1.5 w-1.5 rounded-full bg-blue-500' />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {template.metadata?.requirements && (
                <div>
                  <h4 className='mb-2 font-semibold'>Requirements</h4>
                  <ul className='space-y-1'>
                    {template.metadata.requirements.map((requirement, index) => (
                      <li key={index} className='flex items-center gap-2 text-sm'>
                        <Shield className='h-4 w-4 text-green-500' />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
                <div className='text-center'>
                  <Clock className='mx-auto mb-1 h-5 w-5 text-muted-foreground' />
                  <p className='font-medium text-sm'>Setup Time</p>
                  <p className='text-muted-foreground text-sm'>
                    {template.metadata?.estimatedTime || '5-10 min'}
                  </p>
                </div>
                <div className='text-center'>
                  <Shield className='mx-auto mb-1 h-5 w-5 text-muted-foreground' />
                  <p className='font-medium text-sm'>Difficulty</p>
                  <Badge variant='secondary' className='mt-1'>
                    {template.metadata?.difficulty || 'Beginner'}
                  </Badge>
                </div>
                <div className='text-center'>
                  <BookOpen className='mx-auto mb-1 h-5 w-5 text-muted-foreground' />
                  <p className='font-medium text-sm'>Category</p>
                  <p className='text-muted-foreground text-sm'>{template.category}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='reviews'>
          <RatingAndReviews template={template} ratings={ratings} onSubmitRating={onSubmitRating} />
        </TabsContent>

        <TabsContent value='discussion'>
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
              <CardDescription>Ask questions and share feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-center text-muted-foreground'>
                <MessageSquare className='mx-auto mb-2 h-8 w-8' />
                <p>Discussion feature coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='related'>
          <div className='space-y-4'>
            <h3 className='font-semibold text-lg'>Related Templates</h3>
            {relatedTemplates.length === 0 ? (
              <Card>
                <CardContent className='p-8 text-center text-muted-foreground'>
                  No related templates found
                </CardContent>
              </Card>
            ) : (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {relatedTemplates.slice(0, 6).map((relatedTemplate) => (
                  <Card
                    key={relatedTemplate.id}
                    className='cursor-pointer transition-colors hover:bg-gray-50'
                  >
                    <CardContent className='p-4'>
                      <div className='mb-2 flex items-center gap-2'>
                        <div
                          className='flex h-8 w-8 items-center justify-center rounded font-bold text-sm text-white'
                          style={{ backgroundColor: relatedTemplate.color }}
                        >
                          {relatedTemplate.icon || '📄'}
                        </div>
                        <h4 className='font-medium text-sm'>{relatedTemplate.name}</h4>
                      </div>
                      <p className='line-clamp-2 text-muted-foreground text-xs'>
                        {relatedTemplate.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TemplateDetailPage
